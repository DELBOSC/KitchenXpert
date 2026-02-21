/**
 * Oven Icon
 * Icone de four/cuisiniere avec bruleurs
 */

export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export const ovenIconPath = 'M3 3h18v18H3V3zm0 6h18M6 6h.01M10 6h.01M14 6h.01M18 6h.01M6 13h12v5H6v-5z';

export function createOvenIcon(props: IconProps = {}): string {
  const {
    size = 24,
    color = 'currentColor',
    strokeWidth = 2
  } = props;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="1"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <circle cx="6" cy="6" r="1" fill="${color}"/>
    <circle cx="10" cy="6" r="1" fill="${color}"/>
    <circle cx="14" cy="6" r="1" fill="${color}"/>
    <circle cx="18" cy="6" r="1" fill="${color}"/>
    <rect x="6" y="12" width="12" height="6" rx="0.5"/>
    <line x1="6" y1="15" x2="18" y2="15"/>
  </svg>`;
}

// React-compatible data
export const OvenIconData = {
  viewBox: '0 0 24 24',
  paths: [
    { type: 'rect', x: 3, y: 3, width: 18, height: 18, rx: 1 },
    { type: 'line', x1: 3, y1: 9, x2: 21, y2: 9 },
    { type: 'circle', cx: 6, cy: 6, r: 1, fill: true },
    { type: 'circle', cx: 10, cy: 6, r: 1, fill: true },
    { type: 'circle', cx: 14, cy: 6, r: 1, fill: true },
    { type: 'circle', cx: 18, cy: 6, r: 1, fill: true },
    { type: 'rect', x: 6, y: 12, width: 12, height: 6, rx: 0.5 },
    { type: 'line', x1: 6, y1: 15, x2: 18, y2: 15 },
  ],
} as const;
