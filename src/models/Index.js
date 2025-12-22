const Product = require('./Product');
const Order = require('./Order');
const SyncLog = require('./SyncLog');
const { sequelize } = require('../config/database');

// Exportar modelos
module.exports = {
  Product,
  Order,
  SyncLog,
  sequelize
};

// Inicializar associações (se necessário no futuro)
const initAssociations = () => {
  // Aqui você pode definir relações entre modelos
  // Exemplo: Order.belongsTo(Product, { foreignKey: 'product_id' });
};

// Função para sincronizar todos os modelos
const syncDatabase = async (force = false) => {
  try {
    console.log('🔄 Sincronizando banco de dados...');
    
    // Sincronizar modelos
    await Product.sync({ force });
    await Order.sync({ force });
    await SyncLog.sync({ force });
    
    console.log('✅ Banco de dados sincronizado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao sincronizar banco de dados:', error);
    return false;
  }
};

module.exports.initAssociations = initAssociations;
module.exports.syncDatabase = syncDatabase;