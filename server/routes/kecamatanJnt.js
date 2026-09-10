const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { search, provinsi, kota_kab, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];
    let idx = 1;

    if (search) {
      where.push(`(kecamatan ILIKE $${idx} OR kota_kab ILIKE $${idx} OR provinsi ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (provinsi) {
      where.push(`provinsi = $${idx++}`);
      params.push(provinsi);
    }
    if (kota_kab) {
      where.push(`kota_kab = $${idx++}`);
      params.push(kota_kab);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const countResult = await query(`SELECT COUNT(*) FROM kecamatan_jnt ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);
    const result = await query(
      `SELECT * FROM kecamatan_jnt ${whereClause} ORDER BY provinsi, kota_kab, kecamatan, id LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ data: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch kecamatan JNT' });
  }
});


router.get('/provinces', async (req, res) => {
  try {
    const result = await query('SELECT DISTINCT provinsi FROM kecamatan_jnt ORDER BY provinsi');
    res.json({ provinces: result.rows.map(r => r.provinsi) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch provinces' });
  }
});

router.get('/cities', async (req, res) => {
  try {
    const { provinsi } = req.query;
    const result = await query(
      'SELECT DISTINCT kota_kab FROM kecamatan_jnt WHERE provinsi = $1 ORDER BY kota_kab',
      [provinsi]
    );
    res.json({ cities: result.rows.map(r => r.kota_kab) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

router.get('/districts', async (req, res) => {
  try {
    const { provinsi, kota_kab } = req.query;
    const result = await query(
      'SELECT * FROM kecamatan_jnt WHERE provinsi = $1 AND kota_kab = $2 ORDER BY kecamatan',
      [provinsi, kota_kab]
    );
    res.json({ districts: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

router.post('/', requireRole('OWNER', 'FINANCE'), async (req, res) => {
  try {
    const { kode, kecamatan, kota_kab, provinsi } = req.body;
    const result = await query(
      'INSERT INTO kecamatan_jnt (kode, kecamatan, kota_kab, provinsi) VALUES ($1,$2,$3,$4) RETURNING *',
      [kode, kecamatan, kota_kab, provinsi]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create kecamatan JNT' });
  }
});

router.put('/:id', requireRole('OWNER', 'FINANCE'), async (req, res) => {
  try {
    const { kode, kecamatan, kota_kab, provinsi } = req.body;
    const result = await query(
      'UPDATE kecamatan_jnt SET kode=$1, kecamatan=$2, kota_kab=$3, provinsi=$4 WHERE id=$5 RETURNING *',
      [kode, kecamatan, kota_kab, provinsi, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update kecamatan JNT' });
  }
});

router.delete('/:id', requireRole('OWNER', 'FINANCE'), async (req, res) => {
  try {
    await query('DELETE FROM kecamatan_jnt WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete kecamatan JNT' });
  }
});

module.exports = router;
