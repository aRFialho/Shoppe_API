const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  // ID único da Shopee
  order_sn: {
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
  
  // Informações do cliente
  buyer_username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Valores
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  
  // Status
  status: {
    type: DataTypes.STRING,
    defaultValue: 'UNPAID'
  },
  
  // Itens do pedido (armazenados como JSON string)
  items: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
    get() {
      const rawValue = this.getDataValue('items');
      try {
        return JSON.parse(rawValue);
      } catch {
        return [];
      }
    },
    set(value) {
      this.setDataValue('items', JSON.stringify(value || []));
    }
  },
  
  // Endereço de entrega
  shipping_address: {
    type: DataTypes.TEXT,
    defaultValue: '{}',
    get() {
      const rawValue = this.getDataValue('shipping_address');
      try {
        return JSON.parse(rawValue);
      } catch {
        return {};
      }
    },
    set(value) {
      this.setDataValue('shipping_address', JSON.stringify(value || {}));
    }
  },
  
  // Método de pagamento
  payment_method: {
    type: DataTypes.STRING,
    allowNull: true
  },
  
  // Datas da Shopee
  created_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  updated_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Controle de sincronização
  last_synced: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    { fields: ['shop_id'] },
    { fields: ['order_sn'] },
    { fields: ['status'] },
    { fields: ['last_synced'] },
    { fields: ['created_time'] }
  ]
});

module.exports = Order;