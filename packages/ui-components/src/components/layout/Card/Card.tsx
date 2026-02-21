/**
 * Card Component
 * Versatile card component with header, body, footer sections and multiple variants
 */

import React, { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled' | 'ghost';
export type CardSize = 'sm' | 'md' | 'lg';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card visual style variant */
  variant?: CardVariant;
  /** Card size affecting padding and border-radius */
  size?: CardSize;
  /** Custom padding override */
  padding?: CardPadding;
  /** Make card clickable with hover effects */
  clickable?: boolean;
  /** Make card take full width */
  fullWidth?: boolean;
  /** Disable default border radius */
  square?: boolean;
  /** Child elements */
  children: ReactNode;
}

export interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Action elements to render on the right side */
  action?: ReactNode;
  /** Title text (ReactNode, overrides native HTML title attribute) */
  title?: ReactNode;
  /** Subtitle text */
  subtitle?: ReactNode;
  /** Avatar or icon to display before title */
  avatar?: ReactNode;
  /** Native HTML title attribute for tooltip */
  htmlTitle?: string;
  /** Child elements (alternative to title/subtitle) */
  children?: ReactNode;
}

export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Remove default padding */
  noPadding?: boolean;
  /** Child elements */
  children: ReactNode;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Align footer content */
  align?: 'left' | 'center' | 'right' | 'space-between';
  /** Add border above footer */
  divider?: boolean;
  /** Child elements */
  children: ReactNode;
}

const paddingValues: Record<CardPadding, string> = {
  none: '0',
  sm: 'var(--spacing-sm, 8px)',
  md: 'var(--spacing-md, 16px)',
  lg: 'var(--spacing-lg, 24px)',
};

const sizeStyles = {
  sm: css`
    --card-padding: var(--spacing-sm, 8px);
    --card-radius: var(--radius-sm, 6px);
  `,
  md: css`
    --card-padding: var(--spacing-md, 16px);
    --card-radius: var(--radius-md, 8px);
  `,
  lg: css`
    --card-padding: var(--spacing-lg, 24px);
    --card-radius: var(--radius-lg, 12px);
  `,
};

const variantStyles = {
  default: css`
    background: var(--color-surface, #ffffff);
    border: 1px solid var(--color-border, #e5e7eb);
    box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
  `,
  elevated: css`
    background: var(--color-surface, #ffffff);
    border: none;
    box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06));
  `,
  outlined: css`
    background: transparent;
    border: 2px solid var(--color-border, #e5e7eb);
    box-shadow: none;
  `,
  filled: css`
    background: var(--color-surface-secondary, #f9fafb);
    border: none;
    box-shadow: none;
  `,
  ghost: css`
    background: transparent;
    border: none;
    box-shadow: none;
  `,
};

interface StyledCardProps {
  $variant: CardVariant;
  $size: CardSize;
  $padding?: CardPadding;
  $clickable: boolean;
  $fullWidth: boolean;
  $square: boolean;
}

const StyledCard = styled.div<StyledCardProps>`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.2s ease;

  ${({ $size }) => sizeStyles[$size]}
  ${({ $variant }) => variantStyles[$variant]}

  ${({ $padding }) =>
    $padding &&
    css`
      --card-padding: ${paddingValues[$padding]};
    `}

  ${({ $square }) =>
    !$square &&
    css`
      border-radius: var(--card-radius);
    `}

  ${({ $fullWidth }) =>
    $fullWidth &&
    css`
      width: 100%;
    `}

  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;

      &:hover {
        box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
        transform: translateY(-2px);
      }

      &:active {
        transform: translateY(0);
      }

      &:focus-visible {
        outline: 2px solid var(--color-primary, #2563eb);
        outline-offset: 2px;
      }
    `}
`;

const StyledCardHeader = styled.div<{ $hasAction: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm, 8px);
  padding: var(--card-padding);
  border-bottom: 1px solid var(--color-border-light, #f3f4f6);

  ${({ $hasAction }) =>
    $hasAction &&
    css`
      justify-content: space-between;
    `}
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  flex: 1;
  min-width: 0;
`;

const HeaderTextWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`;

const HeaderTitle = styled.div`
  font-size: var(--font-size-lg, 18px);
  font-weight: 600;
  color: var(--color-text, #1f2937);
  line-height: 1.4;
`;

const HeaderSubtitle = styled.div`
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-secondary, #6b7280);
  line-height: 1.4;
`;

const HeaderAction = styled.div`
  flex-shrink: 0;
`;

const StyledCardBody = styled.div<{ $noPadding: boolean }>`
  flex: 1;

  ${({ $noPadding }) =>
    !$noPadding &&
    css`
      padding: var(--card-padding);
    `}
`;

const StyledCardFooter = styled.div<{ $align: string; $divider: boolean }>`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--card-padding);

  ${({ $divider }) =>
    $divider &&
    css`
      border-top: 1px solid var(--color-border-light, #f3f4f6);
    `}

  ${({ $align }) => {
    switch ($align) {
      case 'center':
        return css`justify-content: center;`;
      case 'right':
        return css`justify-content: flex-end;`;
      case 'space-between':
        return css`justify-content: space-between;`;
      default:
        return css`justify-content: flex-start;`;
    }
  }}
`;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      size = 'md',
      padding,
      clickable = false,
      fullWidth = false,
      square = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <StyledCard
        ref={ref}
        $variant={variant}
        $size={size}
        $padding={padding}
        $clickable={clickable}
        $fullWidth={fullWidth}
        $square={square}
        tabIndex={clickable ? 0 : undefined}
        role={clickable ? 'button' : undefined}
        {...props}
      >
        {children}
      </StyledCard>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ action, title, subtitle, avatar, htmlTitle, children, ...props }, ref) => {
    const hasAction = !!action;

    return (
      <StyledCardHeader ref={ref} $hasAction={hasAction} title={htmlTitle} {...props}>
        <HeaderContent>
          {avatar}
          {(title || subtitle) ? (
            <HeaderTextWrapper>
              {title && <HeaderTitle>{title}</HeaderTitle>}
              {subtitle && <HeaderSubtitle>{subtitle}</HeaderSubtitle>}
            </HeaderTextWrapper>
          ) : (
            children
          )}
        </HeaderContent>
        {action && <HeaderAction>{action}</HeaderAction>}
      </StyledCardHeader>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ noPadding = false, children, ...props }, ref) => {
    return (
      <StyledCardBody ref={ref} $noPadding={noPadding} {...props}>
        {children}
      </StyledCardBody>
    );
  }
);

CardBody.displayName = 'CardBody';

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ align = 'left', divider = true, children, ...props }, ref) => {
    return (
      <StyledCardFooter ref={ref} $align={align} $divider={divider} {...props}>
        {children}
      </StyledCardFooter>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export default Card;
