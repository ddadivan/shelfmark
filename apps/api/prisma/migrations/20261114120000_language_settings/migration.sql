-- Settings › Language (#274): interface language, date format, clock, week start and spell-check
-- on the account. Expand only: new columns with defaults, no data rewritten; existing accounts read
-- as "browser" (the behaviour they had). The allow-lists mirror the contracts (INTERFACE_LANGUAGE,
-- DATE_FORMAT, TIME_FORMAT, WEEK_START).

-- AlterTable
ALTER TABLE "users" ADD COLUMN "language" TEXT NOT NULL DEFAULT 'browser',
ADD COLUMN "date_format" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN "time_format" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN "week_start" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN "spellcheck" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "language_saved_at" TIMESTAMPTZ(3);

-- Hand-written constraints (Prisma cannot express CHECKs; its drift check ignores them).
ALTER TABLE "users" ADD CONSTRAINT "users_language_check" CHECK ("language" IN ('browser', 'en', 'fr', 'de', 'it', 'es', 'pt'));
ALTER TABLE "users" ADD CONSTRAINT "users_date_format_check" CHECK ("date_format" IN ('default', 'medium', 'dmy', 'mdy', 'iso'));
ALTER TABLE "users" ADD CONSTRAINT "users_time_format_check" CHECK ("time_format" IN ('default', 'h24', 'h12'));
ALTER TABLE "users" ADD CONSTRAINT "users_week_start_check" CHECK ("week_start" IN ('default', 'monday', 'sunday'));
