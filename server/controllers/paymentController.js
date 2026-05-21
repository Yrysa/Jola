import Stripe from 'stripe';
import Order from '../models/Order.js';
import { createError } from '../middleware/errorHandler.js';
import { notifyOrderUpdated } from '../utils/notifications.js';
import { applyInventoryForOrder, applyOrderStatusTransition } from '../utils/orderLifecycle.js';
import { runInTransaction } from '../utils/dbTransaction.js';

let stripeClient = null;
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
};

const markOrderPaid = async (session) => {
  const orderId = session?.metadata?.orderId;
  if (!orderId) return null;

  let order = null;

  await runInTransaction(async (dbSession) => {
    const orderQuery = Order.findById(orderId);
    order = dbSession ? await orderQuery.session(dbSession) : await orderQuery;
    if (!order) return;

    if (!order.isPaid && session?.payment_status === 'paid') {
      await applyInventoryForOrder({ order, changedBy: order.user, reason: 'order_paid', session: dbSession });
      order.isPaid = true;
      order.paidAt = order.paidAt || new Date();
      if (order.status === 'pending') {
        await applyOrderStatusTransition({
          order,
          nextStatus: 'confirmed',
          changedBy: order.user,
          source: 'payment',
          note: 'Оплата подтверждена Stripe',
          applyReason: 'order_paid',
          restockReason: 'order_cancelled',
          session: dbSession,
        });
      }

      order.paymentResult = {
        id: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
        status: session.payment_status,
        update_time: new Date().toISOString(),
        email_address: session.customer_details?.email || '',
      };

      await order.save({ session: dbSession });
    }
  });

  if (order?.isPaid && session?.payment_status === 'paid') {
    try {
      await notifyOrderUpdated({ order, message: '✅ Оплата по заказу подтверждена' });
    } catch {
    }
  }

  return order;
};

export const verifyStripeSession = async (req, res, next) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return next(createError('Stripe не настроен', 400));
    }

    const sessionId = String(req.body?.session_id || req.query.session_id || '').trim();
    const fallbackOrderId = String(req.body?.orderId || req.query.orderId || '').trim();
    if (!sessionId) {
      return next(createError('Не передан session_id', 400));
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    const sessionOrderId = String(session?.metadata?.orderId || fallbackOrderId || '').trim();
    if (!sessionOrderId) {
      return next(createError('Не удалось определить заказ Stripe session', 400));
    }

    let order = await Order.findById(sessionOrderId).select('_id user isPaid paidAt status paymentResult inventoryApplied');
    if (!order) {
      return next(createError('Заказ не найден', 404));
    }

    const isOwner = String(order.user) === String(req.user._id);
    if (!isOwner && req.user.role !== 'admin') {
      return next(createError('Нет доступа к этому заказу', 403));
    }

    const paid = session?.payment_status === 'paid';
    if (paid && !order.isPaid) {
      await markOrderPaid(session);
      order = await Order.findById(sessionOrderId).select('_id user isPaid paidAt status paymentResult inventoryApplied');
    }

    return res.status(200).json({
      status: 'success',
      data: {
        paid,
        orderId: order._id,
        orderPaid: Boolean(order.isPaid),
        orderStatus: order.status,
        sessionId: session.id,
      },
    });
  } catch (error) {
    if (error?.statusCode) return next(error);
    return next(createError(error?.message || 'Ошибка проверки Stripe session', 500));
  }
};

export const stripeWebhook = async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return res.status(400).send('Stripe webhook is not configured');
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).send('Missing Stripe signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err?.message || 'Invalid signature'}`);
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object;
      await markOrderPaid(session);
    }

    return res.json({ received: true });
  } catch (error) {
    return res.status(500).json({ message: error?.message || 'Webhook handler error' });
  }
};
