/**
 * The only link columns the MCP tools read (ADR 0053 point 6). The note is read for the mapper,
 * which drops it unless the token includes notes.
 */
export const MCP_LINK_SELECT = {
  id: true,
  url: true,
  title: true,
  folderId: true,
  note: true,
  summary: true,
  summarySource: true,
  kind: true,
  isFavorite: true,
  createdAt: true,
  lastOpenedAt: true,
  tags: { select: { tag: { select: { name: true } } } },
} as const;
