/**
 * Unit constants for kitchen measurements
 */

/** Length Unit Types */
export enum LengthUnit {
  MILLIMETER = 'mm',
  CENTIMETER = 'cm',
  METER = 'm',
  INCH = 'in',
  FOOT = 'ft',
}

/** Length Unit Labels */
export const LENGTH_UNIT_LABELS: Record<LengthUnit, string> = {
  [LengthUnit.MILLIMETER]: 'Millimeters',
  [LengthUnit.CENTIMETER]: 'Centimeters',
  [LengthUnit.METER]: 'Meters',
  [LengthUnit.INCH]: 'Inches',
  [LengthUnit.FOOT]: 'Feet',
};

/** Conversion factors to millimeters (base unit) */
export const MM_CONVERSION_FACTORS: Record<LengthUnit, number> = {
  [LengthUnit.MILLIMETER]: 1,
  [LengthUnit.CENTIMETER]: 10,
  [LengthUnit.METER]: 1000,
  [LengthUnit.INCH]: 25.4,
  [LengthUnit.FOOT]: 304.8,
};

/** Conversion factors from millimeters to other units */
export const FROM_MM_CONVERSION_FACTORS: Record<LengthUnit, number> = {
  [LengthUnit.MILLIMETER]: 1,
  [LengthUnit.CENTIMETER]: 0.1,
  [LengthUnit.METER]: 0.001,
  [LengthUnit.INCH]: 0.0393701,
  [LengthUnit.FOOT]: 0.00328084,
};

/** Area Units */
export enum AreaUnit {
  SQUARE_MILLIMETER = 'mm2',
  SQUARE_CENTIMETER = 'cm2',
  SQUARE_METER = 'm2',
  SQUARE_INCH = 'in2',
  SQUARE_FOOT = 'ft2',
}

/** Area Unit Labels */
export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
  [AreaUnit.SQUARE_MILLIMETER]: 'Square Millimeters',
  [AreaUnit.SQUARE_CENTIMETER]: 'Square Centimeters',
  [AreaUnit.SQUARE_METER]: 'Square Meters',
  [AreaUnit.SQUARE_INCH]: 'Square Inches',
  [AreaUnit.SQUARE_FOOT]: 'Square Feet',
};

/** Volume Units */
export enum VolumeUnit {
  CUBIC_CENTIMETER = 'cm3',
  CUBIC_METER = 'm3',
  LITER = 'L',
  CUBIC_INCH = 'in3',
  CUBIC_FOOT = 'ft3',
  GALLON = 'gal',
}

/** Weight Units */
export enum WeightUnit {
  GRAM = 'g',
  KILOGRAM = 'kg',
  POUND = 'lb',
  OUNCE = 'oz',
}

/** Weight Unit Labels */
export const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  [WeightUnit.GRAM]: 'Grams',
  [WeightUnit.KILOGRAM]: 'Kilograms',
  [WeightUnit.POUND]: 'Pounds',
  [WeightUnit.OUNCE]: 'Ounces',
};

/** Measurement System */
export enum MeasurementSystem {
  METRIC = 'metric',
  IMPERIAL = 'imperial',
}

/** Default units by measurement system */
export const DEFAULT_UNITS = {
  [MeasurementSystem.METRIC]: {
    length: LengthUnit.MILLIMETER,
    area: AreaUnit.SQUARE_METER,
    volume: VolumeUnit.LITER,
    weight: WeightUnit.KILOGRAM,
  },
  [MeasurementSystem.IMPERIAL]: {
    length: LengthUnit.INCH,
    area: AreaUnit.SQUARE_FOOT,
    volume: VolumeUnit.CUBIC_FOOT,
    weight: WeightUnit.POUND,
  },
} as const;

/** Precision for unit display */
export const UNIT_PRECISION = {
  [LengthUnit.MILLIMETER]: 0,
  [LengthUnit.CENTIMETER]: 1,
  [LengthUnit.METER]: 3,
  [LengthUnit.INCH]: 2,
  [LengthUnit.FOOT]: 2,
} as const;
