# 🚀 Production Launch Checklist — KitchenXpert

> Travel checklist before publishing the project to a production environment.
> Each section is ordered by criticality. **Stop and ship only when every
> 🔴 row is checked.**

---

## 1. Infrastructure (must exist BEFORE deploy)

| Component       | Why                                                         | Recommended provider                       |
| --------------- | ----------------------------------------------------------- | ------------------------------------------ |
| **Postgres 15+** | Primary store (Prisma)                                     | AWS RDS · Scaleway DB · Neon · Supabase    |
| **Redis 7+**     | Sessions, token blacklist, rate-limit counters, BullMQ jobs | AWS ElastiCache · Upstash · Scaleway       |
| **Object storage** | User uploads (kitchen plans, image renders)              | AWS S3 · Scaleway Object · Cloudflare R2   |
| **SMTP / SendGrid** | Verification + password-reset emails                    | SendGrid · AWS SES · Mailgun · Postmark    |
| **Stripe account** | Payments + DSP2 / 3-D Secure                             | Stripe (mandatory)                         |
| **CDN + TLS**    | Frontend static + API edge                                  | Cloudflare · CloudFront · Vercel           |

---

## 2. Environment variables — full inventory

The backend uses **60 env vars**. Below grouped by criticality:

### 🔴 REQUIRED — server refuses to start without these

| Variable               | Source / how to get                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | Postgres connection string `postgresql://user:pass@host:port/db?sslmode=require`                     |
| `JWT_ACCESS_SECRET`    | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` — **min 32 chars**        |
| `JWT_REFRESH_SECRET`   | Different value, same generator                                                                       |
| `NODE_ENV=production`  | Hard-coded                                                                                           |
| `CORS_ORIGINS`         | Your frontend URL(s), comma-separated. **No wildcards**.                                             |

### 🟠 STRONGLY RECOMMENDED for production

| Variable                  | Why                                       | How to get                                                |
| ------------------------- | ----------------------------------------- | --------------------------------------------------------- |
| `REDIS_URL`               | Token blacklist, rate-limit, BullMQ       | Provision Redis, copy URL                                 |
| `DATA_ENCRYPTION_KEY`     | Encrypts secrets in DB                    | `openssl rand -base64 32`                                 |
| `MAIL_PROVIDER=sendgrid`  | Real email delivery                       | Pick `smtp` or `sendgrid`                                 |
| `SENDGRID_API_KEY`        | If SendGrid                               | https://app.sendgrid.com → API Keys                       |
| `SMTP_HOST/PORT/USER/PASS`| If SMTP                                    | Your SMTP provider                                        |
| `MAIL_FROM`               | Sender address                            | `noreply@yourdomain.com` (must be SPF/DKIM-verified)      |
| `STRIPE_SECRET_KEY`       | `sk_live_…`                               | https://dashboard.stripe.com/apikeys                      |
| `STRIPE_WEBHOOK_SECRET`   | `whsec_…`                                 | Stripe → Developers → Webhooks → endpoint signing secret  |
| `BCRYPT_ROUNDS=12`        | Stronger password hashing                 | Hard-coded                                                |
| `SENTRY_DSN`              | Error tracking                            | https://sentry.io project settings                        |
| `LOG_LEVEL=info`          | Reduce log noise                          | Hard-coded                                                |
| `RATE_LIMIT_MAX_REQUESTS` | Per-IP throttling                         | `100` is sane                                             |

### 🟡 OPTIONAL — feature flags

| Variable                              | Purpose                                                               |
| ------------------------------------- | --------------------------------------------------------------------- |
| `GDPR_PURGE_ENABLED=1`                | Hard-delete anonymised users 30 days after request                    |
| `GDPR_PURGE_INTERVAL_MS=86400000`     | 24 h tick                                                             |
| `GDPR_PURGE_RETENTION_MS=2592000000`  | 30 days (override for testing)                                        |
| `PROVIDER_SYNC_ENABLED=1`             | Refresh provider catalogs every 6 h (Castorama / Schmidt / etc.)      |
| `PROVIDER_SYNC_INTERVAL_MS=21600000`  | 6 h tick                                                              |
| `PROVIDER_SYNC_PROVIDERS=castorama,schmidt` | Restrict scope                                                  |
| `SCRAPER_BRIDGE_ENABLED=1`            | Use real `@kitchenxpert/scraper` instead of mock price-drift          |
| `OTEL_EXPORTER_OTLP_ENDPOINT`         | Distributed tracing (Tempo, Honeycomb, Datadog)                       |
| `OTEL_SERVICE_NAME=kitchenxpert-backend` | Service tag                                                        |
| `IKEA_AUTH_SECRET`                    | IKEA guest API client secret (public; default works)                  |
| `GOOGLE_GENAI_API_KEY`                | Gemini 2.5 Flash Image — kitchen renders                              |
| `ANTHROPIC_API_KEY`                   | Claude — chat assistant                                               |
| `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET` | S3 uploads             |
| `INTERNAL_API_KEY`                    | If you call internal endpoints from another service                   |
| `PARTNER_ALLOWED_ORIGINS`             | CORS allow-list for the partner-portal app                            |

### Frontend env vars (Vite)

| Variable                | Required? | Notes                                     |
| ----------------------- | --------- | ----------------------------------------- |
| `VITE_API_URL`          | 🔴        | Must match backend `API_URL`              |
| `VITE_STRIPE_PUBLIC_KEY`| 🟠        | `pk_live_…` for client-side Stripe.js     |
| `VITE_SENTRY_DSN`       | 🟠        | Frontend error tracking                   |

---

## 3. Secrets you must obtain (action items)

Check off as you provision each one. Store in a secrets manager
(AWS Secrets Manager, Vault, Infisical) — **never** commit them.

- [ ] Postgres credentials → DATABASE_URL
- [ ] Redis credentials → REDIS_URL
- [ ] **Generate** JWT_ACCESS_SECRET + JWT_REFRESH_SECRET + DATA_ENCRYPTION_KEY (`openssl rand`)
- [ ] Stripe live keys (sk_live_, pk_live_) + webhook signing secret
- [ ] SendGrid (or SMTP) API key + verified sender domain (SPF/DKIM)
- [ ] DNS A/CNAME for `api.kitchenxpert.com` + `kitchenxpert.com`
- [ ] TLS certificate (Let's Encrypt automatic via Caddy/Cloudflare/Vercel)
- [ ] Sentry DSN (free tier OK for starts)
- [ ] (Optional) Google GenAI API key
- [ ] (Optional) Anthropic API key
- [ ] (Optional) AWS S3 bucket + IAM user + policy

---

## 4. Database setup

```bash
# Create the production DB
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# Apply schema
pnpm --filter @kitchenxpert/backend prisma:migrate:deploy

# Seed the 5 catalog providers + sample products
pnpm --filter @kitchenxpert/backend db:seed
```

---

## 5. Pre-launch checks

- [ ] `pnpm type-check` — all packages green
- [ ] `pnpm build` — all packages emit `dist/`
- [ ] `pnpm --filter @kitchenxpert/backend test` — 0 critical failures
  (current baseline: 19 failing suites / 63 tests, all assertion-mismatch
  in legacy code — see backlog)
- [ ] Hit `https://api.kitchenxpert.com/api/v1/health` → `{"status":"ok"}`
- [ ] Hit `https://api.kitchenxpert.com/api/v1/health/ready` → `200`
- [ ] Hit `https://api.kitchenxpert.com/api/v1/docs/openapi.json` → JSON spec
- [ ] CORS preflight from `https://kitchenxpert.com` succeeds
- [ ] Stripe webhook endpoint reachable (test with `stripe trigger`)
- [ ] Sentry receives a test event (intentionally `throw`)
- [ ] First user can register, verify email, log in, create a kitchen
- [ ] GDPR endpoints `/api/v1/me/gdpr/{summary,export,account}` work

---

## 6. Legal — must complete before invitations

- [ ] Mentions légales: replace `[à compléter]` placeholders in
      `packages/frontend/src/pages/Legal/MentionsLegales.tsx` with SIRET,
      hébergeur address, directeur de publication
- [ ] CGV: have lawyer review `pages/Legal/CGV.tsx` (rétractation 14j,
      DSP2, garanties)
- [ ] Privacy: confirm DPO email `dpo@kitchenxpert.com` is monitored
- [ ] Cookies banner appears on every first visit
- [ ] CNIL declaration if processing AI-generated profiling data
- [ ] Contract with Stripe + sub-processors signed (Art. 28 RGPD)

---

## 7. Day-1 operational runbook

| Symptom                                           | Likely cause                                      | Quick fix                                             |
| ------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Backend 502 on `/api/v1/health`                   | DB unreachable                                    | Check `DATABASE_URL`, security groups, SSL mode       |
| 401 on every request                              | JWT secret mismatched between deploy + cookies    | Roll secret, force re-login (clear cookies)           |
| Stripe webhook 400                                | `STRIPE_WEBHOOK_SECRET` wrong or missing          | Re-fetch from Stripe dashboard                        |
| Cookie banner not showing                         | LocalStorage already has `kx.cookie-consent.v1`   | Clear localStorage in DevTools                        |
| GDPR purge job not running                        | `GDPR_PURGE_ENABLED!=1`                           | Set env var, redeploy                                 |
| Provider catalogs stale                           | `PROVIDER_SYNC_ENABLED!=1`                        | Set env var, restart                                  |
| AI image generation returns null                  | `GOOGLE_GENAI_API_KEY` missing                    | Add key, restart                                      |
| 60-second cold-start                              | Prisma client generation on boot                  | Run `prisma generate` in build step, not at runtime   |

---

## 8. Backups + DR

- [ ] Postgres automated daily snapshot (RDS / `pg_dump`) — retain 30 days
- [ ] Redis is non-critical (regenerable) but enable `appendonly` for safety
- [ ] S3 bucket versioning ON
- [ ] Backups stored in a different region from primary
- [ ] Restore drill: at least once before launch, do a full restore in staging

---

## 9. Monitoring + alerting

- [ ] OpenTelemetry → Tempo / Honeycomb / Datadog (set `OTEL_EXPORTER_OTLP_ENDPOINT`)
- [ ] Sentry → frontend + backend (set `SENTRY_DSN` in both)
- [ ] Uptime check on `/api/v1/health/ready` (PingDom, UptimeRobot, BetterStack)
- [ ] Alert when error rate > 1% over 5 min
- [ ] Alert when latency p95 > 500 ms

---

## 10. Smoke test SCRIPT

The repo provides `scripts/smoke-test.sh` — a one-shot script that:
1. Spins up Postgres + Redis with `docker compose`
2. Runs `prisma:migrate:deploy` + `db:seed`
3. Builds + starts the backend in `dist/`
4. Builds + serves the frontend with Vite preview
5. Hits 12 critical endpoints with `curl` and asserts status codes

Run with:
```bash
./scripts/smoke-test.sh        # local sanity
./scripts/smoke-test.sh --ci   # also run jest + vitest, exit non-zero on failure
```

---

**When every box is checked, you can publish.** Keep this file updated
as the deployment evolves.
