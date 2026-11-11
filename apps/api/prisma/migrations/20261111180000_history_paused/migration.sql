-- "Pause history" on Recently opened (#269). Expand only: a column with a default, no data rewritten.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "history_paused" BOOLEAN NOT NULL DEFAULT false;
