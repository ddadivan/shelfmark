-- Import of bookmark files (#387, ADR 0056): one row per import, and the rows it created carry its
-- id so Undo is exact. `targetFolderId` has no foreign key on purpose (like users.new_links_folder_id):
-- the API answers it only while it is a live own folder.

-- AlterTable
ALTER TABLE "folders" ADD COLUMN     "import_id" UUID;

-- AlterTable
ALTER TABLE "links" ADD COLUMN     "import_id" UUID;

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "import_id" UUID;

-- CreateTable
CREATE TABLE "imports" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source" VARCHAR(16) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),
    "undone_at" TIMESTAMPTZ(3),
    "links_created" INTEGER NOT NULL DEFAULT 0,
    "folders_created" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "target_folder_id" UUID,

    CONSTRAINT "imports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "imports_user_id_created_at_idx" ON "imports"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imports" ADD CONSTRAINT "imports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- The set of sources is closed (IMPORT_SOURCE in the contracts); the counters are never negative.
ALTER TABLE "imports" ADD CONSTRAINT "imports_source_check" CHECK ("source" IN ('browser'));
ALTER TABLE "imports" ADD CONSTRAINT "imports_counts_check" CHECK (
  "links_created" >= 0 AND "folders_created" >= 0 AND "skipped" >= 0 AND "failed" >= 0
);

-- Partial indexes: only imported rows are indexed, every other row costs nothing.
CREATE INDEX "links_import_id_idx" ON "links"("import_id") WHERE "import_id" IS NOT NULL;
CREATE INDEX "folders_import_id_idx" ON "folders"("import_id") WHERE "import_id" IS NOT NULL;
CREATE INDEX "tags_import_id_idx" ON "tags"("import_id") WHERE "import_id" IS NOT NULL;
