import express from 'express';
import { APP_CURRENCY, TAX_RATE, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '../config/appConfig.js';

const router = express.Router();


router.get('/', (_req, res) => {
  res.json({
    status: 'success',
    data: {
      currency: APP_CURRENCY,
      taxRate: TAX_RATE,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      shippingFee: SHIPPING_FEE,
    },
  });
});

export default router;
