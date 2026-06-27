const express = require('express');
const router = express.Router();

const { login, getProfile } = require('../controllers/authController');
const { getCategories, getProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const { createOrder, getOrders, getOrderById, processPayment, updateOrderStatus } = require('../controllers/orderController');
const { getDashboardReports, getSalesReports, getPosReports } = require('../controllers/reportController');
const { registerClient } = require('../config/sse');
const { authenticateToken, verifyRoles } = require('../middleware/authMiddleware');

// Real-time Event Stream (SSE)
router.get('/realtime', registerClient);

// Auth Routes
router.post('/auth/login', login);
router.get('/auth/profile', authenticateToken, getProfile);

// Menu & Category Routes
router.get('/categories', getCategories);
router.get('/products', getProducts);
router.post('/products', authenticateToken, verifyRoles('owner', 'manager'), createProduct);
router.put('/products/:id', authenticateToken, verifyRoles('owner', 'manager'), updateProduct);
router.delete('/products/:id', authenticateToken, verifyRoles('owner', 'manager'), deleteProduct);

// Orders Routes
router.post('/orders', createOrder); // Open for customers and guests (checks loyalty within body)
router.get('/orders', authenticateToken, verifyRoles('owner', 'manager', 'cashier', 'kitchen'), getOrders);
router.get('/orders/:id', getOrderById);
router.post('/orders/:id/pay', authenticateToken, verifyRoles('owner', 'cashier'), processPayment);
router.put('/orders/:id/status', authenticateToken, verifyRoles('owner', 'cashier', 'kitchen'), updateOrderStatus);

// Report Routes
router.get('/reports/dashboard', authenticateToken, verifyRoles('owner', 'manager'), getDashboardReports);
router.get('/reports/sales', authenticateToken, verifyRoles('owner', 'manager'), getSalesReports);
router.get('/reports/pos', authenticateToken, verifyRoles('owner', 'manager'), getPosReports);

module.exports = router;
