/**
 * CollaboratorCursors
 * Overlay showing remote users' cursor positions in the 3D designer.
 * Projects 3D cursor positions to 2D screen coordinates using the active camera.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

export interface CursorData {
  x: number;
  y: number;
  z: number;
  objectId?: string;
  timestamp: number;
}

interface CollaboratorCursorsProps {
  /** Map of userId -> user info */
  users: Map<string, { userId: string; name: string; color: string }>;
  /** Map of userId -> 3D cursor position */
  cursors: Map<string, CursorData>;
  /** Three.js camera used for 3D->2D projection */
  camera?: THREE.Camera | null;
  /** Reference to the 3D canvas container element for size calculations */
  containerRef?: React.RefObject<HTMLDivElement | null>;
  /** Current user ID to exclude from display */
  currentUserId?: string;
}

const CURSOR_STALE_MS = 10_000; // 10 seconds

export default function CollaboratorCursors({
  users,
  cursors,
  camera,
  containerRef,
  currentUserId,
}: CollaboratorCursorsProps): React.ReactElement {
  const { t } = useTranslation();
  const now = Date.now();

  const visibleCursors = useMemo(() => {
    const result: Array<{
      userId: string;
      name: string;
      color: string;
      x: number;
      y: number;
      objectId?: string;
      opacity: number;
    }> = [];

    for (const [userId, cursor] of cursors) {
      // Skip current user
      if (userId === currentUserId) {
        continue;
      }

      const user = users.get(userId);
      if (!user) {
        continue;
      }

      // Calculate age for fade-out
      const age = now - cursor.timestamp;
      if (age > CURSOR_STALE_MS) {
        continue;
      }

      // Opacity fades from 1.0 to 0.0 over the last 3 seconds of the stale window
      const fadeStart = CURSOR_STALE_MS - 3000;
      const opacity = age < fadeStart ? 1 : Math.max(0, 1 - (age - fadeStart) / 3000);

      // Project 3D position to 2D screen coordinates
      let x = 0,
        y = 0;
      if (camera && containerRef?.current) {
        const vec = new THREE.Vector3(cursor.x, cursor.y, cursor.z);
        vec.project(camera);
        const rect = containerRef.current.getBoundingClientRect();
        x = (vec.x * 0.5 + 0.5) * rect.width;
        y = (-vec.y * 0.5 + 0.5) * rect.height;

        // Skip if behind camera or outside visible bounds (with small margin)
        if (vec.z > 1 || x < -20 || x > rect.width + 20 || y < -20 || y > rect.height + 20) {
          continue;
        }
      } else {
        // Cannot project without a camera and container reference
        continue;
      }

      result.push({
        userId,
        name: user.name,
        color: user.color,
        x,
        y,
        objectId: cursor.objectId,
        opacity,
      });
    }

    return result;
  }, [cursors, users, camera, containerRef, currentUserId, now]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {visibleCursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute transition-all duration-150 ease-out"
          style={{
            left: `${cursor.x}px`,
            top: `${cursor.y}px`,
            opacity: cursor.opacity,
          }}
        >
          {/* Cursor dot */}
          <div
            className="w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-sm"
            style={{ backgroundColor: cursor.color }}
          />
          {/* User name pill */}
          <div
            className="mt-1 px-2 py-0.5 rounded-full text-xs font-medium text-white whitespace-nowrap shadow-sm"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
            {cursor.objectId && (
              <span className="ml-1 opacity-75">
                {t('designer.collab.editing', 'editing')} {cursor.objectId}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
