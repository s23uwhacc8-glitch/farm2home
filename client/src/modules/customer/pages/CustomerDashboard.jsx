import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../../core/config/axios';
import { useAuth } from '../../../shared/contexts/AuthContext';

const STATUS_STYLE = {
  pending:            'bg-yellow-100 text-yellow-800',
  'payment-pending':  'bg-blue-100   text-blue-800',
  'payment-approved': 'bg-teal-100   text-teal-800',
  confirmed:          'bg-teal-100   text-teal-800',
  processing:         'bg-purple-100 text-purple-800',
  'ready-to-ship':    'bg-indigo-100 text-indigo-800',
  assigned:           'bg-orange-100 text-orange-800',
  shipped:            'bg-orange-100 text-orange-800',
  delivered:          'bg-green-100  text-green-800',
  cancelled:          'bg-red-100    text-red-800',
  refunded:           'bg-gray-100   text-gray-600',
};

const StatCard = ({ label, value, sub, color = 'green' }) => {
  const colors = { green: 'text-green-600', yellow: 'text-yellow-500', blue: 'text-blue-500' };
  return (
    <div className="card p-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
};

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState('');
  const [cancelling, setCancelling] = useState({});

  const loadOrders = () => {
    axios.get('/api/customer/orders')
      .then(r => setOrders(r.data.orders || r.data || []))
      .catch(() => setFetchErr('Failed to load orders. Please refresh.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(); }, []);

  const handleCancel = async (orderId) => {
    const reason = window.prompt('Please enter a reason for cancellation (optional):') ?? '';
    if (reason === null) return; // user hit Escape/Cancel
    setCancelling(c => ({ ...c, [orderId]: true }));
    try {
      await axios.post(`/api/customer/orders/${orderId}/cancel`, { reason });
      loadOrders(); // refresh
    } catch (err) {
      alert(err.response?.data?.message || 'Could not cancel order. Please try again.');
    } finally {
      setCancelling(c => ({ ...c, [orderId]: false }));
    }
  };

  const totalSpent = orders
    .filter(o => o.status === 'delivered')
    .reduce((s, o) => s + (o.payment?.totalAmount || 0), 0);

  const activeCount = orders.filter(o =>
    ['pending','payment-pending','confirmed','processing','shipped','assigned'].includes(o.status)
  ).length;

  const paymentCTA = order => {
    if (order.status === 'pending' && order.payment?.method === 'online' && order.payment?.approvalStatus === 'pending')
      return <Link to={`/payment/${order._id}`} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Submit Payment →</Link>;
    if (order.status === 'pending' && order.payment?.method === 'cod' && order.payment?.approvalStatus === 'pending')
      return <Link to={`/payment/${order._id}`} className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium">Confirm Order →</Link>;
    return null;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
            {user && <p className="text-sm text-gray-400 mt-0.5">Welcome back, {user.name?.split(' ')[0]} 👋</p>}
          </div>
          <Link to="/products" className="btn-primary text-sm py-2.5 px-5">
            + Shop More
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard label="Total Orders" value={orders.length} sub="All time" />
          <StatCard label="Active Orders" value={activeCount} sub="In progress" color="yellow" />
          <StatCard label="Total Spent" value={`₹${totalSpent.toLocaleString('en-IN')}`} sub="On delivered orders" />
        </div>

        {fetchErr && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{fetchErr}</div>
        )}

        {/* Orders */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">My Orders</h2>
            <span className="text-sm text-gray-400">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📦</div>
              <p className="text-gray-500 mb-6">No orders yet — time to shop!</p>
              <Link to="/products" className="btn-primary">Browse Products →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order._id} className="border border-gray-100 rounded-xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">#{order.orderNumber}</h3>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {order.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.payment?.approvalStatus === 'approved' ? 'bg-green-50 text-green-700' :
                        order.payment?.approvalStatus === 'rejected' ? 'bg-red-50 text-red-700' :
                        order.payment?.approvalStatus === 'verified' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-50 text-gray-500'}`}>
                        💳 {order.payment?.method?.toUpperCase()} · {order.payment?.approvalStatus}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {order.items?.slice(0, 4).map((item, i) => (
                      <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-full">
                        {item.product?.name} × {item.quantity}
                      </span>
                    ))}
                    {order.items?.length > 4 && (
                      <span className="text-xs text-gray-400 self-center">+{order.items.length - 4} more</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="font-bold text-green-700">₹{order.payment?.totalAmount?.toLocaleString('en-IN') || '—'}</p>
                    <div className="flex items-center gap-2">
                      {paymentCTA(order)}
                      {/* Cancel button — only for early-stage orders */}
                      {['pending', 'payment-pending', 'confirmed'].includes(order.status) && (
                        <button
                          onClick={() => handleCancel(order._id)}
                          disabled={!!cancelling[order._id]}
                          className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition disabled:opacity-50 font-medium"
                        >
                          {cancelling[order._id] ? 'Cancelling…' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>

                  {order.status === 'cancelled' && order.payment?.rejectionReason && (
                    <div className="mt-3 bg-red-50 rounded-lg p-3 text-xs text-red-700">
                      <span className="font-semibold">Reason: </span>{order.payment.rejectionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
