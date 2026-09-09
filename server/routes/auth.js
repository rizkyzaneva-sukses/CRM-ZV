const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../utils/db');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');
const router = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    // Akun yang dibuat lewat Google / seed tidak punya password_hash.
    // bcrypt.compare(password, null) melempar exception, bukan mengembalikan false.
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Akun ini memakai Login Google. Silakan masuk lewat tombol Google.' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, custom_role: user.custom_role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Google Login
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload.email;
    const googleId = payload.sub;

    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email belum terdaftar. Silakan hubungi Administrator.' });
    }

    const user = result.rows[0];
    
    // Update google_id if not set
    if (!user.google_id) {
      await query('UPDATE users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
    }

    const jwtToken = generateToken(user);
    res.json({
      token: jwtToken,
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, custom_role: user.custom_role }
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ error: 'Autentikasi Google gagal. Silakan coba lagi.' });
  }
});

// Bootstrap only: mendaftarkan user pertama sebagai OWNER ketika database masih kosong.
// Setelah ada user, pendaftaran ditutup - akun baru dibuat OWNER lewat POST /api/users.
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const userCount = await query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) !== 0) {
      return res.status(403).json({ error: 'Pendaftaran mandiri ditutup. Silakan hubungi Administrator.' });
    }
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const customRole = 'OWNER';
    const role = 'admin';

    const result = await query(
      'INSERT INTO users (email, full_name, password_hash, role, custom_role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, custom_role',
      [email, full_name || email.split('@')[0], hash, role, customRole]
    );
    const user = result.rows[0];
    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
