/**
 * Delivery Module Routes
 * Routes for delivery agents to manage their deliveries
 */

const express = require('express');
const router = express.Router();
const auth = require('../../../core/middleware/auth');
const { role, deliveryOnly } = require('../../../core/middleware/role');

// Import controllers
const deliveryController = require('../controllers/deliveryController');

// All routes require authentication and delivery role
router.use(auth);
router.use(role('delivery'));

// ============================================
// DELIVERY MANAGEMENT ROUTES
// ============================================

// Get delivery agent's assigned orders
router.get('/deliveries', deliveryController.getMyDeliveries);

// Get available orders for delivery
router.get('/available', deliveryController.getAvailableOrders);

// Accept a delivery assignment
router.post('/deliveries/:orderId/accept', deliveryController.acceptDelivery);

// Update delivery status
router.put('/deliveries/:orderId/status', deliveryController.updateDeliveryStatus);

// Get single delivery details
router.get('/deliveries/:orderId', deliveryController.getDeliveryById);

// ============================================
// DASHBOARD ROUTES
// ============================================

// Get delivery dashboard statistics
router.get('/dashboard/stats', deliveryController.getDashboardStats);

module.exports = router;
