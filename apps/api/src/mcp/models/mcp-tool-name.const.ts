/** The four read-only tools of the MCP server (ADR 0054); `tools/list` is pinned to them by a spec. */
export const MCP_TOOL_NAME = {
  SearchLinks: 'search_links',
  GetLink: 'get_link',
  ListFolders: 'list_folders',
  ListTags: 'list_tags',
} as const;
