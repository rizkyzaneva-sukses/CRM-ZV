const request = require('supertest');

// Tabel data yang dikosongkan antar test file. users sengaja ikut supaya setiap
// file mulai dari kondisi seed yang sama persis (admin@zaneva.com / admin123).
const TABLES = [
  'order_items',
  'print_logs',
  'resi_import_exceptions',
  'orders',
  'order_number_counters',
  'customers',
  'products',
  'shipping_services',
  'kecamatan_sap',
  'kecamatan_jnt',
  'audit_logs',
  'users',
];

function requireApp() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'Tes integrasi butuh Postgres. Set TEST_DATABASE_URL, contoh:\n' +
      '  docker run -d --name crm-test-db -e POSTGRES_USER=crm_user -e POSTGRES_PASSWORD=crm_password \\\n' +
      '    -e POSTGRES_DB=crm_test -p 55432:5432 postgres:16-alpine\n' +
      '  TEST_DATABASE_URL=postgresql://crm_user:crm_password@localhost:55432/crm_test npm test'
    );
  }
  return require('../../index');
}

// Menyiapkan schema + seed sekali di awal test file.
async function bootstrap() {
  const { app, autoSeed } = requireApp();
  await autoSeed();
  return app;
}

// Kembalikan database ke kondisi awal. autoSeed idempoten, jadi memanggilnya
// lagi setelah TRUNCATE akan memulihkan admin dan master jasa pengiriman.
async function resetData() {
  const { pool } = require('../../utils/db');
  const { autoSeed } = require('../../index');
  await pool.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
  await autoSeed();
}

async function closeDb() {
  const { pool } = require('../../utils/db');
  await pool.end();
}

// ---- pintasan yang dipakai berulang di banyak tes ----

async function login(app, email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Login ${email} gagal: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
}

async function loginAsOwner(app) {
  return login(app, 'admin@zaneva.com', 'admin123');
}

// Membuat user lewat endpoint resmi (butuh token OWNER) lalu langsung login,
// supaya jalur pembuatan user ikut teruji setiap kali dipakai.
async function createUserAndLogin(app, ownerToken, { email, password, custom_role }) {
  const created = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ email, password, custom_role });
  if (created.status !== 201) {
    throw new Error(`Buat user ${email} gagal: ${created.status} ${JSON.stringify(created.body)}`);
  }
  return { token: await login(app, email, password), user: created.body.user };
}

function makeOrder(overrides = {}) {
  return {
    nama_pemesan: 'Budi',
    alamat: 'Jl Mawar 1',
    no_telepon: '081200000001',
    jenis_transaksi: 'COD',
    jasa_pengiriman: 'sap',
    ongkir: 0,
    items: [{ nama_produk: 'Hijab', qty: 1, harga_setelah_diskon: 10000 }],
    ...overrides,
  };
}

module.exports = {
  TABLES,
  bootstrap,
  resetData,
  closeDb,
  login,
  loginAsOwner,
  createUserAndLogin,
  makeOrder,
};
