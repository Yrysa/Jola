import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const UiSettingsContext = createContext();

const defaultSettings = {
  theme: 'system',
  fontSize: 'medium',
  density: 'comfortable',
  reduceMotion: false,
  highContrast: false,
  showBackgroundFx: true,
  economyEffects: false,
  effectsQuality: 'auto',
  designPreset: 'modern',
  accentTone: 'blue',
  cardStyle: 'glass',
  ghostSession: false,
  avatarCompanion: false,
  weatherMode: false,
  weatherPreset: 'auto',
  lifetimeTimeline: false,
  rebelliousUi: false,
  collectiveGhosts: false,
  musicChameleon: false,
  socialPalette: false,
  interfaceEvolution: false,
  quantumMode: false,
  eyeTracking: false,
  tactileHover: false,
  smartHome: false,
  aiTwin: false,
};

const getStoredSettings = () => {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }

  try {
    const stored = window.localStorage.getItem('uiSettings');
    if (!stored) {
      return defaultSettings;
    }
    const parsed = JSON.parse(stored);
    return { ...defaultSettings, ...parsed };
  } catch (error) {
    return defaultSettings;
  }
};

const detectDeviceProfile = () => {
  if (typeof window === 'undefined') {
    return {
      deviceClass: 'desktop',
      deviceLabel: 'Desktop',
      isTouch: false,
      isCompact: false,
      viewportWidth: 0,
      viewportHeight: 0,
      pixelRatio: 1,
      orientation: 'landscape',
      memoryGb: null,
      cores: null,
    };
  }

  const ua = navigator.userAgent || '';
  const width = window.innerWidth || 0;
  const height = window.innerHeight || 0;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches || false;
  const touch = (navigator.maxTouchPoints || 0) > 0 || coarse;
  const deviceClass = /ipad|tablet/i.test(ua) || (touch && width >= 768 && width <= 1180)
    ? 'tablet'
    : /mobi|android|iphone|ipod/i.test(ua) || width < 768
      ? 'mobile'
      : 'desktop';

  let deviceLabel = 'Desktop';
  if (/iphone/i.test(ua)) deviceLabel = 'iPhone';
  else if (/ipad/i.test(ua)) deviceLabel = 'iPad';
  else if (/samsung|sm-/i.test(ua)) deviceLabel = 'Samsung device';
  else if (/xiaomi|redmi|mi\s/i.test(ua)) deviceLabel = 'Xiaomi device';
  else if (/huawei/i.test(ua)) deviceLabel = 'Huawei device';
  else if (/android/i.test(ua)) deviceLabel = 'Android phone';
  else if (deviceClass === 'tablet') deviceLabel = 'Tablet';

  return {
    deviceClass,
    deviceLabel,
    isTouch: touch,
    isCompact: deviceClass !== 'desktop' || width < 900,
    viewportWidth: width,
    viewportHeight: height,
    pixelRatio: window.devicePixelRatio || 1,
    orientation: width > height ? 'landscape' : 'portrait',
    memoryGb: navigator.deviceMemory || null,
    cores: navigator.hardwareConcurrency || null,
  };
};

const resolveTheme = (theme) => {
  if (theme !== 'system') {
    return theme;
  }
  if (typeof window === 'undefined') {
    return 'dark';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const UiSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(getStoredSettings);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(settings.theme));
  const [deviceProfile, setDeviceProfile] = useState(() => detectDeviceProfile());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem('uiSettings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      };
      handleChange();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    setResolvedTheme(settings.theme);
    return undefined;
  }, [settings.theme]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateProfile = () => setDeviceProfile(detectDeviceProfile());
    updateProfile();
    window.addEventListener('resize', updateProfile);
    window.addEventListener('orientationchange', updateProfile);
    return () => {
      window.removeEventListener('resize', updateProfile);
      window.removeEventListener('orientationchange', updateProfile);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.fontSize = settings.fontSize;
    root.dataset.density = settings.density;
    root.dataset.motion = settings.reduceMotion ? 'reduced' : 'full';
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
    root.dataset.effects = settings.showBackgroundFx ? 'on' : 'off';
    root.dataset.effectsEconomy = settings.economyEffects ? 'on' : 'off';
    root.dataset.effectsQuality = settings.effectsQuality || (settings.showBackgroundFx ? (settings.economyEffects ? 'economy' : 'full') : 'off');
    root.dataset.design = settings.designPreset;
    root.dataset.accent = settings.accentTone;
    root.dataset.cardStyle = settings.cardStyle;
    root.dataset.ghost = settings.ghostSession ? 'on' : 'off';
    root.dataset.weather = settings.weatherMode ? 'dynamic' : 'off';
    root.dataset.weatherPreset = settings.weatherPreset;
    root.dataset.tactile = settings.tactileHover ? 'on' : 'off';
    root.dataset.evolution = settings.interfaceEvolution ? 'on' : 'off';
    root.dataset.quantum = settings.quantumMode ? 'on' : 'off';
    root.dataset.rebellious = settings.rebelliousUi ? 'on' : 'off';
    root.dataset.avatarCompanion = settings.avatarCompanion ? 'on' : 'off';
    root.dataset.eyeTracking = settings.eyeTracking ? 'armed' : 'off';
    root.dataset.aiTwin = settings.aiTwin ? 'armed' : 'off';
    root.dataset.collectiveGhosts = settings.collectiveGhosts ? 'armed' : 'off';
    root.dataset.musicChameleon = settings.musicChameleon ? 'armed' : 'off';
    root.dataset.socialPalette = settings.socialPalette ? 'armed' : 'off';
    root.dataset.smartHome = settings.smartHome ? 'armed' : 'off';
    root.dataset.deviceClass = deviceProfile.deviceClass;
    root.dataset.deviceTouch = deviceProfile.isTouch ? 'on' : 'off';
    root.dataset.deviceCompact = deviceProfile.isCompact ? 'on' : 'off';
    root.dataset.orientation = deviceProfile.orientation;
    root.style.setProperty('--device-vw', `${deviceProfile.viewportWidth || 0}px`);
    root.style.setProperty('--device-vh', `${deviceProfile.viewportHeight || 0}px`);
  }, [deviceProfile, resolvedTheme, settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    updateSetting('theme', nextTheme);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  const value = useMemo(
    () => ({
      settings,
      resolvedTheme,
      deviceProfile,
      updateSetting,
      toggleTheme,
      resetSettings,
    }),
    [deviceProfile, settings, resolvedTheme]
  );

  return (
    <UiSettingsContext.Provider value={value}>
      {children}
    </UiSettingsContext.Provider>
  );
};

export const useUiSettings = () => {
  const context = useContext(UiSettingsContext);
  if (!context) {
    throw new Error('useUiSettings must be used within UiSettingsProvider');
  }
  return context;
};
