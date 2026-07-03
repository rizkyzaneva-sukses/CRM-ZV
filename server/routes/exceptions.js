const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// Get exceptions
router.get('/', async (req, res) => {
  try {
    const { no_waybill, resolved, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let idx = 1;

    if (no_waybill) {
      where.push(`no_waybill ILIKE $${idx++}`);
      params.push(`%${no_waybill}%`);
    }
    if (resolved !== undefined) {
      where.push(`resolved = $${idx++}`);
      params.push(resolved === 'true' || resolved === true);
    }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    
    const countResult = await query(`SELECT COUNT(*) FROM resi_import_exceptions ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM resi_import_exceptions ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ exceptions: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('List exceptions error:', err);
    res.status(500).json({ error: 'Failed to fetch exceptions' });
  }
});

// Create exception
router.post('/', async (req, res) => {
  try {
    const { no_waybill, penerima, reason } = req.body;
    const result = await query(
      'INSERT INTO resi_import_exceptions (no_waybill, penerima, reason) VALUES ($1,$2,$3) RETURNING *',
      [no_waybill, penerima, reason]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create exception error:', err);
    res.status(500).json({ error: 'Failed to create exception' });
  }
});

// Update exception
router.put('/:id', async (req, res) => {
  try {
    const { resolved } = req.body;
    const result = await query(
      `UPDATE resi_import_exceptions SET resolved=$1, resolved_by=$2, resolved_at=NOW() WHERE id=$3 RETURNING *`,
      [resolved, req.user.email, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update exception error:', err);
    res.status(500).json({ error: 'Failed to update exception' });
  }
});

module.exports = router;
