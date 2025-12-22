const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  // ID único da Shopee
  item_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    primaryKey: true
  },
  
  // ID da loja
  shop_id: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true
  },
  
  // Informações básicas
  item_name: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Preços
  price: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  
  original_price: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  
  // Estoque
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Imagens (armazenadas como JSON string)
  images: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('images');
      try {
        return JSON.parse(rawValue);
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('images', JSON.stringify(value || []));
    }
  },
  
  // Status
  status: {
    type: DataTypes.STRING,
    defaultValue: 'NORMAL'
  },
  
  // Métricas
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  sales: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0
  },
  
  rating_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  
  // Controle de sincronização
  last_synced: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'products',
  timestamps: true,
  indexes: [
    { fields: ['shop_id'] },
    { fields: ['item_id'] },
    { fields: ['last_synced'] },
    { fields: ['sales'] },
    { fields: ['rating'] }
  ]
});

module.exports = Product;