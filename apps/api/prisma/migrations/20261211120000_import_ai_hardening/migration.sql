-- Hardening of import AI grouping (#387, ADR 0056 decision 10, review of the AI pass).
-- `ai_usage.import_group_links`: links sent to grouping this month (a monthly cap that is not given
-- back on a redo, so free re-groups cannot run up provider spend). `ai_settings.import_ai_grouping_id`:
-- the token of the grouping that holds `import_ai_prepaid`, so a late failure of an older grouping
-- never refunds the units of a newer one; `import_ai_prepaid_at`: when they were taken (a sweep gives
-- back units nobody used within the open window of an import).

-- AlterTable
ALTER TABLE "ai_usage" ADD COLUMN     "import_group_links" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ai_settings" ADD COLUMN     "import_ai_grouping_id" UUID,
ADD COLUMN     "import_ai_prepaid_at" TIMESTAMPTZ(3);

-- Units already waiting count as taken now.
UPDATE "ai_settings" SET "import_ai_prepaid_at" = now() WHERE "import_ai_prepaid" > 0;

ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_import_group_links_check" CHECK ("import_group_links" >= 0);
