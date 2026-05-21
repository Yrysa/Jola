import axios from 'axios';

function resolveApiBaseURL() {
  const envValue = String(import.meta.env.VITE_API_URL || '').trim();

  if (!envValue || envValue === '/api') {
    return '/api';
  }

  if (typeof window === 'undefined') {
    return envValue;
  }

  try {
    const apiUrl = new URL(envValue, window.location.origin);
    const clientHost = window.location.hostname;
    const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
    const apiPointsToLocalhost = localHosts.has(apiUrl.hostname);
    const clientIsRemoteDevice = !localHosts.has(clientHost);

    if (clientIsRemoteDevice && apiPointsToLocalhost) {
      return '/api';
    }

    return apiUrl.toString();
  } catch {
    return '/api';
  }
}

const readCookie = (name) => {
  if (typeof document === 'undefined') return '';
  const prefix = `${name}=`;
  const parts = String(document.cookie || '').split(';');
  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.slice(prefix.length));
    }
  }
  return '';
};

const API = axios.create({
  baseURL: resolveApiBaseURL(),
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

API.interceptors.request.use((config) => {
  const nextConfig = { ...config, headers: { ...(config.headers || {}) } };
  nextConfig.headers['X-Requested-With'] = 'XMLHttpRequest';
  const csrfToken = readCookie('jola_csrf');
  if (csrfToken) {
    nextConfig.headers['X-Jola-CSRF'] = csrfToken;
  } else {
    delete nextConfig.headers['X-Jola-CSRF'];
  }
  return nextConfig;
});

async function extractErrorMessage(payload) {
  if (!payload) return '';

  if (typeof Blob !== 'undefined' && payload instanceof Blob) {
    try {
      const text = await payload.text();
      if (!text) return '';
      try {
        const parsed = JSON.parse(text);
        return parsed?.message || parsed?.error || text;
      } catch {
        return text;
      }
    } catch {
      return '';
    }
  }

  if (typeof payload === 'string') return payload;
  if (typeof payload === 'object') return payload?.message || payload?.error || '';
  return '';
}

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      return Promise.reject({
        status: 0,
        message: 'Ошибка сети. Проверьте подключение, сервер и попробуйте снова.',
      });
    }

    const payload = error.response?.data;
    const message =
      (await extractErrorMessage(payload)) ||
      error.message ||
      'Ошибка запроса';

    return Promise.reject({
      ...(payload && !(typeof Blob !== 'undefined' && payload instanceof Blob) ? payload : {}),
      status: error.response?.status,
      message,
    });
  }
);

export default API;
