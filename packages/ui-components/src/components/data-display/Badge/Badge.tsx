/**
 * Badge Component
 * Badge/tag component with various colors and sizes
 */

import React, { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';

// Types
export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

export type BadgeSize = 'sm' | 'md' | 'lg';

export type BadgeShape = 'rounded' | 'pill' | 'square';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  shape?: BadgeShape;
  outlined?: boolean;
  dot?: boolean;
  icon?: ReactNode;
  onRemove?: () => void;
  children?: ReactNode;
}

// Size styles
const sizeStyles = {
  sm: css`
    padding: 2px 6px;
    font-size: 11px;
    line-height: 1.4;
  `,
  md: css`
    padding: 4px 10px;
    font-size: 12px;
    line-height: 1.5;
  `,
  lg: css`
    padding: 6px 14px;
    font-size: 14px;
    line-height: 1.5;
  `,
};

// Shape styles
const shapeStyles = {
  rounded: css`
    border-radius: 6px;
  `,
  pill: css`
    border-radius: 9999px;
  `,
  square: css`
    border-radius: 0;
  `,
};

// Variant styles (solid)
const solidVariantStyles = {
  default: css`
    background: var(--color-gray-100, #f3f4f6);
    color: var(--color-gray-700, #374151);
  `,
  primary: css`
    background: var(--color-primary, #2563eb);
    color: white;
  `,
  secondary: css`
    background: var(--color-secondary, #64748b);
    color: white;
  `,
  success: css`
    background: var(--color-success, #16a34a);
    color: white;
  `,
  warning: css`
    background: var(--color-warning, #f59e0b);
    color: white;
  `,
  error: css`
    background: var(--color-error, #dc2626);
    color: white;
  `,
  info: css`
    background: var(--color-info, #0ea5e9);
    color: white;
  `,
};

// Variant styles (outlined)
const outlinedVariantStyles = {
  default: css`
    background: transparent;
    color: var(--color-gray-700, #374151);
    border: 1px solid var(--color-gray-300, #d1d5db);
  `,
  primary: css`
    background: transparent;
    color: var(--color-primary, #2563eb);
    border: 1px solid var(--color-primary, #2563eb);
  `,
  secondary: css`
    background: transparent;
    color: var(--color-secondary, #64748b);
    border: 1px solid var(--color-secondary, #64748b);
  `,
  success: css`
    background: transparent;
    color: var(--color-success, #16a34a);
    border: 1px solid var(--color-success, #16a34a);
  `,
  warning: css`
    background: transparent;
    color: var(--color-warning, #f59e0b);
    border: 1px solid var(--color-warning, #f59e0b);
  `,
  error: css`
    background: transparent;
    color: var(--color-error, #dc2626);
    border: 1px solid var(--color-error, #dc2626);
  `,
  info: css`
    background: transparent;
    color: var(--color-info, #0ea5e9);
    border: 1px solid var(--color-info, #0ea5e9);
  `,
};

// Dot colors
const dotColors = {
  default: 'var(--color-gray-500, #6b7280)',
  primary: 'var(--color-primary, #2563eb)',
  secondary: 'var(--color-secondary, #64748b)',
  success: 'var(--color-success, #16a34a)',
  warning: 'var(--color-warning, #f59e0b)',
  error: 'var(--color-error, #dc2626)',
  info: 'var(--color-info, #0ea5e9)',
};

// Styled Components
const StyledBadge = styled.span<{
  $variant: BadgeVariant;
  $size: BadgeSize;
  $shape: BadgeShape;
  $outlined: boolean;
  $hasDot: boolean;
  $hasRemove: boolean;
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-weight: 500;
  white-space: nowrap;
  vertical-align: middle;
  transition: all 0.15s ease;

  ${({ $size }) => sizeStyles[$size]}
  ${({ $shape }) => shapeStyles[$shape]}
  ${({ $variant, $outlined }) =>
    $outlined ? outlinedVariantStyles[$variant] : solidVariantStyles[$variant]}

  ${({ $hasDot, $size }) =>
    $hasDot &&
    css`
      padding-left: ${$size === 'sm' ? '6px' : $size === 'md' ? '8px' : '12px'};
    `}

  ${({ $hasRemove, $size }) =>
    $hasRemove &&
    css`
      padding-right: ${$size === 'sm' ? '4px' : $size === 'md' ? '6px' : '8px'};
    `}
`;

const Dot = styled.span<{ $color: string; $size: BadgeSize }>`
  width: ${({ $size }) => ($size === 'sm' ? '6px' : $size === 'md' ? '8px' : '10px')};
  height: ${({ $size }) => ($size === 'sm' ? '6px' : $size === 'md' ? '8px' : '10px')};
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const IconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const RemoveButton = styled.button<{ $size: BadgeSize }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => ($size === 'sm' ? '14px' : $size === 'md' ? '16px' : '20px')};
  height: ${({ $size }) => ($size === 'sm' ? '14px' : $size === 'md' ? '16px' : '20px')};
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: currentColor;
  opacity: 0.6;
  cursor: pointer;
  transition: opacity 0.15s ease, background 0.15s ease;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.1);
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 1px;
  }

  svg {
    width: ${({ $size }) => ($size === 'sm' ? '10px' : $size === 'md' ? '12px' : '14px')};
    height: ${({ $size }) => ($size === 'sm' ? '10px' : $size === 'md' ? '12px' : '14px')};
  }
`;

const CloseIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      shape = 'rounded',
      outlined = false,
      dot = false,
      icon,
      onRemove,
      children,
      ...props
    },
    ref
  ) => {
    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove?.();
    };

    return (
      <StyledBadge
        ref={ref}
        $variant={variant}
        $size={size}
        $shape={shape}
        $outlined={outlined}
        $hasDot={dot}
        $hasRemove={!!onRemove}
        role="status"
        {...props}
      >
        {dot && <Dot $color={dotColors[variant]} $size={size} />}
        {icon && <IconWrapper>{icon}</IconWrapper>}
        {children}
        {onRemove && (
          <RemoveButton
            $size={size}
            onClick={handleRemove}
            aria-label="Remove"
            type="button"
          >
            <CloseIcon />
          </RemoveButton>
        )}
      </StyledBadge>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
