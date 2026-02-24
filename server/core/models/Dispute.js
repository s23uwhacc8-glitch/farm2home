/**
 * Dispute Model
 * Handles order disputes and resolution workflow
 */

const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  // Reference
  order: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true 
  },
  
  // Parties
  raisedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  raisedByRole: { 
    type: String, 
    enum: ['customer', 'farmer', 'delivery'], 
    required: true 
  },
  
  against: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  againstRole: { 
    type: String, 
    enum: ['customer', 'farmer', 'delivery', 'admin'] 
  },
  
  // Dispute Details
  type: {
    type: String,
    enum: [
      'payment-issue',
      'quality-issue',
      'delivery-issue',
      'wrong-item',
      'missing-item',
      'damaged-item',
      'late-delivery',
      'no-delivery',
      'refund-request',
      'other'
    ],
    required: true
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  
  evidence: [{
    type: { type: String, enum: ['image', 'document'] },
    url: String,
    description: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Status & Resolution
  status: {
    type: String,
    enum: ['open', 'under-review', 'investigating', 'resolved', 'closed', 'escalated'],
    default: 'open'
  },
  
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  resolution: {
    action: {
      type: String,
      enum: ['refund', 'replacement', 'partial-refund', 'compensation', 'no-action', 'other']
    },
    amount: Number,
    description: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  },
  
  // Communication
  messages: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000
    },
    isInternal: {
      type: Boolean,
      default: false
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timeline
  timeline: [{
    action: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
  
  // Metadata
  tags: [String],
  closedAt: Date,
  escalatedAt: Date,
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
disputeSchema.index({ order: 1 });
disputeSchema.index({ raisedBy: 1 });
disputeSchema.index({ status: 1, priority: -1 });
disputeSchema.index({ createdAt: -1 });

// Virtual: Age in hours
disputeSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual: Is overdue (open for more than 48 hours)
disputeSchema.virtual('isOverdue').get(function() {
  if (this.status === 'resolved' || this.status === 'closed') return false;
  return this.ageInHours > 48;
});

// Add message to dispute
disputeSchema.methods.addMessage = function(userId, message, isInternal = false) {
  this.messages.push({
    from: userId,
    message,
    isInternal,
    timestamp: new Date()
  });
  
  this.timeline.push({
    action: 'message_added',
    performedBy: userId,
    note: isInternal ? 'Internal note added' : 'Message added'
  });
  
  return this.save();
};

// Update dispute status
disputeSchema.methods.updateStatus = function(newStatus, userId, note) {
  this.status = newStatus;
  
  this.timeline.push({
    action: `status_changed_to_${newStatus}`,
    performedBy: userId,
    note
  });
  
  if (newStatus === 'closed') {
    this.closedAt = new Date();
  }
  
  if (newStatus === 'escalated') {
    this.escalatedAt = new Date();
    this.priority = 'urgent';
  }
  
  return this.save();
};

// Resolve dispute
disputeSchema.methods.resolve = function(resolution, userId) {
  this.status = 'resolved';
  this.resolution = {
    ...resolution,
    resolvedBy: userId,
    resolvedAt: new Date()
  };
  
  this.timeline.push({
    action: 'dispute_resolved',
    performedBy: userId,
    note: `Resolved: ${resolution.action}`
  });
  
  return this.save();
};

// Static: Get disputes by status
disputeSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('order', 'orderNumber totalAmount')
    .populate('raisedBy', 'name email')
    .populate('assignedTo', 'name')
    .sort({ priority: -1, createdAt: 1 });
};

// Static: Get overdue disputes
disputeSchema.statics.findOverdue = function() {
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  return this.find({
    status: { $in: ['open', 'under-review', 'investigating'] },
    createdAt: { $lt: twoDaysAgo }
  })
    .populate('order', 'orderNumber')
    .populate('raisedBy', 'name email')
    .sort({ createdAt: 1 });
};

module.exports = mongoose.model('Dispute', disputeSchema);
