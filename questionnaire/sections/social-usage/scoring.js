/**
 * Social Usage Section Scoring Module
 *
 * Comprehensive social usage and entertaining analysis with:
 * - Entertainment frequency and style patterns
 * - Guest capacity and seating requirements
 * - Food service and presentation needs
 * - Social flow and interaction optimization
 * - Party type and hosting style identification
 * - Multi-functional space requirements
 */

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/**
 * Score weights for social usage factors (normalized to 1.0)
 */
const SCORE_WEIGHTS = {
  entertainingFrequency: 0.30,
  guestCount: 0.20,
  gatheringType: 0.15,
  seatingNeeds: 0.15,
  servingStyle: 0.10,
  viewImportance: 0.10
};

/**
 * Entertaining frequency configurations
 */
const ENTERTAINING_FREQUENCY_CONFIGURATIONS = {
  'never-rarely': {
    score: 20,
    level: 'minimal',
    frequency: { timesPerYear: { min: 0, max: 2 } },
    description: {
      en: 'Rarely or never entertain guests',
      fr: 'Reçoit rarement ou jamais des invités'
    },
    characteristics: {
      priority: 'personal-use',
      seatingImportance: 'low',
      flowImportance: 'low',
      presentationFocus: 'minimal'
    },
    recommendations: {
      focus: ['efficient-layout', 'personal-comfort', 'daily-functionality'],
      avoid: ['oversized-seating', 'show-kitchen', 'formal-features']
    },
    tags: ['private-kitchen', 'personal-focus', 'efficiency-priority']
  },
  'monthly': {
    score: 50,
    level: 'moderate',
    frequency: { timesPerYear: { min: 6, max: 15 } },
    description: {
      en: 'Entertain monthly or occasionally',
      fr: 'Reçoit mensuellement ou occasionnellement'
    },
    characteristics: {
      priority: 'balanced',
      seatingImportance: 'moderate',
      flowImportance: 'moderate',
      presentationFocus: 'balanced'
    },
    recommendations: {
      focus: ['flexible-seating', 'open-sightlines', 'counter-dining-option'],
      consider: ['peninsula-seating', 'serving-counter', 'beverage-station']
    },
    tags: ['casual-entertaining', 'flexible-space', 'dual-purpose']
  },
  'weekly': {
    score: 75,
    level: 'frequent',
    frequency: { timesPerYear: { min: 25, max: 52 } },
    description: {
      en: 'Entertain weekly or regularly',
      fr: 'Reçoit chaque semaine ou régulièrement'
    },
    characteristics: {
      priority: 'entertaining-focused',
      seatingImportance: 'high',
      flowImportance: 'high',
      presentationFocus: 'important'
    },
    recommendations: {
      focus: ['ample-seating', 'open-layout', 'serving-zones', 'guest-flow'],
      consider: ['island-seating', 'wine-storage', 'multiple-prep-zones', 'guest-bathroom-access']
    },
    tags: ['social-hub', 'entertaining-priority', 'guest-focused']
  },
  'multiple-weekly': {
    score: 100,
    level: 'constant',
    frequency: { timesPerYear: { min: 75, max: 365 } },
    description: {
      en: 'Entertain multiple times per week',
      fr: 'Reçoit plusieurs fois par semaine'
    },
    characteristics: {
      priority: 'entertainment-central',
      seatingImportance: 'critical',
      flowImportance: 'critical',
      presentationFocus: 'essential'
    },
    recommendations: {
      focus: ['restaurant-style-flow', 'commercial-grade-hosting', 'multiple-zones', 'high-capacity'],
      consider: ['dual-islands', 'butler-pantry', 'beverage-center', 'warming-drawer', 'commercial-appliances']
    },
    tags: ['entertainment-central', 'high-traffic', 'professional-hosting', 'social-lifestyle']
  }
};

/**
 * Guest count typical configurations
 */
const GUEST_COUNT_CONFIGURATIONS = {
  '1-4': {
    score: 30,
    capacity: 'intimate',
    range: { min: 1, max: 4 },
    description: {
      en: 'Small, intimate gatherings (1-4 guests)',
      fr: 'Petites réunions intimes (1-4 invités)'
    },
    seatingRequirements: {
      minSeats: 4,
      idealSeats: 6,
      style: 'casual-counter-ok'
    },
    spaceRequirements: {
      minCounterSpace: 'standard',
      circulationSpace: 'standard',
      servingArea: 'minimal'
    },
    recommendations: {
      seating: ['counter-stools-2-3', 'small-bistro-table'],
      layout: ['efficient-compact'],
      features: ['conversational-layout']
    },
    tags: ['intimate-gatherings', 'small-groups', 'casual-hosting']
  },
  '5-8': {
    score: 50,
    capacity: 'standard',
    range: { min: 5, max: 8 },
    description: {
      en: 'Standard gatherings (5-8 guests)',
      fr: 'Réunions standards (5-8 invités)'
    },
    seatingRequirements: {
      minSeats: 6,
      idealSeats: 8,
      style: 'mixed-seating'
    },
    spaceRequirements: {
      minCounterSpace: 'generous',
      circulationSpace: 'open',
      servingArea: 'moderate'
    },
    recommendations: {
      seating: ['island-with-4-stools', 'adjacent-dining-table-6'],
      layout: ['open-concept-preferred'],
      features: ['island-gathering', 'buffet-counter']
    },
    tags: ['family-gatherings', 'dinner-parties', 'standard-entertaining']
  },
  '9-12': {
    score: 70,
    capacity: 'large',
    range: { min: 9, max: 12 },
    description: {
      en: 'Large gatherings (9-12 guests)',
      fr: 'Grandes réunions (9-12 invités)'
    },
    seatingRequirements: {
      minSeats: 8,
      idealSeats: 12,
      style: 'flexible-multiple-zones'
    },
    spaceRequirements: {
      minCounterSpace: 'extensive',
      circulationSpace: 'wide-aisles',
      servingArea: 'dedicated'
    },
    recommendations: {
      seating: ['island-6-stools', 'dining-table-8-10', 'peninsula-option'],
      layout: ['open-floor-plan', 'multiple-gathering-zones'],
      features: ['large-island', 'serving-counter', 'beverage-station', 'secondary-sink']
    },
    tags: ['large-parties', 'extended-family', 'serious-entertaining']
  },
  '12-plus': {
    score: 90,
    capacity: 'very-large',
    range: { min: 12, max: 30 },
    description: {
      en: 'Very large gatherings (12+ guests)',
      fr: 'Très grandes réunions (12+ invités)'
    },
    seatingRequirements: {
      minSeats: 12,
      idealSeats: 16,
      style: 'multiple-zones-required'
    },
    spaceRequirements: {
      minCounterSpace: 'commercial-level',
      circulationSpace: 'restaurant-style',
      servingArea: 'multiple-stations'
    },
    recommendations: {
      seating: ['dual-islands', 'bar-seating-8-plus', 'adjacent-great-room'],
      layout: ['commercial-inspired', 'zone-based-design', 'traffic-flow-priority'],
      features: ['butler-pantry', 'prep-kitchen', 'dual-dishwashers', 'warming-drawers', 'ice-maker', 'wine-fridge']
    },
    tags: ['event-hosting', 'large-scale-entertaining', 'commercial-needs', 'party-central']
  }
};

/**
 * Gathering type configurations
 */
const GATHERING_TYPE_CONFIGURATIONS = {
  'casual-family': {
    score: 40,
    style: 'informal',
    description: {
      en: 'Casual family meals and gatherings',
      fr: 'Repas familiaux décontractés et réunions'
    },
    characteristics: {
      formality: 'low',
      interaction: 'high',
      cookingVisibility: 'preferred',
      cleanupVisibility: 'acceptable'
    },
    recommendations: {
      layout: ['open-kitchen', 'conversational-island'],
      seating: ['casual-counter-seating', 'bar-stools'],
      features: ['durable-surfaces', 'easy-cleanup', 'kid-friendly']
    },
    tags: ['casual', 'family-focused', 'interactive-cooking']
  },
  'dinner-parties': {
    score: 70,
    style: 'semi-formal',
    description: {
      en: 'Dinner parties and hosted meals',
      fr: 'Dîners et repas organisés'
    },
    characteristics: {
      formality: 'moderate-high',
      interaction: 'moderate',
      cookingVisibility: 'controlled',
      cleanupVisibility: 'hidden-preferred'
    },
    recommendations: {
      layout: ['open-with-zones', 'hidden-prep-area'],
      seating: ['formal-dining-option', 'quality-finishes'],
      features: ['serving-counter', 'wine-storage', 'elegant-finishes', 'statement-lighting']
    },
    tags: ['dinner-parties', 'semi-formal', 'presentation-matters']
  },
  'cocktail-parties': {
    score: 80,
    style: 'standing-social',
    description: {
      en: 'Cocktail parties and standing receptions',
      fr: 'Cocktails et réceptions debout'
    },
    characteristics: {
      formality: 'variable',
      interaction: 'very-high',
      cookingVisibility: 'minimal',
      cleanupVisibility: 'must-hide'
    },
    recommendations: {
      layout: ['open-flow', 'perimeter-circulation', 'no-bottlenecks'],
      seating: ['minimal-seating', 'perching-spots'],
      features: ['beverage-station', 'ice-maker', 'wine-fridge', 'serving-surfaces', 'hidden-cleanup-zone']
    },
    tags: ['cocktail-style', 'flow-critical', 'beverage-focused', 'standing-social']
  },
  'buffet-style': {
    score: 65,
    style: 'self-serve',
    description: {
      en: 'Buffet-style gatherings',
      fr: 'Réunions style buffet'
    },
    characteristics: {
      formality: 'low-moderate',
      interaction: 'high',
      cookingVisibility: 'acceptable',
      cleanupVisibility: 'hidden-preferred'
    },
    recommendations: {
      layout: ['linear-serving-flow', 'accessible-island'],
      seating: ['flexible-casual'],
      features: ['long-serving-counter', 'warming-drawer', 'multiple-serving-zones', 'easy-access-storage']
    },
    tags: ['buffet-style', 'self-service', 'casual-flow']
  },
  'cooking-shows': {
    score: 90,
    style: 'interactive-cooking',
    description: {
      en: 'Cooking demonstrations and interactive meal prep',
      fr: 'Démonstrations culinaires et préparation interactive'
    },
    characteristics: {
      formality: 'variable',
      interaction: 'very-high',
      cookingVisibility: 'showcase',
      cleanupVisibility: 'managed'
    },
    recommendations: {
      layout: ['theater-kitchen', 'audience-seating-around-island'],
      seating: ['spectator-seating-6-plus'],
      features: ['show-kitchen-island', 'professional-appliances', 'pot-filler', 'statement-hood', 'excellent-lighting', 'hidden-prep-pantry']
    },
    tags: ['show-kitchen', 'interactive-cooking', 'entertainment-focused', 'cooking-as-entertainment']
  },
  'multi-family': {
    score: 75,
    style: 'collaborative',
    description: {
      en: 'Multi-family gatherings with shared cooking',
      fr: 'Réunions multi-familiales avec cuisine partagée'
    },
    characteristics: {
      formality: 'low',
      interaction: 'very-high',
      cookingVisibility: 'full',
      cleanupVisibility: 'acceptable'
    },
    recommendations: {
      layout: ['multiple-work-zones', 'no-bottlenecks'],
      seating: ['casual-abundant'],
      features: ['multiple-prep-areas', 'dual-sinks', 'ample-counter-space', 'collaborative-design']
    },
    tags: ['multi-cook', 'collaborative', 'high-activity', 'family-central']
  }
};

/**
 * Seating needs configurations
 */
const SEATING_NEEDS_CONFIGURATIONS = {
  'none': {
    score: 20,
    priority: 'not-needed',
    description: {
      en: 'No kitchen seating needed (separate dining)',
      fr: 'Aucun siège de cuisine nécessaire (salle à manger séparée)'
    },
    recommendations: {
      focus: ['maximize-work-space', 'storage-priority'],
      avoid: ['island-overhang', 'breakfast-nook']
    },
    tags: ['no-seating', 'separate-dining', 'work-focused']
  },
  'counter-only': {
    score: 40,
    priority: 'casual',
    minSeats: 2,
    idealSeats: 4,
    description: {
      en: 'Counter/bar seating only',
      fr: 'Seulement sièges au comptoir/bar'
    },
    recommendations: {
      seating: ['island-overhang-12-inches', 'bar-stools-2-4'],
      features: ['comfortable-counter-height', 'foot-rail', 'knee-clearance']
    },
    tags: ['counter-seating', 'casual-dining', 'space-efficient']
  },
  'breakfast-nook': {
    score: 60,
    priority: 'dedicated-casual',
    minSeats: 4,
    idealSeats: 6,
    description: {
      en: 'Breakfast nook or casual dining area',
      fr: 'Coin repas ou zone de repas décontractée'
    },
    recommendations: {
      layout: ['nook-integration', 'natural-light-access'],
      seating: ['banquette-option', 'round-table-preferred'],
      features: ['cozy-seating', 'storage-under-bench', 'window-view']
    },
    tags: ['breakfast-nook', 'family-dining', 'cozy-seating']
  },
  'full-table': {
    score: 80,
    priority: 'formal-casual-mix',
    minSeats: 6,
    idealSeats: 8,
    description: {
      en: 'Full dining table in or adjacent to kitchen',
      fr: 'Table à manger complète dans ou adjacente à la cuisine'
    },
    recommendations: {
      layout: ['open-floor-plan', 'defined-zones'],
      seating: ['table-for-6-8', 'expandable-option'],
      features: ['lighting-over-table', 'rug-definition', 'sideboard-storage']
    },
    tags: ['full-dining', 'formal-option', 'separate-zone']
  },
  'multiple-zones': {
    score: 95,
    priority: 'extensive',
    minSeats: 10,
    idealSeats: 14,
    description: {
      en: 'Multiple seating zones (counter + table + lounge)',
      fr: 'Zones de sièges multiples (comptoir + table + salon)'
    },
    recommendations: {
      layout: ['great-room-concept', 'zone-based-design'],
      seating: ['island-seating-6', 'dining-table-8', 'lounge-seating-4'],
      features: ['varied-seating-heights', 'multiple-gathering-points', 'flexible-furniture']
    },
    tags: ['multiple-zones', 'great-room', 'extensive-seating', 'entertaining-focus']
  }
};

/**
 * Serving style configurations
 */
const SERVING_STYLE_CONFIGURATIONS = {
  'plated': {
    score: 60,
    style: 'formal',
    description: {
      en: 'Plated service (prepare and plate in kitchen)',
      fr: 'Service à l\'assiette (préparer et dresser en cuisine)'
    },
    requirements: {
      counterSpace: 'plating-zone',
      storage: 'dishware-accessible',
      warming: 'helpful'
    },
    recommendations: {
      features: ['plating-counter', 'warming-drawer', 'organized-dish-storage'],
      layout: ['efficient-plating-zone', 'pass-through-option']
    },
    tags: ['plated-service', 'formal-dining', 'kitchen-plating']
  },
  'family-style': {
    score: 50,
    style: 'casual',
    description: {
      en: 'Family-style (serve dishes at table)',
      fr: 'Style familial (servir les plats à table)'
    },
    requirements: {
      counterSpace: 'serving-dish-prep',
      storage: 'large-serving-pieces',
      warming: 'optional'
    },
    recommendations: {
      features: ['hot-pad-storage', 'serving-dish-cabinet', 'easy-table-access'],
      layout: ['efficient-path-to-dining']
    },
    tags: ['family-style', 'casual-serving', 'shared-dishes']
  },
  'buffet': {
    score: 75,
    style: 'self-serve',
    description: {
      en: 'Buffet service (self-serve from counter)',
      fr: 'Service buffet (libre-service au comptoir)'
    },
    requirements: {
      counterSpace: 'extensive-serving-area',
      storage: 'chafing-dishes',
      warming: 'essential'
    },
    recommendations: {
      features: ['long-serving-counter', 'warming-drawers-multiple', 'linear-flow', 'tiered-serving-option'],
      layout: ['buffet-line-design', 'accessible-both-sides']
    },
    tags: ['buffet-service', 'self-serve', 'large-groups', 'flow-important']
  },
  'mixed': {
    score: 85,
    style: 'flexible',
    description: {
      en: 'Mixed service styles depending on occasion',
      fr: 'Styles de service mixtes selon l\'occasion'
    },
    requirements: {
      counterSpace: 'versatile-zones',
      storage: 'varied-serviceware',
      warming: 'recommended'
    },
    recommendations: {
      features: ['flexible-counter-space', 'warming-drawer', 'multiple-serving-options', 'adaptable-layout'],
      layout: ['multi-functional-zones']
    },
    tags: ['flexible-serving', 'multi-purpose', 'adaptable']
  }
};

/**
 * View importance configurations
 */
const VIEW_IMPORTANCE_CONFIGURATIONS = {
  'not-important': {
    score: 30,
    priority: 'low',
    description: {
      en: 'Kitchen view/sightlines not important',
      fr: 'Vue/lignes de vue de la cuisine pas importantes'
    },
    recommendations: {
      layout: ['efficiency-over-openness'],
      avoid: ['sacrificing-storage-for-openness']
    },
    tags: ['enclosed-ok', 'efficiency-priority']
  },
  'somewhat-important': {
    score: 60,
    priority: 'moderate',
    description: {
      en: 'Some visibility to adjacent spaces desired',
      fr: 'Une certaine visibilité vers les espaces adjacents souhaitée'
    },
    recommendations: {
      layout: ['partial-openness', 'pass-through-option'],
      features: ['peninsula-with-openness', 'half-wall-option']
    },
    tags: ['semi-open', 'partial-view', 'balanced']
  },
  'very-important': {
    score: 90,
    priority: 'high',
    description: {
      en: 'Open sightlines to living/dining areas essential',
      fr: 'Lignes de vue ouvertes vers salon/salle à manger essentielles'
    },
    recommendations: {
      layout: ['open-concept', 'no-upper-cabinets-on-island', 'low-visual-barriers'],
      features: ['open-shelving-option', 'glass-cabinets', 'minimal-upper-cabinets']
    },
    tags: ['open-concept', 'sightlines-critical', 'connected-spaces', 'supervision-important']
  }
};

/**
 * Hosting personas based on pattern analysis
 */
const HOSTING_PERSONAS = {
  'non-entertainer': {
    description: {
      en: 'Kitchen is for personal/family use only',
      fr: 'La cuisine est à usage personnel/familial uniquement'
    },
    characteristics: ['private-space', 'efficiency-focused', 'minimal-social-features'],
    priorities: ['work-efficiency', 'personal-comfort', 'storage'],
    recommendations: {
      avoid: ['oversized-islands', 'show-kitchen-features', 'extensive-seating'],
      focus: ['compact-efficient', 'personal-workflow', 'adequate-storage']
    }
  },
  'casual-host': {
    description: {
      en: 'Occasional casual gatherings with friends and family',
      fr: 'Réunions occasionnelles décontractées avec amis et famille'
    },
    characteristics: ['flexible-space', 'informal-entertaining', 'dual-purpose'],
    priorities: ['flexibility', 'casual-seating', 'easy-cleanup'],
    recommendations: {
      focus: ['island-with-seating', 'open-sightlines', 'flexible-layout'],
      features: ['counter-seating-4', 'easy-flow', 'casual-finishes']
    }
  },
  'regular-entertainer': {
    description: {
      en: 'Frequent host who enjoys regular gatherings',
      fr: 'Hôte fréquent qui aime les réunions régulières'
    },
    characteristics: ['social-hub', 'entertaining-priority', 'guest-comfort'],
    priorities: ['guest-flow', 'ample-seating', 'serving-features', 'presentation'],
    recommendations: {
      focus: ['open-layout', 'island-seating-6', 'beverage-station', 'serving-zones'],
      features: ['wine-storage', 'ice-maker', 'warming-drawer', 'multiple-prep-areas']
    }
  },
  'serious-host': {
    description: {
      en: 'Passionate entertainer who hosts large or frequent events',
      fr: 'Hôte passionné qui organise des événements importants ou fréquents'
    },
    characteristics: ['entertainment-central', 'show-kitchen', 'professional-level'],
    priorities: ['capacity', 'professional-flow', 'multiple-zones', 'high-end-presentation'],
    recommendations: {
      focus: ['commercial-inspired-design', 'butler-pantry', 'dual-islands', 'prep-kitchen'],
      features: ['dual-dishwashers', 'warming-drawers', 'beverage-center', 'professional-appliances', 'statement-design']
    }
  },
  'cooking-entertainer': {
    description: {
      en: 'Interactive host who makes cooking part of entertainment',
      fr: 'Hôte interactif qui fait de la cuisine une partie du divertissement'
    },
    characteristics: ['show-cooking', 'interactive-experience', 'performance-kitchen'],
    priorities: ['visibility', 'audience-seating', 'professional-equipment', 'presentation'],
    recommendations: {
      focus: ['theater-kitchen-layout', 'island-with-audience-seating', 'statement-appliances', 'excellent-lighting'],
      features: ['professional-range', 'pot-filler', 'statement-hood', 'prep-pantry-hidden', 'showcase-storage']
    }
  }
};

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Calculate comprehensive social usage section score
 * @param {Object} answers - User answers for social usage questions
 * @returns {Object} Detailed social usage scores and recommendations
 */
function calculateSectionScore(answers) {
  const scores = {
    overall: 0,
    hostingPersona: 'casual-host',
    categories: {},
    recommendations: [],
    tags: new Set(),
    seatingRequirements: {},
    flowRequirements: {},
    featurePriorities: {}
  };

  // Calculate individual component scores
  const componentScores = {
    entertainingFrequency: scoreEntertainingFrequency(answers['entertaining-frequency']),
    guestCount: scoreGuestCount(answers['typical-guest-count']),
    gatheringType: scoreGatheringType(answers['gathering-type']),
    seatingNeeds: scoreSeatingNeeds(answers['seating-needs']),
    servingStyle: scoreServingStyle(answers['serving-style']),
    viewImportance: scoreViewImportance(answers['view-importance'])
  };

  // Calculate weighted overall score
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    if (componentScores[key] !== null) {
      scores.overall += (componentScores[key]?.score || 0) * weight;
      totalWeight += weight;

      if (componentScores[key]?.tags) {
        componentScores[key].tags.forEach(tag => scores.tags.add(tag));
      }
    }
  }

  if (totalWeight > 0) {
    scores.overall = Math.round((scores.overall / totalWeight) * 100) / 100;
  }

  // Identify hosting persona
  scores.hostingPersona = identifyHostingPersona(answers, componentScores);

  // Calculate category scores
  scores.categories = {
    entertainingLevel: {
      score: componentScores.entertainingFrequency?.score || 50,
      level: componentScores.entertainingFrequency?.level || 'moderate',
      frequency: componentScores.entertainingFrequency?.frequency || {}
    },
    guestCapacity: {
      score: componentScores.guestCount?.score || 50,
      capacity: componentScores.guestCount?.capacity || 'standard',
      range: componentScores.guestCount?.range || {}
    },
    socialStyle: {
      score: componentScores.gatheringType?.score || 50,
      style: componentScores.gatheringType?.style || 'informal',
      formality: componentScores.gatheringType?.characteristics?.formality || 'moderate'
    },
    openness: calculateOpennessScore(answers, componentScores),
    hostingCapability: calculateHostingCapability(answers, componentScores)
  };

  // Calculate seating requirements
  scores.seatingRequirements = calculateSeatingRequirements(answers, componentScores);

  // Calculate flow requirements
  scores.flowRequirements = calculateFlowRequirements(answers, componentScores);

  // Calculate feature priorities
  scores.featurePriorities = calculateFeaturePriorities(answers, componentScores, scores.hostingPersona);

  // Generate recommendations
  scores.recommendations = generateRecommendations(answers, componentScores, scores);

  // Convert tags Set to Array
  scores.tags = Array.from(scores.tags);

  return scores;
}

// ============================================================================
// INDIVIDUAL SCORING FUNCTIONS
// ============================================================================

/**
 * Score entertaining frequency
 */
function scoreEntertainingFrequency(value) {
  if (!value) return null;

  const config = ENTERTAINING_FREQUENCY_CONFIGURATIONS[value];
  if (!config) {
    return { score: 50, level: 'moderate', tags: [] };
  }

  return {
    score: config.score,
    level: config.level,
    frequency: config.frequency,
    description: config.description,
    characteristics: config.characteristics,
    recommendations: config.recommendations,
    tags: config.tags
  };
}

/**
 * Score typical guest count
 */
function scoreGuestCount(value) {
  if (!value) return null;

  const config = GUEST_COUNT_CONFIGURATIONS[value];
  if (!config) {
    return { score: 50, capacity: 'standard', tags: [] };
  }

  return {
    score: config.score,
    capacity: config.capacity,
    range: config.range,
    description: config.description,
    seatingRequirements: config.seatingRequirements,
    spaceRequirements: config.spaceRequirements,
    recommendations: config.recommendations,
    tags: config.tags
  };
}

/**
 * Score gathering type
 */
function scoreGatheringType(values) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return { score: 50, style: 'informal', tags: [] };
  }

  const tags = [];
  const styles = [];
  let totalScore = 0;
  const allCharacteristics = [];

  values.forEach(v => {
    const config = GATHERING_TYPE_CONFIGURATIONS[v];
    if (config) {
      totalScore += config.score;
      styles.push(config.style);
      tags.push(...config.tags);
      allCharacteristics.push(config.characteristics);
    }
  });

  const avgScore = values.length > 0 ? totalScore / values.length : 50;

  // Determine dominant style
  const dominantStyle = styles.includes('interactive-cooking') ? 'interactive-cooking' :
                       styles.includes('semi-formal') ? 'semi-formal' :
                       styles.includes('standing-social') ? 'standing-social' :
                       styles[0] || 'informal';

  return {
    score: avgScore,
    style: dominantStyle,
    types: values,
    characteristics: allCharacteristics[0] || {},
    tags
  };
}

/**
 * Score seating needs
 */
function scoreSeatingNeeds(value) {
  if (!value) return null;

  const config = SEATING_NEEDS_CONFIGURATIONS[value];
  if (!config) {
    return { score: 50, priority: 'casual', tags: [] };
  }

  return {
    score: config.score,
    priority: config.priority,
    minSeats: config.minSeats,
    idealSeats: config.idealSeats,
    description: config.description,
    recommendations: config.recommendations,
    tags: config.tags
  };
}

/**
 * Score serving style
 */
function scoreServingStyle(values) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return { score: 50, style: 'casual', tags: [] };
  }

  const tags = [];
  const styles = [];
  let totalScore = 0;
  const allRequirements = [];

  values.forEach(v => {
    const config = SERVING_STYLE_CONFIGURATIONS[v];
    if (config) {
      totalScore += config.score;
      styles.push(config.style);
      tags.push(...config.tags);
      allRequirements.push(config.requirements);
    }
  });

  const avgScore = values.length > 0 ? totalScore / values.length : 50;

  return {
    score: avgScore,
    style: styles.includes('flexible') ? 'flexible' : styles[0] || 'casual',
    styles: values,
    requirements: allRequirements,
    tags
  };
}

/**
 * Score view importance
 */
function scoreViewImportance(value) {
  if (!value) return null;

  const config = VIEW_IMPORTANCE_CONFIGURATIONS[value];
  if (!config) {
    return { score: 60, priority: 'moderate', tags: [] };
  }

  return {
    score: config.score,
    priority: config.priority,
    description: config.description,
    recommendations: config.recommendations,
    tags: config.tags
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Identify hosting persona based on patterns
 */
function identifyHostingPersona(answers, componentScores) {
  const frequency = answers['entertaining-frequency'];
  const guestCount = answers['typical-guest-count'];
  const gatheringTypes = answers['gathering-type'] || [];

  // Non-entertainer
  if (frequency === 'never-rarely') {
    return 'non-entertainer';
  }

  // Cooking entertainer
  if (gatheringTypes.includes('cooking-shows')) {
    return 'cooking-entertainer';
  }

  // Serious host
  if (frequency === 'multiple-weekly' ||
      (frequency === 'weekly' && (guestCount === '12-plus' || guestCount === '9-12'))) {
    return 'serious-host';
  }

  // Regular entertainer
  if (frequency === 'weekly' ||
      (frequency === 'monthly' && guestCount === '9-12')) {
    return 'regular-entertainer';
  }

  // Default to casual host
  return 'casual-host';
}

/**
 * Calculate openness score
 */
function calculateOpennessScore(answers, componentScores) {
  let score = 50;
  const factors = [];

  // View importance impact
  const viewScore = componentScores.viewImportance?.score || 50;
  score += (viewScore - 50) * 0.4;
  factors.push({
    factor: 'view-importance',
    impact: (viewScore - 50) * 0.4,
    priority: componentScores.viewImportance?.priority || 'moderate'
  });

  // Gathering type impact
  const gatheringTypes = answers['gathering-type'] || [];
  if (gatheringTypes.includes('cooking-shows') || gatheringTypes.includes('cocktail-parties')) {
    score += 20;
    factors.push({ factor: 'gathering-type', impact: 20, reason: 'requires-openness' });
  }

  // Seating needs impact
  if (answers['seating-needs'] === 'multiple-zones') {
    score += 15;
    factors.push({ factor: 'seating-needs', impact: 15, reason: 'multiple-zones' });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    level: score >= 75 ? 'very-open' : score >= 50 ? 'moderately-open' : 'enclosed-ok',
    factors,
    recommendation: score >= 75 ? 'open-concept-essential' : score >= 50 ? 'semi-open-preferred' : 'flexibility'
  };
}

/**
 * Calculate hosting capability score
 */
function calculateHostingCapability(answers, componentScores) {
  const frequencyScore = componentScores.entertainingFrequency?.score || 0;
  const capacityScore = componentScores.guestCount?.score || 0;
  const gatheringScore = componentScores.gatheringType?.score || 0;
  const servingScore = componentScores.servingStyle?.score || 0;

  const score = Math.round(
    frequencyScore * 0.35 +
    capacityScore * 0.30 +
    gatheringScore * 0.20 +
    servingScore * 0.15
  );

  let level;
  if (score >= 80) level = { en: 'High-Performance Hosting', fr: 'Réception haute performance' };
  else if (score >= 60) level = { en: 'Capable Hosting', fr: 'Réception capable' };
  else if (score >= 40) level = { en: 'Moderate Hosting', fr: 'Réception modérée' };
  else level = { en: 'Minimal Hosting', fr: 'Réception minimale' };

  return {
    score,
    level,
    needsCommercialFeatures: score >= 80,
    needsProfessionalFlow: score >= 70
  };
}

/**
 * Calculate seating requirements
 */
function calculateSeatingRequirements(answers, componentScores) {
  const guestConfig = componentScores.guestCount;
  const seatingConfig = componentScores.seatingNeeds;

  const minSeats = Math.max(
    guestConfig?.seatingRequirements?.minSeats || 0,
    seatingConfig?.minSeats || 0
  );

  const idealSeats = Math.max(
    guestConfig?.seatingRequirements?.idealSeats || 0,
    seatingConfig?.idealSeats || 0
  );

  return {
    minSeats,
    idealSeats,
    seatingStyle: seatingConfig?.priority || 'casual',
    zones: answers['seating-needs'] === 'multiple-zones' ? ['counter', 'table', 'lounge'] :
           answers['seating-needs'] === 'full-table' ? ['counter', 'table'] :
           answers['seating-needs'] === 'breakfast-nook' ? ['nook'] :
           answers['seating-needs'] === 'counter-only' ? ['counter'] : [],
    recommendations: [
      ...(guestConfig?.recommendations?.seating || []),
      ...(seatingConfig?.recommendations?.seating || [])
    ]
  };
}

/**
 * Calculate flow requirements
 */
function calculateFlowRequirements(answers, componentScores) {
  const frequency = answers['entertaining-frequency'];
  const guestCount = answers['typical-guest-count'];
  const gatheringTypes = answers['gathering-type'] || [];

  let flowPriority = 'standard';
  const requirements = [];

  // High-traffic scenarios
  if (frequency === 'multiple-weekly' || frequency === 'weekly') {
    flowPriority = 'critical';
    requirements.push('wide-aisles-minimum-48-inches');
  }

  // Large guest counts
  if (guestCount === '12-plus' || guestCount === '9-12') {
    flowPriority = 'critical';
    requirements.push('multiple-circulation-paths', 'no-bottlenecks');
  }

  // Cocktail parties
  if (gatheringTypes.includes('cocktail-parties')) {
    flowPriority = 'critical';
    requirements.push('perimeter-circulation', 'standing-room', 'beverage-access');
  }

  // Buffet style
  if (gatheringTypes.includes('buffet-style') || (answers['serving-style'] || []).includes('buffet')) {
    requirements.push('linear-serving-flow', 'dual-access-counter');
  }

  return {
    priority: flowPriority,
    aisleWidth: flowPriority === 'critical' ? '48-60-inches' : '42-48-inches',
    requirements,
    circulation: flowPriority === 'critical' ? 'multiple-paths' : 'standard',
    bottleneckTolerance: flowPriority === 'critical' ? 'none' : 'minimal'
  };
}

/**
 * Calculate feature priorities
 */
function calculateFeaturePriorities(answers, componentScores, hostingPersona) {
  const priorities = {
    high: [],
    medium: [],
    low: []
  };

  // Seating features
  const seating = componentScores.seatingNeeds;
  if (seating && seating.score >= 60) {
    priorities.high.push('island-seating', 'comfortable-stools');
  }
  if (answers['seating-needs'] === 'multiple-zones') {
    priorities.high.push('multiple-seating-zones', 'varied-seating-types');
  }

  // Serving features
  const servingStyles = answers['serving-style'] || [];
  if (servingStyles.includes('buffet')) {
    priorities.high.push('warming-drawer', 'long-serving-counter');
  }
  if (servingStyles.includes('plated')) {
    priorities.medium.push('plating-zone', 'warming-drawer');
  }

  // Beverage features
  const gatheringTypes = answers['gathering-type'] || [];
  if (gatheringTypes.includes('cocktail-parties') || answers['entertaining-frequency'] === 'weekly' || answers['entertaining-frequency'] === 'multiple-weekly') {
    priorities.high.push('beverage-station', 'ice-maker');
    priorities.medium.push('wine-storage');
  }

  // Cooking show features
  if (gatheringTypes.includes('cooking-shows')) {
    priorities.high.push('show-kitchen-island', 'professional-appliances', 'statement-hood');
    priorities.medium.push('pot-filler', 'prep-pantry');
  }

  // View and openness features
  if (componentScores.viewImportance?.score >= 75) {
    priorities.high.push('open-concept-layout', 'minimal-upper-cabinets');
  }

  return priorities;
}

/**
 * Generate comprehensive recommendations
 */
function generateRecommendations(answers, componentScores, scores) {
  const recommendations = [];
  const persona = HOSTING_PERSONAS[scores.hostingPersona];

  // Hosting persona recommendation
  recommendations.push({
    id: 'hosting-persona',
    type: 'social',
    priority: 'essential',
    title: {
      en: 'Hosting Style',
      fr: 'Style de réception'
    },
    description: {
      en: persona?.description.en || 'Your hosting style has been identified.',
      fr: persona?.description.fr || 'Votre style de réception a été identifié.'
    },
    persona: scores.hostingPersona,
    priorities: persona?.priorities || []
  });

  // Seating recommendations
  const seatingReqs = scores.seatingRequirements;
  if (seatingReqs.idealSeats >= 8) {
    recommendations.push({
      id: 'seating-capacity',
      type: 'seating',
      priority: 'essential',
      title: {
        en: 'Seating Capacity',
        fr: 'Capacité d\'assise'
      },
      description: {
        en: `Plan for ${seatingReqs.minSeats}-${seatingReqs.idealSeats} seats across ${seatingReqs.zones.join(', ')} zones.`,
        fr: `Prévoyez ${seatingReqs.minSeats}-${seatingReqs.idealSeats} sièges dans les zones ${seatingReqs.zones.join(', ')}.`
      }
    });
  }

  // Flow recommendations
  const flowReqs = scores.flowRequirements;
  if (flowReqs.priority === 'critical') {
    recommendations.push({
      id: 'traffic-flow',
      type: 'layout',
      priority: 'essential',
      title: {
        en: 'Traffic Flow',
        fr: 'Flux de circulation'
      },
      description: {
        en: `Critical flow requirements: ${flowReqs.aisleWidth} aisles, ${flowReqs.requirements.join(', ')}.`,
        fr: `Exigences de flux critiques: allées de ${flowReqs.aisleWidth}, ${flowReqs.requirements.join(', ')}.`
      }
    });
  }

  // Open concept recommendation
  if (scores.categories.openness.score >= 75) {
    recommendations.push({
      id: 'open-concept',
      type: 'layout',
      priority: 'essential',
      title: {
        en: 'Open Concept Layout',
        fr: 'Disposition à concept ouvert'
      },
      description: {
        en: 'Open sightlines are essential for your entertaining style. Minimize visual barriers between kitchen and living spaces.',
        fr: 'Les lignes de vue ouvertes sont essentielles pour votre style de réception. Minimisez les barrières visuelles entre la cuisine et les espaces de vie.'
      }
    });
  }

  // Feature priorities
  if (scores.featurePriorities.high.length > 0) {
    recommendations.push({
      id: 'priority-features',
      type: 'features',
      priority: 'recommended',
      title: {
        en: 'Priority Features',
        fr: 'Fonctionnalités prioritaires'
      },
      description: {
        en: `Key features for your hosting style: ${scores.featurePriorities.high.join(', ')}.`,
        fr: `Caractéristiques clés pour votre style de réception: ${scores.featurePriorities.high.join(', ')}.`
      },
      features: scores.featurePriorities.high
    });
  }

  // Gathering-specific recommendations
  const gatheringTypes = answers['gathering-type'] || [];
  if (gatheringTypes.includes('buffet-style')) {
    recommendations.push({
      id: 'buffet-setup',
      type: 'serving',
      priority: 'recommended',
      title: {
        en: 'Buffet Service Setup',
        fr: 'Configuration du service buffet'
      },
      description: {
        en: 'Design a linear serving flow with accessible counters on both sides. Include warming drawers for food temperature control.',
        fr: 'Concevez un flux de service linéaire avec des comptoirs accessibles des deux côtés. Incluez des tiroirs chauffants pour le contrôle de la température des aliments.'
      }
    });
  }

  if (gatheringTypes.includes('cooking-shows')) {
    recommendations.push({
      id: 'show-kitchen',
      type: 'layout',
      priority: 'essential',
      title: {
        en: 'Show Kitchen Design',
        fr: 'Conception de cuisine spectacle'
      },
      description: {
        en: 'Create a theater-style kitchen with island seating for audience, professional-grade appliances as focal points, and hidden prep areas for staging.',
        fr: 'Créez une cuisine de style théâtre avec des sièges îlot pour le public, des appareils de qualité professionnelle comme points focaux et des zones de préparation cachées pour la mise en scène.'
      }
    });
  }

  return recommendations;
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
  calculateSectionScore,
  scoreEntertainingFrequency,
  scoreGuestCount,
  scoreGatheringType,
  scoreSeatingNeeds,
  scoreServingStyle,
  scoreViewImportance,
  identifyHostingPersona,
  calculateSeatingRequirements,
  calculateFlowRequirements,
  calculateFeaturePriorities,
  generateRecommendations,

  // Export configurations for external use
  SCORE_WEIGHTS,
  ENTERTAINING_FREQUENCY_CONFIGURATIONS,
  GUEST_COUNT_CONFIGURATIONS,
  GATHERING_TYPE_CONFIGURATIONS,
  SEATING_NEEDS_CONFIGURATIONS,
  SERVING_STYLE_CONFIGURATIONS,
  VIEW_IMPORTANCE_CONFIGURATIONS,
  HOSTING_PERSONAS
};
