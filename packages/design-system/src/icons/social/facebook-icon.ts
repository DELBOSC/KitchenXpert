/**
 * Facebook Icon
 * Facebook social media icon
 */

export interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
}

export const facebookIconPath = 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z';

export function createFacebookIcon(props: IconProps = {}): string {
  const { size = 24, color = 'currentColor' } = props;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
  </svg>`;
}

export const FacebookIconData = {
  viewBox: '0 0 24 24',
  paths: [
    { type: 'path', d: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z' },
  ],
} as const;
