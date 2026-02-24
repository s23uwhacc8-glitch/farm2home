import { useContext } from 'react';
import { AdminAuthContext } from '../contexts/AdminAuthContext';

/**
 * Custom hook to access admin authentication and permissions
 * 
 * Usage:
 * const { adminUser, isAdmin, canManagePayments, adminLogout } = useAdmin();
 */
export const useAdmin = () => {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdmin must be used within AdminAuthProvider');
  }

  const {
    adminUser,
    isAdminAuthenticated,
    adminLoading,
    adminError,
    adminPermissions,
    adminLogin,
    adminLogout,
    hasAdminPermission,
    canManagePayments,
    canManageUsers,
    canManageCommissions,
    canViewReports,
    canViewAuditLogs
  } = context;

  return {
    // User data
    adminUser,
    
    // Authentication status
    isAdmin: isAdminAuthenticated,
    isLoading: adminLoading,
    error: adminError,
    
    // Admin info
    adminEmail: adminUser?.email,
    adminRole: adminUser?.role,
    adminName: adminUser?.name,
    permissions: adminPermissions,
    
    // Methods
    login: adminLogin,
    logout: adminLogout,
    hasPermission: hasAdminPermission,
    
    // Permission shortcuts
    canManagePayments,
    canManageUsers,
    canManageCommissions,
    canViewReports,
    canViewAuditLogs,
    
    // Utility methods
    isAdminAccessible: () => isAdminAuthenticated && adminUser !== null,
    
    // Get admin full info
    getAdminInfo: () => ({
      email: adminUser?.email,
      name: adminUser?.name,
      role: adminUser?.role,
      lastLogin: adminUser?.lastLogin
    })
  };
};

export default useAdmin;
