import express from 'express';
import { getLatestReviews, getProductReviews, canReviewProduct, createReview } from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/latest', getLatestReviews);
router.get('/product/:productId', getProductReviews);
router.get('/can-review/:productId', protect, canReviewProduct);
router.post('/', protect, createReview);

export default router;
