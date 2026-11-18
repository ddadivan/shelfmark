# 0050. Rule offers and AI examples are derived from the user's links; no correction-event log

- Status: Proposed
- Date: 2026-11-17
- Source: issue #390 (F1b, extends #398), `docs/ai/IMPLEMENTATION-AI-2.md` section 1, `docs/ai/FEATURES.md` F1b and principle 6, `docs/PROJECT.md` 5.6 and 5.8; builds on [0047](0047-ai-provider-models-and-cost.md) and [0049](0049-ai-job-runner-on-vercel.md)

## Context

- F1b: after the same choice three times, Shelfmark offers a plain domain rule ("Always put youtube.com links in Videos?"), and the user's recent choices feed the next suggestions as examples. A dismissed offer must never come back.
- FEATURES F1b privacy: "only the user's own accept, dismiss and move events, kept with the user's data, never used for statistics." Principle 6: Shelfmark counts AI calls and nothing else.
- AI-1 already stores what is needed to see a pattern: each link's folder and tags, and `link_suggestions` rows with `suggested | auto-applied | accepted | dismissed` (an accepted suggestion is the user's data; an open `auto-applied` folder is AI's choice until the user keeps or changes it).
- Domain rules (#398) exist: `RulesService` with `RULE_LIMIT.PerUserMax`, `findMatchingRule`, `ruleHost`.

## Decision

1. **No event log.** The offer check and the prompt examples are computed on demand from the user's live links of one site (`ruleHost(url)`), newest first: the newest three must share one live folder, none may carry an open `auto-applied` folder mark, no rule of the user may match the host, the domain must not be dismissed and the user must be below the rule cap. Prompt examples are up to three of the user's other links of the same site, as folder keys and own tag names only.
2. **One table for answers, not behaviour:** `rule_offer_dismissals (user_id, domain, created_at)`, primary key `(user_id, domain)`, cascade with the user. Written only by "Not now", read only by the offer check. It belongs to rules, not AI: `DELETE /api/ai/data` keeps it.
3. **Rule offers live in `RulesModule`** (`POST /api/rules/offers/check`, `POST /api/rules/offers/dismiss`) and do not read AI settings; Create rule is the existing `POST /api/rules`. The web app decides when to ask (after the user files links, only while AI is on).

## Consequences

- Nothing new is recorded about what the user did; no retention, export or deletion rules for a behaviour history; the privacy statement holds by construction.
- The offer reflects the library as it is now: a link that is moved back, trashed or deleted stops counting at once, with no drift.
- The wording cannot say "you moved": a link saved directly into the folder counts the same. The copy is "Your last 3 links from this site are there."
- The check scans the user's links of one host with an escaped `ILIKE` (there is no host column); acceptable at thousands of links per user. A generated `host` column with an index is the fix if it shows in timings.
- Revisit if offers need signals the current state cannot show (for example "dismissed the same folder suggestion three times"); then a bounded per-user event table with a retention period would be the next step.

## Alternatives considered

- **An append-only `ai_corrections` table** (accept, dismiss, move events) — exact "you moved" wording and richer patterns, but a per-user behaviour log that needs retention, export and deletion handling, and every write path (single move, bulk, drag, edit, Tidy) would have to record events.
- **A counter per `(user, host, folder)`** — cheap reads, but it drifts from reality when links are moved back, trashed or deleted, and still records behaviour.
- **Dismissed domains as an array on `ai_settings`** — no new table, but ties a rules feature to AI settings, needs its own cap and is lost by "Delete AI data".
