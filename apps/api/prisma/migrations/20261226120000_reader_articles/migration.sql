-- Reader (Shelf Link page): the article extracted from a link's page, stored per link (typed blocks
-- as jsonb, NULL = no article) so a second open does not fetch again. Same-user composite FK, cascades
-- with the link and the account. New table only: nothing existing changes.

-- CreateTable
CREATE TABLE "link_reader_articles" (
    "link_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "article" JSONB,
    "failed" BOOLEAN NOT NULL DEFAULT false,
    "extracted_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "link_reader_articles_pkey" PRIMARY KEY ("link_id")
);

-- CreateIndex
CREATE INDEX "link_reader_articles_user_id_idx" ON "link_reader_articles"("user_id");

-- AddForeignKey
ALTER TABLE "link_reader_articles" ADD CONSTRAINT "link_reader_articles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_reader_articles" ADD CONSTRAINT "link_reader_articles_link_id_user_id_fkey" FOREIGN KEY ("link_id", "user_id") REFERENCES "links"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
