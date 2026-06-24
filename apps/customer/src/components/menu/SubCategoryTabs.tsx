import type { Category } from '../../types';

interface SubCategoryTabsProps {
  subCategories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SubCategoryTabs({
  subCategories,
  selectedId,
  onSelect,
}: SubCategoryTabsProps) {
  if (subCategories.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {subCategories.map((sub) => {
        const active = selectedId === sub._id;
        return (
          <button
            key={sub._id}
            onClick={() => onSelect(sub._id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0 cursor-pointer ${
              active
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {sub.name}
          </button>
        );
      })}
    </div>
  );
}
