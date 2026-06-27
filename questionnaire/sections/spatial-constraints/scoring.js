/**
 * Spatial Constraints Section Scoring Module
 *
 * Advanced spatial analysis for kitchen planning including:
 * - Dimensional analysis and feasibility assessment
 * - Layout optimization recommendations
 * - Work zone planning and traffic flow analysis
 * - Storage capacity calculation
 * - Island and peninsula feasibility
 * - Accessibility compliance evaluation
 */

const dimensionCalculator = require('./dimension-calculator');

/**
 * Score weights for spatial factors
 */
const SCORE_WEIGHTS = {
  kitchenSize: 0.2,
  ceilingHeight: 0.12,
  desiredLayout: 0.18,
  islandPreference: 0.12,
  storageNeeds: 0.15,
  structuralConstraints: 0.1,
  openConcept: 0.08,
  windowPlacement: 0.05,
};

/**
 * Size category configurations with detailed recommendations
 */
const SIZE_CATEGORY_SCORES = {
  small: {
    score: 45,
    level: 'compact',
    sqFtRange: { min: 0, max: 100 },
    layoutOptions: ['one-wall', 'galley'],
    challenges: ['limited-counter', 'storage-constraints', 'single-cook'],
    opportunities: ['efficient-workflow', 'lower-cost', 'quick-cleanup'],
    tags: ['compact-kitchen', 'efficiency-focused'],
    designStrategies: [
      'maximize-vertical-storage',
      'light-colors',
      'reflective-surfaces',
      'multi-function-appliances',
    ],
  },
  medium: {
    score: 70,
    level: 'standard',
    sqFtRange: { min: 100, max: 150 },
    layoutOptions: ['galley', 'l-shaped', 'peninsula'],
    challenges: ['moderate-storage', 'traffic-flow'],
    opportunities: ['good-work-triangle', 'flexible-layout', 'eat-in-possible'],
    tags: ['standard-kitchen'],
    designStrategies: ['optimize-work-triangle', 'consider-peninsula', 'pull-out-storage'],
  },
  large: {
    score: 85,
    level: 'spacious',
    sqFtRange: { min: 150, max: 250 },
    layoutOptions: ['l-shaped', 'u-shaped', 'island', 'peninsula'],
    challenges: ['maintain-efficiency', 'over-spreading'],
    opportunities: ['multiple-cooks', 'island-seating', 'pantry-space', 'specialty-zones'],
    tags: ['spacious-kitchen', 'island-capable'],
    designStrategies: [
      'work-zones',
      'multiple-work-triangles',
      'island-integration',
      'pantry-closet',
    ],
  },
  'very-large': {
    score: 95,
    level: 'expansive',
    sqFtRange: { min: 250, max: 1000 },
    layoutOptions: ['island', 'double-island', 'u-shaped', 'g-shaped'],
    challenges: ['excessive-walking', 'zone-definition', 'cost-management'],
    opportunities: ['entertaining', 'professional-features', 'custom-design', 'multi-zone'],
    tags: ['luxury-kitchen', 'entertainment-capable', 'chef-kitchen'],
    designStrategies: [
      'define-zones',
      'multiple-islands',
      'pro-appliances',
      'butlers-pantry',
      'beverage-center',
    ],
  },
};

/**
 * Ceiling height impact configurations
 */
const CEILING_HEIGHT_SCORES = {
  standard: {
    score: 50,
    height: '8ft',
    tags: [],
    cabinetOptions: ['standard-uppers', 'crown-molding'],
    storageMultiplier: 1.0,
    visualImpact: 'neutral',
  },
  tall: {
    score: 75,
    height: '9-10ft',
    tags: ['tall-ceilings'],
    cabinetOptions: ['stacked-uppers', 'extended-uppers', 'display-shelving'],
    storageMultiplier: 1.25,
    visualImpact: 'enhanced',
  },
  'very-tall': {
    score: 90,
    height: '10ft+',
    tags: ['dramatic-ceilings', 'architectural-feature'],
    cabinetOptions: ['ceiling-height', 'ladder-library', 'decorative-soffit'],
    storageMultiplier: 1.5,
    visualImpact: 'dramatic',
  },
  vaulted: {
    score: 80,
    height: 'variable',
    tags: ['vaulted-ceiling', 'architectural-feature'],
    cabinetOptions: ['follow-roofline', 'open-shelving', 'custom-uppers'],
    storageMultiplier: 1.3,
    visualImpact: 'dramatic',
  },
};

/**
 * Layout type configurations with feasibility requirements
 */
const LAYOUT_CONFIGURATIONS = {
  'one-wall': {
    score: 40,
    efficiency: 'limited',
    minSqFt: 48,
    minLength: 8,
    minWidth: 6,
    workTriangle: false,
    maxCooks: 1,
    tags: ['linear-layout', 'small-space'],
    bestFor: ['studio', 'apartment', 'efficiency', 'secondary-kitchen'],
    limitations: ['no-work-triangle', 'limited-counter', 'linear-workflow'],
  },
  galley: {
    score: 65,
    efficiency: 'high',
    minSqFt: 56,
    minLength: 8,
    minWidth: 7,
    workTriangle: true,
    maxCooks: 1,
    tags: ['galley-layout', 'efficient'],
    bestFor: ['narrow-space', 'condo', 'townhouse'],
    limitations: ['traffic-through', 'single-cook', 'no-eat-in'],
  },
  'l-shaped': {
    score: 80,
    efficiency: 'good',
    minSqFt: 100,
    minLength: 10,
    minWidth: 10,
    workTriangle: true,
    maxCooks: 2,
    tags: ['l-shaped', 'versatile'],
    bestFor: ['open-concept', 'flexible-needs', 'corner-space'],
    limitations: ['corner-access', 'one-end-dead'],
  },
  'u-shaped': {
    score: 85,
    efficiency: 'excellent',
    minSqFt: 100,
    minLength: 10,
    minWidth: 10,
    workTriangle: true,
    maxCooks: 2,
    tags: ['u-shaped', 'enclosed'],
    bestFor: ['dedicated-cook', 'maximum-storage', 'no-traffic'],
    limitations: ['enclosed-feeling', 'corner-access-x2'],
  },
  peninsula: {
    score: 82,
    efficiency: 'good',
    minSqFt: 100,
    minLength: 10,
    minWidth: 10,
    workTriangle: true,
    maxCooks: 2,
    tags: ['peninsula', 'seating-integrated'],
    bestFor: ['semi-open', 'seating-needed', 'space-division'],
    limitations: ['blocks-flow', 'fixed-position'],
  },
  island: {
    score: 90,
    efficiency: 'excellent',
    minSqFt: 144,
    minLength: 12,
    minWidth: 12,
    workTriangle: true,
    maxCooks: 3,
    tags: ['island-layout', 'multi-functional'],
    bestFor: ['open-concept', 'entertaining', 'large-family'],
    limitations: ['requires-space', 'plumbing-complexity', 'higher-cost'],
  },
  'double-island': {
    score: 95,
    efficiency: 'professional',
    minSqFt: 250,
    minLength: 16,
    minWidth: 14,
    workTriangle: true,
    maxCooks: 4,
    tags: ['double-island', 'luxury', 'professional'],
    bestFor: ['luxury-kitchen', 'serious-entertainer', 'professional-cook'],
    limitations: ['extensive-space', 'high-cost', 'complex-planning'],
  },
  'g-shaped': {
    score: 88,
    efficiency: 'excellent',
    minSqFt: 150,
    minLength: 12,
    minWidth: 12,
    workTriangle: true,
    maxCooks: 2,
    tags: ['g-shaped', 'wrap-around'],
    bestFor: ['maximum-counter', 'serious-cook', 'peninsula-alternative'],
    limitations: ['potential-cramped', 'corner-access-x2', 'enclosed'],
  },
};

/**
 * Island preference configurations
 */
const ISLAND_PREFERENCE_SCORES = {
  'yes-large': {
    score: 95,
    type: 'large-island',
    minKitchenSqFt: 200,
    seatingCapacity: '4-6',
    features: ['prep-sink', 'seating', 'storage', 'cooktop-option'],
    tags: ['large-island', 'entertainment-hub'],
    infrastructureNeeds: ['plumbing-extension', 'electrical-runs', 'structural-support'],
  },
  'yes-small': {
    score: 80,
    type: 'small-island',
    minKitchenSqFt: 144,
    seatingCapacity: '2-3',
    features: ['prep-space', 'minimal-seating', 'storage'],
    tags: ['compact-island'],
    infrastructureNeeds: ['electrical-outlet'],
  },
  'yes-mobile': {
    score: 65,
    type: 'mobile-island',
    minKitchenSqFt: 100,
    seatingCapacity: '0-2',
    features: ['flexibility', 'removable', 'no-plumbing'],
    tags: ['mobile-island', 'flexible-layout'],
    infrastructureNeeds: [],
  },
  peninsula: {
    score: 75,
    type: 'peninsula',
    minKitchenSqFt: 100,
    seatingCapacity: '2-4',
    features: ['seating', 'storage', 'space-division'],
    tags: ['peninsula'],
    infrastructureNeeds: ['electrical-outlet'],
  },
  no: {
    score: 50,
    type: 'none',
    minKitchenSqFt: 0,
    seatingCapacity: '0',
    features: [],
    tags: [],
    infrastructureNeeds: [],
  },
};

/**
 * Storage needs configurations
 */
const STORAGE_NEEDS_SCORES = {
  minimal: {
    score: 30,
    level: 'minimal',
    cabinetFactor: 0.7,
    tags: ['minimalist-storage'],
    solutions: ['open-shelving', 'essentials-only'],
  },
  standard: {
    score: 60,
    level: 'standard',
    cabinetFactor: 1.0,
    tags: [],
    solutions: ['standard-cabinets', 'basic-organizers'],
  },
  generous: {
    score: 80,
    level: 'generous',
    cabinetFactor: 1.2,
    tags: ['high-storage'],
    solutions: ['pull-outs', 'lazy-susan', 'drawer-organizers', 'pantry-cabinet'],
  },
  maximum: {
    score: 100,
    level: 'maximum',
    cabinetFactor: 1.5,
    tags: ['maximum-storage', 'pantry-priority'],
    solutions: [
      'ceiling-height-cabinets',
      'walk-in-pantry',
      'specialty-storage',
      'appliance-garage',
    ],
  },
};

/**
 * Structural constraint impact scores
 */
const STRUCTURAL_CONSTRAINT_IMPACTS = {
  none: { impact: 0, flexibility: 'full', tags: ['no-constraints'] },
  'load-bearing-wall': { impact: -20, flexibility: 'limited', tags: ['structural-limitation'] },
  'plumbing-location': { impact: -15, flexibility: 'moderate', tags: ['plumbing-constraint'] },
  'electrical-panel': { impact: -10, flexibility: 'moderate', tags: ['electrical-constraint'] },
  'window-placement': { impact: -5, flexibility: 'high', tags: ['window-consideration'] },
  'hvac-ductwork': { impact: -12, flexibility: 'moderate', tags: ['hvac-constraint'] },
  'chimney-flue': { impact: -18, flexibility: 'limited', tags: ['chimney-constraint'] },
  'floor-drain': { impact: -8, flexibility: 'high', tags: ['drainage-consideration'] },
};

/**
 * Open concept preference scores
 */
const OPEN_CONCEPT_SCORES = {
  'already-open': {
    score: 80,
    status: 'open',
    tags: ['open-concept'],
    considerations: ['noise-management', 'odor-control', 'visual-clutter'],
  },
  'want-to-open': {
    score: 90,
    status: 'planned-open',
    tags: ['open-concept-planned', 'renovation-scope'],
    considerations: ['structural-review', 'permit-required', 'budget-impact'],
  },
  'prefer-enclosed': {
    score: 50,
    status: 'enclosed',
    tags: ['enclosed-kitchen'],
    considerations: ['ventilation', 'natural-light'],
  },
  undecided: {
    score: 65,
    status: 'flexible',
    tags: [],
    considerations: ['lifestyle-assessment', 'cost-comparison'],
  },
};

/**
 * Calculate overall section score
 */
function calculateSectionScore(answers) {
  const scores = {
    overall: 0,
    spaceLevel: 'standard',
    categories: {},
    recommendations: [],
    tags: new Set(),
    constraints: [],
    feasibility: {},
    spaceAnalysis: null,
    layoutOptions: [],
    infrastructureNeeds: [],
  };

  // Calculate space analysis from dimensions
  if (answers['exact-dimensions']) {
    scores.spaceAnalysis = dimensionCalculator.calculateSquareFootage(
      answers['exact-dimensions'].length,
      answers['exact-dimensions'].width,
      answers['exact-dimensions'].unit || 'ft'
    );
  }

  // Determine size category
  const sizeCategory = determineSizeCategory(answers, scores.spaceAnalysis);
  scores.sizeCategory = sizeCategory;

  // Calculate component scores
  const componentScores = {
    kitchenSize: scoreKitchenSize(sizeCategory, scores.spaceAnalysis),
    ceilingHeight: scoreCeilingHeight(answers['ceiling-height']),
    desiredLayout: scoreDesiredLayout(
      answers['desired-layout'],
      sizeCategory,
      scores.spaceAnalysis
    ),
    islandPreference: scoreIslandPreference(
      answers['island-preference'],
      sizeCategory,
      scores.spaceAnalysis
    ),
    storageNeeds: scoreStorageNeeds(answers['storage-needs'], sizeCategory),
    structuralConstraints: scoreStructuralConstraints(answers['structural-constraints']),
    openConcept: scoreOpenConcept(answers['open-concept']),
    windowPlacement: scoreWindowPlacement(answers['window-placement']),
  };

  // Calculate weighted overall score
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    if (componentScores[key] !== null && componentScores[key] !== undefined) {
      const componentScore = componentScores[key]?.score || 0;
      scores.overall += componentScore * weight;
      totalWeight += weight;

      // Collect tags
      if (componentScores[key]?.tags) {
        componentScores[key].tags.forEach((tag) => scores.tags.add(tag));
      }

      // Collect constraints
      if (componentScores[key]?.constraints) {
        scores.constraints.push(...componentScores[key].constraints);
      }

      // Collect infrastructure needs
      if (componentScores[key]?.infrastructureNeeds) {
        scores.infrastructureNeeds.push(...componentScores[key].infrastructureNeeds);
      }
    }
  }

  if (totalWeight > 0) {
    scores.overall = Math.round((scores.overall / totalWeight) * 100) / 100;
  }

  // Determine space level
  scores.spaceLevel = determineSpaceLevel(scores.overall, sizeCategory, componentScores);

  // Check layout feasibility
  if (
    answers['desired-layout'] &&
    answers['desired-layout'] !== 'keep-current' &&
    scores.spaceAnalysis
  ) {
    scores.feasibility.layout = dimensionCalculator.checkLayoutFeasibility(
      scores.spaceAnalysis.lengthFt,
      scores.spaceAnalysis.widthFt,
      answers['desired-layout']
    );
  }

  // Check island feasibility
  if (
    answers['island-preference'] &&
    answers['island-preference'] !== 'no' &&
    scores.spaceAnalysis
  ) {
    scores.feasibility.island = dimensionCalculator.calculateIslandOptions(
      scores.spaceAnalysis.lengthFt,
      scores.spaceAnalysis.widthFt,
      answers['island-preference']
    );
  }

  // Calculate storage capacity
  if (scores.spaceAnalysis && answers['desired-layout']) {
    scores.storageCapacity = dimensionCalculator.calculateStorageCapacity(
      answers['desired-layout'] === 'keep-current' ? 'l-shaped' : answers['desired-layout'],
      { length: scores.spaceAnalysis.lengthFt, width: scores.spaceAnalysis.widthFt },
      answers['ceiling-height']
    );
  }

  // Build categories
  scores.categories = {
    size: {
      score: componentScores.kitchenSize?.score || 50,
      category: sizeCategory,
      sqFt: scores.spaceAnalysis?.sqFt,
      level: SIZE_CATEGORY_SCORES[sizeCategory]?.level || 'standard',
    },
    layout: {
      score: componentScores.desiredLayout?.score || 50,
      current: answers['current-layout'],
      desired: answers['desired-layout'],
      feasible: scores.feasibility.layout?.feasible ?? true,
      warnings: scores.feasibility.layout?.warnings || [],
    },
    ceiling: {
      score: componentScores.ceilingHeight?.score || 50,
      height: answers['ceiling-height'] || 'standard',
      storageMultiplier: componentScores.ceilingHeight?.storageMultiplier || 1.0,
    },
    island: {
      score: componentScores.islandPreference?.score || 50,
      preference: answers['island-preference'] || 'no',
      feasible: scores.feasibility.island?.canFitIsland ?? true,
      recommendedSize: scores.feasibility.island?.recommendedIslandSize,
    },
    storage: {
      score: componentScores.storageNeeds?.score || 60,
      level: answers['storage-needs'] || 'standard',
      capacity: scores.storageCapacity,
      solutions: componentScores.storageNeeds?.solutions || [],
    },
    workZones: calculateWorkZoneScore(answers, sizeCategory, scores.spaceAnalysis),
    trafficFlow: calculateTrafficFlowScore(answers, componentScores),
    accessibility: calculateAccessibilityScore(answers, sizeCategory),
  };

  // Generate layout options
  scores.layoutOptions = generateLayoutOptions(sizeCategory, scores.spaceAnalysis, answers);

  // Generate recommendations
  scores.recommendations = generateRecommendations(answers, componentScores, scores);

  // Convert tags to array
  scores.tags = Array.from(scores.tags);

  // Remove duplicates from infrastructure needs
  scores.infrastructureNeeds = [...new Set(scores.infrastructureNeeds)];

  return scores;
}

/**
 * Determine size category from answers or dimensions
 */
function determineSizeCategory(answers, spaceAnalysis) {
  // If we have exact dimensions, use them
  if (spaceAnalysis?.sqFt) {
    const sqFt = spaceAnalysis.sqFt;
    if (sqFt < 100) return 'small';
    if (sqFt < 150) return 'medium';
    if (sqFt < 250) return 'large';
    return 'very-large';
  }

  // Otherwise use the selected category
  return answers['kitchen-size'] || 'medium';
}

/**
 * Score kitchen size
 */
function scoreKitchenSize(category, spaceAnalysis) {
  const config = SIZE_CATEGORY_SCORES[category] || SIZE_CATEGORY_SCORES.medium;

  const result = {
    score: config.score,
    category,
    level: config.level,
    tags: [...config.tags],
    challenges: config.challenges,
    opportunities: config.opportunities,
    designStrategies: config.designStrategies,
  };

  // Adjust score based on exact dimensions if available
  if (spaceAnalysis?.sqFt) {
    const sqFt = spaceAnalysis.sqFt;
    const range = config.sqFtRange;

    // Score bonus for being in ideal range
    const midpoint = (range.min + range.max) / 2;
    const distanceFromMid = Math.abs(sqFt - midpoint);
    const rangeSpan = range.max - range.min;

    if (rangeSpan > 0) {
      const positionFactor = 1 - distanceFromMid / rangeSpan;
      result.score = Math.round(config.score * (0.9 + 0.1 * positionFactor));
    }

    result.sqFt = sqFt;
    result.dimensions = {
      length: spaceAnalysis.lengthFt,
      width: spaceAnalysis.widthFt,
    };
  }

  return result;
}

/**
 * Score ceiling height
 */
function scoreCeilingHeight(value) {
  if (!value) return { score: 50, tags: [], storageMultiplier: 1.0 };

  const config = CEILING_HEIGHT_SCORES[value] || CEILING_HEIGHT_SCORES.standard;

  return {
    score: config.score,
    height: config.height,
    tags: [...config.tags],
    cabinetOptions: config.cabinetOptions,
    storageMultiplier: config.storageMultiplier,
    visualImpact: config.visualImpact,
  };
}

/**
 * Score desired layout
 */
function scoreDesiredLayout(value, sizeCategory, spaceAnalysis) {
  if (!value || value === 'keep-current') {
    return { score: 60, tags: ['keep-layout'], constraints: [] };
  }

  const config = LAYOUT_CONFIGURATIONS[value];
  if (!config) {
    return { score: 50, tags: [], constraints: [] };
  }

  const result = {
    score: config.score,
    layout: value,
    efficiency: config.efficiency,
    maxCooks: config.maxCooks,
    tags: [...config.tags],
    bestFor: config.bestFor,
    limitations: config.limitations,
    constraints: [],
    warnings: [],
  };

  // Check feasibility based on size category
  const categoryConfig = SIZE_CATEGORY_SCORES[sizeCategory];
  if (categoryConfig && !categoryConfig.layoutOptions.includes(value)) {
    result.score -= 20;
    result.constraints.push({
      type: 'layout-size-mismatch',
      severity: 'warning',
      message: {
        en: `${value} layout may not be ideal for a ${sizeCategory} kitchen`,
        fr: `La disposition ${value} peut ne pas être idéale pour une cuisine ${sizeCategory}`,
      },
    });
  }

  // Additional check with exact dimensions
  if (spaceAnalysis?.sqFt) {
    if (spaceAnalysis.sqFt < config.minSqFt) {
      result.score -= 30;
      result.constraints.push({
        type: 'insufficient-space',
        severity: 'critical',
        message: {
          en: `This layout requires at least ${config.minSqFt} sq ft, but your space is ${spaceAnalysis.sqFt} sq ft`,
          fr: `Cette disposition nécessite au moins ${config.minSqFt} pi², mais votre espace est de ${spaceAnalysis.sqFt} pi²`,
        },
      });
    }
  }

  return result;
}

/**
 * Score island preference
 */
function scoreIslandPreference(value, sizeCategory, spaceAnalysis) {
  if (!value) return { score: 50, tags: [], infrastructureNeeds: [] };

  const config = ISLAND_PREFERENCE_SCORES[value] || ISLAND_PREFERENCE_SCORES.no;

  const result = {
    score: config.score,
    type: config.type,
    seatingCapacity: config.seatingCapacity,
    features: config.features,
    tags: [...config.tags],
    infrastructureNeeds: [...config.infrastructureNeeds],
    constraints: [],
  };

  // Check if kitchen is large enough
  if (spaceAnalysis?.sqFt && config.minKitchenSqFt > 0) {
    if (spaceAnalysis.sqFt < config.minKitchenSqFt) {
      result.score -= 25;
      result.constraints.push({
        type: 'island-space-constraint',
        severity: 'warning',
        message: {
          en: `A ${config.type} typically requires at least ${config.minKitchenSqFt} sq ft`,
          fr: `Un ${config.type} nécessite généralement au moins ${config.minKitchenSqFt} pi²`,
        },
      });
    }
  }

  // Category-based feasibility
  if (value.includes('yes') && sizeCategory === 'small') {
    result.score -= 20;
    result.tags.push('island-challenging');
    result.constraints.push({
      type: 'island-small-kitchen',
      severity: 'warning',
      message: {
        en: 'An island in a small kitchen may reduce functionality',
        fr: 'Un îlot dans une petite cuisine peut réduire la fonctionnalité',
      },
    });
  }

  return result;
}

/**
 * Score storage needs
 */
function scoreStorageNeeds(value, sizeCategory) {
  if (!value) return { score: 60, level: 'standard', tags: [], solutions: [] };

  const config = STORAGE_NEEDS_SCORES[value] || STORAGE_NEEDS_SCORES.standard;

  const result = {
    score: config.score,
    level: config.level,
    cabinetFactor: config.cabinetFactor,
    tags: [...config.tags],
    solutions: [...config.solutions],
    constraints: [],
  };

  // Maximum storage in small kitchen is challenging
  if (value === 'maximum' && sizeCategory === 'small') {
    result.constraints.push({
      type: 'storage-space-limit',
      severity: 'info',
      message: {
        en: 'Maximizing storage in a small kitchen requires creative solutions',
        fr: 'Maximiser le rangement dans une petite cuisine nécessite des solutions créatives',
      },
    });
    result.solutions.push('vertical-optimization', 'multi-function-furniture');
  }

  return result;
}

/**
 * Score structural constraints
 */
function scoreStructuralConstraints(values) {
  if (!values || !Array.isArray(values)) {
    return { score: 100, tags: ['no-constraints'], constraints: [] };
  }

  if (values.includes('none')) {
    return { score: 100, tags: ['no-constraints'], constraints: [] };
  }

  let score = 100;
  const tags = [];
  const constraints = [];

  values.forEach((constraint) => {
    const impact = STRUCTURAL_CONSTRAINT_IMPACTS[constraint];
    if (impact) {
      score += impact.impact;
      tags.push(...impact.tags);
      constraints.push({
        type: constraint,
        flexibility: impact.flexibility,
        severity: Math.abs(impact.impact) > 15 ? 'high' : 'moderate',
      });
    }
  });

  return {
    score: Math.max(20, score),
    constraints: values,
    tags,
    detailedConstraints: constraints,
    overallFlexibility: score > 70 ? 'high' : score > 50 ? 'moderate' : 'limited',
  };
}

/**
 * Score open concept preference
 */
function scoreOpenConcept(value) {
  if (!value) return { score: 65, tags: [], considerations: [] };

  const config = OPEN_CONCEPT_SCORES[value] || OPEN_CONCEPT_SCORES.undecided;

  return {
    score: config.score,
    status: config.status,
    tags: [...config.tags],
    considerations: config.considerations,
  };
}

/**
 * Score window placement
 */
function scoreWindowPlacement(value) {
  if (!value) return { score: 50, tags: [] };

  const scores = {
    'sink-window': { score: 85, tags: ['natural-light', 'sink-view'], benefit: 'dishwashing-view' },
    'multiple-windows': {
      score: 95,
      tags: ['abundant-light', 'well-lit'],
      benefit: 'excellent-lighting',
    },
    'single-window': { score: 70, tags: ['natural-light'], benefit: 'some-lighting' },
    'no-windows': { score: 35, tags: ['interior-kitchen', 'lighting-dependent'], benefit: 'none' },
    skylight: {
      score: 80,
      tags: ['overhead-light', 'architectural'],
      benefit: 'overhead-lighting',
    },
  };

  const config = scores[value] || { score: 50, tags: [], benefit: 'unknown' };

  return {
    score: config.score,
    placement: value,
    tags: [...config.tags],
    benefit: config.benefit,
  };
}

/**
 * Calculate work zone score
 */
function calculateWorkZoneScore(answers, sizeCategory, spaceAnalysis) {
  let score = 50;
  const zones = [];

  // Larger kitchens support more work zones
  const categoryScores = { small: 1, medium: 2, large: 3, 'very-large': 4 };
  const maxZones = categoryScores[sizeCategory] || 2;

  // Define potential zones based on layout
  const layout = answers['desired-layout'] || 'l-shaped';
  const layoutConfig = LAYOUT_CONFIGURATIONS[layout];

  if (layoutConfig) {
    if (layoutConfig.maxCooks >= 2) {
      zones.push({ name: 'prep-zone', possible: true });
      zones.push({ name: 'cooking-zone', possible: true });
      score += 15;
    }
    if (layoutConfig.maxCooks >= 3) {
      zones.push({ name: 'baking-zone', possible: true });
      score += 10;
    }
    if (layoutConfig.efficiency === 'excellent' || layoutConfig.efficiency === 'professional') {
      zones.push({ name: 'cleanup-zone', possible: true });
      score += 10;
    }
  }

  // Island adds a zone
  if (answers['island-preference'] && answers['island-preference'] !== 'no') {
    zones.push({ name: 'island-zone', possible: true });
    score += 15;
  }

  return {
    score: Math.min(100, score),
    maxZones,
    possibleZones: zones,
    efficiency: score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'basic',
  };
}

/**
 * Calculate traffic flow score
 */
function calculateTrafficFlowScore(answers, componentScores) {
  let score = 70;
  const concerns = [];

  // Open concept affects flow
  if (answers['open-concept'] === 'already-open' || answers['open-concept'] === 'want-to-open') {
    score += 15;
  }

  // Galley layout has through-traffic issues
  if (answers['desired-layout'] === 'galley') {
    score -= 10;
    concerns.push('through-traffic-possible');
  }

  // Island can impede or improve flow
  if (answers['island-preference']) {
    if (answers['island-preference'] === 'yes-large') {
      if (
        componentScores.kitchenSize?.category === 'small' ||
        componentScores.kitchenSize?.category === 'medium'
      ) {
        score -= 15;
        concerns.push('island-may-block-flow');
      } else {
        score += 10;
      }
    }
  }

  // Structural constraints affect flow
  if (answers['structural-constraints']?.includes('load-bearing-wall')) {
    score -= 10;
    concerns.push('structural-flow-limitation');
  }

  return {
    score: Math.max(30, Math.min(100, score)),
    level:
      score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'moderate' : 'challenging',
    concerns,
  };
}

/**
 * Calculate accessibility score
 */
function calculateAccessibilityScore(answers, sizeCategory) {
  let score = 60;
  const features = [];

  // Larger kitchens are more accessible
  if (sizeCategory === 'large' || sizeCategory === 'very-large') {
    score += 15;
    features.push('adequate-clearance');
  }

  // Layout affects accessibility
  const layout = answers['desired-layout'];
  if (layout === 'u-shaped' || layout === 'g-shaped') {
    score -= 10; // Enclosed layouts can be challenging
  }
  if (layout === 'one-wall' || layout === 'l-shaped') {
    score += 5;
    features.push('open-access');
  }

  // Island can help or hinder
  if (answers['island-preference'] === 'yes-large' && sizeCategory !== 'very-large') {
    score -= 5;
  }

  return {
    score: Math.max(30, Math.min(100, score)),
    level: score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'limited',
    features,
    recommendations:
      score < 60 ? ['wider-aisles', 'pull-out-storage', 'varied-counter-heights'] : [],
  };
}

/**
 * Determine overall space level
 */
function determineSpaceLevel(overallScore, sizeCategory, componentScores) {
  // Combine score with category
  const categoryBonus = { small: -10, medium: 0, large: 10, 'very-large': 15 };
  const adjustedScore = overallScore + (categoryBonus[sizeCategory] || 0);

  if (adjustedScore >= 85) return 'excellent';
  if (adjustedScore >= 70) return 'good';
  if (adjustedScore >= 55) return 'adequate';
  if (adjustedScore >= 40) return 'challenging';
  return 'constrained';
}

/**
 * Generate layout options
 */
function generateLayoutOptions(sizeCategory, spaceAnalysis, answers) {
  const categoryConfig = SIZE_CATEGORY_SCORES[sizeCategory];
  if (!categoryConfig) return [];

  const options = [];

  categoryConfig.layoutOptions.forEach((layoutName) => {
    const layoutConfig = LAYOUT_CONFIGURATIONS[layoutName];
    if (!layoutConfig) return;

    let feasibility = 'recommended';
    let score = layoutConfig.score;
    const notes = [];

    // Check against exact dimensions
    if (spaceAnalysis?.sqFt) {
      if (spaceAnalysis.sqFt < layoutConfig.minSqFt) {
        feasibility = 'not-recommended';
        score -= 30;
        notes.push({
          en: `Requires ${layoutConfig.minSqFt}+ sq ft`,
          fr: `Nécessite ${layoutConfig.minSqFt}+ pi²`,
        });
      } else if (spaceAnalysis.sqFt < layoutConfig.minSqFt * 1.2) {
        feasibility = 'tight-fit';
        score -= 10;
        notes.push({
          en: 'Will be a tight fit',
          fr: 'Sera un ajustement serré',
        });
      }
    }

    options.push({
      layout: layoutName,
      score,
      feasibility,
      efficiency: layoutConfig.efficiency,
      maxCooks: layoutConfig.maxCooks,
      bestFor: layoutConfig.bestFor,
      limitations: layoutConfig.limitations,
      notes,
    });
  });

  // Sort by score
  options.sort((a, b) => b.score - a.score);

  return options;
}

/**
 * Generate recommendations
 */
function generateRecommendations(answers, componentScores, scores) {
  const recommendations = [];

  // Layout recommendations
  if (scores.feasibility.layout && !scores.feasibility.layout.feasible) {
    const warnings = scores.feasibility.layout.warnings;
    recommendations.push({
      id: 'layout-reconsider',
      type: 'layout',
      priority: 'essential',
      title: {
        en: 'Reconsider Layout Choice',
        fr: 'Reconsidérer le choix de disposition',
      },
      description: {
        en: `Your desired layout may not fit well. ${warnings[0]?.message || 'Consider alternatives from our recommendations.'}`,
        fr: `Votre disposition souhaitée peut ne pas bien s'adapter. ${warnings[0]?.message || 'Envisagez des alternatives parmi nos recommandations.'}`,
      },
      alternatives: scores.layoutOptions.slice(0, 3).map((o) => o.layout),
    });
  }

  // Size-specific recommendations
  const sizeConfig = SIZE_CATEGORY_SCORES[scores.sizeCategory];
  if (sizeConfig) {
    if (scores.sizeCategory === 'small') {
      recommendations.push({
        id: 'small-space-strategies',
        type: 'design',
        priority: 'recommended',
        title: {
          en: 'Small Space Optimization',
          fr: 'Optimisation des petits espaces',
        },
        description: {
          en: 'Use light colors, reflective surfaces, and multi-function furniture to maximize your compact kitchen.',
          fr: 'Utilisez des couleurs claires, des surfaces réfléchissantes et des meubles multifonctions pour maximiser votre cuisine compacte.',
        },
        strategies: sizeConfig.designStrategies,
      });
    }

    if (scores.sizeCategory === 'very-large') {
      recommendations.push({
        id: 'large-space-zones',
        type: 'design',
        priority: 'recommended',
        title: {
          en: 'Zone Definition Strategy',
          fr: 'Stratégie de définition des zones',
        },
        description: {
          en: 'Define distinct work zones to prevent excessive walking and maintain kitchen efficiency.',
          fr: "Définissez des zones de travail distinctes pour éviter les déplacements excessifs et maintenir l'efficacité de la cuisine.",
        },
        strategies: sizeConfig.designStrategies,
      });
    }
  }

  // Island recommendations
  if (scores.feasibility.island) {
    if (scores.feasibility.island.canFitIsland && answers['island-preference']?.includes('yes')) {
      const islandSize = scores.feasibility.island.recommendedIslandSize;
      if (islandSize) {
        recommendations.push({
          id: 'island-sizing',
          type: 'layout',
          priority: 'recommended',
          title: {
            en: 'Recommended Island Size',
            fr: "Taille d'îlot recommandée",
          },
          description: {
            en: `Based on your space, we recommend an island of approximately ${islandSize.length}' x ${islandSize.width}'.`,
            fr: `En fonction de votre espace, nous recommandons un îlot d'environ ${islandSize.length}' x ${islandSize.width}'.`,
          },
          details: islandSize,
        });
      }
    } else if (
      !scores.feasibility.island.canFitIsland &&
      answers['island-preference']?.includes('yes')
    ) {
      recommendations.push({
        id: 'island-alternative',
        type: 'layout',
        priority: 'essential',
        title: {
          en: 'Island Alternative Needed',
          fr: "Alternative à l'îlot nécessaire",
        },
        description: {
          en: 'Your space may not accommodate a fixed island. Consider a peninsula or mobile cart instead.',
          fr: 'Votre espace peut ne pas accueillir un îlot fixe. Envisagez une péninsule ou un chariot mobile à la place.',
        },
      });
    }
  }

  // Storage recommendations
  if (answers['storage-needs'] === 'maximum') {
    const storageConfig = STORAGE_NEEDS_SCORES.maximum;
    recommendations.push({
      id: 'maximum-storage',
      type: 'storage',
      priority: 'recommended',
      title: {
        en: 'Maximum Storage Solutions',
        fr: 'Solutions de rangement maximum',
      },
      description: {
        en: 'Implement ceiling-height cabinets, a walk-in pantry if space allows, and specialty storage solutions throughout.',
        fr: "Installez des armoires jusqu'au plafond, un garde-manger accessible si l'espace le permet, et des solutions de rangement spécialisées partout.",
      },
      solutions: storageConfig.solutions,
    });
  }

  // Ceiling height recommendations
  if (
    componentScores.ceilingHeight?.height === '10ft+' ||
    componentScores.ceilingHeight?.height === 'variable'
  ) {
    recommendations.push({
      id: 'tall-ceiling-cabinets',
      type: 'cabinet',
      priority: 'optional',
      title: {
        en: 'Tall Ceiling Cabinet Options',
        fr: "Options d'armoires pour plafonds hauts",
      },
      description: {
        en: 'Your tall ceilings allow for stacked uppers, extended cabinets, or decorative display shelving.',
        fr: 'Vos hauts plafonds permettent des armoires superposées, des armoires étendues ou des étagères décoratives.',
      },
      options: componentScores.ceilingHeight.cabinetOptions,
    });
  }

  // Structural constraint recommendations
  if (
    componentScores.structuralConstraints?.constraints?.length > 0 &&
    !componentScores.structuralConstraints.constraints.includes('none')
  ) {
    const hasLoadBearing =
      componentScores.structuralConstraints.constraints.includes('load-bearing-wall');
    const wantsOpen = answers['open-concept'] === 'want-to-open';

    if (hasLoadBearing && wantsOpen) {
      recommendations.push({
        id: 'structural-engineering',
        type: 'infrastructure',
        priority: 'essential',
        title: {
          en: 'Structural Review Required',
          fr: 'Révision structurelle requise',
        },
        description: {
          en: 'Opening up the space with a load-bearing wall will require structural engineering review and likely a support beam.',
          fr: "Ouvrir l'espace avec un mur porteur nécessitera une révision d'ingénierie structurelle et probablement une poutre de support.",
        },
      });
    }
  }

  // Traffic flow recommendations
  if (scores.categories.trafficFlow?.level === 'challenging') {
    recommendations.push({
      id: 'improve-flow',
      type: 'layout',
      priority: 'recommended',
      title: {
        en: 'Improve Traffic Flow',
        fr: 'Améliorer la circulation',
      },
      description: {
        en: 'Consider layout adjustments to improve movement through the kitchen. Ensure 42" minimum clearance in work areas.',
        fr: 'Envisagez des ajustements de disposition pour améliorer la circulation dans la cuisine. Assurez un dégagement minimum de 107 cm dans les zones de travail.',
      },
      concerns: scores.categories.trafficFlow.concerns,
    });
  }

  // Accessibility recommendations
  if (scores.categories.accessibility?.level === 'limited') {
    recommendations.push({
      id: 'accessibility-improvements',
      type: 'accessibility',
      priority: 'optional',
      title: {
        en: 'Accessibility Considerations',
        fr: "Considérations d'accessibilité",
      },
      description: {
        en: 'Consider wider aisles (48"+), pull-out storage, and varied counter heights for improved accessibility.',
        fr: 'Envisagez des allées plus larges (122cm+), des rangements coulissants et des hauteurs de comptoir variées pour une meilleure accessibilité.',
      },
      recommendations: scores.categories.accessibility.recommendations,
    });
  }

  // Window/lighting recommendations
  if (answers['window-placement'] === 'no-windows') {
    recommendations.push({
      id: 'lighting-compensation',
      type: 'lighting',
      priority: 'essential',
      title: {
        en: 'Comprehensive Lighting Plan',
        fr: "Plan d'éclairage complet",
      },
      description: {
        en: 'With no natural light, invest in layered artificial lighting: task lighting under cabinets, ambient ceiling lights, and accent lighting.',
        fr: "Sans lumière naturelle, investissez dans un éclairage artificiel en couches: éclairage de tâche sous les armoires, lumières ambiantes au plafond et éclairage d'accent.",
      },
    });
  }

  return recommendations;
}

module.exports = {
  calculateSectionScore,
  scoreKitchenSize,
  scoreCeilingHeight,
  scoreDesiredLayout,
  scoreIslandPreference,
  scoreStorageNeeds,
  scoreStructuralConstraints,
  scoreOpenConcept,
  scoreWindowPlacement,
  calculateWorkZoneScore,
  calculateTrafficFlowScore,
  calculateAccessibilityScore,
  generateLayoutOptions,
  generateRecommendations,
  determineSpaceLevel,
  SCORE_WEIGHTS,
  SIZE_CATEGORY_SCORES,
  CEILING_HEIGHT_SCORES,
  LAYOUT_CONFIGURATIONS,
  ISLAND_PREFERENCE_SCORES,
  STORAGE_NEEDS_SCORES,
  STRUCTURAL_CONSTRAINT_IMPACTS,
  OPEN_CONCEPT_SCORES,
};
