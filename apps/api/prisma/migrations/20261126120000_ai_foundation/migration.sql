-- AI foundation (#389, ADR 0047/0048): account plan and AI pack, summaries on links, AI settings, usage,
-- jobs, batches and suggestions. Expand only: new columns with defaults and new tables.

-- AlterTable
ALTER TABLE "links" ADD COLUMN     "ai_status" VARCHAR(8),
ADD COLUMN     "summary" VARCHAR(300),
ADD COLUMN     "summary_source" VARCHAR(8);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ai_pack" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plan" VARCHAR(8) NOT NULL DEFAULT 'free';

-- CreateTable
CREATE TABLE "ai_settings" (
    "user_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "folder_mode" VARCHAR(8) NOT NULL DEFAULT 'suggest',
    "tags_mode" VARCHAR(8) NOT NULL DEFAULT 'suggest',
    "summaries" BOOLEAN NOT NULL DEFAULT true,
    "include_notes" BOOLEAN NOT NULL DEFAULT false,
    "summary_language" VARCHAR(8) NOT NULL DEFAULT 'app',
    "enabled_at" TIMESTAMPTZ(3),
    "intro_seen_at" TIMESTAMPTZ(3),
    "backfill_state" VARCHAR(8) NOT NULL DEFAULT 'idle',
    "backfill_cursor" UUID,
    "backfill_total" INTEGER NOT NULL DEFAULT 0,
    "backfill_done" INTEGER NOT NULL DEFAULT 0,
    "backfill_used" INTEGER NOT NULL DEFAULT 0,
    "backfill_started_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "user_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "links" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("user_id","month")
);

-- CreateTable
CREATE TABLE "ai_batches" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" VARCHAR(16) NOT NULL,
    "provider_batch_id" TEXT NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'submitted',
    "request_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),

    CONSTRAINT "ai_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "link_id" UUID,
    "draft_id" UUID,
    "kind" VARCHAR(8) NOT NULL DEFAULT 'link',
    "source" VARCHAR(8) NOT NULL,
    "status" VARCHAR(8) NOT NULL DEFAULT 'pending',
    "reason" VARCHAR(16),
    "parts" TEXT[],
    "language" VARCHAR(8) NOT NULL,
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "not_before" TIMESTAMPTZ(3),
    "lease_until" TIMESTAMPTZ(3),
    "batch_id" UUID,
    "result" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "link_suggestions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "job_id" UUID,
    "kind" VARCHAR(8) NOT NULL,
    "tag_name" VARCHAR(50),
    "folder_id" UUID,
    "state" VARCHAR(12) NOT NULL DEFAULT 'suggested',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "link_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_batches_provider_batch_id_key" ON "ai_batches"("provider_batch_id");

-- CreateIndex
CREATE INDEX "ai_batches_user_id_status_idx" ON "ai_batches"("user_id", "status");

-- CreateIndex
CREATE INDEX "ai_jobs_status_not_before_idx" ON "ai_jobs"("status", "not_before");

-- CreateIndex
CREATE INDEX "ai_jobs_user_id_status_idx" ON "ai_jobs"("user_id", "status");

-- CreateIndex
CREATE INDEX "ai_jobs_link_id_idx" ON "ai_jobs"("link_id");

-- CreateIndex
CREATE INDEX "ai_jobs_batch_id_idx" ON "ai_jobs"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_jobs_user_id_draft_id_key" ON "ai_jobs"("user_id", "draft_id");

-- CreateIndex
CREATE INDEX "link_suggestions_user_id_link_id_idx" ON "link_suggestions"("user_id", "link_id");

-- CreateIndex
CREATE INDEX "link_suggestions_job_id_idx" ON "link_suggestions"("job_id");

-- CreateIndex
CREATE INDEX "link_suggestions_folder_id_idx" ON "link_suggestions"("folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "links_id_user_id_key" ON "links"("id", "user_id");

-- AddForeignKey
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_batches" ADD CONSTRAINT "ai_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_link_id_user_id_fkey" FOREIGN KEY ("link_id", "user_id") REFERENCES "links"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ai_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_suggestions" ADD CONSTRAINT "link_suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_suggestions" ADD CONSTRAINT "link_suggestions_link_id_user_id_fkey" FOREIGN KEY ("link_id", "user_id") REFERENCES "links"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_suggestions" ADD CONSTRAINT "link_suggestions_folder_id_user_id_fkey" FOREIGN KEY ("folder_id", "user_id") REFERENCES "folders"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_suggestions" ADD CONSTRAINT "link_suggestions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "ai_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Hand-written (Prisma cannot express CHECKs): the sets and shapes the API writes (contracts, ai/).
ALTER TABLE "users" ADD CONSTRAINT "users_plan_check" CHECK ("plan" IN ('free', 'pro'));

-- A summary has a source and the source has a summary; aiStatus is the client-visible job status.
ALTER TABLE "links" ADD CONSTRAINT "links_summary_source_check"
  CHECK ("summary_source" IS NULL OR "summary_source" IN ('ai', 'user'));
ALTER TABLE "links" ADD CONSTRAINT "links_summary_pair_check"
  CHECK (("summary" IS NULL) = ("summary_source" IS NULL));
ALTER TABLE "links" ADD CONSTRAINT "links_ai_status_check"
  CHECK ("ai_status" IS NULL OR "ai_status" IN ('pending', 'done', 'failed', 'skipped'));

ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_folder_mode_check"
  CHECK ("folder_mode" IN ('suggest', 'auto', 'off'));
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_tags_mode_check"
  CHECK ("tags_mode" IN ('suggest', 'auto', 'off'));
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_summary_language_check"
  CHECK ("summary_language" IN ('app', 'en', 'fr', 'de', 'it', 'es', 'pt', 'uk'));
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_backfill_state_check"
  CHECK ("backfill_state" IN ('idle', 'running', 'done', 'stopped'));
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_backfill_counts_check"
  CHECK ("backfill_total" >= 0 AND "backfill_done" >= 0 AND "backfill_used" >= 0);

ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_links_check" CHECK ("links" >= 0);
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_month_check"
  CHECK (EXTRACT(DAY FROM "month") = 1);

ALTER TABLE "ai_batches" ADD CONSTRAINT "ai_batches_status_check"
  CHECK ("status" IN ('submitted', 'ended', 'canceled'));

ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_kind_check" CHECK ("kind" IN ('link'));
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_source_check"
  CHECK ("source" IN ('save', 'draft', 'backfill', 'rewrite'));
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_status_check"
  CHECK ("status" IN ('pending', 'running', 'done', 'failed', 'skipped'));
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_reason_check"
  CHECK ("reason" IS NULL OR "reason" IN ('off', 'quota', 'unavailable', 'rejected', 'nothing-found'));
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_parts_check"
  CHECK ("parts" <@ ARRAY['tags', 'folder', 'summary']::TEXT[]);
-- A draft job has no link yet; every other source is for a link.
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_target_check"
  CHECK ("source" = 'draft' OR "link_id" IS NOT NULL);

ALTER TABLE "link_suggestions" ADD CONSTRAINT "link_suggestions_kind_check"
  CHECK ("kind" IN ('tag', 'new-tag', 'folder'));
ALTER TABLE "link_suggestions" ADD CONSTRAINT "link_suggestions_state_check"
  CHECK ("state" IN ('suggested', 'auto-applied', 'accepted', 'dismissed'));
-- Exactly one of tag_name / folder_id, by kind.
ALTER TABLE "link_suggestions" ADD CONSTRAINT "link_suggestions_target_check"
  CHECK (
    ("kind" = 'folder' AND "folder_id" IS NOT NULL AND "tag_name" IS NULL)
    OR ("kind" IN ('tag', 'new-tag') AND "tag_name" IS NOT NULL AND "folder_id" IS NULL)
  );

-- Cheap lookups for the job runner: stale pending jobs per user, one live suggestion per link and target.
CREATE UNIQUE INDEX "link_suggestions_link_tag_key"
  ON "link_suggestions" ("link_id", "tag_name") WHERE "tag_name" IS NOT NULL;
CREATE UNIQUE INDEX "link_suggestions_link_folder_key"
  ON "link_suggestions" ("link_id", "folder_id") WHERE "folder_id" IS NOT NULL;
