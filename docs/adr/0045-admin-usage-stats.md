# 0045. Admin usage stats: live aggregates with a minimum group size and one activity date per user

- Status: Accepted
- Date: 2026-11-14
- Source: issue #333 (author decisions, Nov 14, 2026), proposal `docs/admin-stats-333.md`, `docs/PROJECT.md` 5.8 (Admin routes, Privacy), 6.1, 10.2

## Context

- The author wants to learn how Shelfmark is used: users, sign-ups, real vs demo, return after a week and a month, which features are used, themes and languages, rating results.
- Promises in the privacy policy and on the landing page: no selling or sharing, no ads, no analytics cookies or scripts, links are not looked at except to run the service, account deletion removes everything.
- 5.8 limits `/api/admin/*` to `ADMIN_EMAILS` with 404 for everyone else; today admin queries "touch message rows only".
- Almost every metric can be computed from existing columns. Retention cannot: no column records a visit (session rows disappear on sign-out and expiry; link timestamps miss readers; `last_opened_at` stops while history is paused).
- The panel state (side by side, view) lives only in `localStorage`; demo users are deleted daily.

## Decision

1. **Aggregates only, computed live.** `GET /api/admin/stats` (AdminGuard, `RATE_LIMIT.Admin`, `no-store`) computes all numbers on request with tagged `$queryRaw` over real users (`is_demo = false`, accounts in `ADMIN_EMAILS` excluded). One read-only transaction with a 5 s statement timeout, no memo. Nothing derived is stored in v1. The response contract is an allow-list of counts, shares, means, medians and buckets; no ids, names, emails or content, no per-user rows.
2. **Minimum group size 3** (`ADMIN_STATS_LIMIT.MinGroup`, the author's choice; raised later when there are more users). Buckets below 3 merge into "Other" (with a second merge when "Other" would reveal a single value), a share is `null` when its base is below 3 or when either side of the split is a group of 1 or 2 (the users who have it or the ones who do not; nobody and everybody stay visible), means and medians of fewer than 3 people are `null`, rating score groups go through the same bucket merge, and sign-up series are all zero while there are fewer than 3 real users. Plain totals (real users, demo sandboxes, message counts) stay visible. The rule lives in one pure helper and a response allow-list test fails on any field outside the contract.
3. **One activity date per user.** New nullable column `users.last_active_on date`, set to the current UTC date on the first authenticated non-demo request of the day (`UserActivityService`, called by `SessionAuthGuard` without waiting; conditional update in plain SQL so `updated_at` stays; per-instance memo of the day; a failure never fails the request). It defines "active in 7 / 30 days" and "returned after a week / month" (`last_active_on >= created_at::date + 7 / 30` among users old enough). It is deleted with the user row. Backfilled once from sessions and link timestamps, marked approximate before the deploy date.
4. **Demo accounts** are not counted in any metric, only as "demo sandboxes now".
5. **Client-only state** (side by side, panel, view) is not measured: it would need client telemetry, which the policy excludes.
6. **Privacy policy and 5.8** are updated in the same release: a `privacy.store.usage` paragraph, and the 5.8 "Admin routes" row states that admin reads include aggregates over all users' rows under the minimum group size.
7. **Later, separate decisions:** a daily anonymous snapshot table for trends and cohort retention (v2), and support access to one user's settings only under a time-limited, revocable grant created by that user (v3, own ADR).

## Consequences

- Deleting an account removes the person from every number at once; nothing personal survives in stats.
- One small write per active user per day on the request path; trivial at today's scale.
- Retention starts being accurate only from the deploy date: the backfill takes the latest existing trace, so active and return numbers that reach back before it can read high; the page says so. True weekly cohort curves need the v2 snapshots.
- Small user counts hide most distributions at first; the page must explain "not enough users yet".
- Live queries grow with data: around 1M links the links-per-user query nears a second, which is the point to add caching or the v2 snapshot.
- Every new metric must use the suppression helper and pass the response allow-list test.

## Alternatives considered

- **Third-party analytics (Vercel Analytics, Plausible)** — page views, not feature use; adds a script and a processor, contradicting "no analytics scripts"; 10.2 mentions Vercel Analytics, which this supersedes for product metrics.
- **An events table (per-user actions with timestamps)** — exact funnels and cohorts, but a per-user activity history is much more personal data than the questions need, and it grows fast.
- **Daily snapshots from day one** — gives trends, but stores data before the author has decided what is worth keeping; deferred to v2.
- **Retention from `sessions.updated_at` only** — rows vanish on sign-out and expiry, so returning users who signed out look lost.
- **No threshold, rely on admin trust** — the author has database access anyway, but screenshots of the page get shared; a threshold costs little.

## Author decisions (Nov 14, 2026, #333)

Admin accounts are excluded; `last_active_on` and the policy paragraph ship together; the minimum group size is 3; v2 may keep anonymous daily totals after accounts are deleted; no design board, the page is built from existing components. v2 (snapshots) and v3 (support grants) are separate work.
