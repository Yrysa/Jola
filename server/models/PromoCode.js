import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Код промокода обязателен'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [32, 'Код слишком длинный'],
  },
  title: {
    type: String,
    required: [true, 'Название промокода обязательно'],
    trim: true,
    maxlength: [120, 'Название слишком длинное'],
  },
  description: {
    type: String,
    default: '',
    maxlength: [280, 'Описание слишком длинное'],
  },
  type: {
    type: String,
    enum: ['percent', 'fixed'],
    default: 'percent',
  },
  value: {
    type: Number,
    required: [true, 'Значение скидки обязательно'],
    min: [0, 'Скидка не может быть отрицательной'],
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: [0, 'Минимальная сумма не может быть отрицательной'],
  },
  maxDiscountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Максимальная скидка не может быть отрицательной'],
  },
  usageLimit: {
    type: Number,
    default: 0,
    min: [0, 'Лимит использований не может быть отрицательным'],
  },
  perUserLimit: {
    type: Number,
    default: 1,
    min: [0, 'Лимит на пользователя не может быть отрицательным'],
  },
  startsAt: {
    type: Date,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

promoCodeSchema.index({ code: 1 }, { unique: true });
promoCodeSchema.index({ isActive: 1, startsAt: 1, expiresAt: 1 });

export default mongoose.model('PromoCode', promoCodeSchema);
