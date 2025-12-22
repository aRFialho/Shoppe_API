// ========================================
// ROTAS DE PRODUTOS - Shopee Manager
// Definição de todas as rotas CRUD para produtos
// ========================================

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// ========================================
// ROTAS PRINCIPAIS
// ========================================

// GET /api/products/stats - Estatísticas (deve vir antes de /:id)
router.get('/stats', productController.getProductStats);

// GET /api/products - Listar todos os produtos
router.get('/', productController.getAllProducts);

// GET /api/products/:id - Buscar produto por ID
router.get('/:id', productController.getProductById);

// PUT /api/products/:id - Atualizar produto
router.put('/:id', productController.updateProduct);

// DELETE /api/products/:id - Deletar produto
router.delete('/:id', productController.deleteProduct);

module.exports = router;
