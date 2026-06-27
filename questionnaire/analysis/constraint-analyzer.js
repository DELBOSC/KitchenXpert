/**
 * Constraint Analyzer Module
 *
 * Advanced constraint analysis system that identifies, categorizes, prioritizes,
 * and resolves conflicts between project constraints. Uses sophisticated algorithms
 * for dependency analysis, impact assessment, and resolution strategy generation.
 */

/**
 * Constraint categories with detailed classification
 */
const CONSTRAINT_CATEGORIES = {
  budget: {
    weight: 0.3,
    type: 'resource',
    flexibility: 'medium',
    impacts: ['material-choices', 'appliance-selection', 'scope', 'labor-quality', 'timeline'],
    dependencies: ['timeline', 'spatial'],
    mitigationStrategies: ['phased-approach', 'value-engineering', 'financing', 'scope-reduction'],
    description: {
      en: 'Financial limitations affecting project scope and quality',
      fr: 'Limitations financières affectant la portée et la qualité du projet',
    },
  },
  spatial: {
    weight: 0.25,
    type: 'physical',
    flexibility: 'low',
    impacts: [
      'layout-options',
      'appliance-sizes',
      'storage-capacity',
      'traffic-flow',
      'work-triangle',
    ],
    dependencies: ['structural', 'budget'],
    mitigationStrategies: [
      'creative-layout',
      'compact-appliances',
      'vertical-storage',
      'multi-function-zones',
    ],
    description: {
      en: 'Physical space limitations determining layout possibilities',
      fr: "Limitations d'espace physique déterminant les possibilités d'aménagement",
    },
  },
  structural: {
    weight: 0.22,
    type: 'physical',
    flexibility: 'very-low',
    impacts: ['layout-changes', 'plumbing', 'electrical', 'hvac', 'load-distribution'],
    dependencies: ['budget', 'timeline', 'regulatory'],
    mitigationStrategies: ['work-around-design', 'engineer-consultation', 'permit-acquisition'],
    description: {
      en: 'Building structure elements that cannot be easily modified',
      fr: 'Éléments de structure du bâtiment difficilement modifiables',
    },
  },
  regulatory: {
    weight: 0.18,
    type: 'legal',
    flexibility: 'none',
    impacts: ['layout-options', 'ventilation', 'electrical', 'plumbing', 'accessibility'],
    dependencies: ['structural', 'budget'],
    mitigationStrategies: ['code-compliant-design', 'permit-process', 'variance-request'],
    description: {
      en: 'Building codes, permits, and legal requirements',
      fr: 'Codes du bâtiment, permis et exigences légales',
    },
  },
  timeline: {
    weight: 0.15,
    type: 'temporal',
    flexibility: 'medium',
    impacts: ['scope', 'contractor-availability', 'material-lead-times', 'phasing'],
    dependencies: ['budget', 'structural'],
    mitigationStrategies: ['phased-renovation', 'fast-track-materials', 'parallel-work-streams'],
    description: {
      en: 'Time constraints affecting project execution',
      fr: "Contraintes de temps affectant l'exécution du projet",
    },
  },
  lifestyle: {
    weight: 0.12,
    type: 'preference',
    flexibility: 'high',
    impacts: [
      'feature-priorities',
      'durability-requirements',
      'layout-preferences',
      'appliance-selection',
    ],
    dependencies: ['budget', 'spatial'],
    mitigationStrategies: ['priority-ranking', 'phased-features', 'alternative-solutions'],
    description: {
      en: 'User lifestyle needs and preferences',
      fr: "Besoins et préférences de style de vie de l'utilisateur",
    },
  },
  environmental: {
    weight: 0.1,
    type: 'values',
    flexibility: 'high',
    impacts: ['material-choices', 'appliance-efficiency', 'ventilation', 'waste-management'],
    dependencies: ['budget', 'timeline'],
    mitigationStrategies: ['eco-alternatives', 'phased-upgrades', 'rebate-programs'],
    description: {
      en: 'Environmental and sustainability requirements',
      fr: 'Exigences environnementales et de durabilité',
    },
  },
  accessibility: {
    weight: 0.08,
    type: 'physical',
    flexibility: 'low',
    impacts: ['layout-options', 'counter-heights', 'appliance-placement', 'storage-access'],
    dependencies: ['spatial', 'regulatory', 'budget'],
    mitigationStrategies: ['universal-design', 'ada-compliance', 'adaptive-features'],
    description: {
      en: 'Accessibility needs for users with mobility or other requirements',
      fr: "Besoins d'accessibilité pour utilisateurs à mobilité réduite ou autres besoins",
    },
  },
};

/**
 * Constraint severity levels with impact multipliers
 */
const SEVERITY_LEVELS = {
  critical: {
    multiplier: 2.0,
    canOverride: false,
    requiresResolution: true,
    description: {
      en: 'Must be resolved before proceeding',
      fr: 'Doit être résolu avant de procéder',
    },
  },
  high: {
    multiplier: 1.5,
    canOverride: false,
    requiresResolution: true,
    description: {
      en: 'Significant impact on project success',
      fr: 'Impact significatif sur le succès du projet',
    },
  },
  medium: {
    multiplier: 1.0,
    canOverride: true,
    requiresResolution: false,
    description: {
      en: 'Moderate impact, should be addressed',
      fr: 'Impact modéré, devrait être traité',
    },
  },
  low: {
    multiplier: 0.5,
    canOverride: true,
    requiresResolution: false,
    description: {
      en: 'Minor impact, can be managed',
      fr: 'Impact mineur, peut être géré',
    },
  },
};

/**
 * Conflict types with resolution strategies
 */
const CONFLICT_TYPES = {
  'budget-expectation': {
    description: {
      en: 'Budget cannot support desired features or materials',
      fr: 'Le budget ne peut pas supporter les caractéristiques ou matériaux souhaités',
    },
    resolutionStrategies: [
      'value-engineering',
      'phased-implementation',
      'alternative-materials',
      'scope-reduction',
      'financing-options',
    ],
  },
  'space-feature': {
    description: {
      en: 'Available space cannot accommodate desired features',
      fr: "L'espace disponible ne peut pas accueillir les caractéristiques souhaitées",
    },
    resolutionStrategies: [
      'compact-alternatives',
      'multi-function-solutions',
      'vertical-utilization',
      'feature-prioritization',
      'creative-layout',
    ],
  },
  'structural-layout': {
    description: {
      en: 'Structural elements prevent desired layout changes',
      fr: 'Les éléments structurels empêchent les changements de disposition souhaités',
    },
    resolutionStrategies: [
      'work-around-design',
      'structural-engineering',
      'alternative-layout',
      'feature-relocation',
      'accept-limitation',
    ],
  },
  'timeline-scope': {
    description: {
      en: 'Project scope exceeds available timeline',
      fr: 'La portée du projet dépasse le calendrier disponible',
    },
    resolutionStrategies: [
      'phased-approach',
      'scope-reduction',
      'timeline-extension',
      'parallel-workstreams',
      'pre-fabrication',
    ],
  },
  'values-budget': {
    description: {
      en: 'Value preferences (eco, quality) exceed budget capacity',
      fr: 'Les préférences de valeurs (éco, qualité) dépassent la capacité budgétaire',
    },
    resolutionStrategies: [
      'priority-ranking',
      'selective-premium',
      'rebate-utilization',
      'phased-upgrades',
      'value-alternatives',
    ],
  },
  'accessibility-space': {
    description: {
      en: 'Accessibility requirements conflict with space constraints',
      fr: "Les exigences d'accessibilité entrent en conflit avec les contraintes d'espace",
    },
    resolutionStrategies: [
      'universal-design',
      'adaptive-solutions',
      'priority-zones',
      'layout-optimization',
      'specialized-equipment',
    ],
  },
  'regulatory-preference': {
    description: {
      en: 'Desired features conflict with building codes',
      fr: 'Les caractéristiques souhaitées entrent en conflit avec les codes du bâtiment',
    },
    resolutionStrategies: [
      'code-compliant-alternative',
      'variance-request',
      'design-modification',
      'accept-limitation',
    ],
  },
  'lifestyle-budget': {
    description: {
      en: 'Lifestyle requirements exceed budget capacity',
      fr: 'Les exigences de style de vie dépassent la capacité budgétaire',
    },
    resolutionStrategies: [
      'priority-ranking',
      'phased-features',
      'alternative-solutions',
      'budget-reallocation',
      'diy-options',
    ],
  },
};

/**
 * Budget levels for constraint analysis
 */
const BUDGET_LEVELS = {
  'under-10k': {
    level: 1,
    tier: 'entry',
    maxQuality: 'value',
    limitations: ['scope', 'materials', 'appliances'],
  },
  '10k-25k': {
    level: 2,
    tier: 'budget',
    maxQuality: 'value-plus',
    limitations: ['scope', 'premium-materials'],
  },
  '25k-50k': { level: 3, tier: 'mid', maxQuality: 'mid-range', limitations: ['luxury-materials'] },
  '50k-75k': { level: 4, tier: 'mid-high', maxQuality: 'premium', limitations: ['bespoke-items'] },
  '75k-100k': { level: 5, tier: 'luxury', maxQuality: 'luxury', limitations: [] },
  'over-100k': { level: 6, tier: 'ultra-luxury', maxQuality: 'bespoke', limitations: [] },
};

/**
 * Material cost tiers for conflict detection
 */
const MATERIAL_COST_TIERS = {
  countertops: {
    laminate: 1,
    'butcher-block': 2,
    'solid-surface': 2,
    quartz: 3,
    'quartz-premium': 4,
    granite: 3,
    'granite-premium': 4,
    marble: 5,
    'marble-premium': 6,
    quartzite: 5,
  },
  cabinets: {
    stock: 1,
    rta: 1,
    'semi-custom': 3,
    custom: 5,
    'luxury-custom': 6,
  },
  flooring: {
    vinyl: 1,
    lvp: 2,
    laminate: 2,
    'ceramic-tile': 2,
    'porcelain-tile': 3,
    hardwood: 4,
    'natural-stone': 5,
  },
  appliances: {
    basic: 1,
    standard: 2,
    'mid-range': 3,
    premium: 4,
    professional: 5,
    commercial: 6,
  },
};

/**
 * Size constraints for layout feasibility
 */
const SIZE_CONSTRAINTS = {
  small: {
    maxSqFt: 70,
    feasibleLayouts: ['galley', 'one-wall', 'l-shaped-compact'],
    islandFeasible: false,
    maxAppliances: 4,
    storageCapacity: 'limited',
  },
  medium: {
    maxSqFt: 150,
    feasibleLayouts: ['galley', 'one-wall', 'l-shaped', 'u-shaped-compact', 'small-peninsula'],
    islandFeasible: 'small-cart',
    maxAppliances: 6,
    storageCapacity: 'moderate',
  },
  large: {
    maxSqFt: 250,
    feasibleLayouts: ['l-shaped', 'u-shaped', 'peninsula', 'small-island'],
    islandFeasible: 'small-island',
    maxAppliances: 8,
    storageCapacity: 'good',
  },
  'extra-large': {
    maxSqFt: Infinity,
    feasibleLayouts: ['all'],
    islandFeasible: 'large-island',
    maxAppliances: 12,
    storageCapacity: 'extensive',
  },
};

/**
 * Main constraint analysis function
 */
function analyzeConstraints(responses) {
  const analysis = {
    constraints: [],
    conflicts: [],
    dependencies: [],
    prioritizedList: [],
    feasibilityScore: 100,
    riskAssessment: {},
    recommendations: [],
    resolutionPlan: [],
    summary: {},
  };

  // Collect all constraints from responses
  analysis.constraints = collectAllConstraints(responses);

  // Analyze dependencies between constraints
  analysis.dependencies = analyzeDependencies(analysis.constraints);

  // Identify conflicts between constraints and preferences
  analysis.conflicts = identifyConflicts(analysis.constraints, responses);

  // Prioritize constraints by impact and urgency
  analysis.prioritizedList = prioritizeConstraints(analysis.constraints, analysis.conflicts);

  // Calculate overall feasibility score
  analysis.feasibilityScore = calculateFeasibility(analysis);

  // Perform risk assessment
  analysis.riskAssessment = assessRisks(analysis);

  // Generate resolution plan for conflicts
  analysis.resolutionPlan = generateResolutionPlan(
    analysis.conflicts,
    analysis.constraints,
    responses
  );

  // Generate recommendations
  analysis.recommendations = generateConstraintRecommendations(analysis, responses);

  // Create summary
  analysis.summary = generateSummary(analysis);

  return analysis;
}

/**
 * Collect all constraints from questionnaire responses
 */
function collectAllConstraints(responses) {
  const constraints = [];

  // Budget constraints
  collectBudgetConstraints(responses, constraints);

  // Spatial constraints
  collectSpatialConstraints(responses, constraints);

  // Structural constraints
  collectStructuralConstraints(responses, constraints);

  // Regulatory constraints
  collectRegulatoryConstraints(responses, constraints);

  // Timeline constraints
  collectTimelineConstraints(responses, constraints);

  // Lifestyle constraints
  collectLifestyleConstraints(responses, constraints);

  // Environmental constraints
  collectEnvironmentalConstraints(responses, constraints);

  // Accessibility constraints
  collectAccessibilityConstraints(responses, constraints);

  return constraints;
}

/**
 * Collect budget-related constraints
 */
function collectBudgetConstraints(responses, constraints) {
  const budgetAnswers = responses['budget-constraints'] || {};

  if (budgetAnswers['total-budget']) {
    const budgetInfo = BUDGET_LEVELS[budgetAnswers['total-budget']] || BUDGET_LEVELS['25k-50k'];
    const flexibility = parseInt(budgetAnswers['budget-flexibility'], 10) || 3;

    constraints.push({
      id: 'total-budget',
      category: 'budget',
      type: flexibility <= 2 ? 'hard' : 'soft',
      severity: flexibility <= 2 ? 'high' : 'medium',
      value: budgetAnswers['total-budget'],
      budgetLevel: budgetInfo.level,
      budgetTier: budgetInfo.tier,
      flexibility: flexibility,
      limitations: budgetInfo.limitations,
      description: {
        en: `Total budget: ${formatBudgetRange(budgetAnswers['total-budget'])} (Flexibility: ${flexibility}/5)`,
        fr: `Budget total: ${formatBudgetRange(budgetAnswers['total-budget'])} (Flexibilité: ${flexibility}/5)`,
      },
      implications: {
        en:
          budgetInfo.limitations.length > 0
            ? `Limited to ${budgetInfo.maxQuality} quality level. Restrictions: ${budgetInfo.limitations.join(', ')}`
            : 'No significant limitations at this budget level',
        fr:
          budgetInfo.limitations.length > 0
            ? `Limité au niveau de qualité ${budgetInfo.maxQuality}. Restrictions: ${budgetInfo.limitations.join(', ')}`
            : 'Aucune limitation significative à ce niveau de budget',
      },
    });
  }

  if (budgetAnswers['contingency-comfort'] === 'no-buffer') {
    constraints.push({
      id: 'no-contingency',
      category: 'budget',
      type: 'hard',
      severity: 'critical',
      description: {
        en: 'No contingency budget available - increases project risk significantly',
        fr: 'Aucun budget de contingence disponible - augmente significativement le risque du projet',
      },
      riskFactor: 1.5,
      recommendations: {
        en: [
          'Consider allocating at least 10% for unexpected costs',
          'Prioritize known-cost items to minimize surprises',
        ],
        fr: [
          "Envisagez d'allouer au moins 10% pour les coûts imprévus",
          'Priorisez les articles à coût connu pour minimiser les surprises',
        ],
      },
    });
  }

  if (budgetAnswers['financing-preference']) {
    const needsFinancing = ['loan', 'heloc', 'credit', 'payment-plan'].includes(
      budgetAnswers['financing-preference']
    );
    if (needsFinancing) {
      constraints.push({
        id: 'financing-needed',
        category: 'budget',
        type: 'soft',
        severity: 'low',
        value: budgetAnswers['financing-preference'],
        description: {
          en: `Project requires financing (${budgetAnswers['financing-preference']})`,
          fr: `Le projet nécessite un financement (${budgetAnswers['financing-preference']})`,
        },
        implications: {
          en: 'May affect timeline due to approval process; consider interest costs',
          fr: "Peut affecter le calendrier en raison du processus d'approbation; considérer les coûts d'intérêt",
        },
      });
    }
  }

  // Priority spending constraints
  if (budgetAnswers['budget-priorities']) {
    const priorities = Array.isArray(budgetAnswers['budget-priorities'])
      ? budgetAnswers['budget-priorities']
      : [budgetAnswers['budget-priorities']];

    constraints.push({
      id: 'budget-priorities',
      category: 'budget',
      type: 'soft',
      severity: 'low',
      value: priorities,
      description: {
        en: `Budget priorities: ${priorities.join(', ')}`,
        fr: `Priorités budgétaires: ${priorities.join(', ')}`,
      },
    });
  }
}

/**
 * Collect spatial constraints
 */
function collectSpatialConstraints(responses, constraints) {
  const spatialAnswers = responses['spatial-constraints'] || {};

  if (spatialAnswers['kitchen-size']) {
    const sizeInfo = SIZE_CONSTRAINTS[spatialAnswers['kitchen-size']] || SIZE_CONSTRAINTS['medium'];

    constraints.push({
      id: 'kitchen-size',
      category: 'spatial',
      type: 'hard',
      severity: spatialAnswers['kitchen-size'] === 'small' ? 'high' : 'medium',
      value: spatialAnswers['kitchen-size'],
      sizeInfo: sizeInfo,
      description: {
        en: `Kitchen size: ${spatialAnswers['kitchen-size']} (max ~${sizeInfo.maxSqFt} sq ft)`,
        fr: `Taille cuisine: ${spatialAnswers['kitchen-size']} (max ~${Math.round(sizeInfo.maxSqFt * 0.093)} m²)`,
      },
      feasibleLayouts: sizeInfo.feasibleLayouts,
      islandFeasibility: sizeInfo.islandFeasible,
      storageCapacity: sizeInfo.storageCapacity,
    });
  }

  if (spatialAnswers['ceiling-height']) {
    const isLow =
      spatialAnswers['ceiling-height'] === 'low' || spatialAnswers['ceiling-height'] === 'standard';
    if (isLow) {
      constraints.push({
        id: 'ceiling-height',
        category: 'spatial',
        type: 'hard',
        severity: 'low',
        value: spatialAnswers['ceiling-height'],
        description: {
          en: `Ceiling height: ${spatialAnswers['ceiling-height']} - limits tall cabinet options`,
          fr: `Hauteur plafond: ${spatialAnswers['ceiling-height']} - limite les options d'armoires hautes`,
        },
      });
    }
  }

  if (
    spatialAnswers['window-placement'] === 'multiple' ||
    spatialAnswers['window-placement'] === 'limited'
  ) {
    constraints.push({
      id: 'window-constraints',
      category: 'spatial',
      type: 'soft',
      severity: 'medium',
      value: spatialAnswers['window-placement'],
      description: {
        en: `Window placement affects upper cabinet and lighting options`,
        fr: `L'emplacement des fenêtres affecte les options d'armoires hautes et d'éclairage`,
      },
    });
  }

  if (spatialAnswers['door-count'] && parseInt(spatialAnswers['door-count'], 10) > 2) {
    constraints.push({
      id: 'multiple-doorways',
      category: 'spatial',
      type: 'soft',
      severity: 'medium',
      value: spatialAnswers['door-count'],
      description: {
        en: `Multiple doorways (${spatialAnswers['door-count']}) limit wall space for cabinets`,
        fr: `Plusieurs portes (${spatialAnswers['door-count']}) limitent l'espace mural pour les armoires`,
      },
    });
  }

  // Island preference constraint
  if (spatialAnswers['island-preference']) {
    constraints.push({
      id: 'island-preference',
      category: 'spatial',
      type: 'soft',
      severity: 'low',
      value: spatialAnswers['island-preference'],
      description: {
        en: `Island preference: ${spatialAnswers['island-preference']}`,
        fr: `Préférence d'îlot: ${spatialAnswers['island-preference']}`,
      },
    });
  }
}

/**
 * Collect structural constraints
 */
function collectStructuralConstraints(responses, constraints) {
  const spatialAnswers = responses['spatial-constraints'] || {};
  const structuralElements = spatialAnswers['structural-elements'] || [];

  if (structuralElements.includes('load-bearing-wall')) {
    constraints.push({
      id: 'load-bearing-wall',
      category: 'structural',
      type: 'hard',
      severity: 'critical',
      description: {
        en: 'Load-bearing walls significantly limit layout changes - requires structural engineering for modifications',
        fr: 'Les murs porteurs limitent significativement les changements de disposition - nécessite un ingénieur en structure pour les modifications',
      },
      impacts: ['layout-changes', 'open-concept'],
      mitigationCost: 'high',
    });
  }

  if (structuralElements.includes('plumbing-stack')) {
    constraints.push({
      id: 'plumbing-stack',
      category: 'structural',
      type: 'hard',
      severity: 'high',
      description: {
        en: 'Plumbing stack location affects sink and dishwasher placement - expensive to relocate',
        fr: "L'emplacement de la colonne de plomberie affecte le placement de l'évier et du lave-vaisselle - coûteux à déplacer",
      },
      impacts: ['sink-placement', 'dishwasher-placement'],
      mitigationCost: 'medium-high',
    });
  }

  if (structuralElements.includes('electrical-panel')) {
    constraints.push({
      id: 'electrical-panel',
      category: 'structural',
      type: 'soft',
      severity: 'medium',
      description: {
        en: 'Electrical panel location may require consideration in layout planning',
        fr: "L'emplacement du panneau électrique peut nécessiter une considération dans la planification de la disposition",
      },
      impacts: ['cabinet-placement', 'access-requirements'],
    });
  }

  if (structuralElements.includes('hvac-ductwork')) {
    constraints.push({
      id: 'hvac-ductwork',
      category: 'structural',
      type: 'soft',
      severity: 'medium',
      description: {
        en: 'HVAC ductwork may limit ceiling treatments and upper cabinet placement',
        fr: 'Les conduits CVC peuvent limiter les traitements de plafond et le placement des armoires hautes',
      },
      impacts: ['ceiling-design', 'ventilation-options'],
    });
  }

  if (structuralElements.includes('beam') || structuralElements.includes('column')) {
    constraints.push({
      id: 'structural-beam-column',
      category: 'structural',
      type: 'hard',
      severity: 'high',
      description: {
        en: 'Exposed beams or columns affect layout options - must work around these elements',
        fr: 'Les poutres ou colonnes exposées affectent les options de disposition - doit travailler autour de ces éléments',
      },
      impacts: ['layout-options', 'traffic-flow'],
    });
  }

  // Gas line constraints
  if (structuralElements.includes('gas-line')) {
    constraints.push({
      id: 'gas-line-location',
      category: 'structural',
      type: 'soft',
      severity: 'medium',
      description: {
        en: 'Gas line location affects range/cooktop placement options',
        fr: "L'emplacement de la conduite de gaz affecte les options de placement de la cuisinière",
      },
      impacts: ['appliance-placement'],
    });
  }
}

/**
 * Collect regulatory constraints
 */
function collectRegulatoryConstraints(responses, constraints) {
  const spatialAnswers = responses['spatial-constraints'] || {};
  const buildingType = spatialAnswers['building-type'] || 'single-family';

  // Condo/apartment specific regulations
  if (['condo', 'apartment', 'co-op'].includes(buildingType)) {
    constraints.push({
      id: 'hoa-restrictions',
      category: 'regulatory',
      type: 'hard',
      severity: 'high',
      description: {
        en: 'Building/HOA restrictions may limit renovation scope, working hours, and material choices',
        fr: 'Les restrictions de copropriété peuvent limiter la portée de la rénovation, les heures de travail et les choix de matériaux',
      },
      impacts: ['scope', 'timeline', 'noise-generating-work'],
      requirements: ['board-approval', 'insurance-requirements', 'contractor-licensing'],
    });
  }

  // Permit requirements based on scope
  const futureAnswers = responses['future-needs'] || {};
  if (
    ['full-gut', 'major-remodel', 'structural-changes'].includes(futureAnswers['renovation-scope'])
  ) {
    constraints.push({
      id: 'permits-required',
      category: 'regulatory',
      type: 'hard',
      severity: 'high',
      description: {
        en: 'Renovation scope requires building permits - adds time and inspection requirements',
        fr: "La portée de la rénovation nécessite des permis de construire - ajoute du temps et des exigences d'inspection",
      },
      impacts: ['timeline', 'cost'],
      timelineImpact: '2-6 weeks',
    });
  }

  // Historic building constraints
  if (spatialAnswers['building-age'] === 'historic' || spatialAnswers['historic-designation']) {
    constraints.push({
      id: 'historic-restrictions',
      category: 'regulatory',
      type: 'hard',
      severity: 'critical',
      description: {
        en: 'Historic designation requires preservation-compliant materials and methods',
        fr: 'La désignation historique nécessite des matériaux et méthodes conformes à la préservation',
      },
      impacts: ['material-choices', 'design-options', 'approval-process'],
    });
  }

  // Ventilation code requirements
  constraints.push({
    id: 'ventilation-code',
    category: 'regulatory',
    type: 'hard',
    severity: 'medium',
    description: {
      en: 'Kitchen ventilation must meet local building codes',
      fr: 'La ventilation de la cuisine doit respecter les codes du bâtiment locaux',
    },
    impacts: ['range-hood-selection', 'ductwork'],
  });

  // Electrical code requirements
  constraints.push({
    id: 'electrical-code',
    category: 'regulatory',
    type: 'hard',
    severity: 'medium',
    description: {
      en: 'Electrical work must meet code (GFCI outlets, dedicated circuits)',
      fr: 'Les travaux électriques doivent respecter le code (prises DDFT, circuits dédiés)',
    },
    impacts: ['outlet-placement', 'appliance-circuits'],
  });
}

/**
 * Collect timeline constraints
 */
function collectTimelineConstraints(responses, constraints) {
  const futureAnswers = responses['future-needs'] || {};

  if (futureAnswers['timeline']) {
    const timelineMapping = {
      urgent: { severity: 'critical', weeks: '< 4', flexibility: 'none' },
      soon: { severity: 'high', weeks: '4-8', flexibility: 'low' },
      moderate: { severity: 'medium', weeks: '8-16', flexibility: 'medium' },
      flexible: { severity: 'low', weeks: '16+', flexibility: 'high' },
      'no-rush': { severity: 'low', weeks: 'unlimited', flexibility: 'very-high' },
    };

    const timelineInfo = timelineMapping[futureAnswers['timeline']] || timelineMapping['moderate'];

    constraints.push({
      id: 'timeline',
      category: 'timeline',
      type:
        timelineInfo.severity === 'critical' || timelineInfo.severity === 'high' ? 'hard' : 'soft',
      severity: timelineInfo.severity,
      value: futureAnswers['timeline'],
      expectedWeeks: timelineInfo.weeks,
      flexibility: timelineInfo.flexibility,
      description: {
        en: `Desired timeline: ${futureAnswers['timeline']} (approximately ${timelineInfo.weeks} weeks)`,
        fr: `Calendrier souhaité: ${futureAnswers['timeline']} (environ ${timelineInfo.weeks} semaines)`,
      },
    });
  }

  // Event-driven deadlines
  if (futureAnswers['deadline-event']) {
    constraints.push({
      id: 'event-deadline',
      category: 'timeline',
      type: 'hard',
      severity: 'critical',
      value: futureAnswers['deadline-event'],
      description: {
        en: `Must complete before: ${futureAnswers['deadline-event']}`,
        fr: `Doit être terminé avant: ${futureAnswers['deadline-event']}`,
      },
      isFixed: true,
    });
  }

  // Temporary kitchen availability
  if (futureAnswers['temporary-kitchen'] === 'no') {
    constraints.push({
      id: 'no-temp-kitchen',
      category: 'timeline',
      type: 'soft',
      severity: 'high',
      description: {
        en: 'No temporary kitchen available - may require phased renovation approach',
        fr: 'Pas de cuisine temporaire disponible - peut nécessiter une approche de rénovation par phases',
      },
      impacts: ['phasing', 'scope-per-phase'],
    });
  }
}

/**
 * Collect lifestyle constraints
 */
function collectLifestyleConstraints(responses, constraints) {
  const cookingAnswers = responses['cooking-habits'] || {};
  const socialAnswers = responses['social-usage'] || {};

  // Heavy cooking requirements
  if (cookingAnswers['cooking-frequency'] === 'daily-extensive') {
    constraints.push({
      id: 'heavy-cooking-use',
      category: 'lifestyle',
      type: 'soft',
      severity: 'medium',
      description: {
        en: 'Heavy daily cooking requires durable materials, professional-grade ventilation, and ample prep space',
        fr: 'La cuisine quotidienne intensive nécessite des matériaux durables, une ventilation de qualité professionnelle et un espace de préparation ample',
      },
      requirements: [
        'durable-countertops',
        'high-cfm-hood',
        'ample-prep-area',
        'quality-appliances',
      ],
    });
  }

  // Professional cooking
  if (
    cookingAnswers['cooking-level'] === 'professional' ||
    cookingAnswers['cooking-level'] === 'advanced'
  ) {
    constraints.push({
      id: 'professional-cooking',
      category: 'lifestyle',
      type: 'soft',
      severity: 'medium',
      description: {
        en: 'Professional-level cooking requires commercial-grade appliances and specialized workspace',
        fr: 'La cuisine de niveau professionnel nécessite des appareils de qualité commerciale et un espace de travail spécialisé',
      },
      requirements: ['pro-range', 'commercial-hood', 'prep-sink', 'extensive-storage'],
    });
  }

  // Frequent entertaining
  if (
    socialAnswers['entertaining-frequency'] === 'frequently' ||
    socialAnswers['entertaining-frequency'] === 'very-frequently'
  ) {
    constraints.push({
      id: 'frequent-entertaining',
      category: 'lifestyle',
      type: 'soft',
      severity: 'medium',
      description: {
        en: 'Frequent entertaining requires open layout, seating capacity, and social kitchen features',
        fr: "Les réceptions fréquentes nécessitent une disposition ouverte, une capacité d'assise et des caractéristiques de cuisine sociale",
      },
      requirements: ['open-layout', 'island-seating', 'beverage-center', 'traffic-flow'],
    });
  }

  // Family with children
  if (
    socialAnswers['household-composition']?.includes('children') ||
    socialAnswers['children-ages']
  ) {
    constraints.push({
      id: 'family-with-children',
      category: 'lifestyle',
      type: 'soft',
      severity: 'medium',
      description: {
        en: 'Family with children requires safety features, durable finishes, and family-friendly layout',
        fr: 'Une famille avec enfants nécessite des dispositifs de sécurité, des finitions durables et une disposition adaptée aux familles',
      },
      requirements: ['safety-features', 'durable-finishes', 'easy-clean-surfaces', 'homework-area'],
    });
  }

  // Pet considerations
  if (socialAnswers['pets']) {
    constraints.push({
      id: 'pet-owners',
      category: 'lifestyle',
      type: 'soft',
      severity: 'low',
      description: {
        en: 'Pet ownership considerations: durable flooring, pet feeding station, storage for supplies',
        fr: "Considérations pour propriétaires d'animaux: revêtement de sol durable, station d'alimentation, rangement pour fournitures",
      },
      requirements: ['scratch-resistant-flooring', 'pet-feeding-area', 'supply-storage'],
    });
  }

  // Multiple cooks
  if (
    cookingAnswers['multiple-cooks'] === 'yes' ||
    cookingAnswers['multiple-cooks'] === 'frequently'
  ) {
    constraints.push({
      id: 'multiple-cooks',
      category: 'lifestyle',
      type: 'soft',
      severity: 'medium',
      description: {
        en: 'Multiple cooks require wider aisles, multiple work zones, and possibly double sinks',
        fr: 'Plusieurs cuisiniers nécessitent des allées plus larges, plusieurs zones de travail et possiblement des éviers doubles',
      },
      requirements: ['wider-aisles', 'multiple-work-zones', 'multiple-sinks'],
    });
  }
}

/**
 * Collect environmental constraints
 */
function collectEnvironmentalConstraints(responses, constraints) {
  const envAnswers = responses['environmental-concerns'] || {};

  if (
    envAnswers['eco-priority'] === 'very-important' ||
    envAnswers['eco-priority'] === 'essential'
  ) {
    constraints.push({
      id: 'eco-priority',
      category: 'environmental',
      type: 'soft',
      severity: 'medium',
      value: envAnswers['eco-priority'],
      description: {
        en: 'Strong preference for eco-friendly materials, energy-efficient appliances, and sustainable practices',
        fr: 'Forte préférence pour les matériaux écologiques, les appareils économes en énergie et les pratiques durables',
      },
      requirements: [
        'energy-star-appliances',
        'sustainable-materials',
        'low-voc-finishes',
        'water-efficient-fixtures',
      ],
    });
  }

  if (envAnswers['energy-efficiency'] === 'priority') {
    constraints.push({
      id: 'energy-efficiency',
      category: 'environmental',
      type: 'soft',
      severity: 'low',
      description: {
        en: 'Energy efficiency is a priority - affects appliance and lighting selections',
        fr: "L'efficacité énergétique est une priorité - affecte les sélections d'appareils et d'éclairage",
      },
      requirements: ['energy-star', 'led-lighting', 'induction-cooktop-consideration'],
    });
  }

  if (envAnswers['waste-reduction'] === 'important') {
    constraints.push({
      id: 'waste-reduction',
      category: 'environmental',
      type: 'soft',
      severity: 'low',
      description: {
        en: 'Waste reduction priority - include recycling center and composting options',
        fr: 'Priorité à la réduction des déchets - inclure un centre de recyclage et des options de compostage',
      },
      requirements: ['recycling-station', 'composting-option', 'waste-sorting'],
    });
  }
}

/**
 * Collect accessibility constraints
 */
function collectAccessibilityConstraints(responses, constraints) {
  const accessAnswers = responses['accessibility-needs'] || responses['spatial-constraints'] || {};

  if (accessAnswers['accessibility-required'] === 'yes' || accessAnswers['ada-compliance']) {
    constraints.push({
      id: 'accessibility-required',
      category: 'accessibility',
      type: 'hard',
      severity: 'high',
      description: {
        en: 'Accessibility features required - affects counter heights, aisle widths, and appliance placement',
        fr: "Caractéristiques d'accessibilité requises - affecte les hauteurs de comptoir, largeurs d'allées et placement des appareils",
      },
      requirements: [
        'ada-compliant-heights',
        'wide-aisles',
        'accessible-appliances',
        'lever-handles',
      ],
    });
  }

  if (accessAnswers['wheelchair-user']) {
    constraints.push({
      id: 'wheelchair-access',
      category: 'accessibility',
      type: 'hard',
      severity: 'critical',
      description: {
        en: 'Wheelchair accessibility required - minimum 60" turning radius, lowered counters, knee space',
        fr: 'Accessibilité en fauteuil roulant requise - rayon de rotation minimum 60", comptoirs abaissés, espace pour les genoux',
      },
      requirements: [
        '60-inch-turning-radius',
        'lowered-counters',
        'knee-space',
        'side-opening-appliances',
      ],
    });
  }

  if (accessAnswers['aging-in-place']) {
    constraints.push({
      id: 'aging-in-place',
      category: 'accessibility',
      type: 'soft',
      severity: 'medium',
      description: {
        en: 'Aging-in-place considerations - universal design principles for future accessibility',
        fr: "Considérations pour vieillir sur place - principes de conception universelle pour l'accessibilité future",
      },
      requirements: [
        'universal-design',
        'varied-counter-heights',
        'good-lighting',
        'easy-grip-hardware',
      ],
    });
  }

  if (accessAnswers['vision-impairment']) {
    constraints.push({
      id: 'vision-accessibility',
      category: 'accessibility',
      type: 'soft',
      severity: 'medium',
      description: {
        en: 'Vision accessibility needs - high contrast, good lighting, tactile indicators',
        fr: "Besoins d'accessibilité visuelle - contraste élevé, bon éclairage, indicateurs tactiles",
      },
      requirements: ['high-contrast-design', 'task-lighting', 'tactile-controls'],
    });
  }
}

/**
 * Analyze dependencies between constraints
 */
function analyzeDependencies(constraints) {
  const dependencies = [];

  constraints.forEach((constraint) => {
    const categoryInfo = CONSTRAINT_CATEGORIES[constraint.category];
    if (!categoryInfo) return;

    const dependentCategories = categoryInfo.dependencies || [];

    dependentCategories.forEach((depCategory) => {
      const relatedConstraints = constraints.filter((c) => c.category === depCategory);

      relatedConstraints.forEach((related) => {
        dependencies.push({
          primary: constraint.id,
          primaryCategory: constraint.category,
          dependent: related.id,
          dependentCategory: related.category,
          relationship: determineDependencyRelationship(constraint, related),
          strength: calculateDependencyStrength(constraint, related),
        });
      });
    });
  });

  return dependencies;
}

/**
 * Determine the relationship type between two constraints
 */
function determineDependencyRelationship(primary, dependent) {
  // Budget affects what's possible with other constraints
  if (primary.category === 'budget') {
    if (dependent.category === 'spatial') return 'limits-solutions';
    if (dependent.category === 'timeline') return 'affects-scope';
    if (dependent.category === 'structural') return 'limits-modifications';
  }

  // Spatial constraints affect feature feasibility
  if (primary.category === 'spatial') {
    if (dependent.category === 'lifestyle') return 'limits-features';
    if (dependent.category === 'structural') return 'compounds-with';
  }

  // Structural constraints are foundational
  if (primary.category === 'structural') {
    return 'prerequisite-for';
  }

  // Regulatory constraints override preferences
  if (primary.category === 'regulatory') {
    return 'overrides';
  }

  // Timeline affects phasing
  if (primary.category === 'timeline') {
    return 'affects-phasing';
  }

  return 'influences';
}

/**
 * Calculate the strength of dependency between constraints
 */
function calculateDependencyStrength(primary, dependent) {
  let strength = 0.5; // Base strength

  // Hard constraints create stronger dependencies
  if (primary.type === 'hard') strength += 0.2;
  if (dependent.type === 'hard') strength += 0.1;

  // Higher severity increases strength
  const severityBonus = {
    critical: 0.2,
    high: 0.15,
    medium: 0.1,
    low: 0.05,
  };
  strength += severityBonus[primary.severity] || 0;

  // Same category constraints have stronger relationships
  if (primary.category === dependent.category) strength += 0.1;

  return Math.min(1, strength);
}

/**
 * Identify conflicts between constraints and preferences
 */
function identifyConflicts(constraints, responses) {
  const conflicts = [];

  // Budget vs expectations conflicts
  identifyBudgetConflicts(constraints, responses, conflicts);

  // Space vs features conflicts
  identifySpaceConflicts(constraints, responses, conflicts);

  // Structural vs layout conflicts
  identifyStructuralConflicts(constraints, responses, conflicts);

  // Timeline vs scope conflicts
  identifyTimelineConflicts(constraints, responses, conflicts);

  // Eco vs budget conflicts
  identifyEcoConflicts(constraints, responses, conflicts);

  // Accessibility vs space conflicts
  identifyAccessibilityConflicts(constraints, responses, conflicts);

  // Lifestyle vs budget conflicts
  identifyLifestyleConflicts(constraints, responses, conflicts);

  return conflicts;
}

/**
 * Identify budget-related conflicts
 */
function identifyBudgetConflicts(constraints, responses, conflicts) {
  const budgetConstraint = constraints.find((c) => c.id === 'total-budget');
  if (!budgetConstraint) return;

  const budgetLevel = budgetConstraint.budgetLevel || 3;
  const aesthetic = responses['aesthetic-preferences'] || {};
  const appliances = responses['technology-preferences'] || {};

  // Countertop material conflicts
  if (aesthetic['countertop-material']) {
    const materialTier = MATERIAL_COST_TIERS.countertops[aesthetic['countertop-material']] || 3;
    if (materialTier > budgetLevel + 1) {
      conflicts.push({
        id: 'budget-countertop-conflict',
        type: 'budget-expectation',
        severity: materialTier - budgetLevel > 2 ? 'high' : 'medium',
        constraints: ['total-budget'],
        preference: 'countertop-material',
        preferenceValue: aesthetic['countertop-material'],
        gap: materialTier - budgetLevel,
        message: {
          en: `${formatMaterialName(aesthetic['countertop-material'])} countertops typically exceed your budget tier. Current budget supports up to ${getSupportedMaterial('countertops', budgetLevel)}.`,
          fr: `Les comptoirs en ${formatMaterialName(aesthetic['countertop-material'])} dépassent généralement votre niveau de budget. Le budget actuel supporte jusqu'à ${getSupportedMaterial('countertops', budgetLevel)}.`,
        },
        resolution: {
          en: getAlternativeRecommendation(
            'countertops',
            aesthetic['countertop-material'],
            budgetLevel
          ),
          fr: getAlternativeRecommendation(
            'countertops',
            aesthetic['countertop-material'],
            budgetLevel,
            'fr'
          ),
        },
      });
    }
  }

  // Cabinet style conflicts
  if (aesthetic['cabinet-style']) {
    const cabinetTier = MATERIAL_COST_TIERS.cabinets[aesthetic['cabinet-style']] || 3;
    if (cabinetTier > budgetLevel + 1) {
      conflicts.push({
        id: 'budget-cabinet-conflict',
        type: 'budget-expectation',
        severity: cabinetTier - budgetLevel > 2 ? 'high' : 'medium',
        constraints: ['total-budget'],
        preference: 'cabinet-style',
        preferenceValue: aesthetic['cabinet-style'],
        message: {
          en: `${formatMaterialName(aesthetic['cabinet-style'])} cabinets exceed budget. Semi-custom or stock options recommended.`,
          fr: `Les armoires ${formatMaterialName(aesthetic['cabinet-style'])} dépassent le budget. Options semi-personnalisées ou en stock recommandées.`,
        },
        resolution: {
          en: 'Consider semi-custom cabinets with custom-look details (crown molding, quality hardware)',
          fr: "Envisagez des armoires semi-personnalisées avec des détails d'aspect personnalisé (moulures, quincaillerie de qualité)",
        },
      });
    }
  }

  // Appliance level conflicts
  if (appliances['appliance-tier']) {
    const applianceTier = MATERIAL_COST_TIERS.appliances[appliances['appliance-tier']] || 3;
    if (applianceTier > budgetLevel + 1) {
      conflicts.push({
        id: 'budget-appliance-conflict',
        type: 'budget-expectation',
        severity: 'medium',
        constraints: ['total-budget'],
        preference: 'appliance-tier',
        preferenceValue: appliances['appliance-tier'],
        message: {
          en: `${formatMaterialName(appliances['appliance-tier'])} appliances exceed budget allocation. Consider mix-and-match approach.`,
          fr: `Les appareils ${formatMaterialName(appliances['appliance-tier'])} dépassent l'allocation budgétaire. Envisagez une approche mixte.`,
        },
        resolution: {
          en: 'Prioritize range/cooktop for premium upgrade; select mid-range for refrigerator and dishwasher',
          fr: 'Priorisez la cuisinière pour une amélioration premium; sélectionnez la gamme moyenne pour le réfrigérateur et le lave-vaisselle',
        },
      });
    }
  }

  // Flooring conflicts
  if (aesthetic['flooring-material']) {
    const flooringTier = MATERIAL_COST_TIERS.flooring[aesthetic['flooring-material']] || 2;
    if (flooringTier > budgetLevel) {
      conflicts.push({
        id: 'budget-flooring-conflict',
        type: 'budget-expectation',
        severity: 'low',
        constraints: ['total-budget'],
        preference: 'flooring-material',
        preferenceValue: aesthetic['flooring-material'],
        message: {
          en: `${formatMaterialName(aesthetic['flooring-material'])} flooring may stretch budget. LVP offers similar look at lower cost.`,
          fr: `Le revêtement de sol ${formatMaterialName(aesthetic['flooring-material'])} peut étirer le budget. Le LVP offre un aspect similaire à moindre coût.`,
        },
        resolution: {
          en: 'Consider luxury vinyl plank (LVP) for wood look or porcelain for stone look',
          fr: "Envisagez le vinyle de luxe (LVP) pour l'aspect bois ou la porcelaine pour l'aspect pierre",
        },
      });
    }
  }
}

/**
 * Identify space-related conflicts
 */
function identifySpaceConflicts(constraints, responses, conflicts) {
  const sizeConstraint = constraints.find((c) => c.id === 'kitchen-size');
  if (!sizeConstraint) return;

  const spatialAnswers = responses['spatial-constraints'] || {};
  const sizeInfo = sizeConstraint.sizeInfo || SIZE_CONSTRAINTS['medium'];

  // Island in small kitchen
  if (spatialAnswers['island-preference']) {
    const wantsIsland = ['large-island', 'medium-island', 'island-seating'].includes(
      spatialAnswers['island-preference']
    );

    if (wantsIsland && sizeInfo.islandFeasible === false) {
      conflicts.push({
        id: 'space-island-conflict',
        type: 'space-feature',
        severity: 'high',
        constraints: ['kitchen-size'],
        preference: 'island-preference',
        preferenceValue: spatialAnswers['island-preference'],
        message: {
          en: `A ${spatialAnswers['island-preference'].replace('-', ' ')} is not feasible in a ${sizeConstraint.value} kitchen. Minimum 36" clearance required on all sides.`,
          fr: `Un ${spatialAnswers['island-preference'].replace('-', ' ')} n'est pas réalisable dans une cuisine ${sizeConstraint.value}. Un dégagement minimum de 36" est requis de tous les côtés.`,
        },
        resolution: {
          en: 'Consider a mobile cart, small peninsula, or fold-down prep surface instead',
          fr: 'Envisagez un chariot mobile, une petite péninsule ou une surface de préparation rabattable',
        },
      });
    } else if (wantsIsland && sizeInfo.islandFeasible === 'small-cart') {
      conflicts.push({
        id: 'space-island-limited',
        type: 'space-feature',
        severity: 'medium',
        constraints: ['kitchen-size'],
        preference: 'island-preference',
        preferenceValue: spatialAnswers['island-preference'],
        message: {
          en: `Space allows only for a small mobile cart or compact island (max 36"x24").`,
          fr: `L'espace ne permet qu'un petit chariot mobile ou un îlot compact (max 36"x24").`,
        },
        resolution: {
          en: 'A mobile butcher block cart provides flexibility and can be stored when not in use',
          fr: "Un chariot billot mobile offre de la flexibilité et peut être rangé lorsqu'il n'est pas utilisé",
        },
      });
    }
  }

  // Layout preferences vs space
  if (spatialAnswers['preferred-layout']) {
    const preferredLayout = spatialAnswers['preferred-layout'];
    if (
      !sizeInfo.feasibleLayouts.includes(preferredLayout) &&
      !sizeInfo.feasibleLayouts.includes('all')
    ) {
      conflicts.push({
        id: 'space-layout-conflict',
        type: 'space-feature',
        severity: 'high',
        constraints: ['kitchen-size'],
        preference: 'preferred-layout',
        preferenceValue: preferredLayout,
        message: {
          en: `${formatLayoutName(preferredLayout)} layout is not optimal for ${sizeConstraint.value} kitchen size.`,
          fr: `La disposition ${formatLayoutName(preferredLayout)} n'est pas optimale pour une cuisine de taille ${sizeConstraint.value}.`,
        },
        resolution: {
          en: `Recommended layouts for your space: ${sizeInfo.feasibleLayouts.slice(0, 3).map(formatLayoutName).join(', ')}`,
          fr: `Dispositions recommandées pour votre espace: ${sizeInfo.feasibleLayouts.slice(0, 3).map(formatLayoutName).join(', ')}`,
        },
      });
    }
  }

  // Storage requirements vs space
  const storageAnswers = responses['storage-needs'] || {};
  if (storageAnswers['storage-amount'] === 'extensive' && sizeInfo.storageCapacity === 'limited') {
    conflicts.push({
      id: 'space-storage-conflict',
      type: 'space-feature',
      severity: 'medium',
      constraints: ['kitchen-size'],
      preference: 'storage-amount',
      message: {
        en: 'Extensive storage needs are challenging in limited space. Creative solutions required.',
        fr: 'Les besoins de rangement extensifs sont difficiles dans un espace limité. Des solutions créatives sont nécessaires.',
      },
      resolution: {
        en: 'Maximize vertical storage, use cabinet organizers, consider pantry cabinet, and declutter existing items',
        fr: "Maximisez le rangement vertical, utilisez des organisateurs d'armoires, envisagez une armoire garde-manger et désencombrez les articles existants",
      },
    });
  }
}

/**
 * Identify structural conflicts
 */
function identifyStructuralConflicts(constraints, responses, conflicts) {
  const loadBearingWall = constraints.find((c) => c.id === 'load-bearing-wall');
  const plumbingStack = constraints.find((c) => c.id === 'plumbing-stack');
  const futureAnswers = responses['future-needs'] || {};
  const spatialAnswers = responses['spatial-constraints'] || {};

  // Open concept vs load-bearing wall
  if (loadBearingWall && spatialAnswers['open-concept'] === 'yes') {
    conflicts.push({
      id: 'structural-open-concept',
      type: 'structural-layout',
      severity: 'critical',
      constraints: ['load-bearing-wall'],
      preference: 'open-concept',
      message: {
        en: 'Open concept design conflicts with load-bearing wall. Structural engineering required for any wall removal.',
        fr: 'Le design à concept ouvert entre en conflit avec le mur porteur. Un ingénieur en structure est requis pour tout retrait de mur.',
      },
      resolution: {
        en: 'Consult structural engineer for beam installation options. Budget $3,000-$10,000+ for structural modifications.',
        fr: "Consultez un ingénieur en structure pour les options d'installation de poutre. Budgétez 3 000-10 000$+ pour les modifications structurelles.",
      },
      costImpact: 'significant',
    });
  }

  // Sink relocation vs plumbing stack
  if (plumbingStack && spatialAnswers['relocate-sink'] === 'yes') {
    conflicts.push({
      id: 'structural-sink-relocation',
      type: 'structural-layout',
      severity: 'high',
      constraints: ['plumbing-stack'],
      preference: 'relocate-sink',
      message: {
        en: 'Sink relocation away from plumbing stack requires significant plumbing work.',
        fr: "Le déplacement de l'évier loin de la colonne de plomberie nécessite des travaux de plomberie importants.",
      },
      resolution: {
        en: 'Keep sink within 6 feet of stack if possible. If relocation is essential, budget $2,000-$5,000 for plumbing.',
        fr: "Gardez l'évier à moins de 6 pieds de la colonne si possible. Si le déplacement est essentiel, budgétez 2 000-5 000$ pour la plomberie.",
      },
      costImpact: 'moderate',
    });
  }

  // Full gut renovation with structural constraints
  if (futureAnswers['renovation-scope'] === 'full-gut') {
    const structuralConstraints = constraints.filter((c) => c.category === 'structural');
    if (structuralConstraints.length > 2) {
      conflicts.push({
        id: 'structural-complexity',
        type: 'structural-layout',
        severity: 'high',
        constraints: structuralConstraints.map((c) => c.id),
        preference: 'renovation-scope',
        message: {
          en: `Full gut renovation faces ${structuralConstraints.length} structural constraints. Requires careful planning.`,
          fr: `La rénovation complète fait face à ${structuralConstraints.length} contraintes structurelles. Nécessite une planification soigneuse.`,
        },
        resolution: {
          en: 'Engage architect and structural engineer early. Consider working with rather than against structural elements.',
          fr: 'Engagez un architecte et un ingénieur en structure tôt. Envisagez de travailler avec plutôt que contre les éléments structurels.',
        },
      });
    }
  }
}

/**
 * Identify timeline conflicts
 */
function identifyTimelineConflicts(constraints, responses, conflicts) {
  const timelineConstraint = constraints.find((c) => c.id === 'timeline');
  if (!timelineConstraint) return;

  const futureAnswers = responses['future-needs'] || {};
  const isUrgent = ['urgent', 'soon'].includes(timelineConstraint.value);

  // Scope vs timeline mapping
  const scopeTimelines = {
    'cosmetic-refresh': 4,
    'minor-update': 6,
    'moderate-remodel': 10,
    'major-remodel': 16,
    'full-gut': 20,
  };

  const scope = futureAnswers['renovation-scope'] || 'moderate-remodel';
  const requiredWeeks = scopeTimelines[scope] || 12;

  // Urgent timeline with major scope
  if (isUrgent && requiredWeeks > 8) {
    conflicts.push({
      id: 'timeline-scope-conflict',
      type: 'timeline-scope',
      severity: timelineConstraint.value === 'urgent' ? 'critical' : 'high',
      constraints: ['timeline'],
      preference: 'renovation-scope',
      preferenceValue: scope,
      message: {
        en: `${formatScopeName(scope)} typically requires ${requiredWeeks}+ weeks. Your timeline may be insufficient.`,
        fr: `${formatScopeName(scope)} nécessite généralement ${requiredWeeks}+ semaines. Votre calendrier peut être insuffisant.`,
      },
      resolution: {
        en: 'Options: 1) Reduce scope to cosmetic/minor update, 2) Extend timeline, 3) Phase the project over time',
        fr: 'Options: 1) Réduire la portée aux mises à jour cosmétiques/mineures, 2) Prolonger le calendrier, 3) Échelonner le projet dans le temps',
      },
    });
  }

  // Custom items with urgent timeline
  const aestheticAnswers = responses['aesthetic-preferences'] || {};
  if (isUrgent && aestheticAnswers['cabinet-style'] === 'custom') {
    conflicts.push({
      id: 'timeline-custom-conflict',
      type: 'timeline-scope',
      severity: 'high',
      constraints: ['timeline'],
      preference: 'cabinet-style',
      message: {
        en: 'Custom cabinets typically have 8-16 week lead times, incompatible with urgent timeline.',
        fr: 'Les armoires sur mesure ont généralement des délais de 8-16 semaines, incompatibles avec un calendrier urgent.',
      },
      resolution: {
        en: 'Consider in-stock or RTA cabinets with custom hardware and finishes for faster delivery',
        fr: 'Envisagez des armoires en stock ou RTA avec quincaillerie et finitions personnalisées pour une livraison plus rapide',
      },
    });
  }

  // Permit requirements with urgent timeline
  const permitsRequired = constraints.find((c) => c.id === 'permits-required');
  if (isUrgent && permitsRequired) {
    conflicts.push({
      id: 'timeline-permit-conflict',
      type: 'timeline-scope',
      severity: 'high',
      constraints: ['timeline', 'permits-required'],
      message: {
        en: 'Permit process adds 2-6 weeks before construction can begin.',
        fr: 'Le processus de permis ajoute 2-6 semaines avant que la construction puisse commencer.',
      },
      resolution: {
        en: 'Submit permit application immediately. Consider expedited review if available in your area.',
        fr: 'Soumettez la demande de permis immédiatement. Envisagez une révision accélérée si disponible dans votre région.',
      },
    });
  }
}

/**
 * Identify eco/environmental conflicts
 */
function identifyEcoConflicts(constraints, responses, conflicts) {
  const ecoConstraint = constraints.find((c) => c.id === 'eco-priority');
  const budgetConstraint = constraints.find((c) => c.id === 'total-budget');

  if (ecoConstraint && budgetConstraint) {
    const budgetLevel = budgetConstraint.budgetLevel || 3;

    if (budgetLevel <= 2) {
      conflicts.push({
        id: 'eco-budget-conflict',
        type: 'values-budget',
        severity: 'medium',
        constraints: ['eco-priority', 'total-budget'],
        message: {
          en: 'Some eco-friendly options have premium pricing. Strategic prioritization recommended.',
          fr: 'Certaines options écologiques ont des prix premium. Une priorisation stratégique est recommandée.',
        },
        resolution: {
          en: 'Prioritize Energy Star appliances (long-term savings), then sustainable countertops, then eco-finishes',
          fr: 'Priorisez les appareils Energy Star (économies à long terme), puis les comptoirs durables, puis les finitions écologiques',
        },
      });
    }

    // Specific eco features that conflict with budget
    const envAnswers = responses['environmental-concerns'] || {};
    if (envAnswers['solar-power'] === 'yes' && budgetLevel <= 4) {
      conflicts.push({
        id: 'eco-solar-budget',
        type: 'values-budget',
        severity: 'low',
        constraints: ['eco-priority', 'total-budget'],
        preference: 'solar-power',
        message: {
          en: 'Solar power integration is typically a separate project from kitchen renovation.',
          fr: "L'intégration de l'énergie solaire est généralement un projet distinct de la rénovation de cuisine.",
        },
        resolution: {
          en: 'Focus on energy-efficient appliances now; consider solar as a future project with dedicated budget',
          fr: 'Concentrez-vous sur les appareils écoénergétiques maintenant; envisagez le solaire comme projet futur avec budget dédié',
        },
      });
    }
  }
}

/**
 * Identify accessibility conflicts
 */
function identifyAccessibilityConflicts(constraints, responses, conflicts) {
  const accessConstraints = constraints.filter((c) => c.category === 'accessibility');
  const sizeConstraint = constraints.find((c) => c.id === 'kitchen-size');

  if (accessConstraints.length > 0 && sizeConstraint) {
    const sizeInfo = sizeConstraint.sizeInfo || SIZE_CONSTRAINTS['medium'];

    // Wheelchair access in small kitchen
    const wheelchairAccess = constraints.find((c) => c.id === 'wheelchair-access');
    if (wheelchairAccess && sizeConstraint.value === 'small') {
      conflicts.push({
        id: 'accessibility-space-conflict',
        type: 'accessibility-space',
        severity: 'critical',
        constraints: ['wheelchair-access', 'kitchen-size'],
        message: {
          en: 'Wheelchair accessibility requires minimum 60" turning radius. Small kitchen space is challenging.',
          fr: 'L\'accessibilité en fauteuil roulant nécessite un rayon de rotation minimum de 60". Un petit espace cuisine est difficile.',
        },
        resolution: {
          en: 'Consider: 1) Expanding into adjacent space, 2) One-wall layout with open floor, 3) Galley with one end open',
          fr: "Envisagez: 1) Extension dans l'espace adjacent, 2) Disposition murale avec sol ouvert, 3) Cuisine en corridor avec une extrémité ouverte",
        },
      });
    }

    // Wide aisles requirement vs limited space
    if (sizeInfo.storageCapacity === 'limited') {
      const aisleRequirement = constraints.find(
        (c) => c.requirements && c.requirements.includes('wide-aisles')
      );

      if (aisleRequirement) {
        conflicts.push({
          id: 'accessibility-aisle-space',
          type: 'accessibility-space',
          severity: 'high',
          constraints: [aisleRequirement.id, 'kitchen-size'],
          message: {
            en: 'Wide aisle requirements (48"+) reduce available cabinet/counter space in limited kitchen.',
            fr: "Les exigences d'allées larges (48\"+) réduisent l'espace disponible pour les armoires/comptoirs dans une cuisine limitée.",
          },
          resolution: {
            en: 'Use wall-mounted storage, ceiling-height cabinets, and pullout organizers to maximize vertical space',
            fr: "Utilisez le rangement mural, les armoires pleine hauteur et les organisateurs coulissants pour maximiser l'espace vertical",
          },
        });
      }
    }
  }
}

/**
 * Identify lifestyle vs budget conflicts
 */
function identifyLifestyleConflicts(constraints, responses, conflicts) {
  const budgetConstraint = constraints.find((c) => c.id === 'total-budget');
  const lifestyleConstraints = constraints.filter((c) => c.category === 'lifestyle');

  if (!budgetConstraint || lifestyleConstraints.length === 0) return;

  const budgetLevel = budgetConstraint.budgetLevel || 3;

  // Professional cooking needs with limited budget
  const professionalCooking = constraints.find((c) => c.id === 'professional-cooking');
  if (professionalCooking && budgetLevel <= 3) {
    conflicts.push({
      id: 'lifestyle-cooking-budget',
      type: 'lifestyle-budget',
      severity: 'high',
      constraints: ['professional-cooking', 'total-budget'],
      message: {
        en: 'Professional cooking setup (pro range, commercial hood) typically requires $20,000+ in appliances alone.',
        fr: 'Une configuration de cuisine professionnelle (cuisinière pro, hotte commerciale) nécessite généralement 20 000$+ en appareils seuls.',
      },
      resolution: {
        en: 'Consider: Semi-pro range (still powerful but residential), focus budget on range/hood, standard other appliances',
        fr: 'Envisagez: Cuisinière semi-pro (toujours puissante mais résidentielle), concentrez le budget sur la cuisinière/hotte, appareils standards pour le reste',
      },
    });
  }

  // Frequent entertaining with limited space
  const entertaining = constraints.find((c) => c.id === 'frequent-entertaining');
  const sizeConstraint = constraints.find((c) => c.id === 'kitchen-size');
  if (entertaining && sizeConstraint && sizeConstraint.value === 'small') {
    conflicts.push({
      id: 'lifestyle-entertaining-space',
      type: 'space-feature',
      severity: 'medium',
      constraints: ['frequent-entertaining', 'kitchen-size'],
      message: {
        en: 'Frequent entertaining benefits from open layout and island seating, challenging in small kitchen.',
        fr: "Les réceptions fréquentes bénéficient d'une disposition ouverte et de sièges à l'îlot, difficile dans une petite cuisine.",
      },
      resolution: {
        en: 'Create visual connection to dining area, add pass-through, or consider peninsula with stools',
        fr: 'Créez une connexion visuelle avec la salle à manger, ajoutez un passe-plat, ou envisagez une péninsule avec tabourets',
      },
    });
  }
}

/**
 * Prioritize constraints by impact and urgency
 */
function prioritizeConstraints(constraints, conflicts) {
  return constraints
    .map((constraint) => {
      const categoryInfo = CONSTRAINT_CATEGORIES[constraint.category] || { weight: 0.1 };
      const severityInfo = SEVERITY_LEVELS[constraint.severity] || SEVERITY_LEVELS['medium'];

      // Base priority from category weight
      let priority = categoryInfo.weight;

      // Adjust for constraint type
      if (constraint.type === 'hard') {
        priority *= 2;
      }

      // Adjust for severity
      priority *= severityInfo.multiplier;

      // Boost priority if involved in conflicts
      const relatedConflicts = conflicts.filter(
        (c) => c.constraints.includes(constraint.id) || c.preference === constraint.id
      );
      priority += relatedConflicts.length * 0.1;

      // Boost for regulatory (must comply)
      if (constraint.category === 'regulatory') {
        priority *= 1.5;
      }

      return {
        ...constraint,
        priority: Math.min(1, priority),
        conflictCount: relatedConflicts.length,
        requiresResolution: severityInfo.requiresResolution,
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Calculate overall project feasibility score
 */
function calculateFeasibility(analysis) {
  let score = 100;

  // Deduct for hard constraints
  const hardConstraints = analysis.constraints.filter((c) => c.type === 'hard');
  score -= hardConstraints.length * 1.5;

  // Deduct for conflicts based on severity
  analysis.conflicts.forEach((conflict) => {
    const deduction =
      {
        critical: 20,
        high: 12,
        medium: 7,
        low: 3,
      }[conflict.severity] || 5;
    score -= deduction;
  });

  // Deduct for critical constraints
  const criticalConstraints = analysis.constraints.filter((c) => c.severity === 'critical');
  score -= criticalConstraints.length * 5;

  // Bonus for flexibility
  const budgetConstraint = analysis.constraints.find((c) => c.id === 'total-budget');
  if (budgetConstraint && budgetConstraint.flexibility >= 4) {
    score += 5;
  }

  // Ensure score is in valid range
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Assess project risks based on constraints
 */
function assessRisks(analysis) {
  const risks = {
    overall: 'moderate',
    budgetRisk: 'low',
    scheduleRisk: 'low',
    scopeRisk: 'low',
    qualityRisk: 'low',
    factors: [],
  };

  // Budget risk assessment
  const noContingency = analysis.constraints.find((c) => c.id === 'no-contingency');
  const budgetConstraint = analysis.constraints.find((c) => c.id === 'total-budget');

  if (noContingency) {
    risks.budgetRisk = 'high';
    risks.factors.push({
      type: 'budget',
      issue: { en: 'No contingency budget', fr: 'Pas de budget de contingence' },
      impact: { en: 'High risk of cost overruns', fr: 'Risque élevé de dépassement de coûts' },
    });
  } else if (budgetConstraint && budgetConstraint.flexibility <= 2) {
    risks.budgetRisk = 'moderate';
    risks.factors.push({
      type: 'budget',
      issue: { en: 'Limited budget flexibility', fr: 'Flexibilité budgétaire limitée' },
      impact: {
        en: 'May need to reduce scope if issues arise',
        fr: 'Peut nécessiter de réduire la portée si des problèmes surviennent',
      },
    });
  }

  // Schedule risk assessment
  const timelineConstraint = analysis.constraints.find((c) => c.id === 'timeline');
  const timelineConflicts = analysis.conflicts.filter((c) => c.type === 'timeline-scope');

  if (timelineConflicts.length > 0) {
    risks.scheduleRisk = 'high';
    risks.factors.push({
      type: 'schedule',
      issue: { en: 'Timeline-scope mismatch', fr: 'Décalage calendrier-portée' },
      impact: {
        en: 'Project completion deadline at risk',
        fr: "Date limite d'achèvement du projet à risque",
      },
    });
  } else if (timelineConstraint && ['urgent', 'soon'].includes(timelineConstraint.value)) {
    risks.scheduleRisk = 'moderate';
    risks.factors.push({
      type: 'schedule',
      issue: { en: 'Aggressive timeline', fr: 'Calendrier ambitieux' },
      impact: {
        en: 'Limited buffer for unexpected delays',
        fr: 'Marge limitée pour les retards imprévus',
      },
    });
  }

  // Scope risk assessment
  const structuralConstraints = analysis.constraints.filter((c) => c.category === 'structural');
  if (structuralConstraints.length > 3) {
    risks.scopeRisk = 'high';
    risks.factors.push({
      type: 'scope',
      issue: { en: 'Multiple structural constraints', fr: 'Multiples contraintes structurelles' },
      impact: {
        en: 'Design options significantly limited',
        fr: 'Options de design significativement limitées',
      },
    });
  }

  // Quality risk assessment
  const budgetExpectationConflicts = analysis.conflicts.filter(
    (c) => c.type === 'budget-expectation'
  );
  if (budgetExpectationConflicts.length > 2) {
    risks.qualityRisk = 'moderate';
    risks.factors.push({
      type: 'quality',
      issue: { en: 'Multiple budget-expectation gaps', fr: 'Multiples écarts budget-attentes' },
      impact: {
        en: 'May need to compromise on finishes',
        fr: 'Peut nécessiter de faire des compromis sur les finitions',
      },
    });
  }

  // Calculate overall risk
  const riskValues = { low: 1, moderate: 2, high: 3 };
  const avgRisk =
    (riskValues[risks.budgetRisk] +
      riskValues[risks.scheduleRisk] +
      riskValues[risks.scopeRisk] +
      riskValues[risks.qualityRisk]) /
    4;

  if (avgRisk >= 2.5) risks.overall = 'high';
  else if (avgRisk >= 1.5) risks.overall = 'moderate';
  else risks.overall = 'low';

  return risks;
}

/**
 * Generate resolution plan for conflicts
 */
function generateResolutionPlan(conflicts, constraints, responses) {
  const plan = [];

  // Sort conflicts by severity
  const sortedConflicts = [...conflicts].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
  });

  sortedConflicts.forEach((conflict, index) => {
    const conflictType = CONFLICT_TYPES[conflict.type] || {};
    const strategies = conflictType.resolutionStrategies || [];

    plan.push({
      priority: index + 1,
      conflictId: conflict.id,
      severity: conflict.severity,
      description: conflict.message,
      recommendedAction: conflict.resolution,
      alternativeStrategies: strategies.slice(0, 3).map((strategy) => ({
        strategy: strategy,
        description: getStrategyDescription(strategy),
      })),
      requiredDecision: conflict.severity === 'critical' || conflict.severity === 'high',
      estimatedImpact: estimateResolutionImpact(conflict, constraints),
    });
  });

  return plan;
}

/**
 * Generate constraint recommendations
 */
function generateConstraintRecommendations(analysis, responses) {
  const recommendations = [];

  // Address each conflict
  analysis.conflicts.forEach((conflict) => {
    recommendations.push({
      id: `resolve-${conflict.id}`,
      type: 'conflict-resolution',
      priority:
        conflict.severity === 'critical'
          ? 'critical'
          : conflict.severity === 'high'
            ? 'high'
            : 'medium',
      title: {
        en: 'Address Design Conflict',
        fr: 'Résoudre le conflit de conception',
      },
      description: conflict.message,
      action: conflict.resolution,
      relatedConstraints: conflict.constraints,
    });
  });

  // General recommendations based on constraint patterns
  const hardConstraintCount = analysis.constraints.filter((c) => c.type === 'hard').length;

  if (hardConstraintCount > 5) {
    recommendations.push({
      id: 'manage-constraints',
      type: 'planning',
      priority: 'high',
      title: {
        en: 'Complex Project - Professional Consultation Recommended',
        fr: 'Projet complexe - Consultation professionnelle recommandée',
      },
      description: {
        en: `${hardConstraintCount} hard constraints detected. This project would benefit from professional design consultation to navigate limitations effectively.`,
        fr: `${hardConstraintCount} contraintes strictes détectées. Ce projet bénéficierait d'une consultation de design professionnelle pour naviguer efficacement les limitations.`,
      },
    });
  }

  // Low feasibility warning
  if (analysis.feasibilityScore < 50) {
    recommendations.push({
      id: 'reassess-scope',
      type: 'planning',
      priority: 'critical',
      title: {
        en: 'Project Scope Review Required',
        fr: 'Révision de la portée du projet requise',
      },
      description: {
        en: 'Current requirements face significant challenges. Recommend reassessing scope, budget, or timeline to improve feasibility.',
        fr: 'Les exigences actuelles font face à des défis significatifs. Recommandons de réévaluer la portée, le budget ou le calendrier pour améliorer la faisabilité.',
      },
    });
  } else if (analysis.feasibilityScore < 70) {
    recommendations.push({
      id: 'prioritize-features',
      type: 'planning',
      priority: 'high',
      title: {
        en: 'Feature Prioritization Needed',
        fr: 'Priorisation des fonctionnalités nécessaire',
      },
      description: {
        en: 'Some compromises may be needed. Work with designer to prioritize must-have features vs. nice-to-haves.',
        fr: 'Certains compromis peuvent être nécessaires. Travaillez avec le designer pour prioriser les fonctionnalités essentielles par rapport aux souhaitables.',
      },
    });
  }

  // Risk-specific recommendations
  if (analysis.riskAssessment.budgetRisk === 'high') {
    recommendations.push({
      id: 'budget-risk-mitigation',
      type: 'risk-mitigation',
      priority: 'high',
      title: {
        en: 'Budget Risk Mitigation',
        fr: 'Atténuation du risque budgétaire',
      },
      description: {
        en: 'High budget risk detected. Recommend: Get multiple contractor bids, lock in material pricing early, keep 15% minimum contingency.',
        fr: "Risque budgétaire élevé détecté. Recommandons: Obtenir plusieurs soumissions d'entrepreneurs, bloquer les prix des matériaux tôt, garder un minimum de 15% de contingence.",
      },
    });
  }

  if (analysis.riskAssessment.scheduleRisk === 'high') {
    recommendations.push({
      id: 'schedule-risk-mitigation',
      type: 'risk-mitigation',
      priority: 'high',
      title: {
        en: 'Schedule Risk Mitigation',
        fr: 'Atténuation du risque de calendrier',
      },
      description: {
        en: 'High schedule risk detected. Recommend: Order long-lead items immediately, have backup material selections, consider phased approach.',
        fr: 'Risque de calendrier élevé détecté. Recommandons: Commander les articles à long délai immédiatement, avoir des sélections de matériaux de secours, envisager une approche par phases.',
      },
    });
  }

  return recommendations;
}

/**
 * Generate summary of constraint analysis
 */
function generateSummary(analysis) {
  const constraintsByCategory = {};
  analysis.constraints.forEach((c) => {
    if (!constraintsByCategory[c.category]) {
      constraintsByCategory[c.category] = [];
    }
    constraintsByCategory[c.category].push(c);
  });

  const conflictsBySeverity = {
    critical: analysis.conflicts.filter((c) => c.severity === 'critical').length,
    high: analysis.conflicts.filter((c) => c.severity === 'high').length,
    medium: analysis.conflicts.filter((c) => c.severity === 'medium').length,
    low: analysis.conflicts.filter((c) => c.severity === 'low').length,
  };

  return {
    totalConstraints: analysis.constraints.length,
    hardConstraints: analysis.constraints.filter((c) => c.type === 'hard').length,
    softConstraints: analysis.constraints.filter((c) => c.type === 'soft').length,
    constraintsByCategory: Object.keys(constraintsByCategory).map((cat) => ({
      category: cat,
      count: constraintsByCategory[cat].length,
      description: CONSTRAINT_CATEGORIES[cat]?.description,
    })),
    totalConflicts: analysis.conflicts.length,
    conflictsBySeverity,
    feasibilityScore: analysis.feasibilityScore,
    feasibilityRating: getFeasibilityRating(analysis.feasibilityScore),
    overallRisk: analysis.riskAssessment.overall,
    criticalIssues:
      analysis.conflicts.filter((c) => c.severity === 'critical').length +
      analysis.constraints.filter((c) => c.severity === 'critical').length,
    recommendationCount: analysis.recommendations.length,
  };
}

// =====================
// Helper Functions
// =====================

function formatBudgetRange(budgetKey) {
  const ranges = {
    'under-10k': '$0 - $10,000',
    '10k-25k': '$10,000 - $25,000',
    '25k-50k': '$25,000 - $50,000',
    '50k-75k': '$50,000 - $75,000',
    '75k-100k': '$75,000 - $100,000',
    'over-100k': '$100,000+',
  };
  return ranges[budgetKey] || budgetKey;
}

function formatMaterialName(material) {
  if (!material) return '';
  return material
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatLayoutName(layout) {
  if (!layout) return '';
  return layout
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');
}

function formatScopeName(scope) {
  const scopeNames = {
    'cosmetic-refresh': 'Cosmetic refresh',
    'minor-update': 'Minor update',
    'moderate-remodel': 'Moderate remodel',
    'major-remodel': 'Major remodel',
    'full-gut': 'Full gut renovation',
  };
  return scopeNames[scope] || scope;
}

function getSupportedMaterial(category, budgetLevel) {
  const supported = {
    countertops: {
      1: 'laminate',
      2: 'solid surface or butcher block',
      3: 'quartz or granite',
      4: 'premium quartz or granite',
      5: 'marble or quartzite',
      6: 'any material',
    },
  };
  return supported[category]?.[budgetLevel] || 'standard options';
}

function getAlternativeRecommendation(category, current, budgetLevel, lang = 'en') {
  const alternatives = {
    countertops: {
      marble: {
        en: 'Consider quartz with marble veining pattern - similar aesthetic at 40-60% cost savings',
        fr: "Envisagez le quartz avec motif de veinage marbre - esthétique similaire avec 40-60% d'économies",
      },
      quartzite: {
        en: 'Consider premium granite or high-end quartz for similar durability',
        fr: 'Envisagez le granit premium ou le quartz haut de gamme pour une durabilité similaire',
      },
      'granite-premium': {
        en: 'Standard granite offers similar look; consider remnant pieces for cost savings',
        fr: 'Le granit standard offre un aspect similaire; envisagez les pièces restantes pour économiser',
      },
    },
  };

  const rec = alternatives[category]?.[current];
  if (rec) return lang === 'fr' ? rec.fr : rec.en;

  return lang === 'fr'
    ? 'Envisagez des alternatives dans votre gamme de budget pour un meilleur équilibre valeur-qualité'
    : 'Consider alternatives within your budget tier for better value-quality balance';
}

function getStrategyDescription(strategy) {
  const descriptions = {
    'value-engineering': {
      en: 'Find equivalent quality at lower cost through smart material/vendor selection',
      fr: 'Trouvez une qualité équivalente à moindre coût grâce à une sélection intelligente de matériaux/fournisseurs',
    },
    'phased-implementation': {
      en: 'Complete project in stages to spread costs over time',
      fr: 'Complétez le projet par étapes pour répartir les coûts dans le temps',
    },
    'alternative-materials': {
      en: 'Use materials that provide similar look/function at lower cost',
      fr: 'Utilisez des matériaux offrant un aspect/fonction similaire à moindre coût',
    },
    'scope-reduction': {
      en: 'Focus on high-impact changes, defer lower-priority items',
      fr: 'Concentrez-vous sur les changements à fort impact, reportez les éléments de moindre priorité',
    },
    'creative-layout': {
      en: 'Optimize existing space through clever design solutions',
      fr: "Optimisez l'espace existant grâce à des solutions de design astucieuses",
    },
    'compact-alternatives': {
      en: 'Use space-efficient versions of desired features',
      fr: 'Utilisez des versions peu encombrantes des caractéristiques souhaitées',
    },
    'work-around-design': {
      en: 'Design around fixed elements rather than modifying them',
      fr: 'Concevez autour des éléments fixes plutôt que de les modifier',
    },
    'phased-approach': {
      en: 'Break project into manageable phases',
      fr: 'Divisez le projet en phases gérables',
    },
    'universal-design': {
      en: 'Use inclusive design that works for all users',
      fr: 'Utilisez un design inclusif qui fonctionne pour tous les utilisateurs',
    },
  };

  return descriptions[strategy] || { en: strategy, fr: strategy };
}

function estimateResolutionImpact(conflict, constraints) {
  const impactMapping = {
    'budget-expectation': { budget: 'positive', quality: 'negative', timeline: 'neutral' },
    'space-feature': { budget: 'neutral', quality: 'neutral', timeline: 'neutral' },
    'structural-layout': { budget: 'negative', quality: 'neutral', timeline: 'negative' },
    'timeline-scope': { budget: 'variable', quality: 'variable', timeline: 'positive' },
    'values-budget': { budget: 'positive', quality: 'negative', timeline: 'neutral' },
    'accessibility-space': { budget: 'negative', quality: 'positive', timeline: 'negative' },
  };

  return (
    impactMapping[conflict.type] || {
      budget: 'variable',
      quality: 'variable',
      timeline: 'variable',
    }
  );
}

function getFeasibilityRating(score) {
  if (score >= 85) return { en: 'Excellent', fr: 'Excellent' };
  if (score >= 70) return { en: 'Good', fr: 'Bon' };
  if (score >= 55) return { en: 'Moderate', fr: 'Modéré' };
  if (score >= 40) return { en: 'Challenging', fr: 'Difficile' };
  return { en: 'Needs Revision', fr: 'Nécessite révision' };
}

/**
 * Check if a specific feature is feasible given constraints
 */
function checkFeatureFeasibility(feature, constraints) {
  const blockers = [];
  const warnings = [];

  constraints.forEach((constraint) => {
    const categoryInfo = CONSTRAINT_CATEGORIES[constraint.category];
    if (!categoryInfo) return;

    const impacts = categoryInfo.impacts || [];

    if (feature.requires && impacts.some((impact) => feature.requires.includes(impact))) {
      if (constraint.type === 'hard' || constraint.severity === 'critical') {
        blockers.push({
          constraint: constraint.id,
          category: constraint.category,
          reason: constraint.description,
          severity: constraint.severity,
        });
      } else {
        warnings.push({
          constraint: constraint.id,
          category: constraint.category,
          reason: constraint.description,
          severity: constraint.severity,
        });
      }
    }
  });

  return {
    feasible: blockers.length === 0,
    feasibilityScore: blockers.length === 0 ? 100 - warnings.length * 10 : 0,
    blockers,
    warnings,
    recommendation:
      blockers.length > 0
        ? {
            en: 'Feature not recommended due to hard constraints',
            fr: 'Fonctionnalité non recommandée en raison de contraintes strictes',
          }
        : warnings.length > 0
          ? {
              en: 'Feature possible with some compromises',
              fr: 'Fonctionnalité possible avec quelques compromis',
            }
          : { en: 'Feature is fully feasible', fr: 'Fonctionnalité entièrement réalisable' },
  };
}

/**
 * Get constraint impact matrix
 */
function getConstraintImpactMatrix(constraints) {
  const matrix = {};

  constraints.forEach((constraint) => {
    const categoryInfo = CONSTRAINT_CATEGORIES[constraint.category];
    if (!categoryInfo) return;

    matrix[constraint.id] = {
      impacts: categoryInfo.impacts,
      severity: constraint.severity,
      flexibility: categoryInfo.flexibility,
      mitigationOptions: categoryInfo.mitigationStrategies,
    };
  });

  return matrix;
}

module.exports = {
  analyzeConstraints,
  collectAllConstraints,
  identifyConflicts,
  prioritizeConstraints,
  calculateFeasibility,
  generateConstraintRecommendations,
  checkFeatureFeasibility,
  analyzeDependencies,
  assessRisks,
  generateResolutionPlan,
  getConstraintImpactMatrix,
  CONSTRAINT_CATEGORIES,
  SEVERITY_LEVELS,
  CONFLICT_TYPES,
  BUDGET_LEVELS,
  SIZE_CONSTRAINTS,
};
