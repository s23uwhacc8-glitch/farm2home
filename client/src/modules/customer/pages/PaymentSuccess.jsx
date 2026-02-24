import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const PaymentSuccess = () => {
  const { order, message } = useLocation().state || {};

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-gray-500 mb-6">No order information found.</p>
        <Link to="/products" className="btn-primary">Continue Shopping</Link>
      </div>
    </div>
  );

  const isOnline     = order.payment?.method === 'online';
  const isCod        = order.payment?.method === 'cod';
  const status       = order.payment?.approvalStatus || 'pending';
  const statusLabel  = { approved: '✓ Verified & Approved', verified: '⏳ Awaiting Admin Review', rejected: '✗ Rejected', pending: isCod ? '🕐 Pay on Delivery' : '⏳ Pending Verification' };
  const statusColor  = { approved: 'text-green-600', verified: 'text-blue-600', rejected: 'text-red-600', pending: isCod ? 'text-amber-600' : 'text-yellow-600' };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Success banner */}
        <div className="card p-8 text-center">
          <div className="relative inline-block mb-5">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
              style={{ background: 'linear-gradient(135deg,#22c55e,#15803d)' }}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="absolute top-0 left-0 w-20 h-20 rounded-full animate-ping"
              style={{ background: 'rgba(34,197,94,0.2)' }} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h1>
          <p className="text-gray-500 text-sm">{message || 'Your order has been confirmed.'}</p>
        </div>

        {/* Order detail */}
        <div className="card p-6">
          <div className="flex justify-between items-start mb-5 pb-5 border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Order Number</p>
              <p className="text-xl font-bold text-gray-900">#{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total</p>
              <p className="text-xl font-bold text-green-600">₹{order.payment?.totalAmount?.toLocaleString('en-IN') || '—'}</p>
            </div>
          </div>

          {/* Payment status */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Payment</p>
              <p className={`text-sm font-bold ${statusColor[status] || 'text-gray-700'}`}>{statusLabel[status] || status}</p>
            </div>
            <span className="text-sm font-semibold text-gray-500 uppercase">{order.payment?.method}</span>
          </div>

          {/* Items */}
          <div className="mb-5">
            <p className="text-sm font-bold text-gray-700 mb-3">Items ({order.items?.length || 0})</p>
            <div className="space-y-2">
              {order.items?.slice(0, 3).map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                  <span className="text-gray-600">{item.product?.name || 'Product'} × {item.quantity}</span>
                  <span className="font-semibold text-gray-800">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                </div>
              ))}
              {order.items?.length > 3 && <p className="text-xs text-gray-400 text-center pt-1">+ {order.items.length - 3} more items</p>}
            </div>
          </div>

          {/* Delivery address */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wider">📍 Delivering to</p>
            <p className="text-sm text-gray-700">
              {order.deliveryAddress?.street}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state} — {order.deliveryAddress?.pincode}
            </p>
          </div>
        </div>

        {/* What's next (COD) */}
        {!isOnline && (
          <div className="card p-5 border-l-4 border-amber-400">
            <p className="font-bold text-gray-800 mb-2">💵 Cash on Delivery — What happens next?</p>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li>✓ Order confirmed — no upfront payment needed</li>
              <li>✓ A delivery agent will be assigned to your order</li>
              <li>✓ Keep <strong>₹{order.payment?.totalAmount?.toLocaleString('en-IN')}</strong> in cash ready for the delivery agent</li>
              <li>✓ Pay when your order arrives at your doorstep</li>
            </ul>
          </div>
        )}

        {/* What's next (online payment) */}
        {isOnline && status === 'pending' && (
          <div className="card p-5 border-l-4 border-yellow-400">
            <p className="font-bold text-gray-800 mb-2">What happens next?</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Payment proof submitted</li>
              <li>✓ Admin will verify within 24 hours</li>
              <li>✓ Order confirmed once approved</li>
            </ul>
          </div>
        )}

        {status === 'rejected' && order.payment?.rejectionReason && (
          <div className="card p-5 border-l-4 border-red-400">
            <p className="font-bold text-red-800 mb-1">Payment Rejected</p>
            <p className="text-sm text-red-700">{order.payment.rejectionReason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="grid sm:grid-cols-2 gap-3">
          <Link to="/customer" className="btn-primary w-full justify-center py-4">View My Orders →</Link>
          <Link to="/products" className="btn-outline w-full justify-center py-4">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
