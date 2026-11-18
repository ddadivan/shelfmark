import type { McpFolderRow } from './mcp-folder-row.interface';

/** A live folder in tree order with its path (`buildFolderTree`). */
export interface McpFolderNode extends McpFolderRow {
  path: string;
}
