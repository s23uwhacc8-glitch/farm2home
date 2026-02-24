/**
 * Admin Module Routes
 * Routes for administrative operations - requires admin role
 */

const express = require('express');
const router = express.Router();
const auth = require('../../../core/middleware/auth');
const { role, adminOnly } = require('../../../core/middleware/role');

// Import controllers
const adminController = require('../controllers/adminController');

// All routes require authentication and admin role
router.use(auth);
router.use(role('admin'));

// ============================================
// USER MANAGEMENT ROUTES
// ============================================

router.get('/users', adminController.getAllUsers);
router.get('/users/pending', adminController.getPendingUserApprovals);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/verify', adminController.toggleUserVerification);
router.put('/users/:id/role', adminController.updateUserRole);
router.post('/users/:id/approve', adminController.approveUser);
router.post('/users/:id/reject', adminController.rejectUser);
router.delete('/users/:id', adminController.deleteUser);

// ============================================
// PRODUCT MANAGEMENT ROUTES
// NOTE: Specific paths (/all, /create) MUST be declared before parameterised
// paths (/:id) so Express does not treat 'all' or 'create' as an :id value.
// ============================================

router.get('/products', adminController.getAllProducts);
router.get('/products/all', adminController.getAllProductsWithInventory);  // before /:id
router.post('/products/create', adminController.createProduct);             // before /:id
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);

// ============================================
// ORDER MANAGEMENT ROUTES
// ============================================

router.get('/orders', adminController.getAllOrders);
router.put('/orders/:id/status', adminController.updateOrderStatus);
router.delete('/orders/:id', adminController.deleteOrder);

// ============================================
// CATEGORY MANAGEMENT ROUTES
// ============================================

router.get('/categories', adminController.getAllCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// ============================================
// FEEDBACK MANAGEMENT ROUTES
// ============================================

router.get('/feedback', adminController.getAllFeedback);
router.put('/feedback/:id/status', adminController.updateFeedbackStatus);
router.delete('/feedback/:id', adminController.deleteFeedback);

// ============================================
// DASHBOARD ROUTES
// ============================================

router.get('/dashboard/stats', adminController.getDashboardStats);

// ============================================
// PAYMENT APPROVAL ROUTES
// ============================================

router.get('/payments/pending', adminController.getPendingPayments);
router.get('/payments/all', adminController.getAllPayments);
router.post('/payments/:id/approve', adminController.approvePayment);
router.post('/payments/:id/reject', adminController.rejectPayment);

// ============================================
// DISPUTE RESOLUTION ROUTES
// ============================================

router.get('/disputes', adminController.getAllDisputes);
router.get('/disputes/:id', adminController.getDisputeDetails);
router.post('/disputes/:id/assign', adminController.assignDispute);
router.post('/disputes/:id/resolve', adminController.resolveDispute);
router.post('/disputes/:id/message', adminController.addDisputeMessage);

// ============================================
// ANALYTICS ROUTES
// ============================================

router.get('/analytics', adminController.getAnalytics);
router.get('/analytics/revenue', adminController.getRevenueAnalytics);

// ============================================
// INVENTORY MANAGEMENT ROUTES
// ============================================

router.get('/inventory', adminController.getInventorySummary);
router.post('/inventory/update', adminController.updateInventory);

// ============================================
// COMMISSION MANAGEMENT ROUTES
// ============================================

router.get('/commissions/rates', adminController.getCommissionRates);
router.get('/commissions/tracking', adminController.getCommissionTracking);
router.post('/commissions/update-rate', adminController.updateCommissionRate);
router.post('/commissions/schedule-payout/:farmerId', adminController.scheduleCommissionPayout);
router.post('/commissions/:id/mark-paid', adminController.markCommissionPaid);

module.exports = router;
