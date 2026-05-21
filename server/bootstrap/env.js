

import dotenv from 'dotenv';

dotenv.config();


if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';
if (!process.env.CLIENT_URL) process.env.CLIENT_URL = 'http://localhost:5173';


if (!process.env.RATE_LIMIT_WINDOW_MS) process.env.RATE_LIMIT_WINDOW_MS = String(15 * 60 * 1000); 
if (!process.env.RATE_LIMIT_MAX_REQUESTS) process.env.RATE_LIMIT_MAX_REQUESTS = '200';
