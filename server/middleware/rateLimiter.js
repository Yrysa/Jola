import rateLimit from 'express-rate-limit';


export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    status: 'error',
    message: 'Слишком много попыток входа. Попробуйте через 15 минут.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    status: 'error',
    message: 'Слишком много запросов на восстановление пароля. Попробуйте позже.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});


export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 'error',
    message: 'Слишком много запросов. Попробуйте позже.',
  },
});
