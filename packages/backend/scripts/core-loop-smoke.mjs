#!/usr/bin/env node
/**
 * Core-loop smoke — the "truth net" (#2) for the designer DATA loop.
 *
 * Runs the real chain against a running backend, reproducibly:
 *   login → create project → create kitchen → SAVE arrangement → RELOAD (round-trip)
 *   → replace semantics → generate QUOTE (BOM).
 *
 * This is what catches the silent gaps that mocked unit tests miss (e.g. the
 * KitchenItem.name-required 500 the persistence work hit live). The 3D VISUALS
 * (wall holes, sink-under-window, IBL) are WebGL and remain a browser check — this
 * covers everything else end to end.
 *
 * Usage: node core-loop-smoke.mjs [--url=http://localhost:4000] [--email=..] [--password=..]
 * Exit 0 = all steps passed, 1 = any failure (fail-loud). Cleans up its test data.
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const BASE = `${args.url || process.env.API_URL || 'http://localhost:4000'}/api/v1`;
const EMAIL = args.email || process.env.SMOKE_EMAIL || 'demo@kitchenxpert.dev';
const PASSWORD = args.password || process.env.SMOKE_PASSWORD || 'Demo2026!Kx';

let cookie = '';
let passed = 0;
const ok = (m) => {
  console.log(`  ✓ ${m}`);
  passed += 1;
};
const fail = (m) => {
  console.error(`  ✗ ${m}`);
  process.exitCode = 1;
  throw new Error(m);
};

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) {
    cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, json };
}

async function main() {
  let kitchenId;
  let projectId;
  try {
    const login = await req('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
    if (login.status !== 200) {
      fail(`login → ${login.status} (need an active dev account: ${EMAIL})`);
    }
    ok('login');

    const proj = await req('POST', '/projects', { name: 'smoke-core-loop', status: 'draft' });
    projectId = proj.json?.data?.id;
    if (proj.status !== 201 || !projectId) {
      fail(`create project → ${proj.status}`);
    }
    ok('create project');

    const kit = await req('POST', '/kitchens', {
      projectId,
      name: 'smoke-kitchen',
      layout: 'l_shaped',
      width: 4,
      length: 3,
      height: 2.5,
    });
    kitchenId = kit.json?.data?.id;
    if (kit.status !== 201 || !kitchenId) {
      fail(`create kitchen → ${kit.status} ${JSON.stringify(kit.json).slice(0, 160)}`);
    }
    ok('create kitchen');

    // SAVE the 3D arrangement (DB unit convention: cm, degrees)
    const items = [
      { type: 'base_cabinet', name: 'Caisson', model: 'SKU-1', positionX: 50, positionY: 40, positionZ: -190, rotationY: 0, width: 60, depth: 60, height: 80, price: 199 },
      { type: 'sink', name: 'Evier', positionX: 150, positionY: 40, positionZ: -190, rotationY: 90, width: 80, depth: 60, height: 80 },
    ];
    const put = await req('PUT', `/kitchens/${kitchenId}/items`, { items });
    if (put.status !== 200 || put.json?.data?.count !== 2) {
      fail(`save arrangement → ${put.status} count=${put.json?.data?.count}`);
    }
    ok('save arrangement (2 items)');

    const get = await req('GET', `/kitchens/${kitchenId}/items`);
    const rows = get.json?.data ?? [];
    if (get.status !== 200 || rows.length !== 2) {
      fail(`reload → ${get.status} len=${rows.length}`);
    }
    const cab = rows.find((r) => r.type === 'base_cabinet');
    if (!cab || Number(cab.positionX) !== 50 || Number(cab.width) !== 60) {
      fail(`round-trip fields wrong: ${JSON.stringify(cab)}`);
    }
    ok('reload arrangement (round-trip fields intact)');

    // Replace semantics: PUT 1 item must leave exactly 1 (not append)
    await req('PUT', `/kitchens/${kitchenId}/items`, { items: [items[0]] });
    const after = await req('GET', `/kitchens/${kitchenId}/items`);
    if ((after.json?.data ?? []).length !== 1) {
      fail(`replace semantics: expected 1, got ${(after.json?.data ?? []).length}`);
    }
    ok('replace semantics (PUT replaces, not appends)');

    const bom = await req('POST', '/bom/generate', { kitchenId });
    if (bom.status !== 200) {
      fail(`generate quote (BOM) → ${bom.status} ${JSON.stringify(bom.json).slice(0, 160)}`);
    }
    const data = bom.json?.data ?? bom.json ?? {};
    const hasShape =
      Array.isArray(data.items) &&
      (typeof data.subtotal === 'number' || typeof data.total === 'number' || typeof data.tax === 'number');
    if (!hasShape) {
      fail(`BOM shape unexpected: ${JSON.stringify(data).slice(0, 200)}`);
    }
    ok('generate quote (BOM computed with line items + total)');
  } finally {
    // Best-effort cleanup (never fails the smoke)
    try {
      if (kitchenId) {
        await req('DELETE', `/kitchens/${kitchenId}`);
      }
      if (projectId) {
        await req('DELETE', `/projects/${projectId}`);
      }
    } catch {
      /* ignore */
    }
  }
}

main()
  .then(() => {
    if (process.exitCode) {
      console.error(`\nCORE-LOOP SMOKE FAILED (${passed} step(s) passed before failure)`);
    } else {
      console.log(`\n✓ CORE-LOOP SMOKE PASSED (${passed}/7 steps)`);
    }
  })
  .catch(() => {
    console.error(`\nCORE-LOOP SMOKE FAILED (${passed} step(s) passed before failure)`);
    process.exit(1);
  });
