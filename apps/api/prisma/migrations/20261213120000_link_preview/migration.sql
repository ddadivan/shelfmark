-- Link preview (#553, ADR 0059). Expand only: two columns on `users` with defaults and a new table.
-- `click_action` mirrors LINK_CLICK_ACTION; `preview_new_tab_hosts` holds the hosts that open in a
-- new tab (lower-case DNS names, `isPreviewHost` in the contracts; the API validates the shape, the
-- CHECK keeps the size at USER_LIMIT.PreviewNewTabHostsMax).
-- `frame_checks` caches per host whether its pages may be framed. It is not user data (a host is
-- the same for everybody), so it has no user_id; it holds a host and a verdict only.

-- AlterTable
ALTER TABLE "users" ADD COLUMN "click_action" TEXT NOT NULL DEFAULT 'open',
ADD COLUMN "preview_new_tab_hosts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Hand-written constraints (Prisma cannot express CHECKs; its drift check ignores them).
ALTER TABLE "users" ADD CONSTRAINT "users_click_action_check" CHECK ("click_action" IN ('open', 'preview'));
ALTER TABLE "users" ADD CONSTRAINT "users_preview_new_tab_hosts_check" CHECK (cardinality("preview_new_tab_hosts") <= 100);

-- CreateTable
CREATE TABLE "frame_checks" (
    "host" TEXT NOT NULL,
    "framing" TEXT NOT NULL,
    "checked_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "frame_checks_pkey" PRIMARY KEY ("host"),
    CONSTRAINT "frame_checks_framing_check" CHECK ("framing" IN ('allowed', 'blocked', 'unknown'))
);
