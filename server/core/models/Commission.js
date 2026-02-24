/**
 * Commission Model
 * Tracks commission rates and payouts for farmers
 */

const mongoose = require('mongoose');

const commissionSchema = new mongoose.Schema({
  // Farmer Reference
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Order Reference
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  
  // Financial Details
  orderAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  commissionRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 10 // 10% default
  },
  
  commissionAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  farmerEarnings: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'scheduled', 'paid', 'failed', 'cancelled'],
    default: 'pending'
  },
  
  // Payout Details
  payout: {
    scheduledDate: Date,
    paidDate: Date,
    method: {
      type: String,
      enum: ['bank-transfer', 'upi', 'wallet', 'check']
    },
    transactionId: String,
    reference: String,
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String
    }
  },
  
  // Processing
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  processedAt: Date,
  
  // Notes
  notes: String,
  failureReason: String
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
commissionSchema.index({ farmer: 1, status: 1 });
commissionSchema.index({ order: 1 });
commissionSchema.index({ status: 1, createdAt: -1 });

// Pre-save: Calculate commission and farmer earnings
commissionSchema.pre('save', function(next) {
  if (this.isModified('orderAmount') || this.isModified('commissionRate')) {
    this.commissionAmount = (this.orderAmount * this.commissionRate) / 100;
    this.farmerEarnings = this.orderAmount - this.commissionAmount;
  }
  next();
});

// Schedule payout
commissionSchema.methods.schedulePayout = function(date, method, adminId) {
  this.status = 'scheduled';
  this.payout.scheduledDate = date;
  this.payout.method = method;
  this.processedBy = adminId;
  this.processedAt = new Date();
  
  return this.save();
};

// Mark as paid
commissionSchema.methods.markAsPaid = function(transactionId, reference, adminId) {
  this.status = 'paid';
  this.payout.paidDate = new Date();
  this.payout.transactionId = transactionId;
  this.payout.reference = reference;
  this.processedBy = adminId;
  
  return this.save();
};

// Mark as failed
commissionSchema.methods.markAsFailed = function(reason, adminId) {
  this.status = 'failed';
  this.failureReason = reason;
  this.processedBy = adminId;
  this.processedAt = new Date();
  
  return this.save();
};

// Static: Get pending commissions for a farmer
commissionSchema.statics.getPendingByFarmer = function(farmerId) {
  return this.find({
    farmer: farmerId,
    status: { $in: ['pending', 'approved', 'scheduled'] }
  })
    .populate('order', 'orderNumber createdAt')
    .sort({ createdAt: -1 });
};

// Static: Get total earnings for a farmer
commissionSchema.statics.getTotalEarnings = async function(farmerId, status = 'paid') {
  const result = await this.aggregate([
    {
      $match: {
        farmer: new mongoose.Types.ObjectId(farmerId),
        status: status
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$farmerEarnings' },
        totalCommission: { $sum: '$commissionAmount' },
        totalOrders: { $sum: 1 }
      }
    }
  ]);
  
  return result[0] || { totalEarnings: 0, totalCommission: 0, totalOrders: 0 };
};

// Static: Get scheduled payouts
commissionSchema.statics.getScheduledPayouts = function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    status: 'scheduled',
    'payout.scheduledDate': { $gte: startOfDay, $lte: endOfDay }
  })
    .populate('farmer', 'name email phone farmerProfile.bankDetails')
    .populate('order', 'orderNumber')
    .sort({ 'payout.scheduledDate': 1 });
};

module.exports = mongoose.model('Commission', commissionSchema);
