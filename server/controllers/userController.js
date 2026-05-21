import User from '../models/User.js';
import { createError } from '../middleware/errorHandler.js';
import crypto from 'crypto';
import { pickPublicUser } from '../utils/auth.js';
import { cleanupUserOrderAndFiles } from '../utils/orderLifecycle.js';
import Review from '../models/Review.js';
import StockLog from '../models/StockLog.js';


const normalizePhone = (input) => {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  
  let d = digits;
  if (d.length === 10) d = `7${d}`; 
  if (d.length === 11 && d.startsWith('8')) d = `7${d.slice(1)}`; 

  return `+${d}`;
};

const isValidE164 = (phone) => /^\+\d{10,15}$/.test(phone);

const pickUser = pickPublicUser;


export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?._id).select('-password +telegramChatId');
    if (!user) return next(createError('Пользователь не найден', 404));

    return res.json({
      status: 'success',
      data: { user: pickUser(user) },
    });
  } catch (e) {
    next(e);
  }
};


export const updateUserProfile = async (req, res, next) => {
  try {
    const { name, email, address, phone, avatarUrl } = req.body;

    if (!String(name || '').trim() || !String(email || '').trim()) {
      return next(createError('Имя и email обязательны', 400));
    }

    if (!address || !address.street || !address.city || !address.zipCode || !address.country) {
      return next(createError('Адрес доставки заполнен не полностью', 400));
    }

    if (!phone) {
      return next(createError('Телефон обязателен', 400));
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone || !isValidE164(normalizedPhone)) {
      return next(createError('Некорректный формат телефона', 400));
    }

    
    if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim()) {
      const trimmed = avatarUrl.trim();
      if (/^data:/i.test(trimmed)) {
        return next(createError('Data URL для аватара запрещён — используйте обычную HTTPS-ссылку', 400));
      }
      try {
        const u = new URL(trimmed);
        if (!/^https?:$/.test(u.protocol)) throw new Error('bad protocol');
      } catch (e) {
        return next(createError('Некорректная ссылка на аватар', 400));
      }
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const duplicateUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user?._id },
    }).select('_id').lean();
    if (duplicateUser) {
      return next(createError('Пользователь с таким email уже существует', 409));
    }

    const user = await User.findById(req.user?._id);
    if (!user) return next(createError('Пользователь не найден', 404));

    user.name = String(name).trim();
    user.email = normalizedEmail;
    user.address = address;
    user.phone = normalizedPhone;

    if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim()) {
      user.avatarUrl = avatarUrl.trim();
    }

    await user.save();
    const updated = await User.findById(req.user?._id).select('-password +telegramChatId');

    return res.json({
      status: 'success',
      data: { user: pickUser(updated) },
    });
  } catch (e) {
    next(e);
  }
};


export const changeUserPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(createError('Введите текущий и новый пароль', 400));
    }

    if (String(newPassword).length < 6) {
      return next(createError('Новый пароль должен содержать минимум 6 символов', 400));
    }

    const user = await User.findById(req.user?._id).select('+password');
    if (!user) return next(createError('Пользователь не найден', 404));

    const isMatch = await user.matchPassword(String(currentPassword));
    if (!isMatch) {
      return next(createError('Текущий пароль неверный', 401));
    }

    user.password = String(newPassword);
    await user.save();

    return res.json({
      status: 'success',
      data: { message: 'Пароль обновлён' },
    });
  } catch (e) {
    next(e);
  }
};


export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password +telegramChatId').sort({ createdAt: -1 });
    return res.json({
      status: 'success',
      data: { users: users.map(pickUser) },
    });
  } catch (e) {
    next(e);
  }
};


export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(createError('Пользователь не найден', 404));

    
    if (String(user._id) === String(req.user?._id)) {
      return next(createError('Нельзя удалить текущего пользователя', 400));
    }

    await cleanupUserOrderAndFiles(user._id);
    await Review.deleteMany({ user: user._id });
    await StockLog.deleteMany({ changedBy: user._id });
    await user.deleteOne();
    return res.json({
      status: 'success',
      data: { message: 'Пользователь удалён' },
    });
  } catch (e) {
    next(e);
  }
};


export const createTelegramLink = async (req, res, next) => {
  try {
    
    
    let botUsername = String(process.env.TELEGRAM_BOT_USERNAME || '').trim();
    if (!botUsername) {
      const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
      if (token) {
        try {
          const r = await fetch(`https://api.telegram.org/bot${token}/getMe`);
          const j = await r.json();
          if (j?.ok && j?.result?.username) botUsername = String(j.result.username).trim();
        } catch {
          
        }
      }
    }

    if (!botUsername) {
      return next(
        createError(
          'Telegram не настроен: укажи TELEGRAM_BOT_TOKEN и TELEGRAM_BOT_USERNAME в server/.env (или только TELEGRAM_BOT_TOKEN — username попробуем получить автоматически)',
          400
        )
      );
    }

    const user = await User.findById(req.user?._id);
    if (!user) return next(createError('Пользователь не найден', 404));

    
    const token = crypto.randomBytes(20).toString('hex');
    user.telegramLinkToken = token;
    user.telegramLinkTokenExpire = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const link = `https://t.me/${botUsername}?start=${token}`;
    return res.json({
      status: 'success',
      data: {
        link,
        expiresAt: user.telegramLinkTokenExpire,
      },
    });
  } catch (e) {
    next(e);
  }
};


export const disconnectTelegram = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return next(createError('Пользователь не найден', 404));

    user.telegramChatId = undefined;
    user.telegramUsername = undefined;
    user.telegramLinkedAt = undefined;
    user.telegramLinkToken = undefined;
    user.telegramLinkTokenExpire = undefined;
    user.telegramAuthTokenHash = undefined;
    user.telegramAuthTokenExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return res.json({
      status: 'success',
      data: { message: 'Telegram отвязан' },
    });
  } catch (e) {
    next(e);
  }
};
