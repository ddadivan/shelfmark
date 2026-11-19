/** One link sent to `POST /api/imports/groups`; its position in `links` is its index. */
export interface ImportGroupLink {
  /** The bookmark title (or the URL when it has none), at most `IMPORT_LIMIT.GroupTitleMax`. */
  title: string;
  /** http(s) URL, cut by the client to at most `IMPORT_LIMIT.GroupUrlMax` characters. */
  url: string;
}
