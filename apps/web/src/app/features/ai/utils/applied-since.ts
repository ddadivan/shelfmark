import type { AiAutoApplied, LinkResponse } from '@shelfmark/contracts';

/**
 * What Automatic mode applied after `saved` was taken: the folder when the link was not in it
 * yet, the tags it did not carry yet (names compared case-insensitively). `null` when nothing
 * is new, so a change AI made before an edit is not announced again.
 */
export function appliedSince(
  saved: Pick<LinkResponse, 'folderId' | 'tags'>,
  applied: AiAutoApplied | null,
): AiAutoApplied | null {
  if (!applied) {
    return null;
  }
  const had = new Set(saved.tags.map((name) => name.toLowerCase()));
  const folderId =
    applied.folderId !== null && applied.folderId !== saved.folderId ? applied.folderId : null;
  const tags = applied.tags.filter((name) => !had.has(name.toLowerCase()));
  return folderId === null && tags.length === 0 ? null : { folderId, tags };
}
