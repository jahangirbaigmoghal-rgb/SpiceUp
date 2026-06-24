import { Package, Check, CookingPot, Bike } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import type { OrderStatus } from '../../types';

const STEPS: { step: OrderStatus; label: string; icon: ReactNode }[] = [
  { step: 'placed', label: 'Placed', icon: <Package className="w-5 h-5" /> },
  { step: 'confirmed', label: 'Accepted', icon: <Check className="w-5 h-5" /> },
  {
    step: 'preparing',
    label: 'Cooking',
    icon: <CookingPot className="w-5 h-5" />,
  },
  { step: 'delivered', label: 'Out/Ready', icon: <Bike className="w-5 h-5" /> },
];

const ORDER: OrderStatus[] = [
  'placed',
  'confirmed',
  'preparing',
  'ready',
  'dispatched',
  'delivered',
];

function getState(
  step: OrderStatus,
  current: OrderStatus
): 'completed' | 'current' | 'upcoming' {
  // normalize 'collected' → 'delivered'
  const norm = current === 'collected' ? 'delivered' : current;
  const stepIdx = ORDER.indexOf(step);
  const curIdx = ORDER.indexOf(norm);
  if (stepIdx === curIdx) return 'current';
  if (stepIdx < curIdx) return 'completed';
  return 'upcoming';
}

const stateClasses = {
  completed:
    'border-green-500 bg-green-50 text-green-600',
  current:
    'border-brand-500 bg-brand-50 text-brand-600 ring-4 ring-brand-100',
  upcoming: 'border-slate-200 bg-slate-50 text-slate-300',
} as const;

const lineClasses = {
  completed: 'bg-green-500',
  current: 'bg-brand-500',
  upcoming: 'bg-slate-200',
} as const;

interface StatusTimelineProps {
  status: OrderStatus;
}

export function StatusTimeline({ status }: StatusTimelineProps) {
  return (
    <div className="w-full">
      <div className="relative flex justify-between">
        {/* connecting line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-100 -z-0" />
        {STEPS.map((s, idx) => {
          const state = getState(s.step, status);
          return (
            <motion.div
              key={idx}
              className="relative z-10 flex flex-col items-center gap-2 flex-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.15, duration: 0.4 }}
            >
              {/* Connector segment (left of node, except first) */}
              {idx > 0 && (
                <div
                  className={`absolute top-[19px] -left-1/2 w-full h-0.5 ${
                    state === 'completed' || state === 'current'
                      ? lineClasses.current
                      : lineClasses.upcoming
                  }`}
                />
              )}
              <div
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${stateClasses[state]}`}
              >
                {s.icon}
              </div>
              <span
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-wide ${
                  state === 'upcoming' ? 'text-slate-400' : 'text-slate-700'
                }`}
              >
                {s.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
