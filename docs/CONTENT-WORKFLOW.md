# KitchenXpert — Workflow contenu (50+ articles)

Pour Laurent (et tout futur rédacteur invité). Ouvre ce doc à chaque
fois que tu écris un nouvel article — il y a tout ce qu'il faut pour
ne **rien oublier** côté SEO et qualité.

---

## TL;DR — workflow en 7 étapes

```
1. Ajoute ton entrée au manifest (src/data/article-manifest.ts)
2. Génère le stub :  pnpm --filter guides new --slug=<ton-slug>
3. Écris le contenu (Markdown + composants importables)
4. Fact-checke prix, marques, normes
5. Ajoute 5-10 captures designer (place-holders OK pour la PR)
6. Passe `draft: true` à `draft: false`
7. PR → preview Vercel → merge → live sous 5 min
```

---

## L'architecture (pour comprendre où vit quoi)

```
packages/guides/
├── src/
│   ├── content/
│   │   ├── config.ts                # Zod schemas (5 templates) — la VÉRITÉ
│   │   ├── layouts/                 # /guides/<slug>
│   │   ├── cuisinistes/             # /cuisinistes/<slug>
│   │   ├── budgets/                 # /budget/<slug>
│   │   ├── styles/                  # /styles/<slug>
│   │   ├── comparatifs/             # /comparatifs/<slug>
│   │   └── pratiques/               # /guides/<slug>
│   ├── components/                  # Astro/React composants éditoriaux
│   ├── layouts/ArticleLayout.astro  # Le wrapper SEO + chrome de chaque article
│   ├── pages/
│   │   ├── index.astro              # Hub /guides
│   │   ├── [...slug].astro          # Routing dynamique → tous les articles
│   │   └── og/[...slug].png.ts      # OG images générées au build
│   └── data/
│       ├── authors.ts               # Bios + initiales
│       └── article-manifest.ts      # ⭐ La source de vérité des 50 articles
├── astro.config.mjs
└── package.json
```

---

## Étape 1 — Ajouter au manifest

Le **manifest** (`packages/guides/src/data/article-manifest.ts`) est la
SEULE source de vérité de quels articles existent ou doivent exister.
Avant de créer un fichier MDX, ajoute son entrée :

```ts
{
  slug: 'mon-nouvel-article',
  template: 'layouts',           // 'layouts' | 'cuisinistes' | 'budgets' | 'styles' | 'comparatifs' | 'pratiques'
  title: 'Mon titre 50–60 caractères',
  description: 'Ma description 150–160 caractères pour Google.',
  keywords: ['mot-cle-1', 'mot-cle-2', 'mot-cle-3'],
  estWords: 2000,
}
```

Le manifest sert aussi à **planifier** ta production : `estWords` te
donne la charge de travail totale pour un sprint d'écriture.

---

## Étape 2 — Générer le stub

```bash
# Crée le fichier MDX vide (sans toucher à un existant)
pnpm --filter guides new --slug=mon-nouvel-article

# OU pour matérialiser TOUTES les entrées du manifest d'un coup
pnpm --filter guides new --all
```

Le générateur (`scripts/new-article.mjs`) lit le manifest, crée le
fichier `src/content/<template>/<slug>.mdx` avec :
- Frontmatter pré-rempli (titre, description, keywords)
- `draft: true` (pour ne pas indexer un article incomplet)
- Imports des 3 composants principaux (`CTABlock`, `FAQ`)
- Plan-type adapté au template
- Squelette FAQ + JSON-LD prêt à remplir

---

## Étape 3 — Conventions d'écriture

### Structure obligatoire (Lighthouse SEO + UX)

- **1 seul `<h1>`** (le titre — déjà géré par `ArticleLayout`, ne JAMAIS
  écrire `# Mon titre` au début d'un MDX)
- **3 à 6 `<h2>`** dans le body — c'est ce qui peuple le sommaire
- **`<h3>` sous-sections** au besoin
- **Au moins 1 `<CTABlock variant="inline" />` au milieu** + **1 final**
- **5 questions de FAQ minimum** (Google adore les rich snippets FAQ)

### Densité éditoriale

| Template | Mots cibles | Sections H2 | CTA | FAQ |
|---|---:|---:|---:|---:|
| layouts     | 1800–2200 | 5–7 | 2 | 5 |
| cuisinistes | 2000–2400 | 6–8 | 2 | 5 |
| budgets     | 1700–2100 | 5–6 | 2 | 5 |
| styles      | 1700–2000 | 5–6 | 2 | 5 |
| comparatifs | 2000–2400 | 6–8 | 2 | 5 |
| pratiques   | 1500–1800 | 4–6 | 2 | 5 |

### Composants disponibles dans MDX

```mdx
import CTABlock         from '../../components/CTABlock.astro';
import ComparisonTable  from '../../components/ComparisonTable.astro';
import ImageGallery     from '../../components/ImageGallery.astro';
import FAQ              from '../../components/FAQ.tsx';
```

Le `<TOC>`, le `<RelatedArticles>` et le `<ArticleHeader>` sont
**injectés automatiquement** par `ArticleLayout` — ne les ré-importe
pas dans ton MDX.

### Liens internes (maillage SEO)

**Règle d'or :** chaque article DOIT linker vers **3 à 5 autres
articles** du site via le frontmatter `related`. Le composant
`<RelatedArticles>` les rend en bas de page automatiquement.

```yaml
related: ["cuisine-en-u", "petite-cuisine-amenagement", "cuisine-5000-euros"]
```

Tu peux aussi citer un autre article au fil du texte avec un lien
relatif :

```mdx
Voir aussi notre guide [Cuisine en U](/guides/cuisine-en-u).
```

---

## Étape 4 — Fact-checking (NON-NÉGOCIABLE)

Tout ce qui touche à un **chiffre** doit être vérifié par toi avant
publication. Le `draft: true` te protège tant que ce n'est pas fait.

### Checklist fact-check

- [ ] **Prix** vérifiés sur le site officiel du fournisseur, datés (mois + année)
- [ ] **Dimensions** (m² minimum, fourchettes mètre linéaire) sourcées
- [ ] **Normes citées** (NF DTU, NF C 15-100) à jour de la dernière révision
- [ ] **Taux TVA / fiscaux** vérifiés sur economie.gouv.fr
- [ ] **Noms de gammes / SKU** vérifiés sur le site fournisseur
- [ ] **Citations** ("Selon Xerfi…") sourcées et linkées si la source est publique

### Si tu ne sais pas → tu enlèves la phrase

Mieux vaut un article 1 700 mots solide qu'un article 2 200 mots qui
te fait poursuivre par une marque pour info trompeuse.

---

## Étape 5 — Captures designer

Pour chaque article (sauf `pratiques`), prévois **5 à 10 captures du
designer 3D** illustrant les exemples cités.

Workflow :
1. Crée la cuisine dans le sandbox `/designer/sandbox`
2. Capture (Mac : ⌘⇧4, Windows : Win+Shift+S, viewport seulement)
3. Range sous `packages/guides/src/assets/<template>/<slug>/01.jpg`
4. Référence dans MDX :
   ```mdx
   <ImageGallery
     columns={3}
     images={[
       { src: '/guides/assets/layouts/cuisine-en-l/01.jpg', alt: "L compact 6 m²", caption: "L compact 6 m² — IKEA METOD blanc" },
       …
     ]}
   />
   ```

**Important :** mets `loading="lazy"` partout (`<ImageGallery>` le fait
déjà). Les captures avant la fold doivent être **width + height
explicites** pour éviter le CLS.

---

## Étape 6 — Passage en publication

Quand tu es prêt :

1. Frontmatter `draft: true` → `draft: false`
2. `updatedAt: 2026-XX-XX` (la date du jour si l'article est neuf, ou
   la date de mise à jour si tu réédites)
3. Commit + push : `git add . && git commit -m "guides(<template>): <slug> v1"`
4. Ouvre une PR — Vercel/Netlify build une preview automatique sur
   `https://guides-pr-<numero>.kitchenxpert.com`
5. Re-relis sur la preview (le rendu MDX peut différer du dev local)
6. Merge → live sous 5 min via la CI

---

## Étape 7 — Mesurer + itérer

Tous les événements analytics tombent dans Plausible
(https://plausible.io/kitchenxpert.com → onglet "Custom events") :

| Événement | Quand | Ce qu'il dit |
|---|---|---|
| `guides_article_view` | Au chargement | Volume brut |
| `guides_scroll_25/50/75/100` | Au scroll | Engagement réel |
| `guides_reading_time` | Au pagehide | Durée moyenne |
| `guides_cta_click` | Clic CTA designer | Conversion intent |
| Dans la SPA : `sandbox_signup_intent` avec `from=guides` | Signup attribué | Conversion finale |

**Funnel cible :** 100 vues → 60 scroll 50% → 25 scroll 100% → 8 CTA
click → 4 sandbox session → 2 signup.

Quand un article sort des clous (CTR très bas, scroll médian < 25 %),
ré-écris l'intro et la première section. C'est presque toujours là
que ça se joue.

---

## Anti-checklist : ce qu'il NE faut JAMAIS faire

- ❌ Renommer un slug après publication (cassera les liens externes,
  l'autorité SEO et l'attribution analytics)
- ❌ Reprendre des paragraphes d'un autre site (Google le détecte)
- ❌ Mettre des chiffres « à la louche » sans source
- ❌ Oublier `related: []` dans le frontmatter
- ❌ Publier avec `draft: true`
- ❌ Mettre des images > 200 KB sans passer par `<ImageGallery>` ou
  `vite-imagetools`

---

## Quand ajouter un nouveau template

Si tu veux écrire 5+ articles d'un nouveau type (ex. "appliances"
pour les guides électroménager dédiés) :

1. Ajoute le schéma Zod dans `src/content/config.ts`
2. Ajoute le mapping dans `[...slug].astro` + `index.astro`
3. Ajoute le `planFor()` correspondant dans `scripts/new-article.mjs`
4. Documente-le ici

C'est le seul moment où tu touches au code.
