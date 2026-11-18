-- AI-5 library clean-up (#394, ADR 0052): one stored report per user, replaced by each run, and the
-- monthly count of clean-up runs with AI checks. The report holds ids, group ids and reasons only:
-- never titles, URLs or tag names.

-- AlterTable: AI clean-up runs this UTC month (AI pack 10, Free 0).
ALTER TABLE "ai_usage" ADD COLUMN     "cleanup_runs" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "cleanup_reports" (
    "user_id" UUID NOT NULL,
    "state" VARCHAR(8) NOT NULL DEFAULT 'none',
    "include_ai" BOOLEAN NOT NULL DEFAULT false,
    "checked" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "cursor" UUID,
    "lease_until" TIMESTAMPTZ(3),
    "findings" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMPTZ(3),
    "progress_at" TIMESTAMPTZ(3),
    "finished_at" TIMESTAMPTZ(3),
    "applied_at" TIMESTAMPTZ(3),
    "card_dismissed_at" TIMESTAMPTZ(3),

    CONSTRAINT "cleanup_reports_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "cleanup_reports_state_check" CHECK ("state" IN ('none', 'running', 'ready', 'applied', 'failed')),
    CONSTRAINT "cleanup_reports_counts_check" CHECK ("checked" >= 0 AND "total" >= 0),
    CONSTRAINT "cleanup_reports_findings_check" CHECK (jsonb_typeof("findings") = 'object')
);

-- AddForeignKey
ALTER TABLE "cleanup_reports" ADD CONSTRAINT "cleanup_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
