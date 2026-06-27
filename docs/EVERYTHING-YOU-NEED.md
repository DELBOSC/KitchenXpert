# KitchenXpert — Everything You Need to Ship

**Updated 2026-05-12.** Exhaustive list of every piece of information, account,
asset and decision required for KitchenXpert to launch as a premium-grade French
SaaS — legally compliant, RGPD-clean, with the same polish as Notion / Linear /
Coohom.

> **Total realistic effort to fill everything : ~3 working days** (1 day of
> admin paperwork, 1 day of provider account creation, 1 day of asset
> production + smoke testing). Not coding work — admin work that only you can
> do.

---

## Table of Contents

1. [Legal entity & identity](#1-legal-entity--identity)
2. [Provider accounts (EU-resident)](#2-provider-accounts-eu-resident)
3. [Secrets to generate](#3-secrets-to-generate)
4. [Payment & invoicing](#4-payment--invoicing)
5. [Email & deliverability](#5-email--deliverability)
6. [AI provider keys](#6-ai-provider-keys)
7. [Domain, DNS & TLS](#7-domain-dns--tls)
8. [RGPD compliance package](#8-rgpd-compliance-package)
9. [Legal pages content](#9-legal-pages-content)
10. [Brand & marketing assets](#10-brand--marketing-assets)
11. [Reviews & social proof](#11-reviews--social-proof)
12. [SEO & content](#12-seo--content)
13. [Monitoring & ops](#13-monitoring--ops)
14. [Premium-website parity](#14-premium-website-parity)
15. [Deploy sequence](#15-deploy-sequence)

---

## 1. Legal entity & identity

The single point of failure for legal launch. **Edit
`packages/frontend/src/config/legal.ts`** and replace every
`EXAMPLE_REPLACE_ME_*` value with your real Kbis data.

| Field                                       | Where to get it                                   | Mandatory under                          |
| ------------------------------------------- | ------------------------------------------------- | ---------------------------------------- |
| **Société (raison sociale)**                | Kbis — INSEE official name                        | LCEN Art. 6-III                          |
| **Forme juridique** (SAS, SARL…)            | Kbis                                              | LCEN Art. 6-III                          |
| **Capital social**                          | Kbis                                              | LCEN Art. 6-III (for SAS/SARL)           |
| **SIREN** (9 chiffres)                      | infogreffe.fr                                     | LCEN Art. 6-III                          |
| **SIRET** du siège (14 chiffres)            | infogreffe.fr                                     | LCEN Art. 6-III                          |
| **Ville du RCS**                            | Kbis (Greffe d'immatriculation)                   | LCEN Art. 6-III                          |
| **N° TVA intracommunautaire**               | `FR{clé}{SIREN}` — calculé sur europa.eu/taxation | Art. 286 ter CGI                         |
| **Adresse siège social** (rue + CP + ville) | Kbis                                              | LCEN Art. 6-III                          |
| **Email de contact**                        | Choisi par toi (déjà `contact@kitchenxpert.com`)  | LCEN Art. 6-III                          |
| **Téléphone** (optionnel mais conseillé)    | Ligne pro                                         | –                                        |
| **Directeur de la publication**             | Toi (Président SAS)                               | LCEN Art. 6-III + Loi 1881 sur la presse |
| **Email DPO**                               | `dpo@kitchenxpert.com` ou DPO externe mandaté     | RGPD Art. 37–39                          |

**Validation finale** : `pnpm --filter frontend test legal-no-placeholder` doit
passer ET `assertProductionReady()` (dans `legal.ts`) ne doit plus throw.

---

## 2. Provider accounts (EU-resident)

Tous tes sous-traitants doivent être listés sur la page Privacy. Tu les a
déclarés là — il reste à OUVRIR les comptes et configurer.

| Service                            | Pour quoi                           | Tier free / payant                      | Région                              |
| ---------------------------------- | ----------------------------------- | --------------------------------------- | ----------------------------------- |
| **OVHcloud** ou **Scaleway**       | PostgreSQL managé                   | OVH Essential 4 GB ≈ 30 €/mois          | Gravelines / Paris                  |
| **Upstash** ou **Scaleway**        | Redis (cache + rate-limit + BullMQ) | Upstash Free 10k requests/jour          | Dublin / Paris                      |
| **Scaleway Object Storage**        | S3 (uploads, hero video, OG images) | 75 Go gratuit/mois                      | Paris                               |
| **Brevo** (ex-Sendinblue)          | SMTP transactionnel                 | 300 emails/jour free                    | Paris (FR)                          |
| **Stripe** (Live mode activé)      | Paiements abonnements               | Free, % par transaction                 | Dublin (Stripe Payments Europe Ltd) |
| **Sentry**                         | Monitoring erreurs prod             | 5k events/mois free                     | UE option payante                   |
| **Plausible** (Cloud ou self-host) | Analytics RGPD-friendly             | 9 €/mois (Cloud) ou self-hosted gratuit | UE                                  |
| **Anthropic** (Claude API)         | IA conversationnelle                | Pay-per-use                             | US — DPA signé requis               |
| **Google AI Studio** (Gemini)      | Vision + image gen                  | Pay-per-use                             | US — SCC 2021/914 requis            |
| **Tolgee** (optionnel)             | Translation Management System       | Free 1k clés                            | UE                                  |

---

## 3. Secrets to generate

```bash
bash scripts/generate-secrets.sh | pbcopy   # macOS
# OU
bash scripts/generate-secrets.sh            # puis copier manuellement
```

Le script génère :

| Secret                 | Format                   | Rotation                  | Risque si perdu                           |
| ---------------------- | ------------------------ | ------------------------- | ----------------------------------------- |
| `JWT_ACCESS_SECRET`    | base64 ≥ 64 B            | 90 j                      | tous tokens 15 min invalides              |
| `JWT_REFRESH_SECRET`   | base64 ≥ 64 B (≠ access) | 90 j                      | tous refresh tokens invalides             |
| `DATA_ENCRYPTION_KEY`  | hex 32 B (64 chars)      | **JAMAIS** sans migration | **données chiffrées illisibles à jamais** |
| `INTERNAL_API_KEY`     | base64 ≥ 32 B            | 90 j                      | crons cassés                              |
| `CSRF_SECRET`          | base64 ≥ 48 B            | 90 j                      | sessions invalides                        |
| `SESSION_SECRET`       | base64 ≥ 48 B            | 90 j                      | sessions invalides                        |
| `SCRAPER_BRIDGE_TOKEN` | base64 ≥ 48 B            | 90 j                      | sync providers cassée                     |

**Stockage** : Doppler, OVH Vault Manager, Scaleway Secret Manager OU sops + age
key. **JAMAIS committer**. La `DATA_ENCRYPTION_KEY` doit être sauvegardée **2
fois** (gestionnaire de mots de passe perso + coffre équipe). Si tu la perds :
toutes les clés API tierces stockées en base sont **définitivement** illisibles.

---

## 4. Payment & invoicing

### Stripe (Live mode)

- [ ] Toggle **Live mode** dans le dashboard Stripe
- [ ] **Compte activé** par Stripe Compliance (IBAN + carte d'identité validés)
- [ ] **3 Products** créés (noms doivent matcher `pricingTiers` dans `legal.ts`)
      :
  - Découverte — 0 €/mois
  - Premium — 14,90 €/mois → `STRIPE_PRICE_PREMIUM`
  - Studio — 49 €/mois → `STRIPE_PRICE_STUDIO`
- [ ] **Webhook endpoint** :
      `https://api.kitchenxpert.com/api/v1/payments/webhook`
- [ ] **Events souscrits** :
  - `checkout.session.completed`
  - `customer.subscription.created` / `.updated` / `.deleted`
  - `invoice.payment_succeeded` / `.payment_failed`
- [ ] **Radar for Fraud Teams** activé
- [ ] **3D Secure** = "when required by SCA" (obligatoire DSP2)
- [ ] Récupère : `STRIPE_PUBLIC_KEY` (`pk_live_…`), `STRIPE_SECRET_KEY`
      (`sk_live_…`), `STRIPE_WEBHOOK_SECRET` (`whsec_…`)

### Facturation française

- [ ] **Mentions obligatoires sur factures** (Art. L441-9 C. commerce) :
      Société, SIRET, SIREN, TVA intra, capital, adresse, date, n°, désignation
- [ ] **Conservation 10 ans** des factures clients
- [ ] **Logiciel certifié** anti-fraude (Art. 88 LF 2016) — Stripe Invoicing est
      conforme ; vérifier l'attestation

### Médiation consommation (obligation)

- [ ] **CMAP** déjà déclaré dans `legal.ts` (CGV Art. 11). Inscription gratuite
      pour particuliers ; signe la convention sur `cmap.fr` (~30 min)

---

## 5. Email & deliverability

### Brevo / Mailjet / SendGrid EU

- [ ] Compte créé, **domaine kitchenxpert.com authentifié** (CNAME + TXT)
- [ ] **SMTP key** copiée → `SMTP_USER` + `SMTP_PASS`

### DNS pour la délivrabilité

À l'registrar du domaine (OVH, Gandi, Cloudflare) :

```dns
; SPF — autorise Brevo à envoyer pour kitchenxpert.com
@        IN TXT  "v=spf1 include:spf.brevo.com -all"

; DKIM — récupérer les 2 CNAME que Brevo te donne
mail._domainkey       IN CNAME mail.dkim.brevo.com.
mail2._domainkey      IN CNAME mail2.dkim.brevo.com.

; DMARC — politique stricte
_dmarc   IN TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@kitchenxpert.com; pct=100; aspf=s; adkim=s"
```

- [ ] **Attendre que DKIM passe vert** dans Brevo (5-30 min de propagation)
- [ ] **Test délivrabilité** avec mail-tester.com → score ≥ 9/10
- [ ] **Templates HTML** à créer dans Brevo :
  - `verify-email` (vérification email)
  - `reset-password` (reset mot de passe)
  - `welcome` (bienvenue J+0)
  - `review-request` (J+14 demande d'avis)
  - `payment-receipt` (reçu paiement)
  - `subscription-cancelled` (résiliation)

---

## 6. AI provider keys

### Anthropic

- [ ] Compte créé sur `console.anthropic.com`
- [ ] **API key** générée → `ANTHROPIC_API_KEY`
- [ ] **DPA signé** (lien dans le dashboard) — **OBLIGATOIRE pour processsing
      UE**
- [ ] Sub-processor déclaré sur la page Privacy (déjà dans `legal.ts`)
- [ ] **Limite mensuelle** définie dans le dashboard ($100/mois conseillé pour
      démarrer)

### Google AI Studio (Gemini)

- [ ] Compte créé sur `aistudio.google.com`
- [ ] **API key** générée → `GOOGLE_GENAI_API_KEY`
- [ ] **Restrictions IP** activées dans Google Cloud Console (limiter aux IP de
      prod)
- [ ] **SCC 2021/914** acceptés (clauses contractuelles types — déclarées dans
      `legal.ts`)
- [ ] Quota Gemini Flash Image vérifié (rate limits par minute)

### Coûts AI estimés (cf docs/AI-FEATURES.md)

- Sandbox : $0.03/visiteur/mois (cap $0.20)
- Free tier : $0.40/user/mois (cap $1)
- Premium : $1.80/user/mois (cap $20)
- Studio : $8/user/mois (illimité)

---

## 7. Domain, DNS & TLS

### Records DNS obligatoires

```dns
A     @           <IP load balancer>
A     www         <IP load balancer>
A     app         <IP load balancer>
A     api         <IP load balancer>
CAA   @           0 issue "letsencrypt.org"
TXT   @           "v=spf1 include:spf.brevo.com -all"
TXT   _dmarc      "v=DMARC1; p=quarantine; rua=mailto:dmarc@kitchenxpert.com; pct=100; aspf=s; adkim=s"
CNAME mail._domainkey      mail.dkim.brevo.com.
CNAME mail2._domainkey     mail2.dkim.brevo.com.
```

### TLS / HTTPS

- [ ] **Caddy** ou **Traefik** front (auto Let's Encrypt) installé
- [ ] HTTP → HTTPS redirect global
- [ ] HSTS header `max-age=63072000; includeSubDomains; preload`
- [ ] Soumission **HSTS preload list** : <https://hstspreload.org> (irréversible
      ~1 an, faire APRÈS validation HTTPS partout)

### Sous-domaines optionnels

- `cdn.kitchenxpert.com` → CloudFront/Bunny pour assets statiques
- `status.kitchenxpert.com` → Better Stack ou self-hosted Statping

---

## 8. RGPD compliance package

### CNIL — déclarations obligatoires

- [ ] **Registre des traitements** rédigé (Art. 30 RGPD) — modèle dispo sur
      cnil.fr
- [ ] **PIA / DPIA** si traitement à risque (Art. 35) — non applicable pour
      KitchenXpert standard
- [ ] **Désignation DPO** : Toi (interne) OU prestataire externe agréé. Si
      interne, formation 5 jours via Bensoussan/Lexing recommandée
- [ ] **Notification CNIL du DPO** (formulaire en ligne) si désigné

### Droits utilisateurs (déjà câblés)

- [x] **Droit d'accès Art. 15** → `GET /me/gdpr/export`
- [x] **Droit à l'effacement Art. 17** → `DELETE /me/gdpr/account`
- [x] **Droit à la portabilité Art. 20** → export JSON identique à Art. 15
- [x] **Droit d'opposition Art. 21** → toggle cookies + désabonnement emails
- [x] **Information transparente Art. 12-14** → page Privacy + bandeau cookies

### Sous-traitants

- [x] Liste publique sur `/legal/privacy` (synchronisée avec
      `legal.ts > subProcessors`)
- [ ] **DPA bilatéral signé** avec chaque sous-traitant **hors UE** :
  - Anthropic (US) — DPA en ligne
  - Google (Gemini, US) — SCC 2021/914
  - Sentry (US) — DPA en ligne
- [ ] **DPA contractuel** avec chaque sous-traitant UE :
  - OVH / Scaleway / Upstash (auto-acceptés via CGS)

### Cookies — bandeau CNIL-compliant

- [x] **CookieConsent** component déjà conforme : "Refuser tout" aussi visible
      que "Accepter tout"
- [x] **Aucun cookie tiers** posé avant consentement
- [x] **Plausible** chargé uniquement après consentement analytics
- [x] **Cookies essentiels** documentés dans `/legal/cookies`

### Conservation des données

- [x] Inactivité **2 ans** → email d'avertissement + suppression J+30 si
      non-action (à câbler via cron)
- [ ] Factures conservées **10 ans** (obligation fiscale)
- [ ] Logs accès conservés **12 mois max** (recommandation CNIL)
- [ ] Cookies non-essentiels **13 mois max** (lignes directrices CNIL 2020)

### Accessibilité (RGAA)

- [x] Déclaration d'accessibilité publiée sur `/legal/accessibilite`
- [ ] **Audit RGAA 4.1.2** par tiers (~2 500 €) si tu vises B2B/marchés publics
- [ ] Pour grand public B2C : auto-déclaration suffit, score axe-core ≥ 95
      conseillé

---

## 9. Legal pages content

Toutes les pages existent (`/legal/*`). Il reste à **valider le contenu** avant
publication :

| Page                      | Statut     | Action restante                                           |
| ------------------------- | ---------- | --------------------------------------------------------- |
| `/legal/mentions`         | ✅ rédigée | Remplir `legal.ts` (SIRET, etc.)                          |
| `/legal/cgv`              | ✅ rédigée | **Faire relire par un avocat** (CMAP médiateur déjà cité) |
| `/legal/privacy`          | ✅ rédigée | Vérifier liste sub-processors                             |
| `/legal/cookies`          | ✅ rédigée | Synchroniser avec consent v1 réel                         |
| `/legal/accessibilite`    | ✅ rédigée | Mettre à jour le % conformité après audit axe             |
| `/legal/privacy-settings` | ✅ câblée  | Test E2E : export + delete fonctionnent                   |

**CGV — points juridiques à valider avec ton avocat :**

- Droit de rétractation 14 j (art. L221-18 C. conso) — applicable au SaaS ?
- Médiation CMAP — convention signée ?
- Clause limitation de responsabilité — plafonnée par ton plan d'assurance pro
- RGPD Art. 28 sub-processing — clauses miroirs avec tes propres sous-traitants

---

## 10. Brand & marketing assets

| Asset                                | Format                                       | Statut                                 |
| ------------------------------------ | -------------------------------------------- | -------------------------------------- |
| **Logo** SVG + PNG 512×512           | `/public/logo-512.png`                       | ❌ à créer                             |
| **Logo** PNG 192×192 (PWA)           | `/public/logo-192.png`                       | ❌ à créer                             |
| **Favicon** SVG                      | `/public/favicon.svg`                        | ✅ existe                              |
| **Apple touch icon** 180×180         | `/public/apple-touch-icon.png`               | ❌ à créer                             |
| **OG image par défaut** 1200×630 JPG | `/public/og/default.jpg`                     | ❌ à créer (SVG fallback ok pour dev)  |
| **OG home** 1200×630                 | `/public/og/home.jpg`                        | ❌                                     |
| **OG pricing** 1200×630              | `/public/og/pricing.jpg`                     | ❌                                     |
| **OG catalog** 1200×630              | `/public/og/catalog.jpg`                     | ❌                                     |
| **OG sandbox** 1200×630              | `/public/og/sandbox.jpg`                     | ❌                                     |
| **Hero video** 30 s WebM + MP4       | `/public/hero/hero-*.{webm,mp4}`             | ❌ à shooter (cf `docs/HERO-VIDEO.md`) |
| **Hero poster** JPG 1280×800         | `/public/hero/hero-poster.jpg`               | SVG fallback OK                        |
| **Photos templates sandbox** ×6      | `/public/templates/{l-small,u-medium,…}.jpg` | ❌ à shooter                           |
| **Photo fondateur** carrée 800×800   | `/public/team/laurent.jpg`                   | ❌ pour about / press kit              |
| **Press kit ZIP**                    | `/public/press-kit.zip`                      | ❌ logos + bios + screenshots          |

### Fonts

- [ ] `bash packages/frontend/scripts/fetch-fonts.sh` → télécharge Inter
      variable
- [ ] `git add packages/frontend/public/fonts/inter-var-latin.woff2`

### Logos partenaires (LogoStrip)

Actuellement noms textuels (légalement safe). Pour passer aux vrais logos
officiels :

- [ ] Récupérer **press-kits officiels** IKEA / Schmidt / Bosch / Leroy Merlin /
      Castorama
- [ ] Vérifier les **conditions d'usage** de chaque (généralement "promotion
      compatibilité OK")
- [ ] SVG monochrome dans `/public/brands/`
- [ ] Mettre à jour `LogoStrip.tsx > BRANDS[].logoUrl`

---

## 11. Reviews & social proof

### Comptes business à ouvrir (semaines 1-3)

| Plateforme                              | Difficulté | Délai                        | Coût            |
| --------------------------------------- | ---------- | ---------------------------- | --------------- |
| **Trustpilot business**                 | ⭐         | 30 min                       | Gratuit         |
| **Google Business Profile**             | ⭐         | 5-14 j (vérif carte postale) | Gratuit         |
| **Capterra**                            | ⭐⭐       | 2-4 sem. validation          | Gratuit profile |
| **G2**                                  | ⭐⭐⭐     | 3-6 sem. validation          | Gratuit profile |
| **Avis Vérifiés** (optionnel, badge NF) | ⭐⭐       | 1 sem.                       | ~80 €/mois      |

Détails complets : `docs/REVIEWS-PLAYBOOK.md`.

### Avant la 1re vraie review

- [ ] **NE PAS** inventer de témoignages
- [ ] `STATIC_REVIEWS` dans `reviews-data.ts` reste vide → le composant affiche
      le placeholder "Lancement 2026"
- [ ] Schema.org AggregateRating ne se génère QUE si ≥ 1 review réelle

### Workflow technique (déjà câblé)

- [x] Modèles Prisma `ReviewRequest` + `InternalFeedback` + migration SQL
- [x] Service backend `review-request.service.ts` (cooldown 90 j)
- [x] Routes `/me/reviews/{pending,respond,dismiss}`
- [x] Modal `ReviewPromptModal` monté dans `App.tsx`
- [ ] **Câbler `sendReviewRequestEmail()`** dans `mail.service.ts` (template
      Brevo)
- [ ] **Cron daily** `jobs/review-request-cron.ts` (à écrire)

---

## 12. SEO & content

### Search Console

- [ ] Domaine `kitchenxpert.com` ajouté + vérifié (TXT record)
- [ ] Sitemap soumis : `https://kitchenxpert.com/sitemap.xml`
- [ ] **Propriété séparée** pour `kitchenxpert.com/en/` une fois EN activé

### Sitemap multi-langue

- [x] `scripts/generate-sitemap.mjs` génère 15+ URLs FR
- [ ] À enrichir pour les 50 articles `/guides/*` (cf
      `docs/CONTENT-WORKFLOW.md`)
- [ ] Hreflang automatique via `<SeoHead>`

### Robots.txt

- [x] `Allow: /` + `Disallow: /api/, /dashboard, /admin/*, /partner/*`
- [x] Bloque GPTBot, ClaudeBot, Google-Extended (opt-out IA training)

### 50 articles éditoriaux (cf `docs/CONTENT-WORKFLOW.md`)

- [x] Architecture Astro `packages/guides/` prête
- [x] 6 collections Zod-typées + 50 slugs déclarés dans `article-manifest.ts`
- [x] 3 articles exemplaires écrits (cuisine-en-l, ikea-vs-leroy-merlin,
      comment-mesurer-sa-cuisine)
- [ ] **47 articles à écrire** par toi ou un freelance — coût ~2 000 mots × 0,10
      €/mot × 47 = **~9 500 €** OU rédaction interne 4-6 semaines

### Logos médias "Vu sur" (à éviter au lancement)

- [ ] **NE PAS** afficher de logos presse sans articles réels — pratique
      commerciale trompeuse
- [ ] Quand premières mentions presse arrivent : créer `/presse` avec liens
      sources

---

## 13. Monitoring & ops

### Sentry

- [ ] Projet créé → `SENTRY_DSN`
- [ ] `@sentry/vite-plugin` installé côté frontend pour source-maps
- [ ] **`SENTRY_SEND_DEFAULT_PII=false`** (obligatoire RGPD)
- [ ] Alertes Slack/email pour erreurs `level: error` > 10/heure

### Logs

- [ ] **Rotation logs** configurée (OVH/Scaleway le font automatiquement)
- [ ] **Conservation max 12 mois** (CNIL)
- [ ] Pas de PII dans les logs (vérifier `logger.info` calls)

### Backups

- [ ] **Postgres** : backup auto quotidien (OVH/Scaleway inclus) + restore test
      mensuel
- [ ] **S3 (Object Storage)** : versioning activé + lifecycle 30 j sur
      `snapit-uploads/`
- [ ] **`.env.production`** : copie chiffrée dans le coffre équipe

### Uptime / health

- [ ] **Better Stack** ou **UptimeRobot** (free) → ping
      `https://api.kitchenxpert.com/health` toutes les 5 min
- [ ] Alerte SMS si down > 3 min

---

## 14. Premium-website parity

Ce qui distingue un site "premium" (Linear, Notion, Vercel, Stripe) d'un site
lambda :

### Performance

- [x] Lighthouse Performance ≥ 95 (CI `lighthouse.yml`)
- [x] LCP < 2.5 s, CLS < 0.1, TBT < 200 ms (asserts CI)
- [x] Self-hosted fonts (Inter variable)
- [x] WebP / AVIF images (pipeline Vite imagetools prêt)
- [x] Code-splitting par route + manualChunks (three, framer, vendor isolés)

### Accessibilité

- [x] Lighthouse Accessibility ≥ 95
- [x] Skip link "Aller au contenu"
- [x] `prefers-reduced-motion` respecté
- [x] axe-core en CI sur 8 pages publiques
- [x] Page RGAA `/legal/accessibilite`

### SEO

- [x] `<SeoHead>` per-page (titre, description, OG, Twitter, JSON-LD)
- [x] Sitemap + robots.txt
- [x] Hreflang automatique FR/EN
- [x] Schema.org : Organization + WebSite + SoftwareApplication

### Sécurité

- [x] CSP strict (no unsafe-inline scripts, allowlist explicite)
- [x] HSTS preload-ready
- [x] COEP/COOP/CORP headers
- [x] Permissions-Policy route-aware (camera/mic uniquement /ar /vr)
- [x] Rate limiting par surface (auth, AI, catalog…)
- [x] Bcrypt 12 rounds
- [x] httpOnly cookies + SameSite=Lax + Secure

### UX premium

- [x] Dark mode aurora + Framer Motion (fadeUp, stagger, scaleIn)
- [x] Loading states narrés (4 étapes IA)
- [x] Skeleton shimmers (pas de spinners muets)
- [x] Smooth scroll, focus visible, keyboard nav complet
- [x] Modals avec focus trap + Escape
- [ ] **Animations transitions de page** entre routes (à ajouter via Framer
      Motion `AnimatePresence`)

### Marketing

- [x] Hero video infrastructure (cf `docs/HERO-VIDEO.md`)
- [x] 3 variantes hero A/B testées (HeroA/B/C)
- [x] TrustBar 4 claims (Made in FR, hébergé UE, RGPD, sans inscription)
- [x] TrustStack 8 garanties (sur page Pricing)
- [x] LiveCounter polling 30 s (sur Home)
- [x] ReviewsSection wall + JSON-LD AggregateRating
- [x] Page "Comment ça marche" longue avec 10 features

### Conversion

- [x] Sandbox mode (designer sans inscription) avec watermark + friction
      triggers
- [x] Migration sandbox → compte au signup
- [x] Stripe checkout SCA/DSP2
- [x] Quotas IA par tier
- [x] Marketplace installateurs Qualibat/RGE

### Manque ENCORE pour être au niveau Linear/Notion

- [ ] **Page Status** publique (`status.kitchenxpert.com`) avec health,
      incidents passés, métriques temps réel
- [ ] **Changelog public** (`/changelog`) — nouvelles features chaque vendredi
- [ ] **Blog technique** sur le moteur 3D, l'IA — démontre l'expertise (genre
      Vercel/Linear)
- [ ] **Page Carrières** avec mission, valeurs, ouvertures
- [ ] **Programme d'affiliation / parrainage** (1 mois gratuit par filleul)
- [ ] **API publique** documentée (Swagger UI exposé) — `docs/api/openapi.json`
      à générer
- [ ] **CLI** (`kxc deploy`, `kxc generate`) si tu vises les pros
- [ ] **Mode démo client** : URL partagée en lecture seule (`/p/abc123`)

---

## 15. Deploy sequence

Étape par étape (≈ 4 h une fois les comptes ouverts) :

```bash
# 1. Secrets dans le secret store (Doppler / OVH Vault)
bash scripts/generate-secrets.sh | pbcopy

# 2. Pré-flight check
set -a && source /chemin/.env.production && set +a
bash scripts/preflight-check.sh   # doit afficher 0 ❌

# 3. Migrations DB
cd packages/backend
pnpm prisma migrate deploy --schema=src/database/prisma/schema.prisma

# 4. Build images Docker
docker compose -f config/docker/docker-compose.yml \
               -f config/docker/docker-compose.prod.yml \
               --env-file .env.production \
               build

# 5. Up + smoke
docker compose -f config/docker/docker-compose.yml \
               -f config/docker/docker-compose.prod.yml \
               --env-file .env.production \
               up -d
curl -fsS https://api.kitchenxpert.com/health     # → 200
curl -fsS https://kitchenxpert.com/               # → SPA shell

# 6. Smoke test manuel
#    - Inscription → email vérification arrive < 60 s
#    - Login → /dashboard
#    - /designer/sandbox → designer marche, watermark visible
#    - /pricing → checkout Stripe 3DS avec carte 4000 0027 6000 3184 → succès
#    - Webhook logs "subscription.created"
#    - /legal/mentions → aucun EXAMPLE_REPLACE_ME_ visible
#    - Refuser cookies → aucun cookie analytics dans document.cookie
#    - Sentry → 1 erreur de test capturée

# 7. Soumission HSTS preload (irréversible — après validation totale)
#    https://hstspreload.org → submit kitchenxpert.com
```

---

## Estimation finale

| Item                                 | Effort             | Coût                                            |
| ------------------------------------ | ------------------ | ----------------------------------------------- |
| Remplir `legal.ts` + DPO + médiateur | 2 h                | 0 € (ou ~500 € si avocat relit CGV)             |
| Provider accounts                    | 2 h                | ~50 €/mois total (1er mois free tiers OK)       |
| DNS + DKIM                           | 1 h                | 0 € (registrar inclus)                          |
| Assets (logos, OG, video hero)       | 1 j                | Free si auto OU 500-1500 € si designer/vidéaste |
| Brevo templates                      | 2 h                | 0 € (Brevo free 300/jour)                       |
| Stripe live setup                    | 1 h                | 0 € (% par transaction seulement)               |
| Anthropic + Gemini DPA + setup       | 1 h                | $20-100/mois selon usage                        |
| Sentry + Plausible                   | 30 min             | 9 € + 0 € = 9 €/mois                            |
| CGV relue par avocat                 | 0 (ton temps)      | 200-400 € one-shot                              |
| 47 articles SEO restants             | 4-6 semaines       | 0 € (toi) ou 9 500 € (freelance)                |
| Audit RGAA (optionnel B2C)           | 0                  | 0-2 500 €                                       |
| **TOTAL min (toi seul)**             | **~3 jours admin** | **~150 €/mois infra + ~300 € one-shot avocat**  |
| **TOTAL avec assistance pro**        | 1 semaine          | **~12 000 € one-shot + ~200 €/mois**            |

---

## Tracker

Coche au fur et à mesure. Les `[x]` sont déjà OK côté code.

### Bloquants (avant tout déploiement public)

- [ ] `legal.ts` rempli avec vraies données Kbis
- [ ] DNS + DKIM Brevo verts
- [ ] Stripe Live mode + Products + Webhook
- [ ] Secrets générés + injectés
- [ ] HSTS validé sur dev avant soumission preload
- [ ] Smoke test 7 points OK
- [ ] CGV relue par avocat
- [ ] DPA Anthropic + Google signés

### Importants (dans la première semaine post-launch)

- [ ] Sentry capture la 1re erreur prod
- [ ] Trustpilot business + Google Business Profile actifs
- [ ] Hero video 30 s shootée + encodée + uploadée
- [ ] OG images JPG (5 fichiers) en production
- [ ] Logo SVG 512×512 finalisé
- [ ] Submit Capterra
- [ ] Cron review-request quotidien actif

### Nice-to-have (mois 1-3)

- [ ] G2 submission
- [ ] 50 articles SEO complets
- [ ] Page /status publique
- [ ] Changelog hebdomadaire
- [ ] Audit RGAA tiers
- [ ] Blog technique lancé

---

**Tout est dans cette doc.** Pour toute question, voir la doc spécifique
correspondante dans `docs/`.
