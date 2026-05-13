#!/usr/bin/env node
/**
 * extract-hardcoded-strings.mjs — scan TSX files for French text that's
 * NOT wrapped in `t(...)`.
 *
 * Heuristic (intentionally conservative — false positives < false negatives):
 *   - JSX text nodes containing ≥ 1 word + at least one French accent
 *     OR 2+ words separated by spaces (gros piège : du texte technique
 *     anglais matche aussi mais on filtre `lang="en"` côté revue manuelle)
 *   - String literals passed to common rendering APIs (alert, toast,
 *     throw new Error, console.warn) when the literal contains FR markers
 *
 * Output: rapport markdown sous docs/i18n-extraction-report.md, groupé
 * par fichier + classement par fréquence pour prioriser.
 *
 *   node scripts/extract-hardcoded-strings.mjs                  # tous les .tsx
 *   node scripts/extract-hardcoded-strings.mjs --path src/pages # un sous-dossier
 *   node scripts/extract-hardcoded-strings.mjs --threshold 5    # n'afficher que fichiers > 5 hits
 */

import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'packages', 'frontend', 'src');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const SCAN_ROOT = typeof args.path === 'string' ? path.join(ROOT, args.path) : SRC;
const THRESHOLD = Number(args.threshold || 0);

// French accent set — anything containing one of these letters is
// almost certainly French content.
const FR_ACCENTS = /[éèêëàâäîïôöùûüçÉÈÊËÀÂÄÎÏÔÖÙÛÜÇœŒæÆ]/;
// Common French function words — boost confidence when present.
const FR_KEYWORDS = /\b(le|la|les|une|des|du|de|votre|notre|vous|nous|avec|sans|pour|sur|dans|chez|ainsi|donc|car|mais)\b/i;

const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', '.cache', '__tests__',
  '__screenshots__', 'e2e', 'e2e-critical', 'public', 'assets',
  'i18n', // already i18n source code
]);

const IGNORE_FILES = new Set([
  'main.tsx', 'vite-env.d.ts',
]);

const TARGET_EXT = new Set(['.tsx', '.jsx']);

// ---------------------------------------------------------------------------
// Walk the source tree
// ---------------------------------------------------------------------------

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch { return; }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (IGNORE_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(p);
    } else if (entry.isFile() && TARGET_EXT.has(path.extname(entry.name)) && !IGNORE_FILES.has(entry.name)) {
      yield p;
    }
  }
}

// ---------------------------------------------------------------------------
// Per-file scanner
// ---------------------------------------------------------------------------

function isHardcodedCandidate(text) {
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;
  if (/^\d+$/.test(trimmed)) return false;
  if (/^[a-zA-Z0-9_.-]+$/.test(trimmed)) return false; // ids, paths
  if (/^https?:\/\//.test(trimmed)) return false;
  if (/^\$\{.*\}$/.test(trimmed)) return false; // pure interpolation
  // Must look French OR be ≥ 3 words (longer English UI strings still need i18n).
  if (FR_ACCENTS.test(trimmed)) return true;
  if (FR_KEYWORDS.test(trimmed)) return true;
  const words = trimmed.split(/\s+/).filter((w) => /[a-zA-ZÀ-ÿ]/.test(w));
  if (words.length >= 3 && trimmed.length >= 15) return true;
  return false;
}

function classify(filePath) {
  if (filePath.includes('/pages/Auth/'))    return 'auth';
  if (filePath.includes('/pages/Legal/'))   return 'legal';
  if (filePath.includes('/pages/Catalog/')) return 'catalog';
  if (filePath.includes('/designer/'))      return 'designer';
  if (filePath.includes('/components/Hero/')) return 'hero';
  if (filePath.includes('/components/Trust/')) return 'trust';
  if (filePath.includes('/components/Reviews/')) return 'reviews';
  if (filePath.includes('/components/sandbox/')) return 'sandbox';
  if (filePath.includes('/components/seo/'))     return 'seo';
  if (filePath.includes('/components/ui/'))      return 'ui';
  if (filePath.includes('/components/common/'))  return 'common';
  if (filePath.includes('/pages/'))         return 'pages';
  if (filePath.includes('/components/'))    return 'components';
  return 'other';
}

async function scanFile(filePath) {
  const src = await readFile(filePath, 'utf8');
  const hits = [];

  // Regex 1: JSX text nodes — `>Text content<`
  const jsxText = /(?<=>)([^<>{]+?)(?=<)/g;
  let m;
  while ((m = jsxText.exec(src)) !== null) {
    const text = m[1];
    if (isHardcodedCandidate(text)) {
      // Compute line number
      const line = src.slice(0, m.index).split('\n').length;
      hits.push({ line, kind: 'jsx', text: text.trim().slice(0, 120) });
    }
  }

  // Regex 2: string literals passed to recognisable APIs
  const apiPatterns = [
    /(?:throw\s+new\s+Error|toast\.[a-z]+|alert|console\.(?:warn|error|log)|setError|setMessage)\s*\(\s*(['"`])([^'"`\n]+)\1/g,
    /(?:title|description|label|placeholder|aria-label|alt)=\s*(['"])([^'"\n]+)\1/g,
  ];
  for (const re of apiPatterns) {
    while ((m = re.exec(src)) !== null) {
      const text = m[2];
      if (isHardcodedCandidate(text)) {
        const line = src.slice(0, m.index).split('\n').length;
        hits.push({ line, kind: 'attr', text: text.slice(0, 120) });
      }
    }
  }

  return hits;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log(`→ Scanning ${SCAN_ROOT}`);

const perFile = [];
let totalHits = 0;

for await (const file of walk(SCAN_ROOT)) {
  const hits = await scanFile(file);
  if (hits.length === 0) continue;
  totalHits += hits.length;
  perFile.push({ file: path.relative(ROOT, file), hits, category: classify(file) });
}

perFile.sort((a, b) => b.hits.length - a.hits.length);

const filtered = perFile.filter((f) => f.hits.length >= THRESHOLD);

// Group by category
const byCategory = {};
for (const f of filtered) {
  (byCategory[f.category] ||= []).push(f);
}

// Markdown report
let md = '# Hardcoded strings — extraction report\n\n';
md += `_Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/extract-hardcoded-strings.mjs\`_\n\n`;
md += `**Total hits** : ${totalHits}\n\n`;
md += `**Files affected** : ${perFile.length}\n\n`;

const catOrder = Object.keys(byCategory).sort((a, b) => byCategory[b].length - byCategory[a].length);
md += '## Par catégorie\n\n';
md += '| Catégorie | Fichiers | Hits |\n|---|---:|---:|\n';
for (const cat of catOrder) {
  const files = byCategory[cat];
  const hits = files.reduce((s, f) => s + f.hits.length, 0);
  md += `| ${cat} | ${files.length} | ${hits} |\n`;
}
md += '\n## Top 20 fichiers\n\n';
md += '| Fichier | Catégorie | Hits |\n|---|---|---:|\n';
for (const f of filtered.slice(0, 20)) {
  md += `| \`${f.file}\` | ${f.category} | ${f.hits.length} |\n`;
}

md += '\n## Détail complet\n\n';
for (const cat of catOrder) {
  md += `### ${cat}\n\n`;
  for (const f of byCategory[cat]) {
    md += `#### \`${f.file}\` (${f.hits.length} hits)\n\n`;
    for (const h of f.hits.slice(0, 15)) {
      md += `- L${h.line} _(${h.kind})_ — ${'`' + h.text.replace(/`/g, '\\`') + '`'}\n`;
    }
    if (f.hits.length > 15) md += `- … et ${f.hits.length - 15} autre(s)\n`;
    md += '\n';
  }
}

const outFile = path.join(ROOT, 'docs', 'i18n-extraction-report.md');
await writeFile(outFile, md, 'utf8');

console.log(`✓ ${totalHits} hits across ${perFile.length} files`);
console.log(`✓ Report → ${path.relative(ROOT, outFile)}`);
