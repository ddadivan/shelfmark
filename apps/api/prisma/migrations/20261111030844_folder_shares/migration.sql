-- Public collections (#276, ADR 0040): one row per shared folder. Additive only (a new table).
-- Deleting the folder or the user cascades to the row. The token CHECK is hand-written (Prisma
-- cannot express it): exactly 22 base64url characters, the encoding of 16 random bytes.

-- CreateTable
CREATE TABLE "folder_shares" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "folder_id" UUID NOT NULL,
    "token" VARCHAR(22) NOT NULL,
    "show_notes" BOOLEAN NOT NULL DEFAULT false,
    "token_created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "folder_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "folder_shares_folder_id_key" ON "folder_shares"("folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "folder_shares_token_key" ON "folder_shares"("token");

-- CreateIndex
CREATE INDEX "folder_shares_user_id_idx" ON "folder_shares"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "folder_shares_folder_id_user_id_key" ON "folder_shares"("folder_id", "user_id");

-- AddForeignKey
ALTER TABLE "folder_shares" ADD CONSTRAINT "folder_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folder_shares" ADD CONSTRAINT "folder_shares_folder_id_user_id_fkey" FOREIGN KEY ("folder_id", "user_id") REFERENCES "folders"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written constraints.
ALTER TABLE "folder_shares" ADD CONSTRAINT "folder_shares_token_format_check" CHECK ("token" ~ '^[A-Za-z0-9_-]{22}$');
