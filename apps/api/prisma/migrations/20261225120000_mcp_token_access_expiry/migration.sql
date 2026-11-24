-- Personal MCP tokens get an access level and an expiry (Shelf 15-tools "New token": Access
-- Read only / Read and save, Expires 30 days / 90 days / Never). Expand only: existing tokens
-- become `read` and never expire, which is what they could do before.

ALTER TABLE "mcp_tokens" ADD COLUMN "access" VARCHAR(8) NOT NULL DEFAULT 'read';
ALTER TABLE "mcp_tokens" ADD COLUMN "expires_at" TIMESTAMPTZ(3);
ALTER TABLE "mcp_tokens" ADD CONSTRAINT "mcp_tokens_access_check" CHECK ("access" IN ('read', 'save'));
