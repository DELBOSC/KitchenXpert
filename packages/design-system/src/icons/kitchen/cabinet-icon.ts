/**
 * Cabinet Icon
 * Icone d'armoire de cuisine
 */

export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export const cabinetIconPath = 'M3 4h18v16H3V4zm0 8h18M7 4v16m10-16v16M3 12h4m10 0h4';

export function createCabinetIcon(props: IconProps = {}): string {
  const { size = 24, color = 'currentColor', strokeWidth = 2 } = props;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="1"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="12" y1="4" x2="12" y2="20"/>
    <circle cx="9" cy="8" r="0.5" fill="${color}"/>
    <circle cx="15" cy="8" r="0.5" fill="${color}"/>
    <circle cx="9" cy="16" r="0.5" fill="${color}"/>
    <circle cx="15" cy="16" r="0.5" fill="${color}"/>
  </svg>`;
}

// React-compatible data
export const CabinetIconData = {
  viewBox: '0 0 24 24',
  paths: [
    { type: 'rect', x: 3, y: 4, width: 18, height: 16, rx: 1 },
    { type: 'line', x1: 3, y1: 12, x2: 21, y2: 12 },
    { type: 'line', x1: 12, y1: 4, x2: 12, y2: 20 },
    { type: 'circle', cx: 9, cy: 8, r: 0.5, fill: true },
    { type: 'circle', cx: 15, cy: 8, r: 0.5, fill: true },
    { type: 'circle', cx: 9, cy: 16, r: 0.5, fill: true },
    { type: 'circle', cx: 15, cy: 16, r: 0.5, fill: true },
  ],
} as const;
