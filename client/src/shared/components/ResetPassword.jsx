import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from '../../core/config/axios';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [form, setForm]       = useState({ newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');
  const [showPw, setShowPw]   = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Invalid Reset Link</h2>
          <p className="text-gray-500 text-sm mb-6">This password reset link is invalid or missing a token.</p>
          <Link to="/forgot-password" className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (form.newPassword !== form.confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await axios.post('/api/auth/reset-password', { token, newPassword: form.newPassword });
      setDone(true);
    } catch(err) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/logo.svg" alt="Farm2Home" className="w-12 h-12"/>
            <span className="text-2xl font-black text-green-700">Farm<span className="text-green-500">2</span>Home</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✅</div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Password Reset!</h2>
              <p className="text-gray-500 text-sm mb-6">Your password has been updated. You can now log in with your new password.</p>
              <button onClick={() => navigate('/login')} className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition">
                Go to Login →
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900 mb-1">Create New Password</h2>
                <p className="text-gray-500 text-sm">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.newPassword}
                      onChange={e => { setForm(f => ({ ...f, newPassword: e.target.value })); setError(''); }}
                      placeholder="Min. 6 characters"
                      autoFocus
                      className="w-full px-4 py-3.5 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Confirm Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={e => { setForm(f => ({ ...f, confirm: e.target.value })); setError(''); }}
                    placeholder="Repeat your new password"
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
                >
                  {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Resetting…</> : '🔑 Reset Password'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-6">
                <Link to="/login" className="text-green-700 font-semibold hover:underline">← Back to Login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
