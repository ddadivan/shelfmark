/** Delimiters of the user-message blocks (`buildLinkUserPrompt`); untrusted text can never contain them. */
export const LINK_PROMPT_BLOCK = {
  Task: 'task',
  Tags: 'user_tags',
  Folders: 'user_folders',
  Link: 'link',
  Note: 'note',
  Page: 'page_text',
} as const;
