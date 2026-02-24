const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  comment: { type: String, required: true, trim: true, maxlength: 1000 },
  qualityRating: { type: Number, min: 1, max: 5 },
  freshnessRating: { type: Number, min: 1, max: 5 },
  valueRating: { type: Number, min: 1, max: 5 },
  isVerifiedPurchase: { type: Boolean, default: false },
  orderReference: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  images: [String],
  helpfulCount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true, trim: true, minlength: 3 },
  description: { type: String, required: true, trim: true, minlength: 10 },
  shortDescription: { type: String, trim: true, maxlength: 200 },

  // Pricing
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: Number,
  unit: { type: String, required: true, enum: ['kg', 'g', 'litre', 'ml', 'piece', 'dozen', 'bundle', 'bag'], default: 'kg' },

  // Category & Farmer
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [String],

  // Inventory
  stock: { type: Number, required: true, min: 0, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  maxOrderQuantity: { type: Number, default: 100 },
  minOrderQuantity: { type: Number, default: 1 },

  // Attributes
  isOrganic: { type: Boolean, default: false },
  harvestDate: Date,
  shelfLife: Number,
  origin: { farmName: String, location: String, state: String },

  // Media
  images: { type: [String], validate: v => v && v.length > 0 },
  thumbnail: String,

  // Availability
  isAvailable: { type: Boolean, default: true },
  availability: { type: String, enum: ['in-stock', 'low-stock', 'out-of-stock', 'coming-soon'], default: 'in-stock' },

  // Ratings & Reviews
  rating: { type: Number, default: 0, min: 0, max: 5 },
  ratingDistribution: {
    5: { type: Number, default: 0 },
    4: { type: Number, default: 0 },
    3: { type: Number, default: 0 },
    2: { type: Number, default: 0 },
    1: { type: Number, default: 0 }
  },
  totalReviews: { type: Number, default: 0 },
  reviews: [reviewSchema],

  // Price History (for customer trend chart)
  priceHistory: [{
    price: { type: Number, required: true },
    date: { type: Date, required: true },
    note: String,
  }],

  // Metrics
  totalSales: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  popularityScore: { type: Number, default: 0 },

  // Admin Approval
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectionReason: String,

  slug: { type: String, unique: true, lowercase: true },
  isFeatured: { type: Boolean, default: false }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
productSchema.index({ farmer: 1, isAvailable: 1 });
productSchema.index({ category: 1, isAvailable: 1 });
productSchema.index({ rating: -1, totalReviews: -1 });
productSchema.index({ name: 'text', description: 'text' });

// Virtual: Discount percentage
productSchema.virtual('discountPercentage').get(function() {
  if (!this.compareAtPrice || this.compareAtPrice <= this.price) return 0;
  return Math.round(((this.compareAtPrice - this.price) / this.compareAtPrice) * 100);
});

// Virtual: Low stock check
productSchema.virtual('isLowStock').get(function() {
  return this.stock > 0 && this.stock <= this.lowStockThreshold;
});

// Generate slug
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (this.isNew) this.slug += `-${Date.now().toString(36)}`;
  }
  next();
});

// Update availability based on stock
productSchema.pre('save', function(next) {
  if (this.isModified('stock')) {
    if (this.stock === 0) {
      this.availability = 'out-of-stock';
      this.isAvailable = false;
    } else if (this.stock <= this.lowStockThreshold) {
      this.availability = 'low-stock';
    } else {
      this.availability = 'in-stock';
      this.isAvailable = true;
    }
  }
  next();
});

// Set thumbnail
productSchema.pre('save', function(next) {
  if (this.images && this.images.length > 0 && !this.thumbnail) {
    this.thumbnail = this.images[0];
  }
  next();
});

// Calculate popularity score
productSchema.pre('save', function(next) {
  this.popularityScore = (this.rating * 20) + Math.min(this.totalReviews * 2, 50) + 
                         Math.min(this.totalSales, 30) + Math.min(this.viewCount / 10, 20);
  next();
});

// Add review
productSchema.methods.addReview = function(reviewData) {
  this.reviews.push(reviewData);
  if (reviewData.rating >= 1 && reviewData.rating <= 5) {
    this.ratingDistribution[reviewData.rating] += 1;
  }
  this.totalReviews = this.reviews.length;
  const sum = this.reviews.reduce((acc, r) => acc + r.rating, 0);
  this.rating = parseFloat((sum / this.totalReviews).toFixed(2));
  return this.save();
};

// Update stock
productSchema.methods.updateStock = function(quantity) {
  this.stock += quantity;
  if (this.stock < 0) this.stock = 0;
  return this.save();
};

// Increment views
productSchema.methods.incrementViews = function() {
  this.viewCount += 1;
  return this.save();
};

// Check stock availability
productSchema.methods.canFulfillQuantity = function(quantity) {
  return this.stock >= quantity && quantity >= this.minOrderQuantity && quantity <= this.maxOrderQuantity;
};

// Static: Find by farmer
productSchema.statics.findByFarmer = function(farmerId) {
  return this.find({ farmer: farmerId, approvalStatus: 'approved', isAvailable: true })
    .populate('category', 'name').sort({ rating: -1 });
};

// Static: Top rated
productSchema.statics.findTopRated = function(limit = 10) {
  return this.find({
    approvalStatus: 'approved',
    isAvailable: true,
    rating: { $gte: 4 },
    totalReviews: { $gte: 5 }
  }).populate('farmer', 'name farmerProfile.rating').populate('category', 'name')
    .sort({ rating: -1 }).limit(limit);
};

// Static: Search
productSchema.statics.searchProducts = function(query) {
  return this.find({ $text: { $search: query }, approvalStatus: 'approved', isAvailable: true })
    .populate('farmer', 'name farmerProfile.rating').populate('category', 'name')
    .sort({ score: { $meta: 'textScore' } });
};

module.exports = mongoose.model('Product', productSchema);
