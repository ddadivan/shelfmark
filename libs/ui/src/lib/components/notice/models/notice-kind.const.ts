export const NOTICE_KIND = {
  Warning: 'warning',
  Danger: 'danger',
  Info: 'info',
  /** Shelf `limit` row: `surface` with the `line` hairline, text colour, muted icon. */
  Quiet: 'quiet',
  /** A tip in an article (Shelf 17-help `.tip`): sage `note-text` on `ai-bg`, the bulb glyph. */
  Tip: 'tip',
} as const;
