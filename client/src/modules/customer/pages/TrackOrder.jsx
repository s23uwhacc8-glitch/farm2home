import React, { useState, useEffect } from 'react';
import { Package, Search, MapPin, Clock, CheckCircle, XCircle, Truck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from '../../../core/config/axios';
import { useAuth } from '../../../shared/contexts/AuthContext';

const TrackOrder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Logged-in users already have all their orders — redirect to dashboard
  useEffect(() => {
    if (user) navigate('/customer', { replace: true });
  }, [user, navigate]);
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrackOrder = async (e) => {
    e.preventDefault();
    setError('');
    setOrder(null);
    setLoading(true);

    try {
      const payload = { orderId };
      
      // Guest users must provide email
      if (!user) {
        if (!email) {
          setError('Email is required to track guest orders');
          setLoading(false);
          return;
        }
        payload.email = email;
      }

      const { data } = await axios.post('/api/customer/orders/track', payload);
      
      if (data.success) {
        setOrder(data.order);
      } else {
        setError(data.message || 'Order not found');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to track order. Please check your Order ID.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'payment-pending': 'bg-orange-100 text-orange-800 border-orange-300',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
      'ready-for-pickup': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      'out-for-delivery': 'bg-purple-100 text-purple-800 border-purple-300',
      delivered: 'bg-green-100 text-green-800 border-green-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5" />;
      case 'out-for-delivery':
        return <Truck className="w-5 h-5" />;
      case 'pending':
      case 'payment-pending':
        return <Clock className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const formatStatus = (status) => {
    return status
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-4 rounded-full">
              <Package className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Track Your Order
          </h1>
          <p className="text-gray-600">
            {user 
              ? 'Enter your Order ID to track your delivery' 
              : 'Enter your Order ID and email to track your delivery'}
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8">
          <form onSubmit={handleTrackOrder} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Order ID
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Enter your Order ID (e.g., ORD-123456)"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                You can find your Order ID in the confirmation email
              </p>
            </div>

            {/* Email field for guest users only */}
            {!user && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter the email used for checkout"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  Tracking...
                </span>
              ) : (
                'Track Order'
              )}
            </button>
          </form>
        </div>

        {/* Order Details */}
        {order && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className={`p-6 ${getStatusColor(order.status).replace('text-', 'bg-').replace('border-', '')} bg-opacity-10`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-full ${getStatusColor(order.status).replace('border-', 'bg-')}`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Order Status</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {formatStatus(order.status)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Order Number</p>
                    <p className="text-lg font-mono font-semibold text-gray-800">
                      {order.orderNumber}
                    </p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              {order.timeline && order.timeline.length > 0 && (
                <div className="p-6 border-t">
                  <h3 className="font-semibold text-gray-800 mb-4">Order Timeline</h3>
                  <div className="space-y-4">
                    {order.timeline.map((event, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-600' : 'bg-gray-300'}`} />
                          {index < order.timeline.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-300 my-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium text-gray-800">
                            {formatStatus(event.status)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(event.timestamp)}
                          </p>
                          {event.note && (
                            <p className="text-sm text-gray-600 mt-1">{event.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-2">Delivery Address</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {order.deliveryAddress.street}<br />
                    {order.deliveryAddress.city}, {order.deliveryAddress.state}<br />
                    PIN: {order.deliveryAddress.pincode}
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Agent Info */}
            {order.delivery?.agent && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 mb-2">Delivery Agent</h3>
                    <p className="text-gray-800 font-medium">{order.delivery.agent.name}</p>
                    <p className="text-gray-600">📞 {order.delivery.agent.phone}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0">
                    {item.product?.images?.[0] && (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.product?.name}</p>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity} {item.unit}
                      </p>
                      <p className="text-sm font-semibold text-green-600 mt-1">
                        ₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-800">Total Amount</span>
                  <span className="text-green-600">₹{order.payment.totalAmount}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Payment Method: {order.payment.method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
