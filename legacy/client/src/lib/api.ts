import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: false,
  timeout: 10000, // 10s timeout to surface network issues
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage when present
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token') || localStorage.getItem('driverToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Surface network errors consistently
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out. Is the API running at http://localhost:8000?');
    } else if (error.message === 'Network Error') {
      console.error('Network Error. Check server availability and CORS.');
    } else if (error.response && error.response.status === 0) {
      console.error('Empty status (possible CORS/preflight failure).');
    }
    return Promise.reject(error);
  }
);

export default api;
