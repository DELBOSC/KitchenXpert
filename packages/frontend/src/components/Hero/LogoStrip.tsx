import React from 'react';

/**
 * Logo strip — "Compatible avec votre fournisseur préféré".
 *
 * ⚠️ JURIDIQUE — usage des marques tierces
 * ───────────────────────────────────────
 * Afficher des logos de marques sans accord explicite est risqué :
 *   - Risque de confusion (Art. L713-2 CPI) : un visiteur peut croire
 *     à un partenariat commercial qui n'existe pas.
 *   - Pratique commerciale trompeuse (L121-1 C. conso) si on laisse
 *     entendre une « approbation » par la marque.
 *
 * Trois protections appliquées ici :
 *   1. Wording neutre : « Catalogues compatibles » et non « Nos partenaires ».
 *   2. Mention obligatoire en pied : « marques de leurs propriétaires
 *      respectifs » (visible, pas en 6px gris-sur-gris).
 *   3. Logos chargés depuis le press-kit officiel quand possible. À
 *      défaut, on rend le NOM de la marque dans la même police que le
 *      reste du site — pas de risque de marque figurative.
 *
 * AVANT D'ACTIVER LES LOGOS RÉELS :
 *   - Vérifier le press-kit de chaque marque (souvent /press, /media)
 *   - Stocker les SVG/PNG sous /public/brands/
 *   - Mettre à jour `BRANDS[].logoUrl`
 *   - Garder le fallback texte si le logo n'est pas approuvé
 */

interface Brand {
  name: string;
  logoUrl?: string; // optionnel — fallback texte sinon
  href?: string; // lien vers la page guide cuisiniste
}

const BRANDS: Brand[] = [
  { name: 'IKEA', href: '/cuisinistes/ikea' },
  { name: 'Schmidt', href: '/cuisinistes/schmidt' },
  { name: 'Bosch', href: '/cuisinistes/bosch' },
  { name: 'Leroy Merlin', href: '/cuisinistes/leroy-merlin' },
  { name: 'Castorama', href: '/cuisinistes/castorama' },
];

export function LogoStrip(): React.ReactElement {
  return (
    <section
      aria-label="Catalogues fournisseurs compatibles"
      className="mx-auto max-w-7xl px-6 py-12"
    >
      <p className="mb-6 text-center text-xs uppercase tracking-widest text-white/40">
        Catalogues compatibles
      </p>

      <ul className="grid grid-cols-2 items-center gap-8 sm:grid-cols-3 md:grid-cols-5">
        {BRANDS.map((brand) => {
          const inner = brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={brand.name}
              loading="lazy"
              decoding="async"
              className="mx-auto h-7 w-auto opacity-50 grayscale transition hover:opacity-90 hover:grayscale-0"
            />
          ) : (
            <span className="block text-center text-base font-medium tracking-wide text-white/45 transition group-hover:text-white/85">
              {brand.name}
            </span>
          );

          return (
            <li key={brand.name} className="group">
              {brand.href ? (
                <a
                  href={brand.href}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded"
                >
                  {inner}
                </a>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-center text-[11px] text-white/35">
        Les marques citées sont la propriété de leurs détenteurs respectifs. KitchenXpert est un
        éditeur logiciel indépendant ; les liens vers les fournisseurs sont informatifs et ne
        constituent pas un partenariat commercial.
      </p>
    </section>
  );
}

export default LogoStrip;
