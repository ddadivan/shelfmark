-- Settings › Appearance (#273): when the appearance was first saved on the account. NULL means
-- never chosen, so the web app keeps a theme the browser already had and saves it once instead
-- of replacing it with the defaults. Expand only: a nullable column, no data rewritten.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "appearance_saved_at" TIMESTAMPTZ(3);
