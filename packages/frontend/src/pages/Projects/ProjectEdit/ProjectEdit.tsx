import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../components/ui/Toast';

interface ProjectFormData {
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  address: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  clientEmail?: string;
  clientPhone?: string;
}

const ProjectEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    status: 'draft',
    address: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const pendingNavigationRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const statusOptions: { value: ProjectFormData['status']; label: string; color: string }[] = [
    { value: 'draft', label: t('projects.status.draft', 'Draft'), color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    { value: 'in_progress', label: t('projects.status.in_progress', 'In Progress'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    { value: 'completed', label: t('projects.status.completed', 'Completed'), color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    { value: 'archived', label: t('projects.status.archived', 'Archived'), color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  ];

  useEffect(() => {
    const controller = new AbortController();

    const fetchProject = async (): Promise<void> => {
      if (!id) {
        setLoadError(t('projects.projectNotFound', 'Project not found'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(`/api/v1/projects/${id}`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 404) {
            setNotFound(true);
            setIsLoading(false);
            return;
          }
          throw new Error(t('projects.fetchError', 'Failed to load project'));
        }

        const data = await response.json();

        if (!mountedRef.current) return;

        setFormData({
          name: data.name || '',
          description: data.description || '',
          status: data.status || 'draft',
          address: data.address || '',
          clientName: data.clientName || '',
          clientEmail: data.clientEmail || '',
          clientPhone: data.clientPhone || '',
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const errorMessage = err instanceof Error ? err.message : t('projects.fetchError', 'Failed to load project');
        setLoadError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
    return () => controller.abort();
  }, [id, retryCount, t]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('projects.validation.nameRequired', 'Project name is required');
    } else if (formData.name.length < 3) {
      newErrors.name = t('projects.validation.nameMinLength', 'Project name must be at least 3 characters');
    } else if (formData.name.length > 100) {
      newErrors.name = t('projects.validation.nameMaxLength', 'Project name must be less than 100 characters');
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = t('projects.validation.descriptionMaxLength', 'Description must be less than 500 characters');
    }

    if (formData.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
      newErrors.clientEmail = t('projects.validation.invalidEmail', 'Please enter a valid email address');
    }

    if (formData.clientPhone && !/^[+\d\s()-]{7,20}$/.test(formData.clientPhone)) {
      newErrors.clientPhone = t('projects.validation.invalidPhone', 'Please enter a valid phone number');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Intercept browser back/refresh when form is dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setIsDirty(true);

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/v1/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          status: formData.status,
          address: formData.address.trim(),
          clientName: formData.clientName.trim(),
          clientEmail: formData.clientEmail.trim(),
          clientPhone: formData.clientPhone.trim(),
        }),
      });

      if (!mountedRef.current) return;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t('projects.updateError', 'Failed to update project'));
      }

      setIsDirty(false);
      toast.success(t('projects.updateSuccess', 'Project updated successfully'));
      navigate('/projects');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('common.unexpectedError', 'An unexpected error occurred');
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-8 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">404</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('common.resourceNotFound', 'Resource not found')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('common.resourceNotFoundDesc', 'The requested resource does not exist or has been deleted.')}</p>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('projects.backToProjects', 'Back to Projects')}
          </button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 dark:bg-gray-900">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-red-800 dark:text-red-400 text-lg font-semibold mb-2">{t('common.error', 'Error')}</h2>
          <p className="text-red-600 dark:text-red-300">{loadError}</p>
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              {t('projects.backToProjects', 'Back to Projects')}
            </button>
            <button
              onClick={() => { setLoadError(null); setRetryCount((c) => c + 1); }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              {t('common.tryAgain', 'Try Again')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <li>
              <Link to="/projects" className="hover:text-blue-600 dark:hover:text-blue-400">
                {t('nav.projects', 'Projects')}
              </Link>
            </li>
            <li>/</li>
            <li>
              <Link to={`/projects/${id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                {formData.name || t('projects.project', 'Project')}
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 dark:text-white font-medium">{t('common.edit', 'Edit')}</li>
          </ol>
        </nav>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('projects.editProject', 'Edit Project')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('projects.editDescription', 'Update your project details and settings.')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('projects.projectName', 'Project Name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={t('projects.namePlaceholder', 'e.g., Modern Kitchen Renovation')}
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.name ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common.description', 'Description')}
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder={t('projects.descriptionPlaceholder', 'Describe your project goals and requirements...')}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'description-error' : undefined}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.description ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              <div className="mt-1 flex justify-between">
                {errors.description ? (
                  <p id="description-error" className="text-sm text-red-600 dark:text-red-400" role="alert">{errors.description}</p>
                ) : (
                  <span />
                )}
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  {formData.description.length}/500
                </span>
              </div>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('projects.status.label', 'Status')}
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-gray-700 dark:text-white"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('projects.address', 'Address')}
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder={t('projects.addressPlaceholder', 'Project location address...')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Client Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{t('projects.clientInfo', 'Client Information')}</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('projects.clientName', 'Client Name')}
                  </label>
                  <input
                    type="text"
                    id="clientName"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    placeholder={t('projects.clientNamePlaceholder', 'Full name...')}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('projects.clientEmail', 'Client Email')}
                  </label>
                  <input
                    type="email"
                    id="clientEmail"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleInputChange}
                    placeholder={t('projects.clientEmailPlaceholder', 'email@example.com')}
                    aria-invalid={!!errors.clientEmail}
                    aria-describedby={errors.clientEmail ? 'clientEmail-error' : undefined}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors dark:bg-gray-700 dark:text-white ${
                      errors.clientEmail ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.clientEmail && (
                    <p id="clientEmail-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors.clientEmail}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('projects.clientPhone', 'Client Phone')}
                  </label>
                  <input
                    type="tel"
                    id="clientPhone"
                    name="clientPhone"
                    value={formData.clientPhone}
                    onChange={handleInputChange}
                    placeholder={t('projects.clientPhonePlaceholder', '+1 (555) 000-0000')}
                    aria-invalid={!!errors.clientPhone}
                    aria-describedby={errors.clientPhone ? 'clientPhone-error' : undefined}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors dark:bg-gray-700 dark:text-white ${
                      errors.clientPhone ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.clientPhone && (
                    <p id="clientPhone-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors.clientPhone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  if (isDirty) {
                    pendingNavigationRef.current = `/projects/${id}`;
                    setShowLeaveModal(true);
                  } else {
                    navigate(`/projects/${id}`);
                  }
                }}
                disabled={isSaving}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                aria-busy={isSaving}
                className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isSaving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {isSaving ? t('projects.saving', 'Saving...') : t('projects.saveChanges', 'Save Changes')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="leave-modal-title">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
            <h3 id="leave-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('common.unsavedChanges', 'Unsaved changes')}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{t('common.unsavedChangesMessage', 'You have unsaved changes. Are you sure you want to leave?')}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t('common.stay', 'Stay')}
              </button>
              <button
                onClick={() => {
                  setIsDirty(false);
                  setShowLeaveModal(false);
                  if (pendingNavigationRef.current) {
                    navigate(pendingNavigationRef.current);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {t('common.leave', 'Leave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectEdit;
