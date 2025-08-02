import React from 'react';
import QueueManagement from './QueueManagement.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const StaffDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-6xl mx-auto mt-8 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Staff Dashboard</h2>
        <p className="text-gray-600 mt-1">Welcome back, {user?.name}! Manage your store's queue below.</p>
      </div>
      <QueueManagement />
    </div>
  );
};

export default StaffDashboard; 
