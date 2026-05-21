import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createError } from './errorHandler.js';
import { readTokenFromRequest } from '../utils/auth.js';

export const protect = async (req, res, next) => {
  try {
    const token = readTokenFromRequest(req);
    if (!token) {
      return next(createError('Вы не авторизованы. Пожалуйста, войдите в систему', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(createError('Пользователь не найден', 401));
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

export const admin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(createError('Доступ запрещен. Требуются права администратора', 403));
  }
  next();
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(createError(`Доступ запрещен. Требуются права: ${roles.join(', ')}`, 403));
    }
    next();
  };
};
