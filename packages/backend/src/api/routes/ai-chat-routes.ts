import Anthropic from '@anthropic-ai/sdk';
import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { z } from 'zod';

import { prisma } from '../../database/client';
import {
  AssistantRequestSchema,
  CONTEXT_REGISTRY,
  isAnchored,
  verifyDesignerPayload,
  type AssistantRequest,
  type VerifiedKitchenContext,
} from '../../services/ai/assistant-context';
import { BOMGeneratorService } from '../../services/ai/bom-generator.service';
import { searchProductsStructured } from '../../services/ai/catalog-search.service';
import {
  assertQuota,
  quotaState,
  recordUsage,
  QuotaExceededError,
  DailyQuotaExceededError,
  type AiTier,
  type QuotaState,
} from '../../services/ai/cost-monitor.service';
import { SHOPPING_CHAT_SYSTEM_PROMPT, SHOPPING_CHAT_TOOLS } from '../../services/ai/prompts';
import { ChatRequestSchema } from '../../services/ai/schemas';
import { StyleTransferService } from '../../services/ai/style-transfer.service';
import { ToolUse3DService } from '../../services/ai/tool-use-3d.service';
import { variantResolver } from '../../services/variant-resolver';
import logger from '../../utils/logger';
import { fetchImageSafely, SsrfBlockedError } from '../../utils/safe-fetch';
import { aiChatController } from '../controllers/ai-chat-controller';
import { authenticate } from '../middleware/auth-middleware';
import { asyncHandler } from '../middleware/error-middleware';
import { aiRateLimiter } from '../middleware/rate-limit-middleware';
import { validateBody } from '../middleware/validation-middleware';

const router: RouterType = Router();

const styleTransferService = new StyleTransferService();

// --- Zod Schemas ---

const chatMessageSchema = z.object({
  message: z.string().min(1, 'message is required'),
  sceneContext: z.object({}).passthrough(),
  conversationHistory: z.array(z.object({}).passthrough()).optional(),
});

const createSessionSchema = z.object({
  title: z.string().optional(),
  kitchenId: z.string().uuid().optional().nullable(),
  sceneContext: z.object({}).passthrough().optional(),
});

const updateSessionSchema = z.object({
  messages: z.array(z.object({}).passthrough()).optional(),
  title: z.string().optional(),
  sceneContext: z.object({}).passthrough().optional(),
});

const toolUseSchema = z.object({
  message: z.string().min(1, 'message is required'),
  sceneContext: z.object({}).passthrough(),
  conversationHistory: z.array(z.object({}).passthrough()).optional(),
});

const executeToolSchema = z.object({
  toolName: z.string().min(1, 'toolName is required'),
  parameters: z.object({}).passthrough().optional(),
});

const styleTransferSchema = z
  .object({
    image: z.string().optional(),
    imageUrl: z.string().url().optional(),
    mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
  })
  .refine((data) => data.image || data.imageUrl, {
    message: 'image (base64) or imageUrl is required',
  });

// Streaming & messaging

/**
 * @swagger
 * /api/v1/ai-chat/stream:
 *   post:
 *     summary: Stream a chat response from AI
 *     tags: [AI Chat]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Streamed AI response
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/stream',
  authenticate,
  aiRateLimiter,
  validateBody(chatMessageSchema),
  aiChatController.streamChat
);

/**
 * @swagger
 * /api/v1/ai-chat/message:
 *   post:
 *     summary: Send a message and get AI response
 *     tags: [AI Chat]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: AI response
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/message',
  authenticate,
  aiRateLimiter,
  validateBody(chatMessageSchema),
  aiChatController.sendMessage
);

// Chat history

/**
 * @swagger
 * /api/v1/ai-chat/history/{sessionId}:
 *   get:
 *     summary: Get chat history for a session
 *     tags: [AI Chat]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat history
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Session not found
 */
router.get('/history/:sessionId', authenticate, aiChatController.getHistory);

// Session management

/**
 * @swagger
 * /api/v1/ai-chat/sessions:
 *   post:
 *     summary: Create a new AI chat session
 *     tags: [AI Chat]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Session created
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/sessions',
  authenticate,
  validateBody(createSessionSchema),
  aiChatController.createSession
);

/**
 * @swagger
 * /api/v1/ai-chat/sessions:
 *   get:
 *     summary: List all AI chat sessions
 *     tags: [AI Chat]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of sessions
 *       401:
 *         description: Unauthorized
 */
router.get('/sessions', authenticate, aiChatController.listSessions);

/**
 * @swagger
 * /api/v1/ai-chat/sessions/{id}:
 *   get:
 *     summary: Get a specific AI chat session
 *     tags: [AI Chat]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Session not found
 */
router.get(
  '/sessions/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: 'Session ID is required' });
      return;
    }

    const session = await prisma.aIChatSession.findUnique({ where: { id } });
    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    if (session.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    res.status(200).json({ success: true, data: session });
  })
);
/**
 * @swagger
 * /api/v1/ai-chat/sessions/{id}:
 *   put:
 *     summary: Update an AI chat session
 *     tags: [AI Chat]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Session not found
 */
router.put(
  '/sessions/:id',
  authenticate,
  validateBody(updateSessionSchema),
  aiChatController.updateSession
);

/**
 * @swagger
 * /api/v1/ai-chat/sessions/{id}:
 *   delete:
 *     summary: Delete an AI chat session
 *     tags: [AI Chat]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Session not found
 */
router.delete(
  '/sessions/:id',
  authenticate,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: 'Session ID is required' });
      return;
    }

    const session = await prisma.aIChatSession.findUnique({ where: { id } });
    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    if (session.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    await prisma.aIChatSession.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Session deleted' });
  })
);

/**
 * @swagger
 * /api/v1/ai-chat/tool-use:
 *   post:
 *     summary: Process a natural language message and return structured 3D tool calls
 *     tags: [AI Chat]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message, sceneContext]
 *             properties:
 *               message:
 *                 type: string
 *                 description: Natural language user command (e.g. "Ajoute un ilot central de 1m20")
 *               sceneContext:
 *                 type: object
 *                 description: Current 3D scene state (items, room dimensions, scores, style)
 *                 properties:
 *                   roomWidth:
 *                     type: number
 *                   roomDepth:
 *                     type: number
 *                   roomHeight:
 *                     type: number
 *                   items:
 *                     type: array
 *                     items:
 *                       type: object
 *                   scores:
 *                     type: object
 *                   style:
 *                     type: string
 *               conversationHistory:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: AI text response with structured tool calls
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     toolCalls:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           params:
 *                             type: object
 *       400:
 *         description: Missing message or sceneContext
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/tool-use',
  authenticate,
  aiRateLimiter,
  validateBody(toolUseSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { message, sceneContext, conversationHistory } = req.body;
    if (!message || !sceneContext) {
      res.status(400).json({ success: false, error: 'message and sceneContext are required' });
      return;
    }

    logger.info('[AI:tool-use-3d] Tool use request', { userId, messageLength: message.length });

    const toolUseService = new ToolUse3DService();
    const result = await toolUseService.processMessage({
      message,
      sceneContext,
      conversationHistory: conversationHistory || [],
      userId,
    });

    res.status(200).json({ success: true, data: result });
  })
);

/**
 * @swagger
 * /api/v1/ai-chat/execute-tool:
 *   post:
 *     summary: Execute an AI tool
 *     tags: [AI Chat]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [toolName]
 *             properties:
 *               toolName:
 *                 type: string
 *               parameters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Tool execution result
 *       400:
 *         description: Missing toolName
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/execute-tool',
  authenticate,
  aiRateLimiter,
  validateBody(executeToolSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { toolName, parameters } = req.body;
    if (!toolName) {
      res.status(400).json({ success: false, error: 'toolName is required' });
      return;
    }

    logger.info('[AI:chat] Execute tool request', { userId, toolName });

    // Delegate to the tool-use 3D service
    const { ToolUse3DService } = await import('../../services/ai/tool-use-3d.service.js');
    const toolService = new ToolUse3DService();
    const result = await toolService.processMessage({
      message: `Execute tool: ${toolName}`,
      sceneContext: parameters?.sceneContext || {
        items: [],
        roomDimensions: { width: 400, depth: 300, height: 250 },
        scores: {},
      },
      userId,
    });

    res.status(200).json({ success: true, data: result });
  })
);

/**
 * @swagger
 * /api/v1/ai-chat/style-transfer:
 *   post:
 *     summary: Analyze kitchen photo for style transfer
 *     tags: [AI Chat]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 description: Base64-encoded image
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to fetch image from
 *               mediaType:
 *                 type: string
 *                 enum: [image/jpeg, image/png, image/webp]
 *     responses:
 *       200:
 *         description: Style analysis result
 *       400:
 *         description: Missing image or imageUrl
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/style-transfer',
  authenticate,
  aiRateLimiter,
  validateBody(styleTransferSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { image, imageUrl, mediaType } = req.body;
    if (!image && !imageUrl) {
      res.status(400).json({ success: false, error: 'image (base64) or imageUrl is required' });
      return;
    }

    let imageBase64: string;
    let resolvedMediaType: 'image/jpeg' | 'image/png' | 'image/webp' = mediaType || 'image/jpeg';

    if (image) {
      imageBase64 = image;
    } else {
      // Fetch image from URL — through the SSRF guard, NOT a bare fetch(). The URL is
      // client-supplied and z.string().url() validates syntax only; fetchImageSafely
      // resolves + pins the IP, refuses private/metadata ranges, non-HTTPS, and
      // redirects into internal space. See utils/safe-fetch (CodeQL js/request-forgery).
      let img: { buffer: Buffer; contentType: string };
      try {
        img = await fetchImageSafely(imageUrl);
      } catch (err) {
        if (err instanceof SsrfBlockedError) {
          logger.warn('[AI:style-transfer] blocked image URL', { userId, reason: err.message });
        }
        res.status(400).json({ success: false, error: 'Failed to fetch image from URL' });
        return;
      }
      if (img.contentType.includes('png')) {
        resolvedMediaType = 'image/png';
      } else if (img.contentType.includes('webp')) {
        resolvedMediaType = 'image/webp';
      }
      imageBase64 = img.buffer.toString('base64');
    }

    logger.info('[AI:style-transfer] Analyzing photo', { userId, hasUrl: !!imageUrl });

    const styleData = await styleTransferService.analyzeKitchenPhoto(
      imageBase64,
      resolvedMediaType,
      userId
    );

    res.status(200).json({ success: true, data: styleData });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// SHOPPING CHAT (Claude native tool-use loop)
// ───────────────────────────────────────────────────────────────────────────
// New surface introduced with the AI features mission. Uses Anthropic's
// native tool_use blocks instead of the legacy ToolUse3DService — the
// 4 tools defined in `prompts.ts` are exposed to Claude, which decides
// when to call them.
//
// The 4 tool implementations are stubs for now (search, swap, add,
// budget). Replace each `executeTool()` branch with the real service
// call when ready ; the loop logic doesn't change.
// ═══════════════════════════════════════════════════════════════════════════

const SHOPPING_MODEL = 'claude-sonnet-4-6';
const SHOPPING_MAX_TOKENS = 1024;
const SHOPPING_MAX_TOOL_ROUNDS = 4; // guard against runaway tool loops
const SHOPPING_PROJECTED_USD = 0.02;
/** Tool contract says "up to 5 best matches" — keep the payload small for Claude. */
const SEARCH_CATALOG_MAX_RESULTS = 5;

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY

function deriveAiTier(req: Request): AiTier {
  const role = req.user?.role;
  if (role === 'admin') {
    return 'studio';
  }
  const subTier = (req.user as unknown as { subscriptionTier?: string })?.subscriptionTier;
  if (subTier === 'studio') {
    return 'studio';
  }
  if (subTier === 'premium') {
    return 'premium';
  }
  return 'free';
}

/**
 * Execute one of the 4 shopping-chat tools. Each branch is a stub
 * (returns realistic JSON) — wire each one to its real service when
 * the catalog + designer mutation APIs are ready.
 */
/**
 * Structural context for a tool call. Accepts BOTH the legacy /shopping
 * kitchenContext (client-supplied) and the /assistant VerifiedKitchenContext
 * (server-re-priced from the DB).
 */
export interface ShoppingToolCtx {
  userId: string;
  /**
   * Set by the SERVER after an ownership check (verifyDesignerPayload). get_quote
   * reads the kitchen from here — the tool takes no argument, so the model has no
   * way to name a different one. Absent = no saved kitchen in scope.
   */
  verifiedKitchenId?: string;
  kitchenContext?: {
    items: Array<{ sku: string; unitPriceEur: number }>;
    budgetTotalEur?: number;
    budgetLimitEur?: number;
  };
  /**
   * Tool allowlist for the current assistant context. `undefined` = no restriction
   * (legacy /shopping, which exposes the full set). An empty/omitting list is the
   * architectural guardrail: a context with no tool has no fact source.
   */
  allowedTools?: readonly string[];
}

export async function executeShoppingTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ShoppingToolCtx
): Promise<unknown> {
  // Defence in depth. The Anthropic call already OMITS the tools a context is not
  // allowed to use, so Claude cannot even emit this block — which is precisely why
  // it must also be refused here: the guardrail must not depend on one layer.
  if (ctx.allowedTools && !ctx.allowedTools.includes(name)) {
    logger.warn('assistant: tool refused — not allowed in this context', {
      tool: name,
      allowed: ctx.allowedTools,
    });
    return { error: `tool ${name} is not available in this context` };
  }

  switch (name) {
    case 'searchCatalog': {
      // Deterministic catalog lookup — the ONLY product/price fact source the
      // assistant has (with resolve_colors). Same Prisma WHERE as the public
      // GET /catalog/products/search path, minus the LLM filter-extraction:
      // Claude already hands us the filters structured in the tool input, so a
      // second LLM pass would pay twice for the same thing.
      //
      // Rate limiting: this in-process call does not traverse the HTTP
      // searchRateLimiter (30/min). It doesn't need to — the AI path is far
      // stricter: authenticate + aiRateLimiter (20/HOUR) + the per-tier AI
      // quota + SHOPPING_MAX_TOOL_ROUNDS. No bypass, a tighter gate.
      const query = typeof input.query === 'string' ? input.query.trim() : '';
      if (!query) {
        return { count: 0, results: [], note: 'query is required' };
      }
      const f = (input.filters ?? {}) as Record<string, unknown>;
      try {
        const rows = await searchProductsStructured(
          {
            query,
            // The tool's English enum (cabinet/appliance/worktop…) is bridged to
            // the real FR category slugs by catalog-type-mapping.
            ...(typeof f.category === 'string' ? { type: f.category } : {}),
            ...(typeof f.brand === 'string' ? { brand: f.brand } : {}),
            ...(typeof f.maxPriceEur === 'number' ? { maxPrice: f.maxPriceEur } : {}),
          },
          SEARCH_CATALOG_MAX_RESULTS
        );
        // Only real, verifiable fields. An empty list stays empty — the system
        // prompt forbids inventing a product when nothing is found.
        return {
          count: rows.length,
          results: rows.map((p) => ({
            sku: p.sku,
            name: p.name,
            brand: p.brand,
            priceEur: Number(p.price),
            category: p.category?.name ?? null,
          })),
        };
      } catch (err) {
        // Graceful degradation (same contract as resolve_colors): a DB hiccup
        // must not 500 the chat turn — Claude gets a readable error instead.
        logger.error('shopping-chat: searchCatalog failed', { err, query });
        return { error: 'catalog search failed' };
      }
    }

    case 'swapItem':
      // TODO: call the kitchen-item swap use case ; here we just echo back.
      return {
        success: true,
        echoed: input,
        note: 'Swap stub — wire to kitchenItemRepository.replace().',
      };

    case 'addItem':
      return {
        success: true,
        echoed: input,
        note: 'Add stub — wire to kitchenItemRepository.create().',
      };

    case 'get_quote': {
      // The kitchen comes from the ctx (server-verified), NEVER from `input`.
      if (!ctx.verifiedKitchenId) {
        return { error: 'no saved kitchen in scope — the quote needs a saved kitchen' };
      }
      try {
        const bom = await BOMGeneratorService.getInstance().generateBOM(ctx.verifiedKitchenId);
        return {
          // The firm/estimated split (#203) is surfaced AS-IS. A total that hides
          // what is estimated would be a right number presented dishonestly.
          currency: 'EUR',
          subtotalCatalogEur: bom.subtotalCatalog,
          subtotalEstimatedEur: bom.subtotalEstimated,
          taxEur: bom.tax,
          totalEur: bom.total,
          lines: bom.items.map((i) => ({
            source: i.source, // 'catalog' = firm | 'estimated' = scale-based
            catalogRef: i.catalogRef,
            name: i.name,
            category: i.category,
            quantity: i.quantity,
            unitPriceEur: i.unitPrice,
            totalEur: i.totalPrice,
          })),
        };
      } catch (e) {
        logger.error('assistant: get_quote failed', { err: String(e) });
        return { error: 'quote unavailable' };
      }
    }

    case 'getBudgetSummary': {
      const k = ctx.kitchenContext;
      if (!k) {
        return { error: 'no kitchen context provided' };
      }
      const total = k.budgetTotalEur ?? k.items.reduce((s, it) => s + it.unitPriceEur, 0);
      const budget = k.budgetLimitEur ?? null;
      return {
        totalEur: Math.round(total),
        budgetEur: budget,
        gapEur: budget ? Math.round(budget - total) : null,
        items: k.items.length,
      };
    }

    case 'resolve_colors': {
      const sku = typeof input.sku === 'string' ? input.sku.trim() : '';
      if (!sku) {
        return { error: 'sku is required' };
      }
      try {
        const colors = await variantResolver.resolveColors(sku);
        return { sku, colors }; // colors: ColorOption[] (may be empty)
      } catch (err) {
        // Graceful degradation: a DB hiccup must not 500 the whole chat turn —
        // Claude gets a readable error instead and can respond accordingly.
        logger.error('shopping-chat: resolve_colors failed', { err, sku });
        return { error: 'color lookup failed' };
      }
    }

    default:
      logger.warn('shopping-chat: unknown tool requested', { name });
      return { error: `unknown tool ${name}` };
  }
}

interface AssistantTurn {
  reply: string;
  toolCalls: Array<{ name: string; input: unknown; output: unknown }>;
  toolRounds: number;
}

/**
 * One assistant turn: initial Anthropic call + bounded tool-use loop + usage
 * accounting. Shared by /shopping (legacy, full tool-set) and /assistant (context
 * router) so there is ONE loop, not two that drift.
 *
 * `tools` is ALREADY filtered by the caller. When it is EMPTY the `tools` param is
 * omitted entirely: the model is handed no tool at all, so it has no fact source
 * and CANNOT cite a product, a SKU or a price. That is the whole guardrail —
 * structural, not rhetorical.
 */
async function runAssistantTurn(params: {
  userId: string;
  systemPrompt: string;
  /**
   * TYPED, not `unknown[]`: this is the param the whole anchoring rests on, so the
   * compiler must shout on our behalf if the Tool contract ever breaks.
   */
  tools: readonly Anthropic.Tool[];
  firstMessage: string;
  toolCtx: ShoppingToolCtx;
}): Promise<AssistantTurn> {
  const { userId, systemPrompt, tools, firstMessage, toolCtx } = params;

  const start = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: firstMessage }];
  const toolCallsLog: AssistantTurn['toolCalls'] = [];

  const call = (): Promise<Anthropic.Message> =>
    anthropic.messages.create({
      model: SHOPPING_MODEL,
      max_tokens: SHOPPING_MAX_TOKENS,
      system: systemPrompt,
      ...(tools.length > 0 ? { tools: [...tools] } : {}),
      messages,
    });

  let response = await call();
  totalInputTokens += response.usage.input_tokens;
  totalOutputTokens += response.usage.output_tokens;

  let rounds = 0;
  while (response.stop_reason === 'tool_use' && rounds < SHOPPING_MAX_TOOL_ROUNDS) {
    rounds++;
    const toolBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    // Run all tools in parallel — they're independent reads/writes.
    const results = await Promise.all(
      toolBlocks.map(async (block) => {
        const output = await executeShoppingTool(
          block.name,
          block.input as Record<string, unknown>,
          toolCtx
        );
        toolCallsLog.push({ name: block.name, input: block.input, output });
        return {
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: JSON.stringify(output),
        };
      })
    );

    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: results });

    response = await call();
    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;
  }

  if (rounds >= SHOPPING_MAX_TOOL_ROUNDS && response.stop_reason === 'tool_use') {
    logger.warn('assistant: hit tool-use round cap', { userId, rounds });
  }

  const durationMs = Date.now() - start;
  const reply = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  await recordUsage({
    userId,
    service: 'chat',
    model: SHOPPING_MODEL,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    durationMs,
    metadata: { toolRounds: rounds, toolsCalled: toolCallsLog.map((t) => t.name) },
  });

  return { reply, toolCalls: toolCallsLog, toolRounds: rounds };
}

/**
 * POST /api/v1/ai-chat/shopping
 *
 * Body:
 *   - message: string
 *   - conversationId?: string (UUID, used to load history from DB later)
 *   - kitchenContext?: { layout, items[], budgetTotalEur, budgetLimitEur? }
 *
 * Response:
 *   { reply: string, toolCalls: Array<{name, input, output}> }
 */
router.post(
  '/shopping',
  authenticate,
  aiRateLimiter,
  validateBody(ChatRequestSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const body = req.body as z.infer<typeof ChatRequestSchema>;
    const tier = deriveAiTier(req);

    // Quota pre-check (cheap — single SUM query against AIUsageLog)
    try {
      await assertQuota({ userId, tier, projectedUsd: SHOPPING_PROJECTED_USD });
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        res.status(402).json({
          success: false,
          error: {
            code: 'AI_QUOTA_EXCEEDED',
            message: e.message,
            tier: e.tier,
            limit: e.limit,
            currentUsd: e.currentUsd,
            resetAt: e.resetAt,
          },
        });
        return;
      }
      if (e instanceof DailyQuotaExceededError) {
        res.status(429).json({
          success: false,
          error: {
            code: 'AI_DAILY_LIMIT',
            message: e.message,
            tier: e.tier,
            limit: e.limit,
            current: e.current,
          },
        });
        return;
      }
      throw e;
    }

    const turn = await runAssistantTurn({
      userId,
      systemPrompt: SHOPPING_CHAT_SYSTEM_PROMPT,
      tools: SHOPPING_CHAT_TOOLS,
      firstMessage: body.kitchenContext
        ? `<kitchen_snapshot>${JSON.stringify(body.kitchenContext)}</kitchen_snapshot>\n\n${body.message}`
        : body.message,
      // No allowlist → the legacy surface keeps its full tool-set, unchanged.
      toolCtx: { userId, kitchenContext: body.kitchenContext },
    });

    res.status(200).json({
      success: true,
      data: { reply: turn.reply, toolCalls: turn.toolCalls, toolRounds: turn.toolRounds },
    });
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// ASSISTANT — context router (Palier 1)
// ───────────────────────────────────────────────────────────────────────────
// The anti-hallucination stops being a prompt rule and becomes a property of the
// system: the SERVER picks the tool-set for the context. No tool ⇒ no fact source
// ⇒ nothing citable. See services/ai/assistant-context.ts.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/ai-chat/assistant
 *
 * Body: { message, conversationId?, context: 'designer'|'catalog'|'quote'|…, payload? }
 * Response: { reply, toolCalls[], toolRounds, context, anchored, toolsAvailable }
 */
router.post(
  '/assistant',
  authenticate,
  aiRateLimiter,
  validateBody(AssistantRequestSchema),
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const body = req.body as AssistantRequest;
    const spec = CONTEXT_REGISTRY[body.context];

    // The context comes from the CLIENT → never trusted. Its payload is validated
    // against THIS context's schema. A malformed anchored payload is a hard 400: it
    // must not silently degrade into "no data" (that would hide a client bug), and
    // it must certainly not unlock tools it cannot feed.
    const parsed = spec.payloadSchema.safeParse(body.payload);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ASSISTANT_BAD_PAYLOAD',
          message: `Invalid payload for context "${body.context}"`,
          issues: parsed.error.issues.slice(0, 5),
        },
      });
      return;
    }

    const tier = deriveAiTier(req);
    // assertQuota already returns the usage summary — we used to throw it away.
    // The surface needs it: it announces the rule ONCE and warns near the end,
    // so it must know how many exchanges are left, in exchanges.
    let quota: QuotaState;
    try {
      const usage = await assertQuota({ userId, tier, projectedUsd: SHOPPING_PROJECTED_USD });
      quota = quotaState(tier, usage, SHOPPING_PROJECTED_USD);
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        res.status(402).json({
          success: false,
          error: {
            code: 'AI_QUOTA_EXCEEDED',
            message: e.message,
            tier: e.tier,
            limit: e.limit,
            currentUsd: e.currentUsd,
            resetAt: e.resetAt,
          },
        });
        return;
      }
      if (e instanceof DailyQuotaExceededError) {
        res.status(429).json({
          success: false,
          error: {
            code: 'AI_DAILY_LIMIT',
            message: e.message,
            tier: e.tier,
            limit: e.limit,
            current: e.current,
          },
        });
        return;
      }
      throw e;
    }

    // Server-side VERIFICATION: the designer snapshot is re-priced from the DB and
    // unknown SKUs are dropped. A forged price never reaches the model — the budget
    // it states is the catalog's, not the client's arithmetic.
    let verified: VerifiedKitchenContext | undefined;
    if (body.context === 'designer') {
      verified = await verifyDesignerPayload(
        parsed.data as Parameters<typeof verifyDesignerPayload>[0],
        userId
      );
      if (verified.unverifiedSkus.length > 0) {
        logger.warn('assistant: designer payload had unverifiable SKUs (dropped)', {
          userId,
          count: verified.unverifiedSkus.length,
        });
      }
    }

    // Only the tools this context is allowed to use are handed to Claude. For an
    // unanchored context this is an EMPTY list → the `tools` param is omitted →
    // the model literally has nowhere to get a fact from.
    const tools = SHOPPING_CHAT_TOOLS.filter((t) => spec.tools.includes(t.name));

    const turn = await runAssistantTurn({
      userId,
      systemPrompt: spec.systemPrompt,
      tools,
      firstMessage: verified
        ? `<kitchen_snapshot_verified>${JSON.stringify(verified)}</kitchen_snapshot_verified>\n\n${body.message}`
        : body.message,
      toolCtx: {
        userId,
        ...(verified ? { kitchenContext: verified } : {}),
        ...(verified?.verifiedKitchenId ? { verifiedKitchenId: verified.verifiedKitchenId } : {}),
        allowedTools: spec.tools, // enforced again in executeShoppingTool
      },
    });

    res.status(200).json({
      success: true,
      data: {
        context: body.context,
        anchored: isAnchored(body.context),
        toolsAvailable: spec.tools,
        reply: turn.reply,
        toolCalls: turn.toolCalls,
        toolRounds: turn.toolRounds,
        // Counted BEFORE this turn — the surface states the rule, it does not
        // have to guess it (and never shows a permanent counter).
        quota,
        ...(verified && verified.unverifiedSkus.length > 0
          ? { unverifiedSkus: verified.unverifiedSkus }
          : {}),
      },
    });
  })
);

export default router;
