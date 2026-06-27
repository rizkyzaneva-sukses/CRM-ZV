const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const { createAuditLog } = require('./auditLogs');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authMiddleware);

// Upload products Excel
router.post('/products', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File required' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    let success = 0, skipped = 0, failed = 0;
    const errors = [];

    for (const row of data) {
      try {
        const nama = row.nama_produk || row['Nama Produk'] || row.name;
        const harga = row.harga || row['Harga'] || row.price;
        if (!nama || !harga) { skipped++; continue; }

        await query(
          'INSERT INTO products (sku, nama_produk, harga, brand) VALUES ($1,$2,$3,$4)',
          [row.sku || row['SKU'] || '', nama, parseFloat(harga), row.brand || row['Brand'] || '']
        );
        success++;
      } catch (e) {
        failed++;
        errors.push(e.message);
      }
    }

    await createAuditLog('IMPORT_PRODUCT', 'products', failed > 0 ? 'PARTIAL' : 'SUCCESS', {
      total_records: data.length, success_count: success, skipped_count: skipped,
      failed_count: failed, error_details: errors.length ? JSON.stringify(errors) : null,
      performed_by: req.user.email
    });

    res.json({ success, skipped, failed, total: data.length });
  } catch (err) {
    console.error('Upload products error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload kecamatan SAP
router.post('/kecamatan-sap', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File required' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    let success = 0, skipped = 0, failed = 0;
    for (const row of data) {
      try {
        const kode = row.kode || row['Kode'] || row.code;
        const kecamatan = row.kecamatan || row['Kecamatan'];
        const kota = row.kota_kab || row['Kota/Kab'] || row.kota;
        const provinsi = row.provinsi || row['Provinsi'];
        if (!kode || !kecamatan || !kota || !provinsi) { skipped++; continue; }

        await query(
          `INSERT INTO kecamatan_sap (kode, kecamatan, kota_kab, provinsi, status_tercover)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (kode) DO UPDATE SET kecamatan=$2, kota_kab=$3, provinsi=$4`,
          [kode, kecamatan, kota, provinsi, row.status_tercover || 'Ya']
        );
        success++;
      } catch (e) { failed++; }
    }

    res.json({ success, skipped, failed, total: data.length });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload kecamatan JNT
router.post('/kecamatan-jnt', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File required' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    let success = 0, skipped = 0, failed = 0;
    for (const row of data) {
      try {
        const kecamatan = row.kecamatan || row['Kecamatan'];
        const kota = row.kota_kab || row['Kota/Kab'] || row.kota;
        const provinsi = row.provinsi || row['Provinsi'];
        if (!kecamatan || !kota || !provinsi) { skipped++; continue; }

        await query(
          'INSERT INTO kecamatan_jnt (kode, kecamatan, kota_kab, provinsi) VALUES ($1,$2,$3,$4)',
          [row.kode || row['Kode'] || '', kecamatan, kota, provinsi]
        );
        success++;
      } catch (e) { failed++; }
    }

    res.json({ success, skipped, failed, total: data.length });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload bulk orders from Excel
router.post('/orders', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File required' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    let success = 0, failed = 0;
    const errors = [];

    for (const row of data) {
      try {
        const name = row.nama_pemesan || row['Nama Pemesan'] || row.name;
        const alamat = row.alamat || row['Alamat'] || row.address;
        const telp = row.no_telepon || row['No Telepon'] || row.phone;
        if (!name || !alamat || !telp) { failed++; continue; }

        const date = require('date-fns').format(new Date(), 'yyyyMMdd');
        const random = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `CRM-${date}-${random}`;

        await query(
          `INSERT INTO orders (order_number, nama_pemesan, alamat, no_telepon, kode_pos, jenis_transaksi,
            jasa_pengiriman, provinsi, kota_kab, kecamatan, total, status_pesanan, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'DRAFT',$12)`,
          [orderNumber, name, alamat, telp, row.kode_pos || '', row.jenis_transaksi || 'CASH',
           row.jasa_pengiriman || 'sap', row.provinsi || '', row.kota_kab || '', row.kecamatan || '',
           parseFloat(row.total) || 0, req.user.email]
        );
        success++;
      } catch (e) {
        failed++;
        errors.push(e.message);
      }
    }

    await createAuditLog('IMPORT_ORDER', 'orders', failed > 0 ? 'PARTIAL' : 'SUCCESS', {
      total_records: data.length, success_count: success, failed_count: failed,
      error_details: errors.length ? JSON.stringify(errors) : null, performed_by: req.user.email
    });

    res.json({ success, failed, total: data.length });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload resi Excel
router.post('/resi', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'File required' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    const matched = [];
    const unmatched = [];

    for (const row of data) {
      const noWaybill = row.no_waybill || row['No Waybill'] || row.waybill || row.resi || row['No Resi'];
      const penerima = row.penerima || row['Penerima'] || row.recipient || row.name;
      if (!noWaybill || !penerima) continue;

      const orders = await query(
        `SELECT * FROM orders WHERE LOWER(TRIM(nama_pemesan)) = LOWER(TRIM($1)) AND (no_resi IS NULL OR no_resi = '') ORDER BY created_at DESC`,
        [penerima]
      );

      if (orders.rows.length > 0) {
        const order = orders.rows[0];
        await query(
          `UPDATE orders SET no_resi=$1, status_pesanan='RESI_UPDATED', last_updated_by=$2, updated_at=NOW() WHERE id=$3`,
          [noWaybill, req.user.email, order.id]
        );
        matched.push({ order_id: order.id, no_waybill: noWaybill, nama: penerima });
      } else {
        unmatched.push({ no_waybill: noWaybill, penerima, reason: 'No matching order found' });
        await query(
          'INSERT INTO resi_import_exceptions (no_waybill, penerima, reason) VALUES ($1,$2,$3)',
          [noWaybill, penerima, 'No matching order found']
        );
      }
    }

    res.json({ matched: matched.length, unmatched: unmatched.length, matchedData: matched, unmatchedData: unmatched });
  } catch (err) {
    console.error('Upload resi error:', err);
    res.status(500).json({ error: 'Upload resi failed' });
  }
});

module.exports = router;
