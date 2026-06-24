import type { StoreSettings, Label, Category, MenuItem } from '../types';

export const DEFAULT_SETTINGS: StoreSettings = {
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
  pwaBannerDescription:
    "Indulge in Stoke's finest stonebaked pizzas, balti curries, and authentic flame-grilled kebabs. Freshly prepared to order.",
  pwaBannerImage:
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1600&auto=format&fit=crop',
};

export const DEFAULT_LABELS: Label[] = [
  { _id: 'l1', name: 'NO', backgroundColor: '#ef4444', textColor: '#ffffff' },
  { _id: 'l2', name: 'LESS', backgroundColor: '#f59e0b', textColor: '#ffffff' },
  { _id: 'l3', name: 'ON CHIPS', backgroundColor: '#3b82f6', textColor: '#ffffff' },
  { _id: 'l4', name: 'ON BURGER', backgroundColor: '#10b981', textColor: '#ffffff' },
  { _id: 'l5', name: 'ALL OVER', backgroundColor: '#8b5cf6', textColor: '#ffffff' },
  { _id: 'l6', name: 'ON HALF', backgroundColor: '#ec4899', textColor: '#ffffff' },
];

export const FALLBACK_CATEGORIES: Category[] = [
  { _id: 'c1', name: 'Gourmet Pizzas', displayOrder: 1 },
  { _id: 'c2', name: 'Premium Sides', displayOrder: 2 },
  { _id: 'c3', name: 'Drinks', displayOrder: 3 },
];

export const FALLBACK_ITEMS: MenuItem[] = [
  {
    _id: 'm1',
    name: '12" Pepperoni Feast Pizza',
    description:
      'Double pepperoni, double mozzarella, tomato base, double cheese blend.',
    pricePence: 1399,
    vatRate: 20,
    category: 'c1',
    isAvailable: true,
    modifierGroups: [],
  },
  {
    _id: 'm2',
    name: '12" BBQ Chicken Pizza',
    description:
      'Charbroiled chicken breast slices, tangy red onions, house BBQ base sauce.',
    pricePence: 1450,
    vatRate: 20,
    category: 'c1',
    isAvailable: true,
    modifierGroups: [],
  },
  {
    _id: 'm3',
    name: 'Garlic Pizza Bread',
    description:
      'Hand-stretched dough topped with organic garlic butter and fresh parsley.',
    pricePence: 599,
    vatRate: 20,
    category: 'c2',
    isAvailable: true,
    modifierGroups: [],
  },
  {
    _id: 'm4',
    name: 'Potato Wedges',
    description:
      'Seasoned potato wedges served with sweet chilli dipping sauce.',
    pricePence: 450,
    vatRate: 20,
    category: 'c2',
    isAvailable: true,
    modifierGroups: [],
  },
];
