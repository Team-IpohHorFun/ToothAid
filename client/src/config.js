// API configuration
// When app is on localhost: sync and auth go to local backend (default port 3001).
// When deployed: use VITE_API_URL or production backend.
const getApiBaseUrl = () => {
  const isLocalhost = window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('localhost');

  if (isLocalhost) {
    // Use local backend so sync/auth hit your machine. Override with VITE_API_URL if needed.
    const localUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const apiUrl = localUrl.replace(/\/$/, '');
    console.log('API Base URL (localhost):', apiUrl);
    return apiUrl;
  }

  // Production: environment variable or fallback to Render
  let apiUrl = import.meta.env.VITE_API_URL || 'https://toothaid-backend.onrender.com';
  apiUrl = apiUrl.replace(/\/$/, '');
  console.log('API Base URL:', apiUrl);
  return apiUrl;
};

// Paths are always direct: /auth/login, /sync/push, etc. (no /api prefix)
export const getApiPath = (path) => path;

export const API_BASE_URL = getApiBaseUrl();
