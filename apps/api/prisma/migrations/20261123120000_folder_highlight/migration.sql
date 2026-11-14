-- Settings › Appearance › "Highlight folders with their colour" (#418). Expand only: a new column
-- with a default, no data is rewritten. The allow-list mirrors the contracts (FOLDER_HIGHLIGHT).

-- AlterTable
ALTER TABLE "users" ADD COLUMN "folder_highlight" TEXT NOT NULL DEFAULT 'stripe';

-- Hand-written constraint (Prisma cannot express CHECKs; its drift check ignores them).
ALTER TABLE "users" ADD CONSTRAINT "users_folder_highlight_check" CHECK ("folder_highlight" IN ('off', 'stripe', 'background'));
