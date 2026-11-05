# Shelfmark — project document

Nov 2, 2026 · @Dmytro

## Status

Updated as work goes on — every session resumes from here.

- [x] Project document: sections 1–11 and backlog; landing, Try demo, PWA and Share target, export, Sentry, ADR log added
- [x] [Shelfmark design system](https://claude.ai/artifact/BQrxb4RyTEo89FzAwgRFv7): tokens, font, spacing, radii, motion, brand book, cover, 23 components, logo, illustrations
- [x] [Screen mockups](https://claude.ai/artifact/8vqtkwVg3JcrKZFQoe9Cs9) — 22 artboards incl. landing (desktop and phone), demo-mode banner, Share quick form, export menu, tooltips
- [x] Author review of mockups and document, fixes
- [ ] Stage 0 "Foundation" (9.1)
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
  - [ ] CodeQL default setup and the `main` ruleset — applied with `gh` right after the CI PR is merged (ADR 0018)
  - [ ] **Next — deploy**: Vercel (web static + API function, CSP header, `NODE_ENV=production`) and Neon, after the manual steps in `docs/SETUP.md`
  - Open decisions for the author: Vercel project name / domain (`shelfmark.vercel.app` is taken); the author creates the Neon project in the console (connection strings never reach an agent)
- [ ] Motion in code — stage 6; promo video — after the stage 1 release

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
- search by title;
- a common feed of all links.

**"Recently opened" panel.** On the right, a feed of the most recently opened links. The panel is optional: it can be hidden.

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

- search by title;
- a common feed of all links;
- view toggle: cards with previews / list;
- a right-hand "Recently opened" panel that can be hidden.

**For the portfolio and convenience (also stage 1):**

- a landing page before sign-in: what it is, screenshots, "Try demo" and sign-in;
- **Try demo**: sign in without an account into a personal sandbox with ready-made links, folders and tags; the sandbox is deleted after 24 hours;
- **PWA**: install on phone and desktop; on Android, Shelfmark appears in the "Share" menu (Web Share Target), so a link is saved in one tap from any app, including Telegram;
- **data export**: JSON and an HTML bookmarks file (opens in any browser).

**Not in stage 1:** "read / unread" status, archive, import from Telegram, browser extension, sharing, AI features, subscriptions. Everything postponed is in the "Backlog: after stage 1" section.

## 4. User stories and requirements

24 stories in 7 groups; acceptance criteria under each one are used to verify completion. Numbers 1–18 and 20–24 plus the unnumbered "Onboarding"; number 19 is not used, so references to stories do not shift.

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
- Settings have "Show onboarding again".

### Adding a link

3. **Add a link.** As a user, I want to paste a URL and save it.
   - An invalid URL is not saved; an error is shown.
   - Folder, tags and note can be set right away; all three fields are optional.
   - If a folder is open, it is pre-filled in the form by default.
4. **Automatic preview.** As a user, I want the title, site icon and preview image to be fetched automatically.
   - After pasting a URL the fields are filled automatically; the user can change them.
   - If the preview could not be fetched (site unavailable, error), the link is saved with the URL instead of the title and a placeholder icon.
5. **Duplicates.** As a user, I want to know that I already saved this link.
   - When the URL matches, a warning "Already saved in folder X" is shown with a link to it.
   - The user can open the existing one or save anyway.

### Working with a link

6. **Open.** A click opens the link in a new tab and updates the "Recently opened" panel.
7. **Edit.** URL, title, note, tags and folder can be changed.
8. **Delete.** Deletion requires confirmation.
9. **Favorites.** As a user, I want to mark important links.
   - Add to favorites or remove from them in one click.
   - The "Favorites" section shows all marked links.

### Folders and tags

10. **Nested folders.** As a user, I want to organise links into folders of any depth.
    - Create, rename, move a folder (including into another folder).
    - A folder cannot be moved into itself or into its own subfolder.
11. **Deleting a folder.** When deleting a folder that contains links, the user chooses: delete everything together or move the links to "Unsorted".
12. **Links without a folder.** A folder is optional: links without a folder go to the "Unsorted" section and to the common feed.
13. **Tags.** As a user, I want to tag links and filter by tags.
    - Several tags per link; autocomplete from existing tags.
    - Clicking a tag shows all links with it.

      Custom tags are created in two ways: in the tags field of the link form (type a new name → the last suggestion row "Create tag “…”", Enter or comma) and with the "+" button next to the "Tags" section in the sidebar (inline field, empty tag). Name up to 50 characters, spaces are replaced with hyphens, unique case-insensitively.

      A tag has a menu (right click, long press or "…"): show links, rename in place (offers to merge if the name matches), merge with another, delete (confirmation with the link count, the links themselves remain; Undo 8 s). The sidebar shows the 8 most used tags and "+ N more". Screen "Tags: create, rename, delete".

### Search and browsing

14. **Common feed.** The "All links" section shows all of the user's links.
15. **Search.** Search by title finds links in all folders.
16. **Sorting.** By date added (newest first, the default) and by title.
17. **View.** A "cards / list" toggle; the choice is remembered.
18. **Recently opened.** A panel of recently opened links on the right; it can be hidden, and the state is remembered.

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

### Navigation (left sidebar)

- All links · Unsorted · Favorites · folder tree · tag list.

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
- **One type per file.** Every interface, type, enum and array-of-objects constant lives in its own file, named as the kebab-case export plus a suffix: `link-preview.interface.ts`, `theme-preference.type.ts`, `link-sort.enum.ts`, `default-folders.const.ts`.
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
  - `UiStore`: "cards / list" view, visibility of the "Recently opened" panel; persisted in `localStorage`.
- **Classic NgRx Store is not used**: it is overkill for this app.
- **UI:** own component library `libs/ui` on SCSS and design tokens, behaviour from Angular Aria / CDK; Tailwind and Angular Material are not used (section 7).
- **Rules for Claude Code:** the official Angular AI config (`ng generate ai-config --tool=claude`), the official Angular Agent Skills and Angular MCP + our own v22 rules; details in section 8.

CSR without SSR, zoneless, Transloco, strict-CSP build: ADR 0005; state: ADR 0009; UI library: ADR 0014; `rem`/`em` units: ADR 0015.

**Routes (Angular Router).** Every feature is lazy-loaded (`loadComponent`). Router: `provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }), withPreloading(PreloadAllModules), withRouterConfig({ paramsInheritanceStrategy: 'always' }))`, so path params, query and `data` reach components as `input()`.

| URL | Screen | Access | Feature (lazy) |
| --- | --- | --- | --- |
| `/` | Landing | guest | `features/landing` |
| `/` → `/links` | All links | signed in | `features/library` |
| `/unsorted` | No folder | signed in | `features/library` |
| `/favorites` | Favorites | signed in | `features/library` |
| `/folders/:folderId` | Folder; nesting is shown in breadcrumbs, not in the URL | signed in | `features/library` |
| `/settings` | Settings: account, theme, language, deletion | signed in | `features/settings` |
| `/share?url=&title=&text=` | Quick save from "Share" | signed in; guest goes to sign-in and back | `features/share` |
| `/sign-in?returnUrl=&reason=` | Sign in with Google / GitHub | guest only | `features/auth` |
| `/demo` | Creates a demo sandbox and goes to `/links` | everyone | `features/auth` |
| `/privacy` | Privacy policy | everyone | `features/legal` |
| `**` | 404 with an illustration | everyone | `features/not-found` |

**Tree structure.** Two empty-path routes are told apart by `canMatch`: for a guest `/` shows the landing, for a signed-in user `AppShell` (header, sidebar, "Recently opened" panel) with child routes. No flickering redirects.

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
    { path: 'settings', loadComponent: () => import('./features/settings/settings.page'),
      canDeactivate: [unsavedChanges], title: 'Settings' },
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

**State in the URL.** Everything that can be shared or must survive "Back" lives in the query: `?tag=angular&tag=video` (several tags, AND logic), `?sort=newest|oldest|title`, `?q=` (full result list; the search itself is the ⌘K overlay, "Show all" leads to `/links?q=…`). The "cards / list" view and the "Recently opened" panel are personal settings in `UiStore` + `localStorage`, not in the URL.

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

**Navigation shortcuts:** `G` then `A` for all links, `G` `U` for no folder, `G` `F` for favorites, `G` `S` for settings, ⌘K for search from anywhere (full list in the "Tooltips and keyboard shortcuts" section).

**Frontend structure:** `apps/web/src/app/` → `app.routes.ts`, `app.config.ts`, `shell/` (AppShell, Header, Sidebar, RecentPanel), `core/` (guards, interceptors, `AuthStore`, `TitleStrategy`, `DialogService`), `features/{landing,auth,library,settings,share,legal,not-found}/`, `stores/` (Links, Folders, Tags, Ui).

**Icons: Shelfmark's own set, SVG sprite.** 44 icons are drawn for the product (24 px grid, 1.75 px stroke, corner radii like the cards, the bookmark motif from the logo) and live in the design system (Assets › Icons) as separate files and one `sprite.svg` (`<symbol id="sm-…">`). The sprite goes into `libs/ui/assets/icons/`; the `ui-icon` component renders `<svg><use href="…/sprite.svg#sm-name"/></svg>`, colour via `currentColor`, size via the `size` input, `name` is typed as a union of the 44 names. No third-party icon sets. Illustrations (8 scenes) are also files in the design system (Assets › Illustrations), colours via CSS variables, embedded inline through `ui-illustration`.

**HTTP interceptors** (functional `HttpInterceptorFn`, registered via `provideHttpClient(withInterceptors([...]))`, order matters):

1. `apiBaseInterceptor`: `/api` prefix, `withCredentials: true` (session cookie).
2. `requestIdInterceptor`: `X-Request-Id` header to link a frontend error to the backend log.
3. `retryInterceptor`: retry only for `GET` on a network error or 502–504: up to 2 times with a 0.5 → 1.5 s delay.
4. `loadingInterceptor`: counter of active requests → a thin loading bar under the header with a 300 ms delay and a 400 ms minimum (except background requests with an `HttpContext` flag).
5. `errorInterceptor`: unified error handling: 401 → sign-out and the sign-in screen; 403/404 → "not found"; 409 / 422 → the error goes back to the form (fields are highlighted); 429 → "Too many requests" toast; 5xx and no network → a toast with "Retry" and an offline banner. Errors handled by the component itself are marked with an `HttpContext` flag and skipped by the interceptor.
6. `devLoggingInterceptor`: dev only: time and status of each request to the console.

Unexpected errors outside HTTP are caught by the global `ErrorHandler` (toast + log entry).

**Language and translations.** The primary interface language is **English**. All interface text goes through translation keys from day one (Transloco, runtime switching without a rebuild), with no strings hard-coded in templates; this is a rule in `apps/web/CLAUDE.md` and a review check. The translations themselves (Ukrainian) and the language switcher come at the end of stage 1 (stage 7) or after it.

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
| Search by title | Built-in PostgreSQL search (`pg_trgm` / full-text search) |
| Duplicate links | Index on the "user + URL" pair |
| Schema migrations | Prisma Migrate |
| Local development | PostgreSQL in Docker |
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

Stage 1: manual adding in the web interface only (a form with a URL field). A browser extension and import from Telegram are in the backlog. The API is designed so they can be plugged in later without rework.

### 5.6 AI features

Not part of stage 1. Auto-tags, short descriptions and smart search are discussed after stage 1 (see "Backlog").

### 5.7 Infrastructure and deployment

Stage 1 runs for free on **Vercel (Hobby) + Neon** and is available at a public link; code, tasks and CI are on GitHub.

| Component | Service | Details |
| --- | --- | --- |
| Code, tasks | GitHub | Public repository, GitHub Projects |
| CI | GitHub Actions | Lint, tests, build on every PR |
| Frontend + API | Vercel (Hobby) | Angular as static files; NestJS as one Vercel Function (zero-config). One `*.vercel.app` domain, so session cookies work without cross-domain issues |
| Database | Neon (Free) | PostgreSQL, free with no time limit; 100 CU-hours per project per month |
| Deployment | Vercel ↔ GitHub | Push to `main` → production; every PR → preview version |

**Additionally:**

- **Vercel Cron** (free on Hobby): daily cleanup of expired demo sandboxes;
- **Sentry** (free tier): frontend and backend errors with `requestId`, without personal data or link contents;
- **PWA**: `@angular/pwa`: a manifest with an icon from the logo, a service worker for the app shell, `share_target` in the manifest.

**Environments:**

- **local**: PostgreSQL in Docker, `.env` only locally;
- **preview**: Vercel preview deployment + a separate Neon database branch (not production);
- **production**: `main` → Vercel + the main Neon branch.

**Limitations and plan B:** Hobby is for non-commercial use only; function ≤ 250 MB. When moving to a commercial product: migrate to Google Cloud Run or paid Render without changing the NestJS code. The exact Nx monorepo configuration for Vercel (rewrites `/api` → function) is worked out at the deployment stage.

Sources: [NestJS on Vercel](https://vercel.com/docs/frameworks/backend/nestjs), [Neon Free limits](https://neon.com/faqs/free-plan-limits-and-quotas).

### 5.8 Security

Security is a mandatory requirement, not a wish: a task is not done until the items below that apply to it are met.

| Risk | Mandatory measures |
| --- | --- |
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
| **Test data** | Preview deployments run on a separate Neon database branch, not on production |

**Security when working with Claude Code** (details in section 8): reading and editing `.env` is denied in the permission settings; a hook blocks committing secrets; the **security-reviewer** subagent checks every PR against this table.

**Logging and monitoring** (stage 1 minimum): structured API logs without personal data or secrets; Vercel logs and analytics; a global error handler in NestJS and Angular.

**Demo and export:** demo creation has a strict per-IP limit (for example, 5 per hour) and a captcha on suspicious activity; demo users are isolated the same way as regular ones; demo sandbox limits (no more than 100 links); export returns only the current session's data and is also rate-limited.

## 6. Data model and API

Five own tables (`Feedback`, `Folder`, `Link`, `Tag`, `LinkTag` + `User` from Better Auth) and a REST API of \~17 endpoints under the `/api` prefix. Draft, for review.

### 6.1 Data model

All ids are UUIDs; all tables have `createdAt`, `updatedAt`. Every record (except `LinkTag`) belongs to a user via `userId`.

**User, Session, Account, Verification**: Better Auth tables, created from its schema. `User`: `id`, `name`, `email`, `image`.

Own field on `User`: `onboardingCompletedAt` (timestamp, null): when the user closed the onboarding dialog; `null` = show on sign-in.

Demo users: `User` fields `isDemo` (boolean) and `demoExpiresAt` (timestamp, null). Demo data is created from the seed set in `apps/api/src/demo/seed.json`.

**Folder**: a folder (nesting via `parentId`)

| Field | Type | Note |
| --- | --- | --- |
| `id` | uuid | PK |
| `userId` | uuid | FK → User |
| `parentId` | uuid, null | FK → Folder; `null` = top-level folder |
| `name` | string (≤ 100) |  |

**Link**: a link

| Field | Type | Note |
| --- | --- | --- |
| `id` | uuid | PK |
| `userId` | uuid | FK → User |
| `folderId` | uuid, null | FK → Folder; `null` = "Unsorted" |
| `url` | string (≤ 2048) | As entered by the user |
| `normalizedUrl` | string | For duplicate detection (see below) |
| `title` | string (≤ 300) | From the preview, or the URL if the preview did not load |
| `note` | text, null | "Why I saved it", ≤ 2000 characters |
| `faviconUrl` | string, null | Site icon |
| `imageUrl` | string, null | Preview image (Open Graph) |
| `isFavorite` | boolean | Defaults to `false` |
| `lastOpenedAt` | timestamp, null | For the "Recently opened" panel |

**Tag**: a tag: `id`, `userId`, `name` (≤ 50); unique per `userId + name` pair.

**LinkTag**: many-to-many relation: `linkId`, `tagId` (composite PK).

**Feedback**: ratings and feedback: `id`, `userId`, `milestone` (`day3` | `week1` | `month1` | `year1`), `score` (1–10, `null` = skipped), `comment` (≤ 2000, optional), `createdAt`; unique on `userId + milestone`. The presence of a row tells the frontend that the milestone has already been shown.

**URL normalisation** (for duplicates): lowercase host, no `#fragment`, no `utm_*` params and no trailing `/`. Duplicates are allowed (the user can "save anyway"), so the index is non-unique.

**Indexes:** `Link(userId, createdAt)`, `Link(userId, normalizedUrl)`, `Link(userId, lastOpenedAt)`, `Link.title` (`pg_trgm` for search), `Folder(userId, parentId)`.

**Interface settings** (view, panel) are not stored in the database, only in `localStorage`.

### 6.2 REST API

All routes except `/api/auth/*` require a session and work only with the current user's data. Contracts (DTOs) are in `libs/shared/contracts`; documentation is Swagger.

| Method | Path | Purpose |
| --- | --- | --- |
| `*` | `/api/auth/*` | Sign-in / sign-out with Google and GitHub (Better Auth) |
| GET | `/api/me` | Current user |
| DELETE | `/api/me` | Delete the account and all data |
| POST | `/api/links/preview` | For a URL, return title, icon, image + the existing link if it is a duplicate (for form autofill) |
| GET | `/api/links` | List with filters: `folderId`, `unsorted`, `favorite`, `tag`, `q` (search), `sort` (`createdAt` / `title`), `order`, `cursor`, `limit` |
| GET | `/api/links/recent` | Recently opened (by `lastOpenedAt`), `limit` |
| GET | `/api/links/:id` | One link |
| POST | `/api/links` | Create: `url`, `title?`, `note?`, `folderId?`, `tags?` (names; new tags are created automatically) |
| PATCH | `/api/links/:id` | Change any fields, including `isFavorite` and `folderId` |
| POST | `/api/links/:id/open` | Record an open (updates `lastOpenedAt`) |
| DELETE | `/api/links/:id` | Delete |
| GET | `/api/folders` | All folders as a flat list (`parentId` + link count); the frontend builds the tree |
| POST | `/api/folders` | Create: `name`, `parentId?` |
| PATCH | `/api/folders/:id` | Rename / move; moving into itself or its own subfolder is forbidden |
| DELETE | `/api/folders/:id?mode=` | Delete a folder with all subfolders; `mode=delete-links` also deletes the links, `mode=move-to-unsorted` moves them to "Unsorted" |
| GET, POST, PATCH /:id, DELETE /:id, POST /:id/merge | `/api/tags` | The user's tags with link counts; create an empty tag, rename (409 if the name is taken), delete (links remain), merge with another tag |

**General API rules:**

- cursor pagination, `limit` defaults to 50, maximum 100;
- one error format: `{ statusCode, error, message, requestId }` (as in 5.2);
- someone else's or a non-existent object → `404` (not `403`, so as not to reveal that it exists).

**Additionally:** `PATCH /api/me` with `{ onboardingCompleted: true | false }` marks onboarding as completed or resets it ("Show onboarding again"); `GET /api/me` returns `onboardingCompletedAt`.

**Demo, export, PWA:** `POST /api/demo` creates a demo sandbox and session (strict per-IP rate limit); `GET /api/export?format=json|html` (+ optional `folderId`, `tag`, `q`, the same filters as the list) downloads the current folder or all data; receiving a link from the "Share" menu (Web Share Target) needs no separate endpoint: the manifest opens the `/share?url=…` route (GET), and the page saves via `POST /api/links`.

**App rating:** `GET /api/me` returns `ratingPrompt: 'day3' | 'week1' | 'month1' | 'year1' | null`, which dialog to show now (computed by the backend from `createdAt` and the `Feedback` table); `POST /api/feedback` `{ milestone, score | null, comment? }` saves a rating, feedback or a skip; resubmitting for the same milestone appends to the comment. Rate-limited; the feedback text is stored as is and rendered only as text (no HTML).

## 7. Design and UX (Claude Design)

A minimalist, recognisable interface with light and dark themes on the own UI library `libs/ui`: our own look, with behaviour and accessibility on Angular Aria / CDK headless primitives.

### 7.1 Style

- Minimalism, high-quality UI/UX, beginner-friendly; its own character, but grounded in the practices of Linear, Notion, Raindrop.
- Light and dark theme in stage 1: system default, plus a manual toggle.
- Responsive interface in stage 1: desktop, tablet and phone (from 360 px). On phone the sidebar is a slide-out panel opened by a header button, search is an icon, "Recently opened" is a separate menu section, the feed is one column.
- Uniqueness comes not from bright colour but from micro-interactions, typography, empty-state illustrations and the logo.

**The interface language is English.** Mockups, copy, onboarding and empty states are written in English. Translations (uk) come at the end of stage 1 or after it (see 5.1).

**Palette: monochrome (graphite) + a "sage" accent.** Graphite for the background, text and primary buttons; sage only where colour carries meaning: favorites, active menu item, tags, focus. The dark theme is not pure black, text is not pure white. The values are a starting point; final ones are refined in Claude Design with a WCAG AA contrast check.

| Token | Light | Dark |
| --- | --- | --- |
| `bg` (page background) | `#F7F7F6` | `#131315` |
| `surface` (cards, panels) | `#FFFFFF` | `#1C1C1F` |
| `border` | `#E5E5E2` | `#2C2C30` |
| `text` | `#18181A` | `#EDEDEF` |
| `text-muted` | `#6E6E73` | `#9A9AA0` |
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
- illustrations animate once on appearance and then freeze; no background loops and no section reveal animations;
- the logo animates only on the first sign-in to the account;
- loading uses skeletons;
- `prefers-reduced-motion`: no movement or scaling; overlays and the new card simply fade in, loaders spin slower.

**Interface text rules:** labels and sections in normal case, no ALL CAPS; metadata is not glued together with "·" (domain with site icon, date on the right or in a tooltip, counts in words: "12 links, 2 subfolders").

**Style units are `rem`.** Font sizes, spacing, control heights, radii and widths are written in `rem` (16 px base, tokens are converted: `space-1` = 0.25rem, `space-4` = 1rem, 15 px font = 0.9375rem), so the interface scales with the font size in browser and system settings. `html { font-size: 100% }`: the root is not overridden. Only border widths (1px), focus rings and shadows stay in `px`; breakpoints are in `em`. The exact stylelint exception list: border widths (`border*`), `outline`, `outline-offset`, `box-shadow` and the loading bar height (2px). In SVG icons `stroke-width` is not set in px. Mockups and the design system are specified in px for clarity; `ui-dev` converts them via the SCSS function `rem($px)`, and stylelint forbids `px` outside the exception list.

**Ripple (the `uiRipple` directive in `libs/ui`, the Ripple component in the design system).** On press, a text-coloured circle spreads from the touch point (6% in the light theme, 10% in the dark, 20% on filled buttons; values from the Motion spec), grows for 450 ms while the finger is held, and fades over 350 ms after release. Starts on `pointerdown`, cancelled on scroll (movement > 10 px), from the centre for keyboard. Where: all buttons (together with the 0.97 press scale), sidebar and mobile menu rows, menu and select list items, link list rows, clickable tags, toggle items. Not on: link cards, input fields, dialogs, landing. With `prefers-reduced-motion`: no ripple, only the pressed background.

**Loading states** (the Loading and Skeleton components in the design system, the "Loading states" and "Loading · phone" screens). One indicator per wait, chosen by what is loading:

- First load of the feed, folder tree, preview → a content-shaped skeleton (6 cards, 8 rows), then a smooth 200 ms fade-in. The header and sidebar frame render immediately. No full-screen spinners.
- Switching folders, sorting, reloading → a 2px sage bar at the top (`loadingInterceptor` → `UiStore.pendingRequests`); the old content stays on screen.
- A user action (save, delete, sign in, export) → a spinner inside that button and the label "Saving…", `aria-busy`.
- Favorite, move, rename, tags → optimistic, no loader; on error, rollback and a toast with Retry.
- Loading on scroll → a "Loading more links" row; search → a spinner instead of the magnifier icon, previous results dimmed; export → percentage progress; phone → pull to refresh.
- Preview did not load within 8 s → the link is saved without it; the card shows the first letter of the domain on a sage background. Splash screen (logo + thin bar) only if startup takes longer than 300 ms.
- Timing: any loader appears no earlier than 300 ms and stays for at least 400 ms (so it does not flicker). A spinner never pops in abruptly: in a button it fades in and grows from 40% over 200 ms while the label shifts smoothly; in search the magnifier and spinner swap in place without shifting the field; it leaves the same way over 120 ms (`animate.enter` / `animate.leave` in Angular). With reduced motion the skeleton shimmer is off, the spinner and bar slow down but still move; for screen readers, `aria-live` "Loading links" / "Loaded 24 links".

### 7.2 Main screen layout

- **Header:** logo on the left · global search in the centre (Ctrl/⌘+K) · on the right the "Add link" button, theme toggle, avatar menu (settings, sign out).
- **Left sidebar:** All links · Unsorted · Favorites · folder tree · tags.
- **Content:** breadcrumbs ("All links › Work › Angular", every level clickable) · toolbar (sorting, "cards / list" toggle) · feed.
- **Right panel:** "Recently opened", can be hidden.

**Tooltips** (`uiTooltip`, appear after 400 ms on hover or keyboard focus, not shown on touch screens): on every icon button (theme, avatar, new folder, hide panel, view toggle, card actions, star), on titles truncated with "…" (full title), on relative dates ("2 days ago" → exact date). The tooltip shows the keyboard shortcut if there is one. A tooltip is never the only place where information is available.

**Keyboard shortcuts:** ⌘K / Ctrl+K for search; N to add a link; on a selected link E to edit, F to favorite, Delete to delete; V C / V L for the "cards" / "list" view; G A / G U / G F / G S to go to all links, no folder, favorites, settings; Esc to close a window. The list is in the avatar menu and under the "?" key.

### 7.3 Stage 1 screens

1. Sign-in (Google, GitHub)
2. Onboarding dialog (first sign-in, 3 steps)
3. Main screen (layout above) in the "cards" and "list" views
4. Adding a link (with autofill and a duplicate warning)
5. Editing a link
6. Deleting a folder (choice: delete links / move to "Unsorted")
7. Empty states (no links, empty folder, nothing found)
8. Account settings (account deletion, "Show onboarding again")
9. Privacy policy

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
- every component has a Storybook story with all variants and both themes, unit tests and an accessibility check.

| Component | Variants and states | Behaviour basis |
| --- | --- | --- |
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
| --- | --- |
| **Logo** | Chosen: a card with a bookmark notch in the top-right corner (graphite + light sage), a "saved link", + the name in Onest 600. Files in the design system: mark for light and dark themes, monochrome, app icon (favicon, PWA) |
| **Interface icons** | Shelfmark's own set: 44 icons, 24 px grid, 1.75 px stroke, 3 px corner radius, bookmark motif. In Angular, one `ui-icon` component with an SVG sprite |
| **Illustrations** | Flat geometric scenes in colour tokens (work in both themes): 3 onboarding steps, empty states ("no links", "empty folder", "nothing found"), errors (404, no network), the sign-in screen. Format: SVG, colours via CSS variables |
| **Motion** | CSS animations on duration and easing tokens, no libraries; full spec in the Motion component in the design system. One signature moment, saving a link: the card "lands" in the feed, the others shift (FLIP), the sage ring fades. The logo animates only on first sign-in, illustrations play once. Rules: "in fast, out even faster" (200 / 120 ms, press 80 ms); `ease-out` for entering, `ease-in` only for leaving the screen, `ease-in-out` for movement, `ease-drawer` for sheets; menus grow from their button, all overlays have an exit animation; hover only on devices with a mouse; themes switch via View Transitions. With `prefers-reduced-motion` movement is removed; fade and slow loaders remain. |
| **Promo video** | A short 20–30 s video for the README and portfolio: how a link goes from chaos onto the "shelf"; after the screens are done |

## 8. Agent team in Claude Code

Development is run by a "team" made of the main Claude Code session (tech lead) and 8 subagents; every task goes from a card in GitHub Projects to a PR that the project author reviews and merges.

### 8.1 Team members

Subagents are `.claude/agents/<name>.md` files in the repository. Subagents cannot launch other subagents, so only the tech lead distributes work.

| Agent | Role | Constraints |
| --- | --- | --- |
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

GitHub Projects statuses: **Backlog → Todo → In progress → In review → Done**.

1. `project-manager` creates issues from sections 3–7 (with acceptance criteria from section 4), status **Todo**.
2. The tech lead takes a task; `project-manager` moves it to **In progress**.
3. `architect` writes a short plan.
4. The relevant dev agent implements the task in a separate branch.
5. `test-engineer` writes tests; all checks must pass.
6. `code-reviewer` and `security-reviewer` review the changes; findings go back to the dev agent until they are resolved.
7. The tech lead opens a PR with a short description (what was done, how to verify); `project-manager` moves the task to **In review**.
8. The project author reviews and merges the PR; after the merge `project-manager` moves the task to **Done**.

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

**Task work cycle.** A goal from the author → `project-manager` creates issues in GitHub Projects and moves statuses → `architect` extends the contract in `libs/shared/contracts` (and an ADR if the decision is significant) → `backend-dev`, `ui-dev`, `frontend-dev` work in separate branches (git worktree), on Pro no more than 1–2 in parallel → `test-engineer` (80% coverage) → `code-reviewer` and `security-reviewer` review the PR diff, findings go to the code author → the project author looks at the PR and the Vercel preview deployment and merges it personally → `project-manager` closes the issue.

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
| --- | --- |
| Angular Agent Skills (official) | Modern Angular context for agents |
| `angular-v22-rules` | Our own v22 rules on top of the official ones; what is forbidden (NgModules, `*ngIf`, Reactive Forms, `@Injectable`) |
| `create-ui-component` | Template for a new `libs/ui` component: variants via typed inputs, tokens, Storybook story, tests, a11y |
| `create-api-module` | Template for a NestJS module: controller, service, DTOs in `libs/shared/contracts`, `userId` filter, tests |
| `security-checklist` | The 5.8 table as a review checklist |
| `github-workflow` | How to create issues, change statuses in GitHub Projects, format branches, commits and PRs |

### 8.5 Hooks and permissions

| When | What happens |
| --- | --- |
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
| --- | --- | --- | --- |
| 0 | Foundation | Nx monorepo, CI, Vercel, Neon, GitHub Projects, CLAUDE.md, agents, skills, hooks | 4–5 days |
| 1 | Design system | Mockups in Claude Design, tokens, `libs/ui` + Storybook | \~2 weeks |
| 2 | Authorisation | Google / GitHub, API protection, data isolation | 3–4 days |
| 3 | Links | Adding with preview (SSRF protection), duplicates, editing, deleting, favorites | \~1 week |
| 4 | Folders and tags | Nested folders, deletion with a choice, tags with autocomplete | \~1 week |
| 5 | Search and feed | Search, sorting, cards / list, "Recently opened", breadcrumbs | \~1 week |
| 6 | Polish | Mobile version, dark theme, empty states, accessibility | \~1 week |
| 7 | Release | 5.8 check, account deletion, privacy policy, README, Storybook online | 3–4 days |

**Stage 0 clarification:** stage 0 creates only the Neon project; Prisma, `docker-compose.yml` with local PostgreSQL and migrations in CI move to stage 2 together with the Better Auth schema.

The estimate assumes the bottleneck is PR review and fixes, not writing code. Hitting Claude subscription limits (see 9.6) can stretch the timeline.

**Optional in stage 7 (or after stage 1):** interface translations into Ukrainian + a language switcher in settings; \~2–3 days, since all text goes through keys from the start.

**Added to the plan:** PWA and "Share" in stage 6 (\~2 days); landing, Try demo, export, Sentry in stage 7 (\~4 days). Total stage 1 estimate: 9–10 weeks.

### 9.2 Connecting services

**Done by Claude Code** (via `gh`, Vercel CLI, Neon CLI): repository, GitHub Projects board with the statuses from 8.2, milestones, labels, issues; GitHub Actions workflows; linking the repository to Vercel; database and branches in Neon; `.env.example` templates.

**Done manually by the project author** (following step-by-step instructions from Claude Code):

- GitHub, Vercel, Neon accounts;
- CLI sign-in (`gh auth login` with Projects access, `vercel login`, Neon sign-in);
- OAuth apps in Google Cloud Console and GitHub;
- entering secrets into environment variables; Claude Code never sees secrets (see 8.5).

### 9.3 Git and branches

- `main` is protected: changes only via PR, green CI checks are required. Required approvals: 0, because PRs are created from the author's account, and GitHub does not allow approving your own PR, so the author's approval is the merge. Squash merge only.
- One branch per task: `feat/<issue-number>-short`, `fix/…`; the PR closes the issue (`Closes #N`).
- Commits follow Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`).

### 9.4 Testing

| Level | Tool | Requirement |
| --- | --- | --- |
| Unit | Vitest | Coverage ≥ 80% for `apps/api` and `libs/ui` |
| Components | Storybook | A story for every variant and both themes |
| E2E | Playwright | Key scenarios: sign-in, adding a link, folders, search, account deletion; phone and desktop |
| Security | API tests | Data isolation (A cannot see B), SSRF protection, validation |

Stage 0 E2E: Chromium only, see ADR 0008.

### 9.5 CI/CD

- **On every PR** (GitHub Actions, only affected projects via `nx affected`): lint, typecheck, unit tests with a coverage threshold, build, `npm audit`, CodeQL; Vercel creates a preview version.
- **Merge to `main`** → automatic deployment to Vercel production; Prisma migrations are applied to the production Neon database.

### 9.6 Claude subscription

Claude Code is included in Pro ($20/month) and Max ($100 / $200 per month); limits are shared between chat and Claude Code. Plan: start with Pro and watch usage (`/usage`); if limits run out several times a week, Max 5x for the months of active development. Savings: reviewers on a lighter model, `architect` only for large tasks.

Source: [Using Claude Code with your Pro or Max plan](https://support.claude.com/en/articles/11145838).

## Monetisation

Discussed after stage 1 (roadmap, stage 5): pricing tiers, free plan limits, payment provider. Stage 1 only lays the groundwork: all data has an owner (`userId`), so per-tier limits can be introduced without reworking the model.

## Backlog: after stage 1

Ideas that are deliberately not part of stage 1. Source for the roadmap (section 10).

- [ ] Browser extension for saving links in one click
- [ ] Import of old links from Telegram "Saved Messages" (via Telegram Desktop export)
- [ ] Sharing: the ability to open a collection to other people
- [ ] Custom themes: choice of accent colour and palette in settings (implemented by replacing the values of the token CSS variables from 7.1)
- [ ] Own authentication implementation (NestJS + Passport + JWT: access token + refresh token in an httpOnly cookie) instead of Better Auth. **Learning format:** Claude Code does not write the code for me but explains step by step and reviews what I write
- [ ] Email and password sign-in (email verification, password reset, an email sending service)
- [ ] "Killer features" for product uniqueness (AI, reminders, etc.): discuss after stage 1
- [ ] Subscriptions and monetisation: discuss after stage 1
- [ ] Feedback and suggestions at any time: a "Send feedback" item in the account menu → a form (type: idea, bug, other; text; optional screenshot), a feedback list for the author and suggestion statuses ("accepted", "done"); built on the same `Feedback` table as the app rating (story 24). **Design is needed before development** in Claude Design: feedback form (desktop and phone), "sending / sent / error" states, screenshot attachment, feedback list with statuses and the account menu item, in the style of the current design system.

* [ ] Dragging links into folders (drag & drop) and bulk actions: select several → move, add tag, delete
* [ ] Carrying data over from the demo sandbox into a real account on sign-in

## 10. Success metrics and roadmap after stage 1

Stage 1 is considered successful when all acceptance criteria are met, the app passes the technical thresholds below, and the author uses it for two weeks instead of Telegram "Saved Messages".

### 10.1 Stage 1 completion criteria

| Area | Criterion |
| --- | --- |
| Functionality | All 24 stories of section 4 (including "Onboarding") are done according to their acceptance criteria |
| Tests | Coverage ≥ 80% (`apps/api`, `libs/ui`); e2e of key scenarios pass on desktop and phone |
| Security | All 5.8 measures are in place; 0 critical and high vulnerabilities in `npm audit` and CodeQL |
| Interface quality | Lighthouse ≥ 90 for performance, accessibility and best practices on the main screen |
| Design | Screens match the Claude Design mockups in both themes and on phone |
| Usage | The author moves their links into the service and uses it every day for 2 weeks |

### 10.2 What we measure after launch

Vercel Analytics (no personal data): number of registered users; share of users returning after a week; average number of saved links per user; how often saved items are opened (by `lastOpenedAt`), the main indicator that the product solves the "I save it and never come back" problem.

### 10.3 Roadmap

The order of stages after 1 is tentative and decided based on the results of stage 1. Source: "Backlog: after stage 1".

| Stage | Goal | Contents |
| --- | --- | --- |
| 2 | Save faster | Browser extension; import from Telegram "Saved Messages" |
| 3 | Learning and independence | Own authentication (learning format); email and password sign-in |
| 4 | Smarter | Uniqueness "killer features": AI tags and descriptions, reminders, etc., after discussion |
| 5 | Product | Collection sharing; subscriptions and monetisation; move to paid hosting |

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
