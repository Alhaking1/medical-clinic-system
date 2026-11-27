import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // عند فتح لوحة التحكم من خادم Vite للتطوير
    if (window.location.port === '5173') {
      return 'http://localhost:8080/api/v1';
    }
    // عند فتحها من نفس خادم الباك إند (سواء محلياً على منفذ 8080 أو على السحابة)
    return `${window.location.origin}/api/v1`;
  }
  return '/api/v1';
};

const API_URL = getApiBaseUrl();

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('admin_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;