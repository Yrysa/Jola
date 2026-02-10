import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { createError } from '../middleware/errorHandler.js';

const ADMIN_ORDER_STATUSES = ['new', 'paid', 'shipped', 'canceled'];

const normalizeOrderStatus = (status) => {
  const map = {
    pending: 'new',
    processing: 'new',
    delivered: 'shipped',
    cancelled: 'canceled',
  };

  return map[status] || status;
};

const buildOrderStatusFields = (status) => {
  if (status === 'paid') {
    return { isPaid: true, paidAt: new Date() };
  }

  if (status === 'shipped') {
    return { isDelivered: true, deliveredAt: new Date() };
  }

  if (status === 'canceled') {
    return { isDelivered: false };
  }

  return {};
};

export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(createError('Введите email и пароль', 400));
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || user.role !== 'admin') {
      return next(createError('Доступ только для администратора', 403));
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(createError('Неверные данные для входа', 401));
    }

    if (user.isBanned) {
      return next(createError('Аккаунт администратора заблокирован', 403));
    }

    await user.updateLastLogin();

    const token = user.getSignedJwtToken();

    return res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminProducts = async (req, res, next) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    return res.json({
      status: 'success',
      data: { products },
    });
  } catch (error) {
    next(error);
  }
};

export const createAdminProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);

    return res.status(201).json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return next(createError('Товар не найден', 404));
    }

    return res.json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

export const hideAdminProduct = async (req, res, next) => {
  try {
    const { isHidden = true } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isHidden: Boolean(isHidden) },
      { new: true, runValidators: true }
    );

    if (!product) {
      return next(createError('Товар не найден', 404));
    }

    return res.json({
      status: 'success',
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    const normalizedOrders = orders.map((order) => ({
      ...order.toObject(),
      status: normalizeOrderStatus(order.status),
    }));

    return res.json({
      status: 'success',
      data: { orders: normalizedOrders },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!ADMIN_ORDER_STATUSES.includes(status)) {
      return next(createError(`Статус должен быть одним из: ${ADMIN_ORDER_STATUSES.join(', ')}`, 400));
    }

    const updateFields = {
      status,
      ...buildOrderStatusFields(status),
    };

    const order = await Order.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    }).populate('user', 'name email');

    if (!order) {
      return next(createError('Заказ не найден', 404));
    }

    return res.json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });

    return res.json({
      status: 'success',
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAdminUser = async (req, res, next) => {
  try {
    const { role, isBanned } = req.body;

    if (req.params.id === String(req.user._id) && role && role !== 'admin') {
      return next(createError('Нельзя снять роль admin у самого себя', 400));
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return next(createError('Пользователь не найден', 404));
    }

    if (role) {
      user.role = role;
    }

    if (typeof isBanned === 'boolean') {
      user.isBanned = isBanned;
    }

    const updatedUser = await user.save();

    return res.json({
      status: 'success',
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          isBanned: updatedUser.isBanned,
          createdAt: updatedUser.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminStats = async (req, res, next) => {
  try {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const paidStatuses = ['paid', 'shipped'];

    const [day, week, month] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfDay }, status: { $in: paidStatuses } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfWeek }, status: { $in: paidStatuses } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, status: { $in: paidStatuses } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
    ]);

    return res.json({
      status: 'success',
      data: {
        sales: {
          day: day[0]?.total ?? 0,
          week: week[0]?.total ?? 0,
          month: month[0]?.total ?? 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
