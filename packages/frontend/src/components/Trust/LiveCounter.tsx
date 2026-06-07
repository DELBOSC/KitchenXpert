import React from 'react';

/**
 * LiveCounter — "X cuisines conçues · Y devis · Z installateurs"
 *
 * Polls `/api/v1/stats/public` toutes les 30 s. Backend stub livré
 * dans `packages/backend/src/api/routes/stats-routes.ts` — il renvoie
 * de vrais compteurs Prisma + un cache 60 s en mémoire pour ne pas
 * marteler la DB.
 *
 * UX :
 *   - Première frame : valeurs depuis SSR/`initialStats` (props), ou
 *     placeholders « — » si rien.
 *   - À chaque tick, animation d'incrémentation (rolling number).
 *   - Échec polling = reste sur la dernière valeur connue, pas
 *     d'erreur visible (silent fail — c'est un signal, pas un workflow).
 *   - Respect de `prefers-reduced-motion` : pas de rolling animation.
 *
 * Pas de WebSocket : la fréquence d'update utile (~min) ne justifie
 * pas un canal persistant. Polling 30 s = 120 req/h/visiteur = OK.
 */

interface Stats {
  kitchensDesigned: number;
  quotesGeneratedThisMonth: number;
  verifiedInstallers: number;
}

const API_URL = (import.meta.env?.VITE_API_URL as string) || '/api/v1';
const POLL_MS = 30_000;

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {return;}
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const listener = (e: MediaQueryListEvent): void => setReduced(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);
  return reduced;
}

/**
 * RollingNumber — anime l'écart entre `from` et `to` sur 800 ms
 * d'easeOutCubic. Au repos, affiche `to`. SSR-safe (rend la valeur
 * cible directement avant hydratation).
 */
function RollingNumber({ value, reduced }: { value: number; reduced: boolean }): React.ReactElement {
  const [display, setDisplay] = React.useState(value);
  const previousRef = React.useRef(value);

  React.useEffect(() => {
    if (reduced || previousRef.current === value) {
      setDisplay(value);
      previousRef.current = value;
      return;
    }
    const from = previousRef.current;
    const to = value;
    const duration = 800;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number): void => {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3); // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased));
      if (elapsed < 1) {frame = requestAnimationFrame(tick);}
      else {previousRef.current = to;}
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);

  return <span className="tabular-nums">{fmt(display)}</span>;
}

export interface LiveCounterProps {
  /** Valeurs SSR pour éviter le "—" flash. Optionnel. */
  initialStats?: Partial<Stats>;
  className?: string;
}

export function LiveCounter({
  initialStats, className = '',
}: LiveCounterProps): React.ReactElement {
  const reduced = useReducedMotion();
  const [stats, setStats] = React.useState<Stats>({
    kitchensDesigned: initialStats?.kitchensDesigned ?? 0,
    quotesGeneratedThisMonth: initialStats?.quotesGeneratedThisMonth ?? 0,
    verifiedInstallers: initialStats?.verifiedInstallers ?? 0,
  });
  const [hasData, setHasData] = React.useState(Boolean(initialStats));

  React.useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const fetchStats = async (): Promise<void> => {
      try {
        const res = await fetch(`${API_URL}/stats/public`, {
          credentials: 'omit',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {throw new Error(`HTTP ${res.status}`);}
        const json = (await res.json()) as { data: Stats };
        if (mounted && json.data) {
          setStats(json.data);
          setHasData(true);
        }
      } catch {
        // Silent — pas de toast pour un compteur marketing.
      } finally {
        if (mounted) {timer = setTimeout(fetchStats, POLL_MS);}
      }
    };

    void fetchStats();
    return () => {
      mounted = false;
      if (timer) {clearTimeout(timer);}
    };
  }, []);

  return (
    <div
      aria-label="Activité KitchenXpert en temps réel"
      className={`grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur ${className}`}
    >
      <Stat label="Cuisines conçues" value={stats.kitchensDesigned} hasData={hasData} reduced={reduced} />
      <Stat label="Devis ce mois"      value={stats.quotesGeneratedThisMonth} hasData={hasData} reduced={reduced} />
      <Stat label="Installateurs vérifiés" value={stats.verifiedInstallers} hasData={hasData} reduced={reduced} />
    </div>
  );
}

function Stat({
  label, value, hasData, reduced,
}: { label: string; value: number; hasData: boolean; reduced: boolean }): React.ReactElement {
  return (
    <div className="bg-[#0a0a0f] px-5 py-4 text-center">
      <div className="text-2xl font-semibold text-white sm:text-3xl">
        {hasData ? <RollingNumber value={value} reduced={reduced} /> : <span className="text-white/30">—</span>}
      </div>
      <div className="mt-1 text-xs uppercase tracking-widest text-white/55">{label}</div>
    </div>
  );
}

export default LiveCounter;
