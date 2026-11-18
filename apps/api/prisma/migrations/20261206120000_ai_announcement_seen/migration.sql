-- The one-time AI announcement dialog (#507): the moment the user closed it or answered it, so it
-- shows once per account.

-- AlterTable
ALTER TABLE "ai_settings" ADD COLUMN     "announcement_seen_at" TIMESTAMPTZ(3);
