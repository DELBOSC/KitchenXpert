/**
 * ProductCanonicalizer (CLAUDE.md §15.8.4 P5).
 *
 * One-shot canonicalization of the catalogue:
 *   - Castorama (sku LIKE 'CASTORAMA-%') : cluster by gamme signature, designate
 *     canonicals (isCanonical=true, parentSku=null) + link variants
 *     (isCanonical=false, parentSku=<canonical>).
 *   - EPREL appliances (sourceLevel=1)   : naturally canonical (1 SKU / model)
 *     -> isCanonical=true, parentSku=null en masse.
 *   - Everything else stays isCanonical=false (untouched, reported out-of-scope).
 *
 * DRY-RUN by default: computes, verifies the graph, prints the report, writes
 * NOTHING. Pass --apply to write inside a single prisma.$transaction. Re-running
 * is safe (first run is virgin terrain: 0 canonical / 0 parentSku today).
 *
 *   pnpm tsx packages/backend/src/scripts/canonicalize.ts            (dry-run)
 *   pnpm tsx packages/backend/src/scripts/canonicalize.ts --apply    (write)
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { config } from 'dotenv';

import { clusterAndSelect, type CanonicalRow } from '../services/canonical/canonical-signature';

// Load .env before any PrismaClient is instantiated (new PrismaClient() reads env).
config();

const APPLY = process.argv.includes('--apply');
const POC_CANON = 6081;
const POC_VAR = 1416;

const prisma = new PrismaClient();

interface RawRow {
  sku: string;
  name: string;
  brand: string | null;
  realbrand: string | null;
  color: string | null;
  pt: string | null;
  width: Prisma.Decimal | null;
  height: Prisma.Decimal | null;
  depth: Prisma.Decimal | null;
  price: Prisma.Decimal | null;
}

const numOrNull = (v: Prisma.Decimal | null): number | null => (v == null ? null : Number(v));

async function main(): Promise<void> {
  console.log(`=== P5 ProductCanonicalizer (${APPLY ? 'APPLY' : 'DRY-RUN'}) ===\n`);

  // ---- Phase 1: load + cluster Castorama ----
  const raw = await prisma.$queryRaw<RawRow[]>`
    SELECT pr.sku, pr.name, pr.brand,
           pr.specifications->>'brand'       AS realbrand,
           pr.specifications->>'color'       AS color,
           pr.specifications->>'productType' AS pt,
           pr.width, pr.height, pr.depth, pr.price
      FROM "Product" pr
     WHERE pr."isActive" = true AND pr.sku LIKE 'CASTORAMA-%'`;

  const rows: CanonicalRow[] = raw.map((r) => ({
    sku: r.sku,
    name: r.name,
    brand: r.brand,
    realBrand: r.realbrand,
    specColor: r.color,
    productType: r.pt,
    width: numOrNull(r.width),
    height: numOrNull(r.height),
    depth: numOrNull(r.depth),
    price: numOrNull(r.price),
  }));

  const total = rows.length;
  const withPrice = rows.filter((r) => (r.price ?? 0) > 0).length;
  const usePriceTiers = total > 0 && withPrice / total > 0.8;
  const { canonicals, variants, excludedShortGamme, clusters, priceTierStats } = clusterAndSelect(rows, usePriceTiers);

  console.log(`[Phase 1] Castorama actifs: ${total} (prix>0: ${withPrice}, tiers prix ${usePriceTiers ? 'ON' : 'OFF'})`);
  console.log(`  clusters: ${clusters} | canonicals: ${canonicals.length} | variants: ${variants.length} | gamme<3 exclus: ${excludedShortGamme}`);
  console.log(`  tiers prix canoniques: ${JSON.stringify(priceTierStats)}`);

  // EPREL appliances (sourceLevel=1) = naturally canonical (1 / model).
  const eprel = await prisma.$queryRaw<Array<{ sku: string }>>`
    SELECT sku FROM "Product" WHERE "isActive" = true AND "sourceLevel" = 1`;
  console.log(`  EPREL (sourceLevel=1) a flagger canonical: ${eprel.length}`);

  // ---- Phase 2: graph verification ----
  console.log(`\n[Phase 2] Verification graphe`);
  const canonSet = new Set(canonicals.map((c) => c.sku));
  const varSet = new Set(variants.map((v) => v.sku));
  const issues: string[] = [];

  const conservationOk = canonicals.length + variants.length === total - excludedShortGamme;
  if (!conservationOk) {
    issues.push(`conservation: ${canonicals.length}+${variants.length} != ${total - excludedShortGamme}`);
  }
  const overlap = [...varSet].filter((s) => canonSet.has(s));
  if (overlap.length) {issues.push(`${overlap.length} sku a la fois canonical ET variant (ex: ${overlap.slice(0, 3).join(', ')})`);}
  const orphans = variants.filter((v) => !canonSet.has(v.parentSku));
  if (orphans.length) {issues.push(`${orphans.length} variants orphelins (parentSku non-canonical)`);}
  const selfloop = variants.filter((v) => v.sku === v.parentSku);
  if (selfloop.length) {issues.push(`${selfloop.length} self-loop (sku == parentSku)`);}
  if (canonSet.size !== canonicals.length) {issues.push(`canonicals sku dupliques: ${canonicals.length - canonSet.size}`);}
  if (varSet.size !== variants.length) {issues.push(`variants sku dupliques: ${variants.length - varSet.size}`);}

  console.log(`  conservation ${canonicals.length}+${variants.length}=${canonicals.length + variants.length} (attendu ${total - excludedShortGamme}) : ${conservationOk ? 'OK' : 'KO'}`);
  console.log(`  variants->canonical: ${orphans.length === 0 ? 'OK (0 orphelin)' : `KO (${orphans.length})`} | overlap canonical/variant: ${overlap.length} | self-loop: ${selfloop.length}`);
  console.log(`  depth-1 (canonicals ont parentSku=null par construction) : OK`);
  console.log(issues.length ? `  >> ISSUES: ${issues.join(' ; ')}` : `  >> graphe coherent (0 issue)`);

  // ---- Oracle vs POC ----
  const dCanon = canonicals.length - POC_CANON;
  const dVar = variants.length - POC_VAR;
  console.log(`\n[Oracle vs POC] canon ${canonicals.length} (${dCanon >= 0 ? '+' : ''}${dCanon} vs ${POC_CANON}) | var ${variants.length} (${dVar >= 0 ? '+' : ''}${dVar} vs ${POC_VAR}) -> ${dCanon === 0 && dVar === 0 ? 'MATCH EXACT' : 'ECART (a expliquer)'}`);

  // ---- Phase 3: write (ONLY --apply) ----
  const byParent = new Map<string, string[]>();
  for (const v of variants) {
    const a = byParent.get(v.parentSku) ?? [];
    a.push(v.sku);
    byParent.set(v.parentSku, a);
  }

  console.log(`\n[Phase 3] ${APPLY ? 'ECRITURE (prisma.$transaction)' : 'DRY-RUN — RIEN ecrit'}`);
  console.log(`  WOULD WRITE:`);
  console.log(`    Castorama canonicals -> isCanonical=true, parentSku=null : ${canonicals.length}`);
  console.log(`    Castorama variants   -> isCanonical=false, parentSku set : ${variants.length} (${byParent.size} groupes parent)`);
  console.log(`    EPREL appliances     -> isCanonical=true, parentSku=null : ${eprel.length}`);
  console.log(`    TOTAL lignes touchees : ${canonicals.length + variants.length + eprel.length}`);

  if (APPLY) {
    if (issues.length) {
      console.error(`  REFUS: graphe incoherent (${issues.length} issue) -> ecriture annulee.`);
      await prisma.$disconnect();
      process.exit(1);
    }
    await prisma.$transaction(
      async (tx) => {
        // 1. Castorama canonicals.
        if (canonicals.length) {
          await tx.product.updateMany({
            where: { sku: { in: canonicals.map((c) => c.sku) } },
            data: { isCanonical: true, parentSku: null },
          });
        }
        // 2. Castorama variants, grouped by parent for batched updates.
        for (const [parent, skus] of byParent) {
          await tx.product.updateMany({
            where: { sku: { in: skus } },
            data: { isCanonical: false, parentSku: parent },
          });
        }
        // 3. EPREL appliances (mass flip).
        await tx.product.updateMany({
          where: { isActive: true, sourceLevel: 1 },
          data: { isCanonical: true, parentSku: null },
        });
      },
      { timeout: 120_000, maxWait: 10_000 },
    );
    console.log(`  >> ECRIT.`);
  }

  // ---- Phase 4: post-state (read-only, proves dry-run wrote nothing) ----
  const post = await prisma.$queryRaw<Array<{ canon: number; withparent: number }>>`
    SELECT COUNT(*) FILTER (WHERE "isCanonical")::int       AS canon,
           COUNT(*) FILTER (WHERE "parentSku" IS NOT NULL)::int AS withparent
      FROM "Product"`;
  console.log(`\n[Phase 4] Etat DB: isCanonical(true)=${post[0]?.canon ?? '?'} | parentSku non-null=${post[0]?.withparent ?? '?'}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error('FATAL:', e instanceof Error ? e.message : String(e));
    await prisma.$disconnect();
    process.exit(1);
  });
