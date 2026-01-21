import User from '../models/User.js';
import { createError } from '../middleware/errorHandler.js';

// @desc    Получить профиль пользователя
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
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

// @desc    Обновить профиль пользователя
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
  try {
    const { name, email, address, phone, avatarUrl } = req.body;

    if (
      !name ||
      !email ||
      !phone ||
      !avatarUrl ||
      !address?.street ||
      !address?.city ||
      !address?.zipCode ||
      !address?.country
    ) {
      return next(createError('Все поля обязательны для заполнения', 400));
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return next(createError('Пользователь не найден', 404));
    }

    if (email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return next(createError('Пользователь с таким email уже существует', 400));
      }
    }

    user.name = name;
    user.email = email;
    user.address = address;
    user.phone = phone;
    user.avatarUrl = avatarUrl;

    const updatedUser = await user.save();

    res.json({
      status: 'success',
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          avatarUrl: updatedUser.avatarUrl,
          address: updatedUser.address,
          phone: updatedUser.phone,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Получить всех пользователей (админ)
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password');
    
    res.json({
      status: 'success',
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Удалить пользователя (админ)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return next(createError('Пользователь не найден', 404));
    }
    
    // Нельзя удалить самого себя
    if (user._id.toString() === req.user.id) {
      return next(createError('Нельзя удалить свой собственный аккаунт', 400));
    }
    
    await user.deleteOne();
    
    res.json({
      status: 'success',
      message: 'Пользователь удален',
    });
  } catch (error) {
    next(error);
  }
};
