/**
 * What a link response needs besides the row: the names of its tags and which images exist (kind
 * and hash only, never the bytes).
 */
export const LINK_INCLUDE = {
  tags: { select: { tag: { select: { name: true } } } },
  images: { select: { kind: true, sha256: true } },
} as const;
