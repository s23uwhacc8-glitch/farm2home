const Product = require('../../../core/models/Product');
const User    = require('../../../core/models/User');
const { BADGE_SCORE_RANGES } = require('../../../core/utils/farmerRank');

const FARMER_SORTS = new Set([
  'farmer-rating-desc', 'farmer-rating-asc',
  'farmer-reviews-desc', 'farmer-reviews-asc',
  'farmer-trust-desc',
]);

const FARMER_POPULATE = 'name farmerProfile.rating farmerProfile.totalReviews farmerProfile.trustScore farmerProfile.isVerified address.city address.state';

const farmerSortVal = (sort, fp) => {
  if (sort === 'farmer-rating-desc')  return -(fp?.rating       || 0);
  if (sort === 'farmer-rating-asc')   return  (fp?.rating       || 0);
  if (sort === 'farmer-reviews-desc') return -(fp?.totalReviews || 0);
  if (sort === 'farmer-reviews-asc')  return  (fp?.totalReviews || 0);
  if (sort === 'farmer-trust-desc')   return -(fp?.trustScore   || 0);
  return 0;
};

class ProductController {
  /**
   * GET /api/customer/products
   * Supports: category, search, organic, minPrice, maxPrice, sort,
   *           farmerRank, farmerMinRating, city (location-based boost)
   */
  async getAllProducts(req, res) {
    try {
      const {
        category, search, organic, minPrice, maxPrice,
        sort, farmerRank, farmerMinRating, city,
      } = req.query;

      const filter = { isAvailable: true, approvalStatus: 'approved' };
      if (category)           filter.category  = category;
      if (organic === 'true') filter.isOrganic = true;
      if (search)             filter.$or = [
        { name:        { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }

      // Farmer rank/rating pre-filter
      if (farmerRank || farmerMinRating) {
        const ff = { role: 'farmer', 'accountStatus.isApproved': true };
        if (farmerRank && BADGE_SCORE_RANGES[farmerRank])
          ff['farmerProfile.trustScore'] = BADGE_SCORE_RANGES[farmerRank];
        if (farmerMinRating)
          ff['farmerProfile.rating'] = { $gte: parseFloat(farmerMinRating) };
        const ids = await User.find(ff).select('_id').lean();
        filter.farmer = { $in: ids.map(f => f._id) };
      }

      // Resolve local farmer IDs for location boosting
      let localFarmerIds = new Set();
      if (city && city.trim()) {
        const cityRegex = { $regex: city.trim(), $options: 'i' };
        const localFarmers = await User.find({
          role: 'farmer',
          'accountStatus.isApproved': true,
          $or: [
            { 'address.city':                     cityRegex },
            { 'address.state':                    cityRegex },
            { 'farmerProfile.serviceArea.cities': cityRegex },
          ],
        }).select('_id').lean();
        localFarmerIds = new Set(localFarmers.map(f => f._id.toString()));
      }

      let products;
      if (FARMER_SORTS.has(sort)) {
        products = await Product.find(filter)
          .select('name price unit stock images isOrganic isFeatured isLocalFarmer rating totalReviews ratingDistribution category farmer popularityScore createdAt')
          .populate('category', 'name')
          .populate('farmer', FARMER_POPULATE)
          .lean();
        products.sort((a, b) =>
          farmerSortVal(sort, a.farmer?.farmerProfile) - farmerSortVal(sort, b.farmer?.farmerProfile)
        );
      } else {
        const sortMap = {
          'price-asc':  { price: 1 },
          'price-desc': { price: -1 },
          rating:       { rating: -1 },
          popular:      { popularityScore: -1 },
        };
        products = await Product.find(filter)
          .select('name price unit stock images isOrganic isFeatured isLocalFarmer rating totalReviews ratingDistribution category farmer popularityScore createdAt')
          .populate('category', 'name')
          .populate('farmer', FARMER_POPULATE)
          .sort(sortMap[sort] || { isFeatured: -1, createdAt: -1 })
          .lean();
      }

      // Location boost: local-farmer products → featured → rest
      if (localFarmerIds.size > 0) {
        const localScore  = p => localFarmerIds.has(p.farmer?._id?.toString()) ? 0 : p.isFeatured ? 1 : 2;
        products.sort((a, b) => localScore(a) - localScore(b));
      }

      // Attach locality flag so the client can show a "Near You" badge
      if (localFarmerIds.size > 0) {
        products = products.map(p => ({
          ...p,
          isLocalFarmer: localFarmerIds.has(p.farmer?._id?.toString()),
        }));
      }

      res.json({ success: true, count: products.length, products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /** GET /api/customer/products/cities — distinct farmer cities for the location dropdown */
  async getFarmerCities(req, res) {
    try {
      const farmers = await User.find({
        role: 'farmer',
        'accountStatus.isApproved': true,
        'address.city': { $exists: true, $ne: '' },
      }).select('address.city address.state').lean();

      const citySet = new Set();
      farmers.forEach(f => {
        if (f.address?.city) citySet.add(f.address.city.trim());
      });

      res.json({ success: true, cities: [...citySet].sort() });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  async getProductById(req, res) {
    try {
      const product = await Product.findById(req.params.id)
        .populate('category', 'name')
        .populate('farmer', 'name email phone profileImage farmerProfile address')
        .populate('reviews.user', 'name profileImage');
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      product.incrementViews().catch(() => {});
      res.json({ success: true, product });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }

  /** GET /api/customer/products/:id/price-history */
  async getPriceHistory(req, res) {
    try {
      const product = await Product.findById(req.params.id)
        .select('name price priceHistory farmer unit')
        .populate('farmer', 'name address.city')
        .lean();
      if (!product) return res.status(404).json({ success: false, message: 'Not found' });

      // Find other farmers selling same name for price comparison
      const competitors = await Product.find({
        name: { $regex: new RegExp(`^${product.name}$`, 'i') },
        _id: { $ne: product._id },
        isAvailable: true,
        approvalStatus: 'approved',
      }).select('price farmer isOrganic')
        .populate('farmer', 'name farmerProfile.trustScore')
        .lean();

      res.json({
        success: true,
        currentPrice: product.price,
        unit: product.unit,
        priceHistory: product.priceHistory || [],
        competitors: competitors.map(c => ({
          productId: c._id,
          farmerId: c.farmer?._id,
          farmerName: c.farmer?.name,
          trustScore: c.farmer?.farmerProfile?.trustScore,
          price: c.price,
          isOrganic: c.isOrganic,
        })),
      });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }

  async addReview(req, res) {
    try {
      const { rating, title, comment, qualityRating, freshnessRating, valueRating } = req.body;
      if (!rating || rating < 1 || rating > 5)
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      if (!title?.trim())
        return res.status(400).json({ success: false, message: 'Review title is required' });
      if (!comment?.trim())
        return res.status(400).json({ success: false, message: 'Review comment is required' });

      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      if (product.reviews.some(r => r.user.toString() === req.user._id.toString()))
        return res.status(400).json({ success: false, message: 'You have already reviewed this product' });

      await product.addReview({
        user: req.user._id,
        rating: Number(rating),
        title: title.trim(),
        comment: comment.trim(),
        ...(qualityRating   && { qualityRating:   Number(qualityRating)   }),
        ...(freshnessRating && { freshnessRating: Number(freshnessRating) }),
        ...(valueRating     && { valueRating:     Number(valueRating)     }),
      });

      if (product.farmer) {
        const farmer = await User.findById(product.farmer);
        if (farmer?.role === 'farmer') { farmer.updateFarmerRating(Number(rating)); await farmer.save(); }
      }

      const updated = await Product.findById(req.params.id).populate('reviews.user', 'name profileImage');
      res.json({ success: true, message: 'Review added successfully', product: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
  }
}

module.exports = new ProductController();
