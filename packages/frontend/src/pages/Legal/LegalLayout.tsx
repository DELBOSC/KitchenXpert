import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/legal/mentions', label: 'Mentions légales' },
  { to: '/legal/cgv', label: 'CGV' },
  { to: '/legal/privacy', label: 'Confidentialité' },
  { to: '/legal/cookies', label: 'Cookies' },
  { to: '/legal/privacy-settings', label: 'Mes données' },
];

export default function LegalLayout({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <span aria-hidden>←</span> Retour à l'accueil
        </Link>

        <div className="grid gap-12 md:grid-cols-[240px_1fr]">
          <aside>
            <div className="text-xs uppercase tracking-widest text-white/40 mb-4">Espace légal</div>
            <nav className="flex flex-col gap-1">
              {NAV.map((n) => {
                const active = pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <main>
            <h1 className="mb-8 text-4xl font-semibold tracking-tight">{title}</h1>
            <div className="prose prose-invert max-w-none prose-headings:tracking-tight prose-p:text-white/80 prose-li:text-white/80">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
