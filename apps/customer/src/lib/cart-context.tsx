import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { CartItem, MenuItem, CartModifier, OrderType } from '../types';

// ─── Context shape ───────────────────────────────────────
interface CartContextValue {
  items: CartItem[];
  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  addItem: (item: MenuItem, modifiers: CartModifier[]) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
}

const CartContext = createContext<CartContextValue | null>(null);

// ─── Persist key ────────────────────────────────────────
const STORAGE_KEY = 'spiceup-cart';

function loadPersistedCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function persistCart(items: CartItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

// ─── Provider ───────────────────────────────────────────
export function CartProvider({
  freeDeliveryThreshold = 1500,
  baseDeliveryFee = 0,
  children,
}: {
  freeDeliveryThreshold?: number;
  baseDeliveryFee?: number;
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>(loadPersistedCart);
  const [orderType, setOrderType] = useState<OrderType>('takeaway');

  // Persist on every change
  useEffect(() => {
    persistCart(items);
  }, [items]);

  const addItem = useCallback(
    (item: MenuItem, modifiers: CartModifier[]) => {
      const modsKey = modifiers
        .map((m) => `${m.optionId}-${m.optionName}`)
        .sort()
        .join('-');
      const cartItemId = `${item._id}-${modsKey}`;

      setItems((prev) => {
        const idx = prev.findIndex((c) => c.id === cartItemId);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
          return next;
        }
        return [
          ...prev,
          { id: cartItemId, item, quantity: 1, selectedModifiers: modifiers },
        ];
      });
    },
    []
  );

  const updateQuantity = useCallback((id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((ci) =>
          ci.id === id ? { ...ci, quantity: ci.quantity + delta } : ci
        )
        .filter((ci) => ci.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((a, c) => a + c.quantity, 0);

  const subtotal = items.reduce((acc, ci) => {
    const modsPrice = ci.selectedModifiers.reduce(
      (s, m) => s + m.pricePence,
      0
    );
    return acc + (ci.item.pricePence + modsPrice) * ci.quantity;
  }, 0);

  const deliveryFee =
    orderType === 'delivery' && subtotal < freeDeliveryThreshold
      ? baseDeliveryFee
      : 0;

  const total = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        items,
        orderType,
        setOrderType,
        addItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        deliveryFee,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}
