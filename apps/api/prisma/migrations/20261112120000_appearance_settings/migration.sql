-- Settings › Appearance (#273): theme, the Custom theme and Animations on the account. Expand
-- only: new columns with defaults, no data rewritten. The allow-lists mirror the contracts
-- (THEME_PREFERENCE, CUSTOM_THEME_*, MOTION_PREFERENCE); a background must belong to its base.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN "custom_theme_base" TEXT NOT NULL DEFAULT 'light',
ADD COLUMN "custom_theme_accent" TEXT NOT NULL DEFAULT 'ocean',
ADD COLUMN "custom_theme_background" TEXT NOT NULL DEFAULT 'paper',
ADD COLUMN "custom_theme_corners" TEXT NOT NULL DEFAULT 'soft',
ADD COLUMN "motion" TEXT NOT NULL DEFAULT 'system';

-- Hand-written constraints (Prisma cannot express CHECKs; its drift check ignores them).
ALTER TABLE "users" ADD CONSTRAINT "users_theme_check" CHECK ("theme" IN ('system', 'light', 'dark', 'custom'));
ALTER TABLE "users" ADD CONSTRAINT "users_motion_check" CHECK ("motion" IN ('system', 'full', 'reduced'));
ALTER TABLE "users" ADD CONSTRAINT "users_custom_theme_accent_check" CHECK ("custom_theme_accent" IN ('sage', 'ocean', 'plum', 'clay', 'amber', 'rose', 'teal', 'graphite'));
ALTER TABLE "users" ADD CONSTRAINT "users_custom_theme_corners_check" CHECK ("custom_theme_corners" IN ('round', 'soft', 'square'));
ALTER TABLE "users" ADD CONSTRAINT "users_custom_theme_background_check" CHECK (
  ("custom_theme_base" = 'light' AND "custom_theme_background" IN ('stone', 'paper', 'mist', 'white'))
  OR ("custom_theme_base" = 'dark' AND "custom_theme_background" IN ('graphite', 'ink', 'forest', 'black'))
);
