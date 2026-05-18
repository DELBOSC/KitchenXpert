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

### 6.2 Hero — A/B Test HeroVideo vs Hero3D Interactif (option C)

**Décision** : on garde `HeroVideo` comme variant A (témoignage produit en 15s) et on développe `Hero3DInteractive` comme variant B (vision "lobby d'outil"). Le système `useABVariant` existant gère le split.

**Variant A (existant)** : HeroVideo.tsx — vidéo demo auto-play/muted/loop avec IntersectionObserver, poster JPG+SVG, respect `prefers-reduced-motion`.

**Variant B (à coder)** : Hero3DInteractive.tsx — canvas Three.js léger (réutilise architecture `SandboxCanvas`), cuisine d'exemple en low-poly (~200 tris), drag pour faire tourner, swap vers haute-fidélité après hover/click. Bundle initial visé < 250kb gzipped (lazy-loading Three.js si besoin).

**KPI de décision (après 4 semaines)** : taux de clic CTA principal + temps avant clic + bounce rate. Le variant gagnant devient le default, l'autre est retiré.

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

- Bundle hero initial < 250kb gzipped (Three.js lazy-load si Variant B)
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
- ✅ HeroVideo — variant A du A/B test, à conserver
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

- [🟡] BUG NAV PARTIELLEMENT RÉSOLU en localhost : Plausible désactivé en dev via early-return dans `plausible-loader.ts` (commit 5650135). Le wrap `pushState` Plausible a disparu de la console (log `[Plausible] disabled in dev` présent, log `Ignoring Event: localhost` absent). CEPENDANT, le clic sur `<Link>` React Router ne déclenche toujours pas la navigation en localhost. Cause secondaire à isoler — hypothèses : (a) Service Worker actif intercepte les events de navigation malgré "Bypass for network" coché, (b) autre wrapper `pushState` dans le projet (Sentry, OpenReplay, ou middleware custom), (c) le `<Link>` lui-même mal monté dans `HomePage.tsx > Nav` local. Workaround pour le développement : taper l'URL directement dans la barre d'adresse du navigateur (`localhost:3005/fr/pricing` marche, prouvé par tests visuels du 16/05). Non bloquant pour la production (hostname différent). Investigation à reprendre lors d'une session dédiée, idéalement avec un test pushState manuel en console (`window.history.pushState({}, '', '/fr/pricing')`) et bypass complet du SW.
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
- [ ] `Hero3DInteractive.tsx` : créer le variant B du A/B test (réutiliser archi SandboxCanvas, low-poly, lazy-load Three.js)
- [ ] `useABVariant` : configurer split HeroVideo (50%) vs Hero3DInteractive (50%) sur HomePage
- [ ] `tokens.css` : ajouter `--kx-accent-warm: 251 191 36` (amber-400) pour officialiser l'accent chaud
- [x] HomePage Section Metrics : suppression complète au lieu de simple déduplication. Tous les chiffres étaient aspirationnels ('98% satisfaction', '< 3 min génération', '24/7 support') ou en doublon avec LiveCounter ('50k+ cuisines'). Risque DGCCRF (L121-2) éliminé. LiveCounter reste seule source de vérité statistique sur la HomePage. Commit 02d41fe.
- [ ] Service Worker `sw.js:33` : "Failed to execute 'put' on 'Cache': Partial response (status code 206) is unsupported". Le SW tente de cacher des réponses partielles HTTP (range requests) sans les filtrer. À fixer en ajoutant un check `response.status !== 206` avant `cache.put()`.
- [ ] `main.tsx:55` : `navigator.serviceWorker.register('/service-worker.js')` échoue avec "unsupported MIME type 'text/html'" parce que le fichier est servi en HTML par le dev server au lieu de JavaScript. À fixer en configurant Vite pour servir `service-worker.js` ou en désactivant le register en mode `import.meta.env.DEV`.

### Priorité P2 (après lancement)

- [ ] `HowItWorks.tsx` : utiliser primitive `Card` au lieu de `<article>` brut, harmoniser palette
- [ ] `SandboxMigrationBanner.tsx` : utiliser primitives `Card` ou `Toast`
- [ ] `packages/guides/` : décider si le sous-projet Astro câble les tokens KitchenXpert
- [ ] Évaluer migration TrustStack vers lucide-react après mesure du bénéfice perf réel
- [x] `HeroVideo.tsx` (ligne 173) : warning React "fetchPriority not recognized" résolu via spread cast `{...({ fetchpriority: 'high' } as Record<string, string>)}` injectant l'attribut HTML standard lowercase. Note technique : `@ts-expect-error` ne fonctionne pas sur les attributs JSX (TypeScript #27552 ouvert depuis 2018). Commit 388e5cd.
- [ ] Backend `/api/v1/stats/public`, `/api/v1/auth/me`, `/api/v1/me/reviews/pending` retournent 500 en dev quand le backend Express n'est pas démarré. Polluent la console. Soit documenter clairement le besoin de démarrer le backend, soit implémenter un mock côté frontend pour les modes dev sans backend.

### Priorité P3 (futur, opportunité)

- [ ] Tester Fraunces / Inter Tight si données conversion l'exigent
- [ ] Enrichissement IX (curseur-lampe, boutons magnétiques) en option sections marketing premium
- [ ] Évaluer mode dark-only forcé selon usage réel des modes light/system
- [ ] `.gitignore` : ajouter `packages/frontend/public/sitemap.xml` (régénéré à chaque build par scripts/generate-sitemap.mjs, ne devrait pas être versionné). Puis `git rm --cached packages/frontend/public/sitemap.xml` pour le retirer du repo.
- [ ] RegisterPage : parse `?from=` query param pour enrichir l'event `signup_completed` avec le trigger source. Permet de mesurer la conversion par trigger (pdf_export, ai_use, quote_compare, pathtracer, session_15min).
- [ ] `LanguageSwitcher.tsx` : exit animation Dialog non observable car `closeSignupPrompt` nulle `trigger` simultanément avec `open=false`. À traiter dans `useSandboxLimits` si l'UX exit animation devient une exigence (mémoiser le dernier trigger valide ou délayer le null).
- [ ] `SignupPromptModal` : ajouter `data-testid="signup-prompt-dialog"` sur le wrapper racine si futur test E2E veut l'asserter (actuellement seuls le titre et les CTAs ont des data-testid).
- [ ] Police `/fonts/inter-var-latin.woff2` : "Failed to decode downloaded font: invalid sfntVersion: 1008813135". La police woff2 n'a pas un header valide (sfntVersion 0x3C212144 = '<!DM' = HTML). Probablement le dev server renvoie une page HTML 404 à la place du binaire police. À fixer.
- [⚠️ FAUSSE ALERTE] `tokens.css` lignes 3-7 : initialement documenté comme bug (variables `--kx-surface`, `--kx-border`, `--kx-fg-muted` à `255 255 255` en mode dark). Audit du 17/05/2026 a révélé : (a) les commentaires inline `/* overlays use alpha */`, `/* /10, /15, /20 */`, `/* use /60, /40 */` documentent un pattern volontaire RGB blanc + alpha à la consommation, (b) ces 3 tokens sont en réalité du code mort — aucun consommateur dans le projet (ni Tailwind classes, ni `var()` direct, ni arbitrary values). Pas un bug visuel. Pourrait être nettoyé en mission "dead-code cleanup" séparée si désiré, mais pas urgent — préserve l'option pour usage futur en alpha overlays.

---

## 12. Historique des décisions

- **14/05/2026** : Audit initial complet. Stratégie "migration douce" validée. Décisions : Pricing 29€/99€ confirmé, scroll marketing complet, TrustBar lucide-react (TrustStack SVG inline gardé), LiveCounter conservé, Hero en A/B test HeroVideo vs Hero3D.
- **15/05/2026** : Phase 1 P0 terminée (7 tâches cochées). Phase 1 P1 entamée (1 tâche cochée : nettoyage code mort HomePage). 20 commits propres sur la branche `feat/design-system-migration`. Détection de 4 nouvelles dettes ajoutées en P3.
- **16/05/2026** : PricingPage refonte palette KX terminée (commits 321141b + 5765fc4). 36 tests passent. Vérification visuelle validée (screenshot light mode propre, card Pro gradient indigo→fuchsia, checkmarks cyan, badge -20% amber). Détection de 5+ dettes techniques en environnement dev (Plausible nav bug, sw.js, fonts woff2, tokens.css surface/border) — toutes ajoutées au §11.
- **17/05/2026** : Fix partiel du bug Plausible nav en dev (commit 5650135). Le wrap pushState Plausible a disparu (le log `[Plausible] disabled in dev` apparaît, le log `Ignoring Event: localhost` a disparu), mais le clic sur `<Link>` ne navigue toujours pas en localhost. Cause secondaire à isoler dans une session ultérieure. Workaround validé : URL directe dans la barre d'adresse fonctionne.
- **17/05/2026** (suite) : Suppression complète du bloc Metrics sur HomePage (commit 02d41fe). Décision motivée par sécurité juridique pré-launch : les 4 stats étaient soit doublonnées (50k+ vs LiveCounter live), soit aspirationnelles non mesurées (98% satisfaction, < 3 min génération, 24/7 support). Risque pratique commerciale trompeuse au sens article L121-2 du Code de la consommation. Grep projet-wide confirmé zéro occurrence résiduelle de ces claims.
- **17/05/2026** (suite 2) : Fix du warning console `fetchPriority` sur HeroVideo (commit 388e5cd). Spread cast vers attribut HTML lowercase `fetchpriority`, après tentative `@ts-expect-error` échouée (limitation TypeScript sur attributs JSX). Warning runtime confirmé absent post-fix. Tests 1203/1203 passent.
- **17/05/2026** (suite 3) : Audit de la dette "tokens.css surfaces dark" (§11 P3). Découverte : faux positif. Les variables `--kx-surface`, `--kx-border`, `--kx-fg-muted` documentées comme bugs dark mode sont en réalité du code mort — pattern alpha intentionnel (RGB blanc + opacité à la consommation), mais zéro consommateur dans le projet. Reclassé en "fausse alerte". Aucune modification de tokens.css. Mission menée par audit-first qui a permis d'éviter une fausse correction.

---

## 13. État d'avancement (snapshot 16/05/2026)

| Phase | Statut | Restant |
|---|---|---|
| **Phase 1 P0** | 🟡 1 nouvelle dette critique (Plausible nav bug) | 1 tâche |
| **Phase 1 P1** | 🟡 En cours | 3 tâches (originelles -1 Metrics terminé +2 dettes ajoutées 16/05) |
| **Phase 1 P2** | 🟡 En cours | 5 tâches (originelles 4 + 2 ajoutées 16/05 - 1 terminée 17/05) |
| **Phase 1 P3** | ⏳ Non démarrée | 8 tâches (9 cumulées - 1 fausse alerte reclassée 17/05) |

Branche active : `feat/design-system-migration` (23 commits, à jour avec `origin`).
Prochaine cible : déduplication Metrics/LiveCounter dans HomePage.

---

*Dernière mise à jour : 17/05/2026 — React Router v7 future flags + reclassement fausse alerte tokens.css (32 commits).*
