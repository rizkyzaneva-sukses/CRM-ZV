-- CRM Order Control Center - PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  custom_role VARCHAR(50) DEFAULT 'STAFF',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipping services
CREATE TABLE IF NOT EXISTS shipping_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  platform VARCHAR(100),
  brand VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(100),
  nama_produk VARCHAR(255) NOT NULL,
  harga DECIMAL(15,2) NOT NULL,
  brand VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE IF NOT EXISTS customers (
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
);

CREATE INDEX IF NOT EXISTS idx_customers_telepon ON customers(no_telepon);

-- Kecamatan SAP
CREATE TABLE IF NOT EXISTS kecamatan_sap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(50) UNIQUE NOT NULL,
  kecamatan VARCHAR(100) NOT NULL,
  kota_kab VARCHAR(100) NOT NULL,
  provinsi VARCHAR(100) NOT NULL,
  status_tercover VARCHAR(10) DEFAULT 'Ya'
);

-- Kecamatan JNT
CREATE TABLE IF NOT EXISTS kecamatan_jnt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(50),
  kecamatan VARCHAR(100) NOT NULL,
  kota_kab VARCHAR(100) NOT NULL,
  provinsi VARCHAR(100) NOT NULL
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
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
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status_pesanan);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
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
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
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
);

-- Print Log
CREATE TABLE IF NOT EXISTS print_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number VARCHAR(50) NOT NULL,
  no_resi VARCHAR(100),
  printed_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resi Import Exceptions
CREATE TABLE IF NOT EXISTS resi_import_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_waybill VARCHAR(100) NOT NULL,
  penerima VARCHAR(255) NOT NULL,
  reason TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_by VARCHAR(255),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default admin user is created by server/utils/seed.js (password: admin123)
-- Run: cd server && node utils/seed.js

-- Default shipping services
INSERT INTO shipping_services (name, code, platform) VALUES
  ('SAP Express', 'sap', 'Marketplace'),
  ('J&T Express', 'jnt', 'Marketplace'),
  ('JNE', 'jne', 'Marketplace'),
  ('SiCepat', 'sicepat', 'Marketplace'),
  ('AnterAja', 'anteraja', 'Marketplace'),
  ('Ninja Express', 'ninja', 'Marketplace'),
  ('ID Express', 'idexpress', 'Marketplace'),
  ('Lion Parcel', 'lion', 'Marketplace'),
  ('Wahana', 'wahana', 'Marketplace'),
  ('TIKI', 'tiki', 'Marketplace'),
  ('Pos Indonesia', 'pos', 'Marketplace'),
  ('Shopee Express', 'shopee', 'Shopee'),
  ('Grab Express', 'grab', 'Grab'),
  ('GoSend', 'gojek', 'Gojek')
ON CONFLICT (code) DO NOTHING;
