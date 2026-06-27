import React from 'react';

import { cn } from './_utils';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

const variants: Record<Variant, string> = {
  default: 'bg-white/10 text-white/90 border border-white/10',
  success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/20',
  info: 'bg-blue-500/15 text-blue-300 border border-blue-500/20',
  outline: 'bg-transparent text-white/80 border border-white/20',
};

export function Badge({
  className,
  variant = 'default',
  dot,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
  dot?: boolean;
}): React.ReactElement {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...rest}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
