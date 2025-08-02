import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext.jsx';

const ServiceProviderManagement = () => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providerQueue, setProviderQueue] = useState([]);
  const [newProvider, setNewProvider] = useState({
    name: '',
    category: '',
    location: '',
    status: 'open'
  });
  const { socket } = useSocket();

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('queueUpdated', handleQueueUpdate);
      return () => socket.off('queueUpdated');
    }
  }, [socket, selectedProvider]);

  const fetchProviders = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/providers');
      const data = await response.json();
      setProviders(data);
    } catch (err) {
      setError('Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  };

  const handleQueueUpdate = (data) => {
    if (selectedProvider && data.providerId === selectedProvider._id) {
      fetchProviderQueue(selectedProvider._id);
    }
  };

  const fetchProviderQueue = async (providerId) => {
    try {
      const response = await fetch(`http://localhost:3001/api/queue/provider/${providerId}`);
      const data = await response.json();
      setProviderQueue(data);
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    }
  };

  const createProvider = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/providers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProvider)
      });

      if (!response.ok) throw new Error('Failed to create provider');
      
      const data = await response.json();
      setProviders([data, ...providers]);
      setNewProvider({ name: '', category: '', location: '', status: 'open' });
      setShowCreateModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateProvider = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/providers/${editingProvider._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingProvider)
      });

      if (!response.ok) throw new Error('Failed to update provider');
      
      const data = await response.json();
      setProviders(providers.map(p => p._id === data._id ? data : p));
      setEditingProvider(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeFromQueue = async (entryId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/queue/status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entryId, status: 'skipped' })
      });

      if (!response.ok) throw new Error('Failed to remove from queue');
    } catch (err) {
      setError(err.message);
    }
  };

  const viewQueue = (provider) => {
    setSelectedProvider(provider);
    fetchProviderQueue(provider._id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Service Provider Management</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add New Store
        </button>
      </div>

      {/* Providers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map(provider => (
          <div key={provider._id} className="bg-white p-4 rounded-lg shadow border">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-lg">{provider.name}</h4>
              <span className={`px-2 py-1 rounded text-xs ${
                provider.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {provider.status}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-1">{provider.category}</p>
            <p className="text-gray-500 text-xs mb-3">{provider.location}</p>
            <div className="flex space-x-2">
              <button
                onClick={() => viewQueue(provider)}
                className="flex-1 bg-purple-500 text-white py-1 px-2 rounded text-sm hover:bg-purple-600"
              >
                View Queue
              </button>
              <button
                onClick={() => setEditingProvider(provider)}
                className="flex-1 bg-yellow-500 text-white py-1 px-2 rounded text-sm hover:bg-yellow-600"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Provider Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96">
            <h4 className="text-lg font-semibold mb-4">Add New Store</h4>
            <form onSubmit={createProvider} className="space-y-4">
              <input
                type="text"
                placeholder="Store Name"
                value={newProvider.name}
                onChange={(e) => setNewProvider({...newProvider, name: e.target.value})}
                className="w-full border p-2 rounded"
                required
              />
              <select
                value={newProvider.category}
                onChange={(e) => setNewProvider({...newProvider, category: e.target.value})}
                className="w-full border p-2 rounded"
                required
              >
                <option value="">Select Category</option>
                <option value="Clinic">Clinic</option>
                <option value="Salon">Salon</option>
                <option value="Repair">Repair</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Bank">Bank</option>
                <option value="Other">Other</option>
              </select>
              <input
                type="text"
                placeholder="Location"
                value={newProvider.location}
                onChange={(e) => setNewProvider({...newProvider, location: e.target.value})}
                className="w-full border p-2 rounded"
                required
              />
              <select
                value={newProvider.status}
                onChange={(e) => setNewProvider({...newProvider, status: e.target.value})}
                className="w-full border p-2 rounded"
              >
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
              <div className="flex space-x-2">
                <button type="submit" className="flex-1 bg-blue-500 text-white py-2 rounded">
                  Create Store
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Queue View Modal */}
      {selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-2/3 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold">
                Queue for {selectedProvider.name} ({providerQueue.length} waiting)
              </h4>
              <button
                onClick={() => setSelectedProvider(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {providerQueue.map((entry, index) => (
                <div key={entry._id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">#{index + 1} - {entry.user.name}</span>
                    <span className="text-gray-500 text-sm ml-2">({entry.user.email})</span>
                    <div className="text-xs text-gray-400">
                      Joined: {new Date(entry.joinedAt).toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromQueue(entry._id)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {providerQueue.length === 0 && (
                <div className="text-center text-gray-500 py-8">No customers in queue</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceProviderManagement;