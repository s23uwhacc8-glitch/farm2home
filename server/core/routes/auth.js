/**
 * Authentication Routes — with full email integration
 * Register, Login, Email Verification, Forgot Password, Reset Password
 */

const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const User     = require('../models/User');
const auth     = require('../middleware/auth');
const { config } = require('../config/env');
const { validateRegistration, isValidEmail } = require('../utils/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} = require('../utils/emailService');
const {
  uploadProfilePhoto,
  uploadVerificationDocs,
} = require('../utils/cloudinary');

const CLIENT_BASE_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', asyncHandler(async (req, res) => {
  const validation = validateRegistration(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: validation.errors });
  }

  const { email } = validation.sanitized;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'User with this email already exists', code: 'EMAIL_EXISTS' });
  }

  // ── Upload images to Cloudinary before saving ──────────────────────────────
  const sanitized = { ...validation.sanitized };

  // Profile photo (optional for all roles)
  if (sanitized.profileImage && sanitized.profileImage.startsWith('data:')) {
    try {
      sanitized.profileImage = await uploadProfilePhoto(sanitized.profileImage);
    } catch (err) {
      console.error('Profile photo upload failed during registration:', err.message);
      sanitized.profileImage = null; // don't block registration
    }
  }

  // Farmer verification docs
  if (sanitized.farmerProfile?.verificationDocs) {
    // We don't have a userId yet — save user first, then upload with the real ID
    // We'll use a temp placeholder and update after save
    const rawDocs = sanitized.farmerProfile.verificationDocs;
    sanitized.farmerProfile.verificationDocs = {}; // cleared; filled after save
    const user = new User(sanitized);
    await user.save();

    user.farmerProfile.verificationDocs = await uploadVerificationDocs(rawDocs, user._id.toString());
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiry });
    sendWelcomeEmail({ to: user.email, name: user.name, role: user.role }).catch(() => {});
    return res.status(201).json({
      success: true, message: 'Registration successful', token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, accountStatus: user.accountStatus, createdAt: user.createdAt },
    });
  }

  // Delivery agent verification docs
  if (sanitized.deliveryProfile?.verificationDocs) {
    const rawDocs = sanitized.deliveryProfile.verificationDocs;
    sanitized.deliveryProfile.verificationDocs = {};
    const user = new User(sanitized);
    await user.save();

    user.deliveryProfile.verificationDocs = await uploadVerificationDocs(rawDocs, user._id.toString());
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiry });
    sendWelcomeEmail({ to: user.email, name: user.name, role: user.role }).catch(() => {});
    return res.status(201).json({
      success: true, message: 'Registration successful', token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, accountStatus: user.accountStatus, createdAt: user.createdAt },
    });
  }

  // No verification docs (customer or no docs provided)
  const user = new User(sanitized);
  await user.save();

  const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiry });

  // Send welcome email (non-blocking)
  sendWelcomeEmail({ to: user.email, name: user.name, role: user.role }).catch(() => {});

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, accountStatus: user.accountStatus, createdAt: user.createdAt },
  });
}));

// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required', code: 'MISSING_CREDENTIALS' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format', code: 'INVALID_EMAIL' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
  }

  if (!user.accountStatus.isActive) {
    return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.', code: 'ACCOUNT_DEACTIVATED' });
  }

  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiry });

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, accountStatus: user.accountStatus, lastLogin: user.lastLogin, farmerProfile: user.farmerProfile, deliveryProfile: user.deliveryProfile },
  });
}));

// ── Get current user ───────────────────────────────────────────────────────────
router.get('/me', auth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').lean();
  res.json({ success: true, user });
}));

// ── Update profile ─────────────────────────────────────────────────────────────
router.put('/update-profile', auth, asyncHandler(async (req, res) => {
  const { name, phone, address, profileImage } = req.body;
  const updateData = {};
  if (name)    updateData.name = name.trim();
  if (phone)   updateData.phone = phone;
  if (address) updateData.address = address;

  // Upload new profile photo to Cloudinary if it's a fresh base64 upload
  if (profileImage) {
    if (profileImage.startsWith('data:')) {
      updateData.profileImage = await uploadProfilePhoto(profileImage);
    } else {
      updateData.profileImage = profileImage; // already a URL, keep as-is
    }
  } else if (profileImage === '') {
    updateData.profileImage = ''; // explicit clear
  }

  const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true }).select('-password');
  res.json({ success: true, message: 'Profile updated successfully', user });
}));

// ── Change password ────────────────────────────────────────────────────────────
router.post('/change-password', auth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current password and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
  }

  const user = await User.findById(req.user._id);
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({ success: false, message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password changed successfully' });
}));

// ── Send email verification OTP ───────────────────────────────────────────────
router.post('/send-verification', auth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.emailVerified) {
    return res.status(400).json({ success: false, message: 'Email is already verified' });
  }

  // Throttle: no resend within 60 seconds
  if (user.emailVerificationExpiry && user.emailVerificationExpiry > new Date(Date.now() - 60_000)) {
    const secsLeft = Math.ceil((user.emailVerificationExpiry - (Date.now() - 9 * 60_000)) / 1000);
    return res.status(429).json({ success: false, message: `Please wait before requesting another code (${secsLeft}s remaining)` });
  }

  const otp    = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  user.emailVerificationOTP    = otp;
  user.emailVerificationExpiry = expiry;
  await user.save();

  // Send OTP via email
  await sendVerificationEmail({ to: user.email, name: user.name, otp });

  const isDev = process.env.NODE_ENV !== 'production';
  res.json({
    success: true,
    message: `Verification code sent to ${user.email}`,
    email: user.email,
    ...(isDev && { otp }), // only expose in dev
    expiresInMinutes: 10,
  });
}));

// ── Verify email OTP ───────────────────────────────────────────────────────────
router.post('/verify-email', auth, asyncHandler(async (req, res) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ success: false, message: 'Verification code is required' });

  const user = await User.findById(req.user._id);

  if (user.emailVerified) return res.status(400).json({ success: false, message: 'Email is already verified' });
  if (!user.emailVerificationOTP) return res.status(400).json({ success: false, message: 'No verification code found. Please request a new one.' });
  if (new Date() > user.emailVerificationExpiry) return res.status(400).json({ success: false, message: 'Code expired. Please request a new one.' });
  if (user.emailVerificationOTP !== otp.trim()) return res.status(400).json({ success: false, message: 'Incorrect verification code' });

  user.emailVerified           = true;
  user.emailVerificationOTP    = null;
  user.emailVerificationExpiry = null;
  await user.save();

  res.json({ success: true, message: 'Email verified successfully! 🎉' });
}));

// ── Forgot password — request reset link ─────────────────────────────────────
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always respond success to prevent user enumeration
  if (!user) {
    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  }

  // Generate a secure random reset token
  const resetToken  = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiry      = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.passwordResetToken  = hashedToken;
  user.passwordResetExpiry = expiry;
  await user.save();

  // Send reset email
  await sendPasswordResetEmail({
    to:         user.email,
    name:       user.name,
    resetToken, // send the unhashed token (link will hash it on arrival)
    baseUrl:    CLIENT_BASE_URL,
  });

  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
}));

// ── Reset password — with token from email ────────────────────────────────────
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ success: false, message: 'Token and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken:  hashedToken,
    passwordResetExpiry: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset link. Please request a new one.' });
  }

  user.password           = newPassword;
  user.passwordResetToken  = null;
  user.passwordResetExpiry = null;
  await user.save();

  res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
}));

module.exports = router;
