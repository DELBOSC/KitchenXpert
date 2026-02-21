/**
 * Add Icon
 * Plus/add icon
 */

export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export const addIconPath = 'M12 5v14M5 12h14';

export function createAddIcon(props: IconProps = {}): string {
  const { size = 24, color = 'currentColor', strokeWidth = 2 } = props;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`;
}

export const AddIconData = {
  viewBox: '0 0 24 24',
  paths: [
    { type: 'line', x1: 12, y1: 5, x2: 12, y2: 19 },
    { type: 'line', x1: 5, y1: 12, x2: 19, y2: 12 },
  ],
} as const;
