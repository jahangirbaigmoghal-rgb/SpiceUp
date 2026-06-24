import { motion } from 'framer-motion';
import { Plus, CookingPot } from 'lucide-react';
import { gbp } from '@spiceup/utils';
import type { MenuItem } from '../../types';

interface ProductCardProps {
  item: MenuItem;
  index?: number;
  onAdd: (item: MenuItem) => void;
}

export function ProductCard({ item, index = 0, onAdd }: ProductCardProps) {
  const hasImage = item.images?.[0];

  return (
    <motion.article
      className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4), ease: 'easeOut' }}
    >
      {/* Image / fallback */}
      <div className="relative h-44 bg-slate-100 overflow-hidden">
        {hasImage ? (
          <img
            src={item.images![0]}
            alt={item.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand-50 to-orange-100/50 flex flex-col items-center justify-center">
            <CookingPot className="w-10 h-10 text-brand-300 mb-1.5" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-brand-400">
              Chef's Special
            </span>
          </div>
        )}

        {/* Price tag */}
        <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-md border border-slate-100">
          <span className="font-extrabold text-sm text-brand-600">
            {gbp(item.pricePence)}
          </span>
        </div>

        {/* Sold out overlay */}
        {!item.isAvailable && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-4 py-1.5 bg-red-500 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-md">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="space-y-1.5 mb-3">
          <h3 className="font-bold text-sm text-slate-900 line-clamp-1 transition-colors group-hover:text-brand-600">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100 flex justify-end">
          {item.isAvailable ? (
            <button
              onClick={() => onAdd(item)}
              className="inline-flex items-center gap-1.5 h-9 px-4 bg-brand-50 hover:bg-brand-500 text-brand-600 hover:text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
              aria-label={`Add ${item.name} to cart`}
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          ) : (
            <span className="text-xs text-slate-400 font-bold py-2">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}
