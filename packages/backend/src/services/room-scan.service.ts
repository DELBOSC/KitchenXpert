/**
 * Room Scan Service
 * Uses Claude Vision API to analyze room photos and extract dimensions
 */

import Anthropic from '@anthropic-ai/sdk';

import logger from '../utils/logger';

export interface RoomScanResult {
  dimensions: {
    width: number;   // mm
    length: number;  // mm
    height: number;  // mm
  };
  walls: {
    id: string;
    side: 'back' | 'left' | 'right' | 'front';
    length: number;     // mm
    hasWindow: boolean;
    hasDoor: boolean;
  }[];
  openings: {
    type: 'door' | 'window' | 'arch';
    wall: string;
    width: number;      // mm
    height: number;     // mm
    fromFloor: number;  // mm
    position: number;   // mm from left of wall
  }[];
  technicalPoints: {
    type: 'water' | 'electric' | 'gas' | 'ventilation';
    subtype: string;
    wall: string;
    heightFromFloor: number;  // mm
    position: number;         // mm from left of wall
  }[];
  confidence: number; // 0-1
  notes: string[];
}

interface AnalysisContext {
  estimatedWidth?: number;
  estimatedLength?: number;
  estimatedHeight?: number;
  notes?: string;
}

export class RoomScanService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async analyzeRoomFromPhotos(
    files: Express.Multer.File[],
    context?: AnalysisContext
  ): Promise<RoomScanResult> {
    const prompt = this.buildAnalysisPrompt(context);

    // Build content blocks with images
    const content: Anthropic.Messages.ContentBlockParam[] = [];

    for (const file of files) {
      const base64 = file.buffer.toString('base64');
      const mediaType = file.mimetype as 'image/jpeg' | 'image/png' | 'image/webp';

      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: mediaType,
          data: base64,
        },
      });
    }

    content.push({
      type: 'text',
      text: prompt,
    });

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from Claude Vision');
      }

      return this.parseAIResponse(textBlock.text, context);
    } catch (error) {
      logger.error('[RoomScan] Claude Vision API error', { error });
      throw new Error('Erreur lors de l\'analyse des photos. Verifiez votre cle API Anthropic.');
    }
  }

  private buildAnalysisPrompt(context?: AnalysisContext): string {
    let prompt = `Analyse ces photos d'une piece de cuisine et extrais les dimensions et elements.

Reponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de backticks), avec cette structure exacte:

{
  "dimensions": {
    "width": <largeur en mm>,
    "length": <longueur/profondeur en mm>,
    "height": <hauteur sous plafond en mm>
  },
  "walls": [
    {
      "id": "wall_back",
      "side": "back",
      "length": <longueur mm>,
      "hasWindow": false,
      "hasDoor": false
    }
  ],
  "openings": [
    {
      "type": "door|window|arch",
      "wall": "wall_back",
      "width": <mm>,
      "height": <mm>,
      "fromFloor": <mm>,
      "position": <mm depuis la gauche du mur>
    }
  ],
  "technicalPoints": [
    {
      "type": "water|electric|gas|ventilation",
      "subtype": "water_cold|water_hot|water_drain|electric_16a|electric_20a|electric_32a|gas_inlet|vmc_duct",
      "wall": "wall_back",
      "heightFromFloor": <mm>,
      "position": <mm depuis la gauche du mur>
    }
  ],
  "confidence": <0.0 a 1.0>,
  "notes": ["note1", "note2"]
}

References pour estimation:
- Porte standard francaise: largeur 830mm, hauteur 2040mm
- Hauteur plafond standard: 2500mm
- Prise electrique standard: hauteur 250mm du sol
- Interrupteur: hauteur 1100mm du sol
- Plan de travail: hauteur 870mm
- Carrelage standard: 200x200mm, 300x300mm, ou 600x600mm

Si tu ne peux pas determiner une dimension avec certitude, fais une estimation raisonnable et indique dans "notes" quelles dimensions sont estimees.`;

    if (context) {
      prompt += '\n\nInformations supplementaires fournies par l\'utilisateur:';
      if (context.estimatedWidth) {prompt += `\n- Largeur estimee: ${context.estimatedWidth}mm`;}
      if (context.estimatedLength) {prompt += `\n- Longueur estimee: ${context.estimatedLength}mm`;}
      if (context.estimatedHeight) {prompt += `\n- Hauteur estimee: ${context.estimatedHeight}mm`;}
      if (context.notes) {prompt += `\n- Notes: ${context.notes}`;}
    }

    return prompt;
  }

  private parseAIResponse(text: string, context?: AnalysisContext): RoomScanResult {
    try {
      // Try to extract JSON from the response
      let jsonStr = text.trim();

      // Remove markdown code block if present
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1]!.trim();
      }

      const parsed = JSON.parse(jsonStr);

      // Validate and sanitize
      const result: RoomScanResult = {
        dimensions: {
          width: this.clampDimension(parsed.dimensions?.width, 1000, 10000, context?.estimatedWidth || 3000),
          length: this.clampDimension(parsed.dimensions?.length, 1000, 10000, context?.estimatedLength || 3000),
          height: this.clampDimension(parsed.dimensions?.height, 2000, 4000, context?.estimatedHeight || 2500),
        },
        walls: Array.isArray(parsed.walls) ? parsed.walls.slice(0, 4) : [],
        openings: Array.isArray(parsed.openings) ? parsed.openings : [],
        technicalPoints: Array.isArray(parsed.technicalPoints) ? parsed.technicalPoints : [],
        confidence: typeof parsed.confidence === 'number'
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.5,
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      };

      return result;
    } catch (error) {
      logger.warn('[RoomScan] Failed to parse AI response, returning defaults', { error, text: text.slice(0, 200) });

      return {
        dimensions: {
          width: context?.estimatedWidth || 3000,
          length: context?.estimatedLength || 3000,
          height: context?.estimatedHeight || 2500,
        },
        walls: [],
        openings: [],
        technicalPoints: [],
        confidence: 0.1,
        notes: ['Echec de l\'analyse automatique. Dimensions par defaut utilisees.'],
      };
    }
  }

  private clampDimension(value: unknown, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || isNaN(value)) {return fallback;}
    return Math.max(min, Math.min(max, Math.round(value)));
  }
}
