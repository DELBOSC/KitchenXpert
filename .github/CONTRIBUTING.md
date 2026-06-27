# Contributing to KitchenXpert

Merci de votre intérêt pour contribuer à KitchenXpert ! 🎉

Ce guide vous aidera à comprendre comment contribuer efficacement au projet.

## 📋 Table des Matières

- [Code de Conduite](#code-de-conduite)
- [Comment Contribuer](#comment-contribuer)
- [Setup de l'Environnement de Dev](#setup-de-lenvironnement-de-dev)
- [Workflow de Développement](#workflow-de-développement)
- [Standards de Code](#standards-de-code)
- [Tests](#tests)
- [Pull Requests](#pull-requests)
- [Rapporter des Bugs](#rapporter-des-bugs)
- [Proposer des Features](#proposer-des-features)

## 📜 Code de Conduite

Ce projet adhère au [Code de Conduite](CODE_OF_CONDUCT.md). En participant, vous
acceptez de respecter ces règles.

## 🚀 Comment Contribuer

Il existe plusieurs façons de contribuer :

- 🐛 **Reporter des bugs** via les
  [Issues](https://github.com/kitchenxpert/issues)
- ✨ **Proposer des features** via les
  [Feature Requests](https://github.com/kitchenxpert/issues/new?template=feature-request.md)
- 📚 **Améliorer la documentation**
- 🔧 **Soumettre des Pull Requests**
- 🏪 **Proposer des intégrations de catalogues**
- 🧪 **Écrire des tests**
- 🌍 **Traduire l'application**

## 💻 Setup de l'Environnement de Dev

### Prérequis

- **Node.js** 20+
- **pnpm** 8+
- **Docker** & Docker Compose
- **Git**
- **PostgreSQL** 15+ (ou via Docker)
- **MongoDB** 7+ (ou via Docker)
- **Redis** 7+ (ou via Docker)

### Installation

```bash
# 1. Fork et clone le repo
git clone https://github.com/VOTRE-USERNAME/kitchenxpert.git
cd kitchenxpert

# 2. Installer pnpm (si pas déjà installé)
npm install -g pnpm

# 3. Installer les dépendances
pnpm install

# 4. Copier le fichier d'environnement
cp config/env/env.example .env

# 5. Générer les secrets JWT
openssl rand -base64 32  # Pour JWT_ACCESS_SECRET
openssl rand -base64 32  # Pour JWT_REFRESH_SECRET
openssl rand -base64 32  # Pour SESSION_SECRET

# 6. Éditer .env avec vos valeurs
nano .env

# 7. Démarrer les services avec Docker
docker-compose up -d postgres mongodb redis

# 8. Exécuter les migrations
pnpm migrate

# 9. Seed la base de données (optionnel)
pnpm seed

# 10. Démarrer le serveur de dev
pnpm dev
```

### Vérification de l'Installation

```bash
# Backend devrait être accessible sur http://localhost:4000
curl http://localhost:4000/health

# Frontend devrait être accessible sur http://localhost:3000
```

## 🔄 Workflow de Développement

### 1. Créer une Branche

```bash
# Toujours partir de develop
git checkout develop
git pull origin develop

# Créer une nouvelle branche (convention de nommage)
git checkout -b feature/ma-nouvelle-feature
git checkout -b fix/correction-bug
git checkout -b docs/mise-a-jour-readme
git checkout -b chore/update-dependencies
```

**Convention de nommage des branches:**

- `feature/` - Nouvelles fonctionnalités
- `fix/` - Corrections de bugs
- `docs/` - Documentation
- `chore/` - Maintenance, dépendances
- `refactor/` - Refactoring
- `test/` - Ajout de tests
- `perf/` - Optimisations de performance

### 2. Développer

```bash
# Faire vos modifications
# ...

# Tester localement
pnpm test

# Linter
pnpm lint

# Formatter
pnpm format

# Type check
pnpm type-check
```

### 3. Commit

**Convention de commits (Conventional Commits):**

```bash
# Format
<type>(<scope>): <description>

# Exemples
git commit -m "feat(catalog): add IKEA integration"
git commit -m "fix(3d-engine): correct camera positioning"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(backend): add auth service tests"
git commit -m "perf(frontend): optimize bundle size"
```

**Types de commits:**

- `feat` - Nouvelle fonctionnalité
- `fix` - Correction de bug
- `docs` - Documentation
- `style` - Formatage (pas de changement de code)
- `refactor` - Refactoring
- `perf` - Performance
- `test` - Tests
- `chore` - Maintenance
- `ci` - CI/CD
- `build` - Build system

**Scopes courants:**

- `frontend` - Frontend React
- `backend` - Backend API
- `3d-engine` - Moteur 3D
- `catalog` - Gestion catalogues
- `auth` - Authentification
- `ui` - Composants UI
- `config` - Configuration
- `db` - Database

### 4. Push et Pull Request

```bash
# Push vers votre fork
git push origin feature/ma-nouvelle-feature

# Créer une Pull Request sur GitHub
# Utiliser le template de PR fourni
```

## 📏 Standards de Code

### TypeScript

```typescript
// ✅ BON
interface User {
  id: string;
  name: string;
  email: string;
}

function getUserById(id: string): User | null {
  // ...
}

// ❌ MAUVAIS
function getUser(id: any): any {
  // ...
}
```

### Naming Conventions

```typescript
// Variables et fonctions: camelCase
const userName = 'John';
function fetchUserData() {}

// Classes et interfaces: PascalCase
class UserService {}
interface UserProfile {}

// Constants: UPPER_SNAKE_CASE
const API_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;

// Fichiers: kebab-case
// user-service.ts
// catalog-provider.ts
```

### Code Style

- **Indentation:** 2 espaces
- **Quotes:** Single quotes `'` pour strings
- **Semicolons:** Oui
- **Trailing commas:** Oui
- **Line length:** Max 100 caractères
- **Arrow functions:** Préférer aux `function` quand possible

### ESLint

Le projet utilise ESLint avec des règles strictes :

```bash
# Vérifier
pnpm lint

# Auto-fix
pnpm lint:fix
```

### Prettier

Formatage automatique :

```bash
# Vérifier
pnpm format:check

# Formatter
pnpm format
```

## 🧪 Tests

**Tous les nouveaux code doivent avoir des tests !**

### Types de Tests

```bash
# Tests unitaires
pnpm test:unit

# Tests d'intégration
pnpm test:integration

# Tests E2E
pnpm test:e2e

# Tous les tests
pnpm test

# Coverage
pnpm test:coverage
```

### Writing Tests

```typescript
// user.service.test.ts
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = { name: 'John', email: 'john@example.com' };
      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
    });

    it('should throw error if email already exists', async () => {
      const userData = { name: 'John', email: 'existing@example.com' };

      await expect(userService.createUser(userData)).rejects.toThrow(
        'Email already exists'
      );
    });
  });
});
```

### Coverage Requirements

- **Minimum global:** 70%
- **Branches:** 70%
- **Functions:** 70%
- **Lines:** 70%

## 🔍 Pull Requests

### Checklist

Avant de soumettre une PR, vérifier :

- [ ] Le code compile sans erreur
- [ ] Tous les tests passent
- [ ] Le code est linté et formatté
- [ ] Les tests sont ajoutés/mis à jour
- [ ] La documentation est mise à jour
- [ ] Les commits suivent la convention
- [ ] La PR décrit clairement les changements
- [ ] Les screenshots sont ajoutés (si UI)

### Template de PR

Utiliser le [template de PR](.github/PULL_REQUEST_TEMPLATE.md) fourni.

### Review Process

1. **CI/CD automatique** - Les tests doivent passer
2. **Review par les pairs** - Au moins 1 approbation requise
3. **Review par le code owner** - Si fichiers sensibles
4. **Merge** - Squash and merge par défaut

### Critères d'Acceptation

- ✅ CI/CD vert
- ✅ Au moins 1 approbation
- ✅ Conflits résolus
- ✅ Branch à jour avec `develop`
- ✅ Code coverage maintenu ou amélioré

## 🐛 Rapporter des Bugs

Utiliser le [template de bug report](.github/ISSUE_TEMPLATE/bug-report.md).

**Informations à inclure:**

- Description claire du bug
- Étapes de reproduction
- Comportement attendu vs actuel
- Environnement (OS, browser, version)
- Screenshots/logs si applicable

## ✨ Proposer des Features

Utiliser le
[template de feature request](.github/ISSUE_TEMPLATE/feature-request.md).

**Informations à inclure:**

- Description de la fonctionnalité
- Cas d'usage (user stories)
- Bénéfices attendus
- Alternatives considérées

## 🏪 Intégrer un Catalogue

Pour proposer l'intégration d'un nouveau catalogue fournisseur :

1. Utiliser le
   [template d'intégration](.github/ISSUE_TEMPLATE/catalog-integration-request.md)
2. Une fois approuvé, utiliser le CLI generator :

```bash
pnpm tsx catalog-providers/cli/generate-provider.ts
```

Voir la [documentation des catalogues](catalog-providers/README.md).

## 🌍 Traductions

Pour ajouter ou améliorer une traduction :

1. Vérifier les fichiers dans `packages/frontend/src/locales/`
2. Suivre la structure existante
3. Tester les traductions dans l'app
4. Soumettre une PR avec le label `i18n`

## 📞 Support

Besoin d'aide ?

- 💬 [Discussions GitHub](https://github.com/kitchenxpert/discussions)
- 📧 Email: dev@kitchenxpert.com
- 💡 [Forum Communautaire](https://community.kitchenxpert.com)

## 🎉 Reconnaissance

Tous les contributeurs sont reconnus dans le [CHANGELOG](CHANGELOG.md) et sur
notre [page contributeurs](https://github.com/kitchenxpert/graphs/contributors).

Merci pour votre contribution ! 🙏
