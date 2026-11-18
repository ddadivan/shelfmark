import type { FolderDbClient } from '../../folders/models/folder-db-client.type';
import type { McpFolderNode } from '../models/mcp-folder-node.interface';
import type { McpFolderRow } from '../models/mcp-folder-row.interface';

const PATH_SEPARATOR = ' / ';

/**
 * The live folders of the user in tree order (depth first, siblings in the sidebar order), each
 * with its path. A folder whose parent is not among the rows starts a branch of its own.
 */
export function buildFolderTree(rows: readonly McpFolderRow[]): McpFolderNode[] {
  const ids = new Set(rows.map((row) => row.id));
  const children = new Map<string | null, McpFolderRow[]>();
  for (const row of rows) {
    const parent = row.parentId !== null && ids.has(row.parentId) ? row.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), row]);
  }
  const nodes: McpFolderNode[] = [];
  const visit = (parent: string | null, prefix: string | null): void => {
    for (const row of children.get(parent) ?? []) {
      const path = prefix === null ? row.name : `${prefix}${PATH_SEPARATOR}${row.name}`;
      nodes.push({ ...row, path });
      visit(row.id, path);
    }
  };
  visit(null, null);
  return nodes;
}

/** The user's live folders in sidebar order (position, name, id). */
export function loadFolderRows(db: FolderDbClient, userId: string): Promise<McpFolderRow[]> {
  return db.folder.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, name: true, parentId: true },
    orderBy: [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }],
  });
}

/** Folder id → path of the user's live folders. */
export async function loadFolderPaths(
  db: FolderDbClient,
  userId: string,
): Promise<Map<string, string>> {
  const nodes = buildFolderTree(await loadFolderRows(db, userId));
  return new Map(nodes.map((node) => [node.id, node.path]));
}
