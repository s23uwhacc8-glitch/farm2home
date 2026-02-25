const Product  = require('../../../core/models/Product');
const Order    = require('../../../core/models/Order');
const Category = require('../../../core/models/Category');
const User     = require('../../../core/models/User');
const { sendOrderStatusEmail } = require('../../../core/utils/emailService');
const { uploadImage } = require('../../../core/utils/cloudinary');

class FarmerController {
  // ── Products ────────────────────────────────────────────────────────────
  async getMyProducts(req, res) {
    try {
      const products = await Product.find({ farmer: req.user._id })
        .populate('category', 'name')
        .sort({ createdAt: -1 });
      res.json({ success: true, count: products.length, products });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  async createProduct(req, res) {
    try {
      const { name, description, shortDescription, price, compareAtPrice, unit,
              category, stock, images, isOrganic, harvestDate, shelfLife,
              origin, lowStockThreshold, tags } = req.body;

      if (!images?.length)
        return res.status(400).json({ success: false, message: 'At least one product image is required' });

      const product = await new Product({
        name, description, shortDescription, price, compareAtPrice, unit,
        category, farmer: req.user._id, stock: stock || 0, images,
        thumbnail: images[0], isOrganic, harvestDate, shelfLife, origin,
        lowStockThreshold: lowStockThreshold || 10, tags,
        approvalStatus: 'pending',
      }).save();

      await product.populate('category', 'name');
      res.status(201).json({ success: true, message: 'Product created and pending approval', product });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  async updateProduct(req, res) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      if (product.farmer.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: 'Not authorized' });

      const { farmer, approvalStatus, approvedBy, ...safe } = req.body;
      Object.assign(product, safe);
      if (req.body.price !== undefined || req.body.description !== undefined)
        product.approvalStatus = 'pending';

      await product.save();
      res.json({ success: true, message: 'Product updated', product });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  async updateStock(req, res) {
    try {
      const { stock } = req.body;
      if (stock === undefined || stock < 0)
        return res.status(400).json({ success: false, message: 'Valid stock value required' });

      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      if (product.farmer.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: 'Not authorized' });

      product.stock = stock;
      await product.save();
      res.json({ success: true, message: 'Stock updated', stock: product.stock, availability: product.availability });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  async deleteProduct(req, res) {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      if (product.farmer.toString() !== req.user._id.toString())
        return res.status(403).json({ success: false, message: 'Not authorized' });
      await product.deleteOne();
      res.json({ success: true, message: 'Product deleted' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  // ── Orders ───────────────────────────────────────────────────────────────
  async getFarmerOrders(req, res) {
    try {
      const orders = await Order.find({ 'items.farmer': req.user._id })
        .populate('user', 'name email phone')
        .populate('items.product', 'name images price unit')
        .populate('delivery.agent', 'name phone')
        .sort({ createdAt: -1 });
      res.json({ success: true, count: orders.length, orders });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  async updateOrderStatus(req, res) {
    try {
      const { status, note } = req.body;
      const valid = ['confirmed', 'preparing', 'ready-to-ship'];
      if (!valid.includes(status))
        return res.status(400).json({ success: false, message: `Valid statuses: ${valid.join(', ')}` });

      const order = await Order.findById(req.params.orderId);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      const mine = order.items.some(i => i.farmer?.toString() === req.user._id.toString());
      if (!mine) return res.status(403).json({ success: false, message: 'Not authorized' });

      // Enforce forward-only transitions — prevent moving an order backwards
      const statusRank = { confirmed: 1, preparing: 2, 'ready-to-ship': 3 };
      if (statusRank[status] !== undefined && statusRank[order.status] !== undefined &&
          statusRank[status] <= statusRank[order.status]) {
        return res.status(400).json({
          success: false,
          message: `Cannot move order back from '${order.status}' to '${status}'. Status can only move forward.`
        });
      }

      await order.updateStatus(status, req.user._id, note);

      // Send status notification to customer (non-blocking)
      const populated = await Order.findById(order._id).populate('user', 'name email');
      const customerEmail = populated.user?.email || populated.guest?.email;
      const customerName  = populated.user?.name  || populated.guest?.name || 'Customer';
      if (customerEmail) {
        sendOrderStatusEmail({ to: customerEmail, name: customerName, order: populated, newStatus: status }).catch(() => {});
      }

      res.json({ success: true, message: 'Status updated', order });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  // ── Product Image Upload ───────────────────────────────────────────────────
  async uploadProductImage(req, res) {
    try {
      const { imageData } = req.body; // base64 data URI
      if (!imageData) return res.status(400).json({ success: false, message: 'imageData is required' });
      const url = await uploadImage(imageData, 'farm2home/products');
      res.json({ success: true, url });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // ── Dashboard & Analytics ─────────────────────────────────────────────────
  async getDashboardStats(req, res) {
    try {
      const [products, orders] = await Promise.all([
        Product.find({ farmer: req.user._id }),
        Order.find({ 'items.farmer': req.user._id }).populate('items.product', 'name'),
      ]);

      const delivered = orders.filter(o => o.status === 'delivered');

      // Revenue from only this farmer's items
      const farmerRevenue = o => o.items
        .filter(i => i.farmer?.toString() === req.user._id.toString())
        .reduce((s, i) => s + i.price * i.quantity, 0);

      const totalRevenue = delivered.reduce((s, o) => s + farmerRevenue(o), 0);

      // Monthly revenue — last 6 months
      const monthly = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthly[key] = { label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), revenue: 0, orders: 0 };
      }
      delivered.forEach(o => {
        const key = o.createdAt.toISOString().slice(0, 7);
        if (monthly[key]) { monthly[key].revenue += farmerRevenue(o); monthly[key].orders += 1; }
      });

      // Per-product performance
      const productMap = {};
      orders.forEach(o => {
        o.items.filter(i => i.farmer?.toString() === req.user._id.toString()).forEach(i => {
          const id = i.product?._id?.toString() || i.product?.toString();
          if (!id) return;
          if (!productMap[id]) productMap[id] = { name: i.product?.name || 'Unknown', unitsSold: 0, revenue: 0, orders: 0 };
          productMap[id].unitsSold += i.quantity;
          productMap[id].revenue  += i.price * i.quantity;
          productMap[id].orders   += 1;
        });
      });

      const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Low stock alerts
      const lowStockItems = products
        .filter(p => p.stock <= p.lowStockThreshold && p.stock > 0)
        .map(p => ({ id: p._id, name: p.name, stock: p.stock, threshold: p.lowStockThreshold }));

      const outOfStock = products.filter(p => p.stock === 0)
        .map(p => ({ id: p._id, name: p.name }));

      res.json({
        success: true,
        stats: {
          totalProducts:    products.length,
          activeProducts:   products.filter(p => p.isAvailable && p.approvalStatus === 'approved').length,
          pendingApproval:  products.filter(p => p.approvalStatus === 'pending').length,
          totalOrders:      orders.length,
          pendingOrders:    orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length,
          completedOrders:  delivered.length,
          totalRevenue,
          avgOrderValue:    delivered.length ? Math.round(totalRevenue / delivered.length) : 0,
          totalUnitsSold:   Object.values(productMap).reduce((s, p) => s + p.unitsSold, 0),
        },
        monthly: Object.values(monthly),
        topProducts,
        lowStockItems,
        outOfStock,
      });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  async getCategories(req, res) {
    try {
      const cats = await Category.find({ isActive: { $ne: false } }).select('name').lean();
      res.json({ success: true, categories: cats });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  // ── Farmer Profile (My Farm tab) ─────────────────────────────────────────
  async getFarmerProfile(req, res) {
    try {
      const farmer = await User.findById(req.user._id).select('-password').lean();
      if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });
      res.json({ success: true, farmer: farmer.farmerProfile || {}, user: farmer });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  async updateFarmerProfile(req, res) {
    try {
      const allowed = ['farmName', 'description', 'location', 'farmSize', 'experience', 'specialties', 'tags'];
      const update = {};
      allowed.forEach(k => { if (req.body[k] !== undefined) update[`farmerProfile.${k}`] = req.body[k]; });
      const farmer = await User.findByIdAndUpdate(
        req.user._id,
        { $set: update },
        { new: true, runValidators: true }
      ).select('-password');
      if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });
      res.json({ success: true, message: 'Profile updated', farmer: farmer.farmerProfile });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  // AI (server-side proxy for farmer AI Price Advisor)
  async aiPriceAdvisor(req, res) {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== 'string')
        return res.status(400).json({ success: false, message: 'Prompt is required' });

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey)
        return res.status(503).json({ success: false, message: 'AI service not configured (missing ANTHROPIC_API_KEY in .env)' });

      // Use global fetch (Node 18+) or fall back to https module
      const callApi = async () => {
        if (typeof fetch === 'function') {
          // Node 18+ native fetch
          return fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 1000,
              messages: [{ role: 'user', content: prompt }],
            }),
          });
        }
        // Node < 18: use https module
        return new Promise((resolve, reject) => {
          const https = require('https');
          const body  = JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
          });
          const options = {
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
          };
          const req = https.request(options, (r) => {
            let data = '';
            r.on('data', chunk => { data += chunk; });
            r.on('end', () => resolve({ ok: r.statusCode < 400, status: r.statusCode, json: () => Promise.resolve(JSON.parse(data)) }));
          });
          req.on('error', reject);
          req.write(body);
          req.end();
        });
      };

      const response = await callApi();
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return res.status(response.status).json({ success: false, message: err.error?.message || 'AI API error' });
      }

      const data = await response.json();
      const text = (data.content || []).map(c => c.text || '').join('');
      res.json({ success: true, text });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
}

module.exports = new FarmerController();
