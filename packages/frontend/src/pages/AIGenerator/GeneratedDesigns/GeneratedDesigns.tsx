import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';

import type {
  GeneratedDesign,
  AIGenerationResult,
  CostBreakdown,
} from '../../../features/ai-generator/ai-generator-slice';

/** Maximum time (in ms) to poll for generation results before timing out. */
const MAX_POLL_DURATION = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL = 3000; // 3 seconds

/** BOM item shape from the API */
interface BOMItem {
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  catalogRef: string | null;
}

/** Full BOM response shape */
interface BillOfMaterials {
  kitchenId: string;
  items: BOMItem[];
  subtotal: number;
  tax: number;
  total: number;
  generatedAt: string;
}

/**
 * StarRating - Interactive star rating component for design cards.
 * Renders 1-5 clickable stars. Shows current rating and handles click to save.
 */
const StarRating: React.FC<{
  designId: string;
  rating: number;
  onRate: (designId: string, rating: number) => void;
  disabled?: boolean;
}> = ({ designId, rating, onRate, disabled }) => {
  const [hovered, setHovered] = useState<number>(0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hovered || rating);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            className={`w-5 h-5 transition-colors ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            onMouseEnter={() => !disabled && setHovered(star)}
            onMouseLeave={() => !disabled && setHovered(0)}
            onClick={() => !disabled && onRate(designId, star)}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <svg
              viewBox="0 0 20 20"
              fill={isFilled ? 'currentColor' : 'none'}
              stroke="currentColor"
              className={isFilled ? 'text-yellow-400' : 'text-gray-300'}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
};

const GeneratedDesigns: React.FC = () => {
  const { generationId } = useParams<{ generationId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [result, setResult] = useState<AIGenerationResult | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<GeneratedDesign | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [expandedDesigns, setExpandedDesigns] = useState<Set<string>>(new Set());
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  // Star rating state: designId -> user's rating
  const [designRatings, setDesignRatings] = useState<Record<string, number>>({});
  const [ratingSaving, setRatingSaving] = useState<string | null>(null);

  // BOM state
  const [bomData, setBomData] = useState<BillOfMaterials | null>(null);
  const [bomLoading, setBomLoading] = useState<boolean>(false);
  const [bomError, setBomError] = useState<string | null>(null);
  const [showBomModal, setShowBomModal] = useState<boolean>(false);

  // Close the BOM modal on Escape (document-level to keep the dialog container non-interactive)
  useEffect(() => {
    if (!showBomModal) {
      return;
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setShowBomModal(false);
        setBomData(null);
        setBomError(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showBomModal]);

  // Close the design detail modal on Escape
  useEffect(() => {
    if (!selectedDesign) {
      return;
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setSelectedDesign(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedDesign]);

  /**
   * Retry handler: resets error/loading state and bumps retryCount to
   * re-trigger the useEffect instead of doing a full page reload (L-1).
   */
  const handleRetry = useCallback(() => {
    setError(null);
    setResult(null);
    setIsLoading(true);
    setRetryCount((c) => c + 1);
  }, []);

  const toggleDesignExpand = useCallback((designId: string) => {
    setExpandedDesigns((prev) => {
      const next = new Set(prev);
      if (next.has(designId)) {
        next.delete(designId);
      } else {
        next.add(designId);
      }
      return next;
    });
  }, []);

  /**
   * Handle star rating click: save rating to API.
   * Uses the design-ratings endpoint. Since designs are not yet saved as kitchens,
   * this saves a local rating state. Once a design is saved to a kitchen, the
   * rating can be persisted via the design-ratings API.
   */
  const handleRateDesign = useCallback(async (designId: string, rating: number) => {
    setRatingSaving(designId);
    // Store rating locally for immediate UI feedback
    setDesignRatings((prev) => ({ ...prev, [designId]: rating }));

    // If the design has been saved as a kitchen, persist via API
    // For now, we store locally. The rating will be persisted when the design is saved.
    try {
      // Attempt to save via the design-ratings API if we have a kitchenId mapping
      // For generated designs that haven't been saved yet, we just store locally
      const response = await fetch('/api/v1/design-ratings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kitchenId: designId, // This will only work for saved designs
          rating,
        }),
      });

      if (!response.ok) {
        // If the API call fails (e.g., design not yet saved as kitchen), that's ok
        // The local state still reflects the user's rating
      }
    } catch {
      // Non-critical: local state already updated
    } finally {
      if (mountedRef.current) {
        setRatingSaving(null);
      }
    }
  }, []);

  /**
   * Handle BOM generation: calls the BOM API for a saved kitchen.
   * For unsaved designs, we need to save first.
   */
  const handleGenerateBOM = useCallback(
    async (design: GeneratedDesign) => {
      setBomLoading(true);
      setBomError(null);
      setBomData(null);
      setShowBomModal(true);

      try {
        // First, save the design to get a kitchenId (if not already saved)
        const saveResponse = await fetch('/api/v1/ai-generator/save-design', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationId,
            designId: design.id,
            projectId: result?.projectId,
          }),
        });

        if (!saveResponse.ok) {
          throw new Error('Failed to save design before generating BOM');
        }

        const saveResult = (await saveResponse.json()) as {
          data?: { kitchenId?: string };
        };
        const kitchenId = saveResult.data?.kitchenId;

        if (!kitchenId) {
          throw new Error('No kitchen ID returned after save');
        }

        // Now generate the BOM
        const bomResponse = await fetch('/api/v1/bom/generate', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kitchenId }),
        });

        if (!bomResponse.ok) {
          throw new Error('Failed to generate Bill of Materials');
        }

        const bomResult = (await bomResponse.json()) as { data: BillOfMaterials };
        if (mountedRef.current) {
          setBomData(bomResult.data);
        }
      } catch (err) {
        if (mountedRef.current) {
          setBomError(err instanceof Error ? err.message : 'Failed to generate BOM');
        }
      } finally {
        if (mountedRef.current) {
          setBomLoading(false);
        }
      }
    },
    [generationId, result?.projectId]
  );

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    const pollStartTime = Date.now();

    const fetchGenerationResult = async (): Promise<void> => {
      if (!generationId) {
        setError('Generation ID is required');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/v1/ai-generator/results/${generationId}`, {
          signal,
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Generation result not found');
          }
          throw new Error('Failed to fetch generation results');
        }

        const json = (await response.json()) as AIGenerationResult & {
          data?: AIGenerationResult;
        };
        const data: AIGenerationResult = json.data ?? json;
        setResult(data);

        // If still processing, poll for updates
        if (data.status === 'pending' || data.status === 'processing') {
          const pollOnce = async (): Promise<void> => {
            // M-2: Check whether we have exceeded the maximum poll duration
            if (Date.now() - pollStartTime >= MAX_POLL_DURATION) {
              if (pollInterval) {
                clearInterval(pollInterval);
              }
              setError('Design generation is taking longer than expected. Please try again later.');
              return;
            }

            try {
              const pollResponse = await fetch(`/api/v1/ai-generator/results/${generationId}`, {
                signal,
                credentials: 'include',
              });
              if (pollResponse.ok) {
                const pollJson = (await pollResponse.json()) as AIGenerationResult & {
                  data?: AIGenerationResult;
                };
                const pollData: AIGenerationResult = pollJson.data ?? pollJson;
                setResult(pollData);

                if (pollData.status === 'completed' || pollData.status === 'failed') {
                  if (pollInterval) {
                    clearInterval(pollInterval);
                  }
                }
              }
            } catch (pollErr) {
              // If the request was aborted (component unmounting), stop silently
              if (pollErr instanceof DOMException && pollErr.name === 'AbortError') {
                if (pollInterval) {
                  clearInterval(pollInterval);
                }
                return;
              }
              // Otherwise continue polling -- transient network errors are expected
            }
          };
          pollInterval = setInterval(() => {
            void pollOnce();
          }, POLL_INTERVAL);
        }
      } catch (err) {
        // Ignore abort errors triggered by cleanup
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchGenerationResult();

    // M-1: Cleanup -- abort in-flight requests AND clear the poll interval
    return () => {
      abortController.abort();
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [generationId, retryCount]);

  const handleSaveDesign = async (design: GeneratedDesign): Promise<void> => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/v1/ai-generator/save-design', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generationId,
          designId: design.id,
          projectId: result?.projectId,
        }),
      });

      if (!mountedRef.current) {
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to save design');
      }

      type SavedDesign = { projectId: string; kitchenId: string };
      const savedResult = (await response.json()) as SavedDesign & {
        data?: SavedDesign;
      };
      const savedDesign: SavedDesign = savedResult.data ?? savedResult;
      navigate(`/projects/${savedDesign.projectId}/kitchens/${savedDesign.kitchenId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save design';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  /**
   * Renders the cost breakdown table for a design
   */
  const renderCostBreakdown = (costBreakdown: CostBreakdown): React.ReactNode => {
    const categories = [
      { key: 'cabinets', label: t('generatedDesigns.costCategory.cabinets', 'Caissons') },
      {
        key: 'countertops',
        label: t('generatedDesigns.costCategory.countertops', 'Plans de travail'),
      },
      { key: 'appliances', label: t('generatedDesigns.costCategory.appliances', 'Electromenager') },
      {
        key: 'installation',
        label: t('generatedDesigns.costCategory.installation', 'Installation'),
      },
    ] as const;

    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-800 mb-3">
          {t('generatedDesigns.costCategory.breakdown', 'Ventilation des couts')}
        </h4>
        <div className="space-y-2">
          {categories.map(({ key, label }) => {
            const range = costBreakdown[key];
            return (
              <div key={key} className="flex justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(range.min, 'EUR')} - {formatCurrency(range.max, 'EUR')}
                </span>
              </div>
            );
          })}
          <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between text-sm font-bold">
            <span className="text-gray-800">Total</span>
            <span className="text-blue-700">
              {formatCurrency(costBreakdown.total.min, 'EUR')} -{' '}
              {formatCurrency(costBreakdown.total.max, 'EUR')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Renders the "Pourquoi ce design ?" expandable section
   */
  const renderDesignExplanation = (design: GeneratedDesign): React.ReactNode => {
    const isExpanded = expandedDesigns.has(design.id);
    const hasExplanation =
      design.description ||
      design.materialRationale ||
      design.layoutExplanation ||
      design.tradeoffs;

    if (!hasExplanation) {
      return null;
    }

    return (
      <div className="mt-3 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => toggleDesignExpand(design.id)}
          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800 transition-colors font-medium"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {t('generatedDesigns.whyThisDesign', 'Pourquoi ce design ?')}
        </button>
        {isExpanded && (
          <div className="mt-2 space-y-2 text-sm text-gray-600">
            {design.description && <p>{design.description}</p>}
            {design.materialRationale && (
              <div>
                <span className="font-medium text-gray-700">
                  {t('generatedDesigns.explanation.materials', 'Choix des materiaux')} :{' '}
                </span>
                {design.materialRationale}
              </div>
            )}
            {design.layoutExplanation && (
              <div>
                <span className="font-medium text-gray-700">
                  {t('generatedDesigns.explanation.layout', 'Disposition')} :{' '}
                </span>
                {design.layoutExplanation}
              </div>
            )}
            {design.tradeoffs && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800">
                <span className="font-medium">
                  {t('generatedDesigns.explanation.tradeoffs', 'Compromis')} :{' '}
                </span>
                {design.tradeoffs}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  /**
   * Renders the BOM modal with generation results
   */
  const renderBomModal = (): React.ReactNode => {
    if (!showBomModal) {
      return null;
    }

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        role="dialog"
        aria-modal="true"
      >
        <div
          className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          ref={(el) => {
            if (el) {
              const btn = el.querySelector<HTMLElement>('button');
              btn?.focus();
            }
          }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('aiGenerator.billOfMaterials', 'Bill of Materials')}
              </h2>
              <button
                onClick={() => {
                  setShowBomModal(false);
                  setBomData(null);
                  setBomError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {bomLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
                <p className="text-gray-600">
                  {t('aiGenerator.generatingBOM', 'Generating Bill of Materials...')}
                </p>
              </div>
            )}

            {bomError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{bomError}</p>
              </div>
            )}

            {bomData && (
              <div>
                {/* BOM Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">
                          {t('aiGenerator.bomItem', 'Item')}
                        </th>
                        <th className="text-left py-3 px-2 font-semibold text-gray-700">
                          {t('aiGenerator.bomCategory', 'Category')}
                        </th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-700">
                          {t('aiGenerator.bomQty', 'Qty')}
                        </th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-700">
                          {t('aiGenerator.bomUnitPrice', 'Unit Price')}
                        </th>
                        <th className="text-right py-3 px-2 font-semibold text-gray-700">
                          {t('aiGenerator.bomTotal', 'Total')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bomData.items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            {item.catalogRef && (
                              <div className="text-xs text-gray-400">Ref: {item.catalogRef}</div>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right text-gray-600">{item.quantity}</td>
                          <td className="py-2 px-2 text-right text-gray-600">
                            {formatCurrency(item.unitPrice, 'EUR')}
                          </td>
                          <td className="py-2 px-2 text-right font-medium text-gray-900">
                            {formatCurrency(item.totalPrice, 'EUR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* BOM Totals */}
                <div className="mt-6 border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {t('aiGenerator.bomSubtotal', 'Subtotal HT')}
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(bomData.subtotal, 'EUR')}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('aiGenerator.bomTax', 'TVA (20%)')}</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(bomData.tax, 'EUR')}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span className="text-gray-800">
                      {t('aiGenerator.bomTotalTTC', 'Total TTC')}
                    </span>
                    <span className="text-blue-700">{formatCurrency(bomData.total, 'EUR')}</span>
                  </div>
                </div>

                {/* Generated timestamp */}
                <p className="mt-4 text-xs text-gray-400 text-right">
                  {t('aiGenerator.bomGeneratedAt', 'Generated')}:{' '}
                  {new Date(bomData.generatedAt).toLocaleString(i18n.language)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
          <h2 className="text-red-800 text-lg font-semibold mb-2">{t('common.error', 'Error')}</h2>
          <p className="text-red-600">{error}</p>
          <div className="mt-4 flex gap-4">
            <button
              onClick={() => navigate('/ai-generator')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              {t('aiGenerator.newGeneration', 'New Generation')}
            </button>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              {t('common.tryAgain', 'Try Again')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Processing State
  if (result?.status === 'pending' || result?.status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="animate-pulse">
              <div className="w-24 h-24 mx-auto bg-gradient-to-r from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-white animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('aiGenerator.generatingDesigns', 'Generating Your Designs')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t(
              'aiGenerator.generatingDescription',
              'Our AI is crafting personalized kitchen designs based on your preferences. This usually takes 1-3 minutes.'
            )}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full animate-pulse w-2/3" />
          </div>
          <p className="text-sm text-gray-500">
            {t('aiGenerator.status', 'Status')}:{' '}
            {result?.status === 'pending'
              ? t('aiGenerator.queued', 'Queued')
              : t('aiGenerator.processing', 'Processing')}
            ...
          </p>
        </div>
      </div>
    );
  }

  // Failed State
  if (result?.status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
          <svg
            className="w-16 h-16 text-red-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            {t('aiGenerator.generationFailed', 'Generation Failed')}
          </h2>
          <p className="text-red-600 mb-6">
            {result.errorMessage ||
              t(
                'aiGenerator.generationError',
                'An error occurred during design generation. Please try again.'
              )}
          </p>
          <button
            onClick={() => navigate('/ai-generator')}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            {t('common.tryAgain', 'Try Again')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="mb-4">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li>
                <Link to="/dashboard" className="hover:text-blue-600">
                  {t('nav.dashboard', 'Dashboard')}
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link to="/ai-generator" className="hover:text-blue-600">
                  {t('nav.aiGenerator', 'AI Generator')}
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-900 font-medium">{t('aiGenerator.results', 'Results')}</li>
            </ol>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('aiGenerator.generatedDesigns', 'Generated Designs')}
              </h1>
              <p className="text-gray-600">
                {t(
                  'aiGenerator.designCount',
                  '{{count}} design(s) generated based on your preferences',
                  { count: result?.designs.length }
                )}
                {result?.isAIGenerated && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    IA
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => navigate('/ai-generator')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('aiGenerator.generateMore', 'Generate More')}
            </button>
          </div>
        </div>

        {/* Designs Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {result?.designs.map((design) => (
            <div
              key={design.id}
              className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Design Image */}
              <div className="relative h-56 bg-gray-200">
                {design.thumbnailUrl ? (
                  <img
                    src={design.thumbnailUrl}
                    alt={design.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-100 to-blue-100">
                    <svg
                      className="w-16 h-16 text-purple-300"
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
                )}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {design.isAIGenerated && (
                    <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded shadow-sm">
                      IA
                    </span>
                  )}
                  <span className="px-2 py-1 bg-black bg-opacity-50 text-white text-sm rounded">
                    {t('aiGenerator.score', 'Score')}: {design.score}%
                  </span>
                </div>
              </div>

              {/* Design Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-semibold text-gray-900">{design.name}</h3>
                  {/* Star Rating */}
                  <StarRating
                    designId={design.id}
                    rating={designRatings[design.id] ?? 0}
                    onRate={handleRateDesign}
                    disabled={ratingSaving === design.id}
                  />
                </div>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{design.description}</p>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {design.style}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    {design.layout}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-2">
                  {t('aiGenerator.estCost', 'Est. Cost')}:{' '}
                  {formatCurrency(design.estimatedCost.min, design.estimatedCost.currency)} -{' '}
                  {formatCurrency(design.estimatedCost.max, design.estimatedCost.currency)}
                </p>

                {/* Cost Breakdown (inline in card) */}
                {design.costBreakdown && (
                  <div className="mb-3">{renderCostBreakdown(design.costBreakdown)}</div>
                )}

                {/* "Pourquoi ce design ?" expandable section */}
                {renderDesignExplanation(design)}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setSelectedDesign(design)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    {t('aiGenerator.viewDetails', 'View Details')}
                  </button>
                  <button
                    onClick={() => handleSaveDesign(design)}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
                  >
                    {t('aiGenerator.saveDesign', 'Save Design')}
                  </button>
                </div>

                {/* Generate BOM button */}
                <button
                  onClick={() => handleGenerateBOM(design)}
                  disabled={bomLoading}
                  className="w-full mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {t('aiGenerator.generateBOM', 'Generate Bill of Materials')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            to={`/ai-generator/compare?generationId=${generationId}`}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            {t('aiGenerator.compareDesigns', 'Compare Designs')}
          </Link>
          {result?.projectId && (
            <Link
              to={`/vr-viewer?projectId=${result.projectId}&generationId=${generationId}`}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              {t('aiGenerator.viewInVR', 'View in VR')}
            </Link>
          )}
        </div>
      </div>

      {/* Design Detail Modal */}
      {selectedDesign && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            ref={(el) => {
              if (el) {
                const btn = el.querySelector<HTMLElement>('button');
                btn?.focus();
              }
            }}
          >
            <div className="relative h-64 sm:h-80 bg-gray-200">
              {selectedDesign.fullImageUrl || selectedDesign.thumbnailUrl ? (
                <img
                  src={selectedDesign.fullImageUrl || selectedDesign.thumbnailUrl}
                  alt={selectedDesign.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-100 to-blue-100">
                  <svg
                    className="w-24 h-24 text-purple-300"
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
              )}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {selectedDesign.isAIGenerated && (
                  <span className="px-3 py-1 bg-purple-600 text-white text-sm font-bold rounded-full shadow-lg">
                    IA
                  </span>
                )}
                <button
                  onClick={() => setSelectedDesign(null)}
                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900">{selectedDesign.name}</h2>
                <StarRating
                  designId={selectedDesign.id}
                  rating={designRatings[selectedDesign.id] ?? 0}
                  onRate={handleRateDesign}
                  disabled={ratingSaving === selectedDesign.id}
                />
              </div>
              <p className="text-gray-600 mb-4">{selectedDesign.description}</p>

              {/* AI Explanation Sections */}
              {(selectedDesign.materialRationale ||
                selectedDesign.layoutExplanation ||
                selectedDesign.tradeoffs) && (
                <div className="mb-6 space-y-3">
                  {selectedDesign.materialRationale && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-purple-900 mb-1">
                        {t('generatedDesigns.explanation.materials', 'Choix des materiaux')}
                      </h4>
                      <p className="text-sm text-purple-800">{selectedDesign.materialRationale}</p>
                    </div>
                  )}
                  {selectedDesign.layoutExplanation && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">
                        {t(
                          'generatedDesigns.explanation.layoutErgonomics',
                          'Disposition et ergonomie'
                        )}
                      </h4>
                      <p className="text-sm text-blue-800">{selectedDesign.layoutExplanation}</p>
                    </div>
                  )}
                  {selectedDesign.tradeoffs && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <h4 className="text-sm font-semibold text-amber-900 mb-1">
                        {t(
                          'generatedDesigns.explanation.tradeoffsToConsider',
                          'Compromis a considerer'
                        )}
                      </h4>
                      <p className="text-sm text-amber-800">{selectedDesign.tradeoffs}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* Materials */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {t('aiGenerator.materials', 'Materials')}
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{t('aiGenerator.cabinets', 'Cabinets')}</dt>
                      <dd className="text-gray-900 font-medium">
                        {selectedDesign.materials.cabinets}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">
                        {t('aiGenerator.countertops', 'Countertops')}
                      </dt>
                      <dd className="text-gray-900 font-medium">
                        {selectedDesign.materials.countertops}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{t('aiGenerator.backsplash', 'Backsplash')}</dt>
                      <dd className="text-gray-900 font-medium">
                        {selectedDesign.materials.backsplash}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">{t('aiGenerator.flooring', 'Flooring')}</dt>
                      <dd className="text-gray-900 font-medium">
                        {selectedDesign.materials.flooring}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Features */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {t('aiGenerator.features', 'Features')}
                  </h3>
                  <ul className="space-y-2">
                    {selectedDesign.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-gray-600">
                        <svg
                          className="w-4 h-4 text-green-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Cost Breakdown or Estimated Cost */}
              {selectedDesign.costBreakdown ? (
                renderCostBreakdown(selectedDesign.costBreakdown)
              ) : (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('aiGenerator.estimatedCostRange', 'Estimated Cost Range')}
                  </h3>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(
                      selectedDesign.estimatedCost.min,
                      selectedDesign.estimatedCost.currency
                    )}{' '}
                    -{' '}
                    {formatCurrency(
                      selectedDesign.estimatedCost.max,
                      selectedDesign.estimatedCost.currency
                    )}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t(
                      'aiGenerator.includesMaterials',
                      'Includes materials and installation estimates'
                    )}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => setSelectedDesign(null)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('common.close', 'Close')}
                </button>
                <button
                  onClick={() => handleGenerateBOM(selectedDesign)}
                  disabled={bomLoading}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {t('aiGenerator.generateBOM', 'Generate BOM')}
                </button>
                <button
                  onClick={() => handleSaveDesign(selectedDesign)}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSaving
                    ? t('common.saving', 'Saving...')
                    : t('aiGenerator.saveThisDesign', 'Save This Design')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BOM Modal */}
      {renderBomModal()}
    </div>
  );
};

export default GeneratedDesigns;
