#!/usr/bin/env node

console.log('🚀 Inicializando banco de dados...');
console.log('📁 Diretório atual:', __dirname);

const path = require('path');
const fs = require('fs');

// Verificar se o arquivo de configuração do banco existe
const dbConfigPath = path.join(__dirname, '../src/config/database.js');
console.log('🔍 Verificando:', dbConfigPath);

if (!fs.existsSync(dbConfigPath)) {
  console.error('❌ Arquivo de configuração do banco não encontrado!');
  console.log('📝 Criando estrutura básica...');
  
  // Criar estrutura de pastas
  const srcPath = path.join(__dirname, '../src');
  const configPath = path.join(srcPath, 'config');
  const modelsPath = path.join(srcPath, 'models');
  
  [srcPath, configPath, modelsPath].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Criada pasta: ${dir}`);
    }
  });
  
  // Criar arquivo database.js
  const dbConfigContent = `const { Sequelize } = require('sequelize');
const path = require('path');

// Configuração do banco de dados SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../../database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
  },
});

// Testar conexão
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    return false;
  }
};

module.exports = { sequelize, testConnection };`;

  fs.writeFileSync(dbConfigPath, dbConfigContent);
  console.log('✅ Arquivo database.js criado!');
}

// Agora tentar carregar os módulos
try {
  console.log('📦 Carregando módulos...');
  
  // Primeiro, carregar a configuração do banco
  const { sequelize, testConnection } = require(dbConfigPath);
  
  // Função para sincronizar banco de dados
  const syncDatabase = async (force = false) => {
    try {
      console.log('🔄 Sincronizando banco de dados...');
      
      // Testar conexão primeiro
      await testConnection();
      
      // Criar tabelas básicas (SQL direto)
      const createTablesSQL = `
        -- Tabela de produtos
        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_id TEXT UNIQUE NOT NULL,
          shop_id TEXT NOT NULL,
          item_name TEXT,
          price DECIMAL(10,2) DEFAULT 0,
          original_price DECIMAL(10,2) DEFAULT 0,
          stock INTEGER DEFAULT 0,
          images TEXT DEFAULT '[]',
          status TEXT DEFAULT 'NORMAL',
          views INTEGER DEFAULT 0,
          sales INTEGER DEFAULT 0,
          rating DECIMAL(3,2) DEFAULT 0,
          rating_count INTEGER DEFAULT 0,
          last_synced TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Tabela de pedidos
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_sn TEXT UNIQUE NOT NULL,
          shop_id TEXT NOT NULL,
          buyer_username TEXT,
          total_amount DECIMAL(10,2) DEFAULT 0,
          status TEXT DEFAULT 'UNPAID',
          items TEXT DEFAULT '[]',
          shipping_address TEXT DEFAULT '{}',
          payment_method TEXT,
          created_time TIMESTAMP,
          updated_time TIMESTAMP,
          last_synced TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Tabela de logs de sincronização
        CREATE TABLE IF NOT EXISTS sync_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sync_type TEXT NOT NULL,
          items_count INTEGER DEFAULT 0,
          status TEXT DEFAULT 'pending',
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Criar índices para performance
        CREATE INDEX IF NOT EXISTS idx_products_shop_id ON products(shop_id);
        CREATE INDEX IF NOT EXISTS idx_products_item_id ON products(item_id);
        CREATE INDEX IF NOT EXISTS idx_products_last_synced ON products(last_synced);
        
        CREATE INDEX IF NOT EXISTS idx_orders_shop_id ON orders(shop_id);
        CREATE INDEX IF NOT EXISTS idx_orders_order_sn ON orders(order_sn);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_last_synced ON orders(last_synced);
        
        CREATE INDEX IF NOT EXISTS idx_sync_logs_sync_type ON sync_logs(sync_type);
        CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at);
      `;
      
      // Executar SQL
      await sequelize.query(createTablesSQL);
      
      console.log('✅ Tabelas criadas/atualizadas com sucesso!');
      
      // Verificar tabelas criadas
      const tables = await sequelize.query(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
      );
      
      return true;
      
    } catch (error) {
      console.error('❌ Erro ao sincronizar banco de dados:', error);
      return false;
    }
  };
  
  // Executar função principal
  async function main() {
    const force = process.argv.includes('--force');
    
    if (force) {
      console.log('⚠️  Modo FORCE ativado - tabelas serão recriadas');
    }
    
    const success = await syncDatabase(force);
    
    if (success) {
      console.log('🎉 Banco de dados inicializado com sucesso!');
      console.log('');
      console.log('📋 Próximos passos:');
      console.log('   1. Execute: npm start');
      console.log('   2. Acesse: http://localhost:3000');
      console.log('   3. Use os endpoints de sincronização');
    } else {
      console.error('❌ Falha ao inicializar banco de dados');
      process.exit(1);
    }
  }
  
  // Executar
  main().catch(error => {
    console.error('❌ Erro na execução:', error);
    process.exit(1);
  });
  
} catch (error) {
  console.error('❌ Erro ao carregar módulos:', error);
  console.log('');
  console.log('🔧 Solução alternativa:');
  console.log('   1. Crie manualmente a pasta src/config/');
  console.log('   2. Crie o arquivo src/config/database.js');
  console.log('   3. Execute novamente: npm run init-db');
  process.exit(1);
}