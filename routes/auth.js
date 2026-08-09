const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { get, query } = require('../db');
const router = express.Router();

router.get('/login', (req, res) => {
  res.render('login', { title: 'Sign In' });
});

router.get('/signup', (req, res) => {
  res.render('signup', { title: 'Create Account' });
});

router.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  const existing = get('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hash = bcrypt.hashSync(password, 10);
  const result = query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hash]);

  const token = jwt.sign({ id: result.lastInsertRowid, name, email, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ success: true, token });
});

router.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'All fields required' });

  const user = get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/api/me', (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.json({ user: null });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [decoded.id]);
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

module.exports = router;
