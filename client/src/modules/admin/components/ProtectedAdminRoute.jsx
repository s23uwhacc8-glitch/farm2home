import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';

/**
 * ProtectedAdminRoute Component
 * 
 * Protects admin routes from unauthorized access
 * Only allows logged-in admins with proper permissions
 * 
 * Usage:
 * <ProtectedAdminRoute 
 *   element={<PaymentApprovalPage />}
 *   requiredPermission="MANAGE_PAYMENTS"
 * />
 */
export const ProtectedAdminRoute = ({ 
  element, 
  requiredPermission = null,
  requiredRole = null 
}) => {
  const { isAdmin, isLoading, adminUser, hasPermission } = useAdmin();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-farm-green mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to admin login
  if (!isAdmin) {
    return <Navigate to="/admin-login" replace />;
  }

  // Check specific role requirement
  if (requiredRole && adminUser?.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0a8 8 0 100-16 8 8 0 000 16zm0-12a4 4 0 110 8 4 4 0 010-8z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">You don't have the required admin role to access this page.</p>
            <a 
              href="/admin/dashboard"
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Check specific permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-orange-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Insufficient Permissions</h2>
            <p className="text-gray-600 mb-6">You don't have permission to access this feature.</p>
            <p className="text-sm text-gray-500 mb-6">Required: <span className="font-semibold">{requiredPermission}</span></p>
            <a 
              href="/admin/dashboard"
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // All checks passed - render the protected component
  return element;
};

export default ProtectedAdminRoute;
