import React, { useState } from 'react';
import ServiceProviderSearch from './ServiceProviderSearch.jsx';
import QueueStatus from './QueueStatus.jsx';

const CustomerDashboard = () => {
  const [activeTab, setActiveTab] = useState('search');

  return (
    <div className="max-w-4xl mx-auto mt-8 p-6">
      <h2 className="text-2xl font-bold mb-6">Customer Dashboard</h2>
      
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('search')}
          className={`pb-2 px-4 ${activeTab === 'search' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          Find Services
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-2 px-4 ${activeTab === 'queue' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
        >
          My Queues
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'search' && <ServiceProviderSearch />}
      {activeTab === 'queue' && <QueueStatus />}
    </div>
  );
};

export default CustomerDashboard;
