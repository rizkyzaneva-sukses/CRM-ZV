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
      where.push(`(kecamatan ILIKE $${idx} OR kota_kab ILIKE $${idx})`);
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
    const result = await query(`SELECT * FROM kecamatan_jnt ${whereClause} ORDER BY provinsi, kota_kab, kecamatan LIMIT 500`, params);
    res.json({ data: result.rows });
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

module.exports = router;
