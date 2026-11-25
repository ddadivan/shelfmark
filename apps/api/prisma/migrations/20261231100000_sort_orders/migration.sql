-- More sort orders (Shelf redesign): Site A-Z, Recently edited, Favorites first, Recently opened.
-- Expand only: one column with a default, two indexes, and a relaxed CHECK.
--
-- links.host: the site a link is sorted by (lower case, a leading www. dropped), the SQL twin of
-- `linkSiteKey` in contracts. The service keeps it on create and on a URL change. Recently opened
-- uses the existing links.last_opened_at (kept updated where opens are recorded); Recently edited
-- uses links.updated_at.

-- AlterTable
ALTER TABLE "links" ADD COLUMN     "host" TEXT NOT NULL DEFAULT '';

-- Backfill from the stored URL (scheme://[user@]host[:port]/...).
UPDATE "links"
SET "host" = COALESCE(
  regexp_replace(
    lower(substring("url" from '^[A-Za-z][A-Za-z0-9+.-]*://(?:[^/?#@]*@)?([^/?#:]+)')),
    '^www\.',
    ''
  ),
  ''
);

-- CreateIndex
CREATE INDEX "links_user_id_host_title_sort_key_id_idx" ON "links"("user_id", "host", "title_sort_key", "id");

-- CreateIndex
CREATE INDEX "links_user_id_updated_at_id_idx" ON "links"("user_id", "updated_at", "id");

-- LIBRARY_SORT (contracts): the account's default sort. The first check missed `titleDesc`.
ALTER TABLE "users" DROP CONSTRAINT "users_default_sort_check";
ALTER TABLE "users" ADD CONSTRAINT "users_default_sort_check" CHECK (
  "default_sort" IN ('newest', 'oldest', 'opened', 'edited', 'title', 'titleDesc', 'site', 'favorites')
);
