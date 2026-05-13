import React, { forwardRef, useId } from 'react';

import { cn } from './_utils';

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: React.ReactNode;
  description?: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>((
  { className, label, description, id, checked, defaultChecked, ...rest },
  ref,
) => {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <label htmlFor={inputId} className={cn('flex cursor-pointer items-center justify-between gap-4', className)}>
      {(label || description) && (
        <span className="text-sm">
          {label && <span className="block text-white/90">{label}</span>}
          {description && <span className="mt-0.5 block text-xs text-white/50">{description}</span>}
        </span>
      )}
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        role="switch"
        checked={checked}
        defaultChecked={defaultChecked}
        className="peer sr-only"
        {...rest}
      />
      <span
        aria-hidden
        className={cn(
          'relative h-6 w-11 flex-shrink-0 rounded-full border border-white/15 bg-white/5 transition-colors',
          'peer-checked:border-transparent peer-checked:bg-gradient-to-r peer-checked:from-indigo-400 peer-checked:to-fuchsia-500',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0a0a0f]',
          'after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform',
          'peer-checked:after:translate-x-5',
        )}
      />
    </label>
  );
});
