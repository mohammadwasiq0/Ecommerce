# HLD — High Level Design

## ZainulHub E-Commerce Platform

---

## 1. System Overview

ZainulHub is a three-tier web application following a client-server architecture. The browser (client) communicates with a Node.js / Express web server that handles both server-side rendering (EJS templates) and REST API endpoints. The server interacts with an in-process SQLite database (via sql.js) for persistence. External integrations include Stripe (payments), an LLM API (chatbot), and PDFKit (invoice generation).

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐│
│  │ EJS Pages │  │ REST API │  │ Chatbot  │  │ Stripe       ││
│  │ (SSR)     │  │ (JSON)   │  │ Widget   │  │ Elements /   ││
│  │           │  │          │  │          │  │ Payment Link ││
│  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘│
└────────┼──────────────┼─────────────┼────────────────┼────────┘
         │              │             │                │
         ▼              ▼             ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express Web Server                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │  Auth    │ │  Routes  │ │Middleware│ │  Services      │  │
│  │  Module  │ │  & Views │ │ (JWT,    │ │  (Business     │  │
│  │          │ │          │ │  Valid., │ │   Logic)       │  │
│  │          │ │          │ │  Error)  │ │                │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬────────┘  │
│       │            │            │                │           │
│       ▼            ▼            ▼                ▼           │
│  ┌────────────────────────────────────────────────────┐      │
│  │              sql.js Database Layer                 │      │
│  │  users │ categories │ products │ cart │ orders ... │      │
│  └────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
         │              │             │
         ▼              ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                 External Integrations                        │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   Stripe   │  │  LLM API     │  │  PDFKit (in-process) │ │
│  │  Payments  │  │  (Chatbot)   │  │  Invoice Generation  │ │
│  └────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Node.js (≥18 LTS) | JavaScript runtime |
| **Web Framework** | Express.js 4.x | HTTP server, routing, middleware |
| **Template Engine** | EJS 3.x | Server-side HTML rendering |
| **Database** | sql.js (SQLite compiled to WASM/JS) | Embedded relational database |
| **ORM / Query** | Raw SQL via sql.js | Direct SQL queries with parameterization |
| **Authentication** | jsonwebtoken + bcryptjs | JWT generation/verification, password hashing |
| **Payments** | Stripe SDK | Payment intent API, webhook handling |
| **PDF Generation** | PDFKit | Server-side invoice PDF creation |
| **Chatbot** | OpenAI-compatible API (configurable) | LLM-powered customer support |
| **Session / Cookie** | cookie-parser | HTTP-only cookie management |
| **Validation** | express-validator | Input sanitization and validation |
| **Environment** | dotenv | Environment variable management |
| **Process Manager** | PM2 (production) | Process lifecycle management |

---

## 3. System Architecture

### 3.1 Presentation Tier
- **EJS Templates:** Server-rendered views for pages (home, products, cart, checkout, orders, admin dashboard, order tracking) with custom CSS featuring glass-morphism UI (backdrop-filter blur, semi-transparent cards), gradient accents, and soft shadows.
- **Client-Side Scripts:** Vanilla JS / minimal frontend for cart operations, Stripe Elements integration, chatbot widget.

### 3.2 Application Tier
- **Express Router Middleware:** Routes organized by domain (auth, products, cart, orders, admin, chatbot, payment).
- **Controllers:** Request handling, validation, response formatting.
- **Services:** Business logic separated from controllers — reusable across routes.
- **Middleware Pipeline:** `authMiddleware` (JWT verify) → `adminMiddleware` (role check) → controller → service → response.

### 3.3 Data Tier
- **sql.js Database:** Single-file SQLite database loaded into memory on startup, persisted to disk on writes.
- **Tables:** `users`, `categories`, `products`, `cart`, `orders`, `order_items`, `transactions`, `chatbot_conversations`, `reviews`.

---

## 4. Component Design

### 4.1 Web Server (Express)
Handles all HTTP requests. Serves static assets (CSS, JS, images) from `/public`. Renders EJS views for page requests and returns JSON for API calls. Configures cookie parsing, JSON/URL-encoded body parsing, and error handling. Sets `res.locals.user` on every request from JWT cookie for template access.

### 4.2 Auth Service
- **Register (POST /api/signup):** Validates input, hashes password (bcrypt, salt rounds 10), creates user record, issues JWT stored in HTTP-only cookie.
- **Login (POST /api/login):** Verifies credentials, issues JWT stored in HTTP-only cookie.
- **Logout (POST /api/logout):** Clears JWT cookie.
- **Profile (GET /api/me):** Returns authenticated user's data parsed from cookie token.
- **JWT Payload:** `{ id, name, email, role, iat, exp }` signed with secret from environment; expiry 7 days.

### 4.3 Product Service
- **List (GET /products/api):** Paginated listing with optional category filter, search, and featured flag. Returns products with computed fields (image URL, stock status).
- **Search:** Full-text search across `name` and `description`.
- **Detail (GET /products/:slug):** Single product by slug.
- **CRUD (Admin):** Create, update, delete products. Handles image URL storage.

### 4.4 Cart Service
- **Add Item (POST /cart/api/add):** Validates product existence and stock. Upserts cart row for user.
- **Update Quantity (PUT /cart/api/update/:id):** Changes quantity.
- **Remove Item (DELETE /cart/api/remove/:id):** Deletes cart row.
- **Get Cart (GET /cart/api):** Returns all items with computed subtotals and grand total.

### 4.5 Order Service
- **Create Order (POST /orders/api/create):** Creates order from cart items, calculates totals, clears cart.
- **List Orders (User, GET /orders/api):** List of user's orders with item summaries.
- **Order Detail (GET /orders/api/:id):** Single order with line items and transaction info.
- **Invoice (GET /orders/:id/invoice):** Generates PDF invoice via PDFKit with branded design.

### 4.6 Payment Service
- **Create Payment Intent (POST /payment/api/create-payment-intent):** Calls Stripe API to create a PaymentIntent for the order total; creates order and transaction record. Falls back to demo mode when no Stripe key configured.
- **Confirm Payment:** Handles Stripe webhook (`payment_intent.succeeded`) at `POST /payment/api/webhook` to mark order as paid.
- **Refund:** Admin-initiated refund via Stripe.

### 4.7 Chatbot Service
- **Send Message (POST /api/chat):** Takes user message with session_id, attempts keyword-based canned response match first, falls back to LLM API, saves conversation history.
- **Get History (GET /api/chat/history):** Returns conversation history for a session.
- **Prompt Engineering:** System prompt instructs LLM to act as a helpful Indian e-commerce assistant with context about categories and pricing in INR.
- **Fallback:** Random friendly fallback responses when LLM API is unreachable.

### 4.8 Admin Service
- **Dashboard Metrics (GET /admin):** Aggregates total sales, order count, user count, product count, pending orders, average order value, total reviews.
- **Top Products:** Best-selling products by quantity sold.
- **Category Distribution:** Product count per category for charting.
- **Orders by Status:** Breakdown of orders grouped by status.
- **Monthly Revenue:** Aggregated revenue for last 6 months.
- **Order Management (GET /admin/api/orders, PUT /admin/api/orders/:id/status):** List all orders, update order status and payment status.
- **User Management:** List users via rendering.
- **Product Management:** Full CRUD via `/api/admin/products` endpoints.
- **CSV Export:** Users (`/admin/api/export/users`), products (`/admin/api/export/products`), orders (`/admin/api/export/orders`) as CSV downloads.
- **Revenue Chart Data (GET /admin/api/revenue-chart):** JSON with monthly revenue and order count for last 6 months.

### 4.9 Reviews Service
- **List Reviews (GET /products/api/reviews/:productId):** Returns all reviews for a product with user names.
- **Average Rating (GET /products/api/:id/reviews):** Returns reviews with computed average rating.
- **Submit Review (POST /products/api/reviews):** Authenticated users can submit a rating (1-5) and optional comment for a product.

### 4.10 Order Tracking Service
- **Public Tracking Page (GET /orders/track/:id):** Server-rendered page showing order status, items, and shipping info — no authentication required.
- **Tracking API (GET /orders/api/track/:id):** Public JSON endpoint returning order detail, items, and transaction info.

---

## 5. Data Flow Diagrams

### 5.1 User Registration Flow
```
Client                    Server                     Database
  │                         │                          │
  │  POST /api/signup       │                          │
  │  {name,email,password}  │                          │
  │ ─────────────────────> │                          │
  │                         │  Validate input          │
  │                         │  Check email uniqueness  │
  │                         │ ──────────────────────> │
  │                         │  User doesn't exist      │
  │                         │ <────────────────────── │
  │                         │  Hash password (bcrypt)  │
  │                         │  INSERT user             │
  │                         │ ──────────────────────> │
  │                         │  User created            │
  │                         │  Generate JWT            │
  │  Set-Cookie (jwt)       │                          │
  │ <───────────────────── │                          │
  │  JSON {token, user}     │                          │
```

### 5.2 Checkout & Payment Flow
```
Client                    Server                     Stripe
  │                         │                          │
  │  POST /payment/api/     │                          │
  │  create-payment-intent  │                          │
  │  {shipping_address}     │                          │
  │ ─────────────────────> │                          │
  │                         │  Validate cart/stock     │
  │                         │  Calculate total         │
  │                         │  Create PaymentIntent    │
  │                         │  (currency: inr)         │
  │                         │ ──────────────────────> │
  │                         │  clientSecret            │
  │                         │ <────────────────────── │
  │                         │  Create order in DB      │
  │                         │  Decrease stock          │
  │                         │  Clear cart              │
  │  {clientSecret}         │                          │
  │ <───────────────────── │                          │
  │                         │                          │
  │  Stripe Elements        │                          │
  │  Confirm payment        │                          │
  │ ────────────────────────────────────────────────> │
  │                         │                          │
  │                         │  Webhook:                │
  │                         │  payment_intent.succeeded│
  │                         │ <────────────────────── │
  │                         │  Update order status     │
  │                         │  Update transaction      │
  │  Redirect to /orders    │                          │
  │ <───────────────────── │                          │
```

### 5.3 Chatbot Flow
```
Client                    Server                    LLM API
  │                         │                          │
  │  POST /api/chat         │                          │
  │  {message, session_id}  │                          │
  │ ─────────────────────> │                          │
  │                         │  Try canned reply        │
  │                         │  (keyword match)         │
  │                         │  If no match:            │
  │                         │    Load conversation     │
  │                         │    history from DB       │
  │                         │    Build prompt with     │
  │                         │    system instructions   │
  │                         │    POST /v1/chat/        │
  │                         │    completions            │
  │                         │ ──────────────────────> │
  │                         │  LLM response            │
  │                         │ <────────────────────── │
  │                         │  Save to conversation    │
  │                         │  history                 │
  │  {reply, session_id}    │                          │
  │ <───────────────────── │                          │
```

---

## 6. Database Design

### 6.1 Entity Relationship Summary

```
users 1──N orders
users 1──N cart
users 1──N chatbot_conversations
users 1──N reviews
categories 1──N products
products 1──N cart_items
products 1──N reviews
orders 1──N order_items
orders 1──1 transactions
```

### 6.2 Table Definitions

#### users
Stores registered user accounts with role-based access.

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT |
| name | TEXT | NOT NULL |
| email | TEXT | UNIQUE, NOT NULL |
| password | TEXT | NOT NULL |
| role | TEXT | DEFAULT 'customer' |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

#### categories
Product categories for classification.

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT |
| name | TEXT | UNIQUE, NOT NULL |
| slug | TEXT | UNIQUE, NOT NULL |

#### products
Product listings with pricing and stock.

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT |
| name | TEXT | NOT NULL |
| slug | TEXT | UNIQUE, NOT NULL |
| description | TEXT | |
| price | REAL | NOT NULL |
| image | TEXT | |
| category_id | INTEGER | FK → categories(id) |
| stock | INTEGER | DEFAULT 0 |
| featured | INTEGER | DEFAULT 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

#### cart
Shopping cart items per user.

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT |
| user_id | INTEGER | FK → users(id), NOT NULL |
| product_id | INTEGER | FK → products(id), NOT NULL |
| quantity | INTEGER | DEFAULT 1 |

#### orders
Order headers with status tracking.

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT |
| user_id | INTEGER | FK → users(id), NOT NULL |
| total | REAL | NOT NULL |
| status | TEXT | DEFAULT 'pending' |
| payment_method | TEXT | |
| payment_status | TEXT | DEFAULT 'unpaid' |
| shipping_address | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

#### order_items
Individual line items within an order.

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT |
| order_id | INTEGER | FK → orders(id), NOT NULL |
| product_id | INTEGER | FK → products(id), NOT NULL |
| quantity | INTEGER | NOT NULL |
| price | REAL | NOT NULL |

#### transactions
Payment transaction records linked to orders.

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT |
| order_id | INTEGER | FK → orders(id), NOT NULL |
| stripe_payment_intent_id | TEXT | |
| amount | REAL | NOT NULL |
| currency | TEXT | DEFAULT 'inr' |
| status | TEXT | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

#### chatbot_conversations
Chat history for the LLM chatbot.

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT |
| user_id | INTEGER | FK → users(id), NULLABLE (guests by session) |
| session_id | TEXT | NOT NULL |
| role | TEXT | NOT NULL |
| content | TEXT | NOT NULL |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |
| INDEX(session_id, created_at) | | |

#### reviews
Product reviews with star ratings from users.

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | PK, AUTOINCREMENT |
| user_id | INTEGER | FK → users(id), NOT NULL |
| product_id | INTEGER | FK → products(id), NOT NULL |
| rating | INTEGER | NOT NULL, CHECK(1–5) |
| comment | TEXT | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

---

## 7. API Design

### 7.1 Auth Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /signup | No | Render signup page |
| GET | /login | No | Render login page |
| POST | /api/signup | No | Register new user |
| POST | /api/login | No | Login, returns JWT cookie |
| POST | /api/logout | No | Clear JWT cookie |
| GET | /api/me | Cookie | Get current user from token |

### 7.2 Product Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /products | No | Render products page (search, filter) |
| GET | /products/api | No | JSON list (filterable, limit) |
| GET | /products/:slug | No | Render product detail page |
| POST | /api/admin/products | Admin | Create product |
| PUT | /api/admin/products/:id | Admin | Update product |
| DELETE | /api/admin/products/:id | Admin | Delete product |

### 7.3 Category Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /products/api | No | Categories rendered in-line on products page |
| (Categories managed via admin page rendering) | | | |

### 7.4 Cart Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /cart | JWT | Render cart page |
| GET | /cart/api | JWT | Get user's cart (JSON) |
| POST | /cart/api/add | JWT | Add item to cart |
| PUT | /cart/api/update/:id | JWT | Update item quantity |
| DELETE | /cart/api/remove/:id | JWT | Remove item from cart |

### 7.5 Order Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /orders | JWT | Render user's orders page |
| GET | /orders/api | JWT | List user's orders (JSON) |
| GET | /orders/api/:id | JWT | Get order detail (JSON) |
| POST | /orders/api/create | JWT | Create order from cart |
| GET | /orders/:id/invoice | JWT | Download PDF invoice |
| GET | /orders/track/:id | No | Render public order tracking page |
| GET | /orders/api/track/:id | No | Public order tracking (JSON) |

### 7.6 Admin Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /admin | Admin | Render admin dashboard |
| GET | /admin/api/orders | Admin | List all orders (JSON) |
| PUT | /admin/api/orders/:id/status | Admin | Update order status |
| GET | /admin/api/export/users | Admin | Export users as CSV |
| GET | /admin/api/export/products | Admin | Export products as CSV |
| GET | /admin/api/export/orders | Admin | Export orders as CSV |
| GET | /admin/api/revenue-chart | Admin | Monthly revenue chart data (JSON) |

### 7.7 Review Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /products/api/reviews/:productId | No | List reviews for a product |
| GET | /products/api/:id/reviews | No | Reviews with average rating |
| POST | /products/api/reviews | JWT | Submit a review (rating 1-5, comment) |

### 7.8 Chatbot Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/chat | No | Send message to chatbot |
| GET | /api/chat/history | No | Get conversation history |

### 7.9 Payment Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /checkout | JWT | Render checkout page |
| POST | /payment/api/create-payment-intent | JWT | Create Stripe PaymentIntent |
| POST | /payment/api/webhook | No (Stripe sig) | Stripe webhook handler |

---

## 8. Security Architecture

| Concern | Implementation |
|---|---|
| **Password Storage** | bcrypt with 10 salt rounds; never stored in plaintext |
| **Authentication** | JWT (HS256) with expiry (7d); stored in HTTP-only cookie; also accepted via Bearer token in Authorization header for API clients |
| **Authorization** | Role-based middleware; `adminMiddleware` checks `req.user.role === 'admin'`; `authenticate` middleware redirects or returns 401 for unauthenticated requests |
| **CSRF Protection** | SameSite cookie attribute; no token-based CSRF (relies on cookie same-origin) |
| **Input Validation** | Express-validator on all user-supplied data |
| **SQL Injection** | Parameterized queries via sql.js prepared statements (all user input bound as `?` parameters) |
| **XSS Prevention** | EJS auto-escapes output; Content Security Policy via meta tags |
| **Rate Limiting** | Basic request throttling applied at middleware level on sensitive endpoints; configurable via environment |
| **Stripe Webhook** | Signature verification via `stripe.webhooks.constructEvent()` when Stripe key is configured |
| **Environment Secrets** | All keys/secrets via `.env`; `.env` excluded from version control |

---

## 9. Scalability Considerations

| Bottleneck | Mitigation |
|---|---|
| **Single-threaded Node.js** | Use PM2 cluster mode for multi-core utilization |
| **SQLite concurrency** | sql.js is single-writer; for high traffic, migrate to PostgreSQL with Knex query builder |
| **Static assets** | Serve via CDN or reverse proxy (Nginx) in production |
| **LLM API latency** | Chatbot requests are async; UI shows typing indicator; response caching for common queries via canned replies |
| **PDF generation** | Generate invoices synchronously on request; cache generated PDFs |
| **Database size** | Archive old orders monthly; paginate all list queries |
| **Session state** | Stateless JWT — no server-side sessions needed; horizontal scale by adding instances behind a load balancer |

---

*Document version 2.0 — Last updated July 2026*
