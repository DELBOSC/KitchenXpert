import React from 'react';

import { cn } from './_utils';

export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      role="status"
      aria-label="Chargement en cours"
      className={cn(
        'relative overflow-hidden rounded-md bg-white/[0.04]',
        'after:absolute after:inset-0 after:-translate-x-full',
        'after:animate-[kx-shimmer_1.8s_infinite]',
        'after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent',
        className,
      )}
      {...rest}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }): React.ReactElement {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
