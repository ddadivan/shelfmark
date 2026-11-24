-- Shelf (ADR 0061): the library feed has a Masonry view and opens as a masonry by default. Every
-- account moves to it, a stored "cards" or "list" too (author decision, Nov 24, 2026); the feeds a
-- person switched on this device keep their own view (the web app's local feed memory).

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_default_view_check";
ALTER TABLE "users" ADD CONSTRAINT "users_default_view_check" CHECK ("default_view" IN ('masonry', 'cards', 'list'));
ALTER TABLE "users" ALTER COLUMN "default_view" SET DEFAULT 'masonry';

UPDATE "users" SET "default_view" = 'masonry';
