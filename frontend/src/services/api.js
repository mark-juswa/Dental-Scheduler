import axios from 'axios';
import { supabase } from './supabaseClient.js';

// In production, the frontend is served by the same Express server,
// so we use a relative /api path — works on any domain automatically.
// In local dev (no VITE_API_URL set), fall back to localhost.
const BASE_URL = import.meta.env.PROD
  ? '/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:5000/api');

const api = axios.create({ baseURL: BASE_URL });

// Inject the Supabase access token on every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Unwrap the { data, error } envelope automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.error || error.message || 'Network error';
    return Promise.reject(new Error(msg));
  }
);

export default api;