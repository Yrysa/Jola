import express from 'express';
import { verifyStripeSession } from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/stripe/verify', protect, verifyStripeSession);

export default router;
