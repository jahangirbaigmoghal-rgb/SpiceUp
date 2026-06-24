import { ChevronRight } from 'lucide-react';
import type { Category } from '../../types';

interface CategoryNavProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Desktop sidebar — vertical category list */
export function CategorySidebar({
  categories,
  selectedId,
  onSelect,
}: CategoryNavProps) {
  return (
    <aside className="hidden md:block w-60 shrink-0 sticky top-20 self-start">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 mb-3">
        Categories
      </h3>
      <nav className="space-y-1">
        {categories.map((cat) => {
          const active = selectedId === cat._id;
          return (
            <button
              key={cat._id}
              onClick={() => onSelect(cat._id)}
              className={`relative w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between cursor-pointer ${
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-brand-500" />
              )}
              <span>{cat.name}</span>
              <ChevronRight
                className={`w-4 h-4 transition-transform ${
                  active ? 'rotate-90 text-brand-500' : 'text-slate-300'
                }`}
              />
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

/** Mobile horizontal scrollable pills */
export function CategoryPills({
  categories,
  selectedId,
  onSelect,
}: CategoryNavProps) {
  return (
    <div className="md:hidden -mx-6 px-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {categories.map((cat) => {
        const active = selectedId === cat._id;
        return (
          <button
            key={cat._id}
            onClick={() => onSelect(cat._id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 cursor-pointer ${
              active
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
