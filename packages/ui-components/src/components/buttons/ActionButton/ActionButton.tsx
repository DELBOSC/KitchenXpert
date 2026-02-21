/**
 * ActionButton Component
 * Floating action button for primary actions
 */

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styled, { css, keyframes } from 'styled-components';

export type ActionButtonSize = 'sm' | 'md' | 'lg';
export type ActionButtonVariant = 'primary' | 'secondary' | 'success' | 'danger';
export type ActionButtonPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label?: string;
  size?: ActionButtonSize;
  variant?: ActionButtonVariant;
  position?: ActionButtonPosition;
  extended?: boolean;
  fixed?: boolean;
  pulse?: boolean;
}

const sizeMap = {
  sm: { size: '40px', iconSize: '18px', fontSize: '13px' },
  md: { size: '56px', iconSize: '24px', fontSize: '14px' },
  lg: { size: '72px', iconSize: '32px', fontSize: '16px' },
};

const variantStyles = {
  primary: css`
    background: var(--color-primary, #2563eb);
    color: white;
    &:hover:not(:disabled) {
      background: var(--color-primary-dark, #1d4ed8);
    }
  `,
  secondary: css`
    background: var(--color-secondary, #64748b);
    color: white;
    &:hover:not(:disabled) {
      background: var(--color-secondary-dark, #475569);
    }
  `,
  success: css`
    background: var(--color-success, #16a34a);
    color: white;
    &:hover:not(:disabled) {
      background: var(--color-success-dark, #15803d);
    }
  `,
  danger: css`
    background: var(--color-error, #dc2626);
    color: white;
    &:hover:not(:disabled) {
      background: var(--color-error-dark, #b91c1c);
    }
  `,
};

const positionStyles = {
  'bottom-right': css`bottom: 24px; right: 24px;`,
  'bottom-left': css`bottom: 24px; left: 24px;`,
  'top-right': css`top: 24px; right: 24px;`,
  'top-left': css`top: 24px; left: 24px;`,
};

const pulseAnimation = keyframes`
  0% { box-shadow: 0 0 0 0 currentColor; }
  70% { box-shadow: 0 0 0 15px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`;

const StyledActionButton = styled.button<{
  $size: ActionButtonSize;
  $variant: ActionButtonVariant;
  $position: ActionButtonPosition;
  $extended: boolean;
  $fixed: boolean;
  $pulse: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: ${({ $extended }) => ($extended ? '28px' : '50%')};
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  min-width: ${({ $size }) => sizeMap[$size].size};
  height: ${({ $size }) => sizeMap[$size].size};
  font-size: ${({ $size }) => sizeMap[$size].fontSize};
  padding: ${({ $extended }) => ($extended ? '0 24px' : '0')};

  ${({ $variant }) => variantStyles[$variant]}

  ${({ $fixed, $position }) =>
    $fixed &&
    css`
      position: fixed;
      z-index: 1000;
      ${positionStyles[$position]}
    `}

  ${({ $pulse }) =>
    $pulse &&
    css`
      animation: ${pulseAnimation} 2s infinite;
    `}

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 3px solid var(--color-primary-light, rgba(37, 99, 235, 0.5));
    outline-offset: 2px;
  }

  svg {
    width: ${({ $size }) => sizeMap[$size].iconSize};
    height: ${({ $size }) => sizeMap[$size].iconSize};
    flex-shrink: 0;
  }
`;

export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      icon,
      label,
      size = 'md',
      variant = 'primary',
      position = 'bottom-right',
      extended = false,
      fixed = false,
      pulse = false,
      ...props
    },
    ref
  ) => {
    return (
      <StyledActionButton
        ref={ref}
        $size={size}
        $variant={variant}
        $position={position}
        $extended={extended || !!label}
        $fixed={fixed}
        $pulse={pulse}
        type="button"
        {...props}
      >
        {icon}
        {label && <span>{label}</span>}
      </StyledActionButton>
    );
  }
);

ActionButton.displayName = 'ActionButton';

export default ActionButton;
