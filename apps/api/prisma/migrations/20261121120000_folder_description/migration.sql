-- Folder description (#418). Expand only: a new nullable column, no data is rewritten.
-- The API trims the text, turns a blank one into NULL and refuses control characters; the CHECK
-- keeps a stored value non-empty and within FOLDER_LIMIT.DescriptionMax (140) characters.

-- AlterTable
ALTER TABLE "folders" ADD COLUMN "description" VARCHAR(140);

-- Hand-written constraint (Prisma cannot express CHECKs; its drift check ignores them).
ALTER TABLE "folders" ADD CONSTRAINT "folders_description_check" CHECK (
  "description" IS NULL OR char_length("description") BETWEEN 1 AND 140
);
