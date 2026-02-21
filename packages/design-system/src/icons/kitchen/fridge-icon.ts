/**
 * Fridge Icon
 * Icone de refrigerateur
 */

export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export const fridgeIconPath = 'M4 2h16v20H4V2zm0 8h16M8 5v3M8 13v6';

export function createFridgeIcon(props: IconProps = {}): string {
  const {
    size = 24,
    color = 'currentColor',
    strokeWidth = 2
  } = props;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="1"/>
    <line x1="4" y1="10" x2="20" y2="10"/>
    <line x1="8" y1="5" x2="8" y2="8"/>
    <line x1="8" y1="13" x2="8" y2="18"/>
  </svg>`;
}

// React-compatible data
export const FridgeIconData = {
  viewBox: '0 0 24 24',
  paths: [
    { type: 'rect', x: 4, y: 2, width: 16, height: 20, rx: 1 },
    { type: 'line', x1: 4, y1: 10, x2: 20, y2: 10 },
    { type: 'line', x1: 8, y1: 5, x2: 8, y2: 8 },
    { type: 'line', x1: 8, y1: 13, x2: 8, y2: 18 },
  ],
} as const;
