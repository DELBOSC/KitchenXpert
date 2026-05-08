/**
 * Embodied Carbon Calculator Service
 *
 * Calculates the embodied carbon (CO2 equivalent) for an entire kitchen design
 * based on the ICE Database v3 carbon factors. Provides a detailed breakdown
 * by item, material, and transport, with suggestions for reducing the footprint.
 */

import logger from '../../utils/logger';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface KitchenItem {
  type: string;
  material: string;
  weight?: number; // kg
  volume?: number; // m3
  dimensions: { width: number; height: number; depth: number }; // mm
  brand?: string;
  countryOfOrigin?: string;
}

export interface CarbonReport {
  totalCO2e: number; // kg CO2 equivalent
  breakdown: Array<{
    item: string;
    material: string;
    co2e: number;
    percentage: number;
  }>;
  materialBreakdown: Array<{
    material: string;
    totalCO2e: number;
    totalWeight: number;
  }>;
  transportCO2e: number;
  comparisonToAverage: number; // percentage vs average kitchen (+15% means 15% more than average)
  suggestions: Array<{
    current: string;
    alternative: string;
    co2Savings: number;
    costImpact: number; // EUR difference
  }>;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'E';
}

// ----------------------------------------------------------------
// Carbon Data (ICE Database v3 factors)
// ----------------------------------------------------------------

/** kg CO2e per kg of material */
const CARBON_FACTORS: Record<string, number> = {
  // Wood products
  'particleboard': 0.59,
  'mdf': 0.72,
  'plywood': 0.81,
  'solid-oak': 0.46,
  'solid-walnut': 0.46,
  'solid-pine': 0.31,
  'bamboo': 0.50,

  // Stone
  'granite': 0.70,
  'marble': 0.22,
  'quartz-engineered': 1.73,
  'slate': 0.06,
  'concrete': 0.13,
  'ceramic-tile': 0.74,

  // Metals
  'stainless-steel': 6.15,
  'aluminum': 11.46,
  'aluminum-recycled': 0.52,
  'cast-iron': 1.91,
  'copper': 3.83,
  'brass': 3.50,

  // Plastics & Laminates
  'laminate': 3.29,
  'acrylic': 5.55,
  'pvc': 3.10,
  'abs-plastic': 3.76,

  // Glass
  'glass': 1.44,
  'tempered-glass': 1.67,
};

/** Material density in kg/m3 */
const MATERIAL_DENSITY: Record<string, number> = {
  'particleboard': 650,
  'mdf': 750,
  'plywood': 600,
  'solid-oak': 700,
  'solid-walnut': 650,
  'solid-pine': 500,
  'bamboo': 600,
  'granite': 2700,
  'marble': 2550,
  'quartz-engineered': 2300,
  'slate': 2800,
  'concrete': 2400,
  'ceramic-tile': 2000,
  'stainless-steel': 7900,
  'aluminum': 2700,
  'aluminum-recycled': 2700,
  'cast-iron': 7200,
  'copper': 8900,
  'brass': 8500,
  'laminate': 1400,
  'acrylic': 1180,
  'pvc': 1400,
  'abs-plastic': 1050,
  'glass': 2500,
  'tempered-glass': 2500,
};

/** Transport CO2 factor based on country of origin (kg CO2 per kg product) */
const TRANSPORT_FACTORS: Record<string, number> = {
  'france': 0.05,
  'fr': 0.05,
  'germany': 0.10,
  'de': 0.10,
  'italy': 0.15,
  'it': 0.15,
  'spain': 0.12,
  'es': 0.12,
  'portugal': 0.15,
  'pt': 0.15,
  'poland': 0.12,
  'pl': 0.12,
  'sweden': 0.15,
  'se': 0.15,
  'denmark': 0.12,
  'dk': 0.12,
  'uk': 0.08,
  'gb': 0.08,
  'usa': 0.40,
  'us': 0.40,
  'china': 0.50,
  'cn': 0.50,
  'turkey': 0.25,
  'tr': 0.25,
  'india': 0.45,
  'in': 0.45,
  'brazil': 0.50,
  'br': 0.50,
};

const DEFAULT_TRANSPORT_FACTOR = 0.10;

/** Average kitchen CO2e baseline for comparison (kg CO2e) */
const AVERAGE_KITCHEN_CO2E = 2500;

/** Lower-carbon alternative suggestions */
const CARBON_ALTERNATIVES: Record<string, { alternative: string; savingsPerKg: number; costImpactPerKg: number }> = {
  'quartz-engineered': {
    alternative: 'Recycled glass countertop',
    savingsPerKg: 1.20, // 1.73 - 0.53 approximate
    costImpactPerKg: 5,
  },
  'stainless-steel': {
    alternative: 'Recycled stainless steel',
    savingsPerKg: 3.00,
    costImpactPerKg: 2,
  },
  'aluminum': {
    alternative: 'Recycled aluminum',
    savingsPerKg: 10.94, // 11.46 - 0.52
    costImpactPerKg: -1,
  },
  'laminate': {
    alternative: 'Bamboo veneer',
    savingsPerKg: 2.79, // 3.29 - 0.50
    costImpactPerKg: 8,
  },
  'acrylic': {
    alternative: 'Natural stone (marble)',
    savingsPerKg: 5.33, // 5.55 - 0.22
    costImpactPerKg: 15,
  },
  'mdf': {
    alternative: 'FSC-certified plywood',
    savingsPerKg: -0.09, // 0.72 - 0.81 (slightly worse but renewable)
    costImpactPerKg: 5,
  },
  'particleboard': {
    alternative: 'Solid pine (FSC)',
    savingsPerKg: 0.28, // 0.59 - 0.31
    costImpactPerKg: 10,
  },
  'granite': {
    alternative: 'Slate countertop',
    savingsPerKg: 0.64, // 0.70 - 0.06
    costImpactPerKg: -5,
  },
  'pvc': {
    alternative: 'Bamboo edge banding',
    savingsPerKg: 2.60, // 3.10 - 0.50
    costImpactPerKg: 3,
  },
  'abs-plastic': {
    alternative: 'Recycled ABS',
    savingsPerKg: 1.50,
    costImpactPerKg: 1,
  },
  'concrete': {
    alternative: 'Low-carbon concrete',
    savingsPerKg: 0.06,
    costImpactPerKg: 2,
  },
  'glass': {
    alternative: 'Recycled glass',
    savingsPerKg: 0.70,
    costImpactPerKg: -2,
  },
};

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Normalize material string for lookup */
function normalizeMaterial(material: string): string {
  return material
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Calculate volume in m3 from dimensions in mm */
function dimensionsToVolume(dims: { width: number; height: number; depth: number }): number {
  return (dims.width / 1000) * (dims.height / 1000) * (dims.depth / 1000);
}

/** Estimate weight from volume and material density */
function estimateWeight(
  material: string,
  volume?: number,
  dimensions?: { width: number; height: number; depth: number },
): number {
  const normalizedMat = normalizeMaterial(material);
  const density = MATERIAL_DENSITY[normalizedMat] || 700; // default to MDF-like density

  if (volume != null && volume > 0) {
    return volume * density;
  }

  if (dimensions) {
    const vol = dimensionsToVolume(dimensions);
    return vol * density;
  }

  // Default: assume a 600x720x560mm cabinet of the material (~0.24m3)
  return 0.24 * density;
}

/** Determine CO2e grade */
function calculateGrade(totalCO2e: number): CarbonReport['grade'] {
  if (totalCO2e <= 1500) {return 'A+';}
  if (totalCO2e <= 2000) {return 'A';}
  if (totalCO2e <= 2500) {return 'B';}
  if (totalCO2e <= 3500) {return 'C';}
  if (totalCO2e <= 5000) {return 'D';}
  return 'E';
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class CarbonCalculatorService {
  /**
   * Calculate embodied carbon for the entire kitchen design.
   */
  calculateKitchenCarbon(items: KitchenItem[]): CarbonReport {
    if (items.length === 0) {
      return {
        totalCO2e: 0,
        breakdown: [],
        materialBreakdown: [],
        transportCO2e: 0,
        comparisonToAverage: -100,
        suggestions: [],
        grade: 'A+',
      };
    }

    const breakdown: CarbonReport['breakdown'] = [];
    const materialMap = new Map<string, { totalCO2e: number; totalWeight: number }>();
    let totalProductionCO2e = 0;
    let totalTransportCO2e = 0;

    for (const item of items) {
      const normalizedMat = normalizeMaterial(item.material);

      // Get weight: use provided weight, or estimate from volume/dimensions
      const weight = item.weight && item.weight > 0
        ? item.weight
        : estimateWeight(normalizedMat, item.volume, item.dimensions);

      // Production CO2e
      const carbonFactor = CARBON_FACTORS[normalizedMat] || 0.60; // default to ~MDF
      const productionCO2e = weight * carbonFactor;

      // Transport CO2e
      const country = item.countryOfOrigin?.toLowerCase() || '';
      const transportFactor = TRANSPORT_FACTORS[country] || DEFAULT_TRANSPORT_FACTOR;
      const transportCO2e = weight * transportFactor;

      const itemCO2e = productionCO2e + transportCO2e;
      totalProductionCO2e += productionCO2e;
      totalTransportCO2e += transportCO2e;

      breakdown.push({
        item: item.type,
        material: item.material,
        co2e: Number(itemCO2e.toFixed(2)),
        percentage: 0, // Will be calculated after totals
      });

      // Aggregate by material
      const existing = materialMap.get(normalizedMat);
      if (existing) {
        existing.totalCO2e += productionCO2e;
        existing.totalWeight += weight;
      } else {
        materialMap.set(normalizedMat, {
          totalCO2e: productionCO2e,
          totalWeight: weight,
        });
      }
    }

    const totalCO2e = Number((totalProductionCO2e + totalTransportCO2e).toFixed(2));

    // Calculate percentages
    for (const entry of breakdown) {
      entry.percentage = totalCO2e > 0
        ? Number(((entry.co2e / totalCO2e) * 100).toFixed(1))
        : 0;
    }

    // Build material breakdown
    const materialBreakdown: CarbonReport['materialBreakdown'] = Array.from(materialMap.entries())
      .map(([material, data]) => ({
        material,
        totalCO2e: Number(data.totalCO2e.toFixed(2)),
        totalWeight: Number(data.totalWeight.toFixed(2)),
      }))
      .sort((a, b) => b.totalCO2e - a.totalCO2e);

    // Generate suggestions
    const suggestions = this.generateSuggestions(items, materialMap);

    // Comparison to average
    const comparisonToAverage = Number(
      (((totalCO2e - AVERAGE_KITCHEN_CO2E) / AVERAGE_KITCHEN_CO2E) * 100).toFixed(1),
    );

    const grade = calculateGrade(totalCO2e);

    const report: CarbonReport = {
      totalCO2e,
      breakdown: breakdown.sort((a, b) => b.co2e - a.co2e),
      materialBreakdown,
      transportCO2e: Number(totalTransportCO2e.toFixed(2)),
      comparisonToAverage,
      suggestions,
      grade,
    };

    logger.info('[CarbonCalculator] Calculated kitchen carbon', {
      itemCount: items.length,
      totalCO2e: report.totalCO2e,
      grade: report.grade,
      comparisonToAverage: report.comparisonToAverage,
    });

    return report;
  }

  /**
   * Generate suggestions for reducing the carbon footprint.
   */
  private generateSuggestions(
    items: KitchenItem[],
    materialMap: Map<string, { totalCO2e: number; totalWeight: number }>,
  ): CarbonReport['suggestions'] {
    const suggestions: CarbonReport['suggestions'] = [];
    const processedMaterials = new Set<string>();

    // Sort materials by total CO2e impact (highest first) for most impactful suggestions
    const sortedMaterials = Array.from(materialMap.entries())
      .sort(([, a], [, b]) => b.totalCO2e - a.totalCO2e);

    for (const [material, data] of sortedMaterials) {
      if (processedMaterials.has(material)) {continue;}

      const alt = CARBON_ALTERNATIVES[material];
      if (!alt || alt.savingsPerKg <= 0) {continue;}

      const co2Savings = Number((data.totalWeight * alt.savingsPerKg).toFixed(2));
      const costImpact = Number((data.totalWeight * alt.costImpactPerKg).toFixed(0));

      // Only suggest if savings are meaningful (> 1 kg CO2e)
      if (co2Savings > 1) {
        suggestions.push({
          current: material,
          alternative: alt.alternative,
          co2Savings,
          costImpact,
        });
        processedMaterials.add(material);
      }
    }

    // Suggest local sourcing if any items are from far away
    const farItems = items.filter((item) => {
      const country = item.countryOfOrigin?.toLowerCase() || '';
      return (TRANSPORT_FACTORS[country] || 0) > 0.20;
    });

    if (farItems.length > 0) {
      const totalTransportSavings = farItems.reduce((sum, item) => {
        const normalizedMat = normalizeMaterial(item.material);
        const weight = item.weight && item.weight > 0
          ? item.weight
          : estimateWeight(normalizedMat, item.volume, item.dimensions);
        const country = item.countryOfOrigin?.toLowerCase() || '';
        const currentFactor = TRANSPORT_FACTORS[country] || DEFAULT_TRANSPORT_FACTOR;
        return sum + weight * (currentFactor - 0.05); // savings vs local (France)
      }, 0);

      if (totalTransportSavings > 5) {
        suggestions.push({
          current: 'Imported products',
          alternative: 'Source from European/local manufacturers',
          co2Savings: Number(totalTransportSavings.toFixed(2)),
          costImpact: 0, // Varies, so mark as neutral
        });
      }
    }

    // Sort by CO2 savings (highest first) and limit
    return suggestions
      .sort((a, b) => b.co2Savings - a.co2Savings)
      .slice(0, 5);
  }
}

export default CarbonCalculatorService;
