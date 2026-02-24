import React from 'react';
import { Link } from 'react-router-dom';

const Welcome = () => {
  return (
    <div className="min-h-screen">

      {/* ── HERO SECTION ── full-screen, nav floats above it */}
      <div
        className="relative h-screen bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2832)',
        }}
      >
        {/* Enhanced dark overlay with gradient */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(150deg,rgba(0,0,0,0.5) 0%,rgba(20,83,45,0.65) 55%,rgba(0,0,0,0.7) 100%)' }}></div>

        <div className="relative z-10 flex items-center justify-start h-full px-8 md:px-16 lg:px-24">
          <div className="max-w-2xl">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{ background: 'rgba(34,197,94,0.18)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' }}
            >
              🌱 Farm Fresh · Delivered Daily
            </div>
            <h1
              className="text-5xl md:text-6xl font-bold text-white mb-5 drop-shadow-lg leading-tight"
              style={{ fontFamily: "'Outfit', 'DM Sans', sans-serif" }}
            >
              From Field<br />
              to Your Table
            </h1>
            <p className="text-xl md:text-2xl mb-10 drop-shadow-md" style={{ color: 'rgba(255,255,255,0.72)', maxWidth: '520px' }}>
              Connecting you directly with local farmers — fresher produce, fair prices, full transparency.
            </p>

            {/* Modern gradient buttons matching Login page */}
            <div className="flex flex-wrap gap-4">
              <Link
                to="/products"
                className="inline-block px-10 py-4 rounded-xl font-semibold text-white text-base
                  shadow-lg hover:shadow-xl transition-all duration-200
                  hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
                style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}
              >
                Explore Products →
              </Link>
              <Link
                to="/register"
                className="inline-block px-10 py-4 rounded-xl font-semibold text-white text-base
                  border-2 border-white/30 backdrop-blur-sm
                  hover:border-green-400 hover:bg-white/10
                  transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                Become a Farmer
              </Link>
            </div>
            
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3 mt-10 max-w-md">
              {[
                { v: '500+', l: 'Local Farmers' },
                { v: '4.8★', l: 'Avg. Rating' },
                { v: '24hr', l: 'Delivery' },
              ].map(({ v, l }) => (
                <div
                  key={l}
                  className="p-4 rounded-xl backdrop-blur-sm"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)' }}
                >
                  <div className="text-xl font-bold mb-0.5" style={{ color: '#4ade80' }}>{v}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.52)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-1 text-white opacity-60">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Outfit', 'DM Sans', sans-serif" }}>How It Works</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">Simple steps to get fresh produce from local farms to your doorstep</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                title: 'Farmers List',
                desc: 'Local farmers list their fresh produce on our platform with transparent pricing',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
              },
              {
                step: 2,
                title: 'You Order',
                desc: 'Browse and order fresh products directly from farmers with easy checkout',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />,
              },
              {
                step: 3,
                title: 'We Deliver',
                desc: 'Fast and reliable delivery right to your doorstep with real-time tracking',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />,
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="text-center group">
                <div className="mb-6 flex justify-center">
                  <div
                    className="w-24 h-24 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}
                  >
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {icon}
                    </svg>
                  </div>
                </div>
                <div
                  className="w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center mx-auto mb-4"
                  style={{ background: '#dcfce7', color: '#15803d' }}
                >
                  {step}
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY FARM2HOME ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: "'Outfit', 'DM Sans', sans-serif" }}>Why Farm2Home?</h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">We're committed to bringing you the best farm-fresh experience</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Fresh Produce',
                desc: 'Farm-fresh produce and dairy delivered within 24 hours of harvest',
                icon: (
                  <svg className="w-10 h-10" style={{ color: '#16a34a' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                ),
              },
              {
                title: 'Fair Pricing',
                desc: 'Transparent pricing that ensures fair compensation for farmers',
                icon: (
                  <svg className="w-10 h-10" style={{ color: '#16a34a' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 11.219 12.768 11 12 11c-.768 0-1.536-.219-2.121-.659-1.172-.879-1.172-2.303 0-3.182.879-.659 2.07-.879 3.121-.879.793 0 1.5.121 2.121.659" />
                  </svg>
                ),
              },
              {
                title: 'Full Transparency',
                desc: 'Complete supply chain visibility — know exactly where your food comes from',
                icon: (
                  <svg className="w-10 h-10" style={{ color: '#16a34a' }} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                ),
              },
            ].map(({ title, desc, icon }) => (
              <div
                key={title}
                className="bg-white p-8 rounded-2xl border-2 border-gray-100 text-center 
                  transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-green-200"
              >
                <div className="mb-6 flex justify-center">
                  <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center">
                    {icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-4 text-gray-900">{title}</h3>
                <p className="text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DELIVERY AGENT SECTION ── */}
      <section className="py-24 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #14532d 60%, #052e16 100%)' }}
        />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #22c55e, transparent)' }} />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #22c55e, transparent)' }} />

        <div className="relative max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">

            {/* Left: Text */}
            <div>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
                style={{ background: 'rgba(34,197,94,0.2)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' }}
              >
                <span>🛵</span> Now Hiring Delivery Agents
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Earn on Your <br />
                <span style={{ color: '#4ade80' }}>Own Schedule</span>
              </h2>
              <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Looking for a flexible part-time opportunity? Join our growing network of delivery agents and earn money with every delivery you make — no fixed hours, no pressure. Deliver farm-fresh produce to happy customers and get paid per drop.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-10">
                {[
                  { icon: '💰', label: 'Earn Per Delivery' },
                  { icon: '🕐', label: 'Flexible Hours' },
                  { icon: '📍', label: 'Local Routes' },
                  { icon: '⚡', label: 'Weekly Payouts' },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-white font-medium text-sm">{label}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/register"
                className="inline-block px-10 py-4 rounded-xl font-semibold text-white text-base
                  shadow-lg hover:shadow-xl transition-all duration-200
                  hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
                style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}
              >
                Apply Now →
              </Link>
            </div>

            {/* Right: Stats */}
            <div className="grid grid-cols-2 gap-5">
              {[
                { value: '500+', label: 'Active Agents', sub: 'Across the region' },
                { value: '₹800', label: 'Avg. Daily Earn', sub: 'Per agent per day' },
                { value: '4.8★', label: 'Agent Rating', sub: 'Customer satisfaction' },
                { value: '2 hrs', label: 'Onboarding', sub: 'Get started quickly' },
              ].map(({ value, label, sub }) => (
                <div
                  key={label}
                  className="p-6 rounded-2xl transition-all duration-300 hover:scale-105"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  <div className="text-3xl font-bold mb-1" style={{ color: '#4ade80' }}>{value}</div>
                  <div className="text-white font-semibold text-sm mb-1">{label}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ── */}
      <section className="py-24 text-white" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: "'Outfit', 'DM Sans', sans-serif" }}>
            Ready to get started?
          </h2>
          <p className="text-xl mb-10" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Join thousands of customers enjoying farm-fresh produce delivered daily
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/products"
              className="inline-block px-12 py-4 rounded-xl font-bold text-green-600 bg-white
                shadow-lg hover:shadow-xl transition-all duration-200
                hover:-translate-y-0.5 active:translate-y-0"
            >
              Start Shopping →
            </Link>
            <Link
              to="/register"
              className="inline-block px-12 py-4 rounded-xl font-bold text-white
                border-2 border-white/30 backdrop-blur-sm
                hover:border-white hover:bg-white/10
                transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Welcome;
