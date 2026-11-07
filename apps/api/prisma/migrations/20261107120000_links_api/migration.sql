-- Links API (#72, ADR 0033): sort key for the keyset cursor, idempotency key, source URLs and
-- trigram indexes for the note and URL search. Expand step: the new columns are nullable or filled
-- before the NOT NULL is set, and the service writes them on every insert and title change.

-- AlterTable
ALTER TABLE "links" ADD COLUMN     "title_sort_key" TEXT,
ADD COLUMN     "favicon_source_url" VARCHAR(2048),
ADD COLUMN     "image_source_url" VARCHAR(2048),
ADD COLUMN     "idempotency_key" UUID;

-- Backfill, then enforce.
UPDATE "links" SET "title_sort_key" = lower("title");
ALTER TABLE "links" ALTER COLUMN "title_sort_key" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "links_user_id_idempotency_key_key" ON "links"("user_id", "idempotency_key");

-- Keyset paging by created_at needs the id tie-breaker in the index; it also serves everything the
-- old (user_id, created_at) index served, so that one is replaced.
CREATE INDEX "links_user_id_created_at_id_idx" ON "links"("user_id", "created_at", "id");
DROP INDEX "links_user_id_created_at_idx";

-- CreateIndex
CREATE INDEX "links_user_id_title_sort_key_id_idx" ON "links"("user_id", "title_sort_key", "id");

-- CreateIndex
CREATE INDEX "links_note_trgm_idx" ON "links" USING GIN ("note" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "links_url_trgm_idx" ON "links" USING GIN ("url" gin_trgm_ops);

-- Source URLs are only ever http(s) (hand-written: Prisma cannot express CHECKs).
ALTER TABLE "links" ADD CONSTRAINT "links_favicon_source_url_scheme_check" CHECK ("favicon_source_url" IS NULL OR "favicon_source_url" ~* '^https?://');
ALTER TABLE "links" ADD CONSTRAINT "links_image_source_url_scheme_check" CHECK ("image_source_url" IS NULL OR "image_source_url" ~* '^https?://');
