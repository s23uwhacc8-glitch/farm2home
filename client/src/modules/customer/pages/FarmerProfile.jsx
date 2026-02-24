import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../../../core/config/axios';
import { useCart } from '../../../shared/contexts/CartContext';
import StarRating from '../../../shared/components/StarRating';
import { RANK_CONFIG, getTrustBadge } from '../../../shared/utils/farmerRank';

const TrustBar = ({ score }) => {
  const color = score >= 90 ? 'bg-purple-500' : score >= 75 ? 'bg-yellow-400' : score >= 60 ? 'bg-gray-400' : 'bg-orange-400';
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
    </div>
  );
};

const FarmerProfile = () => {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const { addToCart }  = useCart();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('products');
  const [toast,   setToast]   = useState('');

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const fetchFarmer = useCallback(async () => {
    try {
      const res = await axios.get(`/api/customer/farmers/${id}`);
      setData(res.data);
    } catch { setData(null); }
    finally  { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchFarmer(); }, [fetchFarmer]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-700 mb-3">Farmer not found</p>
        <button onClick={() => navigate('/products')} className="px-5 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">
          Back to Products
        </button>
      </div>
    </div>
  );

  const { farmer, products, reviews, stats } = data;
  const rk = RANK_CONFIG[stats.rank] || RANK_CONFIG.bronze;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium pointer-events-none">{toast}</div>}
      <div className="max-w-6xl mx-auto px-4">

        <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-800 mb-6 text-sm gap-1.5">
          ← Back
        </button>

        {/* Hero */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {farmer.profileImage ? (
                <img src={farmer.profileImage} alt={farmer.name}
                  className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-green-100" />
              ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-green-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-green-100">
                  {farmer.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{farmer.name}</h1>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold border ${rk.badgeColor}`}>
                  {rk.icon} {rk.label}
                </span>
                {stats.isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                    ✓ Verified Farmer
                  </span>
                )}
              </div>
              {farmer.farmerProfile?.farmName && <p className="text-green-700 font-semibold mb-1">🌾 {farmer.farmerProfile.farmName}</p>}
              {farmer.address?.city && <p className="text-gray-500 text-sm mb-3">📍 {farmer.address.city}, {farmer.address.state}</p>}
              {farmer.farmerProfile?.bio && <p className="text-gray-700 text-sm leading-relaxed max-w-2xl">{farmer.farmerProfile.bio}</p>}
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            {[
              { value: stats.avgRating.toFixed(1), label: 'Avg Rating',   color: 'text-green-700',  sub: <StarRating rating={stats.avgRating} size="sm" /> },
              { value: stats.totalReviews,          label: 'Reviews',      color: 'text-blue-600'    },
              { value: stats.totalProducts,         label: 'Products',     color: 'text-purple-600'  },
              { value: `${stats.fulfillmentRate}%`, label: 'Fulfillment',  color: 'text-orange-600'  },
            ].map(({ value, label, color, sub }) => (
              <div key={label} className="text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                {sub}
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Trust Score</span>
              <span className="font-bold text-gray-700">{stats.trustScore}/100</span>
            </div>
            <TrustBar score={stats.trustScore} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
          {[
            { id: 'products', label: `🌿 Products (${products.length})` },
            { id: 'reviews',  label: `⭐ Reviews (${reviews.length})`   },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-3.5 text-sm font-semibold transition border-b-2 ${
                tab === t.id ? 'border-green-600 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Products tab */}
        {tab === 'products' && (
          products.length === 0
            ? <div className="bg-white rounded-xl p-12 text-center text-gray-400">No active products right now.</div>
            : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {products.map(p => (
                  <div key={p._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden">
                    <Link to={`/products/${p._id}`}>
                      <img src={p.images?.[0] || 'https://via.placeholder.com/300x200?text=No+Image'}
                        alt={p.name} className="w-full h-44 object-cover" />
                    </Link>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-1">
                        <Link to={`/products/${p._id}`}>
                          <h3 className="font-semibold text-gray-800 hover:text-green-700 text-sm">{p.name}</h3>
                        </Link>
                        {p.isOrganic && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Organic</span>}
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        <StarRating rating={p.rating} size="xs" />
                        <span className="text-xs text-gray-400">({p.totalReviews})</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-green-700">₹{p.price}<span className="text-gray-400 font-normal text-xs">/{p.unit}</span></p>
                        <button onClick={() => { addToCart(p); showToast(`${p.name} added to cart!`); }} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
        )}

        {/* Reviews tab */}
        {tab === 'reviews' && (
          reviews.length === 0
            ? <div className="bg-white rounded-xl p-12 text-center text-gray-400">No reviews yet for this farmer's products.</div>
            : (
              <div className="space-y-4">
                {reviews.map((r, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {r.user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{r.user?.name || 'Customer'}</p>
                          <p className="text-xs text-gray-400">on <span className="text-green-700 font-medium">{r.productName}</span></p>
                        </div>
                      </div>
                      <div className="text-right">
                        <StarRating rating={r.rating} />
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-800 text-sm mb-1">{r.title}</p>
                    <p className="text-gray-600 text-sm">{r.comment}</p>
                    {(r.qualityRating || r.freshnessRating || r.valueRating) && (
                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        {r.qualityRating   && <span>Quality: <strong>{r.qualityRating}/5</strong></span>}
                        {r.freshnessRating && <span>Freshness: <strong>{r.freshnessRating}/5</strong></span>}
                        {r.valueRating     && <span>Value: <strong>{r.valueRating}/5</strong></span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
        )}

      </div>
    </div>
  );
};

export default FarmerProfile;
