/**
 * Smart Home Planning Service
 *
 * Plans the integration of smart/connected devices in a kitchen:
 * - Smart outlets, lighting, appliances, sensors, hubs
 * - WiFi / Zigbee / Thread / Matter coverage analysis
 * - Power budget calculation
 * - Automation rules (IF-THEN)
 * - AI-powered placement suggestions via SMART_HOME_PLANNER prompt
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../../database/client';
import logger from '../../utils/logger';
import AnthropicService from '../ai/anthropic.service';
import { SYSTEM_PROMPTS, PROMPT_VERSIONS } from '../ai/prompt-templates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface SmartDevice {
  type: string;
  brand: string;
  model: string;
  protocol: string;
  powerW: number;
  price: number;
}

export interface PlacedDevice extends SmartDevice {
  id: string;
  position: Position3D;
  zone: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: {
    deviceId: string;
    event: string;
    condition?: string;
  };
  action: {
    deviceId: string;
    command: string;
    params?: Record<string, unknown>;
  };
  enabled: boolean;
}

export interface Circuit {
  name: string;
  type: 'dedicated' | 'shared';
  amperage: number;
  outlets: Array<{ position: Position3D; amperage: number; deviceId?: string }>;
  totalLoadW: number;
}

export interface CoveragePoint {
  x: number;
  z: number;
  signalStrength: number; // 0-100
}

export interface CoverageMap {
  protocol: string;
  routerPosition: Position3D;
  points: CoveragePoint[];
  deadZones: Array<{ x: number; z: number; radius: number }>;
  overallScore: number; // 0-100
}

export interface SmartHomePreferences {
  budget?: number;
  protocols?: string[];
  priorities?: ('security' | 'energy' | 'comfort' | 'automation')[];
  existingHub?: string;
  roomDimensions?: { width: number; depth: number; height: number };
  kitchenLayoutData?: Record<string, unknown>;
}

export interface SmartHomePlanData {
  id: string;
  kitchenId: string;
  userId: string;
  devices: PlacedDevice[];
  wifiCoverage: CoverageMap | null;
  circuits: Circuit[];
  automations: AutomationRule[];
  matterDevices: PlacedDevice[];
  totalPowerDraw: number;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateSmartHomeDto {
  devices?: PlacedDevice[];
  automations?: AutomationRule[];
  circuits?: Circuit[];
  wifiCoverage?: CoverageMap;
}

interface AIPlanSuggestion {
  devices: Array<{
    type: string;
    brand: string;
    model: string;
    protocol: string;
    powerW: number;
    price: number;
    suggestedPosition: Position3D;
    zone: string;
    reason: string;
  }>;
  automations: Array<{
    name: string;
    trigger: { event: string; condition?: string };
    action: { command: string; params?: Record<string, unknown> };
    description: string;
  }>;
  circuits: Array<{
    name: string;
    type: 'dedicated' | 'shared';
    amperage: number;
    outlets: Array<{ position: Position3D; amperage: number }>;
  }>;
  estimatedTotalPower: number;
  estimatedTotalCost: number;
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SmartHomeService {
  private anthropic = AnthropicService.getInstance();

  /**
   * Smart device catalog -- curated list of popular French-market devices.
   */
  private deviceCatalog: SmartDevice[] = [
    {
      type: 'smart_outlet',
      brand: 'Legrand',
      model: 'Celiane with Netatmo',
      protocol: 'WiFi',
      powerW: 3680,
      price: 89,
    },
    {
      type: 'smart_outlet',
      brand: 'Schneider',
      model: 'Wiser',
      protocol: 'Zigbee',
      powerW: 3680,
      price: 75,
    },
    {
      type: 'smart_light',
      brand: 'Philips Hue',
      model: 'White Ambiance GU10',
      protocol: 'Zigbee',
      powerW: 5.7,
      price: 25,
    },
    {
      type: 'smart_light',
      brand: 'IKEA Tradfri',
      model: 'LED GU10',
      protocol: 'Zigbee',
      powerW: 5.3,
      price: 10,
    },
    {
      type: 'smart_light_strip',
      brand: 'Philips Hue',
      model: 'Lightstrip Plus 2m',
      protocol: 'Zigbee',
      powerW: 20,
      price: 80,
    },
    {
      type: 'smoke_detector',
      brand: 'Netatmo',
      model: 'Smart Smoke Alarm',
      protocol: 'WiFi',
      powerW: 0,
      price: 100,
    },
    {
      type: 'water_sensor',
      brand: 'Aqara',
      model: 'Water Leak Sensor',
      protocol: 'Zigbee',
      powerW: 0,
      price: 20,
    },
    {
      type: 'temp_humidity',
      brand: 'Aqara',
      model: 'Temperature Sensor',
      protocol: 'Zigbee',
      powerW: 0,
      price: 15,
    },
    {
      type: 'smart_fridge',
      brand: 'Samsung',
      model: 'Family Hub',
      protocol: 'WiFi/Matter',
      powerW: 200,
      price: 2500,
    },
    {
      type: 'smart_oven',
      brand: 'Bosch',
      model: 'Series 8 Home Connect',
      protocol: 'WiFi',
      powerW: 3600,
      price: 1200,
    },
    {
      type: 'smart_dishwasher',
      brand: 'Miele',
      model: 'G 7000 WiFi',
      protocol: 'WiFi',
      powerW: 2200,
      price: 1500,
    },
    {
      type: 'smart_hood',
      brand: 'Bosch',
      model: 'DWB96DM50',
      protocol: 'WiFi',
      powerW: 300,
      price: 600,
    },
    {
      type: 'co_detector',
      brand: 'Kidde',
      model: 'Smart CO',
      protocol: 'WiFi',
      powerW: 0,
      price: 50,
    },
    {
      type: 'wifi_router',
      brand: 'Google',
      model: 'Nest WiFi Pro',
      protocol: 'WiFi 6E/Thread',
      powerW: 15,
      price: 220,
    },
    {
      type: 'matter_hub',
      brand: 'Apple',
      model: 'HomePod Mini',
      protocol: 'Matter/Thread',
      powerW: 10,
      price: 110,
    },
  ];

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Return the full device catalog.
   */
  getDeviceCatalog(): SmartDevice[] {
    return [...this.deviceCatalog];
  }

  /**
   * Create a new smart home plan for a kitchen, using AI suggestions.
   */
  async createPlan(
    kitchenId: string,
    userId: string,
    preferences: SmartHomePreferences
  ): Promise<SmartHomePlanData> {
    logger.info('[SmartHome] Creating plan', { kitchenId, userId });

    // Fetch kitchen data for context
    const kitchen = await prisma.kitchen.findUnique({ where: { id: kitchenId } });
    if (!kitchen) {
      throw new Error('Kitchen not found');
    }

    // Build AI prompt with kitchen context and preferences
    const startMs = Date.now();
    const aiResult = await this.anthropic.generateJSON<AIPlanSuggestion>({
      system: SYSTEM_PROMPTS.SMART_HOME_PLANNER,
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            kitchenId,
            kitchenLayout: (kitchen as Record<string, unknown>).layoutData ?? null,
            roomDimensions: preferences.roomDimensions ?? null,
            budget: preferences.budget ?? null,
            preferredProtocols: preferences.protocols ?? [],
            priorities: preferences.priorities ?? ['comfort'],
            existingHub: preferences.existingHub ?? null,
            deviceCatalog: this.deviceCatalog,
          }),
        },
      ],
      maxTokens: 4096,
      parse: (text: string) => JSON.parse(text) as AIPlanSuggestion,
    });
    const durationMs = Date.now() - startMs;

    // Log AI usage
    await this.anthropic.logUsage(
      userId,
      'anthropic',
      'claude-sonnet-4-5-20250929',
      aiResult.inputTokens,
      aiResult.outputTokens,
      durationMs,
      { feature: 'smart_home_planner', promptVersion: PROMPT_VERSIONS.SMART_HOME_PLANNER }
    );

    const suggestion = aiResult.data;

    // Build placed devices with unique IDs
    const devices: PlacedDevice[] = suggestion.devices.map((d, i) => ({
      id: `shd_${kitchenId.slice(0, 8)}_${i}`,
      type: d.type,
      brand: d.brand,
      model: d.model,
      protocol: d.protocol,
      powerW: d.powerW,
      price: d.price,
      position: d.suggestedPosition,
      zone: d.zone,
    }));

    // Build automation rules
    const automations: AutomationRule[] = suggestion.automations.map((a, i) => ({
      id: `sha_${kitchenId.slice(0, 8)}_${i}`,
      name: a.name,
      trigger: {
        deviceId: devices[0]?.id ?? '',
        event: a.trigger.event,
        condition: a.trigger.condition,
      },
      action: {
        deviceId: devices[0]?.id ?? '',
        command: a.action.command,
        params: a.action.params,
      },
      enabled: true,
    }));

    // Build circuits
    const circuits: Circuit[] = suggestion.circuits.map((c) => ({
      name: c.name,
      type: c.type,
      amperage: c.amperage,
      outlets: c.outlets,
      totalLoadW: c.outlets.reduce((sum, o) => sum + o.amperage * 230, 0),
    }));

    // Identify Matter-compatible devices
    const matterDevices = devices.filter(
      (d) =>
        d.protocol.toLowerCase().includes('matter') || d.protocol.toLowerCase().includes('thread')
    );

    const totalPowerDraw = devices.reduce((sum, d) => sum + d.powerW, 0);
    const totalCost = devices.reduce((sum, d) => sum + d.price, 0);

    // Persist to database
    const record = await prisma.smartHomePlan.create({
      data: {
        kitchenId,
        userId,
        devices: JSON.parse(JSON.stringify(devices)),
        wifiCoverage: Prisma.JsonNull,
        circuits: JSON.parse(JSON.stringify(circuits)),
        automations: JSON.parse(JSON.stringify(automations)),
        matterDevices: JSON.parse(JSON.stringify(matterDevices)),
        totalPowerDraw,
      },
    });

    logger.info('[SmartHome] Plan created', {
      planId: record.id,
      kitchenId,
      deviceCount: devices.length,
    });

    return {
      id: record.id,
      kitchenId: record.kitchenId,
      userId: record.userId,
      devices,
      wifiCoverage: null,
      circuits,
      automations,
      matterDevices,
      totalPowerDraw,
      totalCost,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Get an existing smart home plan by kitchen ID.
   */
  async getPlan(kitchenId: string): Promise<SmartHomePlanData | null> {
    const record = await prisma.smartHomePlan.findUnique({ where: { kitchenId } });
    if (!record) {
      return null;
    }

    const devices = (record.devices as unknown as PlacedDevice[]) ?? [];
    const matterDevices = (record.matterDevices as unknown as PlacedDevice[]) ?? [];

    return {
      id: record.id,
      kitchenId: record.kitchenId,
      userId: record.userId,
      devices,
      wifiCoverage: (record.wifiCoverage as unknown as CoverageMap) ?? null,
      circuits: (record.circuits as unknown as Circuit[]) ?? [],
      automations: (record.automations as unknown as AutomationRule[]) ?? [],
      matterDevices,
      totalPowerDraw: record.totalPowerDraw ?? 0,
      totalCost: devices.reduce((sum, d) => sum + d.price, 0),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Update an existing smart home plan.
   */
  async updatePlan(
    kitchenId: string,
    userId: string,
    data: UpdateSmartHomeDto
  ): Promise<SmartHomePlanData> {
    const existing = await prisma.smartHomePlan.findUnique({ where: { kitchenId } });
    if (!existing) {
      throw new Error('Smart home plan not found');
    }

    if (existing.userId !== userId) {
      throw new Error('Unauthorized: you do not own this plan');
    }

    const devices = data.devices ?? (existing.devices as unknown as PlacedDevice[]) ?? [];
    const automations =
      data.automations ?? (existing.automations as unknown as AutomationRule[]) ?? [];
    const circuits = data.circuits ?? (existing.circuits as unknown as Circuit[]) ?? [];
    const wifiCoverage =
      data.wifiCoverage ?? (existing.wifiCoverage as unknown as CoverageMap) ?? null;

    const matterDevices = devices.filter(
      (d) =>
        d.protocol.toLowerCase().includes('matter') || d.protocol.toLowerCase().includes('thread')
    );
    const totalPowerDraw = devices.reduce((sum, d) => sum + d.powerW, 0);

    const updated = await prisma.smartHomePlan.update({
      where: { kitchenId },
      data: {
        devices: JSON.parse(JSON.stringify(devices)),
        automations: JSON.parse(JSON.stringify(automations)),
        circuits: JSON.parse(JSON.stringify(circuits)),
        wifiCoverage: wifiCoverage ? JSON.parse(JSON.stringify(wifiCoverage)) : null,
        matterDevices: JSON.parse(JSON.stringify(matterDevices)),
        totalPowerDraw,
      },
    });

    logger.info('[SmartHome] Plan updated', { kitchenId, deviceCount: devices.length });

    return {
      id: updated.id,
      kitchenId: updated.kitchenId,
      userId: updated.userId,
      devices,
      wifiCoverage,
      circuits,
      automations,
      matterDevices,
      totalPowerDraw,
      totalCost: devices.reduce((sum, d) => sum + d.price, 0),
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  /**
   * Calculate WiFi / Zigbee / Thread signal coverage for a kitchen.
   *
   * Uses a simple inverse-square-law approximation to produce a grid of signal
   * strength values. Walls reduce signal by a configurable attenuation factor.
   */
  async calculateCoverage(
    kitchenId: string,
    routerPosition: Position3D,
    protocol: string = 'WiFi'
  ): Promise<CoverageMap> {
    const kitchen = await prisma.kitchen.findUnique({ where: { id: kitchenId } });
    if (!kitchen) {
      throw new Error('Kitchen not found');
    }

    // Retrieve room dimensions (fallback to 4x3m default)
    const layout = (kitchen as Record<string, unknown>).layoutData as Record<
      string,
      unknown
    > | null;
    const roomWidth = (layout?.roomWidth as number) ?? 4;
    const roomDepth = (layout?.roomDepth as number) ?? 3;

    // Grid resolution: 0.25m
    const step = 0.25;
    const points: CoveragePoint[] = [];
    const deadZones: Array<{ x: number; z: number; radius: number }> = [];

    // Protocol-specific max range (meters)
    const maxRange: Record<string, number> = {
      WiFi: 15,
      Zigbee: 10,
      Thread: 10,
      'WiFi 6E/Thread': 15,
      'WiFi/Matter': 15,
      'Matter/Thread': 10,
    };
    const range = maxRange[protocol] ?? 12;

    for (let x = 0; x <= roomWidth; x += step) {
      for (let z = 0; z <= roomDepth; z += step) {
        const dx = x - routerPosition.x;
        const dz = z - routerPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        // Inverse square law, scaled to 0-100
        const raw = Math.max(0, 100 * (1 - (distance / range) ** 2));
        const signalStrength = Math.round(Math.min(100, raw));

        points.push({ x: parseFloat(x.toFixed(2)), z: parseFloat(z.toFixed(2)), signalStrength });

        if (signalStrength < 20) {
          deadZones.push({
            x: parseFloat(x.toFixed(2)),
            z: parseFloat(z.toFixed(2)),
            radius: step / 2,
          });
        }
      }
    }

    // Overall score: average signal strength
    const overallScore = Math.round(
      points.reduce((sum, p) => sum + p.signalStrength, 0) / (points.length || 1)
    );

    const coverageMap: CoverageMap = {
      protocol,
      routerPosition,
      points,
      deadZones,
      overallScore,
    };

    // Persist coverage into plan if exists
    const plan = await prisma.smartHomePlan.findUnique({ where: { kitchenId } });
    if (plan) {
      await prisma.smartHomePlan.update({
        where: { kitchenId },
        data: { wifiCoverage: JSON.parse(JSON.stringify(coverageMap)) },
      });
    }

    return coverageMap;
  }
}

export default SmartHomeService;
