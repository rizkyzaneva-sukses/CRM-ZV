// Dijalankan sebelum modul apa pun di-require oleh test file.
// utils/db.js membuat Pool saat require, dan middleware/auth.js membaca JWT_SECRET
// saat require juga - jadi environment harus sudah lengkap sebelum itu terjadi.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';

// Tes integrasi butuh Postgres sungguhan. TEST_DATABASE_URL sengaja dipisah dari
// DATABASE_URL supaya tidak ada kemungkinan menabrak database pengembangan -
// helper-nya melakukan TRUNCATE, jadi salah sasaran berarti kehilangan data.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
