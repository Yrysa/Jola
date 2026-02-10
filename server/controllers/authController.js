import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createError } from '../middleware/errorHandler.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const parseCookies = (req) => {
  const cookiesHeader = req.headers.cookie;
  if (!cookiesHeader) return {};

  return cookiesHeader.split(';').reduce((acc, cookie) => {
    const [rawName, ...rest] = cookie.trim().split('=');
    acc[rawName] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};

const createVerificationToken = () => crypto.randomBytes(32).toString('hex');

const getPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: user.permissions,
  isVerified: user.isVerified,
  avatarUrl: user.avatarUrl,
  address: user.address,
  phone: user.phone,
});

const issueAuthTokens = async (user, res) => {
  const accessToken = user.getSignedJwtToken();
  const refreshToken = user.getSignedRefreshToken();

  user.refreshTokenHash = hashToken(refreshToken);
  user.refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken);
  return accessToken;
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(createError('Пользователь с таким email уже существует', 409));
    }

    const verificationToken = createVerificationToken();

    const user = await User.create({
      name,
      email,
      password,
      role: email === process.env.ADMIN_EMAIL ? 'admin' : 'user',
      permissions: email === process.env.ADMIN_EMAIL ? ['admin:all'] : [],
      isVerified: false,
      verificationTokenHash: hashToken(verificationToken),
      verificationTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    res.status(201).json({
      status: 'success',
      message: 'Регистрация успешна. Подтвердите email перед входом.',
      data: {
        user: getPublicUser(user),
        // Демонстрационный токен: в production должен уходить только по email.
        verificationToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { email, token } = req.body;

    const user = await User.findOne({ email }).select('+verificationTokenHash +verificationTokenExpiresAt');
    if (!user) {
      return next(createError('Пользователь не найден', 404));
    }

    if (!user.verificationTokenHash || !user.verificationTokenExpiresAt) {
      return next(createError('Токен подтверждения отсутствует', 400));
    }

    if (user.verificationTokenExpiresAt.getTime() < Date.now()) {
      return next(createError('Токен подтверждения истек', 400));
    }

    if (hashToken(token) !== user.verificationTokenHash) {
      return next(createError('Неверный токен подтверждения', 400));
    }

    user.isVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      message: 'Email успешно подтвержден. Теперь можно войти в аккаунт.',
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +refreshTokenHash +refreshTokenExpiresAt');
    if (!user) {
      return next(createError('Неверные данные для входа', 401));
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(createError('Неверные данные для входа', 401));
    }

    if (!user.isVerified) {
      return next(createError('Email не подтвержден. Проверьте почту.', 403));
    }

    await user.updateLastLogin();

    const accessToken = await issueAuthTokens(user, res);

    res.status(200).json({
      status: 'success',
      data: {
        user: getPublicUser(user),
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const cookies = parseCookies(req);
    const incomingToken = cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

    if (!incomingToken) {
      return next(createError('Refresh token не предоставлен', 401));
    }

    const decoded = jwt.verify(
      incomingToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    if (decoded.tokenType !== 'refresh') {
      return next(createError('Неверный тип токена', 401));
    }

    const user = await User.findById(decoded.id).select('+refreshTokenHash +refreshTokenExpiresAt');
    if (!user || !user.refreshTokenHash) {
      return next(createError('Refresh token невалиден', 401));
    }

    if (user.refreshTokenExpiresAt && user.refreshTokenExpiresAt.getTime() < Date.now()) {
      return next(createError('Refresh token истек', 401));
    }

    if (user.refreshTokenHash !== hashToken(incomingToken)) {
      return next(createError('Refresh token невалиден', 401));
    }

    const accessToken = await issueAuthTokens(user, res);

    res.status(200).json({
      status: 'success',
      data: {
        accessToken,
      },
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(createError('Refresh token невалиден или истек', 401));
    }
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const cookies = parseCookies(req);
    const incomingToken = cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

    if (incomingToken) {
      try {
        const decoded = jwt.verify(
          incomingToken,
          process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.id).select('+refreshTokenHash +refreshTokenExpiresAt');
        if (user) {
          user.refreshTokenHash = undefined;
          user.refreshTokenExpiresAt = undefined;
          await user.save({ validateBeforeSave: false });
        }
      } catch {
        // Игнорируем ошибку токена при logout, чтобы операция была идемпотентной.
      }
    }

    clearRefreshCookie(res);

    res.status(200).json({
      status: 'success',
      message: 'Вы успешно вышли из системы',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(createError('Пользователь не найден', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { user: getPublicUser(user) },
    });
  } catch (error) {
    next(error);
  }
};
