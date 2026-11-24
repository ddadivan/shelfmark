-- Settings › Notifications and Web Push delivery (Shelf 12-notify). Expand only: new nullable or
-- defaulted columns and a new table; nothing is rewritten.

-- When a due reminder was last handed to Web Push (pushed once per remind_at).
ALTER TABLE "links" ADD COLUMN     "remind_pushed_at" TIMESTAMPTZ(3);

-- The delivery cron reads due reminders across users, oldest first.
CREATE INDEX "links_remind_at_idx" ON "links"("remind_at") WHERE "remind_at" IS NOT NULL;

-- What may be sent and the quiet hours.
ALTER TABLE "users" ADD COLUMN     "notify_continue_reading" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notify_reminders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "quiet_from" VARCHAR(5),
ADD COLUMN     "quiet_to" VARCHAR(5);

-- Both bounds NULL (no quiet hours) or both HH:MM (NOTIFICATION_TIME_PATTERN).
ALTER TABLE "users" ADD CONSTRAINT "users_quiet_hours_check" CHECK (
  ("quiet_from" IS NULL AND "quiet_to" IS NULL)
  OR (
    "quiet_from" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    AND "quiet_to" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  )
);

-- One browser push subscription per device and account.
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" VARCHAR(2048) NOT NULL,
    "p256dh" VARCHAR(128) NOT NULL,
    "auth" VARCHAR(64) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "time_zone" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(3),

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "push_subscriptions_endpoint_check" CHECK ("endpoint" LIKE 'https://%'),
    CONSTRAINT "push_subscriptions_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 80)
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_user_id_endpoint_key" ON "push_subscriptions"("user_id", "endpoint");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
