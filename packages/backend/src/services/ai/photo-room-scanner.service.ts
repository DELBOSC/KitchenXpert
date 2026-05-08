/**
 * Photo Room Scanner Service (F3)
 *
 * Analyzes 1-3 room photos using Claude Vision to extract
 * dimensions, walls, openings, technical points, and obstacles.
 * Uses the AnthropicService singleton for API access.
 */

import { z } from 'zod';

import { AnthropicService } from './anthropic.service';
import { SYSTEM_PROMPTS } from './prompt-templates';
import logger from '../../utils/logger';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface RoomScanResult {
  dimensions: {
    widthM: number;
    depthM: number;
    heightM: number;
    confidence: number;
  };
  walls: Array<{
    id: string;
    lengthM: number;
    angle: number;
    hasWindow: boolean;
    hasDoor: boolean;
  }>;
  openings: Array<{
    type: 'door' | 'window';
    wallId: string;
    positionM: number;
    widthM: number;
    heightM?: number;
  }>;
  technicalPoints: Array<{
    type: 'outlet' | 'switch' | 'water_inlet' | 'water_drain' | 'gas';
    position: { x: number; y: number; z: number };
  }>;
  obstacles: Array<{
    type: string;
    position: { x: number; y: number };
    widthM: number;
    depthM: number;
  }>;
  orientation?: string;
}

export interface FloorPlanData {
  widthM: number;
  depthM: number;
  walls: Array<{
    id: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }>;
  openings: Array<{
    type: 'door' | 'window';
    wallId: string;
    positionAlongWallM: number;
    widthM: number;
  }>;
  technicalPoints: Array<{
    type: string;
    x: number;
    y: number;
  }>;
  obstacles: Array<{
    type: string;
    x: number;
    y: number;
    widthM: number;
    depthM: number;
  }>;
}

// ----------------------------------------------------------------
// Zod Validation Schema
// ----------------------------------------------------------------

const RoomScanResultSchema = z.object({
  dimensions: z.object({
    widthM: z.number().min(0.5).max(20),
    depthM: z.number().min(0.5).max(20),
    heightM: z.number().min(1.5).max(6),
    confidence: z.number().min(0).max(1),
  }),
  walls: z.array(z.object({
    id: z.string().max(50),
    lengthM: z.number().min(0.3).max(20),
    angle: z.number().min(0).max(360),
    hasWindow: z.boolean(),
    hasDoor: z.boolean(),
  })).max(8),
  openings: z.array(z.object({
    type: z.enum(['door', 'window']),
    wallId: z.string().max(50),
    positionM: z.number().min(0).max(20),
    widthM: z.number().min(0.3).max(5),
    heightM: z.number().min(0.3).max(4).optional(),
  })).max(10),
  technicalPoints: z.array(z.object({
    type: z.enum(['outlet', 'switch', 'water_inlet', 'water_drain', 'gas']),
    position: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    }),
  })).max(30),
  obstacles: z.array(z.object({
    type: z.string().max(100),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }),
    widthM: z.number().min(0).max(10),
    depthM: z.number().min(0).max(10),
  })).max(10),
  orientation: z.string().max(100).optional(),
});

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class PhotoRoomScannerService {
  private anthropic: AnthropicService;

  constructor() {
    this.anthropic = AnthropicService.getInstance();
  }

  /**
   * Analyze 1-3 photos of a room and extract dimensions/features.
   *
   * @param photos - Array of image buffers (1-3 photos)
   * @param userId - The user requesting the scan (for usage logging)
   * @param mediaTypes - MIME types corresponding to each photo
   */
  async analyzeRoom(
    photos: Buffer[],
    userId: string,
    mediaTypes: Array<'image/jpeg' | 'image/png' | 'image/webp'>,
  ): Promise<RoomScanResult> {
    if (photos.length === 0 || photos.length > 3) {
      throw new Error('Between 1 and 3 photos are required for room analysis.');
    }

    const startTime = Date.now();

    logger.info('[PhotoRoomScanner] Starting room analysis', {
      photoCount: photos.length,
      userId,
    });

    try {
      // Build image content blocks for the API
      const images = photos.map((photo, index) => ({
        data: photo.toString('base64'),
        mediaType: mediaTypes[index] || 'image/jpeg',
      }));

      const prompt = this.buildPrompt();

      const result = await this.anthropic.generateJSON<RoomScanResult>({
        system: SYSTEM_PROMPTS.PHOTO_ROOM_SCANNER,
        messages: [
          {
            role: 'user',
            content: [
              ...images.map((img) => ({
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: img.mediaType,
                  data: img.data,
                },
              })),
              {
                type: 'text' as const,
                text: prompt,
              },
            ],
          },
        ],
        maxTokens: 4096,
        parse: (text: string) => {
          const raw = JSON.parse(text);
          return RoomScanResultSchema.parse(raw);
        },
      });

      const durationMs = Date.now() - startTime;

      // Log usage
      await this.anthropic.logUsage(
        userId,
        'anthropic',
        'claude-sonnet-4-5-20250929',
        result.inputTokens,
        result.outputTokens,
        durationMs,
        { feature: 'photo-room-scanner', promptVersion: '1.0.0' },
      );

      logger.info('[PhotoRoomScanner] Analysis complete', {
        confidence: result.data.dimensions.confidence,
        wallCount: result.data.walls.length,
        openingCount: result.data.openings.length,
        techPointCount: result.data.technicalPoints.length,
        durationMs,
      });

      return result.data;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      logger.error('[PhotoRoomScanner] Analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        durationMs,
        userId,
      });
      throw error;
    }
  }

  /**
   * Generate a 2D floor plan data structure from scan results.
   * Converts the detected walls, openings, and technical points into a
   * coordinate-based floor plan suitable for rendering.
   */
  async generateFloorPlan(scanResult: RoomScanResult): Promise<FloorPlanData> {
    const { dimensions, walls, openings, technicalPoints, obstacles } = scanResult;

    // Generate wall coordinates from the detected walls.
    // Simple rectangular room assumption when angle data is limited.
    const wallCoords = this.computeWallCoordinates(
      walls,
      dimensions.widthM,
      dimensions.depthM,
    );

    // Map technical points to 2D (project z away)
    const techPoints2D = technicalPoints.map((tp) => ({
      type: tp.type,
      x: tp.position.x,
      y: tp.position.y,
    }));

    // Map obstacles
    const obstacleList = obstacles.map((obs) => ({
      type: obs.type,
      x: obs.position.x,
      y: obs.position.y,
      widthM: obs.widthM,
      depthM: obs.depthM,
    }));

    return {
      widthM: dimensions.widthM,
      depthM: dimensions.depthM,
      walls: wallCoords,
      openings: openings.map((o) => ({
        type: o.type,
        wallId: o.wallId,
        positionAlongWallM: o.positionM,
        widthM: o.widthM,
      })),
      technicalPoints: techPoints2D,
      obstacles: obstacleList,
    };
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private buildPrompt(): string {
    return `Analyse ces photos de piece (cuisine ou autre) et extrais toutes les dimensions et elements detectables.

Reponds UNIQUEMENT avec un objet JSON valide (pas de markdown, pas de backticks), avec cette structure exacte:

{
  "dimensions": {
    "widthM": <largeur en metres>,
    "depthM": <profondeur en metres>,
    "heightM": <hauteur sous plafond en metres>,
    "confidence": <0.0 a 1.0, confiance dans les estimations>
  },
  "walls": [
    {
      "id": "wall_back",
      "lengthM": <longueur en metres>,
      "angle": <angle en degres, 0 = horizontal>,
      "hasWindow": false,
      "hasDoor": false
    }
  ],
  "openings": [
    {
      "type": "door" | "window",
      "wallId": "wall_back",
      "positionM": <position depuis le debut du mur en metres>,
      "widthM": <largeur en metres>,
      "heightM": <hauteur en metres, optionnel>
    }
  ],
  "technicalPoints": [
    {
      "type": "outlet" | "switch" | "water_inlet" | "water_drain" | "gas",
      "position": { "x": <metres depuis mur gauche>, "y": <metres depuis mur fond>, "z": <hauteur en metres> }
    }
  ],
  "obstacles": [
    {
      "type": "poutre|colonne|niche|radiateur|tuyau|autre",
      "position": { "x": <metres>, "y": <metres> },
      "widthM": <largeur en metres>,
      "depthM": <profondeur en metres>
    }
  ],
  "orientation": "nord|sud|est|ouest|nord-est|nord-ouest|sud-est|sud-ouest|inconnue"
}

References pour calibration des estimations:
- Porte standard francaise: 83cm x 204cm
- Hauteur plafond standard: 250cm
- Prise electrique: 25cm du sol (standard)
- Interrupteur: 110cm du sol
- Carrelage standard: 20x20cm, 30x30cm, 45x45cm, ou 60x60cm
- Largeur de plinthe standard: 7-8cm
- Hauteur de plan de travail: 87cm

Utilise les elements visibles (prises, portes, carrelage, meubles connus) pour calibrer les dimensions.
Si tu ne peux pas determiner une dimension, fais une estimation raisonnable et baisse le score de confiance.`;
  }

  /**
   * Compute wall start/end coordinates for a simple rectangular room.
   * For complex angles, uses the angle data from detection.
   */
  private computeWallCoordinates(
    walls: RoomScanResult['walls'],
    widthM: number,
    depthM: number,
  ): FloorPlanData['walls'] {
    // If we have 4 walls with reasonable data, build from angles.
    // Otherwise fallback to simple rectangle.
    if (walls.length === 0) {
      return this.rectangleWalls(widthM, depthM);
    }

    // For simplicity and robustness, create a rectangle aligned to detected walls.
    // Future: handle non-rectangular rooms via angle-based polygon.
    const result: FloorPlanData['walls'] = [];
    const sideMap: Record<string, [number, number, number, number]> = {
      wall_back: [0, 0, widthM, 0],
      wall_right: [widthM, 0, widthM, depthM],
      wall_front: [widthM, depthM, 0, depthM],
      wall_left: [0, depthM, 0, 0],
    };

    for (const wall of walls) {
      const coords = sideMap[wall.id];
      if (coords) {
        result.push({
          id: wall.id,
          startX: coords[0],
          startY: coords[1],
          endX: coords[2],
          endY: coords[3],
        });
      }
    }

    // Fill in any missing walls with defaults
    for (const [id, coords] of Object.entries(sideMap)) {
      if (!result.find((w) => w.id === id)) {
        result.push({
          id,
          startX: coords[0],
          startY: coords[1],
          endX: coords[2],
          endY: coords[3],
        });
      }
    }

    return result;
  }

  private rectangleWalls(widthM: number, depthM: number): FloorPlanData['walls'] {
    return [
      { id: 'wall_back', startX: 0, startY: 0, endX: widthM, endY: 0 },
      { id: 'wall_right', startX: widthM, startY: 0, endX: widthM, endY: depthM },
      { id: 'wall_front', startX: widthM, startY: depthM, endX: 0, endY: depthM },
      { id: 'wall_left', startX: 0, startY: depthM, endX: 0, endY: 0 },
    ];
  }
}

export default PhotoRoomScannerService;
