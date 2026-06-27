const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const { generateOrderNumber } = require('../utils/helpers');
const router = express.Router();

router.use(authMiddleware);

// List orders with filters
router.get('/', async (req, res) => {
  try {
    const { search, status, shipping, date_from, date_to, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let where = [];
    let params = [];
    let paramIdx = 1;

    // Role-based filtering
    if (req.user.custom_role === 'STAFF') {
      where.push(`created_by = $${paramIdx++}`);
      params.push(req.user.email);
    }

    if (search) {
      where.push(`(nama_pemesan ILIKE $${paramIdx} OR order_number ILIKE $${paramIdx} OR no_telepon ILIKE $${paramIdx} OR no_resi ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (status) {
      where.push(`status_pesanan = $${paramIdx++}`);
      params.push(status);
    }
    if (shipping) {
      where.push(`jasa_pengiriman ILIKE $${paramIdx++}`);
      params.push(`%${shipping}%`);
    }
    if (date_from) {
      where.push(`order_date >= $${paramIdx++}`);
      params.push(date_from);
    }
    if (date_to) {
      where.push(`order_date <= $${paramIdx++}`);
      params.push(date_to);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const countResult = await query(`SELECT COUNT(*) FROM orders ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    res.json({ orders: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('List orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order with items
router.get('/:id', async (req, res) => {
  try {
    const orderResult = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at', [req.params.id]);
    res.json({ order: orderResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    console.error('Get order error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create order
router.post('/', async (req, res) => {
  try {
    const { items, ...orderData } = req.body;
    const orderNumber = generateOrderNumber();

    const status = orderData.jenis_transaksi === 'CASH' ? 'WAITING_FINANCE' : 'READY_TO_PROCESS';
    const financeStatus = orderData.jenis_transaksi === 'CASH' ? 'PENDING' : null;

    // Calculate totals
    const totalBelanja = (items || []).reduce((sum, item) => sum + (parseFloat(item.harga_setelah_diskon) || 0), 0);
    const ongkir = parseFloat(orderData.ongkir) || 0;
    const penanganan = orderData.jenis_transaksi === 'COD' ? Math.round((totalBelanja + ongkir) * 0.03) : 0;
    const total = totalBelanja + ongkir + penanganan;

    const result = await query(
      `INSERT INTO orders (order_number, order_date, nama_pemesan, alamat, no_telepon, kode_pos, berat_kg,
        jenis_transaksi, instruksi_pengiriman, jasa_pengiriman, provinsi, kota_kab, kecamatan, kecamatan_kode,
        ketentuan, metode_pembayaran, transfer_atas_nama, total_belanja, ongkir, penanganan, total,
        status_pesanan, finance_status, platform, created_by, last_updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
       RETURNING *`,
      [orderNumber, orderData.order_date || new Date(), orderData.nama_pemesan, orderData.alamat,
       orderData.no_telepon, orderData.kode_pos, orderData.berat_kg, orderData.jenis_transaksi,
       orderData.instruksi_pengiriman, orderData.jasa_pengiriman, orderData.provinsi, orderData.kota_kab,
       orderData.kecamatan, orderData.kecamatan_kode, orderData.ketentuan, orderData.metode_pembayaran,
       orderData.transfer_atas_nama, totalBelanja, ongkir, penanganan, total,
       status, financeStatus, 'CRM', req.user.email, req.user.email]
    );

    const order = result.rows[0];

    // Insert items
    if (items && items.length > 0) {
      for (const item of items) {
        const subtotal = (parseInt(item.qty) || 1) * (parseFloat(item.harga_setelah_diskon) || 0);
        await query(
          `INSERT INTO order_items (order_id, sku, nama_produk, qty, harga_setelah_diskon, subtotal_item,
            jasa_pengiriman, berat_kg, provinsi, kota_kab, kecamatan, kecamatan_kode, status_tercover, instruksi_pengiriman)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [order.id, item.sku, item.nama_produk, item.qty || 1, item.harga_setelah_diskon || 0, subtotal,
           item.jasa_pengiriman, item.berat_kg, item.provinsi, item.kota_kab, item.kecamatan,
           item.kecamatan_kode, item.status_tercover, item.instruksi_pengiriman]
        );
      }
    }

    // Auto-upsert customer
    await upsertCustomer(orderData);

    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
    res.status(201).json({ order, items: itemsResult.rows });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order
router.put('/:id', async (req, res) => {
  try {
    const { items, ...orderData } = req.body;
    const existing = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const totalBelanja = (items || []).reduce((sum, item) => sum + (parseFloat(item.harga_setelah_diskon) || 0), 0);
    const ongkir = parseFloat(orderData.ongkir) || 0;
    const penanganan = orderData.jenis_transaksi === 'COD' ? Math.round((totalBelanja + ongkir) * 0.03) : 0;
    const total = totalBelanja + ongkir + penanganan;

    await query(
      `UPDATE orders SET nama_pemesan=$1, alamat=$2, no_telepon=$3, kode_pos=$4, berat_kg=$5,
        jenis_transaksi=$6, instruksi_pengiriman=$7, jasa_pengiriman=$8, provinsi=$9, kota_kab=$10,
        kecamatan=$11, kecamatan_kode=$12, ketentuan=$13, metode_pembayaran=$14, transfer_atas_nama=$15,
        total_belanja=$16, ongkir=$17, penanganan=$18, total=$19, last_updated_by=$20, updated_at=NOW()
       WHERE id=$21`,
      [orderData.nama_pemesan, orderData.alamat, orderData.no_telepon, orderData.kode_pos, orderData.berat_kg,
       orderData.jenis_transaksi, orderData.instruksi_pengiriman, orderData.jasa_pengiriman, orderData.provinsi,
       orderData.kota_kab, orderData.kecamatan, orderData.kecamatan_kode, orderData.ketentuan,
       orderData.metode_pembayaran, orderData.transfer_atas_nama, totalBelanja, ongkir, penanganan, total,
       req.user.email, req.params.id]
    );

    // Replace items
    await query('DELETE FROM order_items WHERE order_id = $1', [req.params.id]);
    if (items && items.length > 0) {
      for (const item of items) {
        const subtotal = (parseInt(item.qty) || 1) * (parseFloat(item.harga_setelah_diskon) || 0);
        await query(
          `INSERT INTO order_items (order_id, sku, nama_produk, qty, harga_setelah_diskon, subtotal_item,
            jasa_pengiriman, berat_kg, provinsi, kota_kab, kecamatan, kecamatan_kode, status_tercover, instruksi_pengiriman)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [req.params.id, item.sku, item.nama_produk, item.qty || 1, item.harga_setelah_diskon || 0, subtotal,
           item.jasa_pengiriman, item.berat_kg, item.provinsi, item.kota_kab, item.kecamatan,
           item.kecamatan_kode, item.status_tercover, item.instruksi_pengiriman]
        );
      }
    }

    await upsertCustomer(orderData);

    const updated = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1', [req.params.id]);
    res.json({ order: updated.rows[0], items: itemsResult.rows });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete order error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Finance approve/reject
router.post('/:id/finance', async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const order = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (order.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const newStatus = action === 'approve' ? 'READY_TO_PROCESS' : 'REJECTED';
    const financeStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    const result = await query(
      `UPDATE orders SET status_pesanan=$1, finance_status=$2, finance_verified_at=NOW(),
        finance_verified_by=$3, last_updated_by=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [newStatus, financeStatus, req.user.email, req.params.id]
    );
    res.json({ order: result.rows[0] });
  } catch (err) {
    console.error('Finance action error:', err);
    res.status(500).json({ error: 'Finance action failed' });
  }
});

// Bulk finance action
router.post('/bulk-finance', async (req, res) => {
  try {
    const { order_ids, action } = req.body;
    if (!order_ids || !Array.isArray(order_ids)) return res.status(400).json({ error: 'order_ids array required' });

    const newStatus = action === 'approve' ? 'READY_TO_PROCESS' : 'REJECTED';
    const financeStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    for (const id of order_ids) {
      await query(
        `UPDATE orders SET status_pesanan=$1, finance_status=$2, finance_verified_at=NOW(),
          finance_verified_by=$3, last_updated_by=$3, updated_at=NOW() WHERE id=$4`,
        [newStatus, financeStatus, req.user.email, id]
      );
    }
    res.json({ success: true, updated: order_ids.length });
  } catch (err) {
    console.error('Bulk finance error:', err);
    res.status(500).json({ error: 'Bulk finance action failed' });
  }
});

// Update resi
router.post('/:id/resi', async (req, res) => {
  try {
    const { no_resi } = req.body;
    const result = await query(
      `UPDATE orders SET no_resi=$1, status_pesanan='RESI_UPDATED', last_updated_by=$2, updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [no_resi, req.user.email, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: result.rows[0] });
  } catch (err) {
    console.error('Update resi error:', err);
    res.status(500).json({ error: 'Failed to update resi' });
  }
});

// Bulk update resi
router.post('/bulk-resi', async (req, res) => {
  try {
    const { updates } = req.body; // [{ order_id, no_resi }]
    for (const u of updates) {
      await query(
        `UPDATE orders SET no_resi=$1, status_pesanan='RESI_UPDATED', last_updated_by=$2, updated_at=NOW() WHERE id=$3`,
        [u.no_resi, req.user.email, u.order_id]
      );
    }
    res.json({ success: true, updated: updates.length });
  } catch (err) {
    console.error('Bulk resi error:', err);
    res.status(500).json({ error: 'Bulk resi update failed' });
  }
});

async function upsertCustomer(orderData) {
  if (!orderData.no_telepon) return;
  const existing = await query('SELECT id FROM customers WHERE no_telepon = $1', [orderData.no_telepon]);
  if (existing.rows.length > 0) {
    await query(
      `UPDATE customers SET nama=$1, alamat=$2, provinsi=$3, kota_kab=$4, kecamatan=$5,
        kode_pos=$6, total_orders=total_orders+1, last_order_date=CURRENT_DATE, updated_at=NOW()
       WHERE no_telepon=$7`,
      [orderData.nama_pemesan, orderData.alamat, orderData.provinsi, orderData.kota_kab,
       orderData.kecamatan, orderData.kode_pos, orderData.no_telepon]
    );
  } else {
    await query(
      `INSERT INTO customers (nama, no_telepon, alamat, provinsi, kota_kab, kecamatan, kode_pos, total_orders, last_order_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,1,CURRENT_DATE)`,
      [orderData.nama_pemesan, orderData.no_telepon, orderData.alamat, orderData.provinsi,
       orderData.kota_kab, orderData.kecamatan, orderData.kode_pos]
    );
  }
}

module.exports = router;
