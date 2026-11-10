const jwt = require('jsonwebtoken');
const config = require('../config');
const { HttpError } = require('../utils/errors');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Please log in to continue.'));
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    // Tokens issued before roles existed have no role claim: they are patients.
    req.user = { id: Number(payload.sub), role: payload.role || 'patient' };
    return next();
  } catch (err) {
    return next(new HttpError(401, 'Your session has expired. Please log in again.'));
  }
}

// Use after requireAuth. Roles are fixed per account, so the token's claim is enough.
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return next(new HttpError(403, "This isn't available for your account type."));
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
