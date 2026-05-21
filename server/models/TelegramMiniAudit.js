import mongoose from 'mongoose';

const telegramMiniAuditSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  telegramId: {
    type: String,
    default: '',
    trim: true,
    index: true,
  },
  sessionId: {
    type: String,
    default: '',
    trim: true,
    index: true,
  },
  event: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  severity: {
    type: String,
    enum: ['info', 'warn', 'danger'],
    default: 'info',
    index: true,
  },
  route: {
    type: String,
    default: '',
    maxlength: 240,
  },
  method: {
    type: String,
    default: '',
    maxlength: 12,
  },
  ip: {
    type: String,
    default: '',
    maxlength: 120,
  },
  userAgent: {
    type: String,
    default: '',
    maxlength: 500,
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

telegramMiniAuditSchema.index({ createdAt: -1, event: 1 });

export default mongoose.model('TelegramMiniAudit', telegramMiniAuditSchema);
