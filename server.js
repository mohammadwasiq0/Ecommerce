require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const { initDb, all, get } = require('./db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals.path = req.path;
  res.locals.user = null;
  const token = req.cookies?.token;
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      res.locals.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch { /*ignore*/ }
  }
  next();
});

app.use(require('./routes/auth'));
app.use(require('./routes/products'));
app.use(require('./routes/cart'));
app.use(require('./routes/orders'));
app.use(require('./routes/payment'));
app.use(require('./routes/chatbot'));
app.use(require('./routes/admin'));

app.get('/', (req, res) => {
  const featured = all('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.featured = 1 LIMIT 8');
  const categories = all('SELECT * FROM categories');
  res.render('index', { title: 'ZainulHub — Modern E-Commerce', featured, categories });
});

app.get('/profile', require('./middleware/auth').authenticate, (req, res) => {
  const user = get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
  const orderCount = get('SELECT COUNT(*) as count FROM orders WHERE user_id = ?', [req.user.id]);
  res.render('profile', { title: 'My Profile', profile: user, orderCount: orderCount.count });
});

async function start() {
  await initDb();
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
start();
