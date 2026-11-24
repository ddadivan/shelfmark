-- Reading settings of Reader (Shelf Link page) on the account: theme, font, text size, line spacing
-- and line width. Expand only: new columns with defaults, no data rewritten; `reader_saved_at` stays
-- NULL until the first write, so the web keeps settings a browser already had. The allow-lists mirror
-- the contracts (READER_PAGE_THEME, READER_TEXT_FONT, READER_TEXT_SIZE_RANGE, READER_TEXT_SPACING,
-- READER_TEXT_MEASURE).

-- AlterTable
ALTER TABLE "users" ADD COLUMN "reader_theme" TEXT,
ADD COLUMN "reader_font" TEXT NOT NULL DEFAULT 'sans',
ADD COLUMN "reader_size" SMALLINT NOT NULL DEFAULT 18,
ADD COLUMN "reader_line_spacing" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN "reader_line_width" TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN "reader_saved_at" TIMESTAMPTZ(3);

-- Hand-written constraints (Prisma cannot express CHECKs; its drift check ignores them).
ALTER TABLE "users" ADD CONSTRAINT "users_reader_theme_check" CHECK ("reader_theme" IS NULL OR "reader_theme" IN ('light', 'sepia', 'dark', 'black'));
ALTER TABLE "users" ADD CONSTRAINT "users_reader_font_check" CHECK ("reader_font" IN ('sans', 'serif', 'readable'));
ALTER TABLE "users" ADD CONSTRAINT "users_reader_size_check" CHECK ("reader_size" BETWEEN 14 AND 24);
ALTER TABLE "users" ADD CONSTRAINT "users_reader_line_spacing_check" CHECK ("reader_line_spacing" IN ('compact', 'normal', 'relaxed'));
ALTER TABLE "users" ADD CONSTRAINT "users_reader_line_width_check" CHECK ("reader_line_width" IN ('narrow', 'normal', 'wide'));
