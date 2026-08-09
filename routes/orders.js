const express = require('express');
const { all, get, query } = require('../db');
const { authenticate } = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const router = express.Router();

router.get('/orders', authenticate, (req, res) => {
  const orders = all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  const ordersWithItems = orders.map(o => {
    const items = all('SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [o.id]);
    return { ...o, items };
  });
  res.render('orders', { title: 'My Orders', orders: ordersWithItems });
});

router.get('/orders/api', authenticate, (req, res) => {
  const orders = all(`SELECT o.*, GROUP_CONCAT(p.name || ' x' || oi.quantity, ', ') as items_summary
    FROM orders o 
    LEFT JOIN order_items oi ON o.id = oi.order_id 
    LEFT JOIN products p ON oi.product_id = p.id 
    WHERE o.user_id = ? 
    GROUP BY o.id 
    ORDER BY o.created_at DESC`, [req.user.id]);
  res.json(orders);
});

router.get('/orders/api/:id', authenticate, (req, res) => {
  const order = get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = all('SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [order.id]);
  const transaction = get('SELECT * FROM transactions WHERE order_id = ?', [order.id]);
  res.json({ ...order, items, transaction });
});

router.post('/orders/api/create', authenticate, (req, res) => {
  const { payment_method, shipping_address } = req.body;
  const cartItems = all('SELECT c.quantity, p.id, p.price, p.name FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?', [req.user.id]);
  if (!cartItems.length) return res.status(400).json({ error: 'Cart is empty' });

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const orderResult = query('INSERT INTO orders (user_id, total, payment_method, shipping_address) VALUES (?, ?, ?, ?)', [req.user.id, total, payment_method || 'card', shipping_address || '']);
  const orderId = orderResult.lastInsertRowid;

  for (const item of cartItems) {
    query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, item.id, item.quantity, item.price]);
  }

  query('DELETE FROM cart WHERE user_id = ?', [req.user.id]);

  res.json({ success: true, order_id: orderId, total });
});

router.get('/orders/track/:id', (req, res) => {
  const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).render('error', { title: 'Not Found', message: 'Order not found' });
  const items = all('SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [order.id]);
  res.render('track-order', { title: `Track Order #${order.id}`, order, items });
});

router.get('/orders/api/track/:id', (req, res) => {
  const order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = all('SELECT oi.*, p.name, p.image FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [order.id]);
  const transaction = get('SELECT * FROM transactions WHERE order_id = ?', [order.id]);
  res.json({ ...order, items, transaction });
});

router.get('/orders/:id/invoice', authenticate, (req, res) => {
  let order;
  if (req.user.role === 'admin') {
    order = get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  } else {
    order = get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  }
  if (!order) return res.status(404).send('Order not found');
  const items = all('SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [order.id]);
  const user = get('SELECT * FROM users WHERE id = ?', [order.user_id]);
  const transaction = get('SELECT * FROM transactions WHERE order_id = ?', [order.id]);

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-ZNHB-${order.id}.pdf`);
  doc.pipe(res);

  const pc = '#6366f1';
  const dc = '#1a1a2e';
  const lc = '#f8f8fb';
  const gc = '#64748b';
  const ml = 50;

  doc.rect(0, 0, 612, 130).fill(pc);
  doc.fillColor('#ffffff').fontSize(36).font('Helvetica-Bold').text('ZAINULHUB', ml, 35);
  doc.fontSize(12).font('Helvetica').fillColor('#e0e7ff').text('Premium E-Commerce Store', ml, 80);

  doc.fontSize(22).font('Helvetica-Bold').fillColor(dc).text(`INVOICE #ZNHB-${order.id}`, ml, 160);

  doc.fontSize(9).font('Helvetica').fillColor(gc);
  doc.text(`Date: ${new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}`, 380, 160, { align: 'right' });

  doc.text('Status: ', 380, 175, { continued: true, align: 'right' });
  const st = order.status || order.payment_status || 'pending';
  const sc = st === 'delivered' || st === 'paid' || st === 'completed' ? '#10b981' : st === 'cancelled' || st === 'refunded' ? '#ef4444' : '#f59e0b';
  doc.fillColor(sc).font('Helvetica-Bold').text(st.replace(/_/g, ' ').toUpperCase(), { align: 'right' });

  doc.moveDown(0.5);
  doc.fillColor(dc).fontSize(11).font('Helvetica-Bold').text('BILL TO', ml, 215);
  const by = 233;
  doc.fontSize(10).font('Helvetica').fillColor('#475569');
  doc.text(user.name, ml, by);
  doc.text(user.email, ml, by + 16);
  if (order.shipping_address) {
    doc.text(order.shipping_address, ml, by + 32);
  }

  let y = 290;
  doc.rect(ml, y, 512, 26).fill(pc);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
  doc.text('#', 58, y + 7, { width: 24, align: 'center' });
  doc.text('Item Description', 88, y + 7, { width: 220 });
  doc.text('Qty', 318, y + 7, { width: 45, align: 'center' });
  doc.text('Unit Price (\u20B9)', 370, y + 7, { width: 85, align: 'right' });
  doc.text('Total (\u20B9)', 465, y + 7, { width: 85, align: 'right' });
  y += 30;

  doc.font('Helvetica').fontSize(9);
  if (items.length === 0) {
    doc.fillColor(gc).text('No items found for this order.', ml, y + 6, { width: 500 });
    y += 24;
  } else {
    items.forEach((item, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : lc;
      doc.rect(ml, y, 512, 24).fill(bg);
      doc.fillColor(gc).text(String(i + 1), 58, y + 6, { width: 24, align: 'center' });
      doc.fillColor(dc).text(item.name, 88, y + 6, { width: 220 });
      doc.fillColor('#334155').text(String(item.quantity), 318, y + 6, { width: 45, align: 'center' });
      doc.text(`\u20B9${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 370, y + 6, { width: 85, align: 'right' });
      doc.font('Helvetica-Bold').fillColor(dc).text(`\u20B9${(item.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 465, y + 6, { width: 85, align: 'right' });
      doc.font('Helvetica').fillColor('#334155');
      y += 24;
    });
  }

  const shipping = order.total > 2999 ? 0 : 199;
  const grandTotal = order.total + shipping;
  const sx = 360;
  y += 14;

  doc.fontSize(9).font('Helvetica').fillColor(gc);
  doc.text('Subtotal:', sx, y, { width: 95 });
  doc.text(`\u20B9${order.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sx + 95, y, { width: 95, align: 'right' });

  y += 16;
  doc.text('Shipping:', sx, y, { width: 95 });
  if (shipping === 0) {
    doc.fillColor('#10b981').font('Helvetica-Bold').text('FREE', sx + 95, y, { width: 95, align: 'right' });
  } else {
    doc.fillColor(gc).font('Helvetica').text(`\u20B9${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sx + 95, y, { width: 95, align: 'right' });
  }

  y += 16;
  if (order.payment_method) {
    doc.fillColor(gc).font('Helvetica').text('Payment:', sx, y, { width: 95 });
    doc.fillColor(dc).font('Helvetica-Bold').text(order.payment_method.toUpperCase(), sx + 95, y, { width: 95, align: 'right' });
    y += 16;
  }

  if (transaction && transaction.payment_id) {
    doc.fillColor(gc).font('Helvetica').text('Txn ID:', sx, y, { width: 95 });
    doc.fillColor(dc).font('Helvetica').text(transaction.payment_id, sx + 95, y, { width: 95, align: 'right' });
    y += 16;
  }

  y += 4;
  doc.moveTo(sx, y - 2).lineTo(555, y - 2).lineWidth(1.5).stroke(pc);
  doc.fillColor(dc).font('Helvetica-Bold').fontSize(13);
  doc.text('GRAND TOTAL:', sx, y + 4, { width: 95 });
  doc.text(`\u20B9${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sx + 95, y + 4, { width: 95, align: 'right' });

  y += 40;
  doc.lineWidth(1.5).moveTo(ml, y).lineTo(562, y).stroke(pc);

  doc.fontSize(14).font('Helvetica-Bold').fillColor(pc).text('Thank you for your business!', ml, y + 22, { align: 'center', width: 500 });
  doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text('ZainulHub - Premium E-Commerce Store', ml, y + 42, { align: 'center', width: 500 });

  doc.end();
});

module.exports = router;
