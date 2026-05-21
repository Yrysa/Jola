import mongoose from 'mongoose';
import Product from '../../models/Product.js';
import User from '../../models/User.js';
import Order from '../../models/Order.js';
import PromoCode from '../../models/PromoCode.js';
import TelegramMiniSession from '../../models/TelegramMiniSession.js';
import TelegramMiniAudit from '../../models/TelegramMiniAudit.js';
import { createError } from '../../middleware/errorHandler.js';
import { evaluatePromoCode, listAvailablePromoCodes, normalizePromoCode } from '../../utils/promocodes.js';
import {
  createTelegramMiniSessionRecord,
  extractRawInitData,
  issueSessionTokens,
  issueTelegramMiniAccessToken,
  requireTelegramMiniRoles,
  rotateTelegramMiniRefreshToken,
  validateTelegramInitData,
  verifyRefreshToken,
  writeTelegramMiniAudit,
} from './auth.js';
import { normalizeTelegramRole } from './fieldPolicy.js';
import { getTelegramMiniSettings } from './settings.js';
import { buildTelegramMiniCheckoutDraft, commitTelegramMiniCheckout, createTelegramMiniPaymentSession } from './checkout.js';
import {
  serializeDashboardPayload,
  serializeTelegramNotification,
  serializeTelegramOrder,
  serializeTelegramProduct,
  serializeTelegramProfile,
  serializeTelegramPromo,
  serializeTelegramSettings,
  serializeTelegramSupport,
  serializeTelegramWallet,
} from './serializers.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const safe = (v) => (v == null ? '' : String(v));
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));

const groupNotificationLabel = {
  order_status: 'orders',
  new_order: 'orders',
  low_stock: 'inventory',
  personal_message: 'messages',
};

const buildSummary = ({ user, notificationsCount = 0, orders = [], promoCodes = [], favoritesCount = 0 }) => ({
  balance: Number(user?.walletBalance || 0),
  bonuses: Number(user?.bonusBalance || 0),
  discount: Number(user?.personalDiscount || 0),
  activeOrders: orders.filter((item) => ['pending', 'confirmed', 'processing', 'shipped'].includes(String(item.status || ''))).length,
  deliveredOrders: orders.filter((item) => String(item.status || '') === 'delivered').length,
  promoCount: promoCodes.length,
  notificationsCount,
  favoritesCount,
});

const getFavoriteIds = (user) => new Set((Array.isArray(user?.telegramMiniFavoriteProductIds) ? user.telegramMiniFavoriteProductIds : []).map((item) => String(item)));
const getRecentIds = (user) => (Array.isArray(user?.telegramMiniRecentProductIds) ? user.telegramMiniRecentProductIds : []).map((item) => String(item));

const buildUserNotifications = async (userId) => {
  const orders = await Order.find({ user: userId })
    .sort({ updatedAt: -1 })
    .limit(10)
    .select('_id status updatedAt createdAt totalPrice statusHistory')
    .lean();

  return orders.map((order) => {
    const latestStatus = Array.isArray(order.statusHistory) && order.statusHistory.length
      ? order.statusHistory[order.statusHistory.length - 1]
      : null;
    const type = 'order_status';
    return {
      id: `order-${order._id}-${latestStatus?.at || order.updatedAt || order.createdAt}`,
      type,
      group: groupNotificationLabel[type],
      title: `Заказ ORD-${String(order._id).slice(-6).toUpperCase()}`,
      body: latestStatus?.status
        ? `Статус заказа обновлён: ${latestStatus.status}`
        : `Заказ на сумму ${Number(order.totalPrice || 0)} ₸`,
      createdAt: latestStatus?.at || order.updatedAt || order.createdAt,
      severity: ['cancelled'].includes(String(order.status || '')) ? 'danger' : 'info',
      entityType: 'order',
      entityId: String(order._id),
    };
  });
};

const buildAdminNotifications = async () => {
  const [orders, products] = await Promise.all([
    Order.find().sort({ createdAt: -1 }).limit(6).select('_id status createdAt totalPrice').lean(),
    Product.find({ stock: { $gt: 0, $lte: 5 } }).sort({ stock: 1, updatedAt: -1 }).limit(6).select('_id name stock updatedAt').lean(),
  ]);

  return [
    ...orders.map((order) => ({
      id: `admin-order-${order._id}`,
      type: 'new_order',
      group: groupNotificationLabel.new_order,
      title: `Новый заказ ORD-${String(order._id).slice(-6).toUpperCase()}`,
      body: `Сумма ${Number(order.totalPrice || 0)} ₸ · статус ${order.status}`,
      createdAt: order.createdAt,
      severity: 'info',
      entityType: 'order',
      entityId: String(order._id),
    })),
    ...products.map((product) => ({
      id: `low-stock-${product._id}`,
      type: 'low_stock',
      group: groupNotificationLabel.low_stock,
      title: `Низкий остаток: ${product.name}`,
      body: `На складе осталось ${Number(product.stock || 0)} шт.`,
      createdAt: product.updatedAt,
      severity: Number(product.stock || 0) <= 2 ? 'danger' : 'warn',
      entityType: 'product',
      entityId: String(product._id),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 12);
};

const getNotificationsForUser = async (user) => (
  normalizeTelegramRole(user?.role) === 'admin' || normalizeTelegramRole(user?.role) === 'manager' || normalizeTelegramRole(user?.role) === 'observer'
    ? buildAdminNotifications()
    : buildUserNotifications(user?._id)
);

const getSyncSnapshot = async ({ user, settings }) => {
  const baseOrderQuery = ['admin', 'manager', 'observer'].includes(normalizeTelegramRole(user?.role)) ? {} : { user: user._id };
  const [latestOrder, latestProduct, latestPromo, latestOwnUser] = await Promise.all([
    Order.findOne(baseOrderQuery).sort({ updatedAt: -1 }).select('updatedAt').lean(),
    Product.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean(),
    PromoCode.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean(),
    User.findById(user._id).select('updatedAt').lean(),
  ]);

  return {
    serverTime: new Date().toISOString(),
    ordersRevision: latestOrder?.updatedAt ? new Date(latestOrder.updatedAt).toISOString() : null,
    productsRevision: latestProduct?.updatedAt ? new Date(latestProduct.updatedAt).toISOString() : null,
    promosRevision: latestPromo?.updatedAt ? new Date(latestPromo.updatedAt).toISOString() : null,
    profileRevision: latestOwnUser?.updatedAt ? new Date(latestOwnUser.updatedAt).toISOString() : null,
    settingsRevision: settings?.updatedAt ? new Date(settings.updatedAt).toISOString() : null,
  };
};

const buildSupportPayload = (settings) => ({
  phone: settings?.support?.phone || process.env.SUPPORT_PHONE || process.env.ADMIN_PHONE || '',
  telegram: settings?.support?.telegram || process.env.SUPPORT_TELEGRAM || (process.env.TELEGRAM_BOT_USERNAME ? `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}` : ''),
  email: settings?.support?.email || process.env.SUPPORT_EMAIL || process.env.NOTIFY_EMAIL_FROM || process.env.SMTP_USER || '',
  workingHours: settings?.support?.workingHours || process.env.SUPPORT_WORKING_HOURS || 'Ежедневно 09:00–21:00',
  faq: settings?.support?.faq || [],
});

const buildCollections = async ({ settings, user, favoritesSet }) => {
  const collections = [];
  const activeCollections = Array.isArray(settings?.collections)
    ? [...settings.collections].filter((item) => item?.isActive !== false).sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    : [];

  for (const collection of activeCollections) {
    const limit = clamp(collection.limit || 8, 1, 12);
    const query = {};
    let sort = { createdAt: -1 };
    if (collection.source === 'featured') {
      query.isFeatured = true;
      sort = { updatedAt: -1 };
    } else if (collection.source === 'discounted') {
      query.discount = { $gt: 0 };
      sort = { discount: -1, updatedAt: -1 };
    } else if (collection.source === 'category' && collection.category) {
      query.category = String(collection.category).trim().toLowerCase();
      sort = { updatedAt: -1 };
    } else if (collection.source === 'favorites') {
      const ids = [...favoritesSet];
      if (!ids.length) continue;
      query._id = { $in: ids };
    }

    const items = await Product.find(query)
      .sort(sort)
      .limit(limit)
      .select('name price discount stock category images isFeatured updatedAt')
      .lean();

    const serializedItems = await Promise.all(items.map((item) => serializeTelegramProduct(item, normalizeTelegramRole(user?.role), '', { favorite: favoritesSet.has(String(item._id)) })));
    collections.push({
      id: collection.id,
      title: collection.title,
      items: serializedItems,
    });
  }

  return collections;
};

const parseSort = (sort) => {
  const raw = String(sort || '').trim().toLowerCase();
  if (raw === 'price_asc') return { price: 1, createdAt: -1 };
  if (raw === 'price_desc') return { price: -1, createdAt: -1 };
  if (raw === 'discount_desc') return { discount: -1, createdAt: -1 };
  if (raw === 'stock_desc') return { stock: -1, createdAt: -1 };
  return { isFeatured: -1, createdAt: -1 };
};

const serializeMany = async (items, serializer) => Promise.all(items.map(serializer));

const getEditableProfileFields = async () => {
  const settings = await getTelegramMiniSettings();
  return Array.isArray(settings?.editableProfileFields) && settings.editableProfileFields.length
    ? settings.editableProfileFields
    : ['name', 'phone'];
};

export const createTelegramMiniSession = async (req, res, next) => {
  try {
    const rawInitData = extractRawInitData(req);
    const validated = validateTelegramInitData(rawInitData, process.env.TELEGRAM_BOT_TOKEN);
    const telegramId = String(validated.user.id || '');

    const user = await User.findOne({ telegramChatId: telegramId }).select('+telegramChatId');
    if (!user) {
      await writeTelegramMiniAudit(req, {
        event: 'telegram_mini.session_denied',
        severity: 'warn',
        telegramId,
        meta: { reason: 'not_linked' },
      });
      return next(createError('Этот Telegram ещё не привязан к аккаунту на сайте', 403));
    }

    const settings = await getTelegramMiniSettings();
    const { session, refreshToken } = await createTelegramMiniSessionRecord({ req, user, validated });
    const role = normalizeTelegramRole(user.role);
    const tokens = issueSessionTokens({ user, session, telegramId, refreshToken });
    const sync = await getSyncSnapshot({ user, settings });

    await writeTelegramMiniAudit(req, {
      event: 'telegram_mini.session_created',
      user: user._id,
      telegramId,
      sessionId: session.sessionId,
      meta: { startParam: validated.startParam, chatType: validated.chatType, queryId: validated.queryId },
    });

    return res.json({
      status: 'success',
      data: {
        ...tokens,
        user: {
          profile: await serializeTelegramProfile(user, role),
          wallet: await serializeTelegramWallet(user, role),
        },
        config: {
          settings: await serializeTelegramSettings(settings, role),
          sync,
          permissions: {
            role,
            canManageMiniApp: ['admin', 'manager'].includes(role),
            readOnlyMiniAppAdmin: role === 'observer',
          },
        },
      },
    });
  } catch (error) {
    await writeTelegramMiniAudit(req, {
      event: 'telegram_mini.session_failed',
      severity: 'warn',
      meta: { reason: error?.message || 'unknown' },
    });
    next(error);
  }
};

export const refreshTelegramMiniSession = async (req, res, next) => {
  try {
    const session = await verifyRefreshToken(req.body?.refreshToken);
    const user = await User.findById(session.user).select('+telegramChatId');
    if (!user) return next(createError('Пользователь Telegram Mini App не найден', 401));
    if (!user.telegramChatId || String(user.telegramChatId) !== String(session.telegramId || '')) {
      return next(createError('Telegram больше не привязан к этому аккаунту', 401));
    }

    const refreshToken = await rotateTelegramMiniRefreshToken(session);
    const accessToken = issueTelegramMiniAccessToken({ user, telegramId: session.telegramId, sessionId: session.sessionId });
    await writeTelegramMiniAudit(req, {
      event: 'telegram_mini.session_refreshed',
      user: user._id,
      telegramId: session.telegramId,
      sessionId: session.sessionId,
    });

    return res.json({
      status: 'success',
      data: {
        accessToken,
        refreshToken,
        expiresIn: Number(process.env.TELEGRAM_MINI_ACCESS_TTL_SECONDS || 20 * 60),
        refreshExpiresIn: Number(process.env.TELEGRAM_MINI_REFRESH_TTL_SECONDS || 14 * 24 * 60 * 60),
        sessionId: session.sessionId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniConfig = async (req, res, next) => {
  try {
    const settings = await getTelegramMiniSettings();
    const role = normalizeTelegramRole(req.user?.role);
    const sync = await getSyncSnapshot({ user: req.user, settings });
    return res.json({
      status: 'success',
      data: {
        settings: await serializeTelegramSettings(settings, role, req.query?.fields),
        sync,
        permissions: {
          role,
          canManageMiniApp: ['admin', 'manager'].includes(role),
          readOnlyMiniAppAdmin: role === 'observer',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniBootstrap = async (req, res, next) => {
  try {
    const settings = await getTelegramMiniSettings();
    const role = normalizeTelegramRole(req.user?.role);
    const favoriteIds = getFavoriteIds(req.user);
    const recentIds = getRecentIds(req.user);

    const [recentOrders, notifications, promoCodes, favoriteProducts, recentlyViewedProducts, collections, sync] = await Promise.all([
      Order.find(role === 'admin' || role === 'manager' || role === 'observer' ? {} : { user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name')
        .lean(),
      getNotificationsForUser(req.user),
      listAvailablePromoCodes({ userId: req.user._id, subtotal: 0 }),
      favoriteIds.size ? Product.find({ _id: { $in: [...favoriteIds] } }).limit(8).select('name price discount stock category images').lean() : [],
      recentIds.length ? Product.find({ _id: { $in: recentIds.slice(0, 8) } }).select('name price discount stock category images').lean() : [],
      buildCollections({ settings, user: req.user, favoritesSet: favoriteIds }),
      getSyncSnapshot({ user: req.user, settings }),
    ]);

    const serializedOrders = await serializeMany(recentOrders, (order) => serializeTelegramOrder(order, role, req.query?.orderFields));
    const serializedNotifications = await serializeMany(notifications.slice(0, 8), (item) => serializeTelegramNotification(item, role, req.query?.notificationFields));
    const serializedPromos = await serializeMany(promoCodes.slice(0, 6), (item) => serializeTelegramPromo(item, role, req.query?.promoFields));
    const serializedFavorites = await serializeMany(favoriteProducts, (product) => serializeTelegramProduct(product, role, req.query?.productFields, { favorite: true }));
    const recentSet = new Set(recentIds);
    const serializedRecent = await serializeMany(recentlyViewedProducts, (product) => serializeTelegramProduct(product, role, req.query?.productFields, { favorite: favoriteIds.has(String(product._id)), recent: recentSet.has(String(product._id)) }));
    const dashboard = await serializeDashboardPayload({
      summary: buildSummary({ user: req.user, notificationsCount: notifications.length, orders: recentOrders, promoCodes, favoritesCount: favoriteIds.size }),
      banners: Array.isArray(settings?.banners) ? settings.banners.filter((item) => item?.isActive !== false).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)) : [],
      collections,
      sync,
      permissions: {
        role,
        canManageMiniApp: ['admin', 'manager'].includes(role),
        readOnlyMiniAppAdmin: role === 'observer',
      },
    }, role, req.query?.dashboardFields);

    return res.json({
      status: 'success',
      data: {
        profile: await serializeTelegramProfile(req.user, role, req.query?.profileFields),
        wallet: await serializeTelegramWallet(req.user, role, req.query?.walletFields),
        dashboard,
        favorites: serializedFavorites,
        recentlyViewed: serializedRecent,
        recentOrders: serializedOrders,
        notifications: serializedNotifications,
        promoCodes: serializedPromos,
        support: await serializeTelegramSupport(buildSupportPayload(settings), role, req.query?.supportFields),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniSync = async (req, res, next) => {
  try {
    const settings = await getTelegramMiniSettings();
    const sync = await getSyncSnapshot({ user: req.user, settings });
    return res.json({ status: 'success', data: sync });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniProducts = async (req, res, next) => {
  try {
    const role = normalizeTelegramRole(req.user?.role);
    const favoriteIds = getFavoriteIds(req.user);
    const page = clamp(req.query?.page || 1, 1, 1000);
    const limit = clamp(req.query?.limit || 20, 1, 50);
    const search = safe(req.query?.search).trim();
    const category = safe(req.query?.category).trim().toLowerCase();
    const availability = safe(req.query?.availability).trim().toLowerCase();
    const sort = parseSort(req.query?.sort);
    const favoritesOnly = String(req.query?.favoritesOnly || '').trim() === 'true';

    const query = {};
    if (favoritesOnly) {
      query._id = { $in: [...favoriteIds] };
    }
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }
    if (availability === 'in-stock') query.stock = { $gt: 0 };
    if (availability === 'low-stock') query.stock = { $gt: 0, $lte: 5 };
    if (availability === 'out-of-stock') query.stock = { $lte: 0 };

    const [products, total, categories] = await Promise.all([
      Product.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .select('name price discount stock category images brand description')
        .lean(),
      Product.countDocuments(query),
      Product.distinct('category', {}),
    ]);

    return res.json({
      status: 'success',
      data: {
        products: await serializeMany(products, (product) => serializeTelegramProduct(product, role, req.query?.fields, { favorite: favoriteIds.has(String(product._id)) })),
        filters: {
          categories: categories.filter(Boolean).sort(),
        },
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniProductDetails = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return next(createError('Товар не найден', 404));
    const role = normalizeTelegramRole(req.user?.role);
    const favoriteIds = getFavoriteIds(req.user);
    const product = await Product.findById(req.params.id).lean();
    if (!product) return next(createError('Товар не найден', 404));

    const recommendations = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
    })
      .sort({ isFeatured: -1, discount: -1, createdAt: -1 })
      .limit(6)
      .select('name price discount stock category images')
      .lean();

    return res.json({
      status: 'success',
      data: {
        product: await serializeTelegramProduct(product, role, req.query?.fields, { favorite: favoriteIds.has(String(product._id)) }),
        description: safe(product.description),
        brand: safe(product.brand),
        tags: Array.isArray(product.tags) ? product.tags : [],
        recommendations: await serializeMany(recommendations, (item) => serializeTelegramProduct(item, role, '', { favorite: favoriteIds.has(String(item._id)) })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markTelegramMiniProductViewed = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return next(createError('Товар не найден', 404));
    const product = await Product.findById(req.params.id).select('_id');
    if (!product) return next(createError('Товар не найден', 404));

    const existing = getRecentIds(req.user).filter((item) => String(item) !== String(product._id));
    req.user.telegramMiniRecentProductIds = [product._id, ...existing].slice(0, 20);
    await req.user.save({ validateBeforeSave: false });

    await writeTelegramMiniAudit(req, {
      event: 'telegram_mini.product_view',
      user: req.user._id,
      telegramId: req.telegramMini?.telegramId,
      sessionId: req.telegramMini?.sessionId,
      meta: { productId: String(product._id) },
    });

    return res.json({ status: 'success', data: { ok: true } });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniFavorites = async (req, res, next) => {
  try {
    const role = normalizeTelegramRole(req.user?.role);
    const ids = [...getFavoriteIds(req.user)];
    const products = ids.length ? await Product.find({ _id: { $in: ids } }).select('name price discount stock category images').lean() : [];
    return res.json({
      status: 'success',
      data: {
        products: await serializeMany(products, (product) => serializeTelegramProduct(product, role, req.query?.fields, { favorite: true })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addTelegramMiniFavorite = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.productId)) return next(createError('Товар не найден', 404));
    const product = await Product.findById(req.params.productId).select('_id');
    if (!product) return next(createError('Товар не найден', 404));
    const ids = [...getFavoriteIds(req.user).values()].filter((item) => String(item) !== String(product._id));
    req.user.telegramMiniFavoriteProductIds = [product._id, ...ids].slice(0, 50);
    await req.user.save({ validateBeforeSave: false });
    return res.json({ status: 'success', data: { favoriteProductIds: req.user.telegramMiniFavoriteProductIds.map((item) => String(item)) } });
  } catch (error) {
    next(error);
  }
};

export const removeTelegramMiniFavorite = async (req, res, next) => {
  try {
    const ids = (Array.isArray(req.user.telegramMiniFavoriteProductIds) ? req.user.telegramMiniFavoriteProductIds : []).filter((item) => String(item) !== String(req.params.productId));
    req.user.telegramMiniFavoriteProductIds = ids;
    await req.user.save({ validateBeforeSave: false });
    return res.json({ status: 'success', data: { favoriteProductIds: ids.map((item) => String(item)) } });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniOrders = async (req, res, next) => {
  try {
    const role = normalizeTelegramRole(req.user?.role);
    const page = clamp(req.query?.page || 1, 1, 1000);
    const limit = clamp(req.query?.limit || 20, 1, 50);
    const status = safe(req.query?.status).trim().toLowerCase();
    const query = ['admin', 'manager', 'observer'].includes(role) ? {} : { user: req.user._id };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', 'name')
        .select('user totalPrice status createdAt paymentMethod shippingAddress isPaid statusHistory promo promoDiscount orderItems deliveryWindow')
        .lean(),
      Order.countDocuments(query),
    ]);

    return res.json({
      status: 'success',
      data: {
        orders: await serializeMany(orders, (order) => serializeTelegramOrder(order, role, req.query?.fields)),
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniOrderDetails = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return next(createError('Заказ не найден', 404));
    const role = normalizeTelegramRole(req.user?.role);
    const query = ['admin', 'manager', 'observer'].includes(role)
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user._id };
    const order = await Order.findOne(query).populate('user', 'name').lean();
    if (!order) return next(createError('Заказ не найден', 404));

    return res.json({
      status: 'success',
      data: {
        order: await serializeTelegramOrder(order, role, req.query?.fields),
        shippingAddress: order.shippingAddress || {},
        customerNote: safe(order.customerNote),
        adminNote: ['admin', 'manager', 'observer'].includes(role) ? safe(order.adminNote) : '',
        items: (Array.isArray(order.orderItems) ? order.orderItems : []).map((item) => ({
          id: safe(item.product),
          name: safe(item.name),
          quantity: Number(item.quantity || 0),
          price: Number(item.price || 0),
          image: safe(item.image),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const repeatTelegramMiniOrder = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return next(createError('Заказ не найден', 404));
    const query = ['admin', 'manager', 'observer'].includes(normalizeTelegramRole(req.user?.role))
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user._id };
    const order = await Order.findOne(query).lean();
    if (!order) return next(createError('Заказ не найден', 404));

    return res.json({
      status: 'success',
      data: {
        draft: {
          sourceOrderId: String(order._id),
          items: (Array.isArray(order.orderItems) ? order.orderItems : []).map((item) => ({
            productId: String(item.product),
            name: safe(item.name),
            quantity: Number(item.quantity || 0),
            price: Number(item.price || 0),
            image: safe(item.image),
          })),
          shippingAddress: order.shippingAddress || req.user.telegramMiniLastAddress || {},
          promoCode: safe(order?.promo?.code),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniNotifications = async (req, res, next) => {
  try {
    const role = normalizeTelegramRole(req.user?.role);
    const notifications = await getNotificationsForUser(req.user);
    return res.json({
      status: 'success',
      data: {
        notifications: await serializeMany(notifications, (item) => serializeTelegramNotification(item, role, req.query?.fields)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniSupport = async (req, res, next) => {
  try {
    const settings = await getTelegramMiniSettings();
    return res.json({
      status: 'success',
      data: {
        support: await serializeTelegramSupport(buildSupportPayload(settings), normalizeTelegramRole(req.user?.role), req.query?.fields),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniPromoCodes = async (req, res, next) => {
  try {
    const subtotal = Number(req.query?.subtotal || 0);
    const role = normalizeTelegramRole(req.user?.role);
    const promoCodes = await listAvailablePromoCodes({ userId: req.user._id, subtotal });
    return res.json({
      status: 'success',
      data: {
        promoCodes: await serializeMany(promoCodes, (item) => serializeTelegramPromo(item, role, req.query?.fields)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const previewTelegramMiniPromoCode = async (req, res, next) => {
  try {
    const code = normalizePromoCode(req.body?.code);
    const subtotal = Number(req.body?.subtotal || 0);
    if (!code) return next(createError('Укажите промокод', 400));
    const result = await evaluatePromoCode({ code, userId: req.user._id, subtotal });
    return res.json({
      status: 'success',
      data: {
        promoCode: await serializeTelegramPromo(result.promo, normalizeTelegramRole(req.user?.role)),
        discount: Number(result.discount || 0),
        finalAmount: Math.max(0, subtotal - Number(result.discount || 0)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniProfile = async (req, res, next) => {
  try {
    return res.json({
      status: 'success',
      data: {
        profile: await serializeTelegramProfile(req.user, normalizeTelegramRole(req.user?.role), req.query?.profileFields),
        wallet: await serializeTelegramWallet(req.user, normalizeTelegramRole(req.user?.role), req.query?.walletFields),
        address: req.user.telegramMiniLastAddress || {},
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTelegramMiniProfile = async (req, res, next) => {
  try {
    const editableFields = await getEditableProfileFields();
    const payload = req.body || {};
    if (editableFields.includes('name') && typeof payload.name === 'string') req.user.name = payload.name.trim().slice(0, 50);
    if (editableFields.includes('phone') && typeof payload.phone === 'string') req.user.phone = payload.phone.trim().slice(0, 30);
    if (editableFields.includes('address') && payload.address && typeof payload.address === 'object') {
      req.user.telegramMiniLastAddress = {
        street: safe(payload.address.street).slice(0, 120),
        city: safe(payload.address.city).slice(0, 120),
        zipCode: safe(payload.address.zipCode).slice(0, 40),
        country: safe(payload.address.country).slice(0, 120),
      };
    }
    await req.user.save();

    await writeTelegramMiniAudit(req, {
      event: 'telegram_mini.profile_updated',
      user: req.user._id,
      telegramId: req.telegramMini?.telegramId,
      sessionId: req.telegramMini?.sessionId,
      meta: { fields: editableFields },
    });

    return res.json({
      status: 'success',
      data: {
        profile: await serializeTelegramProfile(req.user, normalizeTelegramRole(req.user?.role)),
        wallet: await serializeTelegramWallet(req.user, normalizeTelegramRole(req.user?.role)),
        address: req.user.telegramMiniLastAddress || {},
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniAdminSettings = async (req, res, next) => {
  try {
    const settings = await getTelegramMiniSettings();
    return res.json({
      status: 'success',
      data: {
        settings: await serializeTelegramSettings(settings, normalizeTelegramRole(req.user?.role)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTelegramMiniAdminSettings = async (req, res, next) => {
  try {
    const role = normalizeTelegramRole(req.user?.role);
    const settings = await getTelegramMiniSettings();
    if (role === 'observer') return next(createError('Наблюдатель не может изменять настройки', 403));

    const patch = req.body || {};
    if (patch.blocks && typeof patch.blocks === 'object') settings.blocks = { ...settings.blocks, ...patch.blocks };
    if (patch.featureFlags && typeof patch.featureFlags === 'object') settings.featureFlags = { ...settings.featureFlags, ...patch.featureFlags };
    if (patch.theme && typeof patch.theme === 'object') settings.theme = { ...settings.theme, ...patch.theme };
    if (Array.isArray(patch.editableProfileFields)) settings.editableProfileFields = patch.editableProfileFields.map((item) => safe(item).trim()).filter(Boolean).slice(0, 10);
    if (patch.support && typeof patch.support === 'object') settings.support = { ...settings.support, ...patch.support };
    if (Array.isArray(patch.banners)) settings.banners = patch.banners.slice(0, 20);
    if (Array.isArray(patch.collections)) settings.collections = patch.collections.slice(0, 20);
    if (patch.allowedFieldsByRole && typeof patch.allowedFieldsByRole === 'object') settings.allowedFieldsByRole = patch.allowedFieldsByRole;
    settings.updatedBy = req.user._id;
    settings.version = Number(settings.version || 1) + 1;
    await settings.save();

    await writeTelegramMiniAudit(req, {
      event: 'telegram_mini.settings_updated',
      user: req.user._id,
      telegramId: req.telegramMini?.telegramId,
      sessionId: req.telegramMini?.sessionId,
      meta: { version: settings.version },
    });

    return res.json({
      status: 'success',
      data: {
        settings: await serializeTelegramSettings(settings, role),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const trackTelegramMiniAnalytics = async (req, res, next) => {
  try {
    const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, 50) : [];
    await Promise.all(events.map((item) => writeTelegramMiniAudit(req, {
      event: `analytics.${safe(item?.event || 'unknown').slice(0, 80)}`,
      user: req.user._id,
      telegramId: req.telegramMini?.telegramId,
      sessionId: req.telegramMini?.sessionId,
      meta: {
        screen: safe(item?.screen).slice(0, 80),
        payload: item?.payload || {},
        at: item?.at || new Date().toISOString(),
      },
    })));
    return res.json({ status: 'success', data: { accepted: events.length } });
  } catch (error) {
    next(error);
  }
};


export const previewTelegramMiniCheckout = async (req, res, next) => {
  try {
    const preview = await buildTelegramMiniCheckoutDraft({ user: req.user, payload: req.body || {} });
    return res.json({ status: 'success', data: preview });
  } catch (error) {
    next(error);
  }
};

export const commitTelegramMiniCheckoutController = async (req, res, next) => {
  try {
    const data = await commitTelegramMiniCheckout({ req, user: req.user, payload: req.body || {} });
    await writeTelegramMiniAudit(req, {
      event: 'telegram_mini.checkout_committed',
      user: req.user._id,
      telegramId: req.telegramMini?.telegramId,
      sessionId: req.telegramMini?.sessionId,
      meta: {
        orderId: String(data?.order?._id || ''),
        paymentMethod: safe(data?.order?.paymentMethod),
        totalPrice: Number(data?.order?.totalPrice || 0),
      },
    });

    return res.status(201).json({
      status: 'success',
      data: {
        order: await serializeTelegramOrder(data.order, normalizeTelegramRole(req.user?.role)),
        orderId: String(data.order._id),
        paymentSession: data.paymentSession,
        checkout: data.checkout,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createTelegramMiniCheckoutPaymentSessionController = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) return next(createError('Заказ не найден', 404));
    const role = normalizeTelegramRole(req.user?.role);
    const query = ['admin', 'manager', 'observer'].includes(role)
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user._id };
    const order = await Order.findOne(query);
    if (!order) return next(createError('Заказ не найден', 404));
    const paymentSession = await createTelegramMiniPaymentSession({ req, order });

    await writeTelegramMiniAudit(req, {
      event: 'telegram_mini.payment_session_created',
      user: req.user._id,
      telegramId: req.telegramMini?.telegramId,
      sessionId: req.telegramMini?.sessionId,
      meta: { orderId: String(order._id), provider: safe(paymentSession?.provider) },
    });

    return res.json({ status: 'success', data: { paymentSession } });
  } catch (error) {
    next(error);
  }
};

export const streamTelegramMiniEvents = async (req, res, next) => {
  try {
    const settings = await getTelegramMiniSettings();
    let lastSnapshot = await getSyncSnapshot({ user: req.user, settings });

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (event, payload) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    send('ready', { ok: true, sync: lastSnapshot });
    const heartbeat = setInterval(() => send('ping', { ts: new Date().toISOString() }), 20000);
    const watcher = setInterval(async () => {
      try {
        const freshSettings = await getTelegramMiniSettings();
        const nextSnapshot = await getSyncSnapshot({ user: req.user, settings: freshSettings });
        const changed = ['ordersRevision', 'productsRevision', 'promosRevision', 'profileRevision', 'settingsRevision']
          .some((key) => String(nextSnapshot?.[key] || '') !== String(lastSnapshot?.[key] || ''));
        if (changed) {
          lastSnapshot = nextSnapshot;
          send('sync', nextSnapshot);
        }
      } catch {
        send('warn', { message: 'sync_failed' });
      }
    }, 10000);

    req.on('close', async () => {
      clearInterval(heartbeat);
      clearInterval(watcher);
      try {
        await writeTelegramMiniAudit(req, {
          event: 'telegram_mini.stream_closed',
          user: req.user._id,
          telegramId: req.telegramMini?.telegramId,
          sessionId: req.telegramMini?.sessionId,
        });
      } catch {}
    });

    await writeTelegramMiniAudit(req, {
      event: 'telegram_mini.stream_opened',
      user: req.user._id,
      telegramId: req.telegramMini?.telegramId,
      sessionId: req.telegramMini?.sessionId,
    });
  } catch (error) {
    next(error);
  }
};

export const getTelegramMiniAdminOverview = async (req, res, next) => {
  try {
    const role = normalizeTelegramRole(req.user?.role);
    if (!['admin', 'manager', 'observer'].includes(role)) return next(createError('Недостаточно прав для обзора Mini App', 403));

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [
      totalProducts,
      lowStockProducts,
      totalPromoCodes,
      openOrders,
      orders24h,
      delivered24h,
      activeSessions,
      auditSummary,
      recentEvents,
    ] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ stock: { $gt: 0, $lte: 5 } }),
      PromoCode.countDocuments({ isActive: true }),
      Order.countDocuments({ status: { $in: ['pending', 'confirmed', 'processing', 'shipped'] } }),
      Order.countDocuments({ createdAt: { $gte: since } }),
      Order.countDocuments({ status: 'delivered', updatedAt: { $gte: since } }),
      TelegramMiniSession.countDocuments({ revokedAt: null, refreshExpiresAt: { $gt: new Date() } }),
      TelegramMiniAudit.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      TelegramMiniAudit.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(8).lean(),
    ]);

    const severity = auditSummary.reduce((acc, item) => ({ ...acc, [item._id || 'info']: Number(item.count || 0) }), {});
    const checkoutStarted = await TelegramMiniAudit.countDocuments({ event: 'analytics.checkout_started', createdAt: { $gte: since } });
    const checkoutCompleted = await TelegramMiniAudit.countDocuments({ event: 'telegram_mini.checkout_committed', createdAt: { $gte: since } });

    return res.json({
      status: 'success',
      data: {
        overview: {
          activeSessions,
          orders24h,
          delivered24h,
          openOrders,
          totalProducts,
          lowStockProducts,
          totalPromoCodes,
          conversion24h: checkoutStarted > 0 ? Number(((checkoutCompleted / checkoutStarted) * 100).toFixed(1)) : 0,
          warnings24h: Number(severity.warn || 0),
          errors24h: Number(severity.danger || 0),
        },
        recentEvents: recentEvents.map((item) => ({
          id: String(item._id),
          event: safe(item.event),
          severity: safe(item.severity),
          route: safe(item.route),
          createdAt: item.createdAt,
          meta: item.meta || {},
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const requireTelegramMiniManager = requireTelegramMiniRoles('manager', 'admin', 'observer');
export const requireTelegramMiniEditor = requireTelegramMiniRoles('manager', 'admin');
