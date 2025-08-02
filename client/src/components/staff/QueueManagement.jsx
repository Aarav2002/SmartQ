import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const QueueManagement = () => {
  const [queue, setQueue] = useState([]);
  const [serviceTime, setServiceTime] = useState(10);
  const [loading, setLoading] = useState(true);
  const [updatingEntry, setUpdatingEntry] = useState(null);
  const [editingServiceTime, setEditingServiceTime] = useState(null);
  const [customServiceTimes, setCustomServiceTimes] = useState({});
  const [currentlyServing, setCurrentlyServing] = useState(null);
  const [servingStartTime, setServingStartTime] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [allServingCustomers, setAllServingCustomers] = useState([]); // Track all customers being served
  const { socket } = useSocket();
  const { user } = useAuth();

  // Restore serving state from localStorage on component mount
  useEffect(() => {
    const savedServingState = localStorage.getItem(`currentlyServing_${user.id}`);
    if (savedServingState) {
      try {
        const { customer, startTime, estimatedTime, customTimes } = JSON.parse(savedServingState);
        const elapsed = (Date.now() - startTime) / 1000 / 60; // elapsed in minutes
        const remaining = Math.max(0, estimatedTime - elapsed);
        
        if (remaining > 0) {
          setCurrentlyServing(customer);
          setServingStartTime(startTime);
          setRemainingTime(remaining);
          setCustomServiceTimes(customTimes || {});
        } else {
          // Service time has expired, clear saved state
          localStorage.removeItem(`currentlyServing_${user.id}`);
        }
      } catch (error) {
        console.error('Error restoring serving state:', error);
        localStorage.removeItem(`currentlyServing_${user.id}`);
      }
    }
  }, [user.id]);

  // Save serving state to localStorage whenever it changes
  useEffect(() => {
    if (currentlyServing && servingStartTime) {
      const servingState = {
        customer: currentlyServing,
        startTime: servingStartTime,
        estimatedTime: getCustomerServiceTime(currentlyServing._id),
        customTimes: customServiceTimes,
        staffId: user.id
      };
      localStorage.setItem(`currentlyServing_${user.id}`, JSON.stringify(servingState));
    } else {
      localStorage.removeItem(`currentlyServing_${user.id}`);
    }
  }, [currentlyServing, servingStartTime, customServiceTimes, user.id]);

  useEffect(() => {
    fetchQueue();
  }, [user]);

  useEffect(() => {
    if (socket) {
      socket.on('queueUpdated', handleQueueUpdate);
      socket.on('customerBeingServed', handleCustomerBeingServed);
      socket.on('serviceTimeUpdated', handleServiceTimeUpdated);
      socket.on('allServingCustomers', handleAllServingCustomers);
      return () => {
        socket.off('queueUpdated');
        socket.off('customerBeingServed');
        socket.off('serviceTimeUpdated');
        socket.off('allServingCustomers');
      };
    }
  }, [socket]);

  // Countdown timer effect
  useEffect(() => {
    let interval;
    if (currentlyServing && servingStartTime) {
      interval = setInterval(() => {
        const elapsed = (Date.now() - servingStartTime) / 1000; // elapsed in seconds
        const totalServiceTimeSeconds = getCustomerServiceTime(currentlyServing._id) * 60;
        const newRemainingSeconds = totalServiceTimeSeconds - elapsed;
        const newRemainingMinutes = newRemainingSeconds / 60;
        
        // Allow negative time for overtime display
        setRemainingTime(newRemainingMinutes);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentlyServing, servingStartTime, customServiceTimes]);

  const handleAllServingCustomers = (data) => {
    setAllServingCustomers(data.servingCustomers || []);
  };

  const handleCustomerBeingServed = (data) => {
    // Update all serving customers list
    setAllServingCustomers(prev => {
      const existing = prev.find(c => c.customer._id === data.customer._id);
      if (!existing) {
        return [...prev, data];
      }
      return prev;
    });

    // Only update current serving if this staff member started serving
    if (data.staffId === user.id && (!currentlyServing || currentlyServing._id !== data.customer._id)) {
      setCurrentlyServing(data.customer);
      setServingStartTime(data.startTime);
      setRemainingTime(data.estimatedTime);
    }
  };

  const handleServiceTimeUpdated = (data) => {
    if (data.entryId === currentlyServing?._id && data.staffId === user.id) {
      setCustomServiceTimes(prev => ({
        ...prev,
        [data.entryId]: data.newTime
      }));
      // Recalculate remaining time
      const elapsed = (Date.now() - servingStartTime) / 1000;
      const newRemainingSeconds = Math.max(0, (data.newTime * 60) - elapsed);
      setRemainingTime(newRemainingSeconds / 60);
    }
  };

  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/store/queue', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setQueue(data);
      
      // Also fetch current serving status from server
      const servingResponse = await fetch('http://localhost:3001/api/store/serving-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const servingData = await servingResponse.json();
      
      // If server has serving data and we don't have local data, use server data
      if (servingData && !currentlyServing) {
        setCurrentlyServing(servingData);
        // Calculate remaining time based on server data
        const elapsed = (Date.now() - new Date(servingData.updatedAt).getTime()) / 1000 / 60;
        const remaining = Math.max(0, 10 - elapsed); // assuming 10 min default
        setRemainingTime(remaining);
        setServingStartTime(new Date(servingData.updatedAt).getTime());
      }
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQueueUpdate = () => {
    fetchQueue();
  };

  const updateQueueStatus = async (entryId, status) => {
    setUpdatingEntry(entryId);
    try {
      const token = localStorage.getItem('token');
      
      if (status === 'serving') {
        // Check if customer is already being served by another staff
        const alreadyServing = allServingCustomers.find(s => s.customer._id === entryId);
        if (alreadyServing) {
          alert('This customer is already being served by another staff member.');
          return;
        }

        // Start serving this customer
        const customer = queue.find(q => q._id === entryId);
        const serviceTimeMinutes = getCustomerServiceTime(entryId);
        const startTime = Date.now();
        
        setCurrentlyServing(customer);
        setServingStartTime(startTime);
        setRemainingTime(serviceTimeMinutes);
        
        // Emit to all clients that this customer is being served
        socket.emit('startServing', {
          entryId,
          customer,
          startTime,
          estimatedTime: serviceTimeMinutes,
          staffId: user.id,
          staffName: user.name
        });
      }

      await fetch('http://localhost:3001/api/store/queue/status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          entryId, 
          status,
          staffId: user.id
        })
      });
      
      fetchQueue();
    } catch (err) {
      console.error('Failed to update queue status:', err);
    } finally {
      setUpdatingEntry(null);
    }
  };

  const updateServiceTime = async (e) => {
    const newTime = Number(e.target.value);
    setServiceTime(newTime);
    // TODO: Add API call to update service time for the store
  };

  const getEstimatedWaitTime = (position) => {
    return position * serviceTime;
  };

  const getWaitingTime = (joinedAt) => {
    const now = new Date();
    const joined = new Date(joinedAt);
    const diffInMinutes = Math.floor((now - joined) / (1000 * 60));
    return diffInMinutes;
  };

  const getCustomerServiceTime = (entryId) => {
    const customTime = customServiceTimes[entryId];
    const defaultTime = serviceTime;
    
    if (customTime !== undefined && !isNaN(customTime) && customTime > 0) {
      return Number(customTime);
    }
    return Number(defaultTime) || 10;
  };

  const updateCustomServiceTime = (entryId, newTime) => {
    const timeValue = Number(newTime);
    if (!isNaN(timeValue) && timeValue > 0) {
      setCustomServiceTimes(prev => ({
        ...prev,
        [entryId]: Math.max(1, timeValue)
      }));
    }
  };

  const saveCustomServiceTime = (entryId) => {
    const newTime = getCustomerServiceTime(entryId);
    setEditingServiceTime(null);
    
    // If this is the currently serving customer, update the countdown
    if (currentlyServing && currentlyServing._id === entryId && servingStartTime) {
      const elapsed = (Date.now() - servingStartTime) / 1000;
      const newRemainingSeconds = (newTime * 60) - elapsed;
      const newRemainingMinutes = newRemainingSeconds / 60;
      
      // Update remaining time immediately (can be negative for overtime)
      setRemainingTime(newRemainingMinutes);
      
      // Emit service time update to all clients
      socket.emit('updateServiceTime', {
        entryId,
        newTime,
        remainingTime: newRemainingMinutes,
        staffId: user.id
      });
    }
  };

  const finishServing = async () => {
    if (!currentlyServing) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Complete service
      await fetch('http://localhost:3001/api/store/queue/status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          entryId: currentlyServing._id, 
          status: 'served',
          staffId: user.id
        })
      });

      // Clear local state
      setCurrentlyServing(null);
      setServingStartTime(null);
      setRemainingTime(0);
      localStorage.removeItem(`currentlyServing_${user.id}`);
      
      // Emit completion to all clients
      socket.emit('completeService', { 
        entryId: currentlyServing._id,
        staffId: user.id
      });
      
      fetchQueue();
    } catch (err) {
      console.error('Failed to finish serving:', err);
    }
  };

  const formatTime = (totalMinutes) => {
    if (!totalMinutes || isNaN(totalMinutes)) {
      return "0:00";
    }
    
    const isNegative = totalMinutes < 0;
    const absoluteMinutes = Math.abs(totalMinutes);
    const totalSeconds = Math.floor(absoluteMinutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let timeString;
    if (hours > 0) {
      timeString = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return isNegative ? `-${timeString}` : timeString;
  };

  const isCustomerBeingServed = (entryId) => {
    return allServingCustomers.some(s => s.customer._id === entryId);
  };

  const getServingStaffName = (entryId) => {
    const serving = allServingCustomers.find(s => s.customer._id === entryId);
    return serving ? serving.staffName : null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded shadow p-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded shadow p-6">
      {/* Currently Serving Section */}
      {currentlyServing && (
        <div className="mb-6 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-green-800">Currently Serving</h3>
            <button
              onClick={finishServing}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center space-x-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Finish Service</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-green-600">Customer:</span>
              <div className="font-medium text-green-900">{currentlyServing.user.name}</div>
              <div className="text-sm text-green-700">{currentlyServing.user.email}</div>
            </div>
            <div>
              <span className="text-sm text-green-600">Service Started:</span>
              <div className="font-medium text-green-900">
                {new Date(servingStartTime).toLocaleTimeString()}
              </div>
            </div>
            <div>
              <span className="text-sm text-green-600">Time Remaining:</span>
              <div className={`text-2xl font-bold ${remainingTime <= 0 ? 'text-red-600 animate-pulse' : 'text-green-800'}`}>
                {remainingTime <= 0 ? 'OVERTIME' : formatTime(remainingTime)}
              </div>
              {remainingTime <= 0 && (
                <div className="text-xs text-red-600 font-medium">
                  Service time exceeded - please finish or extend
                </div>
              )}
            </div>
          </div>
          
          {/* Service time adjustment */}
          <div className="mt-4 pt-4 border-t border-green-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-700">Adjust service time:</span>
              <div className="flex items-center space-x-2">
                {editingServiceTime === currentlyServing._id ? (
                  <>
                    <input
                      type="number"
                      value={customServiceTimes[currentlyServing._id] || getCustomerServiceTime(currentlyServing._id)}
                      onChange={(e) => updateCustomServiceTime(currentlyServing._id, e.target.value)}
                      className="border border-green-300 p-1 rounded w-16 text-center text-sm"
                      min={1}
                      max={120}
                    />
                    <button
                      onClick={() => saveCustomServiceTime(currentlyServing._id)}
                      className="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => setEditingServiceTime(null)}
                      className="bg-gray-500 text-white px-2 py-1 rounded text-sm hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-green-800">
                      {getCustomerServiceTime(currentlyServing._id)} min
                    </span>
                    <button
                      onClick={() => setEditingServiceTime(currentlyServing._id)}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Quick adjustment buttons */}
            {editingServiceTime === currentlyServing._id && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-xs text-green-600">Quick adjust:</span>
                {['+5', '+10', '+15', '-5', '-10'].map(adjustment => (
                  <button
                    key={adjustment}
                    onClick={() => {
                      const current = getCustomerServiceTime(currentlyServing._id);
                      const newTime = Math.max(1, current + parseInt(adjustment));
                      updateCustomServiceTime(currentlyServing._id, newTime);
                    }}
                    className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs hover:bg-green-200"
                  >
                    {adjustment}m
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Queue Management</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Default Service Time (min):</label>
            <input
              type="number"
              value={serviceTime}
              onChange={updateServiceTime}
              className="border border-gray-300 p-2 rounded w-20 text-center"
              min={1}
              max={60}
            />
          </div>
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {queue.length} in queue
          </div>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-12">
          <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No customers in queue</h4>
          <p className="text-gray-600">Customers will appear here when they join the queue</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((entry, index) => {
            const isCurrentlyServing = currentlyServing && currentlyServing._id === entry._id;
            const isBeingServedByOther = isCustomerBeingServed(entry._id) && !isCurrentlyServing;
            const servingStaffName = getServingStaffName(entry._id);
            
            return (
              <div key={entry._id} className={`p-6 rounded-xl border-2 ${
                isCurrentlyServing ? 'bg-green-50 border-green-300' : 
                isBeingServedByOther ? 'bg-yellow-50 border-yellow-300' :
                'bg-white border-gray-200'
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl font-bold text-blue-600">#{index + 1}</span>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{entry.user.name}</h4>
                        <p className="text-sm text-gray-600">{entry.user.email}</p>
                      </div>
                    </div>
                    
                    {isBeingServedByOther && (
                      <div className="mb-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
                        <span className="text-sm text-yellow-800 font-medium">
                          Being served by: {servingStaffName}
                        </span>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Joined:</span>
                        <div className="font-medium">{new Date(entry.joinedAt).toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Waiting:</span>
                        <div className="font-medium text-orange-600">
                          {Math.floor((Date.now() - new Date(entry.joinedAt)) / (1000 * 60))} min
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    {!isCurrentlyServing && !isBeingServedByOther ? (
                      <>
                        <button
                          onClick={() => updateQueueStatus(entry._id, 'serving')}
                          disabled={updatingEntry === entry._id || currentlyServing}
                          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          Start Serving
                        </button>
                        
                        <button
                          onClick={() => updateQueueStatus(entry._id, 'skipped')}
                          disabled={updatingEntry === entry._id}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          Skip
                        </button>
                      </>
                    ) : isCurrentlyServing ? (
                      <span className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-center font-medium">
                        Currently Serving
                      </span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-center font-medium text-sm">
                        Served by {servingStaffName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Queue Statistics */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-700 mb-4">Queue Statistics</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{queue.length}</div>
            <div className="text-sm text-gray-600">Total in Queue</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {queue.length > 0 ? Math.round(queue.reduce((acc, entry, index) => acc + getEstimatedWaitTime(index), 0) / queue.length) : 0}
            </div>
            <div className="text-sm text-gray-600">Avg Est. Wait (min)</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {queue.filter(entry => getWaitingTime(entry.joinedAt) > 30).length}
            </div>
            <div className="text-sm text-gray-600">High Priority</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{serviceTime}</div>
            <div className="text-sm text-gray-600">Service Time (min)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueManagement;
