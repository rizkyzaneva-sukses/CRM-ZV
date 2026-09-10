const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// Get print logs
router.get('/', async (req, res) => {
  try {
    const { order_id, order_number, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let idx = 1;

    if (order_id) {
      where.push(`order_id = $${idx++}`);
      params.push(order_id);
    }
    if (order_number) {
      where.push(`order_number ILIKE $${idx++}`);
      params.push(`%${order_number}%`);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    
    const countResult = await query(`SELECT COUNT(*) FROM print_logs ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM print_logs ${whereClause} ORDER BY created_at DESC, id LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ print_logs: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('List print logs error:', err);
    res.status(500).json({ error: 'Failed to fetch print logs' });
  }
});

// Create print log
router.post('/', async (req, res) => {
  try {
    const { order_id, order_number, no_resi } = req.body;
    const result = await query(
      'INSERT INTO print_logs (order_id, order_number, no_resi, printed_by) VALUES ($1,$2,$3,$4) RETURNING *',
      [order_id, order_number, no_resi, req.user.email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create print log error:', err);
    res.status(500).json({ error: 'Failed to create print log' });
  }
});

module.exports = router;
