# 0053. Library clean-up: one stored report per user (ids only), checks behind a seam, apply validated against the report, one Undo through Trash

- Status: Proposed
- Date: 2026-11-17
- Source: issue #394 (F5), `docs/ai/IMPLEMENTATION-AI-5.md` section 1, `docs/ai/FEATURES.md` F5 and principle 3, `docs/design/screens/AiCleanup.dc.html`, `docs/PROJECT.md` 5.6 and 5.8; builds on [0036](0036-trash-soft-delete.md), [0049](0049-ai-job-runner-on-vercel.md), [0050](0050-rule-offers-derived-no-correction-log.md) and [0051](0051-search-by-meaning-embeddings.md)

## Context

- F5 shows a clean-up report: duplicates (extra copies to Trash), similar tags (merge into one) and, later, dead links (#397, not built). Every row has a checkbox; "Apply selected" runs in one step with one Undo; nothing is automatic.
- FEATURES splits it: exact duplicates (same normalised URL, `links.normalized_url`, indexed with `user_id`) need no model; near-duplicates use the AI-3 vectors (nothing new is sent); tag synonyms need a model call with tag names only.
- The design shows progress ("812 of 1,248 links"), "you can leave this page; we'll keep the report", and an entry card on All links at most once a month.
- A vector neighbour scan over 10,000 links takes longer than the 8 s request timeout; deferred work has the ADR 0049 machinery (`waitUntil`, the per-user tick, the daily sweep, 30 s `maxDuration`).
- AI-2 Tidy returns its Undo payload to the client and scopes every Undo statement by the session `userId` and the current state; Trash is a soft delete with one shared `deleted_at` per delete (ADR 0036).

## Decision

1. **One stored report per user** (`cleanup_reports`, primary key `user_id`): state, `checked` / `total`, a keyset cursor for the neighbour scan, whether AI groups were included, `findings` as validated JSON holding **ids, a group id and a reason only** (no titles, URLs or tag names; they are read live when the report is shown, so trashed or renamed items drop out or update), timestamps and the card dismissal. A new run replaces it. "Delete AI data" deletes it.
2. **Checks behind a seam.** A server-side `CleanupCheck` (`group`, `needsAi`, `run(ctx, budget)`) registry: exact duplicates (one grouped query, synchronous), similar tags by rule (lower case, diacritics, separators, a trailing plural `s`; no model), near-duplicates (KNN per link over the user's live vectors, cosine ≥ 0.93 **and** the same host family or overlapping title words, union-find groups of at most 5), similar tags by the model (Claude Haiku 5.5, the link-job model, with tags as short keys `t1…`, structured output, a narrowing validator: own keys only, one pair per tag, no chains, at most 20 pairs). The dead-link check of #397 plugs in as one more `CleanupCheck` with its own group and apply action; the contract's groups are additive.
3. **Running in the background.** `POST /api/cleanup/run` writes the rule-based groups at once and, when AI groups are requested and allowed, defers the rest through `AiBackgroundService`; the AI tick continues it while the report is `running`, the daily sweep finishes abandoned runs. AI groups need AI on, the AI pack, and (for near-duplicates) the search status `ready`; a model run counts against a monthly `cleanup_runs` allowance (AI pack 10, Free 0).
4. **Apply is validated against the stored report.** The request names report group and pair ids and the selected link or tag ids; the server accepts only ids inside those stored findings, only the user's live rows, never all copies of a group, and runs one transaction (`folders:` lock before `tags:`): selected copies go to Trash with one shared `deleted_at`; selected merges use the existing tag merge. The response carries the exact Undo payload.
5. **One Undo, no run table.** `POST /api/cleanup/undo` restores the trashed ids whose `deleted_at` still equals the run's, re-creates each merged tag by name (or reuses one with that name), puts it back on its links, and removes the kept tag only from links that got it from the merge. Every statement is scoped by the session `userId` and conditional on the current state; foreign or missing ids are ignored. Undo is offered while the toast is visible (8 s), like bulk actions.
6. **Entry card.** Counts come from one cheap query for exact duplicates plus the stored report's other groups; shown only when something was found, at most once in 30 days after a dismissal. No background check of the library just for the card.

## Consequences

- Leaving the page keeps the report; returning shows progress or the result; stale items fall out because only ids are stored.
- Nothing is changed without a click, and the run reverts as a whole while the toast is visible; afterwards the copies are still in Trash for the account's retention period.
- Exact duplicates and rule-based tag variants work for everyone, with AI off; the AI groups follow the opt-in and the tier.
- A new check (dead links) is a new `CleanupCheck`, a contract group, one apply action and translations; no schema change for the report.
- The client holds the Undo payload: a closed tab during the toast loses the Undo, as with Tidy and bulk actions.
- Revisit if reports need history (for example "what did the last clean-up change"), which would need a run table and retention rules.

## Alternatives considered

- **Compute the report on every page load** — no table, but the neighbour scan does not fit the request timeout for large libraries, and the design promises a kept report.
- **Store titles and names in the report** — simpler reads, but duplicates user content in a second place that export, deletion and edits would have to follow.
- **A run table for Undo** — Undo after the toast and an audit trail, but new retention and deletion duties; AI-2 set the client-payload precedent.
- **Near-duplicates by vector similarity alone** — two different recipes from one site are close in meaning; the host or title condition keeps "Same page" meaning the same page.
- **A model call for all tag pairs** — rule-based variants (`recipe` / `recipes`) need no model and so stay Free.
- **Hard delete of duplicates** — irreversible; FEATURES requires deletions through Trash.
