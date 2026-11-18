-- AI-5 review fixes (#394, ADR 0053): the Undo of the last clean-up apply is held on the report row
-- (ids and the merged tag names only, single-use, valid until `undo_until`), so the Undo request
-- carries only the run id; and the month whose AI clean-up run the report counted, so a refund gives
-- back exactly that month.

-- AlterTable
ALTER TABLE "cleanup_reports" ADD COLUMN     "ai_run_month" DATE,
ADD COLUMN     "undo_data" JSONB,
ADD COLUMN     "undo_run_id" UUID,
ADD COLUMN     "undo_until" TIMESTAMPTZ(3);

-- The Undo data is an object and comes with its run id and expiry, or not at all.
ALTER TABLE "cleanup_reports" ADD CONSTRAINT "cleanup_reports_undo_check" CHECK (
  ("undo_data" IS NULL AND "undo_run_id" IS NULL AND "undo_until" IS NULL)
  OR ("undo_data" IS NOT NULL AND jsonb_typeof("undo_data") = 'object'
    AND "undo_run_id" IS NOT NULL AND "undo_until" IS NOT NULL)
);
