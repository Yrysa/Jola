import PromoCode from '../models/PromoCode.js';
import { createError } from '../middleware/errorHandler.js';
import { evaluatePromoCode, listAvailablePromoCodes, normalizePromoCode } from '../utils/promocodes.js';

const pickPromo = (promo) => ({
  _id: promo._id,
  code: promo.code,
  title: promo.title,
  description: promo.description,
  type: promo.type,
  value: promo.value,
  minOrderAmount: promo.minOrderAmount,
  maxDiscountAmount: promo.maxDiscountAmount,
  usageLimit: promo.usageLimit,
  perUserLimit: promo.perUserLimit,
  startsAt: promo.startsAt,
  expiresAt: promo.expiresAt,
  isActive: promo.isActive,
  createdAt: promo.createdAt,
  updatedAt: promo.updatedAt,
  previewDiscount: promo.previewDiscount,
  validNow: promo.validNow,
  reason: promo.reason,
});

export const getAvailablePromoCodes = async (req, res, next) => {
  try {
    const subtotal = Number(req.query?.subtotal || 0);
    const promos = await listAvailablePromoCodes({ userId: req.user?._id, subtotal });
    return res.json({
      status: 'success',
      data: { promoCodes: promos.map(pickPromo) },
    });
  } catch (error) {
    next(error);
  }
};

export const validatePromoCode = async (req, res, next) => {
  try {
    const code = normalizePromoCode(req.query?.code || req.body?.code);
    const subtotal = Number(req.query?.subtotal || req.body?.subtotal || 0);
    if (!code) return next(createError('Укажите промокод', 400));

    const result = await evaluatePromoCode({ code, userId: req.user?._id, subtotal });
    return res.json({
      status: 'success',
      data: {
        promoCode: pickPromo(result.promo),
        discount: result.discount,
        subtotal: result.subtotal,
        totalAfterDiscount: result.totalAfterDiscount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllPromoCodes = async (_req, res, next) => {
  try {
    const promoCodes = await PromoCode.find().sort({ createdAt: -1 }).lean();
    return res.json({
      status: 'success',
      data: { promoCodes: promoCodes.map(pickPromo) },
    });
  } catch (error) {
    next(error);
  }
};

export const createPromoCode = async (req, res, next) => {
  try {
    const payload = {
      code: normalizePromoCode(req.body?.code),
      title: String(req.body?.title || '').trim(),
      description: String(req.body?.description || '').trim(),
      type: String(req.body?.type || 'percent').trim(),
      value: Number(req.body?.value || 0),
      minOrderAmount: Number(req.body?.minOrderAmount || 0),
      maxDiscountAmount: Number(req.body?.maxDiscountAmount || 0),
      usageLimit: Number(req.body?.usageLimit || 0),
      perUserLimit: Number(req.body?.perUserLimit ?? 1),
      startsAt: req.body?.startsAt || null,
      expiresAt: req.body?.expiresAt || null,
      isActive: req.body?.isActive !== false,
    };

    if (!payload.code) return next(createError('Код промокода обязателен', 400));
    if (!payload.title) return next(createError('Название промокода обязательно', 400));

    const promoCode = await PromoCode.create(payload);
    return res.status(201).json({
      status: 'success',
      data: { promoCode: pickPromo(promoCode) },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePromoCode = async (req, res, next) => {
  try {
    const patch = {};
    if (req.body?.code != null) patch.code = normalizePromoCode(req.body.code);
    if (req.body?.title != null) patch.title = String(req.body.title || '').trim();
    if (req.body?.description != null) patch.description = String(req.body.description || '').trim();
    if (req.body?.type != null) patch.type = String(req.body.type || '').trim();
    if (req.body?.value != null) patch.value = Number(req.body.value || 0);
    if (req.body?.minOrderAmount != null) patch.minOrderAmount = Number(req.body.minOrderAmount || 0);
    if (req.body?.maxDiscountAmount != null) patch.maxDiscountAmount = Number(req.body.maxDiscountAmount || 0);
    if (req.body?.usageLimit != null) patch.usageLimit = Number(req.body.usageLimit || 0);
    if (req.body?.perUserLimit != null) patch.perUserLimit = Number(req.body.perUserLimit || 0);
    if (req.body?.startsAt !== undefined) patch.startsAt = req.body.startsAt || null;
    if (req.body?.expiresAt !== undefined) patch.expiresAt = req.body.expiresAt || null;
    if (req.body?.isActive !== undefined) patch.isActive = Boolean(req.body.isActive);

    const promoCode = await PromoCode.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    }).lean();

    if (!promoCode) return next(createError('Промокод не найден', 404));

    return res.json({
      status: 'success',
      data: { promoCode: pickPromo(promoCode) },
    });
  } catch (error) {
    next(error);
  }
};

export const deletePromoCode = async (req, res, next) => {
  try {
    const promoCode = await PromoCode.findById(req.params.id);
    if (!promoCode) return next(createError('Промокод не найден', 404));
    await promoCode.deleteOne();
    return res.json({
      status: 'success',
      data: { message: 'Промокод удалён' },
    });
  } catch (error) {
    next(error);
  }
};
