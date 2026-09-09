const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let idx = 1;

    // customers tidak punya kolom created_by, jadi kepemilikan diturunkan dari orders:
    // STAFF hanya melihat pelanggan yang pernah muncul di order buatannya.
    if (req.user.custom_role === 'STAFF') {
      where.push(`no_telepon IN (SELECT no_telepon FROM orders WHERE created_by = $${idx++})`);
      params.push(req.user.email);
    }

    if (search) {
      where.push(`(nama ILIKE $${idx} OR no_telepon ILIKE $${idx} OR alamat ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const countResult = await query(`SELECT COUNT(*) FROM customers ${whereClause}`, params);
    const result = await query(
      `SELECT * FROM customers ${whereClause} ORDER BY updated_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    res.json({ customers: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    console.error('List customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    if (!(await staffMaySee(req, result.rows[0]))) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { nama, no_telepon, alamat, provinsi, kota_kab, kecamatan, kode_pos, email, notes } = req.body;
    const target = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (target.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    if (!(await staffMaySee(req, target.rows[0]))) return res.status(404).json({ error: 'Customer not found' });
    const result = await query(
      `UPDATE customers SET nama=$1, no_telepon=$2, alamat=$3, provinsi=$4, kota_kab=$5,
        kecamatan=$6, kode_pos=$7, email=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [nama, no_telepon, alamat, provinsi, kota_kab, kecamatan, kode_pos, email, notes, req.params.id]
    );
    res.json({ customer: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

async function staffMaySee(req, customer) {
  if (req.user.custom_role !== 'STAFF') return true;
  const owned = await query(
    'SELECT 1 FROM orders WHERE created_by = $1 AND no_telepon = $2 LIMIT 1',
    [req.user.email, customer.no_telepon]
  );
  return owned.rows.length > 0;
}

module.exports = router;
