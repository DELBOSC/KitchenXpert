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

**Sous-projet séparé** : `packages/guides/` est un site Astro v5 indépendant (build/deploy séparé via reverse proxy) pour le contenu SEO. **Hors scope de ce CLAUDE.md** — son design évolue séparément.

**Icônes** : **lucide-react** pour l'UI productive. **Exception assumée** : `TrustStack.tsx` utilise des SVG inline maison pour économiser les bytes (décision documentée). Tout autre composant doit utiliser lucide-react. **Aucun emoji** en UI productive.

**Setup dev** : `pnpm dev` à la racine lance backend (port 4000) + frontend (port 3005) en parallèle via Turbo. **Ne pas lancer le frontend seul** — le proxy Vite tape `localhost:4000` et la console se remplit de 500 si le backend est absent. Si besoin de lancer séparément : `pnpm backend:dev` dans un terminal, `pnpm frontend:dev` dans un autre. Vérifier le backend via `curl http://localhost:4000/health`. Prérequis : PostgreSQL local + `.env` (copié depuis `.env.example`). ⚠️ Sans `.env` à la racine, le backend démarre sur le port 3001 (au lieu du port 4000 attendu par le proxy Vite) — ce qui reproduit les erreurs 500 sur `/api/v1/*`.

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
- ✅ SVG inline dans TrustStack — décision perf justifiée

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

- [ ] `HowItWorks.tsx` : utiliser primitive `Card` au lieu de `<article>` brut, harmoniser palette
- [ ] `SandboxMigrationBanner.tsx` : utiliser primitives `Card` ou `Toast`
- [ ] `packages/guides/` : décider si le sous-projet Astro câble les tokens KitchenXpert
- [ ] Évaluer migration TrustStack vers lucide-react après mesure du bénéfice perf réel
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

---

## 13. État d'avancement (snapshot 16/05/2026)

| Phase | Statut | Restant |
|---|---|---|
| **Phase 1 P0** | ✅ Terminée | 0 tâche restante |
| **Phase 1 P1** | ✅ Terminée (actionnable) | 0 tâche actionnable restante (7 résolues cumulées + 1 résolue 22/05 [poster Hero] + 1 écartée 22/05 [Hero3DInteractive — décision d'architecture, §11 P1]) |
| **Phase 1 P2** | 🟡 En cours | 4 tâches (originelles 4 + 2 ajoutées 16/05 - 2 terminées 17/05) |
| **Phase 1 P3** | ⏳ Non démarrée | 12 tâches (8 + 4 ajoutées 22/05 : Hero vidéos, SVG fallback désaligné, encode-script absent, dormants 0-byte) |

Branche active : `feat/design-system-migration` (47 commits, à jour avec `origin`).
Prochaine cible : laisser tourner l'A/B test Hero en prod pour collecter le premier signal de variant — ou démarrer les 4 dettes P2 restantes (HowItWorks Card, SandboxMigrationBanner Card/Toast, packages/guides tokens, TrustStack perf).

---

*Dernière mise à jour : 22/05/2026 — §6.2 réécrit pour refléter la réalité (3 layouts A/B/C testés, Hero3D écarté) + tracking conversion A/B opérationnel via tagConversion (commit 0236f9f, 51 commits). Branche feat/design-system-migration toujours safe pour merge main.*
