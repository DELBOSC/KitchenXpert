/**
 * Spatial Analyzer Module
 *
 * Advanced spatial analysis with work triangle optimization, traffic flow analysis,
 * ergonomic zone planning, and intelligent layout recommendations.
 */

const dimensionCalculator = require('../sections/spatial-constraints/dimension-calculator');

/**
 * Enhanced layout type requirements with detailed metrics
 */
const LAYOUT_REQUIREMENTS = {
  galley: {
    minWidth: 7,
    minLength: 10,
    idealWidth: 10,
    idealLength: 14,
    minSqft: 70,
    workTriangle: 'linear',
    maxCooks: 1,
    trafficFlow: 'through',
    efficiency: 0.90,
    description: {
      en: 'Two parallel work surfaces, highly efficient for single cook',
      fr: 'Deux surfaces de travail parallèles, très efficace pour un seul cuisinier'
    }
  },
  'l-shaped': {
    minWidth: 10,
    minLength: 10,
    idealWidth: 12,
    idealLength: 14,
    minSqft: 100,
    workTriangle: 'corner',
    maxCooks: 2,
    trafficFlow: 'open',
    efficiency: 0.85,
    description: {
      en: 'Work surfaces along two perpendicular walls, versatile and open',
      fr: 'Surfaces de travail le long de deux murs perpendiculaires, polyvalent et ouvert'
    }
  },
  'u-shaped': {
    minWidth: 10,
    minLength: 12,
    idealWidth: 12,
    idealLength: 14,
    minSqft: 120,
    workTriangle: 'distributed',
    maxCooks: 2,
    trafficFlow: 'contained',
    efficiency: 0.88,
    description: {
      en: 'Three walls of cabinetry, maximum storage and work surface',
      fr: 'Trois murs d\'armoires, rangement et surface de travail maximum'
    }
  },
  'g-shaped': {
    minWidth: 12,
    minLength: 14,
    idealWidth: 14,
    idealLength: 16,
    minSqft: 168,
    workTriangle: 'distributed',
    maxCooks: 3,
    trafficFlow: 'contained',
    efficiency: 0.85,
    description: {
      en: 'U-shape with peninsula, ideal for socializing while cooking',
      fr: 'Forme en U avec péninsule, idéal pour socialiser en cuisinant'
    }
  },
  'island': {
    minWidth: 13,
    minLength: 14,
    idealWidth: 16,
    idealLength: 18,
    minSqft: 182,
    workTriangle: 'central',
    maxCooks: 4,
    trafficFlow: 'wrap-around',
    efficiency: 0.82,
    description: {
      en: 'Freestanding work surface, social hub and multi-functional',
      fr: 'Surface de travail autonome, centre social et multifonctionnel'
    }
  },
  'peninsula': {
    minWidth: 11,
    minLength: 13,
    idealWidth: 13,
    idealLength: 15,
    minSqft: 143,
    workTriangle: 'extended',
    maxCooks: 2,
    trafficFlow: 'partial-open',
    efficiency: 0.84,
    description: {
      en: 'Connected island, defines space while maintaining openness',
      fr: 'Îlot connecté, définit l\'espace tout en maintenant l\'ouverture'
    }
  },
  'one-wall': {
    minWidth: 6,
    minLength: 12,
    idealWidth: 8,
    idealLength: 16,
    minSqft: 72,
    workTriangle: 'linear',
    maxCooks: 1,
    trafficFlow: 'fully-open',
    efficiency: 0.75,
    description: {
      en: 'All appliances and work surfaces on single wall, space-efficient',
      fr: 'Tous les appareils et surfaces de travail sur un seul mur, économe en espace'
    }
  }
};

/**
 * Work zone definitions for ergonomic planning
 */
const WORK_ZONES = {
  prep: {
    minWidth: 24, // inches
    idealWidth: 36,
    placement: ['near-sink', 'near-storage'],
    adjacentTo: ['sink', 'refrigerator'],
    awayFrom: ['cooktop'],
    heightRange: { min: 34, max: 38 }
  },
  cooking: {
    minWidth: 30,
    idealWidth: 48,
    placement: ['ventilation-access'],
    adjacentTo: ['prep', 'storage'],
    awayFrom: ['refrigerator'],
    heightRange: { min: 34, max: 36 }
  },
  cleanup: {
    minWidth: 36,
    idealWidth: 48,
    placement: ['plumbing-access', 'window-view'],
    adjacentTo: ['dishwasher', 'trash'],
    awayFrom: ['cooking'],
    heightRange: { min: 34, max: 36 }
  },
  storage: {
    types: ['pantry', 'cabinet', 'drawer'],
    placement: ['accessible', 'near-entry'],
    heightZones: {
      prime: { min: 24, max: 60 },
      secondary: { min: 60, max: 84 },
      tertiary: { min: 0, max: 24 }
    }
  },
  serving: {
    minWidth: 24,
    idealWidth: 36,
    placement: ['near-dining', 'traffic-accessible'],
    adjacentTo: ['cooking', 'storage'],
    features: ['counter-space', 'warming-drawer']
  }
};

/**
 * Clearance requirements (in inches)
 */
const CLEARANCE_REQUIREMENTS = {
  walkway: { min: 36, recommended: 42, ideal: 48 },
  workAisle: { min: 42, recommended: 48, ideal: 54 },
  islandClearance: { min: 42, recommended: 48, ideal: 54 },
  applianceFront: { min: 36, recommended: 42, ideal: 48 },
  cornerCabinet: { min: 18, recommended: 24, ideal: 30 },
  doorSwing: { min: 36, recommended: 42, ideal: 48 }
};

/**
 * Work triangle optimal dimensions
 */
const WORK_TRIANGLE = {
  legMin: 4, // feet
  legMax: 9, // feet
  perimeterMin: 12, // feet
  perimeterMax: 26, // feet
  idealPerimeter: 22, // feet
  efficiency: {
    optimal: { min: 0.85, max: 1.0 },
    good: { min: 0.70, max: 0.85 },
    acceptable: { min: 0.55, max: 0.70 },
    poor: { min: 0, max: 0.55 }
  }
};

/**
 * Analyze spatial constraints from responses with comprehensive metrics
 */
function analyzeSpatial(responses) {
  const spatialAnswers = responses['spatial-constraints'] || {};
  const userAnswers = responses['user-profile'] || {};
  const cookingAnswers = responses['cooking-habits'] || {};

  const analysis = {
    dimensions: extractDimensions(spatialAnswers),
    layoutOptions: [],
    islandOptions: null,
    workTriangle: null,
    workZones: null,
    clearanceAnalysis: null,
    trafficFlow: null,
    ergonomics: null,
    constraints: [],
    opportunities: [],
    recommendations: [],
    score: 0
  };

  // Calculate layout options with detailed scoring
  analysis.layoutOptions = calculateLayoutOptions(analysis.dimensions, spatialAnswers, responses);

  // Calculate island options if applicable
  analysis.islandOptions = calculateIslandOptions(analysis.dimensions, spatialAnswers);

  // Analyze work triangle
  analysis.workTriangle = analyzeWorkTriangle(analysis.dimensions, analysis.layoutOptions[0]);

  // Plan work zones
  analysis.workZones = planWorkZones(analysis.dimensions, spatialAnswers, cookingAnswers);

  // Analyze clearances
  analysis.clearanceAnalysis = analyzeClearances(analysis.dimensions, analysis.layoutOptions[0]);

  // Analyze traffic flow
  analysis.trafficFlow = analyzeTrafficFlow(spatialAnswers, analysis.dimensions);

  // Ergonomic assessment
  analysis.ergonomics = assessErgonomics(userAnswers, spatialAnswers);

  // Identify constraints
  analysis.constraints = identifySpatialConstraints(spatialAnswers, analysis.dimensions, responses);

  // Identify opportunities
  analysis.opportunities = identifySpatialOpportunities(analysis);

  // Calculate overall spatial score
  analysis.score = calculateSpatialScore(analysis);

  // Generate recommendations
  analysis.recommendations = generateSpatialRecommendations(analysis, responses);

  return analysis;
}

/**
 * Extract dimensions from answers with enhanced parsing
 */
function extractDimensions(spatialAnswers) {
  const sizeEstimates = {
    small: { width: 8, length: 10, sqft: 80, category: 'compact' },
    medium: { width: 12, length: 14, sqft: 168, category: 'standard' },
    large: { width: 15, length: 18, sqft: 270, category: 'spacious' },
    'very-large': { width: 20, length: 22, sqft: 440, category: 'expansive' }
  };

  const size = spatialAnswers['kitchen-size'] || 'medium';
  const estimate = sizeEstimates[size] || sizeEstimates.medium;

  // Override with custom dimensions if provided
  if (spatialAnswers['custom-length'] && spatialAnswers['custom-width']) {
    const width = parseFloat(spatialAnswers['custom-width']);
    const length = parseFloat(spatialAnswers['custom-length']);
    const sqft = width * length;

    return {
      width,
      length,
      sqft,
      ceiling: parseFloat(spatialAnswers['ceiling-height']) || 9,
      isCustom: true,
      category: getCategoryFromSqft(sqft),
      aspectRatio: length / width,
      shape: determineShape(width, length),
      perimeter: 2 * (width + length)
    };
  }

  return {
    ...estimate,
    ceiling: parseFloat(spatialAnswers['ceiling-height']) || 9,
    isCustom: false,
    aspectRatio: estimate.length / estimate.width,
    shape: determineShape(estimate.width, estimate.length),
    perimeter: 2 * (estimate.width + estimate.length)
  };
}

/**
 * Get size category from square footage
 */
function getCategoryFromSqft(sqft) {
  if (sqft < 100) return 'compact';
  if (sqft < 200) return 'standard';
  if (sqft < 350) return 'spacious';
  return 'expansive';
}

/**
 * Determine room shape classification
 */
function determineShape(width, length) {
  const ratio = length / width;

  if (ratio > 2.0) return 'narrow-corridor';
  if (ratio > 1.5) return 'rectangular';
  if (ratio > 1.2) return 'slightly-rectangular';
  return 'nearly-square';
}

/**
 * Calculate feasible layout options with comprehensive scoring
 */
function calculateLayoutOptions(dimensions, spatialAnswers, responses) {
  const options = [];
  const preferredLayout = spatialAnswers['layout-preference'];
  const cookingAnswers = responses['cooking-habits'] || {};
  const socialAnswers = responses['social-usage'] || {};

  // Calculate number of cooks needed
  const multiCook = socialAnswers['multi-cook'] === 'yes';
  const cookersNeeded = multiCook ? 2 : 1;

  Object.entries(LAYOUT_REQUIREMENTS).forEach(([layout, requirements]) => {
    const feasibility = assessLayoutFeasibility(dimensions, requirements, layout);
    const functionalFit = assessFunctionalFit(layout, cookingAnswers, socialAnswers, cookersNeeded);

    // Calculate combined score
    const combinedScore = Math.round(
      feasibility.score * 0.6 +
      functionalFit.score * 0.4
    );

    options.push({
      layout,
      feasible: feasibility.feasible,
      score: combinedScore,
      spatialScore: feasibility.score,
      functionalScore: functionalFit.score,
      isPreferred: layout === preferredLayout,
      meetsRequirements: feasibility.meetsRequirements,
      notes: feasibility.notes,
      functionalNotes: functionalFit.notes,
      pros: getLayoutPros(layout),
      cons: getLayoutCons(layout),
      efficiency: requirements.efficiency,
      maxCooks: requirements.maxCooks,
      description: requirements.description
    });
  });

  // Sort by score descending, with preference boost
  options.sort((a, b) => {
    if (a.isPreferred && a.feasible) return -1;
    if (b.isPreferred && b.feasible) return 1;
    return b.score - a.score;
  });

  return options;
}

/**
 * Assess layout feasibility with detailed metrics
 */
function assessLayoutFeasibility(dimensions, requirements, layout) {
  let score = 0;
  const notes = [];
  const meetsRequirements = {
    minWidth: false,
    minLength: false,
    minSqft: false,
    idealWidth: false,
    idealLength: false
  };

  // Check minimum width requirement
  if (dimensions.width >= requirements.minWidth) {
    meetsRequirements.minWidth = true;
    score += 20;
  } else {
    notes.push({
      en: `Needs ${requirements.minWidth}ft width, have ${dimensions.width}ft`,
      fr: `Nécessite ${requirements.minWidth}pi de largeur, vous avez ${dimensions.width}pi`
    });
  }

  // Check minimum length requirement
  if (dimensions.length >= requirements.minLength) {
    meetsRequirements.minLength = true;
    score += 20;
  } else {
    notes.push({
      en: `Needs ${requirements.minLength}ft length, have ${dimensions.length}ft`,
      fr: `Nécessite ${requirements.minLength}pi de longueur, vous avez ${dimensions.length}pi`
    });
  }

  // Check minimum square footage
  if (dimensions.sqft >= requirements.minSqft) {
    meetsRequirements.minSqft = true;
    score += 15;
  }

  // Check if meets minimum requirements
  const feasible = meetsRequirements.minWidth && meetsRequirements.minLength;

  if (!feasible) {
    return {
      feasible: false,
      score: 0,
      meetsRequirements,
      notes: [{
        en: 'Space does not meet minimum requirements for this layout.',
        fr: 'L\'espace ne répond pas aux exigences minimales pour cette disposition.'
      }]
    };
  }

  // Check ideal dimensions
  if (dimensions.width >= requirements.idealWidth) {
    meetsRequirements.idealWidth = true;
    score += 15;
    notes.push({
      en: 'Width allows for comfortable workflow.',
      fr: 'La largeur permet un flux de travail confortable.'
    });
  }

  if (dimensions.length >= requirements.idealLength) {
    meetsRequirements.idealLength = true;
    score += 10;
  }

  // Check ceiling height for upper cabinet options
  if (dimensions.ceiling >= 9) {
    score += 10;
    if (dimensions.ceiling >= 10) {
      notes.push({
        en: 'High ceilings allow for stacked or tall cabinets.',
        fr: 'Les hauts plafonds permettent des armoires empilées ou hautes.'
      });
    }
  }

  // Shape compatibility bonus
  const shapeCompatibility = getShapeCompatibility(dimensions.shape, layout);
  score += shapeCompatibility * 10;

  return {
    feasible: true,
    score: Math.min(100, score),
    meetsRequirements,
    notes
  };
}

/**
 * Get shape compatibility score for layout
 */
function getShapeCompatibility(shape, layout) {
  const compatibility = {
    'narrow-corridor': { galley: 1.0, 'one-wall': 0.9, 'l-shaped': 0.5, 'u-shaped': 0.3 },
    'rectangular': { galley: 0.8, 'l-shaped': 1.0, 'u-shaped': 0.8, peninsula: 0.9 },
    'slightly-rectangular': { 'l-shaped': 0.9, 'u-shaped': 1.0, island: 0.8, peninsula: 0.9 },
    'nearly-square': { 'u-shaped': 0.9, island: 1.0, 'g-shaped': 1.0, peninsula: 0.8 }
  };

  return compatibility[shape]?.[layout] || 0.5;
}

/**
 * Assess functional fit based on cooking and social needs
 */
function assessFunctionalFit(layout, cookingAnswers, socialAnswers, cookersNeeded) {
  let score = 50; // Base score
  const notes = [];
  const requirements = LAYOUT_REQUIREMENTS[layout];

  // Multi-cook capability
  if (cookersNeeded > 1) {
    if (requirements.maxCooks >= cookersNeeded) {
      score += 25;
      notes.push({
        en: `Supports ${requirements.maxCooks} simultaneous cooks`,
        fr: `Supporte ${requirements.maxCooks} cuisiniers simultanés`
      });
    } else {
      score -= 20;
      notes.push({
        en: 'May be cramped for multiple cooks',
        fr: 'Peut être à l\'étroit pour plusieurs cuisiniers'
      });
    }
  }

  // Social/entertaining fit
  const entertaining = socialAnswers['entertaining-frequency'];
  if (entertaining === 'frequently') {
    const socialLayouts = ['island', 'peninsula', 'l-shaped', 'g-shaped'];
    if (socialLayouts.includes(layout)) {
      score += 15;
      notes.push({
        en: 'Good for entertaining and socializing',
        fr: 'Bon pour recevoir et socialiser'
      });
    }
  }

  // Cooking frequency fit
  const cookingFreq = cookingAnswers['cooking-frequency'];
  if (cookingFreq === 'daily-extensive') {
    // Intensive cooking needs efficient layout
    const efficientLayouts = ['galley', 'u-shaped', 'l-shaped'];
    if (efficientLayouts.includes(layout)) {
      score += 10;
    }
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    notes
  };
}

/**
 * Get layout pros
 */
function getLayoutPros(layout) {
  const pros = {
    galley: [
      { en: 'Highly efficient workflow', fr: 'Flux de travail très efficace' },
      { en: 'Works in narrow spaces', fr: 'Fonctionne dans les espaces étroits' },
      { en: 'Cost-effective', fr: 'Économique' },
      { en: 'Easy to achieve work triangle', fr: 'Triangle de travail facile à réaliser' }
    ],
    'l-shaped': [
      { en: 'Natural work triangle', fr: 'Triangle de travail naturel' },
      { en: 'Open to adjacent spaces', fr: 'Ouvert aux espaces adjacents' },
      { en: 'Versatile design options', fr: 'Options de conception polyvalentes' },
      { en: 'Good traffic flow', fr: 'Bonne circulation' }
    ],
    'u-shaped': [
      { en: 'Maximum storage capacity', fr: 'Capacité de rangement maximum' },
      { en: 'Efficient work zones', fr: 'Zones de travail efficaces' },
      { en: 'Supports multiple cooks', fr: 'Supporte plusieurs cuisiniers' },
      { en: 'Everything within reach', fr: 'Tout à portée de main' }
    ],
    'g-shaped': [
      { en: 'Most storage of all layouts', fr: 'Le plus de rangement de toutes les dispositions' },
      { en: 'Peninsula provides seating', fr: 'La péninsule offre des sièges' },
      { en: 'Defines kitchen space', fr: 'Définit l\'espace cuisine' },
      { en: 'Multiple work zones', fr: 'Plusieurs zones de travail' }
    ],
    'island': [
      { en: 'Central prep and social area', fr: 'Zone centrale de préparation et sociale' },
      { en: 'Flexible functionality', fr: 'Fonctionnalité flexible' },
      { en: 'Additional storage below', fr: 'Rangement supplémentaire en dessous' },
      { en: 'Visual focal point', fr: 'Point focal visuel' }
    ],
    'peninsula': [
      { en: 'Island benefits, less space needed', fr: 'Avantages de l\'îlot, moins d\'espace nécessaire' },
      { en: 'Creates casual seating area', fr: 'Crée une zone de sièges décontractée' },
      { en: 'Defines kitchen zone', fr: 'Définit la zone cuisine' },
      { en: 'More support than island', fr: 'Plus de support qu\'un îlot' }
    ],
    'one-wall': [
      { en: 'Maximizes open floor space', fr: 'Maximise l\'espace au sol ouvert' },
      { en: 'Simple, clean design', fr: 'Design simple et épuré' },
      { en: 'Lowest installation cost', fr: 'Coût d\'installation le plus bas' },
      { en: 'Easy maintenance access', fr: 'Accès de maintenance facile' }
    ]
  };

  return pros[layout] || [];
}

/**
 * Get layout cons
 */
function getLayoutCons(layout) {
  const cons = {
    galley: [
      { en: 'Can feel cramped', fr: 'Peut sembler à l\'étroit' },
      { en: 'Limited socializing', fr: 'Socialisation limitée' },
      { en: 'One cook at a time', fr: 'Un seul cuisinier à la fois' },
      { en: 'Through-traffic issues', fr: 'Problèmes de circulation traversante' }
    ],
    'l-shaped': [
      { en: 'Corner cabinet access challenges', fr: 'Défis d\'accès aux armoires d\'angle' },
      { en: 'May need lazy susan', fr: 'Peut nécessiter un plateau tournant' },
      { en: 'Less counter than U-shape', fr: 'Moins de comptoir que le U' }
    ],
    'u-shaped': [
      { en: 'Two corner cabinets to manage', fr: 'Deux armoires d\'angle à gérer' },
      { en: 'Can feel enclosed', fr: 'Peut sembler fermé' },
      { en: 'Higher cabinetry cost', fr: 'Coût d\'armoires plus élevé' },
      { en: 'May feel cramped if small', fr: 'Peut sembler à l\'étroit si petit' }
    ],
    'g-shaped': [
      { en: 'Three corners to navigate', fr: 'Trois angles à naviguer' },
      { en: 'Highest cabinetry cost', fr: 'Coût d\'armoires le plus élevé' },
      { en: 'Can feel closed off', fr: 'Peut sembler isolé' },
      { en: 'Requires largest space', fr: 'Nécessite le plus grand espace' }
    ],
    'island': [
      { en: 'Requires very large space', fr: 'Nécessite un très grand espace' },
      { en: 'Higher installation cost', fr: 'Coût d\'installation plus élevé' },
      { en: 'Traffic flow planning critical', fr: 'Planification de la circulation critique' },
      { en: 'Plumbing/electrical challenges', fr: 'Défis de plomberie/électricité' }
    ],
    'peninsula': [
      { en: 'Blocks some traffic flow', fr: 'Bloque une partie de la circulation' },
      { en: 'Less flexible than island', fr: 'Moins flexible qu\'un îlot' },
      { en: 'One side attached', fr: 'Un côté attaché' }
    ],
    'one-wall': [
      { en: 'Limited counter space', fr: 'Espace de comptoir limité' },
      { en: 'Minimal storage', fr: 'Rangement minimal' },
      { en: 'Poor work triangle', fr: 'Mauvais triangle de travail' },
      { en: 'Not for serious cooks', fr: 'Pas pour les cuisiniers sérieux' }
    ]
  };

  return cons[layout] || [];
}

/**
 * Calculate island options with detailed analysis
 */
function calculateIslandOptions(dimensions, spatialAnswers) {
  const minIslandWidth = 3.5; // feet
  const minIslandLength = 4; // feet
  const minClearance = 3.5; // 42 inches in feet

  // Calculate available island space
  const availableWidth = dimensions.width - (2 * minClearance);
  const availableLength = dimensions.length - (2 * minClearance);

  // Check if island is feasible
  if (availableWidth < minIslandWidth || availableLength < minIslandLength) {
    return {
      feasible: false,
      reason: {
        en: 'Insufficient space for island with proper clearance (42" minimum around island).',
        fr: 'Espace insuffisant pour un îlot avec le dégagement approprié (42" minimum autour de l\'îlot).'
      },
      alternatives: generateIslandAlternatives(dimensions)
    };
  }

  const preference = spatialAnswers['island-preference'];

  // Calculate optimal island dimensions
  const maxIslandWidth = Math.min(availableWidth * 0.5, 5); // Max 5 feet wide
  const maxIslandLength = Math.min(availableLength * 0.6, 10); // Max 10 feet long

  const options = {
    feasible: true,
    optimalDimensions: {
      width: Math.round(maxIslandWidth * 10) / 10,
      length: Math.round(maxIslandLength * 10) / 10,
      area: Math.round(maxIslandWidth * maxIslandLength * 10) / 10
    },
    clearances: {
      around: Math.round((dimensions.width - maxIslandWidth) / 2 * 12), // in inches
      traffic: 'adequate'
    },
    recommended: null,
    seatingCapacity: 0,
    features: [],
    configurations: []
  };

  // Calculate seating capacity (24" per person)
  const seatingLength = (maxIslandLength - 1) * 12; // inches, minus 1ft for corners
  options.seatingCapacity = Math.floor(seatingLength / 24);

  // Determine recommended configuration
  if (preference === 'large-island' && maxIslandWidth >= 4) {
    options.recommended = 'full-feature';
    options.features = [
      { id: 'prep-sink', description: { en: 'Prep sink', fr: 'Évier de préparation' } },
      { id: 'seating', count: options.seatingCapacity, description: { en: `Seating for ${options.seatingCapacity}`, fr: `Places assises pour ${options.seatingCapacity}` } },
      { id: 'storage', description: { en: 'Base cabinet storage', fr: 'Rangement dans les armoires de base' } },
      { id: 'cooktop-optional', description: { en: 'Optional cooktop', fr: 'Plaque de cuisson optionnelle' } },
      { id: 'power-outlets', description: { en: 'Electrical outlets', fr: 'Prises électriques' } }
    ];
    options.configurations.push({
      type: 'cooking-island',
      description: { en: 'Island with cooktop and prep sink', fr: 'Îlot avec plaque de cuisson et évier de préparation' }
    });
    options.configurations.push({
      type: 'prep-island',
      description: { en: 'Prep island with seating overhang', fr: 'Îlot de préparation avec débord pour sièges' }
    });
  } else if (preference === 'small-island' || maxIslandWidth < 4) {
    options.recommended = 'compact';
    options.features = [
      { id: 'prep-surface', description: { en: 'Additional prep surface', fr: 'Surface de préparation supplémentaire' } },
      { id: 'storage', description: { en: 'Under-counter storage', fr: 'Rangement sous le comptoir' } }
    ];
    if (options.seatingCapacity >= 2) {
      options.features.push({ id: 'seating', count: 2, description: { en: 'Seating for 2', fr: 'Places assises pour 2' } });
    }
  } else if (preference === 'cart-mobile') {
    options.recommended = 'mobile';
    options.features = [
      { id: 'flexible', description: { en: 'Moveable work surface', fr: 'Surface de travail mobile' } },
      { id: 'storage', description: { en: 'Rolling storage', fr: 'Rangement roulant' } }
    ];
  }

  // Add waterfall edge option for premium kitchens
  if (maxIslandWidth >= 3.5) {
    options.configurations.push({
      type: 'waterfall',
      description: { en: 'Waterfall edge countertop', fr: 'Comptoir avec bord cascade' }
    });
  }

  return options;
}

/**
 * Generate island alternatives for small spaces
 */
function generateIslandAlternatives(dimensions) {
  const alternatives = [];

  if (dimensions.width >= 8) {
    alternatives.push({
      type: 'peninsula',
      description: { en: 'Peninsula attached to existing counter', fr: 'Péninsule attachée au comptoir existant' }
    });
  }

  alternatives.push({
    type: 'mobile-cart',
    description: { en: 'Mobile kitchen cart', fr: 'Chariot de cuisine mobile' }
  });

  alternatives.push({
    type: 'fold-down',
    description: { en: 'Fold-down prep table', fr: 'Table de préparation pliante' }
  });

  return alternatives;
}

/**
 * Analyze work triangle efficiency
 */
function analyzeWorkTriangle(dimensions, preferredLayout) {
  if (!preferredLayout) {
    return { calculated: false, reason: 'No layout selected' };
  }

  const layout = preferredLayout.layout;
  const layoutReq = LAYOUT_REQUIREMENTS[layout];

  // Estimate work triangle based on layout and dimensions
  const estimates = estimateWorkTriangle(layout, dimensions);

  // Calculate efficiency score
  let efficiencyScore = 100;

  // Check leg lengths
  estimates.legs.forEach(leg => {
    if (leg.length < WORK_TRIANGLE.legMin) {
      efficiencyScore -= 15;
    } else if (leg.length > WORK_TRIANGLE.legMax) {
      efficiencyScore -= 10;
    }
  });

  // Check perimeter
  if (estimates.perimeter < WORK_TRIANGLE.perimeterMin) {
    efficiencyScore -= 20;
  } else if (estimates.perimeter > WORK_TRIANGLE.perimeterMax) {
    efficiencyScore -= 15;
  }

  // Optimal perimeter bonus
  const perimeterDeviation = Math.abs(estimates.perimeter - WORK_TRIANGLE.idealPerimeter);
  if (perimeterDeviation <= 2) {
    efficiencyScore += 10;
  }

  return {
    calculated: true,
    type: layoutReq.workTriangle,
    legs: estimates.legs,
    perimeter: estimates.perimeter,
    efficiencyScore: Math.max(0, Math.min(100, efficiencyScore)),
    rating: getTriangleRating(efficiencyScore),
    recommendations: generateTriangleRecommendations(estimates, efficiencyScore)
  };
}

/**
 * Estimate work triangle dimensions based on layout
 */
function estimateWorkTriangle(layout, dimensions) {
  // Simplified triangle estimation based on layout type
  const triangleEstimates = {
    galley: {
      legs: [
        { from: 'sink', to: 'stove', length: dimensions.length * 0.3 },
        { from: 'stove', to: 'fridge', length: dimensions.width * 0.8 },
        { from: 'fridge', to: 'sink', length: dimensions.length * 0.4 }
      ]
    },
    'l-shaped': {
      legs: [
        { from: 'sink', to: 'stove', length: Math.min(dimensions.width, dimensions.length) * 0.5 },
        { from: 'stove', to: 'fridge', length: dimensions.length * 0.4 },
        { from: 'fridge', to: 'sink', length: dimensions.width * 0.4 }
      ]
    },
    'u-shaped': {
      legs: [
        { from: 'sink', to: 'stove', length: dimensions.width * 0.4 },
        { from: 'stove', to: 'fridge', length: dimensions.length * 0.4 },
        { from: 'fridge', to: 'sink', length: dimensions.width * 0.5 }
      ]
    },
    'island': {
      legs: [
        { from: 'sink', to: 'stove', length: dimensions.width * 0.35 },
        { from: 'stove', to: 'fridge', length: dimensions.length * 0.35 },
        { from: 'fridge', to: 'sink', length: dimensions.width * 0.4 }
      ]
    }
  };

  const estimate = triangleEstimates[layout] || triangleEstimates['l-shaped'];

  return {
    legs: estimate.legs,
    perimeter: estimate.legs.reduce((sum, leg) => sum + leg.length, 0)
  };
}

/**
 * Get triangle efficiency rating
 */
function getTriangleRating(score) {
  if (score >= 85) return { level: 'optimal', description: { en: 'Optimal work triangle', fr: 'Triangle de travail optimal' } };
  if (score >= 70) return { level: 'good', description: { en: 'Good work triangle', fr: 'Bon triangle de travail' } };
  if (score >= 55) return { level: 'acceptable', description: { en: 'Acceptable work triangle', fr: 'Triangle de travail acceptable' } };
  return { level: 'poor', description: { en: 'Work triangle needs improvement', fr: 'Le triangle de travail nécessite des améliorations' } };
}

/**
 * Generate work triangle recommendations
 */
function generateTriangleRecommendations(estimates, score) {
  const recommendations = [];

  if (score < 70) {
    if (estimates.perimeter > WORK_TRIANGLE.perimeterMax) {
      recommendations.push({
        en: 'Consider placing appliances closer together to reduce walking distance',
        fr: 'Envisagez de rapprocher les appareils pour réduire la distance de marche'
      });
    }
    if (estimates.perimeter < WORK_TRIANGLE.perimeterMin) {
      recommendations.push({
        en: 'Increase spacing between work zones to avoid congestion',
        fr: 'Augmentez l\'espacement entre les zones de travail pour éviter la congestion'
      });
    }
  }

  return recommendations;
}

/**
 * Plan work zones based on user needs
 */
function planWorkZones(dimensions, spatialAnswers, cookingAnswers) {
  const zones = [];
  const sqft = dimensions.sqft;

  // Prep zone - always needed
  zones.push({
    id: 'prep',
    name: { en: 'Prep Zone', fr: 'Zone de préparation' },
    size: sqft >= 150 ? 'generous' : 'compact',
    width: sqft >= 150 ? 36 : 24,
    placement: 'between-sink-and-fridge',
    features: ['cutting-board-space', 'knife-storage', 'small-appliance-garage'],
    priority: 'essential'
  });

  // Cooking zone
  const cookingFreq = cookingAnswers['cooking-frequency'];
  zones.push({
    id: 'cooking',
    name: { en: 'Cooking Zone', fr: 'Zone de cuisson' },
    size: cookingFreq === 'daily-extensive' ? 'expanded' : 'standard',
    width: cookingFreq === 'daily-extensive' ? 48 : 36,
    placement: 'ventilation-access',
    features: cookingFreq === 'daily-extensive' ?
      ['wide-range', 'pot-filler', 'heat-resistant-counter'] :
      ['standard-range', 'spoon-rest'],
    priority: 'essential'
  });

  // Cleanup zone
  zones.push({
    id: 'cleanup',
    name: { en: 'Cleanup Zone', fr: 'Zone de nettoyage' },
    size: 'standard',
    width: 48,
    placement: 'window-preferred',
    features: ['main-sink', 'dishwasher', 'trash-recycling'],
    priority: 'essential'
  });

  // Baking zone if needed
  if (cookingAnswers['baking-frequency'] === 'frequently') {
    zones.push({
      id: 'baking',
      name: { en: 'Baking Zone', fr: 'Zone de pâtisserie' },
      size: 'dedicated',
      width: 36,
      placement: 'cool-location',
      features: ['marble-insert', 'stand-mixer-lift', 'baking-supply-storage'],
      priority: 'recommended'
    });
  }

  // Beverage zone for entertainers
  if (sqft >= 200) {
    zones.push({
      id: 'beverage',
      name: { en: 'Beverage Zone', fr: 'Zone boissons' },
      size: 'optional',
      width: 24,
      placement: 'away-from-main-work',
      features: ['coffee-station', 'beverage-fridge', 'wine-storage'],
      priority: 'optional'
    });
  }

  return {
    zones,
    totalZones: zones.length,
    zoneEfficiency: calculateZoneEfficiency(zones, dimensions)
  };
}

/**
 * Calculate zone efficiency
 */
function calculateZoneEfficiency(zones, dimensions) {
  const essentialZones = zones.filter(z => z.priority === 'essential');
  const totalWidth = essentialZones.reduce((sum, z) => sum + z.width, 0) / 12; // Convert to feet

  // Compare needed linear feet to available perimeter
  const availableLinear = dimensions.perimeter * 0.7; // Assume 70% usable

  return {
    neededLinearFt: Math.round(totalWidth * 10) / 10,
    availableLinearFt: Math.round(availableLinear * 10) / 10,
    adequate: totalWidth <= availableLinear,
    utilization: Math.round((totalWidth / availableLinear) * 100)
  };
}

/**
 * Analyze clearances for the selected layout
 */
function analyzeClearances(dimensions, layout) {
  if (!layout) return null;

  const analysis = {
    workAisle: {
      available: dimensions.width >= 10 ? (dimensions.width - 6) * 12 : dimensions.width * 12 * 0.4,
      required: CLEARANCE_REQUIREMENTS.workAisle.min,
      recommended: CLEARANCE_REQUIREMENTS.workAisle.recommended,
      adequate: false
    },
    walkway: {
      available: dimensions.width >= 8 ? 48 : 36,
      required: CLEARANCE_REQUIREMENTS.walkway.min,
      recommended: CLEARANCE_REQUIREMENTS.walkway.recommended,
      adequate: false
    },
    islandClearance: {
      available: 0,
      required: CLEARANCE_REQUIREMENTS.islandClearance.min,
      adequate: false
    }
  };

  // Check work aisle adequacy
  analysis.workAisle.adequate = analysis.workAisle.available >= analysis.workAisle.required;
  analysis.walkway.adequate = analysis.walkway.available >= analysis.walkway.required;

  // Island clearance (if island layout)
  if (layout.layout === 'island') {
    analysis.islandClearance.available = Math.max(0, (dimensions.width - 8) / 2 * 12);
    analysis.islandClearance.adequate = analysis.islandClearance.available >= analysis.islandClearance.required;
  }

  // Overall clearance score
  const scores = [
    analysis.workAisle.adequate ? 1 : 0.5,
    analysis.walkway.adequate ? 1 : 0.5
  ];
  analysis.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100);

  return analysis;
}

/**
 * Analyze traffic flow
 */
function analyzeTrafficFlow(spatialAnswers, dimensions) {
  const doorCount = parseInt(spatialAnswers['door-count'], 10) || 1;

  const analysis = {
    doorCount,
    flowType: doorCount > 2 ? 'through-traffic' : 'destination',
    concerns: [],
    recommendations: []
  };

  // Through-traffic concerns
  if (doorCount >= 3) {
    analysis.concerns.push({
      type: 'high-traffic',
      description: {
        en: 'Multiple entry points create through-traffic patterns',
        fr: 'Plusieurs points d\'entrée créent des schémas de circulation traversante'
      }
    });
    analysis.recommendations.push({
      en: 'Designate primary and secondary traffic paths separate from work triangle',
      fr: 'Désignez des chemins de circulation primaires et secondaires séparés du triangle de travail'
    });
  }

  // Small space with multiple doors
  if (dimensions.sqft < 120 && doorCount >= 2) {
    analysis.concerns.push({
      type: 'congestion-risk',
      description: {
        en: 'Small space with multiple doors may cause congestion',
        fr: 'Petit espace avec plusieurs portes peut causer de la congestion'
      }
    });
  }

  // Flow score
  let flowScore = 100;
  if (doorCount >= 3) flowScore -= 20;
  if (dimensions.sqft < 120 && doorCount >= 2) flowScore -= 15;
  analysis.flowScore = Math.max(0, flowScore);

  return analysis;
}

/**
 * Assess ergonomics based on user needs
 */
function assessErgonomics(userAnswers, spatialAnswers) {
  const assessment = {
    heightConsiderations: [],
    accessibilityNeeds: [],
    recommendations: [],
    score: 100
  };

  // Special needs from user profile
  const specialNeeds = userAnswers['special-needs'] || [];

  if (specialNeeds.includes('wheelchair-access')) {
    assessment.accessibilityNeeds.push({
      type: 'wheelchair',
      requirements: [
        { en: '60" turning radius', fr: 'Rayon de braquage de 60"' },
        { en: '34" max counter height', fr: 'Hauteur de comptoir max 34"' },
        { en: '30" knee clearance under sink', fr: '30" de dégagement pour les genoux sous l\'évier' }
      ]
    });
    assessment.score = Math.min(assessment.score, 70); // May require modifications
  }

  if (specialNeeds.includes('mobility-limited')) {
    assessment.accessibilityNeeds.push({
      type: 'mobility',
      requirements: [
        { en: 'Pull-out shelving', fr: 'Étagères coulissantes' },
        { en: 'D-pull handles', fr: 'Poignées en D' },
        { en: 'Touchless faucets', fr: 'Robinets sans contact' }
      ]
    });
  }

  if (specialNeeds.includes('height-considerations')) {
    assessment.heightConsiderations.push({
      type: 'variable-height',
      requirements: [
        { en: 'Consider adjustable-height work surfaces', fr: 'Envisagez des surfaces de travail à hauteur réglable' },
        { en: 'Step stools with safety rails', fr: 'Marchepieds avec rampes de sécurité' }
      ]
    });
  }

  // High ceiling opportunities
  if (parseFloat(spatialAnswers['ceiling-height']) >= 10) {
    assessment.recommendations.push({
      type: 'storage-optimization',
      description: {
        en: 'High ceilings allow for stacked cabinets or display shelving',
        fr: 'Les hauts plafonds permettent des armoires empilées ou des étagères d\'exposition'
      }
    });
  }

  return assessment;
}

/**
 * Identify spatial constraints
 */
function identifySpatialConstraints(spatialAnswers, dimensions, responses) {
  const constraints = [];

  // Windows constraint
  const windowCount = spatialAnswers['window-count'];
  if (windowCount === 'many' || windowCount === '3+') {
    constraints.push({
      id: 'multiple-windows',
      type: 'window-limitation',
      impact: 'upper-cabinet-reduction',
      severity: 'medium',
      message: {
        en: 'Multiple windows will reduce upper cabinet space. Consider open shelving near windows.',
        fr: 'Plusieurs fenêtres réduiront l\'espace des armoires hautes. Envisagez des étagères ouvertes près des fenêtres.'
      },
      mitigation: {
        en: 'Maximize base cabinet storage and add a pantry cabinet',
        fr: 'Maximisez le rangement dans les armoires de base et ajoutez une armoire garde-manger'
      }
    });
  }

  // Door constraints
  const doorCount = parseInt(spatialAnswers['door-count'], 10) || 1;
  if (doorCount >= 3) {
    constraints.push({
      id: 'multiple-doors',
      type: 'traffic-flow',
      impact: 'layout-limitation',
      severity: 'medium',
      message: {
        en: 'Multiple doors create traffic paths that may interrupt work flow.',
        fr: 'Plusieurs portes créent des chemins de circulation qui peuvent interrompre le flux de travail.'
      },
      mitigation: {
        en: 'Position work triangle away from main traffic paths',
        fr: 'Positionnez le triangle de travail à l\'écart des principaux chemins de circulation'
      }
    });
  }

  // Structural constraints
  const structural = spatialAnswers['structural-elements'] || [];

  if (structural.includes('load-bearing-wall')) {
    constraints.push({
      id: 'load-bearing-wall',
      type: 'structural',
      impact: 'layout-limitation',
      severity: 'high',
      message: {
        en: 'Load-bearing walls limit layout modifications. Opening walls requires engineering.',
        fr: 'Les murs porteurs limitent les modifications de disposition. Ouvrir des murs nécessite de l\'ingénierie.'
      }
    });
  }

  if (structural.includes('plumbing-stack')) {
    constraints.push({
      id: 'plumbing-stack',
      type: 'plumbing',
      impact: 'sink-placement',
      severity: 'medium',
      message: {
        en: 'Plumbing stack location affects sink and dishwasher placement.',
        fr: 'L\'emplacement de la colonne de plomberie affecte le placement de l\'évier et du lave-vaisselle.'
      }
    });
  }

  if (structural.includes('hvac-duct')) {
    constraints.push({
      id: 'hvac-duct',
      type: 'mechanical',
      impact: 'cabinet-height',
      severity: 'low',
      message: {
        en: 'HVAC ducts may limit upper cabinet height or require soffits.',
        fr: 'Les conduits CVC peuvent limiter la hauteur des armoires hautes ou nécessiter des soffites.'
      }
    });
  }

  // Small space constraint
  if (dimensions.sqft < 100) {
    constraints.push({
      id: 'small-space',
      type: 'space-limitation',
      impact: 'layout-options',
      severity: 'high',
      message: {
        en: 'Compact space limits layout options. Focus on efficiency and vertical storage.',
        fr: 'L\'espace compact limite les options de disposition. Concentrez-vous sur l\'efficacité et le rangement vertical.'
      },
      mitigation: {
        en: 'Consider galley or L-shaped layout with maximum vertical storage',
        fr: 'Envisagez une disposition galley ou en L avec un rangement vertical maximum'
      }
    });
  }

  // Awkward shape constraint
  if (dimensions.shape === 'narrow-corridor') {
    constraints.push({
      id: 'narrow-shape',
      type: 'shape-limitation',
      impact: 'layout-options',
      severity: 'medium',
      message: {
        en: 'Narrow corridor shape limits layout to galley or one-wall configurations.',
        fr: 'La forme de couloir étroit limite la disposition aux configurations galley ou un mur.'
      }
    });
  }

  return constraints;
}

/**
 * Identify spatial opportunities
 */
function identifySpatialOpportunities(analysis) {
  const opportunities = [];

  // High ceilings opportunity
  if (analysis.dimensions.ceiling >= 10) {
    opportunities.push({
      id: 'high-ceilings',
      type: 'vertical-expansion',
      impact: 'storage-increase',
      suggestion: {
        en: 'High ceilings allow for 42" upper cabinets or stacked cabinet configuration, adding 25-40% more storage.',
        fr: 'Les hauts plafonds permettent des armoires hautes de 42" ou une configuration empilée, ajoutant 25-40% de rangement supplémentaire.'
      }
    });
  }

  // Large space opportunities
  if (analysis.dimensions.sqft >= 200) {
    opportunities.push({
      id: 'large-space',
      type: 'zone-addition',
      impact: 'functionality-increase',
      suggestion: {
        en: 'Large space allows for multiple work zones, island with seating, and beverage station.',
        fr: 'Le grand espace permet plusieurs zones de travail, un îlot avec sièges et une station de boissons.'
      }
    });
  }

  // Island opportunity
  if (analysis.islandOptions?.feasible) {
    opportunities.push({
      id: 'island-possible',
      type: 'feature-addition',
      impact: 'functionality-increase',
      suggestion: {
        en: `Space supports a ${analysis.islandOptions.optimalDimensions.width}' x ${analysis.islandOptions.optimalDimensions.length}' island with seating for ${analysis.islandOptions.seatingCapacity}.`,
        fr: `L'espace supporte un îlot de ${analysis.islandOptions.optimalDimensions.width}' x ${analysis.islandOptions.optimalDimensions.length}' avec ${analysis.islandOptions.seatingCapacity} places assises.`
      }
    });
  }

  // Near-square shape opportunity
  if (analysis.dimensions.shape === 'nearly-square') {
    opportunities.push({
      id: 'square-layout',
      type: 'layout-flexibility',
      impact: 'design-options',
      suggestion: {
        en: 'Square-ish proportions allow for most layout types including U-shape and island configurations.',
        fr: 'Les proportions quasi-carrées permettent la plupart des types de dispositions, y compris les configurations en U et avec îlot.'
      }
    });
  }

  // Good work triangle opportunity
  if (analysis.workTriangle?.efficiencyScore >= 80) {
    opportunities.push({
      id: 'efficient-triangle',
      type: 'workflow',
      impact: 'efficiency',
      suggestion: {
        en: 'Optimal work triangle dimensions will provide excellent cooking workflow.',
        fr: 'Les dimensions optimales du triangle de travail fourniront un excellent flux de travail de cuisson.'
      }
    });
  }

  return opportunities;
}

/**
 * Calculate overall spatial score
 */
function calculateSpatialScore(analysis) {
  const weights = {
    layoutFeasibility: 0.30,
    workTriangle: 0.20,
    clearances: 0.15,
    trafficFlow: 0.15,
    ergonomics: 0.10,
    constraints: 0.10
  };

  let score = 0;

  // Layout feasibility
  const bestLayout = analysis.layoutOptions[0];
  if (bestLayout?.feasible) {
    score += bestLayout.score * weights.layoutFeasibility;
  }

  // Work triangle
  if (analysis.workTriangle?.efficiencyScore) {
    score += analysis.workTriangle.efficiencyScore * weights.workTriangle;
  }

  // Clearances
  if (analysis.clearanceAnalysis?.overallScore) {
    score += analysis.clearanceAnalysis.overallScore * weights.clearances;
  }

  // Traffic flow
  if (analysis.trafficFlow?.flowScore) {
    score += analysis.trafficFlow.flowScore * weights.trafficFlow;
  }

  // Ergonomics
  if (analysis.ergonomics?.score) {
    score += analysis.ergonomics.score * weights.ergonomics;
  }

  // Constraints penalty
  const constraintPenalty = Math.min(30, analysis.constraints.length * 5);
  score += (100 - constraintPenalty) * weights.constraints;

  return Math.round(score);
}

/**
 * Generate spatial recommendations
 */
function generateSpatialRecommendations(analysis, responses) {
  const recommendations = [];

  // Best layout recommendation
  const bestLayout = analysis.layoutOptions.find(l => l.feasible);
  if (bestLayout) {
    recommendations.push({
      id: 'recommended-layout',
      type: 'layout',
      priority: 'high',
      title: { en: 'Recommended Layout', fr: 'Disposition recommandée' },
      description: bestLayout.description,
      details: {
        en: `${capitalizeFirst(bestLayout.layout)} layout scores ${bestLayout.score}/100 for your space.`,
        fr: `La disposition ${bestLayout.layout} obtient ${bestLayout.score}/100 pour votre espace.`
      },
      layout: bestLayout.layout,
      score: bestLayout.score
    });
  }

  // Island recommendation
  if (analysis.islandOptions?.feasible) {
    recommendations.push({
      id: 'island-option',
      type: 'feature',
      priority: 'medium',
      title: { en: 'Kitchen Island', fr: 'Îlot de cuisine' },
      description: {
        en: `Your space can accommodate a ${analysis.islandOptions.recommended} island configuration.`,
        fr: `Votre espace peut accueillir une configuration d'îlot ${analysis.islandOptions.recommended}.`
      },
      features: analysis.islandOptions.features,
      seating: analysis.islandOptions.seatingCapacity
    });
  } else if (analysis.islandOptions?.alternatives?.length > 0) {
    recommendations.push({
      id: 'island-alternatives',
      type: 'feature',
      priority: 'low',
      title: { en: 'Island Alternatives', fr: 'Alternatives à l\'îlot' },
      description: {
        en: 'Full island not feasible, but alternatives available.',
        fr: 'Îlot complet non réalisable, mais alternatives disponibles.'
      },
      alternatives: analysis.islandOptions.alternatives
    });
  }

  // Work triangle recommendation
  if (analysis.workTriangle?.rating?.level === 'poor' || analysis.workTriangle?.rating?.level === 'acceptable') {
    recommendations.push({
      id: 'improve-triangle',
      type: 'workflow',
      priority: 'high',
      title: { en: 'Optimize Work Triangle', fr: 'Optimiser le triangle de travail' },
      description: {
        en: 'Work triangle efficiency can be improved with strategic appliance placement.',
        fr: 'L\'efficacité du triangle de travail peut être améliorée avec un placement stratégique des appareils.'
      },
      suggestions: analysis.workTriangle.recommendations
    });
  }

  // Address constraints
  analysis.constraints.forEach(constraint => {
    if (constraint.severity === 'high') {
      recommendations.push({
        id: `address-${constraint.id}`,
        type: 'constraint',
        priority: 'high',
        title: { en: 'Address Spatial Constraint', fr: 'Traiter la contrainte spatiale' },
        description: constraint.message,
        mitigation: constraint.mitigation
      });
    }
  });

  // Small space optimization
  if (analysis.dimensions.sqft < 120) {
    recommendations.push({
      id: 'maximize-space',
      type: 'optimization',
      priority: 'high',
      title: { en: 'Maximize Compact Space', fr: 'Maximiser l\'espace compact' },
      description: {
        en: 'Use light colors, reflective surfaces, and vertical storage to maximize the sense of space.',
        fr: 'Utilisez des couleurs claires, des surfaces réfléchissantes et du rangement vertical pour maximiser la sensation d\'espace.'
      },
      strategies: [
        { en: 'Full-height cabinets', fr: 'Armoires pleine hauteur' },
        { en: 'Pull-out organizers', fr: 'Organisateurs coulissants' },
        { en: 'Under-cabinet lighting', fr: 'Éclairage sous les armoires' },
        { en: 'Glass-front upper cabinets', fr: 'Armoires hautes avec façades vitrées' }
      ]
    });
  }

  // Storage optimization opportunity
  if (analysis.dimensions.ceiling >= 10) {
    recommendations.push({
      id: 'vertical-storage',
      type: 'storage',
      priority: 'medium',
      title: { en: 'Maximize Vertical Storage', fr: 'Maximiser le rangement vertical' },
      description: {
        en: 'High ceilings allow for extended upper cabinets or stacked configuration.',
        fr: 'Les hauts plafonds permettent des armoires hautes étendues ou une configuration empilée.'
      }
    });
  }

  return recommendations;
}

/**
 * Calculate work triangle from actual positions (for future use)
 */
function calculateWorkTriangle(sinkPos, stovePos, fridgePos) {
  return dimensionCalculator.calculateWorkTriangle(sinkPos, stovePos, fridgePos);
}

/**
 * Helper: Capitalize first letter
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}

module.exports = {
  analyzeSpatial,
  extractDimensions,
  calculateLayoutOptions,
  calculateIslandOptions,
  analyzeWorkTriangle,
  planWorkZones,
  analyzeClearances,
  analyzeTrafficFlow,
  assessErgonomics,
  identifySpatialConstraints,
  identifySpatialOpportunities,
  calculateSpatialScore,
  generateSpatialRecommendations,
  calculateWorkTriangle,
  LAYOUT_REQUIREMENTS,
  WORK_ZONES,
  CLEARANCE_REQUIREMENTS,
  WORK_TRIANGLE
};
