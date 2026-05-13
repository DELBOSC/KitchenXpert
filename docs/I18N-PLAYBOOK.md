# KitchenXpert — i18n Playbook

> FR + EN aujourd'hui. Architecture prête pour DE / ES / IT sans
> refactor du code.

---

## Décisions

| Question | Réponse | Pourquoi |
|---|---|---|
| Librairie | **react-i18next 16** | Déjà en place (180+ `useTranslation`), migrer vers Lingui ou FormatJS coûterait 2 sem. pour zéro gain produit |
| Stratégie URL | **Sous-paths `/fr/*` `/en/*`** | Meilleur SEO international (Google préfère paths > sous-domaines pour le ranking), gestion de cookies unifiée |
| Détection initiale | **URL → Cookie → `navigator.language` → FR** | URL = vérité SEO ; cookie persiste 1 an ; navigator est le fallback poli |
| TMS | **[Tolgee](https://tolgee.io) self-host ou Cloud Free** | OSS, sync GitHub native, prévisualisation in-context, ergonomie meilleure que Locize gratuit |

---

## Architecture livrée

| Couche | Fichier | Rôle |
|---|---|---|
| Config i18next | [`src/i18n/i18n.ts`](packages/frontend/src/i18n/i18n.ts) | Resources, fallback, `SUPPORTED_LANGUAGES`, type `SupportedLanguage` |
| Provider + detector | [`src/i18n/LanguageProvider.tsx`](packages/frontend/src/i18n/LanguageProvider.tsx) | URL→Cookie→navigator, `setLanguage()` réécrit URL + cookie + i18n |
| LocalizedLink | [`src/i18n/LocalizedLink.tsx`](packages/frontend/src/i18n/LocalizedLink.tsx) | Drop-in <Link>/<NavLink> auto-préfixé `/fr` ou `/en` |
| Switcher UI | [`src/i18n/LanguageSwitcher.tsx`](packages/frontend/src/i18n/LanguageSwitcher.tsx) | Dropdown header accessible (clavier + Escape + click outside) |
| Formatters | [`src/i18n/formatters.ts`](packages/frontend/src/i18n/formatters.ts) | `useFormatNumber/Currency/Date/RelativeTime/Length` |
| Hreflang | [`src/i18n/Hreflang.tsx`](packages/frontend/src/i18n/Hreflang.tsx) | `<link rel="alternate" hreflang>` runtime + `buildAlternates()` SSG |
| Mapping slugs | [`packages/guides/src/data/slug-mapping.json`](packages/guides/src/data/slug-mapping.json) | 50+ entrées FR ↔ EN |
| Extractor | [`scripts/extract-hardcoded-strings.mjs`](scripts/extract-hardcoded-strings.mjs) | Génère `docs/i18n-extraction-report.md` avec faux positifs filtrés |

---

## Comment l'utiliser dans un composant

```tsx
import { useTranslation } from 'react-i18next';
import { LocalizedLink } from '../i18n/LocalizedLink';
import { useFormatCurrency } from '../i18n/formatters';
import { LanguageSwitcher } from '../i18n/LanguageSwitcher';

export function MyPage() {
  const { t } = useTranslation();
  const fmt = useFormatCurrency();

  return (
    <div>
      {/* LangSwitcher se met n'importe où dans le header */}
      <LanguageSwitcher />

      <h1>{t('home.title')}</h1>
      <p>{t('home.price', { price: fmt(14.90) })}</p>

      {/* Préfix lang ajouté auto */}
      <LocalizedLink to="/pricing">{t('home.seePricing')}</LocalizedLink>
    </div>
  );
}
```

### Pluralisation (ICU)

react-i18next supporte ICU MessageFormat. Dans `en.json` :

```json
{
  "designer.itemsAdded": "{count, plural, =0 {No items added} one {1 item added} other {# items added}}"
}
```

Puis `t('designer.itemsAdded', { count })` choisit la bonne forme automatiquement.

---

## Routing — migration à finir

**Le LanguageProvider fonctionne aujourd'hui** : il détecte la langue
depuis l'URL si présente, sinon fallback cookie/navigator. Les
composants `useTranslation()` rendent les bonnes chaînes.

**Ce qui reste à faire** : les routes du `router.tsx` n'acceptent pas
encore le préfixe `/fr/` ou `/en/`. Aujourd'hui, `/fr/login` renvoie
404. Trois options pour fixer :

### Option A — Migration mécanique (45 min, recommandée)

Wrap le `<Routes>` global dans un parent `/:lang/*` puis convertir
chaque inner `path="/foo"` en `path="foo"`. C'est répétitif mais
mécanique : un `sed` `path="\/` → `path="` règle 90 %.

```tsx
<Routes>
  <Route path="/:lang/*" element={<LocaleShell />}>
    {/* Toutes les routes existantes ici, paths relatifs */}
    <Route path="login" element={…} />
    <Route path="pricing" element={…} />
    {/* … */}
  </Route>
  {/* Fallback non préfixé → redirige vers la langue détectée */}
  <Route path="*" element={<LocaleRedirect />} />
</Routes>
```

### Option B — Rewrites au niveau reverse-proxy

Caddy/Nginx réécrit `/login` → `/fr/login` côté serveur. Aucun
changement React Router. Inconvénient : si l'utilisateur clique un
lien interne mal préfixé, il y a un round-trip serveur.

### Option C — Aucun préfixe (URLs identiques FR/EN)

Garder le routing actuel. `setLanguage()` ne change que le cookie +
i18n ; l'URL ne reflète pas la langue. Inconvénient : pas de hreflang
crédible → SEO pénalisé pour la version anglaise.

**Recommandation : Option A** dès que tu lances la version EN au public.

---

## TMS — Tolgee (workflow recommandé)

### Setup initial (30 min)

1. Crée un compte sur [Tolgee Cloud](https://tolgee.io) (free tier 1k clés)
2. Crée un projet « KitchenXpert »
3. Importe les fichiers existants : `packages/frontend/src/i18n/translations/{fr,en}.json` via l'UI ou la CLI :

```bash
npm install -g @tolgee/cli
tolgee login
tolgee pull --format json --languages fr,en \
  --path packages/frontend/src/i18n/translations
```

4. Ajoute l'API key en secret GitHub : `TOLGEE_API_KEY`

### Workflow continu

```bash
# Avant de coder
tolgee pull        # récupère les dernières traductions

# Pendant le dev — ajout d'une nouvelle clé
# Édite fr.json directement OU via Tolgee UI

# Avant de commit
tolgee push        # envoie les ajouts au TMS

# CI
- name: i18n drift check
  run: tolgee compare --languages fr,en  # échoue si EN < 95% complétée
```

### Pour un traducteur (DE / ES / IT)

- Tu lui donnes un accès "Translator" Tolgee
- Il traduit dans l'UI Tolgee (preview in-context du composant)
- Sa modif déclenche un PR auto via Tolgee GitHub Action
- Tu mergeS → la langue est en ligne

**Zéro touche au code pour ajouter une langue. C'est ça le ROI du TMS.**

---

## Slugs traduits (SEO)

Pour les pages éditoriales `/guides/*`, les slugs FR et EN diffèrent
(SEO différent dans chaque langue). Le mapping vit dans
[`packages/guides/src/data/slug-mapping.json`](packages/guides/src/data/slug-mapping.json).

Exemples :

| FR | EN |
|---|---|
| `/guides/cuisine-en-l` | `/en/guides/l-shaped-kitchen` |
| `/cuisinistes/schmidt` | `/en/kitchen-brands/schmidt-kitchens` |
| `/budget/cuisine-10000-euros` | `/en/budget/kitchen-under-11000-dollars` |
| `/comparatifs/vs-coohom` | `/en/comparisons/vs-coohom` |

Le composant `<Hreflang slugMap={...}>` utilise ce mapping pour
générer les `<link rel="alternate">` corrects.

---

## Devises + unités

| Locale | Devise par défaut | Unités |
|---|---|---|
| `fr` | EUR | métrique (cm, m, m²) |
| `en` | EUR (default), USD/GBP sur override utilisateur | métrique (toggle imperial dans Settings — UI à faire) |

Override utilisateur : cookie `kx-units` (`metric` ou `imperial`) + cookie `kx-currency` (`EUR`/`USD`/`GBP`). À brancher dans la future page Settings (~30 min de travail).

API ECB pour conversion EUR↔USD↔GBP : `https://api.exchangerate.host/latest?base=EUR&symbols=USD,GBP` — gratuit, sans clé, donné par la BCE.

---

## Tests

Le frontend a déjà la suite E2E `e2e-critical/`. Ajoute deux specs :

- `flow-login-en.spec.ts` — login fonctionne identiquement en `/en/login`
- `flow-all-pages-en.spec.ts` — boucle sur les 9 pages publiques en EN, vérifie absence de `[object Object]`, `undefined`, ou clés non traduites (regex `\b[a-z]+\.[a-z]+\b` dans le DOM)

Skipped si la migration routing (Option A) n'est pas faite — tag `@i18n-router-ready`.

---

## Roadmap DE / ES / IT

Estimation budget traducteur professionnel (FR → cible) :

| Langue | Volume UI (913 lignes ≈ 8 000 mots) | Volume éditorial (50 articles × ~2 000 mots = 100 000 mots) | Coût traducteur (~0,10 €/mot) | Délai (1 ETP) |
|---|---:|---:|---:|---:|
| **EN** | 800 € | 10 000 € | **10 800 €** | 4-6 semaines |
| **DE** | 1 100 € (DE plus dense) | 13 000 € | **14 100 €** | 5-7 sem. |
| **ES** | 750 € | 9 500 € | **10 250 €** | 4-6 sem. |
| **IT** | 800 € | 10 000 € | **10 800 €** | 4-6 sem. |
| **TOTAL 4 langues** | – | – | **~46 000 €** | 4-6 mois calendaires |

### Stratégie d'amortissement

1. **EN d'abord** (déjà 913 lignes UI faites — coût ~10 000 € pour les articles)
2. **DE ensuite** (marché premium, payant le mieux pour un produit cuisine)
3. **ES + IT en parallèle** quand revenue mensuel EN dépasse 5 000 € MRR

Alternative low-cost : **traduction IA + relecture pro**. Avec
GPT-4-translate ou Claude pour le premier jet (~5 % du coût), puis
relecteur natif pour valider (~30 % du coût). Total **−65 %**, qualité
finale ≈ 95 % du traducteur full-pro pour de l'UI/marketing (à éviter
pour le legal — voir `legal.ts`, qui doit être 100 % humain).

---

## Checklist Laurent

### Activation EN (estimation 1 semaine)

- [ ] Refactor routing Option A : `<Route path="/:lang/*">` + relative inner paths
- [ ] Brancher `<LanguageSwitcher />` dans le header (`components/common/Header/Header.tsx`)
- [ ] Brancher `<Hreflang />` dans le layout SEO
- [ ] Lancer `node scripts/extract-hardcoded-strings.mjs` → traiter les hits restants (~50-100 selon audit)
- [ ] Reviewer la traduction `en.json` existante (913 lignes — qualité actuelle inconnue)
- [ ] Ajouter 2 specs E2E en EN
- [ ] Update `scripts/generate-sitemap.mjs` pour inclure les URLs `/en/*` + hreflang
- [ ] Soumission Google Search Console : propriété séparée pour `kitchenxpert.com/en/`

### TMS

- [ ] Compte Tolgee Cloud (free tier)
- [ ] Import des 2 langues actuelles
- [ ] Workflow GitHub : `tolgee pull` en pre-build + `tolgee push` en post-merge
- [ ] Documenter pour un traducteur externe (process onboarding)

### Avant DE / ES / IT

- [ ] Confirmer que le code est 100 % i18n (extractor à 0 hit)
- [ ] Confirmer que la PERF EN tient (Lighthouse ≥ 95)
- [ ] Confirmer un traducteur professionnel sourcé (ProZ, Upwork, ou agence FR comme Acolad)
- [ ] Budget validé selon la grille ci-dessus
