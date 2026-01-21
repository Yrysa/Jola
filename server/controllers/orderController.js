// server/controllers/orderController.js
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { createError } from '../middleware/errorHandler.js';
import Stripe from 'stripe';

// Инициализируем Stripe только если есть ключ
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe инициализирован');
} else {
  console.log('⚠ Stripe не настроен (STRIPE_SECRET_KEY не задан). Оплата картой будет фиктивной.');
}

// @desc    Создать заказ
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res, next) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      taxPrice,
      shippingPrice,
      totalPrice,
    } = req.body;

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return next(createError('Корзина пуста', 400));
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
      return next(createError('Заполните адрес доставки', 400));
    }

    if (!paymentMethod) {
      return next(createError('Выберите способ оплаты', 400));
    }

    // Пересчёт стоимости на бэке (чтобы нельзя было мухлевать с фронта)
    const itemsPrice = orderItems.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );

    const tax = Number(taxPrice || 0);
    const shipping = Number(shippingPrice || 0);
    const calcTotal = itemsPrice + tax + shipping;

    // Создаём документ заказа
    const order = await Order.create({
      user: req.user._id,
      orderItems: orderItems.map((item) => ({
        product: item.product || item._id, // на всякий
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
      })),
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice: tax,
      shippingPrice: shipping,
      totalPrice: calcTotal,
      status: 'pending',
      isPaid: false,
      isDelivered: false,
    });

    // Обновляем остатки по товарам
    for (const item of orderItems) {
      const productId = item.product || item._id;
      if (!productId) continue;

      await Product.findByIdAndUpdate(productId, {
        $inc: { countInStock: -Number(item.quantity || 0) },
      });
    }

    // Если выбрана оплата картой и Stripe настроен — создаём сессию
    let paymentSession = null;

    if (paymentMethod === 'card' && stripe) {
      paymentSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        currency: 'kzt', // тенге
        line_items: orderItems.map((item) => ({
          price_data: {
            currency: 'kzt',
            product_data: {
              name: item.name,
            },
            // Stripe ждёт сумму в тыйынах -> умножаем на 100 и округляем
            unit_amount: Math.round(Number(item.price) * 100),
          },
          quantity: item.quantity,
        })),
        success_url: `${process.env.CLIENT_URL}/orders/${order._id}?status=success`,
        cancel_url: `${process.env.CLIENT_URL}/orders/${order._id}?status=cancel`,
        metadata: {
          orderId: String(order._id),
        },
      });
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
    if (
      String(order.user._id) !== String(req.user._id) &&
      req.user.role !== 'admin'
    ) {
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

    order.updatedAt = new Date();

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
