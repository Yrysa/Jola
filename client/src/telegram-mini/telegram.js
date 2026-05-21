const noop = () => {};

export const getTelegramWebApp = () => (typeof window !== 'undefined' ? window.Telegram?.WebApp || null : null);

export const isTelegramEnvironment = () => Boolean(getTelegramWebApp()?.initDataUnsafe?.user || getTelegramWebApp()?.initData);

export const supportsVersion = (featureVersion) => {
  const tg = getTelegramWebApp();
  if (!tg?.isVersionAtLeast) return false;
  try {
    return tg.isVersionAtLeast(featureVersion);
  } catch {
    return false;
  }
};

export const initTelegramChrome = ({ headerColor = 'bg_color', backgroundColor = 'bg_color' } = {}) => {
  const tg = getTelegramWebApp();
  if (!tg) return { tg: null, features: {} };
  try { tg.ready(); } catch {}
  try { tg.expand(); } catch {}
  try { tg.setHeaderColor?.(headerColor); } catch {}
  try { tg.setBackgroundColor?.(backgroundColor); } catch {}

  const features = {
    cloudStorage: Boolean(tg.CloudStorage),
    haptics: Boolean(tg.HapticFeedback),
    closingConfirmation: typeof tg.enableClosingConfirmation === 'function',
    biometry: Boolean(tg.BiometricManager),
    mainButton: Boolean(tg.MainButton),
    backButton: Boolean(tg.BackButton),
    openLink: typeof tg.openLink === 'function',
    openTelegramLink: typeof tg.openTelegramLink === 'function',
    invoice: typeof tg.openInvoice === 'function',
    settingsButton: Boolean(tg.SettingsButton),
  };
  return { tg, features };
};

export const onTelegramEvent = (eventName, handler) => {
  const tg = getTelegramWebApp();
  if (!tg?.onEvent) return noop;
  tg.onEvent(eventName, handler);
  return () => {
    try { tg.offEvent?.(eventName, handler); } catch {}
  };
};

export const setViewportCssVars = () => {
  const tg = getTelegramWebApp();
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const height = tg?.viewportStableHeight || tg?.viewportHeight || window.innerHeight || 0;
  root.style.setProperty('--tgm-vh', `${height}px`);
  const safeBottom = Number(tg?.safeAreaInset?.bottom || tg?.contentSafeAreaInset?.bottom || 0);
  root.style.setProperty('--tgm-safe-bottom', `${safeBottom}px`);
};

export const haptic = (type = 'impact', value = 'medium') => {
  const tg = getTelegramWebApp();
  try {
    if (!tg?.HapticFeedback) return;
    if (type === 'selection') tg.HapticFeedback.selectionChanged();
    else if (type === 'notification') tg.HapticFeedback.notificationOccurred(value);
    else tg.HapticFeedback.impactOccurred(value);
  } catch {}
};

export const useTelegramMainButton = ({ visible, text, onClick, isProgressVisible = false, color, textColor } = {}) => {
  const tg = getTelegramWebApp();
  const btn = tg?.MainButton;
  if (!btn) return noop;
  try {
    btn.setParams({ text: text || 'Продолжить', is_visible: Boolean(visible), is_progress_visible: Boolean(isProgressVisible), color, text_color: textColor });
    if (visible) btn.show(); else btn.hide();
    if (onClick) {
      btn.offClick?.(onClick);
      btn.onClick?.(onClick);
      return () => { try { btn.offClick?.(onClick); } catch {} };
    }
  } catch {}
  return noop;
};

export const configureClosingConfirmation = (enabled) => {
  const tg = getTelegramWebApp();
  if (!tg) return;
  try {
    if (enabled) tg.enableClosingConfirmation?.();
    else tg.disableClosingConfirmation?.();
  } catch {}
};

export const configureBackButton = ({ visible, onClick }) => {
  const tg = getTelegramWebApp();
  const btn = tg?.BackButton;
  if (!btn) return noop;
  try {
    if (visible) btn.show();
    else btn.hide();
    if (onClick) {
      btn.offClick?.(onClick);
      btn.onClick?.(onClick);
      return () => { try { btn.offClick?.(onClick); } catch {} };
    }
  } catch {}
  return noop;
};

export const openExternalLink = (url) => {
  const tg = getTelegramWebApp();
  try {
    if (url?.startsWith('https://t.me/') || url?.startsWith('tg://')) {
      tg?.openTelegramLink?.(url);
      return;
    }
    tg?.openLink?.(url, { try_instant_view: false });
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
