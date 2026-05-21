


import validator from 'validator';

const SKIP_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'resetToken',
  'stripeSignature',
]);

const sanitize = (value, keyHint = '') => {
  if (value == null) return value;

  if (keyHint && SKIP_KEYS.has(String(keyHint))) return value;

  if (typeof value === 'string') {
    
    const s = value.length > 100000 ? value.slice(0, 100000) : value;
    return validator.escape(s);
  }

  if (Array.isArray(value)) return value.map((v) => sanitize(v, keyHint));

  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      value[key] = sanitize(value[key], key);
    }
    return value;
  }

  return value;
};

export const xssSanitizer = () => (req, _res, next) => {
  try {
    
    if (req.originalUrl?.includes('/api/payments/stripe/webhook')) return next();

    if (req.body) sanitize(req.body);
    if (req.query) sanitize(req.query);
    if (req.params) sanitize(req.params);

    return next();
  } catch (_e) {
    
    return next();
  }
};
