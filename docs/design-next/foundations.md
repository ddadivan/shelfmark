# Step 3: foundations (proposal)

Status: **approved.** Palette: **C · Graphite** (author's choice); Ink and Sage stay as accent variants in Settings › Appearance. Radii revised after the author's review: controls are no longer pills ([section 3](#3-radius)). A visual version of this page, with the three palettes switchable in both themes, is published as a private artifact (link in the README).

These foundations replace `docs/design/tokens.*` for the new design. When approved, they are recorded in an ADR and become the token source for `libs/ui`.

## 1. Type

One family for the whole interface: **Onest** (variable, self-hosted, full Cyrillic for the Ukrainian translation). **JetBrains Mono** only for addresses in fields and keyboard caps.

Base 16px. Fixed tiers below the base, **Major Second (1.125)** above it, rounded to two decimals in rem. Line-height is unitless and gets tighter as size grows.

| Token | Size | Line-height | Weight | Use |
| --- | --- | --- | --- | --- |
| `text-meta` | 0.75rem (12) | 1.4 | 400 / 500 | Domains, dates, counts, keyboard caps, helper text. **Only** metadata |
| `text-secondary` | 0.875rem (14) | 1.5 | 400 / 500 | Sidebar rows, buttons, chips, menus, summaries, form labels, compact rows |
| `text-body` | 1rem (16) | 1.5 | 400 | Body text, form values, card titles (600), list row titles (600) |
| `title-s` | 1.13rem (18) | 1.25 | 600 | Section headings in settings, panel titles |
| `title-m` | 1.27rem (20.3) | 1.25 | 600 | Dialog and slide-over titles, Reader subheadings |
| `title-l` | 1.42rem (22.8) | 1.2 | 600 | Reader article title on phones |
| `display-s` | 1.6rem (25.6) | 1.2 | 600 | Page titles in the app ("All links", folder name) |
| `display` | 2.03rem (32.4) | 1.15 | 600 | Sign-in, empty states, Reader article title on desktop; −0.01em tracking allowed from here up |
| `display-l` | 2.57rem (41) | 1.1 | 600 | Landing only |

Rules: three weights only (400, 500, 600). No text below 12px. Primary content (card titles, list rows, form values) is body or secondary, never meta. Reader text is `text-body` at 1.125rem by default (reading setting) with line-height 1.6 and a 65–70ch measure.

## 2. Space

An 8pt grid for components, 4pt for micro gaps: `4, 8, 12, 16, 24, 32, 48, 64`.

| Use | Value |
| --- | --- |
| Icon to label, chip inner gap | 4–8 |
| Inside controls, between chips | 8 |
| Card padding | 16 (12 on phones) |
| Gap between cards | 16 (8 on phones) |
| Gap between groups in a page | 24 |
| Page top and section breaks | 32–48 |
| Page gutter | 16 phone, 24 tablet, 32 desktop |

## 3. Radius

On the 4pt grid and concentric (inner radius = outer radius − padding). Controls are rounded rectangles, not pills: pills read soft and take width; a modest radius keeps the interface precise and calm.

| Token | Value | Use |
| --- | --- | --- |
| `radius-xs` | 4 | Favicons, keyboard caps, badges, small inner parts |
| `radius-sm` | 8 | Buttons, inputs, the search field, chips and saved views, rows, menu items, segmented items, card cover (12 − 4) |
| `radius-md` | 12 | Cards, menus, popovers, toasts, segmented track (8 + 4 padding), folder tiles |
| `radius-lg` | 16 | Sidebar panel, dialogs, slide-overs, the Link page panel, the phone tab bar |
| `radius-full` | 999 | Only round things: avatars, switches, the play button, count dots |

The Custom theme no longer changes radii (D7).

## 4. Elevation

Border first, then a soft shadow; never glass.

| Level | Role | Border | Shadow (light) | Dark mode |
| --- | --- | --- | --- | --- |
| L0 | Canvas | none | none | none |
| L1 | Sidebar, cards, list panels, inputs | 1px `line` (fg at 8%) | `0 1px 2px` at 4% | border at 12%, inset top highlight 5% white, no shadow |
| L2 | Menus, popovers, the tab bar, hovered cards | 1px `line-strong` (fg at 14%) | `0 4px 12px` at 6% | border at 20%, shadow at 30% black, inset highlight |
| L3 | Dialogs, slide-overs | 1px `line-strong` | `0 8px 24px` at 7% + scrim | scrim 60% black, inset highlight |

Lists and tables always sit on an L1 panel with hairline row dividers.

## 5. Sizes, layout and motion

| What | Value |
| --- | --- |
| Buttons | 32 (small), 40 (default), 48 (large); touch targets at least 44×44 |
| Inputs | 40 (48 on phones) |
| Sidebar rows | 32 (40 on touch) |
| Icons | 16 in controls, 20 in navigation, 24 in empty states and tiles |
| Sidebar | 264 wide; tablet rail 72 |
| Content | fluid; Reader and forms capped at 70ch / 640px |
| Breakpoints | phone < 40em · tablet 40–64em (rail + top bar) · desktop ≥ 64em · wide ≥ 80em (side by side, Link page beside the list) |
| Motion | 120 ms exits and hovers, 200 ms entrances, 320 ms large surfaces; `ease-out` in, `ease-in` out; one signature moment (a saved link lands in the feed); reduced motion: fades only |

## 6. Colour

### 6.1 Roles

Every colour is a role, not a hue. The same roles exist in all three options, so the choice changes values only.

| Role | Use | Share of the screen |
| --- | --- | --- |
| `l0` canvas | Page background | ~60% |
| `l1` surface, `hover`, `pressed`, `line`, `line-strong` | Sidebar, cards, panels, rows | ~30% |
| `fg`, `muted` | Text; muted for meta and helper text | |
| `control` | Borders of inputs, checkboxes (3:1) | |
| `accent`, `on-accent` | The one main action per view (Add link), links in text, the current navigation item, the active view, switches | ≤ 10% |
| `accent-bg`, `accent-text` | Selected rows and chips | |
| `focus` | 2px focus ring | |
| `ai`, `ai-bg` | The spark, AI suggestion edges; never a fill for text blocks | |
| `danger`, `warning`, `success` | Status, always with an icon and words | |
| `star` | The favorite star | |
| Folder pairs | 8 colour pairs chosen by the person (glyph on tile) | |

Link previews are the colour on the screen; the interface stays neutral around them.

### 6.2 Three options

All values pass WCAG AA in both themes (computed; table in 6.3).

| Role | A · Ink (light / dark) | B · Sage (light / dark) | C · Graphite (light / dark) |
| --- | --- | --- | --- |
| `l0` | `#F5F6F8` / `#0F1115` | `#F4F5F2` / `#0F1210` | `#F5F5F4` / `#0F0F0F` |
| `l1` | `#FFFFFF` / `#171A20` | `#FFFFFF` / `#171B18` | `#FFFFFF` / `#181818` |
| `hover` | `#EEF0F3` / `#20242C` | `#ECEEE9` / `#1F2420` | `#EFEFED` / `#222222` |
| `fg` | `#14171C` / `#E9ECF1` | `#161A16` / `#E8ECE8` | `#171717` / `#EDEDED` |
| `muted` | `#5B6270` / `#9BA2AF` | `#596059` / `#9AA29A` | `#5D5D5A` / `#A1A1A1` |
| `accent` | `#2A5BD7` / `#82A6FF` | `#3B7443` / `#86C08E` | `#171717` / `#EDEDED` |
| `accent-bg` | `#E8EEFC` / `#1A2440` | `#E4EFE4` / `#1B2A1D` | `#EBEBE8` / `#2A2A2A` |
| `focus` | `#2A5BD7` / `#82A6FF` | `#3B7443` / `#86C08E` | `#2563EB` / `#6EA8FE` |
| `ai` | `#7346C9` / `#BBA0FF` (violet, to stay apart from the blue accent) | `#4C54B5` / `#A9AEF2` | `#4C54B5` / `#A9AEF2` |
| `star` | `#B26A00` / `#F0B44C` | same | same |

- **A · Ink.** A calm blue accent. The most familiar signal for "this is clickable" (links, the main button, focus). Neutral cool greys. AI moves to violet so it doesn't read as a link.
- **B · Sage.** The brand green, deeper and used only within the 10% budget: main button, current item, focus. Greys with a slight green bias. Closest to today's identity.
- **C · Graphite.** No colour accent at all: the main button and the current item are graphite, selection is a neutral tint, focus is blue for visibility. The calmest option; previews and folder colours stand out most. The sage notch stays only in the logo.

**Chosen: C · Graphite.** Ink and Sage become accent variants in Settings › Appearance (Accent: Graphite, Ink, Sage, or an own colour in the Custom theme).

Why Graphite: It serves the product's idea best (the saved content is the colour), keeps the accent budget near zero, works with eight folder colours and the AI indigo without clashes, and ages well. A is the safe alternative if the interface feels too quiet; B if keeping the green identity matters more than calm.

### 6.3 Contrast (computed)

Minimums: text 4.5:1, UI parts and the focus ring 3:1.

| Check | min | A light | A dark | B light | B dark | C light | C dark |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Text on canvas | 4.5 | 16.61 | 15.96 | 16.08 | 15.79 | 16.43 | 16.37 |
| Muted on surface | 4.5 | 6.13 | 6.79 | 6.48 | 6.64 | 6.61 | 6.87 |
| Muted on hover | 4.5 | 5.37 | 6.06 | 5.54 | 6.01 | 5.74 | 6.16 |
| Muted on selected | 4.5 | 5.27 | 5.97 | 5.48 | 5.74 | 5.53 | 5.56 |
| Accent on surface | 3 | 5.87 | 7.34 | 5.58 | 8.24 | 17.93 | 15.17 |
| Text on the main button | 4.5 | 5.87 | 7.96 | 5.58 | 8.92 | 17.93 | 16.13 |
| Selected text | 4.5 | 7.04 | 9.91 | 7.28 | 10.51 | 15.01 | 12.26 |
| Focus ring on canvas | 3 | 5.43 | 7.96 | 5.10 | 8.92 | 4.74 | 7.94 |
| Control border | 3 | 3.34 | 3.81 | 3.50 | 3.66 | 3.61 | 3.59 |
| AI mark on surface | 4.5 | 6.09 | 7.95 | 6.48 | 8.31 | 6.48 | 8.48 |
| Danger text | 4.5 | 5.55 | 6.27 | 5.55 | 6.26 | 5.55 | 6.39 |
| Favorite star | 3 | 4.24 | 9.41 | 4.24 | 9.40 | 4.24 | 9.59 |

Folder colour pairs keep the values already checked in the current design (glyph on tile ≥ 4.5:1 in both themes).

## 7. What changes against the shipped design

| Area | Shipped (2027 Refresh) | New |
| --- | --- | --- |
| Type | 15 body, 13 label, 40 display | 16 body, 14 secondary, 12 meta; Major Second headings; page titles 25.6 |
| Radii | 8 / 14 / 22 / 28, pill controls | 4 / 8 / 12 / 16, concentric; controls are rounded rectangles (8), not pills |
| Elevation | whisper ring shadow, glass on floating layers | 1px border first, shadows ≤ 7%, no glass |
| Accent | sage on many fills | one accent within 10% (option chosen in 6.2) |
| Sidebar rows | 36 | 32 (40 on touch) |
| Tablet | phone shell | rail + top bar |
