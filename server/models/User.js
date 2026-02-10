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
    minlength: [8, 'Пароль должен содержать минимум 8 символов'],
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  permissions: {
    type: [String],
    default: [],
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
    default: false,
  },
  verificationTokenHash: {
    type: String,
    select: false,
  },
  verificationTokenExpiresAt: {
    type: Date,
    select: false,
  },
  refreshTokenHash: {
    type: String,
    select: false,
  },
  refreshTokenExpiresAt: {
    type: Date,
    select: false,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
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
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role, permissions: this.permissions },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

userSchema.methods.getSignedRefreshToken = function() {
  return jwt.sign(
    { id: this._id, tokenType: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
};

userSchema.methods.updateLastLogin = function() {
  this.lastLogin = Date.now();
  return this.save({ validateBeforeSave: false });
};

export default mongoose.model('User', userSchema);
