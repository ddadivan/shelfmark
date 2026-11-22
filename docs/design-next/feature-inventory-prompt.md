# Prompt: feature inventory (step 1 of the redesign)

Copy everything below the line into a new session on the `ddadivan/shelfmark` repository.

---

You are working in the Shelfmark repo. Read `CLAUDE.md` first and follow its rules for git and secrets.

## Context

Shelfmark is getting a full redesign: not only how it looks, but how it works (flows, structure, where features live). The plan is in `docs/design-next/README.md` on the branch `ccr-64889676-li4al2` (`git fetch origin ccr-64889676-li4al2` and read it with `git show origin/ccr-64889676-li4al2:docs/design-next/README.md`). Your job is **step 1 only: the feature inventory, as is**.

## Goal

Write a complete, neutral description of everything the product does today, so that the next step (flow review and new structure) can redesign it without losing anything. Describe behaviour, do not judge it and do not propose changes. Where you notice something odd (a duplicate, an inconsistency, a doc that disagrees with the code), write it down in the "Observations" section at the end, as a fact, without a fix.

## Sources, in this order of trust

1. **The code** is the truth: `apps/web/src/app` (routes in `app.routes.ts` and `features/*/**.routes.ts`, pages, components, services, stores, mocks), `apps/extension`, `apps/api` (controllers and DTOs), `libs/shared/contracts`.
2. `docs/PROJECT.md` (scope, stories with acceptance criteria in section 4, data model and API in section 6), `apps/web/CLAUDE.md` (it describes many features in detail), `docs/ai/FEATURES.md` and `docs/ai/IMPLEMENTATION-*.md`.
3. `docs/design/screens/INDEX.md` and `docs/design/screens/*.dc.html` (mockups; may show things not built yet: mark them "designed, not built").
4. `apps/web/src/app/core/i18n/en.json`: every user-facing string; useful to find features and states you would otherwise miss.

When a doc and the code disagree, describe the code and add the disagreement to Observations. Optionally run the app on its mocks (`npm ci`, `npm start`, Node 26; `/demo` opens a demo account) to confirm behaviour; do not create or read `.env` files.

The repo is large: use parallel Explore agents per area (library and links, organise, search and AI, capture and import/export, settings and account, extension, public pages and onboarding), then merge their results yourself and check the merged list against the routes and `en.json` so nothing is missing.

## Output

One file, `docs/design-next/features.md`, in English. Structure:

1. **Surfaces**: web app (desktop from 64em, tablet 40–64em, phone below 40em), browser extension popup, public pages (landing, sign-in, shared collections `/c/`, changelog, about, privacy), anything API-only (MCP, export). One line each with how it is reached.
2. **Route map**: a table of every route: path, page, guard / who can see it, desktop vs phone difference.
3. **Feature catalogue**, grouped by where the feature lives today (sidebar section, page, dialog, menu). For each feature use this template:

   ```
   ### <ID> <Feature name>
   - What it does: <one or two sentences, from the user's side>
   - Entry points: <buttons, menu items, context menus, shortcuts, drag and drop, long press, swipe, URL>
   - Screens / routes: <where it shows>
   - Platforms: <desktop / tablet / phone / extension, and how they differ>
   - States: <empty, loading, error, offline, AI off, limit reached, demo, guest, first run>
   - Data: <entities and fields read or written; API endpoints>
   - Settings that change it: <setting names>
   - Feedback: <toasts, undo, confirmations, live announcements>
   - Limits: <counts, quotas, plan tiers>
   - Related: <other feature IDs>
   - Source: <main files>
   ```

   IDs are short and stable (`LIB-01`, `CAP-03`, `ORG-05`, ...).

4. **Screen catalogue**: every page, dialog, sheet, drawer, menu, popover and panel, with its full contents, so a designer could rebuild it without opening the app:

   ```
   ### <SCR-ID> <Screen name>
   - Route / how it opens: <URL, or the control that opens it>
   - Platforms: <desktop / tablet / phone / extension; what changes on each>
   - Regions: <top to bottom, left to right: header, toolbar, list, footer, ...>
   - Shown information: <every piece of data on the screen and on each repeated item; e.g. a link card: preview, title, domain, favicon, date, tags, folder, summary, note, star>
   - Controls: <every button, link, menu item, toggle, tab, chip; for each: label (or icon + accessible name), what it does, enabled or hidden when, shortcut>
   - Form fields: <for each field: label, type (text, url, select, tags, switch, ...), required or optional, default, placeholder or hint, limits (length, count, format), validation messages, when it is disabled or hidden>
   - Primary action: <the main action and what happens after it: navigation, toast, undo, close>
   - States: <empty, loading, error, offline, AI off, limit reached, demo, read-only; the exact copy of each>
   - Features: <feature IDs from the catalogue>
   - Source: <main files>
   ```

   For menus (card menu, folder menu, account menu, bulk bar, ...), list every item in order with its condition. For each action that changes data, note: confirmation (with its copy), undo, toast, optimistic or not.

5. **Cross-cutting lists** (tables): all settings with their options and defaults; all keyboard shortcuts; all toasts; all empty states; all error messages and recovery actions; all confirmation dialogs; all limits and quotas; AI features with their modes and tiers; appearance options (themes, density, text size, fonts, card options); languages.
6. **Observations**: duplicates, inconsistencies, dead ends, features reachable from only one platform, doc vs code disagreements, "designed, not built" items. Facts only, no fixes.
7. **Counts**: number of features, screens, routes, dialogs, form fields, settings, shortcuts.

## Rules

- Do not change application code, docs other than the new file, or `docs/design-next/README.md`.
- Describe what the user sees and does, in plain words; names of components and files go in "Source" only.
- Be complete rather than short: a missed feature, button or field is worse than a long file. If one file gets too large to work with, split it into `features.md` (catalogue, cross-cutting lists, observations) and `screens.md` (screen catalogue), both in `docs/design-next/`.
- Commit `features.md` on your session's branch with a Conventional Commit (`docs(design): feature inventory`) and push it. Never commit to `main` or `stage`, and do not open a pull request unless asked.
- At the end, report the file path, the counts, and the five most important observations.
