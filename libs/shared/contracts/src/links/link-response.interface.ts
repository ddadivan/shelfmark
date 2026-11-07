/** A saved link as returned by the API. */
export interface LinkResponse {
  id: string;
  /** `null` = "Unsorted". */
  folderId: string | null;
  url: string;
  title: string;
  note: string | null;
  faviconUrl: string | null;
  imageUrl: string | null;
  isFavorite: boolean;
  /** ISO timestamp of the last open; `null` if never opened. */
  lastOpenedAt: string | null;
  /** Tag names. */
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
