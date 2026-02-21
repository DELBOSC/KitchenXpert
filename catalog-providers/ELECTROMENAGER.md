# 🔌 Import de Catalogues Électroménager

Guide complet pour importer des catalogues d'électroménager encastrable dans KitchenXpert.

## 📋 Fabricants Supportés

### 🟢 Niveau 1 - Support Complet (APIs Officielles)

**Bosch / Siemens** (BSH Home Appliances)
- **API**: Home Connect API
- **Gammes**: Série 2/4/6/8 (Bosch), iQ100/300/500/700 (Siemens)
- **Connectivité**: HomeConnect WiFi
- **Produits**: Fours, micro-ondes, plaques induction, hottes, lave-vaisselle
- **Template**: `appliances`
- **Provider ID**: `bosch-api`

**Miele**
- **API**: Miele Professional API
- **Points forts**: Qualité premium, garantie longue durée (jusqu'à 20 ans)
- **Connectivité**: Miele@home, Con@ctivity
- **Technologies**: AutoDos, Zeolith, PerfectClean, TwinDos
- **Template**: `appliances`
- **Provider ID**: `miele-api`

**Samsung**
- **API**: SmartThings API
- **Technologies**: Dual Cook Flex, Virtual Flame, AutoRelease
- **Connectivité**: SmartThings WiFi
- **Produits**: Fours, combinés, plaques, hottes, lave-vaisselle
- **Template**: `appliances`
- **Provider ID**: `samsung-smartthings`

### 🟡 Niveau 2 - Support Expérimental

**LG**
- **API**: ThinQ API
- **Technologies**: NeoChef, QuadWash, TrueSteam, Inverter Direct Drive
- **Connectivité**: ThinQ WiFi
- **Template**: `appliances`
- **Provider ID**: `lg-thinq`

**Whirlpool** (incluant Bauknecht, KitchenAid)
- **API**: Whirlpool Product API
- **Technologies**: 6ème Sens, Supreme Clean, PowerClean Pro
- **Produits**: Large gamme encastrable
- **Template**: `appliances`
- **Provider ID**: `whirlpool-api`

**Electrolux Group** (incluant AEG, Zanussi, Frigidaire)
- **API**: Electrolux Group API
- **Technologies AEG**: SteamBake, SoftWater, MaxiSense, Hob²Hood
- **Technologies Electrolux**: SteamBoost, UltraFan Plus, AirDry
- **Template**: `appliances`
- **Provider ID**: `electrolux-api`

### 🔵 Niveau 3 - Import Manuel

**Neff**
- **Particularité**: Filiale de BSH, utiliser Home Connect API
- **Technologies**: Slide&Hide, CircoTherm, TwistPad
- **Template**: `appliances`

**Autres fabricants**: Candy, Hotpoint, Indesit, Beko, etc.
- **Import**: Via fichiers CSV/Excel fournis par le fabricant
- **Template**: `appliances` ou `generic`

## 🚀 Import Rapide

### Méthode 1: Sample Inclus (Test)

```bash
# Importer le sample avec 50+ produits de tous fabricants
pnpm catalog:import ./catalog-providers/sample-catalogs/appliances-sample.csv --template=appliances

# Résultat: 50 produits électroménager importés
# - 8 Bosch (fours, micro-ondes, plaques, hottes, lave-vaisselle)
# - 6 Siemens (iQ500/700)
# - 5 Miele (premium)
# - 5 Samsung (SmartThings)
# - 3 LG (ThinQ)
# - 5 AEG
# - 5 Whirlpool
# - 3 Electrolux
# - 5 Neff
```

### Méthode 2: Fichier Fabricant

```bash
# Vous avez reçu un catalogue Excel de Bosch
pnpm catalog:import ./catalogues/bosch-2026.xlsx --template=appliances --provider-id=bosch

# Avec auto-mapping
pnpm catalog:import ./catalogues/miele-catalog.csv --template=appliances
```

### Méthode 3: API Officielle (Bulk)

```bash
# Importer depuis l'API Bosch Home Connect
pnpm catalog:bulk-import --provider=bosch-api --limit=500

# Importer depuis plusieurs fabricants
pnpm catalog:bulk-import --provider=bosch-api,miele-api,samsung-smartthings --category=appliance

# Tous les fabricants d'électroménager
pnpm catalog:bulk-import --category=appliance --limit=1000
```

## 📋 Template Électroménager

Le template `appliances` supporte les champs spécifiques à l'électroménager:

### Champs Standards
- **Identification**: model_number, ean, brand
- **Base**: product_name, category, price
- **Dimensions**: width, height, depth (dimensions d'encastrement/niche)
- **Finition**: color, finish

### Champs Spécifiques Électroménager
- **energyClass**: Classe énergétique (A+++, A++, A+, A-G)
- **capacity**: Capacité (71L pour four, 14 couverts pour lave-vaisselle)
- **power**: Puissance électrique (3650W)
- **noiseLevel**: Niveau sonore (42dB)
- **features**: Fonctionnalités (Pyrolyse, HomeConnect, etc.)
- **programs**: Programmes disponibles
- **connectivity**: WiFi, Bluetooth, HomeConnect, SmartThings, etc.
- **installationType**: built_in (encastrable), fully_integrated (intégrable), freestanding

### Catégories Supportées

```
oven                  - Four encastrable
microwave            - Micro-ondes
combination_oven     - Four combiné micro-ondes
induction_cooktop    - Plaque induction
ceramic_cooktop      - Plaque vitrocéramique
gas_cooktop          - Plaque gaz
hood                 - Hotte aspirante
dishwasher           - Lave-vaisselle
refrigerator         - Réfrigérateur encastrable
freezer              - Congélateur encastrable
wine_cooler          - Cave à vin
washing_machine      - Lave-linge encastrable
```

## 🎯 Exemples d'Import

### Exemple 1: Bosch Série 8

```csv
model_number,brand,product_name,category,price,energy_class,width,height,depth,capacity,power,features,connectivity
HBG6764S1,Bosch,Four encastrable pyrolyse Série 8,oven,899.00,A+,59.4,59.5,54.8,71L,3650W,"Pyrolyse;EcoClean;LED",HomeConnect WiFi
```

**Import**:
```bash
pnpm catalog:import ./bosch-serie8.csv --template=appliances --provider-id=bosch
```

### Exemple 2: Miele AutoDos

```csv
model_number,brand,product_name,category,price,energy_class,noise,features,warranty
G7310SCIAUTODOS,Miele,Lave-vaisselle AutoDos,dishwasher,1599.00,A+++,42dB,"AutoDos;QuickIntenseWash;Knock2open",5 ans
```

**Import**:
```bash
pnpm catalog:import ./miele-autodos.csv --template=appliances
```

### Exemple 3: Samsung Dual Cook

```json
{
  "products": [
    {
      "model": "NV7B45305AS",
      "brand": "Samsung",
      "name": "Four Dual Cook Flex",
      "category": "oven",
      "price": 699.00,
      "energy_class": "A+",
      "features": ["Dual Cook Flex", "Pyrolyse", "Vapeur"],
      "connectivity": "SmartThings WiFi"
    }
  ]
}
```

**Import**:
```bash
pnpm catalog:import ./samsung-dual-cook.json --template=appliances
```

## 🔧 Configuration des APIs

### 1. Créer les Comptes Développeur

**Bosch/Siemens Home Connect**:
1. Aller sur https://developer.home-connect.com
2. Créer un compte développeur
3. Créer une application
4. Obtenir le token Bearer

**Miele Professional**:
1. Contacter Miele Professional
2. Demander accès API catalogue
3. Recevoir les credentials

**Samsung SmartThings**:
1. https://smartthings.developer.samsung.com
2. Créer une application
3. Obtenir le Personal Access Token

**LG ThinQ**:
1. https://www.lge.com/global/business/partnership/lg-thinq
2. Demander accès API
3. Configuration OAuth2

### 2. Configurer les Clés dans .env

```bash
# Copier le template
cp config/env/env.example .env

# Éditer .env et ajouter:
CATALOG_API_BOSCH_HOME_CONNECT_TOKEN=votre_token_bosch
CATALOG_API_MIELE_API_TOKEN=votre_token_miele
CATALOG_API_SAMSUNG_SMARTTHINGS_TOKEN=votre_token_samsung
CATALOG_API_LG_THINQ_TOKEN=votre_token_lg
CATALOG_API_WHIRLPOOL_API_KEY=votre_cle_whirlpool
CATALOG_API_ELECTROLUX_API_KEY=votre_cle_electrolux
```

### 3. Tester la Connexion

```bash
# Test avec limite faible
pnpm catalog:bulk-import --provider=bosch-api --limit=10 --dry-run

# Si succès, import réel
pnpm catalog:bulk-import --provider=bosch-api --limit=100
```

## 📊 Mapping des Champs

### Colonnes Bosch/Siemens (Home Connect)

```
haId               → model_number
brand              → brand
name               → product_name
type               → category (Oven, Dishwasher, etc.)
```

### Colonnes Miele

```
fabNumber          → model_number
productName        → product_name
energyEfficiency   → energy_class
capacity           → capacity
```

### Colonnes Samsung

```
modelCode          → model_number
deviceName         → product_name
smartThingsType    → category
energyRating       → energy_class
```

### Colonnes Standards (si fichier fabricant)

Le template `appliances` reconnaît automatiquement:
- `model`, `model_number`, `reference` → model_number
- `energy_class`, `energy_rating`, `classe_energetique` → energyClass
- `capacity`, `volume`, `capacite` → capacity
- `noise`, `noise_level`, `niveau_sonore` → noiseLevel
- `power`, `puissance`, `wattage` → power

## 💡 Tips et Astuces

### Détecter les Produits Connectés

Le système détecte automatiquement les mots-clés:
- WiFi, HomeConnect, SmartThings, ThinQ, Miele@home
- App, Alexa, Google Home
- Ces produits sont flaggés avec `connectivity` rempli

### Classes Énergétiques

Valeurs acceptées:
- Anciennes: A+++, A++, A+, A, B, C, D, E, F, G
- Nouvelles (2021+): A, B, C, D, E, F, G
- Le système normalise automatiquement

### Dimensions d'Encastrement

Les dimensions sont les **dimensions de la niche** (espace nécessaire):
- **Width**: Largeur de la niche (ex: 59.4 cm)
- **Height**: Hauteur de la niche (ex: 59.5 cm)
- **Depth**: Profondeur de la niche (ex: 54.8 cm)

Le système peut ajouter automatiquement des marges si configuré.

### Capacités

Format attendu:
- Fours: `71L`, `73 litres`
- Lave-vaisselle: `14 couverts`, `14 place settings`
- Le système extrait le nombre automatiquement

### Puissance

Format attendu:
- `3650W`, `3.65kW`, `3650 Watts`
- Le système normalise en Watts

### Niveau Sonore

Format attendu:
- `42dB`, `42 dB(A)`, `42 décibels`
- Le système extrait le nombre

## 📈 Statistiques des Fabricants

### Part de Marché (Europe 2025)

1. **BSH** (Bosch/Siemens/Neff): 26%
2. **Electrolux Group** (Electrolux/AEG/Zanussi): 18%
3. **Whirlpool Group**: 14%
4. **Miele**: 8%
5. **Samsung**: 7%
6. **LG**: 6%
7. **Candy Hoover**: 5%
8. **Autres**: 16%

### Produits par Gamme de Prix

**Entrée de gamme** (< 500€):
- Bosch Série 2
- Electrolux Essential
- Whirlpool Standard

**Milieu de gamme** (500-1000€):
- Bosch Série 4/6
- Siemens iQ300/500
- AEG 6000/7000
- Samsung standard

**Haut de gamme** (1000-2000€):
- Bosch Série 8
- Siemens iQ700
- AEG 9000 Series
- Samsung Premium
- Neff

**Premium** (> 2000€):
- Miele
- Gaggenau
- V-Zug

## 🔍 Troubleshooting

### Problème: "Classe énergétique invalide"

```bash
# Vérifier le format dans votre fichier
# Accepté: A+++, A++, A+, A, B, C, D, E, F, G
# Pas accepté: A+++ (10%), Energy A, etc.
```

### Problème: "Dimensions manquantes"

```bash
# Au minimum, width doit être présent
# Les dimensions sont OBLIGATOIRES pour l'électroménager encastrable
# Vérifier que les colonnes width/height/depth existent
```

### Problème: "Capacité non reconnue"

```bash
# Formats acceptés:
# - "71L", "71 L", "71 litres"
# - "14 couverts", "14 place settings"
# Le système extrait automatiquement le nombre
```

### Problème: "API rate limit"

```bash
# Les APIs fabricants ont des limits strictes
# Réduire requestsPerSecond dans providers-list.json
# Ou utiliser l'import par fichier CSV/Excel
```

## 🎉 Prochaines Étapes

Après import de vos catalogues électroménager:

1. **Vérifier les produits importés**:
   ```bash
   cat catalog-providers/imported-catalogs/import-*.json | jq '.metadata'
   ```

2. **Synchroniser avec la base de données**:
   ```bash
   pnpm db:seed --source=catalog-providers/imported-catalogs/
   ```

3. **Visualiser dans l'app**:
   ```bash
   pnpm frontend:dev
   # Naviguer vers /catalogue/electromenager
   ```

4. **Configurer les mises à jour automatiques**:
   ```bash
   # Cron job quotidien pour Bosch
   0 3 * * * cd /app && pnpm catalog:bulk-import --provider=bosch-api
   ```

## 📞 Support

- 📚 **Guide général**: [QUICK_START.md](QUICK_START.md)
- 🔧 **Template**: [appliances-template.json](universal-importer/catalog-templates/appliances-template.json)
- 📦 **Sample**: [appliances-sample.csv](sample-catalogs/appliances-sample.csv)
- 💬 **Questions**: GitHub Issues
- 📧 **Email**: dev@kitchenxpert.com

---

**Mis à jour**: 2026-01-10
**Fabricants couverts**: 10+ (Bosch, Siemens, Miele, Samsung, LG, Whirlpool, AEG, Electrolux, Neff, et plus)
**Produits samples**: 50+ produits réels
