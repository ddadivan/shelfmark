-- "What's new" (#424): the newest release a user has seen the highlights of. Expand only: a new
-- nullable column, no data is rewritten. NULL means not written yet: the web app writes the current
-- release for a new account (onboarding still due) and shows "What's new" to an existing one. The
-- CHECK mirrors RELEASE_VERSION_PATTERN in the contracts (plain x.y.z, up to 3 digits a part).

ALTER TABLE "users" ADD COLUMN "whats_new_seen" TEXT;
ALTER TABLE "users" ADD CONSTRAINT "users_whats_new_seen_check" CHECK (
  "whats_new_seen" IS NULL OR "whats_new_seen" ~ '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'
);
