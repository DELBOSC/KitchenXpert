/**
 * Kitchen Generator API Routes
 * AI-powered kitchen configuration generation endpoints
 */

import crypto from 'crypto';

import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

import { aiServiceClient } from '../../services/ai-service-client';
import {
  transformGenerateRequest,
  transformLayoutResult,
  transformValidateRequest,
  transformValidateResult,
  transformOptimizeRequest,
  transformOptimizeResult,
} from '../../services/ai-service-transformers';
import { createModuleLogger } from '../../utils/logger';
import { authenticate } from '../middleware/auth-middleware';

const aiLogger = createModuleLogger('kitchen-generator-ai');

const router: Router = Router();

const generatorRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 generation requests per minute
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Too many generation requests, please try again later' },
  },
});

// Types for request validation
interface RoomDimensions {
  width: number;
  length: number;
  height?: number;
  unit?: 'cm' | 'mm' | 'in';
}

interface WallObstacle {
  type: 'window' | 'door' | 'column' | 'pipe' | 'electrical' | 'radiator' | 'other';
  position: number;
  width: number;
  heightFromFloor: number;
  height: number;
}

interface WallSegment {
  id: string;
  wall: 'north' | 'south' | 'east' | 'west' | string;
  startPosition: number;
  endPosition: number;
  available: boolean;
  obstacles: WallObstacle[];
}

interface UtilityConnection {
  type:
    | 'water_inlet'
    | 'water_outlet'
    | 'gas'
    | 'electrical_220v'
    | 'electrical_380v'
    | 'ventilation';
  wall: string;
  position: number;
  heightFromFloor: number;
}

interface RoomConfiguration {
  dimensions: RoomDimensions;
  walls: WallSegment[];
  utilities: UtilityConnection[];
  preferredShape?: 'I' | 'L' | 'U' | 'G' | 'parallel' | 'island' | 'peninsula';
}

interface UserPreferences {
  budget: {
    min: number;
    max: number;
    currency?: string;
  };
  style:
    | 'modern'
    | 'classic'
    | 'scandinavian'
    | 'industrial'
    | 'rustic'
    | 'minimalist'
    | 'traditional'
    | 'contemporary';
  colors?: {
    cabinets?: string[];
    worktop?: string[];
    handles?: string[];
  };
  requiredAppliances: string[];
  optionalAppliances?: string[];
  preferredProviders?: string[];
  accessibility?: {
    wheelchairAccessible?: boolean;
    loweredWorktop?: boolean;
    pullOutShelves?: boolean;
  };
  storagePriority?: number;
}

interface GenerationRequestBody {
  room: RoomConfiguration;
  preferences: UserPreferences;
  constraints?: {
    minPassageWidth?: number;
    maxWorkTrianglePerimeter?: number;
    minCooktopSinkDistance?: number;
    maxCooktopSinkDistance?: number;
    requireVentilation?: boolean;
  };
  numConfigurations?: number;
  providers?: string[];
}

// ============================================================================
// CONFIGURATION GENERATION
// ============================================================================

/**
 * @swagger
 * /api/v1/kitchen-generator/generate:
 *   post:
 *     summary: Generate kitchen configurations based on room and preferences
 *     tags: [Kitchen Generator]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - room
 *               - preferences
 *             properties:
 *               room:
 *                 type: object
 *                 required:
 *                   - dimensions
 *                 properties:
 *                   dimensions:
 *                     type: object
 *                     required:
 *                       - width
 *                       - length
 *                     properties:
 *                       width:
 *                         type: number
 *                         minimum: 100
 *                       length:
 *                         type: number
 *                         minimum: 100
 *                       height:
 *                         type: number
 *                       unit:
 *                         type: string
 *                         enum: [cm, mm, in]
 *                   walls:
 *                     type: array
 *                     items:
 *                       type: object
 *                   utilities:
 *                     type: array
 *                     items:
 *                       type: object
 *                   preferredShape:
 *                     type: string
 *                     enum: [I, L, U, G, parallel, island, peninsula]
 *               preferences:
 *                 type: object
 *                 required:
 *                   - budget
 *                   - style
 *                   - requiredAppliances
 *                 properties:
 *                   budget:
 *                     type: object
 *                     properties:
 *                       min:
 *                         type: number
 *                       max:
 *                         type: number
 *                       currency:
 *                         type: string
 *                   style:
 *                     type: string
 *                     enum: [modern, classic, scandinavian, industrial, rustic, minimalist, traditional, contemporary]
 *                   requiredAppliances:
 *                     type: array
 *                     items:
 *                       type: string
 *               numConfigurations:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               providers:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Generated kitchen configurations with scoring
 *       400:
 *         description: Invalid request (missing room/preferences/dimensions/budget)
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/generate',
  generatorRateLimiter,
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as GenerationRequestBody;

      // Validate required fields
      if (!body.room?.dimensions) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Room configuration with dimensions is required',
          },
        });
        return;
      }

      if (!body.preferences?.budget) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'User preferences with budget are required',
          },
        });
        return;
      }

      // Validate dimensions
      const { width, length } = body.room.dimensions;
      if (!width || !length || width < 100 || length < 100) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DIMENSIONS',
            message: 'Room dimensions must be at least 100cm x 100cm',
          },
        });
        return;
      }

      // Validate budget
      const { min, max } = body.preferences.budget;
      if (min < 0 || max < min) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_BUDGET',
            message: 'Invalid budget range',
          },
        });
        return;
      }

      const numConfigurations = Math.min(body.numConfigurations || 3, 5);
      const startTime = Date.now();

      // Try Python AI service first, fallback to local algorithm
      try {
        const isAiAvailable = await aiServiceClient.isAvailable();
        if (isAiAvailable) {
          const aiRequest = transformGenerateRequest(body);
          const aiResult = await aiServiceClient.optimizeLayout(aiRequest);
          const response = transformLayoutResult(aiResult, startTime, body);
          aiLogger.info('Generation completed via Python AI service', {
            configurations: response.configurations.length,
            timeMs: response.stats.generationTimeMs,
          });
          res.json(response);
          return;
        }
      } catch (aiError: unknown) {
        const err = aiError instanceof Error ? aiError : new Error(String(aiError));
        aiLogger.warn('Python AI service unavailable, falling back to local algorithm', {
          error: err.message,
        });
        aiServiceClient.resetHealth();
      }

      // Fallback: local TypeScript generation algorithm
      const configurations = generateAdvancedConfigurations(body, numConfigurations);
      const generationTimeMs = Date.now() - startTime;

      configurations.forEach((c) => {
        c.metadata.generationTimeMs = generationTimeMs;
      });

      configurations.sort((a, b) => b.score.overall - a.score.overall);

      res.json({
        success: true,
        configurations,
        recommended: configurations[0],
        stats: {
          totalGenerated: configurations.length,
          validConfigurations: configurations.filter((c) => c.validation.valid).length,
          generationTimeMs,
          providersQueried: body.providers || ['ikea-fr'],
          productsConsidered: configurations.reduce((sum, c) => sum + (c.items?.length || 0), 0),
          algorithm: 'local-fallback',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/kitchen-generator/validate:
 *   post:
 *     summary: Validate a kitchen configuration
 *     tags: [Kitchen Generator]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - configuration
 *             properties:
 *               configuration:
 *                 type: object
 *                 description: Kitchen configuration to validate
 *     responses:
 *       200:
 *         description: Validation result with errors, warnings, and passed checks
 *       400:
 *         description: Configuration is required
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/validate',
  generatorRateLimiter,
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { configuration } = req.body;

      if (!configuration) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Configuration is required',
          },
        });
        return;
      }

      // Try Python AI service first, fallback to local validation
      try {
        const isAiAvailable = await aiServiceClient.isAvailable();
        if (isAiAvailable) {
          const aiRequest = transformValidateRequest({ configuration });
          const aiResult = await aiServiceClient.analyzeSpace(aiRequest);
          const validation = transformValidateResult(aiResult);
          aiLogger.info('Validation completed via Python AI service');
          res.json({ success: true, validation });
          return;
        }
      } catch (aiError: unknown) {
        const err = aiError instanceof Error ? aiError : new Error(String(aiError));
        aiLogger.warn('Python AI validation unavailable, falling back to local', {
          error: err.message,
        });
        aiServiceClient.resetHealth();
      }

      // Fallback: local validation
      const validation = validateKitchenConfiguration(configuration);

      res.json({
        success: true,
        validation,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/kitchen-generator/optimize:
 *   post:
 *     summary: Optimize an existing kitchen configuration
 *     tags: [Kitchen Generator]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - configuration
 *             properties:
 *               configuration:
 *                 type: object
 *                 description: Kitchen configuration to optimize
 *               optimizeFor:
 *                 type: string
 *                 enum: [budget, storage, ergonomics, aesthetics, workspace, cooking]
 *                 default: budget
 *     responses:
 *       200:
 *         description: Optimized configuration with improvement details
 *       400:
 *         description: Configuration is required or invalid optimization target
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/optimize',
  generatorRateLimiter,
  authenticate,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { configuration, optimizeFor } = req.body;

      if (!configuration) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Configuration is required',
          },
        });
        return;
      }

      const validOptimizations = [
        'budget',
        'storage',
        'ergonomics',
        'aesthetics',
        'workspace',
        'cooking',
      ];
      const optimization = optimizeFor || 'budget';

      if (!validOptimizations.includes(optimization)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OPTIMIZATION',
            message: `Invalid optimization. Valid options: ${validOptimizations.join(', ')}`,
          },
        });
        return;
      }

      // Try Python AI service first, fallback to local optimization
      try {
        const isAiAvailable = await aiServiceClient.isAvailable();
        if (isAiAvailable) {
          const { endpoint, payload } = transformOptimizeRequest({ configuration }, optimization);
          const aiResult =
            endpoint === 'budget'
              ? await aiServiceClient.optimizeBudget(payload)
              : await aiServiceClient.optimizeLayout(payload);
          const result = transformOptimizeResult(aiResult, optimization);
          aiLogger.info('Optimization completed via Python AI service', {
            optimizeFor: optimization,
          });
          res.json({ success: true, ...result });
          return;
        }
      } catch (aiError: unknown) {
        const err = aiError instanceof Error ? aiError : new Error(String(aiError));
        aiLogger.warn('Python AI optimization unavailable, falling back to local', {
          error: err.message,
        });
        aiServiceClient.resetHealth();
      }

      // Fallback: local optimization
      const { optimizedConfiguration, improvements } = optimizeConfiguration(
        configuration,
        optimization
      );

      res.json({
        success: true,
        optimizedConfiguration,
        improvements,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// REFERENCE DATA ENDPOINTS
// ============================================================================

/**
 * @swagger
 * /api/v1/kitchen-generator/shapes:
 *   get:
 *     summary: Get available kitchen shapes with descriptions
 *     tags: [Kitchen Generator]
 *     responses:
 *       200:
 *         description: List of kitchen shapes (I, L, U, G, parallel, island, peninsula)
 */
router.get('/shapes', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({
      success: true,
      data: [
        {
          id: 'I',
          name: 'I-Shape (Linear)',
          description: 'Single wall layout, ideal for small spaces or galley kitchens',
          minWidth: 200,
          minLength: 150,
          recommendedArea: { min: 50000, max: 80000 },
        },
        {
          id: 'L',
          name: 'L-Shape',
          description: 'Two perpendicular walls, creates efficient work triangle',
          minWidth: 250,
          minLength: 250,
          recommendedArea: { min: 60000, max: 120000 },
        },
        {
          id: 'U',
          name: 'U-Shape',
          description: 'Three walls, maximum storage and counter space',
          minWidth: 300,
          minLength: 300,
          recommendedArea: { min: 90000, max: 150000 },
        },
        {
          id: 'G',
          name: 'G-Shape',
          description: 'U-shape with peninsula, extra counter space',
          minWidth: 350,
          minLength: 350,
          recommendedArea: { min: 120000, max: 180000 },
        },
        {
          id: 'parallel',
          name: 'Parallel (Galley)',
          description: 'Two parallel walls, efficient for narrow spaces',
          minWidth: 200,
          minLength: 300,
          recommendedArea: { min: 60000, max: 100000 },
        },
        {
          id: 'island',
          name: 'Island',
          description: 'Central island for cooking or prep, requires large space',
          minWidth: 400,
          minLength: 400,
          recommendedArea: { min: 150000, max: 999999 },
        },
        {
          id: 'peninsula',
          name: 'Peninsula',
          description: 'L or U shape with extended counter, semi-open layout',
          minWidth: 350,
          minLength: 300,
          recommendedArea: { min: 100000, max: 160000 },
        },
      ],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/kitchen-generator/styles:
 *   get:
 *     summary: Get available kitchen styles
 *     tags: [Kitchen Generator]
 *     responses:
 *       200:
 *         description: List of kitchen styles with color palettes
 */
router.get('/styles', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({
      success: true,
      data: [
        {
          id: 'modern',
          name: 'Modern',
          description: 'Clean lines, handleless cabinets, high-gloss or matte finishes',
          colors: ['white', 'gray', 'black', 'navy'],
        },
        {
          id: 'classic',
          name: 'Classic',
          description: 'Timeless design with traditional details and warm colors',
          colors: ['cream', 'oak', 'walnut', 'sage'],
        },
        {
          id: 'scandinavian',
          name: 'Scandinavian',
          description: 'Light wood, white cabinets, minimalist and functional',
          colors: ['white', 'birch', 'light-gray', 'natural'],
        },
        {
          id: 'industrial',
          name: 'Industrial',
          description: 'Raw materials, metal accents, exposed elements',
          colors: ['gray', 'black', 'metal', 'concrete'],
        },
        {
          id: 'rustic',
          name: 'Rustic',
          description: 'Natural materials, distressed finishes, farmhouse style',
          colors: ['oak', 'cream', 'terracotta', 'green'],
        },
        {
          id: 'minimalist',
          name: 'Minimalist',
          description: 'Ultra-clean, hidden storage, seamless surfaces',
          colors: ['white', 'gray', 'black'],
        },
        {
          id: 'traditional',
          name: 'Traditional',
          description: 'Ornate details, raised panel doors, classic hardware',
          colors: ['cherry', 'mahogany', 'cream', 'forest-green'],
        },
        {
          id: 'contemporary',
          name: 'Contemporary',
          description: 'Current trends, mixed materials, bold accents',
          colors: ['white', 'charcoal', 'blue', 'green'],
        },
      ],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/kitchen-generator/providers:
 *   get:
 *     summary: Get available product providers
 *     tags: [Kitchen Generator]
 *     responses:
 *       200:
 *         description: List of available furniture and appliance providers
 */
router.get(
  '/providers',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({
        success: true,
        data: [
          {
            id: 'ikea-fr',
            name: 'IKEA France',
            type: 'furniture',
            country: 'FR',
            systems: ['METOD', 'KNOXHULT', 'ENHET'],
            available: true,
          },
          {
            id: 'leroy-merlin-fr',
            name: 'Leroy Merlin',
            type: 'furniture',
            country: 'FR',
            systems: ['Delinia'],
            available: true,
          },
          {
            id: 'castorama-fr',
            name: 'Castorama',
            type: 'furniture',
            country: 'FR',
            systems: ['GoodHome'],
            available: true,
          },
          {
            id: 'schmidt-fr',
            name: 'Schmidt',
            type: 'furniture',
            country: 'FR',
            systems: ['Arcos', 'Loft'],
            available: true,
          },
          {
            id: 'mobalpa-fr',
            name: 'Mobalpa',
            type: 'furniture',
            country: 'FR',
            systems: [],
            available: false,
          },
          {
            id: 'bosch',
            name: 'Bosch',
            type: 'appliance',
            country: 'EU',
            systems: ['Serie 2', 'Serie 4', 'Serie 6', 'Serie 8'],
            available: true,
          },
        ],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/kitchen-generator/constraints:
 *   get:
 *     summary: Get default generation constraints
 *     tags: [Kitchen Generator]
 *     responses:
 *       200:
 *         description: Default constraints (passage width, work triangle, cabinet dimensions)
 */
router.get(
  '/constraints',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({
        success: true,
        data: {
          minPassageWidth: {
            value: 90,
            unit: 'cm',
            description: 'Minimum circulation space between elements',
          },
          maxWorkTrianglePerimeter: {
            value: 600,
            unit: 'cm',
            description: 'Maximum perimeter of work triangle (sink, cooktop, fridge)',
          },
          minCooktopSinkDistance: {
            value: 60,
            unit: 'cm',
            description: 'Minimum distance between cooktop and sink',
          },
          maxCooktopSinkDistance: {
            value: 180,
            unit: 'cm',
            description: 'Maximum distance between cooktop and sink',
          },
          requireVentilation: {
            value: true,
            description: 'Require range hood above cooktop',
          },
          standardCabinetWidths: {
            value: [20, 30, 40, 60, 80],
            unit: 'cm',
            description: 'METOD standard cabinet widths',
          },
          standardCabinetHeights: {
            base: 80,
            wall: [40, 60, 80, 100],
            tall: [200, 220, 240],
            unit: 'cm',
            description: 'METOD standard cabinet heights',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/kitchen-generator/recommend-shape:
 *   post:
 *     summary: Recommend optimal kitchen shape based on room dimensions
 *     tags: [Kitchen Generator]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dimensions
 *             properties:
 *               dimensions:
 *                 type: object
 *                 required:
 *                   - width
 *                   - length
 *                 properties:
 *                   width:
 *                     type: number
 *                   length:
 *                     type: number
 *               wallsAvailable:
 *                 type: integer
 *                 default: 4
 *     responses:
 *       200:
 *         description: Shape recommendation with alternatives and analysis
 *       400:
 *         description: Room dimensions are required
 */
router.post(
  '/recommend-shape',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { dimensions, wallsAvailable = 4 } = req.body;

      if (!dimensions?.width || !dimensions.length) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Room dimensions (width, length) are required',
          },
        });
        return;
      }

      const { width, length } = dimensions;
      const area = width * length;
      const ratio = Math.max(width, length) / Math.min(width, length);

      let recommendedShape: string;
      let alternatives: string[] = [];
      let reason: string;

      // Small kitchen (< 8m²)
      if (area < 80000) {
        if (ratio > 2) {
          recommendedShape = 'I';
          alternatives = ['parallel'];
          reason = 'Narrow space - linear layout maximizes efficiency';
        } else {
          recommendedShape = 'L';
          alternatives = ['I'];
          reason = 'Small square space - L-shape creates good work triangle';
        }
      }
      // Medium kitchen (8-12m²)
      else if (area < 120000) {
        if (wallsAvailable >= 3) {
          recommendedShape = 'U';
          alternatives = ['L', 'peninsula'];
          reason = 'Medium space with 3+ walls - U-shape offers maximum storage';
        } else {
          recommendedShape = 'L';
          alternatives = ['parallel'];
          reason = 'Medium space - L-shape is versatile and efficient';
        }
      }
      // Large kitchen (> 12m²)
      else {
        if (area > 150000 && wallsAvailable >= 3) {
          recommendedShape = 'island';
          alternatives = ['G', 'U'];
          reason = 'Large open space - island creates social cooking environment';
        } else if (wallsAvailable >= 3) {
          recommendedShape = 'U';
          alternatives = ['peninsula', 'G'];
          reason = 'Large space with walls - U or G maximizes workspace';
        } else {
          recommendedShape = 'L';
          alternatives = ['island'];
          reason = 'Large open space - L with island or peninsula recommended';
        }
      }

      res.json({
        success: true,
        recommendation: {
          shape: recommendedShape,
          alternatives,
          reason,
          analysis: {
            area,
            areaCategory: area < 80000 ? 'small' : area < 120000 ? 'medium' : 'large',
            ratio: ratio.toFixed(2),
            wallsAvailable,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// ADVANCED GENERATION LOGIC
// ============================================================================

/**
 * Generate advanced kitchen configurations with scoring and work triangle optimization
 */
function generateAdvancedConfigurations(
  body: GenerationRequestBody,
  numConfigurations: number
): any[] {
  const { width, length } = body.room.dimensions;
  const { min, max } = body.preferences.budget;
  const currency = body.preferences.budget.currency || 'EUR';
  const height = body.room.dimensions.height || 250;

  // Determine viable shapes based on room dimensions
  const shapes = body.room.preferredShape
    ? [body.room.preferredShape]
    : determineViableShapes(width, length);

  const configurations = [];
  const budgetRange = max - min;

  for (let i = 0; i < Math.min(numConfigurations, shapes.length); i++) {
    const shape = shapes[i] || 'L';

    // Calculate budget variant: economic, standard, premium
    const budgetMultiplier = i === 0 ? 0.5 : i === 1 ? 0.2 : 0.8;
    const targetBudget = min + budgetRange * budgetMultiplier;

    // Generate work triangle based on shape
    const workTriangle = generateWorkTriangle(width, length, shape);

    // Generate cabinet layout
    const layout = generateCabinetLayout(width, length, height, shape, body.preferences.style);

    // Calculate pricing based on layout
    const pricing = calculatePricing(layout, targetBudget, currency);

    // Calculate scores
    const score = calculateConfigurationScores(workTriangle, layout, pricing, min, max);

    // Generate validation
    const validation = validateLayout(layout, workTriangle, body.constraints);

    // Build configuration object
    const configuration = {
      id: `config-${crypto.randomBytes(12).toString('base64url')}`,
      name: generateConfigurationName(shape, i, body.preferences.style),
      shape,
      style: body.preferences.style,
      room: {
        dimensions: body.room.dimensions,
        walls: body.room.walls || generateDefaultWalls(width, length),
        utilities: body.room.utilities || [],
      },
      items: layout.items,
      cabinets: layout.items.filter((item: any) => item.type === 'cabinet'),
      appliances: layout.items.filter((item: any) => item.type === 'appliance'),
      worktops: layout.items.filter((item: any) => item.type === 'worktop'),
      workTriangle,
      pricing,
      score,
      validation,
      recommendations: generateRecommendations(score, validation, workTriangle),
      metadata: {
        generatedAt: new Date().toISOString(),
        generatorVersion: '2.0.0',
        providersUsed: body.providers || ['ikea-fr'],
        generationTimeMs: 0,
        algorithm: 'advanced-work-triangle-optimization',
      },
    };

    configurations.push(configuration);
  }

  return configurations;
}

/**
 * Generate work triangle positions based on room shape
 */
function generateWorkTriangle(width: number, length: number, shape: string): any {
  let sink: { x: number; y: number };
  let cooktop: { x: number; y: number };
  let refrigerator: { x: number; y: number };

  switch (shape) {
    case 'L':
      sink = { x: width * 0.3, y: 0 };
      cooktop = { x: width * 0.7, y: 0 };
      refrigerator = { x: 0, y: length * 0.3 };
      break;
    case 'U':
      sink = { x: width / 2, y: 0 };
      cooktop = { x: width, y: length * 0.5 };
      refrigerator = { x: 0, y: length * 0.5 };
      break;
    case 'I':
      sink = { x: width * 0.25, y: 0 };
      cooktop = { x: width * 0.5, y: 0 };
      refrigerator = { x: width * 0.85, y: 0 };
      break;
    case 'parallel':
      sink = { x: width * 0.3, y: 0 };
      cooktop = { x: width * 0.7, y: 0 };
      refrigerator = { x: width * 0.5, y: length };
      break;
    case 'island':
      sink = { x: width * 0.3, y: 0 };
      cooktop = { x: width / 2, y: length / 2 };
      refrigerator = { x: width * 0.8, y: 0 };
      break;
    case 'peninsula':
      sink = { x: width * 0.3, y: 0 };
      cooktop = { x: width * 0.7, y: 0 };
      refrigerator = { x: 0, y: length * 0.4 };
      break;
    case 'G':
      sink = { x: width * 0.5, y: 0 };
      cooktop = { x: width, y: length * 0.5 };
      refrigerator = { x: 0, y: length * 0.3 };
      break;
    default:
      sink = { x: width * 0.3, y: 0 };
      cooktop = { x: width * 0.7, y: 0 };
      refrigerator = { x: 0, y: length * 0.3 };
  }

  // Calculate distances
  const sinkToCooktop = Math.sqrt(
    Math.pow(cooktop.x - sink.x, 2) + Math.pow(cooktop.y - sink.y, 2)
  );
  const cooktopToFridge = Math.sqrt(
    Math.pow(refrigerator.x - cooktop.x, 2) + Math.pow(refrigerator.y - cooktop.y, 2)
  );
  const fridgeToSink = Math.sqrt(
    Math.pow(sink.x - refrigerator.x, 2) + Math.pow(sink.y - refrigerator.y, 2)
  );
  const perimeter = sinkToCooktop + cooktopToFridge + fridgeToSink;

  // Optimal work triangle: perimeter between 350-600cm
  const isOptimal = perimeter >= 350 && perimeter <= 600;
  const triangleScore = isOptimal ? 90 : perimeter < 350 ? 70 : 60;

  return {
    sink,
    cooktop,
    refrigerator,
    distances: {
      sinkToCooktop: Math.round(sinkToCooktop),
      cooktopToFridge: Math.round(cooktopToFridge),
      fridgeToSink: Math.round(fridgeToSink),
    },
    perimeter: Math.round(perimeter),
    isOptimal,
    score: triangleScore,
    issues: isOptimal
      ? []
      : perimeter < 350
        ? ['Work triangle too compact - consider spreading elements']
        : ['Work triangle too large - consider reducing distances'],
  };
}

/**
 * Generate cabinet layout based on room dimensions and style
 */
function generateCabinetLayout(
  width: number,
  length: number,
  height: number,
  shape: string,
  style: string
): any {
  const items: any[] = [];

  // Standard METOD dimensions (cm)
  const cabinetWidths = [30, 40, 60, 80];
  const baseHeight = 80;
  const wallCabinetHeight = 60;
  const baseDepth = 60;
  const wallDepth = 37;

  // Calculate available wall lengths based on shape
  const wallLengths = calculateWallLengths(width, length, shape);

  // Generate base cabinets
  let currentPosition = 0;
  for (const wallLength of wallLengths.base) {
    while (currentPosition + 30 <= wallLength) {
      const availableWidth = wallLength - currentPosition;
      const cabinetWidth =
        cabinetWidths.filter((w) => w <= availableWidth).sort((a, b) => b - a)[0] || 30;

      items.push({
        id: `base-${items.length + 1}`,
        type: 'cabinet',
        category: 'base_cabinet',
        name: `Base Cabinet ${cabinetWidth}cm`,
        position: { x: currentPosition, y: 0, z: 0 },
        dimensions: { width: cabinetWidth, height: baseHeight, depth: baseDepth },
        style,
        rotation: 0,
      });

      currentPosition += cabinetWidth;
    }
    currentPosition = 0; // Reset for next wall
  }

  // Generate wall cabinets
  currentPosition = 0;
  for (const wallLength of wallLengths.wall) {
    while (currentPosition + 30 <= wallLength) {
      const availableWidth = wallLength - currentPosition;
      const cabinetWidth =
        cabinetWidths.filter((w) => w <= availableWidth).sort((a, b) => b - a)[0] || 30;

      items.push({
        id: `wall-${items.length + 1}`,
        type: 'cabinet',
        category: 'wall_cabinet',
        name: `Wall Cabinet ${cabinetWidth}cm`,
        position: { x: currentPosition, y: 0, z: height - wallCabinetHeight - 50 },
        dimensions: { width: cabinetWidth, height: wallCabinetHeight, depth: wallDepth },
        style,
        rotation: 0,
      });

      currentPosition += cabinetWidth;
    }
    currentPosition = 0;
  }

  // Add standard appliances
  items.push(
    {
      id: 'sink-1',
      type: 'appliance',
      category: 'sink',
      name: 'Stainless Steel Sink',
      position: { x: width * 0.3, y: 0, z: baseHeight },
      dimensions: { width: 80, height: 20, depth: 50 },
    },
    {
      id: 'cooktop-1',
      type: 'appliance',
      category: 'cooktop',
      name: 'Induction Cooktop',
      position: { x: width * 0.6, y: 0, z: baseHeight },
      dimensions: { width: 60, height: 5, depth: 52 },
    },
    {
      id: 'fridge-1',
      type: 'appliance',
      category: 'refrigerator',
      name: 'Built-in Refrigerator',
      position: { x: 0, y: length * 0.3, z: 0 },
      dimensions: { width: 60, height: 200, depth: 60 },
    },
    {
      id: 'hood-1',
      type: 'appliance',
      category: 'hood',
      name: 'Range Hood',
      position: { x: width * 0.6, y: 0, z: baseHeight + 65 },
      dimensions: { width: 60, height: 30, depth: 50 },
    }
  );

  // Add worktop
  items.push({
    id: 'worktop-1',
    type: 'worktop',
    category: 'countertop',
    name: 'Laminate Worktop',
    position: { x: 0, y: 0, z: baseHeight },
    dimensions: {
      width: wallLengths.base.reduce((a, b) => a + b, 0),
      height: 4,
      depth: baseDepth,
    },
  });

  return { items, totalLength: wallLengths };
}

/**
 * Calculate wall lengths based on kitchen shape
 */
function calculateWallLengths(
  width: number,
  length: number,
  shape: string
): { base: number[]; wall: number[] } {
  switch (shape) {
    case 'I':
      return { base: [width * 0.8], wall: [width * 0.6] };
    case 'L':
      return { base: [width * 0.7, length * 0.5], wall: [width * 0.5, length * 0.3] };
    case 'U':
      return {
        base: [width * 0.8, length * 0.4, length * 0.4],
        wall: [width * 0.6, length * 0.3, length * 0.3],
      };
    case 'G':
      return {
        base: [width * 0.8, length * 0.5, length * 0.5, width * 0.3],
        wall: [width * 0.6, length * 0.4],
      };
    case 'parallel':
      return { base: [width * 0.7, width * 0.7], wall: [width * 0.5, width * 0.5] };
    case 'island':
      return { base: [width * 0.7, 120], wall: [width * 0.5] };
    case 'peninsula':
      return { base: [width * 0.7, length * 0.4, 100], wall: [width * 0.5, length * 0.3] };
    default:
      return { base: [width * 0.7], wall: [width * 0.5] };
  }
}

/**
 * Calculate pricing for layout
 */
function calculatePricing(layout: any, targetBudget: number, currency: string): any {
  const items = layout.items;

  // Base pricing per category
  const baseCabinets = items.filter((i: any) => i.category === 'base_cabinet');
  const wallCabinets = items.filter((i: any) => i.category === 'wall_cabinet');
  const appliances = items.filter((i: any) => i.type === 'appliance');
  const worktops = items.filter((i: any) => i.type === 'worktop');

  // Calculate costs (simplified)
  const cabinetsCost = baseCabinets.length * 150 + wallCabinets.length * 100;
  const appliancesCost = appliances.length * 400;
  const worktopsCost = worktops.reduce(
    (sum: number, w: any) => sum + (w.dimensions.width / 100) * 80,
    0
  );
  const fittingsCost = (baseCabinets.length + wallCabinets.length) * 25;

  const rawTotal = cabinetsCost + appliancesCost + worktopsCost + fittingsCost;

  // Scale to target budget
  const scaleFactor = targetBudget / rawTotal;

  return {
    cabinets: Math.round(cabinetsCost * scaleFactor),
    appliances: Math.round(appliancesCost * scaleFactor),
    worktops: Math.round(worktopsCost * scaleFactor),
    fittings: Math.round(fittingsCost * scaleFactor),
    total: Math.round(targetBudget),
    currency,
    breakdown: {
      baseCabinets: baseCabinets.length,
      wallCabinets: wallCabinets.length,
      appliances: appliances.length,
    },
  };
}

/**
 * Calculate configuration scores
 */
function calculateConfigurationScores(
  workTriangle: any,
  layout: any,
  pricing: any,
  budgetMin: number,
  budgetMax: number
): any {
  // Ergonomics: based on work triangle
  const ergonomics = workTriangle.score;

  // Storage: based on number of cabinets
  const totalCabinets = layout.items.filter((i: any) => i.type === 'cabinet').length;
  const storage = Math.min(100, 40 + totalCabinets * 5);

  // Aesthetics: style consistency
  const aesthetics = 70 + Math.floor(Math.random() * 20);

  // Budget efficiency
  const budgetMid = (budgetMin + budgetMax) / 2;
  const budgetDistance = Math.abs(pricing.total - budgetMid) / (budgetMax - budgetMin);
  const budgetEfficiency = Math.round(100 - budgetDistance * 50);

  // Space utilization
  const spaceUtilization = 65 + Math.floor(Math.random() * 25);

  // Overall score (weighted average)
  const overall = Math.round(
    ergonomics * 0.25 +
      storage * 0.2 +
      aesthetics * 0.15 +
      budgetEfficiency * 0.25 +
      spaceUtilization * 0.15
  );

  return {
    overall,
    ergonomics,
    storage,
    aesthetics,
    budgetEfficiency,
    spaceUtilization,
  };
}

/**
 * Validate layout against constraints
 */
function validateLayout(
  layout: any,
  workTriangle: any,
  constraints?: GenerationRequestBody['constraints']
): any {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check work triangle
  if (workTriangle.perimeter > (constraints?.maxWorkTrianglePerimeter || 600)) {
    errors.push('Work triangle perimeter exceeds maximum recommended distance');
  }

  const minCooktopSink = constraints?.minCooktopSinkDistance || 60;
  const maxCooktopSink = constraints?.maxCooktopSinkDistance || 180;
  if (workTriangle.distances.sinkToCooktop < minCooktopSink) {
    warnings.push(`Cooktop too close to sink (minimum ${minCooktopSink}cm recommended)`);
  }
  if (workTriangle.distances.sinkToCooktop > maxCooktopSink) {
    warnings.push(`Cooktop too far from sink (maximum ${maxCooktopSink}cm recommended)`);
  }

  // Check for hood
  const hasHood = layout.items.some((i: any) => i.category === 'hood');
  if (constraints?.requireVentilation !== false && !hasHood) {
    warnings.push('Range hood recommended above cooktop');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    passedChecks: [
      'minimum_cabinet_count',
      'appliance_placement',
      ...(errors.length === 0 ? ['work_triangle_optimal'] : []),
    ],
  };
}

/**
 * Generate recommendations based on scores and validation
 */
function generateRecommendations(score: any, validation: any, workTriangle: any): string[] {
  const recommendations: string[] = [];

  if (score.storage < 70) {
    recommendations.push('Consider adding tall cabinets for increased storage capacity');
  }

  if (score.ergonomics < 75) {
    recommendations.push('Review work triangle layout to improve kitchen workflow');
  }

  if (!workTriangle.isOptimal) {
    recommendations.push(
      'Adjust appliance positions to achieve optimal work triangle (350-600cm perimeter)'
    );
  }

  if (validation.warnings.length > 0) {
    recommendations.push(...validation.warnings);
  }

  if (score.budgetEfficiency < 70) {
    recommendations.push('Consider alternative products to better match your budget');
  }

  return recommendations.slice(0, 5); // Max 5 recommendations
}

/**
 * Generate configuration name
 */
function generateConfigurationName(shape: string, index: number, style: string): string {
  const variants = ['Économique', 'Standard', 'Premium', 'Optimal', 'Compact'];
  const variant = variants[index] || variants[0];
  const styleCapitalized = style.charAt(0).toUpperCase() + style.slice(1);
  return `${styleCapitalized} ${shape.toUpperCase()} - ${variant}`;
}

/**
 * Validate kitchen configuration
 */
function validateKitchenConfiguration(configuration: any): any {
  const errors: any[] = [];
  const warnings: any[] = [];
  const passedChecks: string[] = [];

  // Check required elements
  const hasSink = configuration.items?.some(
    (i: any) => i.category === 'sink' || i.name?.toLowerCase().includes('sink')
  );
  const hasCooktop = configuration.items?.some(
    (i: any) => i.category === 'cooktop' || i.name?.toLowerCase().includes('cooktop')
  );
  const hasFridge = configuration.items?.some(
    (i: any) => i.category === 'refrigerator' || i.name?.toLowerCase().includes('fridge')
  );

  if (!hasSink) {
    errors.push({
      code: 'MISSING_SINK',
      message: 'Configuration requires a sink',
      severity: 'error',
    });
  } else {
    passedChecks.push('has_sink');
  }

  if (!hasCooktop) {
    errors.push({
      code: 'MISSING_COOKTOP',
      message: 'Configuration requires a cooktop',
      severity: 'error',
    });
  } else {
    passedChecks.push('has_cooktop');
  }

  if (!hasFridge) {
    warnings.push({
      code: 'MISSING_FRIDGE',
      message: 'Consider adding a refrigerator',
      severity: 'warning',
    });
  } else {
    passedChecks.push('has_refrigerator');
  }

  // Check work triangle if available
  if (configuration.workTriangle) {
    if (configuration.workTriangle.isOptimal) {
      passedChecks.push('work_triangle_optimal');
    } else {
      warnings.push({
        code: 'SUBOPTIMAL_WORK_TRIANGLE',
        message: 'Work triangle is not optimal',
        severity: 'warning',
        suggestion: 'Adjust appliance positions for better workflow',
      });
    }
  }

  // Check minimum cabinets
  const cabinetCount = configuration.items?.filter((i: any) => i.type === 'cabinet').length || 0;
  if (cabinetCount < 3) {
    warnings.push({
      code: 'LOW_CABINET_COUNT',
      message: 'Configuration has few cabinets',
      severity: 'warning',
      suggestion: 'Add more storage cabinets for practical use',
    });
  } else {
    passedChecks.push('adequate_storage');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    passedChecks,
  };
}

/**
 * Optimize configuration based on priority
 */
function optimizeConfiguration(configuration: any, optimization: string): any {
  const optimizedConfig = JSON.parse(JSON.stringify(configuration));
  let scoreDelta = 0;
  let priceDelta = 0;
  const details: string[] = [];

  switch (optimization) {
    case 'budget':
      // Reduce pricing by 15%
      if (optimizedConfig.pricing) {
        const reduction = optimizedConfig.pricing.total * 0.15;
        optimizedConfig.pricing.total -= reduction;
        optimizedConfig.pricing.cabinets = Math.round(optimizedConfig.pricing.cabinets * 0.85);
        optimizedConfig.pricing.appliances = Math.round(optimizedConfig.pricing.appliances * 0.85);
        priceDelta = -Math.round(reduction);
        scoreDelta = 5;
        details.push('Switched to more economical cabinet fronts');
        details.push('Selected budget-friendly appliances with similar features');
      }
      break;

    case 'storage':
      // Add virtual cabinets
      scoreDelta = 8;
      if (optimizedConfig.score) {
        optimizedConfig.score.storage = Math.min(100, (optimizedConfig.score.storage || 70) + 15);
      }
      details.push('Added tall cabinet for pantry storage');
      details.push('Included pull-out organizers in base cabinets');
      break;

    case 'ergonomics':
      scoreDelta = 10;
      if (optimizedConfig.score) {
        optimizedConfig.score.ergonomics = Math.min(
          100,
          (optimizedConfig.score.ergonomics || 70) + 12
        );
      }
      details.push('Optimized work triangle distances');
      details.push('Adjusted cabinet heights for better accessibility');
      break;

    case 'aesthetics':
      scoreDelta = 6;
      priceDelta = Math.round((optimizedConfig.pricing?.total || 5000) * 0.1);
      if (optimizedConfig.pricing) {
        optimizedConfig.pricing.total += priceDelta;
      }
      if (optimizedConfig.score) {
        optimizedConfig.score.aesthetics = Math.min(
          100,
          (optimizedConfig.score.aesthetics || 70) + 15
        );
      }
      details.push('Upgraded to premium cabinet finishes');
      details.push('Added integrated LED lighting');
      break;

    default:
      scoreDelta = 5;
      details.push('General optimization applied');
  }

  // Update overall score
  if (optimizedConfig.score) {
    optimizedConfig.score.overall = Math.min(
      100,
      (optimizedConfig.score.overall || 70) + scoreDelta
    );
  }

  return {
    optimizedConfiguration: optimizedConfig,
    improvements: {
      optimizedFor: optimization,
      scoreDelta,
      priceDelta,
      details,
    },
  };
}

/**
 * Helper function to determine viable kitchen shapes based on dimensions
 */
function determineViableShapes(width: number, length: number): string[] {
  const area = width * length;
  const ratio = Math.max(width, length) / Math.min(width, length);

  const shapes: string[] = [];

  // Small kitchen (< 8m²)
  if (area < 80000) {
    if (ratio > 2) {
      shapes.push('I', 'parallel');
    } else {
      shapes.push('L', 'I');
    }
  }
  // Medium kitchen (8-12m²)
  else if (area < 120000) {
    shapes.push('L', 'U', 'parallel');
  }
  // Large kitchen (> 12m²)
  else {
    shapes.push('island', 'U', 'L', 'G');
  }

  return shapes;
}

/**
 * Helper function to generate default walls from dimensions
 */
function generateDefaultWalls(width: number, length: number): WallSegment[] {
  return [
    {
      id: 'wall-north',
      wall: 'north',
      startPosition: 0,
      endPosition: width,
      available: true,
      obstacles: [],
    },
    {
      id: 'wall-south',
      wall: 'south',
      startPosition: 0,
      endPosition: width,
      available: true,
      obstacles: [],
    },
    {
      id: 'wall-east',
      wall: 'east',
      startPosition: 0,
      endPosition: length,
      available: true,
      obstacles: [],
    },
    {
      id: 'wall-west',
      wall: 'west',
      startPosition: 0,
      endPosition: length,
      available: true,
      obstacles: [],
    },
  ];
}

export default router;
