/**
 * Budget Analyzer Module
 *
 * Advanced budget analysis with detailed cost estimation, ROI calculation,
 * value engineering recommendations, and intelligent allocation optimization.
 */

const budgetScoring = require('../sections/budget-constraints/scoring');
const budgetCalculator = require('../sections/budget-constraints/budget-calculator');

/**
 * Enhanced budget tier definitions with granular product quality levels
 */
const BUDGET_TIERS = {
  'entry': {
    range: [0, 15000],
    label: { en: 'Entry Level', fr: 'Niveau d\'entrée' },
    productQuality: 'value',
    applianceLevel: 'basic',
    materialLevel: 'economy',
    customization: 'none',
    laborRate: 'economy',
    contingencyRequired: 0.15,
    expectedDuration: { min: 2, max: 4, unit: 'weeks' }
  },
  'budget': {
    range: [15000, 30000],
    label: { en: 'Budget-Conscious', fr: 'Économique' },
    productQuality: 'value-plus',
    applianceLevel: 'standard',
    materialLevel: 'basic',
    customization: 'minimal',
    laborRate: 'standard',
    contingencyRequired: 0.12,
    expectedDuration: { min: 3, max: 6, unit: 'weeks' }
  },
  'mid': {
    range: [30000, 55000],
    label: { en: 'Mid-Range', fr: 'Milieu de gamme' },
    productQuality: 'mid-range',
    applianceLevel: 'mid-range',
    materialLevel: 'standard',
    customization: 'moderate',
    laborRate: 'standard',
    contingencyRequired: 0.10,
    expectedDuration: { min: 4, max: 8, unit: 'weeks' }
  },
  'mid-high': {
    range: [55000, 85000],
    label: { en: 'Premium', fr: 'Premium' },
    productQuality: 'premium',
    applianceLevel: 'premium',
    materialLevel: 'premium',
    customization: 'significant',
    laborRate: 'skilled',
    contingencyRequired: 0.10,
    expectedDuration: { min: 6, max: 10, unit: 'weeks' }
  },
  'luxury': {
    range: [85000, 150000],
    label: { en: 'Luxury', fr: 'Luxe' },
    productQuality: 'luxury',
    applianceLevel: 'professional',
    materialLevel: 'luxury',
    customization: 'full',
    laborRate: 'premium',
    contingencyRequired: 0.08,
    expectedDuration: { min: 8, max: 14, unit: 'weeks' }
  },
  'ultra-luxury': {
    range: [150000, Infinity],
    label: { en: 'Ultra-Luxury', fr: 'Ultra-Luxe' },
    productQuality: 'bespoke',
    applianceLevel: 'commercial',
    materialLevel: 'bespoke',
    customization: 'unlimited',
    laborRate: 'artisan',
    contingencyRequired: 0.05,
    expectedDuration: { min: 12, max: 24, unit: 'weeks' }
  }
};

/**
 * Category allocation percentages by tier and priority
 */
const ALLOCATION_TEMPLATES = {
  balanced: {
    cabinets: 0.35,
    countertops: 0.10,
    appliances: 0.20,
    flooring: 0.08,
    lighting: 0.05,
    plumbing: 0.07,
    electrical: 0.05,
    labor: 0.10
  },
  'appliance-focused': {
    cabinets: 0.28,
    countertops: 0.08,
    appliances: 0.32,
    flooring: 0.06,
    lighting: 0.05,
    plumbing: 0.06,
    electrical: 0.05,
    labor: 0.10
  },
  'cabinet-focused': {
    cabinets: 0.42,
    countertops: 0.10,
    appliances: 0.18,
    flooring: 0.06,
    lighting: 0.04,
    plumbing: 0.06,
    electrical: 0.04,
    labor: 0.10
  },
  'surface-focused': {
    cabinets: 0.30,
    countertops: 0.18,
    appliances: 0.18,
    flooring: 0.12,
    lighting: 0.04,
    plumbing: 0.05,
    electrical: 0.03,
    labor: 0.10
  }
};

/**
 * Cost per square foot estimates by tier
 */
const COST_PER_SQFT = {
  'entry': { min: 75, max: 150, avg: 110 },
  'budget': { min: 150, max: 250, avg: 200 },
  'mid': { min: 250, max: 400, avg: 325 },
  'mid-high': { min: 400, max: 600, avg: 500 },
  'luxury': { min: 600, max: 1000, avg: 800 },
  'ultra-luxury': { min: 1000, max: 2000, avg: 1400 }
};

/**
 * ROI estimates by improvement type
 */
const ROI_ESTIMATES = {
  'minor-refresh': { roi: 0.85, resaleImpact: 'moderate', paybackYears: 3 },
  'mid-range-remodel': { roi: 0.72, resaleImpact: 'significant', paybackYears: 5 },
  'major-upscale': { roi: 0.59, resaleImpact: 'high', paybackYears: 8 },
  'luxury-renovation': { roi: 0.54, resaleImpact: 'premium', paybackYears: 10 }
};

/**
 * Value engineering opportunities
 */
const VALUE_ENGINEERING = {
  cabinets: [
    { saving: 'stock-vs-custom', percentage: 0.40, impact: 'moderate', description: { en: 'Stock cabinets instead of custom', fr: 'Armoires standard au lieu de sur mesure' } },
    { saving: 'rta-assembly', percentage: 0.25, impact: 'low', description: { en: 'RTA (Ready-to-Assemble) cabinets', fr: 'Armoires à assembler' } },
    { saving: 'reface-vs-replace', percentage: 0.50, impact: 'moderate', description: { en: 'Reface existing cabinets', fr: 'Refaire la façade des armoires existantes' } },
    { saving: 'painted-vs-stained', percentage: 0.15, impact: 'minimal', description: { en: 'Painted finish vs stained wood', fr: 'Finition peinte vs bois teinté' } }
  ],
  countertops: [
    { saving: 'quartz-vs-marble', percentage: 0.35, impact: 'minimal', description: { en: 'Quartz instead of marble', fr: 'Quartz au lieu de marbre' } },
    { saving: 'granite-remnants', percentage: 0.50, impact: 'low', description: { en: 'Granite remnants for small areas', fr: 'Chutes de granit pour petites surfaces' } },
    { saving: 'laminate-premium', percentage: 0.70, impact: 'moderate', description: { en: 'High-end laminate alternatives', fr: 'Alternatives stratifiées haut de gamme' } },
    { saving: 'butcher-block-accent', percentage: 0.40, impact: 'low', description: { en: 'Butcher block for prep areas', fr: 'Bloc boucher pour zones de préparation' } }
  ],
  appliances: [
    { saving: 'package-deals', percentage: 0.20, impact: 'none', description: { en: 'Appliance package discounts', fr: 'Remises sur ensembles d\'appareils' } },
    { saving: 'floor-models', percentage: 0.30, impact: 'minimal', description: { en: 'Floor model or scratch-dent', fr: 'Modèles d\'exposition ou légèrement endommagés' } },
    { saving: 'previous-year', percentage: 0.25, impact: 'minimal', description: { en: 'Previous year models', fr: 'Modèles de l\'année précédente' } },
    { saving: 'mid-vs-pro', percentage: 0.45, impact: 'moderate', description: { en: 'Mid-range vs professional grade', fr: 'Milieu de gamme vs qualité professionnelle' } }
  ],
  flooring: [
    { saving: 'lvp-vs-hardwood', percentage: 0.50, impact: 'low', description: { en: 'Luxury vinyl plank vs hardwood', fr: 'Vinyle de luxe vs bois franc' } },
    { saving: 'porcelain-vs-stone', percentage: 0.55, impact: 'low', description: { en: 'Porcelain tile vs natural stone', fr: 'Porcelaine vs pierre naturelle' } },
    { saving: 'self-install', percentage: 0.40, impact: 'varies', description: { en: 'DIY flooring installation', fr: 'Installation de sol DIY' } }
  ],
  labor: [
    { saving: 'off-season', percentage: 0.15, impact: 'none', description: { en: 'Schedule during off-season', fr: 'Planifier hors saison' } },
    { saving: 'diy-demo', percentage: 0.08, impact: 'none', description: { en: 'DIY demolition', fr: 'Démolition DIY' } },
    { saving: 'diy-painting', percentage: 0.05, impact: 'none', description: { en: 'DIY painting and finishing', fr: 'Peinture et finition DIY' } },
    { saving: 'phased-approach', percentage: 0.10, impact: 'timeline', description: { en: 'Phased renovation approach', fr: 'Approche de rénovation par phases' } }
  ]
};

/**
 * Analyze complete budget situation with advanced metrics
 */
function analyzeBudget(responses) {
  const budgetAnswers = responses['budget-constraints'] || {};
  const spatialAnswers = responses['spatial-constraints'] || {};

  const analysis = {
    tier: determineBudgetTier(budgetAnswers),
    tierDetails: null,
    numericBudget: extractNumericBudget(budgetAnswers),
    allocation: null,
    costEstimate: null,
    constraints: [],
    opportunities: [],
    warnings: [],
    recommendations: [],
    productGuidance: {},
    valueEngineering: [],
    roiAnalysis: null,
    financingOptions: [],
    riskAssessment: null
  };

  // Get tier details
  analysis.tierDetails = BUDGET_TIERS[analysis.tier];

  // Calculate budget allocation
  analysis.allocation = calculateOptimizedAllocation(budgetAnswers, responses);

  // Generate cost estimate
  analysis.costEstimate = generateCostEstimate(analysis, spatialAnswers);

  // Identify constraints
  analysis.constraints = identifyBudgetConstraints(budgetAnswers, responses);

  // Identify opportunities
  analysis.opportunities = identifyBudgetOpportunities(budgetAnswers, responses);

  // Generate warnings
  analysis.warnings = generateBudgetWarnings(budgetAnswers, responses);

  // Generate product guidance
  analysis.productGuidance = generateProductGuidance(analysis.tier, budgetAnswers);

  // Calculate value engineering options
  analysis.valueEngineering = calculateValueEngineering(analysis, responses);

  // ROI analysis
  analysis.roiAnalysis = calculateROI(analysis, responses);

  // Financing options
  analysis.financingOptions = generateFinancingOptions(analysis, budgetAnswers);

  // Risk assessment
  analysis.riskAssessment = assessBudgetRisks(analysis, responses);

  // Generate recommendations
  analysis.recommendations = generateBudgetRecommendations(analysis, responses);

  return analysis;
}

/**
 * Extract numeric budget from answers
 */
function extractNumericBudget(budgetAnswers) {
  const totalBudget = budgetAnswers['total-budget'];

  const ranges = {
    'under-10k': { min: 0, max: 10000, mid: 7500 },
    '10k-25k': { min: 10000, max: 25000, mid: 17500 },
    '25k-50k': { min: 25000, max: 50000, mid: 37500 },
    '50k-75k': { min: 50000, max: 75000, mid: 62500 },
    '75k-100k': { min: 75000, max: 100000, mid: 87500 },
    'over-100k': { min: 100000, max: 200000, mid: 150000 }
  };

  return ranges[totalBudget] || ranges['25k-50k'];
}

/**
 * Determine budget tier from answers with finer granularity
 */
function determineBudgetTier(budgetAnswers) {
  const totalBudget = budgetAnswers['total-budget'];

  const tierMap = {
    'under-10k': 'entry',
    '10k-25k': 'budget',
    '25k-50k': 'mid',
    '50k-75k': 'mid-high',
    '75k-100k': 'luxury',
    'over-100k': 'ultra-luxury'
  };

  return tierMap[totalBudget] || 'mid';
}

/**
 * Calculate optimized allocation based on priorities
 */
function calculateOptimizedAllocation(budgetAnswers, responses) {
  const priorities = budgetAnswers['priority-spending'] || [];
  const savingsAreas = budgetAnswers['savings-areas'] || [];
  const numericBudget = extractNumericBudget(budgetAnswers);

  // Determine base template
  let template = 'balanced';
  if (priorities.includes('appliances')) template = 'appliance-focused';
  else if (priorities.includes('cabinets')) template = 'cabinet-focused';
  else if (priorities.includes('countertops') || priorities.includes('flooring')) template = 'surface-focused';

  const baseAllocation = { ...ALLOCATION_TEMPLATES[template] };

  // Adjust for priorities (increase by 20%)
  priorities.forEach(priority => {
    const category = mapPriorityToCategory(priority);
    if (category && baseAllocation[category]) {
      baseAllocation[category] *= 1.20;
    }
  });

  // Adjust for savings areas (decrease by 15%)
  savingsAreas.forEach(area => {
    const category = mapSavingsToCategory(area);
    if (category && baseAllocation[category]) {
      baseAllocation[category] *= 0.85;
    }
  });

  // Normalize to 100%
  const total = Object.values(baseAllocation).reduce((sum, val) => sum + val, 0);
  Object.keys(baseAllocation).forEach(key => {
    baseAllocation[key] = baseAllocation[key] / total;
  });

  // Calculate dollar amounts
  const dollarAllocation = {};
  Object.entries(baseAllocation).forEach(([category, percentage]) => {
    dollarAllocation[category] = {
      percentage: Math.round(percentage * 100),
      min: Math.round(numericBudget.min * percentage),
      max: Math.round(numericBudget.max * percentage),
      target: Math.round(numericBudget.mid * percentage)
    };
  });

  return {
    template,
    percentages: baseAllocation,
    dollars: dollarAllocation,
    totalBudget: numericBudget,
    confidence: calculateAllocationConfidence(budgetAnswers)
  };
}

/**
 * Map priority to category
 */
function mapPriorityToCategory(priority) {
  const map = {
    'appliances': 'appliances',
    'cabinets': 'cabinets',
    'countertops': 'countertops',
    'flooring': 'flooring',
    'lighting': 'lighting',
    'fixtures': 'plumbing'
  };
  return map[priority];
}

/**
 * Map savings area to category
 */
function mapSavingsToCategory(area) {
  const map = {
    'appliances': 'appliances',
    'cabinets': 'cabinets',
    'countertops': 'countertops',
    'flooring': 'flooring',
    'lighting': 'lighting',
    'labor': 'labor'
  };
  return map[area];
}

/**
 * Calculate allocation confidence
 */
function calculateAllocationConfidence(budgetAnswers) {
  let confidence = 70;

  if (budgetAnswers['priority-spending']?.length > 0) confidence += 10;
  if (budgetAnswers['savings-areas']?.length > 0) confidence += 5;
  if (budgetAnswers['budget-flexibility']) confidence += 5;
  if (budgetAnswers['contingency-comfort']) confidence += 5;

  return Math.min(95, confidence);
}

/**
 * Generate cost estimate based on space and tier
 */
function generateCostEstimate(analysis, spatialAnswers) {
  const tier = analysis.tier;
  const costPerSqft = COST_PER_SQFT[tier] || COST_PER_SQFT['mid'];

  // Estimate square footage
  const sizeEstimates = {
    small: 80,
    medium: 150,
    large: 250,
    'very-large': 350
  };

  const size = spatialAnswers['kitchen-size'] || 'medium';
  const sqft = sizeEstimates[size] || 150;

  const estimate = {
    squareFootage: sqft,
    costPerSqft: costPerSqft,
    totalEstimate: {
      low: Math.round(sqft * costPerSqft.min),
      high: Math.round(sqft * costPerSqft.max),
      midpoint: Math.round(sqft * costPerSqft.avg)
    },
    comparisonToNational: calculateNationalComparison(sqft, costPerSqft.avg),
    marketFactors: getMarketFactors()
  };

  // Check if estimate aligns with stated budget
  const numericBudget = analysis.numericBudget;
  estimate.budgetAlignment = {
    aligned: estimate.totalEstimate.midpoint <= numericBudget.max,
    gap: estimate.totalEstimate.midpoint - numericBudget.mid,
    recommendation: null
  };

  if (!estimate.budgetAlignment.aligned) {
    estimate.budgetAlignment.recommendation = {
      en: 'Consider reducing scope or increasing budget to match typical costs for your space.',
      fr: 'Envisagez de réduire la portée ou d\'augmenter le budget pour correspondre aux coûts typiques de votre espace.'
    };
  }

  return estimate;
}

/**
 * Calculate comparison to national averages
 */
function calculateNationalComparison(sqft, costPerSqft) {
  const nationalAverage = 300; // $300/sqft national average
  const difference = ((costPerSqft - nationalAverage) / nationalAverage) * 100;

  return {
    nationalAvgPerSqft: nationalAverage,
    yourCostPerSqft: costPerSqft,
    percentDifference: Math.round(difference),
    description: difference > 0 ?
      { en: 'Above national average', fr: 'Au-dessus de la moyenne nationale' } :
      { en: 'Below national average', fr: 'En dessous de la moyenne nationale' }
  };
}

/**
 * Get market factors affecting cost
 */
function getMarketFactors() {
  return [
    { factor: 'labor-market', impact: 'variable', description: { en: 'Local labor costs vary by region', fr: 'Les coûts de main-d\'œuvre varient selon la région' } },
    { factor: 'material-supply', impact: 'moderate', description: { en: 'Supply chain affects material pricing', fr: 'La chaîne d\'approvisionnement affecte les prix des matériaux' } },
    { factor: 'permit-costs', impact: 'low', description: { en: 'Permit and inspection fees', fr: 'Frais de permis et d\'inspection' } }
  ];
}

/**
 * Identify budget constraints
 */
function identifyBudgetConstraints(budgetAnswers, responses) {
  const constraints = [];
  const tier = determineBudgetTier(budgetAnswers);
  const aesthetic = responses['aesthetic-preferences'] || {};
  const spatial = responses['spatial-constraints'] || {};

  // Check for tight budget with high expectations
  if (tier === 'entry' || tier === 'budget') {
    if (aesthetic['cabinet-style'] === 'custom') {
      constraints.push({
        id: 'custom-cabinet-budget',
        type: 'budget-expectation-mismatch',
        severity: 'high',
        category: 'cabinets',
        message: {
          en: 'Custom cabinets typically require $50,000+ budget. Consider semi-custom alternatives.',
          fr: 'Les armoires sur mesure nécessitent généralement un budget de 50 000$+. Envisagez des alternatives semi-personnalisées.'
        },
        alternatives: ['semi-custom', 'stock-premium', 'rta-quality']
      });
    }

    if (aesthetic['countertop-material'] === 'marble' || aesthetic['countertop-material'] === 'quartzite') {
      constraints.push({
        id: 'premium-counter-budget',
        type: 'budget-expectation-mismatch',
        severity: 'high',
        category: 'countertops',
        message: {
          en: 'Premium natural stone counters may exceed budget. Consider quartz or granite.',
          fr: 'Les comptoirs en pierre naturelle premium peuvent dépasser le budget. Envisagez le quartz ou le granit.'
        },
        alternatives: ['quartz', 'granite', 'solid-surface']
      });
    }
  }

  // Check contingency
  if (budgetAnswers['contingency-comfort'] === 'no-buffer') {
    constraints.push({
      id: 'no-contingency',
      type: 'risk',
      severity: 'high',
      category: 'planning',
      message: {
        en: 'No contingency budget increases project risk. Unexpected costs average 10-20% of budget.',
        fr: 'Aucun budget de prévoyance augmente le risque du projet. Les coûts imprévus représentent en moyenne 10-20% du budget.'
      },
      recommendation: {
        en: 'Build in at least 10% contingency by reducing scope slightly.',
        fr: 'Prévoyez au moins 10% de contingence en réduisant légèrement la portée.'
      }
    });
  }

  // Check flexibility
  const flexibility = parseInt(budgetAnswers['budget-flexibility'], 10) || 3;
  if (flexibility <= 2) {
    constraints.push({
      id: 'strict-budget',
      type: 'flexibility',
      severity: 'medium',
      category: 'planning',
      message: {
        en: 'Strict budget limits require careful planning and may limit options during execution.',
        fr: 'Des limites budgétaires strictes nécessitent une planification minutieuse et peuvent limiter les options pendant l\'exécution.'
      }
    });
  }

  // Large space with small budget
  if (spatial['kitchen-size'] === 'large' || spatial['kitchen-size'] === 'very-large') {
    if (tier === 'entry' || tier === 'budget') {
      constraints.push({
        id: 'space-budget-mismatch',
        type: 'scope',
        severity: 'high',
        category: 'planning',
        message: {
          en: 'Large kitchen with limited budget requires strategic prioritization or phased approach.',
          fr: 'Grande cuisine avec budget limité nécessite une priorisation stratégique ou une approche par phases.'
        },
        recommendation: {
          en: 'Consider a phased renovation: Phase 1 cabinets/counters, Phase 2 appliances/finishes.',
          fr: 'Envisagez une rénovation par phases: Phase 1 armoires/comptoirs, Phase 2 appareils/finitions.'
        }
      });
    }
  }

  return constraints;
}

/**
 * Identify budget opportunities
 */
function identifyBudgetOpportunities(budgetAnswers, responses) {
  const opportunities = [];
  const tier = determineBudgetTier(budgetAnswers);
  const savingsAreas = budgetAnswers['savings-areas'] || [];

  // DIY savings potential
  if (savingsAreas.includes('diy-some') || savingsAreas.includes('diy-extensive')) {
    opportunities.push({
      id: 'diy-savings',
      type: 'labor-savings',
      potentialSavings: { min: 0.10, max: 0.25 },
      effort: 'high',
      skills: ['basic-tools', 'patience', 'time'],
      message: {
        en: 'DIY installation of demolition, painting, and simple fixtures can save 10-25% on labor.',
        fr: 'L\'installation DIY de démolition, peinture et accessoires simples peut économiser 10-25% sur la main-d\'œuvre.'
      },
      tasks: ['demolition', 'painting', 'hardware-installation', 'backsplash', 'flooring']
    });
  }

  // Cash payment discount
  if (budgetAnswers['financing-method'] === 'cash-savings') {
    opportunities.push({
      id: 'cash-discount',
      type: 'payment-discount',
      potentialSavings: { min: 0.03, max: 0.07 },
      message: {
        en: 'Cash payment may qualify for 3-7% contractor discount.',
        fr: 'Le paiement comptant peut donner droit à une remise de 3-7% de l\'entrepreneur.'
      }
    });
  }

  // Phased approach for better quality
  if (budgetAnswers['financing-method'] === 'phased') {
    opportunities.push({
      id: 'phased-quality',
      type: 'strategic',
      benefit: 'quality-upgrade',
      message: {
        en: 'Phased approach allows for higher quality materials in each phase while spreading costs.',
        fr: 'L\'approche par phases permet des matériaux de meilleure qualité dans chaque phase tout en étalant les coûts.'
      }
    });
  }

  // Off-season scheduling
  opportunities.push({
    id: 'off-season-scheduling',
    type: 'timing-discount',
    potentialSavings: { min: 0.05, max: 0.15 },
    bestMonths: ['January', 'February', 'November'],
    message: {
      en: 'Scheduling during winter months (Jan-Feb) can reduce contractor rates by 5-15%.',
      fr: 'Planifier pendant les mois d\'hiver (Jan-Fév) peut réduire les tarifs des entrepreneurs de 5-15%.'
    }
  });

  // Package deals
  opportunities.push({
    id: 'appliance-packages',
    type: 'bundle-discount',
    potentialSavings: { min: 0.15, max: 0.25 },
    message: {
      en: 'Purchasing appliance suites/packages typically saves 15-25% vs individual items.',
      fr: 'L\'achat d\'ensembles d\'appareils économise généralement 15-25% par rapport aux articles individuels.'
    }
  });

  // Closeout/overstock materials
  if (tier === 'budget' || tier === 'mid') {
    opportunities.push({
      id: 'closeout-materials',
      type: 'material-savings',
      potentialSavings: { min: 0.20, max: 0.50 },
      message: {
        en: 'Closeout, overstock, or slightly imperfect materials can save 20-50%.',
        fr: 'Les matériaux de fin de série, excédentaires ou légèrement imparfaits peuvent économiser 20-50%.'
      },
      sources: ['habitat-restore', 'floor-models', 'scratch-dent', 'remnants']
    });
  }

  return opportunities;
}

/**
 * Generate budget warnings
 */
function generateBudgetWarnings(budgetAnswers, responses) {
  const warnings = [];
  const numericBudget = extractNumericBudget(budgetAnswers);

  // Check appliance budget vs total budget
  const applianceBudget = budgetAnswers['appliance-budget'];
  const applianceRanges = {
    'under-5k': { max: 5000 },
    '5k-10k': { max: 10000 },
    '10k-20k': { max: 20000 },
    '20k-35k': { max: 35000 },
    'over-35k': { max: 50000 }
  };

  const applianceMax = applianceRanges[applianceBudget]?.max || 10000;

  if (applianceMax > numericBudget.mid * 0.45) {
    warnings.push({
      id: 'appliance-heavy',
      type: 'allocation-imbalance',
      severity: 'medium',
      message: {
        en: 'Appliance budget exceeds 45% of total. This may leave insufficient funds for cabinets and installation.',
        fr: 'Le budget appareils dépasse 45% du total. Cela peut laisser des fonds insuffisants pour les armoires et l\'installation.'
      },
      recommendation: {
        en: 'Consider mid-range appliances to maintain balance, unless cooking is top priority.',
        fr: 'Envisagez des appareils milieu de gamme pour maintenir l\'équilibre, sauf si la cuisine est la priorité absolue.'
      }
    });
  }

  // Large space, small budget warning
  const spatial = responses['spatial-constraints'] || {};
  const sizeMultipliers = { small: 0.6, medium: 1.0, large: 1.5, 'very-large': 2.0 };
  const sizeMultiplier = sizeMultipliers[spatial['kitchen-size']] || 1.0;

  const adjustedBudgetNeed = 50000 * sizeMultiplier;
  if (numericBudget.mid < adjustedBudgetNeed * 0.6) {
    warnings.push({
      id: 'underfunded-scope',
      type: 'scope-mismatch',
      severity: 'high',
      message: {
        en: `Your ${spatial['kitchen-size'] || 'medium'} kitchen typically requires $${Math.round(adjustedBudgetNeed / 1000)}k+ for a comprehensive renovation.`,
        fr: `Votre cuisine ${spatial['kitchen-size'] || 'moyenne'} nécessite généralement ${Math.round(adjustedBudgetNeed / 1000)}k$+ pour une rénovation complète.`
      },
      recommendation: {
        en: 'Consider a partial renovation focusing on highest-impact areas.',
        fr: 'Envisagez une rénovation partielle axée sur les zones à fort impact.'
      }
    });
  }

  // Timeline pressure with limited budget
  const futureAnswers = responses['future-needs'] || {};
  if (futureAnswers['timeline'] === 'urgent' && numericBudget.mid < 40000) {
    warnings.push({
      id: 'rush-budget-pressure',
      type: 'timeline-budget',
      severity: 'medium',
      message: {
        en: 'Urgent timeline with limited budget may increase costs. Rush orders and expedited labor add 15-25%.',
        fr: 'Un calendrier urgent avec un budget limité peut augmenter les coûts. Les commandes urgentes et la main-d\'œuvre accélérée ajoutent 15-25%.'
      }
    });
  }

  return warnings;
}

/**
 * Generate product guidance based on budget tier
 */
function generateProductGuidance(tier, budgetAnswers) {
  const tierInfo = BUDGET_TIERS[tier] || BUDGET_TIERS.mid;
  const priorities = budgetAnswers['priority-spending'] || [];

  const guidance = {
    cabinets: generateCabinetGuidance(tier, priorities),
    countertops: generateCountertopGuidance(tier, priorities),
    appliances: generateApplianceGuidance(tier, priorities),
    flooring: generateFlooringGuidance(tier),
    lighting: generateLightingGuidance(tier),
    plumbing: generatePlumbingGuidance(tier),
    overall: {
      qualityLevel: tierInfo.productQuality,
      customizationLevel: tierInfo.customization,
      laborLevel: tierInfo.laborRate
    }
  };

  return guidance;
}

/**
 * Generate cabinet guidance
 */
function generateCabinetGuidance(tier, priorities) {
  const isPriority = priorities.includes('cabinets');

  const guidance = {
    'entry': {
      quality: 'basic',
      suggested: ['stock-basic', 'rta-economy'],
      brands: { en: ['IKEA', 'Home Depot stock'], fr: ['IKEA', 'Stock Home Depot'] },
      features: ['basic-hardware', 'standard-finishes'],
      priceRange: { en: '$80-150/linear foot', fr: '80-150$/pied linéaire' }
    },
    'budget': {
      quality: isPriority ? 'value-plus' : 'value',
      suggested: isPriority ? ['semi-custom-basic', 'stock-premium'] : ['stock', 'rta-quality'],
      brands: { en: ['KraftMaid', 'Diamond', 'Shenandoah'], fr: ['KraftMaid', 'Diamond', 'Shenandoah'] },
      features: isPriority ? ['soft-close', 'choice-of-finishes'] : ['basic-hardware'],
      priceRange: { en: '$150-300/linear foot', fr: '150-300$/pied linéaire' }
    },
    'mid': {
      quality: isPriority ? 'mid-premium' : 'mid-range',
      suggested: isPriority ? ['semi-custom-premium', 'custom-local'] : ['semi-custom', 'stock-premium'],
      brands: { en: ['Thomasville', 'Schuler', 'Aristokraft'], fr: ['Thomasville', 'Schuler', 'Aristokraft'] },
      features: ['soft-close', 'dovetail-drawers', 'adjustable-shelves'],
      priceRange: { en: '$300-500/linear foot', fr: '300-500$/pied linéaire' }
    },
    'mid-high': {
      quality: isPriority ? 'premium-plus' : 'premium',
      suggested: isPriority ? ['custom', 'semi-custom-premium'] : ['semi-custom-premium'],
      brands: { en: ['Wood-Mode', 'Medallion', 'Dura Supreme'], fr: ['Wood-Mode', 'Medallion', 'Dura Supreme'] },
      features: ['full-extension', 'custom-inserts', 'premium-finishes'],
      priceRange: { en: '$500-800/linear foot', fr: '500-800$/pied linéaire' }
    },
    'luxury': {
      quality: 'luxury',
      suggested: ['custom', 'bespoke'],
      brands: { en: ['Poggenpohl', 'Bulthaup', 'SieMatic'], fr: ['Poggenpohl', 'Bulthaup', 'SieMatic'] },
      features: ['handcrafted', 'premium-woods', 'integrated-lighting'],
      priceRange: { en: '$800-1500/linear foot', fr: '800-1500$/pied linéaire' }
    },
    'ultra-luxury': {
      quality: 'bespoke',
      suggested: ['bespoke', 'artisan'],
      brands: { en: ['Smallbone', 'Christopher Peacock', 'custom artisan'], fr: ['Smallbone', 'Christopher Peacock', 'artisan sur mesure'] },
      features: ['museum-quality', 'exotic-materials', 'furniture-grade'],
      priceRange: { en: '$1500+/linear foot', fr: '1500$+/pied linéaire' }
    }
  };

  return guidance[tier] || guidance['mid'];
}

/**
 * Generate countertop guidance
 */
function generateCountertopGuidance(tier, priorities) {
  const isPriority = priorities.includes('countertops');

  const guidance = {
    'entry': {
      quality: 'economy',
      suggested: ['laminate', 'tile'],
      priceRange: { en: '$10-30/sq ft installed', fr: '10-30$/pi² installé' }
    },
    'budget': {
      quality: isPriority ? 'value-plus' : 'value',
      suggested: isPriority ? ['quartz-basic', 'granite-tier1'] : ['laminate-premium', 'butcher-block'],
      priceRange: { en: '$30-60/sq ft installed', fr: '30-60$/pi² installé' }
    },
    'mid': {
      quality: isPriority ? 'mid-premium' : 'mid-range',
      suggested: isPriority ? ['quartz-mid', 'granite-premium'] : ['quartz-basic', 'solid-surface'],
      priceRange: { en: '$60-100/sq ft installed', fr: '60-100$/pi² installé' }
    },
    'mid-high': {
      quality: isPriority ? 'premium-plus' : 'premium',
      suggested: isPriority ? ['quartz-premium', 'quartzite', 'marble-honed'] : ['quartz-mid', 'granite-premium'],
      priceRange: { en: '$100-175/sq ft installed', fr: '100-175$/pi² installé' }
    },
    'luxury': {
      quality: 'luxury',
      suggested: ['marble', 'quartzite-premium', 'exotic-granite'],
      priceRange: { en: '$175-300/sq ft installed', fr: '175-300$/pi² installé' }
    },
    'ultra-luxury': {
      quality: 'bespoke',
      suggested: ['rare-marble', 'onyx', 'custom-fabrication'],
      priceRange: { en: '$300+/sq ft installed', fr: '300$+/pi² installé' }
    }
  };

  return guidance[tier] || guidance['mid'];
}

/**
 * Generate appliance guidance
 */
function generateApplianceGuidance(tier, priorities) {
  const isPriority = priorities.includes('appliances');

  const guidance = {
    'entry': {
      quality: 'basic',
      suggested: ['value-brands'],
      brands: { en: ['Frigidaire', 'Whirlpool basic', 'GE basic'], fr: ['Frigidaire', 'Whirlpool de base', 'GE de base'] },
      features: ['standard-features']
    },
    'budget': {
      quality: isPriority ? 'value-plus' : 'value',
      suggested: isPriority ? ['mid-range-brands'] : ['value-brands'],
      brands: { en: ['Whirlpool', 'GE', 'Maytag'], fr: ['Whirlpool', 'GE', 'Maytag'] },
      features: isPriority ? ['stainless-steel', 'energy-star'] : ['standard-features']
    },
    'mid': {
      quality: isPriority ? 'mid-premium' : 'mid-range',
      suggested: isPriority ? ['premium-brands'] : ['mid-range-brands'],
      brands: { en: ['KitchenAid', 'Samsung', 'LG'], fr: ['KitchenAid', 'Samsung', 'LG'] },
      features: ['smart-features', 'premium-finishes']
    },
    'mid-high': {
      quality: isPriority ? 'premium-plus' : 'premium',
      suggested: isPriority ? ['professional-grade'] : ['premium-brands'],
      brands: { en: ['Bosch', 'GE Profile', 'Café'], fr: ['Bosch', 'GE Profile', 'Café'] },
      features: ['wifi-connected', 'advanced-cooking']
    },
    'luxury': {
      quality: 'professional',
      suggested: ['professional-grade', 'commercial-style'],
      brands: { en: ['Sub-Zero', 'Wolf', 'Thermador'], fr: ['Sub-Zero', 'Wolf', 'Thermador'] },
      features: ['commercial-grade', 'integrated-design']
    },
    'ultra-luxury': {
      quality: 'commercial',
      suggested: ['commercial', 'custom-integrated'],
      brands: { en: ['La Cornue', 'Gaggenau', 'Miele'], fr: ['La Cornue', 'Gaggenau', 'Miele'] },
      features: ['restaurant-grade', 'bespoke-finishing']
    }
  };

  return guidance[tier] || guidance['mid'];
}

/**
 * Generate flooring guidance
 */
function generateFlooringGuidance(tier) {
  const guidance = {
    'entry': { quality: 'economy', suggested: ['vinyl-sheet', 'laminate-basic'] },
    'budget': { quality: 'value', suggested: ['luxury-vinyl-plank', 'laminate-premium'] },
    'mid': { quality: 'mid-range', suggested: ['engineered-hardwood', 'porcelain-tile'] },
    'mid-high': { quality: 'premium', suggested: ['hardwood', 'large-format-porcelain'] },
    'luxury': { quality: 'luxury', suggested: ['wide-plank-hardwood', 'natural-stone'] },
    'ultra-luxury': { quality: 'bespoke', suggested: ['reclaimed-wood', 'custom-stone', 'terrazzo'] }
  };

  return guidance[tier] || guidance['mid'];
}

/**
 * Generate lighting guidance
 */
function generateLightingGuidance(tier) {
  const guidance = {
    'entry': { quality: 'basic', suggested: ['builder-grade', 'led-strip-basic'] },
    'budget': { quality: 'value', suggested: ['led-under-cabinet', 'basic-pendants'] },
    'mid': { quality: 'mid-range', suggested: ['led-system', 'decorative-pendants'] },
    'mid-high': { quality: 'premium', suggested: ['layered-lighting', 'designer-fixtures'] },
    'luxury': { quality: 'luxury', suggested: ['custom-design', 'smart-system'] },
    'ultra-luxury': { quality: 'bespoke', suggested: ['architectural-lighting', 'artist-fixtures'] }
  };

  return guidance[tier] || guidance['mid'];
}

/**
 * Generate plumbing guidance
 */
function generatePlumbingGuidance(tier) {
  const guidance = {
    'entry': { quality: 'basic', suggested: ['chrome-basic', 'standard-sink'] },
    'budget': { quality: 'value', suggested: ['chrome-quality', 'stainless-sink'] },
    'mid': { quality: 'mid-range', suggested: ['pull-down-faucet', 'undermount-sink'] },
    'mid-high': { quality: 'premium', suggested: ['touchless-faucet', 'workstation-sink'] },
    'luxury': { quality: 'luxury', suggested: ['pot-filler', 'custom-sink'] },
    'ultra-luxury': { quality: 'bespoke', suggested: ['designer-fixtures', 'integrated-water-systems'] }
  };

  return guidance[tier] || guidance['mid'];
}

/**
 * Calculate value engineering options
 */
function calculateValueEngineering(analysis, responses) {
  const options = [];
  const tier = analysis.tier;
  const allocation = analysis.allocation;

  // Only suggest value engineering for non-luxury tiers
  if (tier === 'luxury' || tier === 'ultra-luxury') {
    return options;
  }

  Object.entries(VALUE_ENGINEERING).forEach(([category, savings]) => {
    const categoryBudget = allocation.dollars[category]?.target || 0;

    savings.forEach(saving => {
      if (categoryBudget > 0) {
        const potentialSavings = Math.round(categoryBudget * saving.percentage);

        if (potentialSavings >= 500) { // Only show if saves $500+
          options.push({
            category,
            id: saving.saving,
            description: saving.description,
            potentialSavings: {
              amount: potentialSavings,
              percentage: Math.round(saving.percentage * 100)
            },
            qualityImpact: saving.impact,
            recommended: saving.impact === 'minimal' || saving.impact === 'low'
          });
        }
      }
    });
  });

  // Sort by savings amount
  options.sort((a, b) => b.potentialSavings.amount - a.potentialSavings.amount);

  return options.slice(0, 10); // Return top 10 options
}

/**
 * Calculate ROI analysis
 */
function calculateROI(analysis, responses) {
  const tier = analysis.tier;
  const numericBudget = analysis.numericBudget;

  // Determine renovation type based on tier
  let renovationType;
  if (tier === 'entry' || tier === 'budget') renovationType = 'minor-refresh';
  else if (tier === 'mid') renovationType = 'mid-range-remodel';
  else if (tier === 'mid-high') renovationType = 'major-upscale';
  else renovationType = 'luxury-renovation';

  const roiData = ROI_ESTIMATES[renovationType];

  return {
    renovationType,
    investmentAmount: numericBudget.mid,
    expectedROI: Math.round(roiData.roi * 100),
    estimatedValueAdded: Math.round(numericBudget.mid * roiData.roi),
    resaleImpact: roiData.resaleImpact,
    paybackPeriod: {
      years: roiData.paybackYears,
      description: {
        en: `Typically recoups investment in ${roiData.paybackYears} years through increased home value`,
        fr: `Récupère généralement l'investissement en ${roiData.paybackYears} ans grâce à l'augmentation de la valeur de la maison`
      }
    },
    marketNotes: {
      en: 'Kitchen renovations consistently rank among the highest ROI home improvements.',
      fr: 'Les rénovations de cuisine se classent constamment parmi les améliorations domiciliaires au meilleur retour sur investissement.'
    }
  };
}

/**
 * Generate financing options
 */
function generateFinancingOptions(analysis, budgetAnswers) {
  const options = [];
  const numericBudget = analysis.numericBudget;
  const method = budgetAnswers['financing-method'];

  if (method === 'cash-savings' || !method) {
    options.push({
      type: 'cash',
      description: { en: 'Pay cash from savings', fr: 'Payer comptant à partir des économies' },
      pros: [
        { en: 'No interest costs', fr: 'Pas de frais d\'intérêt' },
        { en: 'Possible contractor discounts', fr: 'Remises possibles des entrepreneurs' },
        { en: 'No monthly payments', fr: 'Pas de paiements mensuels' }
      ],
      cons: [
        { en: 'Depletes savings', fr: 'Épuise les économies' },
        { en: 'Opportunity cost', fr: 'Coût d\'opportunité' }
      ]
    });
  }

  if (numericBudget.mid >= 25000) {
    options.push({
      type: 'heloc',
      description: { en: 'Home Equity Line of Credit', fr: 'Marge de crédit hypothécaire' },
      estimatedRate: '6-9% variable',
      pros: [
        { en: 'Lower interest rates', fr: 'Taux d\'intérêt plus bas' },
        { en: 'Tax-deductible interest (consult CPA)', fr: 'Intérêts déductibles d\'impôt (consultez un CPA)' },
        { en: 'Flexible draw schedule', fr: 'Calendrier de tirage flexible' }
      ],
      cons: [
        { en: 'Uses home as collateral', fr: 'Utilise la maison comme garantie' },
        { en: 'Variable rates', fr: 'Taux variables' }
      ]
    });

    options.push({
      type: 'home-equity-loan',
      description: { en: 'Home Equity Loan', fr: 'Prêt sur valeur domiciliaire' },
      estimatedRate: '7-10% fixed',
      pros: [
        { en: 'Fixed rate and payment', fr: 'Taux et paiement fixes' },
        { en: 'Lower rate than personal loan', fr: 'Taux plus bas qu\'un prêt personnel' }
      ],
      cons: [
        { en: 'Uses home as collateral', fr: 'Utilise la maison comme garantie' },
        { en: 'Closing costs', fr: 'Frais de clôture' }
      ]
    });
  }

  options.push({
    type: 'personal-loan',
    description: { en: 'Personal Loan', fr: 'Prêt personnel' },
    estimatedRate: '8-15%',
    pros: [
      { en: 'No collateral required', fr: 'Aucune garantie requise' },
      { en: 'Quick approval', fr: 'Approbation rapide' },
      { en: 'Fixed payments', fr: 'Paiements fixes' }
    ],
    cons: [
      { en: 'Higher interest rates', fr: 'Taux d\'intérêt plus élevés' },
      { en: 'Shorter terms', fr: 'Termes plus courts' }
    ]
  });

  return options;
}

/**
 * Assess budget risks
 */
function assessBudgetRisks(analysis, responses) {
  const risks = [];
  let overallRisk = 'low';

  // Check for no contingency
  if (analysis.constraints.find(c => c.id === 'no-contingency')) {
    risks.push({
      type: 'contingency',
      level: 'high',
      description: { en: 'No buffer for unexpected costs', fr: 'Aucune marge pour les coûts imprévus' },
      mitigation: { en: 'Build in 10-15% contingency', fr: 'Prévoir 10-15% de contingence' }
    });
    overallRisk = 'high';
  }

  // Check for scope-budget mismatch
  if (analysis.warnings.find(w => w.id === 'underfunded-scope')) {
    risks.push({
      type: 'scope',
      level: 'high',
      description: { en: 'Budget may not cover full renovation', fr: 'Le budget peut ne pas couvrir la rénovation complète' },
      mitigation: { en: 'Prioritize essential elements or phase the project', fr: 'Prioriser les éléments essentiels ou échelonner le projet' }
    });
    overallRisk = 'high';
  }

  // Check timeline pressure
  const futureAnswers = responses['future-needs'] || {};
  if (futureAnswers['timeline'] === 'urgent') {
    risks.push({
      type: 'timeline',
      level: 'medium',
      description: { en: 'Rush timeline may increase costs', fr: 'Un calendrier urgent peut augmenter les coûts' },
      mitigation: { en: 'Allow 8-12 weeks for optimal pricing', fr: 'Prévoir 8-12 semaines pour un prix optimal' }
    });
    if (overallRisk === 'low') overallRisk = 'medium';
  }

  // Material price volatility
  risks.push({
    type: 'market',
    level: 'low',
    description: { en: 'Material prices may fluctuate', fr: 'Les prix des matériaux peuvent fluctuer' },
    mitigation: { en: 'Lock in prices early with deposits', fr: 'Fixer les prix tôt avec des dépôts' }
  });

  return {
    overallRiskLevel: overallRisk,
    risks,
    recommendation: overallRisk === 'high' ?
      { en: 'Review budget allocation and consider adjustments before proceeding', fr: 'Revoir l\'allocation budgétaire et envisager des ajustements avant de continuer' } :
      { en: 'Budget plan is reasonable with manageable risks', fr: 'Le plan budgétaire est raisonnable avec des risques gérables' }
  };
}

/**
 * Generate budget recommendations
 */
function generateBudgetRecommendations(analysis, responses) {
  const recommendations = [];

  // Based on constraints
  analysis.constraints.forEach(constraint => {
    if (constraint.id === 'no-contingency') {
      recommendations.push({
        id: 'add-contingency',
        priority: 'high',
        type: 'budget',
        title: { en: 'Build Contingency Fund', fr: 'Créer un fonds de prévoyance' },
        description: {
          en: 'Reduce scope by 10-15% to create contingency. Kitchen renovations typically have unexpected costs.',
          fr: 'Réduisez la portée de 10-15% pour créer une contingence. Les rénovations de cuisine ont généralement des coûts imprévus.'
        },
        impact: 'risk-reduction'
      });
    }

    if (constraint.id === 'custom-cabinet-budget' || constraint.id === 'premium-counter-budget') {
      recommendations.push({
        id: `alternative-${constraint.category}`,
        priority: 'high',
        type: 'material',
        title: { en: `Consider ${constraint.category} Alternatives`, fr: `Envisagez des alternatives pour ${constraint.category}` },
        description: constraint.message,
        alternatives: constraint.alternatives,
        impact: 'budget-alignment'
      });
    }
  });

  // Based on opportunities
  if (analysis.opportunities.length > 0) {
    const topOpportunity = analysis.opportunities[0];
    recommendations.push({
      id: 'leverage-opportunity',
      priority: 'medium',
      type: 'savings',
      title: { en: 'Potential Savings Opportunity', fr: 'Opportunité d\'économies potentielles' },
      description: topOpportunity.message,
      potentialSavings: topOpportunity.potentialSavings,
      impact: 'cost-savings'
    });
  }

  // Value engineering recommendation
  if (analysis.valueEngineering.length > 0) {
    const topVE = analysis.valueEngineering.filter(ve => ve.recommended).slice(0, 3);
    if (topVE.length > 0) {
      const totalSavings = topVE.reduce((sum, ve) => sum + ve.potentialSavings.amount, 0);
      recommendations.push({
        id: 'value-engineering',
        priority: 'medium',
        type: 'optimization',
        title: { en: 'Value Engineering Options', fr: 'Options d\'ingénierie de valeur' },
        description: {
          en: `${topVE.length} low-impact changes could save approximately $${totalSavings.toLocaleString()}.`,
          fr: `${topVE.length} changements à faible impact pourraient économiser environ ${totalSavings.toLocaleString()}$.`
        },
        options: topVE,
        impact: 'cost-optimization'
      });
    }
  }

  // Tier-specific guidance
  if (analysis.tier === 'entry' || analysis.tier === 'budget') {
    recommendations.push({
      id: 'value-focus',
      priority: 'medium',
      type: 'approach',
      title: { en: 'Strategic Splurge Strategy', fr: 'Stratégie de dépenses stratégiques' },
      description: {
        en: 'Choose 2-3 high-impact items to invest in (visible areas like countertops or hardware) and save on hidden elements.',
        fr: 'Choisissez 2-3 éléments à fort impact pour investir (zones visibles comme les comptoirs ou la quincaillerie) et économisez sur les éléments cachés.'
      },
      impact: 'value-maximization'
    });
  }

  return recommendations;
}

/**
 * Check if selection fits budget
 */
function checkBudgetFit(selection, budgetTier) {
  const tierLevels = {
    'entry': 1,
    'budget': 2,
    'mid': 3,
    'mid-high': 4,
    'luxury': 5,
    'ultra-luxury': 6
  };

  const selectionLevels = {
    'economy': 1,
    'basic': 2,
    'standard': 3,
    'premium': 4,
    'luxury': 5,
    'bespoke': 6
  };

  const budgetLevel = tierLevels[budgetTier] || 3;
  const selectionLevel = selectionLevels[selection.quality] || 3;

  return {
    fits: selectionLevel <= budgetLevel,
    overBudget: selectionLevel > budgetLevel,
    underBudget: selectionLevel < budgetLevel - 1,
    suggestion: selectionLevel > budgetLevel
      ? { en: `Consider ${Object.keys(selectionLevels).find(k => selectionLevels[k] === budgetLevel)} option`, fr: `Envisagez l'option ${Object.keys(selectionLevels).find(k => selectionLevels[k] === budgetLevel)}` }
      : null,
    upgradeOpportunity: selectionLevel < budgetLevel - 1
      ? { en: 'Budget allows for upgrade in this category', fr: 'Le budget permet une amélioration dans cette catégorie' }
      : null
  };
}

module.exports = {
  analyzeBudget,
  determineBudgetTier,
  extractNumericBudget,
  calculateOptimizedAllocation,
  generateCostEstimate,
  identifyBudgetConstraints,
  identifyBudgetOpportunities,
  generateBudgetWarnings,
  generateProductGuidance,
  calculateValueEngineering,
  calculateROI,
  generateFinancingOptions,
  assessBudgetRisks,
  generateBudgetRecommendations,
  checkBudgetFit,
  BUDGET_TIERS,
  ALLOCATION_TEMPLATES,
  COST_PER_SQFT,
  ROI_ESTIMATES,
  VALUE_ENGINEERING
};
