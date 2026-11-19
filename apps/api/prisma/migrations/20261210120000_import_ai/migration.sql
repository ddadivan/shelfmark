-- AI groups and the AI pass of an import (#387, ADR 0056 decisions 9 and 10).
-- `imports.ai_*`: the pass asked for at start, its state, the backfill units the grouping took that
-- the pass has not used yet, and the links it covers. `ai_settings.backfill_import_id`: the import a
-- running backfill run is scoped to; `ai_settings.import_ai_prepaid`: units a grouping took that no
-- import has taken over yet.

-- AlterTable
ALTER TABLE "imports" ADD COLUMN     "ai_requested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ai_state" VARCHAR(8),
ADD COLUMN     "ai_prepaid" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ai_total" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ai_settings" ADD COLUMN     "backfill_import_id" UUID,
ADD COLUMN     "import_ai_prepaid" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_backfill_import_id_fkey" FOREIGN KEY ("backfill_import_id") REFERENCES "imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The set of states is closed (IMPORT_AI_STATE in the contracts); the counters are never negative.
ALTER TABLE "imports" ADD CONSTRAINT "imports_ai_state_check" CHECK (
  "ai_state" IS NULL OR "ai_state" IN ('running', 'done', 'skipped')
);
ALTER TABLE "imports" ADD CONSTRAINT "imports_ai_counts_check" CHECK ("ai_prepaid" >= 0 AND "ai_total" >= 0);
ALTER TABLE "ai_settings" ADD CONSTRAINT "ai_settings_import_ai_prepaid_check" CHECK ("import_ai_prepaid" >= 0);
