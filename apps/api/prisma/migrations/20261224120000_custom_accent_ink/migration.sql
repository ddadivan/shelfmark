-- Shelf accent "Ink" (05-settings Accent: Graphite, Ink, Sage; tokens.json `accent-ink`). Expand
-- only: the CHECK accepts one more curated name, no data is rewritten.

ALTER TABLE "users" DROP CONSTRAINT "users_custom_theme_accent_check";
ALTER TABLE "users" ADD CONSTRAINT "users_custom_theme_accent_check" CHECK (
  "custom_theme_accent" IN ('sage', 'ocean', 'plum', 'clay', 'amber', 'rose', 'teal', 'graphite', 'ink')
  OR "custom_theme_accent" ~ '^#[0-9a-f]{6}$'
);
