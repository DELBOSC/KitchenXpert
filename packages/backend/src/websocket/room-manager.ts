/**
 * Collaboration Room Manager
 * Manages Yjs documents, rooms, and message broadcasting.
 *
 * `yjs` is published as pure ESM. Under TS `module: Node16` we can't
 * `require()` it from this CommonJS source file, so we load it
 * dynamically via `import('yjs')` and cache the result. The type-only
 * import below is erased at compile time — the resolution-mode attribute
 * tells the compiler to look up the ESM types instead of CJS.
 */

import logger from '../utils/logger';

import type { AuthenticatedSocket } from './server';
import type { CollaborationUser, CursorPosition, WSMessage } from '@kitchenxpert/common';
import type * as YType from 'yjs' with { 'resolution-mode': 'import' };

let yjsModule: typeof YType | null = null;
async function loadYjs(): Promise<typeof YType> {
  if (!yjsModule) {yjsModule = await import('yjs');}
  return yjsModule;
}

const USER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

interface CollaborationRoom {
  kitchenId: string;
  doc: YType.Doc;
  clients: Map<string, AuthenticatedSocket>;
  users: Map<string, CollaborationUser>;
  cursors: Map<string, CursorPosition>;
  lastActivity: number;
}

export class CollaborationRoomManager {
  private rooms: Map<string, CollaborationRoom> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    // Cleanup inactive rooms every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveRooms();
    }, 5 * 60 * 1000);
  }

  async joinRoom(socket: AuthenticatedSocket): Promise<void> {
    const { kitchenId, userId, email } = socket;
    const Y = await loadYjs();

    let room = this.rooms.get(kitchenId);
    if (!room) {
      room = this.createRoom(kitchenId, Y);
    }

    // Add client
    room.clients.set(userId, socket);
    room.lastActivity = Date.now();

    // Create user entry
    const colorIndex = room.users.size % USER_COLORS.length;
    const user: CollaborationUser = {
      userId,
      email,
      displayName: email.split('@')[0] || 'User',
      color: USER_COLORS[colorIndex]!,
      joinedAt: new Date().toISOString(),
    };
    room.users.set(userId, user);

    // Send current document state to new client
    const stateVector = Y.encodeStateAsUpdate(room.doc);
    this.sendToSocket(socket, {
      type: 'full-state',
      kitchenId,
      userId: 'server',
      payload: { state: Buffer.from(stateVector).toString('base64') },
      timestamp: Date.now(),
    });

    // Broadcast presence to all
    this.broadcastPresence(room);

    logger.info('[Room] User joined', { kitchenId, userId, totalUsers: room.users.size });
  }

  leaveRoom(socket: AuthenticatedSocket): void {
    const { kitchenId, userId } = socket;
    const room = this.rooms.get(kitchenId);
    if (!room) {return;}

    room.clients.delete(userId);
    room.users.delete(userId);
    room.cursors.delete(userId);

    // Broadcast updated presence
    this.broadcastPresence(room);

    // Cleanup empty rooms
    if (room.clients.size === 0) {
      this.destroyRoom(kitchenId);
    }

    logger.info('[Room] User left', { kitchenId, userId, remainingUsers: room.users.size });
  }

  async handleMessage(socket: AuthenticatedSocket, message: WSMessage): Promise<void> {
    const room = this.rooms.get(socket.kitchenId);
    if (!room) {return;}

    room.lastActivity = Date.now();

    switch (message.type) {
      case 'doc-update':
        await this.handleDocUpdate(room, socket, message);
        break;
      case 'cursor-update':
        this.handleCursorUpdate(room, socket, message);
        break;
      case 'request-state':
        await this.handleRequestState(room, socket);
        break;
      default:
        logger.warn('[Room] Unknown message type', { type: message.type, userId: socket.userId });
    }
  }

  dispose(): void {
    clearInterval(this.cleanupInterval);
    for (const [id] of this.rooms) {
      this.destroyRoom(id);
    }
  }

  // --- Internals ---

  private createRoom(kitchenId: string, Y: typeof YType): CollaborationRoom {
    const doc = new Y.Doc();

    // Initialize shared types
    doc.getMap('metadata');
    doc.getMap('sceneObjects');
    doc.getArray('technicalPoints');
    doc.getMap('cursors');

    const room: CollaborationRoom = {
      kitchenId,
      doc,
      clients: new Map(),
      users: new Map(),
      cursors: new Map(),
      lastActivity: Date.now(),
    };

    this.rooms.set(kitchenId, room);
    logger.info('[Room] Created', { kitchenId });

    return room;
  }

  private destroyRoom(kitchenId: string): void {
    const room = this.rooms.get(kitchenId);
    if (!room) {return;}

    room.doc.destroy();
    room.clients.clear();
    room.users.clear();
    room.cursors.clear();
    this.rooms.delete(kitchenId);

    logger.info('[Room] Destroyed', { kitchenId });
  }

  private async handleDocUpdate(room: CollaborationRoom, socket: AuthenticatedSocket, message: WSMessage): Promise<void> {
    const payload = message.payload as { update: string };
    if (!payload?.update) {return;}

    try {
      const Y = await loadYjs();
      const update = Buffer.from(payload.update, 'base64');
      Y.applyUpdate(room.doc, new Uint8Array(update));

      // Broadcast update to all other clients
      this.broadcastToOthers(room, socket.userId, {
        type: 'doc-update',
        kitchenId: room.kitchenId,
        userId: socket.userId,
        payload: { update: payload.update },
        timestamp: Date.now(),
      });
    } catch (err) {
      logger.warn('[Room] Failed to apply doc update', { error: err, userId: socket.userId });
    }
  }

  private handleCursorUpdate(room: CollaborationRoom, socket: AuthenticatedSocket, message: WSMessage): void {
    const cursor = message.payload as CursorPosition;
    if (!cursor) {return;}

    cursor.userId = socket.userId;
    cursor.timestamp = Date.now();
    room.cursors.set(socket.userId, cursor);

    // Broadcast cursor to all other clients
    this.broadcastToOthers(room, socket.userId, {
      type: 'cursor-update',
      kitchenId: room.kitchenId,
      userId: socket.userId,
      payload: cursor,
      timestamp: Date.now(),
    });
  }

  private async handleRequestState(room: CollaborationRoom, socket: AuthenticatedSocket): Promise<void> {
    const Y = await loadYjs();
    const stateVector = Y.encodeStateAsUpdate(room.doc);
    this.sendToSocket(socket, {
      type: 'full-state',
      kitchenId: room.kitchenId,
      userId: 'server',
      payload: { state: Buffer.from(stateVector).toString('base64') },
      timestamp: Date.now(),
    });
  }

  private broadcastPresence(room: CollaborationRoom): void {
    const users = Array.from(room.users.values());
    const message: WSMessage = {
      type: 'presence-update',
      kitchenId: room.kitchenId,
      userId: 'server',
      payload: { users },
      timestamp: Date.now(),
    };

    for (const [, client] of room.clients) {
      this.sendToSocket(client, message);
    }
  }

  private broadcastToOthers(room: CollaborationRoom, excludeUserId: string, message: WSMessage): void {
    for (const [userId, client] of room.clients) {
      if (userId !== excludeUserId) {
        this.sendToSocket(client, message);
      }
    }
  }

  private sendToSocket(socket: AuthenticatedSocket, message: WSMessage): void {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  private cleanupInactiveRooms(): void {
    const now = Date.now();
    const INACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

    for (const [kitchenId, room] of this.rooms) {
      if (room.clients.size === 0 && now - room.lastActivity > INACTIVE_THRESHOLD) {
        this.destroyRoom(kitchenId);
      }
    }
  }
}
