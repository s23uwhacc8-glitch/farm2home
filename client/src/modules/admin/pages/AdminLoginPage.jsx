import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminAuthContext } from '../contexts/AdminAuthContext';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { adminLogin, adminLoading, adminError } = useContext(AdminAuthContext);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    adminCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (localError) setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    // Validation
    if (!formData.email || !formData.password || !formData.adminCode) {
      setLocalError('All fields are required');
      return;
    }

    if (!formData.email.includes('@')) {
      setLocalError('Invalid email format');
      return;
    }

    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (formData.adminCode.length < 6) {
      setLocalError('Invalid admin code format');
      return;
    }

    const result = await adminLogin(formData.email, formData.password, formData.adminCode);
    
    if (result.success) {
      // Redirect to admin dashboard
      navigate('/admin/dashboard');
    } else {
      setLocalError(result.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md">
        {/* Security Notice */}
        <div className="mb-8 text-center">
          <div className="inline-block p-3 bg-yellow-100 rounded-full mb-4">
            <svg className="h-8 w-8 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
          <p className="text-slate-300 text-sm">Secure Administration Access</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          {/* Error Message */}
          {(localError || adminError) && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-start">
              <svg className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-200 text-sm">{localError || adminError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@farm2home.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  disabled={adminLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Password
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  disabled={adminLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M15.171 13.576l1.414 1.414A6.981 6.981 0 0020 10c-1.274-4.057-5.064-7-9.542-7-1.913 0-3.744.27-5.502.778l1.414 1.414A8.002 8.002 0 0115.171 13.576zM12.501 8.697l.471.471A2 2 0 1011.28 6.16l.471.471z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Admin Code Field (Secret) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-200">
                  Admin Access Code
                </label>
                <span className="text-xs text-slate-400">🔐 Required</span>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                </svg>
                <input
                  type={showAdminCode ? 'text' : 'password'}
                  name="adminCode"
                  value={formData.adminCode}
                  onChange={handleChange}
                  placeholder="••••••"
                  className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  disabled={adminLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminCode(!showAdminCode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                >
                  {showAdminCode ? '👁️' : '🔒'}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Special admin code required for security
              </p>
            </div>

            {/* Remember Me */}
            <label className="flex items-center text-slate-300 hover:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 bg-slate-700 border border-slate-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm">Keep me logged in</span>
            </label>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={adminLoading}
              className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
            >
              {adminLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Access Admin Portal
                </>
              )}
            </button>
          </form>

          {/* Security Info */}
          <div className="mt-8 pt-6 border-t border-slate-700">
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="flex items-start">
                <span className="text-lg mr-2">🔒</span>
                <div className="text-sm text-slate-300">
                  <p className="font-semibold text-slate-200">Secure Access Only</p>
                  <p className="text-xs mt-1">This portal is restricted to authorized administrators only</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-lg mr-2">📝</span>
                <div className="text-sm text-slate-300">
                  <p className="font-semibold text-slate-200">Activity Logged</p>
                  <p className="text-xs mt-1">All admin actions are recorded in audit logs</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-lg mr-2">⏱️</span>
                <div className="text-sm text-slate-300">
                  <p className="font-semibold text-slate-200">Auto Logout</p>
                  <p className="text-xs mt-1">Session expires after 30 minutes of inactivity</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs mt-6">
          © 2024 Farm2Home Admin Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
