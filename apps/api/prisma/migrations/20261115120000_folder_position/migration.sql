-- Manual folder order (#314): a place among the siblings of one parent, seeded from the name order
-- the sidebar showed so far (name, then id, per user and parent; trashed folders too).
ALTER TABLE "folders" ADD COLUMN "position" SMALLINT NOT NULL DEFAULT 0;

UPDATE "folders" AS f
SET "position" = ordered.rank - 1
FROM (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "user_id", "parent_id" ORDER BY "name", "id"
  ) AS rank
  FROM "folders"
) AS ordered
WHERE f."id" = ordered."id";
