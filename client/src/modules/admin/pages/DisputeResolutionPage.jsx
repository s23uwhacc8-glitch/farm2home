import React, { useState, useEffect } from 'react';
import axios from '../../../core/config/axios';
import { useAdmin } from '../hooks/useAdmin';

const DisputeResolutionPage = () => {
  const { adminUser } = useAdmin();
  const [disputes, setDisputes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('disputes');
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolutionAction, setResolutionAction] = useState('refund'); // refund, replacement, credit
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [filters, setFilters] = useState({ status: 'all', priority: 'all' });
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [disputesRes, ordersRes] = await Promise.all([
        axios.get(`/api/admin/disputes?status=${filters.status}&priority=${filters.priority}`, config),
        axios.get('/api/admin/orders', config)   // /orders/all doesn't exist; use /orders
      ]);

      setDisputes(disputesRes.data || []);
      setOrders(ordersRes.data.orders || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!resolutionNotes.trim()) {
      showToast('Please provide resolution notes');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.post(`/api/admin/disputes/${selectedDispute._id}/resolve`, {
        action: resolutionAction,
        notes: resolutionNotes,
        resolvedBy: adminUser._id
      }, config);

      showToast('✓ Dispute resolved successfully');
      setShowResolutionModal(false);
      setSelectedDispute(null);
      await fetchData();
    } catch (error) {
      showToast('Error resolving dispute');
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-orange-600 bg-orange-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-farm-green mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  const stats = {
    open: disputes.filter(d => d.status === 'open').length,
    inProgress: disputes.filter(d => d.status === 'in_progress').length,
    resolved: disputes.filter(d => d.status === 'resolved').length,
    high: disputes.filter(d => d.priority === 'high').length
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-white border border-gray-200 shadow-lg rounded-xl px-5 py-3 text-gray-800 font-medium">
            {toast}
          </div>
        )}
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dispute Resolution & Order Management</h1>
          <p className="text-gray-600">Manage customer disputes and order issues</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <p className="text-gray-500 text-sm uppercase">Open Disputes</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.open}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <p className="text-gray-500 text-sm uppercase">In Progress</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.inProgress}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-gray-500 text-sm uppercase">Resolved</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{stats.resolved}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <p className="text-gray-500 text-sm uppercase">High Priority</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">{stats.high}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b">
            {[
              { id: 'disputes', label: '⚠️ Disputes' },
              { id: 'orders', label: '📦 Order Management' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-farm-green text-farm-green'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Disputes Tab */}
            {activeTab === 'disputes' && (
              <div>
                <div className="mb-6 flex gap-4">
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters({...filters, priority: e.target.value})}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">All Priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div className="space-y-4">
                  {disputes.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500 text-lg">No disputes found</p>
                    </div>
                  ) : (
                    disputes.map((dispute) => (
                      <div key={dispute._id} className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-bold text-gray-900">{dispute.title}</h4>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPriorityColor(dispute.priority)}`}>
                                {dispute.priority.toUpperCase()}
                              </span>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                dispute.status === 'open' ? 'bg-red-100 text-red-800' :
                                dispute.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {dispute.status.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            <p className="text-gray-700 mb-3">{dispute.description}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                              <div>
                                <span className="font-semibold">Order:</span> {dispute.orderNumber}
                              </div>
                              <div>
                                <span className="font-semibold">Customer:</span> {dispute.customerName}
                              </div>
                              <div>
                                <span className="font-semibold">Amount:</span> ₹{dispute.amount?.toLocaleString('en-IN')}
                              </div>
                              <div>
                                <span className="font-semibold">Created:</span> {new Date(dispute.createdAt).toLocaleDateString('en-IN')}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedDispute(dispute);
                              setShowResolutionModal(true);
                            }}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                          >
                            Resolve
                          </button>
                        </div>

                        {dispute.messages && dispute.messages.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <h5 className="font-semibold text-gray-900 mb-3">Recent Messages</h5>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {dispute.messages.slice(-3).map((msg, idx) => (
                                <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                                  <p className="font-semibold text-gray-900">{msg.senderName}</p>
                                  <p className="text-gray-700">{msg.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Order Management Tab */}
            {activeTab === 'orders' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Order Management</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Order ID</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Payment</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {orders.map((order) => (
                        <tr key={order._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                            #{order.orderNumber}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {order.customerName}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                            ₹{order.totalAmount?.toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              order.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <button className="text-blue-600 hover:text-blue-800 font-semibold">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resolution Modal */}
        {showResolutionModal && selectedDispute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Resolve Dispute</h3>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">{selectedDispute.title}</h4>
                <p className="text-gray-700 text-sm">{selectedDispute.description}</p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Resolution Action
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'refund', label: '💰 Full Refund', icon: '↩️' },
                      { value: 'replacement', label: '🔄 Replacement', icon: '🔄' },
                      { value: 'credit', label: '💳 Store Credit', icon: '💳' }
                    ].map(action => (
                      <button
                        key={action.value}
                        onClick={() => setResolutionAction(action.value)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          resolutionAction === action.value
                            ? 'border-farm-green bg-green-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-2xl mb-2">{action.icon}</div>
                        <div className="text-sm font-semibold text-gray-900">{action.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Resolution Notes
                  </label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Explain the resolution to the customer..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-green"
                    rows="4"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowResolutionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveDispute}
                  className="flex-1 px-4 py-2 bg-farm-green hover:bg-farm-dark-green text-white font-semibold rounded-lg"
                >
                  Resolve Dispute
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisputeResolutionPage;
