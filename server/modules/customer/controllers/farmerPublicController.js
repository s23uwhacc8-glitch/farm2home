const User    = require('../../../core/models/User');
const Product = require('../../../core/models/Product');
const { BADGE_SCORE_RANGES, getTrustBadge } = require('../../../core/utils/farmerRank');

const SORT_MAP = {
  'rating-desc':  { 'farmerProfile.rating':       -1 },
  'rating-asc':   { 'farmerProfile.rating':        1 },
  'reviews-desc': { 'farmerProfile.totalReviews': -1 },
  'reviews-asc':  { 'farmerProfile.totalReviews':  1 },
  'trust-asc':    { 'farmerProfile.trustScore':    1 },
};

class FarmerPublicController {
  async listFarmers(req, res) {
    try {
      const { rank, minRating, sort, search } = req.query;
      const filter = { role: 'farmer', 'accountStatus.isApproved': true };

      if (rank && BADGE_SCORE_RANGES[rank])
        filter['farmerProfile.trustScore'] = BADGE_SCORE_RANGES[rank];
      if (minRating)
        filter['farmerProfile.rating'] = { $gte: parseFloat(minRating) };
      if (search)
        filter.$or = [
          { name:                     { $regex: search, $options: 'i' } },
          { 'farmerProfile.farmName': { $regex: search, $options: 'i' } },
          { 'farmerProfile.bio':      { $regex: search, $options: 'i' } },
        ];

      const farmers = await User.find(filter)
        .select('name profileImage farmerProfile address createdAt')
        .sort(SORT_MAP[sort] || { 'farmerProfile.trustScore': -1 })
        .lean();

      res.json({
        success: true,
        count: farmers.length,
        farmers: farmers.map(f => ({ ...f, rank: getTrustBadge(f.farmerProfile?.trustScore) })),
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  async getFarmerProfile(req, res) {
    try {
      const farmer = await User.findOne({
        _id: req.params.id, role: 'farmer', 'accountStatus.isApproved': true,
      }).select('name profileImage farmerProfile address createdAt').lean();

      if (!farmer) return res.status(404).json({ success: false, message: 'Farmer not found' });

      const [products, productsWithReviews] = await Promise.all([
        Product.find({ farmer: req.params.id, isAvailable: true, approvalStatus: 'approved' })
          .select('name images price unit rating totalReviews isOrganic category')
          .populate('category', 'name')
          .sort({ rating: -1 })
          .lean(),
        Product.find({ farmer: req.params.id })
          .select('name reviews')
          .populate('reviews.user', 'name profileImage')
          .lean(),
      ]);

      const allReviews = productsWithReviews
        .flatMap(p => p.reviews.filter(r => r.status === 'approved').map(r => ({ ...r, productName: p.name, productId: p._id })))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);

      const fp = farmer.farmerProfile || {};
      res.json({
        success: true,
        farmer:  { ...farmer, rank: getTrustBadge(fp.trustScore) },
        products,
        reviews: allReviews,
        stats: {
          totalProducts:   products.length,
          avgRating:       fp.rating          || 0,
          totalReviews:    fp.totalReviews    || 0,
          trustScore:      fp.trustScore      || 0,
          rank:            getTrustBadge(fp.trustScore),
          isVerified:      fp.isVerified      || false,
          totalSales:      fp.totalSales      || 0,
          fulfillmentRate: fp.fulfillmentRate || 100,
          memberSince:     farmer.createdAt,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }
}

module.exports = new FarmerPublicController();
