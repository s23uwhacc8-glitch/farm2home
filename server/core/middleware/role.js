/**
 * Role-Based Access Control Middleware
 * Checks if user has required role and approval status
 */

/**
 * Middleware to check if user has one of the required roles
 * @param  {...string} roles - Allowed roles
 */
const role = (...roles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `Access denied. Required role: ${roles.join(' or ')}`,
        code: 'ROLE_FORBIDDEN',
        userRole: req.user.role,
        requiredRoles: roles
      });
    }

    // Check approval status for farmers and delivery agents
    if (['farmer', 'delivery'].includes(req.user.role)) {
      if (!req.user.accountStatus.isApproved) {
        return res.status(403).json({ 
          success: false,
          message: 'Your account is pending approval. Please wait for admin approval.',
          code: 'ACCOUNT_PENDING_APPROVAL',
          approvalStatus: req.user.accountStatus.approvalStatus
        });
      }
      
      if (req.user.accountStatus.approvalStatus === 'rejected') {
        return res.status(403).json({ 
          success: false,
          message: 'Your account has been rejected.',
          code: 'ACCOUNT_REJECTED',
          rejectionReason: req.user.accountStatus.rejectionReason
        });
      }
    }

    next();
  };
};

/**
 * Middleware to check if user is admin
 */
const adminOnly = role('admin');

/**
 * Middleware to check if user is farmer
 */
const farmerOnly = role('farmer');

/**
 * Middleware to check if user is delivery agent
 */
const deliveryOnly = role('delivery');

/**
 * Middleware to check if user is customer
 */
const customerOnly = role('customer');

module.exports = { role, adminOnly, farmerOnly, deliveryOnly, customerOnly };
