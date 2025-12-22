const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Caminho do banco de dados
const DB_PATH = path.join(__dirname, '../../database.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// 🔧 FORÇAR RECRIAÇÃO NA PRIMEIRA EXECUÇÃO
const FORCE_RECREATE = process.env.FORCE_RECREATE_DB === 'true';

if (FORCE_RECREATE && fs.existsSync(DB_PATH)) {
  console.log('🗑️ Deletando banco antigo (FORCE_RECREATE_DB=true)...');
  fs.unlinkSync(DB_PATH);
  console.log('✅ Banco antigo deletado');
}

// Verificar se o banco existe
const dbExists = fs.existsSync(DB_PATH);

// Criar conexão
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err);
  } else {
    console.log('✅ Banco de dados conectado:', DB_PATH);
    
    // Se o banco não existia, criar schema
    if (!dbExists || FORCE_RECREATE) {
      initializeDatabase();
    } else {
      console.log('ℹ️ Banco já existe, verificando estrutura...');
      verifyAndRepairSchema();
    }
  }
});

// Verificar e reparar schema
function verifyAndRepairSchema() {
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('❌ Erro ao verificar tabelas:', err);
      return;
    }
    
    const tableNames = tables.map(t => t.name);
    console.log('📋 Tabelas existentes:', tableNames);
    
    // Verificar se tem as colunas corretas
    db.all("PRAGMA table_info(products)", (err, columns) => {
      if (err || !columns || columns.length === 0) {
        console.log('⚠️ Tabela products não existe ou está vazia, recriando...');
        recreateSchema();
        return;
      }
      
      const columnNames = columns.map(c => c.name);
      const requiredColumns = ['update_time', 'create_time', 'item_id'];
      const missingColumns = requiredColumns.filter(c => !columnNames.includes(c));
      
      if (missingColumns.length > 0) {
        console.log('⚠️ Colunas faltando:', missingColumns);
        console.log('🔧 Recriando schema...');
        recreateSchema();
      } else {
        console.log('✅ Schema OK');
      }
    });
  });
}

// Recriar schema do zero
function recreateSchema() {
  console.log('🔧 RECRIANDO SCHEMA DO ZERO...');
  
  const schema = `
-- DELETAR TUDO
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS auth_tokens;
DROP INDEX IF EXISTS idx_products_item_id;
DROP INDEX IF EXISTS idx_products_last_sync;
DROP INDEX IF EXISTS idx_orders_order_sn;
DROP INDEX IF EXISTS idx_orders_last_sync;
DROP INDEX IF EXISTS idx_orders_status;

-- CRIAR TABELAS
CREATE TABLE products (
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
  images TEXT,
  create_time INTEGER,
  update_time INTEGER,
  last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
  raw_data TEXT
);

CREATE TABLE orders (
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
  recipient_address TEXT,
  items TEXT,
  last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
  raw_data TEXT
);

CREATE TABLE auth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CRIAR ÍNDICES
CREATE INDEX idx_products_item_id ON products(item_id);
CREATE INDEX idx_products_last_sync ON products(last_sync);
CREATE INDEX idx_orders_order_sn ON orders(order_sn);
CREATE INDEX idx_orders_last_sync ON orders(last_sync);
CREATE INDEX idx_orders_status ON orders(order_status);
  `;
  
  db.exec(schema, (err) => {
    if (err) {
      console.error('❌ Erro ao recriar schema:', err);
    } else {
      console.log('✅ Schema recriado com sucesso!');
    }
  });
}

// Inicializar schema (primeira vez)
function initializeDatabase() {
  console.log('🔧 Criando schema inicial...');
  recreateSchema();
}

// 
// FUNÇÕES PARA PRODUTOS
// 

// Salvar produtos no banco
function saveProducts(products) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO products (
        item_id, item_name, item_sku, item_status,
        price_current, price_original,
        stock_available, stock_reserved,
        sales, views, rating_star, rating_count,
        images, create_time, update_time,
        last_sync, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `);

    let saved = 0;
    let errors = 0;

    products.forEach(product => {
      const priceInfo = product.price_info?.[0] || {};
      const stockInfo = product.stock_info_v2?.summary_info || {};
      const images = JSON.stringify(product.images || []);
      
      stmt.run(
        product.item_id,
        product.item_name || null,
        product.item_sku || null,
        product.item_status || 'UNKNOWN',
        priceInfo.current_price || 0,
        priceInfo.original_price || 0,
        stockInfo.total_available_stock || 0,
        stockInfo.total_reserved_stock || 0,
        product.sales || 0,
        product.view_count || 0,
        product.item_rating?.rating_star || 0,
        product.item_rating?.rating_count?.[0] || 0,
        images,
        product.create_time || 0,
        product.update_time || 0,
        JSON.stringify(product),
        (err) => {
          if (err) {
            errors++;
            console.error(`❌ Erro ao salvar produto ${product.item_id}:`, err);
          } else {
            saved++;
          }
        }
      );
    });

    stmt.finalize((err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`✅ ${saved} produtos salvos, ${errors} erros`);
        resolve({ saved, errors });
      }
    });
  });
}

// Buscar produtos do banco
function getProducts(filters = {}) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND item_status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (item_name LIKE ? OR item_id LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ' ORDER BY update_time DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(filters.limit, filters.offset || 0);
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Parsear JSON fields
        const products = rows.map(row => ({
          ...row,
          images: JSON.parse(row.images || '[]'),
          raw_data: JSON.parse(row.raw_data || '{}')
        }));
        resolve(products);
      }
    });
  });
}

// Contar produtos
function countProducts(filters = {}) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND item_status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (item_name LIKE ? OR item_id LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.total);
      }
    });
  });
}

// 
// FUNÇÕES PARA PEDIDOS
// 

// Salvar pedidos no banco
function saveOrders(orders) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO orders (
        order_sn, order_status, buyer_username,
        total_amount, shipping_fee, items_count,
        create_time, update_time,
        payment_method, recipient_address, items,
        last_sync, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
    `);

    let saved = 0;
    let errors = 0;

    orders.forEach(order => {
      const details = order.details || {};
      
      stmt.run(
        order.order_sn,
        order.order_status || 'UNKNOWN',
        details.buyer_username || order.buyer_username || null,
        parseFloat(details.total_amount || 0),
        parseFloat(details.actual_shipping_fee || details.estimated_shipping_fee || 0),
        details.item_list?.length || 0,
        order.create_time || 0,
        order.update_time || 0,
        details.payment_method || null,
        JSON.stringify(details.recipient_address || {}),
        JSON.stringify(details.item_list || []),
        JSON.stringify(order),
        (err) => {
          if (err) {
            errors++;
            console.error(`❌ Erro ao salvar pedido ${order.order_sn}:`, err);
          } else {
            saved++;
          }
        }
      );
    });

    stmt.finalize((err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`✅ ${saved} pedidos salvos, ${errors} erros`);
        resolve({ saved, errors });
      }
    });
  });
}

// Buscar pedidos do banco
function getOrders(filters = {}) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (filters.status && filters.status !== 'ALL') {
      query += ' AND order_status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (order_sn LIKE ? OR buyer_username LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters.days) {
      const daysAgo = Math.floor(Date.now() / 1000) - (filters.days * 24 * 60 * 60);
      query += ' AND create_time >= ?';
      params.push(daysAgo);
    }

    query += ' ORDER BY create_time DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(filters.limit, filters.offset || 0);
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Parsear JSON fields
        const orders = rows.map(row => ({
          ...row,
          recipient_address: JSON.parse(row.recipient_address || '{}'),
          items: JSON.parse(row.items || '[]'),
          raw_data: JSON.parse(row.raw_data || '{}')
        }));
        resolve(orders);
      }
    });
  });
}

// Contar pedidos
function countOrders(filters = {}) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
    const params = [];

    if (filters.status && filters.status !== 'ALL') {
      query += ' AND order_status = ?';
      params.push(filters.status);
    }

    if (filters.days) {
      const daysAgo = Math.floor(Date.now() / 1000) - (filters.days * 24 * 60 * 60);
      query += ' AND create_time >= ?';
      params.push(daysAgo);
    }

    db.get(query, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row.total);
      }
    });
  });
}

// 
// FUNÇÕES PARA TOKENS
// 

// Salvar tokens
function saveTokens(shopId, accessToken, refreshToken, expiresIn) {
  return new Promise((resolve, reject) => {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
    
    db.run(`
      INSERT OR REPLACE INTO auth_tokens (shop_id, access_token, refresh_token, expires_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [shopId, accessToken, refreshToken, expiresAt], (err) => {
      if (err) {
        reject(err);
      } else {
        console.log('✅ Tokens salvos no banco');
        resolve();
      }
    });
  });
}

// Buscar tokens
function getTokens(shopId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM auth_tokens WHERE shop_id = ?', [shopId], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Verificar se token expirou
function isTokenExpired(expiresAt) {
  const now = Math.floor(Date.now() / 1000);
  return now >= (expiresAt - 300); // 5 minutos de margem
}

module.exports = {
  db,
  saveProducts,
  getProducts,
  countProducts,
  saveOrders,
  getOrders,
  countOrders,
  saveTokens,
  getTokens,
  isTokenExpired
};