# Security Policy

## 🔒 Supported Versions

Nous fournissons des mises à jour de sécurité pour les versions suivantes de KitchenXpert :

| Version | Supported          | End of Support |
| ------- | ------------------ | -------------- |
| 2.x.x   | ✅ Yes             | -              |
| 1.5.x   | ✅ Yes             | 2026-06-30     |
| 1.0-1.4 | ❌ No              | 2025-12-31     |
| < 1.0   | ❌ No              | 2024-12-31     |

## 🐛 Reporting a Vulnerability

**⚠️ IMPORTANT: Ne reportez JAMAIS de vulnérabilités de sécurité via les issues publiques !**

### Où Reporter

Nous utilisons GitHub Security Advisories pour la gestion confidentielle des vulnérabilités :

1. **Via GitHub Security Advisory** (Recommandé)
   - Aller sur https://github.com/kitchenxpert/security/advisories/new
   - Remplir le formulaire de rapport
   - Notre équipe sécurité sera notifiée automatiquement

2. **Via Email** (Alternative)
   - Email: security@kitchenxpert.com
   - Sujet: [SECURITY] Description courte
   - Utiliser PGP si possible (clé publique ci-dessous)

### Informations à Inclure

Pour une résolution rapide, inclure :

- **Type de vulnérabilité** (XSS, SQL Injection, CSRF, etc.)
- **Version(s) affectée(s)**
- **Description détaillée** du problème
- **Étapes de reproduction** (proof of concept)
- **Impact potentiel** (confidentialité, intégrité, disponibilité)
- **Suggestions de correction** (si vous en avez)

### Exemple de Rapport

```markdown
**Type:** SQL Injection
**Versions affectées:** 2.0.0 à 2.1.5
**Sévérité estimée:** Critique

**Description:**
Le endpoint `/api/v1/products/search` est vulnérable à une injection SQL via
le paramètre `query` non sanitisé.

**Reproduction:**
1. Envoyer une requête GET à `/api/v1/products/search?query=' OR '1'='1`
2. Observer que tous les produits sont retournés
3. Possible d'extraire des données sensibles

**Impact:**
- Accès non autorisé à la base de données
- Possible extraction de données utilisateurs
- Possible modification/suppression de données

**PoC:**
```bash
curl "https://api.kitchenxpert.com/api/v1/products/search?query=' OR '1'='1"
```

**Suggestion de fix:**
Utiliser des requêtes préparées (prepared statements) au lieu de concaténation.
```

## ⏱️ Processus de Traitement

### Timeline

1. **Accusé de réception** - Sous 24h
2. **Évaluation initiale** - Sous 48h
3. **Confirmation de la vulnérabilité** - Sous 5 jours
4. **Développement du patch** - Variable selon gravité
5. **Publication du patch** - Selon gravité :
   - 🔥 Critique : 1-7 jours
   - ⚠️ Élevée : 7-14 jours
   - 📝 Moyenne : 14-30 jours
   - 💡 Basse : 30-60 jours

### Communication

- **Accusé réception** envoyé sous 24h
- **Mises à jour régulières** sur l'avancement
- **Notification avant publication** du fix
- **Crédit** dans l'advisory (si souhaité)

## 🏆 Divulgation Responsable

Nous suivons le principe de **divulgation coordonnée** :

1. ✅ Reporter la vulnérabilité en privé
2. ✅ Donner un délai raisonnable pour le fix (30-90 jours selon gravité)
3. ✅ Coordonner la publication publique
4. ✅ Recevoir crédit dans l'advisory

**⚠️ Ne PAS :**
- ❌ Divulguer publiquement avant le fix
- ❌ Exploiter la vulnérabilité sur des systèmes de production
- ❌ Accéder à des données non autorisées
- ❌ Modifier/supprimer des données

## 🎖️ Hall of Fame

Nous reconnaissons publiquement les chercheurs en sécurité responsables :

### 2026
- En attente de premiers rapports...

### 2025
- **John Doe** - SQL Injection dans l'API produits (CVE-2025-XXXX)
- **Jane Smith** - XSS dans le designer 3D (CVE-2025-YYYY)

## 🔐 Clé PGP

Pour les communications sensibles, utiliser notre clé PGP :

```
-----BEGIN PGP PUBLIC KEY BLOCK-----

[Insérer la clé PGP publique ici]

-----END PGP PUBLIC KEY BLOCK-----
```

**Fingerprint:** `XXXX XXXX XXXX XXXX XXXX  XXXX XXXX XXXX XXXX XXXX`

Télécharger depuis : https://keybase.io/kitchenxpert

## 🛡️ Mesures de Sécurité Actuelles

KitchenXpert implémente les mesures de sécurité suivantes :

### Application

- ✅ **Authentification JWT** avec refresh tokens
- ✅ **Bcrypt** pour le hashing des mots de passe (12 rounds)
- ✅ **Rate limiting** sur toutes les APIs
- ✅ **CORS** stricte
- ✅ **CSP** (Content Security Policy)
- ✅ **Helmet.js** pour les headers de sécurité
- ✅ **Validation des inputs** côté serveur
- ✅ **Sanitization** des données utilisateur
- ✅ **Prepared statements** pour éviter SQL injection
- ✅ **HTTPS** obligatoire en production

### Infrastructure

- ✅ **Secrets management** avec variables d'environnement
- ✅ **Logs d'audit** pour actions sensibles
- ✅ **Monitoring** et alerting 24/7
- ✅ **Backups** automatiques quotidiens
- ✅ **WAF** (Web Application Firewall)
- ✅ **DDoS protection**

### CI/CD

- ✅ **CodeQL** analyse statique automatique
- ✅ **Dependabot** pour les dépendances vulnérables
- ✅ **SAST** (Static Application Security Testing)
- ✅ **Secret scanning** dans les commits
- ✅ **Container scanning** des images Docker

## 📋 Vulnérabilités Connues

Les vulnérabilités connues et corrigées sont listées dans nos :

- [Security Advisories](https://github.com/kitchenxpert/security/advisories)
- [CVE Database](https://cve.mitre.org/)

## 🔄 Updates de Sécurité

Pour recevoir les alertes de sécurité :

1. **Watch** le repository sur GitHub
2. Activer les notifications pour "Security alerts"
3. S'abonner à notre mailing list sécurité : security-announce@kitchenxpert.com

## 📚 Ressources

### Pour les Développeurs

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Guide de sécurité Node.js](https://nodejs.org/en/docs/guides/security/)
- [Guide de sécurité React](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)

### Pour les Chercheurs

- [CVSS Calculator](https://www.first.org/cvss/calculator/3.1)
- [CWE Database](https://cwe.mitre.org/)
- [Bug Bounty Programs](https://bugcrowd.com/programs)

## 💰 Bug Bounty Program

**Status:** 🚧 En préparation

Nous prévoyons de lancer un programme Bug Bounty en Q2 2026. Détails à venir.

Récompenses estimées :
- 🔥 Critique : 1,000€ - 5,000€
- ⚠️ Élevée : 500€ - 1,000€
- 📝 Moyenne : 100€ - 500€
- 💡 Basse : 50€ - 100€

## 🤝 Contact

- **Email sécurité:** security@kitchenxpert.com
- **PGP Key:** https://keybase.io/kitchenxpert
- **Security Advisories:** https://github.com/kitchenxpert/security/advisories

## 📝 Historique

- **2026-01-10** - Création de cette politique
- **2025-12-01** - Première version en production

---

**Dernière mise à jour:** 2026-01-10

Merci d'aider à garder KitchenXpert sécurisé ! 🛡️
