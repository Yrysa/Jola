import { getTelegramMiniSettings } from './settings.js';

export const DEFAULT_TELEGRAM_MINI_FIELD_POLICY = {
  client: {
    profile: ['id', 'name', 'phone', 'role', 'registeredAt', 'telegramUsername'],
    wallet: ['balance', 'bonuses', 'discount', 'loyaltyLevel'],
    product: ['id', 'name', 'price', 'oldPrice', 'stock', 'category', 'availability', 'photo', 'gallery', 'discountPercent', 'isFavorite'],
    order: ['id', 'number', 'user', 'amount', 'status', 'date', 'paymentMethod', 'deliveryMethod', 'isPaid', 'timeline', 'itemsPreview', 'promo', 'deliveryWindow'],
    notification: ['id', 'type', 'title', 'body', 'createdAt', 'severity', 'entityType', 'entityId', 'group'],
    promo: ['id', 'code', 'title', 'description', 'type', 'value', 'minOrderAmount', 'expiresAt', 'previewDiscount', 'validNow', 'scope'],
    support: ['phone', 'telegram', 'email', 'workingHours', 'faq'],
    dashboard: ['summary', 'banners', 'collections', 'sync', 'permissions'],
    settings: ['blocks', 'featureFlags', 'theme', 'editableProfileFields', 'banners', 'collections', 'support'],
  },
  observer: {
    profile: ['id', 'name', 'phone', 'role', 'registeredAt', 'telegramUsername'],
    wallet: ['balance', 'bonuses', 'discount', 'loyaltyLevel'],
    product: ['id', 'name', 'price', 'oldPrice', 'stock', 'category', 'availability', 'photo', 'gallery', 'discountPercent', 'isFavorite'],
    order: ['id', 'number', 'user', 'amount', 'status', 'date', 'paymentMethod', 'deliveryMethod', 'isPaid', 'timeline', 'itemsPreview', 'promo', 'deliveryWindow'],
    notification: ['id', 'type', 'title', 'body', 'createdAt', 'severity', 'entityType', 'entityId', 'group'],
    promo: ['id', 'code', 'title', 'description', 'type', 'value', 'minOrderAmount', 'expiresAt', 'previewDiscount', 'validNow', 'scope'],
    support: ['phone', 'telegram', 'email', 'workingHours', 'faq'],
    dashboard: ['summary', 'banners', 'collections', 'sync', 'permissions'],
    settings: ['blocks', 'featureFlags', 'theme', 'editableProfileFields', 'banners', 'collections', 'support'],
  },
  manager: {
    profile: ['id', 'name', 'phone', 'role', 'registeredAt', 'telegramUsername'],
    wallet: ['balance', 'bonuses', 'discount', 'loyaltyLevel'],
    product: ['id', 'name', 'price', 'oldPrice', 'stock', 'category', 'availability', 'photo', 'gallery', 'discountPercent', 'isFavorite'],
    order: ['id', 'number', 'user', 'amount', 'status', 'date', 'paymentMethod', 'deliveryMethod', 'isPaid', 'timeline', 'itemsPreview', 'promo', 'deliveryWindow'],
    notification: ['id', 'type', 'title', 'body', 'createdAt', 'severity', 'entityType', 'entityId', 'group'],
    promo: ['id', 'code', 'title', 'description', 'type', 'value', 'minOrderAmount', 'expiresAt', 'previewDiscount', 'validNow', 'scope'],
    support: ['phone', 'telegram', 'email', 'workingHours', 'faq'],
    dashboard: ['summary', 'banners', 'collections', 'sync', 'permissions'],
    settings: ['blocks', 'featureFlags', 'theme', 'editableProfileFields', 'banners', 'collections', 'support'],
  },
  admin: {
    profile: ['id', 'name', 'phone', 'role', 'registeredAt', 'telegramUsername'],
    wallet: ['balance', 'bonuses', 'discount', 'loyaltyLevel'],
    product: ['id', 'name', 'price', 'oldPrice', 'stock', 'category', 'availability', 'photo', 'gallery', 'discountPercent', 'isFavorite'],
    order: ['id', 'number', 'user', 'amount', 'status', 'date', 'paymentMethod', 'deliveryMethod', 'isPaid', 'timeline', 'itemsPreview', 'promo', 'deliveryWindow'],
    notification: ['id', 'type', 'title', 'body', 'createdAt', 'severity', 'entityType', 'entityId', 'group'],
    promo: ['id', 'code', 'title', 'description', 'type', 'value', 'minOrderAmount', 'expiresAt', 'previewDiscount', 'validNow', 'scope'],
    support: ['phone', 'telegram', 'email', 'workingHours', 'faq'],
    dashboard: ['summary', 'banners', 'collections', 'sync', 'permissions'],
    settings: ['blocks', 'featureFlags', 'theme', 'editableProfileFields', 'banners', 'collections', 'support'],
  },
};

export const normalizeTelegramRole = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'user' || raw === 'client') return 'client';
  if (raw === 'manager') return 'manager';
  if (raw === 'observer') return 'observer';
  if (raw === 'admin') return 'admin';
  return 'client';
};

const getRequestedFields = (requested = '') => String(requested || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

export const resolveAllowedFields = async (resource, role, requested = '') => {
  const normalizedRole = normalizeTelegramRole(role);
  const settings = await getTelegramMiniSettings();
  const rolePolicy = settings?.allowedFieldsByRole?.[normalizedRole] || {};
  const defaults = DEFAULT_TELEGRAM_MINI_FIELD_POLICY[normalizedRole]?.[resource]
    || DEFAULT_TELEGRAM_MINI_FIELD_POLICY.client?.[resource]
    || [];
  const allowed = Array.isArray(rolePolicy?.[resource]) && rolePolicy[resource].length
    ? rolePolicy[resource]
    : defaults;

  const requestedFields = getRequestedFields(requested);
  return requestedFields.length
    ? requestedFields.filter((key) => allowed.includes(key))
    : allowed;
};

export const pickAllowedFields = async (resource, role, payload, requested = '') => {
  const finalKeys = await resolveAllowedFields(resource, role, requested);
  return finalKeys.reduce((acc, key) => {
    if (payload[key] !== undefined) acc[key] = payload[key];
    return acc;
  }, {});
};
