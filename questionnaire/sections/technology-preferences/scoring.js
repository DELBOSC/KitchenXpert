/**
 * Technology Preferences Section Scoring Module
 *
 * Calculates technology adoption scores, smart home readiness,
 * identifies tech personas, and generates infrastructure recommendations
 * for modern connected kitchens.
 */

/**
 * Score weights for technology factors
 * Higher weights for foundational elements (comfort, appliances)
 */
const SCORE_WEIGHTS = {
  techComfort: 0.25,
  smartAppliances: 0.25,
  voiceControl: 0.15,
  smartLighting: 0.15,
  chargingStations: 0.05,
  connectivity: 0.1,
  securityFeatures: 0.05,
};

/**
 * Technology adoption personas
 * Maps user tech preferences to distinct user profiles
 */
const TECH_PERSONAS = {
  'tech-enthusiast': {
    description: {
      en: 'Early adopter who embraces cutting-edge smart home technology',
      fr: 'Adopteur précoce qui embrasse la technologie de maison intelligente de pointe',
    },
    characteristics: ['very-comfortable', 'multiple-smart-devices', 'voice-control', 'automation'],
    priorities: ['integration', 'automation', 'future-proofing'],
    recommendedBudget: 'premium',
    infrastructureNeeds: ['strong-wifi', 'smart-hub', 'dedicated-circuits'],
  },
  'practical-adopter': {
    description: {
      en: 'Selective with technology, choosing practical smart features that add value',
      fr: 'Sélectif avec la technologie, choisissant des fonctionnalités intelligentes pratiques qui ajoutent de la valeur',
    },
    characteristics: ['comfortable', 'some-smart-devices', 'energy-efficiency'],
    priorities: ['reliability', 'energy-savings', 'proven-technology'],
    recommendedBudget: 'mid-range',
    infrastructureNeeds: ['wifi-coverage', 'usb-outlets'],
  },
  'traditional-user': {
    description: {
      en: 'Prefers traditional appliances with straightforward, reliable controls',
      fr: 'Préfère les appareils traditionnels avec des commandes simples et fiables',
    },
    characteristics: ['not-comfortable', 'no-smart-devices', 'simple-controls'],
    priorities: ['simplicity', 'reliability', 'no-learning-curve'],
    recommendedBudget: 'standard',
    infrastructureNeeds: ['standard-outlets'],
  },
  'safety-focused': {
    description: {
      en: 'Prioritizes smart safety and monitoring features for peace of mind',
      fr: "Privilégie les fonctionnalités de sécurité et de surveillance intelligentes pour la tranquillité d'esprit",
    },
    characteristics: ['security-features', 'leak-sensors', 'smart-locks', 'monitoring'],
    priorities: ['safety', 'monitoring', 'alerts'],
    recommendedBudget: 'mid-range',
    infrastructureNeeds: ['wifi-coverage', 'backup-power'],
  },
  'eco-tech': {
    description: {
      en: 'Uses technology primarily for energy monitoring and environmental efficiency',
      fr: "Utilise la technologie principalement pour la surveillance de l'énergie et l'efficacité environnementale",
    },
    characteristics: ['energy-monitoring', 'smart-appliances', 'eco-conscious'],
    priorities: ['energy-tracking', 'efficiency', 'sustainability'],
    recommendedBudget: 'mid-to-premium',
    infrastructureNeeds: ['wifi-coverage', 'smart-meter-integration'],
  },
};

/**
 * Tech comfort level scores
 */
const TECH_COMFORT_SCORES = {
  'very-comfortable': 100,
  comfortable: 75,
  somewhat: 50,
  'not-comfortable': 25,
};

/**
 * Calculate overall section score with tech persona identification
 */
function calculateSectionScore(answers) {
  const scores = {
    overall: 0,
    techReadiness: 'basic',
    techPersona: null,
    categories: {},
    recommendations: [],
    tags: new Set(),
    infrastructureNeeds: [],
    integrationComplexity: 'low',
    futureProofScore: 0,
  };

  // Identify technology persona
  scores.techPersona = identifyTechPersona(answers);

  const componentScores = {
    techComfort: scoreTechComfort(answers['tech-comfort']),
    smartAppliances: scoreSmartAppliances(answers['smart-appliances']),
    voiceControl: scoreVoiceControl(answers['voice-control']),
    smartLighting: scoreSmartLighting(answers['smart-lighting']),
    chargingStations: scoreChargingStations(answers['charging-stations']),
    connectivity: scoreConnectivity(answers['connectivity']),
    securityFeatures: scoreSecurityFeatures(answers['security-features']),
  };

  let totalWeight = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    if (componentScores[key] !== null) {
      scores.overall += (componentScores[key]?.score || 0) * weight;
      totalWeight += weight;

      if (componentScores[key]?.tags) {
        componentScores[key].tags.forEach((tag) => scores.tags.add(tag));
      }

      if (componentScores[key]?.infrastructureNeeds) {
        scores.infrastructureNeeds.push(...componentScores[key].infrastructureNeeds);
      }
    }
  }

  if (totalWeight > 0) {
    scores.overall = Math.round((scores.overall / totalWeight) * 100) / 100;
  }

  // Determine tech readiness and complexity
  scores.techReadiness = determineTechReadiness(scores.overall, answers);
  scores.integrationComplexity = determineIntegrationComplexity(answers, componentScores);
  scores.futureProofScore = calculateFutureProofScore(answers);

  // Deduplicate infrastructure needs
  scores.infrastructureNeeds = [...new Set(scores.infrastructureNeeds)];

  scores.categories = {
    adoption: {
      score: componentScores.techComfort?.score || 50,
      level: componentScores.techComfort?.level || 'moderate',
      description: getTechComfortDescription(componentScores.techComfort?.level),
    },
    smartHome: calculateSmartHomeScore(answers),
    connectivity: calculateConnectivityScore(answers),
    automation: calculateAutomationScore(answers),
    safety: calculateSafetyScore(answers),
    energyManagement: calculateEnergyManagementScore(answers),
  };

  scores.recommendations = generateRecommendations(answers, componentScores, scores);
  scores.tags = Array.from(scores.tags);

  return scores;
}

/**
 * Identify technology persona based on user preferences
 */
function identifyTechPersona(answers) {
  const userCharacteristics = new Set();

  // Map answers to characteristics
  if (answers['tech-comfort']) {
    userCharacteristics.add(answers['tech-comfort']);
  }

  const smartAppliances = answers['smart-appliances'] || [];
  if (smartAppliances.length >= 3 && !smartAppliances.includes('none')) {
    userCharacteristics.add('multiple-smart-devices');
  } else if (smartAppliances.length >= 1 && !smartAppliances.includes('none')) {
    userCharacteristics.add('some-smart-devices');
  } else {
    userCharacteristics.add('no-smart-devices');
  }

  if (answers['voice-control'] && answers['voice-control'] !== 'no') {
    userCharacteristics.add('voice-control');
  }

  const securityFeatures = answers['security-features'] || [];
  if (securityFeatures.length >= 2 && !securityFeatures.includes('none')) {
    userCharacteristics.add('security-features');
  }

  if (securityFeatures.includes('leak-sensors')) {
    userCharacteristics.add('leak-sensors');
  }

  if (answers['smart-lighting'] === 'full-system') {
    userCharacteristics.add('automation');
  }

  // Score each persona
  const personaScores = {};
  for (const [personaKey, persona] of Object.entries(TECH_PERSONAS)) {
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
        ...TECH_PERSONAS[bestPersona],
      }
    : null;
}

/**
 * Determine integration complexity level
 */
function determineIntegrationComplexity(answers, componentScores) {
  let complexityPoints = 0;

  const smartAppliances = answers['smart-appliances'] || [];
  if (smartAppliances.length >= 4) complexityPoints += 3;
  else if (smartAppliances.length >= 2) complexityPoints += 2;
  else if (smartAppliances.length >= 1) complexityPoints += 1;

  if (answers['voice-control'] === 'yes-multiple') complexityPoints += 2;
  else if (answers['voice-control'] && answers['voice-control'] !== 'no') complexityPoints += 1;

  if (answers['smart-lighting'] === 'full-system') complexityPoints += 2;

  const connectivity = answers['connectivity'] || [];
  if (connectivity.includes('ethernet')) complexityPoints += 1;
  if (connectivity.includes('hub-location')) complexityPoints += 1;

  if (complexityPoints >= 7) return 'high';
  if (complexityPoints >= 4) return 'moderate';
  return 'low';
}

/**
 * Calculate future-proofing score
 */
function calculateFutureProofScore(answers) {
  let futureProofPoints = 0;

  // Strong WiFi = future ready
  const connectivity = answers['connectivity'] || [];
  if (connectivity.includes('strong-wifi')) futureProofPoints += 15;
  if (connectivity.includes('ethernet')) futureProofPoints += 20;
  if (connectivity.includes('hub-location')) futureProofPoints += 10;

  // Smart appliances with updates
  const smartAppliances = answers['smart-appliances'] || [];
  if (smartAppliances.length >= 3) futureProofPoints += 20;
  else if (smartAppliances.length >= 1) futureProofPoints += 10;

  // Voice control platforms
  if (answers['voice-control'] === 'yes-multiple') futureProofPoints += 15;
  else if (answers['voice-control'] && answers['voice-control'] !== 'no') futureProofPoints += 10;

  // Smart lighting infrastructure
  if (answers['smart-lighting'] === 'full-system') futureProofPoints += 15;
  else if (answers['smart-lighting'] === 'some-areas') futureProofPoints += 8;

  // Charging infrastructure
  if (answers['charging-stations'] === 'dedicated-area') futureProofPoints += 5;
  if (answers['charging-stations'] === 'wireless-charging') futureProofPoints += 5;

  return Math.min(100, futureProofPoints);
}

/**
 * Get tech comfort description
 */
function getTechComfortDescription(level) {
  const descriptions = {
    'early-adopter': {
      en: 'Enthusiastic about new technology and automation',
      fr: "Enthousiaste à propos de la nouvelle technologie et de l'automatisation",
    },
    'tech-friendly': {
      en: 'Comfortable with technology when it adds clear value',
      fr: "À l'aise avec la technologie quand elle ajoute une valeur claire",
    },
    'basic-tech': {
      en: 'Prefers simple, proven technology solutions',
      fr: 'Préfère des solutions technologiques simples et éprouvées',
    },
    traditional: {
      en: 'Most comfortable with traditional, non-connected appliances',
      fr: "Plus à l'aise avec les appareils traditionnels non connectés",
    },
  };
  return descriptions[level] || descriptions['basic-tech'];
}

function scoreTechComfort(value) {
  if (!value) return null;

  const levels = {
    'very-comfortable': { level: 'early-adopter', tags: ['tech-savvy', 'smart-home-ready'] },
    comfortable: { level: 'tech-friendly', tags: ['smart-home-interested'] },
    somewhat: { level: 'basic-tech', tags: [] },
    'not-comfortable': { level: 'traditional', tags: ['traditional-preference'] },
  };

  return {
    score: TECH_COMFORT_SCORES[value] || 50,
    ...levels[value],
  };
}

function scoreSmartAppliances(values) {
  if (!values || !Array.isArray(values)) {
    return { score: 0, count: 0, tags: [] };
  }

  if (values.includes('none')) {
    return { score: 20, count: 0, tags: ['traditional-appliances'] };
  }

  const applianceTags = {
    'smart-fridge': ['connected-kitchen'],
    'smart-oven': ['smart-cooking'],
    'smart-dishwasher': ['smart-cleaning'],
    'smart-coffee': ['smart-beverage'],
    'smart-faucet': ['touchless-fixtures'],
  };

  const tags = [];
  const infrastructureNeeds = [];

  values.forEach((v) => {
    if (applianceTags[v]) {
      tags.push(...applianceTags[v]);
    }
  });

  if (values.length >= 3) {
    infrastructureNeeds.push('dedicated-smart-circuit');
    infrastructureNeeds.push('strong-wifi-coverage');
  }

  return {
    score: Math.min(100, 30 + values.length * 15),
    count: values.length,
    appliances: values,
    tags,
    infrastructureNeeds,
  };
}

function scoreVoiceControl(value) {
  if (!value) return null;

  const scores = {
    'yes-alexa': { score: 80, platform: 'alexa', tags: ['voice-control', 'alexa'] },
    'yes-google': { score: 80, platform: 'google', tags: ['voice-control', 'google-home'] },
    'yes-apple': { score: 80, platform: 'homekit', tags: ['voice-control', 'apple-home'] },
    'yes-multiple': { score: 100, platform: 'multi', tags: ['voice-control', 'multi-platform'] },
    no: { score: 30, platform: 'none', tags: [] },
  };

  return scores[value] || { score: 50, platform: 'unknown', tags: [] };
}

function scoreSmartLighting(value) {
  if (!value) return null;

  const scores = {
    'full-system': {
      score: 100,
      level: 'full',
      tags: ['smart-lighting', 'automation-ready'],
      infrastructureNeeds: ['smart-switches', 'lighting-hub'],
    },
    'some-areas': {
      score: 70,
      level: 'partial',
      tags: ['smart-lighting'],
      infrastructureNeeds: ['smart-switches'],
    },
    'dimmers-only': {
      score: 50,
      level: 'basic',
      tags: ['dimmer-controls'],
      infrastructureNeeds: ['dimmer-switches'],
    },
    standard: {
      score: 25,
      level: 'traditional',
      tags: [],
      infrastructureNeeds: [],
    },
  };

  return scores[value] || { score: 50, level: 'unknown', tags: [], infrastructureNeeds: [] };
}

function scoreChargingStations(value) {
  if (!value) return null;

  const scores = {
    'dedicated-area': { score: 90, type: 'dedicated', tags: ['charging-station'] },
    'built-in-outlets': { score: 70, type: 'integrated', tags: ['usb-outlets'] },
    'wireless-charging': { score: 80, type: 'wireless', tags: ['wireless-charging'] },
    'not-needed': { score: 30, type: 'none', tags: [] },
  };

  return scores[value] || { score: 50, type: 'unknown', tags: [] };
}

function scoreConnectivity(values) {
  if (!values || !Array.isArray(values)) {
    return { score: 30, requirements: [], tags: [] };
  }

  if (values.includes('basic')) {
    return { score: 25, requirements: ['standard-outlets'], tags: [] };
  }

  const infrastructureNeeds = [];
  const tags = [];

  if (values.includes('strong-wifi')) {
    infrastructureNeeds.push('wifi-access-point');
    tags.push('wifi-priority');
  }
  if (values.includes('ethernet')) {
    infrastructureNeeds.push('ethernet-runs');
    tags.push('wired-network');
  }
  if (values.includes('bluetooth-speakers')) {
    tags.push('audio-system');
  }
  if (values.includes('hub-location')) {
    infrastructureNeeds.push('smart-hub-location');
    tags.push('smart-hub');
  }

  return {
    score: 40 + values.length * 15,
    requirements: values,
    tags,
    infrastructureNeeds,
  };
}

function scoreSecurityFeatures(values) {
  if (!values || !Array.isArray(values)) {
    return { score: 30, features: [], tags: [] };
  }

  if (values.includes('none')) {
    return { score: 20, features: [], tags: [] };
  }

  const tags = [];
  if (values.includes('leak-sensors')) tags.push('water-protection');
  if (values.includes('smoke-detector')) tags.push('smart-safety');
  if (values.includes('smart-locks')) tags.push('child-safety');

  return {
    score: 40 + values.length * 15,
    features: values,
    tags,
  };
}

function determineTechReadiness(overallScore) {
  if (overallScore >= 80) return 'advanced';
  if (overallScore >= 60) return 'moderate';
  if (overallScore >= 40) return 'basic';
  return 'minimal';
}

function calculateSmartHomeScore(answers) {
  let score = 0;
  let components = 0;

  if (answers['smart-appliances'] && !answers['smart-appliances'].includes('none')) {
    score += answers['smart-appliances'].length * 15;
    components++;
  }

  if (answers['voice-control'] && answers['voice-control'] !== 'no') {
    score += 25;
    components++;
  }

  if (answers['smart-lighting'] && answers['smart-lighting'] !== 'standard') {
    score += 20;
    components++;
  }

  return {
    score: components > 0 ? Math.min(100, score) : 0,
    components,
    integrated: components >= 3,
  };
}

function calculateConnectivityScore(answers) {
  const connectivity = answers['connectivity'] || [];
  const hasAdvanced = connectivity.some((c) => ['ethernet', 'hub-location'].includes(c));

  return {
    score: connectivity.length * 20,
    level: hasAdvanced ? 'advanced' : connectivity.length > 0 ? 'standard' : 'basic',
  };
}

function calculateAutomationScore(answers) {
  let score = 0;

  if (answers['tech-comfort'] === 'very-comfortable') score += 30;
  else if (answers['tech-comfort'] === 'comfortable') score += 20;

  if (answers['voice-control'] && answers['voice-control'] !== 'no') score += 25;
  if (answers['smart-lighting'] === 'full-system') score += 25;

  const security = answers['security-features'] || [];
  if (security.length > 0 && !security.includes('none')) score += 20;

  return {
    score: Math.min(100, score),
    potential: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
  };
}

/**
 * Calculate safety and security score
 */
function calculateSafetyScore(answers) {
  const security = answers['security-features'] || [];

  if (security.includes('none') || security.length === 0) {
    return {
      score: 20,
      level: 'basic',
      features: [],
      description: {
        en: 'Basic safety features only',
        fr: 'Fonctionnalités de sécurité de base uniquement',
      },
    };
  }

  let score = 40;
  const features = [];

  if (security.includes('leak-sensors')) {
    score += 15;
    features.push('water-protection');
  }
  if (security.includes('smoke-detector')) {
    score += 15;
    features.push('fire-safety');
  }
  if (security.includes('smart-locks')) {
    score += 10;
    features.push('access-control');
  }
  if (security.includes('camera')) {
    score += 10;
    features.push('visual-monitoring');
  }
  if (security.includes('motion-sensors')) {
    score += 10;
    features.push('presence-detection');
  }

  return {
    score: Math.min(100, score),
    level: score >= 75 ? 'comprehensive' : score >= 50 ? 'enhanced' : 'basic',
    features,
    count: security.length,
    description: {
      en:
        score >= 75
          ? 'Comprehensive smart safety system'
          : score >= 50
            ? 'Enhanced safety monitoring'
            : 'Basic smart safety features',
      fr:
        score >= 75
          ? 'Système de sécurité intelligent complet'
          : score >= 50
            ? 'Surveillance de sécurité améliorée'
            : 'Fonctionnalités de sécurité intelligentes de base',
    },
  };
}

/**
 * Calculate energy management score
 */
function calculateEnergyManagementScore(answers) {
  let score = 30; // Base score

  const smartAppliances = answers['smart-appliances'] || [];

  // Smart appliances often have energy monitoring
  if (smartAppliances.includes('smart-fridge')) score += 10;
  if (smartAppliances.includes('smart-oven')) score += 10;
  if (smartAppliances.includes('smart-dishwasher')) score += 10;

  // Smart lighting helps with energy management
  if (answers['smart-lighting'] === 'full-system') score += 20;
  else if (answers['smart-lighting'] === 'some-areas') score += 10;

  // Voice control enables easy control for energy savings
  if (answers['voice-control'] && answers['voice-control'] !== 'no') score += 10;

  // Tech comfort indicates likelihood of using energy features
  if (answers['tech-comfort'] === 'very-comfortable') score += 10;

  return {
    score: Math.min(100, score),
    level: score >= 75 ? 'advanced' : score >= 50 ? 'moderate' : 'basic',
    potential: {
      monitoring: smartAppliances.length > 0,
      automation: answers['smart-lighting'] !== 'standard',
      optimization: score >= 70,
    },
    description: {
      en:
        score >= 75
          ? 'Advanced energy monitoring and optimization'
          : score >= 50
            ? 'Moderate energy management capabilities'
            : 'Basic energy awareness',
      fr:
        score >= 75
          ? 'Surveillance et optimisation énergétique avancées'
          : score >= 50
            ? 'Capacités de gestion énergétique modérées'
            : 'Sensibilisation énergétique de base',
    },
  };
}

function generateRecommendations(answers, componentScores, scores) {
  const recommendations = [];

  // Tech persona recommendation
  if (scores.techPersona && scores.techPersona.matchScore >= 60) {
    recommendations.push({
      id: 'tech-persona-identified',
      type: 'profile',
      priority: 'info',
      title: {
        en: `${scores.techPersona.key
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')} Profile`,
        fr: `Profil ${scores.techPersona.key.split('-').join(' ')}`,
      },
      description: {
        en: `You match the ${scores.techPersona.description.en.toLowerCase()}`,
        fr: `Vous correspondez ${scores.techPersona.description.fr.toLowerCase()}`,
      },
    });
  }

  // Smart hub recommendations based on tech readiness
  if (scores.techReadiness === 'advanced' || scores.techReadiness === 'moderate') {
    const platform = componentScores.voiceControl?.platform;
    recommendations.push({
      id: 'smart-hub',
      type: 'infrastructure',
      priority: scores.techReadiness === 'advanced' ? 'essential' : 'recommended',
      title: { en: 'Smart Home Hub', fr: 'Hub Maison Intelligente' },
      description: {
        en:
          platform === 'multi'
            ? 'A universal smart home hub will enable seamless cross-platform integration and automation.'
            : `A ${platform || 'smart'} hub will centralize your kitchen automation and enable advanced scenarios.`,
        fr:
          platform === 'multi'
            ? 'Un hub universel permettra une intégration et une automatisation transparentes multi-plateformes.'
            : `Un hub ${platform || 'intelligent'} centralisera l'automatisation de votre cuisine et permettra des scénarios avancés.`,
      },
    });
  }

  // WiFi infrastructure
  if (
    scores.infrastructureNeeds.includes('strong-wifi-coverage') ||
    scores.infrastructureNeeds.includes('wifi-access-point')
  ) {
    recommendations.push({
      id: 'wifi-upgrade',
      type: 'infrastructure',
      priority: 'essential',
      title: { en: 'Robust WiFi Coverage', fr: 'Couverture WiFi Robuste' },
      description: {
        en: `Strong WiFi is critical for ${(answers['smart-appliances'] || []).filter((a) => a !== 'none').length} smart devices. Consider a mesh network or dedicated access point.`,
        fr: `Un WiFi fort est essentiel pour ${(answers['smart-appliances'] || []).filter((a) => a !== 'none').length} appareils intelligents. Envisagez un réseau maillé ou un point d'accès dédié.`,
      },
    });
  }

  // Electrical planning
  const smartApplianceCount = (answers['smart-appliances'] || []).filter(
    (a) => a !== 'none'
  ).length;
  if (smartApplianceCount >= 2) {
    recommendations.push({
      id: 'electrical-planning',
      type: 'infrastructure',
      priority: 'essential',
      title: { en: 'Electrical Infrastructure', fr: 'Infrastructure Électrique' },
      description: {
        en: `Plan ${smartApplianceCount >= 4 ? 'dedicated circuits and' : ''} adequate outlets for smart appliances. Include USB-C outlets at counter height for device charging.`,
        fr: `Planifiez ${smartApplianceCount >= 4 ? 'des circuits dédiés et' : ''} des prises adéquates pour les appareils intelligents. Incluez des prises USB-C à hauteur de comptoir pour la recharge.`,
      },
    });
  }

  // Integration complexity warning
  if (scores.integrationComplexity === 'high') {
    recommendations.push({
      id: 'professional-integration',
      type: 'service',
      priority: 'recommended',
      title: { en: 'Professional Integration', fr: 'Intégration Professionnelle' },
      description: {
        en: 'Your smart home setup is complex. Consider hiring a smart home integrator for optimal configuration.',
        fr: "Votre configuration de maison intelligente est complexe. Envisagez d'embaucher un intégrateur de maison intelligente pour une configuration optimale.",
      },
    });
  }

  // Future-proofing recommendations
  if (scores.futureProofScore < 50 && scores.techReadiness !== 'minimal') {
    recommendations.push({
      id: 'future-proofing',
      type: 'infrastructure',
      priority: 'recommended',
      title: { en: 'Future-Proof Infrastructure', fr: 'Infrastructure Pérenne' },
      description: {
        en: "Add conduit for future wiring, extra outlets, and Ethernet even if not using now. It's much cheaper during construction.",
        fr: "Ajoutez des conduits pour le câblage futur, des prises supplémentaires et Ethernet même si vous ne les utilisez pas maintenant. C'est beaucoup moins cher pendant la construction.",
      },
    });
  } else if (scores.futureProofScore >= 75) {
    recommendations.push({
      id: 'future-ready',
      type: 'infrastructure',
      priority: 'info',
      title: { en: 'Future-Ready Design', fr: "Conception Prête pour l'Avenir" },
      description: {
        en: 'Your technology infrastructure is well-planned for future upgrades and expansion.',
        fr: "Votre infrastructure technologique est bien planifiée pour les futures mises à niveau et l'expansion.",
      },
    });
  }

  // Security recommendations
  const securityFeatures = answers['security-features'] || [];
  if (
    smartApplianceCount >= 2 &&
    (securityFeatures.length === 0 || securityFeatures.includes('none'))
  ) {
    recommendations.push({
      id: 'add-security',
      type: 'safety',
      priority: 'recommended',
      title: { en: 'Smart Safety Features', fr: 'Fonctionnalités de Sécurité Intelligentes' },
      description: {
        en: 'Consider adding leak sensors near appliances and a smart smoke detector for peace of mind.',
        fr: "Envisagez d'ajouter des capteurs de fuite près des appareils et un détecteur de fumée intelligent pour la tranquillité d'esprit.",
      },
    });
  }

  // Energy management
  if (scores.categories.energyManagement?.score >= 60) {
    recommendations.push({
      id: 'energy-monitoring',
      type: 'feature',
      priority: 'optional',
      title: {
        en: 'Energy Monitoring Dashboard',
        fr: 'Tableau de Bord de Surveillance Énergétique',
      },
      description: {
        en: 'Set up an energy monitoring dashboard to track usage and identify savings opportunities.',
        fr: "Configurez un tableau de bord de surveillance énergétique pour suivre l'utilisation et identifier les opportunités d'économies.",
      },
    });
  }

  // Voice control platform recommendation
  if (componentScores.voiceControl?.platform && componentScores.voiceControl.platform !== 'none') {
    recommendations.push({
      id: 'voice-routines',
      type: 'feature',
      priority: 'optional',
      title: { en: 'Voice Automation Routines', fr: "Routines d'Automatisation Vocale" },
      description: {
        en: `Create voice routines like "Good morning" to turn on lights, start coffee, and check the weather.`,
        fr: `Créez des routines vocales comme "Bonjour" pour allumer les lumières, démarrer le café et vérifier la météo.`,
      },
    });
  }

  // Traditional user support
  if (answers['tech-comfort'] === 'not-comfortable') {
    recommendations.push({
      id: 'traditional-focus',
      type: 'approach',
      priority: 'noted',
      title: { en: 'Traditional Approach', fr: 'Approche Traditionnelle' },
      description: {
        en: "We'll focus on quality traditional appliances with intuitive, reliable controls. No app required.",
        fr: 'Nous nous concentrerons sur des appareils traditionnels de qualité avec des commandes intuitives et fiables. Aucune application requise.',
      },
    });
  }

  // Charging infrastructure
  if (answers['charging-stations'] === 'not-needed' && smartApplianceCount >= 1) {
    recommendations.push({
      id: 'add-charging',
      type: 'infrastructure',
      priority: 'optional',
      title: { en: 'Device Charging', fr: "Recharge d'Appareils" },
      description: {
        en: 'Consider adding USB outlets or a charging drawer for phones and tablets used in the kitchen.',
        fr: "Envisagez d'ajouter des prises USB ou un tiroir de recharge pour les téléphones et tablettes utilisés dans la cuisine.",
      },
    });
  }

  // Backup power for critical systems
  if (scores.categories.safety?.level === 'comprehensive') {
    recommendations.push({
      id: 'backup-power',
      type: 'infrastructure',
      priority: 'optional',
      title: { en: 'Backup Power', fr: 'Alimentation de Secours' },
      description: {
        en: 'Consider battery backup for critical safety devices (smoke, leak sensors) to maintain protection during power outages.',
        fr: 'Envisagez une batterie de secours pour les appareils de sécurité critiques (fumée, capteurs de fuite) pour maintenir la protection pendant les pannes de courant.',
      },
    });
  }

  return recommendations;
}

module.exports = {
  calculateSectionScore,
  identifyTechPersona,
  scoreTechComfort,
  scoreSmartAppliances,
  scoreVoiceControl,
  scoreSmartLighting,
  scoreChargingStations,
  scoreConnectivity,
  scoreSecurityFeatures,
  determineTechReadiness,
  determineIntegrationComplexity,
  calculateFutureProofScore,
  calculateSmartHomeScore,
  calculateConnectivityScore,
  calculateAutomationScore,
  calculateSafetyScore,
  calculateEnergyManagementScore,
  generateRecommendations,
  SCORE_WEIGHTS,
  TECH_COMFORT_SCORES,
  TECH_PERSONAS,
};
