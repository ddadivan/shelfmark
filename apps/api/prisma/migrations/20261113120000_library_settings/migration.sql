-- Settings › Library (#284): Viewing and Saving on the account. Expand only: new columns with
-- defaults, no data rewritten. The allow-lists mirror the contracts (LIBRARY_VIEW, LIBRARY_SORT,
-- LINK_OPEN_TARGET). `new_links_folder_id` has no foreign key on purpose: the folder can be in
-- Trash (still a row) or deleted for good, and both read as Unsorted; the API checks on write that
-- it is a live folder of the same user and answers NULL on read once it is not.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "default_view" TEXT NOT NULL DEFAULT 'cards',
ADD COLUMN "default_sort" TEXT NOT NULL DEFAULT 'newest',
ADD COLUMN "open_links_in" TEXT NOT NULL DEFAULT 'new-tab',
ADD COLUMN "show_folder_counts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "new_links_folder_id" UUID,
ADD COLUMN "warn_duplicates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "fetch_previews" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "keep_query" BOOLEAN NOT NULL DEFAULT false;

-- Hand-written constraints (Prisma cannot express CHECKs; its drift check ignores them).
ALTER TABLE "users" ADD CONSTRAINT "users_default_view_check" CHECK ("default_view" IN ('cards', 'list'));
ALTER TABLE "users" ADD CONSTRAINT "users_default_sort_check" CHECK ("default_sort" IN ('newest', 'oldest', 'title'));
ALTER TABLE "users" ADD CONSTRAINT "users_open_links_in_check" CHECK ("open_links_in" IN ('new-tab', 'same-tab'));
