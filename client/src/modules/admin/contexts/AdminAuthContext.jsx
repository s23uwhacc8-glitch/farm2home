import React, { createContext, useState, useCallback, useEffect } from 'react';
import axios from '../../../core/config/axios';

export const AdminAuthContext = createContext();

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState(null);
  const [adminPermissions, setAdminPermissions] = useState([]);

  // Check if admin is already logged in (on page load)
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      verifyAdminToken(adminToken);
    } else {
      setAdminLoading(false);
    }
  }, []);

  const verifyAdminToken = async (token) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.get('/api/admin/auth/verify', config);
      
      setAdminUser(response.data.admin);
      setAdminPermissions(response.data.permissions || []);
      setIsAdminAuthenticated(true);
      setAdminLoading(false);
    } catch (error) {
      console.error('Admin token verification failed:', error);
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminEmail');
      setAdminLoading(false);
    }
  };

  const adminLogin = useCallback(async (email, password, adminCode) => {
    setAdminLoading(true);
    setAdminError(null);
    
    try {
      const response = await axios.post('/api/admin/auth/login', {
        email,
        password,
        adminCode // Optional extra security layer
      });

      const { token, admin, permissions } = response.data;
      
      // Store admin-specific token (different from regular user token)
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminEmail', admin.email);
      localStorage.setItem('adminRole', admin.role);
      
      setAdminUser(admin);
      setAdminPermissions(permissions);
      setIsAdminAuthenticated(true);
      setAdminLoading(false);
      
      return { success: true, admin };
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Admin login failed';
      setAdminError(errorMessage);
      setAdminLoading(false);
      return { success: false, error: errorMessage };
    }
  }, []);

  const adminLogout = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (token) {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        await axios.post('/api/admin/auth/logout', {}, config);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminEmail');
      localStorage.removeItem('adminRole');
      setAdminUser(null);
      setIsAdminAuthenticated(false);
      setAdminPermissions([]);
    }
  }, []);

  const hasAdminPermission = useCallback((permission) => {
    // If no granular permissions are set (the common case), all admins have all permissions.
    // Granular permissions can be introduced later without breaking existing behaviour.
    if (!adminPermissions || adminPermissions.length === 0) {
      return adminUser?.role === 'admin';
    }
    return adminPermissions.includes(permission) || adminUser?.role === 'admin';
  }, [adminPermissions, adminUser]);

  const canManagePayments = useCallback(() => {
    return hasAdminPermission('MANAGE_PAYMENTS');
  }, [hasAdminPermission]);

  const canManageUsers = useCallback(() => {
    return hasAdminPermission('MANAGE_USERS');
  }, [hasAdminPermission]);

  const canManageCommissions = useCallback(() => {
    return hasAdminPermission('MANAGE_COMMISSIONS');
  }, [hasAdminPermission]);

  const canViewReports = useCallback(() => {
    return hasAdminPermission('VIEW_REPORTS');
  }, [hasAdminPermission]);

  const canViewAuditLogs = useCallback(() => {
    return hasAdminPermission('VIEW_AUDIT_LOGS');
  }, [hasAdminPermission]);

  const value = {
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
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};
