import { motion } from 'framer-motion';
import {
  Search, Sparkles, Package, ArchiveRestore, ChefHat, Square, CircleDot, Lightbulb, Wrench,
  ChevronLeft, ChevronRight, XCircle,
} from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Badge, Button, Card, Container, EmptyState, ErrorState, Input, PageHeader, Select, Skeleton,
  fadeUp, stagger,
} from '../components/ui';
import {
  fetchProducts,
  selectProducts,
  selectCatalogLoading,
  type CatalogItem,
  type CatalogState,
} from '../features/catalog/catalog-slice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

const selectCatalogError = (state: { catalog: CatalogState }): string | null => state.catalog.error;
const selectCatalogPagination = (state: { catalog: CatalogState }): CatalogState['pagination'] => state.catalog.pagination;

type CategoryDef = { id: string; nameKey: string; icon: React.ReactNode };

const CATEGORIES: CategoryDef[] = [
  { id: 'cabinets', nameKey: 'catalog.cabinets', icon: <ArchiveRestore className="h-5 w-5" /> },
  { id: 'appliances', nameKey: 'catalog.appliances', icon: <ChefHat className="h-5 w-5" /> },
  { id: 'countertops', nameKey: 'catalog.countertops', icon: <Square className="h-5 w-5" /> },
  { id: 'sinks', nameKey: 'catalog.sinks', icon: <CircleDot className="h-5 w-5" /> },
  { id: 'lighting', nameKey: 'catalog.lighting', icon: <Lightbulb className="h-5 w-5" /> },
  { id: 'accessories', nameKey: 'catalog.accessories', icon: <Wrench className="h-5 w-5" /> },
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

  // AI Search
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<{ results: any[]; explanation: string; suggestions: string[] } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiControllerRef = useRef<AbortController | null>(null);

  const loadProducts = useCallback(
    (page: number, search?: string, category?: string | null) => {
      const filters: Record<string, string> = {};
      if (search) {filters.search = search;}
      if (category) {filters.category = category;}
      dispatch(fetchProducts({ page, limit: 20, filters }));
    },
    [dispatch],
  );

  useEffect(() => { loadProducts(1); }, [loadProducts]);

  useEffect(() => {
    setCurrentPage(1);
    loadProducts(1, searchQuery, selectedCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  useEffect(() => () => {
    if (debounceRef.current) {clearTimeout(debounceRef.current);}
    if (aiControllerRef.current) {aiControllerRef.current.abort();}
  }, []);

  const handleSearchChange = (value: string): void => {
    setSearchQuery(value);
    if (debounceRef.current) {clearTimeout(debounceRef.current);}
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      loadProducts(1, value, selectedCategory);
    }, 300);
  };

  const handleAISearch = async (): Promise<void> => {
    if (!aiQuery.trim()) {return;}
    if (aiControllerRef.current) {aiControllerRef.current.abort();}
    const controller = new AbortController();
    aiControllerRef.current = controller;

    setAiLoading(true); setAiError(null); setAiResults(null);
    try {
      const res = await fetch('/api/v1/ai-search/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: aiQuery }),
        signal: controller.signal,
      });
      if (!res.ok) {throw new Error('Recherche IA échouée');}
      const json = await res.json();
      setAiResults(json.data);
    } catch (err) {
      if ((err as Error).name === 'AbortError') {return;}
      setAiError((err as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  const sorted = useMemo(() => {
    const copy = [...products];
    copy.sort((a, b) => {
      if (sortBy === 'price_asc') {return (a.price || 0) - (b.price || 0);}
      if (sortBy === 'price_desc') {return (b.price || 0) - (a.price || 0);}
      return 0;
    });
    return copy;
  }, [products, sortBy]);

  const clearFilters = (): void => {
    setSearchQuery(''); setSelectedCategory(null); setCurrentPage(1);
    loadProducts(1);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Container size="xl" className="py-10">
        <PageHeader
          title={t('catalog.title', 'Catalogue')}
          description="Parcourez 50 000+ produits provenant des plus grandes marques."
        />

        {/* Search bar */}
        <Card variant="elevated" className="mb-4 p-4">
          <Input
            type="search"
            placeholder="Rechercher un produit, une marque, une référence…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </Card>

        {/* AI search panel */}
        <Card variant="glass" className="mb-10 overflow-hidden">
          <div className="relative p-5">
            <div aria-hidden className="absolute -top-20 -right-10 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20 blur-3xl" />
            <div className="relative">
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="info" dot><Sparkles className="h-3 w-3" /> Recherche IA</Badge>
                <span className="text-xs text-white/50">Décrivez ce que vous cherchez en langage naturel</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Ex. un plan de travail en quartz blanc de moins de 500 €…"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                  className="flex-1"
                />
                <Button onClick={handleAISearch} loading={aiLoading} disabled={!aiQuery.trim()} leftIcon={<Sparkles className="h-4 w-4" />}>
                  Rechercher
                </Button>
              </div>
              {aiError && <p className="mt-3 text-sm text-rose-400">{aiError}</p>}
              {aiResults && (
                <div className="mt-4" aria-live="polite">
                  <p className="mb-3 text-sm text-white/70">{aiResults.explanation}</p>
                  {aiResults.suggestions?.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {aiResults.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setAiQuery(s)}
                          className="kx-focus rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {aiResults.results?.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {aiResults.results.map((p: any) => (
                        <AIResultCard key={p.id} product={p} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/50">Aucun produit trouvé. Reformulez votre recherche.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Categories */}
        <section className="mb-8">
          <h2 className="mb-4 text-xs uppercase tracking-widest text-white/40">Catégories</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(active ? null : cat.id)}
                  aria-pressed={active}
                  className={`kx-focus flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition ${
                    active
                      ? 'border-white/30 bg-white/10 text-white'
                      : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-gradient-to-br from-indigo-400 to-fuchsia-500 text-white' : 'bg-white/5 text-white/80'}`}>
                    {cat.icon}
                  </span>
                  <span className="text-xs font-medium">{t(cat.nameKey)}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Products grid */}
        <section>
          <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">
                {selectedCategory ? t(CATEGORIES.find((c) => c.id === selectedCategory)?.nameKey ?? 'catalog.allProducts') : 'Tous les produits'}
              </h2>
              {!isLoading && <Badge variant="outline">{pagination.total} résultats</Badge>}
            </div>
            <div className="flex items-center gap-2">
              {(searchQuery || selectedCategory) && (
                <Button variant="ghost" size="sm" onClick={clearFilters} leftIcon={<XCircle className="h-3.5 w-3.5" />}>
                  Effacer
                </Button>
              )}
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="!h-9 w-auto">
                <option value="relevance">Pertinence</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
                <option value="newest">Nouveautés</option>
              </Select>
            </div>
          </div>

          {error && !isLoading && (
            <ErrorState
              description={error}
              onRetry={() => loadProducts(currentPage, searchQuery, selectedCategory)}
            />
          )}

          {isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="overflow-hidden p-0">
                  <Skeleton className="h-48 w-full" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-5 w-1/3" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && !error && sorted.length > 0 && (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: stagger(0.03) } }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {sorted.map((product) => (
                <motion.div key={product.id} variants={{ hidden: fadeUp.initial, show: fadeUp.animate }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}

          {!isLoading && !error && sorted.length === 0 && (
            <EmptyState
              icon={<Package className="h-5 w-5" />}
              title={searchQuery || selectedCategory ? 'Aucun résultat' : 'Catalogue en cours de chargement'}
              description={searchQuery || selectedCategory ? 'Ajustez vos filtres ou essayez d\'autres mots-clés.' : undefined}
              action={
                (searchQuery || selectedCategory) && (
                  <Button variant="outline" onClick={clearFilters}>Effacer les filtres</Button>
                )
              }
            />
          )}

          {!isLoading && pagination.totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => { setCurrentPage(currentPage - 1); loadProducts(currentPage - 1, searchQuery, selectedCategory); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
              >
                Précédent
              </Button>
              <span className="px-4 text-sm text-white/60">
                Page {currentPage} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pagination.totalPages}
                onClick={() => { setCurrentPage(currentPage + 1); loadProducts(currentPage + 1, searchQuery, selectedCategory); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
              >
                Suivant
              </Button>
            </nav>
          )}
        </section>
      </Container>
    </div>
  );
}

// ---------------------------------------------------------------------------
function ProductCard({ product }: { product: CatalogItem }): React.ReactElement {
  const imageUrl = product.images?.[0];
  const [loaded, setLoaded] = useState(false);
  return (
    <Card variant="interactive" className="group overflow-hidden p-0">
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02]">
        {imageUrl ? (
          <>
            {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
            <img
              src={imageUrl}
              alt={product.name}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              className={`h-full w-full object-cover transition duration-500 ${loaded ? 'opacity-100 group-hover:scale-105' : 'opacity-0'}`}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-white/30">
            <Package className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-white">{product.name}</h3>
        {product.category && (
          <p className="mb-2 text-xs text-white/50">
            {product.category}{product.subcategory ? ` · ${product.subcategory}` : ''}
          </p>
        )}
        {product.dimensions && (
          <p className="mb-3 text-xs text-white/40">
            {product.dimensions.width} × {product.dimensions.depth} × {product.dimensions.height} cm
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold text-white">
            {product.price
              ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: product.currency || 'EUR' }).format(product.price)
              : <span className="text-sm text-white/50">Prix sur demande</span>}
          </span>
          {product.subcategory && <Badge variant="outline">{product.subcategory}</Badge>}
        </div>
      </div>
    </Card>
  );
}

function AIResultCard({ product }: { product: any }): React.ReactElement {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 transition hover:border-white/20">
      <h4 className="line-clamp-2 text-sm font-medium text-white">{product.name}</h4>
      {product.brand && <p className="mt-0.5 text-xs text-white/50">{product.brand}</p>}
      {product.material && <p className="text-xs text-white/40">{product.material}</p>}
      <p className="mt-2 text-sm font-semibold text-white">
        {product.price
          ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: product.currency || 'EUR' }).format(Number(product.price))
          : 'Prix sur demande'}
      </p>
    </div>
  );
}
