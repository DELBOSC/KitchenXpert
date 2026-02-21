/**
 * Digital Twin Service
 *
 * Creates and manages digital twins for completed kitchen installations.
 * A digital twin is a virtual representation of the physical kitchen,
 * providing maintenance schedules, warranty tracking, and energy estimates.
 *
 * Features:
 * - Create a digital twin from a kitchen design after installation
 * - Track warranty status for all installed items
 * - Generate maintenance schedules based on item types
 * - Log maintenance actions
 * - Estimate annual energy and water consumption
 */

import { prisma } from '../../database/client';
import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('digital-twin');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DigitalTwin {
  id: string;
  kitchenId: string;
  installedAt: Date;
  items: DigitalTwinItem[];
  technicalPlan: TechnicalPlan;
}

export interface DigitalTwinItem {
  id: string;
  type: string;
  brand: string;
  model: string;
  sku: string;
  installedAt: Date;
  warrantyExpires: Date;
  maintenanceLog: MaintenanceLogEntry[];
  specifications: Record<string, unknown>;
}

export interface MaintenanceLogEntry {
  date: Date;
  action: string;
  notes: string;
}

export interface TechnicalPlan {
  electricalCircuits: Array<{
    id: string;
    amperage: number;
    outlets: string[];
  }>;
  plumbingConnections: Array<{
    type: string;
    location: { x: number; z: number };
  }>;
  gasConnection?: {
    location: { x: number; z: number };
  };
}

export interface MaintenanceItem {
  itemId: string;
  itemName: string;
  task: string;
  frequency: string;
  nextDue: Date;
  lastCompleted?: Date;
  isOverdue: boolean;
  instructions: string;
}

export interface WarrantyItem {
  itemId: string;
  itemName: string;
  brand: string;
  warrantyExpires: Date;
  isExpired: boolean;
  daysRemaining: number;
  coverage: string;
  contactInfo: string;
}

export interface EnergyEstimate {
  annualElectricity: number; // kWh
  annualGas?: number;        // m3
  annualWater: number;       // liters
  annualCostElectricity: number; // EUR
  annualCostGas?: number;
  annualCostWater: number;
  totalAnnualCost: number;
  breakdown: Array<{
    item: string;
    electricity: number;
    water: number;
    cost: number;
  }>;
}

// ─── Maintenance Schedule Definitions ───────────────────────────────────────

interface MaintenanceTemplate {
  task: string;
  frequencyMonths: number;
  frequency: string;
  instructions: string;
}

/**
 * Maintenance schedules by item type.
 * Key is the item type (normalized to lowercase).
 */
const MAINTENANCE_SCHEDULES: Record<string, MaintenanceTemplate[]> = {
  range_hood: [
    {
      task: 'Clean grease filter',
      frequencyMonths: 1,
      frequency: 'monthly',
      instructions: 'Remove the grease filter and wash with warm soapy water. Let it dry completely before reinserting. For metal filters, you can also run them through the dishwasher.',
    },
    {
      task: 'Replace charcoal filter',
      frequencyMonths: 6,
      frequency: 'semi-annual',
      instructions: 'If your hood uses recirculation mode, replace the activated charcoal filter every 6 months or when odor filtering decreases noticeably.',
    },
  ],
  dishwasher: [
    {
      task: 'Clean filter and spray arms',
      frequencyMonths: 1,
      frequency: 'monthly',
      instructions: 'Remove and clean the bottom filter. Check spray arms for clogs in the water holes. Run an empty hot cycle with dishwasher cleaner or white vinegar.',
    },
  ],
  refrigerator: [
    {
      task: 'Clean condenser coils',
      frequencyMonths: 6,
      frequency: 'semi-annual',
      instructions: 'Unplug the refrigerator. Locate the condenser coils (usually at the back or bottom). Vacuum dust and debris with a brush attachment. This improves efficiency and extends lifespan.',
    },
  ],
  oven: [
    {
      task: 'Deep clean oven interior',
      frequencyMonths: 3,
      frequency: 'quarterly',
      instructions: 'If the oven has self-cleaning mode, run it. Otherwise, apply oven cleaner to the interior (avoid heating elements), let it sit for the recommended time, and wipe clean.',
    },
  ],
  water_filter: [
    {
      task: 'Replace water filter cartridge',
      frequencyMonths: 6,
      frequency: 'semi-annual',
      instructions: 'Turn off the water supply. Remove the old filter cartridge and install the replacement. Run water for 5 minutes to flush the new filter before use.',
    },
  ],
  cabinet: [
    {
      task: 'Lubricate soft-close hinges',
      frequencyMonths: 12,
      frequency: 'annual',
      instructions: 'Apply a small amount of silicone-based lubricant to all hinge mechanisms. Open and close doors several times to distribute. Wipe excess lubricant.',
    },
  ],
  countertop_stone: [
    {
      task: 'Reapply stone sealant',
      frequencyMonths: 12,
      frequency: 'annual',
      instructions: 'Clean the countertop thoroughly and let it dry. Apply stone sealer evenly across the surface using a soft cloth. Let it penetrate for 15-20 minutes, then wipe off excess. Allow 24 hours before heavy use.',
    },
  ],
  tile_grout: [
    {
      task: 'Reseal grout lines',
      frequencyMonths: 24,
      frequency: 'every 2 years',
      instructions: 'Clean grout lines thoroughly with a grout cleaner. Let dry completely (24 hours). Apply grout sealer with a small brush along all grout lines. Wipe off excess from tile surfaces within 5-10 minutes.',
    },
  ],
  sink: [
    {
      task: 'Inspect and clean drain',
      frequencyMonths: 3,
      frequency: 'quarterly',
      instructions: 'Remove the drain strainer and clean it. Use a drain snake or enzyme-based cleaner to maintain clear drains. Check under-sink connections for leaks.',
    },
  ],
  faucet: [
    {
      task: 'Descale aerator',
      frequencyMonths: 6,
      frequency: 'semi-annual',
      instructions: 'Unscrew the faucet aerator. Soak in white vinegar for 30 minutes to remove mineral buildup. Scrub with a small brush and rinse. Reattach.',
    },
  ],
};

// ─── Energy Consumption Estimates ───────────────────────────────────────────

/**
 * Average annual energy consumption by appliance type.
 */
const ENERGY_ESTIMATES: Record<string, { electricity: number; water: number; gas?: number }> = {
  refrigerator: { electricity: 350, water: 0 },
  dishwasher: { electricity: 270, water: 12000 },
  oven: { electricity: 200, water: 0 },
  oven_gas: { electricity: 30, water: 0, gas: 50 },
  cooktop: { electricity: 300, water: 0 },
  cooktop_gas: { electricity: 10, water: 0, gas: 80 },
  range_hood: { electricity: 30, water: 0 },
  microwave: { electricity: 60, water: 0 },
  freezer: { electricity: 250, water: 0 },
  washer: { electricity: 150, water: 15000 },
  dryer: { electricity: 400, water: 0 },
  water_heater: { electricity: 1500, water: 40000 },
  lighting: { electricity: 100, water: 0 },
  sink: { electricity: 0, water: 20000 },
};

/** Average utility costs in EUR */
const UTILITY_COSTS = {
  electricityPerKwh: 0.25,    // EUR/kWh (EU average)
  gasPerM3: 0.10,             // EUR/m3
  waterPerLiter: 0.004,       // EUR/liter
};

// ─── Warranty Defaults ──────────────────────────────────────────────────────

const DEFAULT_WARRANTY_YEARS: Record<string, number> = {
  refrigerator: 5,
  dishwasher: 3,
  oven: 3,
  cooktop: 3,
  range_hood: 2,
  microwave: 2,
  sink: 10,
  faucet: 5,
  cabinet: 10,
  countertop_stone: 15,
  countertop_laminate: 5,
  countertop_wood: 5,
  default: 2,
};

const BRAND_CONTACT_INFO: Record<string, string> = {
  ikea: 'IKEA Service: 0800-XXX-XXX | ikea.com/service',
  bosch: 'Bosch Home: 01onal-XXX-XXX | bosch-home.com/service',
  siemens: 'Siemens Home: 01al-XXX-XXX | siemens-home.bsh-group.com/service',
  miele: 'Miele Service: 01-XXX-XXX | miele.com/service',
  samsung: 'Samsung Support: 01-XXX-XXX | samsung.com/support',
  lg: 'LG Support: 01-XXX-XXX | lg.com/support',
  whirlpool: 'Whirlpool Service: 01-XXX-XXX | whirlpool.com/service',
  electrolux: 'Electrolux Service: 01-XXX-XXX | electrolux.com/support',
  default: 'Contact the manufacturer for warranty service.',
};

// ─── Service ────────────────────────────────────────────────────────────────

export class DigitalTwinService {
  /**
   * Create a digital twin from a completed kitchen installation.
   *
   * Reads the kitchen design from the database and creates a digital twin
   * with all installed items, their warranty dates, and the technical plan.
   *
   * @param kitchenId - The kitchen design ID
   * @returns The created digital twin
   */
  async createDigitalTwin(kitchenId: string): Promise<DigitalTwin> {
    logger.info(`[DigitalTwin] Creating digital twin for kitchen ${kitchenId}`);

    // Load kitchen data from database
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
      include: {
        items: true,
      },
    });

    if (!kitchen) {
      throw new Error(`Kitchen ${kitchenId} not found`);
    }

    const now = new Date();

    // Build digital twin items from kitchen items
    const items: DigitalTwinItem[] = ((kitchen as Record<string, unknown>).items as Array<Record<string, unknown>> || []).map((item) => {
      const itemType = String(item.type || item.category || 'default').toLowerCase();
      const brand = String(item.brand || 'unknown').toLowerCase();
      const warrantyYears = DEFAULT_WARRANTY_YEARS[itemType] || DEFAULT_WARRANTY_YEARS[brand] || DEFAULT_WARRANTY_YEARS.default!;

      const warrantyExpires = new Date(now);
      warrantyExpires.setFullYear(warrantyExpires.getFullYear() + warrantyYears);

      return {
        id: String(item.id),
        type: itemType,
        brand: String(item.brand || 'Unknown'),
        model: String(item.model || item.name || 'Unknown'),
        sku: String(item.sku || item.articleNumber || ''),
        installedAt: now,
        warrantyExpires,
        maintenanceLog: [],
        specifications: (item.specifications as Record<string, unknown>) || {},
      };
    });

    // Build technical plan (from kitchen data or defaults)
    const technicalPlan: TechnicalPlan = {
      electricalCircuits: [
        { id: 'circuit_oven', amperage: 32, outlets: ['oven'] },
        { id: 'circuit_dishwasher', amperage: 20, outlets: ['dishwasher'] },
        { id: 'circuit_general', amperage: 16, outlets: ['fridge', 'range_hood', 'microwave', 'general'] },
      ],
      plumbingConnections: [
        { type: 'cold_water', location: { x: 1.2, z: 0.3 } },
        { type: 'hot_water', location: { x: 1.3, z: 0.3 } },
        { type: 'drain', location: { x: 1.25, z: 0.3 } },
        { type: 'dishwasher_water', location: { x: 2.0, z: 0.3 } },
        { type: 'dishwasher_drain', location: { x: 2.1, z: 0.3 } },
      ],
    };

    const digitalTwin: DigitalTwin = {
      id: `twin_${kitchenId}`,
      kitchenId,
      installedAt: now,
      items,
      technicalPlan,
    };

    // Persist to database
    try {
      await prisma.digitalTwin.create({
        data: {
          id: digitalTwin.id,
          kitchenId: digitalTwin.kitchenId,
          userId: '',
          maintenanceData: JSON.parse(JSON.stringify({
            items: digitalTwin.items,
            technicalPlan: digitalTwin.technicalPlan,
          })),
        },
      });
    } catch (err) {
      // If DigitalTwin model doesn't exist yet, log and continue
      logger.warn('[DigitalTwin] Failed to persist to database (model may not exist yet)', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    logger.info(`[DigitalTwin] Created digital twin ${digitalTwin.id} with ${items.length} items`);
    return digitalTwin;
  }

  /**
   * Get maintenance schedule for the kitchen.
   * Generates a list of upcoming maintenance tasks based on item types and
   * their last completed maintenance dates.
   *
   * @param twin - The digital twin
   * @returns Sorted list of maintenance items (most urgent first)
   */
  getMaintenanceSchedule(twin: DigitalTwin): MaintenanceItem[] {
    const now = new Date();
    const maintenanceItems: MaintenanceItem[] = [];

    for (const item of twin.items) {
      const normalizedType = item.type.toLowerCase().replace(/[\s-]/g, '_');
      const schedules = MAINTENANCE_SCHEDULES[normalizedType] || [];

      for (const schedule of schedules) {
        // Find the last time this task was completed
        const lastEntry = item.maintenanceLog
          .filter((log) => log.action === schedule.task)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        let nextDue: Date;
        if (lastEntry) {
          nextDue = new Date(lastEntry.date);
          nextDue.setMonth(nextDue.getMonth() + schedule.frequencyMonths);
        } else {
          // First maintenance due after installation
          nextDue = new Date(item.installedAt);
          nextDue.setMonth(nextDue.getMonth() + schedule.frequencyMonths);
        }

        const isOverdue = nextDue < now;

        maintenanceItems.push({
          itemId: item.id,
          itemName: `${item.brand} ${item.model}`,
          task: schedule.task,
          frequency: schedule.frequency,
          nextDue,
          lastCompleted: lastEntry ? new Date(lastEntry.date) : undefined,
          isOverdue,
          instructions: schedule.instructions,
        });
      }
    }

    // Sort: overdue first, then by next due date
    maintenanceItems.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.nextDue.getTime() - b.nextDue.getTime();
    });

    return maintenanceItems;
  }

  /**
   * Get warranty status for all items.
   *
   * @param twin - The digital twin
   * @returns Array of warranty items with status
   */
  getWarrantyStatus(twin: DigitalTwin): WarrantyItem[] {
    const now = new Date();

    return twin.items.map((item) => {
      const daysRemaining = Math.ceil(
        (item.warrantyExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isExpired = daysRemaining <= 0;

      const brandKey = item.brand.toLowerCase().replace(/[\s-]/g, '_');
      const contactInfo = BRAND_CONTACT_INFO[brandKey] || BRAND_CONTACT_INFO.default!;

      // Determine coverage type
      let coverage: string;
      const warrantyYears = Math.ceil(
        (item.warrantyExpires.getTime() - item.installedAt.getTime()) / (1000 * 60 * 60 * 24 * 365)
      );

      if (warrantyYears >= 10) {
        coverage = 'Extended manufacturer warranty - covers defects in materials and workmanship';
      } else if (warrantyYears >= 5) {
        coverage = 'Standard manufacturer warranty - covers manufacturing defects and component failure';
      } else {
        coverage = 'Basic manufacturer warranty - covers manufacturing defects only';
      }

      return {
        itemId: item.id,
        itemName: `${item.brand} ${item.model}`,
        brand: item.brand,
        warrantyExpires: item.warrantyExpires,
        isExpired,
        daysRemaining: Math.max(0, daysRemaining),
        coverage,
        contactInfo,
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining); // Soonest expiring first
  }

  /**
   * Log a maintenance action for a specific item.
   *
   * @param twinId - Digital twin ID
   * @param itemId - Item ID within the twin
   * @param action - The maintenance action performed
   * @param notes - Optional notes about the maintenance
   */
  async logMaintenance(
    twinId: string,
    itemId: string,
    action: string,
    notes: string = ''
  ): Promise<void> {
    logger.info(`[DigitalTwin] Logging maintenance for item ${itemId} in twin ${twinId}: ${action}`);

    // In production, update the database record
    try {
      const twinRecord = await prisma.digitalTwin.findUnique({
        where: { id: twinId },
      });

      if (!twinRecord) {
        throw new Error(`Digital twin ${twinId} not found`);
      }

      const rawData = twinRecord.maintenanceData as Record<string, unknown> | null;
      const data = rawData ?? {};
      const item = (data.items as DigitalTwinItem[] | undefined)?.find((i) => i.id === itemId);

      if (item) {
        item.maintenanceLog.push({
          date: new Date(),
          action,
          notes,
        });

        await prisma.digitalTwin.update({
          where: { id: twinId },
          data: { maintenanceData: JSON.parse(JSON.stringify(data)) },
        });
      }
    } catch (err) {
      logger.warn('[DigitalTwin] Failed to persist maintenance log', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Get energy consumption estimates for the kitchen.
   * Calculates annual electricity, gas, and water usage based on installed items.
   *
   * @param twin - The digital twin
   * @returns Energy consumption estimate with cost breakdown
   */
  estimateEnergyConsumption(twin: DigitalTwin): EnergyEstimate {
    let totalElectricity = 0;
    let totalGas = 0;
    let totalWater = 0;
    const breakdown: EnergyEstimate['breakdown'] = [];

    // Add lighting baseline
    const lightingEstimate = ENERGY_ESTIMATES.lighting!;
    totalElectricity += lightingEstimate.electricity;
    breakdown.push({
      item: 'Kitchen Lighting',
      electricity: lightingEstimate.electricity,
      water: 0,
      cost: lightingEstimate.electricity * UTILITY_COSTS.electricityPerKwh,
    });

    // Add sink water usage baseline
    const sinkEstimate = ENERGY_ESTIMATES.sink!;
    totalWater += sinkEstimate.water;
    breakdown.push({
      item: 'Kitchen Sink',
      electricity: 0,
      water: sinkEstimate.water,
      cost: sinkEstimate.water * UTILITY_COSTS.waterPerLiter,
    });

    for (const item of twin.items) {
      const normalizedType = item.type.toLowerCase().replace(/[\s-]/g, '_');

      // Check if it's a gas appliance
      const isGas = item.specifications?.fuelType === 'gas' ||
        item.type.toLowerCase().includes('gas');
      const estimateKey = isGas ? `${normalizedType}_gas` : normalizedType;

      const estimate = ENERGY_ESTIMATES[estimateKey] || ENERGY_ESTIMATES[normalizedType];
      if (!estimate) continue;

      totalElectricity += estimate.electricity;
      totalWater += estimate.water;
      if (estimate.gas) {
        totalGas += estimate.gas;
      }

      const itemCost =
        estimate.electricity * UTILITY_COSTS.electricityPerKwh +
        estimate.water * UTILITY_COSTS.waterPerLiter +
        (estimate.gas ? estimate.gas * UTILITY_COSTS.gasPerM3 : 0);

      breakdown.push({
        item: `${item.brand} ${item.model} (${item.type})`,
        electricity: estimate.electricity,
        water: estimate.water,
        cost: Math.round(itemCost * 100) / 100,
      });
    }

    const annualCostElectricity = Math.round(totalElectricity * UTILITY_COSTS.electricityPerKwh * 100) / 100;
    const annualCostGas = totalGas > 0
      ? Math.round(totalGas * UTILITY_COSTS.gasPerM3 * 100) / 100
      : undefined;
    const annualCostWater = Math.round(totalWater * UTILITY_COSTS.waterPerLiter * 100) / 100;

    const totalAnnualCost = annualCostElectricity + (annualCostGas || 0) + annualCostWater;

    // Sort breakdown by cost (highest first)
    breakdown.sort((a, b) => b.cost - a.cost);

    return {
      annualElectricity: Math.round(totalElectricity),
      annualGas: totalGas > 0 ? Math.round(totalGas) : undefined,
      annualWater: Math.round(totalWater),
      annualCostElectricity,
      annualCostGas,
      annualCostWater,
      totalAnnualCost: Math.round(totalAnnualCost * 100) / 100,
      breakdown,
    };
  }
}
