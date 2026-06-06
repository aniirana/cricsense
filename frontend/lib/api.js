import axios from 'axios';

const API = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000' });

API.interceptors.request.use(cfg => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('cs_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

// Auth
export const register = (data) => API.post('/api/auth/register', data);
export const login    = (data) => API.post('/api/auth/login', data);

// User
export const getMe    = ()     => API.get('/api/user/me');
export const getStats = ()     => API.get('/api/user/stats');

// Analysis
export const uploadVideo  = (form)  => API.post('/api/analysis/upload', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 600000 });
export const getHistory   = ()      => API.get('/api/analysis/history');
export const getAnalysis  = (id)    => API.get(`/api/analysis/${id}`);
export const deleteAnalysis = (id)  => API.delete(`/api/analysis/${id}`);

export default API;
