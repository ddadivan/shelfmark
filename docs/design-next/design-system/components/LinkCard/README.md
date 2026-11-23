# LinkCard
One saved link in Masonry and Grid: the cover leads, then the title and the site.

**Anatomy:** L1 card (`radius-md`) · cover inset 4px (`radius-sm`, keeps the page's own image ratio in Masonry, 16:9 in Grid) · title (`body-strong`, 2 lines) · optional summary (`secondary`, 2 lines, AI spark) or note · meta line: favicon, domain, and at the end a pin (pinned to top) and the star when favorite.
**Hover:** border to `line-strong`, `shadow-l2`, cover zooms 1.04, actions appear (favorite, more). The card never lifts.

## Rules
- No date, folder or tags on the card: the date is in the tooltip; folder and tags show in List, Headlines and Details.
- Missing image: the site letter on a neutral tile, never an empty grey box.
- A click opens the Link page (setting: or the site).

## In code
`ui-card` (slots: cover, title, meta, actions).
