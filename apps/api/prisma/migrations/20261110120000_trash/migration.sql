-- Trash (#262, ADR 0036): soft delete with a shared timestamp and per-account retention. Expand
-- only: nullable columns and a column with a default, no data rewritten.

-- AlterTable
ALTER TABLE "links" ADD COLUMN "deleted_at" TIMESTAMPTZ(3);
ALTER TABLE "folders" ADD COLUMN "deleted_at" TIMESTAMPTZ(3);
ALTER TABLE "users" ADD COLUMN "trash_retention_days" SMALLINT NOT NULL DEFAULT 30;

-- Hand-written (Prisma cannot express CHECKs or partial indexes).
ALTER TABLE "users" ADD CONSTRAINT "users_trash_retention_days_check" CHECK ("trash_retention_days" IN (7, 30, 90));

-- Trash list and purge only look at deleted rows, so the indexes hold only those.
CREATE INDEX "links_user_id_deleted_at_trash_idx" ON "links"("user_id", "deleted_at") WHERE "deleted_at" IS NOT NULL;
CREATE INDEX "folders_user_id_deleted_at_trash_idx" ON "folders"("user_id", "deleted_at") WHERE "deleted_at" IS NOT NULL;
