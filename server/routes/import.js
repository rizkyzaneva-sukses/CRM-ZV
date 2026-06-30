const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { query } = require('../utils/db');
const { authMiddleware } = require('../middleware/auth');
const { createAuditLog } = require('./auditLogs');
const router = express.Router();

const uuidv4 = () => crypto.randomUUID();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.use(authMiddleware);

// ============================================================
// POST /api/import/preview
// Accept JSON file, parse it, check for duplicates, return preview
// ============================================================
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    console.log('Import preview: received file', req.file?.originalname, req.file?.size, 'bytes');
    if (!req.file) {
      return res.status(400).json({ error: 'File required' });
    }

    // Parse JSON from uploaded file
    let jsonData;
    try {
      const content = req.file.buffer.toString('utf8');
      console.log('Import preview: JSON size', content.length, 'chars');
      jsonData = JSON.parse(content);
      console.log('Import preview: parsed keys:', Object.keys(jsonData));
    } catch (parseErr) {
      console.error('Import preview: JSON parse error:', parseErr.message);
      return res.status(400).json({ error: 'Invalid JSON file: ' + parseErr.message });
    }

    const preview = {};

    // ---- Shipping Services (check duplicate by code) ----
    if (jsonData.ShippingService && Array.isArray(jsonData.ShippingService)) {
      console.log('Import preview: Processing', jsonData.ShippingService.length, 'shipping services');
      const codes = jsonData.ShippingService.map(s => s.code).filter(Boolean);
      let existingCodes = [];
      if (codes.length > 0) {
        const result = await query(
          'SELECT code FROM shipping_services WHERE code = ANY($1)',
          [codes]
        );
        existingCodes = result.rows.map(r => r.code);
        console.log('Import preview: Found', existingCodes.length, 'existing shipping services');
      }
      preview.ShippingService = jsonData.ShippingService.map(item => ({
        ...item,
        _newId: uuidv4(),
        _isDuplicate: existingCodes.includes(item.code),
      }));
    }

    // ---- Kecamatan SAP (check duplicate by kode) ----
    if (jsonData.KecamatanSAP && Array.isArray(jsonData.KecamatanSAP)) {
      const kodes = jsonData.KecamatanSAP.map(k => k.kode).filter(Boolean);
      let existingKodes = [];
      if (kodes.length > 0) {
        const result = await query(
          'SELECT kode FROM kecamatan_sap WHERE kode = ANY($1)',
          [kodes]
        );
        existingKodes = result.rows.map(r => r.kode);
      }
      preview.KecamatanSAP = jsonData.KecamatanSAP.map(item => ({
        ...item,
        _newId: uuidv4(),
        _isDuplicate: existingKodes.includes(item.kode),
      }));
    }

    // ---- Kecamatan JNT (check duplicate by kode) ----
    if (jsonData.KecamatanJNT && Array.isArray(jsonData.KecamatanJNT)) {
      const kodes = jsonData.KecamatanJNT.map(k => k.kode).filter(Boolean);
      let existingKodes = [];
      if (kodes.length > 0) {
        const result = await query(
          'SELECT kode FROM kecamatan_jnt WHERE kode = ANY($1)',
          [kodes]
        );
        existingKodes = result.rows.map(r => r.kode);
      }
      preview.KecamatanJNT = jsonData.KecamatanJNT.map(item => ({
        ...item,
        _newId: uuidv4(),
        _isDuplicate: existingKodes.includes(item.kode),
      }));
    }

    // ---- Products (check duplicate by sku) ----
    if (jsonData.Product && Array.isArray(jsonData.Product)) {
      const skus = jsonData.Product.map(p => p.sku).filter(Boolean);
      let existingSkus = [];
      if (skus.length > 0) {
        const result = await query(
          'SELECT sku FROM products WHERE sku = ANY($1)',
          [skus]
        );
        existingSkus = result.rows.map(r => r.sku);
      }
      preview.Product = jsonData.Product.map(item => ({
        ...item,
        _newId: uuidv4(),
        _isDuplicate: existingSkus.includes(item.sku),
      }));
    }

    // ---- Customers (check duplicate by no_telepon) ----
    if (jsonData.Customer && Array.isArray(jsonData.Customer)) {
      const telepons = jsonData.Customer.map(c => c.no_telepon).filter(Boolean);
      let existingTelepons = [];
      if (telepons.length > 0) {
        const result = await query(
          'SELECT no_telepon FROM customers WHERE no_telepon = ANY($1)',
          [telepons]
        );
        existingTelepons = result.rows.map(r => r.no_telepon);
      }
      preview.Customer = jsonData.Customer.map(item => ({
        ...item,
        _newId: uuidv4(),
        _isDuplicate: existingTelepons.includes(item.no_telepon),
      }));
    }

    // ---- Orders (check duplicate by order_number) ----
    if (jsonData.Order && Array.isArray(jsonData.Order)) {
      const orderNumbers = jsonData.Order.map(o => o.order_number).filter(Boolean);
      let existingOrderNumbers = [];
      if (orderNumbers.length > 0) {
        const result = await query(
          'SELECT order_number FROM orders WHERE order_number = ANY($1)',
          [orderNumbers]
        );
        existingOrderNumbers = result.rows.map(r => r.order_number);
      }
      // Build ID map so order_items can reference new order IDs
      const orderIdMap = {};
      preview.Order = jsonData.Order.map(item => {
        const newId = uuidv4();
        if (item._id || item.id) {
          orderIdMap[item._id || item.id] = newId;
        }
        return {
          ...item,
          _newId: newId,
          _isDuplicate: existingOrderNumbers.includes(item.order_number),
        };
      });
      // Store the map for order_items processing
      preview._orderIdMap = orderIdMap;
    }

    // ---- Order Items ----
    if (jsonData.OrderItem && Array.isArray(jsonData.OrderItem)) {
      preview.OrderItem = jsonData.OrderItem.map(item => {
        // Map the original order reference to the new order ID
        let mappedOrderId = item.order_id || item.OrderID;
        if (preview._orderIdMap && preview._orderIdMap[mappedOrderId]) {
          mappedOrderId = preview._orderIdMap[mappedOrderId];
        }
        return {
          ...item,
          _newId: uuidv4(),
          _mappedOrderId: mappedOrderId,
          _isDuplicate: false, // Order items don't have a unique constraint to check
        };
      });
    }

    // ---- Audit Logs ----
    if (jsonData.AuditLog && Array.isArray(jsonData.AuditLog)) {
      preview.AuditLog = jsonData.AuditLog.map(item => ({
        ...item,
        _newId: uuidv4(),
      }));
    }

    // ---- Print Logs ----
    if (jsonData.PrintLog && Array.isArray(jsonData.PrintLog)) {
      preview.PrintLog = jsonData.PrintLog.map(item => ({
        ...item,
        _newId: uuidv4(),
      }));
    }

    // ---- Resi Import Exceptions ----
    if (jsonData.ResiImportException && Array.isArray(jsonData.ResiImportException)) {
      preview.ResiImportException = jsonData.ResiImportException.map(item => ({
        ...item,
        _newId: uuidv4(),
      }));
    }

    // Remove internal _orderIdMap from response
    delete preview._orderIdMap;

    // Calculate summary
    const summary = {};
    for (const [key, items] of Object.entries(preview)) {
      if (Array.isArray(items)) {
        summary[key] = {
          total: items.length,
          duplicates: items.filter(i => i._isDuplicate).length,
          new: items.filter(i => !i._isDuplicate).length,
        };
      }
    }

    res.json({ preview, summary });
  } catch (err) {
    console.error('Import preview error:', err.message, err.stack);
    res.status(500).json({ error: 'Preview failed: ' + err.message });
  }
});

// ============================================================
// POST /api/import/confirm
// Accept confirmed data and import to PostgreSQL
// ============================================================
router.post('/confirm', async (req, res) => {
  const client = await require('../utils/db').pool.connect();
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Data object required' });
    }

    await client.query('BEGIN');

    const results = {
      ShippingService: { success: 0, skipped: 0, failed: 0, errors: [] },
      KecamatanSAP: { success: 0, skipped: 0, failed: 0, errors: [] },
      KecamatanJNT: { success: 0, skipped: 0, failed: 0, errors: [] },
      Product: { success: 0, skipped: 0, failed: 0, errors: [] },
      Customer: { success: 0, skipped: 0, failed: 0, errors: [] },
      Order: { success: 0, skipped: 0, failed: 0, errors: [] },
      OrderItem: { success: 0, skipped: 0, failed: 0, errors: [] },
    };

    // Build ID mapping for orders (original _id -> new UUID)
    const orderIdMap = {};

    // Helper: safe insert with ON CONFLICT fallback
    const safeInsert = async (sql, params, fallbackSql) => {
      try {
        await client.query(sql, params);
        return true;
      } catch (e) {
        // If ON CONFLICT constraint missing, try without it
        if (fallbackSql) {
          try {
            await client.query(fallbackSql, params);
            return true;
          } catch (e2) {
            throw e2;
          }
        }
        throw e;
      }
    };

    // ---- 1. Import Shipping Services ----
    if (data.ShippingService && Array.isArray(data.ShippingService)) {
      for (const item of data.ShippingService) {
        if (item._isDuplicate) { results.ShippingService.skipped++; continue; }
        try {
          await client.query(
            `INSERT INTO shipping_services (id, name, code, platform, brand, is_active)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (code) DO NOTHING`,
            [item._newId || uuidv4(), item.name || '', item.code || '',
             item.platform || '', item.brand || 'ZANEVA', item.is_active !== false]
          );
          results.ShippingService.success++;
        } catch (e) {
          results.ShippingService.failed++;
          results.ShippingService.errors.push(e.message);
        }
      }
    }

    // ---- 2. Import Kecamatan SAP ----
    if (data.KecamatanSAP && Array.isArray(data.KecamatanSAP)) {
      for (const item of data.KecamatanSAP) {
        if (item._isDuplicate) { results.KecamatanSAP.skipped++; continue; }
        if (!item.kode) { results.KecamatanSAP.skipped++; continue; } // skip null kode
        try {
          await client.query(
            `INSERT INTO kecamatan_sap (id, kode, kecamatan, kota_kab, provinsi, status_tercover)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (kode) DO NOTHING`,
            [item._newId || uuidv4(), item.kode, item.kecamatan || '',
             item.kota_kab || '', item.provinsi || '', item.status_tercover || 'Ya']
          );
          results.KecamatanSAP.success++;
        } catch (e) {
          results.KecamatanSAP.failed++;
          results.KecamatanSAP.errors.push(e.message);
        }
      }
    }

    // ---- 3. Import Kecamatan JNT ----
    if (data.KecamatanJNT && Array.isArray(data.KecamatanJNT)) {
      for (const item of data.KecamatanJNT) {
        if (item._isDuplicate) { results.KecamatanJNT.skipped++; continue; }
        if (!item.kode) { results.KecamatanJNT.skipped++; continue; } // skip null kode
        try {
          await client.query(
            `INSERT INTO kecamatan_jnt (id, kode, kecamatan, kota_kab, provinsi)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (kode) DO NOTHING`,
            [item._newId || uuidv4(), item.kode, item.kecamatan || '',
             item.kota_kab || '', item.provinsi || '']
          );
          results.KecamatanJNT.success++;
        } catch (e) {
          results.KecamatanJNT.failed++;
          results.KecamatanJNT.errors.push(e.message);
        }
      }
    }

    // ---- 4. Import Products ----
    if (data.Product && Array.isArray(data.Product)) {
      for (const item of data.Product) {
        if (item._isDuplicate) { results.Product.skipped++; continue; }
        const sku = item.sku || item.nama_produk || ''; // fallback: use nama as sku
        if (!sku) { results.Product.skipped++; continue; }
        try {
          await client.query(
            `INSERT INTO products (id, sku, nama_produk, harga, brand)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (sku) DO NOTHING`,
            [item._newId || uuidv4(), sku, item.nama_produk || '',
             parseFloat(item.harga) || 0, item.brand || 'ZANEVA']
          );
          results.Product.success++;
        } catch (e) {
          results.Product.failed++;
          results.Product.errors.push(e.message);
        }
      }
    }

    // ---- 5. Import Customers ----
    if (data.Customer && Array.isArray(data.Customer)) {
      for (const item of data.Customer) {
        if (item._isDuplicate) { results.Customer.skipped++; continue; }
        const phone = item.no_telepon || '';
        if (!phone) { results.Customer.skipped++; continue; } // skip if no phone
        try {
          await client.query(
            `INSERT INTO customers (id, nama, no_telepon, alamat, provinsi, kota_kab, kecamatan, kode_pos, email, notes, total_orders, last_order_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (no_telepon) DO UPDATE SET
               nama = EXCLUDED.nama, alamat = EXCLUDED.alamat,
               provinsi = EXCLUDED.provinsi, kota_kab = EXCLUDED.kota_kab,
               kecamatan = EXCLUDED.kecamatan, kode_pos = EXCLUDED.kode_pos,
               updated_at = NOW()`,
            [item._newId || uuidv4(), item.nama || '', phone, item.alamat || '',
             item.provinsi || '', item.kota_kab || '', item.kecamatan || '',
             item.kode_pos || '', item.email || null, item.notes || null,
             parseInt(item.total_orders) || 0, item.last_order_date || null]
          );
          results.Customer.success++;
        } catch (e) {
          results.Customer.failed++;
          results.Customer.errors.push(e.message);
        }
      }
    }

    // ---- 6. Import Orders ----
    if (data.Order && Array.isArray(data.Order)) {
      for (const item of data.Order) {
        // Always map ID, even for duplicates (needed for order_items)
        const origId = item.id || item._id;
        if (origId) {
          // Check if already in DB by order_number
          try {
            const existing = await client.query(
              'SELECT id FROM orders WHERE order_number = $1', [item.order_number]
            );
            if (existing.rows.length > 0) {
              orderIdMap[origId] = existing.rows[0].id;
            }
          } catch (_) {}
        }

        if (item._isDuplicate) {
          results.Order.skipped++;
          continue;
        }
        try {
          const newId = item._newId || uuidv4();
          // Normalize jenis_transaksi to valid CHECK values
          let jenisTransaksi = (item.jenis_transaksi || 'CASH').toUpperCase();
          if (!['CASH', 'COD'].includes(jenisTransaksi)) jenisTransaksi = 'CASH';

          await client.query(
            `INSERT INTO orders (id, order_number, order_date, nama_pemesan, alamat, no_telepon,
              kode_pos, berat_kg, jenis_transaksi, instruksi_pengiriman, jasa_pengiriman,
              provinsi, kota_kab, kecamatan, kecamatan_kode, ketentuan, metode_pembayaran,
              transfer_atas_nama, total_belanja, ongkir, penanganan, total,
              no_resi, status_pesanan, platform, finance_status, finance_verified_by,
              finance_verified_at, last_updated_by, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30)
             ON CONFLICT (order_number) DO NOTHING`,
            [newId, item.order_number || null, item.order_date || new Date().toISOString().split('T')[0],
             item.nama_pemesan || '', item.alamat || '', item.no_telepon || '',
             item.kode_pos || null, parseFloat(item.berat_kg) || null,
             jenisTransaksi, item.instruksi_pengiriman || null,
             item.jasa_pengiriman || 'sap', item.provinsi || '', item.kota_kab || '',
             item.kecamatan || '', item.kecamatan_kode || null,
             item.ketentuan || null, item.metode_pembayaran || null,
             item.transfer_atas_nama || null, parseFloat(item.total_belanja) || 0,
             parseFloat(item.ongkir) || 0, parseFloat(item.penanganan) || 0,
             parseFloat(item.total) || 0, item.no_resi || null,
             item.status_pesanan || 'DRAFT', item.platform || 'CRM',
             item.finance_status || null, item.finance_verified_by || null,
             item.finance_verified_at || null, item.last_updated_by || null,
             req.user.email]
          );
          // Map original _id to new UUID
          if (origId) {
            orderIdMap[origId] = newId;
          }
          results.Order.success++;
        } catch (e) {
          results.Order.failed++;
          results.Order.errors.push(e.message);
        }
      }
    }

    // ---- 7. Import Order Items ----
    // orderIdMap now contains all order mappings (new + existing duplicates)
    if (data.OrderItem && Array.isArray(data.OrderItem)) {
      for (const item of data.OrderItem) {
        try {
          const newId = item._newId || uuidv4();

          // Resolve order_id using orderIdMap (built during Order import above)
          // NEVER use _mappedOrderId from frontend — it's stale from preview
          let resolvedOrderId = null;
          const origOrderId = item.order_id || item.OrderID;

          // 1. Try orderIdMap (maps original MongoDB ObjectId → DB UUID)
          if (origOrderId && orderIdMap[origOrderId]) {
            resolvedOrderId = orderIdMap[origOrderId];
          }
          // 2. Try DB lookup by order_number (fallback)
          if (!resolvedOrderId && item.order_number) {
            try {
              const existing = await client.query(
                'SELECT id FROM orders WHERE order_number = $1', [item.order_number]
              );
              if (existing.rows.length > 0) resolvedOrderId = existing.rows[0].id;
            } catch (_) {}
          }
          // 3. Try _mappedOrderId as last resort (stale but better than nothing)
          if (!resolvedOrderId && item._mappedOrderId) {
            // Check if it's a valid UUID format (not MongoDB ObjectId)
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item._mappedOrderId)) {
              resolvedOrderId = item._mappedOrderId;
            }
          }

          if (!resolvedOrderId) {
            results.OrderItem.failed++;
            results.OrderItem.errors.push(`No order_id for: ${item.nama_produk || 'unknown'} (orig: ${origOrderId})`);
            continue;
          }

          await client.query(
            `INSERT INTO order_items (id, order_id, sku, nama_produk, qty, harga_setelah_diskon,
              subtotal_item, jasa_pengiriman, berat_kg, provinsi, kota_kab, kecamatan,
              kecamatan_kode, status_tercover, instruksi_pengiriman)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
            [newId, resolvedOrderId, item.sku || '', item.nama_produk || '',
             parseInt(item.qty) || 1, parseFloat(item.harga_setelah_diskon) || 0,
             parseFloat(item.subtotal_item) || 0, item.jasa_pengiriman || null,
             parseFloat(item.berat_kg) || null, item.provinsi || '',
             item.kota_kab || '', item.kecamatan || '',
             item.kecamatan_kode || null, item.status_tercover || null,
             item.instruksi_pengiriman || null]
          );
          results.OrderItem.success++;
        } catch (e) {
          results.OrderItem.failed++;
          results.OrderItem.errors.push(e.message);
        }
      }
    }

    await client.query('COMMIT');

    // Create audit log for the import
    const totalImported = Object.values(results).reduce((sum, r) => sum + r.success, 0);
    const totalSkipped = Object.values(results).reduce((sum, r) => sum + r.skipped, 0);
    const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
    const allErrors = Object.values(results)
      .flatMap(r => r.errors)
      .slice(0, 10); // Limit error details

    await createAuditLog('JSON_IMPORT', 'multiple', totalFailed > 0 ? 'PARTIAL' : 'SUCCESS', {
      total_records: totalImported + totalSkipped + totalFailed,
      success_count: totalImported,
      skipped_count: totalSkipped,
      failed_count: totalFailed,
      error_details: allErrors.length ? JSON.stringify(allErrors) : null,
      performed_by: req.user.email,
    });

    res.json({ results, totalImported, totalSkipped, totalFailed });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Import confirm error:', err);
    res.status(500).json({ error: 'Import failed' });
  } finally {
    client.release();
  }
});

module.exports = router;
