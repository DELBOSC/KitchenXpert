/**
 * Divider Component
 * Horizontal or vertical divider with optional text label
 */

import React, { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerVariant = 'solid' | 'dashed' | 'dotted';
export type DividerTextPosition = 'left' | 'center' | 'right';
export type DividerSpacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type DividerThickness = 'thin' | 'medium' | 'thick';

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Divider orientation */
  orientation?: DividerOrientation;
  /** Line style variant */
  variant?: DividerVariant;
  /** Text label to display */
  text?: ReactNode;
  /** Position of the text label (horizontal only) */
  textPosition?: DividerTextPosition;
  /** Vertical spacing around the divider */
  spacing?: DividerSpacing;
  /** Line thickness */
  thickness?: DividerThickness;
  /** Custom color for the divider line */
  color?: string;
}

const spacingValues: Record<DividerSpacing, string> = {
  none: '0',
  xs: 'var(--spacing-xs, 4px)',
  sm: 'var(--spacing-sm, 8px)',
  md: 'var(--spacing-md, 16px)',
  lg: 'var(--spacing-lg, 24px)',
  xl: 'var(--spacing-xl, 32px)',
};

const thicknessValues: Record<DividerThickness, string> = {
  thin: '1px',
  medium: '2px',
  thick: '4px',
};

interface StyledDividerProps {
  $orientation: DividerOrientation;
  $variant: DividerVariant;
  $spacing: DividerSpacing;
  $thickness: DividerThickness;
  $color?: string;
  $hasText: boolean;
  $textPosition: DividerTextPosition;
}

const StyledDivider = styled.div<StyledDividerProps>`
  display: flex;
  align-items: center;

  ${({ $orientation, $spacing }) =>
    $orientation === 'horizontal'
      ? css`
          width: 100%;
          flex-direction: row;
          margin-top: ${spacingValues[$spacing]};
          margin-bottom: ${spacingValues[$spacing]};
        `
      : css`
          height: 100%;
          flex-direction: column;
          margin-left: ${spacingValues[$spacing]};
          margin-right: ${spacingValues[$spacing]};
        `}
`;

const Line = styled.span<{
  $orientation: DividerOrientation;
  $variant: DividerVariant;
  $thickness: DividerThickness;
  $color?: string;
  $flex?: number;
}>`
  flex: ${({ $flex }) => $flex ?? 1};

  ${({ $orientation, $variant, $thickness, $color }) =>
    $orientation === 'horizontal'
      ? css`
          height: 0;
          border-top-width: ${thicknessValues[$thickness]};
          border-top-style: ${$variant};
          border-top-color: ${$color || 'var(--color-border, #e5e7eb)'};
        `
      : css`
          width: 0;
          border-left-width: ${thicknessValues[$thickness]};
          border-left-style: ${$variant};
          border-left-color: ${$color || 'var(--color-border, #e5e7eb)'};
        `}
`;

const TextWrapper = styled.span<{ $orientation: DividerOrientation }>`
  flex-shrink: 0;
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-secondary, #6b7280);
  font-weight: 500;
  line-height: 1;

  ${({ $orientation }) =>
    $orientation === 'horizontal'
      ? css`
          padding-left: var(--spacing-md, 16px);
          padding-right: var(--spacing-md, 16px);
        `
      : css`
          padding-top: var(--spacing-sm, 8px);
          padding-bottom: var(--spacing-sm, 8px);
          writing-mode: vertical-rl;
          text-orientation: mixed;
        `}
`;

const getFlexValues = (position: DividerTextPosition): [number, number] => {
  switch (position) {
    case 'left':
      return [0.1, 1];
    case 'right':
      return [1, 0.1];
    case 'center':
    default:
      return [1, 1];
  }
};

export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  (
    {
      orientation = 'horizontal',
      variant = 'solid',
      text,
      textPosition = 'center',
      spacing = 'md',
      thickness = 'thin',
      color,
      ...props
    },
    ref
  ) => {
    const hasText = !!text;
    const [leftFlex, rightFlex] = getFlexValues(textPosition);

    // For vertical dividers or dividers without text, render a simple line
    if (!hasText) {
      return (
        <StyledDivider
          ref={ref}
          role="separator"
          aria-orientation={orientation}
          $orientation={orientation}
          $variant={variant}
          $spacing={spacing}
          $thickness={thickness}
          $color={color}
          $hasText={false}
          $textPosition={textPosition}
          {...props}
        >
          <Line
            $orientation={orientation}
            $variant={variant}
            $thickness={thickness}
            $color={color}
          />
        </StyledDivider>
      );
    }

    // For horizontal dividers with text
    return (
      <StyledDivider
        ref={ref}
        role="separator"
        aria-orientation={orientation}
        $orientation={orientation}
        $variant={variant}
        $spacing={spacing}
        $thickness={thickness}
        $color={color}
        $hasText={true}
        $textPosition={textPosition}
        {...props}
      >
        <Line
          $orientation={orientation}
          $variant={variant}
          $thickness={thickness}
          $color={color}
          $flex={leftFlex}
        />
        <TextWrapper $orientation={orientation}>{text}</TextWrapper>
        <Line
          $orientation={orientation}
          $variant={variant}
          $thickness={thickness}
          $color={color}
          $flex={rightFlex}
        />
      </StyledDivider>
    );
  }
);

Divider.displayName = 'Divider';

export default Divider;
