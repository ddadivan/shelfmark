# Screen map of the new structure

Every page and surface of the redesigned product, from the approved [flows and structure](flows-and-structure.md) (decisions D1–D15) on the [foundations](foundations.md). This list drives the design system's component list and the screen groups of step 5. Pattern names follow the page-patterns skill; surfaces follow the surfaces skill (in place, popover, slide-over, page; never a dialog on a dialog).

Platforms: **D** desktop ≥ 64em (sidebar, top bar; ≥ 80em adds side by side and the Link page beside the list) · **T** tablet 40–64em (icon rail, top bar) · **P** phone < 40em (tab bar, sheets) · **E** browser extension popup.

Every list keeps its frame in empty, loading and error states (an L1 panel, skeletons in the content's shape, one muted line for errors with a retry).

## 1. Shell

| ID | Surface | Type | D / T / P | States |
| --- | --- | --- | --- | --- |
| N-01 | Sidebar: Library (All links, Unsorted, Favorites), Revisit with count, Pinned, Folders, Tags, Trash | chrome | full / rail with flyouts / Library tab | collapsed sections, counts off |
| N-02 | Top bar: search, Add link, avatar | chrome | yes / yes / — | search open |
| N-03 | Phone tab bar: Today, Library, Add, Search, Ask (settings and account behind the avatar at the top right). No search field at the top on phones: Search opens S-01 full screen | chrome | — / — / yes | hidden on pushed pages |
| N-04 | Avatar menu: Settings, Theme (System / Light / Dark), Keyboard shortcuts, Help, What's new, Sign out | menu | yes / yes / You page | What's new dot |
| N-05 | Demo strip | banner | all | hours left |
| N-06 | Offline strip | banner | all | honest copy (D11) |
| N-07 | Toasts with Undo | toast | all | stack of 3, above the tab bar |
| N-08 | Global save panel (Add link, paste, drop, N) | panel | anchored under Add / same / bottom sheet | see C-01 |

## 2. Library

| ID | Surface | Type | D / T / P | States |
| --- | --- | --- | --- | --- |
| L-01 | Library feed (All links, Unsorted, Favorites, folder) | List | toolbar row / same / Options sheet | empty per scope, loading, error, filtered-empty, selection |
| L-02 | Folder header: breadcrumbs, name, folder menu, subfolders | part of L-01 | yes / yes / compact | no subfolders |
| L-03 | Views: Masonry, Grid, List, Headlines | toggle | all four / all / Masonry 2 columns, List, Headlines | per-feed memory |
| L-04 | Filter control (type, folder, tag, saved date, favorites) and saved views chips | popover + chips | yes / yes / sheet | no saved views |
| L-05 | Card, row, headline row | component | hover actions / touch actions / long press | favorite, pinned to top, reminder, AI summary pending, no image |
| L-06a | Show on cards: Preview image, Description (page text, or AI summary marked ✦ when there is none), Note, Tags, Site, Date saved; Reset to default. Same switches in Settings › Appearance | popover (toolbar button next to the views) | yes / yes / sheet | |
| L-06 | Link menu: Open, Open in browser, Rename (title only, in the shared rename dialog; F2), Details, Favorite, Pin to top, Pin to sidebar, Move, Remind me, Copy link, Share folder link, Create rule, Delete | menu | yes / yes / sheet | conditions per item |
| L-07 | Bulk bar: Move, Tags, Favorite, Remind, Open all, Copy, Delete | toolbar | bottom glassless bar / same / stacked | count, disabled actions |
| L-08 | Side by side: two feeds | Split pane | ≥ 80em only / — / — | picker on the right, related folders (AI) |
| L-09 | Unsorted with the Tidy up count | part of L-01 | all | AI off: no count |
| L-10 | Phone Library page: scopes, Pinned, folders, tags | List | — / — / yes | empty |

## 3. Link

| ID | Surface | Type | D / T / P | States |
| --- | --- | --- | --- | --- |
| K-01 | Link page: header (back, title, site, Open in browser, Site / Reader switch, favorite, more) | Detail | beside the list ≥ 80em, over the list below / full page / pushed page | loading, blocked site → Reader, Reader not available |
| K-02 | Site view (framed page) | part of K-01 | all | blocked, timeout |
| K-03 | Reader view: title, site, author, date, reading time, AI summary, text blocks | part of K-01 | 70ch column / same / full width | no text, extraction failed (muted line), progress |
| K-04 | Reading settings: size, font, width, theme | popover | yes / yes / sheet | |
| K-05 | Details: title, note, folder, tags, reminder, summary, added / opened dates | part of K-01 (fields edit in place); hidden until the Details button is pressed, so a click shows the site first | side panel / below / below | AI suggestions with the spark, Fill in with AI (Suggest mode) |
| K-06 | Related on your shelf | popover | yes / yes / sheet | AI off: hidden; none found |
| K-07 | Prev / next link | keys + buttons | yes / yes / swipe | first, last |

## 4. Revisit

| ID | Surface | Type | D / T / P | States |
| --- | --- | --- | --- | --- |
| R-01 | Revisit queue: Due, Continue reading, Forgotten this week, Recently opened | Inbox | yes / yes / tab | each group empty; all empty ("Nothing waiting. Saved links will come back here.") |
| R-02 | Row actions: Open, Done, Snooze, Keep for later, Not interested | row | hover / touch / swipe | |
| R-03 | Remind me | popover | anchored / same / sheet | current reminder, remove, pick a date |
| R-04 | Pause history | menu item + setting | all | paused notice |
| R-05 | "How do you like Shelfmark?" card (D12) | inline card | all | dismissed |
| R-06 | Notifications: asked right after the first reminder (inline card, then the browser prompt; never on first visit); desktop and Android notification with Open, Snooze, Done; in-app toast when a tab is open; blocked and iPhone (Add to Home Screen) help; weekly “From your shelf” email; Settings › Notifications (switch, what to send, quiet hours, devices) | card, system notification, email, settings page | all | blocked, iPhone without Home Screen |

## 5. Search

| ID | Surface | Type | D / T / P | States |
| --- | --- | --- | --- | --- |
| S-01 | Quick search panel (⌘K / field; phone: Search tab) | popover panel | under the field ≥ 80em, centred panel 64–80em / centred / full screen with back button, field focused; a found link opens its preview (Link page), Back returns to the results | recent searches, typing, nothing found, failed |
| S-02 | Results: links by words (title, note, address, tags, site, folder), close in meaning, folders and tags | list | all | AI off: no meaning group |
| S-03 | Filter chips and `#tag`, `site:`, `in:` syntax | chips | all | |
| S-04 | Ask your shelf: its own page `/ask` (sidebar item, ✦ Ask button next to search, Ctrl J; phone: its own tab, settings move to the avatar). Start screen shows what it can do (find, count and compare, summarise, plan and pick) as example questions; conversation with steps, link cards, actions (remind, save as view, copy); history of conversations; answering, limit reached, AI off. Search offers “Ask instead” when the query reads like a question | page | sidebar + top bar / same / tab | limit reached, AI off |
| S-05 | Results page `/search?q=` with Save as view | List | yes / yes / yes | |

## 6. Organise

| ID | Surface | Type | D / T / P | States |
| --- | --- | --- | --- | --- |
| O-01 | Folder tree with drag, reorder, New folder (dialog) | tree | sidebar / rail flyout / Library page | limit reached |
| O-02 | Folder menu: New subfolder, Add link here, Rename, Colour and icon, Move, Pin to sidebar, Share, Delete | menu | yes / yes / sheet | |
| O-03 | Rename (folder, tag, view); New folder | small dialog (phone: bottom sheet above the keyboard, replaces the ⋯ actions sheet) | all | empty or invalid name |
| O-04 | Colour and icon: 8 colours, icon set | popover | yes / yes / sheet | |
| O-05 | Move (link, links, folder) | popover picker | yes / yes / sheet | search, recent folders, current marked |
| O-06 | Tags list, tag menu (Show links, Rename, Merge, Delete) | list + menu | sidebar / flyout / Library page | top 8, show all |
| O-07 | Bulk tags | popover | yes / yes / sheet | |
| O-08 | Rules list and rule editor | Settings + slide-over | yes / yes / full page | folder in Trash |
| O-09 | Rule offer | toast | all | |
| O-10 | Tidy up: suggested folders and tags, duplicates, similar tags | Inbox | yes / yes / tab-less page with bottom bar | AI off, nothing to tidy, running |
| O-11 | Trash: filter, restore, delete forever, empty | List | yes / yes / swipe rows | empty, retention |
| O-12 | Delete confirmations (Delete forever, Empty trash) | dialog | all | named entity, Cancel focused |

## 7. Capture, import, export, sharing

| ID | Surface | Type | D / T / P | States |
| --- | --- | --- | --- | --- |
| C-01 | Save panel: address, preview, "Goes to …" line, Save; Add details (title, tags, note, reminder) | panel | anchored / same / bottom sheet | loading preview, duplicate, rule applied, AI suggestions, Fill in with AI, saving, error, limit |
| C-02 | Several links (paste many) | same panel, list mode | all | per-line rule chips, over the limit |
| C-03 | Drop a URL or text | overlay | yes / yes / — | |
| C-04 | Android share target `/share` | same panel as C-01 | — / — / page | signed out → sign in and back |
| C-05 | Import `/import`: choose file, check, AI groups, progress, done, recent imports | Form (steps) | page / page / page | wrong file, too big, nothing new, failed batches, undo |
| C-06 | Export dialog (whole library or this view) | dialog | all | preparing, cancel, saved |
| C-07 | Share folder: public switch, copy link, show notes, reset link | slide-over | yes / yes / sheet | demo |
| C-08 | Public collection `/c/:token` | List (read only) | all | not found |

## 8. Settings and account

| ID | Surface | Type | D / T / P | States |
| --- | --- | --- | --- | --- |
| G-01 | Settings navigation / You page | Settings | nav replaces the sidebar / same / You tab list | |
| G-02 | Account: profile, connected accounts, your shelf numbers, sign out | Settings | all | |
| G-03 | Appearance: theme, custom theme (base, accent, background), text size, font, density, card options, animations | Settings | preview beside / above / above | own colour fails contrast |
| G-04 | Library: viewing, clicking a link, saving defaults, default reminder time, rules, trash retention | Settings | all | |
| G-05 | AI: switch, modes (Suggest / Automatic / Off) for folders and tags, summaries, meaning search, process older links, usage, what is sent, delete AI data, connect your assistant | Settings | all | off, limit, provider down, Free tier line |
| G-06 | Language and region: language, date format, clock, week start | Settings | all | |
| G-07 | Your data: import, export, history, privacy policy, delete account (7-day grace, D9) | Settings | all | deletion scheduled (restore) |
| G-08 | Keyboard shortcuts: list and single-key switch | Settings + dialog | all | |
| G-09 | Help: How it works video, What's new, Send feedback (with your feedback list), Privacy | menu + dialogs/pages | all | |
| G-10 | AI intro (first time AI is turned on) | dialog | all | |
| G-11 | Admin: feedback inbox, stats | List | desktop | (author only) |

## 9. Public, sign-in, onboarding

| ID | Surface | Type | D / T / P | States |
| --- | --- | --- | --- | --- |
| A-01 | Landing / About | marketing | all | signed-in variant |
| A-02 | Sign-in (Google, GitHub, demo) | Form (auth) | all | reasons and errors |
| A-03 | Demo start | (loading) | all | failure |
| A-04 | Empty library as onboarding: paste a link, get the extension, import bookmarks | empty state inside L-01 | all | |
| A-05 | Changelog, Privacy | content pages | all | |
| A-06 | Not found | empty state | all | |

## 10. Extension

| ID | Surface | Type | States |
| --- | --- | --- | --- |
| E-01 | Popup: save panel (same as C-01), This page / All tabs | panel | opening, unsupported page, signed out, already saved, saving, saved (with edit), error, offline |
| E-02 | All tabs list with Sort with AI | list | permission prompt, nothing to save |
| E-03 | Right-click "Save link to Shelfmark" with a confirmation | context menu + notification | signed out, error |

## 11. Counts

| | Count |
| --- | --- |
| Pages (routes) | 24 (was 33) |
| Dialogs | 6: Export, delete confirmations, AI intro, keyboard shortcuts, How it works, What's new (was 53) |
| Slide-overs | 2: share folder, rule editor |
| Popovers / pickers | 9 |
| Menus | 6 (was 24) |
