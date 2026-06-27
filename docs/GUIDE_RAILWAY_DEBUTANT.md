# 🚂 Guide Railway pour Débutant Total

## C'est quoi Railway ?

Railway c'est comme une maison magique pour ton application sur internet. Tu
mets ton code dedans, et PAF ! Ton site est en ligne pour tout le monde.

---

## 📋 Ce dont tu as besoin AVANT de commencer

1. ✅ Un compte **GitHub** (gratuit) - c'est là où ton code est stocké
2. ✅ Une carte bancaire (Railway demande mais ne prélève presque rien au début)
3. ✅ Ton projet KitchenXpert sur GitHub

---

# 🎯 ÉTAPE 1 : Créer un compte Railway

## 1.1 - Aller sur le site

```
👉 Ouvre ton navigateur (Chrome, Firefox, Edge...)
👉 Tape dans la barre d'adresse : railway.app
👉 Appuie sur Entrée
```

## 1.2 - S'inscrire

```
👉 Clique sur le gros bouton "Start a New Project" ou "Login"
👉 Clique sur "Login with GitHub"
👉 GitHub va te demander d'autoriser Railway → Clique "Authorize"
👉 C'est fait ! Tu as un compte Railway !
```

---

# 🎯 ÉTAPE 2 : Mettre ton code sur GitHub

## Si ton code n'est PAS encore sur GitHub :

### 2.1 - Créer un repository GitHub

```
👉 Va sur github.com
👉 Clique sur le "+" en haut à droite
👉 Clique sur "New repository"
👉 Nom : kitchenxpert
👉 Laisse "Public" coché
👉 Clique "Create repository"
```

### 2.2 - Envoyer ton code

Ouvre un terminal (PowerShell sur Windows) dans ton dossier projet et tape :

```bash
git init
git add .
git commit -m "Premier envoi"
git branch -M main
git remote add origin https://github.com/TON-NOM/kitchenxpert.git
git push -u origin main
```

> Remplace `TON-NOM` par ton nom d'utilisateur GitHub

---

# 🎯 ÉTAPE 3 : Créer la base de données

## 3.1 - Ajouter PostgreSQL

```
👉 Sur Railway, clique sur "New Project"
👉 Clique sur "Provision PostgreSQL"
👉 Attends 30 secondes... ✨ Ta base de données est créée !
```

## 3.2 - Copier l'adresse de la base de données

```
👉 Clique sur le rectangle "PostgreSQL" qui vient d'apparaître
👉 Clique sur l'onglet "Variables"
👉 Trouve "DATABASE_URL"
👉 Clique sur l'icône 📋 pour copier
👉 Garde ça quelque part (bloc-notes), tu en auras besoin !
```

Ça ressemble à ça :

```
postgresql://postgres:ABC123xyz@containers-us-west-123.railway.app:5432/railway
```

---

# 🎯 ÉTAPE 4 : Ajouter Redis (le cache)

```
👉 Dans ton projet Railway, clique sur "+ New"
👉 Clique sur "Database"
👉 Clique sur "Add Redis"
👉 Attends 30 secondes... ✨ Redis est créé !
```

## Copier l'adresse Redis

```
👉 Clique sur le rectangle "Redis"
👉 Clique sur l'onglet "Variables"
👉 Trouve "REDIS_URL"
👉 Clique sur 📋 pour copier
👉 Garde ça aussi !
```

---

# 🎯 ÉTAPE 5 : Déployer le Backend (le cerveau)

## 5.1 - Ajouter le service backend

```
👉 Clique sur "+ New"
👉 Clique sur "GitHub Repo"
👉 Cherche "kitchenxpert" dans la liste
👉 Clique dessus
```

## 5.2 - Configurer le backend

```
👉 Clique sur le nouveau rectangle qui est apparu
👉 Clique sur "Settings"
👉 Dans "Root Directory", tape : packages/backend
👉 Dans "Build Command", tape : pnpm install && pnpm build
👉 Dans "Start Command", tape : node dist/index.js
```

## 5.3 - Ajouter les variables secrètes

```
👉 Clique sur l'onglet "Variables"
👉 Clique sur "New Variable"
```

Ajoute ces variables UNE PAR UNE (clique "Add" après chaque) :

| Variable             | Valeur                                     |
| -------------------- | ------------------------------------------ |
| `NODE_ENV`           | `production`                               |
| `PORT`               | `4000`                                     |
| `DATABASE_URL`       | (colle celle que tu as copiée à l'étape 3) |
| `REDIS_URL`          | (colle celle que tu as copiée à l'étape 4) |
| `JWT_ACCESS_SECRET`  | (voir ci-dessous comment créer)            |
| `JWT_REFRESH_SECRET` | (voir ci-dessous comment créer)            |
| `JWT_ACCESS_EXPIRY`  | `15m`                                      |
| `JWT_REFRESH_EXPIRY` | `7d`                                       |
| `CORS_ORIGINS`       | `https://ton-frontend.railway.app`         |
| `BCRYPT_ROUNDS`      | `12`                                       |

### 🔐 Comment créer les secrets JWT ?

Ouvre ce site : https://generate-secret.vercel.app/64

```
👉 Copie le texte généré
👉 Colle-le dans JWT_ACCESS_SECRET
👉 Rafraîchis la page pour un nouveau secret
👉 Colle-le dans JWT_REFRESH_SECRET
```

## 5.4 - Déployer !

```
👉 Railway va automatiquement construire et déployer
👉 Attends 2-3 minutes
👉 Tu verras "Success" en vert ✅
```

## 5.5 - Obtenir l'adresse du backend

```
👉 Clique sur "Settings"
👉 Dans "Networking", clique sur "Generate Domain"
👉 Tu obtiens une adresse comme : kitchenxpert-backend-production.up.railway.app
👉 NOTE CETTE ADRESSE ! 📝
```

---

# 🎯 ÉTAPE 6 : Déployer le Frontend (ce que les gens voient)

## 6.1 - Ajouter le service frontend

```
👉 Clique sur "+ New"
👉 Clique sur "GitHub Repo"
👉 Choisis encore "kitchenxpert"
```

## 6.2 - Configurer le frontend

```
👉 Clique sur le nouveau rectangle
👉 Clique sur "Settings"
👉 Root Directory : packages/frontend
👉 Build Command : pnpm install && pnpm build
👉 Start Command : npx serve dist -s -l 3000
```

## 6.3 - Ajouter les variables

```
👉 Onglet "Variables"
👉 Ajoute :
```

| Variable       | Valeur                               |
| -------------- | ------------------------------------ |
| `VITE_API_URL` | `https://TON-BACKEND.up.railway.app` |

> Remplace `TON-BACKEND` par l'adresse que tu as notée à l'étape 5.5

## 6.4 - Générer le domaine

```
👉 Settings → Networking → Generate Domain
👉 Tu obtiens : kitchenxpert-frontend-production.up.railway.app
```

---

# 🎯 ÉTAPE 7 : Initialiser la base de données

## 7.1 - Ouvrir le terminal Railway

```
👉 Clique sur ton service Backend
👉 Clique sur l'onglet "Settings"
👉 Tout en bas, clique sur "Railway Shell"
```

## 7.2 - Lancer les migrations

Dans le terminal qui s'ouvre, tape :

```bash
npx prisma migrate deploy --schema=src/database/prisma/schema.prisma
```

```
👉 Appuie sur Entrée
👉 Attends que ça finisse (30 secondes environ)
👉 Tu dois voir "All migrations applied successfully"
```

---

# 🎯 ÉTAPE 8 : Tester !

## 8.1 - Tester le backend

```
👉 Ouvre un nouvel onglet dans ton navigateur
👉 Tape : https://TON-BACKEND.up.railway.app/api/health
👉 Tu dois voir : {"status":"ok"} ou quelque chose de similaire
```

## 8.2 - Tester le frontend

```
👉 Ouvre : https://TON-FRONTEND.up.railway.app
👉 Tu dois voir la page d'accueil de KitchenXpert ! 🎉
```

---

# 🎯 ÉTAPE 9 : Ajouter Stripe (paiements) - OPTIONNEL

## 9.1 - Créer un compte Stripe

```
👉 Va sur stripe.com
👉 Clique "Start now"
👉 Crée ton compte
```

## 9.2 - Récupérer les clés

```
👉 Dans Stripe, va dans "Developers" (menu de gauche)
👉 Clique sur "API Keys"
👉 Copie "Secret key" (commence par sk_live_ ou sk_test_)
```

## 9.3 - Ajouter à Railway

```
👉 Retourne sur Railway
👉 Clique sur ton Backend
👉 Variables → New Variable
👉 STRIPE_SECRET_KEY = (colle ta clé)
```

---

# 🎯 ÉTAPE 10 : Ajouter le stockage S3 - OPTIONNEL

Pour les images et fichiers, tu peux utiliser **Cloudflare R2** (gratuit jusqu'à
10 Go).

## 10.1 - Créer un compte Cloudflare

```
👉 Va sur cloudflare.com
👉 Crée un compte gratuit
👉 Dans le menu, clique sur "R2"
👉 Clique "Create bucket"
👉 Nom : kitchenxpert-uploads
```

## 10.2 - Créer les clés d'accès

```
👉 Dans R2, clique "Manage R2 API Tokens"
👉 Clique "Create API token"
👉 Permissions : "Object Read & Write"
👉 Copie Access Key ID et Secret Access Key
```

## 10.3 - Ajouter à Railway

Dans les variables du Backend, ajoute :

| Variable                | Valeur                 |
| ----------------------- | ---------------------- |
| `AWS_ACCESS_KEY_ID`     | (ta clé)               |
| `AWS_SECRET_ACCESS_KEY` | (ton secret)           |
| `AWS_S3_BUCKET`         | `kitchenxpert-uploads` |
| `AWS_REGION`            | `auto`                 |

---

# ✅ RÉCAPITULATIF

À la fin, tu dois avoir dans Railway :

```
📦 Ton Projet Railway
├── 🐘 PostgreSQL (base de données)
├── 🔴 Redis (cache)
├── ⚙️ Backend (packages/backend)
└── 🖥️ Frontend (packages/frontend)
```

Et ces URLs qui marchent :

- Frontend : `https://xxx-frontend.up.railway.app` ← Les gens vont ici
- Backend : `https://xxx-backend.up.railway.app` ← L'API

---

# 🆘 PROBLÈMES FRÉQUENTS

## "Build failed"

```
👉 Clique sur "View Logs"
👉 Regarde l'erreur en rouge
👉 Souvent c'est une variable manquante
```

## "Cannot connect to database"

```
👉 Vérifie que DATABASE_URL est bien copiée
👉 Elle doit commencer par postgresql://
```

## "CORS error" dans le navigateur

```
👉 Vérifie CORS_ORIGINS dans le backend
👉 Mets l'URL exacte de ton frontend
```

## Le site affiche une page blanche

```
👉 Ouvre les DevTools (F12)
👉 Onglet Console
👉 Regarde les erreurs en rouge
```

---

# 💰 COMBIEN ÇA COÛTE ?

Railway offre **5$ gratuits par mois**.

Ensuite :

- PostgreSQL : ~5$/mois
- Redis : ~5$/mois
- Backend : ~5$/mois
- Frontend : ~5$/mois

**Total : environ 15-20$/mois** pour un petit projet

---

# 🎉 BRAVO !

Si tu es arrivé jusqu'ici, ton application KitchenXpert est EN LIGNE sur
Internet !

Tu peux partager l'adresse de ton frontend avec n'importe qui dans le monde et
ils pourront l'utiliser.

---

# 📞 BESOIN D'AIDE ?

1. Documentation Railway : docs.railway.app
2. Discord Railway : discord.gg/railway (communauté très sympa)
3. GitHub Issues de ton projet
