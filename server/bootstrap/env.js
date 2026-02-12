// server/bootstrap/env.js
// Загружаем переменные окружения максимально рано (до импортов роутов/контроллеров).
import dotenv from 'dotenv';

dotenv.config();

// Дефолты, чтобы не ловить NaN/undefined в рантайме
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';
if (!process.env.CLIENT_URL) process.env.CLIENT_URL = 'http://localhost:5173';

// Безопасные дефолты для rate-limit
if (!process.env.RATE_LIMIT_WINDOW_MS) process.env.RATE_LIMIT_WINDOW_MS = String(15 * 60 * 1000); // 15 мин
if (!process.env.RATE_LIMIT_MAX_REQUESTS) process.env.RATE_LIMIT_MAX_REQUESTS = '200';
