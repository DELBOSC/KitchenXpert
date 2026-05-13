# KitchenXpert — Pages comparatives concurrents

Tout ce qu'il faut pour publier des pages `/comparatifs/vs-X` qui
captent le trafic SEO `<X> alternative` **sans risque juridique**.

---

## ⚠️ Lis ceci AVANT de publier

Les pages comparatives sont juridiquement plus risquées que tout
autre contenu marketing. **Coohom et SketchUp ont les moyens de
poursuivre.** Si tu publies un fait inexact, tu t'exposes à :

- **Concurrence déloyale** (Art. 1240 du Code civil) — dommages-intérêts
- **Pratique commerciale trompeuse** (L121-1 Code conso) — amende administrative jusqu'à 10 % du CA
- **Publicité comparative illicite** (L122-1 à L122-4) — sanctions pénales jusqu'à 37 500 €

**Garde-fous appliqués dans ce projet :**

1. Le frontmatter `draft: true` est le défaut — la page n'apparaît pas en prod
2. `denigratesCompetitor: false` est obligatoire (Zod refuse `true`)
3. Tous les faits citent une source URL + date dans `competitor-facts.json`
4. Le script `check-competitor-facts.mjs` re-vérifie les sources mensuellement
5. Le composant `LegalDisclaimer` est obligatoire en pied de chaque page
6. **Validation avocat fortement recommandée** pour les pages Coohom et SketchUp avant le passage `draft: false`

---

## Architecture livrée

| Fichier | Rôle |
|---|---|
| [`packages/guides/src/content/config.ts`](packages/guides/src/content/config.ts) | Schéma Zod `competitor` — refuse les payloads non-conformes |
| [`packages/guides/src/data/competitor-facts.json`](packages/guides/src/data/competitor-facts.json) | Source de vérité unique des faits cités |
| [`packages/guides/src/components/CompetitorTable.astro`](packages/guides/src/components/CompetitorTable.astro) | Tableau 6 catégories × ~25 critères. Affiche "— à vérifier" tant que `verified: false` |
| [`packages/guides/src/components/LegalDisclaimer.astro`](packages/guides/src/components/LegalDisclaimer.astro) | Pied de page conforme L122-1 — alerte visuelle si `verdictDate > 90 j` |
| [`packages/guides/src/components/MigrationCallout.astro`](packages/guides/src/components/MigrationCallout.astro) | Bloc « migrer depuis X » avec étapes + offer support |
| [`packages/guides/src/pages/comparatifs/index.astro`](packages/guides/src/pages/comparatifs/index.astro) | Hub `/comparatifs` listant les 5 pages |
| [`packages/guides/src/content/competitors/coohom.mdx`](packages/guides/src/content/competitors/coohom.mdx) | **Article exemplaire** (structure complète, faits TODO_LAURENT) |
| [`packages/guides/src/content/competitors/{planner-5d,homestyler,ikea-home-planner,sketchup}.mdx`](packages/guides/src/content/competitors/) | 4 stubs renderable, à compléter |
| [`scripts/check-competitor-facts.mjs`](scripts/check-competitor-facts.mjs) | Validation périodique des sources |

---

## Workflow de publication d'une page comparative

### Étape 1 — Renseigner les faits (1-2 h par concurrent)

Ouvre `packages/guides/src/data/competitor-facts.json` → section du concurrent.

Pour CHAQUE entrée :

1. Ouvre l'URL `source` dans un navigateur INCOGNITO (pas de tracking)
2. Vérifie que le critère est documenté sur cette page
3. Écris le `claim` au format **« ✅/⚠️/❌ Description ≤ 80 caractères »**
   - ✅ = la fonction existe et est complète
   - ⚠️ = présente mais limitée / payante
   - ❌ = absente
4. Passe `verified: true`
5. Mets `verifiedAt: "YYYY-MM-DD"` (date du jour)

**Si tu ne trouves pas l'info publique :** garde `verified: false` ET note dans le claim *« Non vérifiable publiquement — claim retiré du tableau. »*. Le composant n'affichera rien — c'est intentionnel, mieux vaut un trou qu'une affirmation infondée.

### Étape 2 — Lancer la vérification automatique

```bash
node scripts/check-competitor-facts.mjs --competitor coohom
```

Le script :
- Pingue chaque URL `source`
- Vérifie qu'un mot-clé du critère apparaît toujours dans le HTML
- Alerte si un fait `verified: true` a un claim `TODO_*` (incohérence)
- Affiche `verifiedAt` > 90 j (à re-vérifier)

Tu dois avoir **0 ❌**. Les ⚠ peuvent être tolérés (ex. site qui bloque les bots) — vérification manuelle.

### Étape 3 — Compléter le MDX

Dans `packages/guides/src/content/competitors/<slug>.mdx` :

1. **Frontmatter** : remplir les 3 `reasonsToChooseCompetitor` (très important — c'est ce qui te défend juridiquement contre l'accusation de dénigrement)
2. **Frontmatter** : remplir les 5 `reasonsToChooseUs`
3. **Body** : remplacer tous les `TODO_LAURENT` (« choisir X si » + tarifs + FAQ)
4. **`verdictDate: <date du jour>`**
5. Vérifier que la `<MigrationCallout limitations={[...]}>` liste les vraies limitations connues

### Étape 4 — Validation avocat (recommandé pour Coohom + SketchUp)

Pour les concurrents avec ressources juridiques importantes (Coohom = Manycore Technology, SketchUp = Trimble, IKEA = Inter IKEA Systems), envoyer le MDX rendu HTML à ton avocat avant publication. Coût indicatif : 200-400 € de relecture par page.

Pour Planner 5D (Lituanie) et Homestyler (Easyhome), le risque est moindre mais la prudence reste de mise.

### Étape 5 — Publier

```yaml
draft: false
```

Commit + PR + merge. La page apparaît au prochain déploiement Astro.

---

## Conformité L122-1 — checklist avocat

À cocher avec ton avocat avant de basculer chaque page en `draft: false` :

- [ ] **L122-1 1°** — Le comparatif porte sur des biens/services répondant aux mêmes besoins (logiciels de conception cuisine 3D)
- [ ] **L122-1 2°** — Compare objectivement des caractéristiques essentielles, pertinentes, vérifiables et représentatives (≥ 20 critères factuels)
- [ ] **L122-1 3°** — N'engendre pas de confusion entre annonceur et concurrent (logos non utilisés, marques nominatives uniquement)
- [ ] **L122-1 4°** — N'entraîne pas le discrédit ou le dénigrement des marques concurrentes (`reasonsToChooseCompetitor` est rempli avec 3 raisons honnêtes)
- [ ] **L122-1 5°** — Pour les produits ayant une appellation d'origine — N/A pour du SaaS
- [ ] **L122-1 6°** — Ne tire pas profit indu de la notoriété du concurrent (titre = « KitchenXpert vs X » et non « X est nul, choisissez nous »)

---

## Cron mensuel — re-vérification automatique

Ajouter dans `.github/workflows/check-competitor-facts.yml` :

```yaml
name: Competitor facts re-verification
on:
  schedule:
    - cron: '0 7 1 * *'   # 1er du mois à 7h UTC
  workflow_dispatch:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: node scripts/check-competitor-facts.mjs --strict
      - name: Open issue on stale facts
        if: failure()
        uses: peter-evans/create-issue-from-file@v5
        with:
          title: '⚠️ Faits comparatifs concurrents à re-vérifier'
          content-filepath: ./facts-report.md
          labels: legal, content
```

Quand le cron échoue → une issue GitHub est ouverte avec la liste des faits à re-vérifier. **Tu as 7 jours pour traiter** (sinon le `LegalDisclaimer` affichera l'avertissement « ⚠️ Données > 90 jours » sur la page concernée).

---

## SEO — mots-clés cibles par page

| Page | Mots-clés primaires (volume FR estimé) |
|---|---|
| `/comparatifs/vs-coohom` | « coohom alternative », « coohom français », « coohom rgpd » |
| `/comparatifs/vs-planner-5d` | « planner 5d alternative », « planner 5d français » |
| `/comparatifs/vs-homestyler` | « homestyler alternative », « easyhome alternative » |
| `/comparatifs/vs-ikea-home-planner` | « alternative ikea home planner », « ikea métod planner alternative » |
| `/comparatifs/vs-sketchup` | « sketchup cuisine alternative », « extension sketchup cuisine » |

Le hub `/comparatifs` capte « logiciel cuisine comparatif », « meilleur logiciel cuisine 2026 ».

---

## Mesure (Plausible)

Tracker la conversion sandbox depuis pages comparatives :

- L'attribut `data-plausible-event-source` du `CTABlock` capture déjà le slug
- Filtrer dans Plausible : `event_name = guides_cta_click` + `props.source = coohom` (par exemple)
- Comparer le **CTR vers sandbox** par concurrent → tu sauras lequel convertit le mieux

Hypothèse à valider sur 60 jours de données : **les pages comparatives convertissent 2× mieux que les guides éditoriaux génériques**.

---

## A/B test (optionnel)

Le hook `useABVariant` (cf mission Hero Video) peut servir à tester
deux tons d'introduction :
- Variante A — frontale (« Pourquoi nous battons X »)
- Variante B — subtile (« Voici comment KitchenXpert et X diffèrent »)

Recommandé seulement quand tu as ≥ 1 000 visites/mois sur la page concernée — en dessous, le bruit statistique est plus fort que le signal.

---

## Checklist Laurent

### Avant publication de CHAQUE page

- [ ] `competitor-facts.json` rempli pour ce concurrent (≥ 20 facts `verified: true`)
- [ ] `node scripts/check-competitor-facts.mjs --competitor <slug>` → 0 ❌
- [ ] MDX : `reasonsToChooseCompetitor` (3 raisons) ET `reasonsToChooseUs` (5 raisons) écrits
- [ ] MDX : tous les `TODO_LAURENT` remplacés ou retirés
- [ ] MDX : `verdictDate: <date du jour>`
- [ ] MDX : `draft: false`
- [ ] **Avocat** a relu (Coohom + SketchUp + IKEA en priorité)

### Mensuel

- [ ] CI cron a tourné le 1er du mois
- [ ] Aucune issue ouverte « Faits comparatifs à re-vérifier »
- [ ] Aucune page n'affiche le badge ⚠️ « Données > 90 jours » au footer

### Quand tu reçois un courrier d'avocat de concurrent

1. **Ne supprime PAS la page immédiatement** — laisse la trace, sinon ça peut être interprété comme aveu
2. Réponds dans les 48h avec le rapport `check-competitor-facts.mjs --strict` qui prouve la vérification systématique
3. Engage ton propre avocat pour la réponse formelle
4. Si une affirmation est inexacte, **rectifie publiquement** dans la même page (mention « rectificatif du JJ/MM/AAAA ») — c'est mieux que de retirer
