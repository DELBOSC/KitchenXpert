-- Reviews — request scheduling + internal feedback.
--
-- This migration matches the model definitions added in
-- schema.prisma §REVIEWS. Generated MANUALLY (no `prisma migrate dev`
-- access) to match Prisma's expected SQL output ; verify locally with
-- `pnpm prisma migrate diff --from-empty --to-schema-datamodel schema.prisma`
-- if you want to confirm parity before deploying.

-- ───────────────────────────────────────────────────────────────────────────
-- Enums
-- ───────────────────────────────────────────────────────────────────────────

CREATE TYPE "ReviewRequestTrigger" AS ENUM (
  'first_project_completed',
  'active_two_weeks',
  'premium_purchase',
  'support_resolved_positive',
  'manual'
);

CREATE TYPE "ReviewPlatform" AS ENUM (
  'g2',
  'capterra',
  'trustpilot',
  'avis_verifies',
  'google_business'
);

-- ───────────────────────────────────────────────────────────────────────────
-- ReviewRequest — scheduled requests (cooldown 90 d enforced in service)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE "ReviewRequest" (
  "id"                TEXT                  NOT NULL,
  "userId"            TEXT                  NOT NULL,
  "trigger"           "ReviewRequestTrigger" NOT NULL,
  "triggeredAt"       TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "projectId"         TEXT,
  "sentAt"            TIMESTAMP(3),
  "respondedAt"       TIMESTAMP(3),
  "rating"            INTEGER,
  "pushedToPlatform"  "ReviewPlatform",
  "pushedAt"          TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3)          NOT NULL,
  CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReviewRequest_userId_triggeredAt_idx"
  ON "ReviewRequest"("userId", "triggeredAt");

CREATE INDEX "ReviewRequest_sentAt_idx"
  ON "ReviewRequest"("sentAt");

CREATE INDEX "ReviewRequest_respondedAt_idx"
  ON "ReviewRequest"("respondedAt");

-- ───────────────────────────────────────────────────────────────────────────
-- InternalFeedback — 1-3 star ratings + free-text. NEVER pushed externally.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE "InternalFeedback" (
  "id"             TEXT          NOT NULL,
  "userId"         TEXT          NOT NULL,
  "rating"         INTEGER       NOT NULL,
  "message"        TEXT,
  "context"        TEXT,
  "resolvedAt"     TIMESTAMP(3),
  "resolvedBy"     TEXT,
  "resolutionNote" TEXT,
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InternalFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InternalFeedback_userId_createdAt_idx"
  ON "InternalFeedback"("userId", "createdAt");

CREATE INDEX "InternalFeedback_rating_idx"
  ON "InternalFeedback"("rating");

CREATE INDEX "InternalFeedback_resolvedAt_idx"
  ON "InternalFeedback"("resolvedAt");
