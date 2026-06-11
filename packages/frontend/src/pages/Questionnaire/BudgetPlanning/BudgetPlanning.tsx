import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';

import { logger } from '../../../services/logger';

interface BudgetData {
  totalBudget: number;
  currency: string;
  budgetFlexibility: 'strict' | 'moderate' | 'flexible';
  priorityAreas: string[];
  includeProfessionalFees: boolean;
  includeAppliances: boolean;
  includeLighting: boolean;
  includeFlooring: boolean;
  timeline: 'urgent' | 'standard' | 'flexible';
  financingNeeded: boolean;
  breakdown: {
    cabinets: number;
    countertops: number;
    appliances: number;
    labor: number;
    other: number;
  };
}

interface FormErrors {
  totalBudget?: string;
}

interface AiTips {
  tips: string[];
  warnings: string[];
  suggestions: string[];
  budgetReality?: {
    isRealistic: boolean;
    explanation: string;
    suggestedRange: { min: number; max: number };
  };
}

const BudgetPlanning: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [formData, setFormData] = useState<BudgetData>({
    totalBudget: 0,
    currency: 'EUR',
    budgetFlexibility: 'moderate',
    priorityAreas: [],
    includeProfessionalFees: true,
    includeAppliances: true,
    includeLighting: true,
    includeFlooring: true,
    timeline: 'standard',
    financingNeeded: false,
    breakdown: {
      cabinets: 35,
      countertops: 15,
      appliances: 25,
      labor: 15,
      other: 10,
    },
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [questionnaireSaved, setQuestionnaireSaved] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [aiTips, setAiTips] = useState<AiTips | null>(null);
  const [aiTipsLoading, setAiTipsLoading] = useState<boolean>(false);

  const currencies = [
    { code: 'USD', symbol: '$', name: t('questionnaire.budget.currencies.usd', 'US Dollar') },
    { code: 'EUR', symbol: '\u20AC', name: t('questionnaire.budget.currencies.eur', 'Euro') },
    { code: 'GBP', symbol: '\u00A3', name: t('questionnaire.budget.currencies.gbp', 'British Pound') },
    { code: 'CAD', symbol: 'C$', name: t('questionnaire.budget.currencies.cad', 'Canadian Dollar') },
    { code: 'AUD', symbol: 'A$', name: t('questionnaire.budget.currencies.aud', 'Australian Dollar') },
  ];

  const priorityOptions = [
    { id: 'storage', name: t('questionnaire.budget.priorities.storage', 'Maximum Storage'), icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4' },
    { id: 'appliances', name: t('questionnaire.budget.priorities.appliances', 'Premium Appliances'), icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'aesthetics', name: t('questionnaire.budget.priorities.aesthetics', 'Visual Appeal'), icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'workspace', name: t('questionnaire.budget.priorities.workspace', 'Counter Space'), icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
    { id: 'durability', name: t('questionnaire.budget.priorities.durability', 'Durability'), icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { id: 'eco', name: t('questionnaire.budget.priorities.eco', 'Eco-Friendly'), icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064' },
  ];

  const budgetRanges = [
    { min: 0, max: 15000, label: t('questionnaire.budget.ranges.budgetFriendly', 'Budget-Friendly'), description: t('questionnaire.budget.ranges.budgetFriendlyDesc', 'Essential updates with cost-effective materials') },
    { min: 15000, max: 35000, label: t('questionnaire.budget.ranges.midRange', 'Mid-Range'), description: t('questionnaire.budget.ranges.midRangeDesc', 'Quality materials and some premium features') },
    { min: 35000, max: 75000, label: t('questionnaire.budget.ranges.premium', 'Premium'), description: t('questionnaire.budget.ranges.premiumDesc', 'High-end materials and professional design') },
    { min: 75000, max: Infinity, label: t('questionnaire.budget.ranges.luxury', 'Luxury'), description: t('questionnaire.budget.ranges.luxuryDesc', 'Top-tier everything with custom features') },
  ];

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('questionnaire_budgetPlanning');
    const timestamp = localStorage.getItem('questionnaire_timestamp');
    if (saved && timestamp) {
      try {
        const savedTime = parseInt(timestamp, 10);
        if (Date.now() - savedTime < 86400000) {
          const parsed = JSON.parse(saved) as BudgetData;
          setFormData(parsed);
        } else {
          localStorage.removeItem('questionnaire_budgetPlanning');
        }
      } catch {
        // Invalid data, ignore
      }
    } else if (saved) {
      try {
        const parsed = JSON.parse(saved) as BudgetData;
        setFormData(parsed);
      } catch {
        // Invalid data, ignore
      }
    }
  }, []);

  // Save to localStorage on form data change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('questionnaire_budgetPlanning', JSON.stringify(formData));
      localStorage.setItem('questionnaire_currentStep', '4');
      localStorage.setItem('questionnaire_timestamp', String(Date.now()));
    }
  }, [formData, isLoading]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchBudgetData = async (): Promise<void> => {
      try {
        const response = await fetch('/api/v1/questionnaire/budget-planning', {
          credentials: 'include',
          signal: controller.signal,
        });

        if (response.ok) {
          const result = (await response.json()) as { data?: BudgetData };
          if (result.data) {setFormData(result.data);}
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        logger.debug('Failed to fetch budget data, using defaults', err instanceof Error ? { error: err.message } : { error: err });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchBudgetData();
    return () => controller.abort();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (formData.totalBudget <= 0) {
      newErrors.totalBudget = t('questionnaire.budget.errors.invalidBudget', 'Please enter a valid budget amount');
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
      setFormData((prev) => ({ ...prev, [name]: target.checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handlePriorityToggle = (priority: string): void => {
    setFormData((prev) => {
      const current = prev.priorityAreas;
      const updated = current.includes(priority)
        ? current.filter((p) => p !== priority)
        : [...current, priority].slice(0, 3); // Max 3 priorities
      return { ...prev, priorityAreas: updated };
    });
  };

  const handleBreakdownChange = (category: keyof BudgetData['breakdown'], value: number): void => {
    setFormData((prev) => ({
      ...prev,
      breakdown: {
        ...prev.breakdown,
        [category]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch('/api/v1/questionnaire/budget-planning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(t('questionnaire.budget.errors.saveFailed', 'Failed to save budget plan'));
      }

      // Fetch AI tips after successful save
      setAiTipsLoading(true);
      try {
        const tipsResponse = await fetch('/api/v1/questionnaire/budget-planning/ai-tips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
        if (tipsResponse.ok) {
          const tipsResult = (await tipsResponse.json()) as { data?: AiTips };
          if (tipsResult.data) {setAiTips(tipsResult.data);}
        }
      } catch {
        /* AI tips are optional */
      } finally {
        setAiTipsLoading(false);
      }

      // Clear all questionnaire localStorage data on completion
      localStorage.removeItem('questionnaire_userProfile');
      localStorage.removeItem('questionnaire_spatialConstraints');
      localStorage.removeItem('questionnaire_stylePreferences');
      localStorage.removeItem('questionnaire_budgetPlanning');
      localStorage.removeItem('questionnaire_currentStep');
      localStorage.removeItem('questionnaire_timestamp');

      // Mark questionnaire as saved, show generate button
      setQuestionnaireSaved(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('common.unexpectedError', 'An unexpected error occurred');
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateDesigns = async (): Promise<void> => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const response = await fetch('/api/v1/questionnaire/auto-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(
          errorData.error ||
          t('questionnaire.budget.errors.generateFailed', 'Failed to generate designs'),
        );
      }

      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        data?: { designs: unknown; generationId: unknown };
      };
      if (result.success && result.data) {
        navigate('/questionnaire/results', {
          state: {
            designs: result.data.designs,
            generationId: result.data.generationId,
          },
        });
      } else {
        throw new Error(result.error || t('common.unexpectedError', 'An unexpected error occurred'));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('common.unexpectedError', 'An unexpected error occurred');
      setGenerateError(errorMessage);
      logger.error('Auto-generate designs failed', err instanceof Error ? { error: err.message } : { error: err });
    } finally {
      setIsGenerating(false);
    }
  };

  const getCurrentBudgetRange = (): typeof budgetRanges[0] | undefined => {
    return budgetRanges.find(
      (range) => formData.totalBudget >= range.min && formData.totalBudget < range.max
    );
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: formData.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateBreakdownAmount = (percentage: number): number => {
    return (formData.totalBudget * percentage) / 100;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" role="status" aria-label={t('common.loading', 'Loading')} />
      </div>
    );
  }

  const currentRange = getCurrentBudgetRange();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('questionnaire.step', { current: 4, total: 4, defaultValue: 'Step 4 of 4' })}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('questionnaire.budgetPlanning', 'Budget Planning')}</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: '100%' }}
              role="progressbar"
              aria-valuenow={4}
              aria-valuemin={0}
              aria-valuemax={4}
              aria-label={t('questionnaire.progressLabel', 'Questionnaire progress: step 4 of 4')}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-700/30 p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('questionnaire.budget.title', 'Budget Planning')}</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {t('questionnaire.budget.subtitle', 'Define your budget and spending priorities for your kitchen renovation.')}
          </p>

          {saveError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg" role="alert">
              <p className="text-red-600 dark:text-red-300">{saveError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Total Budget */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('questionnaire.budget.totalBudget', 'Total Budget')}</h2>

              <div className="flex gap-4">
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.code}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  name="totalBudget"
                  value={formData.totalBudget || ''}
                  onChange={handleInputChange}
                  placeholder={t('questionnaire.budget.enterBudget', 'Enter your total budget')}
                  min="0"
                  step="1000"
                  className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.totalBudget ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
              {errors.totalBudget && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors.totalBudget}</p>
              )}

              {currentRange && formData.totalBudget > 0 && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <p className="font-medium text-blue-900 dark:text-blue-300">{t('questionnaire.budget.kitchenType', '{{range}} Kitchen', { range: currentRange.label })}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">{currentRange.description}</p>
                </div>
              )}
            </section>

            {/* Budget Flexibility */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('questionnaire.budget.flexibility', 'Budget Flexibility')}</h2>

              <div className="grid gap-4 md:grid-cols-3">
                {(['strict', 'moderate', 'flexible'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, budgetFlexibility: level }))}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.budgetFlexibility === level
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{t(`questionnaire.budget.flexibilityLevel.${level}`, level)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {level === 'strict' && t('questionnaire.budget.flexibilityDesc.strict', 'Cannot exceed budget')}
                      {level === 'moderate' && t('questionnaire.budget.flexibilityDesc.moderate', 'Up to 10-15% over if needed')}
                      {level === 'flexible' && t('questionnaire.budget.flexibilityDesc.flexible', 'Budget is a guideline')}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {/* Priority Areas */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('questionnaire.budget.priorityAreas', 'Priority Areas')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('questionnaire.budget.priorityAreasDesc', 'Select up to 3 priorities for your budget allocation')}</p>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {priorityOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handlePriorityToggle(option.id)}
                    disabled={!formData.priorityAreas.includes(option.id) && formData.priorityAreas.length >= 3}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.priorityAreas.includes(option.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    <svg className={`w-6 h-6 mb-2 ${formData.priorityAreas.includes(option.id) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={option.icon} />
                    </svg>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{option.name}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* What's Included */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('questionnaire.budget.budgetIncludes', 'Budget Includes')}</h2>

              <div className="space-y-3">
                {[
                  { name: 'includeProfessionalFees', label: t('questionnaire.budget.includes.professionalFees', 'Professional design & installation fees') },
                  { name: 'includeAppliances', label: t('questionnaire.budget.includes.appliances', 'New appliances') },
                  { name: 'includeLighting', label: t('questionnaire.budget.includes.lighting', 'Lighting fixtures') },
                  { name: 'includeFlooring', label: t('questionnaire.budget.includes.flooring', 'Flooring replacement') },
                ].map((item) => (
                  <label key={item.name} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name={item.name}
                      checked={formData[item.name as keyof BudgetData] as boolean}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus-visible:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Budget Breakdown */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('questionnaire.budget.breakdown', 'Budget Breakdown')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('questionnaire.budget.breakdownDesc', 'Adjust the percentage allocation for each category')}</p>

              <div className="space-y-4">
                {[
                  { key: 'cabinets', label: t('questionnaire.budget.categories.cabinets', 'Cabinets & Storage') },
                  { key: 'countertops', label: t('questionnaire.budget.categories.countertops', 'Countertops') },
                  { key: 'appliances', label: t('questionnaire.budget.categories.appliances', 'Appliances') },
                  { key: 'labor', label: t('questionnaire.budget.categories.labor', 'Labor & Installation') },
                  { key: 'other', label: t('questionnaire.budget.categories.other', 'Other (permits, contingency)') },
                ].map((category) => (
                  <div key={category.key} className="flex items-center gap-4">
                    <div className="w-40 text-sm text-gray-700 dark:text-gray-300">{category.label}</div>
                    <div className="flex-1">
                      <input
                        type="range"
                        min="0"
                        max="50"
                        value={formData.breakdown[category.key as keyof BudgetData['breakdown']]}
                        onChange={(e) => handleBreakdownChange(category.key as keyof BudgetData['breakdown'], parseInt(e.target.value))}
                        aria-label={category.label}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <div className="w-16 text-sm text-gray-700 dark:text-gray-300 text-right">
                      {formData.breakdown[category.key as keyof BudgetData['breakdown']]}%
                    </div>
                    <div className="w-24 text-sm text-gray-500 dark:text-gray-400 text-right">
                      {formatCurrency(calculateBreakdownAmount(formData.breakdown[category.key as keyof BudgetData['breakdown']]))}
                    </div>
                  </div>
                ))}

                {/* Total percentage warning */}
                {Object.values(formData.breakdown).reduce((a, b) => a + b, 0) !== 100 && (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
                    {t('questionnaire.budget.percentageWarning', 'Note: Percentages total {{total}}% (should equal 100%)', { total: Object.values(formData.breakdown).reduce((a, b) => a + b, 0) })}
                  </p>
                )}
              </div>
            </section>

            {/* Timeline */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{t('questionnaire.budget.timeline', 'Project Timeline')}</h2>

              <div className="grid gap-4 md:grid-cols-3">
                {([
                  { value: 'urgent', label: t('questionnaire.budget.timelineOptions.urgent', 'Urgent'), description: t('questionnaire.budget.timelineOptions.urgentDesc', '1-2 months') },
                  { value: 'standard', label: t('questionnaire.budget.timelineOptions.standard', 'Standard'), description: t('questionnaire.budget.timelineOptions.standardDesc', '2-4 months') },
                  { value: 'flexible', label: t('questionnaire.budget.timelineOptions.flexible', 'Flexible'), description: t('questionnaire.budget.timelineOptions.flexibleDesc', '4+ months') },
                ] as const).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, timeline: option.value }))}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      formData.timeline === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{option.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Financing */}
            <section>
              <label htmlFor="financingNeeded" aria-label={t('questionnaire.budget.financing', "I'm interested in financing options")} className="flex items-center gap-3 cursor-pointer p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <input
                  id="financingNeeded"
                  type="checkbox"
                  name="financingNeeded"
                  checked={formData.financingNeeded}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus-visible:ring-blue-500"
                />
                <span>
                  <span className="block font-medium text-gray-900 dark:text-white">{t('questionnaire.budget.financing', "I'm interested in financing options")}</span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400">{t('questionnaire.budget.financingDesc', "We'll provide information about available financing plans")}</span>
                </span>
              </label>
            </section>

            {/* AI Tips */}
            {aiTipsLoading && (
              <div className="mt-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" role="status" aria-label={t('questionnaire.aiAnalysisLoading', 'AI analysis loading...')} />
                  {t('questionnaire.aiAnalysisLoading', 'AI analysis loading...')}
                </div>
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                </div>
              </div>
            )}
            {aiTips && (
              <div className="mt-6 space-y-3">
                {aiTips.budgetReality && (
                  <div className={`border rounded-lg p-4 text-sm ${
                    aiTips.budgetReality.isRealistic
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                      : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                  }`}>
                    <p className="font-medium mb-1">
                      {aiTips.budgetReality.isRealistic ? t('questionnaire.budget.aiRealistic', 'Realistic budget') : t('questionnaire.budget.aiUnrealistic', 'Budget needs revision')}
                    </p>
                    <p>{aiTips.budgetReality.explanation}</p>
                    <p className="mt-1 text-xs">
                      {t('questionnaire.budget.suggestedRange', 'Suggested range: {{min}} - {{max}}', { min: aiTips.budgetReality.suggestedRange.min.toLocaleString(i18n.language), max: aiTips.budgetReality.suggestedRange.max.toLocaleString(i18n.language) })}
                    </p>
                  </div>
                )}
                {aiTips.tips.map((tip, i) => (
                  <div key={i} className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                    <span className="font-medium">{t('questionnaire.budget.aiTip', 'AI Tip')}:</span> {tip}
                  </div>
                ))}
                {aiTips.warnings.map((w, i) => (
                  <div key={i} className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-medium">{t('questionnaire.budget.aiWarning', 'Warning')}:</span> {w}
                  </div>
                ))}
                {aiTips.suggestions.map((s, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{t('questionnaire.budget.aiSuggestion', 'Suggestion')}:</span> {s}
                  </div>
                ))}
              </div>
            )}

            {/* Generate Designs Section (shown after questionnaire is saved) */}
            {questionnaireSaved && (
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {t('questionnaire.budget.generateTitle', 'Questionnaire complete !')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
                    {t('questionnaire.budget.generateDescription', 'Notre IA va analyser vos reponses et generer 3 concepts de cuisine a differents niveaux de budget (Economique, Confort, Premium).')}
                  </p>

                  {generateError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-300" role="alert">
                      {generateError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleGenerateDesigns}
                    disabled={isGenerating}
                    aria-busy={isGenerating}
                    className={`px-8 py-3 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto ${
                      isGenerating ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {isGenerating && (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    )}
                    {isGenerating
                      ? t('questionnaire.budget.generating', 'Generation en cours...')
                      : t('questionnaire.budget.generateButton', 'Generer mes 3 cuisines')
                    }
                    {!isGenerating && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                  </button>

                  <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                    {t('questionnaire.budget.generateNote', 'Cela peut prendre 15-30 secondes')}
                  </p>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/questionnaire/style"
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t('common.back', 'Back')}
              </Link>
              {!questionnaireSaved ? (
                <button
                  type="submit"
                  disabled={isSaving}
                  aria-busy={isSaving}
                  className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isSaving && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  )}
                  {isSaving ? t('common.saving', 'Saving...') : t('questionnaire.completeQuestionnaire', 'Complete Questionnaire')}
                  {!isSaving && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/questionnaire/results')}
                  className="px-6 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  {t('questionnaire.budget.skipGenerate', 'Voir les resultats')}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BudgetPlanning;
