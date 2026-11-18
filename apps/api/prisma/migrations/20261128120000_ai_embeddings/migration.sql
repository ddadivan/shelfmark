-- AI-3 search by meaning and related links (#392, ADR 0052): pgvector, one vector per link, the
-- "Search by meaning" switch, the per-user embed pass lease and the monthly embeds / search counters.

-- pgvector (Neon ships 0.8.x; PGlite loads @electric-sql/pglite-pgvector in tests and local dev).
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "ai_settings" ADD COLUMN     "embed_failed_at" TIMESTAMPTZ(3),
ADD COLUMN     "embed_failures" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "embed_lease_until" TIMESTAMPTZ(3),
ADD COLUMN     "embed_not_before" TIMESTAMPTZ(3),
ADD COLUMN     "meaning_search" BOOLEAN NOT NULL DEFAULT true;

-- Open question 1 of the AI-3 plan: rows that existed before AI-3 never chose the new processor, so
-- search by meaning starts off for them; rows created from now on get the default (on).
UPDATE "ai_settings" SET "meaning_search" = false;

-- AlterTable
ALTER TABLE "ai_usage" ADD COLUMN     "embeds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "search_queries" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "link_embeddings" (
    "link_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "model" VARCHAR(32) NOT NULL,
    "with_note" BOOLEAN NOT NULL,
    "input_hash" CHAR(64) NOT NULL,
    "stale" BOOLEAN NOT NULL DEFAULT false,
    "embedding" halfvec(1024) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "link_embeddings_pkey" PRIMARY KEY ("link_id"),
    CONSTRAINT "link_embeddings_model_check" CHECK ("model" <> '')
);

-- CreateIndex
CREATE INDEX "link_embeddings_user_id_stale_idx" ON "link_embeddings"("user_id", "stale");

-- Approximate nearest neighbours by cosine distance (ADR 0052 point 3). Not in schema.prisma: Prisma
-- cannot describe an HNSW index, and its drift check ignores partial indexes (like the Trash ones).
-- Hence the predicate, which is always true (`model` is never empty) and which every KNN query repeats
-- verbatim (`embedding-sql.ts`) so the planner may use the index. (`embedding IS NOT NULL` would not
-- do: Postgres 17 drops that qual on a NOT NULL column before matching partial indexes.) Queries set
-- hnsw.iterative_scan = relaxed_order so the per-user filter still returns enough rows.
CREATE INDEX "link_embeddings_embedding_hnsw_idx" ON "link_embeddings"
  USING hnsw ("embedding" halfvec_cosine_ops) WITH (m = 16, ef_construction = 64)
  WHERE "model" <> '';

-- AddForeignKey
ALTER TABLE "link_embeddings" ADD CONSTRAINT "link_embeddings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_embeddings" ADD CONSTRAINT "link_embeddings_link_id_user_id_fkey" FOREIGN KEY ("link_id", "user_id") REFERENCES "links"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
