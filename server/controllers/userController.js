import User from '../models/User.js';
import { createError } from '../middleware/errorHandler.js';

const normalizeDeliveryAddresses = (addresses = []) => {
  let hasDefault = false;

  const normalized = addresses
    .filter((address) => address && address.street && address.city && address.zipCode && address.country)
    .map((address, index) => {
      const isDefault = Boolean(address.isDefault) && !hasDefault;
      if (isDefault) hasDefault = true;

      return {
        label: address.label || `Адрес ${index + 1}`,
        street: address.street,
        city: address.city,
        zipCode: address.zipCode,
        country: address.country,
        isDefault,
      };
    });

  if (normalized.length && !hasDefault) {
    normalized[0].isDefault = true;
  }

  return normalized;
};

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

export const updateUserProfile = async (req, res, next) => {
  try {
    const {
      name,
      surname,
      email,
      secondaryEmail,
      backupEmail,
      address,
      deliveryAddresses,
      phone,
      avatarUrl,
      birthday,
      gender,
      notificationPreferences,
      localeSettings,
    } = req.body;

    if (!name || !email) {
      return next(createError('Имя и email обязательны для заполнения', 400));
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
    user.surname = surname || '';
    user.email = email;
    user.secondaryEmail = secondaryEmail || '';
    user.backupEmail = backupEmail || '';
    user.address = address || user.address;
    user.deliveryAddresses = normalizeDeliveryAddresses(deliveryAddresses || user.deliveryAddresses);
    user.phone = phone || user.phone;
    user.avatarUrl = avatarUrl || user.avatarUrl;
    user.birthday = birthday || null;
    user.gender = gender || user.gender;

    if (notificationPreferences) {
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...notificationPreferences,
      };
    }

    if (localeSettings) {
      user.localeSettings = {
        ...user.localeSettings,
        ...localeSettings,
      };
    }

    const updatedUser = await user.save();

    res.json({
      status: 'success',
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          surname: updatedUser.surname,
          email: updatedUser.email,
          secondaryEmail: updatedUser.secondaryEmail,
          backupEmail: updatedUser.backupEmail,
          role: updatedUser.role,
          avatarUrl: updatedUser.avatarUrl,
          address: updatedUser.address,
          deliveryAddresses: updatedUser.deliveryAddresses,
          phone: updatedUser.phone,
          birthday: updatedUser.birthday,
          gender: updatedUser.gender,
          notificationPreferences: updatedUser.notificationPreferences,
          localeSettings: updatedUser.localeSettings,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(createError('Укажите текущий и новый пароль', 400));
    }

    if (newPassword.length < 6) {
      return next(createError('Новый пароль должен быть не менее 6 символов', 400));
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return next(createError('Пользователь не найден', 404));
    }

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return next(createError('Текущий пароль введён неверно', 400));
    }

    user.password = newPassword;
    await user.save();

    res.json({
      status: 'success',
      message: 'Пароль успешно изменён',
    });
  } catch (error) {
    next(error);
  }
};

export const toggleTwoFactor = async (req, res, next) => {
  try {
    const { enabled } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(createError('Пользователь не найден', 404));
    }

    user.twoFactorEnabled = Boolean(enabled);
    if (!user.twoFactorEnabled) {
      user.twoFactorCode = undefined;
      user.twoFactorCodeExpire = undefined;
    }

    await user.save({ validateBeforeSave: false });

    res.json({
      status: 'success',
      message: `2FA ${user.twoFactorEnabled ? 'включена' : 'выключена'}`,
      data: { twoFactorEnabled: user.twoFactorEnabled },
    });
  } catch (error) {
    next(error);
  }
};

export const getLoginHistory = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('loginHistory lastLogin');

    res.json({
      status: 'success',
      data: {
        lastLogin: user?.lastLogin || null,
        loginHistory: user?.loginHistory || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

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

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(createError('Пользователь не найден', 404));
    }

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
