-- Settings › Appearance extras (#285): text size, font, density and the card options on the
-- account. Expand only: new columns with defaults, no data rewritten. The allow-lists mirror the
-- contracts (TEXT_SIZE, APP_FONT, DENSITY, CARD_PREVIEW).

-- AlterTable
ALTER TABLE "users" ADD COLUMN "text_size" TEXT NOT NULL DEFAULT 'm',
ADD COLUMN "font" TEXT NOT NULL DEFAULT 'onest',
ADD COLUMN "density" TEXT NOT NULL DEFAULT 'comfortable',
ADD COLUMN "card_preview" TEXT NOT NULL DEFAULT 'large',
ADD COLUMN "card_site" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "card_notes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "card_tags" BOOLEAN NOT NULL DEFAULT true;

-- Hand-written constraints (Prisma cannot express CHECKs; its drift check ignores them).
ALTER TABLE "users" ADD CONSTRAINT "users_text_size_check" CHECK ("text_size" IN ('s', 'm', 'l', 'xl'));
ALTER TABLE "users" ADD CONSTRAINT "users_font_check" CHECK ("font" IN ('onest', 'system', 'readable'));
ALTER TABLE "users" ADD CONSTRAINT "users_density_check" CHECK ("density" IN ('comfortable', 'compact'));
ALTER TABLE "users" ADD CONSTRAINT "users_card_preview_check" CHECK ("card_preview" IN ('large', 'small', 'off'));
