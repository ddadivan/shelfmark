export const CHIP_VARIANT = {
  Tag: 'tag',
  Neutral: 'neutral',
  /** A sidebar row (Shelf NavItem): full width, 36px, a 16px glyph and a 14px label in `text`. */
  Nav: 'nav',
  /** A hashtag on a card (Shelf LinkCard): plain 12px muted text, no pill. */
  Hashtag: 'hashtag',
  /** A filter option (Shelf Filter popover): 32px, `line` edge, `accent-bg` while `pressed`. */
  Filter: 'filter',
  /** A "Go to" place of search (Shelf `03-search.html`): a quiet 28px tab, 14px glyph, muted text. */
  Jump: 'jump',
  /** A tag on the Tags page (Shelf `04-organise` "Tags"): 36px on `surface` with the card ring, 14px label. */
  Cloud: 'cloud',
} as const;
