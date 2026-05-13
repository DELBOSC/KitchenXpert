import React from 'react';

import { cn } from './_utils';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const sizes: Record<Size, string> = {
  sm: 'max-w-3xl',
  md: 'max-w-5xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
};

export function Container({
  className,
  size = 'xl',
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { size?: Size }): React.ReactElement {
  return <div className={cn('mx-auto w-full px-6', sizes[size], className)} {...rest} />;
}

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, breadcrumb, className }: PageHeaderProps): React.ReactElement {
  return (
    <header className={cn('mb-10', className)}>
      {breadcrumb && <div className="mb-3 text-sm text-white/50">{breadcrumb}</div>}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
          {description && <p className="mt-2 text-white/60">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
