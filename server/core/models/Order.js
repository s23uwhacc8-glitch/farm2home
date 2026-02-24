const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  unit: String,
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'confirmed', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled'], default: 'pending' }
});

const paymentSchema = new mongoose.Schema({
  method: { type: String, enum: ['online', 'cod', 'wallet'], required: true, default: 'online' },
  provider: { type: String, enum: ['razorpay', 'stripe', 'paytm', 'upi'] },
  transactionId: String,
  paymentProof: String,
  
  // Approval workflow
  approvalStatus: { type: String, enum: ['pending', 'verified', 'approved', 'rejected', 'refunded'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvalDate: Date,
  rejectionReason: String,
  
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'refunded'], default: 'pending' },
  paidAt: Date,
  
  // Amounts
  subtotal: { type: Number, required: true },
  deliveryCharge: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true }
});

const deliveryTrackingSchema = new mongoose.Schema({
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['not-assigned', 'assigned', 'picked-up', 'in-transit', 'out-for-delivery', 'delivered', 'failed'], default: 'not-assigned' },
  
  assignedAt: Date,
  pickedUpAt: Date,
  deliveredAt: Date,
  
  currentLocation: { latitude: Number, longitude: Number, address: String, updatedAt: Date },
  
  deliveryProof: { signature: String, photo: String, otp: String, receivedBy: String },
  
  estimatedDeliveryDate: Date,
  actualDeliveryDate: Date,
  specialInstructions: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  
  // Customer
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guest: {
    name: String,
    email: String,
    phone: String,
    address: { street: String, city: String, state: String, pincode: String, landmark: String }
  },
  
  // Delivery Address
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    landmark: String,
    contactName: String,
    contactPhone: String,
    coordinates: { latitude: Number, longitude: Number }
  },

  // Items
  items: { type: [orderItemSchema], validate: v => v && v.length > 0 },

  // Payment
  payment: { type: paymentSchema, required: true },

  // Delivery
  delivery: { type: deliveryTrackingSchema, default: () => ({}) },

  // Status
  status: {
    type: String,
    enum: ['pending', 'payment-pending', 'payment-approved', 'confirmed', 'processing', 'ready-to-ship', 'assigned', 'shipped', 'delivered', 'cancelled', 'refunded', 'failed'],
    default: 'pending'
  },
  
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String
  }],

  // Cancellation
  cancellation: {
    isCancelled: { type: Boolean, default: false },
    cancelledBy: { type: String, enum: ['customer', 'farmer', 'admin', 'system'] },
    cancelledAt: Date,
    reason: String
  },

  orderNotes: String,
  adminNotes: String
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
// Note: orderNumber index is already created by unique: true on line 53
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'payment.approvalStatus': 1 });

// Virtuals
orderSchema.virtual('customerName').get(function() {
  return this.user?.name || this.guest?.name || 'Guest';
});

orderSchema.virtual('isPaymentApproved').get(function() {
  return this.payment?.approvalStatus === 'approved';
});

// Generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.orderNumber = `F2H${year}${month}${day}${random}`;
  }
  next();
});

// Track status changes
orderSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      updatedBy: this._updateBy
    });
  }
  next();
});

// Update status with history
orderSchema.methods.updateStatus = function(newStatus, userId, note) {
  this._updateBy = userId;
  this.status = newStatus;
  if (note && this.statusHistory.length > 0) {
    this.statusHistory[this.statusHistory.length - 1].note = note;
  }
  return this.save();
};

// Approve payment
orderSchema.methods.approvePayment = async function(adminId) {
  this.payment.approvalStatus = 'approved';
  this.payment.approvedBy = adminId;
  this.payment.approvalDate = new Date();
  this.payment.status = 'completed';
  this.payment.paidAt = new Date();
  // updateStatus calls save() internally — no redundant save() needed
  return this.updateStatus('payment-approved', adminId, 'Payment approved');
};

// Reject payment
orderSchema.methods.rejectPayment = async function(adminId, reason) {
  this.payment.approvalStatus = 'rejected';
  this.payment.approvedBy = adminId;
  this.payment.approvalDate = new Date();
  this.payment.rejectionReason = reason;
  this.payment.status = 'failed';

  this.cancellation.isCancelled = true;
  this.cancellation.cancelledBy = 'admin';
  this.cancellation.cancelledAt = new Date();
  this.cancellation.reason = `Payment rejected: ${reason}`;

  return this.updateStatus('cancelled', adminId, `Payment rejected: ${reason}`);
};

// Assign delivery agent
orderSchema.methods.assignDeliveryAgent = async function(agentId, assignedBy) {
  this.delivery.agent = agentId;
  this.delivery.status = 'assigned';
  this.delivery.assignedAt = new Date();
  return this.updateStatus('assigned', assignedBy, 'Delivery agent assigned');
};

// Mark as delivered
orderSchema.methods.markAsDelivered = async function(deliveryProof, agentId) {
  this.delivery.status = 'delivered';
  this.delivery.deliveredAt = new Date();
  this.delivery.actualDeliveryDate = new Date();
  this.delivery.deliveryProof = deliveryProof;
  // Mark payment as collected — for COD this is when cash is physically received
  this.payment.status = 'completed';
  this.payment.paidAt = new Date();
  return this.updateStatus('delivered', agentId, 'Order delivered and payment collected');
};

// Cancel order
orderSchema.methods.cancelOrder = async function(cancelledBy, reason, userId) {
  this.cancellation.isCancelled = true;
  this.cancellation.cancelledBy = cancelledBy;
  this.cancellation.cancelledAt = new Date();
  this.cancellation.reason = reason;

  if (this.payment.status === 'completed') {
    this.payment.status = 'refunded';
  }

  return this.updateStatus('cancelled', userId, `Cancelled by ${cancelledBy}: ${reason}`);
};

// Static: Pending payment approvals
orderSchema.statics.findPendingPaymentApprovals = function() {
  return this.find({
    'payment.method': 'online',
    'payment.approvalStatus': 'pending',
    status: 'pending'
  }).populate('user', 'name email phone').sort({ createdAt: 1 });
};

// Static: Orders by delivery agent
orderSchema.statics.findByDeliveryAgent = function(agentId) {
  return this.find({
    'delivery.agent': agentId,
    status: { $in: ['assigned', 'shipped'] }
  }).populate('user', 'name phone').sort({ 'delivery.estimatedDeliveryDate': 1 });
};

module.exports = mongoose.model('Order', orderSchema);
