import { Check } from 'lucide-react';
import React, { forwardRef, useId } from 'react';

import { cn } from './_utils';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>((
  { className, label, description, id, checked, defaultChecked, ...rest },
  ref,
) => {
  const autoId = useId();
  const inputId = id || autoId;
  // We style from the input's :checked state using a sibling span with
  // peer-checked, and keep the icon visible via CSS opacity animation.
  return (
    <label htmlFor={inputId} className={cn('group flex cursor-pointer items-start gap-3', className)}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        className="peer sr-only"
        {...rest}
      />
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-white/20 bg-white/5 transition',
          'peer-checked:border-transparent peer-checked:bg-gradient-to-br peer-checked:from-indigo-400 peer-checked:to-fuchsia-500',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400/60 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#0a0a0f]',
          'group-hover:border-white/30',
          '[&_svg]:opacity-0 peer-checked:[&_svg]:opacity-100',
        )}
      >
        <Check className="h-3.5 w-3.5 text-white transition" strokeWidth={3} />
      </span>
      {(label || description) && (
        <span className="text-sm">
          {label && <span className="block text-white/90">{label}</span>}
          {description && <span className="mt-0.5 block text-xs text-white/50">{description}</span>}
        </span>
      )}
    </label>
  );
});
