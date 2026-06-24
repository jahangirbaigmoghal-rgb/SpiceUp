import { AnimatePresence } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { useCart } from '../../lib/cart-context';
import type { OrderType } from '../../types';

interface CartSidebarProps {
  orderType: OrderType;
}

export function CartSidebar({ orderType }: CartSidebarProps) {
  const { items, updateQuantity } = useCart();

  return (
    <aside className="w-full md:w-80 shrink-0 space-y-4 md:sticky md:top-20 self-start">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col max-h-[70vh]">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
          My Order
        </h3>

        {/* Items */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 scrollbar-thin">
          {items.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-300">
              <ShoppingBag className="w-10 h-10 mb-2" />
              <span className="text-sm text-slate-400">
                Your basket is empty
              </span>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {items.map((ci) => (
                <CartItem
                  key={ci.id}
                  item={ci}
                  onUpdateQty={updateQuantity}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Summary + checkout */}
        {items.length > 0 && <CartSummary orderType={orderType} />}
      </div>
    </aside>
  );
}
