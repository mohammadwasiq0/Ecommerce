# LLD — Low Level Design

## ZainulHub E-Commerce Platform

---

## 1. Module / Class Design

ZainulHub uses a **flat route-based architecture** with middleware for auth and a single `db.js` module wrapping sql.js for all database access. No layered service/repository pattern — each route file contains its own logic.

### 1.1 Directory Structure

```
.
├── server.js                # Entry point — Express app & route mounting
├── db.js                    # sql.js init, query helpers (query/get/all), seed data
├── ecommerce.db             # SQLite database file (auto-created)
├── middleware/
│   └── auth.js              # JWT verify from cookie or Authorization header
├── routes/
│   ├── auth.js              # Login, signup, logout, session check
│   ├── products.js          # Product listing (SSR + JSON API), reviews, admin CRUD
│   ├── cart.js              # Cart CRUD (JSON API + SSR)
│   ├── orders.js            # Order creation, listing, tracking, PDF invoice
│   ├── payment.js           # Checkout page, Stripe PaymentIntent, webhook, demo mode
│   ├── chatbot.js           # Chat API (canned + LLM fallback), history
│   └── admin.js             # Dashboard, order management, CSV exports, revenue chart
├── views/
│   ├── header.ejs           # Shared header partial
│   ├── footer.ejs           # Shared footer partial
│   ├── index.ejs            # Homepage (featured products + categories)
│   ├── login.ejs            # Login page
│   ├── signup.ejs           # Signup page
│   ├── products.ejs         # Product listing / search results
│   ├── product.ejs          # Product detail page
│   ├── cart.ejs             # Shopping cart page
│   ├── checkout.ejs         # Checkout with Stripe Elements
│   ├── orders.ejs           # Order history page
│   ├── track-order.ejs      # Public order tracking page
│   ├── profile.ejs          # User profile page
│   └── admin.ejs            # Admin dashboard (stats, charts, tables, modals)
├── public/
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── docs/
│   └── LLD.md               # This document
├── .env                     # Environment variables
├── package.json
└── README.md
```

---

## 2. Database Schema (Full Column Definitions)

### 2.1 users
```sql
CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    UNIQUE NOT NULL,
    password   TEXT    NOT NULL,
    role       TEXT    DEFAULT 'customer',
    image      TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 categories
```sql
CREATE TABLE IF NOT EXISTS categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT    UNIQUE NOT NULL,
    slug TEXT    UNIQUE NOT NULL
);
```

### 2.3 products
```sql
CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    slug        TEXT    UNIQUE NOT NULL,
    description TEXT,
    price       REAL    NOT NULL,
    image       TEXT,
    category_id INTEGER,
    stock       INTEGER DEFAULT 0,
    featured    INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### 2.4 cart
```sql
CREATE TABLE IF NOT EXISTS cart (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity   INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 2.5 orders
```sql
CREATE TABLE IF NOT EXISTS orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL,
    total            REAL    NOT NULL,
    status           TEXT    DEFAULT 'pending',
    payment_method   TEXT,
    payment_status   TEXT    DEFAULT 'unpaid',
    shipping_address TEXT,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 2.6 order_items
```sql
CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity   INTEGER NOT NULL,
    price      REAL    NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 2.7 transactions
```sql
CREATE TABLE IF NOT EXISTS transactions (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id                INTEGER NOT NULL,
    stripe_payment_intent_id TEXT,
    amount                  REAL    NOT NULL,
    currency                TEXT    DEFAULT 'inr',
    status                  TEXT    NOT NULL,
    created_at              DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

### 2.8 chatbot_conversations
```sql
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    session_id TEXT    NOT NULL,
    role       TEXT    NOT NULL,
    content    TEXT    NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 2.9 reviews
```sql
CREATE TABLE IF NOT EXISTS reviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    rating     INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment    TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

---

## 3. API Contract — Request / Response Examples

### 3.1 Auth

#### POST /api/signup
```json
// Request
{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
}

// Response 200
{
    "success": true,
    "token": "<jwt_token>"
}

// Response 400
{ "error": "All fields required" }

// Response 400
{ "error": "Email already registered" }
```

#### POST /api/login
```json
// Request
{
    "email": "john@example.com",
    "password": "SecurePass123!"
}

// Response 200
{
    "success": true,
    "token": "<jwt_token>",
    "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "customer" }
}
// Sets HTTP-only cookie: token=<jwt>; HttpOnly; Path=/; Max-Age=604800

// Response 401
{ "error": "Invalid credentials" }
```

#### POST /api/logout
```json
// Response 200
{ "success": true }
// Clears token cookie
```

#### GET /api/me
```json
// Response 200 (authenticated)
{ "user": { "id": 1, "name": "John Doe", "email": "john@example.com", "role": "customer", "created_at": "..." } }

// Response 200 (unauthenticated)
{ "user": null }
```

### 3.2 Products

#### GET /products/api
```json
// Query: ?search=wireless&category=electronics&featured=1&limit=10
// Response 200 — returns direct array (no { success, data } wrapper)
[
    {
        "id": 1,
        "name": "Wireless Headphones",
        "slug": "wireless-headphones",
        "price": 10999,
        "image": "https://images.unsplash.com/...",
        "category_id": 1,
        "stock": 50,
        "featured": 1,
        "category_name": "Electronics",
        "created_at": "..."
    }
]
```

#### GET /products/:slug
```json
// SSR route — renders product.ejs
// No JSON response; page data: product, related[], categories[]
```

#### POST /api/admin/products (Admin)
```json
// Request
{
    "name": "Wireless Headphones",
    "description": "Premium noise-cancelling...",
    "price": 10999,
    "image": "https://...",
    "category_id": 1,
    "stock": 50,
    "featured": 1
}

// Response 200
{ "success": true, "id": 25 }
```

#### PUT /api/admin/products/:id (Admin)
```json
// Request (same body as POST)
// Response 200
{ "success": true }
```

#### DELETE /api/admin/products/:id (Admin)
```json
// Response 200
{ "success": true }
```

#### GET /products/api/reviews/:productId
```json
// Response 200
{
    "reviews": [
        { "id": 1, "user_id": 1, "product_id": 1, "rating": 5, "comment": "Great!", "user_name": "John Doe", "created_at": "..." }
    ],
    "average_rating": 4.5
}
```

#### POST /products/api/reviews
```json
// Request
{ "product_id": 1, "rating": 5, "comment": "Excellent product!" }

// Response 201
{ "success": true }

// Response 400
{ "error": "Product ID and rating (1-5) required" }
```

### 3.3 Cart

#### GET /cart/api
```json
// Response 200
{
    "items": [
        {
            "id": 1,
            "quantity": 2,
            "product_id": 1,
            "name": "Wireless Headphones",
            "price": 10999,
            "image": "https://...",
            "stock": 50
        }
    ],
    "total": 21998,
    "count": 2
}
```

#### POST /cart/api/add
```json
// Request
{ "product_id": 1, "quantity": 2 }

// Response 200
{ "success": true, "count": 3 }

// Response 404
{ "error": "Product not found" }
```

#### PUT /cart/api/update/:id
```json
// Request
{ "quantity": 3 }

// Response 200
{ "success": true }
```

#### DELETE /cart/api/remove/:id
```json
// Response 200
{ "success": true, "count": 0 }
```

### 3.4 Orders

#### POST /orders/api/create
```json
// Request
{ "payment_method": "card", "shipping_address": "123 Main St, Springfield" }

// Response 200
{ "success": true, "order_id": 1, "total": 21998 }

// Response 400
{ "error": "Cart is empty" }
```

#### GET /orders/api
```json
// Response 200 — direct array
[
    {
        "id": 1,
        "user_id": 1,
        "total": 21998,
        "status": "pending",
        "payment_method": "card",
        "payment_status": "unpaid",
        "shipping_address": "123 Main St",
        "created_at": "...",
        "items_summary": "Wireless Headphones x2, Smart Watch Pro x1"
    }
]
```

#### GET /orders/api/:id
```json
// Response 200
{
    "id": 1,
    "total": 21998,
    "status": "pending",
    "payment_method": "card",
    "payment_status": "paid",
    "shipping_address": "...",
    "items": [ { "id": 1, "order_id": 1, "product_id": 1, "quantity": 2, "price": 10999, "name": "Wireless Headphones", "image": "..." } ],
    "transaction": { "id": 1, "order_id": 1, "stripe_payment_intent_id": "pi_...", "amount": 21998, "currency": "inr", "status": "completed" }
}

// Response 404
{ "error": "Order not found" }
```

#### GET /orders/api/track/:id
```json
// Public endpoint (no auth required)
// Same response format as GET /orders/api/:id

// Response 404
{ "error": "Order not found" }
```

#### GET /orders/:id/invoice
```json
// Response 200 (Content-Type: application/pdf)
// Binary PDF stream — invoice-ZNHB-{order.id}.pdf
// Currency: INR (₹)
```

### 3.5 Admin

#### GET /admin/api/orders
```json
// Response 200 — direct array
[
    {
        "id": 1,
        "user_id": 1,
        "total": 21998,
        "status": "pending",
        "payment_method": "card",
        "payment_status": "paid",
        "shipping_address": "...",
        "user_name": "John Doe",
        "created_at": "..."
    }
]
```

#### PUT /admin/api/orders/:id/status
```json
// Request
{ "status": "shipped", "payment_status": "paid" }

// Response 200
{ "success": true }
```

#### GET /admin/api/export/users
```json
// Response 200 (Content-Type: text/csv)
// Attachment: users.csv
// Columns: ID,Name,Email,Role,Created At
```

#### GET /admin/api/export/products
```json
// Response 200 (Content-Type: text/csv)
// Attachment: products.csv
// Columns: ID,Name,Price (INR),Category,Stock,Featured
```

#### GET /admin/api/export/orders
```json
// Response 200 (Content-Type: text/csv)
// Attachment: orders.csv
// Columns: Order ID,Customer,Total (INR),Status,Payment Status,Created At
```

#### GET /admin/api/revenue-chart
```json
// Response 200 — direct array
[
    { "month": "2026-01", "revenue": 50000, "orders_count": 12 }
]
```

### 3.6 Chatbot

#### POST /api/chat
```json
// Request
{
    "session_id": "abc123-session",
    "message": "What is the return policy?"
}

// Response 200
{
    "reply": "We offer 30-day hassle-free returns on all items...",
    "session_id": "abc123-session"
}

// Response 400
{ "error": "Message required" }
```

#### GET /api/chat/history?session_id=abc123-session
```json
// Response 200 — direct array
[
    { "role": "user", "content": "What is the return policy?", "created_at": "..." },
    { "role": "assistant", "content": "We offer 30-day hassle-free returns...", "created_at": "..." }
]
// Returns empty array if no session_id provided
```

### 3.7 Payment

#### POST /payment/api/create-payment-intent
```json
// Request
{ "shipping_address": "123 Main St, Springfield" }

// Response 200 (Stripe mode)
{
    "clientSecret": "pi_3ABC..._secret_xyz...",
    "order_id": 1
}

// Response 200 (Demo mode — no Stripe key configured)
{
    "success": true,
    "order_id": 1,
    "message": "Payment processed (demo mode)"
}

// Response 400
{ "error": "Cart is empty" }
```

#### POST /payment/api/webhook
```json
// Request (raw Stripe webhook body)
{
    "type": "payment_intent.succeeded",
    "data": { "object": { "id": "pi_3ABC...", "amount": 2199800, "currency": "inr" } }
}

// Response 200
{ "received": true }
```

---

## 4. Middleware Design

### 4.1 Auth Middleware (`middleware/auth.js`)

```javascript
/**
 * Verifies JWT from cookie (req.cookies.token) or Authorization header (Bearer token).
 * On success: attaches req.user = { id, name, email, role }, sets res.locals.user
 * On failure: returns 401 JSON for API/XHR requests, redirects to /login for page requests
 */
const authenticate = (req, res, next) => {
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
};
```

### 4.2 Optional Auth (`optionalAuth`)

```javascript
/**
 * Attempts to decode JWT from cookie but does not fail if absent/invalid.
 * Sets req.user and res.locals.user if token is valid.
 * Always calls next() — used for routes that work for both guests and logged-in users.
 */
const optionalAuth = (req, res, next) => {
    const token = req.cookies?.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            res.locals.user = decoded;
        } catch { /* ignore */ }
    }
    next();
};
```

### 4.3 Admin Middleware (`adminOnly`)

```javascript
/**
 * Must be used AFTER authenticate.
 * Checks if req.user.role === 'admin'.
 * Returns 403 JSON for API/XHR, redirects to / for page requests.
 */
const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        if (req.xhr || req.path.startsWith('/api/')) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        return res.redirect('/');
    }
    next();
};
```

---

## 5. Component Interactions

### 5.1 Request Lifecycle

```
HTTP Request
    │
    ▼
express.json() / express.urlencoded() / cookie-parser() / express.static()
    │
    ▼
Global middleware (sets res.locals.path, tries JWT from cookie for res.locals.user)
    │
    ▼
authenticate (if route is protected — e.g., /cart, /orders, /api/admin/*)
    │
    ▼
adminOnly (if admin route — e.g., /admin, /api/admin/*)
    │
    ▼
Route handler (inline logic — reads/writes DB via db.query/get/all)
    │
    ▼
res.json() or res.render('view', data)
```

### 5.2 Route Dependency Graph

```
server.js
  ├── routes/auth.js        → db (query, get)
  ├── routes/products.js    → db, middleware/auth
  ├── routes/cart.js        → db, middleware/auth
  ├── routes/orders.js      → db, middleware/auth, pdfkit
  ├── routes/payment.js     → db, middleware/auth, stripe (optional)
  ├── routes/chatbot.js     → db, middleware/auth, axios
  └── routes/admin.js       → db, middleware/auth
```

---

## 6. Chatbot Integration Design

### 6.1 Architecture

```
Chatbot Widget (EJS partial — embedded in header.ejs)
    │ POST /api/chat { message, session_id }
    ▼
chatbot.js route handler
    │
    ├── 1. Generate session_id if not provided
    ├── 2. Save user message to chatbot_conversations
    ├── 3. Match against canned responses (keyword-based scoring)
    │      └── If match found → return canned reply immediately
    ├── 4. If no canned match → call LLM API via axios:
    │      ├── Load last 10 messages from conversation history
    │      ├── Build messages array: [system, ...history, user_message]
    │      ├── POST to CHATBOT_API_URL with:
    │      │     model: CHATBOT_MODEL (default gpt-4o-mini)
    │      │     messages, max_tokens: 300, temperature: 0.7
    │      │     Authorization: Bearer CHATBOT_API_KEY
    │      └── If API succeeds → save + return LLM response
    ├── 5. If LLM call fails → pick random fallback from array of 5 generic replies
    ├── 6. Save assistant response to DB
    └── 7. Return { reply, session_id }
```

### 6.2 Canned Response System

19 keyword groups covering: greetings, products, orders, returns, pricing, payment, support, shipping, categories (electronics, clothing, books, sports, etc.). Each entry has a `keywords` array and a `reply` string. Scoring is based on how many keywords appear in the user's message; the highest-scoring match wins. If no keywords match, the LLM API is called.

### 6.3 Environment Variables

```
CHATBOT_API_URL=https://api.openai.com/v1/chat/completions
CHATBOT_API_KEY=sk-...
CHATBOT_MODEL=gpt-4o-mini
```

---

## 7. Payment Gateway Integration Design

### 7.1 Checkout Flow

```
1. Checkout Page Load
   └── GET /checkout (authenticated)
       ├── Fetch cart items from DB
       ├── Calculate total
       └── Render checkout.ejs with Stripe publishable key

2. Customer Submits Payment
   └── POST /payment/api/create-payment-intent { shipping_address }
       ├── If Stripe is configured (STRIPE_SECRET_KEY starts with sk_):
       │   ├── Create Stripe PaymentIntent (amount in paise, currency: inr)
       │   ├── Create order (status: pending, payment_status: pending)
       │   ├── Insert order_items, deduct stock
       │   ├── Clear cart
       │   ├── Insert transaction record (status: pending)
       │   └── Return { clientSecret, order_id }
       └── If Stripe is NOT configured (demo mode):
           ├── Create order (status: pending, payment_status: paid)
           ├── Insert order_items, deduct stock
           ├── Clear cart
           ├── Insert transaction (status: completed)
           └── Return { success, order_id, message: "Payment processed (demo mode)" }

3. Stripe Webhook (Server)
   └── POST /payment/api/webhook
       ├── Verify signature with stripe.webhooks.constructEvent()
       ├── Handle event: payment_intent.succeeded
       │   ├── Look up transaction by stripe_payment_intent_id
       │   ├── Update order: payment_status → 'paid', status → 'confirmed'
       │   └── Update transaction: status → 'completed'
       └── Return { received: true }
```

### 7.2 Stripe Configuration

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

If `STRIPE_SECRET_KEY` is missing, starts with a placeholder, or does not start with `sk_`, the entire `stripe` variable is `null` and the app runs in demo mode (instant payment without real Stripe processing).

---

## 8. PDF Generation Design

### 8.1 Implementation (PDFKit — inline in `routes/orders.js`)

```javascript
// Inside GET /orders/:id/invoice
const doc = new PDFDocument({ margin: 50 });
doc.pipe(res);

// Header bar (indigo #6366f1) with store name
doc.rect(0, 0, 612, 130).fill('#6366f1');
doc.fillColor('#ffffff').fontSize(36).font('Helvetica-Bold').text('ZAINULHUB', 50, 35);
doc.fontSize(12).font('Helvetica').fillColor('#e0e7ff').text('Premium E-Commerce Store', 50, 80);

// Invoice number: INVOICE #ZNHB-{order.id}
doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a1a2e').text(`INVOICE #ZNHB-${order.id}`, 50, 160);
// Date: en-IN locale
// Status: color-coded badge (green for completed, red for cancelled, amber for pending)

// Bill To section: user name, email, shipping address

// Items table with alternating row colors
// Columns: #, Item Description, Qty, Unit Price (₹), Total (₹)
// Prices formatted with en-IN locale (e.g., ₹10,999.00)

// Totals section:
//   Subtotal, Shipping (FREE if > ₹2,999 else ₹199), Payment method, Transaction ID
//   GRAND TOTAL in large bold font

// Footer: "Thank you for your business!" with brand name
```

Currency: All amounts displayed in ₹ (Indian Rupees) with `en-IN` locale formatting.

### 8.2 Invoice File Storage

- Invoices are generated on-the-fly when the user requests download via `GET /orders/:id/invoice`.
- No disk caching — PDF is streamed directly to the response.
- Filename format: `invoice-ZNHB-{order.id}.pdf`
- Accessible by the order owner or any admin user.

---

*Document version 2.0 — Last updated July 2026*
