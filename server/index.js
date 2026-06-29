require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { pool } = require('./utils/db');

const app = express();

// Auto-create all tables and seed data on startup
async function autoSeed() {
  const tables = [
    `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,
    `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      full_name VARCHAR(255),
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'user',
      custom_role VARCHAR(50) DEFAULT 'STAFF',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS shipping_services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      platform VARCHAR(100),
      brand VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sku VARCHAR(100) UNIQUE,
      nama_produk VARCHAR(255) NOT NULL,
      harga DECIMAL(15,2) NOT NULL,
      brand VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS customers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nama VARCHAR(255) NOT NULL,
      no_telepon VARCHAR(50) NOT NULL,
      alamat TEXT NOT NULL,
      provinsi VARCHAR(100),
      kota_kab VARCHAR(100),
      kecamatan VARCHAR(100),
      kode_pos VARCHAR(10),
      email VARCHAR(255),
      notes TEXT,
      total_orders INTEGER DEFAULT 0,
      last_order_date DATE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_telepon ON customers(no_telepon)`,
    `CREATE TABLE IF NOT EXISTS kecamatan_sap (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kode VARCHAR(50) UNIQUE NOT NULL,
      kecamatan VARCHAR(100) NOT NULL,
      kota_kab VARCHAR(100) NOT NULL,
      provinsi VARCHAR(100) NOT NULL,
      status_tercover VARCHAR(10) DEFAULT 'Ya'
    )`,
    `CREATE TABLE IF NOT EXISTS kecamatan_jnt (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      kode VARCHAR(50) UNIQUE,
      kecamatan VARCHAR(100) NOT NULL,
      kota_kab VARCHAR(100) NOT NULL,
      provinsi VARCHAR(100) NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_number VARCHAR(50) UNIQUE,
      order_date DATE DEFAULT CURRENT_DATE,
      nama_pemesan VARCHAR(255) NOT NULL,
      alamat TEXT NOT NULL,
      no_telepon VARCHAR(50) NOT NULL,
      kode_pos VARCHAR(10),
      berat_kg DECIMAL(10,2),
      jenis_transaksi VARCHAR(10) NOT NULL CHECK (jenis_transaksi IN ('CASH','COD')),
      instruksi_pengiriman TEXT,
      jasa_pengiriman VARCHAR(100) NOT NULL,
      provinsi VARCHAR(100),
      kota_kab VARCHAR(100),
      kecamatan VARCHAR(100),
      kecamatan_kode VARCHAR(50),
      ketentuan VARCHAR(100),
      metode_pembayaran VARCHAR(50),
      transfer_atas_nama VARCHAR(255),
      total_belanja DECIMAL(15,2) DEFAULT 0,
      ongkir DECIMAL(15,2) DEFAULT 0,
      penanganan DECIMAL(15,2) DEFAULT 0,
      total DECIMAL(15,2) DEFAULT 0,
      no_resi VARCHAR(100),
      status_pesanan VARCHAR(30) DEFAULT 'DRAFT' CHECK (status_pesanan IN ('DRAFT','WAITING_FINANCE','READY_TO_PROCESS','RESI_UPDATED','REJECTED')),
      platform VARCHAR(50) DEFAULT 'CRM',
      finance_status VARCHAR(20) CHECK (finance_status IN ('PENDING','APPROVED','REJECTED')),
      finance_verified_at TIMESTAMPTZ,
      finance_verified_by VARCHAR(255),
      last_updated_by VARCHAR(255),
      created_by VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status_pesanan)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by)`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      sku VARCHAR(100),
      nama_produk VARCHAR(255) NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1,
      harga_setelah_diskon DECIMAL(15,2) DEFAULT 0,
      subtotal_item DECIMAL(15,2) DEFAULT 0,
      jasa_pengiriman VARCHAR(100),
      berat_kg DECIMAL(10,2),
      provinsi VARCHAR(100),
      kota_kab VARCHAR(100),
      kecamatan VARCHAR(100),
      kecamatan_kode VARCHAR(50),
      status_tercover VARCHAR(10),
      instruksi_pengiriman TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action VARCHAR(100) NOT NULL,
      entity_name VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS','PARTIAL','FAILED')),
      total_records INTEGER,
      success_count INTEGER,
      skipped_count INTEGER,
      failed_count INTEGER,
      error_details TEXT,
      performed_by VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS print_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      order_number VARCHAR(50) NOT NULL,
      no_resi VARCHAR(100),
      printed_by VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS resi_import_exceptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      no_waybill VARCHAR(100) NOT NULL,
      penerima VARCHAR(255) NOT NULL,
      reason TEXT NOT NULL,
      resolved BOOLEAN DEFAULT false,
      resolved_by VARCHAR(255),
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];

  // ALTER TABLE to fix missing UNIQUE constraints on existing DB
  const alterTables = [
    `DO $$ BEGIN ALTER TABLE kecamatan_jnt ADD CONSTRAINT uniq_kecamatan_jnt_kode UNIQUE (kode); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN ALTER TABLE products ADD CONSTRAINT uniq_products_sku UNIQUE (sku); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    `DO $$ BEGIN ALTER TABLE customers ADD CONSTRAINT uniq_customers_telepon UNIQUE (no_telepon); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  ];

  try {
    for (const sql of tables) {
      try { await pool.query(sql); } catch(e) { /* skip */ }
    }
    for (const sql of alterTables) {
      try { await pool.query(sql); } catch(e) { /* skip */ }
    }
    console.log('✅ Database tables initialized');

    // Seed default shipping services
    const shippingData = [
      ['SAP Express', 'sap', 'Marketplace'],
      ['J&T Express', 'jnt', 'Marketplace'],
      ['JNE', 'jne', 'Marketplace'],
      ['SiCepat', 'sicepat', 'Marketplace'],
      ['AnterAja', 'anteraja', 'Marketplace'],
      ['Ninja Express', 'ninja', 'Marketplace'],
      ['ID Express', 'idexpress', 'Marketplace'],
      ['Lion Parcel', 'lion', 'Marketplace'],
      ['Wahana', 'wahana', 'Marketplace'],
      ['TIKI', 'tiki', 'Marketplace'],
      ['Pos Indonesia', 'pos', 'Marketplace'],
      ['Shopee Express', 'shopee', 'Shopee'],
      ['Grab Express', 'grab', 'Grab'],
      ['GoSend', 'gojek', 'Gojek'],
    ];
    for (const [name, code, platform] of shippingData) {
      try {
        await pool.query(
          'INSERT INTO shipping_services (name, code, platform) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING',
          [name, code, platform]
        );
      } catch(e) { /* skip */ }
    }
    console.log('✅ Default shipping services seeded');

    // Seed admin user if empty
    const result = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(result.rows[0].count) === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query(
        `INSERT INTO users (email, full_name, password_hash, role, custom_role)
         VALUES ($1, $2, $3, $4, $5)`,
        ['admin@zaneva.com', 'Admin', hash, 'admin', 'OWNER']
      );
      console.log('✅ Auto-seeded admin user (admin@zaneva.com / admin123)');
    }
  } catch (err) {
    console.error('Auto-seed error:', err.message);
  }
}

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'crm-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Static files (serves built frontend in production)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/order-items', require('./routes/orderItems'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/shipping-services', require('./routes/shippingServices'));
app.use('/api/kecamatan-sap', require('./routes/kecamatanSap'));
app.use('/api/kecamatan-jnt', require('./routes/kecamatanJnt'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/import', require('./routes/import'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/export', require('./routes/export'));
app.use('/api/users', require('./routes/users'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Auto-seed on startup
autoSeed().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CRM Server running on port ${PORT}`);
  });
});
