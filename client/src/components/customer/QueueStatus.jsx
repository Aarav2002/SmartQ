import React, { useState, useEffect } from 'react';
import { useSocket } from '../../context/SocketContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const QueueStatus = () => {
  const [myQueues, setMyQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentlyBeingServed, setCurrentlyBeingServed] = useState(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [servingStartTime, setServingStartTime] = useState(null);
  const [estimatedWaitTimes, setEstimatedWaitTimes] = useState({});
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    fetchMyQueues();
  }, [user]);

  useEffect(() => {
    if (socket) {
      socket.on('queueUpdated', handleQueueUpdate);
      socket.on('queueStatusChanged', handleQueueStatusChange);
      socket.on('customerBeingServed', handleBeingServed);
      socket.on('serviceTimeUpdated', handleServiceTimeUpdate);
      socket.on('serviceCompleted', handleServiceCompleted);
      return () => {
        socket.off('queueUpdated');
        socket.off('queueStatusChanged');
        socket.off('customerBeingServed');
        socket.off('serviceTimeUpdated');
        socket.off('serviceCompleted');
      };
    }
  }, [socket]);

  // Countdown timer for when being served
  useEffect(() => {
    let interval;
    if (currentlyBeingServed && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime(prev => {
          const newTime = Math.max(0, prev - (1/60)); // Decrease by 1 second (1/60 of a minute)
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentlyBeingServed, remainingTime]);

  // Update estimated wait times for all queues in real-time
  useEffect(() => {
    let interval;
    if (myQueues.length > 0) {
      interval = setInterval(() => {
        updateEstimatedWaitTimes();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [myQueues, currentlyBeingServed, remainingTime, servingStartTime]);

  const updateEstimatedWaitTimes = () => {
    const newEstimatedTimes = {};
    
    myQueues.forEach(queue => {
      // Get current serving customer's remaining time for this provider
      let currentServingTime = 0;
      if (currentlyBeingServed && currentlyBeingServed.provider._id === queue.provider._id) {
        // Use real-time remaining time that decreases every second
        currentServingTime = Math.max(0, remainingTime);
      }
      
      // Calculate estimated wait time based on position
      const defaultServiceTime = 10; // minutes per customer
      const peopleAhead = Math.max(0, queue.position - 1);
      const estimatedTime = currentServingTime + (peopleAhead * defaultServiceTime);
      
      newEstimatedTimes[queue._id] = Math.max(0, estimatedTime);
    });
    
    setEstimatedWaitTimes(newEstimatedTimes);
  };

  const fetchMyQueues = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/queue/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setMyQueues(data.filter(q => q.status === 'waiting'));
    } catch (err) {
      console.error('Failed to fetch queues:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQueueUpdate = (data) => {
    if (myQueues.some(q => q.provider._id === data.providerId)) {
      fetchMyQueues();
    }
  };

  const handleQueueStatusChange = (data) => {
    fetchMyQueues();
  };

  const leaveQueue = async (providerId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/queue/leave', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ providerId })
      });

      if (response.ok) {
        fetchMyQueues();
      }
    } catch (err) {
      console.error('Failed to leave queue:', err);
    }
  };

  const getEstimatedWaitTime = (queue) => {
    // Always use the real-time calculated wait time
    return estimatedWaitTimes[queue._id] !== undefined ? estimatedWaitTimes[queue._id] : (queue.position * 10);
  };

  const handleBeingServed = (data) => {
    // Check if this customer is being served
    if (data.customer.user._id === user.id) {
      setCurrentlyBeingServed(data.customer);
      setRemainingTime(data.estimatedTime);
      setServingStartTime(data.startTime);
    } else {
      // Update serving info for wait time calculations
      setCurrentlyBeingServed(data.customer);
      setRemainingTime(data.estimatedTime);
      setServingStartTime(data.startTime);
    }
  };

  const handleServiceTimeUpdate = (data) => {
    if (currentlyBeingServed && currentlyBeingServed._id === data.entryId) {
      setRemainingTime(data.remainingTime);
    }
  };

  const handleServiceCompleted = (data) => {
    if (currentlyBeingServed && currentlyBeingServed._id === data.entryId) {
      if (currentlyBeingServed.user._id === user.id) {
        // This user was being served
        setCurrentlyBeingServed(null);
        setRemainingTime(0);
        setServingStartTime(null);
      } else {
        // Someone else completed service, clear serving state
        setCurrentlyBeingServed(null);
        setRemainingTime(0);
        setServingStartTime(null);
      }
      fetchMyQueues();
    }
  };

  const formatTime = (totalMinutes) => {
    const totalSeconds = Math.floor(totalMinutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  // Check if this user is currently being served
  const isUserBeingServed = currentlyBeingServed && currentlyBeingServed.user._id === user.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Currently Being Served Banner */}
      {isUserBeingServed && (
        <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-green-500 text-white rounded-full">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800">You're Being Served!</h3>
                <p className="text-green-700">at {currentlyBeingServed.provider.name}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {formatTime(remainingTime)}
              </div>
              <div className="text-sm text-green-600">Estimated Time Remaining</div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-green-100 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Please stay nearby!</strong> Your service is in progress. 
              The time shown may be adjusted based on your specific needs.
            </p>
          </div>
        </div>
      )}

      {myQueues.length === 0 && !isUserBeingServed ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <div className="h-16 w-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Queues</h3>
          <p className="text-gray-600">You're not currently in any queues. Find services to join a queue.</p>
        </div>
      ) : (
        myQueues.map((queue) => (
          <div key={queue._id} className="bg-white rounded-xl shadow-lg border-2 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{queue.provider.name}</h3>
                <p className="text-gray-600">{queue.provider.description}</p>
                <div className="flex items-center mt-2">
                  <span className="inline-block w-3 h-3 bg-green-400 rounded-full mr-2"></span>
                  <span className="text-sm text-green-600 font-medium">Open</span>
                </div>
              </div>
              <button
                onClick={() => leaveQueue(queue.provider._id)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                Leave Queue
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
              <div className="text-sm">
                <span className="text-gray-500">Joined:</span>
                <div className="font-medium">{new Date(queue.joinedAt).toLocaleString()}</div>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Position:</span>
                <div className="font-medium text-blue-600">#{queue.position}</div>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Est. Wait Time:</span>
                <div className="font-medium text-orange-600 text-lg">
                  {formatTime(getEstimatedWaitTime(queue))}
                </div>
              </div>
            </div>

            {/* Real-time wait time info */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-700 font-medium">Live Wait Time</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600">
                    {formatTime(getEstimatedWaitTime(queue))}
                  </div>
                  <div className="text-xs text-blue-600">Updates in real-time</div>
                </div>
              </div>
              
              {currentlyBeingServed && currentlyBeingServed.provider._id === queue.provider._id && !isUserBeingServed && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <div className="flex items-center justify-between text-xs text-blue-600">
                    <span>Currently serving: {currentlyBeingServed.user.name}</span>
                    <span>Time left: {formatTime(remainingTime)}</span>
                  </div>
                </div>
              )}
            </div>

            {queue.position <= 3 && queue.status === 'waiting' && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="h-5 w-5 bg-yellow-400 rounded-full mr-2" />
                  <p className="text-sm text-yellow-800">
                    <strong>You're almost up!</strong> Please be ready as your turn is approaching.
                  </p>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default QueueStatus; 
