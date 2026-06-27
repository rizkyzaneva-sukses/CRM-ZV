const jwt = require('jsonwebtoken');
const { query } = require('../utils/db');

const JWT_SECRET = process.env.JWT_SECRET || 'crm-jwt-secret';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, custom_role: user.custom_role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await query('SELECT id, email, full_name, role, custom_role FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = req.user?.custom_role || 'STAFF';
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { generateToken, authMiddleware, requireRole, JWT_SECRET };
