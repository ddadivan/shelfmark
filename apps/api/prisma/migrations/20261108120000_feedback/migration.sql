-- App rating (#100): one row per user and milestone. Additive only (a new table). User delete
-- cascades to the rows. The CHECKs are hand-written (Prisma cannot express them).

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "milestone" VARCHAR(10) NOT NULL,
    "score" SMALLINT,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feedback_user_id_milestone_key" ON "feedback"("user_id", "milestone");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written constraints.
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_milestone_check" CHECK ("milestone" IN ('day3', 'week1', 'month1', 'year1'));
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_score_check" CHECK ("score" IS NULL OR "score" BETWEEN 1 AND 10);
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_comment_length_check" CHECK ("comment" IS NULL OR char_length("comment") <= 2000);
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_no_comment_without_score_check" CHECK ("score" IS NOT NULL OR "comment" IS NULL);
