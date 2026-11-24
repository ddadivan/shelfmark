/**
 * Look of `ui-select`: the bordered `field` (default), or `row`: a filled row that reads as a
 * sentence with an action at its end ("Goes to **Shopping** · rule for allbirds.com  Change", Shelf
 * Add link); its label stays for assistive technology only. `pill`: the quiet 32px pill of a
 * settings row ("9:00 ⌄", Shelf 05-settings): the value and the chevron on `surface-hover`, a
 * folder tile when the option has one, the label for assistive technology only.
 */
export const SELECT_APPEARANCE = {
  Field: 'field',
  Row: 'row',
  Pill: 'pill',
} as const;
