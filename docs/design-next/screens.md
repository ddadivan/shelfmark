# Shelfmark screen catalogue, as is

Section 4 of the feature inventory ([`features.md`](features.md)): every page, dialog, sheet, drawer, menu, popover and panel with its contents. Feature IDs refer to the catalogue in `features.md`. Quoted strings are the English UI copy; `{{name}}` is filled in at run time. Breakpoints: phone below 40em, mobile shell (phone and tablet) below 64em, desktop from 64em, wide from 80em.

# 4. Screen catalogue

## 4.1 Library, links and app shell

### SCR-SHL-01 App shell (desktop)
- Route / how it opens: any signed-in route at 64em or wider.
- Platforms: desktop (64em+).
- Regions: demo banner (if demo); offline banner (if offline); left: sidebar card (or settings navigation on `/settings/*`); right column: top bar; main column (page; toast area; scroll restoration).
- Shown information: see SCR-SHL-02, SCR-SHL-05.
- Controls: see children.
- Form fields: none.
- Primary action: "Add link" in the top bar.
- States: boot skeleton on first load.
- Features: SHL-01, SHL-08, SHL-11, SHL-12, SHL-13.
- Source: `shell/app-shell.component.html`.

### SCR-SHL-02 Sidebar
- Route / how it opens: always on desktop (not on settings pages).
- Platforms: desktop.
- Regions: (1) logo (link to `/links`); (2) scroll area: fixed rows tree ("Views"), Pinned section, Folders section (heading, toggle, "New folder", tree "Folders"), error line, Tags section, How it works card (other area, while visible); (3) fixed footer: "Get the extension" row (conditional), "Data & help" row, divider, "Trash" row. Nav landmark name "Library".
- Shown information: row names and icons; counts (All links, Unsorted, Favorites when "Show folder counts" on; due reminders count; "{{count}} forgotten" note on Recently opened; folder link counts; Trash item count); pinned rows (folder tile/name/count or favicon/title); folder tree (colour/icon tile, name, count, expanded state); What's new dot on Data & help.
- Controls: fixed rows (navigate); pinned rows (navigate/open), "Unpin {{name}}" buttons; chevron toggles "Show or hide pinned" / "Show or hide folders" / "Show or hide tags"; "New folder" (+); folder rows (navigate), "Actions for {{name}}" (…), right click / Shift+F10 / long press → folder menu; drag to reorder folders and pins, Alt+Up/Down; "Try again" on folder load error; "Get the extension" (opens store in new tab); "Data & help" (opens menu; ArrowUp opens on last item); "Trash" (navigate).
- Form fields: none (new folder inline field belongs to organise area).
- Primary action: navigation.
- States: folders skeleton after 300 ms; "Couldn't load your folders." + "Try again"; Pinned section absent when empty; drag states (no-drop, Move here).
- Features: SHL-02..SHL-07, LNK-09.
- Source: `shell/sidebar/sidebar.component.html`, `features/pins/components/sidebar-pinned/*`.

### SCR-SHL-03 Folder menu (sidebar and phone Library)
- Route / how it opens: folder row "…" button, right click (at pointer), Shift+F10, long press on touch (a following drag closes it and continues the reorder).
- Platforms: desktop sidebar, phone Library page.
- Regions: menu "Folder actions".
- Shown information: item labels.
- Controls (in order): "Pin to sidebar" / "Unpin from sidebar" (pin icon; label depends on state); "Color and icon…" (edit); "New subfolder" (folder-plus); "Add link here" (add; opens Add link with this folder); "Rename" (edit); "Move to…" (folder-move); "Share…" (share); separator; "Delete folder…" (trash, danger). All except pin belong to the organise / capture / sharing areas.
- Form fields: none.
- Primary action: n/a.
- States: n/a.
- Features: SHL-04, SHL-03.
- Source: `shell/sidebar/sidebar.component.html`, `sidebar-folders.service.ts`.

### SCR-SHL-04 "Data & help" menu
- Route / how it opens: "Data & help" row in the sidebar footer; opens upwards.
- Platforms: desktop.
- Regions: menu "Data and help".
- Shown information: labels; "new" badge on What's new while unseen.
- Controls (in order): "Import links" (download icon; import dialog); "Export" (share icon; export dialog); separator; "What's new" (gift icon; What's new dialog; badge "new"); "Send feedback" (message icon; feedback dialog).
- Form fields: none.
- Primary action: n/a.
- States: n/a.
- Features: SHL-07.
- Source: `shell/sidebar/sidebar.component.html`.

### SCR-SHL-05 Top bar
- Route / how it opens: desktop shell.
- Platforms: desktop.
- Regions: left: search (field from 80em, "Search" button 64–80em) and Ask button; spacer; right: shortcuts, theme, Add link, avatar.
- Shown information: avatar image or initials.
- Controls: header search (other area); Ask header button (AI area, when Ask on); "Keyboard shortcuts" icon button (tooltip with "?"); theme toggle ("Switch to dark theme" / "Switch to light theme"; moon/sun icon); "Add link" (primary, add icon); "Account menu" avatar button.
- Form fields: search field (other area).
- Primary action: "Add link" → Add link dialog.
- States: on settings pages no search and no Ask.
- Features: SHL-08, SHL-09, SHL-26.
- Source: `shell/app-shell.component.html`.

### SCR-SHL-06 Account menu
- Route / how it opens: avatar button.
- Platforms: desktop.
- Regions: header (avatar, name, email), groups separated by separators.
- Shown information: user name, email, avatar.
- Controls (in order): "Settings"; "Send feedback"; [admin] "Feedback inbox"; [admin] "Usage stats"; separator; "How it works"; "About Shelfmark"; separator; "Sign out".
- Form fields: none.
- Primary action: n/a.
- States: admin items conditional.
- Features: SHL-09.
- Source: `shell/app-shell.component.html`.

### SCR-SHL-07 Mobile shell and tab bar
- Route / how it opens: any signed-in route below 64em.
- Platforms: phone, tablet portrait.
- Regions: banners (demo, offline); page (own title); floating tab bar at the bottom.
- Shown information: tab labels and icons, current tab.
- Controls: "Library", "Search" (opens search overlay), central "Add link", "Tags" or "Ask", "You".
- Form fields: none.
- Primary action: Add link (central button).
- States: tab bar hidden on `/unsorted/tidy`, `/ask`, and while `?preview=` is set.
- Features: SHL-10.
- Source: `shell/app-shell.component.html`.

### SCR-SHL-08 Demo banner
- Route / how it opens: demo session.
- Platforms: all.
- Regions: info notice banner across the top.
- Shown information: "You're in a demo." + remaining hours text.
- Controls: "Sign in with your own account" (primary small; disabled while signing out).
- Form fields: none.
- Primary action: sign out of the demo → sign-in.
- States: remaining text absent when unknown.
- Features: SHL-11.
- Source: `shell/demo-banner/*`.

### SCR-SHL-09 Offline banner
- Route / how it opens: browser offline.
- Platforms: all.
- Regions: warning notice banner with offline icon.
- Shown information: "You're offline. You can browse what's loaded; saving and editing come back when you reconnect."
- Controls: none.
- Form fields: none.
- Primary action: none.
- States: offline only.
- Features: SHL-12.
- Source: `shell/offline-banner/*`.

### SCR-SHL-10 Signed-out lock dialog
- Route / how it opens: another tab of the same user signed out.
- Platforms: all.
- Regions: small alert dialog, not dismissable (no close, no Esc).
- Shown information: title "You signed out in another tab"; text "To keep your links private, this tab is locked too."
- Controls: "Sign in again" (primary) → sign-in with return URL.
- Form fields: none.
- Primary action: "Sign in again".
- States: n/a.
- Features: SHL-17.
- Source: `core/sync/signed-out-dialog/*`, `core/sync/signed-out-lock.service.ts`.

### SCR-SHL-11 Update available toast
- Route / how it opens: new service worker version ready.
- Platforms: all (production).
- Regions: sticky info toast.
- Shown information: "A new version of Shelfmark is ready".
- Controls: "Reload", "Later".
- Form fields: none.
- Primary action: "Reload" reloads the page.
- States: n/a.
- Features: SHL-18.
- Source: `core/pwa/update-prompt.service.ts`.

### SCR-SHL-12 Boot skeleton
- Route / how it opens: first paint of any page load; also the demo start page.
- Platforms: all.
- Regions: banner placeholder (demo start), sidebar rows and footer, header blocks, title, count, optional extension-banner placeholder, card grid, phone tab bar placeholders.
- Shown information: none (decorative).
- Controls: none.
- Form fields: none.
- Primary action: none.
- States: n/a.
- Features: SHL-13.
- Source: `shell/boot-skeleton/*`, `index.html`.

### SCR-LIB-01 Library feed page
- Route / how it opens: `/links`, `/unsorted`, `/favorites`, `/folders/:folderId` with optional `?q`, `?tag`, `?kind`, `?sort`, `?split`, `?related`, `?preview`.
- Platforms: all; layout per breakpoint.
- Regions: progress bar (refetch); live region (selection mode); selection header (SCR-LIB-05, when selecting); breadcrumbs (folder pages); split container: left half [folder banner or plain heading block (title or left picker in split, description, cover, count line) + toolbar; extension banner; saved view chips; active filter row; scroll area (refetch notice; subfolder tiles; empty/error/skeleton/links; load more); preview key hints (split preview)]; resize handle + preview panel (preview split) or divider with swap + right half (side by side); pushed preview page (below 80em); bulk bar (inside scroll area, or under both halves in split).
- Shown information: title (folder name / "All links" / "Unsorted" / "Favorites"); folder icon tile, description, cover; count line; subfolder tiles (icon, name, link and subfolder counts); link cards/rows (see SCR-LNK-01/02); chips and their counts.
- Controls: toolbar desktop/tablet: Tidy entry (Unsorted, AI), sort button + "Sort links" menu (SCR-LIB-03), "View" segmented control (Cards / List), "Export" button + menu (SCR-LIB-04), "Side by side" toggle (80em+, not with preview). Phone toolbar: Tidy entry, "Options" button (settings icon, chevron) → SCR-LIB-02. Breadcrumb links, "Show hidden folders". Filter chips remove buttons and "Clear filter". Saved view chips (SCR-LIB-10). Subfolder tiles. "Try again" (refetch notice / error), "Load more". Empty-state buttons (LIB-13). Cards/rows controls (SCR-LNK-01/02).
- Form fields: none on the page (selection checkboxes).
- Primary action: open / preview links; empty state "Add link".
- States: skeleton (8 cards/rows after 300 ms); stale list under progress bar; empty states and errors with exact copy in Empty states / Errors tables; "Couldn't refresh your links. You are seeing the last loaded list."; "Couldn't load more links."; "Loading more links".
- Features: LIB-01..LIB-26, LIB-31..LIB-33, LIB-35, LNK-01..LNK-14.
- Source: `features/library/library.page.html`.

### SCR-LIB-02 Phone "Options" menu
- Route / how it opens: "Options" button on the library toolbar below 40em.
- Platforms: phone.
- Regions: menu "Sort, view and export".
- Shown information: labels, radio states.
- Controls (in order): [when links or first load] label "Sort by"; radio "Newest first", "Oldest first", "Title A–Z"; separator; label "View"; radio "Cards" (cards icon), "List" (list icon); separator; then label "Export"; [when the view can be exported] "This view as JSON", "This view as Bookmarks HTML", "This view as CSV", separator; "Everything as JSON", "Everything as Bookmarks HTML", "Everything as CSV".
- Form fields: none.
- Primary action: n/a.
- States: sort/view items hidden for an empty feed.
- Features: LIB-05, LIB-06, LIB-31.
- Source: `library.page.html`.

### SCR-LIB-03 Sort menu
- Route / how it opens: sort button in the toolbar (desktop/tablet).
- Platforms: 40em+.
- Regions: menu "Sort links".
- Shown information: current choice.
- Controls: radio "Newest first", "Oldest first", "Title A–Z".
- Form fields: none.
- Primary action: n/a.
- States: n/a.
- Features: LIB-06.
- Source: `library.page.html`.

### SCR-LIB-04 Export menu
- Route / how it opens: "Export" button in the toolbar (desktop/tablet).
- Platforms: 40em+.
- Regions: menu "Export".
- Shown information: labels with format icons (code, globe, list).
- Controls: [view exportable] "This view as JSON", "This view as Bookmarks HTML", "This view as CSV", separator; "Everything as JSON", "Everything as Bookmarks HTML", "Everything as CSV".
- Form fields: none.
- Primary action: download (export area).
- States: n/a.
- Features: LIB-31.
- Source: `library.page.html`.

### SCR-LIB-05 Selection header
- Route / how it opens: at least one link selected.
- Platforms: desktop vs compact.
- Regions: group "Selection" at the top of the feed.
- Shown information: "{{count}} selected".
- Controls: desktop: select-all checkbox ("Select all {{count}} link(s)", indeterminate), "Select all {{count}}" (when not all), hints "Shift + click selects a range", "Esc clears", "Done". Compact: × "Cancel selection", count, "Select all" (below 40em) / "Select all {{count}}" (tablet).
- Form fields: select-all checkbox.
- Primary action: n/a.
- States: n/a.
- Features: LIB-14.
- Source: `library.page.html`.

### SCR-LIB-06 Bulk action bar
- Route / how it opens: selection.
- Platforms: inline or stacked; compact stacked above tab bar.
- Regions: floating glass bar; "Actions for {{count}} selected link(s)".
- Shown information: labels; favorite pressed state; right folder tile.
- Controls (in order): [split with right folder] "Move to {{folder}}"; "Move"; "Tags"; "Favorite"; "Remind"; desktop "Open all", "Copy links"; compact "Share" or "Copy links"; "Delete" (danger).
- Form fields: none.
- Primary action: depends.
- States: n/a.
- Features: LIB-15..LIB-21.
- Source: `library.page.html` (`bulkBar`), `library-bulk.service.ts`.

### SCR-LIB-07 Bulk tags dialog
- Route / how it opens: bulk "Tags".
- Platforms: dialog Sm; sheet on phone.
- Regions: title "Tags for {{count}} link(s)"; two fields; footer.
- Shown information: suggestions with counts ("{{count}} links"; "on {{count}} of {{total}}").
- Controls: "Cancel", "Apply" (disabled when both empty), close "Close".
- Form fields: "Add to all" (tag input; hint "Added to every selected link"; placeholder "Add tag"; max 20 "Up to {{max}} tags"; can create "Create tag “{name}”"); "Remove from all" (tag input; hint "Taken off every selected link; the tags themselves stay"; placeholder "Pick a tag"; suggestions only present tags).
- Primary action: "Apply" → batch update, toast.
- States: n/a.
- Features: LIB-17.
- Source: `components/bulk-tags-dialog/*`.

### SCR-LIB-08 Open all confirmation
- Route / how it opens: bulk "Open all" with more than 10 links.
- Platforms: desktop.
- Regions: confirm dialog.
- Shown information: "Open {{count}} links?" / "Each link opens in a new tab."
- Controls: "Open all", "Cancel", "Close".
- Form fields: none.
- Primary action: opens tabs.
- States: n/a.
- Features: LIB-19.
- Source: `bulk-link-actions.service.ts`.

### SCR-LIB-09 Bulk delete confirmation
- Route / how it opens: bulk "Delete".
- Platforms: all.
- Regions: destructive confirm dialog.
- Shown information: "Move {{count}} link(s) to Trash?" / "They stay in Trash for {{days}} days, then they are deleted for good."
- Controls: "Move to Trash" (danger), "Cancel", "Close".
- Form fields: none.
- Primary action: delete to Trash, Undo toast.
- States: n/a.
- Features: LIB-20.
- Source: `bulk-link-actions.service.ts`.

### SCR-LIB-10 Saved view chips and view menu
- Route / how it opens: library page (chips); "…" on a chip or right click (menu).
- Platforms: wrap (desktop) / horizontal scroll (phone).
- Regions: toolbar "Saved views"; menu "Actions for {{name}}".
- Shown information: "All {{count}}", view names with counts, hint tooltips for plain type views.
- Controls: chips (apply view / All), "…" per view, "+ Save this view"; menu items in order: "Rename", "Move left" (disabled first), "Move right" (disabled last), separator, "Delete view" (danger).
- Form fields: none.
- Primary action: apply view.
- States: hidden for an empty library; counts blank while loading; unavailable view toast.
- Features: LIB-09, LIB-11.
- Source: `saved-view-chips.component.html`.

### SCR-LIB-11 New view dialog
- Route / how it opens: "+ Save this view".
- Platforms: dialog Md; sheet on phone.
- Regions: title "New view"; phrase step (AI on) or rows step; footer.
- Shown information: AI lines, idea chips, live count and first 3 links ("Found {{count}} link(s)", "Found {{count}}+ links", "and {{count}} more", "{{host}} · {{folder}}").
- Controls: idea chips; "or" + "save the current filter"; "Change" (after compose); footer "Cancel", "Compose"/"Composing…" (phrase step) or "Save view"/"Saving…".
- Form fields: "Describe what to show" (text, AI only, 3–200 chars, placeholder "videos about Angular I haven’t watched yet", hint "For example: “articles about design from my Work folder”, “what to buy from clothes”, “recipes, newest first”."); "Where" (searchable select; options "All links", "Unsorted", "Favorites", folders; default current feed); "Type" ("All types" + types; default current); "Tags" (tag input, placeholder "Add a tag", max 5 "Up to {{max}} tags", unknown tag error); "Search words" (text, placeholder "Words in the title, note or address", "Use at most {{max}} characters"); "Sort" (Newest first / Oldest first / Title A–Z); "Name" (text, required "Enter a name", max 40 "Use at most {{max}} characters", placeholder "To read").
- Primary action: "Save view" → POST, toast "View saved", focus to new chip.
- States: save errors (Errors table); AI limit / unavailable line.
- Features: LIB-10.
- Source: `new-view-dialog.component.html`.

### SCR-LIB-12 Rename view dialog
- Route / how it opens: view menu "Rename".
- Platforms: dialog Sm.
- Regions: title "Rename view"; field; footer.
- Shown information: current name.
- Controls: "Cancel", "Rename"/"Renaming…", close "Close".
- Form fields: "Name" (required "Enter a name"; max 40 "Use at most {{max}} characters"; placeholder "To read").
- Primary action: rename (optimistic; dialog closes at once).
- States: failure toast after close.
- Features: LIB-11.
- Source: `view-name-dialog.component.html`.

### SCR-LIB-13 Delete view confirmation
- Route / how it opens: view menu "Delete view".
- Platforms: all.
- Regions: destructive confirm.
- Shown information: "Delete view {{name}}?" / "Only the view goes. The links stay where they are."
- Controls: "Delete view", "Cancel", "Close".
- Form fields: none.
- Primary action: delete; toast "View deleted".
- States: n/a.
- Features: LIB-11.
- Source: `saved-view-actions.service.ts`.

### SCR-LIB-14 Side by side right half
- Route / how it opens: "Side by side" toggle or "Show related" (80em+); `?split=`.
- Platforms: wide.
- Regions: picker state: head "Choose a folder" + close; panel with heading, text, picker list. Folder state: head (picker menu trigger, count, close), scroll area with read-only cards, load more.
- Shown information: folder list with tiles, "Recent"/"Related folders" group, "On the left" mark; right folder's cards; count "{{count}} link(s)" / "{{count}}+ links".
- Controls: "Close side by side" (×); picker list ("Find a folder", Unsorted row, folders); picker menu trigger "Right folder: {{name}}. Change" (menu "Show on the right"); per-card "Move “{{title}}” to {{folder}}" button; "Try again"; "Load more"; divider "Swap sides".
- Form fields: picker search "Find a folder".
- Primary action: choose a right folder; drag or move links.
- States: resolving skeleton; error "Check your connection and try again."; empty "Drag links here from the left."; "No folder found".
- Features: LIB-22, LIB-23.
- Source: `components/split-right-half/*`, `library.page.html`.

### SCR-LIB-15 Left feed picker menu (side by side)
- Route / how it opens: the left title trigger "Left feed: {{name}}. Change" while split is open.
- Platforms: wide.
- Regions: picker menu "Show on the left".
- Shown information: All links, Unsorted, Favorites, folders (nested), tags; "On the right" mark.
- Controls: options; search.
- Form fields: "Find a folder or tag".
- Primary action: navigate the left half.
- States: "Nothing found".
- Features: LIB-22.
- Source: `library.page.html`, `utils/left-feed-options.ts`.

### SCR-LIB-16 Preview panel (split)
- Route / how it opens: `?preview=<id>` at 80em+.
- Platforms: wide.
- Regions: region "Preview: {{title}}"; toolbar "Preview actions"; body (frame, player or blocked); handle between list and panel; key hint line under the list.
- Shown information: title, favicon + address.
- Controls (toolbar, in order): "Previous link" (↑), "Next link" (↓), related button (AI), favorite "Favorite", "Edit", "Copy link", "Wider preview"/"Show the list", "Open" (↵, tooltip "Open in new tab"), "Close preview" (Esc). Resize handle "Resize the list" (drag, ←/→, double-click resets). Blocked body: "Open in new tab", checkbox "Always open {{domain}} in a new tab".
- Form fields: "Always open {{domain}} in a new tab" checkbox (blocked state).
- Primary action: "Open".
- States: loading progress "Loading the preview"; blocked "{{domain}} doesn't open inside other apps" / "The site blocks it, not Shelfmark. Open it in a new tab."
- Features: LIB-24, LIB-26.
- Source: `link-preview/components/preview-panel/*`, `preview-body/*`.

### SCR-LIB-17 Preview page (pushed) and its More menu
- Route / how it opens: `?preview=<id>` below 80em.
- Platforms: phone, tablet, desktop 64–80em.
- Regions: header (Back, title + domain, Open in browser, More); body; floating bottom toolbar.
- Shown information: title, favicon, domain.
- Controls: "Back to the links"; "Open in browser"; "More actions" menu items in order: "Edit", "Copy link"; bottom: "Favorite", "Share", related links (AI).
- Form fields: blocked-state checkbox.
- Primary action: open in browser.
- States: as SCR-LIB-16.
- Features: LIB-25, LIB-26.
- Source: `link-preview/components/preview-page/*`.

### SCR-LIB-18 Recently opened page
- Route / how it opens: `/recent` (sidebar row), `?show=forgotten` for Forgotten.
- Platforms: all.
- Regions: header (title, count; switch, Pause/Resume, Clear history); paused notice; tools (type chips, search); day groups with rows; footer note.
- Shown information: rows: title, folder chip ("Unsorted" when none), time; day titles; counts on chips.
- Controls: "Opened"/"Forgotten" segmented ("Show"); "Pause history"/"Resume history"; "Clear history"; type chips "All", "Videos", "Articles", "Shopping"; search clear "Clear search"; row click opens; row "More for {{title}}" menu; swipe "Remove" (compact); notice "Resume"; empty-state buttons.
- Form fields: "Search history" (search input, clearable, debounced 200 ms).
- Primary action: open a link.
- States: skeleton (5 rows); empty and filtered states (Empty states table); paused notice.
- Features: LIB-27, LIB-29, LIB-34.
- Source: `pages/recent/*`, `components/recent-history/*`.

### SCR-LIB-19 Recently opened row menu
- Route / how it opens: "…" on a history row.
- Platforms: all.
- Regions: menu "More for {{title}}".
- Shown information: labels.
- Controls (in order): "Open in new tab" (external; http/https only); "Show in folder" (folder; goes to the folder or Unsorted); "Copy link" (copy); separator; "Remove from history" (close icon).
- Form fields: none.
- Primary action: n/a.
- States: n/a.
- Features: LIB-27, LNK-16.
- Source: `components/link-history-row/*`.

### SCR-LIB-20 Clear history confirmation
- Route / how it opens: "Clear history" (page) or "Clear" (sheet).
- Platforms: all.
- Regions: confirm dialog.
- Shown information: "Clear history?" / "Every link leaves Recently opened. Your saved links stay where they are."
- Controls: "Clear history", "Cancel", "Close".
- Form fields: none.
- Primary action: clears; toast "History cleared".
- States: failure "Couldn't clear the history".
- Features: LIB-27.
- Source: `recent-history.component.ts` (`clear`).

### SCR-LIB-21 Recently opened sheet (phone)
- Route / how it opens: "Recently opened" tile on `/library`.
- Platforms: below 64em.
- Regions: tall sheet: title, actions slot ("Clear"), close; switch; list.
- Shown information: as SCR-LIB-18 without tools.
- Controls: "Clear" ("Clear history"), close ("Close"), switch, rows, row menus, swipe "Remove".
- Form fields: none.
- Primary action: open a link.
- States: inline empty states.
- Features: LIB-28.
- Source: `components/recent-sheet/*`.

### SCR-LIB-22 Forgotten list
- Route / how it opens: "Forgotten" segment.
- Platforms: all.
- Regions: lead line + "Hide until next week" ×; panel with rows.
- Shown information: favicon + host, title, "Saved in {{month}}, not opened lately"; spark in theme mode.
- Controls: title link (opens); "Remind me"; "Not interested"; ×.
- Form fields: none.
- Primary action: open / remind.
- States: empty "Nothing forgotten" / "Links you save and never open will wait here."
- Features: LIB-29.
- Source: `features/rediscover/components/forgotten-list/*`.

### SCR-LIB-23 Phone Library page
- Route / how it opens: Library tab (`/library`).
- Platforms: below 64em (redirects to `/links` otherwise).
- Regions: title "Library"; Pinned card; Folders section; tiles; tags section (Ask on).
- Shown information: pinned rows; folder tree with counts; tiles with counts / meta.
- Controls: pinned rows and unpin; "New folder"; folder rows and menus; tiles "All links", "Unsorted", "Favorites", "Recently opened" (opens sheet, `aria-haspopup="dialog"`), "Reminders", "Trash"; "Nothing pinned yet" row (toast).
- Form fields: none.
- Primary action: navigate.
- States: tile meta blank until loaded.
- Features: LIB-30, SHL-03, SHL-04, SHL-05.
- Source: `pages/phone-library/*`.

### SCR-LIB-24 Extension banner
- Route / how it opens: library page on desktop Chromium.
- Platforms: 64em+ Chromium.
- Regions: logo mark, copy, install button, popup picture (80em+), close.
- Shown information: "Save pages straight from your browser"; "The Shelfmark extension saves the page you are on in one click or Alt+Shift+S, with your folders and tags filled in."
- Controls: "Install extension" (new tab); × "Not now".
- Form fields: none.
- Primary action: install.
- States: hidden after dismiss.
- Features: SHL-22.
- Source: `components/extension-banner/*`.

### SCR-LNK-01 Link card
- Route / how it opens: feeds in Cards view.
- Platforms: all.
- Regions: checkbox (corner); image; hover overlay (address, "Open ↗"); title; meta (favicon, host); date or reminder chip; actions (eye, …); "Pinned" badge; note/summary slot; footer (tags, folder chip, star).
- Shown information: as LNK-01.
- Controls: card link (open/preview/toggle), checkbox "Select {{title}}", eye "Preview {{title}}", "Actions for {{title}}" (menu SCR-LNK-03), tag chip(s) and "+N", star "Favorite: {{title}}"; long press (compact) selects; Space / Shift+Space / M keys.
- Form fields: checkbox.
- Primary action: open (or preview).
- States: selecting, selected, landed, carried/dimmed, current.
- Features: LNK-01, LNK-03..LNK-14, LNK-18.
- Source: `link-card/*`.

### SCR-LNK-02 Link list row
- Route / how it opens: feeds in List view.
- Platforms: all.
- Regions: checkbox; favicon; title; meta (host or summary, folder chip, reminder or Pinned); trailing (tags, star, eye, …).
- Shown information: as LNK-02.
- Controls: as card (no "+N").
- Form fields: checkbox.
- Primary action: open (or preview).
- States: as card; dense.
- Features: LNK-02.
- Source: `link-row/*`.

### SCR-LNK-03 Link menu
- Route / how it opens: "…" on a card or row.
- Platforms: all.
- Regions: menu "Actions for {{title}}".
- Shown information: labels; shortcuts Space and ↵ on desktop.
- Controls (in order): "Preview here" [previewable, http(s)]; "Open" [http(s)]; "Edit"; "Add to favorites"/"Remove from favorites"; "Pin to top"/"Unpin from top" [folder page]; "Pin to sidebar"/"Unpin from sidebar"; "Remind me…"/"Change reminder…"; "Move to folder…"; "Show related" [AI ready, 80em+]; "Create a rule for {{domain}}…" [domain]; separator; "Delete" (danger).
- Form fields: none.
- Primary action: n/a.
- States: n/a.
- Features: LNK-03.
- Source: `link-card.component.html`, `link-row.component.html`.

### SCR-LNK-04 Edit link dialog
- Route / how it opens: "Edit" in the link menu, preview "Edit", "Open saved" in Add link.
- Platforms: dialog Md; sheet on phone.
- Regions: title "Edit link"; fields; meta line; footer.
- Shown information: preview state notices when URL changes (Add link behaviour), reminder line, "Saved {{created}}, last opened {{opened}}" / "Saved {{created}}, never opened".
- Controls: "Delete", "Fill in with AI" (AI), "Cancel", "Save changes"/"Saving…", reminder "Change"/"Remind me", rule chip remove "Don't apply the rule for {{domain}}", close "Close".
- Form fields: "Link" (url, required, max 2048); "Title" (required, max 300); summary (AI, when shown); "Folder" (searchable select, default current folder, can create); "Tags" (tag input, max 20); "Your note" (textarea, 2 rows, max 2000, counter "characters"); "Type" (select of 10 types); "Add to favorites" (checkbox).
- Primary action: "Save changes" → PATCH, toast "Changes saved".
- States: validation and save errors (Errors table).
- Features: LNK-06.
- Source: `add-link-dialog.component.html`.

### SCR-LNK-05 Delete link confirmation
- Route / how it opens: "Delete" in menu or edit dialog.
- Platforms: all.
- Regions: destructive confirm.
- Shown information: "Delete this link?" / "“{{title}}” moves to Trash. You can restore it for {{days}} days."
- Controls: "Delete link", "Cancel", "Close".
- Form fields: none.
- Primary action: hide + Undo toast.
- States: n/a.
- Features: LNK-07.
- Source: `link-actions.service.ts`.

### SCR-LNK-06 Move picker
- Route / how it opens: "Move to folder…", M key, bulk "Move".
- Platforms: sheet below 64em (560px centred on tablet), dialog on desktop.
- Regions: title ("Move “{{title}}”" or "Move {{count}} link(s)"), search, "Recent" group, "Folders" list.
- Shown information: Unsorted row, nested folders with icon/colour, "Current folder" mark.
- Controls: options (choose = move and close); close "Close".
- Form fields: "Search folders".
- Primary action: choose a folder.
- States: "No folders found".
- Features: LNK-08, LIB-16.
- Source: `components/move-picker/*`.

### SCR-LNK-07 Card tags popover
- Route / how it opens: "+N" chip on a card.
- Platforms: all.
- Regions: popover titled "Other tags" or "All tags".
- Shown information: hidden tag names.
- Controls: tag chips (show links with the tag; popover closes).
- Form fields: none.
- Primary action: filter by tag.
- States: chips not clickable while selecting / read-only.
- Features: LNK-12.
- Source: `components/link-card-tags/*`.

### SCR-LNK-08 Drag preview and drop targets
- Route / how it opens: dragging a card/row (64em+).
- Platforms: desktop/tablet landscape.
- Regions: tilted card/row preview with badge and deck; placeholder slot; highlighted targets with "Move here".
- Shown information: "Move {{count}} link(s)".
- Controls: drop; Esc cancels.
- Form fields: none.
- Primary action: drop on a folder.
- States: no-drop rows; reason toasts.
- Features: LNK-09.
- Source: `library.page.html`, `components/drag-slot/*`, `link-drag.service.ts`.

## 4.2 Organise: folders, tags, rules, trash, reminders

### SCR-ORG-01 Sidebar · Folders section
- Route / how it opens: always in the desktop sidebar (from 64em), below the fixed rows and Pinned.
- Platforms: desktop. Compact: the same tree on the Library page (SCR-ORG-11).
- Regions: heading row ("Folders", fold chevron, "+" button); body with the folder tree; error line under it.
- Shown information: per row: twisty (if children), folder tile (icon/emoji, shown colour), name, link count (if counts shown), highlight background, active state, description tooltip; while a link drags over it: "Move here" badge instead of the count.
- Controls: fold chevron "Show or hide folders" (desktop only; aria-expanded); "+" "New folder" (tooltip "New folder"); row click/Enter = open folder; row "…" "Actions for {name}" (opens SCR-ORG-02); right click / long press / Shift+F10 open the menu; drag / Alt+Up/Down reorder; "Try again" on error.
- Form fields: none.
- Primary action: open a folder.
- States: skeleton after 300 ms; "Couldn't load your folders." + "Try again"; no counts until loaded.
- Features: ORG-01, ORG-02, ORG-06, ORG-07, ORG-19.
- Source: `shell/sidebar/sidebar.component.html`.

### SCR-ORG-02 Folder menu
- Route / how it opens: right click, "…" button, Shift+F10 / context-menu key, long press on a folder row.
- Platforms: desktop sidebar, compact Library page.
- Regions: one menu (accessible name "Folder actions").
- Shown information: item labels.
- Controls (in order, none conditional except the label of item 1): 1 "Pin to sidebar" / "Unpin from sidebar" (pin icon) → ORG-14; 2 "Color and icon…" (edit icon) → SCR-ORG-06; 3 "New subfolder" (folder-plus) → SCR-ORG-03; 4 "Add link here" (add) → Add link dialog; 5 "Rename" (edit) → SCR-ORG-04; 6 "Move to…" (folder-move) → SCR-ORG-05; 7 "Share…" (share) → share dialog; separator; 8 "Delete folder…" (trash, danger) → SCR-ORG-09.
- Form fields: none.
- Primary action: n/a.
- States: closes when a row drag starts.
- Features: ORG-07.
- Source: `sidebar.component.html`.

### SCR-ORG-03 New folder dialog (and New subfolder)
- Route / how it opens: "+" New folder; menu "New subfolder".
- Platforms: all; bottom sheet below 40em.
- Regions: title; fields; error notice; footer buttons.
- Shown information: title "New folder" or "New folder in “{parent}”" (follows the chosen "Inside").
- Controls: close "Close"; "Cancel" (disabled while saving); "Create folder" (submit; "Creating…" with spinner while saving).
- Form fields: "Name" — text, required, placeholder "For example, Reading list", autofocus, max 100; errors "Enter a folder name" (empty or only spaces), "Use 100 characters or fewer". "Inside" — searchable select, optional, default "Top level" (or the parent for a subfolder), search label "Search folders", no results "No folders found"; options = all folders as tree with tiles.
- Primary action: Create folder → waits; closes; toast "Folder created" (detail name); navigates to the folder; focus on the new sidebar row.
- States: failure notice "Couldn't create the folder. Try again."; limit: dialog not opened, toast "Folder limit reached" / "You can have up to 500 folders".
- Features: ORG-02, ORG-03.
- Source: `folder-name-dialog.component.*`.

### SCR-ORG-04 Rename folder dialog
- Route / how it opens: menu "Rename".
- Platforms: all.
- Regions: title "Rename folder"; Name field; footer.
- Controls: "Close"; "Cancel"; "Rename" (submit).
- Form fields: "Name" — text, required, prefilled, placeholder "For example, Reading list", max 100; errors "Enter a folder name", "Use 100 characters or fewer".
- Primary action: Rename → closes at once; optimistic rename; on failure toast "Couldn't rename the folder" / "The old name is back".
- States: none other.
- Features: ORG-04.
- Source: `folder-name-dialog.component.*`.

### SCR-ORG-05 Move folder dialog
- Route / how it opens: menu "Move to…".
- Platforms: all.
- Regions: title "Move “{name}”"; select; footer.
- Controls: "Close"; "Cancel"; "Move" (submit).
- Form fields: "Move to" — searchable select, default the current parent (or "Top level"), search label "Search folders", "No folders found"; excludes the folder and its descendants.
- Primary action: Move → closes at once; optimistic move to the end of the new parent; failure toast "Couldn't move the folder" / "It is back where it was".
- Features: ORG-05.
- Source: `move-folder-dialog.component.*`.

### SCR-ORG-06 Color and icon dialog
- Route / how it opens: menu "Color and icon…"; autofocus on the checked choice.
- Platforms: all (bottom sheet below 40em).
- Regions (top to bottom): title (folder name); preview (XL tile in chosen colour and symbol, name, meta "{n} links[, {n} subfolders]" — direct counts); Description field; "Color" group (8 built-in swatches on one line; own colours group "Your own colors" + "+" swatch); "Icon" group (segmented "Icon" / "Emoji"; panel: icon grid + "Show all icons ({count})"/"Show fewer", or emoji picker); "Highlight with background" settings row with switch; "Cover" picker; footer.
- Shown information: swatch names (Graphite, Sage, Ocean, Plum, Clay, Amber, Rose, Teal; own "Your color {colour}"); icon names (63, e.g. "Folder", "Briefcase", "Code", "Graduation cap", …, "Food" for utensils, "Light bulb", "Game controller", "Palm tree"); cover thumbnails.
- Controls: "Close"; colour swatches (radio); own swatch "×" remove ("Remove color {colour}", hidden for a colour only the folder wears); "+" "Add your own color" (opens SCR-ORG-08); segmented Icon/Emoji (panel region named after active tab); icon radios (arrow keys move across both grids); "Show all icons ({count})" / "Show fewer" (aria-expanded); emoji field (opens SCR-ORG-07); switch "Highlight with background"; cover radios; footer "Reset" (ghost), "Cancel", "Save" (primary submit).
- Form fields: "Description" — text, optional, placeholder "What’s in this folder?", hint "Optional, up to 140 characters. Shown under the folder name.", errors "Keep it to 140 characters." / "Use plain text on one line."; Color — radio grid, default current; Icon — radio grid, default current (or "folder"); Emoji — single emoji field, label "Emoji", hint "Use one emoji instead of an icon", placeholder "Choose an emoji", error "Enter exactly one emoji." (only checked on the Emoji tab); Highlight — switch, default current; Cover — image radio grid, default current or "No cover".
- Primary action: Save → closes at once; only changed fields are sent; optimistic; failure toast "Couldn't save the style" / "The old color and icon are back." Reset only changes the form (colour, icon, emoji, highlight; keeps description and cover).
- States: cover loading spinner "Loading pictures"; no pictures "Links in this folder with a preview picture can be its cover."
- Features: ORG-08..ORG-12.
- Source: `folder-style-dialog.component.*`, `folder-cover-picker.component.*`.

### SCR-ORG-07 Emoji picker (inside Color and icon)
- Route / how it opens: the Emoji field on the Emoji tab (names load on first open).
- Platforms: all.
- Regions: search; category tabs ("Categories": Food, Travel, Work, Sport, Home, Animals, Nature, Objects, Symbols); "Recent"; "Yours"; "Results" while searching.
- Controls: search "Search emoji"; category tabs; emoji buttons (choose); remove on own emoji "Remove emoji {emoji}" (absent if a folder wears it); "Close".
- Form fields: search text.
- Primary action: choose an emoji → the field holds it.
- States: "Loading emoji"; "No emoji found"; Undo toast "Emoji removed" ("Undo"); danger "Couldn’t remove the emoji".
- Features: ORG-09.
- Source: `libs/ui emoji-picker`, `folder-emoji.service.ts`.

### SCR-ORG-08 Own colour picker (inside Color and icon)
- Route / how it opens: "+" swatch "Add your own color".
- Regions: saturation/brightness area ("Saturation", "Brightness"), hue slider ("Hue"), "Hex code" field, buttons.
- Controls: "Add color", "Cancel"; picker name "Choose a color".
- Form fields: Hex code — "#rrggbb"; error "Enter # and six digits or letters a–f, like #2e6a99."
- Primary action: Add color → swatch saved to the account (max 12), chosen, picker closes and clears.
- Features: ORG-08.
- Source: `libs/ui color-picker`, `folder-style-dialog.component.ts` (addColour).

### SCR-ORG-09 Delete folder dialog
- Route / how it opens: menu "Delete folder…".
- Platforms: all.
- Regions: title; text; radio group (only when links exist); error notice; footer.
- Shown information: "Delete folder “{name}”?"; text variant (empty / subfolders only / links / both, with counted nouns "{n} link(s)", "{n} subfolder(s)").
- Controls: "Close"; "Cancel" (disabled while deleting); danger submit "Delete folder" / "Delete folder and {count} link(s)".
- Form fields: "What happens to the links" — radio, default "Move links to Unsorted" ("The folders are deleted, the link stays" / "…all {count} links stay"); option "Delete links too" ("They wait in Trash with the folder").
- Primary action: delete → waits; leaves a deleted folder's page for `/links`; toast "Folder moved to Trash" (detail name); no Undo.
- States: failure notice "Couldn't delete the folder. Nothing was changed."
- Features: ORG-13.
- Source: `delete-folder-dialog.component.*`.

### SCR-ORG-10 Folder page header (folder view)
- Route / how it opens: `/folders/:folderId`.
- Platforms: all; banner/cover/description hidden in split/preview-split.
- Regions: breadcrumbs ("Breadcrumb"); header (banner variant or plain variant); feed tools (other area); filter row (if filtered); subfolder tiles "Subfolders"; links (other area).
- Shown information: crumbs "All links" › ancestors › folder; big folder tile (banner variant), folder name (h1), description, cover; count line "{n} link(s)" / "{n}+ link(s)" / "{links}, {n} subfolder(s)"; subfolder tiles (tile, name, "{n} links[, {n} subfolders]", chevron).
- Controls: crumb links (and "Show hidden folders"); subfolder tile links ("Open folder {name}, …").
- Form fields: none.
- Primary action: open a subfolder / crumb.
- States: "Folder not found" / "This folder doesn't exist, or it was deleted." / "Show all links"; empty "This folder is empty" / "Add a link here, or move links from Unsorted." / "Open Unsorted" + "Add link"; count skeleton while loading.
- Features: ORG-15, ORG-16, ORG-17.
- Source: `library.page.html`, `library-head.service.ts`, `folder-tile.component.*`.

### SCR-ORG-11 Phone Library page
- Route / how it opens: `/library` (tab "Library"); redirects to `/links` from 64em.
- Platforms: compact.
- Regions: title "Library"; Pinned (card; empty "Nothing pinned yet" button); folder section (heading "Folders", "+" "New folder", tree with menus); tiles: All links, Unsorted, Favorites, Recently opened, Reminders, Trash; tags section (only while Ask is on).
- Shown information: tile labels and metas (counts; "{n} forgotten" / "{n} today"; "{n} due"; "{n} item(s)").
- Controls: tree rows/menus as SCR-ORG-01/02 (no fold chevron); tiles link to `/links`, `/unsorted`, `/favorites`, Recently opened sheet, `/reminders`, `/trash`.
- Primary action: navigate.
- States: tree skeleton (5 rows); "Couldn't load your folders." + "Try again" (larger button).
- Features: ORG-20, ORG-14, TAG-10.
- Source: `phone-library.page.*`, `library-tile.component.*`.

### SCR-TAG-01 Sidebar · Tags section
- Route / how it opens: desktop sidebar under Folders.
- Platforms: desktop (compact: SCR-TAG-06).
- Regions: header (h2 "Tags", fold chevron, "+"); body (notes, list).
- Shown information: tag chips (names), "+ {count} more" / "Show less".
- Controls: fold "Show or hide tags"; "+" "New tag" (toggles editor); chip click → filter; chip "…" "Actions for tag {name}"; right click / long press / Shift+F10 → SCR-TAG-02; "+ N more" (disclosure, aria-expanded).
- Form fields: inline editor (SCR-TAG-03).
- Primary action: filter by tag.
- States: "Couldn't load your tags." + "Try again"; "No tags yet. Add one with +."
- Features: TAG-01..TAG-07.
- Source: `sidebar-tags.component.*`.

### SCR-TAG-02 Tag menu
- Route / how it opens: from a chip (see above).
- Regions: summary line "{name}, {n} link(s)"; items.
- Controls (in order): "Show links"; "Rename"; "Merge into another tag…"; separator; "Delete tag" (danger).
- Features: TAG-07.
- Source: `sidebar-tags.component.html`.

### SCR-TAG-03 Inline tag editor (new / rename)
- Route / how it opens: "+" (new, at the top of the list) or menu "Rename" (in place of the chip).
- Regions: compact input; conflict line and merge button (rename); hint.
- Form fields: "New tag" / "Tag name" — text, placeholder "Tag name", hint "Enter saves, Esc cancels. Spaces become dashes."; errors "Enter a tag name", "Use 50 characters or fewer", "There's already a tag “{name}”.", "You have reached the limit of 1000 tags.", "Couldn't create the tag. Try again.", "Couldn't rename the tag. The old name is back."
- Controls: Enter (save), Esc (cancel); "Merge into “{name}”" (when rename conflicts, with "There's already a tag “{name}”. Merge them instead?").
- Primary action: save → toast "Tag “{name}” created" (new) or optimistic rename; focus on the chip.
- States: the editor widens when it shows an error or the merge offer.
- Features: TAG-02, TAG-04.
- Source: `sidebar-tags.component.html`, `tag-editor.service.ts`.

### SCR-TAG-04 Merge tag dialog
- Route / how it opens: menu "Merge into another tag…".
- Regions: title "Merge “{name}”"; text; select; notice; footer.
- Form fields: "Merge into" — searchable select, required, placeholder "Choose a tag", search "Search tags", "No tags found"; error "Choose a tag to merge into".
- Controls: "Close"; "Cancel" (disabled while merging); "Merge" (primary, spinner).
- Primary action: merge → closes; toast "Merged “{name}” into “{target}”".
- States: "Couldn't merge the tags. Try again."
- Features: TAG-05.
- Source: `merge-tag-dialog.component.*`.

### SCR-TAG-05 Delete tag confirmation
- Route / how it opens: menu "Delete tag".
- Regions: confirm dialog.
- Shown information: "Delete tag “{name}”?" / "It will be removed from {count} link. The link itself stays where it is." (other: "…{count} links. The links themselves stay where they are.")
- Controls: "Close", "Cancel", "Delete tag" (danger).
- Primary action: hides tag; Undo toast "Tag “{name}” deleted" / "Undo" (8 s).
- Features: TAG-06.
- Source: `tag-actions.service.ts`.

### SCR-TAG-06 Phone Tags tab
- Route / how it opens: `/tags` (tab "Tags"); redirects to `/links` from 64em.
- Platforms: compact.
- Regions: h1 "Tags" with "+"; chips list; tag menu.
- States: empty "No tags yet" / "Tags group links across folders. Add one here, or while you save a link." / "New tag".
- Features: TAG-09.
- Source: `tags.page.*`, `sidebar-tags.component.*` (asPage).

### SCR-TAG-07 Tag filter row (in the feed)
- Route / how it opens: any feed with `?tag=`.
- Regions: group "Filtered by tags": chips; "Clear filter".
- Controls: tag chip remove "Remove tag filter {name}"; "Clear filter" (clears search, tags and kind).
- States: empty "No links with these tags" / "Nothing you saved has all of the selected tags."
- Features: TAG-08.
- Source: `library.page.html`.

### SCR-RUL-01 Settings › Library › Rules section
- Route / how it opens: `/settings/library`.
- Platforms: all.
- Regions: title "Rules"; intro + "Add rule"; notice/empty/list; limit line.
- Shown information: per row: favicon letter, domain, folder tile + name or "Folder in Trash: only tags are added", tag chips (list "Tags").
- Controls: "Add rule" (disabled while not loaded or at limit); per row "…" "Actions for {domain}" (tooltip "More actions") → SCR-RUL-02; "Try again".
- States: "Couldn't load the rules."; empty "No rules yet. For example, links from youtube.com can go to Videos with the tag video."; limit "You can have up to 50 rules. Delete one first."
- Features: RUL-01..RUL-05.
- Source: `rules-section.component.*`.

### SCR-RUL-02 Rule row menu
- Controls (in order): "Edit" (edit icon); "Apply to existing links" (folder-move); separator; "Delete rule" (danger).
- Features: RUL-03, RUL-04, RUL-05.
- Source: `rules-section.component.html`.

### SCR-RUL-03 Add / Edit rule dialog
- Route / how it opens: "Add rule"; menu "Edit"; link menu "Create a rule for {domain}…".
- Platforms: all (medium dialog; sheet below 40em).
- Regions: title "Add rule" / "Edit rule"; Domain; Folder group (notice if trashed); Tags; error notice; footer.
- Form fields: "Domain" — text, required, placeholder "youtube.com", hint "Also matches its subdomains, such as m.youtube.com", normalized on blur; errors "Enter a domain", "Enter a domain such as youtube.com". "Folder" — picker list, optional, default "No folder" (or the rule's live folder), recent folders first ("Recent" label from move picker), search "Search folders", no results (links move picker copy). "Tags" — tag input with suggestions (counts), max 5 ("Up to 5 tags"), placeholder/labels from the link form.
- Controls: "Close"; "Cancel" (disabled while saving); "Save rule" / "Saving…".
- Primary action: save → closes; toast "Rule added" / "Rule saved" (detail "{domain}: {target}").
- States: notices "Choose a folder or add at least one tag.", "There is a rule for this domain already.", "You can have up to 50 rules. Delete one first.", "This folder is gone. Choose another one.", "This rule was deleted meanwhile.", "Couldn't save the rule. Try again."; trashed folder notice "The folder of this rule is in Trash. Choose another one or keep only the tags."
- Features: RUL-02, RUL-03, RUL-06.
- Source: `rule-dialog.component.*`, `rule-form.service.ts`.

### SCR-RUL-04 Apply rule confirmation
- Shown information: "Apply the rule for {domain}?" / "{count} link(s) in Unsorted get(s) the folder and tags of this rule: {target}." [+ "There are {total} in all. Apply it again for the rest."].
- Controls: "Close", "Cancel", "Apply to {count} link(s)".
- Primary action: bulk update; toast "Rule applied to {count} link(s)" with "Undo".
- Features: RUL-05.
- Source: `rule-actions.service.ts`.

### SCR-RUL-05 Rule offer toast
- Route / how it opens: after filing links while AI is on.
- Shown information: folder tile; "Always put {domain} links in {folder}?"; "Your last {count} link(s) from this site is/are there. A rule works without AI."
- Controls: "Create rule" (primary action); "Not now" (secondary); close (= Not now). Sticky.
- Primary action: create → "Rule created" toast with "Apply to Unsorted".
- Features: RUL-10.
- Source: `rule-offer.service.ts`.

### SCR-RUL-06 Rule chip in save forms (entry)
- Shown information: "Rule: {domain} → {target}" chip in Add link; per-line chips and "Apply domain rules" checkbox in Paste many.
- Controls: chip remove "Don't apply the rule for {domain}".
- Features: RUL-07, RUL-08.
- Source: `rule-suggestion.service.ts`, `batch-rule.service.ts`.

### SCR-TRS-01 Trash page
- Route / how it opens: `/trash`.
- Platforms: desktop and compact (top bar with "Library" back and "Empty").
- Regions: (compact top bar); header (h1 "Trash", count line, "Empty trash" desktop); tools ("Select all" checkbox when selecting; filter "Show"); group "Recently deleted" with rows; footer note; (compact) swipe hint; selection toolbar.
- Shown information: count "{n} item(s), kept for {days} days" / "Nothing here"; filter counts; rows (SCR-TRS-02).
- Controls: "Library" (back, compact); "Empty" (compact, when not empty) / "Empty trash" (desktop, trash icon); "Select all"; filter "All {n}", "Links {n}", "Folders {n}"; row controls; toolbar "Restore", "Delete forever", "Clear selection".
- Primary action: restore.
- States: skeleton "Loading Trash"; error "Couldn't load Trash" / "Check your connection and try again." / "Try again"; empty "Trash is empty" / "Deleted links and folders wait here for {days} days, so nothing is gone by accident."; filter empty "Nothing of this kind in Trash" / "Show everything to see what else is waiting here." / "Show all".
- Features: TRS-01, TRS-02, TRS-05, TRS-06.
- Source: `trash.page.*`.

### SCR-TRS-02 Trash row (desktop) and its menu
- Shown information: checkbox "Select {title}"; preview (image, letter, or folder tile); title; "From {folder}" / "From Unsorted" / "{n} links"; "Deleted {when}"; badge "{n} day(s) left" / "Less than a day left" (warning ≤3 days).
- Controls: checkbox; "Restore" ("Restore {title}"); "…" "More for {title}" (tooltip "More actions") → menu with one item "Delete forever" (danger). Row click toggles selection.
- Features: TRS-03, TRS-04, TRS-08.
- Source: `trash-row.component.*`.

### SCR-TRS-03 Trash row (phone swipe)
- Shown information: as SCR-TRS-02 without the action column; checkbox only while selecting.
- Controls: swipe left / tap reveals "Restore" ("Restore {title}") and "Delete" ("Delete {title} forever", danger); long press starts selection.
- Features: TRS-06, TRS-07.
- Source: `trash-row.component.*`.

### SCR-TRS-04 Trash selection toolbar
- Shown information: "{n} selected".
- Controls: "Restore" (undo icon), "Delete forever" (trash icon), close "Clear selection".
- Features: TRS-06.
- Source: `trash.page.html`.

### SCR-TRS-05 Delete forever confirmation
- Shown information: "Delete forever?" with "“{title}” will be deleted for good. This can’t be undone." / "The folder “{title}” and its {n links} will be deleted for good. This can’t be undone." / "{n items} will be deleted for good. This can’t be undone."
- Controls: "Close", "Cancel", "Delete forever" (danger).
- Features: TRS-04.
- Source: `trash-actions.service.ts`.

### SCR-TRS-06 Empty trash confirmation
- Shown information: "Empty trash?" with the message variants (see TRS-05).
- Controls: "Close", "Cancel", "Delete {count} item(s)" (danger).
- Features: TRS-05.
- Source: `trash-actions.service.ts`.

### SCR-TRS-07 Shorten retention confirmation (Settings › Library)
- Shown information: "Shorten how long Trash keeps items?" / "{count} item(s) in Trash is/are older than {days} days and will be deleted for good tonight."
- Controls: "Close", "Cancel", "Keep for {days} days" (danger).
- Features: TRS-09.
- Source: `settings/pages/library/library.page.ts`.

### SCR-REM-01 Reminders page
- Route / how it opens: `/reminders`.
- Platforms: desktop and compact (back "Library").
- Regions: (compact back); header (h1 "Reminders", count line); groups Due / Today / Tomorrow / This week / Later; footer note.
- Shown information: "{n} reminder(s) is/are due" / "Nothing is due right now"; rows (SCR-REM-02).
- Controls: row open; Done; Snooze.
- Primary action: open a link.
- States: skeleton "Loading reminders"; error "Couldn't load your reminders" / "Check your connection and try again." / "Try again"; empty "No reminders yet" / "Choose “Remind me” in the menu of a link, and it comes back here on the day you pick."
- Features: REM-05, REM-06, REM-07.
- Source: `reminders.page.*`.

### SCR-REM-02 Reminder row and snooze menu
- Shown information: preview image or site letter; title; desktop: site host + time badge; compact: badge in place of the host; badge bell icon, accent (upcoming) or warning (due) with "Today, 18:00" / "Due 3 hours ago".
- Controls: row (opens link, in new tab per setting; description "Opens in a new tab"); "Done" ("Mark the reminder of {title} as done"; icon-only with tooltip on compact); "Snooze" ("Snooze the reminder of {title}"; icon-only on compact) → menu: presets (label + time hint) in order Later today (until 17:00) / Tomorrow / This weekend (Mon–Fri) / Next week / In a month; separator; "Pick date and time…" (calendar icon).
- Features: REM-06, REM-07, REM-08.
- Source: `reminder-row.component.*`.

### SCR-REM-03 Remind me dialog (quick choices)
- Route / how it opens: "Remind me…" / "Change reminder…" in link menus, Edit link, bulk "Remind", snooze "Pick date and time…".
- Platforms: all; bottom sheet below 40em.
- Regions: title ("Remind me" or "Remind me about {count} link(s)"); subtitle (link title, single only); "Current reminder: {when}" (if set); list "Quick choices"; time zone note; footer.
- Controls: preset buttons (label + time hint); "Pick date and time…"; footer "Remove reminder" (only if a reminder exists, single link), "Cancel"; "Close".
- Primary action: a preset → closes; save; toast "Reminder set for {when}".
- States: failure toast "Couldn't save the reminder" with "Retry".
- Features: REM-01, REM-03, REM-04.
- Source: `remind-dialog.component.*`.

### SCR-REM-04 Remind me dialog (pick date and time)
- Regions: calendar; Time field; past warning; time zone note; footer.
- Form fields: date — calendar, required, min today, default today; "Time" — time input, optional, default 09:00, hint "Optional; 9:00 when left empty".
- Controls: "Previous month", "Next month"; "Remove reminder" (if set); "Cancel"; primary "Remind me {when}" / "Pick a day" (disabled).
- States: "This time has already passed. Pick a later one."
- Features: REM-02.
- Source: `remind-dialog.component.*`.

### SCR-REM-05 Due reminders toast (app open)
- Shown information: "A reminder is due" / "{count} reminders are due"; detail title (single).
- Controls: "Show" (→ `/reminders`); dismiss.
- Features: REM-10.
- Source: `reminder-notice.service.ts`.

## 4.3 Search and AI

### SCR-SRC-01 Search dialog (command palette)
- Route / how it opens: no route. Cmd/Ctrl+K below 80em, the header "Search" button (64–80em), the phone/tablet "Search" tab. Not opened while another dialog is open.
- Platforms: below 40em full screen (no grip, no rounded corners, no drag to close); from 40em a glass command dialog over a scrim (Esc and the scrim close it).
- Regions: (1) search field row: search icon, input, key cap "Esc" at the end; (2) results list (scrolls): link group, "Related by meaning" group, "Folders and tags" group, "Ask your shelf" group; or the empty block; (3) note area: "getting ready" AI line, backfill reminder; (4) footer with keyboard hints. Dialog title "Search" (accessible), close button "Close search".
- Shown information:
  - Link group heading: "{{count}} link(s)" or "{{count}}+ link(s)" when more exist. Each row: favicon/letter, highlighted title, meta "host" + "in {{folder}}" + "note matches: <highlighted note>".
  - "Show all results for “{{query}}”" row (search icon) when more.
  - "Related by meaning" (spark heading; lead "No links with these words" when there are no word matches): favicon, title, host, spark + "Close to: …".
  - "Folders and tags": folder rows (folder icon, highlighted path "Parent / Child", trailing "{{count}} link(s)"); tag rows (tag icon, highlighted name, meta "Tag, {{count}} link(s)").
  - "Ask your shelf" group: spark + "Ask your shelf: “{{query}}”" (from 64em) or "Ask your shelf about this" (below 64em).
  - Status region: "{{count}} result(s)" (visually hidden when 0).
  - Footer: "↑ ↓ move", "↵ open", "Ctrl ↵" / "⌘ ↵ open in background".
- Controls:
  - Input (combobox): label "Search links, folders and tags", placeholder "Search links, folders and tags".
  - Rows: Enter/click chooses; Ctrl/Cmd+Enter or click opens links in background.
  - Backfill reminder: "Process" (secondary, small, loading while starting), × icon "Hide".
  - Close button "Close search"; Esc closes from anywhere inside.
- Form fields: search text, free text, optional, no default; used up to 5 words / 200 characters.
- Primary action: open the highlighted link (new tab; dialog closes); folder/tag/"Show all" navigate and close; Ask row closes and hands over to Ask.
- States: "Search your shelf" / "Titles, notes, tags and sites show up as you type."; "Searching…"; "Couldn't search. Try again."; "Nothing found for “{{query}}”" / "Try another word. Search looks through titles, notes, tags and sites."; AI off: no meaning group, no Ask row, no reminder; "Search by meaning is getting ready: {{ready}} of {{total}} links. Word matches work as usual." once per session.
- Features: SRC-01…SRC-06, SRC-08, SRC-09, AI-08.
- Source: `features/search/components/search-dialog/*`, `search-results/*`.

### SCR-SRC-02 Header search field with results panel (from 80em)
- Route / how it opens: always in the desktop header from 80em (not on settings pages); typing or ArrowDown opens the panel; Cmd/Ctrl+K focuses the field.
- Platforms: desktop ≥80em. From 64em to 80em the header shows instead a secondary button "Search" + key cap "⌘K"/"Ctrl K" that opens SCR-SRC-01. Next to the field (or button) sits the "Ask" header button while Ask is on.
- Regions: field (search icon, input, key cap "⌘K"/"Ctrl K"); glass panel under the field with the same groups, empty block, note area and footer as SCR-SRC-01.
- Shown information: as SCR-SRC-01.
- Controls: as SCR-SRC-01; Esc 1 closes the panel and keeps the text, Esc 2 clears; outside press/blur/choose closes; Tab from the field moves to the reminder's buttons.
- Form fields: as SCR-SRC-01.
- Primary action: as SCR-SRC-01; navigation and the Ask row clear the field; a link opened in the background keeps the panel.
- States: as SCR-SRC-01.
- Features: SRC-01…SRC-09, AI-08.
- Source: `components/header-search/*`, `search-results/*`, `shell/app-shell.component.html`.

### SCR-AI-01 Settings › AI page
- Route / how it opens: `/settings/ai`; settings nav "AI"; phone You › AI. Page header title "AI", description "Help with organising, only when you want it. Off until you turn it on.".
- Platforms: desktop segmented controls; phone rows with chevrons to SCR-AI-02; summaries hint hidden on phone.
- Regions (top to bottom):
  1. Load error notice (if any); provider-down AI line (AI on + provider unavailable).
  2. Section "AI features": row "Use AI in Shelfmark" (spark icon) with hint + switch. While on: "Folder" row, "Tags" row, "Summaries" row, "Search by meaning" row, "Ask your shelf" row.
  3. (AI on) Section "What is sent": "Include my notes" switch, "Summary language" select.
  4. (AI on) Section "This month": usage line + reset date + meter; limit notice; backfill row (AI pack only).
  5. (loaded) Section "Your AI data": "Delete AI data" row; "How AI works in Shelfmark" row.
  6. Section "Connect your assistant" (SCR-MCP-01).
- Shown information: usage "{{used}} of {{limit}} links this month", "Resets on {{date}}"; meaning readiness line; Ask allowance line "{{count}} question(s) left today/this month" next to the Ask switch; backfill states (AI-12).
- Controls (in order):
  - Switch "Use AI in Shelfmark" (disabled until loaded) — description "Sends a link’s address, title and a short excerpt of the page to our AI provider to suggest tags and write summaries. Never used to train models, never used for statistics."; first on opens SCR-AI-03.
  - Folder: desktop segmented control "Suggest | Automatic | Off" (named by the row title) with hint "Suggest: a chip you tap. Automatic: only when you leave a link in Unsorted, with Undo. A folder you pick is never changed."; phone a ghost button showing the current mode with chevron (accessible "Folder: {{mode}}") → `/settings/ai/folder`.
  - Tags: same, hint "Suggest: chips you tap. Automatic: only when you add no tags yourself, with Undo." → `/settings/ai/tags`.
  - Switch "Summaries" — "One or two sentences on each link, so you remember why you saved it. Edit them any time." (desktop only).
  - Switch "Search by meaning" — "Finds links by what they’re about, not only by their words, and shows related links. Sends each link’s title, tags and summary (your note too, with “Include my notes”) and what you search for to Voyage AI." + readiness line.
  - Switch "Ask your shelf" — "Answers questions from your own links, also follow-ups. Uses Claude by Anthropic: your question, the earlier turns of the open chat and the links it looks up are sent; nothing is stored." + allowance line.
  - Switch "Include my notes" — "Notes make suggestions more accurate. When off, your notes never leave Shelfmark."
  - Select "Summary language" — options "Match the app ({{language}})" then every interface language (by its own name); hint "Summaries are written in this language, whatever the page is in."
  - Backfill: "Start" (disabled while AI off) / "Stop".
  - "Delete AI data" (danger, small) — hint "Removes every summary and suggestion AI made and turns search by meaning off. Your own edits, tags and folders stay." → SCR-AI-06.
  - "Read" (accessible "Read how AI works in Shelfmark") — hint "What is sent, to whom, how long it is kept, and how to turn it off" → `/privacy#ai`.
- Form fields: main switch (default off); folder mode (default Suggest); tags mode (default Suggest); Summaries (default on); Search by meaning (default on for new rows); Ask your shelf (default on); Include my notes (default off); Summary language (default "Match the app").
- Primary action: each control saves at once; failure toast "Couldn’t save your AI settings" / "The change was undone. Try again." and the control reverts.
- States: off: only the main switch, Your AI data, Connect your assistant; loading; load failed "Couldn’t load your AI settings." + "Try again"; limit reached notice "You used this month’s {{limit}} links. New links save as usual, without suggestions or summaries, until {{date}}."; provider down "AI isn’t responding right now. Your links save as usual; suggestions and summaries catch up when it’s back."; meaning quota "Paused until {{date}}: this month’s limit".
- Features: AI-01, AI-05, AI-07, AI-08, AI-10, AI-12…AI-15, MCP-01.
- Source: `features/settings/pages/ai/*`, `features/ai/components/ai-usage-section/*`, `meaning-search-control/*`, `ask-control/*`.

### SCR-AI-02 Settings › AI › Folder / Tags (phone mode page)
- Route / how it opens: `/settings/ai/folder`, `/settings/ai/tags` from the rows of SCR-AI-01 on a phone (the routes exist on every size).
- Platforms: designed for phone.
- Regions: page header (title "Folder" or "Tags", back to "AI"); section "Folder suggestions" / "Tag suggestions" with a radio group; note under it.
- Shown information: three options with descriptions; note "A folder you pick yourself is never changed by AI." / "Tags you add yourself are never removed by AI.".
- Controls: radio group (named "Folder suggestions"/"Tag suggestions"; disabled while AI is off):
  - "Suggest" — folder: "A chip you tap. Nothing changes until you do."; tags: same text.
  - "Apply automatically when I don’t choose" — folder: "Only for links left in Unsorted. You see it and can undo it."; tags: "Only for links you save without tags. You see it and can undo it."
  - "Off" — "No folder suggestions." / "No tag suggestions."
- Form fields: mode radio (default Suggest).
- Primary action: saves at once; failure toast and revert.
- States: AI off → radios disabled.
- Features: AI-04, AI-05.
- Source: `features/settings/pages/ai-mode/*`.

### SCR-AI-03 AI intro dialog (step 1, consent)
- Route / how it opens: turning on "Use AI in Shelfmark" the first time; "Turn on AI…" in the announcement.
- Platforms: desktop dialog (medium); phone bottom sheet with title "Turn on AI?" and full-width buttons.
- Regions: head (spark tile, visible title "Turn on AI in Shelfmark?", × "Close"); six points with icons; details line with policy link; failure notice; footer buttons.
- Shown information (points in order):
  1. "Suggests tags and a folder" — "From the ones you already have. You decide: nothing is applied unless you tap it or choose Automatic in settings."
  2. "Writes short summaries" — "One or two sentences per link. Marked as made by AI and may be inaccurate; edit them any time."
  3. "Finds links by meaning" — "Search and related links also match what a link is about. For this, titles, tags, summaries and your search text go to Voyage AI. Turn it off on its own in Settings › AI."
  4. "Answers questions from your links" — "Only when you ask: your question and the matching links go to the model. The answer lists its sources and nothing is stored. Turn it off on its own in Settings › AI."
  5. "What is sent to the model" — "A link’s address, title, description and text extracted from the page. Never your other links, your notes (unless you allow it) or anyone else’s data."
  6. "Not used for training" — "Your content is never used to train models. Anthropic processes it for us and deletes it within 30 days."
  - Details: "You can turn AI off, or one feature at a time, in Settings › AI." + ghost link "Read the privacy policy" (new tab, `/privacy#ai`).
- Controls: × "Close" (AI stays off); "Not now" (secondary); "Turn on AI" (primary, loading while saving).
- Form fields: none.
- Primary action: "Turn on AI" → saves; closes, or shows step 2 (SCR-AI-04) when older links can be processed.
- States: failed: notice "Couldn’t turn on AI. Try again.".
- Features: AI-02.
- Source: `components/ai-intro-dialog/*`, `models/ai-intro-points.const.ts`.

### SCR-AI-04 AI intro step 2: process saved links
- Route / how it opens: after "Turn on AI" when there are older links within the allowance.
- Platforms: as SCR-AI-03.
- Regions: head (spark tile, heading "AI is on. Process your {{count}} saved link(s)?", × "Close"); lead; check list; action buttons; settings note.
- Shown information: lead "Links you saved earlier haven’t been read by AI yet. It will write short summaries and suggest tags and folders, and search by meaning will find them like new ones."; checks "Nothing changes without your choice: suggestions wait for you.", "Runs in the background, usually a few minutes. Stop any time.", "Doesn’t use the monthly limit: there is a separate allowance of {{allowance}} links."; note "Change your mind? Start it any time: Settings › AI › Process existing links" (link to `/settings/ai#ai-backfill`, closes) and "A reminder also appears in search.".
- Controls: "Process {{count}} link(s)" (primary, full width, loading); "Later" (ghost); × "Close"; the note's link.
- Form fields: none.
- Primary action: starts the backfill and closes; refusal keeps the step with the toast "Couldn’t start processing your links".
- States: —
- Features: AI-02, AI-12.
- Source: `components/ai-intro-dialog/*`, `models/ai-backfill-offer-points.const.ts`.

### SCR-AI-05 AI announcement dialog
- Route / how it opens: automatically once (AI-03).
- Platforms: desktop dialog; phone bottom sheet.
- Regions: × close (top), animated spark tile with glow, heading and lead, four feature cards, actions, note.
- Shown information: title "Shelfmark can now help with AI"; lead "It’s off until you turn it on. Your choice always wins, and every suggestion can be undone."; cards "Folder and tags" — "Suggested as you save, one click to fill in"; "Short summaries" — "Two lines on each card, so you know why you saved it"; "Search by meaning" — "Finds links even when the words don’t match"; "Ask your shelf" — "Questions answered from your links, with sources"; note "Next you’ll see what is sent and where, then choose. You can turn it off any time in Settings › AI."
- Controls: "Turn on AI…" (primary, focused on open) → opens SCR-AI-03; "Not now" (ghost); × "Close".
- Form fields: none.
- Primary action: Turn on AI… → AI intro.
- States: —
- Features: AI-03.
- Source: `components/ai-announce-dialog/*`.

### SCR-AI-06 Delete AI data confirmation
- Route / how it opens: "Delete AI data" on SCR-AI-01.
- Platforms: confirm dialog (sheet on phone).
- Regions: title, message, buttons.
- Shown information: "Delete AI data?" / "Every summary and suggestion AI made is removed, and search by meaning turns off. Your own edits, tags and folders stay. This can’t be undone."
- Controls: "Delete AI data" (destructive), "Cancel", close "Close".
- Form fields: none.
- Primary action: deletes; toast "AI data deleted"; feed reloads. No undo.
- States: failure toast "Couldn’t delete AI data" / "Nothing was removed. Try again.".
- Features: AI-14.
- Source: `ai-settings-actions.service.ts`.

### SCR-AI-07 Ask your shelf panel (drawer)
- Route / how it opens: no route; header "Ask" button, search Ask row (from 64em); opening `/ask` from 64em.
- Platforms: desktop and tablet with header (from 64em): 440px drawer from the inline-end edge, accessible name "Ask your shelf"; resizable (handle "Resize the panel"); close "Close Ask your shelf".
- Regions: head (spark tile, h2 "Ask your shelf", allowance line; ✎ "New conversation" icon button with tooltip once there are entries; close); conversation (empty state with starters, or entries); composer at the bottom with footer line.
- Shown information: allowance "{{count}} question(s) left today" / "… this month"; empty "What do you want to find out?", lead, "Try", starter cards (icon, text, chevron); entries: question bubble, streamed answer with citation chips, status pill, link cards ("Links found" list), "Show all {{count}} in search", "The answer was cut short.", "Sources from your shelf" list, disclaimer "Generated by AI, may be inaccurate", not-found actions, lines; "Only the last 10 questions are remembered in this conversation."
- Controls:
  - ✎ "New conversation" (clears and stops).
  - Starter card (asks it).
  - Citation chip "Source {{n}}" (scrolls/highlights; disabled when the link is gone).
  - Link card (opens the link, new tab per setting "Open links in"; description "opens in a new tab" when so); "⋯" "More actions for “{{title}}”" → SCR-AI-09.
  - "Show all {{count}} in search" (closes panel, opens the feed with words, folder/Favorites, tags, kind).
  - Source row: opens link; icon button "Open side by side" (from 80em); icon button "Remind me".
  - Not found: "Search “{{query}}”" (question cut to 40 characters with …), "Add a link" (closes panel, opens Add link).
  - Line button "Try again" (errors that did not count).
  - Composer: textarea (hidden label "Ask about your links", placeholder "Ask about your links" / after an answer "Ask something else…", 1–5 rows auto-grow), round send button "Ask" (enabled with ≥3 characters), "Stop" while streaming. Enter sends, Shift+Enter new line.
- Form fields: question, free text, 3–500 characters; disabled while streaming or at 0 questions left.
- Primary action: Ask → streams the answer; focus returns to the field when the answer ends if it had focus.
- States: see AI-10 States (exact copy there and in Errors table); footer "Answers use only your links. Nothing is changed in your library."
- Features: AI-10, SRC-08.
- Source: `components/ask-drawer/*`, `ask-heading/*`, `ask-conversation/*`, `ask-entry/*`, `ask-link-cards/*`, `ask-sources/*`, `ask-composer/*`.

### SCR-AI-08 Ask your shelf full screen (phone/tablet)
- Route / how it opens: `/ask` via the "Ask" tab (below 64em, while Ask is on) or the search dialog's Ask row; guard sends to `/library` when Ask is off; guests to sign-in.
- Platforms: mobile shell only; the tab bar hides (pushed page); from 64em the page redirects to `/links` and opens SCR-AI-07.
- Regions: top bar ("Back" ghost button with chevron; ✎ "New conversation" icon once there are entries); heading (spark tile, h1 "Ask your shelf", allowance); conversation (h2 empty title); composer in a glass bar at the bottom.
- Shown information: as SCR-AI-07; link cards full width.
- Controls: "Back" (previous page, else Library); as SCR-AI-07 minus resize/close; "Open side by side" not shown below 80em.
- Form fields: as SCR-AI-07.
- Primary action: as SCR-AI-07.
- States: as SCR-AI-07; Ask turned off meanwhile → leaves for Library.
- Features: AI-10.
- Source: `pages/ask/*`.

### SCR-AI-09 Ask link card menu
- Route / how it opens: "⋯" on a link card in an Ask answer.
- Platforms: menu, aligned end.
- Regions: menu items.
- Shown information: —
- Controls (in order): "Open side by side" (columns icon; only from 80em; closes the panel and opens All links with the link's folder in the right half); "Remind me" (clock icon; reminder presets, reminders area).
- Form fields: none.
- Primary action: as items.
- States: —
- Features: AI-10.
- Source: `components/ask-link-cards/*`, `services/ask-source-actions.service.ts`.

### SCR-AI-10 Tidy Unsorted
- Route / how it opens: `/unsorted/tidy` from "Tidy with suggestions {n}" in the Unsorted header (desktop toolbar and phone tools row, not in the split view), or with `?import=<id>` from the import toast. Guard: AI on else `/unsorted`.
- Platforms: desktop list rows, Cancel/Apply in the header; mobile shell cards, pushed page, glass bar at the bottom.
- Regions: progress bar; top ("Unsorted" back link); header (h1 "Tidy Unsorted", lead, actions); import line; list "Links with suggestions"; "more" block; phone action bar "Apply suggestions".
- Shown information: lead "Suggestions for {{count}} link(s). Tap a chip to leave it out."; per row: title, favicon, host, chips (folder chip with folder colour and icon; tag chips; new tag chips marked "New") or "Skipped — stays in Unsorted"; "{{count}} more link(s) after these. Links without suggestions are not listed."; import line "Showing only the links of this import.".
- Controls:
  - "Unsorted" (back), "Cancel" (secondary) → Unsorted.
  - Chip toggle (accessible "Move to {{name}}, added" / "Move to {{name}}" etc. by state); × on a left-out chip "Dismiss suggestion {{name}}" (hidden for good).
  - "Skip" / "Undo skip" (focus moves to the replacement button).
  - "Show the next links" (when nothing on this page is applied and more follow).
  - "Review everything" (removes the import limit).
  - "Apply to {{count}} link(s)" (primary; disabled at 0; loading).
- Form fields: none (chip toggles).
- Primary action: Apply → toast "Tidied {{count}} link(s)" with detail and Undo; the list reloads (next page when more remained).
- States: loading "Loading suggestions"; empty "Nothing to tidy" / "Every link here either has no suggestions yet or you already sorted it. New links get suggestions within a minute." / "Back to Unsorted"; failure toast "Couldn’t tidy the links" / "Nothing was changed. Try again."; info "Nothing to apply" / "The suggestions changed meanwhile.".
- Features: AI-11, AI-18.
- Source: `pages/tidy/*`, `components/tidy-entry/*`, `components/tidy-row/*`.

### SCR-AI-11 Tidy entry button (Unsorted header)
- Route / how it opens: on `/unsorted` (library page) while AI is on and the tidy count > 0.
- Platforms: desktop toolbar; phone tools row; hidden in the split view.
- Regions: one button.
- Shown information: "Tidy with suggestions" with spark and an animated count badge.
- Controls: button → `/unsorted/tidy`.
- Form fields: none.
- Primary action: open Tidy.
- States: hidden with AI off or count 0; count refreshed when pending jobs drop to 0 and after a Tidy run/Undo.
- Features: AI-11.
- Source: `components/tidy-entry/*`, `services/tidy-count.store.ts`, `features/library/library.page.html`.

### SCR-AI-12 Library clean-up page
- Route / how it opens: `/settings/library/cleanup` from Settings › Library › "Review"; phone You › Library.
- Platforms: desktop header actions; mobile shell action bar "Clean-up actions" above the tab bar.
- Regions: progress bar ("Loading the clean-up report"); page header (title "Clean up your library", description = lead or "Checked {{when}}. Nothing changes until you apply; you can undo the whole run.", back "Library"); header actions (report view); body by state; footer AI line; phone bar.
- Shown information:
  - Never: panel with "Shelfmark looks for extra copies of the same link and for tags that mean the same. You review every change, and one Undo reverts the whole run."
  - Checking: spinner, "Checking your library…", "{{checked}} of {{total}} links. You can leave this page; we’ll keep the report." (or "You can leave this page; we’ll keep the report."), meter "Clean-up progress".
  - Report: group "Duplicates" ("Extra copies go to Trash"): checkbox labelled with the kept link's title, hint "Saved {{saved}} times: keep the one in {{place}} ({{why}}), move {{count}} copy/copies to Trash" (same address; place "Unsorted" when no folder) or "{{hosts}}: keep {{keep}} ({{why}}), move {{count}} copy/copies to Trash" (same page), badge "Same address" / "Same page" (spark + tooltip "Generated by AI, may be inaccurate" when found by AI). Keep reasons: "it is in a folder", "it has a note", "it has a reminder", "it has more tags", "it is a favourite", "you opened it last", "it was saved first". Group "Similar tags" ("Merged into the first one"): checkbox "{{keep}} ← {{merge}}", hint "{{count}} link(s) get(s) “{{keep}}”; “{{merge}}” is removed", badge "Found by AI" (AI pairs), button "Keep “{{merge}}” instead".
- Controls: "Include AI checks" switch ("Also finds the same page under another address and tags with the same meaning.", only when available); "Check my library" / "Check again" / "Try again" (primary, loading); row checkboxes; swap button; "Cancel" (→ Settings › Library); "Apply {{count}} change(s)" (primary, disabled at 0, loading).
- Form fields: Include AI checks (switch, default on, shown only when AI checks can run); row checkboxes (default checked).
- Primary action: Apply → toast "Cleaned up {{count}} thing(s)" with Undo; the report re-reads.
- States: see AI-17 (exact copy).
- Features: AI-17.
- Source: `features/cleanup/cleanup.page.*`, `components/*`, `services/*`.

### SCR-AI-13 AI parts of Add link / Edit link (regions of another screen)
- Route / how it opens: Add link dialog/sheet and Edit link dialog/sheet (links area), while AI is on.
- Platforms: desktop dialog; phone sheet (Fill button full width, label "Fill").
- Regions: "Fill in with AI" button (dialog footer area); under Folder: "Moved by AI" + Undo (edit), folder suggestion row ("Suggested" / "Also fits"); under Tags: "{{count}} added by AI" + Undo (edit), AI line or tag suggestion row ("Suggested", skeleton "Suggesting…", "Add all"); Summary field (Edit link when the link has a summary or AI writes them; Add link after Fill) with "Written by AI"/"Edited by you" and "Rewrite".
- Shown information: chips (folder chip with colour/icon; tag chips; "New" label on new tags).
- Controls: Fill in with AI (Alt+Shift+F); chip accept/dismiss; Add all; Undo (folder/tags); Rewrite; AI line actions "Try again" / "AI settings".
- Form fields: Summary (textarea, optional, max 300, message "Keep the summary under {{max}} characters.").
- Primary action: belongs to the dialog (Create link / Save).
- States: AI off: none of these; limit line; unavailable line; draft running (Fill busy, fields locked).
- Features: AI-04…AI-07, AI-16.
- Source: `features/links/components/add-link-ai/*`, `add-link/add-link-dialog.component.html`, `features/ai/components/suggestion-rows|ai-applied|summary-field/*`.

### SCR-AI-14 Related links popover (link preview)
- Route / how it opens: "Related · {{count}}" button in the link preview panel (small) or preview page; click (no hover).
- Platforms: desktop panel and phone page.
- Regions: popover heading "Related on your shelf"; list.
- Shown information: favicon, title, spark + "Close to: {{reasons}}" or host.
- Controls: row (switches the preview to that link; popover closes).
- Form fields: none.
- Primary action: open that link's preview.
- States: hidden when not ready/empty/failed/off.
- Features: AI-09.
- Source: `components/related-links/*`.

### SCR-MCP-01 Connect your assistant (section of Settings › AI)
- Route / how it opens: bottom of `/settings/ai`.
- Platforms: all; one column on phone.
- Regions: title "Connect your assistant"; lead; notices (demo/Pro/load error); "1. Server address" with code and Copy; "2. Personal token" row with Create token; "Connected" list or empty state; how-to toggle and panel.
- Shown information: server URL; per token: avatar, name, "Ends in {{last4}}", usage line, "Includes notes" badge.
- Controls (in order): "Copy" (server address); "Create token" (disabled until loaded / not available / at limit) → SCR-MCP-02; per token "Revoke" → SCR-MCP-03; "How to connect: Claude, Cursor, VS Code" toggle; per client "Copy"; "Try again" on load error.
- Form fields: none.
- Primary action: Create token.
- States: see MCP-01.
- Features: MCP-01…MCP-03, MCP-05.
- Source: `features/ai/connect/components/connect-assistant/*`, `mcp-how-to/*`.

### SCR-MCP-02 Create token dialog (two steps)
- Route / how it opens: "Create token".
- Platforms: dialog (md); bottom sheet below 40em.
- Regions: title ("Create a token" → "Token for {{name}}"), body, footer.
- Shown information: step 1 fields; step 2 masked token, warning, optional fallback field and notice.
- Controls: step 1: "Cancel" (disabled while saving), "Create token"/"Creating…" (submit), close "Close"; step 2: "Copy" (primary), "Done".
- Form fields: Name (text, required, placeholder "Claude Desktop", 1–40 characters, blank counts as empty; messages "Give the token a name." / "Use at most {{max}} characters."); Include my notes (switch, default off, disabled while saving).
- Primary action: create → step 2; Done closes (secret cleared).
- States: error notices "You have {{max}} tokens. Revoke one to create another.", "Connecting an assistant is part of Pro.", "Couldn’t create the token. Try again."; copy fallback.
- Features: MCP-02.
- Source: `components/create-token-dialog/*`.

### SCR-MCP-03 Revoke token confirmation
- Route / how it opens: "Revoke" on a token.
- Platforms: confirm dialog.
- Regions: title, message, buttons.
- Shown information: "Revoke {{name}}?" / "It stops working at once: the assistant that uses it can no longer read your links."
- Controls: "Revoke" (destructive), "Cancel".
- Form fields: none.
- Primary action: revokes (not optimistic; button loading); toast "Token revoked" (detail name). No undo.
- States: failure toast "Couldn’t revoke the token. Try again.".
- Features: MCP-02.
- Source: `services/mcp-connect-actions.service.ts`.

## 4.4 Capture, import, export and sharing

### SCR-CAP-01 Add link dialog (single link; also Edit link)
- Route / how it opens: `AddLinkDialogService.open()` from the entry points in CAP-01; no route. Edit variant from link Edit.
- Platforms: desktop/tablet medium dialog; phone bottom sheet with grip.
- Regions: header (title "Add link" / "Edit link", close ×); fields; footer.
- Shown information: preview card (letter thumbnail, favicon letter, host, title, description, "Filled in from the page. You can edit the title."); notices; rule chip; AI rows; edit mode: reminder line, meta line.
- Controls (top to bottom):
  - Link input (type url) — see form fields.
  - "Have several links? Paste them all at once" + ghost sm button "Add several links" (add mode only) → SCR-CAP-02.
  - Rule chip "Rule: {{domain}} → {{target}}", remove "Don't apply the rule for {{domain}}" (when a rule applies).
  - Folder select with search ("Search folders", "No folders found", "Create folder “{name}”", "New" badge).
  - AI folder suggestion row / "Moved by AI" + "Undo" (aria "Undo the move by AI") (AI on).
  - Tag input; AI tag row ("Suggested", "Add all", "Suggesting…"), "{{count}} added by AI" + Undo (aria "Undo the tags added by AI") (AI on).
  - Note textarea.
  - Edit only: "Type" select; "Add to favorites" checkbox; reminder ghost button "Remind me"/"Change" (icon bell).
  - Footer, in order: Delete (edit only; icon trash; icon-only on tablet+ when AI on; disabled while saving); "Fill in with AI" (AI on; aria-disabled until a valid address; tooltip with Alt+Shift+F); save hint "⌘ Enter to create" / "Ctrl Enter to create" (add mode, not phone, AI off); Cancel (hidden on phone sheet; disabled while saving); "Open saved" (duplicate, add mode); primary: "Create link" / "Create anyway" / "Creating…" (add), "Save changes" / "Saving…" (edit); disabled while AI busy.
- Form fields:
  - Link: url input, required ("Enter a link"), placeholder "https://", hint "Paste a link — the title and preview fill in by themselves" (add mode only), invalid "Enter an address that starts with http:// or https://", too long "The link is too long (at most {{max}} characters)" (2048); spinner while preview loads; locked while AI fill runs.
  - Title: text, optional in add (auto-filled), required in edit ("Enter a title"), too long "The title is too long (at most {{max}} characters)" (300).
  - Summary (AI, conditional): label "Summary", see AI area.
  - Folder: select, default per CAP-05, empty "Unsorted"; locked during AI fill.
  - Tags: tag input, placeholder "Add tag", max 20 ("Up to {{max}} tags"); locked during AI fill.
  - Your note: textarea 2 rows, placeholder "Why are you saving this?", hint "Helps you find it later", counter "characters", max 2000 ("The note is too long (at most {{max}} characters)").
  - Type (edit only): select of link kinds.
  - Add to favorites (edit only): checkbox.
- Primary action: save → dialog closes; feed updates; toast "Saved to {{folder}}" (add) / "Changes saved" (edit, caller). Invalid submit focuses the first invalid field and shakes Link.
- States: idle; loading ("You can keep typing a note and choosing a folder while it loads."); failed ("Couldn't load a preview. The link will be saved with its address as the title — you can rename it."); unavailable ("No preview is available for this page. The link will be saved with its address as the title — you can rename it."); duplicate ("You already saved this link in {{folder}}. Open it, or save it again."); save errors (CAP-10).
- Features: CAP-01…CAP-10, CAP-14, CAP-15.
- Source: `features/links/components/add-link/add-link-dialog.component.html`.

### SCR-CAP-02 Add several links (text area)
- Route / how it opens: "Add several links" in SCR-CAP-01 (same dialog).
- Platforms: as SCR-CAP-01.
- Regions: header "Add several links" + ×; text area; footer.
- Shown information: hint text.
- Controls: footer ghost "One link" (icon chevron-left) → back to SCR-CAP-01; primary "Find links" (submit).
- Form fields: "Paste links, one per line or inside any text": textarea 8 rows, placeholder "https://…", hint "Up to {{max}} links at a time. You check the list before anything is saved." (100), spell-check off; required "Paste or type some links"; no links "No links found in this text".
- Primary action: "Find links" / ⌘Ctrl+Enter → SCR-CAP-03.
- States: errors above.
- Features: CAP-11.
- Source: `add-link-dialog.component.html`, `add-several-links.service.ts`.

### SCR-CAP-03 Paste many list
- Route / how it opens: paste of several links into Link, "Find links", ⌘V in library with several links.
- Platforms: as SCR-CAP-01; phone no Cancel.
- Regions: header title; summary; select-all row; optional rules checkbox; list; overflow notice; fields; error; footer.
- Shown information: title "Add {{count}} link(s)" / "Add links" (none selected); summary "Found {{count}} link(s) in what you pasted." + "{{count}} is already on your shelf." / "{{count}} are already on your shelf."; count "{{selected}} of {{total}} selected" (polite); per row: checkbox labelled with the page title (or address without scheme), meta = host or "Loading preview", rule chip, "Already saved" badge (warning), remove button; skipped rows: “{{text}}” + "Not a link, skipped"; overflow notice "{{count}} more link was left out: up to {{max}} links at a time. A bookmarks file goes to Import in Account › Your data." / plural; footer note "Titles and previews keep loading after you save."
- Controls: "Select all" (indeterminate when some; disabled with no rows); "Apply domain rules" (only when a row matches a rule; checked by default); row checkbox; row rule chip remove ("Don't apply the rule for {{domain}}"); row × "Remove {{title}}" (disabled while saving); Cancel (not phone); primary "Save {{count}} link(s)" / "Save links" (disabled at 0) / "Saving…". List aria "Pasted links".
- Form fields: "Folder for all" (searchable select, empty "Unsorted"); "Tags for all" (tag input, same labels as CAP-06, max 20).
- Primary action: one batch save → dialog closes → links at top of feed → toast with Undo (CAP-12).
- States: error notices "Only {{fit}} more link(s) fit…", limit, generic save errors.
- Features: CAP-12, CAP-08, CAP-06.
- Source: `components/paste-many/paste-many-list.component.html`.

### SCR-CAP-04 Share target quick save
- Route / how it opens: `/share?url=&text=&title=` from Android share sheet.
- Platforms: phone sheet with grip; larger screens a centred card.
- Regions: grip (phone); header (logo mark, "Save to Shelfmark", "Shared from another app"); live region; duplicate notice; preview card; failure notice; rule chip; Folder; Note; failure notice; buttons; footnote.
- Shown information: host letter thumbnail, favicon letter, host, title (skeleton while loading without hint), description, address.
- Controls: rule chip remove; primary large "Save" / "Save anyway" / "Saving…"; "Cancel" (disabled while saving) → `/links`.
- Form fields: Folder (searchable select, "Unsorted", default "New links go to" unless rule); Note (single-line input, placeholder "Why are you saving this?", max 2000).
- Primary action: `POST /api/links` → `/links` + toast "Saved to {{folder}}".
- States: loading; failed preview "Couldn't load a preview. The link will be saved with its address as the title — you can rename it."; duplicate; save failed "Couldn't save the link. Try again."; footnote "After saving you land in your library."
- Features: CAP-16.
- Source: `features/share/share.page.html`.

### SCR-CAP-05 Share target "Nothing to save"
- Route / how it opens: `/share` without a usable http(s) address.
- Platforms: as SCR-CAP-04.
- Regions: grip; header ("Nothing to save", "Shared from another app"); notice; button; footnote.
- Shown information: notice "This share has no web address starting with http:// or https://, so nothing was saved."
- Controls: primary large "Go to my links" → `/links`.
- Form fields: none.
- Primary action: navigate.
- States: footnote "To try again, share a page or a link from your browser or another app."
- Features: CAP-16.
- Source: `share.page.html`.

### SCR-CAP-06 Sidebar folder menu (items relevant to this area marked)
- Route / how it opens: folder row "…"/right-click/long-press/Shift+F10 in desktop sidebar or phone Library.
- Platforms: desktop sidebar; phone Library folder list.
- Regions: menu "Folder actions".
- Shown information: menu items.
- Controls (in order): "Pin to sidebar"/"Unpin from sidebar"; "Color and icon…"; "New subfolder"; **"Add link here"** (opens SCR-CAP-01 with folder preselected); "Rename"; "Move to…"; **"Share…"** (opens SCR-SHR-01); separator; "Delete folder…" (danger). No conditions on the two marked items.
- Form fields: none.
- Primary action: n/a.
- States: n/a.
- Features: CAP-01, SHR-01.
- Source: `shell/sidebar/sidebar.component.html`, `sidebar-folders.service.ts`.

### SCR-IMP-01 Import dialog, step 1 (Choose the file)
- Route / how it opens: IMP-01 entry points.
- Platforms: md dialog / phone sheet.
- Regions: header "Import links" + × ("Close"); (source radio, hidden with one source); drop zone; status; problem notice; help toggle and steps; Recent imports.
- Shown information: drop zone texts (IMP-02), hint ".html, up to {{max}} MB and {{links}} links" (50 MB, 10 000); "Reading {{file}}…"; Recent imports rows (file name; "date · N link(s), N folder(s), N skipped, N failed").
- Controls: "Choose file" (file picker, accept .html/.htm); whole-dialog drop; "How to export bookmarks from a browser" toggle; per recent import "Undo import"; ×.
- Form fields: file input.
- Primary action: choosing/dropping a valid file → step 2.
- States: dragging ("Release to import"); reading (zone disabled); problems (IMP-02 copy); Recent imports hidden when none; footer empty.
- Features: IMP-02, IMP-03, IMP-10.
- Source: `import-dialog.component.html`.

### SCR-IMP-02 Import dialog, step 2 (Check before importing)
- Route / how it opens: after step 1.
- Platforms: as above; phone footer full width.
- Regions: header (file name); stats; "Put them into"; duplicates checkbox; "Folders inside"; notices; footer.
- Shown information: stats (N links, N folders, N already on your shelf).
- Controls: target select; skip checkbox; mode radio cards; footer "Back", primary "Import {{count}} link(s)" or AI "Group" (spark).
- Form fields: "Put them into" (searchable select: "New folder “Imported bookmarks”" default, folders, empty "Unsorted"; search "Search folders", "No folders found"); "Skip the {{count}} duplicate(s)" (checked; hint "Links already on your shelf and repeats inside the file"; only when duplicates > 0); "Folders inside" radio (IMP-06 options).
- Primary action: import → step 3, or Group → step 2a.
- States: room warnings, "Every link in this file is already on your shelf.", primary disabled at 0.
- Features: IMP-05, IMP-06.
- Source: `import-review.component.html`, `import-dialog.component.html`.

### SCR-IMP-03 Import dialog, step 2a (AI groups)
- Route / how it opens: "Group" in step 2.
- Platforms: as above.
- Regions: header (file name); status/heading; groups list; Other row; hint; footer.
- Shown information: per IMP-07.
- Controls: group checkbox (hidden label = group name); "Folder name" input (new groups); expand/collapse ("Show the links of “{{name}}”" / "Hide the links of “{{name}}”"); per-link "Move “{{title}}” to" select; footer "Back", primary "Import and create {{count}} folder(s)" (disabled while loading or invalid), or after an error "Import {{count}} link(s)".
- Form fields: Folder name (required for included new groups: "Give the folder a name"); move selects.
- Primary action: start import with groups → step 3.
- States: loading "AI is grouping {{count}} link(s)…"; three error notices (IMP-07).
- Features: IMP-07.
- Source: `import-groups.component.html`.

### SCR-IMP-04 Import dialog, step 3 (Importing / Done / Failed)
- Route / how it opens: after start; or reopening during a run.
- Platforms: as above.
- Regions: progress block or done block or failure notice; footer.
- Shown information: "Importing links", "{{done}} of {{total}}", meter "Import progress", note; done: check, title, summary line (IMP-09).
- Controls: running: "Minimize"; done: ghost "Undo import" (when created > 0), primary "Open the folder"/"Open Unsorted"; failed: primary "Back".
- Form fields: none.
- Primary action: open target folder.
- States: failed start copy (IMP-08).
- Features: IMP-08, IMP-09, IMP-10.
- Source: `import-progress.component.html`, `import-dialog.component.html`.

### SCR-IMP-05 Undo import confirmation (dialog)
- Route / how it opens: "Undo import" in summary or Recent imports.
- Platforms: confirm dialog / phone sheet.
- Regions: title, message, buttons.
- Shown information: title "Undo this import?"; message "The {{count}} link(s) and the folders of this import go to Trash, and tags it added that nothing else uses are removed. What you added since stays."
- Controls: "Cancel", "Undo import".
- Form fields: none.
- Primary action: undo → toast "Import undone" / "{{count}} link(s) moved to Trash"; summary path closes the import dialog.
- States: failure toast "Could not undo the import. Try again."
- Features: IMP-10.
- Source: `recent-imports.store.ts`.

### SCR-IMP-06 Sidebar "Data & help" menu
- Route / how it opens: sidebar footer row "Data & help" (desktop ≥64em); ArrowUp on the row opens on the last item.
- Platforms: desktop/tablet ≥64em sidebar only.
- Regions: menu "Data and help".
- Shown information: items.
- Controls (in order): "Import links" (icon download) → SCR-IMP-01; "Export" (icon share) → SCR-EXP-01; separator; What's new entry (with "New"-type badge while unseen) (other area); "Send feedback" (other area).
- Form fields: none.
- Primary action: n/a.
- States: n/a.
- Features: IMP-01, EXP-01.
- Source: `shell/sidebar/sidebar.component.html`.

### SCR-IMP-07 You tab "Import and export" group
- Route / how it opens: `/settings` index (You tab, compact <64em).
- Platforms: compact.
- Regions: a group (aria "Import and export") between the settings list and "Send feedback".
- Shown information: rows with chevrons.
- Controls: "Import links" → import sheet; "Export" → export sheet (both links to Privacy and data as fallback; aria-haspopup dialog).
- Form fields: none.
- Primary action: open sheet.
- States: n/a.
- Features: IMP-01, EXP-01.
- Source: `features/settings/pages/settings-index/settings-index.page.html`.

### SCR-IMP-08 Settings › Privacy and data › "Import and export" section
- Route / how it opens: `/settings/privacy`.
- Platforms: all.
- Regions: section "Import and export" with two rows.
- Shown information: "Import links" ("Bring in bookmarks from your browser"), "Export" ("Download your whole library as a file").
- Controls: "Open" (aria "Import links") → SCR-IMP-01; "Open" (aria "Export") → SCR-EXP-01.
- Form fields: none.
- Primary action: open dialog.
- States: n/a.
- Features: IMP-01, EXP-01.
- Source: `features/settings/pages/privacy-data/privacy-data.page.html`.

### SCR-EXP-01 Export dialog
- Route / how it opens: EXP-01 entry points.
- Platforms: small dialog; phone sheet.
- Regions: header "Export" + × ("Close"); format radio group (aria "File format"); status line; footer.
- Shown information: three cards; "Last export: {{when}}, {{format}}." or "Preparing the {{format}} file…".
- Controls: radio cards JSON / Bookmarks HTML / CSV (disabled while preparing); "Cancel" (aborts; hidden on phone sheet as `uiDialogCancel`); primary "Download" (disabled while preparing).
- Form fields: format radio (default JSON).
- Primary action: download → close + toast "File saved".
- States: preparing; empty library toast + close; failure toast (dialog stays).
- Features: EXP-01.
- Source: `features/export/components/export-dialog/*`.

### SCR-EXP-02 Library "Export" menu (desktop/tablet)
- Route / how it opens: library toolbar "Export" button.
- Platforms: ≥40em library header (non-phone branch).
- Regions: menu "Export".
- Shown information: items.
- Controls (in order): [when view has scope] "This view as JSON" (icon code), "This view as Bookmarks HTML" (globe), "This view as CSV" (list), separator; then "Everything as JSON", "Everything as Bookmarks HTML", "Everything as CSV".
- Form fields: none.
- Primary action: immediate download.
- States: toasts (EXP-02).
- Features: EXP-02.
- Source: `library.page.html`.

### SCR-EXP-03 Library "Options" menu, export part (phone)
- Route / how it opens: phone library tools "Options" button (menu "Sort, view and export").
- Platforms: phone (<40em).
- Regions: Sort by radios, separator, view radios, separator (sort/view only when controls shown), label "Export", items.
- Controls (export part, in order): same as SCR-EXP-02.
- Form fields: none.
- Primary action: immediate download.
- States: toasts.
- Features: EXP-02.
- Source: `library.page.html`.

### SCR-EXP-04 Settings › Account › "Your data"
- Route / how it opens: `/settings/account` (anchor `#your-data`).
- Platforms: all; large buttons on compact.
- Regions: section "Your data".
- Shown information: three rows (icon, format name, description).
- Controls: "Download" ×3 (aria "Download {{format}}").
- Form fields: none.
- Primary action: immediate whole-library download.
- States: toasts.
- Features: EXP-03, EXP-04.
- Source: `features/settings/pages/account/account.page.html`.

### SCR-SHR-01 Share folder dialog
- Route / how it opens: folder menu "Share…".
- Platforms: md dialog; phone sheet.
- Regions: header "Share folder “{{name}}”" + × ("Close"); count; state area; public row; link row; copy notice; "Link settings" section; error notices; footer note; footer.
- Shown information: "{{count}} link(s), subfolders included"; URL; "Notes stay private unless you turn them on."
- Controls: switch "Public folder"; (when public) "Copy link" (primary, icon copy); switch "Show my notes"; "Reset" (sm); "Try again" (load failure); footer primary "Done".
- Form fields: "Folder page address" read-only url field.
- Primary action: "Done" closes.
- States: demo, loading, load failed, busy, errors (SHR-01 copy).
- Features: SHR-01…SHR-04.
- Source: `share-folder-dialog.component.html`.

### SCR-SHR-02 Reset link confirmation (dialog)
- Route / how it opens: "Reset" in SCR-SHR-01.
- Platforms: confirm dialog.
- Regions: title, message, buttons.
- Shown information: "Reset the folder link?" / "The old folder link stops working at once. Anyone who should still see the folder needs the new link."
- Controls: "Cancel", destructive "Reset link".
- Form fields: none.
- Primary action: reset → toast "Link reset" / "The old link no longer works".
- States: failure → "Couldn't save the change. Try again." in the share dialog.
- Features: SHR-04.
- Source: `share-folder-dialog.component.ts`.

### SCR-SHR-03 Public collection page
- Route / how it opens: `/c/:token`.
- Platforms: all; outside the shell.
- Regions: header (logo, Sign in / Back to my shelf); intro (owner, name, count, updated, Copy link); subfolder chips; status/notice; grid; Show more / cap note; guest CTA panel; footer.
- Shown information: as SHR-05; card: title, host, favicon, image, note (if allowed).
- Controls: logo link ("Shelfmark home"); "Sign in" / "Back to my shelf"; "Copy link"; chips "All {{n}}" and per subfolder (aria-pressed); card opens the link; "Show more" (loading spinner); "Try again"; "Start your shelf" (guest); "Go to Shelfmark" (not found); "Made with Shelfmark".
- Form fields: none.
- Primary action: open links / copy.
- States: loading, not found, failed, empty, capped (exact copy in SHR-05).
- Features: SHR-05, SHR-06.
- Source: `public-collection.page.html`.

## 4.5 Settings, account, feedback and admin

### SCR-SET-01 You list
- Route / how it opens: `/settings` below 64em; tab bar "You".
- Platforms: compact only (phones, tablet portrait).
- Regions: page title; account card; settings rows nav; admin rows (same list); Import and export group; Send feedback button; help nav; How it works button; Sign out button; footer.
- Shown information: title "You"; account card: avatar (photo or initials, large), name, email, chevron (link, screen-reader prefix "Account: "); rows: Appearance (+ current theme: "System"/"Light"/"Dark"/"Custom"), Library, AI, Language (+ current language in its own name, or "Match my browser"), Privacy and data, Your feedback; footer "Privacy policy" link and "Shelfmark {{version}}".
- Controls (in order):
  1. Account card → `/settings/account`.
  2. "Appearance" → `/settings/appearance`.
  3. "Library" → `/settings/library`.
  4. "AI" → `/settings/ai`.
  5. "Language" → `/settings/language`.
  6. "Privacy and data" → `/settings/privacy`.
  7. "Your feedback" → `/settings/feedback`.
  8. "Feedback inbox" → `/admin/feedback` (admin only).
  9. "Usage stats" → `/admin/stats` (admin only).
  10. Group "Import and export": "Import links" (opens import dialog/sheet; no-script fallback `/settings/privacy`), "Export" (opens export dialog/sheet).
  11. "Send feedback" (block large button, message icon) → FBK-01.
  12. Help nav (aria "Help"): "What's new" (opens dialog; dot "new" while unseen; fallback `/changelog`), "About Shelfmark" → `/about`.
  13. "How it works" (play icon) → walkthrough.
  14. "Sign out".
  15. Footer "Privacy policy" → `/privacy`.
- Form fields: none.
- Primary action: none (navigation list).
- States: account card hidden until user known; admin rows only for admin. Not shown: Account row, Keyboard shortcuts row.
- Features: SET-01, ACC-05, FBK-01, ADM-01.
- Source: `settings-index.page.html`.

### SCR-SET-02 Settings nav
- Route / how it opens: any `/settings/*` from 64em.
- Platforms: desktop shell (tablet landscape and up).
- Regions: left column in place of the sidebar; header has no search, no Ask button.
- Shown information: heading "Settings"; version "Shelfmark {{version}}".
- Controls: "Back to links" (ghost, chevron-left) → `/links`; rows in order: Account, Appearance, Library, AI, Language, Keyboard shortcuts, Privacy and data, Your feedback (current row `aria-current="page"`, ripple).
- Form fields: none.
- Primary action: none.
- States: —
- Features: SET-02.
- Source: `settings-nav.component.html`.

### SCR-SET-03 Settings › Appearance
- Route / how it opens: `/settings/appearance`.
- Platforms: all; live preview sticky beside options on wide content, above them otherwise; phone back control "You".
- Regions: header ("Appearance" / "Saved as you go and synced to all your devices."); Live preview; sections Theme, Text and layout, Cards, Dates and numbers, Sidebar and motion.
- Shown information: preview (SET-10); theme thumbnails (System thumb, Light, Dark, Custom drawn with the custom settings); theme hint "Light and Dark are tuned by us and always stay the same. Custom is yours to change."
- Controls:
  - Theme picker (aria "Theme"): System, Light, Dark, Custom.
  - (Custom only) "Start from" segmented Light / Dark ("Your colors sit on the light or the dark base").
  - (Custom only) "Accent color" swatches Sage, Ocean, Plum, Clay, Amber, Rose, Teal, Graphite + own colours (removable, "Remove color {{colour}}") + "+" "Your own color" picker. Hint "Active folder, tags, favorites and focus. Every option keeps 4.5:1 contrast in light and dark."
  - (Custom only) "Background" ("The page behind cards and panels") swatches: light base Stone, Paper, Mist, White; dark base Graphite, Ink, Forest, Black; + own colours + "+" "Your own background color".
  - (Custom only) "Corners" ("Cards, panels and buttons") segmented Round / Soft / Square.
  - (Custom only) "Reset custom theme" (ghost, small).
  - (Not Custom) note "Want other colors or corners? Choose Custom. Light and Dark won’t change."
  - "Text size" segmented 90% / 100% / 112% / 125% ("Scales the whole interface, not just text").
  - "Font" segmented Onest / System / Readable ("Readable is designed for low vision").
  - "Density" segmented Comfortable / Compact ("Compact fits more links on screen").
  - "Preview image" segmented Large / Small / Off ("The picture at the top of each card").
  - "Show site" switch ("Domain and favicon above the title"); "Show notes" switch ("Your note under the title"); "Show tags" switch ("Tag chips at the bottom of the card").
  - "Date format" select (see SET-08); "Time" segmented Auto / 24-hour / 12-hour; "Week starts on" segmented Auto / Monday / Sunday ("Groups this week in Recently opened"); "Preview" output (live region).
  - "Folder colors" switch ("Off shows every folder in plain graphite"); "Animations" segmented System / Full / Reduced ("Reduced keeps fades and loaders, removes movement").
- Form fields: hex field in colour picker (SCR-SET-04).
- Primary action: none; every change applies and saves at once.
- States: failure toasts (see Toasts).
- Features: SET-03 … SET-10.
- Source: `appearance.page.html`, `date-time-settings.component.html`.

### SCR-SET-04 Own colour picker (popover)
- Route / how it opens: "+" swatch in Accent color or Background (aria = "Your own color" / "Your own background color", `aria-expanded`).
- Platforms: all.
- Regions: saturation/brightness area ("Choose a color"), hue slider, hex field, hint, status line, warning notice, footer.
- Shown information: hint (accent) "Shelfmark keeps 4.5:1 contrast: on the other base it uses a darker or lighter shade of your color." / (background) "Text must stay readable (4.5:1): if needed, Shelfmark uses a lighter or darker shade of your color."; status "Adjusted to {{colour}} so it stays readable." / "Adjusted to {{colour}} so text stays readable."; warning "This color is hard to read on your background ({{ratio}}:1, it needs 4.5:1)." / "Text is hard to read on this background ({{ratio}}:1, it needs 4.5:1)."
- Controls: Saturation slider, Brightness slider (value text "%"), Hue slider (value "°"), Enter on a slider commits; hex field (Enter tidies); "Use {{colour}}" in the warning; "Cancel"; "Add color"; Esc closes.
- Form fields: "Hex code", text, `#rrggbb`; error "Enter # and six digits or letters a–f, like #2e6a99."
- Primary action: "Add color" → becomes accent/background, saved as own swatch, popover closes and clears.
- States: warning hidden while dragging.
- Features: SET-05.
- Source: `libs/ui color-picker`, `appearance.page.html`.

### SCR-SET-05 Settings › Library
- Route / how it opens: `/settings/library`.
- Platforms: all; phone back "You".
- Regions: header ("Library" / "How links are shown, saved and kept."); Viewing; Saving; Rules; Clean up; Trash; footer note.
- Shown information: footer note "Subfolders are always shown first in a folder; it isn’t a setting. Changes apply at once and sync to your other devices."; Trash row description "{{count}} item"/"{{count}} items" or "Nothing in Trash".
- Controls (in order): "Default view" segmented Cards / List; "Sort links by" select Newest first / Oldest first / Title A–Z; "Open links in" segmented New tab / Same tab; "Clicking a link" radio (Opens the preview / Opens it in a new tab); "Sites that open in a new tab" removable chips; "Show folder counts" switch; "New links go to" searchable select; "Fetch titles and previews" switch; "Browser extension" "Install" (external, new tab; aria "Install the browser extension from the Chrome Web Store (opens in a new tab)") when offered; Rules section (RUL-01: "Add rule", row menus); "Clean up your library" "Review"; "Keep deleted items for" segmented 7 days / 30 days / 90 days ("Then they’re removed for good"); load-failure notice with "Try again"; "Trash" "Open Trash" → `/trash`.
- Form fields: selects above (no free text).
- Primary action: none (instant save).
- States: retention disabled until loaded; "Couldn't load the setting." notice.
- Features: SET-12 … SET-17.
- Source: `library.page.html`, `preview-settings.component.html`.

### SCR-SET-06 Shorten Trash retention confirmation
- Route / how it opens: choosing a shorter retention while older items exist in Trash.
- Platforms: all (dialog; sheet-like on phone per ui-dialog).
- Regions: title, message, buttons.
- Shown information: title "Shorten how long Trash keeps items?"; message "{{count}} item in Trash is older than {{days}} days and will be deleted for good tonight." / "{{count}} items in Trash are older than {{days}} days and will be deleted for good tonight."
- Controls: "Cancel", destructive "Keep for {{days}} days", close "Close".
- Primary action: confirm → saves retention; cancel → control returns.
- Features: SET-15.
- Source: `library.page.ts` (`confirmShorter`).

### SCR-SET-07 Settings › Language
- Route / how it opens: `/settings/language`.
- Platforms: all.
- Regions: header ("Language" / "The language of the interface. Date and time formats are in Appearance."); section "Language".
- Shown information: hint "Your links and notes stay as they are".
- Controls: radio group (aria "Interface language"): English, Français, Deutsch, Italiano, Español, Português, Українська (each flag + own name, `lang`), "Match my browser" (monitor icon).
- Form fields: the radio group.
- Primary action: choice applies at once.
- States: failure toast.
- Features: SET-19.
- Source: `language.page.html`.

### SCR-SET-08 Settings › Privacy and data
- Route / how it opens: `/settings/privacy`.
- Platforms: all.
- Regions: header ("Privacy and data" / "What we keep, and how to take it with you."); "Your data"; "Import and export"; "AI features"; "What we keep".
- Shown information: AI text "AI is optional and off until you turn it on. When it is on, a link's address, title and page text go to our AI provider to suggest tags and folders and write summaries. Never used to train models, never used for statistics."; What we keep: "Your links (address, title, note, favorite mark, when you last opened it), your folders and your tags." / "We keep your account and everything in it until you delete it." / "We don't sell or share your data and don't show ads." / "There are no advertising, analytics or tracking cookies, and no analytics scripts."
- Controls (in order): "Remember recently opened" switch; "Privacy policy" "Read" (aria "Read the privacy policy") → `/privacy`; "Import links" "Open" (dialog); "Export" "Open" (dialog); "Delete AI data" ("Removes every summary and suggestion AI made, in Settings › AI") "Open" (aria "Open Delete AI data in Settings › AI") → `/settings/ai#ai-data`.
- Form fields: switch.
- Primary action: none.
- States: —
- Features: SET-21, SET-22.
- Source: `privacy-data.page.html`.

### SCR-SET-09 Stop remembering recently opened (confirmation)
- Route / how it opens: turning off "Remember recently opened".
- Shown information: title "Stop remembering recently opened?"; message "The Recently opened list is cleared, and links you open are not added until you turn this back on. Your links stay saved."
- Controls: "Cancel", destructive "Clear and stop", "Close".
- Primary action: pauses history and clears the list.
- Features: SET-21.
- Source: `privacy-data.page.ts`.

### SCR-SET-10 Desktop header account menu (settings-related items)
- Route / how it opens: avatar button "Account menu" in the desktop header.
- Platforms: desktop (from 64em).
- Regions: identity block, items.
- Shown information: avatar, name, email.
- Controls (in order): separator; "Settings" (settings icon) → `/settings` (→ `/settings/account`); "Send feedback" (message) → FBK-01; "Feedback inbox" (inbox, admin only) → `/admin/feedback`; "Usage stats" (chart, admin only) → `/admin/stats`; separator; "How it works" (play); "About Shelfmark" (info) → `/about`; separator; "Sign out" (logout). Header also has the keyboard button ("Keyboard shortcuts", tooltip key "?") and the theme toggle ("Switch to light theme"/"Switch to dark theme").
- Features: SET-11, ACC-05, FBK-01, ADM-01, KEY-02.
- Source: `shell/app-shell.component.html`.

### SCR-ACC-01 Settings › Account
- Route / how it opens: `/settings/account` (desktop default settings page; phone via account card).
- Platforms: all; buttons large below 64em.
- Regions: header ("Account" / "Your profile, your shelf and your data."); Profile; Your shelf; Connected accounts; Your data (anchor `#your-data`); Delete account (danger, real accounts only); Sign out.
- Shown information: avatar, name, email, "Member since {{date}}"; shelf counts and lists (ACC-02); connected providers with "Connected {{date}}".
- Controls (in order): shelf "Try again" (on error); per format "Download" (JSON, Bookmarks HTML, CSV; aria "Download {{format}}"); "Delete account" (danger); "Sign out".
- Form fields: none.
- Primary action: none.
- States: shelf loading/error/empty (exact copy in Empty states / Errors); connected accounts only after stats load, demo copy "The demo account isn't linked to Google or GitHub."; delete section hidden for demo.
- Features: ACC-01 … ACC-06, SET-24.
- Source: `account.page.html`, `account-shelf.component.html`.

### SCR-ACC-02 Delete account dialog
- Route / how it opens: "Delete account" button; alert dialog, small, no scrim close, described by the text, focus in the field.
- Platforms: all.
- Regions: title, text, field, error notice, footer.
- Shown information: title "Delete your account?"; text "All your links, folders and tags will be deleted for good. This can't be undone."
- Controls: close "Close" (hidden while deleting); "Cancel" (disabled while deleting); danger submit "Delete account" / "Deleting…" (disabled until the email matches).
- Form fields: "Type your email to confirm", text input, required to match; hint "Enter {{email}} to confirm."; errors in a notice (see Errors).
- Primary action: delete → dialog closes, session ends, landing `/`, toast "Account deleted" / "All your data was deleted". Not undoable.
- States: deleting (locked).
- Features: ACC-06.
- Source: `delete-account-dialog.component.html`.

### SCR-KEY-01 Settings › Keyboard shortcuts
- Route / how it opens: `/settings/shortcuts`.
- Platforms: all (nav entry desktop only).
- Regions: header ("Keyboard shortcuts" / "Work without the mouse."); section with switch and Open list; one section per group.
- Shown information: groups and rows as in the Shortcuts table.
- Controls: "Use single-key shortcuts" switch; "All shortcuts" "Open list".
- Features: KEY-01, KEY-03.
- Source: `shortcuts.page.html`.

### SCR-KEY-02 Keyboard shortcuts dialog
- Route / how it opens: "?" key, header button, "Open list".
- Platforms: all; medium dialog.
- Regions: title "Keyboard shortcuts", group columns (headings Everywhere, Saving and finding, Link preview, Selecting links, In the folder list), footer hint.
- Controls: close "Close"; Esc.
- Features: KEY-02, KEY-04.
- Source: `shortcuts-dialog.component.html`.

### SCR-FBK-01 Send feedback dialog (form)
- Route / how it opens: FBK-01 entry points; medium dialog, sheet on phone; focus in textarea.
- Regions: title "Send feedback"; type; message; screenshots; attach row; error notice; footer.
- Controls: close "Close"; type segmented (aria "Type") Idea / Problem / Other; "choose files"; per screenshot remove; checkbox "Attach browser and app version"; info button "What is sent?"; "Cancel"; primary "Send" / "Sending…".
- Form fields:
  - Message textarea: label "What would make Shelfmark better?" (Idea) / "What went wrong?" (Problem) / "What's on your mind?" (Other); placeholder "One thing we should change or add" / "What you did, and what happened instead" / "Anything you would like us to know"; hint "We read every message."; counter "characters", max 2000; required ("Write a message first."), too long ("Keep it to {{max}} characters or fewer."). On invalid submit focus goes to the field.
  - Screenshots: file input (PNG/JPEG/WebP, multiple), label "Screenshots (optional)".
  - Attach checkbox: default on.
- Primary action: Send → message then screenshots; thank-you view.
- States: sending (locked), failed (text kept), rate limited.
- Features: FBK-01, FBK-02.
- Source: `send-feedback-dialog.component.html`.

### SCR-FBK-02 Send feedback thank-you
- Route / how it opens: after a successful send (same dialog; title hidden).
- Shown information: check badge, "Thank you", "We read every message. You'll see its status in Settings › Your feedback."; optional warning "Some images couldn't be attached. Your message was sent without them."
- Controls: primary "Done" (focused), close "Close".
- Features: FBK-01.
- Source: `send-feedback-dialog.component.html`.

### SCR-FBK-03 Settings › Your feedback
- Route / how it opens: `/settings/feedback`.
- Regions: header ("Your feedback" / "Ideas, problems and the answers we sent."); "Send feedback" section; "Your messages" list or page empty state.
- Shown information per item: type chip (Idea / Problem / Other), text, "Sent today" / "Sent {{date}}", "Reply: {{reply}}" when present, status badge. Screenshots are not shown here.
- Controls: "Send feedback" (primary, opens dialog); "Try again" on error.
- States: skeleton, error, empty (see tables).
- Features: FBK-03, FBK-04.
- Source: `your-feedback.page.html`.

### SCR-FBK-04 Rating dialog
- Route / how it opens: automatically (FBK-05); medium dialog, focus on the dialog itself.
- Regions: title; step body; footer.
- Step Rate: title "How do you like Shelfmark so far?"; scale (aria "Rating from 1 to 10") buttons 1–10 ("{{score}} out of 10"), "Not really" / "Love it"; footer ghost "Not now". Keys: digits 1–9 and 0 (=10) focus that score, Enter picks; first ArrowRight enters at 1, first ArrowLeft at 10.
- Step Feedback: title "What would make it better?"; read-only scale "Your score: {{score}}"; textarea "Your feedback" (placeholder "Tell us what is missing or annoying", counter "characters", max 2000); error notice; footer "Skip" (disabled while sending), primary "Send"/"Sending…" (disabled while blank).
- Step Thanks: title hidden; check badge, "Thank you", "Your rating helps us make Shelfmark better." or (after a written message) "We read every message."; footer primary "Close" (focused). Auto-closes after 4 s.
- Primary action: pick a score (saved at once).
- States: closing without a score (Not now, Esc, scrim) records a skip.
- Features: FBK-05, FBK-06.
- Source: `rating-dialog.component.html`.

### SCR-ADM-01 Feedback inbox
- Route / how it opens: `/admin/feedback`.
- Platforms: all; desktop with normal sidebar; compact back control "You".
- Regions: header ("Feedback inbox" / "Every message, with its status and your reply."); admin switch; filter; panel with list; load more.
- Controls: admin switch Feedback / Stats; "Show" select (empty "All statuses"; Received, Planned, In progress, Done, Not planned); "Try again" on error; "Load more".
- States: skeleton; error; empty; loading more.
- Features: ADM-02, ADM-05.
- Source: `admin-feedback.page.html`.

### SCR-ADM-02 Admin feedback item
- Route / how it opens: each list item.
- Shown information: type chip, sender name, email, "Sent today"/"Sent {{date}}", status badge, text, screenshot thumbnails (lazy, open in a new tab).
- Controls / form fields: "Status" select (5 statuses); "Reply" textarea (hint "Shown to the sender in Your feedback. Leave empty for none.", counter, max 2000, error "Keep the reply to {{max}} characters or fewer."); primary "Save" (disabled until changed, spinner while saving).
- Primary action: Save → optimistic update; failure toast and rollback, draft kept.
- Features: ADM-03.
- Source: `admin-feedback-item.component.html`.

### SCR-ADM-03 Usage stats
- Route / how it opens: `/admin/stats`.
- Regions: header ("Usage stats" / "Totals over real accounts, worked out now. Demo and admin accounts are left out; groups of fewer than {{min}} people are hidden."); switch; meta line + Refresh; notices; Overview; Sign-ups; Features; Preferences; Ratings and messages.
- Shown information: see ADM-04; share rows show label, "{{percent}} · {{count}} of {{base}}" (or hidden text) and a meter; sign-up bars "{{date}}: {{count}}" / "Week from {{date}}: {{count}}"; "{{count}} in this period"; links "Mean {{mean}} · median {{median}}"; milestones "After 3 days / After a week / After a month / After a year", "{{answered}} answered · {{skipped}} skipped", "Mean {{mean}} · median {{median}}", groups "1–6: n · 7–8: n · 9–10: n"; "Other", "Never chosen" buckets; activity note ("Activity is recorded from {{date}}. Earlier visits are estimated…" or "Visits before activity tracking started are estimated…").
- Controls: admin switch; "Refresh" (spinner while loading); sign-ups unit segmented "Show by" Days / Weeks; "Try again" on error.
- States: loading, error, refresh failed, too few.
- Features: ADM-04, ADM-05.
- Source: `admin-stats.page.html`.

## 4.6 Browser extension

### SCR-EXT-01 Opening
- Route / how it opens: first screen on every open and on Try again after a load failure.
- Platforms: extension.
- Regions: (only after 300 ms) header (logo mark, title "Save to Shelfmark"); preview (blank thumb, host, title); 3 skeleton lines; footer.
- Shown information: tab host and title from the browser.
- Controls: "Open Shelfmark" (full-width footer button) → /links, closes popup. Always present, even before the skeleton.
- Form fields: none.
- Primary action: none (wait).
- States: loading (status, accessible name "Loading"); before 300 ms only the footer button.
- Features: EXT-01, EXT-02, EXT-17.
- Source: `popup-opening/*`.

### SCR-EXT-02 Save form (This page)
- Route / how it opens: after opening when signed in and the URL is not saved; after "Save a copy"; returning from the picker; Try again after a save error (passes through).
- Platforms: extension.
- Regions: header (logo mark + title "Save to Shelfmark", or logo + switch "This page / All tabs (N)" with a hidden heading); preview; form (Folder label + optional spark; Folder button; rule hint; Recent folders chips; Tags field + optional "Tags from AI" badge; Suggested AI chips row; Note; quiet AI line); hidden live region; footer (optional "Fill in with AI" full width, then "Open Shelfmark" and "Save" side by side). The form body scrolls.
- Shown information: host; title (AI cleaned title once applied); folder icon/colour/name or "Unsorted" or new-folder name with "new" badge; rule domain; recent folder names; chosen tags; note.
- Controls:
  - Mode switch (segmented, label "What to save"): "This page", "All tabs ({{count}})"; shown when window has >1 tab; disabled while locked.
  - Folder button (accessible name "Folder: {{folder}}. Change", opens dialog-style picker) → SCR-EXT-04; disabled while locked.
  - Recent folder chips (group "Recent folders"), up to 3, current one highlighted → choose folder; disabled while locked.
  - Tag input controls ("Create tag", "Remove tag" per chip, suggestions list "Tag suggestions").
  - AI Suggested chips (row label "Suggested", accessible name "Suggested tags"): each chip accept ("Create and add tag {{name}}", marked "New") and dismiss ("Dismiss suggestion {{name}}").
  - Quiet AI line action "AI settings" (only on the limit line) → /settings/ai.
  - "Fill in with AI" (spark; while busy "Filling…" + spinner) — shown when AI on and not yet applied; disabled while saving.
  - "Open Shelfmark" → /links.
  - "Save" (primary; focused on open; spinner while saving; disabled while AI is filling or the tab list loads). Shortcut Ctrl/⌘+Enter anywhere in the form.
- Form fields:
  - Folder: picker button; default = matching domain rule's live folder, else Unsorted; no validation.
  - Tags: tag input, optional, default = rule tags, placeholder "Add tag", max 20 ("Up to 20 tags"), duplicate "This tag is already added".
  - Note: text, optional, placeholder "Why are you saving this?", disabled while saving, max 2000 (API).
- Primary action: Save → POST /api/links → SCR-EXT-06 (not optimistic; no toast; no undo). New folder created first if named.
- States: saving (locked); AI busy (locked folder/tags, Save disabled); AI quota line "Suggestions are paused until {{date}}. You used this month’s {{limit}} links."; AI unavailable line "Suggestions aren’t available right now. Your link saves as usual."; AI off (no AI UI); rule hint "From your rule for {{domain}}"; live "Filled in with AI’s suggestions".
- Features: EXT-06, EXT-07, EXT-08, EXT-09, EXT-10, EXT-11, EXT-13.
- Source: `popup-form/*`.

### SCR-EXT-03 Save form (All tabs)
- Route / how it opens: same form after switching to "All tabs" (first time after Chrome's tabs permission prompt).
- Platforms: extension.
- Regions: header (logo + switch); tab list block ("Select all" row with count and "already saved"; scrolling list of rows); form (Folder label; Folder button; Tags for all; quiet AI line); live region; footer (optional "Sort N links with AI" full width; "Open Shelfmark"; "Save N links").
- Shown information: per row: tick, host letter tile, tab title, host, "Saved" badge; after sort: spark, folder chip (tile + name), 1–2 tag chips (new ones dashed); "Picked by AI for each link" in the Folder field when per-link picks are active.
- Controls:
  - Mode switch (as SCR-EXT-02).
  - "Select all" checkbox labelled "{{selected}} of {{total}} selected" (indeterminate when partial; ticks all when some/none, unticks all when all); disabled while locked or loading.
  - Row checkbox (named by tab title); row text click toggles (mouse only); disabled while saving or sorting.
  - Row folder chip (after sort; "Folder for this link: {{folder}}. Change") → picker for that link.
  - Folder button → picker for all links.
  - Tags for all (tag input).
  - "Sort {{count}} link(s) with AI" / busy "Sorting {{count}} link(s)…"; shown while AI on until a sort produced picks; disabled at 0 ticked or while saving.
  - "Open Shelfmark".
  - "Save {{count}} link(s)" (primary); disabled at 0 ticked, while sorting, while list loads; Ctrl/⌘+Enter.
- Form fields: Folder (shared); Tags for all (max 20); Select all checkbox; per-tab checkbox.
- Primary action: Save → POST /api/links/batch → SCR-EXT-07.
- States: list loading (skeleton, status "Reading your tabs", list aria-busy); per-row working placeholder; quota line "Suggestions are paused until {{date}}. The other links go to the folder in the Folder field."; unavailable line; live "Links sorted with AI’s suggestions"; permission declined (stays on SCR-EXT-02).
- Features: EXT-13, EXT-14, EXT-15.
- Source: `popup-form/*`, `popup-tab-list/*`.

### SCR-EXT-04 Folder picker
- Route / how it opens: Folder button (form), row folder chip (All tabs after sort), Back from New folder.
- Platforms: extension.
- Regions: header (back icon button, title); optional "Keep AI picks" row; picker list (search box, scrolling tree); optional summary line; footer "New folder".
- Shown information: folders with icon, colour, nesting; current one ticked; "Unsorted" row.
- Controls:
  - Back (icon button "Back") → form, no change. Esc does the same.
  - "Keep AI picks" / "Each link its own folder" (pressed state, check when active) — only for the Folder field in All tabs after a sort.
  - Search "Find a folder" (focused on open on non-touch); arrow keys/Home/End/Enter drive the list ("Folders").
  - Folder rows → choose and return to form. "Unsorted" row (not when picking for one link).
  - "New folder" (folder-plus) → SCR-EXT-05 (not when picking for one link).
- Form fields: Folder search (text).
- Primary action: choose a row → back to form.
- States: no results "No folder with that name"; summary (All tabs after sort): "Each link keeps the folder AI picked." / "All {{count}} links go to {{folder}}. The AI tags stay." / "The link goes to {{folder}}. The AI tags stay."
- Titles by variant: "Choose a folder" (This page); "Folder for {{count}} link(s)" (All tabs, Folder field); "Folder for this link" (one tab's chip).
- Features: EXT-07, EXT-14.
- Source: `popup-picker/*`, `libs/ui` picker-list.

### SCR-EXT-05 New folder
- Route / how it opens: "New folder" in the picker.
- Platforms: extension.
- Regions: header (back, title "New folder"); field; footer.
- Shown information: name typed earlier (if any).
- Controls: Back ("Back") → picker (Esc same); "Create" (primary, disabled while empty; Enter same).
- Form fields: "Folder name", text, required, placeholder "For example, Recipes", hint "The folder is created when you save the page.", focused on open, cut to 100 chars silently.
- Primary action: Create → form with the new name (or the existing folder of that name).
- States: Create disabled when blank.
- Features: EXT-08.
- Source: `popup-new-folder/*`.

### SCR-EXT-06 Saved
- Route / how it opens: after a successful single save.
- Platforms: extension.
- Regions: centre (check icon, heading, optional warning notice, link card); footer.
- Shown information: "Saved to {{folder}}"; card: image, favicon/letter, host, title, tags.
- Controls: card click → folder page in app; "Open in Shelfmark" → folder page (/folders/:id or /unsorted); "Done" (primary) → close; Esc → close.
- Form fields: none.
- Primary action: Done (closes popup).
- States: warning "Couldn’t create the folder “{{name}}”, so the link is saved without a folder."
- Features: EXT-12, EXT-08, EXT-17.
- Source: `popup-saved/*`, `popup-link-card/*`.

### SCR-EXT-07 Saved tabs
- Route / how it opens: after a successful batch save.
- Platforms: extension.
- Regions: full success: centre (card stack, heading, text, close button or closed line); partial: header (heading), text, skipped list (scrolls), close button or closed line; footer.
- Shown information: counts, folder name; skipped rows (letter, title, reason).
- Controls: "Close {{count}} saved tab(s)" (shown until pressed; in partial view only if any saved; on failure the button stays); "Open in Shelfmark" → folder page or /links; "Done" (primary) → close; Esc → close.
- Form fields: none.
- Primary action: Done.
- States: "{{count}} link(s) saved to {{folder}}"; "{{count}} link(s) saved"; "You can close the tabs now: they are in your library."; "The saved tabs are closed."; "{{saved}} of {{total}} saved"; "This tab was skipped. The rest are in your library." / "These {{count}} tabs were skipped. The rest are in your library."; reasons "Address is too long", "Same address as another tab".
- Features: EXT-15.
- Source: `popup-saved-tabs/*`.

### SCR-EXT-08 Already in your library
- Route / how it opens: on open when the lookup finds the URL.
- Platforms: extension.
- Regions: header (title); link card; warning notice; footer.
- Shown information: "Already in your library"; card (image, favicon, host, title, tags); "You saved this {{when}} in {{folder}}."
- Controls: card click → folder page; "Save a copy" (ghost) → form (SCR-EXT-02) with fresh key; "Open in Shelfmark" (primary) → folder page.
- Form fields: none.
- Primary action: Open in Shelfmark.
- States: none other.
- Features: EXT-05.
- Source: `popup-duplicate/*`.

### SCR-EXT-09 Signed out
- Route / how it opens: no session on open; any 401.
- Platforms: extension.
- Regions: decorative strip of six floating saved-link cards (inert, hidden from assistive tech); logo; title and text; sign-in button; privacy line with link.
- Shown information: sample cards: "A complete guide to CSS grid" (web.dev, 4 days ago, css), "NestJS for frontend developers" (stepik.org, 2 days ago, course), "Free icon sets for side projects" (lucide.dev, 6 days ago, design), "The best weeknight ramen" (seriouseats.com, 7 days ago, recipes), "Wool coat, straight cut" (cos.com, 3 days ago, shopping), "Signal Forms in 20 minutes" (youtube.com, yesterday, video, angular). Relative dates in the popup language.
- Controls: "Sign in to Shelfmark" (primary) → /sign-in, closes popup; "Privacy policy" (small ghost) → /privacy.
- Form fields: none.
- Primary action: Sign in to Shelfmark.
- States: title "Sign in to save this page"; text "Sign in once in this browser, and every page after that is one click away."; privacy "Only the page you save is sent, nothing else you browse."
- Features: EXT-03, EXT-18.
- Source: `popup-signed-out/*`, `models/sign-in-cards.const.ts`.

### SCR-EXT-10 Page can't be saved
- Route / how it opens: active tab is not http(s) or vanished.
- Platforms: extension.
- Regions: centre (illustration "page not found", played once; title; text); footer.
- Shown information: "This page can't be saved"; "Shelfmark saves web pages. Browser pages, files and the new tab page stay out."
- Controls: "Open Shelfmark" → /links.
- Form fields: none.
- Primary action: Open Shelfmark.
- States: none.
- Features: EXT-04.
- Source: `popup-message/*`.

### SCR-EXT-11 Error (couldn't reach / couldn't save)
- Route / how it opens: failed load or save (not 401).
- Platforms: extension.
- Regions: centre (illustration: offline or not-found; title; reason line as alert); page preview; footer.
- Shown information: title "Couldn't reach Shelfmark" (load) / "Couldn't save this page" (save); reason; host and title of the page.
- Controls: "Open Shelfmark" → /links; "Try again" (primary; hidden for library-full and demo-full) → repeat load or save.
- Form fields: none.
- Primary action: Try again.
- States: exact reason lines in Errors table.
- Features: EXT-16.
- Source: `popup-message/*`.

### SCR-EXT-12 Chrome "tabs" permission prompt (browser UI)
- Route / how it opens: first switch to All tabs while the optional permission is not granted.
- Platforms: extension (Chrome's own dialog, no Shelfmark copy).
- Regions: browser dialog.
- Shown information: Chrome's text about reading browsing history/tabs.
- Controls: Chrome's Allow / Deny.
- Form fields: none.
- Primary action: Allow → tab list builds; Deny → stays on This page.
- States: n/a.
- Features: EXT-13.
- Source: `browser-tabs.service.ts` (`requestTabsPermission`).

### SCR-EXT-13 Library extension banner (web app)
- Route / how it opens: top of the library feed (library page routes, e.g. /links), signed in, offered, not dismissed, no split view / preview split, not selecting.
- Platforms: desktop (≥ 64em); screenshot from 80em.
- Regions: logo mark; copy (title, text); Install button; popup screenshot (≥ 80em); close button.
- Shown information: "Save pages straight from your browser"; "The Shelfmark extension saves the page you are on in one click or Alt+Shift+S, with your folders and tags filled in."
- Controls: "Install extension" (primary link, external icon, opens store in new tab; accessible name "Install extension from the Chrome Web Store (opens in a new tab)"); close icon button "Not now" → dismiss on this device.
- Form fields: none.
- Primary action: Install extension.
- States: hidden after dismiss; boot skeleton placeholder.
- Features: EXT-22.
- Source: `features/library/components/extension-banner/*`.

### SCR-EXT-14 Settings › Library › Saving: Browser extension row (web app)
- Route / how it opens: Settings › Library page, Saving section, after "Fetch titles and previews".
- Platforms: desktop only.
- Regions: settings row (title, description, button).
- Shown information: "Browser extension"; "Save any page in one click from Chrome, Edge, Brave or Arc".
- Controls: "Install" (external; accessible name "Install the browser extension from the Chrome Web Store (opens in a new tab)").
- Form fields: none.
- Primary action: Install (store in new tab).
- States: absent when not offered.
- Features: EXT-24.
- Source: `features/settings/pages/library/library.page.html`.

### SCR-EXT-15 Sidebar "Get the extension" row (web app)
- Route / how it opens: sidebar footer, after banner dismissed.
- Platforms: desktop only.
- Regions: one tree row above "Data & help".
- Shown information: download icon, "Get the extension".
- Controls: row select → store page in new tab.
- Form fields: none.
- Primary action: open store.
- States: absent unless dismissed and offered.
- Features: EXT-23.
- Source: `shell/sidebar/*`.

### SCR-EXT-16 Landing extension block (web app)
- Route / how it opens: public landing page, after the hero, revealed on scroll.
- Platforms: desktop Chromium only.
- Regions: copy (badge, title, text, browsers line); visual (disc, mock browser bar, popup screenshot).
- Shown information: copy listed in EXT-25.
- Controls: none (no link).
- Form fields: none.
- Primary action: none.
- States: absent when not fitting.
- Features: EXT-25.
- Source: `features/landing/components/landing-extension/*`.

### SCR-EXT-17 Privacy page: Browser extension section (web app)
- Route / how it opens: /privacy.
- Platforms: all.
- Regions: heading "Browser extension"; two paragraphs.
- Shown information: "The Shelfmark extension for Chrome, Edge, Brave and Arc works only when you click its button or press its shortcut, never in the background. It then sends Shelfmark the address of that one tab, to check whether you saved it already, and saves its address and title, with the folder, tags and note you pick, only when you press Save. It never sees your history or the other sites you visit. If you click “Fill in with AI” and AI is on in your account, it also sends Shelfmark that address and title, and your note when AI may read notes, to get AI suggestions, handled under the same AI terms as in the app. If you switch to “All tabs”, your browser asks once for the optional tabs permission; switching then checks the addresses of your open tabs (without any #fragment) against your library, to mark the ones you saved already. Nothing is saved until you press Save, and only the tabs you tick are saved or sent for AI suggestions." / "It uses your Shelfmark sign-in in that browser and cannot read the sign-in cookie itself. It can reach Shelfmark only, and keeps just the folders you saved to most recently on your device, to offer them next time."
- Controls: none.
- Form fields: none.
- Primary action: none.
- States: none.
- Features: EXT-26.
- Source: `features/privacy/privacy.page.html`.

## 4.7 Public pages, sign-in, demo and onboarding

### SCR-PUB-01 Landing (guest)
- Route / how it opens: `/` as a guest; `/about` as a guest.
- Platforms: desktop, tablet, phone (phone hides header nav and "Get started"; extension section desktop Chromium only).
- Regions: header; main: hero (copy left, app preview right / stacked on phone), Optional AI, Browser extension, bento (id `works`), before/after, about row (Why this exists + How it's built, id `how`), finale; footer (outside main).
- Shown information: all copy listed in PUB-03 to PUB-10; logo with wordmark "Shelfmark".
- Controls (in order):
  - Logo (not a link).
  - Nav (label "Main", not on phone): "How it works" (ghost, small; scrolls to the bento; modified click opens `/#works`), "Privacy" (ghost, small; `/privacy`, no app preload).
  - "Sign in" (ghost; `/sign-in`; hover/focus preloads app chunks).
  - "Get started" (primary; `/sign-in`; not on phone).
  - Hero: "Start your shelf" (primary large; `/sign-in`), "Open the demo" (secondary large; `/demo`).
  - AI note link "How AI works in Shelfmark" (`/privacy#ai`).
  - How it's built: "Read the code on GitHub", "Read the decision log" (new tab).
  - Finale: "Open the demo" (primary large; `/demo`), "Sign in" (large; `/sign-in`).
  - Footer: "What's new" (`/changelog`), "Privacy" (`/privacy`), "GitHub" (new tab); language buttons English, Français, Deutsch, Italiano, Español, Português, Українська (names from `LANGUAGE_NAMES`; pressed = current).
- Form fields: none.
- Primary action: "Start your shelf" → sign-in page; "Open the demo" → `/demo` → library.
- States: loading of below-fold sections (blank placeholders of the same size); reduced motion static frames.
- Features: PUB-01, PUB-03 to PUB-10.
- Source: `features/landing/**`.

### SCR-PUB-02 About (signed-in landing)
- Route / how it opens: `/about` when signed in (account menu "About Shelfmark", You list "About Shelfmark").
- Platforms: as SCR-PUB-01.
- Regions: as SCR-PUB-01 plus a "What's new" section directly under the hero.
- Shown information: What's new: title "What's new", list of 4 newest highlights (title, text, date); everything else as the landing.
- Controls: header "Back to my shelf" (replaces Sign in / Get started; `/links`); hero "Back to my shelf" (primary large) replaces both hero buttons; finale "Back to my shelf" replaces both buttons; "See all changes" link (`/changelog`); nav links and footer as guest (language buttons save on the account).
- Form fields: none.
- Primary action: "Back to my shelf" → `/links`.
- States: none extra.
- Features: PUB-02.
- Source: `features/landing/components/landing-whats-new/*`, `landing-header`, `landing-hero`, `landing-finale`.

### SCR-PUB-03 Privacy policy
- Route / how it opens: `/privacy`.
- Platforms: all.
- Regions: header with logo link; article.
- Shown information: see PUB-11; date "Last updated 19 November 2026".
- Controls: logo link to `/` ("Shelfmark, home"); "Google privacy policy", "GitHub privacy statement", "github.com/ddadivan/shelfmark" (new tab, hidden "(opens in a new tab)").
- Form fields: none.
- Primary action: none.
- States: `#ai` anchor focus/scroll.
- Features: PUB-11.
- Source: `features/privacy/*`.

### SCR-PUB-04 Changelog
- Route / how it opens: `/changelog`.
- Platforms: all.
- Regions: header with logo link; article: title, lead, releases.
- Shown information: per release: "Shelfmark X.Y.Z", date, New (title, text, screenshot), Improved (lines), Fixed (lines).
- Controls: logo link to `/` ("Shelfmark, home").
- Form fields: none.
- Primary action: none.
- States: empty sections omitted; draft releases hidden.
- Features: PUB-12.
- Source: `features/changelog/changelog.page.*`.

### SCR-PUB-05 What's new dialog
- Route / how it opens: automatic or from What's new entries (PUB-13, PUB-14).
- Platforms: dialog md; bottom sheet on phone (buttons full width).
- Regions: title, lead, top highlight (image, title, text), list of up to 3 more, "And N more…" link, footer.
- Shown information: highlight titles/texts/screenshot (theme-matched, alt text from changelog).
- Controls: dialog close (standard); "And {{count}} more improvement(s) and fix(es)" link → closes and opens `/changelog`; "See all changes" (ghost) → closes, `/changelog`; "Got it" (primary) → closes.
- Form fields: none.
- Primary action: "Got it" closes; the release is marked seen when the dialog opens.
- States: pending vs latest-highlight fallback.
- Features: PUB-13.
- Source: `features/changelog/components/whats-new-dialog/*`.

### SCR-PUB-06 How it works dialog
- Route / how it opens: account menu "How it works", You list "How it works", sidebar card, empty library "Watch how it works".
- Platforms: dialog lg; phone bottom sheet with phone recording.
- Regions: title "Shelfmark in 3 minutes", video, chapter list.
- Shown information: video, captions, chapter titles and times.
- Controls: native video controls (play/pause, seek, captions, fullscreen as the browser provides); 7 chapter buttons (pressed = playing chapter; click jumps and plays); close button "Close".
- Form fields: none.
- Primary action: watch.
- States: reduced motion: poster, no autoplay.
- Features: PUB-15.
- Source: `features/how-it-works/components/how-it-works-dialog/*`.

### SCR-PUB-07 How it works card (sidebar)
- Route / how it opens: desktop sidebar, conditions in PUB-16.
- Platforms: desktop.
- Regions: icon, text block, hide button.
- Shown information: "New here? Watch how it works", "3 minutes"; region name "How it works".
- Controls: title button → opens video; icon button "Hide" → hides card for good on this device.
- Form fields: none.
- Primary action: open video.
- States: visible/hidden.
- Features: PUB-16.
- Source: `features/how-it-works/components/how-it-works-card/*`.

### SCR-PUB-08 Update toast
- Route / how it opens: new version downloaded by the service worker.
- Platforms: all.
- Regions: toast.
- Shown information: "A new version of Shelfmark is ready".
- Controls: "Reload" (reloads), "Later" (dismisses).
- Form fields: none.
- Primary action: Reload.
- States: none.
- Features: PUB-18.
- Source: `core/pwa/update-prompt.service.ts`.

### SCR-PUB-09 Sidebar "Data & help" menu (desktop)
- Route / how it opens: desktop sidebar footer row "Data & help" (opens upward; ArrowUp on the row opens it).
- Platforms: desktop (from 64em) only; phone/tablet use the You list.
- Regions: menu.
- Shown information: items below.
- Controls (in order): "Import links" (download icon; opens import dialog, other area); "Export" (share icon; opens export dialog, other area); separator; "What's new" (gift icon; with accent badge "new" while pending; opens What's new dialog); "Send feedback" (message icon; other area).
- Form fields: none.
- Primary action: n/a.
- States: badge pending.
- Features: PUB-14.
- Source: `shell/sidebar/sidebar.component.html|ts`.

### SCR-PUB-10 You list help entries (phone and tablet)
- Route / how it opens: You tab (`/settings` index) below 64em.
- Platforms: compact (below 64em).
- Regions (this area's part, after the settings rows): "Send feedback" button; Help nav (label "Help"); "How it works" button; "Sign out" button; footer.
- Shown information: footer "Privacy policy" link and "Shelfmark {{version}}".
- Controls (in order): "Send feedback" (block, large; other area); Help nav: "What's new" row (link to `/changelog`, a plain click opens the dialog; dot with hidden "new" when pending; chevron), "About Shelfmark" row (`/about`; chevron); "How it works" (block, large, play icon; opens video); "Sign out" (block, large; signs out, no confirmation); footer "Privacy policy" (`/privacy`).
- Form fields: none.
- Primary action: n/a.
- States: pending dot.
- Features: PUB-13, PUB-14, PUB-15, AUTH-06, PUB-02.
- Source: `features/settings/pages/settings-index/settings-index.page.html|ts`.

### SCR-AUTH-01 Sign-in page
- Route / how it opens: `/sign-in` (guests only), with optional `?returnUrl=`, `?reason=`, `?error=`.
- Platforms: desktop (from 64em): drifting cards around a centred frosted panel; below 64em: a strip of six small cards on top, panel below.
- Regions: decorative art (hidden from assistive technology); main panel: logo, title, subtitle, alerts, provider buttons, "or" (desktop), demo button, privacy line.
- Shown information: "All your links on one shelf"; "Save anything once, find it again in seconds."; notices (AUTH-03); privacy line "By continuing you agree to the Privacy policy. We only use your name, email and avatar."
- Controls (in order): "Continue with Google" (large; primary on desktop, secondary below 64em; loading/disabled states); "Continue with GitHub" (large); "or" (text, desktop only); "Open the demo" (ghost; loading/disabled); "Privacy policy" link (`/privacy`).
- Form fields: none.
- Primary action: Continue with Google/GitHub → provider → back to return URL or `/`. Open the demo → sandbox → return URL or `/`.
- States: loading per button with others disabled; reason warning notices; error danger notices; demo error warning; generic failure "We could not sign you in. Try again."; shake on failure.
- Features: AUTH-01, AUTH-02, AUTH-03, AUTH-08.
- Source: `features/auth/sign-in.page.*`, `features/auth/components/*`.

### SCR-AUTH-02 Demo start page
- Route / how it opens: `/demo`.
- Platforms: all.
- Regions: full-page app skeleton (with demo banner strip in the static skeleton), status text.
- Shown information: "Opening the demo…" (role status), page marked busy.
- Controls: none.
- Form fields: none.
- Primary action: automatic → `/links` or `/sign-in?reason=…`.
- States: opening; failure redirects.
- Features: AUTH-08.
- Source: `features/auth/demo-start.page.*`, `shell/boot-skeleton/*`.

### SCR-AUTH-03 Demo banner
- Route / how it opens: top of the app shell for a demo user.
- Platforms: all.
- Regions: info notice banner: text, action slot.
- Shown information: "You're in a demo." + "Play with everything — this sandbox resets in N hours." / "… in 1 hour."
- Controls: "Sign in with your own account" (small primary; signs out the demo and opens `/sign-in`; disabled while running).
- Form fields: none.
- Primary action: as above; no confirmation.
- States: counting down; at zero auto sign-out to `/sign-in?reason=demo-expired`.
- Features: AUTH-09.
- Source: `shell/demo-banner/*`.

### SCR-AUTH-04 Signed out in another tab (lock dialog)
- Route / how it opens: another tab of the same user signed out.
- Platforms: dialog sm (alert dialog); bottom sheet on phone.
- Regions: title, text, footer button.
- Shown information: "You signed out in another tab"; "To keep your links private, this tab is locked too."
- Controls: "Sign in again" (primary, focused) → `/sign-in?returnUrl=<page>`. Not dismissible (no Esc, scrim or close).
- Form fields: none.
- Primary action: Sign in again.
- States: signing in in another tab reloads this tab.
- Features: AUTH-13.
- Source: `core/sync/signed-out-dialog/*`, `core/sync/signed-out-lock.service.ts`.

### SCR-AUTH-05 Account menu (desktop header)
- Route / how it opens: avatar button "Account menu" at the right of the desktop header (from 64em).
- Platforms: desktop only (below 64em the header and this menu are not rendered; the You tab has equivalents).
- Regions: account card (avatar, name, email), items.
- Shown information: user avatar (profile photo or initials), name, email (demo: "Demo user", `demo-<id>@demo.shelfmark.invalid`).
- Controls (in order): "Settings" (settings icon; `/settings`); "Send feedback" (message icon; other area); if admin: "Feedback inbox" (inbox icon), "Usage stats" (chart icon) (never for demo); separator; "How it works" (play icon; video dialog); "About Shelfmark" (info icon; `/about`); separator; "Sign out" (logout icon; no confirmation).
- Form fields: none.
- Primary action: n/a.
- States: admin items conditional.
- Features: AUTH-06, PUB-02, PUB-15.
- Source: `shell/app-shell.component.html|ts`.

### SCR-ONB-01 Welcome dialog
- Route / how it opens: automatically in the shell when onboarding is due.
- Platforms: dialog md (title visually hidden, used as accessible name); phone bottom sheet with full-width buttons.
- Regions: illustration scene; copy (step dots, title, text); hidden live region; footer.
- Shown information: step illustration (`welcome-collect`, `welcome-save`, `welcome-find`), title and text per step, dots "Step N of 3".
- Controls: "Skip" (ghost; closes, completes); "Back" (steps 2–3); "Next" (primary, focused) / "Add your first link" (last step, plus icon; closes, completes, opens Add link); Esc / scrim = Skip; ArrowLeft / ArrowRight change step.
- Form fields: none.
- Primary action: Next → … → Add your first link → Add link dialog.
- States: step 1–3; reduced motion.
- Features: ONB-01.
- Source: `features/onboarding/components/onboarding-dialog/*`.
