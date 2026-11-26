# LinkRow
One link in List and Headlines, inside an L1 panel with hairline dividers.

**List row:** leads with a 72×48 picture tile (48×48 on phones, `radius-sm`), the favicon drawn large until a picture exists; the List beside the link preview uses the same rows. Then title (`body-strong`), favicon + domain, tags, folder, date (`meta`). **Headline row:** 40px, the 18px select box takes the favicon's place, title (`label`), domain, date. Open in preview: `pick`. Checked: `accent-bg`.
Trailing controls cover the end of the row on hover and focus, with no hover block behind them.
On phones, tags and folder hide; Headlines keep title and date.

## In code
`ui-list-item`, headline row (new).
