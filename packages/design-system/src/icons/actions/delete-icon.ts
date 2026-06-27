/**
 * Delete Icon
 * Trash/delete icon
 */

export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export const deleteIconPath =
  'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2';

export function createDeleteIcon(props: IconProps = {}): string {
  const { size = 24, color = 'currentColor', strokeWidth = 2 } = props;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>`;
}

export const DeleteIconData = {
  viewBox: '0 0 24 24',
  paths: [
    { type: 'polyline', points: '3 6 5 6 21 6' },
    { type: 'path', d: 'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2' },
    { type: 'line', x1: 10, y1: 11, x2: 10, y2: 17 },
    { type: 'line', x1: 14, y1: 11, x2: 14, y2: 17 },
  ],
} as const;
