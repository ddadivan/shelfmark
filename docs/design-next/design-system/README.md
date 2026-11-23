# Shelfmark Next

A calm shelf for everything you save, and a way back to it. Shelfmark keeps links people save (videos, articles, clothes, recipes, tools) so they can **save** anything in one move, **find** it in seconds and **come back** to it before it is forgotten. The interface is one light panel on a warm grey canvas, told apart by fill rather than lines, so the saved pages are the colour on the screen.

This system replaces the 2027 Refresh. It follows the visual-taste rules (type, colour, spacing, no decorative noise) and the structure in the repository's `docs/design-next/` (flows-and-structure.md, foundations.md, screen-map.md).

## Content fundamentals

- English UI through translation keys (seven languages); plan for strings 40% longer.
- Short, plain, friendly. Prefer verbs: "Add link", "Saved", "Nothing found". Sentence case, never ALL CAPS, no exclamation marks, no "successfully", no emoji.
- Buttons: verb first, 1–3 words, no final period. Destructive confirmations name the thing: "Delete “Wool overshirt” forever?".
- Errors say what happened and what to do, in one sentence: "Couldn't load a preview. The link is saved with its address as the title."
- Empty states invite: the heading names the space ("Your links will live here"), one sentence, up to three actions.
- Counts as words ("12 links, 2 subfolders"). Domains with their favicon; dates in tooltips or at the end of a row.

## Visual foundations

### Colour: v3 (canvas and panel)
A warm grey `canvas` (#ECECE9 / dark #141518) holds the sidebar directly, without a box. The content sits on one `surface` panel (#FBFBFA / #1B1C20, radius 20, 8px from the edges). Inside it, a second fill `surface-hover` (#F2F2EF / #232429) marks cards, inputs, segmented tracks and groups; `surface-pressed` marks the selected item. `accent` is near-black for the one main action; `focus` and favorites use the brand sage (#4E7A52 / #9CCB9F). Ink and Sage stay accent options in Settings › Appearance.

### Type
Funnel Sans for the interface and Funnel Display for page titles, dialog titles and the logo; JetBrains Mono for addresses and key caps; Literata and Atkinson Hyperlegible only as Reader options. Body 16, secondary 14, meta 12 (metadata only, never primary content); headings on a Major Second scale (`title-s` 18 to `display` 32.4). Weights 400, 500, 600. Line height 1.5 for text, 1.2–1.25 for headings.

### Space and size
8pt grid for components, 4pt for small gaps (`space-4` … `space-64`). Controls 32 / 40 / 48; touch targets 44. Sidebar 264, tablet rail 72, reading measure 68ch.

### Radius
`radius-xs` 4 (favicons, key caps, tags), `radius-card` 8 (link cards and their full-bleed cover), `radius-sm` 10 (buttons, inputs, nav rows, chips, menu items), `radius-md` 12 (menus, popovers, segmented tracks), `radius-lg` 20 (the main panel, dialogs, slide-overs, the command bar, the tab bar). `radius-full` only for round things.

### Elevation
Fill, not lines: no borders on surfaces, cards or inputs, and no shadows on anything that sits in the page. Only floating layers (menus, popovers, toasts, the tab bar) get `shadow-l2`, and dialogs and slide-overs `shadow-l3` over the scrim, so they lift off a panel of the same colour. Row dividers inside a group stay as 1px `line`.

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

States (empty, nothing found, offline, error, a site that can’t be shown) get an animated StateScene: flat scenes from the product’s own shapes that play once and hold.


Shelfmark's own outline set on a 24px grid, 1.75px line, round caps; 16px in controls, 20px in navigation, 24px in empty states. Icons take the colour of their text. Website favicons show at 16px in a `radius-xs` square; a missing favicon is the site's first letter. The logo is the card-with-bookmark mark (Logos group) followed by "Shelfmark" in Funnel Display 600.

## AI

A quiet helper inside saving (it files new links), search (meaning and "Ask your shelf" in the same field) and Revisit (summaries, forgotten links). Off until turned on. Marked by the spark in `ai`; accepted suggestions become ordinary content. Never a separate tab, a fill, a gradient or a glow. Limits show as one muted line where the content would be.

## Components

Actions: Button, IconButton. Forms: Input, Search, SegmentedControl, Chip, Switch. Navigation: NavItem, TabBar. Content: LinkCard, LinkRow, Tag, FolderTile, ReaderView, AiMark. Overlays: Menu, Popover, SlideOver, Dialog. Feedback: Toast, EmptyState, StateScene (animated scenes for empty, error, offline and blocked states).

Components are styled by `components/bundle.css` (class prefix `sm-`) on top of the tokens; each folder's README says how the component behaves and which `libs/ui` component implements it.
