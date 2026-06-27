/**
 * Aesthetic Preferences Section Scoring Module
 *
 * Calculates style coherence scores, identifies design personas,
 * and generates comprehensive aesthetic recommendations based on
 * material selections, color schemes, and style compatibility.
 */

const styleMatrix = require('./style-matrix.json');

/**
 * Score weights for aesthetic elements
 * These determine the relative importance of each design choice
 */
const SCORE_WEIGHTS = {
  kitchenStyle: 0.25,
  colorPreference: 0.15,
  cabinetStyle: 0.15,
  countertopMaterial: 0.15,
  hardwareStyle: 0.05,
  hardwareFinish: 0.05,
  backsplashPreference: 0.1,
  flooringPreference: 0.05,
  lightingStyle: 0.05,
};

/**
 * Design persona configurations
 * Maps user selections to distinct design personalities
 */
const DESIGN_PERSONAS = {
  'modern-minimalist': {
    description: {
      en: 'Clean lines and uncluttered spaces with a focus on function',
      fr: 'Lignes épurées et espaces dégagés avec un accent sur la fonction',
    },
    characteristics: ['flat-panel', 'handleless', 'neutral-light', 'quartz', 'simple'],
    priorities: ['simplicity', 'clean-lines', 'minimal-ornamentation'],
    styleMatches: ['modern', 'contemporary', 'scandinavian'],
  },
  'classic-traditional': {
    description: {
      en: 'Timeless elegance with ornate details and rich materials',
      fr: 'Élégance intemporelle avec des détails ornés et des matériaux riches',
    },
    characteristics: ['raised-panel', 'knobs', 'neutral-warm', 'granite', 'ornate'],
    priorities: ['traditional-details', 'warmth', 'craftsmanship'],
    styleMatches: ['traditional', 'victorian', 'colonial'],
  },
  'rustic-farmhouse': {
    description: {
      en: 'Cozy, lived-in charm with natural materials and vintage touches',
      fr: 'Charme chaleureux et vécu avec des matériaux naturels et des touches vintage',
    },
    characteristics: ['shaker', 'beadboard', 'natural', 'butcher-block', 'cup-pulls'],
    priorities: ['natural-materials', 'texture', 'authenticity'],
    styleMatches: ['farmhouse', 'country', 'cottage'],
  },
  'industrial-urban': {
    description: {
      en: 'Raw materials and exposed elements with an edgy aesthetic',
      fr: 'Matériaux bruts et éléments exposés avec une esthétique audacieuse',
    },
    characteristics: ['flat-panel', 'neutral-dark', 'concrete', 'bar-pulls', 'metal'],
    priorities: ['raw-materials', 'bold-contrasts', 'urban-edge'],
    styleMatches: ['industrial', 'loft', 'urban'],
  },
  'transitional-blend': {
    description: {
      en: 'Perfect balance between traditional warmth and contemporary style',
      fr: 'Équilibre parfait entre chaleur traditionnelle et style contemporain',
    },
    characteristics: ['shaker', 'two-tone', 'quartz', 'bar-pulls', 'mixed'],
    priorities: ['balance', 'versatility', 'timeless-appeal'],
    styleMatches: ['transitional', 'contemporary-classic'],
  },
  'coastal-casual': {
    description: {
      en: 'Breezy, relaxed aesthetic with light colors and natural textures',
      fr: 'Esthétique décontractée et aérée avec des couleurs claires et des textures naturelles',
    },
    characteristics: ['shaker', 'neutral-light', 'natural', 'glass-front', 'white'],
    priorities: ['light-and-airy', 'relaxed', 'natural-light'],
    styleMatches: ['coastal', 'beach', 'mediterranean'],
  },
  'eclectic-creative': {
    description: {
      en: 'Bold mix of styles, colors, and patterns with personality',
      fr: 'Mélange audacieux de styles, couleurs et motifs avec personnalité',
    },
    characteristics: ['colorful', 'mixed', 'varied', 'unique', 'personality'],
    priorities: ['self-expression', 'uniqueness', 'creative-freedom'],
    styleMatches: ['eclectic', 'bohemian', 'artistic'],
  },
};

/**
 * Style compatibility matrix
 * Defines how well different design elements work together
 */
const STYLE_COMPATIBILITY_SCORES = {
  modern: {
    cabinets: {
      'flat-panel': 100,
      slab: 100,
      shaker: 70,
      'raised-panel': 30,
      'glass-front': 80,
      beadboard: 20,
    },
    colors: {
      'neutral-light': 95,
      'neutral-dark': 90,
      'two-tone': 85,
      'neutral-warm': 60,
      colorful: 50,
      natural: 40,
    },
    hardware: {
      handleless: 100,
      'bar-pulls': 90,
      'finger-pulls': 85,
      knobs: 40,
      'cup-pulls': 20,
    },
  },
  traditional: {
    cabinets: {
      'raised-panel': 100,
      shaker: 85,
      beadboard: 75,
      'glass-front': 90,
      'flat-panel': 30,
      slab: 20,
    },
    colors: {
      'neutral-warm': 100,
      natural: 85,
      'neutral-light': 70,
      'two-tone': 60,
      'neutral-dark': 50,
      colorful: 40,
    },
    hardware: {
      knobs: 100,
      'cup-pulls': 95,
      'bar-pulls': 60,
      handleless: 20,
    },
  },
  farmhouse: {
    cabinets: {
      shaker: 100,
      beadboard: 95,
      'raised-panel': 70,
      'glass-front': 85,
      'flat-panel': 40,
    },
    colors: {
      natural: 100,
      'neutral-warm': 90,
      'two-tone': 85,
      'neutral-light': 80,
      colorful: 60,
    },
    hardware: {
      'cup-pulls': 100,
      knobs: 90,
      'bar-pulls': 70,
      mixed: 80,
      handleless: 20,
    },
  },
};

/**
 * Calculate overall section score with comprehensive aesthetic analysis
 * @param {Object} answers - User's answers for this section
 * @returns {Object} Scoring results with persona, coherence, and recommendations
 */
function calculateSectionScore(answers) {
  const scores = {
    overall: 0,
    styleCoherence: 0,
    categories: {},
    primaryStyle: null,
    secondaryStyle: null,
    designPersona: null,
    recommendations: [],
    tags: new Set(),
    warnings: [],
    conflicts: [],
    materialProfile: {},
  };

  // Determine primary style
  scores.primaryStyle = answers['kitchen-style'];

  // Identify design persona based on selections
  scores.designPersona = identifyDesignPersona(answers);

  // Calculate style coherence with advanced compatibility checks
  scores.styleCoherence = calculateStyleCoherence(answers);

  // Calculate individual element scores with detailed analysis
  const elementScores = {
    kitchenStyle: scoreKitchenStyle(answers['kitchen-style']),
    colorPreference: scoreColorPreference(answers['color-preference'], answers['kitchen-style']),
    cabinetStyle: scoreCabinetStyle(answers['cabinet-style'], answers['kitchen-style']),
    countertopMaterial: scoreCountertopMaterial(
      answers['countertop-material'],
      answers['kitchen-style']
    ),
    hardwareStyle: scoreHardwareStyle(answers['hardware-style'], answers['kitchen-style']),
    hardwareFinish: scoreHardwareFinish(answers['hardware-finish'], answers['kitchen-style']),
    backsplashPreference: scoreBacksplash(
      answers['backsplash-preference'],
      answers['kitchen-style']
    ),
    flooringPreference: scoreFlooring(answers['flooring-preference'], answers['kitchen-style']),
    lightingStyle: scoreLighting(answers['lighting-style']),
  };

  // Calculate weighted overall score
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    if (elementScores[key] !== null && elementScores[key] !== undefined) {
      scores.overall += (elementScores[key].score || 0) * weight;
      totalWeight += weight;

      if (elementScores[key].tags) {
        elementScores[key].tags.forEach((tag) => scores.tags.add(tag));
      }

      if (elementScores[key].warning) {
        scores.warnings.push(elementScores[key].warning);
      }

      if (elementScores[key].conflicts) {
        scores.conflicts.push(...elementScores[key].conflicts);
      }
    }
  }

  if (totalWeight > 0) {
    scores.overall = Math.round((scores.overall / totalWeight) * 100) / 100;
  }

  // Apply coherence bonus/penalty
  if (scores.styleCoherence >= 85) {
    scores.overall = Math.min(scores.overall * 1.15, 100);
    scores.tags.add('highly-cohesive');
  } else if (scores.styleCoherence >= 80) {
    scores.overall = Math.min(scores.overall * 1.1, 100);
  } else if (scores.styleCoherence < 50) {
    scores.warnings.push({
      code: 'LOW_COHERENCE',
      severity: 'medium',
      message: {
        en: 'Your selections mix different styles. Consider a more cohesive approach for best results.',
        fr: 'Vos sélections mélangent différents styles. Envisagez une approche plus cohérente pour de meilleurs résultats.',
      },
    });
  } else if (scores.styleCoherence < 40) {
    scores.warnings.push({
      code: 'VERY_LOW_COHERENCE',
      severity: 'high',
      message: {
        en: 'Your selections have significant style conflicts. We recommend consulting with a designer.',
        fr: 'Vos sélections présentent des conflits de style importants. Nous recommandons de consulter un designer.',
      },
    });
  }

  // Detect style conflicts
  const styleConflicts = detectStyleConflicts(answers, elementScores);
  scores.conflicts.push(...styleConflicts);

  // Build material profile
  scores.materialProfile = buildMaterialProfile(answers, elementScores);

  // Calculate category scores with enhanced analysis
  scores.categories = {
    styleCoherence: {
      score: scores.styleCoherence,
      label: getCoherenceLabel(scores.styleCoherence),
      description: getCoherenceDescription(scores.styleCoherence),
    },
    materialQuality: calculateMaterialQualityScore(answers),
    maintenanceLevel: calculateMaintenanceScore(answers),
    budgetTier: determineBudgetTier(answers),
    designComplexity: calculateDesignComplexity(answers),
    visualWeight: calculateVisualWeight(answers),
    colorHarmony: calculateColorHarmony(answers),
  };

  // Generate comprehensive recommendations
  scores.recommendations = generateRecommendations(answers, elementScores, scores);

  scores.tags = Array.from(scores.tags);

  return scores;
}

/**
 * Identify the user's design persona based on selections
 */
function identifyDesignPersona(answers) {
  const userCharacteristics = new Set();

  // Collect characteristics from answers
  if (answers['cabinet-style']) userCharacteristics.add(answers['cabinet-style']);
  if (answers['hardware-style']) userCharacteristics.add(answers['hardware-style']);
  if (answers['color-preference']) userCharacteristics.add(answers['color-preference']);
  if (answers['countertop-material']) userCharacteristics.add(answers['countertop-material']);

  // Score each persona based on matching characteristics
  const personaScores = {};
  for (const [personaKey, persona] of Object.entries(DESIGN_PERSONAS)) {
    let matchScore = 0;
    let totalCharacteristics = persona.characteristics.length;

    for (const characteristic of persona.characteristics) {
      if (userCharacteristics.has(characteristic)) {
        matchScore++;
      }
    }

    // Check style match
    if (answers['kitchen-style'] && persona.styleMatches.includes(answers['kitchen-style'])) {
      matchScore += 2;
      totalCharacteristics += 2;
    }

    personaScores[personaKey] =
      totalCharacteristics > 0 ? (matchScore / totalCharacteristics) * 100 : 0;
  }

  // Find best matching persona
  let bestPersona = null;
  let bestScore = 0;
  for (const [personaKey, score] of Object.entries(personaScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestPersona = personaKey;
    }
  }

  return bestPersona && bestScore >= 30
    ? {
        key: bestPersona,
        score: bestScore,
        ...DESIGN_PERSONAS[bestPersona],
      }
    : null;
}

/**
 * Calculate style coherence across all selections with advanced compatibility
 */
function calculateStyleCoherence(answers) {
  const primaryStyle = answers['kitchen-style'];
  if (!primaryStyle || !styleMatrix.styles[primaryStyle]) {
    return 50;
  }

  const styleConfig = styleMatrix.styles[primaryStyle];
  let coherenceScore = 100;
  let factors = 0;

  // Check color compatibility
  if (answers['color-preference']) {
    const colorScore =
      styleMatrix.compatibilityMatrix.colorToStyle[answers['color-preference']]?.[primaryStyle] ||
      50;
    coherenceScore += colorScore;
    factors++;
  }

  // Check cabinet compatibility
  if (answers['cabinet-style']) {
    const isRecommended = styleConfig.recommendedCabinets.includes(answers['cabinet-style']);
    coherenceScore += isRecommended ? 100 : 50;
    factors++;
  }

  // Check countertop compatibility
  if (answers['countertop-material']) {
    const isRecommended = styleConfig.recommendedCountertops.includes(
      answers['countertop-material']
    );
    coherenceScore += isRecommended ? 100 : 60;
    factors++;
  }

  // Check hardware compatibility
  if (answers['hardware-style']) {
    const isRecommended = styleConfig.recommendedHardware.includes(answers['hardware-style']);
    coherenceScore += isRecommended ? 100 : 60;
    factors++;
  }

  // Check finish compatibility
  if (answers['hardware-finish']) {
    const isRecommended = styleConfig.recommendedFinishes.includes(answers['hardware-finish']);
    coherenceScore += isRecommended ? 100 : 70;
    factors++;
  }

  // Check backsplash compatibility
  if (answers['backsplash-preference']) {
    const isRecommended = styleConfig.recommendedBacksplash.includes(
      answers['backsplash-preference']
    );
    coherenceScore += isRecommended ? 100 : 65;
    factors++;
  }

  // Check flooring compatibility
  if (answers['flooring-preference']) {
    const isRecommended = styleConfig.recommendedFlooring.includes(answers['flooring-preference']);
    coherenceScore += isRecommended ? 100 : 70;
    factors++;
  }

  return factors > 0 ? Math.round(coherenceScore / (factors + 1)) : 50;
}

/**
 * Detect style conflicts between selected elements
 */
function detectStyleConflicts(answers, elementScores) {
  const conflicts = [];
  const primaryStyle = answers['kitchen-style'];

  // Check for modern style with traditional elements
  if (primaryStyle === 'modern' || primaryStyle === 'contemporary') {
    if (answers['cabinet-style'] === 'raised-panel') {
      conflicts.push({
        code: 'MODERN_WITH_TRADITIONAL_CABINETS',
        severity: 'medium',
        elements: ['kitchen-style', 'cabinet-style'],
        message: {
          en: 'Raised panel cabinets typically clash with modern aesthetics',
          fr: "Les armoires à panneaux surélevés entrent généralement en conflit avec l'esthétique moderne",
        },
      });
    }
    if (answers['hardware-style'] === 'ornate' || answers['hardware-style'] === 'cup-pulls') {
      conflicts.push({
        code: 'MODERN_WITH_ORNATE_HARDWARE',
        severity: 'low',
        elements: ['kitchen-style', 'hardware-style'],
        message: {
          en: 'Ornate hardware may feel out of place in a modern kitchen',
          fr: 'Les ferrures ornées peuvent sembler déplacées dans une cuisine moderne',
        },
      });
    }
  }

  // Check for traditional style with modern elements
  if (primaryStyle === 'traditional' || primaryStyle === 'victorian') {
    if (answers['cabinet-style'] === 'flat-panel' || answers['cabinet-style'] === 'slab') {
      conflicts.push({
        code: 'TRADITIONAL_WITH_MODERN_CABINETS',
        severity: 'medium',
        elements: ['kitchen-style', 'cabinet-style'],
        message: {
          en: 'Flat panel cabinets may feel too contemporary for a traditional kitchen',
          fr: 'Les armoires à panneaux plats peuvent sembler trop contemporaines pour une cuisine traditionnelle',
        },
      });
    }
    if (answers['hardware-style'] === 'handleless') {
      conflicts.push({
        code: 'TRADITIONAL_WITH_HANDLELESS',
        severity: 'high',
        elements: ['kitchen-style', 'hardware-style'],
        message: {
          en: 'Handleless cabinets strongly conflict with traditional aesthetics',
          fr: "Les armoires sans poignées entrent fortement en conflit avec l'esthétique traditionnelle",
        },
      });
    }
  }

  // Check color scheme conflicts
  if (answers['color-preference'] === 'neutral-dark' && answers['kitchen-style'] === 'coastal') {
    conflicts.push({
      code: 'DARK_COASTAL_CONFLICT',
      severity: 'medium',
      elements: ['color-preference', 'kitchen-style'],
      message: {
        en: 'Dark colors typically contrast with bright, airy coastal aesthetics',
        fr: "Les couleurs sombres contrastent généralement avec l'esthétique côtière lumineuse et aérée",
      },
    });
  }

  // Check material appropriateness
  if (
    answers['countertop-material'] === 'laminate' &&
    elementScores.materialQuality?.label === 'premium'
  ) {
    conflicts.push({
      code: 'LAMINATE_PREMIUM_CONFLICT',
      severity: 'low',
      elements: ['countertop-material', 'overall-quality'],
      message: {
        en: 'Laminate countertops may not align with premium material selections elsewhere',
        fr: "Les comptoirs en stratifié peuvent ne pas s'aligner avec les sélections de matériaux haut de gamme ailleurs",
      },
    });
  }

  return conflicts;
}

/**
 * Build comprehensive material profile
 */
function buildMaterialProfile(answers, elementScores) {
  return {
    countertop: {
      material: answers['countertop-material'],
      costTier: elementScores.countertopMaterial?.costTier,
      maintenanceLevel: elementScores.countertopMaterial?.maintenanceLevel,
    },
    cabinets: {
      style: answers['cabinet-style'],
      tags: elementScores.cabinetStyle?.tags || [],
    },
    flooring: {
      type: answers['flooring-preference'],
      maintenanceLevel: elementScores.flooringPreference?.maintenanceLevel,
    },
    hardware: {
      style: answers['hardware-style'],
      finish: answers['hardware-finish'],
    },
    backsplash: {
      type: answers['backsplash-preference'],
    },
    overall: {
      qualityTier: elementScores.materialQuality?.label,
      maintenanceLevel: elementScores.maintenanceLevel?.level,
    },
  };
}

/**
 * Calculate design complexity score
 */
function calculateDesignComplexity(answers) {
  let complexityPoints = 0;

  // Two-tone or colorful schemes add complexity
  if (answers['color-preference'] === 'two-tone') complexityPoints += 2;
  if (answers['color-preference'] === 'colorful') complexityPoints += 3;

  // Mixed hardware adds complexity
  if (answers['hardware-style'] === 'mixed') complexityPoints += 2;

  // Ornate or detailed styles add complexity
  if (answers['cabinet-style'] === 'raised-panel') complexityPoints += 2;
  if (answers['backsplash-preference']?.includes('mosaic')) complexityPoints += 2;
  if (answers['backsplash-preference']?.includes('patterned')) complexityPoints += 2;

  // Multiple lighting types add complexity
  const lighting = answers['lighting-style'] || [];
  if (lighting.length >= 3) complexityPoints += 2;

  const score = Math.min((complexityPoints / 10) * 100, 100);

  return {
    score,
    level: score >= 70 ? 'high' : score >= 40 ? 'moderate' : 'low',
    description: {
      en:
        score >= 70
          ? 'Complex, layered design'
          : score >= 40
            ? 'Moderate visual interest'
            : 'Simple, clean aesthetic',
      fr:
        score >= 70
          ? 'Design complexe et stratifié'
          : score >= 40
            ? 'Intérêt visuel modéré'
            : 'Esthétique simple et épurée',
    },
  };
}

/**
 * Calculate visual weight of the design
 */
function calculateVisualWeight(answers) {
  let weightPoints = 5; // Start at medium

  // Dark colors add weight
  if (answers['color-preference'] === 'neutral-dark') weightPoints += 3;
  if (answers['color-preference'] === 'neutral-warm') weightPoints += 1;
  if (answers['color-preference'] === 'neutral-light') weightPoints -= 2;

  // Heavy materials add weight
  if (answers['countertop-material'] === 'granite') weightPoints += 1;
  if (answers['countertop-material'] === 'marble') weightPoints += 1;
  if (answers['countertop-material'] === 'concrete') weightPoints += 2;

  // Cabinet styles affect weight
  if (answers['cabinet-style'] === 'raised-panel') weightPoints += 2;
  if (answers['cabinet-style'] === 'flat-panel') weightPoints -= 1;
  if (answers['cabinet-style'] === 'slab') weightPoints -= 2;

  const score = Math.max(0, Math.min(100, (weightPoints / 10) * 100));

  return {
    score,
    level: score >= 70 ? 'heavy' : score >= 40 ? 'medium' : 'light',
    description: {
      en:
        score >= 70
          ? 'Bold, substantial presence'
          : score >= 40
            ? 'Balanced visual weight'
            : 'Light, airy feel',
      fr:
        score >= 70
          ? 'Présence audacieuse et substantielle'
          : score >= 40
            ? 'Poids visuel équilibré'
            : 'Sensation légère et aérée',
    },
  };
}

/**
 * Calculate color harmony score
 */
function calculateColorHarmony(answers) {
  const colorScheme = answers['color-preference'];

  // Two-tone and colorful schemes require more careful planning
  let harmonyScore = 70;

  if (colorScheme === 'neutral-light' || colorScheme === 'neutral-warm') {
    harmonyScore = 90; // Easy to harmonize
  } else if (colorScheme === 'two-tone') {
    harmonyScore = 65; // Requires balance
  } else if (colorScheme === 'colorful') {
    harmonyScore = 55; // Challenging but rewarding
  }

  // Check if materials complement the color scheme
  const countertop = answers['countertop-material'];
  const flooring = answers['flooring-preference'];

  // Natural materials work well with warm tones
  if (colorScheme === 'neutral-warm' || colorScheme === 'natural') {
    if (
      ['butcher-block', 'natural-stone', 'hardwood'].includes(countertop) ||
      ['hardwood', 'natural-stone'].includes(flooring)
    ) {
      harmonyScore += 10;
    }
  }

  // Modern materials work with light/dark neutrals
  if (colorScheme === 'neutral-light' || colorScheme === 'neutral-dark') {
    if (['quartz', 'concrete'].includes(countertop)) {
      harmonyScore += 5;
    }
  }

  return {
    score: Math.min(100, harmonyScore),
    level: harmonyScore >= 80 ? 'excellent' : harmonyScore >= 60 ? 'good' : 'challenging',
    description: {
      en:
        harmonyScore >= 80
          ? 'Colors flow naturally together'
          : harmonyScore >= 60
            ? 'Good color coordination'
            : 'Requires careful color balancing',
      fr:
        harmonyScore >= 80
          ? "Les couleurs s'harmonisent naturellement"
          : harmonyScore >= 60
            ? 'Bonne coordination des couleurs'
            : 'Nécessite un équilibrage attentif des couleurs',
    },
  };
}

/**
 * Score kitchen style selection
 */
function scoreKitchenStyle(value) {
  if (!value) return null;

  const styleConfig = styleMatrix.styles[value];
  return {
    score: 100,
    style: value,
    characteristics: styleConfig?.characteristics || [],
    tags: styleConfig?.characteristics || [],
  };
}

/**
 * Score color preference with style compatibility
 */
function scoreColorPreference(value, primaryStyle) {
  if (!value) return null;

  let compatibilityScore = 75;
  if (primaryStyle) {
    compatibilityScore = styleMatrix.compatibilityMatrix.colorToStyle[value]?.[primaryStyle] || 50;
  }

  return {
    score: compatibilityScore,
    colorScheme: value,
    tags: getColorTags(value),
    warning:
      compatibilityScore < 50
        ? {
            code: 'COLOR_STYLE_MISMATCH',
            message: 'This color scheme is unconventional for your chosen style',
          }
        : null,
  };
}

/**
 * Score cabinet style
 */
function scoreCabinetStyle(value, primaryStyle) {
  if (!value) return null;

  const styleConfig = styleMatrix.styles[primaryStyle];
  const isRecommended = styleConfig?.recommendedCabinets?.includes(value);

  return {
    score: isRecommended ? 95 : 70,
    cabinetType: value,
    recommended: isRecommended,
    tags: getCabinetTags(value),
  };
}

/**
 * Score countertop material
 */
function scoreCountertopMaterial(value, primaryStyle) {
  if (!value) return null;

  const styleConfig = styleMatrix.styles[primaryStyle];
  const isRecommended = styleConfig?.recommendedCountertops?.includes(value);

  // Determine cost tier
  let costTier = 'mid-range';
  for (const [tier, materials] of Object.entries(styleMatrix.materialCostTiers)) {
    if (materials.includes(value)) {
      costTier = tier;
      break;
    }
  }

  // Determine maintenance level
  let maintenanceLevel = 'medium';
  for (const [level, materials] of Object.entries(styleMatrix.maintenanceLevels)) {
    if (materials.includes(value)) {
      maintenanceLevel = level;
      break;
    }
  }

  return {
    score: isRecommended ? 90 : 70,
    material: value,
    recommended: isRecommended,
    costTier,
    maintenanceLevel,
    tags: [value, costTier + '-cost', maintenanceLevel + '-maintenance'],
  };
}

/**
 * Score hardware style
 */
function scoreHardwareStyle(value, primaryStyle) {
  if (!value) return null;

  const styleConfig = styleMatrix.styles[primaryStyle];
  const isRecommended = styleConfig?.recommendedHardware?.includes(value);

  return {
    score: isRecommended ? 90 : 75,
    hardwareType: value,
    recommended: isRecommended,
    tags: getHardwareTags(value),
  };
}

/**
 * Score hardware finish
 */
function scoreHardwareFinish(value, primaryStyle) {
  if (!value) return null;

  const styleConfig = styleMatrix.styles[primaryStyle];
  const isRecommended = styleConfig?.recommendedFinishes?.includes(value);

  return {
    score: isRecommended ? 90 : 75,
    finish: value,
    recommended: isRecommended,
    tags: [value],
  };
}

/**
 * Score backsplash preference
 */
function scoreBacksplash(value, primaryStyle) {
  if (!value) return null;

  const styleConfig = styleMatrix.styles[primaryStyle];
  const isRecommended = styleConfig?.recommendedBacksplash?.includes(value);

  return {
    score: isRecommended ? 90 : 70,
    backsplashType: value,
    recommended: isRecommended,
    tags: [value],
  };
}

/**
 * Score flooring preference
 */
function scoreFlooring(value, primaryStyle) {
  if (!value) return null;

  const styleConfig = styleMatrix.styles[primaryStyle];
  const isRecommended = styleConfig?.recommendedFlooring?.includes(value);

  // Determine maintenance level
  let maintenanceLevel = 'medium';
  for (const [level, materials] of Object.entries(styleMatrix.maintenanceLevels)) {
    if (materials.includes(value)) {
      maintenanceLevel = level;
      break;
    }
  }

  return {
    score: isRecommended ? 90 : 70,
    flooringType: value,
    recommended: isRecommended,
    maintenanceLevel,
    tags: [value, maintenanceLevel + '-maintenance'],
  };
}

/**
 * Score lighting preferences
 */
function scoreLighting(values) {
  if (!values || !Array.isArray(values) || values.length === 0) {
    return { score: 50, features: [], tags: [] };
  }

  const tags = [];
  values.forEach((v) => {
    switch (v) {
      case 'pendant-lights':
        tags.push('decorative-lighting');
        break;
      case 'under-cabinet':
        tags.push('task-lighting');
        break;
      case 'smart-lighting':
        tags.push('smart-home');
        break;
      default:
        tags.push(v);
    }
  });

  return {
    score: 70 + values.length * 5,
    features: values,
    tags,
  };
}

/**
 * Calculate material quality score
 */
function calculateMaterialQualityScore(answers) {
  let score = 50;
  let factors = 0;

  if (answers['countertop-material']) {
    const premiumMaterials = ['marble', 'natural-stone', 'concrete'];
    if (premiumMaterials.includes(answers['countertop-material'])) {
      score += 30;
    } else if (['quartz', 'granite'].includes(answers['countertop-material'])) {
      score += 20;
    }
    factors++;
  }

  if (answers['flooring-preference']) {
    if (['hardwood', 'natural-stone'].includes(answers['flooring-preference'])) {
      score += 25;
    } else if (['engineered-wood', 'tile'].includes(answers['flooring-preference'])) {
      score += 15;
    }
    factors++;
  }

  return {
    score: factors > 0 ? Math.min(Math.round((score / factors) * 2), 100) : 50,
    label: score > 70 ? 'premium' : score > 40 ? 'mid-range' : 'budget',
  };
}

/**
 * Calculate maintenance score
 */
function calculateMaintenanceScore(answers) {
  let maintenancePoints = 0;
  let factors = 0;

  const highMaintenanceItems = ['marble', 'butcher-block', 'hardwood', 'natural-stone'];
  const lowMaintenanceItems = ['quartz', 'lvp', 'laminate', 'flat-panel'];

  for (const answer of Object.values(answers)) {
    if (typeof answer === 'string') {
      if (highMaintenanceItems.includes(answer)) {
        maintenancePoints += 3;
        factors++;
      } else if (lowMaintenanceItems.includes(answer)) {
        maintenancePoints += 1;
        factors++;
      }
    }
  }

  const avgMaintenance = factors > 0 ? maintenancePoints / factors : 2;

  return {
    score: Math.round(((3 - avgMaintenance) / 2) * 100),
    level: avgMaintenance > 2.5 ? 'high' : avgMaintenance > 1.5 ? 'medium' : 'low',
    label:
      avgMaintenance > 2.5
        ? 'High maintenance'
        : avgMaintenance > 1.5
          ? 'Moderate maintenance'
          : 'Low maintenance',
  };
}

/**
 * Determine budget tier based on material selections
 */
function determineBudgetTier(answers) {
  const budgetItems = styleMatrix.materialCostTiers.budget;
  const premiumItems = styleMatrix.materialCostTiers.premium;

  let budgetCount = 0;
  let premiumCount = 0;
  let total = 0;

  for (const answer of Object.values(answers)) {
    if (typeof answer === 'string') {
      if (budgetItems.includes(answer)) budgetCount++;
      if (premiumItems.includes(answer)) premiumCount++;
      total++;
    }
  }

  if (premiumCount >= total * 0.4) {
    return { tier: 'premium', label: 'Premium selections' };
  } else if (budgetCount >= total * 0.4) {
    return { tier: 'budget', label: 'Budget-conscious selections' };
  }
  return { tier: 'mid-range', label: 'Mid-range selections' };
}

/**
 * Generate comprehensive recommendations based on scores and conflicts
 */
function generateRecommendations(answers, elementScores, scores) {
  const recommendations = [];
  const primaryStyle = answers['kitchen-style'];
  const styleConfig = styleMatrix.styles[primaryStyle];

  if (!styleConfig) return recommendations;

  // Design persona recommendation
  if (scores.designPersona && scores.designPersona.score >= 60) {
    recommendations.push({
      id: 'design-persona-match',
      type: 'style',
      priority: 'info',
      title: {
        en: `${scores.designPersona.key
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')} Aesthetic`,
        fr: `Esthétique ${scores.designPersona.key.split('-').join(' ')}`,
      },
      description: {
        en: `Your selections align with a ${scores.designPersona.description.en.toLowerCase()}.`,
        fr: `Vos sélections correspondent à ${scores.designPersona.description.fr.toLowerCase()}.`,
      },
    });
  }

  // Style coherence recommendations
  if (scores.styleCoherence < 70) {
    recommendations.push({
      id: 'improve-coherence',
      type: 'style',
      priority: 'recommended',
      title: { en: 'Improve Style Coherence', fr: 'Améliorer la cohérence du style' },
      description: {
        en: `Consider elements that better match your ${primaryStyle} style for a more unified look. Current coherence: ${Math.round(scores.styleCoherence)}%`,
        fr: `Envisagez des éléments qui correspondent mieux à votre style ${primaryStyle} pour un look plus unifié. Cohérence actuelle: ${Math.round(scores.styleCoherence)}%`,
      },
    });
  } else if (scores.styleCoherence >= 85) {
    recommendations.push({
      id: 'excellent-coherence',
      type: 'style',
      priority: 'info',
      title: { en: 'Excellent Style Coherence', fr: 'Excellente cohérence de style' },
      description: {
        en: 'Your selections create a highly cohesive and professionally designed aesthetic.',
        fr: 'Vos sélections créent une esthétique très cohérente et professionnellement conçue.',
      },
    });
  }

  // Cabinet recommendations
  if (elementScores.cabinetStyle && !elementScores.cabinetStyle.recommended) {
    const recommendedCabinet = styleConfig.recommendedCabinets[0];
    recommendations.push({
      id: 'cabinet-suggestion',
      type: 'style',
      priority: 'optional',
      title: { en: 'Alternative Cabinet Style', fr: "Style d'armoire alternatif" },
      description: {
        en: `For ${primaryStyle} kitchens, ${recommendedCabinet} cabinets are typically recommended for better style alignment.`,
        fr: `Pour les cuisines ${primaryStyle}, les armoires ${recommendedCabinet} sont généralement recommandées pour un meilleur alignement de style.`,
      },
    });
  }

  // Hardware finish recommendations
  if (elementScores.hardwareFinish && !elementScores.hardwareFinish.recommended) {
    const recommendedFinish = styleConfig.recommendedFinishes[0];
    recommendations.push({
      id: 'hardware-finish-suggestion',
      type: 'style',
      priority: 'optional',
      title: { en: 'Hardware Finish Alternative', fr: 'Alternative de finition de quincaillerie' },
      description: {
        en: `${recommendedFinish} finishes typically complement ${primaryStyle} styles better.`,
        fr: `Les finitions ${recommendedFinish} complètent généralement mieux les styles ${primaryStyle}.`,
      },
    });
  }

  // Maintenance warnings and recommendations
  if (elementScores.countertopMaterial?.maintenanceLevel === 'high') {
    recommendations.push({
      id: 'maintenance-consideration',
      type: 'maintenance',
      priority: 'recommended',
      title: { en: 'High Maintenance Material', fr: "Matériau d'entretien élevé" },
      description: {
        en: `${answers['countertop-material']} requires regular sealing and careful maintenance. Consider quartz or solid surface if you prefer low-maintenance options.`,
        fr: `${answers['countertop-material']} nécessite un scellement régulier et un entretien attentif. Envisagez le quartz ou la surface solide si vous préférez des options à faible entretien.`,
      },
    });
  }

  // Budget tier recommendations
  if (scores.categories.budgetTier?.tier === 'premium') {
    recommendations.push({
      id: 'premium-materials-note',
      type: 'budget',
      priority: 'info',
      title: { en: 'Premium Material Selections', fr: 'Sélections de matériaux haut de gamme' },
      description: {
        en: 'Your material selections are in the premium tier. Budget accordingly for installation and long-term value.',
        fr: "Vos sélections de matériaux sont dans la gamme premium. Budgétisez en conséquence pour l'installation et la valeur à long terme.",
      },
    });
  } else if (scores.categories.budgetTier?.tier === 'budget') {
    recommendations.push({
      id: 'budget-materials-note',
      type: 'budget',
      priority: 'info',
      title: { en: 'Budget-Conscious Selections', fr: 'Sélections économiques' },
      description: {
        en: 'Your selections prioritize value. Consider investing in one or two premium elements for maximum impact.',
        fr: "Vos sélections privilégient la valeur. Envisagez d'investir dans un ou deux éléments premium pour un impact maximal.",
      },
    });
  }

  // Lighting recommendations
  const lighting = answers['lighting-style'] || [];
  if (lighting.length < 2) {
    recommendations.push({
      id: 'lighting-layers',
      type: 'lighting',
      priority: 'recommended',
      title: { en: 'Add Lighting Layers', fr: "Ajouter des couches d'éclairage" },
      description: {
        en: 'Consider multiple lighting types (task, ambient, accent) for a well-lit and functional kitchen.',
        fr: "Envisagez plusieurs types d'éclairage (tâche, ambiant, accent) pour une cuisine bien éclairée et fonctionnelle.",
      },
    });
  }

  // Color harmony recommendations
  if (scores.categories.colorHarmony?.score < 60) {
    recommendations.push({
      id: 'color-balance',
      type: 'color',
      priority: 'recommended',
      title: { en: 'Balance Color Scheme', fr: 'Équilibrer la palette de couleurs' },
      description: {
        en: 'Your color scheme is ambitious. Work with a designer to ensure proper balance and proportion.',
        fr: 'Votre palette de couleurs est ambitieuse. Travaillez avec un designer pour assurer un bon équilibre et proportion.',
      },
    });
  }

  // Conflict-based recommendations
  if (scores.conflicts && scores.conflicts.length > 0) {
    const highSeverityConflicts = scores.conflicts.filter((c) => c.severity === 'high');
    if (highSeverityConflicts.length > 0) {
      recommendations.push({
        id: 'resolve-conflicts',
        type: 'style',
        priority: 'essential',
        title: { en: 'Resolve Style Conflicts', fr: 'Résoudre les conflits de style' },
        description: {
          en: 'Some of your selections have significant style conflicts. Consider adjusting for better harmony.',
          fr: "Certaines de vos sélections présentent des conflits de style importants. Envisagez d'ajuster pour une meilleure harmonie.",
        },
      });
    }
  }

  // Design complexity recommendations
  if (scores.categories.designComplexity?.level === 'high') {
    recommendations.push({
      id: 'complex-design-note',
      type: 'design',
      priority: 'info',
      title: { en: 'Complex Design Approach', fr: 'Approche de conception complexe' },
      description: {
        en: 'Your design is visually complex. Professional installation and design consultation recommended.',
        fr: 'Votre conception est visuellement complexe. Installation professionnelle et consultation de conception recommandées.',
      },
    });
  }

  // Material quality alignment
  const materialQuality = scores.categories.materialQuality?.label;
  const budgetTier = scores.categories.budgetTier?.tier;

  if (materialQuality === 'premium' && budgetTier === 'budget') {
    recommendations.push({
      id: 'mixed-quality-tiers',
      type: 'budget',
      priority: 'optional',
      title: { en: 'Mixed Quality Tiers', fr: 'Niveaux de qualité mixtes' },
      description: {
        en: "You've mixed premium and budget selections. This can work well if done intentionally for strategic investments.",
        fr: 'Vous avez mélangé des sélections premium et économiques. Cela peut bien fonctionner si fait intentionnellement pour des investissements stratégiques.',
      },
    });
  }

  // Backsplash recommendation if missing
  if (!answers['backsplash-preference']) {
    recommendations.push({
      id: 'add-backsplash',
      type: 'material',
      priority: 'recommended',
      title: { en: 'Consider a Backsplash', fr: 'Envisagez un dosseret' },
      description: {
        en: 'A backsplash protects your walls and can be a focal point that ties your design together.',
        fr: 'Un dosseret protège vos murs et peut être un point focal qui unit votre conception.',
      },
    });
  }

  return recommendations;
}

// Helper functions
function getCoherenceLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Needs improvement';
}

function getCoherenceDescription(score) {
  if (score >= 90) {
    return {
      en: 'Your design selections work together beautifully with professional-level coherence.',
      fr: 'Vos sélections de design fonctionnent ensemble magnifiquement avec une cohérence de niveau professionnel.',
    };
  }
  if (score >= 75) {
    return {
      en: 'Your selections create a cohesive design with good style alignment.',
      fr: 'Vos sélections créent un design cohérent avec un bon alignement de style.',
    };
  }
  if (score >= 60) {
    return {
      en: 'Your design has reasonable coherence with room for refinement.',
      fr: "Votre design a une cohérence raisonnable avec place pour l'amélioration.",
    };
  }
  if (score >= 40) {
    return {
      en: 'Some elements conflict. Consider adjusting for better harmony.',
      fr: "Certains éléments sont en conflit. Envisagez d'ajuster pour une meilleure harmonie.",
    };
  }
  return {
    en: 'Significant style conflicts detected. Professional design consultation recommended.',
    fr: 'Conflits de style importants détectés. Consultation de conception professionnelle recommandée.',
  };
}

function getColorTags(color) {
  const tags = {
    'neutral-light': ['bright', 'airy', 'timeless'],
    'neutral-warm': ['cozy', 'inviting', 'classic'],
    'neutral-dark': ['dramatic', 'sophisticated', 'bold'],
    'two-tone': ['modern', 'dynamic', 'layered'],
    colorful: ['personality', 'unique', 'expressive'],
    natural: ['organic', 'warm', 'textured'],
  };
  return tags[color] || [];
}

function getCabinetTags(cabinet) {
  const tags = {
    'flat-panel': ['modern', 'minimalist', 'sleek'],
    shaker: ['versatile', 'classic', 'transitional'],
    'raised-panel': ['traditional', 'elegant', 'formal'],
    beadboard: ['cottage', 'farmhouse', 'charming'],
    'glass-front': ['display', 'airy', 'elegant'],
    louvered: ['tropical', 'unique', 'ventilated'],
  };
  return tags[cabinet] || [];
}

function getHardwareTags(hardware) {
  const tags = {
    handleless: ['modern', 'sleek', 'minimalist'],
    'bar-pulls': ['contemporary', 'versatile', 'ergonomic'],
    knobs: ['traditional', 'classic', 'charming'],
    'cup-pulls': ['vintage', 'farmhouse', 'character'],
    mixed: ['eclectic', 'personalized', 'layered'],
  };
  return tags[hardware] || [];
}

module.exports = {
  calculateSectionScore,
  identifyDesignPersona,
  calculateStyleCoherence,
  detectStyleConflicts,
  buildMaterialProfile,
  scoreKitchenStyle,
  scoreColorPreference,
  scoreCabinetStyle,
  scoreCountertopMaterial,
  scoreHardwareStyle,
  scoreHardwareFinish,
  scoreBacksplash,
  scoreFlooring,
  scoreLighting,
  calculateMaterialQualityScore,
  calculateMaintenanceScore,
  determineBudgetTier,
  calculateDesignComplexity,
  calculateVisualWeight,
  calculateColorHarmony,
  generateRecommendations,
  SCORE_WEIGHTS,
  DESIGN_PERSONAS,
  STYLE_COMPATIBILITY_SCORES,
};
