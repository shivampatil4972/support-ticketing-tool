const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { sendResponse } = require('../utils/response');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendResponse(res, 401, false, null, 'Authentication required');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await pool.execute('SELECT id, name, email, role, client_id, is_active FROM users WHERE id = ?', [decoded.id]);

    if (!rows.length) {
      return sendResponse(res, 401, false, null, 'User not found');
    }

    if (!rows[0].is_active) {
      return sendResponse(res, 403, false, null, 'Account has been deactivated');
    }

    req.user = rows[0];
    next();
  } catch {
    return sendResponse(res, 401, false, null, 'Invalid or expired token');
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return sendResponse(res, 401, false, null, 'Authentication required');
  }

  if (!roles.includes(req.user.role)) {
    return sendResponse(res, 403, false, null, 'Forbidden');
  }

  next();
};

module.exports = { authenticate, authorize };
