/**
 * Grid Component
 * CSS Grid wrapper with responsive columns, gap, and alignment options
 */

import React, { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';

export type GridColumns = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto-fit' | 'auto-fill';
export type GridGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type GridAlign = 'start' | 'center' | 'end' | 'stretch';
export type GridJustify = 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around' | 'space-evenly';

export interface ResponsiveColumns {
  xs?: GridColumns;
  sm?: GridColumns;
  md?: GridColumns;
  lg?: GridColumns;
  xl?: GridColumns;
}

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of columns or responsive column configuration */
  columns?: GridColumns | ResponsiveColumns;
  /** Minimum column width for auto-fit/auto-fill */
  minColumnWidth?: string;
  /** Gap between grid items */
  gap?: GridGap;
  /** Row gap (overrides gap for rows) */
  rowGap?: GridGap;
  /** Column gap (overrides gap for columns) */
  columnGap?: GridGap;
  /** Align items vertically */
  alignItems?: GridAlign;
  /** Justify items horizontally */
  justifyItems?: GridJustify;
  /** Align content vertically */
  alignContent?: GridAlign;
  /** Justify content horizontally */
  justifyContent?: GridJustify;
  /** Make grid items flow in rows (default) or columns */
  flow?: 'row' | 'column' | 'row-dense' | 'column-dense';
  /** Child elements */
  children: ReactNode;
}

const gapValues: Record<GridGap, string> = {
  none: '0',
  xs: 'var(--spacing-xs, 4px)',
  sm: 'var(--spacing-sm, 8px)',
  md: 'var(--spacing-md, 16px)',
  lg: 'var(--spacing-lg, 24px)',
  xl: 'var(--spacing-xl, 32px)',
  '2xl': 'var(--spacing-2xl, 48px)',
};

const breakpoints = {
  xs: '0px',
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px',
};

const getColumnsValue = (columns: GridColumns, minWidth?: string): string => {
  if (columns === 'auto-fit' || columns === 'auto-fill') {
    const min = minWidth || '250px';
    return `repeat(${columns}, minmax(${min}, 1fr))`;
  }
  return `repeat(${columns}, 1fr)`;
};

const generateResponsiveColumns = (
  columns: GridColumns | ResponsiveColumns,
  minWidth?: string
): ReturnType<typeof css> => {
  if (typeof columns === 'object') {
    return css`
      ${columns.xs && `grid-template-columns: ${getColumnsValue(columns.xs, minWidth)};`}

      ${columns.sm && css`
        @media (min-width: ${breakpoints.sm}) {
          grid-template-columns: ${getColumnsValue(columns.sm, minWidth)};
        }
      `}

      ${columns.md && css`
        @media (min-width: ${breakpoints.md}) {
          grid-template-columns: ${getColumnsValue(columns.md, minWidth)};
        }
      `}

      ${columns.lg && css`
        @media (min-width: ${breakpoints.lg}) {
          grid-template-columns: ${getColumnsValue(columns.lg, minWidth)};
        }
      `}

      ${columns.xl && css`
        @media (min-width: ${breakpoints.xl}) {
          grid-template-columns: ${getColumnsValue(columns.xl, minWidth)};
        }
      `}
    `;
  }

  return css`
    grid-template-columns: ${getColumnsValue(columns, minWidth)};
  `;
};

interface StyledGridProps {
  $columns: GridColumns | ResponsiveColumns;
  $minColumnWidth?: string;
  $gap: GridGap;
  $rowGap?: GridGap;
  $columnGap?: GridGap;
  $alignItems?: GridAlign;
  $justifyItems?: GridJustify;
  $alignContent?: GridAlign;
  $justifyContent?: GridJustify;
  $flow?: 'row' | 'column' | 'row-dense' | 'column-dense';
}

const StyledGrid = styled.div<StyledGridProps>`
  display: grid;

  ${({ $columns, $minColumnWidth }) => generateResponsiveColumns($columns, $minColumnWidth)}

  gap: ${({ $gap }) => gapValues[$gap]};
  ${({ $rowGap }) => $rowGap && css`row-gap: ${gapValues[$rowGap]};`}
  ${({ $columnGap }) => $columnGap && css`column-gap: ${gapValues[$columnGap]};`}

  ${({ $alignItems }) => $alignItems && css`align-items: ${$alignItems};`}
  ${({ $justifyItems }) => $justifyItems && css`justify-items: ${$justifyItems};`}
  ${({ $alignContent }) => $alignContent && css`align-content: ${$alignContent};`}
  ${({ $justifyContent }) => $justifyContent && css`justify-content: ${$justifyContent};`}
  ${({ $flow }) => $flow && css`grid-auto-flow: ${$flow};`}
`;

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  (
    {
      columns = 1,
      minColumnWidth,
      gap = 'md',
      rowGap,
      columnGap,
      alignItems,
      justifyItems,
      alignContent,
      justifyContent,
      flow,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <StyledGrid
        ref={ref}
        $columns={columns}
        $minColumnWidth={minColumnWidth}
        $gap={gap}
        $rowGap={rowGap}
        $columnGap={columnGap}
        $alignItems={alignItems}
        $justifyItems={justifyItems}
        $alignContent={alignContent}
        $justifyContent={justifyContent}
        $flow={flow}
        {...props}
      >
        {children}
      </StyledGrid>
    );
  }
);

Grid.displayName = 'Grid';

export default Grid;
