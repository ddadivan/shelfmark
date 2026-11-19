/** `POST /api/imports/:id/finish` body: what the client left out or could not save. */
export interface FinishImportRequest {
  /** Duplicates and addresses that are not web pages, 0 to `IMPORT_LIMIT.LinksMax`. */
  skipped: number;
  /** Rows of batches that failed, 0 to `IMPORT_LIMIT.LinksMax`. */
  failed: number;
}
