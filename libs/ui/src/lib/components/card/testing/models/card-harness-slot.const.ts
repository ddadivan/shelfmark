/** Areas of `ui-card` that `UiCardHarness.getChildLoader()` takes (selectors). */
export const CARD_HARNESS_SLOT = {
  /** Top left over the preview (`slot="play"`). */
  Play: '.ui-card__play',
  /** The "..." trigger (`slot="actions"`). */
  Actions: '.ui-card__more',
  /** `slot="favorite"`. */
  Favorite: '.ui-card__favorite',
  /** Folder icon and name (`slot="meta"`). */
  Meta: '.ui-card__site',
  /** Favicon and channel, repository or price and domain (`slot="source"`). */
  Source: '.ui-card__source',
  /** Up to three `#tag` words (`slot="tags"`). */
  Tags: '.ui-card__tags',
  /** The person's note (`slot="note"`), pen icon excluded. */
  Note: '.ui-card__note-text',
  /** `slot="date"`. */
  Date: '.ui-card__date',
  /** The checkbox of selection mode (`slot="select"`). */
  Select: '.ui-card__select',
  /** Everything below the media: meta, title, source, tags, note and the default slot. */
  Body: '.ui-card__body',
} as const;
