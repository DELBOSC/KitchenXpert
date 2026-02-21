/**
 * Save Icon
 * Floppy disk/save icon
 */

export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  strokeWidth?: number;
}

export const saveIconPath = 'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z M17 21v-8H7v8 M7 3v5h8';

export function createSaveIcon(props: IconProps = {}): string {
  const { size = 24, color = 'currentColor', strokeWidth = 2 } = props;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>`;
}

export const SaveIconData = {
  viewBox: '0 0 24 24',
  paths: [
    { type: 'path', d: 'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z' },
    { type: 'polyline', points: '17 21 17 13 7 13 7 21' },
    { type: 'polyline', points: '7 3 7 8 15 8' },
  ],
} as const;
