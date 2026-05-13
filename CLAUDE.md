# KitchenXpert — Project Context for Claude

> Ce document est lu automatiquement par Claude Code à chaque session.
> Il fige les décisions de positionnement, design, et techniques de KitchenXpert.
> **Ne pas le contourner sans justification explicite documentée.**

---

## 1. Vision & Positionnement

**Pitch en une phrase** : KitchenXpert est un SketchUp grand public premium pour concevoir sa cuisine en 3D dans le navigateur, scalable vers les professionnels (cuisinistes, architectes d'intérieur).

**Stratégie produit** : Conquérir d'abord le **particulier exigeant** qui veut planifier sa rénovation/installation cuisine, puis monter en gamme vers le pro qui retrouve ses clients déjà familiers avec l'outil (effet de viralité Figma/SketchUp).

**Anti-positionnement** : Ce n'est PAS un outil B2B pro froid type AutoCAD/Revit. Ce n'est PAS non plus un jouet 3D gratuit type Roomstyler. C'est entre les deux, premium et chaleureux.

---

## 2. Personas & Modèle Économique

| Plan | Cible | Prix | Différenciateurs |
|---|---|---|---|
| **Free** | Le curieux découvre | 0 € | 1 projet, catalogue de base, rendu Show, export image basse résolution |
| **Pro** | Particulier exigeant | 12-19 €/mois | Projets illimités, catalogue complet (marques), rendu Show + Plan, export HD, sauvegarde cloud |
| **Studio** | Cuisiniste, archi, pro | 49 €/mois | Mode Pro débloqué (cotations mm, métrés auto, devis), export DWG/PDF coté, multi-utilisateurs, branding agence |

**Implications UX** :
- Le Free doit **donner envie de payer**, pas frustrer artificiellement. Le moment de friction (paywall) intervient au moment de **valeur créée** (sauvegarde, export HD, deuxième projet), jamais avant.
- L'interface est **identique pour les trois plans**. Seules les fonctions Studio sont visuellement signalées par un badge `STUDIO` discret (pas une bannière agressive "Upgrade now").
- Pas de freemium dégueulasse type popups : si l'utilisateur Free tente une action Pro, on lui montre un dialog élégant qui explique la valeur, propose un essai 14 jours, et qui se ferme en 1 clic.

---

## 3. Stack Technique

**Framework & build** : React 18 (TypeScript) + Vite, React Router, Redux Toolkit (slices `catalog`, `project`), Zustand (sandbox state avec `persist` middleware).

**Styling** : TailwindCSS dark mode, Framer Motion, classes maison `kx-focus` et `kx-grid-pattern`.

**3D** : Three.js + package interne `@kitchenxpert/3d-engine` (`BRAND_PROFILES`, `recomputeWithThickness`, `mmToM`). Hooks dédiés `useKitchenEngine.ts`, `useCollaboration.ts`.

**i18n & SEO** : i18next + react-i18next (FR par défaut, EN fallback dans `t(key, fallback)`), composant `<SeoHead>` + JSON-LD (`ORGANIZATION_JSONLD`, `WEBSITE_JSONLD`, `SOFTWARE_JSONLD`).

**Tests UI** : Vitest + @testing-library/react + @testing-library/user-event (env jsdom).

**Icônes** : lucide-react UNIQUEMENT. **Aucun emoji** en UI productive (ils peuvent apparaître dans la doc/marketing, jamais dans les boutons, labels, ou messages d'état).

---

## 4. Composants Maison (à réutiliser systématiquement)

Dans `packages/frontend/src/components/ui` :

`Button`, `Input`, `Select`, `Switch`, `Checkbox`, `Card` (avec `CardHeader`/`CardBody`/`CardTitle`/`CardDescription`), `Badge`, `Avatar`, `Container`, `PageHeader`, `Dialog`, `EmptyState`, `ErrorState`, `Skeleton`, `Toast`/`ToastProvider`.

**Règle absolue** : ne JAMAIS créer un nouveau composant primitif sans justification documentée. Si une variante manque, **étendre le composant existant** via props (ex : `<Button variant="ghost-warm">`), pas dupliquer.

---

## 5. Direction Artistique

### 5.1 Tension chaud/froid (la signature)

L'identité visuelle repose sur une **tension entre lumière de cuisine (ambré 2700K) et lumière tech (indigo/fuchsia)**. Cette tension est la marque, pas un gradient de plus. Tout dark mode SaaS générique est à refuser.

### 5.2 Palette

**Surfaces** :
- `#0a0a0f` — fond de page (base)
- `#13131c` — surfaces (cards, panels)
- `#1d1d2a` — surfaces hover/active
- `#f5f3ef` — texte principal (ivoire chaud, jamais blanc pur)
- `#a8a4a0` — texte secondaire

**Accents froids (tech, structure)** :
- `from-indigo-400` (#818cf8) `to-fuchsia-500` (#d946ef) — dégradé principal
- `kx-focus` ring — focus states

**Accents chauds (cuisine, matière)** :
- `#ffb878` — ambré 2700K, hover de CTAs principaux, points lumineux
- `#ff9a4d` — version saturée pour highlights

**Règle d'usage** : chaud et froid ne se mélangent JAMAIS au sein d'un même élément. Ils cohabitent à l'échelle du layout (ex : fond froid + lumière chaude qui rayonne d'une zone). Le mix dans un même bouton = bouillie.

### 5.3 Typographie

**Display** (titres ≥48px) : **Fraunces** (serif, expressive, variable). Tracking `-0.04em` sur les très grandes tailles (96-120px). Évoque "atelier/Maison française".

**Sans** (UI, body, labels) : **Inter Tight** (sans industriel, lisible à toute taille). Tracking `0`.

**Règle** : sans-on-sans (Inter partout) est INTERDIT — c'est le look "AI-generated SaaS" générique qu'on rejette. La tension serif/sans renforce l'identité produit.

### 5.4 Grain & atmosphère

Overlay grain 1-2% (SVG noise ou texture PNG) sur les grandes surfaces. Tue l'aspect synthétique des aplats `#0a0a0f` purs. À implémenter via une div `position: fixed; inset: 0; pointer-events: none; opacity: 0.02; background: url(grain.svg)`.

### 5.5 Gradients = sources de lumière

Les gradients sont traités comme des **sources de lumière dans une scène**, pas comme des fonds décoratifs. Une fuchsia rayonne **depuis derrière** un objet 3D, un rim light indigo souligne **un bord de carte**. Pas de blob flou centré en fond — c'est l'anti-pattern Vercel/Linear à fuir.

---

## 6. Principes UX

### 6.1 Ce n'est pas une landing, c'est un lobby d'outil

L'écran d'accueil doit faire comprendre **en 5 secondes** : "Je peux dessiner une vraie cuisine ici, en 3D, dans mon navigateur, maintenant." Pas de scroll marketing à rallonge, pas de "Fonctionnalités → Témoignages → CTA bis".

### 6.2 CTA unique : "Ouvrir l'éditeur"

L'accueil propose **une seule action principale** : `Ouvrir l'éditeur`. Pas "S'inscrire gratuitement", pas "Commencer". Action > engagement. L'inscription/paywall intervient au moment de **sauvegarder le premier projet**, c'est-à-dire quand la valeur est déjà créée.

### 6.3 Hero personnalisé pour utilisateurs récurrents

Si l'utilisateur a déjà des projets, l'accueil devient une **grille de thumbnails 3D de ses projets** + CTA "Reprendre [nom du dernier projet] · modifié il y a 2j". Même écran, deux états — c'est rare et ça change l'engagement.

### 6.4 Progressive Disclosure (grand public ↔ pro)

L'interface est **épurée par défaut** (mode grand public). Les fonctions Studio (cotations mm, métrés, export DWG, devis) sont accessibles via `Préférences → Mode Pro` ou un toggle global discret. Modèle de référence : Figma Dev Mode, Apple Settings → Accessibility.

### 6.5 Deux modes de rendu 3D : Show ↔ Plan

- **Show** : rendu beau, ombres douces, textures réalistes — le mode séduction (par défaut grand public)
- **Plan** : axonométrie technique, cotations, vue de dessus — le mode pro

Le toggle entre les deux est un **wow-effect** en démo et un outil quotidien pour le Studio. Référence : SketchUp Styles.

### 6.6 Catalogue dual-track

**Un seul catalogue**, deux niveaux d'information révélés selon le mode :
- Mode grand public : marques aspirationnelles (Ikea, Schmidt, Mobalpa, Cuisinella), photos lifestyle, prix indicatif
- Mode pro : références produits exactes, cotes au mm, fiches techniques téléchargeables, dispo fournisseur

---

## 7. Principes d'Interaction (IX)

### 7.1 La lumière comme vocabulaire d'interaction

Puisque KitchenXpert manipule des cuisines (objets éclairés, matériaux réfléchissants), les interactions parlent le langage de la **lumière**, pas des ombres CSS génériques.

### 7.2 Curseur-lampe (signature IX)

Un halo indigo de ~200px suit le pointeur sur les pages marketing et les zones de catalogue. Effet "lampe-torche" qui révèle subtilement les surfaces.

Implémentation : `radial-gradient(circle 200px at var(--mx) var(--my), rgba(129,140,248,0.15), transparent)` + listener `mousemove` sur le container parent. Désactivé sur mobile et avec `prefers-reduced-motion`.

### 7.3 Boutons magnétiques (avec parcimonie)

Le CTA principal (et **lui seul**) tire le curseur dans un rayon de 80px. Implémentation : Framer Motion `useMotionValue` + `useSpring` sur la position du bouton. **Jamais sur les boutons secondaires** — ça devient bruyant et fatigant.

### 7.4 Rim light au hover des cartes

Pas de `box-shadow` au hover des cards — une **bordure 1px en gradient conique** qui rotate autour de la carte. Implémentation : `conic-gradient` + animation CSS `@keyframes spin`. Cohérent avec la métaphore lumière.

### 7.5 Loading = ligne de film, pas spinner

Pour les chargements (page, projet, 3D scene) : **ligne fine dégradée indigo→fuchsia qui se dessine en haut du viewport**, façon amorce de pellicule cinéma. Jamais de spinner rond générique.

### 7.6 Transitions spatiales (pas de cut)

Passage page d'accueil → éditeur : la cuisine 3D du hero **zoome en avant**, l'UI marketing se dissout, on entre dans le canvas plein écran. **Continuité spatiale**. Pas de navigation classique qui claque vers une nouvelle URL sans transition.

### 7.7 Performance & seuils

- Si le Three.js engine met >2s à se charger sur l'accueil, on sert d'abord un **placeholder low-poly (~200 tris)** qui swap quand le vrai est prêt.
- Animations critiques (édition 3D, drag-and-drop) : **<200ms** ou pas d'animation du tout
- Animations décoratives (hero, marketing) : **<300ms** sauf intention narrative
- Respect strict de `prefers-reduced-motion` (désactive curseur-lampe, parallax, magnetic buttons)

---

## 8. Anti-Patterns (à refuser systématiquement)

- ❌ Gradient blobs flous en fond (vu partout depuis 2020)
- ❌ "Ils nous font confiance" + grille de logos clients (corporate, mauvais signal B2C)
- ❌ Vidéo de fond en hero
- ❌ Compteurs animés ("+12 000 cuisines créées")
- ❌ Hero centré (préférer asymétrique : copy à gauche, 3D à droite ~55-60%)
- ❌ Double CTA dans le hero ("Get started free" + "Watch demo")
- ❌ Sidebar gauche qui mange le canvas 3D dans l'éditeur
- ❌ Modals bloquantes pendant manipulation 3D
- ❌ Spinners ronds (préférer ligne de film)
- ❌ Sans-on-sans (Inter partout) — la tension serif/sans est non-négociable
- ❌ Emojis en UI productive (boutons, labels, états) — lucide-react UNIQUEMENT
- ❌ Whites purs (#FFFFFF) — préférer ivoire #f5f3ef
- ❌ Création d'un composant primitif sans justification (étendre l'existant)
- ❌ Paywalls/popups intrusifs sur le Free
- ❌ Bannières "Upgrade now" agressives sur les fonctions Studio (préférer badge discret)

---

## 9. Références produits (à étudier avant toute proposition)

**Pour le métier (éditeurs 3D)** :
- SketchUp (architecture des outils, styles, raccourcis clavier)
- Cedreo / IKEA Home Planner (catalogue + drag-to-canvas)
- Figma (palettes flottantes, contextual menus, Dev Mode toggle)
- Blender (N-panel side properties)

**Pour la direction artistique (premium chaleureux)** :
- Linear (rigueur mais sans chaleur — on prend l'opposé)
- Vercel (gradient blob — anti-référence)
- Arc Browser (chaleur, identité forte, mais grand public)
- Apple (Progressive Disclosure, sobriété musclée)

**Pour le pricing/conversion** :
- Figma (free généreux → conversion équipe)
- Notion (free → personal pro → team)
- SketchUp (Web gratuit → Pro)

---

## 10. Comment Claude doit travailler sur ce projet

1. **Avant toute proposition de design**, relire les sections 5 (Direction artistique), 6 (UX), 7 (IX) de ce fichier.
2. **Avant toute proposition de composant**, vérifier dans `packages/frontend/src/components/ui` si une primitive existe déjà.
3. **Avant toute proposition de code**, identifier si on est en contexte grand public (par défaut) ou pro (mode débloqué), et adapter les détails UX (densité, vocabulaire, niveau de précision technique affiché).
4. **Toujours challenger** mes demandes si elles entrent en conflit avec ce document. Si je demande "ajoute un blob flou en fond", refuser et proposer mieux (en référant au § Anti-Patterns).
5. **Solliciter le skill `bencium-innovative-ux-designer`** pour toute décision de design structurante (nouvel écran, refonte de section).
6. **Tester systématiquement** les composants visuels avec : keyboard navigation, `prefers-reduced-motion`, `prefers-color-scheme: dark` (le seul supporté), contrast ratio ≥ 4.5:1 sur les textes.

---

## 11. Décisions encore à trancher (TODO)

- [ ] Choix définitif police display : Fraunces vs Tiempos vs General Sans (à tester sur le hero)
- [ ] Format exact du badge `STUDIO` sur les fonctions pro
- [ ] Stratégie d'onboarding : tutoriel guidé première session vs sandbox libre avec hints
- [ ] Comportement précis du paywall au moment du save (modal vs sidebar vs full-page)
- [ ] Architecture i18n : supporter ES/DE/IT dès v1 (marchés cuisinistes européens) ou rester FR/EN
- [ ] Intégrations marques fabricants (Home Connect, Miele, Samsung SmartThings, LG ThinQ, Electrolux) : phase de lancement ou v2 ?

---

*Dernière mise à jour : conception initiale. À enrichir au fil des décisions produit.*
