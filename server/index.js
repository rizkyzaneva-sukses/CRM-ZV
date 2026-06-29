require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { pool } = require('./utils/db');

const app = express();

// Auto-seed admin user if users table is empty
async function autoSeed() {
  try {
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
