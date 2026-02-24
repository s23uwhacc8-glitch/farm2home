import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../../shared/contexts/CartContext';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();
  const navigate  = useNavigate();
  const subtotal  = getCartTotal();
  const delivery  = subtotal > 0 ? 40 : 0;
  const total     = subtotal + delivery;
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  if (cart.length === 0) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-24 h-24 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-8 text-sm">Add some fresh produce from local farmers to get started.</p>
        <Link to="/products" className="btn-primary">Browse Products →</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
            <p className="text-sm text-gray-400 mt-0.5">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors">
            Clear all
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            {cart.map(item => (
              <div key={item.product._id} className="card p-5 flex gap-4">
                <img
                  src={item.product.images?.[0] || 'https://placehold.co/80x80?text=?'}
                  alt={item.product.name}
                  className="w-20 h-20 object-cover rounded-xl flex-shrink-0 bg-gray-100"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug">{item.product.name}</h3>
                      <p className="text-gray-400 text-xs mt-0.5">₹{item.product.price} / {item.product.unit}</p>
                      {item.product.farmer?.name && (
                        <p className="text-green-600 text-xs mt-0.5 font-medium">🌾 {item.product.farmer.name}</p>
                      )}
                    </div>
                    <span className="font-bold text-gray-900 text-sm flex-shrink-0">
                      ₹{(item.product.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-lg font-medium transition-colors">−</button>
                      <span className="w-8 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                        disabled={item.quantity >= (item.product.stock ?? Infinity)}
                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                    </div>
                    <button onClick={() => removeFromCart(item.product._id)}
                      className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">Remove</button>
                  </div>
                </div>
              </div>
            ))}

            <Link to="/products"
              className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium mt-1 transition-colors">
              ← Continue Shopping
            </Link>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Order Summary</h2>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({itemCount} items)</span>
                  <span className="font-medium text-gray-900">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery</span>
                  <span className="font-medium text-gray-900">₹{delivery}</span>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4 flex justify-between items-center mb-5">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-green-600">₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-5 text-xs text-green-700">
                🚚 Flat ₹40 delivery · Farm-fresh guaranteed
              </div>
              <button onClick={() => navigate('/checkout')} className="btn-primary w-full text-base py-4">
                Checkout →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
