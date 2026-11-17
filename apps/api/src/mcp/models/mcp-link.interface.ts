import type { LinkKind } from '@shelfmark/contracts';

/**
 * A link as the MCP tools return it: the audited allow-list of ADR 0053 point 6 (`toMcpLink` is the
 * only producer). Never images, normalised URLs, reminders, pins, share tokens or AI suggestions.
 */
export interface McpLink {
  id: string;
  url: string;
  title: string;
  host: string;
  /** Folder names from the top, joined with " / "; `null` when the link has no folder. */
  folderPath: string | null;
  tags: string[];
  summary: string | null;
  /** The summary was written by Shelfmark's AI (not by the user). */
  summaryByAi: boolean;
  kind: LinkKind;
  isFavorite: boolean;
  savedAt: string;
  lastOpenedAt: string | null;
  /** Only for tokens created with "Include my notes". */
  note?: string | null;
}
