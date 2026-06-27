/**
 * Breadcrumbs Component
 * Breadcrumb navigation with customizable separators and items
 */

import React, {
  forwardRef,
  useCallback,
  type HTMLAttributes,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import styled, { css } from 'styled-components';

export type BreadcrumbsSize = 'sm' | 'md' | 'lg';
export type BreadcrumbsSeparator = 'slash' | 'chevron' | 'arrow' | 'dot' | ReactNode;

export interface BreadcrumbItem {
  id: string;
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  isCurrent?: boolean;
}

export interface BreadcrumbsProps extends HTMLAttributes<HTMLElement> {
  /** Breadcrumb items */
  items: BreadcrumbItem[];
  /** Size of the breadcrumbs */
  size?: BreadcrumbsSize;
  /** Separator between items */
  separator?: BreadcrumbsSeparator;
  /** Maximum number of items to show before collapsing */
  maxItems?: number;
  /** Number of items to show before the collapse */
  itemsBeforeCollapse?: number;
  /** Number of items to show after the collapse */
  itemsAfterCollapse?: number;
  /** Custom expand button content */
  expandButtonContent?: ReactNode;
  /** Callback when an item is clicked */
  onItemClick?: (item: BreadcrumbItem) => void;
  /** Whether to show home icon for first item */
  showHomeIcon?: boolean;
  /** Custom class name */
  className?: string;
}

const sizeStyles = {
  sm: css`
    font-size: 12px;

    & [data-breadcrumb-link] {
      padding: 2px 4px;
    }
  `,
  md: css`
    font-size: 14px;

    & [data-breadcrumb-link] {
      padding: 4px 8px;
    }
  `,
  lg: css`
    font-size: 16px;

    & [data-breadcrumb-link] {
      padding: 6px 10px;
    }
  `,
};

const StyledBreadcrumbs = styled.nav<{ $size: BreadcrumbsSize }>`
  display: flex;
  align-items: center;
  font-family: var(--font-family-sans, system-ui, sans-serif);

  ${({ $size }) => sizeStyles[$size]}
`;

const BreadcrumbList = styled.ol`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 4px;
`;

const BreadcrumbListItem = styled.li`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const BreadcrumbLink = styled.a<{
  $isCurrent: boolean;
  $disabled: boolean;
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: ${({ $isCurrent }) =>
    $isCurrent ? 'var(--color-text, #1f2937)' : 'var(--color-text-secondary, #6b7280)'};
  font-weight: ${({ $isCurrent }) => ($isCurrent ? '500' : '400')};
  border-radius: var(--radius-sm, 4px);
  cursor: ${({ $disabled, $isCurrent }) => ($disabled || $isCurrent ? 'default' : 'pointer')};
  transition: all 0.2s ease;

  ${({ $disabled }) =>
    $disabled &&
    css`
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    `}

  ${({ $isCurrent }) =>
    !$isCurrent &&
    css`
      &:hover:not([aria-disabled='true']) {
        color: var(--color-primary, #2563eb);
        background: var(--color-primary-light, #eff6ff);
      }
    `}

  &:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
    outline-offset: 2px;
  }
`;

const BreadcrumbIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const Separator = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary, #6b7280);
  opacity: 0.5;
  user-select: none;
  flex-shrink: 0;
`;

const ExpandButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary, #6b7280);
  font-size: inherit;
  cursor: pointer;
  border-radius: var(--radius-sm, 4px);
  transition: all 0.2s ease;

  &:hover {
    color: var(--color-primary, #2563eb);
    background: var(--color-primary-light, #eff6ff);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
    outline-offset: 2px;
  }
`;

const HomeIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9,22 9,12 15,12 15,22" />
  </svg>
);

const getSeparatorContent = (separator: BreadcrumbsSeparator): ReactNode => {
  if (React.isValidElement(separator)) {
    return separator;
  }

  switch (separator) {
    case 'slash':
      return '/';
    case 'chevron':
      return (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9,18 15,12 9,6" />
        </svg>
      );
    case 'arrow':
      return (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12,5 19,12 12,19" />
        </svg>
      );
    case 'dot':
      return (
        <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
          <circle cx="3" cy="3" r="3" />
        </svg>
      );
    default:
      return '/';
  }
};

export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(
  (
    {
      items,
      size = 'md',
      separator = 'chevron',
      maxItems,
      itemsBeforeCollapse = 1,
      itemsAfterCollapse = 2,
      expandButtonContent = '...',
      onItemClick,
      showHomeIcon = false,
      className,
      ...props
    },
    ref
  ) => {
    const [isExpanded, setIsExpanded] = React.useState(false);

    const shouldCollapse = maxItems !== undefined && items.length > maxItems && !isExpanded;

    const getVisibleItems = (): (BreadcrumbItem | 'expand')[] => {
      if (!shouldCollapse) {
        return items;
      }

      const beforeItems = items.slice(0, itemsBeforeCollapse);
      const afterItems = items.slice(-itemsAfterCollapse);

      return [...beforeItems, 'expand' as const, ...afterItems];
    };

    const visibleItems = getVisibleItems();

    const handleItemClick = useCallback(
      (item: BreadcrumbItem, e: React.MouseEvent) => {
        if (item.disabled || item.isCurrent) {
          e.preventDefault();
          return;
        }

        if (!item.href) {
          e.preventDefault();
        }

        item.onClick?.();
        onItemClick?.(item);
      },
      [onItemClick]
    );

    const handleKeyDown = useCallback(
      (item: BreadcrumbItem, e: KeyboardEvent<HTMLAnchorElement>) => {
        if (item.disabled || item.isCurrent) return;

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.onClick?.();
          onItemClick?.(item);
        }
      },
      [onItemClick]
    );

    const handleExpandClick = () => {
      setIsExpanded(true);
    };

    const handleExpandKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsExpanded(true);
      }
    };

    const separatorContent = getSeparatorContent(separator);

    return (
      <StyledBreadcrumbs
        ref={ref}
        $size={size}
        className={className}
        aria-label="Breadcrumb"
        {...props}
      >
        <BreadcrumbList>
          {visibleItems.map((item, index) => {
            const isLast = index === visibleItems.length - 1;

            if (item === 'expand') {
              return (
                <BreadcrumbListItem key="expand">
                  <ExpandButton
                    type="button"
                    onClick={handleExpandClick}
                    onKeyDown={handleExpandKeyDown}
                    aria-label="Show hidden breadcrumbs"
                  >
                    {expandButtonContent}
                  </ExpandButton>
                  {!isLast && <Separator aria-hidden="true">{separatorContent}</Separator>}
                </BreadcrumbListItem>
              );
            }

            const isCurrent = item.isCurrent ?? isLast;
            const isFirst = index === 0;
            const showHome = showHomeIcon && isFirst && !item.icon;

            return (
              <BreadcrumbListItem key={item.id}>
                <BreadcrumbLink
                  href={item.href}
                  onClick={(e) => handleItemClick(item, e)}
                  onKeyDown={(e) => handleKeyDown(item, e)}
                  $isCurrent={isCurrent}
                  $disabled={item.disabled || false}
                  aria-current={isCurrent ? 'page' : undefined}
                  aria-disabled={item.disabled}
                  tabIndex={item.disabled || isCurrent ? -1 : 0}
                  data-breadcrumb-link
                >
                  {(showHome || item.icon) && (
                    <BreadcrumbIcon>{showHome ? <HomeIcon /> : item.icon}</BreadcrumbIcon>
                  )}
                  {item.label}
                </BreadcrumbLink>
                {!isLast && <Separator aria-hidden="true">{separatorContent}</Separator>}
              </BreadcrumbListItem>
            );
          })}
        </BreadcrumbList>
      </StyledBreadcrumbs>
    );
  }
);

Breadcrumbs.displayName = 'Breadcrumbs';

export default Breadcrumbs;
