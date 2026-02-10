import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import {
  adminLogin,
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  hideAdminProduct,
  getAdminOrders,
  updateAdminOrderStatus,
  getAdminUsers,
  updateAdminUser,
  getAdminStats,
} from '../controllers/adminController.js';

const router = express.Router();

router.post('/login', adminLogin);

router.use(protect, requireRole('admin'));

router.get('/products', getAdminProducts);
router.post('/products', createAdminProduct);
router.put('/products/:id', updateAdminProduct);
router.patch('/products/:id/hide', hideAdminProduct);

router.get('/orders', getAdminOrders);
router.patch('/orders/:id/status', updateAdminOrderStatus);

router.get('/users', getAdminUsers);
router.patch('/users/:id', updateAdminUser);

router.get('/stats', getAdminStats);

export default router;
