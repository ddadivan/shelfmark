-- Account deletion with a grace period (Shelf 05-settings). Expand only: one nullable column.
ALTER TABLE "users" ADD COLUMN     "deletion_scheduled_at" TIMESTAMPTZ(3);

-- The purge cron reads the accounts whose time has come, oldest first.
CREATE INDEX "users_deletion_scheduled_at_idx" ON "users"("deletion_scheduled_at") WHERE "deletion_scheduled_at" IS NOT NULL;
