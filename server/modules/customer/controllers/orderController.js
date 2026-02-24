/**
 * Customer Order Controller
 * Handles order creation and customer order management
 */

const Order   = require('../../../core/models/Order');
const Product = require('../../../core/models/Product');
const { sendOrderConfirmationEmail } = require('../../../core/utils/emailService');

class OrderController {
  /**
   * Create new order
   * PUBLIC - Supports both guest and authenticated users
   *
   * BUGS FIXED:
   * - Order model requires `deliveryAddress` (street/city/state/pincode) and
   *   `payment` (method/subtotal/totalAmount). Old code used non-existent
   *   top-level fields `totalAmount` and `paymentMethod`.
   * - `delivery.agent` is the correct path — not `deliveryAgent`.
   */
  async createOrder(req, res) {
    try {
      const { items, guest, paymentMethod, deliveryAddress, notes, payment } = req.body;

      // Must have either a logged-in user or guest info
      if (!req.user && (!guest || !guest.name || !guest.email || !guest.phone)) {
        return res.status(400).json({
          success: false,
          message: 'Guest information (name, email, phone) is required for guest checkout'
        });
      }

      // deliveryAddress is required by the Order model
      if (
        !deliveryAddress ||
        !deliveryAddress.street ||
        !deliveryAddress.city ||
        !deliveryAddress.state ||
        !deliveryAddress.pincode
      ) {
        return res.status(400).json({
          success: false,
          message: 'Complete delivery address (street, city, state, pincode) is required'
        });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
      }

      // Validate items and calculate subtotal
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({ success: false, message: `Product ${item.product} not found` });
        }
        if (!product.isAvailable) {
          return res.status(400).json({ success: false, message: `${product.name} is not currently available` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
          });
        }

        orderItems.push({
          product: product._id,
          quantity: item.quantity,
          price: product.price,
          unit: product.unit,
          farmer: product.farmer
        });

        subtotal += product.price * item.quantity;

        // Deduct stock immediately
        product.stock -= item.quantity;
        await product.save();
      }

      const deliveryCharge = 40; // Fixed delivery charge (₹40)
      const totalAmount = subtotal + deliveryCharge;

      // Normalise payment method to lowercase to match schema enum ('online'|'cod'|'wallet')
      const method = (paymentMethod || 'cod').toLowerCase() === 'cod' ? 'cod' : 'online';

      // Build payment object
      const paymentData = {
        method,
        subtotal,
        deliveryCharge,
        totalAmount,
        // COD: payment is collected at delivery — starts as pending, no pre-approval needed
        // Online: requires admin to verify payment proof before processing
        approvalStatus: method === 'cod' ? 'approved' : 'pending',
        status: 'pending'  // Always pending at creation — COD is paid on delivery, online after admin verification
      };

      // Note: paidAt is set only when cash is actually collected (on delivery via markAsDelivered)

      // For online payments, include transaction ID and payment proof if provided
      if (method === 'online' && payment) {
        if (payment.transactionId) paymentData.transactionId = payment.transactionId;
        if (payment.paymentProof) paymentData.paymentProof = payment.paymentProof;
        if (payment.provider) paymentData.provider = payment.provider;
      }

      const order = new Order({
        user: req.user ? req.user._id : null,
        guest: req.user ? null : guest,
        items: orderItems,
        deliveryAddress,
        payment: paymentData,
        orderNotes: notes,
        // COD orders start as 'confirmed' (cash collected on delivery), online orders start as 'pending' (awaiting payment proof)
        status: method === 'cod' ? 'confirmed' : 'pending'
      });

      await order.save();
      await order.populate('items.product', 'name images price');

      // Send order confirmation email (non-blocking)
      const customerEmail = req.user?.email || guest?.email;
      const customerName  = req.user?.name  || guest?.name || 'Customer';
      if (customerEmail) {
        sendOrderConfirmationEmail({ to: customerEmail, name: customerName, order }).catch(() => {});
      }

      res.status(201).json({ success: true, message: 'Order placed successfully', order });
    } catch (error) {
      console.error('createOrder error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * Get customer's orders
   * AUTHENTICATED - Customer can view their own orders
   * BUG FIXED: `delivery.agent` path (was `deliveryAgent`)
   */
  async getMyOrders(req, res) {
    try {
      const orders = await Order.find({ user: req.user._id })
        .populate('items.product', 'name images price')
        .populate('items.farmer', 'name')
        .populate('delivery.agent', 'name phone')
        .sort({ createdAt: -1 });

      res.json({ success: true, orders });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * Get single order details
   * AUTHENTICATED - Customer can view their own order details
   * BUG FIXED: `delivery.agent` path (was `deliveryAgent`)
   */
  async getOrderById(req, res) {
    try {
      const order = await Order.findById(req.params.id)
        .populate('items.product', 'name images price')
        .populate('items.farmer', 'name phone email')
        .populate('delivery.agent', 'name phone');

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Admins can view any order; customers only their own
      if (
        req.user.role !== 'admin' &&
        order.user &&
        order.user.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      res.json({ success: true, order });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * Track order by Order ID
   * PUBLIC - Anyone with order ID can track (for guest orders)
   * For logged-in users, validates order belongs to them
   * 
   * Usage:
   * - Guest users: POST /api/customer/orders/track with { orderId, email }
   * - Logged-in users: Can track any of their orders without email verification
   */
  async trackOrder(req, res) {
    try {
      const { orderId, email } = req.body;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      // Find the order
      const order = await Order.findById(orderId)
        .populate('items.product', 'name images price unit')
        .populate('items.farmer', 'name phone')
        .populate('delivery.agent', 'name phone');

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found. Please check your Order ID.'
        });
      }

      // If user is logged in, verify order belongs to them
      if (req.user) {
        if (order.user && order.user.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'This order does not belong to you'
          });
        }
      } 
      // If not logged in (guest), verify email matches
      else {
        if (!email) {
          return res.status(400).json({
            success: false,
            message: 'Email is required to track guest orders'
          });
        }

        // For guest orders, verify email
        if (order.guest) {
          if (order.guest.email.toLowerCase() !== email.toLowerCase()) {
            return res.status(403).json({
              success: false,
              message: 'Email does not match order records'
            });
          }
        } 
        // For user orders accessed as guest, don't allow
        else if (order.user) {
          return res.status(403).json({
            success: false,
            message: 'This order requires login to track. Please log in to your account.'
          });
        }
      }

      // Return order with tracking information
      res.json({
        success: true,
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          items: order.items,
          deliveryAddress: order.deliveryAddress,
          payment: {
            method: order.payment.method,
            totalAmount: order.payment.totalAmount,
            status: order.payment.status
          },
          delivery: order.delivery,
          timeline: order.statusHistory,
          estimatedDelivery: order.estimatedDelivery
        }
      });
    } catch (error) {
      console.error('trackOrder error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: error.message
      });
    }
  }

  /**
   * Cancel order
   * AUTHENTICATED - Customer can cancel their pending orders
   * BUG FIXED: Uses cancelOrder() model method for proper status history tracking.
   */
  async cancelOrder(req, res) {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (order.user && order.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      // Only allow cancellation at early stages
      const cancellableStatuses = ['pending', 'payment-pending', 'confirmed'];
      if (!cancellableStatuses.includes(order.status)) {
        return res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled at this stage'
        });
      }

      const { reason } = req.body;
      await order.cancelOrder('customer', reason || 'Cancelled by customer', req.user._id);

      // Restore product stock
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }

      res.json({ success: true, message: 'Order cancelled successfully', order });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }
}

module.exports = new OrderController();
