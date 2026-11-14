-- Feedback with up to three screenshots (#352). The image moves out of `feedback.screenshot` /
-- `screenshot_type` into its own table: one row per screenshot, `position` 0 to 2 in the order
-- they were attached. Existing screenshots are copied as position 0, then the old columns and their
-- CHECKs go (the API that reads the new table ships in the same deploy). The CHECKs are hand-written
-- (Prisma cannot express them).

-- CreateTable
CREATE TABLE "feedback_screenshots" (
    "feedback_id" UUID NOT NULL,
    "position" SMALLINT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "feedback_screenshots_pkey" PRIMARY KEY ("feedback_id","position")
);

-- AddForeignKey
ALTER TABLE "feedback_screenshots" ADD CONSTRAINT "feedback_screenshots_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written constraints: the same rules the old columns had, per screenshot.
ALTER TABLE "feedback_screenshots" ADD CONSTRAINT "feedback_screenshots_position_check" CHECK ("position" BETWEEN 0 AND 2);
ALTER TABLE "feedback_screenshots" ADD CONSTRAINT "feedback_screenshots_type_check" CHECK ("type" IN ('image/png', 'image/jpeg', 'image/webp'));
ALTER TABLE "feedback_screenshots" ADD CONSTRAINT "feedback_screenshots_size_check" CHECK (octet_length("bytes") BETWEEN 1 AND 2097152);

-- Copy the existing screenshots (the old pair CHECK guarantees bytes and type come together).
INSERT INTO "feedback_screenshots" ("feedback_id", "position", "bytes", "type")
SELECT "id", 0, "screenshot", "screenshot_type"
FROM "feedback"
WHERE "screenshot" IS NOT NULL AND octet_length("screenshot") >= 1;

-- The rating-or-message shape no longer mentions the screenshot column.
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_row_shape_check";
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_row_shape_check" CHECK (
  ("kind" IS NULL AND "milestone" IS NOT NULL)
  OR ("kind" IS NOT NULL AND "milestone" IS NULL AND "score" IS NULL AND "comment" IS NOT NULL AND char_length(btrim("comment")) >= 1)
);
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_screenshot_type_check";
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_screenshot_pair_check";
ALTER TABLE "feedback" DROP CONSTRAINT "feedback_screenshot_size_check";

-- AlterTable
ALTER TABLE "feedback" DROP COLUMN "screenshot",
DROP COLUMN "screenshot_type";
