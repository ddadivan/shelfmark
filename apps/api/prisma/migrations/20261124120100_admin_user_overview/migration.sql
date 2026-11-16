-- "admin_user_overview" (#437): one row per user, for the author's reads in the Neon SQL editor.
-- It is NEVER queried by the app (no module, no API, no export reads it) and Prisma does not model
-- it. Counts only: no link URLs, titles, notes, tags or folder names. Each count is a correlated
-- subquery on its own, so the counts never multiply each other. "dayN_score" is the score as text,
-- 'not now' for a skipped prompt (NULL score) or NULL when the milestone has no answer; "dayN_shown"
-- is how often the prompt was shown (0 when never). Rating rows only (kind IS NULL).

CREATE VIEW "admin_user_overview" AS
SELECT
  u."id",
  u."email",
  u."name",
  u."is_demo",
  u."created_at" AS "signed_up",
  u."last_active_on",
  (SELECT count(*) FROM "links" l WHERE l."user_id" = u."id" AND l."deleted_at" IS NULL) AS "links",
  (SELECT count(*) FROM "links" l WHERE l."user_id" = u."id" AND l."deleted_at" IS NOT NULL) AS "links_in_trash",
  (SELECT count(*) FROM "folders" f WHERE f."user_id" = u."id" AND f."deleted_at" IS NULL) AS "folders",
  (SELECT CASE WHEN f."score" IS NULL THEN 'not now' ELSE f."score"::text END
     FROM "feedback" f WHERE f."user_id" = u."id" AND f."kind" IS NULL AND f."milestone" = 'day3') AS "day3_score",
  COALESCE((SELECT p."shown_count" FROM "rating_prompt_views" p WHERE p."user_id" = u."id" AND p."milestone" = 'day3'), 0) AS "day3_shown",
  (SELECT CASE WHEN f."score" IS NULL THEN 'not now' ELSE f."score"::text END
     FROM "feedback" f WHERE f."user_id" = u."id" AND f."kind" IS NULL AND f."milestone" = 'week1') AS "week1_score",
  COALESCE((SELECT p."shown_count" FROM "rating_prompt_views" p WHERE p."user_id" = u."id" AND p."milestone" = 'week1'), 0) AS "week1_shown",
  (SELECT CASE WHEN f."score" IS NULL THEN 'not now' ELSE f."score"::text END
     FROM "feedback" f WHERE f."user_id" = u."id" AND f."kind" IS NULL AND f."milestone" = 'month1') AS "month1_score",
  COALESCE((SELECT p."shown_count" FROM "rating_prompt_views" p WHERE p."user_id" = u."id" AND p."milestone" = 'month1'), 0) AS "month1_shown",
  (SELECT CASE WHEN f."score" IS NULL THEN 'not now' ELSE f."score"::text END
     FROM "feedback" f WHERE f."user_id" = u."id" AND f."kind" IS NULL AND f."milestone" = 'year1') AS "year1_score",
  COALESCE((SELECT p."shown_count" FROM "rating_prompt_views" p WHERE p."user_id" = u."id" AND p."milestone" = 'year1'), 0) AS "year1_shown"
FROM "users" u;
