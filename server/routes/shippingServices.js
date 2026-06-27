const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM shipping_services ORDER BY name');
    res.json({ services: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, code, platform, brand } = req.body;
    const result = await query(
      'INSERT INTO shipping_services (name, code, platform, brand) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, code, platform, brand]
    );
    res.status(201).json({ service: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create service' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, code, platform, brand, is_active } = req.body;
    const result = await query(
      'UPDATE shipping_services SET name=$1, code=$2, platform=$3, brand=$4, is_active=$5 WHERE id=$6 RETURNING *',
      [name, code, platform, brand, is_active, req.params.id]
    );
    res.json({ service: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM shipping_services WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

module.exports = router;
