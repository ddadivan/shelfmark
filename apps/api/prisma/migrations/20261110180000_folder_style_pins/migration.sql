-- Folder colours, icons and pins (#263, ADR 0037). Expand only: nullable columns and columns with a
-- default, no data rewritten.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "folder_colours" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "folders" ADD COLUMN "colour" VARCHAR(16) NOT NULL DEFAULT 'graphite';
ALTER TABLE "folders" ADD COLUMN "icon" VARCHAR(24) NOT NULL DEFAULT 'folder';
ALTER TABLE "folders" ADD COLUMN "pinned_position" SMALLINT;
ALTER TABLE "links" ADD COLUMN "pinned_in_folder_at" TIMESTAMPTZ(3);
ALTER TABLE "links" ADD COLUMN "pinned_position" SMALLINT;

-- Hand-written (Prisma cannot express CHECKs or partial indexes). The icon set is a longer, more
-- changeable list (FOLDER_ICON) and is validated by the API only.
ALTER TABLE "folders" ADD CONSTRAINT "folders_colour_check" CHECK ("colour" IN ('graphite', 'sage', 'ocean', 'plum', 'clay', 'amber', 'rose', 'teal'));
ALTER TABLE "folders" ADD CONSTRAINT "folders_pinned_position_check" CHECK ("pinned_position" IS NULL OR "pinned_position" >= 0);
ALTER TABLE "links" ADD CONSTRAINT "links_pinned_position_check" CHECK ("pinned_position" IS NULL OR "pinned_position" >= 0);

-- Only pinned rows are looked up by these, so the indexes hold only those.
CREATE INDEX "folders_user_id_pinned_position_idx" ON "folders"("user_id", "pinned_position") WHERE "pinned_position" IS NOT NULL;
CREATE INDEX "links_user_id_pinned_position_idx" ON "links"("user_id", "pinned_position") WHERE "pinned_position" IS NOT NULL;
CREATE INDEX "links_folder_id_pinned_in_folder_at_idx" ON "links"("folder_id", "pinned_in_folder_at") WHERE "pinned_in_folder_at" IS NOT NULL;
