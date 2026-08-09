const express = require('express');
const { all, get, query } = require('../db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

const stripe = process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_') && !process.env.STRIPE_SECRET_KEY.includes('placeholder')
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

router.get('/checkout', authenticate, (req, res) => {
  const items = all('SELECT c.quantity, p.id as product_id, p.name, p.price, p.image FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?', [req.user.id]);
  if (!items.length) return res.redirect('/cart');
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  res.render('checkout', {
    title: 'Checkout',
    items,
    total,
    stripeKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
  });
});

router.post('/payment/api/create-payment-intent', authenticate, async (req, res) => {
  const { shipping_address } = req.body;
  const cartItems = all('SELECT c.quantity, p.id, p.price, p.name FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?', [req.user.id]);
  if (!cartItems.length) return res.status(400).json({ error: 'Cart is empty' });
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (stripe) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: 'inr',
        metadata: { user_id: String(req.user.id) }
      });
      const orderResult = query('INSERT INTO orders (user_id, total, payment_status, shipping_address) VALUES (?, ?, ?, ?)', [req.user.id, total, 'pending', shipping_address || '']);
      const orderId = orderResult.lastInsertRowid;
      for (const item of cartItems) {
        query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, item.id, item.quantity, item.price]);
        query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
      }
      query('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
      query('INSERT INTO transactions (order_id, stripe_payment_intent_id, amount, status) VALUES (?, ?, ?, ?)', [orderId, paymentIntent.id, total, 'pending']);
      res.json({ clientSecret: paymentIntent.client_secret, order_id: orderId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const orderResult = query('INSERT INTO orders (user_id, total, payment_status, shipping_address) VALUES (?, ?, ?, ?)', [req.user.id, total, 'paid', shipping_address || '']);
    const orderId = orderResult.lastInsertRowid;
    for (const item of cartItems) {
      query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [orderId, item.id, item.quantity, item.price]);
      query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
    }
    query('DELETE FROM cart WHERE user_id = ?', [req.user.id]);
    query('INSERT INTO transactions (order_id, amount, status) VALUES (?, ?, ?)', [orderId, total, 'completed']);
    res.json({ success: true, order_id: orderId, message: 'Payment processed (demo mode)' });
  }
});

router.post('/payment/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(200).json({ received: true });
  let event;
  try {
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder');
  } catch { return res.status(400).send('Webhook Error'); }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const transaction = get('SELECT order_id FROM transactions WHERE stripe_payment_intent_id = ?', [paymentIntent.id]);
    if (transaction) {
      query('UPDATE orders SET payment_status = ?, status = ? WHERE id = ?', ['paid', 'confirmed', transaction.order_id]);
      query('UPDATE transactions SET status = ? WHERE stripe_payment_intent_id = ?', ['completed', paymentIntent.id]);
    }
  }
  res.json({ received: true });
});

module.exports = router;
