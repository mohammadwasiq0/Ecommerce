const express = require('express');
const { all, get, query } = require('../db');
const { authenticate, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/admin', authenticate, adminOnly, (req, res) => {
  const stats = {
    products: get('SELECT COUNT(*) as count FROM products').count,
    users: get('SELECT COUNT(*) as count FROM users').count,
    orders: get('SELECT COUNT(*) as count FROM orders').count,
    revenue: get("SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE payment_status = 'paid'").total,
    pendingOrders: get("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").count,
    avgOrderValue: get("SELECT COALESCE(AVG(total), 0) as avg FROM orders WHERE payment_status = 'paid'").avg,
    totalReviews: get('SELECT COUNT(*) as count FROM reviews').count
  };

  const topProducts = all(`SELECT p.name, p.price, SUM(oi.quantity) as total_sold, p.image 
    FROM order_items oi JOIN products p ON oi.product_id = p.id 
    JOIN orders o ON oi.order_id = o.id WHERE o.payment_status = 'paid' 
    GROUP BY oi.product_id ORDER BY total_sold DESC LIMIT 5`);
    
  const catDist = all(`SELECT c.name, COUNT(p.id) as count FROM categories c 
    LEFT JOIN products p ON p.category_id = c.id 
    GROUP BY c.id ORDER BY count DESC`);
    
  const ordersByStatus = all("SELECT status, COUNT(*) as count FROM orders GROUP BY status");
  
  const monthlyRevenue = all(`SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(total), 0) as revenue 
    FROM orders WHERE payment_status = 'paid' 
    AND created_at >= date('now', '-6 months') 
    GROUP BY month ORDER BY month ASC`);

  const recentOrders = all('SELECT o.*, u.name as user_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC LIMIT 10');
  const products = all('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC');
  const categories = all('SELECT * FROM categories');
  
  res.render('admin', { title: 'Admin Dashboard', stats, topProducts, catDist, ordersByStatus, monthlyRevenue, recentOrders, products, categories });
});

router.get('/admin/api/orders', authenticate, adminOnly, (req, res) => {
  const orders = all('SELECT o.*, u.name as user_name FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC');
  res.json(orders);
});

router.put('/admin/api/orders/:id/status', authenticate, adminOnly, (req, res) => {
  const { status, payment_status } = req.body;
  if (status) query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
  if (payment_status) query('UPDATE orders SET payment_status = ? WHERE id = ?', [payment_status, req.params.id]);
  res.json({ success: true });
});

router.get('/admin/api/export/users', authenticate, adminOnly, (req, res) => {
  const users = all('SELECT id, name, email, role, created_at FROM users ORDER BY id');
  let csv = 'ID,Name,Email,Role,Created At\n';
  for (const u of users) {
    csv += `${u.id},"${u.name}","${u.email}",${u.role},${u.created_at}\n`;
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
  res.send(csv);
});

router.get('/admin/api/export/products', authenticate, adminOnly, (req, res) => {
  const products = all('SELECT p.id, p.name, p.price, c.name as category, p.stock, p.featured FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.id');
  let csv = 'ID,Name,Price (INR),Category,Stock,Featured\n';
  for (const p of products) {
    csv += `${p.id},"${p.name}",${p.price},"${p.category || ''}",${p.stock},${p.featured}\n`;
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
  res.send(csv);
});

router.get('/admin/api/export/orders', authenticate, adminOnly, (req, res) => {
  const orders = all('SELECT o.id, u.name as customer, o.total, o.status, o.payment_status, o.created_at FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.id');
  let csv = 'Order ID,Customer,Total (INR),Status,Payment Status,Created At\n';
  for (const o of orders) {
    csv += `${o.id},"${o.customer}",${o.total},${o.status},${o.payment_status},${o.created_at}\n`;
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
  res.send(csv);
});

router.get('/admin/api/revenue-chart', authenticate, adminOnly, (req, res) => {
  const data = all(`SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(total), 0) as revenue,
    COUNT(*) as orders_count FROM orders WHERE payment_status = 'paid' 
    AND created_at >= date('now', '-6 months') 
    GROUP BY month ORDER BY month ASC`);
  res.json(data);
});

module.exports = router;
