const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SyncLog = sequelize.define('SyncLog', {
  // Tipo de sincronização
  sync_type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['products', 'orders', 'all', 'metrics']]
    }
  },
  
  // Contagem de itens
  items_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Status
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'success', 'partial', 'failed']]
    }
  },
  
  // Mensagem de erro (se houver)
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'sync_logs',
  timestamps: true,
  indexes: [
    { fields: ['sync_type'] },
    { fields: ['status'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = SyncLog;