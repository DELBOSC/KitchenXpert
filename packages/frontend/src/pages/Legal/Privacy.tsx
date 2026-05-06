import React from 'react';
import LegalLayout from './LegalLayout';

export default function Privacy(): React.ReactElement {
  return (
    <LegalLayout title="Politique de confidentialité">
      <p className="text-sm text-white/50">Conforme au Règlement (UE) 2016/679 (RGPD) et à la loi Informatique et Libertés modifiée.</p>

      <h2>1. Responsable du traitement</h2>
      <p>
        KitchenXpert SAS, représentée par son Directeur de la publication. Contact du
        Délégué à la Protection des Données (DPO)&nbsp;: <a href="mailto:dpo@kitchenxpert.com">dpo@kitchenxpert.com</a>.
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li><strong>Identification&nbsp;:</strong> email, nom, prénom, téléphone (optionnel).</li>
        <li><strong>Authentification&nbsp;:</strong> mot de passe chiffré (bcrypt), sessions.</li>
        <li><strong>Projets&nbsp;:</strong> cuisines, préférences de style, plans importés.</li>
        <li><strong>Paiement&nbsp;:</strong> aucun numéro de carte stocké — tout passe par Stripe.</li>
        <li><strong>Technique&nbsp;:</strong> adresse IP, user-agent, logs de connexion.</li>
      </ul>

      <h2>3. Bases légales (Art. 6 RGPD)</h2>
      <ul>
        <li><strong>Exécution du contrat</strong> pour les fonctionnalités cœur du service.</li>
        <li><strong>Obligation légale</strong> pour la facturation (conservation 10 ans, art. L123-22 Code de commerce).</li>
        <li><strong>Intérêt légitime</strong> pour la sécurité et la prévention de la fraude.</li>
        <li><strong>Consentement</strong> pour les cookies non essentiels et les communications marketing.</li>
      </ul>

      <h2>4. Durées de conservation</h2>
      <ul>
        <li>Données de compte&nbsp;: pendant la durée du contrat + 3 ans après dernière activité.</li>
        <li>Factures et données comptables&nbsp;: 10 ans (obligation légale).</li>
        <li>Logs d'audit&nbsp;: 1 an maximum.</li>
        <li>Cookies analytiques&nbsp;: 13 mois maximum.</li>
      </ul>

      <h2>5. Destinataires et sous-traitants</h2>
      <ul>
        <li>Stripe Payments Europe (paiement) — UE + transferts encadrés par SCC.</li>
        <li>Hébergeur [OVH / Scaleway] — UE exclusivement.</li>
        <li>Fournisseur d'emails transactionnels [à compléter].</li>
        <li>Partenaires fabricants (IKEA, Schmidt, Bosch, Leroy Merlin, Castorama) — uniquement les données strictement nécessaires à la commande.</li>
      </ul>

      <h2>6. Transferts hors UE</h2>
      <p>
        Aucun transfert hors UE n'est effectué par défaut. Si un sous-traitant est basé
        hors UE, le transfert est encadré par des Clauses Contractuelles Types (SCC)
        adoptées par la Commission européenne (décision 2021/914).
      </p>

      <h2>7. Vos droits</h2>
      <p>Vous disposez à tout moment des droits suivants, exerçables depuis la page <a href="/legal/privacy-settings">Mes données</a> ou par email à <a href="mailto:dpo@kitchenxpert.com">dpo@kitchenxpert.com</a>&nbsp;:</p>
      <ul>
        <li>Droit d'accès (Art. 15) — consulter les données vous concernant.</li>
        <li>Droit de rectification (Art. 16).</li>
        <li>Droit à l'effacement (Art. 17) — dit «&nbsp;droit à l'oubli&nbsp;».</li>
        <li>Droit à la limitation (Art. 18).</li>
        <li>Droit à la portabilité (Art. 20) — export JSON intégral.</li>
        <li>Droit d'opposition (Art. 21).</li>
      </ul>
      <p>
        Vous pouvez également introduire une réclamation auprès de la CNIL&nbsp;:
        <a href="https://www.cnil.fr/plaintes" target="_blank" rel="noopener noreferrer"> cnil.fr/plaintes</a>.
      </p>

      <h2>8. Décisions automatisées et IA</h2>
      <p>
        Nos algorithmes génèrent des suggestions de design à partir de vos préférences.
        Ces décisions ne produisent pas d'effet juridique et sont toujours révisables
        manuellement. Vos données ne sont pas utilisées pour l'entraînement de modèles
        tiers sans votre consentement explicite.
      </p>

      <h2>9. Sécurité</h2>
      <p>
        Chiffrement TLS 1.2+ en transit, AES-256-GCM au repos pour les données sensibles,
        hachage bcrypt (12 rounds) pour les mots de passe, cookies httpOnly Secure SameSite=Strict,
        authentification forte (DSP2) pour les paiements supérieurs à 30&nbsp;€.
      </p>
    </LegalLayout>
  );
}
