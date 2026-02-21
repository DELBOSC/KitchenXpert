/**
 * Home Icon
 * Navigation home icon
 */

export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export const homeIconPath = 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M9 22V12h6v10';

export function createHomeIcon(props: IconProps = {}): string {
  const { size = 24, color = 'currentColor', strokeWidth = 2 } = props;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>`;
}

export const HomeIconData = {
  viewBox: '0 0 24 24',
  paths: [
    { type: 'path', d: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' },
    { type: 'polyline', points: '9 22 9 12 15 12 15 22' },
  ],
} as const;
