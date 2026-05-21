import crypto from 'crypto';

const TELEGRAM_ACCESS_TTL_MS = Number(process.env.TELEGRAM_ACCESS_TTL_MS || 10 * 60 * 1000);

const safeBaseUrl = (value, fallback = '') => {
  try {
    const url = new URL(String(value || '').trim());
    return url.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
};

const getClientBaseUrl = () => safeBaseUrl(
  process.env.TELEGRAM_WEBAPP_URL || process.env.PUBLIC_WEB_URL || process.env.CLIENT_URL || '',
  ''
);

const getPublicApiBaseUrl = () => {
  const explicit = safeBaseUrl(
    process.env.PUBLIC_API_URL || process.env.PUBLIC_SERVER_URL || process.env.SERVER_PUBLIC_URL || '',
    ''
  );
  if (explicit) return explicit;
  const clientBase = getClientBaseUrl();
  if (!clientBase) return '';
  try {
    return new URL('/api', `${clientBase}/`).toString().replace(/\/$/, '');
  } catch {
    return '';
  }
};

export const hashTelegramAccessToken = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');

export const issueTelegramAccessToken = async (user, { expiresInMs = TELEGRAM_ACCESS_TTL_MS } = {}) => {
  if (!user) return null;
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.telegramAuthTokenHash = hashTelegramAccessToken(rawToken);
  user.telegramAuthTokenExpire = new Date(Date.now() + Math.max(60_000, Number(expiresInMs) || TELEGRAM_ACCESS_TTL_MS));
  await user.save({ validateBeforeSave: false });
  return rawToken;
};

export const sanitizeTelegramRedirectPath = (value, fallback = '/orders?telegram=1') => {
  const raw = String(value || '').trim();
  if (!raw || !raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;
  if (/\s/.test(raw)) return fallback;
  return raw;
};

export const buildTelegramMiniAppPath = (user, { view, orderId } = {}) => {
  const role = String(user?.role || 'user').trim().toLowerCase();
  const params = new URLSearchParams();
  if (view) params.set('view', String(view));
  if (orderId) params.set('order', String(orderId));

  const defaultView = role === 'admin' ? 'orders' : 'home';
  if (!params.has('view')) params.set('view', defaultView);
  const query = params.toString();
  return `/telegram/${query ? `?${query}` : ''}`;
};

export const buildTelegramAccessUrl = (token, redirectPath = '/orders?telegram=1') => {
  const apiBase = getPublicApiBaseUrl();
  const clientBase = getClientBaseUrl();
  const safeRedirectPath = sanitizeTelegramRedirectPath(redirectPath);
  if (!token || !apiBase) {
    if (!clientBase) return '';
    return `${clientBase}${safeRedirectPath}`;
  }
  return `${apiBase}/auth/telegram/access/${encodeURIComponent(token)}?redirect=${encodeURIComponent(safeRedirectPath)}`;
};

export const buildTelegramOrdersAppUrl = async (user, redirectPath = '/orders?telegram=1') => {
  const token = await issueTelegramAccessToken(user);
  return buildTelegramAccessUrl(token, redirectPath);
};

export const buildTelegramMiniAppUrl = async (user, options = {}) => {
  const clientBase = getTelegramMiniAppBaseUrl();
  if (!clientBase) return '';
  return `${clientBase}${buildTelegramMiniAppPath(user, options)}`;
};

export const clearTelegramAccessToken = (user) => {
  if (!user) return;
  user.telegramAuthTokenHash = undefined;
  user.telegramAuthTokenExpire = undefined;
};

export const getTelegramClientBaseUrl = getClientBaseUrl;

export const isValidTelegramWebAppUrl = (value) => {
  const url = safeBaseUrl(value, '');
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = String(parsed.hostname || '').trim().toLowerCase();
    if (!host || host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
    return true;
  } catch {
    return false;
  }
};

export const getTelegramMiniAppBaseUrl = () => {
  const raw = getClientBaseUrl();
  return isValidTelegramWebAppUrl(raw) ? raw : '';
};

export const buildTelegramMiniDirectLink = ({ startApp = '', mode = 'fullscreen' } = {}) => {
  const botUsername = String(process.env.TELEGRAM_BOT_USERNAME || '').trim().replace(/^@/, '');
  const appShortName = String(process.env.TELEGRAM_MINI_APP_SHORT_NAME || '').trim();
  if (!botUsername || !appShortName) return '';
  const params = new URLSearchParams();
  if (startApp) params.set('startapp', String(startApp));
  if (mode) params.set('mode', String(mode));
  const query = params.toString();
  return `https://t.me/${botUsername}/${appShortName}${query ? `?${query}` : ''}`;
};
