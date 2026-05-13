import React from 'react';
import { useTranslation } from 'react-i18next';

export interface PresenceUser {
  userId: string;
  email: string;
  displayName: string;
  color: string;
}

interface PresenceBarProps {
  users: PresenceUser[];
  isConnected: boolean;
  error: string | null;
}

export default function PresenceBar({ users, isConnected, error }: PresenceBarProps): React.ReactElement | null {
  const { t } = useTranslation();

  if (users.length === 0 && !isConnected) {return null;}

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* Connection status */}
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : error ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'
        }`} />
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          {isConnected
            ? t('designer.collab.connected', 'Connecte')
            : error
              ? t('designer.collab.error', 'Deconnecte')
              : t('designer.collab.reconnecting', 'Reconnexion...')
          }
        </span>
      </div>

      {/* User count */}
      {users.length > 0 && (
        <>
          <span className="w-px h-4 bg-gray-200 dark:bg-gray-600" />
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            {users.length} {t('designer.collab.editors', 'editeur(s)')}
          </span>
        </>
      )}

      {/* User avatars */}
      <div className="flex items-center -space-x-1.5">
        {users.slice(0, 5).map((user) => (
          <div
            key={user.userId}
            title={`${user.displayName} (${user.email})`}
            aria-label={`${user.displayName} (${user.email})`}
            className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-[9px] font-bold text-white"
            style={{ backgroundColor: user.color }}
          >
            {user.displayName.slice(0, 2).toUpperCase()}
          </div>
        ))}
        {users.length > 5 && (
          <div className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 bg-gray-400 flex items-center justify-center text-[9px] font-bold text-white">
            +{users.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}
