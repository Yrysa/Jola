import PromoCode from '../models/PromoCode.js';
import Order from '../models/Order.js';
import { createError } from '../middleware/errorHandler.js';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const normalizePromoCode = (value) => String(value || '').trim().toUpperCase();

const isWithinDates = (promo, now = new Date()) => {
  if (promo?.startsAt && new Date(promo.startsAt) > now) return false;
  if (promo?.expiresAt && new Date(promo.expiresAt) < now) return false;
  return true;
};

const buildUsageQuery = (promoCode) => ({
  'promo.code': normalizePromoCode(promoCode),
  status: { $ne: 'cancelled' },
});

export const computePromoDiscount = ({ promo, subtotal }) => {
  const cleanSubtotal = Math.max(0, Number(subtotal) || 0);
  if (!promo || cleanSubtotal <= 0) return 0;

  let discount = 0;
  if (promo.type === 'percent') {
    discount = cleanSubtotal * (Number(promo.value || 0) / 100);
  } else {
    discount = Number(promo.value || 0);
  }

  if (Number(promo.maxDiscountAmount || 0) > 0) {
    discount = Math.min(discount, Number(promo.maxDiscountAmount || 0));
  }

  return round2(Math.max(0, Math.min(discount, cleanSubtotal)));
};

export const evaluatePromoCode = async ({ code, userId, subtotal }) => {
  const normalizedCode = normalizePromoCode(code);
  if (!normalizedCode) return null;

  const promo = await PromoCode.findOne({ code: normalizedCode }).lean();
  if (!promo) {
    throw createError('Промокод не найден', 404);
  }
  if (!promo.isActive) {
    throw createError('Промокод отключён', 400);
  }
  if (!isWithinDates(promo)) {
    throw createError('Срок действия промокода истёк или ещё не начался', 400);
  }

  const cleanSubtotal = Math.max(0, Number(subtotal) || 0);
  if (cleanSubtotal < Number(promo.minOrderAmount || 0)) {
    throw createError(`Минимальная сумма заказа для промокода: ${round2(promo.minOrderAmount || 0)} ₸`, 400);
  }

  if (Number(promo.usageLimit || 0) > 0) {
    const totalUses = await Order.countDocuments(buildUsageQuery(normalizedCode));
    if (totalUses >= Number(promo.usageLimit || 0)) {
      throw createError('Лимит использований промокода исчерпан', 400);
    }
  }

  if (userId && Number(promo.perUserLimit || 0) > 0) {
    const perUserUses = await Order.countDocuments({
      ...buildUsageQuery(normalizedCode),
      user: userId,
    });
    if (perUserUses >= Number(promo.perUserLimit || 0)) {
      throw createError('Вы уже использовали этот промокод максимальное количество раз', 400);
    }
  }

  const discount = computePromoDiscount({ promo, subtotal: cleanSubtotal });
  return {
    promo,
    discount,
    code: normalizedCode,
    subtotal: round2(cleanSubtotal),
    totalAfterDiscount: round2(Math.max(0, cleanSubtotal - discount)),
  };
};

export const listAvailablePromoCodes = async ({ userId = null, subtotal = 0 } = {}) => {
  const now = new Date();
  const promos = await PromoCode.find({
    isActive: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();

  const result = [];
  for (const promo of promos) {
    try {
      const applied = await evaluatePromoCode({ code: promo.code, userId, subtotal });
      result.push({ ...promo, previewDiscount: applied.discount, validNow: true, reason: '' });
    } catch (error) {
      result.push({ ...promo, previewDiscount: 0, validNow: false, reason: error?.message || 'Недоступно' });
    }
  }

  return result;
};
