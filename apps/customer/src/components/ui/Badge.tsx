import type { ReactNode } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: any[]) => twMerge(clsx(inputs));

type Tone = 'brand' | 'success' | 'danger' | 'neutral' | 'info';

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  solid?: boolean;
}

const toneClasses: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
  success: 'bg-green-50 text-green-700 border-green-100',
  danger: 'bg-red-50 text-red-700 border-red-100',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  info: 'bg-blue-50 text-blue-700 border-blue-100',
};

const solidToneClasses: Record<Tone, string> = {
  brand: 'bg-brand-500 text-white border-brand-500',
  success: 'bg-green-600 text-white border-green-600',
  danger: 'bg-red-600 text-white border-red-600',
  neutral: 'bg-slate-700 text-white border-slate-700',
  info: 'bg-blue-600 text-white border-blue-600',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
  solid = false,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border',
        solid ? solidToneClasses[tone] : toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
