# Shelfmark Next

A calm shelf for everything you save, and a way back to it. Shelfmark keeps links people save (videos, articles, clothes, recipes, tools) so they can **save** anything in one move, **find** it in seconds and **come back** to it before it is forgotten. The interface stays graphite and quiet so the saved pages are the colour on the screen.

This system replaces the 2027 Refresh. It follows the visual-taste rules (type, colour, spacing, no decorative noise) and the structure in the repository's `docs/design-next/` (flows-and-structure.md, foundations.md, screen-map.md).

## Content fundamentals

- English UI through translation keys (seven languages); plan for strings 40% longer.
- Short, plain, friendly. Prefer verbs: "Add link", "Saved", "Nothing found". Sentence case, never ALL CAPS, no exclamation marks, no "successfully", no emoji.
- Buttons: verb first, 1–3 words, no final period. Destructive confirmations name the thing: "Delete “Wool overshirt” forever?".
- Errors say what happened and what to do, in one sentence: "Couldn't load a preview. The link is saved with its address as the title."
- Empty states invite: the heading names the space ("Your links will live here"), one sentence, up to three actions.
- Counts as words ("12 links, 2 subfolders"). Domains with their favicon; dates in tooltips or at the end of a row.

## Visual foundations

### Colour: Graphite
Neutral greys with no colour accent. `accent` is graphite: the one main action per view, switches, the active view. `focus` is the only blue. Sage and Ink exist as accent variants in Settings › Appearance (`accent-sage`, `accent-ink`).

| Share | Roles |
| --- | --- |
| ~60% | `canvas` |
| ~30% | `surface`, `surface-hover`, `surface-pressed`, `line`, `line-strong` |
| ≤10% | `accent`, `accent-bg` |

Status colours (`danger`, `warning`, `success`) always come with words and an icon. `star` is only the favorite star. `ai` is only the spark and the edge of AI suggestions. Folder colours (`folder-*`) appear only in folder tiles, chosen by the person. All text passes 4.5:1 and UI parts 3:1 in both themes.

### Type
One family, Onest; JetBrains Mono for addresses and key caps; Literata and Atkinson Hyperlegible only as Reader options. Body 16, secondary 14, meta 12 (metadata only, never primary content); headings on a Major Second scale (`title-s` 18 to `display` 32.4). Weights 400, 500, 600. Line height 1.5 for text, 1.2–1.25 for headings.

### Space and size
8pt grid for components, 4pt for small gaps (`space-4` … `space-64`). Controls 32 / 40 / 48; touch targets 44. Sidebar 264, tablet rail 72, reading measure 68ch.

### Radius
Concentric on the 4pt grid: `radius-xs` 4, `radius-sm` 8 (every control: buttons, inputs, search, chips, rows), `radius-md` 12 (cards, menus, popovers), `radius-lg` 16 (sidebar, dialogs, panels). Pills are only for round things (`radius-full`: avatars, switches).

### Elevation
Border first, then a soft shadow; no glass anywhere.
- L0 `canvas`.
- L1 `surface` + 1px `line` + `shadow-l1`: sidebar, cards, list panels, inputs. Lists always sit on an L1 panel with hairline rows.
- L2 + `line-strong` + `shadow-l2`: menus, popovers, the tab bar, a hovered card.
- L3 + `shadow-l3` over `scrim`: dialogs and slide-overs.
- Dark theme: no shadows on L1; `highlight` (a 1px top edge) instead.

### Motion
Fast in, faster out: 200 ms entrances (`duration-base`), 120 ms exits and hovers, 320 ms for slide-overs. One signature moment: a saved link lands in the feed. Reduced motion: fades only.

### Layout
- Desktop (from 64em): sidebar with Library (All links, Unsorted, Favorites), Revisit, Pinned, Folders, Tags, Trash; top bar with search, Add link and the avatar menu (settings, theme, shortcuts, help).
- Wide (from 80em): the Link page opens beside a compact list; side by side.
- Tablet (40–64em): icon rail and top bar.
- Phone: tab bar (Library, Revisit, Add, Search, You); one or two columns; sheets for menus.

### Surfaces
One field: edit in place. Under 10 seconds: a popover (Filter, Move, Remind me, Colour and icon). Several fields: a slide-over (Share, Rule). Long or multi-step: a page (Import, Settings). Dialogs only for confirmations and a few announcements; never a dialog on a dialog.

## Iconography

Shelfmark's own outline set on a 24px grid, 1.75px line, round caps; 16px in controls, 20px in navigation, 24px in empty states. Icons take the colour of their text. Website favicons show at 16px in a `radius-xs` square; a missing favicon is the site's first letter. The logo is the card-with-bookmark mark (Logos group) followed by "Shelfmark" in Onest 600.

## AI

A quiet helper inside saving (it files new links), search (meaning and "Ask your shelf" in the same field) and Revisit (summaries, forgotten links). Off until turned on. Marked by the spark in `ai`; accepted suggestions become ordinary content. Never a separate tab, a fill, a gradient or a glow. Limits show as one muted line where the content would be.

## Components

Actions: Button, IconButton. Forms: Input, Search, SegmentedControl, Chip, Switch. Navigation: NavItem, TabBar. Content: LinkCard, LinkRow, Tag, FolderTile, ReaderView, AiMark. Overlays: Menu, Popover, SlideOver, Dialog. Feedback: Toast, EmptyState.

Components are styled by `components/bundle.css` (class prefix `sm-`) on top of the tokens; each folder's README says how the component behaves and which `libs/ui` component implements it.
