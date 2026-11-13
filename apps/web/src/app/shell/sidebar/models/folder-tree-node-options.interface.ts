/** What the folder tree rows need from the user's settings and the active row. */
export interface FolderTreeNodeOptions {
  /** Ids of the folders that start open (the ones above the active folder). */
  open: ReadonlySet<string>;
  countsShown: boolean;
  shownColour: (colour: string) => string;
}
