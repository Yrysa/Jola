


import nodemailer from 'nodemailer';
import { tgSendMessage, tgSendDocument } from './telegramApi.js';
import { resolveUploadAbsolutePath } from './orderLifecycle.js';
import { buildOrderKeyboard, formatOrderText, formatUserOrderText } from './telegramBot.js';
import { buildTelegramMiniAppUrl } from './telegramAccess.js';
import User from '../models/User.js';
import UploadFile from '../modules/polygraphy/models/UploadFile.js';
import fs from 'fs/promises';

const safe = (v) => (v == null ? '' : String(v));

const parseAdminChatIds = () => {
  const raw = (process.env.TELEGRAM_ALLOWED_CHAT_IDS || process.env.TELEGRAM_ADMIN_CHAT_IDS || process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
};

const sendTelegramToAdmins = async ({ order, includeFiles = false }) => {
  const chatIds = parseAdminChatIds();
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatIds.length) return;

  const user = order?.user ? await User.findById(order.user).select('name email phone telegramUsername').lean() : null;
  const text = formatOrderText({ order, user });

  await Promise.allSettled(
    chatIds.map((chat_id) =>
      tgSendMessage({
        chat_id,
        text,
        reply_markup: buildOrderKeyboard(String(order._id), order.status),
      })
    )
  );

  
  if (includeFiles) {
    await Promise.allSettled(chatIds.map((chat_id) => sendOrderFilesToAdminChat({ order, chat_id })));
  }
};

const bytesToMb = (b) => Math.round((b / (1024 * 1024)) * 10) / 10;


const TG_MAX_UPLOAD_BYTES = Number(process.env.TG_MAX_UPLOAD_BYTES || 49 * 1024 * 1024);


const collectOrderUploadFileIds = (order) => {
  const ids = new Set();
  const items = Array.isArray(order?.serviceItems) ? order.serviceItems : [];
  for (const it of items) {
    const files = Array.isArray(it?.files) ? it.files : [];
    for (const f of files) {
      if (f?.fileId) ids.add(String(f.fileId));
    }
  }
  return [...ids];
};

const sendOrderFilesToAdminChat = async ({ order, chat_id }) => {
  try {
    const fileIds = collectOrderUploadFileIds(order);
    if (!fileIds.length) return;

    const orderShort = safe(order?._id).slice(-6);

    
    const files = await UploadFile.find({ _id: { $in: fileIds }, order: order._id, scope: 'order' })
      .select('originalName mimeType size relPath pages')
      .lean();

    
    files.sort((a, b) => String(a._id).localeCompare(String(b._id)));

    for (const f of files) {
      const absPath = (() => {
        try {
          return resolveUploadAbsolutePath(f);
        } catch {
          return null;
        }
      })();

      
      const st = absPath ? await fs.stat(absPath).catch(() => null) : null;
      if (!st?.isFile()) {
        await tgSendMessage({
          chat_id,
          text: `⚠️ Не найден файл для заказа #${orderShort}: ${safe(f.originalName)}`,
        });
        continue;
      }

      
      if ((f.size || st.size) > TG_MAX_UPLOAD_BYTES) {
        await tgSendMessage({
          chat_id,
          text: `📎 Файл слишком большой для Telegram (≈${bytesToMb(f.size || st.size)}МБ): ${safe(
            f.originalName
          )}\nЗаказ #${orderShort} — скачай в админке.`,
        });
        continue;
      }

      const captionParts = [`📎 Заказ #${orderShort}`];
      if (f.pages) captionParts.push(`стр.: ${f.pages}`);
      captionParts.push(safe(f.originalName));

      await tgSendDocument({
        chat_id,
        filePath: absPath,
        filename: f.originalName,
        mimeType: f.mimeType,
        caption: captionParts.join(' • '),
      });
    }
  } catch (e) {
    
    await tgSendMessage({
      chat_id,
      text: `⚠️ Не удалось отправить файлы заказа в Telegram: ${safe(e?.message || e)}`,
    }).catch(() => {});
  }
};

const sendTelegramToUser = async ({ order }) => {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  const user = order?.user ? await User.findById(order.user).select('+telegramChatId +telegramAuthTokenHash +telegramAuthTokenExpire') : null;
  if (!user?.telegramChatId) return;
  const appUrl = await buildTelegramMiniAppUrl(user, { orderId: String(order?._id || '') });
  await tgSendMessage({
    chat_id: user.telegramChatId,
    text: formatUserOrderText({ order }),
    reply_markup: appUrl ? { inline_keyboard: [[{ text: 'Приложение tg Jola', web_app: { url: appUrl } }]] } : undefined,
  });
};

let mailer = null;
const getMailer = () => {
  if (mailer) return mailer;
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port || !user || !pass) return null;

  mailer = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });
  return mailer;
};

const sendEmail = async ({ subject, text }) => {
  const transport = getMailer();
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.NOTIFY_EMAIL_FROM || process.env.SMTP_USER;
  if (!transport || !to || !from) return;

  await transport.sendMail({
    from,
    to,
    subject,
    text,
  });
};

export const notifyNewOrder = async ({ order }) => {
  const text = formatOrderText({ order });

  
  await Promise.allSettled([
    sendTelegramToAdmins({ order, includeFiles: true }),
    sendTelegramToUser({ order }),
    sendEmail({ subject: `Новый заказ #${safe(order?._id).slice(-6)}`, text }),
  ]);
};

export const notifyOrderUpdated = async ({ order, message }) => {
  
  await sendTelegramToAdmins({ order, includeFiles: false });

  
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  const user = order?.user ? await User.findById(order.user).select('telegramChatId').lean() : null;
  if (!user?.telegramChatId) return;
  await tgSendMessage({
    chat_id: user.telegramChatId,
    text: message || `📦 Обновление по заказу #${safe(order?._id).slice(-6)}`,
  });
};
