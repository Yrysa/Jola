import crypto from 'crypto';
export const AUTH_COOKIE_NAME = 'jola_token';
export const CSRF_COOKIE_NAME = String(process.env.CSRF_COOKIE_NAME || 'jola_csrf').trim() || 'jola_csrf';

export const parseBool = (value, fallback = false) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

export const getAuthCookieOptions = () => {
  const explicitSameSite = String(process.env.COOKIE_SAME_SITE || '').trim().toLowerCase();
  const allowCrossSite = parseBool(process.env.ALLOW_CROSS_SITE_AUTH, false);
  const sameSite = ['lax', 'strict', 'none'].includes(explicitSameSite)
    ? explicitSameSite
    : allowCrossSite
      ? 'none'
      : 'lax';
  const secure = parseBool(process.env.COOKIE_SECURE, sameSite === 'none' || process.env.NODE_ENV === 'production');
  return {
    httpOnly: true,
    sameSite,
    secure: sameSite === 'none' ? true : secure,
    path: '/',
    maxAge: Number(process.env.JWT_COOKIE_EXPIRE_MS || 7 * 24 * 60 * 60 * 1000),
  };
};


const randomToken = (size = 32) => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const bytes = new Uint8Array(size);
  crypto.randomFillSync(bytes);
  for (const value of bytes) {
    result += alphabet[value % alphabet.length];
  }
  return result;
};

export const issueCsrfToken = (res) => {
  const token = randomToken(40);
  const options = getAuthCookieOptions();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite: options.sameSite,
    secure: options.secure,
    path: options.path,
    maxAge: options.maxAge,
  });
  return token;
};

export const ensureCsrfCookie = (req, res) => {
  const existing = readCookieFromRequest(req, CSRF_COOKIE_NAME);
  if (existing) return existing;
  return issueCsrfToken(res);
};

export const clearCsrfCookie = (res) => {
  const options = getAuthCookieOptions();
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    sameSite: options.sameSite,
    secure: options.secure,
    path: options.path,
  });
};

export const readCookieFromRequest = (req, cookieName) => {
  const cookieHeader = String(req.headers.cookie || '');
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === cookieName) {
      const value = rest.join('=');
      return value ? decodeURIComponent(value) : null;
    }
  }

  return null;
};

export const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
};

export const clearAuthCookie = (res) => {
  const options = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: options.sameSite,
    secure: options.secure,
    path: options.path,
  });
  clearCsrfCookie(res);
};

export const readTokenFromRequest = (req) => readCookieFromRequest(req, AUTH_COOKIE_NAME);

export const pickPublicUser = (user) => {
  if (!user) return null;
  const id = String(user._id || user.id || '');
  return {
    _id: id,
    id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    address: user.address,
    phone: user.phone,
    walletBalance: user.walletBalance,
    bonusBalance: user.bonusBalance,
    personalDiscount: user.personalDiscount,
    telegramUsername: user.telegramUsername,
    telegramLinkedAt: user.telegramLinkedAt,
    telegramConnected: Boolean(user.telegramChatId),
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
  };
};
