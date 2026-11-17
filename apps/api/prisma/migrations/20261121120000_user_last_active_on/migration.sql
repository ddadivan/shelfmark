-- Admin usage stats (#333, ADR 0045): the UTC day of a user's last authenticated request. One date,
-- no time, page or action; it goes with the user row. Additive and nullable (expand only).

-- AlterTable
ALTER TABLE "users" ADD COLUMN "last_active_on" DATE;

-- Hand-written backfill, once: the latest trace of activity that already exists (a session refresh,
-- a saved or opened link, the sign-up itself), as a UTC day. Numbers before the deploy are estimated.
-- Demo users are never tracked. GREATEST ignores NULLs.
UPDATE "users" AS u
SET "last_active_on" = (
  GREATEST(
    u."created_at",
    (SELECT max(s."updated_at") FROM "sessions" AS s WHERE s."user_id" = u."id"),
    (SELECT max(l."created_at") FROM "links" AS l WHERE l."user_id" = u."id"),
    (SELECT max(l."last_opened_at") FROM "links" AS l WHERE l."user_id" = u."id")
  ) AT TIME ZONE 'UTC'
)::date
WHERE u."is_demo" = false;
