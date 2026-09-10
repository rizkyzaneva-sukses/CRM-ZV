const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    // Dulu endpoint ini hanya menerima `limit` tanpa offset dan tanpa `total`,
    // sehingga pemanggil tidak punya cara membaca lebih dari satu halaman -
    // backup Download All Data ikut terpotong karenanya.
    const { order_id, page = 1, limit = 1000 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '';
    let params = [];
    if (order_id) {
      where = 'WHERE order_id = $1';
      params.push(order_id);
    }
    const countResult = await query(`SELECT COUNT(*) FROM order_items ${where}`, params);
    const total = parseInt(countResult.rows[0].count);
    const result = await query(
      `SELECT * FROM order_items ${where} ORDER BY created_at DESC, id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]
    );
    res.json({ order_items: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('List order items error:', err);
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
