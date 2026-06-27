# KitchenXpert — Launch Checklist (short list)

> Le ticket d'entrée à la prod. Pour la liste **EXHAUSTIVE** (provider accounts,
> RGPD, RGAA, premium parity, factures, médiation conso…) voir
> [`EVERYTHING-YOU-NEED.md`](EVERYTHING-YOU-NEED.md).
>
> Ce fichier-ci est le **résumé court** : ce qu'il faut absolument avoir pour
> shipper. Pas plus.

**Statut au 2026-05-12 :** code prêt. Tests à 0 failure (387 frontend pass, 1104
backend pass ; debt documentée dans TEST-DEBT.md). Build OK des deux côtés.
Chemin critique restant ≈ **3 jours admin** (cf EVERYTHING-YOU-NEED.md).

---

## ✅ DÉJÀ LIVRÉ (rien à faire)

- [x] Pages légales (Mentions, CGV, Privacy, Cookies, Accessibilité,
      Privacy-settings)
- [x] CookieConsent CNIL-compliant (Refuser tout = Accepter tout)
- [x] RGPD : export Art. 15 + suppression Art. 17 (`/me/gdpr/*`)
- [x] Premium UI dark + Framer Motion + 15 primitives
- [x] Sandbox designer fonctionnel (`/designer/sandbox`) avec canvas Three.js +
      palette + 6 templates
- [x] Migration sandbox → compte (banner dashboard + endpoint
      `POST /projects/import-sandbox`)
- [x] Sécurité backend : CSP strict, HSTS, COEP, COOP, Permissions-Policy
      route-aware
- [x] Rate-limit par surface (catalog, AI auth/anon, auth, password reset, etc.)
- [x] SEO : `<SeoHead>` sur les 9 pages publiques + JSON-LD home + sitemap.xml +
      robots.txt
- [x] Analytics Plausible cookie-gated (no-op tant que script absent)
- [x] E2E : 8 flows critiques + audit a11y axe-core + Lighthouse CI
- [x] Plus de 300 tests unitaires backend + frontend (96 % / 100 % couverture)
- [x] Endpoint dev `auth/dev/verify-email` (E2E débloqué)
- [x] `pnpm.overrides` appliqué (4 critical CVEs résolus)

---

## 🔴 BLOQUANT — à faire AVANT la mise en ligne

### 1. Provisionner les comptes providers UE (≈ 2 h)

Suis l'ordre exact de [docs/PRODUCTION-SETUP.md](docs/PRODUCTION-SETUP.md).
Coche au fur et à mesure :

- [ ] **OVH Public Cloud Databases** (Postgres 16, Gravelines) → `DATABASE_URL`
- [ ] **Upstash** ou **Scaleway Managed Redis** (Frankfurt/Paris) → `REDIS_URL`
      (rediss://)
- [ ] **Scaleway Object Storage** (Paris) → bucket privé + clé API restreinte →
      bloc `S3_*`
- [ ] **Brevo** (transactional email FR) → SMTP_USER + SMTP_PASS + ajoute
      SPF/DKIM/DMARC à ton DNS
- [ ] **Stripe Live mode** → `pk_live_*`, `sk_live_*`, `whsec_*` + créer les 3
      Products + webhook endpoint
- [ ] **Anthropic Console** → API key + signer le DPA
- [ ] **Google AI Studio** → API key (restreindre aux IP prod)
- [ ] **Sentry** → projet + DSN
- [ ] **Plausible** (Cloud €9/mois ou self-host) → site `kitchenxpert.com`

### 2. Générer + injecter les secrets (≈ 15 min)

```bash
bash scripts/generate-secrets.sh | pbcopy   # macOS
# Coller dans ton secret store (Doppler / OVH Vault / Scaleway Secret Manager)
```

- [ ] `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` injectés
- [ ] `DATA_ENCRYPTION_KEY` (hex 32 bytes) **sauvegardé en double**
      (gestionnaire perso + vault équipe)
- [ ] `INTERNAL_API_KEY` injecté
- [ ] `.env.production` JAMAIS committé (juste `.env.production.example`)

### 3. DNS (≈ 30 min + propagation)

Chez ton registrar :

- [ ] A `@`, `www`, `app`, `api` → IP du load balancer
- [ ] CAA `@` → `0 issue "letsencrypt.org"`
- [ ] CNAME×2 + TXT brevo-code (Brevo te les fournit)
- [ ] TXT `@` SPF : `v=spf1 include:spf.brevo.com -all`
- [ ] TXT `_dmarc` :
      `v=DMARC1; p=quarantine; rua=mailto:dmarc@kitchenxpert.com; pct=100; aspf=s; adkim=s`

⚠️ **N'envoie PAS le premier email avant que DKIM soit vert dans Brevo** —
Gmail/Outlook spammeront sinon.

### 4. Polluer le repo de quelques assets manquants (≈ 30 min)

- [ ] **Inter font** : `bash packages/frontend/scripts/fetch-fonts.sh` puis
      `git add packages/frontend/public/fonts/`
- [ ] **OG image JPG 1200×630** : remplacer `public/og/default.svg` par
      `default.jpg` (Facebook strippe le SVG). Suggestion : Canva ou Figma → 5
      min
- [ ] **Apple touch icon** : `public/apple-touch-icon.png` (180×180)
- [ ] **Favicon PWA** : `public/logo-512.png` + `public/logo-192.png`

### 5. Installer les plugins Vite optionnels (≈ 5 min)

```bash
pnpm --filter frontend add -D \
  rollup-plugin-visualizer \
  vite-imagetools \
  vite-plugin-compression2 \
  @axe-core/playwright
```

### 6. Premier déploiement (≈ 30 min)

- [ ] `set -a && source .env.production && set +a`
- [ ] `bash scripts/preflight-check.sh` → **0 ❌ obligatoire**
- [ ] `docker compose -f config/docker/docker-compose.yml -f config/docker/docker-compose.prod.yml --env-file .env.production up -d --build`
- [ ] Migrations DB : `cd packages/backend && pnpm prisma migrate deploy`
- [ ] Verify `curl https://api.kitchenxpert.com/health` → 200

### 7. Smoke-test manuel public (≈ 20 min)

- [ ] `https://kitchenxpert.com/` charge sans console error
- [ ] Inscription → email vérification dans 60 s → login → dashboard
- [ ] Sandbox `https://kitchenxpert.com/designer/sandbox` charge, watermark
      visible, drag fonctionne
- [ ] Stripe : abonnement Premium avec carte test 4000 0027 6000 3184 → 3DS
      challenge → succès
- [ ] Webhook backend logge "subscription.created"
- [ ] `/legal/mentions` ne contient AUCUN `TODO_LAURENT_*` (test CI le vérifie
      déjà)
- [ ] Cookie consent → "Refuser tout" → AUCUN cookie analytics dans
      `document.cookie`

### 8. Submit HSTS preload (irréversible ~1 an)

- [ ] Une fois HTTPS validé partout → soumettre `kitchenxpert.com` à
      https://hstspreload.org/

---

## 🟡 IMPORTANT — à faire dans la semaine post-launch

### Remplir les valeurs légales

- [ ] Éditer
      [`packages/frontend/src/config/legal.ts`](packages/frontend/src/config/legal.ts)
      — chercher tous les `TODO_LAURENT_*` :
  - SIRET, SIREN, RCS city
  - Numéro TVA intracommunautaire
  - Adresse siège social complète
  - Nom du Directeur de la publication
- [ ] Le test CI `legal-no-placeholder.test.tsx` passera au vert quand tout est
      rempli — c'est un gate de déploiement déjà en place.

### Créer les 4 OG images dédiées

Une par page haute valeur (en plus du `default.jpg`) :

- [ ] `public/og/home.jpg`
- [ ] `public/og/pricing.jpg`
- [ ] `public/og/catalog.jpg`
- [ ] `public/og/sandbox.jpg`

### Wire le canvas auth-side dans `useDesignerStore`

Le hook `useDesignerStore` retourne actuellement un placeholder vide pour les
utilisateurs authentifiés. Pour boucler :

- [ ] Lire `packages/frontend/src/hooks/useKitchenEngine.ts` (existant React
      Query)
- [ ] Adapter pour exposer le même `DesignerStoreView` que la branche sandbox
- [ ] ~4 h de travail, documenté dans
      [packages/frontend/src/sandbox/useDesignerStore.ts](packages/frontend/src/sandbox/useDesignerStore.ts)

### Première mesure Lighthouse + correction des écarts

```bash
pnpm --filter frontend build
pnpm --filter frontend preview --port 3005 &
pnpm dlx @lhci/cli@0.13.x autorun --config=packages/frontend/lighthouserc.json
```

- [ ] Scores ≥ 95 partout ? Sinon, voir
      [docs/PERFORMANCE.md](docs/PERFORMANCE.md)
- [ ] Commit `docs/lighthouse-baseline.json`

### Migrer le rate-limit en Redis

Le store mémoire ne tient pas à 2+ containers backend.

- [ ] `pnpm --filter backend add rate-limit-redis ioredis`
- [ ] Pattern documenté dans
      [packages/backend/src/api/middleware/rate-limit-middleware.ts:14-41](packages/backend/src/api/middleware/rate-limit-middleware.ts)

### Sentry source-maps upload

- [ ] `pnpm --filter frontend add -D @sentry/vite-plugin`
- [ ] Configurer auth token dans `.env.production` (`SENTRY_AUTH_TOKEN`)
- [ ] Add plugin to `vite.config.ts` (5 lignes)

---

## 🟢 NICE-TO-HAVE — quand tu auras le temps

- [ ] Hints contextuels sandbox (drag #1 / item #5 / item #10) — l'événement
      `sandbox_first_action` est déjà tracké, reste à brancher un composant
      `<DesignerHint />`
- [ ] Import PDF/DXF dans la sandbox (modal stub déjà en place)
- [ ] Drag-drop direct depuis la palette dans le canvas (actuellement c'est un
      click-pour-ajouter)
- [ ] Gizmos (move/rotate handles) sur l'item sélectionné
- [ ] A/B test du wording du CTA hero (Plausible Experiments)
- [ ] PWA service worker (manifest existe, sw minimal)
- [ ] Internationalisation : aujourd'hui FR-only ; ajouter EN si tu vises
      l'export

---

## Quick reference — où est quoi

| Sujet                             | Doc                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------ |
| **Setup prod step-by-step**       | [docs/PRODUCTION-SETUP.md](docs/PRODUCTION-SETUP.md)                           |
| **Toutes les variables d'env**    | [.env.production.example](.env.production.example)                             |
| **Sécurité (CSP / rate / scans)** | [docs/security-baseline.md](docs/security-baseline.md)                         |
| **Lighthouse / SEO / a11y**       | [docs/PERFORMANCE.md](docs/PERFORMANCE.md)                                     |
| **Sandbox architecture**          | [docs/SANDBOX.md](docs/SANDBOX.md)                                             |
| **E2E / smoke / visual**          | [docs/E2E-TESTING.md](docs/E2E-TESTING.md)                                     |
| **Compliance légale**             | [packages/frontend/src/config/legal.ts](packages/frontend/src/config/legal.ts) |

---

## Résumé : combien de temps pour passer en prod ?

| Tâche                          |     Durée | Fait par        |
| ------------------------------ | --------: | --------------- |
| Provider accounts (1)          |       2 h | Toi             |
| Secrets + DNS (2 + 3)          |    45 min | Toi             |
| Assets manquants (4)           |    30 min | Toi (ou design) |
| Plugins Vite (5)               |     5 min | Toi             |
| Premier deploy + preflight (6) |    30 min | Toi             |
| Smoke test (7)                 |    20 min | Toi             |
| HSTS submit (8)                |     5 min | Toi             |
| **TOTAL**                      | **≈ 4 h** |                 |

Une matinée. C'est tout ce qui te sépare de la mise en ligne.
