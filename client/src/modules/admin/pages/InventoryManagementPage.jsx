import React, { useState, useEffect } from 'react';
import axios from '../../../core/config/axios';
import { useAdmin } from '../hooks/useAdmin';

const InventoryManagementPage = () => {
  const { adminUser } = useAdmin();
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [toast, setToast] = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const [newProductForm, setNewProductForm] = useState({
    name: '',
    description: '',
    category: '',
    basePrice: 0,
    image: null,
    farmerName: ''
  });

  const [inventoryForm, setInventoryForm] = useState({
    productId: '',
    quantity: 0,
    unit: 'kg',
    minThreshold: 10,
    maxCapacity: 100
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [productsRes, inventoryRes] = await Promise.all([
        axios.get('/api/admin/products/all', config),
        axios.get('/api/admin/inventory', config)
      ]);

      setProducts(productsRes.data.products || []);
      setInventory(inventoryRes.data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProductForm.name || !newProductForm.category) {
      showToast('Please fill in required fields');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.post('/api/admin/products/create', {
        ...newProductForm,
        createdBy: adminUser._id
      }, config);

      showToast('✓ Product created successfully');
      setShowProductModal(false);
      setNewProductForm({ name: '', description: '', category: '', basePrice: 0, image: null, farmerName: '' });
      await fetchData();
    } catch (error) {
      showToast('Error creating product');
    }
  };

  const handleUpdateInventory = async () => {
    if (!inventoryForm.productId || !inventoryForm.quantity) {
      showToast('Please fill in all fields');
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.post('/api/admin/inventory/update', {
        ...inventoryForm,
        updatedBy: adminUser._id
      }, config);

      showToast('✓ Inventory updated successfully');
      setShowInventoryModal(false);
      await fetchData();
    } catch (error) {
      showToast('Error updating inventory');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.farmerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (product) => {
    const inv = inventory.find(i => i.productId === product._id);
    if (!inv) return { label: 'No Stock', color: 'bg-red-100 text-red-800' };
    if (inv.quantity > inv.maxCapacity * 0.8) return { label: 'High Stock', color: 'bg-green-100 text-green-800' };
    if (inv.quantity < inv.minThreshold) return { label: 'Low Stock', color: 'bg-red-100 text-red-800' };
    return { label: 'In Stock', color: 'bg-blue-100 text-blue-800' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-farm-green mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  const stats = {
    totalProducts: products.length,
    activeProducts: products.filter(p => p.status === 'active').length,
    lowStock: inventory.filter(i => i.quantity < i.minThreshold).length,
    totalValue: inventory.reduce((sum, i) => sum + (i.quantity * i.currentPrice || 0), 0)
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Inventory & Product Management</h1>
            <p className="text-gray-600">Manage farm products and inventory levels</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowProductModal(true)}
              className="px-6 py-2 bg-farm-green hover:bg-farm-dark-green text-white font-semibold rounded-lg"
            >
              + Add Product
            </button>
            <button
              onClick={() => setShowInventoryModal(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
            >
              + Update Inventory
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm uppercase">Total Products</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalProducts}</p>
            <p className="text-xs text-gray-500 mt-2">{stats.activeProducts} active</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <p className="text-gray-500 text-sm uppercase">Low Stock Items</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.lowStock}</p>
            <p className="text-xs text-gray-500 mt-2">Need restocking</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <p className="text-gray-500 text-sm uppercase">Total Inventory Value</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ₹{(stats.totalValue / 100000).toFixed(1)}L
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <p className="text-gray-500 text-sm uppercase">Categories</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {new Set(products.map(p => p.category)).size}
            </p>
          </div>
        </div>

        {/* Tabs & Filters */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="flex border-b">
            {[
              { id: 'inventory', label: '📦 Inventory' },
              { id: 'products', label: '🥕 Products' },
              { id: 'analytics', label: '📊 Analytics' }
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
            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
              <div>
                <div className="mb-6 overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Current Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Min | Max</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Unit Price</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Stock Value</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {inventory.map((inv) => {
                        const product = products.find(p => p._id === inv.productId);
                        const status = getStockStatus(product || {});
                        return (
                          <tr key={inv._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                              {product?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {inv.quantity} {inv.unit}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {inv.minThreshold} | {inv.maxCapacity}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                              ₹{inv.currentPrice?.toLocaleString('en-IN') || 0}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-green-600">
                              ₹{(inv.quantity * (inv.currentPrice || 0)).toLocaleString('en-IN')}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <button 
                                onClick={() => {
                                  setInventoryForm({
                                    productId: inv.productId,
                                    quantity: inv.quantity,
                                    unit: inv.unit,
                                    minThreshold: inv.minThreshold,
                                    maxCapacity: inv.maxCapacity
                                  });
                                  setShowInventoryModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 font-semibold"
                              >
                                Update
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Products Tab */}
            {activeTab === 'products' && (
              <div>
                <div className="mb-6 flex gap-4">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">All Categories</option>
                    <option value="vegetables">Vegetables</option>
                    <option value="fruits">Fruits</option>
                    <option value="dairy">Dairy</option>
                    <option value="grains">Grains</option>
                  </select>
                  <button
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                  >
                    {viewMode === 'grid' ? '📋 List' : '⊞ Grid'}
                  </button>
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => {
                      const inv = inventory.find(i => i.productId === product._id);
                      return (
                        <div key={product._id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="h-40 bg-gray-200 flex items-center justify-center">
                            🥕
                          </div>
                          <div className="p-4">
                            <h4 className="font-bold text-gray-900 mb-2">{product.name}</h4>
                            <p className="text-sm text-gray-600 mb-3">{product.farmerName}</p>
                            <div className="space-y-2 text-sm mb-4">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Price:</span>
                                <span className="font-semibold">₹{product.basePrice}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Stock:</span>
                                <span className="font-semibold">{inv?.quantity || 0} {inv?.unit}</span>
                              </div>
                            </div>
                            <button className="w-full px-4 py-2 bg-farm-green hover:bg-farm-dark-green text-white font-semibold rounded-lg text-sm">
                              View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredProducts.map((product) => {
                      const inv = inventory.find(i => i.productId === product._id);
                      return (
                        <div key={product._id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{product.name}</h4>
                            <p className="text-sm text-gray-600">{product.farmerName}</p>
                          </div>
                          <div className="flex gap-8 items-center">
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Price</p>
                              <p className="font-bold text-gray-900">₹{product.basePrice}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Stock</p>
                              <p className="font-bold text-gray-900">{inv?.quantity || 0} {inv?.unit}</p>
                            </div>
                            <button className="px-6 py-2 bg-farm-green hover:bg-farm-dark-green text-white font-semibold rounded-lg">
                              Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-4">Top Selling Products</h4>
                    <div className="space-y-3">
                      {products.slice(0, 5).map((p, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-blue-700">{idx + 1}. {p.name}</span>
                          <span className="font-semibold text-blue-900">2,450 units</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <h4 className="font-bold text-green-900 mb-4">Stock Turnover</h4>
                    <div className="text-center py-8">
                      <p className="text-3xl font-bold text-green-600">7.2 days</p>
                      <p className="text-sm text-green-700 mt-2">Average days to sell out</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Add New Product</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Product Name"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({...newProductForm, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <textarea
                  placeholder="Description"
                  value={newProductForm.description}
                  onChange={(e) => setNewProductForm({...newProductForm, description: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows="3"
                />
                <select
                  value={newProductForm.category}
                  onChange={(e) => setNewProductForm({...newProductForm, category: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Category</option>
                  <option value="vegetables">Vegetables</option>
                  <option value="fruits">Fruits</option>
                  <option value="dairy">Dairy</option>
                  <option value="grains">Grains</option>
                </select>
                <input
                  type="number"
                  placeholder="Base Price"
                  value={newProductForm.basePrice}
                  onChange={(e) => setNewProductForm({...newProductForm, basePrice: parseFloat(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddProduct}
                  className="flex-1 px-4 py-2 bg-farm-green hover:bg-farm-dark-green text-white font-semibold rounded-lg"
                >
                  Add Product
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Modal */}
        {showInventoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Update Inventory</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    value={inventoryForm.quantity}
                    onChange={(e) => setInventoryForm({...inventoryForm, quantity: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Min Threshold</label>
                  <input
                    type="number"
                    value={inventoryForm.minThreshold}
                    onChange={(e) => setInventoryForm({...inventoryForm, minThreshold: parseInt(e.target.value)})}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowInventoryModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateInventory}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryManagementPage;
