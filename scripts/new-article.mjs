#!/usr/bin/env node
/**
 * new-article.mjs — KitchenXpert guides scaffold generator.
 *
 * Modes:
 *   node scripts/new-article.mjs                       # interactive prompt
 *   node scripts/new-article.mjs --slug=cuisine-en-l   # specific slug from manifest
 *   node scripts/new-article.mjs --all                 # materialize EVERY missing entry from manifest
 *   node scripts/new-article.mjs --force --slug=...    # overwrite an existing stub
 *
 * Reads `packages/guides/src/data/article-manifest.ts` as the source of
 * truth and writes one MDX file per entry under
 * `packages/guides/src/content/<template>/<slug>.mdx`.
 *
 * Existing files are NEVER overwritten without `--force`.
 */
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GUIDES = path.join(ROOT, 'packages', 'guides');
const CONTENT = path.join(GUIDES, 'src', 'content');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

// ---------- Read the manifest --------------------------------------------------
// We can't `import()` a .ts file directly from Node 20 without a loader, so we
// parse the file as text. The manifest is a const array literal — robust enough
// to extract via regex.
async function loadManifest() {
  const file = path.join(GUIDES, 'src', 'data', 'article-manifest.ts');
  const src = await readFile(file, 'utf8');
  const start = src.indexOf('ARTICLE_MANIFEST: ArticleManifestEntry[] = [');
  if (start < 0) throw new Error('manifest array not found — did the file move?');
  const tail = src.slice(start + 'ARTICLE_MANIFEST: ArticleManifestEntry[] = ['.length);
  const end = tail.indexOf('];');
  const body = tail.slice(0, end);

  // Each entry sits on one line — extract field by field.
  const entries = [];
  const re = /\{\s*slug:\s*'([^']+)',\s*template:\s*'([^']+)',\s*title:\s*'([^']+)',\s*description:\s*'([^']+)',\s*keywords:\s*\[([^\]]+)\],\s*estWords:\s*(\d+)\s*\}/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    entries.push({
      slug: m[1],
      template: m[2],
      title: m[3].replace(/\\'/g, "'"),
      description: m[4].replace(/\\'/g, "'"),
      keywords: m[5].split(',').map((s) => s.trim().replace(/^'|'$/g, '')),
      estWords: Number(m[6]),
    });
  }
  if (entries.length === 0) throw new Error('manifest empty after parse — is the format intact?');
  return entries;
}

// ---------- Stub template ------------------------------------------------------
const TEMPLATE_EXTRA_FIELDS = {
  layouts:     'layoutType: L_SHAPED         # CHANGE_ME : L_SHAPED | U_SHAPED | GALLEY | ISLAND | PENINSULA | ONE_WALL | OPEN_PLAN | CLOSED | SMALL | LARGE\nbudgetMin: 4000              # CHANGE_ME : € fourchette basse\nbudgetMax: 12000             # CHANGE_ME : € fourchette haute',
  cuisinistes: 'brandName: \'CHANGE_ME\'\npricePerLinearMeterMin: 1500\npricePerLinearMeterMax: 3500\nproductLines: []\ncompetitors: []',
  budgets:     'budgetEuros: 5000            # CHANGE_ME : montant cible\nrecommendedLayouts: []\ntradeoffs:\n  - "À compléter — arbitrage 1"\n  - "À compléter — arbitrage 2"',
  styles:      'styleSlug: \'CHANGE_ME\'\nmaterials: ["bois clair", "blanc"]\ncolorPalette: ["#fafafa", "#d6c1a8"]\norigin: "CHANGE_ME — époque + pays"',
  comparatifs: 'contenders: ["A", "B"]       # CHANGE_ME\ncriteria:\n  - "Prix"\n  - "Qualité"\n  - "Délai"\nverdicts:\n  - profile: "Petit budget"\n    winner: "A"\n    reason: "À compléter"',
  pratiques:   'topic: process               # CHANGE_ME : mesure | normes | fiscalite | garanties | process\nactionMinutes: 30',
};

function stubFor(entry) {
  const today = new Date().toISOString().slice(0, 10);
  const extra = TEMPLATE_EXTRA_FIELDS[entry.template] ?? '';

  return `---
title: "${entry.title}"
description: "${entry.description}"
slug: "${entry.slug}"
author: redaction
publishedAt: ${today}
keywords: [${entry.keywords.map((k) => `"${k}"`).join(', ')}]
related: []           # CHANGE_ME : 3 à 5 slugs d'articles connexes
draft: true           # ⚠️ passe à false quand l'article est prêt
${extra}
---

import CTABlock from '../../components/CTABlock.astro';
import FAQ from '../../components/FAQ.tsx';

{/*
  ============================================================================
  TODO — ${entry.title}
  ----------------------------------------------------------------------------
  Cible : ${entry.estWords} mots, structurée H2/H3.
  Mots-clés : ${entry.keywords.join(', ')}.

  Plan-type recommandé pour le template "${entry.template}" :
${planFor(entry.template).map((s) => `    - ${s}`).join('\n')}

  Workflow complet : voir docs/CONTENT-WORKFLOW.md
  ============================================================================
*/}

## Introduction

Lorem — à remplacer. Présenter le sujet en 80–120 mots, terminer par
une promesse claire de ce que le lecteur va apprendre.

<CTABlock variant="inline" fromSlug="${entry.slug}" />

## Section 2 — h2

À développer.

### Sous-section — h3

À développer.

## Section 3 — h2

À développer.

## En résumé

Synthèse en 4–6 puces.

<CTABlock
  variant="final"
  fromSlug="${entry.slug}"
  headline="Concevez votre cuisine maintenant"
/>

## Questions fréquentes

<FAQ
  client:visible
  questions={[
    { q: "Question 1 ?", a: "Réponse 1." },
    { q: "Question 2 ?", a: "Réponse 2." },
    { q: "Question 3 ?", a: "Réponse 3." },
    { q: "Question 4 ?", a: "Réponse 4." },
    { q: "Question 5 ?", a: "Réponse 5." }
  ]}
/>

{/*
  Pour que la FAQPage JSON-LD soit générée, exporte aussi :
  export const faq = [{ q: "...", a: "..." }, ...];
*/}
`;
}

function planFor(template) {
  switch (template) {
    case 'layouts':
      return [
        'Intro + définition du layout',
        'Avantages / inconvénients',
        'Dimensions types (m² minimum, m linéaires)',
        '5 plans-types avec capture designer',
        'Budget moyen selon gamme',
        'CTA designer + FAQ',
      ];
    case 'cuisinistes':
      return [
        'Présentation marque + positionnement',
        'Gammes / produits',
        'Prix au mètre linéaire (3 m / 4 m / 5 m)',
        'Qualité matériaux + garantie',
        'Comparatif vs 2 concurrents directs',
        'Avis clients (synthèse honnête)',
        'CTA "Comparer dans le designer"',
      ];
    case 'budgets':
      return [
        'Ce qu\'on peut avoir à ce budget',
        'Arbitrages obligatoires',
        '3 configurations-types',
        'Erreurs à éviter à ce budget',
        'CTA simulateur + signup',
      ];
    case 'styles':
      return [
        'Codes du style (origine, époque)',
        'Matériaux + palette',
        '5 inspirations (galerie)',
        'Astuces pour ne pas tomber dans le cliché',
        'CTA "Tester ce style"',
      ];
    case 'comparatifs':
      return [
        'Critères du comparatif',
        'Tableau comparatif (composant ComparisonTable)',
        'Verdict par profil utilisateur',
        'CTA designer pour visualiser les deux',
      ];
    case 'pratiques':
      return [
        'Pourquoi c\'est important',
        'Étape par étape',
        'Outils nécessaires',
        'Erreurs courantes',
        'Téléchargeable PDF si pertinent',
      ];
    default: return [];
  }
}

// ---------- File creation ------------------------------------------------------
async function writeStub(entry, force) {
  const dir = path.join(CONTENT, entry.template);
  const file = path.join(dir, `${entry.slug}.mdx`);
  await mkdir(dir, { recursive: true });

  try {
    await access(file, FS.F_OK);
    if (!force) {
      console.log(`✓  skip   ${entry.template}/${entry.slug}.mdx (exists)`);
      return false;
    }
  } catch { /* doesn't exist */ }

  await writeFile(file, stubFor(entry), 'utf8');
  console.log(`✓ create ${entry.template}/${entry.slug}.mdx`);
  return true;
}

// ---------- CLI ----------------------------------------------------------------
async function main() {
  const manifest = await loadManifest();

  if (args.all) {
    let created = 0;
    for (const entry of manifest) {
      const did = await writeStub(entry, Boolean(args.force));
      if (did) created++;
    }
    console.log(`\n✓ Done. ${created} new file(s); ${manifest.length - created} skipped.`);
    return;
  }

  if (args.slug) {
    const entry = manifest.find((e) => e.slug === args.slug);
    if (!entry) {
      console.error(`✗ slug "${args.slug}" not in the manifest. Add it first.`);
      process.exit(1);
    }
    await writeStub(entry, Boolean(args.force));
    return;
  }

  // Interactive: pick a slug from the list
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log('\nManifest (slug · template · title) :\n');
  manifest.forEach((e, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${e.slug.padEnd(36)} ${e.template.padEnd(12)} ${e.title}`);
  });
  const ans = await rl.question('\nNuméro à créer (ou "all" pour tout) : ');
  rl.close();

  if (ans.trim() === 'all') {
    for (const entry of manifest) await writeStub(entry, Boolean(args.force));
    return;
  }

  const idx = Number(ans) - 1;
  if (Number.isNaN(idx) || !manifest[idx]) {
    console.error('Réponse invalide.');
    process.exit(1);
  }
  await writeStub(manifest[idx], Boolean(args.force));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
