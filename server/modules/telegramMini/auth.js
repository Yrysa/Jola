import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../../models/User.js';
import TelegramMiniSession from '../../models/TelegramMiniSession.js';
import TelegramMiniAudit from '../../models/TelegramMiniAudit.js';
import { createError } from '../../middleware/errorHandler.js';
import { normalizeTelegramRole } from './fieldPolicy.js';

const ACCESS_TTL_SECONDS = Number(process.env.TELEGRAM_MINI_ACCESS_TTL_SECONDS || 20 * 60);
const REFRESH_TTL_SECONDS = Number(process.env.TELEGRAM_MINI_REFRESH_TTL_SECONDS || 14 * 24 * 60 * 60);
const TELEGRAM_MINI_INIT_MAX_AGE_SECONDS = Number(process.env.TELEGRAM_MINI_INIT_MAX_AGE_SECONDS || 15 * 60);

const safeHash = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const randomToken = (size = 32) => crypto.randomBytes(size).toString('hex');

export const telegramMiniSessionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: Number(process.env.TELEGRAM_MINI_SESSION_RATE_LIMIT || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Слишком много попыток запуска Mini App. Попробуйте позже.' },
});

export const telegramMiniApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.TELEGRAM_MINI_API_RATE_LIMIT || 180),
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Telegram Mini App временно ограничен по частоте запросов.' },
});

export const extractRawInitData = (req) => {
  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('tma ')) return authHeader.slice(4).trim();
  return String(req.body?.initData || '').trim();
};

export const writeTelegramMiniAudit = async (req, payload = {}) => {
  try {
    await TelegramMiniAudit.create({
      user: payload.user || req.user?._id || null,
      telegramId: payload.telegramId || req.telegramMini?.telegramId || '',
      sessionId: payload.sessionId || req.telegramMini?.sessionId || '',
      event: payload.event || 'telegram_mini.event',
      severity: payload.severity || 'info',
      route: req.originalUrl || payload.route || '',
      method: req.method || payload.method || '',
      ip: req.ip || '',
      userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
      meta: payload.meta || {},
    });
  } catch {
    
  }
};

export const validateTelegramInitData = (rawInitData, botToken) => {
  const raw = String(rawInitData || '').trim();
  if (!raw) throw createError('Telegram initData отсутствует', 400);
  if (!botToken) throw createError('TELEGRAM_BOT_TOKEN не настроен на сервере', 503);

  const params = new URLSearchParams(raw);
  const hash = String(params.get('hash') || '').trim().toLowerCase();
  if (!hash) throw createError('Telegram initData не содержит hash', 400);

  const pairs = [];
  for (const [key, value] of params.entries()) {
    if (key === 'hash') continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort((a, b) => a.localeCompare(b));
  const dataCheckString = pairs.join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const actualHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');
  if (actualHash.length !== hash.length || !crypto.timingSafeEqual(Buffer.from(actualHash, 'utf8'), Buffer.from(hash, 'utf8'))) {
    throw createError('Telegram initData не прошла проверку подписи', 401);
  }

  const authDate = Number(params.get('auth_date') || 0);
  const age = Math.floor(Date.now() / 1000) - authDate;
  if (!authDate || age < 0 || age > TELEGRAM_MINI_INIT_MAX_AGE_SECONDS) {
    throw createError('Telegram initData устарела. Откройте Mini App заново из Telegram', 401);
  }

  let user = null;
  try {
    user = JSON.parse(String(params.get('user') || '{}'));
  } catch {
    throw createError('Telegram user payload повреждён', 400);
  }
  if (!user?.id) throw createError('Telegram user отсутствует в initData', 401);

  return {
    raw,
    authDate,
    user,
    queryId: String(params.get('query_id') || ''),
    startParam: String(params.get('start_param') || params.get('tgWebAppStartParam') || ''),
    chatType: String(params.get('chat_type') || ''),
    chatInstance: String(params.get('chat_instance') || ''),
    hash,
  };
};

export const createTelegramMiniSessionRecord = async ({ req, user, validated }) => {
  const sessionId = randomToken(16);
  const refreshToken = randomToken(32);
  const session = await TelegramMiniSession.create({
    user: user._id,
    telegramId: String(validated.user.id),
    sessionId,
    refreshTokenHash: safeHash(refreshToken),
    initDataHash: safeHash(validated.raw),
    roleSnapshot: normalizeTelegramRole(user.role),
    userAgent: String(req.headers['user-agent'] || '').slice(0, 500),
    ip: req.ip || '',
    lastSeenAt: new Date(),
    expiresAt: new Date(Date.now() + ACCESS_TTL_SECONDS * 1000),
    refreshExpiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
  });
  return { session, refreshToken };
};

export const issueTelegramMiniAccessToken = ({ user, telegramId, sessionId }) => jwt.sign({
  id: String(user._id),
  role: normalizeTelegramRole(user.role),
  scope: 'telegram-mini',
  telegramId: String(telegramId || ''),
  sid: String(sessionId || ''),
}, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL_SECONDS });

export const issueSessionTokens = ({ user, session, telegramId, refreshToken }) => ({
  accessToken: issueTelegramMiniAccessToken({ user, telegramId, sessionId: session.sessionId }),
  refreshToken,
  expiresIn: ACCESS_TTL_SECONDS,
  refreshExpiresIn: REFRESH_TTL_SECONDS,
  sessionId: session.sessionId,
});

export const rotateTelegramMiniRefreshToken = async (session) => {
  const refreshToken = randomToken(32);
  session.refreshTokenHash = safeHash(refreshToken);
  session.refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);
  session.expiresAt = new Date(Date.now() + ACCESS_TTL_SECONDS * 1000);
  session.lastSeenAt = new Date();
  await session.save({ validateBeforeSave: false });
  return refreshToken;
};

export const verifyRefreshToken = async (rawRefreshToken) => {
  const token = String(rawRefreshToken || '').trim();
  if (!token) throw createError('Refresh token отсутствует', 401);
  const hashed = safeHash(token);
  const session = await TelegramMiniSession.findOne({
    refreshTokenHash: hashed,
    revokedAt: null,
    refreshExpiresAt: { $gt: new Date() },
  }).select('+refreshTokenHash');
  if (!session) throw createError('Refresh token недействителен', 401);
  return session;
};

const extractAccessToken = (req, { allowQuery = false } = {}) => {
  const authHeader = String(req.headers.authorization || '').trim();
  if (authHeader.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim();
  if (allowQuery) return String(req.query?.access_token || '').trim();
  return '';
};

const protectTelegramMiniInternal = ({ allowQuery = false } = {}) => async (req, _res, next) => {
  try {
    const token = extractAccessToken(req, { allowQuery });
    if (!token) return next(createError('Требуется Telegram Mini App токен', 401));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded?.scope !== 'telegram-mini' || !decoded?.sid) {
      return next(createError('Неверная область токена Telegram Mini App', 401));
    }

    const [user, session] = await Promise.all([
      User.findById(decoded.id).select('+telegramChatId'),
      TelegramMiniSession.findOne({ sessionId: decoded.sid, revokedAt: null, refreshExpiresAt: { $gt: new Date() } }),
    ]);
    if (!user) return next(createError('Пользователь Telegram Mini App не найден', 401));
    if (!session) return next(createError('Сессия Telegram Mini App истекла', 401));
    if (!user.telegramChatId || String(user.telegramChatId) !== String(decoded.telegramId || '')) {
      return next(createError('Telegram больше не привязан к этому аккаунту', 401));
    }
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      return next(createError('Сессия Telegram Mini App истекла. Выполните refresh.', 401));
    }

    session.lastSeenAt = new Date();
    session.expiresAt = new Date(Date.now() + ACCESS_TTL_SECONDS * 1000);
    session.roleSnapshot = normalizeTelegramRole(user.role);
    await session.save({ validateBeforeSave: false });

    req.user = user;
    req.telegramMini = {
      telegramId: String(decoded.telegramId || ''),
      sessionId: session.sessionId,
      role: normalizeTelegramRole(user.role),
    };
    next();
  } catch (error) {
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
      await writeTelegramMiniAudit(req, { event: 'telegram_mini.auth_failed', severity: 'warn', meta: { reason: error.name } });
      return next(createError('Сессия Telegram Mini App истекла. Откройте приложение заново', 401));
    }
    next(error);
  }
};

export const protectTelegramMini = protectTelegramMiniInternal({ allowQuery: false });
export const protectTelegramMiniStream = protectTelegramMiniInternal({ allowQuery: true });

export const requireTelegramMiniRoles = (...roles) => (req, _res, next) => {
  const current = normalizeTelegramRole(req.telegramMini?.role || req.user?.role);
  const allowed = roles.map((item) => normalizeTelegramRole(item));
  if (!allowed.includes(current)) return next(createError('Недостаточно прав для этого действия', 403));
  next();
};
