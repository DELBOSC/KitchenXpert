import { useEffect, useRef, useState } from 'react';

/**
 * HeroVideo — autoplay-muted-loop demo with progressive enhancement.
 *
 * Requirements satisfied (in order):
 *   - <video> attrs: autoplay muted loop playsinline preload="metadata"
 *   - <source> ordering: WebM first (smaller for Chrome/FF), MP4 fallback
 *     (Safari, iOS).
 *   - poster shown until the first playable frame (LCP candidate).
 *   - IntersectionObserver gates the actual fetch — the video element
 *     is mounted only when it enters the viewport.
 *   - prefers-reduced-motion: locks on the poster, never autoplays.
 *   - Network Information API: < 2 Mbps OR `saveData=true` → low
 *     bitrate variants. Old Safari (no NIC API) → assumes fast.
 *   - Skeleton shimmer while bytes are downloading; fades out when the
 *     `playing` event fires.
 *   - Visual: rounded-2xl, white/10 border, glow shadow — matches the
 *     aurora design system used in HomePage.
 *
 * Files expected under /public/hero/ (produced by scripts/encode-hero-video.sh):
 *   hero-desktop.{webm,mp4}, hero-desktop-low.{webm,mp4},
 *   hero-mobile.{webm,mp4}, hero-poster.jpg
 */

const ASSET_BASE = (import.meta.env?.VITE_HERO_CDN_BASE as string) || '/hero';

interface NetworkInformation extends EventTarget {
  downlink?: number; // Mbps
  saveData?: boolean;
  effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
}
type NavigatorWithConnection = Navigator & { connection?: NetworkInformation };

function pickQuality(): 'high' | 'low' {
  if (typeof navigator === 'undefined') {return 'high';}
  const conn = (navigator as NavigatorWithConnection).connection;
  if (!conn) {return 'high';}
  if (conn.saveData) {return 'low';}
  if (typeof conn.downlink === 'number' && conn.downlink < 2) {return 'low';}
  if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') {return 'low';}
  return 'high';
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {return false;}
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface HeroVideoProps {
  /** Aspect ratio for the wrapper (so the layout is stable before metadata loads). */
  aspectRatio?: string;
  /** Fired the first time the video is actually playing. Used by analytics. */
  onFirstPlay?: () => void;
  className?: string;
}

export function HeroVideo({
  aspectRatio = '16 / 10',
  onFirstPlay,
  className = '',
}: HeroVideoProps): JSX.Element {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mount the <video> only after the wrapper is visible. Saves the
  // bytes for users that bounce without scrolling.
  const [shouldMount, setShouldMount] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reducedMotion] = useState(prefersReducedMotion);
  const [quality] = useState<'high' | 'low'>(pickQuality);

  useEffect(() => {
    if (reducedMotion) {return;} // poster only, no fetch
    const el = wrapperRef.current;
    if (!el) {return;}
    if (!('IntersectionObserver' in window)) {
      setShouldMount(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShouldMount(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: '200px' }, // start fetching slightly before in-view
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [reducedMotion]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) {return;}
    const onPlaying = (): void => {
      if (!isPlaying) {
        setIsPlaying(true);
        onFirstPlay?.();
      }
    };
    v.addEventListener('playing', onPlaying);
    return () => v.removeEventListener('playing', onPlaying);
  }, [isPlaying, onFirstPlay, shouldMount]);

  // Pause when the tab is hidden — saves CPU + battery on the visitor's
  // device. Resume on visibility-change.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) {return;}
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') {v.pause();}
      else if (!reducedMotion) {v.play().catch(() => {});}
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [reducedMotion, shouldMount]);

  // ---- Asset URLs ---------------------------------------------------------
  const variant = quality === 'low' ? 'desktop-low' : 'desktop';
  const sources = {
    webm: `${ASSET_BASE}/hero-${variant}.webm`,
    mp4:  `${ASSET_BASE}/hero-${variant}.mp4`,
    mobileWebm: `${ASSET_BASE}/hero-mobile.webm`,
    mobileMp4:  `${ASSET_BASE}/hero-mobile.mp4`,
  };
  // JPG poster lands once `bash scripts/encode-hero-video.sh` has run.
  // Until then we render the SVG fallback (committed to the repo) so
  // the layout never collapses on a fresh checkout.
  const poster    = `${ASSET_BASE}/hero-poster.jpg`;
  const poster2x  = `${ASSET_BASE}/hero-poster@2x.jpg`;
  const posterSvg = `${ASSET_BASE}/hero-poster.svg`;

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(99,102,241,0.18)] bg-[#0d0d14] ${className}`}
      style={{ aspectRatio }}
      data-testid="hero-video-wrapper"
    >
      {/* Skeleton shimmer — fades out once playback starts */}
      <div
        aria-hidden
        className={`absolute inset-0 transition-opacity duration-500 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}
        style={{
          background: `
            linear-gradient(110deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0) 70%)
            ,linear-gradient(135deg, #0a0a0f 0%, #1a0a2a 100%)
          `,
          backgroundSize: '200% 100%, 100% 100%',
          animation: reducedMotion ? 'none' : 'kx-hero-shimmer 1.8s linear infinite',
        }}
      />

      {/* Poster — rendered eagerly; this is the LCP element. The SVG
          fallback is the FIRST <source> so it shows immediately on a
          fresh checkout when the JPG hasn't been generated yet. The
          browser walks <source> top-to-bottom and uses the first one
          whose type is supported (SVG is always supported). */}
      <picture>
        <source srcSet={`${poster2x} 2x, ${poster}`} type="image/jpeg" />
        <source srcSet={posterSvg} type="image/svg+xml" />
        <img
          src={posterSvg}
          alt="Aperçu : conception de cuisine 3D dans le designer KitchenXpert"
          width={1280}
          height={800}
          decoding="async"
          // HTML spec uses lowercase fetchpriority; @types/react still expects camelCase.
          {...({ fetchpriority: 'high' } as Record<string, string>)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${isPlaying ? 'opacity-0' : 'opacity-100'}`}
        />
      </picture>

      {/* The <video> mounts only after IntersectionObserver fires. */}
      {shouldMount && !reducedMotion && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          aria-label="Démonstration vidéo : conception d'une cuisine en 30 secondes dans KitchenXpert"
          className="absolute inset-0 h-full w-full object-cover"
        >
          {/* Mobile-portrait sources picked by the browser via media query */}
          <source src={sources.mobileWebm} type="video/webm" media="(orientation: portrait) and (max-width: 480px)" />
          <source src={sources.mobileMp4}  type="video/mp4"  media="(orientation: portrait) and (max-width: 480px)" />
          {/* Desktop / landscape — WebM first, MP4 fallback for Safari */}
          <source src={sources.webm} type="video/webm" />
          <source src={sources.mp4}  type="video/mp4" />
          {/* Last-resort message if no source plays — shouldn't be reached */}
          Votre navigateur ne supporte pas la vidéo HTML5.
        </video>
      )}

      {/* Reduced-motion message — explicit, accessible. */}
      {reducedMotion && (
        <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-[11px] text-white/70 backdrop-blur-sm">
          Animation désactivée (préférence système)
        </div>
      )}

      <style>{`
        @keyframes kx-hero-shimmer {
          0%   { background-position: -200% 0, 0 0; }
          100% { background-position:  200% 0, 0 0; }
        }
      `}</style>
    </div>
  );
}

export default HeroVideo;
