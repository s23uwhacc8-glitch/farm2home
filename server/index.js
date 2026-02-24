/**
 * Farm2Home - Modular Architecture
 * Main Server File
 * 
 * This file initializes the Express server and connects all modules
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { config, validateEnv } = require('./core/config/env');
const { notFound, errorHandler } = require('./core/middleware/errorHandler');
const { validateCloudinaryConfig } = require('./core/utils/cloudinary');

// Validate environment variables before starting
validateEnv();
validateCloudinaryConfig();

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Gzip compress all responses — dramatically reduces payload size
app.use(compression());

// Security headers (XSS, clickjacking, MIME sniffing, etc.)
app.use(helmet());

// General API rate limiter — generous limit for normal usage
const limiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: config.rateLimitMax,           // 1000 in dev, set lower in prod
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Stricter limiter for auth endpoints — prevents brute force on login/register
const authLimiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please wait 15 minutes.' }
});

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (config.env === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// CORE ROUTES (Shared across all modules)
// ============================================

// Authentication routes (login, register, get user)
app.use('/api/auth', authLimiter, require('./core/routes/auth'));

// Categories routes (public + admin managed)
app.use('/api/categories', require('./core/routes/categories'));

// Feedback routes
app.use('/api/feedback', require('./core/routes/feedback'));

// ============================================
// MODULE ROUTES
// ============================================

// Admin Authentication (must come before main admin routes)
app.use('/api/admin/auth', require('./modules/admin/routes/adminAuthRoutes'));

// Customer Module - Public product browsing, orders, cart
app.use('/api/customer', require('./modules/customer/routes/customerRoutes'));

// Farmer Module - Product management, farmer dashboard
app.use('/api/farmer', require('./modules/farmer/routes/farmerRoutes'));

// Delivery Module - Delivery agent operations
app.use('/api/delivery', require('./modules/delivery/routes/deliveryRoutes'));

// Admin Module - Administrative operations
app.use('/api/admin', require('./modules/admin/routes/adminRoutes'));

// Payment Module - Customer proof submission + admin approval workflow
app.use('/api/payment', require('./modules/payment/routes/paymentRoutes'));

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'ok', 
    message: 'Farm2Home API is running',
    environment: config.env,
    timestamp: new Date().toISOString(),
    architecture: 'modular',
    modules: ['customer', 'farmer', 'delivery', 'admin']
  });
});

app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Welcome to Farm2Home API - Modular Architecture',
    version: '2.0',
    environment: config.env,
    endpoints: {
      core: ['/api/auth', '/api/categories', '/api/feedback'],
      modules: {
        customer: '/api/customer',
        farmer: '/api/farmer',
        delivery: '/api/delivery',
        admin: '/api/admin'
      },
      health: '/health'
    },
    documentation: 'See README.md and API_REFERENCE.md for details'
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler - must come after all routes
app.use(notFound);

// Global error handler - must be last
app.use(errorHandler);

// ============================================
// DATABASE CONNECTION
// ============================================

mongoose.set('strictQuery', false);
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
    console.log('🏗️  Modular Architecture Loaded');
    console.log('📦 Modules: Customer | Farmer | Delivery | Admin');
    console.log('🌍 Environment:', config.env);
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB Runtime Error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB Disconnected');
});

// ============================================
// SERVER START
// ============================================

const server = app.listen(config.port, () => {
  console.log('═══════════════════════════════════════════');
  console.log('🚀 Farm2Home Server Started Successfully!');
  console.log('═══════════════════════════════════════════');
  console.log(`🌐 Server running on port: ${config.port}`);
  console.log(`📍 Environment: ${config.env}`);
  console.log(`🔗 API URL: http://localhost:${config.port}`);
  console.log(`💚 Health check: http://localhost:${config.port}/health`);
  console.log('═══════════════════════════════════════════');
});

// ============================================
// GRACEFUL SHUTDOWN
// BUG FIXED: SIGTERM handler now declared AFTER `server` is initialised.
// Previously it referenced `server` before `const server = app.listen(...)`,
// which would throw a ReferenceError if SIGTERM fired during startup.
// ============================================

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('💤 HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('💤 MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = app;
