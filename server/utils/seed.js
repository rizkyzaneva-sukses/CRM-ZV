require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcrypt');
const { pool } = require('./db');

async function seed() {
  try {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (email, full_name, password_hash, role, custom_role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
      ['admin@zaneva.com', 'Admin', hash, 'admin', 'OWNER']
    );
    console.log('✅ Default admin user created (admin@zaneva.com / admin123)');
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
