const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { search, provinsi, kota_kab } = req.query;
    let where = [];
    let params = [];
    let idx = 1;

    if (search) {
      where.push(`(kecamatan ILIKE $${idx} OR kode ILIKE $${idx})`);
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

    const limit = parseInt(req.query.limit) || 500;
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const result = await query(`SELECT * FROM kecamatan_sap ${whereClause} ORDER BY provinsi, kota_kab, kecamatan LIMIT $${idx}`, [...params, limit]);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch kecamatan SAP' });
  }
});

router.get('/provinces', async (req, res) => {
  try {
    const result = await query('SELECT DISTINCT provinsi FROM kecamatan_sap ORDER BY provinsi');
    res.json({ provinces: result.rows.map(r => r.provinsi) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch provinces' });
  }
});

router.get('/cities', async (req, res) => {
  try {
    const { provinsi } = req.query;
    const result = await query(
      'SELECT DISTINCT kota_kab FROM kecamatan_sap WHERE provinsi = $1 ORDER BY kota_kab',
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
      'SELECT * FROM kecamatan_sap WHERE provinsi = $1 AND kota_kab = $2 ORDER BY kecamatan',
      [provinsi, kota_kab]
    );
    res.json({ districts: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { kode, kecamatan, kota_kab, provinsi, status_tercover } = req.body;
    const result = await query(
      'INSERT INTO kecamatan_sap (kode, kecamatan, kota_kab, provinsi, status_tercover) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [kode, kecamatan, kota_kab, provinsi, status_tercover]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create kecamatan SAP' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { kode, kecamatan, kota_kab, provinsi, status_tercover } = req.body;
    const result = await query(
      'UPDATE kecamatan_sap SET kode=$1, kecamatan=$2, kota_kab=$3, provinsi=$4, status_tercover=$5 WHERE id=$6 RETURNING *',
      [kode, kecamatan, kota_kab, provinsi, status_tercover, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update kecamatan SAP' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM kecamatan_sap WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete kecamatan SAP' });
  }
});

module.exports = router;
