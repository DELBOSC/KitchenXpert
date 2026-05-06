import React from 'react';
import LegalLayout from './LegalLayout';

export default function MentionsLegales(): React.ReactElement {
  return (
    <LegalLayout title="Mentions légales">
      <p className="text-sm text-white/50">Conformes à l'article 6-III de la loi n° 2004-575 pour la confiance dans l'économie numérique (LCEN).</p>

      <h2>Éditeur du site</h2>
      <p>
        <strong>KitchenXpert SAS</strong><br />
        Société par actions simplifiée au capital de 10 000 €<br />
        Siège social&nbsp;: [à compléter]<br />
        RCS&nbsp;: [Ville – n° SIREN]<br />
        SIRET&nbsp;: [à compléter]<br />
        N° TVA intracommunautaire&nbsp;: FR[à compléter]<br />
        Directeur de la publication&nbsp;: [Nom – Prénom]<br />
        Contact&nbsp;: <a href="mailto:contact@kitchenxpert.com">contact@kitchenxpert.com</a>
      </p>

      <h2>Hébergeur</h2>
      <p>
        [Nom de l'hébergeur — ex. OVH SAS]<br />
        [Adresse — ex. 2 rue Kellermann, 59100 Roubaix, France]<br />
        Téléphone&nbsp;: [à compléter]
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L'ensemble des éléments constituant le site (textes, graphismes, logiciels,
        photographies, images, vidéos, marques) est la propriété exclusive de
        KitchenXpert SAS ou de ses partenaires. Toute reproduction, représentation
        ou diffusion, totale ou partielle, est interdite sans accord préalable écrit.
      </p>

      <h2>Médiation à la consommation</h2>
      <p>
        Conformément aux articles L.611-1 et suivants du Code de la consommation,
        le consommateur peut recourir gratuitement au médiateur&nbsp;: [Nom du
        médiateur agréé] — [site web].
      </p>

      <h2>Signaler un contenu</h2>
      <p>
        Pour tout signalement de contenu illicite&nbsp;: <a href="mailto:abuse@kitchenxpert.com">abuse@kitchenxpert.com</a>.
      </p>
    </LegalLayout>
  );
}
