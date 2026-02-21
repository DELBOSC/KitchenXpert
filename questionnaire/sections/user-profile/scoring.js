/**
 * User Profile Section Scoring Module
 *
 * Advanced user profiling for kitchen design including:
 * - Household composition analysis
 * - Lifestyle pattern identification
 * - User persona classification
 * - Accessibility requirements assessment
 * - Project scope determination
 * - Design priority recommendations
 */

/**
 * Score weights for different profile aspects
 */
const SCORE_WEIGHTS = {
  householdSize: 0.12,
  householdType: 0.18,
  ageGroups: 0.10,
  primaryCook: 0.08,
  cookingSkill: 0.12,
  specialNeeds: 0.20,
  ownershipStatus: 0.10,
  projectTimeline: 0.05,
  projectGoals: 0.05
};

/**
 * Impact multipliers for household sizes
 */
const HOUSEHOLD_SIZE_MULTIPLIERS = {
  '1': {
    storage: 0.6,
    counter: 0.7,
    appliances: 0.5,
    seating: 0.4,
    tags: ['single-occupant', 'compact-needs'],
    designFocus: 'efficiency'
  },
  '2': {
    storage: 0.8,
    counter: 0.8,
    appliances: 0.7,
    seating: 0.6,
    tags: ['couple', 'moderate-needs'],
    designFocus: 'balance'
  },
  '3-4': {
    storage: 1.0,
    counter: 1.0,
    appliances: 1.0,
    seating: 1.0,
    tags: ['family-sized'],
    designFocus: 'functionality'
  },
  '5-6': {
    storage: 1.3,
    counter: 1.15,
    appliances: 1.2,
    seating: 1.2,
    tags: ['large-family', 'extra-storage', 'extra-capacity'],
    designFocus: 'capacity'
  },
  '7+': {
    storage: 1.5,
    counter: 1.3,
    appliances: 1.4,
    seating: 1.5,
    tags: ['very-large-family', 'maximum-capacity', 'commercial-scale'],
    designFocus: 'maximum-capacity'
  }
};

/**
 * Comprehensive lifestyle patterns by household type
 */
const LIFESTYLE_PATTERNS = {
  'single-professional': {
    pattern: 'quick-efficient',
    score: 55,
    priorities: ['time-saving', 'easy-maintenance', 'compact-design', 'modern-aesthetic'],
    cookingFrequency: 'low-moderate',
    entertainingFrequency: 'occasional',
    budgetTendency: 'quality-over-quantity',
    tags: ['busy-lifestyle', 'low-maintenance'],
    designEmphasis: {
      layout: 'efficient-workflow',
      storage: 'organized-minimal',
      appliances: 'compact-quality',
      style: 'contemporary'
    },
    spaceRequirements: {
      counter: 'standard',
      storage: 'moderate',
      seating: 'minimal'
    }
  },
  'couple-no-kids': {
    pattern: 'social-cooking',
    score: 70,
    priorities: ['entertainment', 'quality-appliances', 'aesthetic', 'social-space'],
    cookingFrequency: 'moderate',
    entertainingFrequency: 'regular',
    budgetTendency: 'invest-in-features',
    tags: ['entertainer', 'social-kitchen'],
    designEmphasis: {
      layout: 'open-social',
      storage: 'quality-display',
      appliances: 'mid-to-high-end',
      style: 'flexible'
    },
    spaceRequirements: {
      counter: 'generous',
      storage: 'moderate',
      seating: 'entertaining-capacity'
    }
  },
  'young-family': {
    pattern: 'safety-first',
    score: 80,
    priorities: ['durability', 'easy-clean', 'safety-features', 'storage', 'supervision'],
    cookingFrequency: 'high',
    entertainingFrequency: 'occasional',
    budgetTendency: 'value-focused',
    tags: ['child-safety', 'durable-materials', 'family-focused'],
    designEmphasis: {
      layout: 'open-sightlines',
      storage: 'maximum-organized',
      appliances: 'reliable-safe',
      style: 'practical-warm'
    },
    spaceRequirements: {
      counter: 'generous',
      storage: 'maximum',
      seating: 'family-casual'
    },
    safetyFeatures: ['rounded-corners', 'safety-locks', 'cool-touch-surfaces', 'soft-close']
  },
  'family-teens': {
    pattern: 'high-capacity',
    score: 85,
    priorities: ['multiple-work-zones', 'large-appliances', 'durability', 'snack-access'],
    cookingFrequency: 'very-high',
    entertainingFrequency: 'moderate',
    budgetTendency: 'durability-focused',
    tags: ['high-traffic', 'multiple-users', 'heavy-use'],
    designEmphasis: {
      layout: 'multi-zone',
      storage: 'bulk-organized',
      appliances: 'commercial-grade',
      style: 'durable-modern'
    },
    spaceRequirements: {
      counter: 'extensive',
      storage: 'maximum',
      seating: 'casual-multiple'
    }
  },
  'empty-nesters': {
    pattern: 'quality-focused',
    score: 75,
    priorities: ['quality-upgrade', 'entertainment', 'easy-maintenance', 'ergonomics'],
    cookingFrequency: 'moderate-high',
    entertainingFrequency: 'regular',
    budgetTendency: 'premium-investment',
    tags: ['quality-upgrade', 'entertaining', 'comfort'],
    designEmphasis: {
      layout: 'open-elegant',
      storage: 'quality-accessible',
      appliances: 'premium',
      style: 'elevated-classic'
    },
    spaceRequirements: {
      counter: 'generous',
      storage: 'moderate-accessible',
      seating: 'entertaining'
    }
  },
  'multi-generational': {
    pattern: 'universal-design',
    score: 90,
    priorities: ['accessibility', 'multiple-heights', 'safety', 'ample-space', 'varied-users'],
    cookingFrequency: 'high',
    entertainingFrequency: 'moderate',
    budgetTendency: 'accessibility-investment',
    tags: ['universal-design', 'multi-user', 'accessibility-focused'],
    designEmphasis: {
      layout: 'accessible-open',
      storage: 'varied-heights',
      appliances: 'accessible-controls',
      style: 'timeless-functional'
    },
    spaceRequirements: {
      counter: 'varied-heights',
      storage: 'accessible-all-heights',
      seating: 'flexible'
    },
    accessibilityFeatures: ['wider-aisles', 'pull-out-storage', 'varied-counters', 'lever-handles']
  },
  'retired': {
    pattern: 'comfort-focused',
    score: 80,
    priorities: ['ergonomics', 'quality', 'easy-maintenance', 'good-lighting', 'safety'],
    cookingFrequency: 'moderate-high',
    entertainingFrequency: 'moderate',
    budgetTendency: 'quality-longevity',
    tags: ['ergonomic', 'quality-materials', 'low-maintenance'],
    designEmphasis: {
      layout: 'ergonomic-efficient',
      storage: 'accessible-pull-out',
      appliances: 'easy-controls',
      style: 'classic-warm'
    },
    spaceRequirements: {
      counter: 'comfortable-height',
      storage: 'accessible',
      seating: 'comfortable'
    },
    ergonomicFeatures: ['pull-out-drawers', 'good-lighting', 'easy-grip-hardware', 'non-slip']
  },
  'home-based-business': {
    pattern: 'professional-home',
    score: 85,
    priorities: ['commercial-capacity', 'efficiency', 'durability', 'compliance'],
    cookingFrequency: 'very-high',
    entertainingFrequency: 'low',
    budgetTendency: 'commercial-investment',
    tags: ['commercial-grade', 'high-capacity', 'professional-equipment'],
    designEmphasis: {
      layout: 'commercial-workflow',
      storage: 'commercial-capacity',
      appliances: 'commercial-grade',
      style: 'functional-professional'
    },
    spaceRequirements: {
      counter: 'extensive-commercial',
      storage: 'maximum-commercial',
      seating: 'minimal'
    }
  }
};

/**
 * Age group configurations for design considerations
 */
const AGE_GROUP_CONFIGURATIONS = {
  'infants': {
    score: 15,
    considerations: ['safety-paramount', 'supervision-sightlines', 'high-storage'],
    safetyFeatures: ['cabinet-locks', 'stove-guards', 'drawer-stops', 'corner-protectors'],
    tags: ['baby-proofing', 'safety-critical']
  },
  'toddlers': {
    score: 20,
    considerations: ['safety-critical', 'durable-surfaces', 'easy-clean', 'low-access-control'],
    safetyFeatures: ['cabinet-locks', 'stove-guards', 'soft-close', 'rounded-corners'],
    tags: ['toddler-safe', 'durable-easy-clean']
  },
  'young-children': {
    score: 18,
    considerations: ['homework-space', 'snack-access', 'supervision', 'durability'],
    features: ['kid-height-counter', 'organized-snack-zone', 'durable-finishes'],
    tags: ['kid-friendly', 'activity-space']
  },
  'teenagers': {
    score: 15,
    considerations: ['high-traffic', 'multiple-users', 'snack-access', 'independent-cooking'],
    features: ['multiple-zones', 'large-fridge', 'microwave-access'],
    tags: ['teen-friendly', 'high-capacity']
  },
  'adults': {
    score: 10,
    considerations: ['standard-ergonomics', 'full-functionality'],
    features: [],
    tags: []
  },
  'seniors': {
    score: 20,
    considerations: ['accessibility', 'good-lighting', 'safety', 'easy-controls'],
    accessibilityFeatures: ['pull-out-storage', 'lever-handles', 'task-lighting', 'non-slip'],
    tags: ['senior-friendly', 'accessible']
  }
};

/**
 * Special needs configurations with detailed requirements
 */
const SPECIAL_NEEDS_CONFIGURATIONS = {
  'wheelchair-access': {
    score: 35,
    category: 'mobility',
    requirements: {
      aisleWidth: '60 inches minimum',
      counterHeight: '28-34 inches adjustable',
      sinkType: 'shallow-knee-clearance',
      applianceAccess: 'front-controls-required'
    },
    features: [
      'lowered-counters',
      'knee-clearance-sink',
      'pull-out-work-surfaces',
      'front-control-appliances',
      'accessible-storage',
      'side-opening-appliances'
    ],
    tags: ['ada-compliant', 'wheelchair-accessible', 'lowered-surfaces']
  },
  'mobility-limited': {
    score: 28,
    category: 'mobility',
    requirements: {
      aisleWidth: '48 inches minimum',
      counterHeight: 'standard-with-seating-options',
      reachZone: 'reduced-upper-storage'
    },
    features: [
      'pull-out-storage',
      'drawer-base-cabinets',
      'easy-reach-organization',
      'counter-seating-options',
      'lever-handles'
    ],
    tags: ['easy-reach', 'pull-out-storage', 'accessible']
  },
  'vision-impaired': {
    score: 25,
    category: 'sensory',
    requirements: {
      lighting: 'enhanced-task-lighting',
      controls: 'tactile-or-voice',
      contrast: 'high-contrast-surfaces'
    },
    features: [
      'high-contrast-counters',
      'tactile-controls',
      'voice-control',
      'enhanced-lighting',
      'audible-appliances',
      'consistent-layout'
    ],
    tags: ['high-contrast', 'tactile-controls', 'voice-control', 'enhanced-lighting']
  },
  'hearing-impaired': {
    score: 15,
    category: 'sensory',
    requirements: {
      alerts: 'visual-indicators',
      timers: 'visual-display'
    },
    features: [
      'visual-timer-displays',
      'led-status-indicators',
      'smart-notifications',
      'clear-sightlines'
    ],
    tags: ['visual-alerts', 'smart-notifications']
  },
  'height-considerations': {
    score: 20,
    category: 'ergonomic',
    requirements: {
      counterHeight: 'custom-height-required',
      reachZone: 'adjusted-storage-heights'
    },
    features: [
      'adjustable-height-surfaces',
      'multi-level-counters',
      'accessible-upper-storage',
      'step-stool-storage'
    ],
    tags: ['adjustable-height', 'multi-level', 'custom-ergonomics']
  },
  'child-safety': {
    score: 22,
    category: 'safety',
    requirements: {
      locking: 'cabinet-and-appliance-locks',
      surfaces: 'rounded-and-cool-touch',
      placement: 'hazards-out-of-reach'
    },
    features: [
      'safety-locks',
      'rounded-corners',
      'cool-touch-surfaces',
      'induction-cooktop',
      'soft-close-all',
      'anti-tip-brackets'
    ],
    tags: ['safety-locks', 'rounded-corners', 'cool-touch', 'child-proof']
  },
  'cognitive-considerations': {
    score: 18,
    category: 'cognitive',
    requirements: {
      organization: 'clear-logical-layout',
      controls: 'simple-intuitive',
      labeling: 'clear-consistent'
    },
    features: [
      'logical-organization',
      'simple-controls',
      'labeled-storage',
      'consistent-placement',
      'safety-shutoffs'
    ],
    tags: ['intuitive-design', 'simplified-controls', 'organized-layout']
  },
  'allergies-sensitivities': {
    score: 15,
    category: 'health',
    requirements: {
      surfaces: 'non-porous-easy-clean',
      ventilation: 'enhanced-air-quality',
      materials: 'hypoallergenic'
    },
    features: [
      'non-porous-counters',
      'enhanced-ventilation',
      'air-filtration',
      'easy-clean-surfaces',
      'sealed-storage'
    ],
    tags: ['hypoallergenic', 'easy-clean', 'air-quality']
  }
};

/**
 * Ownership status configurations
 */
const OWNERSHIP_CONFIGURATIONS = {
  'owner-primary': {
    score: 100,
    renovationScope: 'full',
    permanentChanges: true,
    structuralChanges: true,
    budgetApproach: 'investment-minded',
    tags: ['full-renovation', 'structural-ok', 'permanent-investment'],
    considerations: ['resale-value', 'long-term-quality', 'personal-preference']
  },
  'owner-investment': {
    score: 85,
    renovationScope: 'full',
    permanentChanges: true,
    structuralChanges: true,
    budgetApproach: 'roi-focused',
    tags: ['investment-property', 'roi-focus', 'market-appeal'],
    considerations: ['rental-durability', 'neutral-appeal', 'cost-effective']
  },
  'owner-vacation': {
    score: 75,
    renovationScope: 'moderate-full',
    permanentChanges: true,
    structuralChanges: false,
    budgetApproach: 'balanced',
    tags: ['vacation-home', 'durability-focus'],
    considerations: ['low-maintenance', 'rental-friendly', 'durability']
  },
  'renter-allowed': {
    score: 55,
    renovationScope: 'moderate',
    permanentChanges: false,
    structuralChanges: false,
    budgetApproach: 'portability-minded',
    tags: ['limited-renovation', 'reversible-preferred', 'portable-solutions'],
    considerations: ['landlord-approval', 'removable-upgrades', 'deposit-protection']
  },
  'renter-limited': {
    score: 30,
    renovationScope: 'minimal',
    permanentChanges: false,
    structuralChanges: false,
    budgetApproach: 'minimal-portable',
    tags: ['no-structural', 'portable-solutions', 'temporary'],
    considerations: ['zero-modification', 'portable-only', 'deposit-safe']
  }
};

/**
 * Project timeline configurations
 */
const TIMELINE_CONFIGURATIONS = {
  'immediately': {
    score: 100,
    urgency: 'critical',
    approachType: 'fast-track',
    tags: ['priority', 'in-stock', 'quick-ship'],
    considerations: ['stock-availability', 'quick-contractors', 'simplified-scope'],
    constraints: ['limited-customization', 'stock-only-options']
  },
  '1-3-months': {
    score: 85,
    urgency: 'high',
    approachType: 'accelerated',
    tags: ['near-term', 'semi-custom-ok'],
    considerations: ['lead-times', 'contractor-scheduling', 'design-efficiency']
  },
  '3-6-months': {
    score: 70,
    urgency: 'medium',
    approachType: 'standard',
    tags: ['standard-timeline'],
    considerations: ['full-design-process', 'custom-options', 'competitive-bidding']
  },
  '6-12-months': {
    score: 50,
    urgency: 'low',
    approachType: 'comprehensive',
    tags: ['planning-phase', 'full-custom'],
    considerations: ['thorough-planning', 'custom-fabrication', 'optimal-timing']
  },
  '12-plus-months': {
    score: 35,
    urgency: 'minimal',
    approachType: 'dream-planning',
    tags: ['long-term', 'aspirational'],
    considerations: ['market-research', 'trend-watching', 'budget-building']
  },
  'just-exploring': {
    score: 20,
    urgency: 'none',
    approachType: 'research',
    tags: ['research-mode', 'inspiration-gathering'],
    considerations: ['education-focus', 'budget-estimation', 'style-discovery']
  }
};

/**
 * Project goal configurations
 */
const PROJECT_GOAL_CONFIGURATIONS = {
  'full-renovation': {
    score: 100,
    scope: 'comprehensive',
    budgetImpact: 'high',
    timeline: 'extended',
    tags: ['full-reno', 'complete-transformation']
  },
  'major-update': {
    score: 80,
    scope: 'significant',
    budgetImpact: 'medium-high',
    timeline: 'moderate',
    tags: ['major-update', 'significant-changes']
  },
  'cabinet-refresh': {
    score: 60,
    scope: 'focused',
    budgetImpact: 'medium',
    timeline: 'moderate',
    tags: ['cabinet-focused', 'refresh']
  },
  'appliance-upgrade': {
    score: 50,
    scope: 'targeted',
    budgetImpact: 'medium',
    timeline: 'short',
    tags: ['appliance-focused', 'equipment-upgrade']
  },
  'cosmetic-update': {
    score: 40,
    scope: 'surface',
    budgetImpact: 'low-medium',
    timeline: 'short',
    tags: ['cosmetic', 'surface-refresh']
  },
  'organization-only': {
    score: 25,
    scope: 'minimal',
    budgetImpact: 'low',
    timeline: 'immediate',
    tags: ['organization', 'accessories-only']
  }
};

/**
 * User persona definitions
 */
const USER_PERSONAS = {
  'efficiency-seeker': {
    characteristics: ['time-constrained', 'practical-focused', 'low-maintenance'],
    priorities: ['easy-maintenance', 'time-saving', 'organized'],
    budgetApproach: 'value-focused',
    stylePreference: 'contemporary-minimal'
  },
  'home-entertainer': {
    characteristics: ['social', 'hosting-focused', 'presentation-minded'],
    priorities: ['open-layout', 'entertaining-features', 'aesthetic'],
    budgetApproach: 'feature-investment',
    stylePreference: 'flexible-elevated'
  },
  'serious-cook': {
    characteristics: ['cooking-passionate', 'equipment-focused', 'technique-oriented'],
    priorities: ['professional-equipment', 'workspace', 'quality-materials'],
    budgetApproach: 'equipment-focused',
    stylePreference: 'functional-quality'
  },
  'family-manager': {
    characteristics: ['organized', 'multi-tasking', 'practical'],
    priorities: ['durability', 'storage', 'easy-clean', 'safety'],
    budgetApproach: 'durability-focused',
    stylePreference: 'warm-practical'
  },
  'design-enthusiast': {
    characteristics: ['aesthetic-driven', 'trend-aware', 'detail-oriented'],
    priorities: ['style', 'quality-materials', 'unique-features'],
    budgetApproach: 'design-investment',
    stylePreference: 'curated-distinctive'
  },
  'accessibility-focused': {
    characteristics: ['comfort-priority', 'safety-conscious', 'ergonomic-needs'],
    priorities: ['accessibility', 'safety', 'easy-use'],
    budgetApproach: 'accessibility-investment',
    stylePreference: 'functional-accessible'
  },
  'budget-conscious': {
    characteristics: ['value-seeker', 'practical', 'diy-inclined'],
    priorities: ['value', 'durability', 'essentials-first'],
    budgetApproach: 'maximize-value',
    stylePreference: 'classic-versatile'
  },
  'eco-conscious': {
    characteristics: ['sustainability-minded', 'health-focused', 'quality-over-quantity'],
    priorities: ['sustainable-materials', 'energy-efficiency', 'healthy-environment'],
    budgetApproach: 'sustainable-investment',
    stylePreference: 'natural-organic'
  }
};

/**
 * Calculate overall section score
 */
function calculateSectionScore(answers) {
  const scores = {
    overall: 0,
    userPersona: null,
    categories: {},
    recommendations: [],
    tags: new Set(),
    designPriorities: [],
    spaceMultipliers: {},
    accessibilityRequirements: [],
    safetyRequirements: [],
    projectScope: {}
  };

  // Calculate individual component scores
  const componentScores = {
    householdSize: scoreHouseholdSize(answers['household-size']),
    householdType: scoreHouseholdType(answers['household-type']),
    ageGroups: scoreAgeGroups(answers['age-groups']),
    primaryCook: scorePrimaryCook(answers['primary-cook']),
    cookingSkill: scoreCookingSkill(answers['cooking-skill-level']),
    specialNeeds: scoreSpecialNeeds(answers['special-needs']),
    ownershipStatus: scoreOwnershipStatus(answers['ownership-status']),
    projectTimeline: scoreProjectTimeline(answers['project-timeline']),
    projectGoals: scoreProjectGoals(answers['project-goals'])
  };

  // Calculate weighted overall score
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    if (componentScores[key] !== null && componentScores[key] !== undefined) {
      scores.overall += (componentScores[key].score || 0) * weight;
      totalWeight += weight;

      // Collect tags
      if (componentScores[key].tags) {
        componentScores[key].tags.forEach(tag => scores.tags.add(tag));
      }

      // Collect accessibility requirements
      if (componentScores[key].accessibilityFeatures) {
        scores.accessibilityRequirements.push(...componentScores[key].accessibilityFeatures);
      }

      // Collect safety requirements
      if (componentScores[key].safetyFeatures) {
        scores.safetyRequirements.push(...componentScores[key].safetyFeatures);
      }
    }
  }

  // Normalize overall score
  if (totalWeight > 0) {
    scores.overall = Math.round((scores.overall / totalWeight) * 100) / 100;
  }

  // Determine user persona
  scores.userPersona = identifyUserPersona(answers, componentScores);

  // Calculate space multipliers
  scores.spaceMultipliers = calculateSpaceMultipliers(answers, componentScores);

  // Calculate category scores
  scores.categories = calculateCategoryScores(answers, componentScores);

  // Calculate design priorities
  scores.designPriorities = calculateDesignPriorities(answers, componentScores);

  // Calculate project scope
  scores.projectScope = calculateProjectScope(answers, componentScores);

  // Generate recommendations
  scores.recommendations = generateRecommendations(answers, componentScores, scores);

  // Convert tags Set to Array and deduplicate other arrays
  scores.tags = Array.from(scores.tags);
  scores.accessibilityRequirements = [...new Set(scores.accessibilityRequirements)];
  scores.safetyRequirements = [...new Set(scores.safetyRequirements)];

  return scores;
}

/**
 * Score household size
 */
function scoreHouseholdSize(value) {
  if (!value) return null;

  // Map various size inputs to standard categories
  let sizeKey = value;
  if (value === '5+' || value === '5-6' || value === '6') sizeKey = '5-6';
  if (value === '7+' || parseInt(value) >= 7) sizeKey = '7+';

  const config = HOUSEHOLD_SIZE_MULTIPLIERS[sizeKey] || HOUSEHOLD_SIZE_MULTIPLIERS['3-4'];

  return {
    score: {
      '1': 30,
      '2': 50,
      '3-4': 70,
      '5-6': 90,
      '7+': 100
    }[sizeKey] || 70,
    size: value,
    multipliers: {
      storage: config.storage,
      counter: config.counter,
      appliances: config.appliances,
      seating: config.seating
    },
    designFocus: config.designFocus,
    tags: [...config.tags]
  };
}

/**
 * Score household type
 */
function scoreHouseholdType(value) {
  if (!value) return null;

  const config = LIFESTYLE_PATTERNS[value];
  if (!config) {
    return { score: 50, pattern: 'standard', priorities: [], tags: [] };
  }

  return {
    score: config.score,
    pattern: config.pattern,
    priorities: config.priorities,
    cookingFrequency: config.cookingFrequency,
    entertainingFrequency: config.entertainingFrequency,
    budgetTendency: config.budgetTendency,
    designEmphasis: config.designEmphasis,
    spaceRequirements: config.spaceRequirements,
    tags: [...config.tags],
    safetyFeatures: config.safetyFeatures || [],
    accessibilityFeatures: config.accessibilityFeatures || [],
    ergonomicFeatures: config.ergonomicFeatures || []
  };
}

/**
 * Score age groups present in household
 */
function scoreAgeGroups(values) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return { score: 50, groups: [], tags: [], features: [] };
  }

  let totalScore = 0;
  const allTags = [];
  const allFeatures = [];
  const safetyFeatures = [];
  const accessibilityFeatures = [];

  values.forEach(group => {
    const config = AGE_GROUP_CONFIGURATIONS[group];
    if (config) {
      totalScore += config.score;
      allTags.push(...(config.tags || []));
      allFeatures.push(...(config.features || []));
      if (config.safetyFeatures) {
        safetyFeatures.push(...config.safetyFeatures);
      }
      if (config.accessibilityFeatures) {
        accessibilityFeatures.push(...config.accessibilityFeatures);
      }
    }
  });

  return {
    score: Math.min(100, totalScore),
    groups: values,
    tags: [...new Set(allTags)],
    features: [...new Set(allFeatures)],
    safetyFeatures: [...new Set(safetyFeatures)],
    accessibilityFeatures: [...new Set(accessibilityFeatures)],
    hasVulnerableAges: values.some(g => ['infants', 'toddlers', 'seniors'].includes(g))
  };
}

/**
 * Score primary cook configuration
 */
function scorePrimaryCook(value) {
  if (!value) return null;

  const configs = {
    'one-person': {
      score: 50,
      workflow: 'single',
      zones: 1,
      tags: ['single-cook'],
      layoutImplication: 'efficient-triangle'
    },
    'shared-equally': {
      score: 75,
      workflow: 'dual',
      zones: 2,
      tags: ['dual-cooks', 'collaboration'],
      layoutImplication: 'two-zone-workflow'
    },
    'rotating': {
      score: 70,
      workflow: 'varied',
      zones: 1,
      tags: ['varied-users', 'intuitive-layout'],
      layoutImplication: 'intuitive-standard'
    },
    'everyone-cooks': {
      score: 100,
      workflow: 'multi',
      zones: 3,
      tags: ['multiple-cooks', 'high-capacity'],
      layoutImplication: 'multi-zone-workflow'
    },
    'rarely-cook': {
      score: 25,
      workflow: 'minimal',
      zones: 1,
      tags: ['minimal-cooking', 'simple-needs'],
      layoutImplication: 'simplified'
    }
  };

  const config = configs[value] || configs['one-person'];

  return {
    score: config.score,
    workflow: config.workflow,
    zones: config.zones,
    tags: [...config.tags],
    layoutImplication: config.layoutImplication
  };
}

/**
 * Score cooking skill level
 */
function scoreCookingSkill(value) {
  if (value === undefined || value === null) return null;

  const level = parseInt(value, 10);
  const levels = ['beginner', 'basic', 'intermediate', 'advanced', 'professional'];

  const configs = {
    1: { equipmentTier: 'basic', features: ['simple-controls', 'basic-appliances'], budgetImpact: 'low' },
    2: { equipmentTier: 'consumer', features: ['standard-appliances'], budgetImpact: 'low-medium' },
    3: { equipmentTier: 'prosumer', features: ['quality-appliances', 'adequate-workspace'], budgetImpact: 'medium' },
    4: { equipmentTier: 'advanced', features: ['advanced-equipment', 'extensive-workspace', 'specialty-storage'], budgetImpact: 'medium-high' },
    5: { equipmentTier: 'professional', features: ['professional-grade', 'commercial-ventilation', 'multiple-zones'], budgetImpact: 'high' }
  };

  const config = configs[level] || configs[3];

  return {
    score: level * 20,
    level: levels[level - 1] || 'intermediate',
    equipmentTier: config.equipmentTier,
    features: config.features,
    budgetImpact: config.budgetImpact,
    tags: level >= 4 ? ['advanced-equipment', 'professional-grade'] : level <= 2 ? ['simple-equipment'] : []
  };
}

/**
 * Score special needs
 */
function scoreSpecialNeeds(values) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return { score: 0, needs: [], tags: [], requirements: [] };
  }

  if (values.includes('none')) {
    return { score: 0, needs: [], tags: [], requirements: [] };
  }

  let totalScore = 0;
  const allTags = [];
  const allFeatures = [];
  const requirements = [];

  values.forEach(need => {
    const config = SPECIAL_NEEDS_CONFIGURATIONS[need];
    if (config) {
      totalScore += config.score;
      allTags.push(...config.tags);
      allFeatures.push(...config.features);
      requirements.push({
        need,
        category: config.category,
        requirements: config.requirements
      });
    }
  });

  const hasMobilityNeeds = values.some(n => ['wheelchair-access', 'mobility-limited'].includes(n));
  const hasSafetyNeeds = values.includes('child-safety');
  const hasSensoryNeeds = values.some(n => ['vision-impaired', 'hearing-impaired'].includes(n));

  return {
    score: Math.min(100, totalScore),
    needs: values,
    tags: [...new Set(allTags)],
    accessibilityFeatures: [...new Set(allFeatures)],
    requirements,
    accessibilityRequired: hasMobilityNeeds,
    safetyRequired: hasSafetyNeeds,
    sensoryAccommodations: hasSensoryNeeds,
    categories: {
      mobility: hasMobilityNeeds,
      sensory: hasSensoryNeeds,
      safety: hasSafetyNeeds,
      cognitive: values.includes('cognitive-considerations'),
      health: values.includes('allergies-sensitivities')
    }
  };
}

/**
 * Score ownership status
 */
function scoreOwnershipStatus(value) {
  if (!value) return null;

  const config = OWNERSHIP_CONFIGURATIONS[value] || OWNERSHIP_CONFIGURATIONS['owner-primary'];

  return {
    score: config.score,
    status: value,
    renovationScope: config.renovationScope,
    permanentChanges: config.permanentChanges,
    structuralChanges: config.structuralChanges,
    budgetApproach: config.budgetApproach,
    tags: [...config.tags],
    considerations: config.considerations
  };
}

/**
 * Score project timeline
 */
function scoreProjectTimeline(value) {
  if (!value) return null;

  const config = TIMELINE_CONFIGURATIONS[value] || TIMELINE_CONFIGURATIONS['3-6-months'];

  return {
    score: config.score,
    timeline: value,
    urgency: config.urgency,
    approachType: config.approachType,
    tags: [...config.tags],
    considerations: config.considerations,
    constraints: config.constraints || []
  };
}

/**
 * Score project goals
 */
function scoreProjectGoals(values) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return { score: 50, goals: [], tags: [] };
  }

  // Find the most comprehensive goal
  let maxScore = 0;
  let primaryGoal = null;
  const allTags = [];

  values.forEach(goal => {
    const config = PROJECT_GOAL_CONFIGURATIONS[goal];
    if (config) {
      if (config.score > maxScore) {
        maxScore = config.score;
        primaryGoal = goal;
      }
      allTags.push(...config.tags);
    }
  });

  const primaryConfig = PROJECT_GOAL_CONFIGURATIONS[primaryGoal] || {};

  return {
    score: maxScore,
    goals: values,
    primaryGoal,
    scope: primaryConfig.scope || 'moderate',
    budgetImpact: primaryConfig.budgetImpact || 'medium',
    timeline: primaryConfig.timeline || 'moderate',
    tags: [...new Set(allTags)]
  };
}

/**
 * Identify user persona
 */
function identifyUserPersona(answers, componentScores) {
  const indicators = {};
  Object.keys(USER_PERSONAS).forEach(p => indicators[p] = 0);

  // Household type influences
  const householdType = answers['household-type'];
  if (householdType === 'single-professional') indicators['efficiency-seeker'] += 3;
  if (householdType === 'couple-no-kids') indicators['home-entertainer'] += 2;
  if (householdType === 'empty-nesters') indicators['home-entertainer'] += 2;
  if (['young-family', 'family-teens'].includes(householdType)) indicators['family-manager'] += 3;
  if (householdType === 'multi-generational') indicators['accessibility-focused'] += 2;
  if (householdType === 'retired') indicators['accessibility-focused'] += 1;

  // Cooking skill influences
  const cookingLevel = componentScores.cookingSkill?.level;
  if (cookingLevel === 'professional' || cookingLevel === 'advanced') {
    indicators['serious-cook'] += 3;
  }

  // Special needs influences
  if (componentScores.specialNeeds?.accessibilityRequired) {
    indicators['accessibility-focused'] += 4;
  }
  if (componentScores.specialNeeds?.safetyRequired) {
    indicators['family-manager'] += 2;
  }

  // Ownership influences
  if (answers['ownership-status'] === 'renter-limited') {
    indicators['budget-conscious'] += 2;
  }

  // Age group influences
  const ageGroups = answers['age-groups'] || [];
  if (ageGroups.includes('infants') || ageGroups.includes('toddlers')) {
    indicators['family-manager'] += 2;
  }
  if (ageGroups.includes('seniors')) {
    indicators['accessibility-focused'] += 2;
  }

  // Find top persona
  let topPersona = 'family-manager';
  let topScore = 0;

  for (const [persona, score] of Object.entries(indicators)) {
    if (score > topScore) {
      topScore = score;
      topPersona = persona;
    }
  }

  const personaConfig = USER_PERSONAS[topPersona];

  return {
    type: topPersona,
    confidence: Math.min(100, Math.round((topScore / 8) * 100)),
    characteristics: personaConfig.characteristics,
    priorities: personaConfig.priorities,
    budgetApproach: personaConfig.budgetApproach,
    stylePreference: personaConfig.stylePreference,
    allScores: indicators
  };
}

/**
 * Calculate space multipliers
 */
function calculateSpaceMultipliers(answers, componentScores) {
  const baseMultipliers = componentScores.householdSize?.multipliers || {
    storage: 1.0,
    counter: 1.0,
    appliances: 1.0,
    seating: 1.0
  };

  // Adjust based on household type
  const typeConfig = componentScores.householdType;
  if (typeConfig?.spaceRequirements) {
    if (typeConfig.spaceRequirements.counter === 'extensive') {
      baseMultipliers.counter *= 1.2;
    }
    if (typeConfig.spaceRequirements.storage === 'maximum') {
      baseMultipliers.storage *= 1.3;
    }
  }

  // Adjust for multiple cooks
  if (componentScores.primaryCook?.zones >= 2) {
    baseMultipliers.counter *= 1.15;
  }

  // Adjust for accessibility
  if (componentScores.specialNeeds?.accessibilityRequired) {
    baseMultipliers.counter *= 1.1; // Need more accessible counter space
  }

  return baseMultipliers;
}

/**
 * Calculate category scores
 */
function calculateCategoryScores(answers, componentScores) {
  return {
    spaceNeeds: calculateSpaceNeedsScore(answers, componentScores),
    functionalRequirements: calculateFunctionalScore(answers, componentScores),
    accessibilityLevel: calculateAccessibilityLevel(componentScores),
    safetyLevel: calculateSafetyLevel(answers, componentScores),
    projectScope: calculateProjectScopeCategory(componentScores),
    userComplexity: calculateUserComplexity(answers, componentScores)
  };
}

function calculateSpaceNeedsScore(answers, componentScores) {
  let score = componentScores.householdSize?.score || 50;

  // Adjust for household type
  const typeScore = componentScores.householdType?.score || 50;
  score = (score + typeScore) / 2;

  // Boost for large households or multi-generational
  if (answers['household-type'] === 'multi-generational' || answers['household-size'] === '7+') {
    score = Math.min(score + 15, 100);
  }

  return {
    score: Math.round(score),
    level: score > 75 ? 'high' : score > 50 ? 'medium' : 'low',
    multipliers: componentScores.householdSize?.multipliers || {}
  };
}

function calculateFunctionalScore(answers, componentScores) {
  let score = componentScores.cookingSkill?.score || 50;

  // Adjust for workflow complexity
  if (componentScores.primaryCook?.workflow === 'multi') {
    score = Math.min(score + 20, 100);
  } else if (componentScores.primaryCook?.workflow === 'dual') {
    score = Math.min(score + 10, 100);
  }

  return {
    score: Math.round(score),
    level: score > 75 ? 'professional' : score > 50 ? 'advanced' : 'standard',
    zones: componentScores.primaryCook?.zones || 1,
    equipmentTier: componentScores.cookingSkill?.equipmentTier || 'consumer'
  };
}

function calculateAccessibilityLevel(componentScores) {
  if (!componentScores.specialNeeds) {
    return { score: 0, level: 'none', requirements: [] };
  }

  const score = componentScores.specialNeeds.score || 0;

  return {
    score,
    level: componentScores.specialNeeds.accessibilityRequired ? 'full' :
           score > 30 ? 'moderate' : score > 0 ? 'minor' : 'none',
    requirements: componentScores.specialNeeds.requirements || [],
    features: componentScores.specialNeeds.accessibilityFeatures || []
  };
}

function calculateSafetyLevel(answers, componentScores) {
  let score = 0;
  const features = [];

  // Child safety needs
  if (componentScores.specialNeeds?.safetyRequired) {
    score += 40;
    features.push(...(SPECIAL_NEEDS_CONFIGURATIONS['child-safety']?.features || []));
  }

  // Age group safety
  const ageGroups = answers['age-groups'] || [];
  if (ageGroups.includes('infants') || ageGroups.includes('toddlers')) {
    score += 30;
    features.push('baby-proofing', 'high-storage-hazards');
  }
  if (ageGroups.includes('seniors')) {
    score += 20;
    features.push('non-slip', 'good-lighting', 'easy-controls');
  }

  // Household type safety
  if (answers['household-type'] === 'young-family') {
    score += 25;
  }

  return {
    score: Math.min(100, score),
    level: score > 60 ? 'high' : score > 30 ? 'moderate' : 'standard',
    features: [...new Set(features)]
  };
}

function calculateProjectScopeCategory(componentScores) {
  const ownershipScore = componentScores.ownershipStatus?.score || 50;
  const goalsScore = componentScores.projectGoals?.score || 50;

  return {
    score: Math.round((ownershipScore + goalsScore) / 2),
    scope: componentScores.ownershipStatus?.renovationScope || 'moderate',
    permanentChanges: componentScores.ownershipStatus?.permanentChanges ?? true,
    structuralChanges: componentScores.ownershipStatus?.structuralChanges ?? false,
    budgetApproach: componentScores.ownershipStatus?.budgetApproach || 'balanced'
  };
}

function calculateUserComplexity(answers, componentScores) {
  let complexity = 0;

  // Household complexity
  if (answers['household-size'] === '7+' || answers['household-size'] === '5-6') complexity += 15;
  if (answers['household-type'] === 'multi-generational') complexity += 20;

  // Age diversity
  const ageGroups = answers['age-groups'] || [];
  if (ageGroups.length >= 3) complexity += 15;

  // Special needs
  const needsCount = (answers['special-needs'] || []).filter(n => n !== 'none').length;
  complexity += needsCount * 10;

  // Skill level
  const skill = parseInt(answers['cooking-skill-level'] || 3);
  if (skill >= 4) complexity += 10;

  return {
    score: Math.min(100, complexity),
    level: complexity > 50 ? 'high' : complexity > 25 ? 'moderate' : 'simple'
  };
}

/**
 * Calculate design priorities
 */
function calculateDesignPriorities(answers, componentScores) {
  const priorities = [];

  // From household type
  if (componentScores.householdType?.priorities) {
    componentScores.householdType.priorities.forEach((p, i) => {
      priorities.push({ priority: p, source: 'lifestyle', weight: 10 - i });
    });
  }

  // From special needs
  if (componentScores.specialNeeds?.accessibilityRequired) {
    priorities.push({ priority: 'accessibility', source: 'needs', weight: 15 });
  }
  if (componentScores.specialNeeds?.safetyRequired) {
    priorities.push({ priority: 'child-safety', source: 'needs', weight: 12 });
  }

  // From cooking skill
  if (componentScores.cookingSkill?.level === 'professional') {
    priorities.push({ priority: 'professional-equipment', source: 'skill', weight: 11 });
  }

  // From project goals
  if (componentScores.projectGoals?.scope === 'comprehensive') {
    priorities.push({ priority: 'complete-transformation', source: 'goals', weight: 8 });
  }

  // Sort by weight
  priorities.sort((a, b) => b.weight - a.weight);

  return priorities.slice(0, 8);
}

/**
 * Calculate project scope
 */
function calculateProjectScope(answers, componentScores) {
  return {
    renovationType: componentScores.ownershipStatus?.renovationScope || 'moderate',
    canMakeStructuralChanges: componentScores.ownershipStatus?.structuralChanges ?? false,
    timeline: componentScores.projectTimeline?.timeline || '3-6-months',
    urgency: componentScores.projectTimeline?.urgency || 'medium',
    primaryGoal: componentScores.projectGoals?.primaryGoal || 'major-update',
    budgetApproach: componentScores.ownershipStatus?.budgetApproach || 'balanced',
    constraints: componentScores.projectTimeline?.constraints || []
  };
}

/**
 * Generate recommendations
 */
function generateRecommendations(answers, componentScores, scores) {
  const recommendations = [];

  // Household size recommendations
  if (answers['household-size'] === '5-6' || answers['household-size'] === '7+') {
    recommendations.push({
      id: 'large-family-capacity',
      type: 'storage',
      priority: 'essential',
      title: {
        en: 'Extended Storage & Capacity Solutions',
        fr: 'Solutions de capacité et stockage étendues'
      },
      description: {
        en: 'Consider a walk-in pantry, oversized refrigerator, and double ovens to accommodate your large household.',
        fr: 'Envisagez un garde-manger accessible, un réfrigérateur surdimensionné et des fours doubles pour accueillir votre grande famille.'
      }
    });
  }

  // Accessibility recommendations
  if (componentScores.specialNeeds?.accessibilityRequired) {
    recommendations.push({
      id: 'accessibility-design',
      type: 'layout',
      priority: 'essential',
      title: {
        en: 'Universal Accessibility Design',
        fr: 'Conception d\'accessibilité universelle'
      },
      description: {
        en: 'Include lowered work surfaces (28-34"), wide pathways (60"+), front-control appliances, and pull-out storage throughout.',
        fr: 'Inclure des surfaces de travail abaissées (71-86cm), des allées larges (152cm+), des appareils à commandes frontales et du rangement coulissant partout.'
      },
      features: componentScores.specialNeeds.accessibilityFeatures
    });
  }

  // Safety recommendations
  if (scores.categories.safetyLevel.level === 'high') {
    recommendations.push({
      id: 'enhanced-safety',
      type: 'safety',
      priority: 'essential',
      title: {
        en: 'Enhanced Safety Features',
        fr: 'Fonctionnalités de sécurité améliorées'
      },
      description: {
        en: 'Include cabinet locks, soft-close drawers, rounded corners, cool-touch surfaces, and induction cooktop for maximum safety.',
        fr: 'Inclure des verrous d\'armoire, des tiroirs à fermeture douce, des coins arrondis, des surfaces fraîches au toucher et une plaque à induction pour une sécurité maximale.'
      },
      features: scores.categories.safetyLevel.features
    });
  }

  // Cooking skill recommendations
  if (componentScores.cookingSkill?.equipmentTier === 'professional') {
    recommendations.push({
      id: 'professional-kitchen',
      type: 'appliance',
      priority: 'recommended',
      title: {
        en: 'Professional-Grade Kitchen',
        fr: 'Cuisine de qualité professionnelle'
      },
      description: {
        en: 'Consider commercial-style range (48"+), enhanced ventilation (1200+ CFM), pot-filler, and dedicated prep zones.',
        fr: 'Envisagez une cuisinière de style commercial (122cm+), une ventilation améliorée (1200+ CFM), un robinet remplisseur et des zones de préparation dédiées.'
      }
    });
  }

  // Multi-cook recommendations
  if (componentScores.primaryCook?.zones >= 2) {
    recommendations.push({
      id: 'multi-cook-layout',
      type: 'layout',
      priority: 'recommended',
      title: {
        en: 'Multi-Cook Kitchen Design',
        fr: 'Conception de cuisine multi-cuisiniers'
      },
      description: {
        en: 'Plan for multiple work zones, consider an island with second prep sink, and ensure adequate aisle width for two cooks.',
        fr: 'Planifiez plusieurs zones de travail, envisagez un îlot avec un deuxième évier de préparation et assurez une largeur d\'allée adéquate pour deux cuisiniers.'
      }
    });
  }

  // Multi-generational recommendations
  if (answers['household-type'] === 'multi-generational') {
    recommendations.push({
      id: 'multi-gen-design',
      type: 'layout',
      priority: 'essential',
      title: {
        en: 'Multi-Generational Accommodations',
        fr: 'Aménagements multigénérationnels'
      },
      description: {
        en: 'Include varied counter heights, both pull-out and standard storage, excellent task lighting, and comfortable seating options.',
        fr: 'Inclure des hauteurs de comptoir variées, du rangement coulissant et standard, un excellent éclairage de tâche et des options de sièges confortables.'
      }
    });
  }

  // Renter recommendations
  if (answers['ownership-status'] === 'renter-limited') {
    recommendations.push({
      id: 'renter-solutions',
      type: 'general',
      priority: 'essential',
      title: {
        en: 'Portable & Removable Solutions',
        fr: 'Solutions portables et amovibles'
      },
      description: {
        en: 'Focus on freestanding furniture, removable organizers, portable appliances, and peel-and-stick surfaces.',
        fr: 'Concentrez-vous sur les meubles autonomes, les organisateurs amovibles, les appareils portables et les surfaces autocollantes.'
      }
    });
  }

  // Timeline urgency recommendations
  if (componentScores.projectTimeline?.urgency === 'critical') {
    recommendations.push({
      id: 'fast-track-approach',
      type: 'planning',
      priority: 'essential',
      title: {
        en: 'Fast-Track Project Approach',
        fr: 'Approche de projet accéléré'
      },
      description: {
        en: 'Focus on in-stock items, simplified design choices, and RTA (ready-to-assemble) cabinetry for fastest completion.',
        fr: 'Concentrez-vous sur les articles en stock, les choix de conception simplifiés et les armoires RTA (prêtes à assembler) pour une réalisation plus rapide.'
      }
    });
  }

  // Persona-based recommendations
  if (scores.userPersona?.type === 'home-entertainer') {
    recommendations.push({
      id: 'entertainer-features',
      type: 'feature',
      priority: 'recommended',
      title: {
        en: 'Entertainment-Ready Features',
        fr: 'Fonctionnalités prêtes pour recevoir'
      },
      description: {
        en: 'Consider an open layout, beverage center, wine storage, double ovens, and ample counter space for serving.',
        fr: 'Envisagez un aménagement ouvert, un centre de boissons, un rangement à vin, des fours doubles et un grand espace de comptoir pour le service.'
      }
    });
  }

  return recommendations;
}

module.exports = {
  calculateSectionScore,
  scoreHouseholdSize,
  scoreHouseholdType,
  scoreAgeGroups,
  scorePrimaryCook,
  scoreCookingSkill,
  scoreSpecialNeeds,
  scoreOwnershipStatus,
  scoreProjectTimeline,
  scoreProjectGoals,
  identifyUserPersona,
  calculateSpaceMultipliers,
  calculateCategoryScores,
  calculateDesignPriorities,
  calculateProjectScope,
  generateRecommendations,
  SCORE_WEIGHTS,
  HOUSEHOLD_SIZE_MULTIPLIERS,
  LIFESTYLE_PATTERNS,
  AGE_GROUP_CONFIGURATIONS,
  SPECIAL_NEEDS_CONFIGURATIONS,
  OWNERSHIP_CONFIGURATIONS,
  TIMELINE_CONFIGURATIONS,
  PROJECT_GOAL_CONFIGURATIONS,
  USER_PERSONAS
};
