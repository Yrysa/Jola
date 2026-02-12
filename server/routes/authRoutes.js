import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Rate limiting для аутентификации
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Защищенные маршруты
router.get('/me', protect, getMe);

export default router;