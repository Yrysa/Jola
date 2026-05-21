import mongoose from 'mongoose';

const telegramMiniSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  telegramId: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  refreshTokenHash: {
    type: String,
    required: true,
    select: false,
  },
  initDataHash: {
    type: String,
    default: '',
    select: false,
  },
  roleSnapshot: {
    type: String,
    default: 'client',
    trim: true,
  },
  userAgent: {
    type: String,
    default: '',
    maxlength: 500,
  },
  ip: {
    type: String,
    default: '',
    maxlength: 120,
  },
  lastSeenAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  refreshExpiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },
  },
  revokedAt: {
    type: Date,
    default: null,
    index: true,
  },
  revokeReason: {
    type: String,
    default: '',
    maxlength: 240,
  },
}, {
  timestamps: true,
});

telegramMiniSessionSchema.index({ user: 1, revokedAt: 1, refreshExpiresAt: -1 });

export default mongoose.model('TelegramMiniSession', telegramMiniSessionSchema);
