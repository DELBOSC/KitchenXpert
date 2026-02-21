/**
 * Color constants for kitchen finishes and themes
 */

/** Cabinet Finish Colors */
export const CABINET_COLORS = {
  // Whites
  PURE_WHITE: '#FFFFFF',
  ANTIQUE_WHITE: '#FAEBD7',
  IVORY: '#FFFFF0',
  CREAM: '#FFFDD0',
  LINEN: '#FAF0E6',

  // Grays
  DOVE_GRAY: '#6D6968',
  SLATE_GRAY: '#708090',
  CHARCOAL: '#36454F',
  GRAPHITE: '#383838',
  PEWTER: '#8E8E8E',

  // Blues
  NAVY_BLUE: '#000080',
  COASTAL_BLUE: '#5B9BD5',
  SLATE_BLUE: '#6A5ACD',
  SAGE_BLUE: '#B2BEB5',

  // Greens
  SAGE_GREEN: '#9CAF88',
  FOREST_GREEN: '#228B22',
  OLIVE: '#808000',
  HUNTER_GREEN: '#355E3B',

  // Wood Tones
  NATURAL_OAK: '#D4A76A',
  WALNUT: '#5D432C',
  CHERRY: '#DE3163',
  ESPRESSO: '#3C2415',
  MAHOGANY: '#C04000',
  MAPLE: '#FFE5B4',
  HICKORY: '#B5651D',

  // Blacks
  MATTE_BLACK: '#28282B',
  JET_BLACK: '#0A0A0A',
} as const;

/** Countertop Colors */
export const COUNTERTOP_COLORS = {
  // Granite
  BLACK_GALAXY: '#0D0D0D',
  ABSOLUTE_BLACK: '#000000',
  GIALLO_ORNAMENTAL: '#E8DCC4',
  SANTA_CECILIA: '#D4B896',
  UBA_TUBA: '#3D4739',

  // Marble
  CARRARA_WHITE: '#F5F5F5',
  CALACATTA_GOLD: '#F8F4E3',
  EMPERADOR_DARK: '#5C4033',

  // Quartz
  ARCTIC_WHITE: '#FAFAFA',
  CALACATTA_NUVO: '#F0EDE5',
  COASTAL_GREY: '#B0B0B0',
  STATUARIO_MAXIMUS: '#F5F0E8',

  // Solid Surface
  GLACIER_WHITE: '#F8F8FF',
  CAMEO_WHITE: '#EFEBE9',
  BONE: '#E3DAC9',
} as const;

/** Hardware Colors */
export const HARDWARE_COLORS = {
  BRUSHED_NICKEL: '#C0C0C0',
  POLISHED_CHROME: '#E8E8E8',
  MATTE_BLACK: '#28282B',
  BRUSHED_GOLD: '#CFB53B',
  ANTIQUE_BRASS: '#CD9575',
  OIL_RUBBED_BRONZE: '#3E2723',
  STAINLESS_STEEL: '#E0E0E0',
  COPPER: '#B87333',
  PEWTER: '#8E8E8E',
} as const;

/** UI Theme Colors */
export const THEME_COLORS = {
  PRIMARY: '#2563EB',
  PRIMARY_DARK: '#1D4ED8',
  PRIMARY_LIGHT: '#60A5FA',

  SECONDARY: '#64748B',
  SECONDARY_DARK: '#475569',
  SECONDARY_LIGHT: '#94A3B8',

  SUCCESS: '#22C55E',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6',

  BACKGROUND: '#F8FAFC',
  SURFACE: '#FFFFFF',
  BORDER: '#E2E8F0',

  TEXT_PRIMARY: '#1E293B',
  TEXT_SECONDARY: '#64748B',
  TEXT_DISABLED: '#94A3B8',
} as const;

/** Color Palette for 3D Rendering */
export const RENDER_COLORS = {
  AMBIENT_LIGHT: '#FFFFFF',
  DIRECTIONAL_LIGHT: '#FFF8E7',
  SHADOW: '#000000',
  FLOOR: '#E0DDD9',
  WALL: '#F5F5F5',
  CEILING: '#FFFFFF',
} as const;

/** Color format type */
export type HexColor = `#${string}`;

/** Color categories enum */
export enum ColorCategory {
  CABINET = 'cabinet',
  COUNTERTOP = 'countertop',
  HARDWARE = 'hardware',
  WALL = 'wall',
  FLOOR = 'floor',
  ACCENT = 'accent',
}
