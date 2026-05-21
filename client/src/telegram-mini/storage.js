import { getTelegramWebApp } from './telegram.js';

const prefix = 'jola_tgm_pref:';

const lsGet = (key) => {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(prefix + key) || '';
};
const lsSet = (key, value) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(prefix + key, String(value));
};

const callCloud = (method, ...args) => new Promise((resolve) => {
  const tg = getTelegramWebApp();
  const cloud = tg?.CloudStorage;
  if (!cloud || typeof cloud[method] !== 'function') return resolve(null);
  try {
    if (method === 'getItem') cloud.getItem(args[0], (_err, value) => resolve(value || ''));
    else if (method === 'setItem') cloud.setItem(args[0], args[1], () => resolve(true));
    else if (method === 'removeItem') cloud.removeItem(args[0], () => resolve(true));
    else resolve(null);
  } catch {
    resolve(null);
  }
});

export const miniStorage = {
  async get(key) {
    const cloudValue = await callCloud('getItem', key);
    if (typeof cloudValue === 'string' && cloudValue) return cloudValue;
    return lsGet(key);
  },
  async set(key, value) {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await callCloud('setItem', key, stringValue);
    lsSet(key, stringValue);
  },
  async getJson(key, fallback) {
    const raw = await this.get(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); } catch { return fallback; }
  },
  async setJson(key, value) { await this.set(key, JSON.stringify(value)); },
};
