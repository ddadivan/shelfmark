-- Own emoji (#363). Expand only: a new column with a default, no data is rewritten.
-- The account keeps up to 24 own emoji for the folder emoji picker ("Yours"). The API checks that
-- each is exactly one emoji (`isFolderEmoji` in the contracts); the CHECK keeps the count and a
-- length bound (at most 16 code points each, FOLDER_EMOJI_MAX_CODE_POINTS) as a backstop.

ALTER TABLE "users" ADD COLUMN "custom_emoji" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD CONSTRAINT "users_custom_emoji_check" CHECK (
  cardinality("custom_emoji") <= 24
  AND char_length(array_to_string("custom_emoji", '')) <= 24 * 16
  AND array_position("custom_emoji", '') IS NULL
);
