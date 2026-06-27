import React from 'react';

import { cn } from './_utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-white/60">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Quelque chose a mal tourné',
  description,
  onRetry,
  className,
}: ErrorStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/5 p-12 text-center',
        className
      )}
    >
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="h-5 w-5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-white/60">{description}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="kx-focus mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
