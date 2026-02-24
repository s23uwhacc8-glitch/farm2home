import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../../core/config/axios';
import { useCart } from '../../../shared/contexts/CartContext';
import { useAuth } from '../../../shared/contexts/AuthContext';
import StarRating from '../../../shared/components/StarRating';
import { RANK_CONFIG, getTrustBadge } from '../../../shared/utils/farmerRank';
import useDebounce from '../../../shared/hooks/useDebounce';

// ── Constants ────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: '',                    label: 'Recommended'            },
  { value: 'popular',             label: 'Most popular'           },
  { value: 'rating',              label: 'Highest rated'          },
  { value: 'price-asc',           label: 'Price: Low → High'      },
  { value: 'price-desc',          label: 'Price: High → Low'      },
  { value: 'farmer-trust-desc',   label: '🏆 Most trusted farmer' },
  { value: 'farmer-rating-desc',  label: '⭐ Best rated farmer'   },
  { value: 'farmer-reviews-desc', label: '💬 Most reviewed farmer'},
];

const RANK_OPTIONS = [
  { value: '',         label: 'All Ranks'          },
  { value: 'platinum', label: '💎 Platinum Farmers' },
  { value: 'gold',     label: '🥇 Gold Farmers'     },
  { value: 'silver',   label: '🥈 Silver Farmers'   },
  { value: 'bronze',   label: '🥉 Bronze Farmers'   },
];

const MIN_RATING_OPTIONS = [
  { value: '',  label: 'Any Rating' },
  { value: '4', label: '4+ Stars'   },
  { value: '3', label: '3+ Stars'   },
  { value: '2', label: '2+ Stars'   },
];

const EMPTY = { category: '', search: '', organic: false, sort: '', farmerRank: '', farmerMinRating: '', city: '', useMyLocation: false };

const LBL = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';
const SEL = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white';

// Groups flat product array by lowercase name — memoised at call site
function groupByName(products) {
  const map = new Map();
  for (const p of products) {
    const key = p.name.toLowerCase().trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(p);
  }
  return [...map.values()].map(vs => ({ key: vs[0].name, variants: vs }));
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
    <div className="h-48 bg-gray-200" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="h-10 bg-gray-100 rounded" />
      <div className="h-8 bg-gray-200 rounded" />
    </div>
  </div>
);

// ── Active filter chip ────────────────────────────────────────────────────────
const Chip = memo(({ label, onRemove, color = 'gray' }) => {
  const colors = { blue: 'bg-blue-100 text-blue-700', green: 'bg-green-100 text-green-700', yellow: 'bg-yellow-100 text-yellow-700', gray: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${colors[color]}`}>
      {label}
      <button onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100 leading-none">×</button>
    </span>
  );
});

// ── Product card with farmer carousel ────────────────────────────────────────
// memo() prevents re-render when parent changes state (toast, showFilters, etc.)
const ProductCard = memo(({ variants, onAdd }) => {
  const [idx, setIdx] = useState(0);
  const count = variants.length;
  const p  = variants[idx];
  const rk = RANK_CONFIG[getTrustBadge(p.farmer?.farmerProfile?.trustScore)];

  const prev = e => { e.preventDefault(); setIdx(i => (i - 1 + count) % count); };
  const next = e => { e.preventDefault(); setIdx(i => (i + 1) % count); };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
      {/* Image — lazy loaded so off-screen images don't block initial render */}
      <Link to={`/products/${p._id}`} className="relative block flex-shrink-0">
        <img
          src={p.images?.[0] || 'https://placehold.co/300x200?text=No+Image'}
          alt={p.name}
          loading="lazy"
          decoding="async"
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {p.isLocalFarmer && <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">📍 Near You</span>}
          {p.isFeatured && !p.isLocalFarmer && <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">⭐ Featured</span>}
          {p.isOrganic && <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">🌿 Organic</span>}
        </div>
        {p.farmer?.farmerProfile?.isVerified && (
          <span className="absolute top-2 right-2 bg-white/90 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold border border-blue-200">✓ Verified</span>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <Link to={`/products/${p._id}`}>
          <h3 className="font-semibold text-gray-800 hover:text-green-700 transition-colors mb-1 text-sm leading-snug line-clamp-2">{p.name}</h3>
        </Link>
        <div className="flex items-center gap-1.5 mb-3">
          <StarRating rating={p.rating} size="xs" />
          <span className="text-xs text-gray-400">({p.totalReviews})</span>
        </div>

        {/* Farmer carousel */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2 mb-3">
          <div className="flex items-center gap-1">
            {count > 1 && (
              <button onClick={prev} aria-label="Previous farmer"
                className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:border-green-400 hover:text-green-600 transition flex-shrink-0 text-xs font-bold">
                ‹
              </button>
            )}
            <Link to={`/farmers/${p.farmer?._id}`} className="flex-1 flex items-center gap-1.5 min-w-0 group">
              <span className={`text-xs font-bold flex-shrink-0 ${rk.iconColor}`}>{rk.icon}</span>
              <span className="text-xs text-gray-600 group-hover:text-green-700 transition-colors truncate font-medium">{p.farmer?.name}</span>
              {p.farmer?.farmerProfile?.rating > 0 && (
                <span className="text-xs text-yellow-500 font-semibold flex-shrink-0 ml-auto">★ {p.farmer.farmerProfile.rating.toFixed(1)}</span>
              )}
            </Link>
            {count > 1 && (
              <button onClick={next} aria-label="Next farmer"
                className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:border-green-400 hover:text-green-600 transition flex-shrink-0 text-xs font-bold">
                ›
              </button>
            )}
          </div>
          {count > 1 && (
            <div className="flex items-center justify-center gap-1 mt-1.5">
              {variants.map((_, i) => (
                <button key={i} onClick={e => { e.preventDefault(); setIdx(i); }} aria-label={`Farmer ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-200 ${i === idx ? 'w-4 bg-green-500' : 'w-1.5 bg-gray-300'}`} />
              ))}
              <span className="text-xs text-gray-400 ml-1">{idx + 1}/{count}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto mb-3">
          <div>
            <span className="text-xl font-bold text-green-700">₹{p.price}</span>
            <span className="text-gray-400 text-xs">/{p.unit}</span>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.stock > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
            {p.stock > 0 ? `${p.stock} left` : 'Out of stock'}
          </span>
        </div>

        {p.stock > 0 ? (
          <button onClick={() => onAdd(p)}
            className="w-full py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-semibold rounded-lg transition-all duration-150 text-sm">
            Add to Cart
          </button>
        ) : (
          <button disabled className="w-full py-2 bg-gray-100 text-gray-400 font-semibold rounded-lg cursor-not-allowed text-sm">
            Out of Stock
          </button>
        )}
      </div>
    </div>
  );
});

// ── Main page ─────────────────────────────────────────────────────────────────
const ProductList = () => {
  const { user }      = useAuth();
  const { addToCart } = useCart();

  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [cities,      setCities]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [softLoading, setSoftLoading] = useState(false); // filter change — no skeleton flash
  const [filter,      setFilter]      = useState(EMPTY);
  const [showFilters, setShowFilters] = useState(false);
  const [toast,       setToast]       = useState('');

  const debouncedSearch = useDebounce(filter.search, 400);
  const debouncedCity   = useDebounce(filter.city,   500);

  // Group products by name — only recompute when products array changes
  const grouped = useMemo(() => groupByName(products), [products]);

  // Stats line — only recompute when products change, not on every render
  const stats = useMemo(() => ({
    listings: products.length,
    unique:   grouped.length,
    farmers:  new Set(products.map(p => p.farmer?._id)).size,
    local:    products.filter(p => p.isLocalFarmer).length,
  }), [products, grouped]);

  const activeFilterCount = useMemo(() =>
    [filter.category, filter.organic, filter.farmerRank, filter.farmerMinRating, filter.sort, filter.city].filter(Boolean).length,
    [filter]
  );

  const showToast = useCallback(msg => { setToast(msg); setTimeout(() => setToast(''), 2000); }, []);
  const handleAddToCart = useCallback(p => { addToCart(p); showToast(`${p.name} added to cart!`); }, [addToCart, showToast]);
  const setF = useCallback(key => e => setFilter(f => ({ ...f, [key]: e.target.value })), []);
  const clearFilters = useCallback(() => setFilter(EMPTY), []);

  // Auto-fill city from user profile when "use my location" is checked
  useEffect(() => {
    if (filter.useMyLocation && user?.address?.city) {
      setFilter(f => ({ ...f, city: user.address.city }));
    }
  }, [filter.useMyLocation, user]);

  const fetchProducts = useCallback(async (isFirstLoad = false) => {
    if (isFirstLoad) setLoading(true);
    else setSoftLoading(true);

    try {
      const params = {};
      if (filter.category)        params.category        = filter.category;
      if (debouncedSearch)        params.search          = debouncedSearch;
      if (filter.organic)         params.organic         = 'true';
      if (filter.sort)            params.sort            = filter.sort;
      if (filter.farmerRank)      params.farmerRank      = filter.farmerRank;
      if (filter.farmerMinRating) params.farmerMinRating = filter.farmerMinRating;
      if (debouncedCity)          params.city            = debouncedCity;

      const res = await axios.get('/api/customer/products', { params });
      setProducts(res.data.products || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
      setSoftLoading(false);
    }
  }, [filter.category, filter.organic, filter.sort, filter.farmerRank, filter.farmerMinRating, debouncedSearch, debouncedCity]);

  // First load shows full skeleton; subsequent filter changes show subtle overlay
  const isFirst = React.useRef(true);
  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; fetchProducts(true); }
    else fetchProducts(false);
  }, [fetchProducts]);

  // Fetch categories + cities once
  useEffect(() => {
    axios.get('/api/categories').then(r => setCategories(r.data || [])).catch(() => {});
    axios.get('/api/customer/products/cities').then(r => setCities(r.data?.cities || [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">

        {/* Toast — positioned fixed, doesn't cause layout shift */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium pointer-events-none">
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Fresh Farm Products</h1>
            <p className="text-gray-500 text-sm mt-0.5 h-5">
              {loading ? '' : softLoading
                ? <span className="inline-flex items-center gap-1 text-sm"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse inline-block" /> Updating…</span>
                : `${stats.unique} products · ${stats.listings} listings from ${stats.farmers} farmers${stats.local > 0 ? ` · ${stats.local} near you` : ''}`}
            </p>
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
              showFilters ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
            }`}>
            🔽 Filters
            {activeFilterCount > 0 && (
              <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Search — always visible */}
        <div className="relative mb-4">
          <input type="text" placeholder="Search products…" value={filter.search}
            onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-sm" />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
          {filter.search && (
            <button onClick={() => setFilter(f => ({ ...f, search: '' }))}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          )}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={LBL}>Category</label>
                <select value={filter.category} onChange={setF('category')} className={SEL}>
                  <option value="">All Categories</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className={LBL}>Sort By</label>
                <select value={filter.sort} onChange={setF('sort')} className={SEL}>
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className={LBL}>Product Type</label>
                <label className="flex items-center gap-2.5 cursor-pointer px-3 py-2.5 border border-gray-300 rounded-lg w-full hover:border-green-400 transition bg-white">
                  <input type="checkbox" checked={filter.organic}
                    onChange={e => setFilter(f => ({ ...f, organic: e.target.checked }))}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500" />
                  <span className="text-sm text-gray-700 font-medium">🌿 Organic Only</span>
                </label>
              </div>

              {/* Location divider */}
              <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
                <div className="flex-1 border-t border-gray-100" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">📍 Location</span>
                <div className="flex-1 border-t border-gray-100" />
              </div>

              <div>
                <label className={LBL}>City / Area</label>
                {cities.length > 0 ? (
                  <select value={filter.city} onChange={setF('city')} className={`${SEL} ${filter.city ? 'border-blue-400 bg-blue-50' : ''}`}>
                    <option value="">All Locations</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input type="text" value={filter.city} placeholder="Enter city or state…" onChange={setF('city')}
                    className={`${SEL} ${filter.city ? 'border-blue-400 bg-blue-50' : ''}`} />
                )}
                <p className="text-xs text-gray-400 mt-1">Shows nearby farmers first</p>
              </div>

              <div>
                <label className={LBL}>Quick Location</label>
                <label className={`flex items-center gap-2.5 cursor-pointer px-3 py-2.5 border rounded-lg w-full transition bg-white ${!user?.address?.city ? 'opacity-50 cursor-not-allowed border-gray-200' : 'border-gray-300 hover:border-blue-400'}`}>
                  <input type="checkbox" checked={filter.useMyLocation} disabled={!user?.address?.city}
                    onChange={e => setFilter(f => ({ ...f, useMyLocation: e.target.checked, city: e.target.checked ? (user?.address?.city || '') : '' }))}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                  <span className="text-sm text-gray-700 font-medium">
                    {user?.address?.city ? `📍 Use my city (${user.address.city})` : '📍 Set city in profile'}
                  </span>
                </label>
              </div>

              {/* Farmer divider */}
              <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-3">
                <div className="flex-1 border-t border-gray-100" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">🧑‍🌾 Farmer Filters</span>
                <div className="flex-1 border-t border-gray-100" />
              </div>

              <div>
                <label className={LBL}>Farmer Rank</label>
                <select value={filter.farmerRank} onChange={setF('farmerRank')} className={`${SEL} ${filter.farmerRank ? 'border-green-400 bg-green-50' : ''}`}>
                  {RANK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Based on trust score</p>
              </div>

              <div>
                <label className={LBL}>Farmer Min Rating</label>
                <select value={filter.farmerMinRating} onChange={setF('farmerMinRating')} className={`${SEL} ${filter.farmerMinRating ? 'border-green-400 bg-green-50' : ''}`}>
                  {MIN_RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">Avg customer review</p>
              </div>

              {/* Clear — label spacer aligns button with selects above */}
              <div>
                <label className={LBL}>&nbsp;</label>
                <button onClick={clearFilters}
                  className="w-full px-4 py-2.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 text-gray-600 font-medium rounded-lg text-sm transition-colors">
                  ✕ Clear All Filters
                </button>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-400 self-center">Active:</span>
                {filter.city       && <Chip label={`📍 ${filter.city}`} onRemove={() => setFilter(f => ({ ...f, city: '', useMyLocation: false }))} color="blue" />}
                {filter.farmerRank && <Chip label={`${RANK_CONFIG[filter.farmerRank]?.icon} ${RANK_CONFIG[filter.farmerRank]?.label}`} onRemove={() => setFilter(f => ({ ...f, farmerRank: '' }))} color="green" />}
                {filter.farmerMinRating && <Chip label={`⭐ ${filter.farmerMinRating}+ stars`} onRemove={() => setFilter(f => ({ ...f, farmerMinRating: '' }))} color="yellow" />}
                {filter.organic    && <Chip label="🌿 Organic only" onRemove={() => setFilter(f => ({ ...f, organic: false }))} color="green" />}
                {filter.category   && <Chip label={`${categories.find(c => c._id === filter.category)?.name || 'Category'}`} onRemove={() => setFilter(f => ({ ...f, category: '' }))} color="gray" />}
              </div>
            )}
          </div>
        )}

        {/* Location context bar */}
        {filter.city && !loading && (
          <div className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm">
            <span>📍</span>
            <span className="text-blue-800">
              Farmers near <strong>{filter.city}</strong> shown first.
              {stats.local > 0 ? ` ${stats.local} local listing${stats.local !== 1 ? 's' : ''} found.` : ' No farmers in this area yet.'}
            </span>
            <button onClick={() => setFilter(f => ({ ...f, city: '', useMyLocation: false }))}
              className="ml-auto text-blue-500 hover:text-blue-700 text-xs underline flex-shrink-0">Clear</button>
          </div>
        )}

        {/* Grid — skeleton on first load, subtle opacity while soft-loading */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-xl text-gray-600 mb-2">No products found</p>
            <p className="text-gray-400 text-sm mb-5">Try adjusting your filters or location</p>
            <button onClick={clearFilters} className="px-5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-medium">Clear Filters</button>
          </div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 transition-opacity duration-200 ${softLoading ? 'opacity-60' : 'opacity-100'}`}>
            {grouped.map(({ key, variants }) => (
              <ProductCard key={key} variants={variants} onAdd={handleAddToCart} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;
