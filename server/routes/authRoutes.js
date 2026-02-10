import express from 'express';
import {
  register,
  login,
  getMe,
  refreshToken,
  logout,
  verifyEmail,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  authLoginLimiter,
  authRegisterLimiter,
  authRecoveryLimiter,
} from '../middleware/rateLimiter.js';
import {
  loginValidation,
  registerValidation,
  verifyEmailValidation,
} from '../middleware/authValidation.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

router.post('/register', authRegisterLimiter, registerValidation, validate, register);
router.post('/login', authLoginLimiter, loginValidation, validate, login);
router.post('/verify-email', authRecoveryLimiter, verifyEmailValidation, validate, verifyEmail);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

router.get('/me', protect, getMe);

export default router;
