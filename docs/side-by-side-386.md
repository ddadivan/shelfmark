# Side by side (#386): implementation plan

Goal ([#386](https://github.com/ddadivan/shelfmark/issues/386)): two feeds side by side on desktop (from 80em), so links can be dragged or bulk-moved into a chosen folder. Design: `docs/design/screens/SideBySide.dc.html`, `docs/design/components/PickerMenu/README.md`, the `columns` and `swap` icons. Decision record: [ADR 0044](adr/0044-side-by-side-right-feed.md).

## 1. The right feed

- `SplitFeedStore` (page-scoped, `provideLibraryPage()`): page one and "load more" of `{ scope: folder, folderId }` or `{ scope: unsorted }` through `LINKS_API.list`, with a generation guard; links in their delete Undo window (`LinksStore.isPending`) are left out.
- `LinksStore` stays the only writer and publishes `linkChanges: Observable<LinkChange>` (`upserted` / `removed` / `reload`) from every write method. `SplitFeedStore` applies them.
- The placement rule ("stays / leaves and remembers its slot / comes back at its slot or after the pinned links") is a pure `placeLink` in `stores/links-feed.ts`, used by both stores, so Undo restores the slot in both halves. Behaviour change: a link moved into the open folder or Unsorted that the left feed never held is inserted at once.

## 2. URL state

- `?split` absent: closed. `?split=` (empty), an array or anything invalid: the picker. `?split=unsorted`: Unsorted. `?split=<uuid>`: that folder. An unknown, foreign or same-as-left id shows the picker; the URL is not rewritten.
- Open only when `ViewportService.wide()`; below 80em the param is ignored.
- Pure helpers in `features/library/utils/split-param.ts`: `parseSplitParam`, `resolveSplitTarget`, `splitParamValue`, `canSwap`, `swapCommands`.
- Navigation (`SplitViewService`): open pushes `split=`; the first choice in the empty picker **replaces** (Back closes instead of returning to an empty picker); changing the right folder pushes; changing the left pushes the new route with `split` kept (the left filters drop); swap pushes `/folders/<right>` or `/unsorted` with `split=<old left>`; close pushes `split: null`. Sidebar and header-search navigation keep their current behaviour and close the split (v1, question for the author).

## 3. Work split

**ui-dev (`libs/ui`):** icons `columns` and `swap` (filled outlines, sprite regenerated); `ui-picker-menu` (trigger + CDK overlay dialog hosting `ui-picker-list`, harness, story, spec with axe); `ui-picker-list` gets an optional `value` (the shown row: check and `aria-selected`; `currentIds` rows then show only their label); `BulkBarAction` gets an optional `variant` (`Default` / `Secondary`) and `folder` tile.

**frontend-dev (`apps/web`):** `placeLink`, the change stream, `isPending`; `LinkDragService.targetAt` reads `data-link-drop-folder="unsorted"` as Unsorted; split models and utils; `SplitViewService`; `SplitFeedStore`; `components/split-right-half/`; page layout (equal halves, divider with ⇄, the left `ui-picker-menu` in place of the title with a visually hidden `h1`, the `columns` button at the end of the toolbar only when wide and closed, `data-link-drop-folder` on the left half when it is a folder or Unsorted); `LibraryFilterService.filter` compares with `sameFilter`, so adding `?split` does not refetch or clear the selection; `BULK_ACTION.MoveToSplit` as the first bulk bar action; keys in all six languages.

## 4. Drag and selection

- A half that can take links carries `data-link-drop-folder` (folder id or `unsorted`); the existing hit test, highlight (`treeTargetId`), drop, toast and Undo do the rest. Sidebar folders stay targets.
- Selection stays in the left half (v1). Right-half cards are read-only: they open on click and can be dragged back (one link at a time), with no checkbox or menu, because card actions work on `LinksStore` (ADR 0044).

## 5. Translation keys

`library.split.*` (open, close, swap, choose.title / heading / text / search, leftMenu.label / search / list / noResults, rightMenu.label, onLeft, onRight, leftTrigger, rightTrigger, leftRegion, rightRegion, rightRegionEmpty, searchName, empty.text) and `bulk.bar.moveToFolder` ("Move to {{folder}}").

## 6. Tests

- Unit: `split-param`, `left-feed-options`, `placeLink`, the `LinksStore` change stream and insert-on-move, `SplitFeedStore`, `SplitViewService` (push / replace, below 80em), the drag Unsorted token, the bulk action.
- Component (harnesses): `ui-picker-menu`, `ui-picker-list` `value`, `ui-bulk-bar` secondary, `split-right-half`, the library page in split mode (entry hidden when not wide, swap only when valid, foreign id gives the picker).
- e2e (desktop only): `/unsorted` → Side by side → choose a folder → drag a card into the right half → toast → Undo → reload keeps the split → Back closes it.

## 7. Risks

- `library.page.html` is already long: the split UI lives in `split-right-half` and the services.
- A query-param change on the same route must keep the left scroll position and not start a view transition.
- Right cards must not match `FEED_ITEM_SELECTOR`, so selection and hotkeys stay with the left.
- Security (5.8): no new endpoint or outbound fetch; folder ids from the URL are only looked up in `FoldersStore`; the API filters by `userId`.
