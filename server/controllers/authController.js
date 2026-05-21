import crypto from 'crypto';
import User from '../models/User.js';
import { createError } from '../middleware/errorHandler.js';
import { clearAuthCookie, ensureCsrfCookie, issueCsrfToken, pickPublicUser, setAuthCookie } from '../utils/auth.js';
import { clearTelegramAccessToken, hashTelegramAccessToken, sanitizeTelegramRedirectPath } from '../utils/telegramAccess.js';
import { resolveClientBaseUrl } from '../utils/originSecurity.js';

const parseBool = (value, fallback = false) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const DEV_RESET_MODE = (() => {
  if (process.env.NODE_ENV === 'production') return false;
  if (!parseBool(process.env.ALLOW_DEV_RESET_URL, false)) return false;
  const clientUrl = String(process.env.CLIENT_URL || '').trim();
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(clientUrl);
})();

const sendAuthResponse = (req, res, statusCode, user) => {
  const token = user.getSignedJwtToken();
  setAuthCookie(res, token);
  issueCsrfToken(res);
  return res.status(statusCode).json({
    status: 'success',
    data: {
      user: pickPublicUser(user),
    },
  });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, adminCode } = req.body;

    if (!name || !email || !password) {
      return next(createError('Пожалуйста, заполните все поля', 400));
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return next(createError('Пользователь с таким email уже существует', 400));
    }

    let isAdmin = false;
    if (process.env.ADMIN_EMAIL && normalizedEmail === String(process.env.ADMIN_EMAIL).trim().toLowerCase()) {
      const requiredInviteCode = String(process.env.ADMIN_INVITE_CODE || '').trim();
      if (!requiredInviteCode) {
        return next(createError('Регистрация администратора отключена: сервер не настроен безопасно', 503));
      }
      isAdmin = adminCode === requiredInviteCode;
      if (!isAdmin) {
        return next(createError('Неверный код приглашения администратора', 403));
      }
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: isAdmin ? 'admin' : 'user',
      isVerified: true,
      ...(isAdmin && process.env.ADMIN_PHONE ? { phone: String(process.env.ADMIN_PHONE).trim() } : {}),
    });

    return sendAuthResponse(req, res, 201, user);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(createError('Пожалуйста, введите email и пароль', 400));
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return next(createError('Неверные данные для входа', 401));
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(createError('Неверные данные для входа', 401));
    }

    await user.updateLastLogin();
    return sendAuthResponse(req, res, 200, user);
  } catch (error) {
    next(error);
  }
};

export const logout = async (_req, res, next) => {
  try {
    clearAuthCookie(res);
    return res.json({
      status: 'success',
      data: { message: 'Вы вышли из аккаунта' },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+telegramChatId');
    if (!user) {
      return next(createError('Пользователь не найден', 404));
    }

    ensureCsrfCookie(req, res);
    return res.json({
      status: 'success',
      data: { user: pickPublicUser(user) },
    });
  } catch (error) {
    next(error);
  }
};


export const telegramAccessLogin = async (req, res, next) => {
  try {
    const rawToken = String(req.params?.token || '').trim();
    if (!rawToken) {
      return next(createError('Токен Telegram отсутствует', 400));
    }

    const tokenHash = hashTelegramAccessToken(rawToken);
    const user = await User.findOne({
      telegramAuthTokenHash: tokenHash,
      telegramAuthTokenExpire: { $gt: new Date() },
    }).select('+telegramAuthTokenHash +telegramAuthTokenExpire +telegramChatId');

    if (!user) {
      return next(createError('Ссылка входа недействительна или устарела', 400));
    }

    if (!user.telegramChatId) {
      clearTelegramAccessToken(user);
      await user.save({ validateBeforeSave: false });
      return next(createError('Telegram ещё не привязан к аккаунту', 400));
    }

    clearTelegramAccessToken(user);
    await user.save({ validateBeforeSave: false });

    setAuthCookie(res, user.getSignedJwtToken());
    issueCsrfToken(res);

    const clientBase = resolveClientBaseUrl(req, process.env.CLIENT_URL || process.env.PUBLIC_WEB_URL || '');
    const redirectPath = sanitizeTelegramRedirectPath(req.query?.redirect);
    if (!clientBase) {
      return res.json({
        status: 'success',
        data: {
          user: pickPublicUser(user),
          redirectPath,
        },
      });
    }

    return res.redirect(302, `${clientBase}${redirectPath}`);
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return next(createError('Укажите email', 400));

    const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.json({
        status: 'success',
        data: { message: 'Если email существует, мы отправим ссылку для восстановления.' },
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const data = {
      message: DEV_RESET_MODE
        ? 'Ссылка для восстановления создана (dev-режим).'
        : 'Если email существует, мы отправим ссылку для восстановления.',
    };

    if (DEV_RESET_MODE) {
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      data.resetUrl = `${clientUrl}/reset-password/${resetToken}`;
    }

    return res.json({ status: 'success', data });
  } catch (e) {
    next(e);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const token = String(req.params?.token || '').trim();
    const newPassword = String(req.body?.password || '').trim();

    if (!token) return next(createError('Токен обязателен', 400));
    if (!newPassword || newPassword.length < 6) {
      return next(createError('Пароль должен быть минимум 6 символов', 400));
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpire: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return next(createError('Ссылка недействительна или устарела', 400));
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    clearAuthCookie(res);

    return res.json({
      status: 'success',
      data: { message: 'Пароль обновлён. Теперь можно войти.' },
    });
  } catch (e) {
    next(e);
  }
};
