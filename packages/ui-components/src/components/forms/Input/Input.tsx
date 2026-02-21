/**
 * Input Component
 * Text input with validation states and icons
 */

import React, { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputState = 'default' | 'error' | 'success' | 'warning';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  state?: InputState;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  helperText?: string;
  errorText?: string;
  label?: string;
  fullWidth?: boolean;
}

const sizeStyles = {
  sm: css`
    height: 32px;
    padding: 0 10px;
    font-size: 13px;
  `,
  md: css`
    height: 40px;
    padding: 0 12px;
    font-size: 14px;
  `,
  lg: css`
    height: 48px;
    padding: 0 16px;
    font-size: 16px;
  `,
};

const stateStyles = {
  default: css`
    border-color: var(--color-gray-300, #d1d5db);

    &:focus {
      border-color: var(--color-primary, #2563eb);
      box-shadow: 0 0 0 3px var(--color-primary-light, rgba(37, 99, 235, 0.1));
    }
  `,
  error: css`
    border-color: var(--color-error, #dc2626);

    &:focus {
      border-color: var(--color-error, #dc2626);
      box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
    }
  `,
  success: css`
    border-color: var(--color-success, #16a34a);

    &:focus {
      border-color: var(--color-success, #16a34a);
      box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
    }
  `,
  warning: css`
    border-color: var(--color-warning, #d97706);

    &:focus {
      border-color: var(--color-warning, #d97706);
      box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.1);
    }
  `,
};

const InputWrapper = styled.div<{ $fullWidth: boolean }>`
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  ${({ $fullWidth }) => $fullWidth && css`width: 100%;`}
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-gray-700, #374151);
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const StyledInput = styled.input<{
  $size: InputSize;
  $state: InputState;
  $hasLeftIcon: boolean;
  $hasRightIcon: boolean;
}>`
  width: 100%;
  border: 2px solid;
  border-radius: 8px;
  background: var(--color-white, #ffffff);
  color: var(--color-gray-900, #111827);
  font-family: var(--font-family-sans, system-ui, sans-serif);
  transition: all 0.2s ease;
  outline: none;

  ${({ $size }) => sizeStyles[$size]}
  ${({ $state }) => stateStyles[$state]}

  ${({ $hasLeftIcon }) => $hasLeftIcon && css`padding-left: 40px;`}
  ${({ $hasRightIcon }) => $hasRightIcon && css`padding-right: 40px;`}

  &::placeholder {
    color: var(--color-gray-400, #9ca3af);
  }

  &:disabled {
    background: var(--color-gray-100, #f3f4f6);
    cursor: not-allowed;
  }
`;

const IconWrapper = styled.span<{ $position: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-gray-500, #6b7280);
  pointer-events: none;

  ${({ $position }) =>
    $position === 'left'
      ? css`left: 12px;`
      : css`right: 12px;`}
`;

const HelperText = styled.span<{ $state: InputState }>`
  font-size: 12px;
  color: ${({ $state }) => {
    switch ($state) {
      case 'error':
        return 'var(--color-error, #dc2626)';
      case 'success':
        return 'var(--color-success, #16a34a)';
      case 'warning':
        return 'var(--color-warning, #d97706)';
      default:
        return 'var(--color-gray-500, #6b7280)';
    }
  }};
`;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      state = 'default',
      leftIcon,
      rightIcon,
      helperText,
      errorText,
      label,
      fullWidth = false,
      id,
      ...props
    },
    ref
  ) => {
    const reactId = useId();
    const inputId = id || `input-${reactId}`;
    const displayState = errorText ? 'error' : state;
    const displayHelperText = errorText || helperText;

    return (
      <InputWrapper $fullWidth={fullWidth}>
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <InputContainer>
          {leftIcon && <IconWrapper $position="left">{leftIcon}</IconWrapper>}
          <StyledInput
            ref={ref}
            id={inputId}
            $size={size}
            $state={displayState}
            $hasLeftIcon={!!leftIcon}
            $hasRightIcon={!!rightIcon}
            {...props}
          />
          {rightIcon && <IconWrapper $position="right">{rightIcon}</IconWrapper>}
        </InputContainer>
        {displayHelperText && (
          <HelperText $state={displayState}>{displayHelperText}</HelperText>
        )}
      </InputWrapper>
    );
  }
);

Input.displayName = 'Input';

export default Input;
