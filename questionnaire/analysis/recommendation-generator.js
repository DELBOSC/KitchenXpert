/**
 * Recommendation Generator Module
 *
 * Advanced recommendation engine that synthesizes all analysis results
 * to generate comprehensive, prioritized, and personalized kitchen design
 * recommendations with confidence scoring and actionable guidance.
 */

const budgetAnalyzer = require('./budget-analyzer');
const spatialAnalyzer = require('./spatial-analyzer');
const styleMatcher = require('./style-matcher');
const constraintAnalyzer = require('./constraint-analyzer');
const preferenceAnalyzer = require('./preference-analyzer');

/**
 * Recommendation categories with priority weights and dependencies
 */
const RECOMMENDATION_CATEGORIES = {
  layout: {
    weight: 0.22,
    priority: 1,
    icon: 'layout',
    dependencies: [],
    description: {
      en: 'Kitchen layout and spatial organization',
      fr: 'Disposition et organisation spatiale de la cuisine'
    }
  },
  cabinets: {
    weight: 0.20,
    priority: 2,
    icon: 'cabinet',
    dependencies: ['layout'],
    description: {
      en: 'Cabinet style, quality, and configuration',
      fr: 'Style, qualité et configuration des armoires'
    }
  },
  appliances: {
    weight: 0.18,
    priority: 3,
    icon: 'appliance',
    dependencies: ['layout'],
    description: {
      en: 'Appliance selection and placement',
      fr: 'Sélection et placement des appareils'
    }
  },
  countertops: {
    weight: 0.12,
    priority: 4,
    icon: 'counter',
    dependencies: ['cabinets'],
    description: {
      en: 'Countertop material and edge profiles',
      fr: 'Matériau de comptoir et profils de bord'
    }
  },
  storage: {
    weight: 0.10,
    priority: 5,
    icon: 'storage',
    dependencies: ['layout', 'cabinets'],
    description: {
      en: 'Storage solutions and organization',
      fr: 'Solutions de rangement et organisation'
    }
  },
  lighting: {
    weight: 0.08,
    priority: 6,
    icon: 'light',
    dependencies: ['layout'],
    description: {
      en: 'Lighting design and fixtures',
      fr: 'Design d\'éclairage et luminaires'
    }
  },
  flooring: {
    weight: 0.05,
    priority: 7,
    icon: 'floor',
    dependencies: [],
    description: {
      en: 'Flooring material and patterns',
      fr: 'Matériau et motifs de sol'
    }
  },
  features: {
    weight: 0.05,
    priority: 8,
    icon: 'feature',
    dependencies: ['layout', 'appliances'],
    description: {
      en: 'Special features and upgrades',
      fr: 'Caractéristiques spéciales et améliorations'
    }
  }
};

/**
 * Priority levels with display properties
 */
const PRIORITY_LEVELS = {
  critical: { value: 1, color: 'red', label: { en: 'Critical', fr: 'Critique' } },
  high: { value: 2, color: 'orange', label: { en: 'High Priority', fr: 'Haute priorité' } },
  medium: { value: 3, color: 'yellow', label: { en: 'Recommended', fr: 'Recommandé' } },
  low: { value: 4, color: 'green', label: { en: 'Optional', fr: 'Optionnel' } },
  informational: { value: 5, color: 'blue', label: { en: 'For Your Information', fr: 'Pour information' } }
};

/**
 * Style-specific design guides
 */
const STYLE_DESIGN_GUIDES = {
  modern: {
    cabinets: {
      doorStyle: 'flat-panel',
      alternatives: ['slab', 'handleless', 'glass-front'],
      finish: ['high-gloss', 'matte-lacquer', 'thermofoil'],
      hardware: ['integrated-pull', 'push-to-open', 'bar-pull'],
      colors: ['white', 'gray', 'charcoal', 'two-tone']
    },
    countertops: {
      materials: ['quartz', 'solid-surface', 'stainless-steel', 'concrete'],
      edges: ['waterfall', 'square', 'eased'],
      colors: ['white', 'gray', 'black', 'neutral']
    },
    lighting: {
      fixtures: ['geometric-pendant', 'linear-led', 'recessed', 'track'],
      finishes: ['chrome', 'brushed-nickel', 'matte-black'],
      features: ['dimmer', 'color-temperature']
    },
    flooring: {
      materials: ['large-format-tile', 'polished-concrete', 'wide-plank-engineered'],
      patterns: ['minimal-grout', 'seamless', 'uniform'],
      colors: ['gray', 'white', 'charcoal']
    },
    features: {
      backsplash: ['full-height', 'glass', 'large-format-tile'],
      accents: ['minimal', 'geometric', 'metallic'],
      hardware: ['integrated', 'minimal', 'concealed']
    }
  },
  traditional: {
    cabinets: {
      doorStyle: 'raised-panel',
      alternatives: ['inset', 'beaded', 'applied-molding'],
      finish: ['stained-wood', 'painted', 'glazed'],
      hardware: ['cup-pull', 'knob', 'bail-pull'],
      colors: ['cream', 'white', 'cherry', 'mahogany']
    },
    countertops: {
      materials: ['granite', 'marble', 'quartz', 'butcher-block'],
      edges: ['ogee', 'bullnose', 'beveled'],
      colors: ['earth-tones', 'cream', 'warm-gray']
    },
    lighting: {
      fixtures: ['chandelier', 'lantern', 'sconce', 'semi-flush'],
      finishes: ['brass', 'bronze', 'antique-gold'],
      features: ['crystal', 'glass-shades', 'candle-style']
    },
    flooring: {
      materials: ['hardwood', 'natural-stone', 'ceramic-tile'],
      patterns: ['herringbone', 'parquet', 'border'],
      colors: ['warm-wood', 'terra-cotta', 'cream']
    },
    features: {
      backsplash: ['subway-tile', 'natural-stone', 'decorative-tile'],
      accents: ['crown-molding', 'corbels', 'decorative-legs'],
      hardware: ['ornate', 'traditional', 'antique']
    }
  },
  transitional: {
    cabinets: {
      doorStyle: 'shaker',
      alternatives: ['recessed-panel', 'flat-panel', 'beaded'],
      finish: ['painted', 'stained', 'mixed'],
      hardware: ['bar-pull', 'knob', 'bin-pull'],
      colors: ['white', 'gray', 'navy', 'greige']
    },
    countertops: {
      materials: ['quartz', 'granite', 'marble-look', 'quartzite'],
      edges: ['eased', 'beveled', 'ogee'],
      colors: ['white', 'gray', 'warm-neutral']
    },
    lighting: {
      fixtures: ['drum-pendant', 'semi-flush', 'recessed', 'linear'],
      finishes: ['brushed-nickel', 'oil-rubbed-bronze', 'mixed-metals'],
      features: ['fabric-shades', 'clear-glass', 'layered']
    },
    flooring: {
      materials: ['engineered-hardwood', 'porcelain-tile', 'lvp'],
      patterns: ['plank', 'diagonal', 'classic'],
      colors: ['medium-wood', 'gray-wash', 'warm-neutral']
    },
    features: {
      backsplash: ['subway-tile', 'marble-mosaic', 'ceramic'],
      accents: ['simple-molding', 'mixed-materials', 'open-shelving'],
      hardware: ['simple', 'clean-lined', 'updated-classic']
    }
  },
  farmhouse: {
    cabinets: {
      doorStyle: 'shaker',
      alternatives: ['beadboard', 'open-shelving', 'glass-front'],
      finish: ['painted', 'distressed', 'natural-wood'],
      hardware: ['cup-pull', 'bin-pull', 'latch'],
      colors: ['white', 'sage', 'cream', 'navy']
    },
    countertops: {
      materials: ['butcher-block', 'soapstone', 'honed-marble', 'quartz'],
      edges: ['eased', 'square', 'bullnose'],
      colors: ['warm-wood', 'white', 'gray', 'cream']
    },
    lighting: {
      fixtures: ['lantern', 'mason-jar', 'industrial-pendant', 'barn-light'],
      finishes: ['matte-black', 'galvanized', 'aged-brass'],
      features: ['edison-bulb', 'vintage-style', 'natural-materials']
    },
    flooring: {
      materials: ['wide-plank-wood', 'reclaimed-wood', 'terracotta', 'patterned-tile'],
      patterns: ['plank', 'herringbone', 'encaustic'],
      colors: ['warm-wood', 'whitewash', 'terra-cotta']
    },
    features: {
      backsplash: ['subway-tile', 'beadboard', 'brick', 'shiplap'],
      accents: ['apron-sink', 'open-shelving', 'pot-rack', 'exposed-beams'],
      hardware: ['rustic', 'vintage', 'handcrafted']
    }
  },
  contemporary: {
    cabinets: {
      doorStyle: 'flat-panel',
      alternatives: ['glass-front', 'mixed-materials', 'open'],
      finish: ['matte', 'wood-veneer', 'lacquer'],
      hardware: ['integrated', 'minimal', 'sculptural'],
      colors: ['white', 'wood-tone', 'bold-accent', 'two-tone']
    },
    countertops: {
      materials: ['quartz', 'porcelain-slab', 'ultra-compact', 'terrazzo'],
      edges: ['waterfall', 'mitered', 'square'],
      colors: ['white', 'gray', 'veined', 'bold']
    },
    lighting: {
      fixtures: ['sculptural-pendant', 'linear-suspension', 'globe', 'asymmetric'],
      finishes: ['brass', 'matte-black', 'white', 'mixed'],
      features: ['statement-piece', 'artistic', 'smart-control']
    },
    flooring: {
      materials: ['large-format-tile', 'polished-concrete', 'luxury-vinyl', 'terrazzo'],
      patterns: ['minimal', 'geometric', 'seamless'],
      colors: ['neutral', 'bold-accent', 'monochromatic']
    },
    features: {
      backsplash: ['full-height', 'bold-pattern', 'textured', 'artistic'],
      accents: ['statement-hood', 'waterfall-island', 'sculptural-elements'],
      hardware: ['artistic', 'unique', 'statement']
    }
  },
  industrial: {
    cabinets: {
      doorStyle: 'flat-panel',
      alternatives: ['metal', 'open-shelving', 'glass-and-metal'],
      finish: ['raw-wood', 'metal', 'distressed'],
      hardware: ['bar-pull', 'pipe', 'industrial'],
      colors: ['dark-wood', 'metal', 'black', 'gray']
    },
    countertops: {
      materials: ['concrete', 'stainless-steel', 'butcher-block', 'reclaimed-wood'],
      edges: ['square', 'raw', 'metal-wrapped'],
      colors: ['gray', 'natural', 'dark']
    },
    lighting: {
      fixtures: ['metal-cage', 'exposed-bulb', 'pipe-fixture', 'vintage-factory'],
      finishes: ['raw-metal', 'aged-iron', 'galvanized', 'copper'],
      features: ['edison-bulb', 'pulley-system', 'exposed-wiring']
    },
    flooring: {
      materials: ['concrete', 'reclaimed-wood', 'brick', 'metal-tile'],
      patterns: ['raw', 'distressed', 'mixed-material'],
      colors: ['gray', 'brown', 'charcoal', 'natural']
    },
    features: {
      backsplash: ['exposed-brick', 'metal', 'concrete', 'subway-tile'],
      accents: ['exposed-ductwork', 'metal-shelving', 'rolling-ladder'],
      hardware: ['industrial', 'utilitarian', 'raw-metal']
    }
  },
  coastal: {
    cabinets: {
      doorStyle: 'shaker',
      alternatives: ['louvered', 'beadboard', 'glass-front'],
      finish: ['painted', 'whitewash', 'driftwood'],
      hardware: ['rope', 'shell', 'brushed-nickel'],
      colors: ['white', 'blue', 'seafoam', 'sandy']
    },
    countertops: {
      materials: ['quartz', 'marble', 'butcher-block', 'concrete'],
      edges: ['eased', 'bullnose', 'natural'],
      colors: ['white', 'sand', 'blue-gray', 'sea-glass']
    },
    lighting: {
      fixtures: ['rope-pendant', 'lantern', 'woven', 'glass'],
      finishes: ['white', 'natural', 'weathered', 'chrome'],
      features: ['nautical', 'natural-materials', 'airy']
    },
    flooring: {
      materials: ['whitewash-wood', 'tile', 'painted-wood', 'stone'],
      patterns: ['wide-plank', 'coastal-tile', 'natural'],
      colors: ['white', 'sand', 'blue', 'gray']
    },
    features: {
      backsplash: ['glass-tile', 'subway-tile', 'shell-mosaic', 'blue-ceramic'],
      accents: ['open-shelving', 'natural-textures', 'blue-accents'],
      hardware: ['nautical', 'natural', 'weathered']
    }
  },
  scandinavian: {
    cabinets: {
      doorStyle: 'flat-panel',
      alternatives: ['shaker', 'handleless', 'open-shelving'],
      finish: ['matte', 'natural-wood', 'painted'],
      hardware: ['leather-pull', 'minimal', 'wooden'],
      colors: ['white', 'light-wood', 'soft-gray', 'muted-color']
    },
    countertops: {
      materials: ['white-quartz', 'light-wood', 'concrete', 'marble'],
      edges: ['square', 'eased', 'waterfall'],
      colors: ['white', 'light-gray', 'blonde-wood']
    },
    lighting: {
      fixtures: ['pendant', 'globe', 'sculptural', 'natural'],
      finishes: ['white', 'wood', 'brass', 'black'],
      features: ['simple', 'organic-shapes', 'natural-light']
    },
    flooring: {
      materials: ['light-wood', 'whitewash-wood', 'light-tile', 'vinyl'],
      patterns: ['wide-plank', 'herringbone', 'simple'],
      colors: ['blonde', 'whitewash', 'light-gray']
    },
    features: {
      backsplash: ['white-tile', 'light-wood', 'simple-pattern'],
      accents: ['plants', 'natural-materials', 'minimal-decor'],
      hardware: ['minimal', 'organic', 'natural-materials']
    }
  }
};

/**
 * Appliance tier recommendations by cooking profile
 */
const COOKING_APPLIANCE_GUIDES = {
  'serious-chef': {
    range: { type: 'pro-range', features: ['high-btu', 'dual-fuel', 'multiple-ovens'], priority: 'high' },
    hood: { type: 'commercial-grade', features: ['high-cfm', 'auto-sensing', 'quiet-operation'], priority: 'high' },
    refrigerator: { type: 'professional', features: ['column', 'large-capacity', 'precise-temp'], priority: 'medium' },
    dishwasher: { type: 'premium', features: ['third-rack', 'quiet', 'quick-wash'], priority: 'medium' },
    extras: ['pot-filler', 'prep-sink', 'warming-drawer', 'built-in-coffee']
  },
  'busy-professional': {
    range: { type: 'mid-high', features: ['induction', 'convection', 'smart-features'], priority: 'high' },
    hood: { type: 'standard', features: ['adequate-cfm', 'quiet'], priority: 'medium' },
    refrigerator: { type: 'french-door', features: ['flexible-storage', 'smart', 'counter-depth'], priority: 'high' },
    dishwasher: { type: 'premium', features: ['quick-wash', 'smart', 'third-rack'], priority: 'high' },
    extras: ['speed-oven', 'built-in-coffee', 'smart-faucet']
  },
  'family-focused': {
    range: { type: 'mid-range', features: ['double-oven', 'easy-clean', 'safe'], priority: 'high' },
    hood: { type: 'standard', features: ['quiet', 'easy-clean'], priority: 'medium' },
    refrigerator: { type: 'side-by-side', features: ['large-capacity', 'water-ice', 'flexible'], priority: 'high' },
    dishwasher: { type: 'standard', features: ['third-rack', 'sanitize', 'quiet'], priority: 'high' },
    extras: ['microwave-drawer', 'warming-drawer', 'beverage-center']
  },
  'entertainer': {
    range: { type: 'mid-high', features: ['double-oven', 'warming-zone', 'convection'], priority: 'high' },
    hood: { type: 'designer', features: ['statement-piece', 'adequate-cfm'], priority: 'medium' },
    refrigerator: { type: 'french-door', features: ['wine-storage', 'flexible', 'counter-depth'], priority: 'high' },
    dishwasher: { type: 'two-drawer', features: ['flexible', 'quick-wash', 'quiet'], priority: 'medium' },
    extras: ['wine-cooler', 'beverage-center', 'ice-maker', 'warming-drawer']
  },
  'eco-conscious': {
    range: { type: 'induction', features: ['energy-star', 'precise-control', 'safe'], priority: 'high' },
    hood: { type: 'energy-efficient', features: ['led', 'auto-sensing', 'efficient-motor'], priority: 'medium' },
    refrigerator: { type: 'energy-star', features: ['efficient', 'smart-temp', 'eco-mode'], priority: 'high' },
    dishwasher: { type: 'energy-star', features: ['eco-cycle', 'water-efficient', 'smart'], priority: 'high' },
    extras: ['compost-system', 'water-filter', 'instant-hot']
  },
  'minimalist': {
    range: { type: 'compact', features: ['induction', 'integrated', 'simple'], priority: 'medium' },
    hood: { type: 'integrated', features: ['hidden', 'quiet', 'adequate'], priority: 'low' },
    refrigerator: { type: 'panel-ready', features: ['integrated', 'efficient', 'counter-depth'], priority: 'high' },
    dishwasher: { type: 'panel-ready', features: ['integrated', 'quiet', 'efficient'], priority: 'medium' },
    extras: ['microwave-drawer', 'hidden-outlets']
  },
  'default': {
    range: { type: 'standard', features: ['electric-or-gas', 'self-clean', 'convection'], priority: 'high' },
    hood: { type: 'standard', features: ['adequate-cfm', 'lighting'], priority: 'medium' },
    refrigerator: { type: 'french-door', features: ['water-ice', 'flexible-storage'], priority: 'high' },
    dishwasher: { type: 'standard', features: ['efficient', 'quiet'], priority: 'medium' },
    extras: ['microwave']
  }
};

/**
 * Storage solutions by space type
 */
const STORAGE_SOLUTIONS = {
  'small-kitchen': {
    essential: [
      { type: 'pull-out-pantry', description: { en: 'Tall narrow pull-out pantry', fr: 'Garde-manger coulissant étroit et haut' } },
      { type: 'door-mounted-racks', description: { en: 'Inside-door storage racks', fr: 'Rangement sur porte' } },
      { type: 'drawer-organizers', description: { en: 'Custom drawer dividers', fr: 'Séparateurs de tiroir personnalisés' } },
      { type: 'corner-lazy-susan', description: { en: 'Corner cabinet lazy susan', fr: 'Plateau tournant d\'angle' } }
    ],
    recommended: [
      { type: 'ceiling-height-cabinets', description: { en: 'Full-height upper cabinets', fr: 'Armoires hautes pleine hauteur' } },
      { type: 'toe-kick-drawers', description: { en: 'Hidden toe-kick storage', fr: 'Rangement caché sous plinthe' } },
      { type: 'magnetic-knife-strip', description: { en: 'Wall-mounted knife storage', fr: 'Rangement mural pour couteaux' } },
      { type: 'pot-rack', description: { en: 'Ceiling pot rack', fr: 'Support à casseroles suspendu' } }
    ]
  },
  'medium-kitchen': {
    essential: [
      { type: 'pantry-cabinet', description: { en: 'Dedicated pantry cabinet', fr: 'Armoire garde-manger dédiée' } },
      { type: 'deep-drawers', description: { en: 'Deep pot and pan drawers', fr: 'Tiroirs profonds pour casseroles' } },
      { type: 'pull-out-trash', description: { en: 'Pull-out waste/recycling', fr: 'Poubelle/recyclage coulissant' } },
      { type: 'spice-drawer', description: { en: 'Dedicated spice drawer', fr: 'Tiroir à épices dédié' } }
    ],
    recommended: [
      { type: 'appliance-garage', description: { en: 'Counter appliance garage', fr: 'Garage à appareils' } },
      { type: 'pull-out-cutting-board', description: { en: 'Built-in cutting board', fr: 'Planche à découper intégrée' } },
      { type: 'utensil-dividers', description: { en: 'Custom utensil organizers', fr: 'Organisateurs d\'ustensiles personnalisés' } },
      { type: 'tray-dividers', description: { en: 'Vertical tray storage', fr: 'Rangement vertical pour plateaux' } }
    ]
  },
  'large-kitchen': {
    essential: [
      { type: 'walk-in-pantry', description: { en: 'Walk-in pantry or butler pantry', fr: 'Garde-manger ou office' } },
      { type: 'island-storage', description: { en: 'Island with dedicated storage', fr: 'Îlot avec rangement dédié' } },
      { type: 'drawer-refrigeration', description: { en: 'Refrigerator drawers', fr: 'Tiroirs réfrigérés' } },
      { type: 'specialty-storage', description: { en: 'Wine/beverage storage', fr: 'Rangement vin/boissons' } }
    ],
    recommended: [
      { type: 'prep-station', description: { en: 'Dedicated prep zone storage', fr: 'Rangement zone de préparation' } },
      { type: 'display-cabinets', description: { en: 'Glass-front display storage', fr: 'Armoires vitrées d\'exposition' } },
      { type: 'charging-drawer', description: { en: 'Device charging station', fr: 'Station de recharge' } },
      { type: 'baking-center', description: { en: 'Dedicated baking storage', fr: 'Rangement pâtisserie dédié' } }
    ]
  },
  'corner-solutions': [
    { type: 'magic-corner', description: { en: 'Magic corner pull-out system', fr: 'Système magic corner' }, bestFor: ['l-shaped', 'u-shaped'] },
    { type: 'super-susan', description: { en: 'Full-access corner lazy susan', fr: 'Plateau tournant d\'angle plein accès' }, bestFor: ['l-shaped', 'u-shaped'] },
    { type: 'diagonal-cabinet', description: { en: 'Diagonal corner cabinet', fr: 'Armoire d\'angle diagonal' }, bestFor: ['l-shaped'] },
    { type: 'blind-corner-pull-out', description: { en: 'Blind corner pull-out', fr: 'Coulissant pour angle aveugle' }, bestFor: ['u-shaped', 'g-shaped'] }
  ]
};

/**
 * Smart feature recommendations by tech preference
 */
const SMART_FEATURES = {
  'very-interested': {
    features: [
      { name: 'voice-control', description: { en: 'Voice-activated appliances and lighting', fr: 'Appareils et éclairage à commande vocale' }, priority: 'high' },
      { name: 'smart-faucet', description: { en: 'Touchless or voice-activated faucet', fr: 'Robinet sans contact ou à commande vocale' }, priority: 'high' },
      { name: 'connected-appliances', description: { en: 'Wi-Fi enabled appliances with app control', fr: 'Appareils Wi-Fi avec contrôle par application' }, priority: 'high' },
      { name: 'smart-lighting', description: { en: 'Programmable lighting scenes', fr: 'Scènes d\'éclairage programmables' }, priority: 'medium' },
      { name: 'usb-outlets', description: { en: 'Built-in USB charging outlets', fr: 'Prises avec ports USB intégrés' }, priority: 'medium' },
      { name: 'tablet-mount', description: { en: 'Built-in tablet/recipe display', fr: 'Support tablette/recette intégré' }, priority: 'low' }
    ],
    integration: ['alexa', 'google-home', 'homekit', 'smartthings']
  },
  'somewhat-interested': {
    features: [
      { name: 'smart-faucet', description: { en: 'Touchless faucet', fr: 'Robinet sans contact' }, priority: 'medium' },
      { name: 'smart-lighting', description: { en: 'Dimmable LED lighting', fr: 'Éclairage LED avec variateur' }, priority: 'medium' },
      { name: 'usb-outlets', description: { en: 'USB charging outlets', fr: 'Prises avec ports USB' }, priority: 'medium' }
    ],
    integration: ['basic-wifi']
  },
  'not-interested': {
    features: [
      { name: 'usb-outlets', description: { en: 'USB outlets for convenience', fr: 'Prises USB pour la commodité' }, priority: 'low' }
    ],
    integration: []
  }
};

/**
 * Main recommendation generation function
 */
function generateAllRecommendations(responses) {
  // Run all analyzers
  const budgetAnalysis = budgetAnalyzer.analyzeBudget(responses);
  const spatialAnalysis = spatialAnalyzer.analyzeSpatial(responses);
  const styleAnalysis = styleMatcher.analyzeStyle(responses);
  const constraintAnalysis = constraintAnalyzer.analyzeConstraints(responses);
  const preferenceAnalysis = preferenceAnalyzer.analyzePreferences(responses);

  // Build combined analysis context
  const combinedAnalysis = {
    budget: budgetAnalysis,
    spatial: spatialAnalysis,
    style: styleAnalysis,
    constraints: constraintAnalysis,
    preferences: preferenceAnalysis,
    userProfile: buildUserProfile(responses, preferenceAnalysis),
    context: {
      responses,
      timestamp: new Date().toISOString()
    }
  };

  // Generate comprehensive recommendations
  const recommendations = {
    summary: generateExecutiveSummary(combinedAnalysis),
    designConcept: generateDesignConcept(combinedAnalysis),
    layout: generateLayoutRecommendations(combinedAnalysis),
    cabinets: generateCabinetRecommendations(combinedAnalysis),
    countertops: generateCountertopRecommendations(combinedAnalysis),
    appliances: generateApplianceRecommendations(combinedAnalysis),
    storage: generateStorageRecommendations(combinedAnalysis),
    lighting: generateLightingRecommendations(combinedAnalysis),
    flooring: generateFlooringRecommendations(combinedAnalysis),
    features: generateFeatureRecommendations(combinedAnalysis),
    backsplash: generateBacksplashRecommendations(combinedAnalysis),
    colorPalette: generateColorPalette(combinedAnalysis),
    warnings: collectAndPrioritizeWarnings(combinedAnalysis),
    actionPlan: generateActionPlan(combinedAnalysis),
    budgetBreakdown: generateBudgetBreakdown(combinedAnalysis),
    alternatives: generateAlternativePackages(combinedAnalysis),
    confidence: calculateConfidenceScores(combinedAnalysis)
  };

  // Add cross-category coherence check
  recommendations.coherenceAnalysis = analyzeRecommendationCoherence(recommendations, combinedAnalysis);

  return recommendations;
}

/**
 * Build user profile from responses and analysis
 */
function buildUserProfile(responses, preferenceAnalysis) {
  const profile = {
    persona: preferenceAnalysis.userProfile?.primaryPersona || 'default',
    decisionStyle: preferenceAnalysis.userProfile?.decisionStyle || 'balanced',
    lifestylePattern: preferenceAnalysis.userProfile?.lifestylePattern || 'general',
    priorities: preferenceAnalysis.priorities?.slice(0, 5) || [],
    constraints: {
      budget: responses['budget-constraints']?.['total-budget'] || 'unknown',
      space: responses['spatial-constraints']?.['kitchen-size'] || 'medium',
      timeline: responses['future-needs']?.['timeline'] || 'flexible'
    }
  };

  return profile;
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(analysis) {
  const style = analysis.style.primaryStyle?.definition?.name || { en: 'Transitional', fr: 'Transitionnel' };
  const budgetTier = analysis.budget.tier || 'mid-range';
  const layouts = analysis.spatial.layoutOptions || [];
  const bestLayout = layouts.find(l => l.feasible)?.layout || 'l-shaped';
  const feasibility = analysis.constraints.feasibilityScore || 75;
  const coherence = analysis.preferences.coherence?.score || 70;

  return {
    title: {
      en: 'Your Personalized Kitchen Design Summary',
      fr: 'Résumé personnalisé de votre conception de cuisine'
    },
    overview: {
      en: `Based on your preferences, we recommend a ${style.en || style} style kitchen with a ${formatLayoutName(bestLayout)} layout. Your ${budgetTier} budget provides ${getBudgetCapabilities(budgetTier)}.`,
      fr: `Selon vos préférences, nous recommandons une cuisine de style ${style.fr || style} avec une disposition ${formatLayoutName(bestLayout)}. Votre budget ${budgetTier} permet ${getBudgetCapabilities(budgetTier, 'fr')}.`
    },
    style: {
      primary: style,
      confidence: analysis.style.primaryStyle?.confidence || 50,
      secondary: analysis.style.secondaryStyle?.definition?.name
    },
    budget: {
      tier: budgetTier,
      range: analysis.budget.budgetRange,
      allocation: analysis.budget.allocation,
      flexibility: analysis.budget.flexibility
    },
    layout: {
      recommended: bestLayout,
      score: layouts.find(l => l.layout === bestLayout)?.score || 70,
      alternatives: layouts.filter(l => l.feasible && l.layout !== bestLayout).slice(0, 2).map(l => l.layout)
    },
    scores: {
      feasibility: {
        score: feasibility,
        rating: getFeasibilityRating(feasibility),
        interpretation: {
          en: feasibility >= 80 ? 'Excellent project feasibility' : feasibility >= 60 ? 'Good feasibility with some considerations' : 'May require scope adjustments',
          fr: feasibility >= 80 ? 'Excellente faisabilité du projet' : feasibility >= 60 ? 'Bonne faisabilité avec quelques considérations' : 'Peut nécessiter des ajustements de portée'
        }
      },
      coherence: {
        score: coherence,
        isCoherent: coherence >= 70,
        interpretation: {
          en: coherence >= 80 ? 'Highly consistent preferences' : coherence >= 60 ? 'Generally consistent with minor adjustments' : 'Some preference conflicts to resolve',
          fr: coherence >= 80 ? 'Préférences très cohérentes' : coherence >= 60 ? 'Généralement cohérent avec des ajustements mineurs' : 'Quelques conflits de préférences à résoudre'
        }
      }
    },
    keyHighlights: generateKeyHighlights(analysis),
    userProfile: {
      persona: analysis.userProfile.persona,
      priorities: analysis.userProfile.priorities
    }
  };
}

/**
 * Generate design concept description
 */
function generateDesignConcept(analysis) {
  const style = analysis.style.primaryStyle?.style || 'transitional';
  const styleGuide = STYLE_DESIGN_GUIDES[style] || STYLE_DESIGN_GUIDES.transitional;
  const secondary = analysis.style.secondaryStyle?.style;

  return {
    title: {
      en: 'Your Design Concept',
      fr: 'Votre concept de design'
    },
    primaryStyle: {
      name: analysis.style.primaryStyle?.definition?.name || { en: 'Transitional', fr: 'Transitionnel' },
      description: analysis.style.primaryStyle?.definition?.description || {
        en: 'A balanced blend of traditional warmth and modern simplicity',
        fr: 'Un mélange équilibré de chaleur traditionnelle et de simplicité moderne'
      },
      keyElements: getStyleKeyElements(style),
      moodWords: getStyleMoodWords(style)
    },
    secondaryInfluence: secondary ? {
      name: analysis.style.secondaryStyle?.definition?.name,
      influence: {
        en: `Your design incorporates ${secondary} elements for added personality`,
        fr: `Votre design incorpore des éléments ${secondary} pour plus de personnalité`
      }
    } : null,
    colorDirection: {
      palette: styleGuide.cabinets.colors.slice(0, 3),
      accent: getStyleAccentColors(style),
      guidance: {
        en: `For ${style} style, focus on ${styleGuide.cabinets.colors.slice(0, 2).join(' and ')} as your primary colors`,
        fr: `Pour le style ${style}, concentrez-vous sur ${styleGuide.cabinets.colors.slice(0, 2).join(' et ')} comme couleurs principales`
      }
    },
    materialDirection: {
      countertops: styleGuide.countertops.materials.slice(0, 3),
      flooring: styleGuide.flooring.materials.slice(0, 2),
      accents: styleGuide.features.accents
    },
    designPrinciples: getDesignPrinciples(style, analysis.userProfile.persona)
  };
}

/**
 * Generate layout recommendations
 */
function generateLayoutRecommendations(analysis) {
  const recommendations = [];
  const layoutOptions = analysis.spatial.layoutOptions || [];
  const userProfile = analysis.userProfile;

  // Primary layout recommendation
  const primaryLayout = layoutOptions.find(l => l.feasible);
  if (primaryLayout) {
    recommendations.push({
      id: 'primary-layout',
      type: 'layout',
      priority: 'high',
      isRecommended: true,
      title: {
        en: `${formatLayoutName(primaryLayout.layout)} Layout`,
        fr: `Disposition ${formatLayoutName(primaryLayout.layout)}`
      },
      description: {
        en: `The optimal layout for your space, scoring ${primaryLayout.score}/100 based on your dimensions and needs.`,
        fr: `La disposition optimale pour votre espace, avec un score de ${primaryLayout.score}/100 basé sur vos dimensions et besoins.`
      },
      reasoning: generateLayoutReasoning(primaryLayout, userProfile),
      pros: primaryLayout.pros || [],
      cons: primaryLayout.cons || [],
      score: primaryLayout.score,
      workTriangle: primaryLayout.workTriangle,
      dimensions: primaryLayout.dimensions
    });
  }

  // Alternative layouts
  const alternatives = layoutOptions.filter(l => l.feasible && l !== primaryLayout).slice(0, 2);
  alternatives.forEach((alt, index) => {
    recommendations.push({
      id: `alt-layout-${alt.layout}`,
      type: 'layout',
      priority: 'medium',
      isRecommended: false,
      title: {
        en: `Alternative ${index + 1}: ${formatLayoutName(alt.layout)} Layout`,
        fr: `Alternative ${index + 1}: Disposition ${formatLayoutName(alt.layout)}`
      },
      description: {
        en: `A viable alternative with a score of ${alt.score}/100.`,
        fr: `Une alternative viable avec un score de ${alt.score}/100.`
      },
      pros: alt.pros || [],
      cons: alt.cons || [],
      score: alt.score,
      comparisonToPrimary: {
        en: primaryLayout ? `${alt.score - primaryLayout.score > 0 ? '+' : ''}${alt.score - primaryLayout.score} points vs primary` : '',
        fr: primaryLayout ? `${alt.score - primaryLayout.score > 0 ? '+' : ''}${alt.score - primaryLayout.score} points vs principale` : ''
      }
    });
  });

  // Island/peninsula recommendations
  const islandOptions = analysis.spatial.islandOptions;
  if (islandOptions?.feasible) {
    recommendations.push({
      id: 'island-recommendation',
      type: 'feature',
      priority: 'medium',
      title: {
        en: 'Kitchen Island',
        fr: 'Îlot de cuisine'
      },
      description: {
        en: `Your space supports a ${islandOptions.recommended || 'medium'} island with seating for ${islandOptions.seatingCapacity || 2}.`,
        fr: `Votre espace supporte un îlot ${islandOptions.recommended || 'moyen'} avec ${islandOptions.seatingCapacity || 2} places assises.`
      },
      dimensions: islandOptions.dimensions,
      features: islandOptions.features || ['prep-space', 'storage', 'seating'],
      clearances: islandOptions.clearances
    });
  } else if (analysis.spatial.peninsulaOptions?.feasible) {
    recommendations.push({
      id: 'peninsula-recommendation',
      type: 'feature',
      priority: 'medium',
      title: {
        en: 'Peninsula Option',
        fr: 'Option péninsule'
      },
      description: {
        en: 'A peninsula provides additional counter space and can define the kitchen area.',
        fr: 'Une péninsule offre un espace de comptoir supplémentaire et peut définir l\'espace cuisine.'
      },
      benefits: {
        en: ['Additional workspace', 'Defines space', 'Seating option', 'Less floor space needed'],
        fr: ['Espace de travail supplémentaire', 'Définit l\'espace', 'Option de sièges', 'Moins d\'espace au sol requis']
      }
    });
  }

  // Work triangle analysis
  if (analysis.spatial.workTriangle) {
    recommendations.push({
      id: 'work-triangle',
      type: 'efficiency',
      priority: 'informational',
      title: {
        en: 'Work Triangle Optimization',
        fr: 'Optimisation du triangle de travail'
      },
      description: {
        en: `Your work triangle totals ${analysis.spatial.workTriangle.perimeter || 'optimal'} feet, ${analysis.spatial.workTriangle.isOptimal ? 'within the ideal range' : 'which may need optimization'}.`,
        fr: `Votre triangle de travail totalise ${analysis.spatial.workTriangle.perimeter || 'optimal'} pieds, ${analysis.spatial.workTriangle.isOptimal ? 'dans la plage idéale' : 'ce qui peut nécessiter une optimisation'}.`
      },
      legs: analysis.spatial.workTriangle.legs,
      efficiency: analysis.spatial.workTriangle.efficiency
    });
  }

  return recommendations;
}

/**
 * Generate cabinet recommendations
 */
function generateCabinetRecommendations(analysis) {
  const recommendations = [];
  const style = analysis.style.primaryStyle?.style || 'transitional';
  const styleGuide = STYLE_DESIGN_GUIDES[style] || STYLE_DESIGN_GUIDES.transitional;
  const budgetGuidance = analysis.budget.productGuidance?.cabinets || {};
  const budgetTier = analysis.budget.tier;

  // Cabinet quality tier
  const qualityTier = determineCabinetQuality(budgetTier);
  recommendations.push({
    id: 'cabinet-quality',
    type: 'cabinets',
    priority: 'high',
    title: {
      en: 'Cabinet Quality Level',
      fr: 'Niveau de qualité des armoires'
    },
    description: {
      en: `Based on your budget, we recommend ${qualityTier.name} cabinets for the best value.`,
      fr: `Selon votre budget, nous recommandons des armoires ${qualityTier.name} pour le meilleur rapport qualité-prix.`
    },
    recommended: qualityTier.type,
    options: budgetGuidance.suggested || [qualityTier.type],
    features: qualityTier.features,
    priceRange: qualityTier.priceRange,
    qualityIndicators: qualityTier.indicators
  });

  // Door style
  recommendations.push({
    id: 'cabinet-door-style',
    type: 'cabinets',
    priority: 'high',
    title: {
      en: 'Cabinet Door Style',
      fr: 'Style de porte d\'armoire'
    },
    description: {
      en: `For your ${style} style, ${formatMaterialName(styleGuide.cabinets.doorStyle)} doors are the classic choice.`,
      fr: `Pour votre style ${style}, les portes ${formatMaterialName(styleGuide.cabinets.doorStyle)} sont le choix classique.`
    },
    recommended: styleGuide.cabinets.doorStyle,
    alternatives: styleGuide.cabinets.alternatives,
    visualImpact: getDoorStyleImpact(styleGuide.cabinets.doorStyle)
  });

  // Cabinet finish/color
  recommendations.push({
    id: 'cabinet-finish',
    type: 'cabinets',
    priority: 'medium',
    title: {
      en: 'Cabinet Finish',
      fr: 'Finition des armoires'
    },
    description: {
      en: `Recommended finishes: ${styleGuide.cabinets.finish.slice(0, 2).join(' or ')}.`,
      fr: `Finitions recommandées: ${styleGuide.cabinets.finish.slice(0, 2).join(' ou ')}.`
    },
    recommended: styleGuide.cabinets.finish[0],
    alternatives: styleGuide.cabinets.finish.slice(1),
    colorOptions: styleGuide.cabinets.colors,
    maintenanceLevel: getFinishMaintenance(styleGuide.cabinets.finish[0])
  });

  // Hardware
  recommendations.push({
    id: 'cabinet-hardware',
    type: 'cabinets',
    priority: 'low',
    title: {
      en: 'Cabinet Hardware',
      fr: 'Quincaillerie d\'armoire'
    },
    description: {
      en: `${formatMaterialName(styleGuide.cabinets.hardware[0])} hardware complements your style choice.`,
      fr: `La quincaillerie ${formatMaterialName(styleGuide.cabinets.hardware[0])} complète votre choix de style.`
    },
    recommended: styleGuide.cabinets.hardware[0],
    alternatives: styleGuide.cabinets.hardware.slice(1),
    finishOptions: getHardwareFinishes(style)
  });

  // Cabinet organization features
  const userPersona = analysis.userProfile.persona;
  const organizationFeatures = getCabinetOrganization(userPersona);
  recommendations.push({
    id: 'cabinet-organization',
    type: 'cabinets',
    priority: 'medium',
    title: {
      en: 'Interior Organization',
      fr: 'Organisation intérieure'
    },
    description: {
      en: 'Recommended interior features for your cooking style.',
      fr: 'Caractéristiques intérieures recommandées pour votre style de cuisine.'
    },
    features: organizationFeatures
  });

  return recommendations;
}

/**
 * Generate countertop recommendations
 */
function generateCountertopRecommendations(analysis) {
  const recommendations = [];
  const style = analysis.style.primaryStyle?.style || 'transitional';
  const styleGuide = STYLE_DESIGN_GUIDES[style] || STYLE_DESIGN_GUIDES.transitional;
  const budgetGuidance = analysis.budget.productGuidance?.countertops || {};
  const materialRecs = analysis.style.materialRecommendations || [];

  // Determine best material based on style, budget, and lifestyle
  const bestMaterial = determineBestCountertop(analysis);

  recommendations.push({
    id: 'countertop-primary',
    type: 'countertops',
    priority: 'high',
    title: {
      en: 'Recommended Countertop Material',
      fr: 'Matériau de comptoir recommandé'
    },
    description: {
      en: `${formatMaterialName(bestMaterial.material)} is ideal for your ${style} style, matching your lifestyle and budget.`,
      fr: `${formatMaterialName(bestMaterial.material)} est idéal pour votre style ${style}, correspondant à votre mode de vie et budget.`
    },
    recommended: bestMaterial.material,
    reasoning: bestMaterial.reasoning,
    characteristics: getCountertopCharacteristics(bestMaterial.material),
    priceRange: bestMaterial.priceRange,
    maintenanceLevel: getCountertopMaintenance(bestMaterial.material)
  });

  // Edge profile
  recommendations.push({
    id: 'countertop-edge',
    type: 'countertops',
    priority: 'low',
    title: {
      en: 'Edge Profile',
      fr: 'Profil de bord'
    },
    description: {
      en: `${formatMaterialName(styleGuide.countertops.edges[0])} edge complements your style.`,
      fr: `Le bord ${formatMaterialName(styleGuide.countertops.edges[0])} complète votre style.`
    },
    recommended: styleGuide.countertops.edges[0],
    alternatives: styleGuide.countertops.edges.slice(1),
    visualGuide: getEdgeProfileDescription(styleGuide.countertops.edges[0])
  });

  // Alternative materials within budget
  const budgetAlternatives = budgetGuidance.suggested || styleGuide.countertops.materials;
  const alternativesList = budgetAlternatives.filter(m => m !== bestMaterial.material).slice(0, 3);

  if (alternativesList.length > 0) {
    recommendations.push({
      id: 'countertop-alternatives',
      type: 'countertops',
      priority: 'medium',
      title: {
        en: 'Alternative Materials',
        fr: 'Matériaux alternatifs'
      },
      description: {
        en: `Other options within your budget: ${alternativesList.map(formatMaterialName).join(', ')}.`,
        fr: `Autres options dans votre budget: ${alternativesList.map(formatMaterialName).join(', ')}.`
      },
      options: alternativesList.map(mat => ({
        material: mat,
        characteristics: getCountertopCharacteristics(mat),
        comparisonToPrimary: compareToRecommended(mat, bestMaterial.material)
      }))
    });
  }

  return recommendations;
}

/**
 * Generate appliance recommendations
 */
function generateApplianceRecommendations(analysis) {
  const recommendations = [];
  const budgetGuidance = analysis.budget.productGuidance?.appliances || {};
  const userPersona = analysis.userProfile.persona;
  const cookingProfile = COOKING_APPLIANCE_GUIDES[userPersona] || COOKING_APPLIANCE_GUIDES.default;

  // Appliance package recommendation
  const applianceTier = determineApplianceTier(analysis.budget.tier);

  recommendations.push({
    id: 'appliance-package',
    type: 'appliances',
    priority: 'high',
    title: {
      en: 'Appliance Package Recommendation',
      fr: 'Recommandation de gamme d\'appareils'
    },
    description: {
      en: `Based on your cooking profile (${formatPersonaName(userPersona)}) and budget, we recommend ${applianceTier.name} tier appliances.`,
      fr: `Selon votre profil de cuisine (${formatPersonaName(userPersona)}) et budget, nous recommandons des appareils de gamme ${applianceTier.name}.`
    },
    tier: applianceTier.tier,
    suggestedBrands: applianceTier.brands,
    budgetAllocation: applianceTier.allocation
  });

  // Individual appliance recommendations
  Object.entries(cookingProfile).forEach(([appliance, config]) => {
    if (appliance === 'extras') return;

    recommendations.push({
      id: `appliance-${appliance}`,
      type: 'appliances',
      priority: config.priority || 'medium',
      title: {
        en: formatApplianceName(appliance),
        fr: formatApplianceName(appliance, 'fr')
      },
      description: {
        en: `Recommended: ${formatMaterialName(config.type)} with ${config.features.slice(0, 2).join(' and ')}.`,
        fr: `Recommandé: ${formatMaterialName(config.type)} avec ${config.features.slice(0, 2).join(' et ')}.`
      },
      recommendedType: config.type,
      keyFeatures: config.features,
      priority: config.priority
    });
  });

  // Extra appliances based on persona
  if (cookingProfile.extras && cookingProfile.extras.length > 0) {
    recommendations.push({
      id: 'appliance-extras',
      type: 'appliances',
      priority: 'low',
      title: {
        en: 'Additional Appliances to Consider',
        fr: 'Appareils supplémentaires à considérer'
      },
      description: {
        en: `Based on your cooking style, consider adding: ${cookingProfile.extras.map(formatMaterialName).join(', ')}.`,
        fr: `Selon votre style de cuisine, envisagez d'ajouter: ${cookingProfile.extras.map(formatMaterialName).join(', ')}.`
      },
      suggestions: cookingProfile.extras.map(extra => ({
        name: extra,
        benefit: getExtraApplianceBenefit(extra, userPersona)
      }))
    });
  }

  // Energy efficiency note
  const envPriority = analysis.context.responses['environmental-concerns']?.['eco-priority'];
  if (envPriority === 'very-important' || envPriority === 'essential') {
    recommendations.push({
      id: 'appliance-energy',
      type: 'appliances',
      priority: 'high',
      title: {
        en: 'Energy Efficiency Priority',
        fr: 'Priorité à l\'efficacité énergétique'
      },
      description: {
        en: 'Look for Energy Star certified appliances. Induction cooktops are 10-15% more efficient than gas.',
        fr: 'Recherchez des appareils certifiés Energy Star. Les plaques à induction sont 10-15% plus efficaces que le gaz.'
      },
      certifications: ['energy-star', 'efficient'],
      potentialSavings: {
        en: 'Up to $100-200/year in energy costs',
        fr: 'Jusqu\'à 100-200$/an en coûts d\'énergie'
      }
    });
  }

  return recommendations;
}

/**
 * Generate storage recommendations
 */
function generateStorageRecommendations(analysis) {
  const recommendations = [];
  const kitchenSize = analysis.context.responses['spatial-constraints']?.['kitchen-size'] || 'medium';
  const layoutType = analysis.spatial.layoutOptions?.find(l => l.feasible)?.layout || 'l-shaped';
  const storageSolutions = STORAGE_SOLUTIONS[`${kitchenSize}-kitchen`] || STORAGE_SOLUTIONS['medium-kitchen'];

  // Essential storage solutions
  recommendations.push({
    id: 'storage-essential',
    type: 'storage',
    priority: 'high',
    title: {
      en: 'Essential Storage Solutions',
      fr: 'Solutions de rangement essentielles'
    },
    description: {
      en: `Maximize your ${kitchenSize} kitchen with these key storage features.`,
      fr: `Maximisez votre cuisine ${kitchenSize} avec ces caractéristiques de rangement clés.`
    },
    solutions: storageSolutions.essential
  });

  // Recommended additional storage
  recommendations.push({
    id: 'storage-recommended',
    type: 'storage',
    priority: 'medium',
    title: {
      en: 'Recommended Storage Upgrades',
      fr: 'Améliorations de rangement recommandées'
    },
    description: {
      en: 'Additional features to enhance organization.',
      fr: 'Caractéristiques supplémentaires pour améliorer l\'organisation.'
    },
    solutions: storageSolutions.recommended
  });

  // Corner solutions if applicable
  const hasCorners = ['l-shaped', 'u-shaped', 'g-shaped'].includes(layoutType);
  if (hasCorners) {
    const cornerSolutions = STORAGE_SOLUTIONS['corner-solutions'].filter(s =>
      s.bestFor.includes(layoutType)
    );

    recommendations.push({
      id: 'storage-corners',
      type: 'storage',
      priority: 'medium',
      title: {
        en: 'Corner Storage Solutions',
        fr: 'Solutions de rangement d\'angle'
      },
      description: {
        en: `Your ${formatLayoutName(layoutType)} layout has corners - maximize them with specialty hardware.`,
        fr: `Votre disposition ${formatLayoutName(layoutType)} a des angles - maximisez-les avec de la quincaillerie spécialisée.`
      },
      solutions: cornerSolutions
    });
  }

  // Pantry recommendations
  const pantryType = determinePantryType(kitchenSize, analysis.spatial);
  recommendations.push({
    id: 'storage-pantry',
    type: 'storage',
    priority: 'medium',
    title: {
      en: 'Pantry Solution',
      fr: 'Solution garde-manger'
    },
    description: {
      en: `A ${pantryType.type} pantry maximizes food storage in your space.`,
      fr: `Un garde-manger ${pantryType.type} maximise le rangement alimentaire dans votre espace.`
    },
    recommendation: pantryType
  });

  return recommendations;
}

/**
 * Generate lighting recommendations
 */
function generateLightingRecommendations(analysis) {
  const recommendations = [];
  const style = analysis.style.primaryStyle?.style || 'transitional';
  const styleGuide = STYLE_DESIGN_GUIDES[style] || STYLE_DESIGN_GUIDES.transitional;
  const hasIsland = analysis.spatial.islandOptions?.feasible;

  // Task lighting (always essential)
  recommendations.push({
    id: 'lighting-task',
    type: 'lighting',
    priority: 'high',
    title: {
      en: 'Under-Cabinet Task Lighting',
      fr: 'Éclairage de tâche sous armoires'
    },
    description: {
      en: 'Essential LED strip or puck lighting for food preparation areas.',
      fr: 'Éclairage LED essentiel pour les zones de préparation alimentaire.'
    },
    options: ['led-strip', 'puck-lights', 'linear-led'],
    placement: {
      en: 'Install under all upper cabinets above work surfaces',
      fr: 'Installer sous toutes les armoires hautes au-dessus des surfaces de travail'
    },
    controlRecommendation: {
      en: 'Add a dimmer for adjustable task lighting intensity',
      fr: 'Ajouter un variateur pour une intensité d\'éclairage ajustable'
    }
  });

  // Ambient/general lighting
  recommendations.push({
    id: 'lighting-ambient',
    type: 'lighting',
    priority: 'medium',
    title: {
      en: 'Ambient Lighting',
      fr: 'Éclairage d\'ambiance'
    },
    description: {
      en: `For ${style} style, consider ${formatMaterialName(styleGuide.lighting.fixtures[0])} fixtures.`,
      fr: `Pour le style ${style}, envisagez des luminaires ${formatMaterialName(styleGuide.lighting.fixtures[0])}.`
    },
    recommended: styleGuide.lighting.fixtures[0],
    alternatives: styleGuide.lighting.fixtures.slice(1),
    finishOptions: styleGuide.lighting.finishes,
    features: styleGuide.lighting.features
  });

  // Island lighting if applicable
  if (hasIsland) {
    recommendations.push({
      id: 'lighting-island',
      type: 'lighting',
      priority: 'high',
      title: {
        en: 'Island Pendant Lighting',
        fr: 'Suspensions pour îlot'
      },
      description: {
        en: 'Pendant lights over the island provide both task lighting and visual interest.',
        fr: 'Les suspensions au-dessus de l\'îlot fournissent un éclairage de tâche et un intérêt visuel.'
      },
      guidelines: {
        en: 'Space pendants 30-36" apart, hang 30-36" above countertop',
        fr: 'Espacer les suspensions de 30-36", suspendre à 30-36" au-dessus du comptoir'
      },
      quantity: calculatePendantQuantity(analysis.spatial.islandOptions?.dimensions)
    });
  }

  // Accent lighting
  recommendations.push({
    id: 'lighting-accent',
    type: 'lighting',
    priority: 'low',
    title: {
      en: 'Accent Lighting',
      fr: 'Éclairage d\'accentuation'
    },
    description: {
      en: 'Optional in-cabinet or toe-kick lighting adds ambiance.',
      fr: 'L\'éclairage optionnel dans les armoires ou sous plinthe ajoute de l\'ambiance.'
    },
    options: ['in-cabinet-led', 'toe-kick-lighting', 'above-cabinet'],
    effect: {
      en: 'Creates warmth and showcases design elements',
      fr: 'Crée de la chaleur et met en valeur les éléments de design'
    }
  });

  return recommendations;
}

/**
 * Generate flooring recommendations
 */
function generateFlooringRecommendations(analysis) {
  const recommendations = [];
  const style = analysis.style.primaryStyle?.style || 'transitional';
  const styleGuide = STYLE_DESIGN_GUIDES[style] || STYLE_DESIGN_GUIDES.transitional;
  const budgetGuidance = analysis.budget.productGuidance?.flooring || {};
  const maintenancePreference = analysis.context.responses['maintenance-preferences']?.['maintenance-tolerance'];

  // Determine best flooring
  const bestFlooring = determineBestFlooring(analysis, styleGuide, maintenancePreference);

  recommendations.push({
    id: 'flooring-primary',
    type: 'flooring',
    priority: 'high',
    title: {
      en: 'Recommended Flooring',
      fr: 'Revêtement de sol recommandé'
    },
    description: {
      en: `${formatMaterialName(bestFlooring.material)} is ideal for your ${style} style and lifestyle.`,
      fr: `${formatMaterialName(bestFlooring.material)} est idéal pour votre style ${style} et mode de vie.`
    },
    recommended: bestFlooring.material,
    reasoning: bestFlooring.reasoning,
    characteristics: getFlooringCharacteristics(bestFlooring.material),
    maintenanceLevel: bestFlooring.maintenance,
    durability: bestFlooring.durability
  });

  // Pattern/installation recommendation
  recommendations.push({
    id: 'flooring-pattern',
    type: 'flooring',
    priority: 'low',
    title: {
      en: 'Installation Pattern',
      fr: 'Motif d\'installation'
    },
    description: {
      en: `Consider ${styleGuide.flooring.patterns[0]} pattern for visual appeal.`,
      fr: `Envisagez un motif ${styleGuide.flooring.patterns[0]} pour l\'attrait visuel.`
    },
    recommended: styleGuide.flooring.patterns[0],
    alternatives: styleGuide.flooring.patterns.slice(1),
    visualEffect: getPatternVisualEffect(styleGuide.flooring.patterns[0])
  });

  // Alternatives
  const alternatives = (budgetGuidance.suggested || styleGuide.flooring.materials)
    .filter(m => m !== bestFlooring.material).slice(0, 2);

  if (alternatives.length > 0) {
    recommendations.push({
      id: 'flooring-alternatives',
      type: 'flooring',
      priority: 'medium',
      title: {
        en: 'Alternative Flooring Options',
        fr: 'Options de revêtement alternatives'
      },
      description: {
        en: `Other materials that work with your style: ${alternatives.map(formatMaterialName).join(', ')}.`,
        fr: `Autres matériaux qui fonctionnent avec votre style: ${alternatives.map(formatMaterialName).join(', ')}.`
      },
      options: alternatives.map(mat => ({
        material: mat,
        characteristics: getFlooringCharacteristics(mat)
      }))
    });
  }

  return recommendations;
}

/**
 * Generate feature recommendations
 */
function generateFeatureRecommendations(analysis) {
  const recommendations = [];
  const responses = analysis.context.responses;
  const techInterest = responses['technology-preferences']?.['smart-home-interest'] || 'not-interested';
  const entertainingFreq = responses['social-usage']?.['entertaining-frequency'];
  const maintenancePref = responses['maintenance-preferences']?.['maintenance-tolerance'];
  const userPersona = analysis.userProfile.persona;

  // Smart features
  const smartFeatures = SMART_FEATURES[techInterest] || SMART_FEATURES['not-interested'];
  if (smartFeatures.features.length > 0) {
    recommendations.push({
      id: 'features-smart',
      type: 'features',
      priority: smartFeatures.features[0].priority,
      title: {
        en: 'Smart Kitchen Features',
        fr: 'Fonctionnalités cuisine intelligente'
      },
      description: {
        en: 'Technology features based on your interest level.',
        fr: 'Fonctionnalités technologiques selon votre niveau d\'intérêt.'
      },
      features: smartFeatures.features,
      integrationOptions: smartFeatures.integration
    });
  }

  // Entertaining features
  if (entertainingFreq === 'frequently' || entertainingFreq === 'very-frequently') {
    recommendations.push({
      id: 'features-entertaining',
      type: 'features',
      priority: 'medium',
      title: {
        en: 'Entertaining Features',
        fr: 'Fonctionnalités pour recevoir'
      },
      description: {
        en: 'Enhance your kitchen for hosting guests.',
        fr: 'Améliorez votre cuisine pour recevoir des invités.'
      },
      features: [
        { name: 'beverage-center', description: { en: 'Coffee/beverage station', fr: 'Station café/boissons' } },
        { name: 'wine-storage', description: { en: 'Built-in wine storage', fr: 'Rangement à vin intégré' } },
        { name: 'bar-seating', description: { en: 'Counter seating for guests', fr: 'Sièges au comptoir pour invités' } },
        { name: 'second-sink', description: { en: 'Prep or bar sink', fr: 'Évier de préparation ou bar' } }
      ]
    });
  }

  // Low maintenance features
  if (maintenancePref === 'low' || maintenancePref === 'minimal') {
    recommendations.push({
      id: 'features-low-maintenance',
      type: 'features',
      priority: 'high',
      title: {
        en: 'Low-Maintenance Features',
        fr: 'Fonctionnalités faible entretien'
      },
      description: {
        en: 'Easy-care options for your busy lifestyle.',
        fr: 'Options faciles d\'entretien pour votre vie active.'
      },
      features: [
        { name: 'fingerprint-resistant', description: { en: 'Smudge-proof finishes', fr: 'Finitions anti-traces' } },
        { name: 'sealed-grout', description: { en: 'Sealed or minimal grout lines', fr: 'Joints scellés ou minimaux' } },
        { name: 'quartz-counters', description: { en: 'Non-porous countertops', fr: 'Comptoirs non poreux' } },
        { name: 'self-clean', description: { en: 'Self-cleaning appliances', fr: 'Appareils auto-nettoyants' } }
      ]
    });
  }

  // Persona-specific features
  const personaFeatures = getPersonaSpecificFeatures(userPersona);
  if (personaFeatures.length > 0) {
    recommendations.push({
      id: 'features-persona',
      type: 'features',
      priority: 'medium',
      title: {
        en: 'Features for Your Cooking Style',
        fr: 'Fonctionnalités pour votre style de cuisine'
      },
      description: {
        en: `Special features recommended for ${formatPersonaName(userPersona)} cooking style.`,
        fr: `Fonctionnalités spéciales recommandées pour le style de cuisine ${formatPersonaName(userPersona)}.`
      },
      features: personaFeatures
    });
  }

  return recommendations;
}

/**
 * Generate backsplash recommendations
 */
function generateBacksplashRecommendations(analysis) {
  const style = analysis.style.primaryStyle?.style || 'transitional';
  const styleGuide = STYLE_DESIGN_GUIDES[style] || STYLE_DESIGN_GUIDES.transitional;
  const countertopRec = determineBestCountertop(analysis);

  return {
    id: 'backsplash',
    type: 'backsplash',
    priority: 'medium',
    title: {
      en: 'Backsplash Recommendation',
      fr: 'Recommandation de dosseret'
    },
    description: {
      en: `For ${style} style with ${formatMaterialName(countertopRec.material)} countertops, consider ${styleGuide.features.backsplash[0]}.`,
      fr: `Pour le style ${style} avec des comptoirs en ${formatMaterialName(countertopRec.material)}, envisagez ${styleGuide.features.backsplash[0]}.`
    },
    recommended: styleGuide.features.backsplash[0],
    alternatives: styleGuide.features.backsplash.slice(1),
    coordination: {
      en: `Coordinates with ${formatMaterialName(countertopRec.material)} countertops`,
      fr: `Se coordonne avec les comptoirs en ${formatMaterialName(countertopRec.material)}`
    },
    heightOptions: ['standard-4-inch', 'half-height', 'full-height']
  };
}

/**
 * Generate color palette
 */
function generateColorPalette(analysis) {
  const style = analysis.style.primaryStyle?.style || 'transitional';
  const styleGuide = STYLE_DESIGN_GUIDES[style] || STYLE_DESIGN_GUIDES.transitional;

  return {
    title: {
      en: 'Recommended Color Palette',
      fr: 'Palette de couleurs recommandée'
    },
    primary: {
      color: styleGuide.cabinets.colors[0],
      usage: { en: 'Cabinets and dominant surfaces', fr: 'Armoires et surfaces dominantes' }
    },
    secondary: {
      color: styleGuide.countertops.colors[0],
      usage: { en: 'Countertops and accent areas', fr: 'Comptoirs et zones d\'accent' }
    },
    accent: {
      color: getStyleAccentColors(style)[0],
      usage: { en: 'Hardware, fixtures, and small accents', fr: 'Quincaillerie, appareils et petits accents' }
    },
    neutral: {
      color: 'white',
      usage: { en: 'Trim, ceiling, and balance', fr: 'Moulures, plafond et équilibre' }
    },
    coordination: {
      en: 'This palette creates a cohesive, balanced look typical of well-designed kitchens',
      fr: 'Cette palette crée un look cohérent et équilibré typique des cuisines bien conçues'
    }
  };
}

/**
 * Collect and prioritize warnings
 */
function collectAndPrioritizeWarnings(analysis) {
  const warnings = [];

  // Budget warnings
  if (analysis.budget.warnings) {
    analysis.budget.warnings.forEach(w => warnings.push({
      ...w,
      source: 'budget',
      priorityValue: PRIORITY_LEVELS[w.severity]?.value || 3
    }));
  }

  // Constraint conflicts
  if (analysis.constraints.conflicts) {
    analysis.constraints.conflicts.forEach(c => warnings.push({
      id: c.id,
      type: c.type,
      severity: c.severity,
      message: c.message,
      resolution: c.resolution,
      source: 'constraints',
      priorityValue: PRIORITY_LEVELS[c.severity]?.value || 3
    }));
  }

  // Style conflicts
  if (analysis.style.conflicts) {
    analysis.style.conflicts.forEach(c => warnings.push({
      ...c,
      source: 'style',
      priorityValue: PRIORITY_LEVELS[c.severity]?.value || 3
    }));
  }

  // Preference coherence issues
  if (analysis.preferences.coherence?.issues) {
    analysis.preferences.coherence.issues.forEach(i => warnings.push({
      type: i.type,
      severity: 'medium',
      message: i.message,
      source: 'preferences',
      priorityValue: 3
    }));
  }

  // Sort by priority
  warnings.sort((a, b) => a.priorityValue - b.priorityValue);

  return {
    count: warnings.length,
    critical: warnings.filter(w => w.severity === 'critical'),
    high: warnings.filter(w => w.severity === 'high'),
    medium: warnings.filter(w => w.severity === 'medium'),
    low: warnings.filter(w => w.severity === 'low'),
    all: warnings
  };
}

/**
 * Generate action plan
 */
function generateActionPlan(analysis) {
  const steps = [];
  let order = 1;

  // Address critical conflicts first
  if (analysis.constraints.conflicts?.some(c => c.severity === 'critical' || c.severity === 'high')) {
    steps.push({
      order: order++,
      priority: 'critical',
      title: { en: 'Resolve Design Conflicts', fr: 'Résoudre les conflits de conception' },
      description: {
        en: 'Address identified conflicts between your preferences and constraints before finalizing design.',
        fr: 'Traitez les conflits identifiés entre vos préférences et contraintes avant de finaliser le design.'
      },
      actionItems: analysis.constraints.conflicts
        .filter(c => c.severity === 'critical' || c.severity === 'high')
        .map(c => c.resolution)
    });
  }

  // Finalize layout
  steps.push({
    order: order++,
    priority: 'high',
    title: { en: 'Confirm Layout', fr: 'Confirmer la disposition' },
    description: {
      en: 'Select your preferred layout from the recommended options. This decision affects all other selections.',
      fr: 'Sélectionnez votre disposition préférée parmi les options recommandées. Cette décision affecte toutes les autres sélections.'
    }
  });

  // Budget confirmation
  steps.push({
    order: order++,
    priority: 'high',
    title: { en: 'Review Budget Allocation', fr: 'Revoir l\'allocation budgétaire' },
    description: {
      en: 'Confirm how you want to distribute your budget across categories based on your priorities.',
      fr: 'Confirmez comment vous souhaitez répartir votre budget par catégorie selon vos priorités.'
    }
  });

  // Material selections
  steps.push({
    order: order++,
    priority: 'medium',
    title: { en: 'Select Materials', fr: 'Sélectionner les matériaux' },
    description: {
      en: 'Choose specific materials for countertops, cabinets, flooring, and backsplash.',
      fr: 'Choisissez les matériaux spécifiques pour comptoirs, armoires, sol et dosseret.'
    }
  });

  // Appliance selection
  steps.push({
    order: order++,
    priority: 'medium',
    title: { en: 'Finalize Appliances', fr: 'Finaliser les appareils' },
    description: {
      en: 'Select specific appliance models based on recommendations and measure for fit.',
      fr: 'Sélectionnez les modèles d\'appareils spécifiques selon les recommandations et mesurez pour l\'ajustement.'
    }
  });

  // Professional consultation
  if (analysis.constraints.constraints?.filter(c => c.type === 'hard').length > 3) {
    steps.push({
      order: order++,
      priority: 'high',
      title: { en: 'Professional Consultation', fr: 'Consultation professionnelle' },
      description: {
        en: 'Given the complexity of your project, we recommend consulting with a kitchen designer.',
        fr: 'Étant donné la complexité de votre projet, nous recommandons de consulter un designer de cuisine.'
      }
    });
  }

  // Get quotes
  steps.push({
    order: order++,
    priority: 'low',
    title: { en: 'Request Quotes', fr: 'Demander des devis' },
    description: {
      en: 'Get quotes from 2-3 contractors based on your design specifications.',
      fr: 'Obtenez des devis de 2-3 entrepreneurs selon vos spécifications de conception.'
    }
  });

  return steps;
}

/**
 * Generate budget breakdown
 */
function generateBudgetBreakdown(analysis) {
  const allocation = analysis.budget.allocation || {};
  const total = analysis.budget.budgetRange?.midpoint || 50000;

  return {
    total: {
      amount: total,
      range: analysis.budget.budgetRange
    },
    categories: Object.entries(RECOMMENDATION_CATEGORIES).map(([cat, info]) => ({
      category: cat,
      percentage: allocation[cat]?.percentage || Math.round(info.weight * 100),
      amount: allocation[cat]?.amount || Math.round(total * info.weight),
      description: info.description
    })),
    contingency: {
      recommended: Math.round(total * 0.15),
      percentage: 15,
      note: {
        en: 'Always budget 15-20% for unexpected costs',
        fr: 'Budgétez toujours 15-20% pour les coûts imprévus'
      }
    }
  };
}

/**
 * Generate alternative packages at different price points
 */
function generateAlternativePackages(analysis) {
  const budgetTier = analysis.budget.tier;
  const total = analysis.budget.budgetRange?.midpoint || 50000;

  return {
    premium: {
      tier: 'premium',
      multiplier: 1.25,
      totalEstimate: Math.round(total * 1.25),
      upgrades: {
        en: ['Custom cabinets', 'Premium countertops', 'Professional appliances', 'Designer lighting'],
        fr: ['Armoires sur mesure', 'Comptoirs premium', 'Appareils professionnels', 'Éclairage designer']
      }
    },
    value: {
      tier: 'value',
      multiplier: 0.8,
      totalEstimate: Math.round(total * 0.8),
      tradeoffs: {
        en: ['Stock cabinets', 'Solid surface countertops', 'Standard appliances', 'Basic lighting'],
        fr: ['Armoires en stock', 'Comptoirs en surface solide', 'Appareils standards', 'Éclairage de base']
      }
    },
    phased: {
      tier: 'phased',
      description: {
        en: 'Complete renovation in stages to spread costs over time',
        fr: 'Rénovation complète par étapes pour répartir les coûts'
      },
      phases: [
        { name: { en: 'Phase 1: Layout & Cabinets', fr: 'Phase 1: Disposition et armoires' }, percentage: 50 },
        { name: { en: 'Phase 2: Counters & Appliances', fr: 'Phase 2: Comptoirs et appareils' }, percentage: 35 },
        { name: { en: 'Phase 3: Finishes & Features', fr: 'Phase 3: Finitions et fonctionnalités' }, percentage: 15 }
      ]
    }
  };
}

/**
 * Calculate confidence scores
 */
function calculateConfidenceScores(analysis) {
  const styleConfidence = analysis.style.primaryStyle?.confidence || 50;
  const feasibilityScore = analysis.constraints.feasibilityScore || 50;
  const coherenceScore = analysis.preferences.coherence?.score || 50;
  const budgetConfidence = analysis.budget.allocation?.confidence || 70;

  const overall = Math.round(
    styleConfidence * 0.25 +
    feasibilityScore * 0.30 +
    coherenceScore * 0.25 +
    budgetConfidence * 0.20
  );

  return {
    overall,
    breakdown: {
      style: { score: styleConfidence, weight: 0.25 },
      feasibility: { score: feasibilityScore, weight: 0.30 },
      coherence: { score: coherenceScore, weight: 0.25 },
      budget: { score: budgetConfidence, weight: 0.20 }
    },
    interpretation: {
      en: overall >= 80 ? 'High confidence in these recommendations'
        : overall >= 60 ? 'Good confidence with some areas to refine'
        : 'Moderate confidence - consider additional consultation',
      fr: overall >= 80 ? 'Haute confiance dans ces recommandations'
        : overall >= 60 ? 'Bonne confiance avec quelques domaines à affiner'
        : 'Confiance modérée - envisagez une consultation supplémentaire'
    }
  };
}

/**
 * Analyze recommendation coherence across categories
 */
function analyzeRecommendationCoherence(recommendations, analysis) {
  const issues = [];
  const strengths = [];

  // Check style consistency
  const style = analysis.style.primaryStyle?.style;
  if (style) {
    strengths.push({
      area: 'style',
      message: {
        en: `All recommendations align with ${style} design principles`,
        fr: `Toutes les recommandations s'alignent sur les principes de design ${style}`
      }
    });
  }

  // Check budget consistency
  if (analysis.budget.allocation?.confidence >= 70) {
    strengths.push({
      area: 'budget',
      message: {
        en: 'Recommendations fit within budget constraints',
        fr: 'Les recommandations respectent les contraintes budgétaires'
      }
    });
  } else {
    issues.push({
      area: 'budget',
      message: {
        en: 'Some recommendations may exceed budget - review alternatives',
        fr: 'Certaines recommandations peuvent dépasser le budget - voir les alternatives'
      }
    });
  }

  return {
    isCoherent: issues.length === 0,
    strengths,
    issues,
    overallAssessment: {
      en: issues.length === 0
        ? 'All recommendations work together cohesively'
        : 'Minor adjustments may improve overall coherence',
      fr: issues.length === 0
        ? 'Toutes les recommandations fonctionnent ensemble de manière cohérente'
        : 'Des ajustements mineurs peuvent améliorer la cohérence globale'
    }
  };
}

// =====================
// Helper Functions
// =====================

function formatLayoutName(layout) {
  if (!layout) return '';
  return layout.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('-');
}

function formatMaterialName(material) {
  if (!material) return '';
  return material.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatPersonaName(persona) {
  if (!persona) return '';
  return persona.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatApplianceName(appliance, lang = 'en') {
  const names = {
    range: { en: 'Range/Cooktop', fr: 'Cuisinière/Plaque' },
    hood: { en: 'Range Hood', fr: 'Hotte' },
    refrigerator: { en: 'Refrigerator', fr: 'Réfrigérateur' },
    dishwasher: { en: 'Dishwasher', fr: 'Lave-vaisselle' }
  };
  return names[appliance]?.[lang] || formatMaterialName(appliance);
}

function getBudgetCapabilities(tier, lang = 'en') {
  const capabilities = {
    'entry': { en: 'basic updates with value-focused selections', fr: 'des mises à jour de base avec des sélections axées sur la valeur' },
    'budget': { en: 'quality improvements with strategic upgrades', fr: 'des améliorations de qualité avec des mises à niveau stratégiques' },
    'mid-range': { en: 'substantial upgrades with quality materials', fr: 'des mises à niveau substantielles avec des matériaux de qualité' },
    'mid-high': { en: 'premium selections across most categories', fr: 'des sélections premium dans la plupart des catégories' },
    'luxury': { en: 'high-end finishes and professional-grade features', fr: 'des finitions haut de gamme et des fonctionnalités professionnelles' },
    'ultra-luxury': { en: 'bespoke design with unlimited options', fr: 'un design sur mesure avec des options illimitées' }
  };
  return capabilities[tier]?.[lang] || capabilities['mid-range'][lang];
}

function getFeasibilityRating(score) {
  if (score >= 85) return { en: 'Excellent', fr: 'Excellent' };
  if (score >= 70) return { en: 'Good', fr: 'Bon' };
  if (score >= 55) return { en: 'Moderate', fr: 'Modéré' };
  if (score >= 40) return { en: 'Challenging', fr: 'Difficile' };
  return { en: 'Needs Revision', fr: 'Nécessite révision' };
}

function generateKeyHighlights(analysis) {
  const highlights = [];

  // Best layout
  const bestLayout = analysis.spatial.layoutOptions?.find(l => l.feasible);
  if (bestLayout) {
    highlights.push({
      icon: 'layout',
      text: { en: `${formatLayoutName(bestLayout.layout)} layout recommended`, fr: `Disposition ${formatLayoutName(bestLayout.layout)} recommandée` }
    });
  }

  // Island feasibility
  if (analysis.spatial.islandOptions?.feasible) {
    highlights.push({
      icon: 'island',
      text: { en: 'Island is feasible in your space', fr: 'Un îlot est réalisable dans votre espace' }
    });
  }

  // Budget tier
  highlights.push({
    icon: 'budget',
    text: { en: `${analysis.budget.tier} budget tier`, fr: `Budget de gamme ${analysis.budget.tier}` }
  });

  return highlights.slice(0, 4);
}

function getStyleKeyElements(style) {
  const elements = {
    modern: { en: ['Clean lines', 'Minimal ornamentation', 'Sleek surfaces'], fr: ['Lignes épurées', 'Ornementation minimale', 'Surfaces lisses'] },
    traditional: { en: ['Ornate details', 'Rich wood tones', 'Classic proportions'], fr: ['Détails ornés', 'Tons bois riches', 'Proportions classiques'] },
    transitional: { en: ['Balanced mix', 'Simple profiles', 'Neutral palette'], fr: ['Mélange équilibré', 'Profils simples', 'Palette neutre'] },
    farmhouse: { en: ['Rustic charm', 'Natural materials', 'Cozy atmosphere'], fr: ['Charme rustique', 'Matériaux naturels', 'Atmosphère chaleureuse'] },
    contemporary: { en: ['Bold statements', 'Unique materials', 'Artistic elements'], fr: ['Déclarations audacieuses', 'Matériaux uniques', 'Éléments artistiques'] },
    industrial: { en: ['Raw materials', 'Exposed elements', 'Utilitarian design'], fr: ['Matériaux bruts', 'Éléments exposés', 'Design utilitaire'] }
  };
  return elements[style] || elements.transitional;
}

function getStyleMoodWords(style) {
  const moods = {
    modern: ['sleek', 'minimal', 'sophisticated'],
    traditional: ['elegant', 'timeless', 'warm'],
    transitional: ['balanced', 'versatile', 'comfortable'],
    farmhouse: ['cozy', 'welcoming', 'authentic'],
    contemporary: ['bold', 'artistic', 'dynamic'],
    industrial: ['raw', 'urban', 'edgy']
  };
  return moods[style] || moods.transitional;
}

function getStyleAccentColors(style) {
  const accents = {
    modern: ['black', 'chrome', 'gold'],
    traditional: ['brass', 'bronze', 'copper'],
    transitional: ['brushed-nickel', 'oil-rubbed-bronze', 'mixed-metals'],
    farmhouse: ['matte-black', 'aged-brass', 'copper'],
    contemporary: ['brass', 'matte-black', 'mixed'],
    industrial: ['raw-metal', 'aged-iron', 'copper']
  };
  return accents[style] || accents.transitional;
}

function getDesignPrinciples(style, persona) {
  const principles = [];

  // Style-based principles
  if (style === 'modern' || style === 'contemporary') {
    principles.push({ en: 'Less is more - prioritize clean, uncluttered surfaces', fr: 'Moins c\'est plus - priorisez les surfaces propres et épurées' });
  }
  if (style === 'traditional' || style === 'farmhouse') {
    principles.push({ en: 'Embrace warmth through natural materials and textures', fr: 'Adoptez la chaleur à travers les matériaux et textures naturels' });
  }

  // Persona-based principles
  if (persona === 'serious-chef') {
    principles.push({ en: 'Prioritize function and durability over pure aesthetics', fr: 'Priorisez la fonction et la durabilité sur l\'esthétique pure' });
  }
  if (persona === 'entertainer') {
    principles.push({ en: 'Create visual focal points for social gatherings', fr: 'Créez des points focaux visuels pour les réunions sociales' });
  }

  return principles;
}

function generateLayoutReasoning(layout, userProfile) {
  const reasons = [];

  if (layout.score >= 80) {
    reasons.push({ en: 'Excellent fit for your space dimensions', fr: 'Excellent ajustement pour vos dimensions d\'espace' });
  }

  if (layout.workTriangle?.isOptimal) {
    reasons.push({ en: 'Optimal work triangle configuration', fr: 'Configuration optimale du triangle de travail' });
  }

  return reasons;
}

function determineCabinetQuality(budgetTier) {
  const qualities = {
    'entry': { type: 'stock', name: 'Stock', features: ['basic-construction', 'limited-sizes'], priceRange: '$80-150/linear ft', indicators: ['Particle board construction', 'Limited finish options'] },
    'budget': { type: 'rta', name: 'RTA (Ready-to-Assemble)', features: ['better-materials', 'more-sizes'], priceRange: '$100-200/linear ft', indicators: ['Plywood boxes available', 'Self-assembly required'] },
    'mid-range': { type: 'semi-custom', name: 'Semi-Custom', features: ['quality-construction', 'customization'], priceRange: '$200-400/linear ft', indicators: ['Plywood construction', 'Multiple finish options'] },
    'mid-high': { type: 'semi-custom-premium', name: 'Premium Semi-Custom', features: ['premium-materials', 'extensive-options'], priceRange: '$350-600/linear ft', indicators: ['Hardwood frames', 'Soft-close standard'] },
    'luxury': { type: 'custom', name: 'Custom', features: ['unlimited-options', 'premium-everything'], priceRange: '$600-1200/linear ft', indicators: ['Fully custom sizing', 'Premium wood species'] },
    'ultra-luxury': { type: 'bespoke', name: 'Bespoke', features: ['artisan-crafted', 'unique-design'], priceRange: '$1000+/linear ft', indicators: ['Handcrafted details', 'Unlimited customization'] }
  };
  return qualities[budgetTier] || qualities['mid-range'];
}

function getDoorStyleImpact(doorStyle) {
  const impacts = {
    'flat-panel': { en: 'Creates a sleek, modern appearance', fr: 'Crée une apparence élégante et moderne' },
    'raised-panel': { en: 'Adds traditional elegance and depth', fr: 'Ajoute de l\'élégance traditionnelle et de la profondeur' },
    'shaker': { en: 'Provides versatile, timeless appeal', fr: 'Offre un attrait polyvalent et intemporel' },
    'slab': { en: 'Maximizes minimalist aesthetic', fr: 'Maximise l\'esthétique minimaliste' },
    'beadboard': { en: 'Adds cottage or farmhouse charm', fr: 'Ajoute du charme cottage ou fermier' }
  };
  return impacts[doorStyle] || impacts['shaker'];
}

function getFinishMaintenance(finish) {
  const maintenance = {
    'high-gloss': { level: 'high', note: { en: 'Shows fingerprints easily', fr: 'Montre facilement les empreintes' } },
    'matte-lacquer': { level: 'low', note: { en: 'Hides marks well', fr: 'Cache bien les marques' } },
    'stained-wood': { level: 'medium', note: { en: 'May need periodic refinishing', fr: 'Peut nécessiter une remise à neuf périodique' } },
    'painted': { level: 'medium', note: { en: 'May chip over time', fr: 'Peut s\'écailler avec le temps' } },
    'thermofoil': { level: 'low', note: { en: 'Easy to clean, durable', fr: 'Facile à nettoyer, durable' } }
  };
  return maintenance[finish] || { level: 'medium', note: { en: 'Standard maintenance', fr: 'Entretien standard' } };
}

function getHardwareFinishes(style) {
  const finishes = {
    modern: ['chrome', 'brushed-nickel', 'matte-black', 'stainless'],
    traditional: ['brass', 'bronze', 'antique-gold', 'pewter'],
    transitional: ['brushed-nickel', 'oil-rubbed-bronze', 'chrome', 'mixed'],
    farmhouse: ['matte-black', 'aged-brass', 'copper', 'iron'],
    contemporary: ['brass', 'matte-black', 'chrome', 'mixed-metals'],
    industrial: ['raw-metal', 'iron', 'copper', 'galvanized']
  };
  return finishes[style] || finishes.transitional;
}

function getCabinetOrganization(persona) {
  const features = {
    'serious-chef': [
      { type: 'pot-drawers', description: { en: 'Deep drawers for pots and pans', fr: 'Tiroirs profonds pour casseroles' } },
      { type: 'spice-organization', description: { en: 'Dedicated spice storage', fr: 'Rangement à épices dédié' } },
      { type: 'knife-block', description: { en: 'In-drawer knife storage', fr: 'Rangement à couteaux dans tiroir' } }
    ],
    'busy-professional': [
      { type: 'pull-out-pantry', description: { en: 'Easy-access pantry', fr: 'Garde-manger à accès facile' } },
      { type: 'appliance-garage', description: { en: 'Hide small appliances', fr: 'Cacher les petits appareils' } }
    ],
    'family-focused': [
      { type: 'snack-drawer', description: { en: 'Kid-accessible snack storage', fr: 'Rangement collations accessible aux enfants' } },
      { type: 'pull-out-trash', description: { en: 'Hidden waste/recycling', fr: 'Poubelle/recyclage caché' } }
    ],
    'default': [
      { type: 'drawer-dividers', description: { en: 'Utensil organization', fr: 'Organisation des ustensiles' } },
      { type: 'lazy-susan', description: { en: 'Corner cabinet access', fr: 'Accès armoire d\'angle' } }
    ]
  };
  return features[persona] || features.default;
}

function determineBestCountertop(analysis) {
  const style = analysis.style.primaryStyle?.style || 'transitional';
  const styleGuide = STYLE_DESIGN_GUIDES[style] || STYLE_DESIGN_GUIDES.transitional;
  const budgetTier = analysis.budget.tier;
  const maintenancePref = analysis.context.responses['maintenance-preferences']?.['maintenance-tolerance'];

  // Default to style-appropriate material adjusted for budget
  let material = styleGuide.countertops.materials[0];
  let reasoning = [];

  // Adjust based on budget
  if (['entry', 'budget'].includes(budgetTier)) {
    material = 'laminate';
    if (maintenancePref !== 'high') material = 'solid-surface';
    reasoning.push({ en: 'Budget-conscious selection', fr: 'Sélection économique' });
  } else if (['mid-range', 'mid-high'].includes(budgetTier)) {
    material = 'quartz';
    reasoning.push({ en: 'Best value for durability and aesthetics', fr: 'Meilleur rapport durabilité-esthétique' });
  } else {
    material = styleGuide.countertops.materials[0];
    reasoning.push({ en: 'Premium selection matching your style', fr: 'Sélection premium correspondant à votre style' });
  }

  // Adjust for maintenance preference
  if (maintenancePref === 'low' && material === 'marble') {
    material = 'quartz';
    reasoning.push({ en: 'Easier maintenance than marble', fr: 'Entretien plus facile que le marbre' });
  }

  return {
    material,
    reasoning,
    priceRange: getCountertopPriceRange(material),
    budgetFit: true
  };
}

function getCountertopCharacteristics(material) {
  const characteristics = {
    'quartz': { durability: 'excellent', maintenance: 'low', heat: 'good', stain: 'excellent' },
    'granite': { durability: 'excellent', maintenance: 'medium', heat: 'excellent', stain: 'good' },
    'marble': { durability: 'good', maintenance: 'high', heat: 'good', stain: 'poor' },
    'butcher-block': { durability: 'good', maintenance: 'high', heat: 'poor', stain: 'medium' },
    'laminate': { durability: 'fair', maintenance: 'low', heat: 'poor', stain: 'good' },
    'solid-surface': { durability: 'good', maintenance: 'low', heat: 'fair', stain: 'good' },
    'concrete': { durability: 'excellent', maintenance: 'medium', heat: 'excellent', stain: 'medium' },
    'stainless-steel': { durability: 'excellent', maintenance: 'medium', heat: 'excellent', stain: 'excellent' }
  };
  return characteristics[material] || characteristics['quartz'];
}

function getCountertopMaintenance(material) {
  const maintenance = {
    'quartz': { level: 'low', note: { en: 'Wipe with soap and water', fr: 'Essuyer avec eau et savon' } },
    'granite': { level: 'medium', note: { en: 'Seal annually', fr: 'Sceller annuellement' } },
    'marble': { level: 'high', note: { en: 'Seal regularly, avoid acids', fr: 'Sceller régulièrement, éviter les acides' } },
    'butcher-block': { level: 'high', note: { en: 'Oil monthly, sand occasionally', fr: 'Huiler mensuellement, poncer occasionnellement' } },
    'laminate': { level: 'low', note: { en: 'Wipe clean, avoid scratches', fr: 'Essuyer, éviter les rayures' } }
  };
  return maintenance[material] || { level: 'medium', note: { en: 'Follow manufacturer guidelines', fr: 'Suivre les directives du fabricant' } };
}

function getCountertopPriceRange(material) {
  const prices = {
    'laminate': '$10-40/sq ft installed',
    'solid-surface': '$40-80/sq ft installed',
    'quartz': '$50-150/sq ft installed',
    'granite': '$40-200/sq ft installed',
    'marble': '$75-250/sq ft installed',
    'butcher-block': '$40-100/sq ft installed',
    'concrete': '$70-150/sq ft installed',
    'quartzite': '$80-200/sq ft installed'
  };
  return prices[material] || '$50-100/sq ft installed';
}

function getEdgeProfileDescription(edge) {
  const descriptions = {
    'eased': { en: 'Slightly rounded corners, versatile look', fr: 'Coins légèrement arrondis, look polyvalent' },
    'square': { en: 'Sharp 90-degree edge, modern feel', fr: 'Bord à 90 degrés, sensation moderne' },
    'beveled': { en: 'Angled cut, classic appearance', fr: 'Coupe angulaire, apparence classique' },
    'bullnose': { en: 'Fully rounded, soft look', fr: 'Entièrement arrondi, look doux' },
    'ogee': { en: 'S-curve profile, elegant traditional', fr: 'Profil en S, élégant traditionnel' },
    'waterfall': { en: 'Continues down cabinet sides', fr: 'Continue sur les côtés des armoires' }
  };
  return descriptions[edge] || descriptions['eased'];
}

function compareToRecommended(material, recommended) {
  return {
    en: `Alternative to ${formatMaterialName(recommended)}`,
    fr: `Alternative à ${formatMaterialName(recommended)}`
  };
}

function determineApplianceTier(budgetTier) {
  const tiers = {
    'entry': { tier: 'value', name: 'Value', brands: ['Frigidaire', 'Whirlpool', 'GE'], allocation: 15 },
    'budget': { tier: 'standard', name: 'Standard', brands: ['GE', 'Whirlpool', 'LG'], allocation: 18 },
    'mid-range': { tier: 'mid-range', name: 'Mid-Range', brands: ['GE Profile', 'LG', 'Samsung'], allocation: 20 },
    'mid-high': { tier: 'premium', name: 'Premium', brands: ['KitchenAid', 'Bosch', 'GE Cafe'], allocation: 22 },
    'luxury': { tier: 'professional', name: 'Professional', brands: ['Thermador', 'Wolf', 'Sub-Zero'], allocation: 25 },
    'ultra-luxury': { tier: 'commercial', name: 'Commercial-Grade', brands: ['Wolf', 'Miele', 'Gaggenau'], allocation: 28 }
  };
  return tiers[budgetTier] || tiers['mid-range'];
}

function getExtraApplianceBenefit(extra, persona) {
  const benefits = {
    'pot-filler': { en: 'Fill large pots directly at the stove', fr: 'Remplir les grandes casseroles directement à la cuisinière' },
    'prep-sink': { en: 'Dedicated prep area away from main sink', fr: 'Zone de préparation dédiée loin de l\'évier principal' },
    'warming-drawer': { en: 'Keep dishes warm while finishing meal', fr: 'Garder les plats au chaud pendant la finition du repas' },
    'wine-cooler': { en: 'Proper wine storage at serving temperature', fr: 'Stockage approprié du vin à température de service' },
    'beverage-center': { en: 'Dedicated cold beverage storage', fr: 'Stockage dédié pour boissons froides' },
    'built-in-coffee': { en: 'Barista-quality coffee on demand', fr: 'Café de qualité barista sur demande' },
    'speed-oven': { en: 'Quick cooking with microwave and convection', fr: 'Cuisson rapide avec micro-ondes et convection' }
  };
  return benefits[extra] || { en: 'Enhance your kitchen functionality', fr: 'Améliorer la fonctionnalité de votre cuisine' };
}

function determinePantryType(kitchenSize, spatial) {
  if (kitchenSize === 'small') {
    return { type: 'pull-out', description: { en: 'Tall pull-out pantry cabinet', fr: 'Armoire garde-manger coulissante haute' } };
  } else if (kitchenSize === 'medium') {
    return { type: 'cabinet', description: { en: 'Dedicated pantry cabinet', fr: 'Armoire garde-manger dédiée' } };
  } else {
    return { type: 'walk-in', description: { en: 'Walk-in or butler pantry', fr: 'Garde-manger ou office' } };
  }
}

function calculatePendantQuantity(dimensions) {
  if (!dimensions) return { recommended: 2, note: { en: 'Standard 2-3 pendants', fr: '2-3 suspensions standard' } };

  const length = dimensions.length || 48;
  if (length <= 48) return { recommended: 2, note: { en: '2 pendants for smaller island', fr: '2 suspensions pour petit îlot' } };
  if (length <= 72) return { recommended: 3, note: { en: '3 pendants for medium island', fr: '3 suspensions pour îlot moyen' } };
  return { recommended: 4, note: { en: '4 pendants or linear fixture for large island', fr: '4 suspensions ou luminaire linéaire pour grand îlot' } };
}

function determineBestFlooring(analysis, styleGuide, maintenancePref) {
  let material = styleGuide.flooring.materials[0];
  let reasoning = [];

  // Adjust for maintenance
  if (maintenancePref === 'low') {
    if (['hardwood', 'natural-stone'].includes(material)) {
      material = 'lvp';
      reasoning.push({ en: 'Lower maintenance than natural materials', fr: 'Entretien plus facile que les matériaux naturels' });
    }
  }

  return {
    material,
    reasoning,
    maintenance: getFlooringMaintenance(material),
    durability: getFlooringDurability(material)
  };
}

function getFlooringCharacteristics(material) {
  const characteristics = {
    'hardwood': { durability: 'good', maintenance: 'medium', water: 'poor', comfort: 'excellent' },
    'engineered-hardwood': { durability: 'good', maintenance: 'medium', water: 'fair', comfort: 'excellent' },
    'lvp': { durability: 'excellent', maintenance: 'low', water: 'excellent', comfort: 'good' },
    'tile': { durability: 'excellent', maintenance: 'low', water: 'excellent', comfort: 'fair' },
    'porcelain-tile': { durability: 'excellent', maintenance: 'low', water: 'excellent', comfort: 'fair' },
    'natural-stone': { durability: 'excellent', maintenance: 'high', water: 'good', comfort: 'fair' },
    'concrete': { durability: 'excellent', maintenance: 'medium', water: 'excellent', comfort: 'poor' }
  };
  return characteristics[material] || characteristics['lvp'];
}

function getFlooringMaintenance(material) {
  const maintenance = {
    'hardwood': 'medium',
    'engineered-hardwood': 'medium',
    'lvp': 'low',
    'tile': 'low',
    'natural-stone': 'high',
    'concrete': 'medium'
  };
  return maintenance[material] || 'medium';
}

function getFlooringDurability(material) {
  const durability = {
    'hardwood': 'good',
    'engineered-hardwood': 'good',
    'lvp': 'excellent',
    'tile': 'excellent',
    'natural-stone': 'excellent',
    'concrete': 'excellent'
  };
  return durability[material] || 'good';
}

function getPatternVisualEffect(pattern) {
  const effects = {
    'plank': { en: 'Classic, elongates the space', fr: 'Classique, allonge l\'espace' },
    'herringbone': { en: 'Adds visual interest and elegance', fr: 'Ajoute de l\'intérêt visuel et de l\'élégance' },
    'diagonal': { en: 'Makes space appear larger', fr: 'Fait paraître l\'espace plus grand' },
    'minimal-grout': { en: 'Clean, seamless appearance', fr: 'Apparence propre et sans couture' }
  };
  return effects[pattern] || effects['plank'];
}

function getPersonaSpecificFeatures(persona) {
  const features = {
    'serious-chef': [
      { name: 'pot-filler', description: { en: 'Pot filler faucet at range', fr: 'Robinet remplisseur à la cuisinière' } },
      { name: 'prep-sink', description: { en: 'Secondary prep sink', fr: 'Évier de préparation secondaire' } },
      { name: 'knife-storage', description: { en: 'Professional knife storage', fr: 'Rangement professionnel de couteaux' } }
    ],
    'entertainer': [
      { name: 'beverage-center', description: { en: 'Dedicated beverage station', fr: 'Station boissons dédiée' } },
      { name: 'ice-maker', description: { en: 'Built-in ice maker', fr: 'Machine à glace intégrée' } },
      { name: 'warming-drawer', description: { en: 'Warming drawer for serving', fr: 'Tiroir chauffant pour le service' } }
    ],
    'eco-conscious': [
      { name: 'compost', description: { en: 'Built-in compost bin', fr: 'Bac à compost intégré' } },
      { name: 'water-filter', description: { en: 'Whole-home water filtration', fr: 'Filtration d\'eau pour toute la maison' } },
      { name: 'recycling-center', description: { en: 'Multi-stream recycling', fr: 'Recyclage multi-flux' } }
    ],
    'default': []
  };
  return features[persona] || features.default;
}

module.exports = {
  generateAllRecommendations,
  generateExecutiveSummary,
  generateDesignConcept,
  generateLayoutRecommendations,
  generateCabinetRecommendations,
  generateCountertopRecommendations,
  generateApplianceRecommendations,
  generateStorageRecommendations,
  generateLightingRecommendations,
  generateFlooringRecommendations,
  generateFeatureRecommendations,
  generateBacksplashRecommendations,
  generateColorPalette,
  collectAndPrioritizeWarnings,
  generateActionPlan,
  generateBudgetBreakdown,
  generateAlternativePackages,
  calculateConfidenceScores,
  analyzeRecommendationCoherence,
  RECOMMENDATION_CATEGORIES,
  PRIORITY_LEVELS,
  STYLE_DESIGN_GUIDES,
  COOKING_APPLIANCE_GUIDES,
  STORAGE_SOLUTIONS,
  SMART_FEATURES
};
