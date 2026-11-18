# 0052. Ask your shelf: an SSE stream over a POST on the same Vercel Function, server-side citations, no stored answers, daily and monthly caps

- Status: Proposed
- Date: 2026-11-17
- Source: issue #393 (F4), `docs/ai/IMPLEMENTATION-AI-4.md` section 1, `docs/ai/FEATURES.md` F4, principles 2, 5, 6 and 7, open question 4, `docs/design/components/StreamingAnswer/README.md`, `docs/PROJECT.md` 5.6 and 5.8; amends [0047](0047-ai-provider-models-and-cost.md) point 7 (question limits) and [0031](0031-rate-limiting-and-request-interceptors.md) (request timeout for one route); builds on [0049](0049-ai-job-runner-on-vercel.md) and [0051](0051-search-by-meaning-embeddings.md)

## Context

- Ask your shelf answers a question from the user's own links with Claude Sonnet 5.5 (`claude-sonnet-5-5`, ADR 0047), streamed, with numbered citations that are real link rows. It runs only when asked.
- The API is one Vercel Function (`api/index.mjs`, `maxDuration: 30` since ADR 0049) on Node, which can stream a response. Every handler is cut by the global `TimeoutInterceptor` at `REQUEST_TIMEOUT_MS = 8000` with a 504, which cannot be sent once a stream has started; a Sonnet answer of up to 700 tokens takes 10 to 20 s.
- Retrieval can use the AI-3 vectors (`link_embeddings`, query embedding with its own monthly allowance) and the word search (`buildLinkWhere`).
- ADR 0047 set "30 questions a day" for the AI pack; the design (`AskShelf` 5) shows 15; FEATURES says a heavy user (15 a day, \~$6 a month) costs more than the AI pack price idea (\~$30–50 a year).
- Model output is untrusted and rendered as text only; link titles, notes and summaries can carry prompt injection.

## Decision

1. **Transport.** `POST /api/ai/ask` with `{ question }` answers `text/event-stream` (SSE framing, one JSON object per `data:` line, typed events `meta`, `text`, `cite`, `done`, `error` from `libs/shared/contracts`). A POST keeps the question out of URLs and logs, so the web reads it with `fetch` through Angular's `HttpClient` (`withFetch`, progress events), not `EventSource`. Headers: `Cache-Control: no-store, no-transform`, `X-Accel-Buffering: no`; `flushHeaders()` before the first event. Same function, no new runtime and no new dependency.
2. **Timeout.** `TimeoutInterceptor` skips a handler marked `@LongRunning()`; the marker is allowed only on routes listed in `LONG_RUNNING_ROUTES` (today exactly `POST /api/ai/ask`), enforced by a route-scan spec like `PUBLIC_ROUTES`. The handler owns its deadlines: the first model text within 8 s (else `error` `unavailable`, refunded), a hard stop at 24 s (inside `maxDuration` 30 with a margin) that ends with `done` and `truncated: true`. A closed connection (Stop, panel closed) aborts the provider stream.
3. **Retrieval without a model.** Meaning matches (AI-3 query vector, KNN over the user's live links, provider floor) and word matches, fused by reciprocal rank, at most 10 links. Meaning is used only when the user's search status is `ready`; otherwise words only. Nothing retrieved means a fixed "not in your links" answer with no model call and nothing counted.
4. **Citations are structured, decided by the server.** Sources go to the model as numbered, delimited, escaped blocks (title, host and path, folder name, tag names, summary, saved month, the note only with "Include my notes"); never ids, never page text. A server-side citation stream turns `[n]` markers with `n` in the retrieved range into `cite` events, renumbered by first appearance, and passes every other character as `text`. `done` lists the cited links, re-read with the session `userId` and live-only. Zero valid citations means `notFound: true`.
5. **No tools, text only.** No tools or fetches during the answer; the web renders text by interpolation, without Markdown or autolinked URLs; the answer is capped at 4,000 characters. A refusal ends with `error` `rejected` and is refunded.
6. **Nothing stored.** Neither the question nor the answer is written anywhere; only counters. Logs carry status, duration, token counts and the number of sources. The web keeps the conversation in memory until the panel closes; every question is single-turn (no history is sent).
7. **Limits** (amends ADR 0047 point 7). Free: 5 questions a month. AI pack: 15 a day and a 150 a month fair-use cap (about $2 a month at \~$0.013 a question, under the AI pack price idea). UTC days and months, counted in `ai_ask_usage (user_id, day)`. A question is reserved before the model call and refunded when the stream fails before any text, the model refuses, or nothing was retrieved; a Stop after text has arrived counts. One question at a time per user through a 30 s lease on `ai_settings`. `RATE_LIMIT.AiAsk` 10 a minute per IP on top.
8. **Mock.** The mock provider streams canned answers for the demo seed themes and a template answer citing the first sources otherwise, chunked by words, with triggers for failure, refusal, a slow first token and a cut stream. The web mock API emits the same event sequence for the mock build.

## Consequences

- Answers start within about a second of the model's first token, on the existing function and deployment.
- One route escapes the 8 s timeout; its own deadlines and the spec-enforced allow-list keep that exception from spreading.
- Heavy users hit the monthly cap around day 10 and see the reset date; cost per AI pack account stays bounded at about $2 a month plus embeddings.
- Nothing to delete for "Delete AI data" or account deletion besides the counters, and no answer can leak from storage.
- Vercel must not buffer the stream; this is checked on a preview deployment before release. If it buffers, the answer arrives at once at the end (still correct, slower).
- Revisit when chat memory is wanted (needs storage and retention rules), or when answer quality calls for Opus.

## Alternatives considered

- **`EventSource` (GET)** — automatic reconnects, but the question would sit in the URL, in access logs and in history, and a reconnect would ask (and pay) again.
- **Chunked NDJSON** — equally simple, but `text/event-stream` is the content type proxies are known not to buffer or compress.
- **A separate streaming function or Edge runtime** — a second entry point, a second build and auth path for one route.
- **No streaming (one JSON answer)** — breaks the 8 s timeout for long answers and the design's streaming state.
- **Citations parsed in the browser from free text** — the client would decide which links are sources; the server mapping keeps citations to links it retrieved for that user.
- **Storing answers** — enables history and sharing, but adds retention, export and deletion duties for no v1 need.
- **30 questions a day (ADR 0047)** — up to \~$12 a month per heavy account, several times the AI pack price idea.
