import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ProjectFormData {
  name: string;
  description: string;
  budget: {
    total: number;
    currency: string;
  };
  targetCompletionDate: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  budget?: string;
  targetCompletionDate?: string;
}

const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    budget: {
      total: 0,
      currency: 'USD',
    },
    targetCompletionDate: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const currencies = [
    { code: 'USD', symbol: '$', name: t('currency.usd', 'Dollar US') },
    { code: 'EUR', symbol: '€', name: t('currency.eur', 'Euro') },
    { code: 'GBP', symbol: '£', name: t('currency.gbp', 'Livre sterling') },
    { code: 'CAD', symbol: 'C$', name: t('currency.cad', 'Dollar canadien') },
    { code: 'AUD', symbol: 'A$', name: t('currency.aud', 'Dollar australien') },
  ];

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

    if (formData.budget.total < 0) {
      newErrors.budget = t('projects.validation.budgetNegative', 'Budget cannot be negative');
    }

    if (formData.targetCompletionDate) {
      const targetDate = new Date(formData.targetCompletionDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (targetDate < today) {
        newErrors.targetCompletionDate = t('projects.validation.datePast', 'Target date cannot be in the past');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;

    if (name === 'budgetTotal') {
      setFormData((prev) => ({
        ...prev,
        budget: {
          ...prev.budget,
          total: parseFloat(value) || 0,
        },
      }));
    } else if (name === 'budgetCurrency') {
      setFormData((prev) => ({
        ...prev,
        budget: {
          ...prev.budget,
          currency: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error when user starts typing
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

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          budget: formData.budget.total > 0 ? formData.budget : undefined,
          targetCompletionDate: formData.targetCompletionDate || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t('projects.createError', 'Failed to create project'));
      }

      const newProject = await response.json();
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('common.unexpectedError', 'An unexpected error occurred');
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <li className="text-gray-900 dark:text-white font-medium">{t('projects.createNew', 'Create New Project')}</li>
          </ol>
        </nav>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('projects.createNew', 'Create New Project')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('projects.createDescription', 'Start a new kitchen design project. You can add kitchens after creating the project.')}
          </p>

          {submitError && (
            <div className="p-3 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg" role="alert">
              <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
            </div>
          )}

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
                placeholder={t('projects.namePlaceholder', 'ex: Renovation cuisine moderne')}
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'create-name-error' : undefined}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors dark:bg-gray-700 dark:text-white ${
                  errors.name ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.name && (
                <p id="create-name-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors.name}</p>
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
                placeholder={t('projects.descriptionPlaceholder', 'Decrivez vos objectifs et besoins...')}
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'create-description-error' : undefined}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors resize-none dark:bg-gray-700 dark:text-white ${
                  errors.description ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              <div className="mt-1 flex justify-between">
                {errors.description ? (
                  <p id="create-description-error" className="text-sm text-red-600 dark:text-red-400" role="alert">{errors.description}</p>
                ) : (
                  <span />
                )}
                <span className="text-sm text-gray-400 dark:text-gray-500">
                  {formData.description.length}/500
                </span>
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('projects.budget', 'Budget (Optional)')}
              </label>
              <div className="flex gap-2">
                <select
                  name="budgetCurrency"
                  value={formData.budget.currency}
                  onChange={handleInputChange}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  name="budgetTotal"
                  value={formData.budget.total || ''}
                  onChange={handleInputChange}
                  placeholder={t('projects.budgetPlaceholder', 'Montant du budget')}
                  min="0"
                  step="100"
                  className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors dark:bg-gray-700 dark:text-white ${
                    errors.budget ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
              {errors.budget && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors.budget}</p>
              )}
            </div>

            {/* Target Completion Date */}
            <div>
              <label htmlFor="targetCompletionDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('projects.targetDate', 'Target Completion Date (Optional)')}
              </label>
              <input
                type="date"
                id="targetCompletionDate"
                name="targetCompletionDate"
                value={formData.targetCompletionDate}
                onChange={handleInputChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors dark:bg-gray-700 dark:text-white ${
                  errors.targetCompletionDate ? 'border-red-300 bg-red-50 dark:border-red-500 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.targetCompletionDate && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors.targetCompletionDate}</p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate('/projects')}
                disabled={isSubmitting}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isSubmitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {isSubmitting ? t('projects.creating', 'Creating...') : t('projects.createProject', 'Create Project')}
              </button>
            </div>
          </form>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">{t('projects.tips.title', 'Tips for a Great Project')}</h3>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>- {t('projects.tips.descriptiveName', 'Choose a descriptive name that reflects your design goals')}</li>
            <li>- {t('projects.tips.budgetInfo', 'Include budget information to help with material selection')}</li>
            <li>- {t('projects.tips.realisticDate', 'Set a realistic target date for project completion')}</li>
            <li>- {t('projects.tips.multipleKitchens', 'You can add multiple kitchens to a single project')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;
