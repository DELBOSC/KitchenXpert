/**
 * LinkedIn Icon
 * LinkedIn social media icon
 */

export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
}

export const linkedinIconPath = 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z M2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z';

export function createLinkedInIcon(props: IconProps = {}): string {
  const { size = 24, color = 'currentColor' } = props;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/>
    <rect x="2" y="9" width="4" height="12"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>`;
}

export const LinkedInIconData = {
  viewBox: '0 0 24 24',
  paths: [
    { type: 'path', d: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z' },
    { type: 'rect', x: 2, y: 9, width: 4, height: 12 },
    { type: 'circle', cx: 4, cy: 4, r: 2 },
  ],
} as const;
