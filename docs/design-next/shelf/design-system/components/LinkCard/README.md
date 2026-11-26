The link card of the feed: preview, folder and date, title, source, hashtags and the person's note.

## Anatomy
- **Preview** full bleed at the top, in the picture's own ratio (masonry) or 4:3 (cards). Shops show the product on `surface-hover` with `object-fit: contain`; repositories crop from the left.
- **Card controls** over the preview: the star and ⋯ form one pill at the top right (star first, filled when favorite; ⋯ opens on hover or keyboard focus, always open on touch). The select checkbox is a 28px circle at the top left, shown on hover, focus, in select mode and when checked, never on touch. No play mark on videos.
- **Meta**: the folder (filled icon in the folder colour + name) and the date at the right; 12/16 `text-muted`.
- **Title** 16/24 500, two lines at most. **Source**: favicon and channel, repository or price · domain.
- **Hashtags** up to three, `#tag`, 12/16 `text-muted`. **Note**: pen icon and text on `ai-bg`, `note-text`, 14/18, radius 8.

## States
Rest: hairline (light) or lighter fill (dark). Hover is a colour change only. Open in the preview pane or selected: `pick` fill. Every part except the preview and title can be turned off in the View menu (the switches are Show site, Note, Hashtags, Folder, Date, Description).

## In code
`ui-card` with slots `meta`, `title`, `source`, `tags`, `note`, `favorite`, `actions`, `select`.
