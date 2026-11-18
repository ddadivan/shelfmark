# 0050. Search by meaning: Voyage embeddings over plain HTTPS, `halfvec(1024)` with HNSW, a per-user embed pass, words first then meaning

- Status: Proposed
- Date: 2026-11-17
- Source: issue #392 (F3) and F7, `docs/ai/IMPLEMENTATION-AI-3.md` section 1, `docs/ai/FEATURES.md` F3, F7, principles 2, 6 and 7, `docs/PROJECT.md` 5.6 and 5.8; refines [0047](0047-ai-provider-models-and-cost.md) point 4 and extends [0048](0048-ai-job-runner-on-vercel.md) points 1, 5 and 10

## Context

- F3 adds meaning matches to the existing search, after the word matches, with a "why it matched" line; F7 lists up to five related links. Both need a vector per link and a vector per query.
- ADR 0047 chose Voyage `voyage-4-lite`, 1,024 dimensions, pgvector in Neon, HNSW, cosine distance; `VOYAGE_API_KEY` is set in Vercel Production. The mock provider is the only provider outside production and for demo users.
- ADR 0048 runs AI work after the response (`waitUntil`), catches up with a per-user tick and a daily sweep, and allows one SDK to call one fixed host; everything else goes through `SafeFetcherService`.
- Every query is per user (`WHERE user_id = $1`); a user has at most 10,000 links. Neon storage is the scarce resource on the current plan.
- PGlite 0.5.16 with `@electric-sql/pglite-pgvector` 0.0.17 runs pgvector 0.8.7 (`halfvec`, HNSW, `<=>` checked); the CI migration check uses `postgres:17-alpine`, which has no pgvector.

## Decision

1. **Provider seam.** A server-only `EmbeddingProvider` interface next to `AiProvider` (`embed(texts, 'document' | 'query')`, an outcome instead of exceptions, a per-provider `minSimilarity`). Voyage is called with plain `fetch` (no SDK) to the pinned `https://api.voyageai.com/v1/embeddings`, redirects refused, timeouts 8 s (documents) and 1.5 s (query), the response size-capped and narrowed. `no-restricted-globals` allows `fetch` only in that provider and the Sentry tunnel; the test setup makes any request to the Voyage host throw. The real provider is used only under the same rule as Anthropic (production, not a preview, key present, `AI_PROVIDER` not `mock`, not a demo user); otherwise a deterministic feature-hashing mock.
2. **Input.** Title, tag names, summary, and the note only while "Include my notes" is on; at most 2,000 characters; a SHA-256 of the text skips unchanged links.
3. **Storage.** `link_embeddings` (one row per link, same-user composite FK with cascade, `model`, `with_note`, `input_hash`, `stale`), column `halfvec(1024)`, one HNSW index (`halfvec_cosine_ops`, `m = 16`, `ef_construction = 64`). Queries set `hnsw.iterative_scan = relaxed_order` and `hnsw.ef_search = 100` per transaction and always filter by the session `userId` and live links. Raw SQL only as Prisma tagged templates.
4. **Freshness.** No `ai_jobs` rows for embeddings. A per-user embed pass (lease on `ai_settings`) embeds the derived set of live links without a current vector (missing, `stale`, other model, note inclusion changed) in chunks of 64, newest first, skipping links whose link job is pending. Write paths that change title, note, tags or summary mark vectors `stale` with one set-based update. The pass is started after saves, edits and link jobs, by the tick and by the sweep; backfill is the same pass.
5. **Allowance.** Separate monthly counters for document embeddings and search queries; they never use the link quota or the one-time link backfill allowance.
6. **Ranking.** The word search is unchanged and answers first. A separate meaning request returns only links that are not word matches, above `minSimilarity` and within 0.15 of the best, shown under "Related by meaning" (in `libs/ui`: a command group with an icon and a lead line, and a note slot for the "getting ready" line). "Why it matched" comes from the link's tag names, folder name and summary clauses that share stems with the query, without a model call. Meaning results appear only when at least 80% of the user's live links have a vector; otherwise the search is today's plus one muted line.

## Consequences

- No new runtime dependency and nothing new in the Vercel entry; one more fixed outbound host to document and to name in the privacy page.
- About 2 KB per link plus the index; a 10,000-link account stays near 40 MB with the index.
- New links, edits, tag renames, model changes and the note switch all converge through one pass, and "N of M links ready" is a count. The cost is a duty: every new write path that changes embedded fields must call `markStale`; a missed path leaves an old vector, not a broken search.
- Search never waits for embeddings: a provider failure, the cap or a low readiness gives today's results.
- The CI migration check must use a Postgres image with pgvector; test and local databases load the PGlite `vector` extension.
- Revisit when a better embedding model appears (re-embed by changing the model constant; the pass picks it up), when per-user filtering makes the global HNSW index slow (partitioning by user or exact scans per user), or if meaning search moves to the library page.

## Alternatives considered

- **`vector(1024)`** (ADR 0047 as written) — twice the storage for no visible gain at this scale; `halfvec` is supported by Neon and PGlite.
- **IVFFlat** — smaller and faster to build, but it needs representative data before the index is created and periodic rebuilds as the table grows from empty; HNSW handles inserts with better recall.
- **No ANN index, exact scan per user** — exact and simple at today's size, but cost grows with every user's library; HNSW with iterative scans keeps both options open (the planner may still choose the `user_id` index for small users).
- **One `ai_jobs` row per link with `kind = embed`** (the room ADR 0048 left) — retries and leases come for free, but a 10,000-link backfill means 10,000 rows, a tag rename fans out into one job per link, and readiness needs bookkeeping; the derived set needs none of that.
- **The Voyage SDK** — typed, but a new dependency in the serverless bundle and a client that reads its own base-URL settings; one POST is simple to pin and validate.
- **Merging both searches into one request with a mixed score** — one round trip, but word results would wait for the embedding call and a reciprocal-rank merge would reorder exact matches, which F3 forbids.
- **Storing query embeddings in Postgres as a cache** — survives cold starts, but keeps a derivative of every search text at rest; a per-instance in-memory cache is enough.
