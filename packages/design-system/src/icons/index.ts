/**
 * Design System Icons
 * SVG icon library for KitchenXpert
 */

// Icon types (central definition)
export type { IconProps, IconData, IconPath, SvgElement, ComplexIconData } from './types';
export { defaultIconProps, createSvgString } from './types';

// Kitchen icons
export {
  createCabinetIcon,
  cabinetIconPath,
  CabinetIconData,
  createOvenIcon,
  ovenIconPath,
  OvenIconData,
  createFridgeIcon,
  fridgeIconPath,
  FridgeIconData,
  createSinkIcon,
  sinkIconPath,
  SinkIconData,
  kitchenIcons,
} from './kitchen';
export type { KitchenIconName } from './kitchen';

// Navigation icons
export {
  createHomeIcon,
  homeIconPath,
  HomeIconData,
  createMenuIcon,
  menuIconPath,
  MenuIconData,
  createSearchIcon,
  searchIconPath,
  SearchIconData,
  createSettingsIcon,
  settingsIconPath,
  SettingsIconData,
  navigationIcons,
} from './navigation';
export type { NavigationIconName } from './navigation';

// Action icons
export {
  createAddIcon,
  addIconPath,
  AddIconData,
  createDeleteIcon,
  deleteIconPath,
  DeleteIconData,
  createEditIcon,
  editIconPath,
  EditIconData,
  createSaveIcon,
  saveIconPath,
  SaveIconData,
  actionIcons,
} from './actions';
export type { ActionIconName } from './actions';

// Social icons
export {
  createFacebookIcon,
  facebookIconPath,
  FacebookIconData,
  createInstagramIcon,
  instagramIconPath,
  InstagramIconData,
  createLinkedInIcon,
  linkedinIconPath,
  LinkedInIconData,
  createTwitterIcon,
  twitterIconPath,
  TwitterIconData,
  socialIcons,
} from './social';
export type { SocialIconName } from './social';

// Combined icon registry
export const iconRegistry = {
  kitchen: {
    cabinet: () => import('./kitchen/cabinet-icon'),
    oven: () => import('./kitchen/oven-icon'),
    fridge: () => import('./kitchen/fridge-icon'),
    sink: () => import('./kitchen/sink-icon'),
  },
  navigation: {
    home: () => import('./navigation/home-icon'),
    menu: () => import('./navigation/menu-icon'),
    search: () => import('./navigation/search-icon'),
    settings: () => import('./navigation/settings-icon'),
  },
  actions: {
    add: () => import('./actions/add-icon'),
    delete: () => import('./actions/delete-icon'),
    edit: () => import('./actions/edit-icon'),
    save: () => import('./actions/save-icon'),
  },
  social: {
    facebook: () => import('./social/facebook-icon'),
    instagram: () => import('./social/instagram-icon'),
    linkedin: () => import('./social/linkedin-icon'),
    twitter: () => import('./social/twitter-icon'),
  },
} as const;

export type IconCategory = keyof typeof iconRegistry;
export type IconName<C extends IconCategory> = keyof typeof iconRegistry[C];
