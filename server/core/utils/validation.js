/**
 * Input Validation Utilities
 * Provides validation functions for common input types
 */

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Indian phone number (10 digits)
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate Indian pincode (6 digits)
 */
const isValidPincode = (pincode) => {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  return pincodeRegex.test(pincode);
};

/**
 * Validate password strength
 */
const isValidPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sanitize string input
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Validate and sanitize user registration data
 */
const validateRegistration = (data) => {
  const errors = [];
  
  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  // Email validation
  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }
  
  // Password validation
  if (!data.password || data.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  // Phone validation
  if (!data.phone || !isValidPhone(data.phone)) {
    errors.push('Valid 10-digit phone number is required');
  }
  
  // Role validation
  const validRoles = ['customer', 'farmer', 'delivery', 'admin'];
  if (data.role && !validRoles.includes(data.role)) {
    errors.push('Invalid role specified');
  }
  
  const sanitized = {
    name: sanitizeString(data.name),
    email: data.email?.toLowerCase().trim(),
    password: data.password,
    phone: data.phone,
    role: data.role || 'customer'
  };

  // Pass through role-specific profile data submitted during registration
  if (data.farmerProfile && typeof data.farmerProfile === 'object') {
    sanitized.farmerProfile = data.farmerProfile;
  }
  if (data.deliveryProfile && typeof data.deliveryProfile === 'object') {
    sanitized.deliveryProfile = data.deliveryProfile;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
};

/**
 * Validate product data
 */
const validateProduct = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim().length < 3) {
    errors.push('Product name must be at least 3 characters long');
  }
  
  if (!data.description || data.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters long');
  }
  
  if (!data.price || data.price <= 0) {
    errors.push('Price must be greater than 0');
  }
  
  if (!data.stock || data.stock < 0) {
    errors.push('Stock cannot be negative');
  }
  
  if (!data.category || !isValidObjectId(data.category)) {
    errors.push('Valid category ID is required');
  }
  
  const validUnits = ['kg', 'g', 'litre', 'ml', 'piece', 'dozen', 'bundle', 'bag'];
  if (!data.unit || !validUnits.includes(data.unit)) {
    errors.push('Valid unit is required');
  }
  
  if (!data.images || !Array.isArray(data.images) || data.images.length === 0) {
    errors.push('At least one image is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate order data
 */
const validateOrder = (data) => {
  const errors = [];
  
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Order must contain at least one item');
  }
  
  if (!data.deliveryAddress) {
    errors.push('Delivery address is required');
  } else {
    if (!data.deliveryAddress.street) errors.push('Street address is required');
    if (!data.deliveryAddress.city) errors.push('City is required');
    if (!data.deliveryAddress.state) errors.push('State is required');
    if (!data.deliveryAddress.pincode || !isValidPincode(data.deliveryAddress.pincode)) {
      errors.push('Valid 6-digit pincode is required');
    }
  }
  
  if (!data.payment || !data.payment.method) {
    errors.push('Payment method is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (page, limit, maxLimit = 100) => {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(maxLimit, Math.max(1, parseInt(limit) || 20));
  
  return {
    page: validPage,
    limit: validLimit,
    skip: (validPage - 1) * validLimit
  };
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidPincode,
  isValidPassword,
  isValidObjectId,
  sanitizeString,
  validateRegistration,
  validateProduct,
  validateOrder,
  validatePagination
};
