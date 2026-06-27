/**
 * Table Component
 * Data table with sorting, pagination, and selection support
 */

import React, {
  forwardRef,
  useState,
  useCallback,
  useMemo,
  type HTMLAttributes,
  type ReactNode,
  type ChangeEvent,
} from 'react';
import styled, { css } from 'styled-components';

// Types
export type TableSize = 'sm' | 'md' | 'lg';
export type TableVariant = 'default' | 'striped' | 'bordered';
export type SortDirection = 'asc' | 'desc' | null;

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  header: ReactNode;
  accessor?: keyof T | ((row: T) => ReactNode);
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => ReactNode;
}

export interface TableSortState {
  key: string;
  direction: SortDirection;
}

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export interface TableProps<T = Record<string, unknown>> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  columns: TableColumn<T>[];
  data: T[];
  size?: TableSize;
  variant?: TableVariant;
  loading?: boolean;
  emptyMessage?: ReactNode;
  // Sorting
  sortable?: boolean;
  defaultSort?: TableSortState;
  onSort?: (sort: TableSortState) => void;
  // Selection
  selectable?: boolean;
  selectedRows?: Set<string | number>;
  onSelectionChange?: (selectedRows: Set<string | number>) => void;
  rowKey?: keyof T | ((row: T) => string | number);
  // Pagination
  pagination?: TablePaginationProps;
  // Row props
  onRowClick?: (row: T, index: number) => void;
  rowClassName?: string | ((row: T, index: number) => string);
  stickyHeader?: boolean;
}

// Styled Components
const sizeStyles = {
  sm: css`
    --table-cell-padding: 8px 12px;
    --table-font-size: 13px;
    --table-header-font-size: 12px;
  `,
  md: css`
    --table-cell-padding: 12px 16px;
    --table-font-size: 14px;
    --table-header-font-size: 13px;
  `,
  lg: css`
    --table-cell-padding: 16px 20px;
    --table-font-size: 15px;
    --table-header-font-size: 14px;
  `,
};

const variantStyles = {
  default: css`
    tbody tr:hover {
      background: var(--color-gray-50, #f9fafb);
    }
  `,
  striped: css`
    tbody tr:nth-child(even) {
      background: var(--color-gray-50, #f9fafb);
    }
    tbody tr:hover {
      background: var(--color-gray-100, #f3f4f6);
    }
  `,
  bordered: css`
    border: 1px solid var(--color-border, #e5e7eb);

    th,
    td {
      border: 1px solid var(--color-border, #e5e7eb);
    }
  `,
};

const TableWrapper = styled.div<{
  $size: TableSize;
  $variant: TableVariant;
}>`
  width: 100%;
  overflow-x: auto;
  ${({ $size }) => sizeStyles[$size]}
  ${({ $variant }) => variantStyles[$variant]}
`;

const StyledTable = styled.table<{ $stickyHeader: boolean }>`
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-family-sans, system-ui, sans-serif);
  font-size: var(--table-font-size);
  color: var(--color-text, #1f2937);

  ${({ $stickyHeader }) =>
    $stickyHeader &&
    css`
      thead {
        position: sticky;
        top: 0;
        z-index: 1;
      }
    `}
`;

const TableHead = styled.thead`
  background: var(--color-gray-100, #f3f4f6);
`;

const TableHeaderCell = styled.th<{
  $sortable: boolean;
  $align: 'left' | 'center' | 'right';
  $width?: string | number;
}>`
  padding: var(--table-cell-padding);
  font-size: var(--table-header-font-size);
  font-weight: 600;
  text-align: ${({ $align }) => $align};
  white-space: nowrap;
  color: var(--color-text-secondary, #6b7280);
  border-bottom: 2px solid var(--color-border, #e5e7eb);
  ${({ $width }) =>
    $width &&
    css`
      width: ${typeof $width === 'number' ? `${$width}px` : $width};
    `}

  ${({ $sortable }) =>
    $sortable &&
    css`
      cursor: pointer;
      user-select: none;

      &:hover {
        background: var(--color-gray-200, #e5e7eb);
      }
    `}
`;

const SortIcon = styled.span<{ $active: boolean; $direction: SortDirection }>`
  display: inline-flex;
  margin-left: 4px;
  opacity: ${({ $active }) => ($active ? 1 : 0.3)};
  transition: opacity 0.2s ease;

  &::after {
    content: '${({ $direction }) =>
      $direction === 'asc' ? '\\25B2' : $direction === 'desc' ? '\\25BC' : '\\25B2'}';
    font-size: 10px;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr<{ $clickable: boolean; $selected: boolean }>`
  transition: background-color 0.15s ease;

  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
    `}

  ${({ $selected }) =>
    $selected &&
    css`
      background: var(--color-primary-light, #eff6ff) !important;
    `}
`;

const TableCell = styled.td<{ $align: 'left' | 'center' | 'right' }>`
  padding: var(--table-cell-padding);
  text-align: ${({ $align }) => $align};
  border-bottom: 1px solid var(--color-border, #e5e7eb);
`;

const CheckboxCell = styled.td`
  padding: var(--table-cell-padding);
  width: 40px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--color-primary, #2563eb);
`;

const LoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-secondary, #6b7280);
`;

const Spinner = styled.span`
  width: 24px;
  height: 24px;
  border: 3px solid var(--color-gray-200, #e5e7eb);
  border-top-color: var(--color-primary, #2563eb);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 12px;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--color-text-secondary, #6b7280);
  font-style: italic;
`;

const PaginationWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border, #e5e7eb);
  background: var(--color-gray-50, #f9fafb);
  font-size: 14px;
`;

const PaginationInfo = styled.span`
  color: var(--color-text-secondary, #6b7280);
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PageButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  background: ${({ $active }) => ($active ? 'var(--color-primary, #2563eb)' : 'white')};
  color: ${({ $active }) => ($active ? 'white' : 'var(--color-text, #1f2937)')};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover:not(:disabled) {
    background: ${({ $active }) =>
      $active ? 'var(--color-primary-dark, #1d4ed8)' : 'var(--color-gray-100, #f3f4f6)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageSizeSelect = styled.select`
  height: 32px;
  padding: 0 24px 0 8px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 6px;
  background: white;
  font-size: 13px;
  cursor: pointer;

  &:focus {
    outline: 2px solid var(--color-primary, #2563eb);
    outline-offset: 2px;
  }
`;

// Helper function to get row key
function getRowKey<T>(
  row: T,
  index: number,
  rowKey?: keyof T | ((row: T) => string | number)
): string | number {
  if (!rowKey) return index;
  if (typeof rowKey === 'function') return rowKey(row);
  return row[rowKey] as string | number;
}

// Helper function to get cell value
function getCellValue<T>(row: T, column: TableColumn<T>): unknown {
  if (column.accessor) {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor];
  }
  return (row as Record<string, unknown>)[column.key];
}

// Pagination Component
const Pagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePageSizeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onPageSizeChange?.(Number(e.target.value));
  };

  // Generate page numbers to show
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <PaginationWrapper>
      <PaginationInfo>
        Showing {startItem} to {endItem} of {totalItems} items
      </PaginationInfo>
      <PaginationControls>
        {onPageSizeChange && (
          <PageSizeSelect
            value={pageSize}
            onChange={handlePageSizeChange}
            aria-label="Items per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </PageSizeSelect>
        )}
        <PageButton
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          &#8249;
        </PageButton>
        {getPageNumbers().map((page, index) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`}>...</span>
          ) : (
            <PageButton
              key={page}
              $active={page === currentPage}
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </PageButton>
          )
        )}
        <PageButton
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          &#8250;
        </PageButton>
      </PaginationControls>
    </PaginationWrapper>
  );
};

// Main Table Component
function TableInner<T extends Record<string, unknown>>(
  {
    columns,
    data,
    size = 'md',
    variant = 'default',
    loading = false,
    emptyMessage = 'No data available',
    sortable = false,
    defaultSort,
    onSort,
    selectable = false,
    selectedRows = new Set(),
    onSelectionChange,
    rowKey,
    pagination,
    onRowClick,
    rowClassName,
    stickyHeader = false,
    ...props
  }: TableProps<T>,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const [internalSort, setInternalSort] = useState<TableSortState>(
    defaultSort || { key: '', direction: null }
  );

  const currentSort = onSort ? defaultSort || { key: '', direction: null } : internalSort;

  const handleSort = useCallback(
    (columnKey: string) => {
      const newSort: TableSortState = {
        key: columnKey,
        direction:
          currentSort.key === columnKey
            ? currentSort.direction === 'asc'
              ? 'desc'
              : currentSort.direction === 'desc'
                ? null
                : 'asc'
            : 'asc',
      };

      if (onSort) {
        onSort(newSort);
      } else {
        setInternalSort(newSort);
      }
    },
    [currentSort, onSort]
  );

  const handleSelectAll = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (!onSelectionChange) return;

      if (e.target.checked) {
        const allKeys = new Set(data.map((row, index) => getRowKey(row, index, rowKey)));
        onSelectionChange(allKeys);
      } else {
        onSelectionChange(new Set());
      }
    },
    [data, rowKey, onSelectionChange]
  );

  const handleSelectRow = useCallback(
    (key: string | number) => {
      if (!onSelectionChange) return;

      const newSelection = new Set(selectedRows);
      if (newSelection.has(key)) {
        newSelection.delete(key);
      } else {
        newSelection.add(key);
      }
      onSelectionChange(newSelection);
    },
    [selectedRows, onSelectionChange]
  );

  // Sort data if using internal sorting
  const sortedData = useMemo(() => {
    if (!currentSort.key || !currentSort.direction) return data;

    const column = columns.find((col) => col.key === currentSort.key);
    if (!column) return data;

    return [...data].sort((a, b) => {
      const aValue = getCellValue(a, column);
      const bValue = getCellValue(b, column);

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return currentSort.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, columns, currentSort]);

  const isAllSelected = useMemo(
    () =>
      data.length > 0 &&
      data.every((row, index) => selectedRows.has(getRowKey(row, index, rowKey))),
    [data, selectedRows, rowKey]
  );

  const isIndeterminate = useMemo(
    () => selectedRows.size > 0 && !isAllSelected,
    [selectedRows, isAllSelected]
  );

  return (
    <TableWrapper ref={ref} $size={size} $variant={variant} {...props}>
      <StyledTable $stickyHeader={stickyHeader} role="table">
        <TableHead>
          <tr>
            {selectable && (
              <TableHeaderCell $sortable={false} $align="center" $width={40} scope="col">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={handleSelectAll}
                  aria-label="Select all rows"
                />
              </TableHeaderCell>
            )}
            {columns.map((column) => {
              const isSortable = sortable && column.sortable !== false;
              const isActive = currentSort.key === column.key;

              return (
                <TableHeaderCell
                  key={column.key}
                  $sortable={isSortable}
                  $align={column.align || 'left'}
                  $width={column.width}
                  onClick={isSortable ? () => handleSort(column.key) : undefined}
                  scope="col"
                  aria-sort={
                    isActive && currentSort.direction
                      ? currentSort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  {column.header}
                  {isSortable && (
                    <SortIcon
                      $active={isActive && currentSort.direction !== null}
                      $direction={isActive ? currentSort.direction : null}
                    />
                  )}
                </TableHeaderCell>
              );
            })}
          </tr>
        </TableHead>
        <TableBody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)}>
                <LoadingOverlay>
                  <Spinner />
                  Loading...
                </LoadingOverlay>
              </td>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)}>
                <EmptyState>{emptyMessage}</EmptyState>
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIndex) => {
              const key = getRowKey(row, rowIndex, rowKey);
              const isSelected = selectedRows.has(key);
              const className =
                typeof rowClassName === 'function' ? rowClassName(row, rowIndex) : rowClassName;

              return (
                <TableRow
                  key={key}
                  $clickable={!!onRowClick}
                  $selected={isSelected}
                  className={className}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {selectable && (
                    <CheckboxCell>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectRow(key)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select row ${rowIndex + 1}`}
                      />
                    </CheckboxCell>
                  )}
                  {columns.map((column) => {
                    const value = getCellValue(row, column);
                    const content = column.render
                      ? column.render(value, row, rowIndex)
                      : (value as ReactNode);

                    return (
                      <TableCell key={column.key} $align={column.align || 'left'}>
                        {content}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </StyledTable>
      {pagination && <Pagination {...pagination} />}
    </TableWrapper>
  );
}

export const Table = forwardRef(TableInner) as <T extends Record<string, unknown>>(
  props: TableProps<T> & { ref?: React.ForwardedRef<HTMLDivElement> }
) => React.ReactElement;

(Table as React.FC).displayName = 'Table';

export default Table;
