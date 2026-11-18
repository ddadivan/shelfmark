/** A folder as `list_folders` returns it. */
export interface McpFolder {
  id: string;
  name: string;
  parentId: string | null;
  /** Names from the top, joined with " / ". */
  path: string;
  /** Live links directly in this folder. */
  links: number;
}
