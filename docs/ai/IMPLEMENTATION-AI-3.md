# AI-3 implementation plan: search by meaning and related links

Nov 17, 2026 · architect plan for F3 "Smarter search" (#392) and F7 "Related links", one branch `feat/392-ai-search` (stacked on AI-2 `feat/390-ai-tidy-rules`, which stacks on AI-1), one PR into `stage` · sources: `docs/ai/FEATURES.md` (F3, F7, principles, disclosure), `docs/design/screens/AiSearch.dc.html`, `Search.dc.html`, `MobileSearch.dc.html`, `MobileAiMore.dc.html` 1, `AiDiscover.dc.html` 1, the AI-1 code (`apps/api/src/ai/**`), `apps/api/src/links/link-where.ts`, `apps/web/src/app/features/search/`, ADR 0047 / 0049, new ADR 0051.

**In scope.** Embeddings for every live link of a user who has AI and "Search by meaning" on; meaning matches inside the existing search (⌘K dialog, header search, phone Search tab) after the word matches, under "Related by meaning", each with a "why it matched" line; the "getting ready" line; Settings › AI "Search by meaning" switch with "N of M links ready"; "Related on your shelf" (up to five) in Edit link on desktop and phone; "Show related" in side by side; Delete AI data and link deletion remove vectors.

**Out of scope.** The Ask row (`AiSearch` 1 "Ask your shelf: …", AI-4); meaning matches on the library page `?q=` (open question 4); near-duplicates (F5); F8 Rediscover; word search over summaries and tag names (open question 9).

Principles enforced: search never waits for a model (the meaning request is separate from the word request); no embeddings, quota used or provider down means exactly today's search; the real provider only in production for non-demo users; vectors are queried only with the session `userId`; meaning results always carry the AI mark.

## 1. Decisions (ADR 0051)

1. **Provider seam.** A second server-side interface `EmbeddingProvider` (`apps/api/src/ai/models/embedding-provider.interface.ts`), separate from `AiProvider`: `name`, `model`, `dimensions`, `minSimilarity`, `embed(texts: readonly string[], inputType: EmbeddingInputType): Promise<EmbedOutcome>` (`EmbedOutcome` = `{ ok: true; vectors: number[][]; tokens: number } | { ok: false; retryable: boolean }`; never throws, never logs input, output or key).
   - `providers/voyage-embedding.provider.ts`: **plain HTTPS, no SDK** (no new dependency, nothing new in `api/index.mjs`). `fetch` to the pinned `VOYAGE_LIMIT.Url = 'https://api.voyageai.com/v1/embeddings'` (no base-URL variable), body `{ input, model: 'voyage-4-lite', input_type: 'document' | 'query', output_dimension: 1024, output_dtype: 'float', truncation: true }`, `redirect: 'error'`, `AbortSignal.timeout` (documents 8 s, query 1.5 s), response read with a 4 MB cap, then narrowed (one vector per input, 1,024 finite numbers each). 429 / 5xx / timeout / network → `retryable`.
   - `providers/mock-embedding.provider.ts`: deterministic feature hashing: lower-case words of 3+ letters, light suffix stripping, a small `MOCK_EMBEDDING_SYNONYMS` table (coat ~ jacket, signals ~ reactivity, ramen ~ noodles; tuned to the demo seed), each stem adds ±1 to 4 FNV-hashed dimensions, L2-normalised. A query containing `ai-fail` answers `{ ok: false, retryable: true }` (e2e).
   - `AiConfig` gains `voyageApiKey` and `useRealEmbeddings` (key `VOYAGE_API_KEY`, already in Vercel Production; same rule as Anthropic: production, not a preview, key present, `AI_PROVIDER` not `mock`). `AiProviderRegistry.embeddingsFor(user)`: real only then and not demo; else the mock.
   - Enforcement: an ESLint `no-restricted-globals` rule for `fetch` in `apps/api/src/**` with exceptions only for the Voyage provider and `monitoring.service.ts`; `vitest.setup.ts` wraps `globalThis.fetch` so any request to `api.voyageai.com` throws ("must never be called in tests"); `real-client.guard.spec.ts` pins it. `apps/api/CLAUDE.md` adds Voyage to the fixed-host exception.
2. **What is embedded** (`embeddings/build-embedding-text.ts`): title, tag names, summary (AI or user), and the note only while "Include my notes" is on; never the URL, folder names or other links. Plain lines (`Title`, `Tags`, `Summary`, `Note`), at most `AI_EMBED_LIMIT.TextMax = 2000` characters. SHA-256 of the text is stored, so an unchanged text never costs a call.
3. **Storage: `halfvec(1024)` with an HNSW index, cosine distance.** 1,024 dimensions as ADR 0047; `halfvec` halves storage and index size (2 KB per link instead of 4 KB; Neon storage is the limit that matters) with no measurable recall loss at this scale. **HNSW over IVFFlat**: it builds incrementally on an empty, growing table (IVFFlat needs training data and rebuilds as lists drift), gives better recall per millisecond, and pgvector 0.8 (Neon ships 0.8.x; PGlite's `pgvector` is 0.8.7, checked) has iterative index scans, so a global index plus `WHERE user_id = $1` still returns enough rows. Every query runs in a transaction with `set_config('hnsw.iterative_scan', 'relaxed_order', true)` and `hnsw.ef_search = 100`. Index `WITH (m = 16, ef_construction = 64)`.
4. **Freshness without one job row per link.** Instead of `ai_jobs` rows with `kind: embed`, an **embed pass** per user works on a derived set: live links with no vector, a `stale` vector, another model, or a vector whose note inclusion differs from the current setting. Hooks only flip `stale`; new links simply have no row. One mechanism covers new links, edits, tag renames and backfill, and "N of M links ready" is a count, not bookkeeping. The pass holds a per-user lease on `ai_settings` and runs inside the ADR 0049 machinery (`waitUntil`, tick, sweep). `ai_jobs.kind` keeps `link` only.
5. **Allowance.** Embeddings are about 1/1,000 of a link job, so they never touch the link quota or the one-time 5,000 link backfill. A separate monthly counter: `embedsPerMonth` Free 2,000 / AI pack 20,000 and `searchQueriesPerMonth` Free 1,000 / AI pack 10,000 (`ai_usage.embeds`, `ai_usage.search_queries`). F3 and F7 are Free (FEATURES proposal). Backfill starts by itself when the switch is on; no button.
6. **Ranking: words first, then meaning.** The word search is unchanged. A separate `GET /api/ai/search` answers only meaning matches that are **not** word matches, above the provider's `minSimilarity` and within `RelativeWindow` of the best match, at most 3 in the dialog. "Why it matched" is computed without a model: the link's tag names, folder name and summary clauses that share stems with the query (at most two), else its tags, else its folder, else the first summary clause marked "from the summary".

## 2. Contracts (`libs/shared/contracts/src/ai/`, one type per file, `as const` + derived union)

| File | Shape |
| --- | --- |
| `ai-search-state.const.ts` / `.type.ts` | `AI_SEARCH_STATE = { Off: 'off', Processing: 'processing', Ready: 'ready', Quota: 'quota', Unavailable: 'unavailable' }` |
| `ai-search-status.interface.ts` | `{ state: AiSearchState; ready: number; total: number }` (`ready` = live links with a current vector, `total` = live links) |
| `meaning-reason-source.const.ts` / `.type.ts` | `MEANING_REASON_SOURCE = { Tag: 'tag', Folder: 'folder', Summary: 'summary' }` |
| `meaning-reason.interface.ts` | `{ source: MeaningReasonSource; text: string }` (plain text, at most `WhyTextMax`) |
| `meaning-match.interface.ts` | `{ link: LinkResponse; why: MeaningReason[] }` |
| `meaning-search-query.interface.ts` | `{ q: string; limit?: number }` |
| `meaning-search-response.interface.ts` | `{ status: AiSearchStatus; items: MeaningMatch[] }` |
| `related-links-query.interface.ts` | `{ limit?: number }` |
| `related-links-response.interface.ts` | `{ status: AiSearchStatus; items: MeaningMatch[] }` |
| `ai-search-limit.const.ts` | `AI_SEARCH_LIMIT = { QueryMinChars: 3, QueryMax: 200, MeaningDefault: 3, MeaningMax: 10, RelatedDefault: 5, RelatedMax: 10, WhyMax: 2, WhyTextMax: 80 }` |

Changes: `AiSettings` + `meaningSearch: boolean`; `AiSettingsResponse` and `AiTickResponse` + `search: AiSearchStatus`; `AiQuotaLimits` + `embedsPerMonth`, `searchQueriesPerMonth` (and `AI_QUOTA` values from 1.5); `AI_ENDPOINT` + `MeaningSearch: '/api/ai/search'`, `RelatedLinks: '/api/links/:id/related'`. `UpdateAiSettingsRequest` follows `AiSettings`. Server-only shapes (`EmbeddingProvider`, `EmbedOutcome`, `EmbeddingInputType`) stay in `apps/api/src/ai/models/` (ADR 0049 point 9).

## 3. Schema and migration `20261128120000_ai_embeddings`

- `CREATE EXTENSION IF NOT EXISTS vector;`
- **`link_embeddings`**: `link_id uuid PRIMARY KEY`, `user_id uuid`, composite FK `(link_id, user_id)` → `links(id, user_id)` `ON DELETE CASCADE`, FK `user_id` → `users` cascade, `model varchar(32)`, `with_note boolean`, `input_hash char(64)`, `stale boolean DEFAULT false`, `embedding halfvec(1024) NOT NULL`, `created_at`, `updated_at`. Indexes: HNSW `(embedding halfvec_cosine_ops)`, btree `(user_id, stale)`. Prisma: `embedding Unsupported("halfvec(1024)")`; the HNSW index lives only in the migration (same as the Trash partial indexes); reads and writes through `$queryRaw` / `$executeRaw` tagged templates with a `::halfvec` cast of a validated literal (never `$queryRawUnsafe`).
- **`ai_settings`** + `meaning_search boolean NOT NULL DEFAULT true`, then `UPDATE ai_settings SET meaning_search = false` for existing rows (open question 1), `embed_lease_until`, `embed_not_before`, `embed_failures smallint DEFAULT 0`, `embed_failed_at`.
- **`ai_usage`** + `embeds int DEFAULT 0`, `search_queries int DEFAULT 0` (same one-statement reserve as `links`, partial reserve for a chunk).
- Trashed links keep their vector (restore needs no call) and are excluded from every query; purge and account deletion cascade.
- **Test and local databases:** `@electric-sql/pglite-pgvector` `0.0.17` (already in the lockfile as a peer of `pglite-socket`, matches `pglite` 0.5.16) becomes an explicit pinned devDependency, loaded as `vector` in `apps/api/test-utils/test-database.ts` and `apps/api/scripts/local-db.mjs`. Checked: `CREATE EXTENSION vector`, `halfvec(1024)`, HNSW and `<=>` work in PGlite. **CI:** the migration-check service `postgres:17-alpine` has no pgvector → `pgvector/pgvector:pg17` pinned by digest in `.github/workflows/ci.yml`.

## 4. API

### 4.1 Embed pass (`apps/api/src/ai/embeddings/`: `ai-embed.service.ts`, `build-embedding-text.ts`, `embed-candidates.ts`, `embedding-sql.ts`)

`run(userId, budgetMs)`: claim the lease (`UPDATE ai_settings SET embed_lease_until = now() + 60 s WHERE user_id = $1 AND enabled AND meaning_search AND (embed_lease_until IS NULL OR embed_lease_until < now()) AND (embed_not_before IS NULL OR embed_not_before < now()) RETURNING include_notes`); loop while budget remains: pick up to `ChunkSize = 64` candidate links, newest first, skipping links whose link job is still `pending` (their summary is on the way; the runner kicks the pass when it finishes, whatever the outcome); build texts with tag names in one query; unchanged hash → clear `stale` only; reserve `embeds` for the rest (stop at 0 → status `quota`); `embed(texts, 'document')`; upsert with `INSERT … SELECT … FROM links WHERE id = $ AND user_id = $ AND deleted_at IS NULL` (a link deleted meanwhile writes nothing), and `stale = true` when the link's `updated_at` moved during the call. Retryable failure → refund, `embed_not_before` 30 s / 2 min / 10 min by `embed_failures`; status `unavailable` while the last failure is under 15 min old. Release the lease.

Triggers (`AiEmbedService.kick(userId)` = `AiBackgroundService.defer(run)` when on): `POST /api/links` and batch create (unless a link job with a summary was enqueued), `PATCH /api/links/:id` and `PATCH /api/links/batch` (title, note, tags, summary), the link job runner after apply, failure or skip, turning AI or the switch on, `includeNotes` changes, the tick (after link jobs, inside its 6 s budget) and the sweep (users with candidates, inside 25 s). `markStale(tx, userId, linkIds | { tagId })` is one set-based `UPDATE` called by: link update, batch update, bulk tag add / remove (`LinksBulkService`), Tidy apply and undo, AI apply and undo of tags, tag rename, merge and delete (`TagsService`). Folder changes do not touch vectors (folders are not embedded). The web calls the tick while `search.state = processing` (besides AI-1's conditions).

### 4.2 Endpoints

| Method | Path | Behaviour | Rate limit |
| --- | --- | --- | --- |
| GET | `/api/ai/search?q=&limit=` | `MeaningSearchResponse`, always 200. AI or switch off → `off`, no items, no call. Readiness from one grouped count; under `ReadyShareMin = 0.8` → `processing`, no items. `q` trimmed and collapsed, 3 to 200 characters, else 400. Query vector from a per-instance LRU (500 entries, 10 min, key = SHA-256 of `userId`, model and the normalised text; nothing stored at rest) or one `embed([q], 'query')` call after reserving `search_queries` (none left → `quota`; failure → `unavailable`). KNN: user's live links, current model, `ORDER BY embedding <=> $q LIMIT 20`; filter by `minSimilarity` and `RelativeWindow = 0.15`; drop word matches with `buildLinkWhere(userId, { q })` over the candidate ids; links through `toLinkResponse`; `why` from 1.6 | `AiSearch` 60/min |
| GET | `/api/links/:id/related?limit=` | `RelatedLinksResponse`. The user's live link, else 404 (same for foreign). No model call: KNN by its own stored vector, itself excluded, same filters; no vector or off → items empty with the status. `why`: shared tag names, then the same folder, then summary clauses with shared stems | Default |

Changed: `GET` / `PATCH /api/ai/settings` (`meaningSearch`, `search`); `POST /api/ai/tick` (`search`, runs the pass); `DELETE /api/ai/data` also deletes the user's `link_embeddings`, resets the embed lease fields and sets `meaning_search = false` (open question 3); turning AI or the switch off releases the lease and keeps vectors (off keeps what was generated; nothing is sent). Logs: counts, durations and status only, never the query, texts or vectors. `RATE_LIMIT` + `AiSearch: { limit: 60, ttl: MINUTE_MS }`. Demo seed: demo users get `meaning_search = true` and vectors from the mock at seed time (set-based insert in the seed transaction).

## 5. Web and `libs/ui`

**`libs/ui`** (`ui-dev`): `ui-command-group` gets an optional `icon` input (the spark next to "Related by meaning", `ai` colour, `aria-hidden`), story and harness. Nothing else: the related list uses `ui-favicon`, `ui-icon`, `ui-tooltip`.

**`features/ai/`** (`frontend-dev`): the `AI_API` seam + HTTP + mock gain `searchMeaning(q, limit)` and `related(linkId, limit)`; the mock uses word overlap plus the same synonym list over the mock library, honours `ai-fail` and a seeded "processing" toggle for e2e. `AiSettingsStore`: `meaningSearchOn`, `searchStatus`; the follow-up tick condition adds `processing`. `components/related-links/` ("Related on your shelf": up to five rows, favicon, title, "Close to: …" with the spark and tooltip `ai.disclaimer`; opens in a new tab; hidden unless `ready` and non-empty).

**`features/search/`**: `services/meaning-search.ts` (component-scoped): after the word answer for a query has settled and the text has been stable another `MEANING_DEBOUNCE_MS = 400`, with `meaningSearchOn` and at least 3 characters, calls `searchMeaning`; `switchMap` cancels stale calls; errors become "no meaning results". `search-results` template: after the links group, a `ui-command-group` "Related by meaning" with the spark; items `meaning:<id>` (a new `SEARCH_RESULT_KIND.Meaning`, opened like links), meta = host plus "Close to: {a}, {b}" (`(from the summary)` when every reason is a summary); ids already in the word list are dropped. With no word matches the first heading reads "No links with these words"; the empty state shows only when both are empty. `processing` or `quota`: one muted line ("Search by meaning is getting ready: {ready} of {total} links. Word matches work as usual.") at most once per session (root `MeaningHintService`). Off: exactly today's list. The phone Search tab and the header panel use the same component, so they get it too.

**Settings › AI**: a "Search by meaning" switch in AI features (description names what is sent and Voyage AI), and a status line "{ready} of {total} links ready" / "Ready" / "Paused until {date}: this month's limit". Phone: the same row on You › AI. **Intro and privacy page**: name Voyage AI as the second processor and list what is sent (title, summary, tag names, note with the switch, the search text). **Edit link** (desktop dialog and phone sheet): `app-related-links` under Folder. **Side by side**: a "Show related" item in the link card and row menus (shown when `ready`; desktop and tablet) opens the split picker with `?related=<linkId>`; `SplitViewService` passes the distinct folders of up to 10 related links (Unsorted as `null`), best first, as the picker's `recentIds` with the label "Related folders".

**Transloco** (seven languages, same commit as the keys): `ai.search.related`, `ai.search.noWordMatches`, `ai.search.why`, `ai.search.fromSummary`, `ai.search.preparing`, `ai.related.title`, `ai.related.why`, `ai.related.show`, `ai.related.folders`, `ai.settings.meaning.title` / `text` / `ready` / `progress` / `quota`, `ai.intro.*` and `privacy.ai.*` additions.

## 6. Tests (`test-engineer`)

- **Unit (api, ≥ 80%)**: `build-embedding-text` (note only with the switch, caps, order); mock provider (deterministic, normalised, synonyms, `ai-fail`); Voyage provider with an injected fetch (request shape, pinned URL, timeout, redirect refused, oversized or malformed response, wrong vector count or length, NaN, key never in errors); registry and config (mock in development, test, preview, demo, without a key, with `AI_PROVIDER=mock`); ranking (threshold, window, word matches dropped) and `why` (stems, fallback order, caps); query cache (key includes `userId`, TTL, size).
- **No real provider**: the fetch guard spec; CI has no `VOYAGE_API_KEY`.
- **Integration (PGlite + pgvector)**: migration applies; the pass embeds missing, stale, other-model and note-mismatch links, skips pending link jobs, never calls for an unchanged hash, respects the lease, quota and backoff; `markStale` from every listed path; a link deleted or edited during the call; trashed links excluded, restored links come back without a call; `DELETE /api/ai/data` and switch-off; readiness under 80%; search answers `off`, `processing`, `quota`, `unavailable` with no items and 200.
- **Data isolation (`expectIsolated`, two users)**: B's links with an identical text and many B rows nearer than A's never appear in A's search or related lists; `GET /api/links/:bId/related` → 404; A's pass never reads or writes B's rows; A's Delete AI data keeps B's vectors; `markStale` with B's link or tag ids changes nothing; the same query by A and B never shares a cache entry; the texts captured by the mock never contain B's titles, tags or notes.
- **libs/ui**: command-group icon spec and story.
- **Web**: specs for `MeaningSearch` (debounce, cancel, off, short query, errors), the results template (divider, why line, no-word-matches heading, hint once per session, off = today), `related-links`, the settings row, `SplitViewService` related folders.
- **e2e (mock build)** `ai-search.spec.ts`: desktop: "talk about signals and performance" shows the word match, the divider and meaning rows with "Close to"; a query with no word matches shows only meaning rows; the processing line; AI off is today's search; the settings switch and count; Edit link related list; "Show related" fills the picker. `@phone`: Search tab with the divider, Edit sheet related list. Visual: `AiSearch` states and the settings row, light and dark; baselines from CI.

## 7. Docs

`docs/PROJECT.md`: 5.6 status (AI-3), 6.1 `link_embeddings` and the new columns, 6.2 the two endpoints and the changed ones, 5.8 AI row (vectors filtered by `userId`, raw SQL only as tagged templates, Voyage as a fixed-host exception, query text never stored). `docs/SETUP.md`: 5.3 row `VOYAGE_API_KEY` (Production only, Sensitive; already set), 5.11 Voyage account, usage alert, retention terms for the privacy page. `apps/api/CLAUDE.md` (embeddings, the pass, `markStale` duty for any new tag or title write path, the fetch exception), `apps/web/CLAUDE.md` (meaning search, related links). ADR 0051 and its row. Changelog draft entry.

## 8. Commits (each builds and passes `npm run affected`)

1. `docs(ai): AI-3 implementation plan` (architect): this file and ADR 0051.
2. `feat(contracts): search by meaning and related links types`: section 2.
3. `feat(api): pgvector, link embeddings table and AI-3 columns`: migration, schema spec, PGlite `vector` in tests and local DB, CI image.
4. `feat(api): embedding provider seam, Voyage over HTTPS and mock`: config, registry, ESLint rule, fetch guard.
5. `feat(api): embed pass, stale hooks, allowance, tick and sweep`: 4.1, settings `search`, Delete AI data.
6. `feat(api): search by meaning endpoint`: ranking, cache, `why`, `RATE_LIMIT.AiSearch`.
7. `feat(api): related links endpoint`.
8. `feat(api): demo seed vectors`.
9. `feat(ui): command group icon` (parallel to 3–8 in a second worktree after 2).
10. `feat(web): meaning search and related api seams and mocks` (parallel to 3–8 after 2; rebase after 8).
11. `feat(web): Search by meaning in Settings › AI, intro and privacy copy`.
12. `feat(web): meaning results in search`.
13. `feat(web): related links in Edit link`.
14. `feat(web): Show related in side by side`.
15. `test: embeddings isolation and e2e journeys` (most tests land with their commits).
16. `docs: PROJECT 5.6 / 5.8 / 6, SETUP, CLAUDE files, changelog`.

## 9. Risks and open questions

**Risks.** The similarity floor differs per provider and per corpus: `minSimilarity` lives on the provider, the Voyage value is a starting guess (0.35) to be tuned on the author's library after release; too low feels random, too high hides meaning results. `voyage-4-lite` request fields (`output_dimension`, `output_dtype`) must be checked against Voyage's current API reference in commit 4. `markStale` must be called from every write path that changes title, note, tags or summary; a missed path leaves an old vector (search still works, slightly off); the sweep does not detect it, so the integration spec lists every path. HNSW with a global index and many users relies on iterative scans; if Neon's pgvector is older than 0.8 in some branch, results for small users can be short (check `SELECT extversion` in commit 3). The HNSW index is invisible to Prisma; confirm the CI migration check does not report drift. Each settled query costs one Voyage call (about 10 tokens): the 400 ms extra debounce, the 3-character minimum, the cache and the monthly cap bound it. Visual baselines and seed counts shift (demo vectors, new settings row). Two processors in the privacy page; the author fills in Voyage's retention and region.

**Open questions for the author (each with the default the plan uses).**

1. **Existing AI users.** Turning the switch on by default would send data to a new processor (Voyage) without a new choice. Default: on for anyone who turns AI on from now on; off for existing settings rows (the two private-phase accounts switch it on once).
2. **When meaning results appear.** `AiSearch` 3 shows none while processing. Default: from 80% of live links ready; below, the "getting ready" line and today's results.
3. **Delete AI data and the switch.** Deleting vectors while the switch is on would rebuild them at once. Default: Delete AI data also turns "Search by meaning" off; the dialog says so.
4. **Library page `?q=`** ("Show all results"). Default: words only in AI-3; meaning stays in the dialog, header panel and phone Search tab.
5. **`halfvec` instead of `vector`** (refines ADR 0047 point 4, same 1,024 dimensions). Default: `halfvec(1024)`.
6. **Allowance numbers.** Default: Free 2,000 embeddings and 1,000 searches a month; AI pack 20,000 and 10,000. Both are Free features.
7. **Settings design gap.** `AiSettings.dc.html` has no Search by meaning row. Default: the existing switch-row pattern plus a muted status line, reviewed later.
8. **Related links in the Edit dialog cannot be dragged** to side by side (the dialog is modal), unlike the design note. Default: open in a new tab; "Show related" covers side by side.
9. **Word search over summaries and tags.** Today words match title, note and URL only. Default: unchanged in AI-3; meaning results cover summary and tag words.
