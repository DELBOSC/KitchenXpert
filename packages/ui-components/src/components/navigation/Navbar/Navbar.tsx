/**
 * Navbar Component
 * Responsive navigation bar with logo, links, actions, and mobile menu
 */

import React, {
  forwardRef,
  useState,
  useCallback,
  useRef,
  useEffect,
  type HTMLAttributes,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import styled, { css } from 'styled-components';

export type NavbarVariant = 'default' | 'transparent' | 'filled';
export type NavbarPosition = 'static' | 'fixed' | 'sticky';

export interface NavLink {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  isActive?: boolean;
  disabled?: boolean;
}

export interface NavbarProps extends HTMLAttributes<HTMLElement> {
  /** Logo element to display on the left */
  logo?: ReactNode;
  /** Navigation links */
  links?: NavLink[];
  /** Actions to display on the right (buttons, icons, etc.) */
  actions?: ReactNode;
  /** Visual variant */
  variant?: NavbarVariant;
  /** Position behavior */
  position?: NavbarPosition;
  /** Height of the navbar */
  height?: number;
  /** Breakpoint for mobile menu (in pixels) */
  mobileBreakpoint?: number;
  /** Custom mobile menu content */
  mobileMenuContent?: ReactNode;
  /** Callback when mobile menu opens/closes */
  onMobileMenuToggle?: (isOpen: boolean) => void;
  /** Whether the navbar has a bottom border */
  bordered?: boolean;
  /** Whether to show shadow */
  elevated?: boolean;
  /** Custom class name */
  className?: string;
}

const positionStyles = {
  static: css`
    position: static;
  `,
  fixed: css`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: var(--z-index-navbar, 1000);
  `,
  sticky: css`
    position: sticky;
    top: 0;
    z-index: var(--z-index-navbar, 1000);
  `,
};

const variantStyles = {
  default: css`
    background: var(--color-background, #ffffff);
    color: var(--color-text, #1f2937);
  `,
  transparent: css`
    background: transparent;
    color: var(--color-text, #1f2937);
  `,
  filled: css`
    background: var(--color-primary, #2563eb);
    color: white;
  `,
};

const StyledNavbar = styled.nav<{
  $variant: NavbarVariant;
  $position: NavbarPosition;
  $height: number;
  $bordered: boolean;
  $elevated: boolean;
  $mobileBreakpoint: number;
}>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: ${({ $height }) => $height}px;
  padding: 0 var(--spacing-md, 16px);
  font-family: var(--font-family-sans, system-ui, sans-serif);
  transition: all 0.2s ease;

  ${({ $variant }) => variantStyles[$variant]}
  ${({ $position }) => positionStyles[$position]}

  ${({ $bordered }) =>
    $bordered &&
    css`
      border-bottom: 1px solid var(--color-border, #e5e7eb);
    `}

  ${({ $elevated }) =>
    $elevated &&
    css`
      box-shadow: var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.1));
    `}
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const NavLinksContainer = styled.ul<{ $mobileBreakpoint: number }>`
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 8px);
  list-style: none;
  margin: 0;
  padding: 0;

  @media (max-width: ${({ $mobileBreakpoint }) => $mobileBreakpoint}px) {
    display: none;
  }
`;

const NavLinkItem = styled.li`
  display: flex;
`;

const StyledNavLink = styled.a<{
  $isActive: boolean;
  $disabled: boolean;
  $variant: NavbarVariant;
}>`
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs, 8px);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  transition: all 0.2s ease;
  color: inherit;

  ${({ $isActive, $variant }) =>
    $isActive &&
    css`
      background: ${$variant === 'filled'
        ? 'rgba(255, 255, 255, 0.15)'
        : 'var(--color-primary-light, #eff6ff)'};
      color: ${$variant === 'filled'
        ? 'white'
        : 'var(--color-primary, #2563eb)'};
    `}

  ${({ $disabled }) =>
    $disabled &&
    css`
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    `}

  &:hover:not([aria-disabled='true']) {
    background: ${({ $variant }) =>
      $variant === 'filled'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'var(--color-gray-100, #f3f4f6)'};
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
    outline-offset: 2px;
  }
`;

const ActionsContainer = styled.div<{ $mobileBreakpoint: number }>`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  flex-shrink: 0;

  @media (max-width: ${({ $mobileBreakpoint }) => $mobileBreakpoint}px) {
    display: none;
  }
`;

const MobileMenuButton = styled.button<{
  $isOpen: boolean;
  $mobileBreakpoint: number;
  $variant: NavbarVariant;
}>`
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  color: inherit;
  transition: all 0.2s ease;

  @media (max-width: ${({ $mobileBreakpoint }) => $mobileBreakpoint}px) {
    display: flex;
  }

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'filled'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'var(--color-gray-100, #f3f4f6)'};
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
    outline-offset: 2px;
  }
`;

const HamburgerIcon = styled.span<{ $isOpen: boolean }>`
  position: relative;
  width: 20px;
  height: 2px;
  background: ${({ $isOpen }) => ($isOpen ? 'transparent' : 'currentColor')};
  transition: all 0.2s ease;

  &::before,
  &::after {
    content: '';
    position: absolute;
    left: 0;
    width: 100%;
    height: 2px;
    background: currentColor;
    transition: all 0.2s ease;
  }

  &::before {
    top: ${({ $isOpen }) => ($isOpen ? '0' : '-6px')};
    transform: ${({ $isOpen }) => ($isOpen ? 'rotate(45deg)' : 'none')};
  }

  &::after {
    bottom: ${({ $isOpen }) => ($isOpen ? '0' : '-6px')};
    transform: ${({ $isOpen }) => ($isOpen ? 'rotate(-45deg)' : 'none')};
  }
`;

const MobileMenuOverlay = styled.div<{
  $isOpen: boolean;
  $mobileBreakpoint: number;
}>`
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: var(--z-index-overlay, 999);
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition: all 0.2s ease;

  @media (max-width: ${({ $mobileBreakpoint }) => $mobileBreakpoint}px) {
    display: block;
  }
`;

const MobileMenuPanel = styled.div<{
  $isOpen: boolean;
  $mobileBreakpoint: number;
  $navbarHeight: number;
}>`
  display: none;
  position: fixed;
  top: ${({ $navbarHeight }) => $navbarHeight}px;
  left: 0;
  right: 0;
  max-height: calc(100vh - ${({ $navbarHeight }) => $navbarHeight}px);
  background: var(--color-background, #ffffff);
  box-shadow: var(--shadow-lg, 0 10px 40px rgba(0, 0, 0, 0.1));
  z-index: var(--z-index-navbar, 1000);
  transform: ${({ $isOpen }) =>
    $isOpen ? 'translateY(0)' : 'translateY(-10px)'};
  opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
  visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
  transition: all 0.2s ease;
  overflow-y: auto;

  @media (max-width: ${({ $mobileBreakpoint }) => $mobileBreakpoint}px) {
    display: block;
  }
`;

const MobileMenuContent = styled.div`
  display: flex;
  flex-direction: column;
  padding: var(--spacing-md, 16px);
`;

const MobileNavLinks = styled.ul`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 8px);
  list-style: none;
  margin: 0;
  padding: 0;
`;

const MobileNavLink = styled.a<{ $isActive: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-md, 16px);
  font-size: 16px;
  font-weight: 500;
  text-decoration: none;
  color: var(--color-text, #1f2937);
  border-radius: var(--radius-md, 8px);
  transition: all 0.2s ease;

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

const MobileActionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
  margin-top: var(--spacing-md, 16px);
  padding-top: var(--spacing-md, 16px);
  border-top: 1px solid var(--color-border, #e5e7eb);
`;

export const Navbar = forwardRef<HTMLElement, NavbarProps>(
  (
    {
      logo,
      links = [],
      actions,
      variant = 'default',
      position = 'static',
      height = 64,
      mobileBreakpoint = 768,
      mobileMenuContent,
      onMobileMenuToggle,
      bordered = true,
      elevated = false,
      className,
      ...props
    },
    ref
  ) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navLinksRef = useRef<HTMLUListElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const toggleMobileMenu = useCallback(() => {
      const newState = !isMobileMenuOpen;
      setIsMobileMenuOpen(newState);
      onMobileMenuToggle?.(newState);
    }, [isMobileMenuOpen, onMobileMenuToggle]);

    const closeMobileMenu = useCallback(() => {
      setIsMobileMenuOpen(false);
      onMobileMenuToggle?.(false);
    }, [onMobileMenuToggle]);

    // Close mobile menu on escape key
    useEffect(() => {
      const handleEscape = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Escape' && isMobileMenuOpen) {
          closeMobileMenu();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isMobileMenuOpen, closeMobileMenu]);

    // Close mobile menu on window resize
    useEffect(() => {
      const handleResize = () => {
        if (window.innerWidth > mobileBreakpoint && isMobileMenuOpen) {
          closeMobileMenu();
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [mobileBreakpoint, isMobileMenuOpen, closeMobileMenu]);

    // Handle keyboard navigation for nav links
    const handleNavKeyDown = useCallback(
      (e: KeyboardEvent<HTMLUListElement>) => {
        const focusableLinks = navLinksRef.current?.querySelectorAll(
          'a:not([aria-disabled="true"])'
        );
        if (!focusableLinks || focusableLinks.length === 0) return;

        const currentIndex = Array.from(focusableLinks).findIndex(
          (el) => el === document.activeElement
        );

        let nextIndex: number;

        switch (e.key) {
          case 'ArrowRight':
            e.preventDefault();
            nextIndex =
              currentIndex < focusableLinks.length - 1 ? currentIndex + 1 : 0;
            (focusableLinks[nextIndex] as HTMLElement).focus();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            nextIndex =
              currentIndex > 0 ? currentIndex - 1 : focusableLinks.length - 1;
            (focusableLinks[nextIndex] as HTMLElement).focus();
            break;
          case 'Home':
            e.preventDefault();
            (focusableLinks[0] as HTMLElement).focus();
            break;
          case 'End':
            e.preventDefault();
            (focusableLinks[focusableLinks.length - 1] as HTMLElement).focus();
            break;
        }
      },
      []
    );

    // Handle keyboard navigation for mobile menu
    const handleMobileNavKeyDown = useCallback(
      (e: KeyboardEvent<HTMLUListElement>) => {
        const focusableLinks = mobileMenuRef.current?.querySelectorAll(
          'a:not([aria-disabled="true"])'
        );
        if (!focusableLinks || focusableLinks.length === 0) return;

        const currentIndex = Array.from(focusableLinks).findIndex(
          (el) => el === document.activeElement
        );

        let nextIndex: number;

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            nextIndex =
              currentIndex < focusableLinks.length - 1 ? currentIndex + 1 : 0;
            (focusableLinks[nextIndex] as HTMLElement).focus();
            break;
          case 'ArrowUp':
            e.preventDefault();
            nextIndex =
              currentIndex > 0 ? currentIndex - 1 : focusableLinks.length - 1;
            (focusableLinks[nextIndex] as HTMLElement).focus();
            break;
          case 'Home':
            e.preventDefault();
            (focusableLinks[0] as HTMLElement).focus();
            break;
          case 'End':
            e.preventDefault();
            (focusableLinks[focusableLinks.length - 1] as HTMLElement).focus();
            break;
        }
      },
      []
    );

    const handleLinkClick = useCallback(
      (link: NavLink) => {
        if (link.disabled) return;
        link.onClick?.();
        closeMobileMenu();
      },
      [closeMobileMenu]
    );

    return (
      <>
        <StyledNavbar
          ref={ref}
          $variant={variant}
          $position={position}
          $height={height}
          $bordered={bordered}
          $elevated={elevated}
          $mobileBreakpoint={mobileBreakpoint}
          className={className}
          role="navigation"
          aria-label="Main navigation"
          {...props}
        >
          {logo && <LogoContainer>{logo}</LogoContainer>}

          <NavLinksContainer
            ref={navLinksRef}
            $mobileBreakpoint={mobileBreakpoint}
            role="menubar"
            aria-label="Main menu"
            onKeyDown={handleNavKeyDown}
          >
            {links.map((link) => (
              <NavLinkItem key={link.id} role="none">
                <StyledNavLink
                  href={link.href}
                  onClick={(e) => {
                    if (!link.href) e.preventDefault();
                    handleLinkClick(link);
                  }}
                  $isActive={link.isActive || false}
                  $disabled={link.disabled || false}
                  $variant={variant}
                  role="menuitem"
                  aria-current={link.isActive ? 'page' : undefined}
                  aria-disabled={link.disabled}
                  tabIndex={link.disabled ? -1 : 0}
                >
                  {link.icon}
                  {link.label}
                </StyledNavLink>
              </NavLinkItem>
            ))}
          </NavLinksContainer>

          {actions && (
            <ActionsContainer $mobileBreakpoint={mobileBreakpoint}>
              {actions}
            </ActionsContainer>
          )}

          <MobileMenuButton
            type="button"
            $isOpen={isMobileMenuOpen}
            $mobileBreakpoint={mobileBreakpoint}
            $variant={variant}
            onClick={toggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <HamburgerIcon $isOpen={isMobileMenuOpen} />
          </MobileMenuButton>
        </StyledNavbar>

        <MobileMenuOverlay
          $isOpen={isMobileMenuOpen}
          $mobileBreakpoint={mobileBreakpoint}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />

        <MobileMenuPanel
          id="mobile-menu"
          ref={mobileMenuRef}
          $isOpen={isMobileMenuOpen}
          $mobileBreakpoint={mobileBreakpoint}
          $navbarHeight={height}
          role="menu"
          aria-label="Mobile navigation"
        >
          <MobileMenuContent>
            {mobileMenuContent || (
              <>
                <MobileNavLinks
                  role="menu"
                  aria-label="Mobile menu"
                  onKeyDown={handleMobileNavKeyDown}
                >
                  {links.map((link) => (
                    <li key={link.id} role="none">
                      <MobileNavLink
                        href={link.href}
                        onClick={(e) => {
                          if (!link.href) e.preventDefault();
                          handleLinkClick(link);
                        }}
                        $isActive={link.isActive || false}
                        $disabled={link.disabled || false}
                        role="menuitem"
                        aria-current={link.isActive ? 'page' : undefined}
                        aria-disabled={link.disabled}
                        tabIndex={link.disabled ? -1 : 0}
                      >
                        {link.icon}
                        {link.label}
                      </MobileNavLink>
                    </li>
                  ))}
                </MobileNavLinks>
                {actions && (
                  <MobileActionsContainer>{actions}</MobileActionsContainer>
                )}
              </>
            )}
          </MobileMenuContent>
        </MobileMenuPanel>
      </>
    );
  }
);

Navbar.displayName = 'Navbar';

export default Navbar;
