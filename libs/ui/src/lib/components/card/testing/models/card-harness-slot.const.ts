/** Areas of `ui-card` that `UiCardHarness.getChildLoader()` takes (selectors). */
export const CARD_HARNESS_SLOT = {
  /** The "..." trigger (`slot="actions"`). */
  Actions: '.ui-card__more',
  /** `slot="favorite"`. */
  Favorite: '.ui-card__favorite',
  /** Favicon and domain (`slot="meta"`). */
  Meta: '.ui-card__site',
  /** `slot="date"`. */
  Date: '.ui-card__date',
  /** The checkbox of selection mode (`slot="select"`). */
  Select: '.ui-card__select',
  /** Everything below the media: meta, title and the default slot. */
  Body: '.ui-card__body',
} as const;
