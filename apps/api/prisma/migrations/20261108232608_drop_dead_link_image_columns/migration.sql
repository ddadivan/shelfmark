/*
  Warnings:

  - You are about to drop the column `favicon_url` on the `links` table. All the data in the column will be lost.
  - You are about to drop the column `image_url` on the `links` table. All the data in the column will be lost.

*/
-- The columns were never written or read after ADR 0027 (the response derives its paths from
-- link_images). Their scheme CHECKs from link_models go with them; dropped explicitly for clarity.
ALTER TABLE "links" DROP CONSTRAINT "links_favicon_url_scheme_check";
ALTER TABLE "links" DROP CONSTRAINT "links_image_url_scheme_check";

-- AlterTable
ALTER TABLE "links" DROP COLUMN "favicon_url",
DROP COLUMN "image_url",
ADD COLUMN     "capture_attempted_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP;
-- Existing rows get the migration time: none of them is "pending" for the lazy re-capture.
