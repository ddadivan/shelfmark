# Shelfmark — project document

Nov 2, 2026 · @Dmytro

## Status

Updated as work goes on — every session resumes from here.

- [x] Project document: sections 1–11 and backlog; landing, Try demo, PWA and Share target, export, Sentry, ADR log added
- [x] [Shelfmark design system](https://claude.ai/artifact/BQrxb4RyTEo89FzAwgRFv7): tokens, font, spacing, radii, motion, brand book, cover, 23 components, logo, illustrations
- [x] [Screen mockups](https://claude.ai/artifact/8vqtkwVg3JcrKZFQoe9Cs9) — 22 artboards incl. landing (desktop and phone), demo-mode banner, Share quick form, export menu, tooltips
- [x] Author review of mockups and document, fixes
- [x] Stage 0 "Foundation" (9.1) — done Nov 5, 2026
  - [x] GitHub templates, Dependabot, `CLAUDE.md`, 8 agents, skills, guard hook, permission allowlist
  - [x] Nx workspace: Node 26, TS 6.0.3, Nx 24, ESLint, Prettier, stylelint, lefthook + gitleaks
  - [x] API: NestJS 12, `libs/shared/contracts`, `/api/health`, unified error shape, helmet
  - [x] Web: Angular 22 zoneless, Transloco, `ThemeService`, Playwright desktop + phone
  - [x] `libs/ui`: tokens, themes, Onest, Storybook on Vite, `ui-icon`, `ui-button`
  - [x] Claude Code hooks (format on edit, typecheck + tests on stop), Angular AI config, MCP servers
  - [x] Strict TypeScript and one type per file; filled design-system icons
  - [x] ADR 0001–0017; `docs/SETUP.md` (the author's manual steps)
  - [x] GitHub repository, Projects board, labels, milestones and stage 0 issues
  - [x] CI: GitHub Actions workflow with four required checks (`lint-test-build`, `e2e`, `npm-audit`, `gitleaks`), ADR 0018
  - [x] CodeQL default setup (JS/TS, Actions), `main` ruleset (PR + four required checks + CodeQL gate, squash only, linear history, no force-push / deletion), SHA-pinned actions required (ADR 0018)
  - [x] Deploy: [shelfmark-app.vercel.app](https://shelfmark-app.vercel.app) — static web + NestJS as one Vercel Function (`fra1`), strict CSP and security headers, Neon project `shelfmark` (`eu-central-1`, branch per preview), guard hook blocks secret-revealing Vercel / Neon CLI commands (ADR 0019)
  - [x] Dependency install scripts denied and enforced in CI (#4, ADR 0020); Vercel routing: missing files 404, clean API query string, Framework Preset Other (#13, ADR 0019)
  - After every production deploy: `BASE_URL=https://shelfmark-app.vercel.app npx nx e2e web-e2e` (the missing-file 404 relies on undocumented Vercel behaviour)
  - Next: stage 1 issues from 9.1 (the author decides when); CSP nonce middleware (#9) before the first `libs/ui` component renders in `apps/web`
  - Verification of protected previews by agents: `vercel curl` and `vercel logs` (CLI login, no bypass token)
- [x] Stage 1, stages 1–7 of 9.1: code done and in production, Nov 9, 2026
  - All stage-1 milestones have no open issues. Release security check closed (#110, `docs/security/release-check.md`); production checks done with the author (API boot fix #204, `CRON_SECRET`, Google OAuth app published, privacy page #202).
  - Author review of production fixed in #212 (#211): landing, sign-in, app shell scroll areas, view switch without layout shift, link card, menus, dialogs, overlays, search, tooltips, toasts (bottom centre by the author's decision), settings, favicon, 24px icons; icon sprite built from single SVG files (#210).
  - Left before stage 1 is formally complete (10.1): landing Lighthouse stable at ≥ 0.9 (#195, moved into stage 2), and the author's two weeks of daily use.
- [x] Stage 2: released to production on Nov 14, 2026 (release PR #378, `stage → main`). Scope chosen by the author on Nov 9, 2026 (see "Roadmap after stage 1" below). Started Nov 10, 2026 with the redesign.
  - Nov 10, 2026: the `stage` branch exists; the 2027 Refresh design is in `docs/design` (the stage 1 design in `docs/design-v1`), the migration plan in `docs/design/MIGRATION.md`; the work runs on `design/2027-refresh` from `stage`, one issue at a time, then one PR into `stage`.
  - First task of stage 2: switch to the release flow decided on Nov 9–10, 2026 (9.3 and 9.5): a `stage` integration branch without a staging environment, feature branches from `stage`, a To release column on the board, production changes only through a release PR at the end of a stage.
  - Then the redesign (an updated design with more convenient blocks, from the author's new mockups, which already cover the stage 2 screens), then the author reviews the redesigned app, and only then the stage 2 features start. Until then nothing from stage 2 is merged into `main`, so production stays as the author uses it.
  - Nov 10, 2026: the 2027 Refresh redesign of everything stage 1 has is merged into `stage` (#259, issues #219–#258 in To release); the Storybook a11y follow-up #278 made the `stage` CI green. The author reviewed the redesign and started the features: milestone `Stage 2 · Features`, issues #260–#276, #195, #205.
  - Nov 10, 2026: release flow recorded in [ADR 0035](adr/0035-stage-integration-branch-release-flow.md) (#260): branches from `stage`, PRs into `stage` with `Refs #N`, To release column, release PR `stage → main`; `CLAUDE.md`, the `github-workflow` skill, the agents, the PR template, Dependabot and the guard hook follow it.
  - Nov 10, 2026, decisions of the author for the stage 2 features (recorded on each issue): work order #260, #205, #261, #266, #262, #263, #264, #265, #267, #268, #269, #195, #270, #272, #273, #274, #276, #271, then the Settings › Library and the Appearance extras issues; independent tasks run as parallel PRs from `stage`, dependent ones are stacked ("Merge after #N"). Trash: every delete of links and folders goes to Trash (account deletion and demo cleanup do not), retention 7 / 30 / 90 days, default 30. Saved views: a link `kind` (video, article, shopping, other) derived at save time; starter views All, Videos, Articles. Languages: English, French, German, Italian, Spanish, Portuguese. Feedback: statuses Received, Planned, In progress, Done, Not planned, set by the author on an admin page (`/admin/feedback`, allowed by the `ADMIN_EMAILS` setting); the screenshot is stored in Postgres. Reminders (#275) moved to the backlog as a whole. Sharing: public link only; invites and roles moved to the backlog. Email and password sign-in (#277) moved to the backlog.
  - Nov 11, 2026: all stage 2 features are merged into `stage` (#291–#306): Trash, folder colours and pins, saved views and the link kind, paste many, Recently opened extras, select and bulk actions, public collections, Settings › Library in full, custom theme and Animations, Appearance extras, interface languages (en, fr, de, it, es, pt), feedback with the admin inbox, tab sync, drag and drop, Move to folder, the landing for signed-in users, How it works with the promo video. CI on PRs into `stage` runs only the browser tests a diff touches (9.5, #304) and falls back to a browser-only install when the Ubuntu mirrors fail (#306). Reminders (#275) and email sign-in (#277) are in the backlog by the author's decision.
  - Nov 11–12, 2026: the author's review of `stage` fixed in three batches (#312, #314, #315, leftovers #326); libs/ui and apps/web folder structure (#318, #324, ADR 0042); breakpoints with the mobile shell below 64em and iPad sheets (#316); sharded CI browser run (#313); Move to folder as a folder picker in a sheet (#325); inline header search with a results panel from 80em (#329); both promo videos re-recorded with every feature (#330, desktop 3:15, phone 2:41, seven chapters). Usage stats for the admin are an idea in the backlog (#333).
  - Nov 12, 2026: the author set `ADMIN_EMAILS` in Vercel (Production) and decided the deepmerge alert (#205: dismissed as tolerable risk; the minimatch fix closes its alert with the release).
  - Nov 12–13, 2026: quality pass before the release, at the author's request. Five PRs into `stage`, stacked where needed:
    - [#343](https://github.com/ddadivan/shelfmark/pull/343) thin components (#338). The library page, the add-link dialog, the sidebar tags and the sidebar move their logic into scoped services, a hotkeys directive and `utils/`. The rule is in `apps/web/CLAUDE.md` and the v22 skill. Two root causes of flaky unit tests are fixed on the way: the drag Esc listener leak and the history search debounce wait.
    - [#346](https://github.com/ddadivan/shelfmark/pull/346) initial bundle 758 → 458 kB (#339), merge after #343. English, the landing (preloaded before bootstrap), the library stores, the signed-out dialog and the toast service are lazy.
    - [#344](https://github.com/ddadivan/shelfmark/pull/344) visual regression screenshots (#340). 17 screens × desktop, tablet and phone × light and dark, compared in the Playwright container. The `visual:update` label regenerates and commits the baselines.
    - [#345](https://github.com/ddadivan/shelfmark/pull/345) contract tests (#341). 97 shared scenarios run against the web mock and the real API, and 12 mock drifts are fixed.
    - [#347](https://github.com/ddadivan/shelfmark/pull/347) component stylesheets under 4 kB (#342), merge after #344 (the visual check proves no change).
  - Nov 13–14, 2026: everything above is merged into `stage`, plus:
    - the author's stage review batches 4–7 (#337, #351, #353, #357) and the wide-screen font steps (#355);
    - the test rebalance (#349, ADR 0043) in phases 1, 2a, 2b and 3 (#354, #358, #361): e2e keeps the journeys, the rest moved to component specs with CDK harnesses;
    - CI builds the app once for the browser shards and Lighthouse, caches the browsers and checks the web coverage threshold (#362, PR #364);
    - Lighthouse performance back above 0.9 with margin (#359, PR #360);
    - the emoji picker for folders with search, categories, recent and own emoji (#363, PR #365);
    - refactors of the largest stores and components (#366, PRs #367–#370).
  - Nov 14, 2026, release preparation: the 16 migrations since the last release were applied in order to a database seeded on the `main` schema (PGlite, outside the repo). All apply cleanly, keep every row, backfill the link kind, starter views and folder positions, and copy the old feedback screenshot to `feedback_screenshots`. `nx run api:db-check` shows no drift from `schema.prisma`. None of them drops or renames a column that the code on `main` reads, so production keeps working between `prisma migrate deploy` and the switch to the new deployment. The security review of the release is in progress (#371).
  - Nov 14, 2026: released to production in #378. Before the release it waited for the author's command: #371 merged into `stage`, the promo videos re-recorded (#336), merge commits turned on for `main`. Then the release PR `stage → main` (merge commit) closes every issue in To release. After the release: production smoke (`BASE_URL=https://shelfmark-app.vercel.app npx nx e2e web-e2e`), the Feedback inbox shows for the admin (`ADMIN_EMAILS`), the Trash cleanup cron shows in Vercel, and Dependabot's pending updates are re-opened against `stage` (#279 and #282 target `main`).
- [x] Motion in code (landing and app); promo video moved to stage 2
- [ ] Stage 3: planned by the author on Nov 14, 2026 (see "Roadmap after stage 2" below). Only side-by-side (#386, design first). The other tasks of that planning are in the backlog with their issues: import (#387), read / unread and Read later (#396), AI (#388 with #389–#395), the dead-link check (#397), rules without AI (#398) and commands in ⌘K (#399). Milestone and board moves are listed in the docs PR for the author.
  - Next: the side-by-side design in `docs/design` (#386), reviewed by the author before code.
  - Ideas that are not planned (licence, launch, monetisation, legal, trademark, save by email) are in "Ideas to discuss (not planned)".

## 1. Problem and idea

The service collects all saved links in one place and gives quick access to them.

**The name is Shelfmark.** In English, a shelfmark is a mark on a book that shows its place on a library shelf: shelf + mark, a nod to bookmark. Availability of the name on GitHub, npm and domains is checked in stage 0.

**Problem.** People save links wherever they can: most often in Telegram "Saved Messages", sometimes in browser bookmarks, notes and chats. As a result:

- the link you need is impossible to find;
- people almost never come back to what they saved;
- there is no order and no categories;
- over time it is unclear why a link was saved.

**What people save.** Everything: videos, articles, clothes and products, courses, tools. The service must work with any type of link, not just articles.

**Who it is for.** A broad audience: anyone who saves a lot. The product author is part of this audience.

**Value proposition (stage 1).** One place for all links with convenient organisation and search. Unique "killer features" (AI, reminders, etc.) are deliberately postponed until after the MVP.

**Growth.** After the first phase, a decision will be made about developing it into a commercial product with subscriptions.

## 2. Target audience and use cases

Stage 1 is a personal responsive web service: the user adds links manually and finds them in whatever way is convenient.

**Audience.** Broad: anyone who saves a lot of links. Stage 1 runs in the browser on desktop, tablet and phone (responsive interface).

**"Save" scenario.** The user pastes a link manually in the web interface.

**"Find" scenario.** All methods are available, so finding things is versatile:

- folders / collections;
- tags;
- search by title, note and URL;
- a common feed of all links.

**"Recently opened" page.** The links opened in the last 30 days, grouped by day (a sheet on a phone). A link can be removed from the history, or the whole history cleared; the links stay saved.

**Access.** All links are strictly private, no sharing.

## 3. MVP (stage 1): core features

Stage 1 is a personal responsive web app (desktop and phone): account, manual link adding with automatic preview fetching, nested folders, tags, favorites and search.

**Account.** Sign-up and sign-in; each user has their own links (details in section 5.4).

**Adding a link.** The user pastes a URL, the service automatically fetches the title, site icon and preview image. The user can edit the fetched data.

**Link fields:**

- URL;
- title;
- a "why I saved it" note;
- tags;
- folder;
- date added.

**Link actions:** open, edit, delete, add to favorites / remove from favorites.

**Organisation:**

- nested folders (a folder within a folder): create, rename, move, delete;
- tags: add to a link, filter by tag;
- a "Favorites" section.

**Search and browsing:**

- search by title, note and URL;
- a common feed of all links;
- view toggle: cards with previews / list;
- a "Recently opened" page (`/recent`, a sheet on a phone).

**For the portfolio and convenience (also stage 1):**

- a landing page before sign-in: what it is, screenshots, "Try demo" and sign-in;
- **Try demo**: sign in without an account into a personal sandbox with ready-made links, folders and tags; the sandbox is deleted after 24 hours;
- **PWA**: install on phone and desktop; on Android, Shelfmark appears in the "Share" menu (Web Share Target), so a link is saved in one tap from any app, including Telegram;
- **data export**: JSON and an HTML bookmarks file (opens in any browser).

**Not in stage 1:** "read / unread" status, archive, import from Telegram, browser extension, sharing, AI features, subscriptions. Everything postponed is in the "Roadmap after stage 1" section.

## 4. User stories and requirements

24 stories of stage 1 in 7 groups, plus the stage 2 stories (25 onwards); acceptance criteria under each one are used to verify completion. Numbers 1–18 and 20–25 plus the unnumbered "Onboarding"; number 19 is not used, so references to stories do not shift.

### Account

1. **Sign-up.** As a new user, I want to create an account so that my links are stored only for me.
   - Sign-up is possible (methods in section 5.4).
   - After sign-up the user lands in an empty feed with the hint "Add your first link".
2. **Sign-in and sign-out.** As a user, I want to sign in and sign out of my account.
   - After sign-in only your own links, folders and tags are visible.
   - An unauthenticated user cannot open app pages or call the API.

**Onboarding.** As a new user, I want a short introduction to the service so that I can save my first link right away.

- After the first sign-in, a 3-step onboarding dialog opens (section 7.3).
- It can be skipped at any step; once closed it never appears again, neither on this device nor on another.
- The last step opens the add-link form.
- It shows once. Settings and the account menu had "Show welcome again"; it was removed in #315 (the tour is a one-time thing).

### Adding a link

3. **Add a link.** As a user, I want to paste a URL and save it.
   - An invalid URL is not saved; an error is shown.
   - Folder, tags and note can be set right away; all three fields are optional.
   - If a folder is open, it is pre-filled in the form by default.
   - **Paste several links** (stage 2, #265, screen `PasteMany`): text with more than one link pasted into the Link field, or pasted with ⌘V / Ctrl+V anywhere in the library outside a field, turns Add link into a list. So it can be found (#315), Add link (dialog and phone sheet) says under the Link field "Have several links? Paste them all at once" with an "Add several links" button: it swaps the fields for a large text area ("Paste links, one per line or inside any text", focus moves into it, "One link" goes back); pasting there is plain text entry (paste several times, edit; Enter is a new line, #335), and only "Find links" (or Cmd/Ctrl+Enter) opens the same list through the same parser and limits (no links: "No links found in this text"). Links are read one per line or from inside any text; a bare domain with a path gets `https://`; the same link twice counts once; lines without a link are listed as "Not a link, skipped"; at most 100 links, the rest is left out with a note that bigger lists go to Import as text. Each row is checked by default and loads its preview (a few at a time through the preview endpoint); a link that is already saved comes unchecked with an "Already saved" badge; rows can be unchecked or removed; "Folder for all" and "Tags for all" apply to every link. "Save N links" saves them in one request; they land at the top of the feed and a toast says "N links saved to <folder>" with "Titles and previews are still loading" and Undo (8 s). Over the link limit, the dialog says how many more fit.
4. **Automatic preview.** As a user, I want the title, site icon and preview image to be fetched automatically.
   - After pasting a URL the fields are filled automatically; the user can change them.
   - If the preview could not be fetched (site unavailable, error), the link is saved with the URL instead of the title and a placeholder icon.
5. **Duplicates.** As a user, I want to know that I already saved this link.
   - When the URL matches, a warning "Already saved in folder X" is shown with a link to it.
   - The user can open the existing one or save anyway.

### Working with a link

6. **Open.** A click (a tap on a phone) opens the link in a new tab and updates "Recently opened". While links are selected (story 28) a click toggles the selection instead and nothing opens.
7. **Edit.** URL, title, note, tags and folder can be changed.
   - **Move to folder** (stage 2, #261, picker #325): "Move to folder…" in the ⋯ menu of a card and a row, and "Move" in the bulk bar, open a folder picker, not a form. A search field on top filters by name (a match keeps its parent folders visible); the list below shows Unsorted first, then the folders nested with the sidebar's icon and colour. The folder the link is in (or the one shared by the whole selection) is marked "Current folder" and cannot be chosen. Choosing a folder moves the link or the whole selection at once and closes the picker; a toast says "Moved to <folder>" ("3 links moved to <folder>" for a selection) with Undo, which puts every link back into its own folder, and a failed request puts them back with an error toast. Below 64em the picker is a bottom sheet (a centred 560px column on a tablet); on desktop it is the same content in a centred dialog. Keyboard: focus starts in the search field (on touch screens in the sheet, so the keyboard does not cover the list); ArrowDown or ArrowUp enters the list, arrows, Home and End move, Enter chooses, Esc closes and focus returns to the menu button that opened it. The list is an Angular Aria listbox with a name for every row.
   - **Drag and drop** (stage 2, #266): from the tablet width, drag a card or row (hold 150 ms on touch) onto a folder or Unsorted in the sidebar, or onto a subfolder tile. The preview is the real card (or row), tilted and shrunk to about 0.65 and offset down-right of the pointer so the folder under it stays visible, with a badge ("Move 1 link", or "3 links" over a two-card deck when a selection travels together); dragging a selected card carries the whole selection (one batch move, one toast with Undo), an unselected card moves alone; the slot stays as a dashed outline, the folder under the pointer is highlighted with "Move here", a closed folder opens after 600 ms, Esc cancels. The drop is the same optimistic move with Undo. Phones have no drag (long press is for selection, #267); "Move to folder…" is the way there and the keyboard path.
8. **Delete.** Deletion requires confirmation and moves the link to Trash (story 19); it is not gone until the retention period passes. Undo for 8 s after the confirmation, then the toast says "Moved to Trash".
9. **Favorites.** As a user, I want to mark important links.
   - Add to favorites or remove from them in one click.
   - The "Favorites" section shows all marked links.

### Folders and tags

10. **Nested folders.** As a user, I want to organise links into folders of any depth.
    - Create, rename, move a folder (including into another folder).
    - A folder cannot be moved into itself or into its own subfolder.
11. **Deleting a folder.** When deleting a folder that contains links, the user chooses: delete everything together or move the links to "Unsorted". The folder (with its subfolders and, if chosen, its links) goes to Trash as one entry (story 19).
12. **Links without a folder.** A folder is optional: links without a folder go to the "Unsorted" section and to the common feed.
13. **Tags.** As a user, I want to tag links and filter by tags.
    - Several tags per link; autocomplete from existing tags.
    - Clicking a tag shows all links with it.

      Custom tags are created in two ways: in the tags field of the link form (type a new name → the last suggestion row "Create tag “…”", Enter or comma) and with the "+" button next to the "Tags" section in the sidebar (inline field, empty tag). Name up to 50 characters, spaces are replaced with hyphens, unique case-insensitively.

      A tag has a menu (right click, long press or "…"): show links, rename in place (offers to merge if the name matches), merge with another, delete (confirmation with the link count, the links themselves remain; Undo 8 s). The sidebar shows the 8 most used tags and "+ N more". Screen "Tags: create, rename, delete".

### Search and browsing

14. **Common feed.** The "All links" section shows all of the user's links.
15. **Search.** Search by title, note and URL finds links in all folders (every word of the query must match, at most 5 words).
    - **Inline search (stage 2, #329).** From 1280px (80em) the header search is a real field: the first typed character opens a results panel right under it (a glass surface like the menus, at least as wide as the field, at most about 60% of the viewport height, the list scrolls inside; it enters and leaves with the `pop` animation). The panel lists the links (title, note and URL), then the folders and tags that match, with "Show all results" when there are more links; ↑ ↓ / Home / End move, Enter opens the link in a new tab (⌘Enter / Ctrl+Enter in the background and the panel stays), a folder, a tag or "Show all results" opens its page and clears the field. Esc closes the panel and keeps the text, a second Esc clears it; a press outside or leaving the field closes it too; ↓ reopens it while there is text. ⌘K / Ctrl+K focuses the field. From 1024px to 1279px (64em to 80em) the header has a compact "Search ⌘K" button that opens the search dialog (the one below 64em keeps its full-screen phone and tablet look); ⌘K opens the dialog there. The field is an ARIA combobox (`aria-expanded`, `aria-controls`, `aria-activedescendant`); the panel and the dialog share one results component.
16. **Sorting.** By date added (newest first, the default) and by title.
17. **View.** A "cards / list" toggle; the choice is remembered.
18. **Recently opened.** A page (`/recent`, opened from the sidebar; the same list in a sheet from the Library tab on a phone) with the links opened in the last 30 days, in day groups (Today, Yesterday, Earlier this week, then by date), each with its folder and the time of the open. A link can be removed from the history, and "Clear history" (after a confirmation) empties it; the saved links are not touched.
    - Row menu: Open in new tab, Show in folder (the folder, or Unsorted), Copy link, Remove from history. On a phone a row swiped left reveals "Remove"; the button is always reachable without the swipe (focus slides the row aside, #269).
    - "Pause history" / "Resume history" in the page header (#269): an account setting (`pauseHistory` in `/api/me/settings`), so it follows the user to every device. While paused the server does not record opens (the link still opens; `POST /api/links/:id/open` answers `recorded: false`), and the page shows "History is paused. Links you open now aren't added." with "Resume". The toggle is optimistic and rolls back with an error toast.
    - A search field next to the type chips filters the loaded history by title and domain (client-side, debounced, with a clear button and a "Nothing matches" state). The footer says "Kept for 30 days, only on your account. Removing from history doesn't delete the link."
19. **Trash.** As a user, I want to get back what I deleted by mistake (ADR 0036, screens `TrashView`, `MobileTrash`).
    - Every deleted link and folder waits in Trash for the period set in Settings › Library (7, 30 or 90 days, 30 by default); then it is removed for good. A folder is one entry that says how many links went with it.
    - The page `/trash` (a row at the very bottom of the sidebar under a divider, with the count; a tile on the phone Library page) shows the entries as "Recently deleted" rows: preview, title, where it came from ("From Clothes", "From Unsorted"), when it was deleted and a days-left badge (warning at 3 days or fewer). Chips All / Links / Folders with counts filter them.
    - Restore puts a link back in its folder, or in Unsorted if the folder is gone; a folder comes back with its subfolders and links, at the top level if its parent is gone. If the library is full the answer is "Couldn't restore".
    - "Delete forever" (a confirmation) removes one entry; "Empty trash" (a confirmation that counts the items and the links inside folders) removes all.
    - Selection: checkboxes on desktop, a long press on a phone, "Select all", and a bar with Restore and Delete forever. On a phone a row swipes left to Restore / Delete; both buttons are also reachable without the swipe (keyboard, screen reader).
    - Settings › Library has "Keep deleted items for" (saved at once; a shorter value asks first when items in Trash are older than it, because the nightly cleanup deletes them) and a "Trash" row with the item count and "Open Trash".
    - Empty state "Trash is empty". Entries are removed for good at the nightly cleanup (the API job); account deletion and the demo cleanup delete for good.

### Demo, install, export

20. **Landing.** As a guest, I want to understand what the service is before signing in.
    - First screen: the heading "Paste a link. Find it again. Even in a year." and a live "Saved Messages" chat with five links from different days. The "Put them on the shelf" button clears the messages, and the same links land on the shelf in folders, with notes taken from the message text. Below: a "before / after" scene, a "Why this exists" block (author's quote) and "How it's built" (stack, 8 Claude Code agent roles, link to GitHub and the decision log), and a finale "Empty your Saved Messages." with the "Open the demo" and "Sign in" buttons.

      **Landing animations** (the only place where section reveals and background loops are allowed; the app has none): the chat is an endless feed: every 1.8 s a new message with a link slides in from the bottom, the whole feed smoothly rises by one message (650 ms, `transform` only), old messages leave past the top edge under a gradient mask and do not vanish abruptly; messages have the same height, the list is duplicated for a seamless loop; in the "before" block, notes and tabs slowly drift and "+1 in Saved Messages" pops up periodically; in the "after" block, the shelf cycles through the folders Clothes → Angular → Recipes (9 s loop, the folder highlight moves, the list changes). Sections below the first screen appear on scroll once: fade + 16 px upward shift over 320 ms, children staggered by 60 ms (`IntersectionObserver` with a \~20% threshold or CSS `animation-timeline: view()` where supported). The chat and "before/after" animations start when the block enters the viewport and pause when it leaves or the tab is hidden. With `prefers-reduced-motion`, everything is static and the final frame is shown.
    - An authenticated user goes straight into the app.
21. **Try demo.** As a recruiter, I want to try the service without signing up.
    - The button creates a personal demo sandbox with \~20 links, 5 folders and tags; all features work.
    - A banner at the top: "You're in a demo · data resets in 24 h · Sign in to keep your links".
    - The sandbox is deleted after 24 hours; other users' data is not accessible.
22. **Install and "Share".** As a phone user, I want to save a link from any app.
    - The service installs as a PWA (icon, launch without the address bar).
    - On Android, Shelfmark is in the "Share" menu: a quick save form opens with the preview already fetched.
    - On iPhone: install to the Home Screen (the iOS "Share" menu is not available to web apps).
23. **Export.** As a user, I want to take my data with me.
    - In settings: "Export as JSON" and "Export as browser bookmarks (HTML)".
    - Export is available right from the library: an "Export" button on the toolbar above the list (current folder or filter as JSON or HTML bookmarks, or all links) and an "Export all links" item in the account menu. The file contains links, folders, tags and notes; it downloads immediately.
24. **App rating.** As the author, I want to know how much people like Shelfmark and what to improve.
    - When: 3 days, 1 week, 1 month and 1 year after sign-up (`User.createdAt`). The dialog is shown on the first visit after the date, once per milestone, \~5 seconds after load and never on top of another dialog or an unsaved form. If several milestones were missed, only the latest is shown. Not shown in demo mode or before onboarding is completed.
    - Dialog 1, rating: "How do you like Shelfmark so far?", a scale from 1 to 10 (ten buttons, edge labels "Not really" / "Love it"), a "Not now" button. Keyboard control (arrows, digits 1–9, 0 = 10).
    - Score 8–10 → straight to the thank-you dialog.
    - Score 1–7 → dialog 2, feedback: "What would make it better?", a text field (up to 2000 characters), "Send" and "Skip" buttons; the score is saved even on "Skip". After sending: the thank-you dialog.
    - Dialog 3, thank you: "Thank you" + one line (for feedback: "We read every message"), closed by a button or automatically after 4 s. The steps change inside one window with a smooth transition, as in onboarding.
    - "Not now" or Esc closes it until the next milestone (recorded as "skipped"). On phone: a bottom sheet.
25. **Send feedback (#272).** As a user, I want to tell the author an idea or a problem at any time and see what became of it; as the author, I want to read and answer every message.
    - Where: "Send feedback" in the account menu (desktop), in the You list (phone) and on Settings › Your feedback. It opens one dialog (a bottom sheet on a phone).
    - The form: a type control (Idea, Problem, Other), a message field (1–2000 characters, counter, a different question and placeholder per type), up to three optional screenshots (#352: drop or pick several, a thumbnail and a remove button each, the drop area hides at three; PNG, JPEG or WebP, 2 MB each), "Attach browser and app version" (on by default), Cancel and Send. While it sends (the message, then each screenshot) the dialog cannot be dismissed: Esc, the scrim, the close button, the sheet drag and Cancel wait until it is done; signing out still closes it and stops the remaining uploads.
    - Screenshot: a drop area and a "choose a file" button (the button is the keyboard and screen-reader route; dropping is only a shortcut). PNG, JPEG or WebP up to 2 MB; type and size are checked in the browser before anything is sent, with clear messages; the preview is a `data:` URL thumbnail (the CSP allows `data:`, not `blob:`); sent as base64 per the contract.
    - States: Sending… (button loading); "Thank you" with "Done"; a failed send keeps the text and says "Couldn't send. Your text is kept — try again in a moment."; a 429 has its own message.
    - Settings › Your feedback (`/settings/feedback`): a "Send feedback" button and the user's messages, newest first: type, text, sent date ("Sent today", "Sent 3 Nov"), the author's reply ("Reply: …") when there is one, and a status badge (Received, Planned, In progress, Done, Not planned). Loading, empty and error states. The "Ratings" block of the mockup is not part of this story.
    - The author's inbox (`/admin/feedback`, only for the author; everyone else is sent to `/links` and the API answers 404): a "Feedback inbox" item in the account menu and the You list, shown only when `GET /api/admin/status` says so; every message with sender name and email, date, status badge and a thumbnail per screenshot (up to three, each opens the image); a status filter; per message a status select and a reply field with Save. Saving is optimistic: it rolls back with an error toast when the API refuses.
26. **Folder colours, icons and pins.** As a user, I want to tell folders apart at a glance and keep the few I use most within reach (ADR 0037, screen `FolderStyle`).
    - The folder menu (sidebar row, phone Library) has "Colour and icon…": a dialog with a preview tile, the eight built-in colours on one line, the account's own colours and a "+" swatch that opens the colour picker to add one (#335: it is kept as a swatch on the account, up to 12, and offered the next time on every device), the icon set (57 icons: topics such as food, sport, travel, money, music, home, health, kids, pets, books, games, photo, film, cars, gifts, nature and tools) as a radio group in a scrolling grid, and an Emoji field that takes exactly one emoji instead of an icon (client and API check one grapheme of emoji characters, nothing else), Reset (graphite folder icon), Cancel and Save. The tile derives a readable tint and glyph colour from an own colour with the contrast helpers of the custom accent; an emoji is drawn at the size of the tile as decoration, the folder name stays the label. Save closes at once and the folder wears the style at once; a failed request puts the old style back with an error toast.
    - The chosen colour and icon show everywhere the folder does: sidebar rows, subfolder tiles, the phone Library list and the `moved` toast tile. Settings › Appearance › "Folder colours" off shows every folder in graphite (the choice is kept; only on Appearance since #315).
    - "Pin to sidebar" / "Unpin from sidebar" in the menu of a folder, a link card and a link row. A "Pinned" section above Folders lists the pinned folders and links in the chosen order (on a phone at the top of the Library page); a folder opens its page, a link opens in a new tab. At most 7 items: the eighth is refused with a toast that names the limit.
    - Reorder pinned items (folders and links together) by dragging rows inside the Pinned section (a mouse at once; on a touch screen, like iOS, a press, a short rest of 400 ms and a move start the drag, a plain swipe scrolls (#315); a reserved slot marks the place, the other rows glide aside), or with Alt+↑ / Alt+↓ on the focused row (announced politely: "Moved up, position 2 of 5"); a pinned row has no "…" menu: its only action is an Unpin icon button next to the name (on hover and focus, always on touch) with Undo (#314). On a phone the same touch drag and Unpin work in the Library Pinned section; the former Settings › Library "Pinned at the top" row and its "Edit pinned" dialog were removed in #315.
    - Folders keep a manual order (#314): drag a folder row among its siblings inside the Folders section (a mouse at once; a finger after a press and a short rest, in the sidebar and on the phone Library (#315); never into another folder — that stays "Move to…" and dropping links onto folders works as before), or press Alt+↑ / Alt+↓ on the focused row (announced). New and moved folders go to the end of their parent; the order shows everywhere folders are listed (sidebar, phone Library, subfolder tiles). Each change is optimistic and rolls back with an error toast; other tabs follow. Alt+↑ / Alt+↓ is in the shortcuts list ("?" and Settings › Keyboard shortcuts). Touch (#315): a press, a rest of 400 ms and a move drag the row (same reserved slot, no layout jump, reduced motion respected); a long press without moving still opens the folder menu (a move after the menu opened closes it and drags, as on iOS); a plain swipe scrolls.
    - In a folder view a link menu also has "Pin to top" / "Unpin from top" (not in Unsorted, All links and other views): pinned links come first with a "Pinned" label, in the order they were pinned (at most 20 per folder); subfolders always come before links. A move or Trash unpins.

### Sharing (stage 2)

25. **Public collection** (#276, ADR 0040). As a user, I want to share one folder by a link so that friends can see its links without an account.
    - "Share…" in the folder menu opens the share dialog "Share folder “{name}”": a "Public folder" switch (off by default; "Anyone with the link can view this folder. No account needed."), the "Folder page address" with "Copy link" ("Folder link copied"; the read-only field is selected when the clipboard is refused), "Show my notes" (off by default) and "Reset link" (after a confirmation the old folder link stops working at once). Turning the folder private ends the link; making it public again makes a new link. The wording says folder, not link, since #326: "Public link" read like sharing someone else's link.
    - The link `/c/{token}` (22 base64url characters, 128 random bits) opens a read-only page for guests and signed-in people alike: "Shared by" with the owner's first name, the folder name, the link count and the time of the last change as separate elements, "Copy link", chips All and the direct subfolders, the links of the folder and all its subfolders as cards without favorite or menu (notes only with "Show my notes"), "Show more" up to 500 links, "Keep your own links like this" with "Start your shelf" for guests, "Made with Shelfmark"; "Sign in" or "Back to my shelf" in the header. An unknown, turned-off or reset link shows "This collection isn't available". The page is `noindex`.
    - At most 10 public folders per user; demo accounts cannot share. Invites, roles, "Shared with me", "Save to my shelf" and "Report this collection" are not part of it (backlog).
    - A shared folder that goes to Trash keeps its link: the page shows "This collection isn't available" while the folder is in Trash, and restoring the folder brings the same link back (restore is an undo, not a new share). To end the link for good, turn the folder private or reset the link, before or after the restore; deleting the folder forever deletes the link with it.

27. **Saved views.** As a user, I want to come back to the filters I use often in one click (ADR 0038, screens `Main`, `RecentView`, component `SavedView`).
    - Every link has a type: video, article, shopping or other. It is set when the link is saved (from the page: `og:type`, then known video and shop sites), follows a changed address, and can be changed in the edit dialog ("Type").
    - Above the feed, chips: "All" with the number of links, then the saved views with their counts ("Videos 5", "Articles 4"), then a dashed "+ Save this view". A new account starts with Videos and Articles. The pressed chip (filled) is the view the feed shows now; "All" when nothing is narrowed. The chips wrap on a desktop and scroll sideways in one row on a phone; arrow keys move between them.
    - On every feed, not only All links (#335): the chips work inside a folder, Unsorted, Favorites or a tag filter. "All" is the feed itself with its count; a view with no place (type, search, tags) applies inside the feed it is opened on and counts only that feed's links; a view tied to a place (Unsorted, Favorites, a folder) is offered on All links and on that place. "+ Save this view" on All links stores the whole filter; on any other feed it stores only the type filter as a plain view, so it works on every feed. The Videos and Articles chips have a tooltip "Links detected as videos / articles": they filter by link type, not by folder.
    - A view stores the place (all links, Unsorted, Favorites or a folder), tags, type, search and sort. Choosing it opens that place with that filter; the type shows as a removable chip in the filter row.
    - "+ Save this view" asks for a name (up to 40 characters) and saves the current filter at the end. Each view (not "All") has a menu: Rename, Move left, Move right, Delete view (after a confirmation; the links stay). At most 20 views; the 21st is refused with a toast.
    - A view of a folder that went to Trash stays, shows 0 and says so when chosen; it works again once the folder is restored.
    - Recently opened has the same type chips (All, Videos, Articles, Shopping) with counts, filtering the history on the page.
27. **Custom theme and Animations.** As a user, I want Shelfmark in my colours and with less movement when I prefer it, on every device (#273, screen `Themes`).
    - Settings › Appearance › Theme offers System, Light, Dark and Custom as thumbnails drawn in their real colours. Light and Dark are fixed; Custom starts from the light or the dark base ("Start from") and lets the person pick an accent colour (Sage, Ocean, Plum, Clay, Amber, Rose, Teal, Graphite, or their own colour from the "+" swatch, #315), a background (Stone, Paper, Mist, White on light; Graphite, Ink, Forest, Black on dark) and corners (Round, Soft, Square). The curated values are checked by a unit test that computes WCAG AA for every combination from the token values. The "+" swatch opens a colour picker (#335: a saturation / brightness area, a hue slider and a hex field; arrow keys move the handles through labelled sliders, touch drags work; the panel opens by height with the Motion spec's ease, a fade under reduced motion). Own colours are kept as swatches on the account (`customColours`, shared with the folder style dialog). The same picker adds an own page background (#335, `customTheme.background` may be a `#rrggbb`): text and muted text must keep 4.5:1 on it, otherwise a warning offers the nearest readable shade ("Use #xxxxxx") and nothing is saved until it is chosen. For the accent: a colour that keeps 4.5:1 on the current page and panels becomes the accent at once; a fainter one is not applied, a warning gives its ratio and offers the nearest passing shade ("Use #xxxxxx"). An own colour is stored as `#rrggbb` and always drawn in its nearest shade that keeps the accent rules on the chosen base and background, so switching to the other base stays readable (ADR 0041). "Reset custom theme" goes back to Ocean on Paper with soft corners on the light base; switching the base takes the first background of the new base. Choosing Light or Dark keeps the custom theme for later.
    - Animations: System (follows the device), Full (the app's normal motion) or Reduced (fades and loaders stay, movement goes, scripted motion too: view transitions, the card and list morph, the landing, the sign-in tilt, the video autoplay). Full never overrides a device that asks for reduced motion.
    - Every change applies to the whole app at once and is saved on the account (`theme`, `customTheme`, `motion` in `/api/me/settings`); a failed save puts the old appearance back with an error toast. A live preview (a sidebar and two cards in the current tokens) shows the result: beside the options and sticky while they scroll from a 90em (1440px) window, above them below it so the options never squeeze; the page is up to 100rem wide (#315, #335). The browser remembers the last appearance for the first paint before the account loads (no flash), the account value wins once it arrives, and another open tab follows. An account that never stored an appearance does not reset the browser: a theme kept there from before (`sm-theme`) stays and is saved to the account once, silently (a failure retries on the next load). Text size, font, density, card and sidebar options are the Appearance extras task (story 30).

28. **Select links and bulk actions.** As a user, I want to pick several links and move, tag, favorite, open, copy or delete them at once (#267, screens `Bulk`, `MobileBulk`).
    - Desktop: a checkbox shows on a card or row on hover and keyboard focus, and on every link while a selection exists. Shift-click selects the range from the last link picked; ⌘A / Ctrl+A (focus not in a field) selects every loaded link; Space toggles the focused link; Esc or "Done" clears. A click on a card or row opens the link; the checkbox selects. Once at least one link is picked (selection mode) a click anywhere on a card or row toggles it instead of opening it (Shift-click selects a range, Ctrl/Cmd-click no longer opens a new tab, the "Open" bar is hidden), and entering and leaving the mode is announced politely to screen readers. M opens "Move to folder…" for the focused link.
    - Phone: a tap opens the link, a long press selects it and enters selection mode (the link menu stays on the "…" button), and in selection mode taps add or remove links; the checkboxes are always visible on touch devices; the folder tree's own long press (folder menu) is unchanged.
    - A header over the top of the feed: "3 selected", "Select all 12" (the loaded links), the hints "Shift + click selects a range" and "Esc clears" (separate, desktop only) and "Done"; on the phone a Cancel button, the count and "Select all".
    - A glass bar at the bottom (above the phone tab bar; toasts move above it): Move (the folder picker, "Move 3 links"; Undo puts every link back into its own folder), Tags ("Add to all" and "Remove from all" with tag inputs), Favorite (on for all when any is off, else off), Open all (desktop; a new tab per link, a confirmation above 10, a toast when the browser blocked pop-ups), Copy links (the URLs, one per line), Share (phone, the system share sheet with the URLs; hidden without the Web Share API, Copy links shows instead) and Delete (confirmation, the links go to Trash at once, an Undo toast "3 links moved to Trash" with their titles restores them through Trash).
    - Every change shows at once and rolls back with an error toast when it fails; folder, tag and saved view counts refresh. The selection is cleared when the view, filter, sort or page changes, and after Move and Delete. "Remind" is not built (reminders are in the backlog).

29. **Settings › Library in full.** As a user, I want to decide how my links are shown and how new ones are saved, on every device (#284, screen `SetLibrary`).
    - Viewing: "Default view" (Cards or List) is how a feed opens the first time; "Sort links by" (Newest first, Oldest first, Title A–Z) is the sort it starts with. After the person switches the view or the sort of a feed, that feed (a folder by its id, or All links, Unsorted, Favorites) remembers its own choice on the device (`localStorage` `sm-feed-memory`, at most 300 feeds); the URL names a sort only when it differs from the default. "Open links in" a new tab (default) or the same tab: the links of cards, rows, Recently opened rows and pinned links, and the "Open" menu item, follow it (`rel` keeps `noreferrer`; "Open in new tab" in Recently opened stays a new tab). "Show folder counts" off drops the link counts of the sidebar entries, folders and pinned folders (Trash keeps its item count).
    - Saving: "New links go to" Unsorted or a folder: the add-link dialog and the share page start there when the page has no folder of its own; the server accepts only a live folder of the user (404 otherwise) and answers Unsorted once that folder is in Trash or gone. The duplicate notice always shows (#315: "Warn about duplicates" is gone). "Fetch titles and previews" off saves only the address: the dialog asks only for the duplicate check (the server then loads no page), and the server neither fetches the page nor captures images for this user's new links (image hints from the client are ignored); a changed address of an existing link follows ADR 0027 as before. Tracking parameters (`utm_*` and the `TRACKING_QUERY_PARAMS` deny list: `gclid`, `fbclid`, `mc_cid`, `msclkid`, …) are always removed from the address on save, create and edit alike, and before the duplicate check; every other parameter and the fragment stay exactly as written (#315: the "Keep the query part of links" setting is gone).
    - Trash: "Keep deleted items for" and "Open Trash". Since #315 the page has no "Tags and folders" section: tags are managed in the sidebar and the phone Tags tab, pins in the sidebar and the phone Library (drag, Alt+arrows, Unpin), and "Folder colours" lives in Settings › Appearance. A note under the sections: subfolders always come first, and changes apply at once and sync to other devices.
    - Every change applies at once, is saved on the account (`/api/me/settings`) and rolls back with an error toast when the request fails.

30. **Appearance extras.** As a user, I want the text bigger, a font that is easier to read, more links on screen, and cards and a sidebar with only what I use, on every device (#285, screen `Themes`).
    - Text and layout: "Text size" 90%, 100% (default), 112% or 125% scales the whole interface (the root font size; every size is rem, breakpoints stay); the phone from 360px has no side scroll at 125%. "Font": Onest (default), System (the system UI font) or Readable (Atkinson Hyperlegible, designed for low vision, self-hosted under the CSP, SIL OFL 1.1; fetched only when chosen). "Density": Comfortable or Compact (tighter card padding, feed gap and row padding through `--density-*` tokens).
    - Cards: "Preview image" Large (16:9), Small (a strip) or Off (no image area); "Show site", "Show notes", "Show tags" (on by default) hide those parts of the cards; title, favorite and menu always stay.
    - Sidebar and motion: "Folder colours" (story 25, its only place) and "Animations" (story 27). Since #315 link counts are only Settings › Library › "Show folder counts", "Remember recently opened" is on Settings › Privacy and data (off asks first, then clears the list and pauses the history, the account's `pauseHistory`; on resumes it), and the Language row is gone (Language has its own page in the nav).
    - Everything is part of the appearance: applied by ThemeService through `<html>` attributes only (no inline styles, contrast unchanged), remembered in the browser for the first paint (`sm-layout`), saved on the account and optimistic with rollback and a toast. The live preview shows text size, font, density, the card options, counts and the Recently opened row.

31. **Interface languages.** As a user, I want Shelfmark in my language, with dates and times the way I write them (#274, screens `SetLanguage`, `Languages`).
    - Settings › Language: "Interface language" lists English, Français, Deutsch, Italiano, Español, Português (Brazilian conventions), each in its own name with a check on the active one, and "Match my browser" (the default: the first browser language the app has, else English). Switching applies at once, without a reload: text, `<html lang>`, plurals, dates and numbers. Links and notes stay as they are.
    - Spell-check in the note field of the add-link and edit dialog is always on (the browser default, `spellcheck="true"`); the "Check spelling" option and the account's `spellcheck` setting are retired since #326. Dates and numbers: "Date format" (the language's own medium date, `d MMM y`, `dd.MM.yyyy`, `MM/dd/yyyy`, `yyyy-MM-dd`; month names stay translated), "Time" (Auto, 24-hour, 12-hour), "Week starts on" (Auto from the region, Monday, Sunday; it decides what "Earlier this week" in Recently opened covers) and a live preview line.
    - Saved on the account (`/api/me/settings`), optimistic with rollback and a toast; remembered in the browser for the first paint (`sm-language`). Existing accounts read as "Match my browser". A language chosen in the browser before the account kept one (a guest's choice) is kept and saved once.
    - Guests: the landing, sign-in, privacy and public collection pages follow the browser language or the choice made in the landing footer's language switcher.
    - Layout rules for translations (Languages board): strings run up to 40% longer; buttons grow and never cut their text (`ui-button wrap` where a label must wrap), toolbars and saved views wrap, sidebar rows and card titles truncate with "…", fixed-width controls (language select, segmented controls, tab labels) fit the longest language; plurals and dates come from `Intl`, never string concatenation. Out of scope: emails (there are none) and the promo video captions, which stay English.

### Navigation (left sidebar)

- All links · Unsorted · Favorites · folder tree · tag list.
- **About and "How it works"** (stage 2, #270): `/about` is the landing for everyone. A signed-in person reaches it from "About Shelfmark" in the account menu (phone: the You tab) and sees "Back to my shelf" instead of the sign-in and demo buttons, plus a "What's new" list kept by hand in `landing-whats-new.const.ts`. "How it works" (account menu, You tab, a link in the empty library) opens the promo video in a dialog: own domain, so the CSP is unchanged; muted with captions; no autoplay with reduced motion; chapters jump to their start. A card at the bottom of the desktop sidebar invites new accounts for two weeks after the account is first seen on the device, until the video was opened or the card hidden (state per user in `localStorage`); in the demo it shows on every visit, with no two-week window, until the video was opened or the card hidden, so people a demo link is sent to see it first. The video is the scripted recording of #271 (`apps/web/public/media`): the dialog picks the light or dark, desktop or phone recording when it opens (MP4 H.264, VP9 WebM fallback, WebP poster, English WebVTT captions); video files stay out of the service worker cache.

## 5. Tech stack and architecture

TypeScript across the whole stack: Angular 22 + NestJS in an Nx monorepo, PostgreSQL (Neon), deployed on Vercel.

&#91;embedded content: stage 1 architecture · 6 components\]

The browser talks to a single domain: the interface and the API live on Vercel. The API stores data in Neon, authenticates through Google and GitHub and fetches previews from external sites; GitHub deploys the code automatically.

### 5.0 Monorepo

The whole project is one **Nx** repository (frontend, backend and shared libraries side by side). The stage 1 repository is public, on GitHub.

| Project | Type | Purpose |
| --- | --- | --- |
| `apps/web` | Angular app | Web interface |
| `apps/api` | NestJS app | REST API |
| `libs/ui` | Angular library | Own UI library: tokens and reusable components (section 7) + Storybook |
| `libs/shared/contracts` | TS library | Shared frontend and backend types and DTOs, so contracts do not drift apart |

Monorepo, Node and tooling decisions: ADR 0001–0003 (`docs/adr/`).

**TypeScript rules (whole stack).**

- **Strict typing, no `any`.** Neither explicit `any` nor `as any`. Unknown data uses `unknown` with narrowing, or generics. `@ts-ignore` and `@ts-nocheck` are forbidden; `@ts-expect-error` only in tests and only with a reason. `strict` in `tsconfig.base.json` stays on. Lint reports these as errors (`no-explicit-any`, `ban-ts-comment`).
- **One type per file.** Every interface, type and array-of-objects constant lives in its own file, named as the kebab-case export plus a suffix: `link-preview.interface.ts`, `theme-preference.type.ts`, `link-sort.const.ts`, `default-folders.const.ts`.
- **Named constants, no `enum`.** A fixed value set (themes, variants, sizes, kinds, layers, keys, storage keys, attribute names) is an `as const` object in `<name>.const.ts` (`UPPER_SNAKE`, `PascalCase` members) plus the derived union in `<name>.type.ts`; code imports the constant instead of repeating the string. Public component inputs keep the union, so `variant="primary"` works in templates. Data (database ids, user content, translation keys) is not a value set. See ADR 0024.
- **No dump files** such as `types.ts`, `models.ts`, `constants.ts`. Files are split by entity and live next to their users in the feature's or module's `models/` folder. Shared web↔api types go to `libs/shared/contracts/src/<domain>/`. `index.ts` only re-exports.
- Classes (components, services, controllers, validation DTO classes) keep the usual `kebab-case.<type>.ts` names.

See ADR 0004.

### 5.1 Frontend

**Angular 22** on TypeScript 6: only modern v22 approaches, no legacy.

- **Components:** standalone, zoneless change detection, the new control flow (`@if`, `@for`, `@switch`).
- **Reactivity:** signals everywhere; data loading via `resource` / `httpResource`.
- **Forms:** Signal Forms (stable in v22) instead of Reactive Forms.
- **Services:** the new `@Service()` decorator instead of `@Injectable`.
- **Routing:** Angular Router, lazy-loaded features; route map below.
- **State:** NgRx SignalStore v22:
  - local component state: plain `signal()`;
  - `LinksStore`: links, filters, sorting (`withEntities`);
  - `FoldersStore`: folder tree;
  - `TagsStore`: tags;
  - `TrashStore`: what is in Trash (optimistic restore / delete forever / empty); `UserSettingsStore`: account preferences (the Trash retention, "Folder colours"); `PinsStore`: the sidebar pins (optimistic pin / unpin / reorder, limit 7);
  - `UiStore`: "cards / list" view; persisted in `localStorage`.
- **Classic NgRx Store is not used**: it is overkill for this app.
- **Tab sync** (stage 2, #268): the tabs of one browser share a `BroadcastChannel` (`TabSyncService`). The API seams post successful writes; other tabs of the same user apply them silently (a saved link lands with its animation; edits, moves and deletes show; folder and tag changes reload the sidebar and the feed). Signing out locks the other tabs with "You signed out in another tab" and clears their library; a sign-in anywhere reloads locked and signed-out tabs. The theme follows through the `storage` event.
- **UI:** own component library `libs/ui` on SCSS and design tokens, behaviour from Angular Aria / CDK; Tailwind and Angular Material are not used (section 7).
- **Rules for Claude Code:** the official Angular AI config (`ng generate ai-config --tool=claude`), the official Angular Agent Skills and Angular MCP + our own v22 rules; details in section 8.

CSR without SSR, zoneless, Transloco, strict-CSP build: ADR 0005; state: ADR 0009; UI library: ADR 0014; `rem`/`em` units: ADR 0015.

**Routes (Angular Router).** Every feature is lazy-loaded (`loadComponent`), except the public landing (the LCP page, eager). Router: `provideRouter(routes, withComponentInputBinding(), withPreloading(SignedInPreloadingStrategy), withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }), withRouterConfig({ paramsInheritanceStrategy: 'always' }))`, so path params, query and `data` reach components as `input()`. `SignedInPreloadingStrategy` (`core/routing`) preloads lazy routes only once the session is known to be signed-in; a guest never preloads, so the landing keeps its Lighthouse budget.

| URL | Screen | Access | Feature (lazy) |
| --- | --- | --- | --- |
| `/` | Landing | guest | `features/landing` |
| `/` → `/links` | All links | signed in | `features/library` |
| `/unsorted` | No folder | signed in | `features/library` |
| `/favorites` | Favorites | signed in | `features/library` |
| `/folders/:folderId` | Folder; nesting is shown in breadcrumbs, not in the URL | signed in | `features/library` |
| `/settings` | Settings, one page per section: `/settings/account` (profile, sign out, deletion), `/appearance` (theme incl. Custom, text and layout, cards, folder colours, animations, live preview), `/feedback` (Your feedback: send form and the user's messages), `/shortcuts` (the keyboard shortcut list), `/import-export` (export only), `/library` (viewing, saving, Trash retention and the Trash row), `/privacy` (Remember recently opened, the link to Export, the policy); from 1024px `/settings` goes to the first section, below it (phones and iPad portrait, #316) it is the You list | signed in | `features/settings` |
| `/trash` | Trash: deleted links and folders, restore, delete forever, empty (the phone reaches it from the Library tab) | signed in | `features/trash` |
| `/admin/feedback` | The author's feedback inbox: all messages, status filter, status and reply per message; `adminOnly` asks `GET /api/admin/status`, a non-admin is sent to `/links` | signed in, author only | `features/admin` |
| `/share?url=&title=&text=` | Quick save from "Share" | signed in; guest goes to sign-in and back | `features/share` |
| `/sign-in?returnUrl=&reason=` | Sign in with Google / GitHub | guest only | `features/auth` |
| `/demo` | Creates a demo sandbox and goes to `/links` | everyone | `features/auth` |
| `/privacy` | Privacy policy | everyone | `features/legal` |
| `/c/:token` | Public collection: a shared folder, read-only, `noindex` (story 25) | everyone, no guard, outside the shell | `features/sharing` |
| `**` | 404 with an illustration | everyone | `features/not-found` |

**Tree structure.** Two empty-path routes are told apart by `canMatch`: for a guest `/` shows the landing, for a signed-in user `AppShell` (header, sidebar) with child routes. No flickering redirects.

```ts
export const routes: Routes = [
  { path: '', canMatch: [guestOnly], loadComponent: () => import('./features/landing/landing.page'),
    title: 'Shelfmark — paste a link, find it again' },
  { path: '', canMatch: [authOnly], loadComponent: () => import('./shell/app-shell'), children: [
    { path: '', pathMatch: 'full', redirectTo: 'links' },
    { path: 'links', loadComponent: libraryPage, data: { scope: 'all' }, title: 'All links' },
    { path: 'unsorted', loadComponent: libraryPage, data: { scope: 'unsorted' }, title: 'Unsorted' },
    { path: 'favorites', loadComponent: libraryPage, data: { scope: 'favorites' }, title: 'Favorites' },
    { path: 'folders/:folderId', loadComponent: libraryPage, data: { scope: 'folder' }, title: folderTitle },
    { path: 'settings', loadChildren: () => import('./features/settings/settings.routes') },
    { path: 'admin', canActivate: [adminOnly], loadChildren: () => import('./features/admin/admin.routes') },
    { path: 'share', loadComponent: () => import('./features/share/share.page'), title: 'Save to Shelfmark' },
  ]},
  { path: 'links', canActivate: [redirectToSignIn], children: [] },   // guest on a protected URL
  { path: 'sign-in', canMatch: [guestOnly], loadComponent: () => import('./features/auth/sign-in.page'), title: 'Sign in' },
  { path: 'sign-in', redirectTo: 'links' },
  { path: 'demo', loadComponent: () => import('./features/auth/demo-start.page'), title: 'Opening the demo' },
  { path: 'privacy', loadComponent: () => import('./features/legal/privacy.page'), title: 'Privacy' },
  { path: '**', loadComponent: () => import('./features/not-found/not-found.page'), title: 'Page not found' },
];

const libraryPage = () => import('./features/library/library.page');
```

(In the real code `redirectToSignIn` sits on every protected URL (`links`, `unsorted`, `favorites`, `folders/:id`, `settings`, `share`) and leads to `/sign-in?returnUrl=<original URL>`, so `/share?url=…` is not lost.)

**State in the URL.** Everything that can be shared or must survive "Back" lives in the query: `?tag=angular&tag=video` (several tags, AND logic), `?sort=newest|oldest|title`, `?q=` (full result list; the search itself is the header field's panel from 80em and the ⌘K overlay below it, "Show all" leads to `/links?q=…`). The "cards / list" view is a personal setting in `UiStore` + `localStorage`, not in the URL.

**One page, four scopes.** `/links`, `/unsorted`, `/favorites` and `/folders/:folderId` are rendered by one `LibraryPage`: `scope` comes from `data`, `folderId`, `tag`, `sort`, `q` via `input()`. `LinksStore` reacts to these signals and loads the list; the old list stays visible while loading (bar at the top). There are no resolvers for lists, so navigation is instant.

**Guards (functional).**

- `authOnly` / `guestOnly` (`CanMatchFn`): is there a session; the session comes from Better Auth `getSession`, cached in `AuthStore`, one request at startup.
- `redirectToSignIn` (`CanActivateFn`): returns a `UrlTree` to `/sign-in?returnUrl=…`.
- `unsavedChanges` (`CanDeactivateFn`): only on `/settings`, if the form is dirty.
- Demo expired or session died → the API responds 401 → `errorInterceptor` leads to `/sign-in?reason=demo-expired` or `?reason=session-expired`; the sign-in screen shows an explanation.

**Tab titles.** A custom `TitleStrategy`: "<title> — Shelfmark". For a folder, `folderTitle: ResolveFn<string>` takes the name from the already loaded `FoldersStore`, without a request.

**Folder not found or someone else's.** The API responds 404 the same way in both cases (no leaking of other users' ids). `LibraryPage` shows a 404 screen in place of the content; the URL does not change.

**Dialogs are not routes.** Adding, editing and deleting a link, creating and renaming a folder, ⌘K search and onboarding open via `DialogService` (CDK Dialog) on top of the current page; the URL does not change. On phone, the system "Back" closes the open sheet instead of leaving the page: the service pushes a history entry and closes the dialog on `popstate`. Onboarding is opened by `AppShell` if `onboardingCompletedAt === null`.

**"Share" (PWA).** The manifest has `share_target` with `method: "GET"` and `action: "/share"`, params `url`, `title`, `text`. Telegram often puts the link in `text`, so the page extracts the first URL from there. Saving is a regular `POST /api/links`, followed by a toast and a return to the original app.

**Navigation shortcuts:** ⌘K for search from anywhere; the planned `G` `A` / `G` `U` / `G` `F` / `G` `S` letters are not built (the real list is `SHORTCUT_GROUPS`, see "Keyboard shortcuts" in 7.2).

**Frontend structure:** `apps/web/src/app/` → `app.routes.ts`, `app.config.ts`, `shell/` (AppShell, Header, Sidebar), `core/` (guards, interceptors, `AuthStore`, `TitleStrategy`, `DialogService`), `features/{landing,auth,library,settings,share,legal,not-found}/`, `stores/` (Links, Folders, Tags, Ui).

**Icons: Shelfmark's own set, SVG sprite.** 44 icons are drawn for the product (24 px grid, 1.75 px stroke, corner radii like the cards, the bookmark motif from the logo) and live in the design system (Assets › Icons) as separate files and one `sprite.svg` (`<symbol id="sm-…">`). The sprite goes into `libs/ui/assets/icons/`; the `ui-icon` component renders `<svg><use href="…/sprite.svg#sm-name"/></svg>`, colour via `currentColor`, size via the `size` input, `name` is typed as a union of the 44 names. No third-party icon sets. Illustrations (8 scenes) are also files in the design system (Assets › Illustrations), colours via CSS variables, embedded inline through `ui-illustration`.

**HTTP interceptors** (functional `HttpInterceptorFn`, registered via `provideHttpClient(withInterceptors([...]))`, order matters):

1. `apiBaseInterceptor`: `/api` prefix, `withCredentials: true` (session cookie).
2. `requestIdInterceptor`: `X-Request-Id` header to link a frontend error to the backend log.
3. `retryInterceptor`: retry only for `GET` on a network error or 502–504: up to 2 times with a 0.5 → 1.5 s delay.
4. `loadingInterceptor`: counter of active requests → a thin loading bar under the header with a 300 ms delay and a 400 ms minimum (except background requests with an `HttpContext` flag).
5. `errorInterceptor`: unified error handling: 401 → sign-out and the sign-in screen; 403/404 → "not found"; 409 / 422 → the error goes back to the form (fields are highlighted); 429 → "Too many requests" toast; 5xx and no network → a toast with "Retry" and an offline banner. Errors handled by the component itself are marked with an `HttpContext` flag and skipped by the interceptor.
6. `devLoggingInterceptor`: dev only: time and status of each request to the console.

Unexpected errors outside HTTP are caught by the global `ErrorHandler` (toast + log entry).

**Language and translations.** English is the source language (`core/i18n/en.json`). All interface text goes through translation keys (Transloco, runtime switching without a rebuild), with no strings hard-coded in templates; this is a rule in `apps/web/CLAUDE.md` and a review check. Since #274 the app ships English, French, German, Italian, Spanish and Portuguese (Brazilian conventions; no Ukrainian for now): `en.json` is in the main bundle, the other files are lazy chunks loaded before a switch. `LocaleService` (`core/i18n`) owns the language: it resolves "Match my browser" from `navigator.languages`, loads the file, then switches Transloco, `activeLang` (read by `pluralKey`, which uses `Intl.PluralRules` of the language, so French, Italian, Spanish and Portuguese plural keys also have `many`), the `Intl` locale (the browser's region when it speaks the same language, else the bare language) and `<html lang>` together. Dates, times, relative times and numbers come from `Intl` through `LocaleService` (`formatDate`, `formatTime`, `dateTimeFormat`, `formatRelative`, `formatNumber`, the `appDate` pipe instead of Angular's `DatePipe`, so no Angular locale data ships), following the account's date format, clock and week start. A spec checks that every language file has exactly the keys of `en.json`, the same placeholders and the plural categories its language needs.

Sources: [Angular 22 overview](https://www.bacancytechnology.com/blog/angular-22), [Angular 22.1 and the new release cycle](https://certificates.dev/blog/whats-new-in-angular-221), [NgRx 22](https://infoq.com/news/2026/10/ngrx-22-angular).

### 5.2 Backend

**NestJS** (Node.js + TypeScript): modules, DI and decorators, as in Angular, for one style across the whole stack.

- **API:** REST, JSON; DTOs and response types from `libs/shared/contracts`.
- **Validation:** incoming data is validated at the DTO level.
- **Domain modules:** `auth`, `users`, `links`, `folders`, `tags`, `metadata` (preview fetching).
- **Link preview:** on save, the backend loads the page and extracts the title, icon and image (Open Graph / meta tags). Timeout and fallback: on error the link is saved with the URL instead of the title.
- **Background jobs:** none in stage 1; the preview is fetched synchronously. A queue (BullMQ + Redis) if saving becomes slow.
- **API documentation:** Swagger / OpenAPI, generated automatically.

**Backend interception (NestJS):**

- a global `ExceptionFilter`: all errors in one format `{ statusCode, error, message, requestId }`, without stack traces or internal details in the response;
- `LoggingInterceptor`: method, path, status, duration and `requestId` (from the `X-Request-Id` header) to a structured log, without request bodies or personal data;
- `TimeoutInterceptor`: a time limit on request handling (including preview fetching);
- `ValidationPipe` (global, `whitelist` + `forbidNonWhitelisted`): extra fields in a request are rejected;
- session guard (Better Auth) and `ThrottlerGuard`: global.

NestJS choice: ADR 0010; API build and tests: ADR 0006; API security baseline: ADR 0007.

### 5.3 Database

**PostgreSQL + Prisma (ORM)**: one database covers storage, nested folders and search, without separate services.

| Task | How it is solved |
| --- | --- |
| Relational data: users → folders → links ↔ tags | PostgreSQL tables and relations |
| Nested folders | `parentId` field + recursive query (recursive CTE) |
| Search by title, note and URL | Built-in PostgreSQL search (`pg_trgm` / full-text search) |
| Duplicate links | Index on the "user + URL" pair |
| Schema migrations | Prisma Migrate |
| Local development and tests | PGlite (embedded PostgreSQL, no Docker), see [ADR 0025](adr/0025-database-tooling-prisma-7-pglite.md) |
| Cloud database | Neon, free tier (see 5.7) |

**A cache (Redis)** is not needed in stage 1.

### 5.4 Authorisation and authentication

Stage 1: sign-in with **Google and GitHub (OAuth)** using the ready-made **Better Auth** library; an own implementation is in the backlog.

- **Sign-in methods:** Google, GitHub. No passwords, so no email verification, password reset or sending emails.
- **Library:** Better Auth + NestJS integration (`@thallesp/nestjs-better-auth`, community-maintained). Users and sessions are stored in our PostgreSQL via Prisma: the data is not held by an external service, and it can later be moved to an own implementation.
- **Sessions:** cookies (httpOnly, Secure, SameSite), so tokens are not accessible to frontend JavaScript.
- **API protection:** a global guard; all routes are closed except explicitly open ones (`@AllowAnonymous()`).
- **Data isolation:** every request to links, folders and tags is filtered by the `userId` of the current session.
- **Roles:** none in stage 1.

**Demo sign-in.** A separate sign-in method without OAuth: the server creates a temporary user (`isDemo: true`) with seed data and a 24-hour session. A daily job (Vercel Cron) deletes expired demo users along with their data. A demo user is isolated the same way as a regular one; signing in with Google/GitHub from the demo does not carry the data over (carrying it over is in the backlog).

Source: [Better Auth — NestJS integration](https://better-auth.com/docs/integrations/nestjs.md).

### 5.5 Ways to save links

Stage 1: manual adding in the web interface only (a form with a URL field). Stage 2 added Paste many and the Share target. Import from browser bookmarks, Pocket, Raindrop.io and the Shelfmark JSON backup (#387), rules that put a link into a folder and tags by its domain (#398), the browser extension and import from Telegram are in the backlog. The API is designed so they can be plugged in later without rework.

### 5.6 AI features

Not part of stages 1–3. In the backlog with prepared issues (parent issue #388; see "Roadmap after stage 2"), not scheduled. `docs/design` has no AI screens yet, so every user-facing capability is designed first.

**Capabilities**

| Capability | What it does | Issue |
| --- | --- | --- |
| Foundation | Provider abstraction, mock provider, quotas, opt-in, background processing, contracts and ADR; comes first | #389 |
| Auto-tags and auto-folder | Suggestion chips built from the user's existing tags and folders; nothing applied without a tap | #390 |
| Short summaries | Aware of the link `kind` (video, article, shopping, other); editable by the user | #391 |
| Semantic search | Embeddings + pgvector in Neon, hybrid with the current search, which stays the fallback | #392 |
| Ask your shelf | RAG chat over the library, every answer with its source links | #393 |
| Library clean-up | Near-duplicates, dead links, synonym tags; always a preview with Undo | #394 |
| Shelfmark MCP server | A user's own AI assistant searches and reads their library | #395 |

**Rules from day one** (part of done for every AI issue):

- a mock AI provider for dev, unit, e2e and CI: no real calls there;
- the demo makes no real calls: ready summaries and tags in the seed data, canned chat answers or a tiny limit;
- per-user quotas, and a spend limit in the provider console (set by the author);
- graceful degradation: without AI (off, no key, quota used, provider error) the app works as today;
- opt-in in settings, described in the privacy policy;
- background processing: saving a link never waits for the model;
- prompt-injection defence: no tools with side effects, structured output, model output rendered as text only, the SSRF guard on any fetch;
- self-hosting uses its own key.

**Models and cost (estimates, Nov 2026):** Haiku for tags, summaries and folders (\~$0.0004 per link), Sonnet for chat (\~$0.013 per question), the Batch API (−50%) for background reprocessing; personal use \~$1–2 per month.

**Data:** new fields (`summary`, `suggestedTags`, embedding, processing status) go into `libs/shared/contracts` first, with an ADR (#389).

### 5.7 Infrastructure and deployment

Stage 1 runs for free on **Vercel (Hobby) + Neon** and is available at a public link; code, tasks and CI are on GitHub.

| Component | Service | Details |
| Code, tasks | GitHub | Public repository, GitHub Projects |
| CI | GitHub Actions | Lint, tests, build on every PR |
| Frontend + API | Vercel (Hobby) | Angular as static files; NestJS as one Vercel Function (zero-config). One `*.vercel.app` domain, so session cookies work without cross-domain issues |
| Database | Neon (Free) | PostgreSQL, free with no time limit; 100 CU-hours per project per month |
| Deployment | Vercel ↔ GitHub | Push to `main` → production; every PR → preview version |

**Additionally:**

- **Vercel Cron** (free on Hobby): daily cleanup of expired demo sandboxes;
- **Sentry** (free tier): frontend and backend errors with `requestId`, without personal data or link contents;
- **PWA**: a hand-written manifest (`apps/web/public/manifest.webmanifest`, icons from the logo, `share_target`: `GET /share` with `url`, `text`, `title`) and `apps/web/ngsw-config.json` for the Angular service worker (`@angular/service-worker`, app shell and static assets only, never `/api`); no `@angular/pwa` schematic. The CSP is unchanged: `worker-src` falls back to `script-src 'self'`, `manifest-src` to `default-src 'self'`.
  - **Android "Share" target:** `/share` (`features/share`, signed-in only; a guest returns to the full `/share?…` URL after sign-in). The query is untrusted: `extractSharedLink` keeps the first `http(s)` URL of `url`, then of `text`, and drops every other scheme, addresses with credentials and anything over the contract length; `title` is only an initial title hint. Everything is shown as text. No usable URL shows an error and saves nothing. The service worker serves `/share` from the shell (it matches the path without the query).
  - **iPhone:** iOS has no Web Share Target for web apps, so there is no entry in the iOS "Share" menu. On iPhone Shelfmark is installed with Safari "Share → Add to Home Screen" and links are saved by pasting them in the app.

**Environments:**

- **local**: PGlite (no Docker), `.env` only locally;
- **preview**: Vercel preview deployment + a separate Neon database branch (not production);
- **production**: `main` → Vercel + the Neon `production` branch.

**Limitations and plan B:** Hobby is for non-commercial use only; function ≤ 250 MB. When moving to a commercial product: migrate to Google Cloud Run or paid Render without changing the NestJS code. The Nx monorepo configuration for Vercel (static web, the API as one function, rewrites, headers, CSP) is fixed in [ADR 0019](adr/0019-vercel-deployment-architecture.md) and lives in `vercel.json`.

Sources: [NestJS on Vercel](https://vercel.com/docs/frameworks/backend/nestjs), [Neon Free limits](https://neon.com/faqs/free-plan-limits-and-quotas).

### 5.8 Security

Security is a mandatory requirement, not a wish: a task is not done until the items below that apply to it are met.

| Risk | Mandatory measures |
| **SSRF** when fetching previews (the main risk of the service) | Only `http`/`https`; block private and reserved IPs (localhost, 10.x, 172.16–31.x, 192.168.x, 169.254.x, IPv6 equivalents) after DNS resolution; timeout; limits on response size and number of redirects; no cookie forwarding |
| **Access to other users' data (IDOR)** | Every request to links, folders, tags is filtered by the session `userId`; dedicated tests "user A cannot see or change user B's data" |
| **XSS** | Angular escaping by default; `innerHTML` and `bypassSecurityTrust…` are forbidden; links with a `javascript:` / `data:` scheme are rejected on the backend |
| **Sessions and CSRF** | httpOnly + Secure + SameSite cookies; Origin check; limited session lifetime; sign-out invalidates the session |
| **Invalid data** | Validation of all DTOs; field length limits (URL, title, note, tag) |
| **API abuse** | Rate limiting (`@nestjs/throttler`), stricter on adding links and fetching previews |
| **Headers** | Helmet, Content-Security-Policy, HSTS; no CORS: web and API share one origin (ADR 0007) |
| **SQL injection** | Only parameterised Prisma queries; `$queryRawUnsafe` is forbidden |
| **Secret leaks** | Secrets only in Vercel environment variables; `.env` in `.gitignore`; GitHub secret scanning + push protection; secrets and tokens are never written to logs |
| **Vulnerable dependencies** | Dependabot; `npm audit` in CI; CodeQL (free for public repositories) |
| **Privacy** | Account deletion with all data; a privacy policy page (required for the Google sign-in screen) |
| **Admin routes** | `/api/admin/*` is for the author only: `AdminGuard` checks the session email against `ADMIN_EMAILS` (case-insensitive, unset or empty = nobody, demo users never); everyone else, guests included, gets 404 so the routes do not reveal themselves. Admin queries are the only ones not filtered by the session `userId`; they touch message rows only |
| **Uploads** | Feedback screenshots: up to 3 per message, one per request, PNG/JPEG/WebP only, at most 2 MB each, base64 canonical and magic bytes checked against the declared type, stored in Postgres, served with the stored type, `nosniff`, `inline`, `private, no-store` (error answers of the screenshot GET routes too) and the strict CSP; the larger body limit (3 MB) applies to the screenshot upload route only; per-user hourly message limit and per-user screenshot bytes per rolling 24 hours (20 MB, demo 6 MB) in Postgres |
| **Test data** | Preview deployments run on a separate Neon database branch, not on production |
| **Public collections** (ADR 0040) | The token is 128 random bits (base64url, 22 characters) and the only key to the page; the anonymous routes are in `PUBLIC_ROUTES`, one indexed lookup, the same 404 for unknown, turned-off and reset tokens and for anything outside the shared subtree; strict per-IP rate limits; only the owner's first name, folder names, link titles, URLs and same-origin image paths are exposed, notes only when the owner allows; `X-Robots-Tag: noindex` and `Cache-Control: no-store`; 10 public folders per user; no sharing for demo users |

**Security when working with Claude Code** (details in section 8): reading and editing `.env` is denied in the permission settings; a hook blocks committing secrets; the **security-reviewer** subagent checks every PR against this table.

**Logging and monitoring** (stage 1 minimum): structured API logs without personal data or secrets; Vercel logs and analytics; a global error handler in NestJS and Angular.

**Demo and export:** demo creation has a strict per-IP limit (for example, 5 per hour) and a captcha on suspicious activity; demo users are isolated the same way as regular ones; demo sandbox limits (no more than 100 links); export returns only the current session's data and is also rate-limited.

## 6. Data model and API

Six own tables (`Feedback`, `Folder`, `Link`, `Tag`, `LinkTag`, `SavedView` + `User` from Better Auth) and a REST API of \~17 endpoints under the `/api` prefix. Draft, for review.

### 6.1 Data model

All ids are UUIDs; all tables have `createdAt`, `updatedAt`. Every record (except `LinkTag`) belongs to a user via `userId`.

**User, Session, Account, Verification**: Better Auth tables, created from its schema. `User`: `id`, `name`, `email`, `image`.

Own field on `User`: `onboardingCompletedAt` (timestamp, null): when the user closed the onboarding dialog; `null` = show on sign-in.

Own field on `User`: `trashRetentionDays` (smallint, default 30, CHECK in 7, 30, 90): how long Trash keeps deleted items (ADR 0036).

Own field on `User`: `folderColours` (boolean, default true): the "Folder colours" setting; off = the client shows every folder in graphite (ADR 0037).

Own fields on `User` for the Custom theme (#273): `customThemeBase`, `customThemeAccent`, `customThemeBackground`, `customThemeCorners` (text, CHECKs from the contracts' allow-lists; `custom_theme_accent` also accepts a lower-case `#rrggbb` own colour since #315, ADR 0041, and `custom_theme_background` since #335) and `customColours` (`custom_colours`, text array, at most 12 lower-case `#rrggbb`, CHECK; #335).

Own field on `User`: `historyPaused` (column `history_paused`, boolean, default false): "Pause history" on Recently opened (#269); while true, opens do not update `lastOpenedAt`.

Own fields on `User` for Settings › Library (#284, story 29): `defaultView` (`default_view`, text, default `cards`, CHECK `cards | list`), `defaultSort` (`default_sort`, default `newest`, CHECK `newest | oldest | title`), `openLinksIn` (`open_links_in`, default `new-tab`, CHECK `new-tab | same-tab`), `showFolderCounts` (boolean, default true), `newLinksFolderId` (uuid, null = Unsorted; no foreign key on purpose: the API checks on write that it is a live folder of the user and reads a trashed or deleted one as `null`), `fetchPreviews` (boolean, default true). `warnDuplicates` (`warn_duplicates`) and `keepQuery` (`keep_query`) are retired since #315 (the notice is always on, tracking parameters are always stripped): the API neither reads nor writes them and `PATCH /api/me/settings` rejects them as unknown fields; the columns stay until a later contract migration drops them (expand, then contract).

Own fields on `User` for Settings › Appearance extras (#285, story 30), part of the appearance (their first write sets `appearanceSavedAt`): `textSize` (`text_size`, text, default `m`, CHECK `s | m | l | xl`), `font` (default `onest`, CHECK `onest | system | readable`), `density` (default `comfortable`, CHECK `comfortable | compact`), `cardPreview` (`card_preview`, default `large`, CHECK `large | small | off`), `cardSite`, `cardNotes`, `cardTags` (booleans, default true).

Own fields on `User` for Settings › Language (#274, story 31): `language` (text, default `browser`, CHECK `browser | en | fr | de | it | es | pt`), `dateFormat` (`date_format`, default `default`, CHECK `default | medium | dmy | mdy | iso`), `timeFormat` (`time_format`, default `default`, CHECK `default | h24 | h12`), `weekStart` (`week_start`, default `default`, CHECK `default | monday | sunday`), `languageSavedAt` (`language_saved_at`, timestamp, null until a language field is first written; answered as `languageSaved`). `spellcheck` (boolean, default true) is retired since #326 (spell-check in the note field is always on): the API neither reads nor writes it and `PATCH /api/me/settings` rejects it as an unknown field; the column stays until a later contract migration drops it (expand, then contract).

Demo users: `User` fields `isDemo` (boolean) and `demoExpiresAt` (timestamp, null). Demo data is created from the seed set in `apps/api/src/demo/seed.json`.

**Folder**: a folder (nesting via `parentId`)

| Field | Type | Note |
| `id` | uuid | PK |
| `userId` | uuid | FK → User |
| `parentId` | uuid, null | FK → Folder; `null` = top-level folder |
| `name` | string (≤ 100) |  |
| `colour` | string | One of `graphite` (default), `sage`, `ocean`, `plum`, `clay`, `amber`, `rose`, `teal` (`FOLDER_COLOUR`) or an own lower-case `#rrggbb` (#335; CHECK) |
| `icon` | string (≤ 24) | One of `FOLDER_ICON` (57 icon names, default `folder`) or exactly one emoji (#335: one grapheme of emoji characters, at most 16 code points); validated by the API |
| `position` | smallint | Manual place among the siblings of one parent (#314), 0 first; lists sort by it, then by name. A new or moved folder goes to the end of its parent; the migration seeded the old name order. `PUT /api/folders/order` writes it (not an edit: `updatedAt` stays) |
| `pinnedPosition` | smallint, null | Place in the sidebar pins; `null` = not pinned. At most 7 live pinned folders and links together per user (ADR 0037); cleared when the folder goes to Trash |
| `deletedAt` | timestamp, null | `null` = live; set = in Trash. One shared value for the folder and the live subfolders and links deleted with it (ADR 0036) |

**Link**: a link

| `folderId` | uuid, null | FK → Folder; `null` = "Unsorted" |
| `url` | string (≤ 2048) | As entered by the user |
| `normalizedUrl` | string | For duplicate detection (see below) |
| `title` | string (≤ 300) | From the preview, or the URL if the preview did not load |
| `note` | text, null | "Why I saved it", ≤ 2000 characters |
| `faviconUrl` | string, null | API only (no column): same-origin path `/api/links/{id}/favicon?v=…` of the captured site icon; `v=pending` while a re-capture is pending; `null` if none (ADR 0027) |
| `imageUrl` | string, null | API only (no column): same-origin path `/api/links/{id}/image?v=…` of the captured preview image; `v=pending` while a re-capture is pending; `null` if none (ADR 0027) |
| `faviconSourceUrl`, `imageSourceUrl` | string (≤ 2048), null | Server only, never returned: remote http(s) URLs the capture fetches (from the client hint or the preview) |
| `captureAttemptedAt` | timestamp, null | Server only: time of the last image capture attempt, defaults to the insert time; `null` = pending (the URL changed), claimed atomically by `POST /api/links/{id}/images/capture`, which is also its cooldown (ADR 0027 note, #189) |
| `isFavorite` | boolean | Defaults to `false` |
| `kind` | string | `video`, `article`, `shopping` or `other` (`LINK_KIND`, CHECK, default `other`): derived at save time from `og:type` and the host, recomputed from the host when the URL changes, changeable by the user; backfilled from the host (ADR 0038) |
| `lastOpenedAt` | timestamp, null | For the "Recently opened" page |
| `pinnedInFolderAt` | timestamp, null | Pinned to the top of its folder; pinned links come first in pin order (at most 20 per folder); cleared on a move and in Trash (ADR 0037) |
| `pinnedPosition` | smallint, null | Place in the sidebar pins, shared with folders (see `Folder`); `null` = not pinned |
| `deletedAt` | timestamp, null | `null` = live; set = in Trash (ADR 0036). Every live read filters `deletedAt IS NULL`; only the link image routes still serve a trashed link to its owner |

**SavedView** (ADR 0038): a saved filter shown as a chip above the feed: `id`, `userId` (cascade), `name` (≤ 40), `query` (jsonb, the normalized `SavedViewQuery` `{ scope: all | unsorted | favorites | folder, folderId, tags (≤ 5), kind, sort, order, q (≤ 200) }`, validated by the API), `position`. At most 20 per user. New users get "Videos" and "Articles" from a database trigger on `users` (existing users from the migration); "All" is the client's fixed chip, not a row.

**LinkImage** (ADR 0027): re-encoded copy of a link's favicon or preview image: `id`, `userId`, `linkId` (cascade), `kind` (`favicon` | `preview`), `contentType` (always `image/webp`), `bytes` (≤ 64 KB), `width`, `height`, `sha256`; unique per `linkId + kind`.

**Tag**: a tag: `id`, `userId`, `name` (≤ 50); unique per `userId + name` pair.

**LinkTag**: many-to-many relation: `linkId`, `tagId` (composite PK).

**Feedback**: ratings and feedback: `id`, `userId`, `milestone` (`day3` | `week1` | `month1` | `year1`), `score` (1–10, `null` = skipped), `comment` (≤ 2000, optional), `createdAt`, `updatedAt`; unique on `userId + milestone`; DB CHECKs: milestone in the set, score null or 1–10, comment ≤ 2000 characters, no comment without a score. The presence of a row means the milestone is answered; the frontend does not read the table but asks `GET /api/feedback/prompt`.

**Feedback messages (#272)** live in the same `feedback` table; a row is either a rating or a message (CHECK). A message row has `kind` (`idea` | `problem` | `other`; `null` on a rating row), `comment` (the text, 1–2000 characters, `milestone` and `score` are `null`), `status` (`received` default | `planned` | `in-progress` | `done` | `not-planned`), `reply` (≤ 2000, set by the author), up to three screenshots in the child table `feedback_screenshots` (#352: `feedback_id`, `position` 0–2, `bytes` 1 byte to 2 MB, `type` `image/png` | `image/jpeg` | `image/webp`; primary key `(feedback_id, position)`, deleted with the message) and `client_app_version` / `client_user_agent` (≤ 300, optional). `milestone` is nullable, so the unique index on `userId + milestone` only constrains ratings. Indexes: `(user_id, created_at)` for the user's list, `(created_at desc, id desc)` for the admin list. Reads never select the screenshot bytes except in the two screenshot routes (the lists select only the positions). Rating reads filter `kind IS NULL`, message reads `kind IS NOT NULL`. Sending is two steps by design (#352): the message is created first (`POST /api/feedback/messages`, small body), then each of up to 3 images is attached in its own request (`POST /api/feedback/messages/:id/screenshots`) within 10 minutes of the message, so no request body comes near the Vercel Function limit of 4.5 MB. A screenshot that fails does not undo the message; the client counts it and says so on the thank-you screen.

**URL normalisation** (for duplicates): lowercase host, no `#fragment`, no `utm_*` params and no trailing `/`. Duplicates are allowed (the user can "save anyway"), so the index is non-unique.

**Indexes:** `Link(userId, createdAt)`, `Link(userId, normalizedUrl)`, `Link(userId, lastOpenedAt)`, `Link.title`, `Link.note` and `Link.url` (`pg_trgm` GIN for search), `Folder(userId, parentId)`; partial indexes on `pinnedPosition` (`Folder`, `Link`) and `Link(folderId, pinnedInFolderAt)`; `Link(userId, kind)`, `SavedView(userId, position)`; partial indexes `Link(userId, deletedAt)` and `Folder(userId, deletedAt)` `WHERE deletedAt IS NOT NULL` for the Trash list and the purge.

**FolderShare** (#276, ADR 0040): the public link of a folder: `id`, `userId`, `folderId` (unique; composite FK to the user's folder, cascade), `token` (22 base64url characters, unique, CHECK on the format; stored as is so the owner can copy the link again), `showNotes` (default `false`), `tokenCreatedAt`. A row exists only while the folder is shared; turning it off deletes the row. Moving the folder to Trash keeps the row (the public page answers 404 while the folder is trashed), so a restore revives the same token; only turning it off, a reset or the purge of the folder ends it.

**Interface settings** (view, panel) are not stored in the database, only in `localStorage`.

### 6.2 REST API

All routes except `/api/auth/*` and the allow-listed public routes (`PUBLIC_ROUTES`: health, monitoring, demo, cron, public collections) require a session and work only with the current user's data. Contracts (DTOs) are in `libs/shared/contracts`; documentation is Swagger.

| Method | Path | Purpose |
| `*` | `/api/auth/*` | Sign-in / sign-out with Google and GitHub (Better Auth) |
| GET | `/api/auth/get-session` | Current user and session (Better Auth); `null` when signed out |
| DELETE | `/api/me` | Delete the account and all data |
| POST | `/api/links/preview` | For a URL, return title, icon, image + the existing link if it is a duplicate (for form autofill). With the account's `fetchPreviews` off no page is loaded (`fetched: false`, only the duplicate check); the URL is always checked and fetched without tracking parameters (#284, #315) |
| GET | `/api/links` | List with filters: `folderId`, `unsorted`, `favorite`, `tag` (repeated, `?tag=a&tag=b`: AND, case-insensitive, max 5, more is a 400; empty or absent = no filter), `q` (search in title, note and URL; every word must match, at most 5 words), `kind` (one of `video`, `article`, `shopping`, `other`; ADR 0038), `sort` (`createdAt` / `title`), `order`, `cursor`, `limit`. With `folderId` the first page also returns `pinned`: the links pinned to the top of that folder in pin order (same filters), not repeated in `items` or later pages (ADR 0037) |
| GET | `/api/links/recent` | Recently opened (by `lastOpenedAt`, only the last 30 days, `RECENT_LINKS_WINDOW_DAYS`), `limit` |
| DELETE | `/api/links/recent/:id` | Remove one link from the history (`lastOpenedAt` to null, the link stays); 204, idempotent, 404 for a foreign or missing link |
| DELETE | `/api/links/recent` | Clear the whole history of the user (all own links' `lastOpenedAt` to null); 204 |
| GET | `/api/links/:id` | One link |
| POST | `/api/links` | Create: `url`, `title?`, `note?`, `folderId?`, `tags?` (names; new tags are created automatically), `kind?` (from the preview; derived by the server when absent). `POST /api/links/preview` answers `preview.kind`. Tracking parameters are always stripped from `url` (also on `PATCH`; #315); `fetchPreviews` off means no page fetch and no image capture, image hints ignored (#284) |
| POST | `/api/links/batch` | Paste many (#265): up to 100 `items` (`url`, `title?`, `idempotencyKey`, `faviconUrl?`, `imageUrl?`) with `folderId?` and `tags?` for all. One transaction under the ADR 0033 lock order, per-item idempotency keys (a replayed key returns its link; 200 when every key was replayed, else 201), the per-user link cap checked for the whole batch (409 whose message says how many more fit), a stricter rate limit (5 per minute). It fetches nothing: images, and the page title of links sent without one, come from the lazy capture (ADR 0027). Items whose normalised URL is too long or repeats an earlier item are skipped and listed in `errors` |
| PATCH | `/api/links/:id` | Change any fields, including `isFavorite`, `folderId`, `kind` (a new URL without `kind` recomputes it from the host) and `pinnedInFolder` (pin to the top of the folder: 400 in Unsorted, 409 beyond 20 per folder; a move unpins) |
| POST | `/api/links/:id/open` | Record an open (updates `lastOpenedAt`); answers the link with `recorded: boolean`, `false` while the history is paused (nothing is written, #269) |
| POST | `/api/links/:id/images/capture` | Re-capture favicon and preview image of a link whose URL changed (pending marker `?v=pending`); claims atomically with a 1 h cooldown, always 200 with the link, 404 for a foreign or missing one |
| DELETE | `/api/links/:id` | Move to Trash (soft delete: sets `deletedAt`); 404 for a foreign, missing or already trashed link |
| POST | `/api/links/batch/delete` | Bulk move to Trash: `{ ids }` (1–100 distinct UUIDs) → `{ deleted }`; one shared `deletedAt`, pins cleared; foreign, missing and trashed ids are ignored; restore through `POST /api/trash/restore` (#267; also the Undo of a paste, #265) |
| POST | `/api/links/batch/update` | Bulk change: `{ ids, folderId?, addTags?, removeTags?, isFavorite? }` (at least one change; a tag in both lists is a 400) → `{ updated, links }`; one transaction (folders lock, then tags lock, ADR 0033); the folder must be the user's and live (404); a link past 20 tags fails all (409); removing never deletes tags; foreign, missing and trashed ids are ignored; `RATE_LIMIT.UpdateLinksBatch` (#267) |
| GET | `/api/folders` | All folders as a flat list ordered by `position`, then name (`parentId`, `position` + direct link count) plus `counts` (`all`, `unsorted`, `favorites`) for the fixed sidebar rows; the frontend builds the tree |
| GET | `/api/folders/:id` | Read one folder (`GetFolderResponse` = `FolderResponse`, with its direct link count); 404 if unknown or foreign |
| POST | `/api/folders` | Create: `name`, `parentId?`; 409 at the per-user cap (500 folders) |
| PATCH | `/api/folders/:id` | Rename / move / `colour` / `icon` (allow-lists, 400 otherwise); moving into itself or its own subfolder is forbidden; a move goes to the end of the new parent |
| PUT | `/api/folders/order` | `{ parentId: uuid \| null, ids: [uuid] }`: every live subfolder of that parent (`null` = top level) exactly once in the new order, else 400; a foreign, missing or trashed parent is 404; never changes a parent; answers the whole `GET /api/folders` list (#314) |
| GET | `/api/pins` | Sidebar pins in order: up to 7 live folders and links together, each `{ kind, position, folder \| link }` |
| POST | `/api/pins` | `{ kind: 'folder' \| 'link', id }`: pins at the end (idempotent, answers the list); 404 for a foreign, missing or trashed target, 409 beyond 7 |
| PUT | `/api/pins/order` | `{ items: [{ kind, id }] }`: every pinned item exactly once in the new order, else 400 |
| DELETE | `/api/pins/:kind/:id` | Unpin; 204, idempotent; 404 for a foreign, missing or trashed target |
| DELETE | `/api/folders/:id?mode=` | Move a folder with all subfolders to Trash (one shared `deletedAt`); `mode=delete-links` also trashes the links, `mode=move-to-unsorted` moves them to "Unsorted" |
| GET | `/api/trash` | Trash entries, newest first (at most 500) with `total` and `retentionDays`: a link deleted on its own, or a folder standing for its subtree (`linkCount`); each has `deletedAt`, `expiresAt`, `fromFolderName` |
| POST | `/api/trash/restore` | `{ items: [{ kind: 'link' \| 'folder', id }] }` (1 to 100): puts entries back (a link whose folder is not live goes to Unsorted, a folder whose parent is not live to the top level); entries not in Trash or foreign are skipped; answers `{ count }` |
| POST | `/api/trash/delete` | Same body: deletes entries for good (a folder takes its subtree and the links deleted with it); answers `{ count }` |
| DELETE | `/api/trash` | Empty Trash: deletes every entry for good; answers `{ count }` |
| GET | `/api/views` | Saved views in order, each `{ id, name, query, position, count, available }` (`count` = live links matching, `available` false while the folder of a folder view is in Trash or gone), plus `total` (all live links, the "All" chip); counted in one grouped query (ADR 0038); optional `scope`, `folderId`, `tag` (repeat) name the feed the chips sit on (#335): `total` and every count are then taken inside that feed (400 for a folder feed without `folderId`, `folderId` with another scope or unknown fields) |
| POST | `/api/views` | `{ name, query }`: saves at the end (strict query, 400 otherwise; 404 for a foreign, missing or trashed folder; 409 beyond 20) |
| PATCH | `/api/views/:id` | `{ name?, query? }`: rename or replace the query; 404 for a foreign or missing view |
| PUT | `/api/views/order` | `{ ids }`: every view exactly once in the new order, else 400 |
| DELETE | `/api/views/:id` | Delete a view (the links stay); 204, 404 for a foreign or missing one |
| GET, PATCH | `/api/me/settings` | Account settings `{ trashRetentionDays: 7 \| 30 \| 90, folderColours: boolean, pauseHistory: boolean, theme: system \| light \| dark \| custom, customTheme: { base, accent, background, corners } (accent and background may be an own `#rrggbb`), customColours: `#rrggbb`[] (at most 12, no duplicates), motion: system \| full \| reduced, appearanceSaved: boolean, defaultView: cards \| list, defaultSort: newest \| oldest \| title, openLinksIn: new-tab \| same-tab, showFolderCounts: boolean, newLinksFolderId: uuid \| null, fetchPreviews: boolean, textSize: s \| m \| l \| xl, font: onest \| system \| readable, density: comfortable \| compact, cardPreview: large \| small \| off, cardSite: boolean, cardNotes: boolean, cardTags: boolean, language: browser \| en \| fr \| de \| it \| es \| pt, dateFormat: default \| medium \| dmy \| mdy \| iso, timeFormat: default \| h24 \| h12, weekStart: default \| monday \| sunday, languageSaved: boolean }` (#326: `spellcheck` is retired, an unknown field; #274: `languageSaved` false until a language field is first written, `users.language_saved_at`; #285: the layout fields are part of the appearance and mark it saved; #284: `newLinksFolderId` must be a live own folder, else 404 and nothing is saved, and reads as `null` once it is gone; `fetchPreviews` off means no page fetch and no image capture for the user's new links and a preview answer without a page; `keepQuery` off strips tracking parameters on create, update and preview; `appearanceSaved` false until the appearance is first written, `users.appearance_saved_at`; allow-lists in the contracts; `customTheme` is always sent whole and its background must belong to its base, #273; `customTheme.accent` is a curated name or an own colour as lower-case `#rrggbb`, #315); PATCH sends only the fields to change (400 for another value or an extra field); demo users too |
| GET | `/api/me/stats?firstDay=1..7` | "Your shelf" on the Account page (#352): counts of live links, folders and tags (a tag counts only while it is on a live link), top 5 sites and tags, links per week for 12 weeks, member since, oldest live link, connected providers (`provider` and date only). `firstDay` is the ISO weekday the weeks start on (1 Monday … 7 Sunday, default 1; the web sends the user's week start, `LocaleService.firstDay`); weeks are UTC days. 400 for another `firstDay`. Computed on request from the user's own data, never stored |
| GET | `/api/cron/trash-cleanup` | Vercel Cron only (`CRON_SECRET` bearer, 401 otherwise, no-store): deletes Trash rows past the owner's retention in batches of 500 within 5 s; answers `{ deleted, hasMore }` (ADR 0036) |
| GET, POST, GET /:id, PATCH /:id, DELETE /:id, POST /:id/merge | `/api/tags` | The user's tags with link counts, sorted by link count descending, then name; read one tag with its count (404 if unknown or foreign); create an empty tag (409 if the name is taken or at the per-user cap of 1000), rename (409 if the name is taken; changing only the case of its own name is allowed), delete (links remain), merge with another tag (merging into itself is a 400). Names are normalized with `normalizeTagName` (trim, whitespace runs become one hyphen) on create and rename |
| GET | `/api/feedback/prompt` | Which rating dialog to show now: `{ milestone }`, the latest reached milestone without a row, `null` for demo users and before onboarding (no-store) |
| GET, POST, PATCH, DELETE | `/api/folders/:id/share` | The public link of a folder (#276): read (`enabled: false` when not shared), turn on (idempotent, 200; 403 demo, 409 at 10 public folders), `{ showNotes }`, turn off (204, idempotent); 404 for a foreign or missing folder |
| POST | `/api/folders/:id/share/reset` | A new token; the old link answers 404 at once; 404 when not shared |
| GET | `/api/public/collections/:token?folder=&page=` | Anonymous: the shared folder (owner's first name, name, link count, last change, direct subfolders with counts) and its subtree's links newest first, 50 per page, pages 1–10 (at most 500); notes only with `showNotes`; one 404 shape; `noindex`, `no-store`; 30 a minute per IP |
| GET | `/api/public/collections/:token/links/:linkId/favicon\|image` | Anonymous: a stored image of a link inside the shared subtree (ADR 0027 headers), else the same 404; 240 a minute per IP |
| POST | `/api/feedback` | Save a rating, feedback or a skip `{ milestone, score \| null, comment? }` (204; 403 demo, 409 onboarding pending / milestone not reached / different score stored; same score appends the comment) |
| POST | `/api/feedback/messages` | Send a feedback message `{ kind, text, client?: { appVersion, userAgent } }` (201 `FeedbackMessage` with `screenshotUrls: []`; 400 invalid body; 429 with `Retry-After` after 10 messages in a rolling hour, counted in Postgres, demo users included). The JSON body limit of this route is the default 100 kB |
| POST | `/api/feedback/messages/:id/screenshots` | Attach one screenshot `{ type, data (base64) }` to an own message (#352): up to 3 per message, one per request (a Vercel Function takes at most 4.5 MB), within 10 minutes of sending; JSON body limit 3 MB (this route only); 201 the updated `FeedbackMessage`; 400 invalid body, wrong magic bytes, over 2 MB, a 4th screenshot ("A message has at most 3 screenshots") or too late; 429 with `Retry-After` when the screenshots on the user's messages of the last 24 hours would pass `ScreenshotBytesPerDayMax` (20 MB; `DemoScreenshotBytesPerDayMax` 6 MB for the demo account; counted in Postgres under a per-user lock); 404 foreign, missing or a rating |
| GET | `/api/feedback/messages` | The user's own messages, newest first, at most 100, with `status` and `reply` (no-store) |
| GET | `/api/feedback/messages/:id/screenshots/:position` | One screenshot (position 0 to 2) of an own message (404 if foreign, missing or none there); stored type, `nosniff`, `inline`, `Cache-Control: private, no-store` (set before validation, so a 400 or 404 carries it too) |
| GET | `/api/admin/status` | `{ admin: true }` for a user whose email is in `ADMIN_EMAILS`; 404 for everyone else, guests and demo users included |
| GET | `/api/admin/feedback` | All users' feedback messages with `user: { name, email }`, newest first, keyset `cursor` / `limit` (≤ 100), optional `status` filter; `{ items, nextCursor }` |
| PATCH | `/api/admin/feedback/:id` | `{ status?, reply? }` (reply ≤ 2000, `null` or blank clears; at least one key); answers the updated item; rate-limited, CSRF-guarded |
| GET | `/api/admin/feedback/:id/screenshots/:position` | One screenshot of any message, same safe headers |

**General API rules:**

- cursor pagination, `limit` defaults to 50, maximum 100;
- one error format: `{ statusCode, error, message, requestId }` (as in 5.2);
- someone else's or a non-existent object → `404` (not `403`, so as not to reveal that it exists).

**Additionally:** `POST /api/me/onboarding` marks onboarding as completed (one-way: `DELETE /api/me/onboarding` and "Show welcome again" were removed in #315); the user from `GET /api/auth/get-session` carries `onboardingCompletedAt` (#151).

**Demo, export, PWA:** `POST /api/demo` creates a demo sandbox and session (strict per-IP rate limit); `GET /api/export?format=json|html` (+ optional `folderId`, `tag` (repeated, same AND semantics as the list), `q`, `kind`, the same filters as the list; each JSON link carries its `kind`) downloads the current folder (with its subfolders) or all data; `q` searches title, note and URL; the HTML file omits links whose URL is not http(s); receiving a link from the "Share" menu (Web Share Target) needs no separate endpoint: the manifest opens the `/share?url=…` route (GET), and the page saves via `POST /api/links`.

**App rating:** `GET /api/feedback/prompt` (no-store) returns `{ milestone: 'day3' | 'week1' | 'month1' | 'year1' | null }`, which dialog to show now (the latest reached milestone without a `Feedback` row, computed by the backend from `User.createdAt`; `null` for demo users and before onboarding is completed); `POST /api/feedback` `{ milestone, score | null, comment? }` answers 204 and saves a rating, feedback or a skip (a comment needs a score). Errors: 400 invalid body (or combined comment over 2000 characters), 403 demo user, 409 onboarding pending, milestone not reached yet, or a different score already stored for the milestone. Resubmitting for the same milestone with the same score appends the comment after a blank line. Rate-limited; the feedback text is stored as is and rendered only as text (no HTML).

## 7. Design and UX (Claude Design)

A minimalist, recognisable interface with light and dark themes on the own UI library `libs/ui`: our own look, with behaviour and accessibility on Angular Aria / CDK headless primitives.

### 7.1 Style

- Minimalism, high-quality UI/UX, beginner-friendly; its own character, but grounded in the practices of Linear, Notion, Raindrop.
- Light and dark theme in stage 1: system default, plus a manual toggle. Stage 2 (#273): a Custom theme on the light or dark base with a curated accent, background and corner scale (it only swaps token values: `html[data-theme=custom][data-custom-*]`, rules generated from SCSS maps in `libs/ui/src/styles/tokens/_custom.scss`); an own accent colour (#315, ADR 0041) is drawn in its nearest WCAG AA shade as custom properties on `html` (`customAccentTokens` in `libs/ui`) and the Animations setting (System, Full, Reduced; `html[data-motion=reduced]` joins `prefers-reduced-motion` in the `reduced-motion` mixin and in `ReducedMotion`). Both are account settings.
- Responsive interface in stage 1: desktop, tablet and phone (from 360 px). Navigation switches at 1024px (64em, #316): below it (phones and iPad portrait) a floating tab bar (Library, Search, Add, Tags, You) replaces the sidebar and the top bar, from 1024px up (iPad landscape, desktop) the sidebar layout, and from 1280px (80em, `ViewportService.wide`) the header search is a field with a results panel; content stays fluid (the card grid keeps `auto-fill` columns of at least 20rem, 1 on a phone, 2 on an iPad; every card has the same height: title and note take two lines each, #335). The desktop sidebar keeps the logo and the footer ("Send feedback" above Trash) fixed and scrolls only its middle part, with the "How it works" card at the bottom of it; settings pages have no header search (#335). `phone` (below 640px) is only for small-screen details: bottom sheets, one column, stacked buttons. On an iPad (640–1023px) forms (add / edit link, new folder, confirmations) open as centred dialogs, quick lists (Recently opened from Library) as a bottom sheet centred at about 560px with rounded top corners and swipe-to-close, menus stay popovers at their trigger; hover-only controls (checkboxes, the star, "…") are always visible on touch at any width. In the mobile shell: Library holds tiles (All links, Unsorted, Favorites, Recently opened as a bottom sheet) and the folders, Tags lists the tags, You holds the settings; the feed is one column.
- Uniqueness comes not from bright colour but from micro-interactions, typography, empty-state illustrations and the logo.

**The interface language is English.** Mockups, copy, onboarding and empty states are written in English. Translations (uk) come at the end of stage 1 or after it (see 5.1).

**Palette: monochrome (graphite) + a "sage" accent.** Graphite for the background, text and primary buttons; sage only where colour carries meaning: favorites, active menu item, tags, focus. The dark theme is not pure black, text is not pure white. The values are a starting point; final ones are refined in Claude Design with a WCAG AA contrast check.

| Token | Light | Dark |
| `bg` (page background) | `#F7F7F6` | `#131315` |
| `surface` (cards, panels) | `#FFFFFF` | `#1C1C1F` |
| `border` | `#E5E5E2` | `#2C2C30` |
| `text` | `#18181A` | `#EDEDEF` |
| `text-muted` | `#67676C` | `#9A9AA0` |
| `primary` (primary button) / text on it | `#18181A` / `#FFFFFF` | `#EDEDEF` / `#131315` |
| `accent` (sage: star, icons) | `#4F7A4B` | `#8DBB86` |
| `accent-bg` (active item, tag chip) | `#E5EEE2` | `#22301F` |
| `accent-text` (text on `accent-bg`) | `#2F4A2C` | `#C6DEC0` |
| `focus-ring` | `#5E8A58` | `#8DBB86` |

**Micro-interactions** are a mandatory part of every `libs/ui` component, defined by duration and easing tokens:

- **one signature moment, saving a link:** the new card drops into first place in the feed, the others shift, and a sage ring briefly glows around the new card (`ease-spring`, `duration-slow`);
- hover is only a colour change (card background or border); cards do not "lift";
- press is a slight "push in" (scale \~0.97–0.98);
- keyboard focus is a sage-coloured ring (`focus-visible`);
- feedback on actions: menus and dialogs fade + slight scale, toasts slide in, the favorite star does a short "pop";
- illustrations pick a mode by where they are shown: `loop` (slow, 3–5 s cycle) on the landing page, the welcome steps and the sign-in screen, `once` then hold the final frame for in-app empty states and errors, `none` is static; all static under `prefers-reduced-motion`; no other background loops and no section reveal animations;
- the logo animates only on the first sign-in to the account;
- loading uses skeletons;
- `prefers-reduced-motion`: no movement or scaling; overlays and the new card simply fade in, loaders spin slower.

**Interface text rules:** labels and sections in normal case, no ALL CAPS; metadata is not glued together with "·" (domain with site icon, date on the right or in a tooltip, counts in words: "12 links, 2 subfolders").

**Style units are `rem`.** Font sizes, spacing, control heights, radii and widths are written in `rem` (16 px base, tokens are converted: `space-1` = 0.25rem, `space-4` = 1rem, 15 px font = 0.9375rem), so the interface scales with the font size in browser and system settings. `html { font-size: 100% }`: the root is not overridden. Only border widths (1px), focus rings and shadows stay in `px`; breakpoints are in `em`. The exact stylelint exception list: border widths (`border*`), `outline`, `outline-offset`, `box-shadow` and the loading bar height (2px). In SVG icons `stroke-width` is not set in px. Mockups and the design system are specified in px for clarity; `ui-dev` converts them via the SCSS function `rem($px)`, and stylelint forbids `px` outside the exception list.

**Ripple (the `uiRipple` directive in `libs/ui`, the Ripple component in the design system).** On press, a text-coloured circle spreads from the touch point (6% in the light theme, 10% in the dark, 20% on filled buttons; values from the Motion spec), grows for 450 ms while the finger is held, and fades over 350 ms after release. Starts on `pointerdown`, cancelled on scroll (movement > 10 px), from the centre for keyboard. Where: all buttons (together with the 0.97 press scale), sidebar and mobile menu rows, menu and select list items, link list rows, clickable tags, toggle items. Not on: link cards, input fields, dialogs, landing. With `prefers-reduced-motion`: no ripple, only the pressed background.

**Accessibility: WCAG 2.1 AA (design audit, November 2026).** Every screen was run through axe-core and checked by hand; the findings are fixed in the design system and the mockups. Rules the agents follow in `libs/ui`:

- `text-muted` (light theme `#67676C`) holds 4.5:1 not only on `bg` and `surface` but also on `surface-hover`, `surface-pressed` and `accent-bg`, so counts on a selected row and dates in chips stay readable. Text is never dimmed with `opacity` (stale search results do not fade; they are marked `aria-busy`).
- The segmented control is a `role="radiogroup"`; each item is `role="radio"` with `aria-checked`, not just an `is-active` class.
- The welcome step indicator is `role="img"` with `aria-label="Step N of M"`; a spinner with a label is `role="status"`.
- The card title is one level below the page heading (`h2` under `h1`), with no skipped levels.
- Tag autocomplete follows the combobox pattern: `aria-controls`, `aria-autocomplete`, `aria-activedescendant`; the listbox has an `aria-label` and contains only options.
- `role="dialog"` / `alertdialog` and `aria-modal` sit on the CDK container; a form inside stays a plain `<form>`.
- Target size is at least 24×24 everywhere (WCAG 2.5.8); on touch screens (`pointer: coarse`) icon buttons are 44×44, and the star and the chip's remove button are enlarged with an invisible `::after`.
- Every UI string is English (the remaining non-English examples were removed from the design-system docs) and goes through translation keys.

In CI: `@axe-core/playwright` on the key screens in both themes; the build fails on serious and critical violations (a `test-engineer` task).

**Loading states** (the Loading and Skeleton components in the design system, the "Loading states" and "Loading · phone" screens). One indicator per wait, chosen by what is loading:

- First load of the feed, folder tree, preview → a content-shaped skeleton (6 cards, 8 rows), then a smooth 200 ms fade-in. The header and sidebar frame render immediately. No full-screen spinners.
- Switching folders, sorting, reloading → a 2px sage bar at the top (`loadingInterceptor` → `UiStore.pendingRequests`); the old content stays on screen.
- A user action (save, delete, sign in, export) → a spinner inside that button and the label "Saving…", `aria-busy`.
- Favorite, move, rename, tags → optimistic, no loader; on error, rollback and a toast with Retry.
- Loading on scroll → a "Loading more links" row; search → a spinner instead of the magnifier icon, previous results dimmed; export → percentage progress; phone → pull to refresh.
- Preview did not load within 8 s → the link is saved without it; the card shows the first letter of the domain on a sage background. Splash screen (logo + thin bar) only if startup takes longer than 300 ms.
- Timing: any loader appears no earlier than 300 ms and stays for at least 400 ms (so it does not flicker). A spinner never pops in abruptly: in a button it fades in and grows from 40% over 200 ms while the label shifts smoothly; in search the magnifier and spinner swap in place without shifting the field; it leaves the same way over 120 ms (`animate.enter` / `animate.leave` in Angular). With reduced motion the skeleton shimmer is off, the spinner and bar slow down but still move; for screen readers, `aria-live` "Loading links" / "Loaded 24 links".

### 7.2 Main screen layout

- **Header:** logo on the left · global search in the centre (Ctrl/⌘+K; from 80em a field with a results panel, from 64em to 80em a "Search" button that opens the dialog, #329) · on the right the "Add link" button, theme toggle, avatar menu (settings, sign out).
- **Left sidebar:** All links · Unsorted · Favorites · folder tree · tags.
- **Content:** breadcrumbs ("All links › Work › Angular", every level clickable) · toolbar (sorting, "cards / list" toggle) · feed.
- **Recently opened:** its own page (`/recent`) reached from the sidebar row; in the mobile shell (below 1024px) a sheet from the Library tab (tab bar, #243, #316).

**Tooltips** (`uiTooltip`, appear after 400 ms on hover or keyboard focus, not shown on touch screens): on every icon button (theme, avatar, new folder, view toggle, card actions, star), on titles truncated with "…" (full title), on relative dates ("2 days ago" → exact date). The tooltip shows the keyboard shortcut if there is one. A tooltip is never the only place where information is available.

**Keyboard shortcuts:** one list, `SHORTCUT_GROUPS` (`features/shortcuts`), is the source of truth: the dialog (keyboard icon in the top bar and the "?" key) and Settings › Keyboard shortcuts both render it, and a unit test compares it with the key handlers, so every bound shortcut is listed and nothing unbound is (#315). Today: ⌘K / Ctrl+K search, ? this list, Esc closes a dialog, menu or toast, ⌘Z undo while an Undo toast shows, Alt+Shift+T the toast's button; ⌘Enter saves the link dialog, ⌘V pastes links into the library, ↑ ↓ / Enter / ⌘Enter in the search results; Space, Shift+Space, ⌘A, M and Esc for selecting links; ↑ ↓ ← → and Shift+F10 in the folder list, Alt+↑ / Alt+↓ to reorder pinned items and folders. The letter shortcuts of the stage 1 plan (N, E, F, V C, G A …) are not built.

### 7.3 Stage 1 screens

1. Sign-in (Google, GitHub)
2. Onboarding dialog (first sign-in, 3 steps)
3. Main screen (layout above) in the "cards" and "list" views
4. Adding a link (with autofill and a duplicate warning)
5. Editing a link
6. Deleting a folder (choice: delete links / move to "Unsorted")
7. Empty states (no links, empty folder, nothing found; #315 adds Unsorted, Favorites, Trash, Recently opened, a tag or type filter, an empty saved view, the phone Tags tab and an empty public collection in the same style: the page-level card centred in the content area with a play-once scene)
8. Settings, a page per section (account with deletion, appearance, library with the Trash retention, export, privacy and data); the settings nav replaces the sidebar from 1024px, the You list opens the pages below it (#316)
9. Privacy policy
10. Trash (desktop and phone, with the empty state, selection and the "Empty trash" confirmation)
11. Send feedback dialog (form, sending, thank you, error) and Settings › Your feedback (SendFeedback, SetFeedback); the author's feedback inbox is built from the same parts and has no mockup
12. Folder style (the "Colour and icon" dialog, the Pinned section, "Pin to top" in a folder, "Folder colours" in Settings › Appearance; the Settings › Library rows "Pinned at the top" and "Folder colours" were removed in #315)
13. Saved views (the chips above the feed with counts and "+ Save this view", the name dialog, the view menu, the type chips on Recently opened, the "Type" select in the edit dialog)

Every screen in light and dark themes, in desktop and phone layouts, with loading and error states.

**Onboarding dialog.** Shown once, right after the first sign-in, on top of the empty feed. Three short steps with an illustration in the style of the design-system cover and a step indicator:

1. **All your links in one place**: what Shelfmark is: videos, articles, products, courses on one page.
2. **Save in a second**: paste a link, the title and preview are fetched automatically; add a "why I saved it" note.
3. **Find it instantly**: folders, tags, favorites and search (⌘K).

Buttons: "Skip" (on every step), "Next", and on the last step the primary button "Add your first link", which opens the add form. Keyboard control (arrows, Esc = skip), focus trapped in the dialog. On phone, a full-width bottom sheet. Steps change smoothly: the content shifts 24 px in the direction of movement ("Next" to the left, "Back" to the right) and fades in over 320 ms. Behind the blurred backdrop is the real app, playing out the step's story: cards fly onto the shelf; "Add link" is pressed and a new card lands; "ramen" is typed into search and non-matching cards fade out. Respects `prefers-reduced-motion`.

**Additional screens:** landing (desktop and phone), the demo-mode banner in the app, the quick save form from the "Share" menu on Android, the export menu on the main screen and in the account menu.

### 7.4 UI library `libs/ui`

**The main rule: every interface element is a reusable component with variants.** Features are built only from `libs/ui` components; "bare" styled `<button>`, `<input>` etc. in feature code are forbidden (checked by lint and review).

**Design tokens** are the only source of styles, as CSS variables:

- colours are semantic (`bg`, `surface`, `border`, `text`, `text-muted`, `accent`, `danger`, `success`), with a separate set for the dark theme;
- spacing on a 4 px scale; radii; typography; shadows; animation durations.

**Component rules:**

- standalone, signal inputs (`input()`, `output()`, `model()`), variants as typed inputs (union types, for example `variant: 'primary' | 'secondary' | 'ghost' | 'danger'`);
- styles in SCSS only through tokens, no `::ng-deep` and no hard-coded colours;
- input fields are integrated with Signal Forms;
- behaviour (keyboard, focus, ARIA, overlays) from Angular Aria / CDK;
- every component has a Storybook story with all variants and both themes, unit tests and an accessibility check;
- folders by kind (ADR 0042, #318): `libs/ui/src/lib/components/<name>/` (sub-components in sub-folders), `directives/`, `services/`, `utils/` (pure functions shared by several components) and `models/` (constants and types without a component); `@shelfmark/ui` stays the one public entry.

| Component | Variants and states | Behaviour basis |
| `ui-button` | `primary` / `secondary` / `ghost` / `danger`; sizes `sm` / `md` / `lg`; icon left/right; icon only; `loading`, `disabled` | native button |
| `ui-input` | types `text` / `url` / `search`; label, hint, error, icon, clear button; `disabled` | Signal Forms |
| `ui-textarea` | label, hint, error, character counter | Signal Forms |
| `ui-select` | nested folder picker; search; empty value = "Unsorted" | Aria listbox / combobox |
| `ui-tag-input` | tag chips, autocomplete, creating a new tag | Aria combobox |
| `ui-radio-group` | vertical / horizontal | Aria |
| `ui-dialog` | sizes; confirmation preset, including for a destructive action | CDK Dialog |
| `ui-menu` | items with icons, separators, destructive item | Aria menu |
| `ui-tooltip` | positions | CDK Overlay |
| `ui-toast` (service) | `info` / `success` / `error`; "Undo" action | CDK Overlay |
| `ui-tree` | folder tree: expand, select, context menu | Aria tree |
| `ui-breadcrumbs` | clickable levels, truncation of a long path | — |
| `ui-segmented-control` | "cards / list" toggle | Aria |
| `ui-chip` | tag; clickable / removable | — |
| `ui-card`, `ui-list-item` | bases for the link card and row; hover, selection | — |
| `ui-skeleton` | for card, row, tree | — |
| `ui-empty-state` | icon, heading, text, action | — |
| `ui-avatar` | photo / initials; sizes | — |
| `ui-icon`, `ui-spinner` | one SVG icon set; sizes | — |

**Domain components** (link card, link row, folder tree with links, link form) live in the feature folders `apps/web/src/app/features/*` and are built from `libs/ui`. No separate Nx feature libraries in stage 1.

### 7.5 Claude Design workflow

1. **Design system:** tokens (light and dark theme) and all components from the table with all variants.
2. **Screen mockups** from 7.3 on this design system, in both themes.
3. **Handoff to Claude Code:** the mockups and design system are the layout reference; tokens are ported first, then `libs/ui` components (with Storybook), then screens.

**Storybook** is published as a component showcase, a separate link for the portfolio.

### 7.6 Logo, icons, illustrations and motion

Shelfmark's visual uniqueness rests on one geometric language: cards, tag "pills" and site-icon squares, the same motif as on the design-system cover.

| What | Decision |
| **Logo** | Chosen: a card with a bookmark notch in the top-right corner (graphite + light sage), a "saved link", + the name in Onest 600. Files in the design system: mark for light and dark themes, monochrome, app icon (favicon, PWA) |
| **Interface icons** | Shelfmark's own set: 44 icons, 24 px grid, 1.75 px stroke, 3 px corner radius, bookmark motif. In Angular, one `ui-icon` component with an SVG sprite |
| **Illustrations** | Flat geometric scenes in colour tokens (work in both themes): 3 onboarding steps, empty states ("no links", "empty folder", "nothing found", plus the #315 scenes for Trash, Recently opened, Favorites, Unsorted, Tags and filters), errors (404, no network), the sign-in screen. Format: SVG, colours via CSS variables |
| **Motion** | CSS animations on duration and easing tokens, no libraries; full spec in the Motion component in the design system. One signature moment, saving a link: the card "lands" in the feed, the others shift (FLIP), the sage ring fades. The logo animates only on first sign-in. Illustrations pick one of three modes by where they are shown: `loop` (slow, 3–5 s cycle) on the landing page, the onboarding welcome steps and the sign-in screen; `once` (plays on appearance, then holds the final frame) for in-app empty states and errors; `none` is static; all are static under `prefers-reduced-motion`. Rules: "in fast, out even faster" (200 / 120 ms, press 80 ms); `ease-out` for entering, `ease-in` only for leaving the screen, `ease-in-out` for movement, `ease-drawer` for sheets; menus grow from their button, all overlays have an exit animation; hover only on devices with a mouse; themes switch via View Transitions. With `prefers-reduced-motion` movement is removed; fade and slow loaders remain. |
| **Promo video** | About 50 s, recorded from the real interface by a script (#271, `npx nx run web-e2e:promo`): how a link goes from a paste onto the "shelf" and is found again; captions, three chapters; used in the "How it works" dialog, the README and the portfolio |

## 8. Agent team in Claude Code

Development is run by a "team" made of the main Claude Code session (tech lead) and 8 subagents; every task goes from a card in GitHub Projects to a PR that the project author reviews and merges.

### 8.1 Team members

Subagents are `.claude/agents/<name>.md` files in the repository. Subagents cannot launch other subagents, so only the tech lead distributes work.

| Agent | Role | Constraints |
| **Tech lead** (main session) | Takes a task, calls agents in turn, assembles the result, opens the PR | Does not merge PRs |
| `project-manager` | Creates issues from this document, sorts them into GitHub Projects statuses, assigns the agent (label), moves the status as work progresses | GitHub only (`gh` CLI / GitHub MCP), does not touch code |
| `architect` | Solution plan before code: files, contracts, risks | Read-only on code |
| `frontend-dev` | Angular 22 features following the v22 rules and section 7 | Only `apps/web` (features in `apps/web/src/app/features/*`) |
| `ui-dev` | `libs/ui` components, tokens, Storybook stories | Only `libs/ui` |
| `backend-dev` | NestJS, Prisma schema and migrations, API per section 6 | Only `apps/api`, `libs/shared` |
| `test-engineer` | Unit tests, e2e (Playwright), data-isolation tests from 5.8 | Does not change application code, only tests |
| `code-reviewer` | Review: compliance with the document, v22 rules, reuse of `libs/ui`, quality | Read-only |
| `security-reviewer` | Checks changes against the 5.8 table | Read-only |

### 8.2 Task flow

GitHub Projects statuses: **Backlog → Todo → In progress → In review → To release → Done** (To release from stage 2, 9.3).

1. `project-manager` creates issues from sections 3–7 (with acceptance criteria from section 4), status **Todo**.
2. The tech lead takes a task; `project-manager` moves it to **In progress**.
3. `architect` writes a short plan.
4. The relevant dev agent implements the task in a separate branch.
5. `test-engineer` writes tests; all checks must pass.
6. `code-reviewer` and `security-reviewer` review the changes; findings go back to the dev agent until they are resolved.
7. The tech lead opens a PR with a short description (what was done, how to verify); `project-manager` moves the task to **In review**.
8. The project author reviews and merges the PR. From stage 2 the PR targets `stage`, and after the merge the task moves to **To release**; the release PR `stage → main` closes it and it moves to **Done** (9.3). In stage 1 the merge moved it to **Done**.

**Parallel work.** Independent tasks run at the same time, each in its own git worktree (a separate working folder for its branch), so agents do not get in each other's way. `project-manager` marks dependencies between tasks (blocked by), and only unblocked tasks from different areas are taken in parallel (for example, the links API and `libs/ui` components). Design in Claude Design runs in parallel with stage 0. The more parallel tasks, the faster subscription limits are used up (9.6).

Detailed educational explanations are not written in PRs, except for the backlog task about own authentication (learning format).

**Resuming after a break** (limits or subscription ran out). Work state is kept not in the chat but in the repository and on the board:

- agents make small commits after every finished step and push the branch, so unfinished work is not lost;
- before a pause and at the end of a session, `project-manager` leaves a comment on the issue: "Done / Left / Next step";
- a new session starts from the GitHub Projects board, the tasks In progress and their last comment, and continues from the same point;
- this document is stored in the repository as `docs/PROJECT.md`, so the source of truth does not depend on the subscription;
- an interrupted Claude Code session can be continued with `claude --continue` (the last one) or `claude --resume` (pick from a list).

### 8.3 CLAUDE.md

- **Root `CLAUDE.md`:** project essence, stack, monorepo structure, commands (run, tests, lint), the task flow from 8.2, a link to this document.
- **`apps/web/CLAUDE.md`:** Angular 22 rules (from the official Angular AI config + our own: Signal Forms, `@Service()`, zoneless, new control flow, only `libs/ui` components).
- **`apps/api/CLAUDE.md`:** NestJS and Prisma rules, filtering by `userId`, error format.
- **`libs/ui/CLAUDE.md`:** component rules from 7.4.

**Architecture decision log (`docs/adr/`).** Every significant decision is a short `NNNN-title.md` file: context, decision, alternatives, consequences. Written by `architect` when planning a task that changes the architecture; the first entries cover the decisions in this document (Nx, Angular 22 + SignalStore, NestJS, PostgreSQL on Neon, Better Auth, Vercel, own UI library). Index: `docs/adr/README.md`.

**Task work cycle.** A goal from the author → `project-manager` creates issues in GitHub Projects and moves statuses → `architect` extends the contract in `libs/shared/contracts` (and an ADR if the decision is significant) → `backend-dev`, `ui-dev`, `frontend-dev` work in separate branches (git worktree), on Claude Max no more than 4 in parallel → `test-engineer` (80% coverage) → `code-reviewer` and `security-reviewer` review the PR diff, findings go to the code author → the project author looks at the PR and the Vercel preview deployment and merges it personally → `project-manager` closes the issue.

**Blockers between roles.** Subagents do not talk to each other directly. If an agent needs something from another role, it finishes everything it can without it and returns a report to the tech lead: what is done and what blocks it. The tech lead routes the question: data format or API → `architect` extends the contract; work on the other side → `frontend-dev`/`backend-dev` or an issue via `project-manager`; a product question → the author. Then the agent is restarted with the answer. To keep blockers rare: contract-first, the contract is written before the code, and the frontend works on mocks from the contract until the backend is ready. Direct messaging between agents only in Agent Teams mode (below).

**Two modes: subagents and Agent Teams.** The goal is to work in both and compare.

- **Subagents (main mode).** All feature development: the tech lead launches roles in turn or 1–2 in parallel, agents report to it. Predictable, token-efficient, easy to resume after limits.
- **Agent Teams (experimental, enabled separately).** Each member is a separate session with its own pane; members message each other, share a common task list, and you can talk to any of them directly. Used selectively:
  - **Reviews of large PRs:** `code-reviewer`, `security-reviewer` and `test-engineer` review the PR simultaneously, challenge each other's conclusions and produce one combined review.
  - **1–2 "frontend + backend together" features** (for example, adding a link with a preview): `frontend-dev` and `backend-dev` write in parallel and agree on the contract in real time; `architect` records the result in `libs/shared/contracts`.
- **Limits.** Agent Teams use tokens several times faster: rare runs on Pro, regular ones on Max.
- **Outcome for the README and CV.** A short "Subagents vs Agent Teams" section: where each mode worked better, approximate usage, conclusions. CV line: "Orchestrated Claude Code subagents for feature delivery and Agent Teams for cross-checking reviews".

### 8.4 Skills

Skills are `.claude/skills/<name>/SKILL.md` folders.

| Skill | What it does |
| Angular Agent Skills (official) | Modern Angular context for agents |
| `angular-v22-rules` | Our own v22 rules on top of the official ones; what is forbidden (NgModules, `*ngIf`, Reactive Forms, `@Injectable`) |
| `create-ui-component` | Template for a new `libs/ui` component: variants via typed inputs, tokens, Storybook story, tests, a11y |
| `create-api-module` | Template for a NestJS module: controller, service, DTOs in `libs/shared/contracts`, `userId` filter, tests |
| `security-checklist` | The 5.8 table as a review checklist |
| `github-workflow` | How to create issues, change statuses in GitHub Projects, format branches, commits and PRs |

### 8.5 Hooks and permissions

| When | What happens |
| After a file edit (`PostToolUse`) | Prettier + ESLint on the changed file |
| Before a tool call (`PreToolUse`) | Blocks reading and editing `.env*` and dangerous commands (`rm -rf`, `git push --force`, `prisma migrate reset` on a non-local database) |
| Before finishing (`Stop`) | Typecheck and tests of affected projects (`nx affected`); on failure the agent keeps working |
| Before a commit | Scan for secrets in the changes |

`.claude/settings.json` has `deny` rules for `.env*` and secrets.

### 8.6 MCP servers

- **Angular CLI MCP**: Angular generation and documentation;
- **GitHub MCP** (or `gh` CLI): issues, GitHub Projects, PRs;
- **Playwright MCP**: checking the interface in the browser and comparing with mockups;
- **Nx MCP**: monorepo structure and affected projects (if available).

## 9. Development process

Stage 1 is 8 stages (GitHub milestones), roughly 8–9 weeks at \~3 hours a day; with a buffer, 2–2.5 months.

### 9.1 Stages

| # | Stage | Contents | Estimate |
| 0 | Foundation | Nx monorepo, CI, Vercel, Neon, GitHub Projects, CLAUDE.md, agents, skills, hooks | 4–5 days |
| 1 | Design system | Mockups in Claude Design, tokens, `libs/ui` + Storybook | \~2 weeks |
| 2 | Authorisation | Google / GitHub, API protection, data isolation | 3–4 days |
| 3 | Links | Adding with preview (SSRF protection), duplicates, editing, deleting, favorites | \~1 week |
| 4 | Folders and tags | Nested folders, deletion with a choice, tags with autocomplete | \~1 week |
| 5 | Search and feed | Search, sorting, cards / list, "Recently opened", breadcrumbs | \~1 week |
| 6 | Polish | Mobile version, dark theme, empty states, accessibility | \~1 week |
| 7 | Release | 5.8 check, account deletion, privacy policy, README, Storybook online | 3–4 days |

**Stage 0 clarification:** stage 0 creates only the Neon project; Prisma, local PGlite (instead of Docker, ADR 0025) and migrations in CI move to stage 2 together with the Better Auth schema.

The estimate assumes the bottleneck is PR review and fixes, not writing code. Hitting Claude subscription limits (see 9.6) can stretch the timeline.

**Optional in stage 7 (or after stage 1):** interface translations into Ukrainian + a language switcher in settings; \~2–3 days, since all text goes through keys from the start.

**Added to the plan:** PWA and "Share" in stage 6 (\~2 days); landing, Try demo, export, Sentry in stage 7 (\~4 days). Total stage 1 estimate: 9–10 weeks.

### 9.2 Connecting services

**Done by Claude Code** (via `gh`): repository, GitHub Projects board with the statuses from 8.2, milestones, labels, issues; GitHub Actions workflows; `vercel.json` and other deployment configuration in the repo; `.env.example` templates.

**Vercel and Neon CLIs:** agents never use them for anything that touches secrets (`vercel env`, `pull`, `dev`, `api`; Neon `connection-string`, `projects create`, `branches create`, `roles`, `init`; secret-revealing flags), and the guard hook plus the permission deny list block these commands (ADR 0019). Linking the repository to Vercel, the Neon integration, branches and environment variables are done by the author in the dashboards. Agents verify deployments through GitHub deployment statuses (`gh pr checks`).

**Done manually by the project author** (following step-by-step instructions from Claude Code):

- GitHub, Vercel, Neon accounts;
- CLI sign-in (`gh auth login` with Projects access; the Vercel and Neon CLIs are optional and only for the author);
- OAuth apps in Google Cloud Console and GitHub;
- entering secrets into environment variables; Claude Code never sees secrets (see 8.5).

### 9.3 Git and branches

**From stage 2 on (decided by the author on Nov 9–10, 2026; set up as the first task of stage 2, recorded in an ADR):**

- `main` is **production**. It changes only through a **release PR** `stage → main` at the end of a stage (for example "Release: stage 2"), merged with a merge commit so the release keeps its history. The release PR lists `Closes #…` for every issue of the stage. No feature PRs go into `main`.
- `stage` is the **integration branch** of the current stage. It has the same protection and required checks as `main`. Feature branches start **from `stage`** (`feat/<issue>-short`, `fix/…`) and their PRs target `stage` (squash). Branching from `main` and merging into `stage` is avoided on purpose: the branch would not see what is already in `stage`, and tests would run on code that differs from what lands there.
- **No staging environment for now** (the author's choice): the stage is checked locally (`npm start`; on a real phone, `npm start -- --host 0.0.0.0` and the Mac's address on the same Wi-Fi). Nothing changes in Vercel or Neon: branch deployments stay off in `vercel.json`, production builds only from `main`, so production and its database migrations change only with a release. A staging URL can be switched on later with one line in `vercel.json` (allow the `stage` branch); the Neon integration then creates its database branch, and OAuth on that URL needs the callback set-up from ADR 0026 (the demo works without it). Worth it to test on a real phone without the local network, to share a stage by link, or to try database migrations in the cloud before a release.
- **Board:** a **To release** column between In review and Done. `Closes #N` only acts on merges into the default branch, so an issue stays open when its PR merges into `stage`: the board workflow "Pull request merged" moves the card to To release. The release PR closes the issues, and "Item closed" moves them to Done.
- **Hotfix** for production: a branch from `main`, a PR into `main`, then `main` is merged back into `stage`.
- **Setup checklist** ([ADR 0035](adr/0035-stage-integration-branch-release-flow.md)):
  - [ ] the author: the `stage` ruleset (required checks, PR only); allow a merge commit for the release PR into `main`; the To release column and the board workflows;
  - [x] the agents: create `stage` from `main` (Nov 10, 2026); CI on PRs into `stage` (#219); `CLAUDE.md`, the `github-workflow` skill, the agents' instructions, the PR template, Dependabot and the guard hook say "branch from `stage`, PR into `stage`" (#260).

**Stage 1 (until the switch):**

- `main` is protected: changes only via PR, green CI checks are required. Required approvals: 0, because PRs are created from the author's account, and GitHub does not allow approving your own PR, so the author's approval is the merge. Squash merge only.
- One branch per task: `feat/<issue-number>-short`, `fix/…`; the PR closes the issue (`Closes #N`).
- Commits follow Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`).

### 9.4 Testing

| Level | Tool | Requirement |
| Unit | Vitest | Coverage ≥ 80% for `apps/api` and `libs/ui` |
| Components | Storybook | A story for every variant and both themes |
| E2E | Playwright | Key scenarios: sign-in, adding a link, folders, search, account deletion; phone and desktop |
| Security | API tests | Data isolation (A cannot see B), SSRF protection, validation |

Stage 0 E2E: Chromium only, see ADR 0008. Test layers, the e2e tags and the removal rule: ADR 0043.

### 9.5 CI/CD

- **On every PR** (GitHub Actions, only affected projects via `nx affected`): lint, typecheck, unit tests with a coverage threshold, build, `npm audit`, CodeQL; Vercel creates a preview version.
- **Browser tests on a PR into `stage`** (the required `e2e` check): only what the diff touches, so the check takes minutes, not twenty (`tools/ci/pr-browser-tests.sh`, decided Nov 11, 2026). Playwright runs a smoke set (smoke, sign-in, add-link, links-feed), the specs of each changed feature, the specs the diff changes and, for app-wide code, `mobile` and `api-error-toasts`; a change to the dependencies (`package.json` / `package-lock.json`, e.g. Dependabot) adds `a11y-app`, `mobile` and `csp` (decided Nov 11, 2026, #309); a change to the Playwright config runs every spec. The Storybook axe run checks only the stories of the changed `libs/ui` components, or all of them when the shared styles or the Storybook setup change. Every e2e spec and every story still runs on the push to `stage` after the merge and on the release PR into `main`, so a regression a PR skipped shows up on `stage` before any release. That full run is sharded (#313, #349): the `e2e-web` matrix runs web-e2e in three Playwright shards (`--shard=N/3`, five until the phase 3 cut of #349) and the `e2e-storybook` matrix the Storybook axe run in three (`--shard=N/3`), side by side, each with a 30-minute limit. The web shards do not build the app (#362): the `web-build` job builds the `e2e` bundle once and uploads it as the `web-e2e-build` artifact; the shards and `lighthouse` start at the same time, do their own setup, wait for the artifact (`tools/ci/wait-for-artifact.sh`) and serve it as it is (`E2E_PREBUILT=true` runs `web:serve-prebuilt`; Lighthouse runs `tools/lighthouse/run.mjs` on it). Every browser job caches the Playwright Chromium download per Playwright version (`tools/ci/install-chromium.sh` keeps the browser-only fallback for the Ubuntu mirrors); every job restores the npm cache. The required `e2e` job waits for `web-build` and the shards, fails when any of them failed or was cancelled, passes when they passed or had nothing to run, lists the web-e2e tests that passed only on a retry in its job summary (`apps/web-e2e/reporters/flaky.reporter.ts`, `tools/ci/flaky-summary.mjs`; flakes fail nothing), and on a failure merges the web shards' blob reports into one `playwright-report` artifact (`npx playwright merge-reports`). A PR into `stage` runs the diff-based set sharded the same way (`PR_SHARD` / `PR_SHARDS`), so a PR that runs every spec (a Playwright config change) or every story never lands on one runner. The ui axe part finds the changed components under the ADR 0042 layout (`libs/ui/src/lib/<kind>/<name>/`).
- **Which e2e tests run where** (ADR 0043, #349): `desktop` runs every web-e2e test; `tablet` runs only the tests tagged `@mobile` or `@tablet`, `phone` only `@mobile` or `@phone` (Playwright tags from `E2E_TAG`, selected by each project's `grep`). `@phone` marks paths that exist only in the mobile shell or with touch, plus one core journey per feature whose UI differs there; `@mobile` marks the shell tests where the tablet layout matters too; a test that sets its own viewport is not tagged. CI retries a failed test once (`retries: 1`). An e2e test is removed only when a lower-level spec covers the same behaviour. After the phase 3 cut (#349) e2e holds the journeys, the browser-only checks and the axe scans of the key screens: 351 desktop tests listed (about 260 run, the rest are touch-only and skip themselves), 39 tablet, 128 phone; the full run takes about 3 minutes on 4 workers (was 663 / 39 / 128).
- **`lint-test-build`** (required) is an aggregate of parallel jobs (#349): `static` (format, stylelint, install scripts, node tests, icon sprite, `nx affected -t lint`), `build` (`nx affected -t typecheck build`, the migration check against Postgres, `middleware-shell`, `check-bundle`, `build-storybook`) and the `unit` matrix (`tools/ci/affected-unit-tests.sh`: the API suite in two Vitest shards, the web app, the other libraries; each only when affected). The aggregate job merges the API shards' blob reports (`vitest --merge-reports`) and checks the API coverage thresholds on the whole suite; `libs/ui` checks its own thresholds in its unit entry, and the web entry runs `web:test:coverage` with the `apps/web` thresholds (statements 88, branches 83, functions 83, lines 89; #362). Target: every required check in about 4 minutes.
- **Merge to `stage`** (from stage 2) → CI only, with the full browser suites; no deployment while there is no staging environment (9.3).
- **Merge to `main`** (a release, from stage 2; every merge in stage 1) → automatic deployment to Vercel production; Prisma migrations are applied to the production Neon database by the Vercel build (`prisma migrate deploy`, ADR 0025); every PR checks the migrations against a Postgres service (`scripts/db-check.mjs`; `nx run api:db-check` is the local PGlite equivalent).

### 9.6 Claude subscription

Claude Code is included in Pro ($20/month) and Max ($100 / $200 per month); limits are shared between chat and Claude Code. Plan: start with Pro and watch usage (`/usage`); if limits run out several times a week, Max 5x for the months of active development. Savings: reviewers on a lighter model, `architect` only for large tasks.

Source: [Using Claude Code with your Pro or Max plan](https://support.claude.com/en/articles/11145838).

## Monetisation

Discussed after stage 1 (roadmap, stage 5): pricing tiers, free plan limits, payment provider. The options noted on Nov 14, 2026 are in "Ideas to discuss (not planned)". Stage 1 only lays the groundwork: all data has an owner (`userId`), so per-tier limits can be introduced without reworking the model.

## Roadmap after stage 1

Chosen by the author on Nov 9, 2026; stage 3 re-planned on Nov 14, 2026 (only side-by-side) ("Roadmap after stage 2" below). Everything else stays in the backlog. Order inside a stage is decided when the stage starts.

### Stage 2 (released to production Nov 14, 2026, #378)

- [x] **First:** release flow with the `stage` integration branch (9.3): ADR, `stage` branch and ruleset, CI, To release column and board workflows, agent instructions; no staging environment for now
- [x] **Second: redesign** (before the features below). An updated design rather than a new one: more convenient blocks and layouts on the existing design system. The author provides the new mockups in Claude Design, and they already include the screens of the stage 2 features, so those are built on the new design. Steps: update `docs/design` (screens, components, tokens if they change), then bring `libs/ui` and the existing screens up to it, keeping a11y, both themes, the phone and the e2e and Storybook suites green. Started Nov 10, 2026 with the "Shelfmark 2027 Refresh" design; plan and decisions in `docs/design/MIGRATION.md`
- [x] Trash: deleted links and folders go to Trash and are kept for a period set in settings; restore and delete forever (screens `TrashView`, `MobileTrash`). Added by the author on Nov 10, 2026 with the redesign, built after the redesign and the author's review of it
- [x] Folder colours and icons, pinned folders and links (screen `FolderStyle`, story 25; API in #263, web on `feat/263-folder-style-web`). Added Nov 10, 2026, built after the redesign and the author's review of it
- [x] Saved views: chips above the feed with saved filters (All, Videos, Articles, To read, "Save this view"), the link kind and the kind chips on Recently opened (story 26, ADR 0038; #264 on `feat/264-saved-views`, stacked on #263). Added Nov 10, 2026, built after the redesign and the author's review of it
- [x] Paste several links at once (screen `PasteMany`). Added Nov 10, 2026, built after the redesign and the author's review of it
- [x] Recently opened extras from the 2027 design (screen `RecentView`): "Pause history" (a setting that stops recording opens, needs an API field), filter chips and a search inside the history page, swipe actions on phone history rows. Added Nov 10, 2026 by the author's decision: large items go to stage 2
- [x] Sharing: open a collection (folder) to other people by a public link (on / off, reset, show notes). Invites by email and roles are in the backlog (decided Nov 10, 2026)
- [x] Settings › Library in full (screen `SetLibrary`): default view, sort, open links in, folder counts, where new links go, duplicate warning, fetching previews, keeping the query part; at the end of stage 2 (decided Nov 10, 2026)
- [x] Appearance extras (screen `Themes`): text size, readable font, density, card preview image, sidebar options; at the end of stage 2 (decided Nov 10, 2026; the Custom theme and the Animations setting are in the custom theme task)
- [x] Custom themes: accent colour, background and corners in settings, by replacing token values (#273)
- [x] Feedback and suggestions at any time: a "Send feedback" item in the account menu → a form (type: idea, bug, other; text; optional screenshot), a feedback list for the author and statuses ("accepted", "done"); on the same `Feedback` table as the app rating (story 24). **Design is needed before development** in Claude Design: the form (desktop and phone), "sending / sent / error" states, screenshot attachment, the list with statuses and the account menu item
- [x] Drag & drop links into folders
- [x] Selection and bulk actions: checkboxes on cards and rows, select all, Shift-click range, keyboard (Space, ⌘A, Esc, M), long press on the phone; move, add / remove tags, favorite, open all, copy links, share (phone), delete with Undo through Trash (story 28, #267 on `feat/267-bulk-actions`). Export of the selection is not built
- [x] "Move to folder" in the ⋯ menu of a card and a row, alongside drag & drop
- [x] Sync between browser tabs: a change in one tab shows in the others (links, folders, tags, favorites, theme, sign-out), for example via `BroadcastChannel`
- [x] Interface languages: English, French, German, Italian, Spanish, Portuguese and "Match my browser", Settings › Language with date format, clock, week start and spell-check, a switcher in the landing footer (story 31, #274 on `feat/274-languages`); not Ukrainian for now
- [x] The landing page reachable for signed-in users (for example "About" in the account menu or `/about`); today `/` shows the app to them
- [x] Landing Lighthouse performance stable at ≥ 0.9 on 3 of 3 CI runs (#195, carried over from stage 1) Resolved by the 2027 redesign (#259).
- [ ] The two dev-only Dependabot alerts, minimatch and deepmerge (#205)
- [x] Promo video: a scripted Playwright run on the demo (landing → Open the demo → paste a link → preview → folder → tag → find it with ⌘K), recorded as video in light and dark themes, desktop and phone, and re-recorded with one command when the UI changes; light editing (captions, sped-up waits). Used in the README, on the landing page and in the portfolio. Re-record (#271): `npx nx run web-e2e:promo` (or `npm run promo`; needs a full ffmpeg with libx264, libvpx-vp9 and libwebp) runs `apps/web-e2e/promo` on the mock demo and writes `apps/web/public/media/how-it-works-<desktop|phone>.{mp4,webm,webp,vtt}` (#315: two recordings, desktop 1440 × 900 and phone 390 × 844, about two minutes over today's features); the step list holds the five chapter starts (0:00, 0:34, 0:52, 1:19, 1:39) and fails when one drifts; details in `apps/web-e2e/promo/README.md`
- [x] "How it works" button in the app that opens the promo video in a dialog (the video is served from our own domain, so the CSP is unchanged). Replaces the interactive guided tour, which moved to the backlog (decided Nov 9, 2026: same result for far less work). The dialog (#270) plays the #271 recording of the current theme and device; after a re-record the chapter times live in `HOW_IT_WORKS_CHAPTERS` and `PROMO_CHAPTER_START_MS`

### Stage 3 (planned)

Re-planned by the author on Nov 14, 2026, after the stage 2 release: only side-by-side. The spec is in "Roadmap after stage 2" below.

- [ ] Side-by-side: two feeds to move links between (#386)

### Backlog

Prepared on Nov 14, 2026, with issues, not scheduled (details in "Roadmap after stage 2"):

- [ ] Import links: browser bookmarks, Pocket, Raindrop.io, Shelfmark JSON backup (#387)
- [ ] Read / unread status and Read later (#396)
- [ ] AI: auto-tags and auto-folder, summaries, semantic (smart) search, "Ask your shelf", library clean-up, MCP server (#388, #389–#395; 5.6)
- [ ] Dead-link check with a Wayback Machine copy (#397)
- [ ] Rules without AI: domain → folder and / or tag (#398)
- [ ] Commands in ⌘K (#399)

Moved from stage 3 on Nov 14, 2026:

- [ ] Browser extension for saving links in one click
- [ ] Carrying data over from the demo sandbox into a real account on sign-in

Earlier:


- [ ] Email and password sign-in: email verification, password reset, an email sending service (#277; moved from stage 2 on Nov 10, 2026, needs a domain and an email provider first)
- [ ] Reminders: come back to a saved link later (#275; moved from stage 2 on Nov 10, 2026): "Remind me" with a date picker, the badge on cards, the Reminders list, delivery in the app, by Web Push (VAPID, an external scheduler, as Vercel Hobby crons run once a day) and by email, quiet hours, the weekly digest and `SetNotifications`
- [ ] Sharing with people: invites by email, roles (can view, can add links), "Shared with me", "Save to my shelf" (moved from stage 2 on Nov 10, 2026)

- [ ] Import of old links from Telegram "Saved Messages" (via Telegram Desktop export)
- [ ] Own authentication implementation (NestJS + Passport + JWT: access token + refresh token in an httpOnly cookie) instead of Better Auth. **Learning format:** Claude Code does not write the code but explains step by step and reviews what the author writes
- [ ] Subscriptions and monetisation (pricing tiers, free plan limits, payment provider)
- [ ] Move to paid hosting
- [ ] Interactive "How it works" guided tour (moved from stage 2; the promo video covers it for now): an animated cursor shows adding a link, folders and tags, search and export with captions, on an in-browser sandbox (never the user's data), steps calling the same store actions as real clicks, with Pause / Stop / chapters / Esc, a reduced-motion path and screen-reader text. Worth it only with many self-onboarding users who need a guided, localised walkthrough

## Roadmap after stage 2

Planned by the author on Nov 14, 2026, after stage 2 was released (#378). **Stage 3 is only side-by-side.** The other tasks have issues ready but stay in the backlog until the author schedules them; the numbers show the order they were discussed in. Each user-facing task is designed in `docs/design` first, and its user story with acceptance criteria is added to section 4 when it starts.

### Stage 3: side-by-side

1. **Side-by-side (#386).** Design first in `docs/design` (desktop layout, empty right half, picker, drag), then implementation, then the release.
   - Desktop only, from `80em`; on narrower screens the entry point is absent (via `ViewportService`).
   - Two feeds side by side; the sidebar stays.
   - Opening keeps the current feed on the **left** (same view, sort, selection). The **right** half opens a folder picker (the same as "Move to": search, tree, recent) with the empty hint "Choose a folder to move links into" until a folder is chosen.
   - Each half can be changed from a dropdown in its header; a "⇄" button swaps them.
   - Left: any feed (folder, Unsorted, Favorites, tag, search results). Right: only a folder or Unsorted (a real move target).
   - Drag one link or the selection into the other half (and back when the left is a folder or Unsorted), Undo in the toast; the bulk bar gets "Move to → <right folder>".
   - State in the URL (for example `?split=<folderId>`), so reload and Back work.
   - Equal halves for v1 (a draggable divider maybe later).
   - Reuses the existing drag and drop, selection, bulk bar, folder picker and Undo.

### Backlog with prepared issues

2. **Import links (#387):** browser bookmarks HTML, Pocket export (CSV / HTML with tags), Raindrop.io (CSV with collections and tags), Shelfmark JSON backup. The design exists (`docs/design/screens/Import.dc.html`): source → review (duplicates, folder, structure) → progress, summary, Undo import. Only export exists today (on the Account page, "Your data"). Fixes with it: Paste many says "Bigger lists go to Import as text", but that screen does not exist; `SendFeedback.dc.html` already promises import from the Pocket export. Why now: Pocket shut down in 2025 and its users (\~10M) are looking for an alternative.
3. **Read / unread status and Read later (#396):** postponed in stage 1; the core scenario for former Pocket users.
4. **AI (#388, sub-issues #389–#395):** auto-tags and auto-folder, short summaries, semantic search, "Ask your shelf", library clean-up, a Shelfmark MCP server; the rules from day one, models and costs are in 5.6.
5. **Dead-link check (#397)** and an offer of a Wayback Machine copy.
6. **Rules without AI (#398):** domain → folder and / or tag (for example youtube.com → Videos).
7. **Commands in ⌘K (#399):** not only search but actions (new folder, move selected, change theme).

The browser extension and carrying demo data into a real account, planned for stage 3 on Nov 9, 2026, moved to the backlog as well.

## Ideas to discuss (not planned)

Notes from the author's planning on Nov 14, 2026. Nothing here is a decision: no issues and no roadmap changes until the author decides; significant choices get an ADR then.

- **Licence.** There is no `LICENSE` file now, and `package.json` says `UNLICENSED`. Options: AGPL-3.0 (open source plus paid hosting, as Plausible and Linkwarden do); FSL / BSL (source-available, becomes open after 2 years); open core; closing the repository. Current leaning: keep the repository open and pick a licence before the launch. The choice cannot be undone for versions already released; outside pull requests would need a CLA. Later an ADR compares the options.
- **Launch plan.** Free at first, to test interest. Channels: Product Hunt, Reddit (Pocket alternatives, r/selfhosted, r/productivity), Show HN. Simple privacy-friendly analytics (week and month retention); check the free-tier infrastructure limits. Optional donations (Ko-fi, Buy Me a Coffee or GitHub Sponsors): check payouts to Ukraine; donations to a sole proprietor count as income.
- **Monetisation.** Markets: Europe and the US (Asia later, through regional pricing at the Merchant of Record). Main option: Free / Pro \~$40–50 per year / AI pack +\~$30–50 per year / Pro + AI bundle \~$80 per year. The AI pack with a trial and a fair-use chat limit; AI entitlements modelled on the account early. Benchmarks: Raindrop \~$28 per year, Linkwarden \~$48, mymind \~$80–155, Readwise \~$110–155. Estimate (assumes \~3% conversion): 10k registered users ≈ $500 per month; 10k paying users ≈ $26k per month.
- **Legal.** The author is a Ukrainian sole proprietor: check the IT activity code and tax group 3. Payments through a Merchant of Record (Paddle, Lemon Squeezy or Polar; check Ukraine support); Stripe does not work directly with Ukraine. The group 3 limit (\~10M UAH per year) is about 5,000 paying users. A foreign company only with serious revenue. GDPR documents and Terms in English.
- **Trademark.** For now only check that "Shelfmark" is free (TMview, WIPO, USPTO; classes 9 and 42) and secure the domain and social handles. Registration (EUIPO \~€850, USPTO \~$350 per class) once there is interest.
- **Save by email.** Forward a link to a personal address to save it.

## 10. Success metrics and roadmap after stage 1

Stage 1 is considered successful when all acceptance criteria are met, the app passes the technical thresholds below, and the author uses it for two weeks instead of Telegram "Saved Messages".

### 10.1 Stage 1 completion criteria

| Area | Criterion |
| Functionality | All 24 stories of section 4 (including "Onboarding") are done according to their acceptance criteria |
| Tests | Coverage ≥ 80% (`apps/api`, `libs/ui`); e2e of key scenarios pass on desktop and phone |
| Security | All 5.8 measures are in place; 0 critical and high vulnerabilities in `npm audit` and CodeQL |
| Interface quality | Lighthouse ≥ 90 for performance, accessibility and best practices on the main screen (the lab run serves the `e2e` build through `tools/lighthouse/serve.mjs` with brotli/gzip like Vercel; the plain file server sends raw bytes and overstates the load about 3x; the budget is unchanged) |
| Design | Screens match the Claude Design mockups in both themes and on phone |
| Usage | The author moves their links into the service and uses it every day for 2 weeks |

### 10.2 What we measure after launch

Vercel Analytics (no personal data): number of registered users; share of users returning after a week; average number of saved links per user; how often saved items are opened (by `lastOpenedAt`), the main indicator that the product solves the "I save it and never come back" problem.

### 10.3 Roadmap

Decided by the author on Nov 9, 2026, stage 3 re-planned on Nov 14, 2026 (only side-by-side); the full lists are in "Roadmap after stage 1" and "Roadmap after stage 2" above.

| Stage | Goal | Contents |
| 2 (released Nov 14, 2026) | Daily use and polish | Redesign (2027 Refresh), Trash, folder colours, icons and pinning, saved views, paste several links, email and password sign-in, reminders, sharing, custom themes, feedback form, drag & drop, selection and bulk actions, "Move to folder", sync between tabs, interface languages (not Ukrainian for now), landing for signed-in users, Lighthouse ≥ 0.9, dev Dependabot alerts, promo video with a "How it works" button that plays it |
| 3 | Sort faster | Side-by-side: two feeds to move links between (desktop) |
| Backlog | Later | Import (bookmarks, Pocket, Raindrop.io, JSON backup), read / unread and Read later, AI (tags and folders, summaries, semantic search, Ask your shelf, clean-up, MCP server), dead-link check with Wayback copies, rules without AI, commands in ⌘K, browser extension, demo data carried into a real account, import from Telegram, own authentication (learning format), subscriptions and monetisation, paid hosting, interactive guided tour |

## 11. Presentation in the CV and portfolio

Positioning: **a frontend engineer (Angular) who builds a complete full-stack product with a team of AI agents**. The main emphasis is the ability to organise AI-driven development and stay accountable for the result.

### 11.1 CV entry (English)

Figures in square brackets are filled in with real values after the release.

**Shelfmark — SaaS for organizing saved links** · Angular 22, NestJS, PostgreSQL, Nx, Claude Code · \[Live demo\] · \[GitHub\] · \[Storybook\]

- Built and shipped a full-stack SaaS for saving and organizing links (nested folders, tags, search, automatic link previews) with Angular 22 (signals, zoneless, Signal Forms, NgRx SignalStore) and NestJS + PostgreSQL in an Nx monorepo.
- Orchestrated a team of 8 specialized Claude Code subagents (architecture, frontend, UI library, backend, testing, code and security review, project management) with custom skills, hooks and MCP integrations; every change shipped through a PR with human review.
- Designed a custom design system in Claude Design and implemented it as an in-house component library (\[\~20\] accessible components on Angular Aria/CDK, design tokens, light/dark themes, responsive), documented in Storybook.
- Built security into the pipeline: SSRF-safe preview fetching, per-user data isolation tests, CSP, rate limiting, CodeQL and an automated security review on every PR.
- Set up CI/CD with GitHub Actions and Vercel (preview deployment and database branch per PR); \[X\]% test coverage, Lighthouse \[≥ 90\].

**Skills line:** AI-assisted development — Claude Code (subagents, skills, hooks, MCP), Claude Design.

### 11.2 What to show in the portfolio

- **A live link** to the app (with demo sign-in, or a video if sign-in is OAuth only).
- **A public repository** with a README: product essence, architecture diagram (section 5), description of the agent team (section 8), how to run it.
- **The `.claude/` folder** in the repository: agents, skills, hooks as a showcase of the approach.
- **Storybook** online: the `libs/ui` component catalogue.
- **The GitHub Projects board**: shows how tasks went through the agents.
- **A short video / GIF** (1–2 minutes) of the app in action.
- **An article or post** (LinkedIn, dev.to): "How I built a SaaS with a team of 8 Claude Code agents": what worked, where the agents made mistakes.

### 11.3 Interview preparation

- Keep a **development log**: decisions, agent mistakes and how they were caught, what had to be redone. This is the best material for answering "so what did you do yourself?".
- Be able to explain without prompts: why SignalStore, how the SSRF protection works, how user data is isolated, how the agents are coordinated and where human control sits.
- The own authentication from the backlog (learning format) is proof that you understand the deep parts of the stack yourself.
