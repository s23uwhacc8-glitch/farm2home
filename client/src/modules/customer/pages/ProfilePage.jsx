import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../../../core/config/axios';
import { useAuth } from '../../../shared/contexts/AuthContext';

// ─── Profile Image Upload ──────────────────────────────────────────────────────
const ProfileImageUpload = ({ value, onChange }) => {
  const ref = useRef();
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);

  const process = useCallback(async (file) => {
    setErr('');
    if (!file.type.startsWith('image/')) { setErr('Images only (JPG / PNG / WEBP)'); return; }
    if (file.size > 2 * 1024 * 1024) { setErr('Max 2 MB for profile photo'); return; }
    const reader = new FileReader();
    reader.onloadend = () => onChange({ target: { name: 'profileImage', value: reader.result } });
    reader.onerror = () => setErr('Could not read file, try again.');
    reader.readAsDataURL(file);
  }, [onChange]);

  const onDrop = (e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) process(f); };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Profile Photo</label>
      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-green-100 to-emerald-200 border-2 border-gray-200 flex items-center justify-center">
          {value
            ? <img src={value} alt="Profile" className="w-full h-full object-cover" />
            : <span className="text-3xl">👤</span>}
        </div>
        {/* Drop zone */}
        <div
          onClick={() => ref.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={`flex-1 rounded-xl border-2 cursor-pointer transition-all p-4 text-center ${
            drag ? 'border-green-400 bg-green-50' : 'border-dashed border-gray-300 bg-gray-50 hover:border-green-400 hover:bg-green-50/40'
          }`}>
          <p className="text-sm font-medium text-gray-600">{value ? 'Click or drag to replace photo' : 'Click or drag & drop your photo'}</p>
          <p className="text-xs text-gray-400 mt-1">JPG / PNG / WEBP · max 2 MB</p>
          {value && (
            <button type="button" onClick={(e) => { e.stopPropagation(); onChange({ target: { name: 'profileImage', value: '' } }); }}
              className="mt-2 text-xs text-red-500 hover:text-red-700 font-medium underline">
              Remove photo
            </button>
          )}
          <input ref={ref} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files[0]; if (f) process(f); e.target.value = ''; }} />
        </div>
      </div>
      {err && <p className="text-xs text-red-500 mt-1.5">{err}</p>}
    </div>
  );
};

const TABS = ['orders', 'profile', 'security', 'verify'];
const TAB_ICONS = { orders:'📦', profile:'👤', security:'🔒', verify:'✉️' };
const TAB_LABELS = { orders:'Orders', profile:'Profile', security:'Security', verify:'Verify Email' };

const STATUS_STYLE = {
  pending:'bg-yellow-100 text-yellow-800', 'payment-pending':'bg-blue-100 text-blue-800',
  'payment-approved':'bg-teal-100 text-teal-800', confirmed:'bg-teal-100 text-teal-800',
  processing:'bg-purple-100 text-purple-800', 'ready-to-ship':'bg-indigo-100 text-indigo-800',
  assigned:'bg-orange-100 text-orange-800', shipped:'bg-orange-100 text-orange-800',
  delivered:'bg-green-100 text-green-800', cancelled:'bg-red-100 text-red-800',
  refunded:'bg-gray-100 text-gray-600',
};

const Field = ({ label, name, value, onChange, type='text', placeholder, readOnly, required }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    <input type={type} name={name} value={value} onChange={onChange}
      placeholder={placeholder} readOnly={readOnly} required={required}
      className={`field text-sm ${readOnly ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`} />
  </div>
);

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');

  const [orders, setOrders]         = useState([]);
  const [ordersLoading, setOL]      = useState(false);
  const ordersFetched               = useRef(false);

  const [profile, setProfile]       = useState({ name:'', phone:'', profileImage:'', address:{ street:'', city:'', state:'', pincode:'', landmark:'' } });
  const [saving,  setSaving]        = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');
  const [saveErr, setSaveErr]       = useState('');

  const [pwd, setPwd]               = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [pwdMsg, setPwdMsg]         = useState('');
  const [pwdErr, setPwdErr]         = useState('');
  const [pwdSaving, setPwdSaving]   = useState(false);

  const [emailVerified, setEV]      = useState(false);
  const [otpSent, setOtpSent]       = useState(false);
  const [devOtp, setDevOtp]         = useState('');
  const [otpInput, setOtpInput]     = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVer]   = useState(false);
  const [otpMsg, setOtpMsg]         = useState('');
  const [otpErr, setOtpErr]         = useState('');
  const [cooldown, setCooldown]     = useState(0);
  const cooldownRef                 = useRef(null);

  useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name||'', phone: user.phone||'', profileImage: user.profileImage||'',
        address: { street: user.address?.street||'', city: user.address?.city||'',
                   state: user.address?.state||'', pincode: user.address?.pincode||'', landmark: user.address?.landmark||'' } });
      setEV(user.emailVerified || false);
    }
  }, [user]);

  useEffect(() => {
    if (tab === 'orders' && !ordersFetched.current) {
      ordersFetched.current = true; setOL(true);
      axios.get('/api/customer/orders')
        .then(r => setOrders(r.data.orders || r.data || []))
        .catch(() => {}).finally(() => setOL(false));
    }
  }, [tab]);

  useEffect(() => {
    if (cooldown > 0) { cooldownRef.current = setTimeout(() => setCooldown(c => c - 1), 1000); }
    return () => clearTimeout(cooldownRef.current);
  }, [cooldown]);

  const setP = e => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) setProfile(p => ({ ...p, address: { ...p.address, [name.split('.')[1]]: value } }));
    else setProfile(p => ({ ...p, [name]: value }));
  };

  const saveProfile = async e => {
    e.preventDefault(); setSaving(true); setSaveMsg(''); setSaveErr('');
    try { await axios.put('/api/auth/update-profile', profile); setSaveMsg('Profile updated!'); }
    catch (err) { setSaveErr(err.response?.data?.message || 'Update failed'); }
    finally { setSaving(false); setTimeout(() => setSaveMsg(''), 3500); }
  };

  const changePwd = async e => {
    e.preventDefault(); setPwdMsg(''); setPwdErr('');
    if (pwd.newPassword !== pwd.confirmPassword) { setPwdErr('New passwords do not match'); return; }
    if (pwd.newPassword.length < 6) { setPwdErr('Min 6 characters'); return; }
    setPwdSaving(true);
    try {
      await axios.post('/api/auth/change-password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      setPwdMsg('Password changed!'); setPwd({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch (err) { setPwdErr(err.response?.data?.message || 'Failed'); }
    finally { setPwdSaving(false); setTimeout(() => setPwdMsg(''), 4000); }
  };

  const sendOtp = async () => {
    setOtpSending(true); setOtpErr(''); setOtpMsg('');
    try {
      const res = await axios.post('/api/auth/send-verification');
      setOtpSent(true); setCooldown(60);
      if (res.data.otp) setDevOtp(res.data.otp);
      setOtpMsg(res.data.message);
    } catch (err) { setOtpErr(err.response?.data?.message || 'Failed to send code'); }
    finally { setOtpSending(false); }
  };

  const verifyOtp = async e => {
    e.preventDefault(); if (!otpInput.trim()) { setOtpErr('Enter the code'); return; }
    setOtpVer(true); setOtpErr('');
    try {
      await axios.post('/api/auth/verify-email', { otp: otpInput });
      setEV(true); setOtpMsg('🎉 Email verified!'); setOtpSent(false); setDevOtp(''); setOtpInput('');
    } catch (err) { setOtpErr(err.response?.data?.message || 'Verification failed'); }
    finally { setOtpVer(false); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#22c55e,#15803d)' }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-400">{user.email}</span>
                {emailVerified
                  ? <span className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-semibold">✓ Verified</span>
                  : <button onClick={() => setTab('verify')} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-semibold hover:bg-amber-100 transition-colors">⚠ Unverified</button>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1 mb-6 gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 flex-1 min-w-fit px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                ${tab === t ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
              style={tab === t ? { background: 'linear-gradient(135deg,#22c55e,#15803d)' } : {}}>
              <span>{TAB_ICONS[t]}</span>
              <span className="whitespace-nowrap">{TAB_LABELS[t]}</span>
              {t === 'verify' && !emailVerified && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
            </button>
          ))}
        </div>

        {/* Orders tab */}
        {tab === 'orders' && (
          <div className="card p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Order History</h2>
            {ordersLoading ? (
              <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-gray-400 mb-4">No orders yet</p>
                <Link to="/products" className="btn-primary text-sm">Shop Now</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(o => (
                  <div key={o._id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                      <div>
                        <p className="font-bold text-gray-900 text-sm">#{o.orderNumber}</p>
                        <p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLE[o.status] || 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {o.items?.slice(0, 3).map((item, i) => (
                        <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{item.product?.name} × {item.quantity}</span>
                      ))}
                      {o.items?.length > 3 && <span className="text-xs text-gray-400 self-center">+{o.items.length - 3}</span>}
                    </div>
                    <p className="font-bold text-green-700 text-sm">₹{o.payment?.totalAmount?.toLocaleString('en-IN') || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="card p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Personal Information</h2>
            <form onSubmit={saveProfile} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full Name" name="name" value={profile.name} onChange={setP} required placeholder="Your name" />
                <Field label="Phone" name="phone" value={profile.phone} onChange={setP} placeholder="10-digit number" />
              </div>
              <Field label="Email" name="email" value={user.email} readOnly />
              <ProfileImageUpload value={profile.profileImage} onChange={setP} />
              <div className="border-t border-gray-100 pt-5">
                <h3 className="text-sm font-bold text-gray-700 mb-4">Default Delivery Address</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2"><Field label="Street" name="address.street" value={profile.address.street} onChange={setP} placeholder="House / Building" /></div>
                  <Field label="City"    name="address.city"    value={profile.address.city}    onChange={setP} placeholder="City" />
                  <Field label="State"   name="address.state"   value={profile.address.state}   onChange={setP} placeholder="State" />
                  <Field label="Pincode" name="address.pincode" value={profile.address.pincode} onChange={setP} placeholder="6-digit pincode" />
                  <Field label="Landmark" name="address.landmark" value={profile.address.landmark} onChange={setP} placeholder="Near…" />
                </div>
              </div>
              {saveMsg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">{saveMsg}</div>}
              {saveErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{saveErr}</div>}
              <button type="submit" disabled={saving} className="btn-primary w-full py-4">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* Security tab */}
        {tab === 'security' && (
          <div className="card p-6 max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Change Password</h2>
            <form onSubmit={changePwd} className="space-y-4">
              <Field label="Current Password" name="currentPassword" type="password" value={pwd.currentPassword} onChange={e => setPwd(p => ({...p, [e.target.name]: e.target.value}))} required placeholder="Current password" />
              <Field label="New Password" name="newPassword" type="password" value={pwd.newPassword} onChange={e => setPwd(p => ({...p, [e.target.name]: e.target.value}))} required placeholder="Min 6 characters" />
              <Field label="Confirm Password" name="confirmPassword" type="password" value={pwd.confirmPassword} onChange={e => setPwd(p => ({...p, [e.target.name]: e.target.value}))} required placeholder="Repeat new password" />
              {pwdMsg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">{pwdMsg}</div>}
              {pwdErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{pwdErr}</div>}
              <button type="submit" disabled={pwdSaving} className="btn-primary w-full py-4">
                {pwdSaving ? 'Changing…' : 'Change Password'}
              </button>
            </form>
          </div>
        )}

        {/* Verify Email tab */}
        {tab === 'verify' && (
          <div className="card p-6 max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Email Verification</h2>
            {emailVerified ? (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'linear-gradient(135deg,#22c55e,#15803d)' }}>
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-green-700 mb-1">Email Verified!</h3>
                <p className="text-sm text-gray-400">{user.email} is verified and trusted.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl mb-6 text-sm text-amber-800">
                  <span className="text-xl flex-shrink-0">⚠️</span>
                  <div><p className="font-semibold mb-0.5">Your email is not verified</p>
                  <p>Verify <strong>{user.email}</strong> to confirm ownership.</p></div>
                </div>

                {!otpSent ? (
                  <div>
                    {otpErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">{otpErr}</div>}
                    <button onClick={sendOtp} disabled={otpSending || cooldown > 0} className="btn-primary w-full py-4">
                      {otpSending ? 'Sending…' : 'Send Verification Code'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={verifyOtp} className="space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">{otpMsg || `Code sent to ${user.email}`}</div>
                    {devOtp && (
                      <div className="bg-gray-900 rounded-xl p-4">
                        <p className="text-gray-400 text-xs mb-1">🛠 Dev OTP (not shown in production):</p>
                        <p className="text-green-400 text-2xl font-bold font-mono tracking-[0.3em]">{devOtp}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Enter 6-digit code *</label>
                      <input type="text" inputMode="numeric" maxLength={6}
                        value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="field text-center text-2xl font-mono tracking-[0.4em]" />
                    </div>
                    {otpErr && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{otpErr}</div>}
                    <button type="submit" disabled={otpVerifying || otpInput.length !== 6} className="btn-primary w-full py-4">
                      {otpVerifying ? 'Verifying…' : 'Verify Email'}
                    </button>
                    <div className="text-center">
                      {cooldown > 0
                        ? <p className="text-sm text-gray-400">Resend in {cooldown}s</p>
                        : <button type="button" onClick={sendOtp} disabled={otpSending} className="text-sm text-green-600 hover:underline disabled:opacity-50">{otpSending ? 'Sending…' : 'Resend code'}</button>}
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
