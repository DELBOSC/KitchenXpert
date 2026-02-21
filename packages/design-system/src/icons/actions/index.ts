/**
 * Action Icons
 * Icons for common actions (CRUD operations)
 */

export { createAddIcon, addIconPath, AddIconData } from './add-icon';
export { createDeleteIcon, deleteIconPath, DeleteIconData } from './delete-icon';
export { createEditIcon, editIconPath, EditIconData } from './edit-icon';
export { createSaveIcon, saveIconPath, SaveIconData } from './save-icon';
export type { IconProps } from './add-icon';

export const actionIcons = {
  add: () => import('./add-icon'),
  delete: () => import('./delete-icon'),
  edit: () => import('./edit-icon'),
  save: () => import('./save-icon'),
} as const;

export type ActionIconName = keyof typeof actionIcons;
