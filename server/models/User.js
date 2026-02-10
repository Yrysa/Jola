import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const loginHistorySchema = new mongoose.Schema(
  {
    ip: { type: String, default: 'unknown' },
    userAgent: { type: String, default: 'unknown' },
    device: { type: String, default: 'unknown' },
    loggedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: 'Основной адрес' },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Имя обязательно'],
      trim: true,
      maxlength: [50, 'Имя не может быть длиннее 50 символов'],
    },
    surname: {
      type: String,
      trim: true,
      maxlength: [50, 'Фамилия не может быть длиннее 50 символов'],
      default: '',
    },
    birthday: { type: Date, default: null },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
    },
    email: {
      type: String,
      required: [true, 'Email обязателен'],
      unique: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/, 'Неверный формат email'],
    },
    secondaryEmail: {
      type: String,
      lowercase: true,
      default: '',
      match: [/^$|^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/, 'Неверный формат дополнительного email'],
    },
    backupEmail: {
      type: String,
      lowercase: true,
      default: '',
      match: [/^$|^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/, 'Неверный формат резервного email'],
    },
    password: {
      type: String,
      required: [true, 'Пароль обязателен'],
      minlength: [6, 'Пароль должен содержать минимум 6 символов'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    avatarUrl: {
      type: String,
      default: 'https://i.pravatar.cc/150?img=3',
    },
    address: {
      street: String,
      city: String,
      zipCode: String,
      country: String,
    },
    deliveryAddresses: {
      type: [addressSchema],
      default: [],
    },
    phone: {
      type: String,
      match: [/^\+?[1-9]\d{1,14}$/, 'Неверный формат телефона'],
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    notificationPreferences: {
      emailNewsletter: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
      pushNotifications: { type: Boolean, default: true },
      telegramNotifications: { type: Boolean, default: false },
      notificationFrequency: {
        type: String,
        enum: ['instant', 'daily', 'weekly'],
        default: 'instant',
      },
    },
    localeSettings: {
      language: { type: String, default: 'ru' },
      currency: { type: String, default: 'RUB' },
      timezone: { type: String, default: 'Europe/Moscow' },
    },
    socialLinks: {
      googleConnected: { type: Boolean, default: false },
      facebookConnected: { type: Boolean, default: false },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorCode: String,
    twoFactorCodeExpire: Date,
    loginHistory: {
      type: [loginHistorySchema],
      default: [],
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

userSchema.methods.updateLastLogin = function(meta = {}) {
  this.lastLogin = Date.now();
  this.loginHistory.unshift({
    ip: meta.ip || 'unknown',
    userAgent: meta.userAgent || 'unknown',
    device: meta.device || 'unknown',
    loggedAt: new Date(),
  });

  if (this.loginHistory.length > 20) {
    this.loginHistory = this.loginHistory.slice(0, 20);
  }

  return this.save({ validateBeforeSave: false });
};

userSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

userSchema.methods.getEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(20).toString('hex');
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  this.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
  return verificationToken;
};

userSchema.methods.generateTwoFactorCode = function() {
  const code = `${Math.floor(100000 + Math.random() * 900000)}`;
  this.twoFactorCode = crypto.createHash('sha256').update(code).digest('hex');
  this.twoFactorCodeExpire = Date.now() + 5 * 60 * 1000;
  return code;
};

export default mongoose.model('User', userSchema);
