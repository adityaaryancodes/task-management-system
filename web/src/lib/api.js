import axios from 'axios';
import { clearSession, getToken, getUser, saveSession } from './auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001'
});

api.interceptors.request.use((config) => {
  const token = getToken();
  const user = getUser();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (user?.org_id) config.headers['x-org-id'] = user.org_id;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    if (!originalRequest || status !== 401) {
      return Promise.reject(error);
    }

    const isAuthRoute =
      String(originalRequest.url || '').includes('/auth/login') ||
      String(originalRequest.url || '').includes('/auth/register-org') ||
      String(originalRequest.url || '').includes('/auth/refresh');

    if (isAuthRoute || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const user = getUser();
    const refreshToken = user?.refreshToken;

    if (!refreshToken) {
      clearSession();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      const refreshRes = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001'}/auth/refresh`,
        { refresh_token: refreshToken }
      );

      const nextToken = refreshRes.data.access_token;
      saveSession(nextToken, user, refreshToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextToken}`;
      if (user?.org_id) originalRequest.headers['x-org-id'] = user.org_id;

      return api(originalRequest);
    } catch (refreshErr) {
      clearSession();
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    }
  }
);

export default api;
