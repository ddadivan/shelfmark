-- In-app reminders (#275): one reminder per link, a nullable time. A link is due once it has passed
-- (computed on read, no cron). Additive and nullable (expand only).

-- AlterTable
ALTER TABLE "links" ADD COLUMN "remind_at" TIMESTAMPTZ(3);

-- The Reminders list and the due count read the user's links with a reminder, soonest first.
-- Partial (Prisma cannot express a WHERE clause, so it lives in SQL only).
CREATE INDEX "links_user_id_remind_at_idx" ON "links"("user_id", "remind_at") WHERE "remind_at" IS NOT NULL;
