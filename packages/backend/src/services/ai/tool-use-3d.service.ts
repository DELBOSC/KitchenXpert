import Anthropic from '@anthropic-ai/sdk';
import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import logger from '../../utils/logger';

/** Sanitize user chat message */
function sanitizeMessage(message: string): string {
  return message
    .replace(/```/g, '`\u200B`\u200B`') // Break code block injection
    .slice(0, 5000); // Limit message length
}

// ─── Types ───────────────────────────────────────────────────────────

export interface SceneContext {
  roomWidth: number; // mm
  roomDepth: number; // mm
  roomHeight: number; // mm
  items: Array<{
    id: string;
    type: string;
    name?: string;
    position: { x: number; y: number; z: number };
    dimensions?: { width: number; height: number; depth: number };
  }>;
  scores?: {
    overall: number;
    ergonomics: number;
    storage: number;
    aesthetics: number;
    budgetEfficiency: number;
    spaceUtilization: number;
  };
  suggestions?: string[];
  style?: string;
  budget?: { min: number; max: number };
}

export interface ToolCall {
  name: string;
  params: Record<string, unknown>;
}

export interface ToolUseResponse {
  text: string;
  toolCalls: ToolCall[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ─── Tool Definitions ────────────────────────────────────────────────

/** All available 3D tools exposed to Claude via native tool_use */
const TOOL_USE_3D_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'add_cabinet',
    description: 'Ajouter un meuble de cuisine (meuble bas, meuble haut, colonne). Dimensions en mm.',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['base_cabinet', 'wall_cabinet', 'tall_cabinet'],
          description: 'Type de meuble: base_cabinet (bas), wall_cabinet (haut), tall_cabinet (colonne)',
        },
        width: {
          type: 'number',
          description: 'Largeur du meuble en mm (standard: 300, 400, 450, 500, 600, 800, 900, 1000, 1200)',
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'Position X en mm' },
            y: { type: 'number', description: 'Position Y en mm (hauteur)' },
            z: { type: 'number', description: 'Position Z en mm' },
          },
          required: ['x', 'y', 'z'],
        },
        style: {
          type: 'string',
          description: 'Style du meuble: modern, classic, scandinavian, industrial',
        },
      },
      required: ['type', 'width', 'position'],
    },
  },
  {
    name: 'move_object',
    description: 'Deplacer un objet existant dans la scene vers une nouvelle position. Coordonnees en mm.',
    input_schema: {
      type: 'object' as const,
      properties: {
        objectId: { type: 'string', description: 'ID de l\'objet a deplacer' },
        newPosition: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'Nouvelle position X en mm' },
            y: { type: 'number', description: 'Nouvelle position Y en mm' },
            z: { type: 'number', description: 'Nouvelle position Z en mm' },
          },
          required: ['x', 'y', 'z'],
        },
      },
      required: ['objectId', 'newPosition'],
    },
  },
  {
    name: 'remove_object',
    description: 'Supprimer un objet de la scene 3D.',
    input_schema: {
      type: 'object' as const,
      properties: {
        objectId: { type: 'string', description: 'ID de l\'objet a supprimer' },
      },
      required: ['objectId'],
    },
  },
  {
    name: 'change_material',
    description: 'Changer le materiau d\'un seul objet (plan de travail, facade, credence).',
    input_schema: {
      type: 'object' as const,
      properties: {
        objectId: { type: 'string', description: 'ID de l\'objet' },
        materialId: {
          type: 'string',
          description: 'ID du materiau: oak, walnut, white_lacquer, grey_matt, black_granite, white_marble, quartz, stainless_steel, etc.',
        },
      },
      required: ['objectId', 'materialId'],
    },
  },
  {
    name: 'change_all_materials',
    description: 'Changer le materiau de TOUS les objets d\'un meme type (ex: tous les plans de travail en granit noir).',
    input_schema: {
      type: 'object' as const,
      properties: {
        targetType: {
          type: 'string',
          description: 'Type d\'objets a modifier: countertop, cabinet_door, backsplash, handle',
        },
        materialId: {
          type: 'string',
          description: 'ID du nouveau materiau',
        },
      },
      required: ['targetType', 'materialId'],
    },
  },
  {
    name: 'add_appliance',
    description: 'Ajouter un electromenager (four, plaque, hotte, lave-vaisselle, frigo, evier).',
    input_schema: {
      type: 'object' as const,
      properties: {
        type: {
          type: 'string',
          enum: ['oven', 'cooktop', 'hood', 'dishwasher', 'refrigerator', 'sink', 'microwave', 'washer'],
          description: 'Type d\'electromenager',
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'Position X en mm' },
            y: { type: 'number', description: 'Position Y en mm' },
            z: { type: 'number', description: 'Position Z en mm' },
          },
          required: ['x', 'y', 'z'],
        },
      },
      required: ['type', 'position'],
    },
  },
  {
    name: 'optimize_work_triangle',
    description: 'Optimiser automatiquement le triangle de travail (evier-plaque-frigo) selon les normes ergonomiques. Perimetre optimal: 360-660cm.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'apply_style',
    description: 'Appliquer un style global a toute la cuisine (couleurs, materiaux, poignees).',
    input_schema: {
      type: 'object' as const,
      properties: {
        styleName: {
          type: 'string',
          enum: ['modern', 'classic', 'scandinavian', 'industrial', 'rustic', 'minimalist', 'provencal'],
          description: 'Nom du style a appliquer',
        },
      },
      required: ['styleName'],
    },
  },
  {
    name: 'auto_fill_wall',
    description: 'Remplir automatiquement un mur avec des meubles adaptes (optimise l\'espace).',
    input_schema: {
      type: 'object' as const,
      properties: {
        wallId: {
          type: 'string',
          enum: ['back', 'left', 'right', 'front'],
          description: 'Mur a remplir: back (fond), left (gauche), right (droite), front (devant)',
        },
        cabinetType: {
          type: 'string',
          enum: ['base_cabinet', 'wall_cabinet', 'both'],
          description: 'Type de meubles: base_cabinet (bas), wall_cabinet (haut), both (les deux)',
        },
      },
      required: ['wallId', 'cabinetType'],
    },
  },
  {
    name: 'generate_countertop',
    description: 'Regenerer automatiquement les plans de travail pour couvrir tous les meubles bas.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'add_island',
    description: 'Ajouter un ilot central de cuisine. Dimensions en mm.',
    input_schema: {
      type: 'object' as const,
      properties: {
        width: {
          type: 'number',
          description: 'Largeur de l\'ilot en mm (typiquement 900-2000mm)',
        },
        depth: {
          type: 'number',
          description: 'Profondeur de l\'ilot en mm (typiquement 600-1200mm)',
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'Position X en mm (centre de la piece recommande)' },
            y: { type: 'number', description: 'Position Y en mm (generalement 0)' },
            z: { type: 'number', description: 'Position Z en mm (centre de la piece recommande)' },
          },
          required: ['x', 'y', 'z'],
        },
      },
      required: ['width', 'depth', 'position'],
    },
  },
  {
    name: 'rotate_object',
    description: 'Tourner un objet d\'un certain angle en degres.',
    input_schema: {
      type: 'object' as const,
      properties: {
        objectId: { type: 'string', description: 'ID de l\'objet a tourner' },
        angleDeg: { type: 'number', description: 'Angle de rotation en degres (positif = sens anti-horaire)' },
      },
      required: ['objectId', 'angleDeg'],
    },
  },
  {
    name: 'set_room_dimensions',
    description: 'Modifier les dimensions de la piece. Dimensions en mm.',
    input_schema: {
      type: 'object' as const,
      properties: {
        width: { type: 'number', description: 'Largeur de la piece en mm' },
        depth: { type: 'number', description: 'Profondeur de la piece en mm' },
        height: { type: 'number', description: 'Hauteur sous plafond en mm (standard: 2500)' },
      },
      required: ['width', 'depth', 'height'],
    },
  },
  {
    name: 'run_compliance_check',
    description: 'Verifier la conformite de la cuisine aux normes francaises (NF C 15-100, distances de securite, accessibilite).',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'undo',
    description: 'Annuler la derniere action effectuee dans l\'editeur 3D.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'redo',
    description: 'Refaire la derniere action annulee dans l\'editeur 3D.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];

// Valid tool names for quick lookup
const VALID_TOOL_NAMES = new Set(TOOL_USE_3D_TOOLS.map(t => t.name));

// ─── Service ─────────────────────────────────────────────────────────

export class ToolUse3DService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  /**
   * Build a textual description of the current 3D scene for the AI system prompt.
   */
  private buildSceneDescription(context: SceneContext): string {
    const items = context.items.map(i =>
      `- [${i.id}] ${i.type}${i.name ? ` (${i.name})` : ''} @ (${i.position.x.toFixed(0)}, ${i.position.y.toFixed(0)}, ${i.position.z.toFixed(0)})${i.dimensions ? ` [${i.dimensions.width}x${i.dimensions.height}x${i.dimensions.depth}mm]` : ''}`
    ).join('\n');

    let desc = `ETAT ACTUEL DE LA CUISINE:
Dimensions piece: ${context.roomWidth}mm x ${context.roomDepth}mm, hauteur ${context.roomHeight}mm
Surface: ${((context.roomWidth / 1000) * (context.roomDepth / 1000)).toFixed(1)} m2
Style: ${context.style || 'non defini'}
${context.budget ? `Budget: ${context.budget.min}EUR - ${context.budget.max}EUR` : ''}

ELEMENTS PLACES (${context.items.length}):
${items || '(aucun element place)'}`;

    if (context.scores) {
      desc += `\n\nSCORES ACTUELS:
- Global: ${context.scores.overall}/100
- Ergonomie: ${context.scores.ergonomics}/100
- Rangement: ${context.scores.storage}/100
- Esthetique: ${context.scores.aesthetics}/100
- Budget: ${context.scores.budgetEfficiency}/100
- Espace: ${context.scores.spaceUtilization}/100`;
    }

    if (context.suggestions && context.suggestions.length > 0) {
      desc += `\n\nSUGGESTIONS SYSTEME:\n${context.suggestions.map(s => `- ${s}`).join('\n')}`;
    }

    return desc;
  }

  /**
   * Process a user message with the current scene context.
   * Uses Anthropic's native tool_use feature to return structured tool calls
   * that the frontend can execute on the 3D engine.
   */
  async processMessage(options: {
    message: string;
    sceneContext: SceneContext;
    conversationHistory?: ChatMessage[];
    userId: string;
  }): Promise<ToolUseResponse> {
    const sceneDescription = this.buildSceneDescription(options.sceneContext);
    const systemPrompt = `${SYSTEM_PROMPTS.AI_TOOL_USE_3D}\n\n${sceneDescription}`;

    const messages: Anthropic.Messages.MessageParam[] = [
      ...(options.conversationHistory || []).slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: sanitizeMessage(options.message) },
    ];

    const startTime = Date.now();

    try {
      const result = await this.anthropic.generateWithTools({
        system: systemPrompt,
        messages,
        tools: TOOL_USE_3D_TOOLS,
        maxTokens: 2048,
      });

      const durationMs = Date.now() - startTime;

      // Extract text and tool calls from the response
      let text = '';
      const toolCalls: ToolCall[] = [];

      for (const block of result.content) {
        if (block.type === 'text') {
          text += block.text;
        }
        if (block.type === 'tool_use') {
          const params = block.input as Record<string, unknown>;
          if (this.validateToolCall(block.name, params)) {
            toolCalls.push({ name: block.name, params });
          } else {
            logger.warn('[AI:tool-use-3d] Invalid tool call rejected', {
              toolName: block.name,
              params,
              userId: options.userId,
            });
          }
        }
      }

      // Log usage
      void this.anthropic.logUsage(
        options.userId,
        'anthropic',
        'claude-sonnet-4-5-20250929',
        result.inputTokens,
        result.outputTokens,
        durationMs,
        { feature: 'tool-use-3d', toolCallCount: toolCalls.length },
      );

      logger.info('[AI:tool-use-3d] Processed message', {
        userId: options.userId,
        toolCallCount: toolCalls.length,
        toolNames: toolCalls.map(t => t.name),
        durationMs,
      });

      return { text, toolCalls };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logger.error('[AI:tool-use-3d] Processing error', {
        error,
        userId: options.userId,
        durationMs,
      });
      return {
        text: 'Desole, une erreur est survenue lors du traitement de votre demande. Veuillez reessayer.',
        toolCalls: [],
      };
    }
  }

  /**
   * Validate that a tool call has a recognized name and valid parameter types.
   */
  validateToolCall(toolName: string, params: Record<string, unknown>): boolean {
    if (!VALID_TOOL_NAMES.has(toolName)) {
      return false;
    }

    // Find the tool definition
    const toolDef = TOOL_USE_3D_TOOLS.find(t => t.name === toolName);
    if (!toolDef) return false;

    const schema = toolDef.input_schema as {
      properties: Record<string, unknown>;
      required?: string[];
    };

    // Verify required parameters are present
    if (schema.required) {
      for (const requiredParam of schema.required) {
        if (params[requiredParam] === undefined || params[requiredParam] === null) {
          logger.warn('[AI:tool-use-3d] Missing required param', {
            toolName,
            missingParam: requiredParam,
          });
          return false;
        }
      }
    }

    return true;
  }
}

export default ToolUse3DService;
