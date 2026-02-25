import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';

const Nav = () => {
  const { user, logout } = useAuth();
  const { getCartItemsCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isHome = location.pathname === '/';
  const cartCount = getCartItemsCount();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return null;
    switch (user.role) {
      case 'admin': return '/admin';
      case 'farmer': return '/farmer';
      case 'delivery': return '/delivery';
      case 'customer': return '/customer';
      default: return '/';
    }
  };

  const getDashboardLabel = () => {
    if (!user) return '';
    switch (user.role) {
      case 'admin': return '⚙️ Admin';
      case 'farmer': return '🌾 My Farm';
      case 'delivery': return '🛵 Deliveries';
      case 'customer': return '📦 My Orders';
      default: return 'Dashboard';
    }
  };

  const isTransparent = isHome && !scrolled;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isTransparent ? 'bg-transparent' : 'bg-white shadow-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <img 
              src="/logo.svg" 
              alt="Farm2Home Logo" 
              className="w-10 h-10 transition-transform duration-300 group-hover:scale-110"
            />
            <span className={`text-xl font-bold tracking-tight transition-colors duration-300 ${isTransparent ? 'text-white' : 'text-green-700'}`}>
              Farm<span className={`transition-colors duration-300 ${isTransparent ? 'text-green-300' : 'text-green-500'}`}>2</span>Home
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { to: '/', label: 'Home' },
              { to: '/products', label: 'Products' },
              ...(!user ? [{ to: '/track-order', label: '📦 Track Order' }] : []),
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isTransparent
                    ? 'text-white/90 hover:text-white hover:bg-white/15'
                    : 'text-gray-600 hover:text-green-700 hover:bg-green-50'
                }`}
              >
                {label}
              </Link>
            ))}
            {user && getDashboardLink() && (
              <Link
                to={getDashboardLink()}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  isTransparent
                    ? 'text-white/90 hover:text-white hover:bg-white/15'
                    : 'text-gray-600 hover:text-green-700 hover:bg-green-50'
                }`}
              >
                {getDashboardLabel()}
              </Link>
            )}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-3">
            {/* Cart */}
            <Link
              to="/cart"
              className={`relative p-2 rounded-full transition-all duration-300 ${
                isTransparent ? 'text-white hover:bg-white/15' : 'text-gray-600 hover:text-green-700 hover:bg-green-50'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className={`flex items-center gap-2 px-2 py-1 rounded-full transition-all duration-300 ${
                    isTransparent
                      ? 'hover:bg-white/15'
                      : 'hover:bg-green-50'
                  }`}
                  title="My Profile"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}
                  >
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-sm font-medium ${isTransparent ? 'text-white' : 'text-gray-700'}`}>
                    {user.name?.split(' ')[0]}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold border-2 border-red-400 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all duration-300 ${
                    isTransparent
                      ? 'border-white/70 text-white hover:bg-white/20'
                      : 'border-green-600 text-green-700 hover:bg-green-600 hover:text-white'
                  }`}
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 rounded-full text-sm font-semibold text-white transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: Cart + Hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <Link to="/cart" className={`relative p-2 ${isTransparent ? 'text-white' : 'text-gray-700'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-lg ${isTransparent ? 'text-white' : 'text-gray-700'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-xl">
          <div className="px-4 py-3 space-y-1">
            <Link to="/" className="flex items-center gap-2 px-3 py-2.5 text-gray-700 font-medium hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors">
              🏠 Home
            </Link>
            <Link to="/products" className="flex items-center gap-2 px-3 py-2.5 text-gray-700 font-medium hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors">
              🛒 Products
            </Link>
            {!user && (
              <Link to="/track-order" className="flex items-center gap-2 px-3 py-2.5 text-gray-700 font-medium hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors">
                📦 Track Order
              </Link>
            )}
            {user && (
              <Link to="/profile" className="flex items-center gap-2 px-3 py-2.5 text-gray-700 font-medium hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors">
                👤 My Profile
              </Link>
            )}
            {user && getDashboardLink() && (
              <Link to={getDashboardLink()} className="flex items-center gap-2 px-3 py-2.5 text-gray-700 font-medium hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors">
                {getDashboardLabel()}
              </Link>
            )}
            <div className="pt-2 border-t border-gray-100">
              {user ? (
                <>
                  <Link to="/profile" className="px-3 py-2 flex items-center gap-2 hover:bg-green-50 rounded-lg transition-colors">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-gray-800 font-semibold">{user.name}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full mt-1 px-3 py-2.5 text-left text-red-500 font-medium hover:bg-red-50 rounded-lg transition-colors"
                  >
                    🚪 Logout
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <Link to="/login" className="px-3 py-2.5 text-center text-green-700 font-semibold border-2 border-green-600 rounded-xl hover:bg-green-50 transition-colors">
                    Log In
                  </Link>
                  <Link to="/register" className="px-3 py-2.5 text-center text-white font-semibold rounded-xl transition-colors" style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Nav;
