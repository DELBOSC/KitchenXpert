/**
 * Dimension Calculator Module
 *
 * Calculates kitchen dimensions, work triangle efficiency,
 * and provides layout recommendations based on space.
 */

/**
 * Standard kitchen dimensions and clearances (in inches)
 */
const STANDARD_DIMENSIONS = {
  countertopDepth: 25,
  countertopHeight: 36,
  upperCabinetHeight: 30,
  upperCabinetDepth: 12,
  distanceToUpperCabinet: 18,
  standardAisle: 42,
  minimumAisle: 36,
  islandClearance: 42,
  minimumIslandClearance: 36,
  workTriangleMin: 13 * 12,
  workTriangleMax: 26 * 12,
  standardIslandWidth: 42,
  minimumIslandWidth: 24,
  seatingDepth: 24,
  barStoolWidth: 24
};

/**
 * Kitchen size categories
 */
const SIZE_CATEGORIES = {
  small: { minSqFt: 0, maxSqFt: 100, label: 'Small', recommendations: ['one-wall', 'galley'] },
  medium: { minSqFt: 100, maxSqFt: 150, label: 'Medium', recommendations: ['l-shaped', 'galley', 'peninsula'] },
  large: { minSqFt: 150, maxSqFt: 250, label: 'Large', recommendations: ['l-shaped', 'u-shaped', 'island'] },
  'very-large': { minSqFt: 250, maxSqFt: 1000, label: 'Very Large', recommendations: ['island', 'u-shaped', 'multiple-zones'] }
};

/**
 * Layout requirements (minimum dimensions in feet)
 */
const LAYOUT_REQUIREMENTS = {
  'one-wall': { minLength: 8, minWidth: 6, minSqFt: 48 },
  'galley': { minLength: 8, minWidth: 7, minSqFt: 56 },
  'l-shaped': { minLength: 10, minWidth: 10, minSqFt: 100 },
  'u-shaped': { minLength: 10, minWidth: 10, minSqFt: 100 },
  'peninsula': { minLength: 10, minWidth: 10, minSqFt: 100 },
  'island': { minLength: 12, minWidth: 12, minSqFt: 144 }
};

/**
 * Calculate square footage from dimensions
 */
function calculateSquareFootage(length, width, unit = 'ft') {
  let lengthFt = length;
  let widthFt = width;

  if (unit === 'm') {
    lengthFt = length * 3.28084;
    widthFt = width * 3.28084;
  }

  return {
    sqFt: Math.round(lengthFt * widthFt),
    sqM: Math.round(lengthFt * widthFt * 0.0929 * 100) / 100,
    lengthFt: Math.round(lengthFt * 100) / 100,
    widthFt: Math.round(widthFt * 100) / 100
  };
}

/**
 * Determine kitchen size category
 */
function determineKitchenSize(sqFt) {
  for (const [category, config] of Object.entries(SIZE_CATEGORIES)) {
    if (sqFt >= config.minSqFt && sqFt < config.maxSqFt) {
      return {
        category,
        label: config.label,
        recommendedLayouts: config.recommendations
      };
    }
  }
  return {
    category: 'large',
    label: 'Large',
    recommendedLayouts: SIZE_CATEGORIES.large.recommendations
  };
}

/**
 * Check if a layout is feasible for given dimensions
 */
function checkLayoutFeasibility(length, width, desiredLayout) {
  const requirements = LAYOUT_REQUIREMENTS[desiredLayout];
  if (!requirements) {
    return { feasible: true, warnings: [] };
  }

  const sqFt = length * width;
  const warnings = [];
  let feasible = true;

  if (sqFt < requirements.minSqFt) {
    feasible = false;
    warnings.push({
      code: 'INSUFFICIENT_AREA',
      message: `This layout typically requires at least ${requirements.minSqFt} sq ft. Your space is ${sqFt} sq ft.`
    });
  }

  if (length < requirements.minLength && width < requirements.minLength) {
    feasible = false;
    warnings.push({
      code: 'INSUFFICIENT_LENGTH',
      message: `This layout needs at least ${requirements.minLength} ft in one dimension.`
    });
  }

  if (length < requirements.minWidth && width < requirements.minWidth) {
    feasible = false;
    warnings.push({
      code: 'INSUFFICIENT_WIDTH',
      message: `This layout needs at least ${requirements.minWidth} ft width.`
    });
  }

  // Special check for island
  if (desiredLayout === 'island') {
    const minDimension = Math.min(length, width);
    if (minDimension < 12) {
      warnings.push({
        code: 'ISLAND_TOO_TIGHT',
        message: 'An island may make the space feel cramped. Consider a peninsula instead.',
        severity: 'warning'
      });
    }
  }

  return { feasible, warnings };
}

/**
 * Calculate island feasibility and recommended size
 */
function calculateIslandOptions(length, width, desiredIslandType) {
  const clearance = STANDARD_DIMENSIONS.islandClearance / 12;
  const minClearance = STANDARD_DIMENSIONS.minimumIslandClearance / 12;

  // Available space for island
  const availableLength = length - (2 * clearance);
  const availableWidth = width - (2 * clearance);

  const result = {
    canFitIsland: false,
    canFitIslandWithMinClearance: false,
    recommendedIslandSize: null,
    seatingCapacity: 0,
    recommendations: []
  };

  // Check if island fits with standard clearance
  if (availableLength >= 4 && availableWidth >= 2) {
    result.canFitIsland = true;

    // Calculate recommended island size
    const maxIslandLength = Math.min(availableLength, 8);
    const maxIslandWidth = Math.min(availableWidth, 4);

    result.recommendedIslandSize = {
      length: Math.round(maxIslandLength * 10) / 10,
      width: Math.round(maxIslandWidth * 10) / 10,
      unit: 'ft'
    };

    // Calculate seating
    if (desiredIslandType === 'yes-large') {
      const seatingLength = maxIslandLength - 1;
      result.seatingCapacity = Math.floor(seatingLength / 2);
    }
  } else if (availableLength + (clearance - minClearance) * 2 >= 4) {
    result.canFitIslandWithMinClearance = true;
    result.recommendations.push({
      type: 'warning',
      message: 'An island is possible but will have minimum clearance. Consider a smaller or mobile island.'
    });
  }

  // Alternative recommendations
  if (!result.canFitIsland) {
    result.recommendations.push({
      type: 'alternative',
      message: 'Consider a peninsula or mobile cart for additional workspace.'
    });
  }

  return result;
}

/**
 * Calculate work triangle efficiency
 */
function calculateWorkTriangle(sinkPos, stovePos, fridgePos) {
  const distance = (p1, p2) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const sinkToStove = distance(sinkPos, stovePos);
  const stoveToFridge = distance(stovePos, fridgePos);
  const fridgeToSink = distance(fridgePos, sinkPos);

  const totalDistance = sinkToStove + stoveToFridge + fridgeToSink;
  const totalInches = totalDistance * 12;

  const result = {
    totalDistance: Math.round(totalDistance * 10) / 10,
    unit: 'ft',
    legs: {
      sinkToStove: Math.round(sinkToStove * 10) / 10,
      stoveToFridge: Math.round(stoveToFridge * 10) / 10,
      fridgeToSink: Math.round(fridgeToSink * 10) / 10
    },
    efficiency: 'optimal',
    score: 100,
    recommendations: []
  };

  // Check against standards
  if (totalInches < STANDARD_DIMENSIONS.workTriangleMin) {
    result.efficiency = 'too-compact';
    result.score = 70;
    result.recommendations.push('Work triangle is too compact. Consider spreading appliances further apart.');
  } else if (totalInches > STANDARD_DIMENSIONS.workTriangleMax) {
    result.efficiency = 'too-spread';
    result.score = 60;
    result.recommendations.push('Work triangle is too spread out. You\'ll walk more than necessary.');
  }

  // Check individual legs
  const minLeg = 4;
  const maxLeg = 9;

  for (const [name, distance] of Object.entries(result.legs)) {
    if (distance < minLeg) {
      result.recommendations.push(`${name} is too short (${distance} ft). Aim for 4-9 ft.`);
      result.score -= 10;
    } else if (distance > maxLeg) {
      result.recommendations.push(`${name} is too long (${distance} ft). Aim for 4-9 ft.`);
      result.score -= 10;
    }
  }

  return result;
}

/**
 * Calculate storage capacity based on layout
 */
function calculateStorageCapacity(layout, dimensions, ceilingHeight) {
  const { length, width } = dimensions;
  const sqFt = length * width;

  // Base cabinet linear feet by layout
  const cabinetLinearFeet = {
    'one-wall': length,
    'galley': length * 2,
    'l-shaped': length + width,
    'u-shaped': length + (width * 2),
    'peninsula': length + width + 3,
    'island': length + width + 4
  };

  const linearFeet = cabinetLinearFeet[layout] || length;

  // Calculate storage
  const baseCabinetCuFt = linearFeet * 2 * 2.5;
  const upperCabinetCuFt = linearFeet * 2 * 1.5;

  // Adjust for ceiling height
  let ceilingMultiplier = 1;
  if (ceilingHeight === 'tall') ceilingMultiplier = 1.2;
  if (ceilingHeight === 'very-tall') ceilingMultiplier = 1.4;

  return {
    linearCabinetFeet: Math.round(linearFeet),
    baseCabinetStorage: Math.round(baseCabinetCuFt),
    upperCabinetStorage: Math.round(upperCabinetCuFt * ceilingMultiplier),
    totalStorage: Math.round(baseCabinetCuFt + (upperCabinetCuFt * ceilingMultiplier)),
    unit: 'cubic feet',
    storageLevel: sqFt > 200 ? 'high' : sqFt > 120 ? 'medium' : 'limited'
  };
}

/**
 * Generate layout recommendations based on all constraints
 */
function generateLayoutRecommendations(params) {
  const {
    kitchenSize,
    dimensions,
    currentLayout,
    desiredLayout,
    islandPreference,
    structuralConstraints,
    openConcept,
    storageNeeds
  } = params;

  const recommendations = [];
  const feasibility = {};

  // Check desired layout feasibility
  if (dimensions && desiredLayout && desiredLayout !== 'keep-current') {
    feasibility.desiredLayout = checkLayoutFeasibility(
      dimensions.lengthFt,
      dimensions.widthFt,
      desiredLayout
    );

    if (!feasibility.desiredLayout.feasible) {
      recommendations.push({
        id: 'layout-alternative',
        priority: 'high',
        title: 'Consider Alternative Layout',
        description: `Your desired ${desiredLayout} layout may not fit well. Consider: ${SIZE_CATEGORIES[kitchenSize]?.recommendations.join(', ')}`
      });
    }
  }

  // Island recommendations
  if (islandPreference && islandPreference !== 'no' && dimensions) {
    const islandOptions = calculateIslandOptions(
      dimensions.lengthFt,
      dimensions.widthFt,
      islandPreference
    );

    feasibility.island = islandOptions;

    if (!islandOptions.canFitIsland && islandPreference.includes('yes')) {
      recommendations.push({
        id: 'island-alternative',
        priority: 'medium',
        title: 'Island Alternatives',
        description: 'Consider a peninsula or mobile cart instead of a fixed island.'
      });
    }
  }

  // Structural constraint recommendations
  if (structuralConstraints && !structuralConstraints.includes('none')) {
    if (structuralConstraints.includes('load-bearing-wall') && openConcept === 'want-to-open') {
      recommendations.push({
        id: 'structural-review',
        priority: 'high',
        title: 'Structural Review Needed',
        description: 'Opening up the kitchen may require structural engineering review and beam installation.'
      });
    }

    if (structuralConstraints.includes('plumbing-location')) {
      recommendations.push({
        id: 'plumbing-consideration',
        priority: 'medium',
        title: 'Plumbing Constraints',
        description: 'Keep sink near existing plumbing to minimize relocation costs.'
      });
    }
  }

  // Storage recommendations
  if (storageNeeds === 'maximum') {
    recommendations.push({
      id: 'maximize-storage',
      priority: 'medium',
      title: 'Maximize Storage',
      description: 'Consider tall pantry cabinets, pull-outs, and upper cabinets to ceiling.'
    });
  }

  return {
    recommendations,
    feasibility,
    optimalLayouts: SIZE_CATEGORIES[kitchenSize]?.recommendations || ['l-shaped']
  };
}

/**
 * Convert between units
 */
function convertUnits(value, fromUnit, toUnit) {
  const conversions = {
    'ft-m': value * 0.3048,
    'm-ft': value * 3.28084,
    'in-cm': value * 2.54,
    'cm-in': value / 2.54,
    'sqft-sqm': value * 0.0929,
    'sqm-sqft': value / 0.0929
  };

  const key = `${fromUnit}-${toUnit}`;
  return conversions[key] !== undefined ? conversions[key] : value;
}

module.exports = {
  calculateSquareFootage,
  determineKitchenSize,
  checkLayoutFeasibility,
  calculateIslandOptions,
  calculateWorkTriangle,
  calculateStorageCapacity,
  generateLayoutRecommendations,
  convertUnits,
  STANDARD_DIMENSIONS,
  SIZE_CATEGORIES,
  LAYOUT_REQUIREMENTS
};
