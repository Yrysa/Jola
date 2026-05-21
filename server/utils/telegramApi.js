


import fs from 'fs/promises';
import path from 'path';

const getFetch = () => {
  if (typeof fetch === 'function') return fetch;
  
  return (...args) => import('node-fetch').then(({ default: f }) => f(...args));
};

const tgUrl = (method) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  return `https://api.telegram.org/bot${token}/${method}`;
};

export const tgCall = async (method, payload) => {
  const _fetch = getFetch();

  const r = await _fetch(tgUrl(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });

  const json = await r.json().catch(() => null);
  if (!r.ok || !json?.ok) {
    const desc = json?.description || (await r.text().catch(() => ''));
    throw new Error(`Telegram API error (${method}): ${r.status} ${desc}`);
  }
  return json.result;
};

export const tgSendMessage = (payload) => tgCall('sendMessage', payload);
export const tgEditMessageText = (payload) => tgCall('editMessageText', payload);
export const tgEditMessageReplyMarkup = (payload) => tgCall('editMessageReplyMarkup', payload);
export const tgAnswerCallbackQuery = (payload) => tgCall('answerCallbackQuery', payload);
export const tgDeleteWebhook = (payload = {}) => tgCall('deleteWebhook', payload);
export const tgGetMe = () => tgCall('getMe', {});
export const tgSetMyCommands = (commands) => tgCall('setMyCommands', { commands: Array.isArray(commands) ? commands : [] });
export const tgSetChatMenuButton = (payload) => tgCall('setChatMenuButton', payload);


const ensureGlobals = () => {
  if (typeof FormData !== 'function' || typeof Blob !== 'function') {
    throw new Error('FormData/Blob are not available. Use Node.js 18+ (recommended).');
  }
};

const tgCallMultipart = async (method, form) => {
  ensureGlobals();
  const _fetch = getFetch();
  const r = await _fetch(tgUrl(method), {
    method: 'POST',
    body: form,
  });

  const json = await r.json().catch(() => null);
  if (!r.ok || !json?.ok) {
    const desc = json?.description || (await r.text().catch(() => ''));
    throw new Error(`Telegram API error (${method}): ${r.status} ${desc}`);
  }
  return json.result;
};


export const tgSendDocument = async ({
  chat_id,
  filePath,
  filename,
  mimeType,
  caption,
  parse_mode,
  reply_markup,
  disable_content_type_detection,
}) => {
  if (!chat_id) throw new Error('tgSendDocument: chat_id is required');
  if (!filePath) throw new Error('tgSendDocument: filePath is required');

  const buf = await fs.readFile(filePath);
  const blob = new Blob([buf], { type: mimeType || 'application/octet-stream' });

  const form = new FormData();
  form.append('chat_id', String(chat_id));
  if (caption) form.append('caption', String(caption).slice(0, 1024));
  if (parse_mode) form.append('parse_mode', parse_mode);
  if (reply_markup) form.append('reply_markup', JSON.stringify(reply_markup));
  if (disable_content_type_detection !== undefined) {
    form.append('disable_content_type_detection', disable_content_type_detection ? 'true' : 'false');
  }

  const safeName = filename || path.basename(filePath);
  form.append('document', blob, safeName);

  return tgCallMultipart('sendDocument', form);
};
