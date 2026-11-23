# Step 6: migration plan to Shelfmark Next

Status: **draft for the author's review.** Decision record: [ADR 0060](../adr/0060-design-next-foundations.md).

How to bring the shipped app (`libs/ui`, `apps/web`, `apps/extension`) to the new design: the [foundations](foundations.md), the design system "Shelfmark Next" (`design-system/`) and the screen designs (`designs/01-…07-*.html`). Behaviour changes from [flows and structure](flows-and-structure.md) are separate issues, so a restyle never hides a change in how something works.

## How we work

- One branch per issue from fresh `stage` (`feat/<issue>-…`, `chore/<issue>-…`), PR into `stage`, the author merges (PROJECT.md 9.3). No long-lived redesign branch: every issue leaves the app working in both the old and the new parts, because tokens change first and everything reads tokens.
- Each issue ends with `npx nx affected -t lint typecheck test build` and screenshots of the affected screens: light and dark, desktop (1280), tablet (768) and phone (390), compared with the matching state in `designs/`.
- Values come from `design-system/tokens.json`. `bundle.css` and the HTML designs are references for look, size and copy; their markup and class names are never copied into Angular. UI text goes through Transloco keys.
- WCAG 2.1 AA, `prefers-reduced-motion`, keyboard paths and focus restore are part of done for every component.
- Size: S ≈ up to half a day, M ≈ 1 day, L ≈ 2–3 days.

## 0. Switch the source of truth

| What | Files | Risk | Size |
|---|---|---|---|
| Move `docs/design-next/` to the design source of truth: CLAUDE.md, `apps/web/CLAUDE.md`, `libs/ui/CLAUDE.md`, the `create-ui-component` skill and the agent prompts point to it; `docs/design/` becomes reference. Accept ADR 0060 | docs, `.claude/` | low | S |

## 1. Foundations in `libs/ui`

| What | Files | Risk | Size |
|---|---|---|---|
| Colour tokens: Graphite light / dark roles (canvas, surface, surface-hover, surface-pressed, text, text-muted, line, line-strong, control, accent, on-accent, accent-bg, accent-text, focus, ai, ai-bg, danger, warning, success, star, scrim, brand-notch), 8 folder pairs, Ink and Sage accents. Contrast spec for every text / background pair in both themes | `styles/tokens/_light.scss`, `_dark.scss`, `foundations/*`, contrast specs | high: every screen changes at once | M |
| Type: Onest variable (self-hosted, Cyrillic), JetBrains Mono for addresses; scale 12 / 14 / 16 + Major Second titles; weights 400 / 500 / 600; stylelint rule against other sizes and weights | `_scale.scss`, global styles, font assets, stylelint config | medium | M |
| Space, radius (4 / 8 / 12 / 16 / full), sizes (control 32 / 40 / 48, touch 44, sidebar 264, rail 72), durations, breakpoints 40 / 64 / 80em | `_scale.scss`, `_breakpoints.scss` | medium | S |
| Elevation L1 / L2 / L3 as mixins (border, shadow, dark highlight); remove glass | `_ui.scss`, `_glass.scss` (delete), `_dialog.scss` | medium | S |
| Custom theme: base, accent, background only; drop corners (D7) | `_custom.scss`, `theme-picker`, `theme-preview` | low | S |
| Storybook foundations pages for the new tokens | `foundations/` | low | S |

## 2. Components

One issue per row. Spec: `design-system/components/<Name>/README.md`, look: its `preview.html`.

| Design system | `libs/ui` | What changes | Risk | Size |
|---|---|---|---|---|
| Button, IconButton | `button` | 8px radius, 32 / 40 / 48, primary / secondary / ghost / danger, icon-only with required label and tooltip | medium (everywhere) | S |
| Input | `input`, `field`, `textarea`, `select`, `tag-input` | 40 (48 on phones, 16px text so iOS doesn't zoom), border plus 3px focus halo, visible label always | medium | M |
| Search | `search-trigger`, `command-list` | One field for search and Ask; groups: words, close in meaning, folders and tags, Ask; filter chips; phone: full-screen panel opened from the tab bar | high | L |
| Chip, Tag | `chip`, `saved-views`, `suggestion` | 8px radius, pressed state, AI chip with spark | low | S |
| Menu | `menu`, `menu-trigger`, `picker-menu` | L2 surface; **below 40em renders as a bottom sheet** (handle, title, 48px rows, current choice ticked, closes on pick, swipe or scrim) | high: every menu | M |
| Popover | `popover`, `popover-trigger` | L2; bottom sheet on phones, same rule as Menu | medium | S |
| Sheet | `sheet` | The one bottom-sheet primitive behind Menu, Popover and Dialog on phones; one at a time, the next step replaces it | medium | M |
| Dialog | `dialog`, `_dialog.scss` | L3, 16px radius, named destructive confirmation; on phones a sheet above the keyboard | medium | S |
| SlideOver | `drawer` | Right side, L3; used for the rule editor and other few-field tasks | low | S |
| Toast | `toast` | L2, one line plus action (Undo), `role=status` / `alert`, pause on hover and focus | medium (call sites) | M |
| SegmentedControl | `segmented-control` | Track 12 / item 8 radius, radiogroup keyboard | low | S |
| Switch | `switch`, `checkbox` | Switch for settings, checkbox for selection | low | S |
| NavItem | `tree`, `list-item` | 32px rows (40 on touch), count, folder tile, active state; keyboard tree behaviour stays | medium | S |
| FolderTile | `folder-icon`, `color-picker` | 8 colours, icon set; no emoji, cover or highlight (D4) | low | S |
| LinkCard | `card`, `favicon`, `ai-line` | L1, cover inset 4px with 8px radius, **Show on cards** fields (image, description or AI summary with ✦, note, tags, site, date), ☆ and ⋯ actions (always visible on touch) | medium | M |
| LinkRow | `list-item`, `history-row` | List and Headlines rows on an L1 panel with hairline dividers | low | S |
| ReaderView | `preview-frame` + new `reader` | Site / Reader switch, reading settings (size, font, width, page tone), 65–70ch | medium | M |
| EmptyState, StateScene | `empty-state`, `illustration` | Ten animated line scenes (site blocked, empty library, nothing found, offline, error, revisit done, empty trash, reader unavailable, not found, saved) with reduced-motion fallback | low | M |
| TabBar | `tab-bar` | Library, Revisit, Add, Search, You; hidden on pushed pages | low | S |
| AiMark | `suggestion`, `ai-line` | Spark in the AI colour on suggestions, summaries and "Moved by AI" | low | S |
| Cover | `card` media | Drawn fallbacks by link kind when there is no image | low | S |

Removed after their last call site goes: `folder-banner`, `emoji-picker`, `_glass.scss`, `_folder-highlight.scss`, `theme-preview` corner controls.

## 3. Shell

| What | Where | Risk | Size |
|---|---|---|---|
| Desktop sidebar (264): All links, Unsorted, Favorites, Revisit with a count, Pinned, Folders, Tags, Trash; top bar with search, Add link, account | `apps/web` shell | medium | M |
| Tablet rail (72) with flyouts and top bar (40–64em) | shell | medium | M |
| Phone: tab bar, no top search, pushed pages full screen | shell | medium | M |
| Wide (≥ 80em): Link page beside the list; Side by side (D5) | library | medium | M |

## 4. Screens, by design group

Each row is one or more issues; the design file holds every state.

| Group | Design | Restyle | Behaviour changes (own issues) | Size |
|---|---|---|---|---|
| 1. Library and Link page | `designs/01-library.html` | Feed in four views, toolbar, saved views, cards, Link page | Click opens the preview, details hidden until "Details" (K-05); Site / Reader switch with fallback (D14); Show on cards; Rename in the link menu | L |
| 2. Save and Revisit | `designs/02-save-revisit.html` | Save panel and its states, saved landing | "Goes to … · rule" line; several links at once; Revisit page with Due, Continue reading, Forgotten, Recently opened (D2); rating card instead of modal (D12) | L |
| 3. Search and Ask | `designs/03-search.html` | Panel, results page | Words + meaning + folders + Ask in one panel; Ask answers with sources; phone full-screen search | L |
| 4. Organise | `designs/04-organise.html` | Folder page, tags, trash | Rename and new folder in a small dialog (sheet on phones); colour and icon popover; Tidy up page; rules with a slide-over editor | L |
| 5. Settings | `designs/05-settings.html` | All sections, phone "You" page | Accent options; Show on cards switches; account deletion with 7-day grace (D9) | M |
| 6. Sign-in and public | `designs/06-public.html` | Sign-in, public folder, 404, offline | Honest offline banner (D11) | S |
| 7. Extension | `designs/07-extension.html` | Popup in all states | Right-click save (D10); edit after save | M |

## 5. Order and dependencies

1. Section 0, then section 1 (tokens) in one go: after it the app already looks calmer, because every component reads tokens.
2. Section 2 in this order: Button → Input → Menu + Popover + Sheet → Dialog → Toast → the rest. Menu / Sheet before any screen, since the phone rule depends on them.
3. Section 3 (shell), then groups 1 → 2 → 3 → 4 → 5 → 6 → 7. Groups 1 and 2 are the daily path; 7 can run in parallel with 5 and 6 (different app).
4. Behaviour-change issues follow the restyle of their group, never in the same PR.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Tokens change every screen at once and break visual e2e baselines | Land tokens in one PR, regenerate baselines in the same PR, review screenshots per page |
| Menu becoming a sheet on phones changes focus and keyboard paths | Sheet built on CDK Dialog (focus trap and restore), e2e on phone for every menu |
| Toast API change touches many features | Adapter keeps the old call signature for one release; migrate call sites in the same issue |
| Fonts: Onest adds weight to the first load | Variable font, `font-display: swap`, subset Latin + Cyrillic, preload one file |
| Search plus Ask in one field depends on AI being on | AI off: no meaning group and no Ask row; words search works alone |
| Feature parity | Every feature ID in `features.md` is mapped in `flows-and-structure.md` §6; each group issue lists the IDs it covers |

## 7. Not in this plan

Saved copy and highlights (D15), browser notifications for reminders (D8), queued offline saves (D11), Pocket / Raindrop import (D10): later, after the migration.
