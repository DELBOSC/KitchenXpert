import React, { forwardRef, useId } from 'react';
import { cn } from './_utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, description, error, leftIcon, rightIcon, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id || autoId;
  const describedBy = description ? `${inputId}-desc` : error ? `${inputId}-err` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-white/90">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            'kx-focus h-11 w-full rounded-xl border bg-white/5 px-4 text-sm text-white placeholder:text-white/30',
            'transition-colors',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error
              ? 'border-rose-500/50 focus-visible:ring-rose-500/50'
              : 'border-white/10 hover:border-white/20 focus-visible:border-white/30',
            className,
          )}
          {...rest}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">{rightIcon}</span>
        )}
      </div>
      {description && !error && (
        <p id={`${inputId}-desc`} className="mt-1.5 text-xs text-white/50">{description}</p>
      )}
      {error && (
        <p id={`${inputId}-err`} className="mt-1.5 text-xs text-rose-400">{error}</p>
      )}
    </div>
  );
});
