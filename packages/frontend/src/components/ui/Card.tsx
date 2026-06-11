import React from 'react';

import { cn } from './_utils';

type CardProps = React.HTMLAttributes<HTMLElement> & {
  variant?: 'default' | 'elevated' | 'interactive' | 'glass';
  as?: React.ElementType;
};

const variants = {
  default: 'border border-white/10 bg-white/[0.03]',
  elevated: 'border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
  interactive: 'border border-white/10 bg-white/[0.03] transition hover:border-white/20 hover:bg-white/[0.05] cursor-pointer',
  glass: 'border border-white/10 bg-white/[0.03] backdrop-blur-xl',
};

export function Card({ as: Component = 'div', className, variant = 'default', ...rest }: CardProps): React.ReactElement {
  return <Component className={cn('rounded-2xl', variants[variant], className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('border-b border-white/5 px-6 py-4', className)} {...rest} />;
}

export function CardTitle({ className, children, ...rest }: React.HTMLAttributes<HTMLHeadingElement>): React.ReactElement {
  return <h3 className={cn('text-base font-semibold tracking-tight text-white', className)} {...rest}>{children}</h3>;
}

export function CardDescription({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>): React.ReactElement {
  return <p className={cn('mt-1 text-sm text-white/60', className)} {...rest} />;
}

export function CardBody({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('p-6', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return <div className={cn('flex items-center justify-end gap-2 border-t border-white/5 px-6 py-4', className)} {...rest} />;
}
