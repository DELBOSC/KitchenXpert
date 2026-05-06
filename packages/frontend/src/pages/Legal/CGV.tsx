import React from 'react';
import LegalLayout from './LegalLayout';

export default function CGV(): React.ReactElement {
  return (
    <LegalLayout title="Conditions Générales de Vente">
      <p className="text-sm text-white/50">Dernière mise à jour&nbsp;: {new Date().toLocaleDateString('fr-FR')}. Applicables à tout consommateur au sens du Code de la consommation.</p>

      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent la vente des services et produits proposés
        par KitchenXpert SAS sur le site kitchenxpert.com&nbsp;: configuration de
        cuisine, génération IA, devis certifiés, mise en relation avec des
        installateurs partenaires, et abonnements payants.
      </p>

      <h2>2. Prix</h2>
      <p>
        Les prix sont indiqués en euros toutes taxes comprises (TTC). La TVA applicable
        est celle en vigueur au jour de la commande. KitchenXpert se réserve le droit
        de modifier ses prix à tout moment, les produits seront facturés au tarif en
        vigueur au moment de la validation de la commande.
      </p>

      <h2>3. Paiement</h2>
      <p>
        Les paiements sont traités par notre prestataire Stripe Payments Europe (conforme
        PCI-DSS niveau 1). Aucune donnée de carte n'est stockée sur nos serveurs. Les
        paiements supérieurs à 30&nbsp;€ font l'objet d'une authentification forte
        (3-D Secure) conformément à la directive DSP2.
      </p>

      <h2>4. Droit de rétractation</h2>
      <p>
        Conformément aux articles L.221-18 et suivants du Code de la consommation, le
        consommateur dispose d'un délai de <strong>quatorze (14) jours</strong> à compter de la
        conclusion du contrat pour exercer son droit de rétractation, sans motif ni pénalité.
      </p>
      <p>
        Ce droit s'exerce en écrivant à <a href="mailto:support@kitchenxpert.com">support@kitchenxpert.com</a>
        {' '}ou en utilisant le formulaire-type ci-dessous.
      </p>
      <p>
        <strong>Exception&nbsp;:</strong> conformément à l'article L.221-28 1°, le
        consommateur renonce à son droit de rétractation pour les services pleinement
        exécutés avant la fin du délai (ex. génération IA consommée, devis certifié émis),
        à condition d'avoir donné son accord préalable exprès.
      </p>

      <h2>5. Garanties légales</h2>
      <p>
        Les produits bénéficient de la garantie légale de conformité (articles L.217-3
        et suivants du Code de la consommation — 2 ans) et de la garantie des vices
        cachés (articles 1641 et suivants du Code civil).
      </p>

      <h2>6. Abonnements</h2>
      <p>
        Les abonnements sont conclus pour la durée choisie (mensuelle ou annuelle) et
        reconduits tacitement. Le consommateur peut résilier à tout moment depuis son
        espace client&nbsp;; la résiliation prend effet à la fin de la période en cours.
      </p>

      <h2>7. Responsabilité</h2>
      <p>
        Les suggestions générées par notre IA constituent une aide à la décision et ne
        se substituent pas à l'avis d'un cuisiniste, architecte ou artisan qualifié.
        KitchenXpert ne garantit pas la faisabilité technique des designs générés.
      </p>

      <h2>8. Loi applicable et juridiction</h2>
      <p>
        Les présentes conditions sont régies par le droit français. En cas de litige,
        le consommateur peut recourir au médiateur de la consommation (voir Mentions
        légales) ou à la plateforme européenne de règlement en ligne
        (<a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>).
      </p>

      <h2>Formulaire-type de rétractation</h2>
      <pre className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
{`À l'attention de KitchenXpert SAS, [adresse] — support@kitchenxpert.com

Je vous notifie par la présente ma rétractation du contrat portant sur
la prestation de service ci-dessous :

- Commandé le : ___________________
- Numéro de commande : _____________
- Nom du consommateur : ____________
- Adresse : ________________________
- Date : ___________________________
- Signature (si papier) : __________`}
      </pre>
    </LegalLayout>
  );
}
