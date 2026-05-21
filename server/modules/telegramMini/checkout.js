import Stripe from 'stripe';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import { createError } from '../../middleware/errorHandler.js';
import { APP_CURRENCY, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, TAX_RATE } from '../../config/appConfig.js';
import { evaluatePromoCode, normalizePromoCode } from '../../utils/promocodes.js';
import { notifyNewOrder } from '../../utils/notifications.js';
import { applyInventoryForOrder } from '../../utils/orderLifecycle.js';
import { resolveClientBaseUrl } from '../../utils/originSecurity.js';

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const safe = (v) => (v == null ? '' : String(v));

let stripeClient = null;
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
};

const PAYMENT_PROVIDER_CONFIG = {
  paypal: { envKey: 'PAYPAL_CHECKOUT_URL', provider: 'paypal' },
  freedom_pay: { envKey: 'FREEDOMPAY_CHECKOUT_URL', provider: 'freedom_pay' },
  kaspi: { envKey: 'KASPI_CHECKOUT_URL', provider: 'kaspi' },
};

const normalizeItems = (items = []) => (Array.isArray(items) ? items : [])
  .map((item) => ({
    productId: safe(item?.productId || item?.product || item?.id).trim(),
    quantity: Math.max(1, Number(item?.quantity || 1)),
  }))
  .filter((item) => item.productId);

const getEffectiveUnitPrice = (productDoc) => {
  const price = Number(productDoc?.price || 0);
  const discount = Number(productDoc?.discount || 0);
  if (discount > 0) return round2(price * (1 - discount / 100));
  return round2(price);
};

const computeExpectedDeliveryDate = ({ deliveryDays, deliveryWindow }) => {
  const now = new Date();
  if (Number.isFinite(deliveryDays) && deliveryDays >= 0) {
    const d = new Date(now);
    d.setDate(d.getDate() + Number(deliveryDays));
    return d;
  }
  const w = String(deliveryWindow || '').toLowerCase();
  const d = new Date(now);
  d.setDate(d.getDate() + (w.includes('сегодня') ? 0 : 2));
  return d;
};

const sanitizeAddress = (address = {}) => ({
  street: safe(address.street).trim().slice(0, 120),
  city: safe(address.city).trim().slice(0, 120),
  zipCode: safe(address.zipCode).trim().slice(0, 40),
  country: safe(address.country).trim().slice(0, 120),
});

const ensureAddress = (address) => {
  const clean = sanitizeAddress(address);
  if (!clean.street || !clean.city || !clean.zipCode || !clean.country) {
    throw createError('Заполните адрес доставки полностью', 400);
  }
  return clean;
};

const normalizePaymentMethod = (value) => {
  const raw = safe(value).trim().toLowerCase();
  if (!raw) return 'stripe_card';
  if (raw === 'card') return 'stripe_card';
  const allowed = new Set(['stripe_card', 'cash', 'paypal', 'freedom_pay', 'kaspi']);
  if (!allowed.has(raw)) throw createError('Неподдерживаемый способ оплаты', 400);
  return raw;
};

const loadCheckoutItems = async (draftItems) => {
  const ids = [...new Set(draftItems.map((item) => item.productId))];
  if (!ids.length) throw createError('Корзина пуста', 400);

  const products = await Product.find({ _id: { $in: ids } })
    .select('name price discount stock category images isFeatured')
    .lean();
  const productMap = new Map(products.map((item) => [String(item._id), item]));
  const missing = ids.filter((id) => !productMap.has(id));
  if (missing.length) throw createError('Некоторые товары не найдены или были удалены', 400);

  return draftItems.map((item) => {
    const product = productMap.get(item.productId);
    const unitPrice = getEffectiveUnitPrice(product);
    const stock = Number(product?.stock || 0);
    if (item.quantity > stock) {
      throw createError(`Недостаточно товара на складе: ${safe(product?.name)} (доступно ${stock})`, 400);
    }
    return {
      product: product._id,
      productId: String(product._id),
      name: safe(product.name),
      price: unitPrice,
      oldPrice: Number(product?.discount || 0) > 0 ? round2(Number(product.price || 0)) : null,
      quantity: item.quantity,
      stock,
      image: Array.isArray(product.images) && product.images[0] ? product.images[0] : '/placeholder-product.svg',
      category: safe(product.category),
      discountPercent: Number(product?.discount || 0),
    };
  });
};

const buildExternalPaymentSession = ({ paymentMethod, order, user, clientBaseUrl }) => {
  const cfg = PAYMENT_PROVIDER_CONFIG[paymentMethod];
  if (!cfg) return null;

  const base = String(process.env[cfg.envKey] || '').trim();
  if (!base) {
    return {
      provider: cfg.provider,
      mode: 'manual',
      message: `Настрой ${cfg.envKey} в .env, чтобы включить оплату через ${cfg.provider}`,
    };
  }

  try {
    const url = new URL(base);
    url.searchParams.set('orderId', String(order._id));
    url.searchParams.set('amount', String(round2(order.totalPrice)));
    url.searchParams.set('currency', APP_CURRENCY);
    url.searchParams.set('customerEmail', safe(user?.email));
    if (clientBaseUrl) {
      url.searchParams.set('successUrl', `${clientBaseUrl}/telegram/?view=orders&order=${order._id}&paid=1`);
      url.searchParams.set('cancelUrl', `${clientBaseUrl}/telegram/?view=orders&order=${order._id}&cancelled=1`);
    }
    return { provider: cfg.provider, mode: 'redirect', url: url.toString() };
  } catch {
    return {
      provider: cfg.provider,
      mode: 'manual',
      message: `Некорректный URL провайдера для ${cfg.provider}`,
    };
  }
};

export const buildTelegramMiniCheckoutDraft = async ({ user, payload = {} }) => {
  const draftItems = normalizeItems(payload.items || payload.orderItems || []);
  const items = await loadCheckoutItems(draftItems);
  const address = sanitizeAddress(payload.address || user?.telegramMiniLastAddress || user?.address || {});
  const paymentMethod = normalizePaymentMethod(payload.paymentMethod || 'stripe_card');
  const deliveryWindow = safe(payload.deliveryWindow || '1–2 дня').trim() || '1–2 дня';
  const deliveryDays = Number.isFinite(Number(payload.deliveryDays)) ? Number(payload.deliveryDays) : 2;
  const customerNote = safe(payload.customerNote).trim().slice(0, 500);

  const itemsPrice = round2(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const promoResult = normalizePromoCode(payload.promoCode)
    ? await evaluatePromoCode({ code: payload.promoCode, userId: user._id, subtotal: itemsPrice })
    : null;
  const promoDiscount = round2(promoResult?.discount || 0);
  const discountedItemsPrice = round2(Math.max(0, itemsPrice - promoDiscount));
  const shippingPrice = round2(discountedItemsPrice > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE);
  const taxPrice = round2(discountedItemsPrice * TAX_RATE);
  const totalPrice = round2(discountedItemsPrice + shippingPrice + taxPrice);

  return {
    items,
    address,
    paymentMethod,
    deliveryWindow,
    deliveryDays,
    customerNote,
    promo: promoResult ? {
      code: promoResult.promo.code,
      title: promoResult.promo.title,
      description: promoResult.promo.description,
      type: promoResult.promo.type,
      value: Number(promoResult.promo.value || 0),
      discount: promoDiscount,
    } : null,
    totals: {
      itemsPrice,
      promoDiscount,
      shippingPrice,
      taxPrice,
      totalPrice,
    },
    wallet: {
      balance: Number(user?.walletBalance || 0),
      bonuses: Number(user?.bonusBalance || 0),
      discount: Number(user?.personalDiscount || 0),
    },
    paymentOptions: [
      { key: 'stripe_card', label: 'Карта', enabled: true },
      { key: 'cash', label: 'Наличные', enabled: true },
      { key: 'kaspi', label: 'Kaspi', enabled: true },
      { key: 'paypal', label: 'PayPal', enabled: Boolean(process.env.PAYPAL_CHECKOUT_URL) },
      { key: 'freedom_pay', label: 'Freedom Pay', enabled: Boolean(process.env.FREEDOMPAY_CHECKOUT_URL) },
    ],
  };
};

const createStripePaymentSession = async ({ req, order, items }) => {
  const stripe = getStripe();
  if (!stripe) return null;
  const clientBaseUrl = resolveClientBaseUrl(req) || String(process.env.CLIENT_URL || '').replace(/\/$/, '');
  if (!clientBaseUrl) return null;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    currency: APP_CURRENCY,
    line_items: items.map((item) => ({
      price_data: {
        currency: APP_CURRENCY,
        product_data: { name: item.name },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: item.quantity,
    })),
    success_url: `${clientBaseUrl}/telegram/?view=orders&order=${order._id}&paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${clientBaseUrl}/telegram/?view=checkout&cancelled=1&order=${order._id}`,
    metadata: {
      orderId: String(order._id),
      provider: 'stripe_card',
      userId: String(order.user),
      source: 'telegram_mini_app',
    },
  });

  return {
    provider: 'stripe_card',
    mode: 'redirect',
    url: session.url || '',
    sessionId: session.id,
  };
};

export const createTelegramMiniPaymentSession = async ({ req, order }) => {
  if (!order) throw createError('Заказ не найден', 404);
  if (order.isPaid) return { provider: order.paymentMethod, mode: 'none', message: 'Заказ уже оплачен' };

  const items = Array.isArray(order.orderItems) ? order.orderItems.map((item) => ({
    name: item.name,
    price: Number(item.price || 0),
    quantity: Number(item.quantity || 0),
  })) : [];

  if (order.paymentMethod === 'stripe_card') {
    const session = await createStripePaymentSession({ req, order, items });
    if (session) return session;
    return { provider: 'stripe_card', mode: 'manual', message: 'Stripe не настроен на сервере' };
  }

  return buildExternalPaymentSession({
    paymentMethod: order.paymentMethod,
    order,
    user: req.user,
    clientBaseUrl: resolveClientBaseUrl(req) || String(process.env.CLIENT_URL || '').replace(/\/$/, ''),
  }) || { provider: order.paymentMethod, mode: 'manual', message: 'Платёжная сессия недоступна' };
};

export const commitTelegramMiniCheckout = async ({ req, user, payload = {} }) => {
  const preview = await buildTelegramMiniCheckoutDraft({ user, payload });
  const shippingAddress = ensureAddress(payload.address || preview.address);
  const expectedDeliveryDate = computeExpectedDeliveryDate({
    deliveryDays: preview.deliveryDays,
    deliveryWindow: preview.deliveryWindow,
  });

  const order = await Order.create({
    user: user._id,
    orderItems: preview.items.map((item) => ({
      product: item.product,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
    })),
    shippingAddress,
    paymentMethod: preview.paymentMethod,
    inventoryApplied: false,
    itemsPrice: preview.totals.itemsPrice,
    taxPrice: preview.totals.taxPrice,
    shippingPrice: preview.totals.shippingPrice,
    totalPrice: preview.totals.totalPrice,
    promoDiscount: Number(preview?.promo?.discount || 0),
    promo: preview.promo ? {
      code: preview.promo.code,
      title: preview.promo.title,
      type: preview.promo.type,
      value: preview.promo.value,
    } : undefined,
    status: 'pending',
    isPaid: false,
    isDelivered: false,
    deliveryWindow: preview.deliveryWindow,
    deliveryDays: preview.deliveryDays,
    expectedDeliveryDate,
    customerNote: preview.customerNote,
    statusHistory: [{
      status: 'pending',
      source: 'telegram_mini_checkout',
      actor: String(user?._id || ''),
      note: 'Заказ создан через Telegram Mini App',
    }],
  });

  user.telegramMiniLastAddress = shippingAddress;
  await user.save({ validateBeforeSave: false });

  if (preview.paymentMethod === 'cash') {
    await applyInventoryForOrder({ order, changedBy: user._id, reason: 'telegram_mini_cash_created' });
  }

  let paymentSession = null;
  try {
    paymentSession = await createTelegramMiniPaymentSession({ req, order });
  } catch {
    paymentSession = null;
  }

  try {
    await notifyNewOrder({ order, paymentSession });
  } catch {
    
  }

  return { order, checkout: preview, paymentSession };
};
