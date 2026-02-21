/**
 * Compliance Service — Building Code Compliance Checker
 *
 * Evaluates kitchen configurations against French building codes:
 *  - NF C 15-100 (electrical)
 *  - NF DTU 24.1 (ventilation)
 *  - NF P 99-611 (PMR / accessibility)
 *  - Safety distances
 *
 * Runs deterministic geometric checks first, then falls back to
 * the AnthropicService for complex spatial analysis when needed.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../database/client';
import logger from '../../utils/logger';
import { AnthropicService } from '../ai/anthropic.service';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface ComplianceResultItem {
  ruleId: string;
  ruleCode: string;
  ruleName: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  severity: string;
  position?: { x: number; y: number; z: number } | null;
  fixSuggestion?: string;
}

export interface ComplianceCheckResult {
  id: string;
  kitchenId: string;
  userId: string;
  status: 'passed' | 'failed';
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  results: ComplianceResultItem[];
  checkedAt: Date;
}

export interface KitchenElement {
  id: string;
  type: string;        // e.g. "hob", "oven", "dishwasher", "fridge", "hood", "sink", "outlet", "cabinet"
  subType?: string;    // e.g. "gas", "induction", "electric"
  position: { x: number; y: number; z?: number };
  dimensions?: { width: number; depth: number; height: number };
  rotation?: number;
  metadata?: Record<string, unknown>;
}

export interface KitchenConfig {
  id: string;
  width: number;       // cm
  length: number;      // cm
  height: number;      // cm
  elements: KitchenElement[];
  hasGas?: boolean;
  vmcFlowRate?: number;     // m3/h
  hasAirIntake?: boolean;
  passageWidth?: number;    // cm — narrowest passage between cabinets
  isPMR?: boolean;          // accessibility mode
  worktopHeight?: number;   // cm
  metadata?: Record<string, unknown>;
}

interface RuleCondition {
  type: string;
  source?: string;
  target?: string;
  minMm?: number;
  minCm?: number;
  maxCm?: number;
  amperage?: number;
  circuit?: string;
  flowRate?: number;
  [key: string]: unknown;
}

// ----------------------------------------------------------------
// Default Rules
// ----------------------------------------------------------------

interface DefaultRule {
  code: string;
  category: string;
  name: string;
  description: string;
  condition: RuleCondition;
  severity: string;
}

const DEFAULT_RULES: DefaultRule[] = [
  // ─── Electrical (NF C 15-100) ───────────────────────────────────
  {
    code: 'NF_C_15_100',
    category: 'electrical',
    name: 'Circuit dédié plaque de cuisson 32A',
    description: 'La plaque de cuisson doit être alimentée par un circuit dédié 32A selon NF C 15-100.',
    condition: { type: 'dedicated_circuit', source: 'hob', amperage: 32, circuit: 'dedicated' },
    severity: 'error',
  },
  {
    code: 'NF_C_15_100',
    category: 'electrical',
    name: 'Circuit dédié four 20A',
    description: 'Le four doit être alimenté par un circuit dédié 20A selon NF C 15-100.',
    condition: { type: 'dedicated_circuit', source: 'oven', amperage: 20, circuit: 'dedicated' },
    severity: 'error',
  },
  {
    code: 'NF_C_15_100',
    category: 'electrical',
    name: 'Circuit dédié lave-vaisselle 16A',
    description: 'Le lave-vaisselle doit être sur un circuit dédié 16A.',
    condition: { type: 'dedicated_circuit', source: 'dishwasher', amperage: 16, circuit: 'dedicated' },
    severity: 'error',
  },
  {
    code: 'NF_C_15_100',
    category: 'electrical',
    name: 'Circuit réfrigérateur 16A',
    description: 'Le réfrigérateur doit disposer d\'un circuit 16A.',
    condition: { type: 'dedicated_circuit', source: 'fridge', amperage: 16, circuit: 'dedicated' },
    severity: 'error',
  },
  {
    code: 'NF_C_15_100',
    category: 'electrical',
    name: 'Circuit hotte 10A',
    description: 'La hotte aspirante doit être alimentée par un circuit 10A.',
    condition: { type: 'dedicated_circuit', source: 'hood', amperage: 10, circuit: 'dedicated' },
    severity: 'warning',
  },
  {
    code: 'NF_C_15_100',
    category: 'electrical',
    name: 'Pas de prise au-dessus de l\'évier',
    description: 'Aucune prise ne doit se trouver à moins de 60 cm horizontalement de l\'évier (NF C 15-100, volume 1).',
    condition: { type: 'min_distance', source: 'outlet', target: 'sink', minCm: 60 },
    severity: 'error',
  },
  {
    code: 'NF_C_15_100',
    category: 'electrical',
    name: 'Pas de prise au-dessus de la plaque',
    description: 'Aucune prise électrique ne doit être placée au-dessus de la plaque de cuisson.',
    condition: { type: 'no_outlet_above', source: 'outlet', target: 'hob' },
    severity: 'error',
  },
  {
    code: 'NF_C_15_100',
    category: 'electrical',
    name: 'Différentiel 30mA obligatoire',
    description: 'Toutes les prises cuisine doivent être protégées par un différentiel 30mA (GFCI).',
    condition: { type: 'gfci_required', source: 'outlet', threshold: 30 },
    severity: 'error',
  },
  {
    code: 'NF_C_15_100',
    category: 'electrical',
    name: 'Prises à min 8cm du sol fini',
    description: 'Les prises doivent être installées à un minimum de 8 cm du sol fini.',
    condition: { type: 'min_height', source: 'outlet', minCm: 8 },
    severity: 'error',
  },
  {
    code: 'NF_C_15_100',
    category: 'electrical',
    name: 'Minimum 6 prises en cuisine',
    description: 'NF C 15-100 impose un minimum de 6 prises de courant dans une cuisine de plus de 4 m².',
    condition: { type: 'min_count', source: 'outlet', minCount: 6 },
    severity: 'warning',
  },

  // ─── Safety Distances ─────────────────────────────────────────
  {
    code: 'NF_EN_1116',
    category: 'safety',
    name: 'Distance min plaque — point d\'eau (60 cm)',
    description: 'La plaque de cuisson doit être à au moins 60 cm de tout point d\'eau (évier, robinet).',
    condition: { type: 'min_distance', source: 'hob', target: 'sink', minCm: 60 },
    severity: 'error',
  },
  {
    code: 'NF_EN_1116',
    category: 'safety',
    name: 'Distance hotte — plaque gaz (65 cm)',
    description: 'La hotte doit être à au moins 65 cm au-dessus d\'une plaque à gaz.',
    condition: { type: 'min_vertical_distance', source: 'hood', target: 'hob', subType: 'gas', minCm: 65 },
    severity: 'error',
  },
  {
    code: 'NF_EN_1116',
    category: 'safety',
    name: 'Distance hotte — plaque électrique/induction (55 cm)',
    description: 'La hotte doit être à au moins 55 cm au-dessus d\'une plaque électrique ou induction.',
    condition: { type: 'min_vertical_distance', source: 'hood', target: 'hob', subType: 'electric_or_induction', minCm: 55 },
    severity: 'error',
  },
  {
    code: 'NF_EN_1116',
    category: 'safety',
    name: 'Distance plaque — mur latéral (40 cm)',
    description: 'La plaque de cuisson doit être à au moins 40 cm d\'un mur latéral.',
    condition: { type: 'min_distance_to_wall', source: 'hob', minCm: 40 },
    severity: 'warning',
  },
  {
    code: 'NF_EN_1116',
    category: 'safety',
    name: 'Ventilation derrière réfrigérateur (5 cm)',
    description: 'Un espace d\'au moins 5 cm doit être maintenu derrière le réfrigérateur pour la ventilation.',
    condition: { type: 'min_distance_to_wall', source: 'fridge', minCm: 5 },
    severity: 'warning',
  },
  {
    code: 'NF_EN_1116',
    category: 'safety',
    name: 'Plaque non adjacente à fenêtre ouvrable',
    description: 'La plaque de cuisson ne doit pas être placée directement sous ou à côté d\'une fenêtre ouvrable (courants d\'air dangereux).',
    condition: { type: 'min_distance', source: 'hob', target: 'window', minCm: 40 },
    severity: 'warning',
  },

  // ─── Ventilation (NF DTU 24.1) ───────────────────────────────
  {
    code: 'NF_DTU_24_1',
    category: 'ventilation',
    name: 'VMC extraction 120 m³/h minimum',
    description: 'La cuisine doit disposer d\'une extraction mécanique d\'au moins 120 m³/h (NF DTU 24.1).',
    condition: { type: 'min_flow_rate', flowRate: 120 },
    severity: 'error',
  },
  {
    code: 'NF_DTU_24_1',
    category: 'ventilation',
    name: 'Amenée d\'air obligatoire si gaz',
    description: 'Si des appareils gaz sont présents, une amenée d\'air (grille basse) est obligatoire.',
    condition: { type: 'air_intake_if_gas' },
    severity: 'error',
  },

  // ─── Accessibility (PMR NF P 99-611) ──────────────────────────
  {
    code: 'PMR',
    category: 'accessibility',
    name: 'Passage min 90 cm entre meubles',
    description: 'Le passage entre deux rangées de meubles doit être d\'au moins 90 cm pour l\'accessibilité PMR.',
    condition: { type: 'min_passage', minCm: 90 },
    severity: 'error',
  },
  {
    code: 'PMR',
    category: 'accessibility',
    name: 'Cercle de rotation fauteuil 150 cm',
    description: 'Un espace libre de 150 cm de diamètre doit permettre la rotation d\'un fauteuil roulant.',
    condition: { type: 'turning_circle', minCm: 150 },
    severity: 'error',
  },
  {
    code: 'PMR',
    category: 'accessibility',
    name: 'Plan de travail entre 75-85 cm pour PMR',
    description: 'Le plan de travail doit être entre 75 et 85 cm de hauteur pour l\'accessibilité PMR.',
    condition: { type: 'worktop_height_range', minCm: 75, maxCm: 85 },
    severity: 'error',
  },
  {
    code: 'PMR',
    category: 'accessibility',
    name: 'Prises entre 40-130 cm du sol',
    description: 'Les prises électriques doivent être placées entre 40 et 130 cm du sol pour l\'accessibilité PMR.',
    condition: { type: 'outlet_height_range', minCm: 40, maxCm: 130 },
    severity: 'warning',
  },
];

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class ComplianceService {
  /**
   * Run all active compliance rules against a kitchen configuration.
   */
  async checkKitchenCompliance(
    kitchenId: string,
    userId: string,
  ): Promise<ComplianceCheckResult> {
    // 1. Load kitchen from DB
    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId },
      include: { items: { include: { product: true } } },
    });

    if (!kitchen) {
      throw new ComplianceServiceError('KITCHEN_NOT_FOUND', `Kitchen ${kitchenId} not found`);
    }

    // 2. Build kitchen config from DB data
    const kitchenConfig = this.buildKitchenConfig(kitchen);

    // 3. Load active rules
    const rules = await prisma.complianceRule.findMany({
      where: { isActive: true },
    });

    if (rules.length === 0) {
      throw new ComplianceServiceError('NO_RULES', 'No active compliance rules found. Run seed first.');
    }

    // 4. Evaluate each rule
    const results: ComplianceResultItem[] = [];

    for (const rule of rules) {
      const condition = rule.condition as unknown as RuleCondition;
      const result = this.evaluateRule(rule, condition, kitchenConfig);
      results.push(result);
    }

    // 5. If we have unresolved complex checks, attempt AI fallback
    const unresolvedCount = results.filter(r => r.status === 'warning' && r.message.includes('[needs-spatial-analysis]')).length;
    if (unresolvedCount > 0 && kitchenConfig.elements.length > 0) {
      try {
        await this.aiSpatialFallback(kitchenConfig, results);
      } catch (err) {
        logger.warn('[Compliance] AI spatial fallback failed, keeping geometric results', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 6. Compute summary
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const overallStatus = failed > 0 ? 'failed' : 'passed';

    // 7. Store in DB
    const check = await prisma.complianceCheck.create({
      data: {
        kitchenId,
        userId,
        status: overallStatus,
        totalRules: rules.length,
        passedRules: passed,
        failedRules: failed,
        warningRules: warnings,
        results: results as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: check.id,
      kitchenId,
      userId,
      status: overallStatus as 'passed' | 'failed',
      totalRules: rules.length,
      passedRules: passed,
      failedRules: failed,
      warningRules: warnings,
      results,
      checkedAt: check.checkedAt,
    };
  }

  /**
   * Get all active compliance rules, optionally filtered by category.
   */
  async getRules(category?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (category) {
      where.category = category;
    }
    return prisma.complianceRule.findMany({ where, orderBy: { code: 'asc' } });
  }

  /**
   * Get rules filtered by code (e.g., "NF_C_15_100").
   */
  async getRulesByCode(code: string) {
    return prisma.complianceRule.findMany({
      where: { code, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get compliance check history for a kitchen.
   */
  async getCheckHistory(kitchenId: string) {
    return prisma.complianceCheck.findMany({
      where: { kitchenId },
      orderBy: { checkedAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Seed default French building code rules into the database.
   * Uses upsert to avoid duplicates on re-run.
   */
  async seedDefaultRules(): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const rule of DEFAULT_RULES) {
      const existing = await prisma.complianceRule.findFirst({
        where: { code: rule.code, name: rule.name },
      });

      if (existing) {
        await prisma.complianceRule.update({
          where: { id: existing.id },
          data: {
            description: rule.description,
            category: rule.category,
            condition: rule.condition as unknown as Prisma.InputJsonValue,
            severity: rule.severity,
            isActive: true,
          },
        });
        updated++;
      } else {
        await prisma.complianceRule.create({
          data: {
            code: rule.code,
            category: rule.category,
            name: rule.name,
            description: rule.description,
            condition: rule.condition as unknown as Prisma.InputJsonValue,
            severity: rule.severity,
            isActive: true,
          },
        });
        created++;
      }
    }

    logger.info(`[Compliance] Seeded rules: ${created} created, ${updated} updated`);
    return { created, updated };
  }

  // ----------------------------------------------------------------
  // Private: Build kitchen config from DB data
  // ----------------------------------------------------------------

  private buildKitchenConfig(kitchen: any): KitchenConfig {
    const elements: KitchenElement[] = [];

    // Extract elements from kitchen items
    if (kitchen.items && Array.isArray(kitchen.items)) {
      for (const item of kitchen.items) {
        const product = item.product;
        const elementType = this.inferElementType(product?.category, product?.name, item.metadata);
        const position = item.position as { x: number; y: number; z?: number } | null;

        elements.push({
          id: item.id,
          type: elementType,
          subType: this.inferSubType(product?.name, product?.category, item.metadata),
          position: position ?? { x: 0, y: 0 },
          dimensions: product?.dimensions as { width: number; depth: number; height: number } | undefined,
          rotation: item.rotation ?? 0,
          metadata: {
            ...(item.metadata as Record<string, unknown> || {}),
            productName: product?.name,
            productCategory: product?.category,
          },
        });
      }
    }

    // Also parse metadata-level elements if present (from 3D designer)
    const kitchenMeta = kitchen.metadata as Record<string, unknown> | null;
    if (kitchenMeta?.elements && Array.isArray(kitchenMeta.elements)) {
      for (const el of kitchenMeta.elements as KitchenElement[]) {
        // Avoid duplicates
        if (!elements.find(e => e.id === el.id)) {
          elements.push(el);
        }
      }
    }

    return {
      id: kitchen.id,
      width: kitchen.width ?? 300,
      length: kitchen.length ?? 400,
      height: kitchen.height ?? 250,
      elements,
      hasGas: kitchenMeta?.hasGas as boolean | undefined ?? elements.some(e => e.subType === 'gas'),
      vmcFlowRate: kitchenMeta?.vmcFlowRate as number | undefined,
      hasAirIntake: kitchenMeta?.hasAirIntake as boolean | undefined,
      passageWidth: kitchenMeta?.passageWidth as number | undefined,
      isPMR: kitchenMeta?.isPMR as boolean | undefined,
      worktopHeight: kitchenMeta?.worktopHeight as number | undefined,
      metadata: kitchenMeta ?? undefined,
    };
  }

  private inferElementType(category?: string, name?: string, metadata?: unknown): string {
    const cat = (category || '').toLowerCase();
    const nm = (name || '').toLowerCase();
    const meta = metadata as Record<string, unknown> | undefined;
    const metaType = (meta?.elementType as string || '').toLowerCase();

    if (metaType) return metaType;
    if (cat.includes('hob') || cat.includes('plaque') || cat.includes('cooktop') || nm.includes('plaque')) return 'hob';
    if (cat.includes('oven') || cat.includes('four') || nm.includes('four')) return 'oven';
    if (cat.includes('dishwasher') || cat.includes('lave-vaisselle') || nm.includes('lave-vaisselle')) return 'dishwasher';
    if (cat.includes('fridge') || cat.includes('réfrigérateur') || cat.includes('refriger') || nm.includes('réfrigérateur')) return 'fridge';
    if (cat.includes('hood') || cat.includes('hotte') || nm.includes('hotte')) return 'hood';
    if (cat.includes('sink') || cat.includes('évier') || nm.includes('évier')) return 'sink';
    if (cat.includes('outlet') || cat.includes('prise') || nm.includes('prise')) return 'outlet';
    if (cat.includes('window') || cat.includes('fenêtre') || nm.includes('fenêtre')) return 'window';
    if (cat.includes('cabinet') || cat.includes('meuble') || nm.includes('meuble')) return 'cabinet';
    return 'unknown';
  }

  private inferSubType(name?: string, category?: string, metadata?: unknown): string | undefined {
    const combined = `${name || ''} ${category || ''}`.toLowerCase();
    const meta = metadata as Record<string, unknown> | undefined;
    const metaSubType = meta?.subType as string | undefined;

    if (metaSubType) return metaSubType;
    if (combined.includes('gaz') || combined.includes('gas')) return 'gas';
    if (combined.includes('induction')) return 'induction';
    if (combined.includes('électrique') || combined.includes('electric') || combined.includes('vitrocéramique')) return 'electric';
    return undefined;
  }

  // ----------------------------------------------------------------
  // Private: Rule evaluation
  // ----------------------------------------------------------------

  private evaluateRule(
    rule: { id: string; code: string; name: string; severity: string; description: string },
    condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    const base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'> = {
      ruleId: rule.id,
      ruleCode: rule.code,
      ruleName: rule.name,
      severity: rule.severity,
    };

    switch (condition.type) {
      case 'dedicated_circuit':
        return this.checkDedicatedCircuit(base, condition, kitchen);

      case 'min_distance':
        return this.checkMinDistance(base, condition, kitchen);

      case 'no_outlet_above':
        return this.checkNoOutletAbove(base, condition, kitchen);

      case 'gfci_required':
        return this.checkGFCI(base, condition, kitchen);

      case 'min_height':
        return this.checkMinHeight(base, condition, kitchen);

      case 'min_count':
        return this.checkMinCount(base, condition, kitchen);

      case 'min_vertical_distance':
        return this.checkMinVerticalDistance(base, condition, kitchen);

      case 'min_distance_to_wall':
        return this.checkMinDistanceToWall(base, condition, kitchen);

      case 'min_flow_rate':
        return this.checkMinFlowRate(base, condition, kitchen);

      case 'air_intake_if_gas':
        return this.checkAirIntakeIfGas(base, condition, kitchen);

      case 'min_passage':
        return this.checkMinPassage(base, condition, kitchen);

      case 'turning_circle':
        return this.checkTurningCircle(base, condition, kitchen);

      case 'worktop_height_range':
        return this.checkWorktopHeightRange(base, condition, kitchen);

      case 'outlet_height_range':
        return this.checkOutletHeightRange(base, condition, kitchen);

      default:
        return {
          ...base,
          status: 'warning',
          message: `[needs-spatial-analysis] Rule type "${condition.type}" requires advanced analysis.`,
          position: null,
        };
    }
  }

  // ─── Individual check methods ─────────────────────────────────

  private checkDedicatedCircuit(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    const appliances = kitchen.elements.filter(e => e.type === condition.source);
    if (appliances.length === 0) {
      return { ...base, status: 'passed', message: `Aucun ${condition.source} détecté — règle non applicable.`, position: null };
    }

    // Check metadata for circuit info
    for (const appliance of appliances) {
      const meta = appliance.metadata as Record<string, unknown> | undefined;
      const circuit = meta?.circuit as string | undefined;
      const amperage = meta?.amperage as number | undefined;

      if (circuit && circuit !== 'dedicated') {
        return {
          ...base,
          status: 'failed',
          message: `${base.ruleName}: Le ${condition.source} n'est pas sur un circuit dédié.`,
          position: { x: appliance.position.x, y: appliance.position.y, z: appliance.position.z ?? 0 },
          fixSuggestion: `Installer un circuit dédié ${condition.amperage}A pour le ${condition.source}.`,
        };
      }

      if (amperage != null && condition.amperage != null && amperage < condition.amperage) {
        return {
          ...base,
          status: 'failed',
          message: `${base.ruleName}: Circuit ${amperage}A insuffisant (${condition.amperage}A requis).`,
          position: { x: appliance.position.x, y: appliance.position.y, z: appliance.position.z ?? 0 },
          fixSuggestion: `Remplacer le disjoncteur par un ${condition.amperage}A et vérifier la section du câble.`,
        };
      }
    }

    return { ...base, status: 'passed', message: `${base.ruleName}: Conforme.`, position: null };
  }

  private checkMinDistance(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    const sources = kitchen.elements.filter(e => e.type === condition.source);
    const targets = kitchen.elements.filter(e => e.type === condition.target);
    const minCm = condition.minCm ?? (condition.minMm ? condition.minMm / 10 : 0);

    if (sources.length === 0 || targets.length === 0) {
      return { ...base, status: 'passed', message: `${base.ruleName}: Éléments non présents — règle non applicable.`, position: null };
    }

    for (const src of sources) {
      for (const tgt of targets) {
        const dist = this.distance2D(src.position, tgt.position);
        if (dist < minCm) {
          return {
            ...base,
            status: 'failed',
            message: `${base.ruleName}: Distance ${Math.round(dist)} cm < ${minCm} cm requis.`,
            position: { x: src.position.x, y: src.position.y, z: src.position.z ?? 0 },
            fixSuggestion: `Éloigner le ${condition.source} du ${condition.target} d'au moins ${minCm} cm.`,
          };
        }
      }
    }

    return { ...base, status: 'passed', message: `${base.ruleName}: Conforme.`, position: null };
  }

  private checkNoOutletAbove(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    _condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    const outlets = kitchen.elements.filter(e => e.type === 'outlet');
    const hobs = kitchen.elements.filter(e => e.type === 'hob');

    if (outlets.length === 0 || hobs.length === 0) {
      return { ...base, status: 'passed', message: `${base.ruleName}: Éléments non présents — règle non applicable.`, position: null };
    }

    for (const outlet of outlets) {
      for (const hob of hobs) {
        // Check if outlet is roughly above the hob (within 40cm horizontal, and higher Z)
        const horizDist = this.distance2D(outlet.position, hob.position);
        const outletZ = outlet.position.z ?? 110; // default outlet height ~110cm
        const hobZ = hob.position.z ?? 90;         // default hob height ~90cm

        if (horizDist < 40 && outletZ > hobZ) {
          return {
            ...base,
            status: 'failed',
            message: `${base.ruleName}: Prise détectée au-dessus de la plaque de cuisson.`,
            position: { x: outlet.position.x, y: outlet.position.y, z: outletZ },
            fixSuggestion: 'Déplacer la prise hors de la zone au-dessus de la plaque de cuisson.',
          };
        }
      }
    }

    return { ...base, status: 'passed', message: `${base.ruleName}: Conforme.`, position: null };
  }

  private checkGFCI(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    _condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    const outlets = kitchen.elements.filter(e => e.type === 'outlet');
    if (outlets.length === 0) {
      return { ...base, status: 'passed', message: `${base.ruleName}: Aucune prise détectée — règle non applicable.`, position: null };
    }

    for (const outlet of outlets) {
      const meta = outlet.metadata as Record<string, unknown> | undefined;
      const hasGFCI = meta?.gfci as boolean | undefined;

      if (hasGFCI === false) {
        return {
          ...base,
          status: 'failed',
          message: `${base.ruleName}: Prise sans protection différentielle 30mA.`,
          position: { x: outlet.position.x, y: outlet.position.y, z: outlet.position.z ?? 0 },
          fixSuggestion: 'Installer un interrupteur différentiel 30mA en amont de cette prise.',
        };
      }
    }

    return { ...base, status: 'passed', message: `${base.ruleName}: Conforme.`, position: null };
  }

  private checkMinHeight(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    const elements = kitchen.elements.filter(e => e.type === condition.source);
    const minCm = condition.minCm ?? 0;

    if (elements.length === 0) {
      return { ...base, status: 'passed', message: `${base.ruleName}: Aucun ${condition.source} détecté.`, position: null };
    }

    for (const el of elements) {
      const z = el.position.z ?? 0;
      if (z < minCm) {
        return {
          ...base,
          status: 'failed',
          message: `${base.ruleName}: Hauteur ${z} cm < ${minCm} cm requis.`,
          position: { x: el.position.x, y: el.position.y, z },
          fixSuggestion: `Remonter le ${condition.source} à au moins ${minCm} cm du sol.`,
        };
      }
    }

    return { ...base, status: 'passed', message: `${base.ruleName}: Conforme.`, position: null };
  }

  private checkMinCount(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    const elements = kitchen.elements.filter(e => e.type === condition.source);
    const minCount = (condition as any).minCount ?? 0;

    if (elements.length >= minCount) {
      return { ...base, status: 'passed', message: `${base.ruleName}: ${elements.length} ${condition.source}(s) — conforme.`, position: null };
    }

    return {
      ...base,
      status: 'warning',
      message: `${base.ruleName}: ${elements.length} ${condition.source}(s) détecté(s), minimum ${minCount} requis.`,
      position: null,
      fixSuggestion: `Ajouter au moins ${minCount - elements.length} prise(s) supplémentaire(s).`,
    };
  }

  private checkMinVerticalDistance(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    const sources = kitchen.elements.filter(e => e.type === condition.source);
    const targets = kitchen.elements.filter(e => e.type === condition.target);
    const minCm = condition.minCm ?? 0;

    // Filter targets by subType if specified
    const filteredTargets = condition.subType
      ? targets.filter(t => {
          if (condition.subType === 'electric_or_induction') {
            return t.subType === 'electric' || t.subType === 'induction' || !t.subType;
          }
          return t.subType === condition.subType;
        })
      : targets;

    if (sources.length === 0 || filteredTargets.length === 0) {
      return { ...base, status: 'passed', message: `${base.ruleName}: Éléments non présents — règle non applicable.`, position: null };
    }

    for (const src of sources) {
      for (const tgt of filteredTargets) {
        const srcZ = src.position.z ?? 200; // hood default ~200cm
        const tgtZ = tgt.position.z ?? 90;  // hob default ~90cm
        const vertDist = Math.abs(srcZ - tgtZ);

        // Only check if they're horizontally close (above each other)
        const horizDist = this.distance2D(src.position, tgt.position);
        if (horizDist < 80 && vertDist < minCm) {
          return {
            ...base,
            status: 'failed',
            message: `${base.ruleName}: Distance verticale ${Math.round(vertDist)} cm < ${minCm} cm requis.`,
            position: { x: src.position.x, y: src.position.y, z: srcZ },
            fixSuggestion: `Remonter la hotte à au moins ${minCm} cm au-dessus de la plaque.`,
          };
        }
      }
    }

    return { ...base, status: 'passed', message: `${base.ruleName}: Conforme.`, position: null };
  }

  private checkMinDistanceToWall(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    const elements = kitchen.elements.filter(e => e.type === condition.source);
    const minCm = condition.minCm ?? 0;

    if (elements.length === 0) {
      return { ...base, status: 'passed', message: `${base.ruleName}: Aucun ${condition.source} détecté.`, position: null };
    }

    for (const el of elements) {
      // Check distance to each wall (simplified: kitchen boundaries at 0 and width/length)
      const distToLeft = el.position.x;
      const distToRight = kitchen.width - el.position.x;
      const distToTop = el.position.y;
      const distToBottom = kitchen.length - el.position.y;
      const minWallDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

      if (minWallDist < minCm) {
        return {
          ...base,
          status: 'failed',
          message: `${base.ruleName}: Distance au mur ${Math.round(minWallDist)} cm < ${minCm} cm requis.`,
          position: { x: el.position.x, y: el.position.y, z: el.position.z ?? 0 },
          fixSuggestion: `Éloigner le ${condition.source} d'au moins ${minCm} cm du mur le plus proche.`,
        };
      }
    }

    return { ...base, status: 'passed', message: `${base.ruleName}: Conforme.`, position: null };
  }

  private checkMinFlowRate(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    const required = condition.flowRate ?? 120;

    if (kitchen.vmcFlowRate == null) {
      return {
        ...base,
        status: 'warning',
        message: `${base.ruleName}: Débit VMC non renseigné — impossible de vérifier.`,
        position: null,
        fixSuggestion: `Vérifier que le débit d'extraction est d'au moins ${required} m³/h.`,
      };
    }

    if (kitchen.vmcFlowRate < required) {
      return {
        ...base,
        status: 'failed',
        message: `${base.ruleName}: Débit VMC ${kitchen.vmcFlowRate} m³/h < ${required} m³/h requis.`,
        position: null,
        fixSuggestion: `Augmenter le débit de la VMC à au moins ${required} m³/h.`,
      };
    }

    return { ...base, status: 'passed', message: `${base.ruleName}: Conforme (${kitchen.vmcFlowRate} m³/h).`, position: null };
  }

  private checkAirIntakeIfGas(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    _condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    if (!kitchen.hasGas) {
      return { ...base, status: 'passed', message: `${base.ruleName}: Pas d'appareil gaz — règle non applicable.`, position: null };
    }

    if (kitchen.hasAirIntake == null) {
      return {
        ...base,
        status: 'warning',
        message: `${base.ruleName}: Présence de gaz détectée mais information sur l'amenée d'air non renseignée.`,
        position: null,
        fixSuggestion: 'Vérifier la présence d\'une grille d\'amenée d\'air dans la cuisine.',
      };
    }

    if (!kitchen.hasAirIntake) {
      return {
        ...base,
        status: 'failed',
        message: `${base.ruleName}: Gaz présent sans amenée d'air obligatoire.`,
        position: null,
        fixSuggestion: 'Installer une grille d\'amenée d\'air basse (section min 100 cm²) dans un mur extérieur.',
      };
    }

    return { ...base, status: 'passed', message: `${base.ruleName}: Conforme.`, position: null };
  }

  private checkMinPassage(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    if (!kitchen.isPMR) {
      return { ...base, status: 'passed', message: `${base.ruleName}: Mode PMR non activé — règle non applicable.`, position: null };
    }

    const minCm = condition.minCm ?? 90;

    if (kitchen.passageWidth == null) {
      return {
        ...base,
        status: 'warning',
        message: `${base.ruleName}: Largeur de passage non renseignée — impossible de vérifier.`,
        position: null,
        fixSuggestion: `Vérifier que le passage entre meubles est d'au moins ${minCm} cm.`,
      };
    }

    if (kitchen.passageWidth < minCm) {
      return {
        ...base,
        status: 'failed',
        message: `${base.ruleName}: Passage ${kitchen.passageWidth} cm < ${minCm} cm requis.`,
        position: null,
        fixSuggestion: `Élargir le passage entre meubles à au moins ${minCm} cm.`,
      };
    }

    return { ...base, status: 'passed', message: `${base.ruleName}: Conforme (${kitchen.passageWidth} cm).`, position: null };
  }

  private checkTurningCircle(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    if (!kitchen.isPMR) {
      return { ...base, status: 'passed', message: `${base.ruleName}: Mode PMR non activé — règle non applicable.`, position: null };
    }

    const minCm = condition.minCm ?? 150;

    // Simple check: kitchen must have at least one area large enough for a 150cm circle
    // This is a simplified approximation — the AI fallback handles complex layouts
    const maxFreeSpace = Math.min(kitchen.width, kitchen.length);
    if (maxFreeSpace < minCm) {
      return {
        ...base,
        status: 'failed',
        message: `${base.ruleName}: Dimensions de la cuisine insuffisantes pour un cercle de rotation ${minCm} cm.`,
        position: null,
        fixSuggestion: `La cuisine doit disposer d'un espace libre d'au moins ${minCm} cm de diamètre pour la rotation d'un fauteuil roulant.`,
      };
    }

    return {
      ...base,
      status: 'passed',
      message: `${base.ruleName}: Espace suffisant détecté (vérification simplifiée).`,
      position: null,
    };
  }

  private checkWorktopHeightRange(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    if (!kitchen.isPMR) {
      return { ...base, status: 'passed', message: `${base.ruleName}: Mode PMR non activé — règle non applicable.`, position: null };
    }

    const minCm = condition.minCm ?? 75;
    const maxCm = condition.maxCm ?? 85;

    if (kitchen.worktopHeight == null) {
      return {
        ...base,
        status: 'warning',
        message: `${base.ruleName}: Hauteur du plan de travail non renseignée — impossible de vérifier.`,
        position: null,
        fixSuggestion: `Vérifier que le plan de travail est entre ${minCm} et ${maxCm} cm.`,
      };
    }

    if (kitchen.worktopHeight < minCm || kitchen.worktopHeight > maxCm) {
      return {
        ...base,
        status: 'failed',
        message: `${base.ruleName}: Hauteur ${kitchen.worktopHeight} cm hors plage ${minCm}-${maxCm} cm.`,
        position: null,
        fixSuggestion: `Ajuster la hauteur du plan de travail entre ${minCm} et ${maxCm} cm pour l'accessibilité PMR.`,
      };
    }

    return { ...base, status: 'passed', message: `${base.ruleName}: Conforme (${kitchen.worktopHeight} cm).`, position: null };
  }

  private checkOutletHeightRange(
    base: Omit<ComplianceResultItem, 'status' | 'message' | 'fixSuggestion' | 'position'>,
    condition: RuleCondition,
    kitchen: KitchenConfig,
  ): ComplianceResultItem {
    if (!kitchen.isPMR) {
      return { ...base, status: 'passed', message: `${base.ruleName}: Mode PMR non activé — règle non applicable.`, position: null };
    }

    const outlets = kitchen.elements.filter(e => e.type === 'outlet');
    const minCm = condition.minCm ?? 40;
    const maxCm = condition.maxCm ?? 130;

    if (outlets.length === 0) {
      return { ...base, status: 'passed', message: `${base.ruleName}: Aucune prise détectée.`, position: null };
    }

    for (const outlet of outlets) {
      const z = outlet.position.z ?? 0;
      if (z > 0 && (z < minCm || z > maxCm)) {
        return {
          ...base,
          status: 'failed',
          message: `${base.ruleName}: Prise à ${z} cm, hors plage ${minCm}-${maxCm} cm.`,
          position: { x: outlet.position.x, y: outlet.position.y, z },
          fixSuggestion: `Déplacer la prise entre ${minCm} et ${maxCm} cm du sol pour l'accessibilité PMR.`,
        };
      }
    }

    return { ...base, status: 'passed', message: `${base.ruleName}: Conforme.`, position: null };
  }

  // ----------------------------------------------------------------
  // Private: AI fallback for complex spatial analysis
  // ----------------------------------------------------------------

  private async aiSpatialFallback(
    kitchen: KitchenConfig,
    results: ComplianceResultItem[],
  ): Promise<void> {
    const ai = AnthropicService.getInstance();

    const unresolvedResults = results.filter(
      r => r.status === 'warning' && r.message.includes('[needs-spatial-analysis]'),
    );

    if (unresolvedResults.length === 0) return;

    const prompt = `Analyze this kitchen configuration for building code compliance.
Kitchen dimensions: ${kitchen.width}cm x ${kitchen.length}cm x ${kitchen.height}cm
Elements: ${JSON.stringify(kitchen.elements.map(e => ({ id: e.id, type: e.type, subType: e.subType, position: e.position, dimensions: e.dimensions })))}

For each of these unresolved rules, determine if they pass or fail:
${unresolvedResults.map(r => `- ${r.ruleId}: ${r.ruleName}`).join('\n')}

Respond in JSON format:
[{ "ruleId": "...", "status": "passed" | "failed" | "warning", "message": "...", "fixSuggestion": "..." }]`;

    const result = await ai.generateJSON<Array<{
      ruleId: string;
      status: 'passed' | 'failed' | 'warning';
      message: string;
      fixSuggestion?: string;
    }>>({
      system: 'You are a French building code compliance expert. Analyze kitchen configurations against NF C 15-100, NF DTU 24.1, NF EN 1116, and NF P 99-611 standards. Return only valid JSON.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 2000,
      parse: (text) => JSON.parse(text),
    });

    // Update results in-place with AI analysis
    for (const aiResult of result.data) {
      const idx = results.findIndex(r => r.ruleId === aiResult.ruleId);
      if (idx !== -1) {
        results[idx] = {
          ...results[idx]!,
          status: aiResult.status,
          message: aiResult.message,
          fixSuggestion: aiResult.fixSuggestion,
        };
      }
    }
  }

  // ----------------------------------------------------------------
  // Private: Geometry helpers
  // ----------------------------------------------------------------

  private distance2D(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  }
}

// ----------------------------------------------------------------
// Error class
// ----------------------------------------------------------------

export class ComplianceServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ComplianceServiceError';
  }
}

// Singleton export
export const complianceService = new ComplianceService();
export default complianceService;
