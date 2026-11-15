-- Folder cover (#418). Expand only: a new nullable column, no data is rewritten.
-- The id of the link whose preview image is the folder's cover. No foreign key: the API writes only
-- one of the user's live links directly in the folder, and answers the cover only while that is
-- still true (a link moved away, trashed or deleted simply shows no cover).

-- AlterTable
ALTER TABLE "folders" ADD COLUMN "cover_link_id" UUID;
