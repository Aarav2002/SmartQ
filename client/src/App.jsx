import React from 'react';
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import Navigation from './components/Navigation.jsx';
import AuthForm from './components/AuthForm.jsx';
import CustomerDashboard from './components/customer/CustomerDashboard.jsx';
import StaffDashboard from './components/staff/StaffDashboard.jsx';
import AdminDashboard from './components/admin/AdminDashboard.jsx';
import StoreDashboard from './components/store/StoreDashboard.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import { useAuth } from './context/AuthContext.jsx';

const AppContent = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <AuthForm key="auth-form" />;

  if (user.role === 'admin') return <AdminDashboard />;
  if (user.role === 'store_owner') return <StoreDashboard />;
  if (user.role === 'staff') return <StaffDashboard />;
  return <CustomerDashboard />;
};

const App = () => (
  <AuthProvider>
    <SocketProvider>
      <Navigation />
      <AppContent />
    </SocketProvider>
  </AuthProvider>
);

export default App; 
