import React from 'react';
import LegalLayout from './LegalLayout';

export default function Cookies(): React.ReactElement {
  const resetConsent = (): void => {
    localStorage.removeItem('kx.cookie-consent.v1');
    window.location.reload();
  };

  return (
    <LegalLayout title="Politique cookies">
      <p className="text-sm text-white/50">Conforme à la Directive ePrivacy 2002/58/CE et aux lignes directrices CNIL de septembre 2020.</p>

      <h2>1. Qu'est-ce qu'un cookie&nbsp;?</h2>
      <p>
        Un cookie est un petit fichier déposé sur votre terminal lors de la consultation
        d'un site. Il permet de mémoriser des informations (préférences, session, statistiques).
      </p>

      <h2>2. Catégories utilisées</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left">
            <th className="py-2">Catégorie</th>
            <th className="py-2">Finalité</th>
            <th className="py-2">Durée</th>
            <th className="py-2">Consentement</th>
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-white/5">
          <tr>
            <td className="py-2">Nécessaires</td>
            <td className="py-2">Connexion, sécurité CSRF, équilibrage de charge</td>
            <td className="py-2">Session</td>
            <td className="py-2">Exempté</td>
          </tr>
          <tr>
            <td className="py-2">Préférences</td>
            <td className="py-2">Langue, thème, affichage</td>
            <td className="py-2">12 mois</td>
            <td className="py-2">Exempté</td>
          </tr>
          <tr>
            <td className="py-2">Mesure d'audience</td>
            <td className="py-2">Statistiques anonymisées</td>
            <td className="py-2">13 mois</td>
            <td className="py-2">Requis</td>
          </tr>
          <tr>
            <td className="py-2">Marketing</td>
            <td className="py-2">Publicités personnalisées tiers</td>
            <td className="py-2">13 mois</td>
            <td className="py-2">Requis</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Gérer vos préférences</h2>
      <p>
        Vous pouvez à tout moment modifier votre choix ou retirer votre consentement.
      </p>
      <button
        onClick={resetConsent}
        className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10"
      >
        Modifier mes préférences cookies
      </button>

      <h2>4. Cookies tiers</h2>
      <p>
        Nous utilisons Stripe (strictement nécessaire au paiement) et, sous réserve de
        votre consentement, un outil de mesure d'audience respectueux (Plausible ou
        Matomo, configuration «&nbsp;CNIL-exempt&nbsp;»).
      </p>
    </LegalLayout>
  );
}
