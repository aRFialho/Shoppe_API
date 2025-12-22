// ========================================
// CONTROLLER DE PRODUTOS - Shopee Manager
// Lógica de negócio para gestão de produtos
// ========================================

const { Product } = require('../models/index');
const { Op } = require('sequelize');

// ========================================
// LISTAR TODOS OS PRODUTOS (GET /api/products)
// ========================================
const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      search,
      sort = 'created_at',
      order = 'DESC',
    } = req.query;

    // Construir filtros dinâmicos
    const where = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category_name = { [Op.like]: `%${category}%` };
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    // Calcular offset para paginação
    const offset = (page - 1) * limit;

    // Buscar produtos com paginação
    const { count, rows: products } = await Product.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]],
      attributes: {
        exclude: ['deleted_at'], // Não retornar campo de soft delete
      },
    });

    // Calcular estatísticas
    const totalPages = Math.ceil(count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          status,
          category,
          search,
          sort,
          order,
        },
      },
      message: `${count} produto(s) encontrado(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao buscar produtos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar os produtos',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// BUSCAR PRODUTO POR ID (GET /api/products/:id)
// ========================================
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      attributes: {
        exclude: ['deleted_at'],
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
        message: `Produto com ID ${id} não existe`,
        timestamp: new Date().toISOString(),
      });
    }

    // Adicionar métricas calculadas
    const productData = product.toJSON();
    productData.profit = product.calculateProfit();
    productData.profit_margin = product.calculateProfitMargin();
    productData.is_low_stock = product.isLowStock();

    res.json({
      success: true,
      data: productData,
      message: 'Produto encontrado com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao buscar produto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível buscar o produto',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// ATUALIZAR PRODUTO (PUT /api/products/:id)
// ========================================
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Buscar produto existente
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
        message: `Produto com ID ${id} não existe`,
        timestamp: new Date().toISOString(),
      });
    }

    // Validações
    if (updateData.price && updateData.price < 0) {
      return res.status(400).json({
        success: false,
        error: 'Preço inválido',
        message: 'O preço não pode ser negativo',
        timestamp: new Date().toISOString(),
      });
    }

    // Converter tipos numéricos
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.original_price)
      updateData.original_price = parseFloat(updateData.original_price);
    if (updateData.cost_price)
      updateData.cost_price = parseFloat(updateData.cost_price);
    if (updateData.stock_quantity)
      updateData.stock_quantity = parseInt(updateData.stock_quantity);
    if (updateData.min_stock_alert)
      updateData.min_stock_alert = parseInt(updateData.min_stock_alert);
    if (updateData.weight) updateData.weight = parseFloat(updateData.weight);

    // Atualizar produto
    await product.update(updateData);

    // Retornar produto atualizado com métricas
    const productData = product.toJSON();
    productData.profit = product.calculateProfit();
    productData.profit_margin = product.calculateProfitMargin();
    productData.is_low_stock = product.isLowStock();

    res.json({
      success: true,
      data: productData,
      message: 'Produto atualizado com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar produto:', error);

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        message: error.errors.map(e => e.message).join(', '),
        timestamp: new Date().toISOString(),
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível atualizar o produto',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// DELETAR PRODUTO (DELETE /api/products/:id)
// ========================================
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produto não encontrado',
        message: `Produto com ID ${id} não existe`,
        timestamp: new Date().toISOString(),
      });
    }

    // Soft delete (paranoid: true no modelo)
    await product.destroy();

    res.json({
      success: true,
      message: 'Produto removido com sucesso',
      data: {
        id: product.id,
        name: product.name,
        deleted_at: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao deletar produto:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível remover o produto',
      timestamp: new Date().toISOString(),
    });
  }
};

// ========================================
// ESTATÍSTICAS DE PRODUTOS (GET /api/products/stats)
// ========================================
const getProductStats = async (req, res) => {
  try {
    // Contar produtos por status
    const statusStats = await Product.findAll({
      attributes: [
        'status',
        [Product.sequelize.fn('COUNT', Product.sequelize.col('id')), 'count'],
      ],
      group: ['status'],
    });

    // Produtos com estoque baixo
    const lowStockProducts = await Product.getLowStockProducts();

    // Estatísticas gerais
    const totalProducts = await Product.count();
    const activeProducts = await Product.count({ where: { status: 'active' } });

    // Valor total do estoque
    const stockValue = await Product.sum('price', {
      where: { status: 'active' },
    });

    res.json({
      success: true,
      data: {
        total_products: totalProducts,
        active_products: activeProducts,
        status_breakdown: statusStats,
        low_stock_count: lowStockProducts.length,
        low_stock_products: lowStockProducts.slice(0, 5), // Primeiros 5
        total_stock_value: stockValue || 0,
      },
      message: 'Estatísticas obtidas com sucesso',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Não foi possível obter as estatísticas',
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStats,
};
