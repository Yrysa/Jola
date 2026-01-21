import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const UiSettingsContext = createContext();

const defaultSettings = {
  theme: 'system',
  fontSize: 'medium',
  density: 'comfortable',
  reduceMotion: false,
  highContrast: false,
  showBackgroundFx: true,
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
  }, [resolvedTheme, settings]);

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
      updateSetting,
      toggleTheme,
      resetSettings,
    }),
    [settings, resolvedTheme]
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
