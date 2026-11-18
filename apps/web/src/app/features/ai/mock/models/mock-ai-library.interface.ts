/** What the mock AI may draw suggestions from: the user's own folders, tags and links. */
export interface MockAiLibrary {
  folders: ReadonlyArray<{ readonly id: string; readonly name: string }>;
  tags: readonly string[];
  links: ReadonlyArray<{ readonly url: string; readonly folderId: string | null }>;
}
