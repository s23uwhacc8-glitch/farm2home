const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Info
  name: { type: String, required: true, trim: true, minlength: 2 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String, required: true, match: /^[0-9]{10}$/ },
  role: { type: String, enum: ['customer', 'farmer', 'delivery', 'admin'], default: 'customer' },

  // Address
  address: {
    street: String,
    city: String,
    state: String,
    pincode: { type: String, match: /^[0-9]{6}$/ },
    landmark: String,
    coordinates: { latitude: Number, longitude: Number }
  },

  // Farmer Profile
  farmerProfile: {
    farmName: String,
    farmSize: Number,
    experience: Number,
    location: String,
    specialization: [String],
    bio: { type: String, maxlength: 500 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    trustScore: { type: Number, default: 0, min: 0, max: 100 },
    fulfillmentRate: { type: Number, default: 100 },
    commissionRate: { type: Number, default: 10, min: 0, max: 100 },
    isVerified: { type: Boolean, default: false },
    verificationDate: Date,
    documents: {
      aadharCard: String,
      farmLicense: String,
      bankDetails: { accountNumber: String, ifscCode: String, accountHolderName: String }
    },
    // Verification documents uploaded during registration (base64 or URL)
    verificationDocs: {
      aadhaarPhoto:   { type: String, default: null }, // Aadhaar card image
      farmLicensePhoto: { type: String, default: null }, // Farm registration / licence
      farmPhoto:      { type: String, default: null }, // Photo of the farm/land
      bankPassbook:   { type: String, default: null }, // Bank passbook / cheque leaf
    },
    // Admin review notes
    verificationNotes: { type: String, default: '' },
  },

  // Delivery Profile
  deliveryProfile: {
    vehicleType: { type: String, enum: ['bike', 'scooter', 'van', 'truck', 'bicycle'] },
    vehicleNumber: String,
    drivingLicense: String,
    serviceArea: {
      baseLocation: { latitude: Number, longitude: Number, address: String },
      coverageRadius: { type: Number, default: 5, min: 1, max: 50 },
      cities: [String]
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalDeliveries: { type: Number, default: 0 },
    onTimeDeliveryRate: { type: Number, default: 100 },
    isAvailable: { type: Boolean, default: true },
    // Verification documents uploaded during registration
    verificationDocs: {
      drivingLicensePhoto: { type: String, default: null }, // DL image
      aadhaarPhoto:        { type: String, default: null }, // Aadhaar
      vehiclePhoto:        { type: String, default: null }, // Vehicle photo
      rcBookPhoto:         { type: String, default: null }, // RC Book
    },
    verificationNotes: { type: String, default: '' },
  },

  // Account Status
  accountStatus: {
    isActive: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalDate: Date,
    rejectionReason: String
  },

  // General verification status (for admin user management)
  isVerified: { type: Boolean, default: false },

  profileImage: String,
  lastLogin: Date,

  // Email verification
  emailVerified:            { type: Boolean, default: false },
  emailVerificationOTP:     { type: String,  default: null  },
  emailVerificationExpiry:  { type: Date,    default: null  },

  // Password reset
  passwordResetToken:       { type: String,  default: null  },
  passwordResetExpiry:      { type: Date,    default: null  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
// Note: email index is already created by unique: true on line 7
userSchema.index({ role: 1, 'accountStatus.isApproved': 1 });
userSchema.index({ 'farmerProfile.rating': -1 });

// Virtual: Trust Badge
userSchema.virtual('farmerProfile.trustBadge').get(function() {
  if (this.role !== 'farmer') return null;
  const score = this.farmerProfile?.trustScore || 0;
  if (score >= 90) return 'platinum';
  if (score >= 75) return 'gold';
  if (score >= 60) return 'silver';
  return 'bronze';
});

// Hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Auto-approve customers and admins
userSchema.pre('save', function(next) {
  if (this.isNew && (this.role === 'customer' || this.role === 'admin')) {
    this.accountStatus.isApproved = true;
    this.accountStatus.approvalStatus = 'approved';
  }
  next();
});

// Compare password
userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Update farmer rating
userSchema.methods.updateFarmerRating = function(newRating) {
  if (this.role !== 'farmer') return;
  const total = this.farmerProfile.rating * this.farmerProfile.totalReviews;
  this.farmerProfile.totalReviews += 1;
  this.farmerProfile.rating = (total + newRating) / this.farmerProfile.totalReviews;
  this.updateTrustScore();
};

// Calculate trust score
userSchema.methods.updateTrustScore = function() {
  if (this.role !== 'farmer') return;
  let score = 0;
  score += (this.farmerProfile.rating / 5) * 40; // Rating: 40 points
  if (this.farmerProfile.isVerified) score += 20; // Verified: 20 points
  score += (this.farmerProfile.fulfillmentRate / 100) * 25; // Fulfillment: 25 points
  score += Math.min((this.farmerProfile.experience || 0) / 10, 1) * 15; // Experience: 15 points
  this.farmerProfile.trustScore = Math.round(score);
};

// Check delivery coverage
userSchema.methods.canServeLocation = function(location) {
  if (this.role !== 'delivery' || !this.deliveryProfile?.serviceArea?.baseLocation) return false;
  const base = this.deliveryProfile.serviceArea.baseLocation;
  const radius = this.deliveryProfile.serviceArea.coverageRadius;
  const distance = this.calculateDistance(base.latitude, base.longitude, location.latitude, location.longitude);
  return distance <= radius;
};

// Calculate distance (Haversine formula)
userSchema.methods.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Static: Find top farmers
userSchema.statics.findTopRatedFarmers = function(limit = 10) {
  return this.find({
    role: 'farmer',
    'accountStatus.isApproved': true,
    'farmerProfile.rating': { $gte: 4 }
  }).sort({ 'farmerProfile.rating': -1 }).limit(limit);
};

// Static: Find available delivery agents
userSchema.statics.findAvailableDeliveryAgents = function(city) {
  return this.find({
    role: 'delivery',
    'accountStatus.isApproved': true,
    'deliveryProfile.isAvailable': true,
    'deliveryProfile.serviceArea.cities': city
  }).sort({ 'deliveryProfile.rating': -1 });
};

// Static: Find pending approvals
userSchema.statics.findPendingApprovals = function(role = null) {
  const query = { 'accountStatus.approvalStatus': 'pending' };
  if (role) query.role = role;
  return this.find(query).sort({ createdAt: 1 });
};

module.exports = mongoose.model('User', userSchema);
