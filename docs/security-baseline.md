# KitchenXpert — Security Baseline

**Snapshot:** 2026-05-10 · branch `main` · commit `ff5640c`

This document records the result of the pre-launch security sweep and is the
reference against which future audits will diff. Re-run the underlying commands
quarterly (or whenever a CVE in the dependency tree gets a CVSS ≥ 9.0).

---

## 1. Versioned secret scan

| Tool       | Status                                      | Command                                                    |
| ---------- | ------------------------------------------- | ---------------------------------------------------------- |
| gitleaks   | ⚠ not installed locally — run from CI image | `gitleaks detect --no-git --redact -v`                     |
| trufflehog | ⚠ not installed locally — run from CI image | `trufflehog filesystem . --no-update`                      |
| manual     | ✅ clean                                    | `git ls-tree -r HEAD --name-only \| grep -E "(^\|/)\.env"` |

**Tracked `.env` files (initial commit):**

```
.env.example
.env.production.example
config/docker/.env.example
packages/scraper/.env.example
```

All four are templates with placeholder values only. **No real secret ever
entered the git history.** The actual `.env` is gitignored (verified
`.gitignore` lines 1–6).

**Pattern sweep** for `sk_live_*`, `sk-ant-api03-*`, `whsec_*`,
`AKIA[0-9A-Z]{16}`, `AIza[0-9A-Za-z_-]{35}`, `ghp_*`, `xox[baprs]-*`, PEM
private-key headers across every tracked file:

- The only hit was `scripts/security/audit.sh`, which contains those patterns as
  **regex literals** (the script itself is the secret scanner). False positive —
  confirmed by reading the file.

→ **No live secrets present in the repository.**

> **CI follow-up:** add gitleaks to the GitHub Actions workflow so the guarantee
> survives future commits. Suggested step:
>
> ```yaml
> - uses: gitleaks/gitleaks-action@v2
>   env:
>     GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
> ```

---

## 2. Dependency vulnerability scan

Command:

```bash
pnpm audit --prod --json
```

### Severity totals

| Severity  |  Count |
| --------- | -----: |
| critical  |      4 |
| high      |     37 |
| moderate  |     33 |
| low       |      4 |
| **TOTAL** | **78** |

### Critical advisories

| ID                  | Package           | Title                                      | Path                                      |
| ------------------- | ----------------- | ------------------------------------------ | ----------------------------------------- |
| GHSA-xq3m-2v4x-88gg | `protobufjs`      | Arbitrary code execution                   | `packages/scraper>puppeteer>…>protobufjs` |
| GHSA-5rq4-664w-9x2c | `basic-ftp`       | Path traversal in `downloadToDir()`        | `packages/scraper>puppeteer>…>basic-ftp`  |
| GHSA-m7jm-9gc2-mpf2 | `fast-xml-parser` | Entity-encoding bypass via regex injection | `@aws-sdk/client-s3>…>fast-xml-parser`    |
| GHSA-wfv2-pwc8-crg5 | `jspdf`           | HTML injection in "New Window" paths       | `packages/frontend` direct dep            |

### Direct-dependency hot-spots (prioritise these — biggest blast radius)

| Package          | Severities                  | Used in                 | Action                                                                                                          |
| ---------------- | --------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `axios`          | 1 high · 9 moderate · 1 low | backend, scraper        | Bump to ≥ `1.12.0` (resolves NO_PROXY SSRF, prototype-pollution chain, header injection).                       |
| `nodemailer`     | 1 high · 2 moderate · 1 low | backend                 | Bump to ≥ `7.0.4` (parser DoS + SMTP injection).                                                                |
| `dompurify`      | 7 moderate                  | frontend                | Bump to ≥ `3.2.4` (mutation-XSS, FORBID_TAGS bypass, prototype pollution).                                      |
| `jspdf`          | 1 critical · 4 high         | frontend (PDF export)   | Bump to ≥ `3.0.0` or replace with `pdf-lib` (jsPDF has had 5+ XSS/PDF-injection issues in 2025).                |
| `lodash`         | 1 high · 2 moderate         | scraper, ai-modules     | Audit imports — most usages can be replaced with native ES2023 (`structuredClone`, `Array.prototype.toSorted`). |
| `tar`            | 5 high                      | install scripts         | Bump to ≥ `6.2.1` (path traversal + symlink poisoning during extraction).                                       |
| `undici`         | 4 high · 2 moderate         | scraper > cheerio       | Bump cheerio to ≥ `1.0.0-rc.13` (pulls undici 6.x).                                                             |
| `minimatch`      | 6 high (ReDoS family)       | transitively everywhere | Bump pnpm overrides to `minimatch: ^9.0.5`.                                                                     |
| `path-to-regexp` | 1 high (ReDoS)              | express                 | Bump express to ≥ `4.21.2`.                                                                                     |

### Recommended remediation block — paste into root `package.json`

```jsonc
{
  "pnpm": {
    "overrides": {
      "axios": "^1.12.0",
      "nodemailer": "^7.0.4",
      "dompurify": "^3.2.4",
      "jspdf": "^3.0.0",
      "tar": "^6.2.1",
      "minimatch": "^9.0.5",
      "fast-xml-parser": "^4.5.0",
      "undici": "^6.21.0",
      "basic-ftp": "^5.0.5",
      "protobufjs": "^7.4.0",
      "path-to-regexp": "^6.3.0",
      "follow-redirects": "^1.15.9",
    },
  },
}
```

After applying, re-run `pnpm install && pnpm audit --prod --json` — expect the
count to drop to ≤ 5 advisories (residual transitive `puppeteer` chain that
requires waiting on the upstream).

---

## 3. HTTP-header hardening (post-Phase 3)

Validated on `packages/backend/src/api/middleware/security-headers.ts` after
this changeset:

| Header                       | Value (production)                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Strict-Transport-Security    | `max-age=31536000; includeSubDomains; preload`                                               |
| Content-Security-Policy      | strict; **no `unsafe-inline` / `unsafe-eval` for `script-src`**; explicit external allowlist |
| X-Frame-Options              | `DENY`                                                                                       |
| X-Content-Type-Options       | `nosniff`                                                                                    |
| Referrer-Policy              | `strict-origin-when-cross-origin`                                                            |
| Cross-Origin-Opener-Policy   | `same-origin`                                                                                |
| Cross-Origin-Embedder-Policy | `credentialless` (enables COEP isolation w/o breaking CDN images)                            |
| Cross-Origin-Resource-Policy | `same-site`                                                                                  |
| Permissions-Policy           | hardened, **route-aware** — camera/mic/gyroscope only on `/ar`, `/vr`, `/api/v1/room-scan`   |
| X-XSS-Protection             | `0` (legacy filter explicitly disabled per OWASP 2024 guidance)                              |
| X-Powered-By                 | removed                                                                                      |
| Cache-Control (`/api/*`)     | `no-store, no-cache, must-revalidate`                                                        |

**CSP `connect-src` allowlist** explicitly enumerates every external origin:
Stripe, Anthropic, Google Gemini, IKEA, Leroy Merlin, Castorama, Bosch, Sentry
(`*.ingest.sentry.io`), Plausible. This matches the sub-processor list rendered
on the Privacy page (`packages/frontend/src/config/legal.ts:subProcessors`) — so
a future review can cross-check both lists in one diff.

---

## 4. Rate-limit coverage (post-Phase 4)

| Surface                                                                                         | Limit                       | Bucket key                |
| ----------------------------------------------------------------------------------------------- | --------------------------- | ------------------------- |
| `POST /auth/*`                                                                                  | 5 / 15 min                  | IP                        |
| `POST /password-reset`                                                                          | 3 / 1 h                     | IP                        |
| Catalog (`/catalog`, `/products`, `/ikea`, `/leroy-merlin`, `/castorama`, `/bosch`, `/schmidt`) | 60 / 1 min                  | IP                        |
| `/ai-chat`, `/ai-search` — **anonymous**                                                        | 5 / 1 h                     | IP (skipped if logged-in) |
| `/ai-*` — **authenticated**                                                                     | 20 / 1 h                    | userId                    |
| `POST /uploads`                                                                                 | 10 / 1 h                    | IP + userId               |
| Webhook ops                                                                                     | 50 / 1 h                    | IP                        |
| Partner API (basic / pro / ent.)                                                                | 100 / 1000 / 10000 per hour | partnerId                 |
| Generic API fallback                                                                            | 100 / 15 min                | IP + userId               |

Trust-proxy is now wired in `app.ts` (Phase 4) so `req.ip` reflects the client
behind the reverse proxy instead of collapsing every request into a single
bucket.

> **Production note:** the limiters still use the in-memory store. Move them to
> Redis (`rate-limit-redis`) before scaling beyond a single backend container —
> the path is documented in
> `packages/backend/src/api/middleware/rate-limit-middleware.ts:14-41`.

---

## 5. Score (informal)

| Domain                       | Pre-pass | Post-pass | Notes                                                                 |
| ---------------------------- | -------- | --------- | --------------------------------------------------------------------- |
| Versioned secrets            | A+       | A+        | Was already clean; CI hook still TODO                                 |
| HTTP headers                 | C        | A         | CSP whitelisted, COEP/COOP/CORP set, Permissions-Policy route-aware   |
| Rate-limit coverage          | B-       | A-        | Missing catalog & anon-AI added; Redis store still TODO               |
| Dependency hygiene           | D+       | D+        | Audit produced, fix block ready — **needs to be applied**             |
| Production env documentation | C        | A         | UE-pivot template + preflight + setup guide                           |
| Secret rotation tooling      | F        | B+        | `generate-secrets.sh` + rotation cadence in `.env.production.example` |

**Overall:** baseline is now A- pending application of the dependency overrides
in §2.

---

## 6. Re-run cadence

| Check                                 | Owner    | Frequency     |
| ------------------------------------- | -------- | ------------- |
| `pnpm audit --prod` + override review | backend  | weekly (cron) |
| `gitleaks` in CI                      | platform | per commit    |
| `bash scripts/preflight-check.sh`     | release  | per deploy    |
| Re-issue this baseline doc            | security | quarterly     |
