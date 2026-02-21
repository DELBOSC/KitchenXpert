/**
 * Standard kitchen dimensions (in millimeters)
 */

/** Base Cabinet Dimensions */
export const BASE_CABINET_DIMENSIONS = {
  // Heights
  STANDARD_HEIGHT: 870, // 34.25 inches
  TOE_KICK_HEIGHT: 100, // 4 inches
  CABINET_BOX_HEIGHT: 770, // 30.25 inches

  // Depths
  STANDARD_DEPTH: 610, // 24 inches
  SHALLOW_DEPTH: 305, // 12 inches

  // Widths (common sizes)
  WIDTH_300: 300, // 12 inches
  WIDTH_380: 380, // 15 inches
  WIDTH_450: 450, // 18 inches
  WIDTH_530: 530, // 21 inches
  WIDTH_610: 610, // 24 inches
  WIDTH_760: 760, // 30 inches
  WIDTH_910: 910, // 36 inches
} as const;

/** Wall Cabinet Dimensions */
export const WALL_CABINET_DIMENSIONS = {
  // Heights
  HEIGHT_305: 305, // 12 inches
  HEIGHT_380: 380, // 15 inches
  HEIGHT_460: 460, // 18 inches
  HEIGHT_610: 610, // 24 inches
  HEIGHT_760: 760, // 30 inches
  HEIGHT_910: 910, // 36 inches
  HEIGHT_1070: 1070, // 42 inches

  // Depth
  STANDARD_DEPTH: 305, // 12 inches
  DEEP_DEPTH: 380, // 15 inches

  // Widths (same as base cabinets)
  WIDTH_230: 230, // 9 inches
  WIDTH_305: 305, // 12 inches
  WIDTH_380: 380, // 15 inches
  WIDTH_460: 460, // 18 inches
  WIDTH_610: 610, // 24 inches
  WIDTH_760: 760, // 30 inches
  WIDTH_910: 910, // 36 inches
} as const;

/** Tall Cabinet Dimensions */
export const TALL_CABINET_DIMENSIONS = {
  // Heights
  HEIGHT_2130: 2130, // 84 inches
  HEIGHT_2290: 2290, // 90 inches
  HEIGHT_2440: 2440, // 96 inches

  // Depths
  STANDARD_DEPTH: 610, // 24 inches
  SHALLOW_DEPTH: 305, // 12 inches

  // Widths
  WIDTH_380: 380, // 15 inches
  WIDTH_460: 460, // 18 inches
  WIDTH_610: 610, // 24 inches
  WIDTH_910: 910, // 36 inches
} as const;

/** Countertop Dimensions */
export const COUNTERTOP_DIMENSIONS = {
  STANDARD_DEPTH: 635, // 25 inches (includes overhang)
  STANDARD_THICKNESS: 30, // 1.25 inches
  THICK_SLAB: 50, // 2 inches
  OVERHANG_FRONT: 25, // 1 inch
  OVERHANG_SIDE: 12, // 0.5 inches
  BACKSPLASH_HEIGHT: 100, // 4 inches (standard)
  FULL_BACKSPLASH_HEIGHT: 460, // 18 inches
} as const;

/** Island Dimensions */
export const ISLAND_DIMENSIONS = {
  MIN_WIDTH: 610, // 24 inches
  RECOMMENDED_WIDTH: 910, // 36 inches
  MIN_LENGTH: 1220, // 48 inches
  CLEARANCE_AROUND: 1070, // 42 inches minimum
  SEATING_OVERHANG: 305, // 12 inches for bar seating
} as const;

/** Standard Appliance Dimensions */
export const APPLIANCE_DIMENSIONS = {
  // Refrigerator
  REFRIGERATOR: {
    STANDARD_WIDTH: 910, // 36 inches
    COUNTER_DEPTH_WIDTH: 760, // 30 inches
    HEIGHT: 1780, // 70 inches
    DEPTH: 760, // 30 inches
  },

  // Range/Oven
  RANGE: {
    WIDTH_610: 610, // 24 inches
    WIDTH_760: 760, // 30 inches
    WIDTH_910: 910, // 36 inches
    WIDTH_1220: 1220, // 48 inches (professional)
    HEIGHT: 910, // 36 inches
    DEPTH: 660, // 26 inches
  },

  // Dishwasher
  DISHWASHER: {
    WIDTH: 610, // 24 inches
    HEIGHT: 860, // 34 inches
    DEPTH: 610, // 24 inches
  },

  // Microwave
  MICROWAVE: {
    WIDTH: 760, // 30 inches
    HEIGHT: 430, // 17 inches
    DEPTH: 380, // 15 inches
  },

  // Range Hood
  RANGE_HOOD: {
    WIDTH_760: 760, // 30 inches
    WIDTH_910: 910, // 36 inches
    HEIGHT: 150, // 6 inches
    HEIGHT_ABOVE_RANGE: 610, // 24 inches minimum
  },

  // Sink
  SINK: {
    SINGLE_WIDTH: 610, // 24 inches
    DOUBLE_WIDTH: 840, // 33 inches
    DEPTH: 530, // 21 inches
    BOWL_DEPTH: 230, // 9 inches
  },
} as const;

/** Clearance and Spacing */
export const CLEARANCES = {
  // Walkway clearances
  MINIMUM_WALKWAY: 910, // 36 inches
  RECOMMENDED_WALKWAY: 1070, // 42 inches
  TWO_COOK_WALKWAY: 1220, // 48 inches

  // Work triangle
  WORK_TRIANGLE_MIN_LEG: 1220, // 4 feet
  WORK_TRIANGLE_MAX_LEG: 2740, // 9 feet
  WORK_TRIANGLE_MAX_TOTAL: 7920, // 26 feet

  // Counter clearance
  COUNTER_TO_WALL_CABINET: 460, // 18 inches
  COUNTER_TO_RANGE_HOOD: 610, // 24 inches minimum

  // Door clearances
  DOOR_SWING_CLEARANCE: 460, // 18 inches
  DRAWER_CLEARANCE: 760, // 30 inches
} as const;

/** Standard Heights from Floor */
export const INSTALLATION_HEIGHTS = {
  BASE_CABINET_TOP: 910, // 36 inches
  COUNTERTOP_SURFACE: 940, // 37 inches (with countertop)
  WALL_CABINET_BOTTOM: 1370, // 54 inches
  WALL_CABINET_TOP_84: 2130, // 84 inches
  WALL_CABINET_TOP_96: 2440, // 96 inches
  RANGE_HOOD_BOTTOM: 1520, // 60 inches
  ELECTRICAL_OUTLET: 1070, // 42 inches (above counter)
} as const;
