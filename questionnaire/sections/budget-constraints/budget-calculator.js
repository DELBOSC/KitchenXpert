/**
 * Budget Calculator Module
 *
 * Calculates budget allocations, estimates costs, and provides
 * budget-aware recommendations for kitchen renovations.
 */

/**
 * Budget ranges in USD (can be converted to other currencies)
 */
const BUDGET_RANGES = {
  'under-10k': { min: 0, max: 10000, tier: 'budget', label: 'Budget Refresh' },
  '10k-25k': { min: 10000, max: 25000, tier: 'mid-low', label: 'Moderate Update' },
  '25k-50k': { min: 25000, max: 50000, tier: 'mid', label: 'Standard Renovation' },
  '50k-75k': { min: 50000, max: 75000, tier: 'mid-high', label: 'Major Renovation' },
  '75k-100k': { min: 75000, max: 100000, tier: 'high', label: 'Premium Renovation' },
  'over-100k': { min: 100000, max: 250000, tier: 'luxury', label: 'Luxury Renovation' },
};

/**
 * Appliance budget ranges
 */
const APPLIANCE_RANGES = {
  'under-5k': { min: 0, max: 5000, tier: 'basic' },
  '5k-10k': { min: 5000, max: 10000, tier: 'mid-range' },
  '10k-20k': { min: 10000, max: 20000, tier: 'premium' },
  '20k-35k': { min: 20000, max: 35000, tier: 'professional' },
  'over-35k': { min: 35000, max: 100000, tier: 'commercial' },
};

/**
 * Standard budget allocation percentages by category
 */
const STANDARD_ALLOCATIONS = {
  cabinets: { min: 0.25, max: 0.35, typical: 0.3 },
  appliances: { min: 0.15, max: 0.25, typical: 0.2 },
  countertops: { min: 0.08, max: 0.15, typical: 0.1 },
  flooring: { min: 0.05, max: 0.1, typical: 0.07 },
  lighting: { min: 0.03, max: 0.08, typical: 0.05 },
  plumbing: { min: 0.03, max: 0.08, typical: 0.05 },
  backsplash: { min: 0.02, max: 0.05, typical: 0.03 },
  installation: { min: 0.15, max: 0.25, typical: 0.18 },
  contingency: { min: 0.1, max: 0.2, typical: 0.15 },
};

/**
 * Priority multipliers - adjust allocations based on user priorities
 */
const PRIORITY_MULTIPLIERS = {
  appliances: { cabinets: 0.9, appliances: 1.3, countertops: 0.95 },
  cabinets: { cabinets: 1.3, appliances: 0.9, countertops: 0.95 },
  countertops: { cabinets: 0.95, appliances: 0.95, countertops: 1.25 },
  layout: { installation: 1.3, cabinets: 0.9, contingency: 1.2 },
  lighting: { lighting: 1.5, cabinets: 0.95, appliances: 0.95 },
  flooring: { flooring: 1.4, cabinets: 0.95, countertops: 0.95 },
  storage: { cabinets: 1.2, installation: 1.1, appliances: 0.9 },
  technology: { appliances: 1.15, lighting: 1.2, installation: 1.1 },
};

/**
 * Calculate budget allocation based on total budget and priorities
 * @param {Object} params - Budget parameters
 * @returns {Object} Detailed budget allocation
 */
function calculateBudgetAllocation(params) {
  const {
    totalBudgetRange,
    applianceBudgetRange,
    priorities = [],
    savingsAreas = [],
    contingencyComfort,
    flexibility,
  } = params;

  // Get budget range values
  const budgetRange = BUDGET_RANGES[totalBudgetRange] || BUDGET_RANGES['25k-50k'];
  const applianceRange = APPLIANCE_RANGES[applianceBudgetRange] || APPLIANCE_RANGES['5k-10k'];

  // Use midpoint for calculations
  const totalBudget = (budgetRange.min + budgetRange.max) / 2;
  const applianceBudget = Math.min(
    (applianceRange.min + applianceRange.max) / 2,
    totalBudget * 0.35 // Cap appliances at 35% of total
  );

  // Start with standard allocations
  const allocations = {};
  for (const [category, percentages] of Object.entries(STANDARD_ALLOCATIONS)) {
    allocations[category] = {
      percentage: percentages.typical,
      amount: totalBudget * percentages.typical,
      min: totalBudget * percentages.min,
      max: totalBudget * percentages.max,
    };
  }

  // Override appliance allocation if specific budget given
  if (applianceBudgetRange) {
    const appliancePercentage = applianceBudget / totalBudget;
    allocations.appliances = {
      percentage: appliancePercentage,
      amount: applianceBudget,
      min: applianceRange.min,
      max: Math.min(applianceRange.max, totalBudget * 0.35),
    };
  }

  // Apply priority adjustments
  if (priorities.length > 0) {
    for (const priority of priorities) {
      const multipliers = PRIORITY_MULTIPLIERS[priority];
      if (multipliers) {
        for (const [category, multiplier] of Object.entries(multipliers)) {
          if (allocations[category]) {
            allocations[category].percentage *= multiplier;
            allocations[category].amount *= multiplier;
          }
        }
      }
    }
  }

  // Apply savings adjustments
  const savingsMultiplier = 0.7;
  for (const savingArea of savingsAreas) {
    const categoryMap = {
      'cabinet-material': 'cabinets',
      'countertop-edges': 'countertops',
      hardware: 'cabinets',
      backsplash: 'backsplash',
      'lighting-fixtures': 'lighting',
      'sink-faucet': 'plumbing',
      'diy-some': 'installation',
    };

    const category = categoryMap[savingArea];
    if (category && allocations[category]) {
      allocations[category].percentage *= savingsMultiplier;
      allocations[category].amount *= savingsMultiplier;
    }
  }

  // Adjust contingency based on comfort level
  const contingencyMultipliers = {
    'yes-20-plus': 1.3,
    'yes-10-20': 1.0,
    'some-buffer': 0.7,
    'no-buffer': 0.5,
  };

  if (contingencyComfort && contingencyMultipliers[contingencyComfort]) {
    allocations.contingency.percentage *= contingencyMultipliers[contingencyComfort];
    allocations.contingency.amount *= contingencyMultipliers[contingencyComfort];
  }

  // Normalize allocations to not exceed budget
  const totalAllocated = Object.values(allocations).reduce((sum, a) => sum + a.amount, 0);
  if (totalAllocated > totalBudget) {
    const scaleFactor = totalBudget / totalAllocated;
    for (const category of Object.keys(allocations)) {
      allocations[category].amount *= scaleFactor;
      allocations[category].percentage *= scaleFactor;
    }
  }

  return {
    totalBudget,
    budgetTier: budgetRange.tier,
    budgetLabel: budgetRange.label,
    allocations,
    summary: generateAllocationSummary(allocations, totalBudget),
    warnings: generateBudgetWarnings(allocations, params),
  };
}

/**
 * Generate allocation summary
 */
function generateAllocationSummary(allocations, totalBudget) {
  const summary = [];

  const categoryLabels = {
    cabinets: 'Cabinets & Storage',
    appliances: 'Appliances',
    countertops: 'Countertops',
    flooring: 'Flooring',
    lighting: 'Lighting',
    plumbing: 'Plumbing & Fixtures',
    backsplash: 'Backsplash',
    installation: 'Installation & Labor',
    contingency: 'Contingency',
  };

  for (const [category, data] of Object.entries(allocations)) {
    summary.push({
      category,
      label: categoryLabels[category] || category,
      amount: Math.round(data.amount),
      percentage: Math.round(data.percentage * 100),
      range: {
        min: Math.round(data.min),
        max: Math.round(data.max),
      },
    });
  }

  // Sort by amount descending
  summary.sort((a, b) => b.amount - a.amount);

  return summary;
}

/**
 * Generate budget warnings
 */
function generateBudgetWarnings(allocations, params) {
  const warnings = [];

  // Check for low contingency
  if (allocations.contingency.percentage < 0.1) {
    warnings.push({
      code: 'LOW_CONTINGENCY',
      severity: 'warning',
      message: {
        en: 'Your contingency fund is below the recommended 10%. Unexpected costs are common in renovations.',
        fr: 'Votre fonds de prévoyance est inférieur aux 10% recommandés. Les coûts imprévus sont fréquents dans les rénovations.',
      },
    });
  }

  // Check for unrealistic appliance budget
  const appliancePercentage = allocations.appliances.percentage;
  if (appliancePercentage > 0.35) {
    warnings.push({
      code: 'HIGH_APPLIANCE_RATIO',
      severity: 'info',
      message: {
        en: 'Appliances are taking a large portion of your budget. Consider if this aligns with your priorities.',
        fr: 'Les appareils représentent une grande partie de votre budget. Vérifiez si cela correspond à vos priorités.',
      },
    });
  }

  // Check if budget tier matches expectations
  if (params.priorities?.includes('cabinets') && allocations.cabinets.amount < 5000) {
    warnings.push({
      code: 'LOW_CABINET_BUDGET',
      severity: 'warning',
      message: {
        en: 'Your cabinet budget may be low for custom or high-quality options.',
        fr: 'Votre budget armoires peut être faible pour des options sur mesure ou de haute qualité.',
      },
    });
  }

  return warnings;
}

/**
 * Estimate material costs by quality tier
 */
function estimateMaterialCosts(budgetTier, squareFootage = 100) {
  const costPerSqFt = {
    budget: {
      cabinets: { min: 75, max: 150 },
      countertops: { min: 25, max: 50 },
      flooring: { min: 3, max: 8 },
      backsplash: { min: 5, max: 15 },
    },
    mid: {
      cabinets: { min: 150, max: 350 },
      countertops: { min: 50, max: 100 },
      flooring: { min: 8, max: 15 },
      backsplash: { min: 15, max: 30 },
    },
    high: {
      cabinets: { min: 350, max: 600 },
      countertops: { min: 100, max: 200 },
      flooring: { min: 15, max: 30 },
      backsplash: { min: 30, max: 60 },
    },
    luxury: {
      cabinets: { min: 600, max: 1200 },
      countertops: { min: 150, max: 400 },
      flooring: { min: 25, max: 75 },
      backsplash: { min: 50, max: 150 },
    },
  };

  const tierMap = {
    budget: 'budget',
    'mid-low': 'budget',
    mid: 'mid',
    'mid-high': 'high',
    high: 'high',
    luxury: 'luxury',
  };

  const tier = tierMap[budgetTier] || 'mid';
  const costs = costPerSqFt[tier];

  const estimates = {};
  for (const [category, range] of Object.entries(costs)) {
    estimates[category] = {
      low: range.min * squareFootage,
      high: range.max * squareFootage,
      typical: ((range.min + range.max) / 2) * squareFootage,
    };
  }

  return estimates;
}

/**
 * Calculate potential savings from different approaches
 */
function calculatePotentialSavings(baseAllocation, savingsStrategies) {
  const savingsImpact = {
    'stock-cabinets': { category: 'cabinets', savings: 0.3 },
    'rta-cabinets': { category: 'cabinets', savings: 0.4 },
    'laminate-counters': { category: 'countertops', savings: 0.5 },
    'lvp-flooring': { category: 'flooring', savings: 0.4 },
    'diy-demo': { category: 'installation', savings: 0.1 },
    'diy-paint': { category: 'installation', savings: 0.05 },
    'diy-backsplash': { category: 'backsplash', savings: 0.6 },
    'basic-fixtures': { category: 'plumbing', savings: 0.3 },
  };

  let totalSavings = 0;
  const savingsBreakdown = [];

  for (const strategy of savingsStrategies) {
    const impact = savingsImpact[strategy];
    if (impact && baseAllocation[impact.category]) {
      const savings = baseAllocation[impact.category].amount * impact.savings;
      totalSavings += savings;
      savingsBreakdown.push({
        strategy,
        category: impact.category,
        amount: Math.round(savings),
        percentage: Math.round(impact.savings * 100),
      });
    }
  }

  return {
    totalSavings: Math.round(totalSavings),
    breakdown: savingsBreakdown,
  };
}

/**
 * Get budget-appropriate product recommendations
 */
function getProductTierRecommendations(budgetTier) {
  const recommendations = {
    budget: {
      cabinets: ['stock', 'rta'],
      countertops: ['laminate', 'butcher-block', 'tile'],
      appliances: ['basic', 'value-brands'],
      flooring: ['lvp', 'laminate', 'vinyl-tile'],
    },
    'mid-low': {
      cabinets: ['semi-custom', 'upgraded-stock'],
      countertops: ['quartz-entry', 'granite-remnant', 'solid-surface'],
      appliances: ['mid-range', 'sale-premium'],
      flooring: ['lvp-premium', 'engineered-wood-entry', 'porcelain'],
    },
    mid: {
      cabinets: ['semi-custom', 'custom-entry'],
      countertops: ['quartz', 'granite', 'marble-look-quartz'],
      appliances: ['mid-range-premium', 'panel-ready'],
      flooring: ['engineered-hardwood', 'porcelain-premium', 'natural-stone-entry'],
    },
    'mid-high': {
      cabinets: ['custom', 'furniture-grade'],
      countertops: ['quartz-premium', 'marble', 'quartzite'],
      appliances: ['premium', 'professional-style'],
      flooring: ['hardwood', 'natural-stone', 'large-format-tile'],
    },
    high: {
      cabinets: ['custom-luxury', 'european'],
      countertops: ['marble', 'quartzite', 'exotic-granite'],
      appliances: ['professional', 'integrated-panel'],
      flooring: ['wide-plank-hardwood', 'marble', 'designer-tile'],
    },
    luxury: {
      cabinets: ['bespoke', 'artisan', 'furniture-quality'],
      countertops: ['bookmatched-marble', 'onyx', 'custom-fabrication'],
      appliances: ['commercial', 'fully-integrated', 'smart-connected'],
      flooring: ['antique-reclaimed', 'exotic-hardwood', 'custom-stone'],
    },
  };

  return recommendations[budgetTier] || recommendations.mid;
}

/**
 * Currency conversion helper
 */
function convertCurrency(amount, fromCurrency, toCurrency, exchangeRates) {
  if (fromCurrency === toCurrency) return amount;

  const rates = exchangeRates || {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    CAD: 1.36,
    AUD: 1.53,
  };

  const amountInUSD = amount / rates[fromCurrency];
  return amountInUSD * rates[toCurrency];
}

module.exports = {
  calculateBudgetAllocation,
  estimateMaterialCosts,
  calculatePotentialSavings,
  getProductTierRecommendations,
  convertCurrency,
  BUDGET_RANGES,
  APPLIANCE_RANGES,
  STANDARD_ALLOCATIONS,
  PRIORITY_MULTIPLIERS,
};
