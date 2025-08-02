import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const AuthForm = () => {
  const { login, register, registerStore } = useAuth();
  const [mode, setMode] = useState('login'); // 'login', 'register', 'store-register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // Store registration fields
  const [storeData, setStoreData] = useState({
    ownerName: '',
    email: '',
    password: '',
    storeName: '',
    category: '',
    location: '',
    description: '',
    phone: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        const result = await register(email, password, fullName, 'customer');
        setSuccess('Account created successfully! You can now log in.');
        setMode('login');
        setEmail('');
        setPassword('');
        setFullName('');
      } else if (mode === 'store-register') {
        const result = await registerStore(storeData);
        setSuccess('Store registered successfully! You can now log in.');
        setMode('login');
        setStoreData({
          ownerName: '', email: '', password: '', storeName: '',
          category: '', location: '', description: '', phone: ''
        });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full border p-2 rounded"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full border p-2 rounded"
        required
      />
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        disabled={loading}
      >
        {loading ? 'Please wait...' : 'Login'}
      </button>
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Full Name"
        value={fullName}
        onChange={e => setFullName(e.target.value)}
        className="w-full border p-2 rounded"
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full border p-2 rounded"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full border p-2 rounded"
        required
      />
      <button
        type="submit"
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        disabled={loading}
      >
        {loading ? 'Please wait...' : 'Register as Customer'}
      </button>
    </form>
  );

  const renderStoreRegisterForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Owner Name"
          value={storeData.ownerName}
          onChange={e => setStoreData({...storeData, ownerName: e.target.value})}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={storeData.email}
          onChange={e => setStoreData({...storeData, email: e.target.value})}
          className="w-full border p-2 rounded"
          required
        />
      </div>
      <input
        type="password"
        placeholder="Password"
        value={storeData.password}
        onChange={e => setStoreData({...storeData, password: e.target.value})}
        className="w-full border p-2 rounded"
        required
      />
      <input
        type="text"
        placeholder="Store Name"
        value={storeData.storeName}
        onChange={e => setStoreData({...storeData, storeName: e.target.value})}
        className="w-full border p-2 rounded"
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <select
          value={storeData.category}
          onChange={e => setStoreData({...storeData, category: e.target.value})}
          className="w-full border p-2 rounded"
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
        <input
          type="text"
          placeholder="Phone"
          value={storeData.phone}
          onChange={e => setStoreData({...storeData, phone: e.target.value})}
          className="w-full border p-2 rounded"
        />
      </div>
      <input
        type="text"
        placeholder="Location"
        value={storeData.location}
        onChange={e => setStoreData({...storeData, location: e.target.value})}
        className="w-full border p-2 rounded"
        required
      />
      <textarea
        placeholder="Store Description (optional)"
        value={storeData.description}
        onChange={e => setStoreData({...storeData, description: e.target.value})}
        className="w-full border p-2 rounded"
        rows="3"
      />
      <button
        type="submit"
        className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition"
        disabled={loading}
      >
        {loading ? 'Please wait...' : 'Register Store'}
      </button>
    </form>
  );

  return (
    <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {mode === 'login' && 'Login'}
        {mode === 'register' && 'Customer Registration'}
        {mode === 'store-register' && 'Store Registration'}
      </h2>

      {/* Mode Selection Tabs */}
      <div className="flex mb-6 bg-gray-100 rounded">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 py-2 px-4 rounded ${mode === 'login' ? 'bg-blue-500 text-white' : 'text-gray-600'}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex-1 py-2 px-4 rounded ${mode === 'register' ? 'bg-green-500 text-white' : 'text-gray-600'}`}
        >
          Customer
        </button>
        <button
          type="button"
          onClick={() => setMode('store-register')}
          className={`flex-1 py-2 px-4 rounded ${mode === 'store-register' ? 'bg-purple-500 text-white' : 'text-gray-600'}`}
        >
          Store
        </button>
      </div>

      {mode === 'login' && renderLoginForm()}
      {mode === 'register' && renderRegisterForm()}
      {mode === 'store-register' && renderStoreRegisterForm()}

      {error && <div className="text-red-500 text-sm mt-4">{error}</div>}
      {success && <div className="text-green-600 text-sm mt-4">{success}</div>}
    </div>
  );
};

export default AuthForm; 
