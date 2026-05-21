import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Имя обязательно'],
    trim: true,
    maxlength: [50, 'Имя не может быть длиннее 50 символов'],
  },
  email: {
    type: String,
    required: [true, 'Email обязателен'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Неверный формат email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Пароль обязателен'],
    minlength: [6, 'Пароль должен содержать минимум 6 символов'],
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'client', 'manager', 'admin', 'observer'],
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
  phone: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Неверный формат телефона'],
  },
  isVerified: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  walletBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
  bonusBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
  personalDiscount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false },

  
  telegramUsername: {
    type: String,
    trim: true,
    maxlength: 64,
  },
  telegramChatId: {
    type: String,
    trim: true,
    select: false,
  },
  telegramLinkToken: {
    type: String,
    trim: true,
    select: false,
  },
  telegramLinkTokenExpire: {
    type: Date,
    select: false,
  },
  telegramLinkedAt: {
    type: Date,
  },
  telegramAuthTokenHash: {
    type: String,
    trim: true,
    select: false,
  },
  telegramAuthTokenExpire: {
    type: Date,
    select: false,
  },
  telegramMiniFavoriteProductIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  telegramMiniRecentProductIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  telegramMiniLastAddress: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: '' },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});


userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});


userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};


userSchema.methods.updateLastLogin = function() {
  this.lastLogin = Date.now();
  return this.save({ validateBeforeSave: false });
};

export default mongoose.model('User', userSchema);
