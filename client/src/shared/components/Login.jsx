import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const EyeIcon = ({ open }) =>
  open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = field => e => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    const result = await login(form.email, form.password);
    setLoading(false);
    if (result.success) {
      const role = result.user?.role;
      if      (role === 'admin')    navigate('/admin');
      else if (role === 'farmer')   navigate('/farmer');
      else if (role === 'delivery') navigate('/delivery');
      else if (role === 'customer') navigate('/customer');
      else                          navigate('/products');
    } else {
      setError(result.message || 'Invalid email or password.');
    }
  };

  const inputBase = `w-full py-3.5 border rounded-xl bg-white text-gray-900 placeholder-gray-400 text-sm
    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
    transition-all duration-200 border-gray-200`;

  return (
    <div className="min-h-screen flex">

      {/* LEFT — hero panel (hidden on mobile) */}
      <div
        className="hidden lg:flex lg:w-1/2 relative flex-col"
        style={{ background: '#071a0c' }}
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1400)',
            opacity: 0.42,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(150deg,rgba(0,0,0,0.5) 0%,rgba(20,83,45,0.65) 55%,rgba(0,0,0,0.7) 100%)',
          }}
        />
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="Farm2Home" className="w-10 h-10" />
            <span className="text-white text-xl font-bold tracking-tight">
              Farm<span style={{ color: '#4ade80' }}>2</span>Home
            </span>
          </Link>
          {/* Hero copy */}
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
              style={{ background: 'rgba(34,197,94,0.18)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              🌱 Farm Fresh · Delivered Daily
            </div>
            <h2
              className="text-4xl font-bold text-white leading-snug mb-4"
              style={{ fontFamily: "'Outfit', 'DM Sans', sans-serif" }}
            >
              From Field<br />to Your Table
            </h2>
            <p className="text-base mb-10" style={{ color: 'rgba(255,255,255,0.72)', maxWidth: '340px' }}>
              Connecting you directly with local farmers — fresher produce, fair prices, full transparency.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: '500+', l: 'Local Farmers' },
                { v: '4.8★', l: 'Avg. Rating' },
                { v: '24hr', l: 'Delivery' },
              ].map(({ v, l }) => (
                <div
                  key={l}
                  className="p-4 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)' }}
                >
                  <div className="text-xl font-bold mb-0.5" style={{ color: '#4ade80' }}>{v}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.52)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Supporting local farmers · Building community
          </p>
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">

          {/* Back to Home */}
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-green-600 font-medium mb-8 transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src="/logo.svg" alt="Farm2Home" className="w-8 h-8" />
            <span className="text-green-700 text-lg font-bold">
              Farm<span className="text-green-500">2</span>Home
            </span>
          </div>

          <h1
            className="text-3xl font-bold text-gray-900 mb-1"
            style={{ fontFamily: "'Outfit', 'DM Sans', sans-serif" }}
          >
            Welcome back
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Sign in to your account.{' '}
            <Link to="/register" className="text-green-600 font-semibold hover:text-green-700">
              New here?
            </Link>
          </p>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 pointer-events-none">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                  required
                  className={`${inputBase} pl-11 pr-4`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-green-700 font-semibold hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 pointer-events-none">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="current-password"
                  required
                  className={`${inputBase} pl-11 pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-xl font-semibold text-white text-base
                shadow-lg hover:shadow-xl transition-all duration-200
                hover:-translate-y-0.5 active:translate-y-0 active:shadow-md
                disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in →'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-gray-50 px-3 text-gray-400 font-medium uppercase tracking-widest">or</span>
            </div>
          </div>

          {/* Guest link */}
          <Link
            to="/products"
            className="block w-full py-3.5 text-center border-2 border-gray-200 rounded-xl
              text-gray-700 font-medium text-sm
              hover:border-green-400 hover:text-green-700 hover:bg-green-50
              transition-all duration-200"
          >
            Continue as Guest
          </Link>

          {/* Sign up */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-green-600 font-semibold hover:text-green-700">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
