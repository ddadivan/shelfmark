-- Own accent colour of the Custom theme (#315): the accent is a curated name or a lower-case
-- `#rrggbb` (HEX_COLOUR_PATTERN in the contracts). Expand only: the CHECK accepts more values,
-- no data is rewritten. The client draws an own colour in its nearest shade that keeps WCAG AA.

ALTER TABLE "users" DROP CONSTRAINT "users_custom_theme_accent_check";
ALTER TABLE "users" ADD CONSTRAINT "users_custom_theme_accent_check" CHECK (
  "custom_theme_accent" IN ('sage', 'ocean', 'plum', 'clay', 'amber', 'rose', 'teal', 'graphite')
  OR "custom_theme_accent" ~ '^#[0-9a-f]{6}$'
);
