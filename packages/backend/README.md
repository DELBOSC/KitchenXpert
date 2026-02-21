# @kitchenxpert/backend

Backend API pour la plateforme KitchenXpert.

## Technologies

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Langage**: TypeScript
- **Base de données**: PostgreSQL
- **Cache**: Redis (optionnel)
- **Auth**: JWT

## Installation

```bash
# Depuis la racine du monorepo
pnpm install

# Ou uniquement ce package
pnpm --filter @kitchenxpert/backend install
```

## Configuration

Créez un fichier `.env` à la racine du projet avec :

```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kitchenxpert
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_key
```

## Scripts

```bash
# Développement avec hot-reload
pnpm --filter @kitchenxpert/backend dev

# Build production
pnpm --filter @kitchenxpert/backend build

# Lancer en production
pnpm --filter @kitchenxpert/backend start

# Tests
pnpm --filter @kitchenxpert/backend test
pnpm --filter @kitchenxpert/backend test:coverage

# Linting
pnpm --filter @kitchenxpert/backend lint
pnpm --filter @kitchenxpert/backend lint:fix

# Base de données
pnpm --filter @kitchenxpert/backend db:migrate
pnpm --filter @kitchenxpert/backend db:seed
pnpm --filter @kitchenxpert/backend db:reset
```

## Structure

```
src/
├── api/
│   ├── controllers/    # Contrôleurs REST
│   ├── routes/         # Définition des routes
│   └── validators/     # Validation des requêtes
├── config/             # Configuration de l'application
├── database/
│   ├── migrations/     # Migrations SQL
│   ├── seeds/          # Données de seed
│   └── connection.ts   # Connexion PostgreSQL
├── middleware/         # Middlewares Express
├── services/           # Logique métier
├── models/             # Modèles de données
└── test/               # Configuration des tests
```

## API Endpoints

### Auth
- `POST /api/v1/auth/register` - Inscription
- `POST /api/v1/auth/login` - Connexion
- `POST /api/v1/auth/refresh` - Renouveler le token

### Users
- `GET /api/v1/users/me` - Profil utilisateur
- `PUT /api/v1/users/me` - Mettre à jour le profil

### Kitchens
- `GET /api/v1/kitchens` - Liste des cuisines
- `POST /api/v1/kitchens` - Créer une cuisine
- `GET /api/v1/kitchens/:id` - Détails d'une cuisine
- `PUT /api/v1/kitchens/:id` - Modifier une cuisine
- `DELETE /api/v1/kitchens/:id` - Supprimer une cuisine

### Products
- `GET /api/v1/products` - Liste des produits
- `GET /api/v1/products/search` - Rechercher des produits
- `GET /api/v1/products/:id` - Détails d'un produit

### Orders
- `GET /api/v1/orders` - Liste des commandes
- `POST /api/v1/orders` - Créer une commande
- `GET /api/v1/orders/:id` - Détails d'une commande

## Tests

```bash
# Lancer tous les tests
pnpm --filter @kitchenxpert/backend test

# Tests avec couverture
pnpm --filter @kitchenxpert/backend test:coverage

# Tests en mode watch
pnpm --filter @kitchenxpert/backend test:watch
```
