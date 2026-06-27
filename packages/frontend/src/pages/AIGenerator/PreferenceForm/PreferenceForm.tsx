import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

import { logger } from '../../../services/logger';

interface AIPreferences {
  projectId: string;
  kitchenStyle: string;
  colorPalette: string[];
  layoutPreference: string;
  applianceGrade: 'standard' | 'premium' | 'professional';
  storageEmphasis: 'minimal' | 'moderate' | 'maximum';
  lightingMood: 'bright' | 'warm' | 'dramatic' | 'natural';
  numberOfDesigns: number;
  includeIsland: boolean;
  includeBreakfastNook: boolean;
  includePantry: boolean;
  sustainableOptions: boolean;
  smartHomeIntegration: boolean;
  additionalRequirements: string;
}

const PreferenceForm: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [preferences, setPreferences] = useState<AIPreferences>({
    projectId: projectId || '',
    kitchenStyle: 'modern',
    colorPalette: [],
    layoutPreference: 'open',
    applianceGrade: 'premium',
    storageEmphasis: 'moderate',
    lightingMood: 'bright',
    numberOfDesigns: 3,
    includeIsland: true,
    includeBreakfastNook: false,
    includePantry: true,
    sustainableOptions: false,
    smartHomeIntegration: false,
    additionalRequirements: '',
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasQuestionnaire, setHasQuestionnaire] = useState<boolean | null>(null);
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const styleOptions = useMemo(
    () => [
      {
        id: 'modern',
        name: t('pref.styles.modern', 'Modern'),
        description: t('pref.styles.modern.desc', 'Sleek lines, minimalist design'),
      },
      {
        id: 'traditional',
        name: t('pref.styles.traditional', 'Traditional'),
        description: t('pref.styles.traditional.desc', 'Classic elegance, ornate details'),
      },
      {
        id: 'transitional',
        name: t('pref.styles.transitional', 'Transitional'),
        description: t('pref.styles.transitional.desc', 'Best of both worlds'),
      },
      {
        id: 'farmhouse',
        name: t('pref.styles.farmhouse', 'Farmhouse'),
        description: t('pref.styles.farmhouse.desc', 'Rustic charm, warm materials'),
      },
      {
        id: 'industrial',
        name: t('pref.styles.industrial', 'Industrial'),
        description: t('pref.styles.industrial.desc', 'Raw materials, urban feel'),
      },
      {
        id: 'scandinavian',
        name: t('pref.styles.scandinavian', 'Scandinavian'),
        description: t('pref.styles.scandinavian.desc', 'Light, airy, functional'),
      },
    ],
    [t]
  );

  const colorOptions = useMemo(
    () => [
      { id: 'white', name: t('pref.colors.white', 'White'), color: '#FFFFFF' },
      { id: 'gray', name: t('pref.colors.gray', 'Gray'), color: '#9E9E9E' },
      { id: 'black', name: t('pref.colors.black', 'Black'), color: '#212121' },
      { id: 'navy', name: t('pref.colors.navy', 'Navy'), color: '#1A237E' },
      { id: 'sage', name: t('pref.colors.sage', 'Sage'), color: '#8BC34A' },
      { id: 'terracotta', name: t('pref.colors.terracotta', 'Terracotta'), color: '#D84315' },
      { id: 'natural-wood', name: t('pref.colors.naturalWood', 'Natural Wood'), color: '#8D6E63' },
      { id: 'cream', name: t('pref.colors.cream', 'Cream'), color: '#FFFDE7' },
    ],
    [t]
  );

  const layoutOptions = useMemo(
    () => [
      {
        id: 'galley',
        name: t('pref.layouts.galley', 'Galley'),
        description: t('pref.layouts.galley.desc', 'Efficient parallel layout'),
      },
      {
        id: 'l-shaped',
        name: t('pref.layouts.lShaped', 'L-Shaped'),
        description: t('pref.layouts.lShaped.desc', 'Corner configuration'),
      },
      {
        id: 'u-shaped',
        name: t('pref.layouts.uShaped', 'U-Shaped'),
        description: t('pref.layouts.uShaped.desc', 'Three-wall wrap-around'),
      },
      {
        id: 'open',
        name: t('pref.layouts.open', 'Open Plan'),
        description: t('pref.layouts.open.desc', 'Connected living space'),
      },
    ],
    [t]
  );

  useEffect(() => {
    const controller = new AbortController();
    const fetchExistingPreferences = async (): Promise<void> => {
      if (!projectId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/v1/ai-generator/preferences/${projectId}`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (response.ok) {
          const result = (await response.json()) as { data?: AIPreferences };
          if (result.data) {
            setPreferences(result.data);
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        logger.debug(
          'Failed to fetch existing preferences',
          err instanceof Error ? { error: err.message } : { error: err }
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchExistingPreferences();
    return () => controller.abort();
  }, [projectId]);

  // Check if questionnaire data exists for the user
  useEffect(() => {
    const controller = new AbortController();
    const checkQuestionnaire = async (): Promise<void> => {
      try {
        const response = await fetch('/api/v1/questionnaire/progress', {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!mountedRef.current) {
          return;
        }

        if (response.ok) {
          const result = (await response.json()) as {
            data?: { completedSections?: string[] };
            completedSections?: string[];
          };
          const data = result.data ?? result;
          // Consider questionnaire available if any section is completed
          const completedSections = data.completedSections ?? [];
          setHasQuestionnaire(completedSections.length > 0);
        } else {
          setHasQuestionnaire(false);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setHasQuestionnaire(false);
      }
    };

    void checkQuestionnaire();
    return () => controller.abort();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ): void => {
    const { name, value, type } = e.target;
    const target = e.target as HTMLInputElement;

    if (type === 'checkbox') {
      setPreferences((prev) => ({ ...prev, [name]: target.checked }));
    } else if (type === 'number') {
      setPreferences((prev) => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    } else {
      setPreferences((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleColorToggle = (colorId: string): void => {
    setPreferences((prev) => {
      const current = prev.colorPalette;
      const updated = current.includes(colorId)
        ? current.filter((c) => c !== colorId)
        : [...current, colorId].slice(0, 4); // Max 4 colors
      return { ...prev, colorPalette: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (preferences.colorPalette.length === 0) {
      setError(t('aiGenerator.selectColorRequired', 'Veuillez selectionner au moins une couleur'));
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/ai-generator/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(preferences),
      });

      if (!mountedRef.current) {
        return;
      }

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(
          errorData.message || t('aiGenerator.generationFailed', 'Failed to start AI generation')
        );
      }

      const result = (await response.json()) as {
        data?: { generationId?: string };
        generationId?: string;
      };
      const generationId = result.data?.generationId ?? result.generationId;
      navigate(`/ai-generator/results/${generationId}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : t('common.unexpectedError', 'An unexpected error occurred');
      setError(errorMessage);
      setIsGenerating(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="mb-4">
            <ol className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <li>
                <Link to="/dashboard" className="hover:text-blue-600">
                  {t('nav.dashboard', 'Tableau de bord')}
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-900 dark:text-white font-medium">
                {t('aiGenerator.title', 'AI Kitchen Generator')}
              </li>
            </ol>
          </nav>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('aiGenerator.title', 'AI Kitchen Generator')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t(
              'aiGenerator.description',
              'Configure your preferences and let our AI create stunning kitchen designs for you.'
            )}
          </p>
        </div>

        {/* Questionnaire Banner */}
        {hasQuestionnaire === true && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              {t(
                'aiGenerator.questionnaireUsed',
                'Vos reponses au questionnaire seront utilisees pour personnaliser les designs'
              )}
            </p>
          </div>
        )}
        {hasQuestionnaire === false && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p>
                {t(
                  'aiGenerator.completeQuestionnaire',
                  'Completez le questionnaire pour des designs plus personnalises.'
                )}{' '}
                <Link to="/questionnaire" className="font-medium underline hover:text-amber-900">
                  {t('aiGenerator.startQuestionnaire', 'Commencer le questionnaire')}
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
                aria-label={t('common.close', 'Fermer')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Kitchen Style */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                {t('aiGenerator.kitchenStyle', 'Style de cuisine')}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {styleOptions.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setPreferences((prev) => ({ ...prev, kitchenStyle: style.id }))}
                    aria-pressed={preferences.kitchenStyle === style.id}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      preferences.kitchenStyle === style.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white">{style.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {style.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {/* Color Palette */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                {t('aiGenerator.colorPalette', 'Palette de couleurs')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {t('aiGenerator.colorPaletteDesc', "Selectionnez jusqu'a 4 couleurs")}
              </p>

              <div className="grid gap-3 grid-cols-4 sm:grid-cols-8">
                {colorOptions.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => handleColorToggle(color.id)}
                    disabled={
                      !preferences.colorPalette.includes(color.id) &&
                      preferences.colorPalette.length >= 4
                    }
                    aria-pressed={preferences.colorPalette.includes(color.id)}
                    aria-label={color.name}
                    className={`relative aspect-square rounded-lg border-2 transition-all ${
                      preferences.colorPalette.includes(color.id)
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 disabled:opacity-50'
                    }`}
                    style={{ backgroundColor: color.color }}
                    title={color.name}
                  >
                    {preferences.colorPalette.includes(color.id) && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {preferences.colorPalette.length > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t('common.selected', 'Selection')} :
                  </span>
                  {preferences.colorPalette.map((colorId) => {
                    const color = colorOptions.find((c) => c.id === colorId);
                    return (
                      <span
                        key={colorId}
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        {color?.name}
                      </span>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Layout Preference */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                {t('aiGenerator.layoutPreference', 'Disposition preferee')}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {layoutOptions.map((layout) => (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() =>
                      setPreferences((prev) => ({ ...prev, layoutPreference: layout.id }))
                    }
                    aria-pressed={preferences.layoutPreference === layout.id}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      preferences.layoutPreference === layout.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 dark:text-white">{layout.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {layout.description}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {/* Additional Options */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                {t('aiGenerator.additionalOptions', 'Options supplementaires')}
              </h2>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Appliance Grade */}
                <div>
                  <label
                    htmlFor="applianceGrade"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    {t('aiGenerator.applianceGrade', "Gamme d'appareils")}
                  </label>
                  <select
                    id="applianceGrade"
                    name="applianceGrade"
                    value={preferences.applianceGrade}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value="standard">
                      {t('aiGenerator.appliance.standard', 'Standard')}
                    </option>
                    <option value="premium">{t('aiGenerator.appliance.premium', 'Premium')}</option>
                    <option value="professional">
                      {t('aiGenerator.appliance.professional', 'Professionnel')}
                    </option>
                  </select>
                </div>

                {/* Storage Emphasis */}
                <div>
                  <label
                    htmlFor="storageEmphasis"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    {t('aiGenerator.storageEmphasis', 'Accent sur le rangement')}
                  </label>
                  <select
                    id="storageEmphasis"
                    name="storageEmphasis"
                    value={preferences.storageEmphasis}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value="minimal">
                      {t('aiGenerator.storage.minimal', 'Minimal - Esthetique epuree')}
                    </option>
                    <option value="moderate">
                      {t('aiGenerator.storage.moderate', 'Modere - Equilibre')}
                    </option>
                    <option value="maximum">
                      {t('aiGenerator.storage.maximum', 'Maximum - Beaucoup de rangement')}
                    </option>
                  </select>
                </div>

                {/* Lighting Mood */}
                <div>
                  <label
                    htmlFor="lightingMood"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    {t('aiGenerator.lightingMood', 'Ambiance lumineuse')}
                  </label>
                  <select
                    id="lightingMood"
                    name="lightingMood"
                    value={preferences.lightingMood}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value="bright">
                      {t('aiGenerator.lighting.bright', 'Lumineux et energisant')}
                    </option>
                    <option value="warm">
                      {t('aiGenerator.lighting.warm', 'Chaleureux et cosy')}
                    </option>
                    <option value="dramatic">
                      {t('aiGenerator.lighting.dramatic', 'Dramatique et feutre')}
                    </option>
                    <option value="natural">
                      {t('aiGenerator.lighting.natural', 'Lumiere naturelle')}
                    </option>
                  </select>
                </div>

                {/* Number of Designs */}
                <div>
                  <label
                    htmlFor="numberOfDesigns"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    {t('aiGenerator.numberOfDesigns', 'Nombre de designs a generer')}
                  </label>
                  <select
                    id="numberOfDesigns"
                    name="numberOfDesigns"
                    value={preferences.numberOfDesigns}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                  >
                    <option value={1}>
                      {t('pref.designCount', '{{count}} Design', { count: 1 })}
                    </option>
                    <option value={3}>
                      {t('pref.designCount_other', '{{count}} Designs', { count: 3 })}
                    </option>
                    <option value={5}>
                      {t('pref.designCount_other', '{{count}} Designs', { count: 5 })}
                    </option>
                  </select>
                </div>
              </div>
            </section>

            {/* Features to Include */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                {t('aiGenerator.features', 'Fonctionnalites a inclure')}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    name: 'includeIsland',
                    label: t('aiGenerator.feature.island', 'Ilot central'),
                    description: t('aiGenerator.feature.islandDesc', 'Espace de travail central'),
                  },
                  {
                    name: 'includeBreakfastNook',
                    label: t('aiGenerator.feature.breakfastNook', 'Coin petit-dejeuner'),
                    description: t('aiGenerator.feature.breakfastNookDesc', 'Coin repas integre'),
                  },
                  {
                    name: 'includePantry',
                    label: t('aiGenerator.feature.pantry', 'Cellier'),
                    description: t('aiGenerator.feature.pantryDesc', 'Espace de rangement dedie'),
                  },
                  {
                    name: 'sustainableOptions',
                    label: t('aiGenerator.feature.ecoFriendly', 'Eco-responsable'),
                    description: t('aiGenerator.feature.ecoFriendlyDesc', 'Materiaux durables'),
                  },
                  {
                    name: 'smartHomeIntegration',
                    label: t('aiGenerator.feature.smartHome', 'Maison connectee'),
                    description: t('aiGenerator.feature.smartHomeDesc', 'Appareils connectes'),
                  },
                ].map((feature) => (
                  <label
                    key={feature.name}
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      preferences[feature.name as keyof AIPreferences]
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name={feature.name}
                      checked={preferences[feature.name as keyof AIPreferences] as boolean}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <span
                      className={`w-5 h-5 rounded border mr-3 mt-0.5 flex-shrink-0 flex items-center justify-center ${
                        preferences[feature.name as keyof AIPreferences]
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {preferences[feature.name as keyof AIPreferences] && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{feature.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {feature.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Additional Requirements */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                {t('aiGenerator.additionalRequirements', 'Exigences supplementaires')}
              </h2>
              <textarea
                name="additionalRequirements"
                value={preferences.additionalRequirements}
                onChange={handleInputChange}
                rows={4}
                placeholder={t(
                  'aiGenerator.requirementsPlaceholder',
                  'Fonctionnalites, materiaux ou elements de design specifiques souhaites...'
                )}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-none"
              />
            </section>

            {/* Submit */}
            <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                to={projectId ? `/projects/${projectId}` : '/dashboard'}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </Link>
              <button
                type="submit"
                disabled={isGenerating}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    {t('aiGenerator.generating', 'Generating...')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    {t('aiGenerator.generateDesigns', 'Generate Designs')}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Panel */}
        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-purple-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="font-medium text-purple-900 dark:text-purple-300">
                {t('aiGenerator.howItWorks', 'Comment fonctionne la generation IA')}
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                {t(
                  'aiGenerator.howItWorksDesc',
                  'Notre IA analyse vos preferences ainsi que vos reponses au questionnaire pour creer des designs de cuisine personnalises. La generation prend generalement 1 a 3 minutes. Vous pourrez ensuite comparer et affiner les designs generes.'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferenceForm;
