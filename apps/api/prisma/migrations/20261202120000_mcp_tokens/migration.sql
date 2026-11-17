-- MCP server (#395, ADR 0053): personal read-only tokens, stored as a SHA-256 digest, and their daily
-- call counts. Expand only: two new tables.

-- CreateTable
CREATE TABLE "mcp_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(40) NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "last4" CHAR(4) NOT NULL,
    "include_notes" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(3),

    CONSTRAINT "mcp_tokens_pkey" PRIMARY KEY ("id"),
    -- The API trims the name and refuses control characters; a blank name never reaches the table.
    CONSTRAINT "mcp_tokens_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 40),
    CONSTRAINT "mcp_tokens_token_hash_check" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "mcp_tokens_last4_check" CHECK ("last4" ~ '^[A-Za-z0-9_-]{4}$')
);

-- CreateTable
CREATE TABLE "mcp_token_usage" (
    "token_id" UUID NOT NULL,
    "day" DATE NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "mcp_token_usage_pkey" PRIMARY KEY ("token_id","day"),
    CONSTRAINT "mcp_token_usage_calls_check" CHECK ("calls" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "mcp_tokens_token_hash_key" ON "mcp_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "mcp_tokens_user_id_idx" ON "mcp_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "mcp_tokens" ADD CONSTRAINT "mcp_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcp_token_usage" ADD CONSTRAINT "mcp_token_usage_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "mcp_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
