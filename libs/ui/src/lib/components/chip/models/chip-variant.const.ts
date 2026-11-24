export const CHIP_VARIANT = {
  Tag: 'tag',
  Neutral: 'neutral',
  /** A sidebar row (Shelf NavItem): full width, 36px, a 16px glyph and a 14px label in `text`. */
  Nav: 'nav',
  /** A hashtag on a card (Shelf LinkCard): plain 12px muted text, no pill. */
  Hashtag: 'hashtag',
  /** A filter option (Shelf Filter popover): 32px, `line` edge, `accent-bg` while `pressed`. */
  Filter: 'filter',
} as const;
