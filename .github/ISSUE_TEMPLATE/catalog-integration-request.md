---
name: 🏪 Catalog Integration Request
about: Demander l'intégration d'un nouveau catalogue fournisseur
title: '[CATALOG] Intégration '
labels: ['catalog-provider', 'integration', 'needs-review']
assignees: ''
---

## 🏪 Informations sur le Fournisseur

### Identité du Fournisseur
- **Nom du fournisseur:**
- **Pays:**
- **Site web:**
- **Type de produits:** [ ] Meubles  [ ] Électroménager  [ ] Accessoires  [ ] Autre: _____

### Contact Technique
- **Nom du contact:**
- **Email:**
- **Téléphone:**
- **Documentation API:**

## 📊 Informations sur le Catalogue

### Taille du Catalogue
- **Nombre de produits:**
- **Catégories principales:**
- **Fréquence de mise à jour:** [ ] Temps réel  [ ] Quotidien  [ ] Hebdomadaire  [ ] Mensuel  [ ] Autre: _____

### Couverture Géographique
<!-- Cocher les pays où les produits sont disponibles -->
- [ ] France
- [ ] Belgique
- [ ] Suisse
- [ ] Allemagne
- [ ] Espagne
- [ ] Italie
- [ ] Royaume-Uni
- [ ] Autre: _____

## 🔌 Type de Source de Données

<!-- Cocher le type de source disponible -->
- [ ] **API REST** - Endpoint: `https://...`
- [ ] **GraphQL** - Endpoint: `https://...`
- [ ] **Fichier CSV** - URL ou fréquence: _____
- [ ] **Fichier Excel** - URL ou fréquence: _____
- [ ] **Fichier JSON** - URL ou fréquence: _____
- [ ] **Fichier XML** - URL ou fréquence: _____
- [ ] **Web Scraping** (dernier recours) - URL: _____
- [ ] **FTP/SFTP** - Détails: _____
- [ ] **Autre:** _____

## 🔐 Authentification

### Type d'authentification requis
- [ ] Aucune (données publiques)
- [ ] API Key
- [ ] Bearer Token
- [ ] OAuth 2.0
- [ ] Basic Auth (username/password)
- [ ] JWT
- [ ] Autre: _____

### Credentials disponibles
- [ ] Oui, j'ai les credentials de test
- [ ] Non, à obtenir
- [ ] API publique sans auth

### Limitation de taux
- **Requêtes max/heure:**
- **Requêtes max/jour:**
- **Autres limitations:**

## 📋 Structure des Données

### Champs disponibles
<!-- Cocher les champs fournis par le catalogue -->
- [ ] Nom du produit
- [ ] Référence/SKU
- [ ] Description courte
- [ ] Description longue
- [ ] Prix (avec devise)
- [ ] Stock disponible
- [ ] Dimensions (L x P x H)
- [ ] Poids
- [ ] Images (URLs)
- [ ] Images 3D / Modèles 3D
- [ ] Catégorie
- [ ] Marque
- [ ] Couleurs disponibles
- [ ] Matériaux
- [ ] Garantie
- [ ] Délai de livraison
- [ ] Certifications (éco-labels, etc.)
- [ ] Fiche technique PDF
- [ ] Autre: _____

### Exemple de Données
<!-- Fournir un exemple de produit (JSON, CSV, ou screenshot) -->

```json
{
  "id": "12345",
  "name": "Meuble exemple",
  "price": 299.99,
  "currency": "EUR",
  // ... autres champs
}
```

Ou joindre un fichier exemple si possible.

## 🗺️ Mapping Nécessaire

### Transformations Requises
<!-- Décrire les transformations de données nécessaires -->

**Exemple:**
- Prix en centimes → conversion en euros
- Dimensions en pouces → conversion en cm
- Images multiples → extraction URL principale

### Champs Manquants
<!-- Quels champs essentiels manquent et comment les obtenir ? -->

## 🔄 Synchronisation

### Fréquence de synchronisation souhaitée
- [ ] Temps réel (webhook)
- [ ] Toutes les heures
- [ ] Quotidienne (heure: ____)
- [ ] Hebdomadaire (jour: ____)
- [ ] Manuelle uniquement

### Type de synchronisation
- [ ] Complète (tous les produits à chaque fois)
- [ ] Incrémentale (uniquement les changements)
- [ ] Mixte (complète hebdomadaire + incrémentale quotidienne)

### Webhooks Disponibles
- [ ] Oui - URL du webhook: _____
- [ ] Non
- [ ] Events supportés: _____

## 💰 Aspects Commerciaux

### Modèle de Pricing
- [ ] Gratuit
- [ ] Abonnement mensuel
- [ ] Commission sur ventes
- [ ] Par requête API
- [ ] Autre: _____

### Contrat / Partenariat
- [ ] Contrat existant
- [ ] À négocier
- [ ] Données publiques (pas de contrat)

## 🎯 Priorité et Justification

### Importance de cette intégration
- [ ] 🔥 Critique - Gros fournisseur avec forte demande clients
- [ ] ⭐ Élevée - Complète l'offre de manière significative
- [ ] 📝 Moyenne - Nice to have
- [ ] 💡 Basse - Opportunité future

### Justification Business
<!-- Pourquoi intégrer ce catalogue ? Volume attendu ? Demandes clients ? -->

**Nombre de clients intéressés:**
**Volume de ventes estimé:**
**Avantage concurrentiel:**

## ✅ Critères d'Acceptation

- [ ] Tous les produits sont importés correctement
- [ ] Les prix et stocks sont à jour
- [ ] Les images sont disponibles et de qualité
- [ ] Les dimensions sont exactes
- [ ] La synchronisation fonctionne sans erreur
- [ ] Les produits sont searchables dans l'app
- [ ] Les produits 3D s'affichent correctement (si modèles 3D)
- [ ] Les performances restent acceptables (< 2s de chargement)

## 📎 Documents Joints

<!-- Joindre ou lier tout document pertinent -->
- [ ] Documentation API
- [ ] Fichier exemple de données
- [ ] Credentials de test
- [ ] Contrat / Accord de partenariat
- [ ] Spécifications techniques

## 🔗 Liens Utiles

- Documentation API:
- Portail développeur:
- Contact support technique:
- Autre:

## 💬 Informations Supplémentaires

<!-- Tout contexte additionnel, particularités, challenges connus -->

---

### Checklist avant soumission

- [ ] J'ai vérifié que ce catalogue n'est pas déjà intégré
- [ ] J'ai fourni les informations de contact du fournisseur
- [ ] J'ai documenté le type de source de données
- [ ] J'ai fourni un exemple de données ou lien vers documentation
- [ ] J'ai évalué la priorité business de cette intégration
- [ ] J'ai les credentials de test (si applicable)

---

**Note:** Utilisez le [générateur CLI de providers](../../catalog-providers/cli/generate-provider.ts) pour créer rapidement l'intégration une fois approuvée :

```bash
pnpm tsx catalog-providers/cli/generate-provider.ts
```
