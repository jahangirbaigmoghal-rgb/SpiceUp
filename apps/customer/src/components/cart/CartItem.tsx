import { Minus, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { gbp } from '@spiceup/utils';
import type { CartItem as CartItemType } from '../../types';

interface CartItemProps {
  item: CartItemType;
  onUpdateQty: (id: string, delta: number) => void;
}

export function CartItem({ item, onUpdateQty }: CartItemProps) {
  const itemPrice = item.item.pricePence;
  const modsPrice = item.selectedModifiers.reduce(
    (s, m) => s + m.pricePence,
    0
  );
  const linePrice = (itemPrice + modsPrice) * item.quantity;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <span className="font-bold text-sm text-slate-900 line-clamp-1">
            {item.item.name}
          </span>
          {item.selectedModifiers.length > 0 && (
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              {item.selectedModifiers.map((m) => m.optionName).join(', ')}
            </p>
          )}
        </div>
        <span className="font-bold text-sm text-slate-900 shrink-0">
          {gbp(linePrice)}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">
          {gbp(itemPrice + modsPrice)} each
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onUpdateQty(item.id, -1)}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-brand-400 hover:text-brand-600 transition-colors cursor-pointer"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm font-bold text-slate-900 w-6 text-center">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQty(item.id, 1)}
            className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:border-brand-400 hover:text-brand-600 transition-colors cursor-pointer"
            aria-label="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
