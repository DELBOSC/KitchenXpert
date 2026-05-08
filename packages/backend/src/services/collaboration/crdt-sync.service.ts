/**
 * CRDT Synchronization Service
 *
 * Manages real-time collaboration for kitchen designs using CRDT (Conflict-free Replicated Data Types).
 *
 * Conflict resolution strategy:
 * - Last-Writer-Wins (LWW) for simple properties (position, rotation, material)
 * - Vector clocks for causal ordering of operations
 * - Tombstone pattern for deletions (mark as deleted, don't remove from state)
 * - On conflict: latest timestamp wins, with userId as lexicographic tiebreaker
 * - Cursor positions are ephemeral (broadcast but not persisted in state)
 *
 * Each collaboration room corresponds to a single kitchen design.
 * Participants join via WebSocket and receive the full state on join,
 * then incremental operations as they occur.
 */

import crypto from 'crypto';

import WebSocket from 'ws';

import { createModuleLogger } from '../../utils/logger';

const logger = createModuleLogger('crdt-sync');

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CRDTOperation {
  /** Unique operation ID. */
  id: string;
  /** ID of the user who performed this operation. */
  userId: string;
  /** Timestamp (ms since epoch) when the operation was created. */
  timestamp: number;
  /** Type of operation. */
  type: 'add_object' | 'remove_object' | 'move_object' | 'modify_object' | 'cursor_move';
  /** Operation-specific payload. */
  data: Record<string, unknown>;
  /** Vector clock for causal ordering. Maps userId -> operation count. */
  vectorClock: Record<string, number>;
}

export interface CRDTObject {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  properties: Record<string, unknown>;
  lastModifiedBy: string;
  lastModifiedAt: number;
  /** Tombstone flag for deletion. Tombstoned objects are hidden but not removed from state. */
  tombstone: boolean;
}

export interface CRDTState {
  objects: Map<string, CRDTObject>;
  version: number;
}

export interface CursorPosition {
  x: number;
  y: number;
  z: number;
  userId: string;
  userName: string;
  color: string;
}

interface Participant {
  userId: string;
  userName: string;
  ws: WebSocket;
  cursor?: CursorPosition;
  lastSeen: Date;
  /** Local vector clock for this participant. */
  vectorClock: Record<string, number>;
}

export interface CollaborationRoom {
  kitchenId: string;
  participants: Map<string, Participant>;
  state: CRDTState;
  operationLog: CRDTOperation[];
  /** Global vector clock for the room. */
  vectorClock: Record<string, number>;
  createdAt: Date;
}

/** Messages sent over the WebSocket. */
export type WSMessage =
  | { type: 'join_ack'; state: SerializedCRDTState; participants: Array<{ userId: string; userName: string; color: string }> }
  | { type: 'participant_joined'; userId: string; userName: string; color: string }
  | { type: 'participant_left'; userId: string }
  | { type: 'operation'; operation: CRDTOperation }
  | { type: 'cursor_update'; cursor: CursorPosition }
  | { type: 'state_sync'; state: SerializedCRDTState }
  | { type: 'error'; message: string };

/** Serializable version of CRDTState (Map -> array of entries). */
interface SerializedCRDTState {
  objects: Array<[string, CRDTObject]>;
  version: number;
}

// ─── Participant Colors ─────────────────────────────────────────────────────

const PARTICIPANT_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
  '#EC4899', '#F97316', '#14B8A6', '#6366F1', '#A855F7',
];

// ─── Service ────────────────────────────────────────────────────────────────

export class CRDTSyncService {
  private rooms: Map<string, CollaborationRoom> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Periodically clean up stale rooms (no participants for 30 minutes)
    this.cleanupInterval = setInterval(() => this.cleanupStaleRooms(), 5 * 60 * 1000);
  }

  /**
   * Join a collaboration room for a kitchen design.
   * Creates the room if it does not exist.
   * Sends the current state to the joining user and notifies existing participants.
   *
   * @param kitchenId - The kitchen design ID
   * @param userId - The user joining
   * @param userName - Display name of the user
   * @param ws - The WebSocket connection for this user
   */
  joinRoom(kitchenId: string, userId: string, userName: string, ws: WebSocket): void {
    let room = this.rooms.get(kitchenId);

    if (!room) {
      room = {
        kitchenId,
        participants: new Map(),
        state: { objects: new Map(), version: 0 },
        operationLog: [],
        vectorClock: {},
        createdAt: new Date(),
      };
      this.rooms.set(kitchenId, room);
      logger.info(`[CRDT] Created collaboration room for kitchen ${kitchenId}`);
    }

    // Assign a color to the participant
    const colorIndex = room.participants.size % PARTICIPANT_COLORS.length;
    const color = PARTICIPANT_COLORS[colorIndex]!;

    const participant: Participant = {
      userId,
      userName,
      ws,
      lastSeen: new Date(),
      vectorClock: { ...room.vectorClock },
    };

    room.participants.set(userId, participant);

    // Initialize vector clock entry for this user if not present
    if (!room.vectorClock[userId]) {
      room.vectorClock[userId] = 0;
    }

    // Send current state to the joining user
    const joinAckMsg: WSMessage = {
      type: 'join_ack',
      state: this.serializeState(room.state),
      participants: Array.from(room.participants.entries()).map(([uid, p]) => ({
        userId: uid,
        userName: p.userName,
        color: uid === userId ? color : PARTICIPANT_COLORS[
          Array.from(room.participants.keys()).indexOf(uid) % PARTICIPANT_COLORS.length
        ]!,
      })),
    };
    this.sendToUser(ws, joinAckMsg);

    // Notify other participants
    this.broadcast(kitchenId, userId, {
      type: 'participant_joined',
      userId,
      userName,
      color,
    });

    logger.info(`[CRDT] User ${userId} joined room ${kitchenId} (${room.participants.size} participants)`);

    // Handle WebSocket close
    ws.on('close', () => {
      this.leaveRoom(kitchenId, userId);
    });

    // Handle incoming messages
    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(kitchenId, userId, message);
      } catch (err) {
        logger.warn(`[CRDT] Failed to parse message from ${userId}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  }

  /**
   * Leave a collaboration room.
   * Removes the participant and notifies others.
   * Cleans up the room if it becomes empty.
   */
  leaveRoom(kitchenId: string, userId: string): void {
    const room = this.rooms.get(kitchenId);
    if (!room) {return;}

    room.participants.delete(userId);

    // Notify remaining participants
    this.broadcast(kitchenId, userId, {
      type: 'participant_left',
      userId,
    });

    logger.info(`[CRDT] User ${userId} left room ${kitchenId} (${room.participants.size} remaining)`);

    // Don't delete empty rooms immediately - they may be rejoined
    // Cleanup is handled by the periodic cleanupStaleRooms
  }

  /**
   * Apply a CRDT operation from a client.
   * Validates the operation, applies it to the shared state, and broadcasts to others.
   *
   * @param kitchenId - Room ID
   * @param userId - User who performed the operation
   * @param operation - The CRDT operation to apply
   */
  applyOperation(kitchenId: string, userId: string, operation: CRDTOperation): void {
    const room = this.rooms.get(kitchenId);
    if (!room) {
      logger.warn(`[CRDT] Attempted operation on non-existent room ${kitchenId}`);
      return;
    }

    // Validate operation ownership
    if (operation.userId !== userId) {
      logger.warn(`[CRDT] User ${userId} sent operation with mismatched userId ${operation.userId}`);
      return;
    }

    // Update vector clock
    room.vectorClock[userId] = (room.vectorClock[userId] || 0) + 1;
    operation.vectorClock = { ...room.vectorClock };

    // Ensure operation has an ID
    if (!operation.id) {
      operation.id = crypto.randomBytes(16).toString('hex');
    }

    // Apply the operation to the shared state
    this.applyToState(room.state, operation);

    // Log the operation
    room.operationLog.push(operation);

    // Trim operation log if it gets too large (keep last 1000)
    if (room.operationLog.length > 1000) {
      room.operationLog = room.operationLog.slice(-500);
    }

    // Increment state version
    room.state.version++;

    // Broadcast to all other participants
    this.broadcast(kitchenId, userId, {
      type: 'operation',
      operation,
    });
  }

  /**
   * Get the current CRDT state for a kitchen design.
   * Used when a new participant joins and needs the full state.
   */
  getState(kitchenId: string): CRDTState | null {
    const room = this.rooms.get(kitchenId);
    return room ? room.state : null;
  }

  /**
   * Get the number of participants in a room.
   */
  getParticipantCount(kitchenId: string): number {
    const room = this.rooms.get(kitchenId);
    return room ? room.participants.size : 0;
  }

  /**
   * Get all active room IDs.
   */
  getActiveRooms(): string[] {
    return Array.from(this.rooms.keys());
  }

  /**
   * Shut down the service, closing all connections and cleaning up.
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    for (const [_kitchenId, room] of this.rooms) {
      for (const [, participant] of room.participants) {
        try {
          participant.ws.close(1001, 'Server shutting down');
        } catch {
          // Ignore close errors
        }
      }
      room.participants.clear();
    }
    this.rooms.clear();
  }

  // ─── Private Methods ──────────────────────────────────────────────────────

  /**
   * Handle incoming WebSocket messages from a participant.
   */
  private handleMessage(kitchenId: string, userId: string, message: Record<string, unknown>): void {
    const room = this.rooms.get(kitchenId);
    if (!room) {return;}

    const participant = room.participants.get(userId);
    if (participant) {
      participant.lastSeen = new Date();
    }

    switch (message.type) {
      case 'operation': {
        const operation = message.operation as CRDTOperation;
        if (operation) {
          this.applyOperation(kitchenId, userId, operation);
        }
        break;
      }

      case 'cursor_move': {
        const cursor = message.cursor as CursorPosition;
        if (cursor && participant) {
          cursor.userId = userId;
          cursor.userName = participant.userName;
          participant.cursor = cursor;

          // Cursor positions are ephemeral - broadcast but don't persist
          this.broadcast(kitchenId, userId, {
            type: 'cursor_update',
            cursor,
          });
        }
        break;
      }

      case 'request_state': {
        // Client requesting a full state sync
        if (participant) {
          this.sendToUser(participant.ws, {
            type: 'state_sync',
            state: this.serializeState(room.state),
          });
        }
        break;
      }

      default:
        logger.warn(`[CRDT] Unknown message type: ${String(message.type)}`);
    }
  }

  /**
   * Apply a CRDT operation to the shared state.
   * Uses Last-Writer-Wins (LWW) for conflict resolution.
   */
  private applyToState(state: CRDTState, operation: CRDTOperation): void {
    switch (operation.type) {
      case 'add_object': {
        const objData = operation.data as {
          id: string;
          objectType: string;
          position: { x: number; y: number; z: number };
          rotation?: { x: number; y: number; z: number };
          properties?: Record<string, unknown>;
        };

        if (!objData.id) {break;}

        const existing = state.objects.get(objData.id);
        if (existing && !existing.tombstone) {
          // Object already exists and is alive - LWW check
          if (operation.timestamp <= existing.lastModifiedAt) {
            // Existing is newer or same timestamp
            if (operation.timestamp === existing.lastModifiedAt && operation.userId > existing.lastModifiedBy) {
              // Same timestamp, userId tiebreaker (lexicographic)
            } else {
              break; // Existing wins
            }
          }
        }

        state.objects.set(objData.id, {
          id: objData.id,
          type: objData.objectType || 'unknown',
          position: objData.position || { x: 0, y: 0, z: 0 },
          rotation: objData.rotation || { x: 0, y: 0, z: 0 },
          properties: objData.properties || {},
          lastModifiedBy: operation.userId,
          lastModifiedAt: operation.timestamp,
          tombstone: false,
        });
        break;
      }

      case 'remove_object': {
        const removeData = operation.data as { id: string };
        if (!removeData.id) {break;}

        const obj = state.objects.get(removeData.id);
        if (obj) {
          // Tombstone pattern: mark as deleted, don't remove
          if (this.lwwCheck(obj, operation)) {
            obj.tombstone = true;
            obj.lastModifiedBy = operation.userId;
            obj.lastModifiedAt = operation.timestamp;
          }
        }
        break;
      }

      case 'move_object': {
        const moveData = operation.data as {
          id: string;
          position: { x: number; y: number; z: number };
          rotation?: { x: number; y: number; z: number };
        };
        if (!moveData.id) {break;}

        const moveObj = state.objects.get(moveData.id);
        if (moveObj && !moveObj.tombstone) {
          if (this.lwwCheck(moveObj, operation)) {
            moveObj.position = moveData.position;
            if (moveData.rotation) {
              moveObj.rotation = moveData.rotation;
            }
            moveObj.lastModifiedBy = operation.userId;
            moveObj.lastModifiedAt = operation.timestamp;
          }
        }
        break;
      }

      case 'modify_object': {
        const modifyData = operation.data as {
          id: string;
          properties: Record<string, unknown>;
        };
        if (!modifyData.id) {break;}

        const modifyObj = state.objects.get(modifyData.id);
        if (modifyObj && !modifyObj.tombstone) {
          if (this.lwwCheck(modifyObj, operation)) {
            modifyObj.properties = {
              ...modifyObj.properties,
              ...modifyData.properties,
            };
            modifyObj.lastModifiedBy = operation.userId;
            modifyObj.lastModifiedAt = operation.timestamp;
          }
        }
        break;
      }

      case 'cursor_move':
        // Cursor moves are ephemeral, not applied to persistent state
        break;

      default:
        logger.warn(`[CRDT] Unknown operation type: ${operation.type}`);
    }
  }

  /**
   * Last-Writer-Wins check.
   * Returns true if the incoming operation should win over the existing state.
   */
  private lwwCheck(existing: CRDTObject, operation: CRDTOperation): boolean {
    if (operation.timestamp > existing.lastModifiedAt) {
      return true;
    }
    if (operation.timestamp === existing.lastModifiedAt) {
      // Tiebreaker: lexicographically higher userId wins
      return operation.userId > existing.lastModifiedBy;
    }
    return false;
  }

  /**
   * Broadcast a message to all participants in a room except the sender.
   */
  private broadcast(kitchenId: string, excludeUserId: string, message: WSMessage): void {
    const room = this.rooms.get(kitchenId);
    if (!room) {return;}

    const msgStr = JSON.stringify(message);

    for (const [uid, participant] of room.participants) {
      if (uid === excludeUserId) {continue;}
      try {
        if (participant.ws.readyState === WebSocket.OPEN) {
          participant.ws.send(msgStr);
        }
      } catch (err) {
        logger.warn(`[CRDT] Failed to send to user ${uid}`, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Send a message to a specific user.
   */
  private sendToUser(ws: WebSocket, message: WSMessage): void {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    } catch (err) {
      logger.warn('[CRDT] Failed to send message to user', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Serialize CRDTState for transmission (convert Map to array).
   */
  private serializeState(state: CRDTState): SerializedCRDTState {
    return {
      objects: Array.from(state.objects.entries()),
      version: state.version,
    };
  }

  /**
   * Clean up rooms that have been empty for more than 30 minutes.
   */
  private cleanupStaleRooms(): void {
    const now = Date.now();
    const STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

    for (const [kitchenId, room] of this.rooms) {
      if (room.participants.size === 0) {
        const lastActivity = room.operationLog.length > 0
          ? room.operationLog[room.operationLog.length - 1]!.timestamp
          : room.createdAt.getTime();

        if (now - lastActivity > STALE_THRESHOLD) {
          this.rooms.delete(kitchenId);
          logger.info(`[CRDT] Cleaned up stale room ${kitchenId}`);
        }
      }
    }
  }
}
