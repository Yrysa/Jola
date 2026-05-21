const WISHLIST_KEY = 'jola_wishlist_v1';
const EVENT_NAME = 'jola:wishlist-changed';

const safeWindow = () => (typeof window !== 'undefined' ? window : null);

export function readWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY) || '[]';
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function writeWishlist(ids) {
  const normalized = Array.from(new Set((ids || []).filter(Boolean))).slice(0, 100);
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(normalized));
  const win = safeWindow();
  win?.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }));
  return normalized;
}

export function toggleWishlist(id) {
  const current = readWishlist();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
  return writeWishlist(next);
}

export function removeFromWishlist(id) {
  return writeWishlist(readWishlist().filter((item) => item !== id));
}

export function clearWishlist() {
  return writeWishlist([]);
}

export function subscribeWishlist(listener) {
  const win = safeWindow();
  if (!win) return () => {};
  const handler = (event) => listener(Array.isArray(event?.detail) ? event.detail : readWishlist());
  win.addEventListener(EVENT_NAME, handler);
  return () => win.removeEventListener(EVENT_NAME, handler);
}
