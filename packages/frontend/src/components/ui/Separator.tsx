import React from 'react';

import { cn } from './_utils';

export function Separator({
  orientation = 'horizontal',
  className,
  label,
}: {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
}): React.ReactElement {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-widest text-white/40">{label}</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
    );
  }
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === 'horizontal' ? 'h-px w-full bg-white/10' : 'h-full w-px bg-white/10',
        className
      )}
    />
  );
}
