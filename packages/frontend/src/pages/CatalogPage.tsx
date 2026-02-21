import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchProducts,
  selectProducts,
  selectCatalogLoading,
  type CatalogItem,
  type CatalogState,
} from '../features/catalog/catalog-slice';

const selectCatalogError = (state: { catalog: CatalogState }) => state.catalog.error;
const selectCatalogPagination = (state: { catalog: CatalogState }) => state.catalog.pagination;

const categories = [
  { id: 'cabinets', nameKey: 'catalog.cabinets', icon: '🗄️' },
  { id: 'appliances', nameKey: 'catalog.appliances', icon: '🍳' },
  { id: 'countertops', nameKey: 'catalog.countertops', icon: '⬜' },
  { id: 'sinks', nameKey: 'catalog.sinks', icon: '🚰' },
  { id: 'lighting', nameKey: 'catalog.lighting', icon: '💡' },
  { id: 'accessories', nameKey: 'catalog.accessories', icon: '🔧' },
];

export default function CatalogPage(): React.ReactElement {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const products = useAppSelector(selectProducts);
  const isLoading = useAppSelector(selectCatalogLoading);
  const error = useAppSelector(selectCatalogError);
  const pagination = useAppSelector(selectCatalogPagination);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('relevance');
  const [currentPage, setCurrentPage] = useState(1);

  // AI Search state
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchLoading, setAiSearchLoading] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState<{
    filters: Record<string, unknown>;
    results: any[];
    explanation: string;
    suggestions: string[];
  } | null>(null);
  const [aiSearchError, setAiSearchError] = useState<string | null>(null);

  const aiSearchResultCards = useMemo(() => {
    if (!aiSearchResults || aiSearchResults.results.length === 0) return null;
    return aiSearchResults.results.map((product: any) => (
      <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
        <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2 mb-1">
          {product.name}
        </h4>
        {product.brand && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{product.brand}</p>
        )}
        {product.material && (
          <p className="text-xs text-gray-400 dark:text-gray-500">{product.material}</p>
        )}
        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">
          {product.price
            ? new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: product.currency || 'EUR',
              }).format(Number(product.price))
            : t('catalog.priceOnRequest', 'Prix sur demande')}
        </p>
      </div>
    ));
  }, [aiSearchResults, t]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiSearchControllerRef = useRef<AbortController | null>(null);

  // Fetch products when filters change
  const loadProducts = useCallback(
    (page: number, search?: string, category?: string | null) => {
      const filters: Record<string, string> = {};
      if (search) filters.search = search;
      if (category) filters.category = category;
      dispatch(fetchProducts({ page, limit: 20, filters }));
    },
    [dispatch],
  );

  // Initial load
  useEffect(() => {
    loadProducts(1);
  }, [loadProducts]);

  // Reload when category changes
  useEffect(() => {
    setCurrentPage(1);
    loadProducts(1, searchQuery, selectedCategory);
  }, [selectedCategory, loadProducts, searchQuery]);

  // Debounced search
  const handleSearchChange = (value: string): void => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      loadProducts(1, value, selectedCategory);
    }, 300);
  };

  // Cleanup debounce timer and AI search controller
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (aiSearchControllerRef.current) aiSearchControllerRef.current.abort();
    };
  }, []);

  const handleSearch = (): void => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCurrentPage(1);
    loadProducts(1, searchQuery, selectedCategory);
  };

  const handlePageChange = (page: number): void => {
    setCurrentPage(page);
    loadProducts(page, searchQuery, selectedCategory);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryToggle = (catId: string): void => {
    setSelectedCategory(selectedCategory === catId ? null : catId);
  };

  // AI-powered natural language search
  const handleAISearch = async (): Promise<void> => {
    if (!aiSearchQuery.trim()) return;

    // Abort any in-flight AI search request
    if (aiSearchControllerRef.current) {
      aiSearchControllerRef.current.abort();
    }

    const controller = new AbortController();
    aiSearchControllerRef.current = controller;

    setAiSearchLoading(true);
    setAiSearchError(null);
    setAiSearchResults(null);

    try {
      const response = await fetch('/api/v1/ai-search/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: aiSearchQuery }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(t('catalog.aiSearchFailed', 'AI search failed'));
      }

      const result = await response.json();
      setAiSearchResults(result.data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const errorMessage = err instanceof Error ? err.message : t('catalog.aiSearchFailed', 'AI search failed');
      setAiSearchError(errorMessage);
    } finally {
      setAiSearchLoading(false);
    }
  };

  // Sort products locally (API may not support sort)
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return (a.price || 0) - (b.price || 0);
      case 'price_desc':
        return (b.price || 0) - (a.price || 0);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t('catalog.title')}
          </h1>

          {/* Search */}
          <div className="flex gap-4">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('catalog.searchPlaceholder')}
              aria-label={t('catalog.searchLabel', 'Rechercher des produits')}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('common.search')}
            </button>
          </div>

          {/* AI Natural Language Search */}
          <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
            <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">
              {t('catalog.aiSearch', 'Recherche intelligente IA')}
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={aiSearchQuery}
                onChange={(e) => setAiSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                placeholder={t('catalog.aiSearchPlaceholder', 'Ex: un plan de travail en quartz blanc de moins de 500 euros...')}
                aria-label={t('catalog.aiSearchLabel', 'Recherche en langage naturel')}
                className="flex-1 px-4 py-2 border border-indigo-200 dark:border-indigo-700 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
              />
              <button
                onClick={handleAISearch}
                disabled={aiSearchLoading || !aiSearchQuery.trim()}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
              >
                {aiSearchLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                {aiSearchLoading ? t('catalog.aiSearching', 'Recherche...') : t('catalog.aiSearchButton', 'Recherche IA')}
              </button>
            </div>

            {/* AI Search Error */}
            {aiSearchError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{aiSearchError}</p>
            )}

            {/* AI Search Results */}
            {aiSearchResults && (
              <div className="mt-4" aria-live="polite">
                <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-3">
                  {aiSearchResults.explanation}
                </p>

                {aiSearchResults.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {aiSearchResults.suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setAiSearchQuery(suggestion);
                        }}
                        className="px-3 py-1 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-full text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                {aiSearchResultCards ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {aiSearchResultCards}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('catalog.aiNoResults', 'Aucun produit trouve. Essayez une autre recherche.')}
                  </p>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Categories */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('catalog.categories')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryToggle(cat.id)}
                aria-label={t(cat.nameKey)}
                aria-pressed={selectedCategory === cat.id}
                className={`p-4 rounded-xl text-center transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 hover:shadow-lg'
                }`}
              >
                <div className="text-3xl mb-2"><span role="img" aria-hidden="true">{cat.icon}</span></div>
                <div className="text-sm font-medium">{t(cat.nameKey)}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Products Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedCategory
                ? t(categories.find((c) => c.id === selectedCategory)?.nameKey || 'catalog.allProducts')
                : t('catalog.allProducts')}
              {!isLoading && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                  ({pagination.total} {t('catalog.results')})
                </span>
              )}
            </h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label={t('catalog.sortBy', 'Trier par')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
            >
              <option value="relevance">{t('catalog.sortByRelevance')}</option>
              <option value="price_asc">{t('catalog.priceAsc')}</option>
              <option value="price_desc">{t('catalog.priceDesc')}</option>
              <option value="newest">{t('catalog.newest')}</option>
            </select>
          </div>

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center mb-4">
              <p className="text-red-600 dark:text-red-400 mb-2">{error}</p>
              <button
                onClick={() => loadProducts(currentPage, searchQuery, selectedCategory)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden animate-pulse" aria-hidden="true">
                  <div className="h-48 bg-gray-200 dark:bg-gray-700" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Products */}
          {!isLoading && !error && sortedProducts.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} t={t} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && sortedProducts.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center">
              <div className="text-5xl mb-4"><span role="img" aria-hidden="true">📦</span></div>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || selectedCategory
                  ? t('catalog.noResults')
                  : t('catalog.productsPlaceholder')}
              </p>
              {(searchQuery || selectedCategory) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                    setCurrentPage(1);
                    loadProducts(1);
                  }}
                  className="mt-4 px-4 py-2 text-blue-600 hover:underline text-sm"
                >
                  {t('catalog.clearFilters')}
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label={t('common.previousPage', 'Page precedente')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {t('common.previous')}
              </button>
              <span className="px-4 py-2 text-gray-600 dark:text-gray-400 text-sm" aria-current="page">
                {t('common.pageOf', { current: currentPage, total: pagination.totalPages })}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= pagination.totalPages}
                aria-label={t('common.nextPage', 'Page suivante')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  t,
}: {
  product: CatalogItem;
  t: (key: string) => string;
}): React.ReactElement {
  const imageUrl = product.images?.[0];
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-shadow overflow-hidden">
      {/* Image */}
      <div className="h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden relative">
        {imageUrl ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" aria-hidden="true" />
            )}
            <img
              src={imageUrl}
              alt={product.name}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
            />
          </>
        ) : (
          <span className="text-4xl text-gray-400" role="img" aria-hidden="true">🗄️</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 mb-1">
          {product.name}
        </h3>
        {product.category && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {product.category}
            {product.subcategory ? ` / ${product.subcategory}` : ''}
          </p>
        )}
        {product.dimensions && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            {product.dimensions.width} x {product.dimensions.depth} x {product.dimensions.height} cm
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {product.price
              ? new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: product.currency || 'EUR',
                }).format(product.price)
              : t('catalog.priceOnRequest')}
          </span>
        </div>
      </div>
    </div>
  );
}
