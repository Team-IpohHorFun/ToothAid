// API configuration
// Development (localhost): sync and auth use local backend (port 3001) or VITE_API_URL.
// Production (deployed): always use VITE_API_URL — set it at build time to your backend URL.
const getApiBaseUrl = () => {
  const isDev = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.includes('localhost'));

  if (isDev) {
    const localUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const apiUrl = (localUrl || '').replace(/\/$/, '');
    if (import.meta.env.DEV) console.log('API Base URL (dev):', apiUrl);
    return apiUrl;
  }

  // Production: must set VITE_API_URL when building (e.g. VITE_API_URL=https://your-api.example.com)
  const prodUrl = import.meta.env.VITE_API_URL || '';
  const apiUrl = (prodUrl || '').replace(/\/$/, '');
  if (!apiUrl && import.meta.env.PROD) console.warn('VITE_API_URL not set — auth and sync will fail. Set it when building for production.');
  return apiUrl;
};

// Paths are always direct: /auth/login, /sync/push, etc. (no /api prefix)
export const getApiPath = (path) => path;

export const API_BASE_URL = getApiBaseUrl();
