import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';

import { cn } from './_utils';

interface TooltipProps {
  label: React.ReactNode;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

const positions = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
};

/**
 * Lightweight hover tooltip. Shows on hover and keyboard focus. For complex
 * content / portal placement, we can later graduate to Radix's primitive.
 */
export function Tooltip({ label, children, side = 'top', delay = 300, className }: TooltipProps): React.ReactElement {
  const [visible, setVisible] = useState(false);
  const timerRef = React.useRef<number | null>(null);

  const show = (): void => {
    if (timerRef.current) {window.clearTimeout(timerRef.current);}
    timerRef.current = window.setTimeout(() => setVisible(true), delay);
  };
  const hide = (): void => {
    if (timerRef.current) {window.clearTimeout(timerRef.current);}
    setVisible(false);
  };

  return (
    <span className="relative inline-flex">
      {React.cloneElement(children, {
        onMouseEnter: show,
        onMouseLeave: hide,
        onFocus: show,
        onBlur: hide,
      })}
      <AnimatePresence>
        {visible && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: side === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-white/10 bg-[#0d0d14] px-2.5 py-1 text-xs text-white shadow-lg',
              positions[side],
              className,
            )}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
