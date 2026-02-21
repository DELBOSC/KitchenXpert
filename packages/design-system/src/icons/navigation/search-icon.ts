/**
 * Search Icon
 * Magnifying glass search icon
 */

export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export const searchIconPath = 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z';

export function createSearchIcon(props: IconProps = {}): string {
  const { size = 24, color = 'currentColor', strokeWidth = 2 } = props;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>`;
}

export const SearchIconData = {
  viewBox: '0 0 24 24',
  paths: [
    { type: 'circle', cx: 11, cy: 11, r: 8 },
    { type: 'line', x1: 21, y1: 21, x2: 16.65, y2: 16.65 },
  ],
} as const;
