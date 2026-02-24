import React, { lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

// Axios config must load before any component that uses it
import './core/config/axios';

// Shared (always loaded — tiny, needed immediately)
import Nav      from './shared/components/Nav';
import Login    from './shared/components/Login';
import Register from './shared/components/Register';
import Welcome        from './shared/components/Welcome';
import ForgotPassword from './shared/components/ForgotPassword';
import ResetPassword  from './shared/components/ResetPassword';

// Contexts
import { AuthProvider, useAuth } from './shared/contexts/AuthContext';
import { CartProvider }          from './shared/contexts/CartContext';

// ── Lazy-loaded route components ─────────────────────────────────────────────
// Each module is code-split into its own JS chunk → faster initial load
const ProductList      = lazy(() => import('./modules/customer/pages/ProductList'));
const ProductDetail    = lazy(() => import('./modules/customer/pages/ProductDetail'));
const Cart             = lazy(() => import('./modules/customer/pages/Cart'));
const Checkout         = lazy(() => import('./modules/customer/pages/Checkout'));
const TrackOrder       = lazy(() => import('./modules/customer/pages/TrackOrder'));
const CustomerDashboard= lazy(() => import('./modules/customer/pages/CustomerDashboard'));
const PaymentUpload    = lazy(() => import('./modules/customer/pages/PaymentUpload'));
const PaymentSuccess   = lazy(() => import('./modules/customer/pages/PaymentSuccess'));
const ProfilePage      = lazy(() => import('./modules/customer/pages/ProfilePage'));
const FarmerProfile    = lazy(() => import('./modules/customer/pages/FarmerProfile'));
const PaymentSubmit    = lazy(() => import('./modules/payment/pages/PaymentSubmit'));
const FarmerDashboard  = lazy(() => import('./modules/farmer/pages/FarmerDashboard'));
const DeliveryDashboard= lazy(() => import('./modules/delivery/pages/DeliveryDashboard'));
const AdminDashboard   = lazy(() => import('./modules/admin/pages/AdminDashboard'));

// ── Suspense fallback ─────────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500 font-medium">Loading…</p>
    </div>
  </div>
);

// ── Protected route ───────────────────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user)   return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

// ── Page wrapper — adds top padding on non-home pages (Nav is fixed) ──────────
const PageWrapper = ({ children }) => {
  const { pathname } = useLocation();
  // Login/Register/home render full-screen, so no top-padding needed
  const nopad = ['/', '/login', '/register'].includes(pathname);
  return (
    <div className={nopad ? '' : 'pt-16 md:pt-20'}>
      {children}
    </div>
  );
};

// ── Hide Nav on auth pages ────────────────────────────────────────────────────
const Layout = () => {
  const { pathname } = useLocation();
  const hideNav = ['/login', '/register'].includes(pathname);
  return (
    <div className="min-h-screen bg-gray-50">
      {!hideNav && <Nav />}
      <PageWrapper>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ── Public ──────────────────────────────────────── */}
            <Route path="/"                element={<Welcome />} />
            <Route path="/login"           element={<Login />} />
            <Route path="/register"        element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
            <Route path="/products"        element={<ProductList />} />
            <Route path="/products/:id"    element={<ProductDetail />} />
            <Route path="/cart"            element={<Cart />} />
            <Route path="/checkout"        element={<Checkout />} />
            <Route path="/track-order"     element={<TrackOrder />} />
            <Route path="/payment-upload"  element={<PaymentUpload />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment/:orderId"   element={<PaymentSubmit />} />
            <Route path="/farmers/:id"     element={<FarmerProfile />} />

            {/* ── Any logged-in user ──────────────────────────── */}
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['customer','farmer','delivery','admin']}>
                <ProfilePage />
              </ProtectedRoute>
            } />

            {/* ── Role-gated dashboards ────────────────────────── */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/farmer" element={
              <ProtectedRoute allowedRoles={['farmer']}>
                <FarmerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/delivery" element={
              <ProtectedRoute allowedRoles={['delivery']}>
                <DeliveryDashboard />
              </ProtectedRoute>
            } />
            <Route path="/customer" element={
              <ProtectedRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </ProtectedRoute>
            } />

            {/* ── Fallback ─────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageWrapper>
    </div>
  );
};

// ── Root ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <CartProvider>
          <Layout />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
