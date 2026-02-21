# Infisical - Gestion des Secrets

Guide de configuration et d'utilisation d'Infisical pour KitchenXpert.

## Pourquoi Infisical ?

- Centralisation de tous les secrets (DB, JWT, Stripe, AWS, etc.)
- Interface web pour gerer les secrets par environnement
- Injection automatique dans les processus (CLI) et CI/CD (GitHub Actions)
- Audit log : qui a modifie quel secret et quand
- Rotation des secrets facilitee
- Open-source et auto-hebergeable

## Installation de la CLI

### Windows (winget)
```bash
winget install infisical
```

### macOS (Homebrew)
```bash
brew install infisical/get-cli/infisical
```

### Linux (apt)
```bash
curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash
sudo apt-get update && sudo apt-get install -y infisical
```

### npm (toutes plateformes)
```bash
npm install -g @infisical/cli
```

## Premiere connexion

```bash
# Se connecter (ouvre le navigateur)
infisical login

# Verifier la connexion
infisical whoami
```

## Organisation des environnements

Le projet utilise 3 environnements dans Infisical :

| Environnement | Slug | Branche Git | Usage |
|---------------|------|-------------|-------|
| Development | `dev` | `*` (toutes) | Developpement local |
| Staging | `staging` | `develop` | Pre-production |
| Production | `prod` | `main` | Production |

La configuration est dans `.infisical.json` a la racine du projet.

## Commandes courantes

### Lancer le projet avec les secrets injectes
```bash
# Tout le monorepo
pnpm infisical:dev

# Backend uniquement
pnpm infisical:backend

# Frontend uniquement
pnpm infisical:frontend

# Build production
pnpm infisical:build
```

### Docker avec Infisical
```bash
# Dev
pnpm infisical:docker:dev

# Production
pnpm infisical:docker:prod
```

### Commandes CLI directes
```bash
# Lister les secrets (env dev)
infisical secrets --env=dev

# Lancer une commande avec injection
infisical run --env=dev -- <commande>

# Exporter en fichier .env (utile pour debug)
infisical export --env=dev --format=dotenv > .env

# Definir un secret
infisical secrets set MY_KEY=my_value --env=dev
```

## Ajouter un nouveau secret

1. **Via l'interface web** : Connectez-vous sur app.infisical.com, selectionnez le projet KitchenXpert, choisissez l'environnement, et ajoutez le secret.

2. **Via la CLI** :
```bash
# Ajouter a dev
infisical secrets set NEW_SECRET=value --env=dev

# Ajouter a staging
infisical secrets set NEW_SECRET=value --env=staging

# Ajouter a prod
infisical secrets set NEW_SECRET=value --env=prod
```

3. **Mettre a jour le schema Zod** si c'est une variable backend obligatoire :
   - Modifier `packages/backend/src/config/env-validator.ts`
   - Ajouter la nouvelle variable dans `envSchema`

4. **Mettre a jour `.env.example`** pour documenter la variable.

## Integration GitHub Actions (CI/CD)

Les workflows de deploiement utilisent `Infisical/secrets-action` pour injecter les secrets.

### Prerequis
Deux secrets GitHub sont necessaires :
- `INFISICAL_CLIENT_ID` : ID de la Machine Identity
- `INFISICAL_CLIENT_SECRET` : Secret de la Machine Identity

### Creer une Machine Identity

1. Aller dans **Infisical > Settings > Machine Identities**
2. Creer une nouvelle identite "GitHub Actions CI/CD"
3. Methode d'authentification : **Universal Auth**
4. Copier le `Client ID` et `Client Secret`
5. Les ajouter dans **GitHub > Settings > Secrets and variables > Actions**

### Fonctionnement dans les workflows

```yaml
# Deja configure dans deploy-staging.yml et deploy-prod.yml
- name: Fetch secrets from Infisical
  uses: Infisical/secrets-action@v1.0.7
  with:
    method: "universal-auth"
    env-slug: "staging"  # ou "prod"
    project-slug: "kitchenxpert"
    client-id: ${{ secrets.INFISICAL_CLIENT_ID }}
    client-secret: ${{ secrets.INFISICAL_CLIENT_SECRET }}
```

Les secrets sont ensuite disponibles via `${{ env.NOM_DU_SECRET }}`.

## Fallback .env (sans Infisical)

Si un developpeur ne souhaite pas utiliser Infisical, le workflow classique reste fonctionnel :

```bash
cp .env.example .env
# Remplir les valeurs dans .env
pnpm dev
```

`dotenv` charge le fichier `.env` normalement. Quand Infisical est utilise, les variables sont deja dans `process.env` et `dotenv` ne les surcharge pas.

## Secrets a migrer vers Infisical

### Obligatoires (environnement dev)
- `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `CORS_ORIGINS`, `CORS_ORIGIN`

### Recommandes (environnements staging/prod)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SENDGRID_API_KEY` / `SMTP_PASS`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `OPENAI_API_KEY`
- `SENTRY_DSN`

### GitHub Secrets a conserver
Ces secrets restent dans GitHub (pas dans Infisical) car ils sont specifiques au CI/CD :
- `INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`
- `PROD_SSH_KEY`, `STAGING_SSH_KEY` (cles SSH de deploiement)
- `DOCKER_REGISTRY`, `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- `SLACK_WEBHOOK_*` (notifications)
