/** ISO 8601 date and time with a UTC offset (`Z` or `+hh:mm`), the shape of `ImportLinkItem.addedAt`. */
export const IMPORT_ADDED_AT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;
