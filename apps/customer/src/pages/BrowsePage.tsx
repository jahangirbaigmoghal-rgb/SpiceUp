import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useMenu } from '../hooks/useMenu';
import { useDeliveryZone } from '../hooks/useDeliveryZone';
import { useCart } from '../lib/cart-context';
import { HeroBanner } from '../components/menu/HeroBanner';
import { CategorySidebar, CategoryPills } from '../components/menu/CategoryNav';
import { SubCategoryTabs } from '../components/menu/SubCategoryTabs';
import { ProductGrid } from '../components/menu/ProductGrid';
import { ItemCustomizer } from '../components/menu/ItemCustomizer';
import { CartSidebar } from '../components/cart/CartSidebar';
import type {
  MenuItem,
  ModifierGroup,
  ModifierOption,
  Label,
} from '../types';

export function BrowsePage() {
  const { settings } = useSettings();
  const { categories, menuItems, labels } = useMenu();
  const { addItem, setOrderType, orderType } = useCart();

  // selected categories
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(
    null
  );

  // pick first parent category on load
  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      const parent = categories.find((c) => !c.parent);
      if (parent) setSelectedCategory(parent._id);
    }
  }, [categories, selectedCategory]);

  // reset sub when parent changes
  useEffect(() => {
    if (!selectedCategory) return;
    const subs = categories.filter((c) => {
      const pid = typeof c.parent === 'string' ? c.parent : c.parent?._id;
      return pid === selectedCategory;
    });
    setSelectedSubCategory(subs.length > 0 ? subs[0]._id : null);
  }, [selectedCategory, categories]);

  // postcode checker
  const delivery = useDeliveryZone({
    baseDeliveryFee: settings.deliveryFeePence ?? 250,
  });

  // sync order type when postcode validated
  useEffect(() => {
    if (delivery.status.valid) setOrderType('delivery');
  }, [delivery.status.valid, setOrderType]);

  // ─── Customizer modal state ──────────────────────────
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [selectedMods, setSelectedMods] = useState<
    Record<string, Array<{ optionId: string; optionName: string; pricePence: number }>>
  >({});

  const handleItemClick = useCallback((item: MenuItem) => {
    if (item.modifierGroups?.length > 0) {
      setActiveItem(item);
      const init: Record<string, any> = {};
      item.modifierGroups.forEach((g: any) => {
        if (typeof g !== 'string') init[g._id] = [];
      });
      setSelectedMods(init);
    } else {
      addItem(item, []);
    }
  }, [addItem]);

  const handleToggleOption = useCallback(
    (group: ModifierGroup, option: ModifierOption) => {
      setSelectedMods((prev) => {
        const current = prev[group._id] || [];
        const exists = current.some((o) => o.optionId === option._id);
        let next = [...current];
        if (exists) {
          next = next.filter((o) => o.optionId !== option._id);
        } else {
          const entry = {
            optionId: option._id,
            optionName: option.name,
            pricePence: option.pricePence,
          };
          if (group.maxSelection === 1) next = [entry];
          else if (next.length < group.maxSelection) next.push(entry);
        }
        return { ...prev, [group._id]: next };
      });
    },
    []
  );

  const handleApplyLabel = useCallback(
    (
      group: ModifierGroup,
      option: ModifierOption,
      label: Label | null
    ) => {
      setSelectedMods((prev) => {
        const current = prev[group._id] || [];
        const idx = current.findIndex((o) => o.optionId === option._id);
        if (idx === -1) return prev;
        const updated = [...current];
        const prefix = label ? `${label.name} ` : '';
        const price = label?.name === 'NO' ? 0 : option.pricePence;
        updated[idx] = {
          ...updated[idx],
          optionName: `${prefix}${option.name}`,
          pricePence: price,
        };
        return { ...prev, [group._id]: updated };
      });
    },
    []
  );

  const handleSaveMods = useCallback(() => {
    if (!activeItem) return;
    const flat = activeItem.modifierGroups.flatMap((g: any) => {
      if (typeof g === 'string') return [];
      return (selectedMods[g._id] || []).map((sel) => ({
        groupId: g._id,
        groupName: g.name,
        optionId: sel.optionId,
        optionName: sel.optionName,
        pricePence: sel.pricePence,
      }));
    });
    addItem(activeItem, flat);
    setActiveItem(null);
  }, [activeItem, selectedMods, addItem]);

  // ─── Derived data ────────────────────────────────────
  const parentCategories = useMemo(
    () => categories.filter((c) => !c.parent),
    [categories]
  );

  const subCategories = useMemo(
    () =>
      categories.filter((c) => {
        const pid = typeof c.parent === 'string' ? c.parent : c.parent?._id;
        return pid === selectedCategory;
      }),
    [categories, selectedCategory]
  );

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const catId =
        typeof item.category === 'string'
          ? item.category
          : (item.category as any)?._id;
      if (subCategories.length > 0) return catId === selectedSubCategory;
      return catId === selectedCategory;
    });
  }, [menuItems, subCategories, selectedSubCategory, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 flex flex-col gap-6">
      {/* Hero */}
      <HeroBanner
        settings={settings}
        postcode={delivery.postcode}
        setPostcode={delivery.setPostcode}
        postcodeStatus={delivery.status}
        postcodeError={delivery.error}
        checking={delivery.checking}
        onCheckPostcode={(e) => {
          e.preventDefault();
          delivery.check();
        }}
      />

      {/* Mobile category pills */}
      <CategoryPills
        categories={parentCategories}
        selectedId={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Desktop sidebar */}
        <CategorySidebar
          categories={parentCategories}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
        />

        {/* Main content */}
        <div className="flex-1 space-y-5 w-full min-w-0">
          {subCategories.length > 0 && (
            <SubCategoryTabs
              subCategories={subCategories}
              selectedId={selectedSubCategory}
              onSelect={setSelectedSubCategory}
            />
          )}

          <ProductGrid items={filteredItems} onAdd={handleItemClick} />
        </div>

        {/* Cart */}
        <CartSidebar orderType={orderType} />
      </div>

      {/* Modifier modal */}
      <ItemCustomizer
        item={activeItem}
        labels={labels}
        selectedMods={selectedMods}
        onClose={() => setActiveItem(null)}
        onToggleOption={handleToggleOption}
        onApplyLabel={handleApplyLabel}
        onSave={handleSaveMods}
      />
    </div>
  );
}
