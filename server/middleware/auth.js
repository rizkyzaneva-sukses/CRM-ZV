const jwt = require('jsonwebtoken');
const { query } = require('../utils/db');

const JWT_SECRET = requireSecret('JWT_SECRET', 'crm-jwt-secret-dev-only');

// Di produksi secret wajib diisi: kalau tidak, token bisa dipalsukan siapa pun
// yang membaca repo ini. Di dev boleh pakai nilai bawaan, tapi dengan peringatan.
function requireSecret(name, devFallback) {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} wajib di-set di environment produksi.`);
  }
  console.warn(`⚠️  ${name} belum di-set - memakai nilai dev. JANGAN dipakai di produksi.`);
  return devFallback;
}

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
