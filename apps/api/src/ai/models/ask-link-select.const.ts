/** The only link columns the Ask tools read (ADR 0055 point 3); the mapper drops the note unless allowed. */
export const ASK_LINK_SELECT = {
  id: true,
  url: true,
  title: true,
  folderId: true,
  note: true,
  summary: true,
  kind: true,
  isFavorite: true,
  createdAt: true,
  lastOpenedAt: true,
  tags: { select: { tag: { select: { name: true } } } },
} as const;
