/** What a link response needs besides the row: the names of its tags. */
export const LINK_INCLUDE = { tags: { select: { tag: { select: { name: true } } } } } as const;
