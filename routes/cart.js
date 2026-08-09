const express = require('express');
const { all, get, query } = require('../db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/cart/api', authenticate, (req, res) => {
  const items = all('SELECT c.id, c.quantity, p.id as product_id, p.name, p.price, p.image, p.stock FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?', [req.user.id]);
  const totalRow = get('SELECT COALESCE(SUM(c.quantity), 0) as count FROM cart c WHERE c.user_id = ?', [req.user.id]);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.json({ items, total, count: totalRow.count });
});

router.post('/cart/api/add', authenticate, (req, res) => {
  const { product_id, quantity } = req.body;
  const product = get('SELECT * FROM products WHERE id = ?', [product_id]);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const existing = get('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [req.user.id, product_id]);
  if (existing) {
    query('UPDATE cart SET quantity = quantity + ? WHERE id = ?', [quantity || 1, existing.id]);
  } else {
    query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [req.user.id, product_id, quantity || 1]);
  }
  const countRow = get('SELECT COALESCE(SUM(quantity), 0) as count FROM cart WHERE user_id = ?', [req.user.id]);
  res.json({ success: true, count: countRow.count });
});

router.put('/cart/api/update/:id', authenticate, (req, res) => {
  const { quantity } = req.body;
  query('UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, req.params.id, req.user.id]);
  res.json({ success: true });
});

router.delete('/cart/api/remove/:id', authenticate, (req, res) => {
  query('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  const countRow = get('SELECT COALESCE(SUM(quantity), 0) as count FROM cart WHERE user_id = ?', [req.user.id]);
  res.json({ success: true, count: countRow.count });
});

router.get('/cart', authenticate, (req, res) => {
  const items = all('SELECT c.id, c.quantity, p.id as product_id, p.name, p.price, p.image, p.stock FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?', [req.user.id]);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.render('cart', { title: 'Shopping Cart', items, total });
});

module.exports = router;
