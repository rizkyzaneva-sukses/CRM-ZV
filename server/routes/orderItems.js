const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/:orderId', async (req, res) => {
  try {
    const result = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at', [req.params.orderId]);
    res.json({ items: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

module.exports = router;
