# 0047. AI provider, models and cost: Claude via the Anthropic API, Voyage embeddings, a mock everywhere else

- Status: Proposed
- Date: 2026-11-17
- Source: issue #476 (feature list and design), parent #388, foundation #389, `docs/ai/FEATURES.md`, `docs/PROJECT.md` 5.6 and 5.8

## Context

- The AI features (F0–F8 in `docs/ai/FEATURES.md`) are approved and designed. Every one needs a language model; search by meaning (F3), Ask your shelf (F4), related links (F7) and clean-up (F5) also need embeddings.
- Rules from day one (5.6): a mock provider in dev, unit, e2e, CI and the demo; graceful degradation; per-user quotas plus a provider spend limit; opt-in; background processing; prompt-injection defence; self-hosting with its own key; link content never used for statistics.
- Today there are two users (the author and a friend). Both get everything; Free / Pro / AI pack must still be possible later without rework.
- Prices checked on 2026-11-17: Claude Haiku 5.5 $0.10 / $0.50 per million input / output tokens, Claude Sonnet 5.5 $2 / $10, Claude Opus 5.5 $4 / $20; the Message Batches API is 50% cheaper; Voyage AI `voyage-4-lite` $0.02 per million tokens with 200 million free tokens shared across the voyage-4 family.

## Decision

1. **Provider: Anthropic API, called directly** from `apps/api` with the official `@anthropic-ai/sdk`, behind an `AiProvider` interface (contracts in `libs/shared/contracts`, implementations in the API's AI module). No gateway for v1.
2. **Models, by job**, as named constants in one config file (never string literals in services):
   - **Link job** (F1, F1b, F2: tags, folder, kind and summary in **one** call with structured output via `output_config.format`): `claude-haiku-5-5`, effort `low`. A `refusal` or invalid output marks the job `failed`; nothing is shown.
   - **Ask your shelf** (F4): `claude-sonnet-5-5`, effort `medium`, streamed, with server-side `fallbacks: "default"` on refusal. Answers cite only link ids the server retrieved for that user.
   - **Tag synonyms** (F5): the link-job model.
3. **Backfill and reprocessing** (processing existing links, model changes) go through the **Message Batches API**. The fixed instructions sit first in every request so prompt caching can apply where the prefix is long enough.
4. **Embeddings: Voyage AI `voyage-4-lite`**, 1,024 dimensions, stored with **pgvector** in Neon next to the link (`vector(1024)`, HNSW index, cosine distance), always queried with `userId` from the session and parameterised SQL only (5.8). Input: title, summary, tag names, and the note only when "Include my notes" is on. A model change re-embeds through a background job; an `embeddingModel` column records which model wrote each vector.
5. **Mock provider** (`AI_PROVIDER=mock`, the default whenever the key is missing): deterministic tags, folder, summary, vectors and canned streamed answers. It is the only provider in dev, unit, e2e, CI and the demo; a test asserts no real client is constructed there.
6. **Keys and limits.** `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY` live in Vercel (and in a self-host's own environment); read once at boot, never logged, never sent to the web app. The author sets a **$10 per month spend limit** in the Anthropic Console. Per-user quotas are counted in the database before every call (counts only, never content).
7. **Private phase entitlements.** `AI_FULL_ACCESS_EMAILS` (comma-separated, normalised like `ADMIN_EMAILS`) gives those accounts Pro and the AI pack; everyone else is Free. The account has a plan and quota fields from the start. Starting quotas: AI pack 1,000 links a month and 30 questions a day; Free 50 links a month and 5 questions a month.
8. **Data sent** is exactly what `FEATURES.md` › Disclosure lists. The privacy page names Anthropic and Voyage AI as processors; their retention periods and regions are filled in from their current terms before launch.

## Consequences

- **Cost for two users** (\~200 new links and \~60 questions a month): link jobs \~$0.10, chat \~$1.30, embeddings inside the free allowance, backfill of \~2,000 links \~$0.50 once. About **$1–2 a month**; the spend limit caps surprises.
- Two external processors (Anthropic, Voyage) to list in the privacy policy and two keys for the author to create and store.
- The job runner on Vercel (queue table, retries, how a save triggers the job) is decided in the #389 plan; this ADR does not choose it.
- Pay-as-you-go API billing is separate from any Claude subscription.
- Swapping a model is a config change plus a re-run through the Batch API; swapping the provider is a new `AiProvider` implementation.

## Alternatives

- **Vercel AI Gateway**: one bill, fallbacks across providers and spend reports, but a second processor in the data path and an extra layer for one provider. Can be added later behind `AiProvider`.
- **Claude Opus 5.5 for chat**: better answers at about twice the Sonnet price (\~+$1 a month now); revisit if answers fall short.
- **Self-hosted open model** (as Raindrop does): strongest privacy story, but a GPU server costs far more than $2 a month and is ours to run.
- **OpenAI embeddings**: similar price, but a third company; Voyage is the embeddings provider Anthropic recommends and is free at our volume.
- **No embeddings, keyword search only**: drops F3, F4 retrieval, F5 near-duplicates and F7.
