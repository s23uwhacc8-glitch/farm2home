import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../core/config/axios';

const ForgotPassword = () => {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address'); return; }
    setLoading(true); setError('');
    try {
      await axios.post('/api/auth/forgot-password', { email });
      setSent(true);
    } catch(err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/logo.svg" alt="Farm2Home" className="w-12 h-12"/>
            <span className="text-2xl font-black text-green-700">Farm<span className="text-green-500">2</span>Home</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {sent ? (
            /* Success state */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✉️</div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Check your email!</h2>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                We've sent a password reset link to <strong>{email}</strong>. 
                Check your inbox (and spam folder) — the link expires in 1 hour.
              </p>
              <div className="space-y-3">
                <button onClick={() => { setSent(false); setEmail(''); }} className="w-full py-3 border border-gray-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition">
                  Try a different email
                </button>
                <Link to="/login" className="block w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold text-center transition">
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            /* Form state */
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900 mb-1">Forgot password?</h2>
                <p className="text-gray-500 text-sm">Enter your email and we'll send you a reset link.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com"
                    autoFocus
                    className="w-full px-4 py-3.5 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sending…</>
                  ) : '📨 Send Reset Link'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-400 mt-6">
                Remember your password?{' '}
                <Link to="/login" className="text-green-700 font-semibold hover:underline">Log in</Link>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          The reset link is sent via email and expires in 1 hour.{' '}
          <br/>Using Gmail SMTP — free of charge.
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
