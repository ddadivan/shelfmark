-- Shelf (ADR 0061): the library feed opens as a masonry by default. Stored values stay as they are
-- (a person who never changed it keeps "cards" until they pick another view).

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "default_view" SET DEFAULT 'masonry';
