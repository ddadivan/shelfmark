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

### DS guard (ADR 0062, branch `redesign/shelf-ds-guard`)

- The token map above is now checked: `libs/ui/src/styles/token-sync.spec.ts` compares the compiled tokens with `tokens.json` (renames in `styles/models/token-renames.const.ts`, code-only tokens with their reason in `styles/models/code-only-tokens.const.ts`, AA pairs in `contrast-pairs.const.ts`).
- Type scale tokens `--font-size-<style>` / `--line-height-<style>` for every Shelf style; `type()` reads them (`title` = `display-s`, `heading` = `title-s`, `caption` = `meta`; `mono` is now the Shelf 12 / 1.4).
- Code-only values the prototypes draw outside `tokens.json`: `--font-size-section` 18/22 (section titles), `--font-size-micro` 10 (favicon letter), `--radius-tile-sm` 6 and `--radius-tile` 8 (small tiles, thumbs, key caps, the segment in a 10px track), `--search-hairline` (25% grey ring of the search fields), `--shadow-thumb` (range thumb), and component tints as tokens (`--toast-muted`, `--toast-tile`, `--toast-tile-hover`, `--tooltip-kbd`, `--card-overlay`, `--status-text`). Candidates for `tokens.json`.
- Stylelint (`tools/stylelint/shelf-tokens.mjs`) and the Storybook rendered check (`libs/ui/a11y/ds-tokens.mts`) keep new code on tokens. The landing had file-level `stylelint-disable` comments until block 6b rebuilt it on the DS scale; only the hero headline keeps a described one-line exception.

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

## Block 3: search (branch `redesign/shelf-b3-search`)

- **Header field (from 64em):** `app-header-search` is a field at every desktop width (the 64–80em "Search" button and the results panel are gone); typing filters the feed in place (`FeedSearchService`, `?q=`), Ctrl/Cmd K focuses it, focus in the empty field shows Recent searches (`ui-command-list` `emptyPanel`, compact 36px rows).
- **Feed while searching:** title "Search" + count, question hint (`ui-ai-line banner`), Go to chips (`ui-chip variant="jump"`), highlighted card titles, "Close in meaning · N" (AI-3 meaning search as cards), Nothing found with Clear search / Ask your shelf. The toolbar (View, switch, ⋯) and the view tabs stay (the prototype hides them while searching).
- **Below 64em:** the Search tab and the top bar keep the full-screen search list, restyled (`ui-dialog screen`, `ui-command-list screen`: Back + 48px field, 56px rows with dividers, 12px headings, no key hints).
- **Not built:** "Ways to search" (`#tag`, `in:Learning`, `site:`, `last week`): the search has no query syntax; the counts on the view tabs stay the feed's (not the search's).

## Block 5: settings, data, notifications, tools (branch `redesign/shelf-b5-settings`)

- **Settings shell** (`05-settings`): `app-settings-nav` rows have the 16px outline glyph of `SettingsNavEntry.icon` (36px, radius 10, current `surface-pressed` 500), the order Account, Appearance, Library, Notifications, AI, Language and region, Your data, Keyboard shortcuts (Your feedback stays last), the version at the bottom. The settings pages have no shell header (no avatar); every page is one 840px column with the 24/30 title, 14px lead and groups 24px apart.
- **`ui-settings-section` / `ui-settings-row`** (libs/ui): the 18px title sits above the panel; the panel holds the rows edge to edge (rows 12px 16px through `--ui-settings-row-inset`, `sep` lines); an empty `title` drops the heading; `danger` is a soft red hairline. Rows outside a section (dialogs) keep no side padding. New `ui-select` `appearance="pill"`: the 32px `surface-hover` value pill of a settings row.
- **Pages:** Account (profile, shelf, sign-in, sign out, delete; export moved to Your data), Appearance (one column, the live preview after the options; accent picker Graphite, Ink, Sage, the older curated accents only while chosen; `ink` added to the contracts allow-list, `_custom.scss` and an expand-only migration), Library and AI (pill selects), Language and region (dates and the clock moved here from Appearance: `pages/language/date-time-settings`), Your data (Import and export, History, Privacy, AI), Notifications (new, below). `/settings/import-export` redirects to Your data.
- **Phone You:** the account card ("Account and sign-in"), section rows with glyphs, then Send feedback, What's new, About; How it works and Sign out stay buttons. Import and export left the list (they are in Your data).
- **Notifications** (`12-notify`): `features/notifications/`: `DeviceNotificationsService` (permission, the device switch in `localStorage` `sm-notifications-device`, a test notification), `NotificationSettingsStore` (what to send, quiet hours, devices through `NOTIFICATIONS_API`), `NotificationPromptService` (right after a reminder is set and while the browser was never asked, the "Reminder set" toast becomes the question with Turn on notifications / Not now, 30 days in `sm-notifications-asked`). The page shows the blocked steps or the iPhone Home Screen steps in place of the switch.
- **Data** (`09-data`): Export dialog "Export links" with a Format label and "Export JSON"; share dialog without the tile on the public row and with a secondary Copy.
- **Tools** (`15-tools`): Clean up keeps the 840px column; the assistant's server address is a filled 12px block.
- **Not built / left:** the import page with the numbered stepper and the AI folders step layout (the import stays the dialog), the Connect-your-assistant page of its own (it stays the last group of Settings › AI), the token list with access badges and expiry (the API has neither), "Sorting older links" as a dialog, the Recently opened flat rows, Send feedback's segmented "What is it about", Welcome and How it works restyles, the weekly email (postponed, hidden), the "Pick a date" dialog of `13-views`. The tag page and Move a folder (`15-tools`) belong to the organise block.

## Block 4: organise (branch `redesign/shelf-b4-organise`)

From `04-organise.html`, `08-select-move.html` and `13-views.html`. Screens: `screens/b4-organise/`.

- **Folder page** (`library.page`, `LibraryFolderService` page-scoped): one header for every folder (the 40px `ui-folder-icon` tile, or the cover picture in its place, the title, "6 links, 2 subfolders" on the same line, the description under them), "Add link here" and the folder actions at the top of the toolbar ⋯ menu (New subfolder, Add link here | Rename, Folder settings…, Move to…, Pin to sidebar, Share… | … | Delete folder at the end); the sidebar folder menu has the same order. The highlight (#440) colours only the sidebar row now; `ui-folder-banner` is no longer used by the page. Subfolders are 40px chips (`app-folder-tile`: small tile, name, link count); the list view keeps the full-width rows.
- **Rename / New folder:** `ui-input` gained a `uiInputLead` slot; Rename leads the name with the folder tile.
- **Folder settings** (was "Colour and icon…"): title "Folder settings", the Name first (saved through a rename, `folderNameError`), description, colour (own colours kept), Icon | Emoji, cover, highlight, then a decorative Preview of the sidebar row (`folder-highlight` mixin). Left: the colour swatches stay solid circles (the design draws tinted tiles with the glyph) and the icon grid keeps its tile buttons.
- **Tags page** (`/tags`) is open on every width now (it no longer leaves for All links from 64em): lead line with the count, tags as `ui-chip variant="cloud"` (36px, # glyph, link count). Tag menu, rename, merge and delete were already Shelf's. No desktop entry links to it yet (the sidebar's "+ N more" still expands in place).
- **Tidy** (`features/ai/pages/tidy/`): left-aligned up to 880px, 24px title, the section heading "Unsorted: suggested folders and tags · N links", rows in one card split by lines, the apply bar floating 16px above the bottom on every width with "N links selected". Not built: the duplicates and "tags that mean the same" sections of the design (that work is Clean-up, `features/cleanup/`).
- **Rules** (`features/rules/components/rules-section`, inside Settings › Library): rows with favicon, the site over "› folder · #tag", an Edit button and the ⋯ menu; the rule editor opens as `DIALOG_VARIANT.Panel`.
- **Trash:** left-aligned, the count beside the title, "Empty trash" small secondary at the end, the filter under the title, list up to 880px, meta "From … · N days left" (the last three days a warning badge), Restore and a trash icon button for Delete forever (the row menu is gone).
- **Selection** (desktop): the title stays; the hint "Select with X, Shift-click for a range, Ctrl A for all" and "Select all N" / "Select none" take the place of the tools; the bulk bar spans the feed with ×, the count, the actions and Delete at the end (`ui-bulk-bar` `count`, `closeLabel`, output `closed`, 16px icons, radius 12). The mobile shell keeps its × / count / Select all line.
- **Bulk Tags** (`bulk-tags-dialog`): one "Add or find a tag" field and every tag as a checkbox, ticked on all, a dash on some ("on 2 of 3"); a click adds to all, the next takes off all; Enter adds a new tag; "Apply to N links" sends the same add / remove change. Pure logic in `links/utils/bulk-tag-rows.ts`.
- **Move picker:** unchanged (already the Shelf picker list); left: the "New folder…" row and the "Move to <folder>" footer button of the design (the picker moves on choice).
- **Side by side:** a "Side by side" line with the hint and Close over both feeds, each feed a card 16px apart, the drop target ringed in accent (`library-split.scss`). Left: the halves keep the feed's own view and the title-sized pickers instead of the compact rows and 14px pickers of the design.
- **New view:** one page: with AI on the optional phrase with "Fill in" on top, then the name, the "Show links where" rows (row name in a 96px column, controls with `labelHidden`, which moved to `UiFieldControl` so `ui-select` and `ui-tag-input` take it) and the count; the separate phrase step, "save the current filter", "Change" and the preview rows are gone. API phase 1 (branch `redesign/shelf-api`) added the Saved row (`ui-segmented-control`: any time, last month, last week = `query.saved`), Only › Favorites (`ui-checkbox`, `query.favorite`, disabled on Favorites) and the Icon row (`ui-choice-grid` icon tiles, `SAVED_VIEW_ICON`, the glyph shows on a pinned view). Not built: Only › Unread and With a reminder (the feed has no such filters).
- **View menu:** Edit view… (the New view dialog on the view's filter, name and icon, "Save changes", `SavedViewsStore.edit`), Rename, Pin to sidebar / Unpin from sidebar (pin kind `view`: the Pinned rows show the view's glyph, name and count and open its filter), Move left / right, Delete. Left: "Reorder views…" of the design (Move left / right and dragging stay).

## Ask history (branch `redesign/shelf-ask-history`)

From `11-ask.html` (author decision Nov 24, 2026: the history is stored on the server, per user; ADR 0055 amendment, ADR 0052 point 6 amended). Screens: `screens/b6-ask-system/ask-history-*` and `ask-leave-guard-*` (app at 1440, 820 and 390 in both themes).

- **API:** `ask_conversations`, `ask_conversation_turns`, `ask_conversation_turn_links` (migration `20261229120000_ask_history`; links by id, same-user composite FKs with cascade), written only by `POST /api/ai/ask` when a turn reaches `done` (`done.conversationId`), `conversationId` continues a stored conversation from the server's own turns; `GET`/`DELETE /api/ai/ask/conversations`, `GET`/`DELETE /api/ai/ask/conversations/:id`; 50 conversations and 50 turns per conversation; `GET /api/cron/ask-history` purges 30 days after the last turn; "Keep Ask history" (`ai_settings.ask_history`, default on); `DELETE /api/ai/data`, the account cascade and the JSON export (`askConversations`).
- **Desktop page (`/ask` from 64em):** the 240px list card (`app-ask-history-list`, `ui-conversation-row`): New conversation, Today / Earlier, the open row current, Delete on hover, Show more, the foot line "Kept on your account for 30 days." (the design's "Kept in this browser only." reworded for server history) with Clear all; the conversation (max 820px) with the full start and the composer at the bottom; `?c=<id>` opens and continues a stored conversation. The header Ask button opens the page; the drawer stays for hand-overs from search with "Open full page".
- **Phone and tablet (`/ask`, mobile shell):** block 6a's tab page and pushed conversation; the Conversations button (list icon) opens the list as a sheet; the pushed head has New conversation (the design's "+").
- **Leave guard:** "Leave this conversation?" (Stay focused, Leave) while an answer streams or a turn was not stored (history off, a failed write), on route changes, the drawer's close, New conversation, another conversation, Back, Open full page, and the browser's prompt on tab close or reload.
- **Settings › AI:** "Keep Ask history" with Clear Ask history.
- **Left:** the design draws the Conversations button in the phone top bar next to the avatar; the shell's top bar is shared (search field and avatar), so the button sits at the top end of the Ask tab page instead. Renaming a conversation (optional in the brief) is not built (no route). Browser Back / Forward between two `?c=` entries does not ask the leave guard (query changes do not run `CanDeactivate`); in-app exits do.

## Mocked in the Shelf redesign
- Ask history: production uses the API; `npm start` uses `features/ai/mock/mock-ask-history.ts` (in memory, seeded with the design's five conversations, reset by a reload).

## Block 2: the Link page, Add link and Revisit (branch `redesign/shelf-b2-link`)

- **Link page** (`features/link-preview/`): the desktop panel toolbar is Shelf's (previous / next, title, Related, Site | Reader, Reading settings in Reader, Open, favorite, Details, the ⋯ menu, × close after a divider); edit, copy and "Wider preview" moved into the ⋯ menu (`preview-menu`). `PreviewReaderService` (page-scoped) keeps the mode per site while the page lives, the details toggle and the reading progress; `preview-reader` renders `ui-reader` (an article, or for a page without text the link's own picture, summary and note with "Open <site>"); `preview-details` edits title and note in place (`LinkInlineEditService`); `reading-settings` is the popover. The blocked site offers "Open in Reader" first. The phone page has the same Site | Reader, Reading settings and Details under its header. Left: the list beside the preview keeps the feed's own view (#555) instead of the design's compact rows (that is `library.page`, block 1's file).
- **Reading settings** live on the account since the Reader API package below (`ReaderSettingsService`, first paint from `localStorage` `sm-reader-settings`).
- **Add link** opens as the Shelf panel (`DIALOG_VARIANT.Panel`: under the top end corner, the page undimmed from 40em, a bottom sheet on the phone); Edit link stays the centred dialog. New in `libs/ui`: the panel variant, `ui-select` `appearance="row"` (the "Goes to … · rule for …  Change" row), `ui-input` `labelHidden`, field border hooks `--ui-field-border(-hover)`. Remind me… and Favorite are applied after the create (`AddLinkExtrasService`: `PATCH /api/links/:id`, `PUT /api/reminders/:linkId`). The details stay usable while the preview loads or after it failed (the design hides them there; kept so a title and note can be typed meanwhile). The URL field keeps the mono URL look of `type="url"` (the URL keyboard on phones).
- **Revisit** is `/revisit` (`features/revisit/`, `RevisitService`): Due (`RemindersStore`), Continue reading (`READER_API.progress`), Forgotten this week (`RediscoverStore`), Recently opened (`LinksStore` history, last 30 days, five). No sidebar or tab bar entry yet: the shell belongs to block 1 (the tech lead wires the Today / Revisit entry).


## Reader package for the Link page (branch `redesign/shelf-reader`, ReaderView README)

- **Reading settings v2** (`features/link-preview/components/reading-settings-form`, shared by the 320px popover `reading-settings` (heading visually hidden) and the phone bottom sheet `reading-settings-sheet`, opened by Aa through `DialogService`): Theme (`ui-reader-theme-picker`: Light, Sepia, Dark, Black; until one is picked the tile of the app theme, `ThemeService.resolved()`, is checked and Reader follows the app), Font (Sans, Serif = Literata, Readable; each label in its own font), Text size (A, `ui-range` 14 to 24 in 1px steps named "Text size", A, the value; default 18), Line spacing (1.45 / 1.6 / 1.8), Line width (60 / 68 / 84ch), "Saved to your account" and Reset. `ReaderSettings` is `{ theme | null, font, size, lineSpacing, width }`; `parseReaderSettings` carries the first version over (S / M / L to 16 / 18 / 20, the old Narrow (68ch) to Normal, tone Sepia to the Sepia theme). Reader themes are fixed palettes (`--reader-sepia-*`, `--reader-black-*`; Light and Dark reuse the light canvas and dark surface tokens through `data-theme` on `ui-reader`).
- **Full screen** (`PreviewFullScreen`, root, read by the shell and `LinkPreviewService`): an in-app layout mode for the split view (from 80em; below that the Link page is already a page over the whole window, so tablet and phone have no button). The window control (`ui-button` `window`) sits after the divider next to ×; F toggles (`previewKey`, not while typing or in an overlay), Esc leaves full screen first (`LibraryHotkeysDirective`), the next Esc closes. While on, the shell hides its sidebar and header (`shell--link-full`), the library page hides the list, the trail and the resize handle and fixes the panel to the window (`library--link-full`), the head shows "3 of 17" (`LinkPreviewService.position`). It lasts while stepping (↑ ↓, the head arrows) and ends when the Link page closes. "Wider preview" is hidden meanwhile. Shortcut listed under Preview.
- **Link page head below 80em** (`preview-page`): the phone is two rows (title and site, ⋯, ×; then Site | Reader, Aa, Open as an icon, previous / next at the end); star is in ⋯ already and Details joins it there (`preview-menu` `details`). The tablet head is one row like the desktop panel. × replaces Back; the floating bar keeps Share and Related.
- **Separators** use `--sep` (the head dividers, the phone head line, the Today week rows, the full-screen search rows); `--line` stays the card hairline.
- Screens: `screens/reader/` (app and `-design` prototype shots at 1440, 820 and 390, light and dark).
- Note: the prototype hides the full screen button below 64em; the brief says desktop and tablet. In the app the tablet's Link page already covers the window, so the button appears from 80em, where the split view is.
## Reader API (branch `redesign/shelf-api-reader`)

- **Article** `GET /api/links/:id/reader` (`src/reader/`, `ReaderArticleService`): the session user's own live link (404 otherwise); "Fetch previews" off and videos answer `article: null` without a request; else the page through `SafeFetcherService` (`READER_FETCH_LIMITS`: 5 s, 1 MB, 4 redirects; never in a transaction), `extractReaderArticle` (parse5; Readability-style scoring of paragraph-like elements with tag and class / id weights and link density, a split body takes the parent; nav, header, footer, aside, forms, media, figures, hidden and chrome-classed elements dropped, a second pass without the class filter; headings, paragraphs (also loose text, two `<br>` end one), lists without link lists, quotes, code; text only, no URL or image; `READER_EXTRACT_LIMIT`: 1 M characters parsed, 400 blocks, 100 K characters, 4 K per block, depth 120; fewer than 120 words or 2 paragraphs is no article). Stored in `link_reader_articles` (jsonb, same-user FK, written only while the link still has the fetched URL, deleted by `PATCH` with a new page; a failed fetch retries after an hour). `RATE_LIMIT.ReaderArticle`. Image blocks are never sent (CSP `img-src 'self'`); Reader shows the link's own captured picture where it has no article.
- **Progress** `GET /api/reader/progress` (started 5 % to unfinished 95 %, live links, newest first, five), `GET` / `PUT /api/reader/progress/:linkId` (`{ fraction, minutesLeft }`, the server stamps the time): `reading_progress` with CHECKs, one plain SQL upsert (the link's `updated_at` stays), cleared on a URL change. `RATE_LIMIT.ReaderProgressWrite`. Revisit's Continue reading reads it; Today has no Continue reading group in the design, so it does not.
- **Reading settings** on the account: `users.reader_theme|font|size|line_spacing|line_width` with CHECKs and `reader_saved_at`, through `/api/me/settings` (`ReaderPreferences`, `readerSaved`). `ReaderSettingsService` paints from `localStorage` first, `UserSettingsStore` calls `adopt` (the account wins once saved, a local copy is saved once), changes save after a 600 ms pause (a failure is resent with the next change; a waiting change is sent before the session ends). The form reads "Saved to your account".
- Web: `HttpReaderApi` calls the three endpoints (no error toasts); `MockReaderApi` validates writes like the API and stamps the time.

## Block 6a: Ask, first run, system states (branch `redesign/shelf-b6a-ask`)

From `11-ask.html`, `10-first-run.html` and `14-system.html`. Screens: `screens/b6-ask-system/` (app at 1440, 820 and 390 in both themes; `-design` prototype shots).

- **Ask panel (desktop and tablet with a header):** the drawer stays (see Left); its start is Shelf's main column: the 48px sage spark tile, "Ask your shelf" (32/40), the lead with the link count, the four "what it can do" cards (`ui-ask-starters`: Find, Count and compare, Summarise, Plan and pick; two example questions each, folder questions from the largest folders); "New conversation" in the head once something was asked. Answers: the question bubble, the 28px spark, the finished steps with checks above the text (`AskEntry.steps` from the activity ends and their `found`) and the shimmering status line while tools run, citations as muted 18px numbers, link cards and sources as Shelf tiles (`ui-list-item tile`, three across from 37.5rem). The composer is the `surface-hover` box with the round primary send button (Stop while streaming) and the fine line "Answers are written by AI and can be wrong; check the links. N questions left …". With no questions left the start shows the limit row (`ui-notice` quiet, bell) with "Open search" and the composer hides.
- **Ask on the phone (`/ask`):** a tab page until the first question (the top bar and the tab bar stay; the compact start: 40px tile, "Ask anything about your N links.", one pill per kind, the composer 12px above the tab bar); then the conversation is pushed (`PushedPage`, both bars hide) with Back and the first question as the title; Back starts over. The fine line is hidden below 40em (Shelf).
- **First run:** All links with an empty library is `app-first-run` (scene, "Your shelf is empty", three numbered ways: paste a link, get the extension where offered, import bookmarks). The welcome dialog stays as it was.
- **Empty states:** `ui-empty-state` `page` matches `sm-empty` (240 x 150 scene on its r 70 disc, 48px under the page head, 16px gaps, pills at their own width); every page's empty state follows. The feed failure uses the new `error` scene, the Shelf sentence and a secondary Try again with the refresh glyph.
- **System:** the boot skeleton (`index.html`, `_boot-skeleton.scss`, `BootSkeletonComponent`) is Shelf's (blocks `surface-hover` radius 8, thin sidebar lines, the 640px search, plain card blocks, the phone top bar, no Ask button); the feed skeleton card is `y-skc`; the demo and offline banners are Shelf strips (10-first-run); the library extension offer is the sage strip of 14-system (64px fixed, the skeleton holds the place); the What's new dialog lists the other highlights as card rows with their date; the AI intro is the spark, the 16px title and the points as one card.
- **Left / not built:**
  - ~~The desktop Ask *page* with the conversation list~~ built on `redesign/shelf-ask-history` (below; author decision Nov 24, 2026: history on the server). The bars chart answer, "Remind me Saturday" and "Save as view" under an answer have no data or API (the mock and the API stream text, cards and sources only).
  - "AI is off" row on the Ask start: the Ask page and panel are not reachable while Ask is off (they leave or never open).
  - Session ended, signed out in another tab and the demo ended as dialogs over the dimmed or blurred library (14-system): today the session end clears the user's data and goes to the sign-in page with the reason notice (`expireSession`, `SessionScope.end`); keeping the library on screen behind a dialog after the session ended is a security decision (PROJECT.md 5.8) for the author. The demo "minutes left" warning strip in the content and the in-content offline row of 14-system differ from the top strips of 10-first-run; the top strips were built.
  - Update ready, failed save, reminders due toasts and the Open many links confirm: unchanged (already the Shelf toast and dialog through the tokens). The link page loading state was block 2's (Reader package).
  - "Replay" under the first run (a prototype control), the Help page of 10-first-run (How it works video, feedback form, Your feedback): not in this block's list.
  - The prototype's 32px first-run heading: `ui-empty-state` keeps its 22/28 heading (EmptyState spec).

## Mocked in the Shelf redesign
- Block 6a: nothing new is mocked (Ask uses `AI_API.ask` and its mock; the first run uses the existing folder counts, extension and import services).

## Block 6b: public pages, extension, landing (branch `redesign/shelf-b6b-public`)

From `06-public.html`, `07-extension.html` and `16-landing.html` (with the DS-scale update). Screens: `screens/b6-public/` (and `extension/`) and `screens/landing/`, each with the `-design` prototype shots.

- **Landing** (`features/landing/`, `/` and `/about`, AUTH-05 / PUB-02 unchanged): sticky 64px header (logo; How it works, AI, What's new (`/changelog`), Privacy, hidden below 900px; the theme switch: a guest's choice stays local, a signed-in one goes through `UserSettingsStore.setAppearance`; Sign in (hidden below 560px) and Start your shelf, or Back to my shelf), the hero (64px headline, the one described `font-size` exception; lead 18; Start your shelf / Open the demo) with the live app preview (`landing-hero-preview`, `role="img"`: sidebar, search, title with the view switch, All links tabs, six real cards with notes, the toast), What's new under the hero for a signed-in visitor (four changelog highlights, texts clamped to three lines), then deferred: AI (id `ai`, three points and three drawn examples), the extension (always shown now: a browser frame with the popup, the folder from a rule, no install link), the bento (id `works`, five tiles that lift on hover), before / after (collage, the Shopping shelf whose rows slide in), Why this exists + How it's built (id `how`), the finale on the turning four-colour wave, the footer with the language track. The header links scroll through `sectionRequested` (`/#ai`, `/#works`, `/#how` load the deferred blocks first; targets have `scroll-margin-top`).
- **Motion:** hero entrance (lines, lead, buttons, preview); `LandingPreviewCycleService` (preview-scoped): cards land once, the toast at 1.5 s, every 3.6 s All links › All, › Videos, Shopping, Favorites, Watch later through `runViewTransition` (card names only while it runs) or a 260 ms fade without View Transitions, the toast only on All links › All, a click on a row or tab picks its frame and the cycle resumes 6 s later, paused off screen and in a hidden tab (`LandingLoopGateDirective`); scroll reveal through `appLandingReveal` (12% threshold, 90 ms stagger, `revealStartMs` / `revealStepMs` for the shelf rows: 300 ms + 120 ms); nothing hidden or moving under reduced motion or the Animations setting.
- **Previews** are app assets in `public/media/landing/` (WebP, 480px wide stills and screenshots, 384 x 480 clothes; `LANDING_IMAGES`), loaded with `NgOptimizedImage`; the sign-in drift reuses them.
- **DS:** every block-6 `stylelint-disable` is gone; type on the DS scale (micro 10 / meta 12 in the preview), radii 16 / 12 / 10 / 8 / 6, shadows `shadow-l2` (cards) and `shadow-l3` (frames) instead of the prototype's 8/28 and 24/64; the sticky note is the amber folder pair; frames of other people's UI (browser, phone share sheet, the collage) carry `data-ds-ignore`. `ui-button` gained `--ui-button-pressed-color|bg` for the footer language track.
- **Sign-in** (`06` Sign-in / error): one 400px card on every width (40px mark, the new title and lead, both providers as 48px secondary pills, "or", "Look around in the demo", the short privacy line); from 64em the drifting cards show real pictures where the link has one (ten of them, titles renamed to the pictured links), below it the card stands alone (the phone strip and `sign-in-phone-cards` are gone).
- **Public collection** (`06` Shared folder): 1040px column, "Start your own shelf" in the bar, the 40px folder tile (amber; the public response has no colour) with the title and the byline (owner · links · updated), subfolder chips, a 240px masonry; Copy link and the invitation panel stay. Offline: a failed load while offline shows the offline scene with Try again.
- **Not found** (`06` Not found): `features/not-found/`, the `**` route (`notFoundRoute`, last in `app.routes.ts` and `app.routes.e2e.ts`): the page-not-found scene, "Go to your links" (signed in) or "Go to Shelfmark".
- **Extension** (`07`): the Shelf frame on every screen (head with the logo lockup and the This page / All tabs switch, foot with the hint and the actions at the end, `sep` lines), the folder button reads "Goes to <folder> · rule  Change", the foot names Ctrl / ⌘ Enter, the saved link is a row with its picture (`popup-link-card` → `ui-list-item`), Saved and Signed out show their scenes. Open Shelfmark left the form's foot (the design has none there).
- **Right-click save (`07` Right-click save), built later on `redesign/shelf-ext-context-menu` with the author's OK:** extension 1.3.0 adds the `contextMenus` permission and a module service worker (`apps/extension/src/background/`): "Save link to Shelfmark" on links and "Save page to Shelfmark" on pages save at once through the popup's API path (session, duplicate check, `POST /api/links` with the server's domain rule). The design's in-page toast "Saved to Shopping · Open" would need a content script, which stays forbidden: the result is a ✓ / ! badge on the toolbar button with the words ("Saved to Shopping") in its tooltip; signed out opens the popup's sign-in screen.
- **Not built / left:** the extension's "Edit" after save and the folder row with Change on Saved (no edit-after-save flow exists), the Tags label inside the tag field and the "Sort with AI" button inside the tab list (it stays in the foot). The empty-state heading of Not found and Offline is the shared `ui-empty-state` size (24px), not the prototype's 32px. The store screenshots in `docs/store/extension/` still show the old popup: re-render them with `apps/extension/scripts/popup-screenshots.mjs` and `store-images.mjs` before the next store upload.

## Mocked in the Shelf redesign
- Block 6b: nothing (the landing and sign-in drawings are static pictures, not data).
- Help center: nothing mocked. The articles are static typed data with their texts in the language files; "Was this helpful?" keeps the answer on the page only (no endpoint stores votes).
- Block 5, part 2: nothing new is mocked. Email is not mocked either: it is hidden (`EMAIL_ENABLED`, postponed by the author).
- Block 1: nothing (Today uses the existing reminders, links `?saved=week` and Rediscover endpoints and their mock implementations).

- Block 3: nothing (search uses `GET /api/links?q=`, `AI_API.searchMeaning` and the folders, tags and saved views already loaded; recent searches live on the device).
- Block 5: **Notifications** — no longer mocked in production (API phase 1, branch `redesign/shelf-api`): `apps/api/src/notifications/` stores what to push, the quiet hours and the Web Push devices and delivers due reminders from `GET /api/cron/notifications`; `features/notifications/http/http-notifications.api.ts` calls `/api/me/notifications` and `PushSubscriptionService` subscribes through `SwPush`. Production answers `available: false` until the author sets the VAPID keys (`docs/SETUP.md` 5.12). Still mocked: `features/notifications/mock/mock-notifications.api.ts` for `npm start` (`localStorage` `sm-mock-notifications`, no push in dev builds). **Weekly email**: postponed by the author and hidden: no setting in the contract or the API (push only). Not built: the "Continue reading" nudge is stored but never sent (reading progress is not on the server yet), Snooze from the notification (the service worker cannot send a POST), translated push texts (English only: the server has no message catalogue).
- Block 4: nothing (organise uses the existing folders, tags, rules, trash, links batch, saved views and AI tidy / view draft endpoints).
- API phase 1 (branch `redesign/shelf-api`): **Account deletion grace period** is built (`DELETE /api/me` schedules 7 days ahead and signs every device out; Settings › Account shows only the warning notice with "Keep my account" while it is scheduled, `AccountDeletionStatusStore`; `GET /api/cron/account-purge` deletes for good). Mock: `features/account-deletion/mock/mock-account-deletion.api.ts` keeps the date in `localStorage` `sm-mock-account-deletion-scheduled` and never purges.

## Library fixes (branch `redesign/shelf-fix-library`, author feedback Nov 25)

- **Grid size** (View popover, `GRID_COLUMNS` 130 to 300px): it did nothing on a tablet, where the feed forced three columns below 64em. Only the phone (no Grid size) keeps two columns now; the masonry gap and row spacing follow the step (`clamp(12px, 10% of the column, 28px)`, as `01-library`). e2e: `library-view-controls.spec.ts`.
- **Headlines view** (the fourth view, icon `lines`): `LIBRARY_VIEW.Headlines` (contract, API DTO through `Object.values`, migration `20261230100000_default_view_headlines` widens the `default_view` check), `ui-list-item` `headline` (40px / 48px phone row, L1 panel with hairline dividers in the feed), `app-link-row` `headline` (favicon, title, domain, folder, date; phones keep title and date). Settings › Library › Default view lists it.
- **Menus split** (`01-library` More menu, `04-organise` Folder menu): folder menu by the title; toolbar ⋯ with Sort and one "Export this view…" (Export dialog with "This view · N" next to the whole library); F2 renames on a folder page; "Save this view" is the dashed chip in the saved views bar on desktop too (`13-views`).
- **Bulk bar** (desktop): floating, content-sized, centred, 16px above the bottom; tablet and phone keep the stacked bar.
- **Add link**: "Add several links" stays reachable with an address typed (and takes the address along).

## Help center and landing width (branch `redesign/shelf-help`, `17-help`, `16-landing`)

- **Landing, wider and bigger:** the page column is up to 1440px with fluid side padding (`clamp(16px, 4vw, 72px)`, mixin `wrap` in `features/landing/_landing.scss`); the hero is at least the first screen (`min-height: 100svh` minus the sticky header, content centred, columns 1 : 1.35, no fixed height), its preview grows with the width (`clamp(460px, 38vw, 760px)`, a fourth card column from 46em of its own width through a container query) and the headline may grow to 84px on wide windows (the described `font-size-token` disable stays). Section leads are capped at 68ch, the hero lead at 36em. Pictures in `screens/landing-wide/` (1280, 1440, 1920, 2560, 390, light and dark).
- **Help center** (`features/help/`, route `/help` and `/help/:articleId`, public, outside the shell, no guard; `APP_PATH.Help`): `help.page` is the home (hero with the search, "Popular:" links, six topic cards, three tiles: How it works opens the video dialog, Keyboard shortcuts, Still stuck? opens Send feedback, a guest is led to sign-in) and, while the address has `?q=`, the search view (`searchHelp` over titles, leads and bodies: client side, every word, accent and case insensitive, title hits first, a marked snippet; an empty `?q=` lists every article; Ctrl / Cmd K and the header pill open it and focus the field). `pages/help-article/` is the article (topics nav, crumbs, lead, read time, sections, Related, Was this helpful?, Previous / Next, On this page; below 68.75em On this page leaves, below 53.75em the topics become a disclosure button; unknown id: "Article not found"). The account topic has no card on the home (the design shows six); its five articles are in the nav, search and the Popular list. Data: `models/help-articles.const.ts` (27 articles, sections and blocks), `help-categories.const.ts`, `help-popular.const.ts`; texts under `help.articles.<id>.*` in all seven language files, `**bold**` marks a control name and `` `code` `` a key cap (`parseHelpInline`, no `innerHTML`). The Rules article has the "New rule" picture (`help-rule-mock`, inert). Entries: the sidebar "Data & help" menu item "Help center" (new tab), the phone You list row (new tab), the landing header and footer "Help". Not built: the "Learn more" links beside settings rows and empty states of the design's "In the app" board, and the `?` / `Shift ?` hint line (the shortcuts dialog is another block's file).

## For the author at the end (manual setup, not done by agents)

- **Later, after the redesign (author, Nov 24, 2026): MCP `save_link` tool.** "Read and save" tokens can be created and stay visible, but the MCP server is read-only (ADR 0054), so they act as read-only today. Plan: a `save_link` tool (url, optional title, note, folder, tags) through the normal create path (rules, duplicates, SSRF-safe preview), allowed only for `save` tokens, its own rate limit and idempotency, isolation and access tests; needs an ADR 0054 update and the shared create logic moved where `McpModule` can use it without importing `LinksModule`. About one to two hours of agent work.

- **Vercel Schedules (before deploying the `redesign/shelf-schedules` change):** enable Schedules (beta) for the team, otherwise the deploy fails; then check that the Schedules page lists `notifications` (every 15 minutes), `account-purge` and `ask-history`, and **Run once** `notifications`. Reminders then arrive within about 15 to 30 minutes. Run budget on Hobby and the remaining Cron Jobs: `docs/SETUP.md` 5.12, ADR 0034 amendment 2026-11-25.
- **Web Push keys in Vercel:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (e.g. `mailto:` of the project). Without them the API answers "not configured" for push notifications and sends nothing.
- **Weekly email:** postponed by the author (Nov 24, 2026): the screen stays as designed with mocked data; delivery needs a mail provider and is not built.

## Sidebar fixes (2026-11-25, `redesign/shelf-fix-sidebar`)

- The desktop sidebar footer has no Theme row any more (author's choice, overrides 01-library); the theme stays in Settings › Appearance. The footer is the "New here? Watch how it works" card (Shelf `.foot > .intro`, so it never scrolls), then Get the extension, Data & help, Trash.
- The inline new-tag field in the column list is `flex: none` (its `flex-basis: 150px` was a height there); section headings keep 4px between label and chevron (`--space-1`).
- `scroll-fade` draws nothing without scroll-driven animations (it used to be always on there).
