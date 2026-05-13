import React from 'react';
import { Link, NavLink, type LinkProps, type NavLinkProps } from 'react-router-dom';

import { useLanguage } from './LanguageProvider';

/**
 * Drop-in replacements for react-router's <Link> / <NavLink> that
 * prefix the active locale into the `to` path. Use these everywhere
 * to avoid `to="/login"` accidentally landing on the FR variant when
 * the user is browsing in EN.
 *
 *   <LocalizedLink to="/pricing"> // → /fr/pricing or /en/pricing
 *
 * External URLs (starting with `http`, `mailto:`, `tel:`, or `#`) are
 * passed through unchanged.
 */

function shouldSkipPrefix(to: string): boolean {
  return /^(https?:|mailto:|tel:|#|\/\/)/.test(to);
}

function applyPrefix(to: string, withPrefix: (path: string) => string): string {
  if (shouldSkipPrefix(to)) {return to;}
  return withPrefix(to);
}

export function LocalizedLink({
  to, ...rest
}: Omit<LinkProps, 'to'> & { to: string }): React.ReactElement {
  const { withPrefix } = useLanguage();
  return <Link to={applyPrefix(to, withPrefix)} {...rest} />;
}

export function LocalizedNavLink({
  to, ...rest
}: Omit<NavLinkProps, 'to'> & { to: string }): React.ReactElement {
  const { withPrefix } = useLanguage();
  return <NavLink to={applyPrefix(to, withPrefix)} {...rest} />;
}

export default LocalizedLink;
