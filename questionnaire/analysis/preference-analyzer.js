/**
 * Preference Analyzer Module
 *
 * Advanced user preference analysis with behavioral pattern recognition,
 * lifestyle profiling, decision-making style detection, and personalized
 * recommendation weighting.
 */

/**
 * Preference categories with weights and descriptions
 */
const PREFERENCE_WEIGHTS = {
  functionality: {
    weight: 0.25,
    description: {
      en: 'Practical kitchen features and workflow',
      fr: 'Caractéristiques pratiques et flux de travail',
    },
  },
  aesthetics: {
    weight: 0.2,
    description: {
      en: 'Visual design and style preferences',
      fr: 'Préférences de design visuel et style',
    },
  },
  budget: {
    weight: 0.2,
    description: {
      en: 'Cost consciousness and value orientation',
      fr: 'Conscience des coûts et orientation valeur',
    },
  },
  lifestyle: {
    weight: 0.15,
    description: {
      en: 'Daily habits and social patterns',
      fr: 'Habitudes quotidiennes et schémas sociaux',
    },
  },
  sustainability: {
    weight: 0.1,
    description: {
      en: 'Environmental and eco-friendly priorities',
      fr: 'Priorités environnementales et écologiques',
    },
  },
  technology: {
    weight: 0.1,
    description: {
      en: 'Smart features and modern conveniences',
      fr: 'Fonctionnalités intelligentes et commodités modernes',
    },
  },
};

/**
 * User persona definitions for targeted recommendations
 */
const USER_PERSONAS = {
  'serious-chef': {
    name: { en: 'Serious Home Chef', fr: 'Chef à domicile sérieux' },
    indicators: ['daily-extensive-cooking', 'professional-appliances', 'multiple-cuisines'],
    priorities: ['professional-range', 'prep-space', 'quality-ventilation', 'storage-organization'],
    recommendations: [
      'commercial-grade-appliances',
      'pot-filler',
      'large-sink',
      'butcher-block-station',
    ],
  },
  'busy-professional': {
    name: { en: 'Busy Professional', fr: 'Professionnel occupé' },
    indicators: ['quick-meals', 'low-maintenance', 'smart-features'],
    priorities: ['easy-clean', 'smart-appliances', 'efficient-storage', 'minimal-maintenance'],
    recommendations: [
      'smart-appliances',
      'quartz-counters',
      'soft-close-cabinets',
      'built-in-organization',
    ],
  },
  'family-focused': {
    name: { en: 'Family-Focused', fr: 'Centré sur la famille' },
    indicators: ['children', 'large-household', 'safety-priority'],
    priorities: ['durability', 'safety-features', 'easy-clean', 'large-capacity'],
    recommendations: [
      'rounded-corners',
      'soft-close-everything',
      'stain-resistant',
      'large-fridge',
    ],
  },
  entertainer: {
    name: { en: 'Social Entertainer', fr: 'Hôte social' },
    indicators: ['frequent-entertaining', 'large-gatherings', 'open-layout'],
    priorities: ['open-plan', 'seating-area', 'beverage-station', 'impressive-design'],
    recommendations: ['large-island', 'wine-storage', 'bar-area', 'statement-lighting'],
  },
  'eco-conscious': {
    name: { en: 'Eco-Conscious', fr: 'Éco-conscient' },
    indicators: ['sustainability-priority', 'energy-efficiency', 'natural-materials'],
    priorities: ['energy-star', 'sustainable-materials', 'water-efficiency', 'recycling-center'],
    recommendations: [
      'bamboo-cabinets',
      'recycled-glass-counters',
      'led-lighting',
      'composting-system',
    ],
  },
  'tech-enthusiast': {
    name: { en: 'Tech Enthusiast', fr: 'Passionné de technologie' },
    indicators: ['smart-home-interest', 'connected-appliances', 'automation'],
    priorities: ['smart-integration', 'connected-appliances', 'voice-control', 'app-monitoring'],
    recommendations: [
      'smart-fridge',
      'voice-controlled-faucet',
      'automated-lighting',
      'charging-stations',
    ],
  },
  minimalist: {
    name: { en: 'Minimalist', fr: 'Minimaliste' },
    indicators: ['clean-lines', 'hidden-storage', 'uncluttered'],
    priorities: [
      'handleless-cabinets',
      'integrated-appliances',
      'hidden-storage',
      'clean-aesthetic',
    ],
    recommendations: [
      'push-to-open-cabinets',
      'panel-ready-appliances',
      'pocket-doors',
      'appliance-garages',
    ],
  },
  'traditional-homemaker': {
    name: { en: 'Traditional Homemaker', fr: 'Gestionnaire de foyer traditionnel' },
    indicators: ['classic-style', 'proven-solutions', 'comfort-focus'],
    priorities: ['timeless-design', 'quality-craftsmanship', 'warm-atmosphere', 'family-gathering'],
    recommendations: [
      'raised-panel-cabinets',
      'farmhouse-sink',
      'warm-wood-tones',
      'breakfast-nook',
    ],
  },
};

/**
 * Decision-making style profiles
 */
const DECISION_STYLES = {
  analytical: {
    indicators: ['research-focused', 'comparison-shopping', 'data-driven'],
    approach: {
      en: 'Provide detailed specifications and comparisons',
      fr: 'Fournir des spécifications détaillées et des comparaisons',
    },
    contentType: ['specs', 'comparisons', 'ratings', 'longevity-data'],
  },
  intuitive: {
    indicators: ['visual-preference', 'gut-feeling', 'inspiration-driven'],
    approach: {
      en: 'Focus on visual inspiration and mood boards',
      fr: "Se concentrer sur l'inspiration visuelle et les planches d'ambiance",
    },
    contentType: ['images', 'mood-boards', 'style-galleries', 'before-after'],
  },
  practical: {
    indicators: ['function-first', 'roi-focused', 'problem-solving'],
    approach: {
      en: 'Emphasize practical benefits and value',
      fr: "Mettre l'accent sur les avantages pratiques et la valeur",
    },
    contentType: ['benefits', 'roi', 'durability', 'maintenance'],
  },
  collaborative: {
    indicators: ['seeks-opinions', 'family-decision', 'consensus-building'],
    approach: {
      en: 'Provide shareable content and multiple perspectives',
      fr: 'Fournir du contenu partageable et plusieurs perspectives',
    },
    contentType: ['shareable', 'pros-cons', 'family-friendly', 'reviews'],
  },
};

/**
 * Lifestyle pattern definitions
 */
const LIFESTYLE_PATTERNS = {
  'young-professional': {
    characteristics: ['single-or-couple', 'career-focused', 'social-active'],
    kitchenNeeds: ['quick-prep', 'entertaining-capable', 'modern-aesthetic'],
    budgetBehavior: 'investment-minded',
    timeAvailability: 'limited',
  },
  'growing-family': {
    characteristics: ['young-children', 'busy-schedule', 'safety-conscious'],
    kitchenNeeds: ['large-capacity', 'durable-surfaces', 'family-workflow'],
    budgetBehavior: 'value-conscious',
    timeAvailability: 'very-limited',
  },
  'established-family': {
    characteristics: ['older-children', 'multiple-cooks', 'varied-schedules'],
    kitchenNeeds: ['multi-user-friendly', 'homework-station', 'grab-and-go'],
    budgetBehavior: 'quality-focused',
    timeAvailability: 'moderate',
  },
  'empty-nesters': {
    characteristics: ['downsizing-possible', 'quality-time', 'entertaining'],
    kitchenNeeds: ['right-sized', 'premium-quality', 'easy-maintenance'],
    budgetBehavior: 'quality-over-quantity',
    timeAvailability: 'flexible',
  },
  retirees: {
    characteristics: ['accessibility-aware', 'grandchildren-visits', 'hobby-cooking'],
    kitchenNeeds: ['ergonomic-design', 'easy-access', 'traditional-values'],
    budgetBehavior: 'long-term-thinking',
    timeAvailability: 'abundant',
  },
  'multi-generational': {
    characteristics: ['varied-ages', 'accessibility-needs', 'multiple-cooks'],
    kitchenNeeds: ['universal-design', 'varied-heights', 'multiple-work-zones'],
    budgetBehavior: 'comprehensive',
    timeAvailability: 'varied',
  },
};

/**
 * Analyze all user preferences with comprehensive profiling
 */
function analyzePreferences(responses) {
  const analysis = {
    profile: buildUserProfile(responses),
    priorities: extractPriorities(responses),
    patterns: identifyPatterns(responses),
    segments: determineUserSegments(responses),
    persona: identifyUserPersona(responses),
    decisionStyle: identifyDecisionStyle(responses),
    lifestylePattern: identifyLifestylePattern(responses),
    coherence: calculatePreferenceCoherence(responses),
    preferenceStrength: calculatePreferenceStrength(responses),
    recommendations: [],
  };

  // Generate preference-based recommendations
  analysis.recommendations = generatePreferenceRecommendations(analysis, responses);

  // Calculate overall preference clarity score
  analysis.clarityScore = calculateClarityScore(analysis);

  return analysis;
}

/**
 * Build comprehensive user profile
 */
function buildUserProfile(responses) {
  const userAnswers = responses['user-profile'] || {};
  const cookingAnswers = responses['cooking-habits'] || {};
  const socialAnswers = responses['social-usage'] || {};
  const maintenanceAnswers = responses['maintenance-preferences'] || {};
  const techAnswers = responses['technology-preferences'] || {};

  return {
    household: {
      type: userAnswers['household-type'] || 'unknown',
      size: parseInt(userAnswers['household-size'], 10) || 2,
      hasChildren: userAnswers['has-children'] === 'yes',
      childrenAges: userAnswers['children-ages'] || [],
      hasElderly: userAnswers['has-elderly'] === 'yes',
      hasPets: userAnswers['has-pets'] === 'yes',
      specialNeeds: userAnswers['special-needs'] || [],
    },
    cooking: {
      frequency: cookingAnswers['cooking-frequency'] || 'moderate',
      style: cookingAnswers['cooking-style'] || [],
      skillLevel: cookingAnswers['skill-level'] || 'intermediate',
      cuisineTypes: cookingAnswers['cuisine-types'] || [],
      bakingFrequency: cookingAnswers['baking-frequency'] || 'occasionally',
      mealPrep: cookingAnswers['meal-prep'] || 'no',
      specialDiets: cookingAnswers['special-diets'] || [],
    },
    social: {
      entertainingFrequency: socialAnswers['entertaining-frequency'] || 'occasionally',
      gatheringSize: socialAnswers['typical-gathering-size'] || 'small',
      multiCook: socialAnswers['multi-cook'] === 'yes',
      kitchenAsHub: socialAnswers['kitchen-as-hub'] === 'yes',
      formalDining: socialAnswers['formal-dining'] || 'sometimes',
    },
    maintenance: {
      tolerance: maintenanceAnswers['maintenance-tolerance'] || 'moderate',
      cleaningFrequency: maintenanceAnswers['cleaning-frequency'] || 'weekly',
      durabilityPriority: maintenanceAnswers['durability-priority'] || 'important',
      willingToMaintain: maintenanceAnswers['willing-to-maintain'] || [],
    },
    technology: {
      comfort: techAnswers['tech-comfort'] || 'comfortable',
      smartHomeInterest: techAnswers['smart-home-interest'] || 'somewhat-interested',
      existingSmartHome: techAnswers['existing-smart-home'] || 'none',
      appUsage: techAnswers['app-usage'] || 'moderate',
    },
    experience: {
      ownershipType: userAnswers['ownership-type'] || 'owner',
      renovationExperience: userAnswers['renovation-experience'] || 'none',
      stayDuration: userAnswers['stay-duration'] || 'long-term',
      previousKitchenSatisfaction: userAnswers['previous-satisfaction'] || 'neutral',
    },
  };
}

/**
 * Extract user priorities from all sections with detailed weighting
 */
function extractPriorities(responses) {
  const priorities = {
    functionality: [],
    aesthetics: [],
    budget: [],
    lifestyle: [],
    sustainability: [],
    technology: [],
  };

  // Functionality priorities from cooking habits
  const cookingAnswers = responses['cooking-habits'] || {};

  if (cookingAnswers['cooking-frequency'] === 'daily-extensive') {
    priorities.functionality.push({
      id: 'high-performance-cooking',
      weight: 0.95,
      category: 'appliances',
      description: {
        en: 'High-performance cooking equipment',
        fr: 'Équipement de cuisson haute performance',
      },
      implications: ['professional-range', 'powerful-ventilation', 'large-prep-area'],
    });
  } else if (cookingAnswers['cooking-frequency'] === 'daily-moderate') {
    priorities.functionality.push({
      id: 'everyday-efficiency',
      weight: 0.75,
      category: 'workflow',
      description: {
        en: 'Efficient everyday cooking setup',
        fr: 'Configuration de cuisson quotidienne efficace',
      },
      implications: ['good-work-triangle', 'accessible-storage', 'easy-cleanup'],
    });
  }

  if (cookingAnswers['baking-frequency'] === 'frequently') {
    priorities.functionality.push({
      id: 'baking-station',
      weight: 0.8,
      category: 'workspace',
      description: { en: 'Dedicated baking station', fr: 'Station de pâtisserie dédiée' },
      implications: ['marble-surface', 'stand-mixer-storage', 'double-oven'],
    });
  }

  if (cookingAnswers['meal-prep'] === 'yes') {
    priorities.functionality.push({
      id: 'meal-prep-friendly',
      weight: 0.7,
      category: 'storage',
      description: {
        en: 'Meal prep friendly organization',
        fr: 'Organisation adaptée à la préparation de repas',
      },
      implications: ['container-storage', 'large-fridge', 'batch-cooking-space'],
    });
  }

  // Aesthetic priorities
  const aestheticAnswers = responses['aesthetic-preferences'] || {};

  if (aestheticAnswers['preferred-style']) {
    priorities.aesthetics.push({
      id: 'style-consistency',
      weight: 0.85,
      value: aestheticAnswers['preferred-style'],
      description: {
        en: `Consistent ${aestheticAnswers['preferred-style']} style`,
        fr: `Style ${aestheticAnswers['preferred-style']} cohérent`,
      },
      implications: getStyleImplications(aestheticAnswers['preferred-style']),
    });
  }

  if (aestheticAnswers['design-importance'] === 'very-important') {
    priorities.aesthetics.push({
      id: 'design-excellence',
      weight: 0.9,
      category: 'overall',
      description: {
        en: 'Design excellence and visual impact',
        fr: 'Excellence du design et impact visuel',
      },
      implications: ['statement-pieces', 'cohesive-palette', 'quality-materials'],
    });
  }

  if (aestheticAnswers['natural-light'] === 'priority') {
    priorities.aesthetics.push({
      id: 'natural-light',
      weight: 0.65,
      category: 'ambiance',
      description: { en: 'Maximize natural light', fr: 'Maximiser la lumière naturelle' },
      implications: ['light-colors', 'reflective-surfaces', 'window-treatments'],
    });
  }

  // Budget priorities
  const budgetAnswers = responses['budget-constraints'] || {};
  const spendingPriorities = budgetAnswers['priority-spending'] || [];

  spendingPriorities.forEach((priority, index) => {
    priorities.budget.push({
      id: `spend-priority-${priority}`,
      weight: 1 - index * 0.12,
      value: priority,
      rank: index + 1,
      description: {
        en: `Prioritize spending on ${priority}`,
        fr: `Prioriser les dépenses sur ${priority}`,
      },
      implications: getSpendingImplications(priority),
    });
  });

  const savingsAreas = budgetAnswers['savings-areas'] || [];
  savingsAreas.forEach((area, index) => {
    priorities.budget.push({
      id: `save-on-${area}`,
      weight: 0.6 - index * 0.1,
      value: area,
      type: 'savings',
      description: { en: `Save on ${area}`, fr: `Économiser sur ${area}` },
    });
  });

  // Lifestyle priorities from social usage
  const socialAnswers = responses['social-usage'] || {};

  if (socialAnswers['entertaining-frequency'] === 'frequently') {
    priorities.lifestyle.push({
      id: 'entertaining-space',
      weight: 0.9,
      category: 'social',
      description: { en: 'Space for entertaining guests', fr: 'Espace pour recevoir des invités' },
      implications: ['open-layout', 'island-seating', 'beverage-station', 'statement-design'],
    });
  }

  if (socialAnswers['multi-cook'] === 'yes') {
    priorities.lifestyle.push({
      id: 'multi-cook-layout',
      weight: 0.75,
      category: 'workflow',
      description: { en: 'Layout for multiple cooks', fr: 'Disposition pour plusieurs cuisiniers' },
      implications: ['multiple-work-zones', 'two-sinks', 'wide-aisles'],
    });
  }

  if (socialAnswers['kitchen-as-hub'] === 'yes') {
    priorities.lifestyle.push({
      id: 'family-hub',
      weight: 0.8,
      category: 'social',
      description: {
        en: 'Kitchen as family gathering hub',
        fr: 'Cuisine comme centre de rassemblement familial',
      },
      implications: ['comfortable-seating', 'homework-area', 'charging-stations'],
    });
  }

  // Sustainability priorities
  const envAnswers = responses['environmental-concerns'] || {};

  if (envAnswers['eco-priority'] === 'very-important') {
    priorities.sustainability.push({
      id: 'eco-materials',
      weight: 0.9,
      category: 'materials',
      description: {
        en: 'Eco-friendly materials and practices',
        fr: 'Matériaux et pratiques écologiques',
      },
      implications: ['sustainable-wood', 'recycled-materials', 'low-voc-finishes'],
    });
  }

  if (envAnswers['energy-efficiency'] === 'very-important') {
    priorities.sustainability.push({
      id: 'energy-efficient',
      weight: 0.85,
      category: 'appliances',
      description: { en: 'Energy-efficient appliances', fr: 'Appareils écoénergétiques' },
      implications: ['energy-star', 'led-lighting', 'induction-cooktop'],
    });
  }

  if (envAnswers['water-conservation'] === 'important') {
    priorities.sustainability.push({
      id: 'water-efficient',
      weight: 0.7,
      category: 'plumbing',
      description: { en: 'Water-efficient fixtures', fr: 'Appareils économes en eau' },
      implications: ['low-flow-faucet', 'efficient-dishwasher'],
    });
  }

  // Technology priorities
  const techAnswers = responses['technology-preferences'] || {};

  if (techAnswers['smart-home-interest'] === 'very-interested') {
    priorities.technology.push({
      id: 'smart-kitchen',
      weight: 0.9,
      category: 'integration',
      description: { en: 'Smart kitchen integration', fr: 'Intégration cuisine intelligente' },
      implications: ['connected-appliances', 'voice-control', 'smart-lighting', 'app-monitoring'],
    });
  }

  if (techAnswers['charging-needs'] === 'important') {
    priorities.technology.push({
      id: 'charging-infrastructure',
      weight: 0.65,
      category: 'electrical',
      description: {
        en: 'Device charging infrastructure',
        fr: 'Infrastructure de charge des appareils',
      },
      implications: ['usb-outlets', 'charging-drawer', 'hidden-outlets'],
    });
  }

  return priorities;
}

/**
 * Get style implications
 */
function getStyleImplications(style) {
  const implications = {
    modern: [
      'flat-panel-cabinets',
      'integrated-handles',
      'quartz-counters',
      'stainless-appliances',
    ],
    traditional: ['raised-panel-cabinets', 'ornate-hardware', 'granite-marble', 'wood-tones'],
    transitional: ['shaker-cabinets', 'simple-hardware', 'versatile-materials', 'neutral-palette'],
    farmhouse: ['open-shelving', 'apron-sink', 'butcher-block', 'vintage-touches'],
    contemporary: ['mixed-materials', 'bold-elements', 'statement-pieces', 'high-contrast'],
    industrial: ['metal-accents', 'exposed-elements', 'raw-materials', 'open-shelving'],
    scandinavian: ['light-wood', 'white-surfaces', 'minimal-hardware', 'natural-light'],
    mediterranean: ['warm-tones', 'decorative-tile', 'wrought-iron', 'textured-surfaces'],
  };
  return implications[style] || implications.transitional;
}

/**
 * Get spending implications
 */
function getSpendingImplications(priority) {
  const implications = {
    appliances: ['premium-brand-appliances', 'professional-features', 'extended-warranty'],
    cabinets: ['custom-or-semi-custom', 'quality-construction', 'soft-close'],
    countertops: ['natural-stone-or-quartz', 'full-height-backsplash', 'integrated-sink'],
    flooring: ['hardwood-or-tile', 'radiant-heat-ready', 'premium-finish'],
    lighting: ['layered-lighting', 'designer-fixtures', 'smart-controls'],
  };
  return implications[priority] || [];
}

/**
 * Identify behavioral patterns in user responses
 */
function identifyPatterns(responses) {
  const patterns = [];

  // Value-conscious pattern
  const budgetAnswers = responses['budget-constraints'] || {};
  const savingsAreas = budgetAnswers['savings-areas'] || [];
  const flexibility = parseInt(budgetAnswers['budget-flexibility'], 10) || 3;

  if (savingsAreas.length >= 2 || flexibility <= 2) {
    patterns.push({
      id: 'value-conscious',
      confidence: calculatePatternConfidence(
        ['savings-areas', 'budget-flexibility'],
        budgetAnswers
      ),
      category: 'budget',
      implications: [
        'focus-on-roi',
        'practical-choices',
        'long-term-value',
        'cost-effective-alternatives',
      ],
      description: { en: 'Value-conscious decision maker', fr: 'Décideur soucieux de la valeur' },
      recommendations: {
        approach: {
          en: 'Emphasize value and long-term savings',
          fr: "Mettre l'accent sur la valeur et les économies à long terme",
        },
        avoid: {
          en: 'Avoid premium-only options without alternatives',
          fr: 'Éviter les options premium uniquement sans alternatives',
        },
      },
    });
  }

  // Design-focused pattern
  const aestheticAnswers = responses['aesthetic-preferences'] || {};
  if (
    aestheticAnswers['design-importance'] === 'very-important' ||
    aestheticAnswers['cohesive-look'] === 'essential' ||
    aestheticAnswers['willing-to-pay-for-design'] === 'yes'
  ) {
    patterns.push({
      id: 'design-focused',
      confidence: calculatePatternConfidence(
        ['design-importance', 'cohesive-look'],
        aestheticAnswers
      ),
      category: 'aesthetics',
      implications: [
        'style-consistency',
        'detail-oriented',
        'aesthetic-investment',
        'designer-consultation',
      ],
      description: { en: 'Design-focused approach', fr: 'Approche axée sur le design' },
      recommendations: {
        approach: {
          en: 'Prioritize visual cohesion and style details',
          fr: 'Prioriser la cohésion visuelle et les détails de style',
        },
        avoid: {
          en: 'Avoid mismatched styles or compromised aesthetics',
          fr: "Éviter les styles dépareillés ou l'esthétique compromise",
        },
      },
    });
  }

  // Practical-first pattern
  const maintenanceAnswers = responses['maintenance-preferences'] || {};
  if (
    maintenanceAnswers['maintenance-tolerance'] === 'low' &&
    maintenanceAnswers['durability-priority'] === 'very-important'
  ) {
    patterns.push({
      id: 'practical-first',
      confidence: 0.85,
      category: 'functionality',
      implications: [
        'durability-focus',
        'easy-maintenance',
        'proven-solutions',
        'function-over-form',
      ],
      description: { en: 'Practical-first mindset', fr: 'Mentalité pragmatique' },
      recommendations: {
        approach: {
          en: 'Focus on durability and ease of maintenance',
          fr: "Se concentrer sur la durabilité et la facilité d'entretien",
        },
        avoid: {
          en: 'Avoid high-maintenance materials regardless of beauty',
          fr: 'Éviter les matériaux à entretien élevé peu importe leur beauté',
        },
      },
    });
  }

  // Tech-enthusiast pattern
  const techAnswers = responses['technology-preferences'] || {};
  if (
    techAnswers['smart-home-interest'] === 'very-interested' &&
    techAnswers['tech-comfort'] === 'very-comfortable'
  ) {
    patterns.push({
      id: 'tech-enthusiast',
      confidence: 0.9,
      category: 'technology',
      implications: ['smart-integration', 'modern-features', 'connected-home', 'future-proofing'],
      description: { en: 'Technology enthusiast', fr: 'Passionné de technologie' },
      recommendations: {
        approach: {
          en: 'Highlight smart features and connectivity',
          fr: 'Mettre en valeur les fonctionnalités intelligentes et la connectivité',
        },
        avoid: {
          en: "Don't suggest technology-averse solutions",
          fr: 'Ne pas suggérer de solutions réfractaires à la technologie',
        },
      },
    });
  }

  // Family-oriented pattern
  const userAnswers = responses['user-profile'] || {};
  const householdSize = parseInt(userAnswers['household-size'], 10) || 2;
  if (userAnswers['has-children'] === 'yes' || householdSize >= 4) {
    patterns.push({
      id: 'family-oriented',
      confidence: userAnswers['has-children'] === 'yes' ? 0.9 : 0.75,
      category: 'lifestyle',
      implications: [
        'safety-features',
        'durability',
        'storage-capacity',
        'easy-clean',
        'kid-friendly',
      ],
      description: { en: 'Family-oriented priorities', fr: 'Priorités orientées famille' },
      recommendations: {
        approach: {
          en: 'Emphasize safety, durability, and family-friendly features',
          fr: "Mettre l'accent sur la sécurité, la durabilité et les caractéristiques familiales",
        },
        avoid: {
          en: 'Avoid fragile materials or sharp edges',
          fr: 'Éviter les matériaux fragiles ou les bords tranchants',
        },
      },
    });
  }

  // Entertainer pattern
  const socialAnswers = responses['social-usage'] || {};
  if (
    socialAnswers['entertaining-frequency'] === 'frequently' &&
    socialAnswers['typical-gathering-size'] !== 'small'
  ) {
    patterns.push({
      id: 'entertainer',
      confidence: 0.88,
      category: 'lifestyle',
      implications: [
        'open-layout',
        'seating-area',
        'beverage-station',
        'flow-design',
        'impressive-aesthetic',
      ],
      description: { en: 'Frequent entertainer', fr: 'Hôte fréquent' },
      recommendations: {
        approach: {
          en: 'Design for social interaction and flow',
          fr: "Concevoir pour l'interaction sociale et la circulation",
        },
        avoid: {
          en: 'Avoid closed layouts or limited seating',
          fr: 'Éviter les dispositions fermées ou les sièges limités',
        },
      },
    });
  }

  // Health-conscious pattern
  const cookingAnswers = responses['cooking-habits'] || {};
  const specialDiets = cookingAnswers['special-diets'] || [];
  if (specialDiets.length > 0 || cookingAnswers['organic-preference'] === 'yes') {
    patterns.push({
      id: 'health-conscious',
      confidence: 0.75,
      category: 'lifestyle',
      implications: ['fresh-storage', 'prep-space', 'herb-garden', 'water-filtration'],
      description: { en: 'Health-conscious lifestyle', fr: 'Mode de vie soucieux de la santé' },
      recommendations: {
        approach: {
          en: 'Include health-supportive features',
          fr: 'Inclure des caractéristiques favorisant la santé',
        },
        avoid: {
          en: "Don't overlook water quality and fresh food storage",
          fr: "Ne pas négliger la qualité de l'eau et le stockage des aliments frais",
        },
      },
    });
  }

  // Accessibility-aware pattern
  if (userAnswers['has-elderly'] === 'yes' || (userAnswers['special-needs'] || []).length > 0) {
    patterns.push({
      id: 'accessibility-aware',
      confidence: 0.85,
      category: 'functionality',
      implications: ['universal-design', 'easy-reach', 'clear-pathways', 'good-lighting'],
      description: {
        en: 'Accessibility-aware planning',
        fr: "Planification consciente de l'accessibilité",
      },
      recommendations: {
        approach: {
          en: 'Incorporate universal design principles',
          fr: 'Incorporer les principes de conception universelle',
        },
        avoid: {
          en: 'Avoid hard-to-reach storage or narrow pathways',
          fr: "Éviter le rangement difficile d'accès ou les chemins étroits",
        },
      },
    });
  }

  return patterns;
}

/**
 * Calculate pattern confidence based on indicators
 */
function calculatePatternConfidence(indicators, answers) {
  let matches = 0;
  indicators.forEach((indicator) => {
    if (answers[indicator]) matches++;
  });
  return Math.min(0.95, 0.6 + (matches / indicators.length) * 0.35);
}

/**
 * Determine user segments for product recommendations
 */
function determineUserSegments(responses) {
  const segments = [];
  const profile = buildUserProfile(responses);
  const budgetAnswers = responses['budget-constraints'] || {};
  const aestheticAnswers = responses['aesthetic-preferences'] || {};

  // Budget segment
  const budgetTier = determineBudgetSegment(budgetAnswers['total-budget']);
  segments.push({
    type: 'budget',
    value: budgetTier,
    confidence: 0.95,
    implications: getBudgetImplications(budgetTier),
    productTier: getProductTierFromBudget(budgetTier),
  });

  // Lifestyle segment
  const lifestyleSegment = determineLifestyleSegment(profile);
  if (lifestyleSegment) {
    segments.push(lifestyleSegment);
  }

  // Design segment
  if (aestheticAnswers['preferred-style']) {
    segments.push({
      type: 'design',
      value: aestheticAnswers['preferred-style'],
      confidence: 0.85,
      implications: getStyleImplications(aestheticAnswers['preferred-style']),
      colorPalette: getStyleColorPalette(aestheticAnswers['preferred-style']),
    });
  }

  // Cooking segment
  const cookingSegment = determineCookingSegment(profile.cooking);
  if (cookingSegment) {
    segments.push(cookingSegment);
  }

  // Technology segment
  const techSegment = determineTechSegment(profile.technology);
  if (techSegment) {
    segments.push(techSegment);
  }

  return segments;
}

/**
 * Determine budget segment
 */
function determineBudgetSegment(budgetKey) {
  const segments = {
    'under-10k': 'entry',
    '10k-25k': 'value',
    '25k-50k': 'mid-range',
    '50k-75k': 'premium',
    '75k-100k': 'luxury',
    'over-100k': 'ultra-luxury',
  };
  return segments[budgetKey] || 'mid-range';
}

/**
 * Get budget implications
 */
function getBudgetImplications(segment) {
  const implications = {
    entry: ['stock-cabinets', 'laminate-counters', 'basic-appliances', 'diy-friendly'],
    value: ['stock-premium-cabinets', 'solid-surface-counters', 'standard-appliances'],
    'mid-range': ['semi-custom-cabinets', 'quartz-counters', 'mid-range-appliances'],
    premium: ['custom-cabinets', 'premium-materials', 'premium-appliances'],
    luxury: ['bespoke-design', 'luxury-materials', 'professional-appliances'],
    'ultra-luxury': ['artisan-crafted', 'rare-materials', 'commercial-grade'],
  };
  return implications[segment] || implications['mid-range'];
}

/**
 * Get product tier from budget
 */
function getProductTierFromBudget(segment) {
  const tiers = {
    entry: 'good',
    value: 'better',
    'mid-range': 'best',
    premium: 'premium',
    luxury: 'luxury',
    'ultra-luxury': 'bespoke',
  };
  return tiers[segment] || 'best';
}

/**
 * Determine lifestyle segment
 */
function determineLifestyleSegment(profile) {
  if (profile.cooking.frequency === 'daily-extensive') {
    return {
      type: 'lifestyle',
      value: 'serious-cook',
      confidence: 0.9,
      implications: [
        'professional-appliances',
        'prep-space',
        'storage-solutions',
        'quality-ventilation',
      ],
    };
  }

  if (profile.social.entertainingFrequency === 'frequently') {
    return {
      type: 'lifestyle',
      value: 'entertainer',
      confidence: 0.85,
      implications: ['open-layout', 'bar-area', 'seating', 'statement-design'],
    };
  }

  if (profile.household.hasChildren) {
    return {
      type: 'lifestyle',
      value: 'family',
      confidence: 0.88,
      implications: ['durability', 'safety', 'easy-clean', 'storage', 'homework-area'],
    };
  }

  if (profile.maintenance.tolerance === 'low') {
    return {
      type: 'lifestyle',
      value: 'low-maintenance',
      confidence: 0.8,
      implications: ['easy-clean-surfaces', 'durable-materials', 'minimal-upkeep'],
    };
  }

  return null;
}

/**
 * Determine cooking segment
 */
function determineCookingSegment(cooking) {
  if (cooking.frequency === 'daily-extensive' && cooking.skillLevel === 'advanced') {
    return {
      type: 'cooking',
      value: 'professional-home-cook',
      confidence: 0.92,
      implications: ['commercial-style-range', 'powerful-hood', 'multiple-ovens', 'large-sink'],
    };
  }

  if (cooking.bakingFrequency === 'frequently') {
    return {
      type: 'cooking',
      value: 'avid-baker',
      confidence: 0.85,
      implications: ['double-oven', 'marble-surface', 'stand-mixer-storage', 'cool-zone'],
    };
  }

  if (cooking.mealPrep === 'yes') {
    return {
      type: 'cooking',
      value: 'meal-prepper',
      confidence: 0.8,
      implications: [
        'large-fridge',
        'container-storage',
        'batch-cooking-space',
        'labeling-station',
      ],
    };
  }

  return null;
}

/**
 * Determine tech segment
 */
function determineTechSegment(technology) {
  if (
    technology.smartHomeInterest === 'very-interested' &&
    technology.comfort === 'very-comfortable'
  ) {
    return {
      type: 'technology',
      value: 'smart-home-ready',
      confidence: 0.9,
      implications: ['connected-appliances', 'voice-assistants', 'smart-lighting', 'app-control'],
    };
  }

  if (technology.smartHomeInterest === 'somewhat-interested') {
    return {
      type: 'technology',
      value: 'tech-curious',
      confidence: 0.7,
      implications: ['future-proofing', 'selective-smart-features', 'usb-outlets'],
    };
  }

  return null;
}

/**
 * Get style color palette
 */
function getStyleColorPalette(style) {
  const palettes = {
    modern: { primary: ['white', 'gray', 'black'], accent: ['stainless', 'chrome'] },
    traditional: { primary: ['cream', 'brown', 'burgundy'], accent: ['gold', 'bronze'] },
    transitional: {
      primary: ['white', 'gray', 'taupe'],
      accent: ['brushed-nickel', 'oil-rubbed-bronze'],
    },
    farmhouse: { primary: ['white', 'sage', 'cream'], accent: ['black', 'copper'] },
    contemporary: { primary: ['white', 'charcoal', 'navy'], accent: ['chrome', 'brass'] },
    industrial: { primary: ['gray', 'black', 'brown'], accent: ['iron', 'copper'] },
    scandinavian: { primary: ['white', 'light-wood', 'pale-gray'], accent: ['black', 'natural'] },
    mediterranean: { primary: ['terracotta', 'blue', 'cream'], accent: ['wrought-iron', 'gold'] },
  };
  return palettes[style] || palettes.transitional;
}

/**
 * Identify user persona from responses
 */
function identifyUserPersona(responses) {
  const scores = {};

  Object.entries(USER_PERSONAS).forEach(([personaId, persona]) => {
    scores[personaId] = calculatePersonaScore(responses, persona);
  });

  // Find best matching persona
  const sortedPersonas = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  const primary = sortedPersonas[0];
  const secondary = sortedPersonas[1];

  return {
    primary: {
      id: primary[0],
      ...USER_PERSONAS[primary[0]],
      confidence: primary[1],
    },
    secondary:
      secondary[1] > 0.5
        ? {
            id: secondary[0],
            ...USER_PERSONAS[secondary[0]],
            confidence: secondary[1],
          }
        : null,
    allScores: scores,
  };
}

/**
 * Calculate persona match score
 */
function calculatePersonaScore(responses, persona) {
  let score = 0;
  let indicatorCount = persona.indicators.length;

  const cookingAnswers = responses['cooking-habits'] || {};
  const userAnswers = responses['user-profile'] || {};
  const socialAnswers = responses['social-usage'] || {};
  const techAnswers = responses['technology-preferences'] || {};
  const maintenanceAnswers = responses['maintenance-preferences'] || {};
  const envAnswers = responses['environmental-concerns'] || {};
  const aestheticAnswers = responses['aesthetic-preferences'] || {};

  persona.indicators.forEach((indicator) => {
    switch (indicator) {
      case 'daily-extensive-cooking':
        if (cookingAnswers['cooking-frequency'] === 'daily-extensive') score += 1;
        break;
      case 'professional-appliances':
        if (cookingAnswers['appliance-preference'] === 'professional') score += 1;
        break;
      case 'multiple-cuisines':
        if ((cookingAnswers['cuisine-types'] || []).length >= 3) score += 1;
        break;
      case 'quick-meals':
        if (
          cookingAnswers['cooking-frequency'] === 'occasional' ||
          cookingAnswers['meal-type'] === 'quick'
        )
          score += 1;
        break;
      case 'low-maintenance':
        if (maintenanceAnswers['maintenance-tolerance'] === 'low') score += 1;
        break;
      case 'smart-features':
        if (techAnswers['smart-home-interest'] === 'very-interested') score += 1;
        break;
      case 'children':
        if (userAnswers['has-children'] === 'yes') score += 1;
        break;
      case 'large-household':
        if (parseInt(userAnswers['household-size'], 10) >= 4) score += 1;
        break;
      case 'safety-priority':
        if (userAnswers['has-children'] === 'yes' || userAnswers['has-elderly'] === 'yes')
          score += 1;
        break;
      case 'frequent-entertaining':
        if (socialAnswers['entertaining-frequency'] === 'frequently') score += 1;
        break;
      case 'large-gatherings':
        if (
          socialAnswers['typical-gathering-size'] === 'large' ||
          socialAnswers['typical-gathering-size'] === 'very-large'
        )
          score += 1;
        break;
      case 'open-layout':
        if (socialAnswers['kitchen-as-hub'] === 'yes') score += 1;
        break;
      case 'sustainability-priority':
        if (envAnswers['eco-priority'] === 'very-important') score += 1;
        break;
      case 'energy-efficiency':
        if (envAnswers['energy-efficiency'] === 'very-important') score += 1;
        break;
      case 'natural-materials':
        if (aestheticAnswers['material-preference'] === 'natural') score += 1;
        break;
      case 'smart-home-interest':
        if (techAnswers['smart-home-interest'] === 'very-interested') score += 1;
        break;
      case 'connected-appliances':
        if (techAnswers['connected-appliances'] === 'yes') score += 1;
        break;
      case 'automation':
        if (techAnswers['automation-interest'] === 'high') score += 1;
        break;
      case 'clean-lines':
        if (
          aestheticAnswers['preferred-style'] === 'modern' ||
          aestheticAnswers['preferred-style'] === 'contemporary'
        )
          score += 1;
        break;
      case 'hidden-storage':
        if (aestheticAnswers['storage-visibility'] === 'hidden') score += 1;
        break;
      case 'classic-style':
        if (
          aestheticAnswers['preferred-style'] === 'traditional' ||
          aestheticAnswers['preferred-style'] === 'farmhouse'
        )
          score += 1;
        break;
      case 'proven-solutions':
        if (maintenanceAnswers['prefer-proven'] === 'yes') score += 1;
        break;
    }
  });

  return indicatorCount > 0 ? score / indicatorCount : 0;
}

/**
 * Identify decision-making style
 */
function identifyDecisionStyle(responses) {
  const userAnswers = responses['user-profile'] || {};
  const scores = {
    analytical: 0,
    intuitive: 0,
    practical: 0,
    collaborative: 0,
  };

  // Analytical indicators
  if (userAnswers['research-approach'] === 'extensive') scores.analytical += 2;
  if (userAnswers['comparison-shopping'] === 'yes') scores.analytical += 1;
  if (userAnswers['needs-specs'] === 'yes') scores.analytical += 1;

  // Intuitive indicators
  if (userAnswers['decision-style'] === 'visual') scores.intuitive += 2;
  if (userAnswers['inspiration-source'] === 'pinterest-instagram') scores.intuitive += 1;
  if (userAnswers['trust-gut'] === 'yes') scores.intuitive += 1;

  // Practical indicators
  if (userAnswers['decision-factor'] === 'function') scores.practical += 2;
  if (userAnswers['roi-focus'] === 'yes') scores.practical += 1;
  if (userAnswers['problem-solving'] === 'priority') scores.practical += 1;

  // Collaborative indicators
  if (userAnswers['decision-maker'] === 'family') scores.collaborative += 2;
  if (userAnswers['seeks-opinions'] === 'yes') scores.collaborative += 1;
  if (userAnswers['shares-decisions'] === 'yes') scores.collaborative += 1;

  // Find dominant style
  const dominant = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  return {
    dominant: dominant[0],
    style: DECISION_STYLES[dominant[0]],
    scores,
    confidence: dominant[1] >= 3 ? 'high' : dominant[1] >= 2 ? 'medium' : 'low',
  };
}

/**
 * Identify lifestyle pattern
 */
function identifyLifestylePattern(responses) {
  const userAnswers = responses['user-profile'] || {};
  const householdSize = parseInt(userAnswers['household-size'], 10) || 2;
  const hasChildren = userAnswers['has-children'] === 'yes';
  const childrenAges = userAnswers['children-ages'] || [];

  let pattern = 'young-professional'; // Default

  if (hasChildren) {
    const hasYoungChildren = childrenAges.some((age) =>
      ['infant', 'toddler', 'elementary'].includes(age)
    );
    const hasTeens = childrenAges.some((age) => ['middle-school', 'high-school'].includes(age));

    if (hasYoungChildren) {
      pattern = 'growing-family';
    } else if (hasTeens) {
      pattern = 'established-family';
    }
  } else if (userAnswers['life-stage'] === 'empty-nester') {
    pattern = 'empty-nesters';
  } else if (userAnswers['life-stage'] === 'retired') {
    pattern = 'retirees';
  } else if (userAnswers['has-elderly'] === 'yes' || householdSize >= 5) {
    pattern = 'multi-generational';
  }

  return {
    pattern,
    details: LIFESTYLE_PATTERNS[pattern],
    confidence: hasChildren || userAnswers['life-stage'] ? 0.85 : 0.65,
  };
}

/**
 * Calculate preference coherence
 */
function calculatePreferenceCoherence(responses) {
  let coherenceScore = 100;
  const issues = [];
  const strengths = [];

  // Check budget vs expectations
  const budgetAnswers = responses['budget-constraints'] || {};
  const aestheticAnswers = responses['aesthetic-preferences'] || {};

  const budgetLevel = getBudgetLevel(budgetAnswers['total-budget']);
  const expectationLevel = getExpectationLevel(aestheticAnswers);

  if (expectationLevel > budgetLevel + 1) {
    coherenceScore -= 20;
    issues.push({
      type: 'budget-expectation',
      severity: 'high',
      message: {
        en: 'Expectations may exceed budget',
        fr: 'Les attentes peuvent dépasser le budget',
      },
      suggestion: {
        en: 'Consider prioritizing must-haves vs nice-to-haves',
        fr: 'Envisagez de prioriser les indispensables vs les souhaitables',
      },
    });
  } else if (expectationLevel <= budgetLevel) {
    strengths.push({
      type: 'budget-alignment',
      message: {
        en: 'Budget and expectations are well-aligned',
        fr: 'Budget et attentes sont bien alignés',
      },
    });
  }

  // Check style consistency
  const styleMatches = checkStyleConsistency(aestheticAnswers);
  if (!styleMatches.consistent) {
    coherenceScore -= styleMatches.penalty;
    issues.push({
      type: 'style-consistency',
      severity: 'medium',
      message: styleMatches.message,
      suggestion: styleMatches.suggestion,
    });
  } else {
    strengths.push({
      type: 'style-consistency',
      message: {
        en: 'Style preferences are consistent',
        fr: 'Les préférences de style sont cohérentes',
      },
    });
  }

  // Check lifestyle vs features
  const lifestyleMatch = checkLifestyleFeatureMatch(responses);
  if (!lifestyleMatch.aligned) {
    coherenceScore -= lifestyleMatch.penalty;
    issues.push({
      type: 'lifestyle-feature',
      severity: lifestyleMatch.penalty > 15 ? 'high' : 'medium',
      message: lifestyleMatch.message,
      suggestion: lifestyleMatch.suggestion,
    });
  }

  // Check priorities consistency
  const priorityConsistency = checkPriorityConsistency(responses);
  if (!priorityConsistency.consistent) {
    coherenceScore -= priorityConsistency.penalty;
    issues.push({
      type: 'priority-conflict',
      severity: 'medium',
      message: priorityConsistency.message,
      suggestion: priorityConsistency.suggestion,
    });
  }

  return {
    score: Math.max(0, coherenceScore),
    issues,
    strengths,
    isCoherent: coherenceScore >= 70,
    summary:
      coherenceScore >= 85
        ? { en: 'Your preferences are highly coherent', fr: 'Vos préférences sont très cohérentes' }
        : coherenceScore >= 70
          ? {
              en: 'Your preferences are mostly aligned',
              fr: 'Vos préférences sont généralement alignées',
            }
          : {
              en: 'Some preference conflicts to address',
              fr: 'Certains conflits de préférences à résoudre',
            },
  };
}

/**
 * Get budget level as number
 */
function getBudgetLevel(budgetKey) {
  const levels = {
    'under-10k': 1,
    '10k-25k': 2,
    '25k-50k': 3,
    '50k-75k': 4,
    '75k-100k': 5,
    'over-100k': 6,
  };
  return levels[budgetKey] || 3;
}

/**
 * Get expectation level from aesthetic preferences
 */
function getExpectationLevel(aestheticAnswers) {
  let level = 3;

  if (aestheticAnswers['countertop-material'] === 'marble') level += 2;
  else if (aestheticAnswers['countertop-material'] === 'quartzite') level += 1.5;
  else if (aestheticAnswers['countertop-material'] === 'quartz') level += 0.5;

  if (aestheticAnswers['cabinet-style'] === 'custom') level += 2;
  else if (aestheticAnswers['cabinet-style'] === 'semi-custom') level += 1;

  if (aestheticAnswers['appliance-finish'] === 'professional') level += 1.5;
  else if (aestheticAnswers['appliance-finish'] === 'panel-ready') level += 1;

  if (aestheticAnswers['design-importance'] === 'very-important') level += 0.5;

  return Math.min(6, level);
}

/**
 * Check style consistency
 */
function checkStyleConsistency(aestheticAnswers) {
  const preferredStyle = aestheticAnswers['preferred-style'];
  const cabinetStyle = aestheticAnswers['cabinet-style'];
  const colorScheme = aestheticAnswers['color-scheme'];

  const styleCompatibility = {
    modern: {
      cabinets: ['flat-panel', 'slab', 'handleless'],
      colors: ['white', 'gray', 'black', 'high-contrast'],
    },
    traditional: {
      cabinets: ['raised-panel', 'inset', 'beaded'],
      colors: ['cream', 'warm-wood', 'rich-tones'],
    },
    transitional: {
      cabinets: ['shaker', 'flat-panel', 'recessed-panel'],
      colors: ['white', 'gray', 'greige', 'neutral'],
    },
    farmhouse: {
      cabinets: ['shaker', 'beadboard', 'open-shelving'],
      colors: ['white', 'sage', 'natural-wood', 'cream'],
    },
    contemporary: {
      cabinets: ['flat-panel', 'slab', 'glass-front'],
      colors: ['bold', 'high-contrast', 'monochromatic'],
    },
    industrial: {
      cabinets: ['flat-panel', 'metal', 'open-shelving'],
      colors: ['gray', 'black', 'natural-wood', 'raw'],
    },
  };

  const compatible = styleCompatibility[preferredStyle] || { cabinets: [], colors: [] };

  let consistent = true;
  let penalty = 0;
  let message = null;
  let suggestion = null;

  if (
    cabinetStyle &&
    compatible.cabinets.length > 0 &&
    !compatible.cabinets.includes(cabinetStyle)
  ) {
    consistent = false;
    penalty = 10;
    message = {
      en: `${cabinetStyle} cabinets may not align with ${preferredStyle} style`,
      fr: `Les armoires ${cabinetStyle} peuvent ne pas correspondre au style ${preferredStyle}`,
    };
    suggestion = {
      en: `Consider ${compatible.cabinets[0]} cabinets for ${preferredStyle} style`,
      fr: `Envisagez des armoires ${compatible.cabinets[0]} pour le style ${preferredStyle}`,
    };
  }

  return { consistent, penalty, message, suggestion };
}

/**
 * Check lifestyle and feature alignment
 */
function checkLifestyleFeatureMatch(responses) {
  const cookingAnswers = responses['cooking-habits'] || {};
  const spatialAnswers = responses['spatial-constraints'] || {};
  const socialAnswers = responses['social-usage'] || {};

  // Heavy cook with small space
  if (
    cookingAnswers['cooking-frequency'] === 'daily-extensive' &&
    spatialAnswers['kitchen-size'] === 'small'
  ) {
    return {
      aligned: false,
      penalty: 15,
      message: {
        en: 'Extensive cooking needs may be challenging in small space',
        fr: 'Les besoins de cuisine extensive peuvent être difficiles dans un petit espace',
      },
      suggestion: {
        en: 'Focus on vertical storage and efficient layout to maximize functionality',
        fr: 'Concentrez-vous sur le rangement vertical et une disposition efficace pour maximiser la fonctionnalité',
      },
    };
  }

  // Frequent entertaining with closed layout preference
  if (
    socialAnswers['entertaining-frequency'] === 'frequently' &&
    spatialAnswers['layout-preference'] === 'galley'
  ) {
    return {
      aligned: false,
      penalty: 12,
      message: {
        en: 'Galley layout may limit entertaining flow',
        fr: 'La disposition galley peut limiter la circulation pour recevoir',
      },
      suggestion: {
        en: 'Consider L-shaped or open layout for better entertaining',
        fr: 'Envisagez une disposition en L ou ouverte pour mieux recevoir',
      },
    };
  }

  return { aligned: true, penalty: 0 };
}

/**
 * Check priority consistency
 */
function checkPriorityConsistency(responses) {
  const budgetAnswers = responses['budget-constraints'] || {};
  const priorities = budgetAnswers['priority-spending'] || [];
  const savings = budgetAnswers['savings-areas'] || [];

  // Check if same category appears in both priorities and savings
  const conflict = priorities.find((p) => savings.includes(p));

  if (conflict) {
    return {
      consistent: false,
      penalty: 8,
      message: {
        en: `${conflict} appears in both priority spending and savings areas`,
        fr: `${conflict} apparaît à la fois dans les dépenses prioritaires et les zones d'économie`,
      },
      suggestion: {
        en: 'Clarify whether this category should receive more or less investment',
        fr: "Clarifiez si cette catégorie devrait recevoir plus ou moins d'investissement",
      },
    };
  }

  return { consistent: true, penalty: 0 };
}

/**
 * Calculate preference strength (how decisive the user is)
 */
function calculatePreferenceStrength(responses) {
  let definedPreferences = 0;
  let totalPossiblePreferences = 0;

  const sections = [
    'aesthetic-preferences',
    'budget-constraints',
    'cooking-habits',
    'social-usage',
    'technology-preferences',
    'environmental-concerns',
  ];

  sections.forEach((section) => {
    const answers = responses[section] || {};
    const keyQuestions = getKeyQuestionsForSection(section);

    keyQuestions.forEach((question) => {
      totalPossiblePreferences++;
      if (
        answers[question] &&
        answers[question] !== 'unsure' &&
        answers[question] !== 'no-preference'
      ) {
        definedPreferences++;
      }
    });
  });

  const strength = totalPossiblePreferences > 0 ? definedPreferences / totalPossiblePreferences : 0;

  return {
    score: Math.round(strength * 100),
    level: strength >= 0.8 ? 'decisive' : strength >= 0.6 ? 'moderate' : 'exploratory',
    defined: definedPreferences,
    total: totalPossiblePreferences,
    interpretation:
      strength >= 0.8
        ? {
            en: 'You have clear preferences - recommendations will be specific',
            fr: 'Vous avez des préférences claires - les recommandations seront spécifiques',
          }
        : strength >= 0.6
          ? {
              en: "You have moderate preferences - we'll offer options",
              fr: 'Vous avez des préférences modérées - nous offrirons des options',
            }
          : {
              en: "You're still exploring - we'll help you discover your preferences",
              fr: 'Vous explorez encore - nous vous aiderons à découvrir vos préférences',
            },
  };
}

/**
 * Get key questions for a section
 */
function getKeyQuestionsForSection(section) {
  const keyQuestions = {
    'aesthetic-preferences': [
      'preferred-style',
      'color-scheme',
      'countertop-material',
      'cabinet-style',
    ],
    'budget-constraints': ['total-budget', 'priority-spending', 'budget-flexibility'],
    'cooking-habits': ['cooking-frequency', 'skill-level', 'cuisine-types'],
    'social-usage': ['entertaining-frequency', 'multi-cook', 'kitchen-as-hub'],
    'technology-preferences': ['smart-home-interest', 'tech-comfort'],
    'environmental-concerns': ['eco-priority', 'energy-efficiency'],
  };
  return keyQuestions[section] || [];
}

/**
 * Calculate clarity score
 */
function calculateClarityScore(analysis) {
  const weights = {
    coherence: 0.3,
    preferenceStrength: 0.25,
    patternClarity: 0.25,
    segmentConfidence: 0.2,
  };

  let score = 0;

  // Coherence contribution
  score += (analysis.coherence.score / 100) * weights.coherence * 100;

  // Preference strength contribution
  score += (analysis.preferenceStrength.score / 100) * weights.preferenceStrength * 100;

  // Pattern clarity (average confidence of identified patterns)
  if (analysis.patterns.length > 0) {
    const avgPatternConfidence =
      analysis.patterns.reduce((sum, p) => sum + p.confidence, 0) / analysis.patterns.length;
    score += avgPatternConfidence * weights.patternClarity * 100;
  } else {
    score += 50 * weights.patternClarity; // Neutral if no patterns
  }

  // Segment confidence
  if (analysis.segments.length > 0) {
    const avgSegmentConfidence =
      analysis.segments.reduce((sum, s) => sum + (s.confidence || 0.7), 0) /
      analysis.segments.length;
    score += avgSegmentConfidence * weights.segmentConfidence * 100;
  } else {
    score += 50 * weights.segmentConfidence;
  }

  return Math.round(score);
}

/**
 * Generate preference-based recommendations
 */
function generatePreferenceRecommendations(analysis, responses) {
  const recommendations = [];

  // Based on persona
  if (analysis.persona?.primary) {
    const persona = analysis.persona.primary;
    recommendations.push({
      id: 'persona-match',
      type: 'approach',
      priority: 'high',
      title: { en: `Tailored for ${persona.name.en}`, fr: `Adapté pour ${persona.name.fr}` },
      description: {
        en: `Your profile matches the ${persona.name.en} persona. We'll prioritize ${persona.priorities.slice(0, 2).join(' and ')}.`,
        fr: `Votre profil correspond au persona ${persona.name.fr}. Nous prioriserons ${persona.priorities.slice(0, 2).join(' et ')}.`,
      },
      recommendations: persona.recommendations,
    });
  }

  // Based on patterns
  analysis.patterns.forEach((pattern) => {
    if (pattern.confidence >= 0.75) {
      recommendations.push({
        id: `pattern-${pattern.id}`,
        type: 'approach',
        priority: pattern.confidence >= 0.85 ? 'high' : 'medium',
        title: { en: pattern.description.en, fr: pattern.description.fr },
        description: pattern.recommendations.approach,
        implications: pattern.implications,
      });
    }
  });

  // Based on coherence issues
  if (!analysis.coherence.isCoherent) {
    analysis.coherence.issues.forEach((issue) => {
      recommendations.push({
        id: `address-${issue.type}`,
        type: 'planning',
        priority: issue.severity === 'high' ? 'high' : 'medium',
        title: { en: 'Review Preferences', fr: 'Revoir les préférences' },
        description: issue.message,
        suggestion: issue.suggestion,
      });
    });
  }

  // Based on decision style
  if (analysis.decisionStyle?.dominant) {
    const style = analysis.decisionStyle.style;
    recommendations.push({
      id: 'decision-support',
      type: 'communication',
      priority: 'low',
      title: { en: "How We'll Help You Decide", fr: 'Comment nous vous aiderons à décider' },
      description: style.approach,
      contentTypes: style.contentType,
    });
  }

  // Based on lifestyle pattern
  if (analysis.lifestylePattern?.details) {
    const lifestyle = analysis.lifestylePattern.details;
    recommendations.push({
      id: 'lifestyle-fit',
      type: 'feature',
      priority: 'medium',
      title: {
        en: 'Lifestyle-Optimized Features',
        fr: 'Caractéristiques optimisées pour le mode de vie',
      },
      description: {
        en: `Based on your ${analysis.lifestylePattern.pattern} lifestyle, we recommend focusing on: ${lifestyle.kitchenNeeds.join(', ')}.`,
        fr: `Basé sur votre mode de vie ${analysis.lifestylePattern.pattern}, nous recommandons de vous concentrer sur: ${lifestyle.kitchenNeeds.join(', ')}.`,
      },
    });
  }

  // Based on segments
  analysis.segments.forEach((segment) => {
    if (segment.type === 'cooking' && segment.value) {
      recommendations.push({
        id: `cooking-${segment.value}`,
        type: 'feature',
        priority: 'high',
        title: {
          en: 'Cooking-Focused Recommendations',
          fr: 'Recommandations axées sur la cuisine',
        },
        description: {
          en: `As a ${segment.value.replace(/-/g, ' ')}, consider: ${segment.implications.slice(0, 3).join(', ')}.`,
          fr: `En tant que ${segment.value.replace(/-/g, ' ')}, envisagez: ${segment.implications.slice(0, 3).join(', ')}.`,
        },
        implications: segment.implications,
      });
    }
  });

  return recommendations;
}

module.exports = {
  analyzePreferences,
  buildUserProfile,
  extractPriorities,
  identifyPatterns,
  determineUserSegments,
  identifyUserPersona,
  identifyDecisionStyle,
  identifyLifestylePattern,
  calculatePreferenceCoherence,
  calculatePreferenceStrength,
  calculateClarityScore,
  generatePreferenceRecommendations,
  PREFERENCE_WEIGHTS,
  USER_PERSONAS,
  DECISION_STYLES,
  LIFESTYLE_PATTERNS,
};
