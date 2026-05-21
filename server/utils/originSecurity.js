const parseBool = (value, fallback = false) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const splitOrigins = (raw) => String(raw || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const normalizeOrigin = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin;
  } catch {
    return '';
  }
};

export const isDevelopmentLike = () => process.env.NODE_ENV !== 'production';
export const allowLanOrigins = () => parseBool(process.env.ALLOW_LAN_CORS, isDevelopmentLike());
export const allowCrossSiteAuth = () => parseBool(process.env.ALLOW_CROSS_SITE_AUTH, false);

export const getAllowedOrigins = () => {
  const defaults = isDevelopmentLike()
    ? ['http://localhost:5173', 'https://localhost:5173']
    : [];

  const configured = [
    ...splitOrigins(process.env.CLIENT_URL),
    ...splitOrigins(process.env.CLIENT_URLS),
    ...splitOrigins(process.env.CORS_ALLOWED_ORIGINS),
  ];

  return [...new Set([...defaults, ...configured].map(normalizeOrigin).filter(Boolean))];
};

const lanOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(:\d+)?$/i;

export const isAllowedOrigin = (origin) => {
  if (!origin) return false;
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  if (getAllowedOrigins().includes(normalized)) return true;
  return allowLanOrigins() && lanOriginPattern.test(normalized);
};

export const parseOriginFromRequest = (req) => {
  const origin = String(req.headers.origin || '').trim();
  if (origin) return origin;
  const referer = String(req.headers.referer || '').trim();
  if (!referer) return '';
  try {
    return new URL(referer).origin;
  } catch {
    return '';
  }
};

export { parseBool, normalizeOrigin };


const localHostnames = new Set(['localhost', '127.0.0.1', '::1']);

const safeUrl = (value) => {
  try {
    return new URL(String(value || '').trim());
  } catch {
    return null;
  }
};

const buildRequestOrigin = (req) => {
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const directHost = String(req.headers.host || '').trim();
  const host = forwardedHost || directHost;
  if (!host) return '';
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim() || 'http';
  try {
    return new URL(`${proto}://${host}`).origin;
  } catch {
    return '';
  }
};

export const resolveClientBaseUrl = (req, fallback = process.env.CLIENT_URL || process.env.PUBLIC_WEB_URL || '') => {
  const requestOrigin = normalizeOrigin(parseOriginFromRequest(req));
  if (requestOrigin && isAllowedOrigin(requestOrigin)) {
    return requestOrigin;
  }

  const requestHostOrigin = normalizeOrigin(buildRequestOrigin(req));
  const fallbackOrigin = normalizeOrigin(fallback);

  const requestUrl = safeUrl(requestHostOrigin);
  const fallbackUrl = safeUrl(fallbackOrigin);

  if (requestUrl && fallbackUrl) {
    const requestIsRemote = !localHostnames.has(requestUrl.hostname);
    const fallbackIsLocal = localHostnames.has(fallbackUrl.hostname);

    if (requestIsRemote && fallbackIsLocal) {
      const resolved = new URL(fallbackUrl.toString());
      resolved.protocol = requestUrl.protocol;
      resolved.hostname = requestUrl.hostname;
      return resolved.origin;
    }
  }

  if (requestHostOrigin && isAllowedOrigin(requestHostOrigin)) {
    return requestHostOrigin;
  }

  return fallbackOrigin || requestHostOrigin || '';
};
