-- Trigram search on links.title (PROJECT.md 6.1). Neon, postgres:17-alpine and PGlite all ship pg_trgm.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Delete behaviour (PROJECT.md 4 story 11, 6.2): user delete cascades to folders, links and tags;
-- folder delete cascades to subfolders ("with all subfolders") and sets links.folder_id to NULL
-- (Unsorted); link and tag delete cascade to link_tags.
-- mode=delete-links must delete the links of the WHOLE subtree (recursive CTE over folders) in one
-- transaction before the folder delete; otherwise those links would silently move to Unsorted.
-- Same-user integrity: folders.parent_id uses a composite FK (parent_id, user_id); link.folder_id and
-- link_tags are checked in the service layer (see schema.prisma).

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "demo_expires_at" TIMESTAMPTZ(3),
ADD COLUMN     "onboarding_completed_at" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "folders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "folder_id" UUID,
    "url" VARCHAR(2048) NOT NULL,
    "normalized_url" VARCHAR(2048) NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "note" TEXT,
    "favicon_url" VARCHAR(2048),
    "image_url" VARCHAR(2048),
    "is_favorite" BOOLEAN NOT NULL DEFAULT false,
    "last_opened_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "link_tags" (
    "link_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "link_tags_pkey" PRIMARY KEY ("link_id","tag_id")
);

-- CreateIndex
CREATE INDEX "folders_user_id_parent_id_idx" ON "folders"("user_id", "parent_id");

-- CreateIndex
CREATE INDEX "folders_parent_id_idx" ON "folders"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "folders_id_user_id_key" ON "folders"("id", "user_id");

-- CreateIndex
CREATE INDEX "links_user_id_created_at_idx" ON "links"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "links_user_id_normalized_url_idx" ON "links"("user_id", "normalized_url");

-- CreateIndex
CREATE INDEX "links_user_id_last_opened_at_idx" ON "links"("user_id", "last_opened_at");

-- CreateIndex
CREATE INDEX "links_folder_id_idx" ON "links"("folder_id");

-- CreateIndex
CREATE INDEX "links_title_trgm_idx" ON "links" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "tags_user_id_name_key" ON "tags"("user_id", "name");

-- CreateIndex
CREATE INDEX "link_tags_tag_id_idx" ON "link_tags"("tag_id");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_user_id_fkey" FOREIGN KEY ("parent_id", "user_id") REFERENCES "folders"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_tags" ADD CONSTRAINT "link_tags_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_tags" ADD CONSTRAINT "link_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written constraints (Prisma cannot express CHECKs, expression or partial indexes; its drift
-- check ignores them, verified by `nx run api:db-check`).

-- Note length is also validated by the DTO (LINK_LIMIT.NoteMax); keep the database consistent.
ALTER TABLE "links" ADD CONSTRAINT "links_note_length_check" CHECK ("note" IS NULL OR char_length("note") <= 2000);

-- Only http(s) URLs are stored. normalized_url is derived (lowercased host etc.) and has no check.
ALTER TABLE "links" ADD CONSTRAINT "links_url_scheme_check" CHECK ("url" ~* '^https?://');
ALTER TABLE "links" ADD CONSTRAINT "links_favicon_url_scheme_check" CHECK ("favicon_url" IS NULL OR "favicon_url" ~* '^https?://');
ALTER TABLE "links" ADD CONSTRAINT "links_image_url_scheme_check" CHECK ("image_url" IS NULL OR "image_url" ~* '^https?://');

-- Names and titles are never blank.
ALTER TABLE "links" ADD CONSTRAINT "links_title_not_blank_check" CHECK (char_length(btrim("title")) > 0);
ALTER TABLE "folders" ADD CONSTRAINT "folders_name_not_blank_check" CHECK (char_length(btrim("name")) > 0);
ALTER TABLE "tags" ADD CONSTRAINT "tags_name_not_blank_check" CHECK (char_length(btrim("name")) > 0);

-- A folder is never its own parent (longer cycles are rejected by the service).
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_not_self_check" CHECK ("parent_id" <> "id");

-- Tag names are unique per user case-insensitively ("TS" and "ts" are one tag, update-tag-request contract).
-- The plain unique (user_id, name) from schema.prisma stays for Prisma's @@unique lookups.
CREATE UNIQUE INDEX "tags_user_id_lower_name_key" ON "tags"("user_id", lower("name"));

-- A demo user always has an expiry; the partial index serves the cleanup of expired demo users.
ALTER TABLE "users" ADD CONSTRAINT "users_demo_expiry_check" CHECK (NOT "is_demo" OR "demo_expires_at" IS NOT NULL);
CREATE INDEX "users_demo_expires_at_idx" ON "users"("demo_expires_at") WHERE "is_demo";
