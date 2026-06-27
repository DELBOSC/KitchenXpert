/**
 * Budget Constraints Section Scoring Module
 *
 * Comprehensive budget analysis with:
 * - Multi-tier budget categorization with detailed product recommendations
 * - Financing analysis and optimization
 * - Priority-based allocation algorithms
 * - ROI and resale value considerations
 * - Contingency and risk assessment
 * - Cost-benefit analysis for different material choices
 * - Phased project planning support
 */

const budgetCalculator = require('./budget-calculator');

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/**
 * Score weights for budget factors (normalized to 1.0)
 */
const SCORE_WEIGHTS = {
  totalBudget: 0.25,
  budgetFlexibility: 0.15,
  financingMethod: 0.1,
  prioritySpending: 0.15,
  savingsAreas: 0.08,
  applianceBudget: 0.12,
  roiConsideration: 0.08,
  contingencyComfort: 0.07,
};

/**
 * Comprehensive budget tier configurations
 */
const BUDGET_TIER_CONFIGURATIONS = {
  'under-10k': {
    score: 20,
    tier: 'budget',
    label: { en: 'Budget-Conscious', fr: 'Économique' },
    range: { min: 0, max: 10000, midpoint: 7500 },
    characteristics: {
      scope: 'cosmetic-refresh',
      laborAllocation: 0.25,
      materialQuality: 'entry-level',
      applianceLevel: 'basic',
      customization: 'minimal',
    },
    productTiers: {
      cabinets: ['stock', 'rta'],
      countertops: ['laminate', 'tile', 'butcher-block'],
      appliances: ['basic-brand', 'value-line'],
      flooring: ['vinyl', 'laminate'],
      fixtures: ['chrome-basic'],
    },
    recommendations: {
      focus: ['cabinet-refacing', 'paint-refresh', 'hardware-update', 'lighting-upgrade'],
      avoid: ['structural-changes', 'custom-cabinets', 'natural-stone'],
    },
    tags: ['value-focused', 'cosmetic-updates', 'diy-friendly'],
    warnings: [
      {
        en: 'Limited scope for structural changes',
        fr: 'Portée limitée pour les changements structurels',
      },
      {
        en: 'Consider phased approach for larger goals',
        fr: 'Envisagez une approche par phases pour des objectifs plus importants',
      },
    ],
  },
  '10k-25k': {
    score: 40,
    tier: 'entry',
    label: { en: 'Entry Renovation', fr: "Rénovation d'entrée" },
    range: { min: 10000, max: 25000, midpoint: 17500 },
    characteristics: {
      scope: 'partial-renovation',
      laborAllocation: 0.3,
      materialQuality: 'mid-entry',
      applianceLevel: 'standard',
      customization: 'limited',
    },
    productTiers: {
      cabinets: ['stock', 'semi-custom-basic'],
      countertops: ['laminate', 'solid-surface', 'quartz-entry'],
      appliances: ['standard-brand', 'stainless-basic'],
      flooring: ['vinyl-luxury', 'laminate-premium', 'ceramic-tile'],
      fixtures: ['chrome-mid', 'brushed-nickel'],
    },
    recommendations: {
      focus: ['new-cabinets', 'countertop-upgrade', 'appliance-refresh', 'new-flooring'],
      avoid: ['layout-changes', 'premium-materials', 'custom-features'],
    },
    tags: ['partial-upgrade', 'essential-focus'],
    warnings: [
      {
        en: 'Choose priorities carefully - cannot address everything',
        fr: 'Choisissez vos priorités avec soin - ne peut pas tout aborder',
      },
    ],
  },
  '25k-50k': {
    score: 60,
    tier: 'mid',
    label: { en: 'Mid-Range Renovation', fr: 'Rénovation milieu de gamme' },
    range: { min: 25000, max: 50000, midpoint: 37500 },
    characteristics: {
      scope: 'full-renovation',
      laborAllocation: 0.35,
      materialQuality: 'mid-range',
      applianceLevel: 'mid-premium',
      customization: 'moderate',
    },
    productTiers: {
      cabinets: ['semi-custom', 'quality-stock'],
      countertops: ['quartz', 'granite', 'solid-surface-premium'],
      appliances: ['mid-range-brand', 'stainless-quality'],
      flooring: ['hardwood-engineered', 'luxury-vinyl-premium', 'porcelain-tile'],
      fixtures: ['quality-chrome', 'brushed-nickel-premium', 'matte-black'],
    },
    recommendations: {
      focus: [
        'full-cabinet-replacement',
        'quality-countertops',
        'appliance-package',
        'professional-labor',
      ],
      consider: ['minor-layout-adjustments', 'lighting-upgrade', 'backsplash-tile'],
    },
    tags: ['full-renovation', 'quality-materials', 'professional-installation'],
    warnings: [],
  },
  '50k-75k': {
    score: 75,
    tier: 'upper-mid',
    label: { en: 'Upper Mid-Range', fr: 'Milieu de gamme supérieur' },
    range: { min: 50000, max: 75000, midpoint: 62500 },
    characteristics: {
      scope: 'comprehensive-renovation',
      laborAllocation: 0.38,
      materialQuality: 'premium-mid',
      applianceLevel: 'premium',
      customization: 'good',
    },
    productTiers: {
      cabinets: ['semi-custom-premium', 'entry-custom'],
      countertops: ['quartz-premium', 'granite-premium', 'quartzite'],
      appliances: ['premium-brand', 'professional-style'],
      flooring: ['hardwood-solid', 'large-format-tile', 'natural-stone-entry'],
      fixtures: ['designer-basic', 'touchless-options'],
    },
    recommendations: {
      focus: [
        'quality-cabinets',
        'premium-countertops',
        'professional-appliances',
        'custom-lighting',
      ],
      consider: ['layout-modifications', 'island-addition', 'upgraded-electrical'],
    },
    tags: ['comprehensive', 'premium-materials', 'layout-flexibility'],
    warnings: [],
  },
  '75k-100k': {
    score: 90,
    tier: 'premium',
    label: { en: 'Premium Renovation', fr: 'Rénovation Premium' },
    range: { min: 75000, max: 100000, midpoint: 87500 },
    characteristics: {
      scope: 'high-end-renovation',
      laborAllocation: 0.4,
      materialQuality: 'premium',
      applianceLevel: 'professional',
      customization: 'extensive',
    },
    productTiers: {
      cabinets: ['custom', 'semi-custom-luxury'],
      countertops: ['quartzite', 'marble', 'quartz-luxury'],
      appliances: ['professional-grade', 'integrated-premium'],
      flooring: ['hardwood-premium', 'natural-stone', 'large-format-porcelain'],
      fixtures: ['designer-premium', 'smart-fixtures'],
    },
    recommendations: {
      focus: ['custom-cabinetry', 'luxury-surfaces', 'professional-appliances', 'smart-features'],
      consider: ['structural-modifications', 'window-additions', 'specialty-storage'],
    },
    tags: ['high-end', 'custom-features', 'structural-options'],
    warnings: [],
  },
  'over-100k': {
    score: 100,
    tier: 'luxury',
    label: { en: 'Luxury Renovation', fr: 'Rénovation de luxe' },
    range: { min: 100000, max: 500000, midpoint: 150000 },
    characteristics: {
      scope: 'complete-transformation',
      laborAllocation: 0.42,
      materialQuality: 'luxury',
      applianceLevel: 'commercial-grade',
      customization: 'unlimited',
    },
    productTiers: {
      cabinets: ['custom-luxury', 'bespoke'],
      countertops: ['exotic-stone', 'marble-rare', 'custom-fabrication'],
      appliances: ['commercial-grade', 'fully-integrated', 'specialty-brand'],
      flooring: ['exotic-hardwood', 'custom-tile', 'heated-natural-stone'],
      fixtures: ['designer-luxury', 'custom-fabricated'],
    },
    recommendations: {
      focus: ['bespoke-design', 'rare-materials', 'commercial-equipment', 'smart-home-integration'],
      consider: ['addition-expansion', 'window-walls', 'outdoor-connection', 'butler-pantry'],
    },
    tags: ['luxury', 'bespoke', 'no-compromises', 'architectural-changes'],
    warnings: [],
  },
};

/**
 * Financing method configurations with impact analysis
 */
const FINANCING_CONFIGURATIONS = {
  'cash-savings': {
    score: 100,
    type: 'immediate',
    interestRate: 0,
    advantages: {
      en: ['No interest costs', 'Maximum negotiating power', 'Immediate start possible', 'No debt'],
      fr: [
        "Aucun frais d'intérêt",
        'Pouvoir de négociation maximum',
        'Démarrage immédiat possible',
        'Aucune dette',
      ],
    },
    considerations: {
      en: ['Ensure adequate emergency fund remains', 'Consider opportunity cost of capital'],
      fr: ["Assurez un fonds d'urgence adéquat", "Considérez le coût d'opportunité du capital"],
    },
    tags: ['debt-free', 'immediate-start', 'negotiating-power'],
    effectiveBudgetMultiplier: 1.0,
    timelineImpact: 'none',
  },
  'home-equity': {
    score: 85,
    type: 'secured-loan',
    interestRate: { typical: 0.07, range: { min: 0.05, max: 0.1 } },
    advantages: {
      en: [
        'Lower interest rates',
        'Tax-deductible interest (consult tax advisor)',
        'Larger amounts available',
      ],
      fr: [
        "Taux d'intérêt plus bas",
        "Intérêts déductibles d'impôt (consultez un conseiller)",
        'Montants plus importants disponibles',
      ],
    },
    considerations: {
      en: ['Home used as collateral', 'Requires equity and approval', 'Closing costs apply'],
      fr: [
        'Maison utilisée comme garantie',
        "Nécessite de l'équité et une approbation",
        'Frais de clôture applicables',
      ],
    },
    tags: ['low-interest', 'larger-budget-possible', 'home-collateral'],
    effectiveBudgetMultiplier: 1.1,
    timelineImpact: 'approval-delay',
  },
  'personal-loan': {
    score: 70,
    type: 'unsecured-loan',
    interestRate: { typical: 0.1, range: { min: 0.07, max: 0.15 } },
    advantages: {
      en: ['No collateral required', 'Fixed payments', 'Quick approval possible'],
      fr: ['Aucune garantie requise', 'Paiements fixes', 'Approbation rapide possible'],
    },
    considerations: {
      en: ['Higher interest rates', 'Credit score impact', 'Typically smaller amounts'],
      fr: [
        "Taux d'intérêt plus élevés",
        'Impact sur la cote de crédit',
        'Généralement des montants plus petits',
      ],
    },
    tags: ['fixed-payments', 'no-collateral'],
    effectiveBudgetMultiplier: 0.95,
    timelineImpact: 'minimal',
  },
  'credit-card': {
    score: 45,
    type: 'revolving',
    interestRate: { typical: 0.2, range: { min: 0.15, max: 0.25 } },
    advantages: {
      en: ['Good for small purchases', 'Rewards points possible', 'Immediate availability'],
      fr: ['Bon pour les petits achats', 'Points récompenses possibles', 'Disponibilité immédiate'],
    },
    considerations: {
      en: [
        'Very high interest',
        'Should only use for small items',
        'Requires immediate payoff plan',
      ],
      fr: [
        'Intérêt très élevé',
        'À utiliser uniquement pour petits articles',
        'Nécessite un plan de remboursement immédiat',
      ],
    },
    tags: ['small-purchases-only', 'rewards-possible'],
    effectiveBudgetMultiplier: 0.85,
    timelineImpact: 'none',
    warnings: [
      {
        en: 'Credit cards should only be used for small purchases with immediate payoff plan',
        fr: 'Les cartes de crédit ne devraient être utilisées que pour de petits achats avec un plan de remboursement immédiat',
      },
    ],
  },
  'contractor-financing': {
    score: 65,
    type: 'promotional',
    interestRate: { typical: 0.08, range: { min: 0, max: 0.15 } },
    advantages: {
      en: ['Convenient one-stop', 'Promotional rates possible', 'Built into project'],
      fr: ['Un seul interlocuteur', 'Taux promotionnels possibles', 'Intégré au projet'],
    },
    considerations: {
      en: ['Compare rates carefully', 'May limit contractor choices', 'Read terms carefully'],
      fr: [
        'Comparez les taux attentivement',
        'Peut limiter le choix des entrepreneurs',
        'Lisez les conditions attentivement',
      ],
    },
    tags: ['convenient', 'bundled-service'],
    effectiveBudgetMultiplier: 0.95,
    timelineImpact: 'minimal',
  },
  phased: {
    score: 60,
    type: 'staged',
    interestRate: 0,
    advantages: {
      en: ['Pay as you go', 'No interest if saving between phases', 'Flexibility to adjust scope'],
      fr: [
        'Payez au fur et à mesure',
        'Aucun intérêt si vous épargnez entre les phases',
        'Flexibilité pour ajuster la portée',
      ],
    },
    considerations: {
      en: ['Extended timeline', 'Living in construction zone', 'Price increases over time'],
      fr: [
        'Délai prolongé',
        'Vivre dans une zone de construction',
        'Augmentation des prix au fil du temps',
      ],
    },
    tags: ['extended-timeline', 'flexible', 'no-debt'],
    effectiveBudgetMultiplier: 1.05,
    timelineImpact: 'significant-extension',
  },
};

/**
 * Priority spending category configurations
 */
const PRIORITY_SPENDING_CONFIGURATIONS = {
  appliances: {
    typicalAllocation: { min: 0.15, max: 0.35 },
    importance: 'high',
    description: {
      en: 'Kitchen appliances (refrigerator, range, dishwasher, etc.)',
      fr: 'Appareils de cuisine (réfrigérateur, cuisinière, lave-vaisselle, etc.)',
    },
    tags: ['appliance-focused'],
    roiImpact: 'moderate',
    durabilityYears: 15,
  },
  cabinets: {
    typicalAllocation: { min: 0.25, max: 0.45 },
    importance: 'high',
    description: {
      en: 'Kitchen cabinets and cabinet hardware',
      fr: 'Armoires de cuisine et quincaillerie',
    },
    tags: ['storage-focused', 'custom-cabinets'],
    roiImpact: 'high',
    durabilityYears: 25,
  },
  countertops: {
    typicalAllocation: { min: 0.1, max: 0.2 },
    importance: 'medium-high',
    description: {
      en: 'Countertop surfaces',
      fr: 'Surfaces de comptoir',
    },
    tags: ['surface-focused'],
    roiImpact: 'high',
    durabilityYears: 20,
  },
  layout: {
    typicalAllocation: { min: 0.1, max: 0.25 },
    importance: 'high',
    description: {
      en: 'Layout changes, structural modifications',
      fr: 'Changements de disposition, modifications structurelles',
    },
    tags: ['structural-changes'],
    roiImpact: 'very-high',
    durabilityYears: 50,
  },
  lighting: {
    typicalAllocation: { min: 0.03, max: 0.08 },
    importance: 'medium',
    description: {
      en: 'Task, ambient, and accent lighting',
      fr: "Éclairage de travail, d'ambiance et d'accent",
    },
    tags: ['ambiance-focused'],
    roiImpact: 'moderate',
    durabilityYears: 15,
  },
  flooring: {
    typicalAllocation: { min: 0.05, max: 0.12 },
    importance: 'medium',
    description: {
      en: 'Kitchen flooring material and installation',
      fr: 'Matériau de revêtement de sol et installation',
    },
    tags: ['flooring-investment'],
    roiImpact: 'moderate',
    durabilityYears: 20,
  },
  storage: {
    typicalAllocation: { min: 0.05, max: 0.12 },
    importance: 'medium',
    description: {
      en: 'Specialty storage solutions (pull-outs, organizers)',
      fr: 'Solutions de rangement spécialisées (coulissants, organisateurs)',
    },
    tags: ['organization-focused'],
    roiImpact: 'low',
    durabilityYears: 15,
  },
  technology: {
    typicalAllocation: { min: 0.02, max: 0.08 },
    importance: 'low',
    description: {
      en: 'Smart home features, charging stations',
      fr: 'Fonctionnalités maison intelligente, stations de recharge',
    },
    tags: ['smart-home'],
    roiImpact: 'low',
    durabilityYears: 10,
  },
};

/**
 * Savings areas configurations
 */
const SAVINGS_AREAS_CONFIGURATIONS = {
  'diy-some': {
    savingsPercent: { min: 0.05, max: 0.15 },
    description: {
      en: 'Do some work yourself (painting, hardware installation)',
      fr: 'Faire certains travaux vous-même (peinture, installation de quincaillerie)',
    },
    tags: ['diy-capable'],
    requirements: ['time-availability', 'basic-skills'],
    suitableTasks: ['painting', 'hardware-install', 'backsplash-simple', 'demo'],
  },
  'keep-layout': {
    savingsPercent: { min: 0.1, max: 0.25 },
    description: {
      en: 'Keep existing layout to avoid plumbing/electrical changes',
      fr: 'Garder la disposition existante pour éviter les changements de plomberie/électricité',
    },
    tags: ['layout-preserved'],
    requirements: ['acceptable-current-layout'],
    suitableTasks: [],
  },
  'refurbish-cabinets': {
    savingsPercent: { min: 0.15, max: 0.3 },
    description: {
      en: 'Refinish or reface existing cabinets instead of replacing',
      fr: 'Refinir ou refacer les armoires existantes au lieu de les remplacer',
    },
    tags: ['cabinet-refresh'],
    requirements: ['solid-cabinet-boxes', 'acceptable-layout'],
    suitableTasks: ['cabinet-painting', 'door-replacement', 'hardware-update'],
  },
  'mix-stock-custom': {
    savingsPercent: { min: 0.1, max: 0.2 },
    description: {
      en: 'Mix stock and semi-custom cabinets strategically',
      fr: 'Mélanger stratégiquement les armoires en stock et semi-personnalisées',
    },
    tags: ['smart-mixing'],
    requirements: ['flexibility-on-sizes'],
    suitableTasks: [],
  },
  'phase-project': {
    savingsPercent: { min: 0.05, max: 0.1 },
    description: {
      en: 'Complete project in phases over time',
      fr: 'Compléter le projet en phases au fil du temps',
    },
    tags: ['phased-approach'],
    requirements: ['time-flexibility', 'patience'],
    suitableTasks: [],
  },
  'shop-sales': {
    savingsPercent: { min: 0.05, max: 0.15 },
    description: {
      en: 'Wait for sales on appliances and materials',
      fr: 'Attendre les soldes sur les appareils et matériaux',
    },
    tags: ['deal-hunter'],
    requirements: ['time-flexibility', 'storage-space'],
    suitableTasks: ['appliance-purchase', 'material-purchase'],
  },
  'contractor-referral': {
    savingsPercent: { min: 0.03, max: 0.08 },
    description: {
      en: 'Get referrals and multiple quotes',
      fr: 'Obtenir des références et plusieurs devis',
    },
    tags: ['savvy-shopper'],
    requirements: ['time-for-research'],
    suitableTasks: [],
  },
};

/**
 * Appliance budget tier configurations
 */
const APPLIANCE_BUDGET_CONFIGURATIONS = {
  'under-5k': {
    score: 30,
    tier: 'basic',
    range: { min: 0, max: 5000, midpoint: 3500 },
    label: { en: 'Basic Package', fr: 'Forfait de base' },
    characteristics: {
      brands: ['entry-level', 'value-brands'],
      features: 'standard',
      warranty: 'basic',
      energy: 'standard',
    },
    recommendations: {
      refrigerator: { budget: 800, type: 'top-freezer' },
      range: { budget: 600, type: 'freestanding-basic' },
      dishwasher: { budget: 400, type: 'basic' },
      microwave: { budget: 200, type: 'countertop' },
    },
    tags: ['value-appliances', 'basic-features'],
  },
  '5k-10k': {
    score: 50,
    tier: 'mid-range',
    range: { min: 5000, max: 10000, midpoint: 7500 },
    label: { en: 'Mid-Range Package', fr: 'Forfait milieu de gamme' },
    characteristics: {
      brands: ['mid-range', 'quality-value'],
      features: 'enhanced',
      warranty: 'standard',
      energy: 'energy-star',
    },
    recommendations: {
      refrigerator: { budget: 1800, type: 'french-door-basic' },
      range: { budget: 1200, type: 'freestanding-stainless' },
      dishwasher: { budget: 700, type: 'stainless-quiet' },
      microwave: { budget: 350, type: 'over-range' },
      hood: { budget: 400, type: 'under-cabinet' },
    },
    tags: ['quality-appliances', 'energy-efficient'],
  },
  '10k-20k': {
    score: 70,
    tier: 'premium',
    range: { min: 10000, max: 20000, midpoint: 15000 },
    label: { en: 'Premium Package', fr: 'Forfait Premium' },
    characteristics: {
      brands: ['premium', 'well-known'],
      features: 'advanced',
      warranty: 'extended',
      energy: 'energy-star-certified',
    },
    recommendations: {
      refrigerator: { budget: 3500, type: 'french-door-premium' },
      range: { budget: 2500, type: 'slide-in-dual-fuel' },
      dishwasher: { budget: 1200, type: 'premium-quiet' },
      microwave: { budget: 500, type: 'built-in-drawer' },
      hood: { budget: 800, type: 'wall-mount' },
    },
    tags: ['premium-appliances', 'advanced-features'],
  },
  '20k-35k': {
    score: 85,
    tier: 'professional',
    range: { min: 20000, max: 35000, midpoint: 27500 },
    label: { en: 'Professional Grade', fr: 'Qualité professionnelle' },
    characteristics: {
      brands: ['professional-style', 'luxury'],
      features: 'professional',
      warranty: 'comprehensive',
      energy: 'top-rated',
    },
    recommendations: {
      refrigerator: { budget: 6000, type: 'built-in-panel-ready' },
      range: { budget: 5000, type: 'professional-style' },
      dishwasher: { budget: 1800, type: 'panel-ready' },
      microwave: { budget: 800, type: 'built-in-convection' },
      hood: { budget: 1500, type: 'professional-cfm' },
    },
    tags: ['professional-grade', 'serious-cooking'],
  },
  'over-35k': {
    score: 100,
    tier: 'commercial',
    range: { min: 35000, max: 100000, midpoint: 50000 },
    label: { en: 'Commercial Grade', fr: 'Qualité commerciale' },
    characteristics: {
      brands: ['commercial', 'ultra-luxury', 'specialty'],
      features: 'commercial-grade',
      warranty: 'premium-comprehensive',
      energy: 'top-rated',
    },
    recommendations: {
      refrigerator: { budget: 12000, type: 'integrated-column' },
      range: { budget: 10000, type: 'commercial-or-dual' },
      dishwasher: { budget: 2500, type: 'fully-integrated' },
      steamOven: { budget: 3500, type: 'built-in' },
      hood: { budget: 3000, type: 'commercial-grade' },
    },
    tags: ['commercial-grade', 'luxury-appliances', 'chef-kitchen'],
  },
};

/**
 * ROI consideration configurations
 */
const ROI_CONFIGURATIONS = {
  'very-important': {
    score: 80,
    focus: 'resale',
    description: {
      en: 'Maximizing resale value is a top priority',
      fr: 'Maximiser la valeur de revente est une priorité absolue',
    },
    recommendations: {
      colors: ['neutral', 'white', 'gray', 'greige'],
      cabinetStyle: ['shaker', 'flat-panel'],
      countertops: ['quartz', 'granite'],
      appliances: ['stainless-steel'],
      avoid: ['bold-colors', 'trendy-finishes', 'unusual-layouts'],
    },
    tags: ['resale-focused', 'neutral-choices', 'mass-appeal'],
    budgetAllocationAdjustment: {
      increaseROI: ['countertops', 'cabinets', 'appliances'],
      decreaseROI: ['specialty-features', 'technology'],
    },
  },
  'somewhat-important': {
    score: 60,
    focus: 'balanced',
    description: {
      en: 'Balance between personal taste and resale appeal',
      fr: 'Équilibre entre goût personnel et attrait pour la revente',
    },
    recommendations: {
      colors: ['neutral-base', 'accent-flexibility'],
      cabinetStyle: ['classic-with-personality'],
      countertops: ['quality-materials'],
      appliances: ['quality-brands'],
    },
    tags: ['balanced-approach'],
    budgetAllocationAdjustment: {},
  },
  'not-important': {
    score: 40,
    focus: 'personal',
    description: {
      en: 'Personal enjoyment matters more than resale value',
      fr: 'Le plaisir personnel compte plus que la valeur de revente',
    },
    recommendations: {
      colors: ['personal-preference'],
      cabinetStyle: ['personal-preference'],
      countertops: ['personal-preference'],
      appliances: ['personal-preference'],
    },
    tags: ['personal-taste', 'custom-ok', 'unique-features-ok'],
    budgetAllocationAdjustment: {
      increase: ['specialty-features', 'personal-touches'],
    },
  },
};

/**
 * Contingency comfort configurations
 */
const CONTINGENCY_CONFIGURATIONS = {
  'yes-20-plus': {
    score: 100,
    level: 'well-prepared',
    percentageRange: { min: 0.2, max: 0.3 },
    description: {
      en: 'Excellent financial preparation with 20%+ contingency',
      fr: 'Excellente préparation financière avec plus de 20% de contingence',
    },
    riskLevel: 'very-low',
    recommendations: {
      en: 'Your contingency buffer is excellent. Consider this a safety net for unexpected discoveries.',
      fr: 'Votre marge de contingence est excellente. Considérez cela comme un filet de sécurité pour les découvertes inattendues.',
    },
    tags: ['financially-prepared', 'low-risk', 'flexibility'],
  },
  'yes-10-20': {
    score: 80,
    level: 'prepared',
    percentageRange: { min: 0.1, max: 0.2 },
    description: {
      en: 'Good financial preparation with 10-20% contingency',
      fr: 'Bonne préparation financière avec 10-20% de contingence',
    },
    riskLevel: 'low',
    recommendations: {
      en: 'Your contingency is appropriate. Kitchen renovations typically encounter some surprises.',
      fr: 'Votre contingence est appropriée. Les rénovations de cuisine rencontrent généralement quelques surprises.',
    },
    tags: ['reasonably-prepared'],
  },
  'some-buffer': {
    score: 50,
    level: 'limited',
    percentageRange: { min: 0.05, max: 0.1 },
    description: {
      en: 'Limited financial buffer',
      fr: 'Marge financière limitée',
    },
    riskLevel: 'moderate',
    recommendations: {
      en: 'Consider building contingency by reducing scope slightly. Unexpected costs are common.',
      fr: 'Envisagez de constituer une contingence en réduisant légèrement la portée. Les coûts imprévus sont courants.',
    },
    tags: ['budget-conscious', 'moderate-risk'],
    warnings: [
      {
        en: 'Recommend building at least 10% contingency',
        fr: 'Recommandons de constituer au moins 10% de contingence',
      },
    ],
  },
  'no-buffer': {
    score: 20,
    level: 'none',
    percentageRange: { min: 0, max: 0.05 },
    description: {
      en: 'No contingency buffer available',
      fr: 'Aucune marge de contingence disponible',
    },
    riskLevel: 'high',
    recommendations: {
      en: 'Strongly recommend reducing project scope to build in 10-15% contingency. Kitchen renovations almost always encounter unexpected costs.',
      fr: 'Recommandons fortement de réduire la portée du projet pour inclure 10-15% de contingence. Les rénovations de cuisine rencontrent presque toujours des coûts imprévus.',
    },
    tags: ['tight-budget', 'high-risk'],
    warnings: [
      {
        en: 'Critical: Kitchen renovations commonly have unexpected costs. Consider reducing scope.',
        fr: 'Critique: Les rénovations de cuisine ont souvent des coûts imprévus. Envisagez de réduire la portée.',
      },
    ],
  },
};

/**
 * Budget allocation templates by tier
 */
const BUDGET_ALLOCATION_TEMPLATES = {
  budget: {
    cabinets: 0.35,
    countertops: 0.12,
    appliances: 0.25,
    flooring: 0.08,
    lighting: 0.05,
    plumbing: 0.05,
    electrical: 0.05,
    labor: 0.25,
    contingency: 0.1,
  },
  entry: {
    cabinets: 0.32,
    countertops: 0.15,
    appliances: 0.22,
    flooring: 0.08,
    lighting: 0.05,
    plumbing: 0.05,
    electrical: 0.05,
    labor: 0.3,
    contingency: 0.1,
  },
  mid: {
    cabinets: 0.3,
    countertops: 0.15,
    appliances: 0.2,
    flooring: 0.08,
    lighting: 0.06,
    plumbing: 0.05,
    electrical: 0.05,
    labor: 0.35,
    contingency: 0.1,
  },
  'upper-mid': {
    cabinets: 0.28,
    countertops: 0.15,
    appliances: 0.18,
    flooring: 0.08,
    lighting: 0.06,
    plumbing: 0.05,
    electrical: 0.06,
    labor: 0.38,
    contingency: 0.1,
  },
  premium: {
    cabinets: 0.28,
    countertops: 0.14,
    appliances: 0.18,
    flooring: 0.07,
    lighting: 0.06,
    plumbing: 0.05,
    electrical: 0.06,
    labor: 0.4,
    contingency: 0.1,
  },
  luxury: {
    cabinets: 0.25,
    countertops: 0.12,
    appliances: 0.15,
    flooring: 0.06,
    lighting: 0.06,
    plumbing: 0.05,
    electrical: 0.06,
    labor: 0.42,
    contingency: 0.1,
  },
};

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Calculate comprehensive budget section score
 * @param {Object} answers - User answers for budget questions
 * @returns {Object} Detailed budget scores and recommendations
 */
function calculateSectionScore(answers) {
  const scores = {
    overall: 0,
    budgetTier: 'mid',
    categories: {},
    allocations: null,
    recommendations: [],
    tags: new Set(),
    warnings: [],
    financialHealth: {},
    priorityAnalysis: {},
    savingsOpportunities: [],
  };

  // Calculate individual component scores
  const componentScores = {
    totalBudget: scoreTotalBudget(answers['total-budget']),
    budgetFlexibility: scoreBudgetFlexibility(answers['budget-flexibility']),
    financingMethod: scoreFinancingMethod(answers['financing-method']),
    prioritySpending: scorePrioritySpending(answers['priority-spending']),
    savingsAreas: scoreSavingsAreas(answers['savings-areas']),
    applianceBudget: scoreApplianceBudget(answers['appliance-budget']),
    roiConsideration: scoreROI(answers['roi-consideration']),
    contingencyComfort: scoreContingency(answers['contingency-comfort']),
  };

  // Calculate weighted overall score
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    if (componentScores[key] !== null) {
      scores.overall += (componentScores[key]?.score || 0) * weight;
      totalWeight += weight;

      if (componentScores[key]?.tags) {
        componentScores[key].tags.forEach((tag) => scores.tags.add(tag));
      }

      if (componentScores[key]?.warnings) {
        scores.warnings.push(...componentScores[key].warnings);
      }
    }
  }

  if (totalWeight > 0) {
    scores.overall = Math.round((scores.overall / totalWeight) * 100) / 100;
  }

  // Determine budget tier
  scores.budgetTier = determineBudgetTier(answers['total-budget']);

  // Calculate budget allocations using calculator
  scores.allocations = budgetCalculator.calculateBudgetAllocation({
    totalBudgetRange: answers['total-budget'],
    applianceBudgetRange: answers['appliance-budget'],
    priorities: answers['priority-spending'] || [],
    savingsAreas: answers['savings-areas'] || [],
    contingencyComfort: answers['contingency-comfort'],
    flexibility: answers['budget-flexibility'],
  });

  // Add calculator warnings
  if (scores.allocations.warnings) {
    scores.warnings.push(...scores.allocations.warnings);
  }

  // Calculate category scores
  scores.categories = {
    budgetLevel: {
      score: componentScores.totalBudget?.score || 50,
      tier: scores.budgetTier,
      configuration: BUDGET_TIER_CONFIGURATIONS[answers['total-budget']] || {},
    },
    flexibility: {
      score: componentScores.budgetFlexibility?.score || 50,
      level: componentScores.budgetFlexibility?.level || 'moderate',
    },
    preparedness: calculatePreparednessScore(answers),
    investmentMindset: calculateInvestmentMindset(answers),
    financing: {
      score: componentScores.financingMethod?.score || 50,
      method: answers['financing-method'],
      configuration: FINANCING_CONFIGURATIONS[answers['financing-method']] || {},
    },
  };

  // Calculate financial health assessment
  scores.financialHealth = calculateFinancialHealth(answers, componentScores);

  // Calculate priority analysis
  scores.priorityAnalysis = calculatePriorityAnalysis(answers, scores.budgetTier);

  // Calculate savings opportunities
  scores.savingsOpportunities = calculateSavingsOpportunities(answers, scores.budgetTier);

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
 * Score total budget selection
 */
function scoreTotalBudget(value) {
  if (!value) return null;

  const config = BUDGET_TIER_CONFIGURATIONS[value];
  if (!config) {
    return { score: 50, tier: 'mid', label: 'Standard', tags: [] };
  }

  const tags = [...config.tags];

  // Add budget calculator data
  const range = budgetCalculator.BUDGET_RANGES[value];

  return {
    score: config.score,
    tier: config.tier,
    label: config.label,
    range: config.range,
    characteristics: config.characteristics,
    productTiers: config.productTiers,
    tags,
  };
}

/**
 * Score budget flexibility on 1-5 scale
 */
function scoreBudgetFlexibility(value) {
  if (value === undefined || value === null) return null;

  const level = parseInt(value, 10);
  const levelNames = ['strict', 'slightly-flexible', 'moderate', 'quite-flexible', 'very-flexible'];
  const levelDescriptions = {
    en: [
      'Very strict, no room for changes',
      'Slight flexibility for essentials',
      'Moderate flexibility',
      'Quite flexible for upgrades',
      'Very flexible, quality is priority',
    ],
    fr: [
      'Très strict, pas de marge',
      "Légère flexibilité pour l'essentiel",
      'Flexibilité modérée',
      'Assez flexible pour les améliorations',
      'Très flexible, la qualité est prioritaire',
    ],
  };

  const tags = [];
  if (level >= 4) tags.push('upgrade-potential', 'quality-open');
  else if (level <= 2) tags.push('strict-budget', 'value-focused');

  return {
    score: level * 20,
    level: levelNames[level - 1] || 'moderate',
    numericLevel: level,
    description: {
      en: levelDescriptions.en[level - 1],
      fr: levelDescriptions.fr[level - 1],
    },
    tags,
    budgetAdjustmentPotential: (level - 3) * 0.05, // -10% to +10% adjustment potential
  };
}

/**
 * Score financing method
 */
function scoreFinancingMethod(value) {
  if (!value) return null;

  const config = FINANCING_CONFIGURATIONS[value];
  if (!config) {
    return { score: 50, tags: [] };
  }

  return {
    score: config.score,
    type: config.type,
    interestRate: config.interestRate,
    advantages: config.advantages,
    considerations: config.considerations,
    effectiveBudgetMultiplier: config.effectiveBudgetMultiplier,
    timelineImpact: config.timelineImpact,
    tags: config.tags,
    warnings: config.warnings || [],
  };
}

/**
 * Score priority spending selections
 */
function scorePrioritySpending(values) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return { score: 50, priorities: [], tags: [], analysis: null };
  }

  const tags = [];
  const priorityDetails = [];

  values.forEach((v) => {
    const config = PRIORITY_SPENDING_CONFIGURATIONS[v];
    if (config) {
      tags.push(...config.tags);
      priorityDetails.push({
        category: v,
        allocation: config.typicalAllocation,
        importance: config.importance,
        roiImpact: config.roiImpact,
      });
    }
  });

  // Calculate priority score based on count and importance
  const importanceScores = { high: 3, 'medium-high': 2.5, medium: 2, low: 1 };
  let totalImportance = 0;
  priorityDetails.forEach((p) => {
    totalImportance += importanceScores[p.importance] || 2;
  });

  return {
    score: Math.min(100, 50 + totalImportance * 5),
    priorities: values,
    priorityDetails,
    count: values.length,
    tags,
  };
}

/**
 * Score savings areas
 */
function scoreSavingsAreas(values) {
  if (!values || !Array.isArray(values)) {
    return { score: 50, areas: [], tags: [], potentialSavings: 0 };
  }

  const tags = [];
  const savingsDetails = [];
  let totalSavingsPercent = 0;

  values.forEach((v) => {
    const config = SAVINGS_AREAS_CONFIGURATIONS[v];
    if (config) {
      tags.push(...config.tags);
      const avgSavings = (config.savingsPercent.min + config.savingsPercent.max) / 2;
      totalSavingsPercent += avgSavings;
      savingsDetails.push({
        area: v,
        potentialSavings: config.savingsPercent,
        requirements: config.requirements,
      });
    }
  });

  // Cap total savings at realistic level (30%)
  totalSavingsPercent = Math.min(0.3, totalSavingsPercent);

  return {
    score: 50 + values.length * 8,
    areas: values,
    savingsDetails,
    savingsCount: values.length,
    potentialSavingsPercent: Math.round(totalSavingsPercent * 100),
    tags,
  };
}

/**
 * Score appliance budget
 */
function scoreApplianceBudget(value) {
  if (!value) return null;

  const config = APPLIANCE_BUDGET_CONFIGURATIONS[value];
  if (!config) {
    return { score: 50, tier: 'mid-range', tags: [] };
  }

  return {
    score: config.score,
    tier: config.tier,
    range: config.range,
    label: config.label,
    characteristics: config.characteristics,
    recommendations: config.recommendations,
    tags: config.tags,
  };
}

/**
 * Score ROI consideration
 */
function scoreROI(value) {
  if (!value) return null;

  const config = ROI_CONFIGURATIONS[value];
  if (!config) {
    return { score: 50, focus: 'balanced', tags: [] };
  }

  return {
    score: config.score,
    focus: config.focus,
    description: config.description,
    recommendations: config.recommendations,
    budgetAllocationAdjustment: config.budgetAllocationAdjustment,
    tags: config.tags,
  };
}

/**
 * Score contingency comfort
 */
function scoreContingency(value) {
  if (!value) return null;

  const config = CONTINGENCY_CONFIGURATIONS[value];
  if (!config) {
    return { score: 50, level: 'limited', tags: [] };
  }

  return {
    score: config.score,
    level: config.level,
    percentageRange: config.percentageRange,
    description: config.description,
    riskLevel: config.riskLevel,
    recommendations: config.recommendations,
    tags: config.tags,
    warnings: config.warnings || [],
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine budget tier from total budget
 */
function determineBudgetTier(totalBudget) {
  const config = BUDGET_TIER_CONFIGURATIONS[totalBudget];
  return config?.tier || 'mid';
}

/**
 * Get flexibility level label
 */
function getFlexibilityLevel(value) {
  const level = parseInt(value, 10) || 3;
  return (
    ['strict', 'slightly-flexible', 'moderate', 'quite-flexible', 'very-flexible'][level - 1] ||
    'moderate'
  );
}

/**
 * Calculate preparedness score
 */
function calculatePreparednessScore(answers) {
  let score = 50;
  const factors = [];

  // Contingency assessment
  if (answers['contingency-comfort'] === 'yes-20-plus') {
    score += 25;
    factors.push({ factor: 'contingency', impact: 25, level: 'excellent' });
  } else if (answers['contingency-comfort'] === 'yes-10-20') {
    score += 15;
    factors.push({ factor: 'contingency', impact: 15, level: 'good' });
  } else if (answers['contingency-comfort'] === 'no-buffer') {
    score -= 20;
    factors.push({ factor: 'contingency', impact: -20, level: 'critical' });
  }

  // Financing assessment
  if (answers['financing-method'] === 'cash-savings') {
    score += 15;
    factors.push({ factor: 'financing', impact: 15, level: 'optimal' });
  } else if (answers['financing-method'] === 'home-equity') {
    score += 10;
    factors.push({ factor: 'financing', impact: 10, level: 'good' });
  } else if (answers['financing-method'] === 'credit-card') {
    score -= 10;
    factors.push({ factor: 'financing', impact: -10, level: 'risky' });
  }

  // Flexibility assessment
  const flex = parseInt(answers['budget-flexibility'], 10) || 3;
  const flexImpact = (flex - 3) * 5;
  score += flexImpact;
  factors.push({
    factor: 'flexibility',
    impact: flexImpact,
    level: flex >= 4 ? 'good' : flex <= 2 ? 'limited' : 'moderate',
  });

  // Determine label
  let label;
  if (score >= 70) label = { en: 'Well Prepared', fr: 'Bien préparé' };
  else if (score >= 50) label = { en: 'Moderately Prepared', fr: 'Modérément préparé' };
  else if (score >= 30) label = { en: 'Limited Preparation', fr: 'Préparation limitée' };
  else label = { en: 'Needs Attention', fr: 'Nécessite attention' };

  return {
    score: Math.max(0, Math.min(100, score)),
    label,
    factors,
    riskLevel: score >= 70 ? 'low' : score >= 50 ? 'moderate' : 'high',
  };
}

/**
 * Calculate investment mindset
 */
function calculateInvestmentMindset(answers) {
  let score = 50;
  const considerations = [];

  // ROI focus
  if (answers['roi-consideration'] === 'very-important') {
    score = 80;
    considerations.push({ aspect: 'roi', priority: 'high' });
  } else if (answers['roi-consideration'] === 'not-important') {
    score = 30;
    considerations.push({ aspect: 'personal-enjoyment', priority: 'high' });
  } else {
    considerations.push({ aspect: 'balanced', priority: 'moderate' });
  }

  // Priority spending analysis
  const priorities = answers['priority-spending'] || [];
  const highROIPriorities = priorities.filter((p) =>
    ['cabinets', 'countertops', 'layout'].includes(p)
  );

  if (highROIPriorities.length >= 2) {
    score += 10;
    considerations.push({ aspect: 'high-roi-categories', count: highROIPriorities.length });
  }

  return {
    score,
    focus:
      answers['roi-consideration'] === 'very-important'
        ? 'resale'
        : answers['roi-consideration'] === 'not-important'
          ? 'personal'
          : 'balanced',
    considerations,
    description: ROI_CONFIGURATIONS[answers['roi-consideration']]?.description || {},
  };
}

/**
 * Calculate financial health assessment
 */
function calculateFinancialHealth(answers, componentScores) {
  const financingConfig = FINANCING_CONFIGURATIONS[answers['financing-method']] || {};
  const contingencyConfig = CONTINGENCY_CONFIGURATIONS[answers['contingency-comfort']] || {};

  let healthScore = 0;
  const factors = [];

  // Financing factor (30%)
  const financingScore = componentScores.financingMethod?.score || 50;
  healthScore += financingScore * 0.3;
  factors.push({
    name: { en: 'Financing Method', fr: 'Méthode de financement' },
    score: financingScore,
    weight: 0.3,
  });

  // Contingency factor (35%)
  const contingencyScore = componentScores.contingencyComfort?.score || 50;
  healthScore += contingencyScore * 0.35;
  factors.push({
    name: { en: 'Contingency Buffer', fr: 'Marge de contingence' },
    score: contingencyScore,
    weight: 0.35,
  });

  // Flexibility factor (20%)
  const flexibilityScore = componentScores.budgetFlexibility?.score || 50;
  healthScore += flexibilityScore * 0.2;
  factors.push({
    name: { en: 'Budget Flexibility', fr: 'Flexibilité budgétaire' },
    score: flexibilityScore,
    weight: 0.2,
  });

  // Budget tier factor (15%)
  const budgetScore = componentScores.totalBudget?.score || 50;
  healthScore += budgetScore * 0.15;
  factors.push({
    name: { en: 'Budget Level', fr: 'Niveau de budget' },
    score: budgetScore,
    weight: 0.15,
  });

  // Determine overall health level
  let healthLevel;
  if (healthScore >= 80) healthLevel = { en: 'Excellent', fr: 'Excellent' };
  else if (healthScore >= 65) healthLevel = { en: 'Good', fr: 'Bon' };
  else if (healthScore >= 50) healthLevel = { en: 'Moderate', fr: 'Modéré' };
  else if (healthScore >= 35) healthLevel = { en: 'Concerning', fr: 'Préoccupant' };
  else healthLevel = { en: 'At Risk', fr: 'À risque' };

  return {
    score: Math.round(healthScore),
    level: healthLevel,
    factors,
    interestCost: financingConfig.interestRate?.typical || 0,
    effectiveBudgetMultiplier: financingConfig.effectiveBudgetMultiplier || 1.0,
    riskLevel: contingencyConfig.riskLevel || 'moderate',
  };
}

/**
 * Calculate priority analysis
 */
function calculatePriorityAnalysis(answers, budgetTier) {
  const priorities = answers['priority-spending'] || [];
  const tierConfig = BUDGET_TIER_CONFIGURATIONS[answers['total-budget']] || {};
  const allocationTemplate =
    BUDGET_ALLOCATION_TEMPLATES[budgetTier] || BUDGET_ALLOCATION_TEMPLATES.mid;

  const analysis = {
    selectedPriorities: [],
    allocationRecommendations: {},
    conflicts: [],
    synergies: [],
  };

  // Analyze each priority
  priorities.forEach((priority) => {
    const config = PRIORITY_SPENDING_CONFIGURATIONS[priority];
    if (config) {
      analysis.selectedPriorities.push({
        category: priority,
        baseAllocation: allocationTemplate[priority] || config.typicalAllocation.min,
        recommendedAllocation: {
          min: config.typicalAllocation.min,
          max: config.typicalAllocation.max,
        },
        roiImpact: config.roiImpact,
        isPrioritized: true,
      });
    }
  });

  // Check for potential conflicts
  if (
    priorities.includes('appliances') &&
    priorities.includes('cabinets') &&
    priorities.includes('countertops')
  ) {
    if (budgetTier === 'budget' || budgetTier === 'entry') {
      analysis.conflicts.push({
        type: 'budget-spread',
        message: {
          en: 'Prioritizing all three major categories may spread budget too thin at this tier',
          fr: 'Prioriser les trois catégories principales peut trop étirer le budget à ce niveau',
        },
        severity: 'warning',
      });
    }
  }

  // Check for synergies
  if (priorities.includes('layout') && priorities.includes('lighting')) {
    analysis.synergies.push({
      categories: ['layout', 'lighting'],
      message: {
        en: 'Layout changes offer opportunity to optimize lighting placement',
        fr: "Les changements de disposition offrent l'opportunité d'optimiser le placement de l'éclairage",
      },
      benefit: 'efficiency',
    });
  }

  return analysis;
}

/**
 * Calculate savings opportunities
 */
function calculateSavingsOpportunities(answers, budgetTier) {
  const selectedSavings = answers['savings-areas'] || [];
  const opportunities = [];

  // Analyze each potential savings area
  Object.entries(SAVINGS_AREAS_CONFIGURATIONS).forEach(([key, config]) => {
    const isSelected = selectedSavings.includes(key);
    const avgSavings = (config.savingsPercent.min + config.savingsPercent.max) / 2;

    opportunities.push({
      area: key,
      description: config.description,
      potentialSavings: {
        min: Math.round(config.savingsPercent.min * 100),
        max: Math.round(config.savingsPercent.max * 100),
        average: Math.round(avgSavings * 100),
      },
      requirements: config.requirements,
      isSelected,
      applicable: checkSavingsApplicability(key, budgetTier, answers),
    });
  });

  return opportunities.filter((o) => o.applicable);
}

/**
 * Check if a savings area is applicable
 */
function checkSavingsApplicability(savingsArea, budgetTier, answers) {
  // Some savings areas are more relevant at certain budget tiers
  const applicabilityRules = {
    'diy-some': true, // Always applicable
    'keep-layout': budgetTier !== 'luxury', // Less relevant for luxury where layout changes expected
    'refurbish-cabinets': ['budget', 'entry'].includes(budgetTier),
    'mix-stock-custom': ['entry', 'mid', 'upper-mid'].includes(budgetTier),
    'phase-project': true, // Always applicable
    'shop-sales': true, // Always applicable
    'contractor-referral': true, // Always applicable
  };

  return applicabilityRules[savingsArea] !== false;
}

/**
 * Generate comprehensive recommendations
 */
function generateRecommendations(answers, componentScores, scores) {
  const recommendations = [];
  const budgetTier = scores.budgetTier;
  const tierConfig = BUDGET_TIER_CONFIGURATIONS[answers['total-budget']] || {};

  // Product tier recommendations
  const productTiers = budgetCalculator.getProductTierRecommendations(budgetTier);

  recommendations.push({
    id: 'product-tier',
    type: 'budget',
    priority: 'essential',
    title: {
      en: 'Recommended Product Tiers',
      fr: 'Niveaux de produits recommandés',
    },
    description: {
      en: `Based on your ${tierConfig.label?.en || 'budget'}, we recommend: ${productTiers.cabinets?.join(', ') || 'quality'} cabinets and ${productTiers.countertops?.join(', ') || 'durable'} countertops.`,
      fr: `Selon votre budget ${tierConfig.label?.fr || 'budget'}, nous recommandons: armoires ${productTiers.cabinets?.join(', ') || 'qualité'} et comptoirs ${productTiers.countertops?.join(', ') || 'durables'}.`,
    },
    productTiers,
    tierCharacteristics: tierConfig.characteristics,
  });

  // Financial health recommendations
  if (scores.financialHealth.score < 50) {
    recommendations.push({
      id: 'financial-health',
      type: 'budget',
      priority: 'essential',
      title: {
        en: 'Financial Preparation',
        fr: 'Préparation financière',
      },
      description: {
        en: 'Consider improving your financial preparation before starting. Build contingency and explore better financing options.',
        fr: "Envisagez d'améliorer votre préparation financière avant de commencer. Constituez une marge de contingence et explorez de meilleures options de financement.",
      },
    });
  }

  // Contingency recommendations
  if (answers['contingency-comfort'] === 'no-buffer') {
    recommendations.push({
      id: 'add-contingency',
      type: 'budget',
      priority: 'essential',
      title: {
        en: 'Add Contingency Fund',
        fr: 'Ajouter un fonds de prévoyance',
      },
      description: {
        en: 'We strongly recommend reducing your project scope slightly to build in a 10-15% contingency for unexpected costs. Kitchen renovations almost always encounter surprises.',
        fr: 'Nous recommandons fortement de réduire légèrement la portée de votre projet pour inclure une marge de 10-15% pour les coûts imprévus. Les rénovations de cuisine rencontrent presque toujours des surprises.',
      },
    });
  } else if (answers['contingency-comfort'] === 'some-buffer') {
    recommendations.push({
      id: 'increase-contingency',
      type: 'budget',
      priority: 'recommended',
      title: {
        en: 'Consider Larger Contingency',
        fr: 'Envisagez une contingence plus importante',
      },
      description: {
        en: 'Your current buffer is limited. If possible, aim for 10-15% contingency for peace of mind.',
        fr: "Votre marge actuelle est limitée. Si possible, visez 10-15% de contingence pour la tranquillité d'esprit.",
      },
    });
  }

  // Phased approach recommendation
  if (
    (budgetTier === 'budget' || budgetTier === 'entry') &&
    answers['financing-method'] !== 'phased'
  ) {
    const tierWarnings = tierConfig.warnings || [];
    if (tierWarnings.length > 0) {
      recommendations.push({
        id: 'consider-phased',
        type: 'budget',
        priority: 'recommended',
        title: {
          en: 'Consider Phased Approach',
          fr: 'Envisagez une approche par phases',
        },
        description: {
          en: 'With your budget, a phased approach could help you get higher-quality items over time rather than compromising on everything at once. Start with essentials and add upgrades later.',
          fr: "Avec votre budget, une approche par phases pourrait vous aider à obtenir des articles de meilleure qualité au fil du temps plutôt que de faire des compromis sur tout à la fois. Commencez par l'essentiel et ajoutez des améliorations plus tard.",
        },
      });
    }
  }

  // ROI-focused recommendations
  if (answers['roi-consideration'] === 'very-important') {
    recommendations.push({
      id: 'roi-choices',
      type: 'style',
      priority: 'recommended',
      title: {
        en: 'Resale-Friendly Choices',
        fr: 'Choix favorables à la revente',
      },
      description: {
        en: 'For best ROI, stick to neutral colors (white, gray, greige), shaker-style cabinets, quartz countertops, and stainless steel appliances. Avoid bold or trendy choices.',
        fr: 'Pour le meilleur ROI, optez pour des couleurs neutres (blanc, gris, greige), des armoires style shaker, des comptoirs en quartz et des appareils en acier inoxydable. Évitez les choix audacieux ou tendance.',
      },
      recommendations: ROI_CONFIGURATIONS['very-important'].recommendations,
    });
  }

  // Priority spending recommendations
  const priorities = answers['priority-spending'] || [];
  if (priorities.length > 3 && (budgetTier === 'budget' || budgetTier === 'entry')) {
    recommendations.push({
      id: 'focus-priorities',
      type: 'budget',
      priority: 'recommended',
      title: {
        en: 'Focus Your Priorities',
        fr: 'Concentrez vos priorités',
      },
      description: {
        en: 'With your budget level, consider focusing on 2-3 key priorities rather than spreading funds across many categories.',
        fr: 'Avec votre niveau de budget, envisagez de vous concentrer sur 2-3 priorités clés plutôt que de répartir les fonds sur plusieurs catégories.',
      },
    });
  }

  // Savings area recommendations
  const savingsAreas = answers['savings-areas'] || [];
  if (savingsAreas.includes('diy-some')) {
    recommendations.push({
      id: 'diy-tasks',
      type: 'approach',
      priority: 'noted',
      title: {
        en: 'DIY Opportunities',
        fr: 'Opportunités de bricolage',
      },
      description: {
        en: 'Good DIY tasks include: painting, hardware installation, simple backsplash, demolition prep, and final cleaning. Leave electrical, plumbing, and cabinet installation to professionals.',
        fr: "Les bonnes tâches de bricolage incluent: peinture, installation de quincaillerie, dosseret simple, préparation de démolition et nettoyage final. Laissez l'électricité, la plomberie et l'installation des armoires aux professionnels.",
      },
    });
  }

  // Financing-specific recommendations
  if (answers['financing-method'] === 'credit-card') {
    recommendations.push({
      id: 'financing-caution',
      type: 'budget',
      priority: 'essential',
      title: {
        en: 'Financing Caution',
        fr: 'Mise en garde sur le financement',
      },
      description: {
        en: 'Credit cards should only be used for small purchases you can pay off immediately. High interest rates can significantly increase project costs. Consider alternative financing for larger expenses.',
        fr: "Les cartes de crédit ne devraient être utilisées que pour de petits achats que vous pouvez rembourser immédiatement. Les taux d'intérêt élevés peuvent augmenter considérablement les coûts du projet. Envisagez un financement alternatif pour les dépenses plus importantes.",
      },
    });
  }

  // Appliance budget recommendations
  const applianceConfig = APPLIANCE_BUDGET_CONFIGURATIONS[answers['appliance-budget']];
  if (applianceConfig && priorities.includes('appliances')) {
    recommendations.push({
      id: 'appliance-strategy',
      type: 'appliance',
      priority: 'recommended',
      title: {
        en: 'Appliance Selection Strategy',
        fr: 'Stratégie de sélection des appareils',
      },
      description: {
        en: `At the ${applianceConfig.label.en} level, focus on ${applianceConfig.characteristics.brands.join(' or ')} brands with ${applianceConfig.characteristics.energy} efficiency ratings.`,
        fr: `Au niveau ${applianceConfig.label.fr}, concentrez-vous sur les marques ${applianceConfig.characteristics.brands.join(' ou ')} avec des cotes d\'efficacité ${applianceConfig.characteristics.energy}.`,
      },
      applianceRecommendations: applianceConfig.recommendations,
    });
  }

  return recommendations;
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
  calculateSectionScore,
  scoreTotalBudget,
  scoreBudgetFlexibility,
  scoreFinancingMethod,
  scorePrioritySpending,
  scoreSavingsAreas,
  scoreApplianceBudget,
  scoreROI,
  scoreContingency,
  determineBudgetTier,
  calculatePreparednessScore,
  calculateInvestmentMindset,
  calculateFinancialHealth,
  calculatePriorityAnalysis,
  calculateSavingsOpportunities,
  generateRecommendations,

  // Export configurations for external use
  SCORE_WEIGHTS,
  BUDGET_TIER_CONFIGURATIONS,
  FINANCING_CONFIGURATIONS,
  PRIORITY_SPENDING_CONFIGURATIONS,
  SAVINGS_AREAS_CONFIGURATIONS,
  APPLIANCE_BUDGET_CONFIGURATIONS,
  ROI_CONFIGURATIONS,
  CONTINGENCY_CONFIGURATIONS,
  BUDGET_ALLOCATION_TEMPLATES,
};
