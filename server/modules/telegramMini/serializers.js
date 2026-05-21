import { normalizeTelegramRole, pickAllowedFields } from './fieldPolicy.js';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const safe = (v) => (v == null ? '' : String(v));
const buildDisplayId = (prefix, value) => `${prefix}-${String(value || '').slice(-6).toUpperCase()}`;

const roleLabelMap = {
  client: 'клиент',
  manager: 'менеджер',
  admin: 'администратор',
  observer: 'наблюдатель',
};

const mapTimelineLabel = (status) => {
  const labels = {
    pending: 'создан',
    confirmed: 'подтверждён',
    processing: 'собирается',
    shipped: 'передан в доставку',
    delivered: 'доставлен',
    cancelled: 'отменён',
  };
  return labels[String(status || '').trim().toLowerCase()] || safe(status);
};

export const serializeTelegramProfile = async (user, role = 'client', requested) => pickAllowedFields('profile', role, {
  id: safe(user?._id),
  name: safe(user?.name),
  phone: safe(user?.phone),
  role: roleLabelMap[normalizeTelegramRole(user?.role)] || 'клиент',
  registeredAt: user?.createdAt || null,
  telegramUsername: safe(user?.telegramUsername),
}, requested);

export const serializeTelegramWallet = async (user, role = 'client', requested) => pickAllowedFields('wallet', role, {
  balance: Number(user?.walletBalance || 0),
  bonuses: Number(user?.bonusBalance || 0),
  discount: Number(user?.personalDiscount || 0),
  loyaltyLevel: Number(user?.personalDiscount || 0) >= 10 ? 'gold' : Number(user?.personalDiscount || 0) >= 5 ? 'silver' : 'base',
}, requested);

export const serializeTelegramProduct = async (product, role = 'client', requested, options = {}) => {
  const price = round2(Number(product?.discountedPrice ?? product?.price ?? 0));
  const oldPrice = Number(product?.discount || 0) > 0 ? round2(Number(product?.price || 0)) : null;
  const stock = Math.max(0, Number(product?.stock || 0));
  const availability = stock <= 0 ? 'нет в наличии' : stock <= 5 ? 'мало на складе' : 'в наличии';
  const gallery = Array.isArray(product?.images) && product.images.length ? product.images : ['/placeholder-product.svg'];
  return pickAllowedFields('product', role, {
    id: safe(product?._id),
    name: safe(product?.name),
    price,
    oldPrice,
    stock,
    category: safe(product?.category),
    availability,
    photo: gallery[0],
    gallery,
    discountPercent: Number(product?.discount || 0),
    isFavorite: Boolean(options?.favorite),
  }, requested);
};

export const serializeTelegramOrder = async (order, role = 'client', requested) => pickAllowedFields('order', role, {
  id: safe(order?._id),
  number: buildDisplayId('ORD', order?._id),
  user: safe(order?.user?.name || order?.userName || ''),
  amount: round2(Number(order?.totalPrice || 0)),
  status: mapTimelineLabel(order?.status),
  date: order?.createdAt || null,
  paymentMethod: safe(order?.paymentMethod || ''),
  deliveryMethod: order?.shippingAddress?.street ? 'курьер' : 'самовывоз',
  isPaid: Boolean(order?.isPaid),
  timeline: (Array.isArray(order?.statusHistory) ? order.statusHistory : []).map((item) => ({
    status: mapTimelineLabel(item?.status),
    rawStatus: safe(item?.status),
    at: item?.at || null,
    note: safe(item?.note),
    source: safe(item?.source),
  })),
  itemsPreview: (Array.isArray(order?.orderItems) ? order.orderItems : []).slice(0, 3).map((item) => ({
    name: safe(item?.name),
    quantity: Number(item?.quantity || 0),
    price: round2(Number(item?.price || 0)),
    image: safe(item?.image),
  })),
  promo: order?.promo?.code ? {
    code: safe(order?.promo?.code),
    title: safe(order?.promo?.title),
    discount: round2(Number(order?.promoDiscount || 0)),
  } : null,
  deliveryWindow: safe(order?.deliveryWindow),
}, requested);

export const serializeTelegramNotification = async (notification, role = 'client', requested) => pickAllowedFields('notification', role, {
  id: safe(notification?.id),
  type: safe(notification?.type),
  title: safe(notification?.title),
  body: safe(notification?.body),
  createdAt: notification?.createdAt || null,
  severity: safe(notification?.severity || 'info'),
  entityType: safe(notification?.entityType),
  entityId: safe(notification?.entityId),
  group: safe(notification?.group || notification?.type || 'general'),
}, requested);

export const serializeTelegramPromo = async (promo, role = 'client', requested) => pickAllowedFields('promo', role, {
  id: safe(promo?._id),
  code: safe(promo?.code),
  title: safe(promo?.title),
  description: safe(promo?.description),
  type: safe(promo?.type),
  value: Number(promo?.value || 0),
  minOrderAmount: Number(promo?.minOrderAmount || 0),
  expiresAt: promo?.expiresAt || null,
  previewDiscount: Number(promo?.previewDiscount || 0),
  validNow: Boolean(promo?.validNow),
  scope: 'telegram-mini',
}, requested);

export const serializeTelegramSupport = async (support, role = 'client', requested) => pickAllowedFields('support', role, {
  phone: safe(support?.phone),
  telegram: safe(support?.telegram),
  email: safe(support?.email),
  workingHours: safe(support?.workingHours),
  faq: Array.isArray(support?.faq)
    ? support.faq
        .filter((item) => item?.isActive !== false)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
        .map((item) => ({
          id: safe(item?.id),
          question: safe(item?.question),
          answer: safe(item?.answer),
          category: safe(item?.category || 'general'),
        }))
    : [],
}, requested);

export const serializeTelegramSettings = async (settings, role = 'client', requested) => pickAllowedFields('settings', role, {
  blocks: settings?.blocks || {},
  featureFlags: settings?.featureFlags || {},
  theme: settings?.theme || {},
  editableProfileFields: Array.isArray(settings?.editableProfileFields) ? settings.editableProfileFields : ['name', 'phone'],
  banners: Array.isArray(settings?.banners) ? settings.banners.filter((item) => item?.isActive !== false) : [],
  collections: Array.isArray(settings?.collections) ? settings.collections.filter((item) => item?.isActive !== false) : [],
  support: settings?.support || {},
}, requested);

export const serializeDashboardPayload = async (payload, role = 'client', requested) => pickAllowedFields('dashboard', role, {
  summary: payload?.summary || {},
  banners: payload?.banners || [],
  collections: payload?.collections || [],
  sync: payload?.sync || {},
  permissions: payload?.permissions || {},
}, requested);
