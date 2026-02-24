import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../../../core/config/axios';
import { useCart } from '../../../shared/contexts/CartContext';
import { useAuth } from '../../../shared/contexts/AuthContext';
import StarRating from '../../../shared/components/StarRating';
import { RANK_CONFIG, getTrustBadge } from '../../../shared/utils/farmerRank';

const ClickableStars = ({ value, onChange, label }) => (
  <div>
    {label && <p className="text-xs text-gray-500 mb-1">{label}</p>}
    <div className="flex gap-1 text-2xl">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className={`transition-transform hover:scale-110 ${s <= value ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
      ))}
    </div>
  </div>
);

const RatingBar = ({ label, count, total }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="w-8 text-right text-gray-500">{label}★</span>
    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${total > 0 ? Math.round(count / total * 100) : 0}%` }} />
    </div>
    <span className="w-6 text-gray-400">{count}</span>
  </div>
);

const EMPTY_REVIEW = { rating: 0, title: '', comment: '', qualityRating: 0, freshnessRating: 0, valueRating: 0 };


// ── Price Sparkline + Market Comparison ──────────────────────────────────────
const PriceTrendCard = ({ priceData, currentPrice, unit, navigate }) => {
  const history     = priceData?.priceHistory || [];
  const competitors = priceData?.competitors  || [];
  const [hoverIdx, setHoverIdx] = useState(null);

  const renderSparkline = () => {
    if (history.length < 2) return null;
    const prices = history.map(h => h.price);
    const min    = Math.min(...prices);
    const max    = Math.max(...prices);
    const range  = max - min || 1;
    const W = 400, H = 90, padX = 8, padY = 12;

    const pts = history.map((h, i) => ({
      x: padX + (i / (history.length - 1)) * (W - padX * 2),
      y: H - padY - ((h.price - min) / range) * (H - padY * 2),
      price: h.price,
      date: h.date,
    }));

    const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const fillD = `${lineD} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;

    const trend     = prices[prices.length - 1] - prices[0];
    const color     = trend >= 0 ? '#16a34a' : '#dc2626';
    const fillC     = trend >= 0 ? '#dcfce7' : '#fee2e2';
    const avg       = prices.reduce((s, p) => s + p, 0) / prices.length;
    const buySignal = currentPrice <= avg * 1.05;

    const hovered = hoverIdx !== null ? pts[hoverIdx] : null;

    return (
      <div>
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">6-month price history</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black" style={{ color }}>
                ₹{hovered ? hovered.price : currentPrice}
                <span className="text-sm font-normal text-gray-400">/{unit}</span>
              </span>
              {!hovered && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {trend >= 0 ? '↑' : '↓'} ₹{Math.abs(trend).toFixed(0)} vs 6 months ago
                </span>
              )}
              {hovered && (
                <span className="text-xs text-gray-400">
                  {new Date(hovered.date).toLocaleString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          {buySignal && !hovered && (
            <div className="text-right">
              <span className="inline-flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                ✓ Good time to buy
              </span>
              <p className="text-xs text-gray-400 mt-1">Price near 6-month low</p>
            </div>
          )}
        </div>

        {/* SVG Chart */}
        <div className="relative select-none">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full cursor-crosshair"
            style={{ height: 90 }}
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
            {/* Gradient fill */}
            <defs>
              <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={fillD} fill="url(#spark-fill)" />
            <path d={lineD} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

            {/* Hover vertical line + dot */}
            {hovered && (
              <>
                <line x1={hovered.x} x2={hovered.x} y1={padY} y2={H} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <circle cx={hovered.x} cy={hovered.y} r="5" fill="white" stroke={color} strokeWidth="2.5" />
                <circle cx={hovered.x} cy={hovered.y} r="2.5" fill={color} />
              </>
            )}

            {/* End dot (when not hovering) */}
            {!hovered && (
              <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r="4" fill={color} />
            )}

            {/* Min/Max labels */}
            <text x={padX} y={H - 2} fontSize="8" fill="#9ca3af">₹{min}</text>
            <text x={W - padX} y={H - 2} fontSize="8" fill="#9ca3af" textAnchor="end">
              {hovered ? `₹${hovered.price}` : `Now ₹${currentPrice}`}
            </text>
          </svg>
        </div>

        {/* Month labels */}
        <div className="flex justify-between mt-1">
          {history.map((h, i) => (
            <span key={i} className={`text-xs transition-colors ${i === hoverIdx ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
              {new Date(h.date).toLocaleString('en-IN', { month: 'short' })}
            </span>
          ))}
        </div>

        {/* Tip banner */}
        <div className={`mt-3 px-3 py-2 rounded-lg text-sm ${buySignal ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
          {buySignal
            ? `💡 Prices are at a seasonal low. Consider buying in bulk to stock up.`
            : `⏳ Prices are above the 6-month average (₹${avg.toFixed(0)}/${unit}). You may want to wait or buy smaller quantities.`}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-5">📈 Price Trend & Market</h2>
      <div className="grid md:grid-cols-2 gap-8">
        {/* Sparkline */}
        <div>
          {history.length >= 2
            ? renderSparkline()
            : <div className="text-center py-8 text-gray-400"><p className="text-3xl mb-2">📊</p><p className="text-sm">Not enough price history yet</p></div>
          }
        </div>

        {/* Competitor prices */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Other farmers selling this product</p>
          {competitors.length === 0
            ? <p className="text-gray-400 text-sm">Only one farmer is currently selling this product.</p>
            : (
              <div className="space-y-2">
                {/* Current listing */}
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                  <div className="flex-1">
                    <p className="text-xs text-green-600 font-semibold">This listing</p>
                  </div>
                  <span className="font-bold text-green-700">₹{currentPrice}<span className="text-xs font-normal text-green-600">/{unit}</span></span>
                </div>

                {competitors.map((c, i) => {
                  const cheaper = c.price < currentPrice;
                  const dearer  = c.price > currentPrice;
                  return (
                    <button
                      key={i}
                      onClick={() => navigate(`/products/${c.productId}`)}
                      className="w-full flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5 hover:bg-green-50 hover:border-green-200 transition-all group cursor-pointer text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate group-hover:text-green-700 transition-colors">{c.farmerName}</p>
                        {c.isOrganic && <span className="text-xs text-green-600">🌿 Organic</span>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-gray-800">₹{c.price}<span className="text-xs font-normal text-gray-500">/{unit}</span></span>
                        {cheaper && <p className="text-xs text-red-500">₹{(currentPrice - c.price).toFixed(0)} cheaper</p>}
                        {dearer  && <p className="text-xs text-green-600">₹{(c.price - currentPrice).toFixed(0)} dearer</p>}
                      </div>
                      <span className="text-gray-300 group-hover:text-green-500 transition-colors text-lg">→</span>
                    </button>
                  );
                })}
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
};

const ProductDetail = () => {
  const { id }         = useParams();
  const navigate       = useNavigate();
  const { addToCart }  = useCart();
  const { user }       = useAuth();

  const [product,   setProduct]   = useState(null);
  const [quantity,  setQuantity]  = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [toast,     setToast]     = useState('');

  const [priceData,         setPriceData]         = useState(null);

  const [showReviewForm,    setShowReviewForm]    = useState(false);
  const [reviewSubmitting,  setReviewSubmitting]  = useState(false);
  const [reviewError,       setReviewError]       = useState('');
  const [reviewSuccess,     setReviewSuccess]     = useState('');
  const [review,            setReview]            = useState(EMPTY_REVIEW);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2200); };
  const setR = key => v  => setReview(r => ({ ...r, [key]: v }));

  const fetchProduct = useCallback(async () => {
    try {
      const res = await axios.get(`/api/customer/products/${id}`);
      setProduct(res.data.product);
    } catch { setProduct(null); }
    finally  { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  useEffect(() => {
    if (!id) return;
    axios.get(`/api/customer/products/${id}/price-history`)
      .then(r => setPriceData(r.data))
      .catch(() => {});
  }, [id]);

  const handleSubmitReview = async e => {
    e.preventDefault();
    setReviewError(''); setReviewSuccess('');
    if (!review.rating)         return setReviewError('Please select a star rating');
    if (!review.title.trim())   return setReviewError('Please enter a review title');
    if (!review.comment.trim()) return setReviewError('Please enter a comment');

    setReviewSubmitting(true);
    try {
      const payload = { rating: review.rating, title: review.title.trim(), comment: review.comment.trim() };
      if (review.qualityRating)   payload.qualityRating   = review.qualityRating;
      if (review.freshnessRating) payload.freshnessRating = review.freshnessRating;
      if (review.valueRating)     payload.valueRating     = review.valueRating;

      const res = await axios.post(`/api/customer/products/${id}/review`, payload);
      setProduct(res.data.product);
      setReviewSuccess('Review submitted! Thank you.');
      setReview(EMPTY_REVIEW);
      setShowReviewForm(false);
    } catch (err) {
      setReviewError(err.response?.data?.message || 'Failed to submit review');
    } finally { setReviewSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" /></div>;
  if (!product) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-700 mb-4">Product not found</p>
        <button onClick={() => navigate('/products')} className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700">Back to Products</button>
      </div>
    </div>
  );

  const images          = product.images?.length ? product.images : [product.image].filter(Boolean);
  const rk              = RANK_CONFIG[getTrustBadge(product.farmer?.farmerProfile?.trustScore)];
  const totalReviews    = product.totalReviews || 0;
  const dist            = product.ratingDistribution || {};
  const approvedReviews = (product.reviews || []).filter(r => r.status !== 'rejected');
  const alreadyReviewed = user && approvedReviews.some(r => r.user?._id === user._id || r.user === user._id);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      {toast && <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-medium">{toast}</div>}

      <div className="max-w-6xl mx-auto px-4">
        <button onClick={() => navigate('/products')} className="flex items-center text-gray-500 hover:text-gray-800 mb-6 text-sm gap-1.5">← Back to Products</button>

        {/* Product card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="grid md:grid-cols-2">
            {/* Images */}
            <div className="p-4 md:p-6">
              <div className="rounded-xl overflow-hidden bg-gray-50 mb-3">
                <img src={images[activeImg] || 'https://placehold.co/600x400?text=No+Image'} alt={product.name}
                  className="w-full h-72 md:h-96 object-cover" />
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${i === activeImg ? 'border-green-500' : 'border-transparent'}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap gap-2 mb-3">
                {product.isOrganic && <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-semibold">🌿 Organic</span>}
                {product.category?.name && <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">{product.category.name}</span>}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>

              <div className="flex items-center gap-2 mb-4">
                <StarRating rating={product.rating} size="xl" />
                <span className="text-lg font-bold text-gray-700">{product.rating.toFixed(1)}</span>
                <span className="text-gray-400 text-sm">({totalReviews} review{totalReviews !== 1 ? 's' : ''})</span>
              </div>

              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold text-green-700">₹{product.price}</span>
                <span className="text-gray-500">per {product.unit}</span>
                {product.compareAtPrice > product.price && <span className="text-gray-400 line-through">₹{product.compareAtPrice}</span>}
              </div>

              <p className="text-gray-600 text-sm leading-relaxed mb-5">{product.description}</p>

              {product.stock > 0 ? (
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                    <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-3 py-2 text-gray-600 hover:bg-gray-100 text-lg">−</button>
                    <span className="px-4 py-2 font-semibold text-gray-800 min-w-12 text-center">{quantity}</span>
                    <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="px-3 py-2 text-gray-600 hover:bg-gray-100 text-lg">+</button>
                  </div>
                  <button onClick={() => { addToCart(product, quantity); showToast(`${quantity} × ${product.name} added!`); }}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition">
                    Add to Cart  ₹{(product.price * quantity).toFixed(0)}
                  </button>
                </div>
              ) : (
                <div className="mb-5 py-3 bg-red-50 text-red-600 text-center rounded-xl font-semibold text-sm">Out of Stock</div>
              )}

              <p className="text-xs text-gray-400 mb-3">Stock: {product.stock} {product.unit}</p>

              {/* ── Review prompt (right below cart, highly visible) ── */}
              {user && user.role === 'customer' && !alreadyReviewed && (
                <button
                  onClick={() => {
                    setShowReviewForm(true);
                    setTimeout(() => document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' }), 50);
                  }}
                  className="w-full mb-5 py-2.5 border-2 border-dashed border-green-300 text-green-700 font-semibold rounded-xl hover:bg-green-50 hover:border-green-500 transition text-sm flex items-center justify-center gap-2"
                >
                  ✏️ Rate &amp; Review this Product
                </button>
              )}
              {alreadyReviewed && (
                <div className="w-full mb-5 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm text-center font-medium">
                  ✓ You've already reviewed this product
                </div>
              )}
              {!user && (
                <a href="/login"
                  className="w-full mb-5 py-2.5 border-2 border-dashed border-gray-200 text-gray-500 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition text-sm flex items-center justify-center gap-2 block text-center">
                  Log in to rate &amp; review
                </a>
              )}

              {/* Farmer card */}
              {product.farmer && (
                <Link to={`/farmers/${product.farmer._id}`}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition group">
                  <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {product.farmer.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800 group-hover:text-green-700 transition">{product.farmer.name}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${rk.badgeColor}`}>
                        {rk.icon} {rk.label}
                      </span>
                      {product.farmer.farmerProfile?.isVerified && <span className="text-xs text-blue-600 font-semibold">✓ Verified</span>}
                    </div>
                    {product.farmer.farmerProfile?.farmName && <p className="text-sm text-gray-500">{product.farmer.farmerProfile.farmName}</p>}
                    {product.farmer.farmerProfile?.rating > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <StarRating rating={product.farmer.farmerProfile.rating} />
                        <span className="text-xs text-gray-400">({product.farmer.farmerProfile.totalReviews} reviews)</span>
                      </div>
                    )}
                  </div>
                  <span className="text-gray-400 group-hover:text-green-600 text-sm">→</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ── Price Trend & Market Comparison ── */}
        {priceData && (priceData.priceHistory?.length > 0 || priceData.competitors?.length > 0) && (
          <PriceTrendCard priceData={priceData} currentPrice={product.price} unit={product.unit} navigate={navigate} />
        )}

        {/* Reviews */}
        <div id="reviews-section" className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
          <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
            <h2 className="text-xl font-bold text-gray-900">Customer Reviews <span className="text-gray-400 font-normal text-base">({approvedReviews.length})</span></h2>
            {user && user.role === 'customer' && !alreadyReviewed && (
              <button onClick={() => setShowReviewForm(v => !v)}
                className="px-5 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 text-sm transition shadow-sm">✏️ Write a Review</button>
            )}
            {alreadyReviewed && <span className="text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-xl">✓ You reviewed this</span>}
            {!user && <Link to="/login" className="text-sm text-green-700 hover:underline">Log in to write a review</Link>}
          </div>

          {/* Rating summary */}
          {totalReviews > 0 && (
            <div className="flex flex-col sm:flex-row gap-6 p-5 bg-gray-50 rounded-xl mb-6">
              <div className="text-center sm:w-36">
                <p className="text-5xl font-black text-gray-900">{product.rating.toFixed(1)}</p>
                <StarRating rating={product.rating} size="lg" />
                <p className="text-xs text-gray-400 mt-1">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5,4,3,2,1].map(n => <RatingBar key={n} label={n} count={dist[n] || 0} total={totalReviews} />)}
              </div>
            </div>
          )}

          {reviewSuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-5">{reviewSuccess}</div>}

          {/* Review form */}
          {showReviewForm && (
            <form onSubmit={handleSubmitReview} className="border border-green-200 bg-green-50 rounded-2xl p-5 mb-6">
              <h3 className="font-bold text-gray-800 mb-4">Your Review</h3>
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Overall Rating <span className="text-red-500">*</span></p>
                <ClickableStars value={review.rating} onChange={setR('rating')} />
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <ClickableStars label="Quality"   value={review.qualityRating}   onChange={setR('qualityRating')} />
                <ClickableStars label="Freshness" value={review.freshnessRating} onChange={setR('freshnessRating')} />
                <ClickableStars label="Value"     value={review.valueRating}     onChange={setR('valueRating')} />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                  <input type="text" value={review.title} maxLength={100}
                    onChange={e => setReview(r => ({ ...r, title: e.target.value }))}
                    placeholder="Summarise your experience"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Comment <span className="text-red-500">*</span></label>
                  <textarea value={review.comment} maxLength={1000} rows={4}
                    onChange={e => setReview(r => ({ ...r, comment: e.target.value }))}
                    placeholder="Tell others about quality, freshness, delivery…"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
                </div>
              </div>
              {reviewError && <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{reviewError}</div>}
              <div className="flex gap-3 mt-4">
                <button type="submit" disabled={reviewSubmitting}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">
                  {reviewSubmitting ? 'Submitting…' : 'Submit Review'}
                </button>
                <button type="button" onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          )}

          {/* Review list */}
          {approvedReviews.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-3">💬</p>
              <p>No reviews yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-5">
              {approvedReviews.map((r, i) => (
                <div key={i} className="border-b border-gray-100 pb-5 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {r.user?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{r.user?.name || 'Customer'}</p>
                        <div className="flex items-center gap-2">
                          <StarRating rating={r.rating} />
                          {r.isVerifiedPurchase && <span className="text-xs text-green-600 font-semibold">✓ Verified Purchase</span>}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-800 text-sm mb-1">{r.title}</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{r.comment}</p>
                  {(r.qualityRating || r.freshnessRating || r.valueRating) && (
                    <div className="flex flex-wrap gap-3 mt-2">
                      {r.qualityRating   && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">Quality: <strong>{r.qualityRating}/5</strong></span>}
                      {r.freshnessRating && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">Freshness: <strong>{r.freshnessRating}/5</strong></span>}
                      {r.valueRating     && <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">Value: <strong>{r.valueRating}/5</strong></span>}
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

export default ProductDetail;
