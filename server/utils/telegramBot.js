


import Order from '../models/Order.js';
import User from '../models/User.js';
import { tgAnswerCallbackQuery, tgDeleteWebhook, tgEditMessageText, tgGetMe, tgSendMessage, tgSetChatMenuButton, tgSetMyCommands } from './telegramApi.js';
import { applyOrderStatusTransition, ORDER_STATUS_FLOW } from './orderLifecycle.js';
import { buildTelegramMiniAppUrl, buildTelegramMiniDirectLink, getTelegramMiniAppBaseUrl, isValidTelegramWebAppUrl } from './telegramAccess.js';

const safe = (v) => (v == null ? '' : String(v));

const STATUS_LABELS_RU = {
  pending: '🕓 Ожидает',
  confirmed: '✅ Подтверждено',
  processing: '🟡 В обработке',
  shipped: '🚚 Отправлен',
  delivered: '✅ Доставлен',
  cancelled: '❌ Отменён',
};

const STATUS_FLOW_LABELS = {
  pending: 'Ожидает',
  confirmed: 'Подтверждён',
  processing: 'В обработке',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
};

const buildUrlButton = (text, url) => ({ inline_keyboard: [[{ text, url }]] });
const buildWebAppInlineButton = (text, url) => ({ inline_keyboard: [[{ text, web_app: { url } }]] });

const buildMiniAppKeyboard = ({ appUrl, isAdmin = false }) => ({
  keyboard: [
    [{ text: 'Jola Mini App', web_app: { url: appUrl } }],
    isAdmin
      ? [{ text: 'Мои заказы' }, { text: 'Админка Jola' }]
      : [{ text: 'Мои заказы' }, { text: 'Помощь' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
  one_time_keyboard: false,
});

const buildFallbackLaunchText = () => {
  const publicBase = getTelegramMiniAppBaseUrl();
  if (publicBase) {
    return `Mini App временно недоступен как встроенная кнопка. Откройте сайт по ссылке: ${publicBase}`;
  }
  return 'Mini App пока не может открыться прямо в Telegram, потому что для Web App нужен публичный HTTPS-адрес сайта. Укажите TELEGRAM_WEBAPP_URL=https://ваш-домен или PUBLIC_WEB_URL=https://ваш-домен и перезапустите сервер.';
};

const canUseTelegramWebApp = (url) => isValidTelegramWebAppUrl(url);

const buildTelegramLaunchPanel = async ({ user, orderId = '' } = {}) => {
  if (!user) return null;
  const appUrl = await buildTelegramMiniAppUrl(user, {
    view: user.role === 'admin' ? 'admin' : 'orders',
    orderId,
  });
  const directLink = buildTelegramMiniDirectLink({ startApp: orderId ? `order_${orderId}` : (user.role === 'admin' ? 'admin' : 'home') });
  if (!appUrl) {
    return {
      appUrl: '',
      inline: null,
      keyboard: null,
      fallbackText: directLink ? `${buildFallbackLaunchText()}
Прямой запуск: ${directLink}` : buildFallbackLaunchText(),
      webAppEnabled: false,
    };
  }
  if (!canUseTelegramWebApp(appUrl)) {
    return {
      appUrl,
      inline: buildUrlButton('Открыть Jola Mini App', getTelegramMiniAppBaseUrl() || appUrl),
      keyboard: null,
      fallbackText: directLink ? `${buildFallbackLaunchText()}
Прямой запуск: ${directLink}` : buildFallbackLaunchText(),
      webAppEnabled: false,
    };
  }
  return {
    appUrl,
    inline: buildWebAppInlineButton('Jola Mini App', appUrl),
    keyboard: buildMiniAppKeyboard({ appUrl, isAdmin: user.role === 'admin' }),
    fallbackText: '',
    webAppEnabled: true,
  };
};

export const buildOrderKeyboard = (orderId, currentStatus) => {
  const mk = (status, label) => ({
    text: currentStatus === status ? `✅ ${label}` : label,
    callback_data: `ord:${orderId}:${status}`,
  });

  return {
    inline_keyboard: [
      [
        mk('confirmed', 'Подтверждено'),
        mk('processing', 'В обработке'),
      ],
      [
        mk('shipped', 'Отправлен'),
        mk('delivered', 'Доставлен'),
      ],
      [
        mk('cancelled', 'Отменён'),
      ],
      [
        { text: '⏱ +1д', callback_data: `ord:${orderId}:eta:1d` },
        { text: '⏱ +2д', callback_data: `ord:${orderId}:eta:2d` },
        { text: '⏱ +3д', callback_data: `ord:${orderId}:eta:3d` },
        { text: '⏱ +7д', callback_data: `ord:${orderId}:eta:7d` },
      ],
    ],
  };
};

const formatStatusHistory = (order) => {
  const history = Array.isArray(order?.statusHistory) ? order.statusHistory : [];
  if (!history.length) return [];
  return history.slice(-4).map((item) => {
    const stamp = item?.at ? new Date(item.at).toLocaleString() : '—';
    const label = STATUS_LABELS_RU[item?.status] || safe(item?.status);
    const note = String(item?.note || '').trim();
    return `• ${label} · ${stamp}${note ? ` · ${note}` : ''}`;
  });
};

export const formatOrderText = ({ order, user }) => {
  const addr = order?.shippingAddress;
  const lines = [];
  lines.push(`🧾 Заказ #${safe(order?._id).slice(-6)}`);
  lines.push(`🆔 ${safe(order?._id)}`);
  lines.push(`💰 Сумма: ${safe(order?.totalPrice)} ₸`);
  lines.push(`📦 Статус: ${STATUS_LABELS_RU[order?.status] || safe(order?.status)}`);
  lines.push(`💳 Оплата: ${order?.isPaid ? 'оплачен' : 'не оплачен'}`);
  if (user) {
    lines.push(`👤 Клиент: ${safe(user.name)}`);
    if (user.email) lines.push(`📧 ${safe(user.email)}`);
    if (user.phone) lines.push(`📞 ${safe(user.phone)}`);
    if (user.telegramUsername) lines.push(`🔗 @${safe(user.telegramUsername)}`);
  }
  if (order?.customerNote) lines.push(`📝 Комментарий: ${safe(order.customerNote)}`);
  if (order?.deliveryWindow) lines.push(`🚚 Срок: ${safe(order?.deliveryWindow)}`);
  if (order?.expectedDeliveryDate) {
    lines.push(`🕒 Ожидается: ${new Date(order.expectedDeliveryDate).toLocaleString()}`);
  }
  if (addr) {
    lines.push(`📍 Адрес: ${safe(addr.street)}, ${safe(addr.city)}, ${safe(addr.zipCode)}, ${safe(addr.country)}`);
  }
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
  if (items.length) {
    lines.push('🛒 Товары:');
    for (const i of items.slice(0, 10)) {
      const qty = Number(i.quantity) || 0;
      const price = Number(i.price) || 0;
      lines.push(`• ${safe(i.name)} × ${qty} = ${price * qty} ₸`);
    }
    if (items.length > 10) lines.push(`…и ещё ${items.length - 10} поз.`);
  }

  const services = Array.isArray(order?.serviceItems) ? order.serviceItems : [];
  if (services.length) {
    lines.push('🖨 Услуги печати:');
    for (const s of services.slice(0, 10)) {
      const price = Number(s.price) || 0;
      const files = Array.isArray(s.files) ? s.files : [];
      const pages = files.reduce((sum, f) => sum + Math.max(1, Number(f.pages || 1)), 0);
      const copies = Number(s?.options?.copies || 1) || 1;
      lines.push(`• ${safe(s.serviceTitle)}: ${files.length} файл(ов), ${pages} стр., копий: ${copies} = ${price} ₸`);
    }
    if (services.length > 10) lines.push(`…и ещё ${services.length - 10} усл.`);
  }

  const historyLines = formatStatusHistory(order);
  if (historyLines.length) {
    lines.push('🕘 Последние этапы:');
    lines.push(...historyLines);
  }

  return lines.join('\n');
};

export const formatUserOrderText = ({ order }) => {
  const lines = [];
  lines.push('✅ Ваш заказ принят!');
  lines.push(`🧾 Заказ #${safe(order?._id).slice(-6)}`);
  lines.push(`📦 Статус: ${STATUS_LABELS_RU[order?.status] || safe(order?.status)}`);
  lines.push(`💰 Сумма: ${safe(order?.totalPrice)} ₸`);
  lines.push(`💳 Оплата: ${order?.isPaid ? 'оплачено' : 'ожидается'}`);
  if (order?.deliveryWindow) lines.push(`🚚 Срок: ${safe(order?.deliveryWindow)}`);
  if (order?.expectedDeliveryDate) {
    lines.push(`⏱ Ориентировочно: ${new Date(order.expectedDeliveryDate).toLocaleString()}`);
  }
  const historyLines = formatStatusHistory(order);
  if (historyLines.length) {
    lines.push('🕘 История:');
    lines.push(...historyLines);
  }
  lines.push('Спасибо! Мы напишем вам здесь, когда статус изменится.');
  return lines.join('\n');
};

const parseAllowedChatIds = () => {
  const raw = process.env.TELEGRAM_ADMIN_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
};

const isAllowedChat = (chatId, allowed) => allowed.has(String(chatId));

const getUpdatesUrl = ({ token, offset }) => {
  const base = `https://api.telegram.org/bot${token}/getUpdates`;
  const params = new URLSearchParams();
  params.set('timeout', '50');
  params.set('allowed_updates', JSON.stringify(['callback_query', 'message']));
  if (offset) params.set('offset', String(offset));
  return `${base}?${params.toString()}`;
};

const getFetch = () => {
  if (typeof fetch === 'function') return fetch;
  return (...args) => import('node-fetch').then(({ default: f }) => f(...args));
};

const normalizeStatus = (s) => {
  const x = String(s || '').trim().toLowerCase();
  if (['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(x)) return x;
  if (x === 'approve' || x === 'approved') return 'confirmed';
  if (x === 'done') return 'delivered';
  return null;
};

const appendAdminNote = (order, noteLine) => {
  const prev = String(order.adminNote || '').trim();
  const next = prev ? `${prev}\n${noteLine}` : noteLine;
  order.adminNote = next.slice(0, 500);
};

const describeAllowedTransitions = (status) => {
  const steps = ORDER_STATUS_FLOW[String(status || '').trim().toLowerCase()] || [];
  return steps.length ? steps.map((item) => STATUS_FLOW_LABELS[item] || item).join(', ') : 'нет';
};

const findLinkedUserByChatId = async (chatId) => User.findOne({ telegramChatId: String(chatId) }).select('+telegramChatId');

const sendMiniAppPanel = async ({ chatId, user, orderId = '', text = 'Открыть приложение tg Jola' }) => {
  const panel = await buildTelegramLaunchPanel({ user, orderId });
  if (!panel) return null;

  if (panel.webAppEnabled && panel.keyboard) {
    await tgSendMessage({
      chat_id: chatId,
      text,
      reply_markup: panel.keyboard,
    });
    await tgSendMessage({
      chat_id: chatId,
      text: user.role === 'admin'
        ? 'Внутри Mini App откроется отдельный Telegram-интерфейс Jola: dashboard, каталог, заказы, уведомления и поддержка.'
        : 'Внутри Mini App откроется отдельный Telegram-интерфейс Jola: главная, профиль, баланс, каталог, мои заказы и уведомления.',
      reply_markup: panel.inline,
    });
    return panel.appUrl;
  }

  await tgSendMessage({
    chat_id: chatId,
    text: `${text}

${panel.fallbackText}`,
    reply_markup: panel.inline || undefined,
  });
  return panel.appUrl || null;
};

const sendLinkedUserAppButton = async ({ chatId, user, text = 'Открыть мои заказы' }) => {
  const url = await buildTelegramMiniAppUrl(user, { view: 'orders' });
  if (!url) return null;
  await tgSendMessage({
    chat_id: chatId,
    text,
    reply_markup: buildWebAppInlineButton('Открыть Jola Mini App', url),
  });
  return url;
};

const sendMyOrdersToLinkedUser = async ({ chatId, user }) => {
  const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(5).lean();
  if (!orders.length) {
    await tgSendMessage({ chat_id: chatId, text: 'У вас пока нет заказов в системе.' });
    await sendMiniAppPanel({ chatId, user, text: 'Когда появятся заказы, приложение откроется здесь:' });
    return;
  }

  for (const order of orders) {
    await tgSendMessage({
      chat_id: chatId,
      text: formatUserOrderText({ order }),
    });
  }

  await sendMiniAppPanel({ chatId, user, text: 'Для полного списка, файлов и деталей откройте Mini App:' });
};

const handleCallback = async ({ cq, allowedChatIds }) => {
  const chatId = cq?.message?.chat?.id;
  const messageId = cq?.message?.message_id;
  const from = cq?.from;
  const who = from?.username ? `@${from.username}` : safe(from?.first_name || from?.id);

  if (!isAllowedChat(chatId, allowedChatIds)) {
    await tgAnswerCallbackQuery({ callback_query_id: cq.id, text: 'Нет доступа', show_alert: true });
    return;
  }

  const data = String(cq?.data || '');
  const m = data.match(/^ord:([a-f0-9]{24}):(.+)$/i);
  if (!m) {
    await tgAnswerCallbackQuery({ callback_query_id: cq.id, text: 'Неверная команда', show_alert: true });
    return;
  }

  const orderId = m[1];
  const action = String(m[2] || '').trim();

  const order = await Order.findById(orderId);
  if (!order) {
    await tgAnswerCallbackQuery({ callback_query_id: cq.id, text: 'Заказ не найден', show_alert: true });
    return;
  }

  const eta = action.match(/^eta:(\d+)d$/i);
  if (eta) {
    const days = Math.min(30, Math.max(0, Number(eta[1])));
    order.deliveryDays = days;
    order.deliveryWindow = `${days} дн.`;
    order.expectedDeliveryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    appendAdminNote(order, `TG: ${who} → ETA +${days}d (${new Date().toLocaleString()})`);
    await order.save();

    const user = await User.findById(order.user).select('name email phone telegramChatId telegramUsername role').lean();
    const newText = formatOrderText({ order, user });
    await tgEditMessageText({
      chat_id: chatId,
      message_id: messageId,
      text: newText,
      reply_markup: buildOrderKeyboard(String(order._id), order.status),
    });

    if (user?.telegramChatId) {
      await tgSendMessage({
        chat_id: user.telegramChatId,
        text: `⏱ По заказу #${safe(order?._id).slice(-6)} установлен срок доставки: +${days} дн.`,
      });
    }

    await tgAnswerCallbackQuery({ callback_query_id: cq.id, text: `Срок: +${days} дн.` });
    return;
  }

  const status = normalizeStatus(action);
  if (!status) {
    await tgAnswerCallbackQuery({ callback_query_id: cq.id, text: 'Неверная команда', show_alert: true });
    return;
  }

  try {
    await applyOrderStatusTransition({
      order,
      nextStatus: status,
      changedBy: null,
      source: 'telegram_bot',
      note: `Статус изменён из Telegram: ${who}`,
      applyReason: 'telegram_status_update',
      restockReason: 'telegram_status_update',
    });
  } catch (error) {
    await tgAnswerCallbackQuery({
      callback_query_id: cq.id,
      text: error?.message || `Разрешено: ${describeAllowedTransitions(order.status)}`,
      show_alert: true,
    });
    return;
  }

  appendAdminNote(order, `TG: ${who} → ${status} (${new Date().toLocaleString()})`);
  await order.save();

  const user = await User.findById(order.user).select('name email phone telegramChatId telegramUsername role').lean();
  const newText = formatOrderText({ order, user });
  await tgEditMessageText({
    chat_id: chatId,
    message_id: messageId,
    text: newText,
    reply_markup: buildOrderKeyboard(String(order._id), order.status),
  });

  if (user?.telegramChatId) {
    await tgSendMessage({
      chat_id: user.telegramChatId,
      text: `📦 Статус заказа #${safe(order?._id).slice(-6)}: ${STATUS_LABELS_RU[status] || status}`,
    });
    await sendMiniAppPanel({ chatId: user.telegramChatId, user, orderId: String(order._id), text: 'Открыть заказ в приложении tg Jola:' });
  }

  await tgAnswerCallbackQuery({
    callback_query_id: cq.id,
    text: `Статус: ${STATUS_LABELS_RU[status] || status}`,
  });
};

const handleMessage = async ({ msg, allowedChatIds }) => {
  const chatId = msg?.chat?.id;
  const rawText = String(msg?.text || '').trim();
  const text = rawText.toLowerCase();
  const linkedUser = chatId ? await findLinkedUserByChatId(chatId) : null;

  if (rawText.startsWith('/start')) {
    const token = rawText.split(' ')[1];
    if (!token) {
      if (linkedUser) {
        await tgSendMessage({
          chat_id: chatId,
          text: linkedUser.role === 'admin'
            ? 'Аккаунт уже привязан. Ниже кнопка для входа в отдельный Jola Mini App.'
            : 'Аккаунт уже привязан. Ниже кнопка для входа в отдельный Jola Mini App.',
        });
        await sendMiniAppPanel({ chatId, user: linkedUser });
        return;
      }
      await tgSendMessage({
        chat_id: chatId,
        text: 'Привет! Чтобы привязать аккаунт, зайдите в профиль на сайте → Telegram → Подключить и нажмите Start по ссылке. После привязки появится кнопка «Jola Mini App».',
      });
      return;
    }

    const user = await User.findOne({
      telegramLinkToken: token,
      telegramLinkTokenExpire: { $gt: new Date() },
    }).select('+telegramChatId');

    if (!user) {
      await tgSendMessage({
        chat_id: chatId,
        text: '❌ Ссылка недействительна или устарела. Получите новую ссылку в профиле на сайте.',
      });
      return;
    }

    user.telegramChatId = String(chatId);
    user.telegramUsername = msg?.from?.username || user.telegramUsername;
    user.telegramLinkedAt = new Date();
    user.telegramLinkToken = undefined;
    user.telegramLinkTokenExpire = undefined;
    await user.save({ validateBeforeSave: false });

    await tgSendMessage({
      chat_id: chatId,
      text: user.role === 'admin'
        ? '✅ Готово! Аккаунт привязан. Теперь у вас есть отдельный Jola Mini App внутри Telegram с каталогом, заказами, уведомлениями и поддержкой.'
        : '✅ Готово! Аккаунт привязан. Теперь у вас есть отдельный Jola Mini App внутри Telegram с профилем, балансом, каталогом, заказами и уведомлениями.',
    });
    await sendMiniAppPanel({ chatId, user, text: 'Открыть приложение tg Jola:' });
    return;
  }

  if (rawText === '/id') {
    await tgSendMessage({ chat_id: chatId, text: `Ваш chat_id: ${chatId}` });
    return;
  }

  if (rawText === '/help' || text === 'помощь') {
    const lines = [
      'Доступные команды:',
      '/app — открыть Mini App Jola',
      '/myorders — показать последние ваши заказы',
      '/id — показать chat_id',
    ];
    if (isAllowedChat(chatId, allowedChatIds)) {
      lines.push('/orders — последние заказы для админа');
      lines.push('/ping — проверка бота');
    }
    await tgSendMessage({ chat_id: chatId, text: lines.join('\n') });
    return;
  }

  if (rawText === '/app' || text === 'приложение tg jola' || text === 'админка jola') {
    if (!linkedUser) {
      await tgSendMessage({ chat_id: chatId, text: 'Сначала привяжите Telegram к аккаунту через профиль на сайте.' });
      return;
    }
    await sendMiniAppPanel({
      chatId,
      user: linkedUser,
      text: linkedUser.role === 'admin' ? 'Вход в админку Jola через Mini App:' : 'Вход в приложение для ваших заказов:',
    });
    return;
  }

  if (rawText === '/myorders' || text === 'мои заказы') {
    if (!linkedUser) {
      await tgSendMessage({ chat_id: chatId, text: 'Сначала привяжите Telegram к аккаунту через профиль на сайте.' });
      return;
    }
    await sendMyOrdersToLinkedUser({ chatId, user: linkedUser });
    return;
  }

  if (!isAllowedChat(chatId, allowedChatIds)) return;

  if (rawText === '/ping' || text === 'ping') {
    await tgSendMessage({ chat_id: chatId, text: '✅ Бот на связи. Кнопки статуса работают.' });
    return;
  }

  if (rawText === '/orders') {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(5).lean();
    if (!orders.length) {
      await tgSendMessage({ chat_id: chatId, text: 'Пока нет заказов.' });
      return;
    }
    for (const order of orders) {
      const user = order.user ? await User.findById(order.user).select('name email phone telegramUsername role').lean() : null;
      await tgSendMessage({
        chat_id: chatId,
        text: formatOrderText({ order, user }),
        reply_markup: buildOrderKeyboard(String(order._id), order.status),
      });
    }

    if (linkedUser?.role === 'admin') {
      await sendMiniAppPanel({ chatId, user: linkedUser, text: 'Полная админка заказов доступна в Mini App:' });
    }
  }
};

const preparePollingSession = async () => {
  try {
    const me = await tgGetMe();
    const username = me?.username ? `@${me.username}` : '(без username)';
    console.log(`🤖 Telegram bot connected as ${username}`);
  } catch (error) {
    throw new Error(`Telegram getMe failed: ${error?.message || error}`);
  }

  try {
    await tgDeleteWebhook({ drop_pending_updates: false });
  } catch (error) {
    console.warn('⚠️ Telegram deleteWebhook failed:', error?.message || error);
  }

  try {
    await tgSetMyCommands([
      { command: 'start', description: 'Запустить и открыть tg Jola' },
      { command: 'app', description: 'Открыть приложение tg Jola' },
      { command: 'myorders', description: 'Показать мои заказы' },
      { command: 'help', description: 'Помощь' },
      { command: 'id', description: 'Показать ваш chat_id' },
    ]);
  } catch (error) {
    console.warn('⚠️ Telegram setMyCommands failed:', error?.message || error);
  }

  try {
    const webAppUrl = getTelegramMiniAppBaseUrl();
    if (webAppUrl) {
      await tgSetChatMenuButton({
        menu_button: {
          type: 'web_app',
          text: 'Jola Mini App',
          web_app: { url: webAppUrl },
        },
      });
    }
  } catch (error) {
    console.warn('⚠️ Telegram setChatMenuButton failed:', error?.message || error);
  }
};

export const startTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('ℹ️ Telegram bot: TELEGRAM_BOT_TOKEN не задан — бот не запущен');
    return;
  }

  const allowedChatIds = parseAllowedChatIds();
  if (!allowedChatIds.size) {
    console.log('⚠️ Telegram bot: не задан TELEGRAM_CHAT_ID/TELEGRAM_ADMIN_CHAT_IDS — бот запущен, но не будет принимать кнопки');
  } else {
    console.log(`✅ Telegram bot: разрешённые чаты: ${[...allowedChatIds].join(', ')}`);
  }

  let offset = 0;
  const _fetch = getFetch();

  const loop = async () => {
    await preparePollingSession();
    console.log('✅ Telegram polling started');
    while (true) {
      try {
        const url = getUpdatesUrl({ token, offset: offset ? offset : undefined });
        const r = await _fetch(url);
        const json = await r.json().catch(() => null);
        if (!json?.ok) {
          const desc = json?.description || 'unknown error';
          console.warn('⚠️ Telegram getUpdates failed:', desc);
          await new Promise((res) => setTimeout(res, 3000));
          continue;
        }

        const updates = json.result || [];
        for (const u of updates) {
          offset = Math.max(offset, (u.update_id || 0) + 1);
          if (u.callback_query) {
            await handleCallback({ cq: u.callback_query, allowedChatIds });
          } else if (u.message) {
            await handleMessage({ msg: u.message, allowedChatIds });
          }
        }
      } catch (e) {
        console.warn('⚠️ Telegram bot loop error:', e?.message || e);
        await new Promise((res) => setTimeout(res, 3000));
      }
    }
  };

  loop();
};
