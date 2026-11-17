# Admin usage stats (#333): proposal

Status: accepted by the author on Nov 14, 2026 (decisions on #333, listed at the end); v1 is implemented, v2 and v3 are not in scope yet. Decision: [ADR 0045](adr/0045-admin-usage-stats.md) (Accepted).

**Goal.** An admin-only "Stats" page next to the Feedback inbox that shows how Shelfmark is used, as aggregates over all real users, without reading anyone's links or notes and without keeping personal data after an account is deleted.

**Today.** Everything below except retention can be computed from existing columns. The admin module (`apps/api/src/admin`, `AdminGuard`, `ADMIN_EMAILS`, 404 for everyone else) and the web feature `apps/web/src/app/features/admin` (route `/admin/feedback`, mock API) already exist. There is no admin or stats screen in `docs/design/`; by decision the page is built from existing components and reviewed on the preview (section 4).

## 1. Metrics

Shared rules: "real user" = `users.is_demo = false` and the email is not in `ADMIN_EMAILS` (decided). "Live" = `deleted_at IS NULL`. Days are UTC. k = 3 (section 2). Query cost is given for today's scale (under 1k users) and for 10k users / 1M links.

### 1.1 Overall

| Metric | Exact definition | Source | Cost | Privacy risk |
| --- | --- | --- | --- | --- |
| Real users | `count(*)` of real users | `users` | trivial | none |
| Demo sandboxes | demo users that exist now (all started in the last 24 h, the cleanup cron removes expired ones daily) | `users.is_demo` | trivial | none |
| Sign-ups per day (30 days) and per week (12 weeks) | real users grouped by `date_trunc('day' / 'week', created_at)`; zero days filled | `users.created_at` | trivial | low: a "1" reveals that someone joined that day, nothing else; totals are shown as is |
| Onboarding finished | share of real users with `onboarding_completed_at` set | `users` | trivial | none |
| Active last 7 / 30 days | real users with `last_active_on >= today - 6` / `- 29` | **new** `users.last_active_on` | trivial | low |
| Returned after a week | among real users who joined at least 7 UTC days ago (`created_at::date <= today - 7`): share with `last_active_on >= created_at::date + 7` ("came back at least once 7+ days after joining") | **new** column | trivial | low |
| Returned after a month | same with 30 days | **new** column | trivial | low |
| Cohort retention by sign-up week (v2) | per sign-up week: users active in week 1, 2, 4, 8 after joining | **v2** daily snapshot (1.4) | trivial | low (counts only, suppressed < k) |

Why new data is needed: no existing column records a visit. `sessions.updated_at` is refreshed at most once a day, but session rows vanish on sign-out and expiry; `links.created_at` / `last_opened_at` miss users who only read, and `last_opened_at` stops while history is paused. The minimal addition is **one date per user**: `users.last_active_on date NULL`, set to `current_date` on the first authenticated request of a UTC day (conditional `UPDATE ... WHERE last_active_on IS DISTINCT FROM current_date`, after `SessionAuthGuard` resolves a non-demo session; a per-instance in-memory "already written today" set skips repeat writes). It is deleted with the user (it is a column). Backfill once: `greatest(max(sessions.updated_at), max(links.created_at), max(links.last_opened_at), users.created_at)::date`; numbers before the deploy date are marked approximate. An events table was rejected: per-user activity history is more personal data than the questions need.

### 1.2 Feature usage

Every adoption row is "real users with at least one ...", shown as count and share of real users; both are `null` while there are fewer than k real users or when the users with or without it are a group of 1 to k-1.

| Metric | Definition | Source | Cost (10k users) |
| --- | --- | --- | --- |
| Links per user | mean, median (`percentile_cont(0.5)`) of live links per real user, users with 0 included; histogram 0, 1-9, 10-49, 50-99, 100+. No max (it would point at one person) | `links` grouped by `user_id` | one group-by on the `(user_id, created_at)` index: ~10 ms now, ~0.3-1 s at 1M links |
| Folders | has a live folder | `folders` | `EXISTS` per user, indexed |
| Nested folders | has a live folder with `parent_id` set | `folders` | same |
| Tags | has a tag on a live link | `tags`, `link_tags` | same |
| Favorites | has a live link with `is_favorite` | `links` | same |
| Notes | has a live link with a non-empty note (presence only, the text is never selected) | `links.note IS NOT NULL` | same |
| Sidebar pins | a live folder or link with `pinned_position` set | `folders`, `links` (partial indexes) | cheap |
| Pins in a folder | a live link with `pinned_in_folder_at` set | `links` | cheap |
| Saved views | has a view that is not one of the two starter views (name and query of "Videos" / "Articles", added by the sign-up trigger and, for older accounts, by the migration), or a view count other than 2 (a starter was deleted) | `saved_views` | cheap |
| Trash | has items in Trash now; plus the `trash_retention_days` distribution (7/30/90). Restores are not recorded, so "uses Restore" is not measurable without events | `links/folders.deleted_at` (partial indexes) | cheap |
| Public collections | has a `folder_shares` row; share with notes on | `folder_shares` | trivial |
| Own colours | `cardinality(custom_colours) > 0` or a folder `colour LIKE '#%'` | `users`, `folders` | cheap |
| Own emoji | `cardinality(custom_emoji) > 0` or a folder icon that is not a `FOLDER_ICON` name | `users`, `folders` | cheap |
| Opens saved links | a live link with `last_opened_at` in the last 30 days (PROJECT.md 10.2: the main "do people come back to what they saved" signal); history paused shown separately | `links`, `users.history_paused` | cheap |
| Previews off | `fetch_previews = false` | `users` | trivial |
| Side by side | **not measurable** server-side: the panel state is in `localStorage` (6.1). Measuring it needs client telemetry, which the policy rules out ("no analytics scripts"). Recommendation: do not measure in v1; revisit only if the setting moves to the server | none | - |

All adoption rows fit in one SQL statement over `users` with `count(*) FILTER (WHERE EXISTS (...))`, tagged `$queryRaw` (no `$queryRawUnsafe`), plus one statement for the links histogram.

### 1.3 Preferences and feedback

| Metric | Definition | Note |
| --- | --- | --- |
| Theme | `theme` distribution among users with `appearance_saved_at` set; the rest as "never chosen" | default `system` is not a choice |
| Language | `language` distribution among users with `language_saved_at` set; `browser` and "never chosen" kept as their own buckets | the resolved browser language is unknown on the server and is not collected |
| Layout (v2) | `default_view`, `density`, `text_size`, `font`, `card_preview` | same k rule |
| Ratings | per milestone (`day3`, `week1`, `month1`, `year1`): answered, skipped (`score IS NULL`), mean, median, groups 1-6 / 7-8 / 9-10; rows with `kind IS NULL` only | comments are not shown here (they are free text tied to a person) |
| Messages | counts by `kind` and by `status` | the inbox already shows the messages themselves |

### 1.4 Computed live vs daily snapshots (recommendation)

- **v1: computed live on request, nothing stored.** A deleted account simply stops being counted, which is the strongest form of "nothing kept after deletion". At today's scale every query is milliseconds. The queries run in one read-only transaction with a 5 s statement timeout; there is no memo, so a deleted account is gone on the very next request (add one only when the queries get slow).
- **v2: a daily aggregate snapshot** `usage_daily(day date, metric text, dimension text, value int, PK(day, metric, dimension))`, written by a new Vercel Cron route `/api/cron/usage-snapshot` (`CRON_SECRET`, 00:10 UTC). It holds only totals: real users, sign-ups, demos started (all of yesterday's demos still exist at 00:10, the demo cleanup runs at 03:17), active yesterday per sign-up week (cohort retention), WAU, MAU. No user id, email or any per-user value; k is applied when reading. This is the only way to get trends of things that disappear (demos, deleted accounts) and true cohort curves without per-user history.

## 2. Privacy rules

1. **Aggregates only.** Responses contain counts, shares, means, medians and bucket counts. No id, name, email, URL, title, note, tag or folder name, no per-user rows, no drill-down, no export of raw rows. A contract test fails if a response field outside the allow-list appears.
2. **Minimum group size k = 3** (`ADMIN_STATS_LIMIT.MinGroup` in contracts; decided, raise it later when there are more users). A distribution bucket with 1 to 2 users merges into "Other"; if "Other" would then hold a single hidden value or fewer than 3 users, the next smallest bucket joins it, and if that is still under 3 its count is `null` ("fewer than 3"). A share or rate whose base (eligible users) is below 3 is `null` ("not enough users yet"), and so is one where either side of the split is a group of 1 or 2 ("hidden: a group of fewer than 3"); 0 and all stay visible. The mean and median of links per user and a milestone's mean and median with fewer than 3 answers are `null`; a milestone's score groups (1-6, 7-8, 9-10) merge into "Other" like any bucket; the sign-up series are all zero while there are fewer than 3 real users. Plain totals (real users, sign-ups per day) are shown as is: they carry no attribute. Honest limit: the author has database access anyway; the threshold guards against casual identification on the page and in screenshots, not against the operator.
3. **Demo accounts** are excluded from every metric and shown only as "demo sandboxes now" (v2: per day). Demo-to-sign-up conversion is not measurable (the two accounts are not linked) and should stay that way.
4. **Admin accounts** excluded from real-user metrics (decided); early on the author's own library would dominate the means.
5. **Deletion.** v1 stores nothing. `last_active_on` is a column on `users` and goes with the row. v2 snapshots hold anonymous totals that cannot be traced back to a person (k applied on read); they are not personal data once aggregated (GDPR Recital 26), and the policy says so.
6. **Opt-out.** Legal basis: legitimate interest (GDPR Art. 6(1)(f)) for aggregate product analytics done in-house, no third party, no cookies, no scripts. An in-app toggle is not required; the right to object (Art. 21) is honoured through the existing contact route, and an objection can be met by excluding that account (v2: `users.stats_excluded`). Not legal advice; the author should confirm before launch with the GDPR documents (Ideas to discuss, Legal).
7. **Admin routes** keep 5.8: 404 for everyone outside `ADMIN_EMAILS`, demo users never, `no-store`. The 5.8 "Admin routes" row must be amended: admin queries now also read aggregates over all users' rows (today it says "they touch message rows only").

**Privacy policy (en; shipped in all 7 languages).** New key `privacy.store.usage` after `privacy.store.stats`:

> To learn how Shelfmark is used, we record the day you last used the app: a date only, no time, page or action. The author sees only totals worked out from all accounts together, such as how many people use folders or tags or which themes are popular. Groups of fewer than three people are not shown, and no one's links, notes or settings are looked at one by one. These totals are worked out on request and are not stored. When you delete your account, the date goes with it.

v2 replaces the last two sentences with: "Daily totals are kept for charts; they contain no account, name or email and cannot be traced back to you. When you delete your account, the date goes with it and you are no longer counted." Also: `privacy.dont.read` stays true; `privacy.cookies.none` stays true (no scripts, no cookies); bump `privacy.updatedDate`; mirror the copy in `docs/design/screens/Privacy.dc.html`.

## 3. Support on request

**Recommendation: later, a separate issue** (it reads one person's data, a different risk class from aggregates, and nobody has asked yet; until then the user can describe or screenshot the problem in Send feedback). Minimal safe design for that issue:

- The **user** grants access from their own feedback message ("Let the author look at my settings and folder list to fix this", off by default). A grant is a row `support_grants(id, user_id, feedback_id, scope, expires_at, revoked_at)`, 7 days at most, revocable from "Your feedback".
- **Scope:** settings (the `GET /api/me/settings` shape) and the folder tree (names, counts, colours, icons). Links, URLs and notes never; a single folder's links only with a second, explicit scope.
- `GET /api/admin/support/:grantId` read-only, AdminGuard, 404 without a live grant; every read appended to an audit list the user can see ("Viewed by the author on 14 Nov"); grants and audit rows cascade on account deletion.
- Policy paragraph and an ADR of its own.

## 4. API and UI

**Endpoint (v1).** `GET /api/admin/stats` in the existing `AdminController` (class-level `AdminGuard`), `RATE_LIMIT.Admin` (60/min), `Cache-Control: no-store`, `ApiExcludeController` as the rest. New `AdminStatsService` in `apps/api/src/admin` (tagged `$queryRaw` only), suppression in a pure `suppressSmallGroups()` helper with unit tests. One response; the page needs everything at once and it is small. No query params in v1. v2 adds `GET /api/admin/stats/trends?days=30|90|365` from the snapshot table.

**Contract** (`libs/shared/contracts/src/admin/`, one type per file):

```ts
// admin-stats-response.interface.ts
interface AdminStatsResponse {
  generatedAt: string; // ISO
  minGroup: number; // k, for the page copy
  overview: AdminStatsOverview;
  features: AdminStatsFeatures;
  preferences: AdminStatsPreferences;
  ratings: AdminStatsRatings;
}
// admin-stats-overview.interface.ts
interface AdminStatsOverview {
  realUsers: number;
  demoSandboxes: number;
  onboarded: AdminStatsRate;
  signUpsByDay: AdminStatsPoint[]; // 30, oldest first, zero-filled
  signUpsByWeek: AdminStatsPoint[]; // 12
  active7d: AdminStatsRate;
  active30d: AdminStatsRate;
  returnedAfterWeek: AdminStatsRate;
  returnedAfterMonth: AdminStatsRate;
  activitySince: string | null; // ISO date the last_active_on tracking started (earlier = estimated); null when unknown
}
interface AdminStatsPoint { start: string; count: number }               // admin-stats-point.interface.ts
interface AdminStatsRate { base: number; count: number | null; share: number | null } // null = base < k or a side of 1..k-1
interface AdminStatsBucket { key: string; count: number | null }         // key: allow-list value | 'other' | 'never'
interface AdminStatsFeatures {
  linksPerUser: { mean: number | null; median: number | null; buckets: AdminStatsBucket[] };
  adoption: AdminStatsAdoption[];
}
interface AdminStatsAdoption { feature: AdminStatsFeature; rate: AdminStatsRate }
// admin-stats-feature.const.ts + .type.ts (as const, ADR 0024)
const ADMIN_STATS_FEATURE = { Folders, NestedFolders, Tags, Favorites, Notes, SidebarPins,
  FolderPins, SavedViews, Trash, PublicCollections, OwnColours, OwnEmoji, OpenedRecently,
  HistoryPaused, PreviewsOff } as const;
interface AdminStatsPreferences { theme: AdminStatsBucket[]; language: AdminStatsBucket[];
  trashRetention: AdminStatsBucket[] }
interface AdminStatsRatings { milestones: AdminStatsMilestone[]; messagesByKind: AdminStatsBucket[];
  messagesByStatus: AdminStatsBucket[] }
interface AdminStatsMilestone { milestone: FeedbackMilestone; answered: number; skipped: number;
  mean: number | null; median: number | null; groups: AdminStatsBucket[] } // ADMIN_STATS_SCORE_GROUP keys + other
// admin-stats-limit.const.ts: ADMIN_STATS_LIMIT = { MinGroup: 3, SignUpDays: 30, SignUpWeeks: 12 }
// admin-endpoint.const.ts gains Stats: '/api/admin/stats'
```

**Page** `/admin/stats` (`ADMIN_PATH.Stats`), lazy, behind the existing `adminOnly` guard; a "Feedback | Stats" switch (`ui-segmented-control`; `ui-tab-bar` is the phone's main navigation) on both admin pages and a second admin row in the Settings index next to the inbox entry.

- Desktop (from 64em), one column of `ui-panel` sections, max width like the inbox: header (title, "Updated 14:02", "Groups under 3 are hidden" note) · **Overview**: 4 number tiles (real users, active 7 d, returned after a week, after a month; `null` reads "Not enough users yet") and a 30-day sign-ups bar chart with a day/week `ui-segmented-control` · **Features**: links per user (mean, median, histogram) and an adoption list, one row per feature with label, `ui-meter` and "34% · 17 users" · **Preferences**: theme, language, Trash retention as `ui-meter` rows · **Ratings**: per milestone a row with answered / skipped, mean and a three-part stacked bar; message counts by kind and status.
- Phone (360 px): the same sections stacked, tiles in a 2x2 grid, the chart scrolls horizontally inside its panel.
- Charts: no chart library. Shares and distributions reuse `ui-meter`; the sign-up series needs one new `libs/ui` component `ui-bar-chart` (inline SVG, bars from token colours, both themes, rem sizes, each bar with an accessible label and a visually hidden table, bar growth per `components/Motion/README.md`, off with reduced motion). Storybook story and harness as usual.
- States: loading (`ui-skeleton`), error (`ui-notice` with Retry), empty (fewer than 3 real users: tiles show totals, the rest "Not enough users yet").
- i18n: `admin.stats.*` in all 7 language files (feature labels map from `ADMIN_STATS_FEATURE`).
- Mock: `MockAdminApi.stats()` returns a fixture with suppressed buckets and `null` rates, so `npm start` and e2e show every state; `provide-admin-api.e2e.ts` gets the same.
- **Design:** `docs/design/` has no admin screen (the inbox was built without one). Decided: no design board; the page is built from existing components, kept consistent with the Feedback inbox, and reviewed on the preview.

## 5. Phased plan

| Phase | Scope | Effort |
| --- | --- | --- |
| **v1** | `last_active_on` migration + backfill + guard write; `GET /api/admin/stats` with overview (incl. week / month return), feature adoption, links per user, theme / language / retention, ratings summary; k-rule; `/admin/stats` page with tiles, meters, `ui-bar-chart`; mocks; policy paragraph in 7 languages; 5.8 and 6.1 / 6.2 updates; ADR 0045 accepted | design 0.5-1 d, contracts 0.5 d, api 2 d, ui chart 1 d, web page 1.5 d, tests and policy 1 d: **about 6-7 days** |
| v2 | `usage_daily` snapshot cron, trends endpoint (users, demos and active per day), cohort retention table, layout preferences, `stats_excluded` for objections | 2-3 d |
| v3 | Support on request with consent grants (own issue and ADR) | 3-4 d |

Steps of v1 (one commit each): (1) architect drafts the contract on request; (2) backend-dev: migration + backfill + `last_active_on` write in the guard path; (3) backend-dev: `AdminStatsService`, suppression helper, endpoint; in parallel (4) ui-dev: `ui-bar-chart` + story; (5) frontend-dev: page, route, tab bar, i18n, mock (after 1, against the mock); (6) frontend-dev: privacy policy copy; (7) test-engineer.

**Risks.** A write on the request path (mitigated by one conditional update per user per day and the in-memory set; failure must never fail the request). Small numbers early: most distributions show "Other", which is correct but less informative. Policy drift: the stats must ship together with the policy update, never before. Migration is additive (nullable column), no breaking change. 5.8 row "Admin routes" changes meaning (aggregates over all users), so security-reviewer must check the response allow-list test.

**Tests (test-engineer).** `/api/admin/stats` answers 404 to a guest, a normal user, a demo user and an unverified admin email; the response has no field outside the allow-list (no id / email / name / url); demo and admin accounts are not counted; a bucket of 4 merges into "Other" and the single-hidden-value case merges again; a rate with base 4 is `null`; a deleted account stops being counted on the next request; `last_active_on` is written once per UTC day, never for demo users and never on public routes, and a failed write does not fail the request; saved views from the sign-up trigger do not count as use; trashed links and folders are excluded from adoption; SQL uses tagged `$queryRaw` only; web: page states (loading, error, not enough users, full) on desktop and phone, both themes, axe clean.

## Author decisions (Nov 14, 2026)

1. Admin accounts (`ADMIN_EMAILS`) are left out of the numbers, like demo accounts.
2. `users.last_active_on` (one date per user, backfilled once) is stored, and the privacy-policy paragraph ships in the same release.
3. Minimum group size **3** (`ADMIN_STATS_LIMIT.MinGroup`), raised later when there are more users.
4. v2 may keep anonymous daily totals after accounts are deleted (no ids, no personal data). Not part of v1.
5. No design board: the page is built from existing components and reviewed on the preview.
