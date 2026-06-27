# KitchenXpert Scraper

Module de scraping pour alimenter la base de données produits de KitchenXpert.

## 📋 Fonctionnalités

- **Scraping multi-marques** : Schmidt, Cuisinella, Mobalpa, IKEA, Leroy Merlin,
  etc.
- **Extraction de données** :
  - Meubles de cuisine (bas, hauts, colonnes, angles)
  - Plans de travail
  - Façades et finitions
  - Poignées
  - Électroménager
  - Accessoires
- **Rate limiting** intelligent
- **Gestion des proxies**
- **Retry automatique** avec backoff exponentiel
- **API REST** pour KitchenXpert

## 🚀 Installation

```bash
# Installation des dépendances
npm install

# Génération du client Prisma
npm run db:generate

# Démarrage de la base de données
docker-compose up -d

# Migration de la base de données
npm run db:migrate
```

## 📦 Structure

```
src/
├── scrapers/          # Scrapers par marque
│   ├── base-scraper.ts
│   └── schmidt.ts
├── models/            # Types et interfaces
├── services/          # Services métier
├── utils/             # Utilitaires
├── config/            # Configuration
├── api/               # API REST
└── database/          # Prisma schema
```

## 🔧 Utilisation

### Scraper une marque

```bash
# Mode normal
npm run scrape:brand schmidt

# Mode test (première page uniquement)
npm run scrape:brand schmidt --test

# Mode debug (navigateur visible)
npm run scrape:brand schmidt --headful
```

### Scraper toutes les marques

```bash
# Toutes les marques actives
npm run scrape:all

# Par ordre de priorité
npm run scrape:priority
```

### Démarrer l'API

```bash
# Développement
npm run api:dev

# Production
npm run api:start
```

## 🌐 API Endpoints

### Produits

| Endpoint                 | Description                     |
| ------------------------ | ------------------------------- |
| `GET /api/v1/cabinets`   | Rechercher des meubles          |
| `GET /api/v1/worktops`   | Rechercher des plans de travail |
| `GET /api/v1/facades`    | Rechercher des façades          |
| `GET /api/v1/appliances` | Rechercher de l'électroménager  |
| `GET /api/v1/brands`     | Liste des marques               |

### Recherche intelligente

| Endpoint                        | Description                      |
| ------------------------------- | -------------------------------- |
| `POST /api/v1/search/smart`     | Recherche IA pour configurations |
| `GET /api/v1/search/suggest`    | Suggestions autocomplete         |
| `GET /api/v1/search/compatible` | Produits compatibles             |

### Scraping

| Endpoint                                 | Description        |
| ---------------------------------------- | ------------------ |
| `GET /api/v1/scraping/status`            | État des jobs      |
| `POST /api/v1/scraping/start/:brandId`   | Démarrer un scrape |
| `POST /api/v1/scraping/stop/:brandId`    | Arrêter un scrape  |
| `GET /api/v1/scraping/progress/:brandId` | Progression        |

## 🏷️ Marques supportées

### Scrapers implémentés

- ✅ Schmidt

### À implémenter

- ⏳ Cuisinella (Schmidt Groupe)
- ⏳ Mobalpa (Fournier)
- ⏳ IKEA
- ⏳ Leroy Merlin
- ⏳ Et 20+ autres...

## ⚙️ Configuration

```env
# Database
DATABASE_URL="postgresql://..."

# Redis
REDIS_URL="redis://localhost:6379"

# API
API_PORT=3100

# Scraping
SCRAPE_RATE_LIMIT_MS=3000
SCRAPE_MAX_CONCURRENT=3
SCRAPE_RETRY_ATTEMPTS=3

# Proxy (optionnel)
PROXY_ENABLED=false
PROXY_LIST=""
```

## 📊 Modèles de données

### Cabinet (Meuble)

- Type : base, wall, tall, corner, island
- Dimensions : largeur, hauteur, profondeur
- Configuration : portes, tiroirs, étagères
- Prix et compatibilités

### Worktop (Plan de travail)

- Matériau : stratifié, quartz, granit, etc.
- Épaisseurs et profondeurs disponibles
- Propriétés : résistance chaleur, rayures, etc.

### Facade (Façade)

- Style : flat, shaker, handleless, etc.
- Matériau : mélaminé, laqué, bois, etc.
- Couleurs et finitions disponibles

## 🔒 Respect des sites

- ✅ Vérification robots.txt
- ✅ Rate limiting (3-5s entre requêtes)
- ✅ User-Agent réaliste
- ✅ Scraping en heures creuses recommandé
- ❌ Pas de données personnelles

## 📝 License

Propriétaire - KitchenXpert
