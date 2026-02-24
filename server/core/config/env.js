/**
 * Environment Configuration & Validation
 * Validates all required environment variables at startup
 */

const dotenv = require('dotenv');
dotenv.config();

/**
 * Required environment variables
 */
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'PORT'
];

/**
 * Validate environment variables
 */
function validateEnv() {
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ CRITICAL: Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 Create a .env file with all required variables');
    console.error('   See .env.example for reference\n');
    process.exit(1);
  }
  
  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters long for security');
  }
  
  console.log('✅ Environment variables validated successfully');
}

/**
 * Configuration object
 */
const config = {
  // Server
  port: parseInt(process.env.PORT) || 5000,
  env: process.env.NODE_ENV || 'development',
  
  // Database
  mongoUri: process.env.MONGO_URI,
  
  // Authentication
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  adminCode: process.env.ADMIN_CODE || null, // Optional: Extra security for admin login
  
  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Rate Limiting
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 requests per window

  // AI (optional — required only if AI Price Advisor feature is used)
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
  
  // Pagination
  defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE) || 20,
  maxPageSize: parseInt(process.env.MAX_PAGE_SIZE) || 100
};

module.exports = { config, validateEnv };
