-- Shelf (ADR 0061): the library feed has a Masonry view and opens as a masonry by default. Stored
-- values stay as they are (a person who never changed it keeps "cards" until they pick another view).

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_default_view_check";
ALTER TABLE "users" ADD CONSTRAINT "users_default_view_check" CHECK ("default_view" IN ('masonry', 'cards', 'list'));
ALTER TABLE "users" ALTER COLUMN "default_view" SET DEFAULT 'masonry';
