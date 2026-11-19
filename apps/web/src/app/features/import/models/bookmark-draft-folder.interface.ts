/** A folder while a bookmark file is walked; pruned to the folders that hold links at the end. */
export interface BookmarkDraftFolder {
  readonly key: string;
  readonly parentKey: string | null;
  readonly name: string;
  readonly depth: number;
}
