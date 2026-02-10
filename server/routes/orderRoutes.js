import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrders,
} from '../controllers/orderController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Пользовательские маршруты
router.post('/', createOrder);
router.get('/myorders', getMyOrders);
router.get('/:id', getOrderById);

// Админ маршруты
router.put('/:id/status', requireRole('admin'), updateOrderStatus);
router.get('/', requireRole('admin'), getAllOrders);

export default router;