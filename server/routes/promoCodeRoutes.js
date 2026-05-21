import express from 'express';
import {
  createPromoCode,
  deletePromoCode,
  getAllPromoCodes,
  getAvailablePromoCodes,
  updatePromoCode,
  validatePromoCode,
} from '../controllers/promoCodeController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.get('/active', getAvailablePromoCodes);
router.get('/validate', validatePromoCode);
router.get('/', admin, getAllPromoCodes);
router.post('/', admin, createPromoCode);
router.put('/:id', admin, updatePromoCode);
router.delete('/:id', admin, deletePromoCode);

export default router;
