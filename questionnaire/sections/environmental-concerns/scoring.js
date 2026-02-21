/**
 * Environmental Concerns Section Scoring Module
 *
 * Calculates environmental commitment scores, identifies eco personas,
 * and generates sustainability recommendations for kitchen design.
 * Covers energy efficiency, sustainable materials, water conservation,
 * and waste management.
 */

const SCORE_WEIGHTS = {
  ecoPriority: 0.30,
  energyEfficiency: 0.25,
  sustainableMaterials: 0.15,
  waterConservation: 0.15,
  wasteManagement: 0.15
};

const ECO_PRIORITY_SCORES = {
  'top-priority': 100,
  'important': 75,
  'nice-to-have': 50,
  'not-priority': 25
};

/**
 * Environmental personas
 * Maps user eco-preferences to distinct sustainability profiles
 */
const ECO_PERSONAS = {
  'eco-warrior': {
    description: {
      en: 'Highly committed to environmental sustainability across all choices',
      fr: 'Très engagé envers la durabilité environnementale dans tous les choix'
    },
    characteristics: ['top-priority', 'energy-star-only', 'sustainable-materials', 'water-saving', 'composting'],
    priorities: ['sustainability', 'carbon-footprint', 'lifecycle', 'certifications'],
    expectedCostImpact: 'premium',
    certifications: ['LEED', 'Energy Star', 'FSC', 'Greenguard']
  },
  'practical-green': {
    description: {
      en: 'Balances environmental responsibility with practical considerations',
      fr: 'Équilibre la responsabilité environnementale avec des considérations pratiques'
    },
    characteristics: ['important', 'energy-conscious', 'some-sustainable', 'recycling'],
    priorities: ['energy-savings', 'durability', 'value', 'efficiency'],
    expectedCostImpact: 'moderate-increase',
    certifications: ['Energy Star', 'WaterSense']
  },
  'cost-conscious-eco': {
    description: {
      en: 'Interested in eco-friendly options that provide cost savings',
      fr: 'Intéressé par des options écologiques qui offrent des économies de coûts'
    },
    characteristics: ['nice-to-have', 'energy-efficiency', 'utility-savings'],
    priorities: ['energy-bill-reduction', 'water-bill-reduction', 'roi'],
    expectedCostImpact: 'neutral-to-positive',
    certifications: ['Energy Star']
  },
  'standard-approach': {
    description: {
      en: 'Meets building codes with standard efficiency requirements',
      fr: 'Respecte les codes du bâtiment avec les exigences d\'efficacité standard'
    },
    characteristics: ['not-priority', 'standard-efficiency'],
    priorities: ['code-compliance', 'basic-efficiency'],
    expectedCostImpact: 'neutral',
    certifications: []
  }
};

function calculateSectionScore(answers) {
  const scores = {
    overall: 0,
    ecoLevel: 'standard',
    ecoPersona: null,
    categories: {},
    recommendations: [],
    tags: new Set(),
    costImpact: 'neutral',
    certifications: [],
    carbonFootprintReduction: 0,
    roiYears: null
  };

  // Identify eco persona
  scores.ecoPersona = identifyEcoPersona(answers);

  const componentScores = {
    ecoPriority: scoreEcoPriority(answers['eco-priority']),
    energyEfficiency: scoreEnergyEfficiency(answers['energy-efficiency']),
    sustainableMaterials: scoreSustainableMaterials(answers['sustainable-materials']),
    waterConservation: scoreWaterConservation(answers['water-conservation']),
    wasteManagement: scoreWasteManagement(answers['waste-management'])
  };

  let totalWeight = 0;
  for (const [key, weight] of Object.entries(SCORE_WEIGHTS)) {
    if (componentScores[key] !== null) {
      scores.overall += (componentScores[key]?.score || 0) * weight;
      totalWeight += weight;

      if (componentScores[key]?.tags) {
        componentScores[key].tags.forEach(tag => scores.tags.add(tag));
      }
    }
  }

  if (totalWeight > 0) {
    scores.overall = Math.round((scores.overall / totalWeight) * 100) / 100;
  }

  scores.ecoLevel = determineEcoLevel(scores.overall);
  scores.costImpact = determineCostImpact(answers);

  // Calculate environmental impact metrics
  scores.carbonFootprintReduction = estimateCarbonReduction(answers, componentScores);
  scores.roiYears = estimateROI(answers, scores.costImpact);

  // Determine recommended certifications
  scores.certifications = recommendCertifications(answers, scores.ecoLevel);

  scores.categories = {
    sustainability: {
      score: componentScores.ecoPriority?.score || 50,
      commitment: componentScores.ecoPriority?.commitment || 'moderate',
      description: getCommitmentDescription(componentScores.ecoPriority?.commitment)
    },
    energy: {
      score: componentScores.energyEfficiency?.score || 50,
      focus: componentScores.energyEfficiency?.focus || 'standard',
      estimatedSavings: estimateEnergySavings(componentScores.energyEfficiency)
    },
    materials: calculateMaterialsScore(answers),
    waste: calculateWasteScore(answers),
    water: {
      score: componentScores.waterConservation?.score || 50,
      level: componentScores.waterConservation?.level || 'standard',
      estimatedSavings: estimateWaterSavings(componentScores.waterConservation)
    },
    lifecycle: calculateLifecycleScore(answers)
  };

  scores.recommendations = generateRecommendations(answers, componentScores, scores);
  scores.tags = Array.from(scores.tags);

  return scores;
}

/**
 * Identify environmental persona
 */
function identifyEcoPersona(answers) {
  const userCharacteristics = new Set();

  if (answers['eco-priority']) {
    userCharacteristics.add(answers['eco-priority']);
  }

  if (answers['energy-efficiency'] === 'very-important') {
    userCharacteristics.add('energy-star-only');
  } else if (answers['energy-efficiency'] === 'somewhat') {
    userCharacteristics.add('energy-conscious');
  }

  const materials = answers['sustainable-materials'] || [];
  if (materials.length >= 3 && !materials.includes('none-specific')) {
    userCharacteristics.add('sustainable-materials');
  } else if (materials.length >= 1 && !materials.includes('none-specific')) {
    userCharacteristics.add('some-sustainable');
  }

  if (answers['water-conservation'] === 'very-interested') {
    userCharacteristics.add('water-saving');
  }

  const waste = answers['waste-management'] || [];
  if (waste.includes('compost-bin')) {
    userCharacteristics.add('composting');
  }
  if (waste.includes('recycling-bins')) {
    userCharacteristics.add('recycling');
  }

  // Score each persona
  const personaScores = {};
  for (const [personaKey, persona] of Object.entries(ECO_PERSONAS)) {
    let matchScore = 0;
    let totalCharacteristics = persona.characteristics.length;

    for (const characteristic of persona.characteristics) {
      if (userCharacteristics.has(characteristic)) {
        matchScore++;
      }
    }

    personaScores[personaKey] = totalCharacteristics > 0 ? (matchScore / totalCharacteristics) * 100 : 0;
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

  return bestPersona && bestScore >= 40 ? {
    key: bestPersona,
    matchScore: bestScore,
    ...ECO_PERSONAS[bestPersona]
  } : null;
}

/**
 * Estimate carbon footprint reduction percentage
 */
function estimateCarbonReduction(answers, componentScores) {
  let reduction = 0;

  // Energy efficiency impact (biggest factor)
  if (componentScores.energyEfficiency?.focus === 'energy-star-only') {
    reduction += 35; // Energy Star appliances reduce energy use 10-50%
  } else if (componentScores.energyEfficiency?.focus === 'energy-conscious') {
    reduction += 20;
  }

  // Sustainable materials
  const materials = answers['sustainable-materials'] || [];
  if (materials.includes('reclaimed-wood')) reduction += 5;
  if (materials.includes('recycled-glass')) reduction += 3;
  if (materials.includes('bamboo')) reduction += 4;

  // Water conservation
  if (answers['water-conservation'] === 'very-interested') {
    reduction += 8;
  }

  // Waste management
  const waste = answers['waste-management'] || [];
  if (waste.includes('compost-bin')) reduction += 5;
  if (waste.includes('recycling-bins')) reduction += 3;

  return Math.min(60, reduction); // Cap at 60% reduction
}

/**
 * Estimate ROI in years for eco investments
 */
function estimateROI(answers, costImpact) {
  if (costImpact === 'neutral') return null;

  let savingsPerYear = 0;

  // Energy savings (typical kitchen uses $500-800/year in energy)
  if (answers['energy-efficiency'] === 'very-important') {
    savingsPerYear += 300; // ~40% reduction
  } else if (answers['energy-efficiency'] === 'somewhat') {
    savingsPerYear += 150;
  }

  // Water savings (typical kitchen uses $200-400/year in water)
  if (answers['water-conservation'] === 'very-interested') {
    savingsPerYear += 120;
  } else if (answers['water-conservation'] === 'somewhat') {
    savingsPerYear += 60;
  }

  if (savingsPerYear === 0) return null;

  // Estimate additional cost for eco features
  const additionalCost = costImpact === 'premium' ? 8000 : costImpact === 'moderate-increase' ? 3000 : 0;

  return additionalCost > 0 ? Math.round(additionalCost / savingsPerYear) : 0;
}

/**
 * Recommend certifications based on eco level
 */
function recommendCertifications(answers, ecoLevel) {
  const certs = [];

  if (answers['energy-efficiency'] === 'very-important' || ecoLevel === 'highly-sustainable') {
    certs.push('Energy Star');
  }

  if (answers['water-conservation'] === 'very-interested') {
    certs.push('WaterSense');
  }

  const materials = answers['sustainable-materials'] || [];
  if (materials.includes('fsc-certified')) {
    certs.push('FSC Certified Wood');
  }
  if (materials.includes('low-voc')) {
    certs.push('Greenguard Gold');
  }

  if (ecoLevel === 'highly-sustainable') {
    certs.push('LEED Points Eligible');
  }

  return certs;
}

/**
 * Get commitment description
 */
function getCommitmentDescription(commitment) {
  const descriptions = {
    'dedicated': {
      en: 'Sustainability is a core value in all design decisions',
      fr: 'La durabilité est une valeur fondamentale dans toutes les décisions de conception'
    },
    'committed': {
      en: 'Strong preference for environmentally responsible choices',
      fr: 'Forte préférence pour les choix respectueux de l\'environnement'
    },
    'moderate': {
      en: 'Open to eco-friendly options when practical',
      fr: 'Ouvert aux options écologiques lorsque pratique'
    },
    'minimal': {
      en: 'Focused on meeting basic efficiency standards',
      fr: 'Concentré sur le respect des normes d\'efficacité de base'
    }
  };
  return descriptions[commitment] || descriptions['moderate'];
}

/**
 * Estimate energy savings
 */
function estimateEnergySavings(energyScore) {
  if (!energyScore) return null;

  const annualSavings = energyScore.focus === 'energy-star-only' ? 350 :
                        energyScore.focus === 'energy-conscious' ? 180 : 50;

  return {
    annualDollars: annualSavings,
    lifetimeDollars: annualSavings * 15, // 15-year appliance life
    description: {
      en: `Estimated $${annualSavings}/year in energy savings`,
      fr: `Économies d'énergie estimées à ${annualSavings}$/an`
    }
  };
}

/**
 * Estimate water savings
 */
function estimateWaterSavings(waterScore) {
  if (!waterScore) return null;

  const annualSavings = waterScore.level === 'high' ? 150 :
                        waterScore.level === 'moderate' ? 75 : 20;

  const gallonsSaved = waterScore.level === 'high' ? 12000 :
                       waterScore.level === 'moderate' ? 6000 : 1500;

  return {
    annualDollars: annualSavings,
    annualGallons: gallonsSaved,
    description: {
      en: `Save ~${gallonsSaved.toLocaleString()} gallons/year ($${annualSavings})`,
      fr: `Économisez ~${gallonsSaved.toLocaleString()} gallons/an (${annualSavings}$)`
    }
  };
}

/**
 * Calculate lifecycle sustainability score
 */
function calculateLifecycleScore(answers) {
  let score = 50;

  // Durable materials have better lifecycle
  const materials = answers['sustainable-materials'] || [];
  if (materials.includes('fsc-certified')) score += 10;
  if (materials.includes('reclaimed-wood')) score += 10;

  // Energy efficiency extends to manufacturing
  if (answers['energy-efficiency'] === 'very-important') score += 15;

  // Waste management indicates lifecycle thinking
  const waste = answers['waste-management'] || [];
  if (waste.includes('compost-bin')) score += 10;
  if (waste.includes('recycling-bins')) score += 5;

  return {
    score: Math.min(100, score),
    level: score >= 75 ? 'excellent' : score >= 55 ? 'good' : 'standard',
    description: {
      en: score >= 75 ? 'Comprehensive lifecycle sustainability approach' :
          score >= 55 ? 'Good consideration for long-term environmental impact' :
          'Standard lifecycle considerations',
      fr: score >= 75 ? 'Approche complète de durabilité du cycle de vie' :
          score >= 55 ? 'Bonne considération pour l\'impact environnemental à long terme' :
          'Considérations standard du cycle de vie'
    }
  };
}

function scoreEcoPriority(value) {
  if (!value) return null;

  const levels = {
    'top-priority': { commitment: 'dedicated', tags: ['eco-conscious', 'sustainability-focused'] },
    'important': { commitment: 'committed', tags: ['eco-minded'] },
    'nice-to-have': { commitment: 'moderate', tags: [] },
    'not-priority': { commitment: 'minimal', tags: [] }
  };

  return {
    score: ECO_PRIORITY_SCORES[value] || 50,
    ...levels[value]
  };
}

function scoreEnergyEfficiency(value) {
  if (!value) return null;

  const scores = {
    'very-important': { score: 100, focus: 'energy-star-only', tags: ['energy-star', 'utility-savings'] },
    'somewhat': { score: 60, focus: 'energy-conscious', tags: ['energy-aware'] },
    'not-primary': { score: 30, focus: 'standard', tags: [] }
  };

  return scores[value] || { score: 50, focus: 'standard', tags: [] };
}

function scoreSustainableMaterials(values) {
  if (!values || !Array.isArray(values)) {
    return { score: 30, materials: [], tags: [] };
  }

  if (values.includes('none-specific')) {
    return { score: 30, materials: [], tags: [] };
  }

  const materialTags = {
    'bamboo': ['bamboo-interest'],
    'reclaimed-wood': ['reclaimed-materials'],
    'recycled-glass': ['recycled-materials'],
    'low-voc': ['low-voc', 'air-quality'],
    'fsc-certified': ['certified-wood']
  };

  const tags = [];
  values.forEach(v => {
    if (materialTags[v]) {
      tags.push(...materialTags[v]);
    }
  });

  return {
    score: Math.min(100, 30 + (values.length * 15)),
    materials: values,
    tags
  };
}

function scoreWaterConservation(value) {
  if (!value) return null;

  const scores = {
    'very-interested': { score: 100, level: 'high', tags: ['water-saving', 'low-flow'] },
    'somewhat': { score: 60, level: 'moderate', tags: [] },
    'not-priority': { score: 25, level: 'standard', tags: [] }
  };

  return scores[value] || { score: 50, level: 'standard', tags: [] };
}

function scoreWasteManagement(values) {
  if (!values || !Array.isArray(values)) {
    return { score: 30, features: [], tags: [] };
  }

  if (values.includes('basic')) {
    return { score: 25, features: ['basic'], tags: [] };
  }

  const featureTags = {
    'recycling-bins': ['recycling'],
    'compost-bin': ['composting', 'zero-waste'],
    'garbage-disposal': ['disposal-system'],
    'trash-compactor': ['space-efficient-waste']
  };

  const tags = [];
  values.forEach(v => {
    if (featureTags[v]) {
      tags.push(...featureTags[v]);
    }
  });

  return {
    score: Math.min(100, 30 + (values.length * 18)),
    features: values,
    tags
  };
}

function determineEcoLevel(overallScore) {
  if (overallScore >= 80) return 'highly-sustainable';
  if (overallScore >= 60) return 'eco-conscious';
  if (overallScore >= 40) return 'moderate';
  return 'standard';
}

function determineCostImpact(answers) {
  let impact = 0;

  if (answers['eco-priority'] === 'top-priority') impact += 2;
  if (answers['energy-efficiency'] === 'very-important') impact += 1;

  const materials = answers['sustainable-materials'] || [];
  if (materials.length > 2 && !materials.includes('none-specific')) impact += 1;

  if (impact >= 3) return 'premium';
  if (impact >= 1) return 'moderate-increase';
  return 'neutral';
}

function calculateMaterialsScore(answers) {
  const materials = answers['sustainable-materials'] || [];
  const hasSustainable = materials.length > 0 && !materials.includes('none-specific');

  return {
    score: hasSustainable ? 60 + (materials.length * 10) : 30,
    sustainable: hasSustainable,
    count: materials.filter(m => m !== 'none-specific').length
  };
}

function calculateWasteScore(answers) {
  const waste = answers['waste-management'] || [];
  const hasAdvanced = waste.some(w => ['recycling-bins', 'compost-bin'].includes(w));

  return {
    score: hasAdvanced ? 70 : 40,
    level: hasAdvanced ? 'eco-friendly' : 'basic'
  };
}

function generateRecommendations(answers, componentScores, scores) {
  const recommendations = [];

  // Eco persona recommendation
  if (scores.ecoPersona && scores.ecoPersona.matchScore >= 60) {
    recommendations.push({
      id: 'eco-persona-match',
      type: 'profile',
      priority: 'info',
      title: {
        en: `${scores.ecoPersona.key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Profile`,
        fr: `Profil ${scores.ecoPersona.key.split('-').join(' ')}`
      },
      description: {
        en: scores.ecoPersona.description.en,
        fr: scores.ecoPersona.description.fr
      }
    });
  }

  // Energy Star appliances
  if (scores.ecoLevel === 'highly-sustainable' || scores.ecoLevel === 'eco-conscious') {
    recommendations.push({
      id: 'energy-star-appliances',
      type: 'appliance',
      priority: 'essential',
      title: { en: 'Energy Star Certified Appliances', fr: 'Appareils certifiés Energy Star' },
      description: {
        en: `Choose Energy Star appliances to reduce energy use by 10-50%. Estimated savings: $${componentScores.energyEfficiency?.score >= 90 ? '350' : '200'}/year.`,
        fr: `Choisissez des appareils Energy Star pour réduire la consommation d'énergie de 10-50%. Économies estimées: ${componentScores.energyEfficiency?.score >= 90 ? '350' : '200'}$/an.`
      }
    });
  } else if (answers['energy-efficiency'] === 'somewhat') {
    recommendations.push({
      id: 'consider-energy-star',
      type: 'appliance',
      priority: 'recommended',
      title: { en: 'Consider Energy Star', fr: 'Envisagez Energy Star' },
      description: {
        en: 'Energy Star appliances pay for themselves through utility savings over 5-7 years.',
        fr: 'Les appareils Energy Star s\'amortissent grâce aux économies d\'énergie sur 5-7 ans.'
      }
    });
  }

  // Water conservation
  if (answers['water-conservation'] === 'very-interested') {
    recommendations.push({
      id: 'low-flow-fixtures',
      type: 'fixture',
      priority: 'recommended',
      title: { en: 'WaterSense Fixtures', fr: 'Robinetterie WaterSense' },
      description: {
        en: 'Install WaterSense certified faucets to save ~12,000 gallons/year. Consider touchless activation for additional savings.',
        fr: 'Installez des robinets certifiés WaterSense pour économiser ~12,000 gallons/an. Envisagez l\'activation sans contact pour des économies supplémentaires.'
      }
    });

    recommendations.push({
      id: 'efficient-dishwasher',
      type: 'appliance',
      priority: 'recommended',
      title: { en: 'Water-Efficient Dishwasher', fr: 'Lave-vaisselle économe en eau' },
      description: {
        en: 'Modern efficient dishwashers use just 3-4 gallons per load vs. 27 gallons for hand washing.',
        fr: 'Les lave-vaisselles modernes efficaces utilisent seulement 3-4 gallons par charge vs. 27 gallons pour le lavage à la main.'
      }
    });
  }

  // Sustainable materials
  const materials = answers['sustainable-materials'] || [];
  if (materials.length >= 2 && !materials.includes('none-specific')) {
    recommendations.push({
      id: 'sustainable-materials-sourcing',
      type: 'material',
      priority: 'recommended',
      title: { en: 'Sustainable Material Sourcing', fr: 'Approvisionnement en matériaux durables' },
      description: {
        en: 'Request supplier documentation for sustainability claims. Look for FSC, Greenguard, or Cradle-to-Cradle certifications.',
        fr: 'Demandez la documentation des fournisseurs pour les allégations de durabilité. Recherchez les certifications FSC, Greenguard ou Cradle-to-Cradle.'
      }
    });
  }

  if (materials.includes('low-voc')) {
    recommendations.push({
      id: 'air-quality-ventilation',
      type: 'ventilation',
      priority: 'essential',
      title: { en: 'Ventilation for Air Quality', fr: 'Ventilation pour la qualité de l\'air' },
      description: {
        en: 'Pair low-VOC materials with proper ventilation. Install a range hood that vents outside (300+ CFM recommended).',
        fr: 'Associez des matériaux à faible COV avec une ventilation appropriée. Installez une hotte aspirante qui ventile vers l\'extérieur (300+ CFM recommandé).'
      }
    });
  }

  // Waste management
  const waste = answers['waste-management'] || [];
  if (waste.includes('compost-bin')) {
    recommendations.push({
      id: 'compost-integration',
      type: 'feature',
      priority: 'recommended',
      title: { en: 'Integrated Compost Solution', fr: 'Solution de compost intégrée' },
      description: {
        en: 'Install a pull-out compost drawer (2-5 gallon capacity) near the prep area. Include charcoal filters for odor control.',
        fr: 'Installez un tiroir à compost coulissant (capacité 2-5 gallons) près de la zone de préparation. Incluez des filtres à charbon pour le contrôle des odeurs.'
      }
    });
  }

  if (waste.includes('recycling-bins')) {
    recommendations.push({
      id: 'multi-stream-recycling',
      type: 'feature',
      priority: 'recommended',
      title: { en: 'Multi-Stream Recycling Station', fr: 'Station de recyclage multi-flux' },
      description: {
        en: 'Design a pull-out cabinet with 3-4 bins for waste sorting (trash, recycling, glass, compost).',
        fr: 'Concevez une armoire coulissante avec 3-4 bacs pour le tri des déchets (ordures, recyclage, verre, compost).'
      }
    });
  }

  // ROI-based recommendations
  if (scores.roiYears && scores.roiYears <= 7) {
    recommendations.push({
      id: 'positive-roi',
      type: 'financial',
      priority: 'info',
      title: { en: 'Positive Return on Investment', fr: 'Retour sur investissement positif' },
      description: {
        en: `Your eco-friendly choices will pay for themselves in approximately ${scores.roiYears} years through utility savings.`,
        fr: `Vos choix écologiques s'amortiront en environ ${scores.roiYears} ans grâce aux économies d'énergie.`
      }
    });
  }

  // Carbon footprint
  if (scores.carbonFootprintReduction >= 30) {
    recommendations.push({
      id: 'carbon-impact',
      type: 'environmental',
      priority: 'info',
      title: { en: 'Significant Carbon Reduction', fr: 'Réduction significative du carbone' },
      description: {
        en: `Your choices will reduce the kitchen's carbon footprint by approximately ${Math.round(scores.carbonFootprintReduction)}% compared to standard options.`,
        fr: `Vos choix réduiront l'empreinte carbone de la cuisine d'environ ${Math.round(scores.carbonFootprintReduction)}% par rapport aux options standard.`
      }
    });
  }

  // Certification opportunities
  if (scores.certifications.length >= 3) {
    recommendations.push({
      id: 'green-certification',
      type: 'certification',
      priority: 'optional',
      title: { en: 'Green Building Certification', fr: 'Certification de construction écologique' },
      description: {
        en: `Your selections qualify for ${scores.certifications.join(', ')}. Consider pursuing LEED or similar certification for added home value.`,
        fr: `Vos sélections se qualifient pour ${scores.certifications.join(', ')}. Envisagez de poursuivre la certification LEED ou similaire pour une valeur ajoutée à votre maison.`
      }
    });
  }

  // Induction cooking recommendation for eco-conscious users
  if (scores.ecoLevel === 'highly-sustainable' && !recommendations.find(r => r.id === 'induction-cooking')) {
    recommendations.push({
      id: 'induction-cooking',
      type: 'appliance',
      priority: 'recommended',
      title: { en: 'Induction Cooking Technology', fr: 'Technologie de cuisson par induction' },
      description: {
        en: 'Induction cooktops are 85-90% efficient vs. 65-70% for gas. They also improve indoor air quality by eliminating combustion.',
        fr: 'Les plaques à induction sont efficaces à 85-90% vs. 65-70% pour le gaz. Elles améliorent également la qualité de l\'air intérieur en éliminant la combustion.'
      }
    });
  }

  // LED lighting
  if (scores.ecoLevel !== 'standard') {
    recommendations.push({
      id: 'led-lighting',
      type: 'lighting',
      priority: 'recommended',
      title: { en: 'LED Lighting Throughout', fr: 'Éclairage LED partout' },
      description: {
        en: 'Use LED bulbs exclusively - they use 75% less energy and last 25x longer than incandescent bulbs.',
        fr: 'Utilisez exclusivement des ampoules LED - elles consomment 75% moins d\'énergie et durent 25 fois plus longtemps que les ampoules à incandescence.'
      }
    });
  }

  // Lifecycle considerations
  if (scores.categories.lifecycle?.score >= 70) {
    recommendations.push({
      id: 'durability-focus',
      type: 'approach',
      priority: 'info',
      title: { en: 'Lifecycle Sustainability Approach', fr: 'Approche de durabilité du cycle de vie' },
      description: {
        en: 'Your focus on durable, sustainable materials reduces long-term environmental impact through fewer replacements.',
        fr: 'Votre accent sur les matériaux durables et durables réduit l\'impact environnemental à long terme grâce à moins de remplacements.'
      }
    });
  }

  // Budget consideration
  if (scores.costImpact === 'premium' && scores.ecoPersona?.key === 'eco-warrior') {
    recommendations.push({
      id: 'phased-approach',
      type: 'budget',
      priority: 'optional',
      title: { en: 'Phased Implementation', fr: 'Mise en œuvre progressive' },
      description: {
        en: 'Consider prioritizing the highest-impact eco features now (appliances, insulation) and upgrading other elements over time.',
        fr: 'Envisagez de prioriser les fonctionnalités écologiques à plus fort impact maintenant (appareils, isolation) et de mettre à niveau d\'autres éléments au fil du temps.'
      }
    });
  }

  return recommendations;
}

module.exports = {
  calculateSectionScore,
  identifyEcoPersona,
  scoreEcoPriority,
  scoreEnergyEfficiency,
  scoreSustainableMaterials,
  scoreWaterConservation,
  scoreWasteManagement,
  determineEcoLevel,
  determineCostImpact,
  estimateCarbonReduction,
  estimateROI,
  recommendCertifications,
  calculateMaterialsScore,
  calculateWasteScore,
  calculateLifecycleScore,
  generateRecommendations,
  SCORE_WEIGHTS,
  ECO_PRIORITY_SCORES,
  ECO_PERSONAS
};
