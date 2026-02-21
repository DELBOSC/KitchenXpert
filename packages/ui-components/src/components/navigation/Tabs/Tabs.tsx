/**
 * Tabs Component
 * Tab navigation with panels, variants, and controlled/uncontrolled modes
 */

import React, {
  forwardRef,
  useState,
  useCallback,
  useRef,
  useId,
  type HTMLAttributes,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import styled, { css } from 'styled-components';

export type TabsVariant = 'default' | 'pills' | 'underline' | 'enclosed';
export type TabsSize = 'sm' | 'md' | 'lg';
export type TabsOrientation = 'horizontal' | 'vertical';

export interface Tab {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  badge?: ReactNode;
}

export interface TabPanel {
  id: string;
  content: ReactNode;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Tab definitions */
  tabs: Tab[];
  /** Tab panels content */
  panels?: TabPanel[];
  /** Visual variant */
  variant?: TabsVariant;
  /** Size of the tabs */
  size?: TabsSize;
  /** Orientation */
  orientation?: TabsOrientation;
  /** Controlled active tab id */
  activeTab?: string;
  /** Default active tab id for uncontrolled mode */
  defaultActiveTab?: string;
  /** Callback when active tab changes */
  onChange?: (tabId: string) => void;
  /** Whether tabs should take full width */
  fullWidth?: boolean;
  /** Whether to lazy load panel content */
  lazyLoad?: boolean;
  /** Whether to keep panels mounted when inactive */
  keepMounted?: boolean;
  /** Custom class name */
  className?: string;
  /** Render function for custom tab content */
  renderTab?: (tab: Tab, isActive: boolean) => ReactNode;
}

const sizeStyles = {
  sm: css`
    padding: 6px 12px;
    font-size: 13px;
    min-height: 32px;
  `,
  md: css`
    padding: 8px 16px;
    font-size: 14px;
    min-height: 40px;
  `,
  lg: css`
    padding: 12px 24px;
    font-size: 16px;
    min-height: 48px;
  `,
};

const TabsContainer = styled.div<{ $orientation: TabsOrientation }>`
  display: flex;
  flex-direction: ${({ $orientation }) =>
    $orientation === 'vertical' ? 'row' : 'column'};
  font-family: var(--font-family-sans, system-ui, sans-serif);
`;

const TabList = styled.div<{
  $variant: TabsVariant;
  $orientation: TabsOrientation;
  $fullWidth: boolean;
}>`
  display: flex;
  flex-direction: ${({ $orientation }) =>
    $orientation === 'vertical' ? 'column' : 'row'};
  gap: ${({ $variant }) => ($variant === 'pills' ? '8px' : '0')};
  flex-shrink: 0;

  ${({ $fullWidth, $orientation }) =>
    $fullWidth &&
    $orientation === 'horizontal' &&
    css`
      width: 100%;

      & > * {
        flex: 1;
      }
    `}

  ${({ $variant, $orientation }) =>
    $variant === 'default' &&
    css`
      border-bottom: ${$orientation === 'horizontal'
        ? '1px solid var(--color-border, #e5e7eb)'
        : 'none'};
      border-right: ${$orientation === 'vertical'
        ? '1px solid var(--color-border, #e5e7eb)'
        : 'none'};
    `}

  ${({ $variant, $orientation }) =>
    $variant === 'underline' &&
    css`
      border-bottom: ${$orientation === 'horizontal'
        ? '2px solid var(--color-border, #e5e7eb)'
        : 'none'};
      border-right: ${$orientation === 'vertical'
        ? '2px solid var(--color-border, #e5e7eb)'
        : 'none'};
    `}

  ${({ $variant }) =>
    $variant === 'enclosed' &&
    css`
      background: var(--color-gray-100, #f3f4f6);
      padding: 4px;
      border-radius: var(--radius-lg, 12px);
    `}
`;

const TabButton = styled.button<{
  $variant: TabsVariant;
  $size: TabsSize;
  $isActive: boolean;
  $disabled: boolean;
  $orientation: TabsOrientation;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--color-text-secondary, #6b7280);
  transition: all 0.2s ease;
  white-space: nowrap;
  position: relative;

  ${({ $size }) => sizeStyles[$size]}

  ${({ $disabled }) =>
    $disabled &&
    css`
      opacity: 0.5;
      cursor: not-allowed;
    `}

  /* Default variant */
  ${({ $variant, $isActive, $orientation }) =>
    $variant === 'default' &&
    css`
      margin-bottom: ${$orientation === 'horizontal' ? '-1px' : '0'};
      margin-right: ${$orientation === 'vertical' ? '-1px' : '0'};
      border-bottom: ${$orientation === 'horizontal'
        ? '2px solid transparent'
        : 'none'};
      border-right: ${$orientation === 'vertical'
        ? '2px solid transparent'
        : 'none'};
      border-radius: 0;

      ${$isActive &&
      css`
        color: var(--color-primary, #2563eb);
        border-bottom-color: ${$orientation === 'horizontal'
          ? 'var(--color-primary, #2563eb)'
          : 'transparent'};
        border-right-color: ${$orientation === 'vertical'
          ? 'var(--color-primary, #2563eb)'
          : 'transparent'};
      `}

      &:hover:not(:disabled) {
        color: var(--color-primary, #2563eb);
      }
    `}

  /* Pills variant */
  ${({ $variant, $isActive }) =>
    $variant === 'pills' &&
    css`
      border-radius: var(--radius-md, 8px);

      ${$isActive &&
      css`
        background: var(--color-primary, #2563eb);
        color: white;
      `}

      &:hover:not(:disabled) {
        ${!$isActive &&
        css`
          background: var(--color-gray-100, #f3f4f6);
        `}
      }
    `}

  /* Underline variant */
  ${({ $variant, $isActive, $orientation }) =>
    $variant === 'underline' &&
    css`
      margin-bottom: ${$orientation === 'horizontal' ? '-2px' : '0'};
      margin-right: ${$orientation === 'vertical' ? '-2px' : '0'};
      border-bottom: ${$orientation === 'horizontal'
        ? '2px solid transparent'
        : 'none'};
      border-right: ${$orientation === 'vertical'
        ? '2px solid transparent'
        : 'none'};
      border-radius: 0;

      ${$isActive &&
      css`
        color: var(--color-primary, #2563eb);
        border-bottom-color: ${$orientation === 'horizontal'
          ? 'var(--color-primary, #2563eb)'
          : 'transparent'};
        border-right-color: ${$orientation === 'vertical'
          ? 'var(--color-primary, #2563eb)'
          : 'transparent'};
      `}

      &:hover:not(:disabled) {
        color: var(--color-text, #1f2937);
      }
    `}

  /* Enclosed variant */
  ${({ $variant, $isActive }) =>
    $variant === 'enclosed' &&
    css`
      border-radius: var(--radius-md, 8px);

      ${$isActive &&
      css`
        background: var(--color-background, #ffffff);
        color: var(--color-text, #1f2937);
        box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
      `}

      &:hover:not(:disabled) {
        ${!$isActive &&
        css`
          color: var(--color-text, #1f2937);
        `}
      }
    `}

  &:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
    outline-offset: 2px;
    z-index: 1;
  }
`;

const TabIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const TabBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const TabPanelContainer = styled.div<{ $orientation: TabsOrientation }>`
  flex: 1;
  padding: ${({ $orientation }) =>
    $orientation === 'vertical'
      ? 'var(--spacing-md, 16px)'
      : 'var(--spacing-md, 16px) 0'};
`;

const StyledTabPanel = styled.div<{ $isActive: boolean }>`
  display: ${({ $isActive }) => ($isActive ? 'block' : 'none')};
`;

export interface TabPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Panel id matching tab id */
  id: string;
  /** Whether this panel is active */
  isActive?: boolean;
  /** Tab panel content */
  children: ReactNode;
}

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(
  ({ id, isActive = false, children, ...props }, ref) => {
    return (
      <StyledTabPanel
        ref={ref}
        id={`tabpanel-${id}`}
        role="tabpanel"
        aria-labelledby={`tab-${id}`}
        $isActive={isActive}
        hidden={!isActive}
        tabIndex={0}
        {...props}
      >
        {children}
      </StyledTabPanel>
    );
  }
);

TabPanel.displayName = 'TabPanel';

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      tabs,
      panels,
      variant = 'default',
      size = 'md',
      orientation = 'horizontal',
      activeTab,
      defaultActiveTab,
      onChange,
      fullWidth = false,
      lazyLoad = false,
      keepMounted = true,
      className,
      renderTab,
      children,
      ...props
    },
    ref
  ) => {
    const instanceId = useId();
    const tabListRef = useRef<HTMLDivElement>(null);
    const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
      new Set(defaultActiveTab ? [defaultActiveTab] : tabs.length > 0 && tabs[0] ? [tabs[0].id] : [])
    );

    // Determine if controlled or uncontrolled
    const isControlled = activeTab !== undefined;
    const [internalActiveTab, setInternalActiveTab] = useState(
      defaultActiveTab || (tabs.length > 0 && tabs[0] ? tabs[0].id : '')
    );
    const currentActiveTab = isControlled ? activeTab : internalActiveTab;

    const handleTabChange = useCallback(
      (tabId: string) => {
        const tab = tabs.find((t) => t.id === tabId);
        if (tab?.disabled) return;

        if (!isControlled) {
          setInternalActiveTab(tabId);
        }

        setVisitedTabs((prev) => new Set([...prev, tabId]));
        onChange?.(tabId);
      },
      [tabs, isControlled, onChange]
    );

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        const enabledTabs = tabs.filter((t) => !t.disabled);
        const currentIndex = enabledTabs.findIndex(
          (t) => t.id === currentActiveTab
        );

        if (currentIndex === -1) return;

        let nextIndex: number;
        const isHorizontal = orientation === 'horizontal';

        switch (e.key) {
          case 'ArrowRight': {
            if (!isHorizontal) return;
            e.preventDefault();
            nextIndex =
              currentIndex < enabledTabs.length - 1 ? currentIndex + 1 : 0;
            const rightTab = enabledTabs[nextIndex];
            if (rightTab) {
              handleTabChange(rightTab.id);
              focusTab(rightTab.id);
            }
            break;
          }
          case 'ArrowLeft': {
            if (!isHorizontal) return;
            e.preventDefault();
            nextIndex =
              currentIndex > 0 ? currentIndex - 1 : enabledTabs.length - 1;
            const leftTab = enabledTabs[nextIndex];
            if (leftTab) {
              handleTabChange(leftTab.id);
              focusTab(leftTab.id);
            }
            break;
          }
          case 'ArrowDown': {
            if (isHorizontal) return;
            e.preventDefault();
            nextIndex =
              currentIndex < enabledTabs.length - 1 ? currentIndex + 1 : 0;
            const downTab = enabledTabs[nextIndex];
            if (downTab) {
              handleTabChange(downTab.id);
              focusTab(downTab.id);
            }
            break;
          }
          case 'ArrowUp': {
            if (isHorizontal) return;
            e.preventDefault();
            nextIndex =
              currentIndex > 0 ? currentIndex - 1 : enabledTabs.length - 1;
            const upTab = enabledTabs[nextIndex];
            if (upTab) {
              handleTabChange(upTab.id);
              focusTab(upTab.id);
            }
            break;
          }
          case 'Home': {
            e.preventDefault();
            const firstTab = enabledTabs[0];
            if (firstTab) {
              handleTabChange(firstTab.id);
              focusTab(firstTab.id);
            }
            break;
          }
          case 'End': {
            e.preventDefault();
            const lastTab = enabledTabs[enabledTabs.length - 1];
            if (lastTab) {
              handleTabChange(lastTab.id);
              focusTab(lastTab.id);
            }
            break;
          }
        }
      },
      [tabs, currentActiveTab, orientation, handleTabChange]
    );

    const focusTab = (tabId: string) => {
      const tabButton = tabListRef.current?.querySelector(
        `[data-tab-id="${tabId}"]`
      ) as HTMLElement;
      tabButton?.focus();
    };

    // Determine which panels should be rendered
    const shouldRenderPanel = (panelId: string) => {
      if (!lazyLoad) return true;
      if (keepMounted) return visitedTabs.has(panelId);
      return panelId === currentActiveTab;
    };

    return (
      <TabsContainer
        ref={ref}
        $orientation={orientation}
        className={className}
        {...props}
      >
        <TabList
          ref={tabListRef}
          $variant={variant}
          $orientation={orientation}
          $fullWidth={fullWidth}
          role="tablist"
          aria-orientation={orientation}
          onKeyDown={handleKeyDown}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === currentActiveTab;

            return (
              <TabButton
                key={tab.id}
                id={`tab-${instanceId}-${tab.id}`}
                data-tab-id={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${instanceId}-${tab.id}`}
                aria-disabled={tab.disabled}
                tabIndex={isActive ? 0 : -1}
                $variant={variant}
                $size={size}
                $isActive={isActive}
                $disabled={tab.disabled || false}
                $orientation={orientation}
                disabled={tab.disabled}
                onClick={() => handleTabChange(tab.id)}
              >
                {renderTab ? (
                  renderTab(tab, isActive)
                ) : (
                  <>
                    {tab.icon && <TabIcon>{tab.icon}</TabIcon>}
                    {tab.label}
                    {tab.badge && <TabBadge>{tab.badge}</TabBadge>}
                  </>
                )}
              </TabButton>
            );
          })}
        </TabList>

        <TabPanelContainer $orientation={orientation}>
          {panels
            ? panels.map((panel) => {
                const isActive = panel.id === currentActiveTab;
                if (!shouldRenderPanel(panel.id)) return null;

                return (
                  <StyledTabPanel
                    key={panel.id}
                    id={`tabpanel-${instanceId}-${panel.id}`}
                    role="tabpanel"
                    aria-labelledby={`tab-${instanceId}-${panel.id}`}
                    $isActive={isActive}
                    hidden={!isActive}
                    tabIndex={0}
                  >
                    {panel.content}
                  </StyledTabPanel>
                );
              })
            : children}
        </TabPanelContainer>
      </TabsContainer>
    );
  }
);

Tabs.displayName = 'Tabs';

export default Tabs;
