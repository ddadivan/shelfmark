# Shelfmark Shelf (design v4)

The full design in the style of the home page the author approved (`reference/shelfmark-home-v2-final.html`). The earlier design in `../designs/` stays as it was.

- **Prototype:** https://claude.ai/artifact/EUJsWiXjUp9Uy3aRSuQnN7 (private; the same 15 groups as before, switch them in the Prototype bar).
- **Design system:** https://claude.ai/artifact/Nsi8PFQJDRTWaKQyN912GK (private); source in `design-system/`.

## What comes from the reference
- Home: white page, 240px white sidebar with a hairline (logo and avatar, Add link pill, All links, Unsorted, Favorites, Today, Recently opened; Pinned, Folders, Tags; intro card, Theme, Get the extension, Data and help, Trash), search field with Ask at the far right, page title, saved views as small tabs, masonry of white cards with real previews.
- Card: preview full bleed, glass play (top left) and star (top right), folder and date, title, source with the site's coloured favicon, hashtags, the note in sage.
- View block: the View button opens Grid size (six steps) and the switches Note, Hashtags, Folder, Date; the view switch Masonry, Cards, List beside it.
- Hanken Grotesk, pill buttons, sage notes, the Ask hover glow.

## What our design adds to it
Selection and the bulk bar, the card ⋯ menu (on hover next to the star), drag to folders, the ⋯ toolbar menu (Sort by, Filter, Select links, Side by side, Export this view), search inside the feed with Close in meaning and our empty state, Today, the Link page beside the list with Site and Reader, subfolders, Pinned, and every other screen group (Save and Revisit, Organise, Settings, Ask, reminders, import and export, extension, system states, assistant and clean-up).

## Source
`src/` holds the generators (`build_pages.py`, `content*.py`, `build_g2.py`) and the scripts that turned the earlier home into this one (`v4data.py`: the 14 real links from the reference; `v4lib.py`, `v4libcss.txt`: sidebar, header, View block and card; `v4shell.txt`: the shared shell). Paths in them point to the session scratchpad.
