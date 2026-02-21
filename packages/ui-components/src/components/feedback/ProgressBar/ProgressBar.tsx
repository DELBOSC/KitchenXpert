/**
 * ProgressBar Component
 * Progress indicator with percentage and color variants
 */

import React, { forwardRef, type HTMLAttributes } from 'react';
import styled, { css, keyframes } from 'styled-components';

export type ProgressBarSize = 'xs' | 'sm' | 'md' | 'lg';
export type ProgressBarVariant = 'primary' | 'success' | 'warning' | 'error' | 'info';

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: ProgressBarSize;
  variant?: ProgressBarVariant;
  showLabel?: boolean;
  labelPosition?: 'inside' | 'outside' | 'top';
  animated?: boolean;
  striped?: boolean;
  indeterminate?: boolean;
}

const sizeStyles = {
  xs: css`
    height: 4px;
  `,
  sm: css`
    height: 8px;
  `,
  md: css`
    height: 12px;
  `,
  lg: css`
    height: 20px;
  `,
};

const variantColors = {
  primary: 'var(--color-primary, #2563eb)',
  success: 'var(--color-success, #16a34a)',
  warning: 'var(--color-warning, #d97706)',
  error: 'var(--color-error, #dc2626)',
  info: 'var(--color-info, #3b82f6)',
};

const stripeAnimation = keyframes`
  from {
    background-position: 1rem 0;
  }
  to {
    background-position: 0 0;
  }
`;

const indeterminateAnimation = keyframes`
  0% {
    left: -35%;
    right: 100%;
  }
  60% {
    left: 100%;
    right: -90%;
  }
  100% {
    left: 100%;
    right: -90%;
  }
`;

const ProgressWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
`;

const TopLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: var(--color-gray-700, #374151);
  font-family: var(--font-family-sans, system-ui, sans-serif);
`;

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
`;

const Track = styled.div<{
  $size: ProgressBarSize;
}>`
  flex: 1;
  background: var(--color-gray-200, #e5e7eb);
  border-radius: 9999px;
  overflow: hidden;
  position: relative;

  ${({ $size }) => sizeStyles[$size]}
`;

const Fill = styled.div<{
  $value: number;
  $variant: ProgressBarVariant;
  $animated: boolean;
  $striped: boolean;
  $indeterminate: boolean;
  $size: ProgressBarSize;
}>`
  height: 100%;
  border-radius: 9999px;
  transition: width 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  background-color: ${({ $variant }) => variantColors[$variant]};

  ${({ $indeterminate, $value }) =>
    $indeterminate
      ? css`
          position: absolute;
          width: 35%;
          animation: ${indeterminateAnimation} 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
        `
      : css`
          width: ${$value}%;
        `}

  ${({ $striped }) =>
    $striped &&
    css`
      background-image: linear-gradient(
        45deg,
        rgba(255, 255, 255, 0.15) 25%,
        transparent 25%,
        transparent 50%,
        rgba(255, 255, 255, 0.15) 50%,
        rgba(255, 255, 255, 0.15) 75%,
        transparent 75%,
        transparent
      );
      background-size: 1rem 1rem;
    `}

  ${({ $animated, $striped }) =>
    $animated &&
    $striped &&
    css`
      animation: ${stripeAnimation} 1s linear infinite;
    `}
`;

const InsideLabel = styled.span<{ $size: ProgressBarSize }>`
  font-size: ${({ $size }) => ($size === 'lg' ? '12px' : '10px')};
  font-weight: 600;
  color: white;
  padding-right: 8px;
  white-space: nowrap;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  font-family: var(--font-family-sans, system-ui, sans-serif);

  ${({ $size }) =>
    ($size === 'xs' || $size === 'sm') &&
    css`
      display: none;
    `}
`;

const OutsideLabel = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: var(--color-gray-700, #374151);
  min-width: 48px;
  text-align: right;
  font-family: var(--font-family-sans, system-ui, sans-serif);
`;

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value,
      max = 100,
      size = 'md',
      variant = 'primary',
      showLabel = false,
      labelPosition = 'outside',
      animated = false,
      striped = false,
      indeterminate = false,
      ...props
    },
    ref
  ) => {
    const normalizedValue = Math.min(Math.max((value / max) * 100, 0), 100);
    const displayValue = Math.round(normalizedValue);

    const progressFill = (
      <Fill
        $value={normalizedValue}
        $variant={variant}
        $animated={animated}
        $striped={striped}
        $indeterminate={indeterminate}
        $size={size}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        {showLabel && labelPosition === 'inside' && !indeterminate && (
          <InsideLabel $size={size}>{displayValue}%</InsideLabel>
        )}
      </Fill>
    );

    if (labelPosition === 'top' && showLabel && !indeterminate) {
      return (
        <ProgressWrapper ref={ref} {...props}>
          <TopLabel>
            <span>Progress</span>
            <span>{displayValue}%</span>
          </TopLabel>
          <Track $size={size}>{progressFill}</Track>
        </ProgressWrapper>
      );
    }

    if (labelPosition === 'outside' && showLabel && !indeterminate) {
      return (
        <Container ref={ref} {...props}>
          <Track $size={size}>{progressFill}</Track>
          <OutsideLabel>{displayValue}%</OutsideLabel>
        </Container>
      );
    }

    return (
      <Track ref={ref} $size={size} {...props}>
        {progressFill}
      </Track>
    );
  }
);

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
