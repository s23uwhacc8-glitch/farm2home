/**
 * Admin Authentication Routes
 * Separate authentication system for admin users
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../../../core/models/User');
const auth = require('../../../core/middleware/auth');
const { config } = require('../../../core/config/env');
const { isValidEmail } = require('../../../core/utils/validation');

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, adminCode } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid email format'
      });
    }

    // Optional: Validate admin code if ADMIN_CODE is set in environment
    if (config.adminCode && adminCode !== config.adminCode) {
      return res.status(403).json({ 
        success: false,
        message: 'Invalid admin access code'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin access only.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!user.accountStatus.isActive) {
      return res.status(403).json({ 
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiry }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      },
      permissions: [] // Can be expanded later for granular permissions
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: config.env === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route   GET /api/admin/auth/verify
 * @desc    Verify admin token
 * @access  Private (Admin only)
 */
router.get('/verify', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin access only.'
      });
    }

    res.json({
      success: true,
      admin: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      },
      permissions: [] // Can be expanded later for granular permissions
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Admin logout (client-side token removal)
 * @access  Private
 */
router.post('/logout', auth, async (req, res) => {
  try {
    // In a real system, you might want to blacklist the token
    // For now, just send success response (client will remove token)
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
});

/**
 * @route   GET /api/admin/auth/profile
 * @desc    Get admin profile
 * @access  Private (Admin only)
 */
router.get('/profile', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
