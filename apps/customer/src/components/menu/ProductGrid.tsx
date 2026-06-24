import { CookingPot } from 'lucide-react';
import { ProductCard } from './ProductCard';
import type { MenuItem } from '../../types';

interface ProductGridProps {
  items: MenuItem[];
  onAdd: (item: MenuItem) => void;
}

export function ProductGrid({ items, onAdd }: ProductGridProps) {
  if (items.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
        <CookingPot className="w-12 h-12 mx-auto mb-3 text-brand-300" />
        <p className="text-sm text-slate-500 font-medium">
          No items currently available in this category.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, idx) => (
        <ProductCard key={item._id} item={item} index={idx} onAdd={onAdd} />
      ))}
    </div>
  );
}
