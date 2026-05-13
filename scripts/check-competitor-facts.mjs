#!/usr/bin/env node
/**
 * check-competitor-facts.mjs — vérifie chaque source citée dans
 * `packages/guides/src/data/competitor-facts.json`.
 *
 * Usage :
 *   node scripts/check-competitor-facts.mjs                       # tous les concurrents
 *   node scripts/check-competitor-facts.mjs --competitor coohom   # un seul
 *   node scripts/check-competitor-facts.mjs --strict              # exit 1 si TODO résiduels
 *
 * Vérifications (par fait) :
 *   1. URL `source` répond 2xx ou 3xx.
 *   2. Le HTML retourné contient toujours le mot-clé du critère
 *      (heuristique simple — détecte les pages totalement refondues).
 *   3. Si `verifiedAt` > 90 jours → warning "stale".
 *   4. Si `claim` commence par `TODO_LAURENT` ET `verified === true` →
 *      ERREUR (incohérence : marqué vérifié mais texte non écrit).
 *
 * Output :
 *   ✅ ok  ⚠ warn  ❌ fail
 *
 * À mettre dans un cron mensuel (GitHub Action `cron: '0 7 1 * *'`)
 * + en pre-commit hook quand un fichier vs-*.mdx est modifié.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FACTS_FILE = path.join(ROOT, 'packages', 'guides', 'src', 'data', 'competitor-facts.json');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const STRICT = Boolean(args.strict);
const TARGET = typeof args.competitor === 'string' ? args.competitor : null;
const STALE_DAYS = 90;

let pass = 0, warn = 0, fail = 0;

const ok   = (msg) => { console.log(`✅  ${msg}`);            pass++; };
const wrn  = (msg) => { console.log(`⚠   ${msg}`);            warn++; };
const err  = (msg) => { console.log(`❌  ${msg}`);            fail++; };
const note = (msg) => { console.log(`    ${msg}`); };

async function pingUrl(url) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      // GET (not HEAD) because some sites return 405 on HEAD or block bots
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KitchenXpert-FactBot/1.0; +https://kitchenxpert.com)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, status: res.status, body: '' };
    const body = (await res.text()).toLowerCase();
    return { ok: true, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: '', error: e instanceof Error ? e.message : String(e) };
  }
}

function isTokenInBody(token, body) {
  if (!token) return true;
  const t = token.toLowerCase().trim();
  if (t.length < 3) return true;
  return body.includes(t);
}

function ageDays(iso) {
  if (!iso) return Infinity;
  const ms = Date.now() - new Date(iso).getTime();
  return ms / (24 * 60 * 60 * 1000);
}

const json = JSON.parse(await readFile(FACTS_FILE, 'utf8'));
const competitors = TARGET ? { [TARGET]: json.competitors[TARGET] } : json.competitors;

if (TARGET && !json.competitors[TARGET]) {
  console.error(`Unknown competitor: ${TARGET}`);
  process.exit(1);
}

for (const [slug, comp] of Object.entries(competitors)) {
  console.log(`\n── ${slug} (${comp?.displayName || '?'}) ──`);

  const allFacts = Object.values(comp?.facts || {}).flat();

  if (allFacts.length === 0) {
    wrn(`${slug}: aucun fait renseigné — page non publiable`);
    continue;
  }

  for (const fact of allFacts) {
    const id = `${slug} · ${fact.criterion}`;

    // Coherence : verified === true mais claim TODO_*
    if (fact.verified && /^TODO_/i.test(fact.claim || '')) {
      err(`${id} — incohérence : marqué vérifié mais claim "TODO_LAURENT"`);
      continue;
    }

    // Mode strict : refuse les TODO résiduels
    if (STRICT && /^TODO_/i.test(fact.claim || '')) {
      err(`${id} — claim non rédigé (mode strict)`);
      continue;
    }

    // Skip ping si pas vérifié — on ne pollue pas les sites des concurrents
    if (!fact.verified) {
      note(`${id} — non vérifié (skip ping)`);
      continue;
    }

    // Stale ?
    const days = ageDays(fact.verifiedAt);
    if (days > STALE_DAYS) {
      wrn(`${id} — vérifié il y a ${Math.round(days)} jours (> ${STALE_DAYS}). Re-vérifier.`);
    }

    // Ping
    if (!fact.source) {
      err(`${id} — fact vérifié sans `source` URL`);
      continue;
    }

    const r = await pingUrl(fact.source);
    if (!r.ok) {
      err(`${id} — source unreachable (HTTP ${r.status}${r.error ? ` · ${r.error}` : ''})`);
      continue;
    }

    if (!isTokenInBody(fact.criterion.split(' ')[0], r.body)) {
      wrn(`${id} — page accessible mais le mot-clé "${fact.criterion.split(' ')[0]}" n'apparaît plus dans le HTML. Vérifier que la page n'a pas été refondue.`);
      continue;
    }

    ok(`${id}`);
  }
}

console.log(`\n── Summary ──`);
console.log(`   ${pass} ok   ${warn} warning(s)   ${fail} failure(s)`);

if (fail > 0) process.exit(1);
if (STRICT && warn > 0) process.exit(2);
process.exit(0);
