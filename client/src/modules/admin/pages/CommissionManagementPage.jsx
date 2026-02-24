import React, { useState, useEffect } from 'react';
import axios from '../../../core/config/axios';
import { useAdmin } from '../hooks/useAdmin';

const CommissionManagementPage = () => {
  const { adminUser, canManageCommissions } = useAdmin();
  const [commissions, setCommissions] = useState([]);
  const [commissionRates, setCommissionRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rates');
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [newRate, setNewRate] = useState(null);
  const [earningsFilter, setEarningsFilter] = useState('all');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const [newRateForm, setNewRateForm] = useState({
    type: 'global', // global, category, farmer
    value: 0,
    category: '',
    farmerName: ''
  });

  useEffect(() => {
    if (canManageCommissions()) {
      fetchData();
    }
  }, [canManageCommissions]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [ratesRes, commissionsRes] = await Promise.all([
        axios.get('/api/admin/commissions/rates', config),
        axios.get('/api/admin/commissions/tracking', config)
      ]);

      setCommissionRates(ratesRes.data.rates || ratesRes.data || {});
      setCommissions(commissionsRes.data.commissions || commissionsRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching commission data:', error);
      setLoading(false);
    }
  };

  const handleUpdateRate = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.post('/api/admin/commissions/update-rate', {
        ...newRateForm,
        updatedBy: adminUser._id
      }, config);

      showToast('✓ Commission rate updated successfully');
      setShowRateModal(false);
      setNewRateForm({ type: 'global', value: 0, category: '', farmerName: '' });
      await fetchData();
    } catch (error) {
      showToast('Error updating commission rate');
    }
  };

  const handleSchedulePayout = async (farmerId) => {
    if (!window.confirm('Schedule payout for this farmer?')) return;

    try {
      setPayoutLoading(true);
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.post(`/api/admin/commissions/schedule-payout/${farmerId}`, {
        approvedBy: adminUser._id
      }, config);

      showToast('✓ Payout scheduled successfully');
      await fetchData();
    } catch (error) {
      showToast('Error scheduling payout');
    } finally {
      setPayoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-farm-green mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading commission data...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Commission Management</h1>
          <p className="text-gray-600">Manage commission rates and farmer payouts</p>
        </div>

        {/* Commission Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm uppercase">Global Commission Rate</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {commissionRates.find(r => r.type === 'global')?.value || 0}%
            </p>
            <p className="text-xs text-gray-500 mt-2">Applied to all transactions</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-gray-500 text-sm uppercase">Total Commissions Collected</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ₹{(commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0) / 100000).toFixed(0)}L
            </p>
            <p className="text-xs text-gray-500 mt-2">Lifetime total</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <p className="text-gray-500 text-sm uppercase">Pending Farmer Payouts</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              ₹{(commissions
                .filter(c => c.status === 'pending_payout')
                .reduce((sum, c) => sum + (c.farmerEarnings || 0), 0))
                .toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-gray-500 mt-2">Ready to pay out</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <p className="text-gray-500 text-sm uppercase">Farmers on Platform</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {new Set(commissions.map(c => c.farmerId)).size}
            </p>
            <p className="text-xs text-gray-500 mt-2">Active farmers</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b">
            {[
              { id: 'rates', label: '📊 Commission Rates' },
              { id: 'tracking', label: '💰 Earnings Tracking' },
              { id: 'payouts', label: '🏦 Payouts' },
              { id: 'reports', label: '📈 Reports' }
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
            {/* Commission Rates Tab */}
            {activeTab === 'rates' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Commission Rate Settings</h3>
                  <button
                    onClick={() => setShowRateModal(true)}
                    className="px-6 py-2 bg-farm-green hover:bg-farm-dark-green text-white font-semibold rounded-lg"
                  >
                    + Add/Update Rate
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Global Rate */}
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
                    <h4 className="font-bold text-blue-900 mb-2">Global Commission Rate</h4>
                    <p className="text-3xl font-bold text-blue-600 mb-2">
                      {commissionRates.find(r => r.type === 'global')?.value || 2.5}%
                    </p>
                    <p className="text-sm text-blue-700">Default rate applied to all transactions</p>
                  </div>

                  {/* Category Rates */}
                  <div className="border rounded-lg p-6">
                    <h4 className="font-bold text-gray-900 mb-4">Category-Specific Rates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {commissionRates
                        .filter(r => r.type === 'category')
                        .map((rate, idx) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded border">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-gray-900">{rate.category}</p>
                                <p className="text-2xl font-bold text-green-600 mt-2">{rate.value}%</p>
                              </div>
                              <button
                                onClick={() => {
                                  setNewRateForm({
                                    type: 'category',
                                    category: rate.category,
                                    value: rate.value
                                  });
                                  setShowRateModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Farmer-Specific Rates */}
                  <div className="border rounded-lg p-6">
                    <h4 className="font-bold text-gray-900 mb-4">Farmer-Specific Rates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {commissionRates
                        .filter(r => r.type === 'farmer')
                        .map((rate, idx) => (
                          <div key={idx} className="bg-purple-50 p-4 rounded border">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-gray-900">{rate.farmerName}</p>
                                <p className="text-sm text-gray-600 mb-2">Special rate</p>
                                <p className="text-2xl font-bold text-purple-600">{rate.value}%</p>
                              </div>
                              <button
                                onClick={() => {
                                  setNewRateForm({
                                    type: 'farmer',
                                    farmerName: rate.farmerName,
                                    value: rate.value
                                  });
                                  setShowRateModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                ✏️ Edit
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Earnings Tracking Tab */}
            {activeTab === 'tracking' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Farmer Earnings Tracking</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Farmer</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Gross Sales</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Commission Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Commission Paid</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Farmer Earnings</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {commissions.map((commission, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                            {commission.farmerName}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            ₹{commission.grossSales?.toLocaleString('en-IN') || 0}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {commission.commissionRate}%
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-orange-600">
                            ₹{commission.commissionAmount?.toLocaleString('en-IN') || 0}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-green-600">
                            ₹{commission.farmerEarnings?.toLocaleString('en-IN') || 0}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              commission.status === 'paid' ? 'bg-green-100 text-green-800' :
                              commission.status === 'pending_payout' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {commission.status === 'paid' ? '✓ Paid' :
                               commission.status === 'pending_payout' ? '⏳ Pending' :
                               'Processing'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payouts Tab */}
            {activeTab === 'payouts' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Farmer Payouts</h3>
                <div className="space-y-4">
                  {commissions
                    .filter(c => c.status === 'pending_payout')
                    .map((commission, idx) => (
                      <div key={idx} className="border rounded-lg p-6 bg-yellow-50 hover:bg-yellow-100 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900 mb-2">{commission.farmerName}</h4>
                            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                              <div>
                                <p className="text-gray-600">Total Earnings</p>
                                <p className="text-2xl font-bold text-green-600">
                                  ₹{commission.farmerEarnings?.toLocaleString('en-IN')}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">Number of Orders</p>
                                <p className="text-2xl font-bold text-blue-600">{commission.orderCount || 0}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Last Updated</p>
                                <p className="text-sm text-gray-700 mt-2">
                                  {new Date(commission.lastUpdated).toLocaleDateString('en-IN')}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700">
                              Bank: {commission.bankDetails?.bankName} | A/C: {commission.bankDetails?.accountNumber?.slice(-4)}****
                            </p>
                          </div>
                          <button
                            onClick={() => handleSchedulePayout(commission.farmerId)}
                            disabled={payoutLoading}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg disabled:opacity-50"
                          >
                            {payoutLoading ? 'Processing...' : '💳 Schedule Payout'}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">Commission Reports</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-4">Monthly Summary</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span>Total Platform Revenue:</span>
                        <span className="font-semibold">₹1,50,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Commissions:</span>
                        <span className="font-semibold text-orange-600">₹3,750</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Farmer Payouts:</span>
                        <span className="font-semibold text-green-600">₹1,46,250</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h4 className="font-bold text-green-900 mb-4">Top Commission Earners</h4>
                    <div className="space-y-2 text-sm">
                      {commissions.slice(0, 3).map((c, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{idx + 1}. {c.farmerName}</span>
                          <span className="font-semibold">₹{c.commissionAmount?.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rate Modal */}
        {showRateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {newRateForm.type === 'global' ? 'Update Global Commission Rate' :
                 newRateForm.type === 'category' ? 'Set Category Commission Rate' :
                 'Set Farmer-Specific Rate'}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Commission Type
                  </label>
                  <select
                    value={newRateForm.type}
                    onChange={(e) => setNewRateForm({...newRateForm, type: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="global">Global (All Transactions)</option>
                    <option value="category">Category-Specific</option>
                    <option value="farmer">Farmer-Specific</option>
                  </select>
                </div>

                {newRateForm.type === 'category' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={newRateForm.category}
                      onChange={(e) => setNewRateForm({...newRateForm, category: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Category</option>
                      <option value="vegetables">Vegetables</option>
                      <option value="fruits">Fruits</option>
                      <option value="dairy">Dairy</option>
                      <option value="grains">Grains</option>
                    </select>
                  </div>
                )}

                {newRateForm.type === 'farmer' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Farmer Name
                    </label>
                    <input
                      type="text"
                      value={newRateForm.farmerName}
                      onChange={(e) => setNewRateForm({...newRateForm, farmerName: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="Select or enter farmer name"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={newRateForm.value}
                    onChange={(e) => setNewRateForm({...newRateForm, value: parseFloat(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., 2.5"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRate}
                  className="flex-1 px-4 py-2 bg-farm-green hover:bg-farm-dark-green text-white font-semibold rounded-lg"
                >
                  Save Rate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommissionManagementPage;
