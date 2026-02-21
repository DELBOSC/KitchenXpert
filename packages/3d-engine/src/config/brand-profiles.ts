/**
 * Brand-specific kitchen dimension profiles (all values in mm)
 * Each brand has specific plinth heights, cabinet box heights, worktop specs, etc.
 */

// --- Helpers ---

/** Convert millimeters to meters (Three.js internal unit) */
export function mmToM(mm: number): number {
  return mm / 1000;
}

/** Convert meters to millimeters */
export function mToMm(m: number): number {
  return Math.round(m * 1000);
}

// --- Types ---

export type BrandId =
  | 'ikea_metod'
  | 'schmidt'
  | 'nobilia'
  | 'mobalpa'
  | 'cuisinella'
  | 'lapeyre'
  | 'hacker'
  | 'leicht'
  | 'siematic'
  | 'arthur_bonnet'
  | 'hygena'
  | 'custom';

export interface BrandProfile {
  id: BrandId;
  name: string;
  country: string;

  base: {
    /** Available plinth (toe kick) heights in mm */
    plinthHeights: number[];
    /** Default plinth height in mm */
    defaultPlinthHeight: number;
    /** Cabinet box height (without plinth, without worktop) in mm */
    cabinetBoxHeight: number;
    /** Total height floor to top of cabinet (plinth + box) in mm */
    totalHeight: number;
    /** Standard depths in mm */
    standardDepths: number[];
    /** Default depth in mm */
    defaultDepth: number;
    /** Available widths in mm */
    availableWidths: number[];
  };

  wall: {
    /** Available heights for wall cabinets in mm */
    availableHeights: number[];
    /** Default wall cabinet height in mm */
    defaultHeight: number;
    /** Standard depths in mm */
    standardDepths: number[];
    /** Default depth in mm */
    defaultDepth: number;
    /** Bottom Y position of wall cabinets (distance from floor) in mm */
    bottomY: number;
  };

  tall: {
    /** Available heights for tall/pantry cabinets in mm */
    availableHeights: number[];
    /** Default tall cabinet height in mm */
    defaultHeight: number;
    /** Standard depths in mm */
    standardDepths: number[];
    /** Default depth in mm */
    defaultDepth: number;
  };

  worktop: {
    /** Available thicknesses in mm */
    availableThicknesses: number[];
    /** Default thickness in mm */
    defaultThickness: number;
    /** Front overhang in mm */
    overhangFront: number;
    /** Back overhang in mm */
    overhangBack: number;
    /** Side overhang in mm */
    overhangSide: number;
    /** Computed: surface Y = base.totalHeight + defaultThickness (mm) */
    surfaceY: number;
  };

  plinth: {
    /** Inset from cabinet front face in mm */
    inset: number;
  };

  backsplash: {
    /** Backsplash thickness in mm */
    thickness: number;
  };

  hood: {
    /** Minimum height between cooktop surface and hood bottom in mm */
    heightAboveCooktop: number;
    /** Computed: hood bottom Y from floor = worktop.surfaceY + heightAboveCooktop (mm) */
    aboveFloorY: number;
  };
}

// --- Standard widths shared across all brands ---

const STANDARD_WIDTHS = [150, 200, 300, 400, 450, 500, 600, 800, 900, 1000, 1200];

// --- Worktop thicknesses shared across all brands ---

const WORKTOP_THICKNESSES = [12, 20, 28, 38, 40, 50, 80];

// --- Helper to build a profile with computed fields ---

function buildProfile(
  partial: Omit<BrandProfile, 'worktop' | 'hood'> & {
    worktop: Omit<BrandProfile['worktop'], 'surfaceY'>;
    hood: Omit<BrandProfile['hood'], 'aboveFloorY'>;
  }
): BrandProfile {
  const surfaceY = partial.base.totalHeight + partial.worktop.defaultThickness;
  const aboveFloorY = surfaceY + partial.hood.heightAboveCooktop;
  return {
    ...partial,
    worktop: { ...partial.worktop, surfaceY },
    hood: { ...partial.hood, aboveFloorY },
  };
}

// --- 12 Brand Profiles ---

const IKEA_METOD: BrandProfile = buildProfile({
  id: 'ikea_metod',
  name: 'IKEA METOD',
  country: 'SE',
  base: {
    plinthHeights: [80, 100, 120],
    defaultPlinthHeight: 100,
    cabinetBoxHeight: 800,
    totalHeight: 900,
    standardDepths: [600],
    defaultDepth: 600,
    availableWidths: STANDARD_WIDTHS,
  },
  wall: {
    availableHeights: [400, 600, 800, 1000],
    defaultHeight: 600,
    standardDepths: [370, 400],
    defaultDepth: 370,
    bottomY: 1400,
  },
  tall: {
    availableHeights: [1400, 1600, 2000, 2200],
    defaultHeight: 2200,
    standardDepths: [600],
    defaultDepth: 600,
  },
  worktop: {
    availableThicknesses: WORKTOP_THICKNESSES,
    defaultThickness: 38,
    overhangFront: 30,
    overhangBack: 0,
    overhangSide: 25,
  },
  plinth: { inset: 30 },
  backsplash: { thickness: 10 },
  hood: { heightAboveCooktop: 650 },
});

const SCHMIDT: BrandProfile = buildProfile({
  id: 'schmidt',
  name: 'Schmidt',
  country: 'FR',
  base: {
    plinthHeights: [100, 150, 170],
    defaultPlinthHeight: 150,
    cabinetBoxHeight: 720,
    totalHeight: 870,
    standardDepths: [560, 580],
    defaultDepth: 560,
    availableWidths: STANDARD_WIDTHS,
  },
  wall: {
    availableHeights: [400, 500, 600, 720, 900],
    defaultHeight: 600,
    standardDepths: [350, 370],
    defaultDepth: 350,
    bottomY: 1400,
  },
  tall: {
    availableHeights: [1400, 1600, 2000, 2200],
    defaultHeight: 2200,
    standardDepths: [560, 600],
    defaultDepth: 560,
  },
  worktop: {
    availableThicknesses: WORKTOP_THICKNESSES,
    defaultThickness: 38,
    overhangFront: 30,
    overhangBack: 0,
    overhangSide: 25,
  },
  plinth: { inset: 30 },
  backsplash: { thickness: 10 },
  hood: { heightAboveCooktop: 650 },
});

const NOBILIA: BrandProfile = buildProfile({
  id: 'nobilia',
  name: 'Nobilia',
  country: 'DE',
  base: {
    plinthHeights: [100, 150, 170],
    defaultPlinthHeight: 150,
    cabinetBoxHeight: 720,
    totalHeight: 870,
    standardDepths: [560, 580],
    defaultDepth: 560,
    availableWidths: STANDARD_WIDTHS,
  },
  wall: {
    availableHeights: [360, 480, 600, 720, 900],
    defaultHeight: 600,
    standardDepths: [350, 370],
    defaultDepth: 350,
    bottomY: 1370,
  },
  tall: {
    availableHeights: [1400, 1600, 2000, 2200],
    defaultHeight: 2200,
    standardDepths: [560, 600],
    defaultDepth: 560,
  },
  worktop: {
    availableThicknesses: WORKTOP_THICKNESSES,
    defaultThickness: 38,
    overhangFront: 30,
    overhangBack: 0,
    overhangSide: 25,
  },
  plinth: { inset: 30 },
  backsplash: { thickness: 10 },
  hood: { heightAboveCooktop: 650 },
});

const MOBALPA: BrandProfile = buildProfile({
  id: 'mobalpa',
  name: 'Mobalpa',
  country: 'FR',
  base: {
    plinthHeights: [100, 150, 170],
    defaultPlinthHeight: 150,
    cabinetBoxHeight: 720,
    totalHeight: 870,
    standardDepths: [560, 580],
    defaultDepth: 560,
    availableWidths: STANDARD_WIDTHS,
  },
  wall: {
    availableHeights: [400, 500, 600, 720, 900],
    defaultHeight: 600,
    standardDepths: [350, 370],
    defaultDepth: 350,
    bottomY: 1400,
  },
  tall: {
    availableHeights: [1400, 1600, 2000, 2200],
    defaultHeight: 2200,
    standardDepths: [560, 600],
    defaultDepth: 560,
  },
  worktop: {
    availableThicknesses: WORKTOP_THICKNESSES,
    defaultThickness: 38,
    overhangFront: 30,
    overhangBack: 0,
    overhangSide: 25,
  },
  plinth: { inset: 30 },
  backsplash: { thickness: 10 },
  hood: { heightAboveCooktop: 650 },
});

const CUISINELLA: BrandProfile = buildProfile({
  id: 'cuisinella',
  name: 'Cuisinella',
  country: 'FR',
  base: {
    plinthHeights: [100, 150, 170],
    defaultPlinthHeight: 150,
    cabinetBoxHeight: 720,
    totalHeight: 870,
    standardDepths: [560, 580],
    defaultDepth: 560,
    availableWidths: STANDARD_WIDTHS,
  },
  wall: {
    availableHeights: [400, 500, 600, 720],
    defaultHeight: 600,
    standardDepths: [350, 370],
    defaultDepth: 350,
    bottomY: 1400,
  },
  tall: {
    availableHeights: [1400, 1600, 2000, 2200],
    defaultHeight: 2200,
    standardDepths: [560, 600],
    defaultDepth: 560,
  },
  worktop: {
    availableThicknesses: WORKTOP_THICKNESSES,
    defaultThickness: 38,
    overhangFront: 30,
    overhangBack: 0,
    overhangSide: 25,
  },
  plinth: { inset: 30 },
  backsplash: { thickness: 10 },
  hood: { heightAboveCooktop: 650 },
});

const LAPEYRE: BrandProfile = buildProfile({
  id: 'lapeyre',
  name: 'Lapeyre',
  country: 'FR',
  base: {
    plinthHeights: [80, 100, 150],
    defaultPlinthHeight: 100,
    cabinetBoxHeight: 780,
    totalHeight: 880,
    standardDepths: [560, 600],
    defaultDepth: 600,
    availableWidths: STANDARD_WIDTHS,
  },
  wall: {
    availableHeights: [400, 500, 600, 720],
    defaultHeight: 600,
    standardDepths: [350, 370],
    defaultDepth: 350,
    bottomY: 1370,
  },
  tall: {
    availableHeights: [1400, 1600, 2000, 2200],
    defaultHeight: 2200,
    standardDepths: [560, 600],
    defaultDepth: 600,
  },
  worktop: {
    availableThicknesses: WORKTOP_THICKNESSES,
    defaultThickness: 38,
    overhangFront: 30,
    overhangBack: 0,
    overhangSide: 25,
  },
  plinth: { inset: 30 },
  backsplash: { thickness: 10 },
  hood: { heightAboveCooktop: 650 },
});

const HACKER: BrandProfile = buildProfile({
  id: 'hacker',
  name: 'Häcker',
  country: 'DE',
  base: {
    plinthHeights: [100, 150, 170],
    defaultPlinthHeight: 150,
    cabinetBoxHeight: 720,
    totalHeight: 870,
    standardDepths: [560, 580],
    defaultDepth: 560,
    availableWidths: STANDARD_WIDTHS,
  },
  wall: {
    availableHeights: [360, 480, 600, 720, 900],
    defaultHeight: 600,
    standardDepths: [350, 370],
    defaultDepth: 350,
    bottomY: 1370,
  },
  tall: {
    availableHeights: [1400, 1600, 2000, 2200],
    defaultHeight: 2200,
    standardDepths: [560, 600],
    defaultDepth: 560,
  },
  worktop: {
    availableThicknesses: WORKTOP_THICKNESSES,
    defaultThickness: 38,
    overhangFront: 30,
    overhangBack: 0,
    overhangSide: 25,
  },
  plinth: { inset: 30 },
  backsplash: { thickness: 10 },
  hood: { heightAboveCooktop: 650 },
});

const LEICHT: BrandProfile = buildProfile({
  id: 'leicht',
  name: 'Leicht',
  country: 'DE',
  base: {
    plinthHeights: [80, 100, 120],
    defaultPlinthHeight: 100,
    cabinetBoxHeight: 720,
    totalHeight: 820,
    standardDepths: [560, 580],
    defaultDepth: 560,
    availableWidths: STANDARD_WIDTHS,
  },
  wall: {
    availableHeights: [360, 480, 600, 720, 900],
    defaultHeight: 600,
    standardDepths: [350, 370],
    defaultDepth: 350,
    bottomY: 1370,
  },
  tall: {
    availableHeights: [1400, 1600, 2000, 2200],
    defaultHeight: 2200,
    standardDepths: [560, 600],
    defaultDepth: 560,
  },
  worktop: {
    availableThicknesses: WORKTOP_THICKNESSES,
    defaultThickness: 38,
    overhangFront: 30,
    overhangBack: 0,
    overhangSide: 25,
  },
  plinth: { inset: 30 },
  backsplash: { thickness: 10 },
  hood: { heightAboveCooktop: 650 },
});

const SIEMATIC: BrandProfile = buildProfile({
  id: 'siematic',
  name: 'SieMatic',
  country: 'DE',
  base: {
    plinthHeights: [100, 150, 170],
    defaultPlinthHeight: 150,
    cabinetBoxHeight: 720,
    totalHeight: 870,
    standardDepths: [560, 600],
    defaultDepth: 560,
    availableWidths: STANDARD_WIDTHS,
  },
  wall: {
    availableHeights: [360, 480, 600, 720, 900],
    defaultHeight: 600,
    standardDepths: [350, 370],
    defaultDepth: 350,
    bottomY: 1370,
  },
  tall: {
    availableHeights: [1400, 1600, 2000, 2200],
    defaultHeight: 2200,
    standardDepths: [560, 600],
    defaultDepth: 560,
  },
  worktop: {
    availableThicknesses: WORKTOP_THICKNESSES,
    defaultThickness: 38,
    overhangFront: 30,
    overhangBack: 0,
    overhangSide: 25,
  },
  plinth: { inset: 30 },
  backsplash: { thickness: 10 },
  hood: { heightAboveCooktop: 650 },
});

const ARTHUR_BONNET: BrandProfile = buildProfile({
  id: 'arthur_bonnet',
  name: 'Arthur Bonnet',
  country: 'FR',
  base: {
    plinthHeights: [100, 150, 170],
    defaultPlinthHeight: 150,
    cabinetBoxHeight: 720,
    totalHeight: 870,
    standardDepths: [560, 580],
    defaultDepth: 560,
    availableWidths: STANDARD_WIDTHS,
  },
  wall: {
    availableHeights: [400, 500, 600, 720],
    defaultHeight: 600,
    standardDepths: [350, 370],
    defaultDepth: 350,
    bottomY: 1400,
  },
  tall: {
    availableHeights: [1400, 1600, 2000, 2200],
    defaultHeight: 2200,
    standardDepths: [560, 600],
    defaultDepth: 560,
  },
  worktop: {
    availableThicknesses: WORKTOP_THICKNESSES,
    defaultThickness: 38,
    overhangFront: 30,
    overhangBack: 0,
    overhangSide: 25,
  },
  plinth: { inset: 30 },
  backsplash: { thickness: 10 },
  hood: { heightAboveCooktop: 650 },
});

const HYGENA: BrandProfile = buildProfile({
  id: 'hygena',
  name: 'Hygena',
  country: 'FR',
  base: {
    plinthHeights: [80, 100, 150],
    defaultPlinthHeight: 100,
    cabinetBoxHeight: 780,
    totalHeight: 880,
    standardDepths: [560, 600],
    defaultDepth: 600,
    availableWidths: STANDARD_WIDTHS,
  },
  wall: {
    availableHeights: [400, 500, 600, 720],
    defaultHeight: 600,
    standardDepths: [350, 370],
    defaultDepth: 350,
    bottomY: 1370,
  },
  tall: {
    availableHeights: [1400, 1600, 2000, 2200],
    defaultHeight: 2200,
    standardDepths: [560, 600],
    defaultDepth: 600,
  },
  worktop: {
    availableThicknesses: WORKTOP_THICKNESSES,
    defaultThickness: 38,
    overhangFront: 30,
    overhangBack: 0,
    overhangSide: 25,
  },
  plinth: { inset: 30 },
  backsplash: { thickness: 10 },
  hood: { heightAboveCooktop: 650 },
});

const CUSTOM: BrandProfile = buildProfile({
  id: 'custom',
  name: 'Personnalisé',
  country: 'FR',
  base: {
    plinthHeights: [80, 100, 120, 150, 170],
    defaultPlinthHeight: 100,
    cabinetBoxHeight: 780,
    totalHeight: 880,
    standardDepths: [560, 580, 600],
    defaultDepth: 600,
    availableWidths: STANDARD_WIDTHS,
  },
  wall: {
    availableHeights: [360, 400, 480, 500, 600, 720, 800, 900, 1000],
    defaultHeight: 600,
    standardDepths: [320, 350, 370, 400],
    defaultDepth: 350,
    bottomY: 1400,
  },
  tall: {
    availableHeights: [1400, 1600, 1800, 2000, 2200, 2400],
    defaultHeight: 2200,
    standardDepths: [560, 580, 600],
    defaultDepth: 600,
  },
  worktop: {
    availableThicknesses: WORKTOP_THICKNESSES,
    defaultThickness: 38,
    overhangFront: 30,
    overhangBack: 0,
    overhangSide: 25,
  },
  plinth: { inset: 30 },
  backsplash: { thickness: 10 },
  hood: { heightAboveCooktop: 650 },
});

// --- Registry ---

export const BRAND_PROFILES: Record<BrandId, BrandProfile> = {
  ikea_metod: IKEA_METOD,
  schmidt: SCHMIDT,
  nobilia: NOBILIA,
  mobalpa: MOBALPA,
  cuisinella: CUISINELLA,
  lapeyre: LAPEYRE,
  hacker: HACKER,
  leicht: LEICHT,
  siematic: SIEMATIC,
  arthur_bonnet: ARTHUR_BONNET,
  hygena: HYGENA,
  custom: CUSTOM,
};

/** Get a brand profile by ID (defaults to IKEA METOD) */
export function getBrandProfile(brandId?: BrandId): BrandProfile {
  return BRAND_PROFILES[brandId ?? 'ikea_metod'] ?? BRAND_PROFILES.ikea_metod;
}

/** Get all brand IDs */
export function getAllBrandIds(): BrandId[] {
  return Object.keys(BRAND_PROFILES) as BrandId[];
}

/** Recompute worktop surfaceY and hood aboveFloorY for a given thickness */
export function recomputeWithThickness(profile: BrandProfile, thicknessMm: number): BrandProfile {
  const surfaceY = profile.base.totalHeight + thicknessMm;
  const aboveFloorY = surfaceY + profile.hood.heightAboveCooktop;
  return {
    ...profile,
    worktop: { ...profile.worktop, defaultThickness: thicknessMm, surfaceY },
    hood: { ...profile.hood, aboveFloorY },
  };
}
