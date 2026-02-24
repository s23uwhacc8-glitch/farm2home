import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../../../core/config/axios';

const PaymentUpload = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orderData = location.state?.orderData;
  
  const [transactionId, setTransactionId] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Simulated UPI ID for demo
  const UPI_ID = 'farm2home@upi';
  const MERCHANT_NAME = 'Farm2Home';

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB. Please compress your screenshot.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Only image files are accepted (PNG, JPG, etc.)');
      return;
    }

    // Convert to base64 for submission
    // NOTE: base64 is ~33% larger than original; 2MB file → ~2.7MB base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      // Extra guard: base64 string itself should be under 3MB of text
      if (base64.length > 3 * 1024 * 1024) {
        setError('Image is too large after encoding. Please use a smaller screenshot.');
        return;
      }
      setPaymentProof(base64);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async () => {
    if (!transactionId.trim()) {
      setError('Please enter transaction/reference ID');
      return;
    }

    if (!paymentProof) {
      setError('Please upload payment screenshot');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Create order with payment proof
      const response = await axios.post('/api/customer/orders', {
        ...orderData,
        payment: {
          ...orderData.payment,
          transactionId,
          paymentProof,
          provider: 'upi'
        }
      });

      // Success - redirect to order confirmation
      navigate('/payment-success', { 
        state: { 
          order: response.data.order,
          message: 'Payment proof submitted! Waiting for admin approval.'
        } 
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit payment');
    } finally {
      setUploading(false);
    }
  };

  if (!orderData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">No order data found</p>
          <button
            onClick={() => navigate('/checkout')}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Go to Checkout
          </button>
        </div>
      </div>
    );
  }

  const amount = orderData.payment?.totalAmount || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-green-100 rounded-full mb-4">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Complete Payment</h1>
          <p className="text-gray-600">Pay ₹{amount} to confirm your order</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Left: Payment Instructions */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-3 text-sm font-bold">1</span>
              Pay via UPI
            </h2>

            {/* QR Code Placeholder */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 mb-6 text-center border-2 border-dashed border-green-300">
              <div className="w-48 h-48 bg-white rounded-lg mx-auto mb-4 flex items-center justify-center shadow-md">
                <div className="text-center">
                  <svg className="w-32 h-32 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="3" height="3"/>
                    <rect x="9" y="3" width="3" height="3"/>
                    <rect x="15" y="3" width="3" height="3"/>
                    <rect x="3" y="9" width="3" height="3"/>
                    <rect x="15" y="9" width="3" height="3"/>
                    <rect x="3" y="15" width="3" height="3"/>
                    <rect x="9" y="15" width="3" height="3"/>
                    <rect x="15" y="15" width="3" height="3"/>
                  </svg>
                  <p className="text-xs text-gray-500 mt-2">QR Code</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">Scan with any UPI app</p>
              <p className="text-xs text-gray-500">(Google Pay, PhonePe, Paytm, etc.)</p>
            </div>

            {/* UPI ID */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Or pay to UPI ID:</p>
              <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                <code className="text-green-600 font-mono font-semibold">{UPI_ID}</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(UPI_ID);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  {copied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Amount Details */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">₹{orderData.payment?.subtotal || 0}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Delivery:</span>
                <span className="font-semibold">₹{orderData.payment?.deliveryCharge || 0}</span>
              </div>
              <div className="border-t border-green-200 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-800">Total Amount:</span>
                  <span className="text-2xl font-bold text-green-600">₹{amount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Upload Proof */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-3 text-sm font-bold">2</span>
              Submit Payment Proof
            </h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Transaction ID */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction/Reference ID *
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g., 123456789012"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Enter the 12-digit transaction ID from your UPI app</p>
            </div>

            {/* File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Screenshot *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                {paymentProof ? (
                  <div className="relative">
                    <img src={paymentProof} alt="Payment proof" className="max-h-64 mx-auto rounded-lg" />
                    <button
                      onClick={() => setPaymentProof('')}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-600 mb-1">Click to upload screenshot</p>
                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-sm">
              <p className="font-semibold text-blue-900 mb-2">📌 Important:</p>
              <ul className="space-y-1 text-blue-800 text-xs">
                <li>• Take a clear screenshot of the payment success screen</li>
                <li>• Make sure transaction ID is visible</li>
                <li>• Admin will verify within 24 hours</li>
                <li>• You'll get email confirmation once approved</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitPayment}
              disabled={uploading}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : 'Submit Payment Proof'}
            </button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            🔒 Your payment information is secure. We never store card/bank details.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentUpload;
