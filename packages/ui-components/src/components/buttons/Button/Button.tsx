/**
 * Button Component
 * Primary button component for user interactions
 */

import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

const sizeStyles = {
  xs: css`
    padding: 4px 8px;
    font-size: 12px;
    min-height: 24px;
    border-radius: 4px;
  `,
  sm: css`
    padding: 6px 12px;
    font-size: 13px;
    min-height: 32px;
    border-radius: 6px;
  `,
  md: css`
    padding: 8px 16px;
    font-size: 14px;
    min-height: 40px;
    border-radius: 8px;
  `,
  lg: css`
    padding: 12px 24px;
    font-size: 16px;
    min-height: 48px;
    border-radius: 8px;
  `,
  xl: css`
    padding: 16px 32px;
    font-size: 18px;
    min-height: 56px;
    border-radius: 10px;
  `,
};

const variantStyles = {
  primary: css`
    background: var(--color-primary, #2563eb);
    color: white;
    border: none;

    &:hover:not(:disabled) {
      background: var(--color-primary-dark, #1d4ed8);
    }

    &:active:not(:disabled) {
      background: var(--color-primary-darker, #1e40af);
    }
  `,
  secondary: css`
    background: var(--color-secondary, #64748b);
    color: white;
    border: none;

    &:hover:not(:disabled) {
      background: var(--color-secondary-dark, #475569);
    }
  `,
  outline: css`
    background: transparent;
    color: var(--color-primary, #2563eb);
    border: 2px solid var(--color-primary, #2563eb);

    &:hover:not(:disabled) {
      background: var(--color-primary-light, #eff6ff);
    }
  `,
  ghost: css`
    background: transparent;
    color: var(--color-text, #1f2937);
    border: none;

    &:hover:not(:disabled) {
      background: var(--color-gray-100, #f3f4f6);
    }
  `,
  danger: css`
    background: var(--color-error, #dc2626);
    color: white;
    border: none;

    &:hover:not(:disabled) {
      background: var(--color-error-dark, #b91c1c);
    }
  `,
};

const StyledButton = styled.button<{
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
  $loading: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  user-select: none;

  ${({ $size }) => sizeStyles[$size]}
  ${({ $variant }) => variantStyles[$variant]}
  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
    outline-offset: 2px;
  }

  ${({ $loading }) =>
    $loading &&
    css`
      pointer-events: none;
      opacity: 0.7;
    `}
`;

const Spinner = styled.span`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const IconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <StyledButton
        ref={ref}
        $variant={variant}
        $size={size}
        $fullWidth={fullWidth}
        $loading={loading}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Spinner />
        ) : (
          leftIcon && <IconWrapper>{leftIcon}</IconWrapper>
        )}
        {children}
        {!loading && rightIcon && <IconWrapper>{rightIcon}</IconWrapper>}
      </StyledButton>
    );
  }
);

Button.displayName = 'Button';

export default Button;
