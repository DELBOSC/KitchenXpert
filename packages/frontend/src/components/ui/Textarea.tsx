import React, { forwardRef, useId } from 'react';

import { cn } from './_utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>((
  { className, label, description, error, id, rows = 4, ...rest },
  ref,
) => {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-white/90">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={!!error}
        className={cn(
          'kx-focus w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30',
          'resize-y transition-colors',
          error
            ? 'border-rose-500/50'
            : 'border-white/10 hover:border-white/20 focus-visible:border-white/30',
          className,
        )}
        {...rest}
      />
      {description && !error && <p className="mt-1.5 text-xs text-white/50">{description}</p>}
      {error && <p className="mt-1.5 text-xs text-rose-400">{error}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';
