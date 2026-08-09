# ARCHITECTURE — System Architecture

## ZainulHub E-Commerce Platform

---

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                      │
│                                                                             │
│   ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────────┐   │
│   │   Browser        │  │   Stripe.js      │  │   Chatbot Widget       │   │
│   │   (EJS Views)    │  │   (Elements)     │  │   (Vanilla JS)        │   │
│   │   /products      │  │   /checkout      │  │   Floating chat icon  │   │
│   │   /cart          │  │   Card input     │  │   Canned + LLM replies │   │
│   │   /orders        │  │   Payment form   │  │   Conversation history │   │
│   └────────┬─────────┘  └────────┬─────────┘  └───────────┬─────────────┘   │
│            │                     │                        │                 │
└────────────┼─────────────────────┼────────────────────────┼─────────────────┘
             │                     │                        │
             │   HTTP (HTML/JSON)  │   Stripe.js SDK        │   HTTP (JSON)
             ▼                     ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                   │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    Express Web Server (Node.js)                     │   │
│   │                                                                     │   │
│   │   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐  │   │
│   │   │ Auth      │  │ Product   │  │ Cart      │  │ Order         │  │   │
│   │   │ Route     │  │ Route     │  │ Route     │  │ Route         │  │   │
│   │   │ (inline)  │  │ (inline)  │  │ (inline)  │  │ (inline)      │  │   │
│   │   └───────────┘  └───────────┘  └───────────┘  └───────────────┘  │   │
│   │   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐  │   │
│   │   │ Payment   │  │ Chatbot   │  │ Admin     │  │ Middleware    │  │   │
│   │   │ Route     │  │ Route     │  │ Route     │  │ Pipeline      │  │   │
│   │   │ (inline)  │  │ (inline)  │  │ (inline)  │  │ auth.js       │  │   │
│   │   └───────────┘  └───────────┘  └───────────┘  └───────────────┘  │   │
│   │                                                                     │   │
│   │   Business logic lives inline in route handlers — no separate       │   │
│   │   service, controller, or validation modules.                       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                                        │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    sql.js (SQLite in WASM)                          │   │
│   │                    Single file: db.js                               │   │
│   │   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │   │
│   │   │ users    │ │categories│ │ products │ │ cart     │ │ orders │  │   │
│   │   └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘  │   │
│   │   ┌────────────┐ ┌──────────────┐ ┌────────────────────┐          │   │
│   │   │ order_items│ │ transactions │ │ chatbot_convers.   │          │   │
│   │   └────────────┘ └──────────────┘ └────────────────────┘          │   │
│   │   ┌────────────┐                                                  │   │
│   │   │  reviews   │                                                  │   │
│   │   └────────────┘                                                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL INTEGRATIONS                                │
│                                                                             │
│   ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐   │
│   │   Stripe API       │  │   LLM API          │  │   File System      │   │
│   │   - PaymentIntents │  │   (Euron/OpenAI    │  │   - Static assets  │   │
│   │   - Webhooks       │  │    Compat.)        │  │   - ecommerce.db   │   │
│   │   - Refunds        │  │   - Chat complet.  │  │                    │   │
│   └────────────────────┘  └────────────────────┘  └────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow Diagrams

### 2.1 User Browsing & Purchase Flow

```
User                    Express Server              sql.js             Stripe/LLM
 │                           │                       │                    │
 │  1. Browse /products      │                       │                    │
 │ ────────────────────────> │                       │                    │
 │                           │  2. SELECT * FROM     │                    │
 │                           │     products          │                    │
 │                           │ ────────────────────> │                    │
 │                           │ <──────────────────── │                    │
 │ <──────────────────────── │  3. Render products   │                    │
 │                           │                       │                    │
 │  4. View product detail   │                       │                    │
 │ ────────────────────────> │  5. SELECT product    │                    │
 │                           │     JOIN category     │                    │
 │                           │ ────────────────────> │                    │
 │                           │ <──────────────────── │                    │
 │ <──────────────────────── │  6. Render product    │                    │
 │                           │     detail            │                    │
 │                           │                       │                    │
 │  7. Add to cart           │                       │                    │
 │ ────────────────────────> │  8. UPSERT cart       │                    │
 │                           │ ────────────────────> │                    │
 │                           │ <──────────────────── │                    │
 │ <──────────────────────── │  9. JSON {count}      │                    │
 │                           │                       │                    │
 │  10. Checkout             │                       │                    │
 │ ────────────────────────> │ 11. Create Payment    │                    │
 │                           │     Intent            │ ─────────────────> │
 │                           │ <──────────────────── │                    │
 │ <──────────────────────── │ 12. {clientSecret}    │                    │
 │                           │                       │                    │
 │  13. Confirm payment      │                       │                    │
 │ (Stripe Elements)         │                       │                    │
 │ ───────────────────────────────────────────────────────────>           │
 │                           │                       │                    │
 │                           │ 14. Webhook:          │                    │
 │                           │     payment_intent    │ <──────────────── │
 │                           │     .succeeded        │                    │
 │                           │ 15. INSERT order      │                    │
 │                           │ ────────────────────> │                    │
 │                           │ 16. INSERT transaction│                    │
 │                           │ ────────────────────> │                    │
 │                           │ 17. DELETE cart items │                    │
 │                           │ ────────────────────> │                    │
 │                           │ 18. Generate PDF      │                    │
 │                           │     invoice           │                    │
 │ <──────────────────────── │ 19. Redirect to       │                    │
 │                           │     /orders           │                    │
```

### 2.2 Admin Flow

```
Admin                   Express Server              sql.js
 │                           │                       │
 │  1. GET /admin            │                       │
 │ ────────────────────────> │                       │
 │                           │  2. SELECT            │
 │                           │     aggregate queries │
 │                           │ ────────────────────> │
 │                           │ <──────────────────── │
 │ <──────────────────────── │  3. Render admin.ejs  │
 │                           │     (single page)     │
 │                           │                       │
 │  4. PUT /admin/api/       │                       │
 │     orders/:id/status     │                       │
 │ ────────────────────────> │  5. UPDATE orders     │
 │                           │     SET status        │
 │                           │ ────────────────────> │
 │                           │ <──────────────────── │
 │                           │                       │
 │  6. POST /api/admin/      │                       │
 │     products              │                       │
 │ ────────────────────────> │  7. INSERT INTO       │
 │                           │     products          │
 │                           │ ────────────────────> │
 │                           │ <──────────────────── │
 │ <──────────────────────── │  8. JSON response     │
```

### 2.3 Chatbot Flow

```
User                    Express Server              sql.js             LLM API
 │                           │                       │                    │
 │  1. POST /api/chat        │                       │                    │
 │     {message, session_id} │                       │                    │
 │ ────────────────────────> │                       │                    │
 │                           │  2. Check canned      │                    │
 │                           │     keyword matches   │                    │
 │                           │                       │                    │
 │                           │  [If canned hit]      │                    │
 │                           │  3. INSERT user msg   │                    │
 │                           │  4. INSERT bot reply  │                    │
 │                           │ ────────────────────> │                    │
 │ <──────────────────────── │  5. JSON {reply}      │                    │
 │                           │                       │                    │
 │                           │  [If no canned hit]   │                    │
 │                           │  6. SELECT history    │                    │
 │                           │     (last 10 msgs)    │                    │
 │                           │ ────────────────────> │                    │
 │                           │ <──────────────────── │                    │
 │                           │                       │                    │
 │                           │  7. Build prompt      │                    │
 │                           │     + context         │                    │
 │                           │                       │                    │
 │                           │  8. POST chat/        │                    │
 │                           │     completions       │ ─────────────────> │
 │                           │                       │ <───────────────── │
 │                           │                       │                    │
 │                           │  9. INSERT user msg   │                    │
 │                           │ 10. INSERT bot reply  │                    │
 │                           │ ────────────────────> │                    │
 │ <──────────────────────── │ 11. JSON {reply}      │                    │
 │                           │                       │                    │
 │                           │  [If LLM fails]       │                    │
 │                           │  Random fallback      │                    │
 │                           │  reply from pool      │                    │
```

---

## 3. Component Architecture

### 3.1 Presentation Components

| Component | File | Responsibility |
|---|---|---|
| Layout Shell | `header.ejs` + `footer.ejs` | Header is the opening `<html>`, `<head>`, `<body>`, `<nav>`, and `<main>` wrapper. Footer closes `</main>`, renders the footer, chatbot widget, and `</body></html>`. |
| Navbar | `header.ejs` (inline) | Logo, search form, nav links (Home, Shop, Cart), user dropdown (Profile, Orders, Admin if admin, Sign Out) or Sign In / Get Started links. Mobile hamburger menu. Includes `<script>` tag with `userLoggedIn` variable. |
| Footer | `footer.ejs` | Brand info, shop links, account links, support links, copyright, chatbot toggle button + widget, and `app.js` script tag. |
| Home Page | `index.ejs` | Hero section, featured products grid, category cards, newsletter signup (static promo). |
| Product Listing | `products.ejs` | Card grid with search bar, category filter sidebar, product cards with image/name/price/rating. |
| Product Detail | `product.ejs` | Full product info, image, price, stock status, description, add-to-cart button, reviews section. |
| Cart Page | `cart.ejs` | Line items with quantity controls, per-item remove, totals, checkout button. |
| Checkout | `checkout.ejs` | Shipping address form, Stripe Elements card element, order summary, pay button. |
| Order List | `orders.ejs` | Accordion-style order cards with items, status badges, invoice download links. |
| Track Order | `track-order.ejs` | Public order lookup by ID, shows status timeline and item list. |
| Admin Page | `admin.ejs` | Single-page admin dashboard with stats cards, charts, product/order management tables, modals for CRUD, CSV export buttons. |
| Auth Pages | `login.ejs`, `signup.ejs` | Login and registration forms with client-side validation. |
| Profile | `profile.ejs` | User info display, order count, account details. |
| Styles | `public/css/style.css` | Single custom CSS file (553 lines). Indigo/purple theme with CSS variables, responsive grid, glassmorphism cards. No framework (no Bootstrap/Tailwind). |
| Client JS | `public/js/app.js` | Single vanilla JS file (457 lines). Cart operations (add/update/remove/refresh badge), checkout (Stripe Elements integration with skeleton loading), chatbot (toggle, send message, history, typing indicator, auto-scroll), admin (stats counters, charts via inline SVG/Canvas, CRUD modals, CSV download, order status update, realtime clock). |

### 3.2 Application Components

| Component | File | Responsibility |
|---|---|---|
| Express App | `server.js` | App setup, middleware registration, route mounting, static files, JWT user injection to `res.locals`, home page route, profile route, async startup. |
| Database | `db.js` | Initialize sql.js WASM, create all tables (users, categories, products, cart, orders, order_items, transactions, chatbot_conversations, reviews), seed data (4 categories, 46 products, 2 users), expose `query()`, `get()`, `all()`, `saveDb()` helpers. |
| Auth Routes | `routes/auth.js` | `GET /login`, `GET /signup`, `POST /api/signup` (bcrypt hash + JWT sign), `POST /api/login` (verify + JWT sign), `POST /api/logout`, `GET /api/me`. All logic inline. |
| Product Routes | `routes/products.js` | `GET /products` (search, category, featured filters), `GET /products/api` (JSON), `GET /products/:slug` (detail + related), `POST /api/admin/products`, `PUT /api/admin/products/:id`, `DELETE /api/admin/products/:id`, `GET /products/api/reviews/:productId`, `POST /products/api/reviews`, `GET /products/api/:id/reviews`. |
| Cart Routes | `routes/cart.js` | `GET /cart/api` (JSON items + total + count), `POST /cart/api/add`, `PUT /cart/api/update/:id`, `DELETE /cart/api/remove/:id`, `GET /cart` (page). |
| Order Routes | `routes/orders.js` | `GET /orders`, `GET /orders/api`, `GET /orders/api/:id`, `POST /orders/api/create`, `GET /orders/track/:id`, `GET /orders/api/track/:id`, `GET /orders/:id/invoice` (PDFKit PDF generation with branded template). |
| Payment Routes | `routes/payment.js` | `GET /checkout`, `POST /payment/api/create-payment-intent` (Stripe or demo mode fallback), `POST /payment/api/webhook` (Stripe signature verification + status update). |
| Chatbot Routes | `routes/chatbot.js` | `POST /api/chat` (canned keyword matching first → LLM API fallback → random fallback pool), `GET /api/chat/history`. |
| Admin Routes | `routes/admin.js` | `GET /admin` (aggregate stats + top products + category distribution + orders by status + monthly revenue + recent orders + products + categories, all rendered to single admin.ejs), `GET /admin/api/orders`, `PUT /admin/api/orders/:id/status`, `GET /admin/api/export/users`, `GET /admin/api/export/products`, `GET /admin/api/export/orders`, `GET /admin/api/revenue-chart`. |

### 3.3 Middleware Pipeline

```
Request → morgan(logger) → jsonParser → urlencodedParser → cookieParser →
    staticFiles → localsInit (decode JWT from cookie, set res.locals.user) →
        auth routes → product routes → cart routes → order routes →
            payment routes → chatbot routes → admin routes
```

**Per-route middleware (from `middleware/auth.js`):**

```
authenticate(req, res, next):
    ├── Extract token from req.cookies.token or Authorization header
    ├── If no token → 401 JSON (XHR/API) or redirect to /login
    ├── Verify JWT with JWT_SECRET → set req.user + res.locals.user
    └── If invalid → clear cookie → 401 JSON or redirect to /login

optionalAuth(req, res, next):
    ├── If token exists in cookie → decode and set req.user (silent fail)
    └── Always call next()

adminOnly(req, res, next):
    ├── If req.user.role !== 'admin' → 403 JSON or redirect to /
    └── Else next()
```

No validation middleware (express-validator is not used). Input validation is inline (manual checks for required fields).

---

## 4. Technology Choices & Justification

| Technology | Choice | Justification |
|---|---|---|
| **Node.js** | Runtime | High I/O throughput, single-language full-stack, massive ecosystem |
| **Express.js** | Web framework | De facto standard, minimal overhead, extensive middleware ecosystem |
| **sql.js** | Database | Zero configuration, in-process SQLite via WASM — no external DB server needed. Perfect for single-server deployment, demo/development, and small-scale production. Persisted to a single `ecommerce.db` file. |
| **EJS** | Templating | Simple JavaScript-based templates, no steep learning curve, partials via `<%- include() %>` |
| **Stripe** | Payments | Best-in-class developer experience, webhook support, Indian Rupee (₹/INR) support, global payment methods. Falls back to demo mode when no valid key is configured. |
| **PDFKit** | PDF generation | Pure JavaScript, no external dependencies, full layout control for invoice generation |
| **JWT + bcryptjs** | Auth | Stateless, secure, cookie-storable tokens in httpOnly cookies; bcrypt for proven password hashing |
| **OpenAI-compatible API** | Chatbot | Vendor-agnostic — configured via `CHATBOT_API_URL`; works with Euron, OpenAI, Azure, Ollama, or any OpenAI-compatible endpoint. Includes canned keyword fallback when API is unreachable. |
| **dotenv** | Config | Industry standard for environment variable management |
| **morgan** | Logging | HTTP request logging for development and production debugging |

---

## 5. Project Structure (Full Directory Tree)

```
ZainulHub/
├── server.js                     # Entry point — Express app setup, route mounting
├── db.js                         # sql.js init, table creation, seed data, query helpers
├── .env                          # Environment variables (git-ignored)
├── package.json
├── middleware/
│   └── auth.js                   # authenticate, optionalAuth, adminOnly middleware
├── routes/
│   ├── auth.js                   # Login/signup/logout/profile API + pages
│   ├── products.js               # Product listing, detail, search, CRUD, reviews
│   ├── cart.js                   # Cart CRUD API + cart page
│   ├── orders.js                 # Order list, detail, tracking, PDF invoice
│   ├── payment.js                # Checkout page, Stripe payment intent, webhook
│   ├── chatbot.js                # Chat API with canned + LLM + fallback replies
│   └── admin.js                  # Single-page admin dashboard + CSV exports
├── views/
│   ├── header.ejs                # HTML shell, head, navbar, mobile menu, inline script
│   ├── footer.ejs                # Footer, chatbot widget, app.js include, closing tags
│   ├── index.ejs                 # Home page with featured products + categories
│   ├── products.ejs              # Product listing (card grid + search + filters)
│   ├── product.ejs               # Product detail (info, reviews, related products)
│   ├── cart.ejs                  # Shopping cart with line items
│   ├── checkout.ejs              # Checkout with Stripe Elements
│   ├── login.ejs                 # Sign in form
│   ├── signup.ejs                # Create account form
│   ├── profile.ejs               # User profile page
│   ├── orders.ejs                # Order history with expandable items
│   ├── track-order.ejs           # Public order tracking by ID
│   └── admin.ejs                 # Single-page admin dashboard
├── public/
│   ├── css/
│   │   └── style.css             # Single custom stylesheet (no frameworks)
│   └── js/
│       └── app.js                # Single client JS (cart, checkout, chatbot, admin)
├── docs/
│   ├── PRD.md
│   ├── HLD.md
│   ├── LLD.md
│   ├── ARCHITECTURE.md
│   └── WORKFLOW.md
└── ecommerce.db                  # SQLite database file (auto-created, git-ignored)
```

---

## 6. Database Entity Relationship (Text Diagram)

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    users     │       │   categories     │       │   products   │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id (PK)      │       │ id (PK)          │       │ id (PK)      │
│ name         │       │ name (UNIQUE)    │       │ category_id  │──FK──→ categories.id
│ email (UNIQUE)│       │ slug (UNIQUE)    │       │ name         │
│ password     │       └──────────────────┘       │ slug (UNIQUE)│
│ role         │                                   │ description  │
│ created_at   │                                   │ price        │
└──────┬───────┘                                   │ image        │
       │                                           │ stock        │
       │ 1                                         │ featured     │
       │                                           │ created_at   │
       │ N                                         └──────┬───────┘
       ▼                                                │
┌──────────────┐       ┌──────────────────┐            │
│    orders    │       │      cart        │            │
├──────────────┤       ├──────────────────┤            │
│ id (PK)      │       │ id (PK)          │            │
│ user_id (FK) │──FK───┤ user_id (FK)     │──FK──────┘ │
│ total        │       │ product_id (FK)  │──FK────────┘
│ status       │       │ quantity         │            │
│ payment_method│       └──────────────────┘            │
│ payment_status│                                      │
│ ship_address │                                       │
│ created_at   │                                       │
└──────┬───────┘                                       │
       │                                                │
       │ 1                                              │ N
       ▼                                                │
┌──────────────┐       ┌──────────────────┐            │
│ order_items  │       │  transactions    │            │
├──────────────┤       ├──────────────────┤            │
│ id (PK)      │       │ id (PK)          │            │
│ order_id (FK)│──FK───┤ order_id (FK)    │──FK────────┘
│ product_id   │       │ stripe_payment_  │            │
│ quantity     │       │   intent_id      │            │
│ price        │       │ amount           │            │
└──────────────┘       │ currency (inr)   │            │
                       │ status           │            │
                       │ created_at       │            │
                       └──────────────────┘            │
                                                       │
┌────────────────────────────┐     ┌──────────────┐   │
│   chatbot_conversations    │     │   reviews    │   │
├────────────────────────────┤     ├──────────────┤   │
│ id (PK)                    │     │ id (PK)      │   │
│ user_id (FK) ──FK──────────┘     │ user_id (FK) │───┘
│ session_id                  │     │ product_id   │───┘
│ role                        │     │ rating (1-5) │
│ content                     │     │ comment      │
│ created_at                  │     │ created_at   │
│ INDEX(session_id, created)  │     └──────────────┘
└────────────────────────────┘
```

---

## 7. Security Architecture

### 7.1 Defence Layers

```
Layer 1: Network
├── HTTPS (TLS) — all traffic encrypted (via reverse proxy in production)
└── CORS — cors middleware available but not restricted in current setup

Layer 2: Application
├── JWT authentication — httpOnly cookies (7d expiry)
├── Role-based access — authenticate() + adminOnly() middleware
├── SQL injection prevention — parameterized queries via sql.js prepared statements
└── EJS auto-escaping — prevents XSS in templates (<%= %> vs <%- %>)

Layer 3: Data
├── Password hashing — bcryptjs (salt rounds 10)
├── Environment secrets — .env excluded from git
└── Stripe signature verification — webhook security via stripe.webhooks.constructEvent

Layer 4: External
├── Stripe — PCI DSS compliant; no raw card data stored (Stripe Elements)
└── LLM API — API key authentication (CHATBOT_API_KEY), request timeout (20s)
```

### 7.2 Security Headers (Suggested)

The project does not currently set security headers via middleware. These should be added via `helmet` or manually:

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://js.stripe.com https://cdnjs.cloudflare.com; style-src 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' https://images.unsplash.com https://via.placeholder.com data:; frame-src https://js.stripe.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 8. Deployment Architecture

### 8.1 Single-Server (Current)

```
┌────────────────────────────────────────────┐
│               Single VPS / Cloud VM        │
│                                            │
│  ┌──────────┐    ┌─────────────────────┐  │
│  │  Nginx   │    │  Node (via PM2 or   │  │
│  │  Reverse │───>│  systemd service)   │  │
│  │  Proxy   │    │                     │  │
│  │  SSL     │    │  server.js          │  │
│  │  Static  │    │  (single instance)  │  │
│  └──────────┘    └─────────────────────┘  │
│                                            │
│  ┌─────────────────────────────────────┐  │
│  │         ecommerce.db                │  │
│  │   (SQLite database file, auto-      │  │
│  │    created by db.js on first run)   │  │
│  └─────────────────────────────────────┘  │
└────────────────────────────────────────────┘
```

### 8.2 Environment Variables

```
# .env
PORT=3000
SESSION_SECRET=super-secret-key-ecommerce-2024
JWT_SECRET=jwt-secret-key-ecommerce-2024
BASE_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_placeholder_replace_with_real_key
STRIPE_PUBLISHABLE_KEY=pk_test_placeholder_replace_with_real_key

# Chatbot (Euron/OpenAI-compatible)
CHATBOT_API_KEY=euri-...
CHATBOT_API_URL=https://api.euron.one/api/v1/euri/chat/completions
CHATBOT_MODEL=gpt-4o-mini
```

**Notes:**
- **Currency**: All prices are stored and displayed in **Indian Rupee (₹/INR)**. The `transactions` table defaults to `currency = 'inr'`. Stripe payment intents use `currency: 'inr'`.
- **Stripe demo mode**: If `STRIPE_SECRET_KEY` contains `placeholder` or is unset, the app runs in demo mode — orders are created with immediate `paid` status, no real Stripe API call is made.
- **Chatbot fallback**: When the LLM API is unreachable, the chatbot serves a random fallback reply from a curated pool of responses. Canned keyword matching runs first regardless of API availability.

---

*Document version 2.0 — Last updated July 2026*
