import React, { useState, useEffect, useContext } from 'react';
import axios from '../../../core/config/axios';
import { AdminAuthContext } from '../contexts/AdminAuthContext';

/**
 * Admin Payment Approval Page
 *
 * BUGS FIXED vs original:
 * - Was calling /api/admin/payments/all → now calls /api/payment/admin/all
 * - Was filtering on `p.status` (doesn't exist) → now on `p.approvalStatus`
 * - Was reading `p.amount` → now reads `p.totalAmount`
 * - canManagePayments() was always false → fixed in AdminAuthContext
 * - Added support for 'verified' tab (online payments with proof submitted)
 * - Approve/reject now POST to /api/payment/admin/:orderId/approve|reject
 */

const STATUS_CONFIG = {
  pending:  { label: 'Pending',         color: 'yellow', icon: '⏳', desc: 'Waiting for action'         },
  verified: { label: 'Proof Submitted', color: 'blue',   icon: '🔍', desc: 'Customer submitted proof'   },
  approved: { label: 'Approved',        color: 'green',  icon: '✅', desc: 'Payment confirmed'           },
  rejected: { label: 'Rejected',        color: 'red',    icon: '❌', desc: 'Payment rejected'             },
  refunded: { label: 'Refunded',        color: 'orange', icon: '↩️', desc: 'Refunded to customer'        },
};

const METHOD_LABEL = {
  cod:    '💵 Cash on Delivery',
  online: '💳 Online',
  wallet: '👛 Wallet',
};

const PaymentApprovalPage = () => {
  const { adminUser } = useContext(AdminAuthContext);

  const [payments,    setPayments]    = useState([]);
  const [summary,     setSummary]     = useState({});
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('needs-action'); // 'needs-action' | 'approved' | 'rejected'
  const [selected,    setSelected]    = useState(null);
  const [action,      setAction]      = useState(null);   // 'approve' | 'reject'
  const [reason,      setReason]      = useState('');
  const [actionBusy,  setActionBusy]  = useState(false);
  const [toast,       setToast]       = useState('');

  const token = () => localStorage.getItem('adminToken');
  const headers = () => ({ headers: { Authorization: `Bearer ${token()}` } });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/payment/admin/all', headers());
      setPayments(res.data.payments  || []);
      setSummary(res.data.summary    || {});
    } catch (err) {
      console.error('Fetch payments error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, []);

  // ── Derived lists ─────────────────────────────────────────────────────────
  const needsAction = payments.filter(p => ['pending', 'verified'].includes(p.approvalStatus));
  const approved    = payments.filter(p => p.approvalStatus === 'approved');
  const rejected    = payments.filter(p => p.approvalStatus === 'rejected');

  const activeList = activeTab === 'needs-action' ? needsAction
                   : activeTab === 'approved'     ? approved
                   :                                rejected;

  // ── Approve / Reject ──────────────────────────────────────────────────────
  const openModal = (payment, act) => {
    setSelected(payment);
    setAction(act);
    setReason('');
  };

  const handleConfirm = async () => {
    if (action === 'reject' && !reason.trim()) {
      showToast('Please provide a reason for rejection');
      return;
    }
    setActionBusy(true);
    try {
      const endpoint = `/api/payment/admin/${selected._id}/${action}`;
      const body     = action === 'reject' ? { reason } : {};
      await axios.post(endpoint, body, headers());
      showToast(action === 'approve' ? '✅ Payment approved!' : '❌ Payment rejected');
      setSelected(null);
      setAction(null);
      await fetchPayments();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed');
    } finally {
      setActionBusy(false);
    }
  };

  // ── Payment card ──────────────────────────────────────────────────────────
  const PaymentCard = ({ p }) => {
    const cfg = STATUS_CONFIG[p.approvalStatus] || STATUS_CONFIG.pending;
    const canAct = ['pending', 'verified'].includes(p.approvalStatus);

    return (
      <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition border-l-4 border-${cfg.color}-400 p-5`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="text-base font-bold text-gray-900">Order #{p.orderNumber}</h4>
            <p className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleString()}</p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-${cfg.color}-100 text-${cfg.color}-800`}>
              {cfg.icon} {cfg.label}
            </span>
            <p className="text-xs text-gray-400 mt-1">{METHOD_LABEL[p.method] || p.method}</p>
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-center text-sm bg-gray-50 rounded-lg p-3">
          <div>
            <p className="text-gray-400 text-xs">Subtotal</p>
            <p className="font-semibold text-gray-700">₹{p.subtotal}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Delivery</p>
            <p className="font-semibold text-gray-700">₹{p.deliveryCharge}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Total</p>
            <p className="font-bold text-green-700 text-base">₹{p.totalAmount}</p>
          </div>
        </div>

        {/* Customer info */}
        <div className="text-sm space-y-1 mb-3">
          <div className="flex justify-between">
            <span className="text-gray-500">Customer</span>
            <span className="font-medium text-gray-800">{p.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-700">{p.customerEmail}</span>
          </div>
          {p.transactionId && (
            <div className="flex justify-between">
              <span className="text-gray-500">Txn ID</span>
              <span className="font-mono text-xs text-gray-700 max-w-40 truncate">{p.transactionId}</span>
            </div>
          )}
          {p.paymentProof && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Proof</span>
              <a href={p.paymentProof} target="_blank" rel="noreferrer"
                className="text-blue-600 hover:underline text-xs">
                View Screenshot ↗
              </a>
            </div>
          )}
          {p.rejectionReason && (
            <div className="mt-2 bg-red-50 rounded p-2 text-xs text-red-700">
              <span className="font-semibold">Rejection reason:</span> {p.rejectionReason}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="text-xs text-gray-500 mb-4 max-h-20 overflow-y-auto">
          {p.items?.map((item, i) => (
            <span key={i} className="inline-block bg-gray-100 rounded px-2 py-0.5 mr-1 mb-1">
              {item.product} × {item.quantity}
            </span>
          ))}
        </div>

        {/* Actions */}
        {canAct && (
          <div className="flex gap-2">
            <button onClick={() => openModal(p, 'approve')}
              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition">
              ✓ Approve
            </button>
            <button onClick={() => openModal(p, 'reject')}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition">
              ✗ Reject
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-green-600 mx-auto mb-3" />
        <p className="text-gray-500">Loading payments…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Payment Approvals</h1>
          <p className="text-gray-500 mt-1">Review and approve/reject customer payments</p>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-white border border-gray-200 shadow-lg rounded-xl px-5 py-3 text-gray-800 font-medium">
            {toast}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Needs Action', value: needsAction.length, color: 'yellow', icon: '⏳' },
            { label: 'Online Pending', value: payments.filter(p => p.method !== 'cod' && ['pending','verified'].includes(p.approvalStatus)).length, color: 'blue', icon: '💳' },
            { label: 'COD Pending',   value: payments.filter(p => p.method === 'cod' && p.approvalStatus === 'pending').length, color: 'amber', icon: '💵' },
            { label: 'Approved',      value: approved.length,  color: 'green',  icon: '✅' },
            { label: 'Rejected',      value: rejected.length,  color: 'red',    icon: '❌' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-500 text-xs">{card.label}</p>
                  <p className={`text-3xl font-bold text-${card.color}-600`}>{card.value}</p>
                </div>
                <span className="text-2xl">{card.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Pending revenue alert */}
        {needsAction.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-semibold text-amber-800">
                ₹{summary.totalPendingAmount?.toFixed(0) || 0} pending approval
              </p>
              <p className="text-amber-600 text-sm">
                {needsAction.length} order{needsAction.length !== 1 ? 's' : ''} need your review
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="flex border-b">
            {[
              { id: 'needs-action', label: `Needs Action (${needsAction.length})` },
              { id: 'approved',     label: `Approved (${approved.length})`        },
              { id: 'rejected',     label: `Rejected (${rejected.length})`        },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 px-4 font-semibold text-sm transition border-b-2 ${
                  activeTab === tab.id
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeList.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">🎉</div>
                <p className="font-medium">No payments in this category</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {activeList.map(p => <PaymentCard key={p._id} p={p} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approve / Reject modal */}
      {selected && action && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {action === 'approve' ? '✅ Approve Payment' : '❌ Reject Payment'}
            </h3>

            {/* Order summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Order</span>
                <span className="font-semibold">#{selected.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Customer</span>
                <span className="font-semibold">{selected.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-semibold">{METHOD_LABEL[selected.method]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-green-700 text-lg">₹{selected.totalAmount}</span>
              </div>
              {selected.transactionId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Txn ID</span>
                  <span className="font-mono text-xs">{selected.transactionId}</span>
                </div>
              )}
              {selected.paymentProof && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Proof</span>
                  <a href={selected.paymentProof} target="_blank" rel="noreferrer"
                    className="text-blue-600 hover:underline text-xs">View ↗</a>
                </div>
              )}
            </div>

            {action === 'approve' && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-5 text-sm text-green-800">
                Approving will mark the payment as complete and move the order to
                <strong> payment-approved</strong> status. The farmer will be notified to prepare.
              </div>
            )}

            {action === 'reject' && (
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason for rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Transaction ID not found, amount mismatch…"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                  The order will be cancelled and product stock will be restored.
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setSelected(null); setAction(null); }}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleConfirm} disabled={actionBusy}
                className={`flex-1 py-2.5 text-white font-semibold rounded-xl transition disabled:opacity-50 ${
                  action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}>
                {actionBusy ? 'Processing…' : action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentApprovalPage;
