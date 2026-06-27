const express = require('express');
const { query } = require('../utils/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { isSAPService, isJNTService } = require('../utils/helpers');
const router = express.Router();

router.use(authMiddleware);

// Export SAP template
router.get('/sap', requireRole('OWNER', 'FINANCE', 'INVENTORI'), async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    let where = "WHERE jasa_pengiriman ILIKE '%sap%' AND status_pesanan IN ('READY_TO_PROCESS','RESI_UPDATED')";
    let params = [];
    let idx = 1;

    if (date_from) { where += ` AND order_date >= $${idx++}`; params.push(date_from); }
    if (date_to) { where += ` AND order_date <= $${idx++}`; params.push(date_to); }

    const result = await query(`SELECT * FROM orders ${where} ORDER BY order_date`, params);

    const rows = result.rows.map(o => ({
      'NO': o.order_number,
      'NAMA PENERIMA': o.nama_pemesan,
      'ALAMAT': o.alamat,
      'KECAMATAN': o.kecamatan,
      'KOTA': o.kota_kab,
      'PROVINSI': o.provinsi,
      'KODE POS': o.kode_pos,
      'NO TELP': o.no_telepon,
      'KODE KECAMATAN': o.kecamatan_kode,
      'NILAI BARANG': o.total_belanja,
      'NILAI COD': o.jenis_transaksi === 'COD' ? o.total : 0,
      'COD/NONCOD': o.jenis_transaksi === 'COD' ? 2 : 1,
      'ASURANSI': parseFloat(o.total_belanja) > 500000 ? 0.3 : 0,
      'BERAT': o.berat_kg,
      'QTY': 1,
      'INSTRUKSI': o.instruksi_pengiriman || '',
    }));

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Export SAP failed' });
  }
});

// Export J&T template
router.get('/jnt', requireRole('OWNER', 'FINANCE', 'INVENTORI'), async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    let where = "WHERE jasa_pengiriman ILIKE '%jnt%' AND status_pesanan IN ('READY_TO_PROCESS','RESI_UPDATED')";
    let params = [];
    let idx = 1;

    if (date_from) { where += ` AND order_date >= $${idx++}`; params.push(date_from); }
    if (date_to) { where += ` AND order_date <= $${idx++}`; params.push(date_to); }

    const result = await query(`SELECT * FROM orders ${where} ORDER BY order_date`, params);

    const rows = result.rows.map(o => ({
      'ORDER NUMBER': o.order_number,
      'PENERIMA': o.nama_pemesan,
      'ALAMAT': o.alamat,
      'KECAMATAN': o.kecamatan,
      'KOTA': o.kota_kab,
      'PROVINSI': o.provinsi,
      'KODE POS': o.kode_pos,
      'TELEPON': o.no_telepon,
      'BERAT (GR)': o.berat_kg ? o.berat_kg * 1000 : 0,
      'PANJANG': 0,
      'LEBAR': 0,
      'TINGGI': 0,
      'NAMA BARANG': 'Hijab',
      'NILAI BARANG': o.total_belanja,
      'COD': o.jenis_transaksi === 'COD' ? o.total : 0,
      'JENIS LAYANAN': 'EZ',
      'KETERANGAN': o.instruksi_pengiriman || 'TOLONG HUBUNGI',
    }));

    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: 'Export J&T failed' });
  }
});

// Export CRM import template
router.get('/crm', requireRole('OWNER', 'FINANCE'), async (req, res) => {
  try {
    const result = await query('SELECT * FROM orders ORDER BY order_date DESC');
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Export CRM failed' });
  }
});

module.exports = router;
