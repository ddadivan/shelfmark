/** A saved link as returned by the API. */
export interface LinkResponse {
  id: string;
  /** `null` = "Unsorted". */
  folderId: string | null;
  url: string;
  title: string;
  note: string | null;
  /** Same-origin path `/api/links/{id}/favicon?v=<hash>` when a copy was captured (ADR 0027), `v=pending` while a re-capture after a URL change is pending, else `null`. */
  faviconUrl: string | null;
  /** Same-origin path `/api/links/{id}/image?v=<hash>` when a copy was captured (ADR 0027), `v=pending` while a re-capture after a URL change is pending, else `null`. */
  imageUrl: string | null;
  isFavorite: boolean;
  /** ISO timestamp of the last open; `null` if never opened. */
  lastOpenedAt: string | null;
  /** Tag names. */
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
