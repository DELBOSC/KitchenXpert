import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { logger } from '../../../services/logger';

interface UserProfileData {
  householdSize: number;
  cookingFrequency: 'rarely' | 'occasionally' | 'regularly' | 'daily';
  cookingExperience: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  dietaryPreferences: string[];
  specialNeeds: string[];
  primaryCook: string;
  entertainingFrequency: 'never' | 'occasionally' | 'monthly' | 'weekly';
}

interface FormErrors {
  householdSize?: string;
  primaryCook?: string;
}

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<UserProfileData>({
    householdSize: 2,
    cookingFrequency: 'regularly',
    cookingExperience: 'intermediate',
    dietaryPreferences: [],
    specialNeeds: [],
    primaryCook: '',
    entertainingFrequency: 'occasionally',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [aiTips, setAiTips] = useState<{ tips: string[]; warnings: string[]; suggestions: string[] } | null>(null);
  const [aiTipsLoading, setAiTipsLoading] = useState<boolean>(false);

  const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Halal',
    'Kosher',
    'Low-Carb',
    'Keto',
    'Paleo',
  ];

  const specialNeedsOptions = [
    'Wheelchair Accessible',
    'Lower Counter Heights',
    'Pull-Out Shelves',
    'Wide Aisles',
    'Easy-Grip Handles',
    'Voice-Activated Controls',
    'Enhanced Lighting',
    'Non-Slip Flooring',
  ];

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('questionnaire_userProfile');
    const timestamp = localStorage.getItem('questionnaire_timestamp');
    if (saved && timestamp) {
      try {
        const savedTime = parseInt(timestamp, 10);
        // Only restore if less than 24h old
        if (Date.now() - savedTime < 86400000) {
          const parsed = JSON.parse(saved) as UserProfileData;
          setFormData(parsed);
        } else {
          // Expired - clear all questionnaire data
          localStorage.removeItem('questionnaire_userProfile');
          localStorage.removeItem('questionnaire_spatialConstraints');
          localStorage.removeItem('questionnaire_stylePreferences');
          localStorage.removeItem('questionnaire_budgetPlanning');
          localStorage.removeItem('questionnaire_currentStep');
          localStorage.removeItem('questionnaire_timestamp');
        }
      } catch {
        // Invalid data, ignore
      }
    } else if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserProfileData;
        setFormData(parsed);
      } catch {
        // Invalid data, ignore
      }
    }
  }, []);

  // Save to localStorage on form data change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('questionnaire_userProfile', JSON.stringify(formData));
      localStorage.setItem('questionnaire_currentStep', '1');
      localStorage.setItem('questionnaire_timestamp', String(Date.now()));
    }
  }, [formData, isLoading]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchUserProfile = async (): Promise<void> => {
      try {
        const response = await fetch('/api/v1/questionnaire/user-profile', { credentials: 'include', signal: controller.signal });

        if (response.ok) {
          const result = await response.json();
          if (result.data) setFormData(result.data as UserProfileData);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        // If no existing profile, use defaults
        logger.debug('Failed to fetch user profile, using defaults', err instanceof Error ? { error: err.message } : { error: err });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
    return () => controller.abort();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (formData.householdSize < 1 || formData.householdSize > 20) {
      newErrors.householdSize = 'Household size must be between 1 and 20';
    }

    if (!formData.primaryCook.trim()) {
      newErrors.primaryCook = 'Please enter the primary cook name';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ): void => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
    }));

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleCheckboxChange = (
    category: 'dietaryPreferences' | 'specialNeeds',
    value: string
  ): void => {
    setFormData((prev) => {
      const currentValues = prev[category];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      return { ...prev, [category]: newValues };
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
      const response = await fetch('/api/v1/questionnaire/user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      // Fetch AI tips after successful save
      setAiTipsLoading(true);
      try {
        const tipsResponse = await fetch('/api/v1/questionnaire/user-profile/ai-tips', {
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

      navigate('/questionnaire/spatial');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{t('questionnaire.step', { current: 1, total: 4, defaultValue: 'Step 1 of 4' })}</span>
            <span className="text-sm text-gray-500">{t('questionnaire.userProfile', 'User Profile')}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: '25%' }}
              role="progressbar"
              aria-valuenow={1}
              aria-valuemin={0}
              aria-valuemax={4}
              aria-label={t('questionnaire.progressLabel', 'Questionnaire progress: step 1 of 4')}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('questionnaire.tellUsAboutYourself', 'Tell Us About Yourself')}</h1>
          <p className="text-gray-600 mb-6">
            {t('questionnaire.userProfileDesc', 'Help us understand your household and cooking habits to design the perfect kitchen.')}
          </p>

          {saveError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
              <p className="text-red-600">{saveError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Household Information */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('questionnaire.householdInfo', 'Household Information')}</h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="householdSize" className="block text-sm font-medium text-gray-700 mb-1">
                    Household Size <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="householdSize"
                    name="householdSize"
                    value={formData.householdSize}
                    onChange={handleInputChange}
                    min="1"
                    max="20"
                    aria-required="true"
                    aria-invalid={!!errors.householdSize}
                    aria-describedby={errors.householdSize ? 'householdSize-error' : undefined}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      errors.householdSize ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.householdSize && (
                    <p id="householdSize-error" className="mt-1 text-sm text-red-600" role="alert">{errors.householdSize}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="primaryCook" className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Cook <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="primaryCook"
                    name="primaryCook"
                    value={formData.primaryCook}
                    onChange={handleInputChange}
                    placeholder="Name of primary cook"
                    aria-required="true"
                    aria-invalid={!!errors.primaryCook}
                    aria-describedby={errors.primaryCook ? 'primaryCook-error' : undefined}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      errors.primaryCook ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {errors.primaryCook && (
                    <p id="primaryCook-error" className="mt-1 text-sm text-red-600" role="alert">{errors.primaryCook}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Cooking Habits */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('questionnaire.cookingHabits', 'Cooking Habits')}</h2>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="cookingFrequency" className="block text-sm font-medium text-gray-700 mb-1">
                    How often do you cook?
                  </label>
                  <select
                    id="cookingFrequency"
                    name="cookingFrequency"
                    value={formData.cookingFrequency}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white"
                  >
                    <option value="rarely">Rarely (few times a month)</option>
                    <option value="occasionally">Occasionally (1-2 times a week)</option>
                    <option value="regularly">Regularly (3-5 times a week)</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="cookingExperience" className="block text-sm font-medium text-gray-700 mb-1">
                    Cooking Experience Level
                  </label>
                  <select
                    id="cookingExperience"
                    name="cookingExperience"
                    value={formData.cookingExperience}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="professional">Professional Chef</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="entertainingFrequency" className="block text-sm font-medium text-gray-700 mb-1">
                    How often do you entertain guests?
                  </label>
                  <select
                    id="entertainingFrequency"
                    name="entertainingFrequency"
                    value={formData.entertainingFrequency}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white"
                  >
                    <option value="never">Never</option>
                    <option value="occasionally">Occasionally (few times a year)</option>
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Dietary Preferences */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('questionnaire.dietaryPreferences', 'Dietary Preferences')}</h2>
              <p className="text-sm text-gray-500 mb-4">Select all that apply to your household</p>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {dietaryOptions.map((option) => (
                  <label
                    key={option}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.dietaryPreferences.includes(option)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.dietaryPreferences.includes(option)}
                      onChange={() => handleCheckboxChange('dietaryPreferences', option)}
                      className="sr-only"
                    />
                    <span className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${
                      formData.dietaryPreferences.includes(option)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300'
                    }`}>
                      {formData.dietaryPreferences.includes(option) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Accessibility & Special Needs */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('questionnaire.accessibilityNeeds', 'Accessibility & Special Needs')}</h2>
              <p className="text-sm text-gray-500 mb-4">Select any special requirements for your kitchen</p>

              <div className="grid gap-3 sm:grid-cols-2">
                {specialNeedsOptions.map((option) => (
                  <label
                    key={option}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.specialNeeds.includes(option)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.specialNeeds.includes(option)}
                      onChange={() => handleCheckboxChange('specialNeeds', option)}
                      className="sr-only"
                    />
                    <span className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${
                      formData.specialNeeds.includes(option)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300'
                    }`}>
                      {formData.specialNeeds.includes(option) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* AI Tips */}
            {aiTipsLoading && (
              <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
                to="/dashboard"
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </Link>
              <button
                type="submit"
                disabled={isSaving}
                aria-busy={isSaving}
                className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isSaving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

export default UserProfile;
