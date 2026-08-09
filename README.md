# ZainulHub — Premium E-Commerce Platform

A modern, full-featured e-commerce platform built with **Node.js**, **Express**, **sql.js (SQLite)**, and **EJS**. Features include **Stripe** payment processing, a **dual-mode LLM chatbot** (canned responses + AI fallback), **PDF invoice generation**, **canvas-based admin analytics charts**, **CSV data exports**, and **JWT authentication** with role-based access control.

---

## Features

- **User Authentication** — JWT-based signup/login with HTTP-only cookies, bcrypt password hashing, and role-based access (`customer` / `admin`)
- **Product Catalog** — 50 products across 5 categories (Electronics, Clothing, Home & Garden, Books, Sports) with search, category filtering, featured products, and detailed product views — all prices in INR (₹)
- **Product Reviews** — Star ratings (1–5) with comments, average rating display per product
- **Shopping Cart** — Add/remove/update items, real-time subtotal/tax/total calculations
- **Checkout & Payments** — Secure Stripe integration with Payment Intents and demo (no-key) mode
- **Order Management** — Full order lifecycle (pending → confirmed → shipped → delivered → cancelled), order history for customers
- **Order Tracking** — Public tracking page with order timeline and status updates
- **PDF Invoices** — Automated invoice generation with PDFKit, downloadable from order detail page
- **Admin Dashboard** — Canvas-based analytics charts (6-month revenue trend, category distribution, order status breakdown), sales metrics, product CRUD, order management, user management
- **CSV Exports** — One-click CSV export for users, products, and orders from the admin panel
- **LLM Chatbot** — AI-powered customer support assistant with dual mode: keyword-based canned responses (no API required) and smart fallback to a configurable OpenAI-compatible LLM; conversation history persistence
- **Glass-morphism UI** — Modern frosted-glass navigation bar, card designs, and gradient accents

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (≥18 LTS) |
| **Web Framework** | Express.js 4.x |
| **Template Engine** | EJS 3.x |
| **Database** | sql.js (SQLite compiled to WASM) |
| **Authentication** | jsonwebtoken + bcryptjs |
| **Payments** | Stripe SDK |
| **Charts** | Canvas API (no external chart library) |
| **PDF Generation** | PDFKit |
| **Chatbot** | OpenAI-compatible API (configurable) + keyword-based canned mode |
| **Validation** | express-validator |

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18 LTS
- npm ≥ 9

### Installation

```bash
git clone <repository-url>
cd ZainulHub
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `JWT_SECRET` | Secret key for JWT signing |
| `STRIPE_SECRET_KEY` | Stripe secret key (starts with `sk_`) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (starts with `pk_`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `CHATBOT_API_URL` | OpenAI-compatible chat completion endpoint |
| `CHATBOT_API_KEY` | API key for the LLM service |
| `CHATBOT_MODEL` | Model name (e.g., `gpt-4o-mini`) |

### Database Initialization

The database (`ecommerce.db`) and all tables are created automatically on first run. On a fresh database, seed data is loaded automatically — 5 categories, 50 products, an admin user, and a test customer. No manual seed step is needed.

### Running the App

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Default Accounts

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@shop.com` | `admin123` |
| **Customer** | `user@shop.com` | `admin123` |

> **Important:** Change default credentials immediately after first login in production.

---

## Project Structure

```
ZainulHub/
├── server.js                     # Entry point
├── db.js                         # Database init, schema, seed, query helpers
├── middleware/                   # Auth middleware (authenticate, adminOnly)
├── routes/                       # Route handlers
│   ├── admin.js                  # Admin dashboard, CSV exports, revenue chart API
│   ├── auth.js                   # Login/signup/logout, /api/me
│   ├── cart.js                   # Cart API + page
│   ├── chatbot.js                # Dual-mode chatbot (canned + LLM)
│   ├── orders.js                 # Order management, tracking, PDF invoices
│   ├── payment.js                # Stripe checkout + webhook
│   └── products.js               # Product listing, detail, reviews, admin CRUD
├── views/                        # EJS templates
├── public/                       # Static assets
│   ├── css/style.css             # Glass-morphism design system
│   └── js/app.js                 # Client-side interactivity
├── docs/                         # Documentation
├── .env                          # Environment variables
└── package.json
```

---

## API Overview

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/login` | Log in with email/password |
| POST | `/api/signup` | Register a new account |
| POST | `/api/logout` | Log out (clear cookie) |
| GET | `/api/me` | Get current user from cookie |

### Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/products` | Product listing page (with search & category filter) |
| GET | `/products/:slug` | Product detail page |
| GET | `/products/api` | JSON product list (supports `?search=`, `?category=`, `?featured=`, `?limit=`) |
| GET | `/products/api/:id/reviews` | Get reviews for a product |
| POST | `/products/api/reviews` | Submit a review (auth required) |

### Cart (auth required)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/cart` | Cart page |
| GET | `/cart/api` | Get cart items (JSON) |
| POST | `/cart/api/add` | Add item to cart |
| PUT | `/cart/api/update/:id` | Update cart item quantity |
| DELETE | `/cart/api/remove/:id` | Remove item from cart |

### Orders

| Method | Endpoint | Description |
|---|---|---|
| GET | `/orders` | User's order history page |
| GET | `/orders/track/:id` | Public order tracking page |
| GET | `/orders/api` | List user orders (JSON) |
| GET | `/orders/api/track/:id` | Public order tracking data (JSON) |
| POST | `/orders/api/create` | Create order from cart (JSON) |
| GET | `/orders/:id/invoice` | Download PDF invoice (auth required) |

### Chatbot

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Send message (dual-mode: canned keyword match first, falls back to LLM) |
| GET | `/api/chat/history` | Get conversation history by `?session_id=` |

### Admin (JWT + admin role required)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin` | Admin dashboard page |
| GET | `/admin/api/orders` | List all orders (JSON) |
| PUT | `/admin/api/orders/:id/status` | Update order status |
| GET | `/admin/api/export/users` | Download users CSV |
| GET | `/admin/api/export/products` | Download products CSV |
| GET | `/admin/api/export/orders` | Download orders CSV |
| GET | `/admin/api/revenue-chart` | 6-month revenue data (JSON) |
| POST | `/api/admin/products` | Create product |
| PUT | `/api/admin/products/:id` | Update product |
| DELETE | `/api/admin/products/:id` | Delete product |

### Payment

| Method | Endpoint | Description |
|---|---|---|
| GET | `/checkout` | Checkout page (auth required) |
| POST | `/payment/api/create-payment-intent` | Create Stripe PaymentIntent (or demo mode order) |
| POST | `/payment/api/webhook` | Stripe webhook (uses Stripe signature) |

---

*Built with ❤️ for modern e-commerce.*
