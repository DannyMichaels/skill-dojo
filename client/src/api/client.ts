import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('__dojo-auth-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('__dojo-auth-token');
      localStorage.removeItem('__dojo-auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
