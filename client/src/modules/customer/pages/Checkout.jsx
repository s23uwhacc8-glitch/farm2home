import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useCart } from '../../../shared/contexts/CartContext';
import axios from '../../../core/config/axios';

const Checkout = () => {
  const { user } = useAuth();
  const { cart, getCartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });
  const [addr, setAddr] = useState({
    street: '', city: '', state: '', pincode: '', landmark: '',
    contactName: user?.name || '', contactPhone: user?.phone || '',
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Prevent the "cart is empty → redirect to /cart" effect from firing after
  // we intentionally clear the cart during checkout submission.
  const submittedRef = useRef(false);

  useEffect(() => {
    if (user) setAddr(p => ({
      ...p,
      contactName:  user.name           || p.contactName,
      contactPhone: user.phone          || p.contactPhone,
      street:       user.address?.street  || p.street,
      city:         user.address?.city    || p.city,
      state:        user.address?.state   || p.state,
      pincode:      user.address?.pincode || p.pincode,
    }));
  }, [user]);

  useEffect(() => { if (cart.length === 0 && !submittedRef.current) navigate('/cart'); }, [cart.length, navigate]);

  const subtotal = getCartTotal();
  const delivery = 40;
  const total    = subtotal + delivery;

  const setG = e => setGuestInfo(p => ({ ...p, [e.target.name]: e.target.value }));
  const setA = e => setAddr(p => ({ ...p, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!user && (!guestInfo.name || !guestInfo.email || !guestInfo.phone))
      return 'Please fill in all guest details.';
    if (!addr.street || !addr.city || !addr.state || !addr.pincode)
      return 'Please fill in your complete delivery address.';
    if (!/^\d{6}$/.test(addr.pincode)) return 'Pincode must be 6 digits.';
    return null;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      const orderData = {
        items: cart.map(item => ({ product: item.product._id, quantity: item.quantity })),
        paymentMethod,
        deliveryAddress: { ...addr,
          contactName:  addr.contactName  || (user?.name  ?? guestInfo.name),
          contactPhone: addr.contactPhone || (user?.phone ?? guestInfo.phone),
        },
        guest: user ? null : guestInfo,
      };
      if (paymentMethod === 'online') {
        submittedRef.current = true;
        navigate('/payment-upload', { state: { orderData: {
          ...orderData, payment: { method: 'online', subtotal, deliveryCharge: delivery, totalAmount: total }
        }}});
        return;
      }
      const response = await axios.post('/api/customer/orders', orderData);
      submittedRef.current = true;
      clearCart();
      navigate('/payment-success', { state: { order: response.data.order, message: 'Order placed! Pay cash on delivery.' }});
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally { setLoading(false); }
  };

  if (cart.length === 0) return null;

  const inp = 'field text-sm';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>
          <p className="text-sm text-gray-400 mt-0.5">{cart.length} item{cart.length !== 1 ? 's' : ''} · ₹{total.toLocaleString('en-IN')} total</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Forms */}
            <div className="lg:col-span-3 space-y-4">

              {/* Guest details */}
              {!user && (
                <div className="card p-6">
                  <h2 className="text-base font-bold text-gray-900 mb-4">Your Details</h2>
                  <div className="space-y-3">
                    <input type="text" name="name" placeholder="Full name *" value={guestInfo.name} onChange={setG} required className={inp} />
                    <input type="email" name="email" placeholder="Email address *" value={guestInfo.email} onChange={setG} required className={inp} />
                    <input type="tel" name="phone" placeholder="Phone (10 digits) *" value={guestInfo.phone} onChange={setG} required pattern="[0-9]{10}" className={inp} />
                  </div>
                </div>
              )}

              {/* Logged-in user info */}
              {user && (
                <div className="card p-5">
                  <h2 className="text-base font-bold text-gray-900 mb-3">Logged in as</h2>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#22c55e,#15803d)' }}>
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                      <p className="text-gray-400 text-xs">{user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Address */}
              <div className="card p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">Delivery Address</h2>
                <div className="space-y-3">
                  <input type="text" name="street" placeholder="Street address *" value={addr.street} onChange={setA} required className={inp} />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" name="city" placeholder="City *" value={addr.city} onChange={setA} required className={inp} />
                    <input type="text" name="state" placeholder="State *" value={addr.state} onChange={setA} required className={inp} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" name="pincode" placeholder="Pincode *" value={addr.pincode} onChange={setA} required pattern="[0-9]{6}" maxLength={6} className={inp} />
                    <input type="text" name="landmark" placeholder="Landmark (optional)" value={addr.landmark} onChange={setA} className={inp} />
                  </div>
                  <input type="text" name="contactName" placeholder="Receiver's name *" value={addr.contactName} onChange={setA} required className={inp} />
                  <input type="tel" name="contactPhone" placeholder="Receiver's phone *" value={addr.contactPhone} onChange={setA} required pattern="[0-9]{10}" className={inp} />
                </div>
              </div>

              {/* Payment method */}
              <div className="card p-6">
                <h2 className="text-base font-bold text-gray-900 mb-4">Payment Method</h2>
                <div className="space-y-3">
                  {[
                    { value: 'cod',    icon: '💵', label: 'Cash on Delivery',        desc: 'Pay when your order arrives' },
                    { value: 'online', icon: '📱', label: 'Online Payment (UPI/Card)', desc: 'Pay now — faster confirmation' },
                  ].map(opt => (
                    <label key={opt.value}
                      className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                        ${paymentMethod === opt.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-200'}`}>
                      <input type="radio" name="payment" value={opt.value}
                        checked={paymentMethod === opt.value}
                        onChange={e => setPaymentMethod(e.target.value)}
                        className="w-4 h-4 accent-green-600" />
                      <span className="text-xl">{opt.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{opt.label}</p>
                        <p className="text-gray-400 text-xs">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="lg:col-span-2">
              <div className="card p-6 sticky top-24">
                <h2 className="text-base font-bold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div key={item.product._id} className="flex justify-between text-sm">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-gray-900 font-medium truncate">{item.product.name}</p>
                        <p className="text-gray-400 text-xs">{item.quantity} × ₹{item.product.price}</p>
                      </div>
                      <span className="font-semibold text-gray-900 flex-shrink-0">
                        ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-4 space-y-2 mb-5">
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-700">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Delivery</span>
                    <span className="font-medium text-gray-700">₹{delivery}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-green-600">₹{total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Placing Order…
                      </span>
                    : paymentMethod === 'online' ? 'Continue to Payment →' : 'Place Order →'}
                </button>
                <p className="text-center text-xs text-gray-400 mt-3">🔒 Secure checkout</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
