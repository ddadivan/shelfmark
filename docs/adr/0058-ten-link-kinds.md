# 0058. Ten link kinds, detected at save by deterministic rules; JSON-LD read as data with caps

- Status: Proposed
- Date: 2026-11-19
- Source: issue #537 (approved by the author on Nov 19, 2026), [0038](0038-link-kind-and-saved-views.md), [0057](0057-view-from-phrase-and-ai-link-kind.md) point 5

## Context

- Four kinds (video, article, shopping, other) leave most saved links as `other`: podcasts, PDFs, repositories, app store pages and social posts. Saved views and the type filter are only as useful as the kinds.
- The kind must still be set at save without the user doing anything, and without a model call on the save path.
- Many such pages describe themselves badly: a LinkedIn post says `og:type=article`, a GitHub repository `object`, a recipe blog `article`.

## Decision

1. **Kinds.** `LINK_KIND` is video, article, shopping, podcast, document, code, app, post, recipe, other (contracts). Migration `20261212120000_link_kinds` widens the `links_kind_check` CHECK in place; it changes no row, so every existing link keeps its kind (no host backfill: the user may have set it, and `kind_by_user` did not exist for older edits).
2. **Detection** (`deriveLinkKind(url, signals)`, pure, shared by the API and the web mock), first match wins:
   1. a PDF: the response media type (`PDF_CONTENT_TYPES`) or a `.pdf` path;
   2. certain hosts and paths (`LINK_KIND_URL_RULES`, data, a subdomain matches): podcasts (Spotify episodes and shows, Apple Podcasts), documents (Google Docs, Slides, Sheets; SlideShare, Speaker Deck), code (GitHub, GitLab, npm, Bitbucket, PyPI), apps (App Store, Google Play apps, Chrome Web Store), posts (X / Twitter status URLs, Threads posts, LinkedIn posts, Reddit comment threads, Bluesky posts). These win over `og:type`;
   3. a schema.org `Recipe` among the top-level JSON-LD entities of the head;
   4. `og:type`: `video.*`, `audio.*` / `podcast.*` (podcast; `music.*` is not a podcast), `app` / `application` / `software` (app), `recipe`, `article`, `product.*` (shopping);
   5. the known video and shop hosts of ADR 0038; else `other`.
3. **PDFs.** The fetcher refuses non-HTML; its `SafeFetchError` now carries the refused response's media type (`contentType`, only for `NotHtml`, only from an address that passed the SSRF policy), and `LinkPreviewService` passes it to `fallbackPreview`. Every failure still gives the same fallback otherwise.
4. **JSON-LD** is untrusted data: only `<script type="application/ld+json">` inside the already capped head (32 K characters) is read, at most 4 blocks, a block over 16 K characters is skipped, it is only `JSON.parse`d (never evaluated or rendered), malformed blocks are skipped, and at most 64 entities per block (root, root array items, `@graph` members, never nested properties) are looked at for `@type`.
5. **AI.** The link job may answer any of the ten kinds; it is still written only while the kind is `other` and `kind_by_user` is false (ADR 0057). A view from a phrase may ask for the nine kinds other than `other` (`VIEW_DRAFT_KINDS`).
6. **UI.** The type row of the new view dialog is a `ui-select` ("All types" plus the ten kinds, each with an icon: existing glyphs plus the new `mic`, `file` and `smartphone`); Edit link uses the same options and singular labels (`links.kindOption.*`) in all seven languages.

## Consequences

- More links land in a useful kind without AI; the rules are a list to extend, not code.
- A URL rule can be wrong for an odd page on a known host (a GitHub blog post reads as code); the user can change it in Edit link, which AI then respects.
- Recipes on pages whose JSON-LD sits in the body or past the head cap stay `article` / `other` unless AI fills the kind.
- Old links keep their kind; the new kinds appear for new saves, a changed URL, AI on `other`, and user edits.
