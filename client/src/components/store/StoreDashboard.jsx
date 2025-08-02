import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext.jsx';

const StoreDashboard = () => {
  const [activeTab, setActiveTab] = useState('queue');
  const [store, setStore] = useState(null);
  const [queue, setQueue] = useState([]);
  const [staff, setStaff] = useState([]);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '' });
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [removingStaff, setRemovingStaff] = useState(null);
  const [editingStore, setEditingStore] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: '',
    category: '',
    location: '',
    description: '',
    phone: '',
    status: 'open'
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    fetchStoreData();
    fetchQueue();
    fetchStaff();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('queueUpdated', handleQueueUpdate);
      return () => socket.off('queueUpdated');
    }
  }, [socket]);

  const fetchStoreData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/store/my-store', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStore(data);
      setStoreForm({
        name: data.name || '',
        category: data.category || '',
        location: data.location || '',
        description: data.description || '',
        phone: data.phone || '',
        status: data.status || 'open'
      });
    } catch (err) {
      console.error('Failed to fetch store data:', err);
    }
  };

  const updateStoreInfo = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/store/my-store', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storeForm)
      });

      if (response.ok) {
        const updatedStore = await response.json();
        setStore(updatedStore);
        setEditingStore(false);
        alert('Store information updated successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to update store information');
      }
    } catch (err) {
      console.error('Failed to update store:', err);
      alert('Failed to update store information');
    } finally {
      setUpdateLoading(false);
    }
  };

  const cancelEdit = () => {
    setStoreForm({
      name: store.name || '',
      category: store.category || '',
      location: store.location || '',
      description: store.description || '',
      phone: store.phone || '',
      status: store.status || 'open'
    });
    setEditingStore(false);
  };

  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/store/queue', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setQueue(data);
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    }
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/store/staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStaff(data);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    }
  };

  const handleQueueUpdate = () => {
    fetchQueue();
  };

  const updateQueueStatus = async (entryId, status) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:3001/api/store/queue/status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ entryId, status })
      });
    } catch (err) {
      console.error('Failed to update queue status:', err);
    }
  };

  const addStaff = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/store/staff', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newStaff)
      });

      if (response.ok) {
        fetchStaff();
        setNewStaff({ name: '', email: '', password: '' });
        setShowAddStaff(false);
      }
    } catch (err) {
      console.error('Failed to add staff:', err);
    }
  };

  const removeStaff = async (staffId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/store/staff/${staffId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchStaff();
        setRemovingStaff(null);
      }
    } catch (err) {
      console.error('Failed to remove staff:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto mt-8 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-6">
        {store?.name} - Store Dashboard
      </h2>
      
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-2 px-4 ${activeTab === 'queue' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          Queue Management ({queue.length})
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-2 px-4 ${activeTab === 'staff' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          Staff Management ({staff.length})
        </button>
        <button
          onClick={() => setActiveTab('store')}
          className={`pb-2 px-4 ${activeTab === 'store' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          Store Settings
        </button>
      </div>

      {/* Store Settings */}
      {activeTab === 'store' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Store Information</h3>
            {!editingStore && (
              <button
                onClick={() => setEditingStore(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Edit Store Info
              </button>
            )}
          </div>

          {editingStore ? (
            <form onSubmit={updateStoreInfo} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    value={storeForm.name}
                    onChange={(e) => setStoreForm({...storeForm, name: e.target.value})}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={storeForm.category}
                    onChange={(e) => setStoreForm({...storeForm, category: e.target.value})}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={storeForm.location}
                    onChange={(e) => setStoreForm({...storeForm, location: e.target.value})}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={storeForm.phone}
                    onChange={(e) => setStoreForm({...storeForm, phone: e.target.value})}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Store Status
                  </label>
                  <select
                    value={storeForm.status}
                    onChange={(e) => setStoreForm({...storeForm, status: e.target.value})}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={storeForm.description}
                  onChange={(e) => setStoreForm({...storeForm, description: e.target.value})}
                  rows="4"
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your store, services, or any special information..."
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={updateLoading}
                  className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {updateLoading ? 'Updating...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Store Name</h4>
                  <p className="text-gray-900 text-lg">{store?.name}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Category</h4>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {store?.category}
                  </span>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Location</h4>
                  <p className="text-gray-900">{store?.location}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Phone</h4>
                  <p className="text-gray-900">{store?.phone || 'Not provided'}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Status</h4>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    store?.status === 'open' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {store?.status === 'open' ? 'Open' : 'Closed'}
                  </span>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Created</h4>
                  <p className="text-gray-900">
                    {store?.createdAt ? new Date(store.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {store?.description && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-700 mb-2">Description</h4>
                  <p className="text-gray-900 leading-relaxed">{store.description}</p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-medium text-gray-700 mb-4">Store Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">{queue.length}</div>
                    <div className="text-sm text-gray-600">Current Queue</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">{staff.length}</div>
                    <div className="text-sm text-gray-600">Staff Members</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="text-2xl font-bold text-purple-600">
                      {store?.status === 'open' ? 'Active' : 'Inactive'}
                    </div>
                    <div className="text-sm text-gray-600">Store Status</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Queue Management */}
      {activeTab === 'queue' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Current Queue</h3>
          <div className="space-y-3">
            {queue.map((entry, index) => (
              <div key={entry._id} className="flex justify-between items-center p-4 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">#{index + 1} - {entry.user.name}</span>
                  <span className="text-gray-500 text-sm ml-2">({entry.user.email})</span>
                  <div className="text-xs text-gray-400">
                    Joined: {new Date(entry.joinedAt).toLocaleString()}
                  </div>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => updateQueueStatus(entry._id, 'served')}
                    className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                  >
                    Serve
                  </button>
                  <button
                    onClick={() => updateQueueStatus(entry._id, 'skipped')}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ))}
            {queue.length === 0 && (
              <div className="text-center text-gray-500 py-8">No customers in queue</div>
            )}
          </div>
        </div>
      )}

      {/* Staff Management */}
      {activeTab === 'staff' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Staff Members</h3>
            <button
              onClick={() => setShowAddStaff(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Add Staff
            </button>
          </div>
          
          <div className="space-y-3">
            {staff.map(member => (
              <div key={member._id} className="flex justify-between items-center p-4 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{member.name}</div>
                  <div className="text-gray-500 text-sm">{member.email}</div>
                  <div className="text-xs text-gray-400">
                    Joined: {new Date(member.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    Staff
                  </span>
                  <button
                    onClick={() => setRemovingStaff(member)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {staff.length === 0 && (
              <div className="text-center text-gray-500 py-8">No staff members added yet</div>
            )}
          </div>

          {/* Add Staff Modal */}
          {showAddStaff && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-96">
                <h4 className="text-lg font-semibold mb-4">Add Staff Member</h4>
                <form onSubmit={addStaff} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                    className="w-full border p-2 rounded"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                    className="w-full border p-2 rounded"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                    className="w-full border p-2 rounded"
                    required
                  />
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                    >
                      Add Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddStaff(false)}
                      className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Remove Staff Confirmation Modal */}
          {removingStaff && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-96">
                <h4 className="text-lg font-semibold mb-4">Remove Staff Member</h4>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to remove <strong>{removingStaff.name}</strong> from your staff? 
                  This action cannot be undone.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => removeStaff(removingStaff._id)}
                    className="flex-1 bg-red-500 text-white py-2 rounded hover:bg-red-600"
                  >
                    Remove Staff
                  </button>
                  <button
                    onClick={() => setRemovingStaff(null)}
                    className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoreDashboard;


