import { motion } from 'framer-motion';
import { Library, Package, ChevronRight, ExternalLink } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SeoHead } from '../../components/seo/SeoHead';
import { Badge, Card, Container, ErrorState, PageHeader, Skeleton, fadeUp, stagger } from '../../components/ui';

interface Provider {
  id: string;
  code: string;
  name: string;
  productCount: number;
  applianceCount: number;
}

const PROVIDER_BLURBS: Record<string, { tagline: string; segment: string; accent: string }> = {
  ikea: {
    tagline: 'Cuisines METOD modulaires, livraison rapide.',
    segment: 'Entrée de gamme · Suède',
    accent: 'from-blue-500/20 via-blue-500/10',
  },
  'leroy-merlin': {
    tagline: 'DELINIA, EPURE — flexibilité et prix d\'appel.',
    segment: 'Entrée/milieu · France',
    accent: 'from-emerald-500/20 via-emerald-500/10',
  },
  castorama: {
    tagline: 'GoodHome — Caraway, Stevia. Bon rapport qualité/prix.',
    segment: 'Entrée/milieu · France',
    accent: 'from-amber-500/20 via-amber-500/10',
  },
  schmidt: {
    tagline: 'Cuisines premium sur-mesure, gamme Arcos / Loft.',
    segment: 'Premium · France',
    accent: 'from-fuchsia-500/20 via-fuchsia-500/10',
  },
  bosch: {
    tagline: 'Électroménager Serie 2/4/6/8 — fours, plaques, lave-vaisselle.',
    segment: 'Mid-premium · Allemagne',
    accent: 'from-rose-500/20 via-rose-500/10',
  },
};

export default function ProvidersHub(): React.ReactElement {
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const res = await fetch('/api/v1/providers', { credentials: 'include', signal: controller.signal });
        if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
        const json = await res.json();
        setProviders(json.data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {setError((err as Error).message);}
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <SeoHead
        title="Catalogues fournisseurs"
        description="Parcourez IKEA METOD, Leroy Merlin, Castorama, Schmidt et Bosch — dimensions, prix et import 1-clic dans votre cuisine 3D."
        canonical="https://kitchenxpert.com/catalog"
      />
      <Container size="xl" className="py-10">
        <PageHeader
          title="Catalogues fournisseurs"
          description="Parcourez les cuisines et l'électroménager de nos partenaires, avec dimensions précises pour les importer dans votre design 3D."
        />

        {error && <ErrorState description={error} />}

        {!providers && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        )}

        {providers && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: stagger(0.05) } }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {providers.map((p) => {
              const blurb = PROVIDER_BLURBS[p.code] ?? { tagline: '', segment: '', accent: 'from-white/10 via-white/5' };
              return (
                <motion.div key={p.code} variants={{ hidden: fadeUp.initial, show: fadeUp.animate }}>
                  <Link
                    to={`/catalog/${p.code}`}
                    className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <div className={`absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br ${blurb.accent} to-transparent blur-2xl transition group-hover:scale-110`} aria-hidden />
                    <div className="relative">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-xl font-semibold tracking-tight">{p.name}</div>
                        <ChevronRight className="h-5 w-5 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white" />
                      </div>
                      <Badge variant="outline" className="mb-3">{blurb.segment}</Badge>
                      <p className="mb-5 text-sm text-white/60">{blurb.tagline}</p>
                      <div className="flex items-center gap-3 text-sm text-white/70">
                        {p.productCount > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <Library className="h-3.5 w-3.5" />
                            {p.productCount} meubles
                          </span>
                        )}
                        {p.applianceCount > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5" />
                            {p.applianceCount} électros
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        <Card variant="elevated" className="mt-12 p-6">
          <div className="flex items-start gap-3">
            <ExternalLink className="mt-0.5 h-5 w-5 text-white/60" />
            <div>
              <div className="font-semibold">IKEA en direct</div>
              <p className="mt-1 text-sm text-white/60">
                Le catalogue IKEA est interrogé en direct via l&apos;API officielle.
                Les dimensions sont extraites en temps réel.
              </p>
            </div>
          </div>
        </Card>
      </Container>
    </div>
  );
}
