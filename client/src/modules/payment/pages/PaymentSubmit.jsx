import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import axios from '../../../core/config/axios';

// ─── Static config ─────────────────────────────────────────────────────────
const UPI_ID       = 'farm2home@upi';       // replace with real UPI ID
const BANK_ACCOUNT = 'XXXX XXXX XXXX 4321'; // replace with real account
const BANK_IFSC    = 'SBIN0001234';
const BANK_NAME    = 'Farm2Home Pvt. Ltd.';

const STEPS = ['Order Placed', 'Payment', 'Admin Approval', 'Confirmed'];

// ─── Component ──────────────────────────────────────────────────────────────
const PaymentSubmit = () => {
  const { orderId } = useParams();
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const location    = useLocation();

  // Guest access: pass ?guestEmail=... in the query string
  const guestEmail = new URLSearchParams(location.search).get('guestEmail') || '';

  const [order,        setOrder]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const [submitted,    setSubmitted]    = useState(false);

  const [paymentTab,      setPaymentTab]      = useState('upi');   // 'upi' | 'bank' | 'cod'
  const [transactionId,   setTransactionId]   = useState('');
  const [paymentProofUrl, setPaymentProofUrl] = useState('');

  // ── Fetch order ────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const params = guestEmail ? `?guestEmail=${encodeURIComponent(guestEmail)}` : '';
        const res = await axios.get(`/api/payment/order/${orderId}${params}`);
        setOrder(res.data.order);

        // If order is already past the proof-needed state, show status instead
        const alreadySubmitted = ['verified', 'approved', 'payment-pending', 'payment-approved', 'confirmed', 'delivered'].includes(
          res.data.order.status
        );
        if (alreadySubmitted) setSubmitted(true);

        // Auto-select correct payment tab from order method
        if (res.data.order.payment?.method === 'cod') setPaymentTab('cod');
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load order details');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, guestEmail]);

  // ── Submit proof ───────────────────────────────────────────────────────────
  const handleSubmitProof = async (e) => {
    e.preventDefault();
    setError('');

    if (order?.payment?.method !== 'cod' && !transactionId.trim()) {
      setError('Please enter your transaction / UTR number');
      return;
    }

    setSubmitting(true);
    try {
      const params = guestEmail ? `?guestEmail=${encodeURIComponent(guestEmail)}` : '';
      await axios.post(`/api/payment/submit-proof/${orderId}${params}`, {
        transactionId: transactionId.trim(),
        paymentProof:  paymentProofUrl.trim() || undefined,
        provider:      paymentTab === 'upi' ? 'upi' : paymentTab === 'bank' ? 'bank' : undefined
      });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isCOD      = order?.payment?.method === 'cod';
  const isApproved = ['payment-approved', 'confirmed', 'delivered'].includes(order?.status);
  const isCancelled = order?.status === 'cancelled';

  const stepIndex = () => {
    if (!order) return 0;
    if (isApproved) return 3;
    if (submitted || order.status === 'payment-pending') return 2;
    return 1;
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-14 w-14 border-b-4 border-green-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading order…</p>
      </div>
    </div>
  );

  if (error && !order) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Order Not Found</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">
          Go Home
        </button>
      </div>
    </div>
  );

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-4">

        {/* ── Progress stepper ── */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            {/* connector line */}
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-0" />
            {STEPS.map((step, i) => (
              <div key={step} className="flex flex-col items-center z-10 bg-gray-50 px-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                  i < stepIndex()
                    ? 'bg-green-600 border-green-600 text-white'
                    : i === stepIndex()
                    ? 'bg-white border-green-600 text-green-600'
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {i < stepIndex() ? '✓' : i + 1}
                </div>
                <span className={`text-xs mt-1 text-center ${i <= stepIndex() ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Cancelled banner ── */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 text-center">
            <div className="text-4xl mb-2">❌</div>
            <h2 className="text-xl font-bold text-red-800">Order Cancelled</h2>
            <p className="text-red-600 mt-1">
              {order.payment.rejectionReason
                ? `Reason: ${order.payment.rejectionReason}`
                : 'This order has been cancelled.'}
            </p>
            <button onClick={() => navigate('/products')}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Shop Again
            </button>
          </div>
        )}

        {/* ── Success / awaiting approval ── */}
        {!isCancelled && (submitted || isApproved) && (
          <div className={`rounded-xl p-6 mb-6 text-center ${
            isApproved ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="text-5xl mb-3">{isApproved ? '🎉' : '⏳'}</div>
            <h2 className={`text-2xl font-bold mb-2 ${isApproved ? 'text-green-800' : 'text-blue-800'}`}>
              {isApproved ? 'Payment Confirmed!' : isCOD ? 'Order Received!' : 'Proof Submitted!'}
            </h2>
            <p className={isApproved ? 'text-green-700' : 'text-blue-700'}>
              {isApproved
                ? 'Your order has been approved and is being prepared.'
                : isCOD
                ? 'Your COD order is awaiting admin confirmation. You will pay cash on delivery.'
                : 'Your payment proof is under review. We usually approve within a few hours.'}
            </p>

            <div className="mt-4 bg-white rounded-lg p-4 text-left text-sm inline-block min-w-64">
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Order #</span>
                <span className="font-mono font-semibold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-green-700">₹{order.payment.totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="font-semibold capitalize">{order.payment.method === 'cod' ? 'Cash on Delivery' : 'Online'}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
              {user && (
                <button onClick={() => navigate('/customer')}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  View My Orders
                </button>
              )}
              <button onClick={() => navigate('/products')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
                Continue Shopping
              </button>
            </div>
          </div>
        )}

        {/* ── Payment form (only shown before submission) ── */}
        {!isCancelled && !submitted && !isApproved && (
          <div className="grid gap-6 md:grid-cols-5">

            {/* Payment instructions + form — left 3 cols */}
            <div className="md:col-span-3 space-y-4">

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-1">Complete Your Payment</h2>
                <p className="text-gray-500 text-sm mb-5">
                  Order <span className="font-mono text-gray-700">{order?.orderNumber}</span>
                </p>

                {/* ── Method tabs ── */}
                {!isCOD && (
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-6">
                    {[
                      { id: 'upi',  label: '📱 UPI'           },
                      { id: 'bank', label: '🏦 Bank Transfer'  },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setPaymentTab(tab.id)}
                        className={`flex-1 py-2.5 text-sm font-medium transition ${
                          paymentTab === tab.id
                            ? 'bg-green-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── COD instructions ── */}
                {isCOD && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mb-6">
                    <h3 className="font-bold text-amber-800 mb-2">💵 Cash on Delivery</h3>
                    <ul className="text-amber-700 text-sm space-y-1.5 list-disc list-inside">
                      <li>Keep ₹{order?.payment?.totalAmount} ready in cash.</li>
                      <li>Pay the delivery agent when your order arrives.</li>
                      <li>An admin will confirm and dispatch your order shortly.</li>
                    </ul>
                    <p className="text-amber-600 text-xs mt-3">
                      ℹ️ No payment proof required — just click "Confirm Order" below.
                    </p>
                  </div>
                )}

                {/* ── UPI instructions ── */}
                {!isCOD && paymentTab === 'upi' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 mb-6">
                    <h3 className="font-semibold text-blue-800 mb-3">Pay via UPI</h3>
                    <div className="bg-white rounded-lg p-4 text-center mb-3 border">
                      {/* Simple QR placeholder — replace with a real QR code image */}
                      <div className="w-32 h-32 mx-auto bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs mb-2">
                        QR Code
                      </div>
                      <p className="text-xs text-gray-500">Scan with any UPI app</p>
                    </div>
                    <div className="flex items-center justify-between bg-white border rounded-lg p-3">
                      <div>
                        <p className="text-xs text-gray-500">UPI ID</p>
                        <p className="font-mono font-bold text-gray-800">{UPI_ID}</p>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(UPI_ID); }}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-blue-700 text-sm mt-3">
                      Amount: <strong>₹{order?.payment?.totalAmount}</strong>
                    </p>
                  </div>
                )}

                {/* ── Bank transfer instructions ── */}
                {!isCOD && paymentTab === 'bank' && (
                  <div className="bg-purple-50 border border-purple-100 rounded-lg p-5 mb-6">
                    <h3 className="font-semibold text-purple-800 mb-3">Bank Transfer Details</h3>
                    <div className="space-y-2 text-sm">
                      {[
                        ['Account Name',   BANK_NAME],
                        ['Account Number', BANK_ACCOUNT],
                        ['IFSC Code',      BANK_IFSC],
                        ['Amount',         `₹${order?.payment?.totalAmount}`],
                        ['Reference',      order?.orderNumber],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between bg-white rounded p-2 border">
                          <span className="text-gray-500">{label}</span>
                          <span className="font-semibold text-gray-800 font-mono text-xs">{val}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-purple-600 text-xs mt-3">
                      Use your Order Number as the payment reference so we can match it.
                    </p>
                  </div>
                )}

                {/* ── Error ── */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                    {error}
                  </div>
                )}

                {/* ── Submission form ── */}
                <form onSubmit={handleSubmitProof} className="space-y-4">
                  {!isCOD && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Transaction / UTR Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={transactionId}
                          onChange={e => setTransactionId(e.target.value)}
                          placeholder="e.g. 123456789012"
                          required
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Find this in your UPI app or bank statement after paying.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          Screenshot URL <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                          type="url"
                          value={paymentProofUrl}
                          onChange={e => setPaymentProofUrl(e.target.value)}
                          placeholder="https://drive.google.com/… or image link"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Upload your screenshot to Google Drive / Imgur and paste the link here.
                        </p>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
                  >
                    {submitting
                      ? 'Submitting…'
                      : isCOD
                      ? 'Confirm Order'
                      : 'Submit Payment Proof'}
                  </button>
                </form>
              </div>
            </div>

            {/* Order summary — right 2 cols */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-5 sticky top-24">
                <h3 className="font-bold text-gray-800 mb-4">Order Summary</h3>

                <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
                  {order?.items?.map(item => (
                    <div key={item._id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.product?.name} × {item.quantity}
                      </span>
                      <span className="font-medium">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{order?.payment?.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span>₹{order?.payment?.deliveryCharge}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                    <span>Total</span>
                    <span className="text-green-700">₹{order?.payment?.totalAmount}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Order #</span>
                    <span className="font-mono">{order?.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Placed</span>
                    <span>{new Date(order?.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="capitalize font-medium text-amber-600">{order?.status}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSubmit;
