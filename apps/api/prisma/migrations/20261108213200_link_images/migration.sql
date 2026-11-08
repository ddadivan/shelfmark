-- CreateTable
CREATE TABLE "link_images" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "content_type" VARCHAR(64) NOT NULL,
    "bytes" BYTEA NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "link_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "link_images_user_id_idx" ON "link_images"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "link_images_link_id_kind_key" ON "link_images"("link_id", "kind");

-- AddForeignKey
ALTER TABLE "link_images" ADD CONSTRAINT "link_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "link_images" ADD CONSTRAINT "link_images_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written constraints (Prisma cannot express CHECKs): closed kind set and the 64 KB cap of ADR 0027.
ALTER TABLE "link_images" ADD CONSTRAINT "link_images_kind_check" CHECK ("kind" IN ('favicon', 'preview'));
ALTER TABLE "link_images" ADD CONSTRAINT "link_images_bytes_size_check" CHECK (octet_length("bytes") <= 65536);
