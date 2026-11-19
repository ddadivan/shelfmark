/** Import routes (#387, ADR 0056). `:id` is the import id answered by `Base` (POST). */
export const IMPORT_ENDPOINT = {
  /** `GET` the recent imports, `POST` starts an import (folders included). */
  Base: '/api/imports',
  /** `POST` which of the URLs are already saved (read-only). */
  Check: '/api/imports/check',
  /** `POST` one batch of links: `/api/imports/:id/links`. */
  Links: '/links',
  /** `POST` the client's counts at the end: `/api/imports/:id/finish`. */
  Finish: '/finish',
  /** `POST` moves what the import created to Trash: `/api/imports/:id/undo`. */
  Undo: '/undo',
} as const;
