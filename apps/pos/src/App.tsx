import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  User, 
  Wifi, 
  WifiOff, 
  Trash2, 
  CreditCard, 
  Coins, 
  Plus, 
  Minus, 
  Check, 
  AlertCircle, 
  Lock, 
  LogOut, 
  PhoneCall, 
  QrCode
} from 'lucide-react';
import { 
  gbp, 
  computeVatBreakdown, 
  isValidUKPostcode, 
  generateIdempotencyKey 
} from '@takeaway-pos/utils';
import { authApi, menuApi, ordersApi, deliveryApi } from '@takeaway-pos/api-client';

interface ModifierOption {
  _id: string;
  name: string;
  pricePence: number;
  isAvailable?: boolean;
}

interface ModifierGroup {
  _id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  options: ModifierOption[];
  staticLabelsEnabled?: boolean;
  allowedLabelIds?: Array<string | { _id: string }>;
}

interface Label {
  _id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
}

interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  pricePence: number;
  vatRate: 0 | 5 | 20;
  category: string;
  isAvailable: boolean;
  modifierGroups: (string | ModifierGroup)[];
  variations?: Array<{
    _id: string;
    name: string;
    priceDeltaPence: number;
    sku: string;
    isDefault?: boolean;
    isActive?: boolean;
  }>;
}

interface Category {
  _id: string;
  name: string;
  displayOrder: number;
}

interface CartItem {
  id: string; // unique cart instance id
  item?: MenuItem;
  quantity: number;
  selectedModifiers?: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    pricePence: number;
  }>;
  notes?: string;
  variation?: {
    variationId: string;
    name: string;
    priceDeltaPence: number;
    sku: string;
  };
  
  // Bundle fields
  isBundle?: boolean;
  bundleId?: string;
  bundleName?: string;
  bundlePricePence?: number;
  bundleItems?: Array<{
    menuItem: string;
    menuItemSnapshot: {
      name: string;
      basePricePence: number;
      vatRate: number;
    };
    variation?: {
      variationId: string;
      name: string;
      priceDeltaPence: number;
      sku: string;
    };
    modifiers: Array<{
      groupId: string;
      groupName: string;
      optionId: string;
      optionName: string;
      pricePence: number;
    }>;
    itemNote?: string;
    slotLabel: string;
  }>;
}

export default function App() {
  // Authentication & Session State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  const [terminalId] = useState('TERM-01');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Shift details
  const [currentShift, setCurrentShift] = useState<{ _id: string; floatPence: number } | null>(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [shiftFloat, setShiftFloat] = useState('100.00');

  // Menu Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway' | 'delivery'>('takeaway');
  
  // Customer details for Phone/Delivery Orders
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryPostcode, setDeliveryPostcode] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isPostcodeValid, setIsPostcodeValid] = useState<boolean | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [selectedMods, setSelectedMods] = useState<Record<string, Array<{ optionId: string; optionName: string; pricePence: number }>>>({});

  // Variations & Sequential wizard states
  const [selectedVariation, setSelectedVariation] = useState<any>(null);
  const [activeWizardTab, setActiveWizardTab] = useState(0);

  // Bundles / Meal Deals states
  const [bundles, setBundles] = useState<any[]>([]);
  const [activeBundle, setActiveBundle] = useState<any | null>(null);
  const [bundleSelections, setBundleSelections] = useState<Record<string, any>>({});
  const [onCustomizeComplete, setOnCustomizeComplete] = useState<any>(null);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);

  // Checkout & Payment Loading State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'link'>('cash');

  // Sync online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check existing session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await authApi.me();
        if (res.data && res.data.user) {
          setUser(res.data.user);
          setIsAuthenticated(true);
          fetchShiftStatus();
          fetchMenuData();
        }
      } catch (err) {
        // Not authenticated, stay on lockscreen
      }
    };
    checkSession();
  }, []);

  const fetchShiftStatus = async () => {
    try {
      const res = await authApi.currentShift();
      if (res.data && res.data.shift) {
        setCurrentShift(res.data.shift);
      } else {
        setShowOpenShiftModal(true);
      }
    } catch (err) {
      console.error("Shift error", err);
    }
  };

  const fetchMenuData = async () => {
    try {
      const catRes = await menuApi.categories();
      setCategories(catRes.data.categories || []);
      if (catRes.data.categories?.length > 0) {
        setSelectedCategory(catRes.data.categories[0]._id);
      }
      const itemRes = await menuApi.items();
      setMenuItems(itemRes.data.items || []);

      const lblRes = await (menuApi as any).labels();
      setLabels(lblRes.data.labels || []);

      const bundleRes = await (menuApi as any).bundles();
      setBundles(bundleRes.data.bundles || []);
    } catch (err) {
      console.error("Menu fetch error", err);
    }
  };

  // Lockscreen PIN Handler
  const handlePinInput = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handlePinDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length < 4) return;
    setErrorMsg('');
    try {
      const res = await authApi.loginPin({ pin, terminalId });
      setUser(res.data.user);
      setIsAuthenticated(true);
      setPin('');
      fetchShiftStatus();
      fetchMenuData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid PIN');
      setPin('');
    }
  };

  // Open Shift
  const handleOpenShift = async () => {
    try {
      const floatPence = Math.round(parseFloat(shiftFloat) * 100);
      const res = await authApi.openShift({ floatPence, terminalId });
      setCurrentShift(res.data.shift);
      setShowOpenShiftModal(false);
      setSuccessMsg('Shift opened successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to open shift');
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      setIsAuthenticated(false);
      setCart([]);
    } catch (err) {
      setIsAuthenticated(false);
    }
  };

  // Postcode Validation
  const handlePostcodeChange = async (val: string) => {
    setDeliveryPostcode(val);
    const cleaned = val.replace(/\s+/g, '').toUpperCase();
    if (isValidUKPostcode(cleaned)) {
      setIsPostcodeValid(true);
      try {
        const res = await deliveryApi.validateZone({ postcode: cleaned });
        if (res.data && res.data.valid) {
          setDeliveryFee(res.data.deliveryFeePence || 0);
          setErrorMsg('');
        } else {
          setErrorMsg('Postcode out of delivery boundary');
        }
      } catch (err) {
        setDeliveryFee(0);
      }
    } else {
      setIsPostcodeValid(val.length > 3 ? false : null);
      setDeliveryFee(0);
    }
  };

  // Cart operations
  const handleItemClick = (item: MenuItem) => {
    const itemWithVariations = item as any;
    const hasVariations = itemWithVariations.variations && itemWithVariations.variations.length > 0;
    const hasModifiers = item.modifierGroups && item.modifierGroups.length > 0;

    if (hasVariations || hasModifiers) {
      setActiveItem(item);
      const initialMods: Record<string, any> = {};
      item.modifierGroups.forEach((g: any) => {
        if (typeof g !== 'string') {
          initialMods[g._id] = [];
        }
      });
      setSelectedMods(initialMods);
      setActiveWizardTab(0);
      
      const activeVars = (itemWithVariations.variations || []).filter((v: any) => v.isActive !== false);
      const defaultVar = activeVars.find((v: any) => v.isDefault) || activeVars[0];
      setSelectedVariation(defaultVar || null);
    } else {
      addToCart(item, [], undefined);
    }
  };

  const addToCart = (item: MenuItem, selectedModifiers: CartItem['selectedModifiers'], variation?: any) => {
    const modsKey = (selectedModifiers || []).map(m => m.optionId).sort().join('-');
    const varKey = variation ? variation._id : 'default';
    const cartItemId = `${item._id}-${varKey}-${modsKey}`;
    
    setCart(prev => {
      const idx = prev.findIndex(ci => ci.id === cartItemId);
      if (idx > -1) {
        const newCart = [...prev];
        newCart[idx].quantity += 1;
        return newCart;
      }
      return [...prev, {
        id: cartItemId,
        item,
        quantity: 1,
        selectedModifiers,
        variation: variation ? {
          variationId: variation._id,
          name: variation.name,
          priceDeltaPence: variation.priceDeltaPence,
          sku: variation.sku
        } : undefined
      }];
    });
  };

  const updateCartQty = (cartItemId: string, amount: number) => {
    setCart(prev => {
      return prev.map(ci => {
        if (ci.id === cartItemId) {
          const newQty = ci.quantity + amount;
          return newQty > 0 ? { ...ci, quantity: newQty } : null;
        }
        return ci;
      }).filter(Boolean) as CartItem[];
    });
  };

  // Modal Modifier Choice Toggle
  const handleModifierToggle = (group: ModifierGroup, option: ModifierOption) => {
    setSelectedMods(prev => {
      const current = prev[group._id] || [];
      const existsIdx = current.findIndex(o => o.optionId === option._id);
      
      let newSelection = [...current];
      if (existsIdx > -1) {
        newSelection.splice(existsIdx, 1);
      } else {
        const entry = {
          optionId: option._id,
          optionName: option.name,
          pricePence: option.pricePence
        };
        
        if (group.maxSelection === 1) {
          newSelection = [entry];
        } else if (newSelection.length < group.maxSelection) {
          newSelection.push(entry);
        }
      }
      return { ...prev, [group._id]: newSelection };
    });
  };

  const handleApplyLabelToOption = (group: ModifierGroup, option: ModifierOption, label: Label | null) => {
    setSelectedMods(prev => {
      const current = prev[group._id] || [];
      const index = current.findIndex(o => o.optionId === option._id);
      if (index === -1) return prev;

      const updatedSelection = [...current];
      const labelPrefix = label ? `${label.name} ` : '';
      const displayPrice = label?.name === 'NO' ? 0 : option.pricePence;

      updatedSelection[index] = {
        ...updatedSelection[index],
        optionName: `${labelPrefix}${option.name}`,
        pricePence: displayPrice
      };

      return { ...prev, [group._id]: updatedSelection };
    });
  };

  const handleSaveModifiers = () => {
    if (!activeItem) return;
    
    // Check variation choice and minSelection limits
    let valid = true;
    const hasVariations = activeItem.variations && activeItem.variations.length > 0;
    if (hasVariations && !selectedVariation) {
      valid = false;
      setErrorMsg("Please select a size/portion");
    }

    activeItem.modifierGroups.forEach((g: any) => {
      if (typeof g !== 'string') {
        const selected = selectedMods[g._id] || [];
        if (selected.length < groupMinSelection(g)) {
          valid = false;
          setErrorMsg(`Please select at least ${groupMinSelection(g)} option(s) for ${g.name}`);
        }
      }
    });

    if (!valid) {
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }

    const flatModifiers: any[] = [];
    activeItem.modifierGroups.forEach((g: any) => {
      if (typeof g !== 'string') {
        const selections = selectedMods[g._id] || [];
        selections.forEach(sel => {
          flatModifiers.push({
            groupId: g._id,
            groupName: g.name,
            optionId: sel.optionId,
            optionName: sel.optionName,
            pricePence: sel.pricePence
          });
        });
      }
    });

    if (onCustomizeComplete) {
      onCustomizeComplete(flatModifiers, selectedVariation);
      setOnCustomizeComplete(null);
    } else {
      addToCart(activeItem, flatModifiers, selectedVariation);
    }

    setActiveItem(null);
    setSelectedVariation(null);
    setActiveWizardTab(0);
  };

  const handleSelectVariation = (v: any) => {
    setSelectedVariation(v);
    const totalTabs = getWizardTabs(activeItem).length;
    if (activeWizardTab < totalTabs - 1) {
      setActiveWizardTab(prev => prev + 1);
    }
  };

  const handleBundleClick = (bundle: any) => {
    setActiveBundle(bundle);
    const initialSelections: Record<string, any[]> = {};
    bundle.components.forEach((slot: any) => {
      initialSelections[slot.label] = [];
    });
    setBundleSelections(initialSelections);
    setActiveSlotIndex(0);
  };

  const addSelectedItemToSlot = (slotIndex: number, item: MenuItem, modifiers: any[], variation: any) => {
    if (!activeBundle) return;
    const slot = activeBundle.components[slotIndex];
    
    const newSelection = {
      menuItem: item._id,
      menuItemSnapshot: {
        name: item.name,
        basePricePence: item.pricePence,
        vatRate: item.vatRate
      },
      variation: variation ? {
        variationId: variation._id,
        name: variation.name,
        priceDeltaPence: variation.priceDeltaPence,
        sku: variation.sku
      } : undefined,
      modifiers: modifiers.map(m => ({
        groupId: m.groupId,
        groupName: m.groupName,
        optionId: m.optionId,
        optionName: m.optionName,
        pricePence: m.pricePence
      })),
      slotLabel: slot.label,
      itemNote: ''
    };

    setBundleSelections(prev => {
      const current = prev[slot.label] || [];
      let updated;
      if (slot.maxChoices === 1) {
        updated = [newSelection];
      } else {
        if (current.length < slot.maxChoices) {
          updated = [...current, newSelection];
        } else {
          updated = [...current];
        }
      }
      return { ...prev, [slot.label]: updated };
    });
  };

  const handleCustomizeSlotItem = (slotLabel: string, index: number) => {
    const currentSelections = bundleSelections[slotLabel] || [];
    const targetItem = currentSelections[index];
    if (!targetItem) return;
    
    const menuItemObj = menuItems.find(mi => mi._id === targetItem.menuItem);
    if (!menuItemObj) return;
    
    setActiveItem(menuItemObj);
    
    const initialMods: Record<string, any> = {};
    menuItemObj.modifierGroups.forEach((g: any) => {
      if (typeof g !== 'string') {
        initialMods[g._id] = [];
      }
    });
    
    targetItem.modifiers.forEach((m: any) => {
      if (initialMods[m.groupId]) {
        initialMods[m.groupId].push({
          optionId: m.optionId,
          optionName: m.optionName,
          pricePence: m.pricePence
        });
      }
    });
    setSelectedMods(initialMods);
    setActiveWizardTab(0);
    
    if (targetItem.variation) {
      const v = menuItemObj.variations?.find((varObj: any) => varObj._id === targetItem.variation.variationId);
      setSelectedVariation(v || null);
    } else {
      setSelectedVariation(null);
    }
    
    setOnCustomizeComplete(() => (modifiers: any[], variation: any) => {
      setBundleSelections(prev => {
        const slotSelections = [...(prev[slotLabel] || [])];
        if (slotSelections[index]) {
          slotSelections[index] = {
            ...slotSelections[index],
            variation: variation ? {
              variationId: variation._id,
              name: variation.name,
              priceDeltaPence: variation.priceDeltaPence,
              sku: variation.sku
            } : undefined,
            modifiers: modifiers.map(m => ({
              groupId: m.groupId,
              groupName: m.groupName,
              optionId: m.optionId,
              optionName: m.optionName,
              pricePence: m.pricePence
            }))
          };
        }
        return { ...prev, [slotLabel]: slotSelections };
      });
    });
  };

  const handleRemoveSlotItem = (slotLabel: string, index: number) => {
    setBundleSelections(prev => {
      const current = [...(prev[slotLabel] || [])];
      current.splice(index, 1);
      return { ...prev, [slotLabel]: current };
    });
  };

  const calculateActiveBundleTotal = () => {
    if (!activeBundle) return 0;
    const base = activeBundle.bundlePricePence || 0;
    const childSurcharges = Object.values(bundleSelections).reduce((totalSum, selections) => {
      if (!Array.isArray(selections)) return totalSum;
      const sum = selections.reduce((s, bi) => {
        const varDelta = bi.variation ? bi.variation.priceDeltaPence : 0;
        const modsDelta = bi.modifiers.reduce((mSum: number, m: any) => mSum + m.pricePence, 0);
        return s + varDelta + modsDelta;
      }, 0);
      return totalSum + sum;
    }, 0);
    return base + childSurcharges;
  };

  const isActiveBundleValid = () => {
    if (!activeBundle) return false;
    for (const slot of activeBundle.components) {
      const selections = bundleSelections[slot.label] || [];
      if (selections.length < slot.minChoices || selections.length > slot.maxChoices) {
        return false;
      }
    }
    return true;
  };

  const handleAddBundleToCart = () => {
    if (!activeBundle || !isActiveBundleValid()) return;
    
    const flatBundleItems: any[] = [];
    activeBundle.components.forEach((slot: any) => {
      const selections = bundleSelections[slot.label] || [];
      selections.forEach((sel: any) => {
        flatBundleItems.push(sel);
      });
    });

    const selectionsKey = flatBundleItems.map(bi => {
      const mKey = bi.modifiers.map((m: any) => m.optionId).sort().join('-');
      const vKey = bi.variation ? bi.variation.variationId : 'default';
      return `${bi.menuItem}-${vKey}-${mKey}`;
    }).sort().join('|');

    const cartItemId = `bundle-${activeBundle._id}-${selectionsKey}`;

    setCart(prev => {
      const idx = prev.findIndex(ci => ci.id === cartItemId);
      if (idx > -1) {
        const newCart = [...prev];
        newCart[idx].quantity += 1;
        return newCart;
      }
      return [...prev, {
        id: cartItemId,
        quantity: 1,
        isBundle: true,
        bundleId: activeBundle._id,
        bundleName: activeBundle.name,
        bundlePricePence: activeBundle.bundlePricePence,
        bundleItems: flatBundleItems
      }];
    });

    setActiveBundle(null);
    setBundleSelections({});
    setActiveSlotIndex(0);
  };

  // Helper to safely read minSelection (or minSelections)
  const groupMinSelection = (g: any) => {
    return g.minSelection !== undefined ? g.minSelection : (g.minSelections !== undefined ? g.minSelections : 0);
  };

  // Helper to safely read maxSelection (or maxSelections)
  const groupMaxSelection = (g: any) => {
    return g.maxSelection !== undefined ? g.maxSelection : (g.maxSelections !== undefined ? g.maxSelections : 1);
  };

  const visibleOptions = (group: any) => {
    return (group.options || []).filter((opt: any) => opt.isAvailable !== false);
  };

  const labelsForGroup = (group: any) => {
    if (group.staticLabelsEnabled === false) return [];
    const allowed = group.allowedLabelIds || [];
    if (!allowed.length) return labels;
    const allowedIds = allowed.map((label: any) => typeof label === 'string' ? label : label._id);
    return labels.filter(label => allowedIds.includes(label._id));
  };

  const getWizardTabs = (item: MenuItem | null) => {
    if (!item) return [];
    const tabs: string[] = [];
    const itemWithVariations = item as any;
    if (itemWithVariations.variations && itemWithVariations.variations.length > 0) {
      tabs.push("Size & Portion");
    }
    item.modifierGroups.forEach((g: any) => {
      if (typeof g !== 'string') {
        tabs.push(g.displayName || g.name);
      }
    });
    return tabs;
  };

  const isTabValid = (idx: number) => {
    if (!activeItem) return false;
    const hasVariations = activeItem.variations && activeItem.variations.length > 0;
    
    if (hasVariations) {
      if (idx === 0) return !!selectedVariation;
      const groupIdx = idx - 1;
      const group = activeItem.modifierGroups[groupIdx];
      if (typeof group === 'string' || !group) return false;
      const selections = selectedMods[group._id] || [];
      return selections.length >= groupMinSelection(group);
    } else {
      const group = activeItem.modifierGroups[idx];
      if (typeof group === 'string' || !group) return false;
      const selections = selectedMods[group._id] || [];
      return selections.length >= groupMinSelection(group);
    }
  };

  const isTabClickable = (idx: number) => {
    for (let i = 0; i < idx; i++) {
      if (!isTabValid(i)) return false;
    }
    return true;
  };

  // Calculations
  const calculateCartSubtotal = () => {
    return cart.reduce((acc, ci) => {
      if (ci.isBundle) {
        const base = ci.bundlePricePence || 0;
        const childSurcharges = (ci.bundleItems || []).reduce((sum, bi) => {
          const varDelta = bi.variation ? bi.variation.priceDeltaPence : 0;
          const modsDelta = bi.modifiers.reduce((s, m) => s + m.pricePence, 0);
          return sum + varDelta + modsDelta;
        }, 0);
        return acc + (base + childSurcharges) * ci.quantity;
      } else {
        const itemBase = ci.item?.pricePence || 0;
        const variationDelta = ci.variation ? ci.variation.priceDeltaPence : 0;
        const modsTotal = ci.selectedModifiers?.reduce((s, m) => s + m.pricePence, 0) || 0;
        return acc + (itemBase + variationDelta + modsTotal) * ci.quantity;
      }
    }, 0);
  };

  const subtotal = calculateCartSubtotal();
  const total = subtotal + deliveryFee;

  // Format order lines for VAT breakdown
  const orderLinesForVat = cart.map(ci => {
    if (ci.isBundle) {
      const base = ci.bundlePricePence || 0;
      const childSurcharges = (ci.bundleItems || []).reduce((sum, bi) => {
        const varDelta = bi.variation ? bi.variation.priceDeltaPence : 0;
        const modsDelta = bi.modifiers.reduce((s, m) => s + m.pricePence, 0);
        return sum + varDelta + modsDelta;
      }, 0);
      return {
        lineTotalPence: (base + childSurcharges) * ci.quantity,
        vatRate: 20 as const
      };
    } else {
      const itemBase = ci.item?.pricePence || 0;
      const variationDelta = ci.variation ? ci.variation.priceDeltaPence : 0;
      const modsTotal = ci.selectedModifiers?.reduce((s, m) => s + m.pricePence, 0) || 0;
      return {
        lineTotalPence: (itemBase + variationDelta + modsTotal) * ci.quantity,
        vatRate: ci.item?.vatRate || 20
      };
    }
  });

  const vatBreakdown = computeVatBreakdown(orderLinesForVat);

  // Submit Order
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      setErrorMsg('Cannot place an empty order.');
      return;
    }

    if (orderType === 'delivery') {
      if (!customerName || !customerPhone || !deliveryPostcode || !deliveryAddress) {
        setErrorMsg('Delivery details (Name, Phone, Postcode, Address) are required.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg('');
    const idempotency = generateIdempotencyKey(terminalId);

    const orderPayload = {
      orderType,
      customerDetails: {
        name: customerName || 'In-store Walkin',
        phone: customerPhone || '',
        address: deliveryAddress || '',
        postcode: deliveryPostcode || '',
      },
      items: cart.map(ci => {
        if (!ci.isBundle) {
          return {
            menuItemId: ci.item?._id,
            quantity: ci.quantity,
            variationId: ci.variation?.variationId,
            itemNote: ci.notes,
            modifiers: (ci.selectedModifiers || []).map(m => ({
              modifierGroupId: m.groupId,
              optionId: m.optionId,
              name: m.optionName,
              pricePence: m.pricePence
            }))
          };
        } else {
          return {
            isBundle: true,
            bundleId: ci.bundleId,
            quantity: ci.quantity,
            bundleItems: (ci.bundleItems || []).map(bi => ({
              menuItemId: bi.menuItem,
              variationId: bi.variation?.variationId,
              itemNote: bi.itemNote,
              slotLabel: bi.slotLabel,
              modifiers: (bi.modifiers || []).map(m => ({
                modifierGroupId: m.groupId,
                optionId: m.optionId,
                name: m.optionName,
                pricePence: m.pricePence
              }))
            }))
          };
        }
      }),
      paymentMethod,
      deliveryFeePence: deliveryFee
    };

    try {
      const res = await ordersApi.create(orderPayload, idempotency);
      setSuccessMsg(`Order placed! Ref: ${res.data.order.reference}`);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setDeliveryPostcode('');
      setDeliveryAddress('');
      setDeliveryFee(0);
      
      // Auto-clear message
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lockscreen component
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 font-sans p-4 relative overflow-hidden">
        {/* Decorative Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-800 shadow-2xl relative z-10 flex flex-col items-center">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-tr from-brand-600 to-orange-400 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">TakeawayPOS Pro</h1>
              <p className="text-xs text-slate-400">Terminal Access Control</p>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-slate-300 mb-6 tracking-wide uppercase">Enter Employee PIN</h2>

          {/* PIN Dots */}
          <div className="flex space-x-4 mb-8">
            {[0, 1, 2, 3].map((idx) => (
              <div 
                key={idx} 
                className={`w-4 h-4 rounded-full border border-slate-700 transition-all duration-150 ${
                  pin.length > idx 
                    ? 'bg-gradient-to-r from-brand-500 to-orange-500 shadow-md shadow-brand-500/50 scale-110 border-transparent' 
                    : 'bg-slate-900'
                }`}
              />
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-4 w-full mb-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePinInput(num)}
                className="h-16 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800/80 active:scale-95 text-xl font-bold flex items-center justify-center transition-all cursor-pointer select-none"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handlePinDelete}
              className="h-16 rounded-xl bg-slate-900/40 border border-slate-800/50 hover:bg-slate-800/40 text-sm font-semibold flex items-center justify-center transition-all cursor-pointer select-none"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handlePinInput('0')}
              className="h-16 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800/80 text-xl font-bold flex items-center justify-center transition-all cursor-pointer select-none"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => handlePinSubmit()}
              className="h-16 rounded-xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white text-sm font-semibold flex items-center justify-center transition-all cursor-pointer shadow-md shadow-brand-500/10 select-none"
            >
              Unlock
            </button>
          </div>

          {errorMsg && (
            <div className="w-full flex items-center space-x-2 bg-red-950/50 border border-red-500/30 p-3 rounded-lg text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* ─── Header ─── */}
      <header className="h-16 border-b border-slate-900 px-6 flex items-center justify-between shrink-0 bg-slate-950 relative z-20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-brand-600 to-orange-400 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-lg">TakeawayPOS <span className="text-brand-500">Pro</span></span>
          <span className="h-4 w-px bg-slate-800" />
          <div className="flex items-center space-x-2 text-xs bg-slate-900 px-3 py-1 rounded-full text-slate-400 border border-slate-800">
            <span>Terminal: {terminalId}</span>
          </div>
          {currentShift && (
            <div className="flex items-center space-x-2 text-xs bg-slate-900 px-3 py-1 rounded-full text-slate-400 border border-slate-800">
              <span>Till Float: {gbp(currentShift.floatPence)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-sm text-slate-300">
            <User className="w-4 h-4 text-brand-500" />
            <span className="font-semibold">{user?.username} ({user?.role})</span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {isOnline ? (
              <span className="flex items-center text-emerald-400 font-medium">
                <Wifi className="w-4 h-4 mr-1" /> Online
              </span>
            ) : (
              <span className="flex items-center text-rose-400 font-medium">
                <WifiOff className="w-4 h-4 mr-1" /> Offline Mode
              </span>
            )}
          </div>

          <button 
            onClick={handleLogout} 
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* ─── Main Interface ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Categories & Menu */}
        <main className="flex-1 flex flex-col bg-slate-900/20 overflow-hidden border-r border-slate-900">
          
          {/* Order Types & Filters */}
          <div className="p-4 border-b border-slate-900 flex justify-between items-center bg-slate-950/20 shrink-0">
            <div className="flex space-x-2">
              {(['dine-in', 'takeaway', 'delivery'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setOrderType(type);
                    if (type !== 'delivery') {
                      setDeliveryFee(0);
                      setDeliveryPostcode('');
                    }
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                    orderType === type
                      ? 'bg-gradient-to-r from-brand-600 to-orange-500 border-transparent text-white shadow-md shadow-brand-500/10'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            
            {/* Active notifications */}
            {(errorMsg || successMsg) && (
              <div className={`px-4 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-2 ${
                errorMsg 
                  ? 'bg-rose-950/30 border-rose-500/30 text-rose-400' 
                  : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
              }`}>
                <span>{errorMsg || successMsg}</span>
              </div>
            )}
          </div>

          {/* Menu Categories Horizontal scroll */}
          <div className="p-4 overflow-x-auto whitespace-nowrap shrink-0 border-b border-slate-900/50 bg-slate-950/10 flex space-x-2">
            {categories.map((cat) => (
              <button
                key={cat._id}
                onClick={() => setSelectedCategory(cat._id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat._id
                    ? 'bg-brand-500/15 border border-brand-500 text-brand-400'
                    : 'bg-slate-900/50 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
            {bundles.length > 0 && (
              <button
                onClick={() => setSelectedCategory('bundles')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  selectedCategory === 'bundles'
                    ? 'bg-brand-500/15 border border-brand-500 text-brand-400 font-bold'
                    : 'bg-slate-900/50 border border-slate-800 hover:bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                MEAL DEALS
              </button>
            )}
          </div>

          {/* Menu Items Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {selectedCategory === 'bundles' ? (
                bundles.map((bundle) => (
                  <button
                    key={bundle._id}
                    onClick={() => handleBundleClick(bundle)}
                    className="h-40 p-4 rounded-xl flex flex-col justify-between text-left glass-panel glass-panel-hover group relative cursor-pointer"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-slate-100 group-hover:text-brand-400 transition-colors line-clamp-2 pr-1">{bundle.name}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-800 border border-slate-700/50 rounded-full text-slate-400">
                          {gbp(bundle.bundlePricePence)}
                        </span>
                      </div>
                      {bundle.description && (
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2 font-normal leading-relaxed">{bundle.description}</p>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-800/50">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{bundle.components.length} Items Included</span>
                      <div className="w-7 h-7 bg-brand-500/10 hover:bg-brand-500 text-brand-400 hover:text-white rounded-lg flex items-center justify-center transition-all">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                menuItems
                  .filter(item => !selectedCategory || item.category === selectedCategory)
                  .map((item) => (
                    <button
                      key={item._id}
                      onClick={() => handleItemClick(item)}
                      disabled={!item.isAvailable}
                      className={`h-40 p-4 rounded-xl flex flex-col justify-between text-left glass-panel glass-panel-hover group relative ${
                        !item.isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-sm text-slate-100 group-hover:text-brand-400 transition-colors line-clamp-2 pr-1">{item.name}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 bg-slate-800 border border-slate-700/50 rounded-full text-slate-400">
                            {item.variations && item.variations.length > 0
                              ? `from ${gbp(item.pricePence)}`
                              : gbp(item.pricePence)
                            }
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-400 mt-2 line-clamp-2 font-normal leading-relaxed">{item.description}</p>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-800/50">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">VAT: {item.vatRate}%</span>
                        {item.isAvailable ? (
                          <div className="w-7 h-7 bg-brand-500/10 hover:bg-brand-500 text-brand-400 hover:text-white rounded-lg flex items-center justify-center transition-all">
                            <Plus className="w-4 h-4" />
                          </div>
                        ) : (
                          <span className="text-[10px] text-red-400 font-semibold">Unavailable</span>
                        )}
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </main>

        {/* Right Side: Order Details, Details Entry, Cart Summary & Checkout */}
        <aside className="w-[450px] shrink-0 bg-slate-950 flex flex-col">
          {/* Customer / Phone Order Details section */}
          <div className="p-4 border-b border-slate-900 bg-slate-950/50 space-y-3 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center">
              <PhoneCall className="w-3.5 h-3.5 mr-1.5 text-brand-500" />
              Customer Details
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:bg-slate-900"
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:bg-slate-900"
              />
            </div>

            {orderType === 'delivery' && (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Postcode (e.g. WN1 1AA)"
                    value={deliveryPostcode}
                    onChange={(e) => handlePostcodeChange(e.target.value)}
                    className={`w-full bg-slate-900/60 border rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:bg-slate-900 ${
                      isPostcodeValid === true ? 'border-emerald-500/50' : isPostcodeValid === false ? 'border-red-500/50' : 'border-slate-800'
                    }`}
                  />
                  {isPostcodeValid === true && (
                    <span className="absolute right-3 top-2.5 text-[10px] text-emerald-400 font-bold">Valid Outward</span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Address details"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:bg-slate-900"
                />
              </div>
            )}
          </div>

          {/* Cart Header */}
          <div className="px-4 py-3 border-b border-slate-900 flex justify-between items-center bg-slate-950/20 shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Selected Items ({cart.reduce((a,c)=>a+c.quantity, 0)})</span>
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])} 
                className="text-xs text-slate-500 hover:text-red-400 flex items-center space-x-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600">
                <ShoppingBag className="w-12 h-12 stroke-[1] mb-2" />
                <span className="text-xs">No items in order</span>
              </div>
            ) : (
              cart.map((ci) => {
                if (ci.isBundle) {
                  const base = ci.bundlePricePence || 0;
                  const childSurcharges = (ci.bundleItems || []).reduce((sum, bi) => {
                    const varDelta = bi.variation ? bi.variation.priceDeltaPence : 0;
                    const modsDelta = bi.modifiers.reduce((s, m) => s + m.pricePence, 0);
                    return sum + varDelta + modsDelta;
                  }, 0);
                  const unitPrice = base + childSurcharges;
                  const linePrice = unitPrice * ci.quantity;

                  return (
                    <div key={ci.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-xs text-brand-400">{ci.bundleName}</span>
                          <div className="pl-2 border-l border-slate-800 space-y-1.5 mt-1.5">
                            {ci.bundleItems?.map((bi, idx) => (
                              <div key={idx} className="text-[10px] text-slate-300">
                                <span className="font-semibold text-slate-200">{bi.menuItemSnapshot.name}</span>
                                {bi.variation && (
                                  <span className="text-slate-400 ml-1">({bi.variation.name})</span>
                                )}
                                {bi.modifiers.length > 0 && (
                                  <div className="pl-1.5 text-[9px] text-slate-500 flex flex-wrap gap-0.5">
                                    {bi.modifiers.map((m, mIdx) => (
                                      <span key={mIdx}>+ {m.optionName} {m.pricePence > 0 ? `(${gbp(m.pricePence)})` : ''}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <span className="font-bold text-xs text-slate-100">{gbp(linePrice)}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] text-slate-500">Unit: {gbp(unitPrice)}</span>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateCartQty(ci.id, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700/50 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-slate-200 w-4 text-center">{ci.quantity}</span>
                          <button
                            onClick={() => updateCartQty(ci.id, 1)}
                            className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700/50 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const itemBase = ci.item?.pricePence || 0;
                  const variationDelta = ci.variation ? ci.variation.priceDeltaPence : 0;
                  const modsTotal = ci.selectedModifiers?.reduce((s, m) => s + m.pricePence, 0) || 0;
                  const unitPrice = itemBase + variationDelta + modsTotal;
                  const linePrice = unitPrice * ci.quantity;

                  return (
                    <div key={ci.id} className="p-3 bg-slate-900/40 border border-slate-900 rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-xs text-slate-200">{ci.item?.name}</span>
                          {ci.variation && (
                            <div className="text-[10px] text-brand-400 font-medium">Size: {ci.variation.name}</div>
                          )}
                          {ci.selectedModifiers && ci.selectedModifiers.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {ci.selectedModifiers.map((m, idx) => (
                                <span key={idx} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50">
                                  + {m.optionName} {m.pricePence > 0 ? `(${gbp(m.pricePence)})` : ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="font-bold text-xs text-slate-100">{gbp(linePrice)}</span>
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[10px] text-slate-500">Unit: {gbp(unitPrice)}</span>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateCartQty(ci.id, -1)}
                            className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700/50 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-slate-200 w-4 text-center">{ci.quantity}</span>
                          <button
                            onClick={() => updateCartQty(ci.id, 1)}
                            className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700/50 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              })
            )}
          </div>

          {/* Totals & VAT Summary */}
          <div className="p-4 border-t border-slate-900 bg-slate-950/60 space-y-2.5 shrink-0">
            {cart.length > 0 && (
              <div className="border-b border-slate-900 pb-2 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">VAT Breakdown</span>
                {Object.values(vatBreakdown).map((bucket) => (
                  <div key={bucket.rate} className="flex justify-between text-[11px] text-slate-400">
                    <span>VAT {bucket.rate}% (Net: {gbp(bucket.netPence)})</span>
                    <span>{gbp(bucket.vatPence)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between text-xs text-slate-400">
              <span>Subtotal</span>
              <span>{gbp(subtotal)}</span>
            </div>

            {orderType === 'delivery' && (
              <div className="flex justify-between text-xs text-slate-400">
                <span>Delivery Charge</span>
                <span>{deliveryFee > 0 ? gbp(deliveryFee) : 'FREE'}</span>
              </div>
            )}

            <div className="flex justify-between text-base font-extrabold text-slate-100 border-t border-slate-900 pt-2.5">
              <span>Total Price</span>
              <span className="text-brand-500 text-lg">{gbp(total)}</span>
            </div>
          </div>

          {/* Payment Method Selector & Finish */}
          <div className="p-4 bg-slate-950 border-t border-slate-900 shrink-0 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-bold'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-wider">Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-bold'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-wider">Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('link')}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  paymentMethod === 'link'
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-bold'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-wider">SMS Pay</span>
              </button>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting || cart.length === 0}
              className="w-full bg-gradient-to-r from-brand-600 to-orange-500 hover:from-brand-500 hover:to-orange-400 active:scale-98 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-sm py-3.5 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-brand-600/10 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Processing Order...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Submit {orderType} Order</span>
                </>
              )}
            </button>
          </div>
        </aside>
      </div>

      {/* ─── Modifier Selection Modal (Sequential Wizard) ─── */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <header className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div>
                <h4 className="font-bold text-base text-slate-100">{activeItem.name}</h4>
                {activeItem.description && (
                  <p className="text-xs text-slate-400 mt-1">{activeItem.description}</p>
                )}
              </div>
              <button 
                onClick={() => {
                  setActiveItem(null);
                  setSelectedVariation(null);
                  setActiveWizardTab(0);
                  setOnCustomizeComplete(null);
                }} 
                className="text-xs text-slate-500 hover:text-slate-300 font-semibold px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition-all"
              >
                Close
              </button>
            </header>

            {/* Wizard Tabs Bar */}
            <div className="bg-slate-950/20 border-b border-slate-800/80 p-3 overflow-x-auto flex gap-2">
              {getWizardTabs(activeItem).map((tabLabel, idx) => {
                const isValid = isTabValid(idx);
                const isClickable = isTabClickable(idx);
                const isActive = activeWizardTab === idx;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!isClickable}
                    onClick={() => setActiveWizardTab(idx)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border shrink-0 ${
                      isActive
                        ? 'bg-brand-500/15 border-brand-500 text-brand-400 font-bold'
                        : isClickable
                          ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800 text-slate-300'
                          : 'opacity-40 cursor-not-allowed border-transparent text-slate-500'
                    }`}
                  >
                    <span>{tabLabel}</span>
                    {isValid && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 font-bold shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Body / Tab Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Tab 0 if variations exist */}
              {activeItem.variations && activeItem.variations.length > 0 && activeWizardTab === 0 ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-slate-200">Select Size & Portion</h5>
                    <p className="text-xs text-slate-400">Choose one option below to proceed.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {activeItem.variations.filter((v: any) => v.isActive !== false).map((v) => {
                      const isSelected = selectedVariation?._id === v._id;
                      return (
                        <button
                          key={v._id}
                          type="button"
                          onClick={() => handleSelectVariation(v)}
                          className={`p-4 rounded-xl border text-left flex flex-col justify-between h-24 transition-all relative select-none ${
                            isSelected
                              ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-bold'
                              : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:bg-slate-900/80 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-sm font-bold">{v.name}</span>
                          <div className="flex justify-between items-center w-full">
                            <span className="text-xs text-slate-500">SKU: {v.sku}</span>
                            <span className="text-xs font-semibold text-slate-300">
                              {v.priceDeltaPence > 0 ? `+${gbp(v.priceDeltaPence)}` : 'No Extra'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Modifier Group Tab
                (() => {
                  const hasVariations = activeItem.variations && activeItem.variations.length > 0;
                  const groupIdx = hasVariations ? activeWizardTab - 1 : activeWizardTab;
                  const group = activeItem.modifierGroups[groupIdx];
                  
                  if (typeof group === 'string' || !group) return null;
                  const selections = selectedMods[group._id] || [];

                  return (
                    <div key={group._id} className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h5 className="text-sm font-bold text-slate-200">{group.name}</h5>
                          <p className="text-xs text-slate-400">
                            {groupMinSelection(group) > 0 
                              ? `Select at least ${groupMinSelection(group)} option(s) (Max: ${groupMaxSelection(group)})` 
                              : `Optional choice (Max: ${groupMaxSelection(group)})`
                            }
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          selections.length >= groupMinSelection(group)
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                        }`}>
                          {selections.length} / {groupMaxSelection(group)} Selected
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {visibleOptions(group).map((opt: ModifierOption) => {
                          const selection = selections.find(o => o.optionId === opt._id);
                          const isSelected = !!selection;
                          return (
                            <div key={opt._id} className="flex flex-col space-y-1.5">
                              <button
                                type="button"
                                onClick={() => handleModifierToggle(group, opt)}
                                className={`p-4 rounded-xl border text-left flex justify-between items-center transition-all ${
                                  isSelected
                                    ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-bold'
                                    : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:bg-slate-900/80 hover:border-slate-700'
                                }`}
                              >
                                <span className="text-xs">
                                  {selection ? selection.optionName : opt.name}
                                </span>
                                <span className="text-xs font-semibold">
                                  {selection 
                                    ? (selection.pricePence > 0 ? `+${gbp(selection.pricePence)}` : 'FREE')
                                    : (opt.pricePence > 0 ? `+${gbp(opt.pricePence)}` : 'FREE')
                                  }
                                </span>
                              </button>

                              {/* Action Labels */}
                              {isSelected && group.staticLabelsEnabled !== false && labels.length > 0 && (
                                <div className="flex flex-wrap gap-1 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/40">
                                  {labelsForGroup(group).map((lbl) => {
                                    const hasLabel = selection.optionName.startsWith(`${lbl.name} `);
                                    return (
                                      <button
                                        key={lbl._id}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleApplyLabelToOption(group, opt, lbl);
                                        }}
                                        className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                                          hasLabel
                                            ? 'border-brand-500 bg-brand-500/20 text-brand-400'
                                            : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                                        }`}
                                        style={{
                                          borderColor: hasLabel ? undefined : lbl.backgroundColor,
                                          color: hasLabel ? undefined : lbl.textColor,
                                          backgroundColor: hasLabel ? undefined : `${lbl.backgroundColor}15`
                                        }}
                                      >
                                        {lbl.name}
                                      </button>
                                    );
                                  })}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleApplyLabelToOption(group, opt, null);
                                    }}
                                    className="px-2 py-0.5 rounded text-[9px] font-bold border border-slate-800 bg-slate-900/50 text-slate-500 hover:text-slate-300 cursor-pointer"
                                  >
                                    RESET
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Footer Navigation */}
            <footer className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
              <button
                type="button"
                disabled={activeWizardTab === 0}
                onClick={() => setActiveWizardTab(prev => prev - 1)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:bg-slate-900 disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold transition-all cursor-pointer"
              >
                Back
              </button>
              
              {activeWizardTab < getWizardTabs(activeItem).length - 1 ? (
                <button
                  type="button"
                  disabled={!isTabValid(activeWizardTab)}
                  onClick={() => setActiveWizardTab(prev => prev + 1)}
                  className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!isTabValid(activeWizardTab) || !getWizardTabs(activeItem).every((_, idx) => isTabValid(idx))}
                  onClick={handleSaveModifiers}
                  className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  {onCustomizeComplete ? 'Apply Customization' : 'Add Selection to Basket'}
                </button>
              )}
            </footer>
          </div>
        </div>
      )}

      {/* ─── Meal Deal Configurator Modal ─── */}
      {activeBundle && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[85vh]">
            <header className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <div>
                <h4 className="font-extrabold text-lg text-brand-400">{activeBundle.name}</h4>
                {activeBundle.description && (
                  <p className="text-xs text-slate-400 mt-1">{activeBundle.description}</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Bundle Price</span>
                  <span className="text-lg font-extrabold text-slate-100">{gbp(calculateActiveBundleTotal())}</span>
                </div>
                <button 
                  onClick={() => {
                    setActiveBundle(null);
                    setBundleSelections({});
                    setActiveSlotIndex(0);
                  }} 
                  className="text-xs text-slate-500 hover:text-slate-300 font-semibold px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </header>

            {/* Split Screen Panel */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Column: Slots List */}
              <div className="w-1/3 border-r border-slate-800 bg-slate-950/20 overflow-y-auto p-4 space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Required Items</span>
                {activeBundle.components.map((slot: any, idx: number) => {
                  const selections = bundleSelections[slot.label] || [];
                  const isActive = activeSlotIndex === idx;
                  const isSatisfied = selections.length >= slot.minChoices && selections.length <= slot.maxChoices;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSlotIndex(idx)}
                      className={`w-full text-left p-3.5 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer ${
                        isActive
                          ? 'border-brand-500 bg-brand-500/5'
                          : isSatisfied
                            ? 'border-slate-800 bg-slate-900/30'
                            : 'border-slate-850 bg-slate-900/10'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-xs font-bold ${isActive ? 'text-brand-400' : 'text-slate-200'}`}>{slot.label}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isSatisfied 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                        }`}>
                          {selections.length} / {slot.maxChoices}
                        </span>
                      </div>

                      {/* Selected Items details */}
                      {selections.length > 0 ? (
                        <div className="space-y-1.5 w-full">
                          {selections.map((bi: any, biIdx: number) => {
                            const varDelta = bi.variation ? bi.variation.priceDeltaPence : 0;
                            const modsDelta = bi.modifiers.reduce((s: number, m: any) => s + m.pricePence, 0);
                            const totalUpcharge = varDelta + modsDelta;

                            return (
                              <div key={biIdx} className="bg-slate-900/60 border border-slate-800/80 p-2 rounded-lg flex items-start justify-between gap-1">
                                <div className="text-[10px] text-slate-300 space-y-0.5 leading-normal flex-1">
                                  <span className="font-extrabold text-slate-200">{bi.menuItemSnapshot.name}</span>
                                  {bi.variation && (
                                    <span className="text-brand-400 ml-1 font-semibold">({bi.variation.name})</span>
                                  )}
                                  {bi.modifiers.length > 0 && (
                                    <div className="text-[9px] text-slate-500 flex flex-wrap gap-0.5">
                                      {bi.modifiers.map((m: any, mIdx: number) => (
                                        <span key={mIdx}>+ {m.optionName}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {totalUpcharge > 0 && (
                                    <span className="text-[9px] font-bold text-orange-400 bg-orange-400/5 px-1 py-0.5 rounded font-bold">+{gbp(totalUpcharge)}</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCustomizeSlotItem(slot.label, biIdx);
                                    }}
                                    className="p-1 hover:text-brand-400 text-slate-500 transition-colors text-[10px]"
                                    title="Customize options"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveSlotItem(slot.label, biIdx);
                                    }}
                                    className="p-1 hover:text-red-400 text-slate-500 transition-colors text-[10px]"
                                    title="Remove item"
                                  >
                                    &times;
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic font-normal">No item selected</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Allowed Menu Items grid */}
              <div className="w-2/3 overflow-y-auto p-6 bg-slate-900/10">
                {(() => {
                  const activeSlot = activeBundle.components[activeSlotIndex];
                  if (!activeSlot) return null;
                  const selections = bundleSelections[activeSlot.label] || [];
                  const reachedMax = selections.length >= activeSlot.maxChoices;

                  // Find items belonging to category
                  const allowedItems = menuItems.filter(item => 
                    activeSlot.allowedCategoryIds.some((cid: any) => String(cid) === String(item.category))
                  );

                  return (
                    <div className="space-y-4">
                      <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                        <div>
                          <h5 className="text-sm font-bold text-slate-200">Choose for: {activeSlot.label}</h5>
                          <p className="text-xs text-slate-400 mt-0.5">Select up to {activeSlot.maxChoices} items.</p>
                        </div>
                        {reachedMax && (
                          <span className="text-[10px] text-orange-400 font-bold bg-orange-400/5 px-2.5 py-1 rounded-full border border-orange-400/20">
                            Slot Selection Limit Reached
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {allowedItems.map((item) => {
                          const itemSelections = selections.filter((s: any) => s.menuItem === item._id);
                          const quantitySelected = itemSelections.length;

                          return (
                            <button
                              key={item._id}
                              type="button"
                              disabled={reachedMax && quantitySelected === 0}
                              onClick={() => {
                                const hasVars = item.variations && item.variations.length > 0;
                                const hasMods = item.modifierGroups && item.modifierGroups.length > 0;
                                
                                if (hasVars || hasMods) {
                                  // Open standard customizer modal with a custom callback
                                  setActiveItem(item);
                                  const initialMods: Record<string, any> = {};
                                  item.modifierGroups.forEach((g: any) => {
                                    if (typeof g !== 'string') {
                                      initialMods[g._id] = [];
                                    }
                                  });
                                  setSelectedMods(initialMods);
                                  setActiveWizardTab(0);
                                  
                                  const activeVars = (item.variations || []).filter((v: any) => v.isActive !== false);
                                  const defaultVar = activeVars.find((v: any) => v.isDefault) || activeVars[0];
                                  setSelectedVariation(defaultVar || null);

                                  setOnCustomizeComplete(() => (modifiers: any[], variation: any) => {
                                    addSelectedItemToSlot(activeSlotIndex, item, modifiers, variation);
                                  });
                                } else {
                                  // Add directly
                                  addSelectedItemToSlot(activeSlotIndex, item, [], null);
                                }
                              }}
                              className={`p-4 rounded-xl border text-left h-32 flex flex-col justify-between transition-all relative ${
                                quantitySelected > 0
                                  ? 'border-brand-500 bg-brand-500/10 text-brand-400 font-bold'
                                  : reachedMax
                                    ? 'opacity-40 border-slate-800 bg-slate-900/10 cursor-not-allowed'
                                    : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:bg-slate-900/80 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex justify-between items-start w-full">
                                <span className="text-xs font-bold leading-snug line-clamp-2 pr-1">{item.name}</span>
                                {quantitySelected > 0 && (
                                  <span className="bg-brand-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full shrink-0">
                                    {quantitySelected}x
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex justify-between items-center w-full mt-2 pt-2 border-t border-slate-800/40">
                                <span className="text-[10px] text-slate-500 font-normal">
                                  {item.variations && item.variations.length > 0 ? 'options available' : 'standard build'}
                                </span>
                                {item.pricePence > 0 && (
                                  <span className="text-[10px] text-slate-450 font-medium">
                                    {gbp(item.pricePence)}
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Configurator Footer */}
            <footer className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
              <span className="text-xs text-slate-400">
                {isActiveBundleValid() 
                  ? 'All components selections are complete!' 
                  : 'Please configure all required slots above to add to basket.'
                }
              </span>
              <button
                type="button"
                disabled={!isActiveBundleValid()}
                onClick={handleAddBundleToCart}
                className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-sm px-6 py-3 rounded-xl transition-all cursor-pointer shadow-lg shadow-brand-600/10"
              >
                Add Meal Deal to Basket ({gbp(calculateActiveBundleTotal())})
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ─── Open Shift Modal ─── */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-2 text-brand-500">
              <Lock className="w-5 h-5" />
              <h4 className="font-extrabold text-base text-slate-100">Open Till / Shift Audit</h4>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              No shift is currently open on this terminal. You must set the initial opening cash float to begin operations.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Till Cash Float (GBP)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 text-sm">£</span>
                <input
                  type="number"
                  step="0.01"
                  value={shiftFloat}
                  onChange={(e) => setShiftFloat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-200 focus:bg-slate-950"
                />
              </div>
            </div>

            <button
              onClick={handleOpenShift}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
            >
              Start Shift / Open Drawer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
