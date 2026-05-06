/**
 * AI Style Transfer Service
 *
 * Analyzes a reference kitchen photo using Claude's vision capability
 * and extracts design parameters (style, colors, materials, layout features).
 * Uses the AnthropicService singleton for API access.
 */

import { z } from 'zod';
import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import logger from '../../utils/logger';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface StyleExtraction {
  style: string; // 'modern', 'traditional', 'farmhouse', 'industrial', 'scandinavian', etc.
  confidence: number;
  colorPalette: {
    primary: string;   // hex color
    secondary: string;
    accent: string;
    neutral: string;
  };
  materials: {
    cabinetMaterial: string;
    cabinetFinish: string; // 'matte', 'gloss', 'satin', 'textured'
    countertopMaterial: string;
    backsplashMaterial: string;
    flooringMaterial: string;
  };
  doorStyle: string;   // 'slab', 'shaker', 'raised-panel', 'louvered', 'glass-front'
  handleStyle: string; // 'bar-pull', 'knob', 'cup-pull', 'hidden', 'integrated'
  layoutFeatures: string[]; // ['island', 'open-plan', 'breakfast-bar', 'pendant-lights']
  mood: string; // 'warm', 'cool', 'bright', 'cozy', 'dramatic', 'airy'
  suggestedBrands: string[]; // brands that match this style
}

// ----------------------------------------------------------------
// Zod Validation Schema
// ----------------------------------------------------------------

const StyleExtractionSchema = z.object({
  style: z.string().max(50),
  confidence: z.number().min(0).max(1),
  colorPalette: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
    neutral: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  }),
  materials: z.object({
    cabinetMaterial: z.string().max(100),
    cabinetFinish: z.enum(['matte', 'gloss', 'satin', 'textured', 'natural', 'lacquered']),
    countertopMaterial: z.string().max(100),
    backsplashMaterial: z.string().max(100),
    flooringMaterial: z.string().max(100),
  }),
  doorStyle: z.enum(['slab', 'shaker', 'raised-panel', 'louvered', 'glass-front', 'beadboard', 'flat-panel']),
  handleStyle: z.enum(['bar-pull', 'knob', 'cup-pull', 'hidden', 'integrated', 'ring-pull', 'edge-pull']),
  layoutFeatures: z.array(z.string().max(50)).max(10),
  mood: z.enum(['warm', 'cool', 'bright', 'cozy', 'dramatic', 'airy', 'rustic', 'elegant', 'minimalist']),
  suggestedBrands: z.array(z.string().max(50)).max(5),
});

// ----------------------------------------------------------------
// Input Sanitization
// ----------------------------------------------------------------

/** Sanitize user input to prevent prompt injection */
export function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/[<>{}[\]]/g, '') // Remove special chars
    .replace(/\n/g, ' ')       // Flatten newlines
    .slice(0, 200);            // Limit length
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class StyleTransferService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  /**
   * Analyze a kitchen photo and extract style parameters.
   * Uses Claude's vision capability to analyze the image.
   *
   * @param imageBase64 - Base64-encoded image data (without data URI prefix)
   * @param mediaType - The MIME type of the image
   * @param userId - The user requesting the analysis (for usage logging)
   */
  async analyzeKitchenPhoto(
    imageBase64: string,
    mediaType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
    userId?: string,
  ): Promise<StyleExtraction> {
    const startTime = Date.now();

    // Validate base64 input
    if (!imageBase64 || imageBase64.length < 100) {
      throw new Error('Invalid image data: image is too small or empty');
    }

    // Strip data URI prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    logger.info('[StyleTransfer] Analyzing kitchen photo', {
      imageSize: cleanBase64.length,
      mediaType,
      userId,
    });

    try {
      const result = await this.anthropic.generateJSON<StyleExtraction>({
        system: SYSTEM_PROMPTS.STYLE_TRANSFER,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: cleanBase64,
                },
              },
              {
                type: 'text',
                text: `Analyse cette photo de cuisine et extrais tous les parametres de style.

Reponds avec un JSON valide contenant exactement ces champs:
{
  "style": "modern|traditional|farmhouse|industrial|scandinavian|contemporary|transitional|coastal|mediterranean|rustic",
  "confidence": 0.0-1.0,
  "colorPalette": {
    "primary": "#RRGGBB",
    "secondary": "#RRGGBB",
    "accent": "#RRGGBB",
    "neutral": "#RRGGBB"
  },
  "materials": {
    "cabinetMaterial": "string",
    "cabinetFinish": "matte|gloss|satin|textured|natural|lacquered",
    "countertopMaterial": "string",
    "backsplashMaterial": "string",
    "flooringMaterial": "string"
  },
  "doorStyle": "slab|shaker|raised-panel|louvered|glass-front|beadboard|flat-panel",
  "handleStyle": "bar-pull|knob|cup-pull|hidden|integrated|ring-pull|edge-pull",
  "layoutFeatures": ["island", "open-plan", ...],
  "mood": "warm|cool|bright|cozy|dramatic|airy|rustic|elegant|minimalist",
  "suggestedBrands": ["Brand1", "Brand2", ...]
}

Sois precis sur les couleurs hex et les noms de materiaux.
Les marques suggerees doivent etre des marques de cuisines francaises ou disponibles en France.`,
              },
            ],
          },
        ],
        maxTokens: 2000,
        parse: (text: string) => {
          const raw = JSON.parse(text);
          return StyleExtractionSchema.parse(raw);
        },
      });

      const durationMs = Date.now() - startTime;

      // Log usage
      if (userId) {
        await this.anthropic.logUsage(
          userId,
          'anthropic',
          'claude-sonnet-4-5-20250929',
          result.inputTokens,
          result.outputTokens,
          durationMs,
          { feature: 'style-transfer', promptVersion: '1.0.0' },
        );
      }

      logger.info('[StyleTransfer] Analysis complete', {
        style: result.data.style,
        confidence: result.data.confidence,
        mood: result.data.mood,
        durationMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });

      return result.data;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logger.error('[StyleTransfer] Analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        durationMs,
        userId,
      });
      throw error;
    }
  }
}

export default StyleTransferService;
