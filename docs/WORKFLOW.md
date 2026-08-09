# WORKFLOW — User Workflows

## ZainulHub E-Commerce Platform

---

## 1. User Registration & Login Flow

### 1.1 Registration

**Trigger:** Visitor clicks "Sign Up" link.

**Preconditions:**
- Visitor has no active session.
- Visitor has a valid email address not already registered.

**Steps:**
1. Visitor navigates to `/signup`.
2. System displays registration form (name, email, password).
3. Visitor fills in fields and submits.
4. Client sends `POST /api/signup` with `{ name, email, password }`.
5. Server validates input (all fields required).
6. Server checks if email already exists in database.
7. If duplicate email → return 400 error; form displays "Email already registered".
8. Server hashes password with bcrypt (salt rounds 10).
9. Server inserts user into `users` table with role `customer`.
10. Server generates JWT with payload `{ id, name, email, role }`, expires in 7 days.
11. Server sets HTTP-only cookie `token=<jwt>; HttpOnly; maxAge=604800000`.
12. Server returns JSON `{ success: true, token }`.
13. Client redirects to `/`.

**Postconditions:**
- User account created in database.
- User is authenticated (token cookie present).
- User is redirected to homepage.

**Text Diagram:**
```
Visitor                Server                  Database
   │                      │                       │
   │  GET /signup         │                       │
   │─────────────────────>│                       │
   │  Signup form         │                       │
   │<─────────────────────│                       │
   │                      │                       │
   │  POST /api/signup    │                       │
   │  {name,email,pass}   │                       │
   │─────────────────────>│                       │
   │                      │  Validate input       │
   │                      │  Check email unique   │
   │                      │──────────────────────>│
   │                      │<──────────────────────│
   │                      │  Hash password        │
   │                      │  INSERT user          │
   │                      │──────────────────────>│
   │                      │  Generate JWT         │
   │  Set-Cookie: token   │                       │
   │<─────────────────────│                       │
   │                      │                       │
   │  Redirect /          │                       │
   │─────────────────────>│                       │
```

### 1.2 Login

**Trigger:** Returning user clicks "Login" link.

**Preconditions:**
- User has no active session.
- User has a registered account.

**Steps:**
1. User navigates to `/login`.
2. System displays login form (email, password).
3. User fills in credentials and submits.
4. `POST /api/login` is called with `{ email, password }`.
5. Server looks up user by email in database.
6. If user not found or password mismatch → return 401 "Invalid credentials".
7. Server compares password hash with bcrypt.
8. Server generates JWT with 7-day expiry, sets HTTP-only `token` cookie.
9. Server returns 200 JSON with `{ success, token, user }`.
10. Client redirects to `/`.

**Postconditions:**
- User is authenticated.
- Token cookie is set for 7 days.

**Alternative Flows:**
- **Forgot password** (future): Reset link sent via email.

**Text Diagram:**
```
User                    Server                  Database
  │                       │                       │
  │  POST /api/login      │                       │
  │  {email,password}     │                       │
  │──────────────────────>│                       │
  │                       │  SELECT user by email │
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │                       │  Compare bcrypt hash  │
  │                       │  Generate JWT         │
  │  Set-Cookie: token    │                       │
  │<──────────────────────│                       │
  │                       │                       │
  │  Redirect to /        │                       │
  │──────────────────────>│                       │
```

### 1.3 Session Check

**Endpoint:** `GET /api/me`

**Steps:**
1. Server reads `token` cookie.
2. Server verifies JWT and queries user from database.
3. Returns `{ user }` or `{ user: null }` if no valid token.

### 1.4 Logout

**Endpoint:** `POST /api/logout`

1. Server clears `token` cookie.
2. Client redirects to `/`.

---

## 2. Product Browsing & Search Flow

**Trigger:** User visits the homepage or clicks "Products".

**Preconditions:**
- Products exist in the database.
- Categories are defined.

**Steps:**
1. User navigates to `/products` (optionally with `?search=keyword&category=electronics&featured=1`).
2. Server queries products with filters (LIKE search on name/description, category slug filter, featured flag).
3. Server fetches all categories for filter sidebar.
4. Server renders `products.ejs` with product cards.
5. User can click a category to filter, or use the search bar.
6. User clicks a product card → navigates to `/products/:slug`.
7. Server queries product by slug with JOIN on category.
8. Server renders `product.ejs` with full product info, reviews section, and "Add to Cart" button.
9. Client-side JS fetches reviews via `GET /products/api/:id/reviews` and displays them.

**Postconditions:**
- Product list or detail is displayed.
- Reviews and average rating are loaded dynamically.

**Text Diagram:**
```
User                    Server                  Database
  │                       │                       │
  │  GET /products        │                       │
  │  ?category=electronics│                       │
  │──────────────────────>│                       │
  │                       │  SELECT products      │
  │                       │  WHERE c.slug=?       │
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │                       │  SELECT categories    │
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │  Render product list  │                       │
  │<──────────────────────│                       │
  │                       │                       │
  │  GET /products/       │                       │
  │  wireless-headphones  │                       │
  │──────────────────────>│                       │
  │                       │  SELECT product       │
  │                       │  WHERE slug=?         │
  │                       │  JOIN category        │
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │  Render product detail│                       │
  │  + reviews section    │                       │
  │<──────────────────────│                       │
  │                       │                       │
  │  GET /products/api/   │                       │
  │  1/reviews            │                       │
  │──────────────────────>│                       │
  │                       │  SELECT reviews       │
  │                       │  AVG(rating)          │
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │  Display reviews      │                       │
  │  + average rating     │                       │
  │<──────────────────────│                       │
```

---

## 3. Add to Cart Flow

**Trigger:** User clicks "Add to Cart" on a product detail or listing page.

**Preconditions:**
- Product exists and has stock > 0.

**Steps:**
1. Client checks login status (`userLoggedIn` global variable).
2. If not authenticated → redirect to `/login`.
3. User clicks "Add to Cart" with desired quantity (default 1).
4. Client sends `POST /cart/api/add` with `{ product_id, quantity }`.
5. Auth middleware verifies token and attaches `req.user`.
6. Server validates product exists.
7. If product not found → return 404 "Product not found".
8. Server checks for existing cart row for this user + product.
9. If exists → UPDATE quantity += requested quantity.
10. If not → INSERT new cart row.
11. Server returns `{ success: true, count }` (total cart item count).
12. Client updates cart icon badge with new count.
13. Button shows "Added!" for 1.5 seconds, then reverts.

**Postconditions:**
- Cart database row created or updated.
- Cart icon badge reflects new count.

**Text Diagram:**
```
User                    Server                  Database
  │                       │                       │
  │  Click "Add to Cart"  │                       │
  │  (not logged in)      │                       │
  │──→ Redirect /login    │                       │
  │                       │                       │
  │  Click "Add to Cart"  │                       │
  │  (logged in)          │                       │
  │  POST /cart/api/add   │                       │
  │  {product_id:1,       │                       │
  │   quantity:2}         │                       │
  │──────────────────────>│                       │
  │                       │  Verify token         │
  │                       │  Check product exists │
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │                       │  Check existing cart  │
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │                       │  UPSERT cart          │
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │  {success, count}     │                       │
  │<──────────────────────│                       │
  │                       │                       │
  │  Update cart badge    │                       │
```

---

## 4. Checkout & Payment Flow

**Trigger:** User clicks "Proceed to Checkout" from the cart page.

**Preconditions:**
- User is authenticated.
- Cart has at least one item.

**Steps:**
1. User clicks "Proceed to Checkout".
2. `GET /checkout` — server renders checkout form.
3. User fills in shipping address (address, city, PIN code) and selects payment method (Card or Demo).
4. User clicks "Place Order".
5. Client calls `POST /payment/api/create-payment-intent` with `{ shipping_address }`.
6. Server checks Stripe availability:
   - **If `STRIPE_SECRET_KEY` is a valid `sk_` key (not placeholder):** Stripe mode.
   - **If key is placeholder/missing/null:** Demo mode.
7. **Demo Mode:**
   a. Server creates order with `payment_status = 'paid'`.
   b. Inserts `order_items` from cart.
   c. Deducts stock.
   d. Clears cart.
   e. Inserts transaction with status `completed`.
   f. Returns `{ success: true, order_id }` with message "Payment processed (demo mode)".
8. **Stripe Mode:**
   a. Server creates Stripe PaymentIntent for order total.
   b. Creates order with `payment_status = 'pending'`.
   c. Inserts `order_items`, deducts stock, clears cart.
   d. Inserts transaction with `stripe_payment_intent_id` and status `pending`.
   e. Returns `clientSecret` and `order_id`.
   f. (Webhook `POST /payment/api/webhook` listens for `payment_intent.succeeded`, updates order to `paid`/`confirmed`.)
9. Client redirects to `/orders` on success.

**Postconditions:**
- Order created in database.
- Stock deducted.
- Cart cleared.
- Transaction recorded.

**Text Diagram (Demo Mode):**
```
User                 Server                 DB
  │                    │                    │
  │ GET /checkout      │                    │
  │───────────────────>│                    │
  │<───────────────────│  Render form       │
  │                    │                    │
  │ POST /payment/api/ │                    │
  │ create-payment-int │                    │
  │ {shipping_address} │                    │
  │───────────────────>│                    │
  │                    │  Stripe key is     │
  │                    │  placeholder?      │
  │                    │  → Demo mode       │
  │                    │  INSERT order      │
  │                    │────────────────────>
  │                    │  INSERT order_items│
  │                    │────────────────────>
  │                    │  UPDATE stock      │
  │                    │────────────────────>
  │                    │  DELETE cart       │
  │                    │────────────────────>
  │                    │  INSERT transaction│
  │                    │────────────────────>
  │  {success,        │                    │
  │   order_id}        │                    │
  │<───────────────────│                    │
  │                    │                    │
  │  Redirect /orders  │                    │
```

**Text Diagram (Stripe Mode):**
```
User                 Server               Stripe               DB
  │                    │                    │                   │
  │ POST /payment/api/ │                    │                   │
  │ create-payment-int │                    │                   │
  │───────────────────>│                    │                   │
  │                    │ Create PaymentIntent                   │
  │                    │───────────────────>│                   │
  │                    │<───────────────────│                   │
  │                    │ INSERT order       │                   │
  │                    │──────────────────────────────────────>│
  │                    │ INSERT order_items │                   │
  │                    │──────────────────────────────────────>│
  │                    │ UPDATE stock       │                   │
  │                    │──────────────────────────────────────>│
  │                    │ DELETE cart        │                   │
  │                    │──────────────────────────────────────>│
  │ clientSecret       │                    │                   │
  │<───────────────────│                    │                   │
  │                    │                    │                   │
  │                    │  Webhook:          │                   │
  │                    │  payment_intent    │                   │
  │                    │  .succeeded        │                   │
  │                    │<───────────────────│                   │
  │                    │  UPDATE order      │                   │
  │                    │  SET status=       │                   │
  │                    │  confirmed, paid   │                   │
  │                    │──────────────────────────────────────>│
```

---

## 5. Order Management Flow

**Trigger:** User views their orders or order details.

**Preconditions:**
- User is authenticated.

**Steps:**
1. User clicks "My Orders" in navigation.
2. `GET /orders` — server queries orders for `req.user.id` with items.
3. Server renders `orders.ejs` with order cards (order number, date, status, total, items).
4. User clicks on an order → client fetches `GET /orders/api/:id`.
5. Server returns order with JOIN on `order_items` and `transactions`.

**Postconditions:**
- Order list or detail displayed to user.

**Text Diagram:**
```
User                    Server                  Database
  │                       │                       │
  │  GET /orders          │                       │
  │──────────────────────>│                       │
  │                       │  SELECT orders        │
  │                       │  WHERE user_id = ?    │
  │                       │  ORDER BY created DESC│
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │  Render order list    │                       │
  │<──────────────────────│                       │
  │                       │                       │
  │  GET /orders/api/1    │                       │
  │──────────────────────>│                       │
  │                       │  SELECT order + items │
  │                       │  + transaction        │
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │  JSON order detail    │                       │
  │<──────────────────────│                       │
```

### 5.1 Order Tracking

**Trigger:** Visitor or customer opens order tracking page.

**Steps:**
1. User navigates to `/orders/track/:id` (public, no auth required).
2. Server looks up order by ID.
3. If not found → render 404 error page.
4. Server renders `track-order.ejs` with:
   - Order summary card (ID, total, date, payment status badge).
   - Timeline with 4 steps: Order Placed → Confirmed → Shipped → Delivered.
   - Active step is highlighted based on current `order.status`.
   - Order items list with images, quantities, and totals.
5. Client can also fetch JSON via `GET /orders/api/track/:id` for the same data.

**Timeline States:**
```
order.status     Active Steps
─────────────    ───────────────────────────
pending          Order Placed
confirmed        Order Placed → Confirmed
shipped          Order Placed → Confirmed → Shipped
delivered        Order Placed → Confirmed → Shipped → Delivered
cancelled        Only Order Placed (no progression)
```

**Text Diagram:**
```
User                    Server                  Database
  │                       │                       │
  │  GET /orders/track/1  │                       │
  │──────────────────────>│                       │
  │                       │  SELECT order         │
  │                       │  WHERE id = ?         │
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │  Render track page    │                       │
  │  + timeline + items   │                       │
  │<──────────────────────│                       │
```

### 5.2 Invoice Download

**Trigger:** User clicks "Download Invoice" on the order detail page.

**Endpoint:** `GET /orders/:id/invoice`

**Preconditions:**
- Order exists and belongs to the authenticated user (or admin viewing any order).

**Steps:**
1. Server verifies order ownership (or admin role).
2. PDFKit generates invoice in-memory with:
   - Company header (ZainulHub branded header with purple background).
   - Invoice metadata (invoice #ZNHB-{id}, date, status).
   - Billing address (shipping address from order).
   - Line items table with row striping.
   - Subtotal, shipping (free over ₹2,999), grand total.
   - Payment method and transaction ID (if available).
   - Footer with thank-you message.
3. Server streams PDF to client as download.

---

## 6. Product Reviews Flow

**Trigger:** User views product detail page.

### 6.1 Displaying Reviews

**Steps:**
1. Product detail page includes a `.reviews-container` with `data-product-id`.
2. On page load, client JS calls `GET /products/api/:id/reviews`.
3. Server queries all reviews for product with user names, plus `AVG(rating)`.
4. Client renders:
   - **Average rating** — numeric score (e.g., 4.2), star icons, review count.
   - **Review cards** — each showing author name, date, star rating, comment text.
   - **Empty state** — "No reviews yet. Be the first to review!" if no reviews.
5. If user is authenticated, a review submission form is shown.
6. If not authenticated, a "Sign in to write a review" link is displayed.

### 6.2 Submitting a Review

**Endpoint:** `POST /products/api/reviews` (authenticated)

**Steps:**
1. User selects star rating (1–5) by clicking star icons (with hover preview).
2. User optionally writes a comment.
3. Client sends `{ product_id, rating, comment }`.
4. Server validates: `product_id` and `rating` (1–5) are required.
5. Server inserts into `reviews` table.
6. Server returns 201 `{ success: true }`.
7. Client clears the form and reloads the reviews list.

**Text Diagram:**
```
User               Client JS           Server              DB
  │                  │                   │                 │
  │  Page load       │                   │                 │
  │                  │  GET /products/   │                 │
  │                  │  api/1/reviews    │                 │
  │                  │──────────────────>│                 │
  │                  │                   │ SELECT reviews  │
  │                  │                   │ AVG(rating)     │
  │                  │                   │────────────────>│
  │                  │                   │<────────────────│
  │  Display reviews │                   │                 │
  │<─────────────────│                   │                 │
  │                  │                   │                 │
  │  Submit review   │                   │                 │
  │  (authenticated) │                   │                 │
  │─────────────────>│                   │                 │
  │                  │ POST /products/   │                 │
  │                  │ api/reviews       │                 │
  │                  │ {product_id:1,    │                 │
  │                  │  rating:4,        │                 │
  │                  │  comment:"Great!"}│                 │
  │                  │──────────────────>│                 │
  │                  │                   │ INSERT review   │
  │                  │                   │────────────────>│
  │                  │                   │<────────────────│
  │                  │ 201 {success}     │                 │
  │                  │<──────────────────│                 │
  │  Reload reviews  │                   │                 │
  │<─────────────────│                   │                 │
```

---

## 7. Admin Analytics & CSV Export Flow

**Trigger:** Admin navigates to admin dashboard.

**Preconditions:**
- User is authenticated with `admin` role.

### 7.1 Dashboard Overview

**Endpoint:** `GET /admin`

**Steps:**
1. Admin navigates to `/admin`.
2. Server computes dashboard statistics:
   - Total products, users, orders, revenue (from paid orders).
   - Pending orders count, average order value.
   - Total reviews count.
   - Top 5 selling products (by quantity sold).
   - Category distribution (products per category).
   - Orders grouped by status.
   - Monthly revenue for last 6 months.
   - Recent 10 orders with user names.
   - All products with category names.
   - All categories.
3. Server renders `admin.ejs` with tabbed panels: Overview, Products, Orders.

### 7.2 Product Management

**Steps:**
1. Admin sees full product table with name, price, stock, category, featured status.
2. **Add Product:** Form with name, description, price, image URL, category, stock, featured toggle → `POST /api/admin/products`.
3. **Edit Product:** Modal form pre-filled with product data → `PUT /api/admin/products/:id`.
4. **Delete Product:** Confirmation dialog → `DELETE /api/admin/products/:id`.

### 7.3 Order Management

**Steps:**
1. Admin sees all orders table with order ID, customer name, total, status, payment status, date.
2. Admin changes order status via dropdown → `PUT /admin/api/orders/:id/status` with `{ status }` or `{ payment_status }`.

**Allowed Status Transitions:**
```
pending ──→ confirmed ──→ shipped ──→ delivered
   │                          │
   └──→ cancelled             └──→ cancelled
```

### 7.4 CSV Export

**Steps:**
1. Admin clicks "Export Users" → `GET /admin/api/export/users` → downloads `users.csv` with columns: ID, Name, Email, Role, Created At.
2. Admin clicks "Export Products" → `GET /admin/api/export/products` → downloads `products.csv` with columns: ID, Name, Price (INR), Category, Stock, Featured.
3. Admin clicks "Export Orders" → `GET /admin/api/export/orders` → downloads `orders.csv` with columns: Order ID, Customer, Total (INR), Status, Payment Status, Created At.

### 7.5 Revenue Chart Data

**Endpoint:** `GET /admin/api/revenue-chart`

Returns JSON array of monthly revenue and order count for last 6 months, used to render an admin chart.

**Text Diagram:**
```
Admin                   Server                  Database
  │                       │                       │
  │  GET /admin           │                       │
  │──────────────────────>│                       │
  │                       │  Compute stats:       │
  │                       │  COUNT products,      │
  │                       │  users, orders,       │
  │                       │  SUM revenue,         │
  │                       │  top products,        │
  │                       │  monthly revenue      │
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │  Render dashboard     │                       │
  │  + tabs + charts      │                       │
  │<──────────────────────│                       │
  │                       │                       │
  │  Export Users         │                       │
  │  GET /admin/api/      │                       │
  │  export/users         │                       │
  │──────────────────────>│                       │
  │                       │  SELECT users         │
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │  users.csv download   │                       │
  │<──────────────────────│                       │
  │                       │                       │
  │  PUT /admin/api/      │                       │
  │  orders/1/status      │                       │
  │  {status:'shipped'}   │                       │
  │──────────────────────>│                       │
  │                       │  UPDATE orders        │
  │                       │  SET status='shipped' │
  │                       │──────────────────────>│
  │                       │<──────────────────────│
  │  JSON {success}       │                       │
  │<──────────────────────│                       │
```

---

## 8. Chatbot Conversation Flow

**Trigger:** User clicks on the floating chat icon.

**Preconditions:**
- Chatbot widget is loaded on every page (partial in footer).
- Canned response system or LLM API endpoint is configured.

**Steps:**
1. User clicks chat icon → chat panel expands, toggle button hides.
2. Chat widget loads `session_id` from `localStorage` (persists across page loads).
3. User types a message and presses Enter / Send button.
4. Client calls `POST /api/chat` with `{ message, session_id }`.
5. Server saves user message to `chatbot_conversations` table.
6. Server attempts to match message against canned response keywords:
   - If a keyword match is found (score > 0), return the canned reply immediately.
   - If no match, fall through to LLM API.
7. **Canned Response:** Direct reply with no external API call.
8. **LLM Mode:**
   a. Server loads recent conversation history (last 10 messages).
   b. Builds message array: system prompt + history + current message.
   c. Sends request to configurable LLM endpoint (`CHATBOT_API_URL`).
   d. If API succeeds → return assistant reply.
   e. If API fails (timeout, error, empty response) → return random fallback reply.
9. Server saves assistant response to database.
10. Client appends user message and bot response to chat UI.
11. Chat widget scrolls to bottom.

**Postconditions:**
- Conversation persisted in database.
- User receives AI-generated or canned response.

**Session Management:**
- Session ID persists across page loads via `localStorage`.
- If user logs in, `user_id` is associated with future messages.
- Past conversations retrievable via `GET /api/chat/history?session_id=...`.

**Text Diagram:**
```
User               Client JS           Server              DB
  │                  │                   │                 │
  │ Click chat icon  │                   │                 │
  │<────────────────>│                   │                 │
  │                  │                   │                 │
  │ Type message     │                   │                 │
  │─────────────────>│                   │                 │
  │                  │ POST /api/chat    │                 │
  │                  │ {message,         │                 │
  │                  │  session_id}      │                 │
  │                  │──────────────────>│                 │
  │                  │                   │ INSERT user msg │
  │                  │                   │────────────────>│
  │                  │                   │                 │
  │                  │                   │ Try canned?     │
  │                  │                   │  ── hit? → reply│
  │                  │                   │  ── miss → LLM  │
  │                  │                   │                 │
  │                  │                   │ SELECT history  │
  │                  │                   │────────────────>│
  │                  │                   │<────────────────│
  │                  │                   │ Query LLM API   │
  │                  │                   │ (or use canned) │
  │                  │                   │                 │
  │                  │                   │ INSERT reply    │
  │                  │                   │────────────────>│
  │                  │                   │                 │
  │                  │ {reply}           │                 │
  │                  │<──────────────────│                 │
  │ Show reply       │                   │                 │
  │<─────────────────│                   │                 │
```

---

## 9. Invoice Download Flow

**Trigger:** User clicks "Download Invoice" on the order detail page.

**Preconditions:**
- Order exists and belongs to the authenticated user (or admin viewing any order).

**Steps:**
1. User clicks "Download Invoice" button.
2. Client navigates to `GET /orders/:id/invoice`.
3. Server verifies order ownership (user can only download own invoices; admin can download any).
4. Server queries order, items, user, and transaction.
5. PDFKit generates invoice document in real-time:
   - Branded header with ZainulHub logo area and purple (#6366f1) background.
   - Invoice metadata (invoice #ZNHB-{id}, date, status badge).
   - Billing address section.
   - Line items table with alternating row colors, #, description, qty, unit price, total.
   - Subtotal, shipping calculation (free over ₹2,999, else ₹199), grand total.
   - Payment method and transaction ID (if available).
   - Thank-you footer.
6. Server sets response headers: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename=invoice-ZNHB-{id}.pdf`.
7. Server streams PDF buffer to client.

**Postconditions:**
- Browser downloads the PDF file.

**Text Diagram:**
```
User                    Server                  Database               PDFKit
  │                       │                       │                     │
  │  GET /orders/1/invoice│                       │                     │
  │──────────────────────>│                       │                     │
  │                       │  Check ownership      │                     │
  │                       │  SELECT order + items │                     │
  │                       │  + user + transaction │                     │
  │                       │──────────────────────>│                     │
  │                       │<──────────────────────│                     │
  │                       │                       │                     │
  │                       │  Generate PDF         │                     │
  │                       │───────────────────────────────────────────>│
  │                       │<───────────────────────────────────────────│
  │                       │                       │                     │
  │  PDF file stream      │                       │                     │
  │<──────────────────────│                       │                     │
```

---

*Document version 2.0 — Last updated July 2026*
