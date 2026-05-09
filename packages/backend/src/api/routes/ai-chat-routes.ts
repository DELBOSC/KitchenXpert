import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { z } from 'zod';

import { prisma } from '../../database/client';
import { StyleTransferService } from '../../services/ai/style-transfer.service';
import { ToolUse3DService } from '../../services/ai/tool-use-3d.service';
import logger from '../../utils/logger';
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

const styleTransferSchema = z.object({
  image: z.string().optional(),
  imageUrl: z.string().url().optional(),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
}).refine(
  (data) => data.image || data.imageUrl,
  { message: 'image (base64) or imageUrl is required' }
);

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
router.post('/stream', authenticate, aiRateLimiter, validateBody(chatMessageSchema), aiChatController.streamChat);

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
router.post('/message', authenticate, aiRateLimiter, validateBody(chatMessageSchema), aiChatController.sendMessage);

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
router.post('/sessions', authenticate, validateBody(createSessionSchema), aiChatController.createSession);

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
router.get('/sessions/:id', authenticate, asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
}));
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
router.put('/sessions/:id', authenticate, validateBody(updateSessionSchema), aiChatController.updateSession);

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
router.delete('/sessions/:id', authenticate, asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
}));

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
router.post('/tool-use', authenticate, aiRateLimiter, validateBody(toolUseSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
}));

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
router.post('/execute-tool', authenticate, aiRateLimiter, validateBody(executeToolSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
    sceneContext: parameters?.sceneContext || { items: [], roomDimensions: { width: 400, depth: 300, height: 250 }, scores: {} },
    userId,
  });

  res.status(200).json({ success: true, data: result });
}));

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
router.post('/style-transfer', authenticate, aiRateLimiter, validateBody(styleTransferSchema), asyncHandler(async (req: Request, res: Response): Promise<void> => {
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
    // Fetch image from URL and convert to base64
    const response = await fetch(imageUrl);
    if (!response.ok) {
      res.status(400).json({ success: false, error: 'Failed to fetch image from URL' });
      return;
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    if (contentType.includes('png')) {resolvedMediaType = 'image/png';}
    else if (contentType.includes('webp')) {resolvedMediaType = 'image/webp';}
    const buffer = Buffer.from(await response.arrayBuffer());
    imageBase64 = buffer.toString('base64');
  }

  logger.info('[AI:style-transfer] Analyzing photo', { userId, hasUrl: !!imageUrl });

  const styleData = await styleTransferService.analyzeKitchenPhoto(imageBase64, resolvedMediaType, userId);

  res.status(200).json({ success: true, data: styleData });
}));

export default router;
