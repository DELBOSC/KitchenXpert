/**
 * Types for real-time collaboration
 */

export interface CollaborationUser {
  userId: string;
  email: string;
  displayName: string;
  color: string; // hex color for cursor/avatar
  joinedAt: string;
}

export interface CursorPosition {
  userId: string;
  objectId?: string;
  position?: { x: number; y: number; z: number };
  timestamp: number;
}

export type WSMessageType =
  | 'doc-update'
  | 'cursor-update'
  | 'presence-update'
  | 'sync-state'
  | 'full-state'
  | 'request-state'
  | 'error';

export interface WSMessage {
  type: WSMessageType;
  kitchenId: string;
  userId: string;
  payload: unknown;
  timestamp: number;
}

export interface PresenceUpdate {
  users: CollaborationUser[];
}
