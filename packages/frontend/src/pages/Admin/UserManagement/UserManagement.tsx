import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';

import { useToast } from '../../../components/ui/Toast';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'designer' | 'partner' | 'user';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  createdAt: string;
  lastLoginAt?: string;
  avatarUrl?: string;
  projectCount: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface UsersResponse {
  users: User[];
  pagination: PaginationInfo;
}

const UserManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [roleFilter, setRoleFilter] = useState<string>(searchParams.get('role') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showActionModal, setShowActionModal] = useState<{ type: string; user: User } | null>(null);
  const [showBulkModal, setShowBulkModal] = useState<{ action: 'suspend' | 'activate' | 'changeRole' } | null>(null);
  const [bulkRole, setBulkRole] = useState<string>('user');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Close the single-user action modal on Escape (document-level to keep the dialog container non-interactive)
  useEffect(() => {
    if (!showActionModal) {return;}
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !isProcessing) { setShowActionModal(null); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showActionModal, isProcessing]);

  // Close the bulk action modal on Escape
  useEffect(() => {
    if (!showBulkModal) {return;}
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !isBulkProcessing) { setShowBulkModal(null); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showBulkModal, isBulkProcessing]);

  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: pagination.itemsPerPage.toString(),
        });

        if (searchQuery) {params.append('search', searchQuery);}
        if (roleFilter) {params.append('role', roleFilter);}
        if (statusFilter) {params.append('status', statusFilter);}

        const response = await fetch(`/api/v1/admin/users?${params.toString()}`, { credentials: 'include', signal: controller.signal });

        if (!response.ok) {
          throw new Error(t('admin.errors.fetchUsers', 'Failed to fetch users'));
        }

        const data: UsersResponse = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {return;}
        const errorMessage = err instanceof Error ? err.message : t('admin.errors.unexpected', 'An unexpected error occurred');
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchUsers();
    return () => controller.abort();
  }, [currentPage, searchQuery, roleFilter, statusFilter, pagination.itemsPerPage]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setSearchParams({
      page: '1',
      ...(searchQuery && { search: searchQuery }),
      ...(roleFilter && { role: roleFilter }),
      ...(statusFilter && { status: statusFilter }),
    });
  };

  const handlePageChange = (page: number): void => {
    setSearchParams({
      page: page.toString(),
      ...(searchQuery && { search: searchQuery }),
      ...(roleFilter && { role: roleFilter }),
      ...(statusFilter && { status: statusFilter }),
    });
  };

  const handleSelectAll = (): void => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  const handleSelectUser = (userId: string): void => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleUserAction = async (action: string, user: User): Promise<void> => {
    setIsProcessing(true);

    try {
      const response = await fetch(`/api/v1/admin/users/${user.id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!mountedRef.current) {return;}

      if (!response.ok) {
        throw new Error(t('admin.errors.userAction', { action, defaultValue: `Failed to ${action} user` }));
      }

      // Refresh user list
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === user.id) {
            switch (action) {
              case 'activate':
                return { ...u, status: 'active' as const };
              case 'deactivate':
                return { ...u, status: 'inactive' as const };
              case 'suspend':
                return { ...u, status: 'suspended' as const };
              default:
                return u;
            }
          }
          return u;
        })
      );

      setShowActionModal(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('admin.errors.actionFailed', 'Action failed');
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAction = async (action: 'suspend' | 'activate'): Promise<void> => {
    if (selectedUsers.length === 0) {return;}

    setIsBulkProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const userId of selectedUsers) {
      try {
        const response = await fetch(`/api/v1/admin/users/${userId}/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!mountedRef.current) {return;}

        if (response.ok) {
          successCount++;
          const newStatus = action === 'activate' ? 'active' as const : 'suspended' as const;
          setUsers((prev) =>
            prev.map((u) => u.id === userId ? { ...u, status: newStatus } : u)
          );
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (!mountedRef.current) {return;}

    if (successCount > 0) {
      toast.success(t('admin.bulkActionSuccess', `Successfully updated ${successCount} user(s)`));
    }
    if (failCount > 0) {
      toast.error(t('admin.bulkActionPartialFail', `Failed to update ${failCount} user(s)`));
    }

    setSelectedUsers([]);
    setShowBulkModal(null);
    setIsBulkProcessing(false);
  };

  const handleBulkRoleChange = async (): Promise<void> => {
    if (selectedUsers.length === 0) {return;}

    setIsBulkProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const userId of selectedUsers) {
      try {
        const response = await fetch(`/api/v1/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ role: bulkRole }),
        });

        if (!mountedRef.current) {return;}

        if (response.ok) {
          successCount++;
          setUsers((prev) =>
            prev.map((u) => u.id === userId ? { ...u, role: bulkRole as User['role'] } : u)
          );
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    if (!mountedRef.current) {return;}

    if (successCount > 0) {
      toast.success(t('admin.bulkRoleSuccess', `Successfully changed role for ${successCount} user(s)`));
    }
    if (failCount > 0) {
      toast.error(t('admin.bulkRolePartialFail', `Failed to change role for ${failCount} user(s)`));
    }

    setSelectedUsers([]);
    setShowBulkModal(null);
    setIsBulkProcessing(false);
  };

  const getStatusColor = (status: User['status']): string => {
    const colors: Record<User['status'], string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      suspended: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
    return colors[status];
  };

  const getRoleColor = (role: User['role']): string => {
    const colors: Record<User['role'], string> = {
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      designer: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      partner: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
      user: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[role];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.userManagement', 'User Management')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{t('admin.userManagementDesc', 'Manage user accounts, roles, and permissions')}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-red-800 dark:text-red-300 underline">
              {t('common.dismiss', 'Dismiss')}
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder={t('admin.searchUsers', 'Search users by name or email...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('admin.allRoles', 'All Roles')}</option>
              <option value="admin">{t('admin.roles.admin', 'Admin')}</option>
              <option value="manager">{t('admin.roles.manager', 'Manager')}</option>
              <option value="designer">{t('admin.roles.designer', 'Designer')}</option>
              <option value="partner">{t('admin.roles.partner', 'Partner')}</option>
              <option value="user">{t('admin.roles.user', 'User')}</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('admin.allStatus', 'All Status')}</option>
              <option value="active">{t('admin.status.active', 'Active')}</option>
              <option value="inactive">{t('admin.status.inactive', 'Inactive')}</option>
              <option value="suspended">{t('admin.status.suspended', 'Suspended')}</option>
              <option value="pending">{t('admin.status.pending', 'Pending')}</option>
            </select>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('common.search', 'Search')}
            </button>
          </form>
        </div>

        {/* User Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden" aria-busy={isLoading}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" aria-label={t('admin.userTable', 'User management table')}>
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={handleSelectAll}
                      aria-label={t('admin.selectAll', 'Selectionner tout')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus-visible:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.user', 'User')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.role', 'Role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.status', 'Status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.projects', 'Projects')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.lastLogin', 'Last Login')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.joined', 'Joined')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('admin.actions', 'Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        aria-label={t('admin.selectUser', { name: `${user.firstName} ${user.lastName}`, defaultValue: 'Selectionner {{name}}' })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus-visible:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={`${user.firstName} ${user.lastName}`}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                              <span className="text-gray-500 dark:text-gray-300 font-medium">
                                {user.firstName[0]}{user.lastName[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.projectCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : t('common.never', 'Never')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/admin/users/${user.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        >
                          {t('common.view', 'View')}
                        </Link>
                        <button
                          onClick={() => setShowActionModal({ type: 'edit', user })}
                          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        >
                          {t('common.edit', 'Edit')}
                        </button>
                        {user.status === 'active' ? (
                          <button
                            onClick={() => setShowActionModal({ type: 'suspend', user })}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            {t('admin.suspend', 'Suspend')}
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowActionModal({ type: 'activate', user })}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                          >
                            {t('admin.activate', 'Activate')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">{t('admin.noUsersFound', 'No users found matching your criteria')}</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.showingPagination', {
                    from: (currentPage - 1) * pagination.itemsPerPage + 1,
                    to: Math.min(currentPage * pagination.itemsPerPage, pagination.totalItems),
                    total: pagination.totalItems,
                    defaultValue: 'Affichage de {{from}} a {{to}} sur {{total}} utilisateurs'
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.previous', 'Previous')}
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('common.next', 'Next')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4 z-40">
            <span>{t('admin.usersSelected', { count: selectedUsers.length, defaultValue: '{{count}} users selected' })}</span>
            <button
              onClick={() => setShowBulkModal({ action: 'activate' })}
              className="px-3 py-1 bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              {t('admin.activateSelected', 'Activate Selected')}
            </button>
            <button
              onClick={() => setShowBulkModal({ action: 'suspend' })}
              className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 transition-colors"
            >
              {t('admin.suspendSelected', 'Suspend Selected')}
            </button>
            <button
              onClick={() => {
                setBulkRole('user');
                setShowBulkModal({ action: 'changeRole' });
              }}
              className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              {t('admin.changeRole', 'Change Role')}
            </button>
            <button
              onClick={() => setSelectedUsers([])}
              className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-500 transition-colors"
            >
              {t('common.clear', 'Clear')}
            </button>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="actionModalTitle"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full" ref={(el) => { if (el) { const btn = el.querySelector<HTMLElement>('button'); btn?.focus(); } }}>
            <h2 id="actionModalTitle" className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {showActionModal.type === 'suspend' ? t('admin.suspendUser', 'Suspend User') : t('admin.activateUser', 'Activate User')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {t('admin.actionConfirm', {
                action: showActionModal.type,
                name: `${showActionModal.user.firstName} ${showActionModal.user.lastName}`,
                defaultValue: `Etes-vous sur de vouloir ${showActionModal.type === 'suspend' ? 'suspendre' : 'activer'} ${showActionModal.user.firstName} ${showActionModal.user.lastName} ?`
              })}
              {showActionModal.type === 'suspend' && ` ${t('admin.loseAccessWarning', 'L\'utilisateur perdra l\'acces a son compte.')}`}
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowActionModal(null)}
                disabled={isProcessing}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={() => handleUserAction(showActionModal.type, showActionModal.user)}
                disabled={isProcessing}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  showActionModal.type === 'suspend'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isProcessing && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                )}
                {t('common.confirm', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation Modal - Suspend/Activate */}
      {showBulkModal && (showBulkModal.action === 'suspend' || showBulkModal.action === 'activate') && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulkModalTitle"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full" ref={(el) => { if (el) { const btn = el.querySelector<HTMLElement>('button'); btn?.focus(); } }}>
            <h2 id="bulkModalTitle" className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {showBulkModal.action === 'suspend'
                ? t('admin.bulkSuspendTitle', 'Suspend Selected Users')
                : t('admin.bulkActivateTitle', 'Activate Selected Users')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {showBulkModal.action === 'suspend'
                ? t('admin.bulkSuspendConfirm', {
                    count: selectedUsers.length,
                    defaultValue: `Are you sure you want to suspend ${selectedUsers.length} user(s)? They will lose access to their accounts.`,
                  })
                : t('admin.bulkActivateConfirm', {
                    count: selectedUsers.length,
                    defaultValue: `Are you sure you want to activate ${selectedUsers.length} user(s)?`,
                  })}
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowBulkModal(null)}
                disabled={isBulkProcessing}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={() => handleBulkAction(showBulkModal.action as 'suspend' | 'activate')}
                disabled={isBulkProcessing}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  showBulkModal.action === 'suspend'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isBulkProcessing && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                )}
                {t('common.confirm', 'Confirm')} ({selectedUsers.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Role Change Modal */}
      {showBulkModal && showBulkModal.action === 'changeRole' && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulkRoleModalTitle"
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full" ref={(el) => { if (el) { const btn = el.querySelector<HTMLElement>('button'); btn?.focus(); } }}>
            <h2 id="bulkRoleModalTitle" className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('admin.bulkChangeRoleTitle', 'Change Role for Selected Users')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {t('admin.bulkChangeRoleDesc', {
                count: selectedUsers.length,
                defaultValue: `Select a new role for ${selectedUsers.length} user(s).`,
              })}
            </p>
            <select
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white mb-6"
            >
              <option value="admin">{t('admin.roles.admin', 'Admin')}</option>
              <option value="manager">{t('admin.roles.manager', 'Manager')}</option>
              <option value="designer">{t('admin.roles.designer', 'Designer')}</option>
              <option value="user">{t('admin.roles.user', 'User')}</option>
            </select>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowBulkModal(null)}
                disabled={isBulkProcessing}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleBulkRoleChange}
                disabled={isBulkProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isBulkProcessing && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                )}
                {t('admin.applyRole', 'Apply Role')} ({selectedUsers.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
