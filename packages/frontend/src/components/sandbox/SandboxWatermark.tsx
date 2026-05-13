import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Discreet "Mode démo" watermark that overlays the 3D viewport.
 *
 * Bottom-right placement so it doesn't fight the toolbar (top-right)
 * or the floating panels (left). Semi-transparent + backdrop-blur so
 * it reads on both light and dark scenes. Keyboard-focusable + linked
 * to /register so power users can convert with one tab+enter.
 */
export function SandboxWatermark(): React.ReactElement {
  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-30">
      <Link
        to="/register"
        aria-label="Mode démo — créer un compte pour sauvegarder"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-md transition hover:border-white/30 hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]" aria-hidden />
        Mode démo
        <span className="text-white/50" aria-hidden>·</span>
        <span className="text-white/70">Sauvegarder</span>
      </Link>
    </div>
  );
}

export default SandboxWatermark;
