/**
 * Auto-Seeder Utility
 * Automatically seeds the database on first deployment
 * Prevents re-seeding by checking a SeedFlag document
 */

const SeedFlag = require('../models/SeedFlag');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

/**
 * Check if database should be seeded
 */
async function shouldSeed() {
  try {
    // Check if seed flag exists
    const flag = await SeedFlag.findOne({});
    
    if (flag && flag.hasSeeded) {
      console.log('ℹ️  Database already seeded (skipping)');
      return false;
    }

    // Check if any users exist (backup check)
    const userCount = await User.countDocuments();
    const categoryCount = await Category.countDocuments();
    const productCount = await Product.countDocuments();
    
    if (userCount > 0 || categoryCount > 0 || productCount > 0) {
      console.log('ℹ️  Database has existing data (skipping seed)');
      
      // Create flag to prevent future attempts
      if (!flag) {
        await SeedFlag.create({
          hasSeeded: true,
          seedVersion: '1.0',
          environment: process.env.NODE_ENV || 'production'
        });
      }
      
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Error checking seed status:', error.message);
    return false;
  }
}

/**
 * Mark database as seeded
 */
async function markSeeded() {
  try {
    await SeedFlag.create({
      hasSeeded: true,
      seedVersion: '1.0',
      environment: process.env.NODE_ENV || 'production',
      seededAt: new Date()
    });
    console.log('✅ Database marked as seeded');
  } catch (error) {
    console.error('❌ Error marking seed flag:', error.message);
  }
}

/**
 * Run the seeding process
 */
async function runAutoSeed() {
  try {
    console.log('🌱 Checking if database needs seeding...');
    
    // Check AUTO_SEED environment variable
    const autoSeedEnabled = process.env.AUTO_SEED === 'true' || process.env.AUTO_SEED === '1';
    
    if (!autoSeedEnabled) {
      console.log('ℹ️  Auto-seed disabled (set AUTO_SEED=true to enable)');
      return;
    }

    // Check if we should seed
    const needsSeeding = await shouldSeed();
    
    if (!needsSeeding) {
      return;
    }

    console.log('═══════════════════════════════════════════');
    console.log('🌱 AUTO-SEEDING DATABASE');
    console.log('═══════════════════════════════════════════');

    // Import and run the seed script
    const seedScript = require('../../seed');
    
    // If seed.js exports a function, call it
    // Otherwise it will execute on import
    if (typeof seedScript === 'function') {
      await seedScript();
    }

    // Mark as seeded
    await markSeeded();

    console.log('═══════════════════════════════════════════');
    console.log('✅ AUTO-SEED COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════');
    console.log('📊 Demo data loaded:');
    console.log('   • 1 Admin account');
    console.log('   • 3 Customers');
    console.log('   • 10 Farmers (4 tiers)');
    console.log('   • 2 Delivery agents');
    console.log('   • 5 Categories');
    console.log('   • 30+ Products');
    console.log('');
    console.log('🔐 Login credentials:');
    console.log('   Admin:    admin@farm2home.com / admin123');
    console.log('   Customer: arjun@customer.com / customer123');
    console.log('   Farmer:   rajan@farmer.com / farmer123');
    console.log('   Delivery: suresh@delivery.com / delivery123');
    console.log('═══════════════════════════════════════════');

  } catch (error) {
    console.error('═══════════════════════════════════════════');
    console.error('❌ AUTO-SEED FAILED');
    console.error('═══════════════════════════════════════════');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('═══════════════════════════════════════════');
    console.error('⚠️  Server will continue without seed data');
    console.error('💡 You can manually seed by running: npm run seed');
    console.error('═══════════════════════════════════════════');
  }
}

module.exports = {
  runAutoSeed,
  shouldSeed,
  markSeeded
};
