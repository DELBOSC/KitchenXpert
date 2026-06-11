import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';

import { logger } from '../../../services/logger';

interface StyleData {
  primaryStyle: string;
  colorScheme: string;
  cabinetFinish: string;
  countertopMaterial: string;
  backsplashStyle: string;
  flooringType: string;
  hardwareStyle: string;
  lightingPreference: string;
  inspirationImages: string[];
  additionalNotes: string;
}

const StylePreferences: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<StyleData>({
    primaryStyle: '',
    colorScheme: '',
    cabinetFinish: '',
    countertopMaterial: '',
    backsplashStyle: '',
    flooringType: '',
    hardwareStyle: '',
    lightingPreference: '',
    inspirationImages: [],
    additionalNotes: '',
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [aiTips, setAiTips] = useState<{ tips: string[]; warnings: string[]; suggestions: string[] } | null>(null);
  const [aiTipsLoading, setAiTipsLoading] = useState<boolean>(false);

  const styleOptions = useMemo(() => [
    { id: 'modern', name: t('style.options.modern', 'Modern'), image: '/images/styles/modern.jpg', description: t('style.options.modern.desc', 'Clean lines, minimal ornamentation') },
    { id: 'traditional', name: t('style.options.traditional', 'Traditional'), image: '/images/styles/traditional.jpg', description: t('style.options.traditional.desc', 'Classic details, warm tones') },
    { id: 'contemporary', name: t('style.options.contemporary', 'Contemporary'), image: '/images/styles/contemporary.jpg', description: t('style.options.contemporary.desc', 'Current trends, bold accents') },
    { id: 'transitional', name: t('style.options.transitional', 'Transitional'), image: '/images/styles/transitional.jpg', description: t('style.options.transitional.desc', 'Blend of traditional and modern') },
    { id: 'farmhouse', name: t('style.options.farmhouse', 'Farmhouse'), image: '/images/styles/farmhouse.jpg', description: t('style.options.farmhouse.desc', 'Rustic, cozy, natural materials') },
    { id: 'industrial', name: t('style.options.industrial', 'Industrial'), image: '/images/styles/industrial.jpg', description: t('style.options.industrial.desc', 'Raw materials, urban aesthetic') },
    { id: 'scandinavian', name: t('style.options.scandinavian', 'Scandinavian'), image: '/images/styles/scandinavian.jpg', description: t('style.options.scandinavian.desc', 'Light, airy, functional') },
    { id: 'mediterranean', name: t('style.options.mediterranean', 'Mediterranean'), image: '/images/styles/mediterranean.jpg', description: t('style.options.mediterranean.desc', 'Warm colors, ornate details') },
  ], [t]);

  const colorSchemes = useMemo(() => [
    { id: 'neutral', name: t('style.colors.neutral', 'Neutral'), colors: ['#F5F5F5', '#E0E0E0', '#9E9E9E', '#616161'] },
    { id: 'warm', name: t('style.colors.warm', 'Warm'), colors: ['#FFF8E1', '#FFE0B2', '#FFCC80', '#FF9800'] },
    { id: 'cool', name: t('style.colors.cool', 'Cool'), colors: ['#E3F2FD', '#BBDEFB', '#90CAF9', '#2196F3'] },
    { id: 'monochrome', name: t('style.colors.monochrome', 'Monochrome'), colors: ['#FFFFFF', '#BDBDBD', '#757575', '#212121'] },
    { id: 'earth', name: t('style.colors.earth', 'Earth Tones'), colors: ['#EFEBE9', '#D7CCC8', '#A1887F', '#5D4037'] },
    { id: 'bold', name: t('style.colors.bold', 'Bold'), colors: ['#FCE4EC', '#F48FB1', '#E91E63', '#4A148C'] },
  ], [t]);

  const cabinetFinishes = useMemo(() => [
    t('style.cabinets.highGlossWhite', 'High Gloss White'),
    t('style.cabinets.matteGray', 'Matte Gray'),
    t('style.cabinets.naturalOak', 'Natural Oak'),
    t('style.cabinets.walnutStain', 'Walnut Stain'),
    t('style.cabinets.paintedNavy', 'Painted Navy'),
    t('style.cabinets.twoTone', 'Two-Tone'),
    t('style.cabinets.distressedWood', 'Distressed Wood'),
    t('style.cabinets.thermofoil', 'Thermofoil'),
  ], [t]);

  const countertopMaterials = useMemo(() => [
    t('style.countertops.granite', 'Granite'),
    t('style.countertops.quartz', 'Quartz'),
    t('style.countertops.marble', 'Marble'),
    t('style.countertops.butcherBlock', 'Butcher Block'),
    t('style.countertops.concrete', 'Concrete'),
    t('style.countertops.stainlessSteel', 'Stainless Steel'),
    t('style.countertops.laminate', 'Laminate'),
    t('style.countertops.solidSurface', 'Solid Surface'),
  ], [t]);

  const backsplashStyles = useMemo(() => [
    t('style.backsplash.subway', 'Subway Tile'),
    t('style.backsplash.mosaic', 'Mosaic'),
    t('style.backsplash.fullSlab', 'Full Slab'),
    t('style.backsplash.herringbone', 'Herringbone'),
    t('style.backsplash.pennyTile', 'Penny Tile'),
    t('style.backsplash.brick', 'Brick'),
    t('style.backsplash.glassPanel', 'Glass Panel'),
    t('style.backsplash.none', 'No Backsplash'),
  ], [t]);

  const flooringTypes = useMemo(() => [
    t('style.flooring.hardwood', 'Hardwood'),
    t('style.flooring.tile', 'Tile'),
    t('style.flooring.vinylPlank', 'Vinyl Plank'),
    t('style.flooring.laminate', 'Laminate'),
    t('style.flooring.naturalStone', 'Natural Stone'),
    t('style.flooring.cork', 'Cork'),
    t('style.flooring.bamboo', 'Bamboo'),
    t('style.flooring.polishedConcrete', 'Polished Concrete'),
  ], [t]);

  const hardwareStyles = useMemo(() => [
    t('style.hardware.barPulls', 'Bar Pulls'),
    t('style.hardware.knobs', 'Knobs'),
    t('style.hardware.cupPulls', 'Cup Pulls'),
    t('style.hardware.hiddenIntegrated', 'Hidden/Integrated'),
    t('style.hardware.brass', 'Brass'),
    t('style.hardware.blackMatte', 'Black Matte'),
    t('style.hardware.brushedNickel', 'Brushed Nickel'),
    t('style.hardware.chrome', 'Chrome'),
  ], [t]);

  const lightingPreferences = useMemo(() => [
    t('style.lighting.recessed', 'Recessed Lighting'),
    t('style.lighting.pendant', 'Pendant Lights'),
    t('style.lighting.underCabinet', 'Under Cabinet'),
    t('style.lighting.track', 'Track Lighting'),
    t('style.lighting.chandelier', 'Statement Chandelier'),
    t('style.lighting.naturalFocus', 'Natural Light Focus'),
    t('style.lighting.mixed', 'Mixed Lighting'),
  ], [t]);

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('questionnaire_stylePreferences');
    const timestamp = localStorage.getItem('questionnaire_timestamp');
    if (saved && timestamp) {
      try {
        const savedTime = parseInt(timestamp, 10);
        if (Date.now() - savedTime < 86400000) {
          const parsed = JSON.parse(saved) as StyleData;
          setFormData(parsed);
        } else {
          localStorage.removeItem('questionnaire_stylePreferences');
        }
      } catch {
        // Invalid data, ignore
      }
    } else if (saved) {
      try {
        const parsed = JSON.parse(saved) as StyleData;
        setFormData(parsed);
      } catch {
        // Invalid data, ignore
      }
    }
  }, []);

  // Save to localStorage on form data change
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('questionnaire_stylePreferences', JSON.stringify(formData));
      localStorage.setItem('questionnaire_currentStep', '3');
      localStorage.setItem('questionnaire_timestamp', String(Date.now()));
    }
  }, [formData, isLoading]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchStyleData = async (): Promise<void> => {
      try {
        const response = await fetch('/api/v1/questionnaire/style-preferences', { credentials: 'include', signal: controller.signal });

        if (response.ok) {
          const result = (await response.json()) as { data?: StyleData };
          if (result.data) {setFormData(result.data);}
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {return;}
        logger.debug('Failed to fetch style preferences, using defaults', err instanceof Error ? { error: err.message } : { error: err });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchStyleData();
    return () => controller.abort();
  }, []);

  const handleSelectChange = (field: keyof StyleData, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setFormData((prev) => ({ ...prev, additionalNotes: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!formData.primaryStyle) {
      setSaveError(t('questionnaire.style.selectStyleRequired', 'Veuillez selectionner un style principal'));
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch('/api/v1/questionnaire/style-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(t('questionnaire.style.saveFailed', 'Failed to save style preferences'));
      }

      // Fetch AI tips after successful save
      setAiTipsLoading(true);
      try {
        const tipsResponse = await fetch('/api/v1/questionnaire/style-preferences/ai-tips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
        if (tipsResponse.ok) {
          const tipsResult = (await tipsResponse.json()) as {
            data?: { tips: string[]; warnings: string[]; suggestions: string[] } | null;
          };
          setAiTips(tipsResult.data ?? null);
        }
      } catch {
        /* AI tips are optional */
      } finally {
        setAiTipsLoading(false);
      }

      navigate('/questionnaire/budget');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('common.unexpectedError', 'An unexpected error occurred');
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" role="status" aria-label={t('common.loading', 'Loading')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('questionnaire.step', { current: 3, total: 4, defaultValue: 'Step 3 of 4' })}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('questionnaire.stylePreferences', 'Style Preferences')}</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: '75%' }}
              role="progressbar"
              aria-valuenow={3}
              aria-valuemin={0}
              aria-valuemax={4}
              aria-label={t('questionnaire.progressLabel', 'Questionnaire progress: step 3 of 4')}
            />
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('questionnaire.stylePreferences', 'Style Preferences')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('questionnaire.stylePreferencesDesc', 'Choose your design aesthetic and material preferences for your dream kitchen.')}
          </p>

          {saveError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg" role="alert">
              <p className="text-red-600 dark:text-red-400">{saveError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Primary Style Selection */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                {t('questionnaire.style.primaryStyle', 'Style de design principal')} <span className="text-red-500">*</span>
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {styleOptions.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => handleSelectChange('primaryStyle', style.id)}
                    aria-pressed={formData.primaryStyle === style.id}
                    className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                      formData.primaryStyle === style.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded mb-3 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{style.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{style.description}</p>
                    {formData.primaryStyle === style.id && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Color Scheme */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('questionnaire.style.colorScheme', 'Palette de couleurs')}</h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {colorSchemes.map((scheme) => (
                  <button
                    key={scheme.id}
                    type="button"
                    onClick={() => handleSelectChange('colorScheme', scheme.id)}
                    aria-pressed={formData.colorScheme === scheme.id}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.colorScheme === scheme.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex gap-1 mb-3">
                      {scheme.colors.map((color, idx) => (
                        <div
                          key={idx}
                          className="flex-1 h-8 rounded"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{scheme.name}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Materials Selection */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('questionnaire.style.materials', 'Materiaux et finitions')}</h2>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Cabinet Finish */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('questionnaire.style.cabinetFinish', 'Finition caissons')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {cabinetFinishes.map((finish) => (
                      <button
                        key={finish}
                        type="button"
                        onClick={() => handleSelectChange('cabinetFinish', finish)}
                        aria-pressed={formData.cabinetFinish === finish}
                        className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                          formData.cabinetFinish === finish
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {finish}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Countertop Material */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('questionnaire.style.countertopMaterial', 'Materiau plan de travail')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {countertopMaterials.map((material) => (
                      <button
                        key={material}
                        type="button"
                        onClick={() => handleSelectChange('countertopMaterial', material)}
                        aria-pressed={formData.countertopMaterial === material}
                        className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                          formData.countertopMaterial === material
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {material}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Backsplash Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('questionnaire.style.backsplashStyle', 'Style de credence')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {backsplashStyles.map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => handleSelectChange('backsplashStyle', style)}
                        aria-pressed={formData.backsplashStyle === style}
                        className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                          formData.backsplashStyle === style
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Flooring Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('questionnaire.style.flooringType', 'Type de sol')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {flooringTypes.map((flooring) => (
                      <button
                        key={flooring}
                        type="button"
                        onClick={() => handleSelectChange('flooringType', flooring)}
                        aria-pressed={formData.flooringType === flooring}
                        className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                          formData.flooringType === flooring
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {flooring}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Hardware & Lighting */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('questionnaire.style.hardwareLighting', 'Quincaillerie et eclairage')}</h2>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Hardware Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('questionnaire.style.hardwareStyle', 'Style de quincaillerie')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {hardwareStyles.map((hardware) => (
                      <button
                        key={hardware}
                        type="button"
                        onClick={() => handleSelectChange('hardwareStyle', hardware)}
                        aria-pressed={formData.hardwareStyle === hardware}
                        className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                          formData.hardwareStyle === hardware
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {hardware}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lighting Preference */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('questionnaire.style.lightingPreference', 'Preference eclairage')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {lightingPreferences.map((lighting) => (
                      <button
                        key={lighting}
                        type="button"
                        onClick={() => handleSelectChange('lightingPreference', lighting)}
                        aria-pressed={formData.lightingPreference === lighting}
                        className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                          formData.lightingPreference === lighting
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {lighting}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Additional Notes */}
            <section>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('questionnaire.style.additionalNotes', 'Notes supplementaires')}</h2>
              <textarea
                value={formData.additionalNotes}
                onChange={handleTextChange}
                rows={4}
                placeholder={t('questionnaire.style.notesPlaceholder', 'Exigences de design, inspirations ou indispensables pour votre cuisine...')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-none"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {formData.additionalNotes.length}/500 {t('common.characters', 'characters')}
              </p>
            </section>

            {/* AI Tips */}
            {aiTipsLoading && (
              <div className="mt-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                {t('questionnaire.style.aiAnalyzing', 'Analyse IA en cours...')}
              </div>
            )}
            {aiTips && (
              <div className="mt-6 space-y-3">
                {aiTips.tips.map((tip, i) => (
                  <div key={i} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                    <span className="font-medium">{t('questionnaire.style.aiTip', 'Conseil IA')} :</span> {tip}
                  </div>
                ))}
                {aiTips.warnings.map((w, i) => (
                  <div key={i} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-medium">{t('questionnaire.style.aiWarning', 'Attention')} :</span> {w}
                  </div>
                ))}
                {aiTips.suggestions.map((s, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{t('questionnaire.style.aiSuggestion', 'Suggestion')} :</span> {s}
                  </div>
                ))}
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                to="/questionnaire/spatial"
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
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

export default StylePreferences;
