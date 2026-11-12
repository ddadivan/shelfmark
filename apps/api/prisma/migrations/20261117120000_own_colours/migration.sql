-- Own colours (#335). Expand only: the CHECKs accept more values, no data is rewritten.
-- 1. A folder colour may be an own lower-case `#rrggbb` (HEX_COLOUR_PATTERN in the contracts).
-- 2. The Custom theme background may be an own `#rrggbb` on either base.
-- 3. The account keeps its own colours as swatches (`custom_colours`, at most 12 hex values).

ALTER TABLE "folders" DROP CONSTRAINT "folders_colour_check";
ALTER TABLE "folders" ADD CONSTRAINT "folders_colour_check" CHECK (
  "colour" IN ('graphite', 'sage', 'ocean', 'plum', 'clay', 'amber', 'rose', 'teal')
  OR "colour" ~ '^#[0-9a-f]{6}$'
);

ALTER TABLE "users" DROP CONSTRAINT "users_custom_theme_background_check";
ALTER TABLE "users" ADD CONSTRAINT "users_custom_theme_background_check" CHECK (
  ("custom_theme_base" = 'light' AND "custom_theme_background" IN ('stone', 'paper', 'mist', 'white'))
  OR ("custom_theme_base" = 'dark' AND "custom_theme_background" IN ('graphite', 'ink', 'forest', 'black'))
  OR "custom_theme_background" ~ '^#[0-9a-f]{6}$'
);

ALTER TABLE "users" ADD COLUMN "custom_colours" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD CONSTRAINT "users_custom_colours_check" CHECK (
  cardinality("custom_colours") <= 12
  AND array_to_string("custom_colours", ',') ~ '^(#[0-9a-f]{6}(,#[0-9a-f]{6})*)?$'
);
