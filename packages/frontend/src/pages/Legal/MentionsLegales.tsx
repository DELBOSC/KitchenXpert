import React from 'react';

import LegalLayout from './LegalLayout';
import { LEGAL, formatAddressLines } from '../../config/legal';

/**
 * Mentions légales — required by Art. 6-III of LCEN (loi n° 2004-575).
 *
 * Every concrete value is read from `src/config/legal.ts`. To update the
 * SIRET, hosting provider, etc., edit that file — never edit JSX here.
 */
export default function MentionsLegales(): React.ReactElement {
  const { editor, hosting, mediator } = LEGAL;
  const hostingAddr = formatAddressLines(hosting.address);

  return (
    <LegalLayout title="Mentions légales">
      <p className="text-sm text-white/50">
        Conformes à l&apos;article 6-III de la loi n° 2004-575 du 21 juin 2004 pour la confiance
        dans l&apos;économie numérique (LCEN).
      </p>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>1. Éditeur du site</h2>
      <p>
        Le site <strong>{editor.brandName}</strong> est édité par&nbsp;:
      </p>
      <EditorBlock />

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>2. Directeur de la publication</h2>
      <p>
        Le directeur de la publication est <strong>{editor.directorOfPublication}</strong>, en
        qualité de Président de {editor.socialName}.
      </p>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>3. Hébergeur</h2>
      <p>Le site est hébergé par&nbsp;:</p>
      <p>
        <strong>{hosting.socialName}</strong> ({hosting.legalForm})<br />
        {hostingAddr.map((line, i) => (
          <React.Fragment key={i}>
            {line}
            <br />
          </React.Fragment>
        ))}
        Téléphone&nbsp;: {hosting.phone}
        <br />
        Site&nbsp;:{' '}
        <a href={hosting.url} target="_blank" rel="noopener noreferrer">
          {hosting.url.replace(/^https?:\/\//, '')}
        </a>
      </p>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>4. Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des éléments constituant le site {editor.brandName} — textes, graphismes,
        logiciels, photographies, vidéos, plans 3D générés par notre moteur, marques, logos,
        dénominations commerciales — est la propriété exclusive de {editor.socialName}
        ou fait l&apos;objet d&apos;une concession contractuelle de la part de ses partenaires
        (notamment IKEA, Schmidt, Bosch, Leroy Merlin, Castorama pour leurs catalogues et marques
        respectives).
      </p>
      <p>
        Toute reproduction, représentation, modification, publication, adaptation ou exploitation,
        totale ou partielle, des éléments du site, quel que soit le moyen ou le procédé utilisé, est
        interdite sans l&apos;autorisation écrite préalable de {editor.socialName} — sauf exceptions
        limitativement prévues par les articles L122-5 et L122-6-1 du Code de la propriété
        intellectuelle (courte citation, copie privée, etc.).
      </p>
      <p>
        La marque <strong>{editor.brandName}</strong> et le logo associé sont des marques déposées.
        Toute utilisation non autorisée constitue une contrefaçon sanctionnée par l&apos;article
        L335-2 du Code de la propriété intellectuelle.
      </p>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>5. Médiateur de la consommation</h2>
      <p>
        Conformément aux articles L611-1 et suivants du Code de la consommation, et après une
        tentative de résolution préalable directement auprès de notre service client (
        <a href={`mailto:${editor.email}`}>{editor.email}</a>), le consommateur peut recourir
        gratuitement au médiateur de la consommation suivant&nbsp;:
      </p>
      <p>
        <strong>{mediator.name}</strong>
        <br />
        {formatAddressLines(mediator.address).map((line, i) => (
          <React.Fragment key={i}>
            {line}
            <br />
          </React.Fragment>
        ))}
        Email&nbsp;: <a href={`mailto:${mediator.email}`}>{mediator.email}</a>
        <br />
        Site&nbsp;:{' '}
        <a href={mediator.url} target="_blank" rel="noopener noreferrer">
          {mediator.url.replace(/^https?:\/\//, '')}
        </a>
      </p>
      <p>
        Le consommateur peut également recourir à la plateforme européenne de règlement en ligne des
        litiges (RLL) accessible à l&apos;adresse&nbsp;:{' '}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
          ec.europa.eu/consumers/odr
        </a>
        .
      </p>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>6. Loi applicable et juridiction compétente</h2>
      <p>
        Les présentes mentions légales sont régies par la loi française. Tout litige relatif à
        l&apos;utilisation du site fera l&apos;objet d&apos;une recherche de solution amiable
        préalable. À défaut, et sous réserve des dispositions légales plus protectrices applicables
        au consommateur, le litige sera porté devant les tribunaux français du ressort du siège
        social de l&apos;éditeur, soit le tribunal compétent de{' '}
        {editor.address.city || mediator.address.city}.
      </p>
      <p>
        Le consommateur est libre de saisir, selon son choix, l&apos;un des tribunaux
        territorialement compétents en vertu du Code de procédure civile, ou la juridiction du lieu
        où il demeurait au moment de la conclusion du contrat ou de la survenance du fait
        dommageable (article R631-3 du Code de la consommation).
      </p>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>7. Signaler un contenu illicite</h2>
      <p>
        Conformément à l&apos;article 6-I-5 de la LCEN, tout signalement de contenu illicite,
        violation des droits d&apos;auteur ou usage abusif peut être adressé à&nbsp;:{' '}
        <a href="mailto:abuse@kitchenxpert.com">abuse@kitchenxpert.com</a>. Le signalement doit
        comporter la date, l&apos;identité du déclarant, l&apos;adresse URL du contenu litigieux et
        la motivation juridique précise.
      </p>
    </LegalLayout>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/* COMPONENTS                                                            */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Renders the publisher block as defined by Art. 6-III LCEN. Reads
 * directly from the centralised config so any future SIRET / capital /
 * address change ripples through every page automatically.
 */
function EditorBlock(): React.ReactElement {
  const { editor } = LEGAL;
  const addressLines = formatAddressLines(editor.address);
  const capitalLine =
    editor.capitalEuros !== null
      ? ` au capital de ${editor.capitalEuros.toLocaleString('fr-FR')} €`
      : '';

  return (
    <p>
      <strong>{editor.socialName}</strong>
      <br />
      {editor.legalForm}
      {capitalLine}
      <br />
      Siège social&nbsp;: {addressLines.join(' — ')}
      <br />
      SIREN&nbsp;: {editor.siren}
      <br />
      SIRET&nbsp;: {editor.siret}
      <br />
      RCS {editor.rcsCity} — n° {editor.siren}
      <br />
      N° TVA intracommunautaire&nbsp;: {editor.vatNumber}
      <br />
      Email&nbsp;: <a href={`mailto:${editor.email}`}>{editor.email}</a>
      {editor.phone ? (
        <>
          <br />
          Téléphone&nbsp;: {editor.phone}
        </>
      ) : null}
    </p>
  );
}
