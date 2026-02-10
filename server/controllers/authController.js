import crypto from 'crypto';
import User from '../models/User.js';
import { createError } from '../middleware/errorHandler.js';

const buildAuthPayload = (user, token) => ({
  user: {
    id: user._id,
    name: user.name,
    surname: user.surname,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    address: user.address,
    deliveryAddresses: user.deliveryAddresses,
    phone: user.phone,
    phoneVerified: user.phoneVerified,
    notificationPreferences: user.notificationPreferences,
    localeSettings: user.localeSettings,
    twoFactorEnabled: user.twoFactorEnabled,
    isVerified: user.isVerified,
    lastLogin: user.lastLogin,
    loginHistory: user.loginHistory,
  },
  token,
});

const getRequestMeta = (req) => ({
  ip: req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress,
  userAgent: req.headers['user-agent'] || 'unknown',
  device: req.headers['sec-ch-ua-platform'] || 'unknown',
});

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return next(createError('Пожалуйста, заполните все поля', 400));
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(createError('Пользователь с таким email уже существует', 400));
    }

    const user = await User.create({
      name,
      email,
      password,
      role: email === process.env.ADMIN_EMAIL ? 'admin' : 'user',
      isVerified: false,
    });

    const verifyToken = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const token = user.getSignedJwtToken();

    res.status(201).json({
      status: 'success',
      message: 'Регистрация успешна. Подтвердите email.',
      data: {
        ...buildAuthPayload(user, token),
        emailVerificationToken: verifyToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    if (!email || !password) {
      return next(createError('Пожалуйста, введите email и пароль', 400));
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(createError('Неверные данные для входа', 401));
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(createError('Неверные данные для входа', 401));
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        const oneTimeCode = user.generateTwoFactorCode();
        await user.save({ validateBeforeSave: false });
        return res.status(401).json({
          status: 'requires_2fa',
          message: 'Требуется код двухфакторной аутентификации',
          data: {
            requiresTwoFactor: true,
            twoFactorCode: oneTimeCode,
          },
        });
      }

      const hashedCode = crypto.createHash('sha256').update(twoFactorCode).digest('hex');
      const isCodeValid =
        user.twoFactorCode === hashedCode && user.twoFactorCodeExpire && user.twoFactorCodeExpire > Date.now();

      if (!isCodeValid) {
        return next(createError('Неверный или просроченный код 2FA', 401));
      }

      user.twoFactorCode = undefined;
      user.twoFactorCodeExpire = undefined;
    }

    await user.updateLastLogin(getRequestMeta(req));

    const token = user.getSignedJwtToken();

    res.json({
      status: 'success',
      data: buildAuthPayload(user, token),
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(createError('Токен подтверждения недействителен или истёк', 400));
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({
      status: 'success',
      message: 'Email успешно подтверждён',
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(createError('Укажите email для восстановления пароля', 400));
    }

    const user = await User.findOne({ email });
    if (!user) {
      return next(createError('Пользователь с таким email не найден', 404));
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    res.json({
      status: 'success',
      message: 'Ссылка для сброса пароля сгенерирована',
      data: {
        resetToken,
        resetUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return next(createError('Новый пароль должен содержать минимум 6 символов', 400));
    }

    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return next(createError('Токен сброса пароля недействителен или истёк', 400));
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const jwtToken = user.getSignedJwtToken();

    res.json({
      status: 'success',
      message: 'Пароль успешно обновлён',
      data: buildAuthPayload(user, jwtToken),
    });
  } catch (error) {
    next(error);
  }
};
