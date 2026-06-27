/**
 * Tooltip Component
 * Tooltip with various positions and trigger modes
 */

import React, {
  forwardRef,
  useState,
  useRef,
  useCallback,
  useEffect,
  type HTMLAttributes,
  type ReactNode,
  type ReactElement,
} from 'react';
import styled, { css, keyframes } from 'styled-components';

// Types
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
export type TooltipTrigger = 'hover' | 'click' | 'focus' | 'manual';
export type TooltipSize = 'sm' | 'md' | 'lg';

export interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content'> {
  content: ReactNode;
  position?: TooltipPosition;
  trigger?: TooltipTrigger | TooltipTrigger[];
  size?: TooltipSize;
  delay?: number;
  hideDelay?: number;
  disabled?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  arrow?: boolean;
  maxWidth?: number | string;
  children: ReactElement;
}

// Animations
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.95);
  }
`;

// Size styles
const sizeStyles = {
  sm: css`
    padding: 4px 8px;
    font-size: 12px;
  `,
  md: css`
    padding: 6px 12px;
    font-size: 13px;
  `,
  lg: css`
    padding: 8px 16px;
    font-size: 14px;
  `,
};

// Position styles
const positionStyles = {
  top: css`
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 8px;
  `,
  bottom: css`
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 8px;
  `,
  left: css`
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-right: 8px;
  `,
  right: css`
    left: 100%;
    top: 50%;
    transform: translateY(-50%);
    margin-left: 8px;
  `,
};

// Arrow position styles
const arrowPositionStyles = {
  top: css`
    bottom: -4px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
  `,
  bottom: css`
    top: -4px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
  `,
  left: css`
    right: -4px;
    top: 50%;
    transform: translateY(-50%) rotate(45deg);
  `,
  right: css`
    left: -4px;
    top: 50%;
    transform: translateY(-50%) rotate(45deg);
  `,
};

// Styled Components
const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const TooltipTriggerElement = styled.div`
  display: inline-flex;
`;

const TooltipContent = styled.div<{
  $position: TooltipPosition;
  $size: TooltipSize;
  $visible: boolean;
  $closing: boolean;
  $maxWidth: number | string;
}>`
  position: absolute;
  z-index: var(--z-index-tooltip, 1000);
  background: var(--color-gray-900, #111827);
  color: white;
  font-family: var(--font-family-sans, system-ui, sans-serif);
  line-height: 1.5;
  border-radius: 6px;
  white-space: normal;
  word-wrap: break-word;
  max-width: ${({ $maxWidth }) => (typeof $maxWidth === 'number' ? `${$maxWidth}px` : $maxWidth)};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;

  ${({ $size }) => sizeStyles[$size]}
  ${({ $position }) => positionStyles[$position]}

  ${({ $visible, $closing }) =>
    $visible &&
    !$closing &&
    css`
      animation: ${fadeIn} 0.15s ease-out forwards;
    `}

  ${({ $closing }) =>
    $closing &&
    css`
      animation: ${fadeOut} 0.1s ease-out forwards;
    `}

  ${({ $visible, $closing }) =>
    !$visible &&
    !$closing &&
    css`
      display: none;
    `}
`;

const Arrow = styled.span<{ $position: TooltipPosition }>`
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--color-gray-900, #111827);
  ${({ $position }) => arrowPositionStyles[$position]}
`;

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      content,
      position = 'top',
      trigger = 'hover',
      size = 'md',
      delay = 0,
      hideDelay = 0,
      disabled = false,
      open: controlledOpen,
      defaultOpen = false,
      onOpenChange,
      arrow = true,
      maxWidth = 250,
      children,
      ...props
    },
    ref
  ) => {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const [closing, setClosing] = useState(false);
    const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : internalOpen;

    const triggers = Array.isArray(trigger) ? trigger : [trigger];

    const clearTimeouts = useCallback(() => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    }, []);

    const showTooltip = useCallback(() => {
      if (disabled) return;

      clearTimeouts();
      setClosing(false);

      if (delay > 0) {
        showTimeoutRef.current = setTimeout(() => {
          if (!isControlled) {
            setInternalOpen(true);
          }
          onOpenChange?.(true);
        }, delay);
      } else {
        if (!isControlled) {
          setInternalOpen(true);
        }
        onOpenChange?.(true);
      }
    }, [disabled, delay, isControlled, onOpenChange, clearTimeouts]);

    const hideTooltip = useCallback(() => {
      clearTimeouts();

      const performHide = () => {
        setClosing(true);
        setTimeout(() => {
          if (!isControlled) {
            setInternalOpen(false);
          }
          setClosing(false);
          onOpenChange?.(false);
        }, 100);
      };

      if (hideDelay > 0) {
        hideTimeoutRef.current = setTimeout(performHide, hideDelay);
      } else {
        performHide();
      }
    }, [hideDelay, isControlled, onOpenChange, clearTimeouts]);

    const toggleTooltip = useCallback(() => {
      if (isOpen) {
        hideTooltip();
      } else {
        showTooltip();
      }
    }, [isOpen, showTooltip, hideTooltip]);

    // Cleanup timeouts on unmount
    useEffect(() => {
      return () => {
        clearTimeouts();
      };
    }, [clearTimeouts]);

    // Handle click outside for click trigger
    useEffect(() => {
      if (!triggers.includes('click') || !isOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
          hideTooltip();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [triggers, isOpen, hideTooltip]);

    // Handle escape key
    useEffect(() => {
      if (!isOpen) return;

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          hideTooltip();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }, [isOpen, hideTooltip]);

    // Build event handlers
    const triggerEventHandlers: Record<string, () => void> = {};

    if (triggers.includes('hover')) {
      triggerEventHandlers.onMouseEnter = showTooltip;
      triggerEventHandlers.onMouseLeave = hideTooltip;
    }

    if (triggers.includes('focus')) {
      triggerEventHandlers.onFocus = showTooltip;
      triggerEventHandlers.onBlur = hideTooltip;
    }

    if (triggers.includes('click')) {
      triggerEventHandlers.onClick = toggleTooltip;
    }

    // Clone child with additional props
    const childWithProps = React.cloneElement(children, {
      ...triggerEventHandlers,
      'aria-describedby': isOpen ? 'tooltip-content' : undefined,
    });

    const tooltipId = 'tooltip-content';

    return (
      <TooltipWrapper ref={ref} {...props}>
        <TooltipTriggerElement ref={triggerRef}>{childWithProps}</TooltipTriggerElement>
        <TooltipContent
          id={tooltipId}
          role="tooltip"
          $position={position}
          $size={size}
          $visible={isOpen}
          $closing={closing}
          $maxWidth={maxWidth}
          aria-hidden={!isOpen}
        >
          {arrow && <Arrow $position={position} />}
          {content}
        </TooltipContent>
      </TooltipWrapper>
    );
  }
);

Tooltip.displayName = 'Tooltip';

export default Tooltip;
