-- Link preview review (#555): a click on a card or row opens the preview by default.
-- The link preview (#553) is not released yet, so every stored 'open' is still the old default,
-- never a choice: move them with the default.

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "click_action" SET DEFAULT 'preview';

UPDATE "users" SET "click_action" = 'preview' WHERE "click_action" = 'open';
