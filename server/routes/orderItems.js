const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { order_id, sort, limit = 1000 } = req.query;
    let where = '';
    let params = [];
    if (order_id) {
      where = 'WHERE order_id = $1';
      params.push(order_id);
    }
    const result = await query(`SELECT * FROM order_items ${where} ORDER BY created_at DESC LIMIT $${params.length + 1}`, [...params, limit]);
    res.json({ order_items: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM order_items WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
