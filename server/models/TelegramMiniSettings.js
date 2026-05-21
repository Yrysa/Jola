import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  question: { type: String, required: true, trim: true, maxlength: 220 },
  answer: { type: String, required: true, trim: true, maxlength: 2000 },
  category: { type: String, default: 'general', trim: true, maxlength: 60 },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { _id: false });

const bannerSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  subtitle: { type: String, default: '', trim: true, maxlength: 240 },
  badge: { type: String, default: '', trim: true, maxlength: 60 },
  ctaLabel: { type: String, default: '', trim: true, maxlength: 40 },
  actionType: {
    type: String,
    enum: ['view', 'url', 'promo', 'support'],
    default: 'view',
  },
  actionValue: { type: String, default: '', trim: true, maxlength: 280 },
  targetView: { type: String, default: 'home', trim: true, maxlength: 40 },
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { _id: false });

const telegramMiniSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'global',
    unique: true,
    trim: true,
  },
  version: {
    type: Number,
    default: 1,
  },
  blocks: {
    homeSummary: { type: Boolean, default: true },
    favorites: { type: Boolean, default: true },
    recentlyViewed: { type: Boolean, default: true },
    quickReorder: { type: Boolean, default: true },
    recommendations: { type: Boolean, default: true },
    promos: { type: Boolean, default: true },
    supportFaq: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true },
    loyalty: { type: Boolean, default: true },
    adminControl: { type: Boolean, default: true },
  },
  featureFlags: {
    favorites: { type: Boolean, default: true },
    recentlyViewed: { type: Boolean, default: true },
    quickReorder: { type: Boolean, default: true },
    profileEditing: { type: Boolean, default: true },
    cloudStorage: { type: Boolean, default: true },
    haptics: { type: Boolean, default: true },
    realtimeSync: { type: Boolean, default: true },
    biometry: { type: Boolean, default: false },
    invoicePayments: { type: Boolean, default: false },
    supportChat: { type: Boolean, default: true },
  },
  theme: {
    brandColor: { type: String, default: '#0b5bd3' },
    headerColor: { type: String, default: 'bg_color' },
    backgroundColor: { type: String, default: 'bg_color' },
  },
  editableProfileFields: {
    type: [String],
    default: ['name', 'phone'],
  },
  allowedFieldsByRole: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  support: {
    phone: { type: String, default: '' },
    telegram: { type: String, default: '' },
    email: { type: String, default: '' },
    workingHours: { type: String, default: 'Ежедневно 09:00–21:00' },
    faq: { type: [faqSchema], default: [] },
  },
  banners: {
    type: [bannerSchema],
    default: [],
  },
  collections: {
    type: [{
      id: { type: String, required: true },
      title: { type: String, required: true },
      source: { type: String, enum: ['featured', 'discounted', 'category', 'new', 'favorites'], default: 'featured' },
      category: { type: String, default: '' },
      limit: { type: Number, default: 8 },
      isActive: { type: Boolean, default: true },
      order: { type: Number, default: 0 },
    }],
    default: [],
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

export default mongoose.model('TelegramMiniSettings', telegramMiniSettingsSchema);
