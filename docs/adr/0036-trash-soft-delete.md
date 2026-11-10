# 0036. Trash: soft delete with a shared timestamp, per-account retention, daily purge

- Status: Accepted
- Date: 2026-11-10
- Source: issue #262; `docs/PROJECT.md` 4, 5.8, 6; the author's decisions of Nov 10, 2026; builds on [0033](0033-links-search-cursor-idempotency.md), [0034](0034-demo-session-and-cleanup-cron.md)

## Context

Deleted links and folders must wait in Trash (screens `TrashView`, `MobileTrash`) for a retention period chosen in Settings › Library (7, 30 or 90 days, default 30), then disappear. Every delete of links and folders goes to Trash; account deletion and the demo cleanup delete for good, and tags have no Trash. A folder in Trash stands for its whole subtree ("Old courses, 9 links").

## Decision

1. **Columns.** `links.deleted_at` and `folders.deleted_at` (`timestamptz`, nullable); `users.trash_retention_days` (`smallint`, default 30, check `IN (7, 30, 90)`). Partial indexes `WHERE deleted_at IS NOT NULL` on `(user_id, deleted_at)` for both tables serve the Trash list and the purge. Every read and write of live data adds `deleted_at IS NULL` (lists, counts, search, export, tags counts, recent, duplicate check, folder validation on create and move); the link image routes still serve a trashed link to its owner, so Trash shows previews.
2. **One timestamp per delete.** Deleting a folder sets the same `deleted_at` (the transaction time) on the folder, every live subfolder and, in `delete-links` mode, every live link inside; `move-to-unsorted` still moves the links to Unsorted. A Trash entry is a deleted folder whose parent is live (or gone), or a deleted link whose folder is live, gone or deleted at a different time (it was deleted on its own before). Equality of the timestamp is what ties a subtree together, so a link deleted on its own earlier stays its own entry.
3. **Restore.** A link: `deleted_at = NULL`; if its folder is not live, it goes to Unsorted. A folder: the folder and the subfolders and links with its `deleted_at` come back; if its parent is not live, it comes back at the top level. Restoring respects the folder and link limits like a create (a full library answers 409).
4. **Delete forever and empty.** Removes the rows; a folder takes its subtree (the existing cascade) and the links deleted with it. Links deleted on their own inside it lose the folder (`SET NULL`) and stay in Trash as their own entries.
5. **Limits.** The per-user link and folder limits count Trash too, so delete-and-add cannot grow the tables past them; the purge and "Empty trash" free the room.
6. **Purge.** `GET /api/cron/trash-cleanup` (`CronSecretGuard`, `@AllowAnonymous()`, in `PUBLIC_ROUTES`, the same GET exception as ADR 0034) deletes rows whose `deleted_at` is older than the owner's retention, in batches of 500 within a 5 second budget, and answers `{ deleted, hasMore }`. `vercel.json` schedules it daily at 03:47 UTC, 30 minutes after the demo cleanup.
7. **Settings.** `GET` and `PATCH /api/me/settings` carry account preferences (`UserSettingsResponse`), starting with `trashRetentionDays`; later stage 2 settings join the same resource.

## Consequences

- One more filter on every query; forgetting it would leak deleted items back into lists. Integration tests check each list, count and search with trashed rows present.
- Restore puts items back where they were when possible; a moved or deleted parent is resolved to Unsorted or the top level instead of failing.
- Items can outlive their retention by up to a day (daily cron); the list shows `expiresAt`, and an overdue item stays restorable until the purge runs.

## Alternatives considered

- **A separate `trash` table with copies of the rows** - restores would have to recreate rows with their tags and images; the moves between tables are where data gets lost.
- **A `trash_batch_id` column instead of the timestamp** - clearer, but one more column and index for the same grouping; the transaction timestamp is already unique per delete.
- **Purge lazily when Trash is opened** - rows of people who never open Trash would stay forever.
