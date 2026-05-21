import axios from 'axios';

const BASE_URL = String(import.meta.env.VITE_API_URL || '/api').trim() || '/api';
const API = axios.create({
  baseURL: `${BASE_URL.replace(/\/$/, '')}/telegram-mini/v1`,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

const TOKENS_KEY = 'jola_tgm_tokens_v2';

export const getTelegramMiniTokens = () => {
  if (typeof sessionStorage === 'undefined') return { accessToken: '', refreshToken: '', sessionId: '' };
  try {
    return JSON.parse(sessionStorage.getItem(TOKENS_KEY) || '{}');
  } catch {
    return { accessToken: '', refreshToken: '', sessionId: '' };
  }
};

export const setTelegramMiniTokens = (value = {}) => {
  if (typeof sessionStorage === 'undefined') return;
  const next = {
    accessToken: value.accessToken || '',
    refreshToken: value.refreshToken || '',
    sessionId: value.sessionId || '',
  };
  if (!next.accessToken && !next.refreshToken) {
    sessionStorage.removeItem(TOKENS_KEY);
    return;
  }
  sessionStorage.setItem(TOKENS_KEY, JSON.stringify(next));
};

let refreshPromise = null;

const ensureFreshAccessToken = async () => {
  const tokens = getTelegramMiniTokens();
  if (!tokens.refreshToken) throw new Error('refresh token missing');
  if (!refreshPromise) {
    refreshPromise = API.post('/refresh', { refreshToken: tokens.refreshToken })
      .then((response) => {
        const data = response.data?.data || {};
        const merged = {
          ...tokens,
          accessToken: data.accessToken || '',
          refreshToken: data.refreshToken || tokens.refreshToken,
          sessionId: data.sessionId || tokens.sessionId,
        };
        setTelegramMiniTokens(merged);
        return merged.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

API.interceptors.request.use((config) => {
  const next = { ...config, headers: { ...(config.headers || {}) } };
  const tokens = getTelegramMiniTokens();
  if (tokens.accessToken) next.headers.Authorization = `Bearer ${tokens.accessToken}`;
  return next;
});

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const config = error?.config || {};
    const url = String(config.url || '');
    if (status === 401 && !config.__isRetryRequest && !url.includes('/refresh') && !url.includes('/session')) {
      try {
        const accessToken = await ensureFreshAccessToken();
        config.__isRetryRequest = true;
        config.headers = { ...(config.headers || {}), Authorization: `Bearer ${accessToken}` };
        return API.request(config);
      } catch (refreshError) {
        setTelegramMiniTokens({});
        throw refreshError;
      }
    }
    throw error;
  }
);

const unwrap = (response) => response.data?.data;


export const createTelegramMiniEventStream = () => {
  const tokens = getTelegramMiniTokens();
  if (!tokens.accessToken) return null;
  const base = `${BASE_URL.replace(/\/$/, '')}/telegram-mini/v1/events`;
  const url = `${base}?access_token=${encodeURIComponent(tokens.accessToken)}`;
  try {
    return new EventSource(url, { withCredentials: false });
  } catch {
    return null;
  }
};

export const telegramMiniApi = {
  async createSession(initData) {
    const response = await API.post('/session', { initData }, { headers: { Authorization: `tma ${initData}` } });
    return unwrap(response);
  },
  async getConfig() { return unwrap(await API.get('/config')); },
  async getBootstrap() { return unwrap(await API.get('/bootstrap')); },
  async getSync() { return unwrap(await API.get('/sync')); },
  async getProfile() { return unwrap(await API.get('/profile')); },
  async updateProfile(payload) { return unwrap(await API.patch('/profile', payload)); },
  async getProducts(params = {}) { return unwrap(await API.get('/products', { params })); },
  async getProductDetails(id) { return unwrap(await API.get(`/products/${id}`)); },
  async markProductViewed(id) { return unwrap(await API.post(`/products/${id}/view`)); },
  async getFavorites() { return unwrap(await API.get('/favorites')); },
  async addFavorite(productId) { return unwrap(await API.post(`/favorites/${productId}`)); },
  async removeFavorite(productId) { return unwrap(await API.delete(`/favorites/${productId}`)); },
  async getOrders(params = {}) { return unwrap(await API.get('/orders', { params })); },
  async getOrderDetails(id) { return unwrap(await API.get(`/orders/${id}`)); },
  async repeatOrder(id) { return unwrap(await API.post(`/orders/${id}/repeat`)); },
  async previewCheckout(payload) { return unwrap(await API.post('/checkout/draft', payload)); },
  async commitCheckout(payload) { return unwrap(await API.post('/checkout/commit', payload)); },
  async createOrderPaymentSession(id) { return unwrap(await API.post(`/checkout/${id}/payment-session`)); },
  async getNotifications() { return unwrap(await API.get('/notifications')); },
  async getSupport() { return unwrap(await API.get('/support')); },
  async getPromoCodes(params = {}) { return unwrap(await API.get('/promocodes', { params })); },
  async previewPromoCode(payload) { return unwrap(await API.post('/promocodes/preview', payload)); },
  async getAdminOverview() { return unwrap(await API.get('/admin/overview')); },
  async getAdminSettings() { return unwrap(await API.get('/admin/settings')); },
  async updateAdminSettings(payload) { return unwrap(await API.patch('/admin/settings', payload)); },
  async trackAnalytics(events = []) {
    if (!events.length) return { accepted: 0 };
    return unwrap(await API.post('/analytics', { events }));
  },
};
