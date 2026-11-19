# 0056. New view dialog: a view from a phrase counts one Ask question, Haiku with structured output and names only; AI sets a link's kind only while it is `other` and the user never chose it

- Status: Proposed
- Date: 2026-11-19
- Source: issue #535, `docs/design/screens/ViewFromPhrase.dc.html` (frames A, B, C, E), [0038](0038-link-kind-and-saved-views.md), [0047](0047-ai-provider-models-and-cost.md), [0052](0052-ask-your-shelf-streaming.md) point 7, [0055](0055-ask-chat-with-tools.md)

## Context

- Saved views are the feed's filter under a name; today "+ Save view" only asks for the name. The author approved a dialog where every row of the filter is editable (works without AI) and, with AI on, a phrase fills the same rows (Nov 19, 2026).
- The phrase is one short model call that turns text into a `SavedViewQuery`. It must be counted against an existing allowance; no new counter.
- The link job already asks the model for a `kind` (`LINK_OUTPUT_SCHEMA`), but the answer is never written. Starter views "Videos" and "Articles" read 0 for talks on blogs because `og:type` says nothing.

## Decision

1. **Allowance.** A phrase counts **one Ask question** (`ai_ask_usage.questions`, `AskUsageService.reserve` under the `ai-ask:<userId>` lock, refunded when the model fails, refuses or answers nothing usable). It is the same shape as a question (short user text, one answer, Free 5 a month, AI pack 50 a day / 500 a month) and the allowance is already shown in the app. It needs the AI main switch, not the Ask switch. The link allowance stays for links only, so the usage line in Settings › AI keeps meaning "links processed".
2. **Endpoint.** `POST /api/ai/view-draft { phrase }` (3 to 200 characters after trimming) answers 200 `{ outcome: done | quota | unavailable, draft, allowance }`; 409 while AI is off. Nothing is stored: the dialog fills its rows and the user saves through `POST /api/views` as before. `RATE_LIMIT.AiViewDraft`.
3. **Model and prompt.** `AI_MODEL.ViewDraft` = Claude Haiku 5.5, effort low, `thinking: disabled`, structured output (`VIEW_DRAFT_OUTPUT_SCHEMA`), `max_tokens` 512, through `AiProvider.draftView` (mock for tests, demo and every non-production build: `planMockViewDraft`, shared with the web mock). The user message holds the phrase and the user's folder paths and tag names (most used first, capped) in delimited blocks with `<` escaped; never links, notes, URLs or ids.
4. **Validation.** `parseViewDraftOutput` (contracts, shared with the web mock) maps names back to the user's live folders and tags, keeps at most `SAVED_VIEW_LIMIT.TagsMax` tags, turns unknown folder and tag names into search words, keeps at most `LINK_LIMIT.QueryTermsMax` words and names what did not fit (`dropped`). AI never creates a tag or a folder. The model's one-line `note` says what a view cannot express ("not watched"); the dialog shows it, so nothing is dropped silently.
5. **AI link kind.** A new column `links.kind_by_user` (boolean, default false; a migration, false for existing rows) is set by `PATCH /api/links/:id` with `kind`, and cleared when a new URL recomputes the kind from the host. A create never sets it (its `kind` is the preview's). `AiApplyService` writes the model's kind (video, article, shopping) only while the link's kind is `other` and `kind_by_user` is false, in the same guarded statement as the other results; a kind from `og:type` or the host is never replaced. The kind is a quiet correction, not a suggestion: it has no spark, no undo and does not count as "something found" for the job (the user changes it in Edit link, which sets the flag).

## Consequences

- A heavy phrase user spends Ask questions; on Free a phrase is one of the 5 monthly questions. Revisit when Pro limits change.
- Existing links whose kind a user set to `other` before this change can be re-kinded by AI once (no flag yet). Accepted: rare, and the user can change it back, which sets the flag.
