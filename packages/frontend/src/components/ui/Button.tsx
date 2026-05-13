import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import React, { forwardRef } from 'react';

import { cn } from './_utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-white text-gray-900 hover:bg-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_40px_rgba(255,255,255,0.12)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_8px_60px_rgba(255,255,255,0.25)]',
  secondary:
    'bg-white/10 text-white hover:bg-white/15 border border-white/10',
  ghost:
    'bg-transparent text-white/80 hover:bg-white/5 hover:text-white',
  outline:
    'bg-transparent border border-white/15 text-white hover:bg-white/5 hover:border-white/25',
  danger:
    'bg-rose-500/90 text-white hover:bg-rose-500 shadow-[0_0_0_1px_rgba(244,63,94,0.3),0_8px_24px_rgba(244,63,94,0.3)]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-full gap-1.5',
  md: 'h-10 px-5 text-sm rounded-full gap-2',
  lg: 'h-12 px-7 text-sm rounded-full gap-2',
  icon: 'h-10 w-10 rounded-full',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((
  { className, variant = 'primary', size = 'md', loading, disabled, leftIcon, rightIcon, fullWidth, children, ...rest },
  ref,
) => {
  const isDisabled = disabled || loading;
  return (
    <motion.button
      ref={ref}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
      whileHover={isDisabled ? undefined : { y: -1 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'kx-focus inline-flex items-center justify-center font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </motion.button>
  );
});
