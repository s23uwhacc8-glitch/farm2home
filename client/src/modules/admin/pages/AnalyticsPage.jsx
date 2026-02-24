import React, { useState, useEffect } from 'react';
import axios from '../../../core/config/axios';
import { useAdmin } from '../hooks/useAdmin';

const AnalyticsPage = () => {
  const { adminUser, canViewReports } = useAdmin();
  const [timeRange, setTimeRange] = useState('month'); // day, week, month, year
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('revenue');
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    if (canViewReports()) {
      fetchAnalytics();
    }
  }, [timeRange, canViewReports]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const response = await axios.get(`/api/admin/analytics?timeRange=${timeRange}`, config);
      setAnalytics(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  };

  const downloadReport = async (format) => {
    try {
      const token = localStorage.getItem('adminToken');
      const config = { 
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      };

      const response = await axios.get(
        `/api/admin/reports/export?format=${format}&timeRange=${timeRange}`,
        config
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `farm2home-report-${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error downloading report:', error);
      showToast('Failed to download report');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-farm-green mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon, label, value, trend, color = 'blue' }) => (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '📈' : '📉'} {Math.abs(trend)}% from last period
            </p>
          )}
        </div>
        <span className="text-4xl">{icon}</span>
      </div>
    </div>
  );

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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics & Reports</h1>
            <p className="text-gray-600">Comprehensive platform insights and metrics</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadReport('pdf')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg"
            >
              📄 PDF Report
            </button>
            <button
              onClick={() => downloadReport('csv')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
            >
              📊 Export CSV
            </button>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="bg-white rounded-lg shadow p-4 mb-8">
          <div className="flex gap-2">
            {['day', 'week', 'month', 'year'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  timeRange === range
                    ? 'bg-farm-green text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon="💰"
            label="Total Revenue"
            value={`₹${analytics?.revenue?.total?.toLocaleString('en-IN') || 0}`}
            trend={analytics?.revenue?.trend}
          />
          <StatCard
            icon="📦"
            label="Total Orders"
            value={analytics?.orders?.total || 0}
            trend={analytics?.orders?.trend}
          />
          <StatCard
            icon="👥"
            label="Active Users"
            value={analytics?.users?.active || 0}
            trend={analytics?.users?.trend}
          />
          <StatCard
            icon="✅"
            label="Order Completion"
            value={`${analytics?.orders?.completionRate || 0}%`}
            trend={analytics?.orders?.completionTrend}
          />
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Revenue Trends</h3>
            <div className="h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-600 mb-2">Chart visualization would go here</p>
                <p className="text-sm text-gray-500">Revenue data: {JSON.stringify(analytics?.revenue?.daily || []).slice(0, 50)}...</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h4 className="font-semibold text-gray-900 mb-2">Revenue Breakdown:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Gross Revenue:</span>
                  <span className="font-semibold">₹{analytics?.revenue?.gross?.toLocaleString('en-IN') || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Commission:</span>
                  <span className="font-semibold text-orange-600">₹{analytics?.revenue?.commission?.toLocaleString('en-IN') || 0}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Platform Revenue:</span>
                  <span className="font-semibold text-green-600">₹{analytics?.revenue?.net?.toLocaleString('en-IN') || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Top Performers</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-2">Top Farmers</h4>
                {analytics?.topFarmers?.map((farmer, idx) => (
                  <div key={idx} className="flex justify-between text-sm mb-2 p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">{idx + 1}. {farmer.name}</span>
                    <span className="font-semibold text-gray-900">₹{farmer.sales?.toLocaleString('en-IN') || 0}</span>
                  </div>
                ))}
              </div>
              <hr />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-2">Top Products</h4>
                {analytics?.topProducts?.map((product, idx) => (
                  <div key={idx} className="flex justify-between text-sm mb-2 p-2 bg-gray-50 rounded">
                    <span className="text-gray-700">{idx + 1}. {product.name}</span>
                    <span className="font-semibold">{product.units} units</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b flex">
            {[
              { id: 'sales', label: '📊 Sales', icon: '💹' },
              { id: 'users', label: '👥 Users', icon: '👤' },
              { id: 'payments', label: '💳 Payments', icon: '💰' },
              { id: 'orders', label: '📦 Orders', icon: '🎯' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedMetric(tab.id)}
                className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                  selectedMetric === tab.id
                    ? 'border-b-2 border-farm-green text-farm-green'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {selectedMetric === 'sales' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Sales Performance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-blue-600">₹{analytics?.sales?.total?.toLocaleString('en-IN') || 0}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Order Value</p>
                    <p className="text-2xl font-bold text-green-600">₹{analytics?.sales?.avgOrderValue?.toLocaleString('en-IN') || 0}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Category Sales</p>
                    <ul className="text-sm mt-2 space-y-1">
                      {analytics?.sales?.byCategory?.map((cat, idx) => (
                        <li key={idx} className="text-purple-700">{cat.name}: ₹{cat.amount?.toLocaleString('en-IN')}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600">Growth Rate</p>
                    <p className="text-2xl font-bold text-orange-600">{analytics?.sales?.growth || 0}%</p>
                  </div>
                </div>
              </div>
            )}

            {selectedMetric === 'users' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">User Analytics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-indigo-600">{analytics?.users?.total || 0}</p>
                  </div>
                  <div className="p-4 bg-pink-50 rounded-lg">
                    <p className="text-sm text-gray-600">New Users (This Period)</p>
                    <p className="text-2xl font-bold text-pink-600">{analytics?.users?.new || 0}</p>
                  </div>
                  <div className="p-4 bg-cyan-50 rounded-lg">
                    <p className="text-sm text-gray-600">Customers</p>
                    <p className="text-2xl font-bold text-cyan-600">{analytics?.users?.customers || 0}</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-600">Farmers</p>
                    <p className="text-2xl font-bold text-yellow-600">{analytics?.users?.farmers || 0}</p>
                  </div>
                  <div className="p-4 bg-lime-50 rounded-lg">
                    <p className="text-sm text-gray-600">Delivery Partners</p>
                    <p className="text-2xl font-bold text-lime-600">{analytics?.users?.delivery || 0}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">User Retention</p>
                    <p className="text-2xl font-bold text-red-600">{analytics?.users?.retention || 0}%</p>
                  </div>
                </div>
              </div>
            )}

            {selectedMetric === 'payments' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Payment Analytics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-emerald-600">{analytics?.payments?.total || 0}</p>
                  </div>
                  <div className="p-4 bg-teal-50 rounded-lg">
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-teal-600">{analytics?.payments?.successRate || 0}%</p>
                  </div>
                  <div className="p-4 bg-violet-50 rounded-lg">
                    <p className="text-sm text-gray-600">Failed Payments</p>
                    <p className="text-2xl font-bold text-violet-600">{analytics?.payments?.failed || 0}</p>
                  </div>
                  <div className="p-4 bg-fuchsia-50 rounded-lg">
                    <p className="text-sm text-gray-600">Pending Approvals</p>
                    <p className="text-2xl font-bold text-fuchsia-600">{analytics?.payments?.pending || 0}</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <h5 className="font-semibold text-gray-900 mb-2">Payment Methods Used:</h5>
                  <div className="space-y-2">
                    {analytics?.payments?.byMethod?.map((method, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">{method.name}</span>
                        <span className="font-semibold">{method.percentage}% ({method.count} transactions)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {selectedMetric === 'orders' && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Order Analytics</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-orange-600">{analytics?.orders?.total || 0}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Delivered</p>
                    <p className="text-2xl font-bold text-green-600">{analytics?.orders?.delivered || 0}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">In Transit</p>
                    <p className="text-2xl font-bold text-blue-600">{analytics?.orders?.inTransit || 0}</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{analytics?.orders?.pending || 0}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">Cancelled</p>
                    <p className="text-2xl font-bold text-red-600">{analytics?.orders?.cancelled || 0}</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Delivery Time</p>
                    <p className="text-2xl font-bold text-purple-600">{analytics?.orders?.avgDeliveryTime || 0} hrs</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
