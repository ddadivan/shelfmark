-- Shelf (ADR 0061): the library feed has a fourth view, Headlines, which an account may choose as
-- its default view (Settings › Library).

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_default_view_check";
ALTER TABLE "users" ADD CONSTRAINT "users_default_view_check" CHECK ("default_view" IN ('masonry', 'cards', 'list', 'headlines'));
