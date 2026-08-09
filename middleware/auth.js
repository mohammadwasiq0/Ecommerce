const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
  if (!token) {
    if (req.xhr || req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.redirect('/login');
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    res.locals.user = decoded;
    next();
  } catch {
    res.clearCookie('token');
    if (req.xhr || req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.redirect('/login');
  }
}

function optionalAuth(req, res, next) {
  const token = req.cookies?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      res.locals.user = decoded;
    } catch { /* ignore */ }
  }
  next();
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    if (req.xhr || req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.redirect('/');
  }
  next();
}

module.exports = { authenticate, optionalAuth, adminOnly };
