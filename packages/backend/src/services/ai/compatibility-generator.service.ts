import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import { prisma } from '../../database/client';
import logger from '../../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompatibilityRule {
  id: string;
  cabinetType: string;
  applianceType: string;
  cabinetWidthMin: number;
  cabinetWidthMax: number;
  cabinetDepthMin: number;
  requiresCutout: boolean;
  cutoutWidth: number | null;
  cutoutDepth: number | null;
  ventilationGap: number | null;
  electricalReq: string | null;
  waterReq: boolean;
  notes: string | null;
  source: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Shape returned by Claude for a single compatibility entry */
interface RawCompatibilityEntry {
  applianceType: string;
  cabinetWidthMin: number;
  cabinetWidthMax: number;
  cabinetDepthMin: number;
  requiresCutout: boolean;
  cutoutWidth: number | null;
  cutoutDepth: number | null;
  ventilationGap: number | null;
  electricalReq: string | null;
  waterReq: boolean;
  notes: string | null;
  confidence: number;
}

/** Shape returned by Claude for all compatibilities of one cabinet type */
interface RawCompatibilityResponse {
  cabinetType: string;
  compatibleAppliances: RawCompatibilityEntry[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CABINET_TYPES = [
  'base_standard',
  'base_drawer',
  'base_sink',
  'base_hob',
  'base_corner',
  'base_corner_carousel',
  'base_pull_out',
  'base_trash',
  'base_bottle',
  'wall_standard',
  'wall_lift_up',
  'wall_corner',
  'wall_extractor',
  'wall_open',
  'wall_glass',
  'tall_pantry',
  'tall_oven',
  'tall_fridge',
  'tall_broom',
  'tall_combo',
  'island_base',
  'island_drawer',
  'island_open',
] as const;

export const APPLIANCE_TYPES = [
  'hob_induction',
  'hob_gas',
  'hob_vitroceramic',
  'hob_mixed',
  'oven_single',
  'oven_double',
  'oven_compact',
  'microwave',
  'microwave_oven',
  'hood_wall',
  'hood_island',
  'hood_integrated',
  'hood_downdraft',
  'fridge_integrated',
  'fridge_under_counter',
  'freezer_integrated',
  'fridge_freezer_integrated',
  'dishwasher_full',
  'dishwasher_compact',
  'dishwasher_drawer',
  'washing_machine',
  'dryer',
  'sink_single',
  'sink_double',
  'sink_1_5',
  'tap_standard',
  'tap_pull_out',
  'coffee_machine',
  'wine_cooler',
  'warming_drawer',
] as const;

/**
 * Not every cabinet type accepts appliances. Filter to the ones that make
 * sense (e.g. wall_glass or base_bottle rarely host appliances).
 */
const CABINETS_ACCEPTING_APPLIANCES: string[] = [
  'base_standard',
  'base_drawer',
  'base_sink',
  'base_hob',
  'base_corner',
  'base_corner_carousel',
  'base_pull_out',
  'wall_standard',
  'wall_lift_up',
  'wall_extractor',
  'tall_pantry',
  'tall_oven',
  'tall_fridge',
  'tall_combo',
  'island_base',
  'island_drawer',
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

/**
 * CompatibilityGeneratorService
 *
 * Generates compatibility rules between cabinet types and appliance types
 * using Claude AI, then persists them in the CompatibilityRule table.
 * Uses singleton pattern for efficiency.
 */
export class CompatibilityGeneratorService {
  private anthropic: AnthropicService;
  private static instance: CompatibilityGeneratorService;

  private constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  static getInstance(): CompatibilityGeneratorService {
    if (!CompatibilityGeneratorService.instance) {
      CompatibilityGeneratorService.instance =
        new CompatibilityGeneratorService();
    }
    return CompatibilityGeneratorService.instance;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Generate all compatibility rules for a single cabinet type by making
   * one Claude call that returns every compatible appliance type.
   *
   * @returns Number of rules created/upserted in the database.
   */
  async generateForCabinetType(cabinetType: string): Promise<number> {
    logger.info('[CompatibilityGenerator] Generating rules for cabinet type', {
      cabinetType,
    });

    const prompt = this.buildPromptForCabinet(cabinetType);

    const result =
      await this.anthropic.generateJSON<RawCompatibilityResponse>({
        system: SYSTEM_PROMPTS.COMPATIBILITY_MATRIX,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 4096,
        parse: (text: string) => {
          const parsed = JSON.parse(text);
          const response: RawCompatibilityResponse = parsed;

          if (
            !response.cabinetType ||
            !Array.isArray(response.compatibleAppliances)
          ) {
            throw new Error(
              'Invalid compatibility response: missing cabinetType or compatibleAppliances array',
            );
          }

          // Validate each entry has required dimension fields
          for (const entry of response.compatibleAppliances) {
            if (
              !entry.applianceType ||
              typeof entry.cabinetWidthMin !== 'number' ||
              typeof entry.cabinetWidthMax !== 'number' ||
              typeof entry.cabinetDepthMin !== 'number'
            ) {
              throw new Error(
                `Invalid entry for appliance ${  JSON.stringify(entry.applianceType)  }: missing required dimension fields`,
              );
            }
          }

          return response;
        },
      });

    logger.info(
      '[CompatibilityGenerator] Claude returned compatibility data',
      {
        cabinetType,
        applianceCount: result.data.compatibleAppliances.length,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      },
    );

    // Persist to DB via upsert (unique: cabinetType + applianceType + cabinetWidthMin)
    let created = 0;
    for (const entry of result.data.compatibleAppliances) {
      try {
        await prisma.compatibilityRule.upsert({
          where: {
            cabinetType_applianceType_cabinetWidthMin: {
              cabinetType,
              applianceType: entry.applianceType,
              cabinetWidthMin: entry.cabinetWidthMin,
            },
          },
          update: {
            cabinetWidthMax: entry.cabinetWidthMax,
            cabinetDepthMin: entry.cabinetDepthMin,
            requiresCutout: entry.requiresCutout,
            cutoutWidth: entry.cutoutWidth,
            cutoutDepth: entry.cutoutDepth,
            ventilationGap: entry.ventilationGap,
            electricalReq: entry.electricalReq,
            waterReq: entry.waterReq,
            notes: entry.notes,
            source: 'ai',
            confidence: entry.confidence ?? 0.8,
          },
          create: {
            cabinetType,
            applianceType: entry.applianceType,
            cabinetWidthMin: entry.cabinetWidthMin,
            cabinetWidthMax: entry.cabinetWidthMax,
            cabinetDepthMin: entry.cabinetDepthMin,
            requiresCutout: entry.requiresCutout,
            cutoutWidth: entry.cutoutWidth,
            cutoutDepth: entry.cutoutDepth,
            ventilationGap: entry.ventilationGap,
            electricalReq: entry.electricalReq,
            waterReq: entry.waterReq,
            notes: entry.notes,
            source: 'ai',
            confidence: entry.confidence ?? 0.8,
          },
        });
        created++;
      } catch (err) {
        logger.warn('[CompatibilityGenerator] Failed to upsert rule', {
          cabinetType,
          applianceType: entry.applianceType,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info('[CompatibilityGenerator] Rules persisted', {
      cabinetType,
      created,
    });

    return created;
  }

  /**
   * Generate the full compatibility matrix by iterating all relevant cabinet
   * types and calling generateForCabinetType for each.
   *
   * @returns Total number of rules created and errors encountered.
   */
  async generateFullMatrix(): Promise<{ rules: number; errors: number }> {
    logger.info(
      '[CompatibilityGenerator] Starting full matrix generation',
      { cabinetCount: CABINETS_ACCEPTING_APPLIANCES.length },
    );

    let totalRules = 0;
    let totalErrors = 0;

    for (const cabinetType of CABINETS_ACCEPTING_APPLIANCES) {
      try {
        const count = await this.generateForCabinetType(cabinetType);
        totalRules += count;
      } catch (err) {
        totalErrors++;
        logger.error(
          '[CompatibilityGenerator] Failed to generate for cabinet type',
          {
            cabinetType,
            error: err instanceof Error ? err.message : String(err),
          },
        );
      }
    }

    logger.info('[CompatibilityGenerator] Full matrix generation complete', {
      totalRules,
      totalErrors,
    });

    return { rules: totalRules, errors: totalErrors };
  }

  /**
   * Check whether a specific cabinet/appliance pairing is compatible,
   * returning any matching rules and warnings.
   */
  async checkCompatibility(
    cabinetType: string,
    applianceType: string,
  ): Promise<{
    compatible: boolean;
    rules: CompatibilityRule[];
    warnings: string[];
  }> {
    const rules = await prisma.compatibilityRule.findMany({
      where: { cabinetType, applianceType },
    });

    const warnings: string[] = [];

    if (rules.length === 0) {
      return {
        compatible: false,
        rules: [],
        warnings: [
          'Aucune regle de compatibilite trouvee pour cette combinaison.',
        ],
      };
    }

    // Gather warnings from rules
    for (const rule of rules) {
      if (rule.requiresCutout) {
        warnings.push(
          `Decoupe requise: ${ 
            rule.cutoutWidth ?? '?' 
            }mm x ${ 
            rule.cutoutDepth ?? '?' 
            }mm`,
        );
      }
      if (rule.ventilationGap && rule.ventilationGap > 0) {
        warnings.push(
          `Espace de ventilation requis: ${  rule.ventilationGap  }mm`,
        );
      }
      if (rule.electricalReq) {
        warnings.push(`Raccordement electrique: ${  rule.electricalReq}`);
      }
      if (rule.waterReq) {
        warnings.push('Raccordement eau necessaire');
      }
      if (rule.confidence < 0.7) {
        warnings.push(
          `Confiance faible (${ 
            (rule.confidence * 100).toFixed(0) 
            }%) — verification manuelle recommandee`,
        );
      }
      if (rule.notes) {
        warnings.push(rule.notes);
      }
    }

    return { compatible: true, rules, warnings };
  }

  /**
   * Simple DB query returning all compatibility rules for a given cabinet type.
   */
  async getRulesForCabinet(
    cabinetType: string,
  ): Promise<CompatibilityRule[]> {
    return prisma.compatibilityRule.findMany({
      where: { cabinetType },
      orderBy: { applianceType: 'asc' },
    });
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Build the prompt sent to Claude for a single cabinet type.
   */
  private buildPromptForCabinet(cabinetType: string): string {
    const sections: string[] = [];

    sections.push(
      `Determine tous les electromenagers compatibles avec le meuble de cuisine de type "${ 
        cabinetType 
        }".`,
    );
    sections.push('');
    sections.push(
      "=== TYPES D'ELECTROMENAGERS DISPONIBLES ===",
    );
    sections.push(APPLIANCE_TYPES.join(', '));
    sections.push('');
    sections.push('=== REGLES ===');
    sections.push(
      '- Ne liste QUE les electromenagers reellement compatibles avec ce type de meuble.',
    );
    sections.push('- Les dimensions sont en millimetres (mm).');
    sections.push(
      '- cabinetWidthMin/Max = largeur du caisson necessaire pour accueillir cet electromenager.',
    );
    sections.push('- cabinetDepthMin = profondeur minimale du caisson.');
    sections.push(
      '- requiresCutout = true si une decoupe du plan de travail ou de la facade est necessaire.',
    );
    sections.push(
      '- cutoutWidth/cutoutDepth = dimensions de la decoupe si applicable.',
    );
    sections.push(
      "- ventilationGap = espace d'air necessaire autour (en mm), 0 si aucun.",
    );
    sections.push(
      '- electricalReq = "16A", "20A", "32A", "gaz", ou null.',
    );
    sections.push('- waterReq = true si raccordement eau necessaire.');
    sections.push(
      '- confidence = ta confiance dans cette regle (0.0 a 1.0).',
    );
    sections.push('');
    sections.push('=== FORMAT DE SORTIE ===');
    sections.push(
      `Reponds UNIQUEMENT avec un JSON valide, sans texte avant ou apres:\n` +
        `{\n` +
        `  "cabinetType": "${ 
        cabinetType 
        }",\n` +
        `  "compatibleAppliances": [\n` +
        `    {\n` +
        `      "applianceType": "type",\n` +
        `      "cabinetWidthMin": 600,\n` +
        `      "cabinetWidthMax": 900,\n` +
        `      "cabinetDepthMin": 560,\n` +
        `      "requiresCutout": false,\n` +
        `      "cutoutWidth": null,\n` +
        `      "cutoutDepth": null,\n` +
        `      "ventilationGap": 5,\n` +
        `      "electricalReq": "16A",\n` +
        `      "waterReq": false,\n` +
        `      "notes": "note d'installation ou null",\n` +
        `      "confidence": 0.9\n` +
        `    }\n` +
        `  ]\n` +
        `}`,
    );

    return sections.join('\n');
  }
}

export default CompatibilityGeneratorService;
