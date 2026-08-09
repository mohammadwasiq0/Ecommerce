const express = require('express');
const { query, all } = require('../db');
const { optionalAuth } = require('../middleware/auth');
const router = express.Router();

const cannedResponses = [
  { keywords: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'namaste'], reply: 'Namaste! 🙏 Welcome to ZainulHub! I\'m your AI shopping assistant. How can I help you today? You can ask about products, orders, shipping, or anything else!' },
  { keywords: ['product', 'recommend', 'suggest', 'buy', 'looking for', 'gift'], reply: 'We have 50+ amazing products across Electronics, Clothing, Home & Garden, Books, and Sports categories. What kind of product are you looking for? I can recommend the perfect item for you!' },
  { keywords: ['order', 'track', 'delivery', 'shipping', 'status', 'where is my'], reply: 'You can track your order anytime from the Orders page in your account. Need help with a specific order? Share your order number and I\'ll help you out!' },
  { keywords: ['return', 'refund', 'cancel', 'exchange', 'replace'], reply: 'We offer 30-day hassle-free returns on all items. Visit your Orders page, select the item, and click Return. Refunds are processed within 5-7 business days after we receive the item.' },
  { keywords: ['price', 'cost', 'discount', 'sale', 'offer', 'deal', 'cheap'], reply: 'We have amazing deals across all categories! Check our Shop page for the latest discounts. Pro tip: Featured items often have special pricing!' },
  { keywords: ['payment', 'pay', 'card', 'secure', 'upi', 'wallet'], reply: 'We accept all major credit/debit cards and offer 256-bit SSL encrypted checkout. Your payment information is always 100% secure with us.' },
  { keywords: ['contact', 'support', 'help', 'human', 'agent', 'speak'], reply: 'Need to talk to a human? Email us at support@zainulhub.com or call us at 1800-ZAINUL. We\'re here 24/7 to help you!' },
  { keywords: ['shipping', 'free shipping', 'delivery time', 'dispatch', 'when will'], reply: 'Free shipping on orders over ₹2,999! Standard delivery: 3-7 business days. Express shipping available at checkout (1-2 business days).' },
  { keywords: ['return policy', 'warranty', 'guarantee'], reply: 'Every product comes with a minimum 6-month warranty. Our 30-day return policy means you can shop with complete confidence. Quality guaranteed!' },
  { keywords: ['iphone', 'mobile', 'phone', 'smartphone', 'charger', 'earphone'], reply: 'Check out our Electronics section! We have wireless headphones, smartwatches, Bluetooth speakers, and more. All at the best prices in India!' },
  { keywords: ['clothes', 'shirt', 'jeans', 'fashion', 'wear', 'dress', 'ethnic'], reply: 'Our Clothing collection has something for everyone! From organic cotton tees to denim jackets, aviator sunglasses to fleece hoodies. Style yourself!' },
  { keywords: ['book', 'read', 'programming', 'novel', 'fiction'], reply: 'Book lovers, rejoice! We have JavaScript guides, Clean Code, and more. Perfect for developers and avid readers alike!' },
  { keywords: ['sports', 'gym', 'fitness', 'exercise', 'workout', 'yoga'], reply: 'Stay fit with our Sports collection! Premium yoga mats, running shoes, fitness trackers, and more. Your fitness journey starts here!' }
];

function findCannedReply(message) {
  const lower = message.toLowerCase();
  const scores = cannedResponses.map(entry => ({
    entry,
    score: entry.keywords.reduce((sum, kw) => sum + (lower.includes(kw) ? 1 : 0), 0)
  }));
  const best = scores.reduce((a, b) => a.score > b.score ? a : b);
  return best.score > 0 ? best.entry.reply : null;
}

router.post('/api/chat', optionalAuth, async (req, res) => {
  const { message, session_id } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const sid = session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const userId = req.user?.id || null;

  query('INSERT INTO chatbot_conversations (user_id, session_id, role, content) VALUES (?, ?, ?, ?)', [userId, sid, 'user', message]);

  const canned = findCannedReply(message);
  if (canned) {
    query('INSERT INTO chatbot_conversations (user_id, session_id, role, content) VALUES (?, ?, ?, ?)', [userId, sid, 'assistant', canned]);
    return res.json({ reply: canned, session_id: sid });
  }

  try {
    const axios = require('axios');

    const recentHistory = all(
      'SELECT role, content FROM chatbot_conversations WHERE session_id = ? ORDER BY created_at ASC LIMIT 10',
      [sid]
    );

    const messages = [
      {
        role: 'system',
        content: `You are Zainul, an AI shopping assistant for ZainulHub, an Indian e-commerce store. All prices are in INR (₹). Available categories: Electronics, Clothing, Home & Garden, Books, Sports. Be friendly, concise, and helpful. Current date: ${new Date().toISOString().split('T')[0]}.`
      },
      ...recentHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const payload = {
      model: process.env.CHATBOT_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: 300,
      temperature: 0.7
    };

    const response = await axios.post(process.env.CHATBOT_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CHATBOT_API_KEY}`
      },
      timeout: 20000
    });

    const reply = response.data?.choices?.[0]?.message?.content;
    if (reply) {
      query('INSERT INTO chatbot_conversations (user_id, session_id, role, content) VALUES (?, ?, ?, ?)', [userId, sid, 'assistant', reply]);
      return res.json({ reply, session_id: sid });
    }
    throw new Error('Empty response from API');
  } catch (err) {
    console.error('Chatbot API error:', err.response?.status, err.code, err.message);
    const fallbackReplies = [
      "That's a great question! I'd recommend checking out our featured products on the homepage — we have some amazing deals right now!",
      "I'd love to help with that! You can browse our categories: Electronics, Clothing, Home & Garden, Books, and Sports. Each has curated collections.",
      "Thanks for your patience! While I look into that, did you know we offer free shipping on orders over ₹2,999? And all products come with a 30-day return policy!",
      "Great question! Our top-selling items right now include Wireless Headphones, Smart Watch Pro, and our Premium Yoga Mat. All available with fast delivery!",
      "I'm here to help! You can also check your order status from your account dashboard, or browse our latest arrivals in the Shop section."
    ];
    const fallback = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    query('INSERT INTO chatbot_conversations (user_id, session_id, role, content) VALUES (?, ?, ?, ?)', [userId, sid, 'assistant', fallback]);
    res.json({ reply: fallback, session_id: sid });
  }
});

router.get('/api/chat/history', optionalAuth, (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.json([]);
  const history = all('SELECT role, content, created_at FROM chatbot_conversations WHERE session_id = ? ORDER BY created_at ASC', [session_id]);
  res.json(history);
});

module.exports = router;
