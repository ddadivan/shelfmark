# 0037. Folder colours and icons, sidebar pins as columns, pinned links per folder

- Status: Accepted
- Date: 2026-11-10
- Source: issue #263; screens `FolderStyle`, `SetLibrary`; the author left the details to the team; builds on [0036](0036-trash-soft-delete.md)

## Context

Folders get a colour (eight tile colours) and an icon, the sidebar gets a Pinned section (up to 7 folders or links together, reorderable) and a link can be pinned to the top of its folder. The account setting "Folder colours" turns the colours off.

## Decision

1. **Style.** `folders.colour` (`varchar(16)`, default `graphite`, CHECK in the eight colours) and `folders.icon` (`varchar(24)`, default `folder`). The icon allow-list is the contract const `FOLDER_ICON` (16 names that exist in `ICON_NAMES`), validated by the API only: it will change more often than the colours, and a CHECK would need a migration for each change. Both are set with `PATCH /api/folders/:id` (`IsIn`, no null). The account setting `users.folder_colours` (default true) is only stored: the client shows graphite when it is off, the API still returns the chosen colour so switching it back loses nothing.
2. **Sidebar pins are columns, not a table.** `pinned_position` (`smallint`, null = not pinned, CHECK >= 0) on `folders` and on `links`. A `pins` table with `(kind, target_id)` is polymorphic: no foreign key can cover two tables, so delete forever, account deletion and the purge would each need extra cleanup and orphans would be possible. With columns the pin dies with its row (cascade from the user, the existing delete paths), uniqueness per target and per user is automatic, and a read is two indexed queries (`WHERE user_id AND pinned_position IS NOT NULL`, partial indexes). The price is that "position across two tables" and "at most 7 together" are not database constraints: every pin write runs under the per-user `folders:` advisory lock (`FoldersService.lockTree`, first in the lock order), counts the live pinned rows of both tables, and gives a new pin `max(position) + 1`; reorder takes the full list and rewrites 0..n-1. The list sorts by `(position, kind, id)`, so a tie could never be unstable.
3. **Trash.** Moving a folder (and its subtree) or a link to Trash sets `pinned_position = NULL` (and `pinned_in_folder_at = NULL`) in the same statement, and every read also filters `deleted_at IS NULL`. Restore does not pin again: otherwise a restore could push the user past 7 pins. Pinning a trashed target is a 404. Delete forever removes the row and with it the pin.
4. **API.** `GET /api/pins` (ordered, with the full folder or link response), `POST /api/pins {kind, id}` (idempotent, 200, answers the list; 404 for a foreign, missing or trashed target; 409 beyond 7), `DELETE /api/pins/:kind/:id` (204, idempotent for a live own target, else 404), `PUT /api/pins/order {items}` (must be exactly the pinned set, else 400). Plain SQL for the column writes keeps `updated_at`: pinning is not an edit. Folder and link responses carry `pinned`.
5. **Pinned links in a folder.** `links.pinned_in_folder_at` (timestamptz, null). Pinned links come first in the order they were pinned, whatever the sort. A keyset cursor cannot put a "pinned first" group in front of a sorted list without making every cursor carry the group, so the list is split instead: the first page of a folder list (`folderId`, no `cursor`) returns the pinned links of that folder in a separate `pinned` array (same filters, at most `LINK_LIMIT.PinnedInFolderMax` = 20, 409 beyond), and `items` and all later pages hold only the unpinned links. The cursor, the sort and the order are unchanged. Without `folderId`, with `unsorted`, or on a later page, `pinned` is `[]`. It is set with `PATCH /api/links/:id {pinnedInFolder: boolean}`; a link in Unsorted cannot be pinned (400), and a move to another folder or into Unsorted unpins.

## Consequences

- A folder list with a search query shows matching pinned links in `pinned`, the rest in `items`: the client renders `pinned` then `items`.
- A pinned link that goes to Trash and returns is no longer pinned (neither kind of pin).
- `libs/ui` keeps its own `FOLDER_COLOUR`; the contract const has the same values (the colour CHECK in the database is the third place: a ninth colour touches all three).

## Alternatives considered

- **A `pins` table** - one ordered list with a real unique and position, but polymorphic targets leave orphans and need cleanup on every delete path.
- **Pinned links as a flag sorted first in the keyset** - the cursor would have to encode the group and the pin time, and a pin or unpin between pages would shift rows.
