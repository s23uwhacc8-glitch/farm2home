/**
 * Farm2Home - Smart Startup Script
 * Automatically seeds database on first deployment if admin doesn't exist
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function runStartup() {
  try {
    console.log('═══════════════════════════════════════════');
    console.log('🚀 Farm2Home Startup');
    console.log('═══════════════════════════════════════════');
    console.log('📍 Environment:', process.env.NODE_ENV || 'development');
    console.log('🔍 Checking database connection...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is not set!');
    }
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected Successfully');

    // Import User model after connection
    const User = require('./core/models/User');
    
    // Check if any admin exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@farm2home.com';
    console.log(`🔍 Checking for admin account: ${adminEmail}`);
    
    const adminExists = await User.findOne({ role: 'admin' });

    if (adminExists) {
      console.log('✅ Admin account found - database already seeded');
      console.log('📧 Admin email:', adminExists.email);
      console.log('🚀 Starting server...');
      console.log('═══════════════════════════════════════════');
      await mongoose.connection.close();
      require('./index.js');
      return;
    }

    console.log('🌱 No admin found - seeding database...');
    console.log('═══════════════════════════════════════════');
    
    // Close connection before running seed (seed will create its own)
    await mongoose.connection.close();
    
    // Run seed script directly and wait for completion
    console.log('📦 Running seed script...');
    const seedData = require('./seed.js');
    await seedData();
    
    console.log('✅ Database seeded successfully!');
    console.log('🚀 Starting server...');
    console.log('═══════════════════════════════════════════');
    
    // Start the main server
    require('./index.js');
    
  } catch (error) {
    console.error('═══════════════════════════════════════════');
    console.error('❌ STARTUP ERROR:');
    console.error('═══════════════════════════════════════════');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.message.includes('MONGO_URI')) {
      console.error('\n💡 FIX: Set MONGO_URI in Render environment variables');
    }
    if (error.name === 'MongoServerError') {
      console.error('\n💡 FIX: Check MongoDB Atlas network access (allow 0.0.0.0/0)');
      console.error('💡 FIX: Verify MongoDB credentials are correct');
    }
    
    console.error('═══════════════════════════════════════════');
    process.exit(1);
  }
}

// Catch unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Promise Rejection:', error);
  process.exit(1);
});

runStartup();
