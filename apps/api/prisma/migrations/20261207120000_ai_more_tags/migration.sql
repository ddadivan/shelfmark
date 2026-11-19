-- "More" new-tag ideas of the AI link job (#522): offered only as chips, never put in by Fill in
-- with AI. Additive, existing rows are the primary ones.

-- AlterTable
ALTER TABLE "link_suggestions" ADD COLUMN     "more" BOOLEAN NOT NULL DEFAULT false;
