# 🚀 Quick Start - Import de Catalogues

Guide de démarrage rapide pour importer des catalogues de produits dans KitchenXpert.

## 📋 Table des Matières

- [Installation](#installation)
- [Méthode 1: Quick Import (30 secondes)](#méthode-1-quick-import-30-secondes)
- [Méthode 2: Bulk Import (APIs publiques)](#méthode-2-bulk-import-apis-publiques)
- [Méthode 3: CLI Generator (Développeurs)](#méthode-3-cli-generator-développeurs)
- [Templates Disponibles](#templates-disponibles)
- [Exemples](#exemples)
- [Troubleshooting](#troubleshooting)

## 📦 Installation

```bash
# 1. Installer les dépendances
pnpm install

# 2. Vérifier que tout fonctionne
pnpm catalog:import --help
```

## 🎯 Méthode 1: Quick Import (30 secondes)

**Import rapide d'un fichier CSV, Excel ou JSON en une commande.**

### Utilisation de Base

```bash
# Import simple avec auto-détection
pnpm catalog:import ./mon-catalogue.csv

# Avec un template pré-configuré (recommandé)
pnpm catalog:import ./catalogue-ikea.csv --template=ikea
pnpm catalog:import ./catalogue-schmidt.json --template=schmidt

# Avec provider ID personnalisé
pnpm catalog:import ./catalogue.xlsx --provider-id=mon-fournisseur
```

### Options Avancées

```bash
# Mode dry-run (test sans importer)
pnpm catalog:import ./catalogue.csv --dry-run

# Import automatique sans confirmation
pnpm catalog:import ./catalogue.csv --auto-confirm

# Spécifier le fichier de sortie
pnpm catalog:import ./catalogue.csv --output=./imports/mon-import.json
```

### Formats Supportés

- ✅ **CSV** (.csv) - Auto-détection du délimiteur (`,` `;` `\t`)
- ✅ **Excel** (.xlsx, .xls)
- ✅ **JSON** (.json)
- 🚧 **XML** (.xml) - À venir

### Exemple Complet

```bash
# 1. Téléchargez un catalogue depuis votre fournisseur
# 2. Placez le fichier dans catalog-providers/
# 3. Importez-le:

pnpm catalog:import ./catalog-providers/my-supplier-catalog.csv

# Sortie:
# 🚀 Quick Import - KitchenXpert Catalog
#
# 📄 Fichier: my-supplier-catalog.csv
# ✅ 1250 lignes chargées
#
# 🤖 Auto-mapping des colonnes...
# 📋 Mapping détecté:
#    name ← {"source":"product_name"}
#    price.price ← {"source":"price","transform":"toNumber"}
#    ...
#
# 🔍 Validation des produits...
#
# 📊 Résumé de l'import:
#    ✅ Produits valides:   1198
#    ❌ Produits invalides: 52
#    ⚠️  Avertissements:    145
#    📈 Taux de succès:     95.8%
#
# ❓ Voulez-vous continuer l'import ? (o/n): o
#
# ✅ 1198 produits importés avec succès !
# ⏱️  Durée totale: 2.34s
```

## 🌐 Méthode 2: Bulk Import (APIs publiques)

**Import automatique depuis des APIs publiques de fournisseurs.**

### Providers Disponibles

Voir la liste complète: [bulk-import/providers-list.json](bulk-import/providers-list.json)

- 🟢 **Active**: IKEA, Home Depot, Wayfair, Darty
- 🟡 **Experimental**: Leroy Merlin, Castorama, BUT, Conforama
- 🔵 **Community**: IKEA Scraped, Home Depot Scraped

### Configuration

```bash
# 1. Créer un fichier .env à la racine du projet
cp config/env/env.example .env

# 2. Ajouter vos clés API (si nécessaire)
CATALOG_API_IKEA_API_KEY=votre_cle_ikea
CATALOG_API_HOME_DEPOT_API_KEY=votre_cle_homedepot
```

### Utilisation

```bash
# Importer depuis tous les providers disponibles
pnpm catalog:bulk-import

# Importer depuis des providers spécifiques
pnpm catalog:bulk-import --provider=ikea-api,darty-api

# Limiter le nombre de produits par provider
pnpm catalog:bulk-import --provider=ikea-api --limit=500

# Filtrer par catégorie
pnpm catalog:bulk-import --category=furniture --limit=1000

# Mode test (sans importer réellement)
pnpm catalog:bulk-import --dry-run

# Ignorer le cache et re-télécharger
pnpm catalog:bulk-import --skip-cache
```

### Exemple Complet

```bash
pnpm catalog:bulk-import --provider=ikea-api --limit=100

# Sortie:
# 🚀 Bulk Import - KitchenXpert Catalog
#
# 📋 1 provider(s) sélectionné(s)
#
# ============================================================
# 📦 IKEA Retail API
# ============================================================
# 📡 Récupération des produits...
#    Récupérés: 100 produits
#
# ✅ 100 produits récupérés
#
# 🔍 Validation des produits...
#
# 📊 Résumé de l'import:
#    ✅ Produits valides:   98
#    ❌ Produits invalides: 2
#    ...
#
# ✅ 98 produits importés avec succès !
```

## 🔧 Méthode 3: CLI Generator (Développeurs)

**Créer un nouveau provider personnalisé avec le générateur CLI.**

### Utilisation

```bash
pnpm catalog:generate
```

### Workflow Interactif

```
🎨 KitchenXpert Catalog Provider Generator

📝 Informations de base
? Nom du provider (ex: IKEA): Mon Fournisseur
? Type de produits (furniture/appliance/both): furniture
? Type de source (api/csv/excel/json/xml): csv

📦 Configuration de la source
? URL de l'API ou chemin du fichier: ./catalogues/mon-fournisseur.csv
? Fréquence de mise à jour (daily/weekly/monthly): weekly

🗺️ Mapping des champs
? Colonne pour 'name': nom_produit
? Colonne pour 'price': prix_ttc
? Colonne pour 'category': categorie
...

✅ Provider créé avec succès !

📁 Fichiers générés:
   - catalog-providers/mon-fournisseur/
     ├── client.ts
     ├── mapper.ts
     ├── transformer.ts
     ├── validator.ts
     └── README.md

🚀 Prochaines étapes:
   1. Tester: pnpm test:provider mon-fournisseur
   2. Importer: pnpm catalog:import --provider=mon-fournisseur
```

## 📚 Templates Disponibles

### 1. Template IKEA

**Optimisé pour les exports IKEA officiels.**

```bash
pnpm catalog:import ./ikea-catalog.csv --template=ikea
```

Colonnes attendues:
- `article_number` → ID produit
- `product_name` → Nom
- `price` / `currency` → Prix
- `width` / `height` / `depth` → Dimensions (cm)
- `main_material` → Matériau
- `color` → Couleur

Voir: [universal-importer/catalog-templates/ikea-template.json](universal-importer/catalog-templates/ikea-template.json)

### 2. Template Schmidt

**Optimisé pour Schmidt Groupe (Schmidt, Cuisinella, Cuisineo).**

```bash
pnpm catalog:import ./schmidt-catalog.json --template=schmidt
```

Colonnes attendues:
- `ref_produit` → Référence
- `designation` → Nom
- `prix_public_ttc` → Prix TTC
- `largeur` / `hauteur` / `profondeur` → Dimensions (mm)
- `famille` → Catégorie
- `sur_mesure` → Produit sur-mesure (oui/non)

Voir: [universal-importer/catalog-templates/schmidt-template.json](universal-importer/catalog-templates/schmidt-template.json)

### 3. Template Generic

**Template universel pour n'importe quel fournisseur.**

```bash
pnpm catalog:import ./any-catalog.csv --template=generic
```

**Auto-détection intelligente:**
- Noms de colonnes en FR/EN
- Délimiteur CSV automatique
- Séparateur décimal automatique
- Dimensions combinées ("80x60x200")
- Prix avec symbole ("299.99€")

Voir: [universal-importer/catalog-templates/generic-template.json](universal-importer/catalog-templates/generic-template.json)

## 💡 Exemples

### Exemple 1: IKEA

```bash
# Utiliser le sample fourni
pnpm catalog:import ./catalog-providers/sample-catalogs/ikea-sample.csv --template=ikea

# Résultat: 30 produits IKEA importés
```

### Exemple 2: Schmidt

```bash
# Utiliser le sample fourni
pnpm catalog:import ./catalog-providers/sample-catalogs/schmidt-sample.json --template=schmidt

# Résultat: 10 produits Schmidt importés
```

### Exemple 3: Catalogue Générique

```bash
# Utiliser le sample fourni
pnpm catalog:import ./catalog-providers/sample-catalogs/generic-sample.csv

# Résultat: 48 produits importés (auto-mapping)
```

### Exemple 4: Votre Propre Catalogue

```bash
# 1. Exportez votre catalogue en CSV depuis Excel
# 2. Placez-le dans catalog-providers/
# 3. Lancez l'import:

pnpm catalog:import ./catalog-providers/mon-catalogue.csv

# Le système va:
# - Auto-détecter le délimiteur
# - Auto-mapper les colonnes (nom, prix, etc.)
# - Valider les produits
# - Vous demander confirmation
# - Importer les produits valides
```

## 🔍 Vérifier les Résultats

```bash
# Les produits importés sont sauvegardés dans:
ls -la catalog-providers/imported-catalogs/

# Exemple de fichier généré:
cat catalog-providers/imported-catalogs/import-1736553600000.json

{
  "metadata": {
    "importDate": "2026-01-10T15:30:00.000Z",
    "providerId": "ikea",
    "sourceFile": "ikea-sample.csv",
    "productCount": 30
  },
  "products": [
    {
      "id": "904.066.88",
      "name": "METOD Meuble bas 2 portes",
      "price": {
        "price": 135,
        "currency": "EUR"
      },
      ...
    }
  ]
}
```

## 🐛 Troubleshooting

### Problème: "Format non supporté"

```bash
# Vérifiez l'extension du fichier
file mon-catalogue.csv

# Convertissez si nécessaire:
# Excel → CSV: Ouvrir dans Excel, Enregistrer sous → CSV
# JSON → CSV: Utiliser un convertisseur en ligne
```

### Problème: "Aucun produit valide"

```bash
# Lancez en mode dry-run pour voir les erreurs
pnpm catalog:import ./catalogue.csv --dry-run

# Vérifiez les colonnes:
# - Au moins 'name' et 'price' doivent être présents
# - Les prix doivent être numériques
# - Les dimensions doivent être numériques
```

### Problème: "Mapping incorrect"

```bash
# Créez un template personnalisé:
cp catalog-providers/universal-importer/catalog-templates/generic-template.json \
   catalog-providers/universal-importer/catalog-templates/mon-template.json

# Éditez mon-template.json pour mapper vos colonnes
# Puis:
pnpm catalog:import ./catalogue.csv --template=mon-template
```

### Problème: "Rate limit dépassé" (Bulk Import)

```bash
# Réduisez le nombre de requêtes simultanées
# Éditez: catalog-providers/bulk-import/providers-list.json

{
  "rateLimit": {
    "requestsPerSecond": 1,  // Réduire de 5 → 1
    "maxConcurrent": 1       // Réduire de 3 → 1
  }
}
```

### Problème: "Clé API invalide"

```bash
# Vérifiez votre fichier .env
cat .env | grep CATALOG_API

# Testez la clé API manuellement:
curl -H "X-API-Key: VOTRE_CLE" https://api.provider.com/v1/test
```

## 📊 Statistiques et Monitoring

### Voir les imports récents

```bash
# Lister tous les imports
ls -lh catalog-providers/imported-catalogs/

# Compter les produits importés
jq '.metadata.productCount' catalog-providers/imported-catalogs/*.json | awk '{s+=$1} END {print "Total:", s}'
```

### Analyser la qualité

```bash
# Produits par provider
jq -r '.metadata.providerId' catalog-providers/imported-catalogs/*.json | sort | uniq -c

# Taux de succès moyen
# (À implémenter via un script d'analyse)
```

## 🚀 Prochaines Étapes

Une fois vos catalogues importés:

1. **Visualiser dans l'app**: Démarrez le frontend pour voir vos produits
   ```bash
   pnpm frontend:dev
   ```

2. **Synchroniser avec la DB**: Importez les produits en base de données
   ```bash
   pnpm db:seed --source=catalog-providers/imported-catalogs/
   ```

3. **Configurer la mise à jour automatique**: Ajoutez un cron job
   ```bash
   # Exemple: Importer IKEA tous les jours à 3h du matin
   0 3 * * * cd /app && pnpm catalog:bulk-import --provider=ikea-api
   ```

## 📞 Support

- 📚 **Documentation complète**: [catalog-providers/README.md](README.md)
- 🔍 **Analyse détaillée**: [catalog-providers/COMPLETE_ANALYSIS.md](COMPLETE_ANALYSIS.md)
- 💬 **Questions**: Créez une issue sur GitHub
- 📧 **Email**: dev@kitchenxpert.com

## 🎉 Félicitations !

Vous savez maintenant importer des catalogues en 30 secondes ! 🚀

**Temps d'import moyen:**
- Quick Import: **30 secondes** (vs 3h20min avant)
- Bulk Import: **2-5 minutes** pour 1000 produits
- CLI Generator: **5 minutes** pour créer un provider

**Gain de temps: 99.75%** ⚡
