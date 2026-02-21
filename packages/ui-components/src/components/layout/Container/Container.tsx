/**
 * Container Component
 * Max-width container with responsive padding for consistent page layouts
 */

import React, { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';

export type ContainerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'fluid';
export type ContainerPadding = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Maximum width of the container */
  size?: ContainerSize;
  /** Horizontal padding */
  padding?: ContainerPadding;
  /** Center the container horizontally */
  centered?: boolean;
  /** Make container full height of viewport */
  fullHeight?: boolean;
  /** Add vertical padding */
  verticalPadding?: ContainerPadding;
  /** Child elements */
  children: ReactNode;
}

const sizeValues: Record<ContainerSize, string> = {
  xs: 'var(--container-xs, 480px)',
  sm: 'var(--container-sm, 640px)',
  md: 'var(--container-md, 768px)',
  lg: 'var(--container-lg, 1024px)',
  xl: 'var(--container-xl, 1280px)',
  full: 'var(--container-full, 1536px)',
  fluid: '100%',
};

const paddingValues: Record<ContainerPadding, string> = {
  none: '0',
  xs: 'var(--spacing-xs, 4px)',
  sm: 'var(--spacing-sm, 8px)',
  md: 'var(--spacing-md, 16px)',
  lg: 'var(--spacing-lg, 24px)',
  xl: 'var(--spacing-xl, 32px)',
};

interface StyledContainerProps {
  $size: ContainerSize;
  $padding: ContainerPadding;
  $centered: boolean;
  $fullHeight: boolean;
  $verticalPadding?: ContainerPadding;
}

const StyledContainer = styled.div<StyledContainerProps>`
  width: 100%;
  max-width: ${({ $size }) => sizeValues[$size]};
  padding-left: ${({ $padding }) => paddingValues[$padding]};
  padding-right: ${({ $padding }) => paddingValues[$padding]};

  ${({ $verticalPadding }) =>
    $verticalPadding &&
    css`
      padding-top: ${paddingValues[$verticalPadding]};
      padding-bottom: ${paddingValues[$verticalPadding]};
    `}

  ${({ $centered }) =>
    $centered &&
    css`
      margin-left: auto;
      margin-right: auto;
    `}

  ${({ $fullHeight }) =>
    $fullHeight &&
    css`
      min-height: 100vh;
    `}

  /* Responsive padding adjustments */
  @media (min-width: 576px) {
    ${({ $padding }) =>
      $padding !== 'none' &&
      css`
        padding-left: calc(${paddingValues[$padding]} * 1.25);
        padding-right: calc(${paddingValues[$padding]} * 1.25);
      `}
  }

  @media (min-width: 768px) {
    ${({ $padding }) =>
      $padding !== 'none' &&
      css`
        padding-left: calc(${paddingValues[$padding]} * 1.5);
        padding-right: calc(${paddingValues[$padding]} * 1.5);
      `}
  }
`;

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      size = 'lg',
      padding = 'md',
      centered = true,
      fullHeight = false,
      verticalPadding,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <StyledContainer
        ref={ref}
        $size={size}
        $padding={padding}
        $centered={centered}
        $fullHeight={fullHeight}
        $verticalPadding={verticalPadding}
        {...props}
      >
        {children}
      </StyledContainer>
    );
  }
);

Container.displayName = 'Container';

export default Container;
