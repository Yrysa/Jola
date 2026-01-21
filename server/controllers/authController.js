import User from '../models/User.js';
import { createError } from '../middleware/errorHandler.js';

// @desc    Зарегистрировать пользователя
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return next(createError('Пожалуйста, заполните все поля', 400));
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(createError('Пользователь с таким email уже существует', 400));
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: email === process.env.ADMIN_EMAIL ? 'admin' : 'user',
      isVerified: true, // сразу считаем подтверждённым
    });


    // Generate token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Авторизовать пользователя
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return next(createError('Пожалуйста, введите email и пароль', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(createError('Неверные данные для входа', 401));
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(createError('Неверные данные для входа', 401));
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = user.getSignedJwtToken();

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          address: user.address,
          phone: user.phone,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Получить данные текущего пользователя
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};