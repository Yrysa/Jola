import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrders,
  deleteOrder,
} from '../controllers/orderController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);


router.post('/', createOrder);
router.get('/myorders', getMyOrders);
router.get('/:id', getOrderById);


router.put('/:id/status', admin, updateOrderStatus);
router.delete('/:id', admin, deleteOrder);
router.get('/', admin, getAllOrders);

export default router;