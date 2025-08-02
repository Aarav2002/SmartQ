import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api'; // Adjust as needed

const getToken = () => localStorage.getItem('token');

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export const login = async (email: string, password: string) => {
  try {
    console.log('Making login request with:', { email });
    const res = await api.post('/auth/login', { email, password });
    console.log('Login API response:', res.data);
    return res.data;
  } catch (error: any) {
    console.error('Login API error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

export const register = async (email: string, password: string, fullName: string, role: string) => {
  try {
    const res = await api.post('/auth/register', { email, password, name: fullName, role });
    return res.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

export const getProfile = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

export default api; 
