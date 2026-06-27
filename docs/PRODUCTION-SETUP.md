# KitchenXpert — Production Setup Guide

**Audience:** infra-owner deploying KitchenXpert from scratch on EU
infrastructure for the first time. Estimated wall-clock: **4–6 h** spread over a
day (waiting on DNS + email DKIM is the bottleneck).

**Outcome:** a hardened, RGPD-compliant production stack with Postgres, Redis,
S3, Stripe live, transactional email, AI keys, and DNS+TLS properly configured —
validated by `scripts/preflight-check.sh` before the first deploy.

---

## 0. Prerequisites

| Tool        | Min version | Why                                            |
| ----------- | ----------- | ---------------------------------------------- |
| `node`      | 20.x        | Backend runtime                                |
| `pnpm`      | 8.15.0      | Pinned (corepack handles installation)         |
| `docker`    | 24+         | Container build + compose v2                   |
| `openssl`   | 3.x         | Secret generation + STARTTLS check             |
| `curl`      | 7.81+       | Health checks                                  |
| `psql`      | 16          | DB migration + preflight                       |
| `redis-cli` | 7+          | Redis preflight check                          |
| `gitleaks`  | latest      | Pre-deploy secret scan (Phase 5 of this guide) |

A registered DNS zone for **kitchenxpert.com** with admin access.

---

## 1. Postgres — managed UE instance (≈ 20 min)

Pick **OVHcloud Public Cloud Databases** (Gravelines) or **Scaleway Managed
Database** (Paris). Both are EU-resident and ship backups + automatic minor
upgrades.

### OVHcloud (recommended baseline)

1. OVH Manager » Public Cloud » Databases » _Create a database service_.
2. Engine **PostgreSQL 16**, plan **Essential 4 GB / 2 vCPU** (start small —
   vertical scaling is one click).
3. Region **GRA** (Gravelines) — closest to Paris customers and lowest latency
   from Scaleway/Brevo.
4. Network: keep **Public Network** ON for the very first migration, then switch
   to **Private Network** with vRack once your app cluster is provisioned.
5. Add an **Allowed IP** for your bastion host (`0.0.0.0/0` is rejected by OVH
   on production tier — good).
6. After creation, OVH gives you the connection string. Append
   `?sslmode=require` if missing.
7. Create the application role (do NOT use the admin role at runtime):

   ```sql
   CREATE ROLE kx_app WITH LOGIN PASSWORD '<long-random-password>';
   GRANT CONNECT ON DATABASE kitchenxpert TO kx_app;
   GRANT USAGE  ON SCHEMA public TO kx_app;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kx_app;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kx_app;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public
     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kx_app;
   ```

8. Save `DATABASE_URL` for `.env.production`.

### Verify

```bash
PGCONNECT_TIMEOUT=5 psql "$DATABASE_URL" -c 'SELECT version();'
```

Then run migrations from your laptop:

```bash
cd packages/backend
pnpm prisma migrate deploy
pnpm prisma db seed --skip-seed=true   # ensure no dev seed leaks
```

---

## 2. Redis — managed UE instance (≈ 10 min)

**Upstash** (Frankfurt or Dublin) is the simplest pay-per-request option;
**Scaleway Managed Redis** (Paris) is the cheapest at scale.

1. Provision a Redis 7 instance, **TLS enabled**, eviction policy `allkeys-lru`
   (we use it both as cache and as rate-limit store).
2. Copy the **rediss://** URL into `REDIS_URL`.
3. Verify:

   ```bash
   redis-cli -u "$REDIS_URL" --no-auth-warning ping  # → PONG
   ```

> ⚠️ Avoid `redis://` (plain) over the public internet. Even Upstash default
> endpoints are TLS — keep them that way.

---

## 3. Object storage — S3-compatible UE (≈ 15 min)

**Scaleway Object Storage** (Paris/Amsterdam) or **OVHcloud Object Storage**.
Both are S3-API compatible.

### Scaleway (example)

1. Console » Object Storage » Buckets » _Create bucket_
   `kitchenxpert-prod-uploads`, region **fr-par**, visibility **private**.
2. Console » Identity » API Keys » _Generate key_ with the role
   **ObjectStorageObjectsRead+Write** scoped to that bucket only.
3. Configure CORS on the bucket (allow `https://kitchenxpert.com`, methods
   `GET, PUT, POST`, max age 3600).
4. Apply the lifecycle rule from `config/storage/lifecycle.xml` (auto-purge
   `tmp/` after 7 days).
5. Fill `S3_*` block in `.env.production`.

---

## 4. Transactional email (≈ 30 min + DNS propagation)

**Brevo** (FR, RGPD-friendly) is the default. **Mailjet** (FR) and **SendGrid
EU** (with DPA) are acceptable substitutes.

1. Sign up at https://www.brevo.com/ , create an _automation/transactional_
   project.
2. Add the sender domain `kitchenxpert.com` in **Senders & IP » Domains**.
3. Brevo emits two CNAME records and one TXT (`brevo-code:`). Add them at your
   registrar — propagation is usually < 30 min.
4. Verify SPF and DKIM are green in Brevo. **Do not skip DKIM** — most ISPs
   (Gmail, Outlook 365) treat DKIM-less transactional senders as spam.
5. **DMARC**: at your registrar add a TXT record on `_dmarc.kitchenxpert.com`:

   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@kitchenxpert.com; pct=100; aspf=s; adkim=s
   ```

6. Brevo dashboard » SMTP & API » SMTP » create an SMTP key. Copy login
   - key to `SMTP_USER` / `SMTP_PASS`.
7. Send a test:

   ```bash
   curl --url smtps://smtp-relay.brevo.com:465 \
        --ssl-reqd --user "$SMTP_USER:$SMTP_PASS" \
        --mail-from "$MAIL_FROM" --mail-rcpt "test@example.com" \
        --upload-file <(printf 'Subject: KX preflight\r\n\r\nIt works.\n')
   ```

---

## 5. Stripe — switch to live mode (≈ 20 min)

1. Stripe Dashboard » toggle **Live mode** in the top bar.
2. Verify the company is fully activated (RIB IBAN added, ID document accepted
   by Stripe Compliance).
3. **Developers » API keys** → copy `pk_live_…` and `sk_live_…` to
   `STRIPE_PUBLIC_KEY` / `STRIPE_SECRET_KEY`.
4. **Developers » Webhooks** → _Add endpoint_
   `https://api.kitchenxpert.com/api/v1/payments/webhook`. Subscribe to at
   minimum:
   - `checkout.session.completed`
   - `customer.subscription.created` / `.updated` / `.deleted`
   - `invoice.payment_succeeded` / `.payment_failed`
5. Reveal the **Signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.
6. **Products** → create the three pricing tiers from
   `packages/frontend/src/config/legal.ts:pricingTiers` and copy the Price IDs
   into `STRIPE_PRICE_PREMIUM` / `STRIPE_PRICE_STUDIO`.
7. Enable **Radar for Fraud Teams** + **3D Secure: when required by SCA**
   (default-on for EU cards, mandatory under DSP2).

---

## 6. AI provider keys (≈ 5 min each)

| Variable               | Where                                         | Notes                                                                            |
| ---------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`    | https://console.anthropic.com/settings/keys   | Sign the **Anthropic DPA** (link in the same console). Sub-processor declared.   |
| `GOOGLE_GENAI_API_KEY` | https://aistudio.google.com/app/apikey        | Restrict the key to your production IPs (Google Cloud » Credentials » Restrict). |
| `IKEA_API_KEY` _etc._  | Provider partner programs — strictly optional | The catalog falls back to the local mirror if absent.                            |

---

## 7. DNS, TLS, reverse proxy (≈ 30 min)

1. At your registrar create the records:

   | Type | Name  | Target                      |
   | ---- | ----- | --------------------------- |
   | A    | `@`   | <load-balancer IP>          |
   | A    | `www` | <load-balancer IP>          |
   | A    | `app` | <load-balancer IP>          |
   | A    | `api` | <load-balancer IP>          |
   | CAA  | `@`   | `0 issue "letsencrypt.org"` |

2. Provision Let's Encrypt certificates via Caddy/Traefik/Nginx-acme on the same
   machine that runs `docker-compose.prod.yml`. Caddy is the one-liner option:

   ```
   kitchenxpert.com, www.kitchenxpert.com {
     reverse_proxy frontend:8080
     header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
   }
   api.kitchenxpert.com {
     reverse_proxy backend:4000
   }
   ```

3. Submit the apex domain to the **HSTS preload list**: https://hstspreload.org/
   (only after you are sure HTTPS works everywhere — preload is one-way for ~1
   year).

---

## 8. Inject secrets (≈ 10 min)

Pick **one** strategy and stick with it:

- **Doppler** (recommended) —
  `doppler run -- docker compose -f config/docker/docker-compose.prod.yml up -d`.
  Free tier is enough for one project.
- **OVH Vault Manager** or **Scaleway Secret Manager** — pull at boot via the
  host's IAM role.
- **Sealed env file** — encrypt `.env.production` with
  `sops --encrypt --age <key>` and decrypt only at deploy time.

Generate the cryptographic secrets:

```bash
bash scripts/generate-secrets.sh | pbcopy   # then paste into your store
```

Validate everything before the first boot:

```bash
set -a && source /path/to/.env.production && set +a
bash scripts/preflight-check.sh             # must report 0 failures
```

---

## 9. First deploy + smoke test (≈ 20 min)

```bash
docker compose -f config/docker/docker-compose.yml \
               -f config/docker/docker-compose.prod.yml \
               --env-file .env.production \
               up -d --build
```

Smoke checklist (manual, ≈ 10 min):

- [ ] `curl -fsS https://api.kitchenxpert.com/health` → 200
- [ ] `curl -fsS https://kitchenxpert.com/` returns the SPA shell
- [ ] Create an account → verification email arrives within 60 s
- [ ] Login + access dashboard
- [ ] Subscribe to **Premium** with Stripe test card 4000 0027 6000 3184 (3DS
      required) → success page rendered
- [ ] Trigger a Stripe webhook from the dashboard → backend logs show
      `Webhook received: customer.subscription.created`
- [ ] Visit `/legal/mentions-legales` — no `TODO_LAURENT_*` rendered
- [ ] Visit `/legal/cookies` and "Refuser tout" → no analytics cookie lands in
      `document.cookie`
- [ ] Open Sentry → first request creates a transaction trace

If everything is green, tag the release:

```bash
git tag -a v1.0.0-prod -m "first production deploy"
git push --tags
```

---

## 10. Rollback procedure

```bash
# 1. Application — revert to the previous image tag
docker compose -f config/docker/docker-compose.prod.yml \
  pull backend frontend && \
  VERSION=<previous> docker compose -f config/docker/docker-compose.prod.yml \
  up -d backend frontend

# 2. Database — only if a destructive migration shipped
cd packages/backend
pnpm prisma migrate resolve --rolled-back <last_migration>
# then `prisma migrate deploy` against the previous schema snapshot
```

Snapshot policy: OVH/Scaleway both keep automated daily backups for 7 days on
the entry plan — keep that retention as the cheapest insurance.

---

## 11. Day-2 housekeeping

- Add `bash scripts/preflight-check.sh --skip-network` to your CI as a
  pre-deploy gate (fast offline subset).
- Schedule `bash scripts/security/dependency-check.sh` weekly (cron).
- Rotate `JWT_*` and `INTERNAL_API_KEY` every 90 days.
- Review the Sentry "Performance » Slow Transactions" tab monthly and the
  **Privacy » Sub-processors** list whenever you add a third party.
