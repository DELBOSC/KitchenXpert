/**
 * Instagram Icon
 * Instagram social media icon
 */

export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
}

export const instagramIconPath = 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z M17.5 6.5h.01';

export function createInstagramIcon(props: IconProps = {}): string {
  const { size = 24, color = 'currentColor' } = props;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>`;
}

export const InstagramIconData = {
  viewBox: '0 0 24 24',
  paths: [
    { type: 'rect', x: 2, y: 2, width: 20, height: 20, rx: 5 },
    { type: 'path', d: 'M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z' },
    { type: 'line', x1: 17.5, y1: 6.5, x2: 17.51, y2: 6.5 },
  ],
} as const;
