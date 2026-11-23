# Shelfmark Shelf

A white shelf for everything you save. Shelfmark keeps the links people save (videos, repositories, things to buy, articles) so they can **save** anything in one move, **find** it in seconds and **come back** to it. The interface is white, quiet and rounded; the previews of the saved pages are the colour on the screen, and the person's own notes are the one green.

This system is built from the home page the author approved (`shelfmark-home-v2-final`): its sidebar, search, View menu and cards are the reference. Every other screen of the product follows it.

## Content fundamentals

- English UI through translation keys (seven languages, Ukrainian among them); plan for strings 40% longer.
- Short and plain. Verbs on buttons: "Add link", "Ask", "Open". Sentence case, no exclamation marks, no emoji.
- Cards say what a link is in four lines: folder and date, title, source, hashtags; the person's note sits under them in green.
- Dates are relative while recent ("Today", "Yesterday"), then short ("Oct 27").
- Counts sit quietly next to their label ("Videos 6"), never in badges.

## Visual foundations

### Colour
White page (`canvas`), white cards with a hairline (`surface` + `line`), light grey fills (`surface-hover`) for the search field, the Add link and Ask buttons, the View button and the view switch. The selected row or tab is one step darker (`surface-pressed`). Text is near-black (`text`), meta is `text-muted`.

The only colour of the interface is **sage** (`ai`, `ai-bg`, `note-text`): the person's note on a card, and the AI spark. Folder colours (`folder-*`) tint only folder icons. The Ask button's hover glow (`wave-1…4`) is the one decorative moment.

Dark: the page is `#19191C`, the sidebar one step darker (`sidebar`), cards one step lighter (`surface`) and without a hairline; a hovered card lightens by 4% instead of casting a shadow.

### Type
Hanken Grotesk 400 / 500 / 600. Page title 24/30 600 (−0.01em); card title 16/24 500; navigation 14/22; meta, tabs and hashtags 12/16. JetBrains Mono for addresses; Literata and Atkinson Hyperlegible only as Reader options.

### Shape
- Buttons are pills (`radius-full`): Add link, Ask, View, glass buttons.
- Navigation rows, tabs and menu items: 10px (`radius-sm`).
- Cards and the search field: 16px (`radius-card`).
- Previews in list rows, menus, dialogs, the intro card: 12px (`radius-md`).

### Elevation
Flat at rest: a card is set off by its hairline (light) or its lighter fill (dark), never a shadow. A hovered card gets `shadow-hover`. Menus and the View menu float on `shadow-l2`; dialogs on `shadow-l3` over `scrim`.

### Glass
Round 28px buttons over a preview (the star at the top right, the play mark at the top left) are `glass`: white at 72% with a 10px blur, so they read on any picture.

### Layout
- Desktop: a 240px white sidebar with a hairline edge: logo and avatar, Add link (full-width pill), the library (All links, Unsorted, Favorites, Today, Recently opened), Pinned, Folders and Tags (each collapses), then the intro card, Theme, Get the extension, Data and help, Trash. Groups are divided by hairlines.
- The page: the search field (48px, up to 640px) with Ask at the far right; the page title with the View button and the view switch on the right; the saved views as small tabs; then the feed.
- Feed: masonry by default, cards or list; the grid size is a six-step slider (130 to 300px columns).
- Tablet: icon rail. Phone: two columns and a tab bar.

### Motion
Hover only where it means something: a card's preview zooms 3.5% over 900 ms, a card gains its shadow over 200 ms, the Ask glow fades in over 600 ms and turns slowly. Menus pop from their trigger. Reduced motion: no zoom, no glow turning.

## Iconography

Outline icons on a 24px grid, 1.75px line, round caps; 16px in navigation and buttons, 12px in card meta. Folder icons in the card meta are filled and tinted with the folder colour. Website favicons are 16px squares with the site's own colour (YouTube red, GitHub black) and its first letter when there is no image. The logo is the card with a bookmark notch, in `text`, followed by "Shelfmark" 16/24 600.

## Components

Actions: Button, IconButton, AskButton. Forms: Input, Search, SegmentedControl (view switch), Switch, Chip (saved-view tabs). Navigation: NavItem, TabBar. Content: LinkCard, LinkRow, Tag, FolderTile, ReaderView, AiMark. Overlays: Menu, ViewMenu, Popover, SlideOver, Dialog. Feedback: Toast, EmptyState, StateScene.

Components are styled by `components/bundle.css` (prefix `sm-`) on top of the tokens; each folder's README says how the component behaves.
