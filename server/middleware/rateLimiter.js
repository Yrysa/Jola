import rateLimit from 'express-rate-limit';

const commonConfig = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
};

export const authLoginLimiter = rateLimit({
  ...commonConfig,
  max: 5,
  message: {
    status: 'error',
    message: 'Слишком много попыток входа. Попробуйте через 15 минут.',
  },
});

export const authRegisterLimiter = rateLimit({
  ...commonConfig,
  max: 5,
  message: {
    status: 'error',
    message: 'Слишком много попыток регистрации. Попробуйте через 15 минут.',
  },
});

export const authRecoveryLimiter = rateLimit({
  ...commonConfig,
  max: 3,
  message: {
    status: 'error',
    message: 'Слишком много попыток подтверждения/восстановления. Попробуйте позже.',
  },
});

export const apiLimiter = rateLimit({
  ...commonConfig,
  max: 100,
  message: {
    status: 'error',
    message: 'Слишком много запросов. Попробуйте позже.',
  },
});
