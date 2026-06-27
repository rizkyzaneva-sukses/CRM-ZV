const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/stats', async (req, res) => {
  try {
    const roleFilter = req.user.custom_role === 'STAFF' ? `WHERE created_by = '${req.user.email}'` : '';

    const totalOrders = await query(`SELECT COUNT(*) as count FROM orders ${roleFilter}`);
    const totalRevenue = await query(`SELECT COALESCE(SUM(total), 0) as sum FROM orders ${roleFilter} WHERE status_pesanan != 'REJECTED'`);
    const pendingFinance = await query(`SELECT COUNT(*) as count FROM orders WHERE finance_status = 'PENDING'`);
    const readyToProcess = await query(`SELECT COUNT(*) as count FROM orders ${roleFilter ? roleFilter + ' AND' : 'WHERE'} status_pesanan = 'READY_TO_PROCESS'`);
    const resiUpdated = await query(`SELECT COUNT(*) as count FROM orders ${roleFilter ? roleFilter + ' AND' : 'WHERE'} status_pesanan = 'RESI_UPDATED'`);

    res.json({
      total_orders: parseInt(totalOrders.rows[0].count),
      total_revenue: parseFloat(totalRevenue.rows[0].sum),
      pending_finance: parseInt(pendingFinance.rows[0].count),
      ready_to_process: parseInt(readyToProcess.rows[0].count),
      resi_updated: parseInt(resiUpdated.rows[0].count),
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/sales-chart', async (req, res) => {
  try {
    const { period = 'daily' } = req.query;
    let groupBy, dateFormat;

    if (period === 'weekly') {
      groupBy = "DATE_TRUNC('week', order_date)";
      dateFormat = 'YYYY-WW';
    } else if (period === 'monthly') {
      groupBy = "DATE_TRUNC('month', order_date)";
      dateFormat = 'YYYY-MM';
    } else {
      groupBy = 'order_date';
      dateFormat = 'YYYY-MM-DD';
    }

    const roleFilter = req.user.custom_role === 'STAFF' ? `AND created_by = '${req.user.email}'` : '';

    const result = await query(`
      SELECT ${groupBy} as date,
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as revenue
      FROM orders
      WHERE status_pesanan != 'REJECTED' ${roleFilter}
      GROUP BY ${groupBy}
      ORDER BY date DESC
      LIMIT 30
    `);

    res.json({ data: result.rows.reverse() });
  } catch (err) {
    console.error('Sales chart error:', err);
    res.status(500).json({ error: 'Failed to fetch sales data' });
  }
});

router.get('/status-distribution', async (req, res) => {
  try {
    const roleFilter = req.user.custom_role === 'STAFF' ? `WHERE created_by = '${req.user.email}'` : '';
    const result = await query(`
      SELECT status_pesanan as status, COUNT(*) as count
      FROM orders ${roleFilter}
      GROUP BY status_pesanan
    `);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch status distribution' });
  }
});

router.get('/shipping-performance', async (req, res) => {
  try {
    const roleFilter = req.user.custom_role === 'STAFF' ? `AND created_by = '${req.user.email}'` : '';
    const result = await query(`
      SELECT jasa_pengiriman as service, COUNT(*) as count,
        COALESCE(SUM(total), 0) as revenue
      FROM orders
      WHERE status_pesanan != 'REJECTED' ${roleFilter}
      GROUP BY jasa_pengiriman
      ORDER BY count DESC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shipping performance' });
  }
});

module.exports = router;
