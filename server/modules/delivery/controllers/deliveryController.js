/**
 * Delivery Controller
 * Handles delivery agent operations and order tracking
 *
 * BUGS FIXED THROUGHOUT:
 * - All queries/fields used `deliveryAgent` — the correct path is `delivery.agent`
 * - Revenue/earnings used `order.totalAmount` — the correct path is `order.payment.totalAmount`
 * - acceptDelivery set `order.deliveryAgent` — fixed to `order.delivery.agent`
 * - updateDeliveryStatus checked `order.deliveryAgent` — fixed to `order.delivery?.agent`
 */

const Order = require('../../../core/models/Order');
const User = require('../../../core/models/User');

class DeliveryController {
  /**
   * Get delivery agent's assigned orders
   * AUTHENTICATED - Delivery agent only
   */
  async getMyDeliveries(req, res) {
    try {
      const orders = await Order.find({ 'delivery.agent': req.user._id })  // was: deliveryAgent
        .populate('user', 'name email phone')
        .populate('items.product', 'name images price')
        .populate('items.farmer', 'name phone')
        .sort({ createdAt: -1 });

      res.json({ success: true, count: orders.length, orders });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * Get available orders for delivery (unassigned, ready to ship)
   * AUTHENTICATED - Delivery agent can view unassigned orders
   */
  async getAvailableOrders(req, res) {
    try {
      const orders = await Order.find({
        status: { $in: ['payment-approved', 'confirmed', 'ready-to-ship'] },
        'delivery.agent': null  // was: deliveryAgent: null
      })
        .populate('user', 'name email phone')
        .populate('items.product', 'name images')
        .sort({ createdAt: -1 });

      res.json({ success: true, count: orders.length, orders });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * Accept delivery assignment
   * AUTHENTICATED - Delivery agent can self-assign an available order
   *
   * BUG FIXED: Was setting `order.deliveryAgent` — correct field is `order.delivery.agent`
   * BUG FIXED: Uses assignDeliveryAgent() model method for proper status history tracking
   */
  async acceptDelivery(req, res) {
    try {
      const order = await Order.findById(req.params.orderId);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      if (order.delivery && order.delivery.agent) {
        return res.status(400).json({ success: false, message: 'Order already assigned to another delivery agent' });
      }

      await order.assignDeliveryAgent(req.user._id, req.user._id);

      res.json({ success: true, message: 'Delivery accepted successfully', order });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * Update delivery status
   * AUTHENTICATED - Delivery agent can update their delivery status
   *
   * BUG FIXED: Was checking `order.deliveryAgent` — correct path is `order.delivery?.agent`
   * BUG FIXED: Uses markAsDelivered() model method when status is 'delivered'
   */
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

      const order = await Order.findById(req.params.orderId);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // Ensure this delivery agent is assigned to this order
      if (!order.delivery?.agent || order.delivery.agent.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this delivery' });
      }

      if (status === 'delivered') {
        // Use the model method which also marks payment complete and updates history
        await order.markAsDelivered(deliveryProof || {}, req.user._id);
      } else {
        // Update delivery tracking status
        order.delivery.status = status;
        if (status === 'picked-up') order.delivery.pickedUpAt = new Date();

        // Map delivery status to order-level status
        const orderStatusMap = {
          'picked-up': 'shipped',
          'in-transit': 'shipped',
          'out-for-delivery': 'shipped',
          'failed': 'failed'
        };
        const newOrderStatus = orderStatusMap[status];
        if (newOrderStatus) {
          await order.updateStatus(newOrderStatus, req.user._id, `Delivery status: ${status}`);
        } else {
          await order.save();
        }
      }

      res.json({ success: true, message: 'Delivery status updated successfully', order });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * Get delivery dashboard statistics
   * AUTHENTICATED - Delivery agent only
   *
   * BUG FIXED: Was querying `{ deliveryAgent: req.user._id }` — correct: `{ 'delivery.agent': req.user._id }`
   * BUG FIXED: Was using `order.totalAmount` — correct: `order.payment?.totalAmount`
   */
  async getDashboardStats(req, res) {
    try {
      const deliveries = await Order.find({ 'delivery.agent': req.user._id });

      const completed = deliveries.filter(d => d.status === 'delivered');

      const stats = {
        totalDeliveries: deliveries.length,
        pending: deliveries.filter(d => d.status === 'assigned').length,
        inProgress: deliveries.filter(d => ['shipped'].includes(d.status)).length,
        completed: completed.length,
        failed: deliveries.filter(d => d.status === 'failed').length,
        // Estimated 10% commission on delivered orders
        estimatedEarnings: completed.reduce(
          (sum, order) => sum + (order.payment?.totalAmount || 0) * 0.1,
          0
        )
      };

      res.json({ success: true, stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /**
   * Get single delivery details
   * AUTHENTICATED - Delivery agent can view their assigned delivery details
   *
   * BUG FIXED: Was checking `order.deliveryAgent` — correct: `order.delivery?.agent`
   */
  async getDeliveryById(req, res) {
    try {
      const order = await Order.findById(req.params.orderId)
        .populate('user', 'name email phone')
        .populate('items.product', 'name images price')
        .populate('items.farmer', 'name phone address');

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

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
