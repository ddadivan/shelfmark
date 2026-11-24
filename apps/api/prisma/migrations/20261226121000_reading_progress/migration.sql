-- Reader progress (Revisit's "Continue reading"): how far the user read a link's Reader text, one row
-- per link, same-user composite FK, cascades with the link and the account. New table only.

-- CreateTable
CREATE TABLE "reading_progress" (
    "link_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "fraction" REAL NOT NULL,
    "minutes_left" SMALLINT NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("link_id"),
    CONSTRAINT "reading_progress_fraction_check" CHECK ("fraction" >= 0 AND "fraction" <= 1),
    CONSTRAINT "reading_progress_minutes_left_check" CHECK ("minutes_left" >= 0 AND "minutes_left" <= 999)
);

-- CreateIndex
CREATE INDEX "reading_progress_user_id_updated_at_idx" ON "reading_progress"("user_id", "updated_at");

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_link_id_user_id_fkey" FOREIGN KEY ("link_id", "user_id") REFERENCES "links"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
