# Step 2: flows and new structure (proposal)

Status: **approved by the author** (answers in [section 7](#7-decisions-for-the-author)). Where a table row in section 6 disagrees with section 7, section 7 wins. Built on the inventory in [`features.md`](features.md) and [`screens.md`](screens.md) (feature IDs such as `LIB-29` point there) and on the behaviour skills (page-patterns, surfaces, forms, defaults, empty-states, errors, keyboard, verbs). Current design rules are not a constraint ([README](README.md)).

## 1. What Shelfmark is for

The author built it for one problem: links saved "somewhere" were forgotten or could not be found again. So the product does three jobs, in this order:

1. **Save** anything in one move, from wherever the link is.
2. **Find** it again in seconds, even without remembering where it went.
3. **Come back** to it before it is forgotten.

Organising (folders, tags, rules) supports these jobs; it is never required. A person who never makes a folder must still find everything and still be reminded of what they saved.

**AI is a quiet helper inside the three jobs**, never a destination: it files new links (save), understands meaning and answers questions inside search (find), and writes short summaries and picks forgotten links (come back). Everything works without AI. When Free / Pro limits arrive, they show as one quiet line in the same places; no navigation changes.

## 2. Principles

| # | Principle | Source |
| --- | --- | --- |
| P1 | **One home per feature.** Each feature has one place; other places may link to it, never re-implement it (today export has 5 entry points with 3 behaviours). | consistency |
| P2 | **Lightest surface.** One field: edit in place. Under 10 s and a few fields: slide-over from the right. Longer or multi-step: its own page with a URL. Never a dialog on a dialog. | surfaces |
| P3 | **One pattern per page.** Every page is one of: List, Detail, Form, Settings, Inbox, Split pane. View modes (masonry, grid, list, headlines) are one page with a toggle. | page-patterns |
| P4 | **Same intent, same behaviour.** One delete model, one toast policy, one way to undo, everywhere. | consistency |
| P5 | **Defaults do the work.** A new link lands in the right place by itself (rules, then AI); organising is a correction, not a chore. | defaults |
| P6 | **Every size gets a real layout.** Phone, tablet and desktop each get their own; a tablet is not a big phone. | viewports |
| P7 | **Don't promise what isn't there.** No copy for unbuilt behaviour; designed-not-built items stay out of the UI until built. | errors, honesty |
| P8 | **Destructive actions name the thing** and confirm with a destructive verb, Cancel focused; where an Undo exists, prefer Undo over a confirmation. | surfaces |

## 3. What is wrong today, by job

### Save
- Four save paths behave differently: Add link dialog, paste many, Android share page (no tags, no idempotency, no folder colours, CAP-16), extension (no edit after save, EXT-12).
- No shortcut opens an empty Add link; no drag of a URL onto the app (designed, not built).
- Add link is a large modal; while it saves it can be closed and the result appears later (6.4).
- Rules, AI suggestions, AI automatic mode, "New links go to" and "Fill in with AI" all decide the folder; the order is not visible to the person.

### Find
- Search promises tags and sites, but matches only title, note and URL (SRC-02, 6.3).
- No filters (tag, folder, type, date) and no recent searches in search; filters exist only as URL chips in the feed (LIB-08).
- Ask is a separate tab on phones (replacing Tags) and a separate panel on desktop, but also a row inside search: three doors to one feature (AI-10, SRC-08).
- Saved views, sort, view, per-feed memory, active filter row and the type chips overlap as ways to narrow the feed.

### Come back
- Three separate places: Reminders page (REM-05), Recently opened page / phone sheet (LIB-27, LIB-28), Forgotten view hidden behind a switch inside Recently opened (LIB-29).
- Reminders only appear at the next app open (no notification), with a fixed 9:00 time.
- Clicking a link opens the in-app preview by default, against the stories and the setting's own hint (6.0).

### Organise
- Rename is a dialog for folders, inline for tags, a dialog for views (three patterns for one action).
- Delete: one link is deferred with Undo, bulk delete is immediate with Undo from Trash, folder delete has no Undo, tag delete is permanent (6.2).
- Pinned (folders and links), Favorites, Pin to top of folder and folder highlight are four ways to say "this matters".
- Folder style has eight options (colour, own colours, icon, emoji, description, highlight, cover); most are decoration.
- Tidy (AI-11) and Library clean-up (AI-17) are two review pages for the same idea, in two places (Unsorted, Settings).

### Everywhere
- Tablets get the phone shell (SHL-20).
- Settings are split oddly: dates in Appearance, import in Privacy, export in Account, shortcuts unreachable on phones (6.5).
- Help is spread over a sidebar card, an account menu, a Data & help menu and the You list (PUB-14..16).
- Account deletion is instant and permanent; the offline banner promises queued saves that don't exist; there is no 404 page.

## 4. New structure

### 4.1 Navigation

```
Desktop (from 64em)                 Tablet (40–64em)              Phone (< 40em)
┌──────────────────────────┐        icon rail + top bar           bottom tab bar
│ [Search ⌘K]       [+ Add]│        (same sections as desktop)    Library · Revisit · [+] · Search · You
│ Library                  │
│   All links              │
│   Unsorted          17   │
│   Favorites              │
│ Pinned                   │
│   …folders and links     │
│ Revisit              3   │        3 = due + new forgotten
│ Folders            [+]   │
│   …tree                  │
│ Tags                     │
│   …top 8, Show all       │
│ ─────────────            │
│ Trash                    │
│ [avatar] menu: Settings, │
│   Help, What's new,      │
│   Keyboard shortcuts,    │
│   Sign out               │
└──────────────────────────┘
```

- **Library** keeps the scopes All links, Unsorted, Favorites, and each folder; tags filter it.
- **Revisit** is new: one page for coming back (see 4.2).
- **Pinned stays** for quick access to folders and links; Favorites is a mark to filter by; Pin to top of folder orders one folder (D3).
- **Search** is one place for words, meaning and Ask (see 5.2). No Ask tab, no Ask panel.
- **Help** (How it works, What's new, Send feedback, Privacy) lives in the avatar menu on desktop and in You on phones. The sidebar card and the Data & help menu go away.
- **Header** keeps only search, Add link and the avatar. The theme toggle and the shortcuts button move to the avatar menu.

### 4.2 Pages and their patterns

| Page | Route | Pattern | Contents |
| --- | --- | --- | --- |
| Library | `/links`, `/unsorted`, `/favorites`, `/folders/:id` | List (+ view toggle) | Title, count, one Filter control (type, tag, date, folder), saved views, view toggle (Masonry, Grid, List, Headlines), feed |
| Link | `?link=<id>` over the list | Split pane on desktop, pushed page on phone | The page itself with a **Site / Reader** switch (5.7), details (title, note, folder, tags, reminder, summary), related links. Replaces the edit dialog and the preview as two things |
| Revisit | `/revisit` | Inbox | One time-ordered queue: Due reminders, then "Forgotten this week", then Recently opened. Row actions: Open, Done, Snooze, Not interested |
| Search results | `/search?q=` | List | Full results page (words, meaning, folders, tags), filters, "Save as view"; the ⌘K panel is its quick version |
| Ask | inside search | (part of Search) | The answer opens in the search panel or results page, with its sources |
| Tidy up | `/tidy` | Inbox | One review queue: suggested folders and tags for Unsorted, duplicates, similar tags. Replaces Tidy and Library clean-up |
| Trash | `/trash` | List | As today, one delete model |
| Import | `/import` | Form (steps) | Its own page with a URL instead of a dialog (multi-step, P2) |
| Settings | `/settings/*` | Settings | Account · Appearance · Library · AI · Language and region · Your data |
| Public collection | `/c/:token` | List (read only) | As today |
| Sign-in, demo | `/sign-in`, `/demo` | Form (auth) | As today |
| Not found | `**` | (empty state) | New: "This page doesn't exist" with a way back |

### 4.3 Surfaces for actions

| Action | Today | Proposed surface |
| --- | --- | --- |
| Add link | Large modal | Compact panel: one address field and Save; details below it, optional |
| Edit link | Modal | Details side of the Link page (fields edit in place) |
| Rename folder, tag, view | Dialog / inline / dialog | One small dialog, everywhere (author decision: a click on a folder must always open it, never start editing) |
| Folder colour and icon | Dialog with 8 options | Small popover: colour and icon only |
| Move to folder, Remind me | Dialog | Popover picker anchored to the control |
| New folder | Dialog | Small dialog: name and Inside (top level or a folder) |
| Rules | Dialog in Settings | Slide-over from Settings › Library and from the link's menu |
| Import | Multi-step dialog | Page `/import` |
| Delete (link, folder, tag, view, rule) | Four mechanisms | One: it disappears at once, Undo toast for 8 s, then Trash for links and folders; tags and views come back through Undo only |
| Delete forever, Empty trash, Delete account | Confirmation | Named confirmation (P8); account deletion gets a 7-day grace period (D9) |

## 5. Key flows, before and after

### 5.1 Save a link (web)

Before: Add link (header or ⌘V in the library) → modal with Link, Title, Folder, Tags, Note, AI rows, rule chip, duplicate notice → Create link → toast.

After:
1. **Anywhere in the app**: paste (⌘V outside a field), drop a URL or text, press **N**, or press Add.
2. A compact panel shows the address and the preview as it loads. The folder is already chosen (rule → AI → "New links go to"), shown as one line: "Goes to Recipes · because of the rule for seriouseats.com" with Change.
3. **Save** (Enter). The card lands in the feed; the toast says where it went with **Change** and **Undo**.
4. Title, tags, note and reminder are optional, under "Add details", or later on the Link page.

Same panel in the extension, the share target and paste many (one component, one behaviour). Duplicate: the panel says "Already saved in Clothes, 3 weeks ago" with Open and Save anyway.

### 5.2 Find a link

Before: four ways to open search, word matching on three fields, folders and tags as extra rows, meaning matches below, an Ask row that opens another surface; filters only as URL parameters in the feed.

After:
1. ⌘K or the search field (Search tab on phones). Recent searches show before typing.
2. Typing shows, in one list: links by words (title, note, address, **tags, site, folder**), then "Close in meaning", then folders and tags.
3. Filter chips under the field: type, folder, tag, saved date ("last week"), favorites. Writing `#angular` or `site:youtube.com` sets the same chips.
4. The last row is **Ask "…"** (with AI on): the answer appears in the same panel with its sources; follow-up questions continue there. Enter on a link opens the Link page.
5. "See all results" opens `/search?q=` with the same filters and **Save as view**.

### 5.3 Come back

Before: Reminders page, Recently opened page or phone sheet, Forgotten behind a switch; reminders show only at the next app open.

After:
1. The **Revisit** item shows a count (due reminders plus this week's forgotten links).
2. Revisit is one queue: **Due** (with Done, Snooze), **Forgotten this week** (3–5 old links, with Open, Keep for later, Not interested), **Recently opened** (last 30 days, with Pause history in its menu).
3. "Remind me" is one popover on any link: Later today, Tomorrow, This weekend, Next week, Pick a date; the time follows the person's default (Settings › Library) instead of a fixed 9:00.
4. Later (D8): browser notifications for due reminders and a weekly "From your shelf" email.

### 5.4 Open a link

Decided (D13, confirmed again after the first design): keep today's behaviour. A click opens the Link page showing the site preview; the details panel stays hidden until the person presses Details; Settings › Library › "Clicking a link" switches it to opening the site in a new tab. Fix the setting's hint, which says the preview works on wide screens only (it works on every screen: below 80em as a full page). On the Link page, articles can be read in Reader mode (5.7).

### 5.5 Organise

- Everything that names a thing renames through the same small dialog (folder, tag, view, and a link's title from its ⋯ menu), opened from its menu or F2; a click always opens the thing.
- On phones there is no search field at the top: the Search tab opens search full screen, and a found link opens its preview like anywhere else; Back returns to the results.
- Folder look: colour and icon only (cover, highlight, description, own colours and emoji go, D4).
- Drag links onto folders stays; a new "Move" popover replaces the move dialog; bulk actions keep one bar.
- After the person files three links from one site into one folder, a toast offers a rule ("Always put youtube.com in Videos?") for everyone, not only with AI on; AI only improves the guess.
- Tidy up collects everything that needs a decision (unsorted suggestions, duplicates, similar tags) in one queue.

### 5.6 Import and export

- **Import**: one page `/import`, reached from Settings › Your data, the empty library and the avatar menu's Help. Sources: browser bookmarks now; Pocket and Raindrop files later (D10).
- **Export**: one dialog. Entry points: Settings › Your data, and "Export this view" in the library's More menu (which opens the same dialog with the view preselected). The other three entry points go.

### 5.7 Read a link (Reader mode)

Designed earlier and not built (#539, "Site / Reader switch" and "Read the copy"). Proposed as part of the Link page:

1. The Link page header has a **Site | Reader** switch next to "Open in browser", shown when the link is an article or a document (link kind) and a readable text could be extracted. Videos keep their embedded player; products and other pages show only Site.
2. **Reader** shows the article as clean text: title, site, author and date when known, reading time, and the AI summary on top (with AI on). Headings, paragraphs, lists, quotes, code, images with captions. Links inside the text open in a new tab.
3. **Reading settings** in a small popover: text size, font (sans, serif, readable), line width, theme (follows the app, or sepia). Kept per account.
4. **When a site refuses to show inside the app** (today an empty "can't show this site" state, LIB-26), the Link page opens in Reader when a text is available, instead of a dead end.
5. **Progress** is kept per link; Revisit gets a "Continue reading" group for articles started and not finished.
6. Which mode opens: the last one the person used for that site; first time, Site (D14).
7. Later: **Read the copy** (a saved copy of the text, so the article survives when the page changes or disappears) and highlights (D15).

Implementation limits to plan for: the text is extracted on the server (readability-style parser behind the existing SSRF-safe fetcher) and sent as typed blocks (heading, paragraph, list, quote, code, image), never as HTML, so the app renders it with components and no `innerHTML`; images go through the image proxy (#57); extraction can fail quietly (the switch then stays on Site with a muted line "Reader isn't available for this page").

## 6. Feature decisions

Legend: **Keep** as is · **Change** behaviour or surface · **Merge** into another feature · **Move** to another place · **Cut** remove · **Later** not now, keep out of the UI · **Fix** a bug or a broken promise.

### 6.1 Shell and library

| Features | Decision | Notes |
| --- | --- | --- |
| SHL-01, SHL-02, SHL-04, SHL-05 | Change | New sidebar (4.1); Revisit row; tablet rail |
| SHL-03, LNK-11, ORG-14 Pinned section | Keep (D3) | Quick access to folders and links |
| SHL-06 collapsible sections | Keep | |
| SHL-07 footer, PUB-16 sidebar card | Cut / Move | Help items to the avatar menu; Trash stays |
| SHL-08 top bar | Change | Search, Add, avatar only |
| SHL-09 account menu | Change | Adds Help, What's new, Keyboard shortcuts, Theme |
| SHL-10 phone tab bar | Change | Library, Revisit, Add, Search, You |
| SHL-11, AUTH-09 demo banner | Keep | Neutral strip |
| SHL-12, PUB-20 offline banner | Fix | Say what really happens ("Changes can't be saved while you're offline") or queue writes (D11) |
| SHL-14, SHL-15 toasts, undo | Change | One policy: every change shows a toast with Undo where possible; no toast for selection-only changes |
| SHL-20 breakpoints | Change | Tablet gets the rail layout |
| SET-11 header theme toggle | Move | To the avatar menu, with System / Light / Dark |
| SHL-26, KEY-* shortcuts | Change | Reachable from the avatar menu and You; single-letter shortcuts N (add), / (search), F (favorite), E (details), R (remind), M (move), ⌫ (delete) behind the existing switch |
| LIB-01..LIB-04 feed, header, count, subfolders | Keep | One count source (server total) |
| LIB-05 view | Change | Masonry, Grid, List, Headlines |
| LIB-06, LIB-07 sort, per-feed memory | Keep | |
| LIB-08 active filter row | Merge | Into the one Filter control |
| LIB-09..LIB-11 saved views | Change | Rename in the shared dialog; reorder by drag; created from search and filters |
| LIB-14..LIB-21 selection and bulk | Change | One delete model; toasts as P4 |
| LIB-22, LIB-23 side by side | Keep (D5) | Two feeds side by side for filing; Show related stays |
| LIB-24..LIB-26 preview | Merge | Into the Link page (preview + details); the blocked state falls back to Reader |
| (new, #539) Reader mode | Add | Site / Reader switch on the Link page (5.7) |
| LIB-27, LIB-28, LIB-29, LIB-34 recent, forgotten | Merge | Into Revisit |
| LIB-30 phone Library tab | Change | Scopes, folders, tags on one page |
| LIB-31, EXP-02 library export menu | Merge | "Export this view" in the More menu opens the one Export dialog |
| LIB-32, CAP-13 paste | Change | Works on every page, not only the library |
| LIB-35 Tidy entry | Change | Tidy up page with a count in Unsorted |
| LNK-01, LNK-02 card, row | Change | Prototype card: cover, title, site; star only when favorite; actions on hover |
| LNK-03 link menu | Change | Shorter: Open, Details, Favorite, Move, Remind me, Copy link, Delete |
| LNK-04 open | Keep (D13) | Click opens the preview by default, as today; the setting changes it; fix the setting's hint |
| LNK-06, CAP-15 edit dialog | Merge | Into the Link page details |
| LNK-07 delete | Change | One delete model |
| LNK-08 move | Change | Popover picker |
| LNK-10 pin to top of folder | Keep (D3) | Order inside one folder |
| LNK-12..LNK-14, LNK-18 tags, folder chip, reminder chip, summary on cards | Change | Shown in List and Headlines; cards keep cover, title, site, star |
| LNK-15, RUL-06 rule from a link | Keep | Opens the rule slide-over |

### 6.2 Organise

| Features | Decision | Notes |
| --- | --- | --- |
| ORG-01..ORG-03 tree, new folder, subfolder | Change | New folder in a small dialog with name and Inside |
| ORG-04 rename | Change | Shared rename dialog |
| ORG-05, ORG-06 move, reorder | Keep | Drag and Alt+arrows; Move popover |
| ORG-07 folder menu | Change | Also on the folder page header and tiles |
| ORG-08, ORG-09 colour, icon | Change | Popover; 8 colours, icon set; own colours and emoji cut (D4) |
| ORG-10, ORG-11, ORG-12 description, highlight, cover | Cut (D4) | Decoration without a job; description could return as the folder's first note |
| ORG-13 delete folder | Change | One delete model (Undo, then Trash) |
| ORG-15, ORG-16 header, subfolders | Keep | |
| ORG-17 add link here | Keep | |
| TAG-01..TAG-03 tags list, create, show | Keep | Top 8 and Show all |
| TAG-04 rename in place | Change | Shared rename dialog |
| TAG-05 merge | Move | Into Tidy up (similar tags) and the tag menu |
| TAG-06 delete | Change | Undo toast |
| TAG-09, TAG-10 phone tags | Merge | Into the phone Library page |
| RUL-01..RUL-11 rules | Change | Slide-over editor; rule offer for everyone (5.5) |
| TRS-01..TRS-11 trash | Keep | Fix the unreachable "library is full" toast |
| REM-01..REM-04 remind me | Change | Popover; default time setting |
| REM-05..REM-09 reminders page, done, snooze, chip, count | Merge | Into Revisit |
| REM-10 due toast on open | Keep | Until notifications exist (D8) |

### 6.3 Search and AI

| Features | Decision | Notes |
| --- | --- | --- |
| SRC-01..SRC-07 search | Change | One panel + results page; tags, site and folder in word search; filter chips; recent searches |
| SRC-08, AI-10 Ask | Merge | Into search (5.2); no Ask tab or panel |
| SRC-09 process older links note | Move | To Settings › AI only |
| AI-01, AI-02, AI-03 switch, intro, announcement | Merge | One short intro when turned on; the announcement becomes a single line in Settings and the empty search (no dialog) |
| AI-04..AI-07 suggestions, automatic, fill in, summaries | Change | One "Goes to …" line at save; Fill in with AI stays in Suggest mode, hidden in Automatic mode (D6) |
| AI-08 meaning search | Keep | Inside search |
| AI-09 related | Move | To the Link page |
| AI-11, AI-17 Tidy, clean-up | Merge | Tidy up page |
| AI-12..AI-16 backfill, usage, delete data, what is sent, quiet lines | Keep | In Settings › AI |
| AI-18, RUL-10 rule offer | Change | For everyone (5.5) |
| AI-19 tiers | Keep | Quiet limit lines only |
| AI-22 saved view from a phrase | Cut | Search with filters and Save as view covers it |
| AI-23 import AI pass | Keep | On the import page |
| AI-24 rediscover themes | Move | Into Revisit |
| MCP-01..MCP-05 | Keep | Settings › AI |

### 6.4 Capture, import, export, sharing

| Features | Decision | Notes |
| --- | --- | --- |
| CAP-01..CAP-10 Add link | Change | Compact panel (5.1); folder decided by default; details optional |
| CAP-11, CAP-12 several links | Keep | Same panel, list mode |
| CAP-14 keyboard | Change | N opens Add from anywhere |
| CAP-16 share target | Change | Same panel and behaviour as Add link |
| (new) drop a URL or text | Add | Anywhere in the app |
| IMP-01..IMP-11 import | Change | Page `/import`; one home in Settings › Your data |
| EXP-01..EXP-05 export | Merge | One dialog, two entry points |
| SHR-01..SHR-06 sharing | Keep | |

### 6.5 Settings, account, help

| Features | Decision | Notes |
| --- | --- | --- |
| SET-01, SET-02 settings nav, You list | Change | Same six sections on every size; Shortcuts reachable on phones |
| SET-03..SET-10 appearance | Change | Theme, text size, density, card options stay; Custom theme keeps base, accent, background, without corners (D7); dates move to Language and region |
| SET-12..SET-15 library settings | Keep | Plus default reminder time |
| SET-19, SET-20 language | Change | "Language and region": language, date format, clock, week start |
| SET-21, SET-22 privacy and data | Merge | "Your data": import, export, history, AI data link, privacy policy, delete account |
| ACC-01..ACC-03 profile, numbers, connected accounts | Keep | |
| ACC-06 delete account | Fix | 7-day grace period with restore (D9) |
| FBK-01..FBK-04 feedback | Move | Help in the avatar menu / You |
| FBK-05, FBK-06 rating prompt | Change (D12) | Dismissible card at a calm moment instead of a modal |
| ADM-01..ADM-05 admin | Keep | Own area, unchanged |
| PUB-13..PUB-15 What's new, How it works | Move | Help |
| ONB-01, ONB-02 welcome, empty library | Change | Welcome is the empty library itself: three actions (paste a link, get the extension, import bookmarks); no tour dialog |
| (new) 404 page | Add | |

### 6.6 Extension

| Features | Decision | Notes |
| --- | --- | --- |
| EXT-01..EXT-16 popup | Change | Same save panel as the web (5.1); edit after save; right-click "Save link to Shelfmark" (EXT-28) moves from later to now (D10) |
| EXT-21..EXT-27 offer in the web app | Change | One entry: the empty library and Help; no banner in the feed |

### 6.7 Fixes regardless of the redesign

Small broken promises found in the inventory, worth fixing now on the current code: demo link-limit message (6.4), folder limit counting trashed folders (6.2), "[PROVIDER]" placeholder on the privacy page (6.7), reminders field promised in the JSON export (6.4), Rules list not refreshed after a folder delete (6.2), single-key switch not covering M and Space (6.5), search help promising tags and sites (6.3).

## 7. Decisions for the author

| # | Question | Answer |
| --- | --- | --- |
| D1 | Three jobs (Save, Find, Come back) as the spine; new navigation (4.1) | **Yes** |
| D2 | Revisit as a top-level page (reminders, recently opened, forgotten) | **Yes** |
| D3 | Ways to mark what matters | **Keep three, each with its own job:** Pinned (sidebar quick access to folders and links), Pin to top of folder (order inside one folder), Favorites (a mark to filter by). Cut folder highlight (D4) |
| D4 | Folder look: colour and icon only | **Yes** |
| D5 | Side by side | **Keep** (author: useful and unique). Defined as two feeds next to each other for filing; the Link page is one link; on wide screens both exist, not at the same time |
| D6 | Fill in with AI | **Keep the button in Suggest mode** ("apply all suggestions in one press"); hidden in Automatic mode. AI stays visible through the suggestion rows with the spark and the "Moved by AI" marks (the author's reason for the button was to show that AI is there) |
| D7 | Custom theme | **Keep base, accent and background; drop corners** |
| D8 | Browser notifications for reminders, after the redesign | **Yes** |
| D9 | Account deletion with a 7-day grace period | **Yes** |
| D10 | Extension right-click save now; Pocket / Raindrop import later | **Yes** |
| D11 | Offline: honest banner now, queued saves later | **Yes** |
| D12 | Rating prompt | **No modal.** A dismissible card at a calm moment (Revisit, or after a successful action) plus "Send feedback" in Help |
| D13 | Click opens the site by default | **No: keep as is** (click opens the preview; the setting changes it). Fix the setting's hint, which says the preview works on wide screens only |
| D14 | Reader mode as a Site / Reader switch; first Site, then the last mode per site; Reader as fallback when a site can't be shown | **Yes** |
| D15 | Saved copy ("Read the copy") and highlights later | **Yes, later** |

## 8. After approval

1. Update this document with the answers.
2. Step 3 foundations (type, grid, surfaces, 2–3 palettes) on the prototype's base.
3. A screen map of the new structure: every page and surface above, per platform, with its states; that map drives the design system's component list.
