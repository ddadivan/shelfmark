/**
 * One link on a public page. Only what the page shows: never tags, favorites, opens or the ids
 * of other rows. `note` is `null` unless the owner turned "Show my notes" on.
 */
export interface PublicCollectionLink {
  id: string;
  url: string;
  title: string;
  note: string | null;
  /** Same-origin path `/api/public/collections/{token}/links/{id}/favicon?v=…`, or `null`. */
  faviconUrl: string | null;
  /** Same-origin path `/api/public/collections/{token}/links/{id}/image?v=…`, or `null`. */
  imageUrl: string | null;
}
