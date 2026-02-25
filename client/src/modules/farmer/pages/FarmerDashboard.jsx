import React, { useState, useEffect, useCallback, memo } from 'react';
import axios from '../../../core/config/axios';
import { useAuth } from '../../../shared/contexts/AuthContext';

const fmt   = n => `₹${Number(n||0).toLocaleString('en-IN')}`;
const UNITS = ['kg','g','litre','ml','piece','dozen','bundle','bag'];
const SEASONS = ['Jan–Mar (Winter)','Apr–Jun (Summer)','Jul–Sep (Monsoon)','Oct–Dec (Post-monsoon)'];

// ── Revenue Sparkline Area Chart with hover tooltip ──────────────────────────
const RevenueChart = memo(({ data }) => {
  const [hoverIdx, setHoverIdx] = useState(null);
  const values  = data.map(d => d.revenue);
  const min     = 0;
  const max     = Math.max(...values, 1);
  const W = 480, H = 120, padX = 8, padY = 14;

  const pts = data.map((d, i) => ({
    x: padX + (i / Math.max(data.length - 1, 1)) * (W - padX * 2),
    y: H - padY - ((d.revenue - min) / (max - min || 1)) * (H - padY * 2),
    ...d,
  }));

  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const fillD = `${lineD} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;
  const hovered = hoverIdx !== null ? pts[hoverIdx] : null;

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H + 26}`}
        className="w-full cursor-crosshair"
        onMouseMove={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = ((e.clientX - rect.left) / rect.width) * W;
          let closest = 0, minDist = Infinity;
          pts.forEach((p, i) => {
            const dist = Math.abs(p.x - mx);
            if (dist < minDist) { minDist = dist; closest = i; }
          });
          setHoverIdx(closest);
        }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#16a34a" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75, 1].map(f => (
          <g key={f}>
            <line x1={padX} x2={W - padX} y1={H - H * f + padY / 2} y2={H - H * f + padY / 2} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 3" />
            <text x={padX - 2} y={H - H * f + padY / 2 + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{fmt(max * f)}</text>
          </g>
        ))}

        {/* Area fill */}
        <path d={fillD} fill="url(#rev-fill)" />

        {/* Line */}
        <path d={lineD} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots on each data point (subtle) */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === hoverIdx ? 5 : 2.5}
            fill={i === hoverIdx ? 'white' : '#16a34a'}
            stroke="#16a34a" strokeWidth={i === hoverIdx ? 2.5 : 0}
            style={{ transition: 'r 0.1s' }}
          />
        ))}

        {/* Hover vertical guide */}
        {hovered && (
          <line x1={hovered.x} x2={hovered.x} y1={padY} y2={H} stroke="#16a34a" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
        )}

        {/* Month labels */}
        {pts.map((p, i) => (
          <text key={i} x={p.x} y={H + 20} textAnchor="middle" fontSize="9"
            fill={i === hoverIdx ? '#374151' : '#9ca3af'}
            fontWeight={i === hoverIdx ? '700' : '400'}
          >{p.label}</text>
        ))}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute z-20 pointer-events-none bg-gray-900 text-white rounded-xl px-3 py-2.5 text-xs shadow-2xl border border-gray-700"
          style={{ left: Math.min(hoverIdx / (pts.length - 1) * 88 + 2, 68) + '%', top: 4, transform: 'translateX(-50%)', minWidth: 120 }}
        >
          <p className="font-bold text-green-300 mb-1">{hovered.label}</p>
          <p className="font-semibold text-white text-sm">{fmt(hovered.revenue)}</p>
          {hovered.orders > 0 && <p className="text-gray-400 mt-0.5">{hovered.orders} order{hovered.orders !== 1 ? 's' : ''}</p>}
        </div>
      )}
    </div>
  );
});

const StatCard = ({ icon, label, value, sub, color='green' }) => {
  const c={green:'from-green-50 border-green-200 text-green-700',blue:'from-blue-50 border-blue-200 text-blue-700',amber:'from-amber-50 border-amber-200 text-amber-700',purple:'from-purple-50 border-purple-200 text-purple-700'}[color];
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

const Badge = ({ status }) => {
  const m={'approved':'bg-green-100 text-green-700','pending':'bg-yellow-100 text-yellow-700','rejected':'bg-red-100 text-red-700','in-stock':'bg-green-100 text-green-700','low-stock':'bg-orange-100 text-orange-700','out-of-stock':'bg-red-100 text-red-700'};
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m[status]||'bg-gray-100 text-gray-600'}`}>{status}</span>;
};

// ══ TAB 1 — OVERVIEW ═══════════════════════════════════════════════════════════
const OverviewTab = ({ stats, monthly, topProducts, lowStockItems, outOfStock }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon="💰" label="Total Revenue"   value={fmt(stats.totalRevenue)}   sub={`Avg ${fmt(stats.avgOrderValue)}/order`} color="green"/>
      <StatCard icon="📦" label="Total Orders"    value={stats.totalOrders||0}       sub={`${stats.pendingOrders||0} pending`}     color="blue"/>
      <StatCard icon="🌾" label="Active Products" value={stats.activeProducts||0}    sub={`${stats.pendingApproval||0} in review`} color="amber"/>
      <StatCard icon="📊" label="Units Sold"      value={stats.totalUnitsSold||0}    sub={`${stats.completedOrders||0} delivered`} color="purple"/>
    </div>

    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-bold text-gray-800 mb-1">Revenue — Last 6 Months</h3>
      <p className="text-xs text-gray-400 mb-4">Delivered orders only · <span className="text-green-600">Hover to see month details</span></p>
      <RevenueChart data={monthly}/>
    </div>

    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">🏆 Top Earning Products</h3>
        {topProducts.length===0
          ? <p className="text-gray-400 text-sm text-center py-6">No sales data yet</p>
          : <div className="space-y-3">{topProducts.map((p,i)=>(
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700 truncate">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.unitsSold} units · {p.orders} orders</p>
                </div>
                <span className="text-sm font-bold text-green-700">{fmt(p.revenue)}</span>
              </div>
            ))}</div>
        }
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">🔔 Stock Alerts</h3>
        {lowStockItems.length===0&&outOfStock.length===0
          ? <div className="text-center py-6"><p className="text-2xl mb-2">✅</p><p className="text-sm text-gray-500">All stock levels healthy</p></div>
          : <div className="space-y-2">
              {outOfStock.map(p=>(
                <div key={p.id} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <span className="text-sm">🔴</span>
                  <span className="text-sm font-medium text-red-700 flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-red-500 font-bold">OUT OF STOCK</span>
                </div>
              ))}
              {lowStockItems.map(p=>(
                <div key={p.id} className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <span className="text-sm">🟡</span>
                  <span className="text-sm font-medium text-orange-700 flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-orange-600 font-bold">{p.stock} left</span>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  </div>
);

// ══ TAB 2 — INVENTORY ══════════════════════════════════════════════════════════
const EMPTY_FORM = { name:'', description:'', shortDescription:'', price:'', compareAtPrice:'', unit:'kg', category:'', stock:'', lowStockThreshold:'10', images:[''], isOrganic:false, harvestDate:'', shelfLife:'', tags:'' };

const InventoryTab = ({ products, onRefresh }) => {
  const [categories, setCategories] = useState([]);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');
  const [stockEdit,  setStockEdit]  = useState({});
  const [stockSave,  setStockSave]  = useState({});
  const [search,     setSearch]     = useState('');
  const [filterCat,  setFilterCat]  = useState('');
  const [imgUploading, setImgUploading] = useState(false);

  useEffect(()=>{ axios.get('/api/farmer/categories').then(r=>setCategories(r.data.categories||[])).catch(()=>{}); },[]);

  const openNew  = () => { setEditing(null); setForm(EMPTY_FORM); setErr(''); setShowModal(true); };
  const openEdit = p  => {
    setEditing(p);
    setForm({ name:p.name, description:p.description, shortDescription:p.shortDescription||'', price:p.price, compareAtPrice:p.compareAtPrice||'', unit:p.unit, category:p.category?._id||'', stock:p.stock, lowStockThreshold:p.lowStockThreshold, images:p.images?.length?p.images:[''], isOrganic:p.isOrganic, harvestDate:p.harvestDate?.slice(0,10)||'', shelfLife:p.shelfLife||'', tags:(p.tags||[]).join(', ') });
    setErr(''); setShowModal(true);
  };
  const setF   = k => e => setForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
  const setImg = (i,v) => setForm(f=>{ const imgs=[...f.images]; imgs[i]=v; return {...f,images:imgs}; });

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const payload = { ...form, price:Number(form.price), compareAtPrice:form.compareAtPrice?Number(form.compareAtPrice):undefined, stock:Number(form.stock), lowStockThreshold:Number(form.lowStockThreshold), shelfLife:form.shelfLife?Number(form.shelfLife):undefined, images:form.images.filter(Boolean), tags:form.tags?form.tags.split(',').map(t=>t.trim()).filter(Boolean):[] };
      if (editing) await axios.put(`/api/farmer/products/${editing._id}`,payload);
      else         await axios.post('/api/farmer/products',payload);
      setShowModal(false); onRefresh();
    } catch(e) { setErr(e.response?.data?.message||'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async id => {
    if (!window.confirm('Delete this product?')) return;
    try { await axios.delete(`/api/farmer/products/${id}`); onRefresh(); } catch(e) { setErr(e.response?.data?.message||'Delete failed'); setShowModal(true); }
  };

  const saveStock = async id => {
    const val=stockEdit[id]; if(val===undefined||val==='') return;
    setStockSave(s=>({...s,[id]:true}));
    try { await axios.patch(`/api/farmer/products/${id}/stock`,{stock:Number(val)}); setStockEdit(s=>{const n={...s};delete n[id];return n;}); onRefresh(); } catch{}
    finally { setStockSave(s=>({...s,[id]:false})); }
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || p.category?._id === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center mb-5 gap-3">
        <h2 className="text-lg font-bold text-gray-800">My Products <span className="text-gray-400 font-normal text-sm">({filtered.length}/{products.length})</span></h2>
        <div className="flex items-center gap-2 flex-wrap">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-36"/>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
            <option value="">All Categories</option>
            {categories.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition">＋ Add Product</button>
        </div>
      </div>

      {filtered.length===0
        ? <div className="text-center py-16 bg-white rounded-2xl border border-gray-100"><p className="text-4xl mb-3">🌱</p><p className="text-gray-600 font-semibold mb-1">{search||filterCat?'No products match filters':'No products yet'}</p><button onClick={openNew} className="mt-3 px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold">Add First Product</button></div>
        : <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Product','Category','Price','Stock (edit inline)','Approval','Status','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p=>(
                    <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={p.images?.[0]||'https://placehold.co/48?text=?'} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" loading="lazy"/>
                          <div><p className="font-semibold text-gray-800 truncate max-w-[150px]">{p.name}</p>{p.isOrganic&&<span className="text-xs text-green-600">🌿 Organic</span>}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.category?.name||'—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-800">₹{p.price}<span className="text-gray-400 font-normal">/{p.unit}</span>{p.compareAtPrice>p.price&&<span className="ml-1 text-xs text-gray-400 line-through">₹{p.compareAtPrice}</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input type="number" min="0" value={stockEdit[p._id]!==undefined?stockEdit[p._id]:p.stock} onChange={e=>setStockEdit(s=>({...s,[p._id]:e.target.value}))} className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-green-500"/>
                          <span className="text-xs text-gray-400">{p.unit}</span>
                          {stockEdit[p._id]!==undefined&&<button onClick={()=>saveStock(p._id)} disabled={stockSave[p._id]} className="px-2 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50">{stockSave[p._id]?'…':'✓'}</button>}
                        </div>
                      </td>
                      <td className="px-4 py-3"><Badge status={p.approvalStatus}/></td>
                      <td className="px-4 py-3"><Badge status={p.availability}/></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={()=>openEdit(p)} className="px-3 py-1.5 border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700 rounded-lg text-xs font-medium transition">Edit</button>
                          <button onClick={()=>del(p._id)} className="px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-xs font-medium transition">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      }

      {showModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-800">{editing?'Edit Product':'Add New Product'}</h2>
              <button onClick={()=>setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              {err&&<div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{err}</div>}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2"><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Product Name *</label><input value={form.name} onChange={setF('name')} placeholder="e.g. Organic Tomatoes" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
                <div className="sm:col-span-2"><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description *</label><textarea value={form.description} onChange={setF('description')} rows={3} placeholder="Describe your product…" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"/></div>
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Price (₹) *</label><input type="number" min="0" value={form.price} onChange={setF('price')} placeholder="0" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Compare Price (₹)</label><input type="number" min="0" value={form.compareAtPrice} onChange={setF('compareAtPrice')} placeholder="Strikethrough price" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Unit *</label><select value={form.unit} onChange={setF('unit')} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">{UNITS.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Category *</label><select value={form.category} onChange={setF('category')} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"><option value="">Select…</option>{categories.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select></div>
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Stock *</label><input type="number" min="0" value={form.stock} onChange={setF('stock')} placeholder="0" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Low Stock Alert at</label><input type="number" min="0" value={form.lowStockThreshold} onChange={setF('lowStockThreshold')} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Harvest Date</label><input type="date" value={form.harvestDate} onChange={setF('harvestDate')} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
                <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Shelf Life (days)</label><input type="number" min="0" value={form.shelfLife} onChange={setF('shelfLife')} placeholder="e.g. 7" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
                <div className="sm:col-span-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isOrganic} onChange={setF('isOrganic')} className="w-4 h-4 text-green-600 rounded"/><span className="text-sm font-medium text-gray-700">🌿 Organic product</span></label></div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Product Images</label>
                  <div className="space-y-2">
                    {form.images.filter(Boolean).map((img,i)=>(
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <img src={img} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" onError={e=>e.target.style.display='none'}/>
                        <span className="text-xs text-gray-500 flex-1 truncate">{img.length>60?img.slice(0,60)+'…':img}</span>
                        <button type="button" onClick={()=>setForm(f=>({...f,images:f.images.filter((_,j)=>j!==i)}))} className="text-red-400 hover:text-red-600 text-lg leading-none px-1">×</button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 px-3 py-2.5 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition text-sm text-green-600 font-medium">
                        <span>📷</span>
                        <span>{imgUploading?'Uploading…':'Upload from device'}</span>
                      </div>
                      <input type="file" accept="image/*" multiple className="hidden" disabled={imgUploading}
                        onChange={async(e)=>{
                          const files=[...e.target.files]; if(!files.length) return;
                          setImgUploading(true);
                          for(const file of files){
                            const reader=new FileReader();
                            await new Promise(res=>{
                              reader.onload=async(ev)=>{
                                try{
                                  const r=await axios.post('/api/farmer/products/upload-image',{imageData:ev.target.result});
                                  if(r.data.success) setForm(f=>({...f,images:[...f.images.filter(Boolean),r.data.url]}));
                                }catch{ setErr('Image upload failed. Check Cloudinary config.'); }
                                res();
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                          setImgUploading(false);
                          e.target.value='';
                        }}
                      />
                    </label>
                    <span className="text-xs text-gray-400">or</span>
                    <button type="button" onClick={()=>setForm(f=>({...f,images:[...f.images,'']})) }
                      className="px-3 py-2.5 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50 font-medium transition">
                      + Add URL
                    </button>
                  </div>
                  {form.images.some(img=>img===''||img.startsWith('http'))&&form.images.filter(Boolean).map((img,i)=>
                    img&&!img.startsWith('data:')&&img===form.images[i]&&!img.includes('cloudinary')?(
                      <div key={'url-'+i} className="mt-1 flex gap-2">
                        <input value={img} onChange={e=>setImg(i,e.target.value)} placeholder="https://…"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/>
                      </div>
                    ):null
                  )}
                  <p className="text-xs text-gray-400 mt-1">Upload photos from your device or enter image URLs. First image is the thumbnail.</p>
                </div>
                <div className="sm:col-span-2"><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tags (comma separated)</label><input value={form.tags} onChange={setF('tags')} placeholder="e.g. fresh, local, pesticide-free" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
              </div>
              {editing&&<p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">⚠️ Changing price or description resets approval for admin review.</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={save} disabled={saving} className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">{saving?'Saving…':editing?'Save Changes':'Create Product'}</button>
                <button onClick={()=>setShowModal(false)} className="px-5 py-3 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ══ TAB 3 — ORDERS ═════════════════════════════════════════════════════════════
const scol = s=>({'pending':'bg-yellow-100 text-yellow-700','confirmed':'bg-blue-100 text-blue-700','preparing':'bg-orange-100 text-orange-700','ready-to-ship':'bg-purple-100 text-purple-700','delivered':'bg-green-100 text-green-700','cancelled':'bg-red-100 text-red-700'}[s]||'bg-gray-100 text-gray-600');
const ORDER_STATUSES = ['confirmed','preparing','ready-to-ship'];

const OrdersTab = ({ orders, onRefresh }) => {
  const [updating, setUpdating] = useState({});
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const update = async (id, status) => {
    setUpdating(u=>({...u,[id]:true}));
    try { await axios.put(`/api/farmer/orders/${id}/status`,{status}); onRefresh(); }
    catch(e) { console.error(e.response?.data?.message||'Update failed'); }
    finally  { setUpdating(u=>({...u,[id]:false})); }
  };

  const filtered = orders.filter(o => {
    const matchStatus = !filterStatus || o.status === filterStatus;
    const matchSearch = !search || (o.orderNumber||'').toString().includes(search) || (o.user?.name||'').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  if (!orders.length) return (
    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
      <p className="text-4xl mb-3">📭</p><p className="text-gray-600 font-semibold">No orders yet</p>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order # or customer…" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 flex-1 min-w-[180px]"/>
        <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
          <option value="">All Status</option>
          {['confirmed','preparing','ready-to-ship','assigned','shipped','delivered','cancelled'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length}/{orders.length}</span>
      </div>
      <div className="space-y-4">
        {filtered.map(order=>{
          const rev=order.items.reduce((s,i)=>s+i.price*i.quantity,0);
          return (
            <div key={order._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-sm font-bold text-gray-700">#{order.orderNumber||order._id.slice(-8).toUpperCase()}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${scol(order.status)}`}>{order.status}</span>
                  </div>
                  <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-700 text-lg">{fmt(rev)}</p>
                  <p className="text-xs text-gray-400">{order.user?.name||order.guest?.name||'Guest'} · {order.user?.phone||'—'}</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                {order.items.map((item,i)=>(
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <img src={item.product?.images?.[0]||'https://placehold.co/40?text=?'} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"/>
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-700 truncate">{item.product?.name||'Product'}</p><p className="text-xs text-gray-400">{item.quantity} × ₹{item.price}</p></div>
                    <p className="text-sm font-bold text-gray-700">{fmt(item.quantity*item.price)}</p>
                  </div>
                ))}
              </div>
              {order.deliveryAddress&&<p className="text-xs text-gray-400 mb-4">📍 {order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state}</p>}
              {!['delivered','cancelled','shipped','assigned'].includes(order.status)&&(
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500 self-center font-medium">Update:</span>
                  {ORDER_STATUSES.filter(s=>{const r={confirmed:1,preparing:2,'ready-to-ship':3};return(r[s]||0)>(r[order.status]||0);}).map(s=>(
                    <button key={s} onClick={()=>update(order._id,s)} disabled={updating[order._id]}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${order.status===s?'bg-green-600 text-white cursor-default':'border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700'} disabled:opacity-50`}>
                      {updating[order._id]?'…':s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ══ TAB 4 — MY FARM ════════════════════════════════════════════════════════════
const MyFarmTab = ({ user, onRefresh }) => {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    axios.get('/api/farmer/profile')
      .then(r => setForm(r.data.farmer || r.data || {}))
      .catch(() => setForm({}));
  }, []);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setErr('');
    try {
      await axios.put('/api/farmer/profile', form);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
      onRefresh();
    } catch(e) { setErr(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const fp = user?.farmerProfile || {};

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center text-3xl flex-shrink-0">🌾</div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{fp.farmName || user?.name || 'My Farm'}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${fp.isVerified ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {fp.isVerified ? '✓ Verified Farmer' : 'Pending Verification'}
              </span>
              {fp.organicCertified && <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700">🌿 Organic Certified</span>}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="text-center"><p className="text-2xl font-black text-green-700">{fp.experience || 0}</p><p className="text-xs text-gray-500 mt-1">Years Experience</p></div>
          <div className="text-center"><p className="text-2xl font-black text-blue-700">{fp.farmSize || '—'}</p><p className="text-xs text-gray-500 mt-1">Farm Size (acres)</p></div>
          <div className="text-center"><p className="text-2xl font-black text-amber-700">{fp.rating?.toFixed(1) || '—'}</p><p className="text-xs text-gray-500 mt-1">Avg Rating ⭐</p></div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Farm Name</label><input value={form.farmName||''} onChange={setF('farmName')} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
          <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Experience (years)</label><input type="number" min="0" value={form.experience||''} onChange={setF('experience')} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
          <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Farm Size (acres)</label><input type="number" min="0" value={form.farmSize||''} onChange={setF('farmSize')} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
          <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Location / Village</label><input value={form.location||''} onChange={setF('location')} placeholder="e.g. Wayanad, Kerala" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
          <div className="sm:col-span-2"><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Farm Description</label><textarea value={form.description||''} onChange={setF('description')} rows={3} placeholder="Tell customers about your farm…" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"/></div>
        </div>

        {err&&<div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{err}</div>}
        <button onClick={save} disabled={saving} className={`mt-4 px-6 py-2.5 font-bold rounded-xl text-sm transition flex items-center gap-2 ${saved?'bg-emerald-600 text-white':'bg-green-600 hover:bg-green-700 text-white'} disabled:opacity-50`}>
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

// ══ TAB 5 — AI PRICE ADVISOR ════════════════════════════════════════════════════
const AIAdvisorTab = ({ products }) => {
  const defaultSeason = SEASONS[new Date().getMonth()>8?3:new Date().getMonth()>5?2:new Date().getMonth()>2?1:0];
  const [form,    setForm]    = useState({ productName:'', category:'Vegetables', isOrganic:false, currentPrice:'', costToGrow:'', expectedStock:'', targetCity:'', season:defaultSeason, competitors:'' });
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');

  const setF = k => e => setForm(f=>({...f,[k]:e.target.type==='checkbox'?e.target.checked:e.target.value}));
  const prefill = p => { setForm(f=>({...f,productName:p.name,category:p.category?.name||'Vegetables',isOrganic:p.isOrganic,currentPrice:p.price,expectedStock:p.stock})); setResult(null); };

  const analyse = async () => {
    if (!form.productName||!form.currentPrice) { setError('Product name and price are required'); return; }
    setLoading(true); setError(''); setResult(null);
    const prompt = `You are an expert agricultural market analyst in India helping farmers price their produce profitably.
Product: ${form.productName} (${form.category}), Organic: ${form.isOrganic?'Yes':'No'}
Current price: ₹${form.currentPrice}/unit, Production cost: ₹${form.costToGrow||'unknown'}/unit
Stock: ${form.expectedStock||'unknown'} units, Market: ${form.targetCity||'not specified'}, Season: ${form.season}
Competitors: ${form.competitors||'not provided'}
Respond ONLY with valid JSON (no markdown):
{"recommendedPrice":{"min":number,"max":number,"optimal":number},"profitMargin":{"atCurrentPrice":"X%","atOptimalPrice":"X%"},"expectedRevenue":{"conservative":number,"optimistic":number},"demandOutlook":"High or Medium or Low","demandReason":"one sentence","pricingStrategy":"Premium or Competitive or Value or Penetration","pricingRationale":"two sentences","tips":["tip1","tip2","tip3"],"risks":["risk1","risk2"],"bestTimeToSell":"one sentence","organicPremium":"one sentence or null"}`;
    try {
      const response = await axios.post('/api/farmer/ai/price-advisor', { prompt });
      if (!response.data.success) throw new Error(response.data.message);
      const raw = response.data.text || '';
      setResult(JSON.parse(raw.replace(/```json|```/g,'').trim()));
    } catch { setError('Analysis failed — please try again.'); }
    finally  { setLoading(false); }
  };

  const demC={'High':'text-green-600 bg-green-50 border-green-200','Medium':'text-amber-600 bg-amber-50 border-amber-200','Low':'text-red-600 bg-red-50 border-red-200'};
  const strC={'Premium':'text-purple-700 bg-purple-50','Competitive':'text-blue-700 bg-blue-50','Value':'text-green-700 bg-green-50','Penetration':'text-orange-700 bg-orange-50'};

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 flex items-start gap-3">
        <span className="text-3xl">🤖</span>
        <div><h3 className="font-bold text-green-800">AI Price Advisor</h3><p className="text-sm text-green-700 mt-0.5">Powered by Claude AI. Get data-driven pricing, profit estimates and market strategy for your produce.</p></div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-gray-800">Product Details</h3>
          {products.length>0&&(
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Quick-fill from my products</label>
              <select onChange={e=>{const p=products.find(x=>x._id===e.target.value);if(p)prefill(p);}} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                <option value="">— Select a product —</option>
                {products.map(p=><option key={p._id} value={p._id}>{p.name} (₹{p.price})</option>)}
              </select>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Product Name *</label><input value={form.productName} onChange={setF('productName')} placeholder="e.g. Organic Tomatoes" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
            <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Category</label><select value={form.category} onChange={setF('category')} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">{['Vegetables','Fruits','Dairy & Eggs','Grains & Pulses','Herbs & Spices','Other'].map(c=><option key={c}>{c}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Season</label><select value={form.season} onChange={setF('season')} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">{SEASONS.map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your Price (₹) *</label><input type="number" min="0" value={form.currentPrice} onChange={setF('currentPrice')} placeholder="0" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
            <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Production Cost (₹)</label><input type="number" min="0" value={form.costToGrow} onChange={setF('costToGrow')} placeholder="0" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
            <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Available Stock</label><input type="number" min="0" value={form.expectedStock} onChange={setF('expectedStock')} placeholder="units" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
            <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Target City</label><input value={form.targetCity} onChange={setF('targetCity')} placeholder="e.g. Kozhikode" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
            <div><label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Competitor Prices</label><input value={form.competitors} onChange={setF('competitors')} placeholder="e.g. ₹30–₹45/kg" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/></div>
            <div className="sm:col-span-2"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isOrganic} onChange={setF('isOrganic')} className="w-4 h-4 text-green-600 rounded"/><span className="text-sm text-gray-700 font-medium">🌿 Organic product</span></label></div>
          </div>
          {error&&<div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}
          <button onClick={analyse} disabled={loading} className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2">
            {loading?<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Analysing…</>:'🤖 Get AI Recommendation'}
          </button>
        </div>
        <div className="space-y-4">
          {!result&&!loading&&<div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center"><p className="text-4xl mb-3">💡</p><p className="text-gray-500">Fill in the details and click Analyse to get AI-powered pricing advice</p></div>}
          {loading&&<div className="bg-white rounded-2xl border border-gray-100 p-12 text-center"><div className="w-10 h-10 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4" style={{borderWidth:'3px'}}/><p className="text-gray-600 font-medium">Claude is analysing the market…</p></div>}
          {result&&(
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h4 className="font-bold text-gray-800 mb-3">💰 Recommended Price Range</h4>
                <div className="flex items-end gap-4 mb-3">
                  <div className="text-center"><p className="text-xs text-gray-400 mb-1">Min</p><p className="text-xl font-bold text-gray-500">₹{result.recommendedPrice?.min}</p></div>
                  <div className="text-center flex-1"><p className="text-xs text-green-600 font-semibold mb-1">✓ Optimal</p><p className="text-4xl font-black text-green-700">₹{result.recommendedPrice?.optimal}</p></div>
                  <div className="text-center"><p className="text-xs text-gray-400 mb-1">Max</p><p className="text-xl font-bold text-gray-500">₹{result.recommendedPrice?.max}</p></div>
                </div>
                <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100">
                  <span className="text-gray-500">Your price: <strong>₹{form.currentPrice}</strong></span>
                  {result.recommendedPrice?.optimal>form.currentPrice?<span className="text-green-600 font-semibold">↑ You can charge more!</span>:result.recommendedPrice?.optimal<form.currentPrice?<span className="text-amber-600 font-semibold">↓ Consider lowering</span>:<span className="text-green-600 font-semibold">✓ Looks right</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"><p className="text-xs text-gray-400 mb-1">Profit Margin</p><p className="text-2xl font-black text-gray-800">{result.profitMargin?.atOptimalPrice}</p><p className="text-xs text-gray-400">at optimal price</p></div>
                <div className={`rounded-2xl border p-4 ${demC[result.demandOutlook]||'bg-gray-50 border-gray-200 text-gray-700'}`}><p className="text-xs opacity-70 mb-1">Demand</p><p className="text-2xl font-black">{result.demandOutlook}</p><p className="text-xs opacity-70 mt-1 leading-snug">{result.demandReason}</p></div>
              </div>
              {form.expectedStock&&<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Expected Revenue (if all sold)</p><div className="flex justify-around"><div className="text-center"><p className="text-xs text-gray-400 mb-1">Conservative</p><p className="text-lg font-bold text-gray-700">{fmt(result.expectedRevenue?.conservative)}</p></div><div className="text-center"><p className="text-xs text-gray-400 mb-1">Optimistic</p><p className="text-lg font-bold text-green-700">{fmt(result.expectedRevenue?.optimistic)}</p></div></div></div>}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"><div className="flex items-center gap-2 mb-2"><span className="text-sm font-bold text-gray-700">Strategy:</span><span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${strC[result.pricingStrategy]||'bg-gray-100 text-gray-600'}`}>{result.pricingStrategy}</span></div><p className="text-sm text-gray-600 leading-relaxed">{result.pricingRationale}</p></div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"><h4 className="font-bold text-gray-800 mb-3">💡 Tips & Risks</h4><div className="space-y-1.5 mb-3">{result.tips?.map((t,i)=><div key={i} className="flex gap-2 text-sm text-gray-600"><span className="text-green-500 flex-shrink-0">✓</span>{t}</div>)}</div>{result.risks?.map((r,i)=><div key={i} className="flex gap-2 text-sm text-gray-500"><span className="text-amber-500 flex-shrink-0">⚠</span>{r}</div>)}</div>
              {result.bestTimeToSell&&<div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700"><strong>⏰ Best timing: </strong>{result.bestTimeToSell}</div>}
              {result.organicPremium&&form.isOrganic&&<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700"><strong>🌿 Organic premium: </strong>{result.organicPremium}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ══ ROOT DASHBOARD ══════════════════════════════════════════════════════════════
const TABS = [
  { id:'overview',   label:'📊 Overview'   },
  { id:'inventory',  label:'🌾 Inventory'  },
  { id:'orders',     label:'📦 Orders'     },
  { id:'myfarm',     label:'🏡 My Farm'    },
  { id:'ai-advisor', label:'🤖 AI Advisor' },
];

const FarmerDashboard = () => {
  const { user } = useAuth();
  const [tab,           setTab]          = useState('overview');
  const [stats,         setStats]         = useState({});
  const [monthly,       setMonthly]       = useState([]);
  const [topProds,      setTopProds]      = useState([]);
  const [lowStock,      setLowStock]      = useState([]);
  const [outStock,      setOutStock]      = useState([]);
  const [products,      setProducts]      = useState([]);
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [pendingApproval, setPendingApproval] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, p, o] = await Promise.all([
        axios.get('/api/farmer/dashboard/stats'),
        axios.get('/api/farmer/products'),
        axios.get('/api/farmer/orders'),
      ]);
      const ds = d.data;
      setStats(ds.stats||{}); setMonthly(ds.monthly||[]); setTopProds(ds.topProducts||[]);
      setLowStock(ds.lowStockItems||[]); setOutStock(ds.outOfStock||[]);
      setProducts(p.data.products||[]); setOrders(o.data.orders||[]);
    } catch(e){
      if (e.response?.status === 403 && e.response?.data?.code === 'ACCOUNT_PENDING_APPROVAL') {
        setPendingApproval(true);
      } else {
        console.error(e);
      }
    }
    finally { setLoading(false); }
  }, []);

  useEffect(()=>{ load(); },[load]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mb-4"/><p className="text-gray-500">Loading dashboard…</p></div>
    </div>
  );

  // Account not yet approved by admin — show friendly waiting screen
  if (pendingApproval) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-10">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h1>
          <p className="text-gray-500 mb-6">
            Hi <strong>{user?.name}</strong>, your farmer account has been registered successfully!
            Our admin team is reviewing your details and will approve your account shortly.
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

  // Count orders needing farmer action: 'confirmed' (new COD orders) and 'pending' (online awaiting payment approval)
  const pendingOrders  = orders.filter(o=>['confirmed','pending'].includes(o.status)).length;
  const pendingAlerts  = lowStock.length + outStock.length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900">Farmer Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, <strong>{user?.name}</strong> &nbsp;<span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${user?.farmerProfile?.isVerified?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-500'}`}>{user?.farmerProfile?.isVerified?'✓ Verified':'Unverified'}</span></p>
        </div>

        <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-gray-100 shadow-sm mb-6 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all min-w-[110px] ${tab===t.id?'bg-green-600 text-white shadow-sm':'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
              {t.label}
              {t.id==='orders'&&pendingOrders>0&&<span className="ml-1.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full inline-flex items-center justify-center">{pendingOrders}</span>}
              {t.id==='inventory'&&pendingAlerts>0&&<span className="ml-1.5 bg-amber-500 text-white text-xs w-4 h-4 rounded-full inline-flex items-center justify-center">{pendingAlerts}</span>}
            </button>
          ))}
        </div>

        {tab==='overview'   && <OverviewTab  stats={stats} monthly={monthly} topProducts={topProds} lowStockItems={lowStock} outOfStock={outStock}/>}
        {tab==='inventory'  && <InventoryTab products={products} onRefresh={load}/>}
        {tab==='orders'     && <OrdersTab    orders={orders} onRefresh={load}/>}
        {tab==='myfarm'     && <MyFarmTab    user={user} onRefresh={load}/>}
        {tab==='ai-advisor' && <AIAdvisorTab products={products}/>}
      </div>
    </div>
  );
};

export default FarmerDashboard;
