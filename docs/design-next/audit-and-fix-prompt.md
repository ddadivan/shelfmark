# Task: design-token cleanup of libs/ui (type, radii, colour, noise)

You are the tech lead in the Shelfmark repo. Follow `CLAUDE.md` (branching from fresh `stage`, Conventional Commits, small commits, no `main`/`stage` commits, the agent flow in PROJECT.md 8.2). Dispatch the work to `ui-dev` (libs/ui) and `frontend-dev` (apps/web, apps/extension), then `test-engineer`, `code-reviewer`. Load `create-ui-component` and `angular-v22-rules` before touching components.

## Source of truth and how to resolve conflicts

1. `docs/design/BRAND.md`, `docs/design/tokens.css` / `tokens.json`, `docs/design/components/<Name>/README.md` are the rules. `docs/design/reference.css` is reference only — it has drift of its own (18/12/10/9/5/3px radii, 11px text), so "the mockup does it" is not a justification by itself.
2. Generic UX skills (typography / colour-palette / anti-slop) are a lens for finding noise, **not** a replacement scale. Where they disagree with BRAND.md, BRAND.md wins. In particular keep the Shelfmark type scale (display 40/44, title 22/28, heading 16/24, body 15/22, label 13/18, caption 12/16, mono 13/20) — do NOT switch to 16/14/12.
3. Any new token, new type style, or change of an existing token value is a design change: **stop and ask the author first** with a short mapping table, then record it in `docs/design/tokens.json`, `tokens.css`, `BRAND.md` and an ADR in `docs/adr/`. Do not invent tokens silently.

## Phase 0 — issue and branch

Create an issue "chore(ui): align libs/ui with design tokens — type, radii, colour, noise" with the findings below as a checklist, branch `chore/<issue>-design-token-cleanup` from fresh `stage`. Split into several PRs if the diff grows (suggested: 1 typography, 2 radii, 3 colour/shadow/noise, 4 apps/web + lint guard).

## Phase 1 — propose token decisions (ask the author before Phase 2)

Prepare one table and wait for approval:

| Problem | Proposal |
|---|---|
| 18px radius is used by every floating panel (menu, popover, select, picker-menu, command-list popup, emoji panel, toast, drop-zone, tag-input, tab-bar items) but there is no token (`--radius-fab` is documented as "no other component uses it") | Option A: rename/extend to `--radius-float: 18px` for floating layers; Option B: map them to `radius-lg` (22) or `radius-md` (14). Recommend A. |
| 12px / 10px / 9px rows and items inside 18px panels | Make them concentric: `calc(var(--radius-float) - <panel padding>)` instead of literals. |
| 2–3px radii on bars (progress, meter, steps, highlight, flag, dialog handle, sheet grabber) and 5px on kbd hints | Either `radius-full` for bars/handles and `radius-sm` for kbd, or a new `--radius-xs` (4px). Recommend no new token. |
| 14/20 text used as an override in 7 places (tree row, tree reorder, toast, radio title, streaming answer, command-list rows) — the Toast spec asks for 14/20 medium | Either add a named style (e.g. `body-sm` 14/20) to tokens + `_typography.scss`, or map each to `body` (15/22) / `label` (13/18). |
| 11px text (menu-item `__hint` kbd, suggestion `__new`, avatar `--sm` initials, favicon letter) | Floor is 12px (caption). Kbd hint → `caption`/`mono` at 12; `__new` → `caption`. Avatar initials and favicon letter are glyphs scaled from the box — allowed only if derived from the container size, document that exception. |
| Disabled/inactive opacity varies: 0.45 / 0.5 / 0.55 / 0.6 / 0.7 across button, checkbox, switch, radio, segmented, chip, menu-item, field, drop-zone, choice-grid | One token `--disabled-opacity` (one value), used everywhere for disabled controls. BRAND forbids opacity for busy/stale text — check none of them is used for that. |
| Literal shadows: switch thumb `color-mix(text 25%)`, segmented thumb `color-mix(text 12%)`, card selected ring, theme-picker / choice-grid rings | Tokens: `--shadow-thumb`, and reuse `focus-ring` / `accent` ring tokens for selection rings. |
| `shadow-float` (22% alpha), `shadow-card-spread` (28%), `shadow-card-press` (25%) in light theme are much heavier than the "whisper" language in BRAND.md | Only flag to the author; do not change without approval. |

## Phase 2 — typography

- Rule: every text style goes through `@include type(<style>)` from `libs/ui/src/styles/_typography.scss`. **No `font-size`, `line-height`, `font-weight` or `letter-spacing` override after the mixin.** Today ~35 raw `font-size` in libs/ui and ~84 in apps, plus ~35 raw `line-height` and ~36 raw `font-weight` declarations in libs/ui.
- Known overrides to fix in libs/ui: `tree/tree.component.scss` (body → 14/20), `tree/tree-reorder.scss`, `toast/toast.component.scss` (body → 14/20 500), `radio-group` (`label` → 14/20), `streaming-answer`, `command-list/command-list-rows.scss` (14px), `command-list.component.scss` (`1.1rem`, 19px, 16px), `card/card-content.scss` (`heading` → 16/22, i.e. the line-height differs from the token 24), `button/button-sizes.scss` (sm 12px, lg 15px — check against the Button spec), `button.component.scss` (13px duplicated from `label`), `chip` (12px), `notice`, `folder-chip`, `toast-actions` (13/12), `avatar` (13/11/18), `rating-scale` (18), `empty-state` (22/28/24/16), `dialog` (34), `emoji-picker` (24/16 — emoji glyphs are allowed), `tooltip-panel` (12 → `caption`).
- Weights: only 400 / 500 / 600 (already true) and only via the mixin; remove standalone `font-weight` where the style already sets it.
- Letter-spacing: only from `display` (−0.03em) and `title` (−0.01em). Remove ad-hoc `-0.005em`, `-0.02em`, `-0.04em` (landing hero), `0.04em` (ask-sources, ask-conversation — looks like uppercase-style labels; BRAND bans ALL CAPS, check and remove).
- Large display numbers in apps (34/54/64/74/76/84/88/96/112px on library, phone-library, landing, ai-announce) — use `display`, or ask the author to approve a `display-lg` style for the landing page only.

## Phase 3 — radii

- Allowed: `var(--radius-sm|md|lg|xl|full)`, the approved floating token, `50%` for circles, `inherit`, and `calc(<token> - <padding>)` for concentric inner corners. Nothing else.
- Raw `rem(Npx)` radii in libs/ui to replace (≈50): picker-menu, emoji-picker (grid, panel, sheet), dialog + dialog-parts, bulk-bar (26, 18), skeleton (16), empty-state (20), tag-input (18, 12), popover (18), streaming-answer (20/20/6 bubble, 9, 6, 1), theme-picker (16, 8, 5), list-item (10), select + select-list (18, 12), card preview (16 — legit concentric 22−6, express as `calc(var(--radius-lg) - <inset>)`), drop-zone (18), input (5), flag (3), picker-list (12), menu + menu-item (18, 12), theme-preview (3), command-list popup/rows (18, 5, 12, 10, 6), steps / highlight / meter / progress-bar (3, 2), search-trigger kbd (5), tab-bar (26, 18, 20), toast + toast-actions (18, 10, 9, 2, 6).
- Same in apps/web (`grep -rn "border-radius: *rem(" apps`).
- Check that the Custom theme (`styles/tokens/_custom.scss`, user-tunable corners) now drives every corner: a hard-coded radius ignores the user's corner setting — that is a real bug, not cosmetics.

## Phase 4 — colour, elevation, noise

- `--space-5` is used in `apps/web/.../ai/pages/tidy/tidy.page.scss` and `.../cleanup/cleanup.page.scss` but is **not defined** (scale is 1,2,3,4,6,8) → the gap silently falls back to 0. Fix to `--space-4` or `--space-6` per the screen mockup.
- Raw colours: libs/ui is clean except `color-picker` (functional hue/saturation gradients — keep) and `saved-views` mask (`#000` in a mask — fine). apps/web + extension have ~89 raw hex/rgb values — replace with tokens except functional cases (masks, color-picker), list exceptions in the PR.
- Ad-hoc `color-mix(...)` (19 in libs/ui, 5 in apps): if a mix is reused or represents a state (hover tint, selected tint, halo), make it a token; one-offs must have a comment why.
- Glass: `card/card-content.scss` `.ui-card__fallback` uses `backdrop-filter: blur(6px)` on a card — BRAND says glass never on cards. Replace with an opaque `surface` fill (or get author approval).
- Gradients: BRAND allows exactly one decorative gradient (AI intro tile `ai-bg → accent-bg`). Remove `ai-announce-dialog` radial-gradient glow (BRAND: "no glow"). Check `folder-banner` colour band (160deg tint gradient) — the component has no spec in `docs/design/components/`; ask the author whether it stays, and if yes, add a spec. Skeleton shimmer, scroll-fade and mask gradients are functional — keep.
- Accent (sage) use is mostly correct (switch, radio dot, meter, progress, steps, tree drop indicator). Verify `settings-index.page.scss:114` and `account-shelf.component.scss:144` fill only small indicators, not large areas.
- Off-grid spacing: padding/margin/gap literals of 2/5/6/7/9/10/14/18px in libs/ui (6px and 10px appear ~42 times each). Map to the 4px scale (`space-1..8`) or a documented exception (card preview 6px inset, density row padding). Do not change component heights/hit targets (40/32/48 buttons, 44 inputs, 36 rows, 44×44 touch).

## Phase 4b — quiet down loud elements (seen in the running app, v2.6.0, demo, light + dark)

BRAND.md: "The interface stays quiet and graphite so the link previews are the colour on the screen; sage appears only where colour carries meaning", "`primary` for the ONE main action per view", "Never fill a large area with sage". The All links screen currently breaks this. Check every item against its `screens/*.dc.html` mockup first; where the mockup itself is loud, ask the author.

Priority 1 — sage on large areas:
- **Card placeholders** (`libs/ui/.../card/card.component.scss` `.ui-card__placeholder[data-tone='0']` = `accent-bg`): every third card without an image is a big sage block; in dark it reads as a dark-green slab. Rotate only neutral tones (`surface-hover`, `surface-pressed`, and maybe `bg`), no `accent-bg`.
- **Extension banner** (`apps/web/.../library/components/extension-banner`): full-width `accent-bg` block (188px) with the heading in `accent-text` — the loudest thing on the screen, louder than the links. Make it a `surface` panel with `shadow-card`, heading in `text`, Install as a secondary button.
- **Demo banner** (`shell/demo-banner`, `ui-notice` Info `banner`): full-width sage band on every page. Make the Info notice neutral (`surface` / `surface-hover`, icon in `text-muted`), or a quiet top line; sage is for meaning, not for "info".
- Card **fallback letter** (`.ui-card__fallback` on `accent-bg` + `accent-text`) → neutral.

Priority 2 — too many "primary" (graphite filled) buttons on one view:
- On All links there are four black pills: Add link (correct), Install extension, demo-banner "Sign in with your own account", and the active saved view "All 58". Keep only Add link as `primary`; Install → secondary; demo Sign in → secondary/ghost; the active saved view (`saved-views.component.scss:65` `background: var(--primary)`) → `surface` with `shadow-card` or the selected style of the segmented control (as Cards/List switcher already does).
- Same check for `rating-scale` (`--primary` fill on the selected value), `date-picker` (selected day), `tab-bar` centre "+" (FAB is in the spec — leave), `tooltip-panel` (graphite tooltip is spec — leave).

Priority 3 — AI colour outside its budget:
- **Ask button in the header** (`features/ai/components/ask-header-button`, `variant="ai"` + `ai-line` border): BRAND allows `ai-fill` only on the one "Fill in with AI" button. Make Ask a ghost/secondary button with the spark in `ai` (as in `AiSearch.dc.html` / `AskShelf.dc.html`), no fill, no indigo edge.
- Spark before every card summary is correct (disclosure); keep it 16px and `ai` only.

Priority 4 — sidebar colour competition:
- **Folder highlight** (`libs/ui/src/styles/_folder-highlight.scss`): highlighted folders (Recipes amber, Work blue) get a 55% tint fill at rest — two coloured rows compete with the real current row (All links in sage). Proposal: at rest only the folder icon tile carries the colour; the row fill only on the current row (or reduce rest tint to ~25%). Author decision (#440 feature).
- **Tags in the sidebar**: six filled `accent-bg` chips in a block look like six active filters. Sidebar tags → plain rows / neutral chips (`surface-hover`), sage only on a selected tag. Tags on cards stay sage chips (BRAND), but check that `+1` / `+2` overflow chips are neutral (they are).
- "5 forgotten" note in `accent` text next to Recently opened → `text-muted` (it is a count, not a signal), or keep sage only if the author wants it as a call to action.

Priority 5 — dark theme:
- Large sage areas get worse in dark (`accent-bg` #21301E slabs on #111113): fixing P1 fixes this; re-check card placeholders, demo banner, extension banner, selected sidebar row.
- Light-theme `shadow-float` (22%) on toasts/menus is heavier than everything else on the page — flag to the author (see Phase 1).

Verify by screenshot (desktop 1440 and phone 390, light and dark) before/after: on the All links screen the only saturated colours left should be the link previews, the one Add link button, sage on the current nav row/tags/favorite stars, and the spark marks.

## Phase 5 — guard against regressions

Extend `stylelint.config.mjs` (keep the existing rem/em rules):
- `declaration-property-value-disallowed-list` / custom rule: forbid `border-radius` with a literal length (allow `var(`, `calc(`, `50%`, `0`, `inherit`); forbid literal `font-size` / `line-height` / `letter-spacing` outside `_typography.scss` (allow `inherit`, `var(`, and a documented allowlist for glyph sizing: emoji, avatar initials, favicon letter, logo); forbid hex/rgb/hsl colours outside `styles/tokens/**` and `color-picker/**`.
- A unit test (or a stylelint plugin) that every `var(--x)` used in SCSS is defined in the tokens (would have caught `--space-5`).

## Definition of done

- `npm run lint:styles`, `npm run affected` (lint, typecheck, test, build) pass; libs/ui coverage ≥ 80%.
- Storybook (`npm run storybook`): visually check every changed component in Light, Dark and a Custom theme with changed corners; attach before/after screenshots (desktop + 360px phone) for menu, select, popover, toast, tab-bar, card, tree, dialog, empty-state to the PR.
- Playwright e2e green on desktop, tablet, phone.
- `code-reviewer` checks the diff against BRAND.md; no visual change that the author did not approve in Phase 1.
- PR into `stage` (squash) with `Refs #<issue>`, list of intentional exceptions, and the approved token table. Update the Status section of `docs/PROJECT.md` and leave _Done / Left / Next step_ on the issue.
