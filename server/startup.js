/**
 * Farm2Home - Smart Startup Script
 * Automatically seeds database on first deployment if admin doesn't exist
 */

const mongoose = require('mongoose');
const { config } = require('./core/config/env');
const User = require('./core/models/User');

async function runStartup() {
  try {
    console.log('🔍 Checking if database needs seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if admin exists
    const adminExists = await User.findOne({ 
      role: 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@farm2home.com'
    });

    if (adminExists) {
      console.log('✅ Admin account already exists - skipping seed');
      console.log('🚀 Starting server...');
      await mongoose.connection.close();
      require('./index.js'); // Start the main server
      return;
    }

    console.log('🌱 No admin found - running seed script...');
    
    // Run seed in a child process to avoid conflicts
    const { spawn } = require('child_process');
    const seedProcess = spawn('node', ['seed.js'], {
      stdio: 'inherit',
      cwd: __dirname
    });

    seedProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Database seeded successfully!');
        console.log('🚀 Starting server...');
        mongoose.connection.close().then(() => {
          require('./index.js'); // Start the main server
        });
      } else {
        console.error('❌ Seed failed with code:', code);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Startup error:', error);
    process.exit(1);
  }
}

runStartup();
