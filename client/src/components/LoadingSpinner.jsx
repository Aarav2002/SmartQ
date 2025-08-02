import React from 'react';

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    <span className="sr-only">Loading...</span>
  </div>
);

export default LoadingSpinner; 