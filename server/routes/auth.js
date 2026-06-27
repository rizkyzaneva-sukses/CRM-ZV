const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../utils/db');
const { generateToken, authMiddleware } = require('../middleware/auth');
const router = express.Router();

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
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register (first user becomes OWNER)
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const userCount = await query('SELECT COUNT(*) FROM users');
    const customRole = parseInt(userCount.rows[0].count) === 0 ? 'OWNER' : 'STAFF';
    const role = customRole === 'OWNER' ? 'admin' : 'user';

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
