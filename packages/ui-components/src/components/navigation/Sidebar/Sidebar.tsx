/**
 * Sidebar Component
 * Collapsible sidebar navigation with sections, items, and icons
 */

import React, {
  forwardRef,
  useState,
  useCallback,
  useRef,
  useEffect,
  createContext,
  useContext,
  type HTMLAttributes,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import styled, { css } from 'styled-components';

export type SidebarVariant = 'default' | 'compact' | 'floating';
export type SidebarPosition = 'left' | 'right';

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
  badge?: ReactNode;
  children?: SidebarItem[];
}

export interface SidebarSection {
  id: string;
  title?: string;
  items: SidebarItem[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export interface SidebarContextValue {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  variant: SidebarVariant;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('Sidebar components must be used within a Sidebar');
  }
  return context;
};

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  /** Sidebar sections with items */
  sections?: SidebarSection[];
  /** Visual variant */
  variant?: SidebarVariant;
  /** Position of the sidebar */
  position?: SidebarPosition;
  /** Width when expanded */
  width?: number;
  /** Width when collapsed */
  collapsedWidth?: number;
  /** Whether the sidebar is collapsible */
  collapsible?: boolean;
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Default collapsed state for uncontrolled mode */
  defaultCollapsed?: boolean;
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Header content */
  header?: ReactNode;
  /** Footer content */
  footer?: ReactNode;
  /** Custom class name */
  className?: string;
}

const variantStyles = {
  default: css`
    background: var(--color-background, #ffffff);
    border-right: 1px solid var(--color-border, #e5e7eb);
  `,
  compact: css`
    background: var(--color-background, #ffffff);
    border-right: 1px solid var(--color-border, #e5e7eb);
  `,
  floating: css`
    background: var(--color-background, #ffffff);
    border-radius: var(--radius-lg, 12px);
    box-shadow: var(--shadow-lg, 0 10px 40px rgba(0, 0, 0, 0.1));
    margin: var(--spacing-md, 16px);
  `,
};

const StyledSidebar = styled.aside<{
  $variant: SidebarVariant;
  $position: SidebarPosition;
  $width: number;
  $collapsedWidth: number;
  $isCollapsed: boolean;
}>`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: ${({ $isCollapsed, $width, $collapsedWidth }) =>
    $isCollapsed ? $collapsedWidth : $width}px;
  font-family: var(--font-family-sans, system-ui, sans-serif);
  transition: width 0.2s ease;
  overflow: hidden;

  ${({ $variant }) => variantStyles[$variant]}

  ${({ $position }) =>
    $position === 'right' &&
    css`
      border-right: none;
      border-left: 1px solid var(--color-border, #e5e7eb);
    `}
`;

const SidebarHeader = styled.div<{ $isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: ${({ $isCollapsed }) =>
    $isCollapsed ? 'center' : 'space-between'};
  padding: var(--spacing-md, 16px);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  min-height: 64px;
`;

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--spacing-sm, 8px);
`;

const SidebarFooter = styled.div`
  padding: var(--spacing-md, 16px);
  border-top: 1px solid var(--color-border, #e5e7eb);
`;

const CollapseButton = styled.button<{ $position: SidebarPosition }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  color: var(--color-text-secondary, #6b7280);
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-gray-100, #f3f4f6);
    color: var(--color-text, #1f2937);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
    outline-offset: 2px;
  }
`;

const CollapseIcon = styled.span<{
  $isCollapsed: boolean;
  $position: SidebarPosition;
}>`
  display: block;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 5px 6px 5px 0;
  border-color: transparent currentColor transparent transparent;
  transform: ${({ $isCollapsed, $position }) => {
    if ($position === 'right') {
      return $isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
    }
    return $isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)';
  }};
  transition: transform 0.2s ease;
`;

const SectionContainer = styled.div`
  margin-bottom: var(--spacing-sm, 8px);
`;

const SectionHeader = styled.button<{ $collapsible: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--spacing-xs, 8px) var(--spacing-sm, 8px);
  background: transparent;
  border: none;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary, #6b7280);
  cursor: ${({ $collapsible }) => ($collapsible ? 'pointer' : 'default')};
  transition: all 0.2s ease;

  ${({ $collapsible }) =>
    $collapsible &&
    css`
      &:hover {
        color: var(--color-text, #1f2937);
      }

      &:focus-visible {
        outline: 2px solid var(--color-primary, #2563eb);
        outline-offset: 2px;
        border-radius: var(--radius-sm, 4px);
      }
    `}
`;

const SectionTitle = styled.span<{ $isCollapsed: boolean }>`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: ${({ $isCollapsed }) => ($isCollapsed ? 0 : 1)};
  transition: opacity 0.2s ease;
`;

const SectionCollapseIcon = styled.span<{ $isExpanded: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  transform: ${({ $isExpanded }) =>
    $isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};
  transition: transform 0.2s ease;
`;

const ItemsList = styled.ul<{ $isExpanded: boolean }>`
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: ${({ $isExpanded }) => ($isExpanded ? '1000px' : '0')};
  opacity: ${({ $isExpanded }) => ($isExpanded ? 1 : 0)};
  overflow: hidden;
  transition: all 0.2s ease;
`;

const ItemContainer = styled.li`
  margin: 2px 0;
`;

const StyledItem = styled.a<{
  $isActive: boolean;
  $disabled: boolean;
  $isCollapsed: boolean;
  $hasChildren: boolean;
  $depth: number;
}>`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-sm, 8px)
    ${({ $isCollapsed }) =>
      $isCollapsed ? 'var(--spacing-sm, 8px)' : 'var(--spacing-md, 16px)'};
  padding-left: ${({ $depth, $isCollapsed }) =>
    $isCollapsed ? 'var(--spacing-sm, 8px)' : `${16 + $depth * 16}px`};
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  color: var(--color-text, #1f2937);
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: all 0.2s ease;
  justify-content: ${({ $isCollapsed }) =>
    $isCollapsed ? 'center' : 'flex-start'};

  ${({ $isActive }) =>
    $isActive &&
    css`
      background: var(--color-primary-light, #eff6ff);
      color: var(--color-primary, #2563eb);
    `}

  ${({ $disabled }) =>
    $disabled &&
    css`
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    `}

  &:hover:not([aria-disabled='true']) {
    background: var(--color-gray-100, #f3f4f6);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
    outline-offset: 2px;
  }
`;

const ItemIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
`;

const ItemLabel = styled.span<{ $isCollapsed: boolean }>`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: ${({ $isCollapsed }) => ($isCollapsed ? 'none' : 'block')};
`;

const ItemBadge = styled.span<{ $isCollapsed: boolean }>`
  display: ${({ $isCollapsed }) => ($isCollapsed ? 'none' : 'flex')};
  align-items: center;
  justify-content: center;
`;

const ItemExpandIcon = styled.span<{
  $isExpanded: boolean;
  $isCollapsed: boolean;
}>`
  display: ${({ $isCollapsed }) => ($isCollapsed ? 'none' : 'flex')};
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  transform: ${({ $isExpanded }) =>
    $isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'};
  transition: transform 0.2s ease;
`;

const ChildrenList = styled.ul<{ $isExpanded: boolean }>`
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: ${({ $isExpanded }) => ($isExpanded ? '500px' : '0')};
  opacity: ${({ $isExpanded }) => ($isExpanded ? 1 : 0)};
  overflow: hidden;
  transition: all 0.2s ease;
`;

// Tooltip for collapsed state
const Tooltip = styled.div<{ $visible: boolean }>`
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  margin-left: 8px;
  padding: var(--spacing-xs, 8px) var(--spacing-sm, 8px);
  background: var(--color-gray-900, #111827);
  color: white;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-sm, 4px);
  white-space: nowrap;
  z-index: 1000;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
  transition: all 0.15s ease;
  pointer-events: none;

  &::before {
    content: '';
    position: absolute;
    right: 100%;
    top: 50%;
    transform: translateY(-50%);
    border: 4px solid transparent;
    border-right-color: var(--color-gray-900, #111827);
  }
`;

const ItemWrapper = styled.div`
  position: relative;
`;

// SidebarItemComponent for rendering nested items
interface SidebarItemComponentProps {
  item: SidebarItem;
  depth?: number;
}

const SidebarItemComponent: React.FC<SidebarItemComponentProps> = ({
  item,
  depth = 0,
}) => {
  const { isCollapsed, variant } = useSidebarContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    if (item.disabled) return;

    if (hasChildren && !isCollapsed) {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    } else {
      item.onClick?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (item.disabled) return;

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (hasChildren && !isCollapsed) {
        setIsExpanded(!isExpanded);
      } else {
        item.onClick?.();
      }
    }

    if (hasChildren && !isCollapsed) {
      if (e.key === 'ArrowRight' && !isExpanded) {
        e.preventDefault();
        setIsExpanded(true);
      }
      if (e.key === 'ArrowLeft' && isExpanded) {
        e.preventDefault();
        setIsExpanded(false);
      }
    }
  };

  return (
    <ItemContainer>
      <ItemWrapper
        onMouseEnter={() => isCollapsed && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <StyledItem
          href={item.href}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          $isActive={item.isActive || false}
          $disabled={item.disabled || false}
          $isCollapsed={isCollapsed}
          $hasChildren={hasChildren || false}
          $depth={depth}
          role="menuitem"
          aria-current={item.isActive ? 'page' : undefined}
          aria-disabled={item.disabled}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-haspopup={hasChildren ? 'true' : undefined}
          tabIndex={item.disabled ? -1 : 0}
        >
          {item.icon && <ItemIcon>{item.icon}</ItemIcon>}
          <ItemLabel $isCollapsed={isCollapsed}>{item.label}</ItemLabel>
          {item.badge && (
            <ItemBadge $isCollapsed={isCollapsed}>{item.badge}</ItemBadge>
          )}
          {hasChildren && (
            <ItemExpandIcon $isExpanded={isExpanded} $isCollapsed={isCollapsed}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                <path d="M2 0L8 4L2 8V0Z" />
              </svg>
            </ItemExpandIcon>
          )}
        </StyledItem>
        {isCollapsed && variant !== 'compact' && (
          <Tooltip $visible={showTooltip}>{item.label}</Tooltip>
        )}
      </ItemWrapper>
      {hasChildren && !isCollapsed && (
        <ChildrenList $isExpanded={isExpanded} role="menu">
          {item.children!.map((child) => (
            <SidebarItemComponent key={child.id} item={child} depth={depth + 1} />
          ))}
        </ChildrenList>
      )}
    </ItemContainer>
  );
};

// SidebarSectionComponent
interface SidebarSectionComponentProps {
  section: SidebarSection;
}

const SidebarSectionComponent: React.FC<SidebarSectionComponentProps> = ({
  section,
}) => {
  const { isCollapsed } = useSidebarContext();
  const [isExpanded, setIsExpanded] = useState(!section.defaultCollapsed);
  const listRef = useRef<HTMLUListElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLUListElement>) => {
      const focusableItems = listRef.current?.querySelectorAll(
        'a:not([aria-disabled="true"])'
      );
      if (!focusableItems || focusableItems.length === 0) return;

      const currentIndex = Array.from(focusableItems).findIndex(
        (el) => el === document.activeElement
      );

      let nextIndex: number;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          nextIndex =
            currentIndex < focusableItems.length - 1 ? currentIndex + 1 : 0;
          (focusableItems[nextIndex] as HTMLElement).focus();
          break;
        case 'ArrowUp':
          e.preventDefault();
          nextIndex =
            currentIndex > 0 ? currentIndex - 1 : focusableItems.length - 1;
          (focusableItems[nextIndex] as HTMLElement).focus();
          break;
        case 'Home':
          e.preventDefault();
          (focusableItems[0] as HTMLElement).focus();
          break;
        case 'End':
          e.preventDefault();
          (focusableItems[focusableItems.length - 1] as HTMLElement).focus();
          break;
      }
    },
    []
  );

  return (
    <SectionContainer>
      {section.title && !isCollapsed && (
        <SectionHeader
          $collapsible={section.collapsible || false}
          onClick={() => section.collapsible && setIsExpanded(!isExpanded)}
          aria-expanded={section.collapsible ? isExpanded : undefined}
          aria-controls={`section-${section.id}`}
          tabIndex={section.collapsible ? 0 : -1}
        >
          <SectionTitle $isCollapsed={isCollapsed}>{section.title}</SectionTitle>
          {section.collapsible && (
            <SectionCollapseIcon $isExpanded={isExpanded}>
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                <path d="M2 0L8 4L2 8V0Z" />
              </svg>
            </SectionCollapseIcon>
          )}
        </SectionHeader>
      )}
      <ItemsList
        id={`section-${section.id}`}
        ref={listRef}
        $isExpanded={!section.collapsible || isExpanded || isCollapsed}
        role="menu"
        aria-label={section.title}
        onKeyDown={handleKeyDown}
      >
        {section.items.map((item) => (
          <SidebarItemComponent key={item.id} item={item} />
        ))}
      </ItemsList>
    </SectionContainer>
  );
};

export const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  (
    {
      sections = [],
      variant = 'default',
      position = 'left',
      width = 260,
      collapsedWidth = 64,
      collapsible = true,
      collapsed,
      defaultCollapsed = false,
      onCollapsedChange,
      header,
      footer,
      className,
      ...props
    },
    ref
  ) => {
    const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
    const isControlled = collapsed !== undefined;
    const isCollapsed = isControlled ? collapsed : internalCollapsed;

    const toggleCollapse = useCallback(() => {
      if (isControlled) {
        onCollapsedChange?.(!collapsed);
      } else {
        setInternalCollapsed(!internalCollapsed);
        onCollapsedChange?.(!internalCollapsed);
      }
    }, [isControlled, collapsed, internalCollapsed, onCollapsedChange]);

    // Handle keyboard shortcut for collapsing
    useEffect(() => {
      const handleKeyDown = (e: globalThis.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === '\\' && collapsible) {
          e.preventDefault();
          toggleCollapse();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [collapsible, toggleCollapse]);

    const contextValue: SidebarContextValue = {
      isCollapsed,
      toggleCollapse,
      variant,
    };

    return (
      <SidebarContext.Provider value={contextValue}>
        <StyledSidebar
          ref={ref}
          $variant={variant}
          $position={position}
          $width={width}
          $collapsedWidth={collapsedWidth}
          $isCollapsed={isCollapsed}
          className={className}
          role="navigation"
          aria-label="Sidebar navigation"
          {...props}
        >
          {(header || collapsible) && (
            <SidebarHeader $isCollapsed={isCollapsed}>
              {!isCollapsed && header}
              {collapsible && (
                <CollapseButton
                  type="button"
                  $position={position}
                  onClick={toggleCollapse}
                  aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  aria-expanded={!isCollapsed}
                  title={`${isCollapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+\\)`}
                >
                  <CollapseIcon $isCollapsed={isCollapsed} $position={position} />
                </CollapseButton>
              )}
            </SidebarHeader>
          )}

          <SidebarContent>
            {sections.map((section) => (
              <SidebarSectionComponent key={section.id} section={section} />
            ))}
          </SidebarContent>

          {footer && !isCollapsed && <SidebarFooter>{footer}</SidebarFooter>}
        </StyledSidebar>
      </SidebarContext.Provider>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export { useSidebarContext };
export default Sidebar;
