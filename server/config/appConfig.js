

export const APP_CURRENCY = (process.env.APP_CURRENCY || 'kzt').toLowerCase();

export const TAX_RATE = (() => {
  const v = Number(process.env.TAX_RATE);
  return Number.isFinite(v) && v >= 0 ? v : 0.08;
})();

export const FREE_SHIPPING_THRESHOLD = (() => {
  const v = Number(process.env.FREE_SHIPPING_THRESHOLD);
  return Number.isFinite(v) && v >= 0 ? v : 5000;
})();

export const SHIPPING_FEE = (() => {
  const v = Number(process.env.SHIPPING_FEE);
  return Number.isFinite(v) && v >= 0 ? v : 300;
})();

export const TEMP_UPLOAD_TTL_HOURS = (() => {
  const v = Number(process.env.TEMP_UPLOAD_TTL_HOURS);
  return Number.isFinite(v) && v > 0 ? v : 48;
})();
