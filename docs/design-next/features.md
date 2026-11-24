# Shelfmark feature inventory, as is

Step 1 of the redesign plan in [`README.md`](README.md): a neutral description of everything the product does today (November 2026, branch state of `stage` at the time of writing). It describes behaviour; it does not judge it or propose changes. Oddities are listed as facts in [section 6](#6-observations).

The screen catalogue (section 4) is in a separate file, [`screens.md`](screens.md), because one file got too large to work with. This file holds sections 1–3 and 5–7.

**Sources, in order of trust:** the code (`apps/web/src/app`, `apps/extension`, `apps/api`, `libs/shared/contracts`), then `docs/PROJECT.md`, `apps/web/CLAUDE.md`, `docs/ai/*`, then the mockups in `docs/design/screens/` (anything only there is marked "designed, not built"), and `apps/web/src/app/core/i18n/en.json` for exact copy. Quoted strings in "double quotes" are the English UI copy. `{{name}}` is a value filled in at run time.

**Breakpoints used in the code** (`ViewportService` and the Sass mixins):

| Name in this document | Width | What changes |
| --- | --- | --- |
| Phone | below 40em | Small-screen details: dialogs become bottom sheets, one column, stacked buttons, swipe rows |
| Tablet | 40em to 64em | Uses the **mobile shell** (tab bar, no sidebar, phone Library / Tags / You pages) with the non-phone details (dialogs stay centred) |
| Mobile shell ("compact") | below 64em | Phone + tablet: floating tab bar, no sidebar, no top bar |
| Desktop | from 64em | Sidebar, top bar, settings navigation beside settings pages |
| Wide | from 80em | Inline header search panel, side by side, link preview split beside the feed |

Note: the tablet range does **not** get its own layout; it shares the mobile shell with the phone. Where this document says "phone" without qualification for shell-level behaviour, it means the mobile shell (below 64em).

**ID prefixes:** SHL shell and global behaviour · LIB library browsing · LNK actions on one link · ORG folders · TAG tags · RUL rules · TRS trash · REM reminders · SRC search · AI AI features · MCP MCP / API access · CAP capture · IMP import · EXP export · SHR sharing and public collections · SET settings · ACC account · FBK feedback and rating · ADM admin · KEY keyboard shortcuts · EXT browser extension · PUB public pages · AUTH sign-in, demo, session · ONB onboarding. Screens use `SCR-<prefix>-NN`.

## 1. Surfaces

| Surface | How it is reached | Notes |
| --- | --- | --- |
| Web app, desktop (from 64em) | Sign in at `/sign-in` or start a demo at `/demo`; `/` opens the app for a signed-in user (redirects to `/links`) | Sidebar (fixed rows, Pinned, Folders, Tags, footer), top bar (search, Ask, keyboard shortcuts, theme toggle, Add link, account menu), page on the right; from 80em the search panel is inline in the top bar and the link preview and side by side open beside the feed |
| Web app, tablet (40–64em) | Same URLs | Mobile shell (tab bar: Library, Search, Tags or Ask, You, plus the Add button), dialogs centred |
| Web app, phone (below 40em) | Same URLs | Mobile shell; dialogs and menus become bottom sheets; swipe and long-press gestures on rows |
| Installable web app (PWA) | The browser's own install UI (no in-app install prompt) | Standalone window; Android Web Share Target opens `/share` |
| Android share target | Share a page from another Android app to the installed Shelfmark | `/share?url&text&title`, a quick-save sheet outside the shell, signed-in only |
| Browser extension popup (Chrome MV3) | Toolbar button of the installed extension; "Get the extension" in the web app (desktop Chromium only) | Saves the current tab (or several tabs); its own surface, ~popup size, follows the system theme and browser language, not the app settings |
| Landing `/` (guests) and `/about` (everyone) | Visiting the site signed out; "About Shelfmark" in the account menu | Signed-in variant shows "Back to my shelf" and "What's new" |
| Sign-in `/sign-in` | "Sign in" on the landing; any protected URL while signed out (returns there afterwards) | Google and GitHub only (email flows designed, not built) |
| Demo `/demo` | "Open the demo" on the landing and the sign-in page | Creates a temporary demo account with sample data; demo banner in the shell |
| Shared collection `/c/:token` | A public link created from a folder's Share dialog | Read-only page outside the shell; for guests and signed-in people alike |
| Changelog `/changelog` | Landing; the "What's new" dialog (sidebar "Data & help" menu, You list) links to it | Public list of releases |
| Privacy policy `/privacy` | Landing footer, sign-in page, settings, OAuth consent screens | Public |
| Admin `/admin/feedback`, `/admin/stats` | Account menu, only for the author account | Feedback inbox and usage statistics |
| MCP server (API only) | `POST /api/mcp` with a personal token created in Settings › AI › "Connect your assistant" | Lets an external AI client (e.g. Claude) search and read the user's links; Pro, not demo |
| Export (API) | `GET /api/export?format=json|html|csv` (with optional `folderId`, `tag`, `q`, `kind`), started from the app's export entry points | Downloads a file; no separate UI surface |
| Public collection API | `GET /api/public/collections/:token` | Backs `/c/:token`; no auth |
| Emails | none sent | Email templates are designed (`Emails.dc.html`), not built: the API has no mailer |

## 2. Route map

All app routes are lazy pages. "Signed in" routes sit inside the app shell; a guest on any of them is sent to `/sign-in?returnUrl=<url>` and comes back after signing in (the query, e.g. shared data on `/share`, survives).

| Path | Page | Guard / who can see it | Desktop vs phone |
| --- | --- | --- | --- |
| `/` | Landing (guest) · app shell redirecting to `/links` (signed in) | Guest: landing at once without waiting for the API; with a session hint it waits and a signed-in user gets the app | Landing: phone hides the header navigation |
| `/links` | Library feed: All links. Query: `q` (search text), `tag` (repeatable), `kind`, `sort`, `split`, `related`, `preview` | Signed in | Desktop: sidebar + toolbar; mobile shell: Options menu, preview opens as a pushed full-screen page; from 80em side by side and preview beside the feed |
| `/unsorted` | Library feed: Unsorted (links without a folder) | Signed in | as `/links`; "Tidy" entry when AI is on |
| `/unsorted/tidy` (`?import=<id>`) | Tidy Unsorted: review AI folder and tag suggestions | Signed in and AI on; otherwise redirects to `/unsorted` | Desktop: actions in the header; mobile shell: pushed page with a bottom bar |
| `/favorites` | Library feed: Favorites | Signed in | as `/links` |
| `/folders/:folderId` | Library feed: one folder (header, description, subfolders, links) | Signed in; an unknown or foreign id shows "Folder not found" | as `/links` |
| `/library` | Phone Library tab: Pinned, folder tree, tiles (All links, Unsorted, Favorites, Recently opened, Reminders, Trash, Tags when Ask is on) | Signed in | Mobile shell only; from 64em redirects to `/links` |
| `/tags` | Phone Tags tab: all tags | Signed in | Mobile shell only; from 64em redirects to `/links` (desktop has tags in the sidebar) |
| `/ask` | Ask your shelf, full screen | Signed in, AI on and Ask on; otherwise redirects to `/library` | Mobile shell: the Ask tab (replaces Tags); from 64em redirects to `/links` and opens the Ask panel instead |
| `/recent` (`?show=forgotten`) | Recently opened: Opened / Forgotten | Signed in | Desktop: page from the sidebar; mobile shell: the Library tile opens the same list in a sheet (the page is still reachable by URL) |
| `/reminders` | Reminders: due and upcoming | Signed in | Mobile shell adds a back "Library" link |
| `/trash` | Trash | Signed in | Mobile shell adds back "Library" and "Empty", swipe rows, long-press selection |
| `/settings` | You list (settings index) | Signed in | Mobile shell: the You tab list; from 64em redirects to `/settings/account` |
| `/settings/account` (`#your-data`) | Account: profile card, your shelf numbers, Your data (export, import), sign out, delete account | Signed in | Desktop: settings navigation replaces the sidebar; mobile shell: back "You" |
| `/settings/appearance` | Appearance: theme, custom theme, text and layout, cards, dates and numbers, sidebar and motion | Signed in | Preview beside (desktop) or above (mobile shell) the options |
| `/settings/library` | Library settings: viewing, rules, trash retention, extension row | Signed in | Extension row desktop only |
| `/settings/library/cleanup` | Library clean-up (AI duplicates and similar tags) | Signed in (works with AI on) | Desktop: header actions; mobile shell: bottom bar |
| `/settings/ai` (`#ai-data`, `#ai-backfill`) | AI settings | Signed in | Desktop: segmented controls; mobile shell: rows with chevrons |
| `/settings/ai/folder`, `/settings/ai/tags` | AI mode choice for folders / tags (full labels) | Signed in | Designed for the mobile shell; reachable on all sizes |
| `/settings/language` | Language: interface language only (date format, clock and week start are on Appearance) | Signed in | same |
| `/settings/shortcuts` | Keyboard shortcuts | Signed in | No row in the phone You list (URL or desktop navigation only) |
| `/settings/privacy` | Privacy and data | Signed in | same |
| `/settings/feedback` | Your feedback | Signed in | same |
| `/settings/import-export` | Redirects to `/settings/account#your-data` | Signed in | same |
| `/admin/feedback` | Feedback inbox | Signed in and admin (API check); others → `/links` | Desktop keeps the normal sidebar |
| `/admin/stats` | Usage statistics | Signed in and admin | same |
| `/share` (`?url&text&title`) | Share target quick-save | Signed in (guest → sign-in and back with the query) | Outside the shell; phone: a sheet with a grip; larger screens: a card |
| `/about` | Landing for everyone | Public | Signed-in variant |
| `/privacy` | Privacy policy | Public | same |
| `/changelog` | Changelog | Public | same |
| `/c/:token` | Public collection | Public | Outside the shell, responsive |
| `/demo` | Demo start (creates a demo session, then the library) | Public; signed in → `/links` | same |
| `/sign-in` (`?returnUrl`) | Sign-in | Guests only; signed in → `/links` | Desktop: drifting sample cards; phone: a card strip |
| `/__e2e/add-link` | Test page that opens Add link | Only in the e2e build | n/a |
| `/__e2e/csp` | Test page for the content security policy | Only in the e2e build | n/a |
| Extension popup `index.html` | One view at a time: Opening, Form, Folder picker, New folder, Saved, Saved tabs, Already saved, Signed out, Unsupported page, Error | Anyone with the extension; a Shelfmark session for anything beyond "Signed out" | Extension only |

There is no catch-all (`**`) route at the top level and no "page not found" screen: an unknown URL matches no route.

## 3. Feature catalogue

Grouped by the area where the feature lives today. Each area starts with a short scope note.

### 3.1 Library, links and app shell

Scope: the signed-in app shell (sidebar, top bar, account menu, phone tab bar, banners, boot skeleton), the global behaviour in `core/` (toasts, undo, errors, offline, tab sync, update prompt, theme application, breakpoints, scroll, extension offer, monitoring, routing), the library feeds (`/links`, `/unsorted`, `/favorites`, `/folders/:id`, `/library`), view / sort / filters / saved views, selection and bulk actions, side by side, the link preview, Recently opened and Forgotten, and every action on a single link (card, row, menu, edit, delete, move, favorite, pins, drag and drop).

Breakpoints used in this area (from `ViewportService` and Sass mixins): **phone** below 40em, **compact / mobile shell** below 64em (phones and tablets in portrait: tab bar, no sidebar), **desktop** from 64em (sidebar + top bar), **wide** from 80em (side by side, preview split, inline header search), **huge** from 160em (sign-in only, not this area). "Tablet" below means 40em to 64em, which uses the mobile shell but the non-phone details.

#### SHL-01 App shell layout
- What it does: Wraps every signed-in page. Desktop (from 64em): an inset sidebar card on the left (or the settings navigation on settings pages), a top bar and the page on the right. Mobile shell (below 64em): no sidebar and no top bar; each page carries its own title and a floating tab bar at the bottom is the navigation. A demo banner and an offline banner can appear above everything. The main column is the scrolling element (the document itself never scrolls) and is the area toasts centre on.
- Entry points: any signed-in route; `/` for a signed-in user (redirects to `/links`).
- Screens / routes: SCR-SHL-01, SCR-SHL-07; all routes under the shell (see Routes).
- Platforms: desktop/tablet-landscape: sidebar + top bar. Below 64em: tab bar only, sidebar replaced by the phone Library page (`/library`), Tags tab, You tab. On settings pages (URLs whose first segment is `settings`) the sidebar is replaced by the settings navigation and the top bar has no search and no Ask button.
- States: first load shows the static boot skeleton until the first page renders (SHL-13). Guest on a protected URL is sent to sign-in and back (SHL-25).
- Data: on shell creation it loads pins (`GET /api/pins`), the account settings (`GET /api/me/settings`), the due-reminders notice check, the AI settings, and (for a non-demo user) the admin status check (`GET /api/admin/status`). The sidebar loads folders, trash, pins, Rediscover, tags, settings.
- Settings that change it: none directly; Appearance settings change the look (SHL-19).
- Feedback: none of its own.
- Limits: none.
- Related: SHL-02..SHL-10, SHL-24; settings navigation (settings area).
- Source: `shell/app-shell.component.{ts,html}`, `shell/phone-tab-for-url.ts`, `shell/pushed-url.ts`, `core/layout/toast-area.directive.ts`, `core/layout/scroll-restoration.directive.ts`.

#### SHL-02 Sidebar: fixed rows
- What it does: The top block of the desktop sidebar is a tree of five fixed rows, in this order: "All links" (bookmark icon), "Unsorted" (inbox icon), "Favorites" (star icon), "Recently opened" (clock icon), "Reminders" (bell icon). Choosing a row navigates; the active row follows the URL. The logo above them links to `/links`.
- Entry points: click / Enter on a row; arrow keys inside the tree (Angular Aria tree); the logo.
- Screens / routes: SCR-SHL-02; `/links`, `/unsorted`, `/favorites`, `/recent`, `/reminders`.
- Platforms: desktop only (from 64em). The phone Library page (LIB-30) shows the same destinations as tiles.
- States: counts show only once the folder list has loaded. Before that rows show no number.
- Data: counts `all`, `unsorted`, `favorites` from the folders list (`GET /api/folders` counts); the Reminders row shows the number of due reminders (from the reminders store); the Recently opened row shows a note "{{count}} forgotten" ("1 forgotten" / "5 forgotten") when the weekly Rediscover block has items (`GET /api/rediscover`).
- Settings that change it: Settings › Library › "Show folder counts" off hides the link counts of All links / Unsorted / Favorites. The due-reminders count and the "N forgotten" note show regardless.
- Feedback: while a link is dragged, All links, Favorites, Recently opened, Reminders (and Trash) show a no-drop state and, when first hovered, an info toast with the reason (LNK-09). Unsorted accepts drops.
- Limits: none.
- Related: LNK-09, LIB-27, reminders (other area), LIB-29.
- Source: `shell/sidebar/sidebar.component.*`, `shell/sidebar/utils/sidebar-nodes.ts`, `shell/sidebar/models/sidebar-fixed-routes.const.ts`, `shell/sidebar/utils/inject-sidebar-labels.ts`.

#### SHL-03 Sidebar: Pinned section
- What it does: A "Pinned" section between the fixed rows and Folders lists up to 7 pinned folders and links in the user's order. A folder row shows its coloured icon tile, name and link count and opens the folder page; a link row shows favicon (or letter) and title and opens the link (new tab or same tab per setting) and records the open. Each row has one action: an "Unpin {{name}}" icon button (pin-off icon; visible on hover/focus, always on touch), which unpins with an Undo toast. Rows reorder by dragging (mouse at once; touch after a 400 ms rest, then move; a line shows where the row lands) or with Alt+Up / Alt+Down on the focused row; the new place is announced politely ("Moved up, position {{position}} of {{total}}" / "Moved down, position {{position}} of {{total}}"). Pinned folder rows are drop targets for dragged links (they show "Move here"); pinned link rows show a no-drop state while a link is dragged. The section heading has a chevron toggle "Show or hide pinned" (desktop, SHL-06).
- Entry points: "Pin to sidebar" in a folder menu (SCR-SHL-03) or link menu (SCR-LNK-03); the row's unpin button; drag; Alt+arrows.
- Screens / routes: SCR-SHL-02, SCR-LIB-23.
- Platforms: desktop sidebar: the section is not rendered at all when nothing is pinned. Phone Library page: the section is a card with a page-sized heading; when nothing is pinned (and pins have loaded) it shows one quiet row "Nothing pinned yet" whose tap shows an info toast "Nothing pinned yet — use “Pin to sidebar” in a folder or link menu". On Android the long-press link menu is suppressed while a row is dragged.
- States: empty (above); loading (nothing shown until loaded).
- Data: `GET /api/pins`, `POST /api/pins` {kind, id}, `DELETE /api/pins/:kind/:id`, `PUT /api/pins/order`. PinResponse {kind, position, folder|link}. Folders going to Trash and links deleted drop their pins.
- Settings that change it: "Show folder counts" (folder row counts); Appearance › Folder colours (graphite when off); Settings › Library › "Open links in".
- Feedback: unpin: success toast "Unpinned from sidebar" (detail: name) with "Undo" (8 s, Alt+Shift+T hint); Undo re-pins at the old place. Failures: "Couldn't unpin" (detail: name); "Couldn't change the order" / "The old order is back."; pin refused at the limit: warning toast "Pinned is full" / "You can pin up to 7 folders and links. Unpin one first." (6 s); other pin failure: "Couldn't pin" (detail: name). Pin and unpin from menus have no success toast. All optimistic with rollback.
- Limits: 7 pins total (`PIN_LIMIT.Max`).
- Related: LNK-11, SHL-04 folder menu, LNK-09.
- Source: `features/pins/components/sidebar-pinned/*`, `features/pins/services/pin-actions.service.ts`, `stores/pins.store.ts`, `core/a11y/reorder-announcer.service.ts`, `apps/api/src/pins/pins.controller.ts`, `libs/shared/contracts/src/pins/*`.

#### SHL-04 Sidebar: Folders section (entry points)
- What it does: A "Folders" heading with a chevron toggle "Show or hide folders" (desktop) and a "+" icon button "New folder", then the folder tree: each folder has its colour/icon tile, name and link count; folders above the active one start expanded; the active folder is highlighted. Selecting navigates to `/folders/:id`. Each row has a "…" button "Actions for {{name}}" and a context menu (right click, Shift+F10, long press on touch) with the folder menu (SCR-SHL-03). Folders reorder among siblings by dragging or Alt+Up / Alt+Down (announced). Folder rows and Unsorted are drop targets for dragged links ("Move here" label). Folder management itself (create, rename, move, style, share, delete) belongs to the organise area.
- Entry points: "New folder" button (also unfolds a folded Folders section first); folder menu items; drag.
- Screens / routes: SCR-SHL-02, SCR-SHL-03, SCR-LIB-23.
- Platforms: desktop sidebar; on the phone Library page the same tree is shown (`foldersOnly`) without the chevron toggle, with the same menu and reorder (touch reorder after a rest).
- States: first load: nothing for 300 ms, then tree-shaped skeleton rows (4 rows in the sidebar, 5 on the phone page), never an empty section; load error: "Couldn't load your folders." with a "Try again" button (44px on compact screens).
- Data: `GET /api/folders` (with counts); reorder/create/etc. via folders API (other area).
- Settings that change it: "Show folder counts"; Folder colours.
- Feedback: see organise area. Reorder announced.
- Limits: see organise area.
- Related: folders (other area), SHL-03, LNK-09.
- Source: `shell/sidebar/sidebar.component.*`, `shell/sidebar/services/sidebar-folders.service.ts`, `shell/sidebar/services/sidebar-tree-focus.service.ts`, `shell/sidebar/utils/folder-tree-nodes.ts`.

#### SHL-05 Sidebar: Tags section (entry point)
- What it does: Under Folders, the tags section (owned by the organise area) with its own chevron toggle "Show or hide tags". Shown once tags have loaded or failed.
- Entry points: sidebar; phone Tags tab; on the phone Library page while Ask has replaced the Tags tab.
- Screens / routes: SCR-SHL-02, SCR-LIB-23.
- Platforms: desktop sidebar; phone (Tags tab or Library page).
- States: hidden until loaded.
- Data: tags store.
- Settings that change it: none here.
- Feedback: n/a.
- Limits: n/a.
- Related: tags (other area).
- Source: `features/tags/components/sidebar-tags/*` (other area), `shell/sidebar/sidebar.component.html`.

#### SHL-06 Sidebar: collapsible sections
- What it does: Pinned, Folders and Tags fold away under their heading with a chevron button ("Show or hide pinned", "Show or hide folders", "Show or hide tags"; aria-expanded). The folded state is a per-device preference.
- Entry points: chevron next to each heading.
- Screens / routes: SCR-SHL-02.
- Platforms: desktop sidebar only (not the phone Library page).
- States: all open by default; unreadable or blocked storage means all open.
- Data: `localStorage` key for collapsed sections (removed when all are open again).
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: SHL-03, SHL-04, SHL-05.
- Source: `shell/sidebar/services/sidebar-sections.service.ts`, `shell/sidebar/models/sidebar-section.const.ts`.

#### SHL-07 Sidebar footer: extension row, "Data & help" menu, Trash row
- What it does: The footer stays fixed at the bottom of the sidebar. In order: (1) "Get the extension" row (download icon) only after the library's extension banner was closed and the extension is offered (SHL-22): opens the Chrome Web Store page in a new tab. (2) "Data & help" row (more icon) which opens a menu upwards (SCR-SHL-04): "Import links", "Export", separator, "What's new" (with a "new" badge while a release is unseen), "Send feedback". The row carries a dot while What's new is unseen. ArrowUp on the row opens the menu focused on the last item; Enter/click toggles it focused on the first item. (3) A divider, then the "Trash" row (trash icon) with the number of items once Trash has loaded and only when not empty; it navigates to `/trash`.
- Entry points: footer rows.
- Screens / routes: SCR-SHL-02, SCR-SHL-04; `/trash`.
- Platforms: desktop only. The extension row and the Data & help row are not rendered below 64em (the phone You list has the same entries; Trash is a tile on the phone Library page).
- States: Trash count hidden until loaded or when 0.
- Data: `GET /api/trash` (count); What's new store (unseen release).
- Settings that change it: none.
- Feedback: n/a (dialogs belong to other areas).
- Limits: none.
- Related: import/export (capture area), What's new (changelog), feedback, trash (organise area), SHL-22.
- Source: `shell/sidebar/sidebar.component.*`, `shell/sidebar/utils/sidebar-nodes.ts`.

#### SHL-08 Top bar
- What it does: Desktop header over the page, left to right: header search (other area: from 80em an inline field with a results panel, from 64em to 80em a "Search" button that opens the search dialog), the Ask button (AI area, only when Ask is on), a spacer, a keyboard icon button "Keyboard shortcuts" (tooltip with key "?") that opens the shortcuts dialog, a theme toggle icon button (moon in light theme, sun in dark; accessible name "Switch to dark theme" / "Switch to light theme"), the primary "Add link" button (opens the Add link dialog, capture area) and the account avatar button "Account menu" (SHL-09). On settings pages the search and Ask button are absent.
- Entry points: always visible on desktop.
- Screens / routes: SCR-SHL-05.
- Platforms: desktop only (from 64em). No top bar in the mobile shell.
- States: n/a.
- Data: theme toggle writes the account appearance (`PATCH /api/me/settings` theme Light/Dark).
- Settings that change it: theme toggle switches between the fixed Light and Dark themes only (a System or Custom preference is replaced by Light or Dark).
- Feedback: theme applies at once; failure handled by the settings store (settings area).
- Limits: none.
- Related: search (other area), Ask (AI area), Add link (capture area), shortcuts dialog, SHL-19.
- Source: `shell/app-shell.component.html`, `shell/app-shell.component.ts` (`toggleTheme`).

#### SHL-09 Account menu
- What it does: Avatar button (44px) opens a menu aligned to the end. Items in order: a header block (avatar, name, email; not focusable), separator, "Settings" (settings icon → `/settings`), "Send feedback" (message icon → feedback dialog), [admin only] "Feedback inbox" (inbox icon → `/admin/feedback`), [admin only] "Usage stats" (chart icon → `/admin/stats`), separator, "How it works" (play icon → How it works video dialog), "About Shelfmark" (info icon → `/about`, the landing with "Back to my shelf"), separator, "Sign out" (logout icon).
- Entry points: avatar in the top bar.
- Screens / routes: SCR-SHL-06.
- Platforms: desktop only. On a phone the You tab (settings) holds these entries (settings area).
- States: admin items only when the admin check says so (never asked for a demo user).
- Data: user name, email, image from the session; `GET /api/admin/status`.
- Settings that change it: none.
- Feedback: Sign out signs out and leaves (auth area); other tabs get locked (SHL-17).
- Limits: none.
- Related: auth, feedback, admin, how it works (other areas).
- Source: `shell/app-shell.component.html`.

#### SHL-10 Phone tab bar
- What it does: Floating bottom tab bar (`aria-label` "Main") with: "Library" (bookmark icon → `/library`), "Search" (search icon; opens the search overlay, never becomes the current tab), the central "Add link" button (opens Add link), "Tags" (tag icon → `/tags`) or, while Ask is on, "Ask" (spark icon → `/ask`) in that place, "You" (user icon → `/settings`). The current tab follows the URL: `/tags` → Tags, `/ask` → Ask, `/settings…` → You, every other signed-in page (feeds, folders, `/recent`, `/library`, `/reminders`, `/trash`) → Library.
- Entry points: always on the mobile shell.
- Screens / routes: SCR-SHL-07.
- Platforms: below 64em only. Hidden on "pushed" pages that have their own bottom bar: Tidy Unsorted (`/unsorted/tidy`), Ask full screen (`/ask`), and any URL with `?preview=` (pushed link preview).
- States: n/a.
- Data: none.
- Settings that change it: AI › Ask on swaps Tags for Ask (tags then show on the phone Library page).
- Feedback: n/a.
- Limits: none.
- Related: LIB-30, search, Ask, Add link.
- Source: `shell/app-shell.component.{ts,html}`, `shell/phone-tab-for-url.ts`, `shell/pushed-url.ts`, `shell/models/phone-tab.const.ts`.

#### SHL-11 Demo banner
- What it does: A strip above the shell while the user is a demo user: bold "You're in a demo." then "Play with everything — this sandbox resets in {{ hours }} hour." / "…in {{ hours }} hours." (whole hours, rounded up, never below 1; re-read every 60 s), and a primary small button "Sign in with your own account" which signs out (button disabled while leaving) and goes to sign-in. When the time is up it signs out and the sign-in screen shows a "demo ended" notice (auth area).
- Entry points: automatic for demo sessions (`/demo` starts one).
- Screens / routes: SCR-SHL-08.
- Platforms: all.
- States: remaining-time line omitted when no expiry is known.
- Data: session user `isDemo` and expiry.
- Settings that change it: none.
- Feedback: none.
- Limits: sandbox lifetime (24 h per PROJECT.md).
- Related: demo start, auth (other area).
- Source: `shell/demo-banner/*`.

#### SHL-12 Offline banner
- What it does: Warning strip with an offline icon while the browser reports offline: "You're offline. You can browse what's loaded; saving and editing come back when you reconnect." Disappears by itself when back online.
- Entry points: automatic (`online` / `offline` events).
- Screens / routes: SCR-SHL-09.
- Platforms: all.
- States: offline only.
- Data: `navigator.onLine`.
- Settings that change it: none.
- Feedback: none. No control is disabled while offline; requests simply fail with their own error toasts.
- Limits: none.
- Related: SHL-16.
- Source: `shell/offline-banner/*`, `core/network/online.service.ts`.

#### SHL-13 Boot skeleton
- What it does: A static skeleton in `index.html` (sidebar rows, top bar, title, count, card grid, phone tab bar) overlays the page until the first page has rendered, then is removed without layout shift. The same markup exists as a component for the demo start page, including a placeholder for the demo banner and, when the extension banner will show, for that banner too.
- Entry points: every full page load.
- Screens / routes: SCR-SHL-12.
- Platforms: all (layout matches desktop or phone).
- States: n/a. Decorative (`aria-hidden`).
- Data: none.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: SHL-22.
- Source: `shell/boot-skeleton/*`, `core/routing/boot-skeleton.ts`.

#### SHL-14 Toasts (global behaviour)
- What it does: Toasts appear bottom centre (24px up), centred on the current content area (the main column, or a page's own scroll area such as the library feed or both halves in side by side), and lift above floating bars (the bulk bar). Up to three stack, newest in front; hover or focus fans them out and holds the timer. Kinds used: Saved (with thumbnail), Moved (with folder tile), Success, Info, Warn, Danger. Durations: quick 3 s, status 4 s, saved 5 s, Undo 8 s with a countdown line; errors and warnings without explicit duration stay until handled. Keyboard: Ctrl/Cmd+Z undoes a visible Undo toast, Esc dismisses the newest (not in fields or dialogs), Alt+Shift+T (Option+Shift+T on macOS) moves focus to the newest toast's action. Toasts with an action carry the hint "Press {{shortcut}} to reach {{action}}". Each toast has a "Dismiss" control. The toast code loads lazily for guests.
- Entry points: produced by actions; keyboard shortcuts at document level in the shell.
- Screens / routes: all.
- Platforms: all.
- States: n/a.
- Data: none.
- Settings that change it: Animations (motion) affects transitions.
- Feedback: is the feedback channel.
- Limits: 3 visible.
- Related: SHL-15, all toasts in the Toasts table.
- Source: `libs/ui` toast components, `core/toast/*`, `core/layout/toast-area.*`, `core/layout/toast-above.directive.ts`, `shell/app-shell.component.ts` (`onKeydown`).

#### SHL-15 Undo toasts
- What it does: A red (Danger) toast with an "Undo" action and an 8 s countdown, used for deletes: the change is committed only when the toast closes for any reason other than Undo (timeout, dismissed, replaced by a newer toast). Hover/focus extends the window. Pending single-link deletes are also committed on page hide, before sign-out and when Trash opens.
- Entry points: link delete (LNK-07), bulk delete (LIB-20, which deletes at once and restores through Trash on Undo).
- Screens / routes: all.
- Platforms: all.
- States: n/a.
- Data: see LNK-07 / LIB-20.
- Settings that change it: none.
- Feedback: see Toasts table.
- Limits: 8 s.
- Related: LNK-07, LIB-20, SHL-14.
- Source: `core/undo/undo-toast.service.ts`, `core/undo/models/delete-undo.const.ts`, `stores/links.store.ts` (`flushPending`).

#### SHL-16 Global API errors and session expiry
- What it does: For same-origin `/api/**` requests (not `/api/auth/**`, not the monitoring tunnel): a 429 shows the toast "Too many requests" / "Try again in a moment"; a 5xx shows "Something went wrong on our side" / "Try again". The same toast is not repeated within 2 s. Callers can opt out to show their own message. A 401 clears the user and sends them to sign-in with the current page as `returnUrl`.
- Entry points: automatic.
- Screens / routes: all.
- Platforms: all.
- States: error.
- Data: HTTP status.
- Settings that change it: none.
- Feedback: Danger toast.
- Limits: dedupe 2000 ms.
- Related: auth (other area).
- Source: `core/api/error.interceptor.ts`, `core/api/api-error-toast.service.ts`, `core/api/models/error-toast-dedupe.const.ts`.

#### SHL-17 Tab sync and signed-out lock
- What it does: Tabs of one browser stay in step over a BroadcastChannel. After a successful write in one tab, other tabs of the same user apply it silently: a saved link lands in the feed (with its landing motion), an edited link updates, a deleted link disappears; batch creates/updates/deletes, folder, tag, trash, pin and reminder writes reload the sidebar counts, tags, trash, pins and reminders badge and (for library changes) the open feed. Signing out in one tab locks the others with a non-dismissable dialog "You signed out in another tab" / "To keep your links private, this tab is locked too." and a primary button "Sign in again" (goes to sign-in with a safe return URL). Signing in anywhere reloads locked tabs or tabs that show another account. The theme follows other tabs through storage events.
- Entry points: automatic.
- Screens / routes: SCR-SHL-10.
- Platforms: all browsers with BroadcastChannel (none otherwise).
- States: guest posts nothing.
- Data: messages `link-saved`, `link-changed`, `link-removed`, `library-changed`, `signed-out`, `signed-in` with userId.
- Settings that change it: none.
- Feedback: lock dialog (role alertdialog).
- Limits: none.
- Related: SHL-19.
- Source: `core/sync/*`.

#### SHL-18 Update prompt (PWA)
- What it does: When the service worker has downloaded a new version, an Info toast "A new version of Shelfmark is ready" stays until the user picks "Reload" (reloads the page) or "Later" (closes). Once per version per load; never reloads by itself.
- Entry points: automatic.
- Screens / routes: SCR-SHL-11.
- Platforms: where a service worker runs (production builds).
- States: n/a.
- Data: SwUpdate `VERSION_READY`.
- Settings that change it: none.
- Feedback: sticky toast.
- Limits: none.
- Related: SHL-14.
- Source: `core/pwa/update-prompt.service.ts`.

#### SHL-19 Appearance application (theme service)
- What it does: Applies the account's appearance to the whole app through attributes on `<html>`: theme (System, Light, Dark, Custom with base, accent, background, corners; own accent/background colours via tokens), Animations (System / Full / Reduced; Reduced also turns off scripted motion such as the cards/list morph and view transitions), and layout options (text size, font, density, card preview image Large/Small/Off, show site, show notes, show tags). Values are cached in localStorage so the first paint is right, follow the system colour scheme for System, and follow changes made in another tab.
- Entry points: top bar theme toggle (SHL-08); Settings › Appearance (settings area).
- Screens / routes: all.
- Platforms: all.
- States: n/a.
- Data: `/api/me/settings` appearance fields; localStorage keys for theme, custom theme, motion, layout.
- Settings that change it: Settings › Appearance (see Appearance table for options that change the feed).
- Feedback: none here.
- Limits: none.
- Related: settings area.
- Source: `core/theme/theme.service.ts`, `core/theme/whole-layout.ts`.

#### SHL-20 Layout breakpoints
- What it does: Decides what is rendered (not only hidden) per width: below 40em phone details (Options menu instead of toolbar, short labels, bottom sheets, list rows without tags, saved-view chips scroll sideways); below 64em the mobile shell (tab bar, long-press selection, drag and drop of links disabled, stacked bulk bar, Share in the bulk bar, swipe rows in Recently opened, no extension offer); from 64em desktop sidebar; from 80em side by side, the preview beside the list, inline header search. Without `matchMedia` it assumes desktop.
- Entry points: window size.
- Screens / routes: all.
- Platforms: all.
- States: n/a.
- Data: none.
- Settings that change it: Text size changes the effective em breakpoints (rem-based).
- Feedback: n/a.
- Limits: n/a.
- Related: all.
- Source: `core/layout/viewport.service.ts`.

#### SHL-21 Navigation behaviour: scroll restoration, route reuse, transitions, preloading
- What it does: The main column (not the window) keeps a scroll position per navigation: Back/Forward restores it after the page renders and holds it while lists settle; any other navigation to a new URL starts at the top. The library page instance is reused when switching between All links, Unsorted, Favorites and folders (no empty frame, it shows its skeleton or keeps the old list while loading). Page changes cross-fade with view transitions, skipped under reduced motion or in a hidden tab. Lazy routes preload only for signed-in users. Fragment links (`#id`) scroll the target into the scrolling column once.
- Entry points: navigation.
- Screens / routes: all.
- Platforms: all.
- States: n/a.
- Data: none.
- Settings that change it: Animations (Reduced skips transitions).
- Feedback: none.
- Limits: a cap on stored scroll positions.
- Related: LIB-12.
- Source: `core/layout/scroll-restoration.directive.ts`, `core/routing/library-route-reuse.strategy.ts`, `core/routing/only-split-changed.ts`, `core/routing/skip-view-transition-on-reduced-motion.ts`, `core/routing/signed-in-preloading.strategy.ts`, `core/layout/fragment-target.directive.ts`.

#### SHL-22 Browser extension offer
- What it does: On a desktop Chromium browser (Chrome, Edge, Brave, Arc; not Android, mobile, iOS shells, Opera, Samsung Internet, Firefox, Safari) at 64em or wider, and only when the store URL is configured, the library shows a banner (SCR-LIB-24) above the saved view chips: logo mark, heading "Save pages straight from your browser", text "The Shelfmark extension saves the page you are on in one click or Alt+Shift+S, with your folders and tags filled in.", a primary "Install extension" button (opens the Chrome Web Store in a new tab; accessible name "Install extension from the Chrome Web Store (opens in a new tab)"), from 80em a picture of the extension popup, and a close icon "Not now". Closing is remembered on the device (forgotten at session end) and replaces the banner by the "Get the extension" row in the sidebar footer.
- Entry points: library page; sidebar footer row; Settings › Library › Browser extension "Install" (settings area).
- Screens / routes: SCR-LIB-24, SCR-SHL-02.
- Platforms: desktop Chromium only; nothing rendered elsewhere. Not shown while the left feed is narrow (split or preview) or while selecting.
- States: hidden when dismissed.
- Data: localStorage dismissed flag.
- Settings that change it: none.
- Feedback: enter/leave animation.
- Limits: none.
- Related: extension (capture area), SHL-07.
- Source: `features/library/components/extension-banner/*`, `core/browser-extension/*`.

#### SHL-23 Error monitoring
- What it does: Browser errors are reported to Sentry through the API tunnel only when the API reports a DSN; events are scrubbed of personal text; failures are swallowed. No UI.
- Entry points: automatic.
- Screens / routes: none.
- Platforms: all.
- States: off without DSN.
- Data: `/api/monitoring/tunnel`.
- Settings that change it: none.
- Feedback: none.
- Limits: a cap on pending errors before the SDK loads.
- Related: none.
- Source: `core/monitoring/*`.

#### SHL-24 Shell-started dialogs and checks
- What it does: The shell starts other areas' flows once signed in: the welcome dialog on the first sign-in (onboarding), the rating dialog watch (eligible non-demo users after onboarding), the "What's new" dialog once per newer release with highlights (a new account is marked up to date), the one-time AI announcement, the due reminders notice (badge and a note when reminders became due since the last visit), the AI catch-up tick, and the admin status check.
- Entry points: automatic.
- Screens / routes: other areas.
- Platforms: all.
- States: demo users skip rating and admin check.
- Data: various.
- Settings that change it: none here.
- Feedback: other areas.
- Limits: n/a.
- Related: onboarding, rating, changelog/What's new, AI, reminders (other areas).
- Source: `shell/app-shell.component.ts`.

#### SHL-25 Route guards and guest redirects
- What it does: `/` is the landing for a guest and the shell for a signed-in user (no redirect flicker). Every protected path (`/library`, `/tags`, `/ask`, `/links`, `/unsorted`, `/unsorted/tidy`, `/favorites`, `/folders/:id`, `/recent`, `/reminders`, `/trash`, `/settings/**`, `/admin/**`, `/share`) sends a guest to sign-in and back after sign-in (query kept). `/sign-in` for a signed-in user redirects to `/links`. `/ask` needs Ask on; `/unsorted/tidy` needs AI on; `/admin` needs admin.
- Entry points: URL.
- Screens / routes: see Routes.
- Platforms: all.
- States: guest, signed in.
- Data: session.
- Settings that change it: AI settings (Ask, Tidy guards).
- Feedback: none.
- Limits: none.
- Related: auth (other area).
- Source: `app.page-routes.ts`, `core/auth/auth.guards.ts` (other area).

#### SHL-26 Keyboard shortcuts dialog (entry point)
- What it does: "?" (outside fields, when single-key shortcuts are on) or the top bar keyboard button opens the "Keyboard shortcuts" dialog listing groups "Everywhere", "Saving and finding", "In the folder list", "Selecting links", "Link preview". The library-related entries are listed in the Shortcuts table.
- Entry points: "?" key; top bar keyboard button; Settings › Keyboard shortcuts "Open list".
- Screens / routes: dialog (shortcuts feature).
- Platforms: desktop button; key anywhere with a keyboard.
- States: n/a.
- Data: localStorage `singleKeyShortcuts`.
- Settings that change it: "Use single-key shortcuts" (off: "?" does nothing; only the top bar button).
- Feedback: n/a.
- Limits: n/a.
- Related: settings area.
- Source: `features/shortcuts/services/shortcuts-dialog.service.ts`, `stores/ui.store.ts`.

#### LIB-01 Library feed page (All links, Unsorted, Favorites, folder)
- What it does: One page component shows the feed of a scope: All links (`/links`), Unsorted (`/unsorted`, links without a folder), Favorites (`/favorites`), or one folder (`/folders/:folderId`, only links directly in that folder). Top to bottom: a 2px progress bar while refetching, the selection header (when selecting), breadcrumbs (folder pages), the heading block (title, optional description/cover, count line) with the toolbar, the extension banner, saved view chips, the active filter row, then the scroll area with an optional "Couldn't refresh…" notice, subfolder tiles (folder pages), the links in cards or list, infinite paging, and the bulk bar. The browser tab title is "{{page}} · Shelfmark" (page = folder name or scope title) or "Search: {{query}} · Shelfmark" while a search is in the URL; it goes back to the brand when the page closes.
- Entry points: sidebar rows, phone Library tiles, breadcrumbs, subfolder tiles, search, saved views, tag clicks, Recently opened "Show in folder", folder-not-found "Show all links".
- Screens / routes: SCR-LIB-01.
- Platforms: all; differences per breakpoint described in LIB-05/06, LIB-14/15, LIB-22, LIB-24.
- States: see LIB-12, LIB-13. A folder id that is unknown or foreign shows "Folder not found".
- Data: `GET /api/links` with `folderId` | `unsorted=true` | `favorite=true`, plus `tag` (repeated), `q`, `kind`, `sort`, `order`, cursor; folders list.
- Settings that change it: Default view, Sort links by, Show folder counts, Open links in, Clicking a link, card appearance options.
- Feedback: see child features.
- Limits: links per user 10,000.
- Related: LIB-02..LIB-26, LNK-*.
- Source: `features/library/library.page.{ts,html}`, `features/library/services/library-filter.service.ts`, `library-feed.service.ts`, `library-head.service.ts`, `provide-library-page.ts`.

#### LIB-02 Folder page header
- What it does: On a folder page: breadcrumbs "All links" › ancestors › folder (the last item is not a link; long trails collapse with a "Show hidden folders" button; `aria-label` "Breadcrumb"). If the folder is highlighted: a tinted banner (band in the folder colour, or the folder's cover image) holding a large folder tile (icon + colour), the folder name as the page title, its description and the count line, with the toolbar on the band. If not highlighted: the plain title, the cover image beside it if any, the description and the count line. Neither banner nor cover shows while the feed shares width (side by side or preview open).
- Entry points: folder routes.
- Screens / routes: SCR-LIB-01.
- Platforms: tile size Lg on phone, Xl elsewhere.
- States: folder missing → no breadcrumbs, "Folder not found".
- Data: folder name, colour, icon, highlighted, description, coverUrl, path.
- Settings that change it: Folder colours.
- Feedback: none.
- Limits: none.
- Related: folder style (organise area).
- Source: `library.page.html`, `library-head.service.ts`, `components/folder-cover/*`.

#### LIB-03 Count line
- What it does: Under the title: "{{count}} link" / "{{count}} links", or "{{count}}+ links" while more pages exist; on folder pages with subfolders "{{links}}, {{folders}}" (e.g. "12 links, 2 subfolders"). Always present (empty while loading; a line skeleton during first load) so the heading keeps its height. The count is the number of links loaded/shown, not a server total.
- Entry points: n/a.
- Screens / routes: SCR-LIB-01.
- Platforms: all.
- States: loading skeleton.
- Data: shown links, hasMore.
- Settings that change it: none.
- Feedback: none.
- Limits: n/a.
- Related: LIB-12.
- Source: `library.page.html` (`countLine`).

#### LIB-04 Subfolder tiles
- What it does: On a folder page, the direct subfolders appear before the links (in sidebar order) as tiles (cards view) or full-width rows (list view): folder icon in its colour, name, "{{count}} link(s)" and, if it has subfolders, ", {{count}} subfolder(s)", and a chevron. The whole tile is one link (accessible name "Open folder {{name}}, {{links}}" or "…, {{folders}}"). A tile is a drop target for dragged links. Hidden while a search, tag or type filter is on, and for a missing folder; while the next view loads, the previous view's subfolders stay (inert).
- Entry points: folder pages; click opens the subfolder.
- Screens / routes: SCR-LIB-01.
- Platforms: all.
- States: stale (inert) while loading the next view.
- Data: folders store (parentId, linkCount).
- Settings that change it: Folder colours; view (cards/list).
- Feedback: drop highlight.
- Limits: none.
- Related: LNK-09.
- Source: `components/folder-tile/*`, `library-feed.service.ts` (`subfolders`).

#### LIB-05 View: cards or list
- What it does: Switch between Cards (grid of link cards) and List (rows). Desktop/tablet: an icon-only segmented control "View" with "Cards" (cards icon) and "List" (list icon). Phone: inside the "Options" menu as radio items under "View". Switching morphs the links with a view transition (skipped under reduced motion). The choice is remembered per feed on this device (LIB-07). Also stays as chosen when the preview is open.
- Entry points: toolbar segmented control; phone Options menu.
- Screens / routes: SCR-LIB-01, SCR-LIB-02.
- Platforms: phone menu vs desktop control.
- States: controls show with links and during the first load; hidden for empty feeds.
- Data: localStorage feed memory.
- Settings that change it: Settings › Library › "Default view" (Cards or List) for feeds without their own choice. Appearance › Density and card options change the look.
- Feedback: none.
- Limits: none.
- Related: LIB-07.
- Source: `library-feed.service.ts` (`setView`, `viewOptions`), `utils/view-transition.ts`.

#### LIB-06 Sort
- What it does: Sort the feed by "Newest first" (default), "Oldest first" or "Title A–Z". Desktop: a ghost button showing the current sort with a chevron (accessible name "Sort: {{sort}}"; icon-only with a sort icon when the feed is narrow) opening the "Sort links" radio menu. Phone: radio items under "Sort by" in the Options menu. The sort is written to `?sort=` only when it differs from the account default, and remembered per feed. In a folder, links pinned to the top always come first regardless of the sort.
- Entry points: toolbar; phone Options menu; `?sort=newest|oldest|title`.
- Screens / routes: SCR-LIB-01, SCR-LIB-02, SCR-LIB-03.
- Platforms: as above.
- States: as LIB-05.
- Data: `GET /api/links?sort=createdAt|title&order=asc|desc`.
- Settings that change it: Settings › Library › "Sort links by".
- Feedback: none; selection is cleared and the feed scrolls to top.
- Limits: none.
- Related: LIB-07, LNK-10.
- Source: `library-filter.service.ts` (`setSort`, `feedSort`), `models/sort-options.const.ts`, `models/sort-option-keys.const.ts`.

#### LIB-07 Per-feed memory of view and sort
- What it does: Each feed (a folder by id, or All links / Unsorted / Favorites) remembers its own last view and sort on this device. Until a feed has its own choice it opens with the account's Default view and Sort links by. An explicit `?sort=` wins.
- Entry points: automatic on change.
- Screens / routes: SCR-LIB-01.
- Platforms: per device.
- States: blocked storage: session only.
- Data: localStorage feed memory (`sm-feed-memory`).
- Settings that change it: Default view, Sort links by.
- Feedback: none.
- Limits: 300 feeds (least recently changed dropped).
- Related: LIB-05, LIB-06.
- Source: `services/feed-memory.service.ts`, `models/feed-memory-limit.const.ts`.

#### LIB-08 Active filter row
- What it does: When the URL carries a search, a type or tags, a row "Active filters" shows removable chips: "Search: {{query}}" (search icon; remove "Remove search {{query}}"), the type (e.g. "Videos"; remove "Remove filter {{kind}}"), one chip per tag (remove "Remove tag filter {{name}}"), and a ghost button "Clear filter" that clears search, tags and type together. Filters are in the URL: `?q=`, `?tag=a&tag=b`, `?kind=`.
- Entry points: search (other area) navigates with `?q`; tag chips on cards (LNK-12) and the sidebar tags add `?tag`; saved views add any of them.
- Screens / routes: SCR-LIB-01.
- Platforms: all.
- States: hidden when nothing is filtered.
- Data: `GET /api/links?q=&tag=&kind=`.
- Settings that change it: none.
- Feedback: none.
- Limits: at most 5 tags in the filter; search up to 200 characters and 5 words (every word must match title, note or URL).
- Related: LIB-09, LNK-12, search (other area).
- Source: `library.page.html` (`library__filter`), `library-filter.service.ts`.

#### LIB-09 Saved views chips
- What it does: A toolbar of chips above the feed (`aria-label` "Saved views"): "All" with the count of the feed, then the user's saved views with their counts, then a dashed "+ Save this view" button. The pressed chip is the view whose filter equals the current one, "All" when nothing narrows the feed (no search, no type), else none. Chips appear on every feed (folder, Unsorted, Favorites, tag filter), not only All links: a view without a place (type, search, tags) applies inside the current feed and counts that feed's links; a view tied to a place (Unsorted, Favorites, a folder) is offered on All links and on that place. A plain type view (all links, no tags, no search, type not "other") has a hint tooltip like "Links detected as videos". Each view chip has a trailing "…" button ("Actions for {{name}}"; hidden until hover/focus on pointer devices, always on touch) and a right-click menu (SCR-LIB-10). Arrow keys, Home, End move between chips (one tab stop). Chips keep their old numbers while another feed's counts load. New accounts start with two views, Videos and Articles.
- Entry points: library page.
- Screens / routes: SCR-LIB-01, SCR-LIB-10.
- Platforms: chips wrap on desktop; on phone they scroll sideways in one row.
- States: hidden for a library with no links at all (empty All links, no filter); counts null while not loaded; a view whose folder is in Trash is not available: choosing it shows Info toast "This view is waiting for its folder" / "The folder of {{name}} is in Trash. Restore it to use the view."
- Data: `GET /api/views?scope=&folderId=&tag=` (counts for the feed), SavedViewResponse {id, name, query{scope, folderId, tags, kind, sort, order, q}, position, count, available}.
- Settings that change it: none.
- Feedback: see LIB-10, LIB-11.
- Limits: 20 views per user; name 40 characters; 5 tags per view.
- Related: LIB-10, LIB-11, LIB-08.
- Source: `features/views/components/saved-view-chips/*`, `features/views/services/saved-view-actions.service.ts`, `features/views/utils/*`, `stores/saved-views.store.ts`, `apps/api/src/views/*`.

#### LIB-10 Save this view (new view dialog)
- What it does: "+ Save this view" opens the "New view" dialog prefilled with the feed's current filter. With AI on it first shows a phrase step: field "Describe what to show" (placeholder "videos about Angular I haven’t watched yet", hint with examples), up to three idea chips ("Use the idea: {{name}}", phrase "Links about {{name}}"), a status line (limit or "Couldn’t compose a view right now. This didn’t count toward your limit; you can set the filter yourself."), "or save the current filter" link-button, and the footer AI button "Compose" / "Composing…". After composing, the phrase shows on one line with a spark and "Change", plus notes ("The filter was filled in from your description.", an AI note, "Left out: {{names}}"), and fields filled by AI carry a spark. The rows step (also the only step with AI off, with the lead "Start from the filter of the feed you are on, or change it here."): "Where" (searchable select: All links, Unsorted, Favorites, folders; search "Search folders", "No folders found"), "Type" ("All types" or a type), "Tags" (tag input, "Add a tag", max 5, error "“{{name}}” is not one of your tags. Pick one from the list."), "Search words" (placeholder "Words in the title, note or address"; max length error "Use at most {{max}} characters"), "Sort" (Newest first, Oldest first, Title A–Z), a live preview "Found {{count}} link(s)" / "Found {{count}}+ links" with the first 3 links (favicon, title, "{{host}} · {{folder}}") and "and {{count}} more", then "Name" (placeholder "To read"; "Enter a name", "Use at most {{max}} characters") and an error notice. Footer: "Cancel" and primary "Save view" / "Saving…".
- Entry points: "+ Save this view" chip.
- Screens / routes: SCR-LIB-11.
- Platforms: dialog (Md) on desktop; sheet on phone (Cancel left out, its × does the same).
- States: at the limit the dialog does not open; warning toast "Saved views are full" / "You can save up to 20 views. Delete one first." (6 s). AI off: no phrase step. Save errors in the dialog: "You already have the most views you can save. Delete one first.", "The folder of this view is gone. Open another folder and try again.", "Couldn't save the view. Try again."
- Data: `POST /api/views`; preview uses `GET /api/links` (one page of up to 100, 250 ms debounce); compose `POST /api/ai/view-draft` (counts one Ask question).
- Settings that change it: AI on/off.
- Feedback: success toast "View saved" (detail: name); focus moves to the new chip.
- Limits: 20 views; name 40; tags 5; phrase 3–200 characters; ideas max 3.
- Related: AI (other area), LIB-09.
- Source: `features/views/components/new-view-dialog/*`, `features/views/services/new-view-*.service.ts`, `libs/shared/contracts/src/views/*`.

#### LIB-11 Saved view menu: rename, move, delete
- What it does: The menu of a view chip: "Rename" (opens "Rename view" dialog with "Name"; "Rename" / "Renaming…"), "Move left" (disabled for the first view), "Move right" (disabled for the last), separator, "Delete view" (danger; confirmation "Delete view {{name}}?" / "Only the view goes. The links stay where they are." / "Delete view" / "Cancel"). Rename, move and delete are optimistic.
- Entry points: "…" on a chip; right click on a chip.
- Screens / routes: SCR-LIB-10, SCR-LIB-12, SCR-LIB-13.
- Platforms: all.
- States: n/a.
- Data: `PATCH /api/views/:id` {name}, `PUT /api/views/order`, `DELETE /api/views/:id`.
- Settings that change it: none.
- Feedback: delete success toast "View deleted" (detail: name). Failures: "Couldn't rename the view", "Couldn't delete the view", "Couldn't move the view" (detail: name). Rename has no success toast. No Undo.
- Limits: name 40.
- Related: LIB-09.
- Source: `saved-view-chips.component.*`, `saved-view-actions.service.ts`, `view-name-dialog/*`.

#### LIB-12 Loading, refetch and paging
- What it does: First load: nothing for 300 ms, then 8 skeleton cards or rows (shape follows the view), shown at least 400 ms. Switching to another view/filter keeps the previous list on screen, inert, under the 2px progress bar until the first page arrives (no skeleton, no dimming); the new list then replaces it (fade-in only after a skeleton). Paging: the API returns pages (50 by default) with a cursor; a sentinel below the list loads the next page automatically when it scrolls into view; a "Load more" button is also there (disabled while loading) and "Loading more links" shows during loading; a failure shows "Couldn't load more links." above the button. A refetch error while links are shown displays a danger notice "Couldn't refresh your links. You are seeing the last loaded list." with "Try again". The scroll area returns to the top on every new filter/sort/view. Newly saved links land at the top with a landing motion (staggered for a batch) when the feed is newest-first and in scope.
- Entry points: automatic; "Load more"; "Try again".
- Screens / routes: SCR-LIB-01.
- Platforms: all.
- States: loading, stale, refetching, error, load-more error.
- Data: `GET /api/links` cursor paging.
- Settings that change it: none.
- Feedback: progress bar, notices.
- Limits: page 50 (max 100).
- Related: LIB-13, LNK-18.
- Source: `library-feed.service.ts`, `library.page.html`, `stores/links.store.ts`, `features/links/directives/in-view.directive.ts`.

#### LIB-13 Empty and error states of the feed
- What it does: Page-sized empty states with an illustration per scope: All links "Your links will live here" / "Paste a link to a video, an article or something to buy — the title and preview fill in by themselves." with primary "Add link" and ghost "Watch how it works"; Unsorted "Unsorted is empty" / "Links you save without a folder wait here until you file them." + "Add link"; Favorites "Your favorites will live here" / "Tap the star on a link to keep it here." + "Show all links"; folder "This folder is empty" / "Add a link here, or move links from Unsorted." + "Open Unsorted" and primary "Add link" (folder preselected). Filtered: search "Nothing found for “{{query}}”" / "Try another word, or search in all folders." + "Clear search" and (not on All links) "Search all folders"; tags only "No links with these tags" / "Nothing you saved has all of the selected tags." + "Clear filter"; a saved view "Nothing in “{{name}}” yet" / "Links that match this view show up here as you save them." + "Show all links"; other filters "Nothing matches these filters" / "No saved link matches all of the selected filters." + "Clear filters". Errors: folder missing "Folder not found" / "This folder doesn't exist, or it was deleted." + "Show all links"; load failed "Couldn't load your links" / "Check your connection and try again." + "Try again".
- Entry points: n/a.
- Screens / routes: SCR-LIB-01.
- Platforms: all.
- States: as listed.
- Data: n/a.
- Settings that change it: none.
- Feedback: n/a.
- Limits: n/a.
- Related: Add link (capture), How it works.
- Source: `library.page.html`, `library-filter.service.ts` (`emptyKey`, `filteredEmptyKey`), `models/empty-*.const.ts`, `models/filtered-empty-key.const.ts`.

#### LIB-14 Selection of links
- What it does: Pick several links for bulk actions. Desktop: a checkbox on each card/row ("Select {{title}}") appears on hover and focus (always on touch devices); clicking the checkbox toggles; Shift+click selects the range from the last picked link; Space on a focused link toggles (Shift+Space range) when the preview is not offered for it, otherwise Space previews and Shift+Space selects; Cmd/Ctrl+A (focus not in a field, dialog or menu) selects every loaded link; Esc or "Done" clears. While a selection exists, clicking a card toggles it instead of opening. Phone/compact: long press on a card or row selects it and enters selection mode; taps then toggle. A selection header appears over the feed: desktop: a "Select all {{count}} link(s)" checkbox (indeterminate when partial), "{{count}} selected", "Select all {{count}}" (hidden when all are selected), hints "Shift + click selects a range" and "Esc clears", and "Done". Compact: an × "Cancel selection", the count and "Select all" (short label below 40em). Entering/leaving selection mode is announced ("Selection mode on. Activating a link now selects it." / "Selection mode off."). The selection clears when the filter, sort, view or route changes, after Move and Delete, and drops links that left the view. Leaving selection returns focus to the feed (focused card, last picked link, or first link).
- Entry points: checkbox, long press, keyboard.
- Screens / routes: SCR-LIB-05.
- Platforms: as above. Links in the right half of side by side are never part of the selection.
- States: n/a.
- Data: link ids (in memory).
- Settings that change it: none.
- Feedback: live announcements.
- Limits: only loaded links.
- Related: LIB-15.
- Source: `services/library-selection.service.ts`, `stores/link-selection.store.ts`, `directives/library-hotkeys.directive.ts`, `features/links/utils/select-range.ts`, `link-card.component.ts`, `link-row.component.ts`.

#### LIB-15 Bulk action bar
- What it does: A glass bar at the bottom while links are selected (`aria-label` "Actions for {{count}} selected link(s)"), toasts sit above it. Buttons in order: [side by side with a right folder] "Move to {{folder}}" (secondary, with the folder tile) first; "Move" (folder-move); "Tags" (tag); "Favorite" (star; filled and pressed when every selected link is a favorite); "Remind" (bell); desktop: "Open all" (external) and "Copy links" (copy); compact: "Share" (when the browser can share) else "Copy links"; "Delete" (trash, danger). The bar is inline on wide screens and stacks when it does not fit or on compact screens (above the tab bar). In side by side it is centred under both halves.
- Entry points: selection.
- Screens / routes: SCR-LIB-06.
- Platforms: as above.
- States: n/a.
- Data: see LIB-16..LIB-21.
- Settings that change it: none.
- Feedback: see children.
- Limits: requests in batches of 100.
- Related: LIB-14, LIB-16..LIB-21, LIB-22.
- Source: `services/library-bulk.service.ts`, `directives/bulk-bar-fit.directive.ts`, `features/links/services/bulk-link-actions.service.ts`, `features/links/models/bulk-action.const.ts`.

#### LIB-16 Bulk move
- What it does: "Move" opens the folder picker titled "Move {{count}} link(s)" (the shared folder is marked current when all selected links are in one folder); choosing a folder or Unsorted moves all at once (optimistic; pinned-to-top flags are cleared). "Move to {{folder}}" in side by side moves straight to the right half's folder. Undo puts every link back in its own original folder.
- Entry points: bulk bar; dragging a selected link (LNK-09).
- Screens / routes: SCR-LNK-06.
- Platforms: all.
- States: links already in the target are skipped.
- Data: `POST /api/links/batch/update` {ids, folderId}.
- Settings that change it: Folder colours (toast tile).
- Feedback: Moved toast "{{count}} link(s) moved to {{folder}}" (detail: titles; folder tile) with "Undo" (8 s). Failure: "Couldn't move the links" / "They are back where they were" with "Retry". Undo failure: "Couldn't move the links back". With AI on, a rule may be offered after filing (AI area). Selection cleared on success.
- Limits: 100 per request.
- Related: LNK-08, LNK-09, rules offer (AI area).
- Source: `bulk-link-actions.service.ts` (`move`, `moveTo`, `moveBack`).

#### LIB-17 Bulk tags
- What it does: "Tags" opens a small dialog "Tags for {{count}} link(s)" with two tag inputs: "Add to all" (hint "Added to every selected link"; suggestions from all tags with "{{count}} links" counts; can create new tags) and "Remove from all" (hint "Taken off every selected link; the tags themselves stay"; placeholder "Pick a tag"; suggestions are the tags present on the selection with "on {{count}} of {{total}}"). Footer "Cancel" and primary "Apply" (disabled while both are empty).
- Entry points: bulk bar.
- Screens / routes: SCR-LIB-07.
- Platforms: dialog Sm; sheet on phone.
- States: n/a.
- Data: `POST /api/links/batch/update` {ids, addTags, removeTags}.
- Settings that change it: none.
- Feedback: success "Tags updated on {{count}} link(s)". Failure "Couldn't change the tags" / "Nothing was changed", or on 409 "A link can have at most 20 tags. Nothing was changed." Optimistic with rollback. Selection is kept.
- Limits: 20 tags per link.
- Related: tags (other area).
- Source: `components/bulk-tags-dialog/*`, `bulk-link-actions.service.ts` (`editTags`, `applyTags`).

#### LIB-18 Bulk favorite
- What it does: "Favorite" sets favorite on all selected links when any is off, else removes favorite from all.
- Entry points: bulk bar.
- Screens / routes: SCR-LIB-06.
- Platforms: all.
- States: n/a.
- Data: `POST /api/links/batch/update` {ids, isFavorite}.
- Settings that change it: none.
- Feedback: "{{count}} link(s) added to favorites" / "{{count}} link(s) removed from favorites"; failure "Couldn't change favorites" / "Nothing was changed" with "Retry". Selection kept.
- Limits: 100 per request.
- Related: LNK-05.
- Source: `bulk-link-actions.service.ts` (`toggleFavorite`).

#### LIB-19 Bulk open all, copy, share
- What it does: "Open all" (desktop) opens one new tab per http(s) link; above 10 links it asks first ("Open {{count}} links?" / "Each link opens in a new tab." / "Open all" / "Cancel"). "Copy links" copies the URLs one per line. "Share" (compact, when available) opens the system share sheet with the URLs as text.
- Entry points: bulk bar.
- Screens / routes: SCR-LIB-06, SCR-LIB-08.
- Platforms: Open all desktop only; Share compact only.
- States: n/a.
- Data: none (Open all does not record opens).
- Settings that change it: none.
- Feedback: blocked pop-ups: warning "The browser blocked {{blocked}} of {{count}} tabs" / "Allow pop-ups for this site to open them all". Copy: "{{count}} link(s) copied" or "Couldn't copy the links". Share failure (not cancel): "Couldn't share the links". Selection kept.
- Limits: confirm above 10.
- Related: LIB-15.
- Source: `bulk-link-actions.service.ts`, `features/links/models/bulk-open-confirm-above.const.ts`.

#### LIB-20 Bulk delete
- What it does: "Delete" asks "Move {{count}} link(s) to Trash?" / "They stay in Trash for {{days}} days, then they are deleted for good." / "Move to Trash" / "Cancel"; the links leave the feed and are moved to Trash at once (not deferred), their sidebar pins drop. An Undo toast restores them through Trash.
- Entry points: bulk bar.
- Screens / routes: SCR-LIB-09.
- Platforms: all.
- States: n/a.
- Data: `POST /api/links/batch/delete` {ids} (chunks of 100); Undo `POST /api/trash/restore`.
- Settings that change it: Settings › Library › Trash "Keep deleted items for" (days in the message).
- Feedback: Undo toast (red) "{{count}} link(s) moved to Trash" (detail: titles) with "Undo"; failure "Couldn't delete the links" / "They are back in the list"; Undo failure "Couldn't restore the links". Selection cleared.
- Limits: 100 per request.
- Related: LNK-07, trash (organise area).
- Source: `bulk-link-actions.service.ts` (`delete`, `restore`).

#### LIB-21 Bulk remind (entry point)
- What it does: "Remind" opens the reminder dialog for all selected links (reminders area); the selection clears when the dialog reports it should.
- Entry points: bulk bar.
- Screens / routes: reminders area.
- Platforms: all.
- States: n/a.
- Data: reminders API (other area).
- Settings that change it: n/a.
- Feedback: other area.
- Limits: other area.
- Related: reminders (other area).
- Source: `library-bulk.service.ts`.

#### LIB-22 Side by side (split view)
- What it does: From 80em, a "Side by side" icon button (columns icon, pressed state) on the toolbar opens a right half next to the feed (`?split=`). The right half first shows a picker panel: head "Choose a folder" with a close ×, heading "Choose a folder to move links into", text "Then drag links here from the left, or select them and use the bar below.", a searchable folder list ("Find a folder", "Folders", "No folder found"; Unsorted row; the left folder marked "On the left"; a "Recent" group of recent move targets, or "Related folders" after Show related). Once chosen (`?split=<folderId>` or `unsorted`): a head with a picker menu trigger ("Right folder: {{name}}. Change") with the same list ("Show on the right"), the count, and close ("Close side by side"); below, the right folder's links as read-only cards (no menu, no favorite, opening records the open), with infinite paging, its own skeleton/error ("Check your connection and try again." + "Try again") and empty text "Drag links here from the left.". The left half's title is replaced by a picker ("Left feed: {{name}}. Change"; "Show on the left", "Find a folder or tag", "Nothing found"; options All links, Unsorted, Favorites, folders, tags; the right folder marked "On the right"). Choosing a left option navigates there keeping the right half. Each half is a drop region ("Left: {{name}}", "Right: {{name}}" / "Right: choose a folder") with a ring and "Move here" when a dragged link is over it. Each right card has a move button "Move “{{title}}” to {{folder}}" when the left side is a folder or Unsorted (moves it left). A swap button "Swap sides" in the divider trades the halves when possible. The bulk bar adds "Move to {{folder}}". Toolbar is compact (icon-only sort, export), and the folder banner, extension banner and Tidy entry are hidden. Closing returns focus to the toggle. Back after the first choice closes the split.
- Entry points: "Side by side" toolbar button; "Show related" in a link menu (LIB-23); `?split=`.
- Screens / routes: SCR-LIB-14, SCR-LIB-15.
- Platforms: from 80em only; below that `?split` is ignored. Never together with the link preview (opening the preview drops `split` and `related`).
- States: resolving skeleton while folders load; picker when the target is unknown, foreign or the same as the left.
- Data: right feed `GET /api/links?folderId=` / `unsorted=true`; moves via `PATCH /api/links/:id` or batch update.
- Settings that change it: none.
- Feedback: moves show the Moved toast with Undo (LNK-08); toasts centred over both halves.
- Limits: none.
- Related: LNK-09, LIB-16, LIB-23.
- Source: `services/split-view.service.ts`, `services/split-feed.store.ts`, `components/split-right-half/*`, `utils/left-feed-options.ts`, `utils/split-param.ts`.

#### LIB-23 Show related (AI entry point)
- What it does: "Show related" (columns icon) in the card/row menu opens side by side with the picker offering the folders of links related by meaning first under "Related folders" (`?related=<linkId>`).
- Entry points: link menu, only when search by meaning is ready and side by side can open (80em+).
- Screens / routes: SCR-LIB-14.
- Platforms: 80em+.
- States: AI off or not ready: item absent.
- Data: AI related links (other area).
- Settings that change it: AI › search by meaning.
- Feedback: none.
- Limits: AI area.
- Related: AI (other area), LIB-22.
- Source: `services/split-related.service.ts`.

#### LIB-24 Link preview, split beside the list
- What it does: Shows a link's page inside the app beside a compact list (`?preview=<linkId>`, so reload and Back keep it). From 80em: the feed becomes a narrower list (current link highlighted, `aria-current`), a resize handle ("Resize the list", hint "Drag, or use ← and →. Double-click resets."; default 400px, min 300px, the panel keeps at least 480px; width remembered on the device), and the preview panel: a toolbar ("Preview actions") with "Previous link" (↑) and "Next link" (↓) (disabled at the ends), the title and favicon + address, a "Related · N" button (AI area), favorite star ("Favorite"; tooltip "Add to favorites"/"Remove from favorites"), "Edit" (opens Edit link), "Copy link" (icon swaps to a check for 1.6 s), "Wider preview" / "Show the list" (hides the list for the session), "Open" (secondary, tooltip "Open in new tab", key ↵; always a new tab), and "Close preview" (Esc). Body: a video player (YouTube etc. via nocookie embed), the site in a frame, or the blocked state (LIB-26). A hint line under the list: "↑ ↓ Next link · ↵ New tab · Esc Close". Opening a link in the preview records an open once per link. Switching links replaces the history entry; closing goes Back when the app opened it (keeps the feed scroll).
- Entry points: eye button on a card/row ("Preview {{title}}", tooltip "Preview here", key Space); "Preview here" first in the link menu; Space on a focused link; a plain click on a card/row when "Clicking a link" is "Opens the preview" (default) or while a preview is open; ⌘/Ctrl+click does the opposite of the setting. Without an open preview, a click on a site listed in "Sites that open in a new tab" or a non-https address opens the link instead (a video always previews).
- Screens / routes: SCR-LIB-16. Only on library feeds (`/links`, `/unsorted`, `/favorites`, `/folders/:id`).
- Platforms: 80em+ as split; below as pushed page (LIB-25).
- States: loading (progress bar "Loading the preview"); a link not in the feed is fetched; if gone/foreign/offline the preview closes.
- Data: `GET /api/links/:id` (if not loaded), `POST /api/links/:id/frame-check` (https, non-video; cached per host server-side), `POST /api/links/:id/open`.
- Settings that change it: Settings › Library › "Clicking a link" (Opens it in a new tab / Opens the preview), "Sites that open in a new tab".
- Feedback: copy "Link copied" / "Couldn't copy the link".
- Limits: frame load timeout 10 s; frame-check rate 60/min.
- Related: LIB-25, LIB-26, LNK-06, related links (AI area).
- Source: `features/link-preview/*`, `library.page.html`, `directives/library-hotkeys.directive.ts`.

#### LIB-25 Link preview, pushed page
- What it does: Below 80em the preview is a full-screen pushed page (dialog role, tab bar hidden): header with Back ("Back to the links"), title and domain with favicon, "Open in browser" (external; new tab), and "More actions" menu ("Edit", "Copy link"); the body as LIB-24; a floating bottom toolbar with favorite ("Favorite"), "Share" (system share sheet with title and URL, else copies the link) and the related links button (AI).
- Entry points: same as LIB-24.
- Screens / routes: SCR-LIB-17.
- Platforms: phones and tablets.
- States: as LIB-24.
- Data: as LIB-24.
- Settings that change it: as LIB-24.
- Feedback: as LIB-24.
- Limits: as LIB-24.
- Related: LIB-24.
- Source: `features/link-preview/components/preview-page/*`.

#### LIB-26 Preview blocked state and "Always open in a new tab"
- What it does: When the site refuses framing (frame-check says blocked, the address is not https, or the frame sends no load within 10 s): an empty state with a frame-off icon "{{domain}} doesn't open inside other apps" / "The site blocks it, not Shelfmark. Open it in a new tab." and primary "Open in new tab", plus a checkbox "Always open {{domain}} in a new tab" that adds/removes the host to the account's "Sites that open in a new tab".
- Entry points: preview body.
- Screens / routes: SCR-LIB-16, SCR-LIB-17.
- Platforms: all.
- States: blocked.
- Data: `PATCH /api/me/settings` library.previewNewTabHosts.
- Settings that change it: same list editable in Settings › Library (remove chips "Remove {{domain}}"; empty "None yet.").
- Feedback: failure toast "Couldn't save the change. Try again."
- Limits: none stated.
- Related: settings area.
- Source: `preview-body.component.html`, `link-preview.service.ts` (`setAlwaysNewTab`), `preview-settings.component.html`.

#### LIB-27 Recently opened page
- What it does: `/recent` lists links opened in the last 30 days, grouped by local day: "Today", "Yesterday", "Earlier this week", then by date; each row shows the title, a folder chip (folder name or "Unsorted") and the time of the open (weekday for earlier-this-week). Header: title "Recently opened", count "{{count}} link(s) in the last {{days}} days" or "Nothing yet", the "Opened · Forgotten" switch ("Show"; "Forgotten {{count}}" when some wait), "Pause history" / "Resume history" (ghost), and "Clear history" (secondary, when there is history). Tools: type chips "Filter by type" ("All", "Videos", "Articles", "Shopping" with counts; client-side) and a search field "Search history" (clearable "Clear search"; matches title and domain; 200 ms debounce). Clicking a row opens the link and records the open. Each row has "More for {{title}}" menu (SCR-LIB-19). Footer note "Kept for 30 days, only on your account. Removing from history doesn't delete the link." (on compact screens preceded by "Swipe a row left to remove it from history."). On compact screens a row swipes left to reveal a danger "Remove" button ("Remove {{title}} from history"); focusing the button slides the row open, so it works without swiping. The view is in the URL (`?show=forgotten`).
- Entry points: sidebar "Recently opened"; phone Library tile opens the sheet instead (LIB-28); URL.
- Screens / routes: SCR-LIB-18, SCR-LIB-19, SCR-LIB-20.
- Platforms: all (page); swipe on compact.
- States: loading (5 skeleton rows); empty "Nothing opened yet" / "Links you open appear here for {{days}} days."; type empty "Nothing of this type" / "No link of this type was opened in the last {{days}} days." + "Show all"; search empty "Nothing matches" / "No link in your history matches “{{query}}”." + "Clear search"; paused notice "History is paused. Links you open now aren't added." + "Resume".
- Data: `GET /api/links/recent?limit=100`, `DELETE /api/links/recent/:id`, `DELETE /api/links/recent`, `PATCH /api/me/settings` pauseHistory; opens via `POST /api/links/:id/open` (answer `recorded:false` while paused).
- Settings that change it: pause history (also Settings › Privacy and data "Remember recently opened", settings area); Open links in.
- Feedback: remove: "Removed from history" (detail: title) / "Couldn't remove it from history"; clear: confirm then "History cleared" / "Couldn't clear the history"; copy: "Link copied" / "Couldn't copy the link"; pause failure "Couldn't pause history" / "Couldn't resume history". Remove is optimistic; no Undo.
- Limits: 30-day window; up to 100 entries loaded.
- Related: LIB-28, LIB-29, LIB-34.
- Source: `features/links/pages/recent/*`, `components/recent-history/*`, `components/link-history-row/*`, `components/recent-view-switch/*`, `core/layout/swipe-reveal.ts`.

#### LIB-28 Recently opened sheet (phone)
- What it does: On the phone Library page, the "Recently opened" tile opens a tall bottom sheet "Recently opened" with a close button, a small "Clear" action (accessible name "Clear history", only with history and on Opened), the Opened · Forgotten switch, and the same history list without type chips and search (day headings level 3), or the Forgotten list.
- Entry points: phone Library tile.
- Screens / routes: SCR-LIB-21.
- Platforms: phone Library page (below 64em).
- States: as LIB-27 (inline empty states).
- Data: as LIB-27.
- Settings that change it: as LIB-27.
- Feedback: as LIB-27.
- Limits: as LIB-27.
- Related: LIB-27, LIB-30.
- Source: `components/recent-sheet/*`.

#### LIB-29 Forgotten (Rediscover)
- What it does: The Forgotten view of Recently opened shows this week's block of 3 to 5 older links not opened for a long time. Lead text: in theme mode (AI) with a spark "You’ve been saving a lot about {{theme}}. These are older ones you haven’t opened."; otherwise "A few links you saved and never came back to. Open one, set a reminder, or let it go." A close × "Hide until next week" dismisses the block. Each row: favicon + host, the title as a link (opens per "Open links in", records the open), "Saved in {{month}}, not opened lately", and buttons "Remind me" (reminder dialog), "Not interested" (the link never shows in the block again). The block is loaded once per session; the sidebar row and the phone tile show "{{count}} forgotten".
- Entry points: "Forgotten" segment on `/recent` and in the sheet.
- Screens / routes: SCR-LIB-22.
- Platforms: all.
- States: empty "Nothing forgotten" / "Links you save and never open will wait here."; a load failure shows no block.
- Data: `GET /api/rediscover` {week, mode theme|forgotten, theme, items}, `POST /api/rediscover/dismiss`, `POST /api/rediscover/links/:id/hide`.
- Settings that change it: AI on with AI pack and vectors ready → theme mode.
- Feedback: optimistic, failures put back silently (no toast copy).
- Limits: items 3–5; candidate saved ≥30 days ago, never opened or last opened ≥90 days ago; theme looks at the last 14 days and needs ≥3 links.
- Related: LIB-27, reminders.
- Source: `features/rediscover/*`, `apps/api/src/rediscover/*`, `libs/shared/contracts/src/rediscover/*`.

#### LIB-30 Phone Library tab
- What it does: `/library` on compact screens: title "Library", then the Pinned card (SHL-03), the Folders section with the folder tree and its menus (SHL-04), then tiles: "All links" (link icon, count), "Unsorted" (inbox, count), "Favorites" (star accent, count), "Recently opened" (clock; meta "{{count}} forgotten" in attention style, else "{{count}} today" once history has loaded; opens the sheet LIB-28), "Reminders" (bell; "{{count}} due"), "Trash" (trash; "{{count}} item(s)" when not empty). While Ask is on, the tags section follows the tiles.
- Entry points: Library tab.
- Screens / routes: SCR-LIB-23.
- Platforms: below 64em; at 64em or wider the page redirects to `/links` (replace).
- States: counts blank until loaded.
- Data: folders counts, recent list, rediscover, trash, reminders.
- Settings that change it: Show folder counts (folder tree only); Ask on (tags section).
- Feedback: none.
- Limits: none.
- Related: SHL-03, SHL-04, SHL-10, LIB-28.
- Source: `features/library/pages/phone-library/*`.

#### LIB-31 Library export menu (entry point)
- What it does: Desktop toolbar "Export" button (download icon; icon-only when narrow) opens a menu: when the current feed has an export equivalent, "This view as JSON", "This view as Bookmarks HTML", "This view as CSV", separator; then always "Everything as JSON", "Everything as Bookmarks HTML", "Everything as CSV". On a phone the same items sit under "Export" in the Options menu. Exporting an empty view: "Nothing to export in this view" / "This view has no links. Export everything, or open another view" (export area).
- Entry points: toolbar; phone Options menu.
- Screens / routes: SCR-LIB-04, SCR-LIB-02.
- Platforms: as above.
- States: n/a.
- Data: export API (capture area).
- Settings that change it: none.
- Feedback: export area.
- Limits: export area.
- Related: export (capture area).
- Source: `library.page.html`, `features/export/models/export-format-options.const.ts`.

#### LIB-32 Paste links into the library (entry point)
- What it does: ⌘V / Ctrl+V on the library page outside any field and with no dialog open: text containing links opens Add link with it (one link fills the address, several open the paste-many list), with the folder of the page preselected. Text without a link is ignored.
- Entry points: paste.
- Screens / routes: SCR-LIB-01 → Add link (capture area).
- Platforms: devices with a keyboard paste.
- States: n/a.
- Data: n/a.
- Settings that change it: none.
- Feedback: capture area.
- Limits: capture area.
- Related: Add link / paste many (capture area).
- Source: `directives/library-hotkeys.directive.ts` (`onPaste`).

#### LIB-33 Library keyboard navigation
- What it does: Page-level keys on the feed: Esc ends selection; Cmd/Ctrl+A selects all loaded links; with nothing focused, Space/Page Down, Shift+Space/Page Up, Home, End and arrows scroll the feed area; while the desktop preview is open: ↑/↓ previous/next link (focus follows if it was on a feed link), ↵ open in new tab, Esc close. On a focused link: Space preview or select, Shift+Space range select, M "Move to folder…".
- Entry points: keyboard.
- Screens / routes: SCR-LIB-01.
- Platforms: keyboard devices.
- States: n/a.
- Data: n/a.
- Settings that change it: none.
- Feedback: n/a.
- Limits: n/a.
- Related: LIB-14, LIB-24, LNK-08.
- Source: `directives/library-hotkeys.directive.ts`, `utils/feed-keyboard-scroll.ts`, `features/links/utils/link-select-keys.ts`, `features/link-preview/utils/preview-key.ts`.

#### LIB-34 Pause history
- What it does: "Pause history" / "Resume history" on `/recent` (Opened view) toggles the account's pauseHistory; while paused the server does not record opens and the page shows the paused notice with "Resume". Optimistic; failure reverts.
- Entry points: `/recent` header; the notice's "Resume".
- Screens / routes: SCR-LIB-18.
- Platforms: all (button not in the phone sheet).
- States: button hidden until the setting is known.
- Data: `PATCH /api/me/settings` pauseHistory.
- Settings that change it: also Settings › Privacy and data (settings area).
- Feedback: "Couldn't pause history" / "Couldn't resume history".
- Limits: none.
- Related: LIB-27.
- Source: `pages/recent/recent.page.ts`.

#### LIB-35 Tidy Unsorted entry (AI entry point)
- What it does: On Unsorted (not when the feed is narrow) the toolbar shows the Tidy entry, which hides itself while AI is off and leads to `/unsorted/tidy` (AI area).
- Entry points: Unsorted toolbar (desktop and phone).
- Screens / routes: SCR-LIB-01.
- Platforms: all.
- States: AI off: hidden.
- Data: AI area.
- Settings that change it: AI.
- Feedback: AI area.
- Limits: AI area.
- Related: AI (other area).
- Source: `library.page.html`, `features/ai/components/tidy-entry/*`.

#### LNK-01 Link card
- What it does: One link in the cards view, all of it is a real link to the URL (http/https only; opens in a new tab or the same tab per setting; description "Opens in a new tab"). Elements: preview image (captured copy, or a placeholder tone; size per Appearance), on hover/focus an overlay bar with the address and "Open ↗" (not while selecting), the title, a meta line with favicon (or site letter) and host (tooltip "{{host}} · {{saved}}"), the date slot ("2 days ago", "Last week", "Oct 28" style relative date) or instead a reminder chip (bell; its time, or due state in warning tone), action buttons revealed on hover/focus: eye "Preview {{title}}" (tooltip "Preview here", Space) and "…" "Actions for {{title}}" (tooltip "More actions"); a "Pinned" badge when pinned to the top of the open folder; a note slot (the user's note, else the AI summary or its skeleton while AI is pending, else an empty slot so every card has the same height); a footer with tags (LNK-12), the folder chip (LNK-13) in mixed feeds, and the favorite star on the right ("Favorite: {{title}}", pressed state; tooltip "Add to favorites"/"Remove from favorites"). A checkbox "Select {{title}}" in the corner (hover/focus on pointer devices, always on touch). Pointer-following shadow on hover. Read-only cards (drag preview, right half of side by side, public collection) have no actions, star or menu.
- Entry points: feed (cards view).
- Screens / routes: SCR-LNK-01.
- Platforms: long press selects on compact screens.
- States: selecting (click toggles), selected, landed (just saved, ring and staggered land), dimmed/carried while dragging, current (preview open).
- Data: LinkResponse (title, url, imageUrl, faviconUrl, note, summary, aiStatus, tags, isFavorite, pinnedInFolderAt, remindAt, createdAt, folderId).
- Settings that change it: Open links in; Clicking a link; Appearance › Preview image (Large/Small/Off), Show site, Show notes, Show tags, Density.
- Feedback: see LNK-03..LNK-07.
- Limits: none.
- Related: LNK-02..LNK-14.
- Source: `features/links/components/link-card/*`, `features/links/utils/link-view.ts`.

#### LNK-02 Link list row
- What it does: One link in the list view: checkbox, favicon/letter, title, meta line (host, or the one-line AI summary with the host in the tooltip), folder chip in mixed feeds, reminder chip or "Pinned" badge, up to 2 tag chips on the right (not on phones, not when dense beside the preview), favorite star, eye (preview) and "…" menu buttons. The row is a real link like the card. When the preview is open the rows are dense and the current one is highlighted.
- Entry points: feed (list view).
- Screens / routes: SCR-LNK-02.
- Platforms: tags hidden below 40em; long press selects on compact.
- States: as LNK-01.
- Data: as LNK-01.
- Settings that change it: as LNK-01 (Density).
- Feedback: as LNK-01.
- Limits: 2 tags shown.
- Related: LNK-01.
- Source: `features/links/components/link-row/*`.

#### LNK-03 Link menu
- What it does: The "…" menu of a card or row ("Actions for {{title}}"), items in order with conditions: "Preview here" (eye; shortcut Space shown on desktop; when the page offers preview and the URL is http/https), "Open" (external; shortcut ↵ shown on desktop when preview is offered; http/https only), "Edit", "Add to favorites" / "Remove from favorites" (star / filled star), "Pin to top" / "Unpin from top" (only on a folder page), "Pin to sidebar" / "Unpin from sidebar", "Remind me…" / "Change reminder…" (bell), "Move to folder…" (folder-move), "Show related" (columns; AI, 80em+), "Create a rule for {{domain}}…" (globe; when the URL has a rule-able domain), separator, "Delete" (danger).
- Entry points: "…" button.
- Screens / routes: SCR-LNK-03.
- Platforms: all.
- States: n/a.
- Data: see each action.
- Settings that change it: "Open" follows "Open links in".
- Feedback: see actions.
- Limits: n/a.
- Related: LNK-04..LNK-15, LIB-23, LIB-24.
- Source: `link-card.component.html`, `link-row.component.html`.

#### LNK-04 Open a link
- What it does: Clicking a card/row title area opens the link as a normal anchor (new tab by default, or same tab per setting) and records the open (moves it to the top of Recently opened, updates lastOpenedAt). The default "Clicking a link" setting is "Opens the preview", so a plain click previews instead (LIB-24) unless the site is in "Sites that open in a new tab", the address is not https (non-video), or ⌘/Ctrl is held. "Open" in the menu opens a new tab or same tab per setting. While selecting, clicks toggle selection. Opening from pinned link rows, Recently opened rows and Forgotten rows also records the open.
- Entry points: card/row click, menu "Open", ↵ in preview.
- Screens / routes: SCR-LNK-01/02/03.
- Platforms: all.
- States: paused history: open not recorded.
- Data: `POST /api/links/:id/open` (failures ignored).
- Settings that change it: Open links in; Clicking a link; Sites that open in a new tab.
- Feedback: none; "Couldn't open the link." only when "Open saved" from Add link fails to load the link.
- Limits: none.
- Related: LIB-24, LIB-27.
- Source: `link-actions.service.ts` (`open`, `openFromMenu`), `link-preview/utils/wants-preview.ts`.

#### LNK-05 Favorite a link
- What it does: The star on a card/row, the menu item, the preview star and the edit dialog checkbox toggle favorite. Optimistic.
- Entry points: star button, menu, preview toolbar, edit dialog "Add to favorites" checkbox.
- Screens / routes: SCR-LNK-01/02/03, SCR-LIB-16/17, SCR-LNK-04.
- Platforms: all.
- States: n/a.
- Data: `PATCH /api/links/:id` {isFavorite}; folder counts refresh.
- Settings that change it: none.
- Feedback: no success toast; failure "Couldn't update the favorite" (detail: title) with "Retry". Removing from favorites on the Favorites page removes it from the feed.
- Limits: none.
- Related: LIB-18.
- Source: `link-actions.service.ts` (`toggleFavorite`), `stores/links.store.ts`.

#### LNK-06 Edit link dialog
- What it does: "Edit" opens the Add link dialog in edit mode titled "Edit link": "Link" (URL, no hint), "Title", the summary field (AI area; when shown), a rule chip if a domain rule applies, "Folder" (searchable select with Unsorted, "Search folders", "No folders found", "Create folder “{name}”"; AI folder suggestion), "Tags" (tag input, "Add tag", up to 20, create, AI tag suggestions), "Your note" (textarea, placeholder "Why are you saving this?", hint "Helps you find it later", character counter), then edit-only "Type" (Video, Article, Shopping, Podcast, Document, Code, App, Post, Recipe, Other) and checkbox "Add to favorites", a save error notice, a reminder line "Reminder: {{when}}" / "No reminder" with "Change" / "Remind me" (bell), and a meta line "Saved {{created}}, last opened {{opened}}" / "Saved {{created}}, never opened". Footer: "Delete" (ghost, trash; icon-only on tablet+ when "Fill in with AI" shares the row), "Fill in with AI" (AI area), "Cancel", primary "Save changes" / "Saving…".
- Entry points: menu "Edit"; preview "Edit"; Add link "Open saved" on a duplicate.
- Screens / routes: SCR-LNK-04.
- Platforms: dialog Md; sheet on phone (Cancel hidden, × does it).
- States: saving; errors (same keys as Add link: "Couldn't save the link. Try again.", "A folder or tag changed while saving. Try again.", "Too many requests. Wait a moment and try again.", "The link couldn't be saved because some details are invalid. Check the address, title and note."); validation "Enter a link", "Enter an address that starts with http:// or https://", "The link is too long (at most {{max}} characters)", "Enter a title", "The title is too long (at most {{max}} characters)", "The note is too long (at most {{max}} characters)".
- Data: `PATCH /api/links/:id` (tags replace the list; a new URL recomputes type and re-captures images).
- Settings that change it: AI settings (suggestions, Fill in with AI, summary).
- Feedback: success toast "Changes saved" (detail: title); a changed folder may trigger a rule offer (AI); "Delete" in the dialog runs LNK-07; "Remind me"/"Change" runs the reminder dialog.
- Limits: URL 2048, title 300, note 2000, tags 20.
- Related: capture area (Add link dialog shared), AI area, reminders.
- Source: `features/links/components/add-link/add-link-dialog.component.html`, `link-actions.service.ts` (`edit`).

#### LNK-07 Delete a link
- What it does: "Delete" (menu or edit dialog) asks "Delete this link?" / "“{{title}}” moves to Trash. You can restore it for {{days}} days." / "Delete link" / "Cancel" (destructive). After confirming, the link is hidden at once and an Undo toast runs for 8 s; the delete request is sent only when the toast closes without Undo (or on page hide / sign-out / opening Trash).
- Entry points: link menu; edit dialog footer.
- Screens / routes: SCR-LNK-05.
- Platforms: all.
- States: n/a.
- Data: `DELETE /api/links/:id` (soft delete to Trash); counts, tags, trash and reminders refresh.
- Settings that change it: Trash retention days.
- Feedback: red Undo toast "Moved to Trash" (detail: title) with "Undo"; failure "Couldn't delete the link" / "It is back in your list".
- Limits: undo 8 s.
- Related: LIB-20, SHL-15, trash.
- Source: `link-actions.service.ts` (`delete`, `commitDelete`), `stores/links.store.ts`.

#### LNK-08 Move to folder
- What it does: "Move to folder…" (menu, or M on a focused link) opens a folder picker titled "Move “{{title}}”": a search field "Search folders" (matches keep their parent folders visible), a "Recent" group (last 5 move targets on this device), the list "Folders" with Unsorted first and folders nested with icon/colour, the current folder marked "Current folder"; "No folders found". Choosing moves at once (optimistic) and closes.
- Entry points: menu; M key; also used by drag and drop and the right-half move button.
- Screens / routes: SCR-LNK-06.
- Platforms: bottom sheet below 64em (centred 560px on tablets), dialog on desktop; close "Close".
- States: same folder: nothing happens.
- Data: `PATCH /api/links/:id` {folderId}; recent folders in localStorage.
- Settings that change it: Folder colours.
- Feedback: Moved toast "Moved to {{folder}}" (folder path joined with " / ", or "Unsorted"; detail: title; folder tile) with "Undo" (8 s); failure "Couldn't move the link" / "It is back where it was" with "Retry"; Undo failure "Couldn't move the link back". With AI on, a rule may be offered (AI area). Moving a link out of the open scope removes it from the feed and Undo puts it back in its slot.
- Limits: recent targets 5.
- Related: LIB-16, LNK-09.
- Source: `components/move-picker/*`, `link-actions.service.ts` (`move`, `moveTo`, `moveBack`), `stores/recent-folders.store.ts`.

#### LNK-09 Drag and drop links onto folders
- What it does: From 64em, drag a card or row (mouse immediately; touch after holding 150 ms) onto a sidebar folder row, Unsorted, a pinned folder row, a subfolder tile, or a half of side by side. The drag preview is the real card/row, tilted and shrunk with a wobble, with a badge "Move {{count}} link(s)"; for a selection it shows a deck (1–2 silhouettes) and the other carried cards dim. The slot it leaves keeps its height. A target under the pointer is highlighted with "Move here". Rows that cannot take links (All links, Favorites, Recently opened, Reminders, Trash, pinned links) show a no-drop state and, the first time each is hovered during a drag, an info toast (2.5 s) with the reason. Releasing over a target flies the preview into it (row bumps) and moves; Esc cancels. Dragging a selected link carries the whole selection (one batch move, then selection clears). A screen reader hears "Moving {{count}} link(s). Drop … or press Escape to cancel." A drop on the folder the links are already in is no target.
- Entry points: pointer drag.
- Screens / routes: SCR-LNK-08.
- Platforms: disabled below 64em (no sidebar). In side by side, links can be dragged between halves.
- States: n/a.
- Data: as LNK-08 / LIB-16.
- Settings that change it: Animations (wobble/fly motion).
- Feedback: Moved toast with Undo; no-drop reason toasts: "Can't drop here — drop it on a folder", "Can't drop here — star a link to add it to Favorites", "Can't drop here — Recently opened fills as you open links", "Can't drop here — use Delete to move a link to Trash", "Can't drop here — a pinned link is not a folder", "Can't drop here — use “Remind me” in the link's menu".
- Limits: touch delay 150 ms.
- Related: LNK-08, LIB-16, LIB-22, SHL-03, SHL-04.
- Source: `features/links/services/link-drag.service.ts`, `features/library/services/library-drag.service.ts`, `components/drag-slot/*`, `features/links/models/no-drop-reason-keys.const.ts`.

#### LNK-10 Pin to top of folder
- What it does: On a folder page, "Pin to top" / "Unpin from top" in the link menu. Pinned links come first in the folder (in the order pinned) with a "Pinned" badge, whatever the sort. A move to another folder or Trash unpins. After unpinning the page reloads so the link finds its sorted place.
- Entry points: link menu (folder pages only).
- Screens / routes: SCR-LNK-03.
- Platforms: all.
- States: n/a.
- Data: `PATCH /api/links/:id` {pinnedInFolder}; 409 beyond 20; 400 in Unsorted.
- Settings that change it: none.
- Feedback: failure toast "Couldn't change the pin" (detail: title); optimistic with rollback.
- Limits: 20 pinned per folder.
- Related: LNK-01.
- Source: `link-actions.service.ts` (`togglePinInFolder`), `features/links/utils/pinned-first.ts`.

#### LNK-11 Pin a link to the sidebar
- What it does: "Pin to sidebar" / "Unpin from sidebar" in the link menu adds/removes the link in the Pinned section (SHL-03).
- Entry points: link menu.
- Screens / routes: SCR-LNK-03.
- Platforms: all.
- States: limit.
- Data: `POST /api/pins`, `DELETE /api/pins/link/:id`.
- Settings that change it: none.
- Feedback: limit toast "Pinned is full" / "You can pin up to 7 folders and links. Unpin one first."; failures "Couldn't pin" / "Couldn't unpin"; no success toast.
- Limits: 7.
- Related: SHL-03.
- Source: `link-actions.service.ts` (`togglePinToSidebar`), `pin-actions.service.ts`.

#### LNK-12 Tags on cards and rows
- What it does: A card's footer shows the first tag (truncated to its max width) and, if more, a "+{{count}}" chip (accessible name "{{count}} more tag(s): {{list}}") that opens a popover "Other tags" (or "All tags" when even the first is collapsed) listing every hidden tag. Clicking a tag (on the card or in the popover) shows the links with that tag (navigates with `?tag=`). Rows show up to two tag chips (not clickable). Tags are not clickable while selecting or on read-only cards.
- Entry points: tag chips.
- Screens / routes: SCR-LNK-01, SCR-LNK-07.
- Platforms: rows hide tags on phones.
- States: n/a.
- Data: link tags.
- Settings that change it: Appearance › Show tags.
- Feedback: none.
- Limits: none.
- Related: LIB-08, tags (other area).
- Source: `components/link-card-tags/*`, `features/tags/services/tag-actions.service.ts` (`showLinks`).

#### LNK-13 Folder chip on cards and rows
- What it does: In mixed feeds (All links, Favorites; not in a folder's own feed or Unsorted) each card/row shows a chip with the link's folder icon, colour and name (hint "In folder"). Not shown on rows while the preview is open.
- Entry points: n/a (display).
- Screens / routes: SCR-LNK-01/02.
- Platforms: all.
- States: n/a.
- Data: folderId → folder.
- Settings that change it: Folder colours.
- Feedback: none.
- Limits: none.
- Related: LNK-01.
- Source: `features/links/services/folder-chips.service.ts`, `library.page.ts` (`showFolderChips`).

#### LNK-14 Reminder chip and "Remind me" entry
- What it does: A link with a reminder shows a bell chip with its time (or due state, warning tone) instead of the date on cards and in the meta line of rows. The menu offers "Remind me…" or "Change reminder…", opening the reminders dialog (reminders area).
- Entry points: link menu; edit dialog reminder line; Forgotten "Remind me"; bulk "Remind".
- Screens / routes: SCR-LNK-01/02/03/04.
- Platforms: all.
- States: due vs future.
- Data: remindAt.
- Settings that change it: reminders settings (other area).
- Feedback: other area.
- Limits: other area.
- Related: reminders (other area).
- Source: `link-card.component.ts`, `link-row.component.ts`, `link-actions.service.ts` (`remind`).

#### LNK-15 Create a rule for a domain (entry point)
- What it does: "Create a rule for {{domain}}…" in the link menu opens the rule dialog prefilled with the link's domain (rules area).
- Entry points: link menu.
- Screens / routes: rules area.
- Platforms: all.
- States: hidden when no domain can be derived.
- Data: rules API.
- Settings that change it: n/a.
- Feedback: rules area.
- Limits: rules area.
- Related: rules (other area).
- Source: `link-actions.service.ts` (`createRule`).

#### LNK-16 Copy a link's address
- What it does: Copies one URL to the clipboard from the preview toolbar / pushed-page More menu ("Copy link") or the Recently opened row menu ("Copy link"). The pushed page's "Share" falls back to copy.
- Entry points: preview, recent row menu.
- Screens / routes: SCR-LIB-16/17/19.
- Platforms: all.
- States: no clipboard: failure.
- Data: none.
- Settings that change it: none.
- Feedback: "Link copied" / "Couldn't copy the link".
- Limits: none.
- Related: LIB-19 (bulk copy).
- Source: `link-preview.service.ts` (`copyLink`), `recent-history.component.ts` (`copyLink`).

#### LNK-17 Feedback after saving a link (from Add link)
- What it does: When Add link (capture area) saves, the library shows the link at once (top of a newest-first feed in scope, with the landing motion), refreshes counts and tags, and shows a Saved toast "Saved to {{folder}}" (detail: title, thumbnail). A paste-many save shows "{{count}} link(s) saved to {{folder}}" or, when rules filed them in different folders, "{{count}} link saved" / "{{count}} links saved to their folders", detail "Titles and previews are still loading" or "{{count}} link(s) was/were skipped…", with "Undo" (8 s; undo deletes them in one request; failure "Couldn't undo" / "The links are still saved"). If nothing was saved: "No links were saved". "Open saved" on a duplicate opens the existing link in Edit.
- Entry points: Add link dialog, share page.
- Screens / routes: capture area.
- Platforms: all.
- States: n/a.
- Data: `POST /api/links`, `POST /api/links/batch`, undo `POST /api/links/batch/delete`.
- Settings that change it: none here.
- Feedback: as listed.
- Limits: 100 per batch.
- Related: capture area, LIB-12.
- Source: `link-actions.service.ts` (`addLink`, `noteSaved`, `noteSavedMany`, `undoSavedMany`).

#### LNK-18 AI summary on cards and rows (display)
- What it does: When a link has no user note, the card's note slot shows its summary (AI mark when AI wrote it) or a skeleton while the AI job is pending; on rows the summary replaces the host line. Details in the AI area.
- Entry points: n/a.
- Screens / routes: SCR-LNK-01/02.
- Platforms: all.
- States: pending, none.
- Data: summary, summarySource, aiStatus.
- Settings that change it: AI › Summaries; Appearance › Show notes.
- Feedback: n/a.
- Limits: AI area.
- Related: AI (other area).
- Source: `link-card.component.html`, `link-row.component.html`.

### 3.2 Organise: folders, tags, rules, trash, reminders

Breakpoints used below: "phone" = below 40em; "compact" = below 64em (phones and tablets in portrait: the mobile shell with the tab bar, no sidebar); "desktop" = from 64em (the sidebar). The code's `compact` signal (below 64em) is what switches between the sidebar and the phone Library / Tags pages, so tablets in portrait get the "phone" pages. Dialogs become bottom sheets below 40em (dialog service).

#### ORG-01 Folder tree in the sidebar
- What it does: Shows the user's folders as a nested tree under the heading "Folders" in the desktop sidebar, below the fixed rows ("All links", "Unsorted", "Favorites", "Recently opened", "Reminders") and the Pinned section. Each row shows the folder tile (icon or emoji in the folder colour), the name, and the link count (links directly in the folder only, not subfolders). Folders that contain subfolders have a twisty to open/close. The ancestors of the folder whose page is open start expanded. The active folder row is marked current. A folder with a description shows it as a tooltip on its row. A highlighted folder gets a soft background in its colour. Choosing a row opens the folder page `/folders/:id`. Siblings are ordered by manual position, then name.
- Entry points: Desktop sidebar section "Folders"; keyboard Up/Down move between rows, Left/Right close/open or step to parent/child, typing jumps, Enter chooses; click.
- Screens / routes: SCR-ORG-01; navigates to `/folders/:folderId`.
- Platforms: desktop (from 64em) in the sidebar. Below 64em the same tree (same menus and actions) is on the Library tab page `/library` (ORG-21). The "Folders" heading has a fold chevron only in the desktop sidebar (section collapse, remembered); not on the phone page.
- States: first load: nothing for 300 ms, then a skeleton of tree rows (4 rows in the sidebar, 5 on the phone page); the section is never shown empty before the list answers. Load error: "Couldn't load your folders." with a "Try again" button. No folders: the section shows only the heading with the "+" button (no empty text). Counts are absent until the list has loaded.
- Data: Folder (id, parentId, name, colour, icon, highlighted, description, coverLinkId, coverUrl, position, pinned, linkCount, createdAt, updatedAt). `GET /api/folders` (flat list ordered by position then name, plus counts all/unsorted/favorites for the fixed rows).
- Settings that change it: Settings › Library › "Show folder counts" (off hides the link counts on folder rows and fixed rows; Trash and Reminders counts stay). Settings › Appearance › "Folder colors" (off shows every folder in plain graphite; the chosen colour is kept).
- Feedback: none for navigation. Other browser tabs of the same user follow folder changes (tab sync).
- Limits: 500 folders per user (see ORG-02). No depth limit.
- Related: ORG-07 folder menu, ORG-06 reorder, ORG-19 link drop targets, pinned section (ORG-14), sidebar (other area).
- Source: `shell/sidebar/sidebar.component.*`, `shell/sidebar/utils/folder-tree-nodes.ts`, `stores/folders.store.ts`, `stores/folder-tree.ts`, `libs/ui/.../tree/tree.component.ts`.

#### ORG-02 Create a folder (top level)
- What it does: Opens the "New folder" dialog with a Name field and an "Inside" select (defaults to "Top level"). On "Create folder" the dialog waits for the server ("Creating…" on the button); on success it closes, a success toast "Folder created" (detail: the folder name) shows, the app navigates to the new folder's page and the sidebar focuses the new row. The new folder goes to the end of its parent's order and gets the default graphite colour and "folder" icon. Duplicate names are allowed.
- Entry points: "+" icon button "New folder" next to the "Folders" heading (desktop sidebar; also on the phone Library page folder section). Clicking it in the desktop sidebar first unfolds a collapsed Folders section. Also: the Add link dialog's folder field can create a folder by typed name ("New" badge, created on Save; other area), import creates folders (other area).
- Screens / routes: SCR-ORG-03.
- Platforms: all; dialog is a bottom sheet below 40em.
- States: limit reached: no dialog, a danger toast "Folder limit reached" / "You can have up to 500 folders". Request failed: dialog stays open with notice "Couldn't create the folder. Try again." Saving: primary button shows spinner and "Creating…", Cancel disabled.
- Data: `POST /api/folders` {name, parentId?} → FolderResponse. Server: 409 when the user has 500 folders counting folders in Trash; 404 for a foreign parent.
- Settings that change it: none.
- Feedback: toast "Folder created" (success, detail = name), navigation to the folder, focus on new row. Not optimistic (waits for server).
- Limits: name 1–100 characters (trimmed); 500 folders per user.
- Related: ORG-03, ORG-07.
- Source: `features/folders/services/folder-actions.service.ts` (create), `components/folder-name-dialog/*`, `stores/folders.store.ts` (create, atLimit).

#### ORG-03 Create a subfolder
- What it does: Same dialog as ORG-02 with the "Inside" select preset to the chosen folder; the dialog title becomes "New folder in “{parent}”". The user can still change "Inside" to any folder or "Top level".
- Entry points: Folder menu › "New subfolder".
- Screens / routes: SCR-ORG-03.
- Platforms: all.
- States / Data / Feedback / Limits: as ORG-02.
- Related: ORG-02, ORG-07.
- Source: `shell/sidebar/services/sidebar-folders.service.ts` (createSubfolder), `folder-actions.service.ts`.

#### ORG-04 Rename a folder
- What it does: Opens the "Rename folder" dialog with the Name field filled with the current name (no "Inside" field). "Rename" closes the dialog at once; the new name shows at once (optimistic). If the name is unchanged nothing is sent. On failure the old name comes back and a danger toast "Couldn't rename the folder" / "The old name is back" shows.
- Entry points: Folder menu › "Rename".
- Screens / routes: SCR-ORG-04.
- Platforms: all.
- States: validation errors in the field (see form fields).
- Data: `PATCH /api/folders/:id` {name}.
- Feedback: optimistic; error toast with rollback. No success toast.
- Limits: 1–100 characters.
- Related: ORG-07.
- Source: `folder-actions.service.ts` (rename), `folder-name-dialog.component.*`, `folders.store.ts` (rename).

#### ORG-05 Move a folder (nest / un-nest)
- What it does: Opens "Move “{name}”" with one searchable select "Move to" listing "Top level" and every folder (as a nested list with tiles in their shown colour) except the folder itself and its descendants. "Move" closes at once; the folder moves at once (optimistic) to the end of its new parent. If the parent did not change nothing is sent. On failure it moves back and a danger toast "Couldn't move the folder" / "It is back where it was" shows. After closing, focus goes to the moved row or, if hidden under a collapsed parent, near it.
- Entry points: Folder menu › "Move to…". (Folders cannot be dragged into another folder; drag only reorders among siblings.)
- Screens / routes: SCR-ORG-05.
- Platforms: all.
- States: search with no match: "No folders found".
- Data: `PATCH /api/folders/:id` {parentId | null}. Server refuses a move into itself/descendant (400 "A folder cannot be moved into itself or a subfolder"); the client also refuses it without a request.
- Feedback: optimistic; error toast with rollback.
- Limits: no depth limit.
- Related: ORG-06.
- Source: `move-folder-dialog.component.*`, `folders.store.ts` (move), `apps/api/src/folders/folders.service.ts` (update, wouldCreateCycle).

#### ORG-06 Reorder folders among siblings
- What it does: A folder row can be moved up/down among its siblings (never to another parent). The new place shows at once; the move is announced politely ("Moved up, position {position} of {total}" / "Moved down, position {position} of {total}"); on failure the old order returns with a danger toast "Couldn't change the order" / "The old order is back." The order shows everywhere folders are listed (sidebar, phone Library tree, subfolder tiles, folder pickers).
- Entry points: drag a folder row with the mouse (starts at once); on touch: press, rest ~400 ms, then move (a long press without moving opens the folder menu; moving after the menu opened closes the menu and continues the drag); keyboard Alt+Up / Alt+Down on the focused row (row keeps focus).
- Screens / routes: SCR-ORG-01, SCR-ORG-11.
- Platforms: desktop sidebar and phone Library tree.
- Data: `PUT /api/folders/order` {parentId, ids[]} (all live siblings exactly once, else 400 "The order must list every folder of that parent exactly once").
- Feedback: live announcement; optimistic; error toast.
- Related: shortcuts list "Move a pinned item or folder up or down".
- Source: `libs/ui/.../tree/tree-reorder-*.ts`, `sidebar-folders.service.ts` (reorder), `folder-actions.service.ts` (reorder), `folders.store.ts` (reorder).

#### ORG-07 Folder menu
- What it does: Per-folder action menu (accessible name "Folder actions"; the row's "…" button is named "Actions for {name}"). Items in order: 1 "Pin to sidebar" / "Unpin from sidebar" (pin icon; label depends on pinned state) · 2 "Color and icon…" · 3 "New subfolder" · 4 "Add link here" · 5 "Rename" · 6 "Move to…" · 7 "Share…" · separator · 8 "Delete folder…" (danger). All items always shown (no conditions).
- Entry points: right click on a folder row (opens at the pointer); the row's "…" button (shown on hover/focus); Shift+F10 or the context-menu key on the focused row; long press on touch. The row's "…" button shows pressed while its menu is open. The menu closes if a drag starts.
- Screens / routes: SCR-ORG-02.
- Platforms: desktop sidebar and the phone Library tree (each has its own menu instance). Not available on the folder page header, subfolder tiles, or Pinned rows.
- Feedback: per item (see features).
- Related: ORG-02..ORG-05, ORG-08..ORG-14, ORG-17, ORG-18.
- Source: `shell/sidebar/sidebar.component.html` (folderMenuRef), `sidebar-folders.service.ts`, `libs/ui/.../tree/tree-context-menu.ts`.

#### ORG-08 Folder colour (built-in and own colours)
- What it does: In the "Color and icon" dialog the user picks one of 8 built-in colours on one line (Graphite, Sage, Ocean, Plum, Clay, Amber, Rose, Teal) or one of the account's own colours. A "+" swatch "Add your own color" opens a colour picker (saturation/brightness area, hue slider, hex field); the finished colour is added to the account's own colours (synced across devices, newest last, max 12; the oldest drops) and chosen. Own swatches have a remove "×" (or Delete key) that forgets the colour from the account with an Undo toast "Color removed" (Undo puts it back); a folder that wears a removed colour keeps it, and a colour only the folder wears (not in the account list) is shown as a swatch without a remove action. The preview tile updates live. Save applies (see ORG-09 for Save/Reset).
- Entry points: Folder menu › "Color and icon…".
- Screens / routes: SCR-ORG-06, SCR-ORG-08.
- Platforms: all.
- States: picker hex invalid: "Enter # and six digits or letters a–f, like #2e6a99."; remove failed: danger toast "Couldn’t remove the color".
- Data: Folder.colour (FOLDER_COLOUR name or lower-case `#rrggbb`); user settings customColours. `PATCH /api/folders/:id` {colour}; `PATCH /api/me/settings` {customColours}.
- Settings that change it: Settings › Appearance › "Folder colors" off shows graphite everywhere (choice kept). Own colours are shared with Settings › Appearance custom theme.
- Feedback: optimistic save; on failure toast "Couldn't save the style" / "The old color and icon are back." with rollback.
- Limits: 12 own colours per account.
- Related: ORG-09, appearance settings (other area).
- Source: `folder-style-dialog.component.*`, `core/colours/own-colour-actions.service.ts`, `stores/user-settings.store.ts` (addCustomColour/removeCustomColour).

#### ORG-09 Folder icon or emoji
- What it does: A segmented control "Icon" / "Emoji" picks how the folder's symbol is chosen; the dialog opens on the tab the folder currently wears. Icon tab: a 7-column grid of 28 common icons, then "Show all icons ({count})" (63 icons) expands the rest ("Show fewer" collapses); the grid opens expanded if the folder's icon is among the hidden ones; icons are drawn in the chosen colour. Emoji tab: an emoji field/picker (one emoji instead of an icon) with search, nine category tabs (Food, Travel, Work, Sport, Home, Animals, Nature, Objects, Symbols; ~300 curated emoji with localized names loaded on first open), "Recent" (this device, newest first, up to 16) and "Yours" (the account's own emoji, up to 24, synced). Saving a folder with an emoji puts it first in Recent; an emoji not in the collection is added to "Yours". Removing an own emoji: Undo toast "Emoji removed" (danger toast "Couldn’t remove the emoji" on failure); an emoji worn by a folder has no remove action. Save applies the active tab's choice; on the Emoji tab without a valid emoji the icon choice applies. Both tab choices are kept while the dialog is open. "Reset" sets graphite colour, folder icon, empty emoji, highlight off, and switches to the Icon tab (description and cover are kept). "Cancel" closes without change. "Save" closes at once; only changed fields are sent.
- Entry points: Folder menu › "Color and icon…".
- Screens / routes: SCR-ORG-06, SCR-ORG-07.
- Platforms: all.
- States: emoji names loading: "Loading emoji"; no search match: "No emoji found"; invalid text: "Enter exactly one emoji."
- Data: Folder.icon (FOLDER_ICON name or one emoji ≤16 code points, single grapheme). User settings customEmoji. localStorage "Recent" (cleared at sign-out).
- Feedback: optimistic; error toast "Couldn't save the style" / "The old color and icon are back."
- Limits: 63 icons; emoji = exactly one emoji; own emoji max 24; Recent max 16.
- Related: ORG-08.
- Source: `folder-style-dialog.component.*`, `services/folder-emoji.service.ts`, `models/folder-emoji-catalog.const.ts`, `models/folder-icon-common.const.ts`, `utils/folder-style-symbol.ts`, contracts `folder-icon.const.ts`, `is-folder-emoji.ts`.

#### ORG-10 Folder description
- What it does: Optional one-line description field in the "Color and icon" dialog; shown under the folder name on the folder page header and as a tooltip on the sidebar row. Blank removes it. Trimmed before saving.
- Entry points: Folder menu › "Color and icon…" › "Description".
- Screens / routes: SCR-ORG-06; shown on SCR-ORG-10 and SCR-ORG-01.
- Platforms: all (not shown in the split / preview-split view header).
- States: "Keep it to {max} characters." when longer than 140 after trimming; "Use plain text on one line." for control characters (tabs, line breaks).
- Data: Folder.description (string ≤140 or null). `PATCH /api/folders/:id` {description}.
- Limits: 140 characters.
- Source: `folder-style-dialog.component.*`, `utils/description-error.ts`, contracts `is-folder-description.ts`.

#### ORG-11 Folder highlight
- What it does: Switch "Highlight with background" (hint "Gives the folder a soft background in its color, in the sidebar and on its page."). When on, the folder's sidebar row (and its Pinned row) gets a soft background in its colour, and its page header becomes the tinted folder banner (band or cover, big tile, title, description). When off, the folder page shows a plain title with description and cover beside it.
- Entry points: Folder menu › "Color and icon…".
- Screens / routes: SCR-ORG-06; effect on SCR-ORG-01, SCR-ORG-10.
- Data: Folder.highlighted. `PATCH /api/folders/:id` {highlighted}.
- Source: `folder-style-dialog.component.html`, `library.page.ts` (folderBanner / plainFolder), `libs/ui tree-highlight.scss`.

#### ORG-12 Folder cover
- What it does: "Cover" section in the "Color and icon" dialog (hint "A preview picture from a link in this folder, behind the folder header."): a 3-column radio grid of thumbnails: "No cover" first, then the preview images of up to 12 links of the folder's first page (pinned links first), each named "Cover from “{title}”"; the current cover is kept as "Current cover" if its link is not among them. The chosen picture shows on the folder page header (behind the banner if highlighted, beside the title if not) right away, before the server answers. The cover only stays while the link is live and directly in the folder.
- Entry points: Folder menu › "Color and icon…".
- Screens / routes: SCR-ORG-06; shown on SCR-ORG-10.
- States: loading: spinner "Loading pictures"; no link with a picture and no cover: "Links in this folder with a preview picture can be its cover." (no grid).
- Data: Folder.coverLinkId, coverUrl. `GET /api/links?folderId=&limit=12`; `PATCH /api/folders/:id` {coverLinkId} (404 "Cover link not found in this folder").
- Limits: 12 choices.
- Source: `components/folder-cover-picker/*`, `utils/cover-options.ts`, `apps/api/src/folders/folder-covers.ts`.

#### ORG-13 Delete a folder
- What it does: Opens "Delete folder “{name}”?" The text depends on the subtree: empty folder "This folder is empty."; only subfolders "It has {n subfolders} and no links."; links only "It has {n links}. What should happen to the links?"; both "It has {n links} and {n subfolders}. What should happen to the links?" (counts include all subfolders). When the subtree holds links, a radio group "What happens to the links": "Move links to Unsorted" (default, first; description "The folders are deleted, the link stays" / "The folders are deleted, all {count} links stay") or "Delete links too" ("They wait in Trash with the folder"). Primary danger button: "Delete folder", or "Delete folder and {count} link(s)" when "Delete links too" is chosen. The dialog waits for the server. Subfolders are always deleted. On success: if the open page belonged to a deleted folder the app goes to `/links` first; the folders leave the tree, loaded links follow (moved to Unsorted or removed), pins of the deleted folders drop, counts and Trash reload; success toast "Folder moved to Trash" (detail: folder name). No Undo; restore from Trash.
- Entry points: Folder menu › "Delete folder…".
- Screens / routes: SCR-ORG-09.
- States: deleting: spinner on primary, Cancel disabled; failure: notice "Couldn't delete the folder. Nothing was changed." and the dialog stays open.
- Data: `DELETE /api/folders/:id?mode=move-to-unsorted|delete-links`. The folder and its subtree get the same deletedAt (one Trash entry). Moved links lose "pinned in folder"; deleted links lose sidebar pins.
- Feedback: confirmation dialog; success toast; not optimistic.
- Related: TRS-03 restore, RUL-11 (rules whose folder is trashed), saved views ("This view is waiting for its folder", other area).
- Source: `components/delete-folder-dialog/*`, `folder-actions.service.ts` (delete, leaveDeleted), `folders.store.ts` (remove), `apps/api/src/folders/folders.service.ts` (remove).

#### ORG-14 Pin a folder to the sidebar
- What it does: Folder menu item "Pin to sidebar" adds the folder to the "Pinned" section above Folders (desktop sidebar; on compact at the top of the Library page); "Unpin from sidebar" removes it. Pinned folder rows open the folder page, show the folder tile in its shown colour, its highlight, and its link count (if counts are shown); they act as link drop targets. Pinned items (folders and links together) reorder by drag or Alt+Up/Down and have an Unpin icon button with Undo ("Unpinned from sidebar" toast).
- Entry points: Folder menu item 1; Pinned row Unpin button.
- Screens / routes: SCR-ORG-02; Pinned section (shared with links).
- States: limit: warning toast "Pinned is full" / "You can pin up to 7 folders and links. Unpin one first." (6 s); failure: "Couldn't pin" (detail folder name) / "Couldn't unpin" (detail name). Phone Library with nothing pinned: button "Nothing pinned yet" that explains ("Nothing pinned yet — use “Pin to sidebar” in a folder or link menu").
- Data: `/api/pins` (POST pin, DELETE unpin, reorder); Folder.pinned.
- Limits: 7 pinned items total.
- Related: pins (shared with link card/row menus).
- Source: `features/pins/services/pin-actions.service.ts`, `features/pins/components/sidebar-pinned/*`, `sidebar-folders.service.ts` (togglePin).

#### ORG-15 Folder page header and breadcrumbs
- What it does: A folder page (`/folders/:id`, the library feed scoped to the folder) shows: breadcrumbs "All links" › ancestors (links) › the folder (current, not a link), with collapsed middle crumbs behind "Show hidden folders"; then the header. Highlighted folder: tinted banner in the folder colour (or the cover picture), big folder tile (large on phone, extra-large otherwise), title (folder name), description, count line. Not highlighted: plain title, optional cover picture beside it, description, count line. Count line: "{n} links" / "{n}+ links" (more pages) or "{links}, {n} subfolders" when it has subfolders; a skeleton line while loading. The page title in the browser tab is "{folder name} · {app}". The feed's own tools (view, sort, export, split, select) are other area.
- Entry points: sidebar row, Pinned row, subfolder tile, breadcrumb, search results, folder chips on cards (other area).
- Screens / routes: SCR-ORG-10.
- Platforms: all; banner/cover/description are hidden while the split view or the preview split is open (narrow).
- States: folder missing/deleted: page empty state "Folder not found" / "This folder doesn't exist, or it was deleted." / button "Show all links" (breadcrumbs hidden). Empty folder: "This folder is empty" / "Add a link here, or move links from Unsorted." / buttons "Open Unsorted" and "Add link" (adds into this folder).
- Data: FoldersStore (pathTo, folder fields), links list for the folder.
- Settings that change it: "Folder colors" off → graphite banner/tile.
- Related: library feed (other area), ORG-16.
- Source: `features/library/library.page.html` (toolbar/heading), `library.page.ts` (folderBanner, plainFolder), `services/library-head.service.ts` (crumbs, banner), `components/folder-cover/*`.

#### ORG-16 Subfolders first (subfolder tiles)
- What it does: In a folder page, the direct subfolders appear before the links as a list "Subfolders": compact tiles in cards view, full-width rows in list view. Each tile: folder tile (icon/emoji, shown colour), name, meta "{n} links" or "{n} links, {n} subfolders", and a chevron. The whole tile is a link to the subfolder (middle click / new tab work). Accessible name "Open folder {name}, {links}[, {folders}]". Tiles follow the sidebar's manual order. Tiles are drop targets for dragged links (highlighted "Move here"). Hidden while a search or tag filter is active, and for a missing folder. While the next view loads the previous subfolders stay (stale, inert). Always first — not a setting (Settings › Library note: "Subfolders are always shown first in a folder; it isn’t a setting.").
- Entry points: folder page.
- Screens / routes: SCR-ORG-10.
- Data: FoldersStore entities (children of the folder), linkCount.
- Source: `library-feed.service.ts` (currentSubfolders), `components/folder-tile/*`.

#### ORG-17 Add link here
- What it does: Opens the Add link dialog with this folder preselected.
- Entry points: Folder menu › "Add link here"; empty folder page "Add link".
- Related: Add link (other area).
- Source: `folder-actions.service.ts` (addLinkHere).

#### ORG-18 Share a folder (entry only)
- What it does: Opens the share dialog for the folder as a public collection (link count of the whole subtree; demo flag passed). Described by the sharing area.
- Entry points: Folder menu › "Share…".
- Source: `folder-actions.service.ts` (share), `features/sharing/components/share-folder-dialog`.

#### ORG-19 Folders as drop targets for links (entry only)
- What it does: While dragging a link (or selection), sidebar folder rows, Pinned folder rows and subfolder tiles highlight as targets with the badge "Move here"; a closed folder under the pointer opens after ~600 ms. Fixed rows refuse with messages (e.g. Trash "Can't drop here — use Delete to move a link to Trash", Reminders "Can't drop here — use “Remind me” in the link's menu"). Drag behaviour itself is the links area.
- Source: `features/links/services/link-drag.service.ts`, `libs/ui tree.component.ts` (dropTargetId).

#### ORG-20 Phone Library page folder tree
- What it does: On compact screens the Library tab `/library` shows (top to bottom) the title "Library", the Pinned section (card style), the folder tree (heading "Folders" with "+ New folder", rows, menus, reorder) and then tiles: All links (count), Unsorted (count), Favorites (count, accent icon), Recently opened ("{n} forgotten" in accent, else "{n} today"; opens a sheet), Reminders ("{n} due"), Trash ("{n} item(s)"). When Ask is on (Ask takes the Tags tab), the tags section shows at the bottom. From 64em the page redirects to `/links`.
- Entry points: phone tab bar "Library"; back buttons on Trash and Reminders pages ("Library").
- Screens / routes: SCR-ORG-11.
- Platforms: compact only (below 64em).
- Source: `features/library/pages/phone-library/*`.

#### ORG-21 Folder pickers elsewhere (entry only)
- What it does: Folder lists in other dialogs reuse the tree order, tiles and shown colours: "Inside" (new folder), "Move to" (move folder), the rule dialog's folder list (with recent folders first), Move links to folder (links area), Add link folder field (links area), split view picker (library area).
- Source: `features/links/utils/folder-options.ts`, `buildFolderPickerOptions`.

#### TAG-01 Tags section (list of tags)
- What it does: Section "Tags" in the desktop sidebar under Folders: the tags as clickable chips, most used first (then by name); the top 8 show, then a neutral chip "+ {count} more" expands the rest and becomes "Show less". Tag link counts are not shown on chips (only in the tag menu summary). Desktop has a fold chevron "Show or hide tags".
- Entry points: desktop sidebar; phone Tags tab (TAG-09); phone Library page while Ask is on (TAG-10).
- Screens / routes: SCR-TAG-01.
- States: loading: section absent until the list answers; load error: "Couldn't load your tags." + "Try again"; no tags (sidebar): "No tags yet. Add one with +.".
- Data: Tag (id, name, linkCount, createdAt, updatedAt). `GET /api/tags` (sorted by linkCount desc, then name).
- Limits: shown before folding: 8.
- Source: `features/tags/components/sidebar-tags/*`, `utils/tag-split.ts`, `stores/tags.store.ts`.

#### TAG-02 Create a tag (empty)
- What it does: "+" button "New tag" opens an inline field at the top of the list (label "New tag", placeholder "Tag name", hint "Enter saves, Esc cancels. Spaces become dashes."). Enter saves (waits for server); on success toast "Tag “{name}” created", the field closes and focus goes to the new chip (the list expands if the new chip is folded). Esc, a press outside, or Tab away closes without saving. "+" again toggles the field closed. A folded section unfolds first.
- Entry points: "+" next to "Tags" (sidebar, Tags page, empty state button "New tag"). Tags can also be created in the link form's tag field ("Create tag …", other area) and by rules on save.
- Screens / routes: SCR-TAG-03.
- States: "Enter a tag name" (empty), "Use {max} characters or fewer" (>50), "There's already a tag “{name}”." (name exists, case-insensitive), "You have reached the limit of {max} tags." (1000), "Couldn't create the tag. Try again." (failure).
- Data: `POST /api/tags` {name} (normalized: trimmed, whitespace runs → "-").
- Limits: name 1–50 characters; 1000 tags per user; unique case-insensitively.
- Source: `services/tag-editor.service.ts`, `utils/validate-tag-name.ts`, `utils/tag-save-error.ts`.

#### TAG-03 Show links with a tag
- What it does: Clicking a tag chip (or menu "Show links") navigates to `/links?tag={name}` (All links filtered by that one tag).
- Entry points: chip click; tag menu "Show links".
- Related: TAG-08 filter row.
- Source: `services/tag-actions.service.ts` (showLinks).

#### TAG-04 Rename a tag in place
- What it does: Tag menu "Rename" turns the chip into an inline field (label "Tag name") with the name. Enter saves: optimistic (the chip shows the new name at once), the loaded links get the new name once the server accepts, and an open `?tag=` filter naming the old tag is rewritten. Same name: closes. If the new name belongs to another tag (case-insensitive), the field stays with "There's already a tag “{name}”. Merge them instead?" and a button "Merge into “{name}”" (merges without a dialog). Esc / press outside / Tab away cancels. Focus returns to the renamed chip.
- Entry points: tag menu › "Rename".
- Screens / routes: SCR-TAG-03.
- States: "Couldn't rename the tag. The old name is back." on failure; validation as TAG-02 (limit not checked for rename).
- Data: `PATCH /api/tags/:id` {name}; 409 when taken.
- Feedback: optimistic with rollback.
- Source: `tag-editor.service.ts`, `tags.store.ts` (rename).

#### TAG-05 Merge a tag into another
- What it does: Dialog "Merge “{name}”" with text "Every link tagged “{name}” gets the tag you choose, then “{name}” is deleted." and a searchable select "Merge into" (placeholder "Choose a tag", all other tags). "Merge" waits for the server; on success the source tag disappears, the target's count updates, loaded links are renamed, an open filter is retargeted and toast "Merged “{name}” into “{target}”".
- Entry points: tag menu › "Merge into another tag…"; rename conflict offer "Merge into “{name}”".
- Screens / routes: SCR-TAG-04.
- States: "Choose a tag to merge into" (nothing chosen); "No tags found" (search); failure notice "Couldn't merge the tags. Try again." (dialog); from the rename offer: danger toast "Couldn't merge the tags" / "Try again".
- Data: `POST /api/tags/:id/merge` {targetTagId} → target tag.
- Source: `components/merge-tag-dialog/*`, `tag-actions.service.ts` (merge, mergeInto).

#### TAG-06 Delete a tag
- What it does: Confirmation "Delete tag “{name}”?" / "It will be removed from {count} link(s). The link(s) itself/themselves stays/stay where it is/they are." / "Delete tag" (danger) / "Cancel". After confirming, the tag disappears and an Undo toast "Tag “{name}” deleted" with "Undo" shows for 8 s; Undo brings it back; when the window ends the delete is sent (also on page hide and sign-out). On failure the tag comes back with danger toast "Couldn't delete the tag “{name}”" / "It is back". An open filter on the tag is removed. Deleting a tag is permanent (tags do not go to Trash).
- Entry points: tag menu › "Delete tag".
- Screens / routes: SCR-TAG-05.
- Data: `DELETE /api/tags/:id` (deferred).
- Source: `tag-actions.service.ts` (delete), `tags.store.ts` (hide/undoRemove/commitRemove).

#### TAG-07 Tag menu
- What it does: Menu per tag (accessible name "Actions for tag {name}"). First line (not an item) summary "{name}, {n} links". Items in order: "Show links" (search icon) · "Rename" · "Merge into another tag…" · separator · "Delete tag" (danger). No conditions.
- Entry points: right click on a chip; the chip's "…" button; Shift+F10 / context-menu key; long press (touch).
- Screens / routes: SCR-TAG-02.
- Source: `sidebar-tags.component.html`, `services/tag-menu.service.ts`.

#### TAG-08 Tag filter in the feed
- What it does: `?tag=a&tag=b` filters the feed to links having all the selected tags. A filter row "Filtered by tags" shows removable chips (search chip, kind chip, one chip per tag "Remove tag filter {name}") and "Clear filter". Values are normalized like tag names, de-duplicated ignoring case, at most 5 tags (extra ignored), each cut to 50 characters. Subfolder tiles hide while filtered. Empty result: "No links with these tags" / "Nothing you saved has all of the selected tags." (with clear button).
- Entry points: tag chips in the sidebar/Tags page, tag chips on cards (other area), saved views, Ask search, inline search tag results (other areas).
- Screens / routes: SCR-TAG-07 (inside the feed).
- Limits: 5 tags per filter.
- Source: `features/tags/utils/tag-filter.ts`, `library.page.html` (library__filter), `library-filter.service.ts`.

#### TAG-09 Phone Tags tab
- What it does: `/tags` shows the tags section as a page: heading "Tags" (page title, larger chips), "+", all features of TAG-01..TAG-07. Empty: page empty state "No tags yet" / "Tags group links across folders. Add one here, or while you save a link." / button "New tag". From 64em the page redirects to `/links`.
- Entry points: phone tab bar "Tags" (while Ask is off).
- Screens / routes: SCR-TAG-06.
- Platforms: compact only.
- Source: `features/tags/pages/tags-page/*`.

#### TAG-10 Tags on the phone Library page while Ask is on
- What it does: When the "Ask" tab replaces "Tags" in the phone tab bar, the tags section is shown at the bottom of the Library page.
- Source: `phone-library.page.html` (askTab).

#### TAG-11 Tags elsewhere (entry only)
- What it does: Tag input in Add/Edit link (create, autocomplete with counts), Bulk "Tags" dialog (add to all / remove from all; other area), rule tags (RUL-02), Library cleanup "Similar tags" merges (other area), AI tag suggestions (other area). Tags have no colours.
- Source: references only.

#### RUL-01 Domain rules list (Settings › Library › Rules)
- What it does: Section "Rules" with intro "Links from a domain go to a folder and get tags when you save them. A folder or tags you choose yourself always win." and button "Add rule". List "Rules": each row shows a letter favicon and the domain; the target folder (tile + name) or, if its folder is in Trash, "Folder in Trash: only tags are added"; the rule's tags as chips; a "…" button "Actions for {domain}" (tooltip "More actions"). Sorted by domain.
- Entry points: Settings › Library.
- Screens / routes: SCR-RUL-01 (`/settings/library`).
- States: not loaded: nothing; load error: notice "Couldn't load the rules." + "Try again"; empty: "No rules yet. For example, links from youtube.com can go to Videos with the tag video."; at limit: "Add rule" disabled and line "You can have up to {max} rules. Delete one first."
- Data: Rule (id, domain, folderId, folderAvailable, tags, createdAt). `GET /api/rules`.
- Limits: 50 rules.
- Source: `features/rules/components/rules-section/*`, `utils/rule-rows.ts`, `stores/rules.store.ts`.

#### RUL-02 Add a rule
- What it does: Dialog "Add rule": Domain, Folder (picker list with "No folder", recent folders, search) and Tags (up to 5). The domain is shown as stored once the field is left (e.g. `https://www.youtube.com/watch?v=1` → `youtube.com`). Needs a folder or at least one tag. "Save rule" waits ("Saving…"); on success the dialog closes and toast "Rule added" (detail "{domain}: {folder, #tag…}").
- Entry points: "Add rule" (Settings); link card/row menu "Create a rule for {domain}…" (RUL-06); rule offer "Create rule" (RUL-10, saves without dialog).
- Screens / routes: SCR-RUL-03.
- States (dialog notices): "Choose a folder or add at least one tag."; "There is a rule for this domain already."; "You can have up to {max} rules. Delete one first."; "This folder is gone. Choose another one."; "This rule was deleted meanwhile."; "Couldn't save the rule. Try again." At limit from a link menu: danger toast "Rules are full" / "You can have up to {max} rules. Delete one first." (no dialog).
- Data: `POST /api/rules` {domain, folderId?, tags?}. Domain normalized: lower case, IDN → punycode, leading `www.` and trailing dot dropped; IP addresses and single labels refused.
- Limits: 50 rules; 5 tags per rule; domain ≤253 (input ≤2048); one rule per domain.
- Source: `components/rule-dialog/*`, `services/rule-form.service.ts`, `services/rule-actions.service.ts` (create), contracts `normalize-rule-domain.ts`.

#### RUL-03 Edit a rule
- What it does: Same dialog titled "Edit rule", filled with the rule. If the folder is in Trash the folder starts empty with notice "The folder of this rule is in Trash. Choose another one or keep only the tags." Success toast "Rule saved" (detail described rule).
- Entry points: rule row menu › "Edit"; "Create a rule for {domain}…" when a rule for that domain exists opens Edit instead.
- Data: `PATCH /api/rules/:id`.
- Source: `rule-actions.service.ts` (edit).

#### RUL-04 Delete a rule
- What it does: Rule disappears at once; Undo toast "Rule deleted" (detail domain, "Undo"); the delete is sent when the toast window ends; failure puts it back with toast "Couldn't delete the rule". No confirmation.
- Entry points: rule row menu › "Delete rule".
- Data: `DELETE /api/rules/:id` (404 counts as done).
- Source: `rule-actions.service.ts` (delete, commitDelete).

#### RUL-05 Apply a rule to existing links
- What it does: Finds the user's live links in Unsorted whose host matches (newest first, up to 100 per run). None: info toast "No links from {domain} in Unsorted". Else confirmation "Apply the rule for {domain}?" / "{count} link(s) in Unsorted get(s) the folder and tags of this rule: {target}." (+ "There are {total} in all. Apply it again for the rest." when more than 100) / "Apply to {count} link(s)" / "Cancel". Applies via bulk update (folder and add tags). Success toast "Rule applied to {count} link(s)" (detail described rule) with "Undo" (puts them back in Unsorted and takes off only tags they did not have before). Failure toasts "Couldn't apply the rule", "Couldn't undo the rule".
- Entry points: rule row menu › "Apply to existing links"; after a rule offer's creation toast "Apply to Unsorted".
- Screens / routes: SCR-RUL-04.
- Data: `GET /api/rules/:id/matches`; `PATCH /api/links/batch` (bulk update).
- Limits: 100 links per run.
- Source: `rule-actions.service.ts` (applyToExisting), `services/rule-apply.service.ts`, `utils/rule-undo-groups.ts`.

#### RUL-06 Create a rule from a link
- What it does: Link card and row menu item "Create a rule for {domain}…" (shown only when the link's URL has a rule-able domain) opens Add rule prefilled with the domain (or Edit if a rule exists).
- Entry points: link card/row "…" menu (second-last item, before "Delete").
- Source: `link-card.component.html`, `rule-actions.service.ts` (create(url)).

#### RUL-07 Rule applied in the save form
- What it does: In Add link (and the share page / Web Share target), when the URL matches a rule (longest matching domain wins; subdomains match), its folder and tags go into the form at once unless the user chose them; a chip "Rule: {domain} → {target}" says so (target "Folder, #tag"); its remove "Don't apply the rule for {domain}" takes them out again. The form saves exactly what it shows.
- Entry points: Add link dialog (other area).
- Source: `services/rule-suggestion.service.ts`, `utils/rule-suggestion.ts`, `utils/rule-chip-target.ts`.

#### RUL-08 Rules in "Paste many"
- What it does: Each pasted line matching a rule gets a chip with the rule's folder and tags; a chip can be removed per line; checkbox "Apply domain rules" (shown only when some line matches) turns rules off for the batch. The rule folder wins over the default folder unless the user chose the "folder for all"; rule tags apply only when no "tags for all".
- Source: `services/batch-rule.service.ts`.

#### RUL-09 Rules applied on save by the server / extension
- What it does: The API applies the matching rule on save unless the client already applied it (`applyRules: false`). The browser extension popup matches rules itself for the current page and sends `applyRules` for batches of tabs.
- Source: `apps/extension/src/app/popup/popup.store.ts`, `to-batch-request.ts`.

#### RUL-10 Rule offer (AI)
- What it does: Only while AI is on. After the user files links (Tidy, move, edit, save into a chosen folder), the server checks whether the newest 3+ links of one site (up to 5 sites, 20 candidates each) share one folder and none was filed by AI. If so, a sticky toast (folder tile) "Always put {domain} links in {folder}?" / "Your last {count} link(s) from this site is/are there. A rule works without AI." with "Create rule" and "Not now". The offer waits until the filing's Undo toast closes (if undone, those links do not count); only one offer at a time. "Create rule" saves the rule (folder only), then toast "Rule created" (detail described rule) with "Apply to Unsorted". Failure: "Couldn’t create the rule". "Not now" or closing the toast is remembered on the server for that domain (up to 500 domains kept); a domain is not offered again in the session after any answer.
- Data: `POST /api/rules/offers/check` {linkIds}; `POST /api/rules/offers/dismiss` {domain}.
- Source: `services/rule-offer.service.ts`, `apps/api/src/rules/offers/*`.

#### RUL-11 Rule whose folder is in Trash
- What it does: While the target folder is in Trash, the rule only adds its tags (`folderAvailable: false`); the Settings row says "Folder in Trash: only tags are added"; editing asks for another folder. If the folder is deleted for good, folderId becomes null.
- Source: `rule-rows.ts`, `rule-form.service.ts`.

#### TRS-01 Trash page
- What it does: `/trash` lists what was deleted and waits for its retention: header "Trash" with count line "{n} item(s), kept for {days} days" (or "Nothing here"), "Empty trash" button (desktop, when not empty); filter chips; entries as rows in one group "Recently deleted", newest first; footer "Items are deleted for good after {days} days. Restore puts a link back in its folder, or in Unsorted if the folder is gone." Opening the page first sends link deletes still in their Undo window, so the just-deleted link is listed.
- Entry points: desktop sidebar footer row "Trash" (with count when not empty, under a divider); phone Library tile "Trash"; Settings › Library › Trash › "Open Trash".
- Screens / routes: SCR-TRS-01.
- Platforms: desktop; compact adds a top bar with back button "Library" and "Empty" (when not empty), and the swipe hint "Swipe left to restore or delete for good. Long-press to select several."
- States: loading: row skeleton (5) labelled "Loading Trash"; load error: "Couldn't load Trash" / "Check your connection and try again." / "Try again"; empty: "Trash is empty" / "Deleted links and folders wait here for {days} days, so nothing is gone by accident."
- Data: TrashItem (kind link|folder, id, title, url, faviconUrl, imageUrl, fromFolderName, linkCount, deletedAt, expiresAt); `GET /api/trash` (newest 500 entries, total, retentionDays). A folder entry stands for its whole subtree (subfolders and links deleted with it are not listed separately).
- Limits: list shows at most 500 entries (total counts all).
- Source: `features/trash/trash.page.*`, `stores/trash.store.ts`, `apps/api/src/trash/trash.service.ts`.

#### TRS-02 Filter Trash by kind
- What it does: Segmented control "Show": "All {count}", "Links {count}", "Folders {count}". Empty result: "Nothing of this kind in Trash" / "Show everything to see what else is waiting here." / "Show all".
- Source: `trash.page.ts` (filterOptions), `models/trash-filter.const.ts`.

#### TRS-03 Restore
- What it does: Puts entries back: a link into its folder if that folder is live, else Unsorted; a folder with its subfolders and the links deleted with it, at the top level if its parent is not live. Optimistic (entries leave the list at once); on success the feed, folder tree, counts, tags and reminders refresh; toast "Restored" (detail: the title, or "{count} item(s) is/are back"). Failure: entries return, toast "Couldn't restore" / "Nothing was changed." (A "library is full" variant exists: "Couldn't restore" / "Your library is full. Delete something and try again.")
- Entry points: row "Restore" button (desktop); swipe action "Restore" (phone); selection bar "Restore".
- Data: `POST /api/trash/restore` {items:[{kind,id}]} in batches of 100.
- Source: `services/trash-actions.service.ts` (restore), `trash.store.ts` (mutate), API restoreLink/restoreFolder.

#### TRS-04 Delete forever
- What it does: Confirmation "Delete forever?" with message: link "“{title}” will be deleted for good. This can’t be undone."; folder "The folder “{title}” and its {n links} will be deleted for good. This can’t be undone."; several "{n items} will be deleted for good. This can’t be undone." / "Delete forever" (danger) / "Cancel". Optimistic removal; toast "Deleted for good" (detail title or "{count} item(s) deleted for good"); failure: back in the list, toast "Couldn't delete" / "It is back in Trash."
- Entry points: desktop row "…" menu › "Delete forever"; phone swipe "Delete"; selection bar "Delete forever".
- Data: `POST /api/trash/delete` {items} (batches of 100). A link deleted on its own earlier inside a deleted folder stays as its own entry (loses the folder).
- Source: `trash-actions.service.ts` (deleteForever).

#### TRS-05 Empty trash
- What it does: Confirmation "Empty trash?" with message "{n items} will be deleted for good. This can’t be undone." or, with folder entries, "…, including the folder “{name}” and its {n links}. …" / "…, including {n folders} and their {n links}. …" / button "Delete {count} item(s)" (danger) / "Cancel". Optimistic; toast "Trash emptied"; failure: toast "Couldn't empty Trash" / "Nothing was deleted."
- Entry points: "Empty trash" (desktop header); "Empty" (compact top bar).
- Data: `DELETE /api/trash`.
- Source: `trash-actions.service.ts` (empty).

#### TRS-06 Select several entries
- What it does: Desktop: a checkbox before every row ("Select {title}") and "Select all" (checked when all visible are selected, indeterminate when some). Phone: a long press on a row starts selecting; then rows show checkboxes and a tap toggles. With at least one selected, a toolbar "Actions for selected items" shows "{n} selected", "Restore", "Delete forever" and a close button "Clear selection". Entries that leave Trash drop out of the selection.
- Source: `trash.page.ts`, `components/trash-row/*`.

#### TRS-07 Phone swipe actions
- What it does: On compact screens a row swiped left reveals "Restore" and "Delete" (danger). The buttons are always in the DOM; focusing one slides the row aside (keyboard/screen reader). A tap on a row toggles the reveal. Row description "Shows Restore and Delete" (while not selecting) or "Selects this entry".
- Source: `trash-row.component.*` (SwipeReveal).

#### TRS-08 Trash entry row
- What it does: Each row: preview (link image, else site letter; folder tile for folders), title, meta "From {folder}" / "From Unsorted" (links without folder), "{n} links" for folders, "Deleted {relative time}", and a badge "{n} day(s) left" or "Less than a day left" (warning tone at 3 days or fewer).
- Source: `trash-row.component.html`, `utils/trash-days-left.ts`.

#### TRS-09 Trash retention (Settings › Library › Trash)
- What it does: "Keep deleted items for" (hint "Then they’re removed for good"): segmented 7 / 30 / 90 days ("{count} days"), default 30, saved at once. Choosing a shorter value asks first when entries in Trash are older than it: "Shorten how long Trash keeps items?" / "{count} item(s) in Trash is/are older than {days} days and will be deleted for good tonight." / "Keep for {days} days" (danger) / "Cancel"; cancelling puts the control back. Failure toast "Couldn't save the setting" / "It is back to {days} days." Load failure notice "Couldn't load the setting." with "Try again". A second row "Trash" shows "{n} item(s)" or "Nothing in Trash" and "Open Trash".
- Screens / routes: SCR-TRS-07 (confirmation), Settings › Library (other area for the page).
- Data: user settings trashRetentionDays; `PATCH /api/me/settings`.
- Source: `features/settings/pages/library/library.page.*`.

#### TRS-10 Nightly purge
- What it does: A daily job (03:47 UTC) deletes entries older than the account's retention. Overdue entries (0 days left) are removed at the next run.
- Source: `apps/api/src/trash/trash-cleanup.*`, `vercel.json` crons.

#### TRS-11 What goes to Trash (entry only)
- What it does: Link delete (card/row menu, bulk delete, Edit link delete; 8 s Undo then "Moved to Trash"), folder delete (ORG-13), duplicate cleanup, import undo. Trashed links keep their reminder (hidden). Account deletion and demo cleanup delete for good without Trash.
- Source: references.

#### REM-01 Set a reminder ("Remind me")
- What it does: Opens the "Remind me" dialog (bottom sheet below 40em) with the link title as subtitle. Quick choices (each with its time hint) act at once: "Later today" (18:00, offered until 17:00), "Tomorrow" (9:00), "This weekend" (Saturday 10:00, Monday–Friday only), "Next week" (Monday 9:00; from a Sunday the Monday after tomorrow), "In a month" (same day next month, 9:00), then "Pick date and time…". Footer note "Times are in your time zone, {zone}." Success toast "Reminder set for {when}" (detail link title). Failure toast "Couldn't save the reminder" with "Retry". One reminder per link; a new one replaces the old.
- Entry points: link card/row menu "Remind me…" ("Change reminder…" when set); Edit link reminder line "Remind me" / "Change"; bulk bar "Remind"; Ask sources "Remind me"; Rediscover "Remind me" (other areas).
- Screens / routes: SCR-REM-03.
- Data: `PUT /api/reminders/:linkId` {remindAt}; LinkResponse.remindAt.
- Limits: must be in the future (1 min clock tolerance), at most 1830 days ahead.
- Source: `features/reminders/components/remind-dialog/*`, `services/reminder-actions.service.ts`, `utils/remind-presets.ts`.

#### REM-02 Pick date and time
- What it does: "Pick date and time…" replaces the presets with a calendar (from today; week start and names follow locale settings; "Previous month" / "Next month") and a Time field (hint "Optional; 9:00 when left empty"), preselecting today. A past time shows warning "This time has already passed. Pick a later one." The primary button reads "Remind me {when}" or "Pick a day" (disabled) when nothing valid is picked.
- Screens / routes: SCR-REM-04.
- Source: `remind-dialog.component.*`, `utils/compose-remind-at.ts`.

#### REM-03 Remove a reminder
- What it does: The dialog for a link with a reminder shows "Current reminder: {when}" and a footer button "Remove reminder". Toast "Reminder removed" ("{count} reminders removed" for several).
- Data: `DELETE /api/reminders/:linkId` or batch with null.
- Source: `remind-dialog.component.html`, `reminder-actions.service.ts`.

#### REM-04 Reminder for several links
- What it does: Bulk bar "Remind" opens the dialog titled "Remind me about {count} link(s)" (no subtitle, no current/remove).
- Data: `POST /api/reminders/batch` {ids, remindAt|null} (max 100 ids).
- Source: `library-bulk.service.ts`, `reminder-actions.service.ts`.

#### REM-05 Reminders page
- What it does: `/reminders` lists due links first ("Due") and upcoming ones by local day: "Today", "Tomorrow", "This week" (next 7 days), "Later"; empty sections are left out; soonest first. Header "Reminders" with "{n} reminder(s) is/are due" or "Nothing is due right now". A reminder whose time passes while the page is open moves to Due on the next action. Footer "Reminders show here, on the sidebar badge and on the card. They are not sent by email or notification." Each row opens its link.
- Entry points: desktop sidebar fixed row "Reminders" (bell, count of due); phone Library tile "Reminders" ("{n} due"); due toast "Show".
- Screens / routes: SCR-REM-01.
- Platforms: compact adds a back button "Library".
- States: loading: skeleton (4) "Loading reminders"; error: "Couldn't load your reminders" / "Check your connection and try again." / "Try again"; empty: "No reminders yet" / "Choose “Remind me” in the menu of a link, and it comes back here on the day you pick."
- Data: `GET /api/reminders` {due, upcoming} (each max 200).
- Limits: 200 per group.
- Source: `features/reminders/reminders.page.*`, `utils/reminder-sections.ts`, `stores/reminders.store.ts`.

#### REM-06 Done
- What it does: Row button "Done" clears the reminder (toast "Reminder removed").
- Source: `reminder-row.component.html`, `reminder-actions.service.ts` (done).

#### REM-07 Snooze
- What it does: Row button "Snooze" opens a menu of the presets (with their time) and, after a separator, "Pick date and time…" (opens the full dialog). Toast "Reminder set for {when}".
- Source: `reminder-row.component.html`, `reminder-actions.service.ts` (snooze).

#### REM-08 Reminder chip on cards, rows and Reminders rows
- What it does: Links with a reminder show a bell badge: upcoming in accent tone with the time ("Today, 18:00", "Tomorrow, 9:00", weekday within the week, else "1 Dec, 9:00" with year if not this year); due in warning (amber) tone "Due {relative}".
- Source: `services/reminder-format.service.ts`, link card/row (other area).

#### REM-09 Due count
- What it does: The sidebar "Reminders" row shows the number of due links (regardless of "Show folder counts"); the phone Library tile shows "{n} due". Loaded at app start.
- Data: `GET /api/reminders/count`.
- Source: `sidebar.component.ts` (fixedNodes), `phone-library.page.ts`.

#### REM-10 Due toast on app open
- What it does: Once per session at app open, if reminders became due since the last announced one on this device, a warning toast "A reminder is due" / "{count} reminders are due" (detail: title when one) with "Show" (opens `/reminders`). The latest announced due time is kept per user in localStorage (cleared at sign-out). Nothing runs in the background; no push or email.
- Source: `services/reminder-notice.service.ts`, `shell/app-shell.component.ts`.

#### REM-11 Reminders and Trash
- What it does: Trashed links keep their reminder but leave the list and count; restoring brings it back (reminders reload after restore).
- Source: `trash.store.ts` (refreshLibrary), PROJECT.md story 32.

### 3.3 Search and AI

Scope: search (⌘K dialog, header search field, phone Search tab, results), every AI feature (Settings › AI, intro and announcement, suggestions, Automatic mode, Fill in with AI, summaries, search by meaning, related links, Ask your shelf, Tidy Unsorted, Process existing links, usage and quotas, Delete AI data, library clean-up), connecting external assistants (MCP), and the matching API (`apps/api/src/ai`, `cleanup`, `mcp`, word search in `links`) and contracts.

Breakpoints used below: phone below 40em; tablet 40–64em; desktop from 64em; "wide" from 80em. The mobile shell (tab bar, no header, no sidebar) is everything below 64em ("compact").

#### SRC-01 Start a search (shortcut, header field, header button, Search tab)
- What it does: opens search from anywhere in the signed-in app. Shelf (block 3): from 64em the header holds a search field that filters the library feed in place (SRC-07); below 64em (no header) the top bar field and the "Search" tab open the full-screen search over the current page (the tab is not a route). Cmd/Ctrl+K focuses the header field, or opens the full-screen search below 64em; a desktop page without the field (Settings) opens the command dialog.
- Entry points:
  - Keyboard: Cmd+K (Apple devices) / Ctrl+K (others), global, also while typing in a text field. On non-Latin keyboard layouts the physical K key counts. Ignored with Alt or Shift held, during IME composition, and for key events without a key (autofill). The browser's own use of the shortcut is prevented.
  - From 80em the shortcut focuses the header field instead of opening a dialog.
  - Header button (64–80em): secondary button with search icon, label "Search" and a key cap "⌘K" (Apple) or "Ctrl K" (others), `aria-haspopup="dialog"`.
  - Phone/tablet tab bar: tab "Search" (search icon).
  - Nothing opens while any dialog is already open (the search dialog included).
  - Settings pages show neither the header field nor the button ("Settings pages have nothing to search").
- Screens / routes: SCR-SRC-01 (dialog), SCR-SRC-02 (header field + panel). No route; the URL does not change.
- Platforms: desktop ≥80em inline field; desktop 64–80em button + dialog; tablet and phone: Search tab + dialog (dialog is full screen below 40em, a glass command dialog from 40em).
- States: signed-in only (the shell is behind auth).
- Data: none by itself.
- Settings that change it: none.
- Feedback: dialog gets focus in the search field on open.
- Limits: none.
- Related: SRC-02…SRC-09; Keyboard shortcuts list (other area).
- Source: `features/search/services/search-dialog.service.ts`, `search-field.service.ts`, `components/header-search/*`, `shell/app-shell.component.{ts,html}`, `models/search-shortcut-*.const.ts`.

#### SRC-02 Word search of links
- What it does: as the user types, searches the user's links (all folders, not trashed) by title, note and URL; every word must match (AND), case-insensitive, at most 5 words used, at most 200 characters. Shows up to 5 links, newest first; when more exist, a last row "Show all results for “{{query}}”" opens All links with `?q=` (the full result list, library area).
- Entry points: typing in the search field (dialog or header field).
- Screens / routes: SCR-SRC-01, SCR-SRC-02; "Show all results" → `/links?q=<query>`.
- Platforms: same on all sizes.
- States: idle hint, searching, failed, no results (see SRC-06). The previous results stay visible while a new answer loads.
- Data: `GET /api/links?q=<text>&limit=5` (LinkResponse: id, title, url, faviconUrl, folderId, note…). Text is trimmed, white space collapsed, cut to 5 words and 200 characters before sending. 250 ms pause after the last keystroke (0 ms when the text is emptied).
- Settings that change it: none. (The app search always matches notes; MCP and Ask match notes only with their own note setting.)
- Feedback: result count announced in a status region once results are final ("{{count}} result" / "{{count}} results").
- Limits: 5 link rows (`SEARCH_LINK_LIMIT`), 5 words (`SEARCH_TERMS_MAX`, API `LINK_LIMIT.QueryTermsMax`), 200 characters (`LINK_LIMIT.QueryMax`).
- Related: SRC-03, SRC-05, AI-08 (meaning matches), library `?q=` feed (other area).
- Source: `features/search/components/search-results/*`, `features/links/utils/search-query.ts`, `apps/api/src/links/link-where.ts`, `libs/shared/contracts/src/links/list-links-query.interface.ts`.

#### SRC-03 Folder and tag matches
- What it does: in the same results, a group "Folders and tags" lists folders whose full path ("Work / Angular") contains every word, and tags whose name contains every word; computed in the browser from the already loaded folders and tags (no request). Choosing a folder opens that folder; choosing a tag opens All links filtered by that tag.
- Entry points: typing; Enter/click on a row.
- Screens / routes: SCR-SRC-01/02 → `/folders/:id`, `/links?tag=<name>`.
- Platforms: all.
- States: hidden when nothing matches or the field is empty.
- Data: FoldersStore / TagsStore (loaded on open if needed): folder path, folder linkCount, tag name, tag linkCount.
- Settings that change it: none.
- Feedback: navigation; in the header field the text is cleared after navigation; the dialog closes.
- Limits: at most 5 folders and 5 tags (`SEARCH_LOCAL_LIMIT`).
- Related: SRC-02.
- Source: `features/search/utils/search-match.ts`, `search-results.component.*`.

#### SRC-04 Keyboard navigation and opening results
- What it does: the results are a combobox + listbox (focus stays in the field). Up/Down move through all rows of all groups and wrap around; Home/End jump to first/last; Enter chooses; Ctrl+Enter or Cmd+Enter opens a link in a background tab (the search stays open); a click also chooses. Choosing a link opens it in a new tab (records the open like a feed open) and closes the dialog; with the background modifier the dialog stays.
- Entry points: keys in the search field; mouse/touch on rows.
- Screens / routes: SCR-SRC-01/02.
- Platforms: all (keys on keyboards only).
- States: —
- Data: records the open (`LinkActionsService.open`, history/Recently opened).
- Settings that change it: none (links from search always open in a new tab, regardless of "Open links in").
- Feedback: footer hints in the list: "↑ ↓ move", "↵ open", "Ctrl/⌘ ↵ open in background" (with screen-reader words "Up", "Down", "Enter", "Ctrl"/"Command").
- Limits: —
- Related: Shortcuts list rows "Move through search results", "Open the result", "Open it in a background tab".
- Source: `libs/ui/src/lib/components/command-list/command-list.component.ts`, `features/search/services/link-opener.service.ts`.

#### SRC-05 Result row details (highlight, site, folder, note match)
- What it does: each link row shows the favicon (or the site's first letter), the title with the query words highlighted, and a meta line: host, "in {{folder}}" when the link is in a folder, and "note matches:" followed by the note with the words highlighted when the note is part of why it matched (the title alone does not contain every word and the note contains at least one).
- Entry points: —
- Screens / routes: SCR-SRC-01/02.
- Platforms: all.
- States: —
- Data: link title, url (host), faviconUrl, folderId → folder name, note.
- Settings that change it: none.
- Feedback: —
- Limits: —
- Related: SRC-02.
- Source: `search-results.component.{html,ts}`.

#### SRC-06 Search states: hint, searching, failed, nothing found
- What it does: while there are no rows, the list shows an empty block with a search icon:
  - empty field: title "Search your shelf", text "Titles, notes, tags and sites show up as you type."
  - waiting for the answer: "Searching…"
  - request failed: "Couldn't search. Try again."
  - nothing found: title "Nothing found for “{{query}}”" (shared library key), text "Try another word. Search looks through titles, notes, tags and sites."
- Entry points: —
- Screens / routes: SCR-SRC-01/02.
- Platforms: all.
- States: as listed; when search by meaning finds links but no word matches, the meaning group shows with the lead "No links with these words" instead of the empty block (AI-08).
- Data: —
- Settings that change it: none.
- Feedback: status region announces the count only when final.
- Limits: —
- Related: AI-08.
- Source: `search-results.component.html`.

#### SRC-07 Inline header search with results panel (from 80em)
- What it does: Shelf (block 3, replaces the results panel): from 64em the header field puts its text in the feed's `?q=` after a short pause (in the current feed on All links, Unsorted, Favorites or a folder, else All links), and the feed shows "Search" with the count, "Looks like a question" with Ask your shelf (Ask on), "Go to" chips (folders, tags, saved views whose names hold every word), the word matches with the words marked, "Close in meaning · N" (search by meaning) and, with nothing at all, "Nothing found" with Clear search and Ask your shelf. Focus in the empty field lists "Recent searches" (last five, this device). Enter moves to the first result, Esc clears the field.
- Entry points: click in the field; Cmd/Ctrl+K focuses it.
- Screens / routes: SCR-SRC-02.
- Platforms: desktop ≥80em only.
- States: as SRC-06.
- Data: as SRC-02.
- Settings that change it: none.
- Feedback: —
- Limits: —
- Related: SRC-01.
- Source: `components/header-search/*`, `command-list` popup mode.

#### SRC-08 "Ask your shelf" row in search
- What it does: while Ask your shelf is on (AI-10) and the text has at least 3 characters, the last group "Ask your shelf" holds one row with the spark: desktop/tablet with header (from 64em) "Ask your shelf: “{{query}}”", mobile shell (below 64em) "Ask your shelf about this". Choosing it hands the text to Ask: from 64em the Ask panel opens (or the open one gets the question) and asks it at once; below 64em the dialog closes and the full-screen Ask page opens and asks it. In the header field the text is cleared.
- Entry points: Enter/click on the row.
- Screens / routes: SCR-SRC-01/02 → Ask panel (SCR-AI-07) or `/ask` (SCR-AI-08).
- Platforms: wording differs below 64em.
- States: hidden with AI off, Ask off, or fewer than 3 characters. A question handed over while another question is streaming is dropped (never asked later).
- Data: none here (the question goes in memory, `AskInbox`).
- Settings that change it: Settings › AI main switch and "Ask your shelf" switch.
- Feedback: —
- Limits: question 3–500 characters (longer text is not asked).
- Related: AI-10.
- Source: `search-results.component.*`, `search-dialog.component.ts`, `features/ai/services/ask-inbox.service.ts`.

#### SRC-09 Reminder to process older links (in search)
- What it does: in the results' note area (below the lists, never a selectable row), while AI and search by meaning are on and the account has older links "Process existing links" would take (AI-12), a line with the spark: "AI hasn’t read {{count}} older link yet — search finds it less well." / "AI hasn’t read {{count}} older links yet — search finds them less well." with a "Process" button and an × "Hide" icon button. Process starts processing (as in Settings › AI), the line reads "Processing started" for 2 s and goes away. Hide hides it for good on this device (cleared at sign-out).
- Entry points: shown when the field has text.
- Screens / routes: SCR-SRC-01/02.
- Platforms: all; header panel: Tab moves from the field to Process.
- States: Process shows a loading state while starting; a refusal shows the toast "Couldn’t start processing your links".
- Data: `POST /api/ai/backfill`; localStorage key for the hidden state.
- Settings that change it: AI main switch, Search by meaning switch.
- Feedback: "Processing started" is a status region (read out).
- Limits: count = eligible older links up to the remaining one-time allowance; 0 hides it.
- Related: AI-12.
- Source: `features/search/components/backfill-reminder/*`, `services/backfill-reminder.service.ts`.

#### AI-01 AI main switch and Settings › AI
- What it does: AI is off by default (opt-in, per account). "Use AI in Shelfmark" on Settings › AI turns it on or off. Off means no link data goes to a model provider and nothing AI shows anywhere (AI-21). Turning it on the first time opens the AI intro (AI-02); the intro's "Turn on AI" saves. While on, the page shows folder and tag modes, Summaries, Search by meaning, Ask your shelf, "What is sent" (notes, summary language) and "This month" (usage, Process existing links). "Your AI data" (delete, privacy link) shows once the settings are loaded, AI on or off; "Connect your assistant" (MCP) always comes last. Every choice saves at once (optimistic) and rolls back with a toast on failure. Turning AI off on the server skips queued jobs, stops a running "Process existing links" and cancels open batches; what was generated stays.
- Entry points: desktop settings nav "AI" (between Library and Language); phone You › "AI"; the AI announcement's "Turn on AI…" (AI-03); links from the intro and Privacy and data (`/settings/ai#ai-data`).
- Screens / routes: SCR-AI-01 `/settings/ai`; SCR-AI-02 `/settings/ai/folder`, `/settings/ai/tags` (phone mode pages).
- Platforms: desktop segmented controls for modes; phone a row per mode with the current mode that opens a full-label page. Summaries hint is hidden on phones.
- States: loading (switch disabled until loaded); load failed: danger notice "Couldn’t load your AI settings." with "Try again"; provider down while on: AI line "AI isn’t responding right now. Your links save as usual; suggestions and summaries catch up when it’s back." at the top.
- Data: `GET /api/ai/settings`, `PATCH /api/ai/settings` (AiSettings: enabled, folderMode, tagsMode, summaries, includeNotes, summaryLanguage, meaningSearch, ask; plus announcementSeen). Response also: introSeen, announcementSeen, entitlements {plan, aiTier}, usage, providerStatus, pendingJobs, backfill, search, ask {available, allowance}.
- Settings that change it: this is the settings page.
- Feedback: failed save toast "Couldn’t save your AI settings" / "The change was undone. Try again."; the control returns to the saved value.
- Limits: `AiWrite` rate limit 60/min.
- Related: AI-02, AI-04…AI-16, MCP-01.
- Source: `features/settings/pages/ai/*`, `pages/ai-mode/*`, `features/ai/services/ai-settings.store.ts`, `ai-settings-actions.service.ts`, `apps/api/src/ai/ai.controller.ts`, `settings/ai-settings.service.ts`, contracts `ai-settings*.ts`.

#### AI-02 First-run AI intro (consent dialog)
- What it does: opens the first time AI is turned on (until the server marks the intro seen). Explains what AI does and what is sent; "Turn on AI" saves `enabled: true` (all features at their defaults) and marks the intro seen; "Not now", × , Esc or the scrim close and leave AI off. A failed save keeps the dialog open with a danger notice "Couldn’t turn on AI. Try again.". When the account has older links to process (AI-12), turning on does not close: the same dialog shows a second step "AI is on. Process your {{count}} saved link(s)?" (SCR-AI-04).
- Entry points: Settings › AI main switch (first time); the AI announcement's "Turn on AI…".
- Screens / routes: SCR-AI-03, SCR-AI-04 (dialog; bottom sheet on phone).
- Platforms: phone uses the short title "Turn on AI?" and full-width stacked buttons, larger close button.
- States: saving (Turn on AI loading); failed (notice).
- Data: `PATCH /api/ai/settings {enabled:true}`; step 2 `POST /api/ai/backfill`.
- Settings that change it: —
- Feedback: focus moves to the step-2 heading so it is read out.
- Limits: —
- Related: AI-01, AI-03, AI-12.
- Source: `features/ai/components/ai-intro-dialog/*`.

#### AI-03 One-time AI announcement
- What it does: a dialog "Shelfmark can now help with AI" shown once per account, only while AI is available (settings loaded, provider not down) and still off, never to demo users, never in the first session of a new account (welcome tour), never together with "What's new" or the welcome dialog; it waits 2 s after the shell is up and retries every 5 s while another dialog, a focused field or a hidden tab is in the way. Marked seen on the server as it opens. "Turn on AI…" closes and opens the AI intro (AI-02); "Not now", ×, Esc and the scrim close.
- Entry points: automatic.
- Screens / routes: SCR-AI-05 (dialog; bottom sheet on phone).
- Platforms: all; entrance animation stands still with reduced motion.
- States: —
- Data: `PATCH /api/ai/settings {announcementSeen:true}`.
- Settings that change it: AI main switch (on → never shown).
- Feedback: —
- Limits: once per account.
- Related: AI-02.
- Source: `features/ai/services/ai-announcement.service.ts`, `components/ai-announce-dialog/*`, `models/ai-announcement-delay.const.ts`.

#### AI-04 Tag and folder suggestions (Suggest mode)
- What it does: in Add link, once the page preview of an address has loaded, a background draft job asks AI for suggestions; in Edit link the saved link's open suggestions load. Under the Folder field a row of dashed chips suggests one of the user's own folders; under the Tags field a row suggests up to 3 of the user's existing tags plus up to 2 marked "New" tags (and up to 3 extra new-tag ideas shown only as chips). Tap a chip to apply it (it flashes solid, then the value goes into the field); × dismisses it; "Add all" applies the whole tags row. When the user has already chosen a folder, the folder row label changes from "Suggested" to "Also fits" (nothing is applied for them). Tags already in the field are not offered. While the draft runs: skeleton chips with "Suggesting…". Nothing when AI is off, the mode is Off, nothing fits, or the provider failed silently (rejected).
- Entry points: Add link dialog/sheet (after preview), Edit link dialog/sheet.
- Screens / routes: SCR-AI-13 (regions of Add/Edit link, links area).
- Platforms: same chips on phone sheet.
- States: loading skeleton; monthly limit (AI line "Suggestions are paused until {{date}}. You used this month’s {{limit}} links." with "AI settings" which closes the dialog unsaved and opens Settings › AI); provider unavailable (AI line "Suggestions aren’t available right now. Your link saves as usual." with "Try again" once); AI off: nothing. Add link waits at most 8 s for the draft; the save never waits.
- Data: `POST /api/ai/drafts {draftId,url,title?,description?,note?}`, `GET /api/ai/jobs/:id` (polled every 1 s), save sends `aiDraftId`; Edit: `GET /api/links/:id/ai` (LinkAiState: aiStatus, reason, summary, summarySource, suggestions [id, kind folder|tag|new-tag, state suggested|auto-applied, tagName, folderId, more], autoApplied); dismiss on a saved link `POST /api/ai/suggestions/:id/dismiss` (draft chips are hidden only locally). Model input: URL, page title, description, a page-text excerpt (fetched through the SSRF-safe fetcher only while "Fetch titles and previews" is on, up to 6,000 characters; YouTube via oEmbed), the names of the user's tags and folders, the note only with "Include my notes", and earlier choices for the same site as examples.
- Settings that change it: AI main switch; Folder mode / Tags mode (Off hides the row); Include my notes.
- Feedback: live announcements "Tag {{name}} added", "Folder {{name}} chosen", "Suggested tags added"; chip accessible names "Add tag {{name}}", "Create and add tag {{name}}", "Move to {{name}}", "Dismiss suggestion {{name}}".
- Limits: each draft or save job counts 1 link against the monthly limit (AI-13); max 20 open drafts in 24 h (`AI_DRAFT_LIMIT`), beyond that the save enqueues a normal job; 3 existing tags + 2 new + 3 more ideas; `AiDraft` 30/min.
- Related: AI-05, AI-06, AI-07, AI-11, AI-18.
- Source: `features/links/services/add-link-ai.service.ts`, `components/add-link-ai/*`, `features/ai/services/ai-draft.service.ts`, `ai-link-state.service.ts`, `components/suggestion-rows/*`, `apps/api/src/ai/runner/*`, `excerpt/*`, contracts `link-suggestion.interface.ts`, `ai-limit.const.ts`.

#### AI-05 Automatic mode (apply when I don't choose) with Undo
- What it does: per part (Folder, Tags) the mode can be "Automatic" (full label "Apply automatically when I don’t choose"). Folder: applied only when the link is left in Unsorted; tags: only when the user added no tags. A folder or tags the user picked are never changed. After a save, the app follows the job for up to 10 s; when AI applied something, the feed gets the link as saved and a toast says "Moved to {{folder}} by AI" (folder tile in the toast) or "{{count}} tag added by AI"/"{{count}} tags added by AI", detail = link title, with Undo (8 s, Ctrl/⌘+Z). In Edit link, while the field still shows what AI applied, a badge with the spark "Moved by AI" or "{{count}} added by AI" sits under the field with "Undo" (accessible "Undo the move by AI" / "Undo the tags added by AI"). Backfill and rewrites never auto-apply.
- Entry points: save in Add link / Paste many / extension (server side); toast; Edit link.
- Screens / routes: SCR-AI-13; Settings › AI modes.
- Platforms: same.
- States: Undo failure toast "Couldn’t undo the AI change".
- Data: `POST /api/links/:id/ai/undo {part: folder|tags}`; LinkAiState.autoApplied.
- Settings that change it: Folder mode / Tags mode = Automatic.
- Feedback: toasts as above; Paste many batches get no per-link toasts (the feed reloads every 5 s for up to 30 s).
- Limits: —
- Related: AI-04, AI-01.
- Source: `features/ai/services/ai-follow-up.service.ts`, `components/ai-applied/*`, `features/links/services/add-link-ai-applied.service.ts`, `apps/api/src/ai/apply/ai-apply.service.ts`.

#### AI-06 Fill in with AI
- What it does: a button "Fill in with AI" (spark, AI style) in Add link and Edit link while AI is on fills in everything AI proposes in one click: all suggested tags (new ones too), the folder only when the user has not chosen one (Unsorted/empty is not a choice), AI's summary into an empty Summary field, and in Add link a cleaned-up title while the title is still the page's. The Note is never touched. In Add link the button is inactive (`aria-disabled`, focusable) with tooltip "Paste a link first" until the Link field holds a valid address. If the draft is still running, the button shows "Filling…" (busy) and Link, Folder, Tags and Summary are locked and Create link inactive until the draft arrives, is too slow, fails or finds nothing. A new address after a fill takes back what the fill put in and the user has not changed. Values filled are ordinary user data (no AI mark).
- Entry points: button; shortcut Alt+Shift+F (Option+Shift+F on Mac), shown in the tooltip as "⌥⇧F" / "Alt Shift F".
- Screens / routes: SCR-AI-13.
- Platforms: phone: full-width large button labelled "Fill" (accessible name "Fill in with AI"), no shortcut in tooltip.
- States: busy; nothing found → announcement "AI had nothing to fill in for this link"; success → "Filled in with AI’s suggestions".
- Data: uses the draft (AI-04).
- Settings that change it: AI main switch.
- Feedback: live region announcements as above.
- Limits: —
- Related: AI-04, AI-07.
- Source: `features/links/services/add-link-ai-fill.service.ts`, `components/add-link-ai/add-link-ai-fill.component.*`, shortcuts list row "Fill in with AI in the link dialog".

#### AI-07 Short summaries
- What it does: AI writes one or two sentences per link (one job with the suggestions). Cards show the summary in the note slot (two lines) when the link has no note (the user's note wins); list rows show it as the meta line (one line; the host moves to the tooltip). An AI summary carries a small spark whose accessible name and tooltip are "Generated by AI, may be inaccurate". Right after a save, while the job is pending and the link is younger than 10 s, skeleton lines with status "Writing a summary" stand in, then the text fades in. In Edit link a "Summary" field (2 rows, counter "characters") shows "Written by AI" (spark) or "Edited by you" under it, and "Rewrite" (spark, quiet AI button) while the text is AI's and untouched. Hints: AI text "{{disclaimer}}. Edit it and it becomes yours: AI never rewrites your text."; user text "Clear the field to let AI write it again."; empty "Leave it empty and AI writes one.". Any edit makes the summary the user's (never overwritten by AI). In Add link the field appears only after Fill in with AI put a summary in it.
- Entry points: cards, rows, Edit link, Add link (via Fill).
- Screens / routes: SCR-AI-13; feeds (links area).
- Platforms: same.
- States: pending skeleton; failed/skipped/off: nothing (as without AI). Existing summaries keep showing when AI is turned off (until Delete AI data).
- Data: LinkResponse summary, summarySource (ai|user), aiStatus; `POST /api/links/:id/ai/rewrite` (counts against monthly limit; refused 409 when AI off, summaries off, or the summary is the user's); update link `summary`.
- Settings that change it: Summaries switch; Summary language ("Match the app ({{language}})" or a specific interface language); Include my notes.
- Feedback: rewrite failure toast "Couldn’t rewrite the summary" / "Your summary is unchanged. Try again later."; validation "Keep the summary under {{max}} characters." (300).
- Limits: 300 characters (`AI_LIMIT.SummaryMax`); `AiRewrite` 10/min.
- Related: AI-04, AI-06.
- Source: `features/ai/components/link-summary/*`, `summary-field/*`, `features/links/services/add-link-summary.service.ts`, `links/components/link-card|link-row`.

#### AI-08 Search by meaning
- What it does: inside the normal search (dialog, header panel, phone Search tab), after the word matches, links close in meaning appear under a divider with the spark, "Related by meaning". Each row: favicon, title, host and a "why it matched" line with the spark (tooltip/name "Generated by AI, may be inaccurate"): "Close to: {{reasons}}" or "Close to: {{reasons}} (from the summary)" when every reason comes from the summary. Links already among word matches are left out. When no word matches: the group shows with the lead "No links with these words". The meaning request starts only after the word answer settled and the text stayed the same another 400 ms, and only for ≥3 characters. While fewer than 80% of links are ready (or this month's embeddings/search allowance is used), search is exactly word search and one muted AI line shows at most once per session: "Search by meaning is getting ready: {{ready}} of {{total}} links. Word matches work as usual.". Settings › AI has a "Search by meaning" switch with a readiness line ("{{ready}} of {{total}} links ready" / "Ready" / "Paused until {{date}}: this month’s limit").
- Entry points: search (SRC-01).
- Screens / routes: SCR-SRC-01/02; SCR-AI-01.
- Platforms: all.
- States: off (AI or switch off): nothing; processing/quota: the once-per-session line; unavailable: nothing (word search only); failure: no meaning rows.
- Data: `GET /api/ai/search?q=&limit=3` (MeaningSearchResponse {items: [{link, why:[{source tag|folder|summary, text}]}], status {state, ready, total}}); embeddings of title, tag names, summary (note only with Include my notes) sent to Voyage AI; query embedded and cached in memory 10 min; vectors stored per link (pgvector), deleted with the link.
- Settings that change it: AI main switch; "Search by meaning" switch (default on for new settings rows, off for rows that existed before AI-3); Include my notes (changes the text embedded).
- Feedback: —
- Limits: 3 meaning rows by default (max 10); query 3–200 characters; 2 reasons, 80 characters each; Free 2,000 embeddings and 1,000 search queries a month, AI pack 20,000 / 10,000; `AiSearch` 60/min.
- Related: SRC-02, AI-09, AI-10, AI-12.
- Source: `features/search/services/meaning-search.ts`, `meaning-hint.service.ts`, `utils/meaning-why.ts`, `features/ai/components/meaning-search-control/*`, `apps/api/src/ai/search/*`, `embeddings/*`, contracts `ai-search-*.ts`, `meaning-*.ts`.

#### AI-09 Related links (preview) and "Show related" (side by side)
- What it does: in the link preview, a secondary button with the spark "Related · {{count}}" opens a popover "Related on your shelf" with up to 5 links close in meaning (favicon, title, "Close to: {{reasons}}" with spark, or the host when no reasons). Choosing a row switches the preview to that link. In side by side (from 80em), the card and row menus offer "Show related": the right half's folder picker replaces its "Recent" group with "Related folders" (the folders of up to a few related links).
- Entry points: link preview panel (desktop, small button) and preview page (phone); card/row "⋯" menu item "Show related" (icon columns).
- Screens / routes: SCR-AI-14; `?related=<linkId>` on the library page.
- Platforms: "Show related" only from 80em (where side by side can open).
- States: hidden unless search by meaning is ready; empty, off or failed renders nothing.
- Data: `GET /api/links/:id/related` (no model call; uses the stored vector).
- Settings that change it: AI main switch, Search by meaning.
- Feedback: —
- Limits: 5 by default (max 10); `AiRelated` 60/min.
- Related: AI-08; link preview, side by side (other areas).
- Source: `features/ai/components/related-links/*`, `features/library/services/split-related.service.ts`, `apps/api/src/ai/search/related-links.service.ts`.

#### AI-10 Ask your shelf (chat over your links)
- What it does: a chat that answers questions only from the user's own links. Before the first question: "What do you want to find out?", lead "Ask in your own words. The answer comes from the links you saved, with each source listed.", caption "Try" and up to 3 starter cards built from the user's largest folders ("What did I save about {{folder}}?", "What are the main ideas in {{folder}}?", "What did I add to {{folder}} lately?"; without folders "What did I save this month?"). The answer streams as plain text with numbered citation chips ("Source {{n}}"); a status pill shows what Ask is doing ("Searching your links…", "Counting…", "Reading a link…", "Looking through folders and tags…", "Looking closer…"); found links can come as compact cards (favicon, title, "host · folder", ↗; "⋯" menu: "Open side by side" from 80em, "Remind me") with "Show all {{count}} in search" when more matched; cited links not shown as cards are listed under "Sources from your shelf" (number badge, title, host · folder, side-by-side icon from 80em, remind-me icon, ↗). A citation scrolls to and highlights its card/source for 1.5 s; citations of links trashed meanwhile are disabled. Each answer ends with "Generated by AI, may be inaccurate". Follow-up questions work: the last 10 turns go back with each question; past 10 a quiet line "Only the last 10 questions are remembered in this conversation.". ✎ "New conversation" clears the chat. Closing the panel or leaving the page forgets the chat and stops a stream; nothing is stored on the server. Not found: "Nothing in your links answers this." with "Search “{{query}}”" (opens All links `?q=`) and "Add a link".
- Entry points: header button "Ask" (spark, accessible name/tooltip "Ask your shelf", from 64em, not on settings pages); the search Ask row (SRC-08); phone/tablet tab "Ask" (spark) which replaces the Tags tab while Ask is on (Tags then appear as a section in Library); starter cards.
- Screens / routes: SCR-AI-07 drawer (from 64em), SCR-AI-08 `/ask` (below 64em; from 64em the route redirects to `/links` and opens the panel; while Ask is off it redirects to `/library`).
- Platforms: desktop/tablet-with-header: 440px drawer from the inline-end edge, resizable from 64em (440px to min(880px, 70vw), keyboard and double click, width kept in localStorage `sm-ask-width`); mobile shell: full-screen pushed page (tab bar hidden) with Back and a glass composer bar.
- States: streaming (composer disabled, Stop); stopped "Stopped."; cut short "The answer was cut short."; day limit "You’ve used today’s questions. Ask again tomorrow; search works as usual."; month limit "You’ve used this month’s questions. Ask again on {{date}}; search works as usual."; error "Couldn’t get an answer right now. This question didn’t count toward your limit." (+ "Try again"); rejected "This question couldn’t be answered. It didn’t count toward your limit." (+ Try again); busy "Another question is still being answered. Try again in a moment." (+ Try again); rate limited "Too many questions in a short time. Try again in a minute; this one didn’t count toward your limit." (+ Try again); off "Ask your shelf is turned off in Settings › AI." (no retry; settings reload and entry points hide); session expired (401) ends the session. Composer disabled when 0 questions left.
- Data: `POST /api/ai/ask {question, history?}` → `text/event-stream` of events meta, text, cite, activity, links (cards), done {sources, notFound, truncated, allowance, turn}, error {reason off|quota|busy|unavailable|rejected, counted:false, allowance}. Sent to the model: the question, earlier turns of the open chat, and the user's links read-only tools return (title, address without query, folder and tag names, summary; notes only with Include my notes). Server tools: search_links (words and meaning), count_links (exact counts, grouped by folder, tag, site, kind or month), get_link, list_folders, list_tags, show_links (cards), request_deeper_answer (hand-over from Claude Haiku 5.5 to Claude Sonnet 5.5, at most once).
- Settings that change it: AI main switch; "Ask your shelf" switch (default on); Include my notes.
- Feedback: allowance line under the title "{{count}} question(s) left today" / "… this month" (also next to the switch in Settings); the whole answer is announced once when it finishes.
- Limits: question 3–500 characters; Free 5 a day and 5 a month (in effect 5 a month); AI pack 50 a day and 500 a month; deeper answers AI pack 20/day, 150/month (Free inside its 5); a question counts once text or cards arrived (Stop before that is refunded); one question at a time per user; answer max 4,000 characters, 24 s hard stop; up to 12 cards per show_links; `AiAsk` 10/min per IP.
- Related: SRC-08, AI-08, reminders and side by side (other areas).
- Source: `features/ai/components/ask-*`, `pages/ask/*`, `services/ask*.ts`, `utils/ask-*.ts`, `http/fetch-ask-events.ts`, `apps/api/src/ai/ask/**`, contracts `ask-*.ts`, `ai-quota.const.ts`.

#### AI-11 Tidy Unsorted (review suggestions in bulk)
- What it does: in Unsorted, while AI is on and at least one link there has suggestions, a secondary button with the spark "Tidy with suggestions" and a count badge opens a review page. Each row: link title, favicon and host, its suggested folder and tags as chips, all selected at first; tapping a chip leaves it out (turns dashed), tapping again selects it; a left-out chip can be dismissed for good with ×; "Skip" keeps a link as it is ("Skipped — stays in Unsorted" with "Undo skip"). One primary "Apply to {{count}} link(s)" applies every selected chip of non-skipped links in one request; a toast "Tidied {{count}} link(s)" with "Moved into {{count}} folder(s), {{count}} tag(s) added" and Undo (8 s, Ctrl/⌘+Z) reverts the whole run. With more links after the page: "{{count}} more link(s) after these. Links without suggestions are not listed."; when nothing on the page is applied, "Show the next links". `?import=<id>` limits the review to one import ("Showing only the links of this import." with "Review everything"). Accepted folder suggestions may trigger a rule offer (AI-18).
- Entry points: Unsorted header button (not in the split view); the import AI pass toast (import area) opens `?import=`.
- Screens / routes: SCR-AI-10 `/unsorted/tidy` (guard: AI on, else `/unsorted`; guest → sign-in).
- Platforms: desktop: Cancel and Apply in the page header; mobile shell: pushed page (tab bar hidden), a glass action bar at the bottom; rows become cards (CSS).
- States: loading (progress bar "Loading suggestions"); empty "Nothing to tidy" / "Every link here either has no suggestions yet or you already sorted it. New links get suggestions within a minute." / "Back to Unsorted" (also shown when the list fails to load, and when every link is skipped and no page follows); AI turned off meanwhile → leaves for Unsorted.
- Data: `GET /api/ai/tidy?after=&importId=` (items: link + suggestions, total), `GET /api/ai/tidy/count`, `POST /api/ai/tidy/apply {items:[{linkId, suggestionIds}]}` → {applied, folders, tagsAdded, links, undo}, `POST /api/ai/tidy/undo`, `POST /api/ai/suggestions/:id/dismiss`.
- Settings that change it: AI main switch.
- Feedback: toasts (see Toasts); "Nothing to apply" / "The suggestions changed meanwhile." info toast when everything changed meanwhile.
- Limits: page = 100 links (`TIDY_LIMIT.PageMax` = batch max), up to 6 suggestion ids per link; list scan at most 500 rows; `AiTidyRead` 60/min, `AiTidy` 20/min. Never applies over a folder chosen meanwhile or where a rule decides the folder.
- Related: AI-04, AI-18, import (other area).
- Source: `features/ai/pages/tidy/*`, `components/tidy-entry/*`, `tidy-row/*`, `services/tidy*.ts`, `utils/tidy-chips.ts`, `apps/api/src/ai/tidy/*`, `ai-tidy.controller.ts`.

#### AI-12 Process existing links (backfill)
- What it does: adds suggestions, summaries and vectors to links saved before AI was turned on, in the background through the provider's batch API. Offered in three places: Settings › AI › "This month" row "Process existing links" (hint "{{count}} link(s) was/were saved before you turned AI on. Adds suggestions and summaries in the background: faster while Shelfmark is open, within a day otherwise." + "Start"); the intro's second step; the search reminder (SRC-09). While running: "Processing existing links" / "{{done}} of {{total}} done. Faster while Shelfmark is open; otherwise it finishes within a day." with a meter "Existing links processed", "About {{minutes}} min left" and "Stop" (keeps what is done). Finished: "Every existing link has been processed.". Never auto-applies folders or tags (suggestions wait).
- Entry points: as above.
- Screens / routes: SCR-AI-01 (`#ai-backfill`), SCR-AI-04, SCR-SRC-01/02.
- Platforms: same.
- States: only for tiers with an allowance (AI pack); Start disabled while AI is off; refusal → toast "Couldn’t start processing your links" and settings re-read; stop failure → "Couldn’t stop processing. Try again.".
- Data: `GET/POST/DELETE /api/ai/backfill` (AiBackfillStatus {state idle|running|done|stopped, eligible, total, done, estimatedMinutes}); the tick moves it on.
- Settings that change it: AI main switch (turning off stops it).
- Feedback: as above.
- Limits: one-time allowance separate from the monthly limit: AI pack 5,000 links, Free 0 (not offered); chunks of up to 40; `AiBackfill` 20/min.
- Related: AI-02, AI-13, SRC-09.
- Source: `features/ai/components/ai-usage-section/*`, `apps/api/src/ai/backfill/*`, contracts `ai-backfill-*.ts`.

#### AI-13 Usage and monthly limit ("This month")
- What it does: Settings › AI shows "{{used}} of {{limit}} links this month", "Resets on {{date}}" and a meter "AI links used this month". At the limit a warning notice: "You used this month’s {{limit}} links. New links save as usual, without suggestions or summaries, until {{date}}." In Add link the limit shows as the AI line (AI-04). Links still save as usual.
- Entry points: Settings › AI.
- Screens / routes: SCR-AI-01.
- Platforms: same.
- States: limit reached.
- Data: AiUsage {linksUsed, linksLimit, resetsOn, backfillUsed, backfillLimit} (UTC calendar month).
- Settings that change it: —
- Feedback: —
- Limits: Free 50 links/month, AI pack 1,000 links/month (save, draft and rewrite jobs).
- Related: AI-19.
- Source: `features/ai/components/ai-usage-section/*`, `apps/api/src/ai/usage/*`, contracts `ai-quota.const.ts`.

#### AI-14 Delete AI data
- What it does: "Delete AI data" (danger button) in "Your AI data" removes every AI summary, every suggestion, job rows and all vectors, and turns Search by meaning off; the user's own edits, tags and folders stay. Confirmation first. The feed reloads so removed summaries disappear. Also deletes the clean-up report.
- Entry points: Settings › AI › Your AI data (`#ai-data`, linked from Settings › Privacy and data).
- Screens / routes: SCR-AI-01, SCR-AI-06.
- Platforms: same.
- States: shown once settings are loaded, AI on or off.
- Data: `DELETE /api/ai/data`.
- Settings that change it: —
- Feedback: confirm dialog; success toast "AI data deleted"; failure "Couldn’t delete AI data" / "Nothing was removed. Try again.".
- Limits: `AiDeleteData` 5/min.
- Related: AI-01.
- Source: `ai-settings-actions.service.ts`, `apps/api/src/ai/data/ai-data.service.ts`.

#### AI-15 What is sent: notes and summary language
- What it does: "Include my notes" (default off): notes go to the model and into embeddings only when on ("Notes make suggestions more accurate. When off, your notes never leave Shelfmark."). "Summary language": a compact select, "Match the app ({{language}})" (default) or one of the interface languages ("Summaries are written in this language, whatever the page is in.").
- Entry points: Settings › AI › What is sent (only while AI is on).
- Screens / routes: SCR-AI-01.
- Platforms: same.
- States: —
- Data: AiSettings includeNotes, summaryLanguage.
- Settings that change it: —
- Feedback: failed save toast (AI-01).
- Limits: —
- Related: AI-04, AI-07, AI-08, AI-10.
- Source: `ai-settings.page.html`.

#### AI-16 Quiet degradation: AI lines and provider status
- What it does: AI never shows error toasts on save. When AI content cannot appear, one muted line with the spark (never red) says what happened and what still works, optionally with a ghost button: Add link limit/unavailable lines (AI-04), Ask lines (AI-10), search "getting ready" (AI-08), clean-up footer, provider-down line on Settings › AI (only while AI is on). Job reasons `off`, `rejected`, `nothing-found` collapse silently; only `quota` and `unavailable` are shown.
- Entry points: —
- Screens / routes: SCR-AI-01, SCR-AI-13, SCR-AI-07/08, SCR-SRC-01/02, SCR-AI-12.
- Platforms: same.
- States: as listed.
- Data: providerStatus ok|unavailable; job reason.
- Settings that change it: —
- Feedback: —
- Limits: —
- Related: AI-21.
- Source: `libs/ui/src/lib/components/ai-line/*`, contracts `ai-job-reason.const.ts`, `ai-provider-status.const.ts`.

#### AI-17 Library clean-up (duplicates and similar tags)
- What it does: a page "Clean up your library" finds links saved more than once and tags that mean the same; nothing changes until the user applies. First visit: intro text, optional switch "Include AI checks" (only when AI checks can run now: AI on, AI pack, a run left this month; default on), "Check my library". Rule checks (exact same normalised address; tag spelling variants) run at once; AI checks (same page under another address via vectors; tags with the same meaning via the model) run in the background ("Checking your library…", progress "{{checked}} of {{total}} links…", meter; you can leave the page). The report has two groups, each row with a checkbox (all checked at first): "Duplicates — Extra copies go to Trash" (one row per group, keep reason explained, badge "Same address" or "Same page" (spark for AI)); "Similar tags — Merged into the first one" (row "{{keep}} ← {{merge}}", detail, badge "Found by AI" for AI pairs, "Keep “{{merge}}” instead" swaps the pair). "Apply {{count}} change(s)" (copies + merges) applies in one step; toast "Cleaned up {{count}} thing(s)" with "{{count}} copy/copies in Trash, {{count}} tag(s) merged" and Undo (8 s toast; the server holds the Undo 10 minutes, single use, ends with the next apply). Copies go to Trash.
- Entry points: Settings › Library › "Clean up" row "Clean up your library" / "Find duplicates and similar tags, and fix them in one step." button "Review"; phone You › Library. (The entry card on All links exists only in the API, not in the web app.)
- Screens / routes: SCR-AI-12 `/settings/library/cleanup` (settings nav keeps Library active; back → Library).
- Platforms: desktop Cancel and Apply in the header; mobile shell an action bar above the tab bar.
- States: loading; load error "Couldn’t load the clean-up report." + "Try again"; never run; checking; report (with info notice "The check stopped before it finished. Here is what it found." when failed with rows); tidy "Your library is tidy" / "No duplicates or similar tags found." + "Check again"; failed with nothing "The check didn’t finish" / "It stopped before it found anything, and nothing was changed. Try checking again." + "Try again"; applied "All cleaned up" / "The changes you picked are done. Copies you removed wait in Trash." + "Check again". Footer AI line when AI rows exist: "Groups marked “Found by AI” are suggestions and may be inaccurate. Exact duplicates are checked without AI." A run already going (409) shows that run.
- Data: `GET /api/cleanup`, `POST /api/cleanup/run {includeAi}`, `POST /api/cleanup/apply {duplicates:[{groupId, trashIds}], tagMerges:[{pairId, keepTagId}]}`, `POST /api/cleanup/undo {runId}`, `GET /api/cleanup/summary`, `POST /api/cleanup/card/dismiss`; poll every 3 s while running (with the AI tick when AI is on). Tag synonyms send only tag names to the model.
- Settings that change it: AI main switch and tier (AI checks).
- Feedback: toasts (see Toasts); "Couldn’t start the check. Try again.".
- Limits: 100 duplicate groups, 5 links per group, 20 tag pairs; AI runs AI pack 10/month, Free 0 (rule checks unlimited for everyone); `CleanupRun` 6/min, `CleanupApply` 10/min.
- Related: Trash, tags merge (other areas).
- Source: `features/cleanup/**`, `apps/api/src/cleanup/**`, contracts `cleanup/*`.

#### AI-18 Rule offer after filing (learn from choices)
- What it does: after links are filed into a folder (including accepted Tidy folder suggestions), while AI is on, a toast may offer a plain rule: "Always put {{domain}} links in {{folder}}?" / "Your last {{count}} link(s) from this site is/are there. A rule works without AI." with "Create rule" and "Not now" (remembered per site). Earlier choices for the same site are also passed to the model as examples.
- Entry points: toast after filing.
- Screens / routes: toast (rules area).
- Platforms: same.
- States: only while AI is on.
- Data: rules offers endpoints (rules area).
- Settings that change it: AI main switch.
- Feedback: "Rule created", "Couldn’t create the rule".
- Limits: "Not now" capped at 500 sites per user.
- Related: AI-11; Rules (other area).
- Source: `features/rules/services/rule-offer.service.ts`, `features/ai/services/tidy-apply.service.ts`.

#### AI-19 Tiers, plans and entitlements
- What it does: each account has a plan (Free / Pro) and an AI tier (Free / AI pack), computed per request. Monetisation is not built: accounts whose verified email is in `AI_FULL_ACCESS_EMAILS` (never demo) get Pro and the AI pack; everyone else is Free. Pro gates MCP (connect an assistant); the AI pack gates backfill, AI clean-up checks, Rediscover theme mode and higher quotas.
- Entry points: none in the UI (no upgrade button).
- Screens / routes: affects SCR-AI-01, SCR-AI-12, SCR-MCP-01.
- Platforms: —
- States: Free accounts: no "Process existing links" row, no "Include AI checks", Ask 5 a month, MCP notice "Connecting an assistant is part of Pro. …".
- Data: AiEntitlements {plan free|pro, aiTier free|ai-pack} in the settings response.
- Settings that change it: —
- Feedback: —
- Limits: see Limits table (AI_QUOTA).
- Related: AI-13, MCP-05.
- Source: contracts `account-plan.const.ts`, `ai-tier.const.ts`, `ai-quota.const.ts`, `apps/api/src/ai/settings/ai-entitlements.ts`.

#### AI-20 Background catch-up (tick, sweep, follow-up)
- What it does: saving never waits for a model. Jobs run after the response; while AI is on, the tab is visible and jobs are pending, a backfill runs, or links are being embedded (or the search status is unavailable), the web app calls the tick every 15 s; a daily cron sweep catches up for every user. After a single save the app polls the link's AI state every 1 s for up to 10 s and puts the summary (and Automatic changes with a toast) into the feed.
- Entry points: automatic.
- Screens / routes: —
- Platforms: —
- States: hidden tab: no ticks.
- Data: `POST /api/ai/tick` (pendingJobs, backfill, search, cleanup), `GET /api/cron/ai-sweep` (cron secret), `GET /api/links/:id/ai`.
- Settings that change it: AI main switch.
- Feedback: —
- Limits: `AiTick` 10/min.
- Related: AI-05, AI-07, AI-12.
- Source: `features/ai/services/ai-tick.service.ts`, `ai-follow-up.service.ts`, `apps/api/src/ai/catch-up/*`, `ai-sweep.controller.ts`.

#### AI-21 AI off behaviour across the app
- What it does: with the main switch off (or not loaded yet) nothing AI shows: no suggestion rows, no Fill in with AI, no AI lines, no summary field in Add link (Edit link shows it only if the link has a summary), no Tidy button (route redirects to Unsorted), no Ask header button, no Ask tab (the tab bar keeps Tags), no Ask row in search, no meaning results, no backfill reminder, no "Related" button or "Show related", no "Include AI checks" in clean-up (rule checks still work), no rule offers, no AI phrase step in the new-view dialog. Already generated summaries keep showing on cards (with the spark) until Delete AI data. MCP keeps working (independent of the switch). Settings › AI shows only the main switch, "Your AI data" and "Connect your assistant".
- Entry points: —
- Screens / routes: all.
- Platforms: all.
- States: AI off.
- Data: AiSettings.enabled.
- Settings that change it: AI main switch; per-feature switches (modes Off, Summaries, Search by meaning, Ask) hide their own parts.
- Feedback: —
- Limits: —
- Related: all AI features.
- Source: `features/ai/services/ai-settings.store.ts` (isOn, folderMode, tagsMode, summariesOn, meaningSearchOn, askOn, meaningReady).

#### AI-22 Saved view from a phrase (AI in the new view dialog)
- What it does: while AI is on, the new view dialog offers "Describe what to show" (placeholder "videos about Angular I haven’t watched yet") and idea chips; one short model call turns the phrase into the view's filter rows (only the user's own folder and tag names; unknown names become search words). Limit/unavailable are lines, e.g. "Couldn’t compose a view right now. This didn’t count toward your limit; you can set the filter yourself."
- Entry points: new view dialog (views area).
- Screens / routes: views area.
- Platforms: —
- States: AI off: no phrase step.
- Data: `POST /api/ai/view-draft {phrase}` (3–200 characters; counts one Ask question; refunded on model failure; 409 when AI is off).
- Settings that change it: AI main switch.
- Feedback: lines, no toasts.
- Limits: counts against the Ask question allowance; `AiViewDraft` 10/min.
- Related: Saved views (other area), AI-10.
- Source: `features/views/services/new-view-phrase.service.ts`, `apps/api/src/ai/view-draft*`.

#### AI-23 Import AI pass and grouping
- What it does: after an import, AI can group imported links into topic clusters and process them; a toast "Descriptions and tags are ready" with counts and "Review tags" opens Tidy limited to that import (`/unsorted/tidy?import=<id>`).
- Entry points: import flow (import area).
- Screens / routes: import area; SCR-AI-10 with `?import=`.
- Platforms: —
- States: only while AI is on and the provider is not down.
- Data: import endpoints (import area).
- Settings that change it: AI main switch.
- Feedback: toast (import area).
- Limits: import AI grouping AI pack 10,000 links/month, Free 0.
- Related: AI-11; Import (other area).
- Source: `features/import/services/import-flow.service.ts`, contracts `ai-quota.const.ts`.

#### AI-24 Rediscover theme mode ("From your shelf")
- What it does: the weekly "From your shelf" block on All links has a forgotten mode for everyone (no AI mark) and a theme mode ("You’ve been saving a lot about {{theme}}. These are older ones you haven’t opened.") only with AI on, AI pack and search by meaning ready; no model call.
- Entry points: All links (rediscover area).
- Screens / routes: rediscover area.
- Platforms: —
- States: AI off/Free: forgotten mode only.
- Data: `GET /api/rediscover` (rediscover area).
- Settings that change it: AI main switch, Search by meaning.
- Feedback: —
- Limits: 3–5 items a week.
- Related: Rediscover (other area).
- Source: `features/rediscover/*`, `docs/ai/IMPLEMENTATION-AI-4.md` 10.3.

#### AI-25 Demo accounts and the mock provider
- What it does: the real providers (Anthropic, Voyage) run only in production for non-demo users; dev, tests, CI, previews and every demo user get a mock. A new demo user starts with AI and Ask on, Free allowance (5 questions a month), search by meaning ready and seeded links for canned answers. Demo users never see the AI announcement and cannot create MCP tokens. The web mock answers on purpose to markers: a URL or text containing `ai-fail` (unavailable), `ai-refuse` (rejected), `ai-quota` (monthly limit); Ask also `ai-slow`, `ai-cut`, `ai-loop`, `sourdough` (not found).
- Entry points: demo start (other area).
- Screens / routes: —
- Platforms: —
- States: demo.
- Data: mock storage key `sm-mock-ai` (mock builds only).
- Settings that change it: —
- Feedback: —
- Limits: Free tier.
- Related: Demo (other area).
- Source: `features/ai/mock/**`, `features/ai/connect/mock/**`, `features/cleanup/mock/**`, `docs/ai/IMPLEMENTATION-AI-4.md` 10.4.

#### MCP-01 Connect your assistant (Settings › AI section)
- What it does: the last section of Settings › AI, shown with AI on or off: "Connect your assistant" with lead "Let Claude or another assistant that supports MCP search and read your links. Read-only: it can’t change or delete anything." Step "1. Server address" shows the address (`<app origin>/api/mcp`) in code style with "Copy" (accessible "Copy the server address"). Step "2. Personal token" row ("One token per assistant, so you can revoke each on its own." or at the limit "You have {{max}} tokens. Revoke one to create another.") with "Create token". Then the list "Connected" or the empty state, then the how-to (MCP-03).
- Entry points: Settings › AI (desktop), You › AI (phone).
- Screens / routes: SCR-MCP-01.
- Platforms: same content; phone in one column.
- States: load failed "Couldn’t load your tokens." + "Try again"; demo notice "The demo can’t connect an assistant. Sign in with your own account to try it."; Free notice "Connecting an assistant is part of Pro. Tokens you already have stay listed, and you can revoke them."; Create token disabled until loaded, when not available, or at the limit; empty "No assistants connected" / "Create a token, paste it into your assistant’s MCP settings with the server address, and ask it about your links.".
- Data: `GET /api/mcp/tokens` ({available, items: McpTokenSummary[]}).
- Settings that change it: plan (Pro), demo.
- Feedback: copy toasts "Server address copied" / "Couldn’t copy. Select the text and copy it with your keyboard.".
- Limits: 10 tokens per user.
- Related: MCP-02…MCP-05.
- Source: `features/ai/connect/components/connect-assistant/*`, `services/mcp-tokens.store.ts`, `mcp-connect-actions.service.ts`.

#### MCP-02 Personal tokens: create, show once, list, revoke
- What it does: "Create token" opens a dialog "Create a token": Name (required, placeholder "Claude Desktop", at most 40 characters) and switch "Include my notes" ("Your assistant will also see the notes on your links. To change this later, create a new token."). "Create token" (shows "Creating…") creates it; the same dialog then shows "Token for {{name}}": "Personal token (shown once)" with the masked value (`smk_live_7Qh2…aX9c`), primary "Copy" (copies the whole value; toast "Token copied"), warning "Copy it now: you won’t see it again. Anyone with this token can read your links until you revoke it.", and "Done". If the clipboard refuses, a read-only field "Personal token" with the whole value appears selected, with "Couldn’t copy. The token is selected above: press Ctrl+C or ⌘C to copy it.". The secret is cleared when the dialog closes. The list shows each token: avatar letter, name, "Ends in {{last4}}", usage "Last used {{when}}, calls this week: {{calls}}" or "Created {{date}}, never used", badge "Includes notes", and "Revoke" (accessible "Revoke {{name}}"), with a confirmation that names it. Revoking stops the token at once.
- Entry points: Create token; Revoke.
- Screens / routes: SCR-MCP-02, SCR-MCP-03.
- Platforms: the dialog is a bottom sheet below 40em.
- States: create errors (notice): "You have {{max}} tokens. Revoke one to create another." (409), "Connecting an assistant is part of Pro." (403), "Couldn’t create the token. Try again."; revoking shows a loading Revoke button.
- Data: `POST /api/mcp/tokens {name, includeNotes}` → secret once; `DELETE /api/mcp/tokens/:id`. Tokens hashed at rest, prefix `smk_live_`, no expiry; includeNotes fixed at creation; lastUsedAt updated at most once a minute; callsThisWeek = last 7 UTC days.
- Settings that change it: —
- Feedback: "Token revoked" (detail: name) / "Couldn’t revoke the token. Try again.".
- Limits: 10 tokens; name 1–40 characters; `McpTokenWrite` 10/min.
- Related: MCP-01.
- Source: `features/ai/connect/components/create-token-dialog/*`, `utils/mask-secret.ts`, `apps/api/src/mcp/tokens/*`, `mcp-tokens.controller.ts`.

#### MCP-03 How to connect (per client)
- What it does: a ghost toggle "How to connect: Claude, Cursor, VS Code" (chevron, expanded state) opens a panel: "Replace <token> with your personal token." then four clients, each with a title, hint, a code block (focusable) and "Copy" (accessible "Copy the {{client}} setup"; toast "{{client}} setup copied"): Claude Code ("Run this in a terminal:" + `claude mcp add --transport http shelfmark <url> --header "Authorization: Bearer <token>"`), Claude Desktop ("Add this to claude_desktop_config.json (Settings › Developer › Edit Config), then restart Claude Desktop. Needs Node.js." + `mcp-remote` JSON), Cursor ("Add this to ~/.cursor/mcp.json:"), VS Code ("Add this to .vscode/mcp.json in your project:"). Closing note: "Assistants that can only connect through a sign-in (OAuth), such as web-based connectors, can’t connect yet."
- Entry points: toggle in MCP-01.
- Screens / routes: SCR-MCP-01.
- Platforms: same.
- States: collapsed by default.
- Data: none (snippets are generated in the browser, not translated).
- Settings that change it: —
- Feedback: copy toasts.
- Limits: —
- Related: MCP-01.
- Source: `features/ai/connect/components/mcp-how-to/*`, `utils/mcp-client-setup.ts`.

#### MCP-04 Shelfmark MCP server (API only)
- What it does: an MCP server at `POST /api/mcp` (stateless Streamable HTTP, JSON-RPC, JSON answers) for the user's own assistant, authenticated by a personal bearer token (never a cookie). Read-only tools: `search_links` ("Search links": query 1–200 characters required, optional folderId, tag, limit 1–25 default 10; every word must appear in title or URL, or note when the token includes notes; newest first; each item has `match`), `get_link` (one link by id: URL, title, folder, tags, summary, dates), `list_folders` (tree order, path, links directly in it), `list_tags` (most used first with counts). Each link returns only: id, url, title, host, folderPath, tags, summary, summaryByAi, kind, isFavorite, savedAt, lastOpenedAt, and note only for tokens with notes. Server instructions say saved content is data, not instructions. Protocol versions 2025-11-25 and 2025-06-18; GET and DELETE answer 405; batches refused. Shelfmark makes no model call; works with the AI switch off.
- Entry points: external MCP clients.
- Screens / routes: none (API).
- Platforms: —
- States: 401 "A valid personal token is required" (missing, malformed, unknown or revoked); daily cap 429 "Daily call limit reached (2000)"; not Pro / demo refused.
- Data: link, folder, tag reads scoped to the token's user; usage rows per day.
- Settings that change it: token's includeNotes.
- Feedback: —
- Limits: 2,000 calls per token per UTC day (every authenticated POST counts, including initialize, ping, tools/list); 120 requests a minute per IP (`Mcp`).
- Related: MCP-02.
- Source: `apps/api/src/mcp/**`, contracts `mcp/*`.

#### MCP-05 Availability of MCP (Pro, not demo)
- What it does: creating tokens and calling the server need Pro (stored plan or the full-access email list) and a non-demo account; checked on create and on every call. Free and demo accounts still see the section with a notice; existing tokens stay listed and revocable.
- Entry points: —
- Screens / routes: SCR-MCP-01.
- Platforms: —
- States: demo, Free.
- Data: McpTokensResponse.available.
- Settings that change it: plan.
- Feedback: notices (MCP-01).
- Limits: —
- Related: AI-19.
- Source: `apps/api/src/mcp/mcp-available.ts`, `connect-assistant.component.ts`.

### 3.4 Capture, import, export and sharing

Scope: Add link (single, several, paste many, global paste), Web Share Target `/share`, server-side preview / metadata fetching, Import (browser bookmarks), Export (dialog, library menu, Account › Your data, API), public collections (share a folder, `/c/:token`).

Breakpoints used by the code in this area: `phone` = below 40em (`ViewportService.phone`), `compact` = below 64em (`ViewportService.compact`, mobile shell with tab bar instead of sidebar and top bar). Every `ui-dialog` becomes a bottom sheet with a grip (drag down to close, the × closes) below 40em; `uiDialogCancel` buttons are left out on the sheet. No 80em rule in this area.

#### CAP-01 Add link dialog (save one link)
- What it does: A dialog where the user pastes or types a web address; a preview (title, description, site letter) loads by itself; the user may set title, folder, tags and a note, then saves. The saved link appears at the top of the feed at once and a toast confirms. All fields except the address are optional.
- Entry points:
  - Top bar primary button "Add link" (desktop and tablet ≥64em, app shell header, icon `add`).
  - Tab bar centre add button, accessible name "Add link" (mobile shell below 64em).
  - Library empty state button: All links "Add link", Unsorted "Add link", folder "Add link" (folder preselected). Not offered in Favorites (button there is "Show all links").
  - Sidebar folder menu item "Add link here" (desktop sidebar and phone Library folder list), folder preselected.
  - Onboarding last step "Add your first link" (dialog opens after onboarding closes).
  - Ask your shelf, "Nothing in your links answers this." state: ghost button "Add a link".
  - ⌘V / Ctrl+V anywhere in the library outside a field (CAP-13), the pasted text is handed over.
  - No keyboard shortcut opens an empty Add link; no drag and drop of a URL or text onto the app (see Observations).
- Screens / routes: SCR-CAP-01 (dialog over the current page; no route).
- Platforms: Desktop/tablet: medium dialog (`size md`), first field (Link) focused. Phone (<40em): bottom sheet with grip; no Cancel button (× closes); no "⌘ Enter to create" hint; footer buttons full width (`block`); "Fill in with AI" full width, large, labelled "Fill". Tablet and wider with AI on: Delete (edit mode) becomes icon-only.
- States: idle (empty Link, hint shown), preview loading (skeleton + note), preview ready (card), preview failed (danger notice), no preview available (info notice), duplicate (notice + extra button), invalid address (field error, shake on submit), saving (button spinner "Creating…", Cancel disabled), save error (danger notice), AI busy (fields locked, Create disabled), "Fetch titles and previews" off (no skeleton, no card; only duplicate check), offline (handled by shell offline banner, save fails with generic error).
- Data: writes Link (`url`, `title?`, `note?`, `folderId?`, `tags?`, `faviconUrl?`, `imageUrl?`, `kind?`, `applyRules?`, `aiDraftId?`, `summary?`, `idempotencyKey`). `POST /api/links/preview` (debounced 350 ms after typing stops), `POST /api/links`, `POST /api/folders` (pending new folder), reads folders and tags stores.
- Settings that change it: Settings › Library › Saving › "New links go to" (default folder when the dialog is not opened from a folder); "Fetch titles and previews" (off: no page load, only duplicate check, server stores address as title). Settings › AI (AI suggestions, Fill in with AI, summary field). Domain rules (rule chip).
- Feedback: toast (kind saved) "Saved to {{folder}}" with the link title as detail and the preview image thumbnail; folder label "Unsorted" when none. Warning toast "Couldn’t create the folder “{{name}}”" / "The link is saved without a folder." when a folder named in the field could not be created. Screen-reader live region: "Loading preview", "Preview loaded: {{title}}", duplicate text. After saving with a folder the user chose, a domain-rule offer may follow (AI, other area).
- Limits: URL ≤ 2048 characters; title ≤ 300; note ≤ 2000; tags ≤ 20 per link; folder name ≤ 100; 10 000 links per user (demo 100); rate limit 30 saves/min, 20 previews/min per IP.
- Related: CAP-02 to CAP-10, CAP-19, domain rules (other area), AI suggestions (other area), reminders (other area).
- Source: `apps/web/src/app/features/links/components/add-link/*`, `services/add-link-*.service.ts`, `services/add-link-dialog.service.ts`, `services/link-actions.service.ts` (`addLink`, `noteSaved`), `shell/app-shell.component.html`, `features/library/library.page.html`, `shell/sidebar/sidebar.component.html`, `features/onboarding/services/onboarding.store.ts`, `features/ai/components/ask-entry`.

#### CAP-02 Address handling (bare host, normalisation)
- What it does: A bare host typed or pasted (`example.com`) counts as `https://example.com`: it validates while typed, is previewed and saved with `https://`; the field rewrites itself to the `https://` form on blur and when a single address without scheme is pasted over the whole field. Anything not http(s) is rejected with "Enter an address that starts with http:// or https://". Server side, tracking parameters (`utm_*` and a fixed list) are always removed before saving and before the duplicate check (not a setting).
- Entry points: Link field of Add link, Edit link, Share target `url` param.
- Screens / routes: SCR-CAP-01, SCR-CAP-04.
- Platforms: all.
- States: invalid → error message under the field; submit with invalid address shakes the field once.
- Data: `withDefaultScheme`, `isHttpUrl` (contracts); API `savedUrl` = `stripTrackingParams`.
- Settings that change it: none.
- Feedback: field error text.
- Limits: URL ≤ 2048.
- Related: CAP-01, CAP-16.
- Source: `add-link-form.service.ts`, `libs/shared/contracts/src/links/with-default-scheme.ts`, `strip-tracking-params.ts`, `apps/api/src/links/link-save-prefs.ts`.

#### CAP-03 Preview at save time (client side)
- What it does: Once the Link field holds a valid address, after 350 ms the app asks the server for a preview. While loading: a skeleton card and the note "You can keep typing a note and choosing a folder while it loads." Ready: a card with a letter thumbnail (first letter of the host), favicon letter, host, page title, description (if any) and "Filled in from the page. You can edit the title." The page title fills the Title field unless the user typed in it; when the address is emptied or becomes invalid an auto-filled title is cleared. Failure (network/server error): danger notice "Couldn't load a preview. The link will be saved with its address as the title — you can rename it." and the title is filled with the address without scheme. Server reached but page not fetchable: notice "No preview is available for this page. The link will be saved with its address as the title — you can rename it." A new address cancels the old request. Images are not shown in the dialog (text only).
- Entry points: typing/pasting in Link.
- Screens / routes: SCR-CAP-01.
- Platforms: all.
- States: idle, loading, ready, failed, unavailable; with "Fetch titles and previews" off: request still runs for the duplicate check, no skeleton, no card, no failure notice.
- Data: `POST /api/links/preview` → `{ preview: { kind, url, title, description, imageUrl, faviconUrl }, duplicate, fetched }`. On save, `faviconUrl`, `imageUrl` and `kind` of a fetched preview are sent as hints.
- Settings that change it: "Fetch titles and previews".
- Feedback: polite live region "Loading preview" / "Preview loaded: {{title}}".
- Limits: preview rate limit 20/min per IP (API).
- Related: CAP-17 (server), CAP-04.
- Source: `add-link-preview.service.ts`, `add-link-dialog.component.html`.

#### CAP-04 Duplicate warning
- What it does: When the previewed address (normalised, tracking parameters ignored, Trash ignored) is already saved, a notice says "You already saved this link in {{folder}}. Open it, or save it again." ("Unsorted" when it has no folder). The footer gains "Open saved" and the primary button changes to "Create anyway". "Open saved" closes the dialog and opens the existing link in its Edit link dialog. Saving again is allowed (duplicates are permitted).
- Entry points: automatic after preview.
- Screens / routes: SCR-CAP-01, SCR-CAP-04 (share page: primary becomes "Save anyway"), SCR-CAP-03 (paste many: "Already saved" badge).
- Platforms: all.
- States: in edit mode only a changed address is checked; the link itself never counts as its own duplicate; no "Open saved" in edit mode.
- Data: `LinkDuplicate { id, title, folderId, folderName }` from the preview response.
- Settings that change it: none (runs even with page fetching off).
- Feedback: notice + live region announcement.
- Limits: none.
- Related: CAP-12, CAP-16, IMP-05.
- Source: `add-link-preview.service.ts`, `add-link-dialog.component.ts` (`openExisting`), `link-actions.service.ts` (`openSaved`), `apps/api/src/links/links.service.ts` (`preview`).

#### CAP-05 Folder choice and "Create folder" in the field
- What it does: Searchable folder select ("Folder"), empty choice "Unsorted". Defaults: the open folder (when opened from a folder page, empty state or "Add link here"), else "New links go to" setting, else Unsorted. Typing a name that matches no folder offers "Create folder “{name}”": an existing folder of that name (case-insensitive) is chosen instead; otherwise a pending folder is shown last with a "New" badge and chosen. Nothing is created until Save; then a top-level folder is created first. If creating fails the link is saved without a folder and a warning toast says so.
- Entry points: Folder field.
- Screens / routes: SCR-CAP-01.
- Platforms: all.
- States: search "No folders found"; folder tiles show folder colour/icon (follows Appearance "Folder colours").
- Data: `POST /api/folders` (pending folder), folders store.
- Settings that change it: "New links go to"; Appearance folder colours.
- Feedback: toast "Couldn’t create the folder “{{name}}”" / "The link is saved without a folder." (warn).
- Limits: folder name ≤ 100 characters (cut); 500 folders per user.
- Related: CAP-08 (rule may fill folder), folders (other area).
- Source: `add-link-new-folder.service.ts`, `add-link-save.service.ts`.

#### CAP-06 Tags field
- What it does: Tag input "Tags" with placeholder "Add tag"; suggestions are the user's tags with their link counts; new tags can be created ("Create tag “{name}”"). Names are normalised the way the API stores them (spaces to hyphens, deduplicated case-insensitively).
- Entry points: Tags field (Add link, paste many "Tags for all").
- Screens / routes: SCR-CAP-01, SCR-CAP-03.
- Platforms: all.
- States: max reached "Up to {{max}} tags".
- Data: tags store; `tags` in create request.
- Settings that change it: none.
- Feedback: screen-reader messages "Tag {name} added", "Tag {name} removed", "Tag {name} is already added"; remove button "Remove tag {name}"; suggestion list label "Tag suggestions".
- Limits: 20 tags per link.
- Related: tags (other area), CAP-09 (AI tag suggestions).
- Source: `add-link-dialog.component.html`, `add-link-labels.service.ts`.

#### CAP-07 Note field
- What it does: Optional multi-line "Your note", placeholder "Why are you saving this?", hint "Helps you find it later", character counter. Last field, never changed by AI.
- Entry points: Add link; Share target has a single-line Note.
- Screens / routes: SCR-CAP-01, SCR-CAP-04.
- Platforms: all.
- States: too long "The note is too long (at most {{max}} characters)".
- Data: `note`.
- Settings that change it: none.
- Feedback: counter.
- Limits: 2000 characters.
- Related: public collection "Show my notes" (SHR-03).
- Source: `add-link-dialog.component.html`, `add-link-form.service.ts`.

#### CAP-08 Domain rule chip at capture
- What it does: When a domain rule matches the address, folder and tags are filled in the form and a removable chip shows "Rule: {{domain}} → {{target}}"; removing it ("Don't apply the rule for {{domain}}") takes the rule's folder and tags out and moves focus to the folder field. The form then sends what it shows with `applyRules: false` so the server does not apply the rule twice. A folder the user chose is not overwritten.
- Entry points: automatic on address change.
- Screens / routes: SCR-CAP-01, SCR-CAP-03 (per row, plus "Apply domain rules" checkbox), SCR-CAP-04.
- Platforms: all.
- States: none / chip shown.
- Data: rules (other area); `applyRules`.
- Settings that change it: domain rules list (Settings, other area).
- Feedback: chip.
- Limits: none here.
- Related: domain rules (other area).
- Source: `add-link-rule.service.ts`, `features/rules/services/rule-suggestion.service.ts`, `batch-rule.service`.

#### CAP-09 AI inside Add link
- What it does: While AI is on: suggested folder row and suggested tags row under their fields ("Suggested", "Suggesting…", "Add all", chips "New"), "Moved by AI" / "{{count}} added by AI" with Undo after Automatic mode, a Summary field when AI wrote one or the user typed one, and a footer button "Fill in with AI" (phone: "Fill"; busy: "Filling…") with shortcut Alt/Option+Shift+F. Fill puts in all suggested tags, the folder unless the user chose one, AI's summary into an empty Summary and the cleaned-up title while the title is still the page's; never the note. Before a valid address it is inactive with "Paste a link first". While waiting for the draft, Link, Folder, Tags and Summary are locked and Create link is disabled. Result announced: "Filled in with AI’s suggestions" or "AI had nothing to fill in for this link". A new address takes back what the previous fill put in.
- Entry points: footer button, Alt+Shift+F in the dialog.
- Screens / routes: SCR-CAP-01.
- Platforms: phone: Fill button full width above Create link. Tablet+: in the footer row; the save hint is dropped while Fill shows.
- States: AI off → nothing AI is rendered.
- Data: AI draft (`aiDraftId`), `summary` in create request.
- Settings that change it: Settings › AI.
- Feedback: polite announcements.
- Limits: AI tiers (other area).
- Related: AI area.
- Source: `components/add-link-ai/*`, `services/add-link-ai*.service.ts`, `add-link-summary.service.ts`.

#### CAP-10 Saving, idempotency and save errors
- What it does: Create link sends `POST /api/links` with an idempotency key per dialog session (a retry of the same content reuses it; changed content gets a new one), so double clicks and retries never save twice. Dismissing the dialog while saving (Esc, scrim, ×) does not cancel: the save finishes and the caller still shows the saved link and toast. On error a danger notice appears in the form and the dialog stays open.
- Entry points: "Create link" / "Create anyway" button, Enter in a text field, ⌘/Ctrl+Enter from any field.
- Screens / routes: SCR-CAP-01.
- Platforms: all.
- States: saving ("Creating…"; Cancel disabled; button spinner remains while the dialog closes).
- Data: `POST /api/links` (201 created, 200 replayed key).
- Settings that change it: none.
- Feedback: errors (exact copy): generic "Couldn't save the link. Try again."; limit (409 "Link limit reached") "You have reached the limit of {{max}} saved links. Delete some to save more."; 409 changed meanwhile "A folder or tag changed while saving. Try again."; 429 "Too many requests. Wait a moment and try again."; 400 "The link couldn't be saved because some details are invalid. Check the address, title and note."
- Limits: 10 000 links per user, demo 100; 30 saves/min.
- Related: CAP-01.
- Source: `add-link-save.service.ts`, `utils/save-error-key.ts`, `apps/api/src/links/links.controller.ts`, `links-write.service.ts`.

#### CAP-11 "Add several links" text area
- What it does: Under the Link field (add mode only) the line "Have several links? Paste them all at once" with a ghost button "Add several links". It swaps the form for a large text area "Paste links, one per line or inside any text" (placeholder "https://…", hint "Up to {{max}} links at a time. You check the list before anything is saved.", spell-check off, focus moves in). Pasting there is plain text entry (several pastes, editing, Enter = new line). "Find links" or ⌘/Ctrl+Enter reads the text with the paste-many parser and opens the paste-many list. "One link" goes back to the single form with focus on Link.
- Entry points: "Add several links" button in Add link.
- Screens / routes: SCR-CAP-02.
- Platforms: all (phone sheet the same).
- States: empty submit "Paste or type some links"; no link found "No links found in this text".
- Data: none until saved (CAP-12).
- Settings that change it: none.
- Feedback: field errors.
- Limits: 100 links kept per paste; 500 000 characters read.
- Related: CAP-12.
- Source: `add-several-links.service.ts`, `add-link-dialog.component.html`.

#### CAP-12 Paste many list (review and save several links)
- What it does: Text with more than one link pasted into the Link field, handed over by ⌘V in the library, or found with "Find links", turns the dialog into a list. Parsing: explicit http(s) links anywhere in the text; bare domains when they have a path, a `www.` host, or are alone on their line and do not look like a file name; sentence punctuation trimmed (a closing parenthesis kept when the link opened one); `https://` added; links with user/password dropped; the same link twice (normalised, tracking params/fragment/trailing slash ignored) kept once; lines without a link listed as skipped (up to 20, each cut to 80 characters); at most 100 links, the rest counted. Each row is checked by default and loads its preview in the background (3 at a time); already saved links come unchecked with an "Already saved" badge. Rows can be unchecked, removed (×), or all toggled with "Select all". "Folder for all" and "Tags for all" start from what was chosen in the single form. Domain rules show per row; "Apply domain rules" switches them for the batch. "Save N links" sends one batch request with one idempotency key per row. Focus starts on "Select all"; removing a row moves focus to the next row.
- Entry points: paste of ≥2 links into Link field (add mode only), "Find links", ⌘V in library with ≥2 links.
- Screens / routes: SCR-CAP-03.
- Platforms: phone sheet: no Cancel. Otherwise same.
- States: rows loading ("Loading preview" as row meta), preview failed or rate-limited (row keeps its address as title, host as meta), duplicates, saving ("Saving…"), none selected (title "Add links", button "Save links" disabled), save error notice.
- Data: `POST /api/links/preview` per row; `POST /api/links/batch` (`items[{url, idempotencyKey, title?, faviconUrl?, imageUrl?, folderId?, tags?}]`, `folderId?`, `tags?`, `applyRules?`); Undo: `POST /api/links/batch/delete`.
- Settings that change it: "New links go to" (initial folder), domain rules.
- Feedback: success toast (8 s, Undo, action hint "Press {{shortcut}} to reach {{action}}"): "{{count}} link(s) saved to {{folder}}" with detail "Titles and previews are still loading"; when rules sent links to different folders: "{{count}} link saved" / "{{count}} links saved to their folders". Some skipped by server: warn toast, detail "{{count}} link was skipped: it was a repeat or too long" / "{{count}} links were skipped: repeats or too long". None saved: danger toast "No links were saved" + skipped detail. Undo removes the links from the feed at once and deletes them in one request; failure brings them back with toast "Couldn't undo" / "The links are still saved".
- Limits: 100 links per batch; 5 batch saves/min; link cap — error "Only {{fit}} more link fits your shelf. Uncheck some and try again." / "Only {{fit}} more links fit your shelf. Uncheck some and try again."; 0 fit → "You have reached the limit of {{max}} saved links. Delete some to save more."
- Related: CAP-11, CAP-13, IMP (for bigger lists).
- Source: `components/paste-many/*`, `services/link-actions.service.ts` (`noteSavedMany`, `undoSavedMany`), `apps/api/src/links/links-batch.service.ts`.

#### CAP-13 Paste links anywhere in the library (⌘V / Ctrl+V)
- What it does: In the library page, with focus outside any editable field and no dialog open, a paste whose text contains at least one link opens Add link: one link fills the Link field (preview runs), several open the paste-many list directly. Text without links is ignored. The open folder is preselected.
- Entry points: ⌘V / Ctrl+V on the library page (listed in the shortcuts list as "Paste links into the library").
- Screens / routes: library routes (`/links`, `/unsorted`, `/favorites`, `/folders/:id`, …).
- Platforms: any with a keyboard / paste event; not on other pages (Tags, Settings, Search page).
- States: ignored inside fields, while a dialog is open, when event already handled.
- Data: as CAP-01 / CAP-12.
- Settings that change it: none.
- Feedback: dialog opens.
- Limits: as CAP-12.
- Related: CAP-01, CAP-12, shortcuts (other area).
- Source: `features/library/directives/library-hotkeys.directive.ts`, `features/shortcuts/models/shortcut-groups.const.ts`.

#### CAP-14 Keyboard in the add-link dialog
- What it does: ⌘/Ctrl+Enter submits from any field (shown in footer as "⌘ Enter to create" / "Ctrl Enter to create" on non-phone when AI is off); Enter in a single-line field submits; Alt/Option+Shift+F runs Fill in with AI; Esc closes. In the several-links text area ⌘/Ctrl+Enter = "Find links", Enter = new line.
- Entry points: keyboard.
- Screens / routes: SCR-CAP-01, SCR-CAP-02.
- Platforms: desktop/tablet (hint hidden on phone).
- States: blocked while saving or AI busy.
- Data: none.
- Settings that change it: AI on hides the hint.
- Feedback: none.
- Limits: none.
- Related: shortcuts list (other area).
- Source: `add-link-dialog.component.ts` (`onKeydown`), `add-several-links.service.ts`.

#### CAP-15 Edit mode of the same dialog (Edit link)
- What it does: The same dialog opened with an existing link ("Edit link"): prefilled fields, no "Add several links", no preview card (only a duplicate check when the address changes), Title required ("Enter a title"), extra fields "Type" (link kind select) and "Add to favorites" checkbox, reminder line ("Reminder: {{when}}" / "No reminder") with "Remind me" / "Change", meta line "Saved {{created}}, last opened {{opened}}" / "Saved {{created}}, never opened", Delete button, primary "Save changes" ("Saving…"). Only changed fields are sent. Delete and Remind close the dialog and hand over to the caller (confirm/undo live there).
- Entry points: card/row menu Edit, "Open saved" from a duplicate (other area).
- Screens / routes: SCR-CAP-01 (edit variant).
- Platforms: Delete icon-only on tablet+ with AI on; labelled otherwise.
- States: as CAP-01.
- Data: `PATCH /api/links/:id`.
- Settings that change it: AI (summary).
- Feedback: "Changes saved" toast (caller, other area).
- Limits: as CAP-01.
- Related: link editing (other area).
- Source: `add-link-dialog.component.*`, `add-link-save.service.ts` (`changes`).

#### CAP-16 Web Share Target quick save (`/share`)
- What it does: The installed PWA appears in the Android share menu (manifest `share_target`, GET `/share?url=&text=&title=`). The page reads the first http(s) URL from `url`, else a bare host in `url` gets `https://`, else the first http(s) URL inside `text`; `title` is only a title hint. Other schemes, credentials, over-long URLs are ignored; invisible/control characters are stripped; each parameter is read up to 8192 characters. A usable URL shows a quick save sheet: logo, "Save to Shelfmark", "Shared from another app", duplicate notice, preview card (letter thumbnail, favicon letter, host, title — skeleton while loading without a hint —, description, address), preview failure notice, domain-rule chip, Folder select, Note field, "Save" (or "Save anyway" for a duplicate, "Saving…"), "Cancel", footnote "After saving you land in your library." Saving uses `POST /api/links`, then goes to `/links` with the usual "Saved to …" toast. Cancel goes to `/links` saving nothing. No usable URL: "Nothing to save" sheet. A signed-out user is sent to sign-in and comes back with the query intact.
- Entry points: Android system share sheet (installed PWA); direct URL.
- Screens / routes: SCR-CAP-04, SCR-CAP-05; `/share` (outside the shell).
- Platforms: phone: bottom-sheet styling with a grip; larger screens centred card. iPhone: no share target (iOS limitation, PROJECT.md).
- States: form, invalid, preview loading/ready/failed, saving, save failed "Couldn't save the link. Try again.", guest → sign-in.
- Data: `POST /api/links/preview` (no debounce), `POST /api/links` (`url`, `title?`, `note?`, `folderId?`, rule `tags?`, `applyRules?`); no idempotency key; no tags field (only rule tags).
- Settings that change it: "New links go to" (initial folder unless a rule set one), domain rules, "Fetch titles and previews" (server side).
- Feedback: toast after navigation; live region for preview and duplicate.
- Limits: note ≤ 2000; title cut to 300.
- Related: CAP-03, CAP-04, CAP-08, extension save (other area).
- Source: `apps/web/src/app/features/share/*`, `apps/web/public/manifest.webmanifest`, `app.page-routes.ts`.

#### CAP-17 Server-side metadata fetching (preview and save)
- What it does: `POST /api/links/preview` loads the page through the SSRF-safe fetcher (only http/https, allowed ports, blocked private/internal IP ranges and host names, DNS pinning, max 3 redirects and 6 s total for previews, 3 s connect timeout, 2 MB body, HTML content types only) and extracts: title (og:title, twitter:title, `<title>`, else the URL; ≤ 300), description (og:description, twitter:description, description; ≤ 1000), image (og:image, og:image:url, twitter:image, twitter:image:src), favicon (`<link rel=icon>`, apple-touch-icon, else `/favicon.ico` of the origin), kind (og:type, host rules, schema.org JSON-LD type such as Recipe, PDF content type = document). YouTube video links ask YouTube oEmbed first, then fall back to the page within the same time budget. Every failure (blocked, DNS, timeout, size, non-HTML, parse error) returns 200 with `fetched: false` and the URL as title, so internal hosts cannot be probed. With "Fetch titles and previews" off the page is never loaded. The response also carries the duplicate. `POST /api/links` without a title loads the page itself for the title (URL when that fails). Batch saves and imports never fetch; their titles and images come later from the lazy image capture.
- Entry points: Add link, Share target, paste many rows, browser extension.
- Screens / routes: API.
- Platforms: all clients.
- States: fetched / not fetched.
- Data: `LinkPreviewResponse`; `POST /api/links/lookup` (extension: duplicate only, never fetches).
- Settings that change it: "Fetch titles and previews".
- Feedback: n/a.
- Limits: 20 previews/min per IP; parse limited to first 32 768 characters of the head; 4 JSON-LD scripts.
- Related: CAP-03, link images (other area).
- Source: `apps/api/src/links/link-preview.service.ts`, `links.service.ts`, `models/preview-fetch-limits.const.ts`, `apps/api/src/fetcher/*`, `apps/api/src/preview/*`.

#### CAP-18 Saving settings that affect capture
- What it does: Settings › Library › Saving: "New links go to" ("When you paste a link without picking a folder") sets the default folder of Add link, paste many and Share target; "Fetch titles and previews" ("Turn off to save only the address") switches page loading for previews and saves. "Browser extension" row with "Install" (Chrome Web Store, new tab).
- Entry points: Settings › Library.
- Screens / routes: `/settings/library` (other area owns the page).
- Platforms: all.
- States: failure toast "Couldn't save the setting" / "It is back to how it was." (settings area).
- Data: user settings `newLinksFolderId`, `fetchPreviews`.
- Settings that change it: n/a.
- Feedback: as settings area.
- Limits: none.
- Related: settings (other area).
- Source: `features/settings/pages/library`, `stores/user-settings.store.ts`.

#### IMP-01 Import dialog and its entry points
- What it does: "Import links" dialog in steps: 1 choose the file → 2 check → 2a AI groups (optional) → 3 importing → done. Opens only when no other dialog is open. A run continues when the dialog is closed; reopening while it runs shows the progress.
- Entry points: desktop sidebar footer row "Data & help" → menu item "Import links"; phone/compact You tab (Settings index) row "Import links" in the group "Import and export" (opens as a sheet; no-script fallback is a link to Privacy and data); Settings › Privacy and data › "Import and export" › "Import links" row, button "Open". Not offered in onboarding, empty states or Account › Your data (see Observations).
- Screens / routes: SCR-IMP-01…05, SCR-IMP-06, SCR-IMP-07, SCR-IMP-08.
- Platforms: medium dialog on desktop/tablet; bottom sheet on phone with full-width footer buttons.
- States: see steps.
- Data: see IMP-02…IMP-11.
- Settings that change it: AI on/off (AI groups option).
- Feedback: per step.
- Limits: see IMP-02.
- Related: EXP-01.
- Source: `features/import/services/import-dialog.service.ts`, `components/import-dialog/*`, `shell/sidebar/sidebar.component.*`, `features/settings/pages/settings-index`, `features/settings/pages/privacy-data`.

#### IMP-02 Choose the file (step 1)
- What it does: A drop zone (illustration, heading "Browser bookmarks", text "HTML file from Chrome, Safari, Firefox or Edge. Folders become folders.", "or drag the file here", button "Choose file", hint ".html, up to {{max}} MB and {{links}} links"). A file can be dropped anywhere on the dialog during this step; while dragging the label reads "Release to import". While reading: spinner "Reading {{file}}…". The file is parsed in the browser; only the duplicate check reaches the server. A source radio group shows only when more than one source exists (today only Browser bookmarks).
- Entry points: drop, "Choose file".
- Screens / routes: SCR-IMP-01.
- Platforms: all; drag and drop only where supported.
- States: idle, dragging, reading, problem (danger notice, zone marked invalid). Problems (exact): "This file is larger than {{max}} MB."; "This file could not be read. Try exporting it again."; "There are no bookmarks in this file. Choose the HTML file your browser saved with “Export bookmarks”."; "There are no web links in this file."; "This file holds more than {{max}} links."; "Could not compare the file with your shelf. Try again."
- Data: `POST /api/imports/check` in chunks of ≤500 URLs → `{ saved: number[], room }`.
- Settings that change it: none.
- Feedback: status line; notices.
- Limits: file ≤ 50 MB; ≤ 10 000 links; accepted `.html,.htm,text/html`; file name stored ≤ 255.
- Related: IMP-03, IMP-04, IMP-05, IMP-10 (Recent imports shown under the zone).
- Source: `import-dialog.component.*`, `import-flow.service.ts`, `directives/file-drag.directive.ts`.

#### IMP-03 "How to export bookmarks from a browser" help
- What it does: Toggle button under the drop zone expands steps per browser, with key caps for the platform. Mac: Chrome (⌘⌥B), Edge via ⋯ menu, Firefox (⌘⇧O), Safari. Other: Chrome (Ctrl+Shift+O), Edge (Ctrl+Shift+O), Firefox (Ctrl+Shift+O); no Safari.
- Entry points: "How to export bookmarks from a browser" button (aria-expanded).
- Screens / routes: SCR-IMP-01.
- Platforms: content differs Mac vs other.
- States: collapsed/expanded.
- Data: none.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: IMP-02.
- Source: `components/import-help/*`.

#### IMP-04 Reading browser bookmark files
- What it does: Netscape bookmark HTML (Chrome, Safari, Firefox, Edge). Folders (`<H3>`) become folders; links keep title, `TAGS` as tags (≤ 20, normalised), `ADD_DATE` as the date added (seconds or milliseconds; clamped), a following `<DD>` as the note. Only http(s) links are kept (others counted as "not a web page"); tracking parameters stripped; folders deeper than 8 levels join their deepest kept ancestor; empty folders dropped; unnamed folders named "Untitled folder". Parsed into a detached document, never rendered.
- Entry points: step 1.
- Screens / routes: n/a.
- Platforms: browser.
- States: parse errors map to problems in IMP-02.
- Data: `ParsedImport { folders, links, notWeb }`.
- Settings that change it: none.
- Feedback: none.
- Limits: depth 8; tags 20 per link.
- Related: IMP-02.
- Source: `utils/parse-netscape-bookmarks.ts`, `utils/bookmark-date.ts`, `utils/storable-url.ts`.

#### IMP-05 Duplicates and room check
- What it does: The URLs are compared with the user's live links (read-only). Counts: links in file, folders, already saved, repeats inside the file. "Skip the {{count}} duplicate(s)" (hint "Links already on your shelf and repeats inside the file") is on by default. `room` = how many more links fit the limit; only the first ones that fit are imported, with a warning.
- Entry points: automatic after reading.
- Screens / routes: SCR-IMP-02.
- Platforms: all.
- States: over room: "Only {{count}} more link fits your limit, so just the first one is imported." / "Only {{count}} more links fit your limit, so just the first {{count}} are imported."; no room "Your shelf has no room for more links."; nothing new "Every link in this file is already on your shelf." (import button disabled at 0).
- Data: `POST /api/imports/check`.
- Settings that change it: none.
- Feedback: notices.
- Limits: 10 000 links per user (demo 100).
- Related: IMP-06.
- Source: `import-flow.service.ts`, `utils/plan-import.ts`, `import-review.component.*`.

#### IMP-06 Check before importing (step 2)
- What it does: Dialog title becomes the file name. Stats "In this file": N link(s), N folder(s), N "already on your shelf". "Put them into" searchable select: "New folder “Imported bookmarks”" (default), any of the user's folders, or "Unsorted". Duplicates checkbox (IMP-05). "Folders inside" radio cards: "As in the file" ("{{count}} browser folder(s)"; only when the file has folders), "Let AI sort them by topic" (spark, AI tone; description "AI groups the links and suggests folders, including ones you already have. You review the groups before importing. Uses {{count}} of {{left}} runs for existing links."; only while AI is on, the provider is available, the backfill allowance has room for all links and ≤ 2000 links), "No folders" ("Everything in one list in “{{target}}”"). Default: As in the file when the file has folders, else AI when offered, else No folders. Footer: "Back" (to step 1) and primary "Import {{count}} link(s)" or, with AI chosen, AI button "Group".
- Entry points: after step 1.
- Screens / routes: SCR-IMP-02.
- Platforms: phone: buttons full width, wrap.
- States: room notices; disabled primary at 0.
- Data: none written.
- Settings that change it: AI settings and allowance.
- Feedback: notices.
- Limits: as IMP-05.
- Related: IMP-07, IMP-08.
- Source: `import-review.component.*`, `import-dialog.component.html`.

#### IMP-07 AI groups by topic (step 2a)
- What it does: "AI is grouping {{count}} link(s)…" spinner, then "{{n}} group(s) for {{m}} link(s)". Each group: checkbox (included), editable "Folder name" for a new group (error "Give the folder a name") or plain name for an existing folder, link count, badge "new" or "already there", expand button "Show the links of “{{name}}”" / "Hide the links of “{{name}}”". Expanded: each link title (URL as tooltip) with a select "Move “{{title}}” to" another group or Other. Collapsed: sample titles. Last row "Other" with "Links that fit no topic go to “{{target}}”." Hint "You can rename the folders. Links you take out of a group go to “{{target}}”." Primary "Import and create {{count}} folder(s)" (or "Import N links" when no new folders); disabled while loading or a new name is empty. Back returns to step 2 and gives the allowance back; closing the dialog also gives it back.
- Entry points: "Group" in step 2.
- Screens / routes: SCR-IMP-03.
- Platforms: all.
- States: loading; errors (danger notice, primary becomes plain "Import N links" as in the file): "The links could not be grouped right now. Nothing was used from your allowance. Go back, or import them without groups."; "Not enough of the allowance for existing links is left for these links. Go back, or import them without groups."; "You have already grouped as many links with AI this month as you can. Import them as in the file, or without folders."
- Data: `POST /api/imports/groups`, `DELETE /api/imports/groups` (release units).
- Settings that change it: AI.
- Feedback: status heading.
- Limits: ≤ 2000 links per grouping; ≤ 12 groups; 10 grouping requests per hour; monthly cap; backfill allowance.
- Related: AI area, IMP-11.
- Source: `import-groups.component.*`, `import-groups.service.ts`, `apps/api/src/imports/import-groups.service.ts`.

#### IMP-08 Import run (step 3: progress)
- What it does: Starts the import (folders created in one transaction), then sends links in batches of up to 100 one after another. A failed batch is retried after 1 s and 3 s for network/429/5xx; otherwise counted as failed and the next one runs; session/forbidden/not found/conflict stop the run and count the rest as failed. Shows "Importing links", "{{done}} of {{total}}", a meter "Import progress" and "You can keep working: you can close this window. Previews load in the background over the next few minutes." Footer "Minimize" closes the dialog; the run continues and a toast "{{count}} link(s) imported" appears when it ends unseen. At the end the library, tags, pins, Trash, links and Recent imports refresh and other tabs are told.
- Entry points: primary button of step 2 / 2a.
- Screens / routes: SCR-IMP-04.
- Platforms: all.
- States: running, done, failed start: "The import could not start, nothing was saved. Try again." or "The folders do not fit your folder limit. Choose “No folders” and try again." with button "Back" (to step 2, same choices).
- Data: `POST /api/imports` (`source`, `fileName`, `newFolderName` or `targetFolderId`, `aiPass?`, `folders[]`), `POST /api/imports/:id/links` (`items`, `skipRepeats: false`), `POST /api/imports/:id/finish` (`skipped`, `failed`).
- Settings that change it: none.
- Feedback: progress, toast when closed.
- Limits: import open 24 h for batches; folders must fit 500-folder limit; rate limits ImportStart 10/min, ImportBatch 120/min.
- Related: IMP-09.
- Source: `services/import-run.service.ts`, `import-progress.component.*`, `apps/api/src/imports/*`.

#### IMP-09 Import summary (done)
- What it does: Check badge, "{{count}} link(s) imported", then a line built of: "In “{{name}}”." (new folder) / "In Unsorted." / "In the folder you chose."; "{{count}} folder(s)."; with AI groups instead "In {{count}} folder(s), {{created}} of them new."; "{{count}} skipped: already saved, repeated or not a web page."; "{{count}} could not be saved." Footer: ghost "Undo import" (only when something was created) and primary "Open the folder" / "Open Unsorted" (navigates and closes).
- Entry points: end of run.
- Screens / routes: SCR-IMP-04.
- Platforms: all.
- States: done.
- Data: run state.
- Settings that change it: none.
- Feedback: role=status.
- Limits: none.
- Related: IMP-10.
- Source: `import-progress.component.ts`, `import-dialog.component.*`.

#### IMP-10 Undo import and Recent imports
- What it does: "Recent imports" section in step 1 lists imports of the last 7 days not undone (max 10): file name, date · "N link(s), N folder(s), N skipped, N failed", ghost "Undo import" (aria "Undo import: {{name}}"), hint "Undo import is available for 7 days." Undo (also from the summary) asks first; then everything the import created goes to Trash (links, its folders, tags it added that nothing else uses); later additions stay. The library refreshes; other tabs are told.
- Entry points: Recent imports row button; summary "Undo import".
- Screens / routes: SCR-IMP-01, SCR-IMP-04, SCR-IMP-05.
- Platforms: buttons larger on compact.
- States: undoing (button spinner); list hidden when empty.
- Data: `GET /api/imports`, `POST /api/imports/:id/undo` → `{ links }`.
- Settings that change it: none.
- Feedback: confirmation (SCR-IMP-05); toast "Import undone" / "{{count}} link(s) moved to Trash"; failure toast "Could not undo the import. Try again."
- Limits: 7 days, once; 10 listed; ImportUndo 10/min.
- Related: Trash (other area).
- Source: `services/recent-imports.store.ts`, `components/recent-imports/*`.

#### IMP-11 AI pass after an import
- What it does: An import made with AI groups asks for the usual AI pass (summaries, kind, tag suggestions) as a scoped backfill. The app polls the import gently and, when done, shows a toast (12 s) "Descriptions and tags are ready" with "{{count}} link(s) got a short description." and "There are tag suggestions for {{count}} link(s)."; with suggestions an action "Review tags" opens Tidy limited to this import. Undoing the import stops the watch.
- Entry points: automatic.
- Screens / routes: Tidy `/tidy?import=…` (AI area).
- Platforms: all.
- States: done / skipped / timed out (silent).
- Data: `GET /api/imports/:id` (`ai: { state, summaries, suggestions }`).
- Settings that change it: AI on.
- Feedback: toast.
- Limits: poll max time `IMPORT_AI_POLL.MaxMs`.
- Related: AI (other area).
- Source: `services/import-ai-follow.service.ts`.

#### EXP-01 Export dialog (whole library)
- What it does: Small dialog "Export" with radio cards "File format": "JSON" ("Everything: links, folders, tags, notes, reminders"), "Bookmarks HTML" ("Opens in the bookmark import of any browser"), "CSV" ("For spreadsheets"); JSON preselected. Under the cards "Last export: {{when}}, {{format}}." (this browser only). "Download": cards and Download disabled, spinner "Preparing the {{format}} file…"; when saved the dialog closes with toast "File saved" and the last-export line is remembered. Cancel aborts the request and closes. Failure keeps the dialog open; the error toast has the retry. Empty library: info toast and the dialog closes.
- Entry points: sidebar "Data & help" → "Export"; You tab row "Export"; Settings › Privacy and data › "Export" row "Open".
- Screens / routes: SCR-EXP-01.
- Platforms: desktop/tablet small dialog; phone bottom sheet, full-width buttons.
- States: idle, preparing, failed (toast), empty (toast).
- Data: `GET /api/export?format=json|html|csv` (blob download via temporary `<a download>`); last export in localStorage.
- Settings that change it: none.
- Feedback: toasts "File saved"; "Couldn't export your links" / "Check your connection, then try again" with "Try again"; "Nothing to export yet" / "Save a link first, then you can export your library".
- Limits: 5 exports/min per IP; one export at a time (a second click while one runs is ignored).
- Related: EXP-02, EXP-03, EXP-05.
- Source: `features/export/*`.

#### EXP-02 Library Export menu (this view / everything)
- What it does: Desktop/tablet library toolbar: secondary button "Export" (icon download; icon-only while the split view or preview is open) opening a menu "Export": when the current view has an export scope (folder with subfolders, tags, search text, kind), three items "This view as JSON", "This view as Bookmarks HTML", "This view as CSV", a separator, then "Everything as JSON", "Everything as Bookmarks HTML", "Everything as CSV". Unsorted, Favorites and plain All links have no "This view" items. Phone: the same items under the label "Export" at the end of the "Options" menu ("Sort, view and export"). Download starts at once (no dialog, no "last export" memory).
- Entry points: library toolbar; phone Options menu.
- Screens / routes: SCR-EXP-02, SCR-EXP-03.
- Platforms: as described.
- States: empty view → info toast "Nothing to export in this view" / "This view has no links. Export everything, or open another view"; empty library → "Nothing to export yet"; failure toast with "Try again".
- Data: `GET /api/export?format=…&folderId=&tag=&tag=&q=&kind=`.
- Settings that change it: none.
- Feedback: toasts.
- Limits: 5/min.
- Related: EXP-05.
- Source: `features/library/library.page.html`, `library.page.ts` (`exportView`, `exportAll`), `features/export/utils/export-url.ts`.

#### EXP-03 Account › Your data downloads
- What it does: Settings › Account, section "Your data": one row per format (icon, "JSON"/"Bookmarks HTML"/"CSV" and its description) with a "Download" button (aria "Download {{format}}"); downloads the whole library directly. Opening `/settings/account#your-data` scrolls the section into view once the page settles.
- Entry points: Settings › Account; redirects from `/settings/import-export`.
- Screens / routes: SCR-EXP-04, `/settings/account#your-data`.
- Platforms: buttons large on compact.
- States: as EXP-02 toasts.
- Data: `GET /api/export?format=…`.
- Settings that change it: none.
- Feedback: toasts (no "File saved").
- Limits: 5/min.
- Related: EXP-04.
- Source: `features/settings/pages/account/*`.

#### EXP-04 Old export page redirect
- What it does: `/settings/import-export` redirects to `/settings/account#your-data`.
- Entry points: old links/bookmarks.
- Screens / routes: `/settings/import-export`.
- Platforms: all.
- States: none.
- Data: none.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: EXP-03.
- Source: `features/settings/settings.routes.ts`.

#### EXP-05 Export file contents (API)
- What it does: Streams the file as an attachment named `shelfmark-YYYY-MM-DD.json|html|csv` (`no-store`, `nosniff`). JSON: `schemaVersion`, `exportedAt`, `folders[{path, createdAt, updatedAt}]`, `links[{url, title, kind, note, isFavorite, folderPath, tags, lastOpenedAt, createdAt, updatedAt}]`, `rules[{domain, folderPath, tags, createdAt}]` (rules only in a full export). HTML: Netscape bookmark file "Shelfmark bookmarks" with folders as `<H3>`, links with `ADD_DATE`, `LAST_MODIFIED`, `TAGS` (commas in tag names become hyphens) and the note as `<DD>`; non-http(s) links dropped. CSV: UTF-8 BOM, columns `url,title,folder,tags,note,favorite,kind,created_at`, folder path joined with " / ", formula-looking cells prefixed with `'`. Filters: `folderId` (with subfolders), repeated `tag` (all must match), `q` (title, note, URL), `kind`. Foreign folder → 404. A stream failure after the first bytes truncates the download.
- Entry points: EXP-01..03.
- Screens / routes: `GET /api/export`.
- Platforms: n/a.
- States: n/a.
- Data: user's live links only.
- Settings that change it: none.
- Feedback: n/a.
- Limits: 5/min per IP.
- Related: IMP-04 (HTML round trip).
- Source: `apps/api/src/export/*`, `libs/shared/contracts/src/export/*`.

#### SHR-01 Share a folder (public folder switch)
- What it does: "Share…" in the folder menu opens "Share folder “{{name}}”" with the link count "{{count}} link(s), subfolders included". A "Public folder" switch ("Anyone with the link can view this folder. No account needed."), off by default. On creates a public link; off ends it at once (turning it on again makes a new link). Every change waits for the server (not optimistic); a failure puts the switch back and shows a notice. Footer "Done" closes.
- Entry points: sidebar folder menu "Share…" (desktop sidebar, phone Library folder list).
- Screens / routes: SCR-SHR-01.
- Platforms: medium dialog; phone sheet.
- States: loading "Loading the sharing settings…"; load failed "Couldn't load the sharing settings." + "Try again"; demo (info notice, no controls) "Demo accounts can't share folders. Sign in to share yours."; busy (switches/buttons disabled); errors: limit "You can share up to {{max}} folders. Make another folder private first."; demo 403 (same demo copy, danger); "Couldn't save the change. Try again."
- Data: `GET /api/folders/:id/share`, `POST` (enable), `DELETE` (disable).
- Settings that change it: none.
- Feedback: notices; footer line "Notes stay private unless you turn them on."
- Limits: 10 public folders per user; Share rate limit 20/min.
- Related: SHR-02..05, folders (other area).
- Source: `features/sharing/components/share-folder-dialog/*`, `services/folder-share.store.ts`, `features/folders/services/folder-actions.service.ts`, `apps/api/src/shares/*`.

#### SHR-02 Copy the folder link
- What it does: When public: read-only field "Folder page address" with `{origin}/c/{token}` and primary "Copy link". Copies via the Clipboard API with toast "Folder link copied"; if refused, the field is selected and a notice says "Copying isn't allowed here. The link is selected: press Ctrl+C or ⌘C to copy it."
- Entry points: "Copy link".
- Screens / routes: SCR-SHR-01.
- Platforms: all.
- States: copy failed.
- Data: token.
- Settings that change it: none.
- Feedback: toast / notice.
- Limits: none.
- Related: SHR-05 (page has its own Copy link).
- Source: `share-folder-dialog.component.ts`.

#### SHR-03 Show my notes
- What it does: Under "Link settings": switch "Show my notes" ("Guests see why you saved each link"), off by default; when on the public page shows each link's note.
- Entry points: switch.
- Screens / routes: SCR-SHR-01.
- Platforms: all.
- States: busy; failure reverts.
- Data: `PATCH /api/folders/:id/share` `{ showNotes }`.
- Settings that change it: n/a.
- Feedback: error notice on failure.
- Limits: none.
- Related: SHR-05.
- Source: `share-folder-dialog.component.*`, `folder-share.store.ts`.

#### SHR-04 Reset link
- What it does: "Reset link" ("The old folder link stops working at once") with button "Reset" → destructive confirmation → new token; old link 404s.
- Entry points: "Reset".
- Screens / routes: SCR-SHR-01, SCR-SHR-02.
- Platforms: all.
- States: busy.
- Data: `POST /api/folders/:id/share/reset`.
- Settings that change it: none.
- Feedback: toast "Link reset" / "The old link no longer works".
- Limits: Share 20/min.
- Related: SHR-05.
- Source: `share-folder-dialog.component.ts`.

#### SHR-05 Public collection page (`/c/:token`)
- What it does: Read-only page for anyone with the link, outside the app shell, no guard. Header: logo link to home ("Shelfmark home"), "Sign in" (guest, ghost) or "Back to my shelf" (signed in). Intro: avatar + "Shared by {{name}}" (owner's first name; "Shared on Shelfmark" when no usable name), folder name (h1), "{{count}} link(s)" and "Updated {{time}}" (relative), "Copy link". Subfolder chips (group "Subfolders"): "All" with total count, one per direct subfolder with its count (pressed state). Grid of read-only link cards (no favorite, no menu; favicon/image via public endpoints; notes only when allowed). "Show more" loads the next 50 (up to 500); at the cap "This page shows the newest {{max}} links." Guest CTA panel "Keep your own links like this" / "Shelfmark saves videos, articles, things to buy and courses on one calm shelf." / "Start your shelf" (to sign-in). Footer link "Made with Shelfmark" (to /about). Page title becomes the folder name; `noindex, nofollow` meta while open.
- Entry points: shared URL.
- Screens / routes: SCR-SHR-03, `/c/:token`.
- Platforms: responsive grid; same for all sizes.
- States: loading "Loading the collection…"; not found (unknown, off, reset, folder in Trash) "This collection isn't available" / "The link may be mistyped, or the owner turned it off or reset it." / "Go to Shelfmark"; failed "Couldn't load the collection." + "Try again"; empty "No links here yet" / "The owner hasn't saved anything in this folder."
- Data: `GET /api/public/collections/:token?folder=&page=` → `{ ownerName, name, linkCount, updatedAt, subfolders[{id,name,linkCount}], items[{id,url,title,note,faviconUrl,imageUrl}], page, hasMore }`; images `GET /api/public/collections/:token/links/:linkId/favicon|image`.
- Settings that change it: owner's "Show my notes".
- Feedback: copy toast "Link copied"; failure toast "Couldn't copy the link" / "Copy it from the address bar".
- Limits: 500 links shown, pages of 50 (max 10 pages); rate limits 30/min (page), 240/min (images); responses `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-store`.
- Related: SHR-01, languages for guests (other area).
- Source: `features/sharing/public-collection.page.*`, `services/public-collection.store.ts`, `apps/api/src/shares/public-collections.*`.

#### SHR-06 Public link privacy and token rules (API)
- What it does: Token = 16 random bytes, 22 base64url characters; one indexed lookup; the same 404 "Collection not found" for unknown, disabled, reset tokens and anything outside the shared subtree. Only owner's first name (first word, ≤ 50, never an email-looking name), folder names, link titles, URLs and same-origin image paths are exposed; no tags, favorites, opens, user ids. Demo users cannot enable (403). A folder in Trash keeps its link but shows not found; restoring brings the same link back; deleting forever removes it.
- Entry points: API.
- Screens / routes: n/a.
- Platforms: n/a.
- States: n/a.
- Data: share row (folder, token, showNotes, createdAt).
- Settings that change it: n/a.
- Feedback: n/a.
- Limits: 10 per user.
- Related: SHR-01, SHR-05.
- Source: `apps/api/src/shares/*`, `libs/shared/contracts/src/shares/*`, PROJECT.md story 25.

### 3.5 Settings, account, feedback and admin

Scope: Settings (`/settings/*`), the phone "You" list, Account (profile, shelf numbers, connected accounts, Your data, sign out, delete account), Appearance, Library settings, Language, Keyboard shortcuts (page, "?" dialog, every key handler of the app), Privacy and data, Your feedback, the Send feedback dialog, the rating prompt, the admin pages (`/admin/feedback`, `/admin/stats`), the settings API (`/api/me`, `/api/me/settings`, `/api/me/stats`), the feedback API and the admin API. `/settings/ai` and `/settings/library/cleanup` are covered by the AI area (entry points only here). Export and import dialogs are covered by the capture area (entry points only here). Domain rules (Settings › Library › Rules) are covered by the organise area (RUL-01 … RUL-11); Trash retention is also described there as TRS-09.

Breakpoint words used below: "compact" = below 64em (phones and tablet portrait: tab bar, You list, no sidebar); "phone" = below 40em (bottom sheets, block buttons); "desktop" = from 64em (sidebar or settings nav beside the page).

#### SET-01 You list (settings index on compact screens)
- What it does: On screens below 64em the "You" tab opens a list page that replaces the settings nav: an account card, one row per settings section (only sections marked for phone), admin rows for the author, Import / Export rows, Send feedback, help rows (What's new, About Shelfmark), How it works, Sign out, privacy policy link and version. Each row opens that section as its own page.
- Entry points: Tab bar "You" tab (icon user, href `/settings`); URL `/settings`; the phone back control "You" on every settings page.
- Screens / routes: SCR-SET-01; `/settings` (pathMatch full, `settingsIndexGuard`).
- Platforms: Compact only (below 64em, so phones and tablet portrait). From 64em the guard redirects `/settings` to `/settings/account`; if the window grows past 64em while the list is open, it navigates to `/settings/account` with `replaceUrl`.
- States: Signed-in only (guest is sent to sign-in and back). Account card only while the user is known. Admin rows only while `isAdmin()`. "What's new" row shows a dot with screen-reader text "new" while a release is unseen.
- Data: reads session user (name, email, image), theme preference, language setting, admin status, what's new pending state.
- Settings that change it: Theme (value at end of Appearance row), Interface language (value at end of Language row, in its own name with `lang` attribute; "Match my browser" when browser is chosen).
- Feedback: none of its own.
- Limits: none.
- Related: SET-02, ACC-01, FBK-01, ADM-01, import and export dialogs (capture area), What's new and About (other area), How it works (other area).
- Source: `features/settings/pages/settings-index/settings-index.page.{ts,html}`, `settings-index.guard.ts`, `models/settings-nav-entries.const.ts`, `shell/app-shell.component.ts` (tabs).

#### SET-02 Settings navigation and page header (tablet landscape / desktop)
- What it does: On `/settings/*` from 64em, a settings nav takes the place of the sidebar: "Back to links", a "Settings" heading, one row per section (all eight), the version line. The current section row is marked `aria-current="page"`. The header search and Ask button are hidden on settings pages. Every settings page starts with a title and a one-line description; on compact screens a back control above the title returns to the You list (or to a deeper parent for AI sub-pages).
- Entry points: Account menu "Settings" (goes to `/settings`, which redirects to `/settings/account` on desktop); any `/settings/<section>` URL.
- Screens / routes: SCR-SET-02; all `/settings/*`.
- Platforms: Nav only from 64em (desktop shell). Below 64em there is no nav; the page header shows a ghost back button labelled "You" (accessible name "Back to You").
- States: none.
- Data: none.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: SET-01.
- Source: `features/settings/components/settings-nav/*`, `components/settings-page-header/*`, `shell/app-shell.component.html` (`inSettings()`), `shell/phone-tab-for-url`.

#### SET-03 Theme choice
- What it does: Picks the app theme: System (follows the OS light/dark), Light, Dark or Custom. Light and Dark are fixed; Custom opens the custom theme controls (SET-04). Applies to the whole app at once, saved on the account.
- Entry points: Settings › Appearance › Theme (thumbnail picker); header button in the desktop top bar (SET-11) switches between Light and Dark.
- Screens / routes: SCR-SET-03; `/settings/appearance`.
- Platforms: All. The live preview sits beside the options in a wide content area and above them in a narrow one.
- States: When not Custom, a note shows: "Want other colors or corners? Choose Custom. Light and Dark won’t change."
- Data: `PATCH /api/me/settings { theme }`; local copy `localStorage` `sm-theme`.
- Settings that change it: itself.
- Feedback: Optimistic; on failure the previous appearance comes back and a danger toast "Couldn't save the appearance" / "It is back to how it was."
- Limits: values `system | light | dark | custom`.
- Related: SET-04, SET-10, SET-11, SET-23.
- Source: `pages/appearance/appearance.page.{ts,html}`, `services/appearance-settings.service.ts`, `core/theme/theme.service.ts`.

#### SET-04 Custom theme
- What it does: With Theme = Custom: "Start from" (Light / Dark base), "Accent color" (8 curated swatches plus the account's own colours plus a "+" swatch), "Background" (4 curated backgrounds per base plus own colours plus "+"), "Corners" (Round / Soft / Square), and "Reset custom theme". Switching base swaps a curated background to the first background of the new base (an own background colour is kept and drawn in its readable shade). Reset restores base Light, accent Ocean, background Paper, corners Soft.
- Entry points: Appearance › Theme › Custom.
- Screens / routes: SCR-SET-03.
- Platforms: All.
- States: hidden unless Theme = Custom.
- Data: `PATCH /api/me/settings { customTheme: { base, accent, background, corners } }`; local `sm-custom-theme`.
- Settings that change it: Theme.
- Feedback: same failure toast as SET-03.
- Limits: accent is a curated name or a `#rrggbb` hex; background is a curated name of the current base or a hex.
- Related: SET-05.
- Source: `appearance.page.html`, `appearance-settings.service.ts` (`setBase`, `setAccent`, `setBackground`, `setCorners`, `resetCustom`), contracts `users/custom-theme-*.const.ts`.

#### SET-05 Own colours for the custom theme
- What it does: The "+" swatch opens a colour picker (saturation/brightness area, hue slider, hex field, "Cancel" / "Add color"). An accent must keep 4.5:1 contrast on the current base and background; a background must keep text at 4.5:1. A colour picked by dragging moves to the nearest readable shade when the pick ends and a status line says "Adjusted to {{colour}} so it stays readable." (background: "…so text stays readable."). A typed colour that fails shows a warning with a "Use {{colour}}" button offering the nearest passing shade; "Add color" waits. An accepted colour becomes the accent/background and is saved as an own swatch (at the end; an old copy moves to the end; max 12, the oldest goes). Own swatches have a remove control (× or Delete/Backspace) that forgets the swatch only (themes and folders wearing the colour keep it), with an Undo toast. Own colours are shared with the folder colour picker.
- Entry points: "+" swatch in Accent color and Background rows; × on an own swatch.
- Screens / routes: SCR-SET-04 (popover inside SCR-SET-03).
- Platforms: All.
- States: warning hidden while dragging; colour in use but not in the account list keeps its swatch without remove.
- Data: `PATCH /api/me/settings { customColours: HexColour[] }`, `{ customTheme }`.
- Settings that change it: base and background (contrast checks).
- Feedback: Remove: info toast "Color removed" (detail = hex) with "Undo" action and hint "Press {{shortcut}} to reach {{action}}"; failure: danger toast "Couldn’t remove the color" (detail hex). Invalid hex: "Enter # and six digits or letters a–f, like #2e6a99."
- Limits: `USER_LIMIT.CustomColoursMax` 12; hex pattern `^#[0-9a-f]{6}$`.
- Related: folder colour and icon dialog (organise area).
- Source: `appearance-settings.service.ts`, `OwnColourActionsService`, `libs/ui color-picker`, `theme-picker`, `user-settings.store.ts` (`addCustomColour`, `removeCustomColour`).

#### SET-06 Text and layout
- What it does: Text size (90% / 100% / 112% / 125%, scales the whole interface), Font (Onest / System / Readable, "Readable is designed for low vision"), Density (Comfortable / Compact).
- Entry points: Appearance › Text and layout.
- Screens / routes: SCR-SET-03.
- Platforms: All.
- States: none.
- Data: `PATCH /api/me/settings { textSize | font | density }`; local `sm-layout`; applied as `html` data attributes (left out for defaults).
- Settings that change it: none.
- Feedback: failure toast as SET-03.
- Limits: none.
- Related: SET-23.
- Source: `appearance.page.html`, `theme.service.ts`.

#### SET-07 Card options
- What it does: Preview image (Large / Small / Off), Show site (domain and favicon above the title), Show notes, Show tags.
- Entry points: Appearance › Cards.
- Screens / routes: SCR-SET-03.
- Platforms: All.
- States: none.
- Data: `PATCH /api/me/settings { cardPreview | cardSite | cardNotes | cardTags }`; local `sm-layout`.
- Settings that change it: none.
- Feedback: failure toast as SET-03.
- Limits: none.
- Related: link cards (library area).
- Source: `appearance.page.html`.

#### SET-08 Dates and numbers
- What it does: Date format (select: "Language default (example)", then samples of Medium "10 Nov 2026", Day.Month.Year "10.11.2026", Month/Day/Year "11/10/2026", ISO "2026-11-10", each drawn with today's date in the active language), Time (Auto / 24-hour / 12-hour), Week starts on (Auto / Monday / Sunday, weekday names in the active language, sentence case), and a live Preview line "{{weekday}}, {{date}}, {{time}}". Auto week start uses the locale's week info, else a list of Sunday regions (US, CA, BR, MX, JP, IL, PH, KR, TW, IN, ZA), else Monday.
- Entry points: Appearance › Dates and numbers (moved here from Language).
- Screens / routes: SCR-SET-03.
- Platforms: All.
- States: none.
- Data: `PATCH /api/me/settings { dateFormat | timeFormat | weekStart }`; local `sm-language` (with the language).
- Settings that change it: interface language (samples and weekday names).
- Feedback: failure danger toast "Couldn’t save the setting" / "It is back to how it was."
- Limits: none.
- Related: SET-19, Recently opened grouping ("Groups this week in Recently opened"), Account weekly chart (ACC-02 reloads when first day changes).
- Source: `pages/appearance/date-time-settings/*`, `core/i18n/locale.service.ts`, `resolve-locale.ts`.

#### SET-09 Folder colours and animations
- What it does: "Folder colors" switch (off shows every folder in plain graphite) and "Animations" (System / Full / Reduced; reduced keeps fades and loaders, removes movement).
- Entry points: Appearance › Sidebar and motion.
- Screens / routes: SCR-SET-03.
- Platforms: All.
- States: none.
- Data: `PATCH /api/me/settings { folderColours }` / `{ motion }`; motion local `sm-motion`.
- Settings that change it: none.
- Feedback: failure: switch goes back, toast "Couldn't save the appearance" / "It is back to how it was."
- Limits: none.
- Related: sidebar (organise area).
- Source: `appearance.page.html`, `appearance-settings.service.ts` (`setFolderColours`, `setMotion`).

#### SET-10 Live preview of appearance
- What it does: A "Live preview" sample (sidebar with folders Angular / Clothes / Recipes and sample counts 12, 7, 23, a "Recently opened" row, two sample cards: youtube.com "Signal Forms in 20 minutes" tag angular note "Watch on the weekend"; cos.com "Wool coat, straight cut" tag clothes note "Wait for the sale") drawn with the current tokens; hint "Changes apply to the whole app at once." Sticky beside the options on wide content, above them on narrow.
- Entry points: Appearance page.
- Screens / routes: SCR-SET-03.
- Platforms: All (position differs).
- States: counts follow "Show folder counts"; the Recently opened row disappears while history is paused.
- Data: none written.
- Settings that change it: all appearance options, Show folder counts, Remember recently opened.
- Feedback: none.
- Limits: none.
- Related: SET-03 … SET-09.
- Source: `appearance.page.{ts,html}`, `libs/ui theme-preview`.

#### SET-11 Quick light/dark toggle in the top bar
- What it does: A ghost icon button in the desktop header switches between the fixed Light and Dark themes (from Custom or System it picks the opposite of what is shown) and saves on the account.
- Entry points: Header button, accessible name "Switch to light theme" / "Switch to dark theme".
- Screens / routes: desktop shell header (all signed-in pages from 64em).
- Platforms: Desktop only (no header below 64em).
- States: none.
- Data: `PATCH /api/me/settings { theme }`.
- Settings that change it: Theme.
- Feedback: none on failure (the store rolls back silently).
- Limits: none.
- Related: SET-03.
- Source: `shell/app-shell.component.{ts,html}` (`toggleTheme`).

#### SET-12 Library viewing defaults
- What it does: Default view (Cards / List; "How folders open the first time"), Sort links by (select: Newest first / Oldest first / Title A–Z; "Each folder remembers its own choice after you change it"), Open links in (New tab / Same tab), Show folder counts switch ("Numbers next to folders in the sidebar").
- Entry points: Settings › Library › Viewing.
- Screens / routes: SCR-SET-05; `/settings/library`.
- Platforms: All.
- States: shows defaults until the settings load.
- Data: `PATCH /api/me/settings { defaultView | defaultSort | openLinksIn | showFolderCounts }`. Not cached in the browser.
- Settings that change it: none.
- Feedback: optimistic; failure danger toast "Couldn't save the setting" / "It is back to how it was."
- Limits: none.
- Related: library feed (library area), sidebar counts.
- Source: `pages/library/library.page.{ts,html}`, `user-settings.store.ts` (`setLibrary`).

#### SET-13 Clicking a link and sites that open in a new tab
- What it does: "Clicking a link" radio: "Opens the preview" ("On wide screens only. Smaller screens open the link.") or "Opens it in a new tab" ("Preview stays on the eye button and Space."); row hint "Hold ⌘ or Ctrl while you click to do the other one." "Sites that open in a new tab": removable chips of domains (sites that block the preview frame are added by the server; the user's own choices too); each chip's remove label "Remove {{domain}}"; empty "None yet."
- Entry points: Settings › Library › Viewing.
- Screens / routes: SCR-SET-05.
- Platforms: All (preview only acts on wide screens).
- States: empty list text.
- Data: `PATCH /api/me/settings { clickAction }`, `{ previewNewTabHosts }`.
- Settings that change it: none.
- Feedback: failure toast as SET-12.
- Limits: `USER_LIMIT.PreviewNewTabHostsMax` 100 hosts, each a valid lower-case host name; unique.
- Related: link preview (library area).
- Source: `features/link-preview/components/preview-settings/*`.

#### SET-14 Saving defaults
- What it does: "New links go to" (searchable folder select; empty value "Unsorted"; search label "Search folders"; "No folders found"), "Fetch titles and previews" switch ("Turn off to save only the address"), and, only where it can work, "Browser extension" with an "Install" button to the Chrome Web Store (opens in a new tab).
- Entry points: Settings › Library › Saving.
- Screens / routes: SCR-SET-05.
- Platforms: Extension row only on desktop width (from 64em) in Chrome/Edge/Brave/Arc and when the store URL is configured.
- States: a chosen folder that is gone or in Trash reads as Unsorted (server and client).
- Data: `PATCH /api/me/settings { newLinksFolderId (uuid|null) | fetchPreviews }`; the server checks the folder belongs to the user.
- Settings that change it: none.
- Feedback: failure toast as SET-12.
- Limits: none.
- Related: add link (capture area), extension (capture area).
- Source: `library.page.html`, `core/browser-extension/browser-extension.service.ts`, `apps/api/src/users/users.service.ts`.

#### SET-15 Trash retention and Trash row
- What it does: "Keep deleted items for" 7 / 30 / 90 days (default 30); choosing a shorter value asks for confirmation only when items already in Trash would be deleted tonight. Below it a "Trash" row shows the item count ("{{count}} item(s)" or "Nothing in Trash") with an "Open Trash" button.
- Entry points: Settings › Library › Trash.
- Screens / routes: SCR-SET-05, SCR-SET-06.
- Platforms: All.
- States: control disabled until settings load; load failure notice "Couldn't load the setting." with "Try again".
- Data: `PATCH /api/me/settings { trashRetentionDays }`; Trash list reloaded after save.
- Settings that change it: itself.
- Feedback: Confirmation (SCR-SET-06, destructive); cancelled → control returns to previous value. Failure: danger toast "Couldn't save the setting" / "It is back to {{days}} days."
- Limits: values 7, 30, 90.
- Related: TRS-09 (organise area), Trash page.
- Source: `library.page.{ts,html}` (`setRetention`, `confirmShorter`).

#### SET-16 Rules section (entry)
- What it does: Settings › Library contains the "Rules" section (domain → folder and tags). Fully described in the organise area.
- Entry points: Settings › Library.
- Screens / routes: SCR-SET-05.
- Platforms: All.
- States: see RUL-01.
- Data: see RUL-01.
- Settings that change it: none.
- Feedback: see RUL-01.
- Limits: see RUL-01.
- Related: RUL-01 … RUL-11 (organise area).
- Source: `features/rules/components/rules-section/*`.

#### SET-17 Library clean-up (entry)
- What it does: Settings › Library › "Clean up" section: "Clean up your library" / "Find duplicates and similar tags, and fix them in one step." with a "Review" button that navigates to `/settings/library/cleanup` (a page on every screen size). Covered by the AI area.
- Entry points: "Review" button; URL.
- Screens / routes: SCR-SET-05; `/settings/library/cleanup`.
- Platforms: All.
- States: —
- Data: —
- Settings that change it: —
- Feedback: —
- Limits: —
- Related: AI area (cleanup).
- Source: `library.page.html`, `features/cleanup/cleanup.page`.

#### SET-18 AI settings (entry)
- What it does: Settings nav / You list row "AI" ("Help with organising, only when you want it. Off until you turn it on.") opens `/settings/ai`; on phone `/settings/ai/folder` and `/settings/ai/tags` are sub-pages with full-label mode choices (back control leads to AI). Privacy and data links to `/settings/ai#ai-data` ("Delete AI data"). Covered by the AI area.
- Entry points: nav row "AI", You list row "AI", Privacy and data "Open".
- Screens / routes: `/settings/ai`, `/settings/ai/folder`, `/settings/ai/tags`.
- Platforms: All (sub-pages for phone).
- States/Data/Settings/Feedback/Limits: see AI area.
- Related: AI area.
- Source: `settings.routes.ts`, `pages/ai/*`, `pages/ai-mode/*`.

#### SET-19 Interface language
- What it does: A plain radio list of the seven interface languages, each with its flag and its own name (English 🇬🇧, Français 🇫🇷, Deutsch 🇩🇪, Italiano 🇮🇹, Español 🇪🇸, Português 🇧🇷, Українська 🇺🇦), then "Match my browser" (monitor icon). Hint: "Your links and notes stay as they are". Switches the whole app without a reload (loads the language file first), sets `<html lang>`.
- Entry points: Settings › Language; You list "Language" row (shows the current language name); landing footer language switcher (SET-20).
- Screens / routes: SCR-SET-07; `/settings/language`.
- Platforms: All.
- States: none.
- Data: `PATCH /api/me/settings { language }`; local `sm-language`.
- Settings that change it: none.
- Feedback: failure danger toast "Couldn’t save the setting" / "It is back to how it was."
- Limits: values `browser | en | fr | de | it | es | pt | uk`.
- Related: SET-20, Languages section.
- Source: `pages/language/*`, `core/i18n/*`.

#### SET-20 Language detection and guest choice
- What it does: "Match my browser" (default) uses the first browser language the app has, else English, and follows the browser's `languagechange`. `Intl` uses the browser's own regional tag when it speaks the same language (en-GB keeps day-month order). Guests choose a language in the landing footer; that choice lives only in `localStorage` (`sm-language`) and is saved once to the account at the first sign-in (if the account has no saved language). A signed-in visitor of `/about` saves the footer choice on the account. Another tab's change is followed via the `storage` event.
- Entry points: landing footer language buttons (`aria-pressed` on the current one, label "Language"); automatic.
- Screens / routes: landing, `/about`.
- Platforms: All. The browser extension popup follows only the browser languages (not the account setting).
- States: storage unavailable → choice lasts for the session.
- Data: `localStorage sm-language` (JSON of language, dateFormat, timeFormat, weekStart); account `languageSaved` flag.
- Settings that change it: SET-19.
- Feedback: none.
- Limits: none.
- Related: landing (other area).
- Source: `core/i18n/locale.service.ts`, `resolve-locale.ts`, `features/landing/components/landing-footer/*`, `stores/user-settings.store.ts` (`fetchSettings`), `apps/extension/src/app/app.config.ts`.

#### SET-21 Remember recently opened (history pause)
- What it does: Switch "Remember recently opened" ("Keeps the Recently opened list. Off clears it and stops recording."). Turning on resumes recording immediately. Turning off asks for confirmation, then pauses recording on the account and clears the history.
- Entry points: Settings › Privacy and data › Your data.
- Screens / routes: SCR-SET-08, SCR-SET-09.
- Platforms: All.
- States: none.
- Data: `PATCH /api/me/settings { pauseHistory }`, then history clear (links store `clearHistory`).
- Settings that change it: none.
- Feedback: confirmation (destructive). Cancel → switch back on. Save failure → switch reverts and toast "Couldn't save the setting" / "It is back to how it was."; clear failure → toast "Couldn't clear the history".
- Limits: none.
- Related: Recently opened page (library area), Live preview.
- Source: `pages/privacy-data/privacy-data.page.{ts,html}`.

#### SET-22 Privacy and data information and entry points
- What it does: "Privacy policy" row ("What we store and why, in plain words", button "Read" → `/privacy`); "Import and export" section with "Import links" ("Bring in bookmarks from your browser") and "Export" ("Download your whole library as a file"), each an "Open" button opening the same dialogs as the sidebar's data menu; "AI features" text and "Delete AI data" row ("Open" → Settings › AI); "What we keep" bullet list (four sentences from the privacy policy).
- Entry points: Settings › Privacy and data; You list Import/Export rows fall back to this page without script.
- Screens / routes: SCR-SET-08; `/settings/privacy`.
- Platforms: All (dialogs become sheets on phone).
- States: none.
- Data: none written.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: export/import dialogs (capture area), public privacy page (other area), AI data (AI area).
- Source: `privacy-data.page.html`.

#### SET-23 How settings are saved and synced
- What it does: All account settings are read once (`GET /api/me/settings`) and cached for the app. Every change is optimistic and saved immediately with `PATCH` (only changed fields); a failure rolls back (unless a later change replaced it) and the page shows a toast. A read that started before a change never overwrites it. Session end forgets everything and drops answers in flight. Appearance and language have a browser copy so the first paint is right: the account wins over the browser copy; if the account never saved one but the browser has one, it is saved once silently. Changes in another tab are followed through `storage` events (appearance, language, single-key shortcuts).
- Entry points: every settings control.
- Screens / routes: all settings pages.
- Platforms: All.
- States: settings load failure only surfaces on the Library page (retention notice).
- Data: `GET /api/me/settings`, `PATCH /api/me/settings`; local keys `sm-theme`, `sm-custom-theme`, `sm-motion`, `sm-layout`, `sm-language`, `sm-ui`.
- Settings that change it: —
- Feedback: per page toasts (see Toasts).
- Limits: unknown/extra fields rejected (400).
- Related: all SET features.
- Source: `stores/user-settings.store.ts`, `user-settings-mappers.ts`, `core/theme/theme.service.ts`, `core/i18n/locale.service.ts`, `apps/api/src/users/*`.

#### SET-24 Old Import / export URL redirect
- What it does: `/settings/import-export` (former export page) redirects to `/settings/account#your-data`; the Account page scrolls "Your data" into view once the shelf above has loaded.
- Entry points: old bookmarks/links.
- Screens / routes: `/settings/import-export`.
- Platforms: All.
- States/Data/Settings/Feedback/Limits: none.
- Related: ACC-04.
- Source: `settings.routes.ts`, `account.page.ts`.

#### SET-25 Own emoji list (stored setting)
- What it does: The account keeps a list of own emoji for the folder icon picker's "Yours" (added at the end, max 24, oldest goes; removing forgets only the swatch). No control on the settings pages; used by the folder style dialog.
- Entry points: folder colour and icon dialog (organise area).
- Screens / routes: —
- Platforms: All.
- States: —
- Data: `PATCH /api/me/settings { customEmoji }`.
- Settings that change it: —
- Feedback: see organise area.
- Limits: `USER_LIMIT.CustomEmojiMax` 24, unique, each a valid folder emoji.
- Related: folder style (organise area).
- Source: `user-settings.store.ts` (`addCustomEmoji`, `removeCustomEmoji`), `update-user-settings.dto.ts`.

#### SET-26 "What's new" seen marker (stored setting)
- What it does: The account remembers the last release whose "What's new" was seen (`whatsNewSeen`, format `N.N.N`); shown as seen at once even if the save fails. Drives the dot on the You list row and the badge in the sidebar data menu.
- Entry points: What's new dialog (other area).
- Screens / routes: —
- Platforms: All.
- Data: `PATCH /api/me/settings { whatsNewSeen }`.
- Limits: pattern `^\d{1,3}\.\d{1,3}\.\d{1,3}$`.
- Related: What's new (other area).
- Source: `user-settings.store.ts` (`setWhatsNewSeen`).

#### ACC-01 Account profile
- What it does: Shows the signed-in user's provider photo (or initials avatar), name, email and "Member since {{date}}" (month and year).
- Entry points: Settings › Account (first section on desktop); You list account card (accessible prefix "Account:").
- Screens / routes: SCR-ACC-01; `/settings/account`.
- Platforms: All. Account is not a row in the You list (reached via the account card).
- States: member-since line only after stats load.
- Data: session user; `GET /api/me/stats?firstDay=N` → `memberSince`.
- Settings that change it: interface language (date words).
- Feedback: none. Profile cannot be edited.
- Limits: none.
- Related: ACC-02.
- Source: `pages/account/account.page.{ts,html}`, `services/account-stats.service.ts`.

#### ACC-02 Your shelf numbers
- What it does: Counts of Links, Folders, Tags; "Oldest link: {{when}}" (relative); "Sites you save most" (top 5 hosts with favicon and count); "Most used tags" (top 5, hidden when none); "Links added per week" bar chart for the last 12 weeks (current week last), each bar with screen-reader text "Week of {{date}}: {{count}}", first and last week labels under the chart. Weeks start on the user's first day of week; reloads when it changes.
- Entry points: Settings › Account › Your shelf.
- Screens / routes: SCR-ACC-01.
- Platforms: All.
- States: loading skeleton (status "Loading your numbers"); error "Couldn't load your numbers." + "Try again"; empty (no links) "Nothing saved yet" / "Save your first link and your numbers show up here."
- Data: `GET /api/me/stats?firstDay=1..7` → linkCount, folderCount, tagCount, oldestLinkAt, topSites[{host, faviconUrl, count}], topTags[{name, count}], weeklyLinks[{weekStart, count}], memberSince, connectedAccounts[{provider, connectedAt}].
- Settings that change it: Week starts on, language (number/date formatting).
- Feedback: none.
- Limits: `ME_STATS_LIMIT` TopSites 5, TopTags 5, Weeks 12; firstDay 1–7 (400 otherwise).
- Related: ACC-01, ACC-03.
- Source: `components/account-shelf/*`, `account-stats.service.ts`, `utils/week-bars.ts`, `apps/api/src/users/me-stats.service.ts`.

#### ACC-03 Connected accounts
- What it does: Lists the sign-in providers linked to the account (Google, GitHub) with logo and "Connected {{date}}". Read-only (no connect/disconnect).
- Entry points: Settings › Account.
- Screens / routes: SCR-ACC-01.
- Platforms: All.
- States: shown only after stats load; none linked (demo): "The demo account isn't linked to Google or GitHub."
- Data: `GET /api/me/stats` → connectedAccounts.
- Settings that change it: none.
- Feedback: none.
- Limits: providers Google, GitHub.
- Related: sign-in (auth area).
- Source: `account.page.html`, `models/auth-provider-view.const.ts`.

#### ACC-04 Your data (export entry points)
- What it does: "Your data" section lists every export format (JSON "Everything: links, folders, tags, notes, reminders"; Bookmarks HTML "Opens in the bookmark import of any browser"; CSV "For spreadsheets"), each with a "Download" button (accessible name "Download {{format}}") that downloads the whole library directly. Anchor `#your-data`.
- Entry points: Settings › Account; `/settings/account#your-data`; `/settings/import-export` redirect.
- Screens / routes: SCR-ACC-01.
- Platforms: All (buttons large on compact).
- States/feedback: see export (capture area).
- Data: export endpoint (capture area).
- Related: export dialog and toasts (capture area), SET-22.
- Source: `account.page.html`, `features/export/services/export-actions.service.ts`, `export-format-options.const.ts`.

#### ACC-05 Sign out
- What it does: Ends the session and leaves the app (to the landing).
- Entry points: Settings › Account "Sign out" section ("Sign out of Shelfmark" / "Your links stay saved. Sign in again any time." / button "Sign out"); You list "Sign out" button; desktop account menu "Sign out".
- Screens / routes: SCR-ACC-01, SCR-SET-01, SCR-SET-10.
- Platforms: All.
- States: none. No confirmation.
- Data: auth sign-out (auth area).
- Related: auth area.
- Source: `account.page.ts`, `settings-index.page.ts`, `app-shell.component.ts` (`auth.signOutAndLeave`).

#### ACC-06 Delete account
- What it does: Danger section "Delete account" ("Removes your account and all your links, folders and tags for good. This can't be undone.") with a danger button. Opens an alert dialog where the user types their email; the delete button stays disabled until the typed email matches (case-insensitive, trimmed). On success the session is dropped, the app goes to the landing (`/`) and a success toast shows. Deletion is immediate and permanent; there is no grace period and Trash is not used.
- Entry points: Settings › Account › Delete account.
- Screens / routes: SCR-ACC-01, SCR-ACC-02.
- Platforms: All (button large on compact; dialog small size).
- States: hidden for demo users (and `open()` does nothing for them). While deleting the dialog cannot be dismissed (no close button, Esc blocked, no scrim close) and the button shows "Deleting…".
- Data: `DELETE /api/me { email }` → 204 and the session cookie cleared; 400 mismatch; 401 no session; 429 rate limit. Server deletes the user row (cascades all data) and verification rows of that email.
- Settings that change it: none.
- Feedback: errors inline in the dialog (focus returns to the field): "That email does not match your account. Check it and try again." / "Too many attempts. Try again in a minute." / "We could not delete your account. Nothing was deleted. Try again." 401 closes the dialog (global handler goes to sign-in). Success toast "Account deleted" / "All your data was deleted".
- Limits: `RATE_LIMIT.DeleteAccount` 5 per minute; email ≤ 320 characters, valid email.
- Related: ACC-05.
- Source: `features/account-deletion/*`, `apps/api/src/users/users.controller.ts`, `users.service.ts` (`deleteAccount`).

#### KEY-01 Keyboard shortcuts settings page
- What it does: `/settings/shortcuts` shows a "Use single-key shortcuts" switch, an "All shortcuts" row ("Press ? anywhere except in a text field.") with an "Open list" button that opens the shortcuts dialog, then one section per shortcut group with the full list (same list as the dialog).
- Entry points: settings nav "Keyboard shortcuts"; URL.
- Screens / routes: SCR-KEY-01.
- Platforms: Nav entry only on desktop (not in the You list); the route works on every size.
- States: none.
- Data: `localStorage sm-ui` (`singleKeyShortcuts`).
- Related: KEY-02, KEY-03.
- Source: `features/settings/pages/shortcuts/*`.

#### KEY-02 Keyboard shortcuts dialog ("?")
- What it does: A medium dialog "Keyboard shortcuts" with one column per group (Everywhere, Saving and finding, Link preview, Selecting links, In the folder list), each row a description and key caps; footer hint "Press ? anywhere except in a text field." Opens nothing while any other dialog is open.
- Entry points: "?" key (Shift+/ on most layouts) anywhere except in fields, not with Ctrl/Cmd/Alt, not while composing; desktop header keyboard button (accessible name and tooltip "Keyboard shortcuts", tooltip shortcut "?"); Settings › Keyboard shortcuts "Open list".
- Screens / routes: SCR-KEY-02.
- Platforms: Header button desktop only; key on any keyboard.
- States: "?" ignored when single-key shortcuts are off (button still works).
- Data: none.
- Related: KEY-03, KEY-04, Shortcuts table.
- Source: `features/shortcuts/*`, `shell/app-shell.component.{ts,html}`.

#### KEY-03 Single-key shortcuts preference
- What it does: Switch "Use single-key shortcuts" ("The ? key opens the list on its own, never while you type in a field. Turn off to use only the top bar button."). On by default, kept per device (not on the account), applies at once.
- Entry points: Settings › Keyboard shortcuts.
- Screens / routes: SCR-KEY-01.
- Platforms: All.
- Data: `localStorage sm-ui` `{ singleKeyShortcuts }`.
- Limits: affects only "?" today.
- Related: KEY-02.
- Source: `stores/ui.store.ts`, `shortcuts-dialog.service.ts`.

#### KEY-04 Platform key caps
- What it does: Key caps adapt to the device: Apple devices show Command, Option and Shift as glyph icons (with spoken names "Command", "Option", "Shift"); others show the words "Ctrl", "Alt", "Shift". Enter is an icon ("Enter"), Esc the word "Esc", arrows ↑ ↓ ← → with spoken names Up/Down/Left/Right, "?" with spoken "Question mark", "Space", letters as letters, F10.
- Entry points: shortcuts dialog and page.
- Source: `features/shortcuts/utils/key-cap.ts`, `components/shortcut-list/*`.

#### FBK-01 Send feedback dialog
- What it does: Form with type (segmented: Idea / Problem / Other, default Idea), message textarea (label and placeholder change with the type; counter up to 2000), optional screenshots (FBK-02), checkbox "Attach browser and app version" (on by default) with an info button "What is sent?" (tooltip on hover/focus; tap toggles the same text below: "Helps us reproduce problems. Only the app version and your browser name and version are sent."), Cancel and Send. On send: message first, then screenshots one by one; the form is replaced by a thank-you view with "Done" (focus moves to Done). While sending the dialog cannot be dismissed (Esc, scrim, close button, sheet drag, Cancel disabled).
- Entry points: desktop account menu "Send feedback"; sidebar "Data & help" menu "Send feedback"; You list "Send feedback" button; Settings › Your feedback "Send feedback" button. Opens nothing while another dialog is open. Focus starts in the textarea.
- Screens / routes: SCR-FBK-01, SCR-FBK-02.
- Platforms: Phone: bottom sheet, block footer buttons.
- States: validation "Write a message first." (empty or whitespace), "Keep it to {{max}} characters or fewer."; send failure keeps the text: "Couldn't send. Your text is kept — try again in a moment."; 429: "You have sent a lot of messages in the last hour. Your text is kept — try again later."; thank-you warning when screenshots failed: "Some images couldn't be attached. Your message was sent without them."
- Data: `POST /api/feedback/messages { kind, text (trimmed), client?: { appVersion, userAgent ≤300 } }` → FeedbackMessage (201); then `POST /api/feedback/messages/:id/screenshots`. New message put on top of the Your feedback list.
- Settings that change it: none.
- Feedback: thank-you view "Thank you" / "We read every message. You'll see its status in Settings › Your feedback."
- Limits: text 1–2000 after trim; 10 messages per user per rolling hour (demo included); `RATE_LIMIT.Feedback` 10 requests/min.
- Related: FBK-02, FBK-03.
- Source: `features/feedback/components/send-feedback-dialog/*`, `services/feedback-dialog.service.ts`, `services/feedback.store.ts`, `apps/api/src/feedback/feedback-messages.*`.

#### FBK-02 Feedback screenshots
- What it does: "Screenshots (optional)": drop area "Drop images or" + "choose files" button (multiple). Up to 3 images, PNG/JPEG/WebP, 2 MB each, checked in the browser before sending; each shows a thumbnail, name, size ("{{size}} KB"/"{{size}} MB") and a remove button ("Remove image {{index}} of {{count}}: {{name}}"; focus moves to the next remove button or "choose files"). The drop area disappears at 3 ("{{count}} images added, the most one message can have."). Server attaches each in its own request within 10 minutes of the message.
- Entry points: inside FBK-01 (click, drag and drop).
- Screens / routes: SCR-FBK-01.
- Platforms: All (drag and drop where supported).
- States: errors (first problem shown): "That file is not a PNG, JPEG or WebP image." / "That image is larger than {{max}} MB. Choose a smaller one." / "That file is empty." / "Couldn't read that file. Try another one." / "You can add up to {{count}} images." Hint: "PNG, JPEG or WebP, up to {{count}} images, {{max}} MB each."
- Data: `POST /api/feedback/messages/:id/screenshots { type, data (base64) }` (JSON body limit 3 MB on this route); server checks magic bytes.
- Limits: 3 per message, 2 MB each, attach window 10 min, 20 MB per user per rolling 24 h (demo 6 MB) → 429 "Screenshot limit reached for today, try again later"; 400 "A message has at most 3 screenshots", "Screenshots can only be added right after sending".
- Related: FBK-01, ADM-02 (admin sees screenshots).
- Source: `services/feedback-screenshots.service.ts`, `utils/read-feedback-screenshot.ts`, `utils/feedback-screenshot-problem.ts`, contracts `feedback-message-limit.const.ts`.

#### FBK-03 Your feedback page
- What it does: "Send feedback" section (label "Tell us what you think", hint "An idea, a problem or anything else. We read every message.", primary button "Send feedback" with message icon), then "Your messages", newest first: type chip, text, "Sent today" or "Sent {{date}}" (day and short month, year when not this year; English shows day first), the author's reply "Reply: {{reply}}" when present, and a status badge. Reloads on every visit.
- Entry points: settings nav / You list "Your feedback"; thank-you text points here.
- Screens / routes: SCR-FBK-03; `/settings/feedback`.
- Platforms: All.
- States: loading skeleton (3 rows); error "Couldn't load your messages." + "Try again"; empty page-level "No messages yet" / "What you send shows up here with its status and our reply."
- Data: `GET /api/feedback/messages` (max 100).
- Limits: 100 messages listed.
- Related: FBK-01, FBK-04, ADM-02.
- Source: `features/settings/pages/your-feedback/*`, `features/feedback/utils/feedback-sent-date.ts`.

#### FBK-04 Feedback status badges and replies
- What it does: Each message has a status: Received (default, neutral), Planned (accent), In progress (accent), Done (accent with check), Not planned (neutral); and an optional reply written by the author in the admin inbox.
- Entry points: Your feedback list; admin inbox.
- Data: `FeedbackMessage.status`, `reply`.
- Related: ADM-03.
- Source: `components/feedback-status-badge/*`, `models/feedback-status-view.const.ts`.

#### FBK-05 When the rating prompt appears
- What it does: For a signed-in, non-demo user who finished onboarding: 5 s after the app is ready the app asks the server which milestone is due (3 days, 1 week, 1 month, 1 year after sign-up; only the latest reached unanswered milestone, earlier ones skipped). If a dialog is open, a text field is focused or the tab is hidden, it retries every 5 s. One look per page load per user. A milestone answered or skipped is never asked again. Every failure is silent. Each display is counted on the server.
- Entry points: automatic.
- Screens / routes: SCR-FBK-04.
- Platforms: All.
- States: not for demo, not before onboarding, not for guests.
- Data: `GET /api/feedback/prompt` → `{ milestone | null }`; `POST /api/feedback/rating-prompt/views { milestone }` (204, fire and forget); closing without a score → `POST /api/feedback { milestone, score: null }`.
- Limits: `RATE_LIMIT.RatingPromptView` 10/min.
- Related: FBK-06, onboarding (other area).
- Source: `features/rating/services/rating.store.ts`, `utils/rating-blockers.ts`, `models/rating-delay.const.ts`, contracts `due-feedback-milestone.ts`.

#### FBK-06 Rating dialog
- What it does: Three steps in one dialog. Step 1 "How do you like Shelfmark so far?" with ten score buttons 1–10 ("{{score}} out of 10"), edge labels "Not really" / "Love it", and "Not now". The score is saved the moment it is picked. Scores 8–10 go straight to "Thank you" ("Your rating helps us make Shelfmark better."); 1–7 go to "What would make it better?" with a read-only copy of the score ("Your score: {{score}}"), a textarea "Your feedback" (placeholder "Tell us what is missing or annoying", counter) and "Skip" / "Send" (Send disabled while blank). After sending: "Thank you" with "We read every message." The thank-you step closes by itself after 4 s; "Close" closes at once.
- Entry points: FBK-05.
- Screens / routes: SCR-FBK-04.
- Platforms: Phone: footer buttons span the sheet.
- States: send error "Couldn't send your feedback. Try again."; sending "Sending…".
- Data: `POST /api/feedback { milestone, score, comment? }` (204). Same score again appends the comment; different score → 409 (swallowed); 403 demo; 409 onboarding pending / milestone not reached.
- Settings that change it: Animations (step slide 24px and fade; reduced shows at once).
- Feedback: no toasts.
- Limits: comments together per milestone ≤ 2000; `RATE_LIMIT.Feedback` 10/min.
- Related: FBK-05, ADM-04 (ratings stats).
- Source: `features/rating/components/rating-dialog/*`, `utils/score-for-key.ts`, `apps/api/src/feedback/feedback.service.ts`.

#### ADM-01 Admin access
- What it does: Admin pages exist for the author only. The app asks `GET /api/admin/status` once per session (never for demo users); 200 means admin, 404 or any failure means no. Admin entries ("Feedback inbox", "Usage stats") appear in the desktop account menu and the You list only while admin. The `adminOnly` route guard sends everyone else to `/links`. The server answers 404 on every admin route unless the session email is in the `ADMIN_EMAILS` list, ASCII, provider-verified, and not demo (the session guard also answers 404 instead of 401 under `/api/admin`).
- Entry points: account menu items "Feedback inbox" (inbox icon) and "Usage stats" (chart icon); You list rows; URLs `/admin/feedback`, `/admin/stats`.
- Screens / routes: SCR-ADM-01, SCR-ADM-03.
- Platforms: All. On desktop the normal sidebar shows (not the settings nav); on compact the page header back control leads to the You list.
- Data: `GET /api/admin/status` (no-store).
- Limits: `RATE_LIMIT.Admin` 60/min on stats and PATCH.
- Related: ADM-02 … ADM-05.
- Source: `features/admin/admin.guard.ts`, `services/admin.store.ts`, `apps/api/src/admin/admin.guard.ts`, `admin.controller.ts`.

#### ADM-02 Feedback inbox
- What it does: `/admin/feedback` lists every user's messages, newest first, 20 per page with "Load more"; a status filter select "Show" (empty value "All statuses", then each status). Each item: type chip, sender name and email, sent date, status badge, text, screenshot thumbnails (each opens the image in a new tab; alt "Open screenshot {{index}} of {{count}}"), and the edit controls (ADM-03).
- Entry points: ADM-01; admin switch "Feedback".
- Screens / routes: SCR-ADM-01, SCR-ADM-02.
- Platforms: All.
- States: loading skeleton; error "Couldn't load the messages." + "Try again"; empty "No messages" / "Nothing matches this filter yet."; loading more "Loading more messages"; load-more failure toast "Couldn't load more messages" / "Try again".
- Data: `GET /api/admin/feedback?status=&cursor=&limit=` (limit 1–100, server default 50; app uses 20) → items with user {name, email}, nextCursor; `GET /api/admin/feedback/:id/screenshots/:position`.
- Limits: page size 20.
- Related: ADM-03, FBK-03.
- Source: `features/admin/pages/admin-feedback/*`, `services/admin-feedback.store.ts`, `apps/api/src/admin/admin-feedback.service.ts`.

#### ADM-03 Set status and reply
- What it does: Per message a "Status" select and a "Reply" textarea ("Shown to the sender in Your feedback. Leave empty for none.", counter) with "Save" (disabled until something changed). Save sends only what changed (an emptied reply clears it). Applied at once; on refusal the message goes back and a toast shows, while the draft stays in the form.
- Entry points: inside each inbox item.
- Screens / routes: SCR-ADM-02.
- Data: `PATCH /api/admin/feedback/:id { status?, reply? (string ≤2000 | null) }` → AdminFeedbackItem.
- Feedback: failure toast "Couldn't save" / "The message is back as it was. Try again."; validation "Keep the reply to {{max}} characters or fewer."
- Limits: reply ≤ 2000.
- Related: FBK-04.
- Source: `components/admin-feedback-item/*`.

#### ADM-04 Usage stats
- What it does: `/admin/stats` shows aggregates over real users (demo and admin accounts excluded; groups smaller than 3 hidden): Overview tiles (Real users, Active in the last 7 days, Came back after a week, Came back after a month, Active in the last 30 days, Finished onboarding, Demo sandboxes now "Not counted anywhere else") and an activity note; Sign-ups chart by Days (30) or Weeks (12) with total; Features: links per user (mean, median, buckets 0 / 1-9 / 10-49 / 50-99 / 100+) and "Who uses what" share rows (15 features); Preferences: Theme, Language, Trash keeps items for; Ratings and messages: per milestone answered/skipped, mean/median, score groups 1–6 / 7–8 / 9–10; Messages by type and by status. "Updated at {{time}}" with a "Refresh" button.
- Entry points: ADM-01; admin switch "Stats".
- Screens / routes: SCR-ADM-03.
- Platforms: All.
- States: loading skeleton ("Loading the stats"); error "Couldn't load the stats." + "Try again"; refresh failure "Couldn't refresh. These are the last numbers."; "Refreshing…"; too few users notice "Not enough users yet: shares and groups appear from {{min}} real users."; hidden values "Not enough users yet", "Fewer than {{min}}", "Hidden: a group of fewer than {{min}}".
- Data: `GET /api/admin/stats` (no-store, computed live).
- Limits: MinGroup 3, SignUpDays 30, SignUpWeeks 12.
- Related: ADM-05.
- Source: `features/admin/pages/admin-stats/*`, `components/admin-share-row/*`, `apps/api/src/admin/admin-stats.service.ts`, contracts `admin/*`.

#### ADM-05 Admin page switch
- What it does: A segmented control "Feedback / Stats" (accessible name "Admin pages") on both admin pages switches between them.
- Entry points: top of both admin pages.
- Source: `components/admin-switch/*`.

### 3.6 Browser extension

Scope: the Chrome MV3 extension popup (`apps/extension`), how the web app offers it (`apps/web/src/app/core/browser-extension`, library banner, sidebar row, Settings row, landing block, privacy text), the API pieces the extension depends on (session cookie, CSRF origin rule, lookup and batch routes), and the mockups `Extension.dc.html`, `ExtensionTabs.dc.html`, `ExtensionInstall.dc.html`.

General facts about the popup surface:
- Fixed size 360 x 600 (Chrome's maximum popup height) in every state; nothing resizes between states. Only inner lists scroll (form body, tab list, skipped list, picker list).
- Every screen shares one frame: header row on top, footer row pinned to the bottom edge.
- Theme: follows the browser/OS colour scheme (light or dark). There is no theme switch, and the web app's own theme setting is not read.
- Language: the first browser language (`navigator.languages`) that the popup ships, otherwise English. 7 languages: English, French, German, Italian, Spanish, Portuguese, Ukrainian. The popup cannot read the language chosen in the web app. The language file loads before the first render.
- Desktop only (Chrome extension). The web app offers it only on desktop-wide windows (from 64em) in Chrome, Edge, Brave, Arc (and other Chromium builds that report "Chromium", except Opera, Opera GX, Samsung Internet).
- Version 1.2.0, minimum Chrome 120.

#### EXT-01 Open the popup
- What it does: Opens the Shelfmark popup on the current tab. Opening reads the tab, checks the session, loads folders, tags, domain rules, the AI settings, the window's tab count, and checks whether this address is saved already, all at once. Nothing is created by opening.
- Entry points: the toolbar button (tooltip "Save to Shelfmark"; dev build "Shelfmark (dev)"); keyboard shortcut Alt+Shift+S (same keys on Mac, i.e. Option+Shift+S), changeable by the user at chrome://extensions/shortcuts.
- Screens / routes: SCR-EXT-01 (Opening), then one of SCR-EXT-02, SCR-EXT-08, SCR-EXT-09, SCR-EXT-10, SCR-EXT-11.
- Platforms: extension (desktop Chromium browsers).
- States: loading skeleton only after 300 ms (no flash on a fast answer); signed out; unsupported page; already saved; load error; offline/timeout (15 s).
- Data: GET /api/auth/get-session; GET /api/folders; GET /api/tags; GET /api/rules; POST /api/links/lookup { url without #fragment }; GET /api/ai/settings; chrome.tabs.query (active tab; window tabs for the count); chrome.permissions.contains (tabs).
- Settings that change it: domain rules (prefill), AI on/off (AI button shown or not).
- Feedback: none beyond the screen change.
- Limits: request timeout 15 s per request.
- Related: EXT-04, EXT-05, EXT-06, EXT-16.
- Source: `apps/extension/manifest/*/manifest.json` (`action`, `commands._execute_action`), `popup/popup.store.ts` (`init`, `load`), `models/opening-delay-ms.const.ts`, `core/api/timeout.interceptor.ts`.

#### EXT-02 Popup language, theme, size and motion
- What it does: Picks the popup language from the browser, follows the browser's light/dark scheme, keeps one fixed size, and animates state changes (120 ms fade), the Saved check pop and card landing, the Saved-tabs card stack drop, the sign-in card strip fly-in and float, and the footer's primary button "opening up" beside Open Shelfmark on the first screen after opening (width and fade). Reduced motion: no fly/float/pop, fades only (or nothing).
- Entry points: automatic.
- Screens / routes: all popup screens.
- Platforms: extension.
- States: none.
- Data: `navigator.languages`; `prefers-color-scheme`; `prefers-reduced-motion`.
- Settings that change it: browser language list; OS/browser colour scheme; OS reduced motion.
- Feedback: none.
- Limits: 7 languages; English fallback.
- Related: EXT-19 (store texts are localised separately).
- Source: `core/i18n/resolve-ext-lang.ts`, `core/i18n/models/ext-lang.const.ts`, `app.config.ts`, `src/styles.scss`, component scss files.

#### EXT-03 Sign in through the web app (signed-out state)
- What it does: When there is no Shelfmark session in this browser, the popup shows a sign-in screen. The button opens the web app's sign-in page in a new tab and closes the popup. The extension then uses the browser's Shelfmark session cookie (no separate login, token or key); signing out in the app signs the extension out too. Any 401 during load, lookup, folder creation, save or the tabs check also leads to this screen.
- Entry points: automatic on open without a session; any 401 later.
- Screens / routes: SCR-EXT-09; opens `<origin>/sign-in` and `<origin>/privacy` in new tabs.
- Platforms: extension.
- States: decorative card strip animates on every open; reduced motion keeps cards still.
- Data: GET /api/auth/get-session (answer `null` = signed out); the cookie is attached by the browser to the Shelfmark origin only; the popup never reads it.
- Settings that change it: none.
- Feedback: none (popup closes when the tab opens).
- Limits: none.
- Related: sign-in (other area), EXT-20.
- Source: `popup-signed-out/*`, `popup.store.ts` (`openSignIn`, `openPrivacy`, `fail`), `core/api/credentials.interceptor.ts`, ADR 0046.

#### EXT-04 Read the current tab; pages that cannot be saved
- What it does: Reads only the active tab's address and title (activeTab permission). Non-http(s) tabs (chrome://, edge://, file://, the Web Store, the new tab page) and a tab closed while opening show "This page can't be saved"; nothing is sent. For saveable pages it shows a preview (blank accent thumbnail tile, host without "www.", title, max 2 lines). The title is trimmed; on YouTube (youtube.com, m.youtube.com, youtu.be) a leading unread count "(3) " and the trailing " - YouTube" are removed, and a bare "YouTube" title (page still loading) is treated as no title: the preview then shows the host, and no title is sent so the server reads the video's own title.
- Entry points: on open.
- Screens / routes: SCR-EXT-10; preview on SCR-EXT-01, SCR-EXT-02, SCR-EXT-11.
- Platforms: extension.
- States: unsupported.
- Data: chrome.tabs.query({active, currentWindow}) url, title.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: EXT-06.
- Source: `core/chrome/browser-tabs.service.ts`, `utils/to-page-info.ts`, `models/youtube-tab-title.const.ts`, `popup-message/*`.

#### EXT-05 Duplicate check and "Already in your library"
- What it does: On open, sends the address without its #fragment to the lookup route. If the user already has a live (not trashed) link with the same normalised address (tracking parameters ignored), the popup shows "Already in your library" instead of the form: the saved link as its library card (image, favicon/letter, host, title, tags), and a notice "You saved this {{when}} in {{folder}}." (relative time in the popup language, e.g. "2 days ago", at least "1 minute ago"; folder name or "Unsorted"). Nothing is created. "Save a copy" opens the form with a fresh idempotency key and saves a second copy on Save. "Open in Shelfmark" (or clicking the card) opens the link's folder page (or Unsorted) in the app and closes the popup. A lookup failure other than 401 (e.g. 404 on an older API, 429) silently falls back to the plain form.
- Entry points: automatic on open.
- Screens / routes: SCR-EXT-08.
- Platforms: extension.
- States: lookup failure → form; 401 → signed out.
- Data: POST /api/links/lookup { url } → { link: LinkResponse | null }; reads link title, url, tags, imageUrl, faviconUrl, folderId, createdAt. The page is never fetched by the server for this.
- Settings that change it: none.
- Feedback: warning notice.
- Limits: lookup shares the add-link rate limit (30 per minute per client IP).
- Related: EXT-06, EXT-17.
- Source: `popup-duplicate/*`, `popup.store.ts` (`lookup`, `saveCopy`, `openLinkFolder`), `utils/relative-day.ts`, `apps/api/src/links/links.controller.ts` (`lookup`).

#### EXT-06 Save the current page (prefilled form)
- What it does: Shows the form "Save to Shelfmark" with everything filled in: the preview, the Folder (from a matching domain rule if its folder still exists, else Unsorted), the rule's tags, empty note. Focus starts on Save, so the quick path is the shortcut then Enter. Save creates the link with the URL (full, with fragment), the title (AI's cleaned title if Fill in with AI applied one, else the tab title, max 300 characters, omitted if no usable tab title), folder, tags, note (trimmed, omitted when empty), an idempotency key, the AI draft id if any, and "apply rules: off" (the form already shows the rule result). While saving, Save shows a spinner and folder/tags/AI controls lock; the note field is disabled. After success: the Saved screen. Closing the popup at any time saves nothing (no Remove/Undo needed). The saved folder is remembered as a recent folder.
- Entry points: Save button; Enter on the focused Save button; Ctrl+Enter / ⌘+Enter anywhere in the form (Enter alone stays with the tag and note fields).
- Screens / routes: SCR-EXT-02 → SCR-EXT-06 or SCR-EXT-11.
- Platforms: extension.
- States: saving (spinner, locked); error; signed out; Save disabled while Fill in with AI runs.
- Data: POST /api/links { url, title?, folderId?, tags, note?, idempotencyKey, aiDraftId?, applyRules: false } → LinkResponse; POST /api/folders first when a new folder was named (EXT-08).
- Settings that change it: domain rules (#398) prefill folder and tags; AI settings (EXT-11).
- Feedback: Saved screen with status heading.
- Limits: title 300 chars; tags 20; note 2000 (API); library cap 10,000 links per user, 100 for demo; add-link rate limit 30/min.
- Related: EXT-07, EXT-08, EXT-09, EXT-10, EXT-11, EXT-12, domain rules (other area).
- Source: `popup-form/*`, `popup.store.ts` (`save`, `prefill`), `@shelfmark/contracts` `findMatchingRule`, `LINK_LIMIT`.

#### EXT-07 Folder choice (picker, recent folders, rule hint)
- What it does: The Folder field is a button showing the folder's icon and colour tile (inbox tile for Unsorted; folder-plus tile and a "new" badge for a folder named in the popup) and name; accessible name "Folder: {{folder}}. Change". It opens the folder picker filling the popup: back button, title "Choose a folder", a search box "Find a folder" (focused on open on non-touch devices), the folder tree in sidebar order (nested, with icons/colours), an "Unsorted" row first, the current choice ticked, "No folder with that name" when the search finds nothing, and "New folder" at the bottom. Choosing a row returns to the form at once. Back or Esc returns without change. Under the field: "From your rule for {{domain}}" while the folder is still the one a domain rule picked; and up to 3 "Recent folders" chips (folders saved to most recently from this extension, newest first, that still exist; "Unsorted" can be one), the current one highlighted; a chip click picks that folder.
- Entry points: Folder button; recent-folder chips; Esc/Back in picker.
- Screens / routes: SCR-EXT-02, SCR-EXT-04.
- Platforms: extension.
- States: locked while saving, while the mode switch is busy, or while AI fills/sorts.
- Data: folders from GET /api/folders (id, name, icon, colour, parentId, position); recent folder ids in the extension's own localStorage key `sm-ext-recent-folders` (max 3; storage failure ignored).
- Settings that change it: domain rules.
- Feedback: none.
- Limits: 3 recent chips.
- Related: EXT-08, EXT-14 (tabs variants of the picker).
- Source: `popup-picker/*`, `popup-form/*`, `utils/recent-folders.ts`, `utils/to-folder-options.ts`, `models/recent-folders-*.const.ts`, `libs/ui` picker-list.

#### EXT-08 New folder, created on Save
- What it does: From the picker, "New folder" opens a screen with a "Folder name" field (placeholder "For example, Recipes", hint "The folder is created when you save the page.") and "Create" (disabled while empty). Create or Enter returns to the form with the name shown in the Folder field with a "new" badge. A name equal (ignoring case) to an existing folder picks that folder instead. The folder is created only on Save (closing leaves no empty folder), as a root folder. If creation fails (folder limit, server error) the link is still saved without a folder (Unsorted) and the Saved screen shows a warning; a 401 stops the save and shows sign-in. A retry never creates the folder twice. Back/Esc returns to the picker. The name is trimmed and cut to 100 characters silently.
- Entry points: picker "New folder" button (not shown when the picker is for one tab's link).
- Screens / routes: SCR-EXT-05.
- Platforms: extension.
- States: Create disabled when empty.
- Data: POST /api/folders { name } → FolderResponse.
- Settings that change it: none.
- Feedback: "Couldn’t create the folder “{{name}}”, so the link is saved without a folder." (warning notice on Saved).
- Limits: name max 100 characters; 500 folders per user (API).
- Related: EXT-07, folders (other area).
- Source: `popup-new-folder/*`, `popup.store.ts` (`chooseNewFolder`, `createNewFolder`).

#### EXT-09 Tags
- What it does: A tag input labelled "Tags" (in All tabs: "Tags for all") with placeholder "Add tag", suggestions from the user's existing tags ("Tag suggestions" list), "Create tag" for a new name, removable chips ("Remove tag"), screen-reader announcements "Tag added" / "Tag removed", the message "This tag is already added" for a repeat, and "Up to 20 tags" at the cap. Enter adds a tag. Prefilled with a matching domain rule's tags. New tags are created on save.
- Entry points: the field.
- Screens / routes: SCR-EXT-02, SCR-EXT-03.
- Platforms: extension.
- States: disabled while locked (saving, AI busy, switch busy).
- Data: GET /api/tags (names); sent as `tags` on save.
- Settings that change it: domain rules.
- Feedback: live announcements.
- Limits: 20 tags per link.
- Related: EXT-06, EXT-11, tags (other area).
- Source: `popup-form/popup-form.component.html` (`ui-tag-input`), `LINK_LIMIT.TagsMax`.

#### EXT-10 Note
- What it does: Single-line text field "Note" with placeholder "Why are you saving this?". Optional; trimmed; sent only when not empty. Hidden in All tabs mode. Disabled while saving. Sent to AI only when the account's "Include my notes" AI setting is on and the user clicks Fill in with AI.
- Entry points: the field.
- Screens / routes: SCR-EXT-02.
- Platforms: extension.
- States: disabled while saving; hidden in All tabs.
- Data: `note` on POST /api/links.
- Settings that change it: AI "Include my notes" (whether it goes to AI).
- Feedback: none.
- Limits: 2000 characters (API).
- Related: EXT-06, EXT-11.
- Source: `popup-form/popup-form.component.html`.

#### EXT-11 Fill in with AI (single page)
- What it does: Only when AI is on for the account and it has an allowance (`enabled` and monthly links limit > 0). A footer button "Fill in with AI" (spark icon, AI style) above the other footer buttons. Nothing goes to AI until the click. Then the popup sends the address (without fragment), the usable tab title and, with "Include my notes", the note; polls the job every second up to 8 s. While waiting the button reads "Filling…" with a spinner, Folder and Tags lock, Save is disabled. On success: the suggested folder is put in only if the Folder field is Unsorted and no new folder is named and the folder exists; all suggested tags (existing and new, not the "more" ideas) are added next to the user's (no repeats, max 20); the cleaned-up page title replaces the preview title and is sent on save; "more" new-tag ideas show as a "Suggested" row of dashed chips (each "Create and add tag {{name}}", with a dismiss "Dismiss suggestion {{name}}", tag marked "New"). Spark mark on the Folder label while AI's folder is still chosen (tooltip "Generated by AI, may be inaccurate"); a "Tags from AI" badge on the tags label while an AI tag is still in the field. Live region announces "Filled in with AI’s suggestions". The button then disappears (a second fill is not possible). Too slow, nothing found or rejected: the popup looks as before (button stays). Monthly limit: quiet line "Suggestions are paused until {{date}}. You used this month’s {{limit}} links." with action "AI settings" (opens the app's AI settings page). Failure: quiet line "Suggestions aren’t available right now. Your link saves as usual."; clicking again reuses the same draft id. Save sends the draft id so the server attaches the draft (summary etc.) to the link.
- Entry points: "Fill in with AI" footer button.
- Screens / routes: SCR-EXT-02; opens `<origin>/settings/ai`.
- Platforms: extension.
- States: AI off/no allowance (no AI UI at all); idle; loading; ready; quota; unavailable; hidden (too slow/nothing).
- Data: GET /api/ai/settings (settings.enabled, settings.includeNotes, usage.linksLimit, usage.resetsOn); POST /api/ai/drafts { draftId, url, title?, note? }; GET /api/ai/jobs/:id (status, reason, suggestions[kind, folderId, tagName, more], title).
- Settings that change it: Settings › AI (on/off, include notes); plan allowance.
- Feedback: live announcement; quiet AI line (status role).
- Limits: poll max 8 s; drafts route 30/min; tags capped at 20.
- Related: AI suggestions in Add link (other area), EXT-14.
- Source: `services/popup-ai-fill.service.ts`, `popup-form/*`, `models/ai-*.ts`, `AI_LIMIT.DraftPollMaxMs`.

#### EXT-12 Saved screen (single page)
- What it does: After a successful save: a check icon pops in, heading "Saved to {{folder}}" (folder name or "Unsorted", announced as status), optional warning that the new folder could not be created, and the new link as its library card (image from the Shelfmark API once captured, favicon, host, title, tags). "Open in Shelfmark" or clicking the card opens the app on that folder's page (or Unsorted) in a new tab and closes the popup. "Done" or Esc closes the popup. No timer.
- Entry points: after Save.
- Screens / routes: SCR-EXT-06.
- Platforms: extension.
- States: with/without folder warning; image pending (no image).
- Data: LinkResponse of the save.
- Settings that change it: none.
- Feedback: status heading.
- Limits: none.
- Related: EXT-06, EXT-17.
- Source: `popup-saved/*`, `popup-link-card/*`, `utils/to-app-asset.ts`.

#### EXT-13 All tabs mode (save several open tabs)
- What it does: A header switch "This page / All tabs ({{count}})" (label "What to save") replaces the title when the window has more than one tab (before the permission is granted the count is all tabs of the window; after it, only saveable ones). "This page" is the default (single save). The first switch to All tabs asks Chrome for the optional "tabs" permission (Chrome's own prompt); declined: the popup stays on This page and the switch snaps back. Granted: the list builds (skeleton "Reading your tabs"), the first 24 tabs' addresses (without fragment) are checked against the library (3 at a time) so "Saved" can show; a failure other than 401 stops the checks silently. The list replaces the preview: a "Select all" checkbox labelled "{{selected}} of {{total}} selected" (indeterminate when some are ticked) with "{{count}} already saved" next to it, then one row per tab: checkbox (named by the title), favicon letter (first letter of the host), title, host, a "Saved" badge for tabs already in the library. All are ticked except saved ones. Clicking the title/host text also toggles the tick (mouse). Only http(s) tabs, one row per normalised address (first wins), the active tab first, at most 100. If fewer than 2 saveable tabs, it falls back to This page. In All tabs the Folder field is for all links, Tags become "Tags for all", Note, rule hint, recent-folder chips, AI marks and the Suggested row are hidden. Save reads "Save {{count}} link(s)" and is disabled at 0 ticked and while the list loads. Switching back and forth after the first list keeps the list (no new prompt or lookup).
- Entry points: header segmented control.
- Screens / routes: SCR-EXT-03; Chrome permission prompt (system).
- Platforms: extension.
- States: switch busy; list loading; declined permission; fewer than 2 tabs; lookup stopped; 401 → signed out; other failure during listing → load error screen.
- Data: chrome.permissions.request/contains {tabs}; chrome.tabs.query({currentWindow}) (id, active, url, title, favIconUrl); POST /api/links/lookup per tab (max 24). Titles stay in the browser until Save.
- Settings that change it: none.
- Feedback: none.
- Limits: 100 tabs listed; 24 checked for "Saved"; 3 parallel requests.
- Related: EXT-14, EXT-15.
- Source: `services/popup-tabs.service.ts`, `popup-tab-list/*`, `popup-form/*`, `utils/to-tab-entries.ts`, `models/tabs-lookup-max.const.ts`, `models/tabs-request-concurrency.const.ts`.

#### EXT-14 Sort with AI (All tabs) and per-link folders
- What it does: Only while AI is on and in All tabs. Footer button "Sort {{count}} link(s) with AI" (count = ticked, max 25), disabled at 0 ticked. Click: one draft request per ticked tab (address and usable title; never the note), 3 at a time, then polling in rounds (spaced at least 1 s, or 0.8 s per waiting job) up to 30 s; a 429 while polling is retried next round. While working the button reads "Sorting {{count}} link(s)…" with spinner, each working row shows a grey placeholder line, folder/tags/ticks lock. Each sorted row gets a third line: spark (tooltip "Generated by AI, may be inaccurate"), a folder chip (folder tile + name; accessible name "Folder for this link: {{folder}}. Change") and 1–2 tag chips (a tag the user does not have yet is dashed, tooltip "New"). AI only picks existing folders. The Folder field then reads "Picked by AI for each link" (spark). The button disappears. Live region: "Links sorted with AI’s suggestions". Tapping a row's folder chip opens the picker titled "Folder for this link" (no Unsorted row, no Keep row, no New folder) to choose that link's folder. The Folder field's picker is titled "Folder for {{count}} link(s)" with a first row "Keep AI picks" / "Each link its own folder" (pressed/ticked while active) and a summary line: "Each link keeps the folder AI picked." or "All {{count}} links go to {{folder}}. The AI tags stay." / "The link goes to {{folder}}. The AI tags stay."; choosing a folder (or a new folder) sends all links there (AI tags stay); "Keep AI picks" restores per-link folders. A tab ticked after sorting takes the Folder field's folder. Quota during sort: remaining tabs keep the shared folder and the line "Suggestions are paused until {{date}}. The other links go to the folder in the Folder field." with "AI settings". All failed: "Suggestions aren’t available right now. Your link saves as usual." Too slow tabs save without suggestions (the server finishes the draft).
- Entry points: footer AI button; row folder chips; Folder field.
- Screens / routes: SCR-EXT-03, SCR-EXT-04 (tabs variants).
- Platforms: extension.
- States: idle, working, done, none per row; quota; unavailable; AI off (no button).
- Data: POST /api/ai/drafts per tab; GET /api/ai/jobs/:id; on save each item carries its own folderId, tags (AI's + "Tags for all", max 20) and aiDraftId.
- Settings that change it: Settings › AI; allowance (each tab counts as one link).
- Feedback: live announcement; quiet line.
- Limits: 25 tabs per sort; 2 tags per tab; poll 30 s; drafts 30/min; job polls within the 120/min default.
- Related: EXT-11, EXT-13, EXT-15.
- Source: `services/popup-tabs-ai.service.ts`, `popup-tab-list/*`, `popup-picker/*`, `popup-form/*`, `models/tabs-ai-*.const.ts`, `models/tab-ai-*.ts`.

#### EXT-15 Save ticked tabs (batch) and the Saved-tabs screen
- What it does: Save in All tabs sends the ticked tabs in one batch request: each with URL, tab title (if usable, max 300), its own idempotency key (kept across retries, so a retry never creates copies), the tab icon address as a hint (if http(s) and ≤ 2048 chars), and, for sorted/overridden tabs, its own folder, tags and draft id; the batch carries the shared folder and "Tags for all"; domain rules apply to tabs left open (unless every item has its own values). A new folder named in the popup is created first (EXT-08). Result screen: when nothing was skipped, a stack of three cards drops in, heading "{{count}} link(s) saved to {{folder}}" (one folder) or "{{count}} link(s) saved" (several folders), text "You can close the tabs now: they are in your library.", and a button "Close {{count}} saved tab(s)" which closes exactly the saved tabs on click (never automatic), then "The saved tabs are closed.". When the API skipped some: heading "{{saved}} of {{total}} saved", text "This tab was skipped. The rest are in your library." / "These {{count}} tabs were skipped. The rest are in your library.", a list of skipped tabs (letter, title, reason "Address is too long" or "Same address as another tab"), and the close button if any were saved. Footer: "Open in Shelfmark" (folder page if one folder, else the library /links) and "Done"; Esc closes. The one folder is remembered as a recent folder.
- Entry points: Save (All tabs); Ctrl/⌘+Enter.
- Screens / routes: SCR-EXT-03 → SCR-EXT-07 or SCR-EXT-11.
- Platforms: extension.
- States: saving; full success; partial (skipped); tabs closed; error (retry resends the same keys).
- Data: POST /api/links/batch { items[{url, title?, idempotencyKey, faviconUrl?, folderId?, tags?, aiDraftId?}], folderId?, tags?, applyRules } → { links[], errors[{index, code}] }; chrome.tabs.remove(ids).
- Settings that change it: domain rules.
- Feedback: status heading; status line after closing.
- Limits: 100 items per batch; batch route 5 per minute; the whole batch is refused if it does not fit the library cap.
- Related: EXT-13, EXT-14, paste many (other area, same API).
- Source: `popup.store.ts` (`saveTabs`, `closeSavedTabs`, `openSavedTabsFolder`), `utils/to-batch-request.ts`, `utils/to-tabs-save-result.ts`, `popup-saved-tabs/*`.

#### EXT-16 Errors, offline, timeout, retry
- What it does: Any failed load or save that is not a 401 shows an error screen with an illustration (offline scene for no connection, "not found" scene otherwise), heading "Couldn't reach Shelfmark" (load) or "Couldn't save this page" (save), and one reason line (alert): no connection or a request over 15 s ("No connection to Shelfmark. Check the internet and try again."), 429 ("Too many saves in a row. Wait a minute and try again."), library full ("Your library is full. Remove some links in Shelfmark to save new ones."), demo full ("A demo holds 100 links. Sign in with Google or GitHub to keep saving."), anything else ("Something went wrong on our side. Try again in a moment."). The page preview stays visible. "Try again" (not offered for the two limit errors) repeats the failed step: a load repeats the whole opening; a save goes back to the form and saves again with the same idempotency key (so no second copy). "Open Shelfmark" is always there. There is no separate offline detection: offline is a failed request.
- Entry points: automatic.
- Screens / routes: SCR-EXT-11.
- Platforms: extension.
- States: offline, rate limit, limit, demo limit, server; load vs save.
- Data: HTTP status 0/429/401; error message text "Demo link limit reached" / "Link limit reached".
- Settings that change it: none.
- Feedback: alert line.
- Limits: 15 s timeout.
- Related: EXT-06, EXT-15, demo (other area).
- Source: `popup-message/*`, `utils/to-popup-failure.ts`, `models/popup-error.const.ts`, `models/popup-step.const.ts`, `core/api/timeout.interceptor.ts`, `models/request-timeout-ms.const.ts`.

#### EXT-17 Open pages of the web app from the popup
- What it does: Buttons open web app pages in a new tab and close the popup: "Open Shelfmark" → /links (library); "Open in Shelfmark" → /folders/:id or /unsorted of the saved/existing link (or /links for a multi-folder batch); "Sign in to Shelfmark" → /sign-in; "Privacy policy" → /privacy; "AI settings" → /settings/ai.
- Entry points: footer buttons on most screens; card click on Saved and Already saved.
- Screens / routes: SCR-EXT-01, 02, 03, 06, 07, 08, 09, 10, 11.
- Platforms: extension (opens the web app on desktop).
- States: none.
- Data: chrome.tabs.create({url}).
- Settings that change it: none.
- Feedback: popup closes.
- Limits: none.
- Related: library, folders, sign-in, privacy, AI settings (other areas).
- Source: `core/config/models/app-path.const.ts`, `popup.store.ts` (`open*`), `browser-tabs.service.ts` (`open`).

#### EXT-18 Privacy and data rules of the popup
- What it does: Only these leave the browser: on open, the active tab's address without #fragment (duplicate check); on Save, URL and title plus chosen folder, tags and note; on Fill in with AI, address, title (and note with "Include my notes"); on switching to All tabs, the listed tabs' addresses without fragment (first 24) for the "Saved" marks; on Save in All tabs, the ticked tabs' URLs, titles and icon addresses; on Sort with AI, the ticked tabs' addresses and titles (max 25). Recent folder ids are kept locally. The popup text says "Only the page you save is sent, nothing else you browse." The web privacy page has an extension section (EXT-26).
- Entry points: n/a.
- Screens / routes: SCR-EXT-09 privacy line, SCR-EXT-17.
- Platforms: extension.
- States: n/a.
- Data: as above.
- Settings that change it: AI on/off; Include my notes.
- Feedback: none.
- Limits: as above.
- Related: EXT-26.
- Source: `apps/extension/CLAUDE.md`, services above, `docs/store/extension/listing.md`.

#### EXT-19 Permissions, manifest, builds, store listing
- What it does: Permissions: `activeTab`; optional `tabs` (asked at run time); host access only to `<origin>/api/*`. No storage permission, content scripts, background worker, context menus or badge. Strict content security policy: connects and loads images only from the Shelfmark origin (tab favicons cannot be shown, hence letter tiles). Command `_execute_action` with suggested key Alt+Shift+S. Two builds: production (talks to https://shelfmark-app.vercel.app, name/description localised via `_locales`) and development ("Shelfmark (dev)", talks to http://localhost:4200, description "Development build: saves to the local app on http://localhost:4200."). Store texts: name "Shelfmark", description "Save the page you are on to your Shelfmark library in one click, with a folder and tags.", toolbar tooltip "Save to Shelfmark", in 7 locales (de, en, es, fr, it, pt_BR, uk). Icons 16/32/48/128. Published in the Chrome Web Store (item id miknnnbmjdkfmkicappjhjpjmplmlhpb); installable in Edge, Brave, Arc from that store.
- Entry points: install from the Chrome Web Store; unpacked dev build.
- Screens / routes: none (browser UI).
- Platforms: desktop Chromium.
- States: n/a.
- Data: n/a.
- Settings that change it: browser's extension shortcut settings.
- Feedback: n/a.
- Limits: description ≤ 132 chars.
- Related: EXT-20.
- Source: `apps/extension/manifest/*`, `public/_locales/*/messages.json`, `core/config/*`, `config-check.spec.ts`, `docs/SETUP.md` 5.9.

#### EXT-20 API support for the extension (auth, CSRF, lookup)
- What it does: The API accepts the extension's requests with the normal session cookie. No CORS headers (host permission makes them unnecessary). The CSRF guard trusts `chrome-extension://<32 letters a–p>` origins listed in the `EXTENSION_ORIGINS` environment variable (production: only these; any well-formed extension origin on a local, non-Vercel run); a trusted extension origin skips the Origin and Sec-Fetch-Site checks but still must send JSON; other extension origins get 403. Better Auth's trusted origins do not include the extension (it never calls state-changing auth routes). The lookup route answers from the database only.
- Entry points: n/a.
- Screens / routes: API.
- Platforms: API.
- States: production without `EXTENSION_ORIGINS` → every write from the extension is 403 (sign-in check still works).
- Data: GET /api/auth/get-session, GET /api/folders, POST /api/folders, GET /api/tags, GET /api/rules, POST /api/links, POST /api/links/batch, POST /api/links/lookup, GET /api/ai/settings, POST /api/ai/drafts, GET /api/ai/jobs/:id.
- Settings that change it: env `EXTENSION_ORIGINS`.
- Feedback: n/a.
- Limits: rate limits per client IP: default 120/min; POST /api/links and POST /api/links/lookup 30/min each; POST /api/links/batch 5/min; POST /api/ai/drafts 30/min.
- Related: EXT-03.
- Source: `apps/api/src/common/csrf/csrf.guard.ts`, `apps/api/src/config/extension-config.ts`, `apps/api/src/config/models/extension-origin-pattern.const.ts`, `apps/api/src/links/links.controller.ts`, `apps/api/src/common/rate-limit/models/rate-limit.const.ts`, ADR 0046, PROJECT.md 5.8 and 6.

#### EXT-21 Web app: when the extension is offered
- What it does: The web app decides whether to offer the extension: "fits" = a desktop Chromium browser that installs from the Chrome Web Store (Chrome, Edge, Brave, Arc, other "Chromium" brands; not Opera, Opera GX, Samsung Internet, Android, mobile, iOS shells) AND the window is desktop-wide (from 64em). "Offered" = fits AND the store URL constant is not empty. Entries render or not (never hidden by CSS). The app cannot detect whether the extension is already installed.
- Entry points: n/a.
- Screens / routes: SCR-EXT-13, 14, 15, 16.
- Platforms: desktop only (≥ 64em); phone and tablet never.
- States: not offered → nothing rendered.
- Data: navigator.userAgentData brands/mobile/platform or userAgent; `EXTENSION_STORE_URL`.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: EXT-22 to EXT-25.
- Source: `apps/web/src/app/core/browser-extension/*`, `apps/web/src/app/models/extension-store-url.const.ts`.

#### EXT-22 Web app: library install banner
- What it does: At the top of the library feed (signed in, offered, not dismissed, not while split view/preview split is open, not while selecting): an accent band with the logo mark, title "Save pages straight from your browser", text "The Shelfmark extension saves the page you are on in one click or Alt+Shift+S, with your folders and tags filled in.", a primary button "Install extension" (external icon; accessible name "Install extension from the Chrome Web Store (opens in a new tab)") opening the store page in a new tab, the real popup screenshot (light or dark to match the app theme) sliding in only from 80em, and a close button "Not now" (×). Closing hides it for good on this device (localStorage `sm-extension-banner-dismissed`, cleared when the session ends, so it returns for the next account); the sidebar then shows "Get the extension". The boot skeleton reserves its place when it will show. Enter/leave animation.
- Entry points: library page.
- Screens / routes: SCR-EXT-13 (on /links and other library views using the library page).
- Platforms: desktop only; screenshot from 80em.
- States: shown / dismissed / not offered.
- Data: localStorage key.
- Settings that change it: app theme (screenshot variant).
- Feedback: banner leaves.
- Limits: none.
- Related: library (other area), EXT-23.
- Source: `features/library/components/extension-banner/*`, `core/browser-extension/extension-banner.service.ts`, `features/library/library.page.html`, `shell/boot-skeleton/*`.

#### EXT-23 Web app: "Get the extension" sidebar row
- What it does: After the banner is dismissed (and still offered), the sidebar footer shows a row "Get the extension" (download icon) above the "Data & help" row; selecting it opens the store page in a new tab.
- Entry points: sidebar footer.
- Screens / routes: SCR-EXT-15.
- Platforms: desktop only (not on phone).
- States: shown only when dismissed and offered.
- Data: none.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: sidebar (other area).
- Source: `shell/sidebar/sidebar.component.*`, `shell/sidebar/utils/sidebar-nodes.ts`, `shell/sidebar/models/sidebar-extension-id.const.ts`.

#### EXT-24 Web app: Settings › Library › Saving "Browser extension" row
- What it does: Permanent row (when offered) in the Saving section of Settings › Library: title "Browser extension", description "Save any page in one click from Chrome, Edge, Brave or Arc", button "Install" (external icon; accessible name "Install the browser extension from the Chrome Web Store (opens in a new tab)").
- Entry points: Settings › Library.
- Screens / routes: SCR-EXT-14.
- Platforms: desktop only.
- States: hidden when not offered.
- Data: none.
- Settings that change it: n/a.
- Feedback: none.
- Limits: none.
- Related: settings (other area).
- Source: `features/settings/pages/library/library.page.*`.

#### EXT-25 Web app: landing "Save the page you are on"
- What it does: On the public landing page (only when "fits", even without a store URL), a section right after the hero: badge "Browser extension", title "Save the page you are on", text "One click on the toolbar or Alt+Shift+S. The title, your folder rules and recent folders are already filled in, so most pages take one more click.", line "For Chrome, Edge, Brave and Arc. Install it from your shelf after you sign in.", a mock browser bar (address cos.com/wool-coat-straight-cut and the logo button) and the popup screenshot (light/dark; alt text "The Shelfmark extension: Save to Shelfmark with the page title, the folder Clothes from a rule, tags and a note"). No install link. Reveals on scroll.
- Entry points: landing page.
- Screens / routes: SCR-EXT-16.
- Platforms: desktop only.
- States: hidden when not fitting.
- Data: none.
- Settings that change it: theme.
- Feedback: none.
- Limits: none.
- Related: landing (other area).
- Source: `features/landing/components/landing-extension/*`.

#### EXT-26 Web app: privacy page extension section
- What it does: The privacy page has a "Browser extension" section with two paragraphs describing what the extension sends and keeps (exact copy in SCR-EXT-17).
- Entry points: /privacy (also from the popup's "Privacy policy").
- Screens / routes: SCR-EXT-17.
- Platforms: all.
- States: none.
- Data: none.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: privacy (other area), EXT-18.
- Source: `features/privacy/privacy.page.html`, en.json `privacy.extension.*`.

#### EXT-27 Web app: changelog entries about the extension
- What it does: What's new lists extension items: "The Shelfmark browser extension is in the Chrome Web Store: install it from the banner on your shelf or from Settings › Library."; "The browser extension saves several open tabs at once, with one folder and tags for all (version 1.2.0, rolling out in the Chrome Web Store)."; and the AI suggestions entry mentions "Works in the browser extension too."
- Entry points: What's new (other area).
- Screens / routes: changelog (other area).
- Platforms: all.
- States: none.
- Data: none.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: changelog (other area).
- Source: en.json `changelog.items.extensionInStore`, `extensionTabs`, `aiSuggestions`.

#### EXT-28 Save a link from the right-click menu (designed, not built)
- What it does: Mockup only ("Later, not in v1"): right-click a link on any page → "Save link to Shelfmark" and "Save this page", saving without opening the popup, with a small toast in the corner. Needs a background worker and the context menu permission; not in the manifest or code.
- Entry points: page context menu (designed).
- Screens / routes: none built.
- Platforms: extension (designed).
- States: n/a.
- Data: n/a.
- Settings that change it: n/a.
- Feedback: toast (designed).
- Limits: n/a.
- Related: EXT-19.
- Source: `docs/design/screens/Extension.dc.html` state 9.

### 3.7 Public pages, sign-in, demo and onboarding

Scope: landing (`/`, `/about`), How it works video and card, privacy policy (`/privacy`), changelog (`/changelog`) and the What's new dialog and badge, sign-in (`/sign-in`), guards and redirects, sign-out, session expiry, demo (`/demo`, banner, limits, cleanup), tab sync of the session, welcome dialog, PWA (manifest, update prompt, first-paint skeleton). Public collection `/c/:token` is another area (listed in Routes only).

Breakpoints used in this area: phone below 40em (`ViewportService.phone`), compact below 64em (tab bar instead of sidebar and header), desktop from 64em (`ViewportService.desktop`), 80em (wide) and 160em (huge, sign-in drift cards only). Every `ui-dialog` turns into a bottom sheet with a grip below 40em.

#### PUB-01 Landing page for guests
- What it does: Public marketing page at `/` for a visitor without a session. One page of sections in this order: header, hero (headline, lead, two buttons, animated app preview), "Optional AI", "Browser extension" (desktop Chromium only), "Save once, find in seconds" (bento), "The same links, before and after", "Why this exists" + "How it's built" (side by side), finale call to action, footer with links and language switcher. A signed-in person who opens `/` never sees it: they get the app (see AUTH-05).
- Entry points: URL `/`; the logo links on `/privacy` and `/changelog` (`routerLink="/"`, accessible name "Shelfmark, home"); the public collection page's "about" link (other area); being signed out (sign-out goes to `/sign-in`, not here).
- Screens / routes: SCR-PUB-01, route `/` (guard `landingGuestOnly`).
- Platforms: desktop/tablet: header shows "How it works" and "Privacy" nav links plus "Sign in" and "Get started". Phone (below 40em): the nav links and "Get started" are not rendered; only "Sign in" stays in the header. The AI section on phones stacks copy and two cards (no search card). The extension section renders only on a desktop-wide (from 64em) Chrome, Edge, Brave, Arc or Chromium browser. Not in the extension.
- States: guest (this page); signed-in (becomes `/about` variant, PUB-02); first visit without a session hint renders at once without waiting for the API; reduced motion: every animation shows its final/static frame; below-the-fold sections load when the browser is idle (or at once when the visitor asks for a section), each with an empty placeholder of the same height while it loads.
- Data: none read from the API for the page itself. `GET /api/auth/get-session` runs in the background (AUTH-05). Language choice of a guest is stored in this browser's local storage.
- Settings that change it: language (footer switcher), theme (follows stored theme / system; the extension screenshot uses the light or dark image), Animations/reduced motion.
- Feedback: none (no toasts). The hero preview shows a decorative fake toast "Saved to Read later" with "Undo".
- Limits: none.
- Related: PUB-02 to PUB-10, AUTH-01, AUTH-08, browser extension (other area), language settings (other area).
- Source: `apps/web/src/app/features/landing/landing.page.html|ts`, `components/*`, `models/landing-links.const.ts`, `core/auth/auth.guards.ts` (`landingGuestOnly`), `core/routing/start-landing-load.ts`.

#### PUB-02 About page (landing for signed-in people)
- What it does: The same landing component at `/about`, reachable by everyone. For a signed-in person: every sign-in / get-started / demo button becomes a single "Back to my shelf" button (goes to `/links`), the hero note "Sign in with Google or GitHub." is hidden, and a "What's new" block appears right under the hero listing the 4 newest changelog highlights with dates and a "See all changes" link to `/changelog`. A guest at `/about` sees exactly the public landing.
- Entry points: desktop account menu item "About Shelfmark" (icon info); phone/tablet You list row "About Shelfmark" (Settings index); public collection page link (other area); URL `/about`.
- Screens / routes: SCR-PUB-02, route `/about` (no guard).
- Platforms: as PUB-01. In the header the signed-in variant shows only "Back to my shelf" (plus nav links on non-phone).
- States: signed-in vs guest as described.
- Data: changelog data bundled in the app (no API). Language switch saves on the account (`PATCH /api/me/settings`, language) when signed in.
- Settings that change it: language, theme, motion.
- Feedback: none.
- Limits: 4 highlights in the What's new block.
- Related: PUB-01, PUB-12, account menu (SCR-AUTH-05).
- Source: `features/landing/utils/inject-signed-in.ts`, `components/landing-whats-new/*`, `landing-header`, `landing-hero`, `landing-finale`; `shell/app-shell.component.ts` (`openAbout`); `features/settings/pages/settings-index/settings-index.page.html`.

#### PUB-03 Landing hero and animated app preview
- What it does: Headline in three lines "Paste a link." / "Find it again." / "Even in a year." (third line muted), lead "Videos, articles, things to buy, courses — on one calm shelf instead of chats and open tabs.", buttons "Start your shelf" (primary, to `/sign-in`) and "Open the demo" (secondary, to `/demo`), note "Sign in with Google or GitHub.". Next to it a decorative picture of the app: folder "Read later", count "21 links" (or "6 links"), a view switch "All 21" / "Articles 6", link cards (titles "Calm technology, a 20-minute talk" #video, "A complete guide to CSS grid" #css, "Designing for the long read" #design, "Why slow software feels broken" #ux) and a toast "Saved to Read later" with "Undo". When first scrolled into view in a visible tab, cards land one after another and the toast slides in (once); then the switch loops: "All" holds 4.2 s, switches to "Articles" (the video card leaves, articles shift one slot), holds 3.2 s, back. The loop pauses when out of view, tab hidden, or motion reduced.
- Entry points: first screen of `/` and `/about`.
- Screens / routes: SCR-PUB-01.
- Platforms: all widths; only as many cards as fit at a readable width are visible.
- States: reduced motion: the "All" frame shown statically, nothing waits; signed-in: one button "Back to my shelf", no note.
- Data: static.
- Settings that change it: motion.
- Feedback: none (preview is inert and hidden from assistive technology).
- Limits: none.
- Related: PUB-01, PUB-02.
- Source: `components/landing-hero/*`, `components/landing-hero-preview/*`, `models/landing-preview-cards.const.ts`, `models/landing-loop.const.ts`, `directives/landing-loop-gate.directive.ts`, `directives/app-link.directive.ts`.

#### PUB-04 Landing "Optional AI" section
- What it does: Badge "Optional AI" (spark icon), title "Help with sorting, when you want it", text "Turn on AI and each new link arrives with suggested tags, a folder and a two-line summary. Nothing moves until you tap it.", three points: "Suggestions you accept" — "Tags and folders from the ones you already have, one tap each."; "Find it by what it’s about" — "“That talk about signals” finds the video, even without those words."; "Ask your shelf" — "A question in your own words, an answer from your links with sources.". Note "Off until you turn it on. Your links are never used to train AI models." with link "How AI works in Shelfmark" to `/privacy#ai`. Decorative visual: a YouTube card "NgRx SignalStore in practice" with suggestion chips (folder Angular, tags angular (selected), signals, new tag "state management"), a search card "talk about signals and performance" with "Related by meaning" result "Zoneless change detection, explained" / "Close to: faster rendering", a summary card seriouseats.com "The best weeknight ramen" "A 30-minute ramen with store-bought stock, soft eggs and quick pickles.". Cards rise in once when scrolled into view.
- Entry points: scroll; first section after the hero.
- Screens / routes: SCR-PUB-01.
- Platforms: phone stacks copy and two cards (search card hidden).
- States: reduced motion: final frame.
- Data: static.
- Settings that change it: motion.
- Feedback: none.
- Limits: none.
- Related: PUB-11 (AI section), AI features (other area).
- Source: `components/landing-ai/*`, `components/landing-ai/models/landing-ai-points.const.ts`, `features/privacy/models/privacy-ai-fragment.const.ts`.

#### PUB-05 Landing "Browser extension" section
- What it does: Badge "Browser extension", title "Save the page you are on", text "One click on the toolbar or Alt+Shift+S. The title, your folder rules and recent folders are already filled in, so most pages take one more click.", line "For Chrome, Edge, Brave and Arc. Install it from your shelf after you sign in.", a fake browser bar with address "cos.com/wool-coat-straight-cut" and the Shelfmark mark, and a real popup screenshot (light or dark by theme) with alt "The Shelfmark extension: Save to Shelfmark with the page title, the folder Clothes from a rule, tags and a note". No install link.
- Entry points: scroll.
- Screens / routes: SCR-PUB-01.
- Platforms: only desktop width (from 64em) in a Chromium browser that installs from the Chrome Web Store; otherwise not rendered at all.
- States: not rendered on phone/tablet/other browsers.
- Data: static image `extensionPopupSrc(theme)`.
- Settings that change it: theme.
- Feedback: none.
- Limits: none.
- Related: browser extension (other area).
- Source: `components/landing-extension/*`, `core/browser-extension/browser-extension.service.ts` (`fits`).

#### PUB-06 Landing bento "Save once, find in seconds" and "How it works" scroll
- What it does: Section id `works`, title "Save once, find in seconds", five tiles: (wide) "The preview fills in by itself" — "Paste a link: the title and the site arrive on their own. Add a note so you remember why you saved it." with a fake URL field "youtube.com/watch?v=ng22" and a result "youtube.com" / "Signal Forms in 20 minutes"; "Folders inside folders" — "Keep links in folders and put folders in folders, as deep as your own system needs." with a tree Work 34 > Angular 12 (active) / Courses 8; "Find it by any word" — "Search the title, note or address of every link, from anywhere with ⌘K." with chips "coat" and tag "clothes"; "Save from your phone" — "Install Shelfmark and it shows up in the Share menu on Android. Share a page and it lands on your shelf."; (inverse) "Your links stay yours" — "Export everything as JSON or as a browser bookmarks file whenever you like.". Tiles fade in once. The header link "How it works" scrolls here (smooth unless reduced motion, after fonts load) and focuses the section; opening `/#works` in a new tab does the same on load. Opening `/#how` scrolls to "How it's built".
- Entry points: header "How it works" (plain left click scrolls; modified clicks open `/#works`); URL hash `#works` / `#how`.
- Screens / routes: SCR-PUB-01.
- Platforms: header link not shown on phone.
- States: reduced motion: instant scroll, no fade.
- Data: static.
- Settings that change it: motion.
- Feedback: focus moves to the section.
- Limits: none.
- Related: PUB-01.
- Source: `components/landing-bento/*`, `components/landing-header/*` (`onHowItWorks`), `landing.page.ts` (`scrollTo`, `sectionFor`), `models/landing-scroll-target.const.ts`, `models/landing-bento-folders.const.ts`.

#### PUB-07 Landing "Before and after" scene
- What it does: Title "The same links, before and after". Left "Before: scattered": a drifting collage (accessible name "Links scattered across Saved Messages, browser tabs, sticky notes and a bookmarks bar.") with "+1 in Saved Messages" / "youtu.be/…", a bubble "Saved messages" / "youtube.com/watch?v=ng22…", tabs "Wool coat…", "NestJS c…", "+ 37", a sticky note "watch later: ramen recipe?? link somewhere in chat", "Bookmarks bar (91)". Right "After: on one shelf": a folder tree Clothes, Work > Angular, Recipes, a "Tags" heading with chips video, courses, and the list of links of the active folder (e.g. Clothes: "Wool coat, graphite" — "Wait for the sale, size M", "Leather Chelsea boots" — "For the winter", "Merino crew-neck jumper" — "Gift idea"; Angular/Work: "Signal Forms in 20 minutes" — "Watch on the weekend", "NestJS for frontend developers" — "For the side project", "Zoneless change detection" — "Read before stage 0"; Recipes: "The best weeknight ramen" — "Friday dinner", "Focaccia, no knead" — "For Sunday", "Kimchi in a jar" — "Needs a big jar"). The active folder cycles through the folders (one full cycle 9 s) while on screen, tab visible and motion allowed; pointer hover or keyboard focus inside the block pauses both scenes.
- Entry points: scroll.
- Screens / routes: SCR-PUB-01.
- Platforms: all.
- States: reduced motion: static Clothes frame.
- Data: static.
- Settings that change it: motion.
- Feedback: none.
- Limits: none.
- Related: PUB-01.
- Source: `components/landing-before-after/*`, `components/landing-before-scene/*`, `models/landing-tree-rows.const.ts`, `models/landing-folder-lists.const.ts`, `models/landing-folder-cycle.const.ts`.

#### PUB-08 Landing "Why this exists" and "How it's built"
- What it does: "Why this exists": quote "“My saved messages had hundreds of links: courses, a coat I wanted, a ramen recipe, that one article about zoneless Angular. I could never find any of them again. So I built the shelf I wanted.”", avatar (initials of "Dmytro Dadivan"), name "Dmytro", role "Frontend developer". "How it's built" (id `how`): "Angular 22 with signals, NestJS, PostgreSQL. Planned, coded, tested and reviewed by a team of Claude Code agents, with every decision in the open.", a list (label "Claude Code agents") of eight role names: project-manager, architect, frontend-dev, ui-dev, backend-dev, test-engineer, code-reviewer, security-reviewer; links "Read the code on GitHub" and "Read the decision log" (external icon, "(opens in a new tab)", open GitHub repo and `docs/adr` in a new tab).
- Entry points: scroll; `/#how`.
- Screens / routes: SCR-PUB-01.
- Platforms: all (side by side on wide screens).
- States: reveal on scroll; reduced motion static.
- Data: static.
- Settings that change it: motion.
- Feedback: none.
- Limits: none.
- Related: PUB-01.
- Source: `components/landing-why/*`, `components/landing-built/*`, `models/landing-agent-roles.const.ts`.

#### PUB-09 Landing finale call to action
- What it does: Card with title "Empty your Saved Messages.", lead "Paste a link, give it a folder and a note. Everything you save from now on lands on one shelf, and any of it is two keystrokes away.", buttons "Open the demo" (primary, `/demo`) and "Sign in" (`/sign-in`). Signed-in: one "Back to my shelf" button.
- Entry points: scroll.
- Screens / routes: SCR-PUB-01, SCR-PUB-02.
- Platforms: all.
- States: guest / signed-in.
- Data: none.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: AUTH-01, AUTH-08.
- Source: `components/landing-finale/*`.

#### PUB-10 Landing footer and language switcher
- What it does: "© 2026 Shelfmark"; links "What's new" (`/changelog`), "Privacy" (`/privacy`), "GitHub" (repo, new tab, with hidden hint "(opens in a new tab)"); a button group (accessible name "Language") with one button per language, each in its own name (English, French, German, Italian, Spanish, Portuguese, Ukrainian), pressed state on the current one. A guest's choice applies at once and is kept in this browser (and saved on the account at the first sign-in); a signed-in visitor of `/about` saves it on the account.
- Entry points: bottom of `/` and `/about`.
- Screens / routes: SCR-PUB-01, SCR-PUB-02.
- Platforms: all.
- States: guest vs signed in (where the language is saved).
- Data: guest: local storage language settings; signed-in: `PATCH /api/me/settings` `{ language }`.
- Settings that change it: language (this is a way to set it).
- Feedback: the page re-renders in the chosen language.
- Limits: 7 languages.
- Related: Languages (other area), PUB-11, PUB-12.
- Source: `components/landing-footer/*`, `core/i18n/models/app-lang.const.ts`, `core/i18n/models/language-names.const.ts`, `core/i18n/locale.service.ts`.

#### PUB-11 Privacy policy page
- What it does: Static, public policy at `/privacy`. Header with the logo linking to `/` ("Shelfmark, home"). Title "Privacy policy", "Last updated 19 November 2026", intro, then sections in order: What we store (9 bullets), Cookies and browser storage (3 paragraphs), What we don't do (3 bullets), Link previews, Browser extension (2 paragraphs), Other services (sign-in text, links "Google privacy policy" and "GitHub privacy statement" in new tabs, tokens, avatar, monitoring), Where it lives, AI features (optional) (anchor `#ai`; intro + 7 term/text points: Who processes it, What is sent, How long it is kept, Search by meaning, Ask your shelf, What we count, Turning it off), How long we keep it (account data, sessions 7 days, demo 24 hours), Your control (export, delete), Security, Children, Changes to this policy, Contact (link "github.com/ddadivan/shelfmark" in new tab, note "Issues are public, so please do not put personal data in them."). Full copy is in en.json `privacy.*`.
- Entry points: landing header "Privacy" (non-phone), landing footer "Privacy", landing AI note "How AI works in Shelfmark" (`#ai`), sign-in page "Privacy policy" link, Settings index footer "Privacy policy", Settings › AI link (other area), OAuth consent screens (public on purpose), URL.
- Screens / routes: SCR-PUB-03, `/privacy` (no guard; guests and signed-in alike; outside the app shell).
- Platforms: all; single reading column.
- States: none (no data). `#ai` scrolls to the AI heading.
- Data: none.
- Settings that change it: language, theme.
- Feedback: none.
- Limits: none.
- Related: PUB-04, AUTH-01.
- Source: `features/privacy/privacy.page.html|ts`, `features/privacy/models/*`, `core/layout/fragment-target.directive.ts`.

#### PUB-12 Changelog page
- What it does: Public list of every shipped release at `/changelog`, newest first. Header logo to `/` ("Shelfmark, home"). Title "What's new", line "Every Shelfmark release, newest first. You're using Shelfmark {{version}}.". Per release: heading "Shelfmark {{version}}", date (locale formatted), then sections (each left out when empty): "New" (accent badge) with features (title, text, optional screenshot in the current theme), "Improved" with one-line items, "Fixed" with one-line items. A release without a date (draft) is hidden. Browser tab title "What's new · Shelfmark" (pattern `library.pageTitle.page`), restored on leave. Currently 20 shipped releases, 2.0.0 (2026-11-14) to 2.6.0 (2026-11-22).
- Entry points: landing footer "What's new"; `/about` "See all changes"; What's new dialog "See all changes" and "And N more…" link; phone You list "What's new" row only via its link (a plain click opens the dialog instead, see PUB-14); URL.
- Screens / routes: SCR-PUB-04, `/changelog` (no guard).
- Platforms: all.
- States: none.
- Data: bundled typed changelog data (`CHANGELOG`), app version constant.
- Settings that change it: theme (screenshot variant), language.
- Feedback: none.
- Limits: none.
- Related: PUB-13, PUB-14.
- Source: `features/changelog/changelog.page.html|ts`, `models/changelog.const.ts`, `utils/changelog-highlights.ts`, `utils/changelog-image-src.ts`, `utils/compare-versions.ts`.

#### PUB-13 What's new dialog (automatic and on request)
- What it does: Dialog "What's new in Shelfmark", lead "Here's what changed since your last visit.", then the top highlight large (screenshot for the current theme, title, text), up to three more highlights as small items (title + text), then a link "And {{count}} more improvement or fix" / "And {{count}} more improvements and fixes" to `/changelog` (left out when 0). Footer buttons "See all changes" (ghost: closes and opens `/changelog`) and "Got it" (primary: closes). Automatic: for a signed-in user, once the account's last-seen release is known, if a shipped release newer than the account's last-seen release has highlights (features with a priority), the dialog opens once per page load 1.5 s after the shell is up; while another dialog is open, a field is focused or the tab is hidden it retries every 5 s. Fix-only releases never open it. Opening the dialog (automatic or manual) marks the newest release as seen on the account. A new account (onboarding still due and nothing stored) is silently marked up to date so it sees the welcome dialog instead. An existing account that never stored a release sees the current highlights once. On request with nothing pending, it shows the newest release that has highlights (never an empty dialog).
- Entry points: automatic; sidebar "Data & help" menu item "What's new"; phone/tablet You list row "What's new"; the AI announcement waits while it is pending or open (other area).
- Screens / routes: SCR-PUB-05 (dialog over any app page).
- Platforms: desktop/tablet dialog (size md); phone: bottom sheet, footer buttons full width.
- States: pending vs nothing new; new account (suppressed); demo user (a demo is a new account: suppressed and marked seen).
- Data: `UserSettingsStore.whatsNewSeen` read from `GET /api/me/settings`, written with `PATCH /api/me/settings` `{ whatsNewSeen: "<version>" }`; bundled changelog data.
- Settings that change it: none.
- Feedback: none beyond the dialog.
- Limits: at most 4 highlights (1 large + 3 small).
- Related: PUB-12, PUB-14, ONB-01, rating prompt blockers (other area).
- Source: `features/changelog/services/whats-new.store.ts`, `components/whats-new-dialog/*`, `models/whats-new-delay.const.ts`, `shell/app-shell.component.ts` (`whatsNewWatch`), `stores/user-settings.store.ts`.

#### PUB-14 What's new entry points and "new" badge
- What it does: While something is pending (PUB-13), the desktop sidebar "Data & help" row/menu shows the item "What's new" with an accent badge "new" (pop animation); the phone/tablet You list row "What's new" shows a dot with hidden text "new". Clicking either opens the What's new dialog (the You row is a real link to `/changelog`, but a plain click is intercepted and opens the dialog).
- Entry points: desktop sidebar footer "Data & help" menu (gift icon); You list (Settings index, Help nav).
- Screens / routes: SCR-PUB-09, SCR-PUB-10.
- Platforms: desktop (from 64em) sidebar menu; compact (below 64em) You list.
- States: pending / not pending.
- Data: as PUB-13.
- Settings that change it: none.
- Feedback: badge/dot disappears after opening.
- Limits: none.
- Related: PUB-13, sidebar (other area), settings (other area).
- Source: `shell/sidebar/sidebar.component.html|ts`, `shell/sidebar/utils/inject-sidebar-labels.ts`, `features/settings/pages/settings-index/settings-index.page.html|ts`.

#### PUB-15 How it works video dialog
- What it does: Dialog "Shelfmark in 3 minutes" with the promo video (recording of the real interface, no audio, starts muted, native controls, plays inline), English captions on by default (track label "English"), poster image. Two recordings: desktop (1440x900) and phone (390x844), chosen by the layout when the dialog opens (phone below 40em). Autoplays unless reduced motion (then poster until the person presses play). Below the video an ordered chapter list (label "Chapters") of buttons with start time; clicking jumps there and plays; the chapter that is playing is marked pressed and follows playback. Chapters (desktop / phone start): "Save a link" 0:00/0:00, "Folders and tags" 0:33/0:27, "Many at once" 1:10/0:59, "Find it again" 1:41/1:22, "Undo and Trash" 2:10/1:42, "Make it yours" 2:27/1:56, "Share and export" 2:57/2:15. Close button labelled "Close". Opening it marks the How it works card done (PUB-16).
- Entry points: desktop account menu "How it works" (play icon); phone/tablet You list button "How it works"; sidebar card (PUB-16) title button; empty All links library: ghost button "Watch how it works" (only in the All links scope, next to the add-link action).
- Screens / routes: SCR-PUB-06.
- Platforms: desktop/tablet dialog size lg; phone bottom sheet with the phone recording.
- States: reduced motion (no autoplay); browsers without H.264 use the WebM source.
- Data: static media `/media/how-it-works-<desktop|phone>.(mp4|webm|webp|vtt)` from the app's own domain; marks local state (PUB-16).
- Settings that change it: Animations / reduced motion.
- Feedback: none.
- Limits: none.
- Related: PUB-16, ONB-02.
- Source: `features/how-it-works/components/how-it-works-dialog/*`, `models/how-it-works-chapters.const.ts`, `models/how-it-works-video.const.ts`, `services/how-it-works.service.ts`.

#### PUB-16 How it works sidebar card
- What it does: A small card at the bottom of the sidebar's scrolling part (after Tags): play icon, a button "New here? Watch how it works" (opens PUB-15), meta "3 minutes", and an icon button "Hide" (close icon). Shows during the first 14 days the account is first seen on this device, until the video was opened or the card hidden. For a demo user it shows regardless of the 14 days until opened/hidden. State is per user per device in local storage (`sm-how-it-works:<userId>` = `{firstSeen, done}`), so another device shows it again.
- Entry points: desktop sidebar.
- Screens / routes: SCR-PUB-07.
- Platforms: desktop only (from 64em, where the sidebar exists). Not in the phone Library (folders-only sidebar).
- States: visible / hidden; blocked storage: treated as first seen now (card shows again next time).
- Data: local storage only.
- Settings that change it: none.
- Feedback: card disappears.
- Limits: 14 days.
- Related: PUB-15.
- Source: `features/how-it-works/components/how-it-works-card/*`, `services/how-it-works.service.ts`, `models/how-it-works-card.const.ts`, `shell/sidebar/sidebar.component.html`.

#### PUB-17 Installable app (PWA) and Android share target
- What it does: Web app manifest: name/short name "Shelfmark", description "Every saved link in one place.", start URL `/`, standalone display, theme and background color `#F4F4F1`, icons 192, 512 and maskable 512. Registers as an Android share target (`GET /share?url&text&title`, handled by the share area). A service worker (Angular) prefetches the app shell files and lazily caches icons, images, fonts and the How it works posters/captions; navigation requests use network first ("freshness"); `/api` is never served by the worker. There is no in-app install button or install prompt; installation is through the browser's own UI. There is no offline page; offline state is a banner inside the shell (PUB-20).
- Entry points: browser install UI; Android Share menu.
- Screens / routes: none of its own; `/share` (other area).
- Platforms: any browser supporting PWA install; share target Android only.
- States: installed / not.
- Data: none.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: PUB-18, share target (other area).
- Source: `apps/web/public/manifest.webmanifest`, `apps/web/ngsw-config.json`.

#### PUB-18 Update prompt
- What it does: When the service worker has downloaded a new app version, an info toast "A new version of Shelfmark is ready" with action "Reload" (reloads the page) and secondary "Later" (dismisses). It stays until one is picked (no timeout), once per version per page load, never reloads by itself.
- Entry points: automatic.
- Screens / routes: SCR-PUB-08 (toast).
- Platforms: all where a service worker runs (not dev server or tests).
- States: no service worker: nothing.
- Data: none.
- Settings that change it: none.
- Feedback: toast.
- Limits: once per version per load.
- Related: PUB-17.
- Source: `core/pwa/update-prompt.service.ts`.

#### PUB-19 First-paint app skeleton and session hint
- What it does: A device remembers in local storage (`sm-session-hint`: `1` or `demo`) that it probably has a session. On load, a small script shows the app skeleton from the first paint for a likely signed-in start (and always on `/demo`), with the demo banner strip when the hint says demo, the stored light/dark theme, and the extension banner placeholder when the library would show it. Guest pages (`/sign-in`, `/about`, `/privacy`, `/changelog`, `/c/...`) ignore the hint. The skeleton is removed when the app renders a page, at most after 15 s. Without the hint, `/` shows the landing without waiting for the session API; the landing chunk starts downloading before Angular boots when the address is `/` or `/about`. The hint is set before going to an OAuth provider, on sign-in and on a found session, and cleared on sign-out, expiry or failed sign-in.
- Entry points: every page load.
- Screens / routes: all.
- Platforms: all.
- States: hint present / absent / storage blocked (no skeleton).
- Data: local storage.
- Settings that change it: theme.
- Feedback: none.
- Limits: 15 s max overlay.
- Related: AUTH-05, AUTH-09, loading states (other area).
- Source: `apps/web/public/boot-skeleton.js`, `core/auth/session-hint.ts`, `core/auth/models/session-hint-*.ts`, `core/routing/boot-skeleton.ts`, `core/routing/start-landing-load.ts`, `shell/boot-skeleton/*`.

#### PUB-20 Offline banner (shell)
- What it does: While the browser is offline, a banner above the shell: "You're offline. You can browse what's loaded; saving and editing come back when you reconnect."
- Entry points: automatic.
- Screens / routes: all app shell pages (below the demo banner).
- Platforms: all.
- States: offline.
- Data: none.
- Settings that change it: none.
- Feedback: banner.
- Limits: none.
- Related: offline behaviour (other area).
- Source: `shell/offline-banner/*`, `core/network/online.service.ts`, `shell/app-shell.component.html`.

#### AUTH-01 Sign-in page
- What it does: Guest-only page to sign in with Google or GitHub, or open the demo. Panel: logo, title "All your links on one shelf", subtitle "Save anything once, find it again in seconds.", an alerts area (notices, AUTH-03), buttons "Continue with Google" (Google icon) and "Continue with GitHub" (GitHub icon), on desktop a separator "or", a ghost button "Open the demo", and the line "By continuing you agree to the Privacy policy. We only use your name, email and avatar." (link to `/privacy`). While one action runs it shows a spinner on that button and the other buttons are disabled; after an OAuth start the spinner stays until the browser leaves (reset if the page is restored from the back/forward cache). A failed attempt shakes the notices once. Decorative art: on desktop, saved-link cards drift around a frosted card (8 cards from 64em, 14 on wide, 22 from 160em), fly out on each visit, float, "land" with an accent ring, lean toward the mouse; below 64em a strip of six small cards flies up on top of the panel. Reduced motion: cards at rest, no fly-in/drift/parallax. Card titles come from `auth.signIn.tiles.*` and tags from `auth.signIn.tags.*`. No email/password, no sign-up form, no language switcher, no back link.
- Entry points: landing "Sign in", "Get started", "Start your shelf", finale "Sign in"; any protected URL as a guest (AUTH-04); sign-out (AUTH-06); session expiry; demo end/failure; demo banner "Sign in with your own account"; signed-out lock "Sign in again"; public collection "Sign in" (other area); URL `/sign-in`.
- Screens / routes: SCR-AUTH-01, `/sign-in` (guard `guestOnly`; a signed-in visitor is redirected to `/links`).
- Platforms: desktop (from 64em): Google button primary, "or" shown, drift art. Below 64em: Google button secondary like GitHub, no "or", phone card strip.
- States: idle; loading (per button); locked; notices for reason/error/demo error/failure (AUTH-03).
- Data: `POST /api/auth/sign-in/social`, `POST /api/demo`.
- Settings that change it: language (stored), theme, motion.
- Feedback: spinners, notices, shake.
- Limits: auth routes rate-limited per IP (20/min).
- Related: AUTH-02, AUTH-03, AUTH-04, AUTH-08.
- Source: `features/auth/sign-in.page.html|ts|scss`, `features/auth/components/sign-in-drift/*`, `features/auth/components/sign-in-phone-cards/*`, `core/auth/auth.store.ts`.

#### AUTH-02 Sign in with Google or GitHub (OAuth)
- What it does: Starts the OAuth flow: posts the provider with a success callback (the return URL or `/`) and an error callback (`/sign-in`, with the return URL kept); the browser is sent to the provider's own https host only (checked), then back. New users are created on first sign-in (sign-up and sign-in are the same action). Only name, email and avatar are used; provider access tokens are not stored. Only Google and GitHub that are configured on the server exist; email/password, password reset, email verification, account linking, session listing/revocation and profile update routes are disabled (404). After success the app loads the session and shows the return URL or `/` (which is the app for a signed-in user). Signing in from any tab reloads other open tabs that were locked, on sign-in or showing another account.
- Entry points: sign-in buttons.
- Screens / routes: SCR-AUTH-01, provider pages, `/api/auth/callback/google|github`.
- Platforms: all.
- States: pending until the page unloads; error (returns with `?error=`); network failure ("We could not sign you in. Try again.").
- Data: `POST /api/auth/sign-in/social` `{provider, callbackURL, errorCallbackURL}` → `{url}`; `GET /api/auth/callback/:provider`; `GET /api/auth/get-session` → `{user: {id, name, email, image, isDemo, demoExpiresAt, onboardingCompletedAt}, session: {expiresAt}}`. Account stores provider and provider id. Session cookie httpOnly, SameSite=Lax, Secure in production; short-lived OAuth state cookie.
- Settings that change it: none.
- Feedback: notices on failure.
- Limits: 20 auth requests/min per IP.
- Related: AUTH-03, AUTH-04, AUTH-13.
- Source: `core/auth/better-auth-api.ts`, `core/auth/provider-redirect-url.ts`, `apps/api/src/auth/create-auth.ts`, `models/allowed-auth-route.const.ts`, `models/disabled-auth-path.const.ts`, `strip-oauth-tokens.ts`, `libs/shared/contracts/src/auth/*`.

#### AUTH-03 Sign-in notices: reasons and errors
- What it does: The sign-in page explains why the person is there. `?reason=` shows a warning notice: session-expired "Your session has expired. Sign in again."; demo-expired "The demo has ended. Open a new one or sign in."; demo-limit "Too many demos were opened from your network. Try again in an hour, or sign in."; demo-unavailable "The demo is full right now. Try again later, or sign in."; demo-failed "We could not open the demo. Try again, or sign in.". Unknown reasons show nothing. `?error=` (from the OAuth flow) shows a danger notice: access_denied "Sign-in was canceled. Try again when you are ready."; email_not_found "Your GitHub account has no verified email. Verify an email in your GitHub settings, or sign in with Google."; state_mismatch / please_restart_the_process "The sign-in took too long or was interrupted. Start again."; account_not_linked / unable_to_link_account "This email already belongs to an account that could not be linked. Sign in with the provider you used before."; any other code "Sign-in did not finish. Try again.". A demo button failure on this page with 429/503 shows the matching demo warning (unless a reason notice is already shown); any other failed attempt shows "We could not sign you in. Try again.". Several notices can stack (reason + error + failure).
- Entry points: query parameters; failed button actions.
- Screens / routes: SCR-AUTH-01.
- Platforms: all.
- States: as listed.
- Data: none.
- Settings that change it: none.
- Feedback: notices shake once on each failed attempt.
- Limits: none.
- Related: AUTH-01, AUTH-07, AUTH-08, AUTH-09.
- Source: `features/auth/models/*`, `core/auth/models/sign-in-reason.const.ts`, `core/auth/models/sign-in-error.const.ts`, `core/auth/is-sign-in-*.ts`.

#### AUTH-04 Protected URLs and return URL
- What it does: A guest who opens any app URL (`/library`, `/tags`, `/ask`, `/links`, `/unsorted`, `/tidy`, `/favorites`, `/folders/:id`, `/recent`, `/reminders`, `/trash`, `/settings/**`, `/admin/**`, `/share?...`) is sent to `/sign-in?returnUrl=<that URL incl. query>`; after signing in they land back there. The return URL is only honoured when it is a path inside the app (rejects `//host`, `/\host`, schemes, backslashes, control characters). The same return URL survives a failed OAuth round trip. `/share` keeps the shared data across sign-in.
- Entry points: deep links, bookmarks, shared URLs, PWA share target.
- Screens / routes: route table entries with `redirectToSignIn`.
- Platforms: all.
- States: guest only.
- Data: none.
- Settings that change it: none.
- Feedback: none (silent redirect).
- Limits: none.
- Related: AUTH-01, AUTH-02, AUTH-07.
- Source: `app.page-routes.ts`, `core/auth/auth.guards.ts` (`redirectToSignIn`), `core/auth/safe-return-url.ts`.

#### AUTH-05 Landing versus app at `/`, and guest-only pages
- What it does: `/` is the landing for a guest and the app shell (redirecting to `/links`) for a signed-in user, with no redirect flicker. With no session hint on the device, `/` matches the landing at once and asks the session in the background; if a session turns up and the visitor is still on `/`, the app replaces the landing (`/links`, replacing history). With a hint (or any deeper URL), the router waits for the one session request. A failed session request counts as guest for that navigation (retried on the next). `/sign-in` is guest-only; signed-in visitors go to `/links`.
- Entry points: navigation.
- Screens / routes: `/`, `/sign-in`.
- Platforms: all.
- States: guest, signed-in, API cold/failed.
- Data: `GET /api/auth/get-session` (once per load, shared).
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: PUB-19.
- Source: `core/auth/auth.guards.ts` (`landingGuestOnly`, `guestOnly`, `authOnly`), `core/auth/auth.store.ts` (`ensureLoaded`).

#### AUTH-06 Sign out
- What it does: Ends the session. Before calling the server it sends deletes still waiting for their Undo window (waits at most 3 s). If the server confirms, all per-user state is cleared (library stores, onboarding, rating, What's new timers, per-user local storage keys: recent emoji, recent folders, seen reminders, session hint, extension banner dismissed, AI backfill row dismissed, last export), other tabs of the same user are locked (AUTH-13), and the app goes to `/sign-in` (no reason notice). If the server fails, the user stays signed in and gets an error toast "Couldn't sign you out" / "Try again". The demo account signs out the same way.
- Entry points: desktop account menu "Sign out" (logout icon, last item); phone/tablet You list (Settings index) button "Sign out"; Settings › Account section "Sign out" row "Sign out of Shelfmark" — "Your links stay saved. Sign in again any time." with button "Sign out"; demo banner "Sign in with your own account" (AUTH-09).
- Screens / routes: SCR-AUTH-05; Settings pages (other area).
- Platforms: account menu desktop (from 64em, the header exists only there); You list below 64em; Settings › Account all.
- States: failure keeps the session.
- Data: `POST /api/auth/sign-out` → `{success: true}`; removes the session cookie.
- Settings that change it: none.
- Feedback: error toast on failure; no confirmation dialog.
- Limits: 3 s flush timeout.
- Related: AUTH-13, AUTH-14.
- Source: `core/auth/auth.store.ts` (`signOut`, `signOutAndLeave`), `core/auth/session-scope.service.ts`, `core/auth/models/user-storage-keys.const.ts`, `shell/app-shell.component.html`, `features/settings/pages/settings-index/*`, `features/settings/pages/account/*`.

#### AUTH-07 Session lifetime and expiry
- What it does: A sign-in lasts 7 days and slides forward when used, at most once a day; no cookie cache, so sign-out and revocation apply on the next request. Any 401 from `/api/**` while signed in clears the user and cached library (no API call) and goes to `/sign-in?reason=session-expired&returnUrl=<current page>` (unless already on sign-in). Parallel 401s act once. Requests that bypass the HTTP client (Ask streaming) do the same.
- Entry points: automatic.
- Screens / routes: SCR-AUTH-01 with notice.
- Platforms: all.
- States: expired.
- Data: session row (expiresAt, IP address, user agent).
- Settings that change it: none.
- Feedback: notice "Your session has expired. Sign in again.".
- Limits: 7 days, refresh once per day.
- Related: AUTH-03, AUTH-04, AUTH-09.
- Source: `core/auth/expire-session.ts`, `core/api/error.interceptor.ts`, `apps/api/src/auth/models/auth-session-lifetime.const.ts`, `apps/api/src/auth/session-auth.guard.ts`.

#### AUTH-08 Open the demo
- What it does: Creates a personal, temporary demo sandbox (a fresh user "Demo user" with a seeded library) and signs into it, no OAuth. From the sign-in page's "Open the demo" button the page stays and then goes to the return URL or `/`. From `/demo` (landing buttons link here): a full-page app skeleton with a status line "Opening the demo…" while the shell and library preload and the sandbox is created; then `/links` (replacing history). Already signed in (real or demo account) at `/demo`: straight to `/links` without a new sandbox. If creation fails: `/sign-in?reason=demo-limit` (429), `demo-unavailable` (503) or `demo-failed` (anything else). The demo user record is never linkable to Google/GitHub; signing in with a provider from the demo does not carry data over.
- Entry points: landing hero "Open the demo", finale "Open the demo", sign-in page "Open the demo", URL `/demo`.
- Screens / routes: SCR-AUTH-02 (`/demo`, no guard), SCR-AUTH-01.
- Platforms: all.
- States: opening; failure reasons; already signed in.
- Data: `POST /api/demo` (no body allowed, 400 with a body; cross-site 403) → 201 `{user, session}` and session cookie; 429 with `Retry-After`; 503 when full. Stores an HMAC hash of the client IP and of its network (IPv6 /48), never the address.
- Settings that change it: none.
- Feedback: status text; notices on sign-in page.
- Limits: 5 demos per IP per hour (throttler and Postgres quota), 20 per network per hour, at most 1000 active demo sandboxes at once.
- Related: AUTH-09 to AUTH-12, ONB-01.
- Source: `features/auth/demo-start.page.html|ts`, `core/auth/better-auth-api.ts` (`signInDemo`), `core/auth/demo-sign-in-error.ts`, `apps/api/src/demo/demo.controller.ts`, `demo.service.ts`, `models/demo-quota.const.ts`, `models/demo-user.const.ts`, `network-of.ts`, `auth/demo-session.plugin.ts`, `auth/demo-session.service.ts`.

#### AUTH-09 Demo banner, countdown and automatic end
- What it does: While the signed-in user is a demo user, an info banner strip sits above the whole shell: bold "You're in a demo." then "Play with everything — this sandbox resets in {{hours}} hours." (singular "… in 1 hour."; hours rounded up, never below 1; re-read every minute) and a small primary button "Sign in with your own account". The button signs out the demo and goes to plain `/sign-in` (disabled while running; stays if sign-out fails). When the time is up, the app signs out (ignoring a server error, since the session is likely gone) and shows `/sign-in?reason=demo-expired`. The server also refuses a demo session past its expiry (get-session answers signed out) and caps the session's expiry at the demo's end.
- Entry points: automatic for demo users.
- Screens / routes: SCR-AUTH-03 (over every shell page), skeleton variant during load.
- Platforms: all (full width strip).
- States: demo running; expired.
- Data: `user.isDemo`, `user.demoExpiresAt`; `POST /api/auth/sign-out`.
- Settings that change it: none.
- Feedback: banner text updates; sign-in notice after end.
- Limits: 24 hours.
- Related: AUTH-06, AUTH-08, AUTH-03.
- Source: `shell/demo-banner/*`, `core/auth/auth.store.ts` (`expireDemo`), `apps/api/src/auth/enforce-demo-expiry.ts`.

#### AUTH-10 Demo sandbox contents (seed)
- What it does: Every demo starts with the same seeded library: 6 folders (Work, Angular inside Work, Courses, Clothes, Recipes, Videos; colours and highlighted folders as seeded), 11 tags (angular, typescript, reading, tutorial, design, reference, cooking, shopping, recipes, javascript, js), 41 real public links (never fetched) with notes, kinds and creation/opened dates relative to the demo's start: 5 favorites, 15 unsorted, 24 never opened (Forgotten), 2 reminders (one may already be due), 37 with an AI summary, 12 with pending AI folder/tag suggestions; 1 domain rule (angular.dev → Angular, tag angular); demo AI embeddings. AI in the demo always uses the mock provider and mock embeddings (no real AI calls). In local dev (mock APIs) a similar in-browser seed is used.
- Entry points: demo creation.
- Screens / routes: library (other area).
- Platforms: all.
- States: demo.
- Data: users, folders, tags, links, link tags, rules, AI fields, embeddings inserted in one transaction.
- Settings that change it: none.
- Feedback: none.
- Limits: see AUTH-11.
- Related: AUTH-08, AI (other area), reminders (other area), rules (other area).
- Source: `apps/api/src/demo/seed.json`, `demo-seed.ts`, `seed-demo-library.ts`, `seed-demo-embeddings.ts`, `apps/api/src/ai/providers/ai-provider.registry.ts`, `apps/web/src/app/features/links/mock/demo-library-seed.ts`.

#### AUTH-11 Demo limits and restrictions
- What it does: A demo account works like a real one with these differences: at most 100 links (trash counts; API answers "Demo link limit reached", the app then shows the generic save failure, see Observations); cannot share folders (share dialog note "Demo accounts can't share folders. Sign in to share yours."); cannot connect an MCP assistant ("The demo can’t connect an assistant. Sign in with your own account to try it."); cannot delete the account (Settings › Account danger section hidden; the sandbox expires instead); Settings › Account shows "The demo account isn't linked to Google or GitHub."; no rating prompt; no AI announcement dialog; no admin check; no usage-activity tracking; lower daily screenshot quota for feedback (6 MB/day); demo accounts are excluded from admin stats (shown as "Demo sandboxes now" — "Not counted anywhere else"); How it works card shows without the 14-day window; AI uses the mock provider.
- Entry points: n/a.
- Screens / routes: various (other areas).
- Platforms: all.
- States: demo.
- Data: `isDemo` from the session, never from requests.
- Settings that change it: none.
- Feedback: as listed.
- Limits: 100 links, 6 MB feedback screenshots/day, 24 h.
- Related: sharing, AI connect, account deletion, rating, admin (other areas).
- Source: `libs/shared/contracts/src/demo/demo-limit.const.ts`, `apps/api/src/links/links-write.service.ts`, `links-batch.service.ts`, `imports/imports.service.ts`, `features/sharing/components/share-folder-dialog/*`, `features/ai/connect/components/connect-assistant/*`, `features/settings/pages/account/account.page.ts`, `features/rating/services/rating.store.ts`, `features/ai/services/ai-announcement.service.ts`, `apps/api/src/users/user-activity.service.ts`, `apps/api/src/feedback/*`.

#### AUTH-12 Demo cleanup job
- What it does: A daily scheduled job (03:17 UTC) deletes expired demo users with all their data (cascade), in batches of 100 within a 5 s budget; reports `{deleted, hasMore}` and continues on the next run. Protected by a bearer secret (min 32 characters; missing/short secret keeps it closed).
- Entry points: Vercel Cron.
- Screens / routes: none.
- Platforms: server.
- States: n/a.
- Data: `GET /api/cron/demo-cleanup`.
- Settings that change it: none.
- Feedback: none.
- Limits: 100 per batch, 5 s.
- Related: AUTH-09, PUB-11 (retention text).
- Source: `apps/api/src/demo/demo-cleanup.controller.ts`, `demo-cleanup.service.ts`, `cron-secret.guard.ts`, `vercel.json`.

#### AUTH-13 Session sync between tabs
- What it does: Tabs of the same browser talk over a BroadcastChannel. When the user signs out in one tab, every other tab of that user clears its library and shows a lock dialog that cannot be dismissed: "You signed out in another tab" / "To keep your links private, this tab is locked too." with button "Sign in again" (goes to `/sign-in?returnUrl=<that tab's page>`). When someone signs in in any tab, other tabs that are locked, on the sign-in page, or showing another account reload. (Link and folder/tag changes also sync, other area.) Without BroadcastChannel nothing syncs.
- Entry points: automatic.
- Screens / routes: SCR-AUTH-04.
- Platforms: all.
- States: locked.
- Data: none (local channel).
- Settings that change it: none.
- Feedback: lock dialog; reload.
- Limits: same browser only.
- Related: AUTH-06, tab sync of links (other area).
- Source: `core/sync/tab-sync.service.ts`, `tab-sync-receiver.service.ts`, `signed-out-lock.service.ts`, `signed-out-dialog/*`, `models/tab-sync-kind.const.ts`.

#### AUTH-14 Per-user cleanup at session end
- What it does: On sign-out, expiry, a 401, the demo end or account deletion, everything held for the user is forgotten: registered stores (library, onboarding, rating, What's new) reset, and per-user local storage keys are removed (recent emoji, recent folders, reminders already announced, session hint, extension banner closed, AI backfill reminder hidden, last export info), so the next person on the device starts clean. Interface preferences (theme, language, view) stay in the browser. The How it works card state is kept per user id.
- Entry points: automatic.
- Screens / routes: none.
- Platforms: all.
- States: n/a.
- Data: local storage.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: AUTH-06, AUTH-07.
- Source: `core/auth/session-scope.service.ts`, `core/auth/models/user-storage-keys.const.ts`.

#### ONB-01 Welcome dialog (first-run tour)
- What it does: A three-step dialog that opens automatically in the app shell when the signed-in user's onboarding flag is empty (first sign-in; also every new demo). Each step has an illustration, a title and text: 1 "All your links in one place" — "Videos, articles, things to buy, courses — everything you save lives on one calm shelf instead of chats and tabs."; 2 "Save in a second" — "Paste a link and the title and preview fill in by themselves. Add a note so you remember why you saved it."; 3 "Find it right away" — "Folders, tags, favorites and search with ⌘K bring back any link in a couple of keystrokes.". Step dots labelled "Step N of 3". Footer: "Skip" (ghost), "Back" (hidden on step 1), "Next" (primary; on the last step "Add your first link" with a plus icon, which closes and opens the Add link dialog). Esc and the scrim count as Skip. Left/Right arrow keys move between steps (stop at the ends). Focus stays on the primary button; a polite live region announces "Step N of 3: <title>". Steps slide in 24px with fade, direction-aware; instant under reduced motion. Every way out completes the onboarding: the flag is set locally at once and sent to the server; a failed request is silent and the dialog is due again on the next load. It shows once per account across devices; there is no way to show it again.
- Entry points: automatic on first shell load.
- Screens / routes: SCR-ONB-01.
- Platforms: desktop/tablet dialog size md; phone bottom sheet with full-width footer buttons.
- States: first run; completed (never again); failed save (shows again next load).
- Data: `user.onboardingCompletedAt` from get-session; `POST /api/me/onboarding` → `{onboardingCompletedAt}` (idempotent, one-way; no error toast).
- Settings that change it: motion.
- Feedback: live announcements.
- Limits: once.
- Related: PUB-13 (suppressed for new accounts), add link (other area), rating eligibility (other area).
- Source: `features/onboarding/services/onboarding.store.ts`, `components/onboarding-dialog/*`, `models/onboarding-steps.const.ts`, `http/http-onboarding.api.ts`, `shell/app-shell.component.ts` (`welcome` effect), `apps/api/src/users/users.controller.ts`, `users.service.ts` (`completeOnboarding`).

#### ONB-02 Getting-started surfaces in the empty library
- What it does: The empty All links library shows its empty state with the add-link action and a ghost button "Watch how it works" (play icon) that opens the How it works video. There are no checklists, tips or sample data for real accounts; the demo has seed data (AUTH-10).
- Entry points: All links with no links.
- Screens / routes: library empty state (other area).
- Platforms: all.
- States: empty library.
- Data: none.
- Settings that change it: none.
- Feedback: none.
- Limits: none.
- Related: PUB-15, empty states (other area).
- Source: `features/library/library.page.html` (empty state block).

## 4. Screen catalogue

See [`screens.md`](screens.md).

## 5. Cross-cutting lists

Merged from the area inventories. The first column names the area that described the row. Some items (for example Theme, Show folder counts, Esc) appear more than once because several areas meet them: rows are kept so that each context is visible. For settings, the "Settings" area rows are the reference for options and defaults; for shortcuts, the "Settings" area rows are the list shown on Settings › Keyboard shortcuts.

### 5.1 Settings

| Area | Setting | Where (section) | Options | Default | Effect |
| --- | --- | --- | --- | --- | --- |
| Library | "Default view" | Settings › Library › Viewing | Cards, List | Cards | View of a feed with no remembered choice |
| Library | "Sort links by" | Settings › Library › Viewing | Newest first, Oldest first, Title A–Z | Newest first | Starting sort; `?sort` omitted when equal |
| Library | "Open links in" | Settings › Library › Viewing | "New tab", "Same tab" | New tab | Card/row anchors, menu "Open", pinned link rows, Forgotten links |
| Library | "Show folder counts" | Settings › Library › Viewing | on/off | on | Counts on All links/Unsorted/Favorites rows, folder rows, pinned folders (not reminders, not Trash, not "forgotten") |
| Library | "Clicking a link" | Settings › Library › Viewing | "Opens it in a new tab", "Opens the preview" | Opens the preview | Plain click on card/row; ⌘/Ctrl does the other |
| Library | "Sites that open in a new tab" | Settings › Library › Viewing; preview blocked checkbox | list of hosts | empty | Click opens link instead of preview for those hosts |
| Library | "Keep deleted items for" | Settings › Library › Trash | 7, 30, 90 days | 30 | Days in delete confirmations |
| Library | Pause history / "Remember recently opened" | `/recent` header; Settings › Privacy and data | on/off | not paused | Opens not recorded while paused |
| Library | "Use single-key shortcuts" | Settings › Keyboard shortcuts | on/off | on | "?" opens shortcuts list |
| Library | Folder colours | Settings › Appearance | on/off | on | Graphite folder tiles everywhere |
| Library | Theme | Top bar toggle; Settings › Appearance | toggle: Light/Dark (settings: System, Light, Dark, Custom) | System | Whole app |
| Library | Ask on | Settings › AI | on/off | off | Tab bar Ask instead of Tags; tags on phone Library |
| Library | Sidebar sections folded | Sidebar chevrons (device) | per section | all open | Folds Pinned/Folders/Tags |
| Library | Per-feed view & sort | Feed toolbar (device) | per feed | account defaults | Remembered for up to 300 feeds |
| Library | Preview list width | Resize handle (device) | 300px to (split width − 480px) | 400px | List width beside the preview |
| Library | Extension banner dismissed | Banner × (device) | — | shown | Replaces banner by footer row |
| Organise | Show folder counts | Settings › Library › Viewing | on / off | on | Link counts on fixed rows, folder rows and pinned folder rows; Trash and Reminders counts are unaffected |
| Organise | Folder colors | Settings › Appearance › Sidebar | on / off | on | Off draws every folder (tree, tiles, pickers, banner, rules list, toasts) in graphite; chosen colours kept |
| Organise | Own colours | Settings › Appearance › Custom / folder style dialog | up to 12 `#rrggbb` | none | Swatches offered in the folder style dialog and custom theme |
| Organise | Own emoji ("Yours") | folder style dialog | up to 24 emoji | none | Offered under "Yours" in the emoji picker |
| Organise | Keep deleted items for | Settings › Library › Trash | 7 / 30 / 90 days | 30 | Retention of Trash entries; shorter asks first if older entries exist |
| Organise | Rules | Settings › Library › Rules | up to 50 domain rules | none | Folder/tags on save |
| Organise | New links go to | Settings › Library › Saving | a folder or Unsorted | Unsorted | Default folder of new links; a rule folder wins unless the user chose it (paste many) |
| Organise | AI on | Settings › AI | on / off | off | Rule offers only while on; Ask on moves Tags into the Library page on phone |
| Organise | Open in new tab | Settings (other area) | on / off | — | Reminder rows open links in a new tab |
| Organise | Section collapsed (Pinned, Folders, Tags) | desktop sidebar chevrons | open / folded | open | Remembered per device |
| Search and AI | Use AI in Shelfmark | Settings › AI › AI features | on / off | off | master switch; first on opens the intro; off hides all AI and stops jobs |
| Search and AI | Folder | Settings › AI › AI features (phone: Folder page) | Suggest / Automatic ("Apply automatically when I don’t choose") / Off | Suggest | folder chip; auto-move from Unsorted with Undo; none |
| Search and AI | Tags | Settings › AI › AI features (phone: Tags page) | Suggest / Automatic / Off | Suggest | tag chips; auto-tag when none added, with Undo; none |
| Search and AI | Summaries | Settings › AI › AI features | on / off | on | AI summaries for new links; Rewrite |
| Search and AI | Search by meaning | Settings › AI › AI features | on / off | on (off for settings rows created before AI-3) | meaning results, related links, Show related, embeddings |
| Search and AI | Ask your shelf | Settings › AI › AI features | on / off | on | Ask button, Ask tab (replaces Tags on phone), search Ask row |
| Search and AI | Include my notes | Settings › AI › What is sent | on / off | off | notes sent to the model, embeddings, Ask; app search unaffected |
| Search and AI | Summary language | Settings › AI › What is sent | Match the app ({{language}}) / each interface language | Match the app | language of new summaries |
| Search and AI | Include AI checks | Clean-up page (before a run) | on / off | on (shown only when available) | adds near-duplicates and tag synonyms |
| Search and AI | Include my notes (per token) | Create token dialog | on / off | off, fixed at creation | assistant sees notes; search matches notes |
| Search and AI | Ask panel width | Ask drawer resize handle (device, localStorage `sm-ask-width`) | 440px … min(880px, 70vw) | 440px | panel width |
| Search and AI | Backfill reminder hidden | Search reminder × (device, localStorage) | hidden / shown | shown | hides the search reminder; cleared at sign-out |
| Capture | New links go to | Settings › Library › Saving | folder or Unsorted | Unsorted | initial folder of Add link (when not opened from a folder), paste many and Share target |
| Capture | Fetch titles and previews | Settings › Library › Saving | on / off | on (`LIBRARY_SETTINGS_DEFAULT.fetchPreviews`) | off: no page load at preview or save; only duplicate check; address saved as title |
| Capture | Public folder | Share folder dialog | on / off | off | creates / ends the public link |
| Capture | Show my notes | Share folder dialog › Link settings | on / off | off | notes visible on the public page |
| Capture | Skip duplicates | Import step 2 | on / off | on | leaves out links already saved and repeats |
| Capture | Put them into | Import step 2 | new folder "Imported bookmarks" / folder / Unsorted | new folder | import target |
| Capture | Folders inside | Import step 2 | As in the file / Let AI sort them by topic / No folders | file when it has folders, else AI if offered, else none | folder structure of the import |
| Capture | Export format | Export dialog | JSON / Bookmarks HTML / CSV | JSON | file format |
| Capture | Apply domain rules | Paste many list | on / off | on (shown only when a rule matches) | per-row rule folder/tags |
| Settings | Theme | Appearance › Theme (also header toggle) | System, Light, Dark, Custom | System | App colours; Custom shows custom controls. Account + `sm-theme` |
| Settings | Custom: Start from | Appearance › Theme (Custom) | Light, Dark | Light | Base of custom theme; switching swaps a curated background |
| Settings | Custom: Accent color | Appearance › Theme (Custom) | Sage, Ocean, Plum, Clay, Amber, Rose, Teal, Graphite, own hex | Ocean | Active folder, tags, favorites, focus |
| Settings | Custom: Background | Appearance › Theme (Custom) | Light base: Stone, Paper, Mist, White; dark base: Graphite, Ink, Forest, Black; own hex | Paper | Page background |
| Settings | Custom: Corners | Appearance › Theme (Custom) | Round, Soft, Square | Soft | Radius of cards, panels, buttons |
| Settings | Own colours | Appearance (accent/background "+"), folder style dialog | up to 12 hex | empty | Swatches |
| Settings | Own emoji | folder icon picker (no settings control) | up to 24 emoji | empty | "Yours" in emoji picker |
| Settings | Text size | Appearance › Text and layout | 90%, 100%, 112%, 125% (s, m, l, xl) | 100% | Scales whole interface |
| Settings | Font | Appearance › Text and layout | Onest, System, Readable | Onest | Interface font |
| Settings | Density | Appearance › Text and layout | Comfortable, Compact | Comfortable | Spacing |
| Settings | Preview image | Appearance › Cards | Large, Small, Off | Large | Card image |
| Settings | Show site | Appearance › Cards | on/off | on | Domain + favicon on cards |
| Settings | Show notes | Appearance › Cards | on/off | on | Note on cards |
| Settings | Show tags | Appearance › Cards | on/off | on | Tag chips on cards |
| Settings | Date format | Appearance › Dates and numbers | Language default, Medium (10 Nov 2026), DD.MM.YYYY, MM/DD/YYYY, YYYY-MM-DD | Language default | Dates app-wide |
| Settings | Time | Appearance › Dates and numbers | Auto, 24-hour, 12-hour | Auto | Clock |
| Settings | Week starts on | Appearance › Dates and numbers | Auto, Monday, Sunday | Auto | Recently opened grouping, weekly chart, calendars |
| Settings | Folder colors | Appearance › Sidebar and motion | on/off | on | Off draws all folders graphite |
| Settings | Animations | Appearance › Sidebar and motion | System, Full, Reduced | System | Motion |
| Settings | Default view | Library › Viewing | Cards, List | Cards | How folders open first time |
| Settings | Sort links by | Library › Viewing | Newest first, Oldest first, Title A–Z | Newest first | Default sort (each folder remembers its own) |
| Settings | Open links in | Library › Viewing | New tab, Same tab | New tab | Link target |
| Settings | Clicking a link | Library › Viewing | Opens the preview, Opens it in a new tab | Opens the preview | Click behaviour (preview wide screens only) |
| Settings | Sites that open in a new tab | Library › Viewing | list of domains (remove only) | empty | Those sites skip the preview |
| Settings | Show folder counts | Library › Viewing | on/off | on | Counts in sidebar |
| Settings | New links go to | Library › Saving | Unsorted or any folder | Unsorted (null) | Default folder when pasting |
| Settings | Fetch titles and previews | Library › Saving | on/off | on | Off saves only the address |
| Settings | Rules | Library › Rules | domain rules | none | see organise area |
| Settings | Keep deleted items for | Library › Trash | 7, 30, 90 days | 30 | Trash purge age |
| Settings | Interface language | Language | English, Français, Deutsch, Italiano, Español, Português, Українська, Match my browser | Match my browser | UI language |
| Settings | Use single-key shortcuts | Keyboard shortcuts | on/off | on | "?" opens shortcuts; per device (`sm-ui`) |
| Settings | Remember recently opened | Privacy and data | on/off | on (pauseHistory false) | Off clears and stops history |
| Settings | AI settings | AI | see AI area | off | see AI area |
| Settings | What's new seen | (hidden) | release version | null | Unseen dot/badge |
| Browser extension | Extension keyboard shortcut | Browser (chrome://extensions/shortcuts) | any key combo | Alt+Shift+S | Opens the popup |
| Browser extension | Optional "tabs" permission | Chrome prompt on first All tabs switch | allow / deny | not granted | Enables All tabs |
| Browser extension | AI on / allowance | Web Settings › AI (other area) | on/off | off | Shows Fill in with AI / Sort with AI |
| Browser extension | Include my notes | Web Settings › AI (other area) | on/off | (other area) | Sends the popup note to AI on Fill |
| Browser extension | Domain rules | Web Settings › Library (other area) | per domain folder+tags | none | Prefill folder and tags; rule hint |
| Browser extension | Install banner dismissed | Library banner "Not now" | dismissed / not | not | Banner hidden, sidebar row shown; reset at session end |
| Browser extension | `EXTENSION_ORIGINS` (server env) | Vercel env (author) | list of extension origins | empty | Without it production refuses writes from the extension (403) |
| Public pages | Language (guest) | Landing footer language buttons | English, French, German, Italian, Spanish, Portuguese, Ukrainian | browser match | Applies at once, stored in this browser, saved to the account at first sign-in |
| Public pages | Language (signed in) | `/about` footer language buttons (also Settings › Language, other area) | same | account value | Saved on the account |
| Public pages | What's new last seen | implicit (account) | release version | null | Controls automatic What's new dialog and badge |
| Public pages | Onboarding completed | implicit (account) | timestamp / null | null | Welcome dialog shows while null |
| Public pages | How it works card state | implicit (this device, per user) | firstSeen, done | first seen now, not done | Card visible 14 days until opened/hidden |

### 5.2 Keyboard shortcuts

| Area | Keys | Where active | Action |
| --- | --- | --- | --- |
| Library | ? | anywhere except text fields (single-key shortcuts on) | Open "Keyboard shortcuts" |
| Library | Ctrl/Cmd+Z | while an Undo toast is visible (not in fields/dialogs) | Undo the last action |
| Library | Esc | toast visible | Dismiss the newest toast |
| Library | Alt+Shift+T (Option+Shift+T on macOS) | toast with action visible | Focus the toast's action |
| Library | Esc | library while selecting | Clear the selection |
| Library | Cmd/Ctrl+A | library, focus not in a field/dialog/menu | Select every loaded link |
| Library | Shift+click | card/row checkbox or card while selecting | Select a range from the last picked link |
| Library | Space | focused link | Preview it (where offered); else toggle selection |
| Library | Shift+Space | focused link | Select range |
| Library | M | focused link | "Move to folder…" |
| Library | ⌘V / Ctrl+V | library outside fields, no dialog | Paste links into Add link |
| Library | ↑ / ↓ | library while desktop preview is open | Previous / next link |
| Library | ↵ (Enter) | library while desktop preview is open (page or feed link) | Open previewed link in a new tab |
| Library | Esc | library while desktop preview is open | Close the preview |
| Library | ← / → | preview resize handle | Resize the list (double-click resets) |
| Library | Space, Page Down / Shift+Space, Page Up, Home, End, arrows | library with nothing focused | Scroll the feed area |
| Library | Shift+F10 | folder row | Open folder menu |
| Library | Alt+↑ / Alt+↓ | focused pinned row or folder row | Move it up / down (announced) |
| Library | ArrowUp | "Data & help" row | Open its menu on the last item |
| Library | Arrow keys, Home, End | saved view chips, sidebar trees | Move between items |
| Library | Esc | while dragging a link | Cancel the drag |
| Library | ⌘K / search keys | anywhere (search area) | Open search (other area) |
| Organise | Up / Down | folder tree | Move between folders |
| Organise | Left / Right | folder tree | Close or open a folder (or step to parent / child) |
| Organise | Enter | folder tree row | Open the folder |
| Organise | typing a letter | folder tree | Jump to a matching row |
| Organise | Shift+F10 / context-menu key | folder row, tag chip | Open the folder / tag menu |
| Organise | Alt+Up / Alt+Down | folder row, pinned row | Move the folder / pinned item up or down |
| Organise | Enter | tag editor | Save the tag |
| Organise | Esc | tag editor | Cancel |
| Organise | Delete | own colour swatch | Remove the own colour |
| Search and AI | Cmd+K / Ctrl+K | everywhere in the signed-in shell (also in text fields) | focus header search (≥80em) or open the search dialog |
| Search and AI | Up / Down | search field | move through results (wraps) |
| Search and AI | Home / End | search field | first / last result |
| Search and AI | Enter | search field | open result (link in new tab; folder/tag/show all navigate; Ask row) |
| Search and AI | Ctrl+Enter / Cmd+Enter | search field | open link in a background tab (search stays open) |
| Search and AI | Esc | search dialog | close the dialog |
| Search and AI | Esc (1st / 2nd) | header search field | close panel keeping text / clear text |
| Search and AI | ArrowDown | header search field with text | reopen the panel |
| Search and AI | Tab | header search field while the backfill reminder shows | move to "Process" |
| Search and AI | Enter | Ask composer | send the question |
| Search and AI | Shift+Enter | Ask composer | new line |
| Search and AI | ArrowLeft / ArrowRight, Home / End, double click | Ask panel resize handle (from 64em) | resize by 40px / to limits / back to 440px |
| Search and AI | Alt+Shift+F (⌥⇧F) | Add link / Edit link dialog while AI is on | Fill in with AI |
| Search and AI | Ctrl/⌘+Z, Alt+Shift+T | while an Undo toast shows (Tidy, clean-up, Automatic mode) | undo / go to the toast button |
| Capture | ⌘V / Ctrl+V | library page, focus outside fields, no dialog open | open Add link with the pasted link(s) |
| Capture | ⌘/Ctrl+Enter | Add link / Edit link dialog | save (Create link / Save changes) |
| Capture | Enter | single-line field of Add link | submit |
| Capture | ⌘/Ctrl+Enter | Add several links text area | Find links |
| Capture | Alt/Option+Shift+F | Add link / Edit link dialog (AI on) | Fill in with AI |
| Capture | Esc | any dialog / sheet | close (save in flight still completes) |
| Capture | Alt+Shift+T | when a toast with action shows (Undo of paste many, Review tags, Try again) | focus the toast action (global, other area) |
| Settings | Ctrl/⌘ + K | everywhere in the app shell | Search |
| Settings | ? | everywhere except text fields, not with Ctrl/⌘/Alt, only when single-key shortcuts on, no other dialog open | This list (keyboard shortcuts dialog) |
| Settings | Esc | dialogs, sheets, menus, toasts (newest toast), link drag, color picker, split view half | Close a dialog, menu or toast (cancels a drag) |
| Settings | Ctrl/⌘ + Z | while an Undo toast shows, outside owned contexts | Undo the last action |
| Settings | Alt + Shift + T | while a toast with an action shows | Go to the button of a toast |
| Settings | Ctrl/⌘ + Enter | link dialog (add/edit) | Save the link |
| Settings | Alt + Shift + F | link dialog with AI on | Fill in with AI |
| Settings | Ctrl/⌘ + V | library page (document paste) | Paste links into the library |
| Settings | ↑ / ↓ | search results | Move through search results |
| Settings | Enter | search results | Open the result |
| Settings | Ctrl/⌘ + Enter | search results | Open it in a background tab |
| Settings | Space | focused card or row (not selecting) | Preview the focused link |
| Settings | ↑ / ↓ | desktop link preview open | Previous or next link |
| Settings | Enter | desktop link preview open | Open the previewed link in a new tab |
| Settings | Esc | desktop link preview open | Close the preview |
| Settings | Space | focused card or row while selecting | Select or unselect the focused link |
| Settings | Shift + Space | focused card or row | Select up to the focused link |
| Settings | Ctrl/⌘ + A | library list | Select every link in the list |
| Settings | M | focused link | Move the focused link to a folder |
| Settings | Esc | while selecting | Clear the selection |
| Settings | ↑ / ↓ | folder tree, sidebar tags | Move between folders |
| Settings | ← / → | folder tree | Close or open a folder |
| Settings | Shift + F10 | folder tree, sidebar tags | Open the folder menu |
| Settings | Alt + ↑ / Alt + ↓ | sidebar Pinned rows and folder rows | Move a pinned item or folder up or down |
| Settings | 1–9, 0 (=10) | rating dialog, first step | Focus that score (Enter picks) |
| Settings | ← / → | rating dialog when focus not in the scale | Enter the scale at 10 / at 1 |
| Settings | ← / → | welcome/onboarding dialog | Previous / next step (stops at the ends) |
| Settings | Enter (Shift+Enter = new line) | Ask composer | Send the question |
| Settings | Enter | new saved view dialog, phrase field | Use the phrase |
| Settings | ↑ | sidebar "Data & help" row | Open its menu on the last item |
| Settings | Tab / Shift+Tab / Esc | search backfill reminder panel | Move focus out / back to the search field |
| Settings | ← / → (Shift: larger), Home, End, Enter | sidebar/split resize handle | Resize; jump to min/max; reset |
| Settings | Delete / Backspace | focused removable chip; own colour swatch | Remove it |
| Settings | Enter | colour picker sliders; hex field | Commit colour; tidy hex |
| Settings | ↑ / ↓, Enter, Esc, Home, End | menus, selects, pickers, tree, date picker, command list (libs/ui) | Standard widget navigation |
| Browser extension | Alt+Shift+S (Option+Shift+S on Mac) | Browser, any tab | Open the popup |
| Browser extension | Enter | Form (Save focused on open) | Save |
| Browser extension | Ctrl+Enter / ⌘+Enter | Anywhere in the form (This page and All tabs) | Save |
| Browser extension | Enter | Tag field | Add tag |
| Browser extension | Esc | Folder picker | Back to form without change |
| Browser extension | Esc | New folder | Back to picker |
| Browser extension | Enter | New folder | Create |
| Browser extension | Esc | Saved, Saved tabs | Close the popup |
| Browser extension | ArrowUp/ArrowDown, Home/End, Enter | Picker search box | Move through and choose folders |
| Public pages | ArrowRight | Welcome dialog | Next step (stops at last) |
| Public pages | ArrowLeft | Welcome dialog | Previous step (stops at first) |
| Public pages | Esc | Welcome dialog | Skip (completes onboarding) |
| Public pages | Esc | What's new, How it works dialogs | Close |
| Public pages | ArrowUp | Desktop sidebar "Data & help" row | Opens the Data & help menu |
| Public pages | (none) | Signed-out lock dialog | Esc does nothing (not dismissible) |

### 5.3 Toasts

| Area | Exact copy | When | Undo / action button |
| --- | --- | --- | --- |
| Library | "Saved to {{folder}}" (detail title, thumbnail) | Link saved from Add link / share | — |
| Library | "{{count}} link saved to {{folder}}" / "{{count}} links saved to {{folder}}" | Paste-many save, one folder | "Undo" (8 s) |
| Library | "{{count}} link saved" / "{{count}} links saved to their folders" | Paste-many save, several folders | "Undo" |
| Library | detail "Titles and previews are still loading" | Paste-many save without skips | — |
| Library | detail "{{count}} link was skipped: it was a repeat or too long" / "{{count}} links were skipped: repeats or too long" | Paste-many with skipped items (warn) | "Undo" |
| Library | "No links were saved" | Paste-many saved nothing | — |
| Library | "Couldn't undo" / "The links are still saved" | Paste-many undo failed | — |
| Library | "Changes saved" (detail title) | Edit saved | — |
| Library | "Couldn't open the link." | "Open saved" could not load the existing link | — |
| Library | "Couldn't update the favorite" (detail title) | Favorite request failed | "Retry" |
| Library | "Moved to Trash" (detail title) | Single link deleted | "Undo" (8 s, red) |
| Library | "Couldn't delete the link" / "It is back in your list" | Deferred delete failed | — |
| Library | "Moved to {{folder}}" (detail title, folder tile) | Single move (menu, drag, right-half button) | "Undo" (8 s) |
| Library | "Couldn't move the link" / "It is back where it was" | Move failed | "Retry" |
| Library | "Couldn't move the link back" | Move undo failed | — |
| Library | "Couldn't change the pin" (detail title) | Pin to top failed | — |
| Library | "Pinned is full" / "You can pin up to {{max}} folders and links. Unpin one first." | 8th pin | — (6 s) |
| Library | "Couldn't pin" (detail name) | Pin failed | — |
| Library | "Couldn't unpin" (detail name) | Unpin failed | — |
| Library | "Unpinned from sidebar" (detail name) | Unpin from a Pinned row | "Undo" (8 s) |
| Library | "Couldn't change the order" / "The old order is back." | Pin reorder failed | — |
| Library | "Nothing pinned yet — use “Pin to sidebar” in a folder or link menu" | Tap on empty Pinned row (phone) | — |
| Library | "{{count}} link moved to {{folder}}" / "{{count}} links moved to {{folder}}" | Bulk move | "Undo" |
| Library | "Couldn't move the links" / "They are back where they were" | Bulk move failed | "Retry" |
| Library | "Couldn't move the links back" | Bulk move undo failed | — |
| Library | "Tags updated on {{count}} link(s)" | Bulk tags | — |
| Library | "Couldn't change the tags" / "Nothing was changed" | Bulk tags failed | — |
| Library | "Couldn't change the tags" / "A link can have at most {{max}} tags. Nothing was changed." | Bulk tags 409 | — |
| Library | "{{count}} link(s) added to favorites" / "…removed from favorites" | Bulk favorite | — |
| Library | "Couldn't change favorites" / "Nothing was changed" | Bulk favorite failed | "Retry" |
| Library | "The browser blocked {{blocked}} of {{count}} tabs" / "Allow pop-ups for this site to open them all" | Open all blocked | — |
| Library | "{{count}} link copied" / "{{count}} links copied" | Bulk copy | — |
| Library | "Couldn't copy the links" | Bulk copy failed | — |
| Library | "Couldn't share the links" | Bulk share failed (not cancelled) | — |
| Library | "{{count}} link moved to Trash" / "{{count}} links moved to Trash" (detail titles) | Bulk delete | "Undo" (red, 8 s) |
| Library | "Couldn't delete the links" / "They are back in the list" | Bulk delete failed | — |
| Library | "Couldn't restore the links" | Bulk delete undo failed | — |
| Library | "View saved" (detail name) | New view saved | — |
| Library | "View deleted" (detail name) | View deleted | — |
| Library | "Couldn't rename the view" / "Couldn't delete the view" / "Couldn't move the view" (detail name) | View action failed | — |
| Library | "Saved views are full" / "You can save up to {{max}} views. Delete one first." | 21st view | — (6 s) |
| Library | "This view is waiting for its folder" / "The folder of {{name}} is in Trash. Restore it to use the view." | Choosing an unavailable view | — |
| Library | "Link copied" / "Couldn't copy the link" | Preview copy; recent row copy | — |
| Library | "Couldn't save the change. Try again." | "Always open {{domain}} in a new tab" save failed | — |
| Library | "Removed from history" (detail title) / "Couldn't remove it from history" | Remove from history | — |
| Library | "History cleared" / "Couldn't clear the history" | Clear history | — |
| Library | "Couldn't pause history" / "Couldn't resume history" | Pause toggle failed | — |
| Library | "Can't drop here — drop it on a folder" (and the 5 other no-drop reasons) | First hover of a no-drop row while dragging (info, 2.5 s) | — |
| Library | "Too many requests" / "Try again in a moment" | Any API 429 | — |
| Library | "Something went wrong on our side" / "Try again" | Any API 5xx | — |
| Library | "A new version of Shelfmark is ready" | New service worker version | "Reload" / "Later" (sticky) |
| Library | hint "Press {{shortcut}} to reach {{action}}" | On toasts with an action | — |
| Organise | "Folder created" (detail: name) | New folder saved | none |
| Organise | "Folder limit reached" / "You can have up to {max} folders" | New folder at 500 | none |
| Organise | "Couldn't rename the folder" / "The old name is back" | Rename failed | none |
| Organise | "Couldn't move the folder" / "It is back where it was" | Move failed | none |
| Organise | "Couldn't change the order" / "The old order is back." | Folder or pin reorder failed | none |
| Organise | "Couldn't save the style" / "The old color and icon are back." | Style save failed | none |
| Organise | "Folder moved to Trash" (detail: name) | Folder deleted | none |
| Organise | "Color removed" (detail colour) | Own colour removed | "Undo" |
| Organise | "Couldn’t remove the color" | Own colour remove failed | none |
| Organise | "Emoji removed" (detail emoji) | Own emoji removed | "Undo" |
| Organise | "Couldn’t remove the emoji" (detail emoji) | Own emoji remove failed | none |
| Organise | "Pinned is full" / "You can pin up to {max} folders and links. Unpin one first." | 8th pin | none (6 s) |
| Organise | "Couldn't pin" (detail name) | Pin failed | none |
| Organise | "Couldn't unpin" (detail name) | Unpin failed | none |
| Organise | "Unpinned from sidebar" (detail name) | Pinned row Unpin | "Undo" |
| Organise | "Tag “{name}” created" | Tag created | none |
| Organise | "Merged “{name}” into “{target}”" | Merge done | none |
| Organise | "Couldn't merge the tags" / "Try again" | Merge from rename offer failed | none |
| Organise | "Tag “{name}” deleted" | Tag delete confirmed | "Undo" (8 s) |
| Organise | "Couldn't delete the tag “{name}”" / "It is back" | Tag delete failed | none |
| Organise | "Rule added" (detail "{domain}: {target}") | Rule created | none |
| Organise | "Rule saved" (detail) | Rule edited | none |
| Organise | "Rule deleted" (detail domain) | Rule deleted | "Undo" |
| Organise | "Couldn't delete the rule" | Rule delete failed | none |
| Organise | "Rules are full" / "You can have up to {max} rules. Delete one first." | Create at 50 rules | none |
| Organise | "No links from {domain} in Unsorted" | Apply found none | none |
| Organise | "Rule applied to {count} link(s)" (detail) | Apply done | "Undo" |
| Organise | "Couldn't apply the rule" | Apply failed | none |
| Organise | "Couldn't undo the rule" | Apply undo failed | none |
| Organise | "Always put {domain} links in {folder}?" / "Your last {count} link(s) from this site is/are there. A rule works without AI." | Rule offer (AI on) | "Create rule", "Not now" (sticky) |
| Organise | "Rule created" (detail) | Offer accepted | "Apply to Unsorted" |
| Organise | "Couldn’t create the rule" | Offer create failed | none |
| Organise | "Restored" (detail title / "{count} item(s) is/are back") | Restore done | none |
| Organise | "Couldn't restore" / "Nothing was changed." | Restore failed | none |
| Organise | "Couldn't restore" / "Your library is full. Delete something and try again." | Restore 409 (not produced by the API today) | none |
| Organise | "Deleted for good" (detail title / "{count} item(s) deleted for good") | Delete forever done | none |
| Organise | "Couldn't delete" / "It is back in Trash." | Delete forever failed | none |
| Organise | "Trash emptied" | Empty done | none |
| Organise | "Couldn't empty Trash" / "Nothing was deleted." | Empty failed | none |
| Organise | "Couldn't save the setting" / "It is back to {days} days." | Retention save failed | none |
| Organise | "Reminder set for {when}" (detail title) | Reminder set / snoozed | none |
| Organise | "Reminder removed" / "{count} reminders removed" | Reminder cleared / Done | none |
| Organise | "Couldn't save the reminder" (detail title) | Reminder save failed | "Retry" |
| Organise | "A reminder is due" / "{count} reminders are due" (detail title) | App open with new due reminders | "Show" |
| Search and AI | "Couldn’t save your AI settings" / "The change was undone. Try again." | any Settings › AI save fails | — |
| Search and AI | "Couldn’t start processing your links" | backfill start refused/failed (settings, intro step 2, search reminder) | — |
| Search and AI | "Couldn’t stop processing. Try again." | backfill stop fails | — |
| Search and AI | "AI data deleted" | Delete AI data succeeded | — |
| Search and AI | "Couldn’t delete AI data" / "Nothing was removed. Try again." | Delete AI data failed | — |
| Search and AI | "Moved to {{folder}} by AI" / link title | Automatic mode moved a saved link | Undo (8 s) |
| Search and AI | "{{count}} tag added by AI" / "{{count}} tags added by AI" / link title | Automatic mode tagged a saved link | Undo (8 s) |
| Search and AI | "Couldn’t undo the AI change" | Undo of Automatic mode failed (toast or Edit link) | — |
| Search and AI | "Couldn’t rewrite the summary" / "Your summary is unchanged. Try again later." | Rewrite failed | — |
| Search and AI | "Tidied {{count}} link(s)" / "Moved into {{count}} folder(s), {{count}} tag(s) added" (either part alone) | Tidy apply | Undo (8 s) |
| Search and AI | "Couldn’t tidy the links" / "Nothing was changed. Try again." | Tidy apply failed | — |
| Search and AI | "Nothing to apply" / "The suggestions changed meanwhile." | Tidy apply changed nothing (info) | — |
| Search and AI | "Tidy undone" | Tidy Undo succeeded | — |
| Search and AI | "Couldn’t undo the tidy" | Tidy Undo failed | — |
| Search and AI | "Cleaned up {{count}} thing(s)" / "{{count}} copy/copies in Trash, {{count}} tag(s) merged" (either part alone) | clean-up apply | Undo (8 s; without Undo when the server returns none) |
| Search and AI | "Couldn’t apply the changes" / "Nothing was changed. Try again." | clean-up apply failed | — |
| Search and AI | "Nothing to apply" / "These items changed meanwhile." | clean-up apply changed nothing (info) | — |
| Search and AI | "Clean-up undone" | clean-up Undo succeeded | — |
| Search and AI | "Couldn’t undo the clean-up" | clean-up Undo failed / expired | — |
| Search and AI | "Couldn’t start the check. Try again." | clean-up run failed (not 409) | — |
| Search and AI | "Server address copied" | MCP address copied | — |
| Search and AI | "Couldn’t copy. Select the text and copy it with your keyboard." | MCP address or how-to copy refused | — |
| Search and AI | "{{client}} setup copied" | how-to snippet copied | — |
| Search and AI | "Token copied" | token copied in the create dialog | — |
| Search and AI | "Token revoked" / token name | revoke succeeded | — |
| Search and AI | "Couldn’t revoke the token. Try again." | revoke failed | — |
| Search and AI | "Always put {{domain}} links in {{folder}}?" / "Your last {{count}} link(s) from this site is/are there. A rule works without AI." | after filing / Tidy (rules area) | "Create rule", "Not now" |
| Capture | "Saved to {{folder}}" (detail: link title, thumbnail) | single link saved (Add link, Share target) | none |
| Capture | "Couldn’t create the folder “{{name}}”" / "The link is saved without a folder." | pending folder could not be created | none (warn) |
| Capture | "{{count}} link saved to {{folder}}" / "{{count}} links saved to {{folder}}" (detail "Titles and previews are still loading") | paste many saved, one folder | Undo (8 s) |
| Capture | "{{count}} link saved" / "{{count}} links saved to their folders" | paste many saved into different folders by rules | Undo (8 s) |
| Capture | same titles, detail "{{count}} link was skipped: it was a repeat or too long" / "{{count}} links were skipped: repeats or too long" | some items skipped by server (warn) | Undo (8 s) |
| Capture | "No links were saved" + skipped detail | every item skipped (danger) | none |
| Capture | "Couldn't undo" / "The links are still saved" | paste-many Undo failed | none |
| Capture | "{{count}} link imported" / "{{count}} links imported" | import run ended while the dialog was closed | none |
| Capture | "Import undone" / "{{count}} link(s) moved to Trash" | undo import | none |
| Capture | "Could not undo the import. Try again." | undo import failed | none |
| Capture | "Descriptions and tags are ready" / "{{count}} link(s) got a short description." "There are tag suggestions for {{count}} link(s)." | AI pass of an import finished (12 s) | "Review tags" (only with suggestions) |
| Capture | "File saved" | export dialog download completed | none |
| Capture | "Couldn't export your links" / "Check your connection, then try again" | export failed (any entry) | "Try again" |
| Capture | "Nothing to export yet" / "Save a link first, then you can export your library" | whole-library export with no links (info) | none |
| Capture | "Nothing to export in this view" / "This view has no links. Export everything, or open another view" | view export of an empty view (info) | none |
| Capture | "Folder link copied" | share dialog copy | none |
| Capture | "Link reset" / "The old link no longer works" | reset link | none |
| Capture | "Link copied" | public page copy | none |
| Capture | "Couldn't copy the link" / "Copy it from the address bar" | public page copy refused | none |
| Settings | "Couldn't save the appearance" / "It is back to how it was." | Appearance change or Folder colors save failed | none |
| Settings | "Color removed" / (hex) | Own colour swatch removed | "Undo" (hint "Press {{shortcut}} to reach {{action}}") |
| Settings | "Couldn’t remove the color" / (hex) | Removing own colour failed | none |
| Settings | "Couldn’t save the setting" / "It is back to how it was." | Language or Dates and numbers save failed | none |
| Settings | "Couldn't save the setting" / "It is back to how it was." | Library setting save failed; Remember recently opened save failed | none |
| Settings | "Couldn't save the setting" / "It is back to {{days}} days." | Trash retention save failed | none |
| Settings | "Couldn't clear the history" | History clear failed after pausing | none |
| Settings | "Account deleted" / "All your data was deleted" | Account deleted (success) | none |
| Settings | "Couldn't load more messages" / "Try again" | Admin inbox load more failed | none |
| Settings | "Couldn't save" / "The message is back as it was. Try again." | Admin status/reply save refused | none |
| Settings | (export toasts) | Download from Account › Your data | see capture area |
| Public pages | "Couldn't sign you out" / "Try again" | Sign-out request failed | none |
| Public pages | "A new version of Shelfmark is ready" | Service worker has a new version | "Reload", "Later" (stays until chosen) |
| Public pages | "Saved to Read later" | Decorative toast in the landing hero preview (not a real toast) | "Undo" (inert) |

### 5.4 Empty states

| Area | Screen | Exact copy (title / body / button) |
| --- | --- | --- |
| Library | All links | "Your links will live here" / "Paste a link to a video, an article or something to buy — the title and preview fill in by themselves." / "Add link", "Watch how it works" |
| Library | Unsorted | "Unsorted is empty" / "Links you save without a folder wait here until you file them." / "Add link" |
| Library | Favorites | "Your favorites will live here" / "Tap the star on a link to keep it here." / "Show all links" |
| Library | Folder | "This folder is empty" / "Add a link here, or move links from Unsorted." / "Open Unsorted", "Add link" |
| Library | Feed with search | "Nothing found for “{{query}}”" / "Try another word, or search in all folders." / "Clear search", "Search all folders" (not on All links) |
| Library | Feed with tags only | "No links with these tags" / "Nothing you saved has all of the selected tags." / "Clear filter" |
| Library | Feed matching a saved view | "Nothing in “{{name}}” yet" / "Links that match this view show up here as you save them." / "Show all links" (clears tags and type) |
| Library | Feed with other filters | "Nothing matches these filters" / "No saved link matches all of the selected filters." / "Clear filters" |
| Library | Side by side right half (empty folder) | "Drag links here from the left." |
| Library | Recently opened | "Nothing opened yet" / "Links you open appear here for {{days}} days." / — |
| Library | Recently opened, type chip | "Nothing of this type" / "No link of this type was opened in the last {{days}} days." / "Show all" |
| Library | Recently opened, search | "Nothing matches" / "No link in your history matches “{{query}}”." / "Clear search" |
| Library | Forgotten | "Nothing forgotten" / "Links you save and never open will wait here." / — |
| Library | Pinned (phone Library) | "Nothing pinned yet" (row; tap → hint toast) |
| Library | Settings › Sites that open in a new tab | "None yet." |
| Library | Move picker / split picker | "No folders found" / "No folder found" / "Nothing found" |
| Organise | Sidebar Folders | (no text; heading and "+" only) |
| Organise | Folder page, folder missing | "Folder not found" / "This folder doesn't exist, or it was deleted." / "Show all links" |
| Organise | Folder page, empty folder | "This folder is empty" / "Add a link here, or move links from Unsorted." / "Open Unsorted", "Add link" |
| Organise | Sidebar Tags | "No tags yet. Add one with +." |
| Organise | Phone Tags page | "No tags yet" / "Tags group links across folders. Add one here, or while you save a link." / "New tag" |
| Organise | Tag filter result | "No links with these tags" / "Nothing you saved has all of the selected tags." / clear button |
| Organise | Rules section | "No rules yet. For example, links from youtube.com can go to Videos with the tag video." |
| Organise | Cover picker | "Links in this folder with a preview picture can be its cover." |
| Organise | Emoji search | "No emoji found" |
| Organise | Folder select search | "No folders found" |
| Organise | Tag select search | "No tags found" |
| Organise | Trash | "Trash is empty" / "Deleted links and folders wait here for {days} days, so nothing is gone by accident." |
| Organise | Trash filtered | "Nothing of this kind in Trash" / "Show everything to see what else is waiting here." / "Show all" |
| Organise | Trash header | "Nothing here" |
| Organise | Settings Trash row | "Nothing in Trash" |
| Organise | Reminders | "No reminders yet" / "Choose “Remind me” in the menu of a link, and it comes back here on the day you pick." |
| Organise | Reminders header | "Nothing is due right now" |
| Organise | Phone Pinned (Library) | "Nothing pinned yet" (button; explains "Nothing pinned yet — use “Pin to sidebar” in a folder or link menu") |
| Search and AI | Search (empty field) | "Search your shelf" / "Titles, notes, tags and sites show up as you type." / — |
| Search and AI | Search (no results) | "Nothing found for “{{query}}”" / "Try another word. Search looks through titles, notes, tags and sites." / — |
| Search and AI | Search (no word matches, meaning matches exist) | group lead "No links with these words" |
| Search and AI | Ask (no questions yet) | "What do you want to find out?" / "Ask in your own words. The answer comes from the links you saved, with each source listed." / "Try" + starter cards |
| Search and AI | Ask (not found) | "Nothing in your links answers this." / — / "Search “{{query}}”", "Add a link" |
| Search and AI | Tidy Unsorted | "Nothing to tidy" / "Every link here either has no suggestions yet or you already sorted it. New links get suggestions within a minute." / "Back to Unsorted" |
| Search and AI | Clean-up (never run) | — / "Shelfmark looks for extra copies of the same link and for tags that mean the same. You review every change, and one Undo reverts the whole run." / "Check my library" |
| Search and AI | Clean-up (nothing found) | "Your library is tidy" / "No duplicates or similar tags found." / "Check again" |
| Search and AI | Clean-up (applied) | "All cleaned up" / "The changes you picked are done. Copies you removed wait in Trash." / "Check again" |
| Search and AI | Connect your assistant | "No assistants connected" / "Create a token, paste it into your assistant’s MCP settings with the server address, and ask it about your links." / ("Create token" above) |
| Search and AI | Backfill done | "Process existing links" / "Every existing link has been processed." |
| Capture | Library All links (entry to Add link) | "Your links will live here" / "Paste a link to a video, an article or something to buy — the title and preview fill in by themselves." / "Add link" (+ "Watch how it works") |
| Capture | Library Unsorted | "Unsorted is empty" / "Links you save without a folder wait here until you file them." / "Add link" |
| Capture | Library folder | "This folder is empty" / "Add a link here, or move links from Unsorted." / "Open Unsorted", "Add link" |
| Capture | Share target, no URL | "Nothing to save" / "This share has no web address starting with http:// or https://, so nothing was saved." / "Go to my links" |
| Capture | Public collection, no links | "No links here yet" / "The owner hasn't saved anything in this folder." / none |
| Capture | Public collection, not available | "This collection isn't available" / "The link may be mistyped, or the owner turned it off or reset it." / "Go to Shelfmark" |
| Capture | Import step 2, nothing new | notice "Every link in this file is already on your shelf." |
| Capture | Import, Recent imports | section hidden when there are none |
| Capture | Paste many, none selected | title "Add links", button "Save links" (disabled) |
| Settings | Account › Your shelf | "Nothing saved yet" / "Save your first link and your numbers show up here." / — |
| Settings | Account › Connected accounts (demo) | "The demo account isn't linked to Google or GitHub." |
| Settings | Library › Sites that open in a new tab | "None yet." |
| Settings | Library › Trash row | "Nothing in Trash" |
| Settings | Library › Rules | see RUL-01 ("No rules yet. For example, links from youtube.com can go to Videos with the tag video.") |
| Settings | Your feedback | "No messages yet" / "What you send shows up here with its status and our reply." / — (page-level, inbox icon) |
| Settings | Admin feedback inbox | "No messages" / "Nothing matches this filter yet." / — |
| Settings | Admin stats (too few users) | "Not enough users yet: shares and groups appear from {{min}} real users." |
| Browser extension | Folder picker, search with no match | "No folder with that name" |
| Browser extension | Unsupported page | "This page can't be saved" / "Shelfmark saves web pages. Browser pages, files and the new tab page stay out." / "Open Shelfmark" |
| Browser extension | Signed out | "Sign in to save this page" / "Sign in once in this browser, and every page after that is one click away." / "Sign in to Shelfmark" |
| Public pages | All links library, empty (this area's addition) | extra ghost button "Watch how it works" (rest of the empty state: other area) |
| Public pages | What's new dialog with nothing pending | not empty: shows the newest release with highlights |
| Public pages | Changelog | none (empty sections are omitted) |

### 5.5 Error messages and recovery

| Area | Exact copy | When | Recovery action |
| --- | --- | --- | --- |
| Library | "Folder not found" / "This folder doesn't exist, or it was deleted." | Unknown or foreign folder id | "Show all links" |
| Library | "Couldn't load your links" / "Check your connection and try again." | First page failed | "Try again" |
| Library | "Couldn't refresh your links. You are seeing the last loaded list." | Refetch failed with links shown | "Try again" |
| Library | "Couldn't load more links." | Next page failed | "Load more" |
| Library | "Couldn't load your folders." | Sidebar folders failed | "Try again" |
| Library | "Check your connection and try again." | Right half feed failed | "Try again" |
| Library | "{{domain}} doesn't open inside other apps" / "The site blocks it, not Shelfmark. Open it in a new tab." | Preview frame blocked / timeout / non-https | "Open in new tab", "Always open {{domain}} in a new tab" |
| Library | "You already have the most views you can save. Delete one first." | New view at limit (server) | — |
| Library | "The folder of this view is gone. Open another folder and try again." | New view, folder missing | — |
| Library | "Couldn't save the view. Try again." | New view failed | retry submit |
| Library | "Couldn’t compose a view right now. This didn’t count toward your limit; you can set the filter yourself." | AI compose failed | "save the current filter" |
| Library | "Enter a name" / "Use at most {{max}} characters" | View name validation | — |
| Library | "“{{name}}” is not one of your tags. Pick one from the list." | New view tags | — |
| Library | "Enter a link" / "Enter an address that starts with http:// or https://" / "The link is too long (at most {{max}} characters)" | Edit link URL | — |
| Library | "Enter a title" / "The title is too long (at most {{max}} characters)" | Edit link title | — |
| Library | "The note is too long (at most {{max}} characters)" | Edit link note | — |
| Library | "Couldn't save the link. Try again." / "A folder or tag changed while saving. Try again." / "Too many requests. Wait a moment and try again." / "The link couldn't be saved because some details are invalid. Check the address, title and note." / "You have reached the limit of {{max}} saved links. Delete some to save more." | Edit/Add save errors (notice in dialog) | resubmit |
| Library | "You signed out in another tab" / "To keep your links private, this tab is locked too." | Other tab signed out | "Sign in again" |
| Library | "Too many requests" / "Try again in a moment"; "Something went wrong on our side" / "Try again" | API 429 / 5xx | — |
| Library | (401 from API) | Session gone | Redirect to sign-in with returnUrl |
| Organise | "Couldn't load your folders." | Folder list failed (first load) | "Try again" |
| Organise | "Enter a folder name" | Name empty / only spaces | fix field |
| Organise | "Use {max} characters or fewer" | Folder name > 100 / tag name > 50 | fix field |
| Organise | "Couldn't create the folder. Try again." | Create failed (incl. server limit) | submit again |
| Organise | "Couldn't delete the folder. Nothing was changed." | Delete failed | submit again |
| Organise | "Keep it to {max} characters." | Description > 140 | fix field |
| Organise | "Use plain text on one line." | Description with control characters | fix field |
| Organise | "Enter exactly one emoji." | Emoji field invalid | fix field |
| Organise | "Enter # and six digits or letters a–f, like #2e6a99." | Own colour hex invalid | fix field |
| Organise | "Couldn't load your tags." | Tag list failed | "Try again" |
| Organise | "Enter a tag name" | Tag name empty | fix field |
| Organise | "There's already a tag “{name}”." | New tag name exists | change name |
| Organise | "There's already a tag “{name}”. Merge them instead?" | Rename to existing name | "Merge into “{name}”" |
| Organise | "You have reached the limit of {max} tags." | 1000 tags | delete tags |
| Organise | "Couldn't create the tag. Try again." | Create failed | Enter again |
| Organise | "Couldn't rename the tag. The old name is back." | Rename failed | Enter again |
| Organise | "Choose a tag to merge into" | Merge without target | choose |
| Organise | "Couldn't merge the tags. Try again." | Merge failed (dialog) | "Merge" again |
| Organise | "Couldn't load the rules." | Rules list failed | "Try again" |
| Organise | "Enter a domain" / "Enter a domain such as youtube.com" | Rule domain empty / invalid | fix field |
| Organise | "Up to {max} tags" | Rule tags > 5 | remove tags |
| Organise | "Choose a folder or add at least one tag." | Rule with neither | choose |
| Organise | "There is a rule for this domain already." | Domain taken (409) | change domain |
| Organise | "You can have up to {max} rules. Delete one first." | 50 rules | delete a rule |
| Organise | "This folder is gone. Choose another one." | Rule folder missing (404) | choose folder |
| Organise | "This rule was deleted meanwhile." | Editing a deleted rule | close |
| Organise | "Couldn't save the rule. Try again." | Other failure | save again |
| Organise | "The folder of this rule is in Trash. Choose another one or keep only the tags." | Editing a rule whose folder is trashed | choose folder |
| Organise | "Couldn't load Trash" / "Check your connection and try again." | Trash list failed | "Try again" |
| Organise | "Couldn't load the setting." | Settings failed (retention) | "Try again" |
| Organise | "Couldn't load your reminders" / "Check your connection and try again." | Reminders list failed | "Try again" |
| Organise | "This time has already passed. Pick a later one." | Picked past time | pick later |
| Search and AI | "Couldn't search. Try again." | word search request failed | type again |
| Search and AI | "Couldn’t load your AI settings." | settings load failed | "Try again" |
| Search and AI | "AI isn’t responding right now. Your links save as usual; suggestions and summaries catch up when it’s back." | provider unavailable, AI on (Settings › AI) | — |
| Search and AI | "Couldn’t turn on AI. Try again." | intro save failed | "Turn on AI" again |
| Search and AI | "Suggestions are paused until {{date}}. You used this month’s {{limit}} links." | Add link draft hit the monthly limit | "AI settings" |
| Search and AI | "Suggestions aren’t available right now. Your link saves as usual." | Add link draft provider failure | "Try again" (once) |
| Search and AI | "You used this month’s {{limit}} links. New links save as usual, without suggestions or summaries, until {{date}}." | monthly limit (Settings › AI) | — |
| Search and AI | "Paused until {{date}}: this month’s limit" | meaning search quota | — |
| Search and AI | "Search by meaning is getting ready: {{ready}} of {{total}} links. Word matches work as usual." | meaning not ready / quota (search, once per session) | — |
| Search and AI | "You’ve used today’s questions. Ask again tomorrow; search works as usual." | Ask day limit | — |
| Search and AI | "You’ve used this month’s questions. Ask again on {{date}}; search works as usual." | Ask month limit | — |
| Search and AI | "Couldn’t get an answer right now. This question didn’t count toward your limit." | Ask unavailable / broken | "Try again" |
| Search and AI | "This question couldn’t be answered. It didn’t count toward your limit." | Ask rejected | "Try again" |
| Search and AI | "Another question is still being answered. Try again in a moment." | Ask busy | "Try again" |
| Search and AI | "Too many questions in a short time. Try again in a minute; this one didn’t count toward your limit." | Ask 429 | "Try again" |
| Search and AI | "Ask your shelf is turned off in Settings › AI." | Ask off | — (entry points hide) |
| Search and AI | "The answer was cut short." | Ask truncated | — |
| Search and AI | "Stopped." | Ask stopped before text | — |
| Search and AI | "Couldn’t load the clean-up report." | clean-up load failed | "Try again" |
| Search and AI | "The check stopped before it finished. Here is what it found." | clean-up failed with rows (info) | review / "Check again" not offered here |
| Search and AI | "The check didn’t finish" / "It stopped before it found anything, and nothing was changed. Try checking again." | clean-up failed with nothing | "Try again" |
| Search and AI | "Couldn’t load your tokens." | MCP list failed | "Try again" |
| Search and AI | "You have {{max}} tokens. Revoke one to create another." | token create 409 / at limit | revoke one |
| Search and AI | "Connecting an assistant is part of Pro." | token create 403 | — |
| Search and AI | "Couldn’t create the token. Try again." | token create other failure | Create again |
| Search and AI | "Couldn’t copy. The token is selected above: press Ctrl+C or ⌘C to copy it." | clipboard refused for the token | copy by keyboard |
| Search and AI | "Give the token a name." | token name empty/blank | type a name |
| Search and AI | "Use at most {{max}} characters." | token name > 40 | shorten |
| Search and AI | "Keep the summary under {{max}} characters." | summary > 300 | shorten |
| Search and AI | "Paste a link first" | Fill in with AI without a valid address (tooltip/description) | paste a link |
| Search and AI | "AI had nothing to fill in for this link" | Fill found nothing (announcement) | — |
| Capture | "Enter a link" | Add link submitted empty | type a link |
| Capture | "Enter an address that starts with http:// or https://" | invalid address | fix; field shakes on submit |
| Capture | "The link is too long (at most {{max}} characters)" | URL > 2048 | shorten |
| Capture | "Enter a title" | Edit link with empty title | type a title |
| Capture | "The title is too long (at most {{max}} characters)" | title > 300 | shorten |
| Capture | "The note is too long (at most {{max}} characters)" | note > 2000 (Add link, Share target) | shorten |
| Capture | "Couldn't load a preview. The link will be saved with its address as the title — you can rename it." | preview request failed | save anyway / rename |
| Capture | "No preview is available for this page. The link will be saved with its address as the title — you can rename it." | page not fetched | save anyway |
| Capture | "Couldn't save the link. Try again." | generic save failure (also Share target) | retry (same idempotency key) |
| Capture | "You have reached the limit of {{max}} saved links. Delete some to save more." | 409 link limit | delete links |
| Capture | "A folder or tag changed while saving. Try again." | 409 changed meanwhile | retry |
| Capture | "Too many requests. Wait a moment and try again." | 429 | wait |
| Capture | "The link couldn't be saved because some details are invalid. Check the address, title and note." | 400 | fix fields |
| Capture | "Paste or type some links" | several-links area empty | paste |
| Capture | "No links found in this text" | several-links area without links | paste other text |
| Capture | "Only {{fit}} more link fits your shelf. Uncheck some and try again." / plural | batch over link limit | uncheck rows |
| Capture | "This file is larger than {{max}} MB." | import file > 50 MB | other file |
| Capture | "This file could not be read. Try exporting it again." | read error | re-export |
| Capture | "There are no bookmarks in this file. Choose the HTML file your browser saved with “Export bookmarks”." | not a bookmark file | choose right file |
| Capture | "There are no web links in this file." | no http(s) links | other file |
| Capture | "This file holds more than {{max}} links." | > 10 000 links | split file |
| Capture | "Could not compare the file with your shelf. Try again." | duplicate check failed | choose the file again |
| Capture | "Only {{count}} more link(s) fit your limit…" / "Your shelf has no room for more links." | room check (warning) | delete links / import fewer |
| Capture | "The links could not be grouped right now. Nothing was used from your allowance. Go back, or import them without groups." | AI grouping failed | Back / "Import N links" |
| Capture | "Not enough of the allowance for existing links is left for these links. Go back, or import them without groups." | allowance short | Back / import plain |
| Capture | "You have already grouped as many links with AI this month as you can. Import them as in the file, or without folders." | monthly cap | import plain |
| Capture | "Give the folder a name" | empty new group name | type a name |
| Capture | "The import could not start, nothing was saved. Try again." | start failed | "Back" |
| Capture | "The folders do not fit your folder limit. Choose “No folders” and try again." | folder limit on start | "Back", choose No folders |
| Capture | "{{count}} could not be saved." (in summary) | failed batches | none |
| Capture | "Couldn't load the sharing settings." | share dialog load failed | "Try again" |
| Capture | "You can share up to {{max}} folders. Make another folder private first." | 11th public folder | make another private |
| Capture | "Demo accounts can't share folders. Sign in to share yours." | demo account | sign in |
| Capture | "Couldn't save the change. Try again." | share change failed (switch reverts) | retry |
| Capture | "Copying isn't allowed here. The link is selected: press Ctrl+C or ⌘C to copy it." | clipboard refused in share dialog | copy manually |
| Capture | "Couldn't load the collection." | public page load failed | "Try again" |
| Settings | "Couldn't load your numbers." | Account stats failed | "Try again" |
| Settings | "Couldn't load the setting." | Settings load failed (Library page, retention) | "Try again" |
| Settings | "Enter # and six digits or letters a–f, like #2e6a99." | Invalid hex in colour picker | fix field |
| Settings | "This color is hard to read on your background ({{ratio}}:1, it needs 4.5:1)." | Typed accent fails contrast | "Use {{colour}}" |
| Settings | "Text is hard to read on this background ({{ratio}}:1, it needs 4.5:1)." | Typed background fails contrast | "Use {{colour}}" |
| Settings | "That email does not match your account. Check it and try again." | Delete account 400 | edit field |
| Settings | "Too many attempts. Try again in a minute." | Delete account 429 | wait |
| Settings | "We could not delete your account. Nothing was deleted. Try again." | Delete account 5xx / offline | retry |
| Settings | "Write a message first." | Feedback empty/blank | type text |
| Settings | "Keep it to {{max}} characters or fewer." | Feedback > 2000 | shorten |
| Settings | "Couldn't send. Your text is kept — try again in a moment." | Feedback send failed | Send again |
| Settings | "You have sent a lot of messages in the last hour. Your text is kept — try again later." | Feedback 429 | later |
| Settings | "That file is not a PNG, JPEG or WebP image." | Screenshot type | choose another |
| Settings | "That image is larger than {{max}} MB. Choose a smaller one." | Screenshot > 2 MB | choose another |
| Settings | "That file is empty." | Screenshot empty | choose another |
| Settings | "Couldn't read that file. Try another one." | Screenshot read failed | choose another |
| Settings | "You can add up to {{count}} images." | More than 3 chosen | remove one |
| Settings | "Some images couldn't be attached. Your message was sent without them." | Screenshot upload failed after send | none |
| Settings | "Couldn't load your messages." | Your feedback list failed | "Try again" |
| Settings | "Couldn't send your feedback. Try again." | Rating comment send failed | Send again |
| Settings | "Couldn't load the messages." | Admin inbox failed | "Try again" |
| Settings | "Keep the reply to {{max}} characters or fewer." | Admin reply > 2000 | shorten |
| Settings | "Couldn't load the stats." | Admin stats failed | "Try again" |
| Settings | "Couldn't refresh. These are the last numbers." | Admin stats refresh failed | "Refresh" |
| Settings | API: "A message has at most 3 screenshots" / "Screenshots can only be added right after sending" / "Screenshot limit reached for today, try again later" | Screenshot route 400/429 (counted as failed screenshot in UI) | — |
| Browser extension | "Couldn't reach Shelfmark" (title) | Failed load | Try again / Open Shelfmark |
| Browser extension | "Couldn't save this page" (title) | Failed save (single or batch) | Try again / Open Shelfmark |
| Browser extension | "No connection to Shelfmark. Check the internet and try again." | Status 0 (no connection) or a request over 15 s | Try again |
| Browser extension | "Too many saves in a row. Wait a minute and try again." | 429 | Try again |
| Browser extension | "Your library is full. Remove some links in Shelfmark to save new ones." | "Link limit reached" message (10,000 cap; also batch over the cap, demo or not) | Open Shelfmark only |
| Browser extension | "A demo holds 100 links. Sign in with Google or GitHub to keep saving." | "Demo link limit reached" (single save as demo) | Open Shelfmark only |
| Browser extension | "Something went wrong on our side. Try again in a moment." | Any other error (incl. 403 from the CSRF guard, 404 unknown folder) | Try again |
| Browser extension | "Couldn’t create the folder “{{name}}”, so the link is saved without a folder." | New folder creation failed on save | none (link saved in Unsorted) |
| Browser extension | "Suggestions are paused until {{date}}. You used this month’s {{limit}} links." | AI monthly limit (Fill) | "AI settings" |
| Browser extension | "Suggestions are paused until {{date}}. The other links go to the folder in the Folder field." | AI monthly limit during Sort | "AI settings" |
| Browser extension | "Suggestions aren’t available right now. Your link saves as usual." | AI draft failed (Fill or all of Sort) | Click AI button again (Fill) |
| Browser extension | "This tag is already added" | Tag repeat | — |
| Browser extension | "Up to {{max}} tags" | Tag cap (20) | — |
| Browser extension | "Address is too long" / "Same address as another tab" | Batch item skipped | none |
| Public pages | "We could not sign you in. Try again." | Sign-in or demo button failed for an unexplained reason | Press the button again |
| Public pages | "Sign-in did not finish. Try again." | Unknown `?error=` from OAuth | Sign in again |
| Public pages | "Sign-in was canceled. Try again when you are ready." | `?error=access_denied` | Sign in again |
| Public pages | "Your GitHub account has no verified email. Verify an email in your GitHub settings, or sign in with Google." | `?error=email_not_found` | Verify email or use Google |
| Public pages | "The sign-in took too long or was interrupted. Start again." | `?error=state_mismatch` / `please_restart_the_process` | Sign in again |
| Public pages | "This email already belongs to an account that could not be linked. Sign in with the provider you used before." | `?error=account_not_linked` / `unable_to_link_account` | Use the earlier provider |
| Public pages | "Your session has expired. Sign in again." | 401 from the API while signed in | Sign in; returns to the page |
| Public pages | "The demo has ended. Open a new one or sign in." | Demo time is up | Open the demo / sign in |
| Public pages | "Too many demos were opened from your network. Try again in an hour, or sign in." | `POST /api/demo` 429 | Wait or sign in |
| Public pages | "The demo is full right now. Try again later, or sign in." | `POST /api/demo` 503 | Wait or sign in |
| Public pages | "We could not open the demo. Try again, or sign in." | `/demo` failed otherwise | Retry or sign in |
| Public pages | "Couldn't sign you out" / "Try again" | Sign-out failed | Retry sign-out |
| Public pages | "Demo link limit reached" (API message; the app shows its generic save failure) | Demo has 100 links | Delete links |

### 5.6 Confirmation dialogs

| Area | Action | Exact copy (title / body / confirm button) |
| --- | --- | --- |
| Library | Delete a link | "Delete this link?" / "“{{title}}” moves to Trash. You can restore it for {{days}} days." / "Delete link" (Cancel: "Cancel") |
| Library | Bulk delete | "Move {{count}} link to Trash?" / "Move {{count}} links to Trash?" / "They stay in Trash for {{days}} days, then they are deleted for good." / "Move to Trash" |
| Library | Bulk open all (>10) | "Open {{count}} links?" / "Each link opens in a new tab." / "Open all" |
| Library | Delete a saved view | "Delete view {{name}}?" / "Only the view goes. The links stay where they are." / "Delete view" |
| Library | Clear Recently opened | "Clear history?" / "Every link leaves Recently opened. Your saved links stay where they are." / "Clear history" |
| Library | Signed out elsewhere (lock) | "You signed out in another tab" / "To keep your links private, this tab is locked too." / "Sign in again" (not dismissable) |
| Organise | Delete folder | "Delete folder “{name}”?" / text variant ("This folder is empty." · "It has {subfolders} and no links." · "It has {links}. What should happen to the links?" · "It has {links} and {subfolders}. What should happen to the links?") + radio "Move links to Unsorted" / "Delete links too" / "Delete folder" or "Delete folder and {count} link(s)" (danger) |
| Organise | Delete tag | "Delete tag “{name}”?" / "It will be removed from {count} link(s). The link(s) … stay(s) where … ." / "Delete tag" (danger) |
| Organise | Apply rule to existing links | "Apply the rule for {domain}?" / "{count} link(s) in Unsorted get(s) the folder and tags of this rule: {target}." [+ "There are {total} in all. Apply it again for the rest."] / "Apply to {count} link(s)" |
| Organise | Delete forever (Trash) | "Delete forever?" / "“{title}” will be deleted for good. This can’t be undone." · "The folder “{title}” and its {links} will be deleted for good. This can’t be undone." · "{items} will be deleted for good. This can’t be undone." / "Delete forever" (danger) |
| Organise | Empty trash | "Empty trash?" / "{items} will be deleted for good. This can’t be undone." · "…, including the folder “{name}” and its {links}. …" · "…, including {folders} and their {links}. …" / "Delete {count} item(s)" (danger) |
| Organise | Shorter Trash retention | "Shorten how long Trash keeps items?" / "{count} item(s) in Trash is/are older than {days} days and will be deleted for good tonight." / "Keep for {days} days" (danger) |
| Organise | Delete rule | none (Undo toast instead) |
| Organise | Remove reminder | none (button in dialog) |
| Search and AI | Delete AI data | "Delete AI data?" / "Every summary and suggestion AI made is removed, and search by meaning turns off. Your own edits, tags and folders stay. This can’t be undone." / "Delete AI data" (destructive; "Cancel", close "Close") |
| Search and AI | Revoke MCP token | "Revoke {{name}}?" / "It stops working at once: the assistant that uses it can no longer read your links." / "Revoke" (destructive; "Cancel") |
| Search and AI | Turn on AI (consent) | "Turn on AI in Shelfmark?" (phone "Turn on AI?") / six points / "Turn on AI" ("Not now") |
| Search and AI | Process saved links (intro step 2) | "AI is on. Process your {{count}} saved link(s)?" / lead + checks / "Process {{count}} link(s)" ("Later") |
| Capture | Undo import | "Undo this import?" / "The {{count}} link(s) and the folders of this import go to Trash, and tags it added that nothing else uses are removed. What you added since stays." / "Undo import" (cancel "Cancel") |
| Capture | Reset folder link | "Reset the folder link?" / "The old folder link stops working at once. Anyone who should still see the folder needs the new link." / "Reset link" (destructive; cancel "Cancel") |
| Capture | Save a duplicate | no dialog: inline notice "You already saved this link in {{folder}}. Open it, or save it again." with "Create anyway" (Add link) / "Save anyway" (Share target) |
| Capture | Paste-many save | no confirmation; Undo toast instead |
| Capture | Turn public folder off | no confirmation (link ends at once) |
| Settings | Shorten Trash retention (items would be deleted) | "Shorten how long Trash keeps items?" / "{{count}} item(s) in Trash is/are older than {{days}} days and will be deleted for good tonight." / "Keep for {{days}} days" (destructive; "Cancel") |
| Settings | Turn off Remember recently opened | "Stop remembering recently opened?" / "The Recently opened list is cleared, and links you open are not added until you turn this back on. Your links stay saved." / "Clear and stop" (destructive; "Cancel") |
| Settings | Delete account | "Delete your account?" / "All your links, folders and tags will be deleted for good. This can't be undone." + type email ("Type your email to confirm", hint "Enter {{email}} to confirm.") / "Delete account" (danger; "Cancel") |

### 5.7 Limits and quotas

| Area | What | Limit | Source |
| --- | --- | --- | --- |
| Library | Saved links per user | 10,000 | `LINK_LIMIT.PerUserMax` |
| Library | URL / title / note length | 2048 / 300 / 2000 | `LINK_LIMIT` |
| Library | Tags per link | 20 | `LINK_LIMIT.TagsMax` |
| Library | Tags in a feed filter | 5 | `LINK_LIMIT.TagFilterMax` |
| Library | Search text | 200 characters, 5 words used | `LINK_LIMIT.QueryMax`, `QueryTermsMax` |
| Library | Batch create/update/delete | 100 per request | `LINK_LIMIT.BatchMax` |
| Library | Links pinned to top of one folder | 20 | `LINK_LIMIT.PinnedInFolderMax` |
| Library | Sidebar pins (folders + links) | 7 | `PIN_LIMIT.Max` |
| Library | Saved views per user / name / tags per view | 20 / 40 chars / 5 | `SAVED_VIEW_LIMIT` |
| Library | View phrase / ideas | 3–200 chars / 3 | `VIEW_DRAFT_LIMIT` |
| Library | New view preview | 1 page of up to 100, first 3 shown, 250 ms debounce | `NEW_VIEW_PREVIEW` |
| Library | Feed page size | 50 default, 100 max | `PAGE_LIMIT` |
| Library | Recently opened window / fetched | 30 days / 100 links | `RECENT_LINKS_WINDOW_DAYS`, `RECENT_LINKS_LIMIT` |
| Library | Recent move targets | 5 | `RECENT_FOLDERS_MAX` |
| Library | Feeds remembering view/sort | 300 | `FEED_MEMORY_LIMIT` |
| Library | Open all without confirmation | 10 | `BULK_OPEN_CONFIRM_ABOVE` |
| Library | Undo window | 8 s | `TOAST_DURATION_MS.Undo` |
| Library | Limit toasts (pins, views) | 6 s | `PIN_LIMIT_TOAST_MS`, `LIMIT_TOAST_MS` |
| Library | No-drop reason toast | 2.5 s | `REASON_TOAST_MS` |
| Library | Same error toast repeat | 2 s | `ERROR_TOAST_DEDUPE_MS` |
| Library | Rediscover block | 3–5 links; saved ≥30 days; not opened ≥90 days; theme: last 14 days, ≥3 links | `REDISCOVER_LIMIT` |
| Library | Preview list width | default 400, min 300, panel min 480 | `PREVIEW_LIST_WIDTH` |
| Library | Preview frame load timeout | 10 s | `PREVIEW_FRAME_TIMEOUT_MS` |
| Library | Touch drag delay (links) / touch reorder rest (pins, folders) | 150 ms / 400 ms | `DRAG_START_DELAY`, `TREE_REORDER_TOUCH_DELAY_MS` |
| Library | Skeleton timing | appears after 300 ms, stays ≥400 ms | `loaderVisible` |
| Library | Rate limits | link preview 20/min, add link 30/min, batch add 5/min, batch delete 10/min, batch update 30/min, frame check 60/min | `apps/api/src/common/rate-limit/models/rate-limit.const.ts` |
| Library | Demo banner refresh | 60 s | `DEMO_BANNER_TICK_MS` |
| Organise | Folders per user (incl. folders in Trash on the server) | 500 | `FOLDER_LIMIT.PerUserMax` |
| Organise | Folder name | 1–100 characters (trimmed) | `FOLDER_LIMIT.NameMax` |
| Organise | Folder description | ≤140 characters after trim, one line | `FOLDER_LIMIT.DescriptionMax` |
| Organise | Folder depth | none | PROJECT.md story 10, no check in code |
| Organise | Folder colours | 8 built-in + own `#rrggbb` | `FOLDER_COLOUR` |
| Organise | Folder icons | 63 (28 shown first) | `FOLDER_ICON`, `FOLDER_ICON_COMMON` |
| Organise | Folder emoji | exactly one emoji, ≤16 code points | `FOLDER_EMOJI_MAX_CODE_POINTS` |
| Organise | Curated emoji | ~300 in 9 categories | `FOLDER_EMOJI_CATALOG` |
| Organise | Emoji "Recent" | 16, per device | `FOLDER_EMOJI_RECENT_MAX` |
| Organise | Own colours | 12 per account | `USER_LIMIT.CustomColoursMax` |
| Organise | Own emoji | 24 per account | `USER_LIMIT.CustomEmojiMax` |
| Organise | Cover choices | 12 links | `COVER_CHOICES_MAX` |
| Organise | Pinned items (folders + links) | 7 | `PIN_LIMIT.Max` |
| Organise | Tags per user | 1000 | `TAG_LIMIT.PerUserMax` |
| Organise | Tag name | 1–50 characters, spaces → "-", unique case-insensitive | `TAG_LIMIT.NameMax` |
| Organise | Tags shown before "+N more" | 8 | `TAGS_TOP_COUNT` |
| Organise | Tags in a filter | 5 | `LINK_LIMIT.TagFilterMax` |
| Organise | Rules per user | 50 | `RULE_LIMIT.PerUserMax` |
| Organise | Tags per rule | 5 | `RULE_LIMIT.TagsMax` |
| Organise | Rule domain | ≤253 (input ≤2048) | `RULE_LIMIT` |
| Organise | Apply rule per run | 100 links | `LINK_LIMIT.BatchMax` |
| Organise | Rule offer | 3 same-folder links in a row; 20 candidates; 5 sites per check | `RULE_OFFER_LIMIT` |
| Organise | Remembered "Not now" domains | 500 | `RULE_OFFER_DISMISSAL_LIMIT` |
| Organise | Trash retention | 7 / 30 / 90 days (default 30) | `TRASH_RETENTION_DAYS` |
| Organise | Trash list | newest 500 entries | `TRASH_LIMIT.ListMax` |
| Organise | Trash batch | 100 entries per request | `TRASH_LIMIT.BatchMax` |
| Organise | Days-left warning | ≤3 days | `TRASH_EXPIRING_SOON_DAYS` |
| Organise | Reminder ahead | ≤1830 days; future (1 min tolerance) | `REMINDER_LIMIT` |
| Organise | Reminders list | 200 due + 200 upcoming | `REMINDER_LIMIT.ListMax` |
| Organise | Bulk reminders | 100 links | `LINK_LIMIT.BatchMax` |
| Search and AI | Search link rows | 5, then "Show all results" | `SEARCH_LINK_LIMIT` |
| Search and AI | Search folder rows / tag rows | 5 each | `SEARCH_LOCAL_LIMIT` |
| Search and AI | Search words used | 5 | `SEARCH_TERMS_MAX`, `LINK_LIMIT.QueryTermsMax` |
| Search and AI | Search text length | 200 characters | `LINK_LIMIT.QueryMax` |
| Search and AI | Search debounce / meaning extra pause | 250 ms / 400 ms | `SEARCH_DEBOUNCE_MS`, `MEANING_DEBOUNCE_MS` |
| Search and AI | Meaning query | 3–200 characters; 3 rows default, 10 max; 2 reasons × 80 characters | `AI_SEARCH_LIMIT` |
| Search and AI | Meaning ready threshold | 80% of live links embedded | `AI_EMBED_LIMIT.ReadyShareMin` |
| Search and AI | Related links | 5 default, 10 max | `AI_SEARCH_LIMIT` |
| Search and AI | AI links per month | Free 50, AI pack 1,000 | `AI_QUOTA.linksPerMonth` |
| Search and AI | Process existing links (one-time) | Free 0, AI pack 5,000 | `AI_QUOTA.backfillLinks` |
| Search and AI | Embeddings per month | Free 2,000, AI pack 20,000 | `AI_QUOTA.embedsPerMonth` |
| Search and AI | Meaning search queries per month | Free 1,000, AI pack 10,000 | `AI_QUOTA.searchQueriesPerMonth` |
| Search and AI | Ask questions | Free 5/day and 5/month; AI pack 50/day and 500/month | `AI_QUOTA` |
| Search and AI | Ask deeper answers | Free 5/5 (inside its 5); AI pack 20/day, 150/month | `AI_QUOTA` |
| Search and AI | AI clean-up runs per month | Free 0, AI pack 10 | `AI_QUOTA.cleanupAiRunsPerMonth` |
| Search and AI | Import AI grouping links per month | Free 0, AI pack 10,000 | `AI_QUOTA.importGroupLinksPerMonth` |
| Search and AI | Ask question length | 3–500 characters | `ASK_LIMIT` |
| Search and AI | Ask history sent | last 10 turns | `ASK_LIMIT.HistoryTurnsMax` |
| Search and AI | Ask answer | 4,000 characters, 24 s hard stop, 8 s first output per round | `ASK_LIMIT` |
| Search and AI | Ask starters / cards per show_links | 3 / 12 | `ASK_LIMIT` |
| Search and AI | Ask tool rounds / calls per round | 4 / 4 | `ASK_LIMIT` |
| Search and AI | Summary length | 300 characters | `AI_LIMIT.SummaryMax` |
| Search and AI | Suggested tags per link | 3 existing + 2 new + 3 extra ideas; 1 folder | `AI_LIMIT` |
| Search and AI | Draft wait in Add link | 8 s | `AI_LIMIT.DraftPollMaxMs` |
| Search and AI | Summary skeleton window | 10 s | `AI_LIMIT.PendingSkeletonMs` |
| Search and AI | Open drafts | 20 per 24 h | `AI_DRAFT_LIMIT` |
| Search and AI | Tidy page / ids per link / scan | 100 links / 6 / 500 rows | `TIDY_LIMIT`, `TIDY_SCAN` |
| Search and AI | Clean-up groups / group size / tag pairs | 100 / 5 / 20 | `CLEANUP_LIMIT` |
| Search and AI | Clean-up Undo held | 10 minutes, single use | `CLEANUP_LIMIT.UndoWindowMinutes` |
| Search and AI | Clean-up entry card interval (API only) | 30 days | `CLEANUP_LIMIT.CardIntervalDays` |
| Search and AI | MCP tokens per user | 10 | `MCP_LIMIT.TokensPerUserMax` |
| Search and AI | MCP token name | 1–40 characters | `MCP_LIMIT.NameMax` |
| Search and AI | MCP calls per token per day | 2,000 | `MCP_LIMIT.CallsPerTokenPerDay` |
| Search and AI | MCP search_links results | 10 default, 25 max; query 200 | `MCP_LIMIT` |
| Search and AI | Undo toast duration | 8 s | `TOAST_DURATION_MS.Undo` |
| Search and AI | Tick interval / post-save poll | 15 s / 1 s | `AI_TICK_INTERVAL_MS`, `AI_POLL_INTERVAL_MS` |
| Search and AI | Clean-up poll while running | 3 s | `CLEANUP_POLL_INTERVAL_MS` |
| Search and AI | Rate limits (per minute) | AiWrite 60, AiDraft 30, AiRewrite 10, AiBackfill 20, AiTick 10, AiDeleteData 5, AiTidy 20, AiTidyRead 60, AiSearch 60, AiRelated 60, AiAsk 10, AiViewDraft 10, Mcp 120, McpTokenWrite 10, CleanupRun 6, CleanupApply 10 | `apps/api/src/common/rate-limit/models/rate-limit.const.ts` |
| Capture | URL length | 2048 characters | `LINK_LIMIT.UrlMax` |
| Capture | Title | 300 characters | `LINK_LIMIT.TitleMax` |
| Capture | Note | 2000 characters | `LINK_LIMIT.NoteMax` |
| Capture | Links per user | 10 000 (demo 100) | `LINK_LIMIT.PerUserMax`, `DEMO_LIMIT.MaxLinks` |
| Capture | Links per paste / batch | 100 | `LINK_LIMIT.BatchMax` |
| Capture | Paste text read | 500 000 characters; 20 skipped lines shown, 80 chars each; 3 previews at a time | `PASTE_LIMIT` |
| Capture | Folder name (created in field) | 100 characters | `FOLDER_LIMIT.NameMax` |
| Capture | Folders per user | 500 | `FOLDER_LIMIT.PerUserMax` |
| Capture | Share target param | 8192 characters per parameter | `SHARE_INPUT_LIMIT.ParamMax` |
| Capture | Preview debounce | 350 ms | `add-link-preview.service.ts` |
| Capture | Preview fetch | 6 s total, 3 redirects, 3 s connect, 2 MB body; title 300, description 1000 | `PREVIEW_FETCH_LIMITS`, `DEFAULT_FETCH_LIMITS`, `PREVIEW_LIMITS` |
| Capture | Rate limits (per IP/min) | save 30, batch 5, batch delete 10, preview 20, export 5, share enable/reset 20, public page 30, public images 240, import start 10, check 60, batch 120, undo 10, AI groups 10/hour | `RATE_LIMIT` |
| Capture | Import file | 50 MB, 10 000 links, depth 8, file name 255 | `IMPORT_LIMIT` |
| Capture | Import duplicate check chunk | 500 URLs | `IMPORT_LIMIT.CheckBatchMax` |
| Capture | Import open for batches | 24 hours | `IMPORT_LIMIT.OpenHours` |
| Capture | Undo import | 7 days, once; 10 recent listed | `IMPORT_LIMIT.UndoDays`, `RecentMax` |
| Capture | AI grouping | 2000 links, 12 groups, 1 MB body | `IMPORT_LIMIT.Group*` |
| Capture | Public folders | 10 per user | `SHARE_LIMIT.PerUserMax` |
| Capture | Public page | 500 links, pages of 50, max 10 pages | `SHARE_LIMIT` |
| Capture | Paste-many Undo toast | 8 s | `TOAST_DURATION_MS.Undo` |
| Settings | Trash retention values | 7, 30, 90 days (default 30) | `TRASH_RETENTION_DAYS`, `TRASH_RETENTION_DEFAULT` |
| Settings | Own colours | 12 (oldest dropped) | `USER_LIMIT.CustomColoursMax` |
| Settings | Own emoji | 24 (oldest dropped) | `USER_LIMIT.CustomEmojiMax` |
| Settings | Sites that open in a new tab | 100 hosts | `USER_LIMIT.PreviewNewTabHostsMax` |
| Settings | Delete account email | ≤ 320 chars | `USER_LIMIT.EmailMax` |
| Settings | Delete account requests | 5 per minute | `RATE_LIMIT.DeleteAccount` |
| Settings | Account stats lists | top sites 5, top tags 5, 12 weeks | `ME_STATS_LIMIT` |
| Settings | Stats firstDay | 1–7 | `ME_STATS_FIRST_DAY` |
| Settings | Feedback message text | 1–2000 after trim | `FEEDBACK_MESSAGE_LIMIT.TextMax` |
| Settings | Feedback messages | 10 per user per rolling hour | `FEEDBACK_MESSAGE_LIMIT.PerHourMax` |
| Settings | Feedback requests | 10 per minute | `RATE_LIMIT.Feedback` |
| Settings | Screenshots | 3 per message, 2 MB each, PNG/JPEG/WebP, within 10 min | `FEEDBACK_MESSAGE_LIMIT` |
| Settings | Screenshot bytes per day | 20 MB (demo 6 MB) per rolling 24 h | `FEEDBACK_MESSAGE_LIMIT` |
| Settings | Client info strings | ≤ 300 chars | `FEEDBACK_MESSAGE_LIMIT.ClientInfoMax` |
| Settings | Your feedback list | 100 messages | `FEEDBACK_MESSAGE_LIMIT.ListMax` |
| Settings | Rating comment | ≤ 2000 per milestone (all appended) | `FEEDBACK_LIMIT.CommentMax` |
| Settings | Rating milestones | 3 days, 7 days, 30 days, 365 days | `FEEDBACK_MILESTONE_DAYS` |
| Settings | Rating timing | show after 5 s, retry 5 s, thanks closes 4 s | `RATING_DELAY` |
| Settings | Rating prompt views | 10 per minute | `RATE_LIMIT.RatingPromptView` |
| Settings | Admin reply | ≤ 2000 | `ADMIN_FEEDBACK_LIMIT.ReplyMax` |
| Settings | Admin inbox page | 20 (API 1–100, default 50) | `ADMIN_LIMIT.PageSize`, `ListAdminFeedbackQuery` |
| Settings | Admin requests | 60 per minute (stats, PATCH) | `RATE_LIMIT.Admin` |
| Settings | Admin stats privacy | min group 3, 30 days, 12 weeks | `ADMIN_STATS_LIMIT` |
| Browser extension | Popup size | 360 x 600 | `styles.scss` |
| Browser extension | Request timeout | 15 s | `request-timeout-ms.const.ts` |
| Browser extension | Skeleton delay | 300 ms | `opening-delay-ms.const.ts` |
| Browser extension | Recent folder chips | 3 | `recent-folders-max.const.ts` |
| Browser extension | Title sent | 300 chars | `LINK_LIMIT.TitleMax` |
| Browser extension | Note | 2000 chars | `LINK_LIMIT.NoteMax` |
| Browser extension | URL (batch favicon hint, API) | 2048 chars | `LINK_LIMIT.UrlMax` |
| Browser extension | New folder name | 100 chars (silently cut) | `FOLDER_LIMIT.NameMax` |
| Browser extension | Links per user / demo | 10,000 / 100 | `LINK_LIMIT.PerUserMax`, `DEMO_LIMIT` |
| Browser extension | Tabs listed in All tabs | 100 | `LINK_LIMIT.BatchMax` |
| Browser extension | Tabs checked for "Saved" | 24 | `tabs-lookup-max.const.ts` |
| Browser extension | Parallel per-tab requests | 3 | `tabs-request-concurrency.const.ts` |
| Browser extension | Tabs per Sort with AI | 25 | `tabs-ai-max.const.ts` |
| Browser extension | AI tags per sorted tab | 2 | `tabs-ai-tags-max.const.ts` |
| Browser extension | Fill in with AI wait | 8 s (poll every 1 s) | `AI_LIMIT.DraftPollMaxMs`, `ai-poll-interval-ms.const.ts` |
| Browser extension | Sort with AI wait | 30 s (round spacing ≥ 1 s or 0.8 s per job) | `tabs-ai-poll-*.const.ts` |
| Browser extension | Rate limits (per client IP per minute) | default 120; POST /api/links 30; lookup 30; batch 5; AI drafts 30 | `rate-limit.const.ts` |
| Browser extension | Store description | 132 chars | `config-check.spec.ts` |
| Browser extension | Minimum Chrome | 120 | manifest |
| Public pages | Session length | 7 days, refreshed at most once a day | `apps/api/src/auth/models/auth-session-lifetime.const.ts` |
| Public pages | Demo length | 24 hours (session capped at demo end) | `libs/shared/contracts/src/demo/demo-limit.const.ts`, `enforce-demo-expiry.ts` |
| Public pages | Demo links | 100 (trash included) | `DEMO_LIMIT.MaxLinks` |
| Public pages | Demo creation per IP | 5 per hour (throttler + Postgres) | `RATE_LIMIT.Demo`, `DEMO_QUOTA.PerSource` |
| Public pages | Demo creation per network (IPv6 /48) | 20 per hour | `DEMO_QUOTA.PerNetwork` |
| Public pages | Active demo sandboxes | 1000 at once (then 503) | `DEMO_QUOTA.ActiveCap` |
| Public pages | Auth route requests | 20 per minute per IP | `RATE_LIMIT.Auth` |
| Public pages | Demo feedback screenshots | 6 MB per day | `FEEDBACK_MESSAGE_LIMIT.DemoScreenshotBytesPerDayMax` |
| Public pages | Demo cleanup run | 100 users per batch, 5 s budget, daily 03:17 UTC | `DEMO_CLEANUP_LIMITS`, `vercel.json` |
| Public pages | Sign-out flush wait | 3 s | `SIGN_OUT_FLUSH_TIMEOUT_MS` |
| Public pages | What's new dialog | 4 highlights; first try 1.5 s after load, retry every 5 s | `whats-new.store.ts`, `WHATS_NEW_DELAY` |
| Public pages | About page What's new | 4 highlights | `landing-whats-new.component.ts` |
| Public pages | How it works card | 14 days on a device (demo: no limit) | `HOW_IT_WORKS_CARD_DAYS` |
| Public pages | Demo banner refresh | every 60 s | `DEMO_BANNER_TICK_MS` |
| Public pages | Boot skeleton | removed after at most 15 s | `public/boot-skeleton.js` |

### 5.8 AI features, modes and tiers

| Area | AI feature | Modes | Tiers / availability | Off behaviour |
| --- | --- | --- | --- | --- |
| Library | Compose a saved view from a phrase (New view dialog) | Compose / Change / save current filter | AI on; counts one Ask question; limit line per day/month | Phrase step not rendered; rows only |
| Library | Show related (side by side "Related folders") | menu item | AI on and search by meaning ready, 80em+ | Item absent |
| Library | Related links button in preview | button "Related · N" with popover | AI on (AI area) | Absent |
| Library | Rediscover theme mode | theme vs forgotten | AI on, AI pack, vectors ready | Forgotten mode lead without spark |
| Library | Summaries on cards/rows | display, pending skeleton | AI Summaries on | Note slot empty / host line |
| Library | Tidy Unsorted entry | toolbar entry | AI on | Hidden |
| Library | Rule offer after filing | after move / bulk move / save with chosen folder | AI on | No offer |
| Library | Fill in with AI, suggestions in Edit link | Suggest / Automatic / Off | AI on | Hidden |
| Library | Ask tab replacing Tags | tab | Ask on | Tags tab |
| Organise | Rule offer ("Always put {domain} links in {folder}?") | toast with Create rule / Not now | only while AI is on (any tier that has AI on) | no check, no toast; rules themselves work without AI |
| Organise | Ask tab replaces Tags (phone) | — | while Ask is on | Tags tab stays; tags not on Library page |
| Search and AI | Main switch (AI-01) | on / off | everyone; off by default | nothing AI anywhere; Settings › AI shows only the switch, Your AI data, Connect your assistant |
| Search and AI | Folder suggestions (AI-04/05) | Suggest (default) / Automatic (only links left in Unsorted, with Undo) / Off | Free 50 links/month, AI pack 1,000 | no chip row; at limit: AI line "Suggestions are paused until {{date}}…" in Add link; provider down: "Suggestions aren’t available right now…" |
| Search and AI | Tag suggestions (AI-04/05) | Suggest (default) / Automatic (only links saved without tags, with Undo) / Off | same job as folder | no chip row; same lines |
| Search and AI | Fill in with AI (AI-06) | button / Alt+Shift+F | uses the draft | button hidden |
| Search and AI | Summaries (AI-07) | switch (default on); language: match app / chosen; Rewrite | same monthly job count | no new summaries; existing ones keep showing until Delete AI data; Rewrite hidden |
| Search and AI | Search by meaning (AI-08) | switch (default on; off for old rows) | Free 2,000 embeds + 1,000 queries/month; AI pack 20,000 + 10,000 | exactly word search: no divider, no Ask row (if Ask off), no hint; quota/processing: once-per-session "getting ready" line |
| Search and AI | Related links / Show related (AI-09) | follows Search by meaning | Free (no model call) | button and menu item hidden |
| Search and AI | Ask your shelf (AI-10) | switch (default on); quick model, one deeper hand-over | Free 5/month; AI pack 50/day, 500/month (deep 20/150) | no header button, no Ask tab (Tags tab back), no search row, `/ask` → Library; at limit: day/month line, composer disabled |
| Search and AI | Tidy Unsorted (AI-11) | review + apply with Undo | any tier (works on existing suggestions) | button hidden; route → Unsorted |
| Search and AI | Process existing links (AI-12) | Start / Stop | AI pack 5,000 one-time; Free not offered | row hidden; search reminder hidden |
| Search and AI | Usage / limits (AI-13) | — | Free 50, AI pack 1,000 links/month | section hidden |
| Search and AI | Delete AI data (AI-14) | — | everyone | available even when off |
| Search and AI | Include my notes / summary language (AI-15) | on/off; app/language | everyone | section hidden |
| Search and AI | AI intro (AI-02) | once | everyone | — |
| Search and AI | AI announcement (AI-03) | once | non-demo, AI available, AI off | not shown once AI is on |
| Search and AI | Clean-up AI checks (AI-17) | Include AI checks switch | AI pack 10 runs/month; Free none (rule checks unlimited for all) | rule checks only; switch hidden |
| Search and AI | Rule offer (AI-18) | toast | AI on | no offers |
| Search and AI | Saved view from a phrase (AI-22) | phrase step | counts 1 Ask question | phrase step hidden |
| Search and AI | Import AI grouping (AI-23) | — | AI pack 10,000 links/month; Free none | not offered |
| Search and AI | Rediscover theme (AI-24) | theme vs forgotten | AI pack + meaning ready | forgotten mode only, no AI mark |
| Search and AI | MCP server (MCP-04) | read-only tools | Pro (not AI pack), not demo | independent of the AI switch |
| Capture | Suggested folder and tags in Add link | suggestions; Automatic mode applies with "Moved by AI" / "N added by AI" + Undo | while AI is on (Settings › AI; plan, other area) | rows not rendered |
| Capture | Fill in with AI (Add link / Edit link) | one click or Alt+Shift+F; waits for the draft with fields locked | AI on | button not rendered; save hint shows instead |
| Capture | Summary field in Add link | AI text, user-edited, cleared (`null`) | AI on and a draft summary, or user text | field not shown unless the user typed |
| Capture | Import "Let AI sort them by topic" (step 2a) | groups by topic, rename, move links, include/exclude | AI on, provider available, backfill allowance ≥ links, ≤ 2000 links, monthly cap, 10 requests/hour | option hidden; falls back to As in the file / No folders |
| Capture | Import AI pass | summaries, kind, tag suggestions; toast to Tidy | only for imports made with AI groups | none |
| Settings | Settings › AI and Library clean-up | see AI area | see AI area | Privacy and data text says AI is off until turned on |
| Browser extension | Fill in with AI (single page) | folder (only into Unsorted), all suggested tags, cleaned title, "more" new-tag chips; summary left to the server via draft id | AI enabled and monthly links allowance > 0; quota line with reset date | No AI button, marks, rows or lines at all |
| Browser extension | Sort with AI (All tabs) | per tab: existing folder + 1–2 tags; per-link folder override; Keep AI picks | same; each tab counts as one link; max 25 per click | No button |
| Public pages | Landing "Optional AI" section (marketing only) | static | shown to everyone | n/a |
| Public pages | Demo AI | mock provider and mock embeddings; seeded summaries and suggestions | demo accounts | n/a (no real AI calls in demo) |

### 5.9 Appearance options

| Area | Option | Values | Default |
| --- | --- | --- | --- |
| Library | Theme (top bar toggle) | Light, Dark (settings also System, Custom) | System |
| Library | Density (changes card/row spacing) | Comfortable, Compact | Comfortable |
| Library | Card "Preview image" | Large, Small, Off | Large |
| Library | "Show site" on cards | on/off | on |
| Library | "Show notes" on cards | on/off | on |
| Library | "Show tags" on cards | on/off | on |
| Library | Text size | 90%, 100%, 112%, 125% | 100% |
| Library | Font | Onest, System, Readable | Onest |
| Library | Animations | System, Full, Reduced | System |
| Library | Folder colours | on/off | on |
| Library | Feed view | Cards, List | Cards (Default view) |
| Organise | Folder colour | Graphite, Sage, Ocean, Plum, Clay, Amber, Rose, Teal, own `#rrggbb` | Graphite |
| Organise | Folder symbol | 63 icons or one emoji | "folder" icon |
| Organise | Highlight with background | on / off | off |
| Organise | Description | text ≤140 | none |
| Organise | Cover | link preview picture or none | none |
| Organise | Folder colors (global) | on / off | on |
| Search and AI | Ask panel width (device) | 440px to min(880px, 70vw) | 440px |
| Settings | Theme | System, Light, Dark, Custom | System |
| Settings | Custom base ("Start from") | Light, Dark | Light |
| Settings | Custom accent | Sage, Ocean, Plum, Clay, Amber, Rose, Teal, Graphite, own colour (hex, 4.5:1 enforced) | Ocean |
| Settings | Custom background | Light: Stone, Paper, Mist, White · Dark: Graphite, Ink, Forest, Black · own colour (hex, text 4.5:1 enforced) | Paper |
| Settings | Custom corners | Round, Soft, Square | Soft |
| Settings | Reset custom theme | action | — |
| Settings | Density | Comfortable, Compact | Comfortable |
| Settings | Card preview image | Large, Small, Off | Large |
| Settings | Card: show site | on/off | on |
| Settings | Card: show notes | on/off | on |
| Settings | Card: show tags | on/off | on |
| Settings | Date format | Language default, 10 Nov 2026, 10.11.2026, 11/10/2026, 2026-11-10 | Language default |
| Settings | Time | Auto, 24-hour, 12-hour | Auto |
| Settings | Week starts on | Auto, Monday, Sunday | Auto |
| Settings | Folder colors | on/off | on |
| Settings | Default view (Library) | Cards, List | Cards |
| Settings | Show folder counts (Library) | on/off | on |
| Browser extension | Popup theme | follows browser/OS light or dark (no switch) | system |
| Browser extension | Banner/landing screenshot | light or dark per app theme | app theme |
| Public pages | none specific to this area | (landing, sign-in, privacy, changelog follow theme and motion; extension and changelog screenshots switch light/dark) | |

### 5.10 Languages

**Library, links and app shell:**

Not covered in this area (UI strings come from en.json; language list belongs to the settings area). Dates on cards ("2 days ago", "Last week", "Oct 28") and history times follow the interface language and its first day of week.

**Search and AI:**

- Summary language (Settings › AI) offers "Match the app ({{language}})" and every interface language by its native name (`LANGUAGE_NAMES`); summaries are written in that language whatever the page language. The MCP how-to code snippets are not translated.

**Capture, import, export and sharing:**

- All copy goes through Transloco (en.json groups `links.add`, `links.many`, `import`, `export`, `share`, `sharing`, `publicCollection`). Format names in the export dialog ("JSON", "HTML", "CSV") are the same in every language. The public collection page follows the browser language or the landing switcher for guests (PROJECT.md story, other area).

**Settings, account, feedback and admin:**

- Supported interface languages (7): English (`en`, source file), Français (`fr`), Deutsch (`de`), Italiano (`it`), Español (`es`), Português (`pt`, Brazilian Portuguese, Brazil flag), Українська (`uk`). Plus the choice "Match my browser" (`browser`, default). Each language is listed in its own name everywhere (never translated). Flags: GB, FR, DE, IT, ES, BR, UA.
- Files: `apps/web/src/app/core/i18n/{en,fr,de,it,es,pt,uk}.json`; loaded lazily per language; English is bundled and the fallback language (missing keys do not use the fallback translation; failed loads are not retried).
- Detection: "Match my browser" takes the first entry of `navigator.languages` whose base language the app has, else English; it follows the browser's `languagechange` event. `Intl` formatting uses the browser's full tag when it speaks the chosen language (e.g. en-GB, pt-PT), else the bare language.
- Storage: account (`PATCH /api/me/settings { language }`, plus dateFormat/timeFormat/weekStart) and `localStorage sm-language` for first paint; guests only in `localStorage`; a guest's choice is saved to the account once at first sign-in if the account has none (`languageSaved` false). Account value wins otherwise.
- Where chosen: Settings › Language (signed in); landing/About footer language buttons (guests and signed in).
- Switch: no reload; loads the language file first, then switches Transloco, plural rules, `Intl` locale and `<html lang>` together.
- Browser extension: 7 languages (`_locales` en, fr, de, it, es, pt_BR, uk; popup JSON per language); follows only the browser languages, not the account.

**Browser extension:**

- Popup UI: en, fr, de, it, es, pt, uk; chosen from `navigator.languages` (base subtag), fallback English; plural forms via `Intl.PluralRules` (Ukrainian has one/few/many/other). Dates ("2 days ago", "December 1") via `Intl` in the popup language.
- Store texts (`_locales`): de, en, es, fr, it, pt_BR, uk.
- The popup does not follow the language set in the web app.

**Public pages, sign-in, demo and onboarding:**

- The landing footer is the only language switcher on public pages: English, French, German, Italian, Spanish, Portuguese, Ukrainian, each shown in its own name. Guests keep the choice in the browser; it is saved to the account at the first sign-in. Signed-in `/about` saves it on the account.
- The sign-in, privacy and changelog pages have no switcher; they use the stored/browser language.
- The How it works video has English captions only (track label "English").
- Changelog and privacy text are translated keys; the privacy "Last updated" date is a translated string ("19 November 2026").

### 5.11 Fixed option lists

- **Folder icons** (folder style dialog, 63): Folder, Briefcase, Code, Graduation cap, Shirt, Cooking pot, Bookmark, Star, Clock, Link, Tag, Inbox, Image, Cards, List, Saved link, Monitor, User, Settings, Download, Share, Ball, Bike, Book, Light bulb, Calendar, Camera, Car, Chart, Cloud, Coffee, Dumbbell, Film, Flag, Game controller, Gift, Globe, Hammer, Health, Heart, Home, Kids, Leaf, Map pin, Mountain, Music, Palette, Paw, Plane, Rocket, Shopping bag, Sun, Tree, Trophy, Umbrella, Food, Wallet, Newspaper, Backpack, Palm tree, Guitar, Laptop, Lock. "Show all icons ({{count}})" expands the grid; emoji (including up to 24 own emoji under "Yours") are the alternative.
- **Link kinds** (detected per link; `?kind=` filter, saved views, card badges): Video, Article, Shopping, Podcast, Document, Code, App, Post, Recipe, Other. Saved-view hints read "Links detected as articles", "…as shopping", "…as podcasts", "…as documents", "…as code", "…as apps", "…as posts", "…as recipes". The Recently opened chips offer only All, Videos, Articles, Shopping.
- **Sign-in page decorative cards**: 15 sample link titles (e.g. "Lisbon in May: a long weekend", "Beginner sourdough, step by step", "Kyoto away from the crowds") with sample tags; decoration only, not data.

## 6. Observations

Facts only, no fixes. 6.0 lists the cross-area findings that matter most for the redesign; 6.1–6.7 hold every observation per area.

### 6.0 Cross-area summary

**Doc vs code**
- A plain click on a link opens the **preview**, not the site: Settings › Library › "Clicking a link" defaults to "Opens the preview". PROJECT.md stories 6 and 28 say a click opens the link in a new tab. The setting's hint ("On wide screens only. Smaller screens open the link.") is also wrong: below 80em the preview opens as a full-screen page.
- PROJECT.md story 23 puts "Export all links" in the account menu. It isn't there: export has five entry points (library toolbar / Options menu, sidebar "Data & help", Account › Your data, You list, Privacy and data). Only the Export dialog remembers the last export.
- The paste-many overflow note says "A bookmarks file goes to Import in Account › Your data". Import actually lives in the sidebar "Data & help" menu, the You list and Settings › Privacy and data.
- The Ask quota in `docs/ai/IMPLEMENTATION-AI-4.md` is 15 a day / 150 a month; the code allows 50 / 500. The docs describe a phone "Search · Ask" segment; the code gives Ask its own tab in place of Tags.
- The demo banner copy and the demo contents (41 links, 6 folders) differ from PROJECT.md story 21.
- The extension popup supports 7 languages; the mockup says 6.
- The code comment on the Language route says the page holds date format, clock, week start and spell-check; the page holds only the interface language, and the date and time settings are on Appearance › Dates and numbers. There is no spell-check setting.

**Same intent, different behaviour**
- Deleting one link is deferred until its Undo toast closes. Bulk delete is sent at once, and its Undo restores from Trash.
- Favoriting or pinning one link shows no toast; bulk favorite does.
- The top bar theme toggle only switches between Light and Dark, so one press drops a System or Custom theme.
- Search help says it looks through "tags and sites", but link search matches words only in title, note and URL.
- The folder limit (500) counts trashed folders in the API but only live folders in the web app. Near the limit, the user sees "Couldn't create the folder. Try again." instead of the limit message.
- A demo user at the 100-link cap gets the API message "Demo link limit reached". The web app only recognises "Link limit reached", so it shows the generic save error. The extension handles both.

**Reachable from only one place or platform**
- Keyboard shortcuts settings and Account have no row in the phone You list (Account is reached through the profile card; Shortcuts only by URL).
- The Pinned section can only be reordered by drag or Alt+arrows. The "Move up" / "Move down" strings exist but have no control.
- "Get the extension" and the extension banner show only on desktop Chromium from 64em.
- Tablets (40–64em, including iPad portrait) get the phone shell. There is no tablet-specific layout.
- `/recent` can still be reached by URL on the phone, where the Library tile opens a sheet instead.

**Dead ends and things that never reach the user**
- There is no "page not found" page and no top-level catch-all route.
- The offline banner promises that "saving and editing come back when you reconnect". Nothing is queued or disabled offline, so writes fail with their own error toasts.
- The Trash toast "Your library is full" can never appear: the API never answers 409 on restore.
- After a folder is deleted or restored, the Rules list is not refreshed and is not tab-synced.
- The MCP search tool returns no meaning matches, although search by meaning exists. The API's clean-up card for All links is not shown anywhere in the web app.
- "Sign in with your own account" in the demo signs the demo out and its data is lost. "Demo transfer" is designed, not built.
- Account deletion is immediate and permanent: no grace period, no restore.
- The privacy page shows the literal placeholder "[PROVIDER]".
- The JSON export option mentions "reminders", but the export file has no reminder field.
- About 13 en.json keys in the library area (and others listed per area, e.g. `import.entry.*`, `import.menu`) are never used.

**Designed, not built** (in `docs/design/screens/` but not in code)
- Email sign-in, sign-up, password reset, check-your-inbox screens and all transactional emails (the API is OAuth only, with no mailer).
- Search filters (`#tag`, `in:folder`, `site:`), plain-language dates, recent searches, "Save as view" from search.
- Reminder repeat, notifications, email reminders and a Settings › Notifications page.
- Account page profile editing, connecting and disconnecting sign-in methods, and a sessions list. The extra Privacy options (usage data, crash reports, public links).
- Most single-letter shortcuts from `SetShortcuts`. Only "?" respects "Use single-key shortcuts"; "M" and Space ignore it.
- The 64px sidebar rail while the link preview is open, the Site / Reader switch and "Read the copy" (#539), and Rediscover "Read later" (#396).
- In the extension: a right-click "Save link to Shelfmark" with a toast, the sliding folder picker, editing after save, and "Open in Shelfmark" highlighting the new card.
- Dragging a URL or text onto the web app to save it. There is also no keyboard shortcut that opens an empty Add link (⌘V in the library opens it with the pasted links).

### 6.1 Library, links and app shell

- Default of Settings › Library › "Clicking a link" is "Opens the preview" (`LIBRARY_SETTINGS_DEFAULT.clickAction = preview`), so a plain click on a card or row previews by default. PROJECT.md story 6 and story 28 still say "a click opens the link in a new tab".
- The "Clicking a link" option hint says "On wide screens only. Smaller screens open the link." (`settings.library.viewing.click.previewHint`), but `wantsPreview` and the code comment (#572) preview on every screen: below 80em as the pushed full-screen page.
- PROJECT.md story 23 says the account menu has an "Export all links" item; the account menu in code has no export item (export lives in the library toolbar/Options menu and the sidebar "Data & help" menu).
- PROJECT.md story 21 describes the demo banner as "You're in a demo · data resets in 24 h · Sign in to keep your links"; the code shows "You're in a demo." + "Play with everything — this sandbox resets in {{ hours }} hours." + "Sign in with your own account".
- The folder menu item is spelled "Color and icon…" in en.json while PROJECT.md story 26 says "Colour and icon…".
- `LinkPreview.dc.html` designs the sidebar folding into a 64px rail while the preview is open; no such rail exists in the shell code. The Site / Reader switch and "Read the copy" (#539) are designed and not built (the index says so).
- Rediscover "Read later" (#396) is designed and wired as an optional seam (`READ_LATER`), but nothing provides it, so the button never renders.
- The count line ("12 links", "50+ links") counts loaded links, not a server total; "All" saved-view chip shows the server total for the feed, so the two numbers can differ on the same page.
- Single-link delete is deferred (request sent when the Undo toast closes); bulk delete is immediate and its Undo restores through Trash. Same user intent, two different mechanisms.
- Single-link favorite and pin-to-sidebar have no success toast, while bulk favorite shows one.
- Unused en.json keys in this area (not referenced in non-test code): `shell.sidebar.tree`, `shell.sidebar.pinned.list`, `shell.sidebar.pinned.moveUp`, `shell.sidebar.pinned.moveDown`, `shell.sidebar.pinned.unpin`, `shell.searchHint`, `library.title`, `library.split.leftMenu.list`, `links.recent.removeTooltip`, `bulk.header.longPressHint`, `pins.pinFailed.detail`, `pins.unpinFailed.detail`, `pins.pinnedToTopFailed.detail` (the code passes the item name as detail instead).
- The Pinned section has i18n keys for "Move up" / "Move down" but no visible move buttons or menu; reordering is drag or Alt+arrows only.
- The offline banner promises "saving and editing come back when you reconnect", but no control is disabled offline and nothing is queued; writes simply fail with their own error toasts.
- The phone `/recent` page remains routable (e.g. via URL) although the phone Library tile opens the sheet instead.
- The Recently opened type chips are only All, Videos, Articles, Shopping, although links have ten kinds (Podcast, Document, Code, App, Post, Recipe, Other are not filterable there); the feed `?kind=` and saved views support all kinds.
- Side by side and the link preview never show together (opening the preview drops `split` and `related`); the "Side by side" button is hidden while the preview is open.
- Extension offer is rendered only on desktop Chromium at 64em+ and only when the store URL is configured; the Settings › Library extension row is in another area.
- The theme toggle in the top bar only switches between fixed Light and Dark: a user on System or Custom loses that preference after one press.
- `/admin` and `/settings` share the sidebar rule only for `/settings` (first URL segment `settings`); on `/admin` the regular sidebar shows.
- `shell.sidebar.footer` ("Help and trash") is the name of the tree holding only "Get the extension"; the Data & help and Trash trees have their own names.

### 6.2 Organise: folders, tags, rules, trash, reminders

- Folder limit: the API counts folders in Trash toward the 500 limit (`tx.folder.count({ where: { userId } })`), while the web's `atLimit` counts only live folders. A user with trashed folders can open the dialog and get the generic "Couldn't create the folder. Try again." instead of the limit message.
- The Trash toast "Couldn't restore" / "Your library is full. Delete something and try again." (TRASH_OUTCOME.Conflict) can't be reached: the API restore never answers 409, and the service comment says restoring cannot go over limits. PROJECT.md story 19 still says "If the library is full the answer is 'Couldn't restore'".
- The folder menu exists only on folder rows of the sidebar tree / phone Library tree. The folder page header, subfolder tiles and Pinned folder rows have no folder menu.
- The folder style menu item reads "Color and icon…" in en.json (US spelling), but code comments, PROJECT.md and the FolderStyle mockup say "Colour and icon…". The Menus mockup's folder menu has 5 items (New subfolder, Add link here, Rename, Move to…, Delete folder…), FolderStyle's has 7, and the code has 8 (it adds "Add link here" and a different order).
- Menus.dc.html shows folder rename done in place in the sidebar ("Rename in place (sidebar)… empty or duplicate names show an inline error"). The code uses a dialog, and duplicate folder names are allowed (no uniqueness check in the API).
- FolderStyle.dc.html says "Subfolders sort by name", but the code orders subfolder tiles by manual position (#314), then name.
- PROJECT.md story 26 says the icon set has 57 icons; the code has 63 (`FOLDER_ICON`, comment "63 = nine rows of seven").
- DeleteFolder.dc.html describes "Delete links too" as "This can't be undone"; the code says "They wait in Trash with the folder" (links go to Trash and can be restored).
- Reminders.dc.html shows a "Repeat" field ("Never"), recurring reminders ("every year"), Upcoming/Overdue/Done tabs with "Change" per row, a toast "Reminder: …" with Open/Snooze when a reminder comes due while the app is open, browser notifications and email. SetNotifications.dc.html shows a full "Notifications and reminders" settings page (browser notifications, email, default time, quiet hours, weekly digest). None of this is built: no repeat, no notifications page/route, no push/email; a reminder that comes due while the app is open only shows at the next app open; the default time is fixed at 9:00. The page footer says so ("They are not sent by email or notification.").
- PROJECT.md line 40 says "Reminders (#275) moved to the backlog as a whole", but story 32 and the code implement reminders v1 in the app.
- Tags have no colours anywhere (contracts `TagResponse` has no colour field; no UI), although the task brief mentions tag colours. Tag link counts show only in the tag menu summary and in suggestion lists, not on the chips.
- Deleting a tag is permanent (no Trash entry); deleting a rule is permanent after its Undo window.
- `RulesStore.refresh()` exists ("a folder was deleted or restored") but nothing calls it. After a folder is deleted or restored in the session, the Rules list keeps the old `folderAvailable` state until reload. Rules are also not covered by tab sync (folders, tags, Trash and reminders are).
- Rules do not appear in any phone-specific place: they're only in Settings › Library, and in the rule chip of save forms.
- The sidebar component comments mention a "phone drawer" with its own menus, but the app shell renders the sidebar only from 64em; below that, folders live on the `/library` page. No drawer exists in the code.
- The sidebar Tags section's code doc and the Tags.dc mockup agree (8 most used, "+ N more"). The phone Tags page uses the same split, so on a phone only 8 tags show until "+ N more" is pressed.
- `ReminderNoticeService` keeps the "last announced due time" per device, so the same due reminder can be announced again on another device.
- Folder description and cover show on the folder page only outside split / preview-split views; the sidebar shows the description only as a hover tooltip, so it can't be seen on touch.
- Delete folder has no Undo toast (unlike link delete); recovery is only through Trash.
- The "Inside" select of the New folder dialog lists all folders. The title updates to "New folder in “{parent}”" when a parent is chosen, also for a top-level create.
- The Trash count in the sidebar ignores "Show folder counts", and the Reminders due count also always shows (by design per code comments).
- Phone tablet portrait (40–64em) gets the phone pages (`/library`, `/tags`, back buttons, swipe rows), because the switch uses the 64em `compact` breakpoint, not 40em.

### 6.3 Search and AI

- Search query syntax is designed, not built: `MobileSearch.dc.html` shows "Ways to search" with `#angular` (tag), `in:Recipes` (folder), `site:youtube.com` and natural-language dates ("coat from last week"); `Search.dc.html` shows "Searching for coat · saved Last 7 days · in all folders", an "Also older" group and "Actions: Save “Coats” as a view". The code only does plain AND word matching on title, note and URL.
- Recent searches are designed, not built: `MobileSearch.dc.html` shows recent query chips and the placeholder "Search, or describe it"; the code has no recent searches, and the placeholder is "Search links, folders and tags".
- The search hint and no-results copy say search looks through "titles, notes, tags and sites", but the word search API matches title, note and URL only; tags appear only as tag rows (by tag name), not as link matches.
- The AiSearch mockup gives the Ask row a sub-line "An answer from your links, with sources" and a ⌘↵ shortcut; in code the row is a plain row chosen with Enter (Ctrl/⌘+Enter on it behaves the same).
- `docs/ai/IMPLEMENTATION-AI-4.md` (10.1, 11) and PROJECT.md line 606 describe a phone "Search · Ask segment"; the code has no segment: Ask is its own tab that replaces Tags while Ask is on (#499), and Tags move into Library.
- Ask limits disagree across docs: IMPLEMENTATION-AI-4 says AI pack 15/day and 150/month; `AI_QUOTA` and FEATURES.md say 50/day and 500/month.
- Related links moved from Edit link to the link preview (#572); FEATURES.md F7, IMPLEMENTATION-AI-3 and PROJECT.md status still describe "Related on your shelf in Edit link". The key `ai.related.title` is now the popover heading.
- The MCP `search_links` tool still uses the `NoMeaningSearch` seam (returns no meaning matches) although search by meaning (AI-3) exists; the `match: 'meaning'` value is never produced.
- MCP availability: FEATURES.md F6 says Pro; the code checks Pro (plan or full-access email) and not demo. Free accounts see the section with a notice; the how-to toggle reads "Claude, Cursor, VS Code" whereas the AiConnect mockup says "Claude, ChatGPT, others" and shows "34 searches this week" (code: "calls this week").
- The privacy page paragraph on connected assistants was listed as not done in IMPLEMENTATION-AI-6 (not verified in this area).
- Clean-up entry card on All links: the API has `GET /api/cleanup/summary` and `POST /api/cleanup/card/dismiss`, and the web API client has `getSummary` / `dismissCard`, but nothing in the web app calls them (the AiCleanup mockup notes the card was removed in #512). Dead links group is designed (AiCleanup state 1) but not built (depends on #397); empty state copy drops "We’ll check again next month".
- `AI_SETTINGS_DEFAULT` sets `meaningSearch: true`; the API turns it off only for settings rows that existed before AI-3, so behaviour depends on row age.
- Existing AI summaries keep showing on cards with the spark when AI is turned off; only Delete AI data removes them.
- Tidy load failures show the "Nothing to tidy" empty state (no error), by design; clean-up load failures show a danger notice instead (two patterns).
- The Settings › AI "Delete AI data" hint says it turns search by meaning off, and the code also deletes the clean-up report and job rows, which the copy does not mention.
- The AI intro says "Anthropic processes it for us and deletes it within 30 days"; search by meaning names Voyage AI separately; the "What is sent" point lists address, title, description and page text but not tag/folder names, which the job also sends.
- AiSettings mockup shows "Process 212 links … in about an hour; uses 212 of your links"; code says "Start" and states the separate allowance only in the intro.
- Settings › AI mockup lists a "Notifications and reminders" and "Import and export" nav entry; the code nav has neither (AI sits between Library and Language).
- `ai.ask.historyTrimmed` and the starters are computed only in the browser; the allowance line uses the closer of day/month limits, so Free users see "questions left this month".
- The Ask header button and panel exist only from 64em; on 64–80em "Open side by side" is not offered in Ask (needs 80em).
- Keys present but used only as parts of other strings or tooltips: `ai.fill.keys.*` (shortcut caps), `ai.summary.counter`, `ai.suggest.new`. `ai.related.show` lives in link card/row menus (links area).
- `AI_QUOTA` comment says Free `questionsPerDay` 5 and `questionsPerMonth` 5; in effect Free users have 5 questions a month, and the saved-view phrase also spends one of them.
- MCP counts every authenticated POST (initialize, ping, tools/list) toward the 2,000 daily cap, while the UI calls it "calls this week".

### 6.4 Capture, import, export and sharing

- No drag and drop of a URL or text onto the app exists: the only drop target in this area is the import dialog (files). `dataTransfer` is used only by the import file drag and the feedback screenshot drop. The en.json group `links.drag` belongs to dragging saved links onto folders (other area), not to capture.
- No keyboard shortcut opens an empty Add link dialog; the only capture keys are ⌘V in the library and the in-dialog keys.
- Paste-many overflow copy says "A bookmarks file goes to Import in Account › Your data.", but Account › Your data has only export rows; import lives in the sidebar "Data & help" menu, the You tab and Settings › Privacy and data. Code comments also disagree (`ImportDialogService`: "Opens "Import links" from Account › Your data"; `RecentImportsStore`: "Recent imports of Account › Your data"), while Recent imports actually render in import step 1.
- en.json keys with no use in code: `import.entry.title`, `import.entry.description`, `import.entry.action`, `import.menu` ("Import links…"), `import.recent.source.browser`. The import is not reachable from onboarding or empty states although the task brief and the `import.entry` keys suggest such an entry.
- Export is reachable from five places with different behaviour: the Export dialog (remembers "Last export", toast "File saved", Cancel aborts), the library Export menu and phone Options menu (view or everything, immediate download, no "last export" memory, no success toast), Account › Your data (immediate whole-library download, no success toast), Settings › Privacy and data and the You tab (open the dialog).
- The JSON format description says "Everything: links, folders, tags, notes, reminders", but the JSON export contains no reminder field (`ExportLink` has url, title, kind, note, isFavorite, folderPath, tags, lastOpenedAt, createdAt, updatedAt) and no summaries; it does include domain rules.
- PROJECT.md story 23 promises an "Export all links" item in the account menu; the account menu has none. PROJECT.md route table still describes `/settings/import-export` as "(export only)" and `/privacy` as having "the link to Export", while code redirects `/settings/import-export` to Account › Your data and Privacy and data has an "Import and export" section with two "Open" buttons. PROJECT.md 6.x API text says `format=json|html` and "there is no import yet"; code has CSV and the import.
- Demo accounts at their 100-link cap get a 409 with "Demo link limit reached"; the web maps only "Link limit reached" to the limit message, so the single-save dialog shows the generic "Couldn't save the link. Try again." for demo users (paste many reads the "fits" number instead).
- The Share target page uses no idempotency key, has no tags field (only rule tags) and sends no preview hints (favicon, image, kind), unlike Add link. Its Folder select does not apply the account's folder colours (`buildFolderOptions` without `shownColour`), unlike Add link and paste many.
- Mockup vs code (designed, not built): AddLink shows non-AI tag suggestions "Suggested from your other youtube.com links:"; ShareTarget shows folder chips ("Clothes | Unsorted | Work | More…", "Recent folders come first") and "After saving you're back in your app" while code has a select and "After saving you land in your library."; Share shows invites, roles ("Can view", "Can add links", "Owner"), "Allow copying to their shelf" and "Shared with me" in the sidebar; PublicCollection shows "Save to my shelf" and "Report this collection"; Import / SetImport show Pocket, Raindrop.io, CSV file and Shelfmark backup sources and a "Keep the folder structure" checkbox (code: one source, "Folders inside" radios); SetImport shows a Settings › Import and export page (code: no such page).
- ImportExport mockup states ".html, up to 10 MB and 10 000 links"; code allows 50 MB.
- The import source picker (radio group) is wired but hidden because only one source exists (`IMPORT_SOURCES` has Browser only; contracts comment says Pocket, Raindrop.io, backup and plain URL list "are added here later").
- Import done summary mockup mentions "4 broken links kept with their address as the title"; code reports "{{count}} could not be saved." for failed batches and counts non-web links as skipped.
- `ExportDialogService` and `ImportDialogService` do nothing (silently) when another dialog is already open.
- The Add link dialog cannot be guarded: Esc, scrim and × close it while a save runs; the save still completes and the toast appears afterwards.
- The e2e build adds a `/__e2e/add-link` route that only opens the dialog.

### 6.5 Settings, account, feedback and admin

- The You list shows only sections marked `phone: true`: Account (reached only through the account card) and Keyboard shortcuts have no row; `/settings/shortcuts` is reachable on compact screens only by URL.
- The You list (`settingsIndexGuard`, `compact`) applies below 64em, so tablets in portrait get the phone list, not only phones below 40em.
- Admin pages reuse the settings page header: on compact screens their back control says "You" and leads to `/settings`, while on desktop `/admin/*` shows the normal library sidebar, not the settings nav.
- Account deletion is immediate and permanent (`DELETE /api/me` deletes the user row in one transaction); there is no grace period or restore. Demo accounts cannot delete (section hidden).
- The Account page has no profile editing, no connect/disconnect of sign-in methods and no list of sessions / "Sign out everywhere else"; the `SetAccount.dc.html` mockup draws photo upload, name/email change, email-and-password, connect/disconnect and "Where you’re signed in". Designed, not built.
- `SetNotifications.dc.html` (Settings › Notifications and reminders: browser notifications, email, default time, quiet hours, weekly digest, product news) is designed, not built; mockups also list "Import and export" as a settings section, which in code is only a redirect to Account › Your data.
- `SetPrivacy.dc.html` draws usage-data and crash-report switches, public links management and "Load previews through Shelfmark"; none exist in code. The built page instead has Remember recently opened, Import/Export, AI text and What we keep.
- `SetShortcuts.dc.html` draws many single-letter shortcuts (N add link, G A / G U / G F / G R / G S navigation, E edit, F favorite, P pin, R remind, X select, ⌫ delete) and a "Show shortcuts in tooltips" switch; the code's list says it is "read from the code, not from the mockups" and none of those exist.
- The single-key shortcuts switch only gates "?"; the single-key "M" (move focused link) and Space keys are not affected by it, although the setting is labelled as a general single-key switch.
- Several working keys are not in the in-app shortcut list: rating digits/arrows, onboarding arrows, Enter to send in Ask, ArrowUp on the sidebar data row, resize-handle keys, Delete/Backspace on chips and own-colour swatches, Esc closing the split half.
- `SetLanguage.dc.html` and `Languages.dc.html` show date settings and "Spell-check notes" on the Language page; in code dates moved to Appearance and the spell-check setting was removed (spell-check always on in notes; a retired `spellcheck` key is dropped from stored data). The Settings › Language header still says "Date and time formats are in Appearance."
- PROJECT.md status entry lists six languages (no Ukrainian); code and the extension ship seven (`uk` added in #404).
- `SetFeedback.dc.html` has a "Ratings" block ("Ask me how I like Shelfmark", last score) and "Attach a screenshot"/"Something else" wording; code has no ratings block (PROJECT.md says it is out of the story), uses "Other", and allows up to three screenshots. The thank-you copy says replies are seen in Settings, while the mockup says "reply by email".
- Users cannot see their own screenshots in Your feedback (the API returns `screenshotUrls`, the page does not render them); the admin item shows them.
- `FEEDBACK_STATUS` comment says statuses are set "in the database until an admin page exists"; the admin page exists.
- The header light/dark toggle saves through the store but shows no toast on failure, unlike the Appearance page.
- Unused en.json keys in the settings group: `settings.data.export.label` ("Export your data") and `settings.appearance.title` ("Appearance").
- The You list's Import/Export rows fall back (no script) to `/settings/privacy`, whose comment calls them dialogs of the sidebar's data menu; the Account page comment says import lives in the sidebar data menu; so export has three entry points (Account › Your data direct downloads, Privacy and data dialog, sidebar data menu / You list dialog).
- `GET /api/me/settings` Swagger summary still reads "trash retention, folder colours, pause history" though it returns all settings.
- Week start hint says "Groups this week in Recently opened"; the mockup said "Used in the reminder calendar".
- Rating "Not now", Esc and scrim all record a skip, so a milestone dismissed once is never asked again; earlier unanswered milestones are skipped when a later one is reached.
- Library settings (view, sort, click action, etc.) are not cached in the browser, unlike appearance and language, so they show defaults until the settings load.

### 6.6 Browser extension

- The popup's language follows the browser, not the user's language setting in the web app; the theme follows the OS/browser scheme, not the app's theme setting.
- Mockup `Extension.dc.html` says the texts come "in the six app languages"; code ships seven (incl. Ukrainian / Portuguese). The store locale folder is `pt_BR` while the popup language file is `pt`.
- Mockup says "Open in Shelfmark opens the app on that folder with the new card highlighted"; code opens the folder page (or /unsorted) with no highlight parameter. For "Already saved" the mockup says Open in Shelfmark "opens the link in the app, where it can be edited"; code opens its folder page, not the link.
- Edit after save is not possible in the popup: the Saved screen only offers Open in Shelfmark and Done. The mockup's section heading comment "One click saves; the popup then refines the saved link" conflicts with the mockup's own note and the code ("Nothing is saved until Save").
- Right-click context menu save ("Save link to Shelfmark", "Save this page", with a toast) is designed (state 9, "Later, not in v1"), not built. No toolbar badge, no background worker, no omnibox or other commands besides opening the popup.
- Mockup: the folder picker "slides in from the right (200 ms ease-out) and back (120 ms ease-in)"; code uses the shared 120 ms fade for every screen change.
- Mockup state 1 shows a "↵" key hint on the Save button; code has no key hint.
- The mode switch count "All tabs (N)" before the permission is granted counts every tab in the window (including chrome:// and duplicates); after the list is built it changes to the number of saveable unique tabs. With fewer than 2 saveable tabs, All tabs silently falls back to This page.
- CLAUDE.md says the tabs permission is asked "once"; code asks again on every switch attempt until it is granted (a declined prompt leaves `permitted` false).
- Ctrl/⌘+Enter calls save directly and is not gated by the Save button's disabled state: it can save while Fill in with AI or Sort with AI is still running, or while the tab list is loading (the store only guards against a save already in progress and against 0 ticked tabs).
- A batch that does not fit the library cap is refused entirely (409 "Link limit reached: N more fit"), even for a demo account; the popup then shows the generic "Your library is full…" copy, never the demo copy, and does not use the "N more fit" information.
- In production, if `EXTENSION_ORIGINS` is not set, the popup can sign in and read but every save gets 403, which the popup shows as "Something went wrong on our side. Try again in a moment." with Try again.
- The sign-in strip's dates come from `Intl.RelativeTimeFormat` with numeric auto: the English popup shows "yesterday" (lower case) and "7 days ago"; the mockup shows "Yesterday" and "1 week ago".
- The preview thumbnail on Opening, Form and Error is always a blank accent tile (no page image); only Saved and Already saved show the real card image.
- Tab favicons are never shown (the popup CSP allows images only from the Shelfmark origin); rows use the host's first letter. The icon URL is still sent with the batch as a hint.
- The New folder name is silently cut at 100 characters; there is no visible counter or message. New folders are always created at the root.
- In All tabs, the Note field, the rule hint, recent-folder chips, the AI Suggested row and the AI marks on Folder/Tags are hidden; domain rules still apply server-side to tabs left without their own values (`applyRules`), but the form does not show which.
- From the "Already in your library" screen there is no mode switch; All tabs is reachable only after "Save a copy".
- Mockup `ExtensionInstall.dc.html` places "Get the extension" "above What's new" in the sidebar footer; code places it above the "Data & help" row. The mockup shows Alt / Shift / S as key caps in the banner text; code renders the plain string "Alt+Shift+S" inside the sentence.
- The web app cannot detect whether the extension is already installed; the banner, sidebar row and Settings row show to people who have it.
- The landing block shows on desktop Chromium even when the store URL is empty (`fits`), while the in-app entries require the URL (`offered`).
- The library banner is hidden while the split view or the preview split is open, and while selecting.
- Recent folders are stored in the extension's own `localStorage` (no storage permission needed); CLAUDE.md states "No `storage`", which refers to the permission.
- Lookup on open and per-tab lookups share the 30/min add-link rate budget with saves; when the per-tab checks hit a limit they stop silently and later tabs show no "Saved" mark.
- PROJECT.md's "Not in stage 1" line and the roadmap/backlog lines still list the browser extension as postponed, while the Status section and the adding-links section describe it as built and published (Status: store upload of extension 1.2.0 still left to do; the changelog says 1.2.0 is "rolling out").

### 6.7 Public pages, sign-in, demo and onboarding

- Email sign-in, sign-up, password reset, "Check your inbox", "Choose a new password" and "Link expired" screens are designed (`AuthEmail.dc.html`, `MobileAuth.dc.html`, `MobileAuthSignIn.dc.html`, `MobileAuthInbox.dc.html`, `MobileAuthReset.dc.html`) but not built: the API disables all email/password routes and PROJECT.md 5.4 says "No passwords, so no email verification, password reset or sending emails".
- `SignIn.dc.html` has a "Continue with email" button and "Look around in the demo first"; the built page has no email button and the demo button reads "Open the demo". `MobileSignIn.dc.html` has no demo button; the built phone page has one.
- `Emails.dc.html` designs three emails (Confirm your email, Reset password, Reminder email with "Remind me next week" and "Turn off reminder emails in Settings"); no email templates or mail sending exist in `apps/api` (no mailer dependency found).
- `SyncDemo.dc.html` designs a "demo transfer" dialog after the first real sign-in ("Bring your demo shelf with you?", counts of links/folders/tags, "Also keep the sample links that came with the demo", "Start empty", "Move 7 links", toast "7 links moved to your shelf", "The demo is deleted", "Show them"); not built. PROJECT.md 5.4 says carrying demo data over is in the backlog. The demo banner's "Sign in with your own account" just signs out the demo.
- `SyncDemo.dc.html` lock text adds "Unsaved changes in open forms are kept until you sign back in." and shows "Signed in again / Your changes were saved"; the built lock dialog has only the first two lines and no such follow-up.
- PROJECT.md story 20 describes a first screen with a live "Saved Messages" chat and a "Put them on the shelf" button; the built hero has a "Read later" folder preview with an All/Articles switch loop instead. `Landing.dc.html` shows the preview folder as "Clothes" with "To buy 6"; the code uses "Read later" with "Articles 6". `MobileLanding.dc.html` shows a Telegram/Saved Messages chat hero ("For everything you send to Saved Messages", "Telegram is where links go to be forgotten…"); not built — the phone gets the same hero as desktop.
- `Landing.dc.html` finale reads "Give your links a home" / "It takes one minute to start." / "Start your shelf" and footer "Made with Angular and NestJS"; the code finale is "Empty your Saved Messages." with "Open the demo" and "Sign in", and the footer has "What's new", "Privacy", "GitHub" and the language switcher.
- PROJECT.md story 21 says the demo has "~20 links, 5 folders" and the banner "You're in a demo · data resets in 24 h · Sign in to keep your links"; the seed has 41 links and 6 folders, and the banner copy is "You're in a demo. Play with everything — this sandbox resets in N hours." with "Sign in with your own account" (signing in does not keep demo links).
- `HowItWorks.dc.html` shows "Shelfmark in 60 seconds" (1:02, three chapters) and card meta "1 minute"; the code says "Shelfmark in 3 minutes", 7 chapters, "3 minutes".
- The route comment says signed-in people on `/about` see "Back to my shelf" and "What's new"; the "What's new" is a section under the hero (with "See all changes"), not a header button.
- Unused en.json keys found in this area: `landing.beforeAfter.pauseMotion` ("Pause animations"), `landing.after.treeLabel` ("Folders"), `landing.hero.preview.label` ("App preview"). The before/after scene pauses on hover/focus but has no pause button.
- The privacy text `privacy.ai.ask.text` still contains the literal placeholder "[PROVIDER]" (shown to users). The page comment says bracketed placeholders are filled in by the author.
- The demo link cap returns the API message "Demo link limit reached", but the web save-error mapping only matches "Link limit reached", so a demo user at 100 links sees the generic save failure rather than the limit message (`links.add.saveFailedLimit`).
- Demo users get the welcome dialog on every new demo (the demo user is created with an empty onboarding flag, also in the mock).
- A real (non-demo) signed-in user who opens `/demo` is sent to `/links`; no demo is created and nothing explains why.
- The sign-in logo is not a link back to the landing; there is no back link or language switcher on `/sign-in`.
- No in-app PWA install prompt and no offline page exist; PWA install relies on the browser UI.
- The How it works card is only in the desktop sidebar; phones and tablets (below 64em) reach the video only through the You list or the empty library.
- The account menu (with How it works, About, Sign out) exists only from 64em; below 64em the same entries live in the You list.
- `LANDING_LINKS.SignIn` still carries a `TODO(#66)` comment about switching to router navigation although the page already routes via `AppLinkDirective`.
- In local dev (mock APIs) Google/GitHub sign in instantly as fixed mock users ("Ada Lovelace", "Grace Hopper") with no provider page; demo failures can be simulated via a local storage key.

## 7. Counts

| What | Count | Notes |
| --- | --- | --- |
| Features | 334 | SHL/LIB/LNK 79 · ORG/TAG/RUL/TRS/REM 65 · SRC/AI/MCP 39 · CAP/IMP/EXP/SHR 40 · SET/ACC/FBK/ADM/KEY 47 · EXT 28 · PUB/AUTH/ONB 36 |
| Screens (screen catalogue entries) | 174 | pages, dialogs, menus, panels, popover and popup views, in [`screens.md`](screens.md) |
| Routes | 33 | user-facing paths in the route map (plus 2 e2e-only test routes and the extension popup) |
| Dialogs | 53 | plus 1 browser permission prompt in the extension; below 40em every dialog opens as a bottom sheet |
| Menus | 24 | card / link menu, folder menu, account menu, Data & help, bulk bar, Options, tag menu, … |
| Separate sheets | 1 | Recently opened on the phone (other sheets are dialogs shown as sheets) |
| Form fields | 143 | across all screens |
| Settings | 34 | on settings pages (26 outside AI, 8 in Settings › AI); table 5.1 has 94 rows including in-dialog options, per-device remembered state and the same setting seen from several areas |
| Keyboard shortcuts | 35 | on the Shortcuts list (settings area); table 5.2 has 103 rows including context keys and extension keys |
| Toasts | 156 | rows in 5.3 |
| Empty states | 68 | rows in 5.4 |
| Error messages | 171 | rows in 5.5 |
| Confirmation dialogs | 26 | rows in 5.6 |
| Limits and quotas | 172 | rows in 5.7 |
| AI features | 39 | SRC/AI/MCP features; 43 rows in 5.8 |
| Interface languages | 7 | English, French, German, Italian, Spanish, Portuguese (Brazil), Ukrainian |
