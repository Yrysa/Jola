
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { createError } from '../middleware/errorHandler.js';
import Stripe from 'stripe';
import { notifyNewOrder, notifyOrderUpdated } from '../utils/notifications.js';
import PrintService from '../modules/polygraphy/models/PrintService.js';
import UploadFile from '../modules/polygraphy/models/UploadFile.js';
import { calcDocumentPrint } from '../modules/polygraphy/pricing/documentPrint.js';
import { TAX_RATE, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, APP_CURRENCY } from '../config/appConfig.js';
import { appendOrderStatusHistory, applyInventoryForOrder, applyOrderStatusTransition, cleanupOrderFiles, moveUploadFilesToOrder, restockOrderInventory } from '../utils/orderLifecycle.js';
import { resolveClientBaseUrl } from '../utils/originSecurity.js';
import { evaluatePromoCode, normalizePromoCode } from '../utils/promocodes.js';


const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;


let stripeClient = null;
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe инициализирован');
  }
  return stripeClient;
};

const normalizeItems = (orderItems) => {
  return (orderItems || [])
    .map((item) => {
      const productId = item?.product || item?._id;
      const quantity = Number(item?.quantity || 0);
      return {
        productId: productId ? String(productId) : null,
        quantity,
      };
    })
    .filter((x) => x.productId && Number.isFinite(x.quantity) && x.quantity > 0);
};

const getEffectiveUnitPrice = (productDoc) => {
  const price = Number(productDoc.price || 0);
  const discount = Number(productDoc.discount || 0);
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
  if (w.includes('сегодня')) {
    const d = new Date(now);
    d.setHours(18, 0, 0, 0);
    return d;
  }
  if (w.includes('1') && w.includes('2')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    return d;
  }
  
  const d = new Date(now);
  d.setDate(d.getDate() + 2);
  return d;
};


export const createOrder = async (req, res, next) => {
  try {
    const {
      orderItems,
      serviceItems,
      shippingAddress,
      paymentMethod,
      deliveryWindow,
      deliveryDays,
      expectedDeliveryDate,
      customerNote,
      promoCode,
    } = req.body;

    
    const normalized = normalizeItems(orderItems);
    const incomingServices = Array.isArray(serviceItems) ? serviceItems : [];
    if (!normalized.length && !incomingServices.length) {
      return next(createError('Корзина пуста', 400));
    }

    if (
      !shippingAddress ||
      !shippingAddress.street ||
      !shippingAddress.city ||
      !shippingAddress.zipCode ||
      !shippingAddress.country
    ) {
      return next(createError('Заполните адрес доставки (улица, город, индекс, страна)', 400));
    }

    if (!paymentMethod) {
      return next(createError('Выберите способ оплаты', 400));
    }

    const normalizedPaymentMethod = paymentMethod === 'card' ? 'stripe_card' : paymentMethod;
    const allowedPaymentMethods = new Set(['stripe_card', 'cash']);
    if (!allowedPaymentMethods.has(String(normalizedPaymentMethod))) {
      return next(createError('Этот способ оплаты сейчас недоступен. Выберите Stripe или оплату наличными.', 400));
    }

    
    const ids = [...new Set(normalized.map((x) => x.productId))];
    const products = ids.length
      ? await Product.find({ _id: { $in: ids } }).select('name price discount images stock')
      : [];
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const missing = ids.filter((id) => !productMap.has(id));
    if (missing.length) {
      return next(createError('Некоторые товары не найдены или были удалены', 400));
    }

    const computedItems = normalized.map(({ productId, quantity }) => {
      const p = productMap.get(productId);
      const unitPrice = getEffectiveUnitPrice(p);
      return {
        product: p._id,
        name: p.name,
        image: p.images?.[0] || '',
        price: unitPrice,
        quantity,
        _stock: Number(p.stock || 0),
      };
    });

    const outOfStock = computedItems.find((i) => i.quantity > i._stock);
    if (outOfStock) {
      return next(
        createError(
          `Недостаточно товара на складе: ${outOfStock.name} (доступно ${outOfStock._stock}, нужно ${outOfStock.quantity})`,
          400
        )
      );
    }

    const productsSubtotal = round2(
      computedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    );

    
    const computedServices = [];
    let servicesSubtotal = 0;

    for (const s of incomingServices) {
      const serviceKey = String(s?.serviceKey || s?.key || '').trim();
      const fileIds = Array.isArray(s?.fileIds) ? s.fileIds.map(String) : [];
      const options = s?.options || {};
      if (!serviceKey || !fileIds.length) {
        return next(createError('Некорректная услуга печати: нет ключа или файлов', 400));
      }

      const service = await PrintService.findOne({ key: serviceKey, isActive: true }).lean();
      if (!service) return next(createError(`Услуга не найдена: ${serviceKey}`, 400));

      const files = await UploadFile.find({
        _id: { $in: fileIds },
        owner: req.user._id,
        scope: 'temp',
      })
        .select('originalName url size ext pages relPath')
        .lean();

      if (files.length !== fileIds.length) {
        return next(createError('Часть файлов услуги не найдена (или уже оформлена)', 400));
      }

      let calc;
      if (service.kind === 'document_print') {
        calc = calcDocumentPrint({ pricing: service.pricing, files, options });
      } else {
        return next(createError('Эта услуга пока не поддерживается', 400));
      }

      const price = Number(calc.total || 0);
      servicesSubtotal += price;

      computedServices.push({
        serviceKey: service.key,
        serviceTitle: service.title,
        kind: service.kind,
        options,
        files: files.map((f) => ({
          fileId: f._id,
          originalName: f.originalName,
          url: f.url,
          size: f.size,
          ext: f.ext,
          pages: f.pages,
          _relPath: f.relPath, 
        })),
        price,
        breakdown: calc.breakdown || {},
      });
    }
    servicesSubtotal = round2(servicesSubtotal);

    const itemsPrice = round2(productsSubtotal + servicesSubtotal);
    const promoResult = normalizePromoCode(promoCode)
      ? await evaluatePromoCode({ code: promoCode, userId: req.user._id, subtotal: itemsPrice })
      : null;
    const promoDiscount = round2(promoResult?.discount || 0);
    const discountedItemsPrice = round2(Math.max(0, itemsPrice - promoDiscount));
    const shippingPrice = round2(discountedItemsPrice > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE);
    const taxPrice = round2(discountedItemsPrice * TAX_RATE);
    const totalPrice = round2(discountedItemsPrice + shippingPrice + taxPrice);

    
    let order;
    try {
      const safeWindow = String(deliveryWindow || '1–2 дня').trim();
      const safeDays = Number.isFinite(Number(deliveryDays)) ? Number(deliveryDays) : 2;
      const expected = expectedDeliveryDate ? new Date(expectedDeliveryDate) : computeExpectedDeliveryDate({
        deliveryDays: safeDays,
        deliveryWindow: safeWindow,
      });

      order = await Order.create({
        user: req.user._id,
        orderItems: computedItems.map(({ _stock, ...rest }) => rest),
        serviceItems: computedServices.map(({ files, ...rest }) => ({
          ...rest,
          files: files.map(({ _relPath, ...f }) => f),
        })),
        shippingAddress,
        paymentMethod: normalizedPaymentMethod,
        inventoryApplied: false,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        promoDiscount,
        promo: promoResult ? {
          code: promoResult.promo.code,
          title: promoResult.promo.title,
          type: promoResult.promo.type,
          value: promoResult.promo.value,
        } : undefined,
        status: 'pending',
        isPaid: false,
        isDelivered: false,
        deliveryWindow: safeWindow,
        deliveryDays: safeDays,
        expectedDeliveryDate: expected,
        customerNote: typeof customerNote === 'string' ? customerNote.trim().slice(0, 500) : '',
        statusHistory: [
          {
            status: 'pending',
            source: 'checkout',
            actor: String(req.user?._id || ''),
            note: 'Заказ создан пользователем',
          },
        ],
      });
    } catch (e) {
      throw e;
    }

    
    try {
      if (computedServices.length) {
        await moveUploadFilesToOrder({ order, userId: req.user._id });
      }
    } catch (e) {
      await cleanupOrderFiles(order._id).catch(() => {});
      await order.deleteOne().catch(() => {});
      return next(createError(e?.message || 'Не удалось подготовить файлы заказа', e?.statusCode || 500));
    }

    if (normalizedPaymentMethod === 'cash') {
      try {
        await applyInventoryForOrder({ order, changedBy: req.user._id, reason: 'order_cash_created' });
        order.customerNote = [
          order.customerNote,
          'Клиент выбрал оплату наличными. Заказ требует подтверждения через WhatsApp или Telegram.',
        ].filter(Boolean).join('\n');
        await order.save();
      } catch (e) {
        await cleanupOrderFiles(order._id).catch(() => {});
        await order.deleteOne().catch(() => {});
        return next(e);
      }
    }

    
    let paymentSession = null;
    const clientBaseUrl = resolveClientBaseUrl(req);
    const stripe = normalizedPaymentMethod === 'stripe_card' ? getStripe() : null;
    if (normalizedPaymentMethod === 'stripe_card' && stripe) {
      try {
        paymentSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          currency: APP_CURRENCY,
          line_items: [
            ...computedItems.map((item) => ({
              price_data: {
                currency: APP_CURRENCY,
                product_data: { name: item.name },
                unit_amount: Math.round(Number(item.price) * 100),
              },
              quantity: item.quantity,
            })),
            ...computedServices.map((s) => ({
              price_data: {
                currency: APP_CURRENCY,
                product_data: { name: `Услуга: ${s.serviceTitle}` },
                unit_amount: Math.round(Number(s.price) * 100),
              },
              quantity: 1,
            })),
          ],
          success_url: `${clientBaseUrl || process.env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&orderId=${order._id}`,
          cancel_url: `${clientBaseUrl || process.env.CLIENT_URL}/checkout?cancelled=1&orderId=${order._id}`,
          metadata: {
            orderId: String(order._id),
            provider: 'stripe_card',
            userId: String(req.user._id),
          },
        });

        if (paymentSession) {
          paymentSession.provider = 'stripe_card';
          paymentSession.mode = 'redirect';
        }
      } catch (e) {
        
        console.error('⚠️ Stripe session create failed:', e?.message || e);
        paymentSession = null;
      }
    }

    
    try {
      await notifyNewOrder({ order, paymentSession });
    } catch (e) {
      console.warn('⚠️ notifyNewOrder failed:', e?.message || e);
    }

    return res.status(201).json({
      status: 'success',
      data: {
        order,
        paymentSession,
      },
    });
  } catch (error) {
    next(error);
  }
};


export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
};


export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone role telegramUsername');

    if (!order) {
      return next(createError('Заказ не найден', 404));
    }

    
    if (String(order.user._id) !== String(req.user._id) && req.user.role !== 'admin') {
      return next(createError('Нет доступа к этому заказу', 403));
    }

    res.status(200).json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};


export const updateOrderStatus = async (req, res, next) => {
  try {
    const {
      status,
      isPaid,
      isDelivered,
      adminNote,
      deliveryWindow,
      deliveryDays,
      expectedDeliveryDate,
    } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return next(createError('Заказ не найден', 404));
    }

    if (status) {
      await applyOrderStatusTransition({
        order,
        nextStatus: status,
        changedBy: req.user._id,
        source: 'admin_panel',
        note: typeof adminNote === 'string' && adminNote.trim() ? adminNote.trim().slice(0, 500) : `Статус изменён администратором на ${String(status).trim()}`,
        applyReason: 'order_paid_admin',
        restockReason: 'order_cancelled',
      });
    }

    if (typeof isPaid === 'boolean') {
      order.isPaid = isPaid;
      if (isPaid) order.paidAt = order.paidAt || new Date();
    }
    if (typeof isDelivered === 'boolean') {
      order.isDelivered = isDelivered;
      if (isDelivered) order.deliveredAt = order.deliveredAt || new Date();
    }

    if (typeof adminNote === 'string') {
      order.adminNote = adminNote.slice(0, 500);
    }

    if (typeof deliveryWindow === 'string' && deliveryWindow.trim()) {
      order.deliveryWindow = deliveryWindow.trim();
    }
    if (deliveryDays !== undefined) {
      const d = Number(deliveryDays);
      if (Number.isFinite(d) && d >= 0) order.deliveryDays = d;
    }
    if (expectedDeliveryDate) {
      const dt = new Date(expectedDeliveryDate);
      if (!Number.isNaN(dt.getTime())) order.expectedDeliveryDate = dt;
    }

    if (!status && typeof adminNote === 'string' && adminNote.trim()) {
      appendOrderStatusHistory(order, {
        status: order.status,
        source: 'admin_note',
        actor: String(req.user?._id || ''),
        note: `Заметка обновлена: ${adminNote.trim().slice(0, 200)}`,
      });
    }

    await order.save();

    
    notifyOrderUpdated({
      order,
      message: `📦 Обновление по заказу #${String(order._id).slice(-6)}: статус ${order.status}`,
    }).catch(() => {});

    res.json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};


export const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return next(createError('Заказ не найден', 404));
    }

    if (order.inventoryApplied) {
      await restockOrderInventory({ order, changedBy: req.user._id, reason: 'order_deleted' });
    }
    await cleanupOrderFiles(order._id);
    await order.deleteOne();

    return res.json({
      status: 'success',
      data: { message: 'Заказ удалён' },
    });
  } catch (error) {
    next(error);
  }
};


export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email phone role telegramUsername')
      .populate('orderItems.product', 'name');

    res.status(200).json({
      status: 'success',
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
};
