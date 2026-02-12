// server/controllers/orderController.js
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { createError } from '../middleware/errorHandler.js';
import Stripe from 'stripe';

// ===== Helpers =====
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const TAX_RATE = 0.08;
const FREE_SHIPPING_THRESHOLD = 5000;
const SHIPPING_FEE = 300;

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

// @desc    Создать заказ
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res, next) => {
  try {
    const { orderItems, shippingAddress, paymentMethod } = req.body;

    // Базовая валидация
    const normalized = normalizeItems(orderItems);
    if (!normalized.length) {
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

    // 1) Берём товары из БД (а не доверяем price с фронта)
    const ids = [...new Set(normalized.map((x) => x.productId))];
    const products = await Product.find({ _id: { $in: ids } }).select('name price discount images stock');
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const missing = ids.filter((id) => !productMap.has(id));
    if (missing.length) {
      return next(createError('Некоторые товары не найдены или были удалены', 400));
    }

    // 2) Считаем сумму и готовим orderItems из данных БД
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

    // 3) Проверяем наличие на складе
    const outOfStock = computedItems.find((i) => i.quantity > i._stock);
    if (outOfStock) {
      return next(
        createError(
          `Недостаточно товара на складе: ${outOfStock.name} (доступно ${outOfStock._stock}, нужно ${outOfStock.quantity})`,
          400
        )
      );
    }

    const itemsPrice = round2(
      computedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    );
    const shippingPrice = round2(itemsPrice > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE);
    const taxPrice = round2(itemsPrice * TAX_RATE);
    const totalPrice = round2(itemsPrice + shippingPrice + taxPrice);

    // 4) Списываем остатки (атомарно на уровне документа)
    //    Если какая-то позиция не обновилась (stock < qty), откатываем предыдущие.
    const decremented = [];
    for (const item of computedItems) {
      const r = await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
      if (r.modifiedCount !== 1) {
        // откат
        for (const done of decremented) {
          await Product.updateOne({ _id: done.product }, { $inc: { stock: done.quantity } });
        }
        return next(
          createError(
            `Недостаточно товара на складе: ${item.name} (попробуйте уменьшить количество)`,
            400
          )
        );
      }
      decremented.push({ product: item.product, quantity: item.quantity });
    }

    // 5) Создаём заказ
    let order;
    try {
      order = await Order.create({
        user: req.user._id,
        orderItems: computedItems.map(({ _stock, ...rest }) => rest),
        shippingAddress,
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        status: 'pending',
        isPaid: false,
        isDelivered: false,
      });
    } catch (e) {
      // если заказ не создался — возвращаем остатки
      for (const done of decremented) {
        await Product.updateOne({ _id: done.product }, { $inc: { stock: done.quantity } });
      }
      throw e;
    }

    // 6) Stripe (если выбрали оплату картой)
    let paymentSession = null;
    const stripe = paymentMethod === 'card' ? getStripe() : null;
    if (paymentMethod === 'card' && stripe) {
      try {
        paymentSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          currency: 'kzt',
          line_items: computedItems.map((item) => ({
            price_data: {
              currency: 'kzt',
              product_data: { name: item.name },
              // Stripe ждёт сумму в тыйынах -> * 100
              unit_amount: Math.round(Number(item.price) * 100),
            },
            quantity: item.quantity,
          })),
          success_url: `${process.env.CLIENT_URL}/orders/${order._id}?status=success`,
          cancel_url: `${process.env.CLIENT_URL}/orders/${order._id}?status=cancel`,
          metadata: { orderId: String(order._id) },
        });
      } catch (e) {
        // Не роняем оформление заказа из-за Stripe.
        console.error('⚠️ Stripe session create failed:', e?.message || e);
        paymentSession = null;
      }
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

// @desc    Получить заказы текущего пользователя
// @route   GET /api/orders/myorders
// @access  Private
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

// @desc    Получить заказ по ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return next(createError('Заказ не найден', 404));
    }

    // Пользователь может видеть только свои заказы, админ — любые
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

// @desc    Обновить статус заказа (админ)
// @route   PUT /api/orders/:id/status
// @access  Admin
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, isPaid, isDelivered } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return next(createError('Заказ не найден', 404));
    }

    if (status) order.status = status;
    if (typeof isPaid === 'boolean') order.isPaid = isPaid;
    if (typeof isDelivered === 'boolean') order.isDelivered = isDelivered;

    await order.save();

    res.json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Получить все заказы (админ)
// @route   GET /api/orders
// @access  Admin
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('orderItems.product', 'name');

    res.status(200).json({
      status: 'success',
      data: { orders },
    });
  } catch (error) {
    next(error);
  }
};
