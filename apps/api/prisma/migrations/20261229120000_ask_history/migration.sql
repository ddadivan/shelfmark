-- Ask history (ADR 0055 amendment, 2026-11-24). Expand only: the "Keep Ask history" switch (on for
-- every row, existing ones too) and three new tables of the user's stored conversations, turns and
-- the turns' link refs (ids only, same-user composite FKs with cascade).
-- AlterTable
ALTER TABLE "ai_settings" ADD COLUMN     "ask_history" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ask_conversations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ask_conversations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ask_conversations_title_check" CHECK (char_length("title") BETWEEN 1 AND 120)
);

-- CreateTable
CREATE TABLE "ask_conversation_turns" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "question" VARCHAR(500) NOT NULL,
    "answer" TEXT NOT NULL,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "cards" JSONB NOT NULL DEFAULT '[]',
    "not_found" BOOLEAN NOT NULL DEFAULT false,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "depth" VARCHAR(8) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ask_conversation_turns_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ask_conversation_turns_question_check" CHECK (char_length("question") BETWEEN 1 AND 500),
    CONSTRAINT "ask_conversation_turns_answer_check" CHECK (char_length("answer") <= 4000),
    CONSTRAINT "ask_conversation_turns_position_check" CHECK ("position" >= 0),
    CONSTRAINT "ask_conversation_turns_steps_check" CHECK (jsonb_typeof("steps") = 'array'),
    CONSTRAINT "ask_conversation_turns_cards_check" CHECK (jsonb_typeof("cards") = 'array')
);

-- CreateTable
CREATE TABLE "ask_conversation_turn_links" (
    "turn_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "n" SMALLINT NOT NULL,
    "link_id" UUID NOT NULL,

    CONSTRAINT "ask_conversation_turn_links_pkey" PRIMARY KEY ("turn_id","n"),
    CONSTRAINT "ask_conversation_turn_links_n_check" CHECK ("n" BETWEEN 1 AND 99)
);

-- CreateIndex
CREATE INDEX "ask_conversations_user_id_updated_at_id_idx" ON "ask_conversations"("user_id", "updated_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "ask_conversations_updated_at_idx" ON "ask_conversations"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "ask_conversations_id_user_id_key" ON "ask_conversations"("id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ask_conversation_turns_id_user_id_key" ON "ask_conversation_turns"("id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ask_conversation_turns_conversation_id_position_key" ON "ask_conversation_turns"("conversation_id", "position");

-- CreateIndex
CREATE INDEX "ask_conversation_turn_links_link_id_user_id_idx" ON "ask_conversation_turn_links"("link_id", "user_id");

-- AddForeignKey
ALTER TABLE "ask_conversations" ADD CONSTRAINT "ask_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ask_conversation_turns" ADD CONSTRAINT "ask_conversation_turns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ask_conversation_turns" ADD CONSTRAINT "ask_conversation_turns_conversation_id_user_id_fkey" FOREIGN KEY ("conversation_id", "user_id") REFERENCES "ask_conversations"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ask_conversation_turn_links" ADD CONSTRAINT "ask_conversation_turn_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ask_conversation_turn_links" ADD CONSTRAINT "ask_conversation_turn_links_turn_id_user_id_fkey" FOREIGN KEY ("turn_id", "user_id") REFERENCES "ask_conversation_turns"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ask_conversation_turn_links" ADD CONSTRAINT "ask_conversation_turn_links_link_id_user_id_fkey" FOREIGN KEY ("link_id", "user_id") REFERENCES "links"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;
