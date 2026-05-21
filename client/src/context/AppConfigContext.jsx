import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { configService } from '../services/configService.js';

const AppConfigContext = createContext(null);

const DEFAULTS = {
  currency: 'kzt',
  taxRate: 0.08,
  freeShippingThreshold: 5000,
  shippingFee: 300,
};

export function AppConfigProvider({ children }) {
  const [config, setConfig] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await configService.getConfig();
        if (!alive) return;
        setConfig({ ...DEFAULTS, ...(data || {}) });
      } catch (_e) {
        
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(() => ({ ...config, loaded }), [config, loaded]);

  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig() {
  const ctx = useContext(AppConfigContext);
  if (!ctx) {
    return { ...DEFAULTS, loaded: false };
  }
  return ctx;
}
