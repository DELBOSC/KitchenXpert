import React from 'react';

import LegalLayout from './LegalLayout';
import { LEGAL, formatAddressLine } from '../../config/legal';

/**
 * Conditions Générales de Vente (CGV).
 *
 * Drafted to comply with:
 *   - Code de la consommation (rétractation, garanties, médiation)
 *   - Code civil (vices cachés, formation du contrat)
 *   - Directive 2011/83/UE (information précontractuelle)
 *   - DSP2 / Règlement (UE) 2018/389 (authentification forte SCA)
 *   - LCEN art. 19 (mentions des prix TTC)
 *
 * The structured 10-article layout mirrors what the DGCCRF expects to
 * find when auditing a French B2C SaaS — keep the headings stable.
 */
export default function CGV(): React.ReactElement {
  const { editor, mediator, pricingTiers, lastRevised } = LEGAL;
  const fmtDate = new Date(lastRevised).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <LegalLayout title="Conditions Générales de Vente">
      <p className="text-sm text-white/50">
        Version en vigueur depuis le {fmtDate}. Applicables à tout
        consommateur au sens de l'article liminaire du Code de la
        consommation.
      </p>

      <h2>Article 1 — Objet et champ d'application</h2>
      <p>
        Les présentes Conditions Générales de Vente (ci-après «&nbsp;CGV&nbsp;»)
        régissent, sans restriction ni réserve, l'ensemble des
        prestations de service proposées par <strong>{editor.socialName}</strong>{' '}
        (ci-après «&nbsp;{editor.brandName}&nbsp;» ou «&nbsp;l'Éditeur&nbsp;») sur le site
        accessible à l'adresse{' '}
        <a href="https://www.kitchenxpert.com">www.kitchenxpert.com</a>{' '}
        (ci-après «&nbsp;le Site&nbsp;»).
      </p>
      <p>
        Les services concernent&nbsp;: la conception assistée par ordinateur
        de cuisines en 3D, la génération automatisée de configurations
        par intelligence artificielle, l'accès aux catalogues de nos
        partenaires fabricants, l'émission de devis fournisseurs, la mise
        en relation avec des installateurs et la souscription d'un
        abonnement payant.
      </p>
      <p>
        Les présentes CGV s'appliquent exclusivement aux ventes conclues
        à distance, en ligne, avec des consommateurs résidant en France
        métropolitaine, dans les départements et régions d'outre-mer ou
        dans un État membre de l'Union européenne. Toute commande passée
        sur le Site implique l'acceptation pleine et entière des CGV.
      </p>

      <h2>Article 2 — Acceptation des CGV</h2>
      <p>
        Lors de la création de son compte, le client est invité à lire et
        à accepter expressément les CGV au moyen d'une case à cocher,
        accompagnée d'un lien vers le présent document. Cette acceptation
        est horodatée et conservée à titre de preuve dans nos systèmes
        pendant toute la durée du contrat, et au-delà aux fins probatoires.
      </p>
      <p>
        L'Éditeur se réserve le droit de modifier les CGV à tout moment.
        Les CGV applicables à toute commande sont celles en vigueur au
        moment de la validation de la commande. En cas de modification
        substantielle des CGV, les clients existants sont informés par
        email au moins trente (30) jours avant l'entrée en vigueur des
        modifications.
      </p>

      <h2>Article 3 — Description des services et formules</h2>
      <p>
        L'Éditeur propose les formules d'abonnement suivantes&nbsp;:
      </p>
      <ul>
        {pricingTiers.map((tier) => (
          <li key={tier.id}>
            <strong>{tier.name}</strong> —{' '}
            {tier.monthlyEuros === 0
              ? 'gratuit'
              : `${tier.monthlyEuros.toFixed(2)} € TTC par mois`}
            . {tier.description}
          </li>
        ))}
      </ul>
      <p>
        Les fonctionnalités précises de chaque formule sont détaillées
        sur la page <a href="/pricing">Tarifs</a>. L'Éditeur peut faire
        évoluer le périmètre fonctionnel des formules sans modification
        des présentes CGV, à condition que la valeur globale du service
        soit maintenue ou améliorée.
      </p>

      <h2>Article 4 — Prix et modalités de paiement</h2>
      <p>
        Les prix indiqués sont en euros, toutes taxes comprises (TTC), au
        taux de TVA en vigueur au jour de la commande. Le client est
        informé que le taux de TVA peut évoluer en application de la
        législation, ce qui entraînera l'ajustement automatique du prix
        TTC sans préavis.
      </p>
      <p>
        Le paiement s'effectue par carte bancaire (Visa, Mastercard,
        American Express, CB) via notre prestataire <strong>Stripe
        Payments Europe Ltd.</strong>, certifié PCI-DSS niveau 1. Aucune
        donnée de carte ne transite ni n'est stockée sur les serveurs de
        l'Éditeur.
      </p>
      <p>
        Conformément à la directive (UE) 2015/2366 (DSP2) et au règlement
        délégué (UE) 2018/389, tout paiement supérieur à 30&nbsp;€ fait
        l'objet d'une procédure d'<strong>authentification forte du client
        (SCA)</strong> via 3-D Secure. L'absence d'authentification réussie
        entraîne le refus de la transaction.
      </p>
      <p>
        Les abonnements mensuels sont prélevés à la date anniversaire de
        la souscription. En cas d'échec de prélèvement, l'Éditeur procède
        à trois (3) tentatives sur sept (7) jours&nbsp;; au-delà,
        l'abonnement est suspendu et l'accès aux fonctionnalités
        premium désactivé jusqu'à régularisation.
      </p>

      <h2>Article 5 — Droit de rétractation</h2>
      <p>
        Conformément aux articles L221-18 et suivants du Code de la
        consommation, le consommateur dispose d'un délai de{' '}
        <strong>quatorze (14) jours francs</strong> à compter de la
        conclusion du contrat pour exercer son droit de rétractation,
        sans avoir à justifier de motif ni à payer de pénalité, à
        l'exclusion des frais éventuels mentionnés à l'article L221-23.
      </p>
      <p>
        Pour exercer ce droit, le consommateur doit notifier sa décision
        de rétractation par email à{' '}
        <a href={`mailto:${editor.email}`}>{editor.email}</a> en
        utilisant le formulaire-type ci-dessous, ou par toute autre
        déclaration dénuée d'ambiguïté.
      </p>
      <p>
        <strong>Exception — service pleinement exécuté.</strong> En
        application de l'article L221-28 1° du Code de la consommation,
        le droit de rétractation ne s'applique pas&nbsp;:
      </p>
      <ul>
        <li>
          Aux contrats de fourniture de services pleinement exécutés
          avant la fin du délai de rétractation, à condition que le
          consommateur ait donné son accord préalable exprès et ait
          renoncé expressément à son droit de rétractation. C'est
          notamment le cas lorsque le consommateur déclenche la
          génération d'une cuisine par notre IA, télécharge un devis
          certifié ou exporte un fichier BIM&nbsp;;
        </li>
        <li>
          À la fourniture d'un contenu numérique non fourni sur un
          support matériel dont l'exécution a commencé avec l'accord
          préalable exprès du consommateur (Art. L221-28 13°).
        </li>
      </ul>
      <p>
        En dehors de ces exceptions, le remboursement intervient au plus
        tard dans les <strong>quatorze (14) jours</strong> suivant la
        réception de la notification de rétractation, par le même moyen
        de paiement que celui utilisé lors de la transaction initiale.
      </p>
      <FormulaireRetractation />

      <h2>Article 6 — Garanties légales</h2>
      <p>
        L'Éditeur est tenu de plein droit à la <strong>garantie légale
        de conformité</strong> mentionnée aux articles L217-3 et
        suivants du Code de la consommation. Cette garantie est
        applicable pendant <strong>deux (2) ans</strong> à compter de la
        fourniture initiale du contenu numérique ou du service
        numérique.
      </p>
      <p>
        L'Éditeur est également tenu à la <strong>garantie des vices
        cachés</strong> définie aux articles 1641 à 1648 du Code civil,
        permettant au client de choisir entre la résolution de la vente
        ou une réduction du prix, dans un délai de deux (2) ans à
        compter de la découverte du vice.
      </p>
      <p>
        Pour mettre en œuvre l'une de ces garanties, le client doit
        contacter le service client à{' '}
        <a href={`mailto:${editor.email}`}>{editor.email}</a> en
        décrivant précisément le défaut constaté.
      </p>

      <h2>Article 7 — Responsabilité</h2>
      <p>
        Les prestations fournies par {editor.brandName} sont des
        <em> prestations de service de la société de l'information</em>{' '}
        au sens de la directive 2000/31/CE. L'Éditeur s'engage à apporter
        tout le soin nécessaire à la conception, l'exploitation et la
        maintenance du Site.
      </p>
      <p>
        L'Éditeur ne saurait toutefois être tenu pour responsable&nbsp;:
      </p>
      <ul>
        <li>
          des défaillances techniques imputables à des facteurs externes
          (panne de l'opérateur télécoms du client, indisponibilité
          d'infrastructures tierces, force majeure)&nbsp;;
        </li>
        <li>
          de l'inadéquation entre les designs générés par l'IA et la
          réalité technique du chantier (présence d'une canalisation
          imprévue, charpente non conforme, etc.). Les <strong>devis
          générés constituent une aide à la décision et ne se substituent
          en aucun cas à l'avis d'un professionnel qualifié</strong>{' '}
          (cuisiniste, architecte, plombier, électricien)&nbsp;;
        </li>
        <li>
          des dommages indirects (perte de chance, préjudice commercial,
          atteinte à l'image) résultant de l'utilisation du Site.
        </li>
      </ul>
      <p>
        En tout état de cause, la responsabilité de l'Éditeur est plafonnée
        au montant total des sommes effectivement versées par le client au
        cours des douze (12) derniers mois précédant le fait générateur du
        dommage.
      </p>

      <h2>Article 8 — Données à caractère personnel</h2>
      <p>
        Le traitement des données personnelles collectées dans le cadre
        de l'exécution du présent contrat est régi par notre{' '}
        <a href="/legal/privacy">Politique de confidentialité</a>, qui
        détaille les finalités, les bases légales, les durées de
        conservation, les destinataires, les transferts hors UE et les
        droits des personnes concernées au titre du Règlement (UE) 2016/679
        (RGPD) et de la loi Informatique et Libertés modifiée.
      </p>
      <p>
        Le client peut à tout moment exercer ses droits depuis la page{' '}
        <a href="/legal/privacy-settings">Mes données</a> ou en
        contactant notre Délégué à la Protection des Données&nbsp;:{' '}
        <a href={`mailto:${editor.dpoEmail}`}>{editor.dpoEmail}</a>.
      </p>

      <h2>Article 9 — Médiation à la consommation</h2>
      <p>
        Conformément à l'article L612-1 du Code de la consommation, en
        cas de litige non résolu après une réclamation écrite préalable
        adressée au service client, le consommateur peut recourir
        gratuitement au médiateur suivant&nbsp;:
      </p>
      <p>
        <strong>{mediator.name}</strong><br />
        {formatAddressLine(mediator.address)}<br />
        Email&nbsp;: <a href={`mailto:${mediator.email}`}>{mediator.email}</a><br />
        Site&nbsp;:{' '}
        <a href={mediator.url} target="_blank" rel="noopener noreferrer">
          {mediator.url}
        </a>
      </p>

      <h2>Article 10 — Loi applicable et juridiction compétente</h2>
      <p>
        Les présentes CGV sont régies par la loi française. Les parties
        s'efforceront de résoudre à l'amiable tout différend relatif à
        leur interprétation ou leur exécution. À défaut, et sous réserve
        des dispositions plus favorables au consommateur, le litige sera
        porté devant les juridictions françaises compétentes
        conformément aux articles 42 et suivants du Code de procédure
        civile.
      </p>
      <p>
        Le consommateur peut saisir, à son choix, soit le tribunal du
        ressort du siège social de l'Éditeur, soit la juridiction du lieu
        où il demeurait au moment de la conclusion du contrat ou de la
        survenance du fait dommageable (art. R631-3 du Code de la
        consommation).
      </p>
    </LegalLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* COMPONENTS                                                            */
/* ─────────────────────────────────────────────────────────────────── */

/** Annex required by Art. L221-19 — must be reproduced verbatim. */
function FormulaireRetractation(): React.ReactElement {
  const { editor } = LEGAL;
  return (
    <>
      <h3>Formulaire-type de rétractation</h3>
      <pre className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm whitespace-pre-wrap">
{`À l'attention de ${editor.socialName}
${formatAddressLine(editor.address)}
${editor.email}

Je vous notifie par la présente ma rétractation du contrat portant sur
la prestation de service ci-dessous :

  • Commandé le : _________________
  • Numéro de commande : ___________
  • Nom du consommateur : __________
  • Adresse du consommateur : ______
  • Date : _________________________
  • Signature (uniquement en cas de notification papier) :`}
      </pre>
    </>
  );
}
