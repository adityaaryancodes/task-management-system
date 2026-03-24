import axios from 'axios';

const TOKEN_KEY = 'hw_token';
const USER_KEY = 'hw_user';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4001';

export function saveSession(token, user, refreshToken) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify({ ...user, refreshToken }));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function signOutSession() {
  const user = getUser();
  const refreshToken = user?.refreshToken;

  try {
    if (refreshToken) {
      await axios.post(`${API_BASE_URL}/auth/logout`, { refresh_token: refreshToken });
    }
  } catch {}

  clearSession();
}
