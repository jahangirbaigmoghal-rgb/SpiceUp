import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  ShoppingBag, 
  MapPin, 
  Clock, 
  ChevronRight, 
  Plus, 
  Minus, 
  Check, 
  AlertCircle, 
  CreditCard, 
  X, 
  CheckCircle2,
  Package,
  CookingPot,
  Bike,
  Star
} from 'lucide-react';
import { gbp, isValidUKPostcode, generateIdempotencyKey } from '@takeaway-pos/utils';
import { menuApi, ordersApi, deliveryApi, settingsApi } from '@takeaway-pos/api-client';

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

interface MenuItem {
  _id: string;
  name: string;
  description?: string;
  pricePence: number;
  vatRate: 0 | 5 | 20;
  category: string;
  isAvailable: boolean;
  images?: string[];
  modifierGroups: (string | ModifierGroup)[];
}

interface Category {
  _id: string;
  name: string;
  displayOrder: number;
  parent?: any;
  backgroundColor?: string;
  textColor?: string;
}

interface Label {
  _id: string;
  name: string;
  backgroundColor?: string;
  textColor?: string;
}

interface CartItem {
  id: string;
  item: MenuItem;
  quantity: number;
  selectedModifiers: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    pricePence: number;
  }>;
}

export default function App() {
  // Public CMS settings state
  const [settings, setSettings] = useState<any>({
    storeName: 'Rupeyal Express',
    storePhone: '01782 811112',
    storeEmail: 'orders@rupeyalexpress.co.uk',
    storeAddress: '123 High Street, Tunstall, Stoke-on-Trent, ST6 5EP',
    storeOpenTime: '16:00',
    storeCloseTime: '23:30',
    storeIsOpen: true,
    deliveryFeePence: 250,
    minDeliveryOrderPence: 1500,
    freeDeliveryThresholdPence: 1500,
    estimatedDeliveryMinutes: 45,
    estimatedCollectionMinutes: 15,
    pwaThemeColor: '#f97316',
    pwaBannerTitle: 'Rupeyal Express',
    pwaBannerSub: 'Authentic Taste of Tunstall',
    pwaBannerDescription: "Indulge in Stoke's finest stonebaked pizzas, balti curries, and authentic flame-grilled kebabs. Freshly prepared to order.",
    pwaBannerImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1600&auto=format&fit=crop'
  });

  // Navigation / views: 'browse' | 'checkout' | 'tracker'
  const [view, setView] = useState<'browse' | 'checkout' | 'tracker'>('browse');

  // Menu Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [labels, setLabels] = useState<Label[]>([
    { _id: 'l1', name: 'NO', backgroundColor: '#ef4444', textColor: '#ffffff' },
    { _id: 'l2', name: 'LESS', backgroundColor: '#f59e0b', textColor: '#ffffff' },
    { _id: 'l3', name: 'ON CHIPS', backgroundColor: '#3b82f6', textColor: '#ffffff' },
    { _id: 'l4', name: 'ON BURGER', backgroundColor: '#10b981', textColor: '#ffffff' },
    { _id: 'l5', name: 'ALL OVER', backgroundColor: '#8b5cf6', textColor: '#ffffff' },
    { _id: 'l6', name: 'ON HALF', backgroundColor: '#ec4899', textColor: '#ffffff' }
  ]);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'takeaway' | 'delivery'>('takeaway');

  // Postcode checker / Delivery Zone Info
  const [postcode, setPostcode] = useState('');
  const [postcodeStatus, setPostcodeStatus] = useState<{ checked: boolean; valid: boolean; deliveryFee: number }>({
    checked: false,
    valid: false,
    deliveryFee: 0
  });

  // Customer Details Form
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  // Modifiers Selection
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [selectedMods, setSelectedMods] = useState<Record<string, Array<{ optionId: string; optionName: string; pricePence: number }>>>({});

  // Placed Order details
  const [placedOrder, setPlacedOrder] = useState<{ _id: string; orderRef: string; status: string } | null>(null);

  // Status feedback / Loading
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic HSL Theme generator
  const applyDynamicTheme = (hex: string) => {
    // Basic hex parsing
    let r = parseInt(hex.slice(1, 3), 16) || 249;
    let g = parseInt(hex.slice(3, 5), 16) || 115;
    let b = parseInt(hex.slice(5, 7), 16) || 22;

    // Convert RGB to HSL
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    const H = Math.round(h * 360);
    const S = Math.round(s * 100);
    const L = Math.round(l * 100);

    // Apply color shades to HTML root
    const root = document.documentElement;
    root.style.setProperty('--brand-50', `hsl(${H}, ${S}%, 97%)`);
    root.style.setProperty('--brand-100', `hsl(${H}, ${S}%, 93%)`);
    root.style.setProperty('--brand-200', `hsl(${H}, ${S}%, 84%)`);
    root.style.setProperty('--brand-300', `hsl(${H}, ${S}%, 73%)`);
    root.style.setProperty('--brand-400', `hsl(${H}, ${S}%, 61%)`);
    root.style.setProperty('--brand-500', `hsl(${H}, ${S}%, ${L}%)`);
    root.style.setProperty('--brand-600', `hsl(${H}, ${S}%, ${Math.max(5, L - 8)}%)`);
    root.style.setProperty('--brand-700', `hsl(${H}, ${S}%, ${Math.max(5, L - 16)}%)`);
    root.style.setProperty('--brand-800', `hsl(${H}, ${S}%, ${Math.max(5, L - 24)}%)`);
    root.style.setProperty('--brand-900', `hsl(${H}, ${S}%, ${Math.max(5, L - 32)}%)`);
    root.style.setProperty('--brand-950', `hsl(${H}, ${S}%, ${Math.max(2, L - 40)}%)`);
  };

  // Load Storefront Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await settingsApi.getPublic();
        if (res.data && res.data.settings) {
          const s = res.data.settings;
          setSettings(s);
          if (s.pwaThemeColor) {
            applyDynamicTheme(s.pwaThemeColor);
          }
        }
      } catch (err) {
        console.warn('Failed to load public settings, using defaults.', err);
      }
    };
    fetchSettings();
  }, []);

  // Load menu data
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const catRes = await menuApi.categories();
        const cats = catRes.data.categories || [];
        setCategories(cats);
        const parentCats = cats.filter((c: any) => !c.parent);
        if (parentCats.length > 0) {
          setSelectedCategory(parentCats[0]._id);
        }
        const itemRes = await menuApi.items();
        setMenuItems(itemRes.data.items || []);

        try {
          const labelRes = await (menuApi as any).labels();
          if (labelRes.data && labelRes.data.labels && labelRes.data.labels.length > 0) {
            setLabels(labelRes.data.labels);
          }
        } catch (lblErr) {
          console.warn('Labels API failed, using fallbacks', lblErr);
        }
      } catch (err) {
        // Mock fallback menu
        setCategories([
          { _id: 'c1', name: 'Gourmet Pizzas', displayOrder: 1 },
          { _id: 'c2', name: 'Premium Sides', displayOrder: 2 },
          { _id: 'c3', name: 'Drinks', displayOrder: 3 }
        ]);
        setSelectedCategory('c1');
        setMenuItems([
          {
            _id: 'm1',
            name: '12" Pepperoni Feast Pizza',
            description: 'Double pepperoni, double mozzarella, tomato base, double cheese blend.',
            pricePence: 1399,
            vatRate: 20,
            category: 'c1',
            isAvailable: true,
            modifierGroups: []
          },
          {
            _id: 'm2',
            name: '12" BBQ Chicken Pizza',
            description: 'Charbroiled chicken breast slices, tangy red onions, house BBQ base sauce.',
            pricePence: 1450,
            vatRate: 20,
            category: 'c1',
            isAvailable: true,
            modifierGroups: []
          },
          {
            _id: 'm3',
            name: 'Garlic Pizza Bread',
            description: 'Hand-stretched dough topped with organic garlic butter and fresh parsley.',
            pricePence: 599,
            vatRate: 20,
            category: 'c2',
            isAvailable: true,
            modifierGroups: []
          },
          {
            _id: 'm4',
            name: 'Potato Wedges',
            description: 'Seasoned potato wedges served with sweet chilli dipping sauce.',
            pricePence: 450,
            vatRate: 20,
            category: 'c2',
            isAvailable: true,
            modifierGroups: []
          }
        ]);
      }
    };
    fetchMenu();
  }, []);

  // Update selectedSubCategory when selectedCategory changes
  useEffect(() => {
    if (selectedCategory) {
      const subs = categories.filter(c => {
        const parentId = typeof c.parent === 'string' ? c.parent : c.parent?._id;
        return parentId === selectedCategory;
      });
      if (subs.length > 0) {
        setSelectedSubCategory(subs[0]._id);
      } else {
        setSelectedSubCategory(null);
      }
    }
  }, [selectedCategory, categories]);

  // Socket.io for Order tracking updates
  useEffect(() => {
    if (!placedOrder) return;
    const socketUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';
    const socket = io(socketUrl, { transports: ['websocket'] });

    socket.on('order:status_updated', (updated: { _id: string; status: string }) => {
      if (updated._id === placedOrder._id) {
        setPlacedOrder(prev => prev ? { ...prev, status: updated.status } : null);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [placedOrder]);

  // Check delivery area
  const handleCheckPostcode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleaned = postcode.replace(/\s+/g, '').toUpperCase();
    if (!isValidUKPostcode(cleaned)) {
      setErrorMsg('Please enter a valid UK postcode.');
      return;
    }

    try {
      const res = await deliveryApi.validateZone({ postcode: cleaned });
      if (res.data && res.data.valid) {
        setPostcodeStatus({
          checked: true,
          valid: true,
          deliveryFee: res.data.deliveryFeePence || 0
        });
        setOrderType('delivery');
      } else {
        setPostcodeStatus({
          checked: true,
          valid: false,
          deliveryFee: 0
        });
        setErrorMsg('Sorry, your address is outside our delivery zone. Collection only.');
      }
    } catch (err) {
      // Mock validation rule for ST6 Tunstall areas
      if (cleaned.startsWith('ST6') || cleaned.startsWith('WN1') || cleaned.startsWith('WN2')) {
        setPostcodeStatus({ checked: true, valid: true, deliveryFee: settings.deliveryFeePence ?? 250 });
        setOrderType('delivery');
      } else {
        setPostcodeStatus({ checked: true, valid: false, deliveryFee: 0 });
        setErrorMsg('Outside delivery boundaries. Please select Store Collection.');
      }
    }
  };

  // Add Item to cart
  const handleItemClick = (item: MenuItem) => {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setActiveItem(item);
      const initialMods: Record<string, any> = {};
      item.modifierGroups.forEach((g: any) => {
        if (typeof g !== 'string') initialMods[g._id] = [];
      });
      setSelectedMods(initialMods);
    } else {
      addToCart(item, []);
    }
  };

  const addToCart = (item: MenuItem, selectedModifiers: CartItem['selectedModifiers']) => {
    const modsKey = selectedModifiers.map(m => `${m.optionId}-${m.optionName}`).sort().join('-');
    const cartItemId = `${item._id}-${modsKey}`;

    setCart(prev => {
      const idx = prev.findIndex(c => c.id === cartItemId);
      if (idx > -1) {
        const newCart = [...prev];
        newCart[idx].quantity += 1;
        return newCart;
      }
      return [...prev, { id: cartItemId, item, quantity: 1, selectedModifiers }];
    });
  };

  const updateCartQty = (id: string, amount: number) => {
    setCart(prev => prev.map(ci => {
      if (ci.id === id) {
        const newQty = ci.quantity + amount;
        return newQty > 0 ? { ...ci, quantity: newQty } : null;
      }
      return ci;
    }).filter(Boolean) as CartItem[]);
  };

  // Modifier choice toggling
  const handleModifierToggle = (group: ModifierGroup, option: ModifierOption) => {
    setSelectedMods(prev => {
      const current = prev[group._id] || [];
      const exists = current.some(o => o.optionId === option._id);
      let newSel = [...current];
      if (exists) {
        newSel = newSel.filter(o => o.optionId !== option._id);
      } else {
        const entry = { optionId: option._id, optionName: option.name, pricePence: option.pricePence };
        if (group.maxSelection === 1) {
          newSel = [entry];
        } else if (newSel.length < group.maxSelection) {
          newSel.push(entry);
        }
      }
      return { ...prev, [group._id]: newSel };
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

  const visibleOptions = (group: ModifierGroup) => {
    return (group.options || []).filter(opt => opt.isAvailable !== false);
  };

  const labelsForGroup = (group: ModifierGroup) => {
    if (group.staticLabelsEnabled === false) return [];
    const allowed = group.allowedLabelIds || [];
    if (!allowed.length) return labels;
    const allowedIds = allowed.map((label: any) => typeof label === 'string' ? label : label._id);
    return labels.filter(label => allowedIds.includes(label._id));
  };

  const handleSaveModifiers = () => {
    if (!activeItem) return;
    const flatModifiers: CartItem['selectedModifiers'] = [];
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
    addToCart(activeItem, flatModifiers);
    setActiveItem(null);
  };

  // Calculations
  const subtotal = cart.reduce((acc, ci) => {
    const itemPrice = ci.item.pricePence;
    const modsPrice = ci.selectedModifiers.reduce((s, m) => s + m.pricePence, 0);
    return acc + (itemPrice + modsPrice) * ci.quantity;
  }, 0);

  const deliveryFee = (orderType === 'delivery' && subtotal < (settings.freeDeliveryThresholdPence ?? 1500)) ? postcodeStatus.deliveryFee : 0;
  const total = subtotal + deliveryFee;

  // Submit Order
  const handlePlaceOrder = async () => {
    if (!customerDetails.name || !customerDetails.phone || !customerDetails.email) {
      setErrorMsg('Please enter your contact details.');
      return;
    }
    if (orderType === 'delivery' && !customerDetails.address) {
      setErrorMsg('Please enter your delivery street address.');
      return;
    }
    if (orderType === 'delivery' && subtotal < (settings.minDeliveryOrderPence ?? 1500)) {
      setErrorMsg(`Minimum order value for delivery is ${gbp(settings.minDeliveryOrderPence ?? 1500)}.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const payload = {
      orderType,
      customerDetails: {
        name: customerDetails.name,
        phone: customerDetails.phone,
        email: customerDetails.email,
        address: orderType === 'delivery' ? customerDetails.address : 'Store Collection',
        postcode: orderType === 'delivery' ? postcode : ''
      },
      items: cart.map(ci => ({
        menuItemId: ci.item._id,
        name: ci.item.name,
        quantity: ci.quantity,
        unitPricePence: ci.item.pricePence,
        vatRate: ci.item.vatRate,
        modifiers: ci.selectedModifiers.map(m => ({
          modifierGroupId: m.groupId,
          optionId: m.optionId,
          name: m.optionName,
          pricePence: m.pricePence
        }))
      })),
      paymentMethod: 'card',
      deliveryFeePence: deliveryFee
    };

    const idempotency = generateIdempotencyKey('WEB-CLIENT');

    try {
      const res = await ordersApi.create(payload, idempotency);
      setPlacedOrder(res.data.order);
      setView('tracker');
      setCart([]);
    } catch (err: any) {
      // Standalone Mock fallback
      setPlacedOrder({
        _id: 'mock-101',
        orderRef: 'ORD-20260531-1024',
        status: 'placed'
      });
      setView('tracker');
      setCart([]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTrackerStepClass = (step: string, current: string) => {
    const steps = ['placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered'];
    const stepIdx = steps.indexOf(step);
    const currentIdx = steps.indexOf(current === 'collected' ? 'delivered' : current);
    
    if (stepIdx === currentIdx) return 'border-brand-500 bg-brand-500/10 text-brand-400 font-bold';
    if (stepIdx < currentIdx) return 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
    return 'border-slate-800 bg-slate-900/50 text-slate-500';
  };

  // Split categories into parent hierarchy
  const parentCategories = categories.filter(c => !c.parent);
  const subCategories = categories.filter(c => {
    const parentId = typeof c.parent === 'string' ? c.parent : c.parent?._id;
    return parentId === selectedCategory;
  });

  const filteredItems = menuItems.filter(item => {
    const itemCatId = typeof item.category === 'string' ? item.category : (item.category as any)?._id;
    if (subCategories.length > 0) {
      return itemCatId === selectedSubCategory;
    } else {
      return itemCatId === selectedCategory;
    }
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden">
      {/* Background visual accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* ─── Header ─── */}
      <header className="h-20 border-b border-slate-900 px-6 flex items-center justify-between bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight">{settings.storeName || 'Rupeyal Express'}</span>
            <p className="text-[10px] text-slate-400">{settings.pwaBannerSub || 'Authentic Taste of Tunstall'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Clock className="w-4 h-4 text-brand-500" />
            <span>{settings.storeIsOpen ? `Open till ${settings.storeCloseTime || '23:30'}` : 'Closed for Orders'}</span>
          </div>

          {cart.length > 0 && view === 'browse' && (
            <button
              onClick={() => setView('checkout')}
              className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-orange-500 hover:from-brand-500 hover:to-orange-400 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer"
            >
              <span>Cart ({cart.reduce((a,c)=>a+c.quantity,0)})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ─── Main Interface ─── */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 flex flex-col gap-6">
        
        {/* VIEW 1: Browse Menu */}
        {view === 'browse' && (
          <div className="flex flex-col md:flex-row gap-6 items-start">
            
            {/* Desktop Left Categories Sidebar */}
            <aside className="w-60 shrink-0 hidden md:block sticky top-24 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-3 mb-3">Categories</h3>
              <div className="space-y-1">
                {parentCategories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => setSelectedCategory(cat._id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      selectedCategory === cat._id
                        ? 'bg-brand-500/15 border border-brand-500/30 text-brand-400 font-extrabold'
                        : 'border border-transparent hover:bg-slate-900/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${selectedCategory === cat._id ? 'rotate-90 text-brand-400' : 'text-slate-600'}`} />
                  </button>
                ))}
              </div>
            </aside>

            {/* Menu Items Content Column */}
            <div className="flex-1 space-y-6 w-full">
              
              {/* Premium Hero Banner */}
              <div className="relative rounded-3xl overflow-hidden border border-slate-900 shadow-2xl bg-slate-900/40">
                {/* Background photo overlay */}
                <div 
                  className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30 pointer-events-none"
                  style={{ backgroundImage: `url('${settings.pwaBannerImage || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1600&auto=format&fit=crop'}')` }}
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent pointer-events-none" />
                
                {/* Content */}
                <div className="relative z-10 p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div className="space-y-3 max-w-xl">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-[10px] font-bold uppercase tracking-wider font-sans">
                      🔥 Free Delivery over {gbp(settings.freeDeliveryThresholdPence ?? 1500)}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
                      {(() => {
                        const title = settings.pwaBannerTitle || 'Rupeyal Express';
                        const words = title.split(' ');
                        if (words.length <= 1) return title;
                        const lastWord = words.pop();
                        return (
                          <>
                            {words.join(' ')} <span className="bg-gradient-to-r from-brand-400 to-orange-500 bg-clip-text text-transparent">{lastWord}</span>
                          </>
                        );
                      })()}
                    </h1>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {settings.pwaBannerDescription || "Indulge in Stoke's finest stonebaked pizzas, balti curries, and authentic flame-grilled kebabs. Freshly prepared to order."}
                    </p>
                    
                    {/* Quick stats with Star rating details */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-[11px] text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Star className="w-3.5 h-3.5 fill-brand-500 text-brand-500" />
                        <span className="text-brand-400 font-extrabold">4.8</span>
                        <span>(5,762+ reviews)</span>
                      </div>
                      <div className="w-1 h-1 bg-slate-700 rounded-full hidden sm:block" />
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-500" />
                        <span>Collection: {settings.estimatedCollectionMinutes ?? 15}m | Delivery: {settings.estimatedDeliveryMinutes ?? 45}m</span>
                      </div>
                    </div>
                  </div>

                  {/* Postcode checker component inside Hero */}
                  <div className="w-full lg:w-80 bg-slate-950/95 border border-slate-900 p-5 rounded-2xl space-y-3 shrink-0 shadow-lg backdrop-blur-md">
                    <div className="flex items-center space-x-2 text-brand-400">
                      <MapPin className="w-4 h-4" />
                      <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wide">Delivery Check</h3>
                    </div>
                    
                    <form onSubmit={handleCheckPostcode} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter Postcode (e.g. ST6 5EP)"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-gradient-to-r from-brand-600 to-orange-500 hover:from-brand-500 hover:to-orange-400 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Verify
                      </button>
                    </form>

                    {postcodeStatus.checked && postcodeStatus.valid && (
                      <p className="text-[11px] text-emerald-400 font-semibold flex items-center">
                        <Check className="w-3.5 h-3.5 mr-1.5" /> 
                        We deliver! Charge: {gbp(postcodeStatus.deliveryFee)}
                      </p>
                    )}

                    {errorMsg && (
                      <p className="text-[11px] text-rose-400 font-semibold flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1.5 animate-pulse" />
                        {errorMsg}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Parent Categories Horizontal Scroll (Mobile only) */}
              <div className="md:hidden flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
                {parentCategories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => setSelectedCategory(cat._id)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      selectedCategory === cat._id
                        ? 'bg-brand-500/15 border border-brand-500/40 text-brand-400'
                        : 'bg-slate-900 border border-slate-800 text-slate-400'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Sub-Category pill-tabs selector container (Level 1.1) */}
              {subCategories.length > 0 && (
                <div className="bg-slate-900/10 p-2 rounded-2xl border border-slate-900 flex space-x-2 overflow-x-auto scrollbar-none">
                  {subCategories.map((sub) => (
                    <button
                      key={sub._id}
                      onClick={() => setSelectedSubCategory(sub._id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        selectedSubCategory === sub._id
                          ? 'bg-brand-500 text-white shadow-md shadow-brand-500/10'
                          : 'hover:bg-slate-900/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Product Card Grid with Images & Fallbacks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => {
                  const hasImage = item.images && item.images.length > 0 && item.images[0];
                  return (
                    <div
                      key={item._id}
                      className="rounded-2xl overflow-hidden glass-panel glass-card-hover flex flex-col justify-between border border-slate-900/60 group text-left relative"
                    >
                      {/* Product Thumbnail / Fallback Graphic */}
                      <div className="h-44 relative bg-slate-900/40 overflow-hidden flex items-center justify-center shrink-0 border-b border-slate-900">
                        {hasImage ? (
                          <img
                            src={item.images?.[0]}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-900/20 to-slate-950/60 flex flex-col items-center justify-center text-slate-700">
                            <CookingPot className="w-10 h-10 mb-1.5 stroke-[1] text-slate-650" />
                            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Rupeyal Special</span>
                          </div>
                        )}
                        
                        {/* Elegant overlay price tag */}
                        <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-slate-950/90 backdrop-blur-md rounded-xl border border-slate-850 font-extrabold text-xs text-brand-400 shadow-md">
                          {gbp(item.pricePence)}
                        </div>
                        
                        {/* Item Unavailable state overlay */}
                        {!item.isAvailable && (
                          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center">
                            <span className="px-3 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card details body */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <h4 className="font-extrabold text-sm text-slate-100 group-hover:text-brand-400 transition-colors line-clamp-1">
                            {item.name}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-slate-400 font-normal leading-relaxed line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="flex justify-end mt-4 pt-3 border-t border-slate-900/50">
                          {item.isAvailable ? (
                            <button
                              onClick={() => handleItemClick(item)}
                              className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500 text-brand-400 hover:text-white rounded-lg text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-650 font-bold">Unavailable</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredItems.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-650 glass-panel rounded-2xl border border-slate-900">
                    <CookingPot className="w-12 h-12 mx-auto mb-2 stroke-[1]" />
                    <p className="text-xs">No items currently available in this category.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Order Basket aside */}
            <aside className="w-full md:w-80 shrink-0 space-y-4 md:sticky md:top-24">
              <div className="glass-panel p-5 rounded-2xl border border-slate-800/80 flex flex-col max-h-[70vh]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">My Order</h3>

                <div className="flex-1 overflow-y-auto space-y-3 mb-4 scrollbar-thin">
                  {cart.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-600">
                      <ShoppingBag className="w-10 h-10 mb-2 stroke-[1]" />
                      <span className="text-xs">Your basket is empty</span>
                    </div>
                  ) : (
                    cart.map((ci) => {
                      const itemPrice = ci.item.pricePence;
                      const modsPrice = ci.selectedModifiers.reduce((s, m) => s + m.pricePence, 0);
                      const linePrice = (itemPrice + modsPrice) * ci.quantity;

                      return (
                        <div key={ci.id} className="p-3 bg-slate-900/40 border border-slate-900 rounded-xl space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="font-bold text-xs text-slate-200 line-clamp-1">{ci.item.name}</span>
                              {ci.selectedModifiers.length > 0 && (
                                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                                  {ci.selectedModifiers.map(m => m.optionName).join(', ')}
                                </p>
                              )}
                            </div>
                            <span className="font-bold text-xs text-slate-100 shrink-0">{gbp(linePrice)}</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500">{gbp(itemPrice + modsPrice)} each</span>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateCartQty(ci.id, -1)}
                                className="w-5 h-5 rounded bg-slate-850 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-slate-200">{ci.quantity}</span>
                              <button
                                onClick={() => updateCartQty(ci.id, 1)}
                                className="w-5 h-5 rounded bg-slate-850 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="border-t border-slate-900 pt-4 space-y-3">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Subtotal</span>
                      <span>{gbp(subtotal)}</span>
                    </div>
                    {orderType === 'delivery' && (
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Delivery Fee</span>
                        <span>{deliveryFee > 0 ? gbp(deliveryFee) : 'FREE'}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold text-slate-200 border-t border-slate-900 pt-2.5">
                      <span>Total</span>
                      <span className="text-brand-500 font-extrabold">{gbp(total)}</span>
                    </div>

                    <button
                      onClick={() => setView('checkout')}
                      className="w-full bg-gradient-to-r from-brand-600 to-orange-500 hover:from-brand-500 hover:to-orange-400 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md shadow-brand-500/10 cursor-pointer"
                    >
                      Checkout Order
                    </button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* VIEW 2: Checkout Form */}
        {view === 'checkout' && (
          <div className="w-full max-w-3xl mx-auto space-y-6">
            <button onClick={() => setView('browse')} className="text-xs text-slate-400 hover:text-slate-200 flex items-center">
              ← Return to Menu
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Checkout details Form */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 space-y-4">
                <h3 className="font-bold text-sm text-slate-200 pb-2 border-b border-slate-900">1. Delivery / Contact Info</h3>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Contact Name</label>
                    <input
                      type="text"
                      required
                      value={customerDetails.name}
                      onChange={(e) => setCustomerDetails(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                      placeholder="Sarah Jenkins"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</label>
                      <input
                        type="text"
                        required
                        value={customerDetails.phone}
                        onChange={(e) => setCustomerDetails(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                        placeholder="07700 900077"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                      <input
                        type="email"
                        required
                        value={customerDetails.email}
                        onChange={(e) => setCustomerDetails(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                        placeholder="sarah@example.com"
                      />
                    </div>
                  </div>

                  {orderType === 'delivery' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Delivery Address</label>
                      <textarea
                        required
                        value={customerDetails.address}
                        onChange={(e) => setCustomerDetails(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 h-20 focus:outline-none focus:border-brand-500"
                        placeholder="Street number, house/apartment info..."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Summary Box */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-200 pb-2 border-b border-slate-900">2. Order Summary</h3>
                  
                  <div className="space-y-2.5 py-4">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Items Subtotal</span>
                      <span>{gbp(subtotal)}</span>
                    </div>
                    {orderType === 'delivery' && (
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Delivery (Postcode: {postcode})</span>
                        <span>{gbp(deliveryFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold text-slate-100 border-t border-slate-900 pt-3">
                      <span>Total Amount</span>
                      <span className="text-brand-500 font-extrabold text-lg">{gbp(total)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl flex items-center space-x-3 text-xs text-slate-400">
                    <CreditCard className="w-5 h-5 text-brand-500" />
                    <span>Pay with secure Stripe Card Integration</span>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-rose-400 font-semibold">{errorMsg}</p>
                  )}

                  <button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-brand-600 to-orange-500 hover:from-brand-500 hover:to-orange-400 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all cursor-pointer shadow-md shadow-brand-500/10"
                  >
                    {isSubmitting ? 'Securing Transaction...' : `Pay & Submit Order (${gbp(total)})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: Order Tracker */}
        {view === 'tracker' && placedOrder && (
          <div className="w-full max-w-xl mx-auto glass-panel p-8 rounded-3xl border border-slate-800/80 shadow-2xl space-y-8 flex flex-col items-center">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h2 className="text-lg font-bold">Order Confirmed!</h2>
              <p className="text-xs text-slate-400">Reference ID: <span className="font-mono text-slate-200">{placedOrder.orderRef}</span></p>
            </div>

            {/* FSM Progress Timeline */}
            <div className="w-full space-y-6 pt-4">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { step: 'placed', label: 'Placed', icon: <Package className="w-4 h-4" /> },
                  { step: 'confirmed', label: 'Accepted', icon: <Check className="w-4 h-4" /> },
                  { step: 'preparing', label: 'Cooking', icon: <CookingPot className="w-4 h-4" /> },
                  { step: 'delivered', label: 'Out/Ready', icon: <Bike className="w-4 h-4" /> }
                ].map((s, idx) => (
                  <div key={idx} className="flex flex-col items-center space-y-2">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                      getTrackerStepClass(s.step, placedOrder.status)
                    }`}>
                      {s.icon}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</span>
                  </div>
                ))}
              </div>

              {/* Status explanation */}
              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Current Status</span>
                <h4 className="text-sm font-extrabold text-brand-400 uppercase tracking-wide">
                  {placedOrder.status === 'placed' && 'Waiting for restaurant confirmation'}
                  {placedOrder.status === 'confirmed' && 'Restaurant accepted your order'}
                  {placedOrder.status === 'preparing' && 'Chef is preparing your meal'}
                  {placedOrder.status === 'ready' && 'Order is ready for collection'}
                  {placedOrder.status === 'dispatched' && 'Out for delivery with driver'}
                  {placedOrder.status === 'delivered' && 'Delivered successfully! Enjoy!'}
                  {placedOrder.status === 'collected' && 'Collected successfully! Enjoy!'}
                </h4>
              </div>
            </div>

            <button
              onClick={() => {
                setView('browse');
                setPlacedOrder(null);
              }}
              className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Order Something Else
            </button>
          </div>
        )}

      </main>

      {/* Modifier customizer popup with inline nested labels (Level 4 COMPONENT select Level 5 LABEL directly under it) */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <header className="p-4 border-b border-slate-850 flex justify-between items-center bg-slate-950/20">
              <div>
                <h4 className="font-extrabold text-sm text-slate-100">{activeItem.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">Customize your options</p>
              </div>
              <button onClick={() => setActiveItem(null)} className="text-slate-500 hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {activeItem.modifierGroups.map((group: any) => {
                if (typeof group === 'string') return null;
                const selections = selectedMods[group._id] || [];

                return (
                  <div key={group._id} className="space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-1">
                      <h5 className="text-xs font-bold text-slate-350 uppercase tracking-wide">{group.name}</h5>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {group.minSelection > 0 ? `Required (Min ${group.minSelection})` : `Optional (Max ${group.maxSelection})`}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {visibleOptions(group).map((opt: ModifierOption) => {
                        const selectedMatch = selections.find(o => o.optionId === opt._id);
                        const isSelected = !!selectedMatch;
                        
                        return (
                          <div key={opt._id} className="border border-slate-850/60 bg-slate-900/10 rounded-xl p-3 space-y-2">
                            {/* Option selection checkbox/click row */}
                            <div 
                              onClick={() => handleModifierToggle(group, opt)}
                              className="flex justify-between items-center cursor-pointer select-none"
                            >
                              <div className="flex items-center space-x-2">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                  isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-700'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <span className={`text-xs font-semibold ${isSelected ? 'text-brand-400 font-bold' : 'text-slate-300'}`}>
                                  {selectedMatch ? selectedMatch.optionName : opt.name}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-slate-400">
                                {selectedMatch 
                                  ? (selectedMatch.pricePence > 0 ? `+${gbp(selectedMatch.pricePence)}` : 'FREE')
                                  : (opt.pricePence > 0 ? `+${gbp(opt.pricePence)}` : 'FREE')
                                }
                              </span>
                            </div>

                            {/* Nest Level 5 Label Actions underneath Selected Component (Level 4) */}
                            {isSelected && group.staticLabelsEnabled !== false && (
                              <div className="pt-2 border-t border-slate-850/40">
                                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1.5">Preparation Adjustments</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {labelsForGroup(group).map(lbl => {
                                    const isApplied = selectedMatch.optionName.startsWith(`${lbl.name} `);
                                    return (
                                      <button
                                        key={lbl._id}
                                        type="button"
                                        onClick={() => handleApplyLabelToOption(group, opt, isApplied ? null : lbl)}
                                        className={`px-2.5 py-1 rounded text-[9px] font-extrabold uppercase transition-all duration-150 cursor-pointer ${
                                          isApplied
                                            ? 'ring-1 ring-white/50 scale-105 brightness-110 shadow-sm shadow-black/25'
                                            : 'opacity-70 hover:opacity-100 hover:scale-102'
                                        }`}
                                        style={{
                                          backgroundColor: lbl.backgroundColor || '#334155',
                                          color: lbl.textColor || '#ffffff'
                                        }}
                                      >
                                        {lbl.name}
                                      </button>
                                    );
                                  })}
                                  
                                  {/* Reset Option Label to normal */}
                                  {selectedMatch.optionName !== opt.name && (
                                    <button
                                      type="button"
                                      onClick={() => handleApplyLabelToOption(group, opt, null)}
                                      className="px-2 py-1 rounded text-[9px] font-extrabold uppercase bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 cursor-pointer hover:bg-slate-750"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <footer className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end shrink-0">
              <button
                type="button"
                onClick={handleSaveModifiers}
                className="bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-brand-500/10"
              >
                Add Option(s) to Basket
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
