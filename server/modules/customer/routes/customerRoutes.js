/**
 * Customer Module Routes
 * Public-facing routes for customers to browse products and place orders
 */

const express = require('express');
const router = express.Router();
const auth = require('../../../core/middleware/auth');
const { optionalAuth } = require('../../../core/middleware/auth');

// Import controllers
const productController      = require('../controllers/productController');
const orderController        = require('../controllers/orderController');
const farmerPublicController = require('../controllers/farmerPublicController');

// ============================================
// PRODUCT ROUTES (Public)
// ============================================

// Cities for location filter (MUST be before /products/:id to avoid route shadowing)
router.get('/products/cities', productController.getFarmerCities);

// Get all products with filtering
// PUBLIC - No authentication required
router.get('/products', productController.getAllProducts);

// Get single product details
// PUBLIC - No authentication required
router.get('/products/:id', productController.getProductById);

// Price history for sparkline chart (public)
router.get('/products/:id/price-history', productController.getPriceHistory);

// Add product review
// AUTHENTICATED - Requires login
router.post('/products/:id/review', auth, productController.addReview);

// ============================================
// FARMER PUBLIC ROUTES
// ============================================

// List all approved farmers with stats + rank/rating filters
// PUBLIC - No authentication required
router.get('/farmers', farmerPublicController.listFarmers);

// Get single farmer public profile + products + reviews
// PUBLIC - No authentication required
router.get('/farmers/:id', farmerPublicController.getFarmerProfile);

// ============================================
// ORDER ROUTES
// ============================================

// Track order by ID
// PUBLIC - Anyone with order ID + email can track (for guest orders)
// OPTIONAL AUTH - Logged-in users don't need email verification
router.post('/orders/track', optionalAuth, orderController.trackOrder);

// Create new order
// OPTIONAL AUTH - Supports both guest and authenticated checkout
// If user is logged in, req.user will be set; otherwise, guest info must be provided
router.post('/orders', optionalAuth, orderController.createOrder);

// Get customer's orders
// AUTHENTICATED - Customer can view their orders
router.get('/orders', auth, orderController.getMyOrders);

// Get single order details
// AUTHENTICATED - Customer can view specific order
router.get('/orders/:id', auth, orderController.getOrderById);

// Cancel order
// AUTHENTICATED - Customer can cancel pending orders
router.post('/orders/:id/cancel', auth, orderController.cancelOrder);

module.exports = router;
