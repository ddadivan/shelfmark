/** Import routes (#387, ADR 0056). `:id` is the import id answered by `Base` (POST). */
export const IMPORT_ENDPOINT = {
  /**
   * `GET` the recent imports, `POST` starts an import (folders included); `GET /api/imports/:id` one
   * import (polled while its AI pass runs).
   */
  Base: '/api/imports',
  /** `POST` which of the URLs are already saved (read-only). */
  Check: '/api/imports/check',
  /**
   * `POST` AI groups by topic for the links of a file (nothing is written; uses the allowance);
   * `DELETE` gives back the units of the last grouping that no import took (Back, another choice,
   * dialog closed); 204, idempotent.
   */
  Groups: '/api/imports/groups',
  /** `POST` one batch of links: `/api/imports/:id/links`. */
  Links: '/links',
  /** `POST` the client's counts at the end: `/api/imports/:id/finish`. */
  Finish: '/finish',
  /** `POST` moves what the import created to Trash: `/api/imports/:id/undo`. */
  Undo: '/undo',
} as const;
