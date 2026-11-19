/**
 * The tools of an Ask question (ADR 0055 point 2): read-only library tools on the session user,
 * the `show_links` display tool and the quick model's `request_deeper_answer` control tool.
 */
export const ASK_TOOL_NAME = {
  SearchLinks: 'search_links',
  CountLinks: 'count_links',
  GetLink: 'get_link',
  ListFolders: 'list_folders',
  ListTags: 'list_tags',
  ShowLinks: 'show_links',
  RequestDeeperAnswer: 'request_deeper_answer',
} as const;
