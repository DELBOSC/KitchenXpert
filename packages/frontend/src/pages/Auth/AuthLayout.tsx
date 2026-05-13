import { motion } from 'framer-motion';
import React from 'react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Right-side marketing panel content; defaults to a branded testimonial. */
  aside?: React.ReactNode;
}

export default function AuthLayout({ title, subtitle, children, footer, aside }: AuthLayoutProps): React.ReactElement {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/20 via-fuchsia-500/15 to-transparent blur-3xl" />
        <div className="kx-grid-pattern absolute inset-0" />
      </div>

      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left: form panel */}
        <div className="flex flex-col justify-between px-6 py-10 lg:px-16">
          <Link to="/" className="inline-flex items-center gap-2 self-start">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-400 to-fuchsia-500 shadow-lg shadow-fuchsia-500/30" />
            <span className="text-lg font-semibold tracking-tight">KitchenXpert</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto w-full max-w-md py-12"
          >
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-white/60">{subtitle}</p>}
            <div className="mt-10">{children}</div>
            {footer && <div className="mt-8 text-sm text-white/60">{footer}</div>}
          </motion.div>

          <p className="text-xs text-white/30">© {new Date().getFullYear()} KitchenXpert — Hébergé dans l'UE</p>
        </div>

        {/* Right: marketing panel */}
        <aside className="relative hidden overflow-hidden border-l border-white/10 bg-gradient-to-br from-indigo-500/10 via-fuchsia-500/5 to-transparent lg:block">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(232,121,249,0.15),transparent_60%)]" />
          <div className="relative flex h-full flex-col justify-center px-16">
            {aside ?? <DefaultAside />}
          </div>
        </aside>
      </div>
    </div>
  );
}

function DefaultAside(): React.ReactElement {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="max-w-lg"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Nouveau configurateur IA v2
      </div>
      <p className="text-3xl font-medium leading-tight tracking-tight text-white">
        « On a remplacé trois logiciels par KitchenXpert. Le rendu 3D est bluffant
        et le devis fournisseur intégré nous fait gagner deux jours par projet. »
      </p>
      <div className="mt-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-500" />
        <div>
          <div className="text-sm font-semibold">Camille Laroche</div>
          <div className="text-xs text-white/50">Architecte d'intérieur · Studio Maison</div>
        </div>
      </div>
    </motion.div>
  );
}
