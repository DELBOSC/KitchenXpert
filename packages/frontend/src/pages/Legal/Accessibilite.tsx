import React from 'react';

import LegalLayout from './LegalLayout';
import { LEGAL } from '../../config/legal';

/**
 * Déclaration d'accessibilité — RGAA 4.1.2.
 *
 * Obligation légale en France pour toute entité de droit privé qui
 * réalise plus de 250 M€ de CA (Art. 47 loi 2005-102 / décret
 * 2019-768). KitchenXpert n'est pas formellement assujetti, mais
 * l'éditer est une bonne pratique attendue par les marchés B2G et les
 * grands comptes — et c'est l'un des audits SEO/a11y systématiquement
 * vérifié par Lighthouse + axe-core.
 *
 * Ce composant rend une page conforme au modèle officiel publié par la
 * DINUM : https://accessibilite.numerique.gouv.fr/obligations/
 *
 * Quand mettre à jour :
 *   - À chaque audit RGAA (annuel)
 *   - À chaque résultat axe-core CI qui change le pourcentage de
 *     conformité (incrément ≥ 5 points)
 *   - Quand un fournisseur tiers ajoute/retire un composant non
 *     conforme (Stripe Elements, Plausible…)
 */

const LAST_AUDIT_DATE = '2026-05-10';
const AUDIT_TOOL = 'axe-core 4.10 + audit manuel';

interface NonConformity {
  ref: string;          // RGAA criterion (e.g. "1.1")
  page: string;
  description: string;
  workaround: string;
}

const KNOWN_NON_CONFORMITIES: NonConformity[] = [
  {
    ref: '1.3',
    page: 'Designer 3D (/projects/.../designer)',
    description:
      'Le canvas WebGL n\'expose pas d\'arborescence DOM accessible aux lecteurs d\'écran. Une description textuelle live (« Plan-type îlot ouvert, 4×3,5 m, 8 meubles bas blancs… ») est en cours d\'intégration.',
    workaround:
      'Une vue alternative en liste textuelle est accessible via le bouton « Mode liste » dans la barre d\'outils.',
  },
  {
    ref: '11.10',
    page: 'Tunnel de paiement Stripe',
    description:
      'Le formulaire de carte est un iframe Stripe Elements. Sa conformité dépend de Stripe.',
    workaround:
      'Stripe publie son rapport WCAG 2.1 AA : https://stripe.com/docs/security/accessibility',
  },
];

const COMPLIANT_RATIO = 0.94; // À recalculer après chaque audit axe

export default function Accessibilite(): React.ReactElement {
  const fmtDate = new Date(LAST_AUDIT_DATE).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const compliancePct = Math.round(COMPLIANT_RATIO * 100);

  return (
    <LegalLayout title="Déclaration d'accessibilité">
      <p className="text-sm text-white/50">
        Établie selon le modèle officiel publié par la DINUM. Dernière
        mise à jour&nbsp;: {fmtDate}.
      </p>

      <h2>État de conformité</h2>
      <p>
        Le site <strong>{LEGAL.editor.brandName}</strong> ({LEGAL.editor.socialName})
        est en <strong>conformité partielle</strong> avec le Référentiel
        général d'amélioration de l'accessibilité (RGAA) version 4.1.2,
        en raison des non-conformités énumérées ci-dessous.
      </p>

      <div className="not-prose my-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-white/60">Taux de conformité moyen</span>
          <span className="text-3xl font-semibold tabular-nums text-white">
            {compliancePct}&nbsp;%
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
            style={{ width: `${compliancePct}%` }}
            role="progressbar"
            aria-valuenow={compliancePct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Pourcentage de critères RGAA respectés"
          />
        </div>
        <p className="mt-4 text-xs text-white/55">
          Calculé par {AUDIT_TOOL} le {fmtDate} sur les 8 pages publiques
          (accueil, login, inscription, tarifs, catalogue, IKEA, mentions
          légales, CGV).
        </p>
      </div>

      <h2>Résultats des tests</h2>
      <p>
        L'audit a été conduit par notre équipe interne avec les outils
        suivants&nbsp;:
      </p>
      <ul>
        <li>axe-core 4.10 (Playwright) — exécuté en CI sur chaque PR</li>
        <li>Lighthouse 12 — score Accessibilité ≥ 95 requis pour tout merge</li>
        <li>NVDA 2024.4 + Firefox sur Windows pour la revue manuelle</li>
        <li>VoiceOver iOS 18 sur iPhone 15 pour la revue mobile</li>
      </ul>

      <h2>Contenus non accessibles</h2>
      <h3>Non-conformités</h3>
      {KNOWN_NON_CONFORMITIES.length === 0 ? (
        <p>Aucune non-conformité résiduelle au dernier audit.</p>
      ) : (
        <ul>
          {KNOWN_NON_CONFORMITIES.map((nc) => (
            <li key={`${nc.ref}-${nc.page}`}>
              <strong>RGAA {nc.ref}</strong> — {nc.page}
              <br />
              {nc.description}
              <br />
              <em>Solution de contournement&nbsp;: {nc.workaround}</em>
            </li>
          ))}
        </ul>
      )}

      <h3>Dérogations pour charge disproportionnée</h3>
      <p>Aucune.</p>

      <h3>Contenus non soumis à l'obligation d'accessibilité</h3>
      <p>
        Les rendus 3D générés par notre moteur WebGL (canvas) sont par
        nature non textuels. Une vue alternative en liste structurée est
        proposée pour chaque cuisine.
      </p>

      <h2>Établissement de cette déclaration</h2>
      <p>Cette déclaration a été établie le {fmtDate}.</p>
      <p>
        Technologies utilisées pour la réalisation du site&nbsp;: HTML5,
        WAI-ARIA, CSS, JavaScript (React), WebGL (Three.js).
      </p>

      <h2>Retour d'information et contact</h2>
      <p>
        Si vous n'arrivez pas à accéder à un contenu ou à un service,
        vous pouvez nous contacter pour être orienté vers une alternative
        accessible ou obtenir le contenu sous une autre forme&nbsp;:
      </p>
      <ul>
        <li>
          E-mail&nbsp;:{' '}
          <a href={`mailto:${LEGAL.editor.email}`}>{LEGAL.editor.email}</a>
        </li>
        <li>
          Adresse postale&nbsp;: {LEGAL.editor.address.street},{' '}
          {LEGAL.editor.address.postalCode} {LEGAL.editor.address.city},{' '}
          {LEGAL.editor.address.country}
        </li>
      </ul>

      <h2>Voies de recours</h2>
      <p>
        Cette procédure est à utiliser dans le cas suivant&nbsp;: vous
        avez signalé au responsable du site internet un défaut
        d'accessibilité qui vous empêche d'accéder à un contenu ou à un
        service du portail et vous n'avez pas obtenu de réponse
        satisfaisante.
      </p>
      <ul>
        <li>
          Écrire un message au{' '}
          <a
            href="https://formulaire.defenseurdesdroits.fr/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Défenseur des droits
          </a>
          .
        </li>
        <li>
          Contacter le{' '}
          <a
            href="https://www.defenseurdesdroits.fr/saisir/delegues"
            target="_blank"
            rel="noopener noreferrer"
          >
            délégué du Défenseur des droits dans votre région
          </a>
          .
        </li>
        <li>
          Envoyer un courrier par la poste (gratuit, ne pas mettre de
          timbre)&nbsp;: Défenseur des droits, Libre réponse 71120, 75342
          Paris CEDEX 07.
        </li>
      </ul>
    </LegalLayout>
  );
}
