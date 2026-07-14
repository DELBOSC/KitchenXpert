import { AnthropicService } from './anthropic.service';
import { sanitizePromptField, num } from './prompt-safety';
import { SYSTEM_PROMPTS } from './prompt-templates';
import logger from '../../utils/logger';

import type Anthropic from '@anthropic-ai/sdk';

/** Sanitize user chat message */
function sanitizeMessage(message: string): string {
  return message
    .replace(/```/g, '`\u200B`\u200B`') // Break code block injection
    .slice(0, 5000); // Limit message length
}

interface SceneContext {
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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolUse?: { name: string; input: Record<string, unknown> };
}

// Tool definitions for Claude
const CHAT_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: 'suggest_add_item',
    description: "Suggere l'ajout d'un element au design (meuble, electromenager, etc.)",
    input_schema: {
      type: 'object' as const,
      properties: {
        itemType: {
          type: 'string',
          description:
            'Type: base_cabinet, wall_cabinet, tall_cabinet, sink, cooktop, refrigerator, dishwasher, hood',
        },
        reason: { type: 'string', description: 'Raison de la suggestion en francais' },
        suggestedWall: { type: 'string', description: 'Mur suggere: back, left, right, front' },
      },
      required: ['itemType', 'reason'],
    },
  },
  {
    name: 'suggest_move_item',
    description: 'Suggere de deplacer un element existant pour ameliorer le design',
    input_schema: {
      type: 'object' as const,
      properties: {
        itemId: { type: 'string', description: "ID de l'element a deplacer" },
        reason: { type: 'string', description: 'Raison du deplacement en francais' },
        direction: { type: 'string', description: 'Direction suggeree' },
      },
      required: ['itemId', 'reason'],
    },
  },
  {
    name: 'analyze_work_triangle',
    description: 'Analyse le triangle de travail (evier-plaque-frigo) de la configuration actuelle',
    input_schema: {
      type: 'object' as const,
      properties: {
        detail: { type: 'string', description: 'Niveau de detail: brief ou detailed' },
      },
      required: [],
    },
  },
  {
    name: 'estimate_budget',
    description: 'Estime le budget total de la configuration actuelle',
    input_schema: {
      type: 'object' as const,
      properties: {
        includeInstallation: { type: 'boolean', description: "Inclure les frais d'installation" },
      },
      required: [],
    },
  },
  {
    name: 'suggest_style_improvement',
    description: 'Suggere des ameliorations de style/materiaux',
    input_schema: {
      type: 'object' as const,
      properties: {
        aspect: { type: 'string', description: 'Aspect: couleurs, materiaux, eclairage, poignees' },
        reason: { type: 'string', description: 'Raison de la suggestion' },
      },
      required: ['aspect', 'reason'],
    },
  },
];

export class AIChatService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  // Build context from scene state
  private buildSceneDescription(context: SceneContext): string {
    // sceneContext is z.object({}).passthrough() → NOTHING here is runtime-checked. The
    // numeric type annotations are lies: a client can send roomWidth: "5\n\nINJECT". So
    // EVERY interpolated field is hardened at the point of interpolation — strings via
    // sanitizePromptField, numbers via num() (finite-or-fallback, can't carry a newline).
    // (b)-style belt; the real fix is validating sceneContext at the boundary (tracked).
    const items = context.items
      .map(
        (i) =>
          `- ${sanitizePromptField(i.type)}${i.name ? ` (${sanitizePromptField(i.name)})` : ''} a position (${num(i.position.x).toFixed(0)}, ${num(i.position.y).toFixed(0)}, ${num(i.position.z).toFixed(0)})${i.dimensions ? ` [${num(i.dimensions.width)}x${num(i.dimensions.height)}x${num(i.dimensions.depth)}mm]` : ''}`
      )
      .join('\n');

    let desc = `ETAT ACTUEL DE LA CUISINE:
Dimensions piece: ${num(context.roomWidth)}mm x ${num(context.roomDepth)}mm, hauteur ${num(context.roomHeight)}mm
Surface: ${((num(context.roomWidth) / 1000) * (num(context.roomDepth) / 1000)).toFixed(1)} m2
Style: ${context.style ? sanitizePromptField(context.style) : 'non defini'}
${context.budget ? `Budget: ${num(context.budget.min)}EUR - ${num(context.budget.max)}EUR` : ''}

ELEMENTS PLACES (${num(context.items.length)}):
${items || '(aucun element place)'}`;

    if (context.scores) {
      desc += `\n\nSCORES ACTUELS:
- Global: ${num(context.scores.overall)}/100
- Ergonomie: ${num(context.scores.ergonomics)}/100
- Rangement: ${num(context.scores.storage)}/100
- Esthetique: ${num(context.scores.aesthetics)}/100
- Budget: ${num(context.scores.budgetEfficiency)}/100
- Espace: ${num(context.scores.spaceUtilization)}/100`;
    }

    if (context.suggestions && context.suggestions.length > 0) {
      desc += `\n\nSUGGESTIONS SYSTEME:\n${context.suggestions.map((s) => `- ${sanitizePromptField(s)}`).join('\n')}`;
    }

    return desc;
  }

  // Non-streaming chat (for simple responses)
  async sendMessage(options: {
    message: string;
    sceneContext: SceneContext;
    conversationHistory: ChatMessage[];
    userId: string;
  }): Promise<{ response: string; toolUse?: { name: string; input: Record<string, unknown> } }> {
    const sceneDescription = this.buildSceneDescription(options.sceneContext);
    const systemPrompt = `${SYSTEM_PROMPTS.CHAT_ASSISTANT}\n\n${sceneDescription}`;

    const messages: Anthropic.Messages.MessageParam[] = [
      ...options.conversationHistory.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: sanitizeMessage(options.message) },
    ];

    try {
      const result = await this.anthropic.generateWithTools({
        system: systemPrompt,
        messages,
        tools: CHAT_TOOLS,
        maxTokens: 1024,
      });

      let responseText = '';
      let toolUse: { name: string; input: Record<string, unknown> } | undefined;

      for (const block of result.content) {
        if (block.type === 'text') {
          responseText += block.text;
        }
        if (block.type === 'tool_use') {
          toolUse = { name: block.name, input: block.input as Record<string, unknown> };
        }
      }

      return { response: responseText, toolUse };
    } catch (error) {
      logger.error('[AI:chat] Chat error', { error, userId: options.userId });
      return { response: 'Desole, une erreur est survenue. Veuillez reessayer.' };
    }
  }

  // Streaming chat via SSE (text-only, no tools)
  async *streamChat(options: {
    message: string;
    sceneContext: SceneContext;
    conversationHistory: ChatMessage[];
    userId: string;
  }): AsyncGenerator<{ type: string; data: string }> {
    const sceneDescription = this.buildSceneDescription(options.sceneContext);
    const systemPrompt = `${SYSTEM_PROMPTS.CHAT_ASSISTANT}\n\n${sceneDescription}`;

    const messages: Anthropic.Messages.MessageParam[] = [
      ...options.conversationHistory.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: sanitizeMessage(options.message) },
    ];

    try {
      const stream = this.anthropic.streamText({
        system: systemPrompt,
        messages,
        maxTokens: 1024,
      });

      for await (const event of stream) {
        if (event.type === 'text_delta') {
          yield { type: 'text_delta', data: event.text };
        } else if (event.type === 'message_stop') {
          yield {
            type: 'done',
            data: JSON.stringify({
              inputTokens: event.inputTokens,
              outputTokens: event.outputTokens,
            }),
          };
        }
      }
    } catch (error) {
      logger.error('[AI:chat] Stream error', { error, userId: options.userId });
      yield { type: 'error', data: 'Desole, une erreur est survenue. Veuillez reessayer.' };
    }
  }

  // Streaming chat with tool_use support via SSE
  async *streamChatWithTools(options: {
    message: string;
    sceneContext: SceneContext;
    conversationHistory: ChatMessage[];
    userId: string;
  }): AsyncGenerator<
    | { type: 'text_delta'; data: string }
    | { type: 'tool_use'; data: string }
    | { type: 'done'; data: string }
    | { type: 'error'; data: string }
  > {
    const sceneDescription = this.buildSceneDescription(options.sceneContext);
    const systemPrompt = `${SYSTEM_PROMPTS.CHAT_ASSISTANT}\n\n${sceneDescription}`;

    const messages: Anthropic.Messages.MessageParam[] = [
      ...options.conversationHistory.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: sanitizeMessage(options.message) },
    ];

    try {
      const stream = this.anthropic.client.messages.stream({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools: CHAT_TOOLS,
      });

      // Track partial JSON for tool_use input_json_delta events
      let currentToolName = '';
      let currentToolInputJson = '';

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            currentToolName = event.content_block.name;
            currentToolInputJson = '';
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield { type: 'text_delta', data: event.delta.text };
          } else if (event.delta.type === 'input_json_delta') {
            currentToolInputJson += event.delta.partial_json;
          }
        } else if (event.type === 'content_block_stop') {
          // If we accumulated tool input JSON, emit a tool_use event
          if (currentToolName && currentToolInputJson) {
            try {
              const toolInput = JSON.parse(currentToolInputJson) as Record<string, unknown>;
              yield {
                type: 'tool_use',
                data: JSON.stringify({ toolName: currentToolName, toolInput }),
              };
            } catch (parseErr) {
              logger.warn('[AI:chat] Failed to parse tool input JSON', {
                toolName: currentToolName,
                raw: currentToolInputJson,
              });
            }
            currentToolName = '';
            currentToolInputJson = '';
          }
        }
      }

      const finalMessage = await stream.finalMessage();
      yield {
        type: 'done',
        data: JSON.stringify({
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
        }),
      };
    } catch (error) {
      logger.error('[AI:chat] Stream with tools error', { error, userId: options.userId });
      yield { type: 'error', data: 'Desole, une erreur est survenue. Veuillez reessayer.' };
    }
  }
}

export default AIChatService;
