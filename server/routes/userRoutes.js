import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  deleteUser,
} from '../controllers/userController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Профиль пользователя
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

// Админ маршруты
router.get('/', requireRole('admin'), getAllUsers);
router.delete('/:id', requireRole('admin'), deleteUser);

export default router;