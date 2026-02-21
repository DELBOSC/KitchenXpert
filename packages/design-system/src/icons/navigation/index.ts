/**
 * Navigation Icons
 * Icons for navigation and UI controls
 */

export { createHomeIcon, homeIconPath, HomeIconData } from './home-icon';
export { createMenuIcon, menuIconPath, MenuIconData } from './menu-icon';
export { createSearchIcon, searchIconPath, SearchIconData } from './search-icon';
export { createSettingsIcon, settingsIconPath, SettingsIconData } from './settings-icon';
export type { IconProps } from './home-icon';

export const navigationIcons = {
  home: () => import('./home-icon'),
  menu: () => import('./menu-icon'),
  search: () => import('./search-icon'),
  settings: () => import('./settings-icon'),
} as const;

export type NavigationIconName = keyof typeof navigationIcons;
