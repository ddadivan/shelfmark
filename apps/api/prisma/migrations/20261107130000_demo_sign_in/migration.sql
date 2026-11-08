-- Demo sign-in (#67, ADR 0034). Expand step, additive only: two nullable columns and one partial
-- index (Prisma cannot express a WHERE clause, so it lives in SQL only). Regular users are never
-- touched. The expiry lookup of the cleanup already has `users_demo_expires_at_idx`.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "demo_source_hash" TEXT,
ADD COLUMN "demo_network_hash" TEXT;

-- The per-source quotas count recent demo users of one hash (client /64 or IPv4, and the /48 network).
CREATE INDEX "users_demo_source_hash_created_at_demo_idx" ON "users"("demo_source_hash", "created_at") WHERE "is_demo";
CREATE INDEX "users_demo_network_hash_created_at_demo_idx" ON "users"("demo_network_hash", "created_at") WHERE "is_demo";
