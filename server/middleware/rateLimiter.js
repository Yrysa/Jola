import rateLimit from 'express-rate-limit';

// Rate limiter для аутентификации
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 15, // 5 попыток
  message: {
    status: 'error',
    message: 'Слишком много попыток входа. Попробуйте через 15 минут.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter для API в целом
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 'error',
    message: 'Слишком много запросов. Попробуйте позже.',
  },
});