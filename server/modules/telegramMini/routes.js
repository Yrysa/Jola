import express from 'express';
import {
  addTelegramMiniFavorite,
  createTelegramMiniSession,
  getTelegramMiniAdminSettings,
  getTelegramMiniBootstrap,
  getTelegramMiniConfig,
  getTelegramMiniFavorites,
  getTelegramMiniNotifications,
  getTelegramMiniOrderDetails,
  getTelegramMiniOrders,
  getTelegramMiniProductDetails,
  getTelegramMiniProducts,
  getTelegramMiniProfile,
  getTelegramMiniPromoCodes,
  getTelegramMiniSupport,
  getTelegramMiniSync,
  getTelegramMiniAdminOverview,
  markTelegramMiniProductViewed,
  previewTelegramMiniCheckout,
  previewTelegramMiniPromoCode,
  refreshTelegramMiniSession,
  commitTelegramMiniCheckoutController,
  createTelegramMiniCheckoutPaymentSessionController,
  streamTelegramMiniEvents,
  removeTelegramMiniFavorite,
  repeatTelegramMiniOrder,
  trackTelegramMiniAnalytics,
  updateTelegramMiniAdminSettings,
  updateTelegramMiniProfile,
  requireTelegramMiniEditor,
  requireTelegramMiniManager,
} from './controller.js';
import { protectTelegramMini, protectTelegramMiniStream, telegramMiniApiLimiter, telegramMiniSessionLimiter } from './auth.js';

const router = express.Router();
const v1 = express.Router();

v1.post('/session', telegramMiniSessionLimiter, createTelegramMiniSession);
v1.post('/refresh', telegramMiniSessionLimiter, refreshTelegramMiniSession);
v1.get('/events', telegramMiniApiLimiter, protectTelegramMiniStream, streamTelegramMiniEvents);

v1.use(telegramMiniApiLimiter, protectTelegramMini);

v1.get('/config', getTelegramMiniConfig);
v1.get('/bootstrap', getTelegramMiniBootstrap);
v1.get('/sync', getTelegramMiniSync);

v1.get('/profile', getTelegramMiniProfile);
v1.patch('/profile', updateTelegramMiniProfile);

v1.get('/products', getTelegramMiniProducts);
v1.get('/products/:id', getTelegramMiniProductDetails);
v1.post('/products/:id/view', markTelegramMiniProductViewed);

v1.get('/favorites', getTelegramMiniFavorites);
v1.post('/favorites/:productId', addTelegramMiniFavorite);
v1.delete('/favorites/:productId', removeTelegramMiniFavorite);

v1.get('/orders', getTelegramMiniOrders);
v1.get('/orders/:id', getTelegramMiniOrderDetails);
v1.post('/orders/:id/repeat', repeatTelegramMiniOrder);

v1.get('/notifications', getTelegramMiniNotifications);
v1.get('/support', getTelegramMiniSupport);
v1.get('/promocodes', getTelegramMiniPromoCodes);
v1.post('/promocodes/preview', previewTelegramMiniPromoCode);
v1.post('/checkout/draft', previewTelegramMiniCheckout);
v1.post('/checkout/commit', commitTelegramMiniCheckoutController);
v1.post('/checkout/:id/payment-session', createTelegramMiniCheckoutPaymentSessionController);

v1.post('/analytics', trackTelegramMiniAnalytics);

v1.get('/admin/overview', requireTelegramMiniManager, getTelegramMiniAdminOverview);
v1.get('/admin/settings', requireTelegramMiniManager, getTelegramMiniAdminSettings);
v1.patch('/admin/settings', requireTelegramMiniEditor, updateTelegramMiniAdminSettings);

router.use('/v1', v1);


router.post('/session', telegramMiniSessionLimiter, createTelegramMiniSession);
router.post('/refresh', telegramMiniSessionLimiter, refreshTelegramMiniSession);
router.use(telegramMiniApiLimiter, protectTelegramMini);
router.get('/bootstrap', getTelegramMiniBootstrap);
router.get('/products', getTelegramMiniProducts);
router.get('/orders', getTelegramMiniOrders);
router.get('/notifications', getTelegramMiniNotifications);
router.get('/support', getTelegramMiniSupport);
router.get('/promocodes', getTelegramMiniPromoCodes);

export default router;
