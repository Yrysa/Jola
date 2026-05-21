const STORAGE_PREFIX = 'jola_session_activity_v3';

function hasWindow() {
  return typeof window !== 'undefined';
}

function safeRead(key, fallback = null) {
  if (!hasWindow()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  if (!hasWindow()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

function getKey(userId) {
  return `${STORAGE_PREFIX}:${userId || 'guest'}`;
}

function detectBrowser(ua = '') {
  const value = String(ua || '').toLowerCase();
  if (value.includes('edg/')) return 'Microsoft Edge';
  if (value.includes('opr/') || value.includes('opera')) return 'Opera';
  if (value.includes('firefox/')) return 'Firefox';
  if (value.includes('chrome/') || value.includes('crios/')) return 'Chrome';
  if (value.includes('safari/')) return 'Safari';
  return 'Unknown browser';
}

function detectOS(ua, platform = '') {
  if (/windows/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac os x|macintosh/i.test(ua) || /mac/i.test(platform)) return 'macOS';
  if (/linux/i.test(ua) || /linux/i.test(platform)) return 'Linux';
  return 'Unknown OS';
}

function detectDeviceType(ua) {
  if (/ipad|tablet/i.test(ua)) return 'Tablet';
  if (/mobi|android|iphone|ipod/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

export function getClientSnapshot() {
  if (!hasWindow()) return {};

  const ua = navigator.userAgent || '';
  return {
    browser: detectBrowser(ua),
    os: detectOS(ua, navigator.platform || ''),
    deviceType: detectDeviceType(ua),
    language: navigator.language || '—',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '—',
    viewport: `${window.innerWidth || 0}×${window.innerHeight || 0}`,
    title: document.title || 'Jola',
  };
}

export function readSessionActivity(userId) {
  return safeRead(getKey(userId), null);
}

export function writeSessionActivity(userId, nextValue) {
  safeWrite(getKey(userId), nextValue);
}

export function clearSessionActivity(userId) {
  if (!hasWindow()) return;
  try {
    localStorage.removeItem(getKey(userId));
  } catch {
  }
}

export function recordPageVisit(userId, pathname, extra = {}) {
  if (!userId || !hasWindow()) return null;
  const now = Date.now();
  const current = readSessionActivity(userId) || {
    createdAt: now,
    sessionStartedAt: now,
    totalViews: 0,
    visits: [],
    routeStats: {},
  };

  const snapshot = getClientSnapshot();
  const routeStats = { ...(current.routeStats || {}) };
  routeStats[pathname] = (routeStats[pathname] || 0) + 1;

  const visit = {
    path: pathname,
    title: extra.title || snapshot.title || 'Jola',
    at: now,
  };

  const next = {
    ...current,
    firstSeenAt: current.firstSeenAt || now,
    lastSeenAt: now,
    lastPath: pathname,
    entryPath: current.entryPath || pathname,
    sessionStartedAt: current.sessionStartedAt || now,
    totalViews: Number(current.totalViews || 0) + 1,
    snapshot: {
      ...(current.snapshot || {}),
      ...snapshot,
      ...extra.snapshot,
    },
    visits: [...(current.visits || []), visit].slice(-40),
    routeStats,
  };

  writeSessionActivity(userId, next);
  return next;
}

export function recordHeartbeat(userId) {
  if (!userId || !hasWindow()) return null;
  const now = Date.now();
  const current = readSessionActivity(userId);
  if (!current) return null;

  const elapsedMs = Math.max(0, now - Number(current.lastSeenAt || now));
  const next = {
    ...current,
    lastSeenAt: now,
    activeMs: Number(current.activeMs || 0) + Math.min(elapsedMs, 15000),
    snapshot: {
      ...(current.snapshot || {}),
      ...getClientSnapshot(),
    },
  };

  writeSessionActivity(userId, next);
  return next;
}

export function mergeGeoInfo() {
  return null;
}

export async function fetchGeoInfo() {
  return null;
}
