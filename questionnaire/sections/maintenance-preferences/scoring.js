/**
 * Maintenance Preferences Section Scoring Module
 *
 * Calculates maintenance commitment scores, identifies maintenance personas,
 * and generates material recommendations based on user's willingness to maintain
 * and care for kitchen surfaces and appliances.
 */

const SCORE_WEIGHTS = {
  maintenanceTime: 0.3,
  cleaningFrequency: 0.2,
  materialCare: 0.2,
  durabilityPriority: 0.15,
  stainConcern: 0.15,
};

/**
 * Maintenance personas
 * Maps user maintenance preferences to distinct user profiles
 */
const MAINTENANCE_PERSONAS = {
  'high-maintenance-willing': {
    description: {
      en: 'Appreciates natural materials and willing to invest time in proper care',
      fr: 'Apprécie les matériaux naturels et prêt à investir du temps dans les soins appropriés',
    },
    characteristics: ['willing-maintenance', 'weekly-cleaning', 'natural-materials', 'patina-ok'],
    recommendedMaterials: {
      countertops: ['marble', 'butcher-block', 'natural-stone', 'granite'],
      cabinets: ['solid-wood', 'painted-wood'],
      flooring: ['hardwood', 'natural-stone'],
    },
    maintenanceLevel: 'high',
    timeCommitment: 'significant',
  },
  'low-maintenance-required': {
    description: {
      en: 'Prefers durable, easy-care materials that require minimal upkeep',
      fr: "Préfère les matériaux durables et faciles d'entretien qui nécessitent un minimum d'entretien",
    },
    characteristics: ['minimal-maintenance', 'easy-clean', 'no-special-care', 'stain-resistant'],
    recommendedMaterials: {
      countertops: ['quartz', 'solid-surface', 'laminate'],
      cabinets: ['thermofoil', 'laminate', 'acrylic'],
      flooring: ['luxury-vinyl', 'porcelain-tile', 'laminate'],
    },
    maintenanceLevel: 'low',
    timeCommitment: 'minimal',
  },
  'balanced-approach': {
    description: {
      en: 'Balances material quality with practical maintenance requirements',
      fr: "Équilibre la qualité des matériaux avec des exigences d'entretien pratiques",
    },
    characteristics: ['moderate-maintenance', 'weekly-cleaning', 'some-care-ok'],
    recommendedMaterials: {
      countertops: ['quartz', 'granite', 'engineered-stone'],
      cabinets: ['engineered-wood', 'painted-mdf', 'wood-veneer'],
      flooring: ['engineered-hardwood', 'porcelain-tile', 'lvp'],
    },
    maintenanceLevel: 'moderate',
    timeCommitment: 'reasonable',
  },
  'durability-focused': {
    description: {
      en: 'Prioritizes long-lasting materials over aesthetic appeal',
      fr: "Privilégie les matériaux durables plutôt que l'attrait esthétique",
    },
    characteristics: ['durability-first', 'stain-resistant', 'heavy-use'],
    recommendedMaterials: {
      countertops: ['quartz', 'granite', 'concrete'],
      cabinets: ['solid-wood', 'plywood-construction'],
      flooring: ['porcelain-tile', 'luxury-vinyl', 'concrete'],
    },
    maintenanceLevel: 'low-to-moderate',
    timeCommitment: 'minimal-regular',
  },
};

function calculateSectionScore(answers) {
  const scores = {
    overall: 0,
    maintenanceLevel: 'moderate',
    maintenancePersona: null,
    categories: {},
    recommendations: [],
    tags: new Set(),
    materialFilters: [],
    avoidMaterials: [],
    preferredMaterials: [],
  };

  // Identify maintenance persona
  scores.maintenancePersona = identifyMaintenancePersona(answers);

  const componentScores = {
    maintenanceTime: scoreMaintenanceTime(answers['maintenance-time']),
    cleaningFrequency: scoreCleaningFrequency(answers['cleaning-frequency']),
    materialCare: scoreMaterialCare(answers['material-care']),
    durabilityPriority: scoreDurabilityPriority(answers['durability-priority']),
    stainConcern: scoreStainConcern(answers['stain-concern']),
  };

  let totalWeight = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    if (componentScores[key] !== null) {
      scores.overall += (componentScores[key]?.score || 0) * weight;
      totalWeight += weight;

      if (componentScores[key]?.tags) {
        componentScores[key].tags.forEach((tag) => scores.tags.add(tag));
      }

      if (componentScores[key]?.materialFilters) {
        scores.materialFilters.push(...componentScores[key].materialFilters);
      }
    }
  }

  if (totalWeight > 0) {
    scores.overall = Math.round((scores.overall / totalWeight) * 100) / 100;
  }

  scores.maintenanceLevel = determineMaintenanceLevel(answers);

  // Build material recommendations
  const materialRecs = buildMaterialRecommendations(answers, scores.maintenanceLevel);
  scores.avoidMaterials = materialRecs.avoid;
  scores.preferredMaterials = materialRecs.preferred;

  scores.categories = {
    timeCommitment: {
      score: componentScores.maintenanceTime?.score || 50,
      level: componentScores.maintenanceTime?.level || 'moderate',
      hoursPerWeek: estimateMaintenanceHours(componentScores.maintenanceTime?.level),
      description: getTimeCommitmentDescription(componentScores.maintenanceTime?.level),
    },
    cleaningRoutine: {
      score: componentScores.cleaningFrequency?.score || 50,
      frequency: componentScores.cleaningFrequency?.frequency || 'weekly',
      description: getCleaningDescription(componentScores.cleaningFrequency?.frequency),
    },
    materialPreference: calculateMaterialPreference(answers),
    durabilityFocus: calculateDurabilityFocus(answers),
    careComplexity: calculateCareComplexity(answers),
    longevityExpectation: calculateLongevityExpectation(answers),
  };

  scores.recommendations = generateRecommendations(answers, componentScores, scores);
  scores.tags = Array.from(scores.tags);

  // Deduplicate material filters
  scores.materialFilters = [...new Set(scores.materialFilters)];

  return scores;
}

/**
 * Identify maintenance persona based on preferences
 */
function identifyMaintenancePersona(answers) {
  const userCharacteristics = new Set();

  // Map answers to characteristics
  if (answers['maintenance-time'] === 'willing') {
    userCharacteristics.add('willing-maintenance');
  } else if (answers['maintenance-time'] === 'minimal') {
    userCharacteristics.add('minimal-maintenance');
  } else {
    userCharacteristics.add('moderate-maintenance');
  }

  if (answers['cleaning-frequency'] === 'daily' || answers['cleaning-frequency'] === 'weekly') {
    userCharacteristics.add('weekly-cleaning');
  }

  if (answers['material-care'] === 'willing') {
    userCharacteristics.add('natural-materials');
  } else if (answers['material-care'] === 'no-special') {
    userCharacteristics.add('no-special-care');
    userCharacteristics.add('easy-clean');
  } else {
    userCharacteristics.add('some-care-ok');
  }

  if (answers['durability-priority'] === 'durability-first') {
    userCharacteristics.add('durability-first');
  }

  if (answers['stain-concern'] === 'very-concerned') {
    userCharacteristics.add('stain-resistant');
  } else if (answers['stain-concern'] === 'not-worried') {
    userCharacteristics.add('patina-ok');
  }

  // Score each persona
  const personaScores = {};
  for (const [personaKey, persona] of Object.entries(MAINTENANCE_PERSONAS)) {
    let matchScore = 0;
    let totalCharacteristics = persona.characteristics.length;

    for (const characteristic of persona.characteristics) {
      if (userCharacteristics.has(characteristic)) {
        matchScore++;
      }
    }

    personaScores[personaKey] =
      totalCharacteristics > 0 ? (matchScore / totalCharacteristics) * 100 : 0;
  }

  // Find best match
  let bestPersona = null;
  let bestScore = 0;
  for (const [personaKey, score] of Object.entries(personaScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestPersona = personaKey;
    }
  }

  return bestPersona && bestScore >= 40
    ? {
        key: bestPersona,
        matchScore: bestScore,
        ...MAINTENANCE_PERSONAS[bestPersona],
      }
    : null;
}

/**
 * Build material recommendations based on maintenance level
 */
function buildMaterialRecommendations(answers, maintenanceLevel) {
  const avoid = [];
  const preferred = [];

  if (maintenanceLevel === 'low-maintenance-required') {
    // Avoid high-maintenance materials
    avoid.push(
      'marble',
      'butcher-block',
      'natural-stone-unsealed',
      'solid-wood-unstained',
      'concrete-unsealed'
    );

    // Prefer low-maintenance
    preferred.push('quartz', 'porcelain', 'thermofoil', 'luxury-vinyl', 'solid-surface');
  } else if (maintenanceLevel === 'high-maintenance-ok') {
    // Can use any material
    preferred.push('marble', 'natural-stone', 'solid-wood', 'butcher-block', 'concrete');
  } else {
    // Moderate - some maintenance OK
    preferred.push('quartz', 'granite', 'engineered-hardwood', 'sealed-concrete');
    avoid.push('marble', 'butcher-block');
  }

  // Stain concerns
  if (answers['stain-concern'] === 'very-concerned') {
    avoid.push('butcher-block', 'marble', 'limestone');
    preferred.push('quartz', 'porcelain', 'solid-surface');
  }

  return { avoid: [...new Set(avoid)], preferred: [...new Set(preferred)] };
}

/**
 * Estimate maintenance hours per week
 */
function estimateMaintenanceHours(level) {
  const hours = {
    low: 0.5,
    moderate: 1.5,
    high: 3,
  };
  return hours[level] || 1;
}

/**
 * Get time commitment description
 */
function getTimeCommitmentDescription(level) {
  const descriptions = {
    low: {
      en: 'Quick wipe-downs are sufficient for daily care',
      fr: "Un essuyage rapide suffit pour l'entretien quotidien",
    },
    moderate: {
      en: 'Regular cleaning with occasional deep maintenance',
      fr: 'Nettoyage régulier avec entretien approfondi occasionnel',
    },
    high: {
      en: 'Consistent care and periodic professional maintenance required',
      fr: 'Soins constants et entretien professionnel périodique requis',
    },
  };
  return descriptions[level] || descriptions['moderate'];
}

/**
 * Get cleaning description
 */
function getCleaningDescription(frequency) {
  const descriptions = {
    daily: {
      en: 'Daily cleaning routine with deep cleaning weekly',
      fr: 'Routine de nettoyage quotidienne avec nettoyage en profondeur hebdomadaire',
    },
    weekly: {
      en: 'Weekly cleaning with spot cleaning as needed',
      fr: 'Nettoyage hebdomadaire avec nettoyage ponctuel au besoin',
    },
    monthly: {
      en: 'Monthly deep cleaning with basic upkeep',
      fr: 'Nettoyage en profondeur mensuel avec entretien de base',
    },
    'as-needed': {
      en: 'Minimal cleaning only when necessary',
      fr: 'Nettoyage minimal seulement quand nécessaire',
    },
  };
  return descriptions[frequency] || descriptions['weekly'];
}

/**
 * Calculate care complexity score
 */
function calculateCareComplexity(answers) {
  let complexityPoints = 0;

  if (answers['material-care'] === 'willing') complexityPoints += 3;
  else if (answers['material-care'] === 'some-ok') complexityPoints += 1.5;

  if (answers['maintenance-time'] === 'willing') complexityPoints += 2;

  if (answers['cleaning-frequency'] === 'daily') complexityPoints += 1;

  const score = Math.min(100, (complexityPoints / 6) * 100);

  return {
    score,
    level: score >= 70 ? 'high' : score >= 40 ? 'moderate' : 'low',
    description: {
      en:
        score >= 70
          ? 'Comfortable with complex care routines'
          : score >= 40
            ? 'Can handle moderate care requirements'
            : 'Prefers simple, straightforward care',
      fr:
        score >= 70
          ? "À l'aise avec les routines de soins complexes"
          : score >= 40
            ? 'Peut gérer des exigences de soins modérées'
            : 'Préfère des soins simples et directs',
    },
  };
}

/**
 * Calculate longevity expectation
 */
function calculateLongevityExpectation(answers) {
  let longevityScore = 50;

  if (answers['durability-priority'] === 'durability-first') {
    longevityScore = 90;
  } else if (answers['durability-priority'] === 'balanced') {
    longevityScore = 70;
  } else {
    longevityScore = 50;
  }

  // Willingness to maintain increases longevity
  if (answers['material-care'] === 'willing') {
    longevityScore = Math.min(100, longevityScore + 10);
  }

  return {
    score: longevityScore,
    years: longevityScore >= 85 ? '20-30+' : longevityScore >= 65 ? '15-20' : '10-15',
    description: {
      en:
        longevityScore >= 85
          ? 'Expecting decades of use with proper care'
          : longevityScore >= 65
            ? 'Planning for long-term durability'
            : 'Standard lifespan expectations',
      fr:
        longevityScore >= 85
          ? "S'attend à des décennies d'utilisation avec des soins appropriés"
          : longevityScore >= 65
            ? 'Planification de la durabilité à long terme'
            : 'Attentes de durée de vie standard',
    },
  };
}

function scoreMaintenanceTime(value) {
  if (!value) return null;

  const scores = {
    minimal: {
      score: 30,
      level: 'low',
      tags: ['low-maintenance', 'easy-care'],
      materialFilters: ['avoid-marble', 'avoid-wood-counters'],
    },
    moderate: {
      score: 60,
      level: 'moderate',
      tags: [],
      materialFilters: [],
    },
    willing: {
      score: 90,
      level: 'high',
      tags: ['maintenance-flexible', 'natural-materials-ok'],
      materialFilters: [],
    },
  };

  return scores[value] || { score: 50, level: 'moderate', tags: [], materialFilters: [] };
}

function scoreCleaningFrequency(value) {
  if (!value) return null;

  const scores = {
    daily: { score: 100, frequency: 'daily', tags: ['meticulous'] },
    weekly: { score: 70, frequency: 'weekly', tags: [] },
    monthly: { score: 40, frequency: 'monthly', tags: [] },
    rarely: { score: 20, frequency: 'as-needed', tags: ['easy-clean-priority'] },
  };

  return scores[value] || { score: 50, frequency: 'weekly', tags: [] };
}

function scoreMaterialCare(value) {
  if (!value) return null;

  const scores = {
    'no-special': {
      score: 30,
      willingness: 'none',
      tags: ['easy-care-only'],
      materialFilters: ['avoid-natural-stone', 'avoid-real-wood'],
    },
    'some-ok': {
      score: 60,
      willingness: 'moderate',
      tags: [],
      materialFilters: [],
    },
    willing: {
      score: 90,
      willingness: 'full',
      tags: ['premium-materials-ok'],
      materialFilters: [],
    },
  };

  return scores[value] || { score: 50, willingness: 'moderate', tags: [], materialFilters: [] };
}

function scoreDurabilityPriority(value) {
  if (!value) return null;

  const scores = {
    'durability-first': { score: 90, focus: 'durability', tags: ['durability-focused'] },
    balanced: { score: 60, focus: 'balanced', tags: [] },
    'aesthetics-first': { score: 30, focus: 'aesthetics', tags: ['aesthetics-over-durability'] },
  };

  return scores[value] || { score: 50, focus: 'balanced', tags: [] };
}

function scoreStainConcern(value) {
  if (!value) return null;

  const scores = {
    'very-concerned': {
      score: 90,
      level: 'high',
      tags: ['stain-resistant-priority'],
      materialFilters: ['prefer-quartz', 'prefer-sealed-surfaces'],
    },
    somewhat: { score: 60, level: 'moderate', tags: [], materialFilters: [] },
    'not-worried': { score: 30, level: 'low', tags: ['patina-ok'], materialFilters: [] },
  };

  return scores[value] || { score: 50, level: 'moderate', tags: [], materialFilters: [] };
}

function determineMaintenanceLevel(answers) {
  let score = 50;

  if (answers['maintenance-time'] === 'minimal') score -= 20;
  if (answers['maintenance-time'] === 'willing') score += 20;

  if (answers['material-care'] === 'no-special') score -= 15;
  if (answers['material-care'] === 'willing') score += 15;

  if (answers['cleaning-frequency'] === 'daily') score += 10;
  if (answers['cleaning-frequency'] === 'rarely') score -= 10;

  if (score >= 70) return 'high-maintenance-ok';
  if (score >= 40) return 'moderate';
  return 'low-maintenance-required';
}

function calculateMaterialPreference(answers) {
  const wantsEasyCare =
    answers['maintenance-time'] === 'minimal' || answers['material-care'] === 'no-special';

  const recommended = wantsEasyCare
    ? ['quartz', 'laminate', 'thermofoil', 'vinyl']
    : ['granite', 'marble', 'solid-wood', 'natural-stone'];

  return {
    easyCare: wantsEasyCare,
    recommendedMaterials: recommended,
  };
}

function calculateDurabilityFocus(answers) {
  const prioritizeDurability = answers['durability-priority'] === 'durability-first';
  const concernedAboutStains = answers['stain-concern'] === 'very-concerned';

  return {
    score: (prioritizeDurability ? 40 : 0) + (concernedAboutStains ? 30 : 0) + 30,
    highPriority: prioritizeDurability || concernedAboutStains,
  };
}

function generateRecommendations(answers, componentScores, scores) {
  const recommendations = [];

  // Maintenance persona recommendation
  if (scores.maintenancePersona && scores.maintenancePersona.matchScore >= 60) {
    recommendations.push({
      id: 'maintenance-persona-match',
      type: 'profile',
      priority: 'info',
      title: {
        en: `${scores.maintenancePersona.key
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')} Profile`,
        fr: `Profil ${scores.maintenancePersona.key.split('-').join(' ')}`,
      },
      description: {
        en: scores.maintenancePersona.description.en,
        fr: scores.maintenancePersona.description.fr,
      },
    });
  }

  // Low-maintenance material recommendations
  if (scores.maintenanceLevel === 'low-maintenance-required') {
    recommendations.push({
      id: 'low-maintenance-materials',
      type: 'material',
      priority: 'essential',
      title: {
        en: 'Low-Maintenance Material Package',
        fr: 'Ensemble de matériaux à faible entretien',
      },
      description: {
        en: 'Recommended: Quartz countertops (no sealing), thermofoil or acrylic cabinets (wipe-clean), and luxury vinyl flooring (waterproof, scratch-resistant). Total maintenance: ~30 minutes/week.',
        fr: 'Recommandé: Comptoirs en quartz (sans scellement), armoires en thermofoil ou acrylique (nettoyage facile), et sol en vinyle de luxe (imperméable, résistant aux rayures). Entretien total: ~30 minutes/semaine.',
      },
    });

    recommendations.push({
      id: 'avoid-high-maintenance',
      type: 'material',
      priority: 'essential',
      title: { en: 'Materials to Avoid', fr: 'Matériaux à éviter' },
      description: {
        en: `Based on your preferences, avoid: ${scores.avoidMaterials.join(', ')}. These require regular sealing, special cleaners, or careful maintenance.`,
        fr: `Selon vos préférences, évitez: ${scores.avoidMaterials.join(', ')}. Ceux-ci nécessitent un scellement régulier, des nettoyants spéciaux ou un entretien attentif.`,
      },
    });
  }

  // Stain resistance
  if (answers['stain-concern'] === 'very-concerned') {
    recommendations.push({
      id: 'stain-resistant',
      type: 'material',
      priority: 'essential',
      title: { en: 'Maximum Stain Resistance', fr: 'Résistance maximale aux taches' },
      description: {
        en: 'Quartz (non-porous), solid surface, and porcelain offer the best stain resistance. Avoid marble, limestone, and butcher block which stain easily.',
        fr: 'Le quartz (non poreux), la surface solide et la porcelaine offrent la meilleure résistance aux taches. Évitez le marbre, le calcaire et le bloc de boucher qui se tachent facilement.',
      },
    });

    recommendations.push({
      id: 'protective-treatments',
      type: 'maintenance',
      priority: 'recommended',
      title: { en: 'Protective Treatments', fr: 'Traitements protecteurs' },
      description: {
        en: 'For cabinets, choose factory-finished or catalyzed finishes that resist staining better than standard paints.',
        fr: "Pour les armoires, choisissez des finitions d'usine ou catalysées qui résistent mieux aux taches que les peintures standard.",
      },
    });
  }

  // Natural materials for those willing to maintain
  if (answers['material-care'] === 'willing' && scores.maintenanceLevel === 'high-maintenance-ok') {
    recommendations.push({
      id: 'natural-materials',
      type: 'material',
      priority: 'recommended',
      title: { en: 'Natural Material Options', fr: 'Options de matériaux naturels' },
      description: {
        en: 'Your willingness to maintain opens premium options: marble countertops (seal 2x/year), butcher block (oil monthly), solid hardwood floors (refinish every 10 years). These develop beautiful patina over time.',
        fr: "Votre volonté d'entretenir ouvre des options premium: comptoirs en marbre (sceller 2x/an), bloc de boucher (huiler mensuellement), planchers en bois massif (refinir tous les 10 ans). Ceux-ci développent une belle patine avec le temps.",
      },
    });

    recommendations.push({
      id: 'maintenance-schedule',
      type: 'maintenance',
      priority: 'recommended',
      title: { en: 'Maintenance Schedule', fr: "Calendrier d'entretien" },
      description: {
        en: 'Create a maintenance calendar: Daily wipe-downs, weekly deep clean, monthly treatments (oil, polish), annual/biannual sealing.',
        fr: "Créez un calendrier d'entretien: Essuyage quotidien, nettoyage en profondeur hebdomadaire, traitements mensuels (huile, polissage), scellement annuel/semestriel.",
      },
    });
  }

  // Durability-focused recommendations
  if (answers['durability-priority'] === 'durability-first') {
    recommendations.push({
      id: 'durability-materials',
      type: 'material',
      priority: 'essential',
      title: { en: 'Maximum Durability Materials', fr: 'Matériaux de durabilité maximale' },
      description: {
        en: 'For longevity: Quartz or granite countertops (lifetime warranty), solid wood or plywood cabinets (avoid particleboard), porcelain tile or luxury vinyl flooring (20+ year lifespan).',
        fr: 'Pour la longévité: Comptoirs en quartz ou granit (garantie à vie), armoires en bois massif ou contreplaqué (éviter les panneaux de particules), carrelage en porcelaine ou sol en vinyle de luxe (durée de vie 20+ ans).',
      },
    });

    recommendations.push({
      id: 'quality-construction',
      type: 'construction',
      priority: 'recommended',
      title: { en: 'Quality Construction Details', fr: 'Détails de construction de qualité' },
      description: {
        en: 'Invest in: Dovetail drawer joints, soft-close hinges, full-extension drawer glides, plywood box construction. These add 10-15 years to cabinet life.',
        fr: "Investissez dans: Assemblages à queue d'aronde, charnières à fermeture douce, glissières de tiroir à extension complète, construction de boîte en contreplaqué. Ceux-ci ajoutent 10-15 ans à la vie des armoires.",
      },
    });
  }

  // Cleaning frequency recommendations
  if (answers['cleaning-frequency'] === 'daily') {
    recommendations.push({
      id: 'daily-clean-materials',
      type: 'material',
      priority: 'recommended',
      title: { en: 'Materials for Frequent Cleaning', fr: 'Matériaux pour nettoyage fréquent' },
      description: {
        en: 'Choose materials that withstand frequent cleaning: sealed surfaces, commercial-grade finishes, non-porous materials. Avoid unsealed wood or porous stone.',
        fr: 'Choisissez des matériaux qui résistent au nettoyage fréquent: surfaces scellées, finitions de qualité commerciale, matériaux non poreux. Évitez le bois non scellé ou la pierre poreuse.',
      },
    });
  } else if (answers['cleaning-frequency'] === 'rarely') {
    recommendations.push({
      id: 'hide-dirt-materials',
      type: 'material',
      priority: 'recommended',
      title: { en: 'Forgiving Material Choices', fr: 'Choix de matériaux tolérants' },
      description: {
        en: 'Choose materials that hide dirt: medium-toned colors, matte finishes, textured surfaces. Avoid high-gloss black or white which show every fingerprint.',
        fr: 'Choisissez des matériaux qui cachent la saleté: couleurs moyennes, finitions mates, surfaces texturées. Évitez le noir ou blanc brillant qui montrent chaque empreinte.',
      },
    });
  }

  // Time commitment acknowledgment
  const estimatedHours = scores.categories.timeCommitment?.hoursPerWeek || 1;
  if (estimatedHours >= 2.5) {
    recommendations.push({
      id: 'time-investment',
      type: 'maintenance',
      priority: 'info',
      title: { en: 'Maintenance Time Investment', fr: "Investissement en temps d'entretien" },
      description: {
        en: `Your material choices require approximately ${estimatedHours} hours/week of maintenance. Consider if this fits your lifestyle long-term.`,
        fr: `Vos choix de matériaux nécessitent environ ${estimatedHours} heures/semaine d\'entretien. Considérez si cela convient à votre style de vie à long terme.`,
      },
    });
  } else if (estimatedHours < 1) {
    recommendations.push({
      id: 'low-time-commitment',
      type: 'maintenance',
      priority: 'info',
      title: { en: 'Minimal Time Investment', fr: 'Investissement minimal en temps' },
      description: {
        en: `Your selections require less than 1 hour/week of maintenance - perfect for busy lifestyles.`,
        fr: `Vos sélections nécessitent moins d'1 heure/semaine d'entretien - parfait pour les modes de vie occupés.`,
      },
    });
  }

  // Professional maintenance recommendation
  if (
    answers['material-care'] === 'willing' &&
    (scores.preferredMaterials.includes('marble') ||
      scores.preferredMaterials.includes('butcher-block'))
  ) {
    recommendations.push({
      id: 'professional-maintenance',
      type: 'service',
      priority: 'optional',
      title: { en: 'Professional Maintenance Services', fr: "Services d'entretien professionnels" },
      description: {
        en: 'Consider annual professional services: stone sealing ($200-400), wood refinishing ($300-600), deep cleaning. These extend material life significantly.',
        fr: 'Envisagez des services professionnels annuels: scellement de pierre (200-400$), refinition de bois (300-600$), nettoyage en profondeur. Ceux-ci prolongent considérablement la vie des matériaux.',
      },
    });
  }

  // Product recommendations
  if (scores.maintenanceLevel === 'low-maintenance-required') {
    recommendations.push({
      id: 'maintenance-products',
      type: 'product',
      priority: 'optional',
      title: { en: 'Recommended Cleaning Products', fr: 'Produits de nettoyage recommandés' },
      description: {
        en: 'Stock simple cleaners: pH-neutral cleaner for daily use, microfiber cloths, magic erasers for scuffs. Avoid harsh chemicals that can damage finishes.',
        fr: 'Stockez des nettoyants simples: nettoyant pH neutre pour usage quotidien, chiffons en microfibre, gommes magiques pour les éraflures. Évitez les produits chimiques agressifs qui peuvent endommager les finitions.',
      },
    });
  }

  // Longevity expectations
  if (scores.categories.longevityExpectation?.score >= 85) {
    recommendations.push({
      id: 'longevity-planning',
      type: 'planning',
      priority: 'info',
      title: { en: 'Long-Term Planning', fr: 'Planification à long terme' },
      description: {
        en: `Your choices are designed for ${scores.categories.longevityExpectation.years} of use. This approach maximizes value through reduced replacement costs.`,
        fr: `Vos choix sont conçus pour ${scores.categories.longevityExpectation.years} d'utilisation. Cette approche maximise la valeur grâce à des coûts de remplacement réduits.`,
      },
    });
  }

  return recommendations;
}

module.exports = {
  calculateSectionScore,
  identifyMaintenancePersona,
  scoreMaintenanceTime,
  scoreCleaningFrequency,
  scoreMaterialCare,
  scoreDurabilityPriority,
  scoreStainConcern,
  determineMaintenanceLevel,
  buildMaterialRecommendations,
  calculateMaterialPreference,
  calculateDurabilityFocus,
  calculateCareComplexity,
  calculateLongevityExpectation,
  generateRecommendations,
  SCORE_WEIGHTS,
  MAINTENANCE_PERSONAS,
};
