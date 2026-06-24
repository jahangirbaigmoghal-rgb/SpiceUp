import { useEffect, useState } from 'react';
import { settingsApi } from '@spiceup/api-client';
import { applyDynamicTheme } from '../lib/theme';
import { DEFAULT_SETTINGS } from '../lib/defaults';
import type { StoreSettings } from '../types';

export function useSettings() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await settingsApi.getPublic();
        const s = res.data?.settings;
        if (mounted && s) {
          const merged = { ...DEFAULT_SETTINGS, ...s } as StoreSettings;
          setSettings(merged);
          if (s.pwaThemeColor) applyDynamicTheme(s.pwaThemeColor);
        }
      } catch (err) {
        console.warn('Failed to load public settings, using defaults.', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { settings, loading };
}
