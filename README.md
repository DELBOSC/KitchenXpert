# KitchenXpert

Plateforme SaaS complète de conception de cuisines avec intelligence
artificielle, visualisation 3D, et intégrations multi-providers.

## 🚀 Technologies

### Frontend

- **React** + **TypeScript** - UI framework
- **Next.js** - Framework React (optionnel)
- **Zustand** - State management
- **React Router** - Navigation
- **i18n** - Support 5 langues (EN, FR, ES, DE, AR)

### Backend

- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** - Base de données principale
- **Redis** - Cache et sessions
- **JWT** - Authentification
- **bcrypt** - Hashing des mots de passe

### AI/ML

- **Python** - 4 modules IA
  - Kitchen Generator (génération de designs)
  - Appliance Advisor (recommandations)
  - Compatibility Engine (compatibilité produits)
  - Style Analyzer (analyse de tendances)

### 3D Engine

- **Three.js** - Visualisation 3D
- **WebGL** - Rendu graphique

### Infrastructure

- **Docker** - Containerisation
- **GitHub Actions** - CI/CD
- **nginx** - Reverse proxy
- **Turbo** + **pnpm** - Monorepo

## 📦 Structure du Projet

```
KitchenXpert/
├── packages/                          # Monorepo packages
│   ├── backend/                       # API REST Express
│   ├── frontend/                      # Application React
│   ├── common/                        # Types & utils partagés
│   ├── api-client/                    # Client API typé
│   ├── design-system/                 # Composants UI
│   ├── ui-components/                 # Composants réutilisables
│   ├── partner-portal/                # Portail partenaires
│   ├── 3d-engine/                     # Moteur 3D
│   └── ai-modules/                    # 4 modules IA
├── catalog-providers/                 # 183 intégrations catalogues
│   ├── common/                        # Système de factory
│   ├── furniture-providers/           # 30+ fournisseurs meubles
│   └── appliance-providers/           # 50+ fournisseurs électroménager
├── config/                            # Configurations
│   ├── docker/                        # Docker compose files
│   ├── nginx/                         # Config nginx
│   ├── database/                      # Migrations & seeds
│   └── ...
├── docs/                              # Documentation complète
└── scripts/                           # Scripts utilitaires
```

## 🎯 Fonctionnalités Principales

### ✅ Implémentées

1. **Configuration Monorepo**
   - Turbo + pnpm workspace
   - Build parallèle et cache intelligent
   - Scripts de développement optimisés

2. **TypeScript Strict**
   - Configuration stricte pour tous les packages
   - Types partagés dans `@kitchenxpert/common`
   - Path aliases configurés

3. **ESLint + Prettier**
   - Règles strictes pour qualité du code
   - Auto-formatting
   - Import ordering automatique

4. **Architecture de Types**
   - `BaseEntity`, `ApiResponse`, `PaginatedResponse`
   - Types utilisateur et authentification
   - Types métier (Kitchen, Catalog, etc.)

5. **Gestion d'Erreurs Standardisée**
   - Classes d'erreurs typées (`ApiError`, `ValidationError`, etc.)
   - Middleware global de gestion d'erreurs
   - Réponses API cohérentes

6. **Système de Factory pour Providers** ⭐
   - Réduction de duplication de code (183 providers)
   - Classes de base réutilisables
   - Rate limiting et retry automatiques
   - Validation standardisée

7. **Authentification JWT Complète** 🔐
   - Inscription / Connexion
   - Access & Refresh tokens
   - Reset mot de passe
   - Middleware d'authentification
   - Protection par rôles
   - Vérification email

8. **Variables d'Environnement**
   - `.env.example` complet
   - `.env.development` pré-configuré
   - `.env.production.example` avec bonnes pratiques

### 🚧 À Implémenter

- [ ] **Base de données** - Migrations PostgreSQL
- [ ] **Tests** - Jest + tests unitaires/intégration
- [ ] **Frontend** - Composants React
- [ ] **3D Engine** - Visualisation Three.js
- [ ] **Modules IA** - Intégration Python
- [ ] **CI/CD** - GitHub Actions workflows

## 🏃 Démarrage Rapide

### Prérequis

- Node.js ≥ 18
- pnpm ≥ 8
- PostgreSQL ≥ 14
- Redis (optionnel en dev)

### Installation

```bash
# 1. Cloner le projet
git clone https://github.com/your-org/kitchenxpert.git
cd kitchenxpert

# 2. Installer les dépendances
pnpm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# 4. Configurer la base de données
pnpm db:migrate
pnpm db:seed

# 5. Démarrer en mode développement
pnpm dev
```

### ⚠️ Frontend seul vs stack complète

`pnpm dev` à la racine lance backend + frontend en parallèle (recommandé en
dev).

Si tu lances uniquement le frontend (`pnpm frontend:dev`), la console DevTools
affichera en boucle des erreurs **500 sur `/api/v1/...`** : le proxy Vite
(port 3005) tape `http://localhost:4000` qui n'écoute pas. Trois options :

- **Stack complète** : `pnpm dev` à la racine (Turbo lance backend + frontend)
- **Backend seul** dans un autre terminal : `pnpm backend:dev` (port 4000), puis
  `pnpm frontend:dev` dans un terminal séparé
- **Vérifier que le backend tourne** : `curl http://localhost:4000/health` doit
  répondre `{"status":"healthy",...}`

Prérequis backend : PostgreSQL démarré + `.env` configuré à la racine
(`cp .env.example .env`). Sans DB, le backend exit après 5 tentatives de
reconnexion (~31s).

⚠️ Sans `.env` à la racine, le backend démarre sur le port 3001 (au lieu du port
4000 attendu par le proxy Vite) — ce qui reproduit les erreurs 500 sur
`/api/v1/*`.

### Scripts Disponibles

```bash
# Développement
pnpm dev                    # Démarre tous les packages en dev
pnpm backend:dev            # Backend seul
pnpm frontend:dev           # Frontend seul

# Build
pnpm build                  # Build tous les packages
pnpm type-check             # Vérification TypeScript

# Code Quality
pnpm lint                   # Linter tous les packages
pnpm lint:fix               # Fix auto des erreurs
pnpm format                 # Formater avec Prettier

# Tests
pnpm test                   # Tous les tests
pnpm test:coverage          # Avec couverture

# Base de données
pnpm db:migrate             # Exécuter les migrations
pnpm db:seed                # Peupler avec des données
pnpm db:reset               # Reset complet

# Docker
pnpm docker:dev             # Docker dev
pnpm docker:prod            # Docker production

# Nettoyage
pnpm clean                  # Nettoyer node_modules et dist
pnpm clean:install          # Clean + reinstall
```

## 🔐 Authentification

### Inscription

```typescript
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Connexion

```typescript
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900,
      "tokenType": "Bearer"
    }
  }
}
```

### Routes Protégées

```typescript
// Ajouter le token dans le header
Authorization: Bearer<accessToken>;

// Exemples
GET / api / auth / me; // Utilisateur connecté
POST / api / auth / logout; // Déconnexion
POST / api / auth / password / change; // Changer mot de passe
```

## 📚 Catalog Providers

### Architecture Factory

Le système utilise un **pattern Factory** pour gérer 183 intégrations de
catalogues de manière standardisée.

```typescript
import { ProviderFactory } from './catalog-providers/common';

// Créer un provider
const config = {
  apiEndpoint: 'https://api.ikea.com',
  apiKey: 'xxx',
  timeout: 5000,
  retryAttempts: 3,
  rateLimit: { maxRequests: 100, windowMs: 60000 },
};

const provider = ProviderFactory.create('ikea', config);

// Synchroniser les produits
const result = await provider.sync();
console.log(`Ajoutés: ${result.itemsAdded}`);

// Récupérer un produit
const product = await provider.fetchProduct('12345');
```

### Avantages

- ✅ **Zéro duplication** - Code partagé
- ✅ **Type-safe** - TypeScript strict
- ✅ **Rate limiting** - Intégré
- ✅ **Retry automatique** - Avec backoff
- ✅ **Validation** - Standardisée

Voir [catalog-providers/README.md](catalog-providers/README.md) pour plus de
détails.

## 🧪 Tests

```bash
# Tous les tests
pnpm test

# Tests avec watch
pnpm test:watch

# Couverture
pnpm test:coverage

# Tests spécifiques
pnpm --filter backend test
pnpm --filter frontend test
```

## 🐳 Docker

```bash
# Développement
docker-compose -f config/docker/docker-compose.dev.yml up

# Production
docker-compose -f config/docker/docker-compose.prod.yml up

# Rebuild
docker-compose -f config/docker/docker-compose.dev.yml up --build
```

## 📖 Documentation

- [Architecture](docs/architecture/) - Diagrammes et structure
- [API Documentation](docs/api/) - Endpoints et exemples
- [Development Guide](docs/development/) - Guide développeur
- [Catalog Providers](catalog-providers/README.md) - Système de providers
- [Security](docs/security/) - Sécurité et conformité

## 🔒 Sécurité

- ✅ JWT avec tokens séparés (access/refresh)
- ✅ Bcrypt pour les mots de passe (12 rounds en prod)
- ✅ Rate limiting configuré
- ✅ Helmet.js pour headers sécurisés
- ✅ CORS configuré
- ✅ Validation stricte des inputs
- ✅ Protection CSRF
- ✅ SQL injection protection (parameterized queries)

## 🌍 Internationalisation

Langues supportées:

- 🇬🇧 Anglais (EN)
- 🇫🇷 Français (FR)
- 🇪🇸 Espagnol (ES)
- 🇩🇪 Allemand (DE)
- 🇸🇦 Arabe (AR) - avec support RTL

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

### Standards de Code

- **TypeScript strict mode** obligatoire
- **ESLint** doit passer (0 erreurs)
- **Tests** pour les nouvelles fonctionnalités
- **Documentation** pour les APIs publiques

## 📝 Changelog

### v1.0.0 (En cours)

**✅ Implémenté:**

- Configuration monorepo (Turbo + pnpm)
- TypeScript strict pour tous les packages
- ESLint/Prettier avec règles strictes
- Architecture de types partagés
- Gestion d'erreurs standardisée
- Système de factory pour catalog providers
- Authentification JWT complète
- Variables d'environnement

**🚧 En cours:**

- Migrations de base de données
- Tests unitaires et intégration
- Frontend React
- Modules IA

## 📄 Licence

MIT © KitchenXpert

## 👥 Équipe

- **Lead Developer** - Architecture & Backend
- **Frontend Developer** - React & 3D
- **AI Engineer** - Modules ML
- **DevOps** - Infrastructure & CI/CD

## 📞 Support

- **Email**: support@kitchenxpert.com
- **Documentation**: https://docs.kitchenxpert.com
- **Issues**: https://github.com/your-org/kitchenxpert/issues

---

Made with ❤️ by KitchenXpert Team
