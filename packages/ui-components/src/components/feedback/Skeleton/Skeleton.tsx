/**
 * Skeleton Component
 * Loading skeleton with variants (text, circle, rect)
 */

import React, { forwardRef, type HTMLAttributes } from 'react';
import styled, { css, keyframes } from 'styled-components';

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  lines?: number;
  lineHeight?: string | number;
  gap?: string | number;
}

const pulseAnimation = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
`;

const waveAnimation = keyframes`
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

const variantStyles = {
  text: css`
    border-radius: 4px;
    height: 1em;
    transform: scale(1, 0.6);
    transform-origin: 0 60%;
  `,
  circular: css`
    border-radius: 50%;
  `,
  rectangular: css`
    border-radius: 0;
  `,
  rounded: css`
    border-radius: 8px;
  `,
};

const BaseSkeleton = styled.div<{
  $variant: SkeletonVariant;
  $width?: string | number;
  $height?: string | number;
  $animation: 'pulse' | 'wave' | 'none';
}>`
  display: block;
  background: var(--color-gray-200, #e5e7eb);
  position: relative;
  overflow: hidden;

  ${({ $variant }) => variantStyles[$variant]}

  ${({ $width }) =>
    $width !== undefined &&
    css`
      width: ${typeof $width === 'number' ? `${$width}px` : $width};
    `}

  ${({ $height }) =>
    $height !== undefined &&
    css`
      height: ${typeof $height === 'number' ? `${$height}px` : $height};
    `}

  ${({ $animation }) =>
    $animation === 'pulse' &&
    css`
      animation: ${pulseAnimation} 1.5s ease-in-out 0.5s infinite;
    `}

  ${({ $animation }) =>
    $animation === 'wave' &&
    css`
      &::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
        animation: ${waveAnimation} 1.6s linear 0.5s infinite;
      }
    `}
`;

const SkeletonGroup = styled.div<{ $gap: string | number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => (typeof $gap === 'number' ? `${$gap}px` : $gap)};
`;

const TextLine = styled(BaseSkeleton)<{ $lineHeight: string | number }>`
  height: ${({ $lineHeight }) =>
    typeof $lineHeight === 'number' ? `${$lineHeight}px` : $lineHeight};

  &:last-child {
    width: 80%;
  }
`;

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      width,
      height,
      animation = 'pulse',
      lines,
      lineHeight = '1em',
      gap = 8,
      ...props
    },
    ref
  ) => {
    // Handle multiple lines for text variant
    if (variant === 'text' && lines && lines > 1) {
      return (
        <SkeletonGroup ref={ref} $gap={gap} {...props}>
          {Array.from({ length: lines }).map((_, index) => (
            <TextLine
              key={index}
              $variant="text"
              $width={width}
              $lineHeight={lineHeight}
              $animation={animation}
              aria-hidden="true"
            />
          ))}
        </SkeletonGroup>
      );
    }

    return (
      <BaseSkeleton
        ref={ref}
        $variant={variant}
        $width={width}
        $height={height}
        $animation={animation}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Compound components for common use cases
export const SkeletonText = forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>(
  (props, ref) => <Skeleton ref={ref} variant="text" {...props} />
);
SkeletonText.displayName = 'SkeletonText';

export const SkeletonCircle = forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>(
  ({ width = 40, height, ...props }, ref) => (
    <Skeleton ref={ref} variant="circular" width={width} height={height || width} {...props} />
  )
);
SkeletonCircle.displayName = 'SkeletonCircle';

export const SkeletonRect = forwardRef<HTMLDivElement, Omit<SkeletonProps, 'variant'>>(
  (props, ref) => <Skeleton ref={ref} variant="rectangular" {...props} />
);
SkeletonRect.displayName = 'SkeletonRect';

// Preset skeleton layouts
const CardSkeletonWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--color-white, #ffffff);
  border-radius: 8px;
  border: 1px solid var(--color-gray-200, #e5e7eb);
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CardMeta = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const SkeletonCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  (props, ref) => (
    <CardSkeletonWrapper ref={ref} {...props}>
      <CardHeader>
        <SkeletonCircle width={48} />
        <CardMeta>
          <Skeleton variant="text" width="60%" height={14} />
          <Skeleton variant="text" width="40%" height={12} />
        </CardMeta>
      </CardHeader>
      <Skeleton variant="rounded" width="100%" height={120} />
      <Skeleton variant="text" lines={3} lineHeight={14} />
    </CardSkeletonWrapper>
  )
);
SkeletonCard.displayName = 'SkeletonCard';

export default Skeleton;
