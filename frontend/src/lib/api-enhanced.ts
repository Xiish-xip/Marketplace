import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from './auth-store';
import { getCsrfToken } from './csrf';

export const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_URL || `https://marketplace-api.onrender.com/api`);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
});

// Request interceptor - attach auth and CSRF tokens
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (['post', 'put', 'patch', 'delete'].includes((config.method || 'get').toLowerCase())) {
    const csrfToken = await getCsrfToken();
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }
  if (config.data instanceof FormData) {
    // Axios automatically sets correct Content-Type with boundary for FormData
    // Do NOT delete it, or multer won't be able to parse the files
    config.headers['Accept'] = 'application/json';
  }
  if (import.meta.env.DEV) {
    console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

// Response interceptor - handle errors + auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as any;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const csrfToken = await getCsrfToken();
          const res = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken }, {
            withCredentials: true,
            headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
          });
          const newTokens = res.data.data;
          useAuthStore.getState().setTokens(newTokens.accessToken, newTokens.refreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return api(originalRequest);
        }
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    const message = error.response?.data?.message || error.message || 'An error occurred';
    const method = (originalRequest?.method || 'get').toLowerCase();
    // Suppress 403 toast for page-builder admin routes - ProtectedLayout handles redirect
    // GET queries can provide local fallbacks while the hosted API is not connected.
    if (method !== 'get' && error.response?.status !== 401 && error.response?.status !== 403) {
      toast.error(message);
    }
    return Promise.reject(error);
  }
);

// Typed helpers
export async function get<T = any>(url: string, params?: any): Promise<{ success: boolean; data: T; pagination?: any }> {
  const res = await api.get(url, { params });
  return res.data;
}

export async function post<T = any>(url: string, data?: any): Promise<{ success: boolean; data: T }> {
  const res = await api.post(url, data);
  return res.data;
}

export async function put<T = any>(url: string, data?: any): Promise<{ success: boolean; data: T }> {
  const res = await api.put(url, data);
  return res.data;
}

export async function patch<T = any>(url: string, data?: any): Promise<{ success: boolean; data: T }> {
  const res = await api.patch(url, data);
  return res.data;
}

export async function del<T = any>(url: string): Promise<{ success: boolean; data?: T }> {
  const res = await api.delete(url);
  return res.data;
}
