# KitchenXpert - Guide de Déploiement Production

## Table des matières

1. [Prérequis](#prérequis)
2. [Architecture](#architecture)
3. [Configuration de l'environnement](#configuration-de-lenvironnement)
4. [Déploiement de la base de données](#déploiement-de-la-base-de-données)
5. [Déploiement du Backend](#déploiement-du-backend)
6. [Déploiement du Frontend](#déploiement-du-frontend)
7. [Déploiement du Partner Portal](#déploiement-du-partner-portal)
8. [Déploiement des AI Modules](#déploiement-des-ai-modules)
9. [Configuration des services externes](#configuration-des-services-externes)
10. [Monitoring et maintenance](#monitoring-et-maintenance)
11. [Checklist de déploiement](#checklist-de-déploiement)

---

## Prérequis

### Logiciels requis

| Logiciel   | Version minimale | Utilisation        |
| ---------- | ---------------- | ------------------ |
| Node.js    | 18.0.0+          | Backend & Frontend |
| pnpm       | 8.0.0+           | Package manager    |
| Python     | 3.9+             | AI Modules         |
| PostgreSQL | 14+              | Base de données    |
| Redis      | 6+               | Cache & Sessions   |

### Services cloud recommandés

- **Hébergement**: AWS, Google Cloud, Azure, ou Vercel/Railway
- **Base de données**: AWS RDS, Supabase, ou Neon
- **Redis**: AWS ElastiCache, Upstash, ou Redis Cloud
- **Stockage S3**: AWS S3, Cloudflare R2, ou MinIO
- **CDN**: Cloudflare, AWS CloudFront

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer / CDN                       │
│                    (Cloudflare / CloudFront)                     │
└─────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│   Frontend    │       │ Partner Portal│       │   Backend     │
│   (React)     │       │   (React)     │       │  (Express)    │
│  Port: 3000   │       │  Port: 3001   │       │  Port: 4000   │
└───────────────┘       └───────────────┘       └───────────────┘
                                                        │
                        ┌───────────────────────────────┤
                        │               │               │
                        ▼               ▼               ▼
              ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
              │  PostgreSQL   │ │     Redis     │ │  AI Modules   │
              │  (Database)   │ │   (Cache)     │ │  (FastAPI)    │
              │  Port: 5432   │ │  Port: 6379   │ │  Port: 5000   │
              └───────────────┘ └───────────────┘ └───────────────┘
                                                        │
                                                        ▼
                                              ┌───────────────┐
                                              │    AWS S3     │
                                              │  (Storage)    │
                                              └───────────────┘
```

---

## Configuration de l'environnement

### 1. Cloner le repository

```bash
git clone https://github.com/your-org/kitchenxpert.git
cd kitchenxpert
```

### 2. Créer le fichier de configuration production

```bash
cp .env.production.example .env.production
```

### 3. Générer les secrets sécurisés

```bash
# Générer JWT_ACCESS_SECRET
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Générer JWT_REFRESH_SECRET
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Configurer les variables d'environnement

Éditer `.env.production` avec vos valeurs réelles :

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/kitchenxpert_prod?sslmode=require

# JWT (utiliser les secrets générés ci-dessus)
JWT_ACCESS_SECRET=<votre_secret_64_chars>
JWT_REFRESH_SECRET=<votre_secret_64_chars>

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# AWS S3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=kitchenxpert-prod
```

---

## Déploiement de la base de données

### Option A: AWS RDS PostgreSQL

1. Créer une instance RDS PostgreSQL 14+
2. Configurer les security groups pour autoriser le backend
3. Activer SSL/TLS

### Option B: Supabase / Neon

1. Créer un projet
2. Récupérer la connection string
3. Ajouter `?sslmode=require` à l'URL

### Migrations

```bash
# Installer les dépendances
pnpm install

# Appliquer les migrations
pnpm --filter @kitchenxpert/backend prisma:migrate:deploy

# Seed initial (optionnel)
pnpm --filter @kitchenxpert/backend db:seed
```

---

## Déploiement du Backend

### Option A: Docker

```dockerfile
# Dockerfile.backend
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/backend ./packages/backend
COPY packages/common ./packages/common

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @kitchenxpert/backend...

# Build
RUN pnpm --filter @kitchenxpert/backend build

# Start
WORKDIR /app/packages/backend
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

```bash
# Build et run
docker build -f Dockerfile.backend -t kitchenxpert-backend .
docker run -p 4000:4000 --env-file .env.production kitchenxpert-backend
```

### Option B: PM2 (VPS)

```bash
# Installation
pnpm install
pnpm --filter @kitchenxpert/backend build

# Démarrer avec PM2
cd packages/backend
pm2 start dist/index.js --name kitchenxpert-api -i max
pm2 save
```

### Option C: Railway / Render

1. Connecter le repository GitHub
2. Définir le root directory: `packages/backend`
3. Build command: `pnpm install && pnpm build`
4. Start command: `node dist/index.js`
5. Ajouter les variables d'environnement

---

## Déploiement du Frontend

### Build de production

```bash
pnpm --filter @kitchenxpert/frontend build
```

### Option A: Vercel (Recommandé)

1. Connecter le repository
2. Framework preset: Vite
3. Root directory: `packages/frontend`
4. Build command: `pnpm build`
5. Output directory: `dist`
6. Variables d'environnement:
   - `VITE_API_URL=https://api.votre-domaine.com`

### Option B: Cloudflare Pages

```bash
# Build
pnpm --filter @kitchenxpert/frontend build

# Deploy
npx wrangler pages deploy packages/frontend/dist
```

### Option C: Nginx (VPS)

```nginx
server {
    listen 80;
    server_name kitchenxpert.com;
    root /var/www/kitchenxpert/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Déploiement du Partner Portal

Même procédure que le frontend avec :

- Root directory: `packages/partner-portal`
- URL: `https://partner.votre-domaine.com`
- Variable: `VITE_API_URL=https://api.votre-domaine.com`

---

## Déploiement des AI Modules

### Prérequis Python

```bash
cd packages/ai-modules

# Créer l'environnement virtuel
python -m venv venv

# Activer (Linux/Mac)
source venv/bin/activate

# Activer (Windows)
venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt
```

### Option A: Docker

```dockerfile
# Dockerfile.ai-modules
FROM python:3.11-slim

WORKDIR /app

COPY packages/ai-modules/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/ai-modules/src ./src

EXPOSE 5000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5000"]
```

### Option B: Systemd (VPS)

```ini
# /etc/systemd/system/kitchenxpert-ai.service
[Unit]
Description=KitchenXpert AI Modules
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/kitchenxpert/packages/ai-modules
Environment="PATH=/var/www/kitchenxpert/packages/ai-modules/venv/bin"
ExecStart=/var/www/kitchenxpert/packages/ai-modules/venv/bin/uvicorn src.main:app --host 0.0.0.0 --port 5000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable kitchenxpert-ai
sudo systemctl start kitchenxpert-ai
```

---

## Configuration des services externes

### Stripe

1. Créer un compte sur [stripe.com](https://stripe.com)
2. Récupérer les clés API (Dashboard > Developers > API Keys)
3. Configurer le webhook:
   - URL: `https://api.votre-domaine.com/api/payments/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.failed`,
     `customer.subscription.*`
4. Récupérer le webhook secret

### AWS S3

1. Créer un bucket S3
2. Configurer les CORS:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://votre-domaine.com"],
    "ExposeHeaders": ["ETag"]
  }
]
```

3. Créer un utilisateur IAM avec les permissions S3
4. Récupérer les access keys

### SendGrid (Email)

1. Créer un compte sur [sendgrid.com](https://sendgrid.com)
2. Créer une API Key (Settings > API Keys)
3. Vérifier votre domaine (Settings > Sender Authentication)

---

## Monitoring et maintenance

### Logs

```bash
# Backend (PM2)
pm2 logs kitchenxpert-api

# AI Modules (systemd)
journalctl -u kitchenxpert-ai -f
```

### Health checks

- Backend: `GET https://api.votre-domaine.com/api/health`
- AI Modules: `GET https://ai.votre-domaine.com/api/health`

### Sentry (Error tracking)

1. Créer un projet sur [sentry.io](https://sentry.io)
2. Récupérer le DSN
3. Ajouter `SENTRY_DSN` aux variables d'environnement

### Backups

```bash
# Backup PostgreSQL
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restauration
psql $DATABASE_URL < backup_20240115.sql
```

---

## Checklist de déploiement

### Avant le déploiement

- [ ] Toutes les variables d'environnement sont configurées
- [ ] Les secrets sont générés de façon sécurisée (64+ caractères)
- [ ] SSL/TLS est activé pour la base de données
- [ ] Les domaines sont configurés (DNS)
- [ ] Les certificats SSL sont en place

### Déploiement

- [ ] Base de données migrée
- [ ] Backend déployé et accessible
- [ ] Frontend déployé
- [ ] Partner Portal déployé
- [ ] AI Modules déployés
- [ ] Webhook Stripe configuré

### Post-déploiement

- [ ] Tests de smoke (login, création de projet, paiement test)
- [ ] Monitoring configuré (Sentry, logs)
- [ ] Backups automatiques configurés
- [ ] Rate limiting vérifié
- [ ] CORS vérifié (pas de \*)

### Sécurité

- [ ] Headers de sécurité actifs (Helmet)
- [ ] Rate limiting actif
- [ ] CORS restrictif (domaines spécifiques)
- [ ] Pas de secrets dans le code
- [ ] `.env.production` non commité

---

## Support

En cas de problème :

1. Vérifier les logs : `pm2 logs` ou `journalctl`
2. Vérifier les health endpoints
3. Consulter la documentation : `/docs`
4. Ouvrir une issue sur GitHub

---

## Commandes utiles

```bash
# Rebuild complet
pnpm clean:install
pnpm build

# Vérifier les types
pnpm type-check

# Lancer les tests
pnpm test

# Linter
pnpm lint

# Base de données
pnpm --filter @kitchenxpert/backend prisma:studio  # Interface graphique
pnpm --filter @kitchenxpert/backend prisma:migrate:deploy  # Migrations
```
