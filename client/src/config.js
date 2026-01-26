// API configuration
// In development, Vite proxy handles /api routes and rewrites them
// In production, call backend directly (backend routes don't have /api prefix)
const getApiBaseUrl = () => {
  // Check if we're running on localhost (development)
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('localhost');
  
  if (isLocalhost) {
    // Use relative path with /api - Vite proxy will rewrite /api/auth -> /auth
    return '';
  }
  
  // Production: use environment variable or fallback to Render URL
  // Backend routes are /auth and /sync (no /api prefix)
  let apiUrl = import.meta.env.VITE_API_URL || 'https://toothaid-backend.onrender.com';
  
  // Remove trailing slash if present
  apiUrl = apiUrl.replace(/\/$/, '');
  
  // Log for debugging
  console.log('API Base URL:', apiUrl);
  console.log('Environment:', import.meta.env.MODE);
  console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
  
  return apiUrl;
};

// Helper to get the API path prefix
// In dev: use /api (proxy rewrites it)
// In prod: no prefix (backend routes are /auth, /sync directly)
export const getApiPath = (path) => {
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('localhost');
  
  if (isLocalhost) {
    // Development: use /api prefix, proxy will rewrite
    return `/api${path}`;
  }
  
  // Production: no /api prefix, backend routes are direct
  return path;
};

export const API_BASE_URL = getApiBaseUrl();
