import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Package, ArrowLeft, Ruler } from 'lucide-react';
import {
  Badge, Card, Container, EmptyState, ErrorState, Input, PageHeader, Select, Skeleton,
  Button, fadeUp, stagger,
} from '../../components/ui';
import ImportToDesignDialog from './ImportToDesignDialog';

interface DBProduct {
  id: string;
  sku: string;
  name: string;
  brand?: string | null;
  price: number | string;
  currency: string;
  width?: number | string | null;
  depth?: number | string | null;
  height?: number | string | null;
  color?: string | null;
  material?: string | null;
  images?: string[] | null;
  category?: { id: string; name: string } | null;
}

interface DBAppliance {
  id: string;
  type: string;
  brand: string;
  model: string;
  name: string;
  price: number | string;
  width: number | string;
  depth: number | string;
  height: number | string;
  energyRating?: string | null;
  features?: unknown;
}

interface IkeaSearchResult {
  itemCode: string;
  name: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  url?: string;
  dimensions?: { width?: number; depth?: number; height?: number; unit: string };
}

type CatalogItem = (DBProduct & { _kind: 'product' }) | (DBAppliance & { _kind: 'appliance' }) | (IkeaSearchResult & { _kind: 'ikea' });

const PROVIDER_NAMES: Record<string, string> = {
  ikea: 'IKEA',
  'leroy-merlin': 'Leroy Merlin',
  castorama: 'Castorama',
  schmidt: 'Schmidt',
  bosch: 'Bosch',
};

export default function ProviderCatalog(): React.ReactElement {
  const { providerCode = '' } = useParams<{ providerCode: string }>();
  const providerName = PROVIDER_NAMES[providerCode] ?? providerCode;
  const isLive = providerCode === 'ikea';
  const isAppliance = providerCode === 'bosch';

  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc'>('name');
  const [importTarget, setImportTarget] = useState<{ source: 'product' | 'appliance'; id: string; name: string } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setItems(null);
    setError(null);

    const run = async (): Promise<void> => {
      try {
        if (isLive) {
          // IKEA: live API
          const url = search
            ? `/api/v1/ikea/search?q=${encodeURIComponent(search)}&limit=40`
            : '/api/v1/ikea/kitchen/cabinets?limit=40';
          const res = await fetch(url, { credentials: 'include', signal: controller.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const results = (json.data?.results ?? []) as IkeaSearchResult[];
          setItems(results.map((r) => ({ ...r, _kind: 'ikea' as const })));
        } else if (isAppliance) {
          const url = search
            ? `/api/v1/${providerCode}/appliances/search?q=${encodeURIComponent(search)}&limit=40`
            : `/api/v1/${providerCode}/appliances?limit=40`;
          const res = await fetch(url, { credentials: 'include', signal: controller.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const results = (json.data ?? []) as DBAppliance[];
          setItems(results.map((r) => ({ ...r, _kind: 'appliance' as const })));
        } else {
          const url = search
            ? `/api/v1/${providerCode}/products/search?q=${encodeURIComponent(search)}&limit=40`
            : `/api/v1/${providerCode}/products?limit=40`;
          const res = await fetch(url, { credentials: 'include', signal: controller.signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const results = (json.data ?? []) as DBProduct[];
          setItems(results.map((r) => ({ ...r, _kind: 'product' as const })));
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setError((err as Error).message);
      }
    };

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void run(), search ? 300 : 0);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [providerCode, search, isLive, isAppliance]);

  const sorted = useMemo(() => {
    if (!items) return null;
    const copy = [...items];
    const priceOf = (it: CatalogItem): number =>
      typeof (it as { price?: unknown }).price === 'number'
        ? Number((it as { price: number }).price)
        : Number((it as { price: string }).price ?? 0);
    if (sortBy === 'price_asc') copy.sort((a, b) => priceOf(a) - priceOf(b));
    else if (sortBy === 'price_desc') copy.sort((a, b) => priceOf(b) - priceOf(a));
    else copy.sort((a, b) => a.name.localeCompare(b.name));
    return copy;
  }, [items, sortBy]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Container size="xl" className="py-10">
        <Link to="/catalog" className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Tous les fournisseurs
        </Link>

        <PageHeader
          title={providerName}
          description={
            isLive
              ? 'Catalogue interrogé en direct via l\'API IKEA officielle.'
              : 'Catalogue local — synchronisé périodiquement.'
          }
          actions={
            <Badge variant={isLive ? 'info' : 'default'} dot={isLive}>
              {isLive ? 'Live API' : 'Catalogue synchronisé'}
            </Badge>
          }
        />

        <Card variant="elevated" className="mb-6 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="search"
              className="flex-1"
              placeholder={`Rechercher dans ${providerName}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="w-full sm:w-auto">
              <option value="name">Nom A-Z</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </Select>
          </div>
        </Card>

        {error && <ErrorState description={error} />}

        {!sorted && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden p-0">
                <Skeleton className="h-48" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {sorted && sorted.length === 0 && (
          <EmptyState icon={<Package className="h-5 w-5" />} title="Aucun résultat" description="Affinez votre recherche." />
        )}

        {sorted && sorted.length > 0 && (
          <motion.div
            initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: stagger(0.03) } }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {sorted.map((it) => (
              <motion.div key={(it as { id?: string; itemCode?: string }).id ?? (it as { itemCode: string }).itemCode} variants={{ hidden: fadeUp.initial, show: fadeUp.animate }}>
                <CatalogItemCard item={it} onImport={(target) => setImportTarget(target)} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </Container>

      {importTarget && (
        <ImportToDesignDialog
          open
          onClose={() => setImportTarget(null)}
          source={importTarget.source}
          sourceId={importTarget.id}
          itemName={importTarget.name}
        />
      )}
    </div>
  );
}

function CatalogItemCard({
  item, onImport,
}: {
  item: CatalogItem;
  onImport: (target: { source: 'product' | 'appliance'; id: string; name: string }) => void;
}): React.ReactElement {
  const isIkea = item._kind === 'ikea';
  const isAppliance = item._kind === 'appliance';

  const dims = (() => {
    if (isIkea) return item.dimensions;
    const w = (item as { width?: unknown }).width;
    const d = (item as { depth?: unknown }).depth;
    const h = (item as { height?: unknown }).height;
    if (w == null && d == null && h == null) return undefined;
    return { width: w == null ? undefined : Number(w), depth: d == null ? undefined : Number(d), height: h == null ? undefined : Number(h), unit: 'cm' as const };
  })();

  const price = typeof (item as { price?: unknown }).price === 'number'
    ? Number((item as { price: number }).price)
    : Number((item as { price: string }).price ?? 0);

  const imageUrl = isIkea ? (item as IkeaSearchResult).imageUrl : null;

  const handleImport = (): void => {
    if (isIkea) return; // IKEA live items aren't in our DB yet — disabled here
    onImport({
      source: isAppliance ? 'appliance' : 'product',
      id: (item as { id: string }).id,
      name: item.name,
    });
  };

  return (
    <Card variant="interactive" className="group flex h-full flex-col overflow-hidden p-0">
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-white/5 to-white/[0.02]">
        {imageUrl ? (
          <img src={imageUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-white/20">
            <Package className="h-10 w-10" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">{item.name}</h3>

        {(item as { brand?: string }).brand && (
          <div className="mt-1 text-xs text-white/50">{(item as { brand: string }).brand}</div>
        )}

        {dims && (dims.width || dims.depth || dims.height) && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/60">
            <Ruler className="h-3.5 w-3.5" />
            {dims.width ? `${dims.width}` : '?'} × {dims.depth ? `${dims.depth}` : '?'} × {dims.height ? `${dims.height}` : '?'} cm
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-base font-semibold text-white">
            {price > 0
              ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: (item as { currency?: string }).currency ?? 'EUR', maximumFractionDigits: 0 }).format(price)
              : <span className="text-sm text-white/50">Sur devis</span>}
          </span>
          {!isIkea && (
            <Button size="sm" variant="outline" onClick={handleImport}>
              Ajouter
            </Button>
          )}
          {isIkea && (item as IkeaSearchResult).url && (
            <a
              href={(item as IkeaSearchResult).url}
              target="_blank"
              rel="noopener noreferrer"
              className="kx-focus inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
            >
              IKEA.com →
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
