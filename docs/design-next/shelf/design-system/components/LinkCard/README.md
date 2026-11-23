The link card of the feed: preview, folder and date, title, source, hashtags and the person's note.

## Anatomy
- **Preview** full bleed at the top, in the picture's own ratio (masonry) or 4:3 (cards). Shops show the product on `surface-hover` with `object-fit: contain`; repositories crop from the left.
- **Glass buttons** over the preview: play (videos, top left), star (top right, filled when favorite), and on hover the ⋯ menu next to the star and the selection checkbox in place of the play mark.
- **Meta**: the folder (filled icon in the folder colour + name) and the date at the right; 12/16 `text-muted`.
- **Title** 16/24 500, two lines at most. **Source**: favicon and channel, repository or price · domain.
- **Hashtags** up to three, `#tag`, 12/16 `text-muted`. **Note**: pen icon and text on `ai-bg`, `note-text`, 14/18, radius 8.

## States
Rest: hairline (light) or lighter fill (dark). Hover: `shadow-hover`, preview zoom 3.5%. Open in the preview pane or selected: `pick` fill. Every part except the preview and title can be turned off in the View menu (Note, Hashtags, Folder, Date).

## In code
`ui-card` with slots `meta`, `title`, `source`, `tags`, `note`, `favorite`, `actions`, `select`.
