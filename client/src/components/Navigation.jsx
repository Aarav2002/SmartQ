import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const Navigation = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="bg-white shadow p-4 flex justify-between items-center">
      <div className="font-bold text-xl text-blue-600">Smart Queue</div>
      <div className="flex items-center gap-4">
        <span className="text-gray-700">{user.name || user.email} ({user.role})</span>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navigation; 
