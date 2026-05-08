/**
 * Collaboration WebSocket Server
 * Handles real-time collaboration over WebSocket with JWT cookie auth
 */

import { type Server as HTTPServer , type IncomingMessage } from 'http';

import cookie from 'cookie';
import { WebSocketServer, type WebSocket } from 'ws';

import { CollaborationRoomManager } from './room-manager';
import { jwtService } from '../auth/jwt.service';
import { prisma } from '../database/client';
import logger from '../utils/logger';

export interface AuthenticatedSocket extends WebSocket {
  userId: string;
  email: string;
  kitchenId: string;
  isAlive: boolean;
}

export class CollaborationWebSocketServer {
  private wss: WebSocketServer;
  private roomManager: CollaborationRoomManager;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(httpServer: HTTPServer) {
    this.wss = new WebSocketServer({
      server: httpServer,
      path: '/ws/collaboration',
    });

    this.roomManager = new CollaborationRoomManager();

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      // ws.on('connection') signature is sync — `handleConnection` is async
      // because it awaits room manager work. We `void` the promise after
      // attaching an error handler so unhandled rejections still surface.
      void this.handleConnection(ws, req).catch((err: unknown) => {
        logger.error('[WS] handleConnection failed', { err });
      });
    });

    // Heartbeat to detect broken connections
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        const socket = ws as AuthenticatedSocket;
        if (!socket.isAlive) {
          this.roomManager.leaveRoom(socket);
          socket.terminate();
          return;
        }
        socket.isAlive = false;
        socket.ping();
      });
    }, 30000);

    logger.info('[WS] Collaboration WebSocket server started on /ws/collaboration');
  }

  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    const socket = ws as AuthenticatedSocket;

    // Authenticate via cookie
    let userRole: string | undefined;
    try {
      const cookies = cookie.parse(req.headers.cookie || '');
      const accessToken = cookies['accessToken'];

      if (!accessToken) {
        socket.close(4001, 'Authentication required');
        return;
      }

      const payload = jwtService.verifyAccessToken(accessToken);
      socket.userId = payload.userId;
      socket.email = payload.email;
      userRole = payload.role;
    } catch {
      socket.close(4001, 'Invalid token');
      return;
    }

    // Extract kitchenId from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const kitchenId = url.searchParams.get('kitchenId');

    if (!kitchenId) {
      socket.close(4002, 'kitchenId required');
      return;
    }

    // Verify kitchen ownership: user must own the kitchen, be an admin,
    // or be a collaborator on the kitchen's project
    try {
      const kitchen = await prisma.kitchen.findUnique({
        where: { id: kitchenId },
        include: {
          project: {
            include: {
              collaborators: {
                where: { email: socket.email },
              },
            },
          },
        },
      });

      if (!kitchen) {
        socket.close(4003, 'Access denied');
        return;
      }

      const isOwner = kitchen.userId === socket.userId;
      const isAdmin = userRole === 'admin';
      const isCollaborator = kitchen.project.collaborators.length > 0;

      if (!isOwner && !isAdmin && !isCollaborator) {
        logger.warn('[WS] Access denied: user is not owner, admin, or collaborator', {
          userId: socket.userId,
          kitchenId,
        });
        socket.close(4003, 'Access denied');
        return;
      }
    } catch (err) {
      logger.error('[WS] Failed to verify kitchen ownership', {
        userId: socket.userId,
        kitchenId,
        error: err instanceof Error ? err.message : String(err),
      });
      socket.close(4003, 'Access denied');
      return;
    }

    socket.kitchenId = kitchenId;
    socket.isAlive = true;

    socket.on('pong', () => {
      socket.isAlive = true;
    });

    // Join room
    this.roomManager.joinRoom(socket);

    // Handle messages
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.roomManager.handleMessage(socket, message);
      } catch (err) {
        logger.warn('[WS] Invalid message from client', { userId: socket.userId, error: err });
      }
    });

    // Handle disconnect
    socket.on('close', () => {
      this.roomManager.leaveRoom(socket);
    });

    socket.on('error', (err) => {
      logger.warn('[WS] Socket error', { userId: socket.userId, error: err.message });
    });

    logger.info('[WS] Client connected', { userId: socket.userId, kitchenId });
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.roomManager.dispose();
    this.wss.close();
    logger.info('[WS] Collaboration WebSocket server shut down');
  }
}
