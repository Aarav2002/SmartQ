import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const ServiceProviderSearch = () => {
  const [providers, setProviders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [joiningQueue, setJoiningQueue] = useState(null);
  const [currentlyBeingServed, setCurrentlyBeingServed] = useState(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('customerBeingServed', handleBeingServed);
      socket.on('serviceCompleted', handleServiceCompleted);
      socket.on('queueUpdated', handleQueueUpdate);
      return () => {
        socket.off('customerBeingServed');
        socket.off('serviceCompleted');
        socket.off('queueUpdated');
      };
    }
  }, [socket]);

  const fetchProviders = async () => {
    try {
      console.log('Fetching providers...');
      const response = await fetch('http://localhost:3001/api/providers');
      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Providers data:', data);
      setProviders(data);
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBeingServed = (data) => {
    if (data.customer.user._id === user.id) {
      setCurrentlyBeingServed(data.customer);
    }
  };

  const handleServiceCompleted = (data) => {
    if (currentlyBeingServed && currentlyBeingServed._id === data.entryId) {
      setCurrentlyBeingServed(null);
    }
  };

  const handleQueueUpdate = (data) => {
    fetchProviders();
  };

  const joinQueue = async (providerId) => {
    if (currentlyBeingServed) {
      alert('You cannot join a queue while being served. Please wait for your current service to complete.');
      return;
    }

    setJoiningQueue(providerId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/queue/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ providerId })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`Successfully joined queue! You are #${data.position} in line.`);
      } else {
        alert(data.message || 'Failed to join queue');
      }
    } catch (err) {
      console.error('Failed to join queue:', err);
      alert('Failed to join queue. Please try again.');
    } finally {
      setJoiningQueue(null);
    }
  };

  const filteredProviders = providers.filter(provider =>
    provider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isUserBeingServed = currentlyBeingServed && currentlyBeingServed.user._id === user.id;

  console.log('Render state:', { loading, providers: providers.length, filteredProviders: filteredProviders.length });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isUserBeingServed && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>You are currently being served</strong> at {currentlyBeingServed.provider.name}. 
                You cannot join other queues until your service is complete.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Available Services</h3>
        <input
          type="text"
          placeholder="Search services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 w-64"
        />
      </div>

      {filteredProviders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No services available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <div key={provider._id} className="bg-white rounded-xl shadow-lg border p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{provider.name}</h4>
                  <p className="text-gray-600 text-sm">{provider.description}</p>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                  <span className="text-sm text-green-600 font-medium">Open</span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Queue Length:</span>
                  <span className="font-medium">{provider.queueLength || 0} people</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Est. Wait Time:</span>
                  <span className="font-medium text-orange-600">
                    {((provider.queueLength || 0) * 10)} min
                  </span>
                </div>
              </div>

              <button
                onClick={() => joinQueue(provider._id)}
                disabled={joiningQueue === provider._id || isUserBeingServed}
                className={`w-full py-2 px-4 rounded-lg font-medium transition ${
                  isUserBeingServed 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : joiningQueue === provider._id
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {joiningQueue === provider._id ? 'Joining...' : 
                 isUserBeingServed ? 'Currently Being Served' : 'Join Queue'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServiceProviderSearch;
