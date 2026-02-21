/**
 * Cooking Habits Section Scoring Module
 *
 * Comprehensive analysis of cooking behaviors and needs including:
 * - Cooking frequency and intensity assessment
 * - Meal type preferences and cooking styles
 * - Appliance requirements based on cooking methods
 * - Workspace and storage needs analysis
 * - User cooking persona identification
 * - Equipment and feature recommendations
 */

/**
 * Score weights for cooking factors
 */
const SCORE_WEIGHTS = {
  cookingFrequency: 0.20,
  mealTypes: 0.15,
  cookingMethods: 0.18,
  rangePreference: 0.12,
  ovenNeeds: 0.10,
  counterWorkspace: 0.12,
  specialtyAppliances: 0.08,
  mealPrep: 0.05
};

/**
 * Cooking frequency configurations
 */
const COOKING_FREQUENCY_SCORES = {
  rarely: {
    score: 25,
    level: 'minimal',
    persona: 'occasional-cook',
    tags: ['minimal-cooking', 'simple-meals'],
    applianceNeeds: 'basic',
    workspaceNeed: 'minimal',
    storageNeed: 'minimal',
    characteristics: {
      mealsPerWeek: '0-3',
      typicalMealTime: '15-20 min',
      cookingStyle: 'quick-simple'
    }
  },
  sometimes: {
    score: 45,
    level: 'casual',
    persona: 'casual-cook',
    tags: ['casual-cooking'],
    applianceNeeds: 'standard',
    workspaceNeed: 'moderate',
    storageNeed: 'standard',
    characteristics: {
      mealsPerWeek: '4-7',
      typicalMealTime: '20-30 min',
      cookingStyle: 'weeknight-meals'
    }
  },
  often: {
    score: 70,
    level: 'regular',
    persona: 'home-cook',
    tags: ['regular-cooking', 'home-chef'],
    applianceNeeds: 'enhanced',
    workspaceNeed: 'generous',
    storageNeed: 'generous',
    characteristics: {
      mealsPerWeek: '8-12',
      typicalMealTime: '30-45 min',
      cookingStyle: 'varied-recipes'
    }
  },
  daily: {
    score: 85,
    level: 'dedicated',
    persona: 'dedicated-cook',
    tags: ['daily-cooking', 'serious-cook'],
    applianceNeeds: 'professional',
    workspaceNeed: 'extensive',
    storageNeed: 'maximum',
    characteristics: {
      mealsPerWeek: '14-18',
      typicalMealTime: '45-60 min',
      cookingStyle: 'from-scratch'
    }
  },
  'multiple-daily': {
    score: 100,
    level: 'intensive',
    persona: 'chef-level',
    tags: ['intensive-cooking', 'chef-kitchen', 'professional-level'],
    applianceNeeds: 'professional',
    workspaceNeed: 'maximum',
    storageNeed: 'maximum',
    characteristics: {
      mealsPerWeek: '18+',
      typicalMealTime: '60+ min',
      cookingStyle: 'multi-course'
    }
  }
};

/**
 * Meal type configurations with appliance and feature requirements
 */
const MEAL_TYPE_CONFIGURATIONS = {
  'quick-meals': {
    score: 30,
    tags: ['quick-cooking'],
    applianceRecommendations: ['microwave', 'toaster-oven', 'instant-pot'],
    storageNeeds: ['pantry-staples'],
    workspaceNeeds: 'minimal'
  },
  'everyday-cooking': {
    score: 50,
    tags: ['everyday-meals'],
    applianceRecommendations: ['standard-range', 'standard-oven'],
    storageNeeds: ['spice-storage', 'pan-storage'],
    workspaceNeeds: 'standard'
  },
  'family-meals': {
    score: 65,
    tags: ['family-cooking', 'batch-cooking'],
    applianceRecommendations: ['large-oven', 'double-oven-option', 'large-cooktop'],
    storageNeeds: ['bulk-storage', 'large-cookware'],
    workspaceNeeds: 'generous'
  },
  baking: {
    score: 75,
    tags: ['baking-focus', 'pastry-making'],
    applianceRecommendations: ['convection-oven', 'stand-mixer', 'marble-counter-section'],
    storageNeeds: ['baking-supplies', 'sheet-pan-storage', 'mixer-storage'],
    workspaceNeeds: 'generous',
    specialFeatures: ['cool-counter-surface', 'pull-out-mixer-shelf']
  },
  'gourmet-cooking': {
    score: 90,
    tags: ['gourmet', 'fine-dining'],
    applianceRecommendations: ['pro-range', 'convection-oven', 'specialty-burners', 'warming-drawer'],
    storageNeeds: ['specialty-cookware', 'fine-china', 'wine-storage'],
    workspaceNeeds: 'extensive'
  },
  entertaining: {
    score: 85,
    tags: ['entertaining-focus', 'party-cooking'],
    applianceRecommendations: ['double-oven', 'warming-drawer', 'beverage-center', 'wine-fridge'],
    storageNeeds: ['serving-ware', 'large-platters', 'bar-supplies'],
    workspaceNeeds: 'extensive',
    specialFeatures: ['beverage-station', 'butler-pantry']
  },
  'meal-prep': {
    score: 70,
    tags: ['meal-prep', 'batch-cooking', 'organized-cook'],
    applianceRecommendations: ['large-fridge', 'vacuum-sealer', 'food-processor'],
    storageNeeds: ['container-storage', 'label-station', 'bulk-ingredients'],
    workspaceNeeds: 'generous'
  },
  'healthy-cooking': {
    score: 60,
    tags: ['health-focused', 'fresh-ingredients'],
    applianceRecommendations: ['steam-oven', 'air-fryer', 'juicer', 'blender'],
    storageNeeds: ['produce-storage', 'supplement-area'],
    workspaceNeeds: 'standard'
  }
};

/**
 * Cooking method configurations
 */
const COOKING_METHOD_CONFIGURATIONS = {
  stovetop: {
    score: 50,
    equipment: ['standard-cooktop'],
    tags: ['stovetop-cooking'],
    burnerNeeds: 4,
    specialFeatures: []
  },
  oven: {
    score: 50,
    equipment: ['standard-oven'],
    tags: ['oven-cooking'],
    ovenNeeds: 'single',
    specialFeatures: ['convection-option']
  },
  grilling: {
    score: 65,
    equipment: ['indoor-grill', 'grill-burner', 'powerful-ventilation'],
    tags: ['grilling', 'high-heat-cooking'],
    specialFeatures: ['powerful-hood', 'grill-insert']
  },
  wok: {
    score: 80,
    equipment: ['wok-burner', 'high-btu-burner'],
    tags: ['high-heat-cooking', 'asian-cooking', 'wok-cooking'],
    burnerNeeds: 'high-btu',
    specialFeatures: ['wok-ring', 'powerful-ventilation']
  },
  'slow-cooking': {
    score: 45,
    equipment: ['slow-cooker', 'dutch-oven'],
    tags: ['slow-cooking', 'braising'],
    specialFeatures: ['dedicated-outlet']
  },
  'sous-vide': {
    score: 70,
    equipment: ['sous-vide-circulator', 'vacuum-sealer'],
    tags: ['precision-cooking', 'advanced-technique'],
    specialFeatures: ['dedicated-outlet', 'water-access']
  },
  smoking: {
    score: 75,
    equipment: ['smoker-oven', 'outdoor-smoker-connection'],
    tags: ['smoking', 'bbq-enthusiast'],
    specialFeatures: ['enhanced-ventilation']
  },
  steaming: {
    score: 55,
    equipment: ['steam-oven', 'steamer-insert'],
    tags: ['steam-cooking', 'healthy-cooking'],
    specialFeatures: ['steam-oven-option']
  },
  'deep-frying': {
    score: 60,
    equipment: ['deep-fryer', 'powerful-hood'],
    tags: ['deep-frying'],
    specialFeatures: ['powerful-ventilation', 'fire-suppression']
  },
  roasting: {
    score: 55,
    equipment: ['large-oven', 'roasting-pan'],
    tags: ['roasting', 'large-format-cooking'],
    ovenNeeds: 'large-capacity',
    specialFeatures: ['convection', 'probe-thermometer']
  }
};

/**
 * Range/cooktop preference configurations
 */
const RANGE_PREFERENCE_SCORES = {
  'gas': {
    score: 80,
    type: 'gas',
    tags: ['gas-cooking', 'traditional-cooking'],
    benefits: ['precise-heat-control', 'visual-flame', 'instant-response'],
    requirements: ['gas-line'],
    considerations: ['ventilation-important']
  },
  'electric-coil': {
    score: 40,
    type: 'electric-coil',
    tags: ['budget-friendly'],
    benefits: ['low-cost', 'easy-repair'],
    requirements: ['240v-outlet'],
    considerations: ['slow-response', 'uneven-heating']
  },
  'electric-smooth': {
    score: 60,
    type: 'smooth-top',
    tags: ['modern-electric'],
    benefits: ['easy-clean', 'sleek-look'],
    requirements: ['240v-outlet'],
    considerations: ['requires-flat-cookware']
  },
  'induction': {
    score: 90,
    type: 'induction',
    tags: ['induction-cooking', 'modern-cooking', 'energy-efficient'],
    benefits: ['instant-response', 'precise-control', 'cool-surface', 'energy-efficient'],
    requirements: ['240v-outlet', 'induction-cookware'],
    considerations: ['requires-compatible-cookware']
  },
  'dual-fuel': {
    score: 95,
    type: 'dual-fuel',
    tags: ['dual-fuel', 'professional-cooking'],
    benefits: ['gas-cooktop-precision', 'electric-oven-consistency'],
    requirements: ['gas-line', '240v-outlet'],
    considerations: ['higher-cost', 'professional-level']
  },
  'pro-range': {
    score: 100,
    type: 'professional',
    tags: ['professional-range', 'chef-kitchen'],
    benefits: ['high-btu', 'commercial-features', 'durability'],
    requirements: ['gas-line', '240v-outlet', 'reinforced-floor', 'enhanced-ventilation'],
    considerations: ['high-cost', 'requires-professional-install']
  }
};

/**
 * Oven needs configurations
 */
const OVEN_NEEDS_SCORES = {
  'single-standard': {
    score: 50,
    type: 'single',
    capacity: 'standard',
    tags: [],
    features: ['basic-bake', 'basic-broil']
  },
  'single-convection': {
    score: 70,
    type: 'single-convection',
    capacity: 'standard',
    tags: ['convection-cooking'],
    features: ['convection', 'even-baking']
  },
  'double-oven': {
    score: 85,
    type: 'double',
    capacity: 'expanded',
    tags: ['double-oven', 'multi-dish-cooking'],
    features: ['simultaneous-cooking', 'different-temps']
  },
  'wall-oven': {
    score: 80,
    type: 'wall',
    capacity: 'standard',
    tags: ['wall-oven', 'ergonomic'],
    features: ['eye-level', 'separate-cooktop']
  },
  'steam-oven': {
    score: 90,
    type: 'steam',
    capacity: 'standard',
    tags: ['steam-oven', 'healthy-cooking', 'advanced-cooking'],
    features: ['steam-cooking', 'bread-baking', 'reheating']
  },
  'combination': {
    score: 95,
    type: 'combination',
    capacity: 'expanded',
    tags: ['combination-oven', 'multi-function'],
    features: ['microwave', 'convection', 'steam', 'speed-cook']
  }
};

/**
 * Counter workspace configurations
 */
const COUNTER_WORKSPACE_SCORES = {
  minimal: {
    score: 30,
    linearFeet: '4-6',
    tags: ['compact-workspace'],
    suitableFor: ['quick-meals', 'single-dish'],
    limitations: ['limited-prep', 'no-multi-tasking']
  },
  standard: {
    score: 55,
    linearFeet: '8-12',
    tags: [],
    suitableFor: ['everyday-cooking', 'family-meals'],
    limitations: ['moderate-prep-space']
  },
  generous: {
    score: 80,
    linearFeet: '14-18',
    tags: ['ample-workspace'],
    suitableFor: ['baking', 'meal-prep', 'entertaining'],
    benefits: ['multiple-prep-zones', 'helper-space']
  },
  extensive: {
    score: 100,
    linearFeet: '20+',
    tags: ['extensive-workspace', 'professional-level'],
    suitableFor: ['gourmet-cooking', 'professional-level', 'serious-entertaining'],
    benefits: ['multiple-work-zones', 'dedicated-stations', 'simultaneous-cooking']
  }
};

/**
 * Specialty appliance configurations
 */
const SPECIALTY_APPLIANCE_SCORES = {
  'stand-mixer': {
    score: 15,
    category: 'baking',
    tags: ['baking-equipment'],
    storageNeeds: 'mixer-lift-or-garage',
    powerNeeds: 'dedicated-outlet'
  },
  'food-processor': {
    score: 12,
    category: 'prep',
    tags: ['food-prep'],
    storageNeeds: 'cabinet-space',
    powerNeeds: 'counter-outlet'
  },
  'espresso-machine': {
    score: 15,
    category: 'beverage',
    tags: ['coffee-station', 'espresso'],
    storageNeeds: 'counter-space',
    powerNeeds: 'dedicated-outlet',
    waterNeeds: 'plumbed-option'
  },
  'wine-fridge': {
    score: 12,
    category: 'beverage',
    tags: ['wine-storage', 'entertaining'],
    storageNeeds: 'undercounter-space',
    powerNeeds: 'dedicated-outlet'
  },
  'bread-machine': {
    score: 8,
    category: 'baking',
    tags: ['bread-baking'],
    storageNeeds: 'appliance-garage',
    powerNeeds: 'counter-outlet'
  },
  'pasta-maker': {
    score: 8,
    category: 'specialty',
    tags: ['pasta-making', 'italian-cooking'],
    storageNeeds: 'drawer-storage',
    powerNeeds: 'optional'
  },
  'ice-cream-maker': {
    score: 6,
    category: 'dessert',
    tags: ['dessert-making'],
    storageNeeds: 'freezer-space',
    powerNeeds: 'counter-outlet'
  },
  'dehydrator': {
    score: 8,
    category: 'preservation',
    tags: ['food-preservation', 'healthy-snacks'],
    storageNeeds: 'appliance-garage',
    powerNeeds: 'counter-outlet'
  },
  'pressure-cooker': {
    score: 12,
    category: 'cooking',
    tags: ['pressure-cooking', 'quick-cooking'],
    storageNeeds: 'cabinet-space',
    powerNeeds: 'counter-outlet'
  },
  'air-fryer': {
    score: 10,
    category: 'cooking',
    tags: ['air-frying', 'healthy-cooking'],
    storageNeeds: 'counter-or-cabinet',
    powerNeeds: 'counter-outlet'
  }
};

/**
 * Cooking persona definitions
 */
const COOKING_PERSONAS = {
  'minimal-cook': {
    description: {
      en: 'Prefers simple, quick meals with minimal time in the kitchen',
      fr: 'Préfère des repas simples et rapides avec un minimum de temps en cuisine'
    },
    priorities: ['easy-clean', 'basic-appliances', 'minimal-storage'],
    budgetFocus: 'efficiency',
    applianceLevel: 'basic'
  },
  'casual-cook': {
    description: {
      en: 'Cooks regularly but values convenience and simplicity',
      fr: 'Cuisine régulièrement mais valorise la commodité et la simplicité'
    },
    priorities: ['reliable-appliances', 'adequate-storage', 'easy-maintenance'],
    budgetFocus: 'value',
    applianceLevel: 'standard'
  },
  'home-cook': {
    description: {
      en: 'Enjoys cooking and experiments with various cuisines and techniques',
      fr: 'Aime cuisiner et expérimenter avec diverses cuisines et techniques'
    },
    priorities: ['quality-appliances', 'ample-workspace', 'good-storage'],
    budgetFocus: 'quality',
    applianceLevel: 'enhanced'
  },
  'serious-cook': {
    description: {
      en: 'Passionate about cooking with high standards for equipment and results',
      fr: 'Passionné de cuisine avec des normes élevées pour l\'équipement et les résultats'
    },
    priorities: ['professional-appliances', 'extensive-workspace', 'specialty-storage'],
    budgetFocus: 'performance',
    applianceLevel: 'professional'
  },
  'entertainer': {
    description: {
      en: 'Focuses on cooking for guests and creating memorable dining experiences',
      fr: 'Se concentre sur la cuisine pour les invités et la création d\'expériences culinaires mémorables'
    },
    priorities: ['presentation-space', 'multiple-cooking-zones', 'serving-area'],
    budgetFocus: 'entertaining-features',
    applianceLevel: 'enhanced'
  },
  'baker': {
    description: {
      en: 'Specializes in baking with focus on precision and proper equipment',
      fr: 'Spécialisé dans la pâtisserie avec un accent sur la précision et l\'équipement approprié'
    },
    priorities: ['precision-oven', 'cool-work-surface', 'baking-storage'],
    budgetFocus: 'baking-equipment',
    applianceLevel: 'specialized'
  },
  'health-focused': {
    description: {
      en: 'Prioritizes healthy cooking methods and fresh ingredient preparation',
      fr: 'Priorise les méthodes de cuisson saines et la préparation d\'ingrédients frais'
    },
    priorities: ['steam-cooking', 'fresh-storage', 'prep-space'],
    budgetFocus: 'health-appliances',
    applianceLevel: 'specialized'
  },
  'multi-generational': {
    description: {
      en: 'Cooks for extended family with varying needs and preferences',
      fr: 'Cuisine pour la famille élargie avec des besoins et préférences variés'
    },
    priorities: ['accessibility', 'multiple-heights', 'varied-appliances'],
    budgetFocus: 'versatility',
    applianceLevel: 'enhanced'
  }
};

/**
 * Calculate overall section score
 */
function calculateSectionScore(answers) {
  const scores = {
    overall: 0,
    cookingIntensity: 'moderate',
    persona: null,
    categories: {},
    recommendations: [],
    tags: new Set(),
    applianceRequirements: [],
    workspaceRequirements: {},
    storageRequirements: [],
    specialFeatures: []
  };

  // Calculate component scores
  const componentScores = {
    cookingFrequency: scoreCookingFrequency(answers['cooking-frequency']),
    mealTypes: scoreMealTypes(answers['meal-types']),
    cookingMethods: scoreCookingMethods(answers['cooking-methods']),
    rangePreference: scoreRangePreference(answers['range-preference']),
    ovenNeeds: scoreOvenNeeds(answers['oven-needs']),
    counterWorkspace: scoreCounterWorkspace(answers['counter-workspace']),
    specialtyAppliances: scoreSpecialtyAppliances(answers['specialty-appliances']),
    mealPrep: scoreMealPrep(answers['meal-prep'])
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
        componentScores[key].tags.forEach(tag => scores.tags.add(tag));
      }

      // Collect appliance requirements
      if (componentScores[key]?.applianceRecommendations) {
        scores.applianceRequirements.push(...componentScores[key].applianceRecommendations);
      }
      if (componentScores[key]?.equipment) {
        scores.applianceRequirements.push(...componentScores[key].equipment);
      }

      // Collect special features
      if (componentScores[key]?.specialFeatures) {
        scores.specialFeatures.push(...componentScores[key].specialFeatures);
      }
    }
  }

  if (totalWeight > 0) {
    scores.overall = Math.round((scores.overall / totalWeight) * 100) / 100;
  }

  // Determine cooking intensity and persona
  scores.cookingIntensity = determineCookingIntensity(answers, componentScores);
  scores.persona = identifyCookingPersona(answers, componentScores, scores);

  // Build categories
  scores.categories = {
    frequency: {
      score: componentScores.cookingFrequency?.score || 50,
      level: componentScores.cookingFrequency?.level || 'regular',
      characteristics: componentScores.cookingFrequency?.characteristics || {}
    },
    mealTypes: {
      score: componentScores.mealTypes?.score || 50,
      types: answers['meal-types'] || [],
      primaryFocus: determinePrimaryMealFocus(answers['meal-types'])
    },
    cookingStyle: {
      score: calculateCookingStyleScore(componentScores),
      methods: answers['cooking-methods'] || [],
      complexity: determineCookingComplexity(answers, componentScores)
    },
    equipment: {
      range: {
        score: componentScores.rangePreference?.score || 50,
        type: componentScores.rangePreference?.type || 'gas',
        requirements: componentScores.rangePreference?.requirements || []
      },
      oven: {
        score: componentScores.ovenNeeds?.score || 50,
        type: componentScores.ovenNeeds?.type || 'single',
        features: componentScores.ovenNeeds?.features || []
      },
      specialty: componentScores.specialtyAppliances || { score: 0, appliances: [] }
    },
    workspace: {
      score: componentScores.counterWorkspace?.score || 55,
      level: answers['counter-workspace'] || 'standard',
      linearFeet: componentScores.counterWorkspace?.linearFeet || '8-12'
    },
    mealPrep: componentScores.mealPrep || { score: 50, level: 'standard' }
  };

  // Calculate workspace requirements
  scores.workspaceRequirements = calculateWorkspaceRequirements(answers, componentScores, scores);

  // Calculate storage requirements
  scores.storageRequirements = calculateStorageRequirements(answers, componentScores, scores);

  // Generate recommendations
  scores.recommendations = generateRecommendations(answers, componentScores, scores);

  // Convert tags to array and deduplicate appliance requirements
  scores.tags = Array.from(scores.tags);
  scores.applianceRequirements = [...new Set(scores.applianceRequirements)];
  scores.specialFeatures = [...new Set(scores.specialFeatures)];

  return scores;
}

/**
 * Score cooking frequency
 */
function scoreCookingFrequency(value) {
  if (!value) return { score: 50, level: 'regular', tags: [] };

  const config = COOKING_FREQUENCY_SCORES[value] || COOKING_FREQUENCY_SCORES.often;

  return {
    score: config.score,
    level: config.level,
    persona: config.persona,
    tags: [...config.tags],
    applianceNeeds: config.applianceNeeds,
    workspaceNeed: config.workspaceNeed,
    storageNeed: config.storageNeed,
    characteristics: config.characteristics
  };
}

/**
 * Score meal types
 */
function scoreMealTypes(values) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return { score: 50, types: [], tags: [], applianceRecommendations: [] };
  }

  let totalScore = 0;
  const tags = [];
  const applianceRecommendations = [];
  const storageNeeds = [];
  const specialFeatures = [];
  let workspaceLevel = 'standard';

  values.forEach(type => {
    const config = MEAL_TYPE_CONFIGURATIONS[type];
    if (config) {
      totalScore += config.score;
      tags.push(...config.tags);
      if (config.applianceRecommendations) {
        applianceRecommendations.push(...config.applianceRecommendations);
      }
      if (config.storageNeeds) {
        storageNeeds.push(...config.storageNeeds);
      }
      if (config.specialFeatures) {
        specialFeatures.push(...config.specialFeatures);
      }
      // Track highest workspace need
      const workspaceOrder = ['minimal', 'standard', 'generous', 'extensive'];
      if (workspaceOrder.indexOf(config.workspaceNeeds) > workspaceOrder.indexOf(workspaceLevel)) {
        workspaceLevel = config.workspaceNeeds;
      }
    }
  });

  return {
    score: Math.min(100, Math.round(totalScore / values.length)),
    types: values,
    tags: [...new Set(tags)],
    applianceRecommendations: [...new Set(applianceRecommendations)],
    storageNeeds: [...new Set(storageNeeds)],
    specialFeatures: [...new Set(specialFeatures)],
    workspaceLevel
  };
}

/**
 * Score cooking methods
 */
function scoreCookingMethods(values) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return { score: 50, methods: [], tags: [], equipment: [], specialFeatures: [] };
  }

  let totalScore = 0;
  const tags = [];
  const equipment = [];
  const specialFeatures = [];
  let maxBurnerNeeds = 4;
  let ovenNeeds = 'single';

  values.forEach(method => {
    const config = COOKING_METHOD_CONFIGURATIONS[method];
    if (config) {
      totalScore += config.score;
      tags.push(...config.tags);
      equipment.push(...config.equipment);
      specialFeatures.push(...config.specialFeatures);

      if (config.burnerNeeds === 'high-btu') {
        tags.push('high-btu-needed');
      }
      if (config.burnerNeeds > maxBurnerNeeds) {
        maxBurnerNeeds = config.burnerNeeds;
      }
      if (config.ovenNeeds === 'large-capacity') {
        ovenNeeds = 'large-capacity';
      }
    }
  });

  return {
    score: Math.min(100, Math.round(totalScore / values.length)),
    methods: values,
    tags: [...new Set(tags)],
    equipment: [...new Set(equipment)],
    specialFeatures: [...new Set(specialFeatures)],
    burnerRequirements: maxBurnerNeeds,
    ovenRequirements: ovenNeeds
  };
}

/**
 * Score range preference
 */
function scoreRangePreference(value) {
  if (!value) return { score: 60, type: 'gas', tags: [], requirements: [] };

  const config = RANGE_PREFERENCE_SCORES[value] || RANGE_PREFERENCE_SCORES.gas;

  return {
    score: config.score,
    type: config.type,
    tags: [...config.tags],
    benefits: config.benefits,
    requirements: config.requirements,
    considerations: config.considerations
  };
}

/**
 * Score oven needs
 */
function scoreOvenNeeds(value) {
  if (!value) return { score: 50, type: 'single', tags: [], features: [] };

  const config = OVEN_NEEDS_SCORES[value] || OVEN_NEEDS_SCORES['single-standard'];

  return {
    score: config.score,
    type: config.type,
    capacity: config.capacity,
    tags: [...config.tags],
    features: config.features
  };
}

/**
 * Score counter workspace
 */
function scoreCounterWorkspace(value) {
  if (!value) return { score: 55, linearFeet: '8-12', tags: [] };

  const config = COUNTER_WORKSPACE_SCORES[value] || COUNTER_WORKSPACE_SCORES.standard;

  return {
    score: config.score,
    level: value,
    linearFeet: config.linearFeet,
    tags: [...config.tags],
    suitableFor: config.suitableFor,
    benefits: config.benefits,
    limitations: config.limitations
  };
}

/**
 * Score specialty appliances
 */
function scoreSpecialtyAppliances(values) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return { score: 30, appliances: [], tags: [], storageNeeds: [], powerNeeds: [] };
  }

  let totalScore = 30; // Base score
  const tags = [];
  const storageNeeds = [];
  const powerNeeds = [];
  const categories = new Set();

  values.forEach(appliance => {
    const config = SPECIALTY_APPLIANCE_SCORES[appliance];
    if (config) {
      totalScore += config.score;
      tags.push(...config.tags);
      storageNeeds.push(config.storageNeeds);
      powerNeeds.push(config.powerNeeds);
      categories.add(config.category);
    }
  });

  return {
    score: Math.min(100, totalScore),
    appliances: values,
    tags: [...new Set(tags)],
    storageNeeds: [...new Set(storageNeeds)],
    powerNeeds: [...new Set(powerNeeds)],
    categories: [...categories],
    count: values.length
  };
}

/**
 * Score meal prep habits
 */
function scoreMealPrep(value) {
  if (!value) return { score: 50, level: 'standard', tags: [] };

  const scores = {
    'no-prep': {
      score: 30,
      level: 'minimal',
      tags: [],
      storageNeeds: [],
      features: []
    },
    'occasional-prep': {
      score: 55,
      level: 'occasional',
      tags: ['occasional-meal-prep'],
      storageNeeds: ['container-cabinet'],
      features: []
    },
    'weekly-prep': {
      score: 80,
      level: 'regular',
      tags: ['meal-prep', 'organized-cook'],
      storageNeeds: ['container-drawer', 'label-station', 'prep-container-storage'],
      features: ['large-counter-space', 'multiple-cutting-boards']
    },
    'batch-cooking': {
      score: 95,
      level: 'intensive',
      tags: ['batch-cooking', 'meal-prep-focused'],
      storageNeeds: ['large-freezer-space', 'vacuum-sealer-storage', 'bulk-container-storage'],
      features: ['extensive-counter', 'large-refrigeration', 'vacuum-sealer']
    }
  };

  const config = scores[value] || scores['occasional-prep'];

  return {
    score: config.score,
    level: config.level,
    tags: [...config.tags],
    storageNeeds: config.storageNeeds,
    features: config.features
  };
}

/**
 * Determine cooking intensity level
 */
function determineCookingIntensity(answers, componentScores) {
  const frequencyScore = componentScores.cookingFrequency?.score || 50;
  const methodsScore = componentScores.cookingMethods?.score || 50;
  const workspaceScore = componentScores.counterWorkspace?.score || 50;

  const combinedScore = (frequencyScore * 0.5) + (methodsScore * 0.3) + (workspaceScore * 0.2);

  if (combinedScore >= 85) return 'intensive';
  if (combinedScore >= 70) return 'dedicated';
  if (combinedScore >= 55) return 'regular';
  if (combinedScore >= 40) return 'casual';
  return 'minimal';
}

/**
 * Identify cooking persona
 */
function identifyCookingPersona(answers, componentScores, scores) {
  const indicators = {
    'minimal-cook': 0,
    'casual-cook': 0,
    'home-cook': 0,
    'serious-cook': 0,
    'entertainer': 0,
    'baker': 0,
    'health-focused': 0,
    'multi-generational': 0
  };

  // Frequency-based indicators
  const frequency = answers['cooking-frequency'];
  if (frequency === 'rarely') indicators['minimal-cook'] += 3;
  if (frequency === 'sometimes') indicators['casual-cook'] += 2;
  if (frequency === 'often') indicators['home-cook'] += 2;
  if (frequency === 'daily' || frequency === 'multiple-daily') indicators['serious-cook'] += 3;

  // Meal type indicators
  const mealTypes = answers['meal-types'] || [];
  if (mealTypes.includes('entertaining')) indicators['entertainer'] += 3;
  if (mealTypes.includes('baking')) indicators['baker'] += 3;
  if (mealTypes.includes('healthy-cooking')) indicators['health-focused'] += 3;
  if (mealTypes.includes('gourmet-cooking')) indicators['serious-cook'] += 2;
  if (mealTypes.includes('family-meals')) indicators['multi-generational'] += 2;

  // Cooking method indicators
  const methods = answers['cooking-methods'] || [];
  if (methods.includes('wok') || methods.includes('sous-vide')) indicators['serious-cook'] += 2;
  if (methods.includes('steaming')) indicators['health-focused'] += 1;
  if (methods.includes('grilling') || methods.includes('smoking')) indicators['entertainer'] += 1;

  // Equipment indicators
  if (answers['range-preference'] === 'pro-range') indicators['serious-cook'] += 3;
  if (answers['range-preference'] === 'dual-fuel') indicators['serious-cook'] += 2;
  if (answers['oven-needs'] === 'steam-oven') indicators['health-focused'] += 2;
  if (answers['oven-needs'] === 'double-oven') indicators['entertainer'] += 2;

  // Workspace indicators
  if (answers['counter-workspace'] === 'extensive') indicators['serious-cook'] += 2;
  if (answers['counter-workspace'] === 'minimal') indicators['minimal-cook'] += 2;

  // Specialty appliance indicators
  const specialty = answers['specialty-appliances'] || [];
  if (specialty.includes('stand-mixer')) indicators['baker'] += 2;
  if (specialty.includes('espresso-machine')) indicators['entertainer'] += 1;
  if (specialty.includes('wine-fridge')) indicators['entertainer'] += 2;
  if (specialty.includes('air-fryer') || specialty.includes('dehydrator')) indicators['health-focused'] += 1;

  // Find the highest scoring persona
  let topPersona = 'home-cook';
  let topScore = 0;

  for (const [persona, score] of Object.entries(indicators)) {
    if (score > topScore) {
      topScore = score;
      topPersona = persona;
    }
  }

  const personaConfig = COOKING_PERSONAS[topPersona];

  return {
    type: topPersona,
    confidence: Math.min(100, Math.round((topScore / 10) * 100)),
    description: personaConfig?.description || {},
    priorities: personaConfig?.priorities || [],
    budgetFocus: personaConfig?.budgetFocus || 'value',
    applianceLevel: personaConfig?.applianceLevel || 'standard',
    allScores: indicators
  };
}

/**
 * Determine primary meal focus
 */
function determinePrimaryMealFocus(mealTypes) {
  if (!mealTypes || mealTypes.length === 0) return 'everyday-cooking';

  const priorities = {
    'gourmet-cooking': 6,
    'entertaining': 5,
    'baking': 4,
    'meal-prep': 3,
    'healthy-cooking': 3,
    'family-meals': 2,
    'everyday-cooking': 1,
    'quick-meals': 0
  };

  let topType = 'everyday-cooking';
  let topPriority = -1;

  mealTypes.forEach(type => {
    if (priorities[type] !== undefined && priorities[type] > topPriority) {
      topPriority = priorities[type];
      topType = type;
    }
  });

  return topType;
}

/**
 * Calculate cooking style score
 */
function calculateCookingStyleScore(componentScores) {
  const methodsScore = componentScores.cookingMethods?.score || 50;
  const rangeScore = componentScores.rangePreference?.score || 50;
  const ovenScore = componentScores.ovenNeeds?.score || 50;

  return Math.round((methodsScore * 0.5) + (rangeScore * 0.3) + (ovenScore * 0.2));
}

/**
 * Determine cooking complexity
 */
function determineCookingComplexity(answers, componentScores) {
  const methods = answers['cooking-methods'] || [];
  const mealTypes = answers['meal-types'] || [];

  const advancedMethods = ['sous-vide', 'wok', 'smoking', 'deep-frying'];
  const advancedMeals = ['gourmet-cooking', 'baking', 'entertaining'];

  const advancedMethodCount = methods.filter(m => advancedMethods.includes(m)).length;
  const advancedMealCount = mealTypes.filter(m => advancedMeals.includes(m)).length;

  const totalAdvanced = advancedMethodCount + advancedMealCount;

  if (totalAdvanced >= 4) return 'professional';
  if (totalAdvanced >= 2) return 'advanced';
  if (totalAdvanced >= 1) return 'intermediate';
  return 'basic';
}

/**
 * Calculate workspace requirements
 */
function calculateWorkspaceRequirements(answers, componentScores, scores) {
  const requirements = {
    minimumLinearFeet: 8,
    recommendedLinearFeet: 12,
    zones: [],
    specialSurfaces: [],
    heightVariations: false
  };

  // Base on workspace preference
  const workspaceConfig = COUNTER_WORKSPACE_SCORES[answers['counter-workspace']];
  if (workspaceConfig) {
    const [min, max] = workspaceConfig.linearFeet.split('-').map(Number);
    requirements.minimumLinearFeet = min || 8;
    requirements.recommendedLinearFeet = max || min + 4 || 12;
  }

  // Add zones based on cooking style
  if (scores.cookingIntensity === 'intensive' || scores.cookingIntensity === 'dedicated') {
    requirements.zones.push('primary-prep', 'secondary-prep', 'staging');
  } else if (scores.cookingIntensity === 'regular') {
    requirements.zones.push('primary-prep', 'staging');
  } else {
    requirements.zones.push('primary-prep');
  }

  // Special surfaces for baking
  const mealTypes = answers['meal-types'] || [];
  if (mealTypes.includes('baking')) {
    requirements.specialSurfaces.push('marble-or-cool-surface');
    requirements.zones.push('baking-station');
  }

  // Coffee/beverage station
  const specialty = answers['specialty-appliances'] || [];
  if (specialty.includes('espresso-machine')) {
    requirements.zones.push('coffee-station');
  }

  // Multi-generational needs
  if (scores.persona?.type === 'multi-generational') {
    requirements.heightVariations = true;
  }

  return requirements;
}

/**
 * Calculate storage requirements
 */
function calculateStorageRequirements(answers, componentScores, scores) {
  const requirements = {
    overall: 'standard',
    categories: [],
    specialStorage: [],
    applianceStorage: []
  };

  // Base on cooking frequency
  const frequencyConfig = COOKING_FREQUENCY_SCORES[answers['cooking-frequency']];
  if (frequencyConfig) {
    requirements.overall = frequencyConfig.storageNeed;
  }

  // Meal type storage needs
  const mealTypes = answers['meal-types'] || [];
  mealTypes.forEach(type => {
    const config = MEAL_TYPE_CONFIGURATIONS[type];
    if (config?.storageNeeds) {
      requirements.categories.push(...config.storageNeeds);
    }
  });

  // Specialty appliance storage
  const specialty = answers['specialty-appliances'] || [];
  specialty.forEach(appliance => {
    const config = SPECIALTY_APPLIANCE_SCORES[appliance];
    if (config?.storageNeeds) {
      requirements.applianceStorage.push({
        appliance,
        storage: config.storageNeeds
      });
    }
  });

  // Meal prep storage
  if (componentScores.mealPrep?.level === 'intensive' || componentScores.mealPrep?.level === 'regular') {
    requirements.specialStorage.push('container-organization', 'freezer-space');
  }

  // Deduplicate
  requirements.categories = [...new Set(requirements.categories)];

  return requirements;
}

/**
 * Generate recommendations
 */
function generateRecommendations(answers, componentScores, scores) {
  const recommendations = [];

  // Frequency-based recommendations
  if (scores.cookingIntensity === 'intensive' || scores.cookingIntensity === 'dedicated') {
    recommendations.push({
      id: 'pro-appliances',
      type: 'appliance',
      priority: 'recommended',
      title: {
        en: 'Professional-Grade Appliances',
        fr: 'Appareils de qualité professionnelle'
      },
      description: {
        en: 'Your cooking frequency warrants investment in professional-grade appliances for reliability and performance.',
        fr: 'Votre fréquence de cuisine justifie un investissement dans des appareils de qualité professionnelle pour la fiabilité et les performances.'
      }
    });
  }

  // Range recommendations
  const rangeConfig = componentScores.rangePreference;
  if (rangeConfig?.type === 'induction') {
    recommendations.push({
      id: 'induction-cookware',
      type: 'equipment',
      priority: 'essential',
      title: {
        en: 'Induction-Compatible Cookware',
        fr: 'Ustensiles compatibles induction'
      },
      description: {
        en: 'Ensure your cookware is induction-compatible (magnetic base). Cast iron and stainless steel work well.',
        fr: 'Assurez-vous que vos ustensiles sont compatibles avec l\'induction (base magnétique). La fonte et l\'acier inoxydable fonctionnent bien.'
      }
    });
  }

  if (rangeConfig?.type === 'dual-fuel' || rangeConfig?.type === 'professional') {
    recommendations.push({
      id: 'enhanced-ventilation',
      type: 'infrastructure',
      priority: 'essential',
      title: {
        en: 'Enhanced Ventilation Required',
        fr: 'Ventilation améliorée requise'
      },
      description: {
        en: 'Professional-style ranges require powerful ventilation (900+ CFM) to handle high heat output.',
        fr: 'Les cuisinières de style professionnel nécessitent une ventilation puissante (900+ CFM) pour gérer la production de chaleur élevée.'
      }
    });
  }

  // Cooking method specific recommendations
  const methods = answers['cooking-methods'] || [];
  if (methods.includes('wok')) {
    recommendations.push({
      id: 'wok-setup',
      type: 'equipment',
      priority: 'recommended',
      title: {
        en: 'Wok Cooking Setup',
        fr: 'Configuration pour la cuisson au wok'
      },
      description: {
        en: 'Consider a high-BTU burner (15,000+) or dedicated wok burner for proper wok cooking with wok hei.',
        fr: 'Envisagez un brûleur haute puissance (15 000+ BTU) ou un brûleur wok dédié pour une cuisson au wok appropriée avec wok hei.'
      }
    });
  }

  if (methods.includes('sous-vide')) {
    recommendations.push({
      id: 'sous-vide-station',
      type: 'feature',
      priority: 'optional',
      title: {
        en: 'Sous-Vide Station',
        fr: 'Station sous-vide'
      },
      description: {
        en: 'Plan a dedicated area near water source with adequate outlet for sous-vide cooking.',
        fr: 'Prévoyez une zone dédiée près d\'une source d\'eau avec une prise adéquate pour la cuisson sous-vide.'
      }
    });
  }

  // Baking-specific recommendations
  const mealTypes = answers['meal-types'] || [];
  if (mealTypes.includes('baking')) {
    recommendations.push({
      id: 'baking-station',
      type: 'workspace',
      priority: 'recommended',
      title: {
        en: 'Dedicated Baking Station',
        fr: 'Station de pâtisserie dédiée'
      },
      description: {
        en: 'Include a cool work surface (marble or quartz), mixer lift or storage, and nearby baking supply storage.',
        fr: 'Incluez une surface de travail fraîche (marbre ou quartz), un support ou rangement pour le batteur, et un rangement à proximité pour les fournitures de pâtisserie.'
      }
    });
  }

  // Entertaining recommendations
  if (mealTypes.includes('entertaining') || scores.persona?.type === 'entertainer') {
    recommendations.push({
      id: 'entertaining-features',
      type: 'feature',
      priority: 'recommended',
      title: {
        en: 'Entertaining-Ready Kitchen',
        fr: 'Cuisine prête pour recevoir'
      },
      description: {
        en: 'Consider double ovens, warming drawer, beverage center, and ample counter space for staging.',
        fr: 'Envisagez des fours doubles, un tiroir chauffant, un centre de boissons et un grand espace de comptoir pour la mise en place.'
      }
    });
  }

  // Workspace recommendations
  if (scores.workspaceRequirements.minimumLinearFeet >= 14) {
    recommendations.push({
      id: 'extensive-workspace',
      type: 'layout',
      priority: 'essential',
      title: {
        en: 'Extensive Counter Space',
        fr: 'Espace de comptoir étendu'
      },
      description: {
        en: `Your cooking style requires at least ${scores.workspaceRequirements.minimumLinearFeet} linear feet of counter space. Consider an island for additional workspace.`,
        fr: `Votre style de cuisine nécessite au moins ${scores.workspaceRequirements.minimumLinearFeet} pieds linéaires d'espace de comptoir. Envisagez un îlot pour un espace de travail supplémentaire.`
      }
    });
  }

  // Specialty appliance storage
  if (componentScores.specialtyAppliances?.count > 3) {
    recommendations.push({
      id: 'appliance-storage',
      type: 'storage',
      priority: 'recommended',
      title: {
        en: 'Specialty Appliance Storage',
        fr: 'Rangement pour appareils spécialisés'
      },
      description: {
        en: 'Plan for appliance garages, pull-out shelves, or dedicated counter space for your specialty appliances.',
        fr: 'Prévoyez des garages à appareils, des étagères coulissantes ou un espace de comptoir dédié pour vos appareils spécialisés.'
      }
    });
  }

  // Meal prep recommendations
  if (componentScores.mealPrep?.level === 'intensive') {
    recommendations.push({
      id: 'meal-prep-zone',
      type: 'feature',
      priority: 'recommended',
      title: {
        en: 'Meal Prep Zone',
        fr: 'Zone de préparation de repas'
      },
      description: {
        en: 'Dedicate space for container storage, labeling station, and consider a larger refrigerator/freezer for batch storage.',
        fr: 'Consacrez de l\'espace pour le rangement des contenants, une station d\'étiquetage, et envisagez un réfrigérateur/congélateur plus grand pour le stockage en lots.'
      }
    });
  }

  // Persona-specific recommendations
  if (scores.persona?.type === 'health-focused') {
    recommendations.push({
      id: 'health-kitchen',
      type: 'feature',
      priority: 'optional',
      title: {
        en: 'Health-Focused Kitchen Features',
        fr: 'Fonctionnalités de cuisine axées sur la santé'
      },
      description: {
        en: 'Consider a steam oven, ample produce storage, juicing/blending station, and water filtration system.',
        fr: 'Envisagez un four vapeur, un rangement ample pour les produits frais, une station de jus/mixage et un système de filtration d\'eau.'
      }
    });
  }

  return recommendations;
}

module.exports = {
  calculateSectionScore,
  scoreCookingFrequency,
  scoreMealTypes,
  scoreCookingMethods,
  scoreRangePreference,
  scoreOvenNeeds,
  scoreCounterWorkspace,
  scoreSpecialtyAppliances,
  scoreMealPrep,
  determineCookingIntensity,
  identifyCookingPersona,
  calculateWorkspaceRequirements,
  calculateStorageRequirements,
  generateRecommendations,
  SCORE_WEIGHTS,
  COOKING_FREQUENCY_SCORES,
  MEAL_TYPE_CONFIGURATIONS,
  COOKING_METHOD_CONFIGURATIONS,
  RANGE_PREFERENCE_SCORES,
  OVEN_NEEDS_SCORES,
  COUNTER_WORKSPACE_SCORES,
  SPECIALTY_APPLIANCE_SCORES,
  COOKING_PERSONAS
};
