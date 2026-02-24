import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../../core/config/axios';
import { useAuth } from '../../../shared/contexts/AuthContext';

const fmt   = n => `₹${Number(n||0).toLocaleString('en-IN')}`;

// Delivery statuses in order
const DELIVERY_FLOW = [
  { status: 'picked-up',        label: 'Picked Up',       icon: '📦', color: 'blue'   },
  { status: 'in-transit',       label: 'In Transit',      icon: '🛵', color: 'orange' },
  { status: 'out-for-delivery', label: 'Out for Delivery', icon: '🏃', color: 'purple' },
  { status: 'delivered',        label: 'Delivered',        icon: '✅', color: 'green'  },
];

const STATUS_COLOR = {
  'assigned':        'bg-yellow-100 text-yellow-700',
  'picked-up':       'bg-blue-100 text-blue-700',
  'in-transit':      'bg-orange-100 text-orange-700',
  'out-for-delivery':'bg-purple-100 text-purple-700',
  'delivered':       'bg-green-100 text-green-700',
  'failed':          'bg-red-100 text-red-700',
  'shipped':         'bg-blue-100 text-blue-700',
};

const StatCard = ({ icon, label, value, sub, color='green' }) => {
  const c={green:'from-green-50 border-green-200 text-green-700',blue:'from-blue-50 border-blue-200 text-blue-700',amber:'from-amber-50 border-amber-200 text-amber-700',purple:'from-purple-50 border-purple-200 text-purple-700',red:'from-red-50 border-red-200 text-red-700'}[color];
  return (
    <div className={`bg-gradient-to-br ${c} border rounded-2xl p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">{label}</p>
          <p className="text-2xl font-black">{value}</p>
          {sub&&<p className="text-xs mt-1 opacity-60">{sub}</p>}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
};

// Progress stepper for a delivery
const DeliveryProgress = ({ deliveryStatus, orderStatus }) => {
  const current = deliveryStatus || (orderStatus==='shipped'?'in-transit':orderStatus==='assigned'?'assigned':null);
  const currentIdx = DELIVERY_FLOW.findIndex(f=>f.status===current);

  return (
    <div className="flex items-center gap-1 my-3">
      {DELIVERY_FLOW.map((step,i)=>{
        const done  = i <= currentIdx;
        const active= i === currentIdx;
        return (
          <React.Fragment key={step.status}>
            <div className={`flex flex-col items-center flex-1 ${done?'opacity-100':'opacity-30'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${active?'ring-2 ring-offset-1 ring-green-500 bg-green-600 text-white scale-110':done?'bg-green-100 text-green-700':'bg-gray-100 text-gray-400'}`}>
                {step.icon}
              </div>
              <p className={`text-xs mt-1 font-medium whitespace-nowrap hidden sm:block ${active?'text-green-700':'text-gray-400'}`}>{step.label}</p>
            </div>
            {i<DELIVERY_FLOW.length-1&&<div className={`h-0.5 flex-1 transition-all ${i<currentIdx?'bg-green-400':'bg-gray-200'}`}/>}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ══ TAB 1 — DASHBOARD OVERVIEW ══════════════════════════════════════════════════
const DashboardTab = ({ stats, myDeliveries, onSetTab }) => {
  const today = new Date().toDateString();
  const todayDeliveries = myDeliveries.filter(o=>{
    const date = new Date(o.updatedAt||o.createdAt).toDateString();
    return date===today;
  });
  const active = myDeliveries.filter(o=>!['delivered','failed','cancelled'].includes(o.status));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="📦" label="Total Assigned"  value={stats.totalDeliveries||myDeliveries.length||0}  sub="All time"        color="blue"/>
        <StatCard icon="🔄" label="Active"          value={stats.inProgress||active.length||0}             sub="In progress"     color="amber"/>
        <StatCard icon="✅" label="Completed"       value={stats.completed||0}                             sub="All time"        color="green"/>
        <StatCard icon="💰" label="Est. Earnings"   value={fmt(stats.estimatedEarnings||0)}                sub="10% commission"  color="purple"/>
      </div>

      {active.length>0&&(
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">🔄 Active Deliveries</h3>
            <button onClick={()=>onSetTab('active')} className="text-sm text-green-700 font-semibold hover:underline">View all →</button>
          </div>
          <div className="space-y-3">
            {active.slice(0,3).map(order=>(
              <div key={order._id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <span className="text-xl">🛵</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-700">#{order.orderNumber||order._id.slice(-8)}</p>
                  <p className="text-xs text-gray-400 truncate">{order.deliveryAddress?.street}, {order.deliveryAddress?.city}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[order.delivery?.status||order.status]||'bg-gray-100 text-gray-600'}`}>
                  {order.delivery?.status||order.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">📅 Today's Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Orders today</span>
              <span className="font-bold text-gray-800">{todayDeliveries.length}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Delivered today</span>
              <span className="font-bold text-green-700">{todayDeliveries.filter(o=>o.status==='delivered').length}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Pending today</span>
              <span className="font-bold text-amber-700">{todayDeliveries.filter(o=>o.status!=='delivered').length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">📊 All-Time Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Success rate</span>
              <span className="font-bold text-gray-800">
                {myDeliveries.length>0?Math.round((stats.completed||0)/myDeliveries.length*100):0}%
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Failed</span>
              <span className="font-bold text-red-600">{stats.failed||0}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Avg per day</span>
              <span className="font-bold text-gray-800">—</span>
            </div>
          </div>
        </div>
      </div>

      {active.length===0&&myDeliveries.length===0&&(
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-5xl mb-4">🛵</p>
          <p className="text-gray-600 font-semibold text-lg">Ready to deliver!</p>
          <p className="text-gray-400 text-sm mt-2">Check the Available tab to pick up new orders</p>
          <button onClick={()=>onSetTab('available')} className="mt-4 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition">Browse Available Orders</button>
        </div>
      )}
    </div>
  );
};

// ══ TAB 2 — ACTIVE DELIVERIES ═══════════════════════════════════════════════════
const ActiveTab = ({ myDeliveries, onRefresh }) => {
  const [updating, setUpdating] = useState({});
  const [expanded, setExpanded] = useState({});

  const active = myDeliveries.filter(o=>!['delivered','failed','cancelled'].includes(o.status));

  const updateStatus = async (orderId, status, order) => {
    // For COD orders being marked as delivered, confirm cash was collected
    if (status === 'delivered' && order?.payment?.method === 'cod') {
      const confirmed = window.confirm(
        `💵 COD Cash Collection Confirmation\n\nPlease confirm you have collected ₹${Number(order?.payment?.totalAmount||0).toLocaleString('en-IN')} in cash from the customer before marking as delivered.`
      );
      if (!confirmed) return;
    }
    setUpdating(u=>({...u,[orderId]:status}));
    try {
      await axios.put(`/api/delivery/deliveries/${orderId}/status`,{status});
      onRefresh();
    } catch(e) { alert(e.response?.data?.message||'Update failed'); }
    finally { setUpdating(u=>({...u,[orderId]:null})); }
  };

  const currentFlowIndex = (order) => {
    const ds = order.delivery?.status || (order.status==='shipped'?'in-transit':null);
    return DELIVERY_FLOW.findIndex(f=>f.status===ds);
  };

  const nextStatuses = (order) => {
    const idx = currentFlowIndex(order);
    return DELIVERY_FLOW.slice(Math.max(idx+1,0), idx+2); // one step ahead
  };

  if (active.length===0) return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
      <p className="text-4xl mb-3">✅</p>
      <p className="text-gray-600 font-semibold">No active deliveries</p>
      <p className="text-gray-400 text-sm mt-1">All caught up! Check Available tab for new orders.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">Active Deliveries <span className="text-gray-400 font-normal text-sm">({active.length})</span></h2>
      {active.map(order=>{
        const ds = order.delivery?.status || (order.status==='shipped'?'in-transit':'assigned');
        const isExpanded = expanded[order._id];
        const next = nextStatuses(order);
        const isDone = order.status==='delivered';
        const customer = order.user || order.guest;
        const addr = order.deliveryAddress;

        return (
          <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-5 pb-0">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-gray-700">#{order.orderNumber||order._id.slice(-8)}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[ds]||'bg-gray-100 text-gray-600'}`}>{ds}</span>
                  </div>
                  <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p>
                </div>
                <p className="font-bold text-green-700">{fmt(order.payment?.totalAmount)}</p>
              </div>

              {/* Progress stepper */}
              <DeliveryProgress deliveryStatus={ds} orderStatus={order.status}/>
            </div>

            {/* Customer + address */}
            <div className="px-5 pb-4">
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-gray-700">👤 {customer?.name||'Guest'}</span>
                  {customer?.phone&&(
                    <a href={`tel:${customer.phone}`} className="ml-auto flex items-center gap-1 text-xs text-green-700 font-semibold bg-green-50 border border-green-200 px-2.5 py-1 rounded-lg hover:bg-green-100 transition">
                      📞 Call
                    </a>
                  )}
                </div>
                {addr&&<p className="text-xs text-gray-500">📍 {addr.street}, {addr.city}, {addr.state} {addr.pincode}</p>}
                {addr&&(
                  <a href={`https://maps.google.com/?q=${encodeURIComponent([addr.street,addr.city,addr.state].join(' '))}`}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 font-semibold bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition">
                    🗺 Open in Maps
                  </a>
                )}
              </div>

              {/* Items (collapsible) */}
              <button onClick={()=>setExpanded(e=>({...e,[order._id]:!e[order._id]}))} className="text-xs text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
                {isExpanded?'▲':'▼'} {order.items?.length||0} item{order.items?.length!==1?'s':''}
              </button>
              {isExpanded&&(
                <div className="space-y-2 mb-3">
                  {order.items?.map((item,i)=>(
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <img src={item.product?.images?.[0]||'https://placehold.co/32?text=?'} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0"/>
                      <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-700 truncate">{item.product?.name||'Product'}</p><p className="text-xs text-gray-400">{item.quantity} × {fmt(item.price)}</p></div>
                    </div>
                  ))}
                </div>
              )}

              {/* COD cash reminder */}
              {order.payment?.method === 'cod' && !isDone && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-3">
                  <span className="text-amber-500 text-lg">💵</span>
                  <div>
                    <p className="text-xs font-bold text-amber-700">Cash on Delivery</p>
                    <p className="text-xs text-amber-600">Collect <strong>₹{Number(order.payment?.totalAmount||0).toLocaleString('en-IN')}</strong> in cash before marking delivered</p>
                  </div>
                </div>
              )}
              {/* Action buttons */}
              {!isDone&&next.length>0&&(
                <div className="flex gap-2 flex-wrap">
                  {next.map(step=>(
                    <button key={step.status} onClick={()=>updateStatus(order._id,step.status,order)} disabled={!!updating[order._id]}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition min-w-[120px]">
                      {updating[order._id]===step.status?'Updating…':`${step.icon} ${step.label}`}
                    </button>
                  ))}
                  {/* Delivered button always visible */}
                  {ds!=='delivered'&&(
                    <button onClick={()=>updateStatus(order._id,'delivered',order)} disabled={!!updating[order._id]}
                      className={`flex-1 py-2.5 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition min-w-[120px] ${order.payment?.method==='cod'?'bg-amber-600 hover:bg-amber-700':'bg-emerald-600 hover:bg-emerald-700'}`}>
                      {updating[order._id]==='delivered'?'Marking…':order.payment?.method==='cod'?'💵 Collected & Delivered':'✅ Mark Delivered'}
                    </button>
                  )}
                </div>
              )}
              {isDone&&<div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2"><span className="text-green-600">✅</span><span className="text-sm font-semibold text-green-700">Delivered!</span></div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ══ TAB 3 — AVAILABLE ORDERS ════════════════════════════════════════════════════
const AvailableTab = ({ onRefresh }) => {
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [accepting,setAccepting]= useState({});

  const load = useCallback(()=>{
    setLoading(true);
    axios.get('/api/delivery/available')
      .then(r=>setOrders(r.data.orders||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[]);

  useEffect(()=>load(),[load]);

  const accept = async (orderId) => {
    setAccepting(a=>({...a,[orderId]:true}));
    try {
      await axios.post(`/api/delivery/deliveries/${orderId}/accept`,{});
      load(); onRefresh();
    } catch(e) { alert(e.response?.data?.message||'Could not accept — it may have been taken'); load(); }
    finally { setAccepting(a=>({...a,[orderId]:false})); }
  };

  if (loading) return <div className="text-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600 mx-auto"/></div>;

  if (orders.length===0) return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
      <p className="text-4xl mb-3">🎉</p>
      <p className="text-gray-600 font-semibold">No orders available right now</p>
      <p className="text-gray-400 text-sm mt-1">Check back soon — new orders appear here as farmers prepare them</p>
      <button onClick={load} className="mt-4 px-5 py-2 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">↻ Refresh</button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-800">Available Orders <span className="text-gray-400 font-normal text-sm">({orders.length})</span></h2>
        <button onClick={load} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">↻ Refresh</button>
      </div>
      <div className="space-y-4">
        {orders.map(order=>{
          const addr = order.deliveryAddress;
          const customer = order.user || order.guest;
          return (
            <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-gray-700">#{order.orderNumber||order._id.slice(-8)}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[order.status]||'bg-gray-100 text-gray-600'}`}>{order.status}</span>
                  </div>
                  <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
                </div>
                <p className="font-bold text-green-700 text-lg">{fmt(order.payment?.totalAmount)}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
                <p className="text-sm font-semibold text-gray-700">👤 {customer?.name||'Guest'}</p>
                {addr&&<p className="text-xs text-gray-500">📍 {addr.street}, {addr.city}, {addr.state}{addr.pincode?` - ${addr.pincode}`:''}</p>}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {order.items?.slice(0,4).map((item,i)=>(
                  <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-full">
                    {item.product?.name||'Item'} × {item.quantity}
                  </span>
                ))}
                {order.items?.length>4&&<span className="text-xs text-gray-400">+{order.items.length-4} more</span>}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {order.payment?.method?.toUpperCase()||'COD'} · {order.items?.length||0} items
                </div>
                <button onClick={()=>accept(order._id)} disabled={accepting[order._id]}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition flex items-center gap-1.5">
                  {accepting[order._id]?'Accepting…':'🛵 Accept Delivery'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ══ TAB 4 — HISTORY ══════════════════════════════════════════════════════════════
const HistoryTab = ({ myDeliveries }) => {
  const done = myDeliveries.filter(o=>['delivered','failed','cancelled'].includes(o.status));
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = done.filter(o=>{
    const mS = !filterStatus||o.status===filterStatus;
    const mQ = !search||(o.orderNumber||'').toString().includes(search)||(o.user?.name||o.guest?.name||'').toLowerCase().includes(search.toLowerCase());
    return mS&&mQ;
  });

  if (done.length===0) return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
      <p className="text-4xl mb-3">📜</p>
      <p className="text-gray-600 font-semibold">No delivery history yet</p>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order or customer…" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 flex-1 min-w-[160px]"/>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
          <option value="">All</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-xs text-gray-400">{filtered.length}/{done.length}</span>
      </div>
      <div className="space-y-3">
        {filtered.map(order=>{
          const customer = order.user||order.guest;
          const addr = order.deliveryAddress;
          const ds = order.status;
          return (
            <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${ds==='delivered'?'bg-green-50':'bg-red-50'}`}>
                {ds==='delivered'?'✅':'❌'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono font-bold text-gray-700 text-sm">#{order.orderNumber||order._id.slice(-8)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[ds]||'bg-gray-100 text-gray-600'}`}>{ds}</span>
                </div>
                <p className="text-xs text-gray-500 mb-0.5">👤 {customer?.name||'Guest'}</p>
                {addr&&<p className="text-xs text-gray-400">📍 {addr.city}, {addr.state}</p>}
                <p className="text-xs text-gray-400 mt-1">{new Date(order.updatedAt||order.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-green-700 text-sm">{fmt(order.payment?.totalAmount)}</p>
                {ds==='delivered'&&<p className="text-xs text-purple-600 mt-0.5">+{fmt((order.payment?.totalAmount||0)*0.1)} earned</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ══ TAB 5 — EARNINGS ════════════════════════════════════════════════════════════
const EarningsTab = ({ myDeliveries, stats }) => {
  const delivered = myDeliveries.filter(o=>o.status==='delivered');
  const commission = 0.1;

  // Group by week (last 6 weeks)
  const weeks = [];
  for(let i=5;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i*7);
    const weekLabel=`Week ${6-i}`;
    const weekStart=new Date(d); weekStart.setDate(d.getDate()-d.getDay());
    const weekEnd=new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);
    const weekOrders=delivered.filter(o=>{
      const od=new Date(o.updatedAt||o.createdAt);
      return od>=weekStart&&od<=weekEnd;
    });
    weeks.push({label:weekLabel,orders:weekOrders.length,earned:weekOrders.reduce((s,o)=>s+(o.payment?.totalAmount||0)*commission,0)});
  }

  const totalEarned = delivered.reduce((s,o)=>s+(o.payment?.totalAmount||0)*commission,0);
  const thisWeek = weeks[5]?.earned||0;
  const lastWeek = weeks[4]?.earned||0;
  const maxEarned = Math.max(...weeks.map(w=>w.earned),1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon="💰" label="Total Earned"   value={fmt(totalEarned)}    sub="10% of deliveries"  color="green"/>
        <StatCard icon="📅" label="This Week"      value={fmt(thisWeek)}       sub={lastWeek>0?`${thisWeek>=lastWeek?'↑':'↓'} vs last week`:null} color="blue"/>
      </div>

      {/* Weekly bar chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">📊 Weekly Earnings</h3>
        <div className="flex items-end gap-2 h-28">
          {weeks.map((w,i)=>{
            const pct = w.earned/maxEarned;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <p className="text-xs text-gray-500 font-semibold whitespace-nowrap">{w.earned>0?fmt(w.earned):''}</p>
                <div className="w-full bg-gray-100 rounded-t-lg flex-1 flex items-end">
                  <div className="w-full bg-green-500 rounded-t-lg transition-all hover:bg-green-600" style={{height:`${Math.max(pct*100,3)}%`}}/>
                </div>
                <p className="text-xs text-gray-400">{w.label}</p>
                <p className="text-xs text-gray-300">{w.orders} orders</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">💳 Earnings Breakdown</h3>
        <div className="space-y-2">
          {delivered.slice(0,10).map(order=>(
            <div key={order._id} className="flex items-center justify-between py-2.5 border-b border-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-700">#{order.orderNumber||order._id.slice(-8)}</p>
                <p className="text-xs text-gray-400">{new Date(order.updatedAt||order.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{fmt(order.payment?.totalAmount)} × 10%</p>
                <p className="font-bold text-green-700">+{fmt((order.payment?.totalAmount||0)*commission)}</p>
              </div>
            </div>
          ))}
          {delivered.length===0&&<p className="text-gray-400 text-sm text-center py-6">No completed deliveries yet</p>}
        </div>
        {delivered.length>10&&<p className="text-xs text-gray-400 text-center mt-3">Showing last 10 of {delivered.length} deliveries</p>}
      </div>
    </div>
  );
};

// ══ ROOT DELIVERY DASHBOARD ══════════════════════════════════════════════════════
const TABS = [
  { id:'dashboard', label:'🏠 Dashboard' },
  { id:'active',    label:'🛵 Active'    },
  { id:'available', label:'📋 Available' },
  { id:'history',   label:'📜 History'   },
  { id:'earnings',  label:'💰 Earnings'  },
];

const DeliveryDashboard = () => {
  const { user }  = useAuth();
  const [tab,             setTab]         = useState('dashboard');
  const [myDeliveries,    setMyDeliveries]= useState([]);
  const [stats,           setStats]       = useState({});
  const [loading,         setLoading]     = useState(true);
  const [pendingApproval, setPendingApproval] = useState(false);

  const load = useCallback(async () => {
    try {
      const [deliveriesRes, statsRes] = await Promise.all([
        axios.get('/api/delivery/deliveries'),
        axios.get('/api/delivery/dashboard/stats').catch(()=>({data:{stats:{}}})),
      ]);
      setMyDeliveries(deliveriesRes.data.orders||[]);
      setStats(statsRes.data.stats||{});
    } catch(e) {
      if (e.response?.status === 403 && e.response?.data?.code === 'ACCOUNT_PENDING_APPROVAL') {
        setPendingApproval(true);
      } else {
        console.error(e);
      }
    }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mb-4"/><p className="text-gray-500">Loading dashboard…</p></div>
    </div>
  );

  // Account not yet approved by admin
  if (pendingApproval) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-10">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h1>
          <p className="text-gray-500 mb-6">
            Hi <strong>{user?.name}</strong>, your delivery agent account has been registered!
            Our admin team will review and approve your account shortly.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left space-y-1 mb-6">
            <p>✅ Registration complete</p>
            <p>⏳ Admin review in progress (usually within 24 hrs)</p>
            <p>📧 You'll receive an email once approved</p>
          </div>
          <p className="text-xs text-gray-400">You can close this page and come back after approval.</p>
        </div>
      </div>
    </div>
  );

  const activeCount    = myDeliveries.filter(o=>!['delivered','failed','cancelled'].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900">Delivery Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Hey <strong>{user?.name?.split(' ')[0]}</strong> 🛵 &nbsp;
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user?.deliveryProfile?.isVerified||user?.isVerified?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
              {user?.deliveryProfile?.isVerified||user?.isVerified?'✓ Verified':'Pending Verification'}
            </span>
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm mb-6 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all min-w-[90px] ${tab===t.id?'bg-green-600 text-white shadow-sm':'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
              {t.label}
              {t.id==='active'&&activeCount>0&&<span className="ml-1.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full inline-flex items-center justify-center">{activeCount}</span>}
            </button>
          ))}
        </div>

        {tab==='dashboard' && <DashboardTab  stats={stats} myDeliveries={myDeliveries} onSetTab={setTab}/>}
        {tab==='active'    && <ActiveTab     myDeliveries={myDeliveries} onRefresh={load}/>}
        {tab==='available' && <AvailableTab  onRefresh={load}/>}
        {tab==='history'   && <HistoryTab    myDeliveries={myDeliveries}/>}
        {tab==='earnings'  && <EarningsTab   myDeliveries={myDeliveries} stats={stats}/>}
      </div>
    </div>
  );
};

export default DeliveryDashboard;
