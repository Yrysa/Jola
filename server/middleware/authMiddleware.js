import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createError } from './errorHandler.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(createError('Вы не авторизованы. Пожалуйста, войдите в систему', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(createError('Пользователь не найден', 401));
    }

    if (!user.isVerified) {
      return next(createError('Аккаунт не подтвержден', 403));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(createError('Неверный токен', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(createError('Токен истек', 401));
    }
    next(error);
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(createError(`Доступ запрещен. Требуются права: ${roles.join(', ')}`, 403));
  }
  next();
};

export const requirePermission = (...permissions) => (req, res, next) => {
  const userPermissions = req.user?.permissions || [];
  const hasPermission = permissions.every((permission) => userPermissions.includes(permission));

  if (!hasPermission) {
    return next(
      createError(`Доступ запрещен. Требуются permissions: ${permissions.join(', ')}`, 403)
    );
  }

  next();
};
