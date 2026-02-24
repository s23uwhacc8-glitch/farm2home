import React, { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = [
  { value: 'customer', emoji: '🛒', label: 'Customer', desc: 'Buy fresh farm produce' },
  { value: 'farmer',   emoji: '🌾', label: 'Farmer',   desc: 'Sell your harvest directly' },
  { value: 'delivery', emoji: '🛵', label: 'Delivery', desc: 'Earn by delivering orders' },
];

const FARMER_DOCS = [
  { key: 'aadhaarPhoto',     label: 'Aadhaar Card',       icon: '🪪', required: true,  hint: 'Front side of your Aadhaar card' },
  { key: 'farmLicensePhoto', label: 'Farm / Land License', icon: '📋', required: true,  hint: 'Farm registration or land ownership doc' },
  { key: 'farmPhoto',        label: 'Farm Photo',          icon: '🌾', required: false, hint: 'A photo of your farm or fields (optional)' },
  { key: 'bankPassbook',     label: 'Bank Passbook',       icon: '🏦', required: false, hint: 'First page showing account details' },
];

const DELIVERY_DOCS = [
  { key: 'drivingLicensePhoto', label: 'Driving License', icon: '🪪', required: true,  hint: 'Valid DL, both sides preferred' },
  { key: 'aadhaarPhoto',        label: 'Aadhaar Card',    icon: '🪪', required: true,  hint: 'Front side of your Aadhaar card' },
  { key: 'vehiclePhoto',        label: 'Vehicle Photo',   icon: '🛵', required: false, hint: 'Clear photo of your delivery vehicle' },
  { key: 'rcBookPhoto',         label: 'RC Book',         icon: '📋', required: false, hint: 'Registration Certificate (optional)' },
];

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ─── DocUpload widget ─────────────────────────────────────────────────────────
const DocUpload = ({ meta, value, onChange }) => {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState('');

  const process = useCallback(async (file) => {
    setErr('');
    if (!file.type.startsWith('image/')) { setErr('Images only (JPG / PNG)'); return; }
    if (file.size > 3 * 1024 * 1024) { setErr('Max 3 MB per document'); return; }
    try { onChange(meta.key, await fileToBase64(file)); }
    catch { setErr('Could not read file, try again.'); }
  }, [meta.key, onChange]);

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) process(f);
  };

  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5">
        <span className="text-xs font-semibold text-gray-700">{meta.icon} {meta.label}</span>
        {meta.required
          ? <span className="text-xs font-bold text-red-500 ml-0.5">*</span>
          : <span className="text-xs text-gray-400 ml-1">(optional)</span>}
      </div>
      <div
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={[
          'relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all',
          value ? 'border-green-400 bg-green-50' :
          drag  ? 'border-green-400 bg-green-50/60' :
                  'border-dashed border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50/30'
        ].join(' ')}
      >
        {value ? (
          <>
            <img src={value} alt={meta.label} className="w-full h-28 object-cover" />
            <div className="absolute top-2 right-2 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow">✓</div>
            <button type="button"
              onClick={(e) => { e.stopPropagation(); onChange(meta.key, null); }}
              className="absolute top-2 left-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 shadow">
              ×
            </button>
            <div className="px-3 py-1.5 bg-white border-t border-green-100 flex items-center justify-between">
              <span className="text-xs text-green-700 font-semibold">Uploaded ✓</span>
              <span className="text-xs text-gray-400">Click to replace</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-5 px-3 gap-2 text-center">
            <svg className={['w-7 h-7 transition-colors', drag ? 'text-green-500' : 'text-gray-400'].join(' ')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-xs text-gray-500 font-medium">{drag ? 'Drop it here!' : 'Click or drag & drop'}</p>
            <p className="text-xs text-gray-400 leading-relaxed">{meta.hint}</p>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">JPG / PNG · max 3 MB</span>
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files[0]; if (f) process(f); e.target.value = ''; }} />
      </div>
      {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
    </div>
  );
};

// ─── Stepper ──────────────────────────────────────────────────────────────────
const Stepper = ({ steps, current }) => (
  <div className="flex items-center mb-8">
    {steps.map((label, i) => (
      <React.Fragment key={label}>
        <div className="flex flex-col items-center shrink-0">
          <div className={[
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
            i + 1 < current  ? 'bg-green-600 border-green-600 text-white' :
            i + 1 === current ? 'bg-white border-green-600 text-green-700 shadow-sm shadow-green-200' :
                                'bg-white border-gray-200 text-gray-400'
          ].join(' ')}>
            {i + 1 < current ? '✓' : i + 1}
          </div>
          <span className={['text-xs mt-1 font-semibold whitespace-nowrap', i + 1 <= current ? 'text-green-700' : 'text-gray-400'].join(' ')}>
            {label}
          </span>
        </div>
        {i < steps.length - 1 && (
          <div className={['flex-1 h-0.5 mt-[-10px] mx-2 transition-colors', i + 1 < current ? 'bg-green-500' : 'bg-gray-200'].join(' ')} />
        )}
      </React.Fragment>
    ))}
  </div>
);

const inp = 'w-full py-3 px-4 border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all';

const Field = ({ label, required, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
);

const EyeIcon = ({ open }) => open ? (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
) : (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Register = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'customer',
    farmName: '', farmSize: '', experience: '', bio: '', location: '',
    bankAccount: '', ifscCode: '', accountHolder: '',
    vehicleType: 'bike', vehicleNumber: '', drivingLicenseNumber: '', serviceCity: '',
  });
  const [profileImage, setProfileImage] = useState('');
  const profileImageRef = useRef();
  const [docs,    setDocs]    = useState({});
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const set = (f) => (e) => { setForm(p => ({ ...p, [f]: e.target.value })); if (error) setError(''); };
  const setDoc = useCallback((key, val) => setDocs(d => ({ ...d, [key]: val })), []);

  const isFarmer   = form.role === 'farmer';
  const isDelivery = form.role === 'delivery';
  const needsExtra = isFarmer || isDelivery;
  const docList    = isFarmer ? FARMER_DOCS : isDelivery ? DELIVERY_DOCS : [];
  const steps      = needsExtra
    ? ['Basic Info', isFarmer ? 'Farm Details' : 'Agent Details', 'Documents']
    : ['Basic Info'];

  const v1 = () => {
    if (form.name.trim().length < 2) return 'Full name must be at least 2 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.';
    if (!/^[6-9]\d{9}$/.test(form.phone)) return 'Enter a valid 10-digit Indian mobile number.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };
  const v2 = () => {
    if (isFarmer && !form.farmName.trim()) return 'Farm / business name is required.';
    if (isDelivery && !form.vehicleNumber.trim()) return 'Vehicle registration number is required.';
    if (isDelivery && !form.serviceCity.trim()) return 'At least one service city is required.';
    return null;
  };
  const v3 = () => {
    const missing = docList.filter(d => d.required && !docs[d.key]).map(d => d.label);
    return missing.length ? 'Required documents missing: ' + missing.join(', ') : null;
  };

  const next = () => {
    setError('');
    const err = step === 1 ? v1() : step === 2 ? v2() : null;
    if (err) { setError(err); return; }
    setStep(s => s + 1);
  };
  const back = () => { setError(''); setStep(s => s - 1); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const err = needsExtra ? v3() : v1();
    if (err) { setError(err); return; }
    setLoading(true);

    const payload = {
      name: form.name.trim(), email: form.email.trim().toLowerCase(),
      phone: form.phone, password: form.password, role: form.role,
      profileImage: profileImage || undefined,
    };

    if (isFarmer) {
      payload.farmerProfile = {
        farmName:   form.farmName.trim(),
        farmSize:   form.farmSize   ? parseFloat(form.farmSize)  : undefined,
        experience: form.experience ? parseInt(form.experience)  : undefined,
        bio:        form.bio.trim() || undefined,
        location:   form.location.trim() || undefined,
        documents:  form.bankAccount ? { bankDetails: {
          accountNumber: form.bankAccount.trim(),
          ifscCode: form.ifscCode.trim().toUpperCase(),
          accountHolderName: form.accountHolder.trim(),
        }} : undefined,
        verificationDocs: {
          aadhaarPhoto:     docs.aadhaarPhoto     || null,
          farmLicensePhoto: docs.farmLicensePhoto || null,
          farmPhoto:        docs.farmPhoto        || null,
          bankPassbook:     docs.bankPassbook     || null,
        },
      };
    }
    if (isDelivery) {
      payload.deliveryProfile = {
        vehicleType:    form.vehicleType,
        vehicleNumber:  form.vehicleNumber.trim().toUpperCase(),
        drivingLicense: form.drivingLicenseNumber.trim().toUpperCase() || undefined,
        serviceArea: { cities: form.serviceCity.split(',').map(c => c.trim()).filter(Boolean) },
        verificationDocs: {
          drivingLicensePhoto: docs.drivingLicensePhoto || null,
          aadhaarPhoto:        docs.aadhaarPhoto        || null,
          vehiclePhoto:        docs.vehiclePhoto        || null,
          rcBookPhoto:         docs.rcBookPhoto         || null,
        },
      };
    }

    const result = await register(payload);
    setLoading(false);
    if (result.success) {
      const role = result.user?.role || form.role;
      if (role === 'farmer') navigate('/farmer');
      else if (role === 'delivery') navigate('/delivery');
      else navigate('/products');
    } else {
      setError(result.message || 'Registration failed. Please try again.');
    }
  };

  const isLastStep = step === steps.length;

  return (
    <div className="min-h-screen flex">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-5/12 relative flex-col" style={{ background: '#071a0c' }}>
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=1400)', opacity: 0.4 }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(155deg,rgba(0,0,0,0.45) 0%,rgba(20,83,45,0.7) 55%,rgba(0,0,0,0.75) 100%)' }} />
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.svg" alt="Farm2Home" className="w-10 h-10" />
            <span className="text-white text-xl font-bold tracking-tight">Farm<span style={{ color: '#4ade80' }}>2</span>Home</span>
          </Link>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5"
              style={{ background: 'rgba(34,197,94,0.18)', color: '#86efac', border: '1px solid rgba(34,197,94,0.3)' }}>
              🤝 Join Our Community
            </div>
            <h2 className="text-4xl font-bold text-white leading-snug mb-4" style={{ fontFamily: "'Outfit', 'DM Sans', sans-serif" }}>
              Grow Together,<br />Eat Better
            </h2>
            <p className="text-base mb-10" style={{ color: 'rgba(255,255,255,0.72)', maxWidth: '320px' }}>
              Whether you're a customer, farmer, or delivery partner, there's a place for you at Farm2Home.
            </p>
            <div className="space-y-3">
              {[
                { icon: '✅', text: 'Free to join, no hidden fees' },
                { icon: '🔒', text: 'Your data is safe with us' },
                { icon: '🚀', text: needsExtra ? 'Verified within 24 hours' : 'Start in under 2 minutes' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="text-base">{icon}</span>
                  <span className="text-sm font-medium text-white">{text}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Supporting local farmers · Building community</p>
        </div>
      </div>

      {/* RIGHT — form panel */}
      <div className="flex-1 flex items-start justify-center bg-gray-50 px-6 py-10 lg:px-14 overflow-y-auto">
        <div className="w-full max-w-lg">

          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-green-600 font-medium mb-6 transition-colors group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          <div className="lg:hidden flex items-center gap-2 mb-6">
            <img src="/logo.svg" alt="Farm2Home" className="w-8 h-8" />
            <span className="text-green-700 text-lg font-bold">Farm<span className="text-green-500">2</span>Home</span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-1" style={{ fontFamily: "'Outfit', 'DM Sans', sans-serif" }}>
            Create your account
          </h1>
          <p className="text-gray-500 text-sm mb-7">
            Already have one?{' '}<Link to="/login" className="text-green-600 font-semibold hover:text-green-700">Sign in</Link>
          </p>

          {steps.length > 1 && <Stepper steps={steps} current={step} />}

          {error && (
            <div className="flex items-start gap-3 p-4 mb-5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <svg className="w-5 h-5 mt-0.5 shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* STEP 1: Basic Info */}
            {step === 1 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">I want to join as a…</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map(({ value, emoji, label, desc }) => (
                      <button key={value} type="button"
                        onClick={() => { setForm(f => ({ ...f, role: value })); setStep(1); }}
                        className={[
                          'flex flex-col items-center p-3 rounded-xl border-2 text-center transition-all duration-200',
                          form.role === value ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/50'
                        ].join(' ')}>
                        <span className="text-2xl mb-1">{emoji}</span>
                        <span className={['text-xs font-semibold', form.role === value ? 'text-green-700' : 'text-gray-700'].join(' ')}>{label}</span>
                        <span className="text-xs text-gray-400 mt-0.5 hidden sm:block">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="Full name" required>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </span>
                    <input type="text" placeholder="Your full name" value={form.name} onChange={set('name')} autoComplete="name" className={inp + ' pl-11'} />
                  </div>
                </Field>

                <Field label="Email address" required>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </span>
                    <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoComplete="email" className={inp + ' pl-11'} />
                  </div>
                </Field>

                <Field label="Phone number" required>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </span>
                    <input type="tel" placeholder="10-digit mobile number" value={form.phone} onChange={set('phone')} autoComplete="tel" className={inp + ' pl-11'} />
                  </div>
                </Field>

                <Field label="Password" required>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </span>
                    <input type={showPw ? 'text' : 'password'} placeholder="Min 6 characters" value={form.password} onChange={set('password')} autoComplete="new-password" className={inp + ' pl-11 pr-11'} />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600">
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                </Field>

                <Field label="Confirm password" required>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 pointer-events-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </span>
                    <input type="password" placeholder="Repeat your password" value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" className={inp + ' pl-11'} />
                  </div>
                </Field>

                {needsExtra && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo <span className="text-gray-400 font-normal">(optional)</span></label>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-green-100 to-emerald-200 flex-shrink-0 flex items-center justify-center border-2 border-gray-200">
                        {profileImage
                          ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                          : <span className="text-2xl">👤</span>}
                      </div>
                      <div
                        onClick={() => profileImageRef.current?.click()}
                        className="flex-1 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50/40 cursor-pointer transition-all px-4 py-3 text-center">
                        <p className="text-sm text-gray-500">{profileImage ? 'Click to replace photo' : 'Click to upload a profile photo'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">JPG / PNG · max 2 MB</p>
                        {profileImage && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); setProfileImage(''); }}
                            className="mt-1 text-xs text-red-500 hover:text-red-700 underline">Remove</button>
                        )}
                      </div>
                      <input ref={profileImageRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => {
                          const f = e.target.files[0]; if (!f) return;
                          if (!f.type.startsWith('image/') || f.size > 2*1024*1024) return;
                          const r = new FileReader(); r.onloadend = () => setProfileImage(r.result); r.readAsDataURL(f);
                          e.target.value = '';
                        }} />
                    </div>
                  </div>
                )}

                {needsExtra && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                    <strong>⏳ Approval required</strong> — {isFarmer ? 'Farmer' : 'Delivery agent'} accounts are reviewed
                    by our admin team. Provide profile details and verification documents in the next two steps.
                    Approval usually takes within 24 hours.
                  </div>
                )}
              </>
            )}

            {/* STEP 2: Farm details */}
            {step === 2 && isFarmer && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
                  🌾 Tell us about your farm so customers know who they're buying from.
                </div>
                <Field label="Farm / Business Name" required>
                  <input type="text" placeholder="e.g. Rajan's Organic Farm" value={form.farmName} onChange={set('farmName')} className={inp} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Farm Size (acres)">
                    <input type="number" min="0" step="0.1" placeholder="e.g. 5.5" value={form.farmSize} onChange={set('farmSize')} className={inp} />
                  </Field>
                  <Field label="Years of Experience">
                    <input type="number" min="0" max="60" placeholder="e.g. 12" value={form.experience} onChange={set('experience')} className={inp} />
                  </Field>
                </div>
                <Field label="Farm Location / Village" hint="City or village where your farm is located">
                  <input type="text" placeholder="e.g. Nashik, Maharashtra" value={form.location} onChange={set('location')} className={inp} />
                </Field>
                <Field label="Bio / About Your Farm" hint="Describe what you grow, your farming practices, etc.">
                  <textarea rows={3} placeholder="We grow certified organic vegetables using traditional methods..." value={form.bio} onChange={set('bio')} className={inp + ' resize-none'} />
                </Field>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Bank Details (Optional)</p>
                  <p className="text-xs text-gray-500 mb-4">Provide your bank details so we can process commission payouts directly to your account.</p>
                  <div className="space-y-3">
                    <Field label="Account Holder Name">
                      <input type="text" placeholder="Name as per bank records" value={form.accountHolder} onChange={set('accountHolder')} className={inp} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Account Number">
                        <input type="text" placeholder="XXXX XXXX XXXX" value={form.bankAccount} onChange={set('bankAccount')} className={inp} />
                      </Field>
                      <Field label="IFSC Code">
                        <input type="text" placeholder="e.g. SBIN0001234" value={form.ifscCode} onChange={set('ifscCode')} className={inp} style={{ textTransform: 'uppercase' }} />
                      </Field>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: Delivery agent details */}
            {step === 2 && isDelivery && (
              <>
                <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-sm text-sky-800">
                  🛵 Tell us about your vehicle and service area.
                </div>
                <Field label="Vehicle Type" required>
                  <select value={form.vehicleType} onChange={set('vehicleType')} className={inp}>
                    {[['bike','Motorcycle / Bike'],['scooter','Scooter'],['bicycle','Bicycle'],['van','Van'],['truck','Truck']].map(([v,l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Vehicle Reg. Number" required hint="e.g. MH12AB1234">
                    <input type="text" placeholder="MH 12 AB 1234" value={form.vehicleNumber} onChange={set('vehicleNumber')} className={inp} style={{ textTransform: 'uppercase' }} />
                  </Field>
                  <Field label="Driving License No." hint="e.g. MH0020130012345">
                    <input type="text" placeholder="DL number" value={form.drivingLicenseNumber} onChange={set('drivingLicenseNumber')} className={inp} style={{ textTransform: 'uppercase' }} />
                  </Field>
                </div>
                <Field label="Service Cities" required hint="Separate multiple cities with commas: Mumbai, Thane, Navi Mumbai">
                  <input type="text" placeholder="e.g. Mumbai, Thane" value={form.serviceCity} onChange={set('serviceCity')} className={inp} />
                </Field>
              </>
            )}

            {/* STEP 3: Documents */}
            {step === 3 && (
              <>
                <div className={['rounded-xl px-4 py-3 text-sm border',
                  isFarmer ? 'bg-green-50 border-green-200 text-green-800' : 'bg-sky-50 border-sky-200 text-sky-800'
                ].join(' ')}>
                  <strong>📄 Upload Verification Documents</strong>
                  <p className="mt-1 text-xs opacity-80">
                    These documents are reviewed only by Farm2Home admins to verify your identity and credentials.
                    Required documents are marked with <span className="text-red-500 font-bold">*</span>.
                    Images must be clear and readable — max 3 MB each.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {docList.map(meta => (
                    <DocUpload key={meta.key} meta={meta} value={docs[meta.key] || null} onChange={setDoc} />
                  ))}
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-600">
                  🔒 Your documents are stored securely and used only for account verification. They are never shared with third parties.
                </div>
              </>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <button type="button" onClick={back}
                  className="flex-1 py-3.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all">
                  ← Back
                </button>
              )}

              {isLastStep ? (
                <button type="submit" disabled={loading}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-white text-base shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating account…
                    </span>
                  ) : `Create ${ROLES.find(r => r.value === form.role)?.label} Account →`}
                </button>
              ) : (
                <button type="button" onClick={next}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-white text-base shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>
                  Continue →
                </button>
              )}
            </div>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-green-600 font-semibold hover:text-green-700">Sign in</Link>
          </p>
          <p className="text-center text-xs text-gray-400 mt-4 leading-relaxed">
            By creating an account you agree to our{' '}
            <span className="underline cursor-pointer hover:text-gray-600">Terms of Service</span>
            {' '}and{' '}
            <span className="underline cursor-pointer hover:text-gray-600">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
