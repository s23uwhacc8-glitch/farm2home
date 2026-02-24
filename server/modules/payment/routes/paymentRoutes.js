/**
 * Payment Module Routes
 *
 * Customer routes  →  /api/payment/*
 * Admin routes     →  /api/payment/admin/*  (requires auth + admin role)
 */

const express    = require('express');
const router     = express.Router();
const auth       = require('../../../core/middleware/auth');
const { role }   = require('../../../core/middleware/role');
const controller = require('../controllers/paymentController');

// ─── Optional auth helper ────────────────────────────────────────────────────
// Routes that support BOTH logged-in users and guests use this middleware.
// It tries to verify the token but does not block the request if none is present.
const optionalAuth = (req, res, next) => {
  const header = req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) return next(); // no token → continue as guest
  auth(req, res, next);
};

// ─── Customer routes ─────────────────────────────────────────────────────────

// Get order details for the payment page (guest-friendly)
router.get('/order/:orderId', optionalAuth, controller.getOrderForPayment);

// Submit payment proof for online orders (guest-friendly)
router.post('/submit-proof/:orderId', optionalAuth, controller.submitPaymentProof);

// ─── Admin routes ─────────────────────────────────────────────────────────────
// All /admin/* routes require a valid JWT token AND admin role

router.get('/admin/stats',           auth, role('admin'), controller.getPaymentStats);
router.get('/admin/all',             auth, role('admin'), controller.getAllPayments);
router.post('/admin/:orderId/approve', auth, role('admin'), controller.approvePayment);
router.post('/admin/:orderId/reject',  auth, role('admin'), controller.rejectPayment);

module.exports = router;
