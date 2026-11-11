-- Feedback messages (#272): the same table as the ratings. Expand only: new nullable columns (status
-- has a default), `milestone` becomes nullable, one CHECK is relaxed for message rows, no data moves.
-- A rating row keeps its shape (milestone set, kind NULL); a message row has a kind, no milestone
-- and no score, and `comment` holds the text. NULL milestones never collide in the unique index
-- ("feedback_user_id_milestone_key"). The CHECKs are hand-written (Prisma cannot express them).

-- AlterTable
ALTER TABLE "feedback" ALTER COLUMN "milestone" DROP NOT NULL,
ADD COLUMN     "client_app_version" VARCHAR(300),
ADD COLUMN     "client_user_agent" VARCHAR(300),
ADD COLUMN     "kind" TEXT,
ADD COLUMN     "reply" TEXT,
ADD COLUMN     "screenshot" BYTEA,
ADD COLUMN     "screenshot_type" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'received';

-- CreateIndex
CREATE INDEX "feedback_user_id_created_at_idx" ON "feedback"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "feedback_created_at_id_idx" ON "feedback"("created_at" DESC, "id" DESC);

-- A message row has no score and its text is the comment: the old "no comment without a score" rule
-- now only applies to rating rows.
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_no_comment_without_score_check";
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_no_comment_without_score_check" CHECK ("kind" IS NOT NULL OR "score" IS NOT NULL OR "comment" IS NULL);

-- Hand-written constraints.
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_kind_check" CHECK ("kind" IS NULL OR "kind" IN ('idea', 'problem', 'other'));
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_status_check" CHECK ("status" IN ('received', 'planned', 'in-progress', 'done', 'not-planned'));
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_reply_length_check" CHECK ("reply" IS NULL OR char_length("reply") <= 2000);
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_screenshot_type_check" CHECK ("screenshot_type" IS NULL OR "screenshot_type" IN ('image/png', 'image/jpeg', 'image/webp'));
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_screenshot_pair_check" CHECK (("screenshot" IS NULL) = ("screenshot_type" IS NULL));
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_screenshot_size_check" CHECK ("screenshot" IS NULL OR octet_length("screenshot") <= 2097152);
-- A row is a rating or a message, never both.
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_row_shape_check" CHECK (
  ("kind" IS NULL AND "milestone" IS NOT NULL AND "screenshot" IS NULL)
  OR ("kind" IS NOT NULL AND "milestone" IS NULL AND "score" IS NULL AND "comment" IS NOT NULL AND char_length(btrim("comment")) >= 1)
);
