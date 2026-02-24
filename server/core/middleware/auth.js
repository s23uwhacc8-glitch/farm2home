/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { config } = require('../config/env');

/**
 * Middleware to verify JWT token and authenticate user
 */
const auth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Access denied. No token provided.' 
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false,
          message: 'Token expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }

    // Find user
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found. Token invalid.',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user account is active
    if (!user.accountStatus.isActive) {
      return res.status(403).json({ 
        success: false,
        message: 'Account is deactivated. Please contact support.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Authentication error',
      error: config.env === 'development' ? error.message : undefined
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't fail if no token
 * Used for routes that support both authenticated and guest users
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    // If no token, just continue without setting req.user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.replace('Bearer ', '');

    // Try to verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      // Token is invalid/expired, but we don't fail - just continue without user
      return next();
    }

    // Find user
    const user = await User.findById(decoded.id).select('-password');
    
    // If user exists and is active, attach to request
    if (user && user.accountStatus.isActive) {
      req.user = user;
      req.userId = user._id;
      req.userRole = user.role;
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Don't fail on error, just continue
    next();
  }
};

module.exports = auth;
module.exports.optionalAuth = optionalAuth;
