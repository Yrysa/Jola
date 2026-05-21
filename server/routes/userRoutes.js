import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
  getAllUsers,
  deleteUser,
  createTelegramLink,
  disconnectTelegram,
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);


router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);


router.put('/password', changeUserPassword);


router.post('/telegram/link', createTelegramLink);
router.delete('/telegram/link', disconnectTelegram);


router.get('/', admin, getAllUsers);
router.delete('/:id', admin, deleteUser);

export default router;