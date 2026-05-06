import React, { forwardRef, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from './_utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, description, error, id, children, ...rest },
  ref,
) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-white/90">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          className={cn(
            'kx-focus h-11 w-full appearance-none rounded-xl border bg-white/5 pl-4 pr-10 text-sm text-white',
            'transition-colors',
            error ? 'border-rose-500/50' : 'border-white/10 hover:border-white/20 focus-visible:border-white/30',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden />
      </div>
      {description && !error && <p className="mt-1.5 text-xs text-white/50">{description}</p>}
      {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
    </div>
  );
});
