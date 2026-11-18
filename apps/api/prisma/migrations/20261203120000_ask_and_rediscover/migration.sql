-- AI-4 Ask your shelf and Rediscover (#393, ADR 0052): the Ask switch and its one-question lease, the
-- daily question counter, and the Rediscover "Not interested" and weekly dismiss rows. Counts and
-- library preferences only: no question, answer or source list is ever stored.

-- AlterTable: on for every row, existing ones too (open question 4 of the AI-4 plan: same processor
-- as AI-1, runs only when the user asks).
ALTER TABLE "ai_settings" ADD COLUMN     "ask" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ask_lease_until" TIMESTAMPTZ(3);

-- CreateTable: questions per user and UTC day; the AI sweep deletes rows older than 62 days.
CREATE TABLE "ai_ask_usage" (
    "user_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "questions" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ai_ask_usage_pkey" PRIMARY KEY ("user_id","day"),
    CONSTRAINT "ai_ask_usage_questions_check" CHECK ("questions" >= 0)
);

-- CreateTable: "Not interested" in the Rediscover block, for good (cascades with the link).
CREATE TABLE "rediscover_hidden" (
    "user_id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rediscover_hidden_pkey" PRIMARY KEY ("user_id","link_id")
);

-- CreateTable: the ISO week (`2026-W47`) the block was dismissed for.
CREATE TABLE "rediscover_state" (
    "user_id" UUID NOT NULL,
    "dismissed_week" CHAR(8),

    CONSTRAINT "rediscover_state_pkey" PRIMARY KEY ("user_id"),
    CONSTRAINT "rediscover_state_dismissed_week_check" CHECK ("dismissed_week" ~ '^[0-9]{4}-W[0-9]{2}$')
);

-- AddForeignKey
ALTER TABLE "ai_ask_usage" ADD CONSTRAINT "ai_ask_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rediscover_hidden" ADD CONSTRAINT "rediscover_hidden_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rediscover_hidden" ADD CONSTRAINT "rediscover_hidden_link_id_user_id_fkey" FOREIGN KEY ("link_id", "user_id") REFERENCES "links"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rediscover_state" ADD CONSTRAINT "rediscover_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
