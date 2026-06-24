import { useEffect, useState } from 'react';
import { menuApi } from '@spiceup/api-client';
import {
  DEFAULT_LABELS,
  FALLBACK_CATEGORIES,
  FALLBACK_ITEMS,
} from '../lib/defaults';
import type { Category, MenuItem, Label } from '../types';

export function useMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [labels, setLabels] = useState<Label[]>(DEFAULT_LABELS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const catRes = await menuApi.categories();
        const cats: Category[] = catRes.data.categories || [];
        const itemRes = await menuApi.items();
        const items: MenuItem[] = itemRes.data.items || [];

        if (!mounted) return;
        setCategories(cats);
        setMenuItems(items);

        try {
          const labelRes = await (menuApi as any).labels();
          if (labelRes.data?.labels?.length > 0) {
            setLabels(labelRes.data.labels);
          }
        } catch {
          /* keep defaults */
        }
      } catch (err) {
        console.warn('Menu API failed, using fallback menu.', err);
        if (mounted) {
          setCategories(FALLBACK_CATEGORIES);
          setMenuItems(FALLBACK_ITEMS);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { categories, menuItems, labels, loading };
}
