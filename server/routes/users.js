const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../utils/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', requireRole('OWNER'), async (req, res) => {
  try {
    const result = await query('SELECT id, email, full_name, role, custom_role, created_at FROM users ORDER BY created_at');
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/', requireRole('OWNER'), async (req, res) => {
  try {
    const { email, password, full_name, custom_role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const hash = await bcrypt.hash(password, 10);
    const role = custom_role === 'OWNER' ? 'admin' : 'user';
    const result = await query(
      'INSERT INTO users (email, full_name, password_hash, role, custom_role) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, full_name, role, custom_role',
      [email, full_name || email.split('@')[0], hash, role, custom_role || 'STAFF']
    );
    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/:id', requireRole('OWNER'), async (req, res) => {
  try {
    const { full_name, custom_role, password } = req.body;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await query('UPDATE users SET full_name=$1, custom_role=$2, password_hash=$3, updated_at=NOW() WHERE id=$4',
        [full_name, custom_role, hash, req.params.id]);
    } else {
      await query('UPDATE users SET full_name=$1, custom_role=$2, updated_at=NOW() WHERE id=$3',
        [full_name, custom_role, req.params.id]);
    }
    const result = await query('SELECT id, email, full_name, role, custom_role FROM users WHERE id=$1', [req.params.id]);
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/:id', requireRole('OWNER'), async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.post('/reset-all-data', requireRole('OWNER'), async (req, res) => {
  try {
    await query('DELETE FROM order_items');
    await query('DELETE FROM print_logs');
    await query('DELETE FROM resi_import_exceptions');
    await query('DELETE FROM orders');
    await query('DELETE FROM customers');
    res.json({ success: true, message: 'All order and customer data deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Reset failed' });
  }
});

module.exports = router;
