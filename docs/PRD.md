# PRD — Product Requirements Document

## ZainulHub — Premium E-Commerce Platform

---

## 1. Product Overview

ZainulHub is a modern, full-featured e-commerce platform designed to deliver a seamless online shopping experience. Built with Node.js, Express, and SQLite (via sql.js), it integrates Stripe for payment processing, an LLM-powered chatbot for customer support, PDF invoice generation via PDFKit, and JWT-based authentication for secure access. ZainulHub is architected for performance, security, and extensibility, targeting small-to-medium businesses looking to establish or migrate their online storefront.

---

## 2. Problem Statement

Small and medium-sized e-commerce businesses typically face one of two challenges: either they rely on expensive SaaS platforms (Shopify, BigCommerce) that charge recurring fees and limit customization, or they attempt to build custom solutions that become costly to maintain. ZainulHub bridges this gap by providing a self-hosted, open-source e-commerce platform that is lightweight, fully customizable, and integrates modern capabilities like AI-driven chat support and automated invoicing out of the box. The platform addresses the need for:

- A cost-effective, self-hosted alternative to subscription-based e-commerce platforms.
- Built-in AI chatbot support without third-party service dependencies.
- Automated PDF invoice generation for order fulfillment.
- Secure JWT-based authentication with role-based access control.

---

## 3. Target Audience

| Persona | Description |
|---|---|
| **Store Owners** | Small-to-medium business owners who need an affordable, customizable online store. |
| **Developers** | Technical teams who want a clean, well-documented codebase to extend and customize. |
| **Customers** | End users who browse, search, and purchase products through the platform. |
| **Admin Staff** | Store managers who handle product listings, orders, and customer support via the admin dashboard. |

---

## 4. Features

### 4.1 User Authentication
- JWT-based registration and login.
- HTTP-only cookie storage for access tokens.
- Role-based access control (`customer`, `admin`).
- Profile management (view / update name, email, address).

### 4.2 Product Catalog
- Product listing with pagination and category filtering.
- Search by name, description, or category.
- Product detail view with image, price (₹), description, stock status.
- Admin CRUD for categories and products.
- 50 seeded products across multiple categories for demo and testing.

### 4.3 Shopping Cart
- Add / remove / update quantity of items.
- Cart persists per user session.
- Real-time subtotal, tax, and total calculations in ₹.

### 4.4 Checkout & Payments
- Stripe integration for secure credit/debit card payments.
- All monetary values displayed and processed in ₹ (INR).
- Address collection during checkout (shipping / billing).
- Order confirmation on successful payment.

### 4.5 Order Management
- Order history for customers.
- Status tracking (Pending → Processing → Shipped → Delivered → Cancelled).
- Admin can update order status and view all orders.

### 4.6 Admin Dashboard
- Overview metrics (total sales, order count, product count).
- Product management (add / edit / delete).
- Order management (view all, update status).
- User management (view customers, assign admin roles).

### 4.7 LLM Chatbot
- AI-powered chatbot accessible from any page.
- Answers product questions, order status, and general inquiries.
- Conversation history stored per session.
- Configurable LLM backend (OpenAI-compatible API).

### 4.8 PDF Invoices
- Automated invoice generation on successful order placement.
- Downloadable from order detail page.
- Includes store info, customer info, line items, totals in ₹, and payment confirmation.

### 4.9 SEO Optimization
- Semantic HTML structure.
- Meta tags for product and category pages.
- Clean URL slugs for products and categories.

### 4.10 Product Reviews & Ratings
- Star-rating system (1–5 stars) for products.
- User-submitted text reviews tied to authenticated accounts.
- Average rating displayed on product cards and detail pages.
- Admin can moderate or remove inappropriate reviews.

### 4.11 Order Tracking
- Public tracking page accessible via order ID.
- 4-step timeline visual: Placed → Confirmed → Shipped → Delivered.
- Real-time status updates reflected on the tracking page.
- No login required for tracking access (shareable link).

### 4.12 Admin Analytics
- Revenue trend chart (line chart, last 30 days / 12 months).
- Category distribution chart (doughnut/pie chart) showing sales by category.
- Order status breakdown chart (bar chart) of current orders by status.
- All charts rendered on `<canvas>` using Chart.js.

### 4.13 CSV Data Export
- Admin-only CSV export endpoints.
- Export all users (name, email, role, created date).
- Export all products (name, category, price, stock, created date).
- Export all orders (order ID, customer, status, total, date).
- One-click download from the admin dashboard.

---

## 5. User Stories

| ID | As a... | I want to... | So that... |
|---|---|---|---|
| US-01 | Visitor | Register an account | I can shop and track orders. |
| US-02 | Customer | Log in securely | My account and payment info stays protected. |
| US-03 | Customer | Browse products by category | I can quickly find what I need. |
| US-04 | Customer | Search products by keyword | I can find specific items. |
| US-05 | Customer | Add products to a cart | I can purchase multiple items at once. |
| US-06 | Customer | Check out with Stripe | I can pay securely with my card. |
| US-07 | Customer | View my order history | I can track past purchases. |
| US-08 | Customer | Download a PDF invoice | I can keep records for accounting. |
| US-09 | Customer | Chat with the AI assistant | I can get instant help without email. |
| US-10 | Admin | Add new products | I can expand the catalog. |
| US-11 | Admin | Update product details | I can fix errors or change pricing. |
| US-12 | Admin | View all orders | I can manage fulfillment. |
| US-13 | Admin | Update order status | I can communicate progress to customers. |
| US-14 | Admin | View dashboard metrics | I can monitor store performance. |
| US-15 | Customer | Submit a product review with a star rating | I can share feedback on items I purchased. |
| US-16 | Customer | View order tracking via a public page | I can see the real-time status of my delivery. |
| US-17 | Admin | Export data to CSV | I can analyze users, products, and orders offline. |
| US-18 | Admin | View analytics charts on the dashboard | I can visualize revenue trends, category distribution, and order status breakdown. |

---

## 6. Technical Requirements

### 6.1 Functional Requirements
- User registration and login with JWT.
- Product CRUD with image upload support.
- Cart management with session persistence.
- Stripe payment intent integration (₹ currency).
- PDF invoice generation with PDFKit.
- LLM chatbot with configurable model endpoint.
- Role-based middleware for protected routes.
- Paginated product listing (50 seeded products across categories).
- Input validation and sanitization on all endpoints.
- Database powered by sql.js (SQLite compiled to WebAssembly).
- Product reviews and ratings (1–5 stars with text).
- Public order tracking with 4-step status timeline.
- Admin analytics dashboard with canvas-based charts (Chart.js).
- Admin CSV export for users, products, and orders.

### 6.2 Non-Functional Requirements
- **Performance:** Page load under 2 seconds (uncached).
- **Security:** Passwords hashed with bcrypt (salt rounds ≥ 10); JWT stored in HTTP-only cookies; all inputs validated; SQL injection prevented via parameterized queries.
- **Availability:** Target 99.5% uptime.
- **Scalability:** Stateless API layer allows horizontal scaling; SQLite (sql.js) suitable for single-server deployments with vertical scaling path to PostgreSQL.
- **Maintainability:** Modular route/controller/service structure; comprehensive logging; environment-based configuration.

---

## 7. Success Metrics

| Metric | Target |
|---|---|
| User Registration Conversion | > 60% of visitors who add to cart |
| Checkout Completion Rate | > 70% of initiated checkouts |
| Order Fulfillment Time | < 48 hours for in-stock items |
| Chatbot Resolution Rate | > 80% of queries resolved without human handoff |
| API Response Time (p95) | < 500 ms |
| Invoice Download Rate | > 40% of completed orders |

---

## 8. Timeline / Milestones

| Phase | Milestone | Status |
|---|---|---|
| **Phase 1** | Foundation: Auth system, project scaffolding, DB schema | ✅ Complete |
| **Phase 2** | Product Catalog: CRUD, categories, search, pagination | ✅ Complete |
| **Phase 3** | Cart & Checkout: Cart management, Stripe integration | ✅ Complete |
| **Phase 4** | Orders & Invoices: Order lifecycle, PDF generation | ✅ Complete |
| **Phase 5** | Admin Dashboard: Metrics, product/order/user management | ✅ Complete |
| **Phase 6** | LLM Chatbot: Integration, conversation storage, config | ✅ Complete |
| **Phase 7** | Product Reviews & Ratings: Star rating, user reviews, average display | ✅ Complete |
| **Phase 8** | Order Tracking: Public tracking page, 4-step timeline | ✅ Complete |
| **Phase 9** | Admin Analytics: Revenue, category, status charts (Chart.js) | ✅ Complete |
| **Phase 10** | CSV Export: Admin CSV download for users, products, and orders | ✅ Complete |
| **Phase 11** | Polish: SEO, error handling, testing, deployment | ✅ Complete |

---

*Document version 2.0 — Last updated July 2026*
