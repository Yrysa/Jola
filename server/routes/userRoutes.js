import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  toggleTwoFactor,
  getLoginHistory,
  getAllUsers,
  deleteUser,
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.put('/change-password', changePassword);
router.patch('/2fa', toggleTwoFactor);
router.get('/login-history', getLoginHistory);

router.get('/', admin, getAllUsers);
router.delete('/:id', admin, deleteUser);

export default router;
