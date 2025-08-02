import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement.jsx';
import ServiceProviderManagement from './ServiceProviderManagement.jsx';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    total_waiting: 0,
    avg_wait_time: 0,
    served_today: 0,
    skipped_today: 0,
  });

  useEffect(() => {
    // Placeholder for API call
    setStats({
      total_waiting: 10,
      avg_wait_time: 15,
      served_today: 5,
      skipped_today: 2,
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto mt-8 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
      
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2 px-4 ${activeTab === 'overview' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('providers')}
          className={`pb-2 px-4 ${activeTab === 'providers' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          Store Management
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2 px-4 ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          User Management
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-3xl font-bold text-blue-600">{stats.total_waiting}</div>
              <div className="text-gray-600">Total Waiting</div>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <div className="text-3xl font-bold text-purple-600">{stats.avg_wait_time} min</div>
              <div className="text-gray-600">Avg Wait Time</div>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <div className="text-3xl font-bold text-green-600">{stats.served_today}</div>
              <div className="text-gray-600">Served Today</div>
            </div>
            <div className="bg-red-50 p-4 rounded">
              <div className="text-3xl font-bold text-red-600">{stats.skipped_today}</div>
              <div className="text-gray-600">Skipped Today</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'providers' && <ServiceProviderManagement />}
      {activeTab === 'users' && <UserManagement />}
    </div>
  );
};

export default AdminDashboard; 
