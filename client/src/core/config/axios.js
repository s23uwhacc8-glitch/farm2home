/**
 * Axios Configuration
 * Sets up base URL and auth interceptors.
 *
 * FIX: Removed the hard window.location.href = '/login' redirect from the
 * 401 interceptor. That was causing the app to redirect to /login on first load
 * (when /api/auth/me returns 401 for an expired/invalid token).
 * AuthContext already handles 401 gracefully — the interceptor should not
 * double-handle it with a hard navigation.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_BASE_URL;

// ── Request: attach token ─────────────────────────────────────────────────────
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

// ── Response: log rate-limit warnings; let AuthContext handle 401 ─────────────
axios.interceptors.response.use(
  response => response,
  error => {
    const { status, data } = error.response || {};

    // 429 → rate limit hit
    if (status === 429) {
      console.warn(
        '⚠️ Rate limit reached.',
        data?.message || 'Too many requests.',
        '\nHint: Increase RATE_LIMIT_MAX in server/.env for development.'
      );
    }

    // NOTE: 401 handling intentionally removed from here.
    // AuthContext's loadUser() already clears the token on 401.
    // A hard window.location redirect here caused the app to land on /login
    // even when no authentication was needed (e.g. the home page).

    return Promise.reject(error);
  }
);

export default axios;
