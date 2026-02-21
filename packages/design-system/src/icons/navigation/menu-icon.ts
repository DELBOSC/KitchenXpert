/**
 * Menu Icon
 * Hamburger menu icon
 */

export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export const menuIconPath = 'M3 12h18M3 6h18M3 18h18';

export function createMenuIcon(props: IconProps = {}): string {
  const { size = 24, color = 'currentColor', strokeWidth = 2 } = props;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>`;
}

export const MenuIconData = {
  viewBox: '0 0 24 24',
  paths: [
    { type: 'line', x1: 3, y1: 12, x2: 21, y2: 12 },
    { type: 'line', x1: 3, y1: 6, x2: 21, y2: 6 },
    { type: 'line', x1: 3, y1: 18, x2: 21, y2: 18 },
  ],
} as const;
