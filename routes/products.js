const express = require('express');
const { all, get, query } = require('../db');
const { authenticate, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/products', (req, res) => {
  const { search, category, featured } = req.query;
  let sql = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1`;
  const params = [];
  if (search) { sql += ` AND (p.name LIKE ? OR p.description LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
  if (category) { sql += ` AND c.slug = ?`; params.push(category); }
  if (featured) { sql += ` AND p.featured = 1`; }
  sql += ` ORDER BY p.created_at DESC`;
  const products = all(sql, params);
  const categories = all('SELECT * FROM categories');
  res.render('products', { title: 'Shop', products, categories, search: search || '', selectedCategory: category || '' });
});

router.get('/products/api', (req, res) => {
  const { search, category, featured, limit } = req.query;
  let sql = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1`;
  const params = [];
  if (search) { sql += ` AND (p.name LIKE ? OR p.description LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
  if (category) { sql += ` AND c.slug = ?`; params.push(category); }
  if (featured) { sql += ` AND p.featured = 1`; }
  sql += ` ORDER BY p.created_at DESC`;
  if (limit) { sql += ` LIMIT ?`; params.push(parseInt(limit)); }
  res.json(all(sql, params));
});

router.get('/products/:slug', (req, res) => {
  const product = get('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ?', [req.params.slug]);
  if (!product) {
    const categories = all('SELECT * FROM categories');
    return res.status(404).render('products', { title: 'Not Found', products: [], categories, search: '', selectedCategory: '' });
  }
  const related = all('SELECT * FROM products WHERE category_id = ? AND id != ? LIMIT 4', [product.category_id, product.id]);
  res.render('product', { title: product.name, product, related });
});

router.post('/api/admin/products', authenticate, adminOnly, (req, res) => {
  const { name, description, price, image, category_id, stock, featured } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Name and price required' });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const result = query('INSERT INTO products (name, slug, description, price, image, category_id, stock, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [name, slug, description || '', parseFloat(price), image || 'https://via.placeholder.com/300', category_id || null, stock || 0, featured || 0]);
  res.json({ success: true, id: result.lastInsertRowid });
});

router.put('/api/admin/products/:id', authenticate, adminOnly, (req, res) => {
  const { name, description, price, image, category_id, stock, featured } = req.body;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  query('UPDATE products SET name=?, slug=?, description=?, price=?, image=?, category_id=?, stock=?, featured=? WHERE id=?', [name, slug, description, parseFloat(price), image, category_id, stock, featured, req.params.id]);
  res.json({ success: true });
});

router.delete('/api/admin/products/:id', authenticate, adminOnly, (req, res) => {
  query('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

router.get('/products/api/reviews/:productId', (req, res) => {
  const reviews = all(`SELECT r.*, u.name as user_name FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC`, [req.params.productId]);
  const avg = get('SELECT AVG(rating) as avg_rating FROM reviews WHERE product_id = ?', [req.params.productId]);
  res.json({ reviews, average_rating: avg ? avg.avg_rating : null });
});

router.post('/products/api/reviews', authenticate, (req, res) => {
  const { product_id, rating, comment } = req.body;
  if (!product_id || !rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Product ID and rating (1-5) required' });
  query('INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)', [product_id, req.user.id, rating, comment || '']);
  res.status(201).json({ success: true });
});

router.get('/products/api/:id/reviews', (req, res) => {
  const reviews = all(`SELECT r.*, u.name as user_name FROM reviews r LEFT JOIN users u ON r.user_id = u.id WHERE r.product_id = ? ORDER BY r.created_at DESC`, [req.params.id]);
  const avg = get('SELECT AVG(rating) as avg_rating FROM reviews WHERE product_id = ?', [req.params.id]);
  res.json({ reviews, average_rating: avg ? avg.avg_rating : null });
});

module.exports = router;
