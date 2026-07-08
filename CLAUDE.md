# KitchenXpert — Project Context for Claude

> Ce document est lu automatiquement par Claude Code à chaque session.
> Il reflète **l'état réel du code** au moment de sa rédaction (audit du 14/05/2026).
> Stratégie : **migration douce** — on polit l'existant, on n'impose pas de refonte radicale.
> Si une nouvelle règle entre en conflit avec le code actuel, **le code gagne par défaut** — sauf décision explicite ci-dessous.

---

## 1. Vision & Positionnement

**Pitch** : KitchenXpert est un SketchUp grand public premium pour concevoir sa cuisine en 3D dans le navigateur, scalable vers les professionnels (cuisinistes, architectes d'intérieur).

**Stratégie produit** : conquérir d'abord le **particulier exigeant** (rénovation/installation cuisine), puis monter en gamme vers le pro qui retrouve ses clients déjà familiers avec l'outil (effet viralité Figma/SketchUp).

**Anti-positionnement** : ni AutoCAD/Revit froid, ni jouet gratuit type Roomstyler. Premium technique chaleureux.

---

## 2. Personas & Modèle Économique

| Plan | Cible | Prix | Différenciateurs |
|---|---|---|---|
| **Gratuit** | Curieux découvre | 0 € | Sandbox, 1 projet, catalogue de base, export image basse résolution |
| **Pro** | Particulier exigeant | 29 €/mois | Projets illimités, catalogue complet, rendu HD, sauvegarde cloud, IA |
| **Entreprise** | Cuisiniste, archi, pro | 99 €/mois | Mode Pro (cotations mm, métrés, devis), export DWG/PDF coté, multi-users, branding |

**Note pricing** : grille validée le 14/05/2026. Toggle annuel -20% disponible (codé). À ré-évaluer après 3 mois de données conversion.

**Implications UX** :

- Le Gratuit doit donner envie de payer, pas frustrer. Friction (paywall) au moment de **valeur créée** (sauvegarde, export HD), jamais avant.
- Interface identique pour les trois plans. Fonctions Entreprise signalées par badge discret (pas de bannière agressive).
- Paywall = dialog élégant qui explique la valeur + propose essai 14j + se ferme en 1 clic. **SignupPromptModal et SandboxWatermark sont les références à respecter pour ce pattern.**

---

## 3. Stack Technique (réelle, observée dans le code)

**Framework & build** : React 18 + TypeScript + Vite, React Router, Redux Toolkit (slices `catalog`, `project`, `kitchen`, `audit`, `permissions`, `questionnaire`, `roles`, `user`, `virtual-reality`, `webhooks`, `adaptive-surfaces`, `ai-generator`), Zustand (state sandbox avec `persist`).

**Styling** : TailwindCSS, **light/dark/system support via `ThemeContext`** (3 modes, défaut "system"), Framer Motion pour les animations.

**3D** : Three.js + package interne `@kitchenxpert/3d-engine` (`BRAND_PROFILES`, `recomputeWithThickness`, `mmToM`). Hooks `useKitchenEngine.ts`, `useCollaboration.ts`. **Renderer minimal opérationnel dans `SandboxCanvas.tsx`** — référence à réutiliser.

**i18n & SEO** : i18next + react-i18next (FR par défaut, EN fallback dans `t(key, fallback)`), composants `Hreflang`, `LanguageProvider`, `LanguageSwitcher`, `LocalizedLink`, `<SeoHead>` + JSON-LD (`ORGANIZATION_JSONLD`, `WEBSITE_JSONLD`, `SOFTWARE_JSONLD`). Multilingue actif (FR/EN, plus à venir).

**Tests** : Vitest + @testing-library/react (unit/integration), Playwright (9 flux E2E critiques : signup, login, sandbox, catalog, designer, quote-PDF, Stripe, RGPD, accessibility), Lighthouse CI.

**Analytics** : Plausible (privacy-first), `useABVariant` pour A/B testing.

**Base de données** : **Supabase PostgreSQL cloud** (région `eu-west-3`, pooler Supavisor session-mode port 5432, SSL forcé). Schema déployé via `prisma db push` (**64 models**, dont le model `Seed`/`_seeds` modélisé #186 + `Product.parentSku`/`isCanonical` #186). `directUrl` ajouté au datasource Prisma (commit 70f96b3) pour les migrations qui nécessitent le path direct sans pooler. Prérequis local : `.env` racine avec `DATABASE_URL` + `DB_HOST/PORT/USER/PASSWORD/NAME` + `DB_SSL=true`. **Plus d'installation Postgres locale requise.**

**Cache & file de jobs** : **Upstash Redis cloud** (TLS via `rediss://`). Client `redis@4` côté backend avec **circuit breaker production-grade** dans `redis-client.ts` (commit d3b5a51) : bound boot connect, half-open retry, fail-fast en cooldown. Token Upstash dans `.env` (`REDIS_URL`).

**Sous-projet séparé** : `packages/guides/` est un site Astro v5 indépendant (build/deploy séparé via reverse proxy) pour le contenu SEO. **Hors scope de ce CLAUDE.md** — son design évolue séparément.

**Icônes** : **lucide-react** pour l'UI productive. **Exception assumée** : `TrustStack.tsx` utilise des SVG inline maison pour économiser les bytes (décision documentée). Tout autre composant doit utiliser lucide-react. **Aucun emoji** en UI productive.

**Setup dev** : `pnpm dev` à la racine lance backend (port 4000) + frontend (port 3005) en parallèle via Turbo. **Ne pas lancer le frontend seul** — le proxy Vite tape `localhost:4000` et la console se remplit de 500 si le backend est absent. Si besoin de lancer séparément : `pnpm backend:dev` dans un terminal, `pnpm frontend:dev` dans un autre. Vérifier le backend via `curl http://localhost:4000/health`. Prérequis : `.env` racine valide (DB Supabase + Redis Upstash + JWT secrets). ⚠️ Sans `.env` à la racine, le backend démarre sur le port 3001 (au lieu du port 4000 attendu par le proxy Vite) — ce qui reproduit les erreurs 500 sur `/api/v1/*`. Vite frontend bind explicitement `host: '127.0.0.1'` (commit a7de96d) — fix Windows IPv6-only qui causait `ERR_CONNECTION_REFUSED` sur `localhost`.

---

## 4. Composants Maison (à réutiliser systématiquement)

Dans `packages/frontend/src/components/ui/` (17 primitives codées) :

`Avatar`, `Badge`, `Button`, `Card` (avec `CardHeader`/`CardBody`/`CardTitle`/`CardDescription`), `Checkbox`, `Container`, `Dialog`, `EmptyState`, `Input`, `Label`, `Select`, `Separator`, `Skeleton`, `Switch`, `Textarea`, `Toast`/`ToastProvider`, `Tooltip`.

**Composants spécialisés réutilisables** : `HeroVideo`, `HeroVariants`, `HowItWorks`, `LogoStrip`, `TrustBar`, `TrustStack`, `LiveCounter`, `ReviewsSection`, `ReviewPromptModal`, `SandboxCanvas`, `SandboxPalette`, `SignupPromptModal`, `SandboxOnboardingModal`, `SandboxWatermark`, `SandboxMigrationBanner`.

**Règle absolue** : ne JAMAIS créer un nouveau composant primitif sans justification. Si une variante manque, **étendre via props** (ex : `<Button variant="ghost-warm">`), pas dupliquer. Si un nouveau pattern UI est récurrent, **l'extraire en composant réutilisable**, pas le copier d'écran en écran.

**Dette identifiée** (à corriger lors du polish, voir §11) :

- `SignupPromptModal`, `ReviewPromptModal`, `SandboxOnboardingModal` ré-implémentent un dialog from scratch → migrer vers `Dialog` primitif
- `HomePage.tsx` contient des Hero/LogoStrip locales dupliquées (code mort) à supprimer

---

## 5. Direction Artistique (état réel du code)

### 5.1 Identité visuelle

**Direction actuelle** : dark mode premium tech, palette froide indigo/fuchsia/cyan, identité proche Linear/Vercel/Arc mais avec personnalité KitchenXpert (aurora subtile signature).

**Tension chaud/froid** : pas la signature centrale, mais utilisée comme **accents ponctuels chaleureux isolés** : pastilles ambrées (SandboxWatermark, SignupPromptModal badge "Mode démo"), étoiles avis (amber-400), lumière directionnelle 3D (0xfff8e7 ≈ 2700K dans SandboxCanvas). **Règle** : le chaud ne se mélange jamais avec le froid au sein d'un même élément, il cohabite à l'échelle du layout.

### 5.2 Palette (tokens.css existants à respecter)

**Surfaces (CSS variables existantes)** :

- `--kx-bg: 10 10 15` → `#0a0a0f` — fond de page
- `--kx-bg-elevated: 16 16 22` → `#101016` — surfaces (cards, panels)
- `#13131c` à `#13131a` — modals et overlays (variantes hardcodées tolérées)
- `--kx-fg: 255 255 255` → blanc pur (par défaut). Pour textes marketing premium, préférer `text-white/90` (non imposé)

**Accents froids (brand)** :

- `--kx-brand-from: indigo-400` (#818cf8)
- `--kx-brand-to: fuchsia-400` (#e879f9) ou `fuchsia-500` (#d946ef) selon contexte
- `--kx-brand-accent: cyan-400` (#22d3ee)

**Accents chauds (usage ponctuel uniquement)** :

- `amber-400` (#fbbf24) — pastilles, étoiles, lumières
- `#ffb878` — équivalent CSS de la lumière 2700K (utilisé en 3D)

**Couleurs sémantiques** : success, warning, danger, info — voir `tokens.css`.

### 5.3 Typographie

**Police principale** : **Inter variable** (self-hosted, woff2). Stack système en fallback (`-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`).

**Décision** : pas de Fraunces, pas d'Inter Tight pour l'instant. La typographie premium peut être ré-évaluée après lancement si les données conversion l'exigent. Évite la complexité asset/perf inutile en phase pré-lancement.

**Hiérarchie d'usage** :

- Headlines : Inter `font-bold` ou `font-extrabold` + tracking serré (`tracking-tight`, `-0.02em`)
- Body : Inter `font-medium` ou `font-normal`
- Captions / labels : Inter `font-medium` avec tailles réduites

### 5.4 Aurora & atmosphère (signature visuelle assumée)

**`kx-aurora` est la signature visuelle de KitchenXpert** (non plus un anti-pattern). 3 radial-gradients (indigo + fuchsia + cyan) en `::before` sur les sections premium. Usage : sections marketing (Hero, Pricing top), pas dans les écrans produit (éditeur, sandbox).

**Règles d'utilisation** :

- Maximum 1 aurora par viewport (sinon overload visuel)
- Toujours en `::before` ou conteneur dédié, jamais directement sur le contenu
- Animation très lente (>20s) ou statique (cohérent avec `prefers-reduced-motion`)
- Désactivée en `prefers-reduced-motion`

### 5.5 Gradients

Les gradients indigo→fuchsia sont **acceptés comme accents**, pas comme fonds décoratifs systématiques. Préférer :

- Gradients sur titres (`bg-gradient-to-b from-white to-white/60` est OK)
- Gradients sur CTAs primaires
- Gradients d'avatar/badge
- Lumière qui rayonne depuis derrière un objet 3D (cohérent avec le métier)

---

## 6. Principes UX (état actuel)

### 6.1 HomePage = scroll marketing complet (décision validée)

L'accueil contient les sections suivantes, dans cet ordre : **Hero + Trust + How It Works + Reviews + Features + Metrics + CTA + Footer**. Stratégie de conversion long-form assumée, alignée avec ton positionnement premium grand public qui exige du contenu pédagogique et de la preuve sociale.

**Implications** :

- Densité contenu OK, mais éviter la redondance (Metrics et LiveCounter ne doivent pas dupliquer les mêmes chiffres)
- Chaque section a un rôle clair, pas de remplissage marketing
- Le scroll doit raconter une histoire : Promesse → Réassurance → Démonstration → Preuve → Détails → Conviction → Action

### 6.2 Hero — composant central + 3 layouts A/B/C testés

**Décision (22/05/2026)** : un seul composant `HeroVideo` (poster premium image cuisine Krea + vidéo `.webm/.mp4` optionnelle), décliné en **3 layouts** tirés au sort par `useABVariant('hero', ['A','B','C'])` — sticky par visiteur via localStorage. Hero3D temps réel écarté par décision d'architecture (cf §11 P1) — la 3D vit dans le Designer, pas en vitrine marketing.

**Les 3 layouts** partagent strictement le même headline, la même tagline et les mêmes CTAs. Seul le layout visuel diffère :

| Layout | Description | Aspect HeroVideo |
|---|---|---|
| **HeroA** | Stacked centré, headline au-dessus, image dessous | `16 / 10` |
| **HeroB** | Full-bleed, headline en overlay sur l'image + scrim sombre top | `16 / 9` |
| **HeroC** | Split 2 colonnes (lg+), headline + CTAs à gauche, image à droite | `4 / 3` |

**Tracking opérationnel** : le funnel est slicable par variant dans Plausible via 5 events distincts (suffixe `_ab` évite la collision avec les events `sandbox_signup_*` existants) :

- `ab_assignment` — assignation, props `{ experiment: 'hero', variant }`, 1×/session
- `hero_cta_primary_click` — clic "Essayer le designer" → `/designer/sandbox`
- `hero_cta_secondary_click` — clic "Créer un compte" → `/register`
- `sandbox_signup_intent_ab` — émis par `SignupPromptModal` au clic CTA
- `sandbox_signup_completed_ab` — émis par `SandboxMigrationBanner` (import OU delete)

Joint automatiquement par `tagConversion()` (cf `useABVariant.ts`, type `HeroABEvent` strict).

**KPI de décision** : taux de clic CTA primary par variant + ratio intent/click + ratio completion/intent. Décision quand le trafic produit un signal statistiquement significatif (post-launch, ≥ 2-4 semaines selon volume).

**Vidéo** : fichiers `.webm/.mp4` absents du repo (cf §11 P3) — le `<video>` ne mount jamais, seul le poster premium s'affiche. Acceptable en l'état. Si encodage un jour : démo produit 15s, lumière 2700K cohérente avec le poster Krea.

### 6.3 CTA principal : "Ouvrir l'éditeur"

CTA primaire universel : **`Ouvrir l'éditeur`** (mène vers `/designer/sandbox`). Action > engagement. L'inscription/paywall arrive à la sauvegarde du premier projet (modèle SignupPromptModal).

CTAs secondaires acceptés : `Se connecter`, `Voir le pricing`, `Comment ça marche`. Mais **un seul CTA primaire par viewport**.

### 6.4 Progressive Disclosure (grand public ↔ pro)

Interface épurée par défaut (mode grand public). Fonctions Entreprise (cotations mm, métrés, export DWG, devis pro) accessibles via préférences ou toggle Mode Pro. Modèle Figma Dev Mode.

### 6.5 Deux modes de rendu 3D : Show ↔ Plan

- **Show** : rendu beau, ombres douces, textures réalistes (par défaut grand public)
- **Plan** : axonométrie technique, cotations, vue de dessus (Entreprise)

Toggle wow-effect en démo, outil quotidien Entreprise. Référence : SketchUp Styles.

### 6.6 Catalogue dual-track

**Un seul catalogue**, deux niveaux d'info révélés selon le mode :

- Grand public : marques aspirationnelles (IKEA, Schmidt, Mobalpa, Cuisinella), photos lifestyle, prix indicatif
- Entreprise : références produits exactes, cotes au mm, fiches techniques téléchargeables

LogoStrip.tsx déjà conforme : wording "catalogues compatibles" + mention juridique propre.

---

## 7. Principes d'Interaction (IX)

### 7.1 Cohérence > polish radical

L'IX actuelle est minimaliste et fonctionnelle. **Pas d'imposition** du curseur-lampe, boutons magnétiques, rim light conique du skill bencium — ce sont des options d'enrichissement futur, pas des règles obligatoires.

### 7.2 Règles IX en vigueur

- **Loading** : skeletons (composant existant) ou shimmer `kx-hero-shimmer`. Pas de spinner rond générique.
- **Modals** : utiliser `Dialog` primitif systématiquement (cf. dette §4)
- **Hover cards** : `box-shadow` discret OU border-color shift, pas de gros effets
- **Transitions** : animations courtes (<300ms), respect strict `prefers-reduced-motion`
- **Drag/scroll 3D** : feedback immédiat (<16ms), aucun lag toléré
- **Toast** : utiliser `ToastProvider` existant

### 7.3 Performance & seuils

- Bundle hero initial < 250kb gzipped (3 layouts HeroA/B/C partagent un seul HeroVideo, pas de 3D temps réel en vitrine)
- LCP < 2.5s sur 4G mid-tier
- Animations critiques (édition 3D, drag) < 16ms latency
- Animations décoratives < 300ms
- Respect strict `prefers-reduced-motion`

---

## 8. Anti-Patterns (mis à jour)

### 8.1 Réellement interdits (alignés sur le code existant)

- ❌ Emojis en UI productive (boutons, labels, états, modals) — `lucide-react` obligatoire
- ❌ Spinners ronds génériques (préférer skeletons)
- ❌ Composants dupliqués au lieu d'étendre le primitif
- ❌ Dialog ré-implémenté from scratch (utiliser `Dialog` primitif)
- ❌ Couleurs Tailwind par défaut (blue-600, gray-50, etc.) ignorant les tokens KitchenXpert
- ❌ Sidebar gauche qui mange le canvas 3D dans **l'éditeur principal** (Sandbox a sa propre dérogation)
- ❌ Modals bloquantes pendant manipulation 3D active (Onboarding pré-canvas OK)
- ❌ Double CTA primaire dans un même viewport (CTA primaire unique, secondaires en `variant="ghost"`)

### 8.2 Acceptés contrairement au CLAUDE.md v1

- ✅ Aurora gradient (`kx-aurora`) — devient signature, plus anti-pattern
- ✅ LiveCounter avec animation easeOutCubic — assumé comme preuve sociale transparente (polling /api/v1/stats/public)
- ✅ LogoStrip "catalogues compatibles" — wording neutre, pas un anti-pattern type "ils nous font confiance"
- ✅ HeroVideo — composant Hero central, décliné en 3 layouts A/B/C testés (cf §6.2)
- ✅ Light/dark/system via ThemeContext (le dark n'est plus le seul mode supporté)
- ✅ Inter (pas Fraunces) — décision pragmatique, ré-évaluable plus tard
- ✅ SVG inline dans TrustStack — décision perf justifiée (confirmée 22/05/2026 — cf §11 P2 #4 fermée comme caduque, alignement définitif)

### 8.3 Toujours à fuir

- ❌ Compteurs animés FACTICES (chiffres inventés, pas d'API) — LiveCounter est OK parce qu'il consomme une vraie API
- ❌ "Ils nous font confiance" + logos clients corporate — LogoStrip est OK car neutre
- ❌ Vidéo de fond background décoratif (HeroVideo est ≠, c'est une démo produit centrale)

---

## 9. Références produits (à étudier)

**Pour le métier (éditeurs 3D)** :

- SketchUp (architecture outils, styles, raccourcis)
- Cedreo / IKEA Home Planner (catalogue + drag-to-canvas)
- Figma (palettes flottantes, contextual menus, Dev Mode toggle)
- Blender (N-panel side properties)

**Pour la direction artistique** :

- Linear (rigueur + identité, référence proche)
- Arc Browser (chaleur identitaire, grand public)
- Vercel (aurora signature, à observer pour ne pas copier servilement)

**Pour le pricing/conversion** :

- Figma (free généreux → conversion team)
- Notion (free → personal pro → team)
- SketchUp Web → Pro

---

## 10. Workflow Claude Code

1. **Avant toute proposition de design**, relire les sections 5 (DA), 6 (UX), 7 (IX), 8 (Anti-patterns)
2. **Avant tout nouveau composant**, vérifier dans `packages/frontend/src/components/ui/` si une primitive existe
3. **Avant toute proposition de code**, identifier le contexte : marketing (HomePage, Pricing, Avis, CommentCaMarche) ou produit (Designer, Sandbox, Admin). Le marketing tolère plus de polish/aurora ; le produit privilégie sobriété/perf.
4. **Toujours challenger** les demandes contredisant ce document. Référer au § pertinent.
5. **Solliciter le skill `bencium-innovative-ux-designer`** pour décisions de design structurantes (nouvel écran marketing, refonte de section).
6. **Tester systématiquement** les composants visuels en : keyboard nav, `prefers-reduced-motion`, light + dark, contrast ratio ≥ 4.5:1 sur textes principaux.

---

## 11. Dette technique design (Plan de Polish)

Issues à traiter par ordre de priorité, validées par l'audit du 14/05/2026 :

### Priorité P0 (à faire avant tout autre travail design)

- [x] BUG NAV REACT ROUTER LOCALHOST RÉSOLU (commits 5650135 + c8a1ff4). Investigation 16/05 et 17/05 — cause secondaire identifiée : les `<Link>` du Header et de HomePage.Nav() utilisaient `to='/pricing'` (chemin absolu sans préfixe locale). React Router top-level matche `path='/:lang/*'` avec `lang='pricing'`, LocaleAwareShell vérifie `['fr','en'].includes('pricing')` → false → redirige vers `/fr/`. L'utilisateur voit l'URL changer brièvement puis revenir, perçu comme "rien ne se passe". Fix : import alias `LocalizedLink as Link` dans Header.tsx + HomePage.tsx Nav() (8+7 Link concernés). Bug latent EN PRODUCTION ÉGALEMENT éliminé. Plausible désactivé en dev (5650135) ne résolvait pas tout — c'était une vraie cause secondaire à isoler. Tests runtime confirmés : clic "Tarifs" navigue maintenant correctement.
- [x] `tailwind.config.js` : câbler les tokens KitchenXpert (`kx-base`, `kx-elevated`, `kx-brand-from`, `kx-brand-to`, `kx-accent-warm`) pour réduire les arbitrary values — commit 1f5129e
- [x] `TrustBar.tsx` : remplacer les 4 emojis (🇫🇷 🇪🇺 🔒 ⚡) par icônes lucide-react équivalentes — commit aab8f69
- [x] `SandboxOnboardingModal.tsx` : remplacer emojis ✨ 📐 🎨 + migrer vers `Dialog` primitif — commits aab8f69 + f0d37b6
- [x] `ReviewPromptModal.tsx` : remplacer emojis 🙌 🙏 + migrer vers `Dialog` primitif — commits aab8f69 + 77a8557
- [x] `SignupPromptModal.tsx` : migrer vers `Dialog` primitif — commit 7d701d8
- [x] `SandboxDesignerPage.tsx` : remplacer emoji ✨ dans bouton Auto-Layout IA — commit aab8f69
- [x] `HomePage.tsx` : remplacer emojis 🍳 et 🇫🇷 — commit aab8f69

### Priorité P1 (avant lancement)

- [x] `HomePage.tsx` : supprimer les fonctions Hero/LogoStrip locales dupliquées (code mort) — commit 36c835f
- [x] `PricingPage.tsx` : refonte palette → utiliser tokens KitchenXpert au lieu de blue-600/gray-50 — commits 321141b + 5765fc4
- [⚠️ ÉCARTÉ 22/05/2026] `Hero3DInteractive.tsx` (et split A/B `useABVariant` associé) : variant B du A/B test §6.2 écarté après tentative abandonnée le 22/05. La 3D temps réel programmatique (primitives Three.js, 28 meshes basiques) ne produit pas un rendu Hero premium — résultat : cuboïdes sombres, pas vendeur. Décision d'architecture : la 3D temps réel vit dans le Designer (SandboxCanvas) où l'utilisateur conçoit sa cuisine, pas en vitrine Hero. Concurrents premium (IKEA, Schmidt, Houzz) utilisent photo/vidéo en Hero, pas de 3D temps réel. Si 3D Hero un jour réenvisagée : nécessite assets pro (GLTF+PBR+HDRI scannés ou modélisés Blender), pas de primitives programmatiques. NOTE : §6.2 (A/B Test HeroVideo vs Hero3D) devient caduc dans sa forme actuelle et mériterait une réécriture séparée (hors scope du 22/05).
- [x] HeroVideo.tsx poster cassé + commentaire `<picture>` mensonger : RÉSOLU 22/05/2026 (commit 7d737e1). Bug latent depuis l'origine du projet — 8/9 assets Hero manquaient (hero-poster.jpg, hero-poster@2x.jpg, et 6 vidéos .webm/.mp4 jamais committés), seul hero-poster.svg existait, le `<picture>` affichait une icône "image cassée" + alt text visible. Image cuisine premium générée via Krea.ai (modèle Krea 2 Grand + amplificateur 2x) — cuisine minimaliste, marbre noir, hotte inox, lumière 2700K, ambiance architecturale haut de gamme. Optimisée en `hero-poster.jpg` (1280×710, 92KB) + `hero-poster@2x.jpg` (2048×1136, 207KB). Commentaire JSX du `<picture>` corrigé (mentait sur l'ordre des `<source>`). Dettes résiduelles non bloquantes basculées en P3.
- [x] `tokens.css` : `--kx-accent-warm: 251 191 36` (amber-400) — DÉJÀ FAIT, dette non décochée à l'époque. Audit du 18/05/2026 révèle que le token était déjà en place : défini tokens.css ligne 22, câblé tailwind.config.js ligne 31 (`'accent-warm': 'rgb(var(--kx-accent-warm) / <alpha-value>)'`), et déjà consommé par PricingPage.tsx ligne 370 (`bg-kx-accent-warm/20 ... text-kx-accent-warm` pour badge -20% annuel). Probable origine commit 1f5129e (résolution P0 "câbler les tokens KitchenXpert dans tailwind.config.js") qui a ajouté à la fois l'entrée Tailwind et le token CSS source mais a manqué le décochage ici.
- [x] HomePage Section Metrics : suppression complète au lieu de simple déduplication. Tous les chiffres étaient aspirationnels ('98% satisfaction', '< 3 min génération', '24/7 support') ou en doublon avec LiveCounter ('50k+ cuisines'). Risque DGCCRF (L121-2) éliminé. LiveCounter reste seule source de vérité statistique sur la HomePage. Commit 02d41fe.
- [x] Service Worker `sw.js:33` : RÉSOLU (commit 88efb29). Fix Stratégie A élargie : ajout de `if (response.ok && response.status !== 206)` avant cache.put. Couvre le bug 206 (range requests HTML5 video sur intro.mp4/tutorial*.mp4) ET élimine bonus le cache pollué par 4xx/5xx (response.ok = status 200-299). Pattern standard Workbox / Google Web Fundamentals. F14 Full Offline Mode opérationnel pour la première fois depuis l'origine du projet.
- [x] `main.tsx:55` SW registration failed : RÉSOLU (commit 288e549). DEUX sources d'enregistrement ont été identifiées et fixées :
  1. main.tsx ligne 35-38 : path corrigé '/service-worker.js' → '/sw.js' + guard `!import.meta.env.DEV` ajouté
  2. index.html lignes 85-91 : suppression du `<script>` inline duplicate qui registrait /sw.js sans guard dev et avec `.catch(() => {})` silencieux (c'était la VRAIE source du SW actif depuis l'origine du projet, expliquant les bugs 206 quotidiens). Source unique de vérité désormais : main.tsx.
- [x] HomePage.tsx : 3 `<Link>` résiduels migrés vers LocalizedLink (commit 4c516e8). CTAs "Commencer gratuitement" + "Voir les tarifs" + FooterCol dynamique tous fixés. Tests adaptés (endsWith pattern). Validation runtime confirmée pour les 2 CTAs sur HomePage.
- [x] HomePage.tsx Footer : 5 paths problématiques corrigés (commit 534d540). 3 routes inexistantes supprimées (/docs, /blog, /support). 1 path adapté pour respecter CLAUDE.md §6.3 (/designer → /designer/sandbox). 1 path retiré car ProtectedRoute (/marketplace, anonymous bouncé vers /login). Footer passé de 11 liens à 7 liens fonctionnels, grid md:grid-cols-4 → md:grid-cols-3. Header audité au passage : 9/9 paths valides (gating par isAuthenticated).
- [x] `HomePage.tsx` : fonction `Nav()` locale SUPPRIMÉE (commit 974e351, mission D du 18/05/2026). Code mort partiel laissé par 36c835f. Suppression sèche : ~33 lignes retirées de HomePage.tsx (function `Nav` + commentaire bannière + appel `<Nav />`). Test obsolète `should have a <nav> element` retiré de HomePage.test.tsx avec commentaire explicatif. Build vert, 1202/1202 tests verts (–1 obsolète, 0 régression). Header global est désormais l'unique porteur de la navigation. Effet de bord propre : le `/marketplace` résiduel ligne 96 a disparu avec Nav(), pas besoin de patch chirurgical. Validation runtime confirmée : 1 seule barre de navigation visible (Header sticky blanc), plus de duplication "2× Tarifs".
- [x] **Bug app `LocaleAwareShell` — deep-link non-préfixé perd le path (USER-FACING / SEO)** — ✅ **RÉSOLU 06/06 (PR #95, squash `27f14b0`)** (découvert 06/06, cf couche 7e #92) : ouvrir/taper une URL **sans locale** — `/login`, `/pricing`, `/catalog`, `/legal/privacy`… — redirige vers **`/fr/` (accueil)**, le path est **perdu** (et `/legal/privacy` → `/fr/privacy` = 404). [router.tsx](packages/frontend/src/router.tsx) `LocaleAwareShell` (~l.159) fait `pathname.replace(/^\/[^/]+/, '')` → **strippe le 1er segment** (pris pour une locale invalide) au lieu de **prepend `/fr` au chemin complet** (comme `RedirectToLang` l.145). **Impact launch** : SEO (liens Google/externes vers /pricing → home), bookmarks, **liens d'emails** (verify/reset mènent à l'accueil), partage social. **Prouvé par dump DOM** (cf §12 06/06 + couche 7e). Fix ~30 min : prepend `/fr` au `pathname` complet au lieu de stripper (edge-case `/xx/login` locale-invalide-structurée → deviendrait `/fr/xx/login`, rare → acceptable). Placé **P1** (user-facing, > dette technique). **Fix livré** : helper pur `localizeUnknownLangPath` ([i18n/localize-path.ts](packages/frontend/src/i18n/localize-path.ts)) — prepend `/fr` au `pathname` complet (search+hash préservés), réutilise le pattern `RedirectToLang`. Prouvé **unit 6/6 + DOM** (`/login`→`/fr/login`, `/catalog/IKEA`→`/fr/catalog/IKEA`, `/fr/login` inchangé).

### Priorité P2 (après lancement)

- [x] `HowItWorks.tsx` : migration vers primitive `Card` polymorphique terminée. Commits **594c63b** (feat ui : Card étendue d'un prop `as` polymorphique générique) + **ee1869c** (refactor : HowItWorks Step utilise Card primitive avec `as="article"`). Pattern Card polymorphique réutilisable désormais sur toutes les surfaces type "carte" du projet, quelle que soit la balise sémantique cible.
- [ ] `SandboxMigrationBanner.tsx` : utiliser primitives `Card` ou `Toast`
- [ ] **Backend dotenv cleanup (reclassé P3→P2 le 31/05/26)** : retirer les 3 `dotenv.config()` redondants (`packages/backend/src/config/app-config.ts:3` + `packages/backend/src/config/env-validator.ts:20-21`) — `load-env.ts` doit devenir la source unique. ⚠️ **PAS purement cosmétique** : confirmé par audit 31/05 (cf §12 31/05) que ces appels mitigent activement un problème d'ordre d'imports (auth.service tiré avant env-validator, jwt.service lit `process.env` au module-eval). Un cleanup naïf casse le boot HTTP en mode silencieux : backend démarre, logs propres, mais Express ne sert plus `/api/v1/*` (browser voit `ERR_CONNECTION_REFUSED`). Branche de repro `chore/dotenv-17-minimal` (commit a10f4aa) isole la cause. Protocole safe avant retrait : (a) auditer l'ordre d'imports complet via `tsc --listFiles` ou trace require, (b) déplacer `load-env.ts` en tout premier import du module entry, (c) tester `pnpm dev` + smoke browser sur `http://localhost:3005`, pas seulement `curl /health`. Reclassé P2 (à traiter avant launch) car mitigation cachée = risque runtime réel sur n'importe quelle refonte de l'arbre d'imports.
- [x] `packages/guides/` tokens : DÉCISION 22/05/2026 — NE PAS câbler. guides reste hors scope §3 (Astro indépendant, build/deploy séparés). Couleurs déjà visuellement alignées (`#0a0a0f` des deux côtés). Câbler = 2-4h d'infra fragile (Windows symlinks, npm script de copy, ou nouveau workspace package) pour bénéfice quasi nul avant launch. À reconsidérer si : refonte palette KitchenXpert, arrivée d'une équipe design, ou guides devient volumineux (>10 articles avec variations visuelles).
- [x] TrustStack migration lucide-react : DÉCISION 22/05/2026 — CADUQUE. Estimation gain ~0.5-1.5 KB gzipped sur 1 seul call site (`PricingPage.tsx:399`). Négligeable face au risque de churn sur une surface trust stable. §8.2 valide déjà l'inline SVG comme "décision perf justifiée" — cette dette P2 lui était contradictoire (incohérence interne détectée à l'audit du 22/05). Décision retenue : **§8.2 fait foi**, l'inline SVG reste l'approche officielle pour TrustStack. §3 ligne 54 ("Exception assumée") déjà alignée.
- [x] `HeroVideo.tsx` (ligne 173) : warning React "fetchPriority not recognized" résolu via spread cast `{...({ fetchpriority: 'high' } as Record<string, string>)}` injectant l'attribut HTML standard lowercase. Note technique : `@ts-expect-error` ne fonctionne pas sur les attributs JSX (TypeScript #27552 ouvert depuis 2018). Commit 388e5cd.
- [x] Backend `/api/v1/stats/public`, `/api/v1/auth/me`, `/api/v1/me/reviews/pending` retournaient 500 en dev quand le backend Express n'était pas démarré (proxy Vite → `localhost:4000`). Résolu par documentation : §3 Stack CLAUDE.md + section "⚠️ Frontend seul vs stack complète" dans README.md. La commande recommandée est `pnpm dev` à la racine (Turbo lance backend+frontend).

### Priorité P3 (futur, opportunité)

- [ ] Tester Fraunces / Inter Tight si données conversion l'exigent
- [ ] Enrichissement IX (curseur-lampe, boutons magnétiques) en option sections marketing premium
- [ ] Évaluer mode dark-only forcé selon usage réel des modes light/system
- [ ] `.gitignore` : ajouter `packages/frontend/public/sitemap.xml` (régénéré à chaque build par scripts/generate-sitemap.mjs, ne devrait pas être versionné). Puis `git rm --cached packages/frontend/public/sitemap.xml` pour le retirer du repo.
- [ ] RegisterPage : parse `?from=` query param pour enrichir l'event `signup_completed` avec le trigger source. Permet de mesurer la conversion par trigger (pdf_export, ai_use, quote_compare, pathtracer, session_15min).
- [ ] `LanguageSwitcher.tsx` : exit animation Dialog non observable car `closeSignupPrompt` nulle `trigger` simultanément avec `open=false`. À traiter dans `useSandboxLimits` si l'UX exit animation devient une exigence (mémoiser le dernier trigger valide ou délayer le null).
- [ ] `SignupPromptModal` : ajouter `data-testid="signup-prompt-dialog"` sur le wrapper racine si futur test E2E veut l'asserter (actuellement seuls le titre et les CTAs ont des data-testid).
- [x] Police `/fonts/inter-var-latin.woff2` : RÉSOLU (commit ccc32be). Cause racine : le fichier était simplement absent du repo. Vite servait la SPA fallback HTML, ce qui produisait sfntVersion 0x3C212144 (`<!DO` ASCII). Fix : download manuel du fichier officiel `InterVariable.woff2` depuis Inter v4 (rsms.me/inter), placé sous le nom attendu `inter-var-latin.woff2` (352240 bytes, magic bytes wOF2 vérifiés). Le fichier est committé pour build hermétique. La typo Inter Variable rend maintenant correctement au lieu du fallback system-ui.
- [ ] `packages/frontend/scripts/fetch-fonts.sh` : URL pinned obsolète. Le script pointe vers `github.com/rsms/inter/raw/v4.0/docs/font-files/Inter-roman.var.woff2` qui retourne 404 (path/nom de fichier ont changé dans Inter v4). Mettre à jour vers `InterVariable.woff2` du package Inter v4 actuel. Non bloquant (le fichier est désormais committé), mais script reste cassé pour les futurs setups.
- [⚠️ FAUSSE ALERTE] `tokens.css` lignes 3-7 : initialement documenté comme bug (variables `--kx-surface`, `--kx-border`, `--kx-fg-muted` à `255 255 255` en mode dark). Audit du 17/05/2026 a révélé : (a) les commentaires inline `/* overlays use alpha */`, `/* /10, /15, /20 */`, `/* use /60, /40 */` documentent un pattern volontaire RGB blanc + alpha à la consommation, (b) ces 3 tokens sont en réalité du code mort — aucun consommateur dans le projet (ni Tailwind classes, ni `var()` direct, ni arbitrary values). Pas un bug visuel. Pourrait être nettoyé en mission "dead-code cleanup" séparée si désiré, mais pas urgent — préserve l'option pour usage futur en alpha overlays.
- [ ] Hero vidéos manquantes (6 fichiers) : `packages/frontend/public/assets/hero-video.webm/.mp4`, `hero-video-medium.webm/.mp4`, `hero-video-low.webm/.mp4` jamais committés depuis l'origine du projet. La balise `<video>` de HeroVideo.tsx ne joue jamais — seul le poster JPG s'affiche. Acceptable en l'état (poster premium suffit visuellement). Décision si on encode un jour : démo produit 15s lumière 2700K cohérente avec le poster Krea, pas une vidéo générique stock.
- [ ] `hero-poster.svg` fallback désaligné : c'est un gradient aurora abstrait qui ne matche plus la photo cuisine. Mineur car ne s'affiche jamais en pratique (JPG primary via `<source type="image/jpeg">` côté HeroVideo.tsx, et le navigateur ne tombe sur le SVG qu'en cas d'échec JPG — quasi-impossible). Soit régénérer un SVG cohérent avec la cuisine, soit supprimer le fallback et nettoyer le `<picture>`.
- [ ] `scripts/encode-hero-video.sh` référencé mais absent du repo (même situation que `fetch-fonts.sh`). À créer si on encode les vidéos Hero un jour, sinon retirer les références dans la doc/README.
- [ ] `packages/frontend/public/assets/videos/*.mp4` (intro.mp4 + tutorial-*.mp4 ×3) sont des placeholders 0-byte dormants. Cleanup : soit produire les vraies vidéos (onboarding/tutorial in-app), soit retirer les références dans le code et supprimer les placeholders pour ne pas polluer les builds.
- [ ] `job-queue.ts` : polling 5s `setInterval` consomme ~17 280 commandes Redis/jour par instance en idle (LRANGE/LLEN). Migrer vers BLPOP blocking (one-shot avec timeout) pour diviser par >100 la conso Upstash en prod. Acceptable en dev, coûteux sous quota cloud. Stratégie : remplacer le `setInterval(processNext, 5000)` par une boucle `while (running) { await redis.blPop('jobs:pending', 30) }`.
- [ ] `ioredis` utilisé sans déclaration dans `packages/backend/package.json` — `auth/token-blacklist.ts:381` fait un `require('ioredis')` dynamique et compte sur la résolution transitive (vraisemblablement via `bullmq` ou `redis` v3 legacy). Si une mise à jour de deps casse la transitivité, `RedisTokenBlacklist` plante en runtime sans erreur de build. Soit déclarer `ioredis` explicitement, soit refactorer `RedisTokenBlacklist` pour réutiliser le client `node-redis` v4 du singleton `redis-client.ts` (préférable — réduit la surface).
- [ ] Recherche catalogue : vérifier que l'index GIN full-text français (`gin_trgm_ops` ou `to_tsvector('french', ...)`) est présent côté Supabase après `prisma db push`. `db push` ne porte pas les index hors-schéma `prisma.schema` — si la recherche catalogue dépend d'un index `CREATE INDEX ... USING GIN` posé en raw SQL, il a probablement été perdu lors de la migration Supabase. À vérifier via `\d table_name` sur la base prod, puis poser une migration Prisma explicite ou un seed SQL.
- [ ] Commandes Prisma (`pnpm prisma:push`, `prisma generate`, etc.) : `pnpm --filter @kitchenxpert/backend prisma:push` met le CWD dans `packages/backend/` où il n'y a plus de `.env` (root-only depuis commit 5126f4b). Résultat : `DATABASE_URL is not defined` si l'utilisateur exécute la commande depuis le subpath sans charger l'env. Invoquer Prisma depuis la racine, ou exporter `DATABASE_URL` avant l'appel filter, ou ajouter un `dotenv -e ../../.env --` en wrapper du script `prisma:push`. Documenter dans README + CLAUDE.md §3.
- [ ] Backend Redis : ajouter healthcheck `/api/v1/health/redis` qui retourne `{ status: 'up' | 'down' | 'cooldown', circuitOpenUntil?, lastError? }` en lisant l'état du circuit breaker exposé par `redis-client.ts`. Permet à monitoring/uptime d'alerter sur dégradation Redis sans attendre un timeout côté client. Exposer également via OTel metric `redis_circuit_state` (gauge 0/1/2).
- [x] **Bug Prisma `/api/v1/stats/public`** : RÉSOLU par PR #46 (mergée 27/05). Confirmé live 27/05 fin de soirée puis re-confirmé 31/05/26 : la requête utilise `isVerified: true` + `isActive: true`, `/api/v1/stats/public` renvoie `{"success":true,"data":{"kitchensDesigned":4,...,"verifiedInstallers":0}}` sans `prisma:error` résiduel.
- [ ] **Hygiène git** : 36 branches locales+remote sur le repo. Faire un ménage : lister les branches mergées (`git branch -a --merged main`) — au minimum `feat/design-system-migration` peut être supprimée (mergée via PR #44). Arbitrer aussi les branches abandonnées. Branche courante à conserver : `feat/seeds`.
- [ ] **Lockfile drift après merge Dependabot** : règle process découverte 31/05/26. Quand une PR Dependabot bumpe `package.json` ET co-modifie `pnpm-lock.yaml`, un rebase/squash peut perdre la co-modification du lockfile (cas constaté sur PR #21 `pg 8.16.3 → ^8.18.0` : `package.json` mergé, lockfile resté à `specifier: ^8.11.3, version: 8.16.3`). Branche `chore/lockfile-sync-pg` (commit 2218c2a) sync le drift. Symptôme silencieux : `pnpm install --frozen-lockfile` en CI strict mode échoue `ERR_PNPM_OUTDATED_LOCKFILE`, mais en dev local le `pnpm install` implicite masque le drift. **Réflexe à intégrer** : après chaque merge Dependabot, `git pull && pnpm install && git diff pnpm-lock.yaml` — si diff non vide, sync sur branche dédiée et merger immédiatement.
- [x] **Audit `pnpm.overrides` — TERMINÉ 10/06 (10/10 entrées, 7 PRs)** : bloc racine entièrement audité + traité, **7 PRs mergées** (#118/#120/#121/#122/#124/#125 + docs #119/#123). **Résultat : vulns repo 101 → 43** (critical 6→2, high 46→15, moderate 41→20). **Bilan par entrée** : (a) ✅ **jspdf `^3.0.0` — #118** : retiré (forçait 3.0.4 CRITICAL path-traversal vs code v4 → résout 4.2.1). **4ᵉ override toxique de `edb726b`** (après path-to-regexp #47, minimatch #116). (b) ✅ **axios `^1.12.0`→`^1.17.0` — #120** (pin inefficace, `<1.15.2`). (c) ✅ **nodemailer `^7.0.4`→`^8.0.10` + dep backend →`^8.0.0` — #121** (`<8.0.4` SMTP injection ; v6→v8 API core stable). (d) ✅ **3 pins périmés rafraîchis — #122** (same-major, 2 criticals) : protobufjs `^7.6.3` (`<7.5.5`), basic-ftp `^5.3.1` (`<5.2.0`), follow-redirects `^1.16.0`. (e) ✅ **fast-xml-parser `^4.5.0`→`^5.7.3` — #124** : **5ᵉ override toxique de `edb726b`** — downgradait fxp vers 4.5.6 vuln alors qu'AWS SDK (seul conso) déclare déjà `5.7.3` patché ; bump = s'aligner sur AWS (résout 5.8.0). (f) ✅ **tar — #125 (via bcrypt 6)** : tar n'avait aucun patch v6 ; seul conso = bcrypt@5.1.1 → node-pre-gyp (`^6.1.11`). **bcrypt 6.0.0 abandonne node-pre-gyp** (→ node-gyp-build) → bump bcrypt `^5.1.1`→`^6.0.0` + @types →`^6.0.0` **élimine tar de l'arbre** (prouvé : tar ET node-pre-gyp absents) ; override tar mort retiré. API hash/compare inchangée, **tests auth 100/100**. (g) ✅ **dompurify (3.4.7) + undici (6.26.0)** : réellement patchés, laissés tels quels. **2 découvertes clés** : (1) la catégorie « 7 pins légitimes » était fausse — `pnpm audit` a montré **4/7 eux-mêmes vulnérables** (pins qui décaient) ; (2) **5 overrides toxiques au total proviennent de `edb726b`** (path-to-regexp, minimatch, jspdf, fast-xml-parser + le bloc entier était à réviser). Règle confirmée : un override doit (a) avoir un consommateur réel, (b) une raison CVE, (c) **pointer une version RÉELLEMENT patchée** (vérifier par `pnpm audit`, pas « consommateur + raison »). **Reste sécu (hors override)** : voir item « Triage vulns transitives » ci-dessous.
- [⚠️ EN COURS — Group A/B/C1 faits 10/06, reste = moderates majeures] **Triage vulns transitives (hors bloc override historique)** : les 43 vulns restantes après l'audit override, triées par preuve (`pnpm audit --json` + `pnpm why`). **Group A ✅ FIXÉ (#127)** : 8 advisories override same-major → handlebars `^4.7.9` (critical), lodash `^4.18.0` (high runtime), rollup `^4.59.0`, flatted `^3.4.0`, tmp `^0.2.6` (high runtime), + scopés minimatch@9/picomatch@2/picomatch@4 (évite piège #116). **Group C1 ✅ FIXÉ (#129)** : 9 advisories moderate/low same-major → react-router + react-router-dom `^6.30.4` (alignés, runtime), ws `^8.20.1` (runtime), ip-address `^10.1.1`, postcss `^8.5.10`, ajv@6 `^6.14.0` (scopé, ajv 8.x intact), qs `^6.14.2` (runtime), diff@4 `^4.0.4` (scopé, diff 8.x intact), @tootallnate/once `^2.0.1`. **Group B ✅ FIXÉ (#133 + #134)** : **vitest 1→3** (clôt le dernier critical, 3 packages, frontend 1226 tests verts ; 22 stubs vides partner-portal supprimés + scraper test honnête) + **storybook `^8.6.18`** (clôt le dernier high, dev-only). **Résultat cumulé 43→9, et repo entier à 0 critical / 0 high.** **Group B+ (11/06) FIXÉ** : **turbo 1→2 (#138)** (config `pipeline`→`tasks`) + **uuid →11.1.1 (#139)** (override + retrait dep fantôme scraper) → **vulns 9→4**. **RESTE = 4 (1 low + 3 moderate), tous derrière** : vite 5→6 + esbuild (couplés, build-tool, **différés post-launch** — risque élevé/valeur moderate), astro 5→6 (guides **hors scope §3**). Technique clé capitalisée : **override scopé `pkg@major`** quand une seule ligne de version est vulnérable.
- [x] **CI couche 6 — Backend startup en E2E** : RÉSOLUE et PROUVÉE (02-03/06/26) par #80 (align AWS SDK presigner, squash `128c98b`) + #81 (@axe-core devDep, squash `86acee0`) + **PR #79 ouverte/non mergée par décision (held)**. Cause racine confirmée par preuve (run 26842679803) : **le backend n'était jamais buildé** → `MODULE_NOT_FOUND` sur `dist/index.js` au `pnpm start`, masqué par le `&` background → `wait-on /health` timeout. **Pas** env var, **pas** boot lent, **pas** bind : les 3 hypothèses H1/H2/H3 invalidées par l'audit (validateEnv ne hard-fail que sur DATABASE_URL + JWT_ACCESS/REFRESH_SECRET ; DB connecte au step provision). Fix : step `Build backend` via `pnpm turbo run build --filter @kitchenxpert/backend` (pattern #72/#75/#76). PR #79 sera mergée **quand couche 7b sera réglée** (rationale économique : sinon e2e devient ~25 min rouge sur chaque PR, coût Actions §14.3). Cf nouvelle dette « Couche 7b » ci-dessous.
- [⚠️ BLOQUÉ EXTERNE] **CodeQL Code Scanning indisponible — Advanced Security requis (reporté post-public)** : vérifié 02/06/26 — l'option "Code scanning" n'apparaît PAS du tout dans Settings → Code security and analysis du repo. Tentative API `gh api PUT /repos/DELBOSC/KitchenXpert/code-scanning/default-setup` → 404 ; le token gh manque de toute façon le scope `security_events` (scopes actuels : gist, read:org, repo, workflow). **Cause racine : GitHub Advanced Security est requis pour les repos privés** (~49$/user/mois, pricing Enterprise). L'hypothèse "fix de 3 clics" du 31/05 était fausse (écrite sans tester la disponibilité réelle de l'option). Options : (a) **reporter jusqu'au passage en repo public au launch** (CodeQL gratuit sur repos publics) — **DÉCISION RETENUE** ; (b) désactiver les workflows CodeQL pour éliminer les checks rouges (PR future dédiée) ; (c) acheter Advanced Security (non recommandé pré-launch).
- [x] **frontend-ci.yml — bug TS6305 sur 3 steps** : RÉSOLU par PR #75 (squash `65327f8`). Remplacé `pnpm X:frontend` par `pnpm turbo run X --filter @kitchenxpert/frontend` aux 3 occurrences (type-check l.105 ; test→`test:coverage` l.144, Option B = pipeline dédiée ; build l.190). Vérifié post-merge 02/06/26 — Frontend CI run 26839054057 montre `@kitchenxpert/3d-engine:build` construit en amont via turbo `^build`, puis `vitest run --coverage` passe les **1220 tests** (45 fichiers). Dogfooding impossible (workflow file pas dans `on.pull_request.paths`) → validé sur push main post-merge. NB : Frontend CI reste rouge sur d'autres jobs sans rapport avec TS6305 (vitest coverage-v8 crash, ESLint préexistant, security audit) → nouvelles dettes P3 ci-dessous.
- [x] **backend-ci.yml — scripts test + DB_* env vars** : RÉSOLU par PR #76 (squash `526c36d`). `migrate:test → prisma:push`, `seed:test → db:seed`, `start:test → start`, et bloc env **job-level** remplaçant les `POSTGRES_*` (jamais lus par le backend) par `DATABASE_URL`/`DIRECT_URL`/`DB_*`/`REDIS_URL`/`NODE_ENV`/JWT/`DATA_ENCRYPTION_KEY` (miroir e2e.yml:43-59) sur les 3 jobs DB (test-unit, test-integration, test-api). Vérifié post-merge 02/06/26 — Backend CI run 26839748278 job Integration Tests passe les étapes "Provision test database (prisma db push)" ✅ et "Seed test data" ✅, prouvant le fix env+scripts. **Scope OUT préservé** (dettes séparées ci-dessous) : `test:integration`/`test:api` (scripts inexistants → 🚨 false green via pnpm filter) + `build:backend` turbo bypass.
- [x] **Submodule `external/ikea-api-client` orphelin** : RÉSOLU par PR #77 (squash `c512172`). Gitlink orphelin (mode 160000, commit `ce70c8d`) sans `.gitmodules` ni entrée `.git/config`. Retiré via `git rm --cached` (non-destructif, garde le clone local) + `external/` ajouté au `.gitignore`. `git grep` confirme : aucune référence code, seul CLAUDE.md le citait. **Vérifié sur la PR (dogfooding possible)** : logs de checkout CodeQL run 26839962844 montrent `git submodule foreach` propre — le warning `No url found for submodule path` + `git fatal exit 128` ont DISPARU. (CodeQL échoue toujours au step Upload SARIF = Advanced Security, sans rapport — cf #2.)
- [ ] **Plafond PayPal autorisation GitHub sans limite explicite** : l'autorisation `B-35J44897SL316563E` ajoutée le 31/05/26 pour débloquer Actions (cf §14.3) n'a AUCUN plafond mensuel côté PayPal — seul filet de sécurité = budgets GitHub (Actions à 20$/mois, autres à 0$). Risque : si un workflow runaway boucle, le compteur peut grimper rapidement. Mitigation possible : (a) baisser le budget Actions à 10$/mois une fois en cruise, (b) revoir périodiquement via `https://github.com/settings/billing/summary`, (c) garder accès au bouton "Annuler" côté PayPal pour coupure d'urgence.
- [⚠️ CADUQUE] **Anomalie cosmétique e2e.yml:100-101** : vérifié 02/06/26 — l'anomalie ne se reproduit plus au HEAD actuel (après PR #72 les numéros de ligne ont glissé). Le bloc `env: PORT: 4000` est correctement indenté (8/10 espaces, sibling de `run:` et `working-directory:`, validé via js-yaml `yaml.load`). Pas d'action.
- [x] **CI frontend — vitest coverage crash** — RÉSOLU 10/06 (#116, `57958c3`). DEUX causes : (a) le provider `v8` (1.6.1) crashait dans `convertCoverage` ; (b) après bascule istanbul, crash dans `test-exclude.glob` à cause de l'**override toxique `minimatch:^9.0.5`** (cf ESLint ci-dessous). Fix : provider `v8→istanbul` + retrait de l'override minimatch. **Prouvé** : `pnpm test:coverage` (commande CI) → exit 0, **1226 tests**, rapport istanbul, 0 crash. Bonus : retire la vuln audit `@vitest/coverage-v8`.
- [⚠️ ERREURS RÉSOLUES 11/06 (#136), warnings restants] **CI ESLint** : crash résolu #116 (override toxique `minimatch:^9.0.5` de `edb726b` retiré). **Le « ~1551 erreurs » était un faux compte** (warnings+erreurs confondus). Re-mesure 11/06 **par sévérité** : **183 ERREURS bloquantes** (frontend ; backend = **0 erreur**, déjà vert) + ~1600 warnings. **Les 183 erreurs frontend → 0 (#136)**, fixes RÉELS (zéro eslint-disable, zéro règle relâchée), 91 fichiers via workflow 10 agents + validation centrale : no-floating-promises 78 (`void`/`await`), no-unused-vars 24, jsx-a11y ~30, restrict-template-expressions 10 (`String()`), react/display-name 6, ban-types/require-await/no-misused-promises/etc. + 2 parse errors test-setup résolus config-level (dup mort `src/test/setup.ts` supprimé + `.eslintignore` aligné sur l'`exclude` tsconfig). 2 régressions agents rattrapées par validation centrale (StockIndicator `TFunction`, PriceTrackerPage null-guard). **Prouvé** : eslint frontend exit 0, build 8/8, 1226 tests. **Warnings (non bloquants, eslint exit 0)** : 1321 → **833** sur 11/06 : #140 react/no-unescaped-entities 176→0 ; #142 catalog-slice + **vite-env.d.ts** (type `import.meta.env.VITE_*`, levier 14 fichiers) ; #143 **les 11 slices Redux typés (290→0)** via fan-out 11 agents (pattern `(await response.json()) as <Shape>` avec les interfaces du slice + génériques createAsyncThunk ; tsc 0, 0 régression). #145 **les 58 pages/composants/contexts typés (560→0)** via fan-out 15 lots (~52 fichiers) + validation centrale (tsc 0, 1 import/order agent auto-fixé). **🎯 JALON : le frontend a ZÉRO `no-unsafe-*` / `no-explicit-any`** (de ~880 à 0). **Warnings totaux 1321 → 340.** **prefer-nullish-coalescing : 257 → 217** via 2 lots **revus à la main** (#147 ProjectEdit+AuditLogs 18 ; #148 GeneratedDesigns+ChatPanel+CatalogPanel+DimensionWizard 22) — **PAS de bulk** (`||`→`??` change le comportement sur 0/''/false). **Critères de revue capitalisés** : convertir si fallback `''`/`0` (≡`||`) ou map/array/object lookup (valeur jamais `''`, undefined=trigger) ; **garder `||`** si dimension numérique (0 invalide→défaut), input `num||''` (0→vide), presence-check `a||b||c` (''=absent), parseInt, message d'erreur (vide→fallback). **RESTE ~300 warnings (non bloquants, eslint exit 0)** : prefer-nullish **217** (lots manuels à poursuivre) + no-nested-ternary 37 + react-hooks/exhaustive-deps 15 (risque boucle) + jsx-a11y 16 + consistent-type-imports 7 + no-console 7 (infra légitime) + prefer-optional-chain 1 (auto-fix **prouvé dangereux** : re-casse un guard de narrowing → à faire à la main). **Pattern capitalisé (typage)** : source des no-unsafe = frontière `any` (`response.json()`, `import.meta.env`, lib externe) → cast vers la forme réelle ; **typer la frontière, pas chaque site** = levier ×N ; fan-out fichier-disjoint + **validation centrale tsc/tests obligatoire** = scalable+sûr (3 fan-outs typage, 0 régression bloquante après validation).
- [ ] **CI security jobs rouges — `pnpm audit` (bien plus gros que tracé)** : re-mesuré 10/06 → **102 vulns (8 low / 42 moderate / 46 high / 6 critical)**, pas « juste coverage-v8 ». #116 a retiré la vuln `@vitest/coverage-v8` (bascule istanbul) mais le gros reste : axios@1.13.2 (high GHSA-j5f8-grm9-p9fc) + nombreux transitifs. = **chantier dépendances dédié ≈ §14.5 Lot 4 Dependabot** (bumps majeurs, risqué), pas un quick-win. Option intermédiaire : traiter d'abord les 6 critical + high prioritaires.
- [x] **🚨 False green dangereux — pnpm filter sur script absent** — RÉSOLU 10/06 (#115, `4a03fd3`). Confirmé par exit-code : `pnpm test:integration`/`test:api` (root délègue `--filter backend`, script absent) → « None of the selected packages has a … script » → **exit 0** = step CI vert sans 1 test. Fix : guard sur chaque step (si script backend absent → `::error::` + `exit 1`) → **rouge honnête** au lieu de no-op vert. La vraie couverture intégration/API vit dans e2e.yml (flow-1..8). Reste à faire (séparé) : implémenter de vrais tests d'intégration + collection Newman, ou retirer les jobs.
- [x] **build:backend bypass turbo** — RÉSOLU 10/06 (#114, `efd9958`) : le job `build` de backend-ci.yml appelait `pnpm build:backend` sans turbo → `@kitchenxpert/common` dist/ pouvait manquer au `tsc`. Fix : `pnpm turbo run build --filter @kitchenxpert/backend` (pattern #75/#72). Backend build vérifié vert post-fix.
- **🗺️ Couche 7 — suite E2E (dépilée par couches, session 06/06)**. Après couche 6 (build backend), la suite a tourné et révélé des couches successives, toutes **diagnostiquées par preuve** (logs CI + lecture code) :
  - [x] **7b — a11y `networkidle`** : RÉSOLU PR #87 (squash `62dc20c`). `networkidle` ne settle jamais (le build prod `vite preview` enregistre un **SW network-first** ; Playwright déconseille networkidle pour SPA). Fix : `#root>*` render-wait (a11y) / `load` (visual). axe s'exécute désormais. ⚠️ **RÉVISÉ 06/06 (cf #92)** : les « 3 a11y verts » initiaux (catalog-ikea/legal-privacy/legal-cgv) étaient des **FAUX POSITIFS** — axe scannait des **404** dues au routing locale. Après #92, axe scanne les vrais écrans → **a11y login/register PASS** et de vraies violations apparaissent. (Pistes networkidle écartées par code : LiveCounter home-only/30s, OfflineIndicator=IndexedDB, AuthContext one-shot, Plausible consent-gated, WS designer-only.)
  - [x] **7c — preview proxy** : RÉSOLU PR #86 (squash `726d760`). `vite preview` n'hérite PAS de `server.proxy` → les appels UI `/api/v1/*` relatifs tombaient sur le fallback SPA, jamais sur :4000. Fix : bloc `preview.proxy` miroir dans vite.config.
  - [x] **7d — rate-limit auth E2E** : RÉSOLU PR #88 + #89. **DEUX** limiters auth : `authRateLimiter` (middleware) **et** un `authRateLimit` inline (routes/index.ts:72, `max:10`, raté au 1er grep). Skip `NODE_ENV==='test'` sur les deux. **PROUVÉ** : 429 = 0. ⚠️ `ENABLE_RATE_LIMIT`/`RATE_LIMIT_AUTH_MAX` sont **documentés mais NON câblés** (no-op) — ne pas s'y fier.
  - [x] **7e (verify-email backdoor)** : RÉSOLU PR #90 (squash `68532f8`). `/auth/dev/verify-email` faisait `emailVerified: new Date()` (champ = **Boolean**) + `emailVerifiedAt` (**inexistant**) `as never` → `prisma.user.update` throw → 404 trompeur → fixture "backdoor missing". Fix : `emailVerified: true` (tsc compile sans cast = preuve). **PROUVÉ** : verify-missing = 0.
  - [x] **7e/7f — préfixe locale (CAUSE RACINE UNIFIÉE)** : RÉSOLU PR #92 (squash `64a6078`). **Prouvé par DOM** (dump headless `vite preview` sans backend) : routes préfixées locale (`/:lang/*` LocaleAwareShell) — un `/login` nu est lu comme locale "login", strippé, redirigé vers `/fr/` (home, **path perdu**). Donc TOUS les flux/a11y atterrissaient sur home ou 404. `goto('/login')`→`/fr/` (0 input) vs `goto('/fr/login')`→ form présent (email+password+submit, labels "Email"/"Mot de passe"). Fix : préfixe `/fr` sur tous les `page.goto` des specs + facette localStorage (flow-3 : goto avant evaluate). C'est ce qui explique facettes 1+2 ET la révision 7b.
  - [x] **7f facette 1 — selectors** : RÉSOLU PR #97 (squash `9bbe2a0`) + review-fix. `getByLabel(/nom|last name/i)` matchait "Prénom"+"Nom" → ancré `/^nom$|^last name$/i` ; les **4** `getByRole('dialog')` de flow-3 (cookie-consent monté globalement App.tsx:42 = 2e dialog) scopés par nom `/comment souhaitez-vous démarrer/i`. **PROUVÉ** (run 27097964280) : flow-3 "opens designer+onboarding" PASS, flow-1 remplit le form jusqu'au checkbox (selector OK). flow-4/flow-8 dialogs **différés** (flow-8 = `window.confirm` natif, pas `role=dialog` ; + besoin backend).
  - [x] **7f facette 2 — color-contrast** : RÉSOLU PR #98 (squash `4b43809`). Cause : accents 400 (indigo/amber) + opacités basses (`text-white/40`, `/45`, `fg/50`, `/60`) en texte sur surfaces claires OU muté sur sombre (pattern `text-white/40` = 3.77 systémique). Fix : 2 tokens AA `--kx-brand-strong` (indigo-600) + `--kx-accent-warm-strong` (amber-800) avec variantes `dark:` ; muté sombre `/40→/55`. **PROUVÉ** : axe local 14 pages × light+dark = **0 color-contrast**. ⚠️ Faux positif SW (chunks stale en preview) → toujours scanner avec `serviceWorkers:'block'`.
  - [x] **7f facette 2b — blockers a11y niveau A** : RÉSOLU PR #99 (squash `8915aa6`). Le gate E2E (`accessibility.spec.ts`, tags `wcag2a/2aa/21a/21aa/best-practice`, échoue sur critical/serious) a révélé 2 blockers que mon scan AA-only avait **manqués** (filtre `wcag2aa/21aa` = aveugle au **niveau A**) : pricing `link-in-text-block` (lien mailto distingué par couleur seule → `underline` permanent) + catalog/IKEA `select-name` (select de tri sans nom → `aria-label`). **PROUVÉ** : scan répliquant la config CI exacte = **0 critical/serious sur 15 pages**. **Leçon** : auditer avec le tag-set complet du gate, pas AA-only.
  - [x] **7f facette 3 — login 401 (CAUSE RACINE)** : RÉSOLU 08/06 par #102 (squash `facf140`) + #103 (`9f9fb38`). **2 causes code-proven** : (1) **backend test-infra** — le backdoor `/auth/dev/verify-email` mettait `emailVerified:true` mais **PAS `status:'active'`** ; or `register` crée `status:'pending'` et `login` exige `status==='active'` (auth.service.ts ~l.281) → 401 "Account is not active". Prod OK (le vrai flux email-token.service.ts ~l.183-184 active déjà). Fix : `status:'active'` au backdoor. (2) **frontend** — `LoginPage.onSubmit` ne **naviguait jamais** vers /dashboard (ni guard, ni AuthLayout) → `loginUI` `waitForURL(/dashboard)` timeout même login réussi. Fix : `navigate(withPrefix('/dashboard'))` locale-aware. **PROUVÉ** (run 27101791465) : flow-2 (login+logout) + flow-3b (API login+import) **verts**, **15 passed (vs 9)**.
  - [x] **7f — visual-regression baselines** : RÉSOLU 08/06 par #104 (`c6c3d3d`). 5 baselines `chromium-desktop-linux` (home/login/dashboard/catalog/designer) **générées sur le runner CI** (tolérance 0.1% → impossible en local cross-OS Windows) + committées. **+ 2 bugs pré-existants du job `visual-regression` corrigés** : `PLAYWRIGHT_SUITE=critical` manquant (`testDir`→./e2e → "No tests found") + `needs: critical-flows` retiré (job autonome, le couplage le skippait). **+ exclusion du job critical** (`--grep-invert "Visual regression"`) car la spec mockée rend différemment avec backend (dashboard data-driven). **PROUVÉ** : job dédié **5/5 vert** (runs 27156750366, 27158765506).
  - [x] **🎯 7f facette 3 — ROOT CAUSE = `<Provider store={store}>` jamais câblé** : RÉSOLU 10/06 par stack-up (#109, squash `2d26024`). Le store Redux (`store/index.ts`) était configuré mais **jamais fourni** à l'arbre React (App.tsx). Toute page consommant les hooks redux typés (**DashboardPage, CatalogPage, SandboxDesignerPage** + composants sandbox) throw au render : `Cannot destructure property 'store' … as it is null`. **Prouvé 3 axes** : code (aucun `<Provider>` dans App.tsx), runtime (`/fr/dashboard` rendait « Une erreur est survenue — Cannot destructure 'store' », heading absent), git (pickaxe vide = jamais présent). **Jamais attrapé** car unit tests `vi.mock('../../store/hooks')`, focus marketing/CI, E2E n'atteignait ces pages que post-#102/#103. Fix : `<Provider store={store}>` (3 lignes). **Validé stack-up** : store-null disparu, **flow-2 (login+logout) 2/2 PASS** en local. **Vrai bug user-facing** (pages authentifiées cassées en prod aussi). C'est ce qui était mal-diagnostiqué « couche login→dashboard / régression consent » le 09/06 — en réalité le crash store-null sur le rendu du dashboard.
  - [x] **7f — kitchen creation field names (flow-4/5/6)** : RÉSOLU 10/06 (#110, squash `38ea66f`). flow-4/5/6 postaient `widthCm/depthCm/heightCm` à `POST /kitchens` alors que `createKitchenSchema` (kitchen-routes.ts:27-29) veut `width/length/height` → 400 → `kData` undefined → crash `.id`. Aligné sur l'API. (flow-3 garde `widthCm` : endpoint `/projects/import-sandbox`, schéma différent.) **Avance** flow-4/5/6 past création kitchen.
  - [x] **7f — flow-1 checkbox `sr-only`** : RÉSOLU (#106, squash `f99f4d1`). `.check()`/`force` ne togglent pas l'input `sr-only` du primitive `Checkbox` → cliquer le span visuel (`following-sibling::span[1]`, idempotent). ⚠️ Retrait du `htmlFor` redondant testé local → **n'y change rien** (hypothèse double-toggle infirmée) → primitive intact.
  - [ ] **🆕 7f facette 3 (restant) — longue traîne, couches per-flow (chantier LOCAL stack-up)** : après Provider+kitchen-fields, chaque flux a une **couche plus profonde distincte**, caractérisée par preuve le 10/06 : **flow-6** = total quote non rendu (contrat items POST OU page quote) ; **flow-8** = tab « données/rgpd » click timeout (interception ?) ; **flow-5** = **canvas WebGL designer** (dur en headless — la spec elle-même : « hardest flow, everything is canvas ») ; **flow-4** = `/ikea/search` **live renvoie `[]`** (intégration externe, pas seeds) ; **flow-7** = Stripe (externe, skip) ; **flow-1 (les 3 tests) = cookie-consent submit-intercept CONFIRMÉ RÉEL (re-test stack-up 12/06)** : verdict définitif prouvé au runtime — la bannière `CookieConsent` (`role="dialog"`, `fixed inset-x-0 bottom-0 z-[100]`, montée globalement App.tsx:45, `setVisible(true)` au mount si pas de consent stocké) **intercepte le clic du bouton register** (`<Button type="submit" fullWidth>` en bas du form) sur les **3 tests** ; signature Playwright `…cookie dialog… subtree intercepts pointer events` au `.click()`. **#109 (Provider redux) est ORTHOGONAL** (il a fixé le crash *dashboard* = étape finale ; pas le clic register = amont). **Le revert du fix dismiss-consent (08/06) était une ERREUR** : la « régression flow-2 » invoquée était en réalité le crash store-null (fixé par #109), pas le dismiss. **FIX ✅ APPLIQUÉ + MERGÉ (#152, 12/06)** : override de la fixture `page` dans `e2e-critical/_fixtures.ts` pré-seedant `localStorage['kx.cookie-consent.v1']` (avec `decidedAt`) avant mount → `loadConsent()` non-null → bannière jamais rendue → plus d'interception. **TEST-ONLY, zéro modif app**, s'applique à tous les flux. **Validé local (stack-up)** : flow-1 **test 1 PASSE** (rouge avant), **flow-2 2/2 vert = AUCUNE régression** → **prouve que le revert 08/06 était bien un mauvais diagnostic** (la « régression flow-2 » = crash store-null, fixé par #109). **MAIS débloquer la couche cookie-consent RÉVÈLE la couche suivante** : flow-1 **tests 2 & 3 échouent encore** sur une couche **distincte plus profonde** — test 3 = texte « déjà utilisé » non rendu (gestion email dupliqué backend/affichage), test 2 = dashboard non atteint (signup→verify→re-login→dashboard). **Rule #4 respectée : couche suivante NON chassée le 12/06** (session diagnostic dédiée à prévoir). + a11y **login** `color-contrast` 1 node = **flaky**. **🎓 ACQUIT MÉTHODO** : **plusieurs causes peuvent coexister sur un même flux** — fixer la 1ʳᵉ (cookie-consent) ne verdit pas forcément le flux, ça **révèle la suivante** ; ne pas conclure « résolu » tant que TOUS les tests du flux ne passent pas. **Audit effet-de-levier (12/06 PM) = INCONCLUSIVE** : l'hypothèse « cookie-consent = couche commune → flow-2/4/5/6/8 auraient verdi via #152 » **n'a pu être ni confirmée ni infirmée** (la CI E2E ne fournit aucune data par-flow — cf finding « E2E CI setup-fail » ci-dessous ; seuls flow-1+flow-2 testés en local). **Recommandation** : ne pas brute-forcer (WebGL/IKEA/Stripe = mock/infra) ; follow-ups ciblés.
  - [ ] **🔄 Catalog color-contrast data-driven (révisé 08/06)** : initialement « hard fail 4-5 nodes » au run #99 (27098689257) ; mais **passe** aux runs 27101791465/27156750366 → en réalité **flaky data-driven** (variance seed/timing du contenu peuplé), pas déterministe. Reste à traiter en stack-up (a11y des cartes fournisseurs), mais re-qualifié **flaky** et non-bloquant systématique.
  - [⚠️ DIAGNOSTIQUÉ 12/06 PM — cause = BILLING Actions, action compte requise] **🔴 CI setup-fail ACCOUNT-WIDE — plus AUCUN workflow ne s'exécute sur main** : **TOUS** les workflows (E2E, `🎨 Frontend CI`, CodeQL) échouent au **1er job** (`📦 Setup & Cache` / Playwright setup) en **2-3 secondes**, puis tous les jobs suivants `skipped` (cascade). **Aucun test ne tourne** (log vide, steps non exposés via `gh`). **Bascule datée par preuve** : dernier run NORMAL = `27279720628` (c9f5da6/#129) le **10/06 13:28→13:40 (~12 min, tests exécutés)** ; 1er fast-fail = `27283070271` (5ca7709/#128) le **10/06 14:23 (5s)**. **Verdict D = blocage BILLING/spending-limit GitHub Actions (§14.3)** — prouvé : (1) le commit de bascule est **doc-only** (#128) ; (2) **e2e.yml inchangé** (dernier changement #104, ancien) ; (3) **account-wide** (Frontend CI fast-fail aussi : Setup&Cache 3s ; avant la bascule il tournait ~1-1.5 min/job) ; (4) bascule après une **journée 10/06 de CI très lourde** (marathon multi-PR → chaque PR = E2E+Frontend CI+CodeQL → budget Actions 20$/mois épuisé ~14h). **Écarté** : régression workflow/code (impossible sur un commit doc + e2e.yml inchangé + tous workflows touchés), transient (persistant 2+ jours). Le message exact (« spending limit / payment failed ») **n'est lisible que dans l'UI billing**, pas via `gh`. **FIX (action COMPTE, pas du code — à faire par Laurent)** : (a) `https://github.com/settings/billing/summary` → vérifier **Actions** (limite atteinte ? paiement échoué ? cf §14.3 autorisation PayPal `B-35J44897SL316563E`) ; (b) **remonter le budget Actions** (>20$) OU attendre le **reset du cycle de facturation** ; (c) re-déclencher un run (`gh run rerun` ou push) pour confirmer le déblocage. **Tant que c'est bloqué, la CI ne valide RIEN sur main → toute vérif passe par stack-up local.** **Acquit** : un setup-fail account-wide en 2-3s sur TOUS les workflows = signature billing, pas régression — diagnostiquer par les **durées de job** + « quel workflow/commit a basculé » avant de soupçonner le code.
  - **🆕 AUDIT « 5e pattern de bug latent » (12/06, workflow 4 agents read-only) — verdict B : 5e pattern confirmé + 3 généralisations.** Aucun fix (audit pur). 4 clusters :
    - [x] **🔴 RÉSOLU 13/06 (défaut silencieux NODE_ENV) + ⚠️ FAUX POSITIF (`.env` commité)** : (a) **NODE_ENV silent default — CORRIGÉ** (branche `security/nodeenv-harden`) : retrait du `.default('development')` sur `nodeEnvSchema` (`env-validator.ts:82`) → NODE_ENV devient **requis** ; un boot sans/avec valeur invalide hard-fail via le chemin existant `validateEnv → process.exit(1)` (prouvé en isolat : `exit(1)` + stderr `- NODE_ENV: Required`). Plus de bascule silencieuse en `development` qui activerait le backdoor `/auth/dev/verify-email` + cookies `secure:false` + CSP/HSTS off. Garde backdoor `!== 'production'` **conservée** (actif dev+test pour l'E2E) + **audit-log `logger.warn('[SECURITY] dev backdoor … invoked', { email, nodeEnv })`** ajouté à chaque appel. Fallback `app-config.ts:6 || 'development'` **conservé** (le retirer = risque ordre-d'imports §11 P2, hors scope ; validateEnv protège déjà le boot). Enum `['development','production','test']` inchangée (ne PAS ajouter `'staging'` → réactiverait le backdoor en staging). Build backend OK + 64/64 tests auth-routes verts, 0 régression. **forcer `NODE_ENV=production` dans Dockerfile/start prod reste à faire (§14)**. (b) **`.env` commité = FAUX POSITIF** : l'affirmation du 12/06 reposait sur `git ls-files .env && echo "TRACKED"` — or `git ls-files <fichier-non-tracké>` **exit 0 avec stdout vide**, donc le `&&` se déclenchait à tort. **Re-vérifié par preuve 13/06** : `git ls-files --error-unmatch .env` → *« did not match any file(s) known to git »* (NON tracké) ; `git log --all -- .env` → **0 commit** (jamais commité) ; `git status --ignored` → `!! .env` (bien gitignoré, `.gitignore:33`). **`.env` n'a JAMAIS été commité** → aucun secret dans l'historique git, `git rm --cached` + history-scrub **SANS OBJET**. La régénération des secrets (`JWT_*`, Upstash, etc.) reste un **prérequis prod normal (§14.1)**, plus une urgence sécu. **🎓 Acquit** : `cmd && echo OK` **ment** quand `cmd` exit 0 sur stdout vide — valider une assertion git avec `--error-unmatch` / `git log`, jamais un `&&`.
    - [x] **🟡 Workflows : branche `develop` inexistante (dead-config ×6) — RÉSOLU 13/06 (branche `chore/dead-workflows-cleanup`)** : inventaire frais confirmé = **6 workflows** réfèrent `develop` (sur 10), **branche `develop` inexistante** (local+remote), **0 run** sur develop (100 derniers), **aucun `workflow_run`/reusable** (édition sûre). **PRUNE appliqué** : (a) 5 CI (ai-modules/backend/codeql/data-pipeline/frontend) `[main, develop]`→`[main]` (push+PR) — 0 changement de comportement (main couvert, develop n'a jamais tourné) ; (b) `deploy-staging.yml` — seul auto-trigger = `push:[develop]` (jamais déclenché) **retiré**, `workflow_dispatch` **conservé** (déploiement manuel, cohérent avec deploy-prod, jusqu'à ce qu'une branche develop + un vrai staging §14.2 existent) + commentaire. **Prouvé** : 6/6 YAML valides, 0 `develop` résiduel dans les triggers, couverture `main` intacte. Diff +15/−12.
    - [x] **🟡 Tests silencieux (généralise #133) — RÉSOLU 13/06 (branche `chore/tests-muets-cleanup`)** : inventaire frais (≠ estimation audit) = **49 fichiers 0-octet** dans api-client/common/ui-components = **25 stubs `*.test.*`** (api-client 3, common 12, ui-components 8 sous `tests/` + 2 `theme/` co-localisés) **+ 24 fichiers support** 0-octet (mocks, e2e/page-objects, setup, utils). **Tous supprimés** (`git rm`, 0 référence externe, builds 3/3 verts, 0 fonctionnalité touchée). **⚠️ Le cadrage « FIX-ROOTS » de l'audit était INVALIDE** (prouvé) : les 3 packages ont `roots:['<rootDir>/src']` MAIS **0 vrai test** nulle part (ni `src/`, ni `tests/`) — pointer roots sur `tests/` n'aurait découvert que des fichiers vides → Jest erreur « must contain at least one test ». La bonne action = **suppression**, pas fix-roots. **🆕 Dette résiduelle (runner cassé, P3 séparé)** : ces 3 packages ne sont pas réellement testables — `common` ne déclare **pas** jest ; `ui-components` manque `jest-environment-jsdom` (requis par sa config `testEnvironment:'jsdom'`) ; `roots:src` → 0 test découvert. Les rendre testables (déclarer/installer jest + écrire de vrais tests) = chantier dédié. **🎓 Acquit** : un audit qui compte des fichiers ne prouve pas qu'ils CONTIENNENT des tests — vérifier la taille/contenu avant de proposer un « fix-roots ».
    - [x] **🟡 Scripts no-op root (généralise #115/#131) — RÉSOLU 13/06 (branche `chore/dead-scripts-cleanup`)** : inventaire frais = **7 scripts root no-op** (pas 5) délégant à des scripts backend **inexistants** : `test:smoke`, `migrate:test`, `seed:test`, `start:test`, `migrate:staging`, **+ `test:integration`/`test:api`** (les 2 derniers ont AUSSI un script root no-op, en plus du guard CI #115). Carte des appelants (grep workflows/docs/hooks) : `migrate:test`/`seed:test`/`start:test` = **0 appelant** (remplacés par #76 qui appelle `prisma:push`/`db:seed`/`start` en direct) ; `test:integration`/`test:api` = backend-ci **guardé #115** ; `migrate:staging` = deploy-staging **guardé #131** ; `test:smoke` = deploy-prod:243 + deploy-staging:226 **NON guardés** (= vraie landmine : smoke test factice exit 0 sur deploy). **Décision HYBRIDE (implémenter > retirer là où ça a du sens)** : (a) **`test:smoke` IMPLÉMENTÉ** en vrai — `packages/backend/scripts/smoke-test.mjs` (GET `<API_URL>/health` + FRONTEND_URL, **fail-loud exit 1** sur non-2xx/timeout/erreur ; cible via `--url=`/`API_URL`/défaut localhost:4000, miroir des 2 appels deploy). **Prouvé** : exit 1 direct + via chaîne `pnpm test:smoke --url=…` (arg propagé root→--filter→node). (b) **3 orphelins SUPPRIMÉS** (migrate:test/seed:test/start:test — 0 appelant). (c) **Laissés** : test:integration/test:api (guardés #115 ; « implémenter » = **vraie suite** = chantier, pas un script ; couverture réelle = e2e) + migrate:staging (guardé #131 ; **infra staging §14.2 inexistante** = prématuré). **🎓 Acquit** : « implémenter ou retirer » se tranche par script — vrai consommateur + implémentation réelle → implémenter (test:smoke) ; alias que le CI bypasse → retirer ; suite/infra absente → laisser guardé. **🆕 Résiduel (P3)** : 3 docs (CONTRIBUTING/getting-started/ci-integration) citent `pnpm test:integration` (script root encore présent, no-op) → à traiter avec le chantier « vrais tests d'intégration » (#115).
    - **✅ 5e PATTERN ENTIÈREMENT TRAITÉ (13/06)** : les 3 sous-findings de l'audit 12/06 sont clos sur leurs branches respectives — A (workflows `develop` mort, PR #159), B (tests muets, PR #158), C (scripts root no-op, cette branche). NODE_ENV/`.env` (le finding initial) = PR #157. **5 PRs ouvertes en attente review** (#157→#159 + #158). Chaque sous-finding a révélé un **écart inventaire vs estimation** (B: 49 vs 26 ; C: 7 vs 5 ; A: 6 = exact) — la posture « mesurer, pas croire » a payé à chaque fois.
  - **PR #79 (Build backend)** : **MERGÉE 06/06** (`58ffef6`) — e2e désormais rouge **informatif** sur main (atteint les vrais écrans) jusqu'au traitement de 7f.
- [ ] **Double-source DB env — `DB_*` boot-bloquants en prod** (ancré 03/06 ; déjà noté en prose §12 PR #53) : le backend a 2 clients Postgres co-existants — Prisma (`DATABASE_URL`) + pg natif (`connection.ts` lit `DB_HOST/PORT/USER/PASSWORD/NAME` via `app-config.ts:14-21`). Le validator ne couvre que `DATABASE_URL` (`DB_*` en `.optional()`), mais le pool pg se connecte au boot → sans `DB_*` en prod, défauts localhost → `exit(1)`. Implications : (a) tout `.env` prod doit fournir les deux (PR #84 corrige le template) ; (b) **overlap avec §11 P2 « Backend dotenv cleanup »** — à traiter ensemble. Option de fond : dériver `DB_*` de `DATABASE_URL` (parse URL) pour une source unique.
- [ ] **react-query inutilisé (mineur, trouvé 10/06 audit câblages)** : `QueryClientProvider` + `queryClient` (defaultOptions staleTime 5min/retry 1) sont configurés dans App.tsx mais **aucun `useQuery`/`useMutation`** consommateur (les pages utilisent `services/api` + fetch direct + Redux thunks). Provider **no-op** (inoffensif, pas un crash). Décision : laissé en place (possiblement intentionnel pour usage futur) ; si confirmé mort → retirer `QueryClientProvider` + dép `@tanstack/react-query`. Auto-challenge requis (vérifier 0 usage indirect) avant retrait.
- [ ] **Dead-utils frontend mineurs (trouvés 10/06 audit « même classe » 1.B)** : (a) `packages/frontend/src/utils/pdf-export.ts` jamais importé (le code PDF réel vit dans `services/pdf-quote-generator.ts`, consommé par ExportPanel) → supprimer ou fusionner ; (b) `packages/frontend/src/utils/financing-helpers.ts` (`formatMonthlyPrice`) réimplémenté localement dans `pages/Financing/FinancingCalculator.tsx` → utiliser le util ou retirer le duplicata. Non bloquant (warning), à nettoyer en mission dead-code. Le reste du câblage (routes/routers/Providers) = sain (audit #131).
- [x] **SKU-binding sur les items de scène — gap 3 §15.7 résolu pour les items catalogue placés (Slice 1, #219, 30/06)** : un item catalogue posé dans la scène 3D ne portait PAS son `sku` réel → ni `/colors`, ni l'export IFC ne pouvaient le retrouver (l'`ifc-exporter` lit `obj.userData.sku` mais CatalogPanel ne le posait jamais → **IFC sans SKU** depuis l'origine). Fix **frontend-only, minimal** : `sku?: string` ajouté aux interfaces `CatalogItem` + `CatalogProduct`, propagé dans le mapping API et dans `handleAddItem` → `mesh.userData.sku = item.sku` ([CatalogPanel.tsx](packages/frontend/src/components/designer/CatalogPanel.tsx), 4 lignes additives). **Preuves** : (a) 1er test de CatalogPanel (`__tests__/components/designer/CatalogPanel.test.tsx`) — `userData.sku === product.sku` + cas sans sku → `undefined`, pas de crash (2/2 verts) ; (b) end-to-end IFC (harness jest jetable) — l'export produit `IFCPROPERTYSINGLEVALUE('SKU',$,IFCTEXT('CASTORAMA-4251421945043'),$)`. **Piège capitalisé** : un mock `useTranslation` renvoyant un `t` d'identité fraîche à chaque render fait recomputer le `useMemo localCatalogItems` (dep `[brandProfile, t]`) → re-déclenche l'effet `[localCatalogItems]` → boucle de rendu infinie **masquée** par le `console.error` mocké du setup ; react-i18next renvoie un `t` stable → le mock doit aussi. **Reste (Slice 2, greenfield)** : la surface UI « Couleurs catalogue » (color-picker exploitant `/colors` + `parentSku`, P7) — non couverte par cette PR (besoin design/bencium). Le gap 3 « binding layout→SKU » côté **AI layout-generator/cabinet-solver** (§15.7 C) reste distinct et ouvert.
- [x] **`_seeds` non modélisée -> dérive `db push` (RÉSOLU 21/06, #186)** : la table bookkeeping du seed-runner (`CREATE TABLE _seeds` au runtime) n'était pas dans `schema.prisma` -> tout `db push` depuis le 26/05 tentait de la dropper (data-loss). Modélisée `model Seed @@map("_seeds")` byte-for-byte (varchar(255), `executed_at` nullable). Futur `db push` la préserve.
- [x] **Lint backend : ESLint propre + tsc dé-doublonné (FAIT #193, 24/06)** : 19 erreurs ESLint corrigées (toutes SAFE), step tsc redondant retiré du job Lint (gate dans le job standalone #191), job renommé "Lint".
- [x] **Chantier formatage repo-wide (RÉSOLU 27/06, #207-#211)** : la passe Prettier a révélé une pile de prérequis CI cachés, tous traités. Config Prettier frontend `.js`→`.cjs` (#207, crash ESM sous `type:module`). CI frontend rendue honnête : cache `node_modules` empoisonné → `--frozen-lockfile` par job + mirror `pull_request.paths` (#208), build workspace deps avant ESLint pour résoudre les types (#209, tuait 17 faux positifs `no-redundant-type-constituents` + ~1000 warnings parasites). Prep : `.prettierignore` (guides Astro) + suppression de `stylelintrc.js` mort (#210). Passe `--write` finale sur 1193 fichiers (#211), validée par preuve (tsc 0/0, suites 1650+1226 vertes, prettier --check 0) → **Lint & Format Check vert sur main**. `CLAUDE.md` exclu du formatage (`.prettierignore`, doc vivant, éviter le churn proseWrap).
- [x] **Cleanup `config/linters/` (RÉSOLU 28/06, #215)** : les 3 orphelins `eslintrc.js`/`prettierrc.js`/`commitlintrc.js` (scaffolding mort du commit initial 21/02, parsables mais 0 référence fonctionnelle) supprimés via `git rm` — le dossier `config/linters/` entier a disparu. Re-confirmé par preuve avant retrait : 0 hook husky, package.json sans clé config/lint-staged, vraies configs résolues à la racine (`.eslintrc.js`/`.prettierrc.js`/`.commitlintrc.json`) + `packages/*`. Post-suppression vérifié : ESLint/Prettier/commitlint résolvent toujours leur config (commitlint `subject-empty` se déclenche = `.commitlintrc.json` actif). Complète #210 (qui avait retiré `stylelintrc.js` cassé).
- [x] **`aiUnauthRateLimiter` plafonnait les users AUTHENTIFIÉS à 5/h sur `/ai-chat` (ordre des middlewares) — RÉSOLU 28/06 (#217, Option A)** : le mount `router.use('/ai-chat', aiUnauthRateLimiter, aiChatRoutes)` exécutait `aiUnauthRateLimiter` (5/h par IP) **avant** `authenticate` (par-route) → `req.user` `undefined` au mount → son `skip(authenticated)` ne se déclenchait **jamais** → les requêtes authentifiées étaient comptées 5/h au lieu des 20/h de `aiRateLimiter`. **Fix (Option A, minimal)** : insérer `optionalAuth` (tolérant, déjà existant) **avant** `aiUnauthRateLimiter` au mount `/ai-chat` **et** `/ai-search` ([routes/index.ts](packages/backend/src/api/routes/index.ts)) → `req.user` peuplé avant le limiter → `skip` se déclenche pour les connectés. **Aucun changement** sur les limiters eux-mêmes, ni les routes per-route, ni les mocks (aucun test ne monte index.ts → mount non exercé ; ai-chat + execute-shopping-tool 42/42 verts). **Prouvé en stack-up (`NODE_ENV=development`, limiters actifs)** : (1) 6 POST `/ai-chat/shopping` authentifiés d'affilée → **6/6 HTTP 200** (6ᵉ ≠ 429, ≠ le 429 de #216) ; (2) POST `/ai-chat/shopping` anonyme → **401** (`authenticate` per-route), pas 429 (`optionalAuth` ne bloque ni ne 401).
- [x] **Palier 5/h anonyme `/ai-chat` retiré — DÉCISION PRODUIT TRANCHÉE « pas d'usage anonyme » (RÉSOLU 29/06, #218, Option C)** : l'audit #217 avait montré que **toutes** les routes `/ai-chat` (et `/ai-search`) sont `authenticate`/401 → aucun coût Anthropic atteignable anonymement, donc le palier « 5/h anonyme » ne protégeait que du flood-401 (déjà couvert). **Décision Laurent : jamais d'usage anonyme** → `aiUnauthRateLimiter` **supprimé** (définition + import + retiré des 2 mounts `/ai-chat` + `/ai-search`) ; `optionalAuth` au mount (ajouté #217 pour ce limiter) **retiré aussi** (devenu mort — les handlers ont déjà `authenticate` per-route). **`aiRateLimiter` (20/h/user authentifié) INTACT** (`ai-chat-routes.ts` non modifié). **Flood-401 reste borné** par le limiter global `/api/` ([app.ts:64-69](packages/backend/src/app.ts#L64) — 100/15min/IP, prouvé runtime : header `x-ratelimit-limit: 100`). **Prouvé en stack-up** : (1) POST `/ai-chat/shopping` authentifié → **200** ; (2) anonyme → **401** (inchangé) ; (3) `rg -nw aiUnauthRateLimiter` = **0** référence. Tests `ai-chat`/`execute-shopping-tool` 42/42 verts.

---

## 12. Historique des décisions

- **14/05/2026** : Audit initial complet. Stratégie "migration douce" validée. Décisions : Pricing 29€/99€ confirmé, scroll marketing complet, TrustBar lucide-react (TrustStack SVG inline gardé), LiveCounter conservé, Hero en A/B test HeroVideo vs Hero3D.
- **15/05/2026** : Phase 1 P0 terminée (7 tâches cochées). Phase 1 P1 entamée (1 tâche cochée : nettoyage code mort HomePage). 20 commits propres sur la branche `feat/design-system-migration`. Détection de 4 nouvelles dettes ajoutées en P3.
- **16/05/2026** : PricingPage refonte palette KX terminée (commits 321141b + 5765fc4). 36 tests passent. Vérification visuelle validée (screenshot light mode propre, card Pro gradient indigo→fuchsia, checkmarks cyan, badge -20% amber). Détection de 5+ dettes techniques en environnement dev (Plausible nav bug, sw.js, fonts woff2, tokens.css surface/border) — toutes ajoutées au §11.
- **17/05/2026** : Fix partiel du bug Plausible nav en dev (commit 5650135). Le wrap pushState Plausible a disparu (le log `[Plausible] disabled in dev` apparaît, le log `Ignoring Event: localhost` a disparu), mais le clic sur `<Link>` ne navigue toujours pas en localhost. Cause secondaire à isoler dans une session ultérieure. Workaround validé : URL directe dans la barre d'adresse fonctionne.
- **17/05/2026** (suite) : Suppression complète du bloc Metrics sur HomePage (commit 02d41fe). Décision motivée par sécurité juridique pré-launch : les 4 stats étaient soit doublonnées (50k+ vs LiveCounter live), soit aspirationnelles non mesurées (98% satisfaction, < 3 min génération, 24/7 support). Risque pratique commerciale trompeuse au sens article L121-2 du Code de la consommation. Grep projet-wide confirmé zéro occurrence résiduelle de ces claims.
- **17/05/2026** (suite 2) : Fix du warning console `fetchPriority` sur HeroVideo (commit 388e5cd). Spread cast vers attribut HTML lowercase `fetchpriority`, après tentative `@ts-expect-error` échouée (limitation TypeScript sur attributs JSX). Warning runtime confirmé absent post-fix. Tests 1203/1203 passent.
- **17/05/2026** (suite 3) : Audit de la dette "tokens.css surfaces dark" (§11 P3). Découverte : faux positif. Les variables `--kx-surface`, `--kx-border`, `--kx-fg-muted` documentées comme bugs dark mode sont en réalité du code mort — pattern alpha intentionnel (RGB blanc + opacité à la consommation), mais zéro consommateur dans le projet. Reclassé en "fausse alerte". Aucune modification de tokens.css. Mission menée par audit-first qui a permis d'éviter une fausse correction.
- **17/05/2026** (suite 4) : Documentation du setup dev complet (frontend+backend via `pnpm dev` à la racine + Turbo). Le script global existait déjà, dette §11 P2 résolue par pure doc dans README.md + CLAUDE.md.
- **17/05/2026** (suite 5) : Résolution du bug nav React Router localhost après investigation 2 jours (commit c8a1ff4). Cause racine identifiée : Links absolus sans préfixe locale → LocaleAwareShell redirige vers /fr/. Découverte que ce bug existait AUSSI en production (CTA Header non fonctionnels pour les utilisateurs finaux). Fix par import alias LocalizedLink. 3 Links résiduels HomePage (CTA + Footer) à traiter en mission séparée. Dette §11 P0 cochée.
- **17/05/2026** (suite 6) : Finalisation du fix nav React Router. Commits 4c516e8 (3 Links résiduels HomePage migrés vers LocalizedLink) + 534d540 (5 Footer broken paths corrigés via Strategy C : adapter /designer → /designer/sandbox, supprimer /marketplace + col Ressources). Audit Header au passage : 9/9 paths valides, gating par isAuthenticated, aucune dette latente. Footer passé de 11 à 7 liens 100% fonctionnels. Bug latent en production éliminé. Dette résiduelle Nav() locale documentée pour mission ultérieure.
- **17/05/2026** (suite 7 / fin de session) : Résolution de la dette police Inter (commit ccc32be). File manquant downloadé manuellement depuis Inter v4 et committé pour build hermétique. Découvert au passage que le script fetch-fonts.sh est obsolète (nouvelle dette P3 ajoutée). Session du jour close à 41 commits.
- **19/05/2026** : Résolution complète du trio Service Worker (commits 974e351 + b26ac26 + 288e549 + 88efb29). 4 missions en chaîne :
  - D (974e351) : suppression Nav() locale HomePage (–36 lignes, élimine duplicate "2x Tarifs")
  - Sync doc (b26ac26) : 2 dettes §11 P1 cochées (accent-warm + Nav())
  - SW2+SW3 (288e549) : élimination du SW en dev. Découverte critique : 2 sources d'enregistrement existaient (main.tsx + bloc inline index.html). Le bloc inline était l'origine cachée des erreurs SW depuis l'origine du projet.
  - SW1 (88efb29) : fix Cache.put 206 avec Stratégie A élargie (response.ok && status !== 206). Bonus : élimine cache pollué par 4xx/5xx.
  Branche feat/design-system-migration safe pour merge main (4 dettes P1 résolues). 46 commits cumulés.
- **22/05/2026** : Session "poster Hero premium". Deux phases :
  1. **Tentative Hero3DInteractive ABANDONNÉE** — création d'un composant Three.js low-poly programmatique (28 meshes, cuisine basique). Résultat visuellement décevant (cuboïdes sombres, rendu pas premium, ambiance loin du fil rouge marketing). Revert complet, aucun fichier conservé. DÉCISION D'ARCHITECTURE : la 3D temps réel n'a pas sa place dans le Hero d'une homepage marketing — elle vit dans le Designer (SandboxCanvas) où l'utilisateur conçoit. Vérification concurrentielle : IKEA Home Planner, Schmidt, Houzz utilisent tous photo/vidéo en Hero, pas de 3D temps réel. Variant B du A/B test §6.2 écarté (cf §11 P1 reclassement).
  2. **Poster Hero premium réparé (commit 7d737e1)**. Bug latent découvert : le `<picture>` de HeroVideo.tsx affichait une image cassée (broken icon + alt text visible) depuis l'origine du projet. Cause : 8/9 assets Hero manquaient — `hero-poster.jpg`, `@2x.jpg`, et 6 vidéos .webm/.mp4 jamais committés. Seul `hero-poster.svg` existait, mais le `<picture>` essayait d'abord le JPG. Le commentaire JSX du `<picture>` mentait sur l'ordre des `<source>`. Résolution : génération image cuisine premium via Krea.ai (modèle Krea 2 Grand + amplificateur 2x) — cuisine minimaliste, marbre noir, hotte inox, lumière 2700K, ambiance architecturale haut de gamme. Optimisée en `hero-poster.jpg` (1280×710, 92KB) + `@2x.jpg` (2048×1136, 207KB). Commentaire `<picture>` corrigé. 4 dettes résiduelles non bloquantes basculées en §11 P3 (vidéos manquantes, SVG fallback désaligné, encode-script absent, dormants 0-byte).
- **23/05/2026** : **HowItWorks migré vers primitive Card** (dernière dette P2 actionnable hors SandboxMigrationBanner). Commits **594c63b** (feat ui : prop polymorphique `as` ajouté à Card, pattern générique réutilisable) + **ee1869c** (refactor : HowItWorks Step utilise `<Card as="article">` au lieu d'un `<article>` brut). Card primitive est désormais le wrapper canonique pour toutes les surfaces type "carte" du projet, quelle que soit la balise sémantique cible (article, section, div, …). Décochage rétroactif effectué le 27/05.
- **24-25/05/2026** : **Migration cloud effective.** Trois chantiers en parallèle :
  1. **Supabase PostgreSQL** : projet créé en `eu-west-3`, schema Prisma déployé via `prisma db push` (63 tables). Commits 70f96b3 (datasource directUrl), 5126f4b (load root .env), ff69267 (common compile CJS — fix backend ESM dir-import crash), 2335acb (dev scope backend+frontend — fix Turbo concurrency), bbb2a91 (turbo v1 `tasks` → `pipeline`). Le `.env` racine devient source unique des credentials DB.
  2. **Upstash Redis** : connexion TLS `rediss://`. **Circuit breaker production-grade** implémenté dans `redis-client.ts` (commit d3b5a51) : bound boot connect (le boot ne reste pas bloqué si Redis est down), half-open retry (réessaie périodiquement après cooldown), fail-fast en cooldown (pas de timeout côté caller). Le backend démarre même Redis injoignable.
  3. **Vite frontend** : binding IPv4 explicite `host: '127.0.0.1'` (commit a7de96d). Fix Windows IPv6-only ERR_CONNECTION_REFUSED qui bloquait l'accès au dev server sur certaines configs.
- **26/05/2026** : **PR #44 — merge `feat/design-system-migration` → `main`** (commit de merge `7f8e228`, **62 commits** intégrés à main, fast-forward propre, zéro conflit). Lancement de la branche `feat/seeds` : application du seed runner sur Supabase (7 seeds, **~160 rows** : 5 rôles, 7 users démo bcrypt SALT=12, 21 permissions + mappings, 8 catégories + ~42 produits IKEA/LM/Castorama/Schmidt + 11 appliances Bosch, 4 projets + 2 collaborateurs, 4 cuisines). LiveCounter affiche désormais "4" cuisines — premier signal stat public réel.
- **27/05/2026** : **Rangement CLAUDE.md.** Décochage rétroactif HowItWorks (oublié au moment du commit du 23/05). §3 Stack mise à jour pour refléter le cloud effectif (Supabase + Upstash + Vite host IPv4). §13 recompte (P2 : 1 actionnable restante = SandboxMigrationBanner ; P3 : 20 actionnables après ajout des 2 nouvelles). Ajout §14 **Roadmap Production** dédiée (sécurité secrets exposés, infra prod séparée dev/prod, CI/CD GitHub Actions facturation, CORS/SSL) — sujets discutés en sessions 24-26/05 mais jamais tracés dans le fichier. Nouvelles dettes P3 : bug `prisma.installer.count(status)` sur `/api/v1/stats/public` + hygiène 36 branches.
- **27/05/2026 (soir)** : **Chantier Dependabot lancé + découverte d'un override pnpm toxique.**
  1. **Audit des 32 PRs Dependabot ouvertes** (révélées par `git fetch --prune` lors du ménage des branches). Classement en 4 lots de risque (cf §14.5) : 🟢 Lot 1 (11 patchs/minors sûrs), 🟡 Lot 2 (6 GitHub Actions + dotenv), 🟠 Lot 3 (5 minors à churn three/lucide), 🔴 Lot 4 (8 MAJEURES : prisma 5→7, react-router 6→7, node 20→26, typescript 6, redis 4→5, zod 3→4, nodemailer 6→8, @typescript-eslint 6→8).
  2. **Lot 1 entamé — 5 PRs mergées (Squash sur `main`)** : #25 `@types/node` 20.19.33, #18 `react-hook-form` 7.71.2, #29 `styled-components` 6.3.11, #28 `jspdf` 4.2.0, #30 `@google/genai` 1.42.0. Site validé post-merge (LiveCounter à 4, UI intacte).
  3. **Régression au smoke test backend** : crash `TypeError: pathRegexp is not a function` sur Express 4.22.1. **Cause racine** : un `pnpm.overrides "path-to-regexp": "^6.3.0"` **dormant** depuis le 13/05 (commit edb726b) s'est **réveillé** quand les PRs Dependabot ont régénéré `pnpm-lock.yaml`. Express 4 appelle path-to-regexp comme une **fonction** (API v0.1.x default export callable) ; v6 exporte un **objet** (named exports) → crash immédiat. Express est le **seul consommateur** de path-to-regexp dans tout l'arbre — l'override était à la fois **inutile** (CVE-2024-45296 déjà backportée en 0.1.10+) ET **nuisible** (cassait Express 4 dès régénération propre du lockfile).
  4. **Fix (PR #47, merge `41aa00e`)** : suppression sèche de la ligne d'override + `pnpm install`. Express retombe naturellement sur `path-to-regexp@0.1.13`. Backend redémarre OK. Diff net : `+1 -1` package, aucun autre paquet déplacé.
  5. **Bonus** : fix `Installer.count()` (PR #46, mergée plus tôt dans la journée) validé en live dans les logs serveur : la requête utilise bien `isVerified: true` + `isActive: true`, `/api/v1/stats/public` renvoie 200 sans `prisma:error` résiduel. Dette §11 P3 "bug Prisma stats" effectivement résolue.
  6. **Réflexe lockfile noté** : si `git pull` râle sur `pnpm-lock.yaml` après merge GitHub, faire `git checkout -- pnpm-lock.yaml` avant pull (le lockfile local est obsolète vs main, le repo cloud est la source de vérité). Méthode validée par lot : merger par paquets, `pnpm install + pnpm dev` après chaque paquet — c'est ce qui a permis d'attraper la régression Express avant qu'elle ne s'enchaîne avec les lots suivants.
- **27/05/2026 (fin de soirée)** : **Lot 1 Dependabot complet (11/11 PRs traitées).** Finalisation des 6 PRs restantes via `@dependabot recreate` (capture les bumps survenus entre l'audit du début de soirée et le merge) :
  - #31 `@storybook/react` → **8.6.18** (versionné en avant via recreate)
  - #23 `@storybook/react-vite` → **8.6.18**
  - #26 `@aws-sdk/client-s3` → **3.1056.0**
  - #21 `pg` → **8.18.0** — driver Postgres backend, **validé live** sur Supabase via Prisma : aucune régression sur les endpoints `/api/v1/stats/public`, `/api/v1/auth/me`, queries seeds/projets. Le bump était le seul risque réel du lot (pg = couche base de la prod data path).
  - #32 `prettier` → **3.8.3**
  - #27 `playwright` — **PR auto-closed** par Dependabot (probable rebump intermédiaire) ; pas d'action requise, Playwright reste à la version actuelle du lockfile. À re-vérifier si une nouvelle PR ré-ouvre.
  **Smoke test ~1h10 stable** post-merge sur `pnpm dev` : Express 4.22.1 tient toujours (fix override path-to-regexp de la soirée robuste), `Installer.count()` fix (PR #46) validé en live à nouveau dans les logs (`/api/v1/stats/public` 200, zéro `prisma:error`). Frontend Vite intact (LiveCounter affiche les seeds, navigation OK, HMR fonctionnel). Branche `docs/session-27-05-dependabot` prête pour décision merge → main. Prochaine cible : Lot 2 (GitHub Actions + dotenv), conditionné par §14.3 facturation Actions.
- **31/05/2026 (matin)** : **Audit pg lockfile drift + repro minimale dotenv 17 (audit-first, deux branches dédiées).**
  1. **Drift pg PR #21 caractérisé** (branche `chore/lockfile-sync-pg`, commit 2218c2a). `packages/backend/package.json` HEAD déclare `"pg": "^8.18.0"` (bump PR #21 effectif) mais `pnpm-lock.yaml` HEAD est resté à `specifier: ^8.11.3, version: 8.16.3` — la co-modification du lockfile dans la PR Dependabot a été perdue au rebase/squash. `pnpm install` local résout proprement à pg@8.21.0 (latest matching `^8.18.0`), diff lockfile 100% pg-scoped (`pg 8.16.3 → 8.21.0`, `pg-connection-string 2.9.1 → 2.13.0`, `pg-pool 3.10.1 → 3.14.0`, `pg-protocol 1.10.3 → 1.14.0`). Le `pg-protocol@1.10.3` vestigial reste avec `dev: true` car `@types/pg@8.16.0` (devDep) pin cette version dans ses runtime deps — sans impact runtime. Risque réel : `pnpm install --frozen-lockfile` (CI strict) échoue silencieusement sur `ERR_PNPM_OUTDATED_LOCKFILE`. Nouvelle dette §11 P3 "Lockfile drift après merge Dependabot" ajoutée pour formaliser le réflexe process.
  2. **Repro minimale dotenv 17 conclusive** (branche `chore/dotenv-17-minimal`, commit a10f4aa). Repro stricte de la PR #15 Dependabot (`packages/backend/package.json` : `dotenv ^16.4.1 → ^17.3.1` seul, sans aucun cleanup), diff lockfile = `dotenv 16.6.1 → 17.4.2` seul. Smoke test : `pnpm dev` démarre proprement, log backend montre les 4 `◇ injected env` de dotenv 17 (1 réel `(53)` depuis `..\..\.env` + 3 redondants `(0)`), `[SERVER] Running on port 4000` confirmé, DB+Redis connectés, `curl /api/v1/stats/public` renvoie `{"success":true,"data":{"kitchensDesigned":4,...}}` en 249ms. **Conclusion** : le bug `ERR_CONNECTION_REFUSED` observé sur la PR manuelle `dotenv-17-and-lockfile-sync` n'est **pas** causé par le bump dotenv 17. Coupable = cleanup des 3 `dotenv.config()` vestigiaux dans `app-config.ts` + `env-validator.ts` qui mitigent (en ré-injectant) un problème d'ordre d'imports sous-jacent (auth.service tiré avant env-validator, jwt.service lit `process.env` au module-eval). La §11 P3 "Backend dotenv cleanup" est mise à jour : note "PAS purement cosmétique" + protocole de cleanup safe avant retrait.
  3. **Bug Prisma `installer.count(status)` re-confirmé résolu** dans la repro 31/05 : la réponse JSON du stats endpoint comprend `verifiedInstallers: 0` (cohérent, 0 installer seed `isVerified=true` en DB), zéro `prisma:error` dans les logs. §11 P3 décoché.
  4. **Branches restées non mergées** : `chore/lockfile-sync-pg` (sync lockfile pg, atomic 1-fichier, sûr à merger immédiatement) + `chore/dotenv-17-minimal` (artefact d'audit, NE PAS merger — laisser Dependabot rebaser PR #15 après merge de la branche lockfile-sync). Branche courante post-session : `docs/session-31-05-pg-dotenv-audit`.
- **31/05/2026 (soir)** : **Marathon CI — 5 couches de bugs dépilées, 6 PRs mergées sur la soirée**. Session déclenchée par observation que la CI GitHub Actions ne tournait plus depuis plusieurs semaines. Pattern méthodologique strict appliqué : audit/decision/execution en 3 phases avec point d'arrêt validation utilisateur entre chaque, workflow hybride claude.ai (stratégie) + Claude Code (exécution).
  1. **Déblocage facturation Actions (cf §14.3)** : cause réelle identifiée (5 budgets à 0$ + Stop usage activé, pas un paiement échoué), résolu par ajout PayPal + budget 20$/mois.
  2. **Couche 2 — pnpm setup ordering (PR #52, commit 06c8738)** : 3 occurrences dans `e2e.yml` + `lighthouse.yml` où `actions/setup-node@v4 cache:pnpm` était appelé avant `pnpm/action-setup@v4`. Pattern canonique `pnpm/action-setup → setup-node` confirmé par doc officielle `actions/setup-node`. Fix atomic +3/-3 lignes.
  3. **Couche 3+4 — DB provisioning E2E (PR #53, squash c9249fc, 3 commits cumulés)** : (3a) `prisma migrate deploy` → `prisma:push` et `db:seed:test` (inexistant) → `db:seed` car le projet utilise `prisma db push` (1 seule migration historique sur 63 tables, cf §3) ; (3b) ajout `DIRECT_URL` env var requise par `schema.prisma:11 directUrl` declaration ; (3c) ajout 5 DB_* env vars discrets (`DB_HOST/PORT/USER/PASSWORD/NAME`) car le backend a 2 clients DB co-existents (Prisma + pg natif via `connection.ts` → `app-config.ts:14-21`), le pg natif tombait sur les défauts (`'postgres'`/`'kitchenxpert'`/`''`) → SASL fail. **Dette architecturale double-source DB env documentée** (déjà cohérent avec §11 P2 "Backend dotenv cleanup" — overlap à traiter ensemble).
  4. **Couche 5 — Turbo build workspace deps (PR #72, commit d322e95)** : workflow E2E + Lighthouse appelaient `pnpm --filter frontend build` (= `tsc && vite build`), or plain `tsc` (pas `tsc -b`) ne compile PAS les TypeScript project references — `packages/3d-engine/dist/index.d.ts` absent → ~40 erreurs TS6305 + cascade TS7006. Découverte clé : `turbo.json` était DÉJÀ correctement configuré (`@kitchenxpert/frontend#build` dependsOn `["^build"]`), CI était le SEUL contexte qui bypassait Turbo. Fix : remplacer `pnpm --filter frontend build` par `pnpm turbo run build --filter @kitchenxpert/frontend` aux 3 occurrences (e2e ×2 + lighthouse). Workflow audit Claude Code multi-sub-agents : 10 agents parallèles, 562k tokens, 143s.
  5. **Couche labeler — migration v4→v5 (PR #73, commit 6b8a98c)** : `.github/labeler.yml` 100% syntaxe v4 mais workflow `auto-label.yml` pin `actions/labeler@v5` qui exige des arrays de config options. Migration mécanique 1:1 des 14 labels (`label: -globs` → `label: -changed-files: -any-glob-to-any-file: -globs`), couverture glob 100% préservée, zéro changement de taxonomie. +62/-33 lignes. Workflow audit Claude Code : 4 sub-agents, 211k tokens, 153s. Limitation dogfooding : Auto Label sur PR #73 elle-même reste rouge car le workflow fetche `labeler.yml` depuis main (qui contient encore v4) pas depuis la branche — le fix se valide sur la PROCHAINE PR après merge.
  6. **Couche 6 identifiée non résolue** : run E2E post-PR #72 plante maintenant sur `Wait for services → wait-on http://localhost:4000/health` timeout. Backend démarre en background mais ne répond jamais. Probable env vars manquantes (Stripe, Anthropic API, AWS) au boot. Dette §11 P3 ajoutée pour session future.

  **Acquis méthodologiques** : pattern audit/decision/execution capitalisé dans skill mémoire Claude Code (`C:\Users\AA\.claude\projects\c--Users-AA-KitchenXpertProject\memory\feedback_working_style.md`) ; pattern "une PR = un fix logique" appliqué strictement (option β systématique sur α "tout-en-un") ; workflows multi-sub-agents validés pour audits profonds (~200-560k tokens par audit). Lighthouse a confirmé que le fix turbo a marché (Build frontend OK, TS6305 disparu) — les échecs Lighthouse résiduels sont des dettes produit (perfs/a11y/SEO réelles), hors scope CI. **6 PRs CI mergées dans la journée** : #50 (lockfile pg matin), #51 (doc session matin), #52, #53, #72, #73.
- **02/06/2026** : **Cluster Cleanup CI — 3 PRs CI mergées (#75, #76, #77) + reclassement CodeQL + découverte de 4 dettes en cascade**. Session reprise 2 jours après le marathon 31/05. Audit initial confirme CI rouge sur main (E2E couche 6 + CodeQL), 33 PRs Dependabot ouvertes (19 nouvelles en 4 jours dont 7 majeures Lot 4 désormais ouvertes), 7 dettes §11 P3 du 31/05 toujours actionnables. Décision stratégique : cluster « verdir les CI sauf E2E » avant d'attaquer Lot 2 Dependabot. Pattern audit/decision/execution maintenu strictement, point d'arrêt validation utilisateur entre chaque phase.

  1. **Phase 1 — CodeQL : ⛔ définitivement reportée.** Tentative API `gh api PUT /code-scanning/default-setup` → 404 (token gh manque le scope `security_events`). Vérification UI Settings → Code security and analysis : **l'option "Code scanning" n'apparaît PAS du tout**. Cause : **GitHub Advanced Security requis pour repos privés** (~49$/user/mois Enterprise). Décision : reporter jusqu'au passage en repo public au launch (CodeQL gratuit sur repos publics). Dette #2 reclassée `[⚠️ BLOQUÉ EXTERNE]`. L'hypothèse marathon 31/05 « 3 clics » était fausse (écrite sans tester la dispo réelle de l'option).

  2. **Phase 2 — frontend-ci TS6305 (PR #75, squash `65327f8`).** Fix mécanique 1:1 du pattern PR #72 sur 3 occurrences (l.105/144/190). Décision Option B sur le step test (pipeline dédiée `test:coverage` plutôt que forward `-- --coverage`). Périmètre strict. Dogfooding impossible (workflow file pas dans `on.pull_request.paths`). **Validé post-merge** : Frontend CI run 26839054057 montre `@kitchenxpert/3d-engine:build` en amont via turbo `^build`, puis `vitest run --coverage` passe les **1220 tests** (45 fichiers). Dette §11 P3 #3 résolue avec preuve directe.

  3. **Phase 3 — backend-ci provisioning DB (PR #76, squash `526c36d`).** L'audit Claude Code a découvert **3 casses additionnelles non listées dans la dette #4** : `pnpm test:integration` (l.238), `pnpm test:api` (l.369), `pnpm start:test` (l.353) — tous scripts inexistants — + `pnpm build:backend` (l.276, même classe turbo bypass que PR #72/#75). Surtout : **convention env entièrement fausse partout** (`POSTGRES_*` jamais lus par le backend, qui lit `DATABASE_URL` + `DIRECT_URL` + `DB_*`). Décision strict scope : `migrate:test → prisma:push`, `seed:test → db:seed`, `start:test → start`, bloc env **job-level** remplaçant les `POSTGRES_*` par `DATABASE_URL/DIRECT_URL/DB_*/REDIS_URL/etc.` (miroir e2e.yml:43-59) sur les 3 jobs DB. test:integration/test:api/start:test/build:backend OUT scope (dettes séparées). **Validé post-merge** : Backend CI run 26839748278 job Integration Tests passe « Provision test database (prisma db push) » ✅ et « Seed test data » ✅. Dette #4 résolue.

  4. **Phase 4 — submodule orphelin (PR #77).** Diagnostic confirmé : `external/ikea-api-client` tracké comme gitlink (mode 160000, commit `ce70c8d`) sans aucun `.gitmodules` ni entrée `.git/config` — cause exacte du warning CodeQL `No url found for submodule path` + `git fatal exit 128`. `git grep` confirme : aucune référence code, seul CLAUDE.md (la dette) le cite. Action : `git rm --cached` (non-destructif, garde le clone local) + `external/` ajouté au `.gitignore`. Dogfooding **possible** (modif tree, pas workflow file). Dette #5 résolue.

  5. **Bug Auto Label v5 validé rétroactivement** : Auto Label passe au vert sur PR #75 → preuve que le fix PR #73 du 31/05 (migration v4→v5) fonctionne en prod. La limitation dogfooding de #73 (workflow fetche `labeler.yml` depuis main, pas la branche) avait empêché la validation sur #73 elle-même ; elle arrive 2 jours plus tard sur la 1ʳᵉ PR de la nouvelle session.

  6. **Découvertes en cascade — 4 nouvelles dettes §11 P3** : (a) frontend `test:coverage` crash `@vitest/coverage-v8@1.6.1` après 1220 tests verts (provider.js:2446) ; (b) ESLint rouge préexistant frontend + backend (à investiguer volume) ; (c) security jobs rouges (`pnpm audit` vuln high coverage-v8) ; (d) **🚨 false green dangereux** : `pnpm --filter backend test:integration` avec script absent → no-op exit 0 → step CI vert sans exécuter de tests (concerne test:integration + test:api). Découverte critique pour la crédibilité du dashboard CI. (+ `build:backend` turbo, scope OUT #76.)

  **Acquis méthodologiques** : auto-challenge dogfooding désormais réflexe automatique des PRs CI (alerte explicite si le workflow ne se déclenchera pas sur la PR). Validation post-merge structurée (`gh run view --json` + grep logs) adoptée comme norme pour chaque dette CI résolue.
- **02-03/06/2026 (soir)** : **Couche 6 backend startup E2E RÉSOLUE et PROUVÉE — 2 PRs CI mergées (#80, #81) + #79 held + découverte couche 7b majeure**.

  L'audit Claude Code a invalidé les 3 hypothèses initiales (H1 env vars Stripe/Anthropic/AWS 60%, H2 startup lent 30%, H3 bind 10%). **Cause racine confirmée par preuve directe** (logs run 26840908824) : le backend n'était jamais buildé avant `pnpm start` = `node dist/index.js` → `MODULE_NOT_FOUND` instantané masqué par le `&` background, et `wait-on /health` timeout à 1m 40s. Le seul build e2e était `--filter @kitchenxpert/frontend` qui ne build pas le backend (pas une dépendance). `validateEnv()` ne hard-fail QUE sur DATABASE_URL + JWT_ACCESS_SECRET + JWT_REFRESH_SECRET — tout le reste optionnel. DB connecte parfaitement (provision step OK).

  **PR #79** (`ci/e2e-build-backend`, commit `b919c1b`) : step `Build backend` dédié avant `Start backend`, via `pnpm turbo run build --filter @kitchenxpert/backend` (pattern cohérent avec #72/#75/#76). Dogfooding possible (e2e.yml sans filter paths) → validable sur la PR.

  **Cascade — PR #80** : le run #1 (26841388286) de #79 a révélé un skew AWS SDK préexistant. `@aws-sdk/client-s3@^3.1056.0` (résolu 3.1056.0) vs `@aws-sdk/s3-request-presigner@^3.500.0` (résolu 3.974.0) → AWS SDK v3 exige tous `@aws-sdk/*` alignés (types `@smithy/*` partagés), sinon `S3Client` incompatible avec le type `Client<...>` qu'attend `getSignedUrl` → TS2345 sur 2 occurrences dans `storage-service.ts`. Origine : Lot 1 Dependabot **PR #26** a bumpé client-s3 sans bumper presigner. Latent car dev en `ts-node --transpile-only` (pas de type-check) + build-job de backend-ci skip (lint/test-unit fail upstream). Le step `Build backend` de #79 = premier endroit qui type-check le backend en CI. Bug qui cassait aussi le build Docker prod, pas que la CI. **PR #80** (`chore/align-aws-sdk-presigner`, squash `128c98b`) : `^3.500.0 → ^3.1056.0` (résout 3.1058.0). Vérifié en local : `pnpm turbo run build --filter @kitchenxpert/backend` → 3 tasks success, dist/index.js produit, TS2345 disparu. Diff lockfile 100% scopé aws-sdk/smithy (−153/+23, dédup @smithy stale).

  **Run #2** (26842679803, après #80 mergé + #79 rebasé) : **Build backend ✅ → Start backend ✅ → Wait for services ✅** sur /health. **Couche 6 PROUVÉE end-to-end.** Mais `Run critical flows` échoue sur `Cannot find package '@axe-core/playwright'` (`accessibility.spec.ts:17`) — erreur de collection Playwright (1 import manquant fait planter le chargement de toute la suite). **PR #81** (`chore/add-axe-core-playwright`, squash `86acee0`) : `pnpm --filter frontend add -D @axe-core/playwright` (commande documentée dans l'en-tête du spec). Résout 4.11.3 contre playwright-core@1.58.2. Diff lockfile 100% axe-core/playwright scopé.

  **Run #3** (26843210869, après #81 mergé + #79 re-rebasé) : la suite charge enfin et exécute les 29 tests → **TOUS échouent** (84 ✘ avec retries, jusqu'au timeout 25 min du job). A11y (8 pages × 3 retries × ~22s) : `TimeoutError: page.waitForLoadState: Timeout 20000ms exceeded` sur `page.goto(url)`. Flux fonctionnels (signup/login/logout/sandbox) : échecs d'assertion rapides. **Couche 7b = chantier dédié majeur**, non triviable dans une session standard. Nouvelle dette §11 P3 ajoutée.

  **Décision sur PR #79** : reste ouverte/held. Rationale économique : la merger transforme l'e2e en job rouge de ~25 min sur chaque push/PR (coût Actions §14.3 = budget 20$/mois) + PRs lentes, sans rendre la CI verte. À merger quand couche 7b sera réglée.

  **Acquis méthodologiques** : (a) audit-first a invalidé 100% des prédictions hypothétiques (0/3 sur H1/H2/H3) → la méthode protège des intuitions séduisantes mais fausses ; (b) `&` background est dangereux car il masque les crashes instantanés ; (c) chaque couche débloquée révèle la suivante (build → @axe-core → flux réels), dépilage ordonné mais incertain ; (d) reconnaissance honnête d'une estimation fausse (« 5 min » faux quand les flux tournent vraiment) → pivot quand la magnitude de couche 7 est devenue claire.

- **07/06/2026** : **Couche 7f facettes 1+2 RÉSOLUES + merges + re-run E2E + blockers niveau A (3 PRs : #97/#98/#99).** Session code-first (CODE > DOC), audit/decision/execution avec points d'arrêt.
  1. **Facette 1 — selectors (PR #97, squash `9bbe2a0`)** : `getByLabel(/nom|last name/i)` matchait "Prénom"+"Nom" → ancré `/^nom$|^last name$/i`. `getByRole('dialog')` ×2 ambigus (cookie-consent monté globalement App.tsx:42) → scopés par nom. **Auto-review a trouvé un bloquant dans ma propre PR** : 2 `getByRole('dialog')` restés non scopés (l.39+l.52) → corrigés (les 4 assertions flow-3 cohérentes). flow-4/flow-8 dialogs **différés avec preuve** : flow-8 supprime via `window.confirm` (natif, pas `role=dialog`), les deux nécessitent le backend.
  2. **Facette 2 — color-contrast (PR #98, squash `4b43809`)** : scan axe local (preview seul, sans cloud). 5 pages initiales (13 violations) puis **audit étendu 14 pages × light+dark** → ~30 de plus (pattern systémique `text-white/40` = 3.77, dominé par comment-ca-marche ×20). 2 tokens AA `--kx-brand-strong` (indigo-600) + `--kx-accent-warm-strong` (amber-800) avec `dark:` ; muté sombre `/40→/55` ; lien `blue-600` hors-token → token brand. **PROUVÉ : 14 pages × 2 thèmes = 0 color-contrast.** ⚠️ Faux positif **Service Worker** (chunks stale en preview) démasqué via `serviceWorkers:'block'`.
  3. **Merges + re-run E2E (PHASE 3)** : #97 puis #98 mergés (CI rouge = infra pré-existante + facette-3, **rien causé par les PRs** — preuve : 1226 tests unitaires passent dont PricingPage+ForgotPassword ; échec = crash coverage-v8 *après* succès). Re-run E2E sur main (run 27097964280) : **6 passed / 3 flaky / 1 skip / 19 failed**. Selectors **2→0** ✓, color-contrast **19→0** ✓.
  4. **Facette 2b — blockers a11y niveau A (PR #99, squash `8915aa6`)** : le re-run a révélé 2 blockers que mon scan **AA-only** avait manqués (filtre `wcag2aa/21aa` = aveugle au **niveau A** `wcag2a`) : pricing `link-in-text-block` (lien mailto distingué par couleur seule → `underline` permanent) + catalog/IKEA `select-name` (select tri sans nom → `aria-label`). **PROUVÉ** en répliquant la config CI exacte (tags complets + `serviceWorkers:'block'`) : **0 critical/serious sur 15 pages**.
  **Reste 7f = facette 3** (login 401/backend, ~12 flows + visual-regression baselines, chantier LOCAL) + a11y login `color-contrast` flaky (timing) + **dette catalog data-driven** (cf §11 P3 ci-dessus). **Acquis** : (a) auto-review honnête trouve ses propres bugs (bloquant #97) ; (b) toujours scanner a11y avec le **tag-set complet du gate**, pas AA-only ; (c) `serviceWorkers:'block'` obligatoire pour scanner un build preview ; (d) 📝 **un scan a11y headless sans backend couvre l'UI shell + les design tokens mais est AVEUGLE au contenu data-driven** (cartes peuplées, listes seedées) — prouvé par #99 (catalog 0 en local vs 4-5 nodes en CI). Couverture complète = scan headless **+** scan stack-up authentifié. main HEAD à l'époque = `8915aa6` (#99) ; doc #100, puis dette catalog tracée (cette PR).
- **08/06/2026** : **Couche 7f facette 3 — login 401 RÉSOLU + visual-regression baselines (3 PRs : #102/#103/#104).** Audit-first time-boxé (1h), CODE > DOC, sans stack-up.
  1. **Audit login 401 (code-only)** : 2 causes prouvées par lecture code + logs CI (run #99). (a) **backend test-infra** — backdoor `/auth/dev/verify-email` posait `emailVerified:true` mais pas `status:'active'` (register=`pending`, login exige `active` → 401 "Account is not active") ; le **vrai** flux (email-token.service.ts) active déjà → **prod OK**. (b) **frontend** — `LoginPage` ne naviguait jamais vers /dashboard (ni guard ni AuthLayout) → `loginUI waitForURL` timeout. Auto-challenge : (a) est le blocant immédiat, (b) latent révélé après (a).
  2. **Fixes atomiques** : **#102** (`facf140`) backdoor + `status:'active'` (miroir du vrai flux, backend type-check vert) ; **#103** (`9f9fb38`) LoginPage `navigate(withPrefix('/dashboard'))` (scope LoginPage seul — RegisterPage non touché car user `pending`/non-vérifié ; build + 19/19 tests LoginPage verts).
  3. **Re-run E2E mesuré** (run 27101791465) : **15 passed (vs 9) / 13 failed / 0 flaky**. **flow-2 (login+logout) + flow-3b (API login+import) verts** = #102+#103 prouvés end-to-end. a11y 8/8 vert.
  4. **Quick-win visual-regression (#104, `c6c3d3d`)** : 5 baselines `chromium-desktop-linux` **générées sur le runner CI** (tolérance 0.1% → cross-OS Windows impossible) via modif temp `--update-snapshots`+artifact, download, commit, revert. **+ 3 bugs job visual corrigés en cascade** : `PLAYWRIGHT_SUITE=critical` (No tests found), découplage `needs: critical-flows`, exclusion du job critical (`--grep-invert`, car dashboard data-driven diffère avec backend). Job dédié **5/5 vert**.
  **Reste 7f facette 3** = flows métier backend (flow-1 checkbox `sr-only`, flow-4/5/6/8) + catalog a11y data-driven (re-qualifié **flaky**) — chantier LOCAL stack-up. **Acquis** : (a) audit-first → 2 causes prouvées sans stack-up ; (b) distinguer test-infra vs app vs prod (la prod était OK) ; (c) baselines cross-OS = générer sur le runner cible, jamais en local ; (d) un fix CI révèle souvent des bugs de job latents en cascade (3 ici). main HEAD = `c6c3d3d`.
- **10/06/2026** : **Session STACK-UP — ROOT CAUSE majeure trouvée : `<Provider store={store}>` jamais câblé (3 PRs : #109/#110/#106).** Première session avec la stack montée en local (backend :4000 + preview prod :3005), pour diagnostiquer la « couche login→dashboard » mal-comprise du 09/06.
  1. **Phase 0** (prérequis stack, time-boxé) : repo clean, builds verts, `.env` racine OK, DB Supabase joignable (64 modèles), backdoor #102 OK, seeds OK ; seul obstacle = port 3005 occupé par un `vite preview` résiduel de mes scans (tué après identification).
  2. **Repro + ROOT CAUSE** : le login UI **atteint** /dashboard en local (≠ ma conclusion CI « waitForURL timeout »), MAIS le contenu DashboardPage **crashe** : `Cannot destructure property 'store' … null`. Cause = **aucun `<Provider store={store}>` react-redux dans App.tsx** (store configuré, jamais fourni). Toute page redux (Dashboard/Catalog/SandboxDesigner + sandbox) crashe. **Prouvé 3 axes** (code/runtime/git pickaxe). Masqué car unit tests `vi.mock('store/hooks')`. **Mon diagnostic 09/06 « régression consent / nav login→dashboard » était FAUX** — c'était le crash store-null ; la « régression flow-2 » par le consent dismiss était corrélation, pas causation.
  3. **Fix #109** (`2d26024`) `<Provider store={store}>` → **validé stack-up** : store-null disparu, **flow-2 2/2 PASS**, catalog/designer rendent.
  4. **Triage de la longue traîne** (par preuve, stack montée) : **#110** (`38ea66f`) kitchen-fields `widthCm→width/length/height` (flow-4/5/6 : `POST /kitchens` 400 → crash `.id`) ; **#106** (`f99f4d1`) span-click checkbox `sr-only` flow-1. Couches restantes caractérisées : flow-6 quote-total, flow-8 RGPD tab, flow-5 **WebGL canvas** (dur), flow-4 **IKEA live vide** (externe), flow-7 Stripe (externe). **Décision honnête** : lander les fixes propres (Provider+kitchen-fields+span-click), tracker la traîne (mock/infra), ne pas brute-forcer le 100% (flaky/WebGL/externe).
  **Acquis** : (a) le **stack-up** a trouvé un vrai bug user-facing que ni les unit tests (mockés) ni la lecture de logs CI ne pouvaient pinpointer ; (b) **comparaison de runs ≠ causation** — ma conclusion « consent régresse flow-2 » (08/06) était fausse, le vrai coupable était le crash store-null ; (c) chaque flux E2E a des couches empilées → fixer la racine d'abord, puis trier honnêtement quick-win vs dur/externe. main HEAD = `f99f4d1`.
- **10/06/2026 (suite) — Audit « câblages silencieux manquants » (généralisation de #109).** Question : si le Provider redux a manqué silencieusement, **quoi d'autre** ? Audit code-first time-boxé de tout l'arbre App.tsx + mapping hooks↔providers.
  1. **Verdict A providers** : tous câblés/ordonnés (ErrorBoundary, Provider redux, QueryClient, Router, Language, Theme, Auth, Toast) ; chaque hook (useTranslation 174 / useNavigate 60 / useToast 24 / useAuth 20 / useAppSelector 9 / useTheme 2 / useLanguage 2) a son provider ; 0 `useSelector` raw ; 4 `createContext` → 4 `.Provider` rendus ; Suspense top-level couvre les 54 lazy. **Aucun autre Provider crashant.**
  2. **🎯 MÊME classe trouvée côté store → #112 (`b1d0220`)** : le store n'enregistrait que `project`+`catalog`, mais **10 slices domaine complets+unit-testés** (kitchen, user, permissions, roles, audit, questionnaire, vr, webhooks, adaptiveSurfaces, aiGenerator ; 129-424 l. chacun, CRUD `createAsyncThunk`, tests `__tests__/slices/*`) étaient **non câblés** = piège latent (un futur `useAppSelector(s => s.kitchen…)` aurait crashé `undefined`). **Fix** : les 12 enregistrés (clé = `name`, vérifié contre `state.<key>` des sélecteurs). Build vert + slices 103/103. Bas risque (10 sans consommateur → 0 changement de comportement).
  3. **Env `VITE_*`** : aucune dans `.env` (Vite lit `packages/frontend/`, pas la racine ; aucun `.env` frontend) MAIS **toutes ont un fallback** (`VITE_API_URL`→`/api/v1`, WS/CDN/Plausible→défauts) → pas d'undefined silencieux. ✅
  4. **Reliquat mineur** (non-crash) : **react-query inutilisé** — `QueryClientProvider` + `queryClient` configurés mais **0 `useQuery`/`useMutation`** consommateur. Provider no-op (inoffensif). Laissé en place (possiblement intentionnel ; retrait = churn bas-valeur). Tracé §11 P3.
  **Acquis** : la généralisation d'un bug (« quoi d'autre de la même classe ? ») a payé — 1 vrai piège latent désamorcé (#112) ; le reste du câblage est sain (contextes/env/suspense ont tous leurs providers/fallbacks). main HEAD = `b1d0220`.
- **10/06/2026 (suite 2) — 5 dettes CI du 02/06 traitées (3 PRs : #114/#115/#116).** Audit-first : les 5 reproduites par preuve (exit-code/stack-trace/audit), aucune caduque.
  1. **#114 (`efd9958`) — build:backend turbo bypass** : `pnpm build:backend` → `pnpm turbo run build --filter @kitchenxpert/backend`. RÉSOLU.
  2. **#115 (`4a03fd3`) — false-green** : `pnpm test:integration`/`test:api` sortaient **exit 0** (script absent → « None of the selected packages… ») = 2 jobs verts sans 1 test. Guard → rouge honnête. RÉSOLU.
  3. **#116 (`57958c3`) — convergence coverage + ESLint** : root cause commune = **override toxique `minimatch:^9.0.5`** (commit `edb726b`, même origine que path-to-regexp #47) forçant minimatch v9 (objet) sur eslint@8.57/test-exclude@6 (API v3 callable) → ESLint crash `is not a function` + coverage crash test-exclude. Retrait override (→ minimatch 3.1.5 callable+safe) + coverage `v8→istanbul` (bug `convertCoverage` distinct). **Prouvé** : `pnpm test:coverage` exit 0 / 1226 tests ; eslint ne crashe plus ; backend build vert ; pas de vuln réintroduite.
  **Reste (2 gros chantiers, honnêtes)** : (a) **ESLint** : crash résolu mais **~1551 erreurs lint réelles, 0% auto-fixable** (no-unsafe-* ×900…) = chantier manuel/stratégie eslintrc ; (b) **security** : **102 vulns (46 high/6 critical)** = §14.5 Lot 4 Dependabot. **Acquis** : un override pnpm bulk (sécu mal ciblée) peut casser tout l'outillage (eslint+coverage) — 2e override toxique du même commit `edb726b` ; reproduire par preuve avant de croire une dette « mineure » (security était ×100 plus gros que tracé). main HEAD = `57958c3`.
- **21-23/06/2026** : **Séquence catalogue P4-P6 livrée (cf §15.8.5) + chantier CI honnêteté.** Trois trous CI découverts et bouchés, tous de la classe "false green / la CI valide moins qu'elle n'en a l'air" :
  1. **Bug `--coverage` (#190)** : `pnpm test:backend --coverage` -> `--coverage` avalé par pnpm -> exit 1 AVANT jest -> **les 1587 tests backend ne s'exécutaient JAMAIS en CI** (dont 17 P5 + 12 P6). Fix : `pnpm --filter backend test:coverage` (pattern #75). Couverture réelle 20-32% vs seuil 50% -> seuils abaissés au **plancher honnête 25/17/18/25** (cliquet anti-régression, PAS un objectif ; dette : remonter via tests use-cases/ à 0%). + fix chemin Codecov. Dogfooding : Unit Tests vert sur la PR.
  2. **tsc jamais exécuté (#191)** : dans "Lint & Type Check", ESLint échoue en premier -> GitHub aborte le job -> **tsc SKIPPÉ** -> une vraie TS error (ex. TS2532 #188) atteignait main sans rouge. Fix : **job "Type Check (backend)" standalone** (`prisma generate` + `tsc --noEmit`). Choix : job séparé, PAS reorder (tsc noyé) ni `continue-on-error` (masque la dette = faux-vert). Lint reste rouge/visible.
  3. **Asymétrie paths (#191)** : `backend-ci.yml` dans `push.paths` mais absent de `pull_request.paths` -> PR touchant ce seul workflow non-dogfoodable. Miroir ajouté.

  **Acquis méthodologiques.**
  - **Valider un type-check/build CI exige un état de build PROPRE.** Deux faux-négatifs locaux : `tsc --noEmit` passait car `packages/common/dist/` était déjà buildé ; en CI fraîche -> **TS6305** (project references) + cascade. Le dogfooding a attrapé le défaut AVANT merge. Fix : step `build common` avant tsc. Reproduire l'état CI = `rm common/dist` avant validation. **Même pattern que #72/#75/#79.**
  - **Dry-run / oracle avant toute écriture.** A attrapé le data-loss `_seeds` (STOP sur `db push`) et un `DateTime` non-null mal mappé (2e dry-run `migrate diff`).
  - **Paths symétriques push/PR** sinon les modifs de workflow ne sont pas dogfoodées.

  main HEAD = `77a6488`.

- **24-25/06/2026** : **Lint backend nettoyé (#193) + P7 Phase 1 cœur livré (#195, #196 — cf §15.8.6).**
  - **#193** : les 19 erreurs ESLint backend corrigées (17 import/order + 2 curly, toutes SAFE, `load-env.ts` `config()` non déplacé, 1587 tests verts) ; step tsc redondant retiré du job Lint (le gate vit dans le job standalone #191) ; job renommé "Lint". **Prettier laissé rouge volontairement** (1299 fichiers non formatés = chantier dédié) — dette visible, PAS de `continue-on-error` (refus du faux-vert). Le job Lint passe de 3 causes de rouge à 1 légitime (Prettier).
  - **P7 Phase 1** : `normalizeColor` (#195) + `VariantResolverService` (#196) — cf §15.8.6.

  **Acquis.**
  - **La CI réparée (chantier 21-23/06) valide réellement le code neuf.** Dès la 1ère PR de code (#195) : Unit Tests exécute les nouveaux tests (1587 -> 1615 -> 1625), Type Check gate le module neuf, ESLint propre sur le nouveau code. L'infra CI honnêteté sert immédiatement.
  - **La mesure de couverture attrape des bugs** : le bug Unicode (#195) n'est apparu qu'en mesurant la couverture *pondérée par SKU* (~470 "Chêne" perdus). Une mesure par nombre de valeurs distinctes l'aurait raté.
  - **Modules figés protégés par audit-first** : chaque PR P7 a confirmé `canonical-signature.ts` intact (`git diff` vide) -> zéro risque sur le graphe P5.

  main HEAD = `e01d794`.

- **25-26/06/2026** : **P7 Phase 2 chatbot couleur livré (chaîne backend) — cf §15.8.7.** `ANTHROPIC_API_KEY` configurée (test GO 200). 4 PRs : #198 (`resolveColors` depuis n'importe quel SKU, OR-first), #199 (endpoint REST `/colors`, 404 vs 200-[]), #200 (instance partagée, 1 cast), #201 (tool LLM `resolve_colors` + prompt anti-hallucination).

  **Acquis.**
  - **Découpage DB / LLM** : le cœur (résoudre les couleurs) ne dépend pas de la clé -> 2a (DB) livrée et testée sans clé, 2b (LLM) par-dessus. Le découpage a permis d'avancer même clé absente.
  - **Déterministe testable, conversationnel non.** Le dispatch du tool est unit-testé (6 tests, resolver mocké) ; le comportement du LLM (appel au bon moment, zéro hallucination) se valide empiriquement via le frontend, pas par des tests LLM fragiles. Honnêteté sur ce qui est testable.
  - **Premier call-site prod d'un service DI** (#199) : le résolveur (comme le matcher P6) n'était instancié que dans les tests. L'endpoint établit le pattern, factorisé en instance partagée (#200) avant le 2e consommateur (le tool).

  main HEAD = `8c3c1a0`.

- **26/06/2026** : **BOM-a — devis déterministe depuis les vrais SKU (#203) — cf §15.8.8.** `generateBOM` réécrit sans LLM : lignes `catalog` (vrai `product.sku` + prix DB), lignes `estimated` (config via barème explicite), totaux calculés en code, `source` + `subtotalCatalog`/`subtotalEstimated` séparés (ferme vs estimé). **Dette §15.7 P4 résolue pour les lignes catalog.** 7 tests greenfield (le service n'en avait aucun), 100% déterministe.

  **Acquis** : un LLM ne doit jamais être la source d'une donnée qui existe déjà en dur (sku/prix en DB → code, pas prompt) — critique sur une donnée financière. Retirer le LLM a rendu le service testable. Pendings : BOM-b (matcher pour la config, 1er call-site prod du matcher) + cleanup `SYSTEM_PROMPTS.BOM_GENERATOR` orphelin.

  main HEAD = `e98f6df`.

- **27-28/06/2026** : **Session hygiène — 9 PRs mergées (#207-#215).** Travail de fond non-catalogue, tout audit-first/preuve.
  1. **Chantier formatage Prettier repo-wide (#207-#211)** : la passe `--write` a révélé une pile de prérequis CI cachés. `.prettierrc.js`→`.cjs` frontend (#207, crash ESM sous `type:module`) ; CI frontend rendue honnête — cache `node_modules` empoisonné (minimatch v9 + turbo v1 stale) → `--frozen-lockfile` par job + mirror `pull_request.paths` (#208) + build workspace deps avant ESLint (#209, démasque 17 faux positifs `no-redundant-type-constituents` dus aux types workspace résolus en `any`) ; prep `.prettierignore` (guides Astro) + suppression `stylelintrc.js` mort (#210, cassé par `*/` dans commentaire JSDoc) ; passe `--write` **1193 fichiers** (#211) validée par preuve (tsc 0/0, backend 1650 + frontend 1226 tests verts, prettier --check 0) → **Lint & Format Check VERT sur main**. **2 acquis** : (a) **autocrlf Windows** = le `prettier --check` LOCAL voit du CRLF (smudge au checkout) et reflag 1193 fichiers, mais les **blobs Git sont en LF** → le runner CI Linux est la **source de vérité** (job vert), pas le check local ; (b) **non-idempotence Prettier** (3 passes pour le point fixe sur types imbriqués + markdown proseWrap). `CLAUDE.md` exclu du formatage (doc vivant, éviter le churn proseWrap).
  2. **`.env.example` complété (#213)** : passe additive 69→92 vars (23 backend-prod manquantes ajoutées, placeholders bidon uniquement, `DB_*` marqués requis-prod, sections REQUIS/PROD/NON-PROD/LEGACY). Issu d'un audit : le code lit 84 env vars, le validateur zod n'en impose que 4 (`DATABASE_URL` + JWT×2 + `NODE_ENV`). 11 vars `[LEGACY]` mortes laissées marquées (retrait = PR séparée).
  3. **§14 rafraîchie code-vs-doc (#214)** : audit prouvant que la roadmap retardait sur le code — **cookies** (httpOnly+secure:isProduction+sameSite:strict) et **CORS** (mécanisme `cors-middleware.ts` anti-wildcard) **déjà FAITS** ; ajout **14.6** (durcissement déjà en place non listé : helmet, rate-limit, healthchecks `/health[/ready|/live]`, trust-proxy, OTEL ; SSL délégué hébergeur) + **14.7** (procédure secrets prod). Tableau §13 : « Non démarrée » → « 🔧 Code prêt, infra à provisionner ». **Le vrai blocage prod = infra + secrets hors-repo, PAS le code.**
  4. **Cleanup `config/linters/` (#215)** : 3 orphelins `eslintrc/prettierrc/commitlintrc.js` (scaffolding mort, 0 ref fonctionnelle, vraies configs à la racine) supprimés → dossier disparu. Complète #210 (stylelintrc).

  **Acquis transverses** : (a) **un fichier `.js` config mort peut être syntaxiquement cassé depuis l'origine** (stylelintrc : `*/` dans une chaîne glob `**/*` ferme le bloc JSDoc) — `node -e require()` le prouve ; (b) **autocrlf** dissocie le check local (CRLF) du blob committé (LF) → toujours valider un job formatage par la CI Linux ; (c) **le code prod est plus avancé que la doc** — auditer le code avant de croire une roadmap « non démarrée ». main HEAD = `db48e19`.

---

## 13. État d'avancement (snapshot 28/06/2026)

| Phase | Statut | Restant |
|---|---|---|
| **Phase 1 P0** | ✅ Terminée | 0 tâche restante |
| **Phase 1 P1** | ✅ Terminée (actionnable) | 0 tâche actionnable restante (7 résolues cumulées + 1 résolue 22/05 [poster Hero] + 1 écartée 22/05 [Hero3DInteractive — décision d'architecture, §11 P1]) |
| **Phase 1 P2** | 🟡 En cours | **2 tâches actionnables restantes** : #2 SandboxMigrationBanner Card/Toast + **Backend dotenv cleanup (reclassé P3→P2 le 31/05/26 après audit, cf §12 31/05)**. Cumul résolu : 2 le 17/05 (HeroVideo + Backend 500) + 2 fermées par décision 22/05 (#3 guides hors scope + #4 TrustStack caduque alignée §8.2) + 1 résolue 23/05 (#1 HowItWorks → Card polymorphique, commits 594c63b+ee1869c). |
| **Phase 1 P3** | 🟡 Entamée (couches CI 02-03/06) | **~27 tâches actionnables internes**. Recompte 02/06 : baseline ≈ 27 (la ligne "20" du 31/05 matin n'intégrait pas les 7 dettes du 31/05 soir) ; −2 résolues (#3 PR #75, #4 PR #76), −1 résolue (#5 PR #77), −1 caduque (#7), −1 reclassée BLOQUÉ EXTERNE (#2 CodeQL), +5 nouvelles 02/06 = 27. **03/06 : −1 (couche 6) +1 (7b) = 27. 06/06 : couche 7 INFRA résolue — 7b/7c/7d/7e-verify + #92 préfixe-locale (cause racine) = 6 PRs (#86-#90, #92). 07/06 : couche 7f facettes 1+2 RÉSOLUES — selectors (#97), color-contrast 14 pages (#98), blockers niveau A link-in-text-block+select-name (#99). 08/06 : couche 7f facette 3 login 401 RÉSOLUE (#102 backdoor status:active + #103 LoginPage redirect, flow-2+3b verts) + visual-regression baselines générées sur runner (#104, job dédié 5/5). 10/06 (STACK-UP) : ROOT CAUSE `<Provider store>` jamais câblé (#109, crash dashboard/catalog/designer, flow-2 2/2) + kitchen-fields flow-4/5/6 (#110) + span-click flow-1 (#106). Reste 7f facette 3 = longue traîne per-flow (flow-6 quote, flow-8 RGPD tab) + dur/externe (flow-5 WebGL, flow-4 IKEA live, flow-7 Stripe) = chantier LOCAL/mock. 10/06 (audit câblages) : verdict A providers + #112 (10 slices redux non enregistrés = piège latent désamorcé) ; reliquat mineur react-query inutilisé. 10/06 (5 dettes CI 02/06) : #114 turbo + #115 false-green + #116 minimatch override toxique → ESLint+coverage débloqués (coverage istanbul exit 0/1226 tests). Reste : ~1551 erreurs lint réelles (chantier) + 102 vulns security (Lot 4). **18-20/06 (sessions catalogue) : 4 PRs livrées** — #182 audit qualité cooking (264 actifs, méthodo §15.8.2), #183 matcher déterministe (DesignCatalogMatcher TS standalone, cascade 4 niveaux), #184 parseSpecTable v2 (regex dep-free common, 6 mappings, sanity bounds), #185 doc §15.8.3 (Castorama re-ingestion v2 incomplet 7497 SKU, déséquilibre volumétrique acté) + §15.8.4 (pivot stratégique chatbot couleur, archi 3 niveaux gammes/variants/rendu, POC dédup conservé bloc réutilisable 7497→6081 canoniques, PAS appliqué en DB).** **21-23/06 : séquence catalogue P4-P6 (#186-#189) + 2 fixes CI #190/#191 (--coverage + job Type Check) ; main HEAD 77a6488.** **24-25/06 : Lint backend nettoye (#193) ; P7 Phase 1 cœur livre — normalizeColor + VariantResolverService (#195/#196), graphe parentSku -> offre couleur, ~394 gammes, sans cle LLM. main HEAD e01d794.** **25-26/06 : P7 Phase 2 chatbot couleur livre (chaine backend, #198-#201) — resolveColors any-sku, endpoint REST /colors, instance partagee, tool LLM resolve_colors + anti-hallucination. Validation conversationnelle frontend = a faire. main HEAD 8c3c1a0.** **26/06 : BOM-a — generateBOM deterministe (vrais SKU/prix DB, zero LLM, totaux calcules + split ferme/estime), §15.7 P4 resolu pour lignes catalog. 7 tests greenfield. main HEAD e98f6df.** **26/06 : cleanup #205 (SYSTEM_PROMPTS.BOM_GENERATOR orphelin retire). BOM-b AUDITE et BLOQUE par prerequis data (SlotType ne couvre pas sol/credence/quincaillerie ; config sans dimensions ; catalogue sans ces familles) -> re-scope chantier d'ingestion, pas de matching. main HEAD b1290b0.** **27-28/06 : session hygiène (9 PRs) — chantier formatage Prettier repo-wide (#207-#211 : config .cjs, CI honnête cache+build-before-lint, .prettierignore + suppression stylelintrc mort, passe --write 1193 fichiers -> Lint & Format Check VERT sur main) ; .env.example complété checklist prod 69->92 vars (#213) ; §14 rafraîchie code-vs-doc (#214 : cookies/CORS faits, +14.6 durcissement déjà en place, +14.7 procédure secrets) ; cleanup config/linters mort 3 orphelins (#215). main HEAD db48e19.** **28/06 (suite) : validation chatbot couleur P7 par appel authentifié (`POST /ai-chat/shopping`, stack-up) — chaîne IA `parentSku→resolver→/shopping→tool LLM` GO end-to-end, anti-hallucination prouvée (oracle Vicco, 3 cas, preuve = data.toolCalls). 2 findings : (a) `/colors` public by design (acté §15.8.7) ; (b) rate-limiter `/ai-chat` plafonne les authentifiés à 5/h (dette §11 P3). Reste UI color-picker greenfield. main HEAD db48e19 (doc-only).** |
| **§14 Roadmap Production** | 🔧 Code prêt, infra à provisionner | Durcissement backend FAIT (cookies, CORS-mécanisme, helmet, rate-limit, health, trust-proxy, OTEL). Blocage réel = infra + secrets hors-repo (Supabase/Upstash prod, hébergeur, domaine), à faire sur dashboards. |
| **§14.5 Chantier Dependabot** | 🟢 Lot 1 complet | **Lot 1 ✅ 11/11.** Lot 2 débloqué après résolution facturation Actions 31/05 soir (§14.3) — PR #15 (dotenv 16→17) prouvée safe en isolat 31/05 matin, peut être mergée après `chore/dotenv-17-minimal` audit. Reste : 5 PRs Lot 2 + 5 PRs Lot 3 + 8 PRs Lot 4. |

**Branches actives** :

- `main` (HEAD `db48e19`, post-#215) — toute la séquence catalogue (#182-#205), BOM-a (#203-#206) et la session hygiène 27-28/06 (#207-#215) sont mergées.
- `origin/chore/dotenv-17-minimal` (commit `a10f4aa`, **remote-only**) — artefact d'audit, **NE PAS merger** (laisser Dependabot rebaser PR #15).

Les branches de session (catalogue, BOM, formatage/env/§14/config-linters) sont mergées et prunées au fur et à mesure ; aucune PR ouverte à ce snapshot.

**Prochaines cibles (snapshot 28/06)** — le gros du catalogue/IA est livré : refactor gammes/variants **P4/P5/P6 FAITS** (#186-#189), **P7 chatbot couleur FAIT** (chaîne backend #195-#201), **BOM-a FAIT** (#203). Reste actionnable :

- **(a) Catalogue/IA** : chatbot couleur — **chaîne backend validée 28/06** (appel authentifié, anti-hallucination GO, oracle Vicco) → reste **UI color-picker greenfield** (mount `ChatPanel` ; aucun chemin UI n'atteint `/shopping` aujourd'hui) + **fix rate-limiter `/ai-chat`** (cf §11 P3) ; **re-run 6 cats Castorama manquantes** (§15.8.3 P1, plafond 300-500/cat) + audit qualité post-complet (§15.8.2) ; **P8 rendu 3D dynamique**. **BOM-b reste BLOQUÉ** par prérequis data (§15.8.8 — chantier d'ingestion familles sol/crédence/quincaillerie d'abord).
- **(b) Bloquants prod §14** (non-code) : infra Supabase/Upstash prod + hébergeur + domaine + secrets, à provisionner sur dashboards (§14.1/14.2 ; durcissement code déjà FAIT, cf §14.6).
- **(c) E2E couche 7f** : longue traîne per-flow (stack-up local) — flow-6 quote, flow-8 RGPD tab, flow-1 (2&3) ; **dur/externe** (mock/infra) : flow-5 WebGL, flow-4 IKEA live, flow-7 Stripe. e2e sur main = rouge informatif. CodeQL (#2) reporté repo public.
- **(d) Dette** : Lot 2-4 Dependabot ; `SandboxMigrationBanner` Card/Toast (§11 P2) ; Backend dotenv cleanup (§11 P2) ; retrait 11 vars `[LEGACY]` de `.env.example`.

---

## 14. Roadmap Production

> Sujets stratégiques de prep launch discutés en sessions 24-26/05/2026 mais non encore actionnés. **Bloque le déploiement prod tant que 14.1 n'est pas fait.** À cocher au fur et à mesure.

### 14.1 Sécurité — secrets compromis en dev (PRIORITÉ HAUTE)

Tout secret qui a été visible en dev local ou historisé dans des sessions de debug est à considérer comme grillé. À régénérer **avant tout déploiement** :

- [ ] **Régénérer `JWT_ACCESS_SECRET`** + **`JWT_REFRESH_SECRET`**. Générer via `openssl rand -base64 64`. Remplacer uniquement dans `.env` de prod (jamais commit). Conséquence : tous les tokens existants (refresh inclus) seront invalidés au déploiement — comportement attendu pour le premier launch.
- [ ] **Régénérer le token Upstash Redis** (REST + connection string `rediss://`) depuis le dashboard Upstash. Mettre à jour `REDIS_URL` dans `.env` prod uniquement.
- [ ] **Ajouter `DATA_ENCRYPTION_KEY`** : ⚠️ correction 03/06 (audit code) — le code ([crypto.ts:6-13](packages/backend/src/utils/crypto.ts#L6-L13)) accepte **n'importe quelle chaîne non-vide** (`scryptSync(key, 'kitchenxpert-salt', 32)` dérive 32 bytes ; seul throw `if (!key)`). « base64 32 » est une **convention**, pas une contrainte (le template prod dit « hex 32 » — autre convention valide). **Portée lazy** : `encrypt`/`decrypt` ne sont appelés QUE dans `partner-repository.ts` (apiSecret partenaire) + `catalog-repository.ts` (apiKey provider) → **jamais au boot, jamais sur l'auth/login** ; obligatoire seulement dès qu'on utilise les intégrations partenaires/catalogue (sinon throw runtime). Générer p.ex. `openssl rand -hex 32`.

> **Note code (audit 03/06) — `DB_*` boot-bloquants EN PROD.** Le backend a **deux clients Postgres** : Prisma (lit `DATABASE_URL`, le seul imposé par env-validator) ET un pool pg natif ([connection.ts:86-106](packages/backend/src/database/connection.ts#L86-L106)) qui lit `DB_HOST/PORT/USER/PASSWORD/NAME` ([app-config.ts:14-21](packages/backend/src/config/app-config.ts#L14-L21)) et se connecte au boot (`SELECT NOW()`). Ces `DB_*` sont `.optional()` dans le validator mais **leur absence en prod fait échouer le boot** (défauts localhost → connect fail → `exit(1)`). → En prod, fournir `DATABASE_URL` **ET** le bloc `DB_*` (PR #84 les ajoute au template). Cf dette §11 P3 « double-source DB env ».
>
> **Prérequis bloquant — infra prod pas encore créée.** §14.2 est intégralement `[ ]` : pas de projet Supabase prod, pas d'Upstash prod, pas d'hébergeur backend choisi. **Les secrets prod n'existent qu'une fois leur cible créée** → ne pas cocher les items ci-dessus avant d'avoir l'infra. Le cloud actuel (`.env`) — Supabase `cllgrpeepnxripgdkbba` (eu-west-3) + Upstash `giving-bird-134810` — est **dev/staging**, pas un prod distinct.

### 14.2 Infrastructure prod — séparer dev / prod

- [ ] **Projet Supabase prod distinct** (eu-west-3 ou autre selon coût/latence cible). Le projet actuel reste dev/staging. Interdiction de partager les données utilisateur entre dev et prod. Cloner le schema via `prisma db push` + relancer le seed runner (sans `SEED_USER_PASSWORD` exposé).
- [ ] **Upstash Redis prod distinct**. Idem séparation stricte. Aucun partage de cache/queue entre environnements.
- [ ] **Hébergement backend Express** : évaluer Railway / Render / Fly.io. Critères : (a) support websockets pour collab Yjs/ws, (b) cold start tolérable (l'API est appelée par le frontend dès chargement), (c) prix prévisible, (d) région EU pour latence DB Supabase eu-west-3. Documenter le choix dans une décision §12.
- [ ] **Hébergement frontend** : Vercel (alignement React/Vite standard, preview deployments automatiques par PR, compatible Plausible). Configurer build root `packages/frontend/`, env vars publiques, domaine custom.
- [ ] **Budget Upstash** : le polling 5s actuel de `job-queue.ts` (cf §11 P3 BLPOP) consomme ~17 280 commandes Redis/jour/instance en idle. Sous quota cloud, c'est coûteux. **Bloquer le déploiement prod tant que la migration BLPOP n'est pas faite**, ou monitorer le compteur Upstash très près en J+1 et basculer en urgence si nécessaire.

### 14.3 CI/CD GitHub Actions

- [x] **Facturation/quota GitHub Actions débloqués (31/05/26 soir)**. Cause racine identifiée : pas un quota dépassé ni un paiement échoué — le compte DELBOSC en plan Free n'avait AUCUNE carte enregistrée et 5 budgets configurés à 0$ avec "Stop usage: Oui" bloquaient Actions en cascade. Le message GitHub "recent account payments have failed" était ambigu (OR avec "spending limit needs to be increased"). Résolution : (a) ajout d'une autorisation PayPal (ID `B-35J44897SL316563E`, état ACTIF, mode "Solde", contact support@github.com, bouton "Annuler" disponible côté PayPal), (b) budget Actions porté à 20$/mois (Stop usage maintenu). Premier re-run E2E post-fix est passé de 3-4s d'échec billing → 41s d'exécution réelle. ✅ Actions débloqué et toujours fonctionnel après ~10 runs cumulés dans la soirée. Les 4 autres budgets (Premium Request, Codespaces, Packages, Git LFS) restent à 0$ — à surveiller si workflows tierces les sollicitent.
- [ ] **Optimiser les workflows lourds** : Frontend (build + tests Vitest), Backend (tests Jest), E2E (Playwright 9 flux), Lighthouse CI, CodeQL. Stratégies à étudier : (a) exécution conditionnelle par paths (ex. Lighthouse uniquement sur changements frontend), (b) parallélisation des jobs, (c) cache pnpm + cache Playwright browsers, (d) désactivation CodeQL en draft PR, (e) skip E2E sur les PR doc-only.

### 14.4 CORS / domaine / SSL / cookies prod

- [ ] **Domaine de prod (acheter/pointer)** : vrai TODO infra. Bloque la valeur `CORS_ORIGINS` prod + l'URL frontend. (Voir 14.2.) Vérifier la cohérence avec `ORGANIZATION_JSONLD`, `WEBSITE_JSONLD`, `SOFTWARE_JSONLD` (URLs canoniques, OG images, schema.org).
- [~] **CORS strict — mécanisme FAIT, reste la valeur prod** : `cors-middleware.ts` lit `CORS_ORIGINS` (CSV, anti-wildcard). Le code est complet ; il reste seulement à **fournir la valeur de prod** dans le `.env` prod (dépend de l'infra/domaine, donc traité avec 14.2). Tester avec un navigateur fresh sans cache.
- [x] **Cookies httpOnly + secure + sameSite (FAIT en code)** : configurés dans `auth-controller.ts` — `httpOnly:true` + `secure:isProduction` (auto-ON en prod) + `sameSite:'strict'`. Rien à coder ; le durcissement cookies est en place. SSL géré automatiquement par Vercel (frontend) + plateforme backend choisie. Supabase n'accepte déjà que SSL (`DB_SSL=true`).

### 14.5 Mise à jour des dépendances (chantier Dependabot)

> Contexte : `git fetch --prune` du 27/05 a révélé **32 PRs Dependabot ouvertes** (le repo accumulait silencieusement les bumps depuis ~mai). Audit du 27/05 (soir) → classement en 4 lots de risque. Méthode validée : merger **par paquets**, `pnpm install + pnpm dev` après chaque paquet pour intercepter les régressions (a permis d'attraper le crash Express override toxique au lot 1 — cf §12 27/05 soir).

#### Lot 1 — ✅ Complet (11/11 traitées, 27/05 fin de soirée)

- [x] #25 `@types/node` 20.19.29 → 20.19.33
- [x] #18 `react-hook-form` 7.71.0 → 7.71.2
- [x] #29 `styled-components` 6.3.8 → 6.3.11
- [x] #28 `jspdf` 4.1.0 → 4.2.0
- [x] #30 `@google/genai` 1.41.0 → 1.42.0
- [x] #31 `@storybook/react` → 8.6.18 (bonus version via `@dependabot recreate`)
- [x] #23 `@storybook/react-vite` → 8.6.18 (bonus version via `@dependabot recreate`)
- [x] #26 `@aws-sdk/client-s3` → 3.1056.0 (bonus version via `@dependabot recreate`)
- [x] #21 `pg` → 8.18.0 — validé live (driver Postgres côté backend, aucune régression observée sur Supabase via Prisma)
- [x] #32 `prettier` → 3.8.3 (bonus version via `@dependabot recreate`)
- [x] #27 `playwright` — PR **auto-closed** par Dependabot (probable rebump entre-temps ; à re-vérifier si une nouvelle PR ré-ouvre, sinon Playwright reste sur la version actuelle du lockfile)

#### Lot 2 — 🟡 GitHub Actions + dotenv (risque modéré, à valider quand 14.3 facturation Actions OK)

- [ ] Bump `actions/cache` v6 (nécessite re-warm cache pnpm + Playwright browsers)
- [ ] Bump `actions/checkout` v6
- [ ] Bump `actions/setup-node` v6 (vérifier compat node 20.x range)
- [ ] Bump `docker/build-push-action` v6
- [ ] Bump `slack-actions/slack-action` v2 — ⚠️ **format payload change** (object → string JSON, à adapter dans les workflows utilisant le notif Slack)
- [ ] Bump `dotenv` 16 → 17 (vérifier API parse, le backend l'utilise via `load-env.ts` + 3 appels redondants à nettoyer cf §11 P3 backend dotenv cleanup)

#### Lot 3 — 🟠 minors à churn (risque réel, audit ciblé requis)

- [ ] Bump nginx 1.31 (image Docker prod — vérifier compat config existante config/docker/nginx.conf)
- [ ] Bump python 3.14 (utilisé par `packages/ai-modules`, scripts setup — vérifier compat venv + deps Python)
- [ ] Bump `jest-environment-jsdom` 30 — **BLOQUÉ tant que `jest` reste à 29**. Attendre Lot 4 ou bump jest en cascade.
- [ ] Bump `lucide-react` 0.309 → 0.575 (saut majeur de versions, **grep toutes les icônes utilisées** avant merge — certaines ont pu être renommées/supprimées).
- [ ] Bump `three` + `@types/three` 0.183 — **#10 et #12 EN PAIRE obligatoire** (mismatch types/runtime three.js casse `@kitchenxpert/3d-engine` au build).

#### Lot 4 — 🔴 MAJEURES (sessions dédiées par bump, NE PAS chaîner)

- [ ] Bump `prisma` 5 → 7 : ~65 fichiers à re-vérifier (call sites Prisma Client), **re-test Supabase complet** (regenerate client + push schema + smoke seeds + RLS si activées).
- [ ] Bump `react-router` 6 → 7 : ~90 fichiers concernés, refonte API (data routers obligatoires, `<RouterProvider>`, loaders). Impact sur `LocaleAwareShell` + `LocalizedLink` à anticiper.
- [ ] Bump node 20 → 26 : **rebuild images Docker prod**, vérifier toutes les natives (`bcrypt`, `sharp` éventuel, `prisma engines`).
- [ ] Bump `typescript` 5 → 6 : **TOUS les workspaces ensemble** (impossible de mixer 5/6 entre packages partagés), bumper `@types/node` 20 → 25 en pair.
- [ ] Bump `redis` 4 → 5 : **refonte de `redis-client.ts`** (API changed, BLPOP/SUBSCRIBE différents). Profiter pour fixer la dette `ioredis` non déclarée (cf §11 P3) — soit déclarer explicitement, soit unifier sur `node-redis` v5.
- [ ] Bump `zod` 3 → 4 : ~25 schémas à re-vérifier (`.transform`, `.refine` ont changé), valider le middleware `validate(schema)` sur toutes les routes.
- [x] Bump `nodemailer` 6 → 8 : **FAIT 10/06 (#121)** via le chantier sécu override (`<8.0.4` SMTP injection) — override `^8.0.10` + dep backend `^8.0.0` (API core SMTP stable, 34 tests mail verts). NB : d'autres bumps de la même classe ont été faits par voie sécu-override (turbo 1→2 #138, vitest 1→3 #133, bcrypt 5→6 #125, uuid 9→11 #139) — voir §11 P3 « Triage vulns transitives ». Restent en Lot 4 strict : prisma 5→7, react-router 6→7, node 20→26, typescript 5→6, redis 4→5, zod 3→4, @typescript-eslint 6→8 + eslint 8→9.
- [ ] Bump `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` 6 → 8 : couplé à la migration TS 6 (Lot 4 ci-dessus) + bumper `eslint` 8 → 9 (déjà déprécié, warning au boot).

#### Règles transverses du chantier

- Toujours `pnpm install` + smoke test backend + frontend après chaque paquet de PRs mergé.
- Si une régression apparaît, **isoler par bisect** (re-tester chaque PR du paquet une par une) — c'est ce qui a permis d'identifier l'override path-to-regexp comme cause racine (pas une PR Dependabot elle-même).
- Réflexe `git pull` : si conflit sur `pnpm-lock.yaml`, faire `git checkout -- pnpm-lock.yaml` avant pull, puis `pnpm install` après pull (le cloud main est source de vérité).
- Tenir à jour la coche `[x]` au fur et à mesure des merges.

### 14.6 Déjà en place (durcissement backend) — NON listé avant, mais implémenté

Le code est plus avancé que cette roadmap ne le laissait croire. Sont **déjà en place** (audit 27/06) et ne nécessitent aucun travail prod :
- **Helmet / CSP / security headers** (`security-headers.ts`, câblé `app.ts`)
- **Rate-limiting** (`rate-limit-middleware.ts`, appliqué)
- **Healthchecks** (`/health`, `/detailed`, `/ready`, `/live`)
- **Trust-proxy** (`app.ts`, via `TRUST_PROXY` — requis pour les secure cookies derrière reverse-proxy)
- **OpenTelemetry** (`core/telemetry.ts`, câblé dans `index.ts`)
- **SSL/HTTPS** : délégué à l'hébergeur (Vercel/plateforme) — correct, pas de serveur HTTPS à coder.

→ **Le vrai blocage déploiement n'est PAS le code** (le durcissement est fait), **mais l'infra + les secrets** (14.1 + 14.2 + domaine), à provisionner sur les dashboards.

### 14.7 Procédure secrets prod (mémo pour le déploiement)

Quand l'infra sera créée : copier `.env.example` (la checklist, #213) comme modèle, puis renseigner les **vraies valeurs** dans le `.env` prod (gitignored) **ou** directement dans les variables d'environnement de l'hébergeur (Railway/Render/Vercel — interface chiffrée, rien de committé). Générer les secrets avec `openssl rand -hex 32` (JWT_*, INTERNAL_API_KEY, DATA_ENCRYPTION_KEY). **Ne JAMAIS committer de vraie valeur** — `.env.example` garde ses placeholders pour toujours.

---

## 15. Chantier MAJEUR — Catalogue réel (vrais SKU) + Scraper + Matcher IA + Rendu 3D photoréaliste

> Acté 12/06/2026 (décision Laurent). **Chantier pluri-semaines, à attaquer à froid par lots validés** (pas en fin de marathon). **PAS un simple MVP** — voir ci-dessous.

### 15.0 Objectif (non négociable)

L'IA qui propose des configurations de cuisine doit **piocher intelligemment dans de VRAIS SKU achetables** — référence produit réelle + **cotes précises au mm** + prix + dispo — pour **toutes les marques** (meuble **ET** électroménager), afin que chaque config soit **adaptée au mm près** et débouche sur un **devis commandable** (pas un « joli plan » conceptuel). Les **rendus d'images doivent être d'une qualité exceptionnelle et réaliste**.

> ⚠️ **EXIGENCE EXPLICITE LAURENT (12/06)** : **« je ne veux pas d'un simple MVP »**. La cible est le **système complet** (toutes marques, meuble + électroménager, catalogue vivant). La **tranche verticale IKEA** décidée ci-dessous n'est qu'une **preuve de chaîne end-to-end pour dérisquer**, **PAS le périmètre final**. Une fois la chaîne prouvée, le périmètre = **exhaustif** (récupérer TOUS les articles de n'importe quelle marque).

### 15.1 Pourquoi c'est critique

Sans ça, **aucune valeur commerciale** : aujourd'hui le « catalogue » = **~100 produits seedés à la main** (`'Sample Catalog Items'` : Schmidt/Bosch/IKEA/Leroy/Castorama) + quelques CSV statiques (`catalog-providers/sample-catalogs/`). **Aucun flux live.** L'IA génère de **vrais multi-designs depuis les cotes** (✅ Claude + fallback algo) mais avec des **matériaux génériques**, non rattachés à des SKU achetables.

### 15.2 Audit par preuve (11-12/06/2026)

- **3d-engine (rendu)** ✅ base **PBR déjà présente** : `MeshStandardMaterial` (roughness/metalness/normalMap/aoMap/map/aoMap), chargement **GLTF/GLB** (`scene.ts:334`), IA layout/placement déjà dans le moteur (`ai/layout-generator`, `cabinet-solver`, `smart-placement`). **Manque pour « photoréaliste exceptionnel »** : environnement **HDRI** + éventuel **pathtracing**.
- **Scraper** (`packages/scraper`) : **vraie base** — `ikea.ts` (773 l., utilise endpoints + **JSON-LD** IKEA, extrait `sku`/prix/dimensions), scrapers concrets pour 8 marques (ikea/leroy-merlin/castorama/schmidt/mobalpa/cuisinella/but/nobilia), `base-scraper` puppeteer+cheerio, modèles avec **cotes mm normalisées** (`width/height/depth // mm`, `reference`, `priceTTC`, `brandId`). **MAIS** : 🔴 **0 test**, jamais validé live ; DB Prisma **séparée** du catalogue principal. **⚠️ CORRECTION 14/06 (test live, cf §15.7)** : l'affirmation « seul `puppeteer-core`, pas de Chromium → ne lance pas de navigateur » était **FAUSSE** — c'est **`puppeteer` ^22 full + Chromium téléchargé** (lance un browser, **bypasse Cloudflare** prouvé) ; les vrais problèmes sont ailleurs : **client Prisma scraper jamais généré** (typecheck RED, couche `scrape-manager` cassée) + **URLs/JSON-LD périmés** (chemin HTML mort en 2026). Inventaire réel : **22 495 lignes** (pas « base mince ») — 8 scrapers réels (650-900 l.) sur framework anti-détection de 1330 l.
- **catalog-providers/** (15+ groupes électroménager : BSH/Bosch, Miele, Samsung, LG, Electrolux, Whirlpool, Haier, Smeg…) = **scaffolding** (api-client/transformer/validator/schema-mapper par marque) tapant un endpoint **générique `…/products?…` hypothétique**, `credentials.example.json` (pas de vraies clés). **Les « APIs officielles » annoncées (Home Connect / SmartThings / ThinQ) sont des APIs de CONTRÔLE d'appareils connectés, PAS des catalogues produit** → **fausse piste**, aucun accès catalogue live électroménager réel.
- **Catalogue principal** : modèle `CatalogItem` existe (dims) — **à étendre** (réf SKU, mm entiers, `dimensionConfidence`, stock, brand, images, compatibilité).

### 15.3 Architecture cible — **hybride + normalisé** (PAS « un scraper universel »)

Reality-check assumé : un scraper est **par-site** (≠ universel), **fragile** (sélecteurs cassent), à **maintenir** ; « au mm près » **dépend de la source** (IKEA = données structurées propres ; beaucoup d'autres = marketing sans cotes fiables) ; **légal/anti-bot = risque business** (CGU, copyright images/specs, RGPD, proxies/stealth à l'échelle) à cadrer **avant de scaler**.

```
SOURCES (par fiabilité)                         →  NORMALISATION              →  USAGE IA
1. Feeds officiels/structurés (IKEA JSON-LD,       Schéma produit UNIFIÉ :       MATCHER IA↔catalogue :
   flux affiliés Awin/Effiliation, PIM/GS1)         reference(SKU), brand,        l'IA propose un layout →
2. Scraping ciblé par marque (stealth+rate-limit,    category, dims **mm int**,    on sélectionne les VRAIS
   JSON-LD d'abord, sélecteurs de secours)           dimensionConfidence,          SKU qui rentrent **au mm**
3. Data partenaire/manuelle (marques sans flux)      priceTTC, stock, images[],    dans chaque emplacement
   ⮕ chaque source alimente le MÊME schéma           compatibility                 (dims + style + budget)
```

### 15.4 Deux tracks

- **Track A — « l'intelligence » (le VRAI maillon manquant)** — **buildable + validable hors-infra (tests)** :
  1. **Schéma produit unifié** (Prisma, catalogue principal) avec cotes **mm entières** + `dimensionConfidence`.
  2. **Normaliseur de cotes** : parse tout format (`cm`, `"L60×H80"`, `mm`…) → **mm entiers** + flag de fiabilité ; **l'IA ne pioche QUE dans les SKU à cotes fiables** (garantie « au mm près » réelle, pas illusoire).
  3. **Matcher IA ↔ catalogue** : transforme « plan conceptuel » en **sélection de vrais SKU** (contrainte dims/style/budget par slot) → **devis réel** (réf + prix + total). Validable avec **fixtures** (SKU seedés + samples).
- **Track B — scraping réel** — **nécessite une infra dédiée (pas l'env de dev courant)** :
  - Stratégie navigateur : **Chromium + stealth + proxies rotatifs + rate-limit** (remplacer le `puppeteer-core` nu).
  - Durcir les scrapers (**JSON-LD d'abord**, sélecteurs de secours), **tests sur fixtures HTML** (validable) + runs live (validables seulement sur l'infra).
  - **Légal** (CGU/affiliation) = décision business **préalable** au scaling.
  - Ingestion scraper-DB → catalogue principal **via le normaliseur**.

### 15.5 Décisions actées (12/06)

- **Stratégie** : commencer par **une tranche verticale IKEA bout-en-bout** (meilleure source, données structurées) pour **prouver la chaîne** (scrape→normalise mm→catalogue→l'IA pioche de vrais SKU IKEA→devis→rendu) — **MAIS périmètre final = exhaustif toutes marques** (cf 15.0, **pas un MVP**). Commencer par le **Track A** (débloque la valeur + valide par preuve) ; Track B se durcit en parallèle, se valide sur infra.
- **Images** : ✅ **rendu 3D photoréaliste** de la cuisine **assemblée à partir des vrais SKU** (PBR + HDRI sur le `@kitchenxpert/3d-engine`) = wow **ET** fidèle à la config au mm. ❌ **NE PAS utiliser l'IA image-gen pour les images PRODUIT du devis** (hallucine les SKU → image ≠ produits réels = risque commercial/juridique) ; IA-image réservée au **moodboard/ambiance**.
- **Électroménager** : même schéma unifié + matcher ; sources via feeds/scraping ciblé (les « APIs officielles » device-control sont à **écarter** comme source catalogue).

### 15.6 Prérequis / risques

- Infra scraping (Chrome + proxies) — bloque Track B live.
- Cadrage **légal** (CGU/affiliation/RGPD/copyright images) — bloque le scaling multi-marques.
- Qualité **données mm** hétérogène selon source — le `dimensionConfidence` est le garde-fou.
- `@kitchenxpert/guides` (Astro) hors scope §3 — sans rapport.

### 15.7 Audit par preuve + test live IKEA (14/06/2026) — corrige §15.1/15.2/15.4

> Session audit-first (lecture seule) puis **test live autorisé par Laurent** (bypass Cloudflare assumé, research 10 produits, branche jetable, 0 commit src). Méthode « preuve > estimation ». Plusieurs claims de l'audit 11-12/06 étaient imprécis.

**A. Existant scraper (`packages/scraper`) — bien plus charnu que §15.2** : **22 495 lignes RÉELLES** (pas « base mince »). 8 scrapers (650-900 l. chacun, 31-44 sélecteurs cheerio, 0 stub) sur `base-scraper` (1330 l. : stealth, proxy-manager, rate-limiter, retry-handler, circuit-breaker, robots-parser, UA rotation) + 25 services + API server. Contrat abstrait uniforme (4 méthodes), sortie `ScrapedProduct` unifiée. **Correction §15.2** : `puppeteer` ^22 **full + Chromium installé** (≠ « core nu »). **Junk** : `tests/services/Document.rtf` = **76 Mo** commité (à nettoyer).

**B. `catalog-providers/` (racine, pas un package)** : **578 fichiers `.ts` VIDES (0 o)** par-marque (83 marques × api-client/transformer/validator/schema-mapper, API hypothétique morte) **+ 24 fichiers RÉELS** = framework d'import **file-based déclaratif** (common/ + universal-importer/ + bulk-import/ + cli/generate-provider). → la couche API par-marque est du scaffolding mort ; l'infra file-based est réelle et réutilisable.

**C. Track A « intelligence » — EXISTE massivement (≠ greenfield §15.4)** : backend a **25 services AI réels, 9237 lignes, 0 vide** (`anthropic.service`, `catalog-search`, `bom-generator`, `product-matcher`, `product-enrichment`, `auto-design-pipeline`, `design-generator`, `tool-use-3d`…). Pièces §15.4 :
  - **Normaliseur** : `data-normalizer` (970 l.) snap aux dims standard **mm** + mapping FR/EN + `NormalizationResult{errors,warnings,changes}` (proto-confiance, pas de `dimensionConfidence` numérique).
  - **`catalog-search` = BON pattern** : Claude extrait des filtres → **`prisma.product.findMany` réel** (filtre dims `width` gte/lte + prix) → vrais SKU, **zéro hallucination**. = backbone du matcher.
  - **`bom-generator` = à REFONDRE** : demande à **Claude d'inventer prix + `catalogRef`** → devis **hallucinable, pas commandable** (anti-objectif §15.0).
  - **`product-matcher`** : équivalence produit↔produit cross-fournisseur (Claude + pré-filtre dim±10%/prix±20% + batch) — **technique réutilisable** pour le matcher layout→SKU.
  - **Gap réel §15.4** = (1) catalogue vide, (2) bom-generator hallucine, (3) **binding layout→SKU absent** (3d-engine `layout-generator`/`cabinet-solver` non joints à `catalog-search`), (4) pas de `dimensionConfidence` + **0 test d'intégration**.

**D. 🎯 TEST LIVE IKEA — verdict B+ (le code n'est pas à jeter)** :
  - 🟢 **Stealth bat Cloudflare** : puppeteer-stealth a récupéré 526 Ko de vrai HTML, **sans challenge, sans proxy**. Le framework anti-détection (1330 l.) **marche en 2026** = l'asset le plus précieux.
  - 🔴 **Chemin HTML/JSON-LD mort** : URLs hardcodées périmées (produit + catégorie → landing « Tous nos produits »), **0 bloc JSON-LD** (pages SPA `__next`), or `ikea.ts` en dépend (ikea.ts:372). Typecheck RED (Prisma scraper jamais généré).
  - 🟢 **SOLUTION PROUVÉE = chemin API** : IKEA expose `https://sik.search.blue.cdtapps.com/fr/fr/search-result-page?q=<kw>` — **pas de Cloudflare** (host CDN séparé), **JSON structuré** (`itemNoGlobal`=SKU, `itemMeasureReferenceText`=cotes, `salesPrice`=prix, `pipUrl`, `colors`). **64 SKU IKEA réels extraits + normalisés en mm + dimensionConfidence** en une passe (ex. METOD 600×600×800mm/34€). Records **directement consommables par le matcher**.
  - **Bug exact dans `ikea.ts` `fetchCategoryProducts` (3 corrections)** : (1) endpoint périmé `/search?q=*&category=<id>` (**404**) → `/search-result-page?q=<kw>` (**200**) ; (2) mapping faux `response.products` → `searchResultPage.products.main.items[].product` ; (3) parser `"60x60x80 cm"`→ mm int (prouvé). Preuves dans `.scrape-output/` (gitignored).

**E. Décisions stack — orientation fondée sur preuve (à formaliser)** :
  1. **NE PAS migrer vers Crawlee/Firecrawl** : le stealth existant bat déjà Cloudflare ; migrer perdrait un asset qui marche, et Crawlee ne résout pas Cloudflare gratuitement.
  2. **Stratégie API/feeds-first, scraping HTML en secours** (prouvé sur IKEA) — confirme §15.3. Pour les retailers à API (sik.search est un backend IKEA standard), zéro HTML/anti-bot.
  3. **Normaliseur** : étendre `Product` d'un `dimensionConfidence` ; réutiliser `data-normalizer` + le parser de cotes prouvé.
  4. **Matcher** : brancher les SKU normalisés sur le backbone `catalog-search` (filtre dims/prix) + technique `product-matcher` ; **refondre `bom-generator`** pour sourcer de vrais SKU (fin de l'hallucination).
  5. **Reste cohérent** : rendu 3D photoréaliste (PBR+HDRI sur 3d-engine, cf §15.5) inchangé.

**Acquit méthodo** : (a) un test live de 2 navigations a tranché ce que 0 test laissait flou depuis l'origine ; (b) le maillon dur n'est PAS le parsing mais **API-vs-HTML + anti-bot** ; (c) auto-challenge a corrigé 2 faux (puppeteer-core ; root node_modules vide alors que pnpm hoiste).

### 15.8 — Stratégie d'ingestion catalogue v1.0 (décisions consolidées 14/06)

> **Dépendance** : se chaîne après §15.7 (PR #161). Cette section est doc-only ; les PRs de code (`feat/ikea-api-first-strategy` et suivantes) référenceront §15.8 comme source de vérité stratégique.

**Contexte.** Suite à l'audit §15.7 (PR #161) prouvant que le scraper actuel est à **3 corrections** d'être fonctionnel via l'**API interne IKEA**, et au web search état de l'art scraping 2026 (Crawlee, Firecrawl/Crawl4AI, proxies). 5 décisions structurantes formalisées en session 14/06 (Q1, Q2.a/b/c, Q3.a) ; Q3.b–Q5 tranchées par délégation explicite Laurent (« tu as compris, je suis tes reco »).

#### Les 7 principes

**Principe 1 — Cascade d'ingestion par marque (Q1)**

Pour chaque marque, dans l'ordre :

- **N1** — API officielle gratuite + JSON-LD (rare, checké par marque)
- **N2** — API interne site (cas IKEA prouvé : `sik.search.blue.cdtapps.com`)
- **N3** — Scraping HTML cheerio
- **N4** — Playwright + stealth (sites anti-bot)
- ❌ **N5** — SaaS payant (Apify / Bright Data / Firecrawl) **EXCLU**

Justification : preuve IKEA niveau 2 (§15.7), état de l'art 2026 confirme l'approche cascade, règle « API gratuite ou scraping maison ; jamais de SaaS payant » (Q2.c).

**Principe 2 — Strategy pattern + Adapters (Q3.a)**

- 1 `IngestionOrchestrator` (router cascade)
- 4 Adapters réutilisables : `ApiAdapter`, `JsonLdAdapter`, `HtmlAdapter`, `PlaywrightAdapter`
- N Strategies par marque (~30 à terme)
- Refonte progressive : `ikea.ts` → `IkeaStrategy`, puis les 7 autres scrapers

Justification : capitaliser les **22 495 lignes existantes** en restructurant (cf §15.7). Strategy pattern éprouvé. Évolutif (ajout marque = ajout Strategy).

**Principe 3 — Schéma de sortie unifié strict (Q3.b)**

`backend.Product` = socle DB unique. À enrichir :

- `dimensionConfidence: Float` (0.0–1.0)
- `sourceLevel: Int` (1–4) du niveau cascade ayant fourni la donnée
- `sourceUrl: String` (traçabilité légale)
- `lastVerifiedAt: DateTime` (drift detection)

Champs métier marque → `specifications Json` (déjà existant). Validation **Zod stricte** en sortie de chaque Strategy : invalide → log warning + skip (pas de crash).

**Principe 4 — Validation stratifiée (Q4)**

- **Couche 1 — Tests fixtures par strategy** : `<brand>.fixture.html`/`.json` + tests Vitest
- **Couche 2 — Validation Zod** à l'output
- **Couche 3 — Monitoring drift sélecteurs** : metric `extraction_success_rate` / marque / 24h ; alert si chute > 50%
- **Couche 4 — Observabilité runtime** : OpenTelemetry (déjà backend §11) + Sentry + winston JSON

**Principe 5 — Légal défensif (Q2.a/b)**

- **Mode test interne** tant que pas d'avocat IT/PI consulté
- **Skip Awin/Effiliation** (Q2.b)
- Documentation rigoureuse (sources, dates, méthodes) pour défense éventuelle
- robots.txt respecté, rate-limit éthique, UA identifiant

**Principe 6 — DB unifiée `backend.Product` (Q3.c)**

- Suppression **progressive** de la DB scraper séparée (25 modèles granulaires Cabinet/Worktop/Facade/Handle/Appliance)
- Champs métier → `backend.Product.specifications` Json
- Scraper Prisma garde UNIQUEMENT les tables opérationnelles (`ScrapeLog`, `PriceHistory`, `ScrapeCache`, RateLimit state)

**Principe 7 — Hébergement reporté à §14.2 (Q5)**

- Run **local manuel** pour les premiers mois
- BullMQ + Upstash Redis prêt mais **pas** utilisé en cron
- Décision auto-scheduling : après §14.2 tranché + 3-5 marques validées

#### Optionnel à valider plus tard

**BIMobject API** — découverte session 14/06 :

- API REST OAuth 2.0 publique (1000+ marques, 300k BIM objects paramétriques)
- SDK MIT open-source ; inscription développeur gratuite
- ⚠️ Free tier **commercial** à valider (probablement payant pour usage commercial sérieux)
- Cohérence avec Q2.c « jamais payant » : à tester gratuitement avant de décider (~30 min inscription + exploration)
- Si free tier commercial valide → BIMobject devient **niveau 1 enrichi** pour cotes/specifications (prix toujours scraping). Sinon exclu.

#### Roadmap §15 (étapes priorisées)

| # | Étape | Effort | Statut |
|---|-------|--------|--------|
| a | Fix `ikea.ts` → `IkeaStrategy` API-first (PR1) | 4-6h | **À FAIRE (priorité immédiate)** |
| b | Tester pattern sur 1 autre marque (PR2) | 3-4h | Après PR1 |
| c | Refondre les 7 autres scrapers en Strategies | progressive | Après validation pattern |
| d | Migration DB + suppression scraper Prisma séparée | 2-3h | Après PRs a-c |
| e | Observabilité runtime (drift detection + alerts) | 2-3h | Après volume justifie |
| f | Test BIMobject API (free tier ?) | 30 min | Quand temps |
| g | Décision auto-scheduling (Q5) | TBD | Après §14.2 + 3-5 marques OK |

#### Acquit méthodologique consolidé

**Nouvelle règle (cumul session 14/06)** :

> « API gratuite > scraping maison ; jamais de SaaS payant »

Justifications cumulées : cohérence positionnement micro-entrepreneur (CapEx temps > OpEx mensuel récurrent) ; indépendance des vendors externes ; pas de dépendance contractuelle (Apify/Bright Data → terms changent) ; système 100 % sous contrôle interne.

**Acquit complémentaire (13-14/06, cf §15.7)** :

> « API-first avant scraping HTML : taper l'endpoint interne du site retourne du JSON propre, plus rapide et fiable »

Pattern de découverte : (1) DevTools Network sur page catalogue → (2) filtrer XHR/Fetch → (3) identifier les endpoints internes utilisés par le site → (4) souvent JSON propre sans Cloudflare → (5) taper directement = plus rapide, plus fiable, moins coûteux qu'un browser.

### 15.8.1 — Sources tierces gratuites (audit b-ter, 15/06/2026)

> Audit-first pur (curl + parsing, ~17 URLs, UA `KitchenXpert-research/0.2`, rate-limit, aucun bypass anti-bot). 3 POC pour combler les gaps **cotes/prix/catégorie** sur les marques bloquées (LM/But/Castorama anti-bot) et la catégorie **électroménager** mal couverte par les Strategies retailer.

#### POC 1 — EPREL (registre UE) → 🟢 **GO MASSIF**

**Source** : European Product Registry for Energy Labelling, créé par **Règlement (UE) 2017/1369**. Public, gratuit, **légalement propre** (transparence consommateur obligatoire = réutilisation prévue par le texte).

**Endpoint** (prouvé live) : `GET https://eprel.ec.europa.eu/api/products/{group}?_page=1&_limit=N` **avec header `Origin: https://eprel.ec.europa.eu`** (sans le header → 403 ; c'est l'API publique que le SPA du site appelle lui-même, **pas de clé API, pas un bypass anti-bot**). Sans Origin, l'API REST « registered » (`/api/public/*`) exige une clé EU-Login (gratuite mais sur inscription).

**Couverture cuisine** (≈ 118k SKU, comptes `size` réels) :

- `refrigeratingappliances2019` : **54 446** (cotes présentes, ex. `580/1730/580`)
- `ovens` : **26 952** (⚠️ `dimension*` top-level vides → cotes sous d'autres champs/cavité, à creuser)
- `rangehoods` : **22 873** (⚠️ idem fours)
- `dishwashers2019` : **13 864** (cotes présentes, ex. `60/85/60`)
- Plaques (`cookinghobs`) + caves à vin : à inventorier

**Schéma par hit** : `modelIdentifier` (réf fabricant), `supplierOrTrademark`/`organisation.organisationName` (marque), `eprelRegistrationNumber`, `dimensionWidth/Height/Depth`, `energyClass`, `noise`, `ratedCapacity`…

**⚠️ Piège normaliseur — unité variable par groupe** : lave-vaisselle en **cm** (`60/85/60`), frigos en **mm** (`580/1730/580`). L'`EprelApplianceStrategy` doit porter une **table d'unité par `implementingAct`** + bornes de sanity (ex. dishwasher `60` < 300 ⇒ cm). Le framework `dimensionConfidence` + `rawMeasureText` (§15.0) couvre exactement ce risque.

**Usages cumulables** : (1) **source directe** appliance (catalogue électroménager complet) ; (2) **enrichisseur** — matcher un SKU appliance retailer ↔ EPREL par `brand + modelIdentifier` (technique `product-matcher` §15.4).

**Limite** : **pas de prix** (registre énergie ≠ catalogue commercial). Le prix reste à sourcer ailleurs (retailer).

**Impact mapper (PR #172)** : **aucun**. EPREL respecte le contrat `UnifiedProduct` → `mapUnifiedProductToUpsert` le traite tel quel ; unité-par-groupe + match = **niveau Strategy**, pas mapper ; `energyClass`/`noise`/`eprelRegistrationNumber` → `specifications` (déjà spread). La raison de « hold » de #172 tombe : l'enrichment arrive comme **nouvelles sources alimentant le même UnifiedProduct** → mapper enrichment-agnostic, #172 mergeable tel quel.

#### POC 2 — Sites fabricants amont → 🟡 **NO-GO maintenant**

Sites des fabricants tiers vendus sur Lapeyre/LM. Audit : `espe.it` ouvert + JSON-LD (1 bloc) ; `louka.fr` **403** ; `bosch-home.fr` 200 mais **pas de JSON-LD** en home (et EPREL couvre déjà Bosch). NO-GO car : (a) cotes meuble Lapeyre déjà fournies par XHR (#165) → faible valeur ; (b) matching brand+model par-fabricant = effort élevé / couverture niche ; (c) 1/3 bloqué. À reconsidérer **par marque** si un besoin cotes-meuble précis émerge.

#### POC 3 — Sitemaps retailers N4 → 🔴 **NO-GO**

Les sitemaps **ne contournent pas** l'anti-bot :

- **LM** : `robots.txt` = **`Disallow: /`** + aucun sitemap public. **Exclusion structurelle explicite** (≠ un anti-bot N4 que le stealth « autoriserait ») → LM **hors scope scraping toutes méthodes**, y compris Playwright (le faire violerait robots.txt — à proscrire, §15.8 Principe 5).
- **But** : sitemap index 200 mais `sitemap-produits-*.xml` → **403** (DataDome étendu).
- **Castorama** : non retesté (CloudFront 503 déjà connu).

#### Mise à jour roadmap §15.8

- **(b-ter)** EprelApplianceStrategy — source N1 électroménager (~118k SKU), à insérer après (b-bis) cotes Lapeyre (#165). Effort ≈ 4-6h. Réutilise `UnifiedProduct` + `ApiAdapter` générique + `data-normalizer` (table d'unité par groupe). Recommandée **après la Phase 4** (persistance live IKEA/Lapeyre prouvée d'abord).
- **LM = exclusion structurelle** retirée du backlog scraping (pivot éventuel : feeds B2B / partenariats marchands / abandon).

**Acquit b-ter** : un registre **réglementaire** (EPREL) bat le scraping retailer sur l'électroménager — données officielles, gratuites, légalement propres, structurées — là où §15.2 ne voyait « aucune source catalogue live ». Le header `Origin` distingue l'API publique (sans clé) de l'API registered (clé EU-Login) : tester avec les headers du SPA avant de conclure « auth requise ».

### 15.8.2 — Audit qualité cotes web cooking (19/06/2026)

**Contexte.** Sweep web multi-agents §15.8 a ajouté 277 cotes fours/hottes (PRs #172-#181). Audit qualité manuel 20 SKU stratifiés (18/06) → 70% match, 3 mismatches critiques (Beko 10cm, LG 3cm, Cata 4cm), 2 partiels.

**Méthode.** Calibration empirique avant règles : 8 sondes SQL read-only sur la distribution réelle, buckets dimensions, valeurs distinctes, extrêmes par groupe. Résultat → règles plages inefficaces (les 3 mismatches sont dans les plages attendues). Stratégie pivotée : intervention chirurgicale par cas plutôt que filtre par règle.

**Constats empiriques.**

- Modulo cuisinière `{50, 60, 70, 90}` majoritaire, variants légitimes 53.5/88/89 (slim Meireles, Oranier)
- Width fours encastrables : 14 valeurs distinctes (59.2/59.4/59.5/59.6/59.8/60) toutes légitimes — drift fabricant normal
- Ovens = 3 populations height : countertop <40, compact 40-49, encastrable 58-60, freestanding 80+
- Rangehoods height : distribution continue 8cm (slim) → 119cm (cheminée déployée), pas de pic clair

**Actions appliquées (harness `.scrape-output/apply-quality-corrections.ts`, gitignored).**

- **2 UPDATE cotes** (qualityFlag='audit_corrected') :
  - `BEKO-511-FSM58301XCDT` width 60→50 (cuisinière slim, source manomano avait pris largeur four interne du titre marketing)
  - `LG ELECTRONICS INC.-WSED7613B` height 59.4→56.4 (la valeur 59.4 = hauteur min niche, pas hauteur produit)
- **13 SOFT-DELETE** (qualityFlag tracé dans `specifications`, `isActive=false`, `deletedAt` set, **reversibles**) :
  - 2 Cookwise air fryer countertop mal classifiés (`wrong_category_countertop_airfryer`)
  - 1 Meireles MF 1604 depth atypique non vérifié (`atypical_depth_49_9_unverified`)
  - 5 Karinear/Disaenvir/Karienvir depth 47 marques obscures (`obscure_brand_atypical_depth_47`)
  - 1 Firegas hotte sans height ni depth (`missing_height_and_depth`)
  - 4 hottes sans height : Cata SIRIN GWH (= SKU audit #10), Steel EKL100, 2 Edesa ECV-98321 (`missing_height`)

**État post-apply.** Cooking actif **277 → 264** (ovens 195, rangehoods 69). Tous les soft-delete sont reversibles (`isActive=false` + `deletedAt`). Pas de destruction de données. Tracé via `specifications.chantier = 'cooking-dims-quality-v2-2026-06-19'`.

**Leçons capitalisées.**

- **L1. Modulo cuisinière non strict.** Variants 53.5/88/89 sont des vrais produits (Meireles slim, Oranier cuisinière classique) → règle modulo = WARN, pas CRITICAL.
- **L2. Drift mesure four encastrable.** Width 59.2/59.4/59.5/59.6/59.8/60.0 = même catégorie produit → le scraper doit accepter ce drift sans flag.
- **L3. Piège niche vs produit.** Sources commerciales (manua.ls, manomano) confondent souvent hauteur produit four encastrable (~56cm) avec hauteur min niche (~59-60cm). À documenter dans les prompts sweep web.
- **L4. Piège titre marketing.** Cuisinière "60 cm" annoncée dans le titre = largeur du four interne, pas du produit (Beko FSM58301XCDT vraie largeur 50cm confirmée). À documenter aussi.
- **L5. Marques obscures + dimensions atypiques = exclusion prudente.** Karinear/Disaenvir/Karienvir/Firegas tous depth 47cm exact = marques chinoises low-cost Amazon, possibles erreurs de scraping, exclues prudemment.

**Pendings tracés.**

- **P1. Doublons SKU.** `COOKWISE-AFO--17D-RC3` vs `COOKWISE-AFO-17D-RC3` (double tiret), trailing spaces dans `modelIdentifier` (`'E 911 '`, `'AFO- 17D-RC3   '`) → chantier `scraper-normalize` séparé.
- **P2. Brands non normalisés.** `'CATA'` vs `'Cata '` (trailing space) vs `'Cata'`, `'comfee'` vs `'Comfee'`, possible typo `'Karinear'` → `'Karienvir'`. Hors scope.
- **P3. Précision réelle cotes web ≈ 70-85%, pas 100%.** Acceptée. À gérer via `dimensionConfidence` dans le matcher catalogue↔design à venir (alerte designer si conf < seuil).
- **P4. VRAI fix long-terme = MATCHER catalogue↔design** (priorité #1 prochain chantier, §15.7 dette `bom-generator hallucine catalogRef`), avec fallback gracieux si `dimensionConfidence < seuil`.

**Méthodologie réutilisable.** Pour tout futur audit qualité de cotes scrapées : (a) audit manuel stratifié 20 SKU pour mesurer le taux d'erreur réel ; (b) calibration empirique par sondes SQL avant de figer des règles ; (c) intervention chirurgicale par cas si les valeurs fausses sont dans les plages attendues (filtre statistique inefficace) ; (d) harness `.scrape-output/` gitignored + PR doc-only pour la traçabilité.

### 15.8.3 — Castorama re-ingestion v2 (20/06/2026)

**Contexte.** Suite audit qualité §15.8.2 (cooking propre), chantier de fond Castorama meubles : cotes incomplètes (name-parse Castorama → 11-14% cotes complètes meuble). Objectif : enrichir catalogue Castorama pour matcher catalogue↔design.

**PR #184 mergée — parseSpecTable v2.** Parser HTML PDP `table[aria-labelledby="specifications"]` (regex dep-free, packages/common). 6 mappings ProductType (cabinet/worktop/facade/sink/tap/appliance) + sanity bounds par type. Brand réelle dans `specifications.brand` (SKU stable, pas écrasement top-level). Validation live POC : 8/10 plaques uplift à 3 cotes (vs 0 avant), parser fonctionne.

**Run rebaseline 20/06 incomplet.** Lancé avec MAX=5000 (mode exhaustif) → 7497 SKU ingérés en ~3h, mais :
- Volumes très sous-estimés initialement : façade 4140, meuble-haut 992, lavage 245 (vs estimations §15.8 "56/67/125")
- 6 catégories échouées sur CloudFront 503 : meuble-bas (sauf 4 "joues finition"), evier, robinet, four, hotte, plaque (jamais atteintes)
- Audit DOM Castorama prouve : extractPdpUrls est correct (24 liens grille `data-testid="product"`, zéro cross-sell). Le bug n'était pas dans le scraper.
- Vraie taxonomie meuble Castorama : la page meuble-bas cat_id_5087 liste de vrais caissons jamais ingérés. La baseline "43 meuble-bas" pré-19/06 était des "Joues de finition" mal taggées comme caissons.

**Sûreté EPREL préservée.** Audit Étape A (19/06) avait prouvé namespaces disjoints (CASTORAMA-{ean} vs BEKO-, LG-, etc.) + UPSERT-OVERWRITE qui omet isActive/deletedAt. Post-run : 15 SKU audit §15.8.2 intacts (BEKO width=50, LG height=56.4, 13 soft-deletes EPREL inactifs).

**État DB post-run.** 7497 CASTORAMA-* actifs, dont ~440 avec 3 cotes complètes (vs 40 avant) grâce à parseSpecTable v2. Déséquilibre volumétrique acté (façade 4140 vs meuble-bas 4), à corriger en prochaine session via plafond par cat ou refactor archi (§15.8.4).

**Leçons capitalisées.**
- **L1. Volumes réels Castorama ≠ estimations §15.8.** Toujours re-mesurer par sondes DOM avant un run exhaustif.
- **L2. Plafond `maxProducts` mal calibré = marathon CloudFront 503.** 7000+ requêtes/cat = trigger rate-limit. Throttle 400ms insuffisant pour les grosses cats.
- **L3. parseSpecTable v2 = chantier critique acquis.** Pattern HTML stable, regex dep-free, 6 mappings, sanity bounds. Réutilisable IKEA / autres scrapers HTML.
- **L4. Audit DOM avant blâmer le scraper.** Mon hypothèse "cross-sell" était fausse. Toujours auditer un VRAI DOM live avant de modifier du code scraper.

**Pendings tracés.**
- P1. Re-run 6 cats manquantes (meuble-bas/evier/robinet/four/hotte/plaque) — sera fait après refactor gammes/variants §15.8.4.
- P2. Plafond `maxProducts` par cat à recalibrer (300-500/cat ?), throttle 800ms, retry-503 avec backoff.
- P3. Déséquilibre volumétrique catalogue : façade 4140 vs autres cats. À résoudre via refactor gammes/variants §15.8.4 (ne PAS appliquer dédup canonique simple).

### 15.8.4 — Pivot stratégique : chatbot couleur + architecture gammes/variants (20/06/2026)

**Insight Laurent (20/06).** Au lieu de stocker chaque variante couleur comme SKU séparé (~5000 façades Castorama = 17 couleurs × N gammes), proposition :
1. Génération cuisine produit des SKU "neutres" sur forme/dimensions/agencement
2. Customisation post-design via chatbot IA : user choisit la couleur, système applique (rendu 3D + resolve SKU final)

**Alignement industrie.** Les logiciels pro (IKEA Home Planner, Chief Architect, Homestyler, 2020 Design) utilisent ce pattern : forme/structure d'abord, finitions/couleur en post (cf. recherche §15.8.2). Notre approche initiale "1 SKU = 1 variante" était une mauvaise interprétation.

**Architecture 3 niveaux validée.**

- **Niveau 1 — GAMMES (canoniques)** : ce que le matcher #183 cherche. 1 entrée par (brand × gamme × dimensions). Champs : prix base/min/max, dimensions. Sans couleur fixe.
- **Niveau 2 — VARIANTS (déclinaisons)** : ce que le chatbot couleur propose. 1 entrée par couleur × finition disponible, liée à une gamme via `parentSku` FK. Garde les vrais SKU Castorama existants.
- **Niveau 3 — RENDU 3D** : couleur appliquée dynamiquement (texture/matériau). Indépendant du SKU exact si user veut une couleur non-disponible chez fournisseur.

**POC dédup 20/06 conservé comme bloc réutilisable.** Le POC `castorama-dedup-poc.ts` (clustering + signature gamme + extraction couleur dict 6-tiers + extraction taille du nom) FOURNIT les briques :
- Algorithme de canonicalisation (clustering par gamme × dimensions)
- Dictionnaire couleurs FR tendance 2026 (réutilisé par le chatbot pour SUGGÉRER, pas IMPOSER)
- Extraction taille depuis nom (anti-fusion 45/60cm)
- Résultats : 7497 → 6081 clusters identifiés, 1416 variants tracés

Ces blocs alimentent le refactor mais NE SONT PAS appliqués en DB en l'état (pas de soft-delete des variants — ils deviennent Niveau 2).

**Pivot acté — décisions.**
- PAS d'apply dédup ce soir (pas de soft-delete des 1416 variants identifiés par POC)
- Refactor gammes/variants = prochain chantier majeur
- ANTHROPIC_API_KEY requise pour Phase 2 chatbot couleur (cf. §15.7 dette config)

**Pendings tracés.**
- P4. Refactor schema : ajout `Product.parentSku` FK + `Product.isCanonical` boolean. Migration Prisma.
- P5. Service `ProductCanonicalizer` : applique POC à l'ingestion (post-scrape) → crée Niveau 1 (canoniques) à partir des variants.
- P6. Matcher #183 v2 : filtre `WHERE isCanonical = true`.
- P7. Chatbot couleur (Phase 2) : LLM lit `parentSku` du SKU sélectionné, propose les variants couleur dispos, SUGGÈRE tendances 2026 (dict POC).
- P8. Rendu 3D dynamique : texture appliquée au modèle METOD/façade indépendamment du SKU exact.

**Méthodologie réutilisable.** Avant tout chantier "stockage exhaustif catalogue", interroger : "est-ce qu'on stocke un INVARIANT (forme, dimensions) ou un CHOIX UTILISATEUR (couleur, finition) ?" Le second ne doit pas inflate le catalogue ; il doit être un paramètre runtime + référence SKU.

### 15.8.5 — Refactor gammes/variants LIVRÉ (P4-P6) + CI honnêteté (21-23/06/2026)

> Exécution du pivot §15.8.4. La séquence P4->P5->P6 est sur main, plus deux trous CI bouchés découverts en chemin. Workflow strict : audit-first, dry-run/oracle avant toute écriture, GO explicite, STOP sur data-loss.

**Séquence catalogue (4 PRs).**
- **#186 (P4)** — schema : `Product.parentSku String?` + self-relation `ProductVariants` (FK -> `sku @unique`, `onDelete: SetNull`, `onUpdate: Cascade`) + `isCanonical Boolean @default(false)` + 2 index. **`db push` a révélé une dérive** : la table `_seeds` (bookkeeping du seed-runner, jamais modélisée) allait être droppée -> STOP -> modélisée (`model Seed @@map("_seeds")`, calquée byte-for-byte sur le `CREATE TABLE` runtime, `executed_at` nullable). Dérive éliminée.
- **#187 (P5)** — `ProductCanonicalizer` : module pur `canonical-signature.ts` (signature/couleur/taille extraits verbatim du POC, typés) + script `canonicalize.ts` ré-exécutable (dry-run par défaut, `--apply` en `$transaction` gardée). **Appliqué : 6960 canoniques** (6081 Castorama + 879 EPREL promus en masse) + **1416 variants liés** via `parentSku`. Graphe : 0 orphelin, 0 SKU canonique-ET-variant. Oracle = re-run live MATCH EXACT (6081/1416). 17 tests sur le module pur (fixtures DB réelles).
- **#188** — fix tsc TS2532 dans `canonical-signature.ts` (`++` -> `(... ?? 0) + 1` sous `noUncheckedIndexedAccess`). Behavior-preserving (oracle identique).
- **#189 (P6)** — `isCanonical: true` au `where` de `DesignCatalogMatcher` + 2 tests (structurel + comportemental negative-control rouge-sans/vert-avec). **Pool actif 5614 -> 5212** ; 402 exclus = 360 variantes couleur Castorama (= l'objectif) + 42 legacy. Les 879 EPREL passent tous -> aucun électroménager exclu par erreur.

**Dette tracée.** 42 SKU legacy (ni Castorama ni EPREL) restent `isCanonical=false` -> invisibles au matcher. À auditer/promouvoir si besoin (impact <= 42).

**Pendings restants.** P7 chatbot couleur (exploite `parentSku`, requiert ANTHROPIC_API_KEY §15.7) ; P8 rendu 3D dynamique.

### 15.8.6 — P7 Phase 1 : cœur résolveur de couleur LIVRÉ (24-25/06/2026)

> Exploite le graphe `parentSku` (P5) pour transformer une gamme en offre couleur exploitable. Cœur **déterministe, sans clé LLM** — la couche conversationnelle (Phase 2) attend `ANTHROPIC_API_KEY`. 2 PRs.

**#195 — `normalizeColor` (normaliseur de couleur).** Module pur `services/variant-resolver/color-normalize.ts` : `normalizeColor(raw) -> { key, label, kind: color|material|unknown, score }`. 33 familles (22 couleur + 11 matériau) dérivées des **185 couleurs brutes réelles** du catalogue. Matching token-exact (pas de substring), stopwords (finitions : effet/panneau/haute/brillance/mat...), split camelCase (GrisBeige). **Couverture 99.6%** (6324/6350 SKU ; 26 unknown = bruit data : kWh/cm/"Non applicable"). 28 tests.
- **Décision : normaliseur SÉPARÉ de `COLOR_TIERS`, PAS une extension.** `COLOR_TIERS` est le dict de *scoring* P5 (il a choisi quels SKU sont canoniques). L'étendre pour normaliser aurait pollué le scoring et risqué de changer le graphe à un futur re-run `canonicalize --apply`. `normalizeColor` réutilise `extractColor`/`baseNorm` en **lecture seule** ; canonical-signature.ts intact.
- **Décision : matériau = option offrable taggée** (`kind:'material'`, score neutre 50), pas un axe séparé. Chêne/inox/béton = choix d'apparence pour l'utilisateur.
- **Bug attrapé par la mesure pondérée SKU** : la regex camelCase `[A-ZÀ-Ÿ]` (Ÿ=U+0178) avalait les minuscules accentuées -> "Chêne" cassé -> ~470 SKU perdus (90% au lieu de 99.6%). Fix `[A-Z]` ASCII, verrouillé par >=5 tests anti-régression. Leçon : mesurer la couverture **pondérée par volume**, pas par nombre de valeurs distinctes.

**#196 — `VariantResolverService`.** Service DI pur, **lecture seule** (findMany, zéro write, zéro LLM, zéro clé). `resolveColors(canonicalSku)` : union {canonique} ∪ {variants} (`isActive`, non supprimés) -> groupe par `normalizeColor(...).key` (unknown exclu) -> 1 SKU représentatif/couleur (le canonique s'il porte la couleur, sinon le moins cher ; prix invalide trié en dernier) -> tri `score desc, skuCount desc, label asc`. `resolveByColor(sku, colorKey) -> { sku, price } | null`. 10 tests, oracle = gamme Vicco réelle (11 SKU / 3 couleurs ; Noir -> 45.9 et non 46.9) ; tie-breakers verrouillés par un test à score égal (prouvé : échoue sans le critère skuCount).

**Gisement.** ~394 gammes offrent un choix couleur réel (>=2 couleurs distinctes, normalisées, union canonique+variants). **Inclure la couleur du canonique a triplé le gisement (115 -> 394)** : beaucoup de gammes ont des variants mono-couleur mais un canonique d'une autre couleur -> union = 2. C'est la valeur cachée du graphe P5.

**Pendings P7.** Phase 2 = couche LLM conversationnelle (suggestion tendance, requiert `ANTHROPIC_API_KEY` — secret à configurer). Puis : brancher `bom-generator` sur les vrais SKU résolus (au lieu du `catalogRef` halluciné, dette §15.7 P4) ; UI color-picker (greenfield, mount `ChatPanel` existant).

### 15.8.7 — P7 Phase 2 : chatbot couleur LIVRÉ (chaîne backend) (25-26/06/2026)

> La Phase 1 (§15.8.6) a posé le résolveur déterministe. La Phase 2 le branche en prod et le câble au LLM conversationnel. `ANTHROPIC_API_KEY` configurée (clé opérationnelle, test GO 200). Chaîne backend complète ; validation conversationnelle = à faire via le frontend.

**Découpage 2a (DB, sans clé) / 2b (LLM).** Le cœur de valeur (résoudre les couleurs) ne dépend pas du LLM ; seule la conversation l'exige. D'où : 2a buildable/testable sans clé, 2b par-dessus.

**#198 (2a) — `resolveColors` depuis n'importe quel SKU.** Le résolveur acceptait un canonicalSku ; il accepte désormais un variant OU un canonique, en remontant au canonique via `parentSku`. Nécessaire car l'utilisateur a souvent posé un variant (pas la tête de gamme). **OR-first** : cas canonique = 1 requête (l'OR ramène toute la gamme), variant isolé = 2 ; comptes de requêtes verrouillés par tests. Edge cases : SKU inconnu/orphelin -> `[]` ; canonique soft-deleted avec variants vivants -> résolvable via les variants.

**#199 (2a) — endpoint REST `GET /catalog/products/:sku/colors`.** Premier call-site prod de la famille de services DI (le matcher P6 n'en a jamais eu). Décision d'API : `findBySku` (existence) et `resolveColors` (offre) découplés -> SKU absent = **404**, SKU connu sans choix couleur = **200 `[]`** (distinct). 5 tests (mock req/res).

**#200 (2b-i) — instance partagée.** Extraction de l'instanciation dans `services/variant-resolver/index.ts` (singleton exporté) -> le cast `prisma as unknown as ResolverDb` vit à **un seul endroit**. Refactor pur (l'endpoint /colors se comporte à l'identique, mock inchangé). Fait AVANT d'ajouter le 2e consommateur (le tool LLM), pour ne pas dupliquer le cast.

**#201 (2b-ii) — tool LLM `resolve_colors`.** Déclaré dans `SHOPPING_CHAT_TOOLS` (`sku: string`), exposé à Claude aux 2 appels `messages.create`. Case dans `executeShoppingTool` : garde stricte sur `input.sku`, appelle le résolveur partagé, retourne `{ sku, colors }` ; **try/catch** -> une erreur DB dégrade en `{error}` au lieu de 500 le tour de chat (1er case non-stub). System prompt étendu : **règle anti-hallucination ferme** (ne jamais nommer une couleur absente du résultat ; appeler `resolve_colors` AVANT ; sur une envie, suggérer uniquement parmi les retours). `executeShoppingTool` exporté pour test.

**Testabilité (acquis méthodo).** Le dispatch est déterministe -> 6 tests unitaires (resolver mocké, sans LLM : sku valide/vide/non-string/inconnu/trim/throw-gracieux). Le **comportement conversationnel du LLM est non-déterministe** -> validé manuellement, PAS par de faux tests LLM fragiles. Distinction à garder pour les prochaines features LLM.

**Chaîne complète.** `parentSku` (P5) -> résolveur (#196) -> any-sku (#198) -> endpoint REST (#199) -> instance partagée (#200) -> tool LLM (#201).

**Pendings P7.** (1) **Validation conversationnelle — ✅ FAITE 28/06 par appel authentifié** (`POST /api/v1/ai-chat/shopping`, stack-up local, vraie clé Anthropic + vraie DB). Chaîne `parentSku → resolver → /shopping → tool LLM` **prouvée end-to-end** sur l'oracle Vicco `CASTORAMA-4251421945043` (Blanc 44.9 / Anthracite 44.9 / **Noir 45.9** — match exact §15.8.6). **3 cas** (positif = autre couleur réelle / négatif = couleur absente / résolution = Noir→prix), **preuve = `data.toolCalls[]` de la réponse HTTP** (PAS les logs : un succès est silencieux côté logs, cf §15.8.7 Q5). **Anti-hallucination confirmée** : le LLM appelle `resolve_colors` AVANT de nommer une couleur, ne propose QUE les couleurs retournées, refuse honnêtement une couleur absente (rouge → zéro invention, propose de chercher ailleurs), reporte le bon prix (Noir 45.9). ⚠️ **Contradiction (1)↔(2) levée** : c'est la **chaîne backend** qui est validée par appel authentifié ; **aucun chemin UI n'atteint `/shopping` aujourd'hui** (ChatPanel consomme le chat designer legacy `/stream`, pas `/shopping`) → l'UI reste à construire = pending (2). 📌 **Finding (validation 28/06) — décision** : `GET /catalog/products/:sku/colors` est **public par design** (données catalogue grand public, cf §2) — **pas une faille** ; le « authentifié » du harness était une prudence côté test, pas une exigence de l'endpoint. (2) **UI color-picker (greenfield, mount `ChatPanel`)** = la surface frontend restante (+ corriger le rate-limiter `/ai-chat`, cf §11 P3). (3) `bom-generator` : **fait pour les lignes catalog** (BOM-a, §15.8.8 — vrais SKU/prix DB) ; reste BOM-b (matcher pour les lignes config).

### 15.8.8 — BOM-a : devis déterministe depuis les vrais SKU (no LLM) (26/06/2026)

> Dette §15.7 P4 **résolue pour les lignes catalog** : `generateBOM` n'invente plus rien. Avant, il demandait au LLM de produire `catalogRef`, prix, quantités ET totaux (TVA comprise) — alors que les vraies données sont déjà en DB. Pire, le prompt passait `product.name` mais **jetait** `product.sku` et `product.price`. Désormais 100% déterministe, zéro appel LLM.

**Deux familles de lignes.**
- **Lignes `catalog`** (`source: 'catalog'`) : une par `kitchenItem` posé. Produit → `catalogRef = product.sku` réel + `product.price` DB ; électroménager → ref `"brand model"` (Appliance n'a pas de sku) + `appliance.price`. Lecture directe, prix exacts, aucune invention.
- **Lignes `estimated`** (`source: 'estimated'`) : dérivées de `kitchenConfiguration` (plan de travail, sol, crédence, quincaillerie, pose) via une table `BAREME_ESTIMATION` explicite et commentée. Placeholder — BOM-b les résoudra en vrais produits via le matcher.

**Honnêteté du devis (acquis produit).** Chaque ligne porte `source` ('catalog' = ferme / 'estimated' = barème), et `BillOfMaterials` expose `subtotalCatalog` / `subtotalEstimated` **séparés**. L'utilisateur voit combien est chiffré depuis le catalogue vs estimé — au lieu d'un total opaque où tout était inventé mais présenté comme réel.

**Totaux calculés en code.** `subtotal = catalog + estimated`, `tax = 20% subtotal`, arrondis 2 décimales (par ligne puis agrégat → les sous-totaux somment exactement). Le LLM ne calcule plus jamais d'argent.

**Acquis méthodo.** Un LLM ne doit JAMAIS être la source d'une donnée qui existe déjà en dur — *a fortiori* financière. Les sku/prix sont en DB → ils transitent par du code, pas par un prompt (un LLM peut recopier un sku ou un prix avec une erreur, inacceptable sur un devis). Corollaire : retirer le LLM a rendu le service **entièrement testable** (7 tests greenfield, le service n'en avait aucun).

**Types additifs (zéro rename).** `BOMItem` + `source` ; `BillOfMaterials` + `subtotalCatalog`/`subtotalEstimated`. Les 2 interfaces frontend locales (GeneratedDesigns, pdf-quote-generator) tolèrent les champs inconnus ; `catalogRef` conservé. Vérifié : aucun consommateur ne groupe sur `category` (le PDF lit la scène 3D, pas le BOM backend).

**Pendings BOM.** (1) **BOM-b — bloqué par prérequis data, pas actionnable en l'état.** L'audit (branche `feat/bom-b-config-matcher`) a montré que brancher les lignes `estimated` config sur le matcher P6 est bloqué sur 3 fronts : (a) `SlotType` ne couvre que meubles/électro/worktop — pas sol/crédence/quincaillerie (3 des 4 postes config) ; (b) `KitchenConfiguration` n'a aucune dimension, or le matcher exige `width` ; (c) le catalogue n'a ni catégorie ni produits pour ces familles, et le pool worktop canonique est vraisemblablement vide (seeds non canonicalisés). Un vrai BOM-b suppose d'abord un **chantier d'ingestion** (familles sol/crédence/plans-de-travail + dimensions + `dimensionConfidence` + canonicalisation), pas du matching. À ne pas retenter comme « simple suite de BOM-a ». (2) ~~Cleanup `SYSTEM_PROMPTS.BOM_GENERATOR`~~ → **fait (#205)** : constante orpheline retirée (retrait apparié template + version, imposé par le type `Record<keyof typeof SYSTEM_PROMPTS>`).

---

*Dernière mise à jour : 28/06/2026 — **Validation chatbot couleur (P7 Phase 2) par appel authentifié — GO chaîne IA.** Stack-up local (backend :4000, vraie clé Anthropic + vraie DB). Oracle Vicco `CASTORAMA-4251421945043` (Blanc 44.9 / Anthracite 44.9 / Noir 45.9) confirmé via `GET /colors`. Boucle conversationnelle `POST /ai-chat/shopping` testée sur 3 cas (positif/négatif/résolution) ; **preuve = `data.toolCalls[]`** (pas les logs). **Anti-hallucination GO** : le LLM appelle `resolve_colors` avant de nommer une couleur, ne propose que les couleurs retournées, refuse une couleur absente sans inventer, reporte le bon prix. Chaîne `parentSku→resolver→/shopping→tool LLM` prouvée end-to-end. **Doc-only** : §15.8.7 pending (1) marqué FAIT + contradiction (1)↔(2) levée (UI = greenfield restant) ; finding `/colors` public-by-design acté (§2) ; dette §11 P3 `aiUnauthRateLimiter` plafonne les authentifiés à 5/h (ordre middlewares). Aucun fichier src touché. main HEAD = `db48e19`. Branche : `docs/sync-claude-md-reality`.*

*Dernière mise à jour : 28/06/2026 — **Session hygiène (9 PRs #207-#215) + sync doc réalité.** Chantier formatage Prettier repo-wide bouclé (#207-#211, **Lint & Format Check vert sur main**, 1193 fichiers ; acquis autocrlf Windows/blob LF + non-idempotence Prettier 3 passes). `.env.example` complété checklist prod 69->92 vars (#213). §14 rafraîchie code-vs-doc (#214 : cookies/CORS faits, +14.6 durcissement déjà en place, +14.7 procédure secrets ; le vrai blocage prod = infra+secrets, pas le code). Cleanup config/linters mort (#215). **Doc actualisée à la réalité du code** : §3 64 models (Seed #186), §13 snapshot 28/06 + branches/cibles à jour (P4-P7+BOM-a livrés), §12 entrée 27-28/06, §14.5 nodemailer Lot 4 marqué fait (#121). main HEAD = `db48e19`. Branche : `docs/sync-claude-md-reality`.*

*Dernière mise à jour : 26/06/2026 — **Cleanup #205 + constat BOM-b.** #205 retire la constante orpheline `SYSTEM_PROMPTS.BOM_GENERATOR` (le barème prix que le LLM utilisait avant BOM-a), retrait apparié template + version imposé par le type. **BOM-b audité et bloqué** : le matcher P6 ne couvre pas sol/crédence/quincaillerie (`SlotType` = meubles/électro/worktop seulement), `KitchenConfiguration` n'a pas de dimensions (le matcher exige `width`), et le catalogue n'a ni ces familles ni un pool worktop canonique exploitable. → BOM-b n'est pas un prochain pas simple : il suppose un chantier d'ingestion data préalable (familles + dimensions + canonicalisation). **BOM-a entièrement bouclé** (code #203, doc #204, cleanup #205). Chantiers ouverts actionnables : formatage Prettier (Lint vert), validation conversationnelle frontend du chatbot couleur, UI color-picker, §14 production. main HEAD = `b1290b0`. Branche : `docs/bom-b-blocked-note`.*

*Dernière mise à jour : 26/06/2026 — **BOM-a : devis déterministe depuis les vrais SKU (#203).** `generateBOM` réécrit **sans LLM** : il n'invente plus `catalogRef`/prix/totaux. Lignes `catalog` = vrai `product.sku` + prix DB (électroménager : ref `brand model`, Appliance n'a pas de sku) ; lignes `estimated` = config via barème explicite commenté ; totaux **calculés en code** (`subtotal`/`tax` 20%, arrondis 2 décimales somment exactement). Honnêteté : `source` par ligne + `subtotalCatalog`/`subtotalEstimated` séparés (ferme vs estimé). **Dette §15.7 P4 résolue pour les lignes catalog.** Types additifs (zéro rename, frontend tolérant). 7 tests greenfield (logique non testée auparavant), 100% déterministe. **Acquis** : un LLM ne doit jamais être la source d'une donnée qui existe en dur, surtout financière. **Pendings BOM** : BOM-b (matcher P6 pour les lignes config, 1er call-site prod) + cleanup `SYSTEM_PROMPTS.BOM_GENERATOR` orphelin. main HEAD = `e98f6df`. Branche : `docs/bom-a-deterministic`.*

*Dernière mise à jour : 26/06/2026 — **P7 Phase 2 chatbot couleur livré (chaîne backend).** `ANTHROPIC_API_KEY` configurée (GO 200). #198 `resolveColors` depuis n'importe quel SKU (variant->canonique, OR-first, comptes de requêtes verrouillés) ; #199 endpoint REST `GET /catalog/products/:sku/colors` (404 vs 200-[], 1er call-site prod DI) ; #200 instance partagée (1 cast) ; #201 tool LLM `resolve_colors` exposé à Claude + prompt anti-hallucination ferme + try/catch gracieux. **Chaîne** : parentSku (P5) -> resolver (#196) -> any-sku (#198) -> REST (#199) -> instance partagée (#200) -> tool LLM (#201). **Acquis** : découpage DB(sans clé)/LLM ; dispatch unit-testé (6 tests) mais comportement conversationnel validé manuellement (non-déterministe). **Pendings** : validation conversationnelle via frontend (route authentifiée, tester en UI) ; UI color-picker ; branchement bom-generator (vrais SKU vs catalogRef halluciné). main HEAD = `8c3c1a0`. Branche : `docs/p7-phase2-chatbot`.*

*Dernière mise à jour : 25/06/2026 — **Lint backend nettoyé (#193) + P7 Phase 1 cœur livré (#195, #196).** #193 : ESLint backend propre (19->0), tsc dé-doublonné du job Lint, Prettier laissé rouge = chantier formatage tracé (1299 fichiers). #195 : `normalizeColor` (185 couleurs -> 33 familles, 99.6%, bug Unicode Ÿ attrapé par mesure pondérée SKU). #196 : `VariantResolverService` (graphe parentSku -> offre couleur, DI read-only, oracle Vicco, tie-breakers verrouillés). **Décision clé** : normaliseur séparé de COLOR_TIERS (zéro risque P5) ; matériau = option taggée. **Gisement ~394 gammes** (P5 a triplé via union canonique+variants). Cœur P7 livré **sans clé LLM**. Pendings : Phase 2 LLM (requiert ANTHROPIC_API_KEY), branchement BOM (vrais SKU vs catalogRef halluciné), UI color-picker. **Acquis** : la CI réparée valide le code neuf dès la 1ère PR ; la mesure de couverture pondérée attrape des bugs. main HEAD = `e01d794`. Branche : `docs/session-ci-lint-p7`.*

*Dernière mise à jour : 23/06/2026 — **Séquence catalogue P4-P6 + CI honnêteté livrées (6 PRs).** #186 P4 (schema parentSku/isCanonical + réconciliation _seeds modélisée) ; #187 P5 ProductCanonicalizer (6960 canoniques / 1416 variants, oracle MATCH EXACT, 17 tests module pur) ; #188 fix tsc TS2532 ; #189 P6 matcher filtre isCanonical (pool 5614->5212, 360 variants couleur exclus, 879 EPREL préservés) ; #190 Unit Tests honnête (fix --coverage, 1587 tests s'exécutent enfin en CI, seuils plancher 25/17/18/25) ; #191 job Type Check standalone (gate tsc effectif, build-common avant tsc, paths-mirror). **Acquis** : valider type-check/build CI depuis état PROPRE (rm dist, sinon faux-vert local -> TS6305, pattern #72/#75/#79) ; dry-run/oracle avant toute écriture DB (data-loss _seeds + DateTime non-null attrapés) ; paths symétriques push/PR pour dogfooding. Dette restante : verdir le job Lint backend (19 erreurs auto-fixables + Prettier frontend ESM). Pendings catalogue : P7 chatbot couleur, P8 rendu 3D. main HEAD = `77a6488`. Branche : `docs/session-catalog-p4-p6-ci`.*

<!-- Historique footer 20/06 : conservé ci-dessous -->

*Dernière mise à jour : 20/06/2026 — **Sessions 18-20/06 : chantier catalogue (4 PRs)**. (a) **18/06 — PR #182 cooking-dims-quality-v2** : audit qualité manuel 20 SKU stratifiés → 70% match, 3 mismatches critiques (Beko 10cm, LG 3cm, Cata 4cm). Méthodo §15.8.2 : sondes SQL calibration avant règles → intervention chirurgicale (2 UPDATE + 13 soft-delete) plutôt que filtre par règle. Cooking actif 277→264. 5 leçons capitalisées. (b) **19/06 — PR #183 matcher déterministe** : DesignCatalogMatcher TS standalone (`packages/backend/src/services/matcher/`), POST-persistance, 100% déterministe, cascade 4 niveaux (exact_match ±10mm / matched_degraded / matched_over_budget / no_match), score composite pondéré, seuils par-type (electro 0.7, meuble 0.5). Tests 10/10. Live test : exact_match Brandt BOH3432X-1. resolveAllKitchenItems REPORTÉ (KitchenItem.type vocabulaire inconnu, 0 ligne en base). (c) **19/06 — PR #184 parseSpecTable v2** : scraper Castorama PDP enrichi, audit Étape 0 a corrigé 5 hypothèses fausses (location, regex vs cheerio, ProductType vs SlotType, lengthMm absent, rawMeasureText obligatoire). 6 mappings ProductType (cabinet/worktop/facade/sink/tap/appliance) + sanity bounds par type. Brand réelle dans `specifications.brand` (SKU stable). Tests common 14/14 + scraper 16/16. Diff 7 fichiers +520/-7. Fixture stable réutilisable. (d) **20/06 — Run Castorama rebaseline incomplet** : 7497 SKU ingérés en ~3h, déséquilibre volumétrique acté (façade 4140, meuble-haut 992 vs estimations §15.8 sous-estimées ×70). 6 cats échouées CloudFront 503 (meuble-bas, evier, robinet, four, hotte, plaque). Sûreté EPREL préservée. Audit DOM prouve extractPdpUrls correct (hypothèse cross-sell FAUSSE). (e) **20/06 — POC dédup + pivot stratégique §15.8.4** : algorithme clustering signature gamme + extraction couleur dict 6-tiers + extraction taille depuis nom (anti-fusion 45/60cm via taille-in-signature, leçon du POC). Résultats : 7497 → 6081 clusters identifiés, 1416 variants tracés (18.9% dédup honnête). **Insight Laurent** : abandonner le stockage de variantes couleur en SKU → chatbot IA post-design. Architecture 3 niveaux gammes/variants/rendu validée, alignée industrie (IKEA Home Planner, Chief Architect). POC conservé comme bloc réutilisable mais PAS appliqué en DB (pas de soft-delete des 1416 variants — ils deviennent Niveau 2 dans le refactor). (f) **20/06 — PR #185 doc-only** : §15.8.3 Castorama re-ingestion v2 + §15.8.4 pivot gammes/variants documentés dans CLAUDE.md (+63 lignes). Pendings P4-P8 tracés. **Acquis méthodologiques** : (1) audit DOM avant blâmer scraper (hypothèse cross-sell FAUSSE prouvée par sonde), (2) volumes réels ≠ estimations §15.8 (remesurer avant run exhaustif), (3) industrie cuisine fonctionne par placeholders + customisation post-design (forme avant couleur), (4) ne pas pré-construire une architecture prématurée pour une feature future non designée — différer la migration prisma au moment du vrai besoin. main HEAD = `e370065` post-#184. PR #185 OPEN sur `feat/claude-md-15.8.3-15.8.4`. **Prochaine session : refactor schema gammes/variants (P4) + ProductCanonicalizer (P5) + Matcher v2 (P6) + re-run 6 cats Castorama manquantes + audit qualité Castorama post-complet (méthodo §15.8.2).***

<!-- Historique footer 10/06 : conservé ci-dessous -->

*Dernière mise à jour : 10/06/2026 — **Session STACK-UP : ROOT CAUSE `<Provider store={store}>` jamais câblé (3 PRs : #109 Provider + #110 kitchen-fields flow-4/5/6 + #106 span-click flow-1)**. 1ʳᵉ session stack montée en local (backend :4000 + preview prod :3005). Le login UI atteint /dashboard MAIS DashboardPage (et Catalog/SandboxDesigner) **crashent** `Cannot destructure 'store' … null` — le store Redux n'était **jamais fourni** à l'arbre (App.tsx sans `<Provider>`). **Prouvé 3 axes** (code/runtime/git pickaxe), masqué par `vi.mock('store/hooks')`. Mon diagnostic 09/06 (« régression consent / nav login→dashboard ») était **FAUX** = c'était ce crash. Fix #109 (3 lignes) → **flow-2 2/2 PASS**, catalog/designer rendent. Triage traîne : kitchen-fields `widthCm→width/length/height` (#110, flow-4/5/6 `POST /kitchens` 400→crash), span-click checkbox sr-only (#106). Restant = couches per-flow (flow-6 quote, flow-8 RGPD tab) + dur/externe (flow-5 WebGL, flow-4 IKEA live, flow-7 Stripe). **Leçons** : stack-up trouve des bugs invisibles aux unit tests mockés + logs CI ; **comparaison de runs ≠ causation** (ma « régression consent » du 08/06 était corrélation) ; fixer la racine puis trier honnêtement (pas de brute-force WebGL/externe). main HEAD = `f99f4d1`. Branche courante : `docs/stackup-redux-provider`.

**+ 10/06 (suite — audit « câblages silencieux »)** : généralisation de #109 (« quoi d'autre a manqué silencieusement ? »). Verdict A providers (tous câblés, 4 contextes ont leur Provider, `VITE_*` toutes avec fallback, Suspense couvre les lazy). **1 piège de la même classe trouvé+fixé → #112** : 10 slices redux complets+testés mais non enregistrés (kitchen/user/permissions/roles/audit/questionnaire/vr/webhooks/adaptiveSurfaces/aiGenerator) → un futur `useAppSelector(s=>s.kitchen…)` aurait crashé ; les 12 enregistrés (build vert, slices 103/103). Reliquat mineur : react-query inutilisé (no-op, tracé §11 P3). main HEAD = `b1d0220`. Branche courante : `docs/audit-providers-slices`.

**+ 10/06 (suite 2 — 5 dettes CI du 02/06)** : 3 PRs. #114 turbo build backend ; #115 false-green (`test:integration`/`test:api` no-op exit 0 → guard rouge honnête) ; #116 **convergence** = root cause commune ESLint+coverage = override toxique `minimatch:^9.0.5` (même commit `edb726b` que path-to-regexp #47) forçant v9-objet sur eslint/test-exclude API-v3-callable → retrait override (minimatch 3.1.5) + coverage `v8→istanbul`. Prouvé : `pnpm test:coverage` exit 0/1226 tests, eslint ne crashe plus, backend build vert. **Reste** : ~1551 erreurs lint réelles (0% auto-fix, chantier) + 102 vulns security (46 high/6 critical = Lot 4). main HEAD = `57958c3`. Branche courante : `docs/ci-debts-resolved`.

**+ 10/06 (suite 3 — audit `pnpm.overrides` complet + jspdf critical CVE, PR #118)** : prolongement direct de #116 (« et les autres overrides ? »). Audit des 10 entrées du bloc racine, **reproduit par preuve** (déclaré vs résolu lockfile + `pnpm audit`). **3 catégories** : (a) 🔴 **jspdf `^3.0.0` = 4ᵉ override toxique du commit `edb726b`** — forçait jspdf **3.0.4** (CRITICAL path-traversal `<=3.0.4`, la version la PIRE) alors que le frontend déclare `^4.2.0` et que le code PDF (pdf-quote-generator/ExportPanel/ShoppingListPanel) est écrit pour v4 ; override **périmé** (posé ère-v3 le 13/05, jamais MAJ au bump v4 Lot 1 #28). **Fix #118** : retrait → résout **4.2.1** (latest 4.x, patché, clôt `<=3.0.4` ET `<=4.2.0`) ; **pas de bump de dep** (le range `^4.2.0` permet déjà 4.2.1). Prouvé : jspdf 3.0.4→4.2.1, diff lockfile 100% jspdf-scopé (autotable inchangé 5.0.7), build frontend turbo 6/6 vert. (b) 🟠 **nodemailer `^7.0.4` (encore `<8.0.4` vuln) + axios `^1.12.0` (1.13.2, encore `<1.15.2` vuln) = pins CVE inadéquats → #5 security** (les retirer empire ; nodemailer v6→v8 = 2 majeures breaking). (c) ✅ **7 pins légitimes** (dompurify/tar/fast-xml-parser/undici/basic-ftp/protobufjs/follow-redirects). **Correction honnête** (l'investigation demandée a inversé ma 1ʳᵉ lecture) : « toxiques à retirer » était faux pour nodemailer/axios — ce sont des pins inadéquats à **bumper**, pas à retirer ; seul jspdf était toxique ET retirable proprement (4.2.1 déjà permis). **Leçon** : un override sécu peut être périmé (pointe une version désormais vulnérable/downgradée) — toujours vérifier déclaré-vs-résolu-vs-CVE, pas juste « consommateur + raison ».

**+ 10/06 (suite 3 — consolidation : 5 PRs mergées, vulns 101→50)** : l'audit override a produit **4 PRs de fix + 1 doc, toutes mergées** dans la foulée. (b') **axios #120** `^1.12.0`→`^1.17.0` (pin inefficace, clôt high `<1.15.2`). (c') **nodemailer #121** override `^7.0.4`→`^8.0.10` + dep backend `^6.9.8`→`^8.0.0` (clôt moderate `<8.0.4` SMTP injection ; v6→v8 = 2 majeures mais usage = API core SMTP stable `createTransport/sendMail/close` inchangée ; build backend + 34 tests mail verts). (d') **#122** = découverte que **4 des 7 « pins légitimes » étaient eux-mêmes vulnérables** (pins qui décaient) → 3 rafraîchis en same-major (zéro risque, transitifs) : protobufjs `^7.6.3` (critical `<7.5.5`, à un patch près !), basic-ftp `^5.3.1` (critical `<5.2.0`, patch v5 — pas besoin de v6), follow-redirects `^1.16.0` (moderate). **Merge mishap récupéré** : un `gh pr merge --admin --delete-branch` sur #118 a buté sur un état mergeable transitoire UNKNOWN (juste après le merge de #119) et **fermé #118** ; la branche remote ayant survécu, reopen + `--squash` simple (pas de branch protection sur repo privé free → `--admin` inutile/nuisible). #121 a nécessité un rebase + regen lockfile (conflit overrides). **Résultat combiné prouvé sur main** : `pnpm audit` **critical 6→2, high 46→21, moderate 41→21, total 101→50** ; turbo build frontend+backend vert (8/8). **Reste de l'audit override** : 2 majeures sur transitifs (tar v6→v7, fast-xml-parser v4→v5) = analyse compat dédiée. **Leçon merge** : ne PAS combiner `--admin` + `--delete-branch` ; sur repo sans branch protection, `gh pr merge --squash` simple suffit même en CI rouge préexistante. main HEAD = `cf45cf5`. Branche courante : `docs/security-overrides-merged`.

**+ 10/06 (suite 4 — audit override TERMINÉ 10/10 : tar + fast-xml-parser, 2 PRs)** : les 2 dernières entrées, auditées par preuve (Phase 1 compat : `pnpm why` + ranges déclarés réels), ont **toutes deux** un fix propre (pas les « majeures risquées » attendues). **fxp #124** : `@aws-sdk/xml-builder` (seul conso) déclare déjà `fast-xml-parser: 5.7.3` (patché) — l'override `^4.5.0` la **downgradait** en 4.5.6 vuln = **5ᵉ override toxique de `edb726b`**, même pattern que jspdf ; bump `^5.7.3` (résout 5.8.0) = s'aligner sur AWS (build backend vert, fxp v5 modularisé = nouveaux transitifs légitimes auteur amitgupta). **tar #125** : aucun patch v6 (6.2.1 gelé), seul conso = bcrypt@5.1.1 → node-pre-gyp (`^6.1.11`) ; forcer tar v7 casserait node-pre-gyp → **mauvaise voie**. Le **bon** fix = **bcrypt 6.0.0 qui abandonne node-pre-gyp** (→ node-gyp-build) : bump bcrypt `^5.1.1`→`^6.0.0` + @types `^6.0.0` **élimine tar ET node-pre-gyp de l'arbre** (prouvé absents), override tar mort retiré ; API hash/compare inchangée (Node≥18 OK), **build + tests auth 100/100** (vrai bcrypt natif v6). #125 rebasé (regen lockfile, conflit overrides avec #124). **Résultat final session : vulns repo 101 → 43** (critical 6→2, high 46→15, moderate 41→20). **Bloc override : 10/10 traité** — 5 toxiques de `edb726b` neutralisés (path-to-regexp, minimatch, jspdf, fast-xml-parser + bloc révisé), 8 entrées restantes toutes à versions patchées. **Reste sécu = §14.5 Lot 4** (43 transitives, bumps majeurs). **Leçon Phase-1 compat** : avant un bump majeur sur transitif, lire le range RÉEL du consommateur (`npm view <dep> dependencies`) — il révèle souvent (fxp) que le consommateur veut DÉJÀ la version patchée, ou (tar) qu'un bump du parent (bcrypt) élimine le problème mieux qu'un forçage. main HEAD = `5c1977f`. Branche courante : `docs/override-audit-complete`.

**+ 10/06 (suite 5 — triage 43 vulns transitives, Group A : 8 overrides, #127)** : après le bloc override « historique », triage des 43 vulns transitives **restantes** (par preuve : `pnpm audit --json` + `pnpm why` + version résolue vs patched). **3 groupes** : **Group A = 8 advisories fixables par override same-major patché** (sûr) → 1 PR batch #127 : handlebars `^4.7.9` (critical JS-injection, via ts-jest), lodash `^4.18.0` (high, **runtime** via recharts ; 4.18.1 = release sécu **officielle** jdalton 2026-04-01 brisant le gel 4.17.21), rollup `^4.59.0` (high, via vite/storybook), flatted `^3.4.0` (high, via eslint), tmp `^0.2.6` (high, **runtime** via exceljs), **minimatch@9 `^9.0.9` + picomatch@2 `^2.3.2` + picomatch@4 `^4.0.4` = overrides SCOPÉS par version** (impératif : un override blanket `minimatch:^9` re-casserait eslint@8/test-exclude@6 qui veulent l'API v3 callable = **piège #116** ; le scope ne patche que les lignes vulnérables, **minimatch 3.1.5 préservé** — prouvé, eslint ne crashe pas). **Group B différé** (dev-only + majeure/alignement) : **vitest** 1→3 (critical UI-server, bump majeur test-infra 1226 tests) + **storybook** 8.6.15→8.6.17+ (high dev-server WebSocket, skew meta-package) = **les seuls critical+high restants**. **Group C** : 14 moderate + 5 low (esbuild/qs/ajv/vite/postcss/astro/ip-address/ws/turbo/uuid/react-router/diff/@tootallnate/once) — batch séparé. **Résultat : vulns repo 43 → 21** (critical 2→1, high 15→1, moderate 20→14, low 6→5). **Incident** : `prisma:generate` a échoué sur **`ENOSPC` (disque C: à 0 Mo)** pendant la validation — **pas** lié aux overrides (purement environnement) ; `pnpm store prune` (−184 packages) + libération user → 49 Go, build backend revenu au vert. **Session cumulée : 101 → 21 vulns (−79%)**, 10 PRs sécu. **Leçon** : technique d'override **scopé par version** (`pkg@major`) = la bonne réponse quand une seule ligne de version est vulnérable et qu'un blanket casserait un autre consommateur. main HEAD = `c9f5da6`. Branche courante : `docs/transitive-vulns-group-a`.

**+ 10/06 (suite 6 — Group C1 : 9 overrides same-major, #129)** : suite du triage. **Group C1 = 9 advisories moderate/low same-major** (sûr) → 1 PR #129 : react-router + react-router-dom `^6.30.4` (**alignés** — rr-dom@6.30.3 pin react-router exact 6.30.3 ; bump les 2 ; **runtime** routing), ws `^8.20.1` (runtime yjs/genai), ip-address `^10.1.1`, postcss `^8.5.10`, **ajv@6 `^6.14.0`** + **diff@4 `^4.0.4`** (scopés — l'arbre a ajv 8.x / diff 8.x sur d'autres consommateurs, un blanket les casserait ; **diff 8.0.4 préservé** vérifié), qs `^6.14.2` (runtime express), @tootallnate/once `^2.0.1`. **Résultat 21→11** (moderate 14→7, low 5→2). **Validé** : builds frontend+backend 8/8, **tests frontend 1226/1226** (react-router 6.30.4 routing intact). **Session cumulée : 101 → 11 vulns (−89%)**, 12 PRs sécu. **RESTE = uniquement des MAJEURES** (vitest 1→3, storybook 8.6.17+, uuid 9→11, turbo 1→2, vite 5→6, astro 5→6, esbuild 0.25) = sessions dédiées par bump (§14.5 Lot 4, NE PAS chaîner) ; les 2 seuls critical+high restants (vitest, storybook) sont **dev-only**. main HEAD = `050e205`. Branche courante : `docs/group-c1`.

**+ 10/06 (suite 7 — audit « même classe » des 4 patterns méthodo, workflow 4 agents, #131)** : après une journée de 20+ PRs, 4 patterns prouvés ont émergé ; question = en existe-t-il d'AUTRES instances ? Audit read-only par **workflow (4 agents Explore parallèles, 196k tokens, 11 min)**, un par pattern. **Verdict : 3 patterns SAINS, 1 avec trouvailles.** **1.A Provider order ✅** : ErrorBoundary **au-dessus** du `<Provider store>` redux (leçon #109 structurellement correcte), tous les hooks (useAuth/useToast/useTheme/useLanguage/useAppSelector) ont leur Provider monté + throw-guard ou fallback ; 2 warnings cosmétiques (indent l.32, react-query inutilisé déjà tracé). **1.B Câblage incomplet ✅** : routes/routers tous câblés ; 2 dead-utils mineurs (`utils/pdf-export.ts` jamais importé, `utils/financing-helpers.ts` réimplémenté dans FinancingCalculator). **1.D edb726b résidu ✅** : tous les configs touchés sains (eslintrc 28 désactivations contextuelles documentées sans mass-disable, tsconfig strict:true, vite/playwright OK, **pas de .npmrc/.pnpmrc**, e2e/lighthouse best-practices) — aucune bombe résiduelle hors overrides déjà nettoyés. **1.C false-green CI ⚠️ = 3 GRAVE (classe #115), FIXÉ #131** : (1) `ai-modules-ci.yml` lançait `pnpm --filter ai-modules lint/type-check/test/build` sur un pkg **Python** (scripts inexistants → 4 no-op exit 0 + upload dist/ fantôme) → **réécrit en vraie CI Python** (setup-python + pip + ruff + mypy + pytest, 8 tests existants, outils déjà dans requirements.txt ; job build JS retiré) ; (2) `deploy-prod.yml:299` `pnpm test:smoke:prod` (root n'a que `test:smoke`) → **grep-guard** ; (3) `deploy-staging.yml:165` `pnpm migrate:staging` → backend `db:migrate:staging` absent = **migration BD silencieuse no-op** → **grep-guard** dans le script SSH remote. Les 2 deploy sont dormants (pas d'infra §14.2) → désamorce une landmine launch. ⚠️ CI Python non exécutable en session (pas de runner) — 1er run réel révélera l'état masqué. main HEAD = `183bcaa`. Branche courante : `docs/same-class-audit`.

**+ 10/06 (suite 8 — Group B sécu : vitest + storybook → 0 critical / 0 high, #133 + #134)** : attaque des majeures sécu une par une (§14.5, sans chaîner). **vitest 1→3 (#133)** clôt le **dernier critical** (UI-server arbitrary-exec, patché ≥3.2.6). vitest était dans **3 packages** (frontend/partner-portal/scraper) → bump des 3 (sinon 1.6.1 reste). vitest 3.2.6 supporte vite 5 (peer `^5||^6||^7`) → **pas de couplage vite 6**. Le major a révélé 2 messes latentes (vitest 3 plus strict) corrigées : partner-portal avait **22 `*.test.tsx` vides 0-byte** (jamais CI) → supprimés + `passWithNoTests` ; scraper `test: vitest` (watch, 0 test, **dans data-pipeline-ci**) → `vitest run --passWithNoTests` (honnête). **Prouvé** : vitest = version unique 3.2.6, frontend `test:coverage` **1226/1226** sur vitest 3 + istanbul 3, builds verts. **storybook (#134)** clôt le **dernier high** (dev-server WebSocket hijack `<8.6.17`) : override `storybook: ^8.6.18` (dev-only, design-system/ui-components, hors build path). **Résultat : repo 0 critical / 0 high** (depuis 6 crit / 46 high en début de session) ; reste **7 moderate + 2 low**, tous derrière des **majeures réservées à des sessions dédiées** (uuid 9→11 runtime, turbo 1→2 config, vite 5→6 build, astro 5→6 guides hors-scope, esbuild 0.x tiré par vite 5). **Session cumulée sécu : 101 → 9 vulns (−91%), 0 critical / 0 high.** main HEAD = `7d82847`. Branche courante : `docs/vitest-storybook-majors`.

**+ 11/06 (suite 9 — chantier ESLint : 183 erreurs frontend → 0, #136)** : 2ᵉ chantier demandé (« full quality, zéro relâchement »). **Correction de scope par preuve** : re-mesure **par sévérité** → le « 1551 » confondait sévérités ; réel = **183 ERREURS bloquantes (frontend) + ~1600 warnings**, backend **0 erreur** (déjà vert). Les 183 erreurs frontend traitées par **workflow de migration (10 agents parallèles, lots de fichiers disjoints, 91 fichiers, 2.3M tokens)** — fixes RÉELS (zéro eslint-disable) : no-floating-promises 78 (`void`/`await`), no-unused-vars 24, jsx-a11y ~30 (htmlFor, role+tabIndex+onKeyDown), restrict-template-expressions 10, react/display-name 6, ban-types/require-await/misused-promises… **Validation centrale critique** : le build a d'abord cassé (7 erreurs TS) = **2 régressions agents** rattrapées (StockIndicator ban-types trop étroit → `TFunction` i18next ; PriceTrackerPage `trend && trend.x` réécrit en `trend?.x !== null` = null-guard cassé, hors scope → reverté). 2 parse errors test-setup (fichiers exclus de tsconfig) résolus config-level (dup mort `src/test/setup.ts` supprimé + `.eslintignore` aligné sur l'`exclude` tsconfig). **Prouvé** : eslint frontend **183→0 erreurs** (exit 0), backend 0, build 8/8, **1226 tests**. **Reste = ~1321 warnings** type-safety (`no-unsafe-*`/`no-explicit-any`) non bloquants = typage graduel multi-sessions. **Leçon workflow** : (a) `args` arrive **stringifié** → guard `typeof args==='string'?JSON.parse(args):args` ; (b) les agents parallèles peuvent introduire des régressions (over-reach hors scope, types trop étroits) → **validation centrale build+tests OBLIGATOIRE** après un fan-out de code. main HEAD = `fd0c1be`. Branche courante : `docs/eslint-errors-zero`.

**+ 11/06 (suite 10 — reliquats sécu + ESLint, traités « de façon réfléchie » : 3 PRs #138/#139/#140)** : enchaînement audit-first des deux reliquats. **Sécu (2/5 majeures faites, une à une §14.5)** : **turbo 1→2 (#138)** — clé config `"pipeline"`→`"tasks"` (seul breaking v2 ici) + bump ^2.9.18, `turbo run build` 8/8 ✓ ; **uuid →11.1.1 (#139)** — retrait dep **fantôme** uuid de scraper (le `@default(uuid())` est une directive **Prisma**, pas la lib npm) + override ^11.1.1 (advisory buffer-bounds v3/v5/v6 non déclenché ; conso font du v4), validé frontend 1226 + backend 1523 tests (exceljs/Excel/webhook). **Différés justifiés** : vite 5→6 + esbuild (couplés, gros changement build-tool pour vuln moderate → session post-launch), astro 5→6 (guides **hors scope §3**). **Résultat sécu : vulns 9→4** (1 low + 3 moderate, tous derrière vite/esbuild/astro). **ESLint warnings (mécaniques d'abord)** : **react/no-unescaped-entities 176→0 (#140)** — apostrophes/quotes texte JSX → entités HTML (rendu identique), 21 fichiers (surtout pages légales FR) via fan-out 5 agents + validation centrale ; warnings **1321→1145**. **Réflexion** : prefer-nullish-coalescing (177) gardé pour après car **risque sémantique** (`||`→`??` diffère sur 0/''/false) ; no-unsafe-*/no-explicit-any (~860) = typage graduel. **Incident process rattrapé** : commit unescaped fait par erreur **sur main local** (le `| tail -1` masquait le code retour du push → fallback branch non déclenché) + 7 fichiers `guides/.astro/*` générés (par mes builds de diagnostic) aspirés par `git add -A` → corrigé (commit déplacé sur branche, main reset à #139, fichiers générés exclus). **Leçon** : ne pas piper le `git push` dont on teste l'échec ; vérifier `git status` avant `git add -A` après avoir lancé des builds. main HEAD = `7fe8e4c`. Branche courante : `docs/turbo-uuid-unescaped`.

**+ 11/06 (suite 11 — typage `no-unsafe-*` à fort levier : #142 + #143)** : attaque de la famille type-safety (le gros des warnings) par la SOURCE, pas site par site. **Cause racine identifiée** : les thunks/effets font `const data = await response.json()` (= **`any`**) → tout `data.X` / `return data.X` est no-unsafe. **#142 (preuve + levier)** : catalog-slice 23→0 (cast `(await response.json()) as { data: Catalog[]; … }` via les interfaces du slice) + **nouveau `vite-env.d.ts`** typant `import.meta.env.VITE_API_URL/WS_URL` (sinon `any` → no-unsafe-assignment du `const API_URL = …` dans **14 fichiers** = levier transverse). **#143 (fan-out 11 agents, 1/slice disjoint)** : **les 11 slices Redux typés, 290→0** (webhooks 49, ai-generator/permissions 31, kitchen/project 30, roles 28, audit 27, user 25, adaptive-surfaces/vr 15, questionnaire 9) — même pattern, `as <Shape>` depuis les interfaces + génériques `createAsyncThunk<RET>`, **zéro any/as-any/eslint-disable, type-only**. **Validation centrale** (claims agents non fiables seuls) : **tsc 0 erreur** (les 11 casts compilent, **0 régression** cette fois — vs #136), eslint 0 erreur, build vert, 1226 tests. **Résultat : no-unsafe-* 850→560, warnings totaux 1145→833.** **RESTE** : 560 no-unsafe dans 58 pages/composants/contexts (patterns per-site variés) + nullish 177 (risque sémantique) + nested-ternary/exhaustive-deps. **Acquis** : typer la **frontière** (`response.json()`, `import.meta.env`) a un effet de levier ×N vs fixer chaque site ; fan-out par fichier-disjoint + validation centrale tsc/tests = scalable et sûr quand le pattern est homogène (slices). main HEAD = `544c7ea`. Branche courante : `docs/typing-slices`.

**+ 11/06 (suite 12 — 🎯 no-unsafe-* ENTIÈREMENT éliminé : #145)** : passe finale du typage sur les **58 pages/composants/contexts** restants (560 no-unsafe — AuthContext 34, WorkflowSimulator 34, VRViewer 27, CatalogPanel 22…). Fan-out **15 lots** (~52 fichiers édités, 3.04M tokens) + validation centrale. Même cause/fix que les slices (frontière `any` → cast vers la forme réelle via interfaces domaine ; `catch` narrowing `instanceof Error` ; lib any → type réel ; **zéro any/as-any/eslint-disable, type-only**). **Validation centrale** : **tsc 0 erreur** (les ~52 fichiers compilent), eslint no-unsafe **560→0**, **1 régression** rattrapée (import/order ajouté par un agent dans ARViewButton → auto-fix) → eslint frontend **0 erreur**, build vert, **1226 tests**. **🎯 RÉSULTAT : le frontend a ZÉRO no-unsafe-* / no-explicit-any (de ~880 à 0). Warnings totaux 1145→340.** **RESTE 340 non bloquants** : prefer-nullish-coalescing **257** (le gros, risque sémantique → per-site prudent), no-nested-ternary 37, exhaustive-deps 15 (risque boucle), jsx-a11y 16, consistent-type-imports 7, no-console 7, prefer-optional-chain 1. **Bilan typage (3 fan-outs : #143 slices + #145 pages + #142 preuve)** : ~850 no-unsafe → 0, **0 régression bloquante** grâce à la validation centrale systématique. main HEAD = `4e92e32`. Branche courante : `docs/no-unsafe-zero`.*

<!-- Historique footer 08/06 :
**Couche 7f facette 3 LOGIN RÉSOLU + visual-regression baselines (3 PRs : #102 backdoor `status:'active'` + #103 LoginPage redirect /dashboard + #104 baselines)**. Audit-first time-boxé, 2 causes login prouvées par code sans stack-up : (1) backdoor test-infra omettait `status:'active'` (login exige `active`, prod OK) ; (2) LoginPage ne naviguait jamais vers /dashboard. Re-run E2E (27101791465) : **15 passed (vs 9)**, flow-2 (login+logout) + flow-3b (API login+import) **verts**, a11y 8/8. #104 : 5 baselines `chromium-desktop-linux` générées **sur le runner** (cross-OS) + 3 bugs job visual corrigés (PLAYWRIGHT_SUITE, needs, exclusion critical) → job dédié **5/5 vert**. **Reste 7f facette 3** = flows métier backend (flow-1 checkbox `sr-only`, flow-4/5/6/8) + catalog a11y **flaky** = chantier LOCAL stack-up. **Leçons** : audit-first → causes prouvées sans stack-up ; distinguer test-infra/app/prod ; baselines cross-OS = générer sur le runner cible ; un fix CI révèle des bugs de job en cascade. main HEAD = `c6c3d3d`. Branche courante : `docs/session-08-06-facette3-login`.
-->


<!-- Historique footer 07/06 :
**Couche 7f facettes 1+2 RÉSOLUES (3 PRs : #97 selectors + #98 color-contrast + #99 blockers niveau A)**. Selectors ancrés + 4 dialogs scopés (cookie-consent) ; color-contrast 0 sur 14 pages × light+dark (2 tokens AA `-strong` + `dark:`, pattern `text-white/40→/55`) ; blockers niveau A `link-in-text-block` (mailto underline) + `select-name` (aria-label) → 0 critical/serious sur 15 pages. Re-run E2E (27097964280) : selectors 2→0 ✓, color-contrast 19→0 ✓. **Reste 7f facette 3** (login 401/backend ~12 flows, chantier LOCAL) + visual-regression baselines + a11y login flaky. **Leçons** : auto-review trouve ses propres bugs (bloquant #97 rattrapé) ; scanner a11y avec le tag-set COMPLET du gate (pas AA-only, aveugle au niveau A) ; `serviceWorkers:'block'` obligatoire en scan preview ; **un scan headless sans backend est aveugle au contenu data-driven** (catalog 0 en local vs 4-5 nodes color-contrast en CI). main HEAD = `8915aa6`. Branche courante : `docs/session-07-06-couche7f`.

**+ 07/06 (suite)** : #99 blockers CI résolus + #100 doc mergés ; **dette catalog color-contrast data-driven tracée** (§11 P3 + §12 ci-dessus) — révélée par #99 (run 27098689257), 4-5 nodes `color-contrast` sur /catalog ProvidersHub peuplé, invisible aux scans headless sans backend. main HEAD = `d89ff92` (post-#100).
-->


<!-- Historique footer antérieur (06/06) :
*Couche 7 E2E INFRA entièrement résolue (6 PRs : #86/#87/#88/#89/#90 + #92)**. Diagnostic 100% par preuve. **Cause racine unifiée = #92** : routing préfixé-locale (`/login`→`/fr/` home, path perdu) — prouvée par **dump DOM** (`goto('/login')` = 0 input vs `goto('/fr/login')` = form présent). Specs préfixées `/fr`. Ça révise 7b : les « 3 a11y verts » étaient des **faux positifs** (404) ; après #92, **a11y login/register PASS** sur vrais écrans. Run final (27060365656) = **2 vrais passed / 25 failed** : reste **7f** = chantier LOCAL (login 401→dashboard ×21, vraies violations `color-contrast` ×19, selectors `getByLabel(/nom/)` trop larges, dialog ×2). #79 + #91 + #92 mergés (e2e sur main = rouge informatif). Bug deep-link LocaleAwareShell (path perdu) **tracé §11 P1** (user-facing/SEO, fix prepend ~30 min) ; couche 7f tracée §11 P3 (chantier local). **+ #95 — fix `LocaleAwareShell` deep-link (§11 P1 RÉSOLU)** : prepend `/fr` au pathname complet (helper pur), double preuve **unit 6/6 + DOM** (`/login`→`/fr/login`). main HEAD = `27f14b0`. Branche courante : `docs/claude-md-p1-resolved`.*
-->

*Dernière mise à jour : 07/07/2026 — **Session parcours création + auth + finition light-mode (10 PRs #219→#228, TOUTES mergées).** Chaîne catalogue/color-picker (Slices/Paliers) : **#219** SKU-binding sur les items de scène (`mesh.userData.sku`, gap §15.7 résolu pour items placés, IFC porte enfin le SKU) ; **#220** palette 33 familles couleur + `buildCatalogMaterial` (Palier 1, cœur déterministe, 33/33 + teinte mesh prouvée) ; **#221** section color-picker premium Option B (Palier 2, bencium — grille photo/aplat harmonisée, sous-groupes Couleurs/Finitions, ring double-trait AA toutes teintes, ligne prix tactile, radiogroup a11y). **Validation in-app boucle DATA prouvée live** (`/products` expose sku Vicco posable → `/colors` oracle Blanc 44,90/Anthracite 44,90/Noir 45,90 ; any-sku variant #198). **Parcours création débloqué** : **#222** `status:'active'→'draft'` (POST /projects 400→201, prouvé cURL authentifié) + message serveur remonté ; **#228 (#1B)** enum status aligné sur le backend (common `ProjectStatus`/`KitchenProject` 4→6 valeurs + frontend `Project.status`, DashboardPage `inProgress` filtre `'active'→'in_progress'` = vrai bug latent [compteur toujours 0], tests 25/25). **Auth** : **#223** logout rendu **PUBLIC** (`authenticate→optionalAuth` → purge le cookie httpOnly même token stale/absent = fin du catch-22 post-rotation JWT ; prouvé no-cookie/stale→200+Set-Cookie 1970) + affordance « Session bloquée ? Réinitialiser » sur `/fr/login` ; **#226** Header logout redirect **locale-aware** (`navigate('/login')`→`withPrefix('/login')`, plus de rebond `/fr/` accueil). **UI mode clair** : **#224** inputs designer lisibles (`text-gray-900`, 11 inputs) + **#227** règle **globale** form-controls theme-aware dans `index.css` (`input,textarea,select{color:gray-900}` + `.dark{gray-50}` — spécificité `(0,0,1)` bat le preflight `input{color:inherit}` par ordre source, mais **toute** utility `text-*` gagne → primitive `ui/Input text-white` **intact**, prouvé `rgb(255,255,255)` sur /login) ; **#225** titre « Dimensions (cm) → (mm) » (4 locales, aligné aux champs `(mm)` + `/1000`). **Root cause light-mode** : `<body class="text-white">` (index.html:74, base dark DA hardcodée) surcharge le `body{color:var(--kx-fg))}` theme-aware → hérité par les inputs sans couleur explicite ; le **vrai** fix body-level (retirer `text-white`, laisser le token) = chantier DA/bencium app-wide (QA visuelle) délibérément **NON** fait. **Acquis session** : (a) **preuve backend live authentifiée** (register→dev-verify→login→cURL/cookie-jar) tranche les contrats sans F12 (create draft→201, colors oracle, logout public) ; (b) reproduire un bug d'**héritage CSS** exige le vrai contexte (`<body>` text-white), pas un rendu isolé (mon 1er before/after était trompeur) ; (c) `:where()` (0) **perd** contre le preflight (0,0,1) → sélecteur d'élément + ordre source ; (d) **JWT-rotation ⇒ cookie stale navigateur, pas bug serveur** (login+/me curl frais = 200 ; logout protégé = catch-22 → rendu public) ; (e) enum **triplement dupliqué** backend/common/frontend → aligner + noter la source-unique en follow-up ; (f) **discipline branche** : un commit parti sur main local (oubli `checkout -b`) récupéré par `git branch <feat>` + `reset --hard origin/main` (2ᵉ occurrence, réflexe capitalisé). CI Frontend : jobs pertinents (Lint/Type Check/Unit Tests/Build) verts ; rouge résiduel (Security Audit/Lighthouse/E2E) = dette connue. **Comptes de test dev** : `demo@kitchenxpert.dev` / `Demo2026!Kx` (activé). main HEAD post-#228 = `04ea7d9`. Doc-only #229.*
-->
