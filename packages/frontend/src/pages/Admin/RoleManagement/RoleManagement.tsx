import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

const RoleManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [newRole, setNewRole] = useState<{
    name: string;
    description: string;
    permissions: string[];
  }>({
    name: '',
    description: '',
    permissions: [],
  });

  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const [rolesResponse, permissionsResponse] = await Promise.all([
          fetch('/api/v1/admin/roles', { credentials: 'include', signal: controller.signal }),
          fetch('/api/v1/admin/permissions', { credentials: 'include', signal: controller.signal }),
        ]);

        if (!rolesResponse.ok || !permissionsResponse.ok) {
          throw new Error(t('admin.fetchRolesError', 'Failed to fetch roles and permissions'));
        }

        const rolesData: Role[] = await rolesResponse.json();
        const permissionsData: Permission[] = await permissionsResponse.json();

        setRoles(rolesData);
        setPermissions(permissionsData);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const errorMessage = err instanceof Error ? err.message : t('common.unexpectedError', 'An unexpected error occurred');
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, []);

  const permissionsByCategory = permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category]!.push(permission);
    return acc;
  }, {});

  const handleCreateRole = async (): Promise<void> => {
    if (!newRole.name.trim()) {
      setError(t('admin.roles.nameRequired', 'Le nom du role est requis'));
      setNameError(t('admin.roles.nameRequired', 'Le nom du role est requis'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newRole),
      });

      if (!response.ok) {
        throw new Error(t('admin.roles.createFailed', 'Echec de la creation du role'));
      }

      const createdRole: Role = await response.json();
      setRoles((prev) => [...prev, createdRole]);
      setIsCreating(false);
      setNewRole({ name: '', description: '', permissions: [] });
      setNameError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('admin.roles.createFailed', 'Echec de la creation du role');
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateRole = async (): Promise<void> => {
    if (!editingRole) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/admin/roles/${editingRole.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editingRole.name,
          description: editingRole.description,
          permissions: editingRole.permissions,
        }),
      });

      if (!response.ok) {
        throw new Error(t('admin.roles.updateFailed', 'Echec de la mise a jour du role'));
      }

      const updatedRole: Role = await response.json();
      setRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)));
      setEditingRole(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('admin.roles.updateFailed', 'Echec de la mise a jour du role');
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null);

  const handleDeleteRole = async (role: Role): Promise<void> => {
    if (role.isSystem) {
      setError(t('admin.roles.systemCannotDelete', 'Les roles systeme ne peuvent pas etre supprimes'));
      return;
    }

    setDeleteConfirm(role);
  };

  const confirmDeleteRole = async (): Promise<void> => {
    if (!deleteConfirm) return;

    try {
      const response = await fetch(`/api/v1/admin/roles/${deleteConfirm.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(t('admin.roles.deleteFailed', 'Echec de la suppression du role'));
      }

      setRoles((prev) => prev.filter((r) => r.id !== deleteConfirm.id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('admin.roles.deleteFailed', 'Echec de la suppression du role');
      setError(errorMessage);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const togglePermission = (
    permissionId: string,
    target: 'new' | 'edit'
  ): void => {
    if (target === 'new') {
      setNewRole((prev) => ({
        ...prev,
        permissions: prev.permissions.includes(permissionId)
          ? prev.permissions.filter((p) => p !== permissionId)
          : [...prev.permissions, permissionId],
      }));
    } else if (editingRole) {
      setEditingRole({
        ...editingRole,
        permissions: editingRole.permissions.includes(permissionId)
          ? editingRole.permissions.filter((p) => p !== permissionId)
          : [...editingRole.permissions, permissionId],
      });
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" role="status" aria-label={t('common.loading', 'Loading')}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('admin.roleManagement', 'Role Management')}</h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">{t('admin.roleManagementDesc', 'Define roles and manage permissions')}</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            title={t('admin.roles.createRole', 'Creer un role')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('admin.createRole', 'Create Role')}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex justify-between items-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="text-red-800 dark:text-red-300 hover:text-red-900 dark:hover:text-red-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Roles List */}
        <div className="grid gap-6 lg:grid-cols-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                      {role.isSystem && (
                        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                          {t('admin.roles.system', 'Systeme')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{role.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingRole(role)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title={t('admin.roles.editRole', 'Modifier le role')}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {!role.isSystem && (
                      <button
                        onClick={() => handleDeleteRole(role)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title={t('admin.roles.deleteRole', 'Supprimer le role')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Permissions Summary */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {t('admin.roles.permissionsAssigned', { count: role.permissions.length, defaultValue: '{{count}} permission(s) attribuee(s)' })}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 5).map((permId) => {
                      const perm = permissions.find((p) => p.id === permId);
                      return perm ? (
                        <span
                          key={permId}
                          className="px-2 py-0.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded"
                        >
                          {perm.name}
                        </span>
                      ) : null;
                    })}
                    {role.permissions.length > 5 && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {t('admin.roles.morePermissions', { count: role.permissions.length - 5, defaultValue: '+{{count}} de plus' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <span>{t('admin.roles.userCount', { count: role.userCount, defaultValue: '{{count}} utilisateur(s)' })}</span>
                  <span>{t('admin.roles.updatedAt', { date: formatDate(role.updatedAt), defaultValue: 'Mis a jour le {{date}}' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Permissions Reference */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('admin.roles.availablePermissions', 'Permissions disponibles')}</h2>

          <div className="space-y-6">
            {Object.entries(permissionsByCategory).map(([category, perms]) => (
              <div key={category}>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                  {category}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {perms.map((permission) => (
                    <div
                      key={permission.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{permission.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{permission.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Role Modal */}
      {isCreating && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSaving) { setIsCreating(false); setNewRole({ name: '', description: '', permissions: [] }); setNameError(null); } }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="createRoleTitle" ref={(el) => { if (el) { const input = el.querySelector<HTMLElement>('input'); input?.focus(); } }}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 id="createRoleTitle" className="text-xl font-semibold text-gray-900 dark:text-white">{t('admin.roles.createRole', 'Creer un role')}</h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label htmlFor="roleName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.roles.nameLabel', 'Nom du role')} <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="roleName"
                  value={newRole.name}
                  onChange={(e) => {
                    setNewRole({ ...newRole, name: e.target.value });
                    if (e.target.value.trim()) {
                      setNameError(null);
                    }
                  }}
                  onBlur={() => {
                    if (!newRole.name.trim()) {
                      setNameError(t('admin.roles.nameRequired', 'Le nom du role est requis'));
                    }
                  }}
                  required
                  aria-required="true"
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? 'roleName-error' : undefined}
                  placeholder={t('admin.roles.namePlaceholder', 'Ex: Chef de projet')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white ${nameError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                />
                {nameError && (
                  <p id="roleName-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{nameError}</p>
                )}
              </div>

              <div>
                <label htmlFor="roleDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.roles.descriptionLabel', 'Description')}
                </label>
                <textarea
                  id="roleDescription"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  rows={2}
                  placeholder={t('admin.roles.descriptionPlaceholder', 'Decrire les responsabilites du role...')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-none dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('admin.roles.permissions', 'Permissions')}
                </label>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category}>
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">{category}</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {perms.map((permission) => (
                          <label
                            key={permission.id}
                            className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                              newRole.permissions.includes(permission.id)
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={newRole.permissions.includes(permission.id)}
                              onChange={() => togglePermission(permission.id, 'new')}
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus-visible:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{permission.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.roles.permissionsSelected', { count: newRole.permissions.length, defaultValue: '{{count}} permission(s) selectionnee(s)' })}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewRole({ name: '', description: '', permissions: [] });
                  setNameError(null);
                }}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleCreateRole}
                disabled={isSaving || !newRole.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {t('admin.roles.create', 'Creer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onKeyDown={(e) => { if (e.key === 'Escape' && !isSaving) setEditingRole(null); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="editRoleTitle" ref={(el) => { if (el) { const input = el.querySelector<HTMLElement>('input'); input?.focus(); } }}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 id="editRoleTitle" className="text-xl font-semibold text-gray-900 dark:text-white">{t('admin.roles.editTitle', { name: editingRole.name, defaultValue: 'Modifier le role : {{name}}' })}</h2>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label htmlFor="editRoleName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.roles.nameLabel', 'Nom du role')} <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="editRoleName"
                  value={editingRole.name}
                  onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                  disabled={editingRole.isSystem}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-600 dark:bg-gray-700 dark:text-white"
                />
                {editingRole.isSystem && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('admin.roles.systemNameReadonly', 'Les noms des roles systeme ne peuvent pas etre modifies')}</p>
                )}
              </div>

              <div>
                <label htmlFor="editRoleDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('admin.roles.descriptionLabel', 'Description')}
                </label>
                <textarea
                  id="editRoleDescription"
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-none dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('admin.roles.permissions', 'Permissions')}
                </label>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category}>
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">{category}</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {perms.map((permission) => (
                          <label
                            key={permission.id}
                            className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                              editingRole.permissions.includes(permission.id)
                                ? 'bg-blue-50 dark:bg-blue-900/20'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={editingRole.permissions.includes(permission.id)}
                              onChange={() => togglePermission(permission.id, 'edit')}
                              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus-visible:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{permission.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.roles.permissionsSelected', { count: editingRole.permissions.length, defaultValue: '{{count}} permission(s) selectionnee(s)' })}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => setEditingRole(null)}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {t('admin.roles.saveChanges', 'Enregistrer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onKeyDown={(e) => { if (e.key === 'Escape') setDeleteConfirm(null); }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6" role="dialog" aria-modal="true" aria-labelledby="deleteRoleTitle" ref={(el) => { if (el) { const btn = el.querySelector<HTMLElement>('button'); btn?.focus(); } }}>
            <h2 id="deleteRoleTitle" className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('admin.deleteRole', 'Delete Role')}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('admin.roles.deleteConfirm', { name: deleteConfirm.name, defaultValue: 'Etes-vous sur de vouloir supprimer le role "{{name}}" ? Cette action est irreversible.' })}
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={confirmDeleteRole}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
              >
                {t('common.delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
