import { type Request, type Response } from 'express';

import { prisma } from '../../database/client';
import { AIChatService } from '../../services/ai/chat.service';
import logger from '../../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

const chatService = new AIChatService();

export class AIChatController {
  // POST /ai-chat/stream -- SSE streaming with tool_use support
  streamChat = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Not authenticated' }); return; }

    const { message, sceneContext, conversationHistory } = req.body;
    if (!message || !sceneContext) {
      res.status(400).json({ success: false, error: 'message and sceneContext are required' });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    try {
      const stream = chatService.streamChatWithTools({
        message,
        sceneContext,
        conversationHistory: conversationHistory || [],
        userId,
      });

      for await (const event of stream) {
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
      }
    } catch (error) {
      logger.error('[AI:chat] SSE stream error', { error, userId });
      res.write(`event: error\ndata: "Erreur de streaming"\n\n`);
    }

    res.write('event: close\ndata: "done"\n\n');
    res.end();
  });

  // POST /ai-chat/message -- non-streaming
  sendMessage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Not authenticated' }); return; }

    const { message, sceneContext, conversationHistory } = req.body;
    if (!message || !sceneContext) {
      res.status(400).json({ success: false, error: 'message and sceneContext are required' });
      return;
    }

    const result = await chatService.sendMessage({
      message,
      sceneContext,
      conversationHistory: conversationHistory || [],
      userId,
    });

    res.status(200).json({ success: true, data: result });
  });

  // POST /ai-chat/sessions -- create a new chat session
  createSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Not authenticated' }); return; }

    const { title, kitchenId, sceneContext } = req.body;

    const session = await prisma.aIChatSession.create({
      data: {
        userId,
        kitchenId: kitchenId || null,
        title: title || 'New conversation',
        messages: JSON.parse('[]'),
        sceneContext: sceneContext ? JSON.parse(JSON.stringify(sceneContext)) : undefined,
      },
    });

    res.status(201).json({ success: true, data: session });
  });

  // GET /ai-chat/sessions -- list user's chat sessions
  listSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Not authenticated' }); return; }

    const sessions = await prisma.aIChatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        kitchenId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ success: true, data: sessions });
  });

  // PUT /ai-chat/sessions/:id -- update session messages
  updateSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Not authenticated' }); return; }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ success: false, error: 'Session ID is required' });
      return;
    }

    // Verify ownership
    const existing = await prisma.aIChatSession.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }
    if (existing.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const { messages, title, sceneContext } = req.body;

    const updateData: Record<string, unknown> = {};
    if (messages !== undefined) {updateData.messages = messages;}
    if (title !== undefined) {updateData.title = title;}
    if (sceneContext !== undefined) {updateData.sceneContext = JSON.parse(JSON.stringify(sceneContext));}

    const session = await prisma.aIChatSession.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ success: true, data: session });
  });

  // GET /ai-chat/history/:sessionId -- load chat history from DB
  getHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.userId;
    if (!userId) { res.status(401).json({ success: false, error: 'Not authenticated' }); return; }

    const { sessionId } = req.params;
    if (!sessionId) {
      res.status(400).json({ success: false, error: 'Session ID is required' });
      return;
    }

    const session = await prisma.aIChatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    // Verify ownership
    if (session.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: session.id,
        title: session.title,
        kitchenId: session.kitchenId,
        messages: session.messages,
        sceneContext: session.sceneContext,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
    });
  });
}

export const aiChatController = new AIChatController();
export default aiChatController;
