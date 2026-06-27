const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const result = await query(
      'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), parseInt(offset)]
    );
    const countResult = await query('SELECT COUNT(*) FROM audit_logs');
    res.json({ logs: result.rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

async function createAuditLog(action, entityName, status, details = {}) {
  try {
    await query(
      `INSERT INTO audit_logs (action, entity_name, status, total_records, success_count, skipped_count, failed_count, error_details, performed_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [action, entityName, status, details.total_records, details.success_count,
       details.skipped_count, details.failed_count, details.error_details, details.performed_by]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

module.exports = router;
module.exports.createAuditLog = createAuditLog;
