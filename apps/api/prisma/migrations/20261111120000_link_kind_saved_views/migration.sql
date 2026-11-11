-- Link kind and saved views (#264, ADR 0038). Expand only: a column with a default, a new table, a
-- backfill from the URL host (no outbound fetches) and a trigger that gives new users the starter views.

-- AlterTable
ALTER TABLE "links" ADD COLUMN "kind" VARCHAR(16) NOT NULL DEFAULT 'other';

-- CreateTable
CREATE TABLE "saved_views" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "query" JSONB NOT NULL,
    "position" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "links_user_id_kind_idx" ON "links"("user_id", "kind");

-- CreateIndex
CREATE INDEX "saved_views_user_id_position_idx" ON "saved_views"("user_id", "position");

-- AddForeignKey
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written (Prisma cannot express CHECKs, triggers or data backfills).
ALTER TABLE "links" ADD CONSTRAINT "links_kind_check" CHECK ("kind" IN ('video', 'article', 'shopping', 'other'));
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_position_check" CHECK ("position" >= 0);

-- Backfill: the host rules of `deriveLinkKind` (LINK_KIND_VIDEO_HOSTS, LINK_KIND_SHOP_HOSTS); og:type is
-- unknown for saved rows, so this is the host part only. A subdomain matches too.
WITH "hosts" AS (
    SELECT "id", rtrim(lower(substring("url" FROM '^[A-Za-z][A-Za-z0-9+.-]*://(?:[^/?#@]*@)?([^/?#:]+)')), '.') AS "host"
    FROM "links"
)
UPDATE "links" AS l
SET "kind" = CASE
    WHEN h."host" = ANY (ARRAY['youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv', 'dailymotion.com', 'tiktok.com', 'loom.com'])
      OR h."host" LIKE ANY (ARRAY['%.youtube.com', '%.youtu.be', '%.vimeo.com', '%.twitch.tv', '%.dailymotion.com', '%.tiktok.com', '%.loom.com'])
      THEN 'video'
    WHEN h."host" = ANY (ARRAY['amazon.com', 'amazon.de', 'amazon.co.uk', 'amazon.fr', 'ebay.com', 'ebay.de', 'etsy.com', 'aliexpress.com', 'zalando.de', 'ikea.com', 'walmart.com', 'bestbuy.com'])
      OR h."host" LIKE ANY (ARRAY['%.amazon.com', '%.amazon.de', '%.amazon.co.uk', '%.amazon.fr', '%.ebay.com', '%.ebay.de', '%.etsy.com', '%.aliexpress.com', '%.zalando.de', '%.ikea.com', '%.walmart.com', '%.bestbuy.com'])
      THEN 'shopping'
    ELSE 'other'
  END
FROM "hosts" AS h
WHERE h."id" = l."id" AND h."host" IS NOT NULL;

-- Starter views: every account starts with "Videos" and "Articles" ("All" is the fixed chip of the
-- client, not a row). A trigger covers every way a user row is created (OAuth sign-up, demo), so no
-- request ever has to create them (no write on GET). Existing users get them below.
CREATE FUNCTION "saved_views_seed_starter"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO "saved_views" ("id", "user_id", "name", "query", "position", "created_at", "updated_at")
  VALUES
    (gen_random_uuid(), NEW."id", 'Videos', '{"scope":"all","folderId":null,"tags":[],"kind":"video","sort":"createdAt","order":"desc","q":""}'::jsonb, 0, now(), now()),
    (gen_random_uuid(), NEW."id", 'Articles', '{"scope":"all","folderId":null,"tags":[],"kind":"article","sort":"createdAt","order":"desc","q":""}'::jsonb, 1, now(), now());
  RETURN NEW;
END
$$;

CREATE TRIGGER "users_seed_saved_views" AFTER INSERT ON "users" FOR EACH ROW EXECUTE FUNCTION "saved_views_seed_starter"();

INSERT INTO "saved_views" ("id", "user_id", "name", "query", "position", "created_at", "updated_at")
SELECT gen_random_uuid(), u."id", v."name", v."query"::jsonb, v."position", now(), now()
FROM "users" AS u
CROSS JOIN (VALUES
    ('Videos', '{"scope":"all","folderId":null,"tags":[],"kind":"video","sort":"createdAt","order":"desc","q":""}', 0),
    ('Articles', '{"scope":"all","folderId":null,"tags":[],"kind":"article","sort":"createdAt","order":"desc","q":""}', 1)
) AS v("name", "query", "position");
