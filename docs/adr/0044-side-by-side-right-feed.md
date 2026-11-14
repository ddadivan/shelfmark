# 0044. Side by side: a scoped right-feed store fed by a link-change stream from LinksStore

- Status: Proposed
- Date: 2026-11-14
- Source: issue #386, `docs/design/screens/SideBySide.dc.html`, `docs/design/components/PickerMenu/README.md`

## Context

- The side-by-side view (#386, desktop from 80em) shows two feeds at once: the left one is the library page as it is (any scope, filters, sort, view, selection), the right one is a folder or Unsorted, a move target.
- `LinksStore` is a root singleton that holds **one** feed: one `filter`, its entities, cursor, loading flags, the slots of links a move took out (`movedFrom`), the deferred deletes (`pending`), the image capture and the "Recently opened" list. Every write goes through it: `move()` (single move, its Undo and rollback), `patchLinks()` / `restoreSnapshot()` (bulk move, its Undo and rollback in `BulkLinkActionsService.update`), `remove()` / `undoRemove()`, `applyEdit()`, `toggleFavorite()` and the tab-sync and folder / tag maintenance methods.
- The issue forbids a second implementation of drag and drop, selection, the bulk bar, the "Move to" picker and Undo. A move started from either half, its toast Undo and its rollback must show in both halves at once.
- The right half needs far less than the left: one folder or Unsorted, the default sort (newest first, pinned first), page one plus "load more", no filters, no recent list, no deferred deletes of its own.

## Decision

1. **Right feed:** a page-scoped `SplitFeedStore` (`apps/web/src/app/features/library/services/split-feed.store.ts`, a `signalStore` without `providedIn`, provided by `provideLibraryPage()`). It loads page one of `{ scope: folder, folderId }` or `{ scope: unsorted }` through `LINKS_API.list(linksQuery(filter))`, pages with the cursor, and drops late responses with a generation counter, like `LinksStore`. It holds no business actions.
2. **One writer:** every change still goes through `LinksStore` and the existing services (`LinkActionsService.moveTo`, `BulkLinkActionsService.moveTo` / `moveBack`, `LinkDragService.drop`). None of them learn about the right half.
3. **Change stream:** `LinksStore` publishes what it changed as `linkChanges: Observable<LinkChange>` (`stores/models/link-change.interface.ts`: `upserted` links in their new state, `removed` ids, or `reload`). It publishes from `placeMoved` (single move, Undo, rollback), `patchLinks` (bulk change and server answer), `restoreSnapshot` (bulk rollback, given the original links by the caller), `remove` / `restore` / `removeLinks` / `dropSaved` / `applyRemoval`, `applyEdit`, `toggleFavorite`, `addSaved` / `addSavedMany`, and `reload` from `refresh`, `applyFolderRemoval`, `renameTag`, `dropTag`. It publishes whether or not the link is loaded in its own feed.
4. **Placement is shared, not copied:** the rule "a link that still belongs stays, one that left is removed and its slot remembered, one that now belongs comes back at its slot or after the pinned links" moves into a pure function in `stores/links-feed.ts` (`placeLink`). `LinksStore.placeMoved` and `SplitFeedStore` both call it with their own filter, entities and slot map. One behaviour change in `LinksStore`: a link moved **into** the open folder or Unsorted that the feed never had (dragged back from the right half) is now inserted after the pinned links instead of waiting for the next load.
5. `LinksStore` exposes `isPending(id)`, so a right-feed reload never shows a link in its delete Undo window.

## Consequences

- Moves, Undo and rollbacks stay single-path; the right half follows them through one subscription, and Undo restores the link to its old slot in both halves.
- The page-one / load-more pipeline (about 60 lines) exists twice, in `LinksStore` and `SplitFeedStore`. This is accepted for v1. If a third feed appears, or the right half gains sort, filters or its own actions, extract a `withLinksFeed()` signal-store feature that both stores compose (alternative (a) below).
- Card actions (favorite, edit, delete, pin) work through `LinksStore.entityMap()` and are silent no-ops for a link the left feed does not hold. So in v1 the right-half cards are read-only (open and drag only) and cannot be selected. Allowing actions there means either the feature extraction or giving the action services the feed a link lives in.
- Every new `LinksStore` write method must publish a `LinkChange`. Its spec checks that it does.
- The stream is in memory and page-scoped on the consumer side. Other tabs still reach both halves through the existing tab sync (`refresh` publishes `reload`).

## Alternatives considered

- **(a) Feed factory: extract the feed part of `LinksStore` into a `withLinksFeed()` feature used by two store instances.** The cleanest end state, but the feed part is entangled with `pending`, `movedFrom`, the image capture, `epoch` / `generation` and `reset()`. Extracting it means refactoring the most central store (725 lines, many specs) inside a feature issue. The move paths would still need a coordinator to update the second instance. Deferred, as noted above.
- **(c1) `LinksStore` holds several feeds keyed by id.** Every method would need a feed key. Too wide a change for one view.
- **(c2) Reload the right feed after every move.** No duplicated logic, but no instant feedback, a flicker on every drop, the Undo slot is lost, and late responses race. Rejected for the main path; it is kept only for the coarse `reload` changes.
- **(c3) Make the move services call a right-feed hook directly.** This couples `LinkActionsService` and `BulkLinkActionsService` to one page's layout, and a move from a third place (card menu, sidebar drop) would miss it.
