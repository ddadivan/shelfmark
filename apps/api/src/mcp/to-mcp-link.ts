import { SUMMARY_SOURCE, linkHost } from '@shelfmark/contracts';
import { toLinkKind } from '../links/to-link-kind';
import type { McpLink } from './models/mcp-link.interface';
import type { McpLinkRow } from './models/mcp-link-row.type';

/**
 * The only way a link leaves through the MCP server (ADR 0053 point 6): the allow-listed fields,
 * the folder path instead of ids, tag names sorted, and the note only when the token includes notes.
 * Callers pass live links of the token's user only.
 */
export function toMcpLink(
  row: McpLinkRow,
  folderPaths: ReadonlyMap<string, string>,
  includeNotes: boolean,
): McpLink {
  const link: McpLink = {
    id: row.id,
    url: row.url,
    title: row.title,
    host: linkHost(row.url) ?? '',
    folderPath: row.folderId === null ? null : (folderPaths.get(row.folderId) ?? null),
    tags: row.tags.map((entry) => entry.tag.name).sort((a, b) => a.localeCompare(b, 'en')),
    summary: row.summary,
    summaryByAi: row.summary !== null && row.summarySource === SUMMARY_SOURCE.Ai,
    kind: toLinkKind(row.kind),
    isFavorite: row.isFavorite,
    savedAt: row.createdAt.toISOString(),
    lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null,
  };
  if (includeNotes) link.note = row.note;
  return link;
}
