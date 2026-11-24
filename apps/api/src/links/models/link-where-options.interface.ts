/** How `buildLinkWhere` matches the search text. */
export interface LinkWhereOptions {
  /** Whether the words may match the note (default `true`, as in the app). */
  searchNotes?: boolean;
  /** The moment `saved` counts back from (default: the time of the call; specs pass a fixed one). */
  now?: Date;
}
