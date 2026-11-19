import type { LinkKind } from '../links/link-kind.type';

/**
 * The part of an Ask search the links feed can show again ("Show all N in search", ADR 0055 point 2):
 * the words and the filters the feed has. Sent only when the search used nothing else (no site or
 * date filter), so the feed shows the same links.
 */
export interface AskSearchFilter {
  /** Search words for the feed's `q`, `null` without words. */
  q: string | null;
  /** UUID of a live folder of the user, `null` for all links. */
  folderId: string | null;
  /** Tag names (all of them, like the feed's `tag`). */
  tags: string[];
  kind: LinkKind | null;
  /** Only favourites (the Favorites feed). */
  favorite: boolean;
}
