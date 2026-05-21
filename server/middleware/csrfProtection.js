import { createError } from './errorHandler.js';
import { parseOriginFromRequest, isAllowedOrigin, parseBool } from '../utils/originSecurity.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, readCookieFromRequest } from '../utils/auth.js';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const EXEMPT_PATHS = new Set(['/api/payments/stripe/webhook']);

const hasAuthCookie = (req) => String(req.headers.cookie || '').includes(`${AUTH_COOKIE_NAME}=`);

export const csrfProtection = (req, _res, next) => {
  if (!UNSAFE_METHODS.has(String(req.method || '').toUpperCase())) return next();
  if (!String(req.path || '').startsWith('/api/')) return next();
  if (EXEMPT_PATHS.has(req.path)) return next();

  const requiresCheck = hasAuthCookie(req);
  if (!requiresCheck) return next();

  const csrfHeader = String(req.headers['x-jola-csrf'] || '').trim();
  const requestedWith = String(req.headers['x-requested-with'] || '').trim().toLowerCase();
  const csrfCookie = String(readCookieFromRequest(req, CSRF_COOKIE_NAME) || '').trim();
  if (requestedWith !== 'xmlhttprequest') {
    return next(createError('CSRF защита: отсутствует обязательный заголовок запроса', 403));
  }
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return next(createError('CSRF защита: неверный или отсутствующий CSRF token', 403));
  }

  const origin = parseOriginFromRequest(req);
  if (!origin) {
    const allowMissingOrigin = parseBool(process.env.ALLOW_MISSING_CSRF_ORIGIN, process.env.NODE_ENV !== 'production');
    if (!allowMissingOrigin) {
      return next(createError('CSRF защита: origin/referer обязателен', 403));
    }
    return next();
  }

  if (!isAllowedOrigin(origin)) {
    return next(createError('CSRF защита: недоверенный origin', 403));
  }

  return next();
};
