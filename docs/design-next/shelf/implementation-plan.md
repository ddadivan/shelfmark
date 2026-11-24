# Shelf: implementation plan (branch `redesign/shelf`)

How the Shelf design (`docs/design-next/shelf/`, ADR 0061) lands in `libs/ui` and the home page of `apps/web`. Step 1 is the design system, step 2 the home page (library feed). Other screens follow in later steps and inherit most of the look from the tokens.

## Principle: keep the token API, change the values

`libs/ui` and `apps/web` read about 40 colour tokens in ~1,400 places. Renaming them all would be a large, risky diff with no visual gain, so:

- **Existing CSS custom property names stay** and take Shelf values (`--bg` is Shelf `canvas`, `--accent` is Shelf `accent`, and so on).
- **Shelf tokens that have no current equivalent are added** under their Shelf names (`--sidebar`, `--pick`, `--fill`, `--sep`, `--note-text`, ...).
- `tokens.json` stays the source of values; the table below is the mapping.

## Token map

| Shelf token (`tokens.json`) | CSS property | Action |
| --- | --- | --- |
| `canvas` | `--bg` (and new alias `--canvas`) | change value: #FFFFFF / #19191C |
| `surface`, `surface-hover`, `surface-pressed` | same names | change values |
| `fill`, `fill-hover` | `--fill`, `--fill-hover` | add |
| `text`, `text-muted` | same names | change values |
| `line` | `--line` (new); card hairline, transparent in dark | add |
| `sep` | `--border` (dividers) and new `--sep` | change `--border` to the `sep` value, add `--sep` |
| `line-strong` | `--line-strong` (new); also `--glass-line` and `--card-hover-border` | add |
| `control` | `--border-control` | change value |
| `accent`, `on-accent` | `--accent`, `--primary`, `--on-primary` | change: near-black / near-white. `--accent` is no longer sage |
| `accent-bg`, `accent-text` | same names | change values (neutral selected tint) |
| `focus` | `--focus-ring` | change value (near-black / near-white) |
| `ai`, `ai-bg` | same names | change: sage (was indigo) |
| — | `--ai-line`, `--ai-fill*` | keep, derived from `ai` |
| `note-text` | `--note-text` | add |
| — | `--highlight-bg`, `--highlight-text` | change: `ai-bg` / `note-text` (search highlight in sage) |
| `danger`, `warning`, `success` | same names | change values; `--danger-bg`, `--warning-bg` derived |
| `star` | `--star` | add |
| `scrim` | `--overlay` (and alias `--scrim`) | change value |
| `brand-notch` | `--logo-bookmark` | keep value |
| `folder-*`, `folder-*-bg` | same names | keep (values identical) |
| `accent-ink*`, `accent-sage*` | Custom theme accents `ink`, `sage` | see Custom theme |
| `sidebar` | `--sidebar` | add |
| `pick` | `--pick` | add |
| `glass` | `--glass` | change meaning: the 72% white of the round buttons over a preview (was the frosted fill of floating layers) |
| `toggle-off` | `--toggle-off` | add |
| `wave-1…4` | `--wave-1…4` | add |
| `shadow-l2`, `shadow-l3` | `--shadow-l2` (also `--shadow-popover`, `--shadow-float`), `--shadow-l3` | add / change |
| `shadow-hover` | `--shadow-hover` (also `--shadow-card-hover`) | add |
| `shadow-l1` (none) | `--shadow-card` | change: a 1px `line` ring in light (same look as a hairline border), none in dark |
| radius `xs` 4, `sm` 10, `md` 12, `card` 16, `lg` 16, `full` | `--radius-xs`, `--radius-sm`, `--radius-md`, `--radius-card`, `--radius-lg`, `--radius-full` | change values, add `xs` and `card`; `--radius-xl` becomes 16 (panels) |
| spacing 4…64 | `--space-1…8` | keep; add `--space-12` (48) and `--space-16` (64) |
| type families | `--font-sans` | Hanken Grotesk (self-hosted) with a metric-matched fallback |
| type styles | `type()` mixin | new scale: `display` 32/40, `title` 24/30 (page title), `heading` 16/24 600, `body` 16/24, `secondary` 14/22, `label` 14/22 500, `caption`/`meta` 12/16, `mono` |
| sizes | `--sidebar-width` 240, `--control-*`, `--row-nav` 36 | add |
| durations | same names | keep |

### Floating layers (menus, popovers, toasts, tab bar, bulk bar)

Shelf drops glass on floating layers: menus are `surface` with `shadow-l2` and a `line-strong` edge. The `glass` mixin becomes `float-surface` (solid, no blur); the new `glass-button` mixin is the 72% white with a 10px blur for the 28px round buttons over previews.

### Custom theme

The machinery (`data-theme="custom"` with base, accent, background, corners) keeps working. The fixed Light and Dark themes use the Shelf graphite accent; the Custom accent list gains `ink` and keeps the earlier colours (sage now uses `accent-sage`). Backgrounds: `white` becomes the default light value. Corners: `round` is the Shelf scale. `custom-theme-contrast.spec.ts` keeps checking every combination.

### Contrast

All text pairs are checked for 4.5:1 and UI parts for 3:1 in both themes by `custom-theme-contrast.spec.ts` and a new Shelf pair check. Pairs from the reference that fail are listed in the summary to the author, not silently changed.

## Component map

| Shelf component | libs/ui today | Action |
| --- | --- | --- |
| Button | `ui-button` (primary, secondary, ghost, danger, ai, ai-ghost; sm 30, md 36, lg 44) | change: pills, sizes 32 / 40 / 48, primary `accent` fill, secondary `surface-hover`, ghost hover `fill` |
| IconButton (+ glass) | `ui-button` with `iconOnly` | change: round 32px, `text-muted` icon; add `glass` variant (28px) |
| AskButton | — | add `ui-ask-button` (pill, spark, four-colour hover glow, reduced-motion safe) |
| NavItem | `ui-tree` rows, sidebar links in the app | change: 36px rows, radius 10, current `surface-pressed` 500, count 12px muted |
| Search | `ui-search-trigger` | change: 48px, radius 16, `surface-hover` with an inset hairline, up to 640px |
| Chip (saved-view tabs) | `ui-chip`, `ui-saved-views` | change: 28px tabs, radius 10, 12px muted label with count, selected `surface-pressed` |
| Tag | `ui-chip variant="tag"` | change: quiet text; on cards hashtags are plain `#tag` text |
| SegmentedControl | `ui-segmented-control` | change: `surface-hover` track, 2px padding, radius 10; items 28px, current on `surface` |
| Switch | `ui-switch` | change: 28×16, knob 12px, off `toggle-off`, on `accent` |
| ViewMenu | — | add `ui-view-menu` (button + panel: six-step `ui-range` slider + switch rows) and `ui-range` |
| Menu / Popover | `ui-menu`, `ui-popover`, `ui-select`, `ui-picker-menu` | change: `surface`, radius 12, `shadow-l2`, 8px padding, 36px items radius 10, `sep` dividers, no glass |
| Dialog | `ui-dialog` | change: radius 12, `shadow-l3` over `scrim`, title 16/24 600 |
| Toast | `ui-toast` | change: `text` fill with `canvas` text, radius 12 |
| TabBar | `ui-tab-bar` | change: 8px inset, 64px, radius 12, `surface` + soft shadow, Add 48px radius 12 `accent` |
| LinkCard | `ui-card` | change: full-bleed preview, glass star / play / ⋯, meta (folder + date), title 16/24 500, source with favicon, hashtags, sage note; `pick` when open |
| LinkRow | `ui-list-item` | change: thumb 72×48 radius 10, `pick` when open |
| Favicon | `ui-favicon` | change: 16px square radius 4, site colour fill with its letter |
| EmptyState / StateScene | `ui-empty-state`, `ui-illustration` | change: sage disc, scene key parts in `ai` / `ai-bg` (token recolour) |
| FolderTile | `ui-folder-icon` | keep |
| Input, Textarea, Select | `ui-input`, ... | change through tokens (radius 10, `control` border) |
| SlideOver | `ui-drawer` | change through tokens |
| ReaderView | — | later step |

Everything else in `libs/ui` (60+ components) changes through the tokens only in this step.

## Home page (step 2)

1. **Shell, desktop (≥ 64em):** 240px `sidebar` with a `sep` edge: logo + avatar, Add link (full-width primary pill), the library rows, Pinned / Folders / Tags (collapsible), then the intro card, Theme, Get the extension, Data and help, Trash. The header holds the 48px search (up to 640px) and the Ask button at the far right. The current header actions (theme, shortcuts, Add link, avatar) move into the sidebar.
2. **Shell, below 64em:** a top bar with the search field and the avatar (account menu and Settings), the tab bar Today, Library, Add, Search, Ask (Tags while Ask is off); menus open as bottom sheets (block 1, below).
3. **Library feed:** page title (24/30 600) with View (menu), the view switch (Masonry / Cards / List) and a ⋯ menu (Sort by, Filter, Select, Side by side, Export); saved views as small tabs; then the feed. Grid size (six steps, 130–300px) and the card fields (Note, Hashtags, Folder, Date) are remembered per feed in the existing local per-feed memory.
4. **Card:** the new `ui-card` anatomy; favicon colour from the site where known, letter fallback; selection, ⋯ menu, drag to folders and favorite keep working.
5. **Tests:** unit and e2e updated for the changed DOM (desktop, tablet, phone). No test is skipped to get green.
6. **Visual check:** screenshots at 1440, 820 and 390 in both themes next to the reference, saved under `screens/`.

## Order of commits

1. Plan, ADR 0061, CLAUDE.md pointer.
2. Tokens (light, dark, scale, custom), floating surface and glass button mixins, type scale, specs.
3. Hanken Grotesk.
4. Components, one group per commit: button and icon button; switch, segmented control, chip / saved views; menu, popover, dialog, toast; tab bar, tree rows, search; card, list item, favicon; view menu and range; ask button.
5. App shell, library page, card wiring, tests, screenshots.

## Block 1: the rest of the home page (branch `redesign/shelf-b1-home`)

- **Mobile shell (below 64em):** `app-shell` top bar (`ui-search-trigger` full width, 44px on a phone, and the avatar with the account menu), tab bar Today (`history` icon) / Library / Add / Search / Ask or Tags; the You tab is gone (Settings sit behind the avatar). `ui-tab-bar` is full width on a tablet too. The page sits 16px under the top bar.
- **Bottom sheets:** `ui-menu` opened from an element below 64em is a sheet (`UiOverlay.sheet()`, scrim, grip, optional `sheetTitle`, 48px rows): the library More menu, card and row menus (titled with the link), the account menu, Snooze on Today.
- **Library toolbar on a phone:** the view switch and the More menu like the tablet (the phone Options menu is gone); View (grid size, fields) stays from 40em. Feed gaps 16px on a tablet, 12px on a phone.
- **Today:** `features/today/` (see `apps/web/CLAUDE.md`). Everything comes from existing APIs (reminders, `?saved=week`, Rediscover, links); nothing is mocked. Not drawn from the design because the data does not exist: reading progress ("40% read", "Stopped at 6:20") and "filed by rule / by AI" with Undo in Saved this week; the All links cards are read-only (no star or menu), as in the side by side right half.
- **Sidebar:** the Today row replaces the Reminders row (design); the Reminders page is Today's "Revisit".

## Block 2: the Link page, Add link and Revisit (branch `redesign/shelf-b2-link`)

- **Link page** (`features/link-preview/`): the desktop panel toolbar is Shelf's (previous / next, title, Related, Site | Reader, Reading settings in Reader, Open, favorite, Details, the ⋯ menu, × close after a divider); edit, copy and "Wider preview" moved into the ⋯ menu (`preview-menu`). `PreviewReaderService` (page-scoped) keeps the mode per site while the page lives, the details toggle and the reading progress; `preview-reader` renders `ui-reader` (an article, or for a page without text the link's own picture, summary and note with "Open <site>"); `preview-details` edits title and note in place (`LinkInlineEditService`); `reading-settings` is the popover. The blocked site offers "Open in Reader" first. The phone page has the same Site | Reader, Reading settings and Details under its header. Left: the list beside the preview keeps the feed's own view (#555) instead of the design's compact rows (that is `library.page`, block 1's file).
- **Reading settings** are a device preference (`localStorage` `sm-reader-settings`, `ReaderSettingsService`): the account has no columns for them yet. Literata (serif) is not self-hosted; Georgia stands in.
- **Add link** opens as the Shelf panel (`DIALOG_VARIANT.Panel`: under the top end corner, the page undimmed from 40em, a bottom sheet on the phone); Edit link stays the centred dialog. New in `libs/ui`: the panel variant, `ui-select` `appearance="row"` (the "Goes to … · rule for …  Change" row), `ui-input` `labelHidden`, field border hooks `--ui-field-border(-hover)`. Remind me… and Favorite are applied after the create (`AddLinkExtrasService`: `PATCH /api/links/:id`, `PUT /api/reminders/:linkId`). The details stay usable while the preview loads or after it failed (the design hides them there; kept so a title and note can be typed meanwhile). The URL field keeps the mono URL look of `type="url"` (the URL keyboard on phones).
- **Revisit** is `/revisit` (`features/revisit/`, `RevisitService`): Due (`RemindersStore`), Continue reading (`READER_API.progress`), Forgotten this week (`RediscoverStore`), Recently opened (`LinksStore` history, last 30 days, five). No sidebar or tab bar entry yet: the shell belongs to block 1 (the tech lead wires the Today / Revisit entry).

## Mocked in the Shelf redesign
- Block 1: nothing (Today uses the existing reminders, links `?saved=week` and Rediscover endpoints and their mock implementations).

- **Reader text and reading progress** (`READER_API`, contracts `libs/shared/contracts/src/reader/`): `apps/api` has no extraction (it needs the SSRF-safe fetcher of PROJECT.md 5.8, not a small endpoint). `features/reader/http/http-reader.api.ts` answers "no article" and no progress without a request, so production Reader shows the link's own picture, summary and note; `features/reader/mock/mock-reader.api.ts` (+ `mock-reader-article.ts`) serves generic article text for readable kinds of the mock library and keeps progress in `localStorage` `sm-mock-reader-progress`. Marked `MOCK (Shelf)` in code.
