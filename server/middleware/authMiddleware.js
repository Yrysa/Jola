import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { createError } from './errorHandler.js';

// Проверка токена и защита маршрутов
export const protect = async (req, res, next) => {
  try {
    let token;

    // Получение токена из заголовка Authorization
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(createError('Вы не авторизованы. Пожалуйста, войдите в систему', 401));
    }

    // Верификация токена
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Поиск пользователя по ID из токена
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(createError('Пользователь не найден', 401));
    }

// if (!user.isVerified) {
//   return next(createError('Аккаунт не подтвержден', 401));
// }

    // Добавление пользователя в объект запроса
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

// Проверка прав администратора
export const admin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(createError('Доступ запрещен. Требуются права администратора', 403));
  }
  next();
};

// Проверка роли (расширенная версия)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        createError(`Доступ запрещен. Требуются права: ${roles.join(', ')}`, 403)
      );
    }
    next();
  };
};