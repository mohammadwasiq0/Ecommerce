const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'ecommerce.db');

let db;

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image TEXT,
      category_id INTEGER,
      stock INTEGER DEFAULT 0,
      featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_method TEXT,
      payment_status TEXT DEFAULT 'unpaid',
      shipping_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      stripe_payment_intent_id TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'inr',
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS chatbot_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  const row = db.exec('SELECT COUNT(*) as count FROM categories');
  const count = row.length > 0 ? row[0].values[0][0] : 0;
  if (count === 0) {
    db.run("INSERT INTO categories (name, slug) VALUES ('Electronics', 'electronics')");
    db.run("INSERT INTO categories (name, slug) VALUES ('Clothing', 'clothing')");
    db.run("INSERT INTO categories (name, slug) VALUES ('Home & Garden', 'home-garden')");
    db.run("INSERT INTO categories (name, slug) VALUES ('Books', 'books')");
    db.run("INSERT INTO categories (name, slug) VALUES ('Sports', 'sports')");

    const seedProds = [
      ['Wireless Headphones', 'wireless-headphones', 'Premium noise-cancelling wireless headphones with 30hr battery life.', 10999, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', 1, 50, 1],
      ['Smart Watch Pro', 'smart-watch-pro', 'Advanced fitness tracker with heart rate monitor, GPS and AMOLED display.', 19999, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', 1, 30, 1],
      ['Organic Cotton T-Shirt', 'organic-cotton-tshirt', 'Comfortable 100% organic cotton t-shirt, available in multiple colors.', 1299, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', 2, 200, 1],
      ['Classic Denim Jacket', 'classic-denim-jacket', 'Timeless denim jacket with modern fit, perfect for any season.', 4999, 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=500', 2, 40, 0],
      ['Indoor Plant Collection', 'indoor-plant-collection', 'Set of 3 low-maintenance indoor plants in ceramic pots.', 2499, 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=500', 3, 25, 0],
      ['Scented Candle Collection', 'scented-candle-collection', 'Hand-poured soy wax candles, set of 4 assorted scents.', 1799, 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=500', 3, 100, 1],
      ['JavaScript: The Good Parts', 'javascript-the-good-parts', 'A deep dive into the best features of JavaScript by Douglas Crockford.', 1499, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500', 4, 60, 0],
      ['Clean Code Handbook', 'clean-code-handbook', 'A handbook of agile software craftsmanship by Robert C. Martin.', 2299, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500', 4, 80, 1],
      ['Premium Yoga Mat', 'premium-yoga-mat', 'Extra thick non-slip yoga mat with carrying strap and alignment lines.', 2999, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500', 5, 90, 1],
      ['Ultra Running Shoes', 'ultra-running-shoes', 'Lightweight responsive running shoes with cloud-like cushioning technology.', 7999, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', 5, 45, 1],
      ['Bluetooth Speaker', 'bluetooth-speaker', 'Portable waterproof Bluetooth speaker with 20hr battery and deep bass.', 3999, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500', 1, 75, 1],
      ['Laptop Backpack', 'laptop-backpack', 'Premium water-resistant laptop backpack with USB charging port.', 2499, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', 2, 120, 0],
      ['Aviator Sunglasses', 'aviator-sunglasses', 'Classic aviator sunglasses with UV400 protection and polarized lenses.', 1999, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500', 2, 85, 1],
      ['Leather Wallet', 'leather-wallet', 'Genuine leather bifold wallet with RFID blocking technology.', 1499, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500', 2, 150, 0],
      ['Automatic Coffee Maker', 'automatic-coffee-maker', 'Programmable 12-cup coffee maker with built-in grinder and timer.', 6999, 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=500', 3, 35, 0],
      ['LED Desk Lamp', 'led-desk-lamp', 'Adjustable LED desk lamp with wireless charging base and multiple brightness levels.', 2299, 'https://images.unsplash.com/photo-1534105615256-13940c14234e?w=500', 3, 60, 0],
      ['Fitness Tracker Band', 'fitness-tracker-band', 'Advanced fitness band with SpO2 monitor, sleep tracking, and 14-day battery.', 4499, 'https://images.unsplash.com/photo-1557935728-e6d1eaabe558?w=500', 5, 55, 1],
      ['Cozy Fleece Hoodie', 'cozy-fleece-hoodie', 'Ultra-soft fleece hoodie with kangaroo pocket and adjustable hood.', 2999, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500', 2, 95, 0],
      ['Premium Cookware Set', 'premium-cookware-set', '10-piece non-stick cookware set with tempered glass lids.', 8999, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500', 3, 20, 0],
      ['Canvas Wall Art', 'canvas-wall-art', 'Beautiful motivational quote canvas wall art, 16x24 inches, ready to hang.', 1299, 'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=500', 3, 200, 1],
      ['Wireless Earbuds', 'wireless-earbuds', 'True wireless earbuds with active noise cancellation and 24hr battery.', 3499, 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=500', 1, 60, 1],
      ['USB-C Hub', 'usb-c-hub', '7-in-1 USB-C hub with HDMI, USB 3.0, SD card reader and PD charging.', 2499, 'https://images.unsplash.com/photo-1625630971485-32eadd2b8530?w=500', 1, 45, 0],
      ['Portable Power Bank', 'portable-power-bank', '20000mAh fast charging power bank with dual USB output.', 1999, 'https://images.unsplash.com/photo-1609592424825-13e2913b7832?w=500', 1, 80, 0],
      ['Mechanical Keyboard', 'mechanical-keyboard', 'RGB mechanical gaming keyboard with Cherry MX switches and aluminum frame.', 5499, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500', 1, 35, 1],
      ['Wireless Mouse', 'wireless-mouse', 'Ergonomic silent-click wireless mouse with adjustable DPI up to 4000.', 1799, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500', 1, 100, 0],
      ['4K Webcam', '4k-webcam', 'Ultra HD 4K webcam with auto-focus, microphone and privacy cover.', 7999, 'https://images.unsplash.com/photo-1623840873349-7a20a8eb1b50?w=500', 1, 25, 0],
      ['Noise Cancelling Earbuds', 'noise-cancelling-earbuds', 'Premium ANC earbuds with Hi-Res audio and wireless charging.', 12999, 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=500', 1, 40, 1],
      ['Casual Sneakers', 'casual-sneakers', 'Comfortable everyday sneakers with cushioned sole and breathable mesh.', 4999, 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500', 2, 70, 0],
      ['Merino Wool Scarf', 'merino-wool-scarf', 'Premium merino wool scarf with classic herringbone pattern.', 1299, 'https://images.unsplash.com/photo-1584030373081-f37b2356b0c8?w=500', 2, 110, 0],
      ['Genuine Leather Belt', 'genuine-leather-belt', 'Genuine leather belt with brushed nickel buckle, 35mm width.', 1199, 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=500', 2, 150, 0],
      ['Floral Summer Dress', 'floral-summer-dress', 'Lightweight floral sundress with adjustable straps and side pockets.', 2499, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500', 2, 55, 1],
      ['Decorative Throw Pillows', 'decorative-throw-pillows', 'Set of 2 decorative throw pillows with removable linen covers.', 1599, 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500', 3, 90, 0],
      ['Bamboo Plant Stand', 'bamboo-plant-stand', 'Mid-century modern bamboo plant stand with 3-tier shelving.', 2299, 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500', 3, 30, 0],
      ['Professional Knife Set', 'professional-knife-set', '5-piece knife set with stainless steel blades and wooden storage block.', 4499, 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=500', 3, 25, 1],
      ['Handwoven Area Rug', 'handwoven-area-rug', 'Handwoven wool area rug with geometric pattern, 5x7 feet.', 5999, 'https://images.unsplash.com/photo-1600166898405-da9535204843?w=500', 3, 15, 0],
      ['The Great Gatsby', 'the-great-gatsby', 'F. Scott Fitzgerald\'s classic tale of the American Dream in the Jazz Age.', 599, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500', 4, 200, 1],
      ['To Kill a Mockingbird', 'to-kill-a-mockingbird', 'Harper Lee\'s Pulitzer Prize-winning novel about racial injustice.', 699, 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=500', 4, 180, 0],
      ['1984', '1984', 'George Orwell\'s dystopian masterpiece of surveillance and totalitarianism.', 499, 'https://images.unsplash.com/photo-1491841573634-28140fc7ced7?w=500', 4, 220, 0],
      ['Atomic Habits', 'atomic-habits', 'James Clear\'s guide to building good habits and breaking bad ones.', 799, 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=500', 4, 250, 1],
      ['Sapiens', 'sapiens', 'Yuval Noah Harari\'s brief history of humankind from Stone Age to today.', 899, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500', 4, 160, 0],
      ['Think Python', 'think-python', 'An introduction to software design using the Python programming language.', 1199, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500', 4, 100, 0],
      ['The Alchemist', 'the-alchemist', 'Paulo Coelho\'s inspirational story about following your dreams.', 599, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500', 4, 190, 0],
      ['Deep Work', 'deep-work', 'Cal Newport\'s rules for focused success in a distracted world.', 799, 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=500', 4, 130, 0],
      ['Adjustable Dumbbells', 'adjustable-dumbbells', 'Space-saving adjustable dumbbell set ranging from 2kg to 20kg.', 9999, 'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=500', 5, 20, 1],
      ['Resistance Bands Set', 'resistance-bands-set', 'Set of 5 resistance bands with different tension levels and carry bag.', 999, 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=500', 5, 150, 0],
      ['Speed Jump Rope', 'speed-jump-rope', 'Speed jump rope with ball bearings and adjustable length cable.', 499, 'https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?w=500', 5, 200, 0],
      ['Insulated Water Bottle', 'insulated-water-bottle', 'Stainless steel insulated bottle, 750ml, keeps cold for 24 hours.', 799, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500', 5, 180, 1],
      ['Gym Duffel Bag', 'gym-duffel-bag', 'Large waterproof duffel bag with shoe compartment and wet pocket.', 2299, 'https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=500', 5, 65, 0],
      ['Foam Roller', 'foam-roller', 'High-density foam roller for muscle recovery and deep tissue massage.', 1299, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500', 5, 85, 0],
      ['Cycling Helmet', 'cycling-helmet', 'Ventilated road cycling helmet with MIPS safety system and adjustable fit.', 2999, 'https://images.unsplash.com/photo-1557803178-2cf15c5b6161?w=500', 5, 40, 0]
    ];
    const insertProd = db.prepare('INSERT INTO products (name, slug, description, price, image, category_id, stock, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    for (const p of seedProds) insertProd.run(p);

    const hash = bcrypt.hashSync('admin123', 10);
    db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", ['Admin User', 'admin@shop.com', hash, 'admin']);
    db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", ['Test User', 'user@shop.com', hash, 'customer']);

    saveDb();
  }

  return db;
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('WITH') || sql.includes('RETURNING')) {
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } else {
    const result = stmt.run(params);
    stmt.free();
    saveDb();
    return { changes: result, lastInsertRowid: db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0] || 0 };
  }
}

function get(sql, params = []) {
  const results = query(sql, params);
  return results[0] || null;
}

function all(sql, params = []) {
  return query(sql, params);
}

module.exports = { initDb, query, get, all, saveDb };
