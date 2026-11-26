import { signal } from '@angular/core';
import type { LinkResponse } from '@shelfmark/contracts';
import { followLinkChanges } from './follow-link-changes';

/** What the links store changed since the overlay was made, read in a `computed`. */
export interface LinkChangeOverlay {
  /** The link as the store last wrote it, `null` for a link that is gone, else `link` itself. */
  resolve(link: LinkResponse): LinkResponse | null;
  /** `links` with every written link in its new state and the removed ones left out. */
  apply(links: readonly LinkResponse[]): readonly LinkResponse[];
}

/**
 * For results that come from an answer of their own (search matches) and are no part of the feed:
 * what `LinksStore` writes after the answer arrived (a star, an edit, a delete and its Undo) is
 * laid over it, so the rows follow without asking again. Call it in an injection context.
 */
export function linkChangeOverlay(): LinkChangeOverlay {
  const changed = signal<ReadonlyMap<string, LinkResponse | null>>(new Map());
  followLinkChanges((change) => {
    if (!change.upserted?.length && !change.removed?.length) {
      return;
    }
    const next = new Map(changed());
    for (const link of change.upserted ?? []) {
      next.set(link.id, link);
    }
    for (const id of change.removed ?? []) {
      next.set(id, null);
    }
    changed.set(next);
  });
  const resolve = (link: LinkResponse): LinkResponse | null => {
    const written = changed().get(link.id);
    return written === undefined ? link : written;
  };
  return {
    resolve,
    apply: (links) => {
      const map = changed();
      return map.size === 0
        ? links
        : links.flatMap((link) => {
            const next = resolve(link);
            return next === null ? [] : [next];
          });
    },
  };
}
