/** `POST /api/imports/check` body: URLs of the file, in file order. */
export interface ImportCheckRequest {
  /** 1 to `IMPORT_LIMIT.CheckBatchMax` http(s) URLs, each at most `LINK_LIMIT.UrlMax` characters. */
  urls: string[];
}
