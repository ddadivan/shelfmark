-- Rating prompt views (#437): how often and when the rating prompt was shown to a user, one row
-- per user and milestone. Additive only (a new table). Read only in the database (the author's view
-- "admin_user_overview"), never by an API. Deleting the user deletes the rows. The CHECKs are
-- hand-written (Prisma cannot express them): the milestone set is the one of "feedback".

-- CreateTable
CREATE TABLE "rating_prompt_views" (
    "user_id" UUID NOT NULL,
    "milestone" VARCHAR(10) NOT NULL,
    "shown_count" INTEGER NOT NULL DEFAULT 1,
    "first_shown_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_shown_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rating_prompt_views_pkey" PRIMARY KEY ("user_id","milestone")
);

-- AddForeignKey
ALTER TABLE "rating_prompt_views" ADD CONSTRAINT "rating_prompt_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rating_prompt_views" ADD CONSTRAINT "rating_prompt_views_milestone_check" CHECK ("milestone" IN ('day3', 'week1', 'month1', 'year1'));
ALTER TABLE "rating_prompt_views" ADD CONSTRAINT "rating_prompt_views_shown_count_check" CHECK ("shown_count" > 0);
