/**
 * Kitchen Icons
 * Icons specific to kitchen design and appliances
 */

export { createCabinetIcon, cabinetIconPath, CabinetIconData } from './cabinet-icon';
export type { IconProps } from './cabinet-icon';

export { createOvenIcon, ovenIconPath, OvenIconData } from './oven-icon';

export { createFridgeIcon, fridgeIconPath, FridgeIconData } from './fridge-icon';

export { createSinkIcon, sinkIconPath, SinkIconData } from './sink-icon';

// Kitchen icon collection
export const kitchenIcons = {
  cabinet: () => import('./cabinet-icon'),
  oven: () => import('./oven-icon'),
  fridge: () => import('./fridge-icon'),
  sink: () => import('./sink-icon'),
} as const;

export type KitchenIconName = keyof typeof kitchenIcons;
