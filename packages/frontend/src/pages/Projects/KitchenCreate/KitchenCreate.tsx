import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { useToast } from '../../../components/ui/Toast';

interface KitchenFormData {
  name: string;
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  unit: 'meters' | 'feet';
  style: string;
}

interface FormErrors {
  name?: string;
  roomWidth?: string;
  roomDepth?: string;
  roomHeight?: string;
  style?: string;
}

const KitchenCreate: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  const [formData, setFormData] = useState<KitchenFormData>({
    name: '',
    roomWidth: 0,
    roomDepth: 0,
    roomHeight: 2.7,
    unit: 'meters',
    style: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [projectName, setProjectName] = useState<string>('');
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(true);
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const styleOptions = [
    {
      id: 'modern',
      name: t('kitchens.styles.modern', 'Modern'),
      description: 'Clean lines, minimal ornamentation',
    },
    {
      id: 'traditional',
      name: t('kitchens.styles.traditional', 'Traditional'),
      description: 'Classic details, warm tones',
    },
    {
      id: 'contemporary',
      name: t('kitchens.styles.contemporary', 'Contemporary'),
      description: 'Current trends, bold accents',
    },
    {
      id: 'transitional',
      name: t('kitchens.styles.transitional', 'Transitional'),
      description: 'Blend of traditional and modern',
    },
    {
      id: 'farmhouse',
      name: t('kitchens.styles.farmhouse', 'Farmhouse'),
      description: 'Rustic, cozy, natural materials',
    },
    {
      id: 'industrial',
      name: t('kitchens.styles.industrial', 'Industrial'),
      description: 'Raw materials, urban aesthetic',
    },
    {
      id: 'scandinavian',
      name: t('kitchens.styles.scandinavian', 'Scandinavian'),
      description: 'Light, airy, functional',
    },
    {
      id: 'mediterranean',
      name: t('kitchens.styles.mediterranean', 'Mediterranean'),
      description: 'Warm colors, ornate details',
    },
  ];

  // Fetch project name for breadcrumb
  useEffect(() => {
    const controller = new AbortController();

    const fetchProject = async (): Promise<void> => {
      if (!projectId) {
        setIsLoadingProject(false);
        return;
      }

      try {
        const response = await fetch(`/api/v1/projects/${projectId}`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (response.ok) {
          const data = (await response.json()) as { name?: string };
          if (mountedRef.current) {
            setProjectName(data.name ?? '');
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        // Non-critical: just continue without project name
      } finally {
        if (mountedRef.current) {
          setIsLoadingProject(false);
        }
      }
    };

    void fetchProject();
    return () => controller.abort();
  }, [projectId]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const minSize = formData.unit === 'meters' ? 1.5 : 5;
    const maxSize = formData.unit === 'meters' ? 30 : 100;
    const minHeight = formData.unit === 'meters' ? 2 : 6.5;
    const maxHeight = formData.unit === 'meters' ? 5 : 16;

    if (!formData.name.trim()) {
      newErrors.name = t('kitchens.validation.nameRequired', 'Kitchen name is required');
    } else if (formData.name.length < 2) {
      newErrors.name = t(
        'kitchens.validation.nameMinLength',
        'Kitchen name must be at least 2 characters'
      );
    } else if (formData.name.length > 100) {
      newErrors.name = t(
        'kitchens.validation.nameMaxLength',
        'Kitchen name must be less than 100 characters'
      );
    }

    if (formData.roomWidth < minSize || formData.roomWidth > maxSize) {
      newErrors.roomWidth = `Width must be between ${minSize} and ${maxSize} ${formData.unit}`;
    }

    if (formData.roomDepth < minSize || formData.roomDepth > maxSize) {
      newErrors.roomDepth = `Depth must be between ${minSize} and ${maxSize} ${formData.unit}`;
    }

    if (formData.roomHeight < minHeight || formData.roomHeight > maxHeight) {
      newErrors.roomHeight = `Height must be between ${minHeight} and ${maxHeight} ${formData.unit}`;
    }

    if (!formData.style) {
      newErrors.style = t('kitchens.validation.styleRequired', 'Please select a kitchen style');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [name]: parseFloat(value) || 0,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleStyleSelect = (styleId: string): void => {
    setFormData((prev) => ({ ...prev, style: styleId }));
    if (errors.style) {
      setErrors((prev) => ({ ...prev, style: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/v1/kitchens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          projectId,
          name: formData.name.trim(),
          dimensions: {
            width: formData.roomWidth,
            depth: formData.roomDepth,
            height: formData.roomHeight,
          },
          unit: formData.unit,
          style: formData.style,
        }),
      });

      if (!mountedRef.current) {
        return;
      }

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(errorData.message ?? t('kitchens.createError', 'Failed to create kitchen'));
      }

      const newKitchen = (await response.json()) as { id?: string; data?: { id?: string } };
      toast.success(t('kitchens.createSuccess', 'Kitchen created successfully'));

      // Navigate to the kitchen designer page
      navigate(`/designer/${newKitchen.id ?? newKitchen.data?.id ?? ''}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : t('common.unexpectedError', 'An unexpected error occurred');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateArea = (): string => {
    const area = formData.roomWidth * formData.roomDepth;
    return area.toFixed(1);
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
            <li>
              <Link
                to={`/projects/${projectId}`}
                className="hover:text-blue-600 dark:hover:text-blue-400"
              >
                {isLoadingProject ? '...' : projectName || t('projects.project', 'Project')}
              </Link>
            </li>
            <li>/</li>
            <li className="text-gray-900 dark:text-white font-medium">
              {t('kitchens.createKitchen', 'New Kitchen')}
            </li>
          </ol>
        </nav>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('kitchens.createNew', 'Create New Kitchen')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t(
              'kitchens.createDescription',
              'Define the kitchen space dimensions and design style. You can refine details in the designer.'
            )}
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Kitchen Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('kitchens.kitchenName', 'Kitchen Name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Main Kitchen, Guest Kitchenette..."
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'kitchen-name-error' : undefined}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors ${
                  errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.name && (
                <p id="kitchen-name-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Unit Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('kitchens.measurementUnit', 'Measurement Unit')}
              </label>
              <div className="flex gap-4">
                <label
                  className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer ${
                    formData.unit === 'meters'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="unit"
                    value="meters"
                    checked={formData.unit === 'meters'}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <span className="text-sm">Meters (m)</span>
                </label>
                <label
                  className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer ${
                    formData.unit === 'feet'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="unit"
                    value="feet"
                    checked={formData.unit === 'feet'}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  <span className="text-sm">Feet (ft)</span>
                </label>
              </div>
            </div>

            {/* Room Dimensions */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                {t('kitchens.roomDimensions', 'Room Dimensions')}{' '}
                <span className="text-red-500">*</span>
              </h2>

              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <label
                    htmlFor="roomWidth"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('kitchens.width', 'Width')} ({formData.unit})
                  </label>
                  <input
                    type="number"
                    id="roomWidth"
                    name="roomWidth"
                    value={formData.roomWidth || ''}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    placeholder={formData.unit === 'meters' ? '4.0' : '13'}
                    aria-required="true"
                    aria-invalid={!!errors.roomWidth}
                    aria-describedby={errors.roomWidth ? 'roomWidth-error' : undefined}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      errors.roomWidth ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.roomWidth && (
                    <p id="roomWidth-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.roomWidth}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="roomDepth"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('kitchens.depth', 'Depth')} ({formData.unit})
                  </label>
                  <input
                    type="number"
                    id="roomDepth"
                    name="roomDepth"
                    value={formData.roomDepth || ''}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    placeholder={formData.unit === 'meters' ? '5.0' : '16'}
                    aria-required="true"
                    aria-invalid={!!errors.roomDepth}
                    aria-describedby={errors.roomDepth ? 'roomDepth-error' : undefined}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      errors.roomDepth ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.roomDepth && (
                    <p id="roomDepth-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.roomDepth}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="roomHeight"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    {t('kitchens.height', 'Height')} ({formData.unit})
                  </label>
                  <input
                    type="number"
                    id="roomHeight"
                    name="roomHeight"
                    value={formData.roomHeight || ''}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    placeholder={formData.unit === 'meters' ? '2.7' : '9'}
                    aria-required="true"
                    aria-invalid={!!errors.roomHeight}
                    aria-describedby={errors.roomHeight ? 'roomHeight-error' : undefined}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      errors.roomHeight ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.roomHeight && (
                    <p id="roomHeight-error" className="mt-1 text-sm text-red-600" role="alert">
                      {errors.roomHeight}
                    </p>
                  )}
                </div>
              </div>

              {/* Area Display */}
              {formData.roomWidth > 0 && formData.roomDepth > 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {t('kitchens.totalFloorArea', 'Total Floor Area')}:{' '}
                    <strong>
                      {calculateArea()} {formData.unit === 'meters' ? 'sq m' : 'sq ft'}
                    </strong>
                  </p>
                </div>
              )}
            </section>

            {/* Kitchen Style */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                {t('kitchens.designStyle', 'Design Style')} <span className="text-red-500">*</span>
              </h2>
              {errors.style && (
                <p className="mb-3 text-sm text-red-600" role="alert">
                  {errors.style}
                </p>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {styleOptions.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => handleStyleSelect(style.id)}
                    className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                      formData.style === style.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded mb-3 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                      {style.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {style.description}
                    </p>
                    {formData.style === style.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}`)}
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                )}
                {isSubmitting
                  ? t('kitchens.creating', 'Creation en cours...')
                  : t('kitchens.createAndDesign', 'Create & Open Designer')}
              </button>
            </div>
          </form>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
            {t('kitchens.tips.title', 'Tips for Kitchen Setup')}
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>
              -{' '}
              {t(
                'kitchens.tips.accurateMeasure',
                'Measure your room accurately for the best design results'
              )}
            </li>
            <li>
              -{' '}
              {t(
                'kitchens.tips.ceilingHeight',
                'Include the actual ceiling height for proper cabinet planning'
              )}
            </li>
            <li>
              -{' '}
              {t(
                'kitchens.tips.styleFlexible',
                'Your style choice guides AI suggestions but can be adjusted later'
              )}
            </li>
            <li>
              -{' '}
              {t(
                'kitchens.tips.designerEdit',
                'All dimensions and details can be refined in the 3D designer'
              )}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default KitchenCreate;
