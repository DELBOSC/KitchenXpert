/**
 * Social Icons
 * Social media brand icons
 */

export { createFacebookIcon, facebookIconPath, FacebookIconData } from './facebook-icon';
export { createInstagramIcon, instagramIconPath, InstagramIconData } from './instagram-icon';
export { createLinkedInIcon, linkedinIconPath, LinkedInIconData } from './linkedin-icon';
export { createTwitterIcon, twitterIconPath, TwitterIconData } from './twitter-icon';
export type { IconProps } from './facebook-icon';

export const socialIcons = {
  facebook: () => import('./facebook-icon'),
  instagram: () => import('./instagram-icon'),
  linkedin: () => import('./linkedin-icon'),
  twitter: () => import('./twitter-icon'),
} as const;

export type SocialIconName = keyof typeof socialIcons;
