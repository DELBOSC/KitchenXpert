/**
 * Future Needs Section Scoring Module
 *
 * Comprehensive future planning analysis with:
 * - Long-term timeline and planning horizon assessment
 * - Life stage transition planning
 * - Aging-in-place and universal design considerations
 * - Family evolution and household changes
 * - Technology readiness and future-proofing
 * - Adaptability and flexibility requirements
 * - Resale value vs personal customization balance
 */

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/**
 * Score weights for future needs factors (normalized to 1.0)
 */
const SCORE_WEIGHTS = {
  timeInHome: 0.30,
  familyChanges: 0.20,
  agingInPlace: 0.20,
  cookingEvolution: 0.15,
  futureTech: 0.15
};

/**
 * Time in home configurations
 */
const TIME_IN_HOME_CONFIGURATIONS = {
  '1-3-years': {
    score: 30,
    horizon: 'short-term',
    years: { min: 1, max: 3 },
    description: {
      en: 'Planning to stay 1-3 years',
      fr: 'Prévoit de rester 1-3 ans'
    },
    characteristics: {
      investmentStrategy: 'roi-focused',
      customizationLevel: 'minimal',
      qualityTier: 'cost-effective',
      designApproach: 'mass-appeal'
    },
    recommendations: {
      focus: ['resale-value', 'neutral-choices', 'popular-features', 'cost-effective-updates'],
      avoid: ['personal-customization', 'trendy-choices', 'expensive-upgrades', 'niche-features'],
      priorities: ['roi', 'quick-payback', 'buyer-appeal']
    },
    tags: ['short-term', 'roi-focused', 'resale-priority', 'neutral-design']
  },
  '3-5-years': {
    score: 50,
    horizon: 'medium-short',
    years: { min: 3, max: 5 },
    description: {
      en: 'Planning to stay 3-5 years',
      fr: 'Prévoit de rester 3-5 ans'
    },
    characteristics: {
      investmentStrategy: 'balanced',
      customizationLevel: 'limited',
      qualityTier: 'good-value',
      designApproach: 'broad-appeal'
    },
    recommendations: {
      focus: ['quality-basics', 'versatile-design', 'durable-materials'],
      consider: ['some-personal-touches', 'practical-upgrades'],
      priorities: ['balance', 'enjoyment-and-value']
    },
    tags: ['medium-short', 'balanced-approach', 'versatile-design']
  },
  '5-10-years': {
    score: 70,
    horizon: 'medium-long',
    years: { min: 5, max: 10 },
    description: {
      en: 'Planning to stay 5-10 years',
      fr: 'Prévoit de rester 5-10 ans'
    },
    characteristics: {
      investmentStrategy: 'quality-focused',
      customizationLevel: 'moderate',
      qualityTier: 'premium',
      designApproach: 'personal-with-appeal'
    },
    recommendations: {
      focus: ['quality-investment', 'personal-style', 'durable-choices', 'timeless-design'],
      consider: ['meaningful-upgrades', 'lifestyle-fit'],
      priorities: ['longevity', 'personal-enjoyment', 'quality']
    },
    tags: ['longer-term', 'quality-investment', 'personal-style-ok']
  },
  '10-plus': {
    score: 100,
    horizon: 'long-term',
    years: { min: 10, max: 50 },
    description: {
      en: 'Forever home (10+ years)',
      fr: 'Maison pour toujours (10+ ans)'
    },
    characteristics: {
      investmentStrategy: 'lifetime-value',
      customizationLevel: 'extensive',
      qualityTier: 'premium-luxury',
      designApproach: 'fully-personalized'
    },
    recommendations: {
      focus: ['timeless-design', 'premium-quality', 'personal-dream-kitchen', 'future-adaptability'],
      consider: ['aging-in-place', 'life-stage-changes', 'custom-features'],
      priorities: ['longevity', 'personal-satisfaction', 'adaptability']
    },
    tags: ['forever-home', 'long-term', 'premium-quality', 'full-customization', 'timeless-design']
  }
};

/**
 * Family changes configurations
 */
const FAMILY_CHANGES_CONFIGURATIONS = {
  'none': {
    score: 30,
    stability: 'stable',
    description: {
      en: 'No anticipated family changes',
      fr: 'Aucun changement familial prévu'
    },
    designImpact: 'minimal',
    adaptabilityNeeds: 'low',
    recommendations: {
      focus: ['current-needs', 'static-design-ok'],
      avoid: ['over-planning-flexibility']
    },
    tags: ['stable-household', 'current-focus']
  },
  'children': {
    score: 75,
    stability: 'growing',
    description: {
      en: 'Planning to have children or more children',
      fr: 'Prévoit d\'avoir des enfants ou plus d\'enfants'
    },
    designImpact: 'significant',
    adaptabilityNeeds: 'high',
    requirements: {
      safety: ['rounded-corners', 'safety-locks', 'cool-touch-surfaces', 'soft-close-drawers'],
      durability: ['stain-resistant', 'scratch-resistant', 'easy-clean'],
      storage: ['low-access-storage', 'snack-zone', 'sippy-cup-storage'],
      layout: ['supervision-sightlines', 'play-area-adjacency']
    },
    recommendations: {
      focus: ['child-safety', 'durability', 'easy-cleanup', 'flexible-storage'],
      features: ['kid-height-accessible', 'homework-zone', 'family-friendly']
    },
    tags: ['family-growth', 'child-safety', 'durability-critical', 'family-focused']
  },
  'kids-leaving': {
    score: 60,
    stability: 'contracting',
    description: {
      en: 'Children leaving home (empty nest)',
      fr: 'Enfants quittant la maison (nid vide)'
    },
    designImpact: 'moderate',
    adaptabilityNeeds: 'moderate',
    requirements: {
      transition: ['repurpose-space', 'downsize-storage', 'upgrade-finishes'],
      focus: ['adult-entertaining', 'couple-cooking', 'quality-over-quantity']
    },
    recommendations: {
      focus: ['sophistication', 'entertaining', 'quality-upgrades', 'personal-style'],
      consider: ['smaller-scale-ok', 'wine-storage', 'coffee-bar', 'baker-features']
    },
    tags: ['empty-nest', 'lifestyle-shift', 'sophistication', 'downsizing-potential']
  },
  'aging-parents': {
    score: 85,
    stability: 'expanding-multi-gen',
    description: {
      en: 'Aging parents may move in',
      fr: 'Parents âgés pourraient emménager'
    },
    designImpact: 'significant',
    adaptabilityNeeds: 'very-high',
    requirements: {
      accessibility: ['universal-design', 'wider-aisles', 'pull-out-storage', 'varied-counter-heights'],
      safety: ['non-slip-flooring', 'lever-handles', 'good-lighting', 'clear-pathways'],
      functionality: ['easy-reach-storage', 'seated-work-area', 'minimal-bending']
    },
    recommendations: {
      focus: ['universal-design', 'accessibility', 'multi-generational-needs', 'safety'],
      features: ['aging-in-place-ready', 'flexible-design']
    },
    tags: ['multi-generational', 'accessibility-focus', 'universal-design', 'aging-in-place']
  },
  'work-from-home': {
    score: 65,
    stability: 'lifestyle-change',
    description: {
      en: 'Permanent work-from-home arrangement',
      fr: 'Arrangement permanent de travail à domicile'
    },
    designImpact: 'moderate',
    adaptabilityNeeds: 'moderate',
    requirements: {
      workspace: ['desk-area', 'charging-stations', 'organized-storage'],
      functionality: ['coffee-station', 'snack-storage', 'lunch-prep-area'],
      technology: ['good-wifi', 'adequate-outlets', 'task-lighting']
    },
    recommendations: {
      focus: ['work-life-integration', 'coffee-station', 'technology-ready', 'organized-storage'],
      features: ['breakfast-bar-desk', 'charging-drawer', 'organized-pantry']
    },
    tags: ['work-from-home', 'home-office-integration', 'technology-needs']
  }
};

/**
 * Aging in place configurations
 */
const AGING_IN_PLACE_CONFIGURATIONS = {
  'yes-plan-now': {
    score: 100,
    priority: 'immediate',
    level: 'full-implementation',
    description: {
      en: 'Yes, plan for aging in place now',
      fr: 'Oui, planifier le vieillissement sur place maintenant'
    },
    designRequirements: {
      essential: [
        { feature: 'wider-aisles', spec: '48-60 inches minimum', impact: 'wheelchair-turning' },
        { feature: 'varied-counter-heights', spec: '28-42 inches range', impact: 'seated-standing-work' },
        { feature: 'pull-out-storage', spec: 'full-extension-drawers', impact: 'no-bending' },
        { feature: 'lever-handles', spec: 'all-cabinets-doors', impact: 'easy-grip' },
        { feature: 'knee-clearance', spec: 'sink-cooktop', impact: 'seated-use' },
        { feature: 'task-lighting', spec: 'under-cabinet-pendant', impact: 'vision-support' }
      ],
      recommended: [
        { feature: 'roll-out-shelves', impact: 'accessibility' },
        { feature: 'lazy-susans', impact: 'corner-access' },
        { feature: 'wall-ovens', spec: 'counter-height', impact: 'no-bending' },
        { feature: 'side-by-side-fridge', impact: 'full-access' },
        { feature: 'induction-cooktop', impact: 'safety' },
        { feature: 'touchless-faucet', impact: 'ease-of-use' }
      ],
      future: [
        { feature: 'reinforced-walls', spec: 'grab-bar-blocking', impact: 'future-support' },
        { feature: 'accessible-layout', spec: 'open-floor-plan', impact: 'walker-wheelchair' }
      ]
    },
    recommendations: {
      layout: ['open-floor-plan', 'wide-aisles', 'single-level-access'],
      storage: ['pull-out-shelves', 'drawer-systems', 'lazy-susans', 'easy-reach'],
      appliances: ['wall-ovens', 'raised-dishwasher', 'side-by-side-fridge'],
      safety: ['non-slip-flooring', 'good-lighting', 'lever-handles', 'rounded-corners']
    },
    tags: ['aging-in-place', 'universal-design', 'accessibility-priority', 'full-implementation']
  },
  'prepare-later': {
    score: 70,
    priority: 'future-ready',
    level: 'infrastructure-prep',
    description: {
      en: 'Not now, but prepare for future adaptation',
      fr: 'Pas maintenant, mais préparer pour future adaptation'
    },
    designRequirements: {
      essential: [
        { feature: 'reinforced-walls', spec: 'blocking-for-grab-bars', impact: 'future-installation' },
        { feature: 'accessible-layout', spec: 'work-triangle-open', impact: 'future-mobility-aids' },
        { feature: 'adequate-space', spec: '42-48-inch-aisles', impact: 'expandable-to-60' }
      ],
      recommended: [
        { feature: 'drawer-base-cabinets', impact: 'easier-than-doors' },
        { feature: 'good-lighting-infrastructure', impact: 'future-needs' },
        { feature: 'lever-handles', impact: 'easier-for-all-ages' }
      ]
    },
    recommendations: {
      layout: ['thoughtful-spacing', 'future-adaptable'],
      infrastructure: ['reinforced-walls', 'extra-electrical', 'accessible-routing'],
      choices: ['adaptable-design', 'avoid-obstacles']
    },
    tags: ['future-adaptable', 'infrastructure-ready', 'thoughtful-planning']
  },
  'not-needed': {
    score: 30,
    priority: 'not-applicable',
    level: 'standard-design',
    description: {
      en: 'Not planning for aging in place',
      fr: 'Ne planifie pas le vieillissement sur place'
    },
    designRequirements: {
      essential: [],
      recommended: []
    },
    recommendations: {
      focus: ['current-needs', 'standard-design'],
      note: ['universal-design-benefits-all-ages']
    },
    tags: ['standard-design', 'current-focus']
  }
};

/**
 * Cooking evolution configurations
 */
const COOKING_EVOLUTION_CONFIGURATIONS = {
  'more-cooking': {
    score: 80,
    direction: 'increasing',
    trend: 'upward',
    description: {
      en: 'Expect to cook more in the future',
      fr: 'S\'attend à cuisiner plus à l\'avenir'
    },
    designImpact: 'plan-for-growth',
    requirements: {
      storage: ['expandable', 'generous', 'specialty-zones'],
      workspace: ['larger-prep-areas', 'multiple-zones'],
      appliances: ['upgrade-path', 'professional-consideration', 'specialty-tools'],
      infrastructure: ['extra-outlets', 'gas-line-consideration', 'ventilation-upgrade']
    },
    recommendations: {
      focus: ['generous-sizing', 'upgrade-capability', 'specialty-storage', 'flexible-zones'],
      appliances: ['consider-professional-grade', 'plan-for-additions'],
      infrastructure: ['adequate-electrical', 'strong-ventilation']
    },
    tags: ['cooking-growth', 'plan-generous', 'upgrade-path', 'serious-cooking-future']
  },
  'less-cooking': {
    score: 40,
    direction: 'decreasing',
    trend: 'downward',
    description: {
      en: 'Expect to cook less in the future',
      fr: 'S\'attend à cuisiner moins à l\'avenir'
    },
    designImpact: 'efficiency-focus',
    requirements: {
      storage: ['adequate-but-not-excessive', 'organized'],
      workspace: ['efficient-compact-ok'],
      appliances: ['quality-basics', 'smaller-options-ok'],
      focus: ['convenience', 'easy-cleanup', 'low-maintenance']
    },
    recommendations: {
      focus: ['efficiency', 'easy-maintenance', 'quality-over-quantity'],
      avoid: ['oversizing', 'excessive-specialty-items'],
      consider: ['smaller-appliances', 'simplified-layout']
    },
    tags: ['cooking-reduction', 'efficiency-focus', 'simplified-needs']
  },
  'same': {
    score: 50,
    direction: 'stable',
    trend: 'consistent',
    description: {
      en: 'Cooking habits will stay the same',
      fr: 'Habitudes culinaires resteront les mêmes'
    },
    designImpact: 'current-needs-focused',
    requirements: {
      storage: ['match-current-needs'],
      workspace: ['current-workflow-optimized'],
      appliances: ['current-preferences']
    },
    recommendations: {
      focus: ['optimize-current-use', 'quality-for-known-needs'],
      avoid: ['over-planning-for-change']
    },
    tags: ['stable-cooking', 'current-optimization']
  },
  'unsure': {
    score: 60,
    direction: 'variable',
    trend: 'uncertain',
    description: {
      en: 'Unsure about future cooking habits',
      fr: 'Incertain des futures habitudes culinaires'
    },
    designImpact: 'flexibility-required',
    requirements: {
      storage: ['flexible', 'adaptable'],
      workspace: ['versatile-zones'],
      appliances: ['quality-basics-with-expansion-capability'],
      design: ['flexible', 'adaptable-layout']
    },
    recommendations: {
      focus: ['flexibility', 'adaptable-storage', 'versatile-design', 'quality-infrastructure'],
      features: ['adjustable-shelving', 'multi-purpose-zones', 'expansion-ready']
    },
    tags: ['flexible-design', 'adaptability-priority', 'versatile-planning']
  }
};

/**
 * Future technology configurations
 */
const FUTURE_TECHNOLOGY_CONFIGURATIONS = {
  'yes-important': {
    score: 100,
    priority: 'high',
    level: 'future-proofed',
    description: {
      en: 'Future technology integration is important',
      fr: 'L\'intégration future de la technologie est importante'
    },
    requirements: {
      electrical: [
        { item: 'extra-outlets', spec: '20-amp-circuits', quantity: 'abundant' },
        { item: 'usb-outlets', spec: 'built-in', locations: ['island', 'backsplash', 'pantry'] },
        { item: 'dedicated-circuits', spec: 'smart-appliances', quantity: 'multiple' }
      ],
      infrastructure: [
        { item: 'conduit-runs', spec: 'future-wiring', locations: ['walls', 'island'] },
        { item: 'network-drops', spec: 'ethernet-capable', locations: ['appliance-zones'] },
        { item: 'smart-home-hub', spec: 'central-location', note: 'integration-ready' }
      ],
      planning: [
        { item: 'panel-capacity', spec: 'future-expansion' },
        { item: 'voice-control-ready', spec: 'smart-assistants' },
        { item: 'app-controlled-appliances', spec: 'wifi-capable' }
      ]
    },
    recommendations: {
      electrical: ['extra-circuits', 'usb-outlets-everywhere', 'smart-switches', 'dedicated-appliance-circuits'],
      infrastructure: ['conduit-for-future', 'network-ready', 'adequate-panel-capacity'],
      appliances: ['smart-capable', 'wifi-enabled', 'app-controlled'],
      features: ['voice-control-prep', 'charging-stations', 'tech-integration-zones']
    },
    tags: ['tech-forward', 'future-proofed', 'smart-home-ready', 'extensive-infrastructure']
  },
  'some-prep': {
    score: 70,
    priority: 'moderate',
    level: 'basic-infrastructure',
    description: {
      en: 'Some technology preparation desired',
      fr: 'Une certaine préparation technologique souhaitée'
    },
    requirements: {
      electrical: [
        { item: 'adequate-outlets', spec: 'code-plus-50%', quantity: 'generous' },
        { item: 'usb-outlets', spec: '2-4-locations', locations: ['key-areas'] }
      ],
      infrastructure: [
        { item: 'basic-conduit', spec: 'island-backsplash', note: 'future-flexibility' }
      ]
    },
    recommendations: {
      electrical: ['extra-outlets-key-areas', 'some-usb-outlets', 'adequate-circuits'],
      infrastructure: ['some-conduit-runs', 'future-expansion-possible'],
      appliances: ['consider-smart-options']
    },
    tags: ['tech-ready', 'basic-prep', 'flexible-infrastructure']
  },
  'not-concerned': {
    score: 30,
    priority: 'low',
    level: 'code-minimum',
    description: {
      en: 'Not concerned about future technology',
      fr: 'Pas préoccupé par la future technologie'
    },
    requirements: {
      electrical: [
        { item: 'code-compliant-outlets', spec: 'minimum-required' }
      ]
    },
    recommendations: {
      focus: ['code-compliance', 'basic-functionality'],
      note: ['some-extra-outlets-still-helpful']
    },
    tags: ['standard-electrical', 'basic-tech']
  }
};

/**
 * Planning horizon personas
 */
const PLANNING_HORIZON_PERSONAS = {
  'short-term-flipper': {
    description: {
      en: 'Short-term resident focused on ROI',
      fr: 'Résident à court terme axé sur le ROI'
    },
    characteristics: ['roi-focused', 'neutral-choices', 'broad-appeal', 'cost-effective'],
    priorities: ['resale-value', 'quick-payback', 'popular-features', 'neutral-design'],
    recommendations: {
      colors: ['white', 'gray', 'greige', 'neutral-palette'],
      materials: ['quartz', 'granite', 'popular-choices'],
      features: ['standard-desirable', 'mass-appeal'],
      avoid: ['personal-customization', 'trendy', 'niche-features']
    }
  },
  'medium-term-balancer': {
    description: {
      en: 'Balancing personal enjoyment with future value',
      fr: 'Équilibrer plaisir personnel et valeur future'
    },
    characteristics: ['balanced-approach', 'versatile', 'quality-focused'],
    priorities: ['enjoyment-and-value', 'quality-materials', 'timeless-style'],
    recommendations: {
      focus: ['quality-basics', 'some-personal-touches', 'timeless-design'],
      balance: ['personal-vs-resale', 'quality-vs-cost']
    }
  },
  'long-term-personalizer': {
    description: {
      en: 'Long-term resident prioritizing personal dream kitchen',
      fr: 'Résident à long terme priorisant cuisine de rêve personnelle'
    },
    characteristics: ['personal-satisfaction', 'quality-investment', 'custom-features'],
    priorities: ['personal-style', 'premium-quality', 'longevity', 'adaptability'],
    recommendations: {
      focus: ['dream-kitchen', 'premium-materials', 'custom-features', 'timeless-quality'],
      consider: ['aging-in-place', 'life-changes', 'adaptability']
    }
  },
  'adaptability-focused': {
    description: {
      en: 'Focused on flexibility for life changes',
      fr: 'Axé sur la flexibilité pour les changements de vie'
    },
    characteristics: ['flexible-design', 'adaptable', 'future-ready', 'versatile'],
    priorities: ['adaptability', 'flexibility', 'universal-design', 'multi-functional'],
    recommendations: {
      focus: ['flexible-storage', 'adaptable-layout', 'universal-design', 'multi-purpose-zones'],
      features: ['adjustable-elements', 'future-ready-infrastructure']
    }
  }
};

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Calculate comprehensive future needs section score
 * @param {Object} answers - User answers for future needs questions
 * @returns {Object} Detailed future planning scores and recommendations
 */
function calculateSectionScore(answers) {
  const scores = {
    overall: 0,
    planningHorizon: 'medium-term',
    planningPersona: 'medium-term-balancer',
    categories: {},
    recommendations: [],
    tags: new Set(),
    designConsiderations: [],
    adaptabilityRequirements: {},
    technologyNeeds: {}
  };

  // Calculate individual component scores
  const componentScores = {
    timeInHome: scoreTimeInHome(answers['time-in-home']),
    familyChanges: scoreFamilyChanges(answers['family-changes']),
    agingInPlace: scoreAgingInPlace(answers['aging-in-place']),
    cookingEvolution: scoreCookingEvolution(answers['cooking-evolution']),
    futureTech: scoreFutureTech(answers['future-tech'])
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

      if (componentScores[key]?.considerations) {
        scores.designConsiderations.push(...componentScores[key].considerations);
      }
    }
  }

  if (totalWeight > 0) {
    scores.overall = Math.round((scores.overall / totalWeight) * 100) / 100;
  }

  // Determine planning horizon and persona
  scores.planningHorizon = determinePlanningHorizon(answers);
  scores.planningPersona = identifyPlanningPersona(answers, componentScores, scores.planningHorizon);

  // Calculate category scores
  scores.categories = {
    timeline: {
      score: componentScores.timeInHome?.score || 50,
      horizon: scores.planningHorizon,
      years: componentScores.timeInHome?.years || { min: 5, max: 10 }
    },
    adaptability: calculateAdaptabilityScore(answers, componentScores),
    accessibility: calculateAccessibilityScore(answers, componentScores),
    flexibility: calculateFlexibilityScore(answers, componentScores),
    technologyReadiness: calculateTechnologyReadiness(answers, componentScores)
  };

  // Calculate adaptability requirements
  scores.adaptabilityRequirements = calculateAdaptabilityRequirements(answers, componentScores);

  // Calculate technology needs
  scores.technologyNeeds = calculateTechnologyNeeds(answers, componentScores);

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
 * Score time in home
 */
function scoreTimeInHome(value) {
  if (!value) return null;

  const config = TIME_IN_HOME_CONFIGURATIONS[value];
  if (!config) {
    return { score: 50, horizon: 'medium-term', years: { min: 5, max: 10 }, tags: [] };
  }

  return {
    score: config.score,
    horizon: config.horizon,
    years: config.years,
    description: config.description,
    characteristics: config.characteristics,
    recommendations: config.recommendations,
    tags: config.tags,
    considerations: []
  };
}

/**
 * Score family changes
 */
function scoreFamilyChanges(values) {
  if (!values || !Array.isArray(values)) {
    return { score: 50, changes: [], tags: [], considerations: [] };
  }

  if (values.includes('none')) {
    const config = FAMILY_CHANGES_CONFIGURATIONS['none'];
    return {
      score: config.score,
      changes: [],
      stability: config.stability,
      tags: config.tags,
      considerations: []
    };
  }

  const tags = [];
  const considerations = [];
  const allRequirements = [];
  let totalScore = 0;
  let count = 0;

  values.forEach(v => {
    const config = FAMILY_CHANGES_CONFIGURATIONS[v];
    if (config) {
      totalScore += config.score;
      count++;
      tags.push(...config.tags);
      if (config.requirements) {
        allRequirements.push(config.requirements);
        // Extract considerations from requirements
        Object.keys(config.requirements).forEach(key => {
          if (Array.isArray(config.requirements[key])) {
            considerations.push(...config.requirements[key]);
          }
        });
      }
    }
  });

  const avgScore = count > 0 ? totalScore / count : 50;

  return {
    score: avgScore,
    changes: values,
    changeCount: count,
    requirements: allRequirements,
    tags,
    considerations
  };
}

/**
 * Score aging in place
 */
function scoreAgingInPlace(value) {
  if (!value) return null;

  const config = AGING_IN_PLACE_CONFIGURATIONS[value];
  if (!config) {
    return { score: 50, level: 'standard', tags: [], considerations: [] };
  }

  const considerations = [];
  if (config.designRequirements?.essential) {
    config.designRequirements.essential.forEach(req => {
      considerations.push(req.feature);
    });
  }

  return {
    score: config.score,
    priority: config.priority,
    level: config.level,
    description: config.description,
    designRequirements: config.designRequirements,
    recommendations: config.recommendations,
    tags: config.tags,
    considerations
  };
}

/**
 * Score cooking evolution
 */
function scoreCookingEvolution(value) {
  if (!value) return null;

  const config = COOKING_EVOLUTION_CONFIGURATIONS[value];
  if (!config) {
    return { score: 50, direction: 'stable', tags: [], considerations: [] };
  }

  const considerations = [];
  if (config.requirements) {
    Object.keys(config.requirements).forEach(key => {
      if (Array.isArray(config.requirements[key])) {
        considerations.push(...config.requirements[key]);
      }
    });
  }

  return {
    score: config.score,
    direction: config.direction,
    trend: config.trend,
    description: config.description,
    designImpact: config.designImpact,
    requirements: config.requirements,
    recommendations: config.recommendations,
    tags: config.tags,
    considerations
  };
}

/**
 * Score future technology
 */
function scoreFutureTech(value) {
  if (!value) return null;

  const config = FUTURE_TECHNOLOGY_CONFIGURATIONS[value];
  if (!config) {
    return { score: 50, priority: 'moderate', tags: [], considerations: [] };
  }

  const considerations = [];
  if (config.requirements) {
    Object.keys(config.requirements).forEach(category => {
      if (Array.isArray(config.requirements[category])) {
        config.requirements[category].forEach(req => {
          considerations.push(req.item || req);
        });
      }
    });
  }

  return {
    score: config.score,
    priority: config.priority,
    level: config.level,
    description: config.description,
    requirements: config.requirements,
    recommendations: config.recommendations,
    tags: config.tags,
    considerations
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determine planning horizon
 */
function determinePlanningHorizon(answers) {
  const timeInHome = answers['time-in-home'];

  if (timeInHome === '10-plus') return 'long-term';
  if (timeInHome === '5-10-years') return 'medium-long';
  if (timeInHome === '3-5-years') return 'medium-short';
  return 'short-term';
}

/**
 * Identify planning persona
 */
function identifyPlanningPersona(answers, componentScores, horizon) {
  const familyChanges = answers['family-changes'] || [];
  const agingInPlace = answers['aging-in-place'];
  const cookingEvolution = answers['cooking-evolution'];

  // Adaptability-focused persona
  const hasMultipleChanges = familyChanges.length >= 2 && !familyChanges.includes('none');
  const hasAgingPlans = agingInPlace === 'yes-plan-now' || agingInPlace === 'prepare-later';
  const hasCookingUncertainty = cookingEvolution === 'unsure';

  if (hasMultipleChanges || (hasAgingPlans && (hasMultipleChanges || hasCookingUncertainty))) {
    return 'adaptability-focused';
  }

  // Horizon-based personas
  if (horizon === 'long-term') {
    return 'long-term-personalizer';
  }

  if (horizon === 'short-term') {
    return 'short-term-flipper';
  }

  return 'medium-term-balancer';
}

/**
 * Calculate adaptability score
 */
function calculateAdaptabilityScore(answers, componentScores) {
  let score = 50;
  const factors = [];

  // Aging in place impact
  if (answers['aging-in-place'] === 'yes-plan-now') {
    score += 30;
    factors.push({ factor: 'aging-in-place', impact: 30, level: 'immediate' });
  } else if (answers['aging-in-place'] === 'prepare-later') {
    score += 15;
    factors.push({ factor: 'aging-in-place', impact: 15, level: 'future-ready' });
  }

  // Future technology impact
  if (answers['future-tech'] === 'yes-important') {
    score += 20;
    factors.push({ factor: 'technology', impact: 20, level: 'future-proofed' });
  }

  // Family changes impact
  const changes = answers['family-changes'] || [];
  if (changes.length > 0 && !changes.includes('none')) {
    const impact = changes.length * 7;
    score += impact;
    factors.push({ factor: 'family-changes', impact, count: changes.length });
  }

  // Cooking evolution impact
  if (answers['cooking-evolution'] === 'unsure') {
    score += 10;
    factors.push({ factor: 'cooking-uncertainty', impact: 10, reason: 'flexibility-needed' });
  }

  score = Math.min(100, score);

  return {
    score,
    level: score >= 80 ? 'highly-adaptable' : score >= 60 ? 'moderately-adaptable' : score >= 40 ? 'some-adaptability' : 'standard',
    factors,
    priority: score >= 70 ? 'high' : score >= 50 ? 'moderate' : 'low'
  };
}

/**
 * Calculate accessibility score
 */
function calculateAccessibilityScore(answers, componentScores) {
  const aging = answers['aging-in-place'];
  const familyChanges = answers['family-changes'] || [];

  let score = 30;
  const features = [];
  const requirements = [];

  if (aging === 'yes-plan-now') {
    score = 100;
    features.push('full-universal-design', 'wheelchair-accessible', 'varied-heights');
    requirements.push(...(AGING_IN_PLACE_CONFIGURATIONS['yes-plan-now'].designRequirements.essential || []));
  } else if (aging === 'prepare-later') {
    score = 70;
    features.push('infrastructure-ready', 'adaptable-layout');
    requirements.push(...(AGING_IN_PLACE_CONFIGURATIONS['prepare-later'].designRequirements.essential || []));
  }

  // Multi-generational bonus
  if (familyChanges.includes('aging-parents')) {
    score = Math.max(score, 85);
    if (!features.includes('full-universal-design')) {
      features.push('multi-generational-design');
    }
  }

  return {
    score,
    level: score >= 85 ? 'full-accessibility' : score >= 60 ? 'prepared' : 'standard',
    features,
    requirements,
    priority: score >= 85 ? 'essential' : score >= 60 ? 'recommended' : 'optional'
  };
}

/**
 * Calculate flexibility score
 */
function calculateFlexibilityScore(answers, componentScores) {
  let score = 50;
  const factors = [];

  // Cooking evolution uncertainty
  if (answers['cooking-evolution'] === 'unsure') {
    score += 15;
    factors.push({ factor: 'cooking-uncertainty', impact: 15 });
  }

  // Technology openness
  if (answers['future-tech'] !== 'not-concerned') {
    score += 15;
    factors.push({ factor: 'technology-openness', impact: 15 });
  }

  // Multiple family changes
  const changes = answers['family-changes'] || [];
  if (changes.length > 1 && !changes.includes('none')) {
    score += 10;
    factors.push({ factor: 'multiple-changes', impact: 10, count: changes.length });
  }

  // Medium-long timeline
  const timeInHome = answers['time-in-home'];
  if (timeInHome === '5-10-years' || timeInHome === '10-plus') {
    score += 10;
    factors.push({ factor: 'long-timeline', impact: 10 });
  }

  return {
    score: Math.min(100, score),
    needsFlexibility: score >= 70,
    level: score >= 75 ? 'high-flexibility' : score >= 50 ? 'moderate-flexibility' : 'standard',
    factors
  };
}

/**
 * Calculate technology readiness
 */
function calculateTechnologyReadiness(answers, componentScores) {
  const techConfig = componentScores.futureTech;

  if (!techConfig) {
    return { score: 50, level: 'basic', infrastructure: [] };
  }

  const infrastructure = [];
  if (techConfig.requirements) {
    Object.keys(techConfig.requirements).forEach(category => {
      if (Array.isArray(techConfig.requirements[category])) {
        infrastructure.push(...techConfig.requirements[category]);
      }
    });
  }

  return {
    score: techConfig.score,
    level: techConfig.level,
    priority: techConfig.priority,
    infrastructure,
    recommendations: techConfig.recommendations
  };
}

/**
 * Calculate adaptability requirements
 */
function calculateAdaptabilityRequirements(answers, componentScores) {
  const requirements = {
    essential: [],
    recommended: [],
    future: []
  };

  // Aging in place requirements
  if (componentScores.agingInPlace?.designRequirements) {
    const agingReqs = componentScores.agingInPlace.designRequirements;
    if (agingReqs.essential) requirements.essential.push(...agingReqs.essential);
    if (agingReqs.recommended) requirements.recommended.push(...agingReqs.recommended);
    if (agingReqs.future) requirements.future.push(...agingReqs.future);
  }

  // Family change requirements
  if (componentScores.familyChanges?.requirements) {
    componentScores.familyChanges.requirements.forEach(reqSet => {
      Object.keys(reqSet).forEach(category => {
        if (Array.isArray(reqSet[category])) {
          reqSet[category].forEach(item => {
            requirements.recommended.push({ feature: item, category });
          });
        }
      });
    });
  }

  // Cooking evolution requirements
  if (componentScores.cookingEvolution?.requirements) {
    Object.keys(componentScores.cookingEvolution.requirements).forEach(category => {
      const items = componentScores.cookingEvolution.requirements[category];
      if (Array.isArray(items)) {
        items.forEach(item => {
          requirements.recommended.push({ feature: item, category });
        });
      }
    });
  }

  return requirements;
}

/**
 * Calculate technology needs
 */
function calculateTechnologyNeeds(answers, componentScores) {
  const needs = {
    electrical: [],
    infrastructure: [],
    appliances: [],
    priority: componentScores.futureTech?.priority || 'moderate'
  };

  if (componentScores.futureTech?.requirements) {
    const reqs = componentScores.futureTech.requirements;
    if (reqs.electrical) needs.electrical = reqs.electrical;
    if (reqs.infrastructure) needs.infrastructure = reqs.infrastructure;
    if (reqs.planning) needs.infrastructure.push(...reqs.planning);
  }

  if (componentScores.futureTech?.recommendations?.appliances) {
    needs.appliances = componentScores.futureTech.recommendations.appliances;
  }

  return needs;
}

/**
 * Generate comprehensive recommendations
 */
function generateRecommendations(answers, componentScores, scores) {
  const recommendations = [];
  const persona = PLANNING_HORIZON_PERSONAS[scores.planningPersona];

  // Planning persona recommendation
  recommendations.push({
    id: 'planning-persona',
    type: 'future-planning',
    priority: 'essential',
    title: {
      en: 'Planning Approach',
      fr: 'Approche de planification'
    },
    description: {
      en: persona?.description.en || 'Your planning approach has been identified.',
      fr: persona?.description.fr || 'Votre approche de planification a été identifiée.'
    },
    persona: scores.planningPersona,
    priorities: persona?.priorities || []
  });

  // Timeline-specific recommendations
  const timeConfig = componentScores.timeInHome;
  if (timeConfig && timeConfig.recommendations) {
    if (scores.planningHorizon === 'short-term') {
      recommendations.push({
        id: 'roi-focus',
        type: 'investment',
        priority: 'essential',
        title: {
          en: 'ROI-Focused Choices',
          fr: 'Choix axés sur le ROI'
        },
        description: {
          en: 'Focus on neutral colors, popular features, and cost-effective updates that appeal to future buyers.',
          fr: 'Concentrez-vous sur des couleurs neutres, des fonctionnalités populaires et des mises à jour rentables qui plairont aux futurs acheteurs.'
        },
        recommendations: timeConfig.recommendations
      });
    } else if (scores.planningHorizon === 'long-term') {
      recommendations.push({
        id: 'timeless-quality',
        type: 'investment',
        priority: 'essential',
        title: {
          en: 'Timeless Design & Quality',
          fr: 'Design intemporel et qualité'
        },
        description: {
          en: 'For your forever home, invest in premium quality materials and timeless design that will last decades.',
          fr: 'Pour votre maison pour toujours, investissez dans des matériaux de qualité supérieure et un design intemporel qui durera des décennies.'
        },
        recommendations: timeConfig.recommendations
      });
    }
  }

  // Aging in place recommendations
  if (answers['aging-in-place'] === 'yes-plan-now') {
    recommendations.push({
      id: 'universal-design',
      type: 'accessibility',
      priority: 'essential',
      title: {
        en: 'Universal Design Implementation',
        fr: 'Mise en œuvre du design universel'
      },
      description: {
        en: 'Implement full universal design with 48-60" aisles, varied counter heights (28-42"), pull-out storage, and lever handles throughout.',
        fr: 'Mettez en œuvre un design universel complet avec des allées de 122-152 cm, des hauteurs de comptoir variées (71-107 cm), du rangement coulissant et des poignées à levier partout.'
      },
      requirements: componentScores.agingInPlace?.designRequirements
    });
  } else if (answers['aging-in-place'] === 'prepare-later') {
    recommendations.push({
      id: 'future-adaptability',
      type: 'accessibility',
      priority: 'recommended',
      title: {
        en: 'Future Adaptability Preparation',
        fr: 'Préparation de l\'adaptabilité future'
      },
      description: {
        en: 'Install reinforced wall blocking for future grab bars, maintain 42-48" aisles (expandable to 60"), and choose adaptable design elements.',
        fr: 'Installez un renforcement mural pour de futures barres d\'appui, maintenez des allées de 107-122 cm (extensibles à 152 cm) et choisissez des éléments de design adaptables.'
      }
    });
  }

  // Family change recommendations
  const familyChanges = answers['family-changes'] || [];
  if (familyChanges.includes('children')) {
    recommendations.push({
      id: 'child-safety-durability',
      type: 'family',
      priority: 'essential',
      title: {
        en: 'Child Safety & Durability',
        fr: 'Sécurité et durabilité pour enfants'
      },
      description: {
        en: 'Design for growing family with rounded corners, safety locks, soft-close drawers, durable stain-resistant surfaces, and supervision sightlines.',
        fr: 'Concevez pour une famille grandissante avec des coins arrondis, des serrures de sécurité, des tiroirs à fermeture douce, des surfaces durables anti-taches et des lignes de vue pour la supervision.'
      }
    });
  }

  if (familyChanges.includes('aging-parents')) {
    recommendations.push({
      id: 'multi-generational',
      type: 'family',
      priority: 'essential',
      title: {
        en: 'Multi-Generational Design',
        fr: 'Design multigénérationnel'
      },
      description: {
        en: 'Implement universal design for multi-generational living with accessible storage, varied work heights, and safety features for all ages.',
        fr: 'Mettez en œuvre un design universel pour la vie multigénérationnelle avec un rangement accessible, des hauteurs de travail variées et des caractéristiques de sécurité pour tous les âges.'
      }
    });
  }

  // Technology recommendations
  if (answers['future-tech'] === 'yes-important') {
    recommendations.push({
      id: 'tech-infrastructure',
      type: 'technology',
      priority: 'essential',
      title: {
        en: 'Technology Infrastructure',
        fr: 'Infrastructure technologique'
      },
      description: {
        en: 'Install extensive electrical infrastructure: extra 20-amp circuits, USB outlets throughout, conduit runs for future wiring, and smart home integration prep.',
        fr: 'Installez une infrastructure électrique étendue: circuits supplémentaires de 20 ampères, prises USB partout, conduits pour câblage futur et préparation pour intégration domotique.'
      },
      technologyNeeds: scores.technologyNeeds
    });
  }

  // Cooking evolution recommendations
  if (answers['cooking-evolution'] === 'more-cooking') {
    recommendations.push({
      id: 'cooking-growth-planning',
      type: 'functionality',
      priority: 'recommended',
      title: {
        en: 'Plan for Cooking Growth',
        fr: 'Planifier la croissance culinaire'
      },
      description: {
        en: 'Design generously with upgrade paths: larger prep areas, professional-grade appliance capability, specialty storage zones, and robust ventilation.',
        fr: 'Concevez généreusement avec des voies de mise à niveau: zones de préparation plus grandes, capacité d\'appareils de qualité professionnelle, zones de rangement spécialisées et ventilation robuste.'
      }
    });
  } else if (answers['cooking-evolution'] === 'unsure') {
    recommendations.push({
      id: 'flexible-cooking-design',
      type: 'functionality',
      priority: 'recommended',
      title: {
        en: 'Flexible Cooking Design',
        fr: 'Design culinaire flexible'
      },
      description: {
        en: 'Create adaptable spaces with adjustable shelving, versatile zones, quality infrastructure, and expansion capability for uncertain future needs.',
        fr: 'Créez des espaces adaptables avec des étagères ajustables, des zones polyvalentes, une infrastructure de qualité et une capacité d\'expansion pour des besoins futurs incertains.'
      }
    });
  }

  // Adaptability-focused recommendation
  if (scores.categories.adaptability.score >= 70) {
    recommendations.push({
      id: 'high-adaptability',
      type: 'design-approach',
      priority: 'essential',
      title: {
        en: 'Highly Adaptable Design',
        fr: 'Design hautement adaptable'
      },
      description: {
        en: 'Your situation requires highly adaptable design: flexible storage systems, multi-purpose zones, adjustable elements, and future-ready infrastructure.',
        fr: 'Votre situation nécessite un design hautement adaptable: systèmes de rangement flexibles, zones polyvalentes, éléments ajustables et infrastructure prête pour l\'avenir.'
      },
      adaptabilityRequirements: scores.adaptabilityRequirements
    });
  }

  return recommendations;
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

module.exports = {
  calculateSectionScore,
  scoreTimeInHome,
  scoreFamilyChanges,
  scoreAgingInPlace,
  scoreCookingEvolution,
  scoreFutureTech,
  determinePlanningHorizon,
  identifyPlanningPersona,
  calculateAdaptabilityScore,
  calculateAccessibilityScore,
  calculateFlexibilityScore,
  calculateTechnologyReadiness,
  calculateAdaptabilityRequirements,
  calculateTechnologyNeeds,
  generateRecommendations,

  // Export configurations for external use
  SCORE_WEIGHTS,
  TIME_IN_HOME_CONFIGURATIONS,
  FAMILY_CHANGES_CONFIGURATIONS,
  AGING_IN_PLACE_CONFIGURATIONS,
  COOKING_EVOLUTION_CONFIGURATIONS,
  FUTURE_TECHNOLOGY_CONFIGURATIONS,
  PLANNING_HORIZON_PERSONAS
};
