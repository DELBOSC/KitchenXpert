/**
 * IconButton Component
 * Button component optimized for icon-only usage
 */

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';

export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type IconButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  rounded?: boolean;
  'aria-label': string;
}

const sizeMap = {
  xs: { size: '24px', iconSize: '14px' },
  sm: { size: '32px', iconSize: '16px' },
  md: { size: '40px', iconSize: '20px' },
  lg: { size: '48px', iconSize: '24px' },
};

const variantStyles = {
  default: css`
    background: var(--color-gray-100, #f3f4f6);
    color: var(--color-gray-700, #374151);

    &:hover:not(:disabled) {
      background: var(--color-gray-200, #e5e7eb);
    }
  `,
  primary: css`
    background: var(--color-primary, #2563eb);
    color: white;

    &:hover:not(:disabled) {
      background: var(--color-primary-dark, #1d4ed8);
    }
  `,
  ghost: css`
    background: transparent;
    color: var(--color-gray-600, #4b5563);

    &:hover:not(:disabled) {
      background: var(--color-gray-100, #f3f4f6);
    }
  `,
  danger: css`
    background: var(--color-error-light, #fef2f2);
    color: var(--color-error, #dc2626);

    &:hover:not(:disabled) {
      background: var(--color-error, #dc2626);
      color: white;
    }
  `,
};

const StyledIconButton = styled.button<{
  $size: IconButtonSize;
  $variant: IconButtonVariant;
  $rounded: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  width: ${({ $size }) => sizeMap[$size].size};
  height: ${({ $size }) => sizeMap[$size].size};
  border-radius: ${({ $rounded }) => ($rounded ? '50%' : '8px')};

  ${({ $variant }) => variantStyles[$variant]}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
    outline-offset: 2px;
  }

  svg {
    width: ${({ $size }) => sizeMap[$size].iconSize};
    height: ${({ $size }) => sizeMap[$size].iconSize};
  }
`;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', variant = 'default', rounded = false, ...props }, ref) => {
    return (
      <StyledIconButton
        ref={ref}
        $size={size}
        $variant={variant}
        $rounded={rounded}
        type="button"
        {...props}
      >
        {icon}
      </StyledIconButton>
    );
  }
);

IconButton.displayName = 'IconButton';

export default IconButton;
