import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';

import { logger } from '../../../services/logger';

interface SpatialData {
  roomWidth: number;
  roomLength: number;
  ceilingHeight: number;
  unit: 'meters' | 'feet';
  layoutType: 'galley' | 'l-shaped' | 'u-shaped' | 'island' | 'peninsula' | 'open';
  hasWindow: boolean;
  windowLocation: 'north' | 'south' | 'east' | 'west' | 'none';
  doorCount: number;
  existingFeatures: string[];
  plumbingLocation: 'flexible' | 'fixed-north' | 'fixed-south' | 'fixed-east' | 'fixed-west';
  electricalPanel: boolean;
  gasLine: boolean;
}

interface FormErrors {
  roomWidth?: string;
  roomLength?: string;
  ceilingHeight?: string;
}

const SpatialConstraints: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<SpatialData>({
    roomWidth: 0,
    roomLength: 0,
    ceilingHeight: 2.7,
    unit: 'meters',
    layoutType: 'l-shaped',
    hasWindow: true,
    windowLocation: 'south',
    doorCount: 1,
    existingFeatures: [],
    plumbingLocation: 'flexible',
    electricalPanel: false,
    gasLine: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [aiTips, setAiTips] = useState<{ tips: string[]; warnings: string[]; suggestions: string[] } | null>(null);
  const [aiTipsLoading, setAiTipsLoading] = useState<boolean>(false);

  const layoutOptions = [
    { value: 'galley', label: 'Galley', description: 'Two parallel counters' },
    { value: 'l-shaped', label: 'L-Shaped', description: 'Counters on two adjacent walls' },
    { value: 'u-shaped', label: 'U-Shaped', description: 'Counters on three walls' },
    { value: 'island', label: 'Island', description: 'Includes a center island' },
    { value: 'peninsula', label: 'Peninsula', description: 'L-shaped with extended counter' },
    { value: 'open', label: 'Open Plan', description: 'Connected to living area' },
  ];

  const existingFeatureOptions = [
    'Load-Bearing Wall',
    'Structural Column',
    'Floor Drain',
    'Skylight',
    'Built-in Pantry',
    'Chimney/Vent',
    'HVAC Duct',
    'Radiator',
  ];

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('questionnaire_spatialConstraints');
    const timestamp = localStorage.getItem('questionnaire_timestamp');
    if (saved && timestamp) {
      try {
        const savedTime = parseInt(timestamp, 10);
        if (Date.now() - savedTime < 86400000) {
          const parsed = JSON.parse(saved) as SpatialData;
          setFormData(parsed);
        } else {
          localStorage.removeItem('questionnaire_spatialConstraints');
        }
      } catch {
        // Invalid data, ignore
      }
    } else if (saved) {
      try {
        const parsed = JSON.parse(saved) as SpatialData;
        setFormData(parsed);
      } catch {
        // Invalid data, ignore
      }
    }
  }, []);

  // Save to localStorage on form data change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('questionnaire_spatialConstraints', JSON.stringify(formData));
      localStorage.setItem('questionnaire_currentStep', '2');
      localStorage.setItem('questionnaire_timestamp', String(Date.now()));
    }
  }, [formData, isLoading]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchSpatialData = async (): Promise<void> => {
      try {
        const response = await fetch('/api/v1/questionnaire/spatial-constraints', { credentials: 'include', signal: controller.signal });

        if (response.ok) {
          const result = await response.json();
          if (result.data) {setFormData(result.data as SpatialData);}
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        logger.debug('Failed to fetch spatial data, using defaults', err instanceof Error ? { error: err.message } : { error: err });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSpatialData();
    return () => controller.abort();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const minSize = formData.unit === 'meters' ? 1.5 : 5;
    const maxSize = formData.unit === 'meters' ? 30 : 100;
    const minHeight = formData.unit === 'meters' ? 2 : 6.5;
    const maxHeight = formData.unit === 'meters' ? 5 : 16;

    if (formData.roomWidth < minSize || formData.roomWidth > maxSize) {
      newErrors.roomWidth = `Width must be between ${minSize} and ${maxSize} ${formData.unit}`;
    }

    if (formData.roomLength < minSize || formData.roomLength > maxSize) {
      newErrors.roomLength = `Length must be between ${minSize} and ${maxSize} ${formData.unit}`;
    }

    if (formData.ceilingHeight < minHeight || formData.ceilingHeight > maxHeight) {
      newErrors.ceilingHeight = `Height must be between ${minHeight} and ${maxHeight} ${formData.unit}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value, type } = e.target;
    const target = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
      }));
    } else if (type === 'number') {
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

  const handleFeatureToggle = (feature: string): void => {
    setFormData((prev) => {
      const current = prev.existingFeatures;
      const updated = current.includes(feature)
        ? current.filter((f) => f !== feature)
        : [...current, feature];
      return { ...prev, existingFeatures: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch('/api/v1/questionnaire/spatial-constraints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save spatial constraints');
      }

      // Fetch AI tips after successful save
      setAiTipsLoading(true);
      try {
        const tipsResponse = await fetch('/api/v1/questionnaire/spatial-constraints/ai-tips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
        if (tipsResponse.ok) {
          const tipsResult = await tipsResponse.json();
          setAiTips(tipsResult.data);
        }
      } catch {
        /* AI tips are optional */
      } finally {
        setAiTipsLoading(false);
      }

      navigate('/questionnaire/style');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateArea = (): string => {
    const area = formData.roomWidth * formData.roomLength;
    return area.toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{t('questionnaire.step', { current: 2, total: 4, defaultValue: 'Step 2 of 4' })}</span>
            <span className="text-sm text-gray-500">{t('questionnaire.spatialConstraints', 'Spatial Constraints')}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: '50%' }}
              role="progressbar"
              aria-valuenow={2}
              aria-valuemin={0}
              aria-valuemax={4}
              aria-label={t('questionnaire.progressLabel', 'Questionnaire progress: step 2 of 4')}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('questionnaire.roomDimensions', 'Room Dimensions')}</h1>
          <p className="text-gray-600 mb-6">
            {t('questionnaire.roomDimensionsDesc', 'Enter your kitchen room dimensions and layout preferences.')}
          </p>

          {saveError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
              <p className="text-red-600">{saveError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Unit Selection */}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">
                Measurement Unit
              </span>
              <div className="flex gap-4">
                <label className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer ${
                  formData.unit === 'meters' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}>
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
                <label className={`flex items-center px-4 py-2 border rounded-lg cursor-pointer ${
                  formData.unit === 'feet' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}>
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
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Room Dimensions</h2>

              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <label htmlFor="roomWidth" className="block text-sm font-medium text-gray-700 mb-1">
                    Width ({formData.unit}) <span className="text-red-500">*</span>
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
                    aria-describedby={errors.roomWidth ? 'spatial-roomWidth-error' : undefined}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      errors.roomWidth ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.roomWidth && (
                    <p id="spatial-roomWidth-error" className="mt-1 text-sm text-red-600" role="alert">{errors.roomWidth}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="roomLength" className="block text-sm font-medium text-gray-700 mb-1">
                    Length ({formData.unit}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="roomLength"
                    name="roomLength"
                    value={formData.roomLength || ''}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    placeholder={formData.unit === 'meters' ? '5.0' : '16'}
                    aria-required="true"
                    aria-invalid={!!errors.roomLength}
                    aria-describedby={errors.roomLength ? 'spatial-roomLength-error' : undefined}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      errors.roomLength ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.roomLength && (
                    <p id="spatial-roomLength-error" className="mt-1 text-sm text-red-600" role="alert">{errors.roomLength}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="ceilingHeight" className="block text-sm font-medium text-gray-700 mb-1">
                    Ceiling Height ({formData.unit}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="ceilingHeight"
                    name="ceilingHeight"
                    value={formData.ceilingHeight || ''}
                    onChange={handleInputChange}
                    step="0.1"
                    min="0"
                    placeholder={formData.unit === 'meters' ? '2.7' : '9'}
                    aria-required="true"
                    aria-invalid={!!errors.ceilingHeight}
                    aria-describedby={errors.ceilingHeight ? 'spatial-ceilingHeight-error' : undefined}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      errors.ceilingHeight ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.ceilingHeight && (
                    <p id="spatial-ceilingHeight-error" className="mt-1 text-sm text-red-600" role="alert">{errors.ceilingHeight}</p>
                  )}
                </div>
              </div>

              {/* Area Display */}
              {formData.roomWidth > 0 && formData.roomLength > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Total Floor Area: <strong>{calculateArea()} {formData.unit === 'meters' ? 'sq m' : 'sq ft'}</strong>
                  </p>
                </div>
              )}
            </section>

            {/* Layout Type */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Preferred Layout</h2>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {layoutOptions.map((layout) => (
                  <label
                    key={layout.value}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      formData.layoutType === layout.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="layoutType"
                      value={layout.value}
                      checked={formData.layoutType === layout.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <p className="font-medium text-gray-900">{layout.label}</p>
                    <p className="text-sm text-gray-500">{layout.description}</p>
                  </label>
                ))}
              </div>
            </section>

            {/* Windows & Doors */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Windows & Doors</h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="hasWindow"
                      checked={formData.hasWindow}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus-visible:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Kitchen has window(s)</span>
                  </label>

                  {formData.hasWindow && (
                    <div className="mt-4">
                      <label htmlFor="windowLocation" className="block text-sm font-medium text-gray-700 mb-1">
                        Window Direction
                      </label>
                      <select
                        id="windowLocation"
                        name="windowLocation"
                        value={formData.windowLocation}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white"
                      >
                        <option value="north">North</option>
                        <option value="south">South</option>
                        <option value="east">East</option>
                        <option value="west">West</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="doorCount" className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Doors
                  </label>
                  <select
                    id="doorCount"
                    name="doorCount"
                    value={formData.doorCount}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white"
                  >
                    <option value={1}>1 door</option>
                    <option value={2}>2 doors</option>
                    <option value={3}>3 doors</option>
                    <option value={4}>4+ doors</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Utilities */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Utilities & Infrastructure</h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="plumbingLocation" className="block text-sm font-medium text-gray-700 mb-1">
                    Plumbing Location
                  </label>
                  <select
                    id="plumbingLocation"
                    name="plumbingLocation"
                    value={formData.plumbingLocation}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white"
                  >
                    <option value="flexible">Flexible (can be moved)</option>
                    <option value="fixed-north">Fixed - North wall</option>
                    <option value="fixed-south">Fixed - South wall</option>
                    <option value="fixed-east">Fixed - East wall</option>
                    <option value="fixed-west">Fixed - West wall</option>
                  </select>
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="electricalPanel"
                      checked={formData.electricalPanel}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus-visible:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Electrical panel in kitchen</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="gasLine"
                      checked={formData.gasLine}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus-visible:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Gas line available</span>
                  </label>
                </div>
              </div>
            </section>

            {/* Existing Features */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Existing Features</h2>
              <p className="text-sm text-gray-500 mb-4">Select any features that cannot be moved or removed</p>

              <div className="grid gap-3 sm:grid-cols-2">
                {existingFeatureOptions.map((feature) => (
                  <label
                    key={feature}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.existingFeatures.includes(feature)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.existingFeatures.includes(feature)}
                      onChange={() => handleFeatureToggle(feature)}
                      className="sr-only"
                    />
                    <span className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${
                      formData.existingFeatures.includes(feature)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300'
                    }`}>
                      {formData.existingFeatures.includes(feature) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-gray-700">{feature}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* AI Tips */}
            {aiTipsLoading && (
              <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                Analyse IA en cours...
              </div>
            )}
            {aiTips && (
              <div className="mt-6 space-y-3">
                {aiTips.tips.map((tip, i) => (
                  <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    <span className="font-medium">Conseil IA :</span> {tip}
                  </div>
                ))}
                {aiTips.warnings.map((w, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <span className="font-medium">Attention :</span> {w}
                  </div>
                ))}
                {aiTips.suggestions.map((s, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
                    <span className="font-medium">Suggestion :</span> {s}
                  </div>
                ))}
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-between pt-6 border-t border-gray-200">
              <Link
                to="/questionnaire"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('common.back', 'Back')}
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                aria-busy={isSaving}
                className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isSaving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                )}
                {isSaving ? t('common.saving', 'Enregistrement...') : t('common.continue', 'Continue')}
                {!isSaving && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SpatialConstraints;
