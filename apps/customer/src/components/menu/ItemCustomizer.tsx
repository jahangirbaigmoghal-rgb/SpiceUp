import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { gbp } from '@spiceup/utils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type {
  MenuItem,
  ModifierGroup,
  ModifierOption,
  Label,
} from '../../types';

interface SelectedOption {
  optionId: string;
  optionName: string;
  pricePence: number;
}

interface ItemCustomizerProps {
  item: MenuItem | null;
  labels: Label[];
  selectedMods: Record<string, SelectedOption[]>;
  onClose: () => void;
  onToggleOption: (group: ModifierGroup, option: ModifierOption) => void;
  onApplyLabel: (
    group: ModifierGroup,
    option: ModifierOption,
    label: Label | null
  ) => void;
  onSave: () => void;
}

export function ItemCustomizer({
  item,
  labels,
  selectedMods,
  onClose,
  onToggleOption,
  onApplyLabel,
  onSave,
}: ItemCustomizerProps) {
  // Compute running total for the footer
  const computedTotal = useMemo(() => {
    if (!item) return 0;
    let extra = 0;
    Object.values(selectedMods).forEach((arr) =>
      arr.forEach((o) => (extra += o.pricePence))
    );
    return item.pricePence + extra;
  }, [item, selectedMods]);

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={item?.name}
      subtitle="Customize your options"
      maxWidth="max-w-lg"
    >
      {item && (
        <div className="flex flex-col max-h-[70vh]">
          {/* Modifier groups (scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {item.modifierGroups.map((g: any) => {
              if (typeof g === 'string') return null;
              const group = g as ModifierGroup;
              const selections = selectedMods[group._id] || [];

              return (
                <div key={group._id} className="space-y-2.5">
                  <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      {group.name}
                    </h4>
                    <span className="text-xs font-semibold text-slate-400">
                      {group.minSelection > 0
                        ? `Required (Min ${group.minSelection})`
                        : `Optional (Max ${group.maxSelection})`}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {visibleOptions(group).map((opt) => {
                      const match = selections.find(
                        (o) => o.optionId === opt._id
                      );
                      const isSelected = !!match;

                      return (
                        <div
                          key={opt._id}
                          className="border border-slate-200 rounded-xl p-3 space-y-2 hover:border-slate-300 transition-colors"
                        >
                          {/* Option row */}
                          <div
                            onClick={() => onToggleOption(group, opt)}
                            className="flex justify-between items-center cursor-pointer select-none"
                            role="checkbox"
                            aria-checked={isSelected}
                            tabIndex={0}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'border-brand-500 bg-brand-500'
                                    : 'border-slate-300'
                                }`}
                              >
                                {isSelected && (
                                  <Check className="w-3 h-3 text-white stroke-[3]" />
                                )}
                              </div>
                              <span
                                className={`text-sm font-semibold ${
                                  isSelected
                                    ? 'text-brand-600'
                                    : 'text-slate-700'
                                }`}
                              >
                                {match ? match.optionName : opt.name}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-slate-500">
                              {match
                                ? match.pricePence > 0
                                  ? `+${gbp(match.pricePence)}`
                                  : 'FREE'
                                : opt.pricePence > 0
                                ? `+${gbp(opt.pricePence)}`
                                : 'FREE'}
                            </span>
                          </div>

                          {/* Label adjustments */}
                          {isSelected &&
                            group.staticLabelsEnabled !== false && (
                              <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-2">
                                  Preparation Adjustments
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {labelsForGroup(group, labels).map((lbl) => {
                                    const isApplied = match!.optionName.startsWith(
                                      `${lbl.name} `
                                    );
                                    return (
                                      <button
                                        key={lbl._id}
                                        type="button"
                                        onClick={() =>
                                          onApplyLabel(
                                            group,
                                            opt,
                                            isApplied ? null : lbl
                                          )
                                        }
                                        className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                                          isApplied
                                            ? 'ring-2 ring-slate-400 scale-105 shadow-sm'
                                            : 'opacity-70 hover:opacity-100'
                                        }`}
                                        style={{
                                          backgroundColor:
                                            lbl.backgroundColor || '#334155',
                                          color: lbl.textColor || '#ffffff',
                                        }}
                                      >
                                        {lbl.name}
                                      </button>
                                    );
                                  })}

                                  {match!.optionName !== opt.name && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onApplyLabel(group, opt, null)
                                      }
                                      className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 cursor-pointer"
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

          {/* Footer */}
          <footer className="p-5 border-t border-slate-100 flex justify-between items-center gap-4">
            <div>
              <span className="text-xs text-slate-400 font-medium block">
                Total
              </span>
              <span className="text-lg font-extrabold text-brand-600">
                {gbp(computedTotal)}
              </span>
            </div>
            <Button onClick={onSave} size="md" className="flex-1 max-w-[260px]">
              Add to Basket
            </Button>
          </footer>
        </div>
      )}
    </Modal>
  );
}

// ─── Helpers ─────────────────────────────────────────────
function visibleOptions(group: ModifierGroup): ModifierOption[] {
  return (group.options || []).filter((o) => o.isAvailable !== false);
}

function labelsForGroup(
  group: ModifierGroup,
  labels: Label[]
): Label[] {
  if (group.staticLabelsEnabled === false) return [];
  const allowed = group.allowedLabelIds || [];
  if (!allowed.length) return labels;
  const ids = allowed.map((l: any) => (typeof l === 'string' ? l : l._id));
  return labels.filter((l) => ids.includes(l._id));
}
