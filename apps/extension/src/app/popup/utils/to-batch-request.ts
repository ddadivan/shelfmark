import {
  isHttpUrl,
  LINK_LIMIT,
  normalizeTagName,
  type CreateLinksBatchItem,
  type CreateLinksBatchRequest,
} from '@shelfmark/contracts';
import type { BatchItemPick } from '../models/batch-item-pick.interface';
import type { TabEntry } from '../models/tab-entry.interface';

/** The tags of one link: its own (from AI) first, then "Tags for all", no repeats, at most `TagsMax`. */
function mergeTags(own: readonly string[], shared: readonly string[]): string[] {
  const seen = new Set<string>();
  return [...own, ...shared]
    .map(normalizeTagName)
    .filter((tag) => {
      const fresh = tag !== '' && !seen.has(tag.toLowerCase());
      seen.add(tag.toLowerCase());
      return fresh;
    })
    .slice(0, LINK_LIMIT.TagsMax);
}

/**
 * The body of `POST /api/links/batch` for the ticked tabs. A tab AI sorted (or whose folder the user
 * picked) carries its own folder, tags (AI's plus "Tags for all") and `aiDraftId`; the others take the
 * batch folder and tags. Domain rules apply (`applyRules`) unless every item has its own values.
 */
export function toBatchRequest(
  entries: readonly TabEntry[],
  shared: { folderId: string | null; tags: readonly string[] },
  pick: (entry: TabEntry) => BatchItemPick,
): CreateLinksBatchRequest {
  const items: CreateLinksBatchItem[] = entries.map((entry) => {
    const own = pick(entry);
    return {
      url: entry.url,
      ...(entry.titleFromTab && { title: entry.title.slice(0, LINK_LIMIT.TitleMax) }),
      idempotencyKey: entry.idempotencyKey,
      ...(entry.faviconUrl !== null &&
        isHttpUrl(entry.faviconUrl) &&
        entry.faviconUrl.length <= LINK_LIMIT.UrlMax && { faviconUrl: entry.faviconUrl }),
      ...(own.folderId !== null && { folderId: own.folderId }),
      ...(own.tags.length > 0 && { tags: mergeTags(own.tags, shared.tags) }),
      ...(own.draftId !== null && { aiDraftId: own.draftId }),
    };
  });
  return {
    items,
    ...(shared.folderId !== null && { folderId: shared.folderId }),
    ...(shared.tags.length > 0 && { tags: [...shared.tags] }),
    applyRules: items.some((item) => item.folderId === undefined && item.tags === undefined),
  };
}
