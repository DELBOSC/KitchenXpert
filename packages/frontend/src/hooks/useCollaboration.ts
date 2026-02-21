/**
 * useCollaboration hook
 * Manages WebSocket connection for real-time collaboration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import i18next from 'i18next';
import type { KitchenEngine } from '@kitchenxpert/3d-engine';

export interface CollaborationUser {
  userId: string;
  email: string;
  displayName: string;
  color: string;
  joinedAt: string;
}

export interface CursorPosition {
  x: number;
  y: number;
  z: number;
  objectId?: string;
  timestamp: number;
}

interface WSMessage {
  type: string;
  kitchenId: string;
  userId: string;
  payload: unknown;
  timestamp: number;
}

interface UseCollaborationReturn {
  isConnected: boolean;
  users: CollaborationUser[];
  cursors: Map<string, CursorPosition>;
  error: string | null;
  sendCursorUpdate: (position: { x: number; y: number; z: number }, objectId?: string) => void;
}

const WS_BASE_URL = (import.meta.env.VITE_WS_URL as string) ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

export function useCollaboration(
  kitchenId: string | undefined,
  engine: KitchenEngine | null
): UseCollaborationReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const staleCursorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(() => {
    if (!kitchenId) return;

    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/collaboration?kitchenId=${kitchenId}`);
      wsRef.current = ws;

      const doc = new Y.Doc();
      docRef.current = doc;

      // Listen for local doc changes and send to server
      doc.on('update', (update: Uint8Array, _origin: unknown) => {
        if (ws.readyState === WebSocket.OPEN) {
          const base64 = btoa(String.fromCharCode(...update));
          ws.send(JSON.stringify({
            type: 'doc-update',
            kitchenId,
            userId: '',
            payload: { update: base64 },
            timestamp: Date.now(),
          }));
        }
      });

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          handleMessage(message, doc);
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;

        if (event.code !== 4001 && event.code !== 4002) {
          // Auto-reconnect with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        } else {
          setError(event.reason || 'Connection refused');
        }
      };

      ws.onerror = () => {
        setError(i18next.t('collaboration.wsError', 'Erreur de connexion WebSocket'));
      };
    } catch {
      setError(i18next.t('collaboration.connectError', 'Impossible de se connecter au serveur collaboratif'));
    }
  }, [kitchenId]);

  const handleMessage = useCallback((message: WSMessage, doc: Y.Doc) => {
    switch (message.type) {
      case 'full-state': {
        const payload = message.payload as { state: string };
        if (payload?.state) {
          const binary = atob(payload.state);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          Y.applyUpdate(doc, bytes);
        }
        break;
      }
      case 'doc-update': {
        const payload = message.payload as { update: string };
        if (payload?.update) {
          const binary = atob(payload.update);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          Y.applyUpdate(doc, bytes);
        }
        break;
      }
      case 'presence-update': {
        const payload = message.payload as { users: CollaborationUser[] };
        if (payload?.users) {
          setUsers(payload.users);
        }
        break;
      }
      case 'cursor-update': {
        const cursorPayload = message.payload as {
          userId?: string;
          position?: { x: number; y: number; z: number };
          objectId?: string;
          timestamp?: number;
        };
        if (cursorPayload && message.userId) {
          const pos = cursorPayload.position;
          setCursors((prev) => {
            const next = new Map(prev);
            next.set(message.userId, {
              x: pos?.x ?? 0,
              y: pos?.y ?? 0,
              z: pos?.z ?? 0,
              objectId: cursorPayload.objectId,
              timestamp: cursorPayload.timestamp ?? Date.now(),
            });
            return next;
          });
        }
        break;
      }
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (!kitchenId || !engine) return;

    connect();

    // Periodically clean up stale cursors (older than 30 seconds)
    staleCursorIntervalRef.current = setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const [userId, cursor] of next) {
          if (now - cursor.timestamp > 30_000) {
            next.delete(userId);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 5000);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (staleCursorIntervalRef.current) {
        clearInterval(staleCursorIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmount');
        wsRef.current = null;
      }
      if (docRef.current) {
        docRef.current.destroy();
        docRef.current = null;
      }
    };
  }, [kitchenId, engine, connect]);

  const sendCursorUpdate = useCallback((position: { x: number; y: number; z: number }, objectId?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !kitchenId) return;

    wsRef.current.send(JSON.stringify({
      type: 'cursor-update',
      kitchenId,
      userId: '',
      payload: { objectId, position, timestamp: Date.now() },
      timestamp: Date.now(),
    }));
  }, [kitchenId]);

  return { isConnected, users, cursors, error, sendCursorUpdate };
}
