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

**Base de données** : **Supabase PostgreSQL cloud** (région `eu-west-3`, pooler Supavisor session-mode port 5432, SSL forcé). Schema déployé via `prisma db push` (63 tables). `directUrl` ajouté au datasource Prisma (commit 70f96b3) pour les migrations qui nécessitent le path direct sans pooler. Prérequis local : `.env` racine avec `DATABASE_URL` + `DB_HOST/PORT/USER/PASSWORD/NAME` + `DB_SSL=true`. **Plus d'installation Postgres locale requise.**

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
- [ ] **Audit `pnpm.overrides`** : passer en revue chaque entrée du bloc `pnpm.overrides` racine avant prod. Précédent : `"path-to-regexp": "^6.3.0"` était toxique (cassait Express 4 au runtime, cf §12 27/05 soir), retiré PR #47. Reste à vérifier `nodemailer: ^7.0.4` désynchro avec la dep backend (déclarée `^6.9.8`, possible breaking change v6→v7 — cf audit Dependabot PR #22). Règle : un override doit avoir (a) un consommateur réel dans le lockfile, (b) une raison documentée (CVE, fix, pin volontaire). Sinon → supprimer.
- [ ] **CI couche 6 — Backend startup en E2E** : run E2E post-PR #72 montre `Build frontend ✅`, `Start backend (background) ✅`, `Start frontend ✅`, puis `Wait for services → npx wait-on http://localhost:4000/health` timeout 1m 40s. Backend démarre en background `&` mais ne répond jamais sur `/health`. Hypothèses (par probabilité) : (a) crash silencieux au boot sur env var manquante (Stripe, Anthropic API, AWS), (b) startup lent > 60s (Prisma init + Redis connect), (c) bind mauvaise adresse (0.0.0.0 vs 127.0.0.1). Stack trace pointe `wait-on.js:131:31`. À auditer en session dédiée : grep env vars dans `.github/workflows/e2e.yml` job critical-flows vs ce qui est lu au boot dans `packages/backend/src/index.ts` + `app-config.ts`. Probablement env vars manquantes type STRIPE_SECRET_KEY, ANTHROPIC_API_KEY, AWS_* — à mocker/faker en CI.
- [ ] **CodeQL Code Scanning non activé** : tous les workflows CodeQL plantent avec `"Code scanning is not enabled for this repository. Please enable code scanning in the repository settings"` + `"Error: Path does not exist: ./results"`. Fix de 3 clics : Settings → Code security and analysis → Code scanning → Set up → Default. Pas bloquant pour les autres workflows (échec isolé), mais nuit à la perception de "CI verte" sur le dashboard PR. À activer avant launch prod si on veut le badge Security passing.
- [ ] **frontend-ci.yml — bug TS6305 sur 3 steps** : même cause racine que PR #72 (workspace deps non construits avant `tsc`), 3 occurrences : `type-check:frontend` ligne 105, `test:frontend` ligne 144, `build:frontend` ligne 190. Fix identique à PR #72 : remplacer `pnpm --filter frontend X` par `pnpm turbo run X --filter @kitchenxpert/frontend` aux 3 endroits. PR séparée dédiée recommandée — scope strict frontend-ci.
- [ ] **backend-ci.yml — scripts test + DB_* env vars** : workflow appelle `pnpm --filter backend prisma migrate:test` (ligne 137) et `seed:test` (lignes 219, 220, 343) qui n'existent PAS dans `packages/backend/package.json`. Même pattern de fix que PR #53 nécessaire : (a) basculer `migrate:test` → `prisma:push`, `seed:test` → `db:seed`, (b) ajouter le bloc env: complet avec DATABASE_URL + DIRECT_URL + DB_HOST/PORT/USER/PASSWORD/NAME comme dans e2e.yml. PR backend-ci dédiée recommandée.
- [ ] **Submodule `external/ikea-api-client` orphelin** : warning silencieux dans tous les workflows CodeQL `"No url found for submodule path 'external/ikea-api-client' in .gitmodules"` + `git fatal exit code 128`. Le path est référencé quelque part mais `.gitmodules` ne le déclare pas (ou n'existe pas). Soit retirer la référence orpheline, soit déclarer le sous-module. Pas bloquant pour le code (KitchenXpert n'a pas besoin de cette dépendance externe), mais pollue les logs et empêche checkout `--recurse-submodules` propre.
- [ ] **Plafond PayPal autorisation GitHub sans limite explicite** : l'autorisation `B-35J44897SL316563E` ajoutée le 31/05/26 pour débloquer Actions (cf §14.3) n'a AUCUN plafond mensuel côté PayPal — seul filet de sécurité = budgets GitHub (Actions à 20$/mois, autres à 0$). Risque : si un workflow runaway boucle, le compteur peut grimper rapidement. Mitigation possible : (a) baisser le budget Actions à 10$/mois une fois en cruise, (b) revoir périodiquement via `https://github.com/settings/billing/summary`, (c) garder accès au bouton "Annuler" côté PayPal pour coupure d'urgence.
- [ ] **Anomalie cosmétique e2e.yml:100-101** : indentation YAML du bloc `env: PORT: 4000` mal indentée (colonne 9 au lieu de 11, devrait être enfant du step "Start backend"). GitHub Actions tolère (parser permissif), mais c'est fragile face à tout reformatage YAML auto. À nettoyer dans une PR de polish CI.

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

---

## 13. État d'avancement (snapshot 31/05/2026)

| Phase | Statut | Restant |
|---|---|---|
| **Phase 1 P0** | ✅ Terminée | 0 tâche restante |
| **Phase 1 P1** | ✅ Terminée (actionnable) | 0 tâche actionnable restante (7 résolues cumulées + 1 résolue 22/05 [poster Hero] + 1 écartée 22/05 [Hero3DInteractive — décision d'architecture, §11 P1]) |
| **Phase 1 P2** | 🟡 En cours | **2 tâches actionnables restantes** : #2 SandboxMigrationBanner Card/Toast + **Backend dotenv cleanup (reclassé P3→P2 le 31/05/26 après audit, cf §12 31/05)**. Cumul résolu : 2 le 17/05 (HeroVideo + Backend 500) + 2 fermées par décision 22/05 (#3 guides hors scope + #4 TrustStack caduque alignée §8.2) + 1 résolue 23/05 (#1 HowItWorks → Card polymorphique, commits 594c63b+ee1869c). |
| **Phase 1 P3** | ⏳ Non démarrée | **20 tâches actionnables** (–1 décochage `bug prisma stats` via PR #46, –1 reclassement `backend dotenv cleanup` vers P2, +1 ajout 31/05 "Lockfile drift après merge Dependabot"). Détail historique : 8 originales + 4 ajoutées 22/05 + 5 ajoutées 23/05 Redis prod-grade + 2 ajoutées 27/05 matin (bug prisma résolu + hygiène 36 branches) + 1 ajoutée 27/05 soir (audit `pnpm.overrides`) + 1 ajoutée 31/05 (lockfile drift Dependabot). |
| **§14 Roadmap Production** | ⏳ Non démarrée | 13 items (3 sécurité secrets, 5 infra, 2 CI/CD, 3 CORS/SSL/cookies). **Bloque le déploiement prod.** |
| **§14.5 Chantier Dependabot** | 🟢 Lot 1 complet | **Lot 1 ✅ 11/11.** Lot 2 débloqué après résolution facturation Actions 31/05 soir (§14.3) — PR #15 (dotenv 16→17) prouvée safe en isolat 31/05 matin, peut être mergée après `chore/dotenv-17-minimal` audit. Reste : 5 PRs Lot 2 + 5 PRs Lot 3 + 8 PRs Lot 4. |

**Branches actives** :

- `main` (HEAD `6b8a98c`, post-marathon CI 31/05 soir)
- `chore/dotenv-17-minimal` (commit `a10f4aa`) — artefact d'audit du 31/05 matin, **NE PAS merger** (laisser Dependabot rebaser PR #15 après que Lot 2 démarre)

Branches mergées et supprimées (refs locaux + remote prunés) : `chore/lockfile-sync-pg`, `docs/session-31-05-pg-dotenv-audit`, `ci/fix-pnpm-setup-order-e2e-lighthouse`, `ci/fix-prisma-schema-e2e`, `ci/turbo-frontend-build-deps`, `ci/migrate-labeler-v5-config`.

Prochaine cible : (a) Couche 6 backend startup E2E (cf §11 P3) en session dédiée — probable env vars manquantes type Stripe/Anthropic/AWS ; (b) Lot 2 Dependabot débloqué maintenant que facturation Actions OK (cf §14.3) — PR #15 (dotenv 16→17) prouvée safe en isolat le 31/05 matin, à merger après audit `pnpm.overrides` ; (c) Activer CodeQL Code Scanning (3 clics Settings) ; (d) §14.1 sécurité secrets — bloquant prod.

---

## 14. Roadmap Production

> Sujets stratégiques de prep launch discutés en sessions 24-26/05/2026 mais non encore actionnés. **Bloque le déploiement prod tant que 14.1 n'est pas fait.** À cocher au fur et à mesure.

### 14.1 Sécurité — secrets compromis en dev (PRIORITÉ HAUTE)

Tout secret qui a été visible en dev local ou historisé dans des sessions de debug est à considérer comme grillé. À régénérer **avant tout déploiement** :

- [ ] **Régénérer `JWT_ACCESS_SECRET`** + **`JWT_REFRESH_SECRET`**. Générer via `openssl rand -base64 64`. Remplacer uniquement dans `.env` de prod (jamais commit). Conséquence : tous les tokens existants (refresh inclus) seront invalidés au déploiement — comportement attendu pour le premier launch.
- [ ] **Régénérer le token Upstash Redis** (REST + connection string `rediss://`) depuis le dashboard Upstash. Mettre à jour `REDIS_URL` dans `.env` prod uniquement.
- [ ] **Ajouter `DATA_ENCRYPTION_KEY`** : un warning au boot signale son absence. Générer 32 bytes aléatoires base64 (`openssl rand -base64 32`), injecter dans `.env`. Vérifier le call site backend qui émet le warning pour confirmer le format attendu et le scope d'utilisation.

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

- [ ] **Domaine de prod** (`kitchenxpert.com` ?) : acheter / pointer. Vérifier la cohérence avec `ORGANIZATION_JSONLD`, `WEBSITE_JSONLD`, `SOFTWARE_JSONLD` (URLs canoniques, OG images, schema.org).
- [ ] **CORS strict** : configurer `CORS_ORIGINS` en `.env` prod pour autoriser uniquement le domaine de prod (pas de wildcard, pas de `localhost`). Tester avec un navigateur fresh sans cache.
- [ ] **Cookies httpOnly + secure + sameSite** : vérifier que `secure: true` est bien forcé en prod (cf `auth-middleware.ts`) et que `sameSite: 'lax'` ou `'strict'` est aligné avec le domaine frontend. SSL géré automatiquement par Vercel (frontend) + plateforme backend choisie. Supabase n'accepte déjà que SSL (`DB_SSL=true`).

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
- [ ] Bump `nodemailer` 6 → 8 : ⚠️ **un override `nodemailer: ^7.0.4` existe dans `pnpm.overrides` racine** — désynchro vs dep backend `^6.9.8`. Avant ce bump, **résoudre l'override** (cf §11 P3 audit overrides), puis aligner toutes les sources (override + dep backend + scraper si concerné).
- [ ] Bump `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` 6 → 8 : couplé à la migration TS 6 (Lot 4 ci-dessus) + bumper `eslint` 8 → 9 (déjà déprécié, warning au boot).

#### Règles transverses du chantier

- Toujours `pnpm install` + smoke test backend + frontend après chaque paquet de PRs mergé.
- Si une régression apparaît, **isoler par bisect** (re-tester chaque PR du paquet une par une) — c'est ce qui a permis d'identifier l'override path-to-regexp comme cause racine (pas une PR Dependabot elle-même).
- Réflexe `git pull` : si conflit sur `pnpm-lock.yaml`, faire `git checkout -- pnpm-lock.yaml` avant pull, puis `pnpm install` après pull (le cloud main est source de vérité).
- Tenir à jour la coche `[x]` au fur et à mesure des merges.

---

*Dernière mise à jour : 31/05/2026 (soir) — **Marathon CI : 5 couches de bugs dépilées, 6 PRs mergées sur la journée (#50 #51 #52 #53 #72 #73)**. Facturation Actions débloquée via PayPal + budget 20$/mois (§14.3). Pattern audit/decision/execution capitalisé dans skill mémoire Claude Code. 7 nouvelles dettes §11 P3 ajoutées (couche 6 backend startup, CodeQL, frontend-ci, backend-ci, submodule orphelin, plafond PayPal, indent YAML). Couche 6 identifiée non résolue (wait-on timeout backend) — session dédiée prochaine. main HEAD = `6b8a98c`. Branche courante : `docs/session-31-05-marathon-ci`.*
