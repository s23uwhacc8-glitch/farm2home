/**
 * Admin Controller
 * Handles all administrative operations - users, products, orders, categories
 */

const User = require('../../../core/models/User');
const Product = require('../../../core/models/Product');
const Order = require('../../../core/models/Order');
const Category = require('../../../core/models/Category');
const Feedback = require('../../../core/models/Feedback');
const Dispute = require('../../../core/models/Dispute');
const Commission = require('../../../core/models/Commission');

class AdminController {
  // ============================================
  // USER MANAGEMENT
  // ============================================

  async getAllUsers(req, res) {
    try {
      const users = await User.find().select('-password').sort({ createdAt: -1 });
      res.json({ success: true, count: users.length, users });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  async updateUser(req, res) {
    try {
      // Whitelist safe fields — never allow direct password, role, or accountStatus
      // overwrite through this endpoint (use dedicated endpoints for those).
      const ALLOWED_FIELDS = ['name', 'phone', 'address', 'profileImage',
        'farmerProfile', 'deliveryProfile', 'isVerified'];
      const update = {};
      ALLOWED_FIELDS.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

      const user = await User.findByIdAndUpdate(
        req.params.id,
        update,
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  async deleteUser(req, res) {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  async toggleUserVerification(req, res) {
    try {
      const { isVerified } = req.body;
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Update general verification status
      user.isVerified = isVerified;
      
      // If user is a farmer, also update farmerProfile verification
      if (user.role === 'farmer' && user.farmerProfile) {
        user.farmerProfile.isVerified = isVerified;
      }
      
      // Also update account approval status if verifying
      if (isVerified) {
        user.accountStatus.isApproved = true;
        user.accountStatus.approvalStatus = 'approved';
        if (!user.accountStatus.approvalDate) {
          user.accountStatus.approvalDate = new Date();
        }
      }
      
      await user.save();

      res.json({ 
        success: true, 
        message: `User ${isVerified ? 'verified' : 'unverified'} successfully`,
        user: {
          _id: user._id,
          name: user.name,
          isVerified: user.isVerified,
          accountStatus: user.accountStatus
        }
      });
    } catch (error) {
      console.error('toggleUserVerification error:', error);
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  async updateUserRole(req, res) {
    try {
      const { role } = req.body;
      
      // Validate role
      const validRoles = ['customer', 'farmer', 'delivery', 'admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid role. Must be one of: ' + validRoles.join(', ') 
        });
      }

      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Prevent removing the last admin
      if (user.role === 'admin' && role !== 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
          return res.status(400).json({ 
            success: false, 
            message: 'Cannot change role: This is the last admin account' 
          });
        }
      }

      user.role = role;
      await user.save();

      res.json({ 
        success: true, 
        message: `User role updated to ${role} successfully`,
        user: {
          _id: user._id,
          name: user.name,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  // ============================================
  // PRODUCT MANAGEMENT
  // ============================================

  async getAllProducts(req, res) {
    try {
      const products = await Product.find()
        .populate('category', 'name')
        .populate('farmer', 'name email')
        .sort({ createdAt: -1 });

      res.json({ success: true, count: products.length, products });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  async updateProduct(req, res) {
    try {
      const product = await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(product);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  async deleteProduct(req, res) {
    try {
      const product = await Product.findByIdAndDelete(req.params.id);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============================================
  // ORDER MANAGEMENT
  // ============================================

  async getAllOrders(req, res) {
    try {
      const orders = await Order.find()
        .populate('user', 'name email')
        .populate('items.product', 'name images price')
        .populate('delivery.agent', 'name email')  // BUG FIXED: was `deliveryAgent`
        .sort({ createdAt: -1 });

      res.json({ success: true, count: orders.length, orders });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { status, deliveryAgent, note } = req.body;
      const order = await Order.findById(req.params.id);

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }

      // BUG FIXED: delivery agent lives at `order.delivery.agent`, not `order.deliveryAgent`
      if (deliveryAgent) {
        order.delivery = order.delivery || {};
        order.delivery.agent = deliveryAgent;
        order.delivery.assignedAt = new Date();
        order.delivery.status = 'assigned';
      }

      if (status && status !== order.status) {
        await order.updateStatus(status, req.user._id, note);
      } else {
        await order.save();
      }

      res.json({ success: true, order });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  async deleteOrder(req, res) {
    try {
      const order = await Order.findByIdAndDelete(req.params.id);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      res.json({ message: 'Order deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============================================
  // CATEGORY MANAGEMENT
  // ============================================

  async getAllCategories(req, res) {
    try {
      const categories = await Category.find().sort({ name: 1 });
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  async createCategory(req, res) {
    try {
      const category = new Category(req.body);
      await category.save();
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  async updateCategory(req, res) {
    try {
      const category = await Category.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json(category);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  async deleteCategory(req, res) {
    try {
      const category = await Category.findByIdAndDelete(req.params.id);
      
      if (!category) {
        return res.status(404).json({ message: 'Category not found' });
      }

      res.json({ message: 'Category deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============================================
  // FEEDBACK MANAGEMENT
  // ============================================

  async getAllFeedback(req, res) {
    try {
      const feedback = await Feedback.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 });

      res.json(feedback);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  async updateFeedbackStatus(req, res) {
    try {
      const { status } = req.body;
      const feedback = await Feedback.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!feedback) {
        return res.status(404).json({ message: 'Feedback not found' });
      }

      res.json(feedback);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  async deleteFeedback(req, res) {
    try {
      const feedback = await Feedback.findByIdAndDelete(req.params.id);
      
      if (!feedback) {
        return res.status(404).json({ message: 'Feedback not found' });
      }

      res.json({ message: 'Feedback deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============================================
  // DASHBOARD STATISTICS
  // ============================================

  async getDashboardStats(req, res) {
    try {
      const [users, products, orders, feedback] = await Promise.all([
        User.countDocuments(),
        Product.countDocuments(),
        Order.countDocuments(),
        Feedback.countDocuments()
      ]);

      const stats = {
        totalUsers: users,
        totalFarmers: await User.countDocuments({ role: 'farmer' }),
        totalCustomers: await User.countDocuments({ role: 'customer' }),
        totalDeliveryAgents: await User.countDocuments({ role: 'delivery' }),
        totalProducts: products,
        activeProducts: await Product.countDocuments({ isAvailable: true }),
        totalOrders: orders,
        pendingOrders: await Order.countDocuments({ status: 'pending' }),
        deliveredOrders: await Order.countDocuments({ status: 'delivered' }),
        totalFeedback: feedback,
        pendingFeedback: await Feedback.countDocuments({ status: 'pending' })
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============================================
  // PENDING APPROVALS
  // ============================================

  /**
   * Get pending payment approvals
   */
  async getPendingPayments(req, res) {
    try {
      // Include both 'pending' (payment not yet submitted) and 'payment-pending'
      // (customer submitted proof, awaiting admin review).
      // Also match approvalStatus 'pending' OR 'verified' to capture both stages.
      const pendingPayments = await Order.find({
        'payment.method': 'online',
        'payment.approvalStatus': { $in: ['pending', 'verified'] },
        status: { $in: ['pending', 'payment-pending'] }
      })
        .populate('user', 'name email phone')
        .populate('items.product', 'name price')
        .sort({ createdAt: 1 });

      res.json(pendingPayments);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Get pending user approvals (farmers and delivery agents)
   */
  async getPendingUserApprovals(req, res) {
    try {
      const pendingUsers = await User.find({
        'accountStatus.approvalStatus': 'pending',
        role: { $in: ['farmer', 'delivery'] }
      })
        .select('-password')
        .sort({ createdAt: 1 });

      res.json(pendingUsers);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Approve payment
   */
  async approvePayment(req, res) {
    try {
      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      await order.approvePayment(req.user._id);

      res.json({ 
        success: true,
        message: 'Payment approved successfully',
        order 
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Reject payment
   */
  async rejectPayment(req, res) {
    try {
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: 'Rejection reason is required' });
      }

      const order = await Order.findById(req.params.id);
      
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      await order.rejectPayment(req.user._id, reason);

      res.json({ 
        success: true,
        message: 'Payment rejected successfully',
        order 
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Approve user (farmer/delivery)
   */
  async approveUser(req, res) {
    try {
      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.accountStatus.isApproved = true;
      user.accountStatus.approvalStatus = 'approved';
      user.accountStatus.approvedBy = req.user._id;
      user.accountStatus.approvalDate = new Date();

      await user.save();

      res.json({ 
        success: true,
        message: 'User approved successfully',
        user 
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Reject user (farmer/delivery)
   */
  async rejectUser(req, res) {
    try {
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ message: 'Rejection reason is required' });
      }

      const user = await User.findById(req.params.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.accountStatus.isApproved = false;
      user.accountStatus.approvalStatus = 'rejected';
      user.accountStatus.approvedBy = req.user._id;
      user.accountStatus.approvalDate = new Date();
      user.accountStatus.rejectionReason = reason;

      await user.save();

      res.json({ 
        success: true,
        message: 'User rejected',
        user 
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============================================
  // PAYMENT MANAGEMENT (COMPLETE)
  // ============================================

  /**
   * Get all payments with filtering
   */
  async getAllPayments(req, res) {
    try {
      const { status } = req.query;
      const filter = {};
      
      if (status) {
        filter['payment.approvalStatus'] = status;
      }

      const payments = await Order.find(filter)
        .populate('user', 'name email phone')
        .populate('items.product', 'name price')
        .sort({ createdAt: -1 });

      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============================================
  // DISPUTE RESOLUTION
  // ============================================

  /**
   * Get all disputes with filtering
   */
  async getAllDisputes(req, res) {
    try {
      const { status, priority } = req.query;
      const filter = {};
      
      if (status && status !== 'all') filter.status = status;
      if (priority && priority !== 'all') filter.priority = priority;

      const disputes = await Dispute.find(filter)
        .populate('order', 'orderNumber payment.totalAmount status')

      res.json(disputes);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Get single dispute details
   */
  async getDisputeDetails(req, res) {
    try {
      const dispute = await Dispute.findById(req.params.id)
        .populate('order')
        .populate('raisedBy', 'name email phone')
        .populate('against', 'name email phone')
        .populate('assignedTo', 'name email')
        .populate('messages.from', 'name role')
        .populate('timeline.performedBy', 'name');

      if (!dispute) {
        return res.status(404).json({ message: 'Dispute not found' });
      }

      res.json(dispute);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Assign dispute to admin
   */
  async assignDispute(req, res) {
    try {
      const { assignedTo } = req.body;
      const dispute = await Dispute.findById(req.params.id);

      if (!dispute) {
        return res.status(404).json({ message: 'Dispute not found' });
      }

      dispute.assignedTo = assignedTo;
      dispute.status = 'under-review';
      dispute.timeline.push({
        action: 'assigned',
        performedBy: req.user._id,
        note: `Assigned to admin`
      });

      await dispute.save();

      res.json({
        success: true,
        message: 'Dispute assigned successfully',
        dispute
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Resolve dispute
   */
  async resolveDispute(req, res) {
    try {
      const { action, amount, description } = req.body;

      const dispute = await Dispute.findById(req.params.id);

      if (!dispute) {
        return res.status(404).json({ message: 'Dispute not found' });
      }

      await dispute.resolve({
        action,
        amount,
        description
      }, req.user._id);

      res.json({
        success: true,
        message: 'Dispute resolved successfully',
        dispute
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Add message to dispute
   */
  async addDisputeMessage(req, res) {
    try {
      const { message, isInternal } = req.body;

      const dispute = await Dispute.findById(req.params.id);

      if (!dispute) {
        return res.status(404).json({ message: 'Dispute not found' });
      }

      await dispute.addMessage(req.user._id, message, isInternal);

      res.json({
        success: true,
        message: 'Message added successfully',
        dispute
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Get comprehensive analytics
   */
  async getAnalytics(req, res) {
    try {
      const { timeRange = '30d' } = req.query;
      
      // Calculate date range
      let startDate = new Date();
      switch(timeRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Aggregate data
      const [
        totalRevenue,
        orderStats,
        userStats,
        topProducts,
        topFarmers,
        categoryStats
      ] = await Promise.all([
        // Total revenue
        Order.aggregate([
          { $match: { status: 'delivered', createdAt: { $gte: startDate } } },
          { $group: { _id: null, total: { $sum: '$payment.totalAmount' } } }
        ]),
        
        // Order statistics
        Order.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$payment.totalAmount' }
            }
          }
        ]),
        
        // User statistics
        User.aggregate([
          { $match: { createdAt: { $gte: startDate } } },
          {
            $group: {
              _id: '$role',
              count: { $sum: 1 }
            }
          }
        ]),
        
        // Top products
        Order.aggregate([
          { $match: { status: 'delivered', createdAt: { $gte: startDate } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.product',
              totalSold: { $sum: '$items.quantity' },
              revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
            }
          },
          { $sort: { totalSold: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'products',
              localField: '_id',
              foreignField: '_id',
              as: 'product'
            }
          },
          { $unwind: '$product' }
        ]),
        
        // Top farmers
        Order.aggregate([
          { $match: { status: 'delivered', createdAt: { $gte: startDate } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.farmer',
              totalOrders: { $sum: 1 },
              revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
            }
          },
          { $sort: { revenue: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'farmer'
            }
          },
          { $unwind: '$farmer' }
        ]),
        
        // Category statistics
        Product.aggregate([
          {
            $lookup: {
              from: 'categories',
              localField: 'category',
              foreignField: '_id',
              as: 'categoryInfo'
            }
          },
          { $unwind: '$categoryInfo' },
          {
            $group: {
              _id: '$category',
              categoryName: { $first: '$categoryInfo.name' },
              productCount: { $sum: 1 },
              totalSales: { $sum: '$totalSales' }
            }
          },
          { $sort: { totalSales: -1 } }
        ])
      ]);

      // Daily sales trend
      const dailySales = await Order.aggregate([
        { $match: { status: 'delivered', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            sales: { $sum: '$payment.totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.json({
        success: true,
        timeRange,
        revenue: {
          total: totalRevenue[0]?.total || 0,
          daily: dailySales
        },
        orders: orderStats,
        users: userStats,
        topProducts,
        topFarmers,
        categories: categoryStats,
        trends: dailySales
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const revenue = await Order.aggregate([
        {
          $match: {
            status: 'delivered',
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            revenue: { $sum: '$payment.totalAmount' },
            orders: { $sum: 1 },
            averageOrder: { $avg: '$payment.totalAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      res.json({
        success: true,
        data: revenue
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============================================
  // INVENTORY MANAGEMENT
  // ============================================

  /**
   * Get all products with inventory details
   */
  async getAllProductsWithInventory(req, res) {
    try {
      const products = await Product.find()
        .populate('category', 'name')
        .populate('farmer', 'name email')
        .select('+stock +lowStockThreshold')
        .sort({ createdAt: -1 });

      // Calculate inventory metrics
      const inventoryMetrics = {
        totalProducts: products.length,
        inStock: products.filter(p => p.stock > p.lowStockThreshold).length,
        lowStock: products.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold).length,
        outOfStock: products.filter(p => p.stock === 0).length
      };

      res.json({
        success: true,
        products,
        metrics: inventoryMetrics
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Get inventory summary
   */
  async getInventorySummary(req, res) {
    try {
      const summary = await Product.aggregate([
        {
          $group: {
            _id: '$category',
            totalProducts: { $sum: 1 },
            totalStock: { $sum: '$stock' },
            lowStockCount: {
              $sum: {
                $cond: [
                  { $and: [
                    { $gt: ['$stock', 0] },
                    { $lte: ['$stock', '$lowStockThreshold'] }
                  ]},
                  1,
                  0
                ]
              }
            },
            outOfStockCount: {
              $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: '_id',
            foreignField: '_id',
            as: 'category'
          }
        },
        { $unwind: '$category' },
        {
          $project: {
            categoryName: '$category.name',
            totalProducts: 1,
            totalStock: 1,
            lowStockCount: 1,
            outOfStockCount: 1
          }
        }
      ]);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Update product inventory
   */
  async updateInventory(req, res) {
    try {
      const { productId, quantity, action } = req.body;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      if (action === 'add') {
        product.stock += quantity;
      } else if (action === 'subtract') {
        product.stock = Math.max(0, product.stock - quantity);
      } else if (action === 'set') {
        product.stock = quantity;
      }

      await product.save();

      res.json({
        success: true,
        message: 'Inventory updated successfully',
        product
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  // ============================================
  // COMMISSION MANAGEMENT
  // ============================================

  /**
   * Get commission rates
   */
  async getCommissionRates(req, res) {
    try {
      // In a real system, this would come from a settings collection
      // For now, returning default rates
      const rates = {
        default: 10,
        premium: 5,
        organic: 8,
        bulk: 7
      };

      res.json({
        success: true,
        rates
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Get commission tracking data
   */
  async getCommissionTracking(req, res) {
    try {
      const { status, farmerId } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (farmerId) {
        const mongoose = require('mongoose');
        filter.farmer = mongoose.Types.ObjectId.isValid(farmerId)
          ? new mongoose.Types.ObjectId(farmerId)
          : null;
      }

      const commissions = await Commission.find(filter)
        .populate('farmer', 'name email farmerProfile.bankDetails')
        .populate('order', 'orderNumber payment.totalAmount status')
        .sort({ createdAt: -1 });

      const summary = await Commission.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalCommission: { $sum: '$commissionAmount' },
            totalEarnings: { $sum: '$farmerEarnings' }
          }
        }
      ]);

      res.json({
        success: true,
        commissions,
        summary
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Update commission rate
   */
  async updateCommissionRate(req, res) {
    try {
      const { farmerId, rate } = req.body;

      if (rate < 0 || rate > 100) {
        return res.status(400).json({ message: 'Rate must be between 0 and 100' });
      }

      // Update farmer's commission rate in their profile
      const farmer = await User.findById(farmerId);
      if (!farmer || farmer.role !== 'farmer') {
        return res.status(404).json({ message: 'Farmer not found' });
      }

      if (!farmer.farmerProfile) {
        farmer.farmerProfile = {};
      }
      
      farmer.farmerProfile.commissionRate = rate;
      await farmer.save();

      res.json({
        success: true,
        message: 'Commission rate updated successfully',
        farmer
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Schedule commission payout
   */
  async scheduleCommissionPayout(req, res) {
    try {
      const { farmerId } = req.params;
      const { date, method } = req.body;

      // Get all pending commissions for this farmer
      const commissions = await Commission.find({
        farmer: farmerId,
        status: 'pending'
      });

      if (commissions.length === 0) {
        return res.status(404).json({ message: 'No pending commissions found' });
      }

      // Schedule all pending commissions
      for (const commission of commissions) {
        await commission.schedulePayout(date, method, req.user._id);
      }

      res.json({
        success: true,
        message: `${commissions.length} commission(s) scheduled for payout`,
        count: commissions.length
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Create new product (admin can create on behalf of farmers)
   */
  async createProduct(req, res) {
    try {
      const productData = req.body;
      const product = new Product(productData);
      
      // Auto-approve products created by admin
      product.approvalStatus = 'approved';
      product.approvedBy = req.user._id;
      
      await product.save();

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        product
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }

  /**
   * Mark commission as paid
   */
  async markCommissionPaid(req, res) {
    try {
      const { transactionId, reference } = req.body;

      const commission = await Commission.findById(req.params.id);
      if (!commission) {
        return res.status(404).json({ message: 'Commission not found' });
      }

      await commission.markAsPaid(transactionId, reference, req.user._id);

      res.json({
        success: true,
        message: 'Commission marked as paid',
        commission
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
}

module.exports = new AdminController();
