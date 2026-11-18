# AI-2 implementation plan: Tidy Unsorted and rule offers

Nov 17, 2026 · architect plan for F1a "Tidy Unsorted — review suggestions in bulk" and F1b "Learn from corrections, then offer a rule" (#390, extends #398), one branch `feat/390-ai-tidy-rules` (from the AI-1 tip, PR #483), one PR into `stage` · sources: `docs/ai/FEATURES.md` (F1a, F1b, principle 3, disclosure), `docs/design/screens/AiTidy.dc.html`, `AiTags.dc.html` 9 (rule offer), `MobileAi.dc.html` 6 (Tidy on the phone), component `Suggestion` (review-list mode), the AI-1 code (`apps/api/src/ai/**`, `apps/api/src/rules/**`, `links-bulk.service.ts`, `apps/web/src/app/features/{ai,rules,library}/`), ADR 0047 / 0049, new ADR 0050.

**In scope.** The Tidy review page (desktop and phone) over the stored AI-1 suggestions of links in Unsorted, its entry in the Unsorted header, one apply request per run with one Undo; rule offers ("Always put youtube.com links in Videos?") detected from the user's own links, Create rule through the existing rules API, "Not now" remembered per domain; earlier choices for the same site passed to the model as examples (the "learning" half of F1b).

**Out of scope.** The Import summary entry ("Tidy the imported links": #387 is not built; the Tidy route is ready for it); pre-save chips in the Paste many review list (open question 4); tag rule offers (open question 3); new folders from suggestions (cut from MVP in FEATURES); any automatic re-sort.

Principles this plan enforces: AI never re-sorts silently (nothing here runs without a click); Tidy applies only suggestions the user left selected, and never over a folder the user chose meanwhile; a rule always wins over AI (also inside Tidy); one Undo reverts a whole apply run.

## 1. Data model (decision, ADR 0050)

**No correction-event log.** The pattern behind a rule offer ("the same choice three times") and the examples for the prompt are derived on demand from data Shelfmark already keeps: the user's live links of one site (`ruleHost(url)`), their folders and tags, and the `link_suggestions` states (an open `auto-applied` folder is AI's choice, not the user's, so it does not count). An accepted suggestion is the user's data (disclosure rule 2), so it counts like a manual move. Nothing new is recorded about what the user did, there is no history to export, delete or leak, and "never used for statistics" holds by construction. Consequence: the offer reads "your last 3 links from this site are in Videos", not "you moved 3 links" (a link saved straight into Videos counts too, which is the same intent).

**One small table: `rule_offer_dismissals`** (migration `20261127120000_rule_offer_dismissals`): `user_id` (FK `users`, cascade), `domain VarChar(253)` (as `ruleHost` returns it), `created_at`; `@@id([userId, domain])`. Written only by "Not now", read by the offer check; cascades with the account and the demo cleanup. It is rules data, not AI data: `DELETE /api/ai/data` leaves it.

**One index:** `link_suggestions @@index([userId, state])` for the Tidy list and count (same migration).

Alternatives (in ADR 0050): an append-only `ai_corrections` table (exact "you moved" wording, but a behaviour log that needs retention, export and deletion rules, for no better offers); a counter per `(user, host, folder)` (cheap, but drifts from reality when links are deleted, moved back or trashed); dismissed domains as an array on `ai_settings` (ties a rules feature to AI settings and has no natural cap).

## 2. Contracts (one type per file, `as const` + derived union)

`libs/shared/contracts/src/ai/`:

| File | Shape |
| --- | --- |
| `tidy-limit.const.ts` | `TIDY_LIMIT = { PageMax: 100, SuggestionIdsPerLinkMax: 5 }` (`PageMax` = `LINK_LIMIT.BatchMax`: one page is one apply request) |
| `tidy-item.interface.ts` | `{ link: LinkResponse; suggestions: LinkSuggestion[] }` (only `suggested` rows, already filtered: live own folder, tag not yet on the link, no folder suggestion when a rule decides the folder) |
| `tidy-list-response.interface.ts` | `{ items: TidyItem[]; total: number }` (newest first, at most `PageMax`; `total` counts all) |
| `tidy-count-response.interface.ts` | `{ total: number }` |
| `tidy-apply-item.interface.ts` | `{ linkId: string; suggestionIds: string[] }` (the chips left selected) |
| `tidy-apply-request.interface.ts` | `{ items: TidyApplyItem[] }` (1 to `PageMax`) |
| `tidy-undo-item.interface.ts` | `{ linkId: string; folderId: string \| null; tags: string[]; suggestionIds: string[] }` (what the run actually changed on that link) |
| `tidy-undo-request.interface.ts` | `{ items: TidyUndoItem[] }` |
| `tidy-apply-response.interface.ts` | `{ links: LinkResponse[]; applied: number; folders: number; tagsAdded: number; skipped: number; undo: TidyUndoRequest }` |
| `tidy-undo-response.interface.ts` | `{ links: LinkResponse[] }` |

`AI_ENDPOINT` gains `Tidy: '/api/ai/tidy'`, `TidyCount: '/api/ai/tidy/count'`, `TidyApply: '/api/ai/tidy/apply'`, `TidyUndo: '/api/ai/tidy/undo'`.

`libs/shared/contracts/src/rules/`:

| File | Shape |
| --- | --- |
| `rule-offer-limit.const.ts` | `RULE_OFFER_LIMIT = { SameChoiceMin: 3, CandidatesMax: 20, HostsPerCheckMax: 5 }` |
| `rule-offer.interface.ts` | `{ domain: string; folderId: string; count: number }` |
| `check-rule-offer-request.interface.ts` | `{ linkIds: string[] }` (1 to `LINK_LIMIT.BatchMax`) |
| `rule-offer-response.interface.ts` | `{ offer: RuleOffer \| null }` |
| `dismiss-rule-offer-request.interface.ts` | `{ domain: string }` (validated with `normalizeRuleDomain`) |
| `rule-offer-endpoint.const.ts` | `RULE_OFFER_ENDPOINT = { Check: '/api/rules/offers/check', Dismiss: '/api/rules/offers/dismiss' }` |

Create rule reuses `CreateRuleRequest` `{ domain, folderId }` on `POST /api/rules`. No change to existing contracts.

## 3. API

### 3.1 Tidy (`apps/api/src/ai/tidy/`: `ai-tidy.service.ts`, `ai-tidy-undo.service.ts`, `to-tidy-item.ts`; `ai-tidy.controller.ts`; DTOs in `ai/dto/`)

`AiModule` imports `RulesModule` (it has no imports of its own, so no cycle with `LinksModule`) for `RulesService.matcher`.

| Method | Path | Behaviour | Rate limit |
| --- | --- | --- | --- |
| GET | `/api/ai/tidy` | `TidyListResponse`: the user's live links with `folder_id IS NULL` and at least one `suggested` row after filtering, `created_at DESC, id DESC`, first `PageMax`. Filtering: folder suggestions only for a live own folder and only when no rule with a live folder matches the link (rule wins); tag suggestions not already on the link (case-insensitive); a `new-tag` whose name now exists reads as `tag`. AI off → `{ items: [], total: 0 }` | Default |
| GET | `/api/ai/tidy/count` | `{ total }` with the same filter (the Unsorted button) | Default |
| POST | `/api/ai/tidy/apply` | One transaction, locks `folders:` → `tags:` (ADR 0033). Per item: only the user's live link, still in Unsorted for the folder part (a folder the user chose meanwhile is never replaced), only its own `suggested` rows among `suggestionIds` (others ignored, so the answer never tells whether an id exists for someone else); folder must be live; tags resolved with `TagsService.resolveNames` (a `new-tag` is created); tags past `LINK_LIMIT.TagsMax` are left off that link and counted in `skipped`. Writes `folder_id`, `updated_at` (the user's edit), `link_tags`; applied rows → `accepted`; unselected rows stay `suggested`. Answers the changed links, counts and the exact `undo` payload. AI off → 409 `AiOff`. Quota is not touched | `AiTidy` 20/min |
| POST | `/api/ai/tidy/undo` | Same locks. Per item, only where the run's change is still there: folder back to `NULL` (and `pinned_in_folder_at` cleared) while `folder_id` still equals the applied one; the listed tags removed while still on the link; the listed rows `accepted` → `suggested` (the link reappears in Tidy). Tags created by the run stay as empty tags, like bulk tag Undo. Foreign or missing ids are ignored. Works with AI off | `AiTidy` |

The undo payload comes back from the client, which is safe because every statement is scoped by the session `userId` and conditional on the current state; no run table is needed.

### 3.2 Rule offers (`apps/api/src/rules/offers/`: `rule-offers.service.ts`, `rule-offers.controller.ts`, DTOs)

They live in `RulesModule`: a rule is not AI (FEATURES F1b "Free: rules are not AI"). The server does not look at AI settings; the web decides when to ask (open question 2).

| Method | Path | Behaviour | Rate limit |
| --- | --- | --- | --- |
| POST | `/api/rules/offers/check` | Read-only. `RuleOfferResponse` for links the user just filed. Steps: the given live own links that have a folder → distinct `ruleHost`s (at most `HostsPerCheckMax`); skip a host that is dismissed, matched by any of the user's rules (`findMatchingRule`), or when the user is at `RULE_LIMIT.PerUserMax`; candidates = the user's live links whose URL contains the host (escaped `ILIKE`, like `RulesService.matches`), newest `CandidatesMax`, kept when `ruleHost` equals the host; the newest `SameChoiceMin` must share one live folder and none may carry an open `auto-applied` folder suggestion. First qualifying host → `{ domain, folderId, count }`, else `null` | `RuleOffer` 60/min |
| POST | `/api/rules/offers/dismiss` | Upsert into `rule_offer_dismissals`, 204 (idempotent) | `RuleWrite` |

### 3.3 Learning: earlier choices as examples (`apps/api/src/ai/runner/load-site-examples.ts`)

The link job input gains `examples: readonly { folderKey: string | null; tags: readonly string[] }[]`: up to `AI_RUNNER_LIMIT.PromptExamplesMax = 3` of the user's other live links with the same `ruleHost`, newest first, that have a folder or tags, excluding open `auto-applied` marks. Only folder keys (`f1`, mapped back server-side) and the user's own tag names go in; never titles, URLs or notes of other links, so nothing new is sent (FEATURES F1 privacy). `build-link-prompt` adds an "Earlier choices for this site" block after the vocabulary; `parse-link-output` is unchanged (only own tags and keys survive). Backfill loads examples for a whole chunk with one query. Dismissed suggestions are not passed (they already never come back for their link).

`RATE_LIMIT` gains `AiTidy: { limit: 20, ttl: MINUTE_MS }` and `RuleOffer: { limit: 60, ttl: MINUTE_MS }`. Demo seed (`apps/api/src/demo/seed.json`): Unsorted links with folder and tag suggestions (at least 12, matching the design count), two `youtube.com` links already in Videos and one in Unsorted with a Videos suggestion, so applying Tidy produces the offer.

## 4. Web and `libs/ui`

**`libs/ui`: nothing new.** `ui-suggestion` already has `selected` / `toggled` (review mode), `ui-suggestion-row` the toolbar group, `ToastService` has `TOAST_DURATION_MS.Sticky` (0), `secondary` and close reasons, the `moved` toast shows a folder tile.

**`features/ai/`** (`frontend-dev`):

- `models/ai-api.interface.ts` + `http/http-ai.api.ts` + `mock/mock-ai.api.ts`: `getTidy()`, `getTidyCount()`, `applyTidy(request)`, `undoTidy(request)`. The mock reads its stored suggestions and the mock library, applies the same filters and writes through the mock links API so the feed and counts stay right.
- `services/tidy-count.store.ts` (root SignalStore): `total`, `load()`; loaded when Unsorted opens while `AiSettingsStore.isOn`, refreshed when `pendingJobs` drops to 0 after a tick, after an apply or undo, and cleared on sign-out (no `localStorage`).
- `components/tidy-entry/`: the "Tidy with suggestions {n}" secondary button with the spark, rendered in the library toolbar only for the Unsorted scope, AI on and `total ≥ 1` (a component of its own: `library.page.ts` is already at 262 lines). Phone: same component in the Unsorted page header.
- `pages/tidy/tidy.page.*`: route `unsorted/tidy` inside the shell (`APP_PATH.Tidy`, lazy, `redirectToSignIn` twin), a guard that sends to `/unsorted` while AI is off. Header "Tidy Unsorted", "Suggestions for {n} links. Tap a chip to leave it out.", Cancel (back to Unsorted) and the one primary "Apply to {n} links". Desktop: one row per link (title, favicon and host, the chips in a `ui-suggestion-row` `role="group"` "Changes for {title}", Skip). Phone (`ViewportService.compact`): one card per link, the apply bar floats where the tab bar is and the tab bar hides (the pushed-page treatment of the phone settings pages). Chips start `selected`; toggling flips them; × on an unselected chip calls the existing dismiss and removes it; a row with no selected chip counts as skipped. Skip shows "Skipped — stays in Unsorted" with "Undo skip"; skips live only in the page (nothing stored). "{n} more links after these" when `total > PageMax`. Empty state (spark tile on `ai-bg`, "Nothing to tidy", "Back to Unsorted") when the list is empty or everything is skipped.
- `services/tidy.store.ts` (page-scoped): items, `selected` per suggestion id, skipped ids, derived `applyCount`, `applying`; `services/tidy-apply.service.ts`: sends the run, patches `LinksStore` (links leave Unsorted, tags change), refreshes folder, tag and saved-view counts like `BulkLinkActionsService`, shows the `moved` toast "Tidied {n} links" / "Moved into {f} folders, {t} tags added" with Undo (`TOAST_DURATION_MS.Undo`, Ctrl/⌘+Z), Undo calls `undoTidy(undo)` and patches back, then reloads the page list; when more remain, loads the next page.

**`features/rules/`** (`frontend-dev`):

- Rules API seam + mock: `checkOffer(linkIds)`, `dismissOffer(domain)` (the mock uses the same algorithm over the mock library).
- `services/rule-offer.service.ts` (root): `afterFiling(linkIds, toast?)`. Runs only while `AiSettingsStore.isOn`. When the filing showed an Undo toast it waits for that toast to close for a reason other than Undo (a new toast would replace it and lose the Undo); otherwise it asks at once. An offer shows a sticky `moved` toast with the folder tile: "Always put {domain} links in {folder}?", detail "Your last {count} links from this site are there. A rule works without AI.", action "Create rule", secondary "Not now". Create rule → `RulesStore.create({ domain, folderId })`, then a toast "Rule created" with "Apply to Unsorted" running `RuleActionsService.applyToExisting(rule)` (count, confirm, bulk move, Undo). "Not now" or the × (`Dismissed`) → `dismissOffer(domain)`; `Replaced` and `Timeout` store nothing. At most one check in flight; the same domain is not asked again in this page session after an answer.
- Triggers (one line each): Tidy apply, `BulkLinkActionsService.moveTo`, the single move (`LinkActionsService`, move picker and drag in `LibraryDragService`), Edit link save with a changed folder, Add link save with a folder the user or an accepted suggestion chose. Not after Automatic mode or a rule (not the user's choice).

**Transloco** (all seven languages, same commit, plural keys via `pluralKey`): `ai.tidy.entry`, `ai.tidy.title`, `ai.tidy.lead`, `ai.tidy.cancel`, `ai.tidy.apply`, `ai.tidy.skip`, `ai.tidy.skipped`, `ai.tidy.undoSkip`, `ai.tidy.rowLabel`, `ai.tidy.chip.folder` / `tag` / `newTag` (`… , added` variants for the selected state), `ai.tidy.more`, `ai.tidy.empty.title` / `text` / `back`, `ai.tidy.toast.title` / `detail` / `failed`, `ai.tidy.undone`; `rules.offer.title`, `rules.offer.detail`, `rules.offer.create`, `rules.offer.notNow`, `rules.offer.created`, `rules.offer.applyExisting`, `rules.offer.failed`.

## 5. Tests (`test-engineer`)

- **Unit (api, ≥ 80%)**: `to-tidy-item` filters (trashed folder, tag already on link, `new-tag` now existing, rule with live folder hides the folder chip, rule with trashed folder does not); offer detection (fewer than 3, mixed folders, one auto-applied mark, trashed folder, dismissed domain, matching rule incl. parent domain, rule cap, `www.` and subdomain hosts, punycode); `load-site-examples` (own links only, excludes the link itself and auto-applied marks, at most 3); prompt spec: examples block holds keys and tag names only.
- **Integration (PGlite)**: apply moves and tags in one transaction and marks `accepted`; a link moved by the user between list and apply keeps its folder (tags still apply); tags past `TagsMax` → `skipped`; a failing item rolls nothing back partially (all or nothing per request on a DB error); AI off → 409; undo restores exactly, leaves a later user change alone, makes rows `suggested` again; lock order with a concurrent folder delete; rule offer after three filings and none after "Not now"; `DELETE /api/ai/data` keeps dismissals.
- **Data isolation (`expectIsolated`, two users)**: `GET /api/ai/tidy` and `/count` never list or count B's links; apply with B's link id, or A's link with B's suggestion id, changes nothing of B's and applies 0; undo with B's link ids or folder id changes nothing; offer check with B's link ids → `null`, and B's links never count toward A's pattern; dismiss by A does not hide B's offer; the prompt input captured by the mock never contains B's folders or tags as examples.
- **Web**: specs for `TidyStore` (selection, skip, counts), `TidyApplyService` (patching, Undo, failure toast and rollback), `TidyCountStore`, `RuleOfferService` (waits for the Undo toast, close reasons, AI off asks nothing), the entry component, the page (harnesses for `ui-suggestion`, axe).
- **e2e (mock build)** `ai-tidy.spec.ts`: desktop — the button with its count in Unsorted, review, toggle a chip off, Skip and Undo skip, Apply, toast, links gone from Unsorted, Undo brings them back, empty state, AI off hides the button and the route redirects; the rule offer after the seeded YouTube apply → Create rule → shown in Settings › Library › Rules, and "Not now" → no offer on the next YouTube move. `@phone`: cards, floating apply bar, no tab bar, Undo. Visual: `library.visual` (Unsorted header with the button), new Tidy shots light and dark; baselines from CI.

## 6. Docs

`docs/PROJECT.md`: 5.6 status (AI-2), 6.1 `rule_offer_dismissals` and the index, 6.2 the six endpoints, 5.8 AI row: "Tidy applies only stored suggestions the user selected; rule offers read only the user's own links, no event log". `apps/api/CLAUDE.md` (Tidy, rule offers, `AiModule` imports `RulesModule`), `apps/web/CLAUDE.md` (Tidy page, count store, rule-offer service and its triggers). `docs/ai/FEATURES.md` stays as approved. ADR 0050 and its row in `docs/adr/README.md`. Changelog draft entry (`features/changelog/models/changelog.const.ts`).

## 7. Commits (each builds and passes `npm run affected`)

1. `docs(ai): AI-2 implementation plan` (architect) — this file and ADR 0050.
2. `feat(contracts): tidy and rule-offer types` — section 2.
3. `feat(api): rule offer dismissals table and suggestion state index` — migration, schema spec.
4. `feat(api): Tidy list, count, apply and undo` — 3.1, `RATE_LIMIT.AiTidy`.
5. `feat(api): rule offers check and dismiss` — 3.2, `RATE_LIMIT.RuleOffer`.
6. `feat(api): earlier choices for the same site in the link prompt` — 3.3.
7. `feat(api): demo seed for Tidy and the rule offer`.
8. `feat(web): Tidy and rule-offer api seams and mocks` (can start right after 2, parallel to 3–7 in a second worktree; rebase onto the branch after 7).
9. `feat(web): Tidy entry in Unsorted and the review page` — desktop and phone, empty state.
10. `feat(web): Tidy apply with one Undo`.
11. `feat(web): rule offer toast and its triggers`.
12. `feat(web): translations` (if not already in 9–11; every key in seven files in the commit that adds it is preferred).
13. `test: Tidy and rule-offer isolation and e2e journeys` (most tests land with their commits).
14. `docs: PROJECT 5.6 / 5.8 / 6, CLAUDE files, changelog`.

## 7a. Added Nov 18, 2026: links from a screenshot (F9)

The author added F9 to AI-2 (`docs/ai/FEATURES.md` › F9). To plan before AI-2 starts:

- Provider: an image block in the link job request (Claude Haiku 5.5 reads images); structured output `{ urls[], title?, note? }`, validated like `parseLinkOutput`; URLs only `http(s)`, de-duplicated, at most 20.
- API: `POST /api/ai/screenshot` (multipart or base64, size and type limits, rate limit, quota = one link); the image is held in memory for the call only, never written to the database, logs or storage.
- Web: paste / drop an image in Add link and Paste many → the Paste many review list; phone Share target accepts `image/*`.
- Design: a screen in `docs/design` (desktop and phone, states: reading, found links, no address → title and note, no text, limit, not available).
- Privacy page and AI intro: images are sent for that request and never stored.

## 8. Risks and open questions

**Risks.** The offer check scans the user's links of one host with `ILIKE` (no host column): fine at thousands of links per user, revisit with a generated `host` column if it shows in timings. Changing the prompt (examples) shifts the AI-1 prompt specs and can change suggestions; the block sits after the fixed instructions, so prompt caching is unaffected. Toast contention: an offer must never replace an Undo toast (handled by waiting for the close reason). The apply request carries up to 100 links × 5 ids; it stays well under the body limit and inside the 8 s request timeout (one transaction, set-based writes as in `LinksBulkService`). Undo after the toast is gone is not offered (same as bulk actions). Visual baselines and seeded Unsorted counts in existing e2e shift with the new seed.

**Open questions for the author (each with the default the plan uses).**

1. **Apply per row.** FEATURES F1a lists "Apply per row, Apply all, Skip"; the design (`AiTidy` 2) has one primary "Apply to {n} links" and Skip per row ("Apply is the one primary action of the page"). Default: the design — one run, one Undo; Skip plus chip toggles cover per-row choice.
2. **Rule offers with AI off.** Rules are not AI, but the offer is part of the AI feature set and "people who keep AI off never see AI". Default: offers only while AI is on; the server endpoints do not depend on it, so turning them on for everyone later is a web change.
3. **Tag offers.** F1b says "one folder or one tag"; the design only shows the folder toast. Default: folder offers only in AI-2; a tag offer ("Always tag github.com links with code?") later on the same check.
4. **Paste many review chips** (AI-1 answer 4 moved them to AI-2). Pre-save chips mean up to 100 model calls before saving. Default: no pre-save chips; when the pasted links' jobs finish (`AiFollowUpService.watchMany`) and some in Unsorted have suggestions, a status toast "Suggestions ready for {n} links" with "Review" opens Tidy.
5. **Offer copy.** The design says "You moved the last 3 there"; derived detection cannot tell a move from a save into the folder. Default: "Your last 3 links from this site are there. A rule works without AI."

## 9. Implementation notes

What the code does differently from sections 1–7, and the defaults taken for section 8 (Nov 17, 2026, branch `feat/390-ai-tidy-rules`).

**Deviations**

- **Offer count.** `RuleOffer.count` is not fixed at 3: `detectRuleOffer` counts how many of the site's newest links in a row share the folder (at least `SameChoiceMin`, at most `CandidatesMax`), so the toast can say "Your last 7 links from this site are there".
- **Apply re-checks rules.** Tidy apply runs the same filter as the list under its locks, so a rule created between list and apply keeps the folder (the folder row stays `suggested`, the tags still apply). Apply answers and its `undo` payload carry only what the writes changed (`updateManyAndReturn` for moves, `createManyAndReturn` for tags); a part that did not apply leaves its row open.
- **Filter file name.** The list filter is `apps/api/src/ai/tidy/filter-tidy-suggestions.ts` (not `to-tidy-item.ts`): it filters the stored rows; the item is assembled in `AiTidyService`.
- **Paging.** `GET /api/ai/tidy` takes `?after=<linkId>` (contract `TidyListQuery`): the web reads the next page after the last listed link once an apply leaves more, or from "Show the next links" when every link on the page is skipped or left out, so skipped links never hold the page. `total` counts from the page on. List and count read at most `TIDY_SCAN.RowsMax` (500) rows and have their own rate limit (`AiTidyRead`, 60 a minute).
- **Prompt.** The examples block is `<earlier_choices>`, and the system prompt gained one line on how to use it (prefer the same folder and tags when they fit, only keys and tags from the vocabulary). Example tags are kept only when they are in the prompt's tag vocabulary.
- **Rule offers.** Candidates are read in batches (`RULE_OFFER_SCAN`) and filtered by the exact host before the `CandidatesMax` cut, so addresses that merely contain the host cannot push the site's links out. "Not now" is capped at 500 sites per user (`RULE_OFFER_DISMISSAL_LIMIT`, the oldest go first). The web merges filings that come while a check waits into the newest one and skips a check while an offer toast is up.
- **Empty state.** The "Nothing to tidy" tile (spark on `ai-bg`) is drawn in the Tidy page, not a `libs/ui` component (one use).
- **Row label.** The row's chip group is labelled "Changes for {title}" for assistive tech only; the visible row shows the spark on the chips, no text label.
- **Load error.** A failed list load shows the empty state (no AI error toasts, ever), with the way back to Unsorted.
- **Mock "Not now".** The mock keeps dismissed sites in memory (`MockLibraryData.ruleOfferDismissals`), so a reload forgets them; the API stores them.
- **Nothing applied.** An apply that changed nothing (everything decided, moved or ruled meanwhile) shows an info toast "Nothing to apply" and the page reloads.

**Defaults taken for section 8**

1. Apply per row: the design. One "Apply to {n} links", one Undo; Skip and chip toggles cover per-row choice.
2. Rule offers with AI off: offers only while AI is on; the server endpoints do not read AI settings.
3. Tag offers: folder offers only; tag offers later on the same check.
4. Paste many review chips: no pre-save chips. The "Suggestions ready for {n} links" toast after a paste is not built in AI-2; links from Paste many reach Tidy through the Unsorted button, and the route is ready for that toast (and for the Import summary, #387).
5. Offer copy: "Your last {count} links from this site are there. A rule works without AI."
