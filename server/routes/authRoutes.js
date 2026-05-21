import express from 'express';
import { register, login, logout, getMe, forgotPassword, resetPassword, telegramAccessLogin } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);

router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password/:token', passwordResetLimiter, resetPassword);
router.get('/telegram/access/:token', telegramAccessLogin);

router.get('/me', protect, getMe);

export default router;
