const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Caminho do banco de dados
const DB_PATH = path.join(__dirname, '../../database.sqlite');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Criar conexão
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao banco:', err);
  } else {
    console.log('✅ Banco de dados conectado:', DB_PATH);
    initializeDatabase();
  }
});

// Inicializar schema
function initializeDatabase() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema, (err) => {
    if (err) {
      console.error('❌ Erro ao criar schema:', err);
    } else {
      console.log('✅ Schema do banco inicializado');
    }
  });
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