import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../../core/config/axios';
import { useAdmin } from '../hooks/useAdmin';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const DOC_LABELS = {
  aadhaarPhoto:       { label: 'Aadhaar Card',      icon: '🪪', required: true },
  farmLicensePhoto:   { label: 'Farm License',       icon: '📋', required: true },
  farmPhoto:          { label: 'Farm / Land Photo',  icon: '🌾', required: false },
  bankPassbook:       { label: 'Bank Passbook',      icon: '🏦', required: false },
  drivingLicensePhoto:{ label: 'Driving License',    icon: '🪪', required: true },
  vehiclePhoto:       { label: 'Vehicle Photo',      icon: '🛵', required: false },
  rcBookPhoto:        { label: 'RC Book',            icon: '📋', required: false },
};

const ROLE_COLOR = {
  farmer:   { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  delivery: { bg: 'bg-sky-100',     text: 'text-sky-800'     },
  customer: { bg: 'bg-gray-100',    text: 'text-gray-600'    },
  admin:    { bg: 'bg-violet-100',  text: 'text-violet-800'  },
};

const STATUS_COLOR = {
  pending:  { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-400'  },
  approved: { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
  rejected: { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500'    },
};

// ─── Image Lightbox ───────────────────────────────────────────────────────────
const Lightbox = ({ src, label, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
    <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
      <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-gray-200">{label}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none px-2">×</button>
        </div>
        <img src={src} alt={label} className="w-full max-h-[75vh] object-contain bg-gray-950 p-2" />
        <div className="px-5 py-3 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition">Close</button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Doc Thumbnail ────────────────────────────────────────────────────────────
const DocThumb = ({ docKey, src, onView }) => {
  const meta = DOC_LABELS[docKey] || { label: docKey, icon: '📄', required: false };
  const hasDoc = !!src;
  return (
    <div
      className={`relative rounded-xl border-2 overflow-hidden transition-all ${hasDoc ? 'border-green-400 cursor-pointer hover:border-green-500 hover:shadow-md' : 'border-dashed border-gray-200'}`}
      onClick={hasDoc ? () => onView(src, meta.label) : undefined}
    >
      {hasDoc ? (
        <>
          <img src={src} alt={meta.label} className="w-full h-24 object-cover" />
          <div className="absolute top-1.5 right-1.5 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">✓</div>
          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-end justify-center pb-2 opacity-0 hover:opacity-100">
            <span className="text-white text-xs font-bold bg-black/60 px-2 py-0.5 rounded-lg">Click to view</span>
          </div>
        </>
      ) : (
        <div className="h-24 flex flex-col items-center justify-center gap-1.5 bg-gray-50">
          <span className="text-2xl opacity-40">{meta.icon}</span>
          <span className="text-xs text-gray-400 text-center px-1">Not uploaded</span>
        </div>
      )}
      <div className="px-2 py-1.5 bg-white border-t border-gray-100">
        <p className="text-xs font-medium text-gray-700 truncate">{meta.icon} {meta.label}</p>
        {meta.required && !hasDoc && <p className="text-xs text-red-500 font-medium">Required</p>}
      </div>
    </div>
  );
};

// ─── KYC Checklist ────────────────────────────────────────────────────────────
const KYC_ITEMS = {
  farmer: [
    { key: 'identity', label: 'Identity verified (Aadhaar matches name)' },
    { key: 'farm',     label: 'Farm license / land docs look valid' },
    { key: 'bank',     label: 'Bank details provided' },
    { key: 'location', label: 'Address / location verified' },
    { key: 'phone',    label: 'Phone number confirmed' },
  ],
  delivery: [
    { key: 'identity', label: 'Identity verified (Aadhaar matches name)' },
    { key: 'license',  label: 'Driving license valid & not expired' },
    { key: 'vehicle',  label: 'Vehicle RC & details match' },
    { key: 'location', label: 'Service area confirmed' },
    { key: 'phone',    label: 'Phone number confirmed' },
  ],
};

// ─── Risk Assessment ──────────────────────────────────────────────────────────
const computeRisk = (user) => {
  let score = 0; const flags = [];
  const vDocs = user.role === 'farmer'
    ? (user.farmerProfile?.verificationDocs || {})
    : (user.deliveryProfile?.verificationDocs || {});
  const docKeys = user.role === 'farmer'
    ? ['aadhaarPhoto','farmLicensePhoto','farmPhoto','bankPassbook']
    : ['drivingLicensePhoto','aadhaarPhoto','vehiclePhoto','rcBookPhoto'];
  const uploadedCount = docKeys.filter(k => vDocs[k]).length;
  const requiredKeys  = user.role === 'farmer'
    ? ['aadhaarPhoto','farmLicensePhoto']
    : ['drivingLicensePhoto','aadhaarPhoto'];
  const hasAllRequired = requiredKeys.every(k => vDocs[k]);

  if (!hasAllRequired)     { score += 40; flags.push({ level:'high',   msg: 'Missing required documents' }); }
  else if (uploadedCount < 3) { score += 15; flags.push({ level:'medium', msg: 'Few optional docs uploaded' }); }

  if (!user.phone)                   { score += 20; flags.push({ level:'high',   msg: 'No phone number' }); }
  if (!user.address?.city)           { score += 10; flags.push({ level:'medium', msg: 'No address provided' }); }
  if (user.role === 'farmer') {
    if (!user.farmerProfile?.farmName)      { score += 15; flags.push({ level:'medium', msg: 'No farm name' }); }
    if (!user.farmerProfile?.documents?.bankDetails?.accountNumber) { score += 5; flags.push({ level:'low', msg: 'No bank details' }); }
  }
  if (user.role === 'delivery') {
    if (!user.deliveryProfile?.vehicleNumber) { score += 15; flags.push({ level:'medium', msg: 'No vehicle number' }); }
    if (!user.deliveryProfile?.drivingLicense){ score += 10; flags.push({ level:'medium', msg: 'No license number' }); }
  }
  const level = score === 0 ? 'low' : score <= 20 ? 'medium' : 'high';
  return { score: Math.min(score, 100), level, flags };
};

const RISK_CONFIG = {
  low:    { color: 'text-green-700',  bg: 'bg-green-100',  bar: 'bg-green-500',  label: 'Low Risk',    icon: '🟢' },
  medium: { color: 'text-amber-700',  bg: 'bg-amber-100',  bar: 'bg-amber-500',  label: 'Medium Risk', icon: '🟡' },
  high:   { color: 'text-red-700',    bg: 'bg-red-100',    bar: 'bg-red-500',    label: 'High Risk',   icon: '🔴' },
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────
const DetailModal = ({ user, onClose, onApprove, onReject, busy }) => {
  const [action,   setAction]  = useState('approve');
  const [reason,   setReason]  = useState('');
  const [notes,    setNotes]   = useState('');
  const [checks,   setChecks]  = useState({});
  const [lightbox, setLightbox] = useState(null);

  const isPending  = user.accountStatus?.approvalStatus === 'pending';
  const isApproved = user.accountStatus?.approvalStatus === 'approved';
  const isRejected = user.accountStatus?.approvalStatus === 'rejected';

  const vDocs = user.role === 'farmer'
    ? (user.farmerProfile?.verificationDocs || {})
    : (user.deliveryProfile?.verificationDocs || {});
  const docKeys = user.role === 'farmer'
    ? ['aadhaarPhoto','farmLicensePhoto','farmPhoto','bankPassbook']
    : ['drivingLicensePhoto','aadhaarPhoto','vehiclePhoto','rcBookPhoto'];
  const uploadedDocCount = docKeys.filter(k => vDocs[k]).length;
  const requiredDocKeys  = user.role === 'farmer'
    ? ['aadhaarPhoto','farmLicensePhoto']
    : ['drivingLicensePhoto','aadhaarPhoto'];
  const allRequiredUploaded = requiredDocKeys.every(k => vDocs[k]);
  const kycItems = KYC_ITEMS[user.role] || [];
  const checkedCount = kycItems.filter(i => checks[i.key]).length;
  const risk = computeRisk(user);
  const riskCfg = RISK_CONFIG[risk.level];

  const rc = ROLE_COLOR[user.role] || ROLE_COLOR.customer;
  const sc = STATUS_COLOR[user.accountStatus?.approvalStatus] || STATUS_COLOR.pending;

  return (
    <>
      {lightbox && <Lightbox src={lightbox.src} label={lightbox.label} onClose={() => setLightbox(null)} />}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-4">
              {/* Profile photo or avatar */}
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500 flex-shrink-0 border-2 border-white shadow-md">
                {user.profileImage
                  ? <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                  : user.name[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${rc.bg} ${rc.text}`}>{user.role}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>
                    {user.accountStatus?.approvalStatus || 'pending'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${riskCfg.bg} ${riskCfg.color}`}>
                    {riskCfg.icon} {riskCfg.label}
                  </span>
                  <span className="text-xs text-gray-400">{fmtDate(user.createdAt)}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-1 ml-2">×</button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

            {/* Risk Assessment Panel */}
            {(isPending || isRejected) && (
              <section className={`rounded-xl border p-4 ${riskCfg.bg} border-opacity-50`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${riskCfg.color}`}>Application Risk Assessment</h3>
                  <span className={`text-sm font-black ${riskCfg.color}`}>{riskCfg.icon} {riskCfg.label}</span>
                </div>
                {/* Risk bar */}
                <div className="w-full bg-white/60 rounded-full h-2 mb-3">
                  <div className={`h-2 rounded-full transition-all ${riskCfg.bar}`} style={{ width: `${risk.score}%` }} />
                </div>
                {/* Completeness stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-white/70 rounded-lg p-2.5 text-center">
                    <p className={`text-lg font-black ${riskCfg.color}`}>{uploadedDocCount}/{docKeys.length}</p>
                    <p className="text-xs text-gray-500">Docs uploaded</p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-2.5 text-center">
                    <p className={`text-lg font-black ${allRequiredUploaded ? 'text-green-700' : 'text-red-700'}`}>
                      {allRequiredUploaded ? '✓ Yes' : '✗ No'}
                    </p>
                    <p className="text-xs text-gray-500">Required docs</p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-2.5 text-center">
                    <p className={`text-lg font-black ${checkedCount === kycItems.length && kycItems.length > 0 ? 'text-green-700' : 'text-amber-700'}`}>
                      {checkedCount}/{kycItems.length}
                    </p>
                    <p className="text-xs text-gray-500">KYC verified</p>
                  </div>
                </div>
                {/* Risk flags */}
                {risk.flags.length > 0 && (
                  <div className="space-y-1.5">
                    {risk.flags.map((f, i) => (
                      <div key={i} className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg ${
                        f.level === 'high' ? 'bg-red-100 text-red-800' :
                        f.level === 'medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <span>{f.level === 'high' ? '⚠️' : f.level === 'medium' ? '⚡' : 'ℹ️'}</span>
                        {f.msg}
                      </div>
                    ))}
                  </div>
                )}
                {risk.flags.length === 0 && (
                  <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-100 text-green-800">
                    <span>✅</span> All checks passed — application looks complete
                  </div>
                )}
              </section>
            )}

            {/* Basic Info */}
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Basic Information</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ['Email',   user.email],
                  ['Phone',   user.phone],
                  ['City',    user.address?.city || '—'],
                  ['State',   user.address?.state || '—'],
                  ['Pincode', user.address?.pincode || '—'],
                  ['Joined',  fmtDate(user.createdAt)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-800 break-all">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Farmer profile details */}
            {user.role === 'farmer' && user.farmerProfile && (
              <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Farm Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    ['Farm Name',   user.farmerProfile.farmName || '—'],
                    ['Experience',  user.farmerProfile.experience ? `${user.farmerProfile.experience} years` : '—'],
                    ['Farm Size',   user.farmerProfile.farmSize   ? `${user.farmerProfile.farmSize} acres` : '—'],
                    ['Location',    user.farmerProfile.location   || user.address?.city || '—'],
                    ['Bank A/C',    user.farmerProfile.documents?.bankDetails?.accountNumber ? `****${user.farmerProfile.documents.bankDetails.accountNumber.slice(-4)}` : '—'],
                    ['IFSC Code',   user.farmerProfile.documents?.bankDetails?.ifscCode || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-green-50 rounded-xl px-4 py-3">
                      <p className="text-xs text-green-600 font-medium mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>
                {user.farmerProfile.bio && (
                  <div className="mt-3 bg-green-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-green-600 font-medium mb-1">Bio</p>
                    <p className="text-sm text-gray-700">{user.farmerProfile.bio}</p>
                  </div>
                )}
              </section>
            )}

            {/* Delivery profile details */}
            {user.role === 'delivery' && user.deliveryProfile && (
              <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Delivery Agent Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    ['Vehicle Type',    user.deliveryProfile.vehicleType || '—'],
                    ['Vehicle No.',     user.deliveryProfile.vehicleNumber || '—'],
                    ['License No.',     user.deliveryProfile.drivingLicense || '—'],
                    ['Coverage Radius', user.deliveryProfile.serviceArea?.coverageRadius ? `${user.deliveryProfile.serviceArea.coverageRadius} km` : '—'],
                    ['Service Cities',  (user.deliveryProfile.serviceArea?.cities||[]).join(', ') || '—'],
                    ['Base Location',   user.deliveryProfile.serviceArea?.baseLocation?.address || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-sky-50 rounded-xl px-4 py-3">
                      <p className="text-xs text-sky-600 font-medium mb-0.5">{label}</p>
                      <p className="text-sm font-semibold text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Verification documents */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verification Documents</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${!allRequiredUploaded ? 'bg-red-100 text-red-700' : uploadedDocCount < docKeys.length ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {uploadedDocCount}/{docKeys.length} uploaded
                  </span>
                  {!allRequiredUploaded && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">⚠️ Required missing</span>
                  )}
                </div>
              </div>
              {uploadedDocCount === 0 ? (
                <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-sm text-gray-500 font-medium">No documents uploaded</p>
                  <p className="text-xs text-gray-400 mt-1">This applicant did not upload verification documents during registration.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {docKeys.map(k => (
                    <DocThumb key={k} docKey={k} src={vDocs[k]}
                              onView={(src, label) => setLightbox({ src, label })} />
                  ))}
                </div>
              )}
            </section>

            {/* KYC Checklist */}
            {isPending && kycItems.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Verification Checklist</h3>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${checkedCount === kycItems.length ? 'bg-green-100 text-green-700' : checkedCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {checkedCount}/{kycItems.length} verified
                  </span>
                </div>
                <div className="space-y-2">
                  {kycItems.map(item => (
                    <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${checks[item.key] ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                      <input type="checkbox" checked={!!checks[item.key]}
                             onChange={e => setChecks(c => ({ ...c, [item.key]: e.target.checked }))}
                             className="w-4 h-4 text-green-600 rounded" />
                      <span className={`text-sm font-medium flex-1 ${checks[item.key] ? 'text-green-800' : 'text-gray-700'}`}>{item.label}</span>
                      {checks[item.key] && <span className="text-green-600 text-sm">✓</span>}
                    </label>
                  ))}
                </div>
              </section>
            )}

            {/* Review history */}
            {(isApproved || isRejected) && (
              <section>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Review History</h3>
                <div className={`rounded-xl border p-4 ${isApproved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{isApproved ? '✅' : '❌'}</span>
                    <span className={`font-bold text-sm ${isApproved ? 'text-green-800' : 'text-red-800'}`}>{isApproved ? 'Approved' : 'Rejected'}</span>
                    <span className="text-xs text-gray-500 ml-auto">{fmtTime(user.accountStatus?.approvalDate)}</span>
                  </div>
                  {isRejected && user.accountStatus?.rejectionReason && (
                    <p className="text-sm text-red-700 mt-1"><strong>Reason: </strong>{user.accountStatus.rejectionReason}</p>
                  )}
                </div>
              </section>
            )}

            {/* Admin Notes */}
            <section>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Internal Notes</h3>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Notes for internal reference (not shown to applicant)…"
                        rows={2}
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 resize-none" />
            </section>

            {/* Decision */}
            {isPending && (
              <section className="border-t pt-5">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Decision</h3>
                <div className="flex gap-3 mb-4">
                  <button onClick={() => setAction('approve')}
                          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${action === 'approve' ? 'bg-green-600 text-white shadow-lg shadow-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    ✓ Approve Application
                  </button>
                  <button onClick={() => setAction('reject')}
                          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${action === 'reject' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    ✗ Reject Application
                  </button>
                </div>

                {action === 'approve' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-xs text-green-800">
                    <p className="font-semibold mb-1">Approving will:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Grant the {user.role} full access to their dashboard</li>
                      <li>Allow them to {user.role === 'farmer' ? 'list products for sale' : 'accept delivery assignments'}</li>
                    </ul>
                  </div>
                )}

                {action === 'reject' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Rejection Reason <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[
                        'Documents unclear or unreadable',
                        'Incomplete information provided',
                        'Documents appear to be expired',
                        'Identity mismatch in documents',
                        user.role === 'farmer' ? 'Farm license not valid' : 'Driving license not valid',
                        'Duplicate account detected',
                      ].map(r => (
                        <button key={r} type="button" onClick={() => setReason(r)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium text-left border transition ${reason === r ? 'border-red-500 bg-red-50 text-red-800' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                    <textarea value={reason} onChange={e => setReason(e.target.value)}
                              placeholder="Or type a custom rejection reason…"
                              rows={2}
                              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3 bg-gray-50 flex-shrink-0">
            <button onClick={onClose} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition">
              {isPending ? 'Cancel' : 'Close'}
            </button>
            {isPending && (
              <button
                disabled={busy || (action === 'reject' && !reason.trim())}
                onClick={() => action === 'approve' ? onApprove(user._id, notes) : onReject(user._id, reason, notes)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm text-white transition disabled:opacity-50 disabled:cursor-not-allowed ${action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {busy ? 'Processing…' : action === 'approve' ? '✓ Approve & Activate' : '✗ Reject Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── User Card ────────────────────────────────────────────────────────────────
const UserCard = ({ user, onSelect }) => {
  const rc = ROLE_COLOR[user.role] || ROLE_COLOR.customer;
  const sc = STATUS_COLOR[user.accountStatus?.approvalStatus] || STATUS_COLOR.pending;
  const vDocs = user.role === 'farmer' ? (user.farmerProfile?.verificationDocs || {}) : (user.deliveryProfile?.verificationDocs || {});
  const docKeys = user.role === 'farmer' ? ['aadhaarPhoto','farmLicensePhoto','farmPhoto','bankPassbook'] : ['drivingLicensePhoto','aadhaarPhoto','vehiclePhoto','rcBookPhoto'];
  const uploadedDocCount = docKeys.filter(k => vDocs[k]).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      <div className={`h-1 w-full ${sc.dot}`} />
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-lg font-bold text-gray-500 flex-shrink-0">
              {user.name[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-gray-900 text-sm truncate">{user.name}</h4>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase flex-shrink-0 ml-1 ${rc.bg} ${rc.text}`}>{user.role}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="bg-gray-50 rounded-lg px-3 py-2"><p className="text-gray-400">Phone</p><p className="font-semibold text-gray-700">{user.phone}</p></div>
          <div className="bg-gray-50 rounded-lg px-3 py-2"><p className="text-gray-400">Joined</p><p className="font-semibold text-gray-700">{fmtDate(user.createdAt)}</p></div>
        </div>

        {user.role === 'farmer' && user.farmerProfile?.farmName && (
          <div className="bg-green-50 rounded-lg px-3 py-2 mb-3 text-xs">
            <p className="text-green-700 font-semibold truncate">🌾 {user.farmerProfile.farmName}</p>
            {user.farmerProfile.experience && <p className="text-green-600">{user.farmerProfile.experience} yrs experience</p>}
          </div>
        )}
        {user.role === 'delivery' && user.deliveryProfile?.vehicleType && (
          <div className="bg-sky-50 rounded-lg px-3 py-2 mb-3 text-xs">
            <p className="text-sky-700 font-semibold">🛵 {user.deliveryProfile.vehicleType?.toUpperCase()}</p>
            {user.deliveryProfile.serviceArea?.coverageRadius && <p className="text-sky-600">{user.deliveryProfile.serviceArea.coverageRadius} km coverage</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 mb-4 mt-auto">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>
            {user.accountStatus?.approvalStatus || 'pending'}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${uploadedDocCount === 0 ? 'bg-red-100 text-red-700' : uploadedDocCount < 2 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
            📎 {uploadedDocCount} docs
          </span>
        </div>

        <button onClick={() => onSelect(user)} className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition">
          Review Application →
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const UserManagementPage = () => {
  const { canManageUsers } = useAdmin();
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('pending');
  const [selected,   setSelected]   = useState(null);
  const [busy,       setBusy]       = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [toast,      setToast]      = useState(null);

  const showToast = (msg, type = 'info') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };
  const headers   = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });

  const fetchUsers = useCallback(async () => {
    if (!canManageUsers()) return;
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/users', headers());
      setUsers(res.data.users || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleApprove = async (userId, notes) => {
    setBusy(true);
    try {
      await axios.post(`/api/admin/users/${userId}/approve`, { notes }, headers());
      showToast('✅ User approved successfully', 'success');
      setSelected(null);
      await fetchUsers();
    } catch { showToast('❌ Error approving user', 'error'); }
    finally { setBusy(false); }
  };

  const handleReject = async (userId, reason, notes) => {
    if (!reason.trim()) { showToast('Please provide a rejection reason', 'error'); return; }
    setBusy(true);
    try {
      await axios.post(`/api/admin/users/${userId}/reject`, { reason, notes }, headers());
      showToast('User rejected', 'info');
      setSelected(null);
      await fetchUsers();
    } catch { showToast('❌ Error rejecting user', 'error'); }
    finally { setBusy(false); }
  };

  const pending  = users.filter(u => ['farmer','delivery'].includes(u.role) && u.accountStatus?.approvalStatus === 'pending');
  const approved = users.filter(u => ['farmer','delivery'].includes(u.role) && u.accountStatus?.approvalStatus === 'approved');
  const rejected = users.filter(u => ['farmer','delivery'].includes(u.role) && u.accountStatus?.approvalStatus === 'rejected');

  const tabData  = { pending, approved, rejected, all: users };
  const filtered = (tabData[activeTab] || []).filter(u => {
    const q = searchTerm.toLowerCase();
    return (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
        && (roleFilter === 'all' || u.role === roleFilter);
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">

        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl text-sm font-semibold text-white transition-all ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900'}`}>
            {toast.msg}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900">User Verification</h1>
          <p className="text-gray-500 mt-1">Review and approve farmer & delivery partner applications</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Pending Review', value: pending.length,  colorL: 'border-amber-500', colorV: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Approved',       value: approved.length, colorL: 'border-green-500', colorV: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Rejected',       value: rejected.length, colorL: 'border-red-500',   colorV: 'text-red-600',   bg: 'bg-red-50'   },
            { label: 'All Users',      value: users.length,    colorL: 'border-gray-300',  colorV: 'text-gray-700',  bg: 'bg-white'    },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl border-l-4 ${s.colorL} p-5 shadow-sm`}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
              <p className={`text-3xl font-black mt-1 ${s.colorV}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {[
              { id: 'pending',  label: '⏳ Pending',   count: pending.length  },
              { id: 'approved', label: '✅ Approved',  count: approved.length },
              { id: 'rejected', label: '❌ Rejected',  count: rejected.length },
              { id: 'all',      label: '👥 All Users', count: users.length    },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                      className={`px-6 py-4 font-semibold text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${activeTab === t.id ? 'border-b-2 border-green-600 text-green-700' : 'text-gray-500 hover:text-gray-700'}`}>
                {t.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === t.id ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
              </button>
            ))}
          </div>
          <div className="p-5 flex flex-wrap gap-3">
            <input type="text" placeholder="Search name or email…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                   className="flex-1 min-w-[200px] px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="all">All Roles</option>
              <option value="farmer">🌾 Farmers</option>
              <option value="delivery">🛵 Delivery</option>
              <option value="customer">🛒 Customers</option>
              <option value="admin">⚙️ Admins</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mb-4" />
              <p className="text-gray-500">Loading users…</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-gray-100">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-600 font-semibold">No users found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(u => <UserCard key={u._id} user={u} onSelect={setSelected} />)}
          </div>
        )}
      </div>

      {selected && (
        <DetailModal user={selected} busy={busy} onClose={() => setSelected(null)}
                     onApprove={handleApprove} onReject={handleReject} />
      )}
    </div>
  );
};

export default UserManagementPage;
