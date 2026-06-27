/**
 * Style Matcher Module
 *
 * Advanced style matching engine that analyzes user aesthetic preferences
 * and generates comprehensive design recommendations with material compatibility,
 * color theory, and style coherence scoring.
 *
 * @module StyleMatcher
 * @version 2.0.0
 */

/**
 * Style definitions with comprehensive characteristics and design attributes
 * Each style includes visual, functional, and compatibility parameters
 */
const STYLE_DEFINITIONS = {
  modern: {
    name: { en: 'Modern', fr: 'Moderne' },
    characteristics: [
      'clean-lines',
      'minimal-ornamentation',
      'flat-panel',
      'integrated-handles',
      'geometric-forms',
    ],
    colors: ['white', 'gray', 'black', 'bold-accent', 'matte-finishes'],
    materials: ['quartz', 'stainless-steel', 'glass', 'lacquer', 'porcelain'],
    hardware: ['hidden', 'integrated', 'bar-pulls', 'j-pulls'],
    compatible: ['contemporary', 'minimalist', 'industrial', 'scandinavian'],
    lighting: ['recessed', 'linear-led', 'geometric-pendant'],
    backsplash: ['large-format-tile', 'glass', 'solid-surface'],
    priceMultiplier: 1.15,
    maintenanceLevel: 'low',
  },
  traditional: {
    name: { en: 'Traditional', fr: 'Traditionnel' },
    characteristics: [
      'ornate-details',
      'raised-panel',
      'crown-molding',
      'furniture-look',
      'symmetry',
    ],
    colors: ['cream', 'white', 'wood-tones', 'rich-colors', 'warm-neutrals'],
    materials: ['granite', 'marble', 'wood', 'ceramic', 'natural-stone'],
    hardware: ['knobs', 'cup-pulls', 'ornate-handles', 'antique-brass'],
    compatible: ['classic', 'country', 'colonial', 'french-country'],
    lighting: ['chandelier', 'lantern', 'under-cabinet'],
    backsplash: ['subway-tile', 'natural-stone', 'decorative-tile'],
    priceMultiplier: 1.25,
    maintenanceLevel: 'medium',
  },
  transitional: {
    name: { en: 'Transitional', fr: 'Transitionnel' },
    characteristics: ['clean-simple', 'shaker-style', 'balanced', 'timeless', 'versatile'],
    colors: ['neutral', 'gray', 'white', 'soft-colors', 'greige'],
    materials: ['quartz', 'granite', 'wood', 'tile', 'engineered-stone'],
    hardware: ['simple-knobs', 'bar-pulls', 'bin-pulls', 'brushed-nickel'],
    compatible: ['modern', 'traditional', 'contemporary', 'coastal'],
    lighting: ['semi-flush', 'pendant', 'recessed'],
    backsplash: ['subway-tile', 'marble-look', 'neutral-tile'],
    priceMultiplier: 1.0,
    maintenanceLevel: 'low',
  },
  farmhouse: {
    name: { en: 'Farmhouse', fr: 'Ferme' },
    characteristics: [
      'rustic-charm',
      'open-shelving',
      'apron-sink',
      'natural-textures',
      'vintage-elements',
    ],
    colors: ['white', 'cream', 'sage', 'natural-wood', 'soft-blues'],
    materials: ['butcher-block', 'soapstone', 'reclaimed-wood', 'shiplap', 'copper'],
    hardware: ['cup-pulls', 'bin-pulls', 'black-iron', 'matte-black'],
    compatible: ['country', 'rustic', 'cottage', 'shabby-chic'],
    lighting: ['lantern', 'mason-jar', 'industrial-pendant'],
    backsplash: ['subway-tile', 'beadboard', 'brick'],
    priceMultiplier: 1.1,
    maintenanceLevel: 'medium',
  },
  contemporary: {
    name: { en: 'Contemporary', fr: 'Contemporain' },
    characteristics: [
      'current-trends',
      'mixed-materials',
      'bold-elements',
      'asymmetry',
      'artistic-flair',
    ],
    colors: ['bold-colors', 'contrast', 'metallics', 'texture', 'jewel-tones'],
    materials: ['mixed-metals', 'concrete', 'exotic-stone', 'glass', 'terrazzo'],
    hardware: ['statement-pieces', 'mixed-finishes', 'sculptural', 'leather-wrapped'],
    compatible: ['modern', 'industrial', 'eclectic', 'art-deco'],
    lighting: ['sculptural-pendant', 'linear', 'statement-fixture'],
    backsplash: ['patterned-tile', 'metallic', 'bold-color'],
    priceMultiplier: 1.3,
    maintenanceLevel: 'medium',
  },
  industrial: {
    name: { en: 'Industrial', fr: 'Industriel' },
    characteristics: [
      'exposed-elements',
      'raw-materials',
      'metal-accents',
      'utilitarian',
      'urban-loft',
    ],
    colors: ['gray', 'black', 'metallic', 'brick', 'weathered-wood'],
    materials: ['concrete', 'stainless-steel', 'reclaimed-wood', 'brick', 'zinc'],
    hardware: ['pipe-pulls', 'metal-bars', 'exposed-hinges', 'cast-iron'],
    compatible: ['modern', 'contemporary', 'loft', 'urban'],
    lighting: ['metal-cage', 'exposed-bulb', 'pipe-fixture'],
    backsplash: ['brick', 'metal', 'concrete'],
    priceMultiplier: 1.15,
    maintenanceLevel: 'low',
  },
  scandinavian: {
    name: { en: 'Scandinavian', fr: 'Scandinave' },
    characteristics: ['minimalist', 'functional', 'light-wood', 'hygge', 'nature-inspired'],
    colors: ['white', 'light-wood', 'soft-gray', 'muted-pastels', 'black-accents'],
    materials: ['light-wood', 'white-laminate', 'natural-stone', 'ceramic'],
    hardware: ['leather-pulls', 'wooden-knobs', 'simple-bar', 'integrated'],
    compatible: ['modern', 'minimalist', 'contemporary', 'nordic'],
    lighting: ['pendant', 'natural-light', 'task-lighting'],
    backsplash: ['white-tile', 'wood-look', 'simple-pattern'],
    priceMultiplier: 1.1,
    maintenanceLevel: 'low',
  },
  mediterranean: {
    name: { en: 'Mediterranean', fr: 'Méditerranéen' },
    characteristics: [
      'warm-tones',
      'textured-walls',
      'arched-elements',
      'ornate-details',
      'old-world-charm',
    ],
    colors: ['terracotta', 'olive', 'deep-blue', 'warm-cream', 'gold-accents'],
    materials: ['natural-stone', 'terracotta', 'wrought-iron', 'ceramic-tile', 'wood'],
    hardware: ['wrought-iron', 'bronze', 'ceramic-knobs', 'antique-finish'],
    compatible: ['tuscan', 'spanish', 'moroccan', 'greek'],
    lighting: ['wrought-iron-chandelier', 'lantern', 'sconce'],
    backsplash: ['hand-painted-tile', 'terracotta', 'mosaic'],
    priceMultiplier: 1.35,
    maintenanceLevel: 'high',
  },
};

/**
 * Enhanced material compatibility matrix with style affinity scores (0-100)
 */
const MATERIAL_COMPATIBILITY = {
  quartz: {
    styles: { modern: 95, transitional: 90, contemporary: 85, scandinavian: 80, industrial: 60 },
    priceRange: 'mid-high',
    durability: 95,
    maintenance: 'low',
  },
  granite: {
    styles: {
      traditional: 95,
      transitional: 85,
      farmhouse: 75,
      mediterranean: 80,
      contemporary: 60,
    },
    priceRange: 'mid',
    durability: 90,
    maintenance: 'medium',
  },
  marble: {
    styles: { traditional: 95, transitional: 85, modern: 75, mediterranean: 90, contemporary: 70 },
    priceRange: 'luxury',
    durability: 70,
    maintenance: 'high',
  },
  'butcher-block': {
    styles: { farmhouse: 95, transitional: 75, scandinavian: 85, country: 90, traditional: 65 },
    priceRange: 'mid',
    durability: 65,
    maintenance: 'high',
  },
  concrete: {
    styles: { industrial: 95, contemporary: 90, modern: 80, urban: 85 },
    priceRange: 'mid-high',
    durability: 85,
    maintenance: 'medium',
  },
  soapstone: {
    styles: { farmhouse: 90, traditional: 85, transitional: 75, country: 80 },
    priceRange: 'mid-high',
    durability: 80,
    maintenance: 'medium',
  },
  laminate: {
    styles: { modern: 70, contemporary: 65, scandinavian: 75, transitional: 60 },
    priceRange: 'budget',
    durability: 60,
    maintenance: 'low',
  },
  'solid-surface': {
    styles: { modern: 85, transitional: 80, contemporary: 75, scandinavian: 70 },
    priceRange: 'mid',
    durability: 75,
    maintenance: 'low',
  },
  porcelain: {
    styles: { modern: 90, contemporary: 85, transitional: 80, mediterranean: 75 },
    priceRange: 'mid-high',
    durability: 95,
    maintenance: 'low',
  },
  quartzite: {
    styles: { traditional: 90, transitional: 85, contemporary: 80, mediterranean: 85 },
    priceRange: 'luxury',
    durability: 95,
    maintenance: 'medium',
  },
  stainless: {
    styles: { industrial: 95, modern: 90, contemporary: 85, professional: 95 },
    priceRange: 'mid-high',
    durability: 90,
    maintenance: 'medium',
  },
};

/**
 * Color theory relationships for harmony calculation
 */
const COLOR_RELATIONSHIPS = {
  complementary: [
    ['white', 'black'],
    ['gray', 'wood-tones'],
    ['cream', 'deep-blue'],
    ['sage', 'terracotta'],
    ['soft-blues', 'warm-cream'],
  ],
  analogous: [
    ['white', 'cream', 'warm-neutrals'],
    ['gray', 'soft-gray', 'greige'],
    ['wood-tones', 'natural-wood', 'light-wood'],
    ['sage', 'olive', 'soft-blues'],
  ],
  monochromatic: [
    ['white', 'cream', 'soft-colors'],
    ['gray', 'soft-gray', 'black'],
    ['wood-tones', 'natural-wood', 'weathered-wood'],
  ],
};

/**
 * Scoring weights for style determination algorithm
 */
const SCORING_WEIGHTS = {
  directPreference: 0.35,
  cabinetStyle: 0.2,
  colorPreference: 0.15,
  materialChoice: 0.15,
  hardwareChoice: 0.1,
  lifestyleFactors: 0.05,
};

/**
 * Analyze style preferences and generate comprehensive style profile
 * @param {Object} responses - All questionnaire responses
 * @returns {Object} Complete style analysis with recommendations
 */
function analyzeStyle(responses) {
  const aestheticAnswers = responses['aesthetic-preferences'] || {};
  const lifestyleAnswers = responses['user-profile'] || {};
  const budgetAnswers = responses['budget-constraints'] || {};

  const analysis = {
    primaryStyle: null,
    secondaryStyles: [],
    styleScoreBreakdown: {},
    colorPalette: null,
    materialRecommendations: [],
    hardwareRecommendations: [],
    lightingRecommendations: [],
    backsplashRecommendations: [],
    coherenceScore: 0,
    confidenceLevel: 'medium',
    conflicts: [],
    recommendations: [],
    priceImpact: null,
    maintenanceProfile: null,
  };

  // Determine primary style with detailed scoring
  const styleResult = determinePrimaryStyle(aestheticAnswers, lifestyleAnswers);
  analysis.primaryStyle = styleResult.primary;
  analysis.styleScoreBreakdown = styleResult.scores;

  // Find compatible secondary styles with affinity scores
  analysis.secondaryStyles = findCompatibleStyles(analysis.primaryStyle, styleResult.scores);

  // Analyze color palette with harmony scoring
  analysis.colorPalette = analyzeColorPalette(aestheticAnswers, analysis.primaryStyle);

  // Generate material recommendations with budget consideration
  analysis.materialRecommendations = generateMaterialRecommendations(
    analysis.primaryStyle,
    aestheticAnswers,
    budgetAnswers
  );

  // Generate hardware recommendations
  analysis.hardwareRecommendations = generateHardwareRecommendations(
    analysis.primaryStyle,
    aestheticAnswers
  );

  // Generate lighting recommendations
  analysis.lightingRecommendations = generateLightingRecommendations(analysis.primaryStyle);

  // Generate backsplash recommendations
  analysis.backsplashRecommendations = generateBacksplashRecommendations(
    analysis.primaryStyle,
    analysis.materialRecommendations
  );

  // Calculate coherence score with weighted factors
  analysis.coherenceScore = calculateStyleCoherence(
    aestheticAnswers,
    analysis.primaryStyle,
    analysis
  );

  // Determine confidence level
  analysis.confidenceLevel = determineConfidenceLevel(analysis.primaryStyle.confidence);

  // Identify and analyze conflicts
  analysis.conflicts = identifyStyleConflicts(
    aestheticAnswers,
    analysis.primaryStyle,
    budgetAnswers
  );

  // Calculate price impact
  analysis.priceImpact = calculatePriceImpact(
    analysis.primaryStyle,
    analysis.materialRecommendations
  );

  // Determine maintenance profile
  analysis.maintenanceProfile = calculateMaintenanceProfile(analysis);

  // Generate comprehensive recommendations
  analysis.recommendations = generateStyleRecommendations(analysis, responses);

  return analysis;
}

/**
 * Advanced style determination with multi-factor scoring
 * @param {Object} aestheticAnswers - Aesthetic preference answers
 * @param {Object} lifestyleAnswers - Lifestyle/user profile answers
 * @returns {Object} Primary style and score breakdown
 */
function determinePrimaryStyle(aestheticAnswers, lifestyleAnswers) {
  const styleScores = {};

  // Initialize scores for all styles
  Object.keys(STYLE_DEFINITIONS).forEach((style) => {
    styleScores[style] = {
      total: 0,
      factors: {
        directPreference: 0,
        cabinetStyle: 0,
        colorPreference: 0,
        materialChoice: 0,
        hardwareChoice: 0,
        lifestyleFactors: 0,
      },
    };
  });

  // Factor 1: Direct style preference (35% weight)
  const preferredStyle = aestheticAnswers['preferred-style'];
  if (preferredStyle && STYLE_DEFINITIONS[preferredStyle]) {
    styleScores[preferredStyle].factors.directPreference = 100;

    // Boost compatible styles
    STYLE_DEFINITIONS[preferredStyle].compatible.forEach((compatStyle) => {
      if (styleScores[compatStyle]) {
        styleScores[compatStyle].factors.directPreference = 40;
      }
    });
  }

  // Factor 2: Cabinet style (20% weight)
  const cabinetStyle = aestheticAnswers['cabinet-style'];
  if (cabinetStyle) {
    const cabinetMapping = {
      'flat-panel': { modern: 100, contemporary: 85, scandinavian: 80, industrial: 70 },
      slab: { modern: 95, contemporary: 90, scandinavian: 75 },
      shaker: { transitional: 100, farmhouse: 90, scandinavian: 75, traditional: 60 },
      'raised-panel': { traditional: 100, mediterranean: 80, country: 75 },
      beadboard: { farmhouse: 95, country: 90, cottage: 85 },
      'glass-front': { transitional: 85, traditional: 80, contemporary: 75 },
      'open-shelving': { farmhouse: 90, industrial: 85, scandinavian: 80 },
      inset: { traditional: 95, transitional: 75 },
    };

    const mapping = cabinetMapping[cabinetStyle] || {};
    Object.entries(mapping).forEach(([style, score]) => {
      if (styleScores[style]) {
        styleScores[style].factors.cabinetStyle = score;
      }
    });
  }

  // Factor 3: Color preferences (15% weight)
  const colors = aestheticAnswers['color-preference'] || [];
  colors.forEach((color) => {
    Object.entries(STYLE_DEFINITIONS).forEach(([style, def]) => {
      if (def.colors.includes(color)) {
        styleScores[style].factors.colorPreference += 100 / Math.max(colors.length, 1);
      }
    });
  });

  // Factor 4: Material choice (15% weight)
  const material = aestheticAnswers['countertop-material'];
  if (material && MATERIAL_COMPATIBILITY[material]) {
    Object.entries(MATERIAL_COMPATIBILITY[material].styles || {}).forEach(([style, affinity]) => {
      if (styleScores[style]) {
        styleScores[style].factors.materialChoice = affinity;
      }
    });
  }

  // Factor 5: Hardware choice (10% weight)
  const hardware = aestheticAnswers['hardware-style'];
  if (hardware) {
    Object.entries(STYLE_DEFINITIONS).forEach(([style, def]) => {
      if (def.hardware.includes(hardware)) {
        styleScores[style].factors.hardwareChoice = 100;
      }
    });
  }

  // Factor 6: Lifestyle factors (5% weight)
  const householdType = lifestyleAnswers['household-type'];
  if (householdType) {
    const lifestyleMapping = {
      'family-young-kids': { transitional: 80, farmhouse: 75, traditional: 70 },
      'family-teens': { transitional: 85, contemporary: 70, modern: 65 },
      'single-professional': { modern: 90, contemporary: 85, industrial: 80 },
      'couple-no-kids': { contemporary: 85, modern: 80, transitional: 75 },
      retired: { traditional: 85, transitional: 80, farmhouse: 70 },
      'multi-generational': { transitional: 90, traditional: 80 },
    };

    const mapping = lifestyleMapping[householdType] || {};
    Object.entries(mapping).forEach(([style, score]) => {
      if (styleScores[style]) {
        styleScores[style].factors.lifestyleFactors = score;
      }
    });
  }

  // Calculate weighted totals
  Object.keys(styleScores).forEach((style) => {
    const factors = styleScores[style].factors;
    styleScores[style].total =
      factors.directPreference * SCORING_WEIGHTS.directPreference +
      factors.cabinetStyle * SCORING_WEIGHTS.cabinetStyle +
      factors.colorPreference * SCORING_WEIGHTS.colorPreference +
      factors.materialChoice * SCORING_WEIGHTS.materialChoice +
      factors.hardwareChoice * SCORING_WEIGHTS.hardwareChoice +
      factors.lifestyleFactors * SCORING_WEIGHTS.lifestyleFactors;
  });

  // Find highest scoring style
  let maxScore = 0;
  let primaryStyle = 'transitional'; // Default fallback

  Object.entries(styleScores).forEach(([style, data]) => {
    if (data.total > maxScore) {
      maxScore = data.total;
      primaryStyle = style;
    }
  });

  // Calculate confidence based on score gap
  const sortedScores = Object.entries(styleScores).sort((a, b) => b[1].total - a[1].total);
  const scoreGap = sortedScores[0][1].total - (sortedScores[1]?.[1]?.total || 0);
  const confidence = Math.min(100, maxScore + scoreGap * 0.5);

  return {
    primary: {
      style: primaryStyle,
      definition: STYLE_DEFINITIONS[primaryStyle],
      confidence: Math.round(confidence),
      score: Math.round(maxScore),
    },
    scores: styleScores,
  };
}

/**
 * Find compatible secondary styles with affinity scoring
 */
function findCompatibleStyles(primaryStyle, allScores) {
  if (!primaryStyle?.definition) return [];

  const secondaryStyles = [];

  // Add compatible styles from definition
  primaryStyle.definition.compatible.forEach((compatStyleName) => {
    const styleDef = STYLE_DEFINITIONS[compatStyleName];
    if (styleDef) {
      const score = allScores[compatStyleName]?.total || 0;
      secondaryStyles.push({
        style: compatStyleName,
        definition: styleDef,
        affinity: calculateStyleAffinity(primaryStyle.style, compatStyleName),
        score: Math.round(score),
      });
    }
  });

  // Add other high-scoring styles
  Object.entries(allScores)
    .filter(([style]) => style !== primaryStyle.style)
    .filter(([style, data]) => data.total > 30)
    .forEach(([style, data]) => {
      if (!secondaryStyles.find((s) => s.style === style)) {
        secondaryStyles.push({
          style,
          definition: STYLE_DEFINITIONS[style],
          affinity: calculateStyleAffinity(primaryStyle.style, style),
          score: Math.round(data.total),
        });
      }
    });

  return secondaryStyles.sort((a, b) => b.affinity - a.affinity).slice(0, 4);
}

/**
 * Calculate affinity between two styles
 */
function calculateStyleAffinity(style1, style2) {
  const def1 = STYLE_DEFINITIONS[style1];
  const def2 = STYLE_DEFINITIONS[style2];

  if (!def1 || !def2) return 0;

  let affinity = 0;

  // Check if directly compatible
  if (def1.compatible.includes(style2)) affinity += 40;

  // Check shared characteristics
  const sharedChars = def1.characteristics.filter((c) => def2.characteristics.includes(c));
  affinity += sharedChars.length * 10;

  // Check shared colors
  const sharedColors = def1.colors.filter((c) => def2.colors.includes(c));
  affinity += sharedColors.length * 5;

  // Check shared materials
  const sharedMaterials = def1.materials.filter((m) => def2.materials.includes(m));
  affinity += sharedMaterials.length * 5;

  return Math.min(100, affinity);
}

/**
 * Analyze color palette with harmony scoring
 */
function analyzeColorPalette(aestheticAnswers, primaryStyle) {
  const selectedColors = aestheticAnswers['color-preference'] || [];
  const styleColors = primaryStyle?.definition?.colors || [];

  const palette = {
    selected: selectedColors,
    recommended: styleColors,
    harmony: calculateColorHarmony(selectedColors, styleColors),
    harmonyType: determineHarmonyType(selectedColors),
    suggestions: generateColorSuggestions(selectedColors, styleColors, primaryStyle),
    accentSuggestions: generateAccentColorSuggestions(selectedColors, primaryStyle),
  };

  return palette;
}

/**
 * Calculate color harmony score with color theory
 */
function calculateColorHarmony(selected, recommended) {
  if (selected.length === 0) return 100;

  let harmonyScore = 0;

  // Base score: matching recommended colors
  const matchCount = selected.filter((c) => recommended.includes(c)).length;
  harmonyScore += (matchCount / selected.length) * 50;

  // Bonus for complementary pairs
  COLOR_RELATIONSHIPS.complementary.forEach((pair) => {
    if (selected.includes(pair[0]) && selected.includes(pair[1])) {
      harmonyScore += 15;
    }
  });

  // Bonus for analogous groups
  COLOR_RELATIONSHIPS.analogous.forEach((group) => {
    const matchedInGroup = selected.filter((c) => group.includes(c)).length;
    if (matchedInGroup >= 2) {
      harmonyScore += 10;
    }
  });

  // Penalty for too many colors
  if (selected.length > 4) {
    harmonyScore -= (selected.length - 4) * 5;
  }

  return Math.max(0, Math.min(100, Math.round(harmonyScore)));
}

/**
 * Determine the type of color harmony
 */
function determineHarmonyType(selectedColors) {
  if (selectedColors.length <= 1) return 'neutral';

  // Check for monochromatic
  for (const group of COLOR_RELATIONSHIPS.monochromatic) {
    const matched = selectedColors.filter((c) => group.includes(c)).length;
    if (matched >= 2) return 'monochromatic';
  }

  // Check for complementary
  for (const pair of COLOR_RELATIONSHIPS.complementary) {
    if (selectedColors.includes(pair[0]) && selectedColors.includes(pair[1])) {
      return 'complementary';
    }
  }

  // Check for analogous
  for (const group of COLOR_RELATIONSHIPS.analogous) {
    const matched = selectedColors.filter((c) => group.includes(c)).length;
    if (matched >= 2) return 'analogous';
  }

  return 'eclectic';
}

/**
 * Generate enhanced color suggestions
 */
function generateColorSuggestions(selected, recommended, primaryStyle) {
  const suggestions = [];

  // Suggest missing recommended colors
  recommended.forEach((color) => {
    if (!selected.includes(color)) {
      suggestions.push({
        color,
        priority: 'high',
        reason: {
          en: `${formatColorName(color)} complements ${primaryStyle?.definition?.name?.en || 'your'} style perfectly.`,
          fr: `${formatColorName(color)} complète parfaitement le style ${primaryStyle?.definition?.name?.fr || 'choisi'}.`,
        },
      });
    }
  });

  // Suggest complementary colors
  selected.forEach((selectedColor) => {
    COLOR_RELATIONSHIPS.complementary.forEach((pair) => {
      if (pair.includes(selectedColor)) {
        const complement = pair.find((c) => c !== selectedColor);
        if (
          complement &&
          !selected.includes(complement) &&
          !suggestions.find((s) => s.color === complement)
        ) {
          suggestions.push({
            color: complement,
            priority: 'medium',
            reason: {
              en: `${formatColorName(complement)} creates beautiful contrast with ${formatColorName(selectedColor)}.`,
              fr: `${formatColorName(complement)} crée un beau contraste avec ${formatColorName(selectedColor)}.`,
            },
          });
        }
      }
    });
  });

  return suggestions.slice(0, 4);
}

/**
 * Generate accent color suggestions
 */
function generateAccentColorSuggestions(selectedColors, primaryStyle) {
  const styleDef = primaryStyle?.definition;
  if (!styleDef) return [];

  const accentColors = {
    modern: ['bold-accent', 'black', 'metallic'],
    traditional: ['rich-colors', 'gold-accents', 'deep-blue'],
    transitional: ['soft-colors', 'muted-pastels'],
    farmhouse: ['sage', 'soft-blues', 'terracotta'],
    contemporary: ['jewel-tones', 'metallics', 'bold-colors'],
    industrial: ['metallic', 'brick', 'orange-accents'],
    scandinavian: ['muted-pastels', 'black-accents', 'natural-wood'],
    mediterranean: ['deep-blue', 'gold-accents', 'terracotta'],
  };

  const styleAccents = accentColors[primaryStyle.style] || [];

  return styleAccents
    .filter((accent) => !selectedColors.includes(accent))
    .slice(0, 2)
    .map((accent) => ({
      color: accent,
      usage: {
        en: `Use ${formatColorName(accent)} for small accents and accessories.`,
        fr: `Utilisez ${formatColorName(accent)} pour les petits accents et accessoires.`,
      },
    }));
}

/**
 * Format color name for display
 */
function formatColorName(color) {
  return color
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate material recommendations with enhanced scoring
 */
function generateMaterialRecommendations(primaryStyle, aestheticAnswers, budgetAnswers) {
  const recommendations = [];
  const styleName = primaryStyle?.style;
  const budgetTier = determineBudgetTier(budgetAnswers['total-budget']);

  Object.entries(MATERIAL_COMPATIBILITY).forEach(([material, data]) => {
    const styleAffinity = data.styles?.[styleName] || 0;

    if (styleAffinity >= 60) {
      const budgetFit = checkMaterialBudget(data.priceRange, budgetTier);

      recommendations.push({
        material,
        styleAffinity,
        budgetFit: budgetFit.fits,
        budgetNote: budgetFit.note,
        priceRange: data.priceRange,
        durability: data.durability,
        maintenance: data.maintenance,
        score: calculateMaterialScore(styleAffinity, budgetFit.fits, data.durability),
      });
    }
  });

  // Sort by composite score
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations.slice(0, 6).map((rec) => ({
    ...rec,
    recommendation: {
      en: getMaterialDescription(rec.material, rec.budgetFit),
      fr: getMaterialDescriptionFr(rec.material, rec.budgetFit),
    },
  }));
}

/**
 * Calculate composite material score
 */
function calculateMaterialScore(styleAffinity, budgetFit, durability) {
  return styleAffinity * 0.5 + (budgetFit ? 30 : 0) + durability * 0.2;
}

/**
 * Determine budget tier from budget key
 */
function determineBudgetTier(budgetKey) {
  const tierMap = {
    'under-10k': 'budget',
    '10k-25k': 'budget',
    '25k-50k': 'mid',
    '50k-75k': 'mid-high',
    '75k-100k': 'luxury',
    'over-100k': 'luxury',
  };
  return tierMap[budgetKey] || 'mid';
}

/**
 * Check if material fits budget with notes
 */
function checkMaterialBudget(materialRange, budgetTier) {
  const levels = { budget: 1, mid: 2, 'mid-high': 3, luxury: 4 };
  const materialLevel = levels[materialRange] || 2;
  const budgetLevel = levels[budgetTier] || 2;

  const fits = materialLevel <= budgetLevel;
  let note = null;

  if (!fits) {
    note = {
      en: 'May exceed budget - consider alternatives',
      fr: 'Peut dépasser le budget - envisagez des alternatives',
    };
  }

  return { fits, note };
}

/**
 * Get material description in English
 */
function getMaterialDescription(material, budgetFit) {
  const descriptions = {
    quartz: 'Engineered quartz offers durability and low maintenance',
    granite: 'Natural granite provides timeless beauty and heat resistance',
    marble: 'Elegant marble adds luxury but requires more maintenance',
    'butcher-block': 'Warm butcher block is perfect for food prep areas',
    concrete: 'Custom concrete creates an industrial statement',
    soapstone: 'Soapstone offers unique patina and heat resistance',
    laminate: 'Modern laminate is budget-friendly and versatile',
    'solid-surface': 'Solid surface is seamless and easy to repair',
    porcelain: 'Porcelain slabs are durable and design-forward',
    quartzite: 'Natural quartzite combines beauty with extreme durability',
    stainless: 'Stainless steel is hygienic and professional',
  };

  let desc = descriptions[material] || `${material} countertops`;
  if (!budgetFit) desc += ' (consider for statement areas only)';

  return desc;
}

/**
 * Get material description in French
 */
function getMaterialDescriptionFr(material, budgetFit) {
  const descriptions = {
    quartz: 'Le quartz offre durabilité et entretien facile',
    granite: 'Le granit naturel apporte beauté intemporelle et résistance à la chaleur',
    marble: "Le marbre élégant ajoute du luxe mais nécessite plus d'entretien",
    'butcher-block': 'Le bloc de boucher est parfait pour les zones de préparation',
    concrete: 'Le béton crée un statement industriel',
    soapstone: 'La stéatite offre une patine unique et résistance à la chaleur',
    laminate: 'Le stratifié est économique et polyvalent',
    'solid-surface': 'Le solid surface est sans joints et facile à réparer',
    porcelain: 'Le grès cérame est durable et design',
    quartzite: 'Le quartzite combine beauté et durabilité extrême',
    stainless: "L'acier inoxydable est hygiénique et professionnel",
  };

  let desc = descriptions[material] || `Comptoirs en ${material}`;
  if (!budgetFit) desc += " (à considérer pour zones d'accent uniquement)";

  return desc;
}

/**
 * Generate hardware recommendations with finish options
 */
function generateHardwareRecommendations(primaryStyle, aestheticAnswers) {
  const styleDef = primaryStyle?.definition;
  if (!styleDef) return [];

  const finishes = {
    modern: ['brushed-nickel', 'matte-black', 'polished-chrome'],
    traditional: ['antique-brass', 'oil-rubbed-bronze', 'polished-brass'],
    transitional: ['brushed-nickel', 'satin-brass', 'polished-chrome'],
    farmhouse: ['matte-black', 'antique-brass', 'oil-rubbed-bronze'],
    contemporary: ['mixed-metals', 'brushed-gold', 'matte-black'],
    industrial: ['matte-black', 'raw-steel', 'aged-bronze'],
    scandinavian: ['natural-wood', 'leather', 'matte-white'],
    mediterranean: ['wrought-iron', 'antique-bronze', 'ceramic'],
  };

  const styleFinishes = finishes[primaryStyle.style] || ['brushed-nickel'];

  return styleDef.hardware.map((hardware, index) => ({
    type: hardware,
    style: primaryStyle.style,
    suggestedFinish: styleFinishes[Math.min(index, styleFinishes.length - 1)],
    allFinishes: styleFinishes,
    description: getHardwareDescription(hardware),
  }));
}

/**
 * Get hardware description with bilingual support
 */
function getHardwareDescription(hardware) {
  const descriptions = {
    hidden: {
      en: 'Push-to-open or integrated handles for seamless look',
      fr: 'Ouverture push ou poignées intégrées pour un look épuré',
    },
    integrated: {
      en: 'Built into cabinet design for clean lines',
      fr: 'Intégrées dans le design pour des lignes épurées',
    },
    'bar-pulls': {
      en: 'Sleek bar-style handles for modern appeal',
      fr: 'Poignées barres élégantes pour un look moderne',
    },
    'j-pulls': { en: 'Minimalist J-shaped edge pulls', fr: 'Tirettes J minimalistes en bordure' },
    knobs: {
      en: 'Classic round knobs for timeless look',
      fr: 'Boutons ronds classiques pour un look intemporel',
    },
    'cup-pulls': {
      en: 'Bin-style cup pulls for vintage charm',
      fr: 'Tirettes coquille pour un charme vintage',
    },
    'ornate-handles': {
      en: 'Decorative handles for traditional elegance',
      fr: 'Poignées décoratives pour une élégance traditionnelle',
    },
    'antique-brass': {
      en: 'Antique brass finish for warmth',
      fr: 'Finition laiton antique pour la chaleur',
    },
    'bin-pulls': {
      en: 'Traditional bin-style for classic kitchens',
      fr: 'Style bac traditionnel pour cuisines classiques',
    },
    'black-iron': {
      en: 'Black iron hardware for farmhouse style',
      fr: 'Quincaillerie fer noir style ferme',
    },
    'matte-black': {
      en: 'Matte black finish for bold contrast',
      fr: 'Finition noir mat pour un contraste audacieux',
    },
    'simple-knobs': {
      en: 'Clean, simple knobs for versatility',
      fr: 'Boutons simples pour la polyvalence',
    },
    'statement-pieces': {
      en: 'Bold artistic hardware as focal points',
      fr: 'Quincaillerie artistique comme points focaux',
    },
    'mixed-finishes': {
      en: 'Combined finishes for visual interest',
      fr: 'Finitions combinées pour intérêt visuel',
    },
    sculptural: { en: 'Sculptural artistic pieces', fr: 'Pièces sculpturales artistiques' },
    'leather-wrapped': {
      en: 'Leather-wrapped pulls for texture',
      fr: 'Tirettes gainées de cuir pour la texture',
    },
    'pipe-pulls': {
      en: 'Industrial pipe-style for loft look',
      fr: 'Style tuyau industriel pour look loft',
    },
    'metal-bars': {
      en: 'Raw metal bars for industrial edge',
      fr: 'Barres métal brut pour style industriel',
    },
    'exposed-hinges': {
      en: 'Visible hinges for utilitarian aesthetic',
      fr: 'Charnières visibles pour esthétique utilitaire',
    },
    'cast-iron': { en: 'Cast iron for rustic durability', fr: 'Fonte pour durabilité rustique' },
    'leather-pulls': {
      en: 'Leather pulls for Scandinavian warmth',
      fr: 'Tirettes cuir pour chaleur scandinave',
    },
    'wooden-knobs': {
      en: 'Wooden knobs for natural touch',
      fr: 'Boutons bois pour touche naturelle',
    },
    'simple-bar': {
      en: 'Simple bar pulls for clean design',
      fr: 'Barres simples pour design épuré',
    },
    'wrought-iron': {
      en: 'Wrought iron for Mediterranean charm',
      fr: 'Fer forgé pour charme méditerranéen',
    },
    bronze: {
      en: 'Bronze finish for warm elegance',
      fr: 'Finition bronze pour élégance chaleureuse',
    },
    'ceramic-knobs': {
      en: 'Hand-painted ceramic for artisan touch',
      fr: 'Céramique peinte pour touche artisanale',
    },
    'antique-finish': {
      en: 'Antique finish for old-world charm',
      fr: 'Finition antique pour charme ancien',
    },
  };

  return descriptions[hardware] || { en: formatColorName(hardware), fr: formatColorName(hardware) };
}

/**
 * Generate lighting recommendations based on style
 */
function generateLightingRecommendations(primaryStyle) {
  const styleDef = primaryStyle?.definition;
  if (!styleDef) return [];

  const lightingDetails = {
    recessed: { zones: ['general'], dimmable: true },
    'linear-led': { zones: ['task', 'under-cabinet'], dimmable: true },
    'geometric-pendant': { zones: ['island', 'focal'], dimmable: true },
    chandelier: { zones: ['focal', 'dining'], dimmable: true },
    lantern: { zones: ['focal', 'accent'], dimmable: false },
    'under-cabinet': { zones: ['task'], dimmable: true },
    'semi-flush': { zones: ['general'], dimmable: true },
    pendant: { zones: ['island', 'task'], dimmable: true },
    'mason-jar': { zones: ['accent', 'island'], dimmable: false },
    'industrial-pendant': { zones: ['island', 'task'], dimmable: true },
    'sculptural-pendant': { zones: ['focal', 'island'], dimmable: true },
    linear: { zones: ['island', 'task'], dimmable: true },
    'statement-fixture': { zones: ['focal'], dimmable: true },
    'metal-cage': { zones: ['island', 'accent'], dimmable: false },
    'exposed-bulb': { zones: ['accent', 'task'], dimmable: true },
    'pipe-fixture': { zones: ['industrial', 'task'], dimmable: false },
    'natural-light': { zones: ['general'], dimmable: false },
    'task-lighting': { zones: ['task', 'under-cabinet'], dimmable: true },
    'wrought-iron-chandelier': { zones: ['focal', 'dining'], dimmable: true },
    sconce: { zones: ['accent', 'wall'], dimmable: true },
  };

  return styleDef.lighting.map((lightType) => ({
    type: lightType,
    style: primaryStyle.style,
    details: lightingDetails[lightType] || { zones: ['general'], dimmable: true },
    description: getLightingDescription(lightType),
  }));
}

/**
 * Get lighting description
 */
function getLightingDescription(lightType) {
  const descriptions = {
    recessed: { en: 'Clean ceiling-mounted downlights', fr: 'Spots encastrés au plafond' },
    'linear-led': {
      en: 'Modern LED strips for task areas',
      fr: 'Bandes LED modernes pour zones de travail',
    },
    'geometric-pendant': {
      en: 'Angular pendant lights over island',
      fr: "Suspensions géométriques au-dessus de l'îlot",
    },
    chandelier: {
      en: 'Elegant chandelier for focal point',
      fr: 'Lustre élégant comme point focal',
    },
    lantern: {
      en: 'Lantern-style fixtures for warmth',
      fr: 'Lanternes pour une ambiance chaleureuse',
    },
    pendant: {
      en: 'Pendant lights for island illumination',
      fr: "Suspensions pour éclairer l'îlot",
    },
  };

  return (
    descriptions[lightType] || { en: formatColorName(lightType), fr: formatColorName(lightType) }
  );
}

/**
 * Generate backsplash recommendations
 */
function generateBacksplashRecommendations(primaryStyle, materialRecs) {
  const styleDef = primaryStyle?.definition;
  if (!styleDef) return [];

  const backsplashDetails = {
    'large-format-tile': { grout: 'minimal', pattern: 'simple', maintenance: 'low' },
    glass: { grout: 'none', pattern: 'solid/printed', maintenance: 'low' },
    'solid-surface': { grout: 'none', pattern: 'seamless', maintenance: 'low' },
    'subway-tile': { grout: 'visible', pattern: 'brick/herringbone', maintenance: 'medium' },
    'natural-stone': { grout: 'visible', pattern: 'natural', maintenance: 'high' },
    'decorative-tile': { grout: 'visible', pattern: 'decorative', maintenance: 'medium' },
    'marble-look': { grout: 'minimal', pattern: 'veined', maintenance: 'low' },
    'neutral-tile': { grout: 'minimal', pattern: 'simple', maintenance: 'low' },
    beadboard: { grout: 'none', pattern: 'vertical', maintenance: 'medium' },
    brick: { grout: 'visible', pattern: 'rustic', maintenance: 'medium' },
    'patterned-tile': { grout: 'visible', pattern: 'bold', maintenance: 'medium' },
    metallic: { grout: 'none/minimal', pattern: 'modern', maintenance: 'medium' },
    'bold-color': { grout: 'minimal', pattern: 'solid', maintenance: 'low' },
    metal: { grout: 'none', pattern: 'industrial', maintenance: 'medium' },
    concrete: { grout: 'none', pattern: 'textured', maintenance: 'medium' },
    'white-tile': { grout: 'visible', pattern: 'simple', maintenance: 'medium' },
    'wood-look': { grout: 'minimal', pattern: 'plank', maintenance: 'low' },
    'simple-pattern': { grout: 'minimal', pattern: 'subtle', maintenance: 'low' },
    'hand-painted-tile': { grout: 'visible', pattern: 'artisan', maintenance: 'medium' },
    terracotta: { grout: 'visible', pattern: 'rustic', maintenance: 'high' },
    mosaic: { grout: 'visible', pattern: 'intricate', maintenance: 'medium' },
  };

  // Match backsplash to countertop
  const primaryMaterial = materialRecs[0]?.material;

  return styleDef.backsplash.map((backsplashType) => ({
    type: backsplashType,
    style: primaryStyle.style,
    details: backsplashDetails[backsplashType] || {
      grout: 'visible',
      pattern: 'standard',
      maintenance: 'medium',
    },
    countertopPairing: getBacksplashPairing(backsplashType, primaryMaterial),
    description: getBacksplashDescription(backsplashType),
  }));
}

/**
 * Get backsplash pairing recommendation
 */
function getBacksplashPairing(backsplash, countertop) {
  const pairings = {
    quartz: ['subway-tile', 'large-format-tile', 'glass'],
    granite: ['subway-tile', 'natural-stone', 'neutral-tile'],
    marble: ['marble-look', 'subway-tile', 'neutral-tile'],
    'butcher-block': ['subway-tile', 'beadboard', 'brick'],
    concrete: ['metal', 'brick', 'large-format-tile'],
    soapstone: ['subway-tile', 'beadboard', 'natural-stone'],
  };

  const goodPairings = pairings[countertop] || [];
  return goodPairings.includes(backsplash) ? 'excellent' : 'good';
}

/**
 * Get backsplash description
 */
function getBacksplashDescription(backsplashType) {
  const descriptions = {
    'subway-tile': {
      en: 'Classic subway tile in various layouts',
      fr: 'Carrelage métro classique en diverses poses',
    },
    'large-format-tile': {
      en: 'Large tiles for minimal grout lines',
      fr: 'Grands carreaux pour joints minimaux',
    },
    glass: { en: 'Sleek glass panels for modern look', fr: 'Panneaux de verre pour look moderne' },
    'natural-stone': {
      en: 'Natural stone for organic beauty',
      fr: 'Pierre naturelle pour beauté organique',
    },
    brick: {
      en: 'Exposed brick for rustic character',
      fr: 'Brique apparente pour caractère rustique',
    },
  };

  return (
    descriptions[backsplashType] || {
      en: formatColorName(backsplashType),
      fr: formatColorName(backsplashType),
    }
  );
}

/**
 * Calculate comprehensive style coherence score
 */
function calculateStyleCoherence(aestheticAnswers, primaryStyle, analysis) {
  if (!primaryStyle?.definition) return 50;

  let coherenceScore = 0;
  const styleDef = primaryStyle.definition;
  const maxScore = 100;

  // Cabinet style alignment (25 points)
  const cabinetStyle = aestheticAnswers['cabinet-style'];
  if (cabinetStyle) {
    const cabinetMatch = styleDef.characteristics.some(
      (c) => c.includes(cabinetStyle) || cabinetStyle.includes(c.split('-')[0])
    );
    coherenceScore += cabinetMatch ? 25 : 10;
  } else {
    coherenceScore += 15; // Neutral if not specified
  }

  // Color harmony (25 points)
  coherenceScore += (analysis.colorPalette?.harmony || 50) * 0.25;

  // Material compatibility (20 points)
  const topMaterial = analysis.materialRecommendations[0];
  if (topMaterial) {
    coherenceScore += (topMaterial.styleAffinity / 100) * 20;
  } else {
    coherenceScore += 10;
  }

  // Hardware alignment (15 points)
  const hardware = aestheticAnswers['hardware-style'];
  if (hardware && styleDef.hardware.includes(hardware)) {
    coherenceScore += 15;
  } else if (!hardware) {
    coherenceScore += 10;
  } else {
    coherenceScore += 5;
  }

  // Conflict penalty (up to -15 points)
  const conflictPenalty = Math.min(15, (analysis.conflicts?.length || 0) * 5);
  coherenceScore -= conflictPenalty;

  return Math.max(0, Math.min(maxScore, Math.round(coherenceScore)));
}

/**
 * Determine confidence level label
 */
function determineConfidenceLevel(confidenceScore) {
  if (confidenceScore >= 80) return 'high';
  if (confidenceScore >= 60) return 'medium';
  if (confidenceScore >= 40) return 'low';
  return 'uncertain';
}

/**
 * Identify style conflicts with resolution suggestions
 */
function identifyStyleConflicts(aestheticAnswers, primaryStyle, budgetAnswers) {
  const conflicts = [];

  if (!primaryStyle?.definition) return conflicts;

  const styleName = primaryStyle.style;
  const styleDef = primaryStyle.definition;

  // Material-style conflict
  const material = aestheticAnswers['countertop-material'];
  if (material && MATERIAL_COMPATIBILITY[material]) {
    const styleAffinity = MATERIAL_COMPATIBILITY[material].styles?.[styleName] || 0;
    if (styleAffinity < 50) {
      const alternatives = Object.entries(MATERIAL_COMPATIBILITY)
        .filter(([_, data]) => (data.styles?.[styleName] || 0) >= 80)
        .map(([mat]) => mat)
        .slice(0, 2);

      conflicts.push({
        type: 'material-style',
        severity: styleAffinity < 30 ? 'high' : 'medium',
        element: material,
        style: styleName,
        message: {
          en: `${formatColorName(material)} is not typically used in ${styleDef.name.en} kitchens.`,
          fr: `${formatColorName(material)} n'est pas typiquement utilisé dans les cuisines ${styleDef.name.fr}.`,
        },
        resolution: {
          en: `Consider ${alternatives.join(' or ')} for better style alignment.`,
          fr: `Envisagez ${alternatives.join(' ou ')} pour une meilleure cohérence de style.`,
        },
      });
    }
  }

  // Cabinet-style conflict
  const cabinet = aestheticAnswers['cabinet-style'];
  const cabinetStyleMap = {
    'flat-panel': ['modern', 'contemporary', 'scandinavian', 'industrial'],
    shaker: ['transitional', 'farmhouse', 'scandinavian'],
    'raised-panel': ['traditional', 'mediterranean'],
    beadboard: ['farmhouse', 'cottage', 'country'],
  };

  if (cabinet && cabinetStyleMap[cabinet] && !cabinetStyleMap[cabinet].includes(styleName)) {
    conflicts.push({
      type: 'cabinet-style',
      severity: 'medium',
      element: cabinet,
      style: styleName,
      message: {
        en: `${formatColorName(cabinet)} cabinets may not align with ${styleDef.name.en} style.`,
        fr: `Les armoires ${formatColorName(cabinet)} peuvent ne pas correspondre au style ${styleDef.name.fr}.`,
      },
      resolution: {
        en: `Consider ${styleDef.characteristics[0]} style cabinets.`,
        fr: `Envisagez des armoires style ${styleDef.characteristics[0]}.`,
      },
    });
  }

  // Budget-style conflict
  const budgetTier = determineBudgetTier(budgetAnswers?.['total-budget']);
  if (budgetTier === 'budget' && styleDef.priceMultiplier > 1.2) {
    conflicts.push({
      type: 'budget-style',
      severity: 'high',
      style: styleName,
      message: {
        en: `${styleDef.name.en} style typically requires higher investment.`,
        fr: `Le style ${styleDef.name.fr} nécessite généralement un investissement plus élevé.`,
      },
      resolution: {
        en: 'Focus on key elements and use budget-friendly alternatives for secondary items.',
        fr: 'Concentrez-vous sur les éléments clés et utilisez des alternatives économiques pour les éléments secondaires.',
      },
    });
  }

  return conflicts;
}

/**
 * Calculate price impact based on style choices
 */
function calculatePriceImpact(primaryStyle, materialRecs) {
  const styleDef = primaryStyle?.definition;
  if (!styleDef) return { multiplier: 1.0, level: 'standard' };

  let totalMultiplier = styleDef.priceMultiplier || 1.0;

  // Add material impact
  if (materialRecs[0]) {
    const materialPricing = {
      budget: 0.8,
      mid: 1.0,
      'mid-high': 1.2,
      luxury: 1.5,
    };
    totalMultiplier *= materialPricing[materialRecs[0].priceRange] || 1.0;
  }

  let level = 'standard';
  if (totalMultiplier >= 1.4) level = 'premium';
  else if (totalMultiplier >= 1.2) level = 'above-average';
  else if (totalMultiplier <= 0.9) level = 'budget-friendly';

  return {
    multiplier: Math.round(totalMultiplier * 100) / 100,
    level,
    description: {
      en: `Expected price impact: ${Math.round((totalMultiplier - 1) * 100)}% ${totalMultiplier > 1 ? 'above' : 'below'} average`,
      fr: `Impact prix estimé: ${Math.round((totalMultiplier - 1) * 100)}% ${totalMultiplier > 1 ? 'au-dessus' : 'en dessous'} de la moyenne`,
    },
  };
}

/**
 * Calculate maintenance profile based on all selections
 */
function calculateMaintenanceProfile(analysis) {
  const styleMaintenance = analysis.primaryStyle?.definition?.maintenanceLevel || 'medium';
  const materialMaintenance = analysis.materialRecommendations[0]?.maintenance || 'medium';

  const levels = { low: 1, medium: 2, high: 3 };
  const avgLevel = (levels[styleMaintenance] + levels[materialMaintenance]) / 2;

  let level = 'medium';
  if (avgLevel <= 1.3) level = 'low';
  else if (avgLevel >= 2.3) level = 'high';

  const tips = {
    low: [
      {
        en: 'Wipe surfaces regularly with mild cleaner',
        fr: 'Essuyez les surfaces régulièrement avec un nettoyant doux',
      },
      {
        en: 'Clean spills promptly to prevent staining',
        fr: 'Nettoyez les déversements rapidement pour éviter les taches',
      },
    ],
    medium: [
      { en: 'Seal natural stone annually', fr: 'Scellez la pierre naturelle annuellement' },
      {
        en: 'Use appropriate cleaners for each surface',
        fr: 'Utilisez des nettoyants appropriés pour chaque surface',
      },
    ],
    high: [
      {
        en: 'Regular professional maintenance recommended',
        fr: 'Entretien professionnel régulier recommandé',
      },
      {
        en: 'Avoid acidic substances on sensitive surfaces',
        fr: 'Évitez les substances acides sur les surfaces sensibles',
      },
    ],
  };

  return {
    level,
    tips: tips[level] || tips.medium,
    description: {
      en: `Your selections require ${level} maintenance effort.`,
      fr: `Vos sélections nécessitent un effort d'entretien ${level === 'low' ? 'faible' : level === 'high' ? 'élevé' : 'moyen'}.`,
    },
  };
}

/**
 * Generate comprehensive style recommendations
 */
function generateStyleRecommendations(analysis, responses) {
  const recommendations = [];

  // Primary style recommendation
  recommendations.push({
    id: 'primary-style',
    type: 'style',
    priority: 'high',
    confidence: analysis.primaryStyle.confidence,
    title: {
      en: 'Your Design Style',
      fr: 'Votre style de design',
    },
    description: {
      en: `Based on your preferences, ${analysis.primaryStyle.definition.name.en} style is your best match with ${analysis.primaryStyle.confidence}% confidence.`,
      fr: `Selon vos préférences, le style ${analysis.primaryStyle.definition.name.fr} est votre meilleur choix avec ${analysis.primaryStyle.confidence}% de confiance.`,
    },
    details: analysis.primaryStyle.definition.characteristics,
  });

  // Secondary style options
  if (analysis.secondaryStyles.length > 0) {
    const topSecondary = analysis.secondaryStyles[0];
    recommendations.push({
      id: 'secondary-style',
      type: 'style',
      priority: 'medium',
      title: {
        en: 'Alternative Style Option',
        fr: 'Style alternatif',
      },
      description: {
        en: `${topSecondary.definition.name.en} style also aligns well with your preferences (${topSecondary.affinity}% affinity).`,
        fr: `Le style ${topSecondary.definition.name.fr} correspond également bien à vos préférences (${topSecondary.affinity}% d'affinité).`,
      },
    });
  }

  // Address conflicts
  analysis.conflicts.forEach((conflict, index) => {
    recommendations.push({
      id: `resolve-conflict-${index}`,
      type: 'conflict',
      priority: conflict.severity === 'high' ? 'high' : 'medium',
      title: {
        en: 'Design Consideration',
        fr: 'Considération de design',
      },
      description: conflict.message,
      resolution: conflict.resolution,
    });
  });

  // Coherence improvement
  if (analysis.coherenceScore < 70) {
    recommendations.push({
      id: 'improve-coherence',
      type: 'improvement',
      priority: 'medium',
      title: {
        en: 'Improve Design Coherence',
        fr: 'Améliorer la cohérence du design',
      },
      description: {
        en: `Your current coherence score is ${analysis.coherenceScore}%. Consider aligning more elements with your ${analysis.primaryStyle.definition.name.en} style.`,
        fr: `Votre score de cohérence actuel est de ${analysis.coherenceScore}%. Envisagez d'aligner plus d'éléments avec votre style ${analysis.primaryStyle.definition.name.fr}.`,
      },
    });
  }

  // Top material recommendation
  if (analysis.materialRecommendations.length > 0) {
    const topMaterial = analysis.materialRecommendations[0];
    recommendations.push({
      id: 'top-material',
      type: 'material',
      priority: 'high',
      title: {
        en: 'Recommended Countertop',
        fr: 'Comptoir recommandé',
      },
      description: topMaterial.recommendation,
      details: {
        material: topMaterial.material,
        durability: topMaterial.durability,
        maintenance: topMaterial.maintenance,
      },
    });
  }

  // Color palette suggestion
  if (analysis.colorPalette?.suggestions?.length > 0) {
    const topColorSuggestion = analysis.colorPalette.suggestions[0];
    recommendations.push({
      id: 'color-suggestion',
      type: 'color',
      priority: 'low',
      title: {
        en: 'Color Enhancement',
        fr: 'Amélioration de couleur',
      },
      description: topColorSuggestion.reason,
    });
  }

  // Price awareness
  if (analysis.priceImpact?.level === 'premium') {
    recommendations.push({
      id: 'price-awareness',
      type: 'budget',
      priority: 'medium',
      title: {
        en: 'Investment Consideration',
        fr: "Considération d'investissement",
      },
      description: analysis.priceImpact.description,
    });
  }

  return recommendations;
}

module.exports = {
  analyzeStyle,
  determinePrimaryStyle,
  findCompatibleStyles,
  analyzeColorPalette,
  calculateColorHarmony,
  generateMaterialRecommendations,
  generateHardwareRecommendations,
  generateLightingRecommendations,
  generateBacksplashRecommendations,
  calculateStyleCoherence,
  identifyStyleConflicts,
  generateStyleRecommendations,
  calculatePriceImpact,
  calculateMaintenanceProfile,
  STYLE_DEFINITIONS,
  MATERIAL_COMPATIBILITY,
  COLOR_RELATIONSHIPS,
  SCORING_WEIGHTS,
};
