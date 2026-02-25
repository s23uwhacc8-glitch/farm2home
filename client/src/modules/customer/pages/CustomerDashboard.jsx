import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../../../core/config/axios';
import { useAuth } from '../../../shared/contexts/AuthContext';

const DELIVERY_STEPS = [
  { key: 'order-placed',     label: 'Placed',         icon: '📋' },
  { key: 'confirmed',        label: 'Confirmed',      icon: '✅' },
  { key: 'preparing',        label: 'Preparing',      icon: '👨‍🌾' },
  { key: 'ready-to-ship',    label: 'Ready',          icon: '📦' },
  { key: 'picked-up',        label: 'Picked Up',      icon: '🤝' },
  { key: 'in-transit',       label: 'In Transit',     icon: '🛵' },
  { key: 'out-for-delivery', label: 'On the Way',     icon: '🏃' },
  { key: 'delivered',        label: 'Delivered',      icon: '🏠' },
];

function getStepIndex(order) {
  const ds = order.delivery?.status;
  const os = order.status;
  if (os === 'delivered') return 7;
  if (ds === 'out-for-delivery' || os === 'shipped') return 6;
  if (ds === 'in-transit') return 5;
  if (ds === 'picked-up') return 4;
  if (os === 'ready-to-ship' || os === 'assigned') return 3;
  if (os === 'preparing' || os === 'payment-approved' || os === 'confirmed') return 2;
  if (['payment-pending', 'pending'].includes(os)) return 1;
  return 0;
}

const STATUS_STYLE = {
  pending:            'bg-yellow-100 text-yellow-800',
  'payment-pending':  'bg-blue-100 text-blue-800',
  'payment-approved': 'bg-teal-100 text-teal-800',
  confirmed:          'bg-teal-100 text-teal-800',
  preparing:          'bg-purple-100 text-purple-800',
  'ready-to-ship':    'bg-indigo-100 text-indigo-800',
  assigned:           'bg-orange-100 text-orange-800',
  shipped:            'bg-orange-100 text-orange-800',
  delivered:          'bg-green-100 text-green-800',
  cancelled:          'bg-red-100 text-red-700',
  refunded:           'bg-gray-100 text-gray-600',
};

const STATUS_LABEL = {
  'payment-pending': 'Awaiting Payment', 'payment-approved': 'Payment Approved',
  'ready-to-ship': 'Ready to Ship', assigned: 'Agent Assigned',
  shipped: 'Out for Delivery', delivered: 'Delivered ✓',
};

const Badge = ({ status }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[status] || 'bg-gray-100 text-gray-600'}`}>
    {STATUS_LABEL[status] || status}
  </span>
);

const isActiveOrder = s => ['pending','payment-pending','payment-approved','confirmed','preparing','ready-to-ship','assigned','shipped'].includes(s);

const DeliveryTracker = ({ order }) => {
  const stepIdx = getStepIndex(order);
  if (!isActiveOrder(order.status) && order.status !== 'delivered') return null;
  const start = Math.max(0, stepIdx - 2);
  const end   = Math.min(DELIVERY_STEPS.length - 1, stepIdx + 1);
  const visible = DELIVERY_STEPS.slice(start, end + 1);
  const rel = stepIdx - start;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">Delivery Progress</p>
      <div className="flex items-center">
        {visible.map((step, i) => {
          const done = i < rel, cur = i === rel;
          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${
                  cur  ? 'bg-green-500 text-white ring-4 ring-green-100 scale-110 shadow-lg' :
                  done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'
                }`}>
                  {done ? '✓' : step.icon}
                </div>
                <span className={`text-[10px] mt-1.5 text-center leading-tight w-16 ${
                  cur ? 'text-green-700 font-bold' : done ? 'text-green-500' : 'text-gray-300'
                }`}>{step.label}</span>
              </div>
              {i < visible.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mb-5 ${i < rel ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {order.delivery?.status && (
        <p className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
          Currently: {order.delivery.status.replace(/-/g,' ')}
        </p>
      )}
    </div>
  );
};

const FILTERS = [
  { id:'all', label:'All' },
  { id:'active', label:'Active' },
  { id:'delivered', label:'Delivered' },
  { id:'cancelled', label:'Cancelled' },
];

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchErr,  setFetchErr]  = useState('');
  const [cancelling,setCancelling]= useState({});
  const [filter,    setFilter]    = useState('all');
  const [expanded,  setExpanded]  = useState({});
  const [toast,     setToast]     = useState('');

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(''),3000); };

  const loadOrders = useCallback(() => {
    setLoading(true);
    axios.get('/api/customer/orders')
      .then(r => { setOrders(r.data.orders || r.data || []); setFetchErr(''); })
      .catch(() => setFetchErr('Failed to load orders. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const handleCancel = async orderId => {
    const reason = window.prompt('Reason for cancellation (optional):') ?? '';
    if (reason === null) return;
    setCancelling(c=>({...c,[orderId]:true}));
    try {
      await axios.post(`/api/customer/orders/${orderId}/cancel`, { reason });
      showToast('Order cancelled'); loadOrders();
    } catch(err) { showToast(err.response?.data?.message || 'Could not cancel.'); }
    finally { setCancelling(c=>({...c,[orderId]:false})); }
  };

  const totalSpent    = orders.filter(o=>o.status==='delivered').reduce((s,o)=>s+(o.payment?.totalAmount||0),0);
  const activeCount   = orders.filter(o=>isActiveOrder(o.status)).length;
  const deliveredCount= orders.filter(o=>o.status==='delivered').length;

  const filtered = orders.filter(o => {
    if (filter==='active')    return isActiveOrder(o.status);
    if (filter==='delivered') return o.status==='delivered';
    if (filter==='cancelled') return o.status==='cancelled';
    return true;
  });

  const paymentCTA = order => {
    if (order.status==='pending' && order.payment?.method==='online' && order.payment?.approvalStatus==='pending')
      return <Link to={`/payment/${order._id}`} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Submit Payment →</Link>;
    if (order.status==='pending' && order.payment?.method==='cod' && order.payment?.approvalStatus==='pending')
      return <Link to={`/payment/${order._id}`} className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-semibold">Confirm Order →</Link>;
    return null;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-sm text-gray-400">Loading your orders…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-2.5 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Welcome back, <span className="text-green-600 font-semibold">{user?.name?.split(' ')[0]}</span> 👋
            </p>
          </div>
          <Link to="/products" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all" style={{background:'linear-gradient(135deg,#22c55e,#15803d)'}}>
            + Shop More
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Total Orders', value:orders.length,  icon:'📦', color:'text-gray-800' },
            { label:'In Progress',  value:activeCount,    icon:'🛵', color:'text-amber-500' },
            { label:'Total Spent',  value:`₹${totalSpent.toLocaleString('en-IN')}`, icon:'💳', color:'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm hover:shadow-md transition">
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {fetchErr && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            ⚠️ {fetchErr}
            <button onClick={loadOrders} className="ml-auto underline">Retry</button>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(t => (
            <button key={t.id} onClick={()=>setFilter(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                filter===t.id ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-gray-500 hover:text-gray-800 border border-gray-200'
              }`}>
              {t.label}
              {t.id==='active' && activeCount>0 && (
                <span className={`ml-1.5 px-1.5 rounded-full text-[10px] font-bold ${filter===t.id?'bg-white/20 text-white':'bg-amber-100 text-amber-700'}`}>
                  {activeCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <div className="text-5xl mb-4">{filter==='active'?'🎉':filter==='delivered'?'📭':'📦'}</div>
            <p className="text-gray-500 font-medium">
              {filter==='active' ? 'No active orders right now' :
               filter==='delivered' ? 'No delivered orders yet' :
               filter==='cancelled' ? 'No cancelled orders' : "No orders yet"}
            </p>
            {filter==='all' && (
              <Link to="/products" className="mt-4 inline-block px-6 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition">
                Start Shopping →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const open = !!expanded[order._id];
              const active = isActiveOrder(order.status);
              return (
                <div key={order._id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all ${active ? 'border-green-200' : 'border-gray-100'}`}>
                  <div className="p-5">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm font-mono text-gray-900">#{order.orderNumber}</span>
                          <Badge status={order.status} />
                          {active && (
                            <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>Live
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-green-700">₹{order.payment?.totalAmount?.toLocaleString('en-IN')||'—'}</p>
                        <p className="text-[11px] text-gray-400">{order.payment?.method==='cod'?'Cash on Delivery':'Online'}</p>
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {order.items?.slice(0,3).map((item,i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1">
                          {item.product?.images?.[0] && (
                            <img src={item.product.images[0]} alt="" className="w-4 h-4 rounded object-cover"/>
                          )}
                          <span className="text-xs text-gray-600">{item.product?.name} × {item.quantity}</span>
                        </div>
                      ))}
                      {order.items?.length > 3 && (
                        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
                          +{order.items.length-3} more
                        </span>
                      )}
                    </div>

                    {/* Delivery tracker */}
                    <DeliveryTracker order={order} />

                    {/* Action row */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                      <button onClick={()=>setExpanded(e=>({...e,[order._id]:!e[order._id]}))}
                        className="text-xs text-gray-400 hover:text-gray-600 font-medium transition flex items-center gap-1">
                        {open ? '▲ Hide details' : '▼ Show details'}
                      </button>
                      <div className="flex items-center gap-2">
                        {paymentCTA(order)}
                        {['pending','payment-pending','confirmed'].includes(order.status) && (
                          <button onClick={()=>handleCancel(order._id)} disabled={!!cancelling[order._id]}
                            className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-50 transition font-medium">
                            {cancelling[order._id]?'Cancelling…':'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {open && (
                    <div className="border-t border-gray-100 bg-gray-50/70 rounded-b-2xl p-5 space-y-4">
                      {/* All items */}
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">All Items</p>
                        <div className="space-y-2">
                          {order.items?.map((item,i) => (
                            <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-gray-100">
                              {item.product?.images?.[0]
                                ? <img src={item.product.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"/>
                                : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300 flex-shrink-0 text-lg">🥕</div>
                              }
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{item.product?.name}</p>
                                <p className="text-xs text-gray-400">{item.quantity} {item.unit} × ₹{item.price}</p>
                              </div>
                              <p className="text-sm font-bold text-gray-700">₹{item.price*item.quantity}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment + Address */}
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-3 border border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase mb-2">Payment Details</p>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Method</span><span className="font-semibold">{order.payment?.method==='cod'?'Cash on Delivery':'Online'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Status</span>
                              <span className={`font-semibold ${order.payment?.approvalStatus==='approved'?'text-green-600':order.payment?.approvalStatus==='rejected'?'text-red-600':'text-amber-600'}`}>
                                {order.payment?.approvalStatus}
                              </span>
                            </div>
                            <div className="flex justify-between font-bold border-t pt-1.5 mt-0.5"><span>Total</span><span className="text-green-700">₹{order.payment?.totalAmount?.toLocaleString('en-IN')}</span></div>
                          </div>
                        </div>

                        <div className="bg-white rounded-xl p-3 border border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase mb-2">📍 Delivery Address</p>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {order.deliveryAddress?.street}<br/>
                            {order.deliveryAddress?.city}, {order.deliveryAddress?.state}<br/>
                            <span className="font-mono font-semibold">{order.deliveryAddress?.pincode}</span>
                          </p>
                        </div>
                      </div>

                      {order.payment?.rejectionReason && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                          <span className="font-bold">Rejection reason: </span>{order.payment.rejectionReason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDashboard;
