-- TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER UNIQUE NOT NULL,
  item_name TEXT,
  item_sku TEXT,
  item_status TEXT,
  price_current REAL,
  price_original REAL,
  stock_available INTEGER,
  stock_reserved INTEGER,
  sales INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  rating_star REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  images TEXT, -- JSON array
  create_time INTEGER,
  update_time INTEGER,
  last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
  raw_data TEXT -- JSON completo
);

-- TABELA DE PEDIDOS
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_sn TEXT UNIQUE NOT NULL,
  order_status TEXT,
  buyer_username TEXT,
  total_amount REAL,
  shipping_fee REAL,
  items_count INTEGER,
  create_time INTEGER,
  update_time INTEGER,
  payment_method TEXT,
  recipient_address TEXT, -- JSON
  items TEXT, -- JSON array
  last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
  raw_data TEXT -- JSON completo
);

-- TABELA DE TOKENS (para gerenciar refresh)
CREATE TABLE IF NOT EXISTS auth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_item_id ON products(item_id);
CREATE INDEX IF NOT EXISTS idx_products_last_sync ON products(last_sync);
CREATE INDEX IF NOT EXISTS idx_orders_order_sn ON orders(order_sn);
CREATE INDEX IF NOT EXISTS idx_orders_last_sync ON orders(last_sync);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);