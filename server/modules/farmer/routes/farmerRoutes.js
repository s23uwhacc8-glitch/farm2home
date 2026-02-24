const express = require('express');
const router  = express.Router();
const auth    = require('../../../core/middleware/auth');
const { role } = require('../../../core/middleware/role');
const fc       = require('../controllers/farmerController');

router.use(auth);
router.use(role('farmer'));

// Products
router.get('/products',          fc.getMyProducts);
router.post('/products',         fc.createProduct);
router.put('/products/:id',      fc.updateProduct);
router.patch('/products/:id/stock', fc.updateStock);
router.delete('/products/:id',   fc.deleteProduct);

// Orders
router.get('/orders',                        fc.getFarmerOrders);
router.put('/orders/:orderId/status',        fc.updateOrderStatus);

// Dashboard & analytics
router.get('/dashboard/stats',   fc.getDashboardStats);

// Farmer profile (My Farm tab)
router.get('/profile',           fc.getFarmerProfile);
router.put('/profile',           fc.updateFarmerProfile);

// AI Price Advisor proxy (calls Anthropic server-side so the API key stays secret)
router.post('/ai/price-advisor', fc.aiPriceAdvisor);

// Helpers
router.get('/categories',        fc.getCategories);

module.exports = router;
