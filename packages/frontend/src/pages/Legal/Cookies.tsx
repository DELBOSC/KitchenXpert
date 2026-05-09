import React from 'react';
import LegalLayout from './LegalLayout';
import { LEGAL } from '../../config/legal';

/**
 * Politique cookies — conforme à la directive ePrivacy 2002/58/CE
 * (transposée à l'article 82 de la loi Informatique et Libertés) et aux
 * lignes directrices CNIL du 17 septembre 2020.
 *
 * Principes appliqués :
 *   - le bouton « Tout refuser » est aussi accessible et visible que
 *     « Tout accepter » dans le composant CookieConsent ;
 *   - aucun cookie non essentiel n'est posé tant que le consentement
 *     n'est pas explicitement donné ;
 *   - la durée de vie de chaque cookie est inférieure à 13 mois.
 */

interface CookieEntry {
  name: string;
  party: '1st' | '3rd';
  category: 'essential' | 'functional' | 'analytics' | 'marketing';
  purpose: string;
  duration: string;
  publisher: string;
}

const COOKIES: CookieEntry[] = [
  // Essential — exempted from consent (Art. 82 loi I&L).
  { name: 'accessToken',         party: '1st', category: 'essential',  purpose: 'Token de session JWT pour l\'authentification.',                    duration: '15 minutes', publisher: 'KitchenXpert' },
  { name: 'refreshToken',        party: '1st', category: 'essential',  purpose: 'Token de renouvellement de session.',                                duration: '7 jours',     publisher: 'KitchenXpert' },
  { name: 'csrf-token',          party: '1st', category: 'essential',  purpose: 'Protection contre les attaques CSRF (jeton anti-rejeu).',            duration: 'Session',     publisher: 'KitchenXpert' },
  { name: 'kx.cookie-consent.v1',party: '1st', category: 'essential',  purpose: 'Mémorise votre choix de consentement aux cookies.',                  duration: '13 mois',     publisher: 'KitchenXpert' },
  { name: '__stripe_mid',        party: '3rd', category: 'essential',  purpose: 'Identifiant de session anonyme pour la prévention de la fraude Stripe.', duration: '1 an',    publisher: 'Stripe' },
  { name: '__stripe_sid',        party: '3rd', category: 'essential',  purpose: 'Détection de fraude au moment du paiement.',                         duration: '30 minutes',  publisher: 'Stripe' },

  // Functional — exempted because user-driven.
  { name: 'kx.theme',            party: '1st', category: 'functional', purpose: 'Mémorise votre préférence de thème (clair/sombre/système).',         duration: '12 mois',     publisher: 'KitchenXpert' },
  { name: 'kx.lang',             party: '1st', category: 'functional', purpose: 'Mémorise votre langue d\'affichage.',                                 duration: '12 mois',     publisher: 'KitchenXpert' },
  { name: 'kx.last-kitchen',     party: '1st', category: 'functional', purpose: 'Restaure la dernière cuisine ouverte au prochain accès.',            duration: '90 jours',    publisher: 'KitchenXpert' },

  // Analytics — require consent.
  { name: '_pa',                 party: '3rd', category: 'analytics',  purpose: 'Plausible Analytics — mesure d\'audience anonymisée (sans IP, sans tracking).', duration: 'Session', publisher: 'Plausible Insights' },
  { name: '_kx_session_id',      party: '1st', category: 'analytics',  purpose: 'Statistiques agrégées internes (parcours, durée, événements clés).', duration: '13 mois',     publisher: 'KitchenXpert' },

  // Marketing — require consent.
  { name: '_fbp',                party: '3rd', category: 'marketing',  purpose: 'Pixel Meta — attribution publicitaire et reciblage.',                duration: '90 jours',    publisher: 'Meta Platforms' },
  { name: '_gcl_au',             party: '3rd', category: 'marketing',  purpose: 'Google Ads — mesure de conversion publicitaire.',                    duration: '90 jours',    publisher: 'Google' },
];

const CATEGORY_LABELS: Record<CookieEntry['category'], string> = {
  essential:  'Strictement nécessaires',
  functional: 'Fonctionnels',
  analytics:  'Mesure d\'audience',
  marketing:  'Marketing',
};

const CATEGORY_NOTES: Record<CookieEntry['category'], string> = {
  essential:  'Indispensables au fonctionnement du Site (connexion, sécurité, panier). Exemptés du recueil de consentement par l\'article 82 de la loi Informatique et Libertés.',
  functional: 'Améliorent votre confort d\'utilisation en mémorisant vos choix d\'interface. Exemptés du consentement car activés à votre demande.',
  analytics:  'Mesure d\'audience strictement nécessaire à l\'éditeur. Plausible Analytics est configuré en mode « CNIL-exempt » (sans cookie persistant ni adresse IP).',
  marketing:  'Permettent d\'évaluer l\'efficacité de nos campagnes publicitaires et de vous proposer des contenus personnalisés. Activés uniquement avec votre consentement explicite.',
};

export default function Cookies(): React.ReactElement {
  const { lastRevised } = LEGAL;
  const fmtDate = new Date(lastRevised).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const resetConsent = (): void => {
    localStorage.removeItem('kx.cookie-consent.v1');
    window.location.reload();
  };

  const groupedByCategory = (Object.keys(CATEGORY_LABELS) as CookieEntry['category'][]).map(
    (cat) => ({ cat, items: COOKIES.filter((c) => c.category === cat) }),
  );

  return (
    <LegalLayout title="Politique cookies">
      <p className="text-sm text-white/50">
        Conforme à la Directive ePrivacy 2002/58/CE, à l'article 82 de la
        loi Informatique et Libertés et aux lignes directrices CNIL du
        17 septembre 2020. Version en vigueur depuis le {fmtDate}.
      </p>

      <h2>1. Qu'est-ce qu'un cookie&nbsp;?</h2>
      <p>
        Un cookie est un petit fichier texte déposé par un site web sur
        votre appareil (ordinateur, mobile, tablette) lors de la
        consultation d'une page. Il permet au site de reconnaître votre
        appareil lors des visites suivantes, de retenir vos préférences,
        d'authentifier votre session ou de mesurer l'audience.
      </p>
      <p>
        Les <em>traceurs assimilés</em> (pixels invisibles, fingerprinting,
        local storage, session storage, IndexedDB, cache HTTP, etc.) sont
        soumis au même régime juridique que les cookies. La présente
        politique couvre l'ensemble de ces dispositifs.
      </p>

      <h2>2. Notre engagement</h2>
      <p>
        Nous respectons les principes suivants&nbsp;:
      </p>
      <ul>
        <li>Aucun cookie non essentiel n'est déposé tant que vous
          n'avez pas donné votre consentement explicite.</li>
        <li>Le bouton <strong>« Tout refuser »</strong> est aussi
          accessible et visible que <strong>« Tout accepter »</strong>{' '}
          (exigence CNIL 2020).</li>
        <li>Vous pouvez retirer votre consentement à tout moment, en un
          clic, sans perte de fonctionnalité essentielle.</li>
        <li>La durée de vie des cookies non-essentiels n'excède pas
          13&nbsp;mois&nbsp;; le consentement est redemandé au-delà.</li>
        <li>Aucune information n'est partagée avec des tiers à des
          fins commerciales sans votre accord exprès.</li>
      </ul>

      <h2>3. Liste exhaustive des cookies utilisés</h2>
      <p>
        Vous trouverez ci-dessous la liste complète des cookies que le
        Site est susceptible de déposer, regroupés par catégorie.
        Cliquez sur «&nbsp;Modifier mes préférences&nbsp;» en bas de
        cette page pour ajuster vos choix.
      </p>

      {groupedByCategory.map(({ cat, items }) => (
        <section key={cat} className="not-prose mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="mb-2 text-lg font-semibold text-white">
            {CATEGORY_LABELS[cat]}
          </h3>
          <p className="mb-4 text-sm text-white/60">{CATEGORY_NOTES[cat]}</p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left">
                  <th className="py-2 pr-3">Nom</th>
                  <th className="py-2 pr-3">Finalité</th>
                  <th className="py-2 pr-3">Durée</th>
                  <th className="py-2 pr-3">Éditeur</th>
                  <th className="py-2">Origine</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-b [&>tr]:border-white/5">
                {items.map((c) => (
                  <tr key={c.name}>
                    <td className="py-2 pr-3 align-top font-mono text-xs">{c.name}</td>
                    <td className="py-2 pr-3 align-top">{c.purpose}</td>
                    <td className="py-2 pr-3 align-top whitespace-nowrap">{c.duration}</td>
                    <td className="py-2 pr-3 align-top">{c.publisher}</td>
                    <td className="py-2 align-top">{c.party === '1st' ? 'Interne' : 'Tiers'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <h2>4. Gérer mes préférences</h2>
      <p>
        Vous pouvez modifier votre choix de consentement à tout moment.
        Le bouton ci-dessous rouvre le panneau&nbsp;:
      </p>
      <button
        onClick={resetConsent}
        className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10"
      >
        Modifier mes préférences cookies
      </button>

      <h2>5. Cookies de tiers et désactivation côté navigateur</h2>
      <p>
        Indépendamment de notre panneau de consentement, vous pouvez
        configurer votre navigateur pour bloquer tout ou partie des
        cookies. Ces réglages peuvent altérer le fonctionnement de
        services essentiels (connexion, paiement)&nbsp;:
      </p>
      <ul>
        <li>
          <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">
            Google Chrome
          </a>
        </li>
        <li>
          <a href="https://support.mozilla.org/fr/kb/protection-renforcee-contre-pistage-firefox-ordinateur" target="_blank" rel="noopener noreferrer">
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer">
            Apple Safari
          </a>
        </li>
        <li>
          <a href="https://support.microsoft.com/fr-fr/microsoft-edge/" target="_blank" rel="noopener noreferrer">
            Microsoft Edge
          </a>
        </li>
      </ul>

      <h2>6. Réclamation</h2>
      <p>
        Si vous estimez, après nous avoir contactés, que vos droits ne
        sont pas respectés, vous pouvez introduire une réclamation auprès
        de la CNIL — 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex
        07 —{' '}
        <a href="https://www.cnil.fr/plaintes" target="_blank" rel="noopener noreferrer">
          www.cnil.fr/plaintes
        </a>
        .
      </p>
    </LegalLayout>
  );
}
