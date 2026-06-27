import React from 'react';

import { cn } from './_utils';

export function Label({
  className,
  required,
  children,
  ...rest
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }): React.ReactElement {
  return (
    <label className={cn('block text-sm font-medium text-white/90', className)} {...rest}>
      {children}
      {required && (
        <span className="ml-0.5 text-rose-400" aria-hidden>
          *
        </span>
      )}
    </label>
  );
}
