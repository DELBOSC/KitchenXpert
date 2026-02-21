/**
 * Sink Icon
 * Icone d'évier de cuisine avec robinet
 */

export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export const sinkIconPath = 'M3 12h18v4a4 4 0 01-4 4H7a4 4 0 01-4-4v-4zM10 4h4v3h-4zM14 5h3a1 1 0 011 1v2a1 1 0 01-1 1h-1v2M12 15a1 1 0 100 2 1 1 0 000-2z';

export function createSinkIcon(props: IconProps = {}): string {
  const {
    size = 24,
    color = 'currentColor',
    strokeWidth = 2
  } = props;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 12h18v4a4 4 0 01-4 4H7a4 4 0 01-4-4v-4z"/>
    <rect x="10" y="4" width="4" height="3" rx="0.5"/>
    <path d="M14 5h3a1 1 0 011 1v2a1 1 0 01-1 1h-1v2"/>
    <circle cx="12" cy="16" r="1"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
  </svg>`;
}

// React-compatible data
export const SinkIconData = {
  viewBox: '0 0 24 24',
  paths: [
    { type: 'path', d: 'M3 12h18v4a4 4 0 01-4 4H7a4 4 0 01-4-4v-4z' },
    { type: 'rect', x: 10, y: 4, width: 4, height: 3, rx: 0.5 },
    { type: 'path', d: 'M14 5h3a1 1 0 011 1v2a1 1 0 01-1 1h-1v2' },
    { type: 'circle', cx: 12, cy: 16, r: 1 },
    { type: 'line', x1: 2, y1: 12, x2: 22, y2: 12 },
  ],
} as const;
