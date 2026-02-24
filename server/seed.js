/**
 * Farm2Home — Rich Seed Data
 *
 * Showcases:
 *  • 4 farmer tiers (Platinum / Gold / Silver / Bronze) across 5 cities
 *  • Multiple farmers selling the same product (carousel demo)
 *  • Pre-seeded reviews to show ratings
 *  • Featured products, organic badges, varied prices
 *  • 5 categories, 30 products, 10 farmers, 3 customers, 2 delivery agents
 */

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
const User     = require('./core/models/User');
const Category = require('./core/models/Category');
const Product  = require('./core/models/Product');

dotenv.config();

// ── helpers ──────────────────────────────────────────────────────────────────
const approved = { isActive: true, isApproved: true, approvalStatus: 'approved' };

function farmer(name, email, city, state, pincode, fp) {
  return {
    name, email, password: 'farmer123', role: 'farmer',
    phone: `98${Math.floor(10000000 + Math.random() * 89999999)}`,
    address: { street: `${fp.farmName} Lane`, city, state, pincode },
    farmerProfile: fp,
    accountStatus: approved,
  };
}

// Pre-build review objects (no ObjectId refs needed in seed — use plain userId later)
function reviews(users, ratings, titles, comments) {
  return ratings.map((r, i) => ({
    user:    users[i % users.length]._id,
    rating:  r,
    title:   titles[i % titles.length],
    comment: comments[i % comments.length],
    status:  'approved',
    isVerifiedPurchase: i % 2 === 0,
  }));
}

// Generate 6-month synthetic price history ending at current price
function priceHistory(currentPrice, volatility = 0.15) {
  const history = [];
  const now = new Date();
  let price = currentPrice * (1 + (Math.random() - 0.5) * volatility * 2);
  for (let i = 5; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    // Random walk toward current price
    price = price + (currentPrice - price) * 0.3 + (Math.random() - 0.5) * currentPrice * volatility;
    price = Math.max(currentPrice * 0.5, Math.round(price));
    history.push({ price, date: d });
  }
  // Last point is exactly current price
  history.push({ price: currentPrice, date: new Date(now.getFullYear(), now.getMonth(), 1) });
  return history;
}

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔌 MongoDB connected');

    // Clear
    await Promise.all([User.deleteMany({}), Category.deleteMany({}), Product.deleteMany({})]);
    console.log('🗑  Cleared existing data');

    // ════════════════════════════════════════════════════════════════
    // ADMIN
    // ════════════════════════════════════════════════════════════════
    await User.create({
      name: 'Admin', email: 'admin@farm2home.com', password: 'admin123',
      role: 'admin', phone: '9800000001', accountStatus: approved,
    });

    // ════════════════════════════════════════════════════════════════
    // CUSTOMERS (used for review authorship)
    // ════════════════════════════════════════════════════════════════
    const [c1, c2, c3] = await User.create([
      { name: 'Arjun Menon',  email: 'arjun@customer.com',  password: 'customer123', role: 'customer', phone: '9811111111', address: { city: 'Kozhikode', state: 'Kerala', pincode: '673001' } },
      { name: 'Sneha Pillai', email: 'sneha@customer.com',  password: 'customer123', role: 'customer', phone: '9822222222', address: { city: 'Kochi',     state: 'Kerala', pincode: '682001' } },
      { name: 'Ravi Sharma',  email: 'ravi@customer.com',   password: 'customer123', role: 'customer', phone: '9833333333', address: { city: 'Bengaluru', state: 'Karnataka', pincode: '560001' } },
    ]);
    console.log('✅ Customers created');

    // ════════════════════════════════════════════════════════════════
    // DELIVERY AGENTS
    // ════════════════════════════════════════════════════════════════
    await User.create([
      { name: 'Suresh Driver', email: 'suresh@delivery.com', password: 'delivery123', role: 'delivery', phone: '9844444444', accountStatus: approved, deliveryProfile: { vehicleType: 'bike', vehicleNumber: 'KL07AB1234', serviceArea: { cities: ['Kozhikode', 'Thrissur'] } } },
      { name: 'Mohan Rider',   email: 'mohan@delivery.com',  password: 'delivery123', role: 'delivery', phone: '9855555555', accountStatus: approved, deliveryProfile: { vehicleType: 'scooter', vehicleNumber: 'KL09CD5678', serviceArea: { cities: ['Kochi', 'Ernakulam'] } } },
    ]);
    console.log('✅ Delivery agents created');

    // ════════════════════════════════════════════════════════════════
    // FARMERS — tiered by trustScore
    // ════════════════════════════════════════════════════════════════

    // 💎 PLATINUM (trustScore 90-100)
    const [f_platinum1, f_platinum2] = await User.create([
      farmer('Rajan Nambiar',  'rajan@farmer.com',  'Kozhikode', 'Kerala',     '673001', {
        farmName: 'Nambiar Organic Farms', farmSize: 15, experience: 22,
        bio: 'Third-generation farmer specialising in certified organic produce. Our farm follows zero-pesticide methods and supplies premium quality vegetables to households across Malabar.',
        specialization: ['Organic Vegetables', 'Leafy Greens', 'Root Vegetables'],
        rating: 4.9, totalReviews: 87, trustScore: 96, fulfillmentRate: 99, isVerified: true,
      }),
      farmer('Lakshmi Devi',   'lakshmi@farmer.com','Thrissur',  'Kerala',     '680001', {
        farmName: 'Devi Spice Garden',     farmSize: 12, experience: 18,
        bio: 'Award-winning spice and fruit farmer from Thrissur, Kerala. Known for aromatic spices and premium quality fruits harvested at the perfect ripeness.',
        specialization: ['Spices', 'Tropical Fruits', 'Coconut Products'],
        rating: 4.8, totalReviews: 73, trustScore: 92, fulfillmentRate: 98, isVerified: true,
      }),
    ]);

    // 🥇 GOLD (trustScore 75-89)
    const [f_gold1, f_gold2] = await User.create([
      farmer('Priya Nair',     'priya@farmer.com',  'Kochi',     'Kerala',     '682001', {
        farmName: 'Green Valley Farms',    farmSize: 8,  experience: 10,
        bio: 'Young organic farming pioneer from Kochi. I grow heirloom varieties of vegetables and fruits using traditional Kerala farming techniques passed down by my family.',
        specialization: ['Heirloom Vegetables', 'Organic Fruits', 'Mushrooms'],
        rating: 4.5, totalReviews: 54, trustScore: 82, fulfillmentRate: 95, isVerified: true,
      }),
      farmer('Murugan Swamy',  'murugan@farmer.com','Coimbatore','Tamil Nadu', '641001', {
        farmName: 'Swamy Agro Farm',       farmSize: 20, experience: 15,
        bio: 'Large-scale farmer from Tamil Nadu growing hybrid and organic varieties. Bulk supplier for multiple cities with reliable cold-chain delivery.',
        specialization: ['Hybrid Vegetables', 'Grains', 'Pulses'],
        rating: 4.3, totalReviews: 41, trustScore: 78, fulfillmentRate: 93, isVerified: false,
      }),
    ]);

    // 🥈 SILVER (trustScore 60-74)
    const [f_silver1, f_silver2] = await User.create([
      farmer('Anitha Reddy',   'anitha@farmer.com', 'Bengaluru', 'Karnataka',  '560001', {
        farmName: 'Reddy Fresh Farms',     farmSize: 5,  experience: 5,
        bio: 'Urban-edge farmer supplying the Bengaluru market with fresh daily-harvested greens and seasonal vegetables.',
        specialization: ['Leafy Greens', 'Seasonal Vegetables'],
        rating: 3.9, totalReviews: 28, trustScore: 68, fulfillmentRate: 88, isVerified: false,
      }),
      farmer('Thomas George',  'thomas@farmer.com', 'Kottayam',  'Kerala',     '686001', {
        farmName: 'George Backwater Farms',farmSize: 9,  experience: 8,
        bio: 'Organic rubber-strip farmer who also cultivates premium rice varieties and vegetables on the scenic banks of Kottayam.',
        specialization: ['Rice', 'Tubers', 'Coconut'],
        rating: 4.0, totalReviews: 19, trustScore: 63, fulfillmentRate: 90, isVerified: true,
      }),
    ]);

    // 🥉 BRONZE (trustScore < 60) — newer farmers
    const [f_bronze1, f_bronze2] = await User.create([
      farmer('Kavitha Shetty', 'kavitha@farmer.com','Mangaluru', 'Karnataka',  '575001', {
        farmName: 'Shetty Sunrise Farm',   farmSize: 3,  experience: 2,
        bio: 'New to the platform. Growing traditional coastal Karnataka vegetables and promising the freshest morning harvest deliveries.',
        specialization: ['Coastal Vegetables', 'Tubers'],
        rating: 3.4, totalReviews: 9,  trustScore: 48, fulfillmentRate: 80, isVerified: false,
      }),
      farmer('Vinod Kumar',    'vinod@farmer.com',  'Palakkad',  'Kerala',     '678001', {
        farmName: 'Kumar Field Fresh',     farmSize: 4,  experience: 1,
        bio: 'Recently started farming in the fertile plains of Palakkad. Offering great prices as we build our customer base.',
        specialization: ['Grains', 'Vegetables'],
        rating: 3.1, totalReviews: 6,  trustScore: 35, fulfillmentRate: 75, isVerified: false,
      }),
    ]);

    console.log('✅ Farmers created (Platinum×2, Gold×2, Silver×2, Bronze×2)');

    const allCustomers = [c1, c2, c3];

    // ════════════════════════════════════════════════════════════════
    // CATEGORIES
    // ════════════════════════════════════════════════════════════════
    const [vegetables, fruits, dairy, grains, herbs] = await Category.create([
      { name: 'Vegetables',     description: 'Farm-fresh vegetables',           isActive: true, image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400' },
      { name: 'Fruits',         description: 'Seasonal fresh fruits',            isActive: true, image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400' },
      { name: 'Dairy & Eggs',   description: 'Fresh dairy and free-range eggs',  isActive: true, image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400' },
      { name: 'Grains & Pulses',description: 'Organic grains and pulses',        isActive: true, image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
      { name: 'Herbs & Spices', description: 'Aromatic herbs and fresh spices',  isActive: true, image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400' },
    ]);
    console.log('✅ Categories created');

    // ════════════════════════════════════════════════════════════════
    // PRODUCTS — grouped so same-name products from different farmers
    //            showcase the carousel feature
    // ════════════════════════════════════════════════════════════════

    const productDefs = [

      // ── TOMATOES — 4 farmers (best carousel demo) ──────────────────
      {
        name: 'Fresh Tomatoes', description: 'Vine-ripened tomatoes bursting with natural sweetness and freshness. Perfect for gravies, salads, and chutneys. Harvested daily from our certified fields.',
        price: 35, unit: 'kg', category: vegetables._id, farmer: f_platinum1._id,
        stock: 120, isOrganic: true, isFeatured: true,
        images: ['https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600'],
        approvalStatus: 'approved', rating: 4.8, totalReviews: 3,
        ratingDistribution: { 5: 2, 4: 1, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [5,5,4], ['Absolutely fresh!','Best tomatoes ever','Good quality'], ['Firm, red and so fresh. Arrived perfectly packed.','We use these every day — consistently great quality.','Nice tomatoes, will order again.']),
        priceHistory: priceHistory(35, 0.2),
      },
      {
        name: 'Fresh Tomatoes', description: 'Locally grown greenhouse tomatoes with a tangy-sweet flavour. Grown using natural fertilisers with no harmful chemicals.',
        price: 30, unit: 'kg', category: vegetables._id, farmer: f_gold1._id,
        stock: 80, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600'],
        approvalStatus: 'approved', rating: 4.4, totalReviews: 2,
        ratingDistribution: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [5,4], ['Fresh and tasty','Decent quality'], ['Great tomatoes at a great price!','Slightly small sized but fresh.']),
      },
      {
        name: 'Fresh Tomatoes', description: 'Farm-to-table tomatoes grown in the fertile outskirts of Coimbatore. Available in bulk at competitive rates.',
        price: 25, unit: 'kg', category: vegetables._id, farmer: f_gold2._id,
        stock: 200, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600'],
        approvalStatus: 'approved', rating: 4.0, totalReviews: 1,
        ratingDistribution: { 5: 0, 4: 1, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [4], ['Good for the price'], ['Decent tomatoes. Good for daily cooking.']),
      },
      {
        name: 'Fresh Tomatoes', description: 'First harvest tomatoes from our new Palakkad farm. Offering at introductory prices for early customers!',
        price: 20, unit: 'kg', category: vegetables._id, farmer: f_bronze2._id,
        stock: 40, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600'],
        approvalStatus: 'approved', rating: 3.0, totalReviews: 1,
        ratingDistribution: { 5: 0, 4: 0, 3: 1, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [3], ['Average'], ['Average quality but very cheap price.']),
      },

      // ── SPINACH — 3 farmers ────────────────────────────────────────
      {
        name: 'Green Spinach', description: 'Lush, dark green organic spinach leaves freshly harvested every morning. Rich in iron and antioxidants, perfect for smoothies, dal and curries.',
        price: 40, unit: 'kg', category: vegetables._id, farmer: f_platinum1._id,
        stock: 60, isOrganic: true, isFeatured: true,
        images: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600'],
        approvalStatus: 'approved', rating: 4.9, totalReviews: 2,
        ratingDistribution: { 5: 2, 4: 0, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [5,5], ['Freshest spinach!','Super greens'], ['Leaves are so fresh, no yellowing at all.','Perfectly packed and extremely fresh.']),
        priceHistory: priceHistory(40, 0.18),
      },
      {
        name: 'Green Spinach', description: 'Daily-harvested tender spinach from our urban-edge Bengaluru farm. Great value for your greens intake.',
        price: 32, unit: 'kg', category: vegetables._id, farmer: f_silver1._id,
        stock: 45, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600'],
        approvalStatus: 'approved', rating: 3.8, totalReviews: 1,
        ratingDistribution: { 5: 0, 4: 1, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [4], ['Good fresh spinach'], ['Leaves a little small but fresh and clean.']),
      },
      {
        name: 'Green Spinach', description: 'Morning-cut spinach from Palakkad plains. Very fresh, no wilting.',
        price: 25, unit: 'kg', category: vegetables._id, farmer: f_bronze2._id,
        stock: 30, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600'],
        approvalStatus: 'approved',
      },

      // ── RICE — 3 farmers ───────────────────────────────────────────
      {
        name: 'Organic Rice', description: 'Premium Matta rice (Kerala red rice) grown organically without chemical fertilisers. Nutty flavour, high fibre and excellent for health. A Kerala household staple.',
        price: 90, unit: 'kg', category: grains._id, farmer: f_silver2._id,
        stock: 250, isOrganic: true, isFeatured: true,
        images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600'],
        approvalStatus: 'approved', rating: 4.5, totalReviews: 2,
        ratingDistribution: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [5,4], ['Best Matta rice','Good quality rice'], ['Classic Kerala Matta — tastes just like Grandma used to cook!','Slightly costlier but worth it for the quality.']),
        priceHistory: priceHistory(90, 0.12),
      },
      {
        name: 'Organic Rice', description: 'Sona Masoori organic rice from Coimbatore region. Long-grain, aromatic and great for biryani.',
        price: 75, unit: 'kg', category: grains._id, farmer: f_gold2._id,
        stock: 400, isOrganic: true,
        images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600'],
        approvalStatus: 'approved', rating: 4.2, totalReviews: 1,
        ratingDistribution: { 5: 0, 4: 1, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [4], ['Great value'], ['Good sona masoori at a fair price.']),
      },
      {
        name: 'Organic Rice', description: 'Field-to-table rice from our new Palakkad farm. Introductory price for our first season.',
        price: 60, unit: 'kg', category: grains._id, farmer: f_bronze2._id,
        stock: 100, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600'],
        approvalStatus: 'approved',
      },

      // ── BANANAS — 3 farmers ────────────────────────────────────────
      {
        name: 'Nendran Bananas', description: 'Premium Kerala Nendran variety — the king of bananas. Perfect for banana chips, payasam and steaming. Naturally ripened on the tree.',
        price: 80, unit: 'dozen', category: fruits._id, farmer: f_platinum2._id,
        stock: 100, isOrganic: true, isFeatured: true,
        images: ['https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=600'],
        approvalStatus: 'approved', rating: 4.9, totalReviews: 3,
        ratingDistribution: { 5: 3, 4: 0, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [5,5,5], ['Authentic Nendran!','Superb quality','Best bananas from Kerala'], ['So fresh and ripe. Made perfect payasam.','These are the real deal — thick, sweet and creamy.','Outstanding Nendrans. Will subscribe monthly!']),
        priceHistory: priceHistory(80, 0.15),
      },
      {
        name: 'Nendran Bananas', description: 'Farm-fresh Nendran bananas from our Kochi farm. Slightly smaller than export grade but equally sweet.',
        price: 65, unit: 'dozen', category: fruits._id, farmer: f_gold1._id,
        stock: 60, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=600'],
        approvalStatus: 'approved', rating: 4.2, totalReviews: 1,
        ratingDistribution: { 5: 0, 4: 1, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [4], ['Good value Nendrans'], ['Good bananas, good price. Not as big as premium ones but tasty.']),
      },
      {
        name: 'Nendran Bananas', description: 'Nendran bananas at the best price. Our first batch from Kottayam.',
        price: 50, unit: 'dozen', category: fruits._id, farmer: f_silver2._id,
        stock: 35, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=600'],
        approvalStatus: 'approved',
      },

      // ── MILK — 2 farmers ───────────────────────────────────────────
      {
        name: 'Fresh Cow Milk', description: 'Pure A2 cow milk sourced from desi Gir cows. No adulteration, no preservatives — collected fresh every morning and dispatched by 7 AM.',
        price: 70, unit: 'litre', category: dairy._id, farmer: f_platinum1._id,
        stock: 150, isOrganic: true, isFeatured: true,
        images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600'],
        approvalStatus: 'approved', rating: 4.9, totalReviews: 2,
        ratingDistribution: { 5: 2, 4: 0, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [5,5], ['Best milk ever','Pure A2 milk!'], ['Thick, creamy and absolutely genuine. No water.','Switched from packet milk — never going back!']),
        priceHistory: priceHistory(70, 0.1),
      },
      {
        name: 'Fresh Cow Milk', description: 'Daily-fresh cow milk from our Kottayam farm. Traditional rearing, natural feed.',
        price: 55, unit: 'litre', category: dairy._id, farmer: f_silver2._id,
        stock: 80, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600'],
        approvalStatus: 'approved', rating: 4.0, totalReviews: 1,
        ratingDistribution: { 5: 0, 4: 1, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [4], ['Fresh and good'], ['Good milk. Fresh every morning.']),
      },

      // ── UNIQUE PRODUCTS (1 farmer each) ────────────────────────────
      {
        name: 'Organic Turmeric', description: 'Sun-dried whole turmeric fingers and powder from Wayanad organic farms. Deep orange colour, high curcumin content. A must-have kitchen spice.',
        price: 180, unit: 'kg', category: herbs._id, farmer: f_platinum2._id,
        stock: 50, isOrganic: true, isFeatured: true,
        images: ['https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=600'],
        approvalStatus: 'approved', rating: 5.0, totalReviews: 2,
        ratingDistribution: { 5: 2, 4: 0, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [5,5], ['Exceptional turmeric','Purest spice I have used'], ['The colour and aroma are unbelievable. Worth every rupee.','Lab-tested quality — genuine high curcumin content.']),
        priceHistory: priceHistory(180, 0.2),
      },
      {
        name: 'Free Range Eggs', description: 'Eggs from hens raised on open pastures with natural feed — no hormones or antibiotics. Bright orange yolk, rich taste. Collected daily.',
        price: 120, unit: 'dozen', category: dairy._id, farmer: f_platinum1._id,
        stock: 90, isOrganic: true,
        images: ['https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=600'],
        approvalStatus: 'approved', rating: 4.8, totalReviews: 2,
        ratingDistribution: { 5: 2, 4: 0, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [5,5], ['Amazing yolk colour!','Best eggs in town'], ['Yolk is deep orange — the sign of genuinely free-range hens.','Kids love the taste. Way better than supermarket eggs.']),
      },
      {
        name: 'Fresh Mangoes', description: 'Alphonso mangoes from our Thrissur orchard — the king of mangoes. Fibreless, saffron-coloured pulp with an irresistible aroma. Seasonal produce.',
        price: 250, unit: 'kg', category: fruits._id, farmer: f_platinum2._id,
        stock: 30, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1553279768-865429fa0078?w=600'],
        approvalStatus: 'approved', rating: 4.9, totalReviews: 2,
        ratingDistribution: { 5: 2, 4: 0, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [5,5], ['Heaven in a mango!','Best Alphonso I tasted'], ['Pure Alphonso experience — fibreless, sweet and aromatic.','Arrived in perfect condition, perfectly ripe.']),
        priceHistory: priceHistory(250, 0.25),
      },
      {
        name: 'Baby Carrots', description: 'Tender sweet baby carrots harvested young for maximum sweetness. Great raw as a snack or in salads. Certified organic.',
        price: 60, unit: 'kg', category: vegetables._id, farmer: f_gold1._id,
        stock: 55, isOrganic: true,
        images: ['https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600'],
        approvalStatus: 'approved', rating: 4.6, totalReviews: 1,
        ratingDistribution: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [5], ['Sweetest carrots!'], ['So sweet and crunchy. My kids eat them raw like candy!']),
      },
      {
        name: 'Yellow Lentils (Moong Dal)', description: 'Cleaned and sun-dried yellow moong dal, perfect for khichdi, soups and everyday dal. Grown without chemical fertilisers in Coimbatore.',
        price: 120, unit: 'kg', category: grains._id, farmer: f_gold2._id,
        stock: 300, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1585961983482-be0f70f41057?w=600'],
        approvalStatus: 'approved', rating: 4.1, totalReviews: 1,
        ratingDistribution: { 5: 0, 4: 1, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [4], ['Clean and fresh'], ['Nicely cleaned dal. Cooked well with good texture.']),
      },
      {
        name: 'Bitter Gourd', description: 'Freshly harvested tender bitter gourds (pavakka). Perfect for stir-fries and Kerala-style theeyal. Medicinal value for blood sugar management.',
        price: 45, unit: 'kg', category: vegetables._id, farmer: f_silver2._id,
        stock: 40, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=600'],
        approvalStatus: 'approved', rating: 4.2, totalReviews: 1,
        ratingDistribution: { 5: 0, 4: 1, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [4], ['Fresh and tender'], ['Nice young bitter gourd. Very fresh.']),
      },
      {
        name: 'Fresh Ginger', description: 'Young raw ginger with thin skin and high essential oil content. Excellent for teas, curries and medicinal use. Organically grown in Wayanad.',
        price: 100, unit: 'kg', category: herbs._id, farmer: f_platinum2._id,
        stock: 70, isOrganic: true,
        images: ['https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600'],
        approvalStatus: 'approved', rating: 4.7, totalReviews: 2,
        ratingDistribution: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [5,4], ['Very fresh ginger','Great aroma'], ['The freshest ginger I have ever bought online. Incredible aroma.','Fresh and pungent. Great for daily chai.']),
      },
      {
        name: 'Coconut (Whole)', description: 'Mature Kerala coconuts, heavy with water and thick white flesh. Ideal for grinding chutneys, curries and extracting coconut milk.',
        price: 35, unit: 'piece', category: fruits._id, farmer: f_silver2._id,
        stock: 200, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1559181567-c3190bba9d4a?w=600'],
        approvalStatus: 'approved', rating: 4.3, totalReviews: 1,
        ratingDistribution: { 5: 0, 4: 1, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [4], ['Heavy and fresh coconuts'], ['Good quality coconuts. Heavy with water. Arrived intact.']),
      },
      {
        name: 'Fresh Potatoes', description: 'Firm, large potatoes straight from our Palakkad fields. Great for fries, curries and boiling. No sprouting — freshly dug.',
        price: 28, unit: 'kg', category: vegetables._id, farmer: f_bronze2._id,
        stock: 150, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600'],
        approvalStatus: 'approved', rating: 3.5, totalReviews: 1,
        ratingDistribution: { 5: 0, 4: 0, 3: 1, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [3], ['Decent potatoes'], ['Okay quality. Some were a bit small. But fresh.']),
      },
      {
        name: 'Curry Leaves (Fresh)', description: 'Freshly plucked curry leaves from our organic garden. Fragrant, dark green and absolutely essential for South Indian cooking.',
        price: 20, unit: 'bundle', category: herbs._id, farmer: f_gold1._id,
        stock: 80, isOrganic: true,
        images: ['https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600'],
        approvalStatus: 'approved', rating: 4.7, totalReviews: 1,
        ratingDistribution: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [5], ['So fresh and fragrant!'], ['These smell incredible. So much better than frozen curry leaves.']),
      },
      {
        name: 'Coriander Leaves', description: 'Freshly harvested coriander (cilantro) with roots intact for longer shelf life. Bright green, fragrant and essential for Indian cooking.',
        price: 15, unit: 'bundle', category: herbs._id, farmer: f_silver1._id,
        stock: 60, isOrganic: false,
        images: ['https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600'],
        approvalStatus: 'approved', rating: 3.9, totalReviews: 1,
        ratingDistribution: { 5: 0, 4: 1, 3: 0, 2: 0, 1: 0 },
        reviews: reviews(allCustomers, [4], ['Fresh coriander'], ['Fresh and fragrant. Stayed good for 5 days in the fridge.']),
      },

    ];

    await Product.create(productDefs);
    console.log(`✅ ${productDefs.length} products created`);

    console.log(`
🎉 Database seeded successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝  LOGIN CREDENTIALS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin      : admin@farm2home.com    / admin123
─── Farmers (all use password: farmer123) ─────────
💎 Platinum : rajan@farmer.com       (Kozhikode, Kerala)
💎 Platinum : lakshmi@farmer.com     (Thrissur, Kerala)
🥇 Gold     : priya@farmer.com       (Kochi, Kerala)
🥇 Gold     : murugan@farmer.com     (Coimbatore, Tamil Nadu)
🥈 Silver   : anitha@farmer.com      (Bengaluru, Karnataka)
🥈 Silver   : thomas@farmer.com      (Kottayam, Kerala)
🥉 Bronze   : kavitha@farmer.com     (Mangaluru, Karnataka)
🥉 Bronze   : vinod@farmer.com       (Palakkad, Kerala)
─── Customers (all use password: customer123) ─────
             arjun@customer.com      (Kozhikode)
             sneha@customer.com      (Kochi)
             ravi@customer.com       (Bengaluru)
─── Delivery ─────────────────────────────────────
             suresh@delivery.com    / delivery123
             mohan@delivery.com     / delivery123
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛒  Carousel products (same name, multiple farmers):
    • Fresh Tomatoes       — 4 farmers (₹20–₹35)
    • Green Spinach        — 3 farmers
    • Organic Rice         — 3 farmers
    • Nendran Bananas      — 3 farmers
    • Fresh Cow Milk       — 2 farmers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
    return true; // Indicate success
  } catch (err) {
    console.error('❌ Seed error:', err);
    throw err; // Re-throw for caller to handle
  }
};

// Only run and exit if this file is executed directly
if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal seed error:', err);
      process.exit(1);
    });
} else {
  // If required as a module, export the function
  module.exports = seedData;
}
