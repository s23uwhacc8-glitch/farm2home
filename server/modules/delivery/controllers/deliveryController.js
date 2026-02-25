/**
 * Delivery Controller
 * Handles delivery agent operations and order tracking
 * All status updates now send email notifications to customers.
 */

const Order = require('../../../core/models/Order');
const User  = require('../../../core/models/User');
const { sendOrderStatusEmail } = require('../../../core/utils/emailService');

class DeliveryController {
  async getMyDeliveries(req, res) {
    try {
      const orders = await Order.find({ 'delivery.agent': req.user._id })
        .populate('user', 'name email phone')
        .populate('items.product', 'name images price')
        .populate('items.farmer', 'name phone')
        .sort({ createdAt: -1 });
      res.json({ success: true, count: orders.length, orders });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  async getAvailableOrders(req, res) {
    try {
      const orders = await Order.find({
        status: { $in: ['payment-approved', 'confirmed', 'ready-to-ship'] },
        'delivery.agent': null
      })
        .populate('user', 'name email phone')
        .populate('items.product', 'name images')
        .sort({ createdAt: -1 });
      res.json({ success: true, count: orders.length, orders });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  async acceptDelivery(req, res) {
    try {
      const order = await Order.findById(req.params.orderId);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      if (order.delivery && order.delivery.agent)
        return res.status(400).json({ success: false, message: 'Order already assigned to another delivery agent' });

      await order.assignDeliveryAgent(req.user._id, req.user._id);
      res.json({ success: true, message: 'Delivery accepted successfully', order });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  async updateDeliveryStatus(req, res) {
    try {
      const { status, deliveryProof } = req.body;

      const validStatuses = ['picked-up', 'in-transit', 'out-for-delivery', 'delivered', 'failed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`
        });
      }

      const order = await Order.findById(req.params.orderId)
        .populate('user', 'name email');

      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      if (!order.delivery?.agent || order.delivery.agent.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this delivery' });
      }

      if (status === 'delivered') {
        await order.markAsDelivered(deliveryProof || {}, req.user._id);
      } else {
        order.delivery.status = status;
        if (status === 'picked-up') order.delivery.pickedUpAt = new Date();

        const orderStatusMap = {
          'picked-up':        'shipped',
          'in-transit':       'shipped',
          'out-for-delivery': 'shipped',
          'failed':           'failed'
        };
        const newOrderStatus = orderStatusMap[status];
        if (newOrderStatus) {
          await order.updateStatus(newOrderStatus, req.user._id, `Delivery status: ${status}`);
        } else {
          await order.save();
        }
      }

      // Send status email to customer (non-blocking)
      const emailStatus = status === 'delivered' ? 'delivered'
        : status === 'picked-up' || status === 'in-transit' || status === 'out-for-delivery' ? 'shipped'
        : null;

      if (emailStatus) {
        const customerEmail = order.user?.email || order.guest?.email;
        const customerName  = order.user?.name  || order.guest?.name || 'Customer';
        if (customerEmail) {
          sendOrderStatusEmail({
            to: customerEmail, name: customerName,
            order, newStatus: emailStatus
          }).catch(() => {});
        }
      }

      res.json({ success: true, message: 'Delivery status updated successfully', order });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  async getDashboardStats(req, res) {
    try {
      const deliveries = await Order.find({ 'delivery.agent': req.user._id });
      const completed  = deliveries.filter(d => d.status === 'delivered');
      const stats = {
        totalDeliveries: deliveries.length,
        pending:         deliveries.filter(d => d.status === 'assigned').length,
        inProgress:      deliveries.filter(d => ['shipped'].includes(d.status)).length,
        completed:       completed.length,
        failed:          deliveries.filter(d => d.status === 'failed').length,
        estimatedEarnings: completed.reduce((sum, o) => sum + (o.payment?.totalAmount || 0) * 0.1, 0)
      };
      res.json({ success: true, stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  async getDeliveryById(req, res) {
    try {
      const order = await Order.findById(req.params.orderId)
        .populate('user', 'name email phone')
        .populate('items.product', 'name images price')
        .populate('items.farmer', 'name phone address');

      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      if (!order.delivery?.agent || order.delivery.agent.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this delivery' });
      }
      res.json({ success: true, order });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }
}

module.exports = new DeliveryController();
