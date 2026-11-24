-- Saved views (Shelf 13-views): a glyph per view and pinning a view to the sidebar. Expand only:
-- two nullable columns. The query's new `saved` and `favorite` fields live in the jsonb and are
-- read with defaults (`parseStoredQuery`), so no row is rewritten.

ALTER TABLE "saved_views" ADD COLUMN     "icon" VARCHAR(16),
ADD COLUMN     "pinned_position" SMALLINT;

-- SAVED_VIEW_ICON (contracts).
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_icon_check" CHECK (
  "icon" IS NULL
  OR "icon" IN ('bookmark', 'star', 'play', 'text-size', 'hash', 'bell', 'search', 'cards')
);
