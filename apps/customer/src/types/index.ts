// ─── Menu Data ───────────────────────────────────────────
export interface ModifierOption {
  _id: string;
  name: string;
  pricePence: number;
  isAvailable?: boolean;
}

export interface ModifierGroup {
  _id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  options: ModifierOption[];
  staticLabelsEnabled?: boolean;
  allowedLabelIds?: Array<string | { _id: string }>;
}

export interface MenuItem {
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

export interface Category {
  _id: string;
  name: string;
  displayOrder: number;
  parent?: any;
  backgroundColor?: string;
  textColor?: string;
}

export interface Label {
  _id: string;
  name: string;
  backgroundColor?: string;
  textColor?: string;
}

// ─── Cart ─────────────────────────────────────────────────
export interface CartModifier {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  pricePence: number;
}

export interface CartItem {
  id: string;
  item: MenuItem;
  quantity: number;
  selectedModifiers: CartModifier[];
}

// ─── Order ────────────────────────────────────────────────
export type OrderType = 'takeaway' | 'delivery';

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'dispatched'
  | 'delivered'
  | 'collected';

export interface PlacedOrder {
  _id: string;
  orderRef: string;
  status: OrderStatus;
}

// ─── Settings ────────────────────────────────────────────
export interface StoreSettings {
  storeName: string;
  storePhone: string;
  storeEmail: string;
  storeAddress: string;
  storeOpenTime: string;
  storeCloseTime: string;
  storeIsOpen: boolean;
  deliveryFeePence: number;
  minDeliveryOrderPence: number;
  freeDeliveryThresholdPence: number;
  estimatedDeliveryMinutes: number;
  estimatedCollectionMinutes: number;
  pwaThemeColor: string;
  pwaBannerTitle: string;
  pwaBannerSub: string;
  pwaBannerDescription: string;
  pwaBannerImage: string;
}

// ─── Delivery ───────────────────────────────────────────
export interface PostcodeCheckResult {
  checked: boolean;
  valid: boolean;
  deliveryFee: number;
}

// ─── Customer Details ────────────────────────────────────
export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
}
