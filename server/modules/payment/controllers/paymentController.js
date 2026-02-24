/**
 * Payment Controller
 *
 * Handles the customer-facing payment submission flow and the
 * admin-facing payment approval/rejection workflow.
 *
 * Flow:
 *  1. Customer places order  →  status: 'pending', payment.approvalStatus: 'pending'
 *  2. (Online only) Customer submits proof  →  status: 'payment-pending', approvalStatus: 'verified'
 *  3. Admin reviews  →  approves ('payment-approved') or rejects ('cancelled')
 *  4. (COD) Admin approves at confirmation stage (no proof required)
 */

const Order  = require('../../../core/models/Order');
const { config } = require('../../../core/config/env');
const { uploadPaymentProof } = require('../../../core/utils/cloudinary');

class PaymentController {

  // ─────────────────────────────────────────────────────────────────────────
  // CUSTOMER ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/payment/order/:orderId
   * Load a single order so the customer can see payment instructions.
   * Works for both authenticated users and guests (via guestEmail query param).
   */
  async getOrderForPayment(req, res) {
    try {
      const order = await Order.findById(req.params.orderId)
        .populate('items.product', 'name images price unit')
        .populate('items.farmer', 'name');

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Auth check: logged-in user must own the order, or guest must match email
      if (req.user) {
        if (order.user && order.user.toString() !== req.user._id.toString()) {
          return res.status(403).json({ success: false, message: 'Not authorized' });
        }
      } else {
        const guestEmail = req.query.guestEmail;
        if (!guestEmail || order.guest?.email !== guestEmail) {
          return res.status(403).json({ success: false, message: 'Not authorized' });
        }
      }

      res.json({ success: true, order });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * POST /api/payment/submit-proof/:orderId
   * Customer submits payment proof (transaction ID + optional screenshot URL).
   * Only for online/UPI/bank-transfer orders. COD orders skip this step.
   *
   * Body: { transactionId, paymentProof?, provider? }
   */
  async submitPaymentProof(req, res) {
    try {
      const { transactionId, paymentProof, provider } = req.body;

      if (!transactionId || transactionId.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Transaction ID is required'
        });
      }

      const order = await Order.findById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Ownership check
      if (req.user) {
        if (order.user && order.user.toString() !== req.user._id.toString()) {
          return res.status(403).json({ success: false, message: 'Not authorized' });
        }
      } else {
        const guestEmail = req.query.guestEmail;
        if (!guestEmail || order.guest?.email !== guestEmail) {
          return res.status(403).json({ success: false, message: 'Not authorized' });
        }
      }

      // COD orders don't need proof — they get approved by admin after delivery
      if (order.payment.method === 'cod') {
        return res.status(400).json({
          success: false,
          message: 'Cash on Delivery orders do not require payment proof submission'
        });
      }

      // Prevent double-submission once already verified or approved
      if (['verified', 'approved'].includes(order.payment.approvalStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Payment proof has already been submitted and is under review'
        });
      }

      // Update payment record
      order.payment.transactionId = transactionId.trim();
      if (paymentProof) {
        // Upload screenshot to Cloudinary if it's a base64 image
        if (paymentProof.startsWith('data:')) {
          order.payment.paymentProof = await uploadPaymentProof(paymentProof);
        } else {
          order.payment.paymentProof = paymentProof.trim();
        }
      }
      if (provider) order.payment.provider = provider;
      order.payment.approvalStatus = 'verified'; // marks it as "customer submitted, waiting admin"

      await order.updateStatus('payment-pending', order.user, 'Customer submitted payment proof');

      res.json({
        success: true,
        message: 'Payment proof submitted successfully. Awaiting admin approval.',
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          payment: {
            method: order.payment.method,
            approvalStatus: order.payment.approvalStatus,
            transactionId: order.payment.transactionId
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /api/payment/admin/all
   * Returns all orders grouped / filterable by payment.approvalStatus.
   * Query: ?status=pending|verified|approved|rejected  ?method=cod|online
   */
  async getAllPayments(req, res) {
    try {
      const { status, method } = req.query;
      const filter = {};

      if (status)  filter['payment.approvalStatus'] = status;
      if (method)  filter['payment.method']         = method;

      const orders = await Order.find(filter)
        .populate('user', 'name email phone')
        .populate('items.product', 'name price')
        .sort({ createdAt: -1 });

      // Shape the response so the admin UI gets a flat, readable object
      const payments = orders.map(o => ({
        _id:             o._id,
        orderNumber:     o.orderNumber,
        orderStatus:     o.status,
        createdAt:       o.createdAt,

        // Customer info
        customerName:    o.user?.name  || o.guest?.name  || 'Guest',
        customerEmail:   o.user?.email || o.guest?.email || '—',
        customerPhone:   o.user?.phone || o.guest?.phone || '—',

        // Payment details
        method:          o.payment.method,
        transactionId:   o.payment.transactionId  || null,
        paymentProof:    o.payment.paymentProof   || null,
        provider:        o.payment.provider       || null,
        approvalStatus:  o.payment.approvalStatus,
        approvedBy:      o.payment.approvedBy     || null,
        approvalDate:    o.payment.approvalDate   || null,
        rejectionReason: o.payment.rejectionReason || null,
        paidAt:          o.payment.paidAt         || null,

        // Amounts
        subtotal:        o.payment.subtotal,
        deliveryCharge:  o.payment.deliveryCharge,
        totalAmount:     o.payment.totalAmount,

        // Items snapshot
        items: o.items.map(i => ({
          product: i.product?.name || 'Unknown',
          quantity: i.quantity,
          price: i.price
        }))
      }));

      // Summary counts for the admin dashboard stat cards
      const summary = {
        totalPendingAmount: payments
          .filter(p => ['pending', 'verified'].includes(p.approvalStatus))
          .reduce((s, p) => s + (p.totalAmount || 0), 0),
        counts: {
          pending:  payments.filter(p => p.approvalStatus === 'pending').length,
          verified: payments.filter(p => p.approvalStatus === 'verified').length,
          approved: payments.filter(p => p.approvalStatus === 'approved').length,
          rejected: payments.filter(p => p.approvalStatus === 'rejected').length,
        }
      };

      res.json({ success: true, payments, summary });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * POST /api/payment/admin/:orderId/approve
   * Admin approves a payment (works for both COD and Online).
   * Transitions order to 'payment-approved' → ready for farmer to prepare.
   */
  async approvePayment(req, res) {
    try {
      const { notes } = req.body;

      const order = await Order.findById(req.params.orderId)
        .populate('user', 'name email');

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (order.payment.approvalStatus === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Payment is already approved'
        });
      }

      if (order.payment.approvalStatus === 'rejected') {
        return res.status(400).json({
          success: false,
          message: 'Cannot approve a rejected payment'
        });
      }

      await order.approvePayment(req.user._id);

      if (notes) {
        order.adminNotes = notes;
        await order.save();
      }

      res.json({
        success: true,
        message: `Payment approved for order #${order.orderNumber}`,
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          payment: {
            approvalStatus: order.payment.approvalStatus,
            approvedBy: req.user.name,
            approvalDate: order.payment.approvalDate
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * POST /api/payment/admin/:orderId/reject
   * Admin rejects a payment with a mandatory reason.
   * Order is cancelled and stock is restored.
   */
  async rejectPayment(req, res) {
    try {
      const { reason } = req.body;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      const order = await Order.findById(req.params.orderId)
        .populate('items.product');

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (['approved', 'rejected'].includes(order.payment.approvalStatus)) {
        return res.status(400).json({
          success: false,
          message: `Cannot reject — payment is already ${order.payment.approvalStatus}`
        });
      }

      await order.rejectPayment(req.user._id, reason.trim());

      // Restore product stock when payment is rejected (order cancelled)
      const Product = require('../../../core/models/Product');
      for (const item of order.items) {
        const product = await Product.findById(item.product._id || item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }

      res.json({
        success: true,
        message: `Payment rejected for order #${order.orderNumber}`,
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          payment: {
            approvalStatus: order.payment.approvalStatus,
            rejectionReason: order.payment.rejectionReason
          }
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * GET /api/payment/admin/stats
   * Quick stats for the admin payment dashboard.
   */
  async getPaymentStats(req, res) {
    try {
      const [pending, verified, approved, rejected, totalRevenue] = await Promise.all([
        Order.countDocuments({ 'payment.approvalStatus': 'pending' }),
        Order.countDocuments({ 'payment.approvalStatus': 'verified' }),
        Order.countDocuments({ 'payment.approvalStatus': 'approved' }),
        Order.countDocuments({ 'payment.approvalStatus': 'rejected' }),
        Order.aggregate([
          { $match: { 'payment.approvalStatus': 'approved' } },
          { $group: { _id: null, total: { $sum: '$payment.totalAmount' } } }
        ])
      ]);

      res.json({
        success: true,
        stats: {
          pending,
          verified,   // submitted proof, waiting admin
          approved,
          rejected,
          needsAction: pending + verified,  // what admin should focus on
          totalApprovedRevenue: totalRevenue[0]?.total || 0
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }
}

module.exports = new PaymentController();
