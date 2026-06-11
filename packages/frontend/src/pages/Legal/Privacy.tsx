import React from 'react';

import LegalLayout from './LegalLayout';
import { LEGAL, formatAddressLine } from '../../config/legal';

/**
 * Politique de confidentialité — RGPD (Règlement (UE) 2016/679) +
 * loi n° 78-17 du 6 janvier 1978 modifiée (Informatique et Libertés).
 *
 * Each section maps to a specific RGPD article so an auditor (CNIL or
 * sub-processor's compliance team) can cross-reference quickly:
 *   §1 → Art. 4(7) responsable de traitement
 *   §2 → Art. 13-14 information des personnes
 *   §3 → Art. 6 base légale
 *   §4 → Art. 5(e) limitation de conservation
 *   §5 → Art. 28 sous-traitants
 *   §6 → Art. 44-49 transferts hors UE
 *   §7 → Art. 15-22 droits
 *   §8 → Art. 22 décisions automatisées
 *   §9 → Art. 32 sécurité
 */
export default function Privacy(): React.ReactElement {
  const { editor, subProcessors, lastRevised } = LEGAL;
  const fmtDate = new Date(lastRevised).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <LegalLayout title="Politique de confidentialité">
      <p className="text-sm text-white/50">
        Conforme au Règlement (UE) 2016/679 (RGPD) et à la loi
        n°&nbsp;78-17 du 6 janvier 1978 modifiée (loi Informatique et
        Libertés). Version en vigueur depuis le {fmtDate}.
      </p>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement, au sens de l&apos;article 4(7) du RGPD,
        est&nbsp;:
      </p>
      <p>
        <strong>{editor.socialName}</strong> ({editor.legalForm})<br />
        {formatAddressLine(editor.address)}<br />
        SIREN&nbsp;: {editor.siren}<br />
        Email&nbsp;: <a href={`mailto:${editor.email}`}>{editor.email}</a>
      </p>
      <p>
        Conformément à l&apos;article 37 du RGPD, un Délégué à la Protection
        des Données (DPO) est désigné pour traiter toutes les questions
        relatives à la protection des données&nbsp;:{' '}
        <a href={`mailto:${editor.dpoEmail}`}>{editor.dpoEmail}</a>.
      </p>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>2. Données collectées et finalités</h2>
      <p>
        Conformément aux articles 13 et 14 du RGPD, vous trouverez
        ci-dessous le détail de chaque traitement&nbsp;:
      </p>

      <h3>2.1 Création et gestion du compte</h3>
      <ul>
        <li><strong>Données collectées</strong>&nbsp;: email, prénom, nom, mot de passe (haché bcrypt), langue, fuseau horaire, IP de connexion, user-agent.</li>
        <li><strong>Finalité</strong>&nbsp;: authentification, prévention de la fraude, support utilisateur.</li>
        <li><strong>Base légale</strong>&nbsp;: exécution du contrat (Art. 6-1-b RGPD).</li>
      </ul>

      <h3>2.2 Conception et conservation des cuisines</h3>
      <ul>
        <li><strong>Données collectées</strong>&nbsp;: dimensions de pièce, plans 2D/3D, préférences de style, photos importées, items de catalogue ajoutés, scores IA.</li>
        <li><strong>Finalité</strong>&nbsp;: fourniture du service de conception.</li>
        <li><strong>Base légale</strong>&nbsp;: exécution du contrat (Art. 6-1-b RGPD).</li>
      </ul>

      <h3>2.3 Paiement et facturation</h3>
      <ul>
        <li><strong>Données collectées</strong>&nbsp;: nom du titulaire, email, montant, devise, identifiant Stripe (le numéro de carte est <em>tokenisé</em> par Stripe et n&apos;est jamais stocké chez nous).</li>
        <li><strong>Finalité</strong>&nbsp;: traitement des paiements, lutte contre la fraude (DSP2/SCA), édition des factures.</li>
        <li><strong>Base légale</strong>&nbsp;: exécution du contrat (Art. 6-1-b) + obligation légale (Art. 6-1-c) pour la conservation comptable.</li>
      </ul>

      <h3>2.4 Communications transactionnelles</h3>
      <ul>
        <li><strong>Données collectées</strong>&nbsp;: email, statut d&apos;ouverture, statut de livraison.</li>
        <li><strong>Finalité</strong>&nbsp;: envoi des emails de vérification, réinitialisation de mot de passe, notifications de devis et confirmations de commande.</li>
        <li><strong>Base légale</strong>&nbsp;: exécution du contrat (Art. 6-1-b RGPD).</li>
      </ul>

      <h3>2.5 Mesure d&apos;audience et amélioration du service</h3>
      <ul>
        <li><strong>Données collectées</strong>&nbsp;: pages visitées, durée de session, parcours, statistiques agrégées anonymisées.</li>
        <li><strong>Finalité</strong>&nbsp;: comprendre l&apos;usage et améliorer l&apos;ergonomie.</li>
        <li><strong>Base légale</strong>&nbsp;: <strong>consentement</strong> (Art. 6-1-a RGPD), recueilli via la bannière cookies. Vous pouvez retirer ce consentement à tout moment depuis <a href="/legal/cookies">la page cookies</a>.</li>
      </ul>

      <h3>2.6 Communications marketing</h3>
      <ul>
        <li><strong>Données collectées</strong>&nbsp;: email, prénom, préférences déclarées.</li>
        <li><strong>Finalité</strong>&nbsp;: newsletters, informations sur les nouveautés, offres ciblées.</li>
        <li><strong>Base légale</strong>&nbsp;: <strong>consentement</strong> (Art. 6-1-a RGPD), <em>opt-in</em> explicite à l&apos;inscription. Désinscription possible à tout moment via le lien présent dans chaque email ou depuis votre <a href="/profile">profil</a>.</li>
      </ul>

      <h3>2.7 Génération d&apos;images et assistant IA (sur demande)</h3>
      <ul>
        <li><strong>Données collectées</strong>&nbsp;: descriptions textuelles fournies, identifiants pseudonymisés des cuisines.</li>
        <li><strong>Finalité</strong>&nbsp;: production de rendus photoréalistes via Google Gemini, conversation avec l&apos;assistant Claude.</li>
        <li><strong>Base légale</strong>&nbsp;: <strong>consentement</strong> exprès recueilli au moment où la fonctionnalité est utilisée pour la première fois. Les données ne sont pas utilisées pour entraîner les modèles tiers.</li>
      </ul>

      <h3>2.8 Sécurité et journaux d&apos;audit</h3>
      <ul>
        <li><strong>Données collectées</strong>&nbsp;: actions sensibles (connexion, changement de mot de passe, suppression de compte, paiement), IP, user-agent, horodatage.</li>
        <li><strong>Finalité</strong>&nbsp;: sécurité, prévention de la fraude, preuve en cas de litige, exigence d&apos;audit (Stripe, RGPD).</li>
        <li><strong>Base légale</strong>&nbsp;: intérêt légitime (Art. 6-1-f RGPD).</li>
      </ul>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>3. Durées de conservation</h2>
      <p>
        Les données ne sont conservées que pendant la durée strictement
        nécessaire aux finalités pour lesquelles elles sont traitées,
        conformément à l&apos;article 5(1)(e) du RGPD&nbsp;:
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left">
            <th className="py-2 pr-4">Catégorie</th>
            <th className="py-2">Durée de conservation</th>
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-white/5">
          <tr><td className="py-2 pr-4">Compte utilisateur (actif)</td><td className="py-2">Toute la durée du contrat</td></tr>
          <tr><td className="py-2 pr-4">Compte utilisateur (inactif)</td><td className="py-2">3 ans après la dernière activité, puis suppression ou anonymisation</td></tr>
          <tr><td className="py-2 pr-4">Compte supprimé (droit à l&apos;oubli)</td><td className="py-2">Anonymisation immédiate, purge complète à J+30</td></tr>
          <tr><td className="py-2 pr-4">Factures et données comptables</td><td className="py-2">10 ans (Art. L123-22 Code de commerce)</td></tr>
          <tr><td className="py-2 pr-4">Logs d&apos;audit (sécurité)</td><td className="py-2">1 an</td></tr>
          <tr><td className="py-2 pr-4">Tokens de session JWT</td><td className="py-2">15 minutes (access) / 7 jours (refresh)</td></tr>
          <tr><td className="py-2 pr-4">Cookies analytiques</td><td className="py-2">13 mois maximum (recommandation CNIL)</td></tr>
          <tr><td className="py-2 pr-4">Demande de renseignement (sans suite)</td><td className="py-2">3 ans à compter du dernier contact</td></tr>
          <tr><td className="py-2 pr-4">Données de paiement (chez Stripe)</td><td className="py-2">Selon politique Stripe + obligations PCI-DSS</td></tr>
        </tbody>
      </table>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>4. Destinataires et sous-traitants</h2>
      <p>
        Les données sont exclusivement traitées par le personnel habilité
        de {editor.socialName} et par les sous-traitants suivants,
        encadrés par un contrat conforme à l&apos;article 28 du RGPD&nbsp;:
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left">
            <th className="py-2 pr-3">Sous-traitant</th>
            <th className="py-2 pr-3">Finalité</th>
            <th className="py-2 pr-3">Pays</th>
            <th className="py-2">Hors UE&nbsp;?</th>
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-white/5">
          {subProcessors.map((sp) => (
            <tr key={sp.name}>
              <td className="py-2 pr-3 align-top"><strong>{sp.name}</strong></td>
              <td className="py-2 pr-3 align-top">{sp.purpose}</td>
              <td className="py-2 pr-3 align-top">{sp.country}</td>
              <td className="py-2 align-top">
                {sp.outsideEU
                  ? <span title={sp.transferSafeguard ?? ''}>Oui (CCT)</span>
                  : 'Non'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>5. Transferts hors Union européenne</h2>
      <p>
        Lorsqu&apos;un transfert vers un pays tiers est nécessaire (par
        exemple vers les États-Unis pour notre fournisseur d&apos;emails ou
        notre fournisseur de suivi d&apos;erreurs), le transfert est encadré
        par les <strong>Clauses Contractuelles Types (CCT)</strong> adoptées
        par la Commission européenne dans sa décision d&apos;exécution
        2021/914 du 4 juin 2021, conformément à l&apos;article 46(2)(c) du
        RGPD.
      </p>
      <p>
        Pour les transferts vers les États-Unis, nous nous appuyons en
        outre sur le <em>Data Privacy Framework</em> (DPF) lorsque le
        sous-traitant y est certifié. La liste actualisée des
        sous-traitants concernés est disponible sur simple demande à{' '}
        <a href={`mailto:${editor.dpoEmail}`}>{editor.dpoEmail}</a>.
      </p>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>6. Vos droits</h2>
      <p>
        Conformément aux articles 15 à 22 du RGPD, vous disposez des
        droits suivants à l&apos;égard des données vous concernant&nbsp;:
      </p>
      <ul>
        <li><strong>Droit d&apos;accès</strong> (Art. 15) — obtenir la
          confirmation que vos données sont traitées et en recevoir une
          copie.</li>
        <li><strong>Droit de rectification</strong> (Art. 16) — corriger
          des données inexactes ou compléter des données incomplètes.</li>
        <li><strong>Droit à l&apos;effacement</strong> (Art. 17) — dit «&nbsp;droit
          à l&apos;oubli&nbsp;», sous réserve des exceptions prévues
          (obligations légales notamment comptables).</li>
        <li><strong>Droit à la limitation</strong> (Art. 18) — geler le
          traitement dans certaines conditions.</li>
        <li><strong>Droit à la portabilité</strong> (Art. 20) — recevoir
          vos données dans un format structuré, lisible par machine
          (JSON), et les transmettre à un autre responsable de
          traitement.</li>
        <li><strong>Droit d&apos;opposition</strong> (Art. 21) — vous opposer
          à un traitement fondé sur l&apos;intérêt légitime ou à la
          prospection commerciale.</li>
        <li><strong>Droit de retirer votre consentement</strong> (Art. 7-3)
          — à tout moment, sans que cela compromette la licéité du
          traitement passé.</li>
        <li><strong>Directives <em>post mortem</em></strong> (Art. 85
          loi Informatique et Libertés) — définir le sort de vos données
          après votre décès.</li>
      </ul>
      <p>
        Pour exercer ces droits, vous pouvez utiliser la page{' '}
        <a href="/legal/privacy-settings">Mes données</a> (export en un
        clic, suppression définitive) ou écrire au DPO à{' '}
        <a href={`mailto:${editor.dpoEmail}`}>{editor.dpoEmail}</a>.
        Nous nous engageons à répondre dans un délai d&apos;<strong>un (1)
        mois</strong>, prolongeable de deux (2) mois en cas de demande
        complexe (Art. 12-3 RGPD).
      </p>
      <p>
        Une pièce d&apos;identité pourra vous être demandée en cas de doute
        raisonnable sur l&apos;identité du demandeur (Art. 12-6 RGPD), afin
        d&apos;éviter toute usurpation. Cette pièce sera supprimée
        immédiatement après vérification.
      </p>

      <h3>6.1 Réclamation auprès de la CNIL</h3>
      <p>
        Si vous estimez, après nous avoir contactés, que vos droits ne
        sont pas respectés, vous pouvez introduire une réclamation auprès
        de la Commission Nationale de l&apos;Informatique et des Libertés
        (CNIL)&nbsp;:
      </p>
      <p>
        <strong>CNIL</strong> — 3 place de Fontenoy, TSA 80715, 75334
        Paris Cedex 07<br />
        Téléphone&nbsp;: 01 53 73 22 22<br />
        Site&nbsp;:{' '}
        <a
          href="https://www.cnil.fr/plaintes"
          target="_blank"
          rel="noopener noreferrer"
        >
          www.cnil.fr/plaintes
        </a>
      </p>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>7. Décisions automatisées et profilage</h2>
      <p>
        Notre algorithme de génération de cuisines produit des
        suggestions de configuration à partir des préférences déclarées
        et des dimensions de la pièce. Ces décisions <strong>n&apos;ont pas
        d&apos;effet juridique sur vous</strong> et restent toujours révisables
        manuellement&nbsp;: vous pouvez modifier, supprimer ou ignorer
        chaque suggestion sans aucune conséquence.
      </p>
      <p>
        Vos données ne sont jamais utilisées pour l&apos;entraînement des
        modèles de Google Gemini, Anthropic Claude ou de tout autre
        modèle tiers, sauf consentement explicite et révocable de votre
        part. À ce jour, ce consentement n&apos;est jamais demandé.
      </p>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>8. Sécurité</h2>
      <p>
        Conformément à l&apos;article 32 du RGPD, nous mettons en œuvre les
        mesures techniques et organisationnelles suivantes pour protéger
        vos données&nbsp;:
      </p>
      <ul>
        <li>Chiffrement TLS 1.2+ pour toutes les communications réseau&nbsp;;</li>
        <li>Chiffrement AES-256-GCM des données sensibles au repos (clés API, tokens long-lived)&nbsp;;</li>
        <li>Hachage des mots de passe par <em>bcrypt</em> (12 rounds)&nbsp;;</li>
        <li>Cookies de session <code>httpOnly</code>, <code>Secure</code>, <code>SameSite=Strict</code>&nbsp;;</li>
        <li>Authentification forte client (3-D Secure / DSP2) pour tout paiement supérieur à 30&nbsp;€&nbsp;;</li>
        <li>Journalisation immuable des actions sensibles&nbsp;;</li>
        <li>Sauvegardes chiffrées quotidiennes avec rétention de 30 jours&nbsp;;</li>
        <li>Limitation des accès au principe du moindre privilège, MFA obligatoire pour les administrateurs&nbsp;;</li>
        <li>Tests de pénétration et audits de sécurité réguliers.</li>
      </ul>
      <p>
        En cas de violation de données susceptible d&apos;engendrer un risque
        pour les droits et libertés des personnes, nous notifierons la
        CNIL dans un délai de 72 heures (Art. 33 RGPD) et informerons les
        personnes concernées dans les meilleurs délais lorsque le risque
        est élevé (Art. 34 RGPD).
      </p>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>9. Cookies</h2>
      <p>
        L&apos;utilisation de cookies sur le Site fait l&apos;objet d&apos;une
        information détaillée et d&apos;un recueil de consentement conformes
        aux lignes directrices de la CNIL de septembre 2020. Voir notre
        page dédiée <a href="/legal/cookies">Politique cookies</a>.
      </p>

      {/* ─────────────────────────────────────────────────────────── */}
      <h2>10. Modifications</h2>
      <p>
        La présente Politique de confidentialité peut être mise à jour
        pour refléter une évolution réglementaire ou un changement
        substantiel dans nos traitements. Toute modification importante
        vous sera notifiée par email avant sa prise d&apos;effet, ou
        directement dans l&apos;application au prochain accès.
      </p>
    </LegalLayout>
  );
}
