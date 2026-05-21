import './bootstrap/env.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import compression from 'compression';
import morgan from 'morgan';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import printServiceRoutes from './modules/polygraphy/routes/printServiceRoutes.js';
import configRoutes from './routes/configRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import promoCodeRoutes from './routes/promoCodeRoutes.js';
import telegramMiniRoutes from './modules/telegramMini/routes.js';
import { stripeWebhook } from './controllers/paymentController.js';
import { errorHandler } from './middleware/errorHandler.js';
import { xssSanitizer } from './middleware/xssSanitizer.js';
import { csrfProtection } from './middleware/csrfProtection.js';
import { getAllowedOrigins, isAllowedOrigin } from './utils/originSecurity.js';

const app = express();
const allowedOrigins = getAllowedOrigins();

const trustProxyEnv = String(process.env.TRUST_PROXY || 'false').trim().toLowerCase();
const trustProxySetting = trustProxyEnv === 'true' ? 1 : trustProxyEnv === 'false' || trustProxyEnv === '' ? false : /^\d+$/.test(trustProxyEnv) ? Number(trustProxyEnv) : trustProxyEnv;
app.set('trust proxy', trustProxySetting);

app.use(
  helmet({
    hsts: process.env.NODE_ENV === 'production' || process.env.FORCE_HTTPS === 'true',
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", ...allowedOrigins],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
      },
    },
  })
);

app.use((req, res, next) => {
  if (process.env.FORCE_HTTPS === 'true' && !req.secure) {
    const publicOrigin = String(process.env.PUBLIC_SERVER_URL || process.env.PUBLIC_SERVER_ORIGIN || '').trim();
    if (!publicOrigin) {
      return res.status(400).json({ status: 'error', message: 'PUBLIC_SERVER_URL обязателен для HTTPS redirect' });
    }
    try {
      const target = new URL(req.originalUrl, publicOrigin);
      return res.redirect(308, target.toString());
    } catch {
      return res.status(400).json({ status: 'error', message: 'Некорректный PUBLIC_SERVER_URL' });
    }
  }
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('CORS blocked'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Requested-With', 'X-Jola-CSRF', 'Authorization'],
  })
);

app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: process.env.BODY_LIMIT || '5mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.BODY_LIMIT || '5mb' }));
app.use(compression());
app.use(csrfProtection);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

if (process.env.NODE_ENV !== 'test') {
  const limiter = rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
    message: 'Слишком много запросов с этого IP, попробуйте позже',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);
}

app.use(mongoSanitize());
app.use(xssSanitizer());
app.use(hpp());

app.use('/api/config', configRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/services', printServiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/promocodes', promoCodeRoutes);
app.use('/api/telegram-mini', telegramMiniRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Jola API работает стабильно',
    timestamp: new Date().toISOString(),
    https: req.secure,
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Маршрут не найден',
  });
});

app.use(errorHandler);

export default app;
