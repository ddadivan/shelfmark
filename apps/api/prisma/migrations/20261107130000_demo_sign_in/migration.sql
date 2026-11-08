-- Demo sign-in (#67, ADR 0034). Expand step, additive only: one nullable column and two partial
-- indexes (Prisma cannot express a WHERE clause, so they live in SQL only). Regular users are
-- never touched: both indexes are restricted to demo rows.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "demo_source_hash" TEXT;

-- The daily cleanup and the active-demo cap look up demo users by expiry.
CREATE INDEX "users_demo_expires_at_demo_idx" ON "users"("demo_expires_at") WHERE "is_demo";

-- The per-IP quota counts recent demo users of one source hash.
CREATE INDEX "users_demo_source_hash_created_at_demo_idx" ON "users"("demo_source_hash", "created_at") WHERE "is_demo";
