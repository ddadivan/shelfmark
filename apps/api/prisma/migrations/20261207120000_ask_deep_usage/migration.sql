-- Ask as a chat with tools (#521, ADR 0055): questions answered by the deeper model per user and UTC
-- day, counted inside the question counter. Counts only: no question, answer or tool call is stored.

-- AlterTable
ALTER TABLE "ai_ask_usage" ADD COLUMN     "deep" INTEGER NOT NULL DEFAULT 0,
ADD CONSTRAINT "ai_ask_usage_deep_check" CHECK ("deep" >= 0);
