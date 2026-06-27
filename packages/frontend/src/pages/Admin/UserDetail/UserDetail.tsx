import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { useToast } from '../../../components/ui/Toast';

interface UserProject {
  id: string;
  name: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  createdAt: string;
  kitchenCount: number;
}

interface UserOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
}

interface ActivityEntry {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  ipAddress?: string;
}

interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'designer' | 'user';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  avatarUrl?: string;
  phone?: string;
  company?: string;
  projectCount: number;
  projects: UserProject[];
  orders: UserOrder[];
  activity: ActivityEntry[];
}

const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const toast = useToast();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'orders' | 'activity'>(
    'overview'
  );
  const [showActionModal, setShowActionModal] = useState<{ type: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  // Close the action modal on Escape (document-level to keep the dialog container non-interactive)
  useEffect(() => {
    if (!showActionModal) {
      return;
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !isProcessing) {
        setShowActionModal(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showActionModal, isProcessing]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchUser = async (): Promise<void> => {
      if (!id) {
        setError(t('admin.userNotFound', 'User not found'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/admin/users/${id}`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 404) {
            setNotFound(true);
            setIsLoading(false);
            return;
          }
          throw new Error(t('admin.fetchUserError', 'Failed to load user details'));
        }

        const data = (await response.json()) as { data?: UserDetail } & Partial<UserDetail>;
        const userData = (data.data ?? data) as UserDetail;

        if (!mountedRef.current) {
          return;
        }

        setUser(userData);
        setSelectedRole(userData.role);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const errorMessage =
          err instanceof Error
            ? err.message
            : t('admin.fetchUserError', 'Failed to load user details');
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchUser();
    return () => controller.abort();
  }, [id, retryCount, t]);

  const handleUserAction = async (action: string): Promise<void> => {
    if (!user) {
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(`/api/v1/admin/users/${user.id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!mountedRef.current) {
        return;
      }

      if (!response.ok) {
        throw new Error(t('admin.userActionFailed', 'Failed to {{action}} user', { action }));
      }

      // Update local state
      setUser((prev) => {
        if (!prev) {
          return prev;
        }
        switch (action) {
          case 'activate':
            return { ...prev, status: 'active' as const };
          case 'deactivate':
            return { ...prev, status: 'inactive' as const };
          case 'suspend':
            return { ...prev, status: 'suspended' as const };
          default:
            return prev;
        }
      });

      toast.success(t('admin.actionSuccess', `User ${action}d successfully`));
      setShowActionModal(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t('admin.actionFailed', 'Action failed');
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoleChange = async (): Promise<void> => {
    if (!user || selectedRole === user.role) {
      setShowActionModal(null);
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: selectedRole }),
      });

      if (!mountedRef.current) {
        return;
      }

      if (!response.ok) {
        throw new Error(t('admin.roleChangeFailed', 'Failed to change user role'));
      }

      setUser((prev) => (prev ? { ...prev, role: selectedRole as UserDetail['role'] } : prev));
      toast.success(t('admin.roleChanged', 'User role updated successfully'));
      setShowActionModal(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : t('admin.actionFailed', 'Action failed');
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: UserDetail['status']): string => {
    const colors: Record<UserDetail['status'], string> = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      suspended: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    };
    return colors[status];
  };

  const getRoleColor = (role: UserDetail['role']): string => {
    const colors: Record<UserDetail['role'], string> = {
      admin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400',
      manager: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
      designer: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-400',
      user: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    };
    return colors[role];
  };

  const getProjectStatusColor = (status: UserProject['status']): string => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
      in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
      completed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
      archived: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
          role="status"
          aria-label={t('common.loading', 'Loading')}
        />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">404</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('common.resourceNotFound', 'Ressource introuvable')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('common.resourceNotFoundDesc', "L'element demande n'existe pas ou a ete supprime.")}
          </p>
          <button
            onClick={() => navigate('/admin/users')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('admin.backToUsers', 'Retour aux utilisateurs')}
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen dark:bg-gray-900 p-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-red-800 dark:text-red-300 text-lg font-semibold mb-2">
            {t('common.error', 'Error')}
          </h2>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => navigate('/admin/users')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              {t('admin.backToUsers', 'Back to Users')}
            </button>
            <button
              onClick={() => {
                setError(null);
                setRetryCount((c) => c + 1);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              {t('common.tryAgain', 'Try Again')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs = [
    { id: 'overview' as const, label: t('admin.overview', 'Overview') },
    {
      id: 'projects' as const,
      label: `${t('admin.projects', 'Projects')} (${user.projects?.length || 0})`,
    },
    {
      id: 'orders' as const,
      label: `${t('admin.orders', 'Orders')} (${user.orders?.length || 0})`,
    },
    { id: 'activity' as const, label: t('admin.activity', 'Activity') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <li>
              <Link to="/admin/users" className="hover:text-blue-600 dark:hover:text-blue-400">
                {t('admin.userManagement', 'User Management')}
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 dark:text-white font-medium">
              {user.firstName} {user.lastName}
            </li>
          </ol>
        </nav>

        {/* User Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <span className="text-2xl text-gray-500 dark:text-gray-400 font-medium">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* User Info */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${getRoleColor(user.role)}`}
                  >
                    {t(`admin.roles.${user.role}`, user.role)}
                  </span>
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(user.status)}`}
                  >
                    {t(`admin.statuses.${user.status}`, user.status)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                  {user.phone && (
                    <span>
                      {t('admin.phone', 'Phone')}: {user.phone}
                    </span>
                  )}
                  {user.company && (
                    <span>
                      {t('admin.company', 'Company')}: {user.company}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setSelectedRole(user.role);
                  setShowActionModal({ type: 'changeRole' });
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                {t('admin.changeRole', 'Change Role')}
              </button>
              {user.status === 'active' ? (
                <button
                  onClick={() => setShowActionModal({ type: 'suspend' })}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  {t('admin.suspend', 'Suspend')}
                </button>
              ) : (
                <button
                  onClick={() => setShowActionModal({ type: 'activate' })}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  {t('admin.activate', 'Activate')}
                </button>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('admin.registered', 'Registered')}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(user.createdAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('admin.lastLogin', 'Last Login')}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user.lastLoginAt ? formatDate(user.lastLoginAt) : t('common.never', 'Never')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('admin.totalProjects', 'Total Projects')}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user.projectCount}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('admin.lastUpdated', 'Last Updated')}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(user.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex -mb-px" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('admin.accountInfo', 'Account Information')}
                  </h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">
                        {t('admin.userId', 'User ID')}
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-white font-mono">{user.id}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">
                        {t('admin.email', 'Email')}
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-white">{user.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">
                        {t('admin.fullName', 'Full Name')}
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-white">
                        {user.firstName} {user.lastName}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">
                        {t('admin.role', 'Role')}
                      </dt>
                      <dd>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}
                        >
                          {t(`admin.roles.${user.role}`, user.role)}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">
                        {t('admin.status', 'Status')}
                      </dt>
                      <dd>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}
                        >
                          {t(`admin.statuses.${user.status}`, user.status)}
                        </span>
                      </dd>
                    </div>
                    {user.phone && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">
                          {t('admin.phone', 'Phone')}
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-white">{user.phone}</dd>
                      </div>
                    )}
                    {user.company && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">
                          {t('admin.company', 'Company')}
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-white">{user.company}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('admin.recentActivity', 'Recent Activity')}
                  </h3>
                  {user.activity && user.activity.length > 0 ? (
                    <div className="space-y-3">
                      {user.activity.slice(0, 5).map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full flex-shrink-0" />
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">{entry.action}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {entry.details}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {formatDate(entry.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t('admin.noRecentActivity', 'No recent activity')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Projects Tab */}
            {activeTab === 'projects' && (
              <div>
                {user.projects && user.projects.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('admin.projectName', 'Project Name')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('admin.status', 'Status')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('admin.kitchens', 'Kitchens')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('admin.created', 'Created')}
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('admin.actions', 'Actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {user.projects.map((project) => (
                          <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {project.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getProjectStatusColor(project.status)}`}
                              >
                                {project.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {project.kitchenCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatShortDate(project.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                              <Link
                                to={`/projects/${project.id}`}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                              >
                                {t('common.view', 'View')}
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('admin.noProjects', 'This user has no projects')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div>
                {user.orders && user.orders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('admin.orderNumber', 'Order #')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('admin.status', 'Status')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('admin.amount', 'Amount')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {t('admin.date', 'Date')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {user.orders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {order.orderNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatCurrency(order.totalAmount, order.currency)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatShortDate(order.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('admin.noOrders', 'This user has no orders')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div>
                {user.activity && user.activity.length > 0 ? (
                  <div className="space-y-4">
                    {user.activity.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-4 p-4 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {entry.action}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {entry.details}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-4">
                              {formatDate(entry.createdAt)}
                            </span>
                          </div>
                          {entry.ipAddress && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              IP: {entry.ipAddress}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('admin.noActivity', 'No activity recorded for this user')}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Modal - Suspend/Activate */}
      {showActionModal &&
        (showActionModal.type === 'suspend' || showActionModal.type === 'activate') && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-modal-heading"
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
              ref={(el) => {
                if (el) {
                  const btn = el.querySelector<HTMLElement>('button');
                  btn?.focus();
                }
              }}
            >
              <h2
                id="action-modal-heading"
                className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
              >
                {showActionModal.type === 'suspend'
                  ? t('admin.suspendUser', 'Suspend User')
                  : t('admin.activateUser', 'Activate User')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {showActionModal.type === 'suspend'
                  ? t(
                      'admin.suspendConfirm',
                      `Are you sure you want to suspend ${user.firstName} ${user.lastName}? They will lose access to their account.`
                    )
                  : t(
                      'admin.activateConfirm',
                      `Are you sure you want to activate ${user.firstName} ${user.lastName}?`
                    )}
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
                  onClick={() => handleUserAction(showActionModal.type)}
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

      {/* Change Role Modal */}
      {showActionModal && showActionModal.type === 'changeRole' && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-modal-heading"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full"
            ref={(el) => {
              if (el) {
                const btn = el.querySelector<HTMLElement>('button');
                btn?.focus();
              }
            }}
          >
            <h2
              id="role-modal-heading"
              className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
            >
              {t('admin.changeRole', 'Change Role')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t(
                'admin.changeRoleDesc',
                `Select a new role for ${user.firstName} ${user.lastName}.`
              )}
            </p>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white mb-6"
            >
              <option value="admin">{t('admin.roles.admin', 'Admin')}</option>
              <option value="manager">{t('admin.roles.manager', 'Manager')}</option>
              <option value="designer">{t('admin.roles.designer', 'Designer')}</option>
              <option value="user">{t('admin.roles.user', 'User')}</option>
            </select>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowActionModal(null)}
                disabled={isProcessing}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleRoleChange}
                disabled={isProcessing || selectedRole === user.role}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                )}
                {t('admin.saveRole', 'Save Role')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetailPage;
