import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import axios from '../../../core/config/axios';

const fmt   = n => `₹${Number(n||0).toLocaleString('en-IN')}`;
const token = () => localStorage.getItem('adminToken') || localStorage.getItem('token');
const hdr   = () => ({ headers: { Authorization: `Bearer ${token()}` } });

// Simple toast helper — components call window.__adminToast(msg) to show a brief notification
const AdminToast = () => {
  const [msg, setMsg] = React.useState('');
  React.useEffect(() => {
    window.__adminToast = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3500); };
    return () => { delete window.__adminToast; };
  }, []);
  if (!msg) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium max-w-sm pointer-events-none">
      {msg}
    </div>
  );
};
const toast = (m) => { if (window.__adminToast) window.__adminToast(m); };

// ── Interactive Revenue Chart ─────────────────────────────────────────────────
const RevenueChart = memo(({ data }) => {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);
  if (!data || data.length === 0) return <p className="text-gray-400 text-sm text-center py-8">No revenue data yet</p>;
  const max  = Math.max(...data.map(d => d.revenue || 0), 1);
  const W=520, H=110, pad=42;
  const barW = Math.floor((W - pad * 2) / Math.max(data.length,1)) - 4;

  const handleMouse = (e, d) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    setTooltip({ label: d.label||d.month, revenue: d.revenue||0, orders: d.orders||0, x: e.clientX-r.left, y: e.clientY-r.top });
  };

  return (
    <div className="relative select-none">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H+26}`} className="w-full" onMouseLeave={()=>setTooltip(null)}>
        {[0.25,0.5,0.75,1].map(f=>(
          <g key={f}>
            <line x1={pad} x2={W-pad} y1={H-H*f} y2={H-H*f} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 3"/>
            <text x={pad-4} y={H-H*f+3} textAnchor="end" fontSize="8" fill="#9ca3af">{fmt(max*f)}</text>
          </g>
        ))}
        <line x1={pad} x2={W-pad} y1={H} y2={H} stroke="#d1d5db" strokeWidth="1"/>
        {data.map((d,i)=>{
          const bh=Math.max(((d.revenue||0)/max)*H,2);
          const x=pad+i*(barW+4);
          const isH=tooltip?.label===(d.label||d.month);
          return (
            <g key={i} onMouseMove={e=>handleMouse(e,d)} onMouseEnter={e=>handleMouse(e,d)} style={{cursor:'pointer'}}>
              <rect x={x-2} y={0} width={barW+4} height={H+26} fill="transparent"/>
              <rect x={x+1} y={H-bh+2} width={barW} height={bh} rx="3" fill="#16a34a" opacity="0.1"/>
              <rect x={x} y={H-bh} width={barW} height={bh} rx="3" fill={isH?'#15803d':'#16a34a'} opacity={isH?1:0.82} style={{transition:'fill 0.1s'}}/>
              <text x={x+barW/2} y={H+16} textAnchor="middle" fontSize="9" fill="#6b7280">{d.label||d.month}</text>
              {(d.revenue||0)>0&&!tooltip&&<text x={x+barW/2} y={H-bh-5} textAnchor="middle" fontSize="8" fill="#374151">{fmt(d.revenue)}</text>}
            </g>
          );
        })}
      </svg>
      {tooltip&&(
        <div className="absolute z-20 pointer-events-none bg-gray-900 text-white rounded-xl px-3 py-2.5 text-xs shadow-2xl"
          style={{left:Math.min(tooltip.x+12,380),top:Math.max(tooltip.y-70,2),minWidth:120}}>
          <p className="font-bold text-green-300 mb-1">{tooltip.label}</p>
          <p className="font-semibold text-white text-sm">{fmt(tooltip.revenue)}</p>
          {tooltip.orders>0&&<p className="text-gray-400 mt-0.5">{tooltip.orders} orders</p>}
        </div>
      )}
    </div>
  );
});

// ── Shared Components ─────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color='green', onClick }) => {
  const c={green:'from-green-50 border-green-200 text-green-700',blue:'from-blue-50 border-blue-200 text-blue-700',amber:'from-amber-50 border-amber-200 text-amber-700',red:'from-red-50 border-red-200 text-red-700',purple:'from-purple-50 border-purple-200 text-purple-700'}[color];
  return (
    <div onClick={onClick} className={`bg-gradient-to-br ${c} border rounded-2xl p-5 hover:shadow-md transition-all ${onClick?'cursor-pointer hover:scale-[1.02]':''}`}>
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

const Badge = ({ status, label }) => {
  const map = {
    'pending':'bg-yellow-100 text-yellow-700','approved':'bg-green-100 text-green-700','rejected':'bg-red-100 text-red-700',
    'delivered':'bg-green-100 text-green-700','cancelled':'bg-red-100 text-red-700','shipped':'bg-blue-100 text-blue-700',
    'farmer':'bg-green-100 text-green-800','delivery':'bg-blue-100 text-blue-800','customer':'bg-gray-100 text-gray-700',
    'confirmed':'bg-blue-100 text-blue-700','preparing':'bg-orange-100 text-orange-700','ready-to-ship':'bg-purple-100 text-purple-700',
    'payment-approved':'bg-emerald-100 text-emerald-700',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status]||'bg-gray-100 text-gray-600'}`}>{label||status}</span>;
};

const ConfirmModal = ({ title, message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
      <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onConfirm} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm transition">Confirm</button>
        <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  </div>
);

const RejectModal = ({ title, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
        <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3} placeholder="Enter rejection reason…" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"/>
        <div className="flex gap-3">
          <button onClick={()=>reason.trim()&&onConfirm(reason)} disabled={!reason.trim()} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition">Reject</button>
          <button onClick={onCancel} className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ══ TAB 1 — OVERVIEW ═══════════════════════════════════════════════════════════
const OverviewTab = ({ stats, monthly, pendingPayments, pendingApprovals, setTab }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon="👥" label="Total Users"       value={stats.totalUsers||0}    sub="All roles"             color="blue"   onClick={()=>setTab('users')}/>
      <StatCard icon="📦" label="Total Orders"      value={stats.totalOrders||0}   sub="All time"              color="green"  onClick={()=>setTab('orders')}/>
      <StatCard icon="💳" label="Pending Payments"  value={pendingPayments.length} sub="Needs review"          color="amber"  onClick={()=>setTab('payments')}/>
      <StatCard icon="⏳" label="Pending Approvals" value={pendingApprovals.length} sub="Farmers & delivery"  color="red"    onClick={()=>setTab('approvals')}/>
    </div>

    <div className="grid lg:grid-cols-3 gap-4">
      <StatCard icon="💰" label="Platform Revenue"  value={fmt(stats.totalRevenue||0)}  sub="From delivered orders" color="green"  onClick={()=>setTab('payments')}/>
      <StatCard icon="🌾" label="Active Farmers"    value={stats.activeFarmers||0}       sub="Approved & listing"   color="purple" onClick={()=>setTab('users')}/>
      <StatCard icon="🛵" label="Delivery Agents"   value={stats.deliveryAgents||0}      sub="Active agents"        color="blue"   onClick={()=>setTab('delivery')}/>
    </div>

    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-gray-800 mb-1">Platform Revenue — Last 6 Months</h3>
      <p className="text-xs text-gray-400 mb-4">Hover bars for details</p>
      <RevenueChart data={monthly||[]}/>
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      {pendingPayments.length>0&&(
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition" onClick={()=>setTab('payments')}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">💳</span>
            <div>
              <p className="font-bold text-amber-800">{pendingPayments.length} Payment{pendingPayments.length!==1?'s':''} Pending</p>
              <p className="text-sm text-amber-600 mt-0.5">Click to review and approve</p>
            </div>
            <span className="ml-auto text-amber-600">→</span>
          </div>
        </div>
      )}
      {pendingApprovals.length>0&&(
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 cursor-pointer hover:shadow-md transition" onClick={()=>setTab('approvals')}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">⏳</span>
            <div>
              <p className="font-bold text-red-800">{pendingApprovals.length} User{pendingApprovals.length!==1?'s':''} Awaiting Approval</p>
              <p className="text-sm text-red-600 mt-0.5">Click to review applications</p>
            </div>
            <span className="ml-auto text-red-600">→</span>
          </div>
        </div>
      )}
      {pendingPayments.length===0&&pendingApprovals.length===0&&(
        <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
          <p className="text-2xl mb-1">✅</p>
          <p className="font-bold text-green-800">All caught up!</p>
          <p className="text-sm text-green-600">No pending payments or approvals</p>
        </div>
      )}
    </div>
  </div>
);

// ══ TAB 2 — PAYMENTS ════════════════════════════════════════════════════════════
const PaymentsTab = ({ pendingPayments, onRefresh }) => {
  const [confirm, setConfirm] = useState(null);
  const [reject,  setReject]  = useState(null);
  const [loading, setLoading] = useState({});

  const approve = async (orderId) => {
    setLoading(l=>({...l,[orderId]:true}));
    try { await axios.post(`/api/admin/payments/${orderId}/approve`,{},hdr()); onRefresh(); setConfirm(null); }
    catch(e) { toast(e.response?.data?.message||'Approve failed'); }
    finally { setLoading(l=>({...l,[orderId]:false})); }
  };

  const doReject = async (orderId, reason) => {
    setLoading(l=>({...l,[orderId]:true}));
    try { await axios.post(`/api/admin/payments/${orderId}/reject`,{reason},hdr()); onRefresh(); setReject(null); }
    catch(e) { toast(e.response?.data?.message||'Reject failed'); }
    finally { setLoading(l=>({...l,[orderId]:false})); }
  };

  if (pendingPayments.length===0) return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
      <p className="text-4xl mb-3">✅</p><p className="text-gray-600 font-semibold">No pending payments</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-gray-800">Payment Approvals</h2>
        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">{pendingPayments.length} pending</span>
      </div>
      {pendingPayments.map(order=>(
        <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm font-bold text-gray-700">#{order.orderNumber}</span>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">Awaiting Review</span>
              </div>
              <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
            </div>
            <p className="font-bold text-green-700 text-xl">{fmt(order.payment?.totalAmount)}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm mb-4">
            <div className="space-y-1">
              <p className="text-gray-500"><strong className="text-gray-700">Customer:</strong> {order.user?.name||order.guest?.name||'Guest'}</p>
              <p className="text-gray-500"><strong className="text-gray-700">Email:</strong> {order.user?.email||order.guest?.email||'—'}</p>
              <p className="text-gray-500"><strong className="text-gray-700">Phone:</strong> {order.user?.phone||order.guest?.phone||'—'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-gray-500"><strong className="text-gray-700">Method:</strong> {(order.payment?.method||'—').toUpperCase()}</p>
              <p className="text-gray-500"><strong className="text-gray-700">Txn ID:</strong> {order.payment?.transactionId||'Not provided'}</p>
            </div>
          </div>
          {order.payment?.paymentProof&&(
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment Proof</p>
              <img src={order.payment.paymentProof} alt="Payment proof" className="h-36 rounded-xl border border-gray-200 cursor-pointer hover:scale-105 transition-transform shadow-sm" onClick={()=>window.open(order.payment.paymentProof,'_blank')}/>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={()=>setConfirm(order._id)} disabled={loading[order._id]} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">✓ Approve</button>
            <button onClick={()=>setReject(order._id)} disabled={loading[order._id]} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">✗ Reject</button>
          </div>
        </div>
      ))}
      {confirm&&<ConfirmModal title="Approve Payment?" message="This will mark the payment as approved and proceed with the order." onConfirm={()=>approve(confirm)} onCancel={()=>setConfirm(null)}/>}
      {reject&&<RejectModal title="Reject Payment" onConfirm={reason=>doReject(reject,reason)} onCancel={()=>setReject(null)}/>}
    </div>
  );
};

// ══ TAB 3 — USER APPROVALS ══════════════════════════════════════════════════════
const ApprovalsTab = ({ pendingApprovals, onRefresh }) => {
  const [confirm, setConfirm] = useState(null);
  const [reject,  setReject]  = useState(null);
  const [loading, setLoading] = useState({});

  const approve = async (userId) => {
    setLoading(l=>({...l,[userId]:true}));
    try { await axios.post(`/api/admin/users/${userId}/approve`,{},hdr()); onRefresh(); setConfirm(null); }
    catch(e) { toast(e.response?.data?.message||'Approve failed'); }
    finally { setLoading(l=>({...l,[userId]:false})); }
  };

  const doReject = async (userId, reason) => {
    setLoading(l=>({...l,[userId]:true}));
    try { await axios.post(`/api/admin/users/${userId}/reject`,{reason},hdr()); onRefresh(); setReject(null); }
    catch(e) { toast(e.response?.data?.message||'Reject failed'); }
    finally { setLoading(l=>({...l,[userId]:false})); }
  };

  if (pendingApprovals.length===0) return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
      <p className="text-4xl mb-3">✅</p><p className="text-gray-600 font-semibold">No pending approvals</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-gray-800">User Approvals</h2>
        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">{pendingApprovals.length} pending</span>
      </div>
      {pendingApprovals.map(user=>(
        <div key={user._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xl flex-shrink-0">
              {user.role==='farmer'?'🌾':user.role==='delivery'?'🛵':'👤'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-800">{user.name}</h3>
                <Badge status={user.role}/>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(user.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
            <p className="text-gray-500"><strong className="text-gray-700">Email:</strong> {user.email}</p>
            <p className="text-gray-500"><strong className="text-gray-700">Phone:</strong> {user.phone||'—'}</p>
            {user.role==='farmer'&&user.farmerProfile&&(
              <>
                <p className="text-gray-500"><strong className="text-gray-700">Farm:</strong> {user.farmerProfile.farmName||'—'}</p>
                <p className="text-gray-500"><strong className="text-gray-700">Experience:</strong> {user.farmerProfile.experience||0} years</p>
                {user.farmerProfile.farmSize&&<p className="text-gray-500"><strong className="text-gray-700">Farm Size:</strong> {user.farmerProfile.farmSize} acres</p>}
              </>
            )}
            {user.role==='delivery'&&user.deliveryProfile&&(
              <>
                <p className="text-gray-500"><strong className="text-gray-700">Vehicle:</strong> {user.deliveryProfile.vehicleType||'—'}</p>
                <p className="text-gray-500"><strong className="text-gray-700">Coverage:</strong> {user.deliveryProfile.serviceArea?.coverageRadius||0} km</p>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={()=>setConfirm(user._id)} disabled={loading[user._id]} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">✓ Approve</button>
            <button onClick={()=>setReject(user._id)} disabled={loading[user._id]} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">✗ Reject</button>
          </div>
        </div>
      ))}
      {confirm&&<ConfirmModal title="Approve User?" message="The user will be notified and gain access to the platform." onConfirm={()=>approve(confirm)} onCancel={()=>setConfirm(null)}/>}
      {reject&&<RejectModal title="Reject User Application" onConfirm={reason=>doReject(reject,reason)} onCancel={()=>setReject(null)}/>}
    </div>
  );
};

// ══ TAB 4 — ALL ORDERS ══════════════════════════════════════════════════════════
const scol=s=>({'pending':'bg-yellow-100 text-yellow-700','confirmed':'bg-blue-100 text-blue-700','preparing':'bg-orange-100 text-orange-700','ready-to-ship':'bg-purple-100 text-purple-700','delivered':'bg-green-100 text-green-700','cancelled':'bg-red-100 text-red-700','shipped':'bg-blue-100 text-blue-700','payment-approved':'bg-emerald-100 text-emerald-700'}[s]||'bg-gray-100 text-gray-600');

const OrdersTab = ({ orders, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = orders.filter(o=>{
    const mS = !filterStatus||o.status===filterStatus;
    const mQ = !search||(o.orderNumber||'').toString().includes(search)||(o.user?.name||'').toLowerCase().includes(search.toLowerCase());
    return mS&&mQ;
  });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order # or customer…" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 flex-1 min-w-[160px]"/>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
          <option value="">All Status</option>
          {['pending','confirmed','preparing','ready-to-ship','shipped','delivered','cancelled','payment-approved'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length}/{orders.length}</span>
      </div>
      {filtered.length===0?(
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100"><p className="text-4xl mb-3">📭</p><p className="text-gray-500">No orders found</p></div>
      ):(
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Order #','Customer','Amount','Status','Items','Date','Detail'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(o=>(
                  <tr key={o._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-gray-700 text-sm">#{o.orderNumber||o._id.slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{o.user?.name||o.guest?.name||'Guest'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{fmt(o.payment?.totalAmount)}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${scol(o.status)}`}>{o.status}</span></td>
                    <td className="px-4 py-3 text-gray-500">{o.items?.length||0} items</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">{new Date(o.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
                    <td className="px-4 py-3">
                      <button onClick={()=>setSelected(selected?._id===o._id?null:o)} className="text-xs text-green-700 hover:underline font-medium">
                        {selected?._id===o._id?'Hide':'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selected&&(
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Order #{selected.orderNumber} — Details</h3>
            <button onClick={()=>setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <div className="space-y-2 mb-4">
            {selected.items?.map((item,i)=>(
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <img src={item.product?.images?.[0]||'https://placehold.co/40?text=?'} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"/>
                <div className="flex-1"><p className="text-sm font-semibold text-gray-700">{item.product?.name||'Product'}</p><p className="text-xs text-gray-400">{item.quantity} × {fmt(item.price)}</p></div>
                <p className="text-sm font-bold text-gray-700">{fmt(item.quantity*item.price)}</p>
              </div>
            ))}
          </div>
          {selected.deliveryAddress&&<p className="text-xs text-gray-400">📍 {selected.deliveryAddress.street}, {selected.deliveryAddress.city}, {selected.deliveryAddress.state}</p>}
        </div>
      )}
    </div>
  );
};

// ══ TAB 5 — ALL USERS ═══════════════════════════════════════════════════════════
const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingUser, setEditingUser] = useState(null);

  const load = useCallback(()=>{
    axios.get('/api/admin/users', hdr())
      .then(r=>setUsers(r.data.users||r.data||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[]);

  useEffect(()=>load(),[load]);

  const handleDelete = async (userId) => {
    try {
      await axios.delete(`/api/admin/users/${userId}`, hdr());
      toast('User deleted successfully');
      setConfirmDelete(null);
      load();
    } catch(e) {
      toast(e.response?.data?.message||'Failed to delete user');
    }
  };

  const handleToggleVerification = async (userId, currentStatus) => {
    try {
      await axios.put(`/api/admin/users/${userId}/verify`, { isVerified: !currentStatus }, hdr());
      toast(`User ${!currentStatus ? 'verified' : 'unverified'} successfully`);
      load();
    } catch(e) {
      toast(e.response?.data?.message||'Failed to update user');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(`/api/admin/users/${userId}/role`, { role: newRole }, hdr());
      toast('User role updated successfully');
      setEditingUser(null);
      load();
    } catch(e) {
      toast(e.response?.data?.message||'Failed to update role');
    }
  };

  const filtered = users.filter(u=>{
    const mR = !filterRole||u.role===filterRole;
    const mQ = !search||(u.name||'').toLowerCase().includes(search.toLowerCase())||(u.email||'').toLowerCase().includes(search.toLowerCase());
    return mR&&mQ;
  });

  if (loading) return <div className="text-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600 mx-auto"/></div>;

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email…" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 flex-1 min-w-[160px]"/>
        <select value={filterRole} onChange={e=>setFilterRole(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
          <option value="">All Roles</option>
          {['customer','farmer','delivery','admin'].map(r=><option key={r} value={r}>{r}</option>)}
        </select>
        <span className="text-xs text-gray-400">{filtered.length}/{users.length}</span>
      </div>
      {filtered.length===0?(
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100"><p className="text-4xl mb-3">👥</p><p className="text-gray-500">No users found</p></div>
      ):(
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['User','Role','Email','Phone','Status','Joined','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u=>(
                  <tr key={u._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center text-sm flex-shrink-0">
                          {u.role==='farmer'?'🌾':u.role==='delivery'?'🛵':u.role==='admin'?'⚙️':'👤'}
                        </div>
                        <span className="font-semibold text-gray-700">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editingUser===u._id?(
                        <select 
                          defaultValue={u.role}
                          onChange={(e)=>handleRoleChange(u._id, e.target.value)}
                          className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                        >
                          {['customer','farmer','delivery','admin'].map(r=><option key={r} value={r}>{r}</option>)}
                        </select>
                      ):(
                        <Badge status={u.role}/>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500">{u.phone||'—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={()=>handleToggleVerification(u._id, u.isVerified)}
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                          u.isVerified
                            ?'bg-green-100 text-green-700 hover:bg-green-200'
                            :'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {u.isVerified?'Verified':'Unverified'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={()=>setEditingUser(editingUser===u._id?null:u._id)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                          title="Edit role"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {u.role!=='admin'&&(
                          <button
                            onClick={()=>setConfirmDelete(u)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                            title="Delete user"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete&&(
        <ConfirmModal
          title="Delete User"
          message={`Are you sure you want to delete ${confirmDelete.name}? This action cannot be undone.`}
          onConfirm={()=>handleDelete(confirmDelete._id)}
          onCancel={()=>setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

// ══ TAB 6 — PRODUCT APPROVALS ═══════════════════════════════════════════════════
const ProductsTab = () => {
  const [products, setProducts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [actioning, setActioning] = useState({});

  const load = useCallback(()=>{
    setLoading(true);
    axios.get('/api/admin/products/pending', hdr())
      .then(r=>setProducts(r.data.products||r.data||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  },[]);

  useEffect(()=>load(),[load]);

  const act = async (id, action, reason='') => {
    setActioning(a=>({...a,[id]:action}));
    try {
      if (action==='approved') await axios.put(`/api/admin/products/${id}/approve`,{},hdr());
      else await axios.put(`/api/admin/products/${id}/reject`,{reason},hdr());
      load();
    } catch(e) { toast(e.response?.data?.message||'Action failed'); }
    finally { setActioning(a=>({...a,[id]:null})); }
  };

  if (loading) return <div className="text-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600 mx-auto"/></div>;
  if (products.length===0) return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
      <p className="text-4xl mb-3">✅</p><p className="text-gray-600 font-semibold">No products awaiting approval</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-800">Product Approvals</h2>
        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">{products.length} pending</span>
      </div>
      <div className="space-y-4">
        {products.map(p=>(
          <div key={p._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start gap-4 mb-4">
              <img src={p.images?.[0]||'https://placehold.co/80?text=?'} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-100"/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-bold text-gray-800">{p.name}</h3>
                  {p.isOrganic&&<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">🌿 Organic</span>}
                </div>
                <p className="text-xs text-gray-400 mb-1">by {p.farmer?.name||'—'} · {p.category?.name||'—'} · ₹{p.price}/{p.unit}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{p.description}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>act(p._id,'approved')} disabled={!!actioning[p._id]} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">
                {actioning[p._id]==='approved'?'Approving…':'✓ Approve'}
              </button>
              <button onClick={()=>{ const r=window.prompt('Rejection reason?'); if(r) act(p._id,'rejected',r); }} disabled={!!actioning[p._id]} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">
                {actioning[p._id]==='rejected'?'Rejecting…':'✗ Reject'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ══ TAB 7 — DELIVERY MANAGEMENT ══════════════════════════════════════════════════
const DeliveryMgmtTab = () => {
  const [readyOrders, setReadyOrders] = useState([]);
  const [agents,      setAgents]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [assigning,   setAssigning]   = useState({});
  const [selected,    setSelected]    = useState({});

  const load = useCallback(()=>{
    setLoading(true);
    Promise.all([
      axios.get('/api/admin/orders', hdr()).then(r=>{
        const all = r.data.orders||r.data||[];
        setReadyOrders(all.filter(o=>['ready-to-ship','payment-approved','confirmed'].includes(o.status)&&!o.delivery?.agent));
      }),
      axios.get('/api/admin/users', hdr()).then(r=>{
        const all = r.data.users||r.data||[];
        setAgents(all.filter(u=>u.role==='delivery'&&(u.isVerified||u.deliveryProfile?.isVerified)));
      })
    ]).catch(()=>{}).finally(()=>setLoading(false));
  },[]);

  useEffect(()=>load(),[load]);

  const assign = async (orderId) => {
    const agentId = selected[orderId];
    if (!agentId) return toast('Please select a delivery agent');
    setAssigning(a=>({...a,[orderId]:true}));
    try {
      await axios.post(`/api/admin/orders/${orderId}/assign-delivery`,{agentId},hdr());
      load();
    } catch(e) { toast(e.response?.data?.message||'Assignment failed'); }
    finally { setAssigning(a=>({...a,[orderId]:false})); }
  };

  if (loading) return <div className="text-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600 mx-auto"/></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-gray-800">Delivery Assignment</h2>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">{readyOrders.length} orders ready</span>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">{agents.length} agents available</span>
        </div>
      </div>
      {agents.length===0&&(
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">⚠️ No verified delivery agents available. Approve delivery agents in the Approvals tab first.</div>
      )}
      {readyOrders.length===0?(
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100"><p className="text-4xl mb-3">📦</p><p className="text-gray-600 font-semibold">No orders ready for delivery assignment</p></div>
      ):(
        readyOrders.map(order=>(
          <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-bold text-gray-700">#{order.orderNumber||order._id.slice(-8)}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${scol(order.status)}`}>{order.status}</span>
                </div>
                <p className="text-xs text-gray-400">{order.user?.name||order.guest?.name||'Guest'}</p>
                {order.deliveryAddress&&<p className="text-xs text-gray-400 mt-0.5">📍 {order.deliveryAddress.street}, {order.deliveryAddress.city}</p>}
              </div>
              <p className="font-bold text-green-700">{fmt(order.payment?.totalAmount)}</p>
            </div>
            <div className="flex gap-3 items-center">
              <select value={selected[order._id]||''} onChange={e=>setSelected(s=>({...s,[order._id]:e.target.value}))}
                className="flex-1 px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                <option value="">— Select delivery agent —</option>
                {agents.map(a=><option key={a._id} value={a._id}>{a.name} · {a.deliveryProfile?.vehicleType||'—'}</option>)}
              </select>
              <button onClick={()=>assign(order._id)} disabled={assigning[order._id]||!selected[order._id]}
                className="px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition whitespace-nowrap">
                {assigning[order._id]?'Assigning…':'Assign →'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ══ TAB 8 — AI PLATFORM INSIGHTS ════════════════════════════════════════════════
const AIInsightsTab = ({ stats, orders }) => {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');

  const analyse = async () => {
    setLoading(true); setError(''); setInsights(null);
    const totalRev = stats.totalRevenue || 0;
    const totalOrders = stats.totalOrders || 0;
    const avgOrder = totalOrders ? (totalRev/totalOrders).toFixed(0) : 0;
    const statusCounts = {};
    (orders||[]).forEach(o=>{ statusCounts[o.status]=(statusCounts[o.status]||0)+1; });

    const prompt = `You are a platform analytics expert analysing Farm2Home, an Indian farm-to-customer marketplace.

Platform data:
- Total users: ${stats.totalUsers||0} (farmers: ${stats.activeFarmers||0}, delivery agents: ${stats.deliveryAgents||0})
- Total orders: ${totalOrders}, Total revenue: ₹${totalRev}
- Avg order value: ₹${avgOrder}
- Order status breakdown: ${JSON.stringify(statusCounts)}
- Pending payments: ${stats.pendingPayments||0}
- Pending approvals: ${stats.pendingApprovals||0}

Respond ONLY with valid JSON (no markdown):
{
  "healthScore": number 0-100,
  "healthLabel": "Excellent or Good or Fair or Needs Attention",
  "highlights": ["positive insight 1","positive insight 2","positive insight 3"],
  "concerns": ["concern 1","concern 2"],
  "recommendations": ["actionable recommendation 1","recommendation 2","recommendation 3"],
  "revenueForecast": "one sentence about revenue trend",
  "conversionInsight": "one sentence about order conversion",
  "topPriority": "the single most important action to take right now"
}`;
    try {
      const res  = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
      const data = await res.json();
      const raw  = data.content?.map(c=>c.text||'').join('')||'';
      setInsights(JSON.parse(raw.replace(/```json|```/g,'').trim()));
    } catch { setError('Analysis failed — please try again.'); }
    finally { setLoading(false); }
  };

  const healthColor = {'Excellent':'text-green-600 bg-green-50 border-green-200','Good':'text-blue-600 bg-blue-50 border-blue-200','Fair':'text-amber-600 bg-amber-50 border-amber-200','Needs Attention':'text-red-600 bg-red-50 border-red-200'};

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
        <span className="text-3xl">🤖</span>
        <div>
          <h3 className="font-bold text-blue-800">AI Platform Insights</h3>
          <p className="text-sm text-blue-700 mt-0.5">Powered by Claude AI. Get intelligent analysis of platform performance, trends, and actionable recommendations.</p>
        </div>
      </div>

      {!insights&&!loading&&(
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
          <p className="text-5xl mb-4">📊</p>
          <p className="text-gray-600 mb-6 font-medium">Get AI-powered insights about your platform's performance</p>
          {error&&<div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{error}</div>}
          <button onClick={analyse} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition">🤖 Analyse Platform</button>
        </div>
      )}

      {loading&&(
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-10 h-10 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" style={{borderWidth:'3px'}}/>
          <p className="text-gray-600 font-medium">Claude is analysing your platform…</p>
        </div>
      )}

      {insights&&(
        <div className="space-y-4">
          <div className={`rounded-2xl border p-6 ${healthColor[insights.healthLabel]||'bg-gray-50 border-gray-200 text-gray-700'}`}>
            <div className="flex items-center gap-4 mb-3">
              <div className="text-center">
                <p className="text-5xl font-black">{insights.healthScore}</p>
                <p className="text-xs font-semibold opacity-70 uppercase tracking-wide">/100</p>
              </div>
              <div>
                <p className="text-2xl font-black">{insights.healthLabel}</p>
                <p className="text-sm opacity-80 mt-1">Platform Health Score</p>
              </div>
            </div>
          </div>

          {insights.topPriority&&(
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
              <p className="text-xs font-bold text-yellow-600 uppercase tracking-wide mb-1">⭐ Top Priority Action</p>
              <p className="text-gray-800 font-semibold">{insights.topPriority}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="font-bold text-gray-800 mb-3">✅ Highlights</h4>
              <div className="space-y-2">{insights.highlights?.map((h,i)=><div key={i} className="flex gap-2 text-sm text-gray-600"><span className="text-green-500 flex-shrink-0">✓</span>{h}</div>)}</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h4 className="font-bold text-gray-800 mb-3">⚠️ Concerns</h4>
              <div className="space-y-2">{insights.concerns?.map((c,i)=><div key={i} className="flex gap-2 text-sm text-gray-600"><span className="text-amber-500 flex-shrink-0">⚠</span>{c}</div>)}</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h4 className="font-bold text-gray-800 mb-3">💡 Recommendations</h4>
            <div className="space-y-2">{insights.recommendations?.map((r,i)=><div key={i} className="flex gap-3 text-sm text-gray-600 bg-blue-50 rounded-lg px-3 py-2"><span className="font-bold text-blue-600">{i+1}.</span>{r}</div>)}</div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {insights.revenueForecast&&<div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700"><strong>💰 Revenue: </strong>{insights.revenueForecast}</div>}
            {insights.conversionInsight&&<div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-700"><strong>📈 Conversion: </strong>{insights.conversionInsight}</div>}
          </div>

          <button onClick={analyse} className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">↻ Refresh Analysis</button>
        </div>
      )}
    </div>
  );
};

// ══ ROOT ADMIN DASHBOARD ═════════════════════════════════════════════════════════
const TABS = [
  { id:'overview',   label:'📊 Overview'   },
  { id:'payments',   label:'💳 Payments'   },
  { id:'approvals',  label:'⏳ Approvals'  },
  { id:'orders',     label:'📦 Orders'     },
  { id:'users',      label:'👥 Users'      },
  { id:'products',   label:'🌾 Products'   },
  { id:'delivery',   label:'🛵 Delivery'   },
  { id:'ai',         label:'🤖 AI Insights'},
];

const AdminDashboard = () => {
  const [tab,             setTab]            = useState('overview');
  const [stats,           setStats]          = useState({});
  const [monthly,         setMonthly]        = useState([]);
  const [recentOrders,    setRecentOrders]   = useState([]);
  const [pendingPayments, setPendingPayments]= useState([]);
  const [pendingApprovals,setPendingApprovals]=useState([]);
  const [loading,         setLoading]        = useState(true);

  const load = useCallback(async () => {
    try {
      const [statsRes, ordersRes, paymentsRes, approvalsRes] = await Promise.all([
        axios.get('/api/admin/dashboard/stats', hdr()),
        axios.get('/api/admin/orders', hdr()),
        axios.get('/api/admin/payments/pending', hdr()).catch(()=>({data:[]})),
        axios.get('/api/admin/users/pending', hdr()).catch(()=>({data:[]})),
      ]);
      setStats(statsRes.data||{});
      setMonthly(statsRes.data?.monthly||[]);
      const ordersArr = ordersRes.data?.orders||ordersRes.data||[];
      setRecentOrders(Array.isArray(ordersArr)?ordersArr:[]);
      setPendingPayments(paymentsRes.data||[]);
      setPendingApprovals(approvalsRes.data||[]);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mb-4"/><p className="text-gray-500">Loading dashboard…</p></div>
    </div>
  );

  const totalAlerts = pendingPayments.length + pendingApprovals.length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">Farm2Home platform management</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 hover:bg-white rounded-xl text-sm font-medium transition shadow-sm">
            <span className="text-base">↻</span> Refresh
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm mb-6 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`relative flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all min-w-[90px] ${tab===t.id?'bg-green-600 text-white shadow-sm':'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
              {t.label}
              {t.id==='payments'&&pendingPayments.length>0&&<span className="ml-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full inline-flex items-center justify-center">{pendingPayments.length}</span>}
              {t.id==='approvals'&&pendingApprovals.length>0&&<span className="ml-1 bg-amber-500 text-white text-xs w-4 h-4 rounded-full inline-flex items-center justify-center">{pendingApprovals.length}</span>}
            </button>
          ))}
        </div>

        {tab==='overview'  && <OverviewTab  stats={stats} monthly={monthly} pendingPayments={pendingPayments} pendingApprovals={pendingApprovals} setTab={setTab}/>}
        {tab==='payments'  && <PaymentsTab  pendingPayments={pendingPayments} onRefresh={load}/>}
        {tab==='approvals' && <ApprovalsTab pendingApprovals={pendingApprovals} onRefresh={load}/>}
        {tab==='orders'    && <OrdersTab    orders={recentOrders} onRefresh={load}/>}
        {tab==='users'     && <UsersTab/>}
        {tab==='products'  && <ProductsTab/>}
        {tab==='delivery'  && <DeliveryMgmtTab/>}
        {tab==='ai'        && <AIInsightsTab stats={stats} orders={recentOrders}/>}
      </div>
    </div>
  );
};

export default AdminDashboard;
