import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import connectDB from './config/db.js';
import hpp from 'hpp';
import compression from 'compression';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Routes
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Middleware
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Безопасность: Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:5173"],
    },
  },
}));

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS),
  message: 'Слишком много запросов с этого IP, попробуйте позже',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Сжатие
app.use(compression());

// Логирование
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Static files
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'ProckX API работает стабильно',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Маршрут не найден',
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 ProckX Server запущен на порту ${PORT} в режиме ${process.env.NODE_ENV}`);
    console.log(`🔗 Frontend: ${process.env.CLIENT_URL}`);
  });
};

server();

// Graceful shutdown
process.on('unhandledRejection', (err) => {
  console.log('❌ Unhandled Rejection! Выключение сервера...');
  console.error(err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.log('❌ Uncaught Exception! Выключение сервера...');
  console.error(err);
  process.exit(1);
});