/**
 * Collaboration Panel (F10)
 *
 * Sidebar panel for the 3D kitchen designer that manages collaboration:
 * - Invite collaborators by email with role selection
 * - View current members with role badges (color-coded)
 * - Change member roles via dropdown
 * - Remove members
 * - Display a permission matrix
 * - Show pending invites with status badges
 *
 * Features: i18n, dark mode, responsive, AbortController cleanup.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { api } from '../../services/api/api';
import { API_ENDPOINTS } from '../../services/api/endpoints';

// ─── Types ──────────────────────────────────────────────────────────────────

type CollaborationRole = 'viewer' | 'designer' | 'installer' | 'supplier';

interface CollaborationPermissions {
  canEdit: boolean;
  canComment: boolean;
  canExport: boolean;
  canViewSpecs: boolean;
  canViewBOM: boolean;
}

interface CollaborationMember {
  id: string;
  kitchenId: string;
  inviterId: string;
  inviteeEmail: string;
  role: CollaborationRole;
  permissions: CollaborationPermissions;
  status: string;
  createdAt: string;
}

interface PendingInvite {
  id: string;
  kitchenId: string;
  inviteeEmail: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLES: CollaborationRole[] = ['viewer', 'designer', 'installer', 'supplier'];

const ROLE_COLORS: Record<CollaborationRole, { bg: string; text: string; darkBg: string; darkText: string }> = {
  viewer: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    darkBg: 'dark:bg-gray-700',
    darkText: 'dark:text-gray-300',
  },
  designer: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    darkBg: 'dark:bg-blue-900',
    darkText: 'dark:text-blue-200',
  },
  installer: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    darkBg: 'dark:bg-green-900',
    darkText: 'dark:text-green-200',
  },
  supplier: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    darkBg: 'dark:bg-orange-900',
    darkText: 'dark:text-orange-200',
  },
};

const PERMISSION_MATRIX: Record<CollaborationRole, CollaborationPermissions> = {
  viewer: { canEdit: false, canComment: true, canExport: false, canViewSpecs: false, canViewBOM: false },
  designer: { canEdit: true, canComment: true, canExport: true, canViewSpecs: true, canViewBOM: true },
  installer: { canEdit: false, canComment: true, canExport: true, canViewSpecs: true, canViewBOM: true },
  supplier: { canEdit: false, canComment: false, canExport: false, canViewSpecs: false, canViewBOM: true },
};

// ─── Permission Labels ──────────────────────────────────────────────────────

const PERMISSION_LABELS: { key: keyof CollaborationPermissions; label: string }[] = [
  { key: 'canEdit', label: 'Edit' },
  { key: 'canComment', label: 'Comment' },
  { key: 'canExport', label: 'Export' },
  { key: 'canViewSpecs', label: 'View Specs' },
  { key: 'canViewBOM', label: 'View BOM' },
];

// ─── Role Badge ─────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: CollaborationRole }): React.ReactElement {
  const colors = ROLE_COLORS[role] || ROLE_COLORS.viewer;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`}
    >
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    declined: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    expired: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Main Panel Component ───────────────────────────────────────────────────

interface CollaborationPanelProps {
  kitchenId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CollaborationPanel({
  kitchenId,
  isOpen,
  onClose,
}: CollaborationPanelProps): React.ReactElement | null {
  const { t } = useTranslation();

  // Members
  const [members, setMembers] = useState<CollaborationMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // My pending invites
  const [myInvites, setMyInvites] = useState<PendingInvite[]>([]);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaborationRole>('viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Permission matrix visibility
  const [showMatrix, setShowMatrix] = useState(false);

  // Retry
  const [retryCount, setRetryCount] = useState(0);

  // ─── Load members ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen || !kitchenId) {return;}

    const controller = new AbortController();
    let cancelled = false;

    const loadMembers = async (): Promise<void> => {
      setIsLoadingMembers(true);
      try {
        const response = await api.get<CollaborationMember[]>(
          API_ENDPOINTS.COLLABORATION_ROLES.MEMBERS(kitchenId),
          { signal: controller.signal },
        );
        if (!cancelled && response.success && response.data) {
          setMembers(response.data);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
      } finally {
        if (!cancelled) {setIsLoadingMembers(false);}
      }
    };

    void loadMembers();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [kitchenId, isOpen, retryCount]);

  // ─── Load my invites ───────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) {return;}

    const controller = new AbortController();
    let cancelled = false;

    const loadInvites = async (): Promise<void> => {
      try {
        const response = await api.get<PendingInvite[]>(
          API_ENDPOINTS.COLLABORATION_ROLES.MY_INVITES,
          { signal: controller.signal },
        );
        if (!cancelled && response.success && response.data) {
          setMyInvites(response.data);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
      }
    };

    void loadInvites();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [isOpen, retryCount]);

  // ─── Send invite ──────────────────────────────────────────────────────

  const handleInvite = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      setInviteError(null);
      setInviteSuccess(null);

      if (!inviteEmail.trim()) {
        setInviteError(t('collaboration.emailRequired', 'Email is required'));
        return;
      }

      setIsInviting(true);
      try {
        const response = await api.post(API_ENDPOINTS.COLLABORATION_ROLES.INVITE, {
          kitchenId,
          inviteeEmail: inviteEmail,
          role: inviteRole,
        });

        if (response.success) {
          setInviteSuccess(t('collaboration.inviteSent', 'Invitation sent successfully'));
          setInviteEmail('');
          setRetryCount((c) => c + 1); // Refresh members list
        } else {
          setInviteError(response.error?.message || 'Failed to send invitation');
        }
      } catch {
        setInviteError(t('collaboration.inviteError', 'Failed to send invitation'));
      } finally {
        setIsInviting(false);
      }
    },
    [kitchenId, inviteEmail, inviteRole, t],
  );

  // ─── Update member role ───────────────────────────────────────────────

  const handleUpdateRole = useCallback(
    async (inviteId: string, newRole: CollaborationRole): Promise<void> => {
      try {
        const response = await api.put(
          API_ENDPOINTS.COLLABORATION_ROLES.UPDATE_ROLE(inviteId),
          { role: newRole },
        );
        if (response.success) {
          setRetryCount((c) => c + 1);
        }
      } catch {
        // Silently fail
      }
    },
    [],
  );

  // ─── Remove member ────────────────────────────────────────────────────

  const handleRemoveMember = useCallback(
    async (inviteId: string): Promise<void> => {
      try {
        const response = await api.delete(
          API_ENDPOINTS.COLLABORATION_ROLES.REMOVE(inviteId),
        );
        if (response.success) {
          setMembers((prev) => prev.filter((m) => m.id !== inviteId));
        }
      } catch {
        // Silently fail
      }
    },
    [],
  );

  // ─── Accept / Decline invites ─────────────────────────────────────────

  const handleAcceptInvite = useCallback(
    async (token: string): Promise<void> => {
      try {
        await api.post(API_ENDPOINTS.COLLABORATION_ROLES.ACCEPT(token));
        setRetryCount((c) => c + 1);
      } catch {
        // Silently fail
      }
    },
    [],
  );

  const handleDeclineInvite = useCallback(
    async (token: string): Promise<void> => {
      try {
        await api.post(API_ENDPOINTS.COLLABORATION_ROLES.DECLINE(token));
        setRetryCount((c) => c + 1);
      } catch {
        // Silently fail
      }
    },
    [],
  );

  // ─── Don't render if closed ───────────────────────────────────────────

  if (!isOpen) {return null;}

  // Partition members by status
  const acceptedMembers = members.filter((m) => m.status === 'accepted');
  const pendingMembers = members.filter((m) => m.status === 'pending');

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-full overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('collaboration.title', 'Collaboration')}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Invite Form */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('collaboration.inviteTitle', 'Invite Collaborator')}
        </h3>
        <form onSubmit={handleInvite} className="space-y-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t('collaboration.emailPlaceholder', 'colleague@email.com')}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <div className="flex gap-2">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as CollaborationRole)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isInviting}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isInviting
                ? t('common.sending', 'Sending...')
                : t('collaboration.invite', 'Invite')}
            </button>
          </div>

          {inviteError && (
            <p className="text-xs text-red-600 dark:text-red-400">{inviteError}</p>
          )}
          {inviteSuccess && (
            <p className="text-xs text-green-600 dark:text-green-400">{inviteSuccess}</p>
          )}
        </form>
      </div>

      {/* Current Members */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-1">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('collaboration.members', 'Members')} ({acceptedMembers.length})
        </h3>

        {isLoadingMembers && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('common.loading', 'Loading...')}
          </p>
        )}

        {!isLoadingMembers && acceptedMembers.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t('collaboration.noMembers', 'No collaborators yet.')}
          </p>
        )}

        <div className="space-y-2">
          {acceptedMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-700/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white truncate">
                  {member.inviteeEmail}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.id, e.target.value as CollaborationRole)}
                    className="text-xs px-1.5 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                  <RoleBadge role={member.role as CollaborationRole} />
                </div>
              </div>
              <button
                onClick={() => handleRemoveMember(member.id)}
                className="ml-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                title={t('collaboration.remove', 'Remove member')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {pendingMembers.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('collaboration.pendingInvites', 'Pending Invites')} ({pendingMembers.length})
          </h3>
          <div className="space-y-2">
            {pendingMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 rounded-md bg-yellow-50 dark:bg-yellow-900/20"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    {member.inviteeEmail}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <RoleBadge role={member.role as CollaborationRole} />
                    <StatusBadge status={member.status} />
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="ml-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  title={t('collaboration.cancelInvite', 'Cancel invite')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Invites (received) */}
      {myInvites.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('collaboration.myInvites', 'Invitations for You')} ({myInvites.length})
          </h3>
          <div className="space-y-2">
            {myInvites.map((invite) => (
              <div
                key={invite.id}
                className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {t('collaboration.invitedAs', 'Invited as')} <RoleBadge role={invite.role as CollaborationRole} />
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAcceptInvite((invite as unknown as { token: string }).token || invite.id)}
                    className="flex-1 px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
                  >
                    {t('collaboration.accept', 'Accept')}
                  </button>
                  <button
                    onClick={() => handleDeclineInvite((invite as unknown as { token: string }).token || invite.id)}
                    className="flex-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('collaboration.decline', 'Decline')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permission Matrix */}
      <div className="px-4 py-3">
        <button
          onClick={() => setShowMatrix(!showMatrix)}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          <svg
            className={`w-4 h-4 transform transition-transform ${showMatrix ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {t('collaboration.permissionMatrix', 'Permission Matrix')}
        </button>

        {showMatrix && (
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-1 pr-2 text-gray-500 dark:text-gray-400">
                    {t('collaboration.permission', 'Permission')}
                  </th>
                  {ROLES.map((role) => (
                    <th key={role} className="text-center py-1 px-1">
                      <RoleBadge role={role} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_LABELS.map(({ key, label }) => (
                  <tr key={key} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-1.5 pr-2 text-gray-700 dark:text-gray-300">{label}</td>
                    {ROLES.map((role) => (
                      <td key={role} className="text-center py-1.5">
                        {PERMISSION_MATRIX[role][key] ? (
                          <span className="text-green-500">&#10003;</span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">&#10007;</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
