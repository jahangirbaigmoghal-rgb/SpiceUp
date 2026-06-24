import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: any[]) => twMerge(clsx(inputs));

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padded?: boolean;
  children: ReactNode;
}

export function Card({
  hoverable = false,
  padded = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-200 shadow-sm',
        hoverable &&
          'transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5',
        padded && 'p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
